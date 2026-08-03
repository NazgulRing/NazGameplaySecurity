import '../../styles/variables.css';
import '../../styles/utility.css';
import '../../styles/guildsbuttons.css';
import TwitchPanel from '../twitch/TwitchPanels.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WelcomePanel from '../welcome/WelcomePanel.js';
import SecurityPanel from '../dashboard/SecurityPanel';
import SettingsPanel from '../dashboard/SettingsPanel.js';
import DashboardTabs from '../dashboard/DashboardTabs.js';
import CommandsPanel from '../dashboard/CommandsPanel.js';
import MembersPanel from '../dashboard/MembersPanel.js';
const settingFields = [
    {
        key: 'autoroleID',
        label: 'Auto role',
        endpoint: '/api/autorole',
        source: 'roles',
        emptyText: 'Ingen rolle',
    },
    {
        key: 'botroleID',
        label: 'Bot role',
        endpoint: '/api/botrole',
        source: 'roles',
        emptyText: 'Ingen bot-rolle',
    },
    {
        key: 'welcomeChannelID',
        label: 'Welcome channel',
        endpoint: '/api/welcomechannel',
        source: 'channels',
        emptyText: 'Ingen kanal',
    },
    {
        key: 'logChannelID',
        label: 'Log channel',
        endpoint: '/api/logchannel',
        source: 'channels',
        emptyText: 'Ingen log-kanal',
    },
    {
        key: 'eventChannelID',
        label: 'Event channel',
        endpoint: '/api/eventchannel',
        source: 'channels',
        emptyText: 'Ingen kanal',
    },
    {
        key: 'messageLogChannelID',
        label: 'Message log channel',
        endpoint: '/api/messagelogchannel',
        source: 'channels',
        emptyText: 'Ingen kanal',
    },
];

const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

async function requestJSON(url, options) {
    const apiURL = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;
    const response = await fetch(apiURL, options);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.error || 'Noe gikk galt');
    }

    return data;
}

function GuildsButton() {
    const [guilds, setGuilds] = useState([]);
    const [selectedGuildID, setSelectedGuildID] = useState('');
    const [members, setMembers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingStreamer, setEditingStreamer] = useState(null);

    const [roles, setRoles] = useState([]);
    const [channels, setChannels] = useState([]);

    const [settings, setSettings] = useState({
        autoroleID: '',
        botroleID: '',
        welcomeChannelID: '',
        logChannelID: '',
        eventChannelID: '',
        messageLogChannelID: '',
    });

    const [warnings, setWarnings] = useState([]);
    const [commands, setCommands] = useState([]);
    const [twitchSettings, setTwitchSettings] = useState({
        enabled: false,
        streamers: [],
        channelID: '',
        message: '{streamer} is now live playing {game}',
        mentionRoleID: '',
    });

    const [welcomeSettings, setWelcomeSettings] = useState({
        enabled: false,

        channelID: '',

        title: 'Velkommen!',

        message: '{user} joined the server!',

        color: '#57F287',

        thumbnail: '',

        mention: true,
    });

    const [activeTab, setActiveTab] = useState('settings');
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const selectedGuild = useMemo(
        () => guilds.find((guild) => guild.id === selectedGuildID),
        [guilds, selectedGuildID]
    );

    const fetchGuilds = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await requestJSON('/api/guilds');
            setGuilds(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCommands = useCallback(async () => {
        try {
            const data = await requestJSON('/api/commands');
            setCommands(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchGuilds();
        fetchCommands();
    }, [fetchCommands, fetchGuilds]);

    //eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (selectedGuildID) {
            selectGuild(selectedGuildID, false);
        }
    }, [page]);

    async function selectGuild(guildID, resetPage = true) {
        setSelectedGuildID(guildID);

        if (resetPage) {
            setPage(1);
        }

        setMembers([]);
        setRoles([]);
        setChannels([]);
        setWarnings([]);
        setStatus('');
        setError('');
        setLoading(true);

        try {
            const currentPage = resetPage ? 1 : page;

            const [
                membersData,
                rolesData,
                channelsData,
                settingsData,
                warningsData,
                twitchData,
                welcomeData,
            ] = await Promise.all([
                requestJSON(`/api/members/${guildID}?page=${currentPage}`),
                requestJSON(`/api/roles/${guildID}`),
                requestJSON(`/api/channels/${guildID}`),
                requestJSON(`/api/settings/${guildID}`),
                requestJSON(`/api/warnings/${guildID}`),
                requestJSON(`/api/twitch/${guildID}`),
                requestJSON(`/api/welcome/${guildID}`),
            ]);

            setMembers(membersData.members);
            setTotalPages(membersData.totalPages);

            setRoles(rolesData);
            setChannels(channelsData);
            setWarnings(warningsData);
            setTwitchSettings(twitchData);
            setWelcomeSettings(welcomeData);

            setSettings({
                autoroleID: settingsData.autoroleID || '',
                botroleID: settingsData.botroleID || '',
                welcomeChannelID: settingsData.welcomeChannelID || '',
                logChannelID: settingsData.logChannelID || '',
                eventChannelID: settingsData.eventChannelID || '',
                messageLogChannelID: settingsData.messageLogChannelID || '',
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function saveSetting(field) {
        if (!selectedGuildID || !settings[field.key]) return;

        setSavingKey(field.key);
        setStatus('');
        setError('');

        try {
            await requestJSON(field.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guildID: selectedGuildID,
                    roleID:
                        field.source === 'roles'
                            ? settings[field.key]
                            : undefined,
                    channelID:
                        field.source === 'channels'
                            ? settings[field.key]
                            : undefined,
                }),
            });

            setStatus(`${field.label} er lagret`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingKey('');
        }
    }

    async function saveTwitchSettings() {
        if (!selectedGuildID) return;

        setStatus('Twitch settings lagret');
        setEditingStreamer(null);
        setError('');

        try {
            const streamerData = {
                avatar: twitchSettings.avatar || '',

                username: twitchSettings.username,

                message: twitchSettings.message,

                mentionRoleID: twitchSettings.mentionRoleID,

                channelID: twitchSettings.channelID,

                enabled: twitchSettings.enabled,
            };

            let updatedStreamers = [...(twitchSettings.streamers || [])];

            const existingIndex = updatedStreamers.findIndex(
                (streamer) =>
                    streamer.username.toLowerCase() ===
                    twitchSettings.username.toLowerCase()
            );

            if (existingIndex !== -1) {
                updatedStreamers[existingIndex] = streamerData;
            } else {
                updatedStreamers.push(streamerData);
            }

            const updatedSettings = {
                ...twitchSettings,

                streamers: updatedStreamers,
            };

            setTwitchSettings(updatedSettings);

            await requestJSON('/api/twitch', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    guildID: selectedGuildID,

                    enabled: updatedSettings.enabled,

                    username: updatedSettings.username,

                    streamers: updatedSettings.streamers,

                    channelID: updatedSettings.channelID,

                    message: updatedSettings.message,

                    mentionRoleID: updatedSettings.mentionRoleID,
                }),
            });

            setStatus('Twitch settings lagret');
        } catch (err) {
            console.error(err);

            setError(err.message);
        }
    }

    function loadStreamer(streamer) {
        setEditingStreamer(streamer);

        setTwitchSettings({
            username: streamer.username || '',
            message: streamer.message || '',
            mentionRoleID: streamer.mentionRoleID || '',
            channelID: streamer.channelID || '',
            enabled: streamer.enabled || false,
            streamers: twitchSettings.streamers || [],
        });
    }

    async function testTwitchAlert() {
        if (!selectedGuildID) return;

        try {
            await requestJSON('/api/twitch/test', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    guildID: selectedGuildID,

                    settings: twitchSettings,
                }),
            });

            setStatus('Test notification sendt');
        } catch (err) {
            setError(err.message);
        }
    }
    async function saveWelcomeSettings() {
        if (!selectedGuildID) return;

        try {
            await requestJSON('/api/welcome', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    guildID: selectedGuildID,

                    ...welcomeSettings,
                }),
            });

            setStatus('Welcome settings lagret');
        } catch (err) {
            setError(err.message);
        }
    }

    async function testWelcomeMessage() {
        if (!selectedGuildID) return;

        try {
            await requestJSON('/api/welcome/test', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    guildID: selectedGuildID,

                    settings: welcomeSettings,
                }),
            });

            setStatus('Test welcome sendt');
        } catch (err) {
            setError(err.message);
        }
    }

    function removeStreamer(username) {
        setTwitchSettings((current) => ({
            ...current,

            streamers: current.streamers.filter(
                (streamer) => streamer.username !== username
            ),
        }));
    }

    function updateSetting(key, value) {
        setSettings((current) => ({
            ...current,
            [key]: value,
        }));
    }

    return (
        <div className="dashboard-shell">
            <div className="dashboard-header">
                <div>
                    <p className="dashboard-kicker">DiscordBot dashboard</p>
                    <h2>Server settings</h2>
                </div>

                <button
                    className="dashboard-button"
                    onClick={fetchGuilds}
                    disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <p className="dashboard-alert dashboard-alert-error">{error}</p>
            )}

            {status && (
                <p className="dashboard-alert dashboard-alert-success">
                    {status}
                </p>
            )}

            <div className="dashboard-layout">
                <aside className="dashboard-sidebar">
                    <h3>Servers</h3>

                    <div className="guild-list">
                        {guilds.map((guild) => (
                            <div
                                className="guild-button-wrapper"
                                key={guild.id}>
                                <button
                                    className={`guild-button ${
                                        guild.id === selectedGuildID
                                            ? 'guild-button-active'
                                            : ''
                                    }`}
                                    onClick={() => selectGuild(guild.id)}
                                    title={guild.name}>
                                    {guild.icon ? (
                                        <img
                                            src={guild.icon}
                                            alt={guild.name}
                                            className="guild-icon"
                                        />
                                    ) : (
                                        <div className="guild-icon-fallback">
                                            {guild.name.charAt(0)}
                                        </div>
                                    )}
                                </button>

                                <div className="guild-tooltip">
                                    {guild.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <div className="dashboard-main">
                    {!selectedGuild && (
                        <div className="empty-state">
                            <h3>Velg en server</h3>
                            <p>
                                Da kan du sette roller, kanaler og se medlemmer
                                fra samme sted.
                            </p>
                        </div>
                    )}

                    {selectedGuild && (
                        <>
                            <div className="selected-guild-info">
                                <div className="server-heading">
                                    <div>
                                        <p className="dashboard-kicker">
                                            Valgt server
                                        </p>
                                        <h3>{selectedGuild.name}</h3>
                                    </div>

                                    <span>
                                        {selectedGuild.memberCount} medlemmer
                                    </span>
                                </div>
                            </div>

                            <DashboardTabs
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                            />

                            {activeTab === 'settings' && (
                                <SettingsPanel
                                    settingFields={settingFields}
                                    settings={settings}
                                    roles={roles}
                                    channels={channels}
                                    updateSetting={updateSetting}
                                    saveSetting={saveSetting}
                                    savingKey={savingKey}
                                />
                            )}

                            {activeTab === 'security' && (
                                <SecurityPanel
                                    warnings={warnings}
                                    selectedGuildID={selectedGuildID}
                                    selectGuild={selectGuild}
                                />
                            )}

                            {activeTab === 'commands' && (
                                <CommandsPanel commands={commands} />
                            )}

                            {activeTab === 'Members' && (
                                <MembersPanel
                                    members={members}
                                    page={page}
                                    totalPages={totalPages}
                                    setPage={setPage}
                                />
                            )}

                            {activeTab === 'twitch' && (
                                <div className="twitch-panel">
                                    <div className="panel">
                                        <TwitchPanel
                                            twitchSettings={twitchSettings}
                                            setTwitchSettings={
                                                setTwitchSettings
                                            }
                                            channels={channels}
                                            saveTwitchSettings={
                                                saveTwitchSettings
                                            }
                                            testTwitchAlert={testTwitchAlert}
                                            roles={roles}
                                            loadStreamer={loadStreamer}
                                            removeStreamer={removeStreamer}
                                            editingStreamer={editingStreamer}
                                            setEditingStreamer={
                                                setEditingStreamer
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'welcome' && (
                                <div className="welcome-panel-wrapper">
                                    <div className="panel">
                                        <WelcomePanel
                                            welcomeSettings={welcomeSettings}
                                            setWelcomeSettings={
                                                setWelcomeSettings
                                            }
                                            channels={channels}
                                            saveWelcomeSettings={
                                                saveWelcomeSettings
                                            }
                                            testWelcomeMessage={
                                                testWelcomeMessage
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GuildsButton;
