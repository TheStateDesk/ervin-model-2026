#!/usr/bin/env node
/* Historical MOE source reconciliation; tests actual margin residuals, not fictional polls. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hist=read('research/election-night-historical-moe-2026.json');
const house=read('research/house-holdout-baseline-2022-2024.json');
const lines=fs.readFileSync('research/senate_2018_2024_walk_forward.csv','utf8').trim().split(/\r?\n/);
const split=x=>x.replace(/^"|"$/g,'').split('","');
const headers=split(lines.shift());
const poll=headers.indexOf('Poll margin D-R'),actual=headers.indexOf('Actual margin D-R');
assert(poll>=0&&actual>=0);
const err=lines.map(x=>{const a=split(x);return Number(a[actual])-Number(a[poll])});
const houseErr=house.records.map(r=>r.actual2024Margin-r.predicted2024Margin);
const quantile=(a,p)=>{const s=a.map(Math.abs).sort((x,y)=>x-y);const pos=(s.length-1)*p,i=Math.floor(pos);return s[i]+(s[Math.min(s.length-1,i+1)]-s[i])*(pos-i)};
const check=(a,ref)=>{assert.equal(a.length,ref.n);const mae=a.map(Math.abs).reduce((x,y)=>x+y,0)/a.length;const rmse=Math.sqrt(a.reduce((x,y)=>x+y*y,0)/a.length);
 for(const [metric,expected] of [['mae',mae],['rmse',rmse],['p80Abs',quantile(a,.8)],['p90Abs',quantile(a,.9)]])assert(Math.abs(ref[metric]-expected)<.006,'Historical '+metric+' mismatch');
};
check(err,hist.senate.raw);
check(houseErr,hist.house.unchangedDistrictHoldout);
assert.equal(hist.house.excluded2026ChangedOrNoncomparable,203);
const js=fs.readFileSync('stats-for-nerds/app.js','utf8');
const state=fs.readFileSync('state/app.js','utf8'),board=fs.readFileSync('house/board.js','utf8');
assert(js.includes('targetResidual(id)')&&js.includes("historicalMOE?.senate?.raw?.rmse"),'No historical Senate RMSE in simulation');
assert(js.includes("if(!key.endsWith('-SENATE'))return {ok:false"),'House results must not automatically shift Senate');
assert(js.includes("'FL-27':'2026-11-03T19:00:00-05:00'"),'Florida closing time regression');
assert(state.includes('changed2026Map')&&state.includes('historicalP90')&&state.includes("'Not comparable'"),'Changed maps not excluded from historical House error evidence');
assert(board.includes('232 comparable 2022→2024 districts'));
console.log('HISTORICAL MOE AUDIT PASS',JSON.stringify({senateEvents:err.length,houseComparable:houseErr.length,senateP90Margin:hist.senate.raw.p90Abs,houseP90Margin:hist.house.unchangedDistrictHoldout.p90Abs,redrawnExcluded:203}));
