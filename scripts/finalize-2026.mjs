#!/usr/bin/env node
/* Freeze the verified Election Day evidence once, without rewriting it
 * after results arrive. Publishing source changes does not change this lock.
 */
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const file='final/forecast-final.json',stateFile='final/status.json';
const paths=['counties-watch/forecast-baselines.json','governors/data.json','house/ervin-forecast-2026-11-02.json','research/governor-same-office-2014-2024.json'];
const ensemble=read('final/ensemble-144000.json');
assert.equal(ensemble.trials,144000);
assert.equal(ensemble.seed,20261103);
assert.equal(ensemble.center.senateD.rawBinCountsSum,144000);
assert.equal(ensemble.center.house.rawBinCountsSum,144000);
assert.equal(ensemble.center.governorsD.rawBinCountsSum,144000);
assert.equal(read(paths[0]).asOf.slice(0,10),'2026-11-03');
assert.equal(Object.keys(read(paths[0]).states).length,17);
assert.equal(read(paths[1]).races.length,36);
assert.equal(Object.keys(read(paths[2]).races).length,435);
const title='A Blue House. A Senate Cliffhanger.';
const dek='The 144,000-scenario Ervin Model centers on roughly 249 Democratic House seats, 50 Democratic-aligned Senate seats, and 27 Democratic governorships. Republicans have the narrower but meaningful Senate-control edge; simulations are sensitivity tests, not calibrated probabilities.';
if(fs.existsSync(file)){
 const prior=read(file);
 assert.equal(prior.schema,1);
 assert.equal(Object.keys(prior.data||{}).length,4);
 console.log('IMMUTABLE FORECAST ALREADY FROZEN',prior.lockedAt);
 process.exit(0);
}
const at=new Date().toISOString();
assert(at>='2026-11-03T14:30:00.000Z'&&at<'2026-11-04T05:00:00.000Z','Do not publish outside pre-election Nov 3 lock window');
const commit=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const snapshot={
 schema:1,lockedAt:at,sourceCommit:commit,
 officeRule:'Senate and governor close margins under 1.5 points are Toss-up',
 data:Object.fromEntries(paths.map(p=>[p,read(p)])),
 editorial:{headline:title,dek,simulationSource:'final/ensemble-144000.json',simulations:144000,
  houseMedianD:ensemble.center.house.median,houseModalD:ensemble.center.house.mode,
  senateMedianD:ensemble.center.senateD.median,senateModalD:ensemble.center.senateD.mode,
  governorsMedianD:ensemble.center.governorsD.median,governorsModalD:ensemble.center.governorsD.mode,
  uncertaintyNote:'Conditional frequencies only; independent Senate caucus assumptions not forced.'},
 message:'Immutable pre-election forecast snapshot. DO NOT overwrite with actual vote results.'
};
fs.writeFileSync(file,JSON.stringify(snapshot)+'\n');
const status=read(stateFile);
status.phase='auto';status.version=2;status.finalLockedAt=at;status.headline=title;status.dek=dek;
status.notes='2026 forecast locked. Election-night homepage handoff at 17:55 Eastern; only verified unofficial returns may populate live mode. Forecast data is frozen.';
fs.writeFileSync(stateFile,JSON.stringify(status,null,2)+'\n');
console.log('FINAL LOCK CREATED',at,'SOURCE',commit,'SCENARIOS',ensemble.trials,JSON.stringify(snapshot.editorial));
