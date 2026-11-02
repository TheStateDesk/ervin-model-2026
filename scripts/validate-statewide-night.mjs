#!/usr/bin/env node
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const prior=require('./governor-backtest.js');
const engine=require('./statewide-ervin.js');
const archive=read('research/governor-same-office-2014-2024.json'),governors=read('governors/data.json'),senate=read('counties-watch/forecast-baselines.json');
const historical=read('research/calibration_events_2016_2024.json');
const out=engine.apply(archive,governors,senate);
assert.equal(out.governor.length,36);assert.equal(out.senate.length,17);
assert.equal(out.summary.withPublishedPolling,33);
assert.equal(out.summary.adjustedGovernorRaces,19,'Only 19 currently verified governor-only state corrections are available');
assert.equal(archive.races.length,35);
assert(archive.races.every(e=>e.year>=2018),'2014 governor rows still active');
assert(historical.events.some(e=>e.year===2016)&&historical.events.some(e=>e.year===2024),'Historical scope must include 2016–24');
for(const r of out.governor){
 const c=prior.correction(archive.races,r.code,2026);
 const raw=r.poll?.margin;
 assert.equal(r.model.correction,c?.value??null,'Governor-only source mismatch '+r.code);
 assert.equal(r.model.adjustedMargin,c&&Number.isFinite(raw)?+(+(raw-c.value).toFixed(2)+r.model.candidateShift).toFixed(2):null,'Governor error plus candidate context mismatch '+r.code);
 assert(r.model.events.every(e=>e.year<2026&&e.year>=2018&&e.office==='Governor'),'Federal or future governor evidence leaked '+r.code);
 if(!c)assert(r.model.fallback&&r.model.adjustedMargin===null,'Unknown governor history must not create 2026 estimate '+r.code);
}
const ohio=out.governor.find(x=>x.code==='OH');assert.equal(ohio.model.pollMargin,5.4);assert(ohio.model.candidateShift>2&&ohio.model.candidateShift<3);assert(ohio.model.adjustedMargin>0&&ohio.model.adjustedMargin<4);assert.equal(ohio.model.adjustedMargin,2.57,'Ohio prediction must not silently revert to R +0.0');
for(const ss of out.senate)assert.equal(ss.model.adjustedMargin,senate.states[ss.code].adjustedMargin,'Original Senate model changed '+ss.code);
const geo=read('geo/counties/MI.json');assert.equal(geo.features.length,83);
const manual=read('michigan/election-night/county_totals.json'),auto=read('michigan/election-night/county_auto.json'),precincts=read('michigan/election-night/results.json');
for(const f of [manual,auto,precincts])assert.equal(f.election,'2026-11-03');
const html=fs.readFileSync('election-night/index.html','utf8'),js=fs.readFileSync('election-night/night.js','utf8'),state=fs.readFileSync('state/app.js','utf8'),main=fs.readFileSync('index.html','utf8'),states=fs.readFileSync('states/index.html','utf8');
for(const id of ['miCountyMap','miCountyRows','miInspector','miD','miR','raceList','feedStatus','refreshResults','miForecast'])assert(html.includes('id="'+id+'"'),'National desk missing '+id);
assert(js.includes('countyOfficial')&&js.includes('countyAuto')&&js.includes('precinctRows')&&js.includes('countyOfficial.set')&&js.includes('countyAuto.set'),'Missing county precedence');
assert(js.includes('last')||js.includes('date('));
assert(state.includes('governorErvin')&&state.includes('window.ERVIN_STATEWIDE.apply'),'State desk does not use governor method');
assert(!states.includes('>Model lab</a>')&&!main.includes('>Polling research lab</a>'),'Old model-lab navigation still exposed');
assert(html.includes('href="../state/?state=MI#stateResults"'),'National election desk must link to consolidated Michigan results');
assert(!html.includes('href="../michigan/election-night/"'),'Legacy Michigan results hub remains in national election desk');
assert(js.includes('if(upcoming())'),'Premature live vote guard absent');
console.log('STATEWIDE & NATIONAL ELECTION NIGHT QA PASS',JSON.stringify({governors:out.governor.length,governorWithPoll:out.summary.withPublishedPolling,stateSpecificHistory:out.summary.stateErrorHistory, originalAdjustments:out.summary.adjustedGovernorRaces,senateOriginalUnchanged:out.senate.length,house:435,michiganCounties:geo.features.length,events:historical.events.length}));
