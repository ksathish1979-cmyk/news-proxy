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
        // బ్రౌజర్‌లా నటిస్తూ డైరెక్ట్ వెబ్‌సైట్ నుండి ఫీడ్ సేకరించడం
        const response = await axios.get(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 10000
        });

        const feed = await parser.parseString(response.data);
        res.json(feed);
    } catch (error) {
        res.status(500).json({ error: 'డేటా తెలపడంలో విఫలమైంది', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
