const { getServerInfo } = require('./rcon');
const { updateStatusMessage } = require('./statusMessage');

let previousStatus = null;
let previousPlayers = null;
let consecutiveFailures = 0;
let checkInProgress = false;

async function checkServerStatus(client) {
    if (checkInProgress) return;
    checkInProgress = true;

    try {
        let info;

        try {
            info = await getServerInfo();
            consecutiveFailures = 0;
        } catch (error) {
            consecutiveFailures++;

            console.warn(
                `[ASA] RCON-feil (${consecutiveFailures}/3):`,
                error.message
            );

            if (consecutiveFailures < 3 || previousStatus === false) {
                return;
            }

            info = {
                online: false,
                players: [],
                playerCount: 0,
            };
        }

        if (!info.online) {
            if (previousStatus !== false) {
                await updateStatusMessage(client, {
                    status: 'offline',
                    playerCount: 0,
                });
            }

            previousStatus = false;
            previousPlayers = null;
            return;
        }

        // First successful check or server is back.
        if (previousStatus !== true) {
            await updateStatusMessage(client, {
                status: 'online',
                playerCount: info.playerCount,
            });

            previousStatus = true;
            previousPlayers = [...info.players];
            return;
        }

        // Update the same embed when player count changes.
        const oldPlayers = previousPlayers || [];
        const newPlayers = info.players || [];

        const oldSet = new Set(oldPlayers);
        const newSet = new Set(newPlayers);

        const joined = newPlayers.filter((player) => !oldSet.has(player));
        const left = oldPlayers.filter((player) => !newSet.has(player));

        if (joined.length > 0 || left.length > 0) {
            await updateStatusMessage(client, {
                status: 'online',
                playerCount: info.playerCount,
            });
        }

        previousPlayers = [...newPlayers];
    } catch (error) {
        console.error('[ASA] Status check failed:', error);
    } finally {
        checkInProgress = false;
    }
}

module.exports = { checkServerStatus };
