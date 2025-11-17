const { cli } = require("discord-builder");
const { ChannelType, EmbedBuilder } = require("discord.js");
const express  = require("express");
const path     = require("node:path");
const { QuickDB } = require("quick.db");
const { name } = require("../bot/events/ready");
const db = new QuickDB();

function keepAlive(client, app) {
  /* 1️⃣  – Statiske React‑filer  */
  app.use(express.static(path.join(__dirname, "client", "build")));

  app.get("/api/guilds", (req, res) => {
    if (!client) return res.status(500).json({ error: "Client ikke tilgjengelig" });

    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
    }));
    res.json(guilds);
  });

  /* 2️⃣  – API‑endepunkter (legg flere før catch‑all) */
  app.post("/event", async (req, res) => {
    try {
      const { guildID, title, description, date } = req.body;
      if (!guildID || !title || !description || !date) {
        return res.status(400).json({ error: "Missing required fields: guildID, title, description, date" });
      }

      const channelID = await db.get(`setEventChannel_${guildID}`);
      if (!channelID) {
        return res.status(400).json({ error: "Event channel not set for this guild." });
      }

      const guild = client.guilds.cache.get(guildID);
      if (!guild) return res.status(404).json({ error: "Guild not found" });

      const channel = guild.channels.cache.get(channelID);
      if (!channel || channel.type !== ChannelType.GuildText) {
        return res.status(400).json({ error: "Event channel not found or not a text channel" });
      }

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`New Event: ${title}`)
        .setDescription(description)
        .addFields({ name: "Dato", value: date })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling /event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  app.get("/api/commands", (req,res) =>{
    if (!client || !client.commands){
      return res.status(500).json({error: "Kommandoer ikke tilgjengelig"});
    }
    const commands = client.commands.map(cmd =>({
      name: cmd.data.name,
      description: cmd.data.description,
    }));

    res.json(commands)
  });

  /* 3️⃣  – Catch‑all: send React index.html */
  const indexPath = path.join(__dirname, "../../client/build", "index.html");
  app.get("*", (req, res) => {
    res.sendFile(indexPath, err => {
      if (err) {
        console.error("❌  Klarte ikke sende index.html:", err.message);
        res.status(500).send("Internal server error");
      }
    });
  });
}

module.exports = keepAlive;
