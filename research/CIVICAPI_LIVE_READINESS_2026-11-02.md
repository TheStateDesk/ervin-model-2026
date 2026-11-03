# CivicAPI v2 — election-night live readiness audit

**Probe time:** November 3, 2026 at 03:28–03:32 UTC (November 2, Eastern).  
**Method:** Real read-only GET calls from a GitHub Actions runner, plus registry/schema checks. **No simulated or current election votes were published.**

## Results by requirement

| Requirement | Live finding | Status |
|---|---|---|
| API service availability | `GET /api/v2/status` responded 200; CORS header was `Access-Control-Allow-Origin: *`. | **Passed for this probe** |
| 2026 national race discovery | 487 unique and office-matched registered IDs out of 488 target contests: 434 House, 17 Senate, 36 governors. | **One missing** |
| 2026 race detail access | Eight real 2026 detail GET requests returned HTTP 200 and matched the correct election date, state and federal/statewide office (MI Senate, MI Governor, TX Senate, TX Governor, ME Senate, VA-02, CA-30, AK-01). | **Passed on sampled races** |
| Candidate names and parties | 2026 samples returned candidate lists with names, parties and zero integer votes. Examples: Michigan Senate Abdul El-Sayed/Mike Rogers; Michigan governor Jocelyn Benson/John James; Texas Senate James Talarico/Ken Paxton. | **Passed on sampled races** |
| Actual Nov. 3 vote totals | Sampled 2026 records showed 0 votes and 0% reporting before polls closed. | **Not testable until counting begins** |
| Historical county results | The completed **August 4, 2026 Michigan U.S. Senate Democratic primary** returned exactly 83 `region_results` entries, all `type: "County"`, each with candidate vote fields. | **Proven for that historical MI election** |
| Other geographic structures | A completed New Hampshire House Democratic primary returned 81 regional entries: **75 Town + 6 County**; jurisdiction types are not uniform. | **Mixed; name/type matching required** |
| Raw precinct results | `?precinct=true` returned HTTP 200 for the historical NH race, but did **not** expose a separate `precinct_results` structure or more rows in that test. | **Not verified** |
| Reporting percentage | Sampled 2026 races had `percent_reporting: 0`; historical primaries had nonzero progress values. | **Field verified; future completeness not guaranteed** |
| Reporting timestamps | `last_updated` exists but can be older than election day. Added rejection of explicit pre-close timestamps on positive future reports; only missing timestamps may be identified as `collector_observed`. | **Guarded** |
| Called winners | Historical candidate rows contain `winner` flags; the current national importer does not publish provider race-call decisions. | **Not integrated** |
| Source-level polling | A separately validated CivicAPI polling v2 endpoint and stable polling response schema have not been established. | **Not integrated** |
| Live website latency | Provider advertises 5–10 second active-election updates; **the current site uses GitHub Actions roughly every 10 minutes plus Pages publishing delay**, not native provider speed. | **Not a subminute live feed** |

## The missing 488th race

**VT-01 — Vermont U.S. House at-large.** CivicAPI's search responded 200 and returned House records, but the candidate general-election race IDs examined (122670, 121781, 121260) were dated **2024, 2022 and 2020**, respectively. No valid November 3, 2026 Vermont at-large general-election race ID was identified. The collector must not silently assign an older election to this race. Open America/official sources remain possible fallbacks when their matching data are independently verified.

The other 487 registered race IDs are unique, and their archived election identity/office fields pass the existing matching checks. This does **not** establish that all 487 will report usable votes on election night; only eight were live-detail sampled.

## Current website behavior

- The collector (`scripts/civicapi_national.py`) polls race details **only after the relevant polling-close gate** and requires positive, non-test candidate counts, correct office/year/geography, sensible timestamps and no aggregate rollbacks. It publishes one validated race result at a time to `civicapi/races.json`.
- The client (`election-night/returns-core.js`) rejects incompatible or premature data and does **not** sum different providers' votes. Open America can be used as a separately attributed fallback. The Michigan county clerk pipeline remains separate.
- **New guard:** an explicit stale pre-election `last_updated` with positive counts may no longer be relabeled with the later collector observation time and accepted as election-night evidence.
- The current normalized CivicAPI record contains **contest totals**, not an integrated national county/precinct feed. The Michigan historical primary test establishes a usable *potential* county schema but is not proof of county coverage in the November general election.

## Reproduction

```bash
python3 -m unittest discover -s tests -p test_civicapi_national.py -v
python3 -m unittest discover -s tests -p test_civicapi_probe.py -v
python3 scripts/audit_civicapi_live.py
node scripts/test-live-results-stress.mjs
```

The read-only live probe writes `visual-checks/civicapi-live-preflight.json` during GitHub CI and prints a diagnostic summary. GitHub Actions stores it in the `county-visual-verification` artifact. The probe checks API access and response metadata rather than manipulating the public election-results snapshot.

**Caution:** This is a point-in-time connectivity and contract audit, not a claim that CivicAPI will supply every vote, county, precinct, call, or update on election night. Confirm live post-close values and official state/county authority data during counting.

## Public documentation

- CivicAPI documentation: https://civicapi.org/api-documentation
- CivicAPI FAQ: https://civicapi.org/faq
- Provider historical example: https://civicapi.org/results/elections/96680
- Ervin source-run architecture: [CivicAPI primary results integration](CIVICAPI_PRIMARY_RESULTS_2026.md)
