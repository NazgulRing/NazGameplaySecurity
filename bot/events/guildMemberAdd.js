const { QuickDB } = require('quick.db');
const db = new QuickDB();

const { EmbedBuilder } = require('discord.js');

const {
    generateWelcomeCard,
} = require('../../client/src/components/welcome/GenerateWelcomeCard.js');

module.exports = async (member) => {
    const settings = await db.get(`welcomeSettings_${member.guild.id}`);

    if (!settings?.enabled) return;

    const channel = member.guild.channels.cache.get(settings.channelID);

    if (!channel) return;

    const cardBuffer = await generateWelcomeCard({
        username: member.user.username,

        avatar: member.user.displayAvatarURL({
            extension: 'png',
        }),

        serverName: member.guild.name,

        memberCount: member.guild.memberCount,

        background: settings.background,
    });

    const embed = new EmbedBuilder()

        .setColor(settings.color || '#57F287')

        .setImage('attachment://welcome.png');

    await channel.send({
        content: settings.mention ? `<@${member.id}>` : undefined,

        embeds: [embed],

        files: [
            {
                attachment: cardBuffer,
                name: 'welcome.png',
            },
        ],
    });
};
