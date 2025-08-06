const { SlashCommandBuilder, embedLength } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports ={
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a user")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("The user to timeout")
        .setRequired(true),
    )
    .addStringOption(option =>
      option
      .setName("duration")
      .setDescription("The time to time out a person m/h/d")
      .addChoices(
        {name: "60 Seconds", value: "60"},
        {name: "2 minutes", value: "120"},
        {name: "5 minutes", value: "300"},
        {name: "10 minutes", value: "600"},
        {name: "15 minutes", value: "900"},
        {name: "20 minutes", value: "1200"},
        {name: "30 minutes", value: "1800"},
        {name: "45 minutes", value: "2700"},
        {name: "1 hour", value: "3600"},
        {name: "2 hour", value: "7200"},
        {name: "3 hour", value: "10800"},
        {name: "5 hour", value: "18000"},
        {name: "10 hour", value: "36000"},
        {name: "1 Day", value: "86400"},
        {name: "2 Day", value: "172800"},
        {name: "3 Day", value: "259200"},
        {name: "5 Day", value: "432000"},
        {name: "One week", value: "604800"},
      )
      .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("The reason for the timeout")
        .setRequired(false),
    ),

    async execute(interaction){
      const member = interaction.options.getUser("target");
      const timeMember = await interaction.guild.members.fetch(member.id);
      const duration = interaction.options.getString("duration");
      let reason = interaction.options.getString("reason");

      if (!interaction.member.permissions.has("ModerateMembers"))
        return await interaction.reply({content: "You do not have permission to use this command", ephemeral: true,});
      if (!timeMember)
        return await interaction.reply({content: "The user is no longer within the server", ephemeral: true});
      if(!timeMember.kickable)
        return await interaction.reply({content: "I can't time out this user!", ephemeral: true});
      if(interaction.member.id === timeMember.id)
        return await interaction.reply({content: "You cannot time out your self", ephemeral: true});
      if(timeMember.permissions.has("Administrator"))
        return await interaction.reply({content: "You can't timeout a user with admin permission", ephemeral: true});


      await timeMember.timeout(duration * 1000, reason);
      

      if (!reason) reason = "No reason provided";
      const dmEmbed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: You have been timed out in **${interaction.guild.name}** You can check the status of your timeout within server | ${reason}`,
      );
      const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: ${member.tag} has been **Timed out** | for ${duration / 60} minute(s) | ${reason}`,
      );

      await timeMember.send({ embeds: [dmEmbed]}).catch(err =>{
        return;
      })

      await interaction.reply({embeds: [embed]});
    }
}