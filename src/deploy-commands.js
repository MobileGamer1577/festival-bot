require("dotenv").config();
const { REST, Routes } = require("discord.js");

// Alle Commands hier eintragen
const commands = [
  require("./commands/ping").data.toJSON(),
  require("./commands/about").data.toJSON(),
  require("./commands/language").data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registriere Slash Commands (GUILD)...");

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash Commands registriert!");
  } catch (error) {
    console.error(error);
  }
})();