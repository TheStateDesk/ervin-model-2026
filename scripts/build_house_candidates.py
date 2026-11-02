#!/usr/bin/env python3
"""Build source-attributed 2026 general-election House rosters, never extrapolate from FEC filers."""
import csv,io,json,datetime,re,unicodedata,urllib.request,collections,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"house"/"data.json"
OUTPUT=ROOT/"house"/"candidates-2026.json"
AUDIT=ROOT/"research"/"house-candidate-roster-audit-2026.json"
SOURCES={
 "elections_in_usa":"https://electionsinusa.com/data/candidates.csv",
 "deepsyte":"https://deepsyte.app/data/candidates-2026.csv",
}
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ErvinModel election research)","Accept":"text/csv"})
 with urllib.request.urlopen(req,timeout=28) as resp:
  if resp.status!=200:raise ValueError("Non-200 candidate source")
  b=resp.read(2_500_001)
  if len(b)>2_500_000:raise ValueError("Oversize candidate source")
 s=b.decode("utf-8-sig")
 return list(csv.DictReader(io.StringIO(s)))
def normalized_name(name):
 s=unicodedata.normalize("NFKD",name).encode("ascii","ignore").decode().lower()
 s=re.sub(r"\b(?:jr|sr|iii|iv|mr|dr)\b","",s)
 return re.sub(r"[^a-z]","",s)
def race_id(state,district):
 state=state.upper().strip()
 d=str(district).upper().strip()
 if d.startswith(state+"-"):d=d.split("-",1)[1]
 if d in ("AL","AT LARGE","AT-LARGE","0","00"):d="AL"
 elif d.isdigit():d=str(int(d)).zfill(2)
 return state+"-"+d
def party(v):
 s=str(v or "").lower().strip()
 if s in ("d","dem","democratic","democrat"):return "D"
 if s in ("r","rep","republican"):return "R"
 if s in ("l","lib","libertarian"):return "L"
 if s in ("i","ind","independent","no party","no party preference","unaffiliated"):return "I"
 if "green" in s:return "G"
 return s.upper()[:40] or "OTHER"
def parse_house():
 r=json.loads(DATA.read_text())["seats"]
 assert len(r)==435 and len(set(x["id"] for x in r))==435
 return r
def create_rows(seats):
 official={s["id"]:[] for s in seats}
 evidence=collections.Counter()
 raw={};errors={}
 for provider,url in SOURCES.items():
  try:raw[provider]=fetch(url);evidence[provider+"_source_rows"]=len(raw[provider])
  except Exception as ex:errors[provider]=type(ex).__name__+": "+str(ex)[:150]
 if not raw:raise RuntimeError("No candidate source available: "+repr(errors))
 for r in raw.get("elections_in_usa",[]):
  if str(r.get("ballot_status") or "").lower().strip()!="nominee":continue
  state=(r.get("state") or "").upper().strip()
  id=race_id(state,r.get("district") or "")
  if id not in official:continue
  name=str(r.get("name") or "").strip()
  if not name or len(name)>160:continue
  official[id].append({"name":name,"party":party(r.get("party_code") or r.get("party")),
   "fecId":(r.get("fec_id") or "").strip(),"incumbent":str(r.get("incumbency") or "").lower().strip()=="incumbent",
   "source":"Elections in USA","sourceUrl":url,"raceUrl":r.get("page_url") or "",
   "sourceKind":"general-election nominee"})
  evidence["electionsinusa_nominees"]+=1
 for r in raw.get("deepsyte",[]):
  if str(r.get("office") or "").lower() not in ("house","us_house","u.s. house"):continue
  id=race_id(r.get("state") or "",r.get("district") or "")
  if id not in official:continue
  name=str(r.get("candidate") or "").strip()
  if not name or len(name)>160:continue
  official[id].append({"name":name,"party":party(r.get("party")),
   "fecId":str(r.get("fec_candidate_id") or "").strip(),
   "incumbent":str(r.get("incumbent") or "").lower()=="yes",
   "source":"DeepSyte","sourceUrl":SOURCES["deepsyte"],
   "raceUrl":r.get("race_url") or "", "sourceKind":"on-ballot candidate"})
  evidence["deepsyte_on_ballot"]+=1
 out={};mixed=[];missing=[];disagreements=[]
 for seat in seats:
  id=seat["id"];rows=official[id];merged={}
  for r in rows:
   fid=r["fecId"];key="ID:"+fid if fid else "NAME:"+normalized_name(r["name"])+"-"+r["party"]
   if key not in merged:merged[key]=r.copy();merged[key]["providers"]=[r["source"]]
   else:
    m=merged[key]
    if r["source"] not in m["providers"]:m["providers"].append(r["source"])
    if m["source"]=="Elections in USA" and r["source"]=="DeepSyte":
     # DeepSyte records a directly verified ballot candidate where available.
     m["name"]=r["name"];m["raceUrl"]=r["raceUrl"] or m["raceUrl"]
     m["sourceKind"]="on-ballot candidate"
    m["incumbent"]=m["incumbent"] or r["incumbent"]
  people=list(merged.values())
  # Merge FEC-backed and missing-FEC entries with same normalized name.
  final={}
  for person in people:
   key=(normalized_name(person["name"]),person["party"])
   if key not in final:final[key]=person
   else:
    f=final[key]
    f["providers"]=sorted(set(f["providers"]+person["providers"]))
    f["incumbent"]=f["incumbent"] or person["incumbent"]
    if not f["fecId"]:f["fecId"]=person["fecId"]
  people=list(final.values())
  people.sort(key=lambda x:({"D":0,"R":1,"L":2,"I":3}.get(x["party"],4),x["name"].casefold()))
  providerSet={r["source"] for r in rows}
  if not people:missing.append(id)
  if len(providerSet)==2:mixed.append(id)
  partyCounts=collections.Counter(r["party"] for r in people)
  if any(partyCounts[p]>1 for p in ("D","R")):
   disagreements.append({"raceId":id,"issue":"multiple_same_major_party_listed","candidates":[{"name":p["name"],"party":p["party"],"source":p["providers"]} for p in people]})
  out[id]={"id":id,"office":"House","year":2026,"candidates":[{
    "name":p["name"],"party":p["party"],"incumbent":p["incumbent"],
    "fecId":p["fecId"],"providers":p["providers"],"sourceKind":p["sourceKind"],
    "sourceUrl":p["raceUrl"] if str(p["raceUrl"]).startswith("https://") else p["sourceUrl"]
   } for p in people],
   "status":"listed" if people else "unverified",
   "sourceCount":len(providerSet),
   "caution":"Candidate source directory, not official state certification; check state ballot list. FEC filings alone are excluded."
  }
 summary={
  "districts":len(out),"districtsWithAtLeastOneCandidate":len(out)-len(missing),
  "missingDistricts":missing,"districtsWithBothSources":len(mixed),
  "totalCandidates":sum(len(x["candidates"]) for x in out.values()),
  "multipleMajorPartyCandidates":disagreements[:100],
  "sourceRows":dict(evidence),"sourceFailures":errors,
  "candidateRacesWithD":sum(any(c["party"]=="D" for c in x["candidates"]) for x in out.values()),
  "candidateRacesWithR":sum(any(c["party"]=="R" for c in x["candidates"]) for x in out.values()),
 }
 if len(out)!=435:raise ValueError("Missing House registry entries")
 generated=datetime.datetime.now(datetime.timezone.utc).isoformat()
 OUTPUT.write_text(json.dumps({"version":1,"election":"2026-11-03","generatedAt":generated,
  "method":"Two public general-election ballot rosters (DeepSyte on-ballot, Elections in USA explicitly nominee), FEC filers not marked nominee omitted; state official lists remain ultimate authority.",
  "sources":SOURCES,"summary":{k:v for k,v in summary.items() if k!="multipleMajorPartyCandidates"},"races":out},ensure_ascii=False,separators=(",",":"))+"\n")
 AUDIT.write_text(json.dumps({"version":1,"generatedAt":generated,"summary":summary},ensure_ascii=False,indent=2)+"\n")
 print(json.dumps(summary,ensure_ascii=False))
 return summary
if __name__=="__main__":create_rows(parse_house())
