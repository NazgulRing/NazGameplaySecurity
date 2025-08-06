const { SlashCommandBuilder } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Gets a members warnings")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("The member you want to check the warnings for")
        .setRequired(true),
    ),
  async execute(interaction) {
    const member = interaction.options.getUser("target");
    let warns = await db.get(`warns_${member}`);

    if (warns === null) warns = 0;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: ${member.tag} has **${warns}** warn(s)`,
      );
    await interaction.reply({ embeds: [embed] });
  },
};
