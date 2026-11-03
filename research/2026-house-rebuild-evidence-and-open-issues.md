# 2026 House boundary rebuild — source, historical validation, and release limits

**As of November 3, 2026 · source branch for PR #19**

This report supersedes the *boundary and House forecast* portions of `AUDIT_2_ELECTION_EVE_RESOLUTION_2026-11-02.md`, which correctly withheld 173 old-boundary forecasts at the time but predates the subsequent 2026-boundary presidential model rebuild.

## Directly supported 2026 congressional geography

The U.S. Census 2026 TIGER/Line shapefiles are imported from official 120th-Congress `tl_2026_*_cd120.zip` files. Source ZIP URLs, independently computed SHA-256 checksums and per-state district totals are in [2026 district geography audit](2026-district-geography-audit.json). Eleven state files were replaced: the nine newly redrawn 2026 states **AL, CA, FL, LA, NC, OH, TN, TX, UT** (173 districts total), plus **GA and NY** for clean contemporary geography. Cartographic simplification preserves geometry topology for the clickable map but is not legal survey-grade geometry.

Missouri is intentionally **excluded** from the new 120th Census import because its 2026 proposal was barred after the federal geofiles were prepared; retain the prior election boundary. The runtime forbids falling back to old 118th congressional boundaries when any of the eleven official current files fails to load.

## Historical 2026-boundary presidential voting is **estimated**

[Presidential votes on 2026 boundaries](../house/presidential-2026-boundaries.json) uses the independently published district presidential vote reconstruction at [Scorvec's MIT-licensed `cd_lean_2026.csv`](https://github.com/scorvec/midterms-2026/blob/main/data/static/cd_lean_2026.csv). The parent archive documents derivation from MEDSL and VEST precinct/blocks, 2020 Census and subsequent geographic allocation. The **173 redrawn districts are all flagged as reconstructed** rather than map-verified candidate totals. These are estimated 2020 and 2024 D–R presidential votes transposed onto new districts, not a 2026 actual vote, not certified historical election results by the 2026 districts, not a new 2026 district poll, and not a verified partisan index from Cook.

For a redrawn district, last cycle's *House* votes under that district number are retained only as historical context; they never become a numerical input by district-number matching. All 435 seats remain indexed. A House D–R numerical scenario is presented for **433** seats using present-boundary presidential priors. **AK-01** ranked-choice and **CA-06** independent ballot remain qualitative exceptions because their ballot formats cannot be reduced to an ordinary D-versus-R hypothetical by relabeling candidates.

## Model training, holdout, and forward rule

[House-only chronological scorecard](house-presidential-backtest-2026.json) stores the source links, sample restrictions and model coefficients. Underlying MEDSL historical House candidate returns are in [the candidate archive](house-actual-2016-2024.json), and historical district presidential priors are in [the historical archive](house-presidential-historical.json).

- 2018 and 2022 contested House elections are the development sample, **793** race-years. Candidate ballots with insufficient Democratic/Republican shares are excluded. The House presidential-lean coefficient `alpha=1.00` was selected using only these development races.
- The separately held-out **2024** contested House election sample (excluding incompatible GA/NY boundaries) has **356** independently scored races, 5.108-point House D–R margin MAE and 96.63% winner agreement *for the base House presidential/generic model*. This is a retrospective performance indicator, not a 2026 election confidence interval or poll-only error.
- A returning-*same-candidate* House residual term `rho=0.35` was selected using 210 comparable 2018 development incumbents. On 264 independently scored 2024 returning-candidate examples the unadjusted base MAE was 4.677 and the adjusted MAE was 3.726. This improvement is only demonstrated for the tested returning-candidate subgroup, not all 435 races.
- The 2026 forecast applies the **same House-specific** national environment + prior-presidential district-lean formula, with that returning-candidate residual only when independently named prior winner and current incumbent match **and the House boundaries are comparable**. Redrawn districts get **zero** transplanted incumbent residual. Individual compatible House candidate polling modifies a baseline according to bounded survey weights. **No Senate/presidential statewide polling-error correction or governor error is imported into House.**

The model's reported 2024 MAE of 5.108 points should not be represented as an 80/90/95% confidence interval for a current race, and the reconstructed presidential vote allocations add *separate uncertainty* to the newly drawn districts.

## Current generic-ballot evidence

[Publisher-specific input file](../polling/generic-ballot-2026.json) keeps each average's own date:
- RCP: Democratic +8.9, published as of November 2 with field period through November 1.
- Decision Desk HQ: Democratic +8.8, directly attributed source as of November 3 (Democratic 51.50%, Republican 42.70%).
- Silver Bulletin: Democratic +8.9 as of November 2.
The production House build weights these by their recorded weights; publication does not automatically certify that the individual sources updated the same day. The election-day source refresher is intentionally fail-closed if it cannot parse an original publisher's table.

## Data and publication safety

The national House dashboard exposes its numerical scenarios alongside **Cook's separate independent national ratings**, which should never be presented as if their party/race classifications were model-calculated probabilities. The county/election-night systems remain separate from preseason forecasts; they must not inject reported votes into the locked pre-election model.

A 2026 congressional district boundary file that is missing or stale triggers a visible unavailable warning; it **must not** quietly use a 2022 region-bundle fallback. State and individual House pages preserve candidate rosters, source links and poll records if the map temporarily fails to load.

All source- and results-connected functionality is subject to provider availability, including CivicAPI county and precinct gaps documented in [CivicAPI live readiness](CIVICAPI_LIVE_READINESS_2026-11-02.md). Neither the 2024 House holdout nor a successful browser check proves live results will be complete nationwide.

## Outstanding limits

- Presidential returns within redrawn 2026 boundaries remain **model-derived geographic estimates**; official Census district polygons don't turn them into certified vote totals.
- Some individual House polls are publisher directories or compiled questions with varying field dates and cannot be treated as independent surveys without source matching.
- The 2024 House holdout is a real chronological test but not a live 2026 out-of-sample verification; it omits several ballot types and boundary changes.
- No attempt has been made to alter candidate-photo licensing or photograph credits, per user instruction.

## Acceptance criteria

The release must pass `scripts/validate-election-site.mjs` (435 district shapes, 11 official Census file vintages, fail-closed 2026-boundary geometry), the House model and history validators, a load/stress test of the national results board, Chromium state/House/governor/election-night/mobile browser tests, and **separate post-publication Chromium verification of the exact live GitHub Pages build SHA**. A green PR check alone does not prove the live site has deployed.
