#!/usr/bin/env node
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const req=createRequire(import.meta.url),json=p=>JSON.parse(fs.readFileSync(p,'utf8')),text=p=>fs.readFileSync(p,'utf8');
const g=req('./governor-backtest.js'),govData=json('research/governor-same-office-2014-2024.json'),
 score=json('research/governor-same-office-backtest-2026-11-02.json');
const recomputed=g.compute(govData);
assert.equal(govData.races.length,44);
assert.equal(recomputed.summary.n,score.summary.n);
assert.equal(recomputed.summary.adjustedMAE,score.summary.adjustedMAE);
assert.equal(recomputed.summary.rawMAE,score.summary.rawMAE);
assert.equal(recomputed.summary.rawWinners,score.summary.rawWinners);
assert.equal(recomputed.summary.adjustedWinners,score.summary.adjustedWinners);
assert.equal(recomputed.summary.eligible,24);
assert.equal(recomputed.preferredRCP.n,13);
assert(score.summary.adjustedMAE>score.summary.rawMAE,'Do not hide underperformance of same-office governor correction');
assert(score.preferredRCP.adjustedMAE>score.preferredRCP.rawMAE,'RCP-only cohort must not be silently reweighted');
for(let i=0;i<recomputed.records.length;i++){
 const r=recomputed.records[i],b=score.records[i];
 assert.equal(r.correction,b.correction,'Governor correction drift '+r.state+' '+r.year);
 assert.equal(r.adjustedMargin,b.adjustedMargin,'Governor adjusted forecast drift '+r.state+' '+r.year);
 assert(r.evidence.every(x=>x.year<r.year&&x.year>=2014&&x.office==='Governor'),'Federal or future election leaked into gubernatorial backtest '+r.state+' '+r.year);
 assert(r.resultUrl.startsWith('https://'),'Missing historical governor result source '+r.state+' '+r.year);
 assert(r.sourceUrl.startsWith('https://'),'Missing public poll source '+r.state);
}
const house=json('house/ervin-forecast-2026-11-02.json'),houseAudit=json('research/house-holdout-baseline-2022-2024.json');
let rows=Object.values(house.races).filter(r=>!r.changed2026Map&&!r.historicalProxy&&r.historic?.['2022']?.contested&&r.historic?.['2024']?.contested&&Number.isFinite(r.historic['2022'].margin)&&Number.isFinite(r.historic['2024'].margin));
assert.equal(rows.length,houseAudit.rows);
const MAE=(items,fn)=>+(items.reduce((s,x)=>s+Math.abs(fn(x)),0)/items.length).toFixed(2);
const raw=MAE(rows,x=>x.historic['2022'].margin-x.historic['2024'].margin);
const national=MAE(rows,x=>x.historic['2022'].margin+(x.nationalBaselineMargins['2024']-x.nationalBaselineMargins['2022'])-x.historic['2024'].margin);
assert.equal(raw,houseAudit.baseline.mae);assert.equal(national,houseAudit.trendAdjusted.mae);
const previous=json('research/cross_office_backtest_scorecard.json');
assert(previous.senate.n>=60&&previous.pooled.n>=60&&previous.counties.n>=150,'Prior independent backtests missing');
assert(previous.counties.trendMAE>previous.counties.baselineMAE,'County conditional error must not be concealed');
const land=json('geo/counties/MI.json'),shore=json('michigan/counties.geojson');
assert.equal(land.features.length,83);assert.equal(shore.features.length,83);
const get=(data,name)=>data.features.find(f=>f.properties?.name===name);
for(const c of ['Alcona','Leelanau','Muskegon','Houghton','Wayne']){
 assert.deepEqual(get(land,c).geometry,get(shore,c).geometry,'Michigan county geography must be clipped at shore '+c);
 assert(/^\d{5}$/.test(String(get(land,c).id)),'Lost FIPS on shoreline '+c);
}
// Source-ledger audit: every modeled Senate race has an inspectable original correction,
 // all House districts have a matching line-item, and each archived governor
 // polling/actual pair is linked to source references.
const senateArchive=json('research/original-ervin-senate-calibration-2026-11-02.json'),
 senateForecast=json('counties-watch/forecast-baselines.json'),
 houseRegister=json('house/data.json'),governorRegister=json('governors/data.json');
assert.equal(Object.keys(senateForecast.states).length,Object.keys(senateArchive.senateStates).length);
for(const [code,row] of Object.entries(senateForecast.states)){
 const h=senateArchive.senateStates[code];
 assert(h&&h.events.length,'No original Senate state-error history for '+code);
 assert(h.events.every(x=>(['Senate','President'].includes(x.office)||(code==='AK'&&h.historyMode==='candidate_repeat'&&x.office==='House'))&&String(x.url).startsWith('https://')), 'Missing/invalid Original Ervin federal comparison '+code);
}
assert.equal(houseRegister.seats.length,435);
for(const district of houseRegister.seats)assert(house.races[district.id], 'Missing House model source row '+district.id);
assert.equal(governorRegister.races.length,36);
assert(govData.races.every(x=>String(x.sourceUrl).startsWith('https://')&&String(x.resultUrl).startsWith('https://')), 'Historical governor evidence must have two provenance URLs');
const ledger=text('state/source-ledger.js');
assert(ledger.includes('governorHistory')&&ledger.includes('senateHistory')&&ledger.includes('houseModel'),'Source ledger missing an office');
const mapHTML=text('states/index.html'),mapJS=text('states/app.js'),stateHTML=text('state/index.html'),nightJS=text('state/county-night.js');
assert(stateHTML.includes('id="stateSources"')&&stateHTML.includes('id="stateSourceLedger"')&&stateHTML.includes('source-ledger.js'),'State source ledger not present');
assert(mapHTML.includes('id="stateMapTooltip"')&&mapHTML.includes('id="aggregateLegend"'),'State map aggregate/hover not installed');
assert(mapJS.includes('D')&&mapJS.includes('R')&&mapJS.includes('T')&&mapJS.includes('populate()'),'Aggregate rating calculations missing');
for(const id of ['countyNightMap','nightCountyRows','nightCountyDem','nightCountyRep','nightCountyCount','nightCountyFeedStatus'])assert(stateHTML.includes('id="'+id+'"'),'Missing per-state election-night UI '+id);
assert(nightJS.includes('county_auto.json')&&nightJS.includes('county_totals.json')&&nightJS.includes('readPrecinct'),'Michigan clerk sources not present');
const empty=json('election-night/county-returns.json');assert.equal(Object.keys(empty.states).length,0,'No fabricated county returns allowed');
const ui=text('elections/overview/index.html');assert(ui.includes('noindex,nofollow')&&ui.includes('location.replace'),'Legacy center not hidden');
const main=text('index.html');assert(!main.includes('href="elections/overview/"'),'Research Center nav still visible');
console.log('ALL FORECAST VALIDATION AND GEOGRAPHIC AUDITS PASS',JSON.stringify({governorTested:score.summary.n,govRawMAE:score.summary.rawMAE,govAdjustedMAE:score.summary.adjustedMAE,houseBaselineDistricts:rows.length,houseBaselineMAE:raw,senateBacktests:previous.senate.n,countyBacktests:previous.counties.n,miLandCounties:land.features.length}));
