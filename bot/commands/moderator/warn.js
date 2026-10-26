const { SlashCommandBuilder } = require('discord.js');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { randomUUID } = require('node:crypto');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user about something they did')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user you want to warn')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the warn')
                .setRequired(false)
        ),
    async execute(interaction) {
        if (
            !interaction.inGuild() ||
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.KickMembers
            )
        )
            return await interaction.reply({
                content:
                    'This command can only be used in a server by members with Kick Members permission.',
                ephemeral: true,
            });

        const member = interaction.options.getUser('target');

        if (member.id === interaction.client.user.id) {
            return await interaction.reply({
                content: 'You cannot warn the bot itself.',
                ephemeral: true,
            });
        }

        let reason = interaction.options.getString('reason');

        if (!reason) reason = 'No reason provided';

        const dmEmbed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription(
                `:white_check_mark: You have been warned in **${interaction.guild.name}** | ${reason}`
            );
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription(
                `:white_check_mark: ${member.tag} has been **warned** | ${reason}`
            );
        await interaction.reply({ embeds: [embed] });
        await member.send({ embeds: [dmEmbed] }).catch((err) => {
            return;
        });
        await db.add(`warns_${interaction.guild.id}_${member.id}`, 1);

        const warningKey = `warnDetails_${interaction.guild.id}_${member.id}`;
        const warnings = (await db.get(warningKey)) || [];
        warnings.push({
            id: randomUUID(),
            reason,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            createdAt: new Date().toISOString(),
        });
        await db.set(warningKey, warnings);
    },
};
