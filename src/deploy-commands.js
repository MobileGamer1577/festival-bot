require("dotenv").config();
const { REST, Routes } = require("discord.js");

const commands = [
  require("./commands/ping").data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registriere Slash Commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash Commands registriert!");
  } catch (error) {
    console.error(error);
  }
})();