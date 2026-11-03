#!/usr/bin/env python3
"""House-only chronological 2018/2022 training and independent 2024 check.

Historical inputs: MEDSL House candidate returns (public domain), reconstructed
presidential margins by appropriate district maps, and RCP's pre-election final
generic ballot polling average. Never transfers Senate or Governor polling error
to House. Does not use any 2026 actual vote totals.
"""
import collections, datetime as dt, json, math, re, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE="https://api.electiondata.dev/v1/house-results/table/"
HIST=ROOT/"research/house-presidential-historical.json"
PRES=ROOT/"house/presidential-2026-boundaries.json"
ROSTER=ROOT/"house/candidates-2026.json"
OUT_HISTORY=ROOT/"research/house-actual-2016-2024.json"
OUT_POLICY=ROOT/"research/house-presidential-backtest-2026.json"
PRES_NATIONAL={2012:3.93,2016:2.23,2020:4.54,2024:-1.51}
GENERIC={2016:0.6,2018:7.3,2022:-2.5,2024:-0.3}
SAME_MAP_2024_EXCLUSIONS=set("AL CA FL GA LA NC NY OH TN TX UT".split())
PREV_PRES={2018:(2016,2012),2022:(2020,2016),2024:(2020,2016)}
HEADERS={"User-Agent":"Ervin-House-Research/1.0","Accept":"application/json"}
def full_id(state,district):
    s=str(district).strip().upper()
    if s in ("AL","AT LARGE","AT-LARGE","00","0"):s="01"
    return str(state).upper()+"-"+str(int(s)).zfill(2)
def party(raw):
    s=str(raw or "").upper()
    if s in ("DEMOCRATIC","DEMOCRAT","DFL","DEMOCRATIC-FARMER-LABOR") or s.startswith("DEMOCRATIC "):return "D"
    if s in ("REPUBLICAN","GOP") or s.startswith("REPUBLICAN "):return "R"
    return None
def name(raw):
    return re.sub(r"[^a-z]+","",str(raw or "").lower())
def get(year):
    url=SOURCE+f"{year}.json"
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=90) as response:
        if response.status!=200:raise RuntimeError(f"Historical source {year}: HTTP {response.status}")
        raw=response.read(40_000_001)
    if not raw or len(raw)>40_000_000:raise RuntimeError(f"Invalid historical input {year}: {len(raw)} bytes")
    payload=json.loads(raw)
    rows=payload.get("rows",[]) if isinstance(payload,dict) else payload
    if len(rows)<600:raise RuntimeError(f"Unusable {year} archive: {len(rows)} rows")
    agg=collections.defaultdict(lambda:{"D":0,"R":0,"candidates":{}})
    for r in rows:
        if int(r.get("year",year))!=year or str(r.get("stage","GEN")).upper()!="GEN":continue
        if str(r.get("special",False)).lower() in ("true","1"):continue
        if not r.get("state_po") or r.get("district") is None:continue
        p=party(r.get("party"))
        if not p:continue
        try:
            seat=full_id(r["state_po"],r["district"])
            votes=int(float(r.get("candidatevotes") or 0))
        except (ValueError,TypeError):continue
        if votes<=0:continue
        agg[seat][p]+=votes
        candidate=name(r.get("candidate"))
        if candidate:agg[seat]["candidates"][candidate+"_"+p]=agg[seat]["candidates"].get(candidate+"_"+p,0)+votes
    out={}
    for seat,r in agg.items():
        d,rep=r["D"],r["R"]
        if d+rep<1000:continue
        names={}
        for p in ("D","R"):
            possible=[(v,k[:-2]) for k,v in r["candidates"].items() if k.endswith("_"+p)]
            names[p]=max(possible)[1] if possible else None
        out[seat]={"dem":d,"rep":rep,"marginD":round(100*(d-rep)/(d+rep),3),
          "contested":min(d,rep)/(d+rep)>=0.035,
          "candidates":names,"winnerParty":"D" if d>rep else "R" if rep>d else None}
    if len(out)<390:raise RuntimeError(f"Too few 2016–2024 House rows in {year}: {len(out)}")
    print("MIT HOUSE ACTUAL ARCHIVE",year,len(out),"contested",sum(x["contested"] for x in out.values()),flush=True)
    return out
def lean(s,cycle):
    if cycle in (2018,2022):
        old,earlier=PREV_PRES[cycle]
        d=s.get(f"pres{str(old)[-2:]}MarginD")
        b=s.get(f"pres{str(earlier)[-2:]}MarginD")
        # Two-party national results subtracted in *each* historical election.
        if not isinstance(d,(float,int)) or not isinstance(b,(float,int)):return None
        return 0.75*(d-PRES_NATIONAL[old])+0.25*(b-PRES_NATIONAL[earlier])
    return None
def samples(actual,historical):
    train,valid=[],[]
    for cycle in (2018,2022):
        for seat,x in actual[cycle].items():
            if not x["contested"]:continue
            h=historical["cycles"][str(cycle)].get(seat)
            if not h:continue
            z=lean(h,cycle)
            if z is not None:train.append({"year":cycle,"seat":seat,"lean":z,"target":x["marginD"]})
    # 2024 holdout uses 2022-line presidential baselines only where district
    # boundaries were unchanged between 2022 and 2024. 2024 House returns are
    # never used in parameter training.
    for seat,x in actual[2024].items():
        if not x["contested"] or seat[:2] in SAME_MAP_2024_EXCLUSIONS:continue
        h=historical["cycles"]["2022"].get(seat)
        z=lean(h,2022) if h else None
        if z is not None:valid.append({"year":2024,"seat":seat,"lean":z,"target":x["marginD"]})
    if len(train)<600 or len(valid)<180:raise RuntimeError(f"Undersized House historical cohorts: train={len(train)} holdout={len(valid)}")
    return train,valid
def score(rows,alpha):
    errors=[];right=0
    for r in rows:
        m=GENERIC[r["year"]]+alpha*r["lean"]
        errors.append(abs(m-r["target"]))
        right+=int((m>0)==(r["target"]>0))
    errors.sort()
    return {"n":len(errors),"MAE":round(sum(errors)/len(errors),3),
      "medianAE":round(errors[len(errors)//2],3),"p90AE":round(errors[int((len(errors)-1)*.90)],3),
      "winnerAgreement":round(right/len(errors),4)}
def main():
    hist=json.loads(HIST.read_text())
    pres=json.loads(PRES.read_text())
    assert len(pres["races"])==435
    actual={yr:get(yr) for yr in (2016,2018,2020,2022,2024)}
    train,valid=samples(actual,hist)
    # Development folds use 2018 and 2022 only; 2024 is untouched when
    # selecting alpha. Penalize extreme slopes by using all contested races.
    choices=[round(.60+k*.025,3) for k in range(33)]
    selection=sorted(((score(train,a)["MAE"],abs(a-1),a) for a in choices))
    alpha=selection[0][2]
    result={"schema":1,"createdAt":dt.datetime.now(dt.timezone.utc).isoformat(),
     "type":"House-only pre-election polling environment and same-line presidential district history",
     "source":{"houseResults":"MIT Election Data and Science Lab public-domain election returns via electiondata.dev",
       "houseResultsBase":SOURCE,
       "presidentialHist":hist["sourceUrl"],"presidential2026":pres["sourceUrl"],
       "genericBallotRCP":{str(y):{"marginD":x["marginD"],"url":x["source"]} for y,x in hist["nationalGenericElectionDayPollAverage"].items()}},
     "training":{"years":[2018,2022],"selectionMethod":"Minimize unweighted absolute district margin error for contested 2018 and 2022 races, using only historical presidential votes and FINAL PRE-ELECTION RCP generic ballot averages, no 2024 election results and no statewide Senate errors.","n":len(train)},
     "finalHoldout":{"year":2024,"n":len(valid),"excludedMapChanges":sorted(SAME_MAP_2024_EXCLUSIONS)},
     "formulation":"D-R House margin = final pre-election generic House poll margin + alpha × [0.75 × (prior presidential two-party district margin − same-year national margin) + 0.25 × (preceding presidential district margin − same-year national margin)].",
     "alpha":alpha,"rawAlphaOne":{"training":score(train,1),"holdout2024":score(valid,1)},
     "backtested":{"training":score(train,alpha),"holdout2024":score(valid,alpha)},
     "byYear":{str(y):{"raw":score([x for x in train if x["year"]==y],1),"adjusted":score([x for x in train if x["year"]==y],alpha)} for y in (2018,2022)},
     "candidateRetention":"A candidate-level incumbency bonus is NOT included unless a separate same-candidate cross-election backtest validates it. Qualitative incumbent/candidate and polling data are displayed separately.",
     "warnings":["Some historical district presidential splits are estimated from precincts and block allocations.",
       "Contest qualification requires both major-party candidates to have at least 3.5% of the two-party vote; excludes uncontested or same-party elections.",
       "2024 is a chronological held-out validation of a policy trained on 2018 and 2022, not a new training cycle.",
       "A generic-ballot poll average is a national survey signal; election-day errors and candidate effects remain unmodeled.",
       "2018 and 2022 House maps differ from one another; each historical district is matched only with its own election-year presidential reference lines.",
       "2026 redrawn maps use reconstructed presidential baseline values with extra uncertainty; existing old-number House returns are not used as if they were the new electorate.",
       "The 2026 roster of incumbents is known but candidate strength should not be added without a trustworthy matched sample."]}
    OUT_HISTORY.write_text(json.dumps({"schema":1,"source":SOURCE,"years":actual},separators=(",",":"))+"\n")
    OUT_POLICY.write_text(json.dumps(result,indent=2)+"\n")
    print("HOUSE PRE-ELECTION OFFICE BACKTEST",json.dumps({"alpha":alpha,"training":result["backtested"]["training"],"holdout":result["backtested"]["holdout2024"],"raw":result["rawAlphaOne"]["holdout2024"]}),flush=True)
if __name__=="__main__":main()
