#!/usr/bin/env python3
"""Conservative 2026 Senate poll-aggregate checker.

Only updates a tracked race when a Wikipedia general-election aggregate row
explicitly identifies the same two candidates and the publisher source.
Never invents polls, substitutes primary polling, or changes candidate lists.
"""
from __future__ import annotations
import csv
import datetime as dt
import json
import re
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
from recent_poll_parser import parse_recent_polls

ROOT=Path(__file__).resolve().parent.parent
MODEL=ROOT/"research/senate-workbench-data.json"
AUDIT=ROOT/"refresh_log.json"
RECENT=ROOT/"recent_polls.json"
CURATED=ROOT/"research/curated_individual_polls_2026.json"
DIRECT_270=ROOT/"research/verified-270towin-senate-2026-11-03.json"
CSV=ROOT/"source_snapshot.csv"
SOURCES={
    "rcp": ("realclearpolling","realclearpolitics"),
    "ddhq": ("decision desk hq",),
    "win270": ("270towin",),
    "silver": ("silver bulletin",),
    "average": ("average",),
}
CANDIDATES_SAFE=re.compile(r"[^a-z0-9]+")
def norm(s):
    return CANDIDATES_SAFE.sub(" ",s.lower()).strip()
def page_html(state):
    title="2026_United_States_Senate_election_in_"+state.replace(" ","_")
    if state=="Alaska": title="2026_United_States_Senate_election_in_Alaska"
    url="https://en.wikipedia.org/wiki/"+title
    req=urllib.request.Request(url,headers={"User-Agent":"ErvinModelResearch/1.0 (poll-data public source audit; GitHub geervin/ervin-model-2026)","Accept":"text/html"})
    with urllib.request.urlopen(req,timeout=25) as response:
        return response.read(4500000).decode("utf-8","replace"),url

def identify_source(row):
    n=norm(row)
    if n=="average": return "average"
    for key,names in SOURCES.items():
        if key=="average":continue
        if any(n.startswith(alias) for alias in names):
            return key
    return None

def clean_value(raw):
    raw=raw.replace("−","-").replace("–","-")
    raw=re.sub(r"\[[^\]]{1,18}\]","",raw)
    return re.sub(r"\s+"," ",raw).strip()

def parse_state(html,race):
    soup=BeautifulSoup(html,"html.parser")
    dem=race["dem"].split()[-1].lower()
    rep=race["rep"].split()[-1].lower()
    # Keep the 2026 candidate pair: specific name matching prevents mixing
    # primaries, hypotheticals, and unrelated general election candidates.
    updates={}
    for table in soup.find_all("table"):
        if "wikitable" not in " ".join(table.get("class",[])): continue
        headers=[clean_value(x.get_text(" ",strip=True)).lower() for x in table.select("tr")[:2]]
        top=" ".join(headers)
        if "source of poll" not in top and "source of polling" not in top and "poll source" not in top:
            continue
        if "aggregation" not in top and "aggregate" not in top:
            continue
        if dem not in top or rep not in top: continue
        # Candidate-column names are also checked against the header.
        rows=table.find_all("tr")
        header_cells=[clean_value(x.get_text(" ",strip=True)) for x in rows[0].find_all(["th","td"],recursive=False)]
        hnorm=[norm(x) for x in header_cells]
        di=next((i for i,s in enumerate(hnorm) if dem in s.split()),None)
        ri=next((i for i,s in enumerate(hnorm) if rep in s.split()),None)
        if di is None or ri is None or di==ri:continue
        # Avoid accepting a primary table by checking both nominees.
        for row in rows[1:]:
            cells=[clean_value(x.get_text(" ",strip=True)) for x in row.find_all(["th","td"],recursive=False)]
            if len(cells)!=len(header_cells):continue
            key=identify_source(cells[0])
            if not key or key in updates:continue
            try:
                dm=float(re.search(r"\d+(?:\.\d+)?",cells[di]).group())
                rp=float(re.search(r"\d+(?:\.\d+)?",cells[ri]).group())
            except (ValueError,AttributeError):continue
            if not 10<=dm<=90 or not 10<=rp<=90 or dm+rp>102:continue
            margin=round(dm-rp,2)
            date=" ".join(cells[1:min(di,ri)])
            # Only accept tables that report current-year aggregates.
            if "2026" not in date:continue
            # Extract latest publication date when displayed.
            dates=re.findall(r"(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2026",date,re.I)
            if not dates:continue
            last=dates[-1]
            try:
                stamp=dt.datetime.strptime(last.replace(",",""),"%B %d %Y").date()
            except ValueError:continue
            if stamp>dt.datetime.now(dt.timezone.utc).date():continue
            updates[key]={"value":margin,"date":stamp.strftime("%b %d"),"origin":{"rcp":"RealClearPolling","ddhq":"Decision Desk HQ","win270":"270toWin","silver":"Silver Bulletin","average":"Wikipedia aggregator average"}[key],"proxy":False}
        if updates:break
    return updates

def attributed_source_type(item):
    """Explicit provenance tiers: a poll listing is NOT an original release."""
    url=str(item.get("url") or "").lower()
    if "callthemap.com" in url or "mtpolling.com" in url or "publicmandatemag.com" in url:
        return "Independent third-party poll listing (not original release)"
    if "realclearpolling.com" in url or "realclearpolitics.com" in url:
        return "RealClearPolling individual-poll listing (not original release)"
    if "wikipedia.org" in url:
        return "Wikipedia candidate-matched survey table (not original release)"
    return "Pollster release or directly linked news reporting"

def pollster_fingerprint(name):
    """Strip common sponsor annotations; do not merge differently named pollsters."""
    text=re.sub(r"\s*\((?:D|R|I)(?:[- ]sponsored)?\)\s*","",str(name),flags=re.I)
    return re.sub(r"[^a-z0-9]+","",text.lower())

def survey_fingerprint(item):
    """A survey must match pollster, field-end AND both candidate shares to dedupe."""
    try:
        d=round(float(item["dem"]),1);r=round(float(item["rep"]),1)
    except (TypeError,ValueError,KeyError):
        return None
    end=str(item.get("fieldEnd") or item.get("publishedAt") or "")
    return (pollster_fingerprint(item.get("pollster","")),end,d,r)

def dedupe_survey_evidence(items):
    """Retain original primary release when a Wikipedia row repeats that survey."""
    priority=lambda item:(4 if item.get("url","").startswith("https://en.wikipedia.org/") else
        3 if "realclearpolling.com" in item.get("url","") else
        1 if "callthemap.com" in item.get("url","") else 0)
    combined={}
    for item in items:
        key=survey_fingerprint(item)
        if not key or not key[0]:continue
        if key not in combined or priority(item)<priority(combined[key]):
            combined[key]=item
    return list(combined.values())

def merge_survey_evidence(curated, verified):
    """Keep source-linked publication snapshots and newly parsed fieldwork separate.

    The poll archive is presentation-only, never a new numerical model input.
    Deduplicate near-identical releases without assuming two publishers are
    distinct polls based only on their names.
    """
    valid=[]
    for item in list(curated)+list(verified):
        if not isinstance(item,dict):continue
        pollster=str(item.get("pollster","")).strip()
        try:
            d=float(item["dem"]);r=float(item["rep"])
        except (KeyError,ValueError,TypeError):continue
        if not pollster or d<0 or r<0 or d+r>102:continue
        valid.append({**item,"sourceKind":attributed_source_type(item)})
    unique=dedupe_survey_evidence(valid)
    # Preserve up to 12 per state, most recently fielded or released first.
    return sorted(unique,
                  key=lambda p:str(p.get("fieldEnd") or p.get("publishedAt") or ""),
                  reverse=True)[:12]

def apply_direct_270_snapshot(data, report, today):
    """Use a dated, human-verified direct publisher snapshot for the final sweep.

    Only the named 2026 general-election pairing is eligible. A three-way poll
    does not become a two-way average; Alaska uses its explicit head-to-head
    table. The latest underlying poll date is a recency proxy, NOT an invented
    publisher update time. This is a publisher average, never an additional poll.
    """
    if not DIRECT_270.exists() or today != dt.date(2026, 11, 3):
        return
    snapshot=json.loads(DIRECT_270.read_text(encoding="utf-8"))
    if snapshot.get("schema")!=1 or snapshot.get("auditedOn")!="2026-11-03":
        raise ValueError("Unsupported verified 270toWin pre-election audit")
    rows=snapshot.get("states") or {}
    if len(rows)!=15 or "MT" in rows or "MS" in rows:
        raise ValueError("Direct 270toWin audit must explicitly exclude incomparable MT/MS")
    report["directPublisherAudits"]=[]
    for race in data["states"]:
        code=race["code"]
        if code not in rows:
            continue
        row=rows[code]
        if row["nonR"]!=race["dem"] or row["rep"]!=race["rep"]:
            raise ValueError("Direct 270toWin candidate pair changed for "+code)
        expected="https://www.270towin.com/2026-senate-polls/"+race["state"].lower().replace(" ","-")
        if row["sourceUrl"]!=expected:
            raise ValueError("Direct 270toWin publisher URL mismatch for "+code)
        try:
            day=dt.date.fromisoformat(row["latestConstituentPollEnd"])
            non_r=float(row["averageNonRShare"])
            republican=float(row["averageRepublicanShare"])
            lead=round(float(row["pollMarginNonRMinusR"]),1)
        except (ValueError,KeyError,TypeError) as e:
            raise ValueError("Invalid direct publisher row for "+code) from e
        if day<dt.date(2026,9,1) or day>today or not (10<=non_r<=90 and 10<=republican<=90 and non_r+republican<=102):
            raise ValueError("Outdated or invalid 270toWin source for "+code)
        if abs(round(non_r-republican,1)-lead)>0.01:
            raise ValueError("Publisher candidate shares differ from reported margin for "+code)
        old=race["sources"]["win270"]
        try:
            old_day=dt.datetime.strptime(str(old.get("date","")).strip()+" 2026","%b %d %Y").date()
        except ValueError:
            old_day=dt.date(2026,1,1)
        if day<old_day:
            report["directPublisherAudits"].append({"state":code,"result":"archived newer source retained"})
            continue
        report["directPublisherAudits"].append({"state":code,"result":"direct 270toWin candidate match","margin":lead,"latestUnderlyingPoll":str(day)})
        if round(float(old.get("value",9999)),1)==lead and old_day==day and old.get("origin")=="270toWin" and old.get("url")==expected and not old.get("proxy"):
            continue
        old.update({"value":lead,"date":day.strftime("%b %d"),"origin":"270toWin",
                    "url":expected,"proxy":False,
                    "note":"Direct 270toWin named general-election publisher average; latest constituent-poll date shown, NOT treated as a separate survey."})
        report["changes"]+=1
        report["updated"].append({"state":code,"source":"win270","margin":lead,"published":str(day),"evidence":"Direct named publisher average"})

def main():
    data=json.loads(MODEL.read_text(encoding="utf-8"))
    checked=dt.datetime.now(dt.timezone.utc)
    report={"checkedAt":checked.isoformat(),"pagesParsed":0,"checkedRaceCount":len(data["states"]),"changes":0,"observationsFound":0,"errors":[],"updated":[],"sourceCoverage":[],"stalePublisherRaces":[],"sources":"Wikipedia 2026 general-election aggregate tables; matching candidate pair required"}
    previous_polls={}
    if RECENT.exists():
        try:previous_polls=json.loads(RECENT.read_text(encoding="utf-8")).get("polls",{})
        except (ValueError,OSError):pass
    recent_polls={}
    try:
        curated_polls=json.loads(CURATED.read_text(encoding="utf-8")).get("polls",{})
    except (OSError,ValueError):curated_polls={}
    for race in data["states"]:
        try:
            html,url=page_html(race["state"])
            rows=parse_state(html,race)
            verified=parse_recent_polls(html,race,checked.date())
            for item in verified:
                item["url"]=url
                item["sourceKind"]="Wikipedia general-election survey table (candidate-matched)"
            recent_polls[race["code"]]=merge_survey_evidence(curated_polls.get(race["code"],[]),verified)
            if rows: report["pagesParsed"]+=1
            report["sourceCoverage"].append({"state":race["code"],"verifiedPublisherRows":len(rows),"result":"matched" if rows else "no matching current-year aggregate"})
            report["observationsFound"]+=len(rows)
            for key,entry in rows.items():
                old=race["sources"][key]
                old_date=old.get("date","")
                # Do not rewrite newer source dates with older aggregator snapshots.
                def date_key(value):
                    try:return dt.datetime.strptime(value.strip()+" 2026","%b %d %Y").date()
                    except ValueError:return dt.date(2026,1,1)
                if date_key(entry["date"])<date_key(old_date):continue
                if abs(entry["value"]-float(old["value"]))>30:
                    report["errors"].append(race["code"]+"/"+key+": suspicious >30-point swing")
                    continue
                if old.get("value")!=entry["value"] or old.get("date")!=entry["date"] or old.get("proxy"):
                    old.update(entry)
                    old["url"]=url
                    old["note"]="Verified from Wikipedia general-election aggregator table; individual underlying polls may overlap."
                    report["changes"]+=1
                    report["updated"].append({"state":race["code"],"source":key,"margin":entry["value"],"published":entry["date"]})
        except Exception as exc:
            recent_polls[race["code"]]=merge_survey_evidence(curated_polls.get(race["code"],[]),previous_polls.get(race["code"],[]))
            report["errors"].append(race["code"]+": "+str(exc)[:180])
            report["sourceCoverage"].append({"state":race["code"],"verifiedPublisherRows":0,"result":"source check failed"})
    apply_direct_270_snapshot(data,report,checked.date())
    # The source-check time and actual published-aggregate dates are different.
    # Expose stale rows and missing sources without silently assigning current dates.
    for race in data["states"]:
        eligible=[]
        for key,entry in race["sources"].items():
            if key not in ("rcp","ddhq","win270","silver") or entry.get("proxy"):continue
            try: stamp=dt.datetime.strptime(str(entry.get("date","")).strip()+" 2026","%b %d %Y").date()
            except ValueError:continue
            eligible.append(stamp)
        if eligible:
            days=(checked.date()-max(eligible)).days
            if days>7:report["stalePublisherRaces"].append({"state":race["code"],"daysOld":days,"latestDate":max(eligible).isoformat()})
        else:report["stalePublisherRaces"].append({"state":race["code"],"daysOld":None,"latestDate":None,"reason":"No independently attributed publisher averages"})
    # Count successful checks, never report zero parsed as successful freshness.
    data["liveMeta"]=report
    if report["changes"]:
        data["asof"]=checked.strftime("%B %d, %Y")
    replacement=json.dumps(data,ensure_ascii=False,indent=2)+"\n"
    if not MODEL.exists() or MODEL.read_text(encoding="utf-8")!=replacement:
        MODEL.write_text(replacement,encoding="utf-8")
    with CSV.open("w",newline="",encoding="utf-8") as out:
        writer=csv.writer(out)
        writer.writerow(["As of","State","Code","2026 non-R candidate","2026 Republican candidate","Source tab","Poll lead (non-R minus R)","Publisher or proxy","Field date","Proxy","Notes","Source link"])
        for r in data["states"]:
            for key,v in r["sources"].items():
                writer.writerow([data["asof"],r["state"],r["code"],r["dem"],r["rep"],key,v["value"],v["origin"],v["date"],v["proxy"],v.get("note",""),v["url"]])
    AUDIT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    RECENT.write_text(json.dumps({"checkedAt":checked.isoformat(),
        "source":"Original releases, RCP individual poll listings, and candidate-matched Wikipedia general-election survey tables; source type disclosed per row",
        "polls":recent_polls},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Checked {len(data['states'])} states; parsed {report['pagesParsed']} matching aggregates; changed {report['changes']} inputs; errors {len(report['errors'])}")
if __name__=="__main__":main()
