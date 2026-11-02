#!/usr/bin/env node
// Ervin Model static release gate. No internet or external npm dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const root=process.cwd();
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(file(p));
const expected=50;
const geographicStates=new Map();
const report={states:0,counties:0,congressionalDistricts:0,housePollDistricts:0,governorPollStates:0,scripts:0,assets:0};
for(let i=1;i<=10;i++){
 const pack=json('geo/packs/p'+String(i).padStart(2,'0')+'.json');
 assert.equal(pack.type,'StateBundle','Invalid geographic bundle type');
 for(const [code,entry] of Object.entries(pack.states||{})){
  assert(!geographicStates.has(code),'Duplicate geographic state '+code);
  assert.equal(entry.counties.state,code);
  assert.equal(entry.districts.state,code);
  assert(entry.counties.features.length,'No county shapes in '+code);
  const ids=new Set();
  for(const feat of entry.counties.features){
   assert(/^\d{5}$/.test(String(feat.id)),code+' county without 5-digit FIPS');
   assert(!ids.has(String(feat.id)),code+' duplicate county FIPS '+feat.id);
   ids.add(String(feat.id));
   assert(['Polygon','MultiPolygon'].includes(feat.geometry?.type),code+' invalid county geometry');
  }
  const validDs=entry.districts.features.filter(f=>/^\d{1,2}$/.test(String(f.id)));
  const uniqueDs=new Set(validDs.map(f=>String(f.id).padStart(2,'0')));
  assert.equal(validDs.length,uniqueDs.size,code+' duplicate congressional district');
  geographicStates.set(code,{counties:entry.counties.features.length,districts:validDs.length,districtIds:uniqueDs});
 }
}
const alaska=json('geo/districts/AK.json'),akCounties=json('geo/counties/AK.json');
assert.equal(alaska.state,'AK');assert.equal(akCounties.state,'AK');
geographicStates.set('AK',{counties:akCounties.features.length,districts:1,districtIds:new Set(['01'])});
assert.equal(geographicStates.size,expected,'Incomplete 50-state mapping coverage');
const house=json('house/data.json'),seats=house.seats||[];
assert.equal(seats.length,435,'House directory must contain 435 seats');
const byState=new Map(),ids=new Set();
for(const seat of seats){
 assert(!ids.has(seat.id),'Duplicate House district '+seat.id);
 ids.add(seat.id);
 const shape=geographicStates.get(seat.code);
 assert(shape,'House district has no geographic state '+seat.code);
 const num=String(seat.district).padStart(2,'0');
 assert(shape.districtIds.has(num),'Missing House district geometry '+seat.id+' ('+num+')');
 byState.set(seat.code,(byState.get(seat.code)||0)+1);
}
for(const [code,g] of geographicStates){
 assert.equal(g.districts,byState.get(code)||0,code+' expected all House district polygons to match the seat index');
 report.counties+=g.counties;
 report.congressionalDistricts+=g.districts;
}
report.states=geographicStates.size;
const historical=json('geo/county-history.json');
assert(Object.keys(historical.counties||{}).length>=3000,'National county historical coverage unexpectedly small');
assert(Object.keys(historical.counties||{}).filter(f=>f.startsWith('48')).length===254,'Texas 2024 county history incomplete');
const housePolls=json('house/research-polls.json').polls||{};
for(const [key,p] of Object.entries(housePolls)){
 assert(ids.has(key),'Unknown House polling seat '+key);
 assert(Number.isFinite(p.dem)&&Number.isFinite(p.rep)&&Number.isFinite(p.margin),'Non-numeric House poll '+key);
 assert(Math.abs((p.dem-p.rep)-p.margin)<0.11,'House margin mismatched poll shares '+key);
 assert(/^https:\/\//.test(p.url),'Unattributed House polling source '+key);
}
report.housePollDistricts=Object.keys(housePolls).length;
const govPolls=json('governors/recent_verified_polls.json').states||{};
report.governorPollStates=Object.keys(govPolls).length;
for(const [code,polls] of Object.entries(govPolls)){
 assert(geographicStates.has(code),'Unknown governor polling state '+code);
 assert(Array.isArray(polls),'Invalid governor polling list');
 for(const p of polls)assert(Number.isFinite(p.margin)&&/^https:\/\//.test(p.url),code+' invalid governor poll');
}
// Parse JavaScript sources as scripts without importing or executing browser-specific globals.
const jsFiles=['scripts/geo-engine.js','scripts/county-scenarios.js','house/board.js','house/district-browser.js','elections/app.js','elections/county-table.js','elections/night-desk.js','elections/overview/center.js','elections/overview/center-counties.js','elections/overview/live-desk.js'];
for(const p of jsFiles){new Script(file(p),{filename:p});report.scripts++;}
for(const html of ['house/index.html','elections/index.html','elections/overview/index.html','michigan/election-night/index.html']){
 const content=file(html),dir=path.dirname(html);
 for(const m of content.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/g)){
  const ref=m[1].split(/[?#]/)[0];
  if(!ref||/^(https?:|\/\/|#)/.test(ref))continue;
  if(!/\.(js|css)$/i.test(ref))continue;
  const candidate=path.join(dir,ref);
  assert(fs.existsSync(candidate),html+' missing referenced asset '+ref);
  report.assets++;
 }
}
console.log('ERVIN MODEL SITE VALIDATION PASS');
console.log(JSON.stringify(report,null,2));
