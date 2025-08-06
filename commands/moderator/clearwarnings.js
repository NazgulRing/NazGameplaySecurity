const { SlashCommandBuilder } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Clear a members warnings")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("The member you want to clear the warnings of")
        .setRequired(true),
    )
    .addNumberOption(option =>
      option
        .setName("number")
        .setDescription("The number of warnings you want to clear")
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has("KICK_MEMBERS"))
      return await interaction.reply({
        content: "You do not have permission to use this command",
        ephemeral: true,
      });

    const member = interaction.options.getUser("target");
    const warnNum = interaction.options.getNumber("number");

    let warns = await db.get(`warns_${member}`);
    if (warns === null) warns = 0;

    if (warnNum > warns)
      return await interaction.reply({
        content: `You can only clear a max of ${warns} warnings for ${member.tag}`,
        ephemeral: true,
      });

    let afwarns = await db.sub(`warns_${member}`, warnNum);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: ${member.tag} now has ${afwarns} warning(s)`,
      );
    await interaction.reply({ embeds: [embed] });
  },
};