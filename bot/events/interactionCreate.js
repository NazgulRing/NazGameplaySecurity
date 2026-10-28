const { Events } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(
            interaction.commandName
        );

        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`
            );
            return;
        }

        // Check whether the command is enabled for this server.
        if (interaction.inGuild()) {
            const guildID = interaction.guildId;
            const commandSettings =
                (await db.get(`commandSettings_${guildID}`)) || {};

            if (commandSettings[interaction.commandName] === false) {
                return interaction.reply({
                    content: `The /${interaction.commandName} command is currently disabled on this server.`,
                    ephemeral: true,
                });
            }
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            }
        }
    },
};
