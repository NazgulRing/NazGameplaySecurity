import React, { useCallback, useEffect, useState } from 'react';

function BanListPanel({ bans, selectedGuildID, refreshBans }) {
    const [unbanningUserId, setUnbanningUserId] = useState(null);
    async function unbanUser(ban) {
        const confirmed = window.confirm(
            `Are you sure you want to unban ${ban.tag || ban.username}?`
        );

        if (!confirmed) return;

        setUnbanningUserId(ban.userId);
        setError('');

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`}/api/bans/${selectedGuildID}/${ban.userId}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Could not unban user.');
            }

            await refreshBans();
        } catch (err) {
            setError(err.message || 'Could not unban user.');
        } finally {
            setUnbanningUserId(null);
        }
    }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadBans = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            await refreshBans();
        } catch (err) {
            setError(err.message || 'Could not load ban list.');
        } finally {
            setLoading(false);
        }
    }, [refreshBans]);

    useEffect(() => {
        if (selectedGuildID) {
            loadBans();
        }
    }, [selectedGuildID, loadBans]);

    return (
        <div className="warnings-row">
            <div className="panel warnings-panel">
                <div className="panel-heading">
                    <div>
                        <h3>Ban List</h3>
                        <p>View banned users and ban details.</p>
                    </div>

                    <button
                        className="secondary-button"
                        onClick={loadBans}
                        disabled={loading}>
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <p className="dashboard-alert dashboard-alert-error">
                        {error}
                    </p>
                )}

                {!loading && !error && bans.length === 0 && (
                    <p className="muted-text">
                        No banned users found on this server.
                    </p>
                )}

                <ul className="warning-list">
                    {bans.map((ban) => (
                        <li key={ban.userId} className="warning-detail-item">
                            <div className="warning-detail-header">
                                <div className="warning-user">
                                    <img
                                        src={ban.avatar}
                                        alt={ban.username}
                                        width={40}
                                        height={40}
                                    />

                                    <div className="warning-details">
                                        <strong>
                                            {ban.tag || ban.username}
                                        </strong>
                                        <p className="warning-count">
                                            User ID: {ban.userId}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="warning-remove-button"
                                    onClick={() => unbanUser(ban)}
                                    disabled={unbanningUserId === ban.userId}>
                                    {unbanningUserId === ban.userId
                                        ? 'Unbanning...'
                                        : 'Unban'}
                                </button>
                            </div>

                            <div className="warning-detail-content">
                                <div className="warning-reason">
                                    <strong>Reason</strong>
                                    <p>{ban.reason || 'No reason provided'}</p>
                                </div>

                                <p className="warning-date">
                                    <strong>Date:</strong>{' '}
                                    {ban.bannedAt
                                        ? new Date(
                                              ban.bannedAt
                                          ).toLocaleString()
                                        : 'Unknown date'}
                                </p>

                                <p className="warning-date">
                                    <strong>Banned by:</strong>{' '}
                                    {ban.moderatorTag ||
                                        ban.moderatorId ||
                                        'Unknown moderator'}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default BanListPanel;
