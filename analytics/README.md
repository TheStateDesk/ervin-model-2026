# Website page-visit analytics — one-time activation

The State Desk now includes a site-wide optional, privacy-focused Cloudflare Web Analytics loader in `scripts/post-editorial-chrome.js`. It is present on the home page, results, analysis stories and most editorial subpages. It does **not** collect events until the site owner activates it.

## Activate

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up) if needed. Keep GitHub Pages hosting unchanged; Cloudflare does not need to host your site, control DNS or proxy traffic.
2. Open [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics), select **Add a site**, and register **thestatedesk.github.io**.
3. Go to **Manage site**, copy the token in the `data-cf-beacon` snippet. It is a public 32-character hexadecimal *site* token, not a Cloudflare API key.
4. Replace the empty value in `analytics/config.json` with the token (keep the JSON syntax). Commit to `main` and confirm GitHub Pages deployment.
5. Open the [Cloudflare Web Analytics dashboard](https://dash.cloudflare.com/?to=/:account/web-analytics) to view page views, visits, top article paths, referrers, geography and trends.

The existing loader detects site hostname and ignores localhost/CI. It does not load the analytics library without a valid token. Cloudflare Web Analytics uses no tracking cookies and, per Cloudflare's documentation, does not use visitors' personal information.

**Important:** Do not paste a private API token or account password in this file. It is public GitHub repository content. GitHub repository traffic/clone metrics are not website page views. Browser extensions and ad blockers may suppress tracking, so results are estimates, not audited server logs.

Official setup guide: https://developers.cloudflare.com/web-analytics/get-started/
