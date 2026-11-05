# Editorial production, corrections, and data-source policy

**Publisher:** Gabriel Ervin. **Site:** The State Desk. **Model:** The original Nov. 3 forecast is archived and must not be modified by later election coverage.

## How a new edition is published

1. The six-hour writing automation may research and assemble 2–5 proposed stories, but it must create **draft pull requests only**, on a new editorial branch. The half-hour headline watcher is a separate source-list feed: a headline there is only a lead, not a verified fact.
2. For each article, save headline, dateline, source links, any direct quotations, every material vote or polling number, original analysis method, and candidate platform sources into the structured source inventory at `editorial/claims.json`. An URL being linked does **not** constitute fact verification; open and check the original publisher.
3. Review against independent national and regional sources and original government records. Sensitive allegations about people demand contextual detail, direct source attribution and careful assessment of what the record does and does not show.
4. Use original writing and credit external newsrooms for their information. Do not invent interviews, quotations, poll numbers or election calls. Reuse Wikimedia Commons images only after checking the original file page, author, date and license; provide caption and credit.
5. For corrections, add a dated note on the article and update `/corrections/`. Preserve the article's original date and do not silently swap historical election snapshots for revised totals.
6. Run editorial validation, dead-link checks and the full Playwright browser suite at desktop and phone widths. The CI screenshot artifact is evidence for the draft PR; it is **not** a published preview site. Publisher must examine the draft and approve before merging. Never automatically merge an AI-written news draft.
7. After human approval, merge. Verify that the GitHub Pages deployment reports success, the public build SHA matches the commit, and the post-deployment Chrome checks pass. A successful Pages deployment followed by a failed check requires investigation rather than a false claim that the site did not publish.

## Election results and licensing

- The `election-night/ap-calls.json` file is an incomplete, sourced call index, **not** live licensed AP API access or independent election decisions. Missing entries do not prove the AP has not called a race.
- The `results/ap-verified-snapshots.json` numbers were collected from a publisher explicitly redistributing AP-attributed tabulations. Their presence on that publisher's site does not establish independent redistribution or commercial syndication rights for this site. Do not expand reuse until provider terms or permissions are established; link to AP or use subsequently released official public election data instead.
- Distinguish official certified totals, dated unofficial votes, attributed winner calls and frozen forecasts. Alaska ranked-choice rounds must be evaluated under their ballot rules. See `/uncalled/` for the AP's historical Nov. 4 source watch list versus the local recorded-call index.
- The separately labeled `analysis/forecast-coverage/` CSV/JSON gives a **party-direction comparison** over the currently recorded calls for 435 House, 17 Senate and 36 governor forecast rows; not a national margin-error, polling-bias or probability-calibration score. Score the withheld races only with later authenticated source data.

## Analytics remains owner-dependent

The privacy-conscious Cloudflare Web Analytics loader exists, but `analytics/config.json` contains an empty public `cloudflareSiteToken`. The site owner must register the public GitHub Pages URL and provide Cloudflare's issued token. Do **not** commit account passwords, API keys, cookies or private credentials. Once configured, inspect Cloudflare's own dashboard for homepage, article, and results-page views. No traffic numbers should be invented before that connection is completed.

## Future architecture

`editorial/claims.json` is a first-pass published-article source and assertion inventory, **not** yet a complete content CMS. Avoid constructing unreviewed auto-writing pipelines. A later reviewed change can make article index, RSS, sitemap and archive pages render from one editorial manifest, but preserve historical URLs and apply a human approval gate first.


## House style: news first, defensiveness once

- Lead with the verified development, specific people, decisions and numbers; do not lead with a statement about this publication or its obligations. Prefer informative headlines without terminal periods.
- Write in an independent, restrained newspaper voice. Avoid defensive repetition and unnecessary self-grading. Keep one concise limits/as-of note near data; place material corrections, dated, at the end of affected stories. Never conceal a material error.
- Prefer positive, precise sentences over repeated negations. In draft checks flag: “must not be conflated”, “not a photograph”, “this article does not”, “our first obligation”, and “we cannot conclude”; flag “unofficial” or “preliminary” more than once and more than approximately one negation per 100 words. Flag headlines or first sentences about the publication rather than the news. Editorial judgment can override flags with a documented reason.
- Use “historical adjustment” for the forecasting technique and reserve “correction” for editorial corrections. Call the historical product “the Ervin forecast”. Preserve the Nov. 3 forecast exactly as published.
- Use a uniform sentence-case byline, “By Gabriel Ervin” only when personally written or substantially edited by him, otherwise “By The State Desk”; date as “Nov. 5, 2026”, with separately labeled update time when needed. Never falsely attribute AI-written text to a human.
- Source original reporting and key numbers in each article and the claim manifest. Use concise AI-assistance disclosure in the footer; keep the editor's approval gate for articles. Keep source and Commons photographer/license details in the provenance manifest and proper caption/credit near the image.
- Article template must include canonical URL, meta description, Open Graph and Twitter cards, and accurate NewsArticle JSON-LD with author, publisher, publish/update timestamps. Do not fabricate a photograph or license to fill a preview card.
- Draft validation must check headline punctuation, duplicated caveats, image credit, mobile navigation, favicon, source URLs, archive preservation, and that no internal editorial status leaks onto the public home page.
