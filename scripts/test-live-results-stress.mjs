#!/usr/bin/env node
/* Election-night failure-injection/throughput tests; all totals synthetic and test-only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const req=createRequire(import.meta.url),engine=req('../election-night/returns-core.js');
const now=Date.parse('2026-11-04T03:15:00Z');
const candidates=(d=100,r=90)=>[{name:'Dem candidate',votes:d,party:'D'},{name:'Rep candidate',votes:r,party:'R'}];
const make=(key='MI-SENATE',time='2026-11-04T02:04:00Z',d=100,r=90)=>({version:1,election:'2026-11-03',
 races:{[key]:{source:'civicAPI',verified:true,election:'2026-11-03',
 office:key.endsWith('SENATE')?'senate':key.endsWith('GOVERNOR')?'governor':'house',
 total:d+r,candidates:candidates(d,r),asOf:time,sourceUrl:'https://civicapi.org/api/v2/race/12345'}}});
assert.equal(Object.keys(engine.closeByState).length,50,'Every state must have a race deadline');
assert.equal(engine.closeAt('GA-SENATE','Senate'),Date.parse('2026-11-04T00:00:00Z'),'Georgia 7 pm ET');
assert.equal(engine.closeAt('FL-27','House'),Date.parse('2026-11-04T00:00:00Z'),'Florida Miami-Dade congressional 7 pm ET');
assert.equal(engine.closeAt('MI-SENATE','Senate'),Date.parse('2026-11-04T01:00:00Z'),'Michigan first statewide reporting begins at 8 pm ET');
assert.equal(engine.closeAt('KY-SENATE','Senate'),Date.parse('2026-11-03T23:00:00Z'),'Kentucky first statewide reporting begins at 6 pm ET');
assert.equal(engine.closeAt('TX-18','House'),Date.parse('2026-11-04T01:00:00Z'),'Texas Houston 7pm CST = 8pm ET');
assert.equal(engine.closeAt('KY-06','House'),Date.parse('2026-11-03T23:00:00Z'),'Eastern KY 6pm');
for(const id of ['IN-02','IN-03','IN-04','IN-05','IN-06','IN-07','IN-09','KY-03','KY-04','KY-05','KY-06'])
 assert.equal(engine.closeAt(id,'House'),Date.parse('2026-11-03T23:00:00Z'),id+' entirely Eastern and closes at 6 p.m.');
for(const id of ['IN-01','IN-08','KY-01','KY-02'])
 assert.equal(engine.closeAt(id,'House'),Date.parse('2026-11-04T00:00:00Z'),id+' must await last Central time polling places');

assert.equal(engine.canonical('AK-AL','House'),'AK-01');
assert.equal(engine.canonical('CA-11','Senate'),null);
assert.equal(engine.canonical('AA-06','House'),null);
const early=make();early.races['MI-SENATE'].asOf='2026-11-04T00:58:00Z';
assert.equal(Object.keys(engine.civic(early,now)).length,0,'No preclose votes from CivicAPI');
assert.equal(Object.keys(engine.civic(make(),now)).length,1,'Accept normalized after close result');
assert.equal(Object.keys(engine.civic(make('FL-27','2026-11-03T23:59:59Z'),now)).length,0,'Reject early Florida source');
assert.equal(Object.keys(engine.civic(make('FL-27','2026-11-04T00:00:01Z'),now)).length,1,'Florida district after 7pm ET valid');
assert.equal(Object.keys(engine.civic(make('GA-SENATE','2026-11-04T00:03:00Z'),now)).length,1,'Georgia 7pm must not be suppressed by an 8pm nationwide gate');
for(const [label,mutate] of [
 ['wrong election',r=>r.election='2024-11-05'],
 ['not verified',r=>r.verified=false],
 ['wrong provider',r=>r.source='other'],
 ['bad timestamp',r=>r.asOf='2026-11-04T04:00:00Z'],
 ['non-HTTPS',r=>r.sourceUrl='javascript:alert(1)'],
 ['negative total',r=>r.total=-1],
 ['excess total',r=>r.total+=1000],
 ['wrong office',r=>r.office='house'],
 ['invalid candidate vote',r=>r.candidates[0].votes=NaN],
 ['duplicate candidate name',r=>r.candidates[1].name=r.candidates[0].name],
 ]){
 const p=make();mutate(p.races['MI-SENATE']);assert.equal(Object.keys(engine.civic(p,now)).length,0,'Fail closed: '+label);
}
const ambiguous=make();
ambiguous.races['MI-SENATE'].candidates=[{name:'A',votes:110,party:'D'},{name:'B',votes:80,party:'D'}];
assert.equal(Object.keys(engine.civic(ambiguous,now)).length,1,'Same-party candidates are accepted as vote reports without inventing opposition');
const tooMany=make();for(let n=0;n<1201;n++)tooMany.races['MI-'+(100+n)]={};
assert.equal(Object.keys(engine.civic(tooMany,now)).length,0,'Reject oversized provider feeds');
const OA={api:1,year:2026,office:'Senate',as_of:'2026-11-04T02:05:00Z',
 races:{MI:{total:190,cands:[{n:'Dem candidate',v:100,p:'D'},{n:'Rep candidate',v:90,p:'R'}]}}};
const od=engine.openAmerica(OA,'Senate',now);
assert.equal(od['MI-SENATE']?.total,190,'Accept attributed source once polls close');
const special={...OA,races:{'FL-special':{total:200,cands:[{n:'Angie Nixon',v:85,p:'D'},{n:'Ashley Moody',v:115,p:'R'}]},'OH-special':{total:150,cands:[{n:'Sherrod Brown',v:70,p:'D'},{n:'Jon Husted',v:80,p:'R'}]}}};
const specialResults=engine.openAmerica(special,'Senate',now);
assert.equal(specialResults['FL-SENATE']?.total,200,'Florida special Senate seat must be recognized by backup source');
assert.equal(specialResults['OH-SENATE']?.total,150,'Ohio special Senate seat must be recognized by backup source');
const cid=engine.civic(make(),now);
const civicPreferred=engine.preferCivic(cid,od);
assert.equal(civicPreferred.races['MI-SENATE'].source,'CivicAPI (provider-verified schema)','Fresh Civic should be primary');
const civicBehind=engine.civic(make('MI-SENATE','2026-11-04T02:03:00Z',60,60),now);
const preferFallback=engine.preferCivic(civicBehind,od);
assert.equal(preferFallback.races['MI-SENATE'].source,'Open America / state reporting mirror','CivicAPI with lower vote count must defer to verified newer provider');
let merged=engine.reconcile([cid,od]);
assert.equal(Object.keys(merged.races).length,1,'Do not double count overlapping result providers');
assert.equal(merged.races['MI-SENATE'].total,190);
const backwards=engine.civic(make('MI-SENATE','2026-11-04T02:10:00Z',80,60),now);
merged=engine.reconcile([backwards],merged.races);
assert.equal(merged.races['MI-SENATE'].total,190,'Declining total needs review');
assert(merged.warnings.some(x=>x.includes('rollback')));
const up=engine.civic(make('MI-SENATE','2026-11-04T02:12:00Z',110,95),now);
merged=engine.reconcile([up],merged.races);
assert.equal(merged.races['MI-SENATE'].total,205);
const stale=engine.civic(make('MI-SENATE','2026-11-04T02:04:00Z'),now);
merged=engine.reconcile([stale],merged.races);
assert.equal(merged.races['MI-SENATE'].total,205);
const since=performance.now();let count=0,last={},warnings=0;
// Thousands of simulated Election Night provider changes: no same-race double counting.
for(let i=0;i<10000;i++){
 const p=make('MI-SENATE','2026-11-04T02:12:00Z',1000+i,900+i);
 const r=engine.civic(p,now),a=engine.reconcile([r],last);last=a.races;warnings+=a.warnings.length;count++;
}
assert.equal(Object.keys(last).length,1);
assert.equal(last['MI-SENATE'].total,21898);
const elapsed=+(performance.now()-since).toFixed(1);
const all=JSON.parse(fs.readFileSync('house/data.json','utf8')).seats;
assert.equal(all.length,435);
for(const r of all)assert(engine.canonical(r.id,'House')===r.id,'House key not canonical: '+r.id);
const finalTime='2026-11-04T07:05:00Z',finalNow=Date.parse('2026-11-04T08:00:00Z');
const national={version:1,election:'2026-11-03',races:{}},mirror={api:1,year:2026,office:'House',as_of:finalTime,races:{}};
for(const district of all){
 const votes=candidates(140,130);
 national.races[district.id]={source:'civicAPI',verified:true,election:'2026-11-03',office:'house',asOf:finalTime,sourceUrl:'https://civicapi.org/api/v2/race/12345',total:270,candidates:votes};
 mirror.races[district.id]={total:270,cands:[{n:'Dem candidate',v:140,p:'D'},{n:'Rep candidate',v:130,p:'R'}]};
}
const massiveCivic=engine.civic(national,finalNow),massiveOA=engine.openAmerica(mirror,'House',finalNow);
assert.equal(Object.keys(massiveCivic).length,435,'Civic must parse 435 simultaneous district reports');
assert.equal(Object.keys(massiveOA).length,435,'Mirror must parse 435 simultaneous district reports');
const overlap=engine.reconcile([massiveCivic,massiveOA]);
assert.equal(Object.keys(overlap.races).length,435,'Overlapping mirrors must not double county or district totals');
assert.equal(Object.values(overlap.races).reduce((n,x)=>n+x.total,0),435*270,'No vote inflation through same-source duplicates');
const html=fs.readFileSync('election-night/index.html','utf8'),nightJS=fs.readFileSync('election-night/night.js','utf8'),stateHtml=fs.readFileSync('state/index.html','utf8'),stateJS=fs.readFileSync('state/app.js','utf8');
const homeJS=fs.readFileSync('scripts/home-election-2026.js','utf8');
const collectorWorkflow=fs.readFileSync('.github/workflows/civicapi-probe.yml','utf8');
assert(homeJS.includes("setInterval(()=>{if(!document.hidden)refreshResults()},60000)"),'Live homepage must check all offices every 60 seconds');
assert(homeJS.includes('Date.now()-lastExternalFetch>=55000'),'All three backup office sources must be checked each active minute, accounting for timer jitter');
assert(nightJS.includes("setInterval(()=>{if(!document.hidden)Promise.allSettled([refreshNational(),refreshCounty()])},60000)"),'National and county results desk must refresh every 60 seconds');
assert(collectorWorkflow.includes("cron: '3-58/5 0-9 4 11 *'")&&collectorWorkflow.includes("cron: '3-58/5 23 3 11 *'"),'Election-night upstream collection must run at GitHub Actions maximum supported scheduled frequency');
assert(html.includes('returns-core.js')&&html.includes('id="nightStateFilter"'));
assert(html.includes('civicReportingStatus')&&nightJS.includes('core.reconcile'));
assert(stateHtml.includes('data-election-night-state')&&stateJS.includes("querySelectorAll('[data-election-night-state]')"));
assert(!stateHtml.includes('href="#stateResults">Election night'),'Old results panel incorrectly labeled live election night');
assert(!html.includes('href="../state/?state=MI#stateResults"'),'Old panel link reintroduced');
console.log('ELECTION NIGHT STRESS PASS',JSON.stringify({states:50,districts:435,syntheticProviderUpdates:count,parallelHouseRaces:435,elapsedMs:elapsed,duplicateSourcesAdded:0,rollbacksHeld:true,precloseLeakage:false}));
