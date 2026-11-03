# Election-night county feed verification: source versus result

**Election:** November 3, 2026. **Status at construction:** November 2, 2026.

This project distinguishes four conditions that must never be conflated:

1. **County geography indexed** — a locally bundled FIPS geometry exists.
2. **Official election-source link indexed** — the relevant state authority publishes a county link or a county-level official state results portal. A homepage alone does not prove reporting access.
3. **Endpoint responds** — an independent HTTP probe has checked a website. A reachable portal is **not** a 2026 election-night vote feed, even if it includes test data.
4. **2026 county returns validated** — a report has FIPS, election, office, vote counts, a timestamp after closing, and a source link independently associated with that county and election authority. Invalid and premature reports are rejected.

## Current inventory

- 50 states with **3,143** county-equivalent geographic shapes.
- Michigan: **83** of 83 county links from the Michigan Secretary of State county directory, including selected 2026 results page overrides. Some links are general county homepages, not downloadable returns.
- New Jersey: **21** of 21 county links from New Jersey's official 2026 election-night county directory. New Jersey itself does **not** publish statewide election-night totals.
- All other 3,039 county equivalents: independently verified county-source URL missing, except for several statewide official election result portals listed in the registry. These states must remain explicitly unverified rather than silently inheriting Michigan coverage.
- **Zero verified county vote records before polls close.**

## Source-level evidence

- Michigan Secretary of State: https://www.michigan.gov/sos/elections/election-results-and-data/candidate-listings-and-election-results-by-county
- New Jersey Division of Elections 2026: https://www.nj.gov/state/elections/election-night-results.shtml
- North Carolina Board of Elections: https://www.ncsbe.gov/results-data/election-results
- Florida Division of Elections: https://floridaelectionwatch.gov/Downloads
- Ohio Secretary of State election-night results: https://liveresults.ohiosos.gov/
- Pennsylvania Department of State: https://www.pa.gov/agencies/vote/elections/election-results
- Delaware Department of Elections: https://elections.delaware.gov/results/enr/GE2026.html
- New Mexico Secretary of State: https://electionresults.sos.nm.gov/
- Arizona Secretary of State: https://azsos.gov/press

## Adapter constraints

The national CivicAPI adapter currently publishes **race-level** results, not county-specific vote records. The county atlas never allocates those state totals to counties. All source URLs are checked against the county registry or an official state results portal, and all county numeric rows are checked against locally bundled FIPS and timestamps after polls close. Official and precinct totals for the same county are never added together. County corrections require explicit official provenance. Unconnected counties stay neutral in the Reported view.

A live election-night county feed cannot be confirmed before that authority actually publishes its results, and a source URL returning HTTP 200 cannot be counted as verified vote reporting. The source audit runs independently, logs blocked/nonresponsive sites, and publishes missing coverage instead of inventing it.

This inventory is **not** a claim that all 3,143 county election-night feeds have been independently validated. It is a comprehensive accounting of what is and is not verified, with room to add county-specific adapters safely as official data becomes available.
