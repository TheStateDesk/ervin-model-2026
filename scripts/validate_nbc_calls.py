#!/usr/bin/env python3
"""Validate AP and NBC winner calls without inferring outcomes from early leads."""
import json,re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text())
house={x['id'] for x in read('house/data.json')['seats']}
gov={x['code']+'-GOVERNOR' for x in read('governors/data.json')['races']}
sen={x+'-SENATE' for x in 'AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY'.split()}
expected=house|gov|sen
assert len(expected)==506,len(expected)
ballots=read('civicapi/races.json').get('races',{})
records={}
for label,path,publisher,hosts in (
 ('NBC','election-night/nbc-calls.json','NBC News Decision Desk',r'www\.nbc[a-z0-9-]+\.com'),
 ('AP','election-night/ap-calls.json','Associated Press',r'(?:apnews\.com|www\.apnews\.com|whyy\.org|www\.publicsource\.org|mapthegeneral\.com|www\.foxnews\.com)')):
 data=read(path)
 assert data.get('version')==1 and data.get('election')=='2026-11-03' and data.get('publisher')==publisher,(label,'metadata')
 calls=data.get('calls',{})
 assert isinstance(calls,dict) and 0<len(calls)<=506,label
 for id,row in calls.items():
  assert id in expected,(label,id)
  assert row.get('party') in ('D','R','I','O'),(label,id)
  name=row.get('winner')
  assert isinstance(name,str) and 3<=len(name.strip())<=110,(label,id)
  url=urlparse(row.get('sourceUrl',''))
  assert url.scheme=='https' and re.fullmatch(hosts,url.hostname or '') and url.path not in ('','/') and not url.username and not url.password,(label,id)
  cand=ballots.get(id,{}).get('candidates')
  if cand:
   canon=lambda s:re.sub(r'[^a-z0-9]','',str(s).lower())
   assert (canon(name),row['party']) in {(canon(x['name']),x['party']) for x in cand},(label,id,'winner not on validated ballot')
  previous=records.setdefault(id,[])
  if previous:assert all(x['winner'].lower()==name.lower() and x['party']==row['party'] for x in previous),(id,'conflicting newsroom winner calls')
  previous.append(row)
 print('PASS: '+str(len(calls))+' separately sourced '+label+' race calls')
print('PASS: '+str(len(records))+' nonconflicting attributed winner calls across '+str(len(expected))+' indexed contests; no votes inferred from forecasts or leads')
