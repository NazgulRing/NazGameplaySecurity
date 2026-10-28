import React, { useState } from 'react';
import '../../../styles/warning.css';

function WarningsPanel({ warnings, selectedGuildID, selectGuild }) {
    const [notice, setNotice] = useState(null);
    const [removingWarningId, setRemovingWarningId] = useState(null);
    return (
        <div className="warnings-row">
            <div className="panel warnings-panel">
                {notice && (
                    <div
                        className={`warning-notice warning-notice-${notice.type}`}
                        role="status">
                        {notice.message}
                    </div>
                )}
                <div className="panel-heading">
                    <h3>Warnings</h3>
                    <button
                        className="secondary-button"
                        onClick={() => selectGuild(selectedGuildID, false)}>
                        Refresh
                    </button>
                </div>

                {warnings.length === 0 && (
                    <p className="muted-text">No Warnings on this server.</p>
                )}

                <ul className="warning-list">
                    {warnings.map((warningUser) => (
                        <li key={warningUser.userId}>
                            <div className="warning-user">
                                <img
                                    src={warningUser.avatar}
                                    alt={warningUser.username}
                                    width={40}
                                    height={40}
                                />

                                <div className="warning-details">
                                    <strong>
                                        {warningUser.tag ||
                                            warningUser.username}
                                    </strong>

                                    <p className="warning-count">
                                        {warningUser.count} warning(s)
                                    </p>
                                </div>
                            </div>

                            {warningUser.warnings?.length > 0 && (
                                <ul className="warning-detail-list">
                                    {warningUser.warnings.map(
                                        (warning, index) => (
                                            <li
                                                key={`${warningUser.userId}-${warning.createdAt || index}`}
                                                className="warning-detail-item">
                                                <div className="warning-detail-header">
                                                    <strong>
                                                        Warning #{index + 1}
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        className="warning-remove-button"
                                                        onClick={async () => {
                                                            const confirmed =
                                                                window.confirm(
                                                                    `Remove Warning #${index + 1} from ${
                                                                        warningUser.tag ||
                                                                        warningUser.username
                                                                    }?`
                                                                );

                                                            if (!confirmed)
                                                                return;

                                                            setRemovingWarningId(
                                                                warning.id
                                                            );
                                                            setNotice(null);

                                                            try {
                                                                const response =
                                                                    await fetch(
                                                                        `/api/warnings/${selectedGuildID}/${warningUser.userId}/${warning.id}`,
                                                                        {
                                                                            method: 'DELETE',
                                                                        }
                                                                    );

                                                                const result =
                                                                    await response.json();

                                                                if (
                                                                    !response.ok
                                                                ) {
                                                                    throw new Error(
                                                                        result.error ||
                                                                            'Failed to remove warning'
                                                                    );
                                                                }

                                                                await selectGuild(
                                                                    selectedGuildID,
                                                                    false
                                                                );

                                                                setNotice({
                                                                    type: result.dmSent
                                                                        ? 'success'
                                                                        : 'warning',
                                                                    message:
                                                                        result.dmSent
                                                                            ? 'Warning removed successfully. The user was notified by DM.'
                                                                            : 'Warning removed, but the DM could not be delivered.',
                                                                });
                                                            } catch (error) {
                                                                setNotice({
                                                                    type: 'error',
                                                                    message: `Could not remove warning: ${error.message}`,
                                                                });
                                                            } finally {
                                                                setRemovingWarningId(
                                                                    null
                                                                );
                                                            }
                                                        }}
                                                        disabled={
                                                            removingWarningId ===
                                                            warning.id
                                                        }>
                                                        {removingWarningId ===
                                                        warning.id
                                                            ? 'Removing...'
                                                            : 'Remove'}
                                                    </button>
                                                </div>

                                                <div className="warning-detail-content">
                                                    <div className="warning-reason">
                                                        <strong>Reason</strong>
                                                        <p>
                                                            {warning.reason?.trim() ||
                                                                'No reason provided'}
                                                        </p>
                                                    </div>

                                                    <p className="warning-date">
                                                        <strong>Date:</strong>{' '}
                                                        {warning.createdAt
                                                            ? new Date(
                                                                  warning.createdAt
                                                              ).toLocaleString()
                                                            : 'Unknown date'}
                                                    </p>
                                                </div>
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default WarningsPanel;
