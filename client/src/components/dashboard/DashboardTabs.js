import React from 'react';

function DashboardTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs">
            <button
                className={
                    activeTab === 'settings'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('settings')}>
                Settings
            </button>

            <button
                className={
                    activeTab === 'security'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('security')}>
                Security
            </button>

            <button
                className={
                    activeTab === 'commands'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('commands')}>
                Commands
            </button>

            <button
                className={
                    activeTab === 'Members'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Members')}>
                Members
            </button>

            <button
                className={
                    activeTab === 'twitch'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('twitch')}>
                Twitch
            </button>

            <button
                className={
                    activeTab === 'welcome'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('welcome')}>
                Welcome
            </button>
        </div>
    );
}

export default DashboardTabs;
