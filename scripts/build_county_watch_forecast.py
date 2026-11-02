#!/usr/bin/env python3
"""Build county watch benchmarks from preserved national Senate workbench data.

The public landing page no longer embeds the research workbench. Current
polling and historic adjustment data live in research/senate-workbench-data.json.
Benchmarks are not county vote totals or conditional win odds.
"""
import datetime as dt
import json
import math
import pathlib
import re
ROOT=pathlib.Path(__file__).resolve().parents[1]
MODEL=ROOT/"research/senate-workbench-data.json"
TARGET=ROOT/"counties-watch/forecast-baselines.json"
WEIGHTS={"rcp":0.40,"ddhq":0.29,"win270":0.21,"silver":0.10}
def parse():
 return json.loads(MODEL.read_text(encoding="utf-8"))
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
  # Only apply a documented, non-backtested candidate-strength sensitivity.
  # Unlike gubernatorial or federal historical polling errors, this transfer
  # has no fitted accuracy estimate and is not a religion/geography penalty.
  candidate_strength=None
  if race["code"]=="MI":
   research=json.loads((ROOT/"research/michigan-candidate-effect-audit-2026-11-02.json").read_text(encoding="utf-8"))
   candidate_strength=research.get("forecast",{}).get("candidateStrength")
   if not candidate_strength or candidate_strength.get("candidate")!=race["dem"]:
    raise ValueError("MI Ervin candidate context source unavailable or candidate mismatch")
   if candidate_strength.get("transferVerified") is not False:
    raise ValueError("Do not label unsupported candidate-strength transfer as validated")
   shifted=float(candidate_strength["adjustmentD"])
   if not math.isfinite(shifted) or abs(shifted)>3:
    raise ValueError("MI candidate-strength adjustment out of source boundaries")
   adjusted=round(adjusted+shifted,2)
  out[race["code"]]={"state":race["state"],"nonR":race["dem"],"rep":race["rep"],
      "party":race["party"],"pollMargin":int(margin) if float(margin).is_integer() else round(margin,2),"adjustedMargin":adjusted,
      "mode":"Original Ervin","publisherInputs":len(vals),"proxyOrSingleInput":len(vals)<2,
      "source":("Ervin's Take · publisher blend + original history + discounted candidate context" if candidate_strength else ("Ervin's Take · recent publisher blend (7-day limit)" if vals else "OLDER REFERENCE · no recent qualifying publisher average")),
      "stale":not bool(vals),
      "note":("Ervin’s Take: Original Michigan Senate historical correction plus an unvalidated, heavily discounted candidate-primary error context; not a religious/poll-mode penalty." if candidate_strength else ("Model-based statewide non-R minus R margin. Historic proxy, not current polling." if not vals else "Model-based statewide margin from recent attributed publisher averages, not a county poll.")),
      **({"candidateStrength":candidate_strength} if candidate_strength else {})}
 return {"version":1,"asOf":now.isoformat(timespec="milliseconds").replace("+00:00","Z"),"source":"National 2026 Ervin polling dashboard; Original Ervin default",
         "method":"Four-source weight/freshness blend minus Original Ervin correction; independent races do not transfer D/R error",
         "states":out}
def main():
 payload=build(parse())
 rendered=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
 TARGET.write_text(rendered,encoding="utf-8")
 print("Built "+str(len(payload["states"]))+" model state targets at "+payload["asOf"])
if __name__=="__main__":main()
