const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows the bot latency"),

  async execute(interaction) {
    await interaction.reply(`🏓 Pong! Latenz: ${interaction.client.ws.ping}ms`);
  }
};