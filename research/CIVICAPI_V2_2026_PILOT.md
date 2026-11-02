# CivicAPI v2: 2026 source-coverage pilot

**Status:** installed as an auxiliary, fail-closed source monitor. It does **not** replace the site's existing attributed Open America/state election-office results or its county-clerk data feeds.

## What is wired up

- Every consolidated state edition now offers a **Forecast / Results** switch on its congressional district map. Forecast uses the pre-election Ervin House model; Results uses published, validated candidate totals, otherwise leaves the district gray.
- Selected House districts have compact candidate cards. A verified photo is shown where the underlying source provides an HTTPS portrait URL; otherwise the card uses initials. A historical incumbent is clearly labeled as historical and **not** as a confirmed 2026 nominee.
- The result mode reads existing independently validated Open America House totals plus a static CivicAPI snapshot, never adding vote counts from the two providers.
- An expandable **CivicAPI pilot** audit is visible in each state's election-night results section.
- The scheduled source checker evaluates six initial contests (AL-07, MI-07, TX-18, Michigan Senate, Maine Senate, Texas governor), with an expandable target registry in `scripts/civicapi_probe.py`.

## Confirmed routes and requirements

Provider homepage: https://civicapi.org

Provider documentation: https://civicapi.org/api-documentation

- `GET https://civicapi.org/api/v2/race/search` for election discovery.
- `GET https://civicapi.org/api/v2/race/{id}` for details.
- The source advertises results, geography, polling and fast updates, but **its polling-specific v2 endpoint and a stable, audited field schema have not yet been verified.** No CivicAPI polls are weighted into the Ervin model.
- A source may be searchable without having usable 2026 results or a compatible schema. This program treats an empty/ambiguous result or missing required fields as an unavailable source, **not a zero-vote outcome**.

## Hard acceptance gates

The initial collector requires a matching jurisdiction, office, named House district if applicable, exact November 3, 2026 election date, general-election type, exactly one matched race ID, credible post-close publication timestamp, and internally consistent nonnegative integer candidate totals. It rejects primary/special/runoff races, ambiguous matches, pre-election or test totals, and missing time/date identity.

For 2026 county and precinct coverage, the existing locally attributed clerk feeds remain authoritative. The CivicAPI pilot does not infer county totals from statewide totals or vice versa.

## Schedule and limitations

`.github/workflows/civicapi-probe.yml` checks four times daily normally and requests 15-minute checks Nov 3–5, using GitHub Actions best-effort scheduling. It publishes `civicapi/discovery.json` and `civicapi/races.json` through the existing Pages process. A browser may refresh cached source files but cannot make GitHub's jobs run on demand or guarantee low-latency publication. The public direct API may be restricted by browser CORS; server-side checking avoids that dependency.

Unit tests: `python3 -m unittest discover -s tests -p test_civicapi_probe.py -v`.

The source-health audit must report actual compatible data before expanding to more races or treating CivicAPI as an automated nationwide results vendor. A valid 200 response alone does not certify the identity of the contest or the quality of its vote reporting.
