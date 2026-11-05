#!/usr/bin/env python3
"""Ervin House: reproducible, model-only 435-district election desk.
References: MEDSL CC0 2022/2024 House results; PeoplesPoll NYT CC-BY-4.0
published survey index; existing Ervin state historical adjustments.
This is not a validated election probability model. Do not conflate 2024 with redrawn 2026 maps.
"""
import json, re, math, sys, collections, datetime, time, urllib.request, csv, io
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
TODAY=datetime.datetime.now(datetime.timezone.utc).date()
NEW_MAP={'AL','CA','FL','LA','NC','OH','TN','TX','UT'}
HEADERS={'User-Agent':'ErvinModelResearch/1.0 (+https://github.com/TheStateDesk/thestatedesk.github.io; public election research)','Accept':'application/json,text/html,*/*'}
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
def house_poll_questions(seats):
    """Preserve one row per published candidate matchup, including alternate ballot questions.
    These are *not* independently verified original poll releases and are not model inputs.
    Same poll_id can appear multiple times with alternate candidate combinations.
    """
    url='https://raw.githubusercontent.com/ElectIndex/26_us_forecast_data/main/race_polls.csv'
    csv_text=download(url).decode('utf-8-sig','replace')
    reader=csv.DictReader(io.StringIO(csv_text))
    archive=collections.defaultdict(list)
    for row in reader:
        id=str(row.get('race_code') or '')
        if id not in seats or not re.fullmatch('[A-Z]{2}-[0-9]{2}',id):continue
        date=str(row.get('end_date') or '').strip()
        if not re.fullmatch('202[56]-[01][0-9]-[0-3][0-9]',date):continue
        try:
            shares={k:(float(row[k]) if row.get(k) not in ('',None) else None) for k in ('dem','rep','oth','dem2','rep2')}
            size=int(float(row.get('n') or 0))
        except (ValueError,TypeError):continue
        p={'pollId':row.get('poll_id') or None,'pollster':(row.get('pollster') or '').strip(),
            'date':date,'sampleSize':size if size>0 else None,
            'dem':shares['dem'],'rep':shares['rep'],'demCandidate':(row.get('dem_name') or '').strip(),
            'repCandidate':(row.get('rep_name') or '').strip(),
            'otherShare':shares['oth'],'otherParty':(row.get('oth_party') or '').strip(),
            'otherCandidate':(row.get('oth_name') or '').strip(),'dem2':shares['dem2'],'rep2':shares['rep2'],
            'rating':row.get('rating') or None,'lean':row.get('lean') or None,
            'sourceUrl':'https://github.com/ElectIndex/26_us_forecast_data/blob/main/race_polls.csv',
            'source':'ElectIndex question-level NYT poll compilation','usedInErvinModel':False,
            'caution':'One row is a matchup/question, not an independent poll. Multiple rows can share pollId. Candidate names and party labels are taken from archived source, and sample, dates and methodology require original-release verification.'}
        if p['pollster']:archive[id].append(p)
    for key in archive:
        archive[key].sort(key=lambda x:(x['date'],x['pollster']),reverse=True)
    total=sum(len(v) for v in archive.values())
    distinct=sum(len({p['pollId'] for p in v if p['pollId']}) for v in archive.values())
    if total<400 or len(archive)<100:raise RuntimeError(f'House question archive parsed only {total} rows across {len(archive)} races, refusing partial import')
    output={'asOf':TODAY.isoformat(),'title':'House survey question archive · historical and current',
        'source':'ElectIndex public dataset, compiled from New York Times polling index','sourceUrl':'https://github.com/ElectIndex/26_us_forecast_data/blob/main/race_polls.csv',
        'sourceAttribution':'NYT polling-index compilation; CC BY 4.0 attribution claimed by source directory. Cross-check pollster original releases for individual poll methodology.',
        'note':'Question-level evidence, not unique independent surveys. Multiple hypothetical matchups from a single pollId must never be counted as independent polls. These supplemental questions are displayed for research only, not used in Ervin House margin calculation. Some records date to 2025.',
        'summary':{'districts':len(archive),'pollQuestionRows':total,'distinctPollIds':distinct},
        'races':dict(archive)}
    write('house/poll-questions-2026-11-02.json',output)
    print('HOUSE QUESTION ARCHIVE',json.dumps(output['summary']),flush=True)
    return output

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
    yearly={};national={}
    for y in (2022,2024):yearly[y],national[y]=house_year(y,seatmap)
    directory=poll_directory(seatmap)
    house_poll_questions(seatmap)
    # External, dated publisher-specific election-day input: never silently
    # relabel yesterday's averages as today's or manufacture an absent source.
    generic_source=load('polling/generic-ballot-2026.json')
    assert generic_source.get('election')=='2026-11-03' and generic_source.get('asOf')
    inputs=generic_source['inputs']
    assert len(inputs)>=2 and all(isinstance(x.get('marginD'),(int,float)) and
        abs(x['marginD'])<=40 and x.get('asOf') and x.get('url','').startswith('https://')
        and 0<x.get('weight',0)<=1 for x in inputs), 'Generic ballot source contract invalid'
    generic=sum(x['marginD']*x['weight'] for x in inputs)/sum(x['weight'] for x in inputs)
    pres_archive=load('house/presidential-2026-boundaries.json')
    selected=load('research/house-presidential-backtest-2026.json')
    assert len(pres_archive['races'])==435 and selected['training']['n']>=600 and selected['finalHoldout']['n']>=180
    alpha=float(selected['forward2026']['alpha'])
    national_pres=selected['forward2026']['presidentialNationalMarginD']
    rho=float(selected['forward2026']['candidateRetentionRho'])
    actual2024=load('research/house-actual-2016-2024.json')['years']['2024']
    hist_pres2022=load('research/house-presidential-historical.json')['cycles']['2022']
    current_roster=load('house/candidates-2026.json')['races']
    rating_count=collections.Counter(); outputs={}
    for seat in seats:
        id=seat['id'];state=seat['code'];changed=state in NEW_MAP
        years={str(y):yearly[y].get(id) for y in (2022,2024)}
        pres=pres_archive['races'][id]
        if bool(pres['redrawn2026']) != changed:
            raise RuntimeError('Incompatible 2026 presidential map status for '+id)
        if not all(isinstance(pres.get(k),(int,float)) for k in ('pres24MarginD','pres20MarginD')):
            raise RuntimeError('Unavailable current-map presidential baseline '+id)
        lean=.75*(pres['pres24MarginD']-float(national_pres['2024']))+.25*(pres['pres20MarginD']-float(national_pres['2020']))
        fundamental=generic+alpha*lean
        candidate_term=0.
        # A candidate-repeat term was fitted in 2018 and verified on the
        # chronological 2024 holdout. Use ONLY named incumbent candidates
        # repeating after a comparable previous House election.
        if not changed and state not in ('GA','NY'):
            old=actual2024.get(id)
            oldpres=hist_pres2022.get(id)
            nominees=current_roster.get(id,{}).get('candidates',[])
            if old and old['contested'] and oldpres and old['winnerParty'] in ('D','R'):
                p=old['winnerParty']
                previous_name=old['candidates'].get(p)
                repeat=any(c.get('incumbent') and c.get('party')==p
                  and re.sub(r'[^a-z]+','',c.get('name','').lower())==previous_name
                  for c in nominees)
                if repeat:
                    old_lean=.75*(oldpres['pres20MarginD']-4.54)+.25*(oldpres['pres16MarginD']-2.23)
                    old_prior=-.3+alpha*old_lean
                    delta=clamp(old['marginD']-old_prior,-18,18)
                    candidate_term=round(rho*delta,3)
                    fundamental+=candidate_term
        bounded=not pres['mapVerified']
        # The House-only prior uses 2026-map presidential votes, not the
        # prior district-number's 2022/2024 House votes nor statewide Senate
        # polling errors. Historical House votes remain visible for context.
        correction=0.0
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
        # Historical 2024 held-out margin error plus extra uncertainty on
        # reconstructed presidential allocations for redrawn 2026 districts.
        width=round(max(float(selected['backtested']['holdout2024']['p90AE']),
            7 if len(usable)>=4 else 10 if len(usable)>=2 else 13 if usable else 17)
            +(8 if changed else 0),1)
        special=id in ('AK-01','CA-06')
        rating=(seat.get('rating') or 'Tossup') if special else score(estimate)
        confidence=('Qualitative ballot exception' if special else
            'Low · reconstructed 2026 district' if changed else
            'Moderate · congressional presidential evidence')
        if special:estimate=None
        obj={
          'id':id,'state':state,'district':seat['district'],
          'modelRating':rating,'marginD':round(estimate,1) if estimate is not None else None,
          'uncertaintySensitivity':width,'pollEvidence':len(usable),
          'publishedSurveyCount':source.get('publishedCount',archive.get(id,{}).get('count',0)),
          'sourceRating':seat.get('rating'),'confidence':confidence,
          'ratingBasis':('Cook qualitative only: special election ballot' if special else
               'House-only presidential 2026 district lean + dated generic ballot + compatible polls'),
          'numericModelWithheld':special,'changed2026Map':changed,'historicalProxy':bounded,
          'historic':years,'nationalBaselineMargins':{'2022':national[2022],'2024':national[2024]},
          'presidentialBaseline':{'pres2024MarginD':pres['pres24MarginD'],'pres2020MarginD':pres['pres20MarginD'],
             'national2024MarginD':float(national_pres['2024']),
             'national2020MarginD':float(national_pres['2020']),
             'districtLeanD':round(lean,3),
             'estimatedVoteAllocation':not pres['mapVerified'],
             'method24':pres['method24'],'method20':pres['method20'],
             'sourceUrl':pres_archive['sourceUrl']},
          'historicalModelCoefficient':alpha,
          'candidateEffectD':candidate_term,'candidateRetentionRho':rho,
          'candidateSource':('Returning 2024 winning House candidate, same prior boundaries' if candidate_term else 'No validated comparable candidate residual'),
          'generic2026D':round(generic,2),'stateErrorPartialCorrection':0,
          'fundamentalsD':round(fundamental,2),
          'pollMeanD':round(poll_avg,2) if poll_avg is not None else None,
          'pollWeight':round(strength,2),'surveys':local,'pollDirectoryLink':POLL_DIR,
          'methodNote':('2026 REDRAW: 2024 presidential votes were RECONSTRUCTED for new district lines from precinct/block allocations, not officially certified as district voting. The 2022/2024 House votes under the same district number describe other voters and are research context only. ' if changed else
             'District lines correspond to the 2026 ballot, with presidential vote allocations estimated from published historical election data. ')
          +('Special candidate ballot: Cook qualitative rating only; no comparable D/R contest margin or RCV transfer forecast. ' if special else
             'The House-only presidential lean coefficient '+str(alpha)+' was trained with 2018/2022 and checked on 2024 held-out contests. ')
          +'No cross-office Senate/Governor error transfer; returning incumbent candidate effects enter only when same-line prior House votes and names match the 2018-trained, 2024-validated candidate test. Comparable district polls may modify this baseline.'
        }
        outputs[id]=obj;rating_count[rating]+=1
    if len(outputs)!=435:raise RuntimeError('House count invalid')
    result={
      'asOf':TODAY.isoformat(),
      'label':'Ervin House · 2026 congressional district evidence',
      'scope':'All 435 districts with current 2026 voting boundaries where changed. 433 comparable congressional D/R numerical scenarios; AK ranked-choice and CA-06 independent contest show only sourced Cook ratings. The 173 new-map presidential allocations are reconstructed estimates and have extra uncertainty, not certified 2026 election counts.',
      'method':{
        'formula':'House D−R estimate = dated national generic House polling + past-only selected alpha × [0.75 × (2024 district presidential D−R − national 2024 D−R) + 0.25 × (2020 district presidential D−R − national 2020 D−R)], blended only with candidate-compatible House district surveys. Same office, same formula scored on 2018/2022, chronological 2024 holdout. No Senate/Governor historical errors.',
        'office':'House only','pastOnlyAlpha':alpha,
        'backtestSource':'research/house-presidential-backtest-2026.json',
        'holdout2024':selected['backtested']['holdout2024'],
        'genericBallot':{
            'demMargin':round(generic,2),'asOf':generic_source['asOf'],'inputs':inputs,
            'note':'Source dates independently retained. A build is NOT proof of a new publisher reading; unattributed secondary DDHQ remains flagged.'},
        'historicalReturns':{
            'source':'MIT Election Data and Science Lab House results via electiondata.dev, public-domain source records',
            'url':'https://electiondata.dev/datasets/house-results/',
            'years':[2022,2024],'nationalMarginsD':{str(y):national[y] for y in national}},
        'presidentialCurrentMap':{
            'source':pres_archive['source'],'url':pres_archive['sourceUrl'],
            'notes':pres_archive['notes']},
        'polling':{
            'source':'NYT-compiled district index at PeoplesPoll and independently sourced RealClearPolling listings',
            'url':POLL_DIR},
        'redrawnStates':sorted(NEW_MAP),
        'redrawSource':'https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.html',
        'uncertainty':'Sensitivity width. 2024 heldout empirical MAE and P90 apply to comparable contested districts; new-map reconstructed presidential vote allocations have additional uncertainty and do NOT constitute a calibrated 2026 CI.',
        'specialCaveat':'AK ranked-choice and CA-06 independent/same-party contests require different ballot modeling. Cook qualitative only for these, no invented two-party margin.'},
      'summary':{
        'districts':435,'modeledCount':sum(isinstance(x['marginD'],(float,int)) for x in outputs.values()),
        'ratings':dict(rating_count),
        'districtsWithPollRows':sum(bool(x['surveys']) for x in outputs.values()),
        'districtsWithComparablePolls':sum(x['pollEvidence']>0 for x in outputs.values()),
        'indexedPublishedSurveys':sum(x['publishedSurveyCount'] for x in outputs.values()),
        'changedMapDistricts':sum(x['changed2026Map'] for x in outputs.values()),
        'redrawnCookRated':sum(x['changed2026Map'] and bool(x['sourceRating']) for x in outputs.values()),
        'redrawnUnrated':0,
        'presidentialEstimatedDistricts':sum(x['presidentialBaseline']['estimatedVoteAllocation'] for x in outputs.values()),
        'qualitativeOnly':sum(x['marginD'] is None for x in outputs.values()),
        'historicalProxyDistricts':sum(x['historicalProxy'] for x in outputs.values())},
      'races':outputs
    }
    write('house/ervin-forecast-2026-11-02.json',result)
    print('HOUSE FORECAST COMPLETE',json.dumps(result['summary']),flush=True)
    for id in ('MI-07','MI-10','TX-34','CA-22','NY-17','AK-01'):
        print('CASE',id,json.dumps({k:outputs[id][k] for k in ('modelRating','marginD','pollEvidence','publishedSurveyCount','confidence','changed2026Map')}),flush=True)
if __name__=='__main__':main()
