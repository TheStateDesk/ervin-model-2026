#!/usr/bin/env node
/* Reproducibility and fail-closed smoke for Stats for Nerds. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {setTimeout as sleep} from 'node:timers/promises';
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const html=fs.readFileSync('stats-for-nerds/index.html','utf8');
const code=fs.readFileSync('stats-for-nerds/app.js','utf8');
const audit=readJSON('stats-for-nerds/reviewed-signals.json');
const candidateData=readJSON('stats-for-nerds/candidates-2026.json');
assert.equal(candidateData.election,'2026-11-03');
assert.equal(Object.keys(candidateData.races).length,11,'All eight early signals and three target Senate contests must have sourced candidate rosters');
for(const [id,row] of Object.entries(candidateData.races)){assert(row.democrat&&row.republican&&row.sourceUrl.startsWith('https://'),'Unverified major-party candidate pair: '+id);}
const baselines=readJSON('counties-watch/forecast-baselines.json');
const house=readJSON('house/ervin-forecast-2026-11-02.json');
const historical=readJSON('research/election-night-historical-moe-2026.json');
const civicHealth=readJSON('civicapi/discovery.json');
assert.equal(audit.election,'2026-11-03');
assert.deepEqual(audit.signals,[],'No fabricated election-night votes may ship in the reviewed feed');
assert(html.includes('Stats for Nerds')&&html.includes('id="whatifForm"'));
assert(code.includes('20261103')&&code.includes('N=14000'),'Must describe reproducible seeded 14k-draw ensemble');
for(const guard of ['geographyReviewed','modeReviewed','reportingUnits','expectedVoteFraction','geographicCoverage','expectedEarlyFraction','voteModes','sourceUrl','closeTimes'])assert(code.includes(guard),'Missing pre-publication gate '+guard);
const elements=new Map();
const el=id=>{
 if(elements.has(id))return elements.get(id);
 const obj={value:'',textContent:'',innerHTML:'',checked:id==='includeManual',onclick:null,onchange:null,events:{},addEventListener(type,callback){this.events[type]=callback;}};
 elements.set(id,obj);return obj;
};
const document={
 readyState:'complete',hidden:false,
 getElementById:el,
 addEventListener(){},
};
const fakeFetch=async url=>{
 if(url==='../counties-watch/forecast-baselines.json')return {ok:true,json:async()=>baselines};
 if(url==='../house/ervin-forecast-2026-11-02.json')return {ok:true,json:async()=>house};
 if(url==='../stats-for-nerds/reviewed-signals.json')return {ok:true,json:async()=>audit};
 if(url==='./candidates-2026.json')return {ok:true,json:async()=>candidateData};
 if(url==='../research/election-night-historical-moe-2026.json')return {ok:true,json:async()=>historical};
 if(url==='../civicapi/discovery.json')return {ok:true,json:async()=>civicHealth};
 if(url==='../civicapi/races.json')return {ok:true,json:async()=>({version:1,election:'2026-11-03',races:{}})};
 throw Error('Offline test: upstream results feed not connected');
};
const context={document,fetch:fakeFetch,AbortController,Date,Math,Number,URL,Promise,Intl,
  setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},console,globalThis:{}};
vm.runInNewContext(code,context,{filename:'stats-for-nerds/app.js',timeout:1200});
await sleep(200);
const initial=el('targetCards').innerHTML;
assert(initial.includes('Texas')&&initial.includes('Kansas')&&initial.includes('Iowa'),'All three Senate forecasts should render');
assert(initial.includes('James Talarico')&&initial.includes('Ken Paxton'),'Texas matchup missing');
assert(initial.includes('Adam Hamilton')&&initial.includes('Roger Marshall'),'Kansas matchup missing');
assert(initial.includes('Josh Turek')&&initial.includes('Ashley Hinson'),'Iowa matchup missing');
const watchRows=el('signalRows').innerHTML;
assert(html.includes('id="evidence"')&&html.includes('id="watchFilter"')&&html.includes('id="transferRows"'),'Historical research/filters/transfers missing');
assert(el('errorSummary').innerHTML.includes('4.09')&&el('errorSummary').innerHTML.includes('4.50'),'Actual Senate raw/adjusted historical errors must render');
assert(el('errorYearBars').innerHTML.includes('2018')&&el('errorYearBars').innerHTML.includes('2024'),'All historical election-year bars must render');
assert((el('transferRows').innerHTML.match(/<tr>/g)||[]).length===8,'All eight signal transfer rows must remain visible');
assert(el('watchSourceHealth').textContent.includes('CivicAPI'),'Primary source must be explicitly attributed');
for(const name of ['Zach Dembo','Ralph Alvarado','Elaine Luria','Jennifer Kiggans','Tom Perriello','John McGuire','Jon Ossoff','Mike Collins','Annie Andrews','Darline Graham','Eliott Rodriguez','María Elvira Salazar','Roy Cooper','Michael Whatley','Sherrod Brown','Jon Husted'])assert(watchRows.includes(name),'Missing early-signal nominee '+name);
assert(watchRows.includes('Candidate roster source'),'Source links must accompany candidate names');
el('watchFilter').value='senate';el('watchFilter').events.change();
assert(el('signalRows').innerHTML.includes('Georgia')&&!el('signalRows').innerHTML.includes('Kentucky 6th'),'Senate-only watchlist filtering must work');
el('watchFilter').value='house';el('watchFilter').events.change();
assert(el('signalRows').innerHTML.includes('Kentucky 6th')&&!el('signalRows').innerHTML.includes('Georgia · Senate'),'House-only watchlist filtering must work');
el('watchFilter').value='reported';el('watchFilter').events.change();
assert(el('signalRows').innerHTML.includes('No watched races match'),'No actual votes means reported filter empty');
el('watchFilter').value='all';el('watchFilter').events.change();
el('watchSort').value='close';el('watchSort').events.change();
assert(el('signalRows').innerHTML.indexOf('Kentucky 6th')<el('signalRows').innerHTML.indexOf('Georgia · Senate'),'Chronological watchlist order must be earliest-first');
// Compare displayed model shares with current saved forecasts. The pre-election
// polling sweep can legitimately change them, so do not pin old margin literals.
const expectedShare=state=>((100+Number(baselines.states[state].adjustedMargin))/2).toFixed(1)+'%';
for(const state of ['TX','KS','IA'])assert(initial.includes(expectedShare(state)),
  state+' must use latest saved Senate forecast share '+expectedShare(state));
assert.equal(el('numApproved').textContent,0,'Initial feed has no eligible observed returns');
assert.equal(el('sampleHealth').textContent,'14,000','Unconditional 14k scenarios should have ESS 14000');
assert(el('sampleWarning').textContent.includes('No audited'),'No approved source must mean zero shift');
el('inputRace').value='VA-02';
el('inputShare').value='65';
el('inputCoverage').value='60';
el('inputMode').value='unknown';
el('inputURL').value='';
el('whatifForm').events.submit({preventDefault(){}});
assert(el('sampleWarning').textContent.includes('what-if'),'Manual signals must remain explicitly hypothetical');
assert(el('manualList').innerHTML.includes('VA-02'),'Manual review entry should render');
el('includeManual').onchange({target:{checked:false}});
assert(el('sampleWarning').textContent.includes('No audited'),'Disabling hypotheticals must restore base');
assert(el('targetCards').innerHTML.includes(expectedShare('TX')),'Base remains unchanged after disabling what-if');
assert(html.includes('../research/EARLY_SIGNAL_LAB_2026.md'),'Methodology provenance missing');
console.log('EARLY-SIGNAL-LAB PASS: 14,000 seeded draws, TX/KS/IA baselines, source audit and what-if isolation');
