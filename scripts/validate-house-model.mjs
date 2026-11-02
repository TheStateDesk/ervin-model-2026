import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const d=json('house/ervin-forecast-2026-11-02.json'),h=json('house/data.json');
const seats=new Set(h.seats.map(x=>x.id)),keys=Object.keys(d.races);
assert.equal(keys.length,435,'House model must index 435 distinct districts');
assert.equal(seats.size,435);
assert.deepEqual(new Set(keys),seats);
const validGrades=new Set(['Solid D','Likely D','Lean D','Tilt D','Tossup','Tilt R','Lean R','Likely R','Solid R']);
let polled=0,rows=0,indexed=0,redrawn=0,proxy=0;
for(const [id,r] of Object.entries(d.races)){
 assert(validGrades.has(r.modelRating),'Missing grade '+id+' '+r.modelRating);
 assert(r.id===id&&r.state===id.slice(0,2),'Mismatched district '+id);
 assert(Number.isFinite(r.marginD)&&Math.abs(r.marginD)<=50,'Out-of-bounds estimate '+id);
 assert(r.confidence&&r.methodNote&&Number.isFinite(r.uncertaintySensitivity),'Unlabeled uncertainty '+id);
 assert(r.historic&&r.historic['2022']!==undefined&&r.historic['2024']!==undefined);
 assert(Array.isArray(r.surveys),'Missing survey array '+id);
 if(r.changed2026Map)redrawn++;
 if(r.historicalProxy)proxy++;
 if(r.surveys.length)polled++;
 rows+=r.surveys.length;
 indexed+=r.publishedSurveyCount;
 for(const p of r.surveys){
  assert(p.pollster,'Unattributed poll '+id);
  assert(/^https:\/\//.test(p.url),'Unlinked poll '+id);
  assert(typeof p.compatible==='boolean','Unknown ballot compatibility '+id);
  if(p.compatible)assert(Number.isFinite(p.dem)&&Number.isFinite(p.rep),'Non-numeric compatible poll '+id);
 }
}
const questions=json('house/poll-questions-2026-11-02.json');
assert(questions.summary.pollQuestionRows>=400&&questions.summary.districts>=100,'Question-level dataset incomplete');
assert.equal(Object.values(questions.races).reduce((n,rows)=>n+rows.length,0),questions.summary.pollQuestionRows);
for(const [id,qs] of Object.entries(questions.races)){
 assert(seats.has(id),'Unknown district in archived questions '+id);
 for(const q of qs){assert(q.pollster&&q.date&&/q.sourceUrl.startsWith('https://'),'Unattributed question '+id);assert(q.usedInErvinModel===false,'Question should not double count in forecast '+id)}
}
assert(fs.readFileSync('state/app.js','utf8').includes("houseQuestions=values[12]"),'Supplemental questions not connected to state dashboard');
assert.equal(d.summary.districts,435);
assert.equal(d.summary.districtsWithPollRows,polled);
assert.equal(d.summary.indexedPublishedSurveys,indexed);
assert.equal(d.summary.changedMapDistricts,redrawn);
assert.equal(d.summary.historicalProxyDistricts,proxy);
assert(polled>=110&&rows>=140&&indexed>=340,'Incomplete survey provenance');
assert(redrawn>130,'2026 redrawn map uncertainty warnings missing');
assert.equal(d.races['AK-01'].pollEvidence,0,'Alaska RCV model should not mislabel independents as Democrats');
assert(d.races['AK-01'].surveys.length>=2,'Alaska polls omitted entirely');
assert(Number.isFinite(d.method.genericBallot.demMargin));
vm.createScript(fs.readFileSync('house/board.js','utf8'),{filename:'house/board.js'});
vm.createScript(fs.readFileSync('house/district-browser.js','utf8'),{filename:'house/district-browser.js'});
vm.createScript(fs.readFileSync('state/app.js','utf8'),{filename:'state/app.js'});
const state=fs.readFileSync('state/app.js','utf8');
assert(state.includes('houseScenario=values[11]')&&state.includes('function renderDistrictDetail'),'Model not connected to State Desk');
const html=fs.readFileSync('house/index.html','utf8');
assert(html.includes('id="houseModelSummary"'),'National model summary missing');
console.log('ERVIN HOUSE 435/435 INTEGRITY PASS',JSON.stringify({districts:keys.length,polledDistricts:polled,localSurveyRows:rows,publishedSurveyIndexCount:indexed,redrawnReferenceDistricts:redrawn,uncalibratedRatings:true}));
