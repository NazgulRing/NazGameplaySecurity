const { moderationCommandUsed } = require('../../events/memberLogs.js');
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
        .setName('clearwarns')
        .setDescription("Clear a member's warnings")
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The member you want to clear warnings of')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('number')
                .setDescription('The number of warnings you want to clear')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.KickMembers
            )
        ) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const member = interaction.options.getUser('target');
        const warnNum = interaction.options.getInteger('number');

        const warningCountKey = `warns_${interaction.guild.id}_${member.id}`;

        const warningDetailsKey = `warnDetails_${interaction.guild.id}_${member.id}`;

        const warns = (await db.get(warningCountKey)) ?? 0;

        if (warnNum > warns) {
            return interaction.reply({
                content: `You can only clear a maximum of ${warns} warning(s) for ${member.tag}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const remainingWarnings = warns - warnNum;

        await db.set(warningCountKey, remainingWarnings);

        const warningDetails = (await db.get(warningDetailsKey)) || [];

        await db.set(
            warningDetailsKey,
            warningDetails.slice(
                0,
                Math.max(warningDetails.length - warnNum, 0)
            )
        );

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription(
                `:white_check_mark: ${member.tag} now has ${remainingWarnings} warning(s).`
            );

        await interaction.reply({ embeds: [embed] });

        await moderationCommandUsed(
            interaction,
            member,
            `Cleared ${warnNum} warning(s). ${remainingWarnings} warning(s) remaining.`
        );
    },
};
