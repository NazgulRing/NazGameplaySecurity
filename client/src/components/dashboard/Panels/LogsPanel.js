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

    return (
        <div className="logs-panel">
            <div className="panel">
                <div className="panel-heading">
                    <div>
                        <h3>Member Logs</h3>
                        <p>
                            Configure logging for members joining, leaving,
                            being kicked, banned, unbanned, or timed out.
                        </p>
                    </div>
                </div>

                <div className="logs-grid">
                    {memberLogTypes.map((log) => {
                        const setting = logSettings[log.key] || {
                            enabled: false,
                            channelID: '',
                        };

                        return (
                            <div className="setting-card" key={log.key}>
                                <div className="logs-setting-header">
                                    <div>
                                        <h4 className="mb-2">{log.title}</h4>
                                        <p className="mb-2">
                                            {log.description}
                                        </p>
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
                                        <option value="">
                                            Select log channel
                                        </option>

                                        {channels.map((channel) => (
                                            <option
                                                key={channel.id}
                                                value={channel.id}>
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
                    })}
                </div>
            </div>
        </div>
    );
}

export default LogsPanel;
