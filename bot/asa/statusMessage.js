const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');

const db = new QuickDB();
const MESSAGE_KEY = 'asa.statusMessageId';

async function updateStatusMessage(client, { status, playerCount = 0 }) {
    const channelId = process.env.ASA_DISCORD_CHANNEL_ID;
    if (!channelId) {
        throw new Error('ASA_DISCORD_CHANNEL_ID is missing in .env');
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !channel.messages) {
        throw new Error('ASA channel cannot be used for messages');
    }

    const states = {
        starting: {
            title: 'RisingDawn',
            description: '🟡 Starting Server …',
            color: 0xf1c40f,
        },
        online: {
            title: 'RisingDawn',
            description: '🟢 Server online',
            color: 0x2ecc71,
        },
        offline: {
            title: 'RisingDawn',
            description: '🔴 Server offline',
            color: 0xe74c3c,
        },
        stopping: {
            title: 'RisingDawn',
            description: '🟠 Stopping Server …',
            color: 0xe67e22,
        },
    };

    const state = states[status] || states.offline;

    const embed = new EmbedBuilder()
        .setColor(state.color)
        .setTitle(state.title)
        .setDescription(state.description)
        .addFields({
            name: 'Players Online',
            value: String(status === 'online' ? playerCount : 0),
            inline: true,
        })
        .setTimestamp()
        .setFooter({
            text: 'ARK: Survival Ascended • RisingDawn',
        });

    const messageId = await db.get(MESSAGE_KEY);
    let message = null;

    if (messageId) {
        message = await channel.messages.fetch(messageId).catch(() => null);
    }

    if (message) {
        await message.edit({ embeds: [embed] });
    } else {
        message = await channel.send({ embeds: [embed] });
        await db.set(MESSAGE_KEY, message.id);
    }

    return message;
}

module.exports = { updateStatusMessage };
