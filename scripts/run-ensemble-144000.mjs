#!/usr/bin/env node
/* The Ervin Model — reproducible 144,000-scenario Election Day ensemble.
 * This is an uncertainty/sensitivity experiment, NOT calibrated probabilities.
 * The principal errors are sampled from *past elections* in the matching office:
 * Senate from 2018–24 federal Senate residuals; House from comparable
 * House-district historical residuals; governors from governor holdout only.
 * National correlated movement is shared; opposite-office residuals never transfer.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const req=createRequire(import.meta.url);
req('./governor-backtest.js');
req('./statewide-ervin.js');
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const house=read('house/ervin-forecast-2026-11-02.json');
const sen=read('counties-watch/forecast-baselines.json');
const gov=read('governors/data.json');
const history=read('research/governor-same-office-2014-2024.json');
const houseHoldout=read('research/house-holdout-baseline-2022-2024.json');
const govHoldout=read('research/governor-same-office-backtest-2026-11-02.json');
const evaluated=globalThis.ERVIN_STATEWIDE.apply(history,gov,sen);
const S=Object.entries(sen.states).map(([code,v])=>({...v,code,margin:v.adjustedMargin}));
const H=Object.values(house.races).map(r=>({...r,margin:r.marginD}));
const G=evaluated.governor.map(r=>({...r,margin:Number.isFinite(r.model.adjustedMargin)?r.model.adjustedMargin:r.model.pollMargin}));
assert.equal(S.length,17);assert.equal(H.length,435);assert.equal(G.length,36);
assert(S.every(x=>Number.isFinite(x.margin)),'No uncalibrated numeric Senate race');
assert(H.filter(x=>Number.isFinite(x.margin)).length===433,'House numerical coverage changed');
const W=144000,SEED=20261103;
let state=SEED|0,spare=null;
function uniform(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;}
function normal(){if(spare!==null){const v=spare;spare=null;return v;}
 const u=Math.max(1e-12,uniform()),v=uniform(),rad=Math.sqrt(-2*Math.log(u));
 spare=rad*Math.sin(2*Math.PI*v);return rad*Math.cos(2*Math.PI*v);}
function avg(a){return a.reduce((s,x)=>s+x,0)/a.length}
function sd(a){const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)**2)))}
function clean(a){const m=avg(a),d=sd(a)||1;return a.map(x=>(x-m)/d);}
function parseCSV(text){
 const lines=text.trim().split(/\r?\n/);
 return lines.slice(1).map(line=>{const cols=line.match(/(?:"(?:[^"]|"")*"|[^,])+/g)||[];
 return cols.map(z=>z.replace(/^"|"$/g,'').replace(/""/g,'"'));});
}
const senateArchive=parseCSV(fs.readFileSync('research/senate_2018_2024_walk_forward.csv','utf8'));
const senateResiduals=senateArchive.map(x=>Number(x[8])-Number(x[5])).filter(Number.isFinite);
const houseResiduals=houseHoldout.records.map(x=>Number(x.adjustedByNationalTrend)-Number(x.actual2024Margin)).filter(Number.isFinite);
// Governor holdouts are small and include highly varied source quality;
// winsorization prevents one anecdotal governor race from dominating 144k draws.
const governorResiduals=govHoldout.records.filter(x=>x.eligible&&Number.isFinite(x.adjustedMargin)&&Number.isFinite(x.actualMargin))
 .map(x=>x.adjustedMargin-x.actualMargin);
assert(senateResiduals.length>=60&&houseResiduals.length>=220&&governorResiduals.length>=18);
const robust=a=>clean(a.map(v=>Math.max(-20,Math.min(20,v))));
const senPool=robust(senateResiduals),housePool=robust(houseResiduals),govPool=robust(governorResiduals);
const take=pool=>pool[Math.floor(uniform()*pool.length)];
const commonSigma=2.4,senOfficeSigma=1.0,houseOfficeSigma=1.0,govOfficeSigma=1.0;
const senRows=S.map(x=>({...x,sigma:x.stale||x.publisherInputs<2?9.2:x.publisherInputs<3?8.2:6.6,
 idio:Math.sqrt((x.stale||x.publisherInputs<2?9.2:x.publisherInputs<3?8.2:6.6)**2-commonSigma**2-senOfficeSigma**2)}));
const houseRows=H.map(x=>{const lowEvidence=x.pollEvidence<2;
 const total=x.changed2026Map?(lowEvidence?12.2:11.1):(lowEvidence?8.8:7.7);
 return {...x,sigma:total,idio:Math.sqrt(total**2-commonSigma**2-houseOfficeSigma**2)};});
const govRows=G.map(x=>{const count=x.model.calibrationCycles||0;
 const total=Number.isFinite(x.margin)?count>=3?7.6:count>=2?8.4:count>=1?9.2:10.2:0;
 return {...x,sigma:total,idio:total?Math.sqrt(total**2-commonSigma**2-govOfficeSigma**2):0};});
const demHeld=new Set(['MI','GA','NH','MN']),newIndependent=new Set(['NE','SD','MT']);
const trials={house:[],senateD:[],senateR:[],senateI:[],governorsD:[],governorsR:[]};
const histByOffice={house:{},senateD:{},governorsD:{}},joint=new Map();
const wins={senate:Object.fromEntries(S.map(x=>[x.code,0])),house:{},governor:{}};
const outcome={houseDem:0,houseRep:0,senateDem:0,senateRep:0,senateOther:0,governorDem:0,govRep:0,demHouseRepSenate:0,repHouseDemSenate:0};
const specialHouse=H.filter(x=>!Number.isFinite(x.margin));
assert.deepEqual(specialHouse.map(x=>x.id).sort(),['AK-01','CA-06']);
function specialChoice(r){
 if(/ D$/.test(r.modelRating))return 'D';
 if(/ R$/.test(r.modelRating))return 'R';
 throw Error('Unresolved nonnumeric House race '+r.id);
}
function governorChoice(r){
 if(/ D$/.test(r.qualitativeRating?.label||''))return 'D';
 if(/ R$/.test(r.qualitativeRating?.label||''))return 'R';
 throw Error('Nonnumeric governor race lacks a source rating '+r.code);
}
const houseSpecial={D:specialHouse.filter(r=>specialChoice(r)==='D').length,R:specialHouse.filter(r=>specialChoice(r)==='R').length};
const govHeld={D:6,R:8};
for(let i=0;i<W;i++){
 const global=normal()*commonSigma,offSen=normal()*senOfficeSigma,offHouse=normal()*houseOfficeSigma,offGov=normal()*govOfficeSigma;
 let seatS_D=47,seatS_R=53,seatS_I=0;
 for(const r of senRows){
  // Corrected residuals are model minus actual: the error is SUBTRACTED.
  const m=r.margin+global+offSen-take(senPool)*r.idio;
  if(m>0)wins.senate[r.code]++;
  if(demHeld.has(r.code)){
   if(m<0){seatS_D--;seatS_R++;}
  }else if(m>0){
   seatS_R--;
   if(newIndependent.has(r.code))seatS_I++;else seatS_D++;
  }
 }
 if(seatS_D+seatS_R+seatS_I!==100)throw Error('Senate seat conservation');
 let seatH_D=houseSpecial.D;
 for(const r of houseRows){
  if(!Number.isFinite(r.margin))continue;
  const m=r.margin+global+offHouse-take(housePool)*r.idio;
  if(m>0){seatH_D++;wins.house[r.id]=(wins.house[r.id]||0)+1;}
 }
 const seatH_R=435-seatH_D;
 let seatG_D=govHeld.D;
 for(const r of govRows){
  const m=Number.isFinite(r.margin)?r.margin+global+offGov-take(govPool)*r.idio:null;
  const d=m===null?governorChoice(r)==='D':m>0;
  if(d){seatG_D++;wins.governor[r.code]=(wins.governor[r.code]||0)+1;}
 }
 const seatG_R=50-seatG_D;
 trials.house.push(seatH_D);trials.senateD.push(seatS_D);trials.senateR.push(seatS_R);trials.senateI.push(seatS_I);trials.governorsD.push(seatG_D);trials.governorsR.push(seatG_R);
 for(const [name,n] of [['house',seatH_D],['senateD',seatS_D],['governorsD',seatG_D]])histByOffice[name][n]=(histByOffice[name][n]||0)+1;
 const jointKey=[seatH_D,seatS_D,seatS_I,seatG_D].join('/');
 joint.set(jointKey,(joint.get(jointKey)||0)+1);
 if(seatH_D>=218)outcome.houseDem++;else outcome.houseRep++;
 const democratControl=seatS_D>=51, republicanControl=seatS_R>=50;
 if(democratControl)outcome.senateDem++;
 else if(republicanControl)outcome.senateRep++;
 else outcome.senateOther++;
 if(seatG_D>=26)outcome.governorDem++;else outcome.govRep++;
 if(seatH_D>=218&&republicanControl)outcome.demHouseRepSenate++;
 if(seatH_D<218&&democratControl)outcome.repHouseDemSenate++;
}
const asFraction=n=>+(n/W).toFixed(6),toRound=n=>+n.toFixed(3);
function stat(name){
 const a=trials[name],ordered=[...a].sort((x,y)=>x-y);
 const mean=avg(a),v=sd(a);
 const quant=p=>ordered[Math.min(W-1,Math.floor(p*(W-1)))];
 const entries=Object.entries(histByOffice[name]||{}).map(([k,n])=>({seats:+k,count:n,pct:asFraction(n)})).sort((a,b)=>a.seats-b.seats);
 const max=entries.reduce((best,x)=>x.count>best.count?x:best,entries[0]);
 const skew=avg(a.map(x=>((x-mean)/v)**3)),kurt=avg(a.map(x=>((x-mean)/v)**4))-3;
 const localPeaks=entries.filter((x,i)=>x.count>(entries[i-1]?.count||0)&&x.count>(entries[i+1]?.count||0)&&x.count>=W*.005)
   .sort((a,b)=>b.count-a.count).slice(0,8);
 return {mean:toRound(mean),median:quant(.5),mode:max.seats,modeShare:asFraction(max.count),sd:toRound(v),skewness:toRound(skew),excessKurtosis:toRound(kurt),
  p05:quant(.05),p10:quant(.1),p25:quant(.25),p75:quant(.75),p90:quant(.9),p95:quant(.95),
  localPeaks,histogram:entries,rawBinCountsSum:entries.reduce((n,x)=>n+x.count,0)};
}
function erf(x){const sign=x<0?-1:1;x=Math.abs(x);
 const t=1/(1+.3275911*x),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return sign*y;}
const Phi=x=>.5*(1+erf(x/Math.SQRT2));
function outlierBins(name){
 const r=stat(name);let unusual=[];
 for(const x of r.histogram){
  const theoretical=Math.max(.000001,Phi((x.seats+.5-r.mean)/r.sd)-Phi((x.seats-.5-r.mean)/r.sd));
  const expected=W*theoretical;
  if(expected<90||x.count<40)continue;
  const z=(x.count-expected)/Math.sqrt(W*theoretical*(1-theoretical));
  if(Math.abs(z)>=4)unusual.push({seats:x.seats,count:x.count,normalExpected:Math.round(expected),zVsRoundedNormal:toRound(z),reason:'Discrete seat-frequency departure from matched normal comparison; not a significance test against an independently fitted theory'});
 }
 return unusual.sort((a,b)=>Math.abs(b.zVsRoundedNormal)-Math.abs(a.zVsRoundedNormal)).slice(0,9);
}
const senateStats=stat('senateD'),houseStats=stat('house'),governorStats=stat('governorsD');
const raceProb=(races,field)=>races.map(r=>({id:r.id||r.code,name:r.state||r.id,margin:Number.isFinite(r.margin)?r.margin:null,modelInputs:r.publisherInputs??r.pollEvidence??r.model?.calibrationCycles??null,
 pctNonR:field[r.id||r.code]===undefined?null:asFraction(field[r.id||r.code]/W)}));
const closeSen=raceProb(senRows,wins.senate).sort((a,b)=>Math.abs(a.pctNonR-.5)-Math.abs(b.pctNonR-.5)).slice(0,10);
const closeHouse=raceProb(houseRows.filter(x=>Number.isFinite(x.margin)),wins.house).map(x=>({...x,pctNonR:x.pctNonR??0}))
 .sort((a,b)=>Math.abs(a.pctNonR-.5)-Math.abs(b.pctNonR-.5)).slice(0,15);
const summary={
 schema:1,title:'The Ervin Model · 144,000 pre-election scenarios',asOf:'2026-11-03',trials:W,seed:SEED,
 sourceFiles:['counties-watch/forecast-baselines.json','house/ervin-forecast-2026-11-02.json','governors/data.json','research/governor-same-office-2014-2024.json','research/senate_2018_2024_walk_forward.csv','research/house-holdout-baseline-2022-2024.json','research/governor-same-office-backtest-2026-11-02.json'],
 method:{commonNationalSigma:commonSigma,officeSigma:{senate:senOfficeSigma,house:houseOfficeSigma,governor:govOfficeSigma},
  senate:'17 corrected Senate margins, 61 centered historical Senate walkforward residuals sampled with replacement, common national and office shocks. Other Senate races assumed to retain current alignment. New independent winner caucus unknown.',
  house:'433 numerical 2026-map House margins, 232 comparable past House residuals sampled with replacement; the 173 redrawn district allocations have wider uncertainty. Two nonnumeric exceptions assigned their sourced qualitative party rating.',
  governor:'36 governor contests, only same-state governor calibration, 20 eligible historical governor residuals sampled within office; 14 off-cycle governors held and 3 nonnumeric governor races use cited qualitative ratings.',
  empiricalResiduals:{senate:senateResiduals.length,house:houseResiduals.length,governor:governorResiduals.length},
  redrawnHouseCount:H.filter(r=>r.changed2026Map).length,unmodeledSenateCount:18,houseNonnumeric:specialHouse.map(r=>r.id),
  limitations:'Simulation percentages are conditional sensitivity frequencies, not externally calibrated election probabilities. Presumed-held, qualitative-rated, statewide common errors, ballot-specific independents, redistricting and single-cycle candidate comparisons add uncertainty.'},
 center:{house:houseStats,senateD:senateStats,governorsD:governorStats},
 outcomes:Object.fromEntries(Object.entries(outcome).map(([k,v])=>[k,asFraction(v)])),
 modalJoint:Object.entries(Object.fromEntries(joint)).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([key,count])=>({houseD:+key.split('/')[0],senateD:+key.split('/')[1],newIndependent:+key.split('/')[2],governorD:+key.split('/')[3],count,share:asFraction(count)})),
 unusual:{house:outlierBins('house'),senateD:outlierBins('senateD'),governorsD:outlierBins('governorsD')},
 pivotal:{senate:closeSen,house:closeHouse},seatSamplesChecks:{house:W,senate:W,governors:W}
};
for(const key of ['house','senateD','governorsD'])assert.equal(summary.center[key].rawBinCountsSum,W);
assert(Math.abs(summary.outcomes.houseDem+summary.outcomes.houseRep-1)<.00001);
assert(Math.abs(summary.outcomes.senateDem+summary.outcomes.senateRep+summary.outcomes.senateOther-1)<.00001);
fs.mkdirSync('final',{recursive:true});
fs.writeFileSync('final/ensemble-144000.json',JSON.stringify(summary,null,2)+'\n');
console.log('ERVIN 144000 ENSEMBLE PASS',JSON.stringify({house:summary.center.house,senate:summary.center.senateD,governors:summary.center.governorsD,outcomes:summary.outcomes,unusual:summary.unusual,pivotalSenate:closeSen.slice(0,5)}).slice(0,13000));
