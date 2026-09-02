// Loads a page with no interaction and reports which tracking requests fire BEFORE consent.
// Usage: run preflight.sh once (installs puppeteer-core), then:
//        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node consent-check.mjs https://example.ro
import puppeteer from 'puppeteer-core';

const url = process.argv[2];
if (!url) { console.error('usage: consent-check.mjs <url>'); process.exit(2); }
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TRACKERS = [
  ['Google Analytics / GTM', /google-analytics\.com|googletagmanager\.com|analytics\.google\.com|\/collect\?/i],
  ['Meta Pixel',            /facebook\.com\/tr|connect\.facebook\.net/i],
  ['Hotjar',                /hotjar\.com|hotjar\.io/i],
  ['Microsoft Clarity',     /clarity\.ms/i],
  ['TikTok Pixel',          /analytics\.tiktok\.com/i],
  ['LinkedIn Insight',      /snap\.licdn\.com|px\.ads\.linkedin\.com/i],
  ['Google Ads',            /googleadservices\.com|doubleclick\.net/i],
];

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
const hits = new Map();
page.on('request', (req) => {
  const u = req.url();
  for (const [name, re] of TRACKERS) if (re.test(u)) hits.set(name, [...(hits.get(name) || []), u]);
});
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => console.error('nav:', e.message));
await new Promise((r) => setTimeout(r, 3000));
const cookies = await page.cookies();
await browser.close();

console.log(JSON.stringify({
  url,
  trackersBeforeConsent: Object.fromEntries([...hits].map(([k, v]) => [k, v.slice(0, 3)])),
  cookiesSetBeforeConsent: cookies.map((c) => `${c.name} (${c.domain})`),
  verdict: hits.size ? 'VIOLATION: tracking fired before any consent interaction' : 'OK: no known trackers fired before consent',
}, null, 2));
