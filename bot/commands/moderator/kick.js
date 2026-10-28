const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to kick.')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the kick.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: 'You cannot kick yourself.',
                ephemeral: true,
            });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({
                content: 'I cannot kick myself.',
                ephemeral: true,
            });
        }

        try {
            const member = await interaction.guild.members
                .fetch(target.id)
                .catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: 'The user is not a member of this server.',
                    ephemeral: true,
                });
            }

            if (!member.kickable) {
                return interaction.reply({
                    content:
                        "I cannot kick this user. Check the role hierarchy and the bot's permissions.",
                    ephemeral: true,
                });
            }

            await member.kick(`${reason} | Moderator: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('User Kicked')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})` },
                    { name: 'Moderator', value: interaction.user.tag },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing /kick:', error);

            return interaction.reply({
                content:
                    'Failed to kick the user. Check the bot’s permissions.',
                ephemeral: true,
            });
        }
    },
};
