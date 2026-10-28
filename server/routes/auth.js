const express = require('express');
const crypto = require('node:crypto');

const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';

function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({
            error: 'Not authenticated',
        });
    }

    next();
}

// Start Discord OAuth2 login

router.get('/discord', (req, res) => {
    console.log('[AUTH START]', {
        sessionID: req.sessionID,
        hasCookie: Boolean(req.headers.cookie),
    });
    const clientId = process.env.CLIENT_ID;
    console.log('[AUTH] Discord login route reached');
    console.log(
        '[AUTH] Redirect URI:',
        JSON.stringify(process.env.DISCORD_REDIRECT_URI)
    );

    if (!clientId) {
        return res.status(500).send('Discord OAuth2 is not configured.');
    }

    const state = crypto.randomBytes(32).toString('hex');
    req.session.oauthState = state;

    const host = req.get('host') || '';

    console.log('[AUTH] Host:', host);

    const redirectUri =
        host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
            ? 'http://localhost:3001/auth/discord/callback'
            : process.env.DISCORD_REDIRECT_URI;

    req.session.oauthRedirectUri = redirectUri;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify guilds',
        state,
    });

    req.session.save((err) => {
        if (err) {
            console.error('OAuth session save failed:', err);
            return res.status(500).send('Could not start login.');
        }
        console.log(
            '[AUTH START] Set-Cookie header:',
            Boolean(res.getHeader('Set-Cookie'))
        );
        res.redirect(
            `https://discord.com/oauth2/authorize?${params.toString()}`
        );
    });
});

// Discord OAuth2 callback
router.get('/discord/callback', async (req, res) => {
    const { code, state } = req.query;
    console.log('[AUTH CALLBACK]', {
        sessionID: req.sessionID,
        hasCookie: Boolean(req.headers.cookie),
        hasSavedState: Boolean(req.session?.oauthState),
        hasReturnedState: Boolean(state),
        stateMatches: Boolean(
            state && req.session?.oauthState && state === req.session.oauthState
        ),
    });

    if (
        !code ||
        !state ||
        !req.session.oauthState ||
        state !== req.session.oauthState
    ) {
        return res.status(400).send('Invalid OAuth2 state.');
    }

    delete req.session.oauthState;

    try {
        const redirectUri = req.session.oauthRedirectUri;

        if (!redirectUri) {
            return res
                .status(400)
                .send('Missing OAuth2 redirect URI in session.');
        }

        const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Discord token exchange failed:', tokens);
            return res.status(502).send('Discord login failed.');
        }

        const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        const user = await userResponse.json();

        if (!userResponse.ok || !user.id) {
            return res.status(502).send('Could not retrieve Discord user.');
        }

        // Regenerate the session to prevent session fixation.
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration failed:', err);
                return res.status(500).send('Could not create login session.');
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                globalName: user.global_name || user.username,
                avatar: user.avatar,
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Session save failed:', saveErr);
                    return res
                        .status(500)
                        .send('Could not save login session.');
                }

                const destination = redirectUri.startsWith('http://localhost:')
                    ? 'http://localhost:3000'
                    : 'https://nazservers.asuscomm.com';

                res.redirect(destination);
            });
        });
    } catch (err) {
        console.error('Discord OAuth2 callback error:', err);
        res.status(500).send('An error occurred during Discord login.');
    }
});

// Return the currently authenticated user
router.get('/me', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ user: null });
    }

    res.json({ user: req.session.user });
});

// Logout
router.post('/logout', requireAuth, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }

        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

module.exports = router;
