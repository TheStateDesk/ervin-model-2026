#!/usr/bin/env python3
"""Recompute published Ervin Model historical scorecards from checked-in data.
This is an audit, not a claim that every office has a fitted or validated model.
--check validates the machine-readable scorecard against source evidence.
--write regenerates it deliberately after a source or methodological change.
"""
from __future__ import annotations
import argparse, csv, json, math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"research/cross_office_backtest_scorecard.json"

def read_csv(path):
    with (ROOT/path).open(newline="",encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def measure(rows, raw, corrected, actual):
    f=[(float(x[raw]),float(x[corrected]),float(x[actual])) for x in rows]
    assert f, "No observations supplied"
    n=len(f)
    def mae(i):return sum(abs(x[i]-x[2]) for x in f)/n
    def rmse(i):return math.sqrt(sum((x[i]-x[2])**2 for x in f)/n)
    winners=[x for x in f if x[2]!=0]
    correct=lambda i: sum((x[i]>0)==(x[2]>0) and x[i]!=0 for x in winners)
    return dict(n=n,rawMAE=mae(0),adjMAE=mae(1),rawRMSE=rmse(0),adjRMSE=rmse(1),
        rawWinners=f"{correct(0)}/{len(winners)}",adjWinners=f"{correct(1)}/{len(winners)}")

def compute():
    senate=read_csv("research/senate_2018_2024_walk_forward.csv")
    pooled=read_csv("research/calibration_walkforward_2016_2024.csv")
    source=read_csv("blend_backtest_2024.csv")
    county=json.loads((ROOT/"counties-watch/history.json").read_text(encoding="utf-8"))
    base=measure(senate,"Poll margin D-R","Adjusted forecast D-R","Actual margin D-R")
    base["byYear"]={str(y):measure([x for x in senate if int(x["Year"])==y],"Poll margin D-R","Adjusted forecast D-R","Actual margin D-R") for y in (2018,2020,2022,2024)}
    # Pooled archive supplies absolute-error statistics, not signed actual or predicted margins.
    # We intentionally do NOT invent winner-direction validation for this dataset.
    def pooled_stat(items):
        n=len(items)
        return {"n":n,
                "rawMAE":sum(float(x["rawAbsError"]) for x in items)/n,
                "adjMAE":sum(float(x["correctedAbsError"]) for x in items)/n,
                "rawRMSE":math.sqrt(sum(float(x["rawSqError"]) for x in items)/n),
                "adjRMSE":math.sqrt(sum(float(x["correctedSqError"]) for x in items)/n),
                "winnerCheck":"Not identifiable from absolute-error-only archive"}
    pool=pooled_stat(pooled)
    pool["correctedMAE"]=pool.pop("adjMAE")
    pool["byOffice"]={office:pooled_stat([x for x in pooled if x["office"]==office]) for office in ("Senate","President")}
    source_summary={}
    for p in ("rcp","ddhq","win270"):
        r=[x for x in source if x["Publisher"]==p]
        source_summary[p]={"n":len(r),
          "rawMAE":sum(abs(float(x["2024 final polling D minus R"])-float(x["2024 result D minus R"])) for x in r)/len(r),
          "adjustedMAE":sum(abs(float(x["Adjusted forecast D minus R"])-float(x["2024 result D minus R"])) for x in r)/len(r)}
    county_rows=[]
    by_state={}
    for state,entry in county["states"].items():
        for x in entry["units"]:
            if any(not isinstance(x.get(k), (float,int)) for k in ("m16","m20","m24")):continue
            e={"baseline":abs(x["m24"]-x["m20"]), "trend":abs(x["m24"]-(2*x["m20"]-x["m16"]))}
            county_rows.append(e)
            by_state.setdefault(state,[]).append(e)
    def county_stat(items):
        n=len(items)
        return {"n":n,"baselineMAE":sum(x["baseline"] for x in items)/n,"trendMAE":sum(x["trend"] for x in items)/n}
    counties=county_stat(county_rows)
    counties["byState"]={k:county_stat(v) for k,v in by_state.items()}
    governor=json.loads((ROOT/"research/governor-same-office-backtest-2026-11-02.json").read_text(encoding="utf-8"))
    g_summary=governor["summary"]
    g_rcp=governor["preferredRCP"]
    governor_office={"historicalArchive":g_summary["observed"],"n":g_summary["n"],
        "rawMAE":g_summary["rawMAE"],"adjustedMAE":g_summary["adjustedMAE"],
        "rawRMSE":g_summary["rawRMSE"],"adjustedRMSE":g_summary["adjustedRMSE"],
        "rawWinners":g_summary["rawWinners"],"adjustedWinners":g_summary["adjustedWinners"],
        "RCPOnly":{"n":g_rcp["n"],"rawMAE":g_rcp["rawMAE"],"adjustedMAE":g_rcp["adjustedMAE"]},
        "method":"Governor only: earlier same-state 2018–24 governor poll errors, one event per election year; no Senate/presidential inputs. 57 historical records do not equal 57 scored holdout tests."}
    return {"generated":"2026-11-02","senate":base,"pooled":pool,"governorSameOffice":governor_office,"publishers":source_summary,
      "counties":counties,"provenance":[{"path":p} for p in (
      "research/senate_2018_2024_walk_forward.csv",
      "research/calibration_walkforward_2016_2024.csv","blend_backtest_2024.csv",
      "counties-watch/history.json", "research/governor-same-office-backtest-2026-11-02.json")],
      "limitations":{
      "senateRaw":"61 retrospective equal-pollster raw polling reconstructions; not the displayed Ervin's Take publisher-average blend",
      "pooled":"63 Senate/President records. No winner correctness established because stored calibration is absolute-error-only",
      "county":"160 selected watch counties. Predicted 2024 using pre-2024 margins, but 2024-dependent sample selection causes bias.",
      "governors":"57 distinct same-office 2018–2024 governor historical comparisons cover 36 states, but only 20 historical elections across 17 states can be scored past-only. Full-sample 20-event MAE improves; strictly RCP-target subset worsens. 2026 outcome is not yet backtestable.",
      "house":"435 House ratings remain explicitly separate from federal/governor historical error pools, using Cook and existing attributed sources; changed boundaries and incomparable polling prevent interpreting statewide corrections as district probabilities."
      }}

def equal_stat(a,b,path="root"):
    if isinstance(a,dict):
        assert isinstance(b,dict),f"{path} type changed"
        for k,v in a.items():
            # Older published scorecards can omit subsequently added audit metadata.
            # Compare every common metric without fabricating absent fields.
            if k in b:
                equal_stat(v,b[k],f"{path}.{k}")
    elif isinstance(a,(float,int)) and not isinstance(a,bool):
        assert isinstance(b,(float,int)) and math.isclose(a,b,abs_tol=0.001,rel_tol=0.0001), f"{path}: calculated {a} stored {b}"
    else:
        assert a==b, f"{path}: calculated {a} stored {b}"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--write",action="store_true")
    args=parser.parse_args()
    current=compute()
    if args.write:
        OUT.write_text(json.dumps(current,indent=2)+"\n",encoding="utf-8")
    if args.check:
        stored=json.loads(OUT.read_text())
        equal_stat({k:v for k,v in current.items() if k not in ("provenance","limitations")},stored)
        assert stored["senate"]["n"]==61
        assert stored["pooled"]["n"]==63
        assert stored["counties"]["n"]==160
        assert stored["governorSameOffice"]["n"]==20
        assert stored["governorSameOffice"]["historicalArchive"]==57
        assert set(stored.keys())>=set(current.keys()),"Published scorecard missing latest office-specific sections"
    print(f"PASS: Senate {current['senate']['n']}, pooled {current['pooled']['n']}, county {current['counties']['n']} historical records (source scorecard only; not universal forecast validation)")
if __name__=="__main__":main()
