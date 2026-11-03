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

def main():
    source=json.loads(PATH.read_text())
    assert source["election"]=="2026-11-03"
    try:
        req=urllib.request.Request(SOURCE,headers={"User-Agent":"Mozilla/5.0 (compatible; ErvinModel2026/1.0)", "Accept":"text/html"})
        with urllib.request.urlopen(req,timeout=18) as response:
            if response.status!=200:raise ValueError("HTTP not 200")
            raw=response.read(2_000_001)
            if len(raw)>2_000_000:raise ValueError("Oversized response")
        row=parse_rcp(raw.decode("utf-8","replace"))
        if not row:raise ValueError("Published RCP table row not extractable / not validated")
        if row["fieldEnd"]<"2026-10-20":raise ValueError("Publisher row older than October 20")
    except Exception as exc:
        print("GENERIC BALLOT NOT REFRESHED; preserving dated prior values:",type(exc).__name__,str(exc)[:140])
        return
    today=dt.datetime.now(dt.timezone.utc).date().isoformat()
    records=[x for x in source["inputs"] if x.get("publisher")=="RealClearPolling"]
    assert len(records)==1, "Duplicate publisher input"
    target=records[0]
    target.update({"marginD":row["marginD"],"asOf":today,"fieldEnd":row["fieldEnd"],"url":SOURCE,
                   "status":"Primary publisher table verified; voter shares cross-checked"})
    source["sourceChecked"]=today
    source["asOf"]=today
    source["note"]="Dated publisher inputs, RCP checked "+today+" for field period through "+row["fieldEnd"]+". Remaining publishers retain their individual dates. No projected House vote totals are inferred from these averages."
    serialized=json.dumps(source,indent=2,ensure_ascii=False)+"\n"
    if PATH.read_text()!=serialized:PATH.write_text(serialized)
    print("GENERIC BALLOT SOURCE VERIFIED",json.dumps({"publisher":"RealClearPolling","asOf":today,"marginD":row["marginD"],"fieldEnd":row["fieldEnd"],"dem":row["dem"],"rep":row["rep"]}))
if __name__=="__main__":main()
