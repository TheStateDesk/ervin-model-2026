#!/usr/bin/env python3
"""Build current county watch pace targets from the national Ervin default.

Read exactly the public ERVIN_DATA object; use the same four publisher
weights/freshness factor and Original Ervin correction as index.html.
Benchmark inputs, NOT predicted county vote totals or conditional win odds.
"""
import datetime as dt
import json
import math
import pathlib
import re
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=ROOT/"index.html"
TARGET=ROOT/"counties-watch/forecast-baselines.json"
WEIGHTS={"rcp":0.40,"ddhq":0.29,"win270":0.21,"silver":0.10}
def parse():
 s=HTML.read_text(encoding="utf-8")
 m=re.search(r"window\.ERVIN_DATA = (\{[\s\S]*?\});\s*</script><script>",s)
 if m is None:raise ValueError("ERVIN_DATA JSON missing from website")
 return json.loads(m.group(1))
def parse_date(raw,now):
 s=str(raw or "").strip()
 try:
  if not re.search(r"20\d{2}",s):s=s+", "+str(now.year)
  return dt.datetime.strptime(s.replace(",",""),"%b %d %Y").replace(tzinfo=dt.timezone.utc)
 except ValueError:
  try:return dt.datetime.fromisoformat(s.replace("Z","+00:00"))
  except ValueError:return None
def build(data):
 published=data.get("liveMeta",{}).get("checkedAt")
 try:now=dt.datetime.fromisoformat(published.replace("Z","+00:00"))
 except (AttributeError,ValueError):now=dt.datetime.now(dt.timezone.utc)
 out={}
 for race in data["states"]:
  vals=[];seen=set()
  for key,weight in WEIGHTS.items():
   p=race["sources"].get(key,{})
   if p.get("proxy") or p.get("value") is None:continue
   try:value=float(p["value"])
   except (TypeError,ValueError):continue
   if not math.isfinite(value):continue
   publisher=str(p.get("publisherId") or p.get("origin") or key).strip().lower()
   if publisher in seen:continue
   seen.add(publisher)
   date=parse_date(p.get("date"),now)
   age=max(0,(now-date).total_seconds()/86400) if date else 999
   if age>7:continue  # synchronized with the main-page recent-publisher cutoff
   vals.append((value,weight*max(.5,math.exp(-age/35))))
  if not vals:
   fallback=race["sources"].get("average") or race["sources"].get("rcp")
   margin=float(fallback["value"])
  else:
   margin=round(sum(v*w for v,w in vals)/sum(w for _,w in vals),2)
  bias=float(race.get("correction") or 0) if race.get("history_mode")!="not_comparable" else 0
  adjusted=round(margin-bias,2)
  out[race["code"]]={"state":race["state"],"nonR":race["dem"],"rep":race["rep"],
      "party":race["party"],"pollMargin":round(margin,2),"adjustedMargin":adjusted,
      "mode":"Original Ervin","publisherInputs":len(vals),"proxyOrSingleInput":len(vals)<2,
      "source":"Ervin's Take · recent publisher blend (7-day limit)" if vals else "OLDER REFERENCE · no recent qualifying publisher average",
      "stale":not bool(vals),
      "note":"Model-based statewide non-R minus R margin. Historic proxy, not current polling." if not vals else "Model-based statewide margin from recent attributed publisher averages, not a county poll."}
 return {"version":1,"asOf":now.isoformat(),"source":"National 2026 Ervin polling dashboard; Original Ervin default",
         "method":"Four-source weight/freshness blend minus Original Ervin correction; independent races do not transfer D/R error",
         "states":out}
def main():
 payload=build(parse())
 rendered=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
 TARGET.write_text(rendered,encoding="utf-8")
 print("Built "+str(len(payload["states"]))+" model state targets at "+payload["asOf"])
if __name__=="__main__":main()
