require('dotenv').config();

const { testRconConnection } = require('./asa/rcon');

testRconConnection()
    .then(() => {
        console.log('ASA RCON-test fullført.');
    })
    .catch((error) => {
        console.error('ASA RCON-test feilet:', error.message);
        process.exitCode = 1;
    });
