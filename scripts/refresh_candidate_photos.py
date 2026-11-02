#!/usr/bin/env python3
"""Refresh name-matched 2026 Senate and governor headshots from Wikipedia's
individual article thumbnails. Leave verified previous snapshots intact if API
is unreachable, and never substitute an unrelated political photo."""
from __future__ import annotations
import concurrent.futures as cf
import datetime as dt
import json, re, urllib.parse, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'candidate-portraits.json'
API='https://en.wikipedia.org/w/api.php'
def key(s):return re.sub('[^a-z]','',s.lower())
def matched(name,title):
 a,b=key(name),key(title)
 words=name.split()
 return a==b or (len(words)>1 and b.startswith(key(words[0])) and b.endswith(key(words[-1])) and len(words[-1])>3)
def fetch(name):
 query=urllib.parse.urlencode({'action':'query','format':'json','formatversion':'2','redirects':'1','prop':'pageimages',
   'piprop':'thumbnail','pithumbsize':'230','titles':name})
 try:
  req=urllib.request.Request(API+'?'+query,headers={'User-Agent':'ErvinModel2026PortraitIndex/1.0 (political race roster picture attribution; geervin github)','Accept':'application/json'})
  with urllib.request.urlopen(req,timeout=18) as resp:
   if resp.status!=200:return name,None
   data=json.loads(resp.read(200000))
  for page in data.get('query',{}).get('pages',[]):
   pic=page.get('thumbnail',{}).get('source','')
   title=page.get('title','')
   if not page.get('missing') and matched(name,title) and pic.startswith('https://upload.wikimedia.org/'):
    return name,{'url':pic,'page':'https://en.wikipedia.org/wiki/'+urllib.parse.quote(title.replace(' ','_')),'source':'Wikipedia / Wikimedia'}
 except (OSError,ValueError,KeyError,TimeoutError):pass
 return name,None
def main():
 gov=json.loads((ROOT/'governors/data.json').read_text())['races']
 sen=json.loads((ROOT/'counties-watch/forecast-baselines.json').read_text())['states']
 people=set()
 for race in gov:
  people.update(x for x in (race.get('dem'),race.get('rep')) if x)
 for race in sen.values():
  people.update(x for x in (race.get('nonR'),race.get('rep')) if x)
 old=json.loads(OUT.read_text()) if OUT.exists() else {'version':1,'portraits':{}}
 portraits=dict(old.get('portraits',{}))
 found=0
 with cf.ThreadPoolExecutor(max_workers=5) as ex:
  for name,record in ex.map(fetch,sorted(people)):
   if record:
    portraits[name]=record;found+=1
 # Preserve successes from earlier snapshot on transient HTTP failures.
 old.update({'version':1,'asOf':dt.datetime.now(dt.timezone.utc).isoformat(),
  'scope':{'trackedNames':len(people),'wikiArticlesConfirmedThisRun':found,'savedPortraits':len(portraits)},
  'method':'Exact or conservatively matching first+last person name on Wikipedia article and Wikimedia thumbnail. Missing remains initials. Third-party and CivicAPI images handled independently.',
  'portraits':dict(sorted(portraits.items()))})
 OUT.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
 print('Candidate portrait scan:',len(people),'names;',found,'confirmed now;',len(portraits),'persisted')
if __name__=='__main__':main()
