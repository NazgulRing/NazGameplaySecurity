const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendmessage")
    .setDescription("send a message")
    .addStringOption(option =>
      option.setName("txt")
      .setDescription("Message to be sent")
      .setRequired(true)
    ),
  	async execute(interaction) {
      const msg = interaction.options.getString("txt");
      await interaction.deferReply({ephemeral: true});
      await interaction.channel.send(msg);
      await interaction.followUp({content: `Message sent: ${msg}`, ephemeral: true})
	},};