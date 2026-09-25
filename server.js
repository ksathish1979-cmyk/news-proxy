const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    }
});

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
        // RSS XML ని నేరుగా JSON గా కన్వర్ట్ చేస్తుంది
        const feed = await parser.parseURL(feedUrl);
        res.json(feed);
    } catch (error) {
        res.status(500).json({ error: 'RSS డేటా పార్స్ చేయడంలో విఫలమైంది', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
