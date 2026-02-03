const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const logger = require("../utils/logger");
const { getGuildLang } = require("../utils/i18n");
const { fetchFNFestivalTracks, searchTracks } = require("../services/fnfestivalTracksApi");

function bar(value, max = 7) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));
  return "▰".repeat(v) + "▱".repeat(max - v);
}

function formatDuration(d) {
  if (!d) return "N/A";
  if (typeof d === "number") {
    const s = Math.floor(d);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${String(r).padStart(2, "0")}s`;
  }
  return String(d);
}

// Mappt deine Bot-Sprachen (de/en/...) auf echte Locale Strings.
// Für neue Sprachen kannst du das später einfach erweitern.
function langToLocale(lang) {
  if (!lang) return "en-US";
  if (lang === "de") return "de-DE";
  if (lang === "en") return "en-US";
  // fallback: Discord akzeptiert viele BCP-47 tags, aber wir bleiben safe:
  return "en-US";
}

function formatDate(iso, locale) {
  if (!iso) return "N/A";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return dt.toLocaleDateString(locale);
}

function formatTime(ts, locale) {
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleTimeString(locale);
}

function buildDifficultiesBlock(d) {
  if (!d || typeof d !== "object") return null;

  const get = (...keys) => {
    for (const k of keys) {
      if (d[k] !== undefined && d[k] !== null) return d[k];
    }
    return null;
  };

  const lead = get("gr", "lead", "guitar", "lg");
  const bass = get("ba", "bass", "bs");
  const drums = get("ds", "drums", "dr");
  const vocals = get("vl", "vocals", "vo");

  const proLead = get("pg", "proLead", "pro_guitar");
  const proBass = get("pb", "proBass", "pro_bass");
  const proDrums = get("pd", "proDrums", "pro_drums");
  const proVocals = get("pv", "proVocals", "pro_vocals");

  const avgVals = [lead, bass, drums, vocals]
    .map((x) => Number(x))
    .filter((x) => !Number.isNaN(x));

  const avg = avgVals.length
    ? avgVals.reduce((a, b) => a + b, 0) / avgVals.length
    : null;

  const lines = [
    `Lead:      ${bar(lead)}`,
    `Bass:      ${bar(bass)}`,
    `Drums:     ${bar(drums)}`,
    `Vocals:    ${bar(vocals)}`,
    ``,
    `Pro Lead:  ${bar(proLead)}`,
    `Pro Bass:  ${bar(proBass)}`,
    `Pro Drums: ${bar(proDrums)}`,
    `Pro Vocals:${bar(proVocals)}`,
    ``,
    avg !== null ? `Average ${avg.toFixed(1)}  ${bar(Math.round(avg))}` : null
  ].filter(Boolean);

  return "```" + lines.join("\n") + "```";
}

function buildTrackEmbed(track, locale) {
  const genre = track.genres?.length ? track.genres.join(", ") : "N/A";

  const embed = new EmbedBuilder()
    .setTitle(`${track.title} — ${track.artist}`)
    .setDescription("Fortnite Festival Jam Track")
    .addFields(
      { name: "Release Year", value: String(track.releaseYear ?? "N/A"), inline: true },
      { name: "Album", value: String(track.album ?? "N/A"), inline: true },
      { name: "Genre", value: String(genre), inline: true },

      { name: "Duration", value: formatDuration(track.duration), inline: true },
      { name: "BPM", value: String(track.bpm ?? "N/A"), inline: true },
      {
        name: "Key",
        value: track.key
          ? `${track.key}${track.mode ? " " + track.mode : ""}`
          : "N/A",
        inline: true
      },

      { name: "Last Modified", value: formatDate(track.lastModified, locale), inline: true },
      { name: "Active Date", value: formatDate(track.activeDate, locale), inline: true },
      { name: "New Until", value: formatDate(track.newUntil, locale), inline: true }
    );

  const diffBlock = buildDifficultiesBlock(track.difficulties);
  if (diffBlock) embed.addFields({ name: "Difficulties", value: diffBlock, inline: false });

  if (track.artworkUrl) embed.setThumbnail(track.artworkUrl);

  embed.setFooter({ text: "Source: FNFestival tracks.json (via GitHub)" });
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search Fortnite Festival Jam Tracks by title or artist")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Song title or artist")
        .setRequired(true)
    ),

  async handleSelect(interaction, selectedId) {
    await interaction.deferUpdate();

    // Locale aus Bot-Sprache
    const lang = getGuildLang(interaction.guildId);
    const locale = langToLocale(lang);

    const { tracks } = await fetchFNFestivalTracks();
    const track = tracks.find((t) => String(t.id) === String(selectedId));

    if (!track) {
      return interaction.editReply({
        content: "❌ Track not found anymore (cache refreshed).",
        embeds: [],
        components: []
      });
    }

    return interaction.editReply({
      embeds: [buildTrackEmbed(track, locale)],
      components: []
    });
  },

  async execute(interaction) {
    const lang = getGuildLang(interaction.guildId);
    const locale = langToLocale(lang);

    const query = interaction.options.getString("query", true);
    await interaction.deferReply();

    try {
      const { tracks, cached, fetchedAt } = await fetchFNFestivalTracks();
      const matches = searchTracks(tracks, query).slice(0, 25);

      if (matches.length === 0) {
        logger.info(`/search "${query}" -> no results`);
        return interaction.editReply(
          `❌ No results for **"${query}"**.\nTry a different title or artist.`
        );
      }

      if (matches.length === 1) {
        logger.info(`/search "${query}" -> 1 result`);
        return interaction.editReply({ embeds: [buildTrackEmbed(matches[0], locale)] });
      }

      const options = matches.map((t) => ({
        label: t.title.slice(0, 100),
        description: t.artist.slice(0, 100),
        value: String(t.id)
      }));

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("festival_search_select")
          .setPlaceholder(`Select from results... (${matches.length} total)`)
          .addOptions(options)
      );

      const listLines = matches
        .slice(0, 10)
        .map((t, i) => `**${i + 1}.** ${t.title} — *${t.artist}*`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🎵 Festival Search")
        .setDescription(listLines)
        .addFields(
          { name: "Query", value: `"${query}"`, inline: true },
          { name: "Results", value: `${matches.length}`, inline: true },
          { name: "Cache", value: cached ? "Yes" : "No", inline: true }
        )
        .setFooter({
          text: `Pick a track from the dropdown to view details • fetched ${formatTime(fetchedAt, locale)}`
        });

      logger.info(`/search "${query}" -> ${matches.length} result(s)`);
      return interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      logger.error(`Search failed: ${err?.stack || err}`);
      return interaction.editReply("❌ Failed to fetch Festival tracks data.");
    }
  }
};