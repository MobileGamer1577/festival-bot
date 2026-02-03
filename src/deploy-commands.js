// src/deploy-commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

// Commands aus src/commands laden
const commands = [
  require("./commands/ping").data.toJSON(),
  require("./commands/about").data.toJSON(),
  require("./commands/language").data.toJSON(),
  require("./commands/search").data.toJSON(),
  require("./commands/credits").data.toJSON(),
  require("./commands/bo7").data.toJSON(),
  require("./commands/sync-locales").data.toJSON(),
  require("./commands/system").data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands (GUILD)...");

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered!");
  } catch (error) {
    console.error("❌ Deploy failed:", error);
  }
})();