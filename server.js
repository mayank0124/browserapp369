require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from Electron (file://) and any origin
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────────
// DEVICE WHITELIST — Add approved device IDs here
// ─────────────────────────────────────────────────────────────────
const ALLOWED_DEVICE_IDS = [
    '3ae4879a-3609-4c24-97ad-1eb004b63bd2', // Dev machine (auto-added)
    // Add more device IDs here:
    // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
];

// ─────────────────────────────────────────────────────────────────
// POST /auth — Validate device against whitelist
// ─────────────────────────────────────────────────────────────────
app.post('/auth', (req, res) => {
    const { deviceId, appVersion } = req.body;

    if (!deviceId) {
        return res.status(400).json({ authorized: false, error: 'Missing deviceId' });
    }

    const isAuthorized = ALLOWED_DEVICE_IDS.includes(deviceId);
    console.log(`[AUTH] deviceId=${deviceId} | version=${appVersion} | result=${isAuthorized}`);

    res.json({ authorized: isAuthorized });
});

// ─────────────────────────────────────────────────────────────────
// GET /config — Proxy config from private GitHub repo
// ─────────────────────────────────────────────────────────────────
app.get('/config', async (req, res) => {
    try {
        const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, CONFIG_PATH } = process.env;

        if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
            console.warn('[CONFIG] GitHub env vars not set — returning fallback config.');
            return res.json({
                targetURL: 'https://www.naturalreaders.com/commercial/',
                injectScript: '',
                rules: [],
                featureFlags: { enableLogging: true },
            });
        }

        const path = CONFIG_PATH || 'config.json';
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3.raw',
            },
        });

        res.json(response.data);

    } catch (error) {
        console.error('[CONFIG] GitHub fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// ─────────────────────────────────────────────────────────────────
// Health check — Render pings this to keep the service alive
// ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[SERVER] Secure backend running on port ${PORT}`);
});
