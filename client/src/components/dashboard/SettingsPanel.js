import React from 'react';
function SettingsPanel({
    settingFields,
    settings,
    roles,
    channels,
    updateSetting,
    saveSetting,
    savingKey,
}) {
    return (
        <div className="settings-grid">
            {settingFields.map((field) => {
                const options = field.source === 'roles' ? roles : channels;

                return (
                    <div className="setting-card" key={field.key}>
                        <label htmlFor={field.key}>{field.label}</label>

                        <div className="setting-row">
                            <select
                                id={field.key}
                                value={settings[field.key]}
                                onChange={(event) =>
                                    updateSetting(field.key, event.target.value)
                                }>
                                <option value="">{field.emptyText}</option>

                                {options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {field.source === 'channels'
                                            ? `#${option.name}`
                                            : option.name}

                                        {option.editable === false
                                            ? ' (kan ikke tildeles)'
                                            : ''}
                                    </option>
                                ))}
                            </select>

                            <button
                                className="dashboard-button"
                                onClick={() => saveSetting(field)}
                                disabled={
                                    !settings[field.key] ||
                                    savingKey === field.key
                                }>
                                {savingKey === field.key
                                    ? 'Lagrer...'
                                    : 'Lagre'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default SettingsPanel;
