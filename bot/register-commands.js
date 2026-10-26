require('dotenv').config();
const {
    REST,
    Routes,
    ApplicationCommandOptionType,
    ApplicationCommand,
    ApplicationCommandType,
} = require('discord.js');
const nodeFs = require('node:fs');
const path = require('node:path');

async function updateCommands(client) {
    const commands = [];

    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = nodeFs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = nodeFs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                const commandData = command.data.toJSON();

                if (commands.some((cmd) => cmd.name === commandData.name)) {
                    console.warn(
                        `[DUPLICATE COMMAND] "${commandData.name}" found in: ${filePath}`
                    );
                    continue;
                }

                commands.push(commandData);
            } else {
                console.log(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
                );
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Started refreshing apllication (/) commands.');

        const guildIds = client.guilds.cache.map((guild) => guild.id);

        if (guildIds.length === 0) {
            console.log('Bot is not in any guilds');
            return;
        }
        const globalCommands = await rest.get(
            Routes.applicationCommands(process.env.CLIENT_ID)
        );

        console.log(
            '[GLOBAL COMMANDS]',
            globalCommands.map((cmd) => cmd.name)
        );
        for (const guildId of guildIds) {
            const existingGuildCommands = await rest.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
            );

            console.log(
                `[GUILD COMMANDS ${guildId}]`,
                existingGuildCommands.map((cmd) => cmd.name)
            );
            try {
                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: [] }
                );

                console.log('Removed global application commands.');
            } catch (error) {
                console.error('Failed to remove global commands:', error);
            }
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`Successfully reloaded commands for guild: ${guildId}`);
        }
        console.log(
            'Successfully reloaded application (/) commands for all guilds.'
        );
    } catch (error) {
        console.error(
            'There was an error while refreshing application commands:',
            error
        );
    }
}

module.exports = updateCommands;
