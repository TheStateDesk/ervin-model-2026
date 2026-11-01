# Counties to Watch — 2026 Senate

## Coverage
17 watched statewide Senate contests; **ten ranked geographic watch units per state** (170).
The top ten are chosen from 2024 presidential returns. Alaska uses 2024 state
House districts, **not counties**. 2016/2020 Alaska district numbers are not comparable
to 2024 because of changed boundaries. All counts are source-attributed; no
2026 Senate votes are inferred from prior elections.

Historical data: Tony McGovern's
[US county presidential returns 2008–2024](https://github.com/tonmcg/US_County_Level_Election_Results_08-24),
based on Fox News, Politico, NYT and other returns. This is a **secondary
aggregation**, not a newly completed primary certified-result audit.
The Michigan standalone dashboard uses its more detailed state-specific
historical county dataset.

## How top ten are chosen
The importance score is an editorial descriptive index with:
* 50% normalized number of 2024 presidential ballots in that unit.
* 25% normalized absolute 2020–2024 two-party swing multiplied by its 2024 ballots.
* 15% 2024 two-party closeness to 50/50.
* 10% absolute net 2024 D–R vote contribution normalized within the state.

The score is not a published causal measure or an election outcome model.
All ten watch units are shown with their 2016, 2020 and 2024 candidate vote totals
where comparable.

## Historic alignment percentage
For 2016, 2020 and 2024, count the elections where the county's presidential
major-party winner was the same as its state's presidential major-party winner.
The displayed Jeffreys-smoothed descriptive percentage is
`(matching_years + 0.5) / (comparable_years + 1)` times 100.
Also show the raw matching count and limited sample size. **Never describe
this as the probability that the state's 2026 Senate candidate wins, based
on their county result.** Counties are not an independent random sample.

## Statewide-tie benchmark
Start with 2024 two-party Democratic presidential vote share in each county,
add the uniform percentage-point shift needed to bring the *statewide*
presidential two-party share from 2024 to 50%. Under an illustrative
turnout multiplier (65/80/100% of 2024 major-party ballots), compute
the number of non-R votes required for that local percentage.
These are comparative uniform-swing benchmarks, **not county-level 2026 Senate
projections**, especially in independent contests.

## 2026 results: verified local inputs only
The browser reads `counties-watch/results.json` no faster than once a minute
while visible. No updates before relevant election-night reporting.
The importer `scripts/refresh_counties_watch.py` can ingest:

1. The existing Michigan county-wide verified feeds
   `michigan/election-night/county_totals.json` and `county_auto.json`
   for watched Michigan counties.
2. Source-attributed CSV files placed under `counties-watch/imports/`
   by verified state/partner integrations or election-night editors.
   This importer does not automatically discover/parse all 17 external
   state result systems. The separate state election office is linked
   in every state's page.

CSV schema:

```csv
state,fips,county,dem,rep,other,asOf,sourceUrl,reportingStatus
```

* `state` — watched two-letter state postal code.
* `fips` — original five-digit geographic key in history.json.
  For Alaska use 2024 state House district identifiers `02001` etc.
* `county` — exact geographic name (including Alaska district name).
* `dem` — 2026 Democratic candidate, or the named main non-R independent
  in Nebraska, Montana, Alaska, South Dakota. No conflation of different
  party candidates and no addition of a separate Democrat to an independent.
* `rep` — named 2026 Republican candidate.
* `other` — other actual ballots counted, not an inferred total.
* `asOf` — ISO-8601 timestamp with timezone, after the actual polling close.
* `sourceUrl` — direct HTTPS results attribution, not a generic source without
  a verifiable tally.
* `reportingStatus` — `partial` or `complete`, supported by that result source.
  
Duplicate counties, unknown FIPS or names, future/pre-close timestamps,
invalid votes, and non-HTTPS citations are rejected. Older snapshots
cannot displace newer verified totals. Publication to main triggers the
normal GitHub Pages deployment. The scheduled election-night updater
runs the importer but cannot manufacture new returns without an external
verified input. If a source does not support machine-readable reports,
visitors should use the state's original results page.

Election: Tuesday **November 3, 2026**, and some states may complete
counts later. Alaska ranked-choice rounds can extend well beyond election
night; the early first-choice results are not final RCV totals.
