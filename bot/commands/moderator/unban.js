const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((option) =>
            option
                .setName('userid')
                .setDescription("The user's Discord ID.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the unban.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const userId = interaction.options.getString('userid').trim();
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                content:
                    'Invalid Discord ID. Please provide the user’s numeric ID.',
                ephemeral: true,
            });
        }

        try {
            const ban = await interaction.guild.bans
                .fetch(userId)
                .catch(() => null);

            if (!ban) {
                return interaction.reply({
                    content: 'This user is not banned from the server.',
                    ephemeral: true,
                });
            }

            await interaction.guild.members.unban(
                userId,
                `${reason} | Moderator: ${interaction.user.tag}`
            );

            const embed = new EmbedBuilder()
                .setColor(0x00aa00)
                .setTitle('User Unbanned')
                .addFields(
                    { name: 'User', value: `${ban.user.tag} (${userId})` },
                    { name: 'Moderator', value: interaction.user.tag },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing /unban:', error);

            return interaction.reply({
                content:
                    'Failed to unban the user. Check the bot’s permissions.',
                ephemeral: true,
            });
        }
    },
};
