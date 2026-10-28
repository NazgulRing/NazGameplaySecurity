import React, { useState } from 'react';
import '../../../styles/overviewpanel.css';

function OverviewPanel({ ChatMessages, MemberCount, Joins, Leaves }) {
    const [period, setPeriod] = useState('12H');

    const periods = ['12H', '7D', '14D', '1M', '6M', '1Y'];

    const stats = [
        {
            title: 'New Messages',
            value: ChatMessages ?? 0,
        },
        {
            title: 'Joins / Leaves',
            value: `${Joins ?? 0} / ${Leaves ?? 0}`,
        },
        {
            title: 'Total Members',
            value: MemberCount ?? 0,
        },
    ];

    return (
        <section className="overview-panel">
            <div className="overview-header">
                <h2>Overview</h2>

                <div className="overview-periods">
                    {periods.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={`overview-period ${
                                period === item ? 'active' : ''
                            }`}
                            onClick={() => setPeriod(item)}>
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overview-stats">
                {stats.map((stat) => (
                    <div className="overview-card" key={stat.title}>
                        <h3>{stat.title}</h3>
                        <p className="overview-value">{stat.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default OverviewPanel;
