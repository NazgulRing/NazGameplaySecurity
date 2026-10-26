import React from 'react';

function DashboardTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs">
            <button
                className={
                    activeTab === 'General'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('General')}>
                General
            </button>

            <button
                className={
                    activeTab === 'Security'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Security')}>
                Security
            </button>

            <button
                className={
                    activeTab === 'Moderation'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Moderation')}>
                Moderation
            </button>

            <button
                className={
                    activeTab === 'Notifications'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Notifications')}>
                Notifications
            </button>

            <button
                className={
                    activeTab === 'Module Settings'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Module Settings')}>
                Module Settings
            </button>
        </div>
    );
}

export default DashboardTabs;
