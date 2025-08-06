const {SlashCommandBuilder,PermissionsBitField,EmbedBuilder,} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Set auto join role")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role you want to set as autorole")
        .setRequired(true),
    ),
  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    )
      return await interaction.reply({
        content: "You cannot set an auto role",
        ephemeral: true,
      });

    const role = interaction.options.getRole("role");

    await db.set(`autorole_${interaction.guild.id}`, role.id);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL()})
      .setDescription(
        `:white_check_mark: Your auto role has been set to ${role}`,
      );

    await interaction.reply({ embeds: [embed] });
  },
};
