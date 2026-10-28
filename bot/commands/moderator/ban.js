const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to ban.')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the ban.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: 'You cannot ban yourself.',
                ephemeral: true,
            });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({
                content: 'I cannot ban myself.',
                ephemeral: true,
            });
        }

        try {
            const member = await interaction.guild.members
                .fetch(target.id)
                .catch(() => null);

            if (member && !member.bannable) {
                return interaction.reply({
                    content:
                        "I cannot ban this user. Check the role hierarchy and the bot's permissions.",
                    ephemeral: true,
                });
            }

            await interaction.guild.members.ban(target.id, {
                reason: `${reason} | Moderator: ${interaction.user.tag}`,
            });

            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('User Banned')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})` },
                    { name: 'Moderator', value: interaction.user.tag },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing /ban:', error);

            return interaction.reply({
                content: 'Failed to ban the user. Check the bot’s permissions.',
                ephemeral: true,
            });
        }
    },
};
