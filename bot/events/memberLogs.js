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
            roleGiven: 'Role Given',
            roleRemoved: 'Role Removed',
            nicknameChanged: 'Nickname Changed',
        };

        const colors = {
            memberJoined: 0x57f287,
            memberLeft: 0xed4245,
            memberKicked: 0xed4245,
            memberBanned: 0xed4245,
            memberUnbanned: 0x57f287,
            timeoutGiven: 0xfee75c,
            timeoutRemoved: 0x57f287,
            roleGiven: 0x57f287,
            roleRemoved: 0xed4245,
            nicknameChanged: 0x5865f2,
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

async function sendGuildLog(
    guild,
    eventType,
    title,
    fields = [],
    color = 0x5865f2,
    description = ''
) {
    try {
        const settings = await db.get(`memberLogs_${guild.id}`);
        const setting = settings?.[eventType];

        if (!setting?.enabled || !setting.channelID) return;

        const channel = await guild.channels
            .fetch(setting.channelID)
            .catch(() => null);

        if (!channel?.isTextBased() || !channel.isSendable()) return;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .addFields(fields)
            .setTimestamp();

        if (description) {
            embed.setDescription(description.slice(0, 4096));
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[MEMBER LOG] Failed to log ${eventType}:`, error);
    }
}

async function messageDeleted(message) {
    if (!message.guild || message.author?.bot) return;

    await sendGuildLog(
        message.guild,
        'messageDeleted',
        'Message Deleted',
        [
            {
                name: 'Author',
                value: message.author
                    ? `${message.author.tag} (<@${message.author.id}>)`
                    : 'Unknown',
            },
            {
                name: 'Channel',
                value: `<#${message.channelId}>`,
            },
            {
                name: 'Message ID',
                value: message.id,
            },
            {
                name: 'Content',
                value: (message.content || '[Content unavailable]').slice(
                    0,
                    1024
                ),
            },
        ],
        0xed4245
    );
}

async function messageEdited(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await sendGuildLog(
        newMessage.guild,
        'messageEdited',
        'Message Edited',
        [
            {
                name: 'Author',
                value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`,
            },
            {
                name: 'Channel',
                value: `<#${newMessage.channelId}>`,
            },
            {
                name: 'Previous Content',
                value: (oldMessage.content || '[Content unavailable]').slice(
                    0,
                    1024
                ),
            },
            {
                name: 'New Content',
                value: (newMessage.content || '[Empty message]').slice(0, 1024),
            },
            {
                name: 'Message Link',
                value: `[Jump to message](${newMessage.url})`,
            },
        ],
        0xfee75c
    );
}

async function voiceStateUpdated(oldState, newState) {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;

    if (!member || member.user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (oldChannel?.id === newChannel?.id) {
        if (oldState.serverMute !== newState.serverMute) {
            await sendGuildLog(
                guild,
                'voiceMute',
                newState.serverMute ? 'Voice Mute' : 'Voice Unmute',
                [
                    {
                        name: 'Member',
                        value: `${member.user.tag} (<@${member.id}>)`,
                    },
                    {
                        name: 'Channel',
                        value: newChannel ? `<#${newChannel.id}>` : 'Unknown',
                    },
                    {
                        name: 'Status',
                        value: newState.serverMute ? 'Muted' : 'Unmuted',
                    },
                ],
                0xfee75c
            );
        }

        if (oldState.serverDeaf !== newState.serverDeaf) {
            await sendGuildLog(
                guild,
                'voiceDeafen',
                newState.serverDeaf ? 'Voice Deafen' : 'Voice Undeafen',
                [
                    {
                        name: 'Member',
                        value: `${member.user.tag} (<@${member.id}>)`,
                    },
                    {
                        name: 'Channel',
                        value: newChannel ? `<#${newChannel.id}>` : 'Unknown',
                    },
                    {
                        name: 'Status',
                        value: newState.serverDeaf ? 'Deafened' : 'Undeafened',
                    },
                ],
                0xfee75c
            );
        }

        return;
    }

    if (!oldChannel && newChannel) {
        await sendGuildLog(
            guild,
            'memberJoinedVoice',
            'Member Joined Voice',
            [
                {
                    name: 'Member',
                    value: `${member.user.tag} (<@${member.id}>)`,
                },
                { name: 'Channel', value: `<#${newChannel.id}>` },
            ],
            0x57f287
        );
    } else if (oldChannel && !newChannel) {
        await sendGuildLog(
            guild,
            'memberLeftVoice',
            'Member Left Voice',
            [
                {
                    name: 'Member',
                    value: `${member.user.tag} (<@${member.id}>)`,
                },
                { name: 'Previous Channel', value: `<#${oldChannel.id}>` },
            ],
            0xed4245
        );
    } else if (oldChannel && newChannel) {
        // Give Discord time to record a moderator move in the audit log.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        let moveEntry = null;

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberMove,
                limit: 10,
            });

            moveEntry =
                auditLogs.entries.find(
                    (entry) =>
                        entry.action === AuditLogEvent.MemberMove &&
                        entry.targetType === 'User' &&
                        entry.extra?.channel?.id === newChannel.id &&
                        Date.now() - entry.createdTimestamp < 5000
                ) ?? null;
        } catch (error) {
            console.error('[VOICE LOG] Could not fetch move audit log:', error);
        }

        if (moveEntry?.executor) {
            await sendGuildLog(
                guild,
                'memberMovedVoice',
                'Member Moved Voice',
                [
                    {
                        name: 'Member',
                        value: `${member.user.tag} (<@${member.id}>)`,
                    },
                    {
                        name: 'Moved By',
                        value: `${moveEntry.executor.tag} (<@${moveEntry.executor.id}>)`,
                    },
                    {
                        name: 'Previous Channel',
                        value: `<#${oldChannel.id}>`,
                    },
                    {
                        name: 'New Channel',
                        value: `<#${newChannel.id}>`,
                    },
                    ...(moveEntry.reason
                        ? [{ name: 'Reason', value: moveEntry.reason }]
                        : []),
                ],
                0xed4245
            );
        } else {
            await sendGuildLog(
                guild,
                'memberSwitchedVoice',
                'Member Switched Voice',
                [
                    {
                        name: 'Member',
                        value: `${member.user.tag} (<@${member.id}>)`,
                    },
                    {
                        name: 'Previous Channel',
                        value: `<#${oldChannel.id}>`,
                    },
                    {
                        name: 'New Channel',
                        value: `<#${newChannel.id}>`,
                    },
                ],
                0x5865f2
            );
        }
    }
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
async function memberUpdated(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));

    const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

    // Role Given
    if (addedRoles.size > 0) {
        const entry = await findRecentAuditEntry(
            newMember.guild,
            AuditLogEvent.MemberRoleUpdate,
            newMember.id
        );

        const fields = [
            {
                name: 'Role(s) Given',
                value: addedRoles
                    .map((role) => `${role.name} (<@&${role.id}>)`)
                    .join('\n')
                    .slice(0, 1024),
            },
        ];

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

        await sendMemberLog(newMember, 'roleGiven', fields);
    }

    // Role Removed
    if (removedRoles.size > 0) {
        const entry = await findRecentAuditEntry(
            newMember.guild,
            AuditLogEvent.MemberRoleUpdate,
            newMember.id
        );

        const fields = [
            {
                name: 'Role(s) Removed',
                value: removedRoles
                    .map((role) => `${role.name} (<@&${role.id}>)`)
                    .join('\n')
                    .slice(0, 1024),
            },
        ];

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

        await sendMemberLog(newMember, 'roleRemoved', fields);
    }

    // Nickname Changed
    if (oldMember.nickname !== newMember.nickname) {
        const entry = await findRecentAuditEntry(
            newMember.guild,
            AuditLogEvent.MemberUpdate,
            newMember.id
        );

        const fields = [
            {
                name: 'Previous Nickname',
                value: oldMember.nickname || oldMember.user.username,
            },
            {
                name: 'New Nickname',
                value: newMember.nickname || newMember.user.username,
            },
        ];

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

        await sendMemberLog(newMember, 'nicknameChanged', fields);
    }
}

async function memberBanned(ban) {
    await sendBanLog(ban, 'memberBanned');
}

async function memberUnbanned(ban) {
    await sendBanLog(ban, 'memberUnbanned');
}

async function channelCreated(channel) {
    if (!channel.guild || channel.isThread?.()) return;

    const audit = await findRecentAuditEntry(
        channel.guild,
        AuditLogEvent.ChannelCreate,
        channel.id
    );

    await sendGuildLog(channel.guild, 'channelCreated', 'Channel Created', [
        { name: 'Channel', value: `${channel}`, inline: true },
        {
            name: 'Channel Name',
            value: channel.name || 'Unknown',
            inline: true,
        },
        {
            name: 'Created By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function channelDeleted(channel) {
    if (!channel.guild || channel.isThread?.()) return;

    const audit = await findRecentAuditEntry(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id
    );

    await sendGuildLog(channel.guild, 'channelDeleted', 'Channel Deleted', [
        {
            name: 'Channel Name',
            value: channel.name || 'Unknown',
            inline: true,
        },
        { name: 'Channel ID', value: channel.id, inline: true },
        {
            name: 'Deleted By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function channelUpdated(oldChannel, newChannel) {
    if (!newChannel.guild || newChannel.isThread?.()) return;

    const changes = [];

    if (oldChannel.name !== newChannel.name) {
        changes.push({
            name: 'Name',
            value: `${oldChannel.name || 'Unknown'} → ${newChannel.name || 'Unknown'}`,
            inline: false,
        });
    }

    if (oldChannel.topic !== newChannel.topic) {
        changes.push({
            name: 'Topic',
            value: `${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`,
            inline: false,
        });
    }

    if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push({
            name: 'NSFW',
            value: `${oldChannel.nsfw} → ${newChannel.nsfw}`,
            inline: true,
        });
    }

    // Log ordinary channel changes separately.
    if (changes.length > 0) {
        const audit = await findRecentAuditEntry(
            newChannel.guild,
            AuditLogEvent.ChannelUpdate,
            newChannel.id
        );

        await sendGuildLog(
            newChannel.guild,
            'channelUpdated',
            'Channel Updated',
            [
                { name: 'Channel', value: `${newChannel}`, inline: true },
                ...changes,
                {
                    name: 'Updated By',
                    value: audit?.executor
                        ? `${audit.executor.tag} (${audit.executor.id})`
                        : 'Unknown',
                    inline: false,
                },
            ]
        );
    }

    // Compare permission overwrites.
    const oldOverwrites = oldChannel.permissionOverwrites?.cache;
    const newOverwrites = newChannel.permissionOverwrites?.cache;

    if (!oldOverwrites || !newOverwrites) return;

    const overwriteChanges = [];
    const overwriteIds = new Set([
        ...oldOverwrites.keys(),
        ...newOverwrites.keys(),
    ]);

    for (const id of overwriteIds) {
        const oldOverwrite = oldOverwrites.get(id);
        const newOverwrite = newOverwrites.get(id);

        if (!oldOverwrite && newOverwrite) {
            overwriteChanges.push({
                name: 'Overwrite Added',
                value: `Target ID: ${id}\nType: ${newOverwrite.type}`,
                inline: false,
            });
            continue;
        }

        if (oldOverwrite && !newOverwrite) {
            overwriteChanges.push({
                name: 'Overwrite Removed',
                value: `Target ID: ${id}\nType: ${oldOverwrite.type}`,
                inline: false,
            });
            continue;
        }

        if (oldOverwrite && newOverwrite) {
            const oldAllow = oldOverwrite.allow.bitfield;
            const newAllow = newOverwrite.allow.bitfield;
            const oldDeny = oldOverwrite.deny.bitfield;
            const newDeny = newOverwrite.deny.bitfield;

            if (oldAllow !== newAllow || oldDeny !== newDeny) {
                overwriteChanges.push({
                    name: 'Permissions Changed',
                    value:
                        `Target ID: ${id}\n` +
                        `Allow: ${oldAllow} → ${newAllow}\n` +
                        `Deny: ${oldDeny} → ${newDeny}`,
                    inline: false,
                });
            }
        }
    }

    if (overwriteChanges.length === 0) return;

    const guild = newChannel.guild;
    const auditTypes = [
        AuditLogEvent.ChannelOverwriteCreate,
        AuditLogEvent.ChannelOverwriteUpdate,
        AuditLogEvent.ChannelOverwriteDelete,
    ];

    let audit = null;

    for (const type of auditTypes) {
        audit = await findRecentAuditEntry(guild, type, newChannel.id);
        if (audit) break;
    }

    const detailedChanges = await Promise.all(
        overwriteChanges.slice(0, 20).map(async (change) => {
            const targetIdMatch = change.value.match(/Target ID: (\d+)/);
            const targetId = targetIdMatch?.[1];

            let targetName = targetId || 'Unknown';

            if (targetId) {
                const role = guild.roles.cache.get(targetId);
                const member = guild.members.cache.get(targetId);

                if (role) {
                    targetName = `@${role.name}`;
                } else if (member) {
                    targetName = `${member.user.tag}`;
                }
            }

            return {
                name: change.name,
                value: change.value.replace(
                    /Target ID: \d+/,
                    `Target: ${targetName} (${targetId || 'Unknown'})`
                ),
                inline: false,
            };
        })
    );

    await sendGuildLog(
        guild,
        'channelPermissionsUpdated',
        'Channel Permissions Updated',
        [
            { name: 'Channel', value: `${newChannel}`, inline: true },
            ...detailedChanges,
            {
                name: 'Updated By',
                value: audit?.executor
                    ? `${audit.executor.tag} (${audit.executor.id})`
                    : 'Unknown',
                inline: false,
            },
        ]
    );
}

async function threadCreated(thread) {
    if (!thread.guild) return;

    const audit = await findRecentAuditEntry(
        thread.guild,
        AuditLogEvent.ThreadCreate,
        thread.id
    );

    await sendGuildLog(thread.guild, 'threadCreated', 'Thread Created', [
        { name: 'Thread', value: `${thread}`, inline: true },
        { name: 'Thread Name', value: thread.name || 'Unknown', inline: true },
        {
            name: 'Created By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function threadDeleted(thread) {
    if (!thread.guild) return;

    const audit = await findRecentAuditEntry(
        thread.guild,
        AuditLogEvent.ThreadDelete,
        thread.id
    );

    await sendGuildLog(thread.guild, 'threadDeleted', 'Thread Deleted', [
        { name: 'Thread Name', value: thread.name || 'Unknown', inline: true },
        { name: 'Thread ID', value: thread.id, inline: true },
        {
            name: 'Deleted By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function threadUpdated(oldThread, newThread) {
    if (!newThread.guild || oldThread.name === newThread.name) return;

    const audit = await findRecentAuditEntry(
        newThread.guild,
        AuditLogEvent.ThreadUpdate,
        newThread.id
    );

    await sendGuildLog(newThread.guild, 'threadUpdated', 'Thread Updated', [
        { name: 'Thread', value: `${newThread}`, inline: true },
        {
            name: 'Name',
            value: `${oldThread.name} → ${newThread.name}`,
            inline: false,
        },
        {
            name: 'Updated By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function roleCreated(role) {
    const audit = await findRecentAuditEntry(
        role.guild,
        AuditLogEvent.RoleCreate,
        role.id
    );

    await sendGuildLog(role.guild, 'roleCreated', 'Role Created', [
        { name: 'Role', value: `${role} (${role.name})`, inline: false },
        { name: 'Role ID', value: role.id, inline: true },
        {
            name: 'Created By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function roleDeleted(role) {
    const audit = await findRecentAuditEntry(
        role.guild,
        AuditLogEvent.RoleDelete,
        role.id
    );

    await sendGuildLog(role.guild, 'roleDeleted', 'Role Deleted', [
        { name: 'Role Name', value: role.name || 'Unknown', inline: true },
        { name: 'Role ID', value: role.id, inline: true },
        {
            name: 'Deleted By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function roleUpdated(oldRole, newRole) {
    const changes = [];

    if (oldRole.name !== newRole.name) {
        changes.push({
            name: 'Name',
            value: `${oldRole.name} → ${newRole.name}`,
            inline: false,
        });
    }

    if (oldRole.hexColor !== newRole.hexColor) {
        changes.push({
            name: 'Color',
            value: `${oldRole.hexColor} → ${newRole.hexColor}`,
            inline: true,
        });
    }

    if (oldRole.hoist !== newRole.hoist) {
        changes.push({
            name: 'Displayed Separately',
            value: `${oldRole.hoist} → ${newRole.hoist}`,
            inline: true,
        });
    }

    if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({
            name: 'Mentionable',
            value: `${oldRole.mentionable} → ${newRole.mentionable}`,
            inline: true,
        });
    }

    if (changes.length === 0) return;

    const audit = await findRecentAuditEntry(
        newRole.guild,
        AuditLogEvent.RoleUpdate,
        newRole.id
    );

    await sendGuildLog(newRole.guild, 'roleUpdated', 'Role Updated', [
        { name: 'Role', value: `${newRole} (${newRole.name})`, inline: false },
        ...changes,
        {
            name: 'Updated By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function serverUpdated(oldGuild, newGuild) {
    const changes = [];

    if (oldGuild.name !== newGuild.name) {
        changes.push({
            name: 'Server Name',
            value: `${oldGuild.name} → ${newGuild.name}`,
            inline: false,
        });
    }

    if (oldGuild.description !== newGuild.description) {
        changes.push({
            name: 'Description',
            value: `${oldGuild.description || 'None'} → ${newGuild.description || 'None'}`,
            inline: false,
        });
    }

    if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
        changes.push({
            name: 'AFK Timeout',
            value: `${oldGuild.afkTimeout} → ${newGuild.afkTimeout}`,
            inline: true,
        });
    }

    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push({
            name: 'Verification Level',
            value: `${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`,
            inline: true,
        });
    }

    if (changes.length === 0) return;

    const audit = await findRecentAuditEntry(
        newGuild,
        AuditLogEvent.GuildUpdate,
        newGuild.id
    );

    await sendGuildLog(newGuild, 'serverUpdated', 'Server Updated', [
        ...changes,
        {
            name: 'Updated By',
            value: audit?.executor
                ? `${audit.executor.tag} (${audit.executor.id})`
                : 'Unknown',
            inline: false,
        },
    ]);
}

async function serverInviteCreated(invite) {
    if (!invite.guild) return;

    await sendGuildLog(invite.guild, 'serverInvites', 'Server Invite Created', [
        {
            name: 'Invite Code',
            value: invite.code || 'Unknown',
            inline: true,
        },
        {
            name: 'Channel',
            value: invite.channel ? `${invite.channel}` : 'Unknown',
            inline: true,
        },
        {
            name: 'Created By',
            value: invite.inviter
                ? `${invite.inviter.tag} (${invite.inviter.id})`
                : 'Unknown',
            inline: false,
        },
        {
            name: 'Expires At',
            value: invite.expiresAt
                ? invite.expiresAt.toISOString()
                : 'Never / Unknown',
            inline: false,
        },
    ]);
}

async function serverInviteDeleted(invite) {
    if (!invite.guild) return;

    await sendGuildLog(invite.guild, 'serverInvites', 'Server Invite Deleted', [
        {
            name: 'Invite Code',
            value: invite.code || 'Unknown',
            inline: true,
        },
        {
            name: 'Channel',
            value: invite.channel ? `${invite.channel}` : 'Unknown',
            inline: true,
        },
    ]);
}

async function moderationCommandUsed(interaction, target, reason) {
    if (!interaction.guild) return;

    const fields = [
        {
            name: 'Command',
            value: `/${interaction.commandName}`,
            inline: true,
        },
        {
            name: 'Moderator',
            value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
            inline: false,
        },
    ];

    if (target) {
        fields.push({
            name: 'Target',
            value: `${target.tag || target.user?.tag || target} (${target.id || target.user?.id || 'Unknown'})`,
            inline: false,
        });
    }

    if (reason) {
        fields.push({
            name: 'Reason',
            value: reason.slice(0, 1024),
            inline: false,
        });
    }

    await sendGuildLog(
        interaction.guild,
        'moderationCommandUsed',
        'Moderation Command Used',
        fields,
        0xed4245
    );
}

module.exports = {
    memberJoined,
    memberLeft,
    memberKicked: memberLeft,
    timeoutGiven,
    memberBanned,
    memberUnbanned,
    memberUpdated,
    messageDeleted,
    messageEdited,
    voiceStateUpdated,
    channelCreated,
    channelDeleted,
    channelUpdated,
    threadCreated,
    threadDeleted,
    threadUpdated,
    roleCreated,
    roleDeleted,
    roleUpdated,
    serverUpdated,
    serverInviteCreated,
    serverInviteDeleted,
    moderationCommandUsed,
};
