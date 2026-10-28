import React from 'react';

function NotificationTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs dashboard-subtabs">
            <button
                className={
                    activeTab === 'Twitch'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Twitch')}>
                Twitch
            </button>

            <button
                className={
                    activeTab === 'Youtube'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Youtube')}>
                Youtube
            </button>
        </div>
    );
}

export default NotificationTabs;
