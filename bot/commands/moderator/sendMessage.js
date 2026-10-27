const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    PermissionsBitField,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    category: 'Moderation',
    data: new SlashCommandBuilder()
        .setName('sendmessage')
        .setDescription('send a message')
        .addStringOption((option) =>
            option
                .setName('txt')
                .setDescription('Message to be sent')
                .setRequired(true)
        ),
    async execute(interaction) {
        const msg = interaction.options.getString('txt');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.channel.send(msg);
        await interaction.followUp({
            content: `Message sent: ${msg}`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
