const express = require('express');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const {
    generateWelcomeCard,
} = require('../../client/src/components/welcome/GenerateWelcomeCard.js');
const {
    ChannelType,
    EmbedBuilder,
    AuditLogEvent,
    PermissionFlagsBits,
} = require('discord.js');
const guildMemberAdd = require('../../bot/events/guildMemberAdd.js');
const { getUser } = require('../../bot/twitch/api.js');
const { channel } = require('node:diagnostics_channel');

const roleMemberCountCache = new Map();
const roleMemberRefreshInFlight = new Map();

const ROLE_MEMBER_REFRESH_INTERVAL = 15 * 60 * 1000;

const roleMemberRetryAfter = new Map();

const ROLE_MEMBER_RETRY_MARGIN = 5000;

async function refreshRoleMemberCounts(guild) {
    const guildID = guild.id;
    const cached = roleMemberCountCache.get(guildID);
    const now = Date.now();

    if (cached && now - cached.updatedAt < ROLE_MEMBER_REFRESH_INTERVAL) {
        return cached;
    }

    // Ikke prøv igjen før Discords ventetid er over.
    const retryAt = roleMemberRetryAfter.get(guildID) || 0;

    if (now < retryAt) {
        return (
            cached || {
                counts: null,
                updatedAt: null,
            }
        );
    }

    // Bare én oppdatering per server om gangen.
    const existingRefresh = roleMemberRefreshInFlight.get(guildID);

    if (existingRefresh) {
        return existingRefresh;
    }

    const refreshPromise = (async () => {
        try {
            console.log(
                `[ROLE MEMBER COUNTS] Starting full member fetch for ${guild.name}`
            );
            await guild.members.fetch();

            const counts = {};

            for (const role of guild.roles.cache.values()) {
                counts[role.id] = 0;
            }

            for (const member of guild.members.cache.values()) {
                for (const roleID of member.roles.cache.keys()) {
                    if (counts[roleID] !== undefined) {
                        counts[roleID]++;
                    }
                }
            }

            const result = {
                counts,
                updatedAt: Date.now(),
            };

            roleMemberCountCache.set(guildID, result);
            roleMemberRetryAfter.delete(guildID);

            console.log(`[ROLE MEMBER COUNTS] Updated ${guild.name}`);

            return result;
        } catch (err) {
            const match = String(err.message).match(
                /Retry after\s+([\d.]+)\s+seconds/i
            );

            if (match) {
                const retryMs =
                    Number(match[1]) * 1000 + ROLE_MEMBER_RETRY_MARGIN;

                roleMemberRetryAfter.set(guildID, Date.now() + retryMs);

                console.warn(
                    `[ROLE MEMBER COUNTS] Rate limited for ${guild.name}. ` +
                        `Retrying after approximately ${Math.ceil(retryMs / 1000)} seconds.`
                );
            } else {
                console.error(
                    `[ROLE MEMBER COUNTS] Could not update ${guild.name}:`,
                    err.message
                );
            }

            // Behold siste vellykkede tall.
            return (
                cached || {
                    counts: null,
                    updatedAt: null,
                }
            );
        } finally {
            roleMemberRefreshInFlight.delete(guildID);
        }
    })();

    roleMemberRefreshInFlight.set(guildID, refreshPromise);

    return refreshPromise;
}

function createSettingsRouter(client) {
    const CONTROL_PANEL_LOG_LIMIT = 1000;

    async function recordControlPanelLog({
        guildID,
        userID = null,
        username = 'Unknown user',
        category = 'SETTINGS',
        action,
        details = '',
        status = 'success',
    }) {
        if (!guildID || !action) {
            return;
        }

        const key = `controlPanelLogs_${guildID}`;
        const logs = (await db.get(key)) || [];

        const entry = {
            id: require('node:crypto').randomUUID(),
            timestamp: new Date().toISOString(),
            guildID,
            userID,
            username,
            category,
            action,
            details,
            status,
        };

        logs.unshift(entry);

        await db.set(key, logs.slice(0, CONTROL_PANEL_LOG_LIMIT));

        return entry;
    }

    const router = express.Router();
    // Command settings
    const MANAGED_COMMANDS = [
        'autorole',
        'ban',
        'botrole',
        'clearchat',
        'clearwarnings',
        'kick',
        'sendmessage',
        'seteventchannel',
        'setlogchannel',
        'setwelcomechannel',
        'timeout',
        'unban',
        'untimeout',
        'warn',
        'warnings',
        'embedbuilder',
        'membercount',
        'ping',
        'reload',
        'riddle',
        'server',
        'user',
    ];

    // Get command settings for a guild
    router.get('/command-settings/:guildID', async (req, res) => {
        try {
            const { guildID } = req.params;
            const savedSettings =
                (await db.get(`commandSettings_${guildID}`)) || {};

            const settings = {};

            for (const commandName of MANAGED_COMMANDS) {
                // Existing commands remain enabled by default.
                settings[commandName] = savedSettings[commandName] ?? true;
            }

            return res.json({ settings });
        } catch (error) {
            console.error('Error loading command settings:', error);

            return res.status(500).json({
                error: 'Could not load command settings.',
            });
        }
    });

    // Update one command setting
    router.patch('/command-settings/:guildID', async (req, res) => {
        try {
            const { guildID } = req.params;
            const { commandName, enabled } = req.body;

            if (!MANAGED_COMMANDS.includes(commandName)) {
                return res.status(400).json({
                    error: 'Unknown or unsupported command.',
                });
            }

            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    error: 'enabled must be a boolean.',
                });
            }

            const key = `commandSettings_${guildID}`;
            const settings = (await db.get(key)) || {};

            settings[commandName] = enabled;

            await db.set(key, settings);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'MODERATION',
                action: enabled ? 'Enabled command' : 'Disabled command',
                details: `Command: /${commandName}`,
                status: 'success',
            });

            return res.json({
                success: true,
                commandName,
                enabled,
            });
        } catch (error) {
            console.error('Error updating command settings:', error);

            return res.status(500).json({
                error: 'Could not update command settings.',
            });
        }
    });
    // Require a valid Discord login for all settings routes.
    router.use((req, res, next) => {
        if (!req.session?.user?.id) {
            return res.status(401).json({
                error: 'You must log in with Discord.',
            });
        }

        next();
    });

    // Verify that the logged-in user can manage the requested guild.
    router.use(async (req, res, next) => {
        const guildID =
            req.params.guildID || req.body?.guildID || req.query.guildID;

        // Routes without a guild target still require login.
        if (!guildID) {
            return next();
        }

        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Server not found.',
            });
        }

        try {
            const member = await guild.members.fetch(req.session.user.id);

            const canManageGuild =
                member.permissions.has(PermissionFlagsBits.Administrator) ||
                member.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!canManageGuild) {
                return res.status(403).json({
                    error: 'You do not have permission to manage this server.',
                });
            }

            req.authorizedGuild = guild;
            next();
        } catch (error) {
            // Fail closed: an unsuccessful verification never grants access.
            if (error.code === 10007 || error.code === 10013) {
                return res.status(403).json({
                    error: 'You must be a member of this server.',
                });
            }

            console.error('[GUILD ACCESS CHECK ERROR]:', error.message);

            return res.status(503).json({
                error: 'Could not verify your server permissions. Please try again.',
            });
        }
    });

    // Hent alle innstillinger for en guild
    router.get('/settings/:guildID', async (req, res) => {
        const guildID = req.params.guildID;

        try {
            // Hent innstillinger fra DB (quick.db)
            const eventChannel = await db.get(`setEventChannel_${guildID}`);
            const welcomeChannel = await db.get(`setWelcomeChannel_${guildID}`);
            const logChannel = await db.get(`setLogChat_${guildID}`);
            const messageLogChannel = await db.get(
                `messageLogChannel_${guildID}`
            );
            const autoRole = await db.get(`autorole_${guildID}`);
            const botRole = await db.get(`botrole_${guildID}`);

            res.json({
                eventChannelID: eventChannel || null,
                welcomeChannelID: welcomeChannel || null,
                logChannelID: logChannel || null,
                autoroleID: autoRole || null,
                botroleID: botRole || null,
                messageLogChannelID: messageLogChannel || null,
            });
        } catch (err) {
            res.status(500).json({
                error: 'Kunne ikke hente innstillinger',
                details: err.message,
            });
            console.error(err);
        }
    });

    // Get event channel
    router.get('/eventchannel/:guildID', async (req, res) => {
        const channelID = await db.get(`setEventChannel_${req.params.guildID}`);
        if (!channelID)
            return res.status(404).json({ error: 'Event channel not set' });
        res.json({ channelID });
    });

    // Set event channel

    router.post('/eventchannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        }

        try {
            await db.set(`setEventChannel_${guildID}`, channelID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated event channel',
                details: `Channel ID: ${channelID}`,
                status: 'success',
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating event channel:', err);

            res.status(500).json({
                error: 'Could not update event channel',
            });
        }
    });

    // Get log channel
    router.get('/logchannel/:guildID', async (req, res) => {
        const channelID = await db.get(`setLogChat_${req.params.guildID}`);
        if (!channelID)
            return res.status(404).json({ error: 'Log channel not set' });
        res.json({ channelID });
    });

    // Get message log channel
    // Get message log channel
    router.get('/messagelogchannel/:guildID', async (req, res) => {
        const channelID = await db.get(
            `messageLogChannel_${req.params.guildID}`
        );

        if (!channelID) {
            return res.status(404).json({
                error: 'Message log channel not set',
            });
        }

        res.json({ channelID });
    });

    // Set message log channel

    // Set message log channel
    router.post('/messagelogchannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res.status(400).json({
                error: 'guildID and channelID required',
            });
        }

        try {
            await db.set(`messageLogChannel_${guildID}`, channelID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated log channel',
                details: `Channel ID: ${channelID}`,
                status: 'success',
            });

            res.json({
                success: true,
            });
        } catch (err) {
            console.error('Error updating message log channel:', err);

            res.status(500).json({
                error: 'Could not update message log channel',
            });
        }
    });

    // Set log channel

    router.post('/logchannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        }

        try {
            await db.set(`setLogChat_${guildID}`, channelID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated log channel',
                details: `Channel ID: ${channelID}`,
                status: 'success',
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating log channel:', err);

            res.status(500).json({
                error: 'Could not update log channel',
            });
        }
    });

    // Get server information
    router.get('/server-info/:guildID', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Server not found.',
            });
        }

        try {
            const [owner, , , emojis, stickers] = await Promise.all([
                guild.fetchOwner(),
                guild.roles.fetch(),
                guild.channels.fetch(),
                guild.emojis.fetch(),
                guild.stickers.fetch(),
            ]);

            const channels = [...guild.channels.cache.values()];

            const channelData = channels
                .filter((channel) => channel.id !== guild.id)
                .map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    position: channel.position,
                    parentId: channel.parentId ?? null,
                    parentName: channel.parent?.name ?? null,
                    isCategory: channel.type === ChannelType.GuildCategory,
                    isTextChannel: channel.type === ChannelType.GuildText,
                    isVoiceChannel: channel.type === ChannelType.GuildVoice,
                }))
                .sort((a, b) => a.position - b.position);

            const categories = channelData
                .filter((channel) => channel.isCategory)
                .map((category) => ({
                    ...category,
                    channels: channelData.filter(
                        (channel) => channel.parentId === category.id
                    ),
                }));

            const uncategorizedChannels = channelData.filter(
                (channel) => !channel.isCategory && channel.parentId === null
            );

            const customEmojis = [...emojis.values()].map((emoji) => ({
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                url: emoji.imageURL({ size: 64 }),
                available: emoji.available,
                managed: emoji.managed,
            }));

            const serverStickers = [...stickers.values()].map((sticker) => ({
                id: sticker.id,
                name: sticker.name,
                description: sticker.description ?? null,
                tags: sticker.tags,
                format: sticker.format,
                url: sticker.url,
            }));

            res.json({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ size: 256 }),
                description: guild.description ?? null,
                createdAt: guild.createdAt.toISOString(),

                owner: {
                    id: owner.id,
                    username: owner.user.username,
                    tag: owner.user.tag,
                    avatar: owner.user.displayAvatarURL({ size: 128 }),
                },

                memberCount: guild.memberCount,
                roleCount: guild.roles.cache.filter(
                    (role) => role.id !== guild.id
                ).size,

                textChannelCount: channels.filter(
                    (channel) => channel.type === ChannelType.GuildText
                ).length,

                voiceChannelCount: channels.filter(
                    (channel) => channel.type === ChannelType.GuildVoice
                ).length,

                categoryCount: channels.filter(
                    (channel) => channel.type === ChannelType.GuildCategory
                ).length,

                emojiCount: customEmojis.length,
                stickerCount: serverStickers.length,
                emojis: customEmojis,
                stickers: serverStickers,

                verificationLevel: guild.verificationLevel,
                explicitContentFilter: guild.explicitContentFilter,
                defaultMessageNotifications: guild.defaultMessageNotifications,
                features: guild.features,
                premiumTier: guild.premiumTier,
                premiumSubscriptionCount: guild.premiumSubscriptionCount ?? 0,

                channelData,
                categories,
                uncategorizedChannels,
            });
        } catch (err) {
            console.error('[SERVER INFO ROUTE ERROR]:', err);

            return res.status(500).json({
                error: 'Failed to load server information.',
                details: err.message,
            });
        }
    });

    // Get assignable roles for a guild

    router.get('/roles/:guildID', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
            });
        }

        try {
            await guild.roles.fetch();

            const memberCountData = await refreshRoleMemberCounts(guild);

            const roles = guild.roles.cache
                .filter((role) => role.id !== guild.id && !role.managed)
                .sort((a, b) => b.position - a.position)
                .map((role) => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    editable: role.editable,
                    memberCount: memberCountData.counts?.[role.id] ?? null,
                }));

            return res.json(roles);
        } catch (err) {
            console.error('[ROLES ROUTE ERROR]:', {
                message: err.message,
                code: err.code,
                stack: err.stack,
            });

            return res.status(500).json({
                error: 'Kunne ikke hente roller',
                details: err.message,
            });
        }
    });

    router.get('/roles/:guildID/:roleID/members', async (req, res) => {
        const { guildID, roleID } = req.params;
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
            });
        }

        try {
            const role = await guild.roles.fetch(roleID);

            if (!role || role.guild.id !== guild.id) {
                return res.status(404).json({
                    error: 'Role not found',
                });
            }

            // Bruk den eksisterende medlemscachen.
            // Ikke start en full member-fetch for hvert klikk.
            const members = guild.members.cache
                .filter((member) => member.roles.cache.has(roleID))
                .map((member) => ({
                    id: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    avatar: member.user.displayAvatarURL({
                        size: 64,
                    }),
                }));

            return res.json({
                role: {
                    id: role.id,
                    name: role.name,
                },
                members,
                count: members.length,
            });
        } catch (err) {
            console.error('[ROLE MEMBERS ROUTE ERROR]:', {
                message: err.message,
                code: err.code,
                stack: err.stack,
            });

            return res.status(500).json({
                error: 'Kunne ikke hente medlemmer for rollen',
                details: err.message,
            });
        }
    });

    // Get text channels for a guild
    router.get('/channels/:guildID', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        try {
            await guild.channels.fetch();
            const channels = guild.channels.cache
                .filter(
                    (channel) =>
                        channel && channel.type === ChannelType.GuildText
                )
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                }));

            res.json(channels);
        } catch (err) {
            res.status(500).json({
                error: 'Kunne ikke hente kanaler',
                details: err.message,
            });
            console.error(err);
        }
    });

    // Get autorole
    router.get('/autorole/:guildID', async (req, res) => {
        const roleID = await db.get(`autorole_${req.params.guildID}`);
        if (!roleID)
            return res.status(404).json({ error: 'Auto role not set' });
        res.json({ roleID });
    });

    // Set autorole

    router.post('/autorole', async (req, res) => {
        const { guildID, roleID } = req.body;

        if (!guildID || !roleID) {
            return res
                .status(400)
                .json({ error: 'guildID and roleID required' });
        }

        try {
            await db.set(`autorole_${guildID}`, roleID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated autorole',
                details: `Role ID: ${roleID}`,
                status: 'success',
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating autorole:', err);

            res.status(500).json({
                error: 'Could not update autorole',
            });
        }
    });

    // Get bot role
    router.get('/botrole/:guildID', async (req, res) => {
        const roleID = await db.get(`botrole_${req.params.guildID}`);
        if (!roleID) return res.status(404).json({ error: 'Bot role not set' });
        res.json({ roleID });
    });

    // Set bot role

    router.post('/botrole', async (req, res) => {
        const { guildID, roleID } = req.body;

        if (!guildID || !roleID) {
            return res
                .status(400)
                .json({ error: 'guildID and roleID required' });
        }

        try {
            await db.set(`botrole_${guildID}`, roleID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated bot role',
                details: `Role ID: ${roleID}`,
                status: 'success',
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating bot role:', err);

            res.status(500).json({
                error: 'Could not update bot role',
            });
        }
    });

    // Get welcome channel
    router.get('/welcomechannel/:guildID', async (req, res) => {
        const channelID = await db.get(
            `setWelcomeChannel_${req.params.guildID}`
        );
        if (!channelID)
            return res.status(404).json({ error: 'Welcome channel not set' });
        res.json({ channelID });
    });

    // Set welcome channel

    // Set welcome channel
    router.post('/welcomechannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        }

        try {
            await db.set(`setWelcomeChannel_${guildID}`, channelID);

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER SETTINGS',
                action: 'Updated welcome channel',
                details: `Channel ID: ${channelID}`,
                status: 'success',
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating welcome channel:', err);

            res.status(500).json({
                error: 'Could not update welcome channel',
            });
        }
    });

    // ✅ Get all members in a guild
    router.get('/members/:guildID', async (req, res) => {
        const { guildID } = req.params;

        const page = Number(req.query.page || 1);
        const limit = 5;

        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
            });
        }

        try {
            const allMembers = [...guild.members.cache.values()];

            const start = (page - 1) * limit;
            const end = start + limit;

            const members = allMembers.slice(start, end).map((m) => ({
                id: m.id,
                username: m.user.username,
                tag: m.user.tag,
                avatar: m.user.displayAvatarURL({
                    size: 64,
                    extension: 'png',
                }),
            }));

            res.json({
                members,
                total: allMembers.length,
                page,
                totalPages: Math.ceil(allMembers.length / limit),
            });
        } catch (err) {
            console.error('MEMBERS ROUTE ERROR:', err);

            res.status(500).json({
                error: 'Kunne ikke hente medlemmer',
                details: err.message,
            });
        }
    });

    // ✅ Check timeout status for a member

    router.get('/warnings/:guildID', async (req, res) => {
        const { guildID } = req.params;
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        try {
            const warningRows = [];

            for (const member of guild.members.cache.values()) {
                const legacyCount =
                    (await db.get(`warns_<@${member.id}>`)) || 0;

                let details =
                    (await db.get(`warnDetails_${guildID}_${member.id}`)) || [];

                if (details.length > 0) {
                    let changed = false;

                    details = details.map((warning) => {
                        if (!warning.id) {
                            changed = true;

                            return {
                                ...warning,
                                id: require('node:crypto').randomUUID(),
                            };
                        }

                        return warning;
                    });

                    if (changed) {
                        await db.set(
                            `warnDetails_${guildID}_${member.id}`,
                            details
                        );
                    }
                }

                const count = Math.max(legacyCount, details.length);

                if (count > 0) {
                    warningRows.push({
                        userId: member.id,
                        username: member.user.username,
                        tag: member.user.tag,
                        avatar: member.user.displayAvatarURL({
                            size: 64,
                            extension: 'png',
                        }),
                        count,
                        warnings: details,
                        unknownReasons: Math.max(count - details.length, 0),
                    });
                }
            }

            warningRows.sort(
                (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
            );

            return res.json(warningRows);
        } catch (err) {
            console.error('[WARNINGS ROUTE ERROR]:', err);

            return res.status(500).json({
                error: 'Kunne ikke hente warnings',
                details: err.message,
            });
        }
    });

    // Remove one warning by unique ID and notify the user by DM

    // Remove one warning by unique ID and notify the user by DM
    router.delete('/warnings/:guildID/:userID/:warningId', async (req, res) => {
        const { guildID, userID, warningId } = req.params;
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const detailsKey = `warnDetails_${guildID}_${userID}`;
        const countKey = `warns_${guildID}_${userID}`;

        try {
            const warnings = (await db.get(detailsKey)) || [];

            if (!Array.isArray(warnings)) {
                return res.status(500).json({
                    error: 'Invalid warning data',
                });
            }

            const warningIndex = warnings.findIndex(
                (warning) => warning.id === warningId
            );

            if (warningIndex === -1) {
                return res.status(404).json({
                    error: 'Warning not found',
                });
            }

            const removedWarning = warnings[warningIndex];

            const updatedWarnings = warnings.filter(
                (warning) => warning.id !== warningId
            );

            await db.set(detailsKey, updatedWarnings);
            await db.set(countKey, updatedWarnings.length);

            let dmSent = false;
            let dmError = null;

            try {
                const member = await guild.members.fetch(userID);

                await member.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('Warning removed')
                            .setDescription(
                                `A warning in **${guild.name}** has been removed.`
                            )
                            .addFields({
                                name: 'Reason of original warning',
                                value:
                                    removedWarning.reason?.trim() ||
                                    'No reason provided',
                            })
                            .setTimestamp(),
                    ],
                });

                dmSent = true;
            } catch (err) {
                console.error('WARNING REMOVAL DM ERROR:', err);
                dmError = 'Warning removed, but the DM could not be sent.';
            }

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'MODERATION',
                action: 'Removed member warning',
                details: `Warning removed from user ${userID}. DM sent: ${dmSent}`,
                status: 'success',
            });

            return res.json({
                success: true,
                remainingWarnings: updatedWarnings.length,
                dmSent,
                dmError,
            });
        } catch (err) {
            console.error('REMOVE WARNING ERROR:', err);

            return res.status(500).json({
                error: 'Failed to remove warning',
            });
        }
    });

    router.get('/timeout/:guildID/:userID', async (req, res) => {
        const { guildID, userID } = req.params;

        const guild = client.guilds.cache.get(guildID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        try {
            const member = await guild.members.fetch(userID);
            if (!member)
                return res.status(404).json({ error: 'Member not found' });

            const timeoutUntil = member.communicationDisabledUntil;
            const now = new Date();

            if (timeoutUntil && timeoutUntil > now) {
                res.json({
                    timeout: true,
                    timeoutUntil: timeoutUntil.toISOString(),
                    remainingMs: timeoutUntil - now,
                });
            } else {
                res.json({ timeout: false });
            }
        } catch (err) {
            res.status(500).json({
                error: 'Feil ved henting av timeout-status',
                details: err.message,
            });
            console.error(err);
        }
    });

    router.post('/log-animation', async (req, res) => {
        res.json({ success: true });
    });

    router.get('/twitch/:guildID', async (req, res) => {
        const { guildID } = req.params;

        try {
            const twitchSettings = await db.get(`twitch_${guildID}`);

            res.json(
                twitchSettings || {
                    enabled: false,
                    username: '',
                    streamers: [],
                    channelID: '',
                    message: '{streamer} is now live playing {game}',
                    mentionRoleID: '',
                }
            );
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke hente twitch settings',
            });
        }
    });

    router.post('/twitch', async (req, res) => {
        const {
            guildID,
            enabled,
            username,
            streamers,
            channelID,
            message,
            mentionRoleID,
        } = req.body;

        if (!guildID) {
            return res.status(400).json({
                error: 'guildID mangler',
            });
        }

        try {
            const updatedStreamers = await Promise.all(
                (streamers || []).map(async (streamer) => {
                    const twitchUser = await getUser(streamer.username);

                    return {
                        ...streamer,

                        avatar: twitchUser?.profile_image_url || '',
                    };
                })
            );

            await db.set(`twitch_${guildID}`, {
                enabled: enabled || false,
                username: username || '',
                streamers: updatedStreamers,
                channelID: channelID || '',
                message: message || '{streamer} is now live playing {game}',
                mentionRoleID: mentionRoleID || '',
            });

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'TWITCH',
                action: 'Updated Twitch settings',
                details: `Enabled: ${enabled || false}, Streamers: ${updatedStreamers.length}`,
                status: 'success',
            });

            res.json({
                success: true,
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke lagre twitch settings',
            });
        }
    });

    router.post('/twitch/test', async (req, res) => {
        const { guildID, settings } = req.body;

        if (!guildID) {
            return res.status(400).json({
                error: 'guildID mangler',
            });
        }

        try {
            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild ikke funnet',
                });
            }

            const channel = guild.channels.cache.get(settings.channelID);

            if (!channel) {
                return res.status(404).json({
                    error: 'Kanal ikke funnet',
                });
            }

            const fakeStream = {
                user_name: settings.username || 'shroud',

                user_login: settings.username || 'shroud',

                title: 'TEST NOTIFICATION',

                game_name: 'VALORANT',

                viewer_count: 1337,

                thumbnail_url:
                    'https://static-cdn.jtvnw.net/previews-ttv/live_user_shroud-1280x720.jpg',
            };

            const message = settings.message
                .replace(/{streamer}/g, fakeStream.user_name)
                .replace(/{title}/g, fakeStream.title)
                .replace(/{game}/g, fakeStream.game_name)
                .replace(/{url}/g, `https://twitch.tv/${fakeStream.user_login}`)
                .replace(/{viewers}/g, fakeStream.viewer_count);

            let mention = '';

            if (settings.mentionRoleID) {
                if (settings.mentionRoleID === 'everyone') {
                    mention = '@everyone';
                } else {
                    mention = `<@&${settings.mentionRoleID}>`;
                }
            }

            await channel.send({
                content: `${mention} ${message}`,
            });

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'TWITCH',
                action: 'Sent Twitch test notification',
                details: `Test notification sent to channel ${channel.id}`,
                status: 'success',
            });

            res.json({
                success: true,
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke sende test alert',
            });
        }
    });

    router.get('/welcome/:guildID', async (req, res) => {
        const { guildID } = req.params;

        try {
            const settings = await db.get(`welcomeSettings_${guildID}`);

            res.json(
                settings || {
                    enabled: false,

                    channelID: '',

                    title: 'Velkommen!',

                    message: '{user} har blitt med i serveren.',

                    color: '#57F287',

                    thumbnail: '',

                    mention: true,
                    background: '',
                }
            );
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke hente welcome settings',
            });
        }
    });

    router.post('/welcome', async (req, res) => {
        const {
            guildID,
            enabled,
            channelID,
            title,
            message,
            color,
            thumbnail,
            mention,
            background,
        } = req.body;

        if (!guildID) {
            return res.status(400).json({
                error: 'guildID mangler',
            });
        }

        try {
            await db.set(`welcomeSettings_${guildID}`, {
                enabled,
                channelID,
                title,
                message,
                color,
                thumbnail,
                mention,
                background,
            });

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'WELCOME',
                action: 'Updated welcome settings',
                details: `Enabled: ${Boolean(enabled)}, Channel: ${channelID || 'Not set'}`,
                status: 'success',
            });

            res.json({
                success: true,
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke lagre welcome settings',
            });
        }
    });

    router.post('/welcome/test', async (req, res) => {
        const { guildID, settings } = req.body;

        try {
            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild ikke funnet',
                });
            }

            const channel = guild.channels.cache.get(settings.channelID);

            if (!channel) {
                return res.status(404).json({
                    error: 'Kanal ikke funnet',
                });
            }

            const cardBuffer = await generateWelcomeCard({
                username: 'Streamercord',
                avatar: client.user.displayAvatarURL({
                    extension: 'png',
                }),
                serverName: guild.name,
                memberCount: guild.memberCount,
                background: settings.background,
            });

            const embed = new EmbedBuilder()

                .setColor(settings.color || '#57F287')

                .setImage('attachment://welcome.png')

                .setDescription(
                    settings.message

                        .replace(/{user}/g, '<@123456789>')

                        .replace(/{username}/g, 'Streamercord')

                        .replace(/{server}/g, guild.name)

                        .replace(/{membercount}/g, guild.memberCount)
                )

                .setTimestamp();

            await channel.send({
                content: settings.mention ? '@Streamercord' : undefined,
                files: [
                    {
                        attachment: cardBuffer,
                        name: 'welcome.png',
                    },
                ],
                embeds: [embed],
            });

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'WELCOME',
                action: 'Sent welcome test',
                details: `Test welcome message sent to channel ${channel.id}`,
                status: 'success',
            });

            res.json({
                success: true,
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: 'Kunne ikke sende test welcome',
            });
        }
    });

    // Get member log settings
    router.get('/logs/:guildID', async (req, res) => {
        try {
            const defaultSettings = {
                memberJoined: { enabled: false, channelID: '' },
                memberLeft: { enabled: false, channelID: '' },
                memberKicked: { enabled: false, channelID: '' },
                memberBanned: { enabled: false, channelID: '' },
                memberUnbanned: { enabled: false, channelID: '' },
                timeoutGiven: { enabled: false, channelID: '' },
                timeoutRemoved: { enabled: false, channelID: '' },
                roleGiven: { enabled: false, channelID: '' },
                roleRemoved: { enabled: false, channelID: '' },
                nicknameChanged: { enabled: false, channelID: '' },
                messageDeleted: { enabled: false, channelID: '' },
                messageEdited: { enabled: false, channelID: '' },
                memberJoinedVoice: { enabled: false, channelID: '' },
                memberLeftVoice: { enabled: false, channelID: '' },
                memberMovedVoice: { enabled: false, channelID: '' },
                memberSwitchedVoice: { enabled: false, channelID: '' },
                voiceMute: { enabled: false, channelID: '' },
                voiceDeafen: { enabled: false, channelID: '' },
                channelCreated: { enabled: false, channelID: '' },
                channelDeleted: { enabled: false, channelID: '' },
                channelUpdated: { enabled: false, channelID: '' },
                threadCreated: { enabled: false, channelID: '' },
                threadDeleted: { enabled: false, channelID: '' },
                threadUpdated: { enabled: false, channelID: '' },
                channelPermissionsUpdated: { enabled: false, channelID: '' },
                roleCreated: { enabled: false, channelID: '' },
                roleDeleted: { enabled: false, channelID: '' },
                roleUpdated: { enabled: false, channelID: '' },
                serverUpdated: { enabled: false, channelID: '' },
                moderationCommandUsed: { enabled: false, channelID: '' },
                serverInvites: { enabled: false, channelID: '' },
            };

            const savedSettings =
                (await db.get(`memberLogs_${req.params.guildID}`)) || {};

            // Preserve existing settings while adding defaults for new log types.
            const settings = {};

            for (const [key, defaults] of Object.entries(defaultSettings)) {
                settings[key] = {
                    enabled: Boolean(
                        savedSettings[key]?.enabled ?? defaults.enabled
                    ),
                    channelID:
                        savedSettings[key]?.channelID ?? defaults.channelID,
                };
            }

            res.json(settings);
        } catch (err) {
            console.error('GET MEMBER LOG SETTINGS ERROR:', err);
            res.status(500).json({
                error: 'Could not load member log settings',
            });
        }
    });

    // Save member log settings
    router.post('/logs', async (req, res) => {
        const { guildID, logSettings } = req.body;

        if (!guildID || !logSettings) {
            return res.status(400).json({
                error: 'guildID and logSettings are required',
            });
        }

        try {
            const logTypes = [
                'memberJoined',
                'memberLeft',
                'memberKicked',
                'memberBanned',
                'memberUnbanned',
                'timeoutGiven',
                'timeoutRemoved',
                'roleGiven',
                'roleRemoved',
                'nicknameChanged',
                'messageDeleted',
                'messageEdited',
                'memberJoinedVoice',
                'memberLeftVoice',
                'memberMovedVoice',
                'memberSwitchedVoice',
                'voiceMute',
                'voiceDeafen',
                'channelCreated',
                'channelDeleted',
                'channelUpdated',
                'threadCreated',
                'threadDeleted',
                'threadUpdated',
                'channelPermissionsUpdated',
                'roleCreated',
                'roleDeleted',
                'roleUpdated',
                'serverUpdated',
                'moderationCommandUsed',
                'serverInvites',
            ];

            const settings = {};

            for (const key of logTypes) {
                settings[key] = {
                    enabled: Boolean(logSettings[key]?.enabled),
                    channelID: logSettings[key]?.channelID || '',
                };
            }

            await db.set(`memberLogs_${guildID}`, settings);

            const enabledLogTypes = Object.entries(settings).filter(
                ([, config]) => config.enabled
            ).length;

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'SERVER LOGS',
                action: 'Updated server log settings',
                details: `${enabledLogTypes} of ${logTypes.length} log types enabled`,
                status: 'success',
            });

            res.json({ success: true, settings });
        } catch (err) {
            console.error('SAVE MEMBER LOG SETTINGS ERROR:', err);

            res.status(500).json({
                error: 'Could not save member log settings',
            });
        }
    });

    // Get banned members for a guild
    router.get('/bans/:guildID', async (req, res) => {
        const { guildID } = req.params;
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
            });
        }

        try {
            // Fetch the current ban list
            const banList = await guild.bans.fetch();

            // Fetch recent ban audit log entries
            let auditEntries = [];

            try {
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 100,
                });

                auditEntries = [...auditLogs.entries.values()];
            } catch (auditError) {
                console.warn(
                    'Could not fetch ban audit logs:',
                    auditError.message
                );
            }

            const bans = banList.map((ban) => {
                const user = ban.user;

                // Find the latest matching ban entry
                const auditEntry = auditEntries.find(
                    (entry) => entry.target?.id === user.id
                );

                return {
                    userId: user.id,
                    username: user.username,
                    tag: user.tag || user.username,
                    avatar: user.displayAvatarURL({
                        size: 64,
                        extension: 'png',
                    }),
                    reason:
                        auditEntry?.reason ||
                        ban.reason ||
                        'No reason provided',
                    bannedAt: auditEntry
                        ? auditEntry.createdAt.toISOString()
                        : null,
                    moderatorId: auditEntry?.executor?.id || null,
                    moderatorTag:
                        auditEntry?.executor?.tag ||
                        auditEntry?.executor?.username ||
                        null,
                };
            });

            // Show newest bans first when timestamps are available
            bans.sort((a, b) => {
                if (!a.bannedAt) return 1;
                if (!b.bannedAt) return -1;

                return (
                    new Date(b.bannedAt).getTime() -
                    new Date(a.bannedAt).getTime()
                );
            });

            res.json(bans);
        } catch (err) {
            console.error('GET BAN LIST ERROR:', err);

            res.status(500).json({
                error: 'Could not load ban list',
                details: err.message,
            });
        }
    });

    // Remove a ban from a guild

    // Remove a ban from a guild
    router.delete('/bans/:guildID/:userID', async (req, res) => {
        const { guildID, userID } = req.params;
        const guild = client.guilds.cache.get(guildID);

        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
            });
        }

        try {
            await guild.bans.remove(userID, 'Unbanned through the dashboard');

            await recordControlPanelLog({
                guildID,
                userID: req.session.user.id,
                username:
                    req.session.user.username ||
                    req.session.user.global_name ||
                    'Unknown user',
                category: 'MODERATION',
                action: 'Unbanned member',
                details: `Ban removed for user ${userID}`,
                status: 'success',
            });

            return res.json({
                success: true,
                userID,
            });
        } catch (err) {
            console.error('UNBAN USER ERROR:', err);

            return res.status(500).json({
                error: 'Could not unban user',
                details: err.message,
            });
        }
    });

    // Delete Control Panel Logs
    router.delete('/control-panel-logs/:guildID', async (req, res) => {
        try {
            const { guildID } = req.params;
            const key = `controlPanelLogs_${guildID}`;

            await db.set(key, []);

            return res.json({
                success: true,
                message: 'Control Panel Logs cleared successfully.',
            });
        } catch (error) {
            console.error('Error deleting Control Panel Logs:', error);

            return res.status(500).json({
                success: false,
                message: 'Failed to delete Control Panel Logs.',
            });
        }
    });

    // Get Control Panel Logs
    router.get('/control-panel-logs/:guildID', async (req, res) => {
        try {
            const { guildID } = req.params;

            const limit = Math.min(
                Math.max(parseInt(req.query.limit, 10) || 100, 1),
                200
            );

            const since = req.query.since ? Date.parse(req.query.since) : null;

            const logs = (await db.get(`controlPanelLogs_${guildID}`)) || [];

            const filteredLogs = logs
                .filter((log) => {
                    if (since === null) return true;

                    const timestamp = Date.parse(log.timestamp);
                    return Number.isFinite(timestamp) && timestamp > since;
                })
                .slice(0, limit);

            res.json({
                success: true,
                logs: filteredLogs,
                count: filteredLogs.length,
            });
        } catch (error) {
            console.error('Error fetching Control Panel Logs:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch Control Panel Logs.',
            });
        }
    });

    return router;
}
module.exports = createSettingsRouter;
