import React from 'react';

const tabs = ['Overview', 'Commands', 'Members', 'Roles', 'Server Info'];

function GeneralTabs({ activeTab, setActiveTab }) {
    return (
        <div className="dashboard-tabs dashboard-subtabs">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    type="button"
                    className={
                        activeTab === tab
                            ? 'dashboard-tab dashboard-subtab dashboard-tab-active'
                            : 'dashboard-tab dashboard-subtab'
                    }
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}>
                    {tab}
                </button>
            ))}
        </div>
    );
}

export default GeneralTabs;
