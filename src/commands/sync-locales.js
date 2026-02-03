// src/commands/sync-locales.js
const { SlashCommandBuilder } = require("discord.js");
const { syncLocalesFromEn } = require("../utils/localeSync");

// Nur du darfst den Command ausführen
const OWNER_IDS = ["1267629995803545747"];

// Log-Channel aus .env
const SYNC_LOG_CHANNEL_ID = process.env.SYNC_LOG_CHANNEL_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync-locales")
    .setDescription("Synct alle Locale-Dateien (außer de/en) mit en.json")
    .addBooleanOption((o) =>
      o.setName("prune").setDescription("Entfernt Keys, die nicht mehr in en.json sind")
    )
    .addBooleanOption((o) =>
      o
        .setName("force_en")
        .setDescription("Setzt alle Werte auf Englisch (überschreibt Übersetzungen!)")
    )
    .addBooleanOption((o) =>
      o.setName("dry").setDescription("Nur anzeigen, nichts schreiben")
    ),

  async execute(interaction) {
    // Rechte-Check
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Dafür hast du keine Rechte.",
        ephemeral: true,
      });
    }

    const prune = interaction.options.getBoolean("prune") ?? false;
    const forceEn = interaction.options.getBoolean("force_en") ?? false;
    const dry = interaction.options.getBoolean("dry") ?? false;

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await syncLocalesFromEn({ prune, forceEn, dry });

      const summary =
        `✅ **Locale Sync fertig!**\n` +
        `📄 Gescannt: **${result.scanned}**\n` +
        `📝 Aktualisiert: **${result.updated}**\n` +
        `➖ Unverändert: **${result.unchanged}**\n` +
        `⚙️ prune=${prune}, force_en=${forceEn}, dry=${dry}`;

      // 1️⃣ Ephemeral Antwort (wie bisher)
      await interaction.editReply(summary);

      // 2️⃣ Log in Sync-Logs Channel
      if (SYNC_LOG_CHANNEL_ID) {
        const logChannel = await interaction.client.channels
          .fetch(SYNC_LOG_CHANNEL_ID)
          .catch(() => null);

        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send(
            `🔁 **/sync-locales ausgeführt**\n` +
              `👤 User: **${interaction.user.tag}** (${interaction.user.id})\n` +
              `🏠 Server: **${interaction.guild?.name ?? "DM"}** (${interaction.guild?.id ?? "n/a"})\n\n` +
              summary
          );
        }
      }
    } catch (e) {
      const errorMsg = `❌ Sync fehlgeschlagen: ${e.message}`;
      await interaction.editReply(errorMsg);

      // Fehler auch loggen
      if (SYNC_LOG_CHANNEL_ID) {
        const logChannel = await interaction.client.channels
          .fetch(SYNC_LOG_CHANNEL_ID)
          .catch(() => null);

        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send(
            `❌ **/sync-locales FEHLER**\n` +
              `👤 User: **${interaction.user.tag}** (${interaction.user.id})\n` +
              `🏠 Server: **${interaction.guild?.name ?? "DM"}** (${interaction.guild?.id ?? "n/a"})\n\n` +
              `Fehler: \`${e.message}\``
          );
        }
      }
    }
  },
};