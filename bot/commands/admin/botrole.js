const {
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('botrole')
        .setDescription('Set auto join role for bots')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role you want to give bots when they join')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        )
            return await interaction.reply({
                content: 'You cannot set a bot role',
                flags: MessageFlags.Ephemeral,
            });

        const role = interaction.options.getRole('role');

        if (role.managed) {
            return await interaction.reply({
                content:
                    'That role is managed by Discord/integration and cannot be assigned by the bot.',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!role.editable) {
            return await interaction.reply({
                content:
                    'I cannot assign that role. Move my highest role above the bot role in Server Settings > Roles.',
                flags: MessageFlags.Ephemeral,
            });
        }

        await db.set(`botrole_${interaction.guild.id}`, role.id);

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setAuthor({
                name: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setDescription(
                `:white_check_mark: Your bot role has been set to ${role}`
            );

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    },
};
