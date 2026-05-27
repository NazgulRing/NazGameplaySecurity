const { EmbedBuilder } = require('discord.js');

async function sendLiveNotification(
    client,
    guildID,
    settings,
    stream,
    message
) {
    try {
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(settings.channelID);

        if (!channel) {
            return;
        }

        const streamerData = settings.streamers?.find(
            (s) => s.username.toLowerCase() === stream.user_login.toLowerCase()
        );

        const embed = new EmbedBuilder()
            .setColor('#9146ff')

            .setAuthor({
                name: `${stream.user_name} is live`,
                iconURL: streamerData?.avatar,
                url: `https://twitch.tv/${stream.user_login}`,
            })

            .setTitle(stream.title)

            .setURL(`https://twitch.tv/${stream.user_login}`)

            .addFields(
                {
                    name: 'Game',
                    value: stream.game_name || 'Unknown',
                    inline: true,
                },
                {
                    name: 'Viewers',
                    value: `${stream.viewer_count}`,
                    inline: true,
                }
            )

            .setImage(
                stream.thumbnail_url
                    .replace('{width}', '1280')
                    .replace('{height}', '720')
            )

            .setFooter({
                text: 'Twitch Live Alert',
            })

            .setTimestamp();

        let mention = '';

        if (settings.mentionRoleID === 'everyone') {
            mention = '@everyone';
        } else if (settings.mentionRoleID) {
            mention = `<@&${settings.mentionRoleID}>`;
        }

        await channel.send({
            content: `${mention}\n${message}`,
            embeds: [embed],
        });

        console.log(`[TWITCH] Alert sent for ${stream.user_name}`);
    } catch (err) {
        console.error('[TWITCH NOTIFIER ERROR]', err);
    }
}

module.exports = {
    sendLiveNotification,
};
