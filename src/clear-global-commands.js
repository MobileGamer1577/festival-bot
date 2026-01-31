require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🧹 Clearing GLOBAL commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("✅ Global commands cleared!");
  } catch (err) {
    console.error(err);
  }
})();