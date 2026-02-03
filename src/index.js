// src/index.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");

const logger = require("./utils/logger");

/* =========================
   Globales Error Tracking
========================= */
process.on("unhandledRejection", (reason) => {
  logger.error(`[UNHANDLED_REJECTION] ${reason?.stack || reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`[UNCAUGHT_EXCEPTION] ${err?.stack || err}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

/* =========================
   Discord Client Events
========================= */
client.on("warn", (msg) => logger.warn(`[DISCORD_CLIENT_WARN] ${msg}`));
client.on("error", (err) => logger.error(`[DISCORD_CLIENT_ERROR] ${err?.stack || err}`));

/* =========================
   Commands laden
========================= */
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);

  try {
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Command geladen: /${command.data.name}`);
    } else {
      logger.warn(`Command ${file} ist fehlerhaft (data/execute fehlt)`);
    }
  } catch (e) {
    logger.error(`Command ${file} konnte nicht geladen werden: ${e?.stack || e}`);
  }
}

/* =========================
   Bot Ready
========================= */
client.once(Events.ClientReady, () => {
  logger.success(`Festival Bot ist online als ${client.user.tag} [BETA]`);
  logger.info(`Verbunden mit ${client.guilds.cache.size} Server(n)`);
});

/* =========================
   Interactions (Slash + Autocomplete + Select Menu)
========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  // Hilfsfunktion: sauberes Error-Reply, egal ob schon deferred/replied
  async function safeEphemeralErrorReply(message) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    } catch {
      // falls Discord schon "acknowledged" o.ä. sagt -> nichts mehr machen
    }
  }

  // 1) Autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(
        `[AUTOCOMPLETE] /${interaction.commandName} | user=${interaction.user?.tag} (${interaction.user?.id}) | guild=${interaction.guildId} | ${error?.stack || error}`
      );
    }
    return;
  }

  // 2) Select Menu
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "festival_search_select") return;

    const selectedId = interaction.values?.[0];
    const command = client.commands.get("search");
    if (!command?.handleSelect) return;

    try {
      await command.handleSelect(interaction, selectedId);
    } catch (error) {
      logger.error(
        `[SELECT_MENU] id=${interaction.customId} value=${selectedId} | user=${interaction.user?.tag} (${interaction.user?.id}) | guild=${interaction.guildId} | ${error?.stack || error}`
      );
      await safeEphemeralErrorReply("❌ Error handling selection.");
    }
    return;
  }

  // 3) Slash Commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const ctx =
    `user=${interaction.user?.tag} (${interaction.user?.id}) | ` +
    `guild=${interaction.guild?.name ?? "DM"} (${interaction.guildId ?? "n/a"})`;

  try {
    logger.info(`[CMD] /${interaction.commandName} | ${ctx}`);
    await command.execute(interaction);
  } catch (error) {
    logger.error(`[CMD_ERROR] /${interaction.commandName} | ${ctx} | ${error?.stack || error}`);
    await safeEphemeralErrorReply("❌ Es ist ein Fehler aufgetreten.");
  }
});

/* =========================
   Login
========================= */
client.login(process.env.DISCORD_TOKEN);