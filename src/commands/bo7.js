// src/commands/bo7.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadAchievements, getUserProgress, saveAllProgress } = require("../utils/bo7Store");
const { getGuildLang, t } = require("../utils/i18n");
const logger = require("../utils/logger");

const PAGE_SIZE = 10;

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bo7")
    .setDescription("BO7 achievement tracker")
    .addSubcommand((s) =>
      s
        .setName("achievements")
        .setDescription("Show BO7 achievements")
        .addStringOption((o) =>
          o
            .setName("view")
            .setDescription("open = only incomplete, all = everything")
            .addChoices(
              { name: "open", value: "open" },
              { name: "all", value: "all" }
            )
        )
        .addIntegerOption((o) => o.setName("page").setDescription("Page number"))
    )
    .addSubcommand((s) =>
      s
        .setName("done")
        .setDescription("Mark an achievement as completed")
        .addStringOption((o) => o.setName("id").setDescription("Achievement ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("undo")
        .setDescription("Mark an achievement as incomplete")
        .addStringOption((o) => o.setName("id").setDescription("Achievement ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("reset")
        .setDescription("Reset your BO7 progress")
    )
    .addSubcommand((s) =>
      s
        .setName("progress")
        .setDescription("Show your BO7 progress")
    )
    .addSubcommand((s) =>
      s
        .setName("help")
        .setDescription("Show all BO7 commands")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const lang = getGuildLang(interaction.guildId);

    try {
      const achievements = loadAchievements();
      const { all, user } = getUserProgress(userId);

      if (!Array.isArray(achievements)) {
        throw new Error("Achievements konnten nicht geladen werden (kein Array).");
      }
      if (!user || !Array.isArray(user.done)) {
        throw new Error("User progress ist beschädigt (user.done fehlt).");
      }

      if (sub === "help") {
        return interaction.reply({
          content:
`**BO7 Commands**
/bo7 achievements → zeigt Erfolge (offen oder alle)
/bo7 done → Erfolg als abgeschlossen markieren
/bo7 undo → Erfolg wieder offen machen
/bo7 reset → deinen Fortschritt zurücksetzen
/bo7 progress → Fortschritt anzeigen`,
          ephemeral: true,
        });
      }

      if (sub === "progress") {
        const total = achievements.length;
        const doneCount = user.done.length;
        const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

        return interaction.reply({
          content: `📊 **${t(lang, "bo7.ui.progress") || "Fortschritt"}:** ${doneCount}/${total} (${percent}%)`,
          ephemeral: true,
        });
      }

      if (sub === "reset") {
        user.done = [];
        saveAllProgress(all);

        logger.success(`[BO7] reset | user=${interaction.user.tag} (${userId})`);
        return interaction.reply({
          content: t(lang, "bo7.ui.reset_done") || "♻️ Dein BO7 Fortschritt wurde zurückgesetzt.",
          ephemeral: true,
        });
      }

      if (sub === "done") {
        const id = interaction.options.getString("id", true);

        const exists = achievements.some((a) => a.id === id);
        if (!exists) {
          return interaction.reply({
            content: t(lang, "bo7.ui.unknown_id") || "❌ Unbekannte Achievement-ID.",
            ephemeral: true,
          });
        }

        if (user.done.includes(id)) {
          const name = t(lang, `bo7.achievements.${id}.name`);
          return interaction.reply({
            content: `⚠️ ${(t(lang, "bo7.ui.already_done") || "Bereits abgeschlossen")}: **${name}**`,
            ephemeral: true,
          });
        }

        user.done.push(id);
        saveAllProgress(all);

        const name = t(lang, `bo7.achievements.${id}.name`);
        logger.success(`[BO7] done id=${id} | user=${interaction.user.tag} (${userId})`);

        return interaction.reply({
          content: `✅ ${(t(lang, "bo7.ui.checked") || "Abgehakt")}: **${name}**`,
          ephemeral: true,
        });
      }

      if (sub === "undo") {
        const id = interaction.options.getString("id", true);

        const before = user.done.length;
        user.done = user.done.filter((x) => x !== id);
        saveAllProgress(all);

        const name = t(lang, `bo7.achievements.${id}.name`);

        if (user.done.length === before) {
          return interaction.reply({
            content: `⚠️ ${(t(lang, "bo7.ui.was_not_done") || "War nicht abgehakt")}: **${name}**`,
            ephemeral: true,
          });
        }

        logger.success(`[BO7] undo id=${id} | user=${interaction.user.tag} (${userId})`);
        return interaction.reply({
          content: `↩️ ${(t(lang, "bo7.ui.now_open") || "Wieder offen")}: **${name}**`,
          ephemeral: true,
        });
      }

      if (sub === "achievements") {
        const view = interaction.options.getString("view") || "open";
        const pageRaw = interaction.options.getInteger("page") || 1;

        const list =
          view === "all"
            ? achievements
            : achievements.filter((a) => !user.done.includes(a.id));

        if (list.length === 0 && view !== "all") {
          return interaction.reply({
            content: t(lang, "bo7.ui.all_done") || "🎉 Du hast alle BO7-Erfolge abgehakt!",
            ephemeral: true,
          });
        }

        const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        const page = clamp(pageRaw, 1, pages);

        const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        const lines = slice.map((a) => {
          const name = t(lang, `bo7.achievements.${a.id}.name`);
          const desc = t(lang, `bo7.achievements.${a.id}.desc`);
          const mark = user.done.includes(a.id) ? "✅" : "⬜";
          return `${mark} **${name}**\n_${desc}_\n\`id: ${a.id}\``;
        });

        const title =
          view === "all"
            ? (t(lang, "bo7.ui.all") || "Alle")
            : (t(lang, "bo7.ui.open") || "Offen");

        const embed = new EmbedBuilder()
          .setTitle(`${t(lang, "bo7.ui.title") || "BO7 Erfolge"} (${title})`)
          .setDescription(lines.join("\n\n") || (t(lang, "bo7.ui.no_entries") || "Keine Einträge."))
          .setFooter({ text: `${t(lang, "bo7.ui.page") || "Seite"} ${page}/${pages}` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      return interaction.reply({ content: "❌ Unknown subcommand.", ephemeral: true });
    } catch (e) {
      logger.error(`[BO7] ${sub} failed | user=${interaction.user.tag} (${userId}) | ${e?.stack || e}`);

      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: "❌ Es ist ein Fehler aufgetreten.", ephemeral: true });
      }
      return interaction.reply({ content: "❌ Es ist ein Fehler aufgetreten.", ephemeral: true });
    }
  },
};