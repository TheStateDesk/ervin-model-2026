#!/usr/bin/env node
/* Source integrity and full 435-district stress test, no fabricated ballot names. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const a=read('house/candidates-2026.json'),base=read('house/data.json'),model=read('house/ervin-forecast-2026-11-02.json');
const ids=base.seats.map(x=>x.id),seen=new Set(ids);
assert.equal(ids.length,435);assert.equal(seen.size,435);assert.equal(Object.keys(a.races).length,435);
assert.equal(a.election,'2026-11-03');assert.equal(a.version,1);
assert.equal(model.summary.districts,435);
let total=0,d=0,r=0,noNominees=[];
for(const id of ids){
 const row=a.races[id];
 assert(row&&row.id===id&&row.office==='House',id+' roster identity');
 assert(Array.isArray(row.candidates),id+' candidates');
 if(!row.candidates.length)noNominees.push(id);
 const identities=new Set();
 for(const c of row.candidates){
  total++;
  assert(typeof c.name==='string'&&c.name.trim()&&c.name.length<165,id+' name');
  assert(c.sourceUrl.startsWith('https://'),id+' unsourced candidate '+c.name);
  assert(Array.isArray(c.providers)&&c.providers.length>0,id+' no source evidence');
  assert(!/^(?:candidate|unknown|democrat|republican|tbd)$/i.test(c.name),id+' placeholder nominee');
  const key=(c.fecId||c.party+'-'+c.name.toLowerCase());
  assert(!identities.has(key),id+' duplicate candidate identity '+key);identities.add(key);
 }
 if(row.candidates.some(c=>c.party==='D'))d++;
 if(row.candidates.some(c=>c.party==='R'))r++;
}
assert.equal(noNominees.length,0,'All district records should have reviewed candidate-list entries');
assert(total>=1000&&total<=3000,'Candidate count anomalous');
assert(d>400&&r>390,'Major party candidate coverage implausible');
for(const atlarge of ['AK-01','DE-01','ND-01','SD-01','VT-01','WY-01'])assert(a.races[atlarge].candidates.length>0,'at-large mapping lost '+atlarge);
for(const [id,dem,rep] of [
 ['KY-06','Zach Dembo','Ralph Alvarado'],
 ['VA-02','Elaine G. Luria','Jennifer A. Kiggans'],
 ['AL-07','Terri A. Sewell','Ammie Akin'],
 ['FL-27','Eliott Rodriguez','Maria Elvira Salazar']
]){
 const people=a.races[id].candidates;
 assert(people.some(x=>x.name===dem&&x.party==='D'),id+' wrong D candidate');
 assert(people.some(x=>x.name===rep&&x.party==='R'),id+' wrong R candidate');
}
assert(a.races['CA-11'].candidates.filter(x=>x.party==='D').length===2,'Same-party ballots must not invent Republican');
const stateCount=new Set(base.seats.map(x=>x.code));assert.equal(stateCount.size,50);
for(const p of ['house/board.js','state/app.js','election-night/night.js','stats-for-nerds/house-roster.js']){
 const script=fs.readFileSync(p,'utf8');new Function(script);
 assert(script.includes('candidates-2026.json')||script.includes('houseRoster'),p+' has no roster load');
}
const directoryHtml=fs.readFileSync('stats-for-nerds/index.html','utf8');
assert(directoryHtml.includes('id="houseCandidateSearch"')&&directoryHtml.includes('id="houseRosterCards"'));
const cards=fs.readFileSync('house/board.js','utf8');
assert(cards.includes('candidateText(r)'),'House board must be searchable by candidate');
assert(!cards.includes('2026 candidate slate not verified'),'Do not disguise historical incumbent as current nominee');
console.log('435 HOUSE CANDIDATE STRESS PASS',JSON.stringify({states:stateCount.size,districts:ids.length,listedCandidates:total,districtsWithDemocrat:d,districtsWithRepublican:r,unfilled:noNominees.length,redistricted:model.summary.changedMapDistricts}));
