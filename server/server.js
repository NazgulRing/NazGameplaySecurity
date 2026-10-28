const {
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const express = require('express');
const path = require('node:path');
const cors = require('cors');
const { QuickDB } = require('quick.db');
const { name } = require('../bot/events/ready');
const db = new QuickDB();
const createSettingsRouter = require('./routes/settings');
const guildMemberAdd = require('../bot/events/guildMemberAdd.js');
const { updateStatusMessage } = require('../bot/asa/statusMessage');

const {
    memberJoined,
    memberLeft,
    memberBanned,
    memberUnbanned,
    timeoutGiven,
    memberUpdated,
    messageDeleted,
    messageEdited,
    voiceStateUpdated,
    channelCreated,
    channelDeleted,
    channelUpdated,
    threadCreated,
    threadDeleted,
    threadUpdated,
    roleCreated,
    roleDeleted,
    roleUpdated,
    serverUpdated,
    serverInviteCreated,
    serverInviteDeleted,
} = require('../bot/events/memberLogs.js');

function keepAlive(client, app) {
    app.use(express.json());

    /*Allows for front to get data from port 3001*/
    app.use(
        cors({
            origin(origin, callback) {
                if (
                    !origin ||
                    /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin)
                ) {
                    return callback(null, true);
                }

                return callback(new Error('Not allowed by CORS'));
            },
        })
    );

    app.post('/asa/event', async (req, res) => {
        try {
            const { event, secret } = req.body;

            if (
                !process.env.ASA_EVENT_SECRET ||
                secret !== process.env.ASA_EVENT_SECRET
            ) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const allowedEvents = ['starting', 'stopping'];

            if (!allowedEvents.includes(event)) {
                return res.status(400).json({ error: 'Invalid event' });
            }

            await updateStatusMessage(client, {
                status: event === 'starting' ? 'starting' : 'stopping',
                playerCount: 0,
            });

            console.log(`[ASA] Received event: ${event}`);

            return res.json({ success: true });
        } catch (error) {
            console.error('[ASA] Event error:', error);

            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    /* 1️⃣  – Statiske React‑filer  */
    const authRouter = require('./routes/auth');

    console.log('[AUTH DEBUG] Registering auth router');
    app.use('/auth', authRouter);
    app.get('/auth-test', (req, res) => {
        res.json({ success: true, message: 'Correct Express app' });
    });

    app.use('/api', createSettingsRouter(client));

    client.on('guildMemberAdd', guildMemberAdd);
    client.on('guildMemberAdd', memberJoined);
    client.on('guildMemberRemove', memberLeft);
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        await timeoutGiven(oldMember, newMember);
        await memberUpdated(oldMember, newMember);
    });

    client.on('roleCreate', roleCreated);
    client.on('roleDelete', roleDeleted);
    client.on('roleUpdate', roleUpdated);

    client.on('inviteCreate', serverInviteCreated);
    client.on('inviteDelete', serverInviteDeleted);

    client.on('channelCreate', channelCreated);
    client.on('channelDelete', channelDeleted);
    client.on('channelUpdate', channelUpdated);
    client.on('guildUpdate', serverUpdated);

    client.on('threadCreate', threadCreated);
    client.on('threadDelete', threadDeleted);
    client.on('threadUpdate', threadUpdated);

    client.on('guildBanAdd', memberBanned);
    client.on('guildBanRemove', memberUnbanned);
    // Message Logs
    client.on('messageDelete', messageDeleted);

    client.on('messageUpdate', async (oldMessage, newMessage) => {
        await messageEdited(oldMessage, newMessage);
    });

    // Voice Logs
    client.on('voiceStateUpdate', async (oldState, newState) => {
        await voiceStateUpdated(oldState, newState);
    });
    /*Run the Case animasjon site */
    app.use(express.static(path.join(__dirname, 'client', 'build')));

    /* 2️⃣  – API‑endepunkter (legg flere før catch‑all) */

    app.post('/event', async (req, res) => {
        try {
            // Require Discord login.
            if (!req.session?.user?.id) {
                return res.status(401).json({
                    error: 'You must log in with Discord.',
                });
            }

            const { guildID, title, description, date } = req.body;

            if (!guildID || !title || !description || !date) {
                return res.status(400).json({
                    error: 'Missing required fields: guildID, title, description, date',
                });
            }

            const guild = client.guilds.cache.get(guildID);

            if (!guild) {
                return res.status(404).json({
                    error: 'Guild not found',
                });
            }

            // Verify the logged-in user's permissions in this guild.
            let member;

            try {
                member = await guild.members.fetch(req.session.user.id);
            } catch (error) {
                if (error.code === 10007 || error.code === 10013) {
                    return res.status(403).json({
                        error: 'You must be a member of this server.',
                    });
                }

                console.error('[EVENT] Member verification failed:', error);

                return res.status(503).json({
                    error: 'Could not verify your server permissions.',
                });
            }

            const canManageGuild =
                member.permissions.has(PermissionFlagsBits.Administrator) ||
                member.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!canManageGuild) {
                return res.status(403).json({
                    error: 'You do not have permission to manage this server.',
                });
            }

            const channelID = await db.get(`setEventChannel_${guildID}`);

            if (!channelID) {
                return res.status(400).json({
                    error: 'Event channel not set for this guild.',
                });
            }

            const channel = guild.channels.cache.get(channelID);

            if (!channel || channel.type !== ChannelType.GuildText) {
                return res.status(400).json({
                    error: 'Event channel not found or not a text channel',
                });
            }

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(`New Event: ${title}`)
                .setDescription(description)
                .addFields({ name: 'Dato', value: date })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            return res.json({ success: true });
        } catch (error) {
            console.error('Error handling /event:', error);

            return res.status(500).json({
                error: 'Internal server error',
            });
        }
    });

    app.get('/api/commands', (req, res) => {
        if (!client || !client.commands) {
            return res.status(500).json({ error: 'Commands not available' });
        }
        const commands = client.commands.map((cmd) => ({
            name: cmd.data.name,
            description: cmd.data.description,
            category: cmd.category || 'Utility',
        }));

        res.json(commands);
    });

    /* 3️⃣  – Catch‑all: send React index.html */ /*
  const indexPath = path.join(__dirname, "../../client/build", "index.html");
  app.get("*", (req, res) => {
    res.sendFile(indexPath, err => {
      if (err) {
        console.error("❌  Klarte ikke sende index.html:", err.message);
        res.status(500).send("Internal server error");
      }
    });
  });*/
}

module.exports = keepAlive;
