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
