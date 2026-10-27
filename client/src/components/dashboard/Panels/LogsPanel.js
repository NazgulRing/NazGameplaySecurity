import React from 'react';
import '../../../styles/logspanel.css';

function LogsPanel({ logSettings, setLogSettings, channels, saveLogSettings }) {
    const memberLogTypes = [
        {
            key: 'memberJoined',
            title: 'Member Joined',
            description: 'Log when a member joins the server.',
        },
        {
            key: 'memberLeft',
            title: 'Member Left',
            description: 'Log when a member leaves the server.',
        },
        {
            key: 'memberKicked',
            title: 'Member Kicked',
            description: 'Log when a member is kicked from the server.',
        },
        {
            key: 'memberBanned',
            title: 'Member Banned',
            description: 'Log when a member is banned from the server.',
        },
        {
            key: 'memberUnbanned',
            title: 'Member Unbanned',
            description: 'Log when a member is unbanned from the server.',
        },
        {
            key: 'timeoutGiven',
            title: 'Timeout Given',
            description:
                'Log when a member receives or has their timeout extended.',
        },
        {
            key: 'timeoutRemoved',
            title: 'Timeout Removed',
            description: 'Log when a member timeout is removed.',
        },
        {
            key: 'roleGiven',
            title: 'Role Given',
            description: 'Log when a member receives one or more roles.',
        },
        {
            key: 'roleRemoved',
            title: 'Role Removed',
            description:
                'Log when one or more roles are removed from a member.',
        },
        {
            key: 'nicknameChanged',
            title: 'Nickname Changed',
            description: 'Log when a member changes their server nickname.',
        },
    ];

    const messageVoiceLogTypes = [
        {
            key: 'messageDeleted',
            title: 'Message Deleted',
            description: 'Log when a message is deleted.',
        },
        {
            key: 'messageEdited',
            title: 'Message Edited',
            description: 'Log when a message is edited.',
        },
        {
            key: 'memberJoinedVoice',
            title: 'Member Joined Voice',
            description: 'Log when a member joins a voice channel.',
        },
        {
            key: 'memberLeftVoice',
            title: 'Member Left Voice',
            description: 'Log when a member leaves a voice channel.',
        },
        {
            key: 'memberMovedVoice',
            title: 'Member Moved Voice',
            description:
                'Log when a moderator moves a member to another voice channel.',
        },
        {
            key: 'memberSwitchedVoice',
            title: 'Member Switched Voice',
            description: 'Log when a member switches voice channels.',
        },
        {
            key: 'voiceMute',
            title: 'Voice Mute',
            description: 'Log when a member is server-muted or unmuted.',
        },
        {
            key: 'voiceDeafen',
            title: 'Voice Deafen',
            description: 'Log when a member is server-deafened or undeafened.',
        },
    ];
    const channelThreadLogTypes = [
        {
            key: 'channelCreated',
            title: 'Channel Created',
            description: 'Log when a new channel is created.',
        },
        {
            key: 'channelDeleted',
            title: 'Channel Deleted',
            description: 'Log when a channel is deleted.',
        },
        {
            key: 'channelUpdated',
            title: 'Channel Updated',
            description: 'Log when channel settings are changed.',
        },
        {
            key: 'threadCreated',
            title: 'Thread Created',
            description: 'Log when a new thread is created.',
        },
        {
            key: 'threadDeleted',
            title: 'Thread Deleted',
            description: 'Log when a thread is deleted.',
        },
        {
            key: 'threadUpdated',
            title: 'Thread Updated',
            description: 'Log when thread settings are changed.',
        },
        {
            key: 'channelPermissionsUpdated',
            title: 'Channel Permissions Updated',
            description: 'Log when channel permissions are changed.',
        },
    ];

    const roleServerLogTypes = [
        {
            key: 'roleCreated',
            title: 'Role Created',
            description: 'Log when a role is created.',
        },
        {
            key: 'roleDeleted',
            title: 'Role Deleted',
            description: 'Log when a role is deleted.',
        },
        {
            key: 'roleUpdated',
            title: 'Role Updated',
            description: 'Log when a role is modified.',
        },
        {
            key: 'serverUpdated',
            title: 'Server Updated',
            description: 'Log when server settings are changed.',
        },
        {
            key: 'moderationCommandUsed',
            title: 'Moderation Command Used',
            description: 'Log when a moderation command is used.',
        },
        {
            key: 'serverInvites',
            title: 'Server Invites',
            description: 'Log when an invite is created or deleted.',
        },
    ];

    const updateLogSetting = (key, field, value) => {
        setLogSettings((current) => ({
            ...current,
            [key]: {
                enabled: false,
                channelID: '',
                ...(current[key] || {}),
                [field]: value,
            },
        }));
    };

    const renderLogTypes = (logTypes) =>
        logTypes.map((log) => {
            const setting = logSettings[log.key] || {
                enabled: false,
                channelID: '',
            };

            return (
                <div className="setting-card" key={log.key}>
                    <div className="logs-setting-header">
                        <div>
                            <h4 className="mb-2">{log.title}</h4>
                            <p className="mb-2">{log.description}</p>
                        </div>

                        <label className="logs-switch mb-2">
                            <input
                                type="checkbox"
                                checked={Boolean(setting.enabled)}
                                onChange={(event) =>
                                    updateLogSetting(
                                        log.key,
                                        'enabled',
                                        event.target.checked
                                    )
                                }
                            />
                            <span className="logs-switch-slider" />
                        </label>
                    </div>

                    <div className="setting-row mb-2">
                        <select
                            value={setting.channelID || ''}
                            onChange={(event) =>
                                updateLogSetting(
                                    log.key,
                                    'channelID',
                                    event.target.value
                                )
                            }>
                            <option value="">Select log channel</option>

                            {channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                    #{channel.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="dashboard-button"
                        onClick={() => saveLogSettings(log.key)}
                        disabled={!setting.channelID}>
                        Save {log.title}
                    </button>
                </div>
            );
        });

    return (
        <div className="logs-panel">
            <div className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>Member Logs</h3>
                        <p>
                            Configure logging for member activity, roles,
                            nickname changes, bans, and timeouts.
                        </p>
                    </div>
                </div>

                <div className="logs-grid">
                    {renderLogTypes(memberLogTypes)}
                </div>
            </div>

            <div className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>Messages &amp; Voice</h3>
                        <p>
                            Configure logging for deleted and edited messages,
                            voice channel activity, server mute, and deafen.
                        </p>
                    </div>
                </div>

                <div className="logs-grid">
                    {renderLogTypes(messageVoiceLogTypes)}
                </div>
            </div>

            <div className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>Channels &amp; Threads</h3>
                        <p>
                            Configure logging for channel creation, deletion,
                            updates, threads, and permission changes.
                        </p>
                    </div>
                </div>

                <div className="logs-grid">
                    {renderLogTypes(channelThreadLogTypes)}
                </div>
            </div>

            <div className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>Roles &amp; Server</h3>
                        <p>
                            Configure logging for role changes, server updates,
                            moderation commands, and invites.
                        </p>
                    </div>
                </div>

                <div className="logs-grid">
                    {renderLogTypes(roleServerLogTypes)}
                </div>
            </div>
        </div>
    );
}

export default LogsPanel;
