// routes/turnCredentials.js
const express = require('express');
const router = express.Router();

router.post('/turn-credentials', async (req, res) => {
  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }), // credentials valid 24h
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[turn] Cloudflare error:', response.status, errText);
      return res.status(502).json({ error: 'TURN credential provider unavailable' });
    }

    const data = await response.json();
    res.json(data.iceServers);
  } catch (err) {
    console.error('[turn] fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch TURN credentials' });
  }
});

module.exports = {turnRouter: router};