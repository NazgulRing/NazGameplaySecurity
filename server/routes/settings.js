const express = require("express");
const { ChannelType } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

function createSettingsRouter(client) {
  const router = express.Router();

  // Hent alle innstillinger for en guild
router.get('/settings/:guildID', async (req, res) => {
  const guildID = req.params.guildID;

  try {
    // Hent innstillinger fra DB (quick.db)
    const eventChannel = await db.get(`setEventChannel_${guildID}`);
    const welcomeChannel = await db.get(`setWelcomeChannel_${guildID}`);
    const autoRole = await db.get(`autorole_${guildID}`);

    res.json({
      eventChannelID: eventChannel || null,
      welcomeChannelID: welcomeChannel || null,
      autoroleID: autoRole || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente innstillinger', details: err.message });
  }
});


  // Get event channel
  router.get('/eventchannel/:guildID', async (req, res) => {
    const channelID = await db.get(`setEventChannel_${req.params.guildID}`);
    if (!channelID) return res.status(404).json({ error: "Event channel not set" });
    res.json({ channelID });
  });

  // Set event channel
  router.post('/eventchannel', async (req, res) => {
    const { guildID, channelID } = req.body;
    if (!guildID || !channelID) return res.status(400).json({ error: "guildID and channelID required" });
    await db.set(`setEventChannel_${guildID}`, channelID);
    res.json({ success: true });
  });

  // Get autorole
  router.get('/autorole/:guildID', async (req, res) => {
    const roleID = await db.get(`autorole_${req.params.guildID}`);
    if (!roleID) return res.status(404).json({ error: "Auto role not set" });
    res.json({ roleID });
  });

  // Set autorole
  router.post('/autorole', async (req, res) => {
    const { guildID, roleID } = req.body;
    if (!guildID || !roleID) return res.status(400).json({ error: "guildID and roleID required" });
    await db.set(`autorole_${guildID}`, roleID);
    res.json({ success: true });
  });

  // Get welcome channel
  router.get('/welcomechannel/:guildID', async (req, res) => {
    const channelID = await db.get(`setWelcomeChannel_${req.params.guildID}`);
    if (!channelID) return res.status(404).json({ error: "Welcome channel not set" });
    res.json({ channelID });
  });

  // Set welcome channel
  router.post('/welcomechannel', async (req, res) => {
    const { guildID, channelID } = req.body;
    if (!guildID || !channelID) return res.status(400).json({ error: "guildID and channelID required" });
    await db.set(`setWelcomeChannel_${guildID}`, channelID);
    res.json({ success: true });
  });

  // ✅ Get all members in a guild
  router.get('/members/:guildID', async (req, res) => {
    const { guildID } = req.params;
    const guild = client.guilds.cache.get(guildID);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      await guild.members.fetch({ withPresences: false });
      const members = guild.members.cache.map(m => ({
        id: m.id,
        username: m.user.username,
        tag: m.user.tag,
        avatar: m.user.displayAvatarURL({ size: 64, extension: "png" })
      }));
      res.json(members);
    } catch (err) {
      res.status(500).json({ error: "Kunne ikke hente medlemmer", details: err.message });
    }
  });

  // ✅ Check timeout status for a member
  router.get('/timeout/:guildID/:userID', async (req, res) => {
    const { guildID, userID } = req.params;

    const guild = client.guilds.cache.get(guildID);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const member = await guild.members.fetch(userID);
      if (!member) return res.status(404).json({ error: "Member not found" });

      const timeoutUntil = member.communicationDisabledUntil;
      const now = new Date();

      if (timeoutUntil && timeoutUntil > now) {
        res.json({
          timeout: true,
          timeoutUntil: timeoutUntil.toISOString(),
          remainingMs: timeoutUntil - now
        });
      } else {
        res.json({ timeout: false });
      }
    } catch (err) {
      res.status(500).json({ error: "Feil ved henting av timeout-status", details: err.message });
    }
  });

  return router;
}

module.exports = createSettingsRouter;
