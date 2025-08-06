const { SlashCommandBuilder,PermissionsBitField, EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const { execute } = require("./clearwarnings");
const db = new QuickDB();
module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlogchat")
    .setDescription("Set log channel")
    .addChannelOption(option => 
      option
        .setName("channel")
        .setDescription("The channel you want to set as log channel")
        .setRequired(true)
    ),
  async execute(interaction){
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return await 
    interaction.reply({content: "You cannot set a log channel", ephemeral: true});

    const channel = interaction.options.getChannel("channel", true);

    await db.set(`setLogChat_${interaction.guild.id}`, channel.id)

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL()})
      .setDescription(`:white_check_mark: Your log chat has been set to ${channel}`)

      await interaction.reply({embeds: [embed]});
  }
}