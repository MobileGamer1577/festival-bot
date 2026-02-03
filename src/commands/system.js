const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { execFile } = require("child_process");
const logger = require("../utils/logger");

// Unterstützt mehrere Env-Namen (falls du mal umbenennst)
const OWNER_ID =
  String(process.env.BOT_OWNER_ID || process.env.OWNER_ID || "").trim();

// Optional: falls du den Namen hart setzen willst
const PM2_NAME_FALLBACK = String(process.env.PM2_PROCESS_NAME || "festival-bot").trim();

function isOwner(interaction) {
  return OWNER_ID && interaction.user.id === OWNER_ID;
}

function isPm2() {
  return process.env.pm_id !== undefined;
}

function getPm2ProcessName() {
  // PM2 setzt meistens pm2_process_name automatisch
  return (
    String(process.env.pm2_process_name || "").trim() ||
    PM2_NAME_FALLBACK
  );
}

function pm2Stop(name) {
  return new Promise((resolve, reject) => {
    execFile("pm2", ["stop", name], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout || "pm2 stop ok");
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("system")
    .setDescription("Bot system controls")
    .addSubcommand((s) => s.setName("restart").setDescription("Restart the bot"))
    .addSubcommand((s) => s.setName("shutdown").setDescription("Shutdown the bot")),

  async execute(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({
        content: "❌ Only the bot owner can use this command.",
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    const actionLabel = sub === "shutdown" ? "Shutdown" : "Restart";
    const warnText =
      sub === "shutdown"
        ? "🛑 This will stop the bot.\n\n" +
          (isPm2()
            ? "PM2 detected: The bot will be turned OFF (PM2 will stop it). You can start it again with `pm2 start festival-bot` or `pm2 restart festival-bot`."
            : "No PM2 detected: The bot will stop until you start it again manually.")
        : "🔄 This will restart the bot.";

    const confirmId = `sys_confirm_${sub}_${interaction.id}`;
    const cancelId = `sys_cancel_${sub}_${interaction.id}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel(`Confirm ${actionLabel}`)
        .setStyle(sub === "shutdown" ? ButtonStyle.Danger : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `${warnText}\n\n✅ Click **Confirm** to continue, or **Cancel**.`,
      components: [row],
      ephemeral: true,
    });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      time: 20_000,
      max: 1,
      filter: (i) =>
        i.user.id === interaction.user.id &&
        (i.customId === confirmId || i.customId === cancelId),
    });

    collector.on("collect", async (i) => {
      try {
        await i.deferUpdate();
      } catch {}

      if (i.customId === cancelId) {
        try {
          await interaction.editReply({ content: "❎ Cancelled.", components: [] });
        } catch {}
        return;
      }

      // Confirm
      try {
        await interaction.editReply({
          content: sub === "shutdown" ? "🛑 Shutting down..." : "🔄 Restarting...",
          components: [],
        });
      } catch {}

      if (sub === "shutdown") {
        logger.error(`[SYSTEM] Shutdown requested by ${interaction.user.tag} (${interaction.user.id})`);

        // ✅ PM2: wirklich ausschalten (pm2 stop)
        if (isPm2()) {
          const name = getPm2ProcessName();
          try {
            await pm2Stop(name);
            // kleine Verzögerung, damit Discord-Reply sicher raus ist
            setTimeout(() => process.exit(0), 500);
          } catch (e) {
            logger.error(`[SYSTEM] pm2 stop failed: ${e.message || e}`);
            // Fallback: normal exit (PM2 wird evtl. restarten)
            setTimeout(() => process.exit(0), 500);
          }
          return;
        }

        // Ohne PM2: einfach beenden
        setTimeout(() => process.exit(0), 500);
        return;
      }

      // restart
      logger.warn(`[SYSTEM] Restart requested by ${interaction.user.tag} (${interaction.user.id})`);
      // exit(1) => PM2 restart
      setTimeout(() => process.exit(1), 500);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        try {
          await interaction.editReply({
            content: "⌛ Timed out. No action taken.",
            components: [],
          });
        } catch {}
      }
    });
  },
};