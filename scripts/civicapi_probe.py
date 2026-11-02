#!/usr/bin/env python3
"""CivicAPI v2 pilot. Only exact November 2026 general-election matches can publish votes."""
import datetime as dt
import json, re, time, urllib.parse, urllib.request
from pathlib import Path

BASE="https://civicapi.org/api/v2"
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"civicapi"
DATE="2026-11-03"
CLOSE=dt.datetime(2026,11,4,1,tzinfo=dt.timezone.utc)
TARGETS={
 "AL-07":("Alabama","house",7),
 "MI-07":("Michigan","house",7),
 "TX-18":("Texas","house",18),
 "MI-SENATE":("Michigan","senate",None),
 "ME-SENATE":("Maine","senate",None),
 "TX-GOVERNOR":("Texas","governor",None)
}
def now(): return dt.datetime.now(dt.timezone.utc)
def parse_date(x):
 try:
  d=dt.datetime.fromisoformat(str(x).replace("Z","+00:00"))
  return d.astimezone(dt.timezone.utc) if d.tzinfo else None
 except (ValueError,TypeError,OverflowError): return None
def query(target):
 s,o,n=TARGETS[target]
 return f"{s} US House {n} General Election 2026" if o=="house" else f"{s} {o.title()} General Election 2026"
def read(url):
 request=urllib.request.Request(url,headers={"User-Agent":"ErvinModel2026-Research/1.0","Accept":"application/json"})
 with urllib.request.urlopen(request,timeout=12) as response:
  data=response.read(1_000_001)
  if response.status!=200 or len(data)>1_000_000: raise ValueError("Unexpected provider response")
 return json.loads(data)
def elements(x):
 if isinstance(x,list): return x[:200]
 if isinstance(x,dict):
  for k in ("results","races","items","data"):
   y=x.get(k)
   if isinstance(y,list): return y[:200]
   if isinstance(y,dict):
    for inner in ("results","races","items"):
     if isinstance(y.get(inner),list): return y[inner][:200]
 return []
def title(x):
 return " ".join(str(x.get(k) or "") for k in ("name","title","race_name","election_name","office","location","state","district","election_type","type")).lower()
def match(key,record):
 if not isinstance(record,dict): return False
 state,office,num=TARGETS[key]; value=title(record)
 if state.lower() not in value and not re.search(r"\b"+key[:2].lower()+r"\b",value): return False
 if any(word in value for word in ("primary","special","runoff")): return False
 date=str(record.get("date") or record.get("election_date") or record.get("electionDate") or "")
 if date and not date.startswith(DATE): return False
 if office=="house":
  if not ("house" in value or "congress" in value): return False
  pattern=r"\b(?:house|district|congress(?:ional)?)\s*(?:district\s*)?0*"+str(num)+r"\b"
  return bool(re.search(pattern,value))
 return office in value
def normalize(key,search,detail,current):
 if not (isinstance(detail,dict) and match(key,search)): return None
 if not match(key,{**search,**{k:v for k,v in detail.items() if k in ("name","title","race_name","election_name","office","state","district")}}): return None
 dates=[str(x.get(k) or "") for x in (search,detail) for k in ("date","election_date","electionDate")]
 # Reject any explicit conflicting date, even if another field matches the target.
 if not any(d.startswith(DATE) for d in dates) or any(d and not d.startswith(DATE) for d in dates): return None
 types=" ".join(str(x.get(k) or "") for x in (search,detail) for k in ("type","election_type")).lower()
 if "general" not in types or any(w in types for w in ("primary","special","runoff")): return None
 stamp=next((parse_date(detail.get(k)) for k in ("updated_at","updatedAt","last_updated","lastUpdated","as_of","asOf") if parse_date(detail.get(k))),None)
 if not stamp or stamp<CLOSE or stamp>current+dt.timedelta(minutes=5) or current<CLOSE: return None
 race_id=search.get("id",search.get("race_id",search.get("raceId")))
 if not re.fullmatch(r"\d{1,12}",str(race_id)): return None
 people=detail.get("candidates")
 if not isinstance(people,list) or not 2<=len(people)<=20: return None
 result=[];names=set()
 for c in people:
  if not isinstance(c,dict): return None
  name=str(c.get("name") or c.get("candidate_name") or "").strip()
  votes=c.get("votes")
  if not name or len(name)>140 or name.lower() in names or type(votes)!=int or not 0<=votes<30_000_000: return None
  names.add(name.lower())
  p=str(c.get("party") or c.get("party_abbreviation") or "").lower()
  p="D" if p in ("d","dem","democratic") else "R" if p in ("r","rep","republican") else ""
  result.append({"name":name,"votes":votes,"party":p})
 total=detail.get("total_votes",detail.get("totalVotes",detail.get("total")))
 if type(total)!=int or total<=0 or abs(total-sum(c["votes"] for c in result))>max(10,total*.005): return None
 pct=detail.get("percent_reporting")
 if type(pct) not in (float,int) or not 0<=pct<=100: pct=None
 return {"verified":True,"source":"civicAPI","office":TARGETS[key][1],"raceId":str(race_id),"election":DATE,
         "total":total,"candidates":result,"precinctsReporting":pct,"asOf":stamp.isoformat().replace("+00:00","Z"),
         "sourceUrl":BASE+"/race/"+str(race_id)}
def dump(file,data):
 file.parent.mkdir(parents=True,exist_ok=True)
 file.write_text(json.dumps(data,indent=2,sort_keys=True,ensure_ascii=False)+"\n")
def main():
 current=now();prior={}
 try:
  saved=json.loads((OUT/"races.json").read_text())
  if saved.get("election")==DATE and isinstance(saved.get("races"),dict): prior=saved["races"]
 except (OSError,ValueError): pass
 status={}
 for key in TARGETS:
  q=query(key);status[key]={"query":q,"state":"unchecked"}
  try:
   results=read(BASE+"/race/search?"+urllib.parse.urlencode({"query":q}))
   matched=[r for r in elements(results) if match(key,r)]
   status[key]["searchMatches"]=len(matched)
   if len(matched)!=1:
    status[key]["state"]="ambiguous" if matched else "not_found"
    continue
   row=matched[0];identifier=row.get("id",row.get("race_id",row.get("raceId")))
   if not re.fullmatch(r"\d{1,12}",str(identifier)):
    status[key]["state"]="id_unavailable";continue
   detail=read(BASE+"/race/"+str(identifier))
   verified=normalize(key,row,detail,current)
   status[key]["raceId"]=str(identifier)
   status[key]["state"]="verified_returns" if verified else "schema_or_votes_unverified"
   if verified:
    old=prior.get(key,{})
    previous=parse_date(old.get("asOf"))
    fresh=parse_date(verified["asOf"])
    if not previous or (fresh>=previous and verified["total"]>=old.get("total",0)):
     prior[key]=verified
  except Exception as e:
   status[key]["state"]="source_unavailable"
   status[key]["errorType"]=type(e).__name__
  time.sleep(.25)
 dump(OUT/"races.json",{"version":1,"election":DATE,"races":prior})
 dump(OUT/"discovery.json",{"version":1,"checkedAt":current.isoformat().replace("+00:00","Z"),
   "provider":"civicAPI v2","status":status,
   "polling":{"state":"undocumented","note":"Polling advertised by provider; verified v2 polling endpoint and schema not established. No polls added to Ervin model."},
   "note":"Six-race pilot. Missing or rejected values do not mean zero votes; source access and Pages publication may lag."})
 print(json.dumps({k:v["state"] for k,v in status.items()},indent=2))
if __name__=="__main__": main()
