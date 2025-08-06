const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Define the slash command data with command name and description
  data: new SlashCommandBuilder()
	// The command name users type: /ping
    .setName('ping')   
	// Description shown in Discord UI               
    .setDescription('Replies with Pong!'), 

  // This function runs when the command is executed
  async execute(interaction) {
  // Reply to the command interaction with "Pong!"
    await interaction.reply('Pong!');
  },
};
