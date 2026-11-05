# State Desk Site Audit (2) — election-eve resolution ledger

**Source:** 13-page *Ervin Model State Desk — Site Audit*, dated November 2, 2026. This file distinguishes corrections verified against newer repository state from work actually introduced in this patch. Do not describe an unresolved item as fixed merely because a screenshot or test passes.

## Previously resolved after the audit was authored

- **New York governor model rounding:** development replay now rounds each prior-cycle normalized weight like the production function, so the ±0.001 comparison passes.
- **Website deployment:** post-publication Chromium check passed for build `9e846578`; 50 state outlines, 3,143 county polygons, TX 254 county outlines / 38 House district polygons, MI 83 counties / 13 district polygons. New change must still pass its own complete CI and live deployment.
- **Current-map source records:** `house/data.json` includes only a subset of individual Cook ratings even though it carries Cook's **national seven-category 435-seat summary**. Do not infer ratings for the remaining districts from their absence in the competitive list.
- **State canonical:** `state/index.html` now sets the canonical for each `?state=XX` query at page load; this was already corrected in the inspected source and needs no duplicate change.

## Changes in this patch

1. **Stop the obsolete-boundary House calculations from posing as 2026 predictions.** For all **173** districts in nine 2026-redrawn states (AL, CA, FL, LA, NC, OH, TN, TX, UT), withdraw the numerical `marginD` based on the same-number historical House district. Keep actual old votes in explicitly historic fields only. Use existing independent current-map Cook rating for **27** of these races. For the other **146**, show **Unrated / no verified current-map source** rather than invent a margin or assign them to a party. Current 2026 examples: **TX-09 Likely R**, no old `D +37`; **TX-32 Unrated**, no old `D +37.8`; **TX-35 Tossup** rather than old `D +9.8`.
2. **Keep the model office-consistent.** Unchanged-boundary House races use House historical returns, comparable district polls and a dated generic-ballot input. Remove the 20% transfer from state Senate/presidential historical polling errors into House. For **GA and NY**, where a 2022 district result may predate the 2024 boundary, use compatible 2024 House results without mixing years when possible.
3. **Date rather than hard-code the generic ballot.** Store publisher input values, individual source dates, weights, URLs and secondary-source warnings in `polling/generic-ballot-2026.json`. RCP 2026 national generic ballot D +8.9 as of Nov 2 (last reported poll date Nov 1), Silver Bulletin D +8.9 as of Nov 2, secondary DDHQ +8.9 from Oct 30 compilation. A fail-closed election-day source refresher attempts a direct RCP publisher update and only marks it fresh when Democratic/Republican shares match the published margin. If retrieval fails, **the old as-of dates remain**.
4. **House majority display does not turn missing redrawn data into election wins or toss-ups.** The `U` group contains actually unprojected districts. Show Cook's separately published national seven-grade totals beside the model on the House page, not as a backfilled Ervin calculation. Do not state a definitive election-day House majority winner from an uncompleted current-boundary dataset.
5. **Governor card source categories.** CO/HI/WY lack comparable numerical governor averages, but have published Cook Solid D/Solid D/Solid R ratings. Assign those as *source-rated qualitative* in the office balance without creating phantom polling margins. The five numerically close contests are toss-ups, while these three are not.
6. **Election Day lock hardened.** The 09:35 sweep may stage and commit evidence **without** `final/forecast-final.json` existing. The 10:45 scheduled or manual `workflow_dispatch` sweep locks a complete, immutable four-source snapshot. Re-running when already locked validates and returns success **without touching source data**. On a concurrent update and rebase recovery, regenerate the lock *after* the fresh sources have been reconciled and before staging the final file.
7. **Browser and copy:** 50-state atlas validation no longer equates 50 polygons with 50 numerical state predictions; redirect-only smoke does not wait on redundant remote feeds. The preview-final headline displays **REHEARSAL ONLY** before the lock. Correct one-contest grammar, “no Senate race” tooltips, historical governor test count (20), and use `no-cache` for the immutable final snapshot.

## Readiness and unresolved work

**High-priority gaps:** 2026 congressional district polygon geometry remains a 2022/118th Congress reference in redrawn states. A mathematically meaningful all-435 House numerical forecast requires public 2024 presidential returns and/or House voting results transposed onto **actual 2026 boundaries**, plus candidate/incumbency calibrations tested on independent historical data. Currently 146 redrawn districts have no district-specific qualitative Cook rating in the local source index. Cook's national totals are published separately but must not be mechanically assigned to unknown individual districts.

**Additional pending polish:** cross-page typography, portrait licensing and attributions, dynamic generic-ballot secondary aggregators, local network-dependent fallback reliability, fuller 2026 district geography, and 2018 House uniform-swing backtest. These are **not represented as completed by this patch**.

**Release/manual fallback:** the live pre-election schedule is Nov 3, 2026, 09:35 ET source check and 10:45 ET final sweep. If by 11:30 ET `final/forecast-final.json` is still absent on `main`, an authorized operator should open [Election Day final forecasts and publisher source sweep](https://github.com/TheStateDesk/thestatedesk.github.io/actions/workflows/election-day-final-sweep.yml) and use **Run workflow** on `main`; then verify a successful run, the immutable lock in GitHub and the live Pages build stamp. Do not manually construct a lock or claim a final headline before evidence validation. Results are unofficial until state officials certify them.

## Original inputs and independent references

- Source audit: attached *Ervin Model State Desk — Site Audit(2)*, pages 1–13.
- Cook Political Report House ratings: https://www.cookpolitical.com/ratings/house-race-ratings
- Redistricting reference: https://ballotpedia.org/Redistricting_ahead_of_the_2026_elections
- Official census current district geography: https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.120th_Congress.html
- RealClearPolling generic ballot: https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote
- Silver Bulletin generic ballot: https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls
