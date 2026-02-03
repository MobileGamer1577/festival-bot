// src/commands/credits.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("credits")
    .setDescription("Credits & data sources used by Festival Bot"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📜 Festival Bot – Credits")
      .setDescription(
        "Festival Bot is an independent community project.\n" +
        "It is **not affiliated with Epic Games**."
      )
      .addFields(
        {
          name: "🎮 Fortnite Festival Data",
          value:
            "Track data sourced from Epic Games Fortnite Festival\n" +
            "via the community project **FNFestival**."
        },
        {
          name: "🛠 Community Project",
          value:
            "[FNFestival (GitHub)](https://github.com/FNFestival/fnfestival.github.io)\n" +
            "Jam track data updated automatically via GitHub Actions."
        },
        {
          name: "⚠ Disclaimer",
          value:
            "All trademarks and assets belong to their respective owners.\n" +
            "This bot is for informational purposes only."
        }
      )
      .setFooter({
        text: "Festival Bot • Open Source & Community-driven"
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
