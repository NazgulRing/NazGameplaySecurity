import React from 'react';
function CommandsPanel({ commands }) {
    return (
        <div className="panel commands-panel">
            <h3>Commands</h3>

            <ul className="command-list">
                {commands.map((command) => (
                    <li key={command.name}>
                        <strong>/{command.name}</strong>

                        <span>{command.description}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CommandsPanel;
