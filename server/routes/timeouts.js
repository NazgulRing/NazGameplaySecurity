const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

function createTimeoutsRouter(client) {
    const router = express.Router();

    // Give timeout
    router.post('/timeouts/give', async (req, res) => {
        const { guildID, memberId, durationSeconds, reason } = req.body;

        if (!guildID || !memberId) {
            return res.status(400).json({
                error: 'guildID and memberId are required.',
            });
        }

        if (!/^\d{17,20}$/.test(guildID)) {
            return res.status(400).json({
                error: 'Invalid Discord server ID.',
            });
        }

        const duration = Number(durationSeconds);

        // Discord supports timeouts up to 28 days.
        if (
            !Number.isFinite(duration) ||
            duration <= 0 ||
            duration > 28 * 24 * 60 * 60
        ) {
            return res.status(400).json({
                error: 'Duration must be between 1 second and 28 days.',
            });
        }

        try {
            if (!client.isReady()) {
                return res.status(503).json({
                    error: 'Discord client is not ready.',
                });
            }

            const guild = await client.guilds.fetch(guildID);
            const botMember = await guild.members.fetchMe();

            if (
                !botMember.permissions.has(PermissionFlagsBits.ModerateMembers)
            ) {
                return res.status(403).json({
                    error: 'The bot needs the Moderate Members permission.',
                });
            }

            const member = await guild.members.fetch(memberId);

            if (!member.moderatable) {
                return res.status(403).json({
                    error: 'The bot cannot timeout this member. Check role hierarchy and permissions.',
                });
            }

            const timeoutReason = String(reason || 'No reason provided').slice(
                0,
                500
            );

            await member.timeout(Math.round(duration * 1000), timeoutReason);

            // Finn moderator fra brukeren som sendte forespørselen.
            const moderatorId = req.body.moderatorId || null;
            const moderatorName = moderatorId
                ? `Unknown (<@${moderatorId}>)`
                : 'Dashboard';

            const historyEntry = {
                memberId: member.id,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.displayAvatarURL({
                    extension: 'png',
                    size: 128,
                }),
                action: 'given',
                moderator: moderatorName,
                reason: timeoutReason,
                durationSeconds: duration,
                timeoutUntil:
                    member.communicationDisabledUntil?.toISOString() || null,
                timestamp: Date.now(),
            };

            // Lagre historikken i QuickDB.
            const historyKey = `timeoutHistory_${guildID}`;
            const history = (await db.get(historyKey)) || [];

            history.unshift(historyEntry);

            await db.set(historyKey, history.slice(0, 100));

            return res.json({
                success: true,
                message: 'Timeout applied successfully.',
                memberId: member.id,
                timeoutUntil:
                    member.communicationDisabledUntil?.toISOString() || null,
            });
        } catch (error) {
            console.error('[Timeout give]', error);

            return res.status(500).json({
                error: error.message || 'Failed to give timeout.',
            });
        }
    });

    // Remove timeout
    router.post('/timeouts/remove', async (req, res) => {
        const { guildID, memberId, reason } = req.body;

        if (!guildID || !memberId) {
            return res.status(400).json({
                error: 'guildID and memberId are required.',
            });
        }

        try {
            if (!client.isReady()) {
                return res.status(503).json({
                    error: 'Discord client is not ready.',
                });
            }

            const guild = await client.guilds.fetch(guildID);
            const botMember = await guild.members.fetchMe();

            if (
                !botMember.permissions.has(PermissionFlagsBits.ModerateMembers)
            ) {
                return res.status(403).json({
                    error: 'The bot needs the Moderate Members permission.',
                });
            }

            const member = await guild.members.fetch(memberId);

            if (!member.moderatable) {
                return res.status(403).json({
                    error: 'The bot cannot modify this member. Check role hierarchy and permissions.',
                });
            }

            if (!member.communicationDisabledUntilTimestamp) {
                return res.status(400).json({
                    error: 'This member does not currently have a timeout.',
                });
            }

            const timeoutReason = String(
                reason || 'Timeout removed from dashboard'
            ).slice(0, 500);

            await member.timeout(null, timeoutReason);

            const historyKey = `timeoutHistory_${guildID}`;
            const history = (await db.get(historyKey)) || [];

            history.unshift({
                memberId: member.id,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.displayAvatarURL({
                    extension: 'png',
                    size: 128,
                }),
                action: 'removed',
                moderator: req.body.moderatorId
                    ? `Unknown (<@${req.body.moderatorId}>)`
                    : 'Dashboard',
                reason: timeoutReason,
                timestamp: Date.now(),
            });

            await db.set(historyKey, history.slice(0, 100));

            return res.json({
                success: true,
                message: 'Timeout removed successfully.',
                memberId: member.id,
            });
        } catch (error) {
            console.error('[Timeout remove]', error);

            return res.status(500).json({
                error: error.message || 'Failed to remove timeout.',
            });
        }
    });

    router.get('/timeouts/members/:guildID', async (req, res) => {
        const { guildID } = req.params;

        try {
            if (!client.isReady()) {
                return res.status(503).json({
                    error: 'Discord client is not ready.',
                });
            }

            if (!/^\d{17,20}$/.test(guildID)) {
                return res.status(400).json({
                    error: 'Invalid Discord server ID.',
                });
            }

            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild not found.',
                });
            }

            let fetchedMembers = guild.members.cache;

            if (fetchedMembers.size < guild.memberCount) {
                try {
                    fetchedMembers = await guild.members.fetch({
                        withPresences: false,
                        time: 30000,
                    });
                } catch (error) {
                    console.error(
                        '[Timeout members] Fetch failed; using cache:',
                        error.message
                    );

                    fetchedMembers = guild.members.cache;
                }
            }

            const members = fetchedMembers
                .filter((member) => !member.user.bot)
                .map((member) => ({
                    id: member.id,
                    username: member.user.username,
                    tag: member.user.tag,
                    displayName: member.displayName,
                    avatar: member.user.displayAvatarURL({
                        extension: 'png',
                        size: 128,
                    }),
                    timeoutUntil:
                        member.communicationDisabledUntil?.toISOString() ||
                        null,
                }))
                .sort((a, b) => a.displayName.localeCompare(b.displayName));

            return res.json(members);
        } catch (error) {
            console.error('[Timeout members] Failed:', error);

            if (!res.headersSent) {
                return res.status(504).json({
                    error: 'Could not fetch guild members.',
                    details: error.message,
                });
            }
        }
    });

    // Get timeout history
    router.get('/timeouts/history/:guildID', async (req, res) => {
        try {
            if (!client.isReady()) {
                return res.status(503).json({
                    error: 'Discord client is not ready.',
                });
            }

            const { guildID } = req.params;

            if (!/^\d{17,20}$/.test(guildID)) {
                return res.status(400).json({
                    error: 'Invalid Discord server ID.',
                });
            }

            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild not found.',
                });
            }

            const history = (await db.get(`timeoutHistory_${guildID}`)) || [];

            return res.json(
                history
                    .filter((entry) => entry && typeof entry === 'object')
                    .slice(0, 100)
            );
        } catch (error) {
            console.error('[Timeout history]', error);

            return res.status(500).json({
                error: 'Could not fetch timeout history.',
            });
        }
    });

    // Clear timeout history
    router.delete('/timeouts/history/:guildID', async (req, res) => {
        try {
            if (!client.isReady()) {
                return res.status(503).json({
                    error: 'Discord client is not ready.',
                });
            }

            const { guildID } = req.params;

            if (!/^\d{17,20}$/.test(guildID)) {
                return res.status(400).json({
                    error: 'Invalid Discord server ID.',
                });
            }

            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild not found.',
                });
            }

            await db.delete(`timeoutHistory_${guildID}`);

            return res.json({
                success: true,
                message: 'Timeout history cleared successfully.',
            });
        } catch (error) {
            console.error('[Clear timeout history]', error);

            return res.status(500).json({
                error: 'Could not clear timeout history.',
            });
        }
    });

    return router;
}

module.exports = createTimeoutsRouter;
