# Ervin Model — full-site backtest and feature audit
*Research build: November 1, 2026 · Historical tests through 2024.*

## Executive findings

The site now explicitly separates **three kinds of historical evidence**: reconstructed individual-poll Senate data, the separate pooled Senate/presidential archive, and prior presidential county margin baselines. A lower error in one archive does not imply a governor, House, or 2026 result forecast is validated.

| Audit | Historical observations | Raw / simpler MAE | Adjusted / complex MAE | Meaning |
|---|---:|---:|---:|---|
| Senate raw-poll reconstruction (2018–2024) | 61 race-years | 4.09 pp | 4.50 pp | Simple past-only state correction *worsens* error in this test |
| Senate + presidential pooled calibration (2018–2024 walk-forward) | 63 observations | 4.06 pp | 3.28 pp | A **different** partially pooled correction improves the tested sample |
| Selected county presidential baseline (predict 2024) | 160 watch counties | 4.28 pp: repeat 2020 margin | 8.66 pp: extrapolate 2016→2020 linear trend | Trend extrapolation fails badly on this selected sample; no statewide-to-county model is validated |
| Publisher matched 2024 Senate source comparison | Four races each | RCP 3.70 pp / DDHQ 3.45 pp / 270toWin 4.43 pp | RCP 3.95 pp / DDHQ 3.77 pp / 270toWin 4.12 pp | Too few matched races for empirical relative weights; Silver unavailable |

The 61-race Senate reconstruction got 53 of 61 winners' direction correct before the simple past-only adjustment and 52 of 61 after. These are **not** full Ervin's Take backtests: the inputs are equal-pollster reconstructions, not actual archived publisher averages as of Election Eve.

The 63 pooled observations have no winner-correctness test in the stored absolute-error archive. They share states and election years, so effective independent sample size is smaller than 63.

For the county holdout, each selected county has 2016, 2020 and 2024 presidential two-party margin observations. The 2020 repeat baseline predicts 2024 using its 2020 margin; the trend baseline predicts 2024 as `2×2020 − 2016`. **The 160-county sample was chosen using 2024 voting and is selection biased.** The arithmetic uses only 2016 and 2020 *predictor values*, but the sample selection still uses the test year's data, so this is not an independently prospective score.

## Unvalidated areas: no fake accuracy claims

- **House:** all 435 U.S. voting districts are indexed, and 68 reviewed competitive/notable Cook ratings have been recorded with a source date. Nominee and polling data are not automatically verified for the rest. Categorical ratings do not imply numeric winner probabilities.
- **Governors:** 36 races indexed, with 33 attributed governor polling averages in a dated snapshot. There is not yet a consistent historical, matched, as-of-election governor sample to fit or grade an Ervin governor correction. Senate correction is not transferred.
- **County elections:** geographic boundaries can be shown for all states via the online US county atlas with a state-outline fallback; 170 watch units (160 with three-cycle county margin histories plus Alaska) and 83 Michigan county histories supply historical context only. **No live results** are published without official data-source authentication.
- **Election night:** precinct vote-drop, early-voting, election-method, and votes-left metrics require additional provenance, a real ingest source, and district/precinct boundary harmonization. They must remain unavailable rather than simulated as reported totals.

## Features considered from DDHQ Votes

DDHQ publicly describes a multichamber balance-of-power dashboard, custom election watchlists, historical precinct maps, turnout estimates, vote batches, county-level vote goals, voting-method breakdowns and poll-level archives. Source: [DDHQ Votes feature matrix](https://votes.decisiondeskhq.com/pricing).

Implemented in this independent project:
1. A national **House / Senate / Governors** overview that does not invent House/gubernatorial seat models.
2. A selectable geographic U.S. map with Senate-adjusted, governor-polling, House rating-count and historical presidential-margin layers.
3. A race finder and an on-device watchlist, plus a dossier for every House district and every indexed Senate/governor race.
4. Per-county historical context where source records exist, clearly separated from blank 2026 reporting status.
5. A transparent, reproducible historical scorecard showing both gains and losses from adjustments.

Not implemented / not implied: DDHQ's proprietary live feed, election-night calls, vote drops, paid turnout estimates or proprietary forecasts; an official county-results ingest for all 50 states; complete 2026 House candidate or polling normalization; universal calibrated win chances.

## Source provenance and replication

- [Machine-readable backtest scorecard](cross_office_backtest_scorecard.json)
- [Reproducible source script](../scripts/audit_cross_office.py) (`python3 scripts/audit_cross_office.py --check`)
- [61 historical Senate raw-poll races](senate_2018_2024_walk_forward.csv)
- [63 pooled past-only observations](calibration_walkforward_2016_2024.csv)
- [Four matched 2024 publisher averages](../blend_backtest_2024.csv)
- [160 county three-cycle source data](../counties-watch/history.json)
- [House ratings source](https://www.cookpolitical.com/ratings/house-race-ratings)
- [House cross-source rating table](https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_election_ratings)
- [Existing expanded Senate audit](EXPANDED_BACKTEST_2018_2024.md)

**Next meaningful backfill:** matched House and governor polling plus official results across 2018, 2020, 2022 and 2024, with redistricting-aware House district IDs and preserved *as-of* timestamps. Without that source panel, claiming that an Ervin model has been fully backtested for every office would be misleading.
