require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { QuickDB } = require('quick.db');
const {
    Client,
    IntentsBitField,
    Collection,
    EmbedBuilder,
    Events,
    ChannelType,
} = require('discord.js');
const startTwitchService = require('./twitch/service.js');

const db = new QuickDB();
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
});

process.on('uncaughtException', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(
            'Port 3001 er allerede i bruk. Stopp gammel npm start/node-prosess for DiscordBot for du starter pa nytt.'
        );
        return;
    }

    console.error(error);
    process.exit(1);
});

// ---------- Express Setup ----------
const app = express();
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
app.use(express.json());

// Settings Router
const settingsRouter = require('../server/routes/settings')(client);
app.use('/api', settingsRouter);

// Endpoint: Hent alle guilds botten er i
app.get('/api/guilds', (req, res) => {
    if (!client || !client.isReady()) {
        return res.status(500).json({ error: 'Discord-klienten er ikke klar' });
    }
    const guilds = client.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        icon: g.iconURL({ size: 256, format: 'png' }) || null,
    }));
    res.json(guilds);
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
                `[ADVARSEL] Kommando på ${filePath} mangler "data" eller "execute".`
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

    const { user, guild, commandName } = interaction;
    const logChannelID = await db.get(`setLogChat_${guild.id}`);

    if (!logChannelID) {
        console.warn(`⚠️ Loggkanal ikke satt for guild ${guild.id}`);
        return;
    }

    const logChannel = guild.channels.cache.get(logChannelID);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) {
        console.warn(
            `⚠️ Loggkanal ikke funnet eller ikke en tekstkanal i ${guild.id}`
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
            { name: 'Bruker', value: `${user.tag} (${user.id})`, inline: false }
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
                    name: 'Velkommen!',
                    value: `${member} har blitt med i serveren.`,
                },
                {
                    name: 'Totalt medlemmer',
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
                `[autorole] Kunne ikke tildele ${role.name} til ${member.user.tag}: ${err.message}`
            );
        }
    }
});

// ---------- Keep Alive og Oppstart ----------
const keepAlive = require('../server/server');

client.once('ready', async () => {
    console.log('🤖 Bot er online!');
    startTwitchService(client);

    try {
        await updateCommands(client);
        console.log('✅ Kommandoer oppdatert!');
    } catch (error) {
        console.error('❌ Feil ved oppdatering av kommandoer:', error);
    }

    // Jevnlig syncing av kommandoer
    setInterval(
        async () => {
            try {
                console.log('🔄 Synkroniserer kommandoer...');
                await updateCommands(client);
            } catch (error) {
                console.error('❌ Feil ved synkronisering:', error);
            }
        },
        30 * 60 * 1000
    ); // hver 30. minutt

    keepAlive(client, app);
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () =>
        console.log(`✅ Express-server kjører på port ${PORT}`)
    );
});

// ---------- Start Discord-bot ----------
client.login(process.env.TOKEN);
module.exports = client;
