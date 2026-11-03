#!/usr/bin/env python3
"""Read-only LIVE CivicAPI v2 preflight. Never writes, publishes, or invents votes.

Run in GitHub Actions (outbound Internet available):
  python3 scripts/audit_civicapi_live.py

This is not the election-night collector: it uses at most a dozen direct calls
to actual 2026 and previously concluded race endpoints to inspect response
schemas, missing Vermont House discovery, regional and precinct availability,
timestamps, race identity, HTTP status and CORS.
"""
from __future__ import annotations
import concurrent.futures
import datetime as dt
import importlib.util
import json
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
BASE="https://civicapi.org/api/v2"
DAY="2026-11-03"
REPORT=ROOT/"visual-checks/civicapi-live-preflight.json"
spec=importlib.util.spec_from_file_location("collector",ROOT/"scripts/civicapi_national.py")
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

def fetch(label,path,params=None):
    url=BASE+path
    if params:url+="?"+urllib.parse.urlencode(params)
    begin=time.perf_counter()
    req=urllib.request.Request(url,headers={
        "Accept":"application/json",
        "User-Agent":"ErvinModel2026-ReadOnlyPreflight/1.0 (https://geervin.github.io/ervin-model-2026/)",
    })
    try:
        with urllib.request.urlopen(req,timeout=16) as response:
            length=response.headers.get("content-length")
            raw=response.read(5_000_001)
            status=response.status
            ctype=response.headers.get("Content-Type","")
            cors=response.headers.get("Access-Control-Allow-Origin","")
        if len(raw)>5_000_000:raise ValueError("response_over_5MB")
        return label, {"ok":True,"http":status,"latencyMs":round((time.perf_counter()-begin)*1000),
            "bytes":len(raw),"declaredLength":length,"contentType":ctype,"cors":cors or None,
            "payload":json.loads(raw)}
    except urllib.error.HTTPError as e:
        return label,{"ok":False,"http":e.code,"latencyMs":round((time.perf_counter()-begin)*1000),
            "error":"HTTPError"}
    except Exception as e:
        return label,{"ok":False,"latencyMs":round((time.perf_counter()-begin)*1000),
            "error":type(e).__name__,"detail":str(e)[:160]}

def schema(value):
    if isinstance(value,dict):
        return {"type":"object","size":len(value),"keys":list(value)[:32]}
    if isinstance(value,list):
        first=value[0] if value else None
        return {"type":"array","length":len(value),"itemKeys":list(first)[:24] if isinstance(first,dict) else []}
    return {"type":type(value).__name__}

def summarize_race(key,record,provider):
    p=record["payload"]
    if not isinstance(p,dict):return {"response":schema(p)}
    people=p.get("candidates")
    meta={"keys":list(p)[:60],
        "electionName":str(p.get("election_name") or p.get("name") or "")[:130],
        "electionDate":str(p.get("election_date") or p.get("date") or "")[:40],
        "province":p.get("province"),"district":p.get("district"),
        "electionType":str(p.get("election_type") or "")[:90],
        "electionScope":str(p.get("election_scope") or "")[:65],
        "testData":p.get("test_data"),
        "lastUpdated":p.get("last_updated"),
        "percentReporting":p.get("percent_reporting"),
        "called":p.get("called"),"candidateSchema":schema(people),
        "regionSchema":schema(p.get("region_results")),
        "precinctSchema":schema(p.get("precinct_results")),
        "candidateVotesValid":collector.candidates(p) is not None,
        "providerIdentityOk":collector.race_identity(key,provider.get("search",{}),p) if provider else None}
    if isinstance(people,list):
        meta["candidateSample"]=[{"name":str(c.get("name") or "")[:80],
                 "party":str(c.get("party") or "")[:35],
                 "hasVotes":type(c.get("votes")) is int,
                 "votes":c.get("votes") if type(c.get("votes")) is int else None}
                 for c in people[:5] if isinstance(c,dict)]
    if isinstance(p.get("region_results"),(dict,list)):
        rr=p["region_results"]
        # Expose one region's keys, not hundreds of vote records.
        samples=rr[:1] if isinstance(rr,list) else list(rr.values())[:1]
        meta["regionExampleKeys"]=list(samples[0])[:35] if samples and isinstance(samples[0],dict) else []
        meta["regionsFound"]=len(rr)
        from collections import Counter
        types=Counter(str(x.get("type") or "unknown")[:45] for x in rr.values() if isinstance(x,dict)) if isinstance(rr,dict) else Counter(str(x.get("type") or "unknown")[:45] for x in rr if isinstance(x,dict))
        meta["regionTypeCounts"]=dict(types)
        meta["regionExamples"]=[{"name":str(x.get("name") or "")[:85],
            "type":str(x.get("type") or "")[:45],"candidateSchema":schema(x.get("candidates"))}
            for x in samples[:1] if isinstance(x,dict)]
    if isinstance(p.get("precinct_results"),(dict,list)):
        meta["precinctsFound"]=len(p["precinct_results"])
    return meta

def main():
    registry=json.loads((ROOT/"civicapi/registry.json").read_text())["races"]
    expected=collector.targets()
    missing=sorted(set(expected)-set(registry))
    ids=[str(x.get("raceId","")) for x in registry.values()]
    duplicateIds=len(ids)-len(set(ids))
    invalid=[key for key,p in registry.items() if key not in expected or
              p.get("office")!=expected[key]["office"] or
              not collector.type_ok(key,p.get("search",{}))]
    now=collector.current()
    chosen={
      "MI-SENATE":"MI-SENATE","MI-GOVERNOR":"MI-GOVERNOR",
      "TX-SENATE":"TX-SENATE","TX-GOVERNOR":"TX-GOVERNOR",
      "ME-SENATE":"ME-SENATE","VA-02":"VA-02",
      "CA-30":"CA-30","AK-01":"AK-01",
    }
    calls=[("status","/status",None),
          ("historic_nh_house","/race/96680",None),
          ("historic_nh_precincts","/race/96680",{"precinct":"true"}),
          ("historic_tx_governor","/race/44288",{"light":"true"}),
          ("vt_search_house","/race/search",{"query":"US House","country":"US","province":"VT",
                                            "start_date":DAY,"end_date":DAY,"limit":200}),
          ("vt_search_atlarge","/race/search",{"query":"House At Large","country":"US","province":"VT",
                                              "start_date":DAY,"end_date":DAY,"limit":200}),
          ("vt_general_candidate_122670","/race/122670",{"light":"true"}),
          ("vt_general_candidate_121781","/race/121781",{"light":"true"}),
          ("vt_general_candidate_121260","/race/121260",{"light":"true"}),
          ("michigan_senate_primary_search","/race/search",{"query":"Michigan US Senate Democratic Primary",
                 "country":"US","province":"MI","start_date":"2026-08-04",
                 "end_date":"2026-08-04","limit":200})]
    for name,key in chosen.items():
        record=registry.get(key)
        if record:
            calls.append((name,"/race/"+str(record["raceId"]),{"light":"true"}))
    # Bound outgoing requests, only read; never ask provider for fabricated test data.
    results={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for label,record in pool.map(lambda call:fetch(*call),calls):
            results[label]=record
    for label,record in results.items():
        if not record.get("ok"):continue
        payload=record.pop("payload")
        if label in chosen:
            key=chosen[label]
            record.update(summarize_race(key,{"payload":payload},registry[key]))
            record["raceId"]=registry[key]["raceId"]
        elif label.startswith("vt_general_candidate_"):
            record.update(summarize_race("VT-01",{"payload":payload},None))
        elif label=="michigan_senate_primary_search":
            items=collector.list_items(payload)
            record["searchResultSchema"]=schema(payload)
            record["returned"]=len(items)
            shortlist=[x for x in items if isinstance(x,dict) and "michigan us senate democratic primary" in str(x.get("election_name") or x.get("name") or "").lower()]
            record["matchingPrimaryRows"]=[{"id":x.get("id"),"election_name":x.get("election_name"),
                "date":x.get("election_date"),"province":x.get("province")}
                for x in shortlist[:5]]
        elif label.startswith("historic_"):
            record.update(summarize_race("NH-01" if "nh" in label else "TX-GOVERNOR",
                              {"payload":payload},None))
        elif label.startswith("vt_search"):
            items=collector.list_items(payload)
            record["searchResultSchema"]=schema(payload)
            record["returned"]=len(items)
            record["names"]=[str(x.get("election_name") or x.get("name") or "")[:110]
                                   for x in items[:12] if isinstance(x,dict)]
            record["matchedVt01"]=[{"id":str(x.get("id") or x.get("race_id") or "")[:22],
                                 "name":str(x.get("election_name") or x.get("name") or "")[:110],
                                 "district":str(x.get("district") or "")[:45],
                                 "type":str(x.get("election_type") or "")[:45],
                                 "searchTypeOk":collector.type_ok("VT-01",x),
                                 "electionDate":str(x.get("election_date") or x.get("date") or "")[:35],
                                 "province":str(x.get("province") or "")[:12]}
                                 for x in items if isinstance(x,dict) and
                                    ("house" in str(x.get("election_name") or x.get("name") or "").lower())][:12]
        else: record["statusPayloadSchema"]=schema(payload)
    # Real 2026 Michigan Senate primary is useful for evaluating 83-county
    # locality schemas; do not infer general-election county coverage from it.
    historical=results.get("michigan_senate_primary_search") or {}
    primaries=historical.get("matchingPrimaryRows") or []
    primary=next((x for x in primaries if str(x.get("date") or "").startswith("2026-08-04")
                  and str(x.get("id") or "").isdigit()),None)
    if primary:
        label="michigan_senate_primary_detail"
        _, detail=fetch(label,"/race/"+str(primary["id"]),{"precinct":"true"})
        if detail.get("ok"):
            payload=detail.pop("payload")
            detail.update(summarize_race("MI-SENATE",{"payload":payload},None))
        results[label]=detail
    probe={"checkedAt":collector.iso(now),"provider":BASE,"readOnly":True,
       "publishedVoteFilesChanged":False,
       "registry":{"expected":len(expected),"registered":len(registry),
          "missing":missing,"duplicateRaceIds":duplicateIds,"invalidArchivedIdentifiers":invalid[:20],
          "house":sum(key[-2:].isdigit() for key in registry),
          "senate":sum(key.endswith("-SENATE") for key in registry),
          "governor":sum(key.endswith("-GOVERNOR") for key in registry)},
       "sampled":results,
       "interpretation":{
          "connectivity":"A passing HTTP 200 validates access, not whether an election-night vote feed will be complete.",
          "historical":"Past result endpoint tests establish example response schemas, not 2026 county/precinct availability.",
          "precinct":"Only count documented precinct metadata observed in the live payload; a precinct switch is not proof of all 2026 precincts.",
          "raceMapping":"2026 results cannot be verified until after the relevant polling places close.",
          "polling":"CivicAPI polling integration not connected. Provider race results do not supply verified poll aggregation.",
          "timing":"GitHub Pages collector snapshots lag provider API and GitHub Actions scheduling is not guaranteed."}}
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps(probe,indent=2,ensure_ascii=False)+"\n")
    # Send user-inspectable summaries to GitHub logs, never fake a ready status.
    print("CIVICAPI LIVE READ-ONLY PREFLIGHT",json.dumps({
        "registered":len(registry),"expected":len(expected),"missing":missing,
        "duplicateIds":duplicateIds,"invalidIds":invalid[:10],
        "requests":{k:{"http":v.get("http"),"error":v.get("error"),
                  "raceIdentity":v.get("providerIdentityOk"),
                  "candidateSchema":v.get("candidateSchema"),
                  "regions":v.get("regionsFound"),"precincts":v.get("precinctsFound"),
                  "regionTypes":v.get("regionTypeCounts"),"regionExamples":v.get("regionExamples"),
                  "electionDate":v.get("electionDate"),"primaryMatches":v.get("matchingPrimaryRows"),
                  "regionKeys":v.get("regionExampleKeys"),
                  "vtMatched":v.get("matchedVt01")}
              for k,v in results.items()}},ensure_ascii=False))
    if duplicateIds or invalid:raise SystemExit("Local CivicAPI registry invalid; fix before election-night release.")

if __name__=="__main__":
    main()
