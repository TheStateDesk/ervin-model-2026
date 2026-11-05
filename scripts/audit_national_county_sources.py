#!/usr/bin/env python3
"""Independent source-readiness audit for every bundled 2026 county.

This audits coverage and endpoint connectivity, NOT votes. A working election
website is not necessarily a county vote feed. Before polls close, 2026 vote
totals MUST remain absent. A county may be marked 'reporting' only by the
separate strict vote validator with independently attributed FIPS + time.
"""
import concurrent.futures as futures
import datetime as dt
import json, socket, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/'election-night'/'county-sources.json'
OUT=ROOT/'election-night'/'county-source-health.json'
UA='ErvinModel/2026 (county election source audit; github.com/TheStateDesk/thestatedesk.github.io)'
CODES='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split()

def normalized(s):
 return ''.join(ch for ch in s.lower() if ch.isalnum())
def all_geography():
 result={}
 for i in range(1,11):
  data=json.loads((ROOT/'geo'/'packs'/f'p{i:02}.json').read_text())
  for code,item in data['states'].items():
   if code in result:raise ValueError('Duplicate state '+code)
   result[code]={str(f['id']).zfill(5):str(f['properties']['name']) for f in item['counties']['features']}
 assert set(result)==set(CODES),'Not every state has county boundaries'
 assert len({(state,county) for state,data in result.items() for county in data})>=3100
 return result
def probe(url):
 result={'url':url,'status':'unavailable','note':'No accepted HTTP response'}
 try:
  p=urllib.parse.urlparse(url)
  if p.scheme!='https' or not p.netloc:raise ValueError('Not an HTTPS authority URL')
  req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/json;q=.8,*/*;q=.5'})
  with urllib.request.urlopen(req,timeout=6) as resp:
   status=getattr(resp,'status',0);body=resp.read(120000)
   final=resp.geturl()
  if status!=200:raise ValueError('HTTP '+str(status))
  if not final.startswith('https://'):raise ValueError('HTTPS redirected to unsafe URL')
  if not body:raise ValueError('Empty response')
  result['status']='reachable'
  result['note']='Webpage or portal reachable; actual vote feed and 2026 results NOT verified'
 except urllib.error.HTTPError as e:
  result.update(status='indeterminate' if e.code in (401,403,429,503) else 'unavailable',note='HTTP '+str(e.code)+' to robot')
 except (urllib.error.URLError,TimeoutError,socket.timeout) as e:
  result.update(status='indeterminate',note='Connection timeout or automated access blocked')
 except Exception as e:
  result.update(status='indeterminate',note=str(e)[:110])
 return result

def audit(geography,registry,probe_urls=True):
 all_urls={}
 for code,row in registry['states'].items():
  if row['authorityRole']!='state-election-authority-directory-only':
   all_urls[row['authority']]=None
  for name,u in row['countyLinks'].items():
   all_urls[u]=None
 if probe_urls:
  with futures.ThreadPoolExecutor(max_workers=12) as pool:
   for result in pool.map(probe,all_urls):
    all_urls[result['url']]=result
 else:
  all_urls={u:{'url':u,'status':'not_checked','note':'Connectivity has not been independently tested'} for u in all_urls}
 stats={}
 linked_total=0;reachable_total=0;all_total=0
 for code in CODES:
  features=geography[code];row=registry['states'][code];names={normalized(v):k for k,v in features.items()}
  links={}
  for name,url in row.get('countyLinks',{}).items():
   fips=names.get(normalized(name))
   if not fips:raise ValueError('Registry county has no FIPS geometry: '+code+' '+name)
   if not url.startswith('https://'):raise ValueError('Non-HTTPS county link '+code+' '+name)
   if fips in links:raise ValueError('Duplicate county mapping '+code+' '+fips)
   links[fips]={'county':features[fips],'sourceUrl':url,'connectivity':all_urls[url]['status'],
     'note':all_urls[url]['note'],'authorityListed':True,'machineReadable':False,'resultsVerified':False}
  linked_total+=len(links);reachable_total+=sum(v['connectivity']=='reachable' for v in links.values())
  all_total+=len(features)
  stats[code]={'boundaryCount':len(features),'linkedCountySources':len(links),
      'notIndependentlyLinked':len(features)-len(links),
      'stateAuthority':row['authority'],'authorityRole':row['authorityRole'],
      'authorityConnectivity':all_urls.get(row['authority'],{}).get('status','not_checked'),
      'countySources':links,'verifiedResultFeeds':0,
      'note':'Source link and HTTP connectivity do not mean this county has a validated 2026 vote feed.'}
 return {'version':1,'election':'2026-11-03','checkedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
   'scope':'All 50 locally bundled county-equivalent geographies, with independently sourced county election office URLs where available. No actual 2026 results asserted.',
   'summary':{'states':len(stats),'countyEquivalents':all_total,'countySourcesIndependentlyLinked':linked_total,
     'countySourcePagesResponding':reachable_total,'countiesWithoutDirectVerifiedSource':all_total-linked_total,
     'machineReadableCountyFeedsConfirmed':0,'verified2026CountyReturnsBeforePollClose':0},
   'states':stats}

def main():
 geography=all_geography()
 registry=json.loads(REG.read_text())
 assert registry['election']=='2026-11-03' and set(registry['states'])==set(CODES)
 payload=audit(geography,registry,probe_urls=True)
 OUT.write_text(json.dumps(payload,indent=2)+'\n')
 print('County source audit:',json.dumps(payload['summary']))
 for state,row in payload['states'].items():
  if row['linkedCountySources']:
   print(state,row['linkedCountySources'],'county sources indexed,',sum(x['connectivity']=='reachable' for x in row['countySources'].values()),'URLs responding, 0 live vote feeds validated')
if __name__=='__main__':main()
