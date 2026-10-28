import React, { useEffect, useState } from 'react';
import '../../../styles/controlpanellogspanel.css';

function ControlPanelLogsPanel({
    logs,
    loading,
    error,
    onRefresh,
    guildID,
    onDeleteLogs,
}) {
    useEffect(() => {
        if (!onRefresh) return;

        const intervalID = setInterval(() => {
            onRefresh();
        }, 10000);

        return () => clearInterval(intervalID);
    }, [onRefresh]);
    const logList = [...(logs || [])].sort(
        (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    const categories = [
        ...new Set(logList.map((log) => log.category || 'GENERAL')),
    ].sort();

    const filteredLogs = logList.filter((log) => {
        const matchesCategory =
            selectedCategory === 'ALL' ||
            (log.category || 'GENERAL') === selectedCategory;

        const searchText = [
            log.username,
            log.userID,
            log.action,
            log.details,
            log.category,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const matchesSearch = searchText.includes(
            searchTerm.trim().toLowerCase()
        );

        return matchesCategory && matchesSearch;
    });

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown time';

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) return 'Unknown time';

        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="panel control-panel-logs-panel">
            <div className="control-panel-logs-header">
                <div>
                    <h3>Control Panel Logs</h3>
                    <p>
                        {logList.length} log
                        {logList.length === 1 ? '' : 's'} recorded
                    </p>
                </div>

                <div className="control-panel-logs-actions">
                    {onRefresh && (
                        <button
                            type="button"
                            className="control-panel-logs-refresh"
                            onClick={onRefresh}
                            disabled={loading}>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    )}

                    {onDeleteLogs && logs?.length > 0 && (
                        <button
                            type="button"
                            className="control-panel-logs-delete"
                            onClick={() => {
                                const confirmed = window.confirm(
                                    'Are you sure you want to permanently delete all Control Panel Logs for this server?'
                                );

                                if (confirmed) {
                                    onDeleteLogs(guildID);
                                }
                            }}
                            disabled={loading}>
                            Delete logs
                        </button>
                    )}
                </div>
            </div>
            <div className="control-panel-logs-filters">
                <input
                    type="search"
                    className="control-panel-logs-search"
                    placeholder="Search user, action, ID or details..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="Search Control Panel Logs"
                />

                <select
                    className="control-panel-logs-category-filter"
                    value={selectedCategory}
                    onChange={(event) =>
                        setSelectedCategory(event.target.value)
                    }
                    aria-label="Filter logs by category">
                    <option value="ALL">All categories</option>

                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {error && <p className="control-panel-logs-error">{error}</p>}

            {loading && logList.length === 0 ? (
                <p className="control-panel-logs-empty">Loading logs...</p>
            ) : filteredLogs.length === 0 ? (
                <p className="control-panel-logs-empty">
                    {logList.length === 0
                        ? 'No control panel logs found.'
                        : 'No logs match your search or category filter.'}
                </p>
            ) : (
                <ul className="control-panel-logs-list">
                    {filteredLogs.map((log) => (
                        <li
                            className="control-panel-log-card"
                            key={log.id || `${log.timestamp}-${log.action}`}>
                            <div className="control-panel-log-top">
                                <span className="control-panel-log-action">
                                    {log.action || 'Unknown action'}
                                </span>

                                <span
                                    className={`control-panel-log-status ${
                                        log.status === 'success'
                                            ? 'status-success'
                                            : 'status-error'
                                    }`}>
                                    {log.status || 'unknown'}
                                </span>
                            </div>

                            <div className="control-panel-log-meta">
                                <span>{log.username || 'Unknown user'}</span>

                                {log.userID && (
                                    <span className="control-panel-log-user-id">
                                        ID: {log.userID}
                                    </span>
                                )}

                                <span className="control-panel-log-category">
                                    {log.category || 'GENERAL'}
                                </span>
                            </div>

                            {log.details && (
                                <p className="control-panel-log-details">
                                    {log.details}
                                </p>
                            )}

                            <time
                                className="control-panel-log-time"
                                dateTime={log.timestamp || undefined}>
                                {formatTimestamp(log.timestamp)}
                            </time>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ControlPanelLogsPanel;
