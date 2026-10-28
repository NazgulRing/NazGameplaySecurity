const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'Utility',
    // Define the slash command data with name, description, and required option
    data: new SlashCommandBuilder()
        .setName('reload') // Command name: /reload
        .setDescription('Reloads a command.') // Description in Discord UI
        .addStringOption(
            (
                option // Add a required string option called "command"
            ) =>
                option
                    .setName('command')
                    .setDescription('The command to reload.')
                    .setRequired(true)
        ),

    // Function executed when the command is triggered

    async execute(interaction) {
        // Only administrators or members with Moderate Members permission can use this command.
        const hasPermission =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ModerateMembers');

        if (!hasPermission) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        // Get the command name from the options, convert to lowercase for consistency
        const commandName = interaction.options
            .getString('command', true)
            .toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            return interaction.reply({
                content: `There is no command with name \`${commandName}\`!`,
                ephemeral: true,
            });
        }

        delete require.cache[require.resolve(command.filePath)];

        try {
            const newCommand = require(command.filePath);
            newCommand.filePath = command.filePath;
            interaction.client.commands.set(newCommand.data.name, newCommand);

            await interaction.reply({
                content: `Command \`${newCommand.data.name}\` was reloaded!`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: `There was an error reloading the command \`${command.data.name}\`:\n\`${error.message}\``,
                ephemeral: true,
            });
        }
    },
};
