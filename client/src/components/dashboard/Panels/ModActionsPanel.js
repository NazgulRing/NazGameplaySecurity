import React, { useEffect, useMemo, useState } from 'react';
import '../../../styles/modactions.css';

const COMMAND_CATEGORIES = [
    {
        title: 'Moderation',
        description: 'Manage moderation commands.',

        commands: [
            {
                name: 'warn',
                description: 'Issue a warning to a member.',
            },
            {
                name: 'warnings',
                description: 'View a member’s warnings.',
            },
            {
                name: 'clearwarnings',
                description: 'Clear a member’s warnings.',
            },
            {
                name: 'timeout',
                description: 'Timeout a member.',
            },
            {
                name: 'untimeout',
                description: 'Remove a member’s timeout.',
            },
            {
                name: 'ban',
                description: 'Ban a member from the server.',
            },
            {
                name: 'unban',
                description: 'Remove a member’s ban.',
            },
            {
                name: 'kick',
                description: 'Kick a member from the server.',
            },
            {
                name: 'clearchat',
                description: 'Delete messages from a channel.',
            },
            {
                name: 'reload',
                description: 'Reload a specific command.',
            },
        ],
    },
    {
        title: 'Server Configuration',
        description: 'Configure server settings.',
        commands: [
            {
                name: 'autorole',
                description: 'Configure automatic roles.',
            },
            {
                name: 'botrole',
                description: 'Configure the bot role.',
            },
            {
                name: 'setlogchannel',
                description: 'Set the moderation log channel.',
            },
            {
                name: 'setwelcomechannel',
                description: 'Set the welcome channel.',
            },
            {
                name: 'seteventchannel',
                description: 'Set the event channel.',
            },
        ],
    },
    {
        title: 'Communication',
        description: 'Manage bot messages.',
        commands: [
            {
                name: 'sendmessage',
                description: 'Send a message through the bot.',
            },
        ],
    },

    {
        title: 'Utilities',
        description: 'General-purpose bot commands and tools.',
        commands: [
            {
                name: 'embedbuilder',
                description: 'Create and configure embeds.',
            },
            {
                name: 'membercount',
                description: 'View the server member count.',
            },
            {
                name: 'ping',
                description: 'Check the bot response time.',
            },

            {
                name: 'riddle',
                description: 'Play a riddle game.',
            },
            {
                name: 'server',
                description: 'View server information.',
            },
            {
                name: 'user',
                description: 'View user information.',
            },
        ],
    },
];

function ModActionsPanel({ guildID }) {
    const [settings, setSettings] = useState({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingCommands, setSavingCommands] = useState([]);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        if (!guildID) {
            setError('No server selected.');
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        async function loadSettings() {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(
                    `/api/command-settings/${encodeURIComponent(guildID)}`,
                    {
                        credentials: 'include',
                        signal: controller.signal,
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || 'Could not load command settings.'
                    );
                }

                setSettings(data.settings || {});
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError(err.message || 'Could not load command settings.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadSettings();

        return () => controller.abort();
    }, [guildID]);

    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();

        return COMMAND_CATEGORIES.map((category) => ({
            ...category,
            commands: category.commands.filter((command) => {
                return (
                    command.name.includes(query) ||
                    command.description.toLowerCase().includes(query)
                );
            }),
        })).filter((category) => category.commands.length > 0);
    }, [search]);

    const allCommands = COMMAND_CATEGORIES.flatMap(
        (category) => category.commands
    );

    async function toggleCommand(commandName) {
        const enabled = settings[commandName] === false;
        const previousSettings = { ...settings };

        setSettings((current) => ({
            ...current,
            [commandName]: enabled,
        }));

        setSavingCommands((current) => [...current, commandName]);
        setError('');
        setNotice('');

        try {
            const response = await fetch(
                `/api/command-settings/${encodeURIComponent(guildID)}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        commandName,
                        enabled,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Could not update command setting.'
                );
            }

            setNotice(
                `/${commandName} has been ${enabled ? 'enabled' : 'disabled'}.`
            );
        } catch (err) {
            setSettings(previousSettings);
            setError(err.message || 'Could not update command setting.');
        } finally {
            setSavingCommands((current) =>
                current.filter((name) => name !== commandName)
            );
        }
    }

    const enabledCount = allCommands.filter(
        (command) => settings[command.name] !== false
    ).length;

    if (loading) {
        return (
            <div className="mod-actions-panel">
                <div className="mod-actions-status">
                    Loading command settings...
                </div>
            </div>
        );
    }

    return (
        <div className="mod-actions-panel">
            <div className="mod-actions-header">
                <div>
                    <h2>Mod Actions</h2>
                    <p>Manage which commands are available on this server.</p>
                </div>

                <div className="mod-actions-count">
                    {enabledCount} / {allCommands.length} enabled
                </div>
            </div>

            <div className="mod-actions-search">
                <input
                    type="search"
                    placeholder="Search commands..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Search commands"
                />
            </div>

            {error && (
                <div
                    className="mod-actions-message mod-actions-error"
                    role="alert">
                    {error}
                </div>
            )}

            {notice && !error && (
                <div
                    className="mod-actions-message mod-actions-success"
                    role="status">
                    {notice}
                </div>
            )}

            {filteredCategories.length === 0 && (
                <div className="mod-actions-status">
                    No commands match your search.
                </div>
            )}

            <div className="mod-actions-categories">
                {filteredCategories.map((category) => (
                    <section
                        className="mod-actions-category"
                        key={category.title}>
                        <div className="mod-actions-category-header">
                            <h3>{category.title}</h3>
                            <p>{category.description}</p>
                        </div>

                        <div className="mod-actions-command-list">
                            {category.commands.map((command) => {
                                const enabled =
                                    settings[command.name] !== false;
                                const saving = savingCommands.includes(
                                    command.name
                                );

                                return (
                                    <div
                                        className="mod-actions-command"
                                        key={command.name}>
                                        <div className="mod-actions-command-info">
                                            <span className="mod-actions-command-name">
                                                /{command.name}
                                            </span>
                                            <p>{command.description}</p>
                                        </div>

                                        <button
                                            type="button"
                                            className={`mod-actions-toggle ${
                                                enabled
                                                    ? 'is-enabled'
                                                    : 'is-disabled'
                                            }`}
                                            role="switch"
                                            aria-checked={enabled}
                                            aria-label={`${
                                                enabled ? 'Disable' : 'Enable'
                                            } /${command.name}`}
                                            disabled={saving}
                                            onClick={() =>
                                                toggleCommand(command.name)
                                            }>
                                            <span className="mod-actions-toggle-knob" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

export default ModActionsPanel;
