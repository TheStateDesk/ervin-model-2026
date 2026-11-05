# November 2, 2026 — polling expansion and county display repair

## Polling coverage, source-separated

- Senate: 30 states with at least one published survey in the [Poliwave polling directory](https://www.poliwave.com/us/fed/polls); 17 states are also in the Original Ervin historical-adjustment model. The directory's published counts and margins are indexed context, **not newly ingested raw polling data or a replacement Ervin adjustment**.
- Governors: 33 states with a published average in [On Point Politics](https://www.onpointpolitics.us/polls/governor), out of the site's 36 listed governor contests. Publisher averages are displayed separately from individual polls.
- House: 118 district entries in Poliwave's published index, supplemented by 110 previously sourced single-district latest-poll entries, for **121 unique House districts with either an indexed polling reference or an imported comparable public survey**. Some source entries cover multiple candidates, generic or partisan-funded surveys; they are not independently averaged or assumed mutually independent.
- Additional primary-source survey release: 14 Senate and governor general-election matchup results across AK, IA, KS, ME, MI, OH, TX, published November 1 by [Siena Research Institute](https://sri.siena.edu/2026/11/01/nytimes-siena-poll-of-likely-voters-alaska-iowa-kansas-maine-michigan-ohio-and-texas/). Each links to the issuing institution, includes candidate shares and reported sampling margin of error, and remains separate from the preexisting Ervin forecast.
- JSON archives: `polling/coverage-2026-11-02.json`, `polling/primary-seven-states-2026-11-01.json`. Original survey archive files are unchanged; model adjustments have not been recomputed from these new indexes.
- These indexes are publication snapshots, not automatic or exhaustive real-time polls. Polling providers may revise values or update after the stated dates.

## County repair

- Added all 100 **direct local** GeoJSON assets: `geo/counties/{STATE}.json` and `geo/districts/{STATE}.json` for every state. Previously only AK, AZ, MI, PA and TX had individual state files; other states first fetched larger regional files.
- The shared `scripts/geo-engine.js` now uses the small state file first, with the appropriate local `geo/packs/pXX.json` regional backup and a bumped file version that bypasses outdated browser caches.
- The consolidated `state/` page now displays county geometry **before** optional polling/history metadata completes, so a slow or failed polling source cannot suppress county outlines. It renders a visible shape-count/loading status, more legible county borders, county-name finder, zoom in/out, fit-to-state controls, and an explicit error/reload control.
- Geography is historical 2022 Census reference data; county 2026 projections remain conditional and do not represent local polling. House reference district lines are not certified for all 2026 redistricting changes. Hawaii's Kalawao County has no separately available historical vote margin in the referenced archive, but remains visible as a county outline.
- Source archive, polling, and map assets are now checked by `scripts/validate-state-desk.mjs` and `scripts/validate-election-site.mjs`, which are configured to run from `.github/workflows/website-integrity.yml`.

## Checks performed

- Direct-file/backup comparisons completed for all 10 packs covering **50 states and 100 assets**, with **zero shape-count or state-code mismatches**.
- Simulated state-dashboard execution successfully drew **254 Texas counties and 38 House districts** and **83 Michigan counties and 13 House districts**, including nonblocking polling integration, on-map status and county zoom handlers.
- The earlier 50-state geometry renderer audit also passed **100 of 100 county/district SVG rendering checks** (3,143 county-equivalent polygons; 435 House districts).
- Live GitHub Pages publishing and native iOS Safari were **not** independently confirmed; these checks do not substitute for cross-device browser QA or real election-night result feed testing.

To inspect: [all states](https://thestatedesk.github.io/states/) → [Texas](https://thestatedesk.github.io/state/?state=TX#stateGeography) or [Michigan](https://thestatedesk.github.io/state/?state=MI#stateGeography).
