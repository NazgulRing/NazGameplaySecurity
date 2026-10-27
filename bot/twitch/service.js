const { QuickDB } = require('quick.db');
const { getStream } = require('./api');

const { parseMessage } = require('./parser');

const { sendLiveNotification } = require('./notifier');

let twitchStarted = false;

const db = new QuickDB();

async function startTwitchService(client) {
    if (twitchStarted) {
        return;
    }

    twitchStarted = true;

    setInterval(async () => {
        try {
            const all = await db.all();

            const twitchConfigs = all.filter(
                (entry) => entry.id.startsWith('twitch_') && entry.value.enabled
            );

            if (twitchConfigs.length === 0) {
                return;
            }

            for (const config of twitchConfigs) {
                const guildID = config.id.replace('twitch_', '');

                const settings = config.value;

                const streamers = settings.streamers || [];

                for (const streamer of streamers) {
                    const stream = await getStream(streamer.username);

                    if (!stream) {
                        const liveKey = `twitch_live_${guildID}_${streamer.username}`;

                        await db.delete(liveKey);

                        continue;
                    }

                    const liveKey = `twitch_live_${guildID}_${streamer.username}`;

                    const alreadyLive = await db.get(liveKey);

                    if (alreadyLive) {
                        continue;
                    }

                    const parsedMessage = parseMessage(
                        streamer.message,
                        stream
                    );

                    await sendLiveNotification(
                        client,
                        guildID,
                        streamer,
                        stream,
                        parsedMessage
                    );

                    await db.set(liveKey, true);
                }
            }
        } catch (err) {
            console.error('[TWITCH SERVICE ERROR]', err);
        }
    }, 60000);
}

module.exports = startTwitchService;
