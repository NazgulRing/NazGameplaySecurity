require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { QuickDB } = require('quick.db');
const session = require('express-session');
const authRouter = require('../server/routes/auth');
const {
    Client,
    IntentsBitField,
    Collection,
    EmbedBuilder,
    Events,
    ChannelType,
} = require('discord.js');
const startTwitchService = require('./twitch/service.js');
const startAsaService = require('./asa/service.js');

const db = new QuickDB();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildModeration,
        IntentsBitField.Flags.GuildInvites,
    ],
});

process.on('uncaughtException', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(
            'Port 3001 is already in use. Stop the existing npm start/node process for DiscordBot before starting a new one.'
        );
        return;
    }

    console.error(error);
    process.exit(1);
});

// ---------- Express Setup ----------
const app = express();

app.set('trust proxy', 1);

app.use(
    cors({
        origin(origin, callback) {
            const allowedOrigins = new Set([
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3001',
                'https://nazservers.asuscomm.com',
            ]);

            // Local development only: allow requests without an Origin header.
            if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
                return callback(null, true);
            }

            console.error(`Blocked CORS origin: ${origin}`);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(
    session({
        name: 'nazservers.sid',
        secret: process.env.SESSION_SECRET,
        proxy: true,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

app.use((req, res, next) => {
    if (req.path === '/auth/discord' && req.method === 'GET') {
        res.on('finish', () => {
            console.log('[AUTH RESPONSE]', {
                status: res.statusCode,
                setCookie: Boolean(res.getHeader('set-cookie')),
                secure: req.secure,
                protocol: req.protocol,
                forwardedProto: req.get('x-forwarded-proto'),
                host: req.get('host'),
            });
        });
    }
    next();
});

app.use(express.json());

app.use('/auth', authRouter);

// Settings Router
const settingsRouter = require('../server/routes/settings')(client);

app.use('/api', settingsRouter);

// Timeouts Router
const timeoutsRouter = require('../server/routes/timeouts')(client);
app.use('/api', timeoutsRouter);

// Endpoint: Hent alle guilds botten er i

app.get('/api/guilds', async (req, res) => {
    if (!client || !client.isReady()) {
        return res.status(503).json({
            error: 'Discord client is not ready',
        });
    }

    // Krev innlogget Discord-bruker.
    if (!req.session?.user?.id) {
        return res.status(401).json({
            error: 'You must log in with Discord.',
        });
    }

    try {
        const userID = req.session.user.id;
        const accessibleGuilds = [];

        for (const guild of client.guilds.cache.values()) {
            try {
                // Hent bare den innloggede brukerens medlemskap.
                const member = await guild.members.fetch(userID);

                const canManageGuild =
                    member.permissions.has('Administrator') ||
                    member.permissions.has('ManageGuild');

                if (!canManageGuild) {
                    continue;
                }

                accessibleGuilds.push({
                    id: guild.id,
                    name: guild.name,
                    memberCount: guild.memberCount,
                    icon:
                        guild.iconURL({
                            size: 256,
                            extension: 'png',
                        }) || null,
                });
            } catch (err) {
                // Brukeren er ikke medlem, eller medlemskapet kunne
                // ikke verifiseres. Ikke vis serveren.
                if (err.code === 10007 || err.code === 10013) {
                    continue;
                }

                console.error(
                    `[GUILDS ROUTE] Could not verify ${guild.id}:`,
                    err.message
                );

                // Ikke vis serveren hvis kontrollen feiler.
                continue;
            }
        }

        return res.json(accessibleGuilds);
    } catch (err) {
        console.error('[GUILDS ROUTE ERROR]:', err);

        return res.status(500).json({
            error: 'Could not load your servers.',
        });
    }
});

// ---------- Load Commands ----------
const updateCommands = require('./register-commands');

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            command.filePath = filePath;
            client.commands.set(command.data.name, command);
        } else {
            console.warn(
                `[WARNING] Command at ${filePath} is missing "data" or "execute".`
            );
        }
    }
}

// ---------- Load Events ----------
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// ---------- InteractionCreate: log commands usage ----------
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inGuild() || !interaction.guild) return;

    const { user, guild, commandName } = interaction;
    const moderationCommands = [
        'warn',
        'clearwarns',
        'kick',
        'ban',
        'timeout',
        'untimeout',
    ];

    if (moderationCommands.includes(commandName.toLowerCase())) {
        return;
    }
    const logChannelID = await db.get(`setLogChat_${guild.id}`);

    if (!logChannelID) {
        console.warn(`⚠️ Log channel not set for guild ${guild.id}`);
        return;
    }

    const logChannel = guild.channels.cache.get(logChannelID);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) {
        console.warn(
            `⚠️ Log channel not found or not a text channel in ${guild.id}`
        );
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(':warning: Chat Command Used')
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .addFields(
            { name: 'Server', value: guild.name, inline: true },
            { name: 'Command', value: `/${commandName}`, inline: true },
            { name: 'User', value: `${user.tag} (${user.id})`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Chat Command Executed' });

    await logChannel.send({ embeds: [embed] });
});

// ---------- GuildMemberAdd: welcome & autorole ----------
client.on(Events.GuildMemberAdd, async (member) => {
    const guild = member.guild;

    // Welcome message
    /* const welcomeChannelID = await db.get(`setWelcomeChannel_${guild.id}`);
  const welcomeChannel = guild.channels.cache.get(welcomeChannelID);

  if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Velkommen!", value: `${member} har blitt med i serveren.` },
        { name: "Totalt medlemmer", value: `${guild.memberCount}` }
      )
      .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
  }*/
    // Welcome message fallback
    const welcomeSettings = await db.get(`welcomeSettings_${guild.id}`);

    const welcomeChannelID = await db.get(`setWelcomeChannel_${guild.id}`);

    const welcomeChannel = guild.channels.cache.get(welcomeChannelID);

    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
        // CUSTOM DESIGN
        if (welcomeSettings?.enabled) {
            return;
        }

        // DEFAULT DESIGN
        const embed = new EmbedBuilder()

            .setColor('Green')

            .setThumbnail(member.user.displayAvatarURL())

            .addFields(
                {
                    name: 'Welcome!',
                    value: `${member} has joined the server.`,
                },
                {
                    name: 'Total Members',
                    value: `${guild.memberCount}`,
                }
            )

            .setTimestamp();

        await welcomeChannel.send({
            embeds: [embed],
        });
    }

    // Auto role
    const isBot = member.user.bot;
    const roleID = isBot
        ? await db.get(`botrole_${guild.id}`)
        : await db.get(`autorole_${guild.id}`);
    const role = roleID
        ? await guild.roles.fetch(roleID).catch(() => null)
        : isBot
          ? guild.roles.cache.find((guildRole) =>
                guildRole.name.toLowerCase().includes('bot')
            )
          : null;

    console.log(
        `[autorole] ${member.user.tag} (${member.id}) joined ${guild.name}. isBot=${isBot}, roleID=${roleID || 'none'}, role=${role ? `${role.name} (${role.id})` : 'none'}`
    );

    if (isBot && !role) {
        console.warn(
            `[autorole] No bot role found for ${guild.name}. Set one with /botrole, or create a role with "bot" in the name.`
        );
        return;
    }

    if (role) {
        try {
            await member.roles.add(role);
            console.log(`[autorole] Added ${role.name} to ${member.user.tag}`);
        } catch (err) {
            console.error(
                `[autorole] Could not assign ${role.name} to ${member.user.tag}: ${err.message}`
            );
        }
    }
});

// ---------- Keep Alive og Oppstart ----------
const keepAlive = require('../server/server');
console.log(
    '[AUTH DEBUG] Loading auth route from:',
    require.resolve('../server/routes/auth')
);
console.log('[AUTH DEBUG] Express app created in bot/index.js');

let servicesStarted = false;

client.once('clientReady', async () => {
    console.log('🤖 Bot is online!');

    // Start Express umiddelbart når Discord er klar.
    keepAlive(client, app);

    const PORT = process.env.PORT || 3001;

    app.listen(PORT, () => {
        console.log(`✅ Express-server is running on port ${PORT}`);
    });

    // Start tjenester først etter at Discord er klar.
    if (!servicesStarted) {
        servicesStarted = true;
        startTwitchService(client);
        startAsaService(client);
    }

    // Oppdater kommandoer uten å forsinke Express-oppstarten.
    try {
        await updateCommands(client);
        console.log('✅ Commands updated!');
    } catch (error) {
        console.error('❌ Error updating commands:', error);
    }

    // Regular syncing of commands
    setInterval(
        async () => {
            try {
                await updateCommands(client);
            } catch (error) {
                console.error('❌ Error syncing commands:', error);
            }
        },
        30 * 60 * 1000
    );
});

// ---------- Start Discord-bot ----------
client.login(process.env.TOKEN);
module.exports = client;
