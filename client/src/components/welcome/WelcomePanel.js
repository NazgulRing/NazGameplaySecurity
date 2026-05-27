import '../../styles/welcome.css';
function WelcomePanel({
    welcomeSettings,
    setWelcomeSettings,
    channels,
    saveWelcomeSettings,
    testWelcomeMessage,
}) {
    return (
        <div className="welcome-panel">
            <div className="welcome-header">
                <div>
                    <p className="welcome-kicker">Automation</p>

                    <h3>Welcome Designer</h3>
                </div>
            </div>

            <div className="welcome-form-group">
                <label>Enable Welcome Messages</label>

                <input
                    type="checkbox"
                    checked={welcomeSettings.enabled}
                    onChange={(e) =>
                        setWelcomeSettings((current) => ({
                            ...current,
                            enabled: e.target.checked,
                        }))
                    }
                />
            </div>

            <div className="welcome-form-group">
                <label>Welcome Channel</label>

                <select
                    value={welcomeSettings.channelID || ''}
                    onChange={(e) =>
                        setWelcomeSettings((current) => ({
                            ...current,
                            channelID: e.target.value,
                        }))
                    }
                >
                    <option value="">Select channel</option>

                    {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                            #{channel.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="welcome-form-group">
                <label>Welcome Message</label>

                <textarea
                    className="welcome-textarea"
                    value={welcomeSettings.message}
                    onChange={(e) =>
                        setWelcomeSettings((current) => ({
                            ...current,
                            message: e.target.value,
                        }))
                    }
                    placeholder="
{user} joined the server!
"
                />
            </div>

            <div className="welcome-form-group">
                <label>Embed Color</label>

                <input
                    type="color"
                    value={welcomeSettings.color}
                    onChange={(e) =>
                        setWelcomeSettings((current) => ({
                            ...current,
                            color: e.target.value,
                        }))
                    }
                />
            </div>

            <div className="welcome-form-group">
                <label>Mention User</label>

                <input
                    type="checkbox"
                    checked={welcomeSettings.mention}
                    onChange={(e) =>
                        setWelcomeSettings((current) => ({
                            ...current,
                            mention: e.target.checked,
                        }))
                    }
                />
            </div>

            <div className="welcome-variables">
                <h4>Variables</h4>

                <div className="variable-list">
                    <span>{'{user}'}</span>

                    <span>{'{username}'}</span>

                    <span>{'{server}'}</span>

                    <span>{'{membercount}'}</span>
                </div>
            </div>

            <div className="welcome-backgrounds">
                <h4>Backgrounds</h4>

                <div className="background-grid">
                    {[
                        'welcome_bg/metallicblue.avif',
                        'welcome_bg/simplestripes.jpg',
                        'welcome_bg/purplegrade.avif',
                        'welcome_bg/spiderweb.avif',
                        'welcome_bg/yellowmark.jpg',
                    ].map((bg) => (
                        <div
                            key={bg}
                            className={`
          background-option
          ${welcomeSettings.background === bg ? 'active' : ''}
        `}
                            onClick={() =>
                                setWelcomeSettings((current) => ({
                                    ...current,
                                    background: bg,
                                }))
                            }
                        >
                            <img src={bg} alt="background" />
                        </div>
                    ))}

                    <label className="upload-background-button">
                        <span>Upload</span>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];

                                if (!file) return;

                                const reader = new FileReader();

                                reader.onload = () => {
                                    setWelcomeSettings((current) => ({
                                        ...current,
                                        background: reader.result,
                                    }));
                                };

                                reader.readAsDataURL(file);
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="welcome-preview">
                <div className="preview-header">Enable Preview</div>

                <div
                    className="preview-card"
                    style={{
                        backgroundImage: `url(${welcomeSettings.background})`,
                    }}
                >
                    <div className="preview-overlay">
                        <img
                            src="https://cdn.discordapp.com/embed/avatars/0.png"
                            alt="avatar"
                            className="welcome-preview-avatar"
                        />

                        <div className="preview-text">
                            <h2>Welcome!</h2>

                            <p>
                                {welcomeSettings.message

                                    ?.replace(/{user}/g, '@Streamercord')

                                    ?.replace(/{username}/g, 'Streamercord')

                                    ?.replace(/{server}/g, 'DiscordBot')

                                    ?.replace(/{membercount}/g, '152')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="welcome-actions">
                <button
                    className="
welcome-button secondary
"
                    onClick={testWelcomeMessage}
                >
                    Test Welcome
                </button>

                <button
                    className="
welcome-button primary
"
                    onClick={saveWelcomeSettings}
                >
                    Save Welcome
                </button>
            </div>
        </div>
    );
}

export default WelcomePanel;
