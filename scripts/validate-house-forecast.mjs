#!/usr/bin/env node
// Source consistency checks for all 435 provisional Ervin House model rows.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const seats=read('house/data.json').seats,model=read('house/ervin-forecast-2026-11-02.json');
const questions=read('house/poll-questions-2026-11-02.json');
const codes=new Set(seats.map(x=>x.id));
assert.equal(seats.length,435);
assert.equal(Object.keys(model.races).length,435);
assert.equal(model.summary.modeledCount,Object.values(model.races).filter(r=>Number.isFinite(r.marginD)).length,'Only current-map numeric estimates count as modeled');
assert.equal(Object.values(model.summary.ratings).reduce((n,x)=>n+x,0),435);
assert.equal(model.method.uncertainty.includes('not calibrated'),true,'Model must not present sensitivity as probability');
let localPollRows=0,withPollRows=0,indexed=0,low=0,changed=0,specialCases=0;
for(const seat of seats){
 const x=model.races[seat.id];
 assert(x,'No model forecast '+seat.id);
 assert.equal(x.id,seat.id);
 assert.equal(x.state,seat.code);
 assert.equal(x.district,seat.district);
 assert(/^(Solid|Likely|Lean|Tilt) [DR]$|^Tossup$|^Unrated$/.test(x.modelRating),'Invalid grade '+seat.id);
 if(x.changed2026Map){
  assert.equal(x.marginD,null,'Never publish obsolete-boundary House margin '+seat.id);
  assert.equal(x.modelRating,x.sourceRating||'Unrated','Require actual 2026 Cook rating for redraw '+seat.id);
  assert.equal(x.numericModelWithheld,true);
 }else assert(Number.isFinite(x.marginD)&&Math.abs(x.marginD)<=50,'Invalid numeric margin '+seat.id);
 assert(Number.isFinite(x.uncertaintySensitivity)&&x.uncertaintySensitivity>=7,'Invalid uncertainty '+seat.id);
 assert(Number.isInteger(x.pollEvidence)&&x.pollEvidence>=0,'Invalid poll evidence '+seat.id);
 assert(Number.isInteger(x.publishedSurveyCount)&&x.publishedSurveyCount>=0,'Invalid published count '+seat.id);
 assert(Number.isFinite(x.generic2026D),'Missing generic ballot baseline '+seat.id);
 assert(x.methodNote?.length>=30,'Missing provenance text '+seat.id);
 assert(Array.isArray(x.surveys),'Poll rows not array '+seat.id);
 assert(x.pollEvidence<=x.surveys.length,'Poll evidence exceeds available rows '+seat.id);
 const isShadingPositive=Number.isFinite(x.marginD)&&x.marginD>0.05,isShadingNegative=Number.isFinite(x.marginD)&&x.marginD<-.05;
 if(!x.changed2026Map&&x.modelRating.endsWith(' D'))assert(isShadingPositive,'Wrong margin side '+seat.id);
 if(!x.changed2026Map&&x.modelRating.endsWith(' R'))assert(isShadingNegative,'Wrong margin side '+seat.id);
 for(const p of x.surveys){
  assert(p.pollster&&p.kind&&p.source,'Unattributed survey '+seat.id);
  assert(/^https:\/\//.test(p.url),'Survey missing source URL '+seat.id);
  assert(typeof p.compatible==='boolean','Missing comparability flag '+seat.id);
  if(p.compatible){
   assert(Number.isFinite(p.dem)&&Number.isFinite(p.rep),'Comparable survey lacks values '+seat.id);
   assert(p.dem>=0&&p.dem<=100&&p.rep>=0&&p.rep<=100,'Invalid survey percentages '+seat.id);
  }
 }
 if(!x.changed2026Map&&x.pollWeight>0&&Math.abs(x.marginD)<49.9){
  assert(Number.isFinite(x.pollMeanD),'Weighted result requires poll mean '+seat.id);
  const reconstructed=(1-x.pollWeight)*x.fundamentalsD+x.pollWeight*x.pollMeanD;
  assert(Math.abs(x.marginD-reconstructed)<.25,'Unexplained model margin '+seat.id+': '+reconstructed+' vs '+x.marginD);
 }else if(!x.changed2026Map&&x.pollWeight===0&&Math.abs(x.marginD)<49.9)assert(Math.abs(x.marginD-x.fundamentalsD)<.12,'Non-polled margin should match prior '+seat.id);
 if(x.changed2026Map){changed++;assert(x.uncertaintySensitivity>=14,'Redraw needs wider uncertainty '+seat.id)}
 if(x.confidence==='Low')low++;
 if(x.surveys.length){localPollRows+=x.surveys.length;withPollRows++}
 indexed+=x.publishedSurveyCount;
 if(['AK-01','CA-06'].includes(seat.id)){specialCases++;assert.equal(x.pollEvidence,0,'Special multi-candidate ballot incorrectly modeled as two-party '+seat.id);assert(x.surveys.every(p=>!p.compatible),'Special candidate ballot must be flagged '+seat.id)}
}
assert.equal(specialCases,2);
assert.equal(withPollRows,model.summary.districtsWithPollRows);
assert.equal(indexed,model.summary.indexedPublishedSurveys);
assert.equal(changed,model.summary.changedMapDistricts);
assert.equal(model.summary.redrawnCookRated,seats.filter(r=>model.races[r.id]?.changed2026Map&&!!r.rating).length);
assert.equal(model.summary.redrawnUnrated,seats.filter(r=>model.races[r.id]?.changed2026Map&&!r.rating).length);
assert.equal(questions.summary.pollQuestionRows,Object.values(questions.races).reduce((n,r)=>n+r.length,0));
assert(questions.summary.districts>=100);
assert(model.summary.districtsWithComparablePolls>=90);
assert(localPollRows>=150);
console.log('ERVIN HOUSE DATA REGRESSION PASS',JSON.stringify({districts:seats.length,withPollRows,localPollRows,indexedSurveys:indexed,questionRows:questions.summary.pollQuestionRows,changedMap:changed,lowerConfidence:low}));
