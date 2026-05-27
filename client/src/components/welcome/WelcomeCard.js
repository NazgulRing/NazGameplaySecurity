const { Welcomer } = require('canvacord');

async function generateWelcomeCard({
    username,
    avatar,
    serverName,
    memberCount,
    background,
}) {
    const card = new Welcomer()
        .setUsername(username)
        .setAvatar(avatar)
        .setGuildName(serverName)
        .setMemberCount(memberCount)
        .setBackground(background || 'https://i.imgur.com/5ZC7Xws.jpeg');

    return await card.build();
}

module.exports = {
    generateWelcomeCard,
};
