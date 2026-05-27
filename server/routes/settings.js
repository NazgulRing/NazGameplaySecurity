console.log('SETTINGS ROUTER FILE LOADED');
const express = require('express');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const {
    generateWelcomeCard,
} = require('../../client/src/components/welcome/GenerateWelcomeCard.js');
const { ChannelType, EmbedBuilder } = require('discord.js');
const guildMemberAdd = require('../../bot/events/guildMemberAdd.js');
const { getUser } = require('../../bot/twitch/api.js');
console.log('REGISTERING API ROUTER');
function createSettingsRouter(client) {
    const router = express.Router();

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
        if (!guildID || !channelID)
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        await db.set(`setEventChannel_${guildID}`, channelID);
        res.json({ success: true });
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
    router.post('/messagelogchannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res.status(400).json({
                error: 'guildID and channelID required',
            });
        }

        await db.set(`messageLogChannel_${guildID}`, channelID);

        res.json({
            success: true,
        });
    });

    // Set message log channel
    router.post('/messagelogchannel', async (req, res) => {
        const { guildID, channelID } = req.body;

        if (!guildID || !channelID) {
            return res.status(400).json({
                error: 'guildID and channelID required',
            });
        }

        await db.set(`messageLogChannel_${guildID}`, channelID);

        res.json({
            success: true,
        });
    });

    // Set log channel
    router.post('/logchannel', async (req, res) => {
        const { guildID, channelID } = req.body;
        if (!guildID || !channelID)
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        await db.set(`setLogChat_${guildID}`, channelID);
        res.json({ success: true });
    });

    // Get assignable roles for a guild
    router.get('/roles/:guildID', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        try {
            await guild.roles.fetch();
            const roles = guild.roles.cache
                .filter((role) => role.id !== guild.id && !role.managed)
                .sort((a, b) => b.position - a.position)
                .map((role) => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    editable: role.editable,
                }));

            res.json(roles);
        } catch (err) {
            res.status(500).json({
                error: 'Kunne ikke hente roller',
                details: err.message,
            });
            console.error(err);
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
        if (!guildID || !roleID)
            return res
                .status(400)
                .json({ error: 'guildID and roleID required' });
        await db.set(`autorole_${guildID}`, roleID);
        res.json({ success: true });
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
        if (!guildID || !roleID)
            return res
                .status(400)
                .json({ error: 'guildID and roleID required' });
        await db.set(`botrole_${guildID}`, roleID);
        res.json({ success: true });
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
    router.post('/welcomechannel', async (req, res) => {
        const { guildID, channelID } = req.body;
        if (!guildID || !channelID)
            return res
                .status(400)
                .json({ error: 'guildID and channelID required' });
        await db.set(`setWelcomeChannel_${guildID}`, channelID);
        res.json({ success: true });
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
            // fetch bare hvis cache mangler mye
            if (guild.members.cache.size < guild.memberCount * 0.8) {
                await guild.members.fetch({ time: 5000 }).catch(() => {});
            }

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
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        try {
            await guild.members.fetch({ time: 3000 }).catch(() => {});
            const warningRows = [];

            for (const member of guild.members.cache.values()) {
                const legacyCount =
                    (await db.get(`warns_<@${member.id}>`)) || 0;
                const details =
                    (await db.get(`warnDetails_${guildID}_${member.id}`)) || [];
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
            res.json(warningRows);
        } catch (err) {
            res.status(500).json({
                error: 'Kunne ikke hente warnings',
                details: err.message,
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
        console.log('✅ Animasjonsside startet!');
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

                    console.log(twitchUser);

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

            console.log('WELCOME SETTINGS:');
            console.log(settings);
            console.log('CHANNEL ID:');
            console.log(settings.channelID);
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

    console.log('REGISTERING WELCOME TEST ROUTE');

    router.post('/welcome/test', async (req, res) => {
        const { guildID, settings } = req.body;

        try {
            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild ikke funnet',
                });
            }

            console.log(settings);
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

    return router;
}

console.log('SETTINGS ROUTER LOADED');

module.exports = createSettingsRouter;
