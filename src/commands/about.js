const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const packageJson = require("../../package.json");
const { getGuildLang, t } = require("../utils/i18n");

function formatUptime(seconds) {
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Shows information about Festival Bot (Version, Status, Links)"),

  async execute(interaction) {
    const lang = getGuildLang(interaction.guildId);

    const uptime = formatUptime(process.uptime());
    const guildCount = interaction.client.guilds.cache.size;

    // Ping kann direkt nach Start -1 oder 0 sein → schöner fallback
    const rawPing = interaction.client.ws.ping;
    const pingText = rawPing && rawPing > 0 ? `${rawPing}ms` : "—";

    // Invite Link (Permissions kannst du später ändern)
    const inviteUrl = interaction.client.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: [
        "ViewChannel",
        "SendMessages",
        "EmbedLinks",
        "ReadMessageHistory",
        "ModerateMembers"
      ]
    });

    // 🔧 Deine Kontakt/Support Infos
    const supportLink = "Discord Support Server Soon!"; // oder z.B. "https://discord.gg/DEINLINK"
    const contact = "@mobilegamer2";

    const embed = new EmbedBuilder()
      .setTitle(t(lang, "about_title"))
      .setDescription(t(lang, "about_desc"))
      .addFields(
        { name: t(lang, "version"), value: `v${packageJson.version}`, inline: true },
        { name: t(lang, "status"), value: "BETA", inline: true },
        { name: t(lang, "uptime"), value: uptime, inline: true },

        { name: t(lang, "servers"), value: `${guildCount}`, inline: true },
        { name: t(lang, "ping"), value: pingText, inline: true },
        { name: t(lang, "language"), value: lang === "en" ? "English" : "Deutsch", inline: true },

        { name: t(lang, "invite"), value: `[${t(lang, "invite_click")}](<${inviteUrl}>)`, inline: false },
        { name: t(lang, "support"), value: `${supportLink}\n${t(lang, "contact")}: ${contact}`, inline: false },
        { name: "GitHub", value: "https://github.com/MobileGamer1577/festival-bot", inline: false }
      )
      .setFooter({ text: t(lang, "about_footer") });

    await interaction.reply({ embeds: [embed] });
  }
};