const { QuickDB } = require('quick.db');
const { getStream } = require('./api');

const { parseMessage } = require('./parser');

const { sendLiveNotification } = require('./notifier');

let twitchStarted = false;

const db = new QuickDB();

async function startTwitchService(client) {
    if (twitchStarted) {
        console.log('[TWITCH] Service already running');
        return;
    }

    twitchStarted = true;

    console.log('[TWITCH] Service started');

    setInterval(async () => {
        try {
            const all = await db.all();

            const twitchConfigs = all.filter(
                (entry) => entry.id.startsWith('twitch_') && entry.value.enabled
            );

            if (twitchConfigs.length === 0) {
                return;
            }

            console.log(`[TWITCH] Checking ${twitchConfigs.length} streamers`);

            for (const config of twitchConfigs) {
                const guildID = config.id.replace('twitch_', '');

                const settings = config.value;

                const streamers = settings.streamers || [];

                for (const streamer of streamers) {
                    console.log(`[TWITCH] Checking ${streamer.username}`);

                    const stream = await getStream(streamer.username);

                    if (!stream) {
                        console.log(`[TWITCH] ${streamer.username} is offline`);

                        const liveKey = `twitch_live_${guildID}_${streamer.username}`;

                        await db.delete(liveKey);

                        continue;
                    }

                    const liveKey = `twitch_live_${guildID}_${streamer.username}`;

                    const alreadyLive = await db.get(liveKey);

                    if (alreadyLive) {
                        console.log(
                            `[TWITCH] ${streamer.username} already announced`
                        );

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
