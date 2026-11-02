#!/usr/bin/env node
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const engine=require('./statewide-ervin.js');
const archive=read('research/original-ervin-senate-calibration-2026-11-02.json'),governors=read('governors/data.json'),senate=read('counties-watch/forecast-baselines.json');
const historical=read('research/calibration_events_2016_2024.json');
const out=engine.apply(archive,governors,senate);
assert.equal(out.governor.length,36);assert.equal(out.senate.length,17);
assert.equal(out.summary.withPublishedPolling,33);
assert.equal(out.summary.adjustedGovernorRaces,11,'Only comparable Original Ervin Senate state corrections transfer to governor');
assert.equal(Object.keys(archive.senateStates).length,17);
assert(historical.events.some(e=>e.year===2016)&&historical.events.some(e=>e.year===2024),'Historical scope must include 2016–24');
for(const r of out.governor){
 const original=archive.senateStates[r.code];
 const eligible=original&&original.historyMode==='standard'&&Number.isFinite(original.correction);
 const raw=r.poll?.margin;
 assert.equal(r.model.correction,eligible?original.correction:null,'Original Ervin source mismatch '+r.code);
 assert.equal(r.model.adjustedMargin,eligible&&Number.isFinite(raw)?+(raw-original.correction).toFixed(2):null,'Original correction math incorrect '+r.code);
 assert(r.model.events.every(e=>e.year>=2016&&e.year<=2024),'Historical leak '+r.code);
 if(!eligible)assert(r.model.fallback&&r.model.adjustedMargin===null,'Cannot invent unverified Original Ervin correction '+r.code);
}
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
assert(html.includes('href="../michigan/election-night/"'),'Original Michigan detailed source hub not linked');
assert(js.includes('if(upcoming())'),'Premature live vote guard absent');
console.log('STATEWIDE & NATIONAL ELECTION NIGHT QA PASS',JSON.stringify({governors:out.governor.length,governorWithPoll:out.summary.withPublishedPolling,stateSpecificHistory:out.summary.stateErrorHistory, originalAdjustments:out.summary.adjustedGovernorRaces,senateOriginalUnchanged:out.senate.length,house:435,michiganCounties:geo.features.length,events:historical.events.length}));
