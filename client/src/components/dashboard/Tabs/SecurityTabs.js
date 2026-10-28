import React from 'react';

function SecurityTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs dashboard-subtabs">
            <button
                className={
                    activeTab === 'Warnings'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Warnings')}>
                Warnings
            </button>

            <button
                className={
                    activeTab === 'Ban List'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Ban List')}>
                Ban List
            </button>

            <button
                className={
                    activeTab === 'User Timeouts'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('User Timeouts')}>
                User Timeouts
            </button>

            <button
                className={
                    activeTab === 'Welcome Messages'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Welcome Messages')}>
                Welcome Messages
            </button>

            <button
                className={
                    activeTab === 'Auto Roles'
                        ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                        : 'dashboard-tab'
                }
                onClick={() => setActiveTab('Auto Roles')}>
                Auto Roles
            </button>
        </div>
    );
}

export default SecurityTabs;
