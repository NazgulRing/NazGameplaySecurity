const { Rcon } = require('rcon-client');

async function getServerInfo() {
    const host = process.env.ASA_RCON_HOST || '127.0.0.1';
    const port = Number(process.env.ASA_RCON_PORT || 27020);
    const password = process.env.ASA_RCON_PASSWORD;

    if (!password) {
        throw new Error('ASA_RCON_PASSWORD is missing in .env');
    }

    let rcon;

    try {
        rcon = await Rcon.connect({
            host,
            port,
            password,
            timeout: 5000,
        });

        const response = await rcon.send('ListPlayers');

        const text = String(response || '').trim();

        const players =
            text === '' || /no players connected/i.test(text)
                ? []
                : text
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter((line) => /^\d+\.\s+\S/.test(line))
                      .map((line) => line.replace(/^\d+\.\s*/, ''));

        return {
            online: true,
            players,
            playerCount: players.length,
            rawResponse: text,
        };
    } finally {
        if (rcon) {
            await Promise.race([
                rcon.end(),
                new Promise((resolve) => setTimeout(resolve, 1000)),
            ]).catch(() => {});
        }
    }
}

module.exports = { getServerInfo };
