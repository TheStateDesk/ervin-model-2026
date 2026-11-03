#!/usr/bin/env node
// Dependency-free regression checks for the consolidated 50-state editorial desk.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const json=p=>JSON.parse(read(p));
const indexHTML=read('states/index.html'),stateHTML=read('state/index.html'),indexJS=read('states/app.js'),stateJS=read('state/app.js');
new vm.Script(indexJS,{filename:'states/app.js'});
new vm.Script(stateJS,{filename:'state/app.js'});
for(const [html,js,name] of [[indexHTML,indexJS,'national state directory'],[stateHTML,stateJS,'state edition']]){
 const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]));
 for(const m of js.matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert(ids.has(m[1]),name+': missing UI id '+m[1]);
}
assert(indexHTML.includes('id="usMap"')&&indexHTML.includes('./app.js'), 'National map is not installed');
/* Audit follow-up: interactive features must be wired end-to-end before publication. */
const homeJS=read('scripts/home-election-2026.js'),countyJS=read('scripts/national-county-2026.js');
new vm.Script(homeJS,{filename:'scripts/home-election-2026.js'});
new vm.Script(countyJS,{filename:'scripts/national-county-2026.js'});
assert(indexHTML.includes('id="houseWatchList"')&&homeJS.includes('drawHouseWatch()'),'The closest modeled House districts must render on the homepage');
assert(indexHTML.includes('id="senate-control"')&&indexHTML.includes('id="controlUncertainty"')&&indexHTML.includes('scripts/home-control.js')&&indexHTML.includes('scripts/senate_control.js'),'The national control simulator must be visible alongside the House/Senate/governor seat bars');
assert(indexHTML.includes('id="recentStateLink"')&&indexJS.includes('ervin-last-state')&&stateJS.includes('ervin-last-state'),'The recent state shortcut is not connected');
assert(indexHTML.includes('data-national-atlas-view="states"')&&indexHTML.includes('data-national-atlas-view="counties"'),'Missing nationwide States / Counties map selector');
assert(indexJS.includes('function setAtlasView(mode)')&&homeJS.includes('The States / Counties selector owns map visibility'),'The national view selector may be overridden on election night');
assert(countyJS.includes('IntersectionObserver')&&countyJS.includes('maybeStart()'),'National county geography must load only when close to the viewport');
assert(!countyJS.includes('tabindex="0"'),'County polygons must not each add a tab stop');
assert(indexJS.includes("officeTotals(r,'senate')")&&indexJS.includes("officeTotals(r,'governor')")&&indexJS.includes("officeTotals(r,'house')"),'State directory must not aggregate incompatible offices');
assert(read('state/source-ledger.js').includes('a.id.localeCompare(b.id)'),'Source-ledger House district sort crash regressed');
assert(read('election-night/power.js').includes('projection.senate.D'),'Balance explanatory note must reflect current Senate estimates');

assert(stateHTML.includes('id="countyMap"')&&stateHTML.includes('id="districtMap"'),'State requires both clickable maps');
for(const p of ['states/editorial.css','state/app.js','states/app.js','scripts/us-geography.js','scripts/geo-engine.js','scripts/county-scenarios.js'])assert(fs.existsSync(p),'Missing State Desk dependency '+p);
const geoContext={window:{}};new vm.Script(read('scripts/us-geography.js')).runInNewContext(geoContext);
const states=geoContext.window.ERVIN_US_GEOGRAPHY.states;
assert.equal(states.length,50,'State directory must have exactly fifty state shapes');
assert.equal(new Set(states.map(x=>x.code)).size,50,'Duplicate state geometry');
for(const s of states)assert(s.d?.startsWith('M')&&s.name,'Unrenderable state map path: '+s.code);
const house=json('house/data.json').seats;
const governors=json('governors/data.json').races;
const senate=json('counties-watch/forecast-baselines.json').states;
const housePolls=json('house/research-polls.json').polls;
const govPolls=json('governors/recent_verified_polls.json').states;
const countyHistory=json('geo/county-history.json');
const polled=json('polling/coverage-2026-11-02.json'),original=json('polling/primary-seven-states-2026-11-01.json');
assert.equal(Object.keys(polled.senate.states).length,30,'Missing published Senate state indexes');
assert.equal(Object.keys(polled.governor.states).length,33,'Missing published governor indexes');
assert(Object.keys(polled.house.districts).length>=118,'Missing district polling index');
assert.equal(Object.keys(original.races).length,7,'Primary-source seven-state surveys incomplete');
const codeSet=new Set(states.map(s=>s.code)),districtSet=new Set(house.map(h=>h.id));
for(const key of Object.keys(polled.senate.states))assert(codeSet.has(key),'Unrecognized Senate index state '+key);
for(const key of Object.keys(polled.governor.states))assert(codeSet.has(key),'Unrecognized governor index state '+key);
for(const key of Object.keys(polled.house.districts))assert(districtSet.has(key),'Index district absent from House roster '+key);
for(const [c,races] of Object.entries(original.races))for(const office of ['senate','governor']){
 const p=races[office];
 assert(p&&Number.isFinite(p.dem)&&Number.isFinite(p.rep)&&Math.abs(p.dem-p.rep-p.margin)<0.01,'Invalid verified source poll '+c+' '+office);
 assert(/^https:\/\//.test(p.url),'Survey missing primary URL '+c);
}
assert(stateJS.includes('Promise.allSettled(optionalFiles)'),'Optional polling feeds must not block county loading');
assert(stateJS.includes('loadCountyMap(),loadHouseMap()'),'Both map loaders must run independently');
assert(stateHTML.includes('id="countyStatus"')&&stateHTML.includes('id="countyZoomReset"'),'Visible county load/zoom controls missing');

assert.equal(house.length,435,'House seat list incomplete');
assert.equal(governors.length,36,'2026 governor registry incomplete');
assert(Object.keys(senate).length>=17,'Senate model state list incomplete');
assert(Object.keys(countyHistory.counties).length>=3000,'County history missing');
const known=new Set(states.map(x=>x.code)),houseIds=new Set(house.map(x=>x.id));
for(const s of states)assert(house.some(x=>x.code===s.code),'No House districts for state '+s.code);
for(const h of house)assert(known.has(h.code)&&h.id===h.code+'-'+h.district,'Bad House seat key '+h.id);
for(const r of governors)assert(known.has(r.code),'Governor record has unknown state');
for(const [s] of Object.entries(senate))assert(known.has(s),'Unknown Senate state '+s);
for(const p of Object.keys(housePolls))assert(houseIds.has(p),'House poll for missing district '+p);
for(const p of Object.keys(govPolls))assert(known.has(p),'Governor polls for unknown state '+p);
for(const pathname of ['index.html','elections/overview/center.js','house/board.js','house/district-browser.js','governors/board.js','site-chrome.js']){
 const content=read(pathname);
 assert(content.includes('state')||content.includes('states/'),pathname+' lost consolidated state navigation');
}
for(const html of [indexHTML,stateHTML]){
 const basedir=html===indexHTML?'states':'state';
 for(const ref of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/g)){
  const uri=ref[1].split(/[?#]/)[0];if(!/\.(js|css)$/.test(uri)||uri.startsWith('http'))continue;
  assert(fs.existsSync(path.resolve(basedir,uri)),basedir+' missing asset '+uri);
 }
}

/* 2026-11-02 regression: avoid blank maps, broken dark mode and unlinked House polls. */
const theme=read('states/theme.js'),css=read('states/editorial.css');
new vm.Script(theme,{filename:'states/theme.js'});
assert(theme.includes('ervin-2026-appearance')&&theme.includes('theme-dark'),'Theme does not share saved preference');
assert(css.includes('html.theme-dark')&&css.includes('.theme-dark .ed-card'),'State Desk lacks full dark theme');
for(const html of [indexHTML,stateHTML])assert(html.includes('id="themeToggle"')&&html.includes('theme.js'),'Theme control missing on page');
for(const id of ['districtSelect','districtZoomIn','districtZoomOut','districtZoomReset','districtMapStatus'])assert(stateHTML.includes('id="'+id+'"'),'Missing clickable district-map control '+id);
assert(stateJS.includes("('districtButtons').hidden=true"),'Large House button grid must be replaced with geographic navigation');
assert(stateJS.includes('houseVerified.races')&&stateJS.includes('statewideLatest'),'New polling snapshots are not connected to race detail');
const verifiedHouse=json('polling/house-verified-2026-11-02.json'),verifiedState=json('polling/latest-statewide-2026-11-02.json');
const verifySurvey=(p,context)=>{
 assert(Number.isFinite(p.dem)&&Number.isFinite(p.rep)&&Number.isFinite(p.margin)&&Math.abs(p.dem-p.rep-p.margin)<.011,'Bad D/R survey shares: '+context);
 assert(/^https:\/\//.test(p.url),'Missing survey listing citation: '+context);
};
for(const [district,rows] of Object.entries(verifiedHouse.races)){
 assert(districtSet.has(district)&&rows.length,'Invalid House polling district: '+district);
 rows.forEach(p=>verifySurvey(p,district));
}
for(const office of ['senate','governor'])for(const [st,rows] of Object.entries(verifiedState[office])){
 assert(codeSet.has(st)&&rows.length,'Invalid statewide polling index: '+st);
 rows.forEach(p=>verifySurvey(p,office+' '+st));
}
let totalCountyShapes=0,totalHouseShapes=0;
for(const s of states){
 const counties=json('geo/counties/'+s.code+'.json'),districts=json('geo/districts/'+s.code+'.json');
 for(const [kind,collection] of [['counties',counties],['districts',districts]]){
  assert.equal(collection.type,'FeatureCollection',kind+' is not GeoJSON in '+s.code);
  assert.equal(collection.state,s.code,'Map state mismatch in '+s.code);
  assert(collection.features.length>0,'Blank '+kind+' map in '+s.code);
  assert(collection.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)),'Invalid geographic polygons in '+s.code);
 }
 const countyIds=counties.features.map(f=>f.id);
 assert.equal(new Set(countyIds).size,countyIds.length,'Duplicate county FIPS '+s.code);
 const expected=new Set(house.filter(h=>h.code===s.code).map(h=>h.district));
 const shown=new Set(districts.features.filter(f=>/^\d{1,2}$/.test(f.id)).map(f=>f.id.padStart(2,'0')));
 assert.equal(shown.size,expected.size,'Congressional district-map coverage mismatch in '+s.code);
 for(const d of expected)assert(shown.has(d),'Missing clickable district '+s.code+'-'+d);
 totalCountyShapes+=counties.features.length;
 totalHouseShapes+=shown.size;
}
assert.equal(totalHouseShapes,435,'Only some House districts are drawn');
console.log('2026-11-02 EDITORIAL MAP/THEME/POLLING REGRESSION PASS',JSON.stringify({countyShapes:totalCountyShapes,houseShapes:totalHouseShapes,verifiedHouseDistricts:Object.keys(verifiedHouse.races).length,verifiedHousePolls:Object.values(verifiedHouse.races).reduce((n,x)=>n+x.length,0),verifiedStatewidePolls:['senate','governor'].reduce((n,o)=>n+Object.values(verifiedState[o]).reduce((a,x)=>a+x.length,0),0)}));

console.log('STATE DESK VALIDATION PASS');
console.log(JSON.stringify({stateEditions:states.length,houseDistricts:house.length,governorRaces:governors.length,senateModels:Object.keys(senate).length,publicHousePolls:Object.keys(housePolls).length,governorPollStates:Object.keys(govPolls).length,countyHistoryRecords:Object.keys(countyHistory.counties).length,pollingIndex:{senateStates:Object.keys(polled.senate.states).length,governorStates:Object.keys(polled.governor.states).length,houseDistricts:Object.keys(polled.house.districts).length},primarySurveys:Object.keys(original.races).length*2,countyMap:'independent loading and labeled zoom controls',navigation:'state-first'},null,2));
