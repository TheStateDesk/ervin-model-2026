#!/usr/bin/env node
/* Reproducible governor-only model selection. This is a development study, not
 * a promise that the 2026 outcome has been retrospectively validated.
 * All historical predictions are generated using *earlier* same-state
 * gubernatorial poll-versus-result events only; no federal/House results.
 *
 * 2020/2022 = exploratory development; 2024 = last chronological check.
 * The 2024 set has only two eligible governor years, so model promotion is
 * frozen rather than overfitting tiny post-selection validation samples.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const governor=require('./governor-backtest.js');
const data=JSON.parse(fs.readFileSync('research/governor-same-office-2014-2024.json','utf8'));
const races=JSON.parse(fs.readFileSync('governors/data.json','utf8')).races;
const events=data.races;
const round=n=>+n.toFixed(3);
const W=[.5,.3,.2],SPARSE=[1/3,2/3,1];
const policies=[
 {id:'active-governor-only',weight:W,shrink:SPARSE,cap:null},
 {id:'capped-2',weight:W,shrink:SPARSE,cap:2},
 {id:'capped-3',weight:W,shrink:SPARSE,cap:3},
 {id:'conservative-shrink',weight:W,shrink:[.25,.5,.75],cap:null},
 {id:'recent-only',weight:[1,0,0],shrink:SPARSE,cap:null},
 {id:'unadjusted',weight:W,shrink:[0,0,0],cap:null}
];
assert.equal(events.length,57);
assert(events.every(r=>r.office==='Governor'&&r.year>=2018&&r.year<=2024));
assert.equal(new Set(events.map(r=>r.state+'-'+r.year)).size,events.length,'Duplicate history cannot act like a new election');
function correction(state,year,p,source=events){
 const prior=source.filter(x=>x.office==='Governor'&&x.state===state&&x.year<year&&x.year>=2018&&x.pollType!=='single stale poll'&&Number.isFinite(x.pollMargin)&&Number.isFinite(x.actualMargin))
  .sort((a,b)=>b.year-a.year);
 const seen=new Set(),selected=prior.filter(x=>{if(seen.has(x.year))return false;seen.add(x.year);return true}).slice(0,3);
 if(!selected.length)return null;
 const weights=p.weight.slice(0,selected.length),total=weights.reduce((a,b)=>a+b,0);
 if(total<=0)throw Error('No nonzero policy weights');
 const average=round(selected.reduce((v,e,i)=>v+round(e.pollMargin-e.actualMargin)*round(weights[i]/total),0));
 const unbounded=round(average*p.shrink[selected.length-1]);
 return p.cap===null?unbounded:round(Math.max(-p.cap,Math.min(p.cap,unbounded)));
}
function rows(p){
 return events.filter(x=>x.pollType!=='single stale poll').map(e=>{
  const c=correction(e.state,e.year,p);if(c===null)return null;
  const predicted=round(e.pollMargin-c);
  return {state:e.state,year:e.year,sourceType:e.pollType,rawAbs:Math.abs(e.pollMargin-e.actualMargin),adjustedAbs:Math.abs(predicted-e.actualMargin),rawWinner:Math.sign(e.pollMargin)===Math.sign(e.actualMargin),adjustedWinner:Math.sign(predicted)===Math.sign(e.actualMargin)};
 }).filter(Boolean);
}
function metrics(r){
 const n=r.length,mean=f=>n?round(r.reduce((s,x)=>s+f(x),0)/n):null;
 return {n,rawMAE:mean(x=>x.rawAbs),adjustedMAE:mean(x=>x.adjustedAbs),rawWinners:r.filter(x=>x.rawWinner).length,adjustedWinners:r.filter(x=>x.adjustedWinner).length};
}
const score=policies.map(p=>{
 const all=rows(p);
 assert.equal(all.length,20);
 return {policy:p.id,development:metrics(all.filter(x=>x.year<=2022)),chronological2024:metrics(all.filter(x=>x.year===2024)),all:metrics(all),RCPOnly:metrics(all.filter(x=>x.sourceType==='RCP average'))};
});
const incumbent=score[0],devWinner=[...score].sort((a,b)=>a.development.adjustedMAE-b.development.adjustedMAE)[0];
assert.equal(incumbent.all.n,20);
assert.equal(incumbent.all.rawMAE,4.667);
assert.equal(incumbent.all.adjustedMAE,4.105);
assert.equal(incumbent.chronological2024.n,2,'Never claim the final 2024 check is a well-powered holdout');
for(const r of races){
 const active=governor.correction(events,r.code,2026);
 const fromStudy=correction(r.code,2026,policies[0]);
 assert.equal(fromStudy,active?.value??null,'2026 application differs from past-only replay in '+r.code);
 assert(active?.evidence.every(e=>e.office==='Governor'&&e.year<2026&&e.year>=2018),'Cross-office or future event leaked for '+r.code);
}
assert.equal(races.length,36);
const MIN_CHRONOLOGICAL_CHECK=10;
// Do not select a new active method on these 2024 observations: only two
// independently testable governor election-years exist in this archive.
const eligibleToPromote=incumbent.chronological2024.n>=MIN_CHRONOLOGICAL_CHECK;
assert.equal(eligibleToPromote,false,'Policy changes require a new independently audited deployment review');
console.log('GOVERNOR POLICY SELECTION PASS',JSON.stringify({
 developmentEnd:2022,chronologicalCheckYear:2024,chronologicalCheckN:incumbent.chronological2024.n,
 developmentWinner:devWinner.policy,active2026:'active-governor-only',
 selectionDecision:'Retain existing method: 2024 chronological check too small to validate a change.',
 policies:score,officeGuard:'Governor events only; 36/36 2026 formulas exactly match development policy.'
}));
