const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

const app = express();
const parser = new Parser({ timeout: 20000 });

app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 10000;

function absoluteUrl(value, base) {
  try { return new URL(value, base).href; } catch { return value; }
}

async function resolveGoogleNewsUrl(inputUrl) {
  // First follow normal HTTP redirects.
  try {
    const r = await axios.get(inputUrl, {
      maxRedirects: 10,
      timeout: 20000,
      validateStatus: s => s >= 200 && s < 400,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const finalUrl = r.request?.res?.responseUrl || r.config?.url || inputUrl;
    if (!/news\.google\.com/i.test(finalUrl)) return finalUrl;

    // Google News sometimes embeds the publisher URL in canonical/meta tags.
    const $ = cheerio.load(typeof r.data === "string" ? r.data : "");
    const candidates = [
      $('link[rel="canonical"]').attr("href"),
      $('meta[property="og:url"]').attr("content"),
      $('a[href^="http"]').first().attr("href")
    ].filter(Boolean);

    for (const c of candidates) {
      const u = absoluteUrl(c, finalUrl);
      if (u && !/news\.google\.com/i.test(u)) return u;
    }
  } catch (_) {}

  // If it is still a Google News RSS article URL, try the documented
  // RSS/article redirect route once more with a browser-like request.
  return inputUrl;
}

function rewriteDocument(html, pageUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove browser policies that commonly prevent a proxied page from
  // being displayed in an iframe.
  $('meta[http-equiv]').each((_, el) => {
    const v = ($(el).attr("http-equiv") || "").toLowerCase();
    if (v === "content-security-policy" || v === "x-frame-options") $(el).remove();
  });

  $('base').remove();
  $("head").prepend(`<base href="${pageUrl}">`);

  // Remove scripts that deliberately navigate the top window.
  $("script").each((_, el) => {
    const code = $(el).html() || "";
    if (/top\.location|parent\.location|window\.top|window\.parent/i.test(code)) {
      $(el).remove();
    }
  });

  // Keep navigation inside the iframe.
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    $(el).attr("target", "_self");
  });

  return $.html();
}

app.get("/", (req, res) => {
  res.type("text").send("News iframe proxy is running.");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "news-iframe-proxy" });
});

app.get("/fetch-rss", async (req, res) => {
  try {
    const rssUrl = req.query.url;
    if (!rssUrl) return res.status(400).json({ error: "Missing url" });

    const feed = await parser.parseURL(rssUrl);
    const items = (feed.items || []).map(item => ({
      title: item.title || "",
      link: item.link || "",
      pubDate: item.pubDate || item.isoDate || "",
      contentSnippet: item.contentSnippet || "",
      content: item.content || "",
      summary: item.summary || ""
    }));

    res.json({
      title: feed.title || "",
      items
    });
  } catch (e) {
    res.status(502).json({ error: "RSS fetch failed", details: e.message });
  }
});

app.get("/article", async (req, res) => {
  try {
    const requested = req.query.url;
    if (!requested) return res.status(400).send("Missing article URL");

    const target = await resolveGoogleNewsUrl(requested);

    // If Google still returned a Google News URL, fetching it won't solve
    // the iframe problem. Return a clear message instead of pretending.
    if (/^https?:\/\/news\.google\.com/i.test(target)) {
      return res.status(409).send(`
        <html><body style="font-family:Arial;padding:30px">
        <h2>అసలు వార్త URL దొరకలేదు</h2>
        <p>Google News ఈ వార్తకు publisher URL ఇవ్వలేదు. ఈ వార్తను నేరుగా తెరవాలి.</p>
        </body></html>`);
    }

    const r = await axios.get(target, {
      timeout: 30000,
      maxRedirects: 10,
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
        "Accept-Language": "ta-IN,ta;q=0.9,en;q=0.7"
      },
      validateStatus: s => s >= 200 && s < 500
    });

    const contentType = String(r.headers["content-type"] || "");
    if (!contentType.includes("text/html")) {
      return res.status(502).send("Publisher returned a non-HTML response.");
    }

    const finalUrl = r.request?.res?.responseUrl || target;
    const rewritten = rewriteDocument(r.data, finalUrl);

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store");
    res.send(rewritten);
  } catch (e) {
    res.status(502).send(`
      <html><body style="font-family:Arial;padding:30px">
      <h2>వార్తను లోడ్ చేయలేకపోయాం</h2>
      <p>${String(e.message).replace(/[<>&"]/g, "")}</p>
      </body></html>`);
  }
});

app.listen(PORT, () => {
  console.log(`News iframe proxy running on port ${PORT}`);
});
