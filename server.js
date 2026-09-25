const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// RSS ఫీడ్‌లను ఫెచ్ చేసే ఉచిత ప్రాక్సీ ఎండ్ పాయింట్
app.get('/fetch-rss', async (req, res) => {
    const feedUrl = req.query.url;
    if (!feedUrl) {
        return res.status(400).json({ error: 'URL ఇవ్వలేదు' });
    }

    try {
        const response = await axios.get(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        res.set('Content-Type', 'text/xml');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: 'డేటా తెలపడంలో విఫలమైంది', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});