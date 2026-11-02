#!/usr/bin/env python3
"""Ervin House: reproducible, model-only 435-district election desk.
References: MEDSL CC0 2022/2024 House results; PeoplesPoll NYT CC-BY-4.0
published survey index; existing Ervin state historical adjustments.
This is not a validated election probability model. Do not conflate 2024 with redrawn 2026 maps.
"""
import json, re, math, sys, collections, datetime, time, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
TODAY=datetime.date(2026,11,2)
NEW_MAP={'AL','CA','FL','LA','NC','OH','TN','TX','UT'}
HEADERS={'User-Agent':'ErvinModelResearch/1.0 (+https://github.com/geervin/ervin-model-2026; public election research)','Accept':'application/json,text/html,*/*'}
BASE='https://api.electiondata.dev/v1/house-results/table/'
URLS={2022:BASE+'2022.json',2024:BASE+'2024.json'}
POLL_DIR='https://peoplespoll.com/house'
def download(url):
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers=HEADERS)
            with urllib.request.urlopen(req,timeout=50) as resp:
                raw=resp.read()
                if not raw or resp.status!=200:raise ValueError('Empty or failed download')
                print('FETCH',url,'bytes',len(raw),flush=True)
                return raw
        except Exception as err:
            last=err;print('RETRY',url,str(err)[:130],flush=True);time.sleep(attempt+1)
    raise RuntimeError('Required independently sourced input unavailable: '+url+' '+str(last))
def load(path):return json.loads((ROOT/path).read_text())
def write(path,obj):
    p=ROOT/path;p.parent.mkdir(exist_ok=True,parents=True)
    p.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n')
def district_id(state,district):
    try: return state.upper()+'-'+str(max(1,int(district))).zfill(2) if str(district).strip().upper() not in ('AL','AT LARGE','AT-LARGE') else state.upper()+'-01'
    except: return state.upper()+'-01'
def party(s):
    s=str(s or '').upper()
    if s in ('DEMOCRAT','DEMOCRATIC','DEMOCRATIC-FARMER-LABOR','DEMOCRATIC FARMER LABOR','DFL') or ('DEMOCRAT' in s and 'REPUBLICAN' not in s):return 'D'
    if s in ('REPUBLICAN','GOP') or 'REPUBLICAN' in s:return 'R'
    return None
def house_year(yr,seats):
    blob=json.loads(download(URLS[yr]))
    rows=blob.get('rows',blob if isinstance(blob,list) else [])
    if not isinstance(rows,list) or len(rows)<650:raise RuntimeError(f'MEDSL {yr}: insufficient records {len(rows)}')
    agg=collections.defaultdict(lambda:{'D':0,'R':0})
    for r in rows:
        if int(r.get('year',yr))!=yr or str(r.get('stage','GEN')).upper()!='GEN':continue
        if str(r.get('special',False)).lower() in ('true','1'):continue
        state=r.get('state_po');dist=r.get('district')
        if not state or dist is None:continue
        id=district_id(state,dist)
        if id not in seats:continue
        p=party(r.get('party'))
        if p:
            try: votes=int(r.get('candidatevotes') or 0)
            except: votes=0
            if votes>0:agg[id][p]+=votes
    valid={id: {'D':v['D'],'R':v['R'],'margin':round(100*(v['D']-v['R'])/(v['D']+v['R']),2),'contested':min(v['D'],v['R'])>0 and min(v['D'],v['R'])/(v['D']+v['R'])>=0.035} for id,v in agg.items() if v['D']+v['R']>=1000}
    if len(valid)<375:raise RuntimeError(f'MEDSL {yr}: only {len(valid)} district returns, abort rather than fabricate')
    natD=sum(x['D'] for x in valid.values());natR=sum(x['R'] for x in valid.values())
    national=round((natD-natR)*100/(natD+natR),3)
    print('MEDSL',yr,'seats',len(valid),'contested',sum(1 for x in valid.values() if x['contested']),'national',national,flush=True)
    return valid,national
def poll_directory(seats):
    html=download(POLL_DIR).decode('utf-8','replace')
    soup=BeautifulSoup(html,'html.parser')
    # The directory publishes the latest survey for each district, not all constituent surveys.
    found={}
    for li in soup.find_all('li'):
        text=li.get_text(' ',strip=True)
        m=re.search(r'\(([A-Z]{2})-(\d{1,2})\):\s*(\d+)\s+polls?\.?\s*Newest:\s*(.*)',text)
        if not m:continue
        id=district_id(m.group(1),m.group(2))
        if id not in seats:continue
        count=int(m.group(3))
        newest=m.group(4)
        # After "Newest:" the publisher is the first named anchor; month/date follows its text.
        link=li.find('a',href=True)
        firm=link.get_text(' ',strip=True) if link else newest.split(',')[0]
        url=link.get('href') if link else POLL_DIR
        dt=re.search(r'(?i)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(202[56])',newest)
        try:date=datetime.datetime.strptime(dt.group(0),'%b %d, %Y').date().isoformat() if dt else None
        except:date=None
        pairs=re.findall(r'([^,%]+?)\s+\(([DRILOC])\)\s+(\d+(?:\.\d+)?)%',newest)
        d=[(n,float(v)) for n,p,v in pairs if p=='D']
        r=[(n,float(v)) for n,p,v in pairs if p=='R']
        independents=[(n,p,float(v)) for n,p,v in pairs if p not in ('D','R')]
        # Independent-vs-R and D-vs-D contests must be displayed without forcing into a D/R matchup.
        compatible=len(d)==1 and len(r)==1
        found[id]={'publishedCount':count,'latest':{'pollster':firm,'date':date,'url':url if url and url.startswith('http') else POLL_DIR,'dem':d[0][1] if d else None,'rep':r[0][1] if r else None,'demCandidate':d[0][0].strip() if d else None,'repCandidate':r[0][0].strip() if r else None,'otherCandidates':[{'name':n.strip(),'party':p,'share':v} for n,p,v in independents],'compatible':compatible,'source':'PeoplesPoll NYT-sourced directory','matchup':newest,'sourcePublication':'Index latest reported survey, not all constituent polls; date refers to latest index field-end date when supplied'}}
    if len(found)<100:raise RuntimeError(f'Poll directory only parsed {len(found)} races; stop rather than claiming complete polling')
    print('POLL DIRECTORY districts',len(found),'indexed polls',sum(x['publishedCount'] for x in found.values()),flush=True)
    return found
def dedup(raw):
    found={}
    for p in raw:
        key=(re.sub(r'[^a-z0-9]','',str(p.get('pollster','')).lower()),str(p.get('date',''))[:10],round(float(p.get('dem') if p.get('dem') is not None else -1),1),round(float(p.get('rep') if p.get('rep') is not None else -1),1))
        if key not in found:found[key]=p
    return sorted(found.values(),key=lambda p:p.get('date') or '',reverse=True)
def clamp(x,lo,hi):return min(hi,max(lo,x))
def score(m):
    if m>=17:return 'Solid D'
    if m>=9:return 'Likely D'
    if m>=3:return 'Lean D'
    if m>=1.5:return 'Tilt D'
    if m<=-17:return 'Solid R'
    if m<=-9:return 'Likely R'
    if m<=-3:return 'Lean R'
    if m<=-1.5:return 'Tilt R'
    return 'Tossup'
def main():
    house=load('house/data.json');seats=house['seats'];seatmap={x['id']:x for x in seats}
    assert len(seatmap)==435
    archive=load('house/research-polls.json').get('polls',{})
    verified=load('polling/house-verified-2026-11-02.json').get('races',{})
    history=load('counties-watch/forecast-baselines.json')['states']
    yearly={};national={}
    for y in (2022,2024):yearly[y],national[y]=house_year(y,seatmap)
    directory=poll_directory(seatmap)
    # National publisher-weighted generic ballot: source shares renormalized over verified inputs.
    # 270-to-Win excluded because we do not have a separately verified comparable average.
    inputs=[{'publisher':'RealClearPolling','marginD':8.5,'weight':.40,'url':'https://www2.realclearpolitics.com/epolls/other/2026_generic_congressional_vote-8670.html'},
            {'publisher':'Decision Desk HQ','marginD':8.9,'weight':.29,'url':'https://electionsinusa.com/2026/house/forecasts/','secondary':True},
            {'publisher':'Silver Bulletin','marginD':8.9,'weight':.10,'url':'https://electionsinusa.com/2026/house/forecasts/','secondary':True}]
    generic=sum(x['marginD']*x['weight'] for x in inputs)/sum(x['weight'] for x in inputs)
    rating_count=collections.Counter(); outputs={}
    for seat in seats:
        id=seat['id'];state=seat['code'];changed=state in NEW_MAP
        years={str(y):yearly[y].get(id) for y in (2022,2024)}
        valid=[(y,yearly[y][id],.40 if y==2022 else .60) for y in (2022,2024) if yearly[y].get(id,{}).get('contested')]
        # When House returns were uncontested, prefer clearly labeled bounded history signals,
        # not a fabricated district-level numerical margin.
        bounded=False
        if valid:
            denom=sum(w for _,_,w in valid)
            normal=sum((v['margin']-national[y])*w for y,v,w in valid)/denom
            fundamental=generic+normal
        else:
            historical=[v for v in years.values() if v]
            if historical:
                dominant=sum(v['margin'] for v in historical)/len(historical)
                fundamental=clamp(dominant,-28,28)
                bounded=True
            else:
                # Explicit prior-proxy: only when neither census-period race is reported.
                old=seat.get('rating') or ''
                fundamental=(-17 if ' R' in old else 17 if ' D' in old else 0)
                bounded=True
        stateRecord=history.get(state,{})
        error=(float(stateRecord.get('pollMargin',0))-float(stateRecord.get('adjustedMargin',0))) if stateRecord else 0
        error=clamp(error,-10,10)
        # Transfer only a small share of statewide Senate calibration into House office.
        correction=-.20*error if stateRecord else 0
        fundamental+=correction
        local=[]
        source=directory.get(id,{})
        if id in archive:
            p=archive[id];local.append({'pollster':p.get('pollster'),'date':p.get('date'),'dem':p.get('dem'),'rep':p.get('rep'),'url':p.get('url'),'kind':'Archive latest survey (secondary)','source':'PeoplesPoll directory','note':p.get('sourceKind'),'compatible':True})
        for p in verified.get(id,[]):
            local.append({'pollster':p.get('pollster'),'date':p.get('date'),'dem':p.get('dem'),'rep':p.get('rep'),'url':p.get('url'),'kind':'RCP listing (publication date may differ from fieldwork)','source':'RealClearPolling','note':p.get('note'),'compatible':bool(isinstance(p.get('dem'),(int,float)) and isinstance(p.get('rep'),(int,float)))})
        newest=source.get('latest')
        if newest:
            local.append({'pollster':newest['pollster'],'date':newest['date'],'dem':newest['dem'],'rep':newest['rep'],'url':newest['url'],'kind':'NYT-compiled index latest','source':'PeoplesPoll','note':newest['sourcePublication'],'matchup':newest['matchup'],'otherCandidates':newest['otherCandidates'],'compatible':newest['compatible']})
        local=dedup(local)
        # Alaska is a multi-candidate ranked-choice contest and CA-06 has an independent.
        # Do not label Hill (I) as D or count RCV transfer/top-two polls as party ballot tests.
        if id in ('AK-01','CA-06'):
            for p in local:p['compatible']=False;p['note']=((p.get('note') or '')+' · Candidate-party mapping not comparable to a D/R general ballot; shown for context only.').strip()
        usable=[]
        for p in local:
            if not p.get('compatible') or not isinstance(p.get('dem'),(int,float)) or not isinstance(p.get('rep'),(int,float)):continue
            try:age=(TODAY-datetime.date.fromisoformat(p['date'])).days
            except:age=365
            if age<0 or age>170:continue
            if (float(p['dem'])+float(p['rep']))<60:continue
            weight=math.exp(-age/55)
            if 'RCP listing' in p.get('kind',''):weight*=.85
            if 'Archive' in p.get('kind',''):weight*=.8
            if 'Generic' in p.get('matchup',''):weight*=.75
            usable.append((p,weight))
        if usable:
            poll_avg=sum((p['dem']-p['rep'])*w for p,w in usable)/sum(w for _,w in usable)
            counts=len(usable)
            strength=clamp(.17+.13*min(counts,4),.25,.72)
            # 2024 House results may be a different map; poll data must outweigh non-comparable history.
            if changed:strength=clamp(strength+.12,.30,.80)
            if bounded:strength=clamp(strength+.15,.30,.82)
            estimate=fundamental*(1-strength)+poll_avg*strength
        else:
            poll_avg=None;strength=0;estimate=fundamental
        estimate=clamp(estimate,-50,50)
        # Uncertainty is a sensitivity spread, not a calibrated 80/90/95% confidence interval.
        width=round((7 if len(usable)>=4 else 10 if len(usable)>=2 else 13 if usable else 17)+(7 if changed else 0)+(5 if bounded else 0),1)
        rating=score(estimate)
        confidence='Low' if changed or bounded or not usable else 'Moderate' if len(usable)<3 else 'Higher (relative)'
        obj={'id':id,'state':state,'district':seat['district'],'modelRating':rating,'marginD':round(estimate,1),'uncertaintySensitivity':width,'pollEvidence':len(usable),'publishedSurveyCount':source.get('publishedCount',archive.get(id,{}).get('count',0)),'sourceRating':seat.get('rating'),'confidence':confidence,'changed2026Map':changed,'historicalProxy':bounded,'historic':years,'nationalBaselineMargins':{'2022':national[2022],'2024':national[2024]},'generic2026D':round(generic,2),'stateErrorPartialCorrection':round(correction,2),'fundamentalsD':round(fundamental,2),'pollMeanD':round(poll_avg,2) if poll_avg is not None else None,'pollWeight':round(strength,2),'surveys':local,'pollDirectoryLink':POLL_DIR,'methodNote':('Redrawn district: historical returns describe prior maps; substantial geographic mismatch risk. ' if changed else '')+('Uncontested/missing House returns: bounded historical proxy, not a comparable two-party result. ' if bounded else '')+('Recent individual polls shrink toward historical prior; only compatible D/R pairs enter the arithmetic. ' if usable else 'No usable candidate-matched recent district polls; rating is historical/generic-ballot estimate only. ')}
        outputs[id]=obj;rating_count[rating]+=1
    if len(outputs)!=435:raise RuntimeError('House count invalid')
    result={'asOf':'2026-11-02','label':'Ervin House — provisional district scenario','scope':'435 districts. Model outputs are heuristic sensitivity estimates, not validated race calls or win probabilities. Changed 2026 district maps use older returns as imperfect reference only.','method':{'formula':'House 2022/2024 D-R vs respective national House margin (40/60 weight), plus 2026 publisher-weighted generic ballot; subtract 20% of applicable statewide Senate-style error (when present), shrink any available compatible district surveys toward history by observed evidence, bound data-poor and uncontested proxies.','genericBallot':{'demMargin':round(generic,2),'inputs':inputs,'note':'Publication date November 2; secondary DDHQ/Silver values from attributed October 30 summary. 270toWin omitted rather than invent an average.'},'historicalReturns':{'source':'MIT Election Data and Science Lab 1976–2024, public domain via electiondata.dev','url':'https://electiondata.dev/datasets/house-results/','years':[2022,2024],'nationalMarginsD':{str(y):national[y] for y in national}},'polling':{'source':'The New York Times CC BY 4.0 polling index as summarized at PeoplesPoll; original linked releases; RCP latest polls','url':POLL_DIR,'note':'Archive shows only subset of all published surveys; a published survey count is not the number of rows displayed.'},'specialCaveat':'Alaska ranked-choice and top-two/all-party California contests require contest-specific interpretation. Margins only compare identifiable D and R survey respondents; model cannot simulate RCV transfer or same-party elections.','redrawnStates':sorted(NEW_MAP),'redrawSource':'https://ballotpedia.org/Redistricting_ahead_of_the_2026_elections','uncertainty':'Sensitivity width in margin points, not calibrated probability/confidence interval.'},'summary':{'districts':435,'modeledCount':len(outputs),'ratings':dict(rating_count),'districtsWithPollRows':sum(bool(x['surveys']) for x in outputs.values()),'districtsWithComparablePolls':sum(x['pollEvidence']>0 for x in outputs.values()),'indexedPublishedSurveys':sum(x['publishedSurveyCount'] for x in outputs.values()),'changedMapDistricts':sum(x['changed2026Map'] for x in outputs.values()),'historicalProxyDistricts':sum(x['historicalProxy'] for x in outputs.values())},'races':outputs}
    write('house/ervin-forecast-2026-11-02.json',result)
    print('HOUSE FORECAST COMPLETE',json.dumps(result['summary']),flush=True)
    for id in ('MI-07','MI-10','TX-34','CA-22','NY-17','AK-01'):
        print('CASE',id,json.dumps({k:outputs[id][k] for k in ('modelRating','marginD','pollEvidence','publishedSurveyCount','confidence','changed2026Map')}),flush=True)
if __name__=='__main__':main()
