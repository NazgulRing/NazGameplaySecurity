require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { QuickDB } = require("quick.db");
const {
  Client,
  IntentsBitField,
  Collection,
  EmbedBuilder,
  Events,
  ChannelType,
} = require("discord.js");

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

// ---------- Express Setup ----------
const app = express();
app.use(express.json());


// Settings Router
const settingsRouter = require("../server/routes/settings")(client);
app.use("/settings", settingsRouter);

// Endpoint: Hent alle guilds botten er i
app.get("/guilds", (req, res) => {
  if (!client || !client.isReady()) {
    return res.status(500).json({ error: "Discord-klienten er ikke klar" });
  }
  const guilds = client.guilds.cache.map((g) => ({ id: g.id, name: g.name }));
  res.json(guilds);
});



// ---------- Kommando-registrering ----------
const updateCommands = require("./register-commands");

client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      command.filePath = filePath;
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[ADVARSEL] Kommando på ${filePath} mangler "data" eller "execute".`);
    }
  }
}

// ---------- Event-registrering ----------
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ---------- InteractionCreate: logg kommando-bruk ----------
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
    console.warn(`⚠️ Loggkanal ikke funnet eller ikke en tekstkanal i ${guild.id}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle(":warning: Chat Command Used")
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .addFields(
      { name: "Server", value: guild.name, inline: true },
      { name: "Command", value: `/${commandName}`, inline: true },
      { name: "Bruker", value: `${user.tag} (${user.id})`, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: "Chat Command Executed" });

  await logChannel.send({ embeds: [embed] });
});

// ---------- GuildMemberAdd: welcome & autorole ----------
client.on(Events.GuildMemberAdd, async (member) => {
  const guild = member.guild;

  // Welcome message
  const welcomeChannelID = await db.get(`setWelcomeChannel_${guild.id}`);
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
  }

  // Auto role
  const roleID = await db.get(`autorole_${guild.id}`);
  const role = guild.roles.cache.get(roleID);
  if (role) {
    try {
      await member.roles.add(role);
    } catch (err) {
      console.error(`Kunne ikke tildele rolle: ${err.message}`);
    }
  }
});

// ---------- Keep Alive og Oppstart ----------
const keepAlive = require("../server/routes/server");

client.once("ready", async () => {
  console.log("🤖 Bot er online!");

  try {
    await updateCommands(client);
    console.log("✅ Kommandoer oppdatert!");
  } catch (error) {
    console.error("❌ Feil ved oppdatering av kommandoer:", error);
  }

  // Jevnlig syncing av kommandoer
  setInterval(async () => {
    try {
      console.log("🔄 Synkroniserer kommandoer...");
      await updateCommands(client);
    } catch (error) {
      console.error("❌ Feil ved synkronisering:", error);
    }
  }, 30 * 60 * 1000); // hver 30. minutt

  keepAlive(client, app);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`✅ Express-server kjører på port ${PORT}`));
  
});

// ---------- Start Discord-bot ----------
client.login(process.env.token);
module.exports = client;
