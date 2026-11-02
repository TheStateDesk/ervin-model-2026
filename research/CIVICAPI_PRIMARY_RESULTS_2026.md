# CivicAPI v2 is the primary national election-night data provider

**Implemented:** November 2, 2026. Public site: https://geervin.github.io/ervin-model-2026/election-night/

## Architecture

1. GitHub Actions runs `scripts/civicapi_national.py` on a best-effort ten-minute schedule during the November 3 evening / November 4 early morning UTC window, and periodic checks otherwise. The current deployment uses **GitHub Pages**, so it cannot guarantee civicAPI's native 5–10-second refresh rate.
2. The collector asks `https://civicapi.org/api/v2/race/search` for candidate race IDs using 2026 general-election date, state and federal office. It stores validated IDs in `civicapi/registry.json` instead of repeating searches for all races. The local index contains 435 House, 17 modeled Senate and 36 governor contests.
3. After each jurisdiction's relevant poll close, it requests `https://civicapi.org/api/v2/race/{id}`, validates the returned `election_date`, `election_name`, `election_type`, `election_scope`, `province`, `district`, `test_data`, `candidates[].name`, and `candidates[].votes`, and publishes only positive, internally consistent candidate totals in `civicapi/races.json`. It records when a count was **observed** if the provider has no usable `last_updated` timestamp, rather than pretending the provider supplied one.
4. The standard, single GitHub Pages publishing workflow deploys committed snapshots. No direct cross-origin CivicAPI call is required by end-users.
5. `election-night/returns-core.js` independently validates the published result schema, race ID, provider attribution, closing time and candidate totals in the browser. CivicAPI is preferred. Open America is a separately attributed fallback when CivicAPI is missing, more than 15 minutes behind a source, or has fewer reported votes. Totals from two sources for the same contest are **never summed**.
6. The consolidated Election Night, each State Desk source audit, and each House district's Results mode all consume this provider ordering.

## Status and limitations

**Discovery of a provider race ID is not the same thing as obtaining 2026 vote totals.** On November 2, votes should remain absent from the published source data. The last unverified district ID, if any, stays as a coverage gap: its result is not replaced by an unrelated state legislative race.

CivicAPI is a third-party aggregator of election-office and some media reporting. Data may be delayed, corrected or inconsistent. See [the civicAPI FAQ](https://civicapi.org/faq) and [API documentation](https://civicapi.org/api-documentation). Results are unofficial until certified by the responsible election authority.

**No double counting:** the same vendor may mirror official totals already available from a clerk. State and county totals must not be added to precinct totals, and duplicate API providers do not represent additional ballots.

**County and precinct:** CivicAPI advertises region and precinct data, but the present normalized national adapter publishes *race-level* counts, not a verified county/precinct schema. Michigan's separately attributed county clerk pipeline remains authoritative for the county and precinct panels. We should only extend the national normalized schema after testing `region_results` and the precinct endpoint against named official county sources.

**Polling:** no independently confirmed versioned public CivicAPI polling endpoint is connected to this model. CivicAPI result totals do not become pre-election polling inputs.

**Operational safeguards:** provider concurrency is capped at six, the collector requires exact dates and offices, rejects test-data and invalid vote counts, and holds decreasing counts for source review. If all providers fail, the website displays missing results rather than zeros. GitHub Actions cron and Pages deployment are best effort and may lag. Check `civicapi/discovery.json` for the last checked timestamp and number of IDs matched.

## How to test

```bash
python3 -m unittest discover -s tests -p test_civicapi_national.py -v
node scripts/test-live-results-stress.mjs
node scripts/test-election-night-balance.mjs
```

The simulation test uses **synthetic fixtures only** and does not publish synthetic votes. It covers 435 simultaneous House races from two overlapping providers, 10,000 successive updates, rollback handling, wrong-race/primary/wrong-year records, before-close reports, source preference and URL safety.

For historical forecast errors, see [archived Senate and House evidence](election-night-historical-moe-2026.json). Historical pre-election forecasting errors cannot validate the reliability of partial election-night votes.
