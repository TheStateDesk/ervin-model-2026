#!/usr/bin/env python3
"""Ensure county vote benchmarks numerically match the national source data.

Do not fail due to equivalent ISO timestamp formatting or JSON integer/float
representation. Only a meaningful difference in polling and model data fails.
"""
import json
from pathlib import Path
from build_county_watch_forecast import parse,build,ROOT
expected=build(parse())
actual=json.loads((ROOT/"counties-watch/forecast-baselines.json").read_text())
assert actual["version"]==expected["version"]
assert len(actual["states"])==17
for code,model in expected["states"].items():
    observed=actual["states"].get(code)
    assert observed, f"{code}: missing county benchmark"
    for key in ("pollMargin","adjustedMargin"):
        assert abs(float(observed[key])-float(model[key]))<0.011, (code,key,observed[key],model[key])
    for key in ("publisherInputs","proxyOrSingleInput","stale","mode"):
        assert observed.get(key)==model.get(key), (code,key,observed.get(key),model.get(key))
    if code == "MI":
        assert observed.get("candidateStrength")==model.get("candidateStrength"), "MI subjective candidate-strength metadata differs from documented audit"
        assert model["candidateStrength"].get("transferVerified") is False, "Do not report unvalidated candidate shift as a proven polling error"
print("PASS: County benchmark source consistency for all 17 watched races")
