import React, { useEffect, useState } from 'react';
import '../../../styles/serverinfo.css';

const channelTypes = {
    0: 'Text Channel',
    2: 'Voice Channel',
    4: 'Category',
    5: 'Announcement Channel',
    10: 'Announcement Thread',
    11: 'Public Thread',
    12: 'Private Thread',
    13: 'Stage Channel',
    14: 'Directory Channel',
    15: 'Forum Channel',
    16: 'Media Channel',
};

const verificationLevels = {
    0: 'None',
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Very High',
};

const contentFilterLevels = {
    0: 'Disabled',
    1: 'Members without roles',
    2: 'All members',
};

const notificationLevels = {
    0: 'All Messages',
    1: 'Only @mentions',
};

function ServerInfoPanel({ guild }) {
    const [serverInfo, setServerInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState('');

    useEffect(() => {
        if (!guild?.id) {
            setServerInfo(null);
            setError('');
            return;
        }

        const controller = new AbortController();

        async function fetchServerInfo() {
            setLoading(true);
            setError('');

            try {
                const response = await fetch(`/api/server-info/${guild.id}`, {
                    signal: controller.signal,
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                setServerInfo(await response.json());
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Server Info:', err);
                    setError(
                        err.message || 'Failed to load server information.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchServerInfo();
        return () => controller.abort();
    }, [guild?.id]);

    async function copyId(id) {
        try {
            await navigator.clipboard.writeText(id);
            setCopiedId(id);

            setTimeout(() => {
                setCopiedId((current) => (current === id ? '' : current));
            }, 1500);
        } catch (err) {
            console.error('Copy failed:', err);
            setError('Could not copy ID. Check your browser permissions.');
        }
    }

    function CopyButton({ id }) {
        return (
            <button
                type="button"
                className="server-info-copy"
                onClick={() => copyId(id)}
                title={`Copy ID: ${id}`}
                aria-label={`Copy ID ${id}`}>
                {copiedId === id ? 'Copied!' : 'Copy ID'}
            </button>
        );
    }

    function ChannelRow({ channel }) {
        return (
            <div className="server-info-channel" key={channel.id}>
                <div className="server-info-channel-details">
                    <strong>{channel.name}</strong>
                    <span>
                        {channelTypes[channel.type] ??
                            `Channel Type ${channel.type}`}
                    </span>
                    <small>ID: {channel.id}</small>
                </div>
                <CopyButton id={channel.id} />
            </div>
        );
    }

    if (!guild) {
        return (
            <div className="panel server-info-panel">
                <p>Select a server to view its information.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="panel server-info-panel">
                <p>Loading server information...</p>
            </div>
        );
    }

    if (error && !serverInfo) {
        return (
            <div className="panel server-info-panel">
                <p role="alert">Error: {error}</p>
            </div>
        );
    }

    if (!serverInfo) {
        return (
            <div className="panel server-info-panel">
                <p>No server information available.</p>
            </div>
        );
    }

    const categories = [...(serverInfo.categories ?? [])].sort(
        (a, b) => a.position - b.position
    );

    const uncategorizedChannels = [
        ...(serverInfo.uncategorizedChannels ?? []),
    ].sort((a, b) => a.position - b.position);

    const totalChannels = (serverInfo.channelData ?? []).filter(
        (channel) => !channel.isCategory
    ).length;

    return (
        <div className="panel server-info-panel">
            <header className="server-info-header">
                {serverInfo.icon && (
                    <img
                        className="server-info-icon"
                        src={serverInfo.icon}
                        alt={`${serverInfo.name} server icon`}
                    />
                )}
                <div>
                    <h3>{serverInfo.name}</h3>
                    <p>Server Overview</p>
                </div>
            </header>

            {serverInfo.description?.trim() && (
                <section className="server-info-section">
                    <h4>Server Description</h4>
                    <p className="server-info-description">
                        {serverInfo.description}
                    </p>
                </section>
            )}

            {serverInfo.owner && (
                <section className="server-info-section">
                    <h4>Server Owner</h4>

                    <div className="server-info-owner">
                        {serverInfo.owner.avatar && (
                            <img
                                className="server-info-owner-avatar"
                                src={serverInfo.owner.avatar}
                                alt={`${serverInfo.owner.username}'s avatar`}
                            />
                        )}

                        <div className="server-info-owner-details">
                            <strong>{serverInfo.owner.username}</strong>
                            <span>Server Owner</span>
                            <small>ID: {serverInfo.owner.id}</small>
                        </div>

                        <CopyButton id={serverInfo.owner.id} />
                    </div>
                </section>
            )}

            <section className="server-info-section">
                <h4>General Information</h4>
                <div className="server-info-details">
                    <div className="server-info-item">
                        <span>Server Name</span>
                        <strong>{serverInfo.name}</strong>
                    </div>
                    <div className="server-info-item">
                        <span>Server ID</span>
                        <strong>{serverInfo.id}</strong>
                        <CopyButton id={serverInfo.id} />
                    </div>
                    <div className="server-info-item">
                        <span>Created</span>
                        <strong>
                            {new Date(serverInfo.createdAt).toLocaleDateString(
                                'en-GB',
                                {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                }
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            <section className="server-info-section">
                <h4>Server Statistics</h4>
                <div className="server-info-statistics">
                    {[
                        ['Members', serverInfo.memberCount],
                        ['Roles', serverInfo.roleCount],
                        ['Text Channels', serverInfo.textChannelCount],
                        ['Voice Channels', serverInfo.voiceChannelCount],
                        ['Categories', serverInfo.categoryCount],
                    ].map(([label, value]) => (
                        <div className="server-info-stat" key={label}>
                            <span>{label}</span>
                            <strong>{value ?? 0}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className="server-info-section">
                <h4>Custom Emojis ({serverInfo.emojiCount ?? 0})</h4>

                {serverInfo.emojis?.length ? (
                    <div className="server-info-emojis">
                        {serverInfo.emojis.map((emoji) => (
                            <div
                                className="server-info-emoji"
                                key={emoji.id}
                                title={`:${emoji.name}:`}>
                                <img
                                    src={emoji.url}
                                    alt={`:${emoji.name}:`}
                                    loading="lazy"
                                />

                                <span>{emoji.name}</span>

                                {emoji.animated && <small>Animated</small>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="server-info-muted">
                        No custom emojis available.
                    </p>
                )}
            </section>

            <section className="server-info-section">
                <h4>Stickers ({serverInfo.stickerCount ?? 0})</h4>

                {serverInfo.stickers?.length ? (
                    <div className="server-info-stickers">
                        {serverInfo.stickers.map((sticker) => (
                            <div
                                className="server-info-sticker"
                                key={sticker.id}>
                                {sticker.format !== 3 && (
                                    <img
                                        src={sticker.url}
                                        alt={sticker.name}
                                        loading="lazy"
                                    />
                                )}

                                <div className="server-info-sticker-details">
                                    <strong>{sticker.name}</strong>

                                    {sticker.description && (
                                        <span>{sticker.description}</span>
                                    )}

                                    <small>
                                        {sticker.format === 3
                                            ? 'Animated sticker (Lottie)'
                                            : sticker.format === 2
                                              ? 'Animated sticker'
                                              : 'Standard sticker'}
                                    </small>

                                    <small>
                                        Tags: {sticker.tags || 'None'}
                                    </small>
                                </div>

                                <CopyButton id={sticker.id} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="server-info-muted">No stickers available.</p>
                )}
            </section>

            <section className="server-info-section">
                <h4>Categories & Channels</h4>
                <p className="server-info-description">
                    {categories.length} categories · {totalChannels} channels
                </p>

                <div className="server-info-categories">
                    {categories.map((category) => (
                        <details
                            className="server-info-category"
                            key={category.id}>
                            <summary>
                                <span>
                                    {category.name} (
                                    {category.channels?.length ?? 0})
                                </span>
                            </summary>

                            <div className="server-info-category-details">
                                <div className="server-info-category-id">
                                    <span>Category ID: {category.id}</span>
                                    <CopyButton id={category.id} />
                                </div>

                                {category.channels?.length ? (
                                    [...category.channels]
                                        .sort((a, b) => a.position - b.position)
                                        .map((channel) => (
                                            <ChannelRow
                                                key={channel.id}
                                                channel={channel}
                                            />
                                        ))
                                ) : (
                                    <p className="server-info-muted">
                                        No channels in this category.
                                    </p>
                                )}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            <section className="server-info-section">
                <h4>Uncategorized Channels</h4>

                {uncategorizedChannels.length ? (
                    uncategorizedChannels.map((channel) => (
                        <ChannelRow key={channel.id} channel={channel} />
                    ))
                ) : (
                    <p className="server-info-muted">
                        All channels are assigned to a category.
                    </p>
                )}
            </section>

            <section className="server-info-section">
                <h4>Security & Features</h4>
                <div className="server-info-details">
                    <div className="server-info-item">
                        <span>Verification Level</span>
                        <strong>
                            {verificationLevels[serverInfo.verificationLevel] ??
                                serverInfo.verificationLevel}
                        </strong>
                    </div>
                    <div className="server-info-item">
                        <span>Explicit Content Filter</span>
                        <strong>
                            {contentFilterLevels[
                                serverInfo.explicitContentFilter
                            ] ?? serverInfo.explicitContentFilter}
                        </strong>
                    </div>
                    <div className="server-info-item">
                        <span>Default Notifications</span>
                        <strong>
                            {notificationLevels[
                                serverInfo.defaultMessageNotifications
                            ] ?? serverInfo.defaultMessageNotifications}
                        </strong>
                    </div>
                    <div className="server-info-item">
                        <span>Community</span>
                        <strong>
                            {serverInfo.features?.includes('COMMUNITY')
                                ? 'Enabled'
                                : 'Disabled'}
                        </strong>
                    </div>
                    <div className="server-info-item">
                        <span>Boost Level</span>
                        <strong>{serverInfo.premiumTier ?? 0}</strong>
                    </div>
                    <div className="server-info-item">
                        <span>Server Boosts</span>
                        <strong>
                            {serverInfo.premiumSubscriptionCount ?? 0}
                        </strong>
                    </div>
                </div>
            </section>

            {error && <p role="alert">{error}</p>}
        </div>
    );
}

export default ServerInfoPanel;
