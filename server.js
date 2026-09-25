const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const axios = require('axios');

const app = express();
const parser = new Parser();

app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
    res.send('News Proxy Server is Active!');
});

app.get('/fetch-rss', async (req, res) => {
    const feedUrl = req.query.url;
    if (!feedUrl) {
        return res.status(400).json({ error: 'URL ఇవ్వలేదు' });
    }

    try {
        // ఆల్-ఒరిజిన్స్ బైపాస్ ద్వారా XML సేకరించడం
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
        const response = await axios.get(proxyUrl, { timeout: 12000 });
        const feed = await parser.parseString(response.data);
        res.json(feed);
    } catch (error) {
        try {
            // ఫాల్‌బ్యాక్: నేరుగా ప్రయత్నించడం
            const feed = await parser.parseURL(feedUrl);
            res.json(feed);
        } catch (err) {
            res.status(500).json({ error: 'వార్తలు సేకరించడంలో విఫలమైంది', details: err.message });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
