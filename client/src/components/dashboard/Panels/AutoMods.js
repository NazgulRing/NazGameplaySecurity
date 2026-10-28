import React, { useEffect, useRef, useState } from 'react';
import '../../../styles/automod.css';

const RULES = [
    {
        id: 'spam',
        label: 'Spam',
        description: 'Detect excessive message spam.',
    },
    {
        id: 'badWords',
        label: 'Bad Words',
        description: 'Detect prohibited words and phrases.',
    },
    {
        id: 'duplicatedText',
        label: 'Duplicated Text',
        description: 'Detect duplicate message content.',
    },
    {
        id: 'repeatedMessages',
        label: 'Repeated Messages',
        description: 'Detect repeated messages from the same member.',
    },
    {
        id: 'discordInvites',
        label: 'Discord Invites',
        description: 'Detect Discord server invitations.',
    },
    { id: 'links', label: 'Links', description: 'Detect links in messages.' },
    {
        id: 'spammedCaps',
        label: 'Spammed Caps',
        description: 'Detect excessive use of capital letters.',
    },
    {
        id: 'emojiSpam',
        label: 'Emoji Spam',
        description: 'Detect excessive emoji usage.',
    },
    {
        id: 'massMention',
        label: 'Mass Mention',
        description: 'Detect excessive member and role mentions.',
    },
];

const createRuleSettings = () =>
    Object.fromEntries(
        RULES.map(({ id }) => [
            id,
            {
                enabled: false,
                blockMessage: true,
                muteMember: false,
                disabledChannels: [],
                disabledRoles: [],
            },
        ])
    );

function Toggle({ checked, onChange, label }) {
    return (
        <button
            type="button"
            className={`automod-toggle ${checked ? 'is-enabled' : ''}`}
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}>
            <span className="automod-toggle-thumb" />
        </button>
    );
}

function MultiSelect({ label, options = [], value = [], onChange, id }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const selectedOptions = options.filter((option) =>
        value.includes(option.id)
    );

    const filteredOptions = options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase())
    );

    function toggleOption(optionId) {
        onChange(
            value.includes(optionId)
                ? value.filter((item) => item !== optionId)
                : [...value, optionId]
        );
    }

    function removeOption(event, optionId) {
        event.stopPropagation();
        onChange(value.filter((item) => item !== optionId));
    }

    return (
        <div className="automod-field" ref={dropdownRef}>
            <span className="automod-field-label" id={`${id}-label`}>
                {label}
            </span>

            <button
                type="button"
                className={`automod-multiselect-trigger ${
                    isOpen ? 'is-open' : ''
                }`}
                aria-labelledby={`${id}-label`}
                aria-expanded={isOpen}
                aria-controls={`${id}-options`}
                onClick={() => setIsOpen((current) => !current)}>
                <span className="automod-selected-tags">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((option) => (
                            <span
                                className="automod-selected-tag"
                                key={option.id}>
                                <span>{option.name}</span>
                                <span
                                    className="automod-tag-remove"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Remove ${option.name}`}
                                    onClick={(event) =>
                                        removeOption(event, option.id)
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            removeOption(event, option.id);
                                        }
                                    }}>
                                    ×
                                </span>
                            </span>
                        ))
                    ) : (
                        <span className="automod-multiselect-placeholder">
                            Select {label.toLowerCase()}...
                        </span>
                    )}
                </span>

                <span
                    className="automod-multiselect-chevron"
                    aria-hidden="true">
                    {isOpen ? '▴' : '▾'}
                </span>
            </button>

            {isOpen && (
                <div
                    className="automod-multiselect-dropdown"
                    id={`${id}-options`}>
                    <div className="automod-multiselect-search">
                        <input
                            type="search"
                            value={search}
                            placeholder={`Search ${label.toLowerCase()}...`}
                            aria-label={`Search ${label.toLowerCase()}`}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="automod-multiselect-options">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const selected = value.includes(option.id);

                                return (
                                    <label
                                        className={`automod-multiselect-option ${
                                            selected ? 'is-selected' : ''
                                        }`}
                                        key={option.id}>
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() =>
                                                toggleOption(option.id)
                                            }
                                        />
                                        <span>{option.name}</span>
                                        {selected && (
                                            <span className="automod-option-check">
                                                ✓
                                            </span>
                                        )}
                                    </label>
                                );
                            })
                        ) : (
                            <p className="automod-multiselect-empty">
                                No matching results.
                            </p>
                        )}
                    </div>

                    <div className="automod-multiselect-footer">
                        <span>{selectedOptions.length} selected</span>
                        <button
                            type="button"
                            onClick={() => {
                                onChange([]);
                                setSearch('');
                            }}>
                            Clear selection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function RuleModal({ rule, settings, channels, roles, onClose, onSave }) {
    const [draft, setDraft] = useState(() => ({ ...settings }));

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape') onClose();
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    function update(field, value) {
        setDraft((current) => ({ ...current, [field]: value }));
    }

    return (
        <div
            className="automod-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}>
            <section
                className="automod-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="automod-modal-title">
                <header className="automod-modal-header">
                    <div>
                        <h3 id="automod-modal-title">{rule.label}</h3>
                        <p>{rule.description}</p>
                    </div>

                    <button
                        type="button"
                        className="automod-modal-close"
                        aria-label="Close settings"
                        onClick={onClose}>
                        ×
                    </button>
                </header>

                <div className="automod-modal-body">
                    <div className="automod-modal-group">
                        <h4>Choose the Response</h4>

                        <button
                            type="button"
                            className={`automod-response-option ${
                                draft.blockMessage ? 'is-selected' : ''
                            }`}
                            aria-pressed={draft.blockMessage}
                            onClick={() =>
                                update('blockMessage', !draft.blockMessage)
                            }>
                            <span className="automod-response-icon">▤</span>
                            <span className="automod-response-copy">
                                <strong>Block Message</strong>
                                <small>
                                    Prevent messages matching this rule from
                                    being posted.
                                </small>
                            </span>
                            <span className="automod-response-check">
                                {draft.blockMessage ? '✓' : ''}
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`automod-response-option ${
                                draft.muteMember ? 'is-selected' : ''
                            }`}
                            aria-pressed={draft.muteMember}
                            onClick={() =>
                                update('muteMember', !draft.muteMember)
                            }>
                            <span className="automod-response-icon">♧</span>
                            <span className="automod-response-copy">
                                <strong>Mute Member</strong>
                                <small>
                                    Apply a timeout to the member who triggers
                                    this rule.
                                </small>
                            </span>
                            <span className="automod-response-check">
                                {draft.muteMember ? '✓' : ''}
                            </span>
                        </button>

                        <p className="automod-modal-hint">
                            You can select either response or both.
                        </p>
                    </div>

                    <div className="automod-modal-group">
                        <MultiSelect
                            id={`${rule.id}-modal-channels`}
                            label="Disabled Channels"
                            options={channels}
                            value={draft.disabledChannels}
                            onChange={(value) =>
                                update('disabledChannels', value)
                            }
                        />

                        <MultiSelect
                            id={`${rule.id}-modal-roles`}
                            label="Disabled Roles"
                            options={roles}
                            value={draft.disabledRoles}
                            onChange={(value) => update('disabledRoles', value)}
                        />

                        <p className="automod-modal-hint">
                            Members with Administrator or Manage Server
                            permissions should be excluded from filter rules.
                        </p>
                    </div>
                </div>

                <footer className="automod-modal-footer">
                    <button
                        type="button"
                        className="automod-button"
                        onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="automod-button automod-button-primary"
                        onClick={() => onSave(draft)}>
                        Save Changes
                    </button>
                </footer>
            </section>
        </div>
    );
}

function AutoModPanel({ channels = [], roles = [], selectedGuildID = '' }) {
    const [ruleSettings, setRuleSettings] = useState(createRuleSettings);
    const [generalSettings, setGeneralSettings] = useState({
        ignoredChannels: [],
        ignoredRoles: [],
        onlyImagesChannels: [],
        onlyLinksChannels: [],
    });
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [notice, setNotice] = useState('');

    const channelOptions = channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
    }));

    const roleOptions = roles.map((role) => ({
        id: role.id,
        name: role.name,
    }));

    const enabledCount = RULES.filter(
        ({ id }) => ruleSettings[id].enabled
    ).length;

    const editingRule = RULES.find(({ id }) => id === editingRuleId);

    function updateRule(ruleId, field, value) {
        setRuleSettings((current) => ({
            ...current,
            [ruleId]: { ...current[ruleId], [field]: value },
        }));
        setNotice('');
    }

    function setAllRules(enabled) {
        setRuleSettings((current) =>
            Object.fromEntries(
                RULES.map(({ id }) => [id, { ...current[id], enabled }])
            )
        );
        setNotice('');
    }

    function saveRule(draft) {
        updateRule(editingRuleId, 'blockMessage', draft.blockMessage);
        setRuleSettings((current) => ({
            ...current,
            [editingRuleId]: { ...current[editingRuleId], ...draft },
        }));
        setEditingRuleId(null);
        setNotice(
            'Rule settings updated locally. Save to the backend will be added next.'
        );
    }

    function updateGeneral(field, value) {
        setGeneralSettings((current) => ({ ...current, [field]: value }));
        setNotice(
            'General settings updated locally. Save to the backend will be added next.'
        );
    }

    return (
        <div className="panel automod-panel">
            <header className="automod-header">
                <div className="automod-heading">
                    <div className="automod-icon" aria-hidden="true">
                        盾
                    </div>
                    <div>
                        <h3>AutoMod</h3>
                        <p>Configure automatic message moderation.</p>
                    </div>
                </div>

                <span className="automod-status">
                    {enabledCount} of {RULES.length} rules enabled
                </span>
            </header>

            {!selectedGuildID && (
                <div className="automod-notice">
                    Select a server to configure its AutoMod settings.
                </div>
            )}

            <section className="automod-control-panel">
                <div>
                    <h4>Moderation Controls</h4>
                    <p>Enable or disable all moderation rules at once.</p>
                </div>
                <div className="automod-global-actions">
                    <button
                        type="button"
                        className="automod-button automod-button-primary"
                        onClick={() => setAllRules(true)}>
                        Enable All
                    </button>
                    <button
                        type="button"
                        className="automod-button"
                        onClick={() => setAllRules(false)}>
                        Disable All
                    </button>
                </div>
            </section>

            <section className="automod-section">
                <div className="automod-section-heading">
                    <div>
                        <h4>Moderation Rules</h4>
                        <p>
                            Click a rule to configure its responses and
                            exceptions.
                        </p>
                    </div>
                </div>

                <div className="automod-rules">
                    {RULES.map((rule) => {
                        const settings = ruleSettings[rule.id];

                        return (
                            <article
                                key={rule.id}
                                className={`automod-rule-card ${
                                    settings.enabled ? 'is-active' : ''
                                }`}>
                                <button
                                    type="button"
                                    className="automod-rule-open"
                                    onClick={() => setEditingRuleId(rule.id)}
                                    aria-label={`Configure ${rule.label}`}>
                                    <span className="automod-rule-title">
                                        <strong>{rule.label}</strong>
                                        <small>{rule.description}</small>
                                        <span className="automod-rule-configure">
                                            Configure rule →
                                        </span>
                                    </span>
                                </button>

                                <div className="automod-rule-status">
                                    <span>
                                        {settings.enabled
                                            ? 'Enabled'
                                            : 'Disabled'}
                                    </span>
                                    <Toggle
                                        checked={settings.enabled}
                                        onChange={(value) =>
                                            updateRule(
                                                rule.id,
                                                'enabled',
                                                value
                                            )
                                        }
                                        label={`Enable ${rule.label}`}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="automod-section automod-general-section">
                <div className="automod-section-heading">
                    <div>
                        <h4>General Settings</h4>
                        <p>Configure channel and role exceptions.</p>
                    </div>
                </div>

                <div className="automod-general-grid">
                    <MultiSelect
                        id="automod-ignored-channels"
                        label="Ignored Channels"
                        options={channelOptions}
                        value={generalSettings.ignoredChannels}
                        onChange={(value) =>
                            updateGeneral('ignoredChannels', value)
                        }
                    />
                    <MultiSelect
                        id="automod-ignored-roles"
                        label="Ignored Roles"
                        options={roleOptions}
                        value={generalSettings.ignoredRoles}
                        onChange={(value) =>
                            updateGeneral('ignoredRoles', value)
                        }
                    />
                    <MultiSelect
                        id="automod-images-channels"
                        label="Only Images Channels"
                        options={channelOptions}
                        value={generalSettings.onlyImagesChannels}
                        onChange={(value) =>
                            updateGeneral('onlyImagesChannels', value)
                        }
                    />
                    <MultiSelect
                        id="automod-links-channels"
                        label="Only Links Channels"
                        options={channelOptions}
                        value={generalSettings.onlyLinksChannels}
                        onChange={(value) =>
                            updateGeneral('onlyLinksChannels', value)
                        }
                    />
                </div>
            </section>

            {notice && <p className="automod-footer">{notice}</p>}

            {editingRule && (
                <RuleModal
                    key={editingRule.id}
                    rule={editingRule}
                    settings={ruleSettings[editingRule.id]}
                    channels={channelOptions}
                    roles={roleOptions}
                    onClose={() => setEditingRuleId(null)}
                    onSave={saveRule}
                />
            )}
        </div>
    );
}

export default AutoModPanel;
