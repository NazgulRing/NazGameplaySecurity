import React, { useMemo, useState } from 'react';
import '../../../styles/timeout.css';

const TIMEOUT_PRESETS = [
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '10 minutes', value: 600 },
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '6 hours', value: 21600 },
    { label: '12 hours', value: 43200 },
    { label: '1 day', value: 86400 },
    { label: '3 days', value: 259200 },
    { label: '1 week', value: 604800 },
    { label: '28 days', value: 2419200 },
];

function getMemberID(member) {
    return member.id || member.user?.id || member.userId;
}

function getMemberName(member) {
    return (
        member.displayName ||
        member.user?.globalName ||
        member.username ||
        member.user?.username ||
        member.tag ||
        member.user?.tag ||
        getMemberID(member) ||
        'Unknown member'
    );
}

function getAvatar(member) {
    if (member.avatar && typeof member.avatar === 'string') {
        return member.avatar;
    }

    const user = member.user || member;

    if (typeof user.displayAvatarURL === 'function') {
        return user.displayAvatarURL({
            extension: 'png',
            size: 128,
        });
    }

    if (typeof user.avatarURL === 'function') {
        return user.avatarURL({
            extension: 'png',
            size: 128,
        });
    }

    return '';
}

function getTimeoutUntil(member) {
    const value =
        member.timeoutUntil ??
        member.communicationDisabledUntilTimestamp ??
        null;

    if (value == null) return null;

    if (typeof value === 'number') {
        return value > 1e12 ? value : value * 1000;
    }

    const timestamp = Date.parse(value);

    return Number.isFinite(timestamp) ? timestamp : null;
}
function formatTimeoutAction(action) {
    const labels = {
        given: 'Timeout Given',
        removed: 'Timeout Removed',
        extended: 'Timeout extended',
    };

    return labels[action] || action || 'Timeout-history';
}

function TimeoutPanel({
    members = [],
    activeTimeouts,
    timeoutHistory = [],
    selectedGuildID,
    selectGuild,
    onGiveTimeout,
    onRemoveTimeout,
    loading = false,
}) {
    const [activeTab, setActiveTab] = useState('active');
    const [selectedMemberID, setSelectedMemberID] = useState('');
    const [durationType, setDurationType] = useState('preset');
    const [presetDuration, setPresetDuration] = useState('600');
    const [days, setDays] = useState('0');
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('5');
    const [reason, setReason] = useState('');
    const [notice, setNotice] = useState(null);
    const [processingID, setProcessingID] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [clearingHistory, setClearingHistory] = useState(false);

    const now = Date.now();

    const eligibleMembers = useMemo(() => {
        return members.filter((member) => {
            const until = getTimeoutUntil(member);

            return !until || Number(until) <= now;
        });
    }, [members, now]);

    const filteredMembers = useMemo(() => {
        const query = memberSearch.trim().toLowerCase();

        return members.filter((member) => {
            const searchableFields = [
                member.displayName,
                member.username,
                member.tag,
                member.id,
            ];

            return searchableFields.some((field) =>
                String(field || '')
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [members, memberSearch]);

    const activeMembers =
        Array.isArray(activeTimeouts) && activeTimeouts.length > 0
            ? activeTimeouts
            : members.filter((member) => {
                  const until = getTimeoutUntil(member);
                  return until && Number(until) > now;
              });

    const durationSeconds =
        durationType === 'preset'
            ? Number(presetDuration)
            : Number(days || 0) * 86400 +
              Number(hours || 0) * 3600 +
              Number(minutes || 0) * 60;

    const showNotice = (type, message) => {
        setNotice({ type, message });
    };

    async function handleGiveTimeout(event) {
        event.preventDefault();
        setNotice(null);

        if (!selectedMemberID) {
            return showNotice('error', 'Please select a member.');
        }

        if (
            !Number.isFinite(durationSeconds) ||
            durationSeconds <= 0 ||
            durationSeconds > 2419200
        ) {
            return showNotice(
                'error',
                'Choose a duration between 1 second and 28 days.'
            );
        }

        if (!onGiveTimeout) {
            return showNotice(
                'error',
                'The give-timeout API has not been connected yet.'
            );
        }

        setSubmitting(true);

        try {
            await onGiveTimeout({
                memberId: selectedMemberID,
                durationSeconds,
                reason: reason.trim(),
            });

            if (selectGuild) {
                await selectGuild(selectedGuildID, false);
            }

            setSelectedMemberID('');
            setReason('');
            showNotice('success', 'Timeout applied successfully.');
        } catch (error) {
            showNotice('error', `Could not give timeout: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    }
    async function handleClearHistory() {
        if (!selectedGuildID || clearingHistory) return;

        const confirmed = window.confirm(
            'Are you sure you want to clear all timeout history? This cannot be undone.'
        );

        if (!confirmed) return;

        setClearingHistory(true);
        setNotice(null);

        try {
            const response = await fetch(
                `/api/timeouts/history/${selectedGuildID}`,
                { method: 'DELETE' }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Failed to clear timeout history.'
                );
            }

            if (selectGuild) {
                await selectGuild(selectedGuildID, false);
            }

            showNotice('success', 'Timeout history cleared successfully.');
        } catch (error) {
            showNotice(
                'error',
                error.message || 'Failed to clear timeout history.'
            );
        } finally {
            setClearingHistory(false);
        }
    }

    async function handleRemoveTimeout(member) {
        const memberID = getMemberID(member);

        if (!memberID) {
            return showNotice('error', 'Could not identify this member.');
        }

        if (!onRemoveTimeout) {
            return showNotice(
                'error',
                'The remove-timeout API has not been connected yet.'
            );
        }

        const confirmed = window.confirm(
            `Remove the timeout from ${getMemberName(member)}?`
        );

        if (!confirmed) return;

        setProcessingID(memberID);
        setNotice(null);

        try {
            await onRemoveTimeout({
                memberId: memberID,
                reason: reason.trim(),
            });

            if (selectGuild) {
                await selectGuild(selectedGuildID, false);
            }

            setReason('');
            showNotice('success', 'Timeout removed successfully.');
        } catch (error) {
            showNotice('error', `Could not remove timeout: ${error.message}`);
        } finally {
            setProcessingID(null);
        }
    }

    const tabs = [
        { key: 'active', label: 'Active Timeouts' },
        { key: 'give', label: 'Give Timeout' },
        { key: 'history', label: 'Timeout History' },
    ];

    return (
        <div className="warnings-row">
            <div className="panel warnings-panel timeout-panel">
                {notice && (
                    <div
                        className={`warning-notice warning-notice-${notice.type}`}
                        role="status">
                        {notice.message}
                    </div>
                )}

                <div className="panel-heading">
                    <h3>Timeouts</h3>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => selectGuild?.(selectedGuildID, false)}
                        disabled={loading}>
                        Refresh
                    </button>
                </div>

                <div className="timeout-tabs">
                    {tabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.key}
                            className={
                                activeTab === tab.key
                                    ? 'secondary-button timeout-tab timeout-tab-active'
                                    : 'secondary-button timeout-tab'
                            }
                            onClick={() => {
                                setActiveTab(tab.key);
                                setNotice(null);
                            }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading && (
                    <p className="muted-text">Loading timeout data...</p>
                )}
                {!loading && activeTab === 'active' && (
                    <div className="timeout-active-list">
                        {activeMembers.length === 0 ? (
                            <p className="muted-text">No active timeouts.</p>
                        ) : (
                            <ul className="warning-list">
                                {activeMembers.map((member) => {
                                    const memberID = getMemberID(member);
                                    const timeoutUntil =
                                        getTimeoutUntil(member);

                                    return (
                                        <li key={memberID}>
                                            <div className="warning-user">
                                                {getAvatar(member) ? (
                                                    <img
                                                        className="timeout-history-avatar"
                                                        src={getAvatar(member)}
                                                        alt={getMemberName(
                                                            member
                                                        )}
                                                        width={40}
                                                        height={40}
                                                    />
                                                ) : (
                                                    <div className="timeout-avatar-fallback">
                                                        {getMemberName(member)
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                )}

                                                <div className="warning-details">
                                                    <strong>
                                                        {getMemberName(member)}
                                                    </strong>

                                                    <p>
                                                        Timeout until:{' '}
                                                        {timeoutUntil
                                                            ? new Date(
                                                                  timeoutUntil
                                                              ).toLocaleString(
                                                                  'en-US'
                                                              )
                                                            : 'Unknown'}
                                                    </p>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            handleRemoveTimeout(
                                                                member
                                                            )
                                                        }
                                                        disabled={
                                                            processingID ===
                                                            memberID
                                                        }>
                                                        {processingID ===
                                                        memberID
                                                            ? 'Removing...'
                                                            : 'Remove Timeout'}
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {!loading && activeTab === 'give' && (
                    <form className="timeout-form" onSubmit={handleGiveTimeout}>
                        <div className="timeout-form-group">
                            <label htmlFor="timeout-member-search">
                                Member
                            </label>

                            <input
                                id="timeout-member-search"
                                type="search"
                                value={memberSearch}
                                onChange={(event) =>
                                    setMemberSearch(event.target.value)
                                }
                                placeholder="Search by username or ID..."
                                autoComplete="off"
                            />

                            <div className="timeout-member-results">
                                {filteredMembers.length === 0 ? (
                                    <p className="timeout-empty">
                                        No members found.
                                    </p>
                                ) : (
                                    filteredMembers.map((member) => {
                                        const id = member.id || member.user?.id;

                                        if (!id) return null;

                                        return (
                                            <button
                                                type="button"
                                                key={id}
                                                className={
                                                    selectedMemberID === id
                                                        ? 'timeout-member-option selected'
                                                        : 'timeout-member-option'
                                                }
                                                onClick={() =>
                                                    setSelectedMemberID(id)
                                                }>
                                                <span>
                                                    {getMemberName(member)}
                                                </span>
                                                <span className="timeout-member-id">
                                                    {id}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {selectedMemberID && (
                                <p className="timeout-selected-member">
                                    Selected:{' '}
                                    {getMemberName(
                                        eligibleMembers.find(
                                            (member) =>
                                                (member.id ||
                                                    member.user?.id) ===
                                                selectedMemberID
                                        ) || { id: selectedMemberID }
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMemberID('')}>
                                        Clear
                                    </button>
                                </p>
                            )}
                        </div>

                        <div className="timeout-form-group">
                            <label>Duration</label>

                            <div className="timeout-radio-row">
                                <label>
                                    <input
                                        type="radio"
                                        checked={durationType === 'preset'}
                                        onChange={() =>
                                            setDurationType('preset')
                                        }
                                    />
                                    Preset
                                </label>

                                <label>
                                    <input
                                        type="radio"
                                        checked={durationType === 'custom'}
                                        onChange={() =>
                                            setDurationType('custom')
                                        }
                                    />
                                    Custom
                                </label>
                            </div>
                        </div>

                        {durationType === 'preset' ? (
                            <div className="timeout-form-group">
                                <label htmlFor="timeout-duration">
                                    Preset duration
                                </label>

                                <select
                                    id="timeout-duration"
                                    value={presetDuration}
                                    onChange={(event) =>
                                        setPresetDuration(event.target.value)
                                    }>
                                    {TIMEOUT_PRESETS.map((preset) => (
                                        <option
                                            key={preset.value}
                                            value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="timeout-duration-inputs">
                                <label>
                                    Days
                                    <input
                                        type="number"
                                        min="0"
                                        max="28"
                                        value={days}
                                        onChange={(event) =>
                                            setDays(event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Hours
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={hours}
                                        onChange={(event) =>
                                            setHours(event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Minutes
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={minutes}
                                        onChange={(event) =>
                                            setMinutes(event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        )}

                        <div className="timeout-form-group">
                            <label htmlFor="timeout-reason">Reason</label>

                            <textarea
                                id="timeout-reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                                placeholder="Enter the reason..."
                                rows={3}
                                maxLength={500}
                            />
                        </div>

                        <button
                            type="submit"
                            className="dashboard-button"
                            disabled={submitting}>
                            {submitting ? 'Applying...' : 'Give Timeout'}
                        </button>
                    </form>
                )}

                {!loading && activeTab === 'history' && (
                    <>
                        <div className="timeout-history-header">
                            <h4>Timeout History</h4>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleClearHistory}
                                disabled={
                                    clearingHistory ||
                                    timeoutHistory.length === 0
                                }>
                                {clearingHistory
                                    ? 'Clearing...'
                                    : 'Clear History'}
                            </button>
                        </div>
                        {timeoutHistory.length === 0 ? (
                            <p className="muted-text">
                                No timeout history on this server.
                            </p>
                        ) : (
                            <ul className="warning-list">
                                {timeoutHistory.map((item, index) => (
                                    <li
                                        key={
                                            item.id ||
                                            `${item.userId}-${item.timestamp}-${index}`
                                        }>
                                        <div className="warning-user">
                                            {item.avatar ? (
                                                <img
                                                    className="timeout-history-avatar"
                                                    src={item.avatar}
                                                    alt={
                                                        item.displayName ||
                                                        item.username ||
                                                        'Member'
                                                    }
                                                    width={40}
                                                    height={40}
                                                    onError={(event) => {
                                                        event.currentTarget.style.display =
                                                            'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="timeout-avatar-fallback">
                                                    {(
                                                        item.displayName ||
                                                        item.username ||
                                                        '?'
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                            )}

                                            <div className="warning-details">
                                                <strong>
                                                    {formatTimeoutAction(
                                                        item.action ||
                                                            item.eventType
                                                    )}
                                                </strong>

                                                <p className="warning-count">
                                                    {item.memberName ||
                                                        item.username ||
                                                        item.userId ||
                                                        'Unknown member'}
                                                </p>

                                                <p>
                                                    Reason:{' '}
                                                    {item.reason ||
                                                        'No reason provided'}
                                                </p>

                                                <p className="warning-date">
                                                    <strong>Date:</strong>{' '}
                                                    {item.timestamp ||
                                                    item.createdAt ||
                                                    item.date
                                                        ? new Date(
                                                              item.timestamp ||
                                                                  item.createdAt ||
                                                                  item.date
                                                          ).toLocaleString()
                                                        : 'Unknown date'}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default TimeoutPanel;
