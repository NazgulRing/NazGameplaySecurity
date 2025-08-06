require("dotenv").config();
const { REST, Routes, ApplicationCommandOptionType, ApplicationCommand, ApplicationCommandType} = require("discord.js");
const nodeFs = require('node:fs');
const path = require('node:path');

async function updateCommands(client) {
	const commands = [];

	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = nodeFs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = nodeFs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}



	const rest = new REST({ version: "10" }).setToken(process.env["token"]);


	try{
		console.log("Started refreshing apllication (/) commands.");

		const guildIds = client.guilds.cache.map(guild => guild.id);

		if(guildIds.length === 0){
			console.log("Bot is not in any guilds");
			return;
		}

	for (const guildId of guildIds) {
			await rest.put(
				Routes.applicationCommands(process.env["CLIENT_ID"], guildId), 
				{ body: commands });
				console.log(`Successfully reloaded commands for guild: ${guildId}`);
			}
			console.log("Successfully reloaded application (/) commands for all guilds.");
		} catch (error) {
			console.log(`There was an error: ${error}`);
		}
	}

module.exports = updateCommands;