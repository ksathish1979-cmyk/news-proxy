const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// అన్ని origins నుండి requests అనుమతించడానికి CORS సెట్టింగ్
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
        const response = await axios.get(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/xml, text/xml, */*'
            },
            responseType: 'text', // డేటాను ఖచ్చితంగా Text/XML గా మార్చడానికి
            timeout: 10000
        });

        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: 'డేటా తెలపడంలో విఫలమైంది', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
