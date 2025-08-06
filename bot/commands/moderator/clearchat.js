const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear an amount of chat permited")
    .addIntegerOption(option => 
      option
        .setName("amount")
        .setDescription("Amount of chat to delete")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Messages to delete from a specified user in a channel")
    ),

  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],

  async execute (interaction){
    const {options, channel} = interaction;

    if (!interaction.member.permissions.has("MANAGE_MESSAGES"))
      return await interaction.reply({
        content: "You do not have permission to use this command",
        epheneral: true,});

  const member = interaction.options.getUser("target");
  let amount = interaction.options.getInteger("amount");
  const multiMsg = amount === 1 ? "message": "messages";

  if (!amount || amount > 100 || amount < 1){
    return await interaction.reply({content: `Please specify an amount between 1 and 100 before deleting messages`, epheneral: true});
  }

  try{
    const channelMessages =  await channel.messages.fetch();

    if (channelMessages.size === 0){
      return await interaction.reply({content: `There are no messages in this channel to delete`, epheneral: true});
    }

    if (amount > channelMessages.size) amount = channelMessages.size;

    const clearEmbed = new EmbedBuilder()
      .setColor("Green")
    await interaction.deferReply({epheneral: true});

    let messagesToDelete = [];

    if (member){
      let i = 0;
      channelMessages.forEach((m) => {
        if (m.author.id === member.id && messagesToDelete.length < amount){
          messagesToDelete.push(m)
          i++;
        }
      });

      clearEmbed.setDescription(`:white_check_mark: Succesfully cleared ${messagesToDelete.length} ${multiMsg} from ${member} in ${channel}`);
    }else{
      messagesToDelete = channelMessages.first(amount);
      clearEmbed.setDescription(`:white_check_mark: Succesfully cleared ${messagesToDelete.length} ${multiMsg} in ${channel}`);
    }

    if (messagesToDelete.length > 0){
      await channel.bulkDelete(messagesToDelete, true);
    }

    await interaction.editReply({embeds: [clearEmbed]});
  } catch (error) {
    console.log(error)
    await interaction.reply({
      content: "An error occured while clearing messages",
      epheneral: true,});
  }
  },
};