const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	// Define the slash command data with name and description
	data: new SlashCommandBuilder()
	// Command name users will type
		.setName('membercount') 
	// Command description shown in Discord UI
		.setDescription('Display your member number.'),
	// This function runs when the command is executed
	async execute(interaction) {
		// Reply to the interaction with the server name and member count
		await interaction.reply(`This server is ${interaction.guild.name} and there are ${interaction.guild.memberCount} members on this server`);
	},
};