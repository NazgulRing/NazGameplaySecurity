import React from 'react';

function ModerationTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs dashboard-subtabs">
            <button
                className={
                    activeTab === 'Logs'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Logs')}>
                Logs
            </button>

            <button
                className={
                    activeTab === 'AutoMod'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('AutoMod')}>
                AutoMod
            </button>

            <button
                className={
                    activeTab === 'Control Panel Logs'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Control Panel Logs')}>
                Control Panel Logs
            </button>

            <button
                className={
                    activeTab === 'Mod Actions'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Mod Actions')}>
                Mod Actions
            </button>
        </div>
    );
}

export default ModerationTabs;
