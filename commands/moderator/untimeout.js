const { SlashCommandBuilder, embedLength } = require("discord.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports ={
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Untimes out a user")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("The user to untime out")
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("The reason for the untime out")
        .setRequired(false),
    ),

    async execute(interaction){
      const member = interaction.options.getUser("target");
      const timeMember = await interaction.guild.members.fetch(member.id);
      const duration = interaction.options.getString("duration");
      let reason = interaction.options.getString("reason");

      if (!interaction.member.permissions.has("Moderate_members"))
        return await interaction.reply({content: "You do not have permission to use this command", ephemeral: true,});
      if (!timeMember)
        return await interaction.reply({content: "The user is no longer within the server", ephemeral: true});
      if(!timeMember.kickable)
        return await interaction.reply({content: "I can't untime out this user!", ephemeral: true});
      if(interaction.member.id === timeMember.id)
        return await interaction.reply({content: "You cannot untime out your self", ephemeral: true});
      if(timeMember.permissions.has("Administrator"))
        return await interaction.reply({content: "You can't untimeout a user with admin permission", ephemeral: true});


      await timeMember.timeout(null, reason);
      

      if (!reason) reason = "No reason provided";
      const dmEmbed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: ${member.tag}'s timeout ha been **removed** | ${reason}`,
      );
      const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(
        `:white_check_mark: ${member.tag} **untimed out** in ${interaction.guild.name} | ${reason}`,
      );

      await timeMember.send({ embeds: [dmEmbed]}).catch(err =>{
        return;
      })

      await interaction.reply({embeds: [embed]});
    }
}