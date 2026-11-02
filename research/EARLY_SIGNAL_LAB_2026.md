# Stats for Nerds: early signal laboratory (November 2, 2026)

**Live page:** https://geervin.github.io/ervin-model-2026/stats-for-nerds/

## Why this exists

We want an early, geographically diverse set of eastern-closing elections capable of indicating a broader movement before the Texas, Kansas and Iowa Senate vote totals can be interpreted. *Meaningful* means a result whose counted geographic coverage and absentee/early-vs.-in-person mix have been independently audited. A reported total without that metadata is a watchlist item, not a signal.

### Reproducibility: the 14,000 simulations

No version-controlled archive of previously performed **14,000 precinct-level simulations** could be identified in this repository or earlier stored election artifacts. The page therefore creates **14,000 fresh deterministic scenario draws** (seed **20261103**) from an explicit hierarchical shared-swing model. It must **not** be described as reproducing the earlier claimed simulations, a trained AI, a historically backtested cross-state predictive model, or a validated win-probability engine.

The prior means are the existing Original Ervin November 2 Senate adjusted margins from [forecast-baselines.json](../counties-watch/forecast-baselines.json) and the 435-district margin source from [Ervin House model](../house/ervin-forecast-2026-11-02.json). All margins use **Democratic minus Republican two-party margin in percentage points** (margin +2 => D share 51.0%). State model inputs are loaded, not recalculated.

Each run draws independent standard Gaussian shocks for:

| Component | Prior shock standard deviation in D−R points |
|---|---:|
| National | 2.60 |
| Southern region | 2.15 |
| Midwest region | 2.05 |
| Suburban coalition | 1.60 |
| Rural/exurban coalition | 1.45 |
| Signal-specific unexplained residual | 4.40 |
| TX / KS / IA unexplained residual | 3.60 / 3.70 / 3.60 |

A target/signal margin is its public baseline plus a linear combination of the five shared shocks and an independent residual. Loadings are openly published in `stats-for-nerds/app.js`, not estimated from observed cross-state historical covariance. The ranking of signals uses the covariance ratios *implied by these assumptions*, and therefore does not establish actual predictive performance.

For input signal `s` with observed D−R margin `y_s`, baseline `b_s`, and simulated deviation `x_{is}`, run `i` receives likelihood weight:

`w_i = exp[-0.5 * Σ_s ((x_is - (y_s - b_s)) / σ_s)^2]`

Weights are normalized; the target scenario is its weighted margin average. The displayed 10th–90th percentile ranges are conditional *sensitivity bands*, not confidence/credible intervals with validated coverage. Effective sample size is `(Σw)^2/Σw²`; a low (<500) effective count triggers a warning. Missing inputs produce **zero change**. No results are added to the official election forecast files or election-night counts.

Automatic reviewed inputs use a narrower provisional standard deviation, with a floor at 3.1 points; user-entered hypotheticals use a wider one with a floor at 5.8. This uncertainty choice is an editorial scenario judgment, **not calibrated sampling theory**.

### Early-close research shortlist

These are **candidates**, not guaranteed early-reporting jurisdictions or certified predictive precincts:

| Reference | Closes (Eastern) | Cross-state test |
|---|---|---|
| KY-06 House | 6:00 p.m. | Rural/exurban Midwest-adjacent variation; KS and IA |
| VA-02 House | 7:00 p.m. | Coastal/suburban national movement; TX and KS |
| VA-05 House | 7:00 p.m. | Rural/exurban swing; KS and IA |
| Georgia Senate | 7:00 p.m. | Southern statewide candidate/coalition effect; TX |
| South Carolina Senate | 7:00 p.m. | Southern statewide shift; TX |
| FL-27 House | 7:00 p.m. | Miami-area Hispanic/suburban electorate; limited TX comparison |
| North Carolina Senate | 7:30 p.m. | Southern statewide margin; TX/KS, with early-vote caution |
| Ohio Senate | 7:30 p.m. | Industrial/Midwestern statewide movement; IA/KS |

Because county-specific release-time histories and precinct-level reporting-mode breakdowns are **not currently stored**, the site does **not** claim that named precincts will have produced a representative volume before Kansas/Texas central-time closes. Some live candidate records will remain unreported until well after the actual poll-closing time. On November 3, 2026, Eastern time is EST and Central time is CST.

Each signal's ranking is descriptive and contingent on the assumed cross-region loadings, with added race-specific residual error. Different races and statewide contests have unequal candidate effects; we have **not** shown that Georgia Senate votes in 2026 perfectly track Texas Senate votes.

## Strict audited-return intake

The source-authorized normalized intake is [reviewed-signals.json](../stats-for-nerds/reviewed-signals.json). Initial `signals` is **empty**. A validated human or publisher adapter must explicitly review each election and insert a complete row; an API response alone is **not enough**. Example *schema illustration only, not real votes*:

```json
{
  "version": 1,
  "election": "2026-11-03",
  "signals": [
    {
      "raceId": "VA-02",
      "election": "2026-11-03",
      "office": "House",
      "audit": "reviewed",
      "geographyReviewed": true,
      "modeReviewed": true,
      "ballotType": "mixed",
      "asOf": "2026-11-04T01:05:00Z",
      "sourceUrl": "https://example.gov/election-report",
      "dem": 22500,
      "rep": 21500,
      "total": 44400,
      "expectedVoteFraction": 0.54,
      "geographicCoverage": 0.63,
      "reportingUnits": 28,
      "voteModes": {"early": 16800, "inPerson": 27600},
      "expectedEarlyFraction": 0.40
    }
  ]
}
```

All numeric figures above are fabricated **only to illustrate the data contract**; this row is **not** included in the published data file.

The frontend rejects any row with missing or incongruent election, office, audited race, time before *that race's* close, implausible candidate totals, no HTTPS report URL, less than 35% of final expected vote counted, fewer than 20 independent reporting units, less than 50% audited geographic coverage, fewer than 3,000 two-party votes for House (10,000 Senate), or an observed early/absentee share departing from reviewed expected mode mix by more than 8 percentage points. Unknown / all-mail / Election Day-only compositions are rejected.

**Caveat:** Even these gates are not proof of representativeness. The source reviewer must certify geography, comparable historical lines, provisional candidate identification, absentee-vote treatment and source-to-screen timestamps. A reporting-unit count is not an expected vote fraction. The 35%, 50% and 8-point thresholds are conservative **defaults**, not empirically optimized.

## Existing vote feeds

The browser independently checks Open America House/Senate results as a **candidate watch flag only**. These lack reliably interoperable reporting-mode and county composition data; thus a total or precinct-reporting percentage alone **never** triggers a posterior forecast update. The existing Michigan county and precinct ingestion pipelines continue unchanged. The new CivicAPI v2 source monitor is not treated as automatically certified by the dashboard.

The what-if form allows a viewer to enter a hypothetical two-party share and estimated fraction reported for a signal, with a source URL if available. It is strictly a browser-session sandbox and always labeled hypothetical. An input for which there is an audited live signal cannot be double counted.

## Improvements needed for a validated model

1. Obtain geographically identifiable 2022 and 2024 *timestamped* partial reports from representative counties and precincts in Virginia, Kentucky, Georgia, Florida, South Carolina, North Carolina and Ohio, with vote-mode categories and split/rerouted absentee tabulation flags.
2. Use those historical snapshots to backtest which signal clusters outperform random geographic selections **at the same reporting time and expected vote share**. Estimate the cross-state correlation with 2020, 2022 and 2024 (respecting different office effects and 2026 redistricting).
3. Use appropriate house-vs.-Senate adjustments, partial-reporting variance and regional demographic validation, then calibrate uncertainty against leave-one-election-out tests.
4. Only after successful historical tests promote vetted precinct/county signals into the automated reweighting pipeline. Preserve immutable audit provenance and replayable correction snapshots.

Current output is a **working exploratory laboratory**, not a certified 14,000-run precinct oracle or automated national vote projection service.
