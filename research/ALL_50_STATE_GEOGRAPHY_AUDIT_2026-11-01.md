# 50-state election-map audit — November 1, 2026

**Scope:** Code-level geographic coverage, per-state SVG rendering, county-click and keyboard selection, U.S. House district matching, geometry loading/fallback behavior, and historical county scenario inputs across the **50 states**. This is not a certified 2026 congressional boundary audit or live mobile-browser test.

## Results

- **50/50** states with valid county and House geography.
- **3,143** county-equivalent boundary polygons and **435** voting House district shapes; all match the district registry.
- **100/100** actual local map render tests passed with finite SVG paths, mouse click and Enter activation.
- All 10 local regional geometry packs loaded and passed the render checks. Five states (AK, AZ, MI, PA, TX) have individual state assets; the map loader uses bundles directly in the other 45 states rather than issuing failed 404 requests.
- The four states with both a separately hosted file and a regional duplicate (AZ, MI, PA, TX) have matching county FIPS IDs and district IDs; Alaska is individual-only.
- 2026 conditional county scenarios generated finite margins for all **3,112 available 2024-historical counties** across 49 non-Alaska states; Alaska's separate geography/reporting units are deliberately excluded from these numeric scenarios.
- **One missing historical unit:** Kalawao County, HI (FIPS 15005) has no separate 2024 presidential voting record in this dataset. The county outline must remain visible, but any independently generated 2026 vote-margin estimate stays unavailable.
- Map polygons reflect **2022 Census/TIGER reference geography** and 118th Congress House boundaries. Congressional redistricting after those datasets is not automatically represented, and source shapes should not be used as legally certified 2026 districts.
- The site's GitHub Pages publication and real iPhone Safari rendering are not independently confirmed by these programmatic checks. Election-night returns and turnout feeds require independent source readiness checks.

## Every state

| State | County shapes | House districts | Geometry source | Historical limitation |
|---|---:|---:|---|---|
| AK | 30 | 1 | Individual file + local bundle (individual only) | Alaska reporting units not harmonized |
| AL | 67 | 7 | Local regional bundle | None |
| AR | 75 | 4 | Local regional bundle | None |
| AZ | 15 | 9 | Individual file + local bundle | None |
| CA | 58 | 52 | Local regional bundle | None |
| CO | 64 | 8 | Local regional bundle | None |
| CT | 9 | 5 | Local regional bundle | None |
| DE | 3 | 1 | Local regional bundle | None |
| FL | 67 | 28 | Local regional bundle | None |
| GA | 159 | 14 | Local regional bundle | None |
| HI | 5 | 2 | Local regional bundle | Kalawao |
| IA | 99 | 4 | Local regional bundle | None |
| ID | 44 | 2 | Local regional bundle | None |
| IL | 102 | 17 | Local regional bundle | None |
| IN | 92 | 9 | Local regional bundle | None |
| KS | 105 | 4 | Local regional bundle | None |
| KY | 120 | 6 | Local regional bundle | None |
| LA | 64 | 6 | Local regional bundle | None |
| MA | 14 | 9 | Local regional bundle | None |
| MD | 24 | 8 | Local regional bundle | None |
| ME | 16 | 2 | Local regional bundle | None |
| MI | 83 | 13 | Individual file + local bundle | None |
| MN | 87 | 8 | Local regional bundle | None |
| MO | 115 | 8 | Local regional bundle | None |
| MS | 82 | 4 | Local regional bundle | None |
| MT | 56 | 2 | Local regional bundle | None |
| NC | 100 | 14 | Local regional bundle | None |
| ND | 53 | 1 | Local regional bundle | None |
| NE | 93 | 3 | Local regional bundle | None |
| NH | 10 | 2 | Local regional bundle | None |
| NJ | 21 | 12 | Local regional bundle | None |
| NM | 33 | 3 | Local regional bundle | None |
| NV | 17 | 4 | Local regional bundle | None |
| NY | 62 | 26 | Local regional bundle | None |
| OH | 88 | 15 | Local regional bundle | None |
| OK | 77 | 5 | Local regional bundle | None |
| OR | 36 | 6 | Local regional bundle | None |
| PA | 67 | 17 | Individual file + local bundle | None |
| RI | 5 | 2 | Local regional bundle | None |
| SC | 46 | 7 | Local regional bundle | None |
| SD | 66 | 1 | Local regional bundle | None |
| TN | 95 | 9 | Local regional bundle | None |
| TX | 254 | 38 | Individual file + local bundle | None |
| UT | 29 | 4 | Local regional bundle | None |
| VA | 133 | 11 | Local regional bundle | None |
| VT | 14 | 1 | Local regional bundle | None |
| WA | 39 | 10 | Local regional bundle | None |
| WI | 72 | 8 | Local regional bundle | None |
| WV | 55 | 2 | Local regional bundle | None |
| WY | 23 | 1 | Local regional bundle | None |

## Reproduce

Run `node scripts/validate-election-site.mjs` from the repository root. The GitHub Actions **Website integrity** workflow runs on updates to relevant election source files. The validator loads every state via the same local geography engine, tests the SVG render output and keyboard/click events, and checks the 435 House directory IDs, source integrity and page asset references.

**Caution:** Passing static integrity checks does not establish up-to-date vote totals, county-by-county turnout, legally authoritative district boundaries, or calibrated model accuracy.
