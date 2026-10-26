import React from 'react';

function GeneralTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs">
            <button
                className={
                    activeTab === 'Overview'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Overview')}>
                Overview
            </button>

            <button
                className={
                    activeTab === 'Commands'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Commands')}>
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
                    activeTab === 'Roles'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Roles')}>
                Roles
            </button>

            <button
                className={
                    activeTab === 'Server Info'
                        ? 'dashboard-tab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Server Info')}>
                Server Info
            </button>
        </div>
    );
}

export default GeneralTabs;
