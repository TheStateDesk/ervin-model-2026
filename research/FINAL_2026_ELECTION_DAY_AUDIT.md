# Ervin Model · Final November 3, 2026 simulation audit

**Source of truth:** [Reproducible 144,000-draw ensemble](../final/ensemble-144000.json) and [generator](../scripts/run-ensemble-144000.mjs). The pre-election forecast remains frozen in [forecast-final.json](../final/forecast-final.json).

## National editorial call

- House: Democratic seats mean **249.629**, median **249**, single-seat mode **247**. Middle 90% of the simulated distribution: **227–273**. Conditional Democratic-House share: **99.13%**.
- Senate: Democratic seats mean **49.830**, median and mode **50**. Middle 90%: **46–53**. Outcomes: **37.36%** with 51+ Democratic seats, **55.65%** with 50+ Republican seats, **6.99%** unresolved because of potential new independent senators.
- Governorships: Democratic seats mean **26.853**, median/mode **27**. Middle 90%: **22–31**. This is a count of all 50 governorships, including 14 off-cycle holds.

**Headline:** “A Blue House. A Senate Cliffhanger.” The 249 House, 50 Senate and 27 governor seats are rounded central estimates, not the most common exact four-way joint outcome. The highest-frequency exact joint combination in this simulation occurred only 133 times (0.0924%); selecting it would overfit random sampling.

## Distribution tests

The House distribution has standard deviation 14.144, skewness +0.119, and excess kurtosis −0.012, consistent with a roughly bell-shaped central distribution. Local modes at 245, 247, 249 and 251 Democratic seats are adjacent discreteness/sampling bumps, **not convincing evidence of separate underlying scenarios**.

The House 239-seat bin occurred 3,297 times compared with 3,062 under a matched discretized normal distribution (nominal z +4.289). The Senate 56-seat and 43-seat tails are lighter than the matched normal fit (198 versus 300 and 47 versus 108). Because the normal is fitted to these same simulations and many bins were screened, these deviations are **descriptive**, not independent hypothesis-test significances. No arbitrary adjustment to the final forecast is warranted on that basis.

All three original published histograms sum to exactly 144,000. The seeded run uses fixed observation counts and identical source files. Expanded output adds Senate R and independent seat-count histograms to check seat conservation.

## Robustness cautions — not suppressed

1. **House map changes:** 173 House districts use 2026 allocation assumptions with wider modeled residuals; neither a 99% scenario frequency nor a district winner is a calibrated real-world probability.
2. **Senate held races:** 17 Senate margins have numeric model inputs; 18 other contested races are held at their current partisan alignment, excluding correlated upsets in those races.
3. **Independent senators:** The simulator treats potential non-Republican independent victories in Nebraska, South Dakota and Montana as independently caucusing until affiliation is known. Control remains unresolved when neither side has a majority on its own.
4. **Governor historical purity:** The governor shock pool includes only past governor comparisons, not Senate/presidential error. Its eligible historical governor sample is small (**20**).
5. **Office-specific histories:** Senate uses 61 historical Senate walk-forward residuals; House uses 232 House residuals; governor uses 20 governor residuals. Each is standardized and winsorized; national movement is correlated across offices.
6. **Unmodeled outcomes:** The mean is sensitive to the strength of the shared national shock, candidate effects, source duplication and district reallocation. Underlying polling and seat ratings are frozen at the published source lock.
7. **Interpretation:** Simulated shares represent *conditional model frequencies*. The public dashboard must not claim its House, Senate or gubernatorial frequencies have been externally calibrated.

## Editorial switch and live-result standard

At **5:55 p.m. America/New_York on November 3, 2026**, the canonical [State Desk home](../states/) changes into a national general-election results layout. This is five minutes before polls first close in parts of Kentucky and Indiana. Until validated unofficial 2026 votes exist, the reported map stays gray and commentary announces that results are awaited.

The source-linked commentary rail posts two- or three-sentence automated summaries only when new normalized counts arrive; no scheduled filler, fabricated vote totals, premature calls or merging of incompatible source counts. The static site cannot itself run an autonomous language model or independently verify every jurisdiction's data stream. These updates are intentionally numerical and factual; richer human editorial notes still require review and publishing.

**Audit result:** The published central projection is defensible *as a conditional model summary*; there is no evidence from the simulated seat histogram alone to justify shifting it from 249 House, 50 Senate, 27 governors.