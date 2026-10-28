import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../../styles/variables.css';
import '../../styles/utility.css';
import '../../styles/guildsbuttons.css';
import '../../styles/dashboard.css';

import TwitchPanel from '../twitch/TwitchPanels.js';
import WelcomePanel from '../welcome/WelcomePanel.js';
import WarningsPanel from './Panels/WarningsPanel.js';
import SettingsPanel from './Panels/SettingsPanel.js';
import CommandsPanel from './Panels/CommandsPanel.js';
import MembersPanel from './Panels/MembersPanel.js';
import LogsPanel from './Panels/LogsPanel.js';
import BanListPanel from './Panels/BanListPanel.js';
import TimeoutPanel from './Panels/TimeoutPanel.js';
import OverViewPanel from './Panels/OverviewPanel.js';
import RolesPanel from './Panels/RolesPanel.js';
import ServerInfoPanel from './Panels/ServerInfoPanel.js';
import AutoModPanel from './Panels/AutoMods.js';
import ControlPanelLogsPanel from './Panels/ControlPanelLogsPanel.js';
import ModActionsPanel from './Panels/ModActionsPanel.js';

import DashboardTabs from './Tabs/DashboardTabs.js';
import GeneralTabs from './Tabs/GeneralTabs.js';
import SecurityTabs from './Tabs/SecurityTabs.js';
import ModerationTabs from './Tabs/ModerationTabs.js';
import NotificationTabs from './Tabs/NotificationTabs.js';

const settingFields = [
    {
        key: 'autoroleID',
        label: 'Auto role',
        endpoint: '/api/autorole',
        source: 'roles',
        emptyText: 'No role',
    },
    {
        key: 'botroleID',
        label: 'Bot role',
        endpoint: '/api/botrole',
        source: 'roles',
        emptyText: 'No bot role selected',
    },
    {
        key: 'welcomeChannelID',
        label: 'Welcome channel',
        endpoint: '/api/welcomechannel',
        source: 'channels',
        emptyText: 'No Welcome Channel selected',
    },
    {
        key: 'logChannelID',
        label: 'Log channel',
        endpoint: '/api/logchannel',
        source: 'channels',
        emptyText: 'No Log Channel selected',
    },
    {
        key: 'eventChannelID',
        label: 'Event channel',
        endpoint: '/api/eventchannel',
        source: 'channels',
        emptyText: 'No Event Channel selected',
    },
    {
        key: 'messageLogChannelID',
        label: 'Message log channel',
        endpoint: '/api/messagelogchannel',
        source: 'channels',
        emptyText: 'No Message Log Channel selected',
    },
];

const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    (isLocalhost
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : window.location.origin);

async function requestJSON(url, options = {}) {
    const apiURL = url.startsWith('/api') ? `${API_BASE_URL}${url}` : url;

    const response = await fetch(apiURL, {
        ...options,
        credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error ||
                'Something went wrong while fetching data from the server.'
        );
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

    const [controlPanelLogs, setControlPanelLogs] = useState([]);
    const [controlPanelLogsLoading, setControlPanelLogsLoading] =
        useState(false);
    const [controlPanelLogsError, setControlPanelLogsError] = useState('');

    const fetchControlPanelLogs = useCallback(async () => {
        if (!selectedGuildID) {
            setControlPanelLogs([]);
            return;
        }

        setControlPanelLogsLoading(true);
        setControlPanelLogsError('');

        try {
            const apiURL = `/api/control-panel-logs/${selectedGuildID}`;

            const response = await fetch(apiURL, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Could not load Control Panel Logs.');
            }

            const data = await response.json();

            setControlPanelLogs(data.logs || []);
        } catch (error) {
            console.error('Error fetching Control Panel Logs:', error);
            setControlPanelLogsError(error.message);
        } finally {
            setControlPanelLogsLoading(false);
        }
    }, [selectedGuildID]);

    const deleteControlPanelLogs = useCallback(async (guildID) => {
        if (!guildID) return;

        setControlPanelLogsLoading(true);
        setControlPanelLogsError('');

        try {
            const response = await fetch(`/api/control-panel-logs/${guildID}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Could not delete Control Panel Logs.'
                );
            }

            setControlPanelLogs([]);
        } catch (error) {
            console.error('Error deleting Control Panel Logs:', error);
            setControlPanelLogsError(error.message);
        } finally {
            setControlPanelLogsLoading(false);
        }
    }, []);

    const toggleRoleMembers = async (roleID) => {
        if (expandedRoleID === roleID) {
            setExpandedRoleID(null);
            return;
        }

        setExpandedRoleID(roleID);

        // Bruk tidligere hentede data hvis de finnes.
        if (roleMembers[roleID]) return;

        setRoleMembersLoading((current) => ({
            ...current,
            [roleID]: true,
        }));

        try {
            const data = await requestJSON(
                `/api/roles/${selectedGuildID}/${roleID}/members`
            );

            setRoleMembers((current) => ({
                ...current,
                [roleID]: data.members || [],
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setRoleMembersLoading((current) => ({
                ...current,
                [roleID]: false,
            }));
        }
    };

    const [logSettings, setLogSettings] = useState({
        memberJoined: { enabled: false, channelID: '' },
        memberLeft: { enabled: false, channelID: '' },
        memberKicked: { enabled: false, channelID: '' },
        memberBanned: { enabled: false, channelID: '' },
        memberUnbanned: { enabled: false, channelID: '' },
        timeoutGiven: { enabled: false, channelID: '' },
        timeoutRemoved: { enabled: false, channelID: '' },
        roleGiven: { enabled: false, channelID: '' },
        roleRemoved: { enabled: false, channelID: '' },
        nicknameChanged: { enabled: false, channelID: '' },
        messageDeleted: { enabled: false, channelID: '' },
        messageEdited: { enabled: false, channelID: '' },
        memberJoinedVoice: { enabled: false, channelID: '' },
        memberLeftVoice: { enabled: false, channelID: '' },
        memberMovedVoice: { enabled: false, channelID: '' },
        memberSwitchedVoice: { enabled: false, channelID: '' },
        voiceMute: { enabled: false, channelID: '' },
        voiceDeafen: { enabled: false, channelID: '' },
        channelCreated: { enabled: false, channelID: '' },
        channelDeleted: { enabled: false, channelID: '' },
        channelUpdated: { enabled: false, channelID: '' },
        threadCreated: { enabled: false, channelID: '' },
        threadDeleted: { enabled: false, channelID: '' },
        threadUpdated: { enabled: false, channelID: '' },
        channelPermissionsUpdated: { enabled: false, channelID: '' },
        roleCreated: { enabled: false, channelID: '' },
        roleDeleted: { enabled: false, channelID: '' },
        roleUpdated: { enabled: false, channelID: '' },
        serverUpdated: { enabled: false, channelID: '' },
        moderationCommandUsed: { enabled: false, channelID: '' },
        serverInvites: { enabled: false, channelID: '' },
    });
    const [timeoutMembers, setTimeoutMembers] = useState([]);
    const [timeoutMembersLoading, setTimeoutMembersLoading] = useState(false);
    const [timeoutHistory, setTimeoutHistory] = useState([]);
    const [timeoutHistoryLoading, setTimeoutHistoryLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [channels, setChannels] = useState([]);
    const [roleMembers, setRoleMembers] = useState({});
    const [expandedRoleID, setExpandedRoleID] = useState(null);
    const [roleMembersLoading, setRoleMembersLoading] = useState({});

    const [settings, setSettings] = useState({
        autoroleID: '',
        botroleID: '',
        welcomeChannelID: '',
        logChannelID: '',
        eventChannelID: '',
        messageLogChannelID: '',
    });

    const [warnings, setWarnings] = useState([]);
    const [bans, setBans] = useState([]);
    const [commands, setCommands] = useState([]);
    const [twitchSettings, setTwitchSettings] = useState({
        enabled: false,
        streamers: [],
        channelID: '',
        message: '{streamer} is now live playing {game}',
        mentionRoleID: '',
    });
    const loadTimeoutHistory = async (guildID) => {
        if (!guildID) {
            setTimeoutHistory([]);
            return;
        }

        setTimeoutHistoryLoading(true);

        try {
            const data = await requestJSON(`/api/timeouts/history/${guildID}`);

            setTimeoutHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('[Timeout History] Failed to load:', error);
            setTimeoutHistory([]);
            setError(error.message);
        } finally {
            setTimeoutHistoryLoading(false);
        }
    };

    const refreshBans = useCallback(async () => {
        const data = await requestJSON(`/api/bans/${selectedGuildID}`);
        setBans(data);
    }, [selectedGuildID]);

    const [welcomeSettings, setWelcomeSettings] = useState({
        enabled: false,

        channelID: '',

        title: 'Velkommen!',

        message: '{user} joined the server!',

        color: '#57F287',

        thumbnail: '',

        mention: true,
    });

    const [activeCategory, setActiveCategory] = useState('General');
    const [activeGeneralTab, setActiveGeneralTab] = useState('Overview');
    const [activeSecurityTab, setActiveSecurityTab] = useState('Warnings');
    const [activeModerationTab, setActiveModerationTab] = useState('Logs');
    const [activeNotificationTab, setActiveNotificationTab] =
        useState('Twitch');

    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (
            activeCategory !== 'Security' ||
            activeSecurityTab !== 'User Timeouts' ||
            !selectedGuildID
        ) {
            return;
        }

        let cancelled = false;

        async function loadTimeoutMembers() {
            setTimeoutMembersLoading(true);

            try {
                const data = await requestJSON(
                    `/api/timeouts/members/${selectedGuildID}`
                );

                if (!cancelled) {
                    setTimeoutMembers(data);
                    setError('');
                }
            } catch (err) {
                console.error('[Timeout UI] Fetch failed:', err);

                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setTimeoutMembersLoading(false);
                }
            }
        }

        loadTimeoutMembers();
        loadTimeoutHistory(selectedGuildID);

        return () => {
            cancelled = true;
        };
    }, [activeCategory, activeSecurityTab, selectedGuildID]);

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

    const selectGuild = useCallback(async (guildID, resetPage = true) => {
        setSelectedGuildID(guildID);

        if (resetPage) {
            setPage(1);
        }

        setMembers([]);
        setRoles([]);
        setChannels([]);
        setWarnings([]);
        setBans([]);
        setStatus('');
        setError('');
        setLoading(true);

        try {
            const [
                rolesData,
                channelsData,
                settingsData,
                warningsData,
                twitchData,
                welcomeData,
                logSettingsData,
            ] = await Promise.all([
                requestJSON(`/api/roles/${guildID}`),
                requestJSON(`/api/channels/${guildID}`),
                requestJSON(`/api/settings/${guildID}`),
                requestJSON(`/api/warnings/${guildID}`),
                requestJSON(`/api/twitch/${guildID}`),
                requestJSON(`/api/welcome/${guildID}`),
                requestJSON(`/api/logs/${guildID}`),
            ]);

            setRoles(rolesData);
            setChannels(channelsData);
            setWarnings(warningsData);
            setTwitchSettings(twitchData);
            setWelcomeSettings(welcomeData);

            setLogSettings({
                memberJoined: {
                    enabled: Boolean(logSettingsData.memberJoined?.enabled),
                    channelID: logSettingsData.memberJoined?.channelID || '',
                },
                memberLeft: {
                    enabled: Boolean(logSettingsData.memberLeft?.enabled),
                    channelID: logSettingsData.memberLeft?.channelID || '',
                },
                memberKicked: {
                    enabled: Boolean(logSettingsData.memberKicked?.enabled),
                    channelID: logSettingsData.memberKicked?.channelID || '',
                },
                memberBanned: {
                    enabled: Boolean(logSettingsData.memberBanned?.enabled),
                    channelID: logSettingsData.memberBanned?.channelID || '',
                },
                memberUnbanned: {
                    enabled: Boolean(logSettingsData.memberUnbanned?.enabled),
                    channelID: logSettingsData.memberUnbanned?.channelID || '',
                },
                timeoutGiven: {
                    enabled: Boolean(logSettingsData.timeoutGiven?.enabled),
                    channelID: logSettingsData.timeoutGiven?.channelID || '',
                },
                timeoutRemoved: {
                    enabled: Boolean(logSettingsData.timeoutRemoved?.enabled),
                    channelID: logSettingsData.timeoutRemoved?.channelID || '',
                },
                roleGiven: {
                    enabled: Boolean(logSettingsData.roleGiven?.enabled),
                    channelID: logSettingsData.roleGiven?.channelID || '',
                },
                roleRemoved: {
                    enabled: Boolean(logSettingsData.roleRemoved?.enabled),
                    channelID: logSettingsData.roleRemoved?.channelID || '',
                },
                nicknameChanged: {
                    enabled: Boolean(logSettingsData.nicknameChanged?.enabled),
                    channelID: logSettingsData.nicknameChanged?.channelID || '',
                },
                messageDeleted: {
                    enabled: Boolean(logSettingsData.messageDeleted?.enabled),
                    channelID: logSettingsData.messageDeleted?.channelID || '',
                },
                messageEdited: {
                    enabled: Boolean(logSettingsData.messageEdited?.enabled),
                    channelID: logSettingsData.messageEdited?.channelID || '',
                },
                memberJoinedVoice: {
                    enabled: Boolean(
                        logSettingsData.memberJoinedVoice?.enabled
                    ),
                    channelID:
                        logSettingsData.memberJoinedVoice?.channelID || '',
                },
                memberLeftVoice: {
                    enabled: Boolean(logSettingsData.memberLeftVoice?.enabled),
                    channelID: logSettingsData.memberLeftVoice?.channelID || '',
                },
                memberMovedVoice: {
                    enabled: Boolean(logSettingsData.memberMovedVoice?.enabled),
                    channelID:
                        logSettingsData.memberMovedVoice?.channelID || '',
                },
                memberSwitchedVoice: {
                    enabled: Boolean(
                        logSettingsData.memberSwitchedVoice?.enabled
                    ),
                    channelID:
                        logSettingsData.memberSwitchedVoice?.channelID || '',
                },
                voiceMute: {
                    enabled: Boolean(logSettingsData.voiceMute?.enabled),
                    channelID: logSettingsData.voiceMute?.channelID || '',
                },
                voiceDeafen: {
                    enabled: Boolean(logSettingsData.voiceDeafen?.enabled),
                    channelID: logSettingsData.voiceDeafen?.channelID || '',
                },
                channelCreated: {
                    enabled: Boolean(logSettingsData.channelCreated?.enabled),
                    channelID: logSettingsData.channelCreated?.channelID || '',
                },
                channelDeleted: {
                    enabled: Boolean(logSettingsData.channelDeleted?.enabled),
                    channelID: logSettingsData.channelDeleted?.channelID || '',
                },
                channelUpdated: {
                    enabled: Boolean(logSettingsData.channelUpdated?.enabled),
                    channelID: logSettingsData.channelUpdated?.channelID || '',
                },
                threadCreated: {
                    enabled: Boolean(logSettingsData.threadCreated?.enabled),
                    channelID: logSettingsData.threadCreated?.channelID || '',
                },
                threadDeleted: {
                    enabled: Boolean(logSettingsData.threadDeleted?.enabled),
                    channelID: logSettingsData.threadDeleted?.channelID || '',
                },
                threadUpdated: {
                    enabled: Boolean(logSettingsData.threadUpdated?.enabled),
                    channelID: logSettingsData.threadUpdated?.channelID || '',
                },
                channelPermissionsUpdated: {
                    enabled: Boolean(
                        logSettingsData.channelPermissionsUpdated?.enabled
                    ),
                    channelID:
                        logSettingsData.channelPermissionsUpdated?.channelID ||
                        '',
                },

                roleCreated: {
                    enabled: Boolean(logSettingsData.roleCreated?.enabled),
                    channelID: logSettingsData.roleCreated?.channelID || '',
                },
                roleDeleted: {
                    enabled: Boolean(logSettingsData.roleDeleted?.enabled),
                    channelID: logSettingsData.roleDeleted?.channelID || '',
                },
                roleUpdated: {
                    enabled: Boolean(logSettingsData.roleUpdated?.enabled),
                    channelID: logSettingsData.roleUpdated?.channelID || '',
                },
                serverUpdated: {
                    enabled: Boolean(logSettingsData.serverUpdated?.enabled),
                    channelID: logSettingsData.serverUpdated?.channelID || '',
                },
                moderationCommandUsed: {
                    enabled: Boolean(
                        logSettingsData.moderationCommandUsed?.enabled
                    ),
                    channelID:
                        logSettingsData.moderationCommandUsed?.channelID || '',
                },
                serverInvites: {
                    enabled: Boolean(logSettingsData.serverInvites?.enabled),
                    channelID: logSettingsData.serverInvites?.channelID || '',
                },
            });

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
    }, []);

    useEffect(() => {
        if (!selectedGuildID) {
            setMembers([]);
            setTotalPages(1);
            return;
        }

        let cancelled = false;

        async function loadMembers() {
            try {
                const data = await requestJSON(
                    `/api/members/${selectedGuildID}?page=${page}`
                );

                if (!cancelled) {
                    setMembers(data.members);
                    setTotalPages(data.totalPages);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[Dashboard] Failed to load members:', err);
                    setError(err.message);
                }
            }
        }

        loadMembers();

        return () => {
            cancelled = true;
        };
    }, [selectedGuildID, page]);

    async function saveSetting(field) {
        if (!selectedGuildID || !settings[field.key]) return;

        setSavingKey(field.key);
        setStatus('');
        setError('');

        try {
            await requestJSON(field.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

            setStatus(`${field.label} is saved`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingKey('');
        }
    }

    async function saveLogSettings() {
        if (!selectedGuildID) return;

        setSavingKey('memberLogs');
        setStatus('');
        setError('');

        try {
            await requestJSON('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guildID: selectedGuildID,
                    logSettings,
                }),
            });

            setStatus('Member log settings saved');
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingKey('');
        }
    }

    async function saveTwitchSettings() {
        if (!selectedGuildID) return;

        setStatus('Twitch settings saved');
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

            setStatus('Twitch settings saved');
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

            setStatus('Test notification sent');
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

            setStatus('Welcome settings has been saved');
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

            setStatus('Test welcome sent');
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleGiveTimeout({ memberId, durationSeconds, reason }) {
        try {
            await requestJSON('/api/timeouts/give', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guildID: selectedGuildID,
                    memberId,
                    durationSeconds,
                    reason,
                }),
            });

            setStatus('Timeout given successfully');
            setError('');

            await Promise.all([
                loadTimeoutHistory(selectedGuildID),
                requestJSON(`/api/timeouts/members/${selectedGuildID}`).then(
                    (data) => setTimeoutMembers(data)
                ),
            ]);
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleRemoveTimeout({ memberId, reason }) {
        try {
            await requestJSON('/api/timeouts/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guildID: selectedGuildID,
                    memberId,
                    reason,
                }),
            });

            setStatus('Timeout removed successfully');
            setError('');

            await Promise.all([
                loadTimeoutHistory(selectedGuildID),
                requestJSON(`/api/timeouts/members/${selectedGuildID}`).then(
                    (data) => setTimeoutMembers(data)
                ),
            ]);
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
                    <p className="dashboard-kicker color-primary">
                        DiscordBot dashboard
                    </p>
                    <h2 className="mb-2 color-primary">Server settings</h2>
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
                            <h3>Choose a server</h3>
                            <p>
                                Here you can manage roles, channels and view
                                members from the same place.
                            </p>
                        </div>
                    )}
                    {selectedGuild && (
                        <>
                            <DashboardTabs
                                activeTab={activeCategory}
                                setActiveTab={setActiveCategory}
                            />

                            {activeCategory === 'General' && (
                                <>
                                    <GeneralTabs
                                        activeTab={activeGeneralTab}
                                        setActiveTab={setActiveGeneralTab}
                                    />

                                    {activeGeneralTab === 'Overview' && (
                                        <OverViewPanel
                                            ChatMessages={0}
                                            MemberCount={
                                                selectedGuild.memberCount ??
                                                members.length
                                            }
                                            Joins={0}
                                            Leaves={0}
                                        />
                                    )}

                                    {activeGeneralTab === 'Commands' && (
                                        <CommandsPanel commands={commands} />
                                    )}

                                    {activeGeneralTab === 'Members' && (
                                        <MembersPanel
                                            members={members}
                                            page={page}
                                            totalPages={totalPages}
                                            setPage={setPage}
                                        />
                                    )}

                                    {activeGeneralTab === 'Roles' && (
                                        <RolesPanel
                                            roles={roles}
                                            totalMembers={
                                                selectedGuild?.memberCount ?? 0
                                            }
                                            expandedRoleID={expandedRoleID}
                                            roleMembers={roleMembers}
                                            roleMembersLoading={
                                                roleMembersLoading
                                            }
                                            onToggleRole={toggleRoleMembers}
                                        />
                                    )}

                                    {activeGeneralTab === 'Server Info' && (
                                        <ServerInfoPanel
                                            guild={selectedGuild}
                                            roles={roles}
                                            members={members}
                                        />
                                    )}
                                </>
                            )}
                            {activeCategory === 'Security' && (
                                <>
                                    <SecurityTabs
                                        activeTab={activeSecurityTab}
                                        setActiveTab={setActiveSecurityTab}
                                    />

                                    {activeSecurityTab === 'Warnings' && (
                                        <WarningsPanel
                                            warnings={warnings}
                                            selectedGuildID={selectedGuildID}
                                            selectGuild={selectGuild}
                                        />
                                    )}

                                    {activeSecurityTab === 'Ban List' && (
                                        <BanListPanel
                                            bans={bans}
                                            selectedGuildID={selectedGuildID}
                                            refreshBans={refreshBans}
                                        />
                                    )}
                                    {activeSecurityTab === 'User Timeouts' && (
                                        <TimeoutPanel
                                            members={timeoutMembers}
                                            loading={timeoutMembersLoading}
                                            selectedGuildID={selectedGuildID}
                                            selectGuild={selectGuild}
                                            onGiveTimeout={handleGiveTimeout}
                                            onRemoveTimeout={
                                                handleRemoveTimeout
                                            }
                                            timeoutHistory={timeoutHistory}
                                            timeoutHistoryLoading={
                                                timeoutHistoryLoading
                                            }
                                        />
                                    )}

                                    {activeSecurityTab ===
                                        'Welcome Messages' && (
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
                                    )}

                                    {activeSecurityTab === 'Auto Roles' && (
                                        <SettingsPanel
                                            settingFields={settingFields.filter(
                                                (field) =>
                                                    field.key ===
                                                        'autoroleID' ||
                                                    field.key === 'botroleID'
                                            )}
                                            settings={settings}
                                            roles={roles}
                                            channels={channels}
                                            updateSetting={updateSetting}
                                            saveSetting={saveSetting}
                                            savingKey={savingKey}
                                        />
                                    )}
                                </>
                            )}

                            {activeCategory === 'Moderation' && (
                                <>
                                    <ModerationTabs
                                        activeTab={activeModerationTab}
                                        setActiveTab={setActiveModerationTab}
                                    />
                                    {activeModerationTab === 'AutoMod' && (
                                        <AutoModPanel
                                            channels={channels}
                                            roles={roles}
                                            selectedGuildID={selectedGuildID}
                                        />
                                    )}
                                    {activeModerationTab ===
                                        'Control Panel Logs' && (
                                        <ControlPanelLogsPanel
                                            logs={controlPanelLogs}
                                            loading={controlPanelLogsLoading}
                                            error={controlPanelLogsError}
                                            onRefresh={fetchControlPanelLogs}
                                            guildID={selectedGuildID}
                                            onDeleteLogs={
                                                deleteControlPanelLogs
                                            }
                                        />
                                    )}
                                    {activeModerationTab === 'Mod Actions' && (
                                        <ModActionsPanel
                                            guildID={selectedGuildID}
                                        />
                                    )}

                                    {activeModerationTab === 'Logs' && (
                                        <LogsPanel
                                            logSettings={logSettings}
                                            setLogSettings={setLogSettings}
                                            channels={channels}
                                            saveLogSettings={saveLogSettings}
                                        />
                                    )}
                                </>
                            )}

                            {activeCategory === 'Notifications' && (
                                <>
                                    <NotificationTabs
                                        activeTab={activeNotificationTab}
                                        setActiveTab={setActiveNotificationTab}
                                    />

                                    {activeNotificationTab === 'Twitch' && (
                                        <div className="twitch-panel">
                                            <div className="panel">
                                                <TwitchPanel
                                                    twitchSettings={
                                                        twitchSettings
                                                    }
                                                    setTwitchSettings={
                                                        setTwitchSettings
                                                    }
                                                    channels={channels}
                                                    saveTwitchSettings={
                                                        saveTwitchSettings
                                                    }
                                                    testTwitchAlert={
                                                        testTwitchAlert
                                                    }
                                                    roles={roles}
                                                    loadStreamer={loadStreamer}
                                                    removeStreamer={
                                                        removeStreamer
                                                    }
                                                    editingStreamer={
                                                        editingStreamer
                                                    }
                                                    setEditingStreamer={
                                                        setEditingStreamer
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {activeCategory === 'Module Settings' && (
                                <SettingsPanel
                                    settingFields={settingFields.filter(
                                        (field) =>
                                            field.key === 'eventChannelID'
                                    )}
                                    settings={settings}
                                    roles={roles}
                                    channels={channels}
                                    updateSetting={updateSetting}
                                    saveSetting={saveSetting}
                                    savingKey={savingKey}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
export default GuildsButton;
