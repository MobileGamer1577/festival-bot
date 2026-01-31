require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events
} = require("discord.js");

const logger = require("./utils/logger");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

/* =========================
   Commands laden
========================= */
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    logger.info(`Command geladen: /${command.data.name}`);
  } else {
    logger.warn(`Command ${file} ist fehlerhaft (data/execute fehlt)`);
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
   Slash Commands
========================= */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Unbekannter Command: /${interaction.commandName}`);
    return;
  }

  try {
    logger.info(
      `/${interaction.commandName} von ${interaction.user.tag} in Guild ${interaction.guildId}`
    );

    await command.execute(interaction);
  } catch (error) {
    logger.error(
      `Fehler bei /${interaction.commandName}: ${error.message || error}`
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Es ist ein Fehler aufgetreten.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "❌ Es ist ein Fehler aufgetreten.",
        ephemeral: true
      });
    }
  }
});

/* =========================
   Login
========================= */
client.login(process.env.DISCORD_TOKEN);