const { EmbedBuilder, ChannelType } = require('discord.js');

const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    name: 'messageDelete',

    async execute(message) {
        try {
            // Ignore DMs
            if (!message.guild) return;

            // Ignore bots
            if (message.author?.bot) return;

            const guild = message.guild;

            // Get log channel from DB
            const logChannelID = await db.get(`messageLogChannel_${guild.id}`);

            if (!logChannelID) return;

            const logChannel = guild.channels.cache.get(logChannelID);

            if (!logChannel || logChannel.type !== ChannelType.GuildText) {
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🗑️ Message Deleted')
                .addFields(
                    {
                        name: 'User',
                        value: `${message.author.tag}`,
                        inline: true,
                    },
                    {
                        name: 'Channel',
                        value: `${message.channel}`,
                        inline: true,
                    },
                    {
                        name: 'Message',
                        value: message.content || '*No text*',
                    }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            await logChannel.send({
                embeds: [embed],
            });
        } catch (err) {
            console.error('messageDelete event error:', err);
        }
    },
};
