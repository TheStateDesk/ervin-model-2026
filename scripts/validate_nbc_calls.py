#!/usr/bin/env python3
"""Independent NBC race-call source registry validation: never infer calls from counts."""
import json,re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'election-night/nbc-calls.json').read_text())
assert data.get('election')=='2026-11-03' and data.get('version')==1
assert data.get('publisher')=='NBC News Decision Desk'
calls=data.get('calls',{})
assert isinstance(calls,dict) and 0<len(calls)<=506
house={x['id'] for x in json.loads((ROOT/'house/data.json').read_text())['seats']}
gov={x['code']+'-GOVERNOR' for x in json.loads((ROOT/'governors/data.json').read_text())['races']}
sen={code+'-SENATE' for code in 'AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY'.split()}
expected=house|gov|sen
assert len(expected)==506,len(expected)
for key,row in calls.items():
    assert key in expected,key
    assert row.get('party') in ('D','R','I','O'),key
    name=row.get('winner')
    assert isinstance(name,str) and 3<=len(name)<=110,key
    u=urlparse(row.get('sourceUrl',''))
    assert u.scheme=='https' and re.fullmatch(r'www\.nbc[a-z0-9-]+\.com',u.hostname or ''),key
    assert u.path and not u.username and not u.password,key
verified=json.loads((ROOT/'civicapi/races.json').read_text()).get('races',{})
for key,row in calls.items():
    cand=verified.get(key,{}).get('candidates')
    if cand:
        def canonical(s): return re.sub(r'[^a-z0-9]','',str(s).lower())
        assert canonical(row['winner']) in {canonical(c['name']) for c in cand},(key,'winner not on verified ballot')
print('PASS: '+str(len(calls))+' directly sourced NBC projected winners, '+str(len(expected))+' eligible election contests; no inferred calls')
