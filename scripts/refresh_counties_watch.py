#!/usr/bin/env python3
"""Import attributed 2026 US Senate county results; fail closed on malformed feeds.

Sources: verified Michigan county-wide normalized exports + CSVs placed into
counties-watch/imports/. The updater does NOT scrape or infer unknown state feeds.
County name and FIPS must match historical watch units, and unpublished/future
returns are rejected. Existing valid rows survive source outages.
"""
import csv
import datetime as dt
import json
import pathlib
from urllib.parse import urlsplit

ROOT=pathlib.Path(__file__).resolve().parents[1]
DIR=ROOT/"counties-watch"
HISTORY=DIR/"history.json"
RESULT=DIR/"results.json"
IMPORTS=DIR/"imports"
MICHIGAN=[ROOT/"michigan/election-night/county_totals.json",
          ROOT/"michigan/election-night/county_auto.json"]
UTC=dt.timezone.utc
DATE="2026-11-03"
OFFICE="US Senate"
CLOSE={
 "ME":"2026-11-04T01:00:00+00:00","MI":"2026-11-04T01:00:00+00:00",
 "OH":"2026-11-04T00:30:00+00:00","TX":"2026-11-04T02:00:00+00:00",
 "IA":"2026-11-04T02:00:00+00:00","KS":"2026-11-04T02:00:00+00:00",
 "MN":"2026-11-04T02:00:00+00:00","AK":"2026-11-04T05:00:00+00:00",
 "GA":"2026-11-04T00:00:00+00:00","NC":"2026-11-04T00:30:00+00:00",
 "NH":"2026-11-04T01:00:00+00:00","NE":"2026-11-04T02:00:00+00:00",
 "SC":"2026-11-04T00:00:00+00:00","MS":"2026-11-04T01:00:00+00:00",
 "FL":"2026-11-04T01:00:00+00:00","SD":"2026-11-04T03:00:00+00:00",
 "MT":"2026-11-04T03:00:00+00:00"
}
def instant(s):
 if not isinstance(s,str):raise ValueError("Timestamp absent")
 t=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
 if t.tzinfo is None:raise ValueError("Timestamp lacks offset")
 return t.astimezone(UTC)
def valid_url(s):
 if not isinstance(s,str):return False
 try:
  u=urlsplit(s)
  return u.scheme=="https" and bool(u.netloc) and not u.username and not u.password
 except ValueError:return False
def votes(v):
 if isinstance(v,bool):raise ValueError("Booleans are not votes")
 try:n=int(v)
 except (TypeError,ValueError):raise ValueError("Non-integer votes")
 if str(v).strip()!=str(n) or not 0<=n<=50000000:raise ValueError("Invalid votes")
 return n
def validate(row,state,lookup,now):
 if state not in lookup:raise ValueError("Unknown state")
 code=str(row.get("fips","")).strip().zfill(5)
 unit=lookup[state].get(code)
 if not unit:raise ValueError("No watched unit with FIPS "+code)
 name=str(row.get("county",unit["name"])).strip()
 if name.casefold()!=unit["name"].casefold():raise ValueError("County and FIPS disagree: "+name)
 d= votes(row["dem"]);r=votes(row["rep"]);o=votes(row["other"])
 if d+r+o<=0:raise ValueError("Zero is not a published return")
 stamp=instant(row["asOf"])
 if stamp<instant(CLOSE[state]) or stamp>now+dt.timedelta(minutes=5):
  raise ValueError("Return predates closing or is future-dated")
 url=str(row.get("sourceUrl","")).strip()
 if not valid_url(url):raise ValueError("Source URL must be public HTTPS")
 status=row.get("reportingStatus","partial")
 if status not in ("partial","complete"):raise ValueError("Unsupported reporting status")
 return {"fips":code,"county":unit["name"],"dem":d,"rep":r,"other":o,
         "asOf":stamp.isoformat(),"sourceUrl":url,"reportingStatus":status}
def merge(history,old,candidates,now):
 lookup={state:{u["fips"]:u for u in s["units"]}for state,s in history["states"].items()}
 final={k:{"counties":[]} for k in lookup}
 rejected=[]
 for state,record in (old.get("states") or {}).items():
  if state not in lookup:continue
  for item in record.get("counties",[]):
   try:
    # Old vetted values may have been published in the past and remain valid.
    row=validate(item,state,lookup,now)
    final[state]["counties"].append(row)
   except (ValueError,KeyError,TypeError) as e:rejected.append("old "+state+": "+str(e))
 indexed={(st,r["fips"]):r for st,info in final.items()for r in info["counties"]}
 for state,item in candidates:
  try: row=validate(item,state,lookup,now)
  except (ValueError,KeyError,TypeError) as e:
   rejected.append(state+": "+str(e));continue
  key=(state,row["fips"])
  prior=indexed.get(key)
  if prior and instant(row["asOf"])<instant(prior["asOf"]):continue
  if prior and instant(row["asOf"])==instant(prior["asOf"]) and row==prior:continue
  indexed[key]=row
 for state in final:
  final[state]["counties"]=sorted([v for (st,_),v in indexed.items()if st==state],key=lambda x:x["county"])
 final={k:v for k,v in final.items()if v["counties"]}
 return final,rejected
def from_michigan(lookup):
 out=[]
 for source in MICHIGAN:
  if not source.exists():continue
  try:payload=json.loads(source.read_text())
  except (OSError,ValueError):continue
  if payload.get("version")!=1 or payload.get("election")!=DATE or payload.get("office")!=OFFICE:continue
  for r in payload.get("counties",[]):
   name=str(r.get("county","")).lower()
   match=next((u for u in lookup["MI"].values() if u["name"].lower()==name),None)
   if not match:continue
   out.append(("MI",{"fips":match["fips"],"county":match["name"],
                     "dem":r.get("dem"),"rep":r.get("rep"),"other":r.get("other"),
                     "asOf":r.get("asOf"),"sourceUrl":r.get("sourceUrl"),
                     "reportingStatus":r.get("reportingStatus")}))
 return out
def from_csv():
 out=[]
 for path in sorted(IMPORTS.glob("*.csv")):
  try:
   with path.open(newline="",encoding="utf-8-sig") as f:
    reader=csv.DictReader(f)
    required={"state","fips","county","dem","rep","other","asOf","sourceUrl","reportingStatus"}
    if not required.issubset(set(reader.fieldnames or [])):continue
    for record in reader:
     state=str(record.pop("state","")).strip().upper()
     out.append((state,record))
  except (OSError,UnicodeError):continue
 return out
def main():
 history=json.loads(HISTORY.read_text(encoding="utf-8"))
 old=json.loads(RESULT.read_text(encoding="utf-8"))
 lookup={st:{u["fips"]:u for u in x["units"]}for st,x in history["states"].items()}
 now=dt.datetime.now(UTC)
 rows=from_michigan(lookup)+from_csv()
 updated,rejected=merge(history,old,rows,now)
 a=dict(old);a["states"]=updated
 if a["states"]!=old.get("states",{}):
  a["publishedAt"]=now.isoformat()
  a["status"]="Attributed partial county results; NOT a statewide race call"
  RESULT.write_text(json.dumps(a,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({"candidates":len(rows),"verifiedStates":len(updated),
                    "verifiedWatchUnits":sum(len(x["counties"])for x in updated.values()),
                    "rejected":rejected[:20],"changed":a["states"]!=old.get("states",{})},indent=2))
if __name__=="__main__":main()
