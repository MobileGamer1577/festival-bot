const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setGuildLang, getGuildLang, t } = require("../utils/i18n");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Set the bot language for this server")
    .addStringOption(opt =>
      opt.setName("lang")
        .setDescription("de or en")
        .setRequired(true)
        .addChoices(
          { name: "Deutsch", value: "de" },
          { name: "English", value: "en" }
        )
    )
    // Nur Admins/Mods sollen das umstellen können:
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const lang = interaction.options.getString("lang");
    setGuildLang(interaction.guildId, lang);

    await interaction.reply({
      content: lang === "en" ? t("en", "lang_set") : t("de", "lang_set"),
      ephemeral: true
    });
  }
};