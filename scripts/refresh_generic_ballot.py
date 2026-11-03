#!/usr/bin/env python3
"""Fail-closed source refresh for the 2026 House generic-ballot input.

Download the publicly displayed RCP Average, validate the two-party shares and
spread and update the dated evidence file. If a publisher is unavailable, do
NOT invent a new value or claim a fresh check. Other publishers retain their
independently audited date, with secondary citations marked as such.
"""
from __future__ import annotations
import datetime as dt
import json
import re
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"polling/generic-ballot-2026.json"
SOURCE="https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote"
DDHQ="https://votes.decisiondeskhq.com/polls/generic-ballot/national"
SILVER="https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls"

def parse_rcp(html):
    text=" ".join(BeautifulSoup(html,"html.parser").stripped_strings)
    text=re.sub(r"\s+"," ",text)
    # Prefer the official table's row, not single-survey entries or an
    # unrelated margin in article copy. The extra date identifies the row.
    regex=r"\bRCP Average\s+(\d{1,2}/\d{1,2})\s*-\s*(\d{1,2}/\d{1,2})\s+(\d{1,2}(?:\.\d+)?)\s+(\d{1,2}(?:\.\d+)?)\s+Democrats\s*\+\s*(\d{1,2}(?:\.\d+)?)\b"
    for m in re.finditer(regex,text,re.I):
        beg,end,dem,rep,margin=m.groups()
        d,r,spread=map(float,(dem,rep,margin))
        if not (35<=d<=65 and 30<=r<=65 and abs((d-r)-spread)<=.25):
            continue
        month,day=map(int,end.split("/"))
        try:
            field_end=dt.date(2026,month,day)
        except ValueError:
            continue
        if field_end>dt.date(2026,11,3):continue
        return {"marginD":round(spread,2),"dem":d,"rep":r,"fieldEnd":field_end.isoformat(),"fieldStart":beg}
    return None

def plain(html):
    return re.sub(r"\s+"," "," ".join(BeautifulSoup(html,"html.parser").stripped_strings))
def parse_ddhq(html):
    text=plain(html)
    m=re.search(r"\bCandidate\s+Democrat\s+(\d{1,2}(?:\.\d+)?)%\s+Candidate\s+Republican\s+(\d{1,2}(?:\.\d+)?)%",text,re.I)
    if not m:return None
    d,r=map(float,m.groups())
    if not (35<=d<=65 and 30<=r<=65 and 0<=d+r<=100):return None
    return {"marginD":round(d-r,2),"dem":d,"rep":r}
def parse_silver(html):
    text=plain(html)
    dated=re.search(r"\bUpdated\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(2026)\b",text,re.I)
    if not dated:return None
    month,day,year=dated.groups()
    published=dt.datetime.strptime(f"{month} {day} {year}","%B %d %Y").date()
    if published>dt.date(2026,11,3) or published<dt.date(2026,10,25):return None
    # Silver supplies an adjusted likely-voter estimate nearby (D+9.2);
    # only the separate *unadjusted* polling average belongs here.
    m=re.search(r"(?:dropped slightly to|moves? their lead from)\s+D\s*\+\s*(\d{1,2}(?:\.\d+)?)",text,re.I)
    if not m:return None
    margin=float(m.group(1))
    if not 0<=margin<=25:return None
    return {"marginD":margin,"published":published.isoformat()}
def read_html(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ErvinModel2026/1.0)", "Accept":"text/html"})
    with urllib.request.urlopen(req,timeout=18) as response:
        if response.status!=200:raise ValueError(f"HTTP {response.status}")
        raw=response.read(2_000_001)
        if not raw or len(raw)>2_000_000:raise ValueError("Empty or oversized publisher response")
    return raw.decode("utf-8","replace")

def main():
    source=json.loads(PATH.read_text())
    assert source["election"]=="2026-11-03"
    today=dt.datetime.now(dt.timezone.utc).date().isoformat()
    by={x["publisher"]:x for x in source["inputs"]}
    assert {"RealClearPolling","Decision Desk HQ","Silver Bulletin"}.issubset(by)
    successes=[]
    for publisher,url,parser in [
        ("RealClearPolling",SOURCE,parse_rcp),
        ("Decision Desk HQ",DDHQ,parse_ddhq),
        ("Silver Bulletin",SILVER,parse_silver)]:
        try:
            observed=parser(read_html(url))
            if not observed:raise ValueError("Published aggregate missing or contract invalid")
            x=by[publisher]
            if publisher=="RealClearPolling":
                if observed["fieldEnd"]<"2026-10-20":raise ValueError("RCP table stale")
                x.update({"marginD":observed["marginD"],"asOf":today,"fieldEnd":observed["fieldEnd"],
                    "url":url,"status":"Primary publisher verified; D/R vote shares reconcile to RCP average","secondary":False})
            elif publisher=="Decision Desk HQ":
                x.update({"marginD":observed["marginD"],"asOf":today,"url":url,
                    "status":"Primary DDHQ publisher aggregate, candidate Democratic and Republican percentages validated",
                    "secondary":False})
            else:
                x.update({"marginD":observed["marginD"],"asOf":observed["published"],"url":url,
                    "status":"Silver Bulletin article unadjusted polling average; excludes separate likely-voter forecast adjustment",
                    "secondary":False})
            successes.append({"publisher":publisher,**observed})
        except Exception as err:
            print("GENERIC BALLOT SOURCE UNAVAILABLE — preserving previously dated value:",
                publisher,type(err).__name__,str(err)[:160],flush=True)
    if successes:
        source["sourceChecked"]=today
        source["asOf"]=max(x["asOf"] for x in source["inputs"])
        source["note"]="Each publisher source has an independent as-of date. Refreshed directly "+today+": "+", ".join(x["publisher"] for x in successes)+". Failed source reads preserve their dated values; no candidate votes or election-night returns are substituted."
        blob=json.dumps(source,indent=2,ensure_ascii=False)+"\n"
        if PATH.read_text()!=blob:PATH.write_text(blob)
    print("GENERIC BALLOT PUBLISHER READINESS",json.dumps({"date":today,"successes":successes,
        "sourceAverages":[{"publisher":x["publisher"],"marginD":x["marginD"],"asOf":x["asOf"]} for x in source["inputs"]]}),flush=True)
if __name__=="__main__":main()
