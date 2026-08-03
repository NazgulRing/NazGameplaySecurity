import React from 'react';

function SecurityPanel({ warnings, selectedGuildID, selectGuild }) {
    return (
        <div className="warnings-row">
            <div className="panel warnings-panel">
                <div className="panel-heading">
                    <h3>Warnings</h3>

                    <button
                        className="secondary-button"
                        onClick={() => selectGuild(selectedGuildID, false)}>
                        Refresh
                    </button>
                </div>

                {warnings.length === 0 && (
                    <p className="muted-text">
                        Ingen warnings på denne serveren.
                    </p>
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
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SecurityPanel;
