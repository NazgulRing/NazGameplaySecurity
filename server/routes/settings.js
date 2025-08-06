const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path til config-fil per guild
const getSettingsPath = (guildId) => path.join(__dirname, '../../bot/config/', `${guildId}.json`);

// GET settings for en guild
router.get('/:id/settings', (req, res) => {
  const guildId = req.params.id;
  const filePath = getSettingsPath(guildId);

  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    res.json(JSON.parse(data));
  } else {
    // Returner tomme defaults hvis ingen config finnes
    res.json({
      autorole: null,
      welcomeChannel: null,
    });
  }
});

// POST settings for en guild (lagre nye innstillinger)
router.post('/:id/settings', express.json(), (req, res) => {
  const guildId = req.params.id;
  const filePath = getSettingsPath(guildId);
  const newSettings = req.body;

  try {
    fs.writeFileSync(filePath, JSON.stringify(newSettings, null, 2));
    res.json({ success: true, message: 'Innstillinger lagret.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Kunne ikke lagre.' });
  }
});

module.exports = router;