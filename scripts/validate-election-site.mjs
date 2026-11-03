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
  geographicStates.set(code,{counties:entry.counties.features.length,districts:validDs.length,districtIds:uniqueDs,countyIds:ids});
 }
}
assert.equal(geographicStates.size,expected,'Incomplete 50-state mapping coverage');
// Every separately hosted state shape must agree with the local regional backup.
// This includes Alaska, which now has the same redundant pack fallback as other states.
for(const code of geographicStates.keys()){
 const c=json('geo/counties/'+code+'.json'),d=json('geo/districts/'+code+'.json');
 const meta=geographicStates.get(code);
 assert(c.state===code&&d.state===code,code+' direct geometry state mismatch');
 assert.equal(c.features.length,meta.counties,code+' direct county total disagrees with bundle');
 const genuineDs=d.features.filter(f=>/^\d{1,2}$/.test(String(f.id)));
 assert.equal(genuineDs.length,meta.districts,code+' direct House total disagrees with bundle');
 assert(c.features.every(f=>meta.countyIds.has(String(f.id))),code+' direct county FIPS mismatch');
 assert(genuineDs.every(f=>meta.districtIds.has(String(f.id).padStart(2,'0'))),code+' direct district IDs mismatch');
}
// All nine 2026-redrawn states and the two later-boundary comparators must
// have the official 2026 Census files; the regional 2022 fallback is unsafe.
const census2026={AL:7,CA:52,FL:28,GA:14,LA:6,NC:14,NY:26,OH:15,TN:9,TX:38,UT:4};
const officialAudit=json('research/2026-district-geography-audit.json');
for(const [code,n] of Object.entries(census2026)){
 const g=json('geo/districts/'+code+'.json');
 assert.equal(Number(g.boundaryYear),2026,'Do not ship obsolete district polygons for '+code);
 assert.equal(g.congress,120,'Source must be 120th congressional district geometry for '+code);
 assert(g.sourceUrl?.includes('census.gov/geo/tiger/TIGER2026/CD/'),'Missing official Census provenance '+code);
 assert.equal(g.features.length,n,'2026 district count mismatch for '+code);
 assert.equal(officialAudit.states[code]?.districts,n,'Census source audit count mismatch '+code);
 assert(/^[0-9a-f]{64}$/.test(officialAudit.states[code]?.zipSha256||''),'Official download SHA-256 missing '+code);
}
assert.equal(Object.keys(census2026).reduce((a,c)=>a+census2026[c],0),213);
const missouri=json('geo/districts/MO.json');
assert(Number(missouri.boundaryYear)!==2026,'Missouri court-blocked map cannot be shown as 2026 geography');
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

// Browser-like map execution smoke test; catches cases where valid polygon JSON
// nevertheless fails to render due to URL/base-path logic or SVG path bugs.
class TestElement {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.events={};}
 setAttribute(name,val){this.attrs[name]=String(val);}
 append(node){this.children.push(node);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(type,callback){this.events[type]=callback;}
}
const documentStub={
 currentScript:{src:'https://geervin.github.io/ervin-model-2026/scripts/geo-engine.js'},
 createElementNS:(_,tag)=>new TestElement(tag),
 createDocumentFragment:()=>new TestElement('fragment')
};
const browserWindow={};
let simulateAlaskaPrimaryOutage=false,simulateTexasPrimaryOutage=false;
const fetchStub=async url=>{
 const parsed=new URL(url);
 if(simulateAlaskaPrimaryOutage&&/\/geo\/(counties|districts)\/AK\.json$/.test(parsed.pathname))return {ok:false,status:503};
 if(simulateTexasPrimaryOutage&&/\/geo\/districts\/TX\.json$/.test(parsed.pathname))return {ok:false,status:503};
 const marker='/ervin-model-2026/';
 assert(parsed.pathname.startsWith(marker),'Geography escaped site base path: '+parsed.pathname);
 const local=path.join(root,parsed.pathname.slice(marker.length));
 if(!fs.existsSync(local))return {ok:false,status:404};
 return {ok:true,json:async()=>JSON.parse(fs.readFileSync(local,'utf8'))};
};
const context={document:documentStub,window:browserWindow,fetch:fetchStub,URL,location:{href:'https://geervin.github.io/ervin-model-2026/elections/'}};
new Script(file('scripts/geo-engine.js'),{filename:'scripts/geo-engine.js'}).runInNewContext(context);
let projectedCountyShapes=0,projectedDistrictShapes=0;
for(const [code,meta] of geographicStates){
 for(const [kind,expectedCount] of [['counties',meta.counties],['districts',meta.districts]]){
  const collection=await browserWindow.ERVIN_GEO.get(code,kind);
  const svg=new TestElement('svg');
  let selections=0;
  const rendered=browserWindow.ERVIN_GEO.draw(svg,collection,{kind,labels:false,onSelect:()=>selections++});
  assert.equal(rendered,expectedCount,'Wrong rendered shape count: '+code+' '+kind);
  const paths=svg.children.flatMap(node=>node.tag==='fragment'?node.children:[node]).filter(node=>node.tag==='path');
  assert.equal(paths.length,expectedCount,'Lost SVG paths: '+code+' '+kind);
  assert(paths.every(node=>node.attrs.d?.startsWith('M')&&!/NaN|Infinity|undefined/.test(node.attrs.d)),code+' invalid SVG path');
  assert.equal(svg.attrs.viewBox,'0 0 900 580',code+' invalid viewport');
  assert(paths.every(node=>node.events.click&&node.events.keydown),code+' map shapes are not clickable/keyboard accessible');
  paths[0].events.click();
  paths[0].events.keydown({key:'Enter',preventDefault(){}});
  assert.equal(selections,2,code+' map selection event not working');
  if(kind==='counties')projectedCountyShapes+=rendered;
  else projectedDistrictShapes+=rendered;
 }
}
assert.equal(projectedCountyShapes,3143,'All-state county geometry total changed; review source');
assert.equal(projectedDistrictShapes,435,'All-state voting district count changed');
simulateAlaskaPrimaryOutage=true;
for(const kind of ['counties','districts']){
 const backup=await browserWindow.ERVIN_GEO.reload('AK',kind);
 assert.equal(backup.features.length,kind==='counties'?30:1,'Alaska fallback bundle failed when direct file is unavailable');
}
report.alaskaBundleFallback='PASS';
simulateTexasPrimaryOutage=true;
await assert.rejects(browserWindow.ERVIN_GEO.reload('TX','districts'),/2026 congressional boundaries unavailable/,
  'When a 2026-redrawn map is unavailable, never fall back to a geometrically incompatible old district pack');
report.redrawnDistrictFallback='FAIL_CLOSED';
report.directStateCountyAssets=50;
report.directStateDistrictAssets=50;

const chromeCss=file('site-chrome.css');
assert(chromeCss.includes('html:not(.light) body .site-header .site-nav.is-open'),'Dark mobile menu must override the global light-theme stylesheet');
assert(chromeCss.includes('justify-content:flex-start!important'),'Mobile menu spacing must not stretch links vertically');
report.renderedMaps=geographicStates.size*2;
report.svgCountyShapes=projectedCountyShapes;
report.svgHouseShapes=projectedDistrictShapes;

console.log('ERVIN MODEL SITE VALIDATION PASS');
console.log(JSON.stringify(report,null,2));
