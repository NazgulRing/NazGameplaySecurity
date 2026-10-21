const { checkServerStatus } = require('./status');

function startAsaService(client) {
    console.log('[ASA] Starting server monitoring...');

    // Første sjekk med en gang.
    console.log('[ASA] Starting first status check...');

    checkServerStatus(client)
        .then(() => console.log('[ASA] First status check completed.'))
        .catch((error) => console.error('[ASA] Error in status check:', error));

    // Repeat each 30 seconds.
    const interval = setInterval(() => {
        checkServerStatus(client).catch(console.error);
    }, 30_000);

    return () => clearInterval(interval);
}

module.exports = startAsaService;
