import { useEffect, useState } from 'react';
import '../../styles/navmenu.css';

const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_URL =
    process.env.REACT_APP_API_URL ||
    (isLocalhost
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : window.location.origin);

function DiscordAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/auth/me`, {
            credentials: 'include',
        })
            .then(async (response) => {
                if (!response.ok) {
                    return { user: null };
                }

                return response.json();
            })
            .then((data) => {
                setUser(data.user);
            })
            .catch((error) => {
                console.error('Could not check Discord login:', error);
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = () => {
        window.location.href = `${API_URL}/auth/discord`;
    };

    const logout = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setUser(null);
            }
        } catch (error) {
            console.error('Discord logout failed:', error);
        }
    };

    if (loading) {
        return <div>Checking login...</div>;
    }

    if (!user) {
        return (
            <button
                type="button"
                className="discord-login-button"
                onClick={login}>
                Logg inn med Discord
            </button>
        );
    }

    const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : null;

    return (
        <div className="discord-auth">
            {avatarUrl && (
                <img
                    src={avatarUrl}
                    alt=""
                    width="32"
                    height="32"
                    style={{ borderRadius: '50%', verticalAlign: 'middle' }}
                />
            )}

            <span style={{ marginLeft: '8px' }}>
                {user.globalName || user.username}
            </span>

            <button
                type="button"
                onClick={logout}
                style={{ marginLeft: '12px' }}>
                Logg ut
            </button>
        </div>
    );
}

export default DiscordAuth;
