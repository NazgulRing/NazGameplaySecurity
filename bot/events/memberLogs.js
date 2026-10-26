const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { QuickDB } = require('quick.db');

const db = new QuickDB();
async function saveTimeoutHistory(guildID, entry) {
    const key = `timeoutHistory_${guildID}`;
    const history = (await db.get(key)) || [];

    history.unshift({
        ...entry,
        timestamp: Date.now(),
    });

    // Behold de siste 100 hendelsene per server.
    await db.set(key, history.slice(0, 100));
}

async function sendMemberLog(member, eventType, extraFields = []) {
    try {
        const settings = await db.get(`memberLogs_${member.guild.id}`);
        const setting = settings?.[eventType];

        if (!setting?.enabled || !setting.channelID) {
            return;
        }

        const channel = await member.guild.channels
            .fetch(setting.channelID)
            .catch(() => null);

        if (!channel?.isTextBased() || !channel.isSendable()) {
            return;
        }

        const isJoin = eventType === 'memberJoined';
        const isBan = eventType === 'memberBanned';
        const isUnban = eventType === 'memberUnbanned';

        const titles = {
            memberJoined: 'Member Joined',
            memberLeft: 'Member Left',
            memberKicked: 'Member Kicked',
            memberBanned: 'Member Banned',
            memberUnbanned: 'Member Unbanned',
            timeoutGiven: 'Timeout Given',
            timeoutRemoved: 'Timeout Removed',
        };

        const colors = {
            memberJoined: 0x57f287,
            memberLeft: 0xed4245,
            memberKicked: 0xed4245,
            memberBanned: 0xed4245,
            memberUnbanned: 0x57f287,
            timeoutGiven: 0xfee75c,
            timeoutRemoved: 0x57f287,
        };

        const descriptions = {
            memberKicked: 'This member was kicked from the server.',
            timeoutGiven: 'A timeout was given to this member.',
        };

        const embed = new EmbedBuilder()
            .setColor(colors[eventType] ?? 0x5865f2)
            .setTitle(titles[eventType] ?? 'Member Log')
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .addFields(
                {
                    name: 'Member',
                    value: `${member.user.tag} (<@${member.id}>)`,
                },
                {
                    name: 'User ID',
                    value: member.id,
                },
                ...extraFields
            )
            .setTimestamp();

        if (descriptions[eventType]) {
            embed.setDescription(descriptions[eventType]);
        }

        if (isJoin) {
            embed.addFields({
                name: 'Account Created',
                value: `<t:${Math.floor(
                    member.user.createdTimestamp / 1000
                )}:R>`,
            });
        }

        if (isBan || isUnban) {
            embed.setDescription(
                isBan
                    ? 'This user was banned from the server.'
                    : 'This user was unbanned from the server.'
            );
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[MEMBER LOG] Failed to log ${eventType}:`, error);
    }
}

async function findRecentAuditEntry(guild, type, targetID) {
    try {
        const logs = await guild.fetchAuditLogs({
            type,
            limit: 10,
        });

        const now = Date.now();

        return (
            logs.entries.find(
                (entry) =>
                    entry.target?.id === targetID &&
                    now - entry.createdTimestamp < 15000
            ) ?? null
        );
    } catch (error) {
        console.error('[MEMBER LOG] Could not fetch audit logs:', error);
        return null;
    }
}

async function sendBanLog(ban, eventType) {
    try {
        const settings = await db.get(`memberLogs_${ban.guild.id}`);
        const setting = settings?.[eventType];

        if (!setting?.enabled || !setting.channelID) {
            return;
        }

        const channel = await ban.guild.channels
            .fetch(setting.channelID)
            .catch(() => null);

        if (!channel?.isTextBased() || !channel.isSendable()) {
            return;
        }

        const user = ban.user;
        const isBan = eventType === 'memberBanned';

        const embed = new EmbedBuilder()
            .setColor(isBan ? 0xed4245 : 0x57f287)
            .setTitle(isBan ? 'Member Banned' : 'Member Unbanned')
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setDescription(
                isBan
                    ? 'This user was banned from the server.'
                    : 'This user was unbanned from the server.'
            )
            .addFields(
                {
                    name: 'Member',
                    value: `${user.tag} (<@${user.id}>)`,
                },
                {
                    name: 'User ID',
                    value: user.id,
                }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[MEMBER LOG] Failed to log ${eventType}:`, error);
    }
}

async function memberJoined(member) {
    await sendMemberLog(member, 'memberJoined');
}

async function memberLeft(member) {
    // Allow Discord a moment to write the kick to its audit log.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const entry = await findRecentAuditEntry(
        member.guild,
        AuditLogEvent.MemberKick,
        member.id
    );

    if (entry) {
        const fields = [];

        if (entry.executor) {
            fields.push({
                name: 'Moderator',
                value: `${entry.executor.tag} (<@${entry.executor.id}>)`,
            });
        }

        if (entry.reason) {
            fields.push({
                name: 'Reason',
                value: entry.reason,
            });
        }

        await sendMemberLog(member, 'memberKicked', fields);
        return;
    }

    await sendMemberLog(member, 'memberLeft');
}

async function timeoutGiven(oldMember, newMember) {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? 0;

    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? 0;

    // Timeout removed
    if (oldTimeout && !newTimeout) {
        const fields = [
            {
                name: 'Status',
                value: 'The member timeout was removed.',
            },
        ];

        const entry = await findRecentAuditEntry(
            newMember.guild,
            AuditLogEvent.MemberUpdate,
            newMember.id
        );

        if (entry?.executor) {
            fields.push({
                name: 'Moderator',
                value: `${entry.executor.tag} (<@${entry.executor.id}>)`,
            });
        }

        if (entry?.reason) {
            fields.push({
                name: 'Reason',
                value: entry.reason,
            });
        }
        await saveTimeoutHistory(newMember.guild.id, {
            memberId: newMember.id,
            username: newMember.user.username,
            displayName: newMember.displayName,
            action: 'removed',
            moderator: entry?.executor?.tag || 'Unknown',
            reason: entry?.reason || 'No reason provided',
        });

        await sendMemberLog(newMember, 'timeoutRemoved', fields);
        return;
    }

    // Only log when a timeout is added or extended
    if (!newTimeout || newTimeout <= oldTimeout) {
        return;
    }

    const fields = [
        {
            name: 'Timeout Until',
            value: `<t:${Math.floor(newTimeout / 1000)}:F>`,
        },
        {
            name: 'Duration Remaining',
            value: `<t:${Math.floor(newTimeout / 1000)}:R>`,
        },
    ];

    const entry = await findRecentAuditEntry(
        newMember.guild,
        AuditLogEvent.MemberUpdate,
        newMember.id
    );

    if (entry?.executor) {
        fields.push({
            name: 'Moderator',
            value: `${entry.executor.tag} (<@${entry.executor.id}>)`,
        });
    }

    if (entry?.reason) {
        fields.push({
            name: 'Reason',
            value: entry.reason,
        });
    }
    await saveTimeoutHistory(newMember.guild.id, {
        memberId: newMember.id,
        username: newMember.user.username,
        displayName: newMember.displayName,
        action: oldTimeout ? 'extended' : 'given',
        timeoutUntil: new Date(newTimeout).toISOString(),
        moderator: entry?.executor?.tag || 'Unknown',
        reason: entry?.reason || 'No reason provided',
    });

    await sendMemberLog(newMember, 'timeoutGiven', fields);
}

async function memberBanned(ban) {
    await sendBanLog(ban, 'memberBanned');
}

async function memberUnbanned(ban) {
    await sendBanLog(ban, 'memberUnbanned');
}

module.exports = {
    memberJoined,
    memberLeft,
    memberKicked: memberLeft,
    timeoutGiven,
    memberBanned,
    memberUnbanned,
};
