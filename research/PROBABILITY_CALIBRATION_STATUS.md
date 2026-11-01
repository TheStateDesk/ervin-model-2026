# Status of the Ervin Model's probability calibration

**Current public status (October 31, 2026): Not yet validated as calibrated win odds.**

This notice is intentionally distinct from the website's historical *polling-margin*
backtests. A model that predicts the right margin or winner in some past races
does not, by itself, prove that a displayed 70% chance really represents a
70-in-100 empirical win frequency.

## What a displayed percentage actually measures

The current default race scenario frequency comes from
`scripts/senate_control.js`, which draws 14,000 outcomes using the currently
selected poll average, Original Ervin correction (or selected variant),
a common national error, and a state-specific residual. The draw frequency
is an **internally coherent model statistic conditional on those assumptions**.
It is **not** an estimate previously measured to be well-calibrated.

To avoid invented accuracy, displayed race percentages are rounded to
approximately 5-percentage-point increments, with `<5%` and `>95%` at
the extremes. Senate-control probabilities also remain model-only.

## What would genuine calibration require?

1. **Freeze a dated past-only forecast** for each historical race *before*
   its election. It must include the model version, historical data cut-off,
   polling source(s) available at that time, correction method, probability,
   and uncertainty assumptions. This must not use any later polls or election
   results from the same race.
2. **Grade against final actual outcomes.** Compute Brier scores:
   `mean((model_probability - winner_indicator)²)`. Compare the value
   with reasonable no-skill and polling-only baselines on the identical
   held-out contests. A lower score is better.
3. **Build a reliability diagram.** Group sufficiently numerous independent
   races into probability bands (e.g. 50–60%, 60–70%) and compare
   forecast probability versus observed winner frequency, showing sample
   sizes and uncertainty. Do not grade repeated daily predictions of the
   same race as independent outcomes.
4. **Hold out election cycles.** To compare variants fairly, tune the model on
   earlier elections and score it on later untouched elections, with
   national-year correlation accounted for. Repeat across cycles where possible.
5. **Only then estimate a post-processing correction** (e.g. a regularized
   logistic recalibration or monotonic mapping) on the *training* forecasts,
   verify improvement on held-out forecasts, and publish the exact method.
   Any recalibration is only as reliable as the number of independent races
   and election environments in the archive.

## Why can't a 2026-specific calibration be certified right now?

The 2026 Ervin model's 14,000-draw engine is not a frozen historical forecast
series covering enough comparable earlier elections. The repository's
2016–2024 error archives and 61-race walk-forward audit are informative
for **error correction and point-margin backtesting**, but they are *not*
a matched independent 2016–2024 evaluation of this exact probabilistic
forecast engine. Converting the 88 historical polling observations into
'calibrated 2026 win chances' would confuse correlated, retrospective inputs
with independent historical probability predictions.

A single 2026 Senate cycle (17 targeted races, some independent/ranked
choice) is too small to certify narrow probability bins. Archived forecasts
can nevertheless be scored prospectively after the results become known.

## What readers should take away

- A 70% on the public website means roughly seven in ten simulated
  scenarios, under the model's assumptions—not an empirically certified
  70% likelihood.
- The estimated **ranking** of races and how their scenario frequencies
  respond to changes in poll averages or uncertainty may still be useful.
- Precise probabilistic claims require the independent validation described
  above. Avoid using raw simulation percentages as race calls.
- The best public practice is to disclose uncertainty and validate
  prospective predictions rather than silently multiplying percentages.

### Statistical references

- Gelman, Hullman, Wlezien & Morris, *Information, incentives, and goals in election forecasts*:
  https://www.cambridge.org/core/journals/judgment-and-decision-making/article/information-incentives-and-goals-in-election-forecasts/CDED59D35F6599BF9D31348A79B196F9
- Dimitriadis, Gneiting & Jordan, *Stable reliability diagrams for probabilistic classifiers*:
  https://doi.org/10.1073/pnas.2016191118
- Grimmer, Knox & Westwood, *Assessing the Reliability of Probabilistic U.S. Presidential Election Forecasts*:
  https://dcknox.github.io/files/GrimmerKnoxWestwood_AssessingReliabilityPresidentialElectionForecasts.pdf
