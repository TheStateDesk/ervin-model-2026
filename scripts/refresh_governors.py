#!/usr/bin/env python3
"""Strict 2026 gubernatorial polling refresh. Same named candidate pair only.

Source: public On Point Politics state governor pages. A failed, stale or
ambiguous source never changes a saved margin. Does not change historic errors.
"""
import datetime as dt
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/"governors"/"data.json"
LOG=ROOT/"polling"/"governor_refresh_log.json"
NAME=re.compile(r"[^a-z]")
SHORT_MONTHS={"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}

def surname(name):
    return NAME.sub("",str(name).split()[-1].lower())

def verified_page(html,row):
    text=BeautifulSoup(html,"html.parser").get_text(" ",strip=True)
    dem=surname(row["dem"])
    rep=surname(row["rep"])
    if not dem or not rep or dem==rep:return None
    # Explicit state + same pair + same office must co-occur near current page headline.
    m=re.search(r"\b"+re.escape(row["state"])+r"\s+governor\s+average\b",text,re.I)
    if not m:return None
    segment=text[m.start():m.start()+1400]
    pair=re.search(r"\b([A-Z][A-Za-z '-]+)\s+vs\.\s+([A-Z][A-Za-z '-]+)\.",segment)
    if not pair or {surname(pair[1]),surname(pair[2])}!={dem,rep}:return None
    lead=re.search(r"\b([A-Z][A-Za-z '-]+?)\s+leads\s+by\s+(\d+(?:\.\d+)?)\s+points\b",segment)
    if not lead:return None
    leader=surname(lead[1])
    if leader not in (dem,rep):return None
    value=float(lead[2])*(1 if leader==dem else -1)
    if abs(value)>45:return None
    stamp=re.search(r"Updated\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(2026)\b",segment)
    if not stamp:return None
    when=dt.date(2026,SHORT_MONTHS[stamp[1]],int(stamp[2]))
    if when>dt.datetime.now(dt.timezone.utc).date():return None
    count=re.search(r"\b(\d{1,3})\s+polls?\b",segment)
    if not count or not 1<=int(count[1])<=400:return None
    return {"margin":round(value,2),"asOf":when.isoformat(),"count":int(count[1])}

def request(row):
    url=row.get("poll",{}).get("url") if isinstance(row.get("poll"),dict) else None
    if not url or not re.fullmatch(r"https://(?:www\.)?onpointpolitics\.us/polls/[a-z]{2}/governor",url):
        return row["code"],None,"unsupported_publisher"
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ErvinModel/1.0)"})
    try:
        with urllib.request.urlopen(req,timeout=22) as response:
            if response.status!=200:return row["code"],None,"http_"+str(response.status)
            data=response.read(1_500_001)
            if len(data)>1_500_000:return row["code"],None,"oversized"
        return row["code"],verified_page(data.decode("utf-8"),row),"ok"
    except Exception as e:return row["code"],None,type(e).__name__

def main():
    original=json.loads(FILE.read_text())
    rows=original["races"]
    changed=[]
    problems=[]
    with ThreadPoolExecutor(max_workers=5) as pool:
        result={code:(item,status) for code,item,status in pool.map(request,rows)}
    for row in rows:
        latest,status=result[row["code"]]
        if not latest:
            if row.get("poll") and status!="unsupported_publisher":problems.append({"state":row["code"],"reason":"unverifiable_or_unavailable"})
            continue
        old=row.get("poll") or {}
        if latest["asOf"]<old.get("asOf","") or latest["count"]<2:continue
        if abs(latest["margin"]-float(old["margin"]))>15:
            problems.append({"state":row["code"],"reason":"large_change_review"})
            continue
        if latest["margin"]!=old["margin"] or latest["asOf"]!=old.get("asOf"):
            row["poll"].update(latest)
            changed.append({"state":row["code"],"marginD":latest["margin"],"publisherDate":latest["asOf"],"pollCount":latest["count"]})
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    if changed:
        original["lastVerifiedPublisherRefresh"]=now
        FILE.write_text(json.dumps(original,ensure_ascii=False,indent=2)+"\n")
    LOG.write_text(json.dumps({"checkedAt":now,"publisher":"On Point Politics","statesChecked":len(rows),"changed":changed,"exceptions":problems,
        "method":"Candidate-pair verified, governor-only public publisher average. No unverified results or polls used."},indent=2)+"\n")
    print("Governor averages verified",len(rows),"updated",len(changed),"exceptions",len(problems))

if __name__=="__main__":
    main()
