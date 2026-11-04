#!/usr/bin/env python3
"""CivicAPI v2 national election-night collector. Honest, fail-closed results.

Source search is scheduled (not browser-side). Cached provider IDs avoid 506
separate search requests each refresh. Source API https://civicapi.org/api-documentation.
No counts are created from polling, forecasts, historical results, or test_data.
"""
from __future__ import annotations
import concurrent.futures as futures
import datetime as dt
import json
import os
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
import urllib.error

BASE="https://civicapi.org/api/v2"
DAY="2026-11-03"
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"civicapi"
REG=DIR/"registry.json"
OUT=DIR/"races.json"
HEALTH=DIR/"discovery.json"
ET=dt.timezone(dt.timedelta(hours=-5))
STATES={"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
LAST_CLOSE={"AK":"01:00","HI":"00:00","CA":"23:00","WA":"23:00","OR":"23:00","ID":"23:00","MT":"22:00","WY":"21:00","ND":"22:00","NV":"22:00","AZ":"21:00","CO":"21:00","UT":"22:00","NM":"21:00","TX":"21:00","KS":"21:00","IA":"21:00","MI":"21:00","MN":"21:00","SD":"21:00","NE":"21:00","WI":"21:00","ME":"20:00","NH":"20:00","MA":"20:00","CT":"20:00","RI":"20:00","NY":"21:00","NJ":"20:00","DE":"20:00","MD":"20:00","PA":"20:00","VT":"19:00","VA":"19:00","WV":"19:30","NC":"19:30","SC":"19:00","GA":"19:00","FL":"20:00","AL":"20:00","MS":"20:00","TN":"20:00","KY":"19:00","OH":"19:30","IN":"19:00","IL":"20:00","MO":"20:00","AR":"20:30","LA":"21:00","OK":"20:00"}
# Known local House exceptions. Unlisted seats conservatively wait until last state polling place closes.
EARLIER={"KY-06":"18:00","FL-27":"19:00","TX-18":"20:00","VA-02":"19:00","VA-05":"19:00","AL-07":"20:00","MI-07":"20:00"}
# Source: 270toWin 2026 poll-closing times, district by district.
# Accept results only once every polling place in a district has closed.
EARLIER.update({f"IN-{i:02d}":"18:00" for i in range(2,10) if i!=8})
EARLIER.update({f"KY-{i:02d}":"18:00" for i in range(3,7)})
EARLIER.update({f"FL-{i:02d}":"19:00" for i in range(3,29)})
EARLIER.update({f"KS-{i:02d}":"20:00" for i in range(2,5)})
EARLIER.update({f"MI-{i:02d}":"20:00" for i in range(2,14)})
EARLIER.update({f"TX-{i:02d}":"20:00" for i in range(1,39) if i not in (16,23)})
EARLIER["ID-02"]="22:00"
# A statewide contest can legitimately receive attributed partial returns once
# the first polls in that state close. Keep House-specific deadlines unchanged.
# These are Eastern clock times, independently validated from 2026 poll-close schedules.
SENATE_FIRST_CLOSE={"KY":"18:00","FL":"19:00","NH":"19:00","KS":"20:00","MI":"20:00","TX":"20:00","ID":"22:00","OR":"22:00","AK":"00:00"}
MAX_WORKERS=6
MAX_DETAIL_WORKERS=18

def result_priority(item, stored):
 # Senate and governor first; check missing reports before stored reports
 # within each chamber when CivicAPI's upstream connection is overloaded.
 key=item[0]
 return (0 if key.endswith("-SENATE") else 1 if key.endswith("-GOVERNOR") else 2,
         0 if key not in stored else 1,key)

def detail_attempts(key, stored, upstream_down):
 # A missing statewide result is critical on election night. Give such
 # contests one extra bounded recovery attempt when the provider is failing,
 # without multiplying requests for the much larger House queue.
 if not upstream_down:return 3
 if key not in stored and (key.endswith("-SENATE") or key.endswith("-GOVERNOR")):return 3
 return 2

def detail_worker_count(n):
 # Grow concurrency as hundreds of races become eligible; limit pressure
 # on CivicAPI during the small early-evening election window.
 return min(MAX_DETAIL_WORKERS,max(MAX_WORKERS,(n+27)//28))

# Nov. 3, 2026: 33 regular Senate races plus Florida and Ohio specials.
SENATE_2026=set("AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY".split())

def current():
 return dt.datetime.now(dt.timezone.utc)
def iso(d):
 return d.astimezone(dt.timezone.utc).isoformat().replace("+00:00","Z")
def parsed(value):
 if not isinstance(value,str) or not value.strip():return None
 try:
  t=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
  return t.astimezone(dt.timezone.utc) if t.tzinfo else None
 except ValueError:return None
def after_close(key):
 code=key[:2]
 h=SENATE_FIRST_CLOSE.get(code,LAST_CLOSE.get(code,"23:00")) if key.endswith("-SENATE") else EARLIER.get(key,LAST_CLOSE.get(code,"23:00"))
 day=dt.date(2026,11,4) if h in ("00:00","01:00") else dt.date(2026,11,3)
 hr,mn=map(int,h.split(":"))
 return dt.datetime.combine(day,dt.time(hr,mn),ET).astimezone(dt.timezone.utc)
def request(url,timeout=18):
 req=urllib.request.Request(url,headers={"User-Agent":"ErvinModel2026/CivicAPI-research (https://geervin.github.io/ervin-model-2026/)","Accept":"application/json"})
 with urllib.request.urlopen(req,timeout=timeout) as f:
  if f.status!=200:raise ValueError("CivicAPI response not 200")
  raw=f.read(7_000_001)
  if len(raw)>7_000_000:raise ValueError("CivicAPI response too large")
 return json.loads(raw)
def request_with_retry(url,timeout=9,max_attempts=3,deadline=None):
 """Only retry transient 408/429/5xx and network/timeouts. Do not fabricate votes."""
 last=None
 for attempt in range(max_attempts):
  if deadline is not None and time.monotonic()>=deadline:
   raise TimeoutError("collection_deadline_reached")
  try:return request(url,timeout=timeout)
  except urllib.error.HTTPError as error:
   if error.code not in (408,429,500,502,503,504):raise
   last=error
  except (urllib.error.URLError,TimeoutError,OSError) as error:
   last=error
  if attempt+1<max_attempts:
   time.sleep(min(3.0,0.65*(2**attempt)))
 raise last

def list_items(data):
 if isinstance(data,list):return data
 if isinstance(data,dict):
  for field in ("results","races","items","data"):
   v=data.get(field)
   if isinstance(v,list):return v
   if isinstance(v,dict):
    for inner in ("results","races","items"):
     if isinstance(v.get(inner),list):return v[inner]
 return []
def text(row):
 return " ".join(str(row.get(k) or "") for k in ("election_name","name","title","office","election_type","election_scope","district","type"))
def when(row):
 return str(row.get("election_date") or row.get("date") or "").strip()[:10]
def type_ok(key,row):
 if not isinstance(row,dict):return False
 office="house" if re.fullmatch(r"[A-Z]{2}-\d{2}",key) else "senate" if key.endswith("-SENATE") else "governor"
 code=key[:2]
 prov=str(row.get("province") or "").strip().upper()
 blob=text(row).lower()
 if prov and prov not in (code,STATES[code].upper()):return False
 if not prov and STATES[code].lower() not in blob:return False
 if when(row) and when(row)!=DAY:return False
 if "primary" in blob or "runoff" in blob:return False
 # A special GENERAL election still elects a federal senator or representative.
 scope=str(row.get("election_scope") or row.get("scope") or "").lower()
 if "primary" in scope or "runoff" in scope:return False
 office_type=str(row.get("election_type") or row.get("office") or "").lower()
 if office=="house":
  if not ("us house" in blob or "u.s. house" in blob or "congress" in blob):return False
  district=key[3:]
  d=str(row.get("district") or "").upper().replace(" ","")
  if d in (key,code+"-"+str(int(district)),str(int(district)),district):return True
  # Six states elect an at-large Representative, often named "US House"
  # without a numerical district in the API.
  if (district=="01" and code in ("AK","DE","ND","SD","VT","WY")
      and ("us house" in blob or "congress" in blob)
      and d in ("",code+"-AL",code+"-AT-LARGE","AT-LARGE","AL","AT LARGE",code+"-01")):
   return True
  # e.g. Michigan US House 7, but never Michigan State House 7
  return bool(re.search(r"\bus[\s.]*house\s*(?:district\s*)?0*"+str(int(district))+r"\b",blob))
 if office=="senate":return "us senate" in blob or "u.s. senate" in blob
 name=str(row.get("election_name") or row.get("name") or "").lower()
 if any(x in name for x in ("lieutenant","council","board","college","university","referendum","question","metropolitan")):return False
 return bool(re.search(r"\bgovernor\b",name)) and not bool(re.search(r"\bgovernors\b",name))
def race_identity(key,search,detail):
 if not type_ok(key,search) or not isinstance(detail,dict):return False
 # Detail must itself independently identify this exact election and office.
 sub={k:detail.get(k) for k in ("election_name","election_type","election_scope","election_date","province","district","country")}
 if not type_ok(key,sub):return False
 if when(detail)!=DAY:return False
 if str(detail.get("test_data") or "").lower() in ("true","1"):return False
 return True
def candidates(detail):
 raw=detail.get("candidates")
 if not isinstance(raw,list) or not 2<=len(raw)<=24:return None
 out=[];seen=set()
 for row in raw:
  if not isinstance(row,dict):return None
  name=str(row.get("name") or "").strip()
  val=row.get("votes")
  if not name or len(name)>155 or type(val)!=int or not (0<=val<=30000000):return None
  if name.lower() in seen:return None
  seen.add(name.lower())
  p=str(row.get("party") or "").lower()
  p="D" if p in ("d","dem","democrat","democratic") else "R" if p in ("r","rep","republican") else "O"
  pic=next((row[k] for k in ("photo","photo_url","portrait_url","image_url","image","avatar") if safeurl(row.get(k))),None)
  out.append({"name":name,"party":p,"votes":val,**({"photo":pic} if pic else {})})
 if sum(c["votes"] for c in out)==0:return None
 return out
def safeurl(x):
 return isinstance(x,str) and x.startswith("https://") and len(x)<500
def normalize(key,search,detail,seen_at,provider_id):
 if not race_identity(key,search,detail):return None
 if seen_at<after_close(key):return None
 people=candidates(detail)
 if not people:return None
 stamp=parsed(detail.get("last_updated"))
 # A stale, explicit pre-close timestamp cannot certify election-night votes.
 # Never "freshen" a known pre-election provider timestamp by replacing it
 # with the collector's later observation time. Missing timestamps are
 # separately marked as collector_observed, not provider_last_updated.
 if stamp and (stamp>seen_at+dt.timedelta(minutes=5) or stamp<after_close(key)):return None
 observed=stamp or seen_at
 total=sum(x["votes"] for x in people)
 rate=detail.get("percent_reporting")
 pct=float(rate) if type(rate) in (int,float) and 0<=rate<=100 else None
 return {"verified":True,"source":"civicAPI","office":"house" if key[-2:].isdigit() else key.split("-")[1].lower(),
         "election":DAY,"raceId":str(provider_id),"total":total,"candidates":people,
         "asOf":iso(observed),"retrievedAt":iso(seen_at),"timestampBasis":"provider_last_updated" if stamp else "collector_observed",
         "precinctsReporting":pct,"sourceUrl":BASE+"/race/"+str(provider_id)}
def load(file,default):
 try:return json.loads(file.read_text())
 except (OSError,ValueError):return default
def save(file,data):
 file.parent.mkdir(parents=True,exist_ok=True)
 serialized=json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+"\n"
 if file.exists() and file.read_text()==serialized:return False
 file.write_text(serialized);return True
def targets():
 house=json.loads((ROOT/"house/data.json").read_text())["seats"]
 senate=json.loads((ROOT/"counties-watch/forecast-baselines.json").read_text())["states"]
 governors=json.loads((ROOT/"governors/data.json").read_text())
 if isinstance(governors,dict):governors=governors.get("races",governors.get("governors",[]))
 out={r["id"]:{"state":r["code"],"office":"house"} for r in house}
 assert len(SENATE_2026)==35 and set(senate).issubset(SENATE_2026), "Published Senate model must be within the 35 contest roster"
 out.update({k+"-SENATE":{"state":k,"office":"senate"} for k in SENATE_2026})
 for r in governors:
  k=str(r.get("code") or r.get("state_code") or "")
  if k in STATES:out[k+"-GOVERNOR"]={"state":k,"office":"governor"}
 return out
def discover(code,office):
 # A narrow federal-office query avoids fetching hundreds of state legislative
 # records and timing out on Wyoming or at-large House lookups.
 q="US House" if office=="house" else "US Senate" if office=="senate" else "Governor"
 params={"query":q,"country":"US","province":code,"start_date":DAY,"end_date":DAY,"limit":600}
 def retrieve(query):
  params["query"]=query
  return list_items(request_with_retry(BASE+"/race/search?"+urllib.parse.urlencode(params),timeout=10,max_attempts=3))
 broad="House" if office=="house" else "Senate" if office=="senate" else None
 try:rows=retrieve(q)
 except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,OSError):
  if not broad:raise
  rows=retrieve(broad)
 if broad:
  wanted="us house" if office=="house" else "us senate"
  if not any(wanted in text(r).lower().replace("u.s.","us") for r in rows if isinstance(r,dict)):
   extra=retrieve(broad) if params["query"]!=broad else []
   seen={str(r.get("id") or r.get("race_id") or r.get("raceId") or "") for r in rows if isinstance(r,dict)}
   rows += [r for r in extra if isinstance(r,dict) and str(r.get("id") or r.get("race_id") or r.get("raceId") or "") not in seen]
 return rows[:1000]
def resolve_registry(expected,registry,now,limit_states=50):
 current_items=registry.get("races",{})
 checks={}
 needs={}
 for key,info in expected.items():
  row=current_items.get(key)
  if isinstance(row,dict) and re.fullmatch(r"\d{1,12}",str(row.get("raceId"))) and row.get("election")==DAY:
   continue
  needs.setdefault((info["state"],info["office"]),[]).append(key)
 if not needs:return current_items,{"found":len(current_items),"lookups":0}
 # Discovery only on first run or for missing targets; no unnecessary repeated API calls.
 pairs=sorted(needs)[:limit_states*3]
 def find_pair(pair):
  try:return pair,discover(*pair),None
  except Exception as e:return pair,[],type(e).__name__
 with futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
  for pair,rows,error in pool.map(find_pair,pairs):
   keys=needs[pair]
   for key in keys:
    m=[x for x in rows if type_ok(key,x)]
    ids=[str(x.get("id") or x.get("race_id") or x.get("raceId") or "") for x in m]
    if len(m)==1 and re.fullmatch(r"\d{1,12}",ids[0]):
     current_items[key]={"raceId":ids[0],"election":DAY,"office":expected[key]["office"],"name":str(m[0].get("election_name") or m[0].get("name") or "")[:120],"search":m[0],"identifiedAt":iso(now)}
     checks[key]="mapped"
    else:
     checks[key]="unavailable" if not m else "ambiguous"
     checks[key]+=": "+", ".join(str(x.get("election_name") or x.get("name") or "")[:68] for x in m[:4])
    if error:checks[key]="source_"+error
 return current_items,{"found":len(current_items),"lookups":len(pairs),"unmapped":sum(v!="mapped" for v in checks.values()),"statusSample":dict(list(checks.items())[:30])}
def probe_provider(registry,now):
 """Independent, low-volume network diagnostics. Never produces vote records."""
 status={}
 def safe_probe(label,url,key=None):
  began=time.monotonic()
  try:
   payload=request(url,timeout=15)
   outcome={"connected":True,"responseMs":round((time.monotonic()-began)*1000),
     "payloadType":type(payload).__name__}
   if isinstance(payload,dict):
    outcome["fields"]=list(payload.keys())[:22]
    if key:
     who=payload.get("candidates")
     outcome["candidateRows"]=len(who) if isinstance(who,list) else None
     outcome["positiveCandidateTotals"]=bool(isinstance(who,list) and
       any(type(c.get("votes"))==int and c["votes"]>0 for c in who if isinstance(c,dict)))
     outcome["identityMatches"]=race_identity(key,registry[key].get("search",{}),payload)
     outcome["providerTimestamp"]=str(payload.get("last_updated") or "")[:32]
   return outcome
  except Exception as error:
   return {"connected":False,"failure":type(error).__name__,
    "detail":str(error)[:160],"responseMs":round((time.monotonic()-began)*1000)}
 status["statusEndpoint"]=safe_probe("status",BASE+"/status")
 for key in ("KY-06","MI-SENATE"):
  row=registry.get(key)
  if row and re.fullmatch(r"\d{1,12}",str(row.get("raceId",""))):
   status[key]=safe_probe(key,BASE+"/race/"+str(row["raceId"]),key)
 status["networkReachable"]=any(v.get("connected") for v in status.values())
 return status

def coverage_by_office(expected,registry,now,stored,issues):
 """Audit every 2026 House, Senate and governor contest, including missing IDs.
 A missing vote record never means that a race has zero votes in the real world.
 """
 office={}
 for name in ("house","senate","governor"):
  keys=[key for key,row in expected.items() if row["office"]==name]
  mapped=[key for key in keys if key in registry]
  eligible=[key for key in mapped if now>=after_close(key)]
  reports=[key for key in mapped if key in stored and isinstance(stored[key],dict)
           and stored[key].get("verified") is True and int(stored[key].get("total") or 0)>0]
  missing=[key for key in keys if key not in registry]
  without=[key for key in eligible if key not in reports]
  office[name]={"targeted":len(keys),"registered":len(mapped),"missingRegistryIds":missing,
   "eligibleForCollection":len(eligible),"awaitingPollClose":sum(now<after_close(key) for key in mapped),
   "verifiedReports":len(reports),"eligibleWithoutValidVoteReport":len(without),
   "sourceErrors":sum(str(issues.get(key,"")).startswith("fetch_") for key in without),
   "validationPending":len(without)-sum(str(issues.get(key,"")).startswith("fetch_") for key in without)}
 assert {name:x["targeted"] for name,x in office.items()}=={"house":435,"senate":35,"governor":36}
 return office

def status_for_each_race(expected,registry,now,stored,issues):
 """Individual, inspectable status for all 506 contests; never infer zero votes."""
 out={}
 for key,info in sorted(expected.items()):
  is_mapped=key in registry
  is_eligible=is_mapped and now>=after_close(key)
  valid=is_mapped and isinstance(stored.get(key),dict) and stored[key].get("verified") is True and type(stored[key].get("total")) is int and stored[key]["total"]>0
  err=issues.get(key)
  state=("unmapped" if not is_mapped else
         "awaiting_poll_close" if not is_eligible else
         "reporting" if valid else
         "source_error" if str(err or "").startswith("fetch_") else
         "awaiting_valid_vote_report")
  out[key]={"office":info["office"],"status":state}
  if valid:
   # Record the age of the last accepted vote snapshot independently of this
   # collection attempt. A provider 502 must not masquerade as fresh totals.
   out[key]["lastValidatedResultAt"]=stored[key].get("asOf")
   out[key]["lastSuccessfulRetrievalAt"]=stored[key].get("retrievedAt")
   out[key]["validatedVoteTotal"]=stored[key]["total"]
   if str(err or "").startswith("fetch_"):
    out[key]["retainedAfterSourceError"]=True
  if err:out[key]["collectionIssue"]=err
 assert len(out)==506
 return out

def main():
 now=current()
 expected=targets()
 prior_reg=load(REG,{"version":1,"election":DAY,"races":{}})
 if prior_reg.get("election")!=DAY:prior_reg={"version":1,"election":DAY,"races":{}}
 registry,discovery=resolve_registry(expected,prior_reg,now)
 # Remove unknown races / incorrect legacy entries.
 registry={k:v for k,v in registry.items() if k in expected}
 # Do not keep a registry item whose office contradicts the expected election office.
 registry={k:v for k,v in registry.items() if v.get("office")==expected[k]["office"]}
 # Keep only the identity fields required for revalidation on collection.
 # Search candidates can be huge and are not necessary for selecting elections.
 identity=("id","election_name","name","election_date","province","district","country","election_type","election_scope","type")
 for row in registry.values():
  row["search"]={k:row.get("search",{}).get(k) for k in identity if row.get("search",{}).get(k) is not None}
 save(REG,{"version":1,"election":DAY,"races":registry})
 provider_connectivity=probe_provider(registry,now)
 prior=load(OUT,{"version":1,"election":DAY,"races":{}})
 stored=prior.get("races",{}) if prior.get("election")==DAY else {}
 eligible={k:v for k,v in registry.items() if now>=after_close(k)}
 issues={}
 fetched=0;added=0
 deadline=time.monotonic()+11*60
 def get_one(item):
  key,row=item
  try:return key,request_with_retry(BASE+"/race/"+str(row["raceId"]),timeout=7,max_attempts=detail_attempts(key,stored,upstream_down),deadline=deadline),None
  except urllib.error.HTTPError as e:return key,None,"HTTP_"+str(e.code)
  except Exception as e:return key,None,type(e).__name__
 # One contest = one detail request, with bounded 5xx/timeout retries.
 # Upstream 502s may be transient: retry the individual contest, never drop
 # a previously validated tally, and stop at the collection deadline.
 # If status and sentinel race endpoints are unavailable, reduce pressure on
 # CivicAPI instead of driving a high-concurrency 502 gateway-error storm.
 # Every eligible House, Senate, and governor race remains in the queue.
 upstream_down=not provider_connectivity.get("networkReachable",False)
 detail_workers=min(8,detail_worker_count(len(eligible))) if upstream_down else detail_worker_count(len(eligible))
 with futures.ThreadPoolExecutor(max_workers=detail_workers) as pool:
  # Prioritize statewide Senate returns ahead of the larger House queue.
  # Slow or timed-out district endpoints must not starve Senate results.
  ordered=sorted(eligible.items(),key=lambda item:result_priority(item,stored))
  for key,data,error in pool.map(get_one,ordered):
   if error:
    issues[key]="fetch_"+error;continue
   fetched+=1
   row=normalize(key,registry[key].get("search",{}),data,now,registry[key]["raceId"])
   if not row:issues[key]="no_valid_reported_votes";continue
   old=stored.get(key)
   if old:
    if int(row["total"])<int(old.get("total",0)):
     issues[key]="vote_total_decreased_held";continue
    if parsed(row["asOf"])<parsed(old.get("asOf")):
     issues[key]="stale_update_held";continue
    # Same totals and candidate counts do not need a fresh commit/deployment.
    if row["total"]==old.get("total") and row["candidates"]==old.get("candidates"):continue
   stored[key]=row;added+=1
 if added:save(OUT,{"version":1,"election":DAY,"races":stored})
 elif not OUT.exists():save(OUT,{"version":1,"election":DAY,"races":{}})
 health={"version":2,"election":DAY,"provider":"civicAPI v2","checkedAt":iso(now),
  "targetRaces":len(expected),"registeredRaces":len(registry),"eligibleRaces":len(eligible),"attemptedRaces":len(eligible),
  "fetched":fetched,"publishedRaces":len(stored),"updatedRaces":added,
   "officeCoverage":coverage_by_office(expected,registry,now,stored,issues),
   "raceStatuses":status_for_each_race(expected,registry,now,stored,issues),
  "discovery":discovery,"providerConnectivity":provider_connectivity,"errors":issues,
   "transientApiErrors":sum(v.startswith("fetch_HTTP_5") or v=="fetch_HTTP_429" or v=="fetch_TimeoutError" for v in issues.values()),
  "fallback":"Open America and state clerks only if CivicAPI has no valid current report for the contest",
  "polling":{"state":"not_integrated","note":"No verified CivicAPI polling endpoint; election results never become a pre-election poll."}}
 save(HEALTH,health)
 print(json.dumps({"targets":len(expected),"registered":len(registry),"eligible":len(eligible),"fetched":fetched,"published":len(stored),"new":added,"connection":provider_connectivity,"errors":dict(list(issues.items())[:8])}))
if __name__=="__main__":main()
