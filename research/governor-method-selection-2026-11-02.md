# Governor method-selection study — November 2, 2026

## Decision

**Retain the current governor-only correction in the 2026 forecasts.** It uses historical polling-to-result errors from *earlier governor races in the same state only*. A candidate adjustment with a 2-point cap performed best in the exploratory 2020–2022 sample, but performed worse than the incumbent in the final 2024 chronological check. With just **two** 2024 eligible race-years, neither the challenger nor a post-hoc tuned 3-point cap is adequately validated for promotion. No federal (Senate/presidential) polling errors or House races are imported into gubernatorial correction.

The active rule remains 50%/30%/20% recent governor cycles, normalized over available earlier elections, with one-cycle correction shrunk to one-third, two-cycle correction to two-thirds, and three-cycle correction left intact. This same actual calculation is run in the historical replay and for 2026 governor forecasts. Candidate-related context in Ohio is a separately annotated term, **not** part of this historical test; avoid implying it is backtested.

## Chronological policy evaluation

There are 57 distinct historical governor comparisons covering all 36 current governor states. Only 20 historical election-years have prior comparable governor polling and can be independently scored. First-cycle observations are source history, **not** a validated backtest. The retrospective errors below are absolute D-minus-R margin misses, in points (smaller is better). The 2024 check consists solely of two observed governor elections and is too small to certify model selection.

| Governor-only policy | Development through 2022 (18 events) | Chronological 2024 check (2 events) | All past-only (20 events) | RCP-only subset (10 events) |
|---|---:|---:|---:|---:|
| No correction | 4.105 | 9.720 | 4.667 | 3.658 |
| **Active 50/30/20 + 1/3, 2/3, 1 shrink** | **3.785** | **6.988** | **4.105** | **3.816** |
| Active rule, cap correction at ±2 points | 3.702 | 7.720 | 4.103 | 3.658 |
| Active rule, cap correction at ±3 points | 3.735 | 7.125 | 4.074 | 3.726 |
| Active rule, more aggressive shrink (1/4, 1/2, 3/4) | 3.865 | 7.670 | 4.246 | 3.776 |
| Most recent governor error only + current shrink | 3.852 | 8.850 | 4.351 | 4.305 |

Each alternative is evaluated using earlier same-state governor records for each target race; no target election's result contributes to its own correction. **The 3-point cap's best all-years statistic is not independent evidence of superiority because it was compared on the evaluation data itself.** No policy is described as proven accurate. The mixed-quality historical source archive includes RCP averages, 270toWin reconstructions, and individual surveys; improvements in one target-source subset can fail to generalize to another.

The current correction is the only one used to produce the public 2026 governor forecast. Using future 2026 results to fit or select the 2026 forecast would leak information and is prohibited. Full individual historical rows and source URLs remain in [the source archive](governor-same-office-2014-2024.json) and [the holdout scoreboard](governor-same-office-backtest-2026-11-02.json).

## Reproduction and promotion safeguards

Run `node scripts/governor-method-selection.mjs` from the repository root. The command recomputes the same-six policy family from original historical rows, checks that every 2026 state uses exactly the current production `scripts/governor-backtest.js` correction, and refuses to consider new policy promotion on fewer than 10 independently testable 2024 observations.

For a future release to be described as improved, use additional verified governor polls and results across independent historical cycles and states, freeze policy selection before looking at the chronologically later test group, and show its held-out MAE and close-race performance. Preserve the raw and unsuccessful comparisons in the audit data even if the public-facing governor forecast layout does not show the whole experimentation table.

### Office-family rules

- Governor polling errors: **same state's prior governor elections only**.
- U.S. Senate: separately maintained existing federal Senate/presidential reference history. Alaska's historical House candidate context is marked separately, not generalized.
- U.S. House: Cook and the other existing district/race sources, not statewide governor or federal polling-error corrections.
