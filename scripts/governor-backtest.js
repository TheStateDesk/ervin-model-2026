/* Strict past-only Governor holdout test of the Original Ervin-style historical error transfer.
 * 2018 uses pre-2018 state errors, 2022 uses up to 2020. Never reuse the
 * 2026 per-state correction (which knows later outcomes) to score earlier races.
 * State-year clustering prevents President+Senate counting a year twice.
 * Original criterion here: newest 3 available cycles receive .5 / .3 / .2.
 */
(function(root){'use strict';
const weights=[.5,.3,.2];
function correction(history,state,targetYear){
 const byYear=new Map();
 for(const e of history||[]){
  if(e.state!==state||e.year<2016||e.year>=targetYear||!Number.isFinite(e.error))continue;
  if(!byYear.has(e.year))byYear.set(e.year,[]);
  byYear.get(e.year).push(e);
 }
 const years=[...byYear.keys()].sort((a,b)=>b-a).slice(0,3);
 if(!years.length)return null;
 let weighted=0,total=0;const evidence=[];
 for(let i=0;i<years.length;i++){
  const y=years[i],group=byYear.get(y),ow=group.map(e=>e.office==='Senate'?1:e.office==='President'?.65:.5);
  const yearError=group.reduce((n,e,j)=>n+e.error*ow[j],0)/ow.reduce((a,b)=>a+b,0);
  weighted+=yearError*weights[i];total+=weights[i];
  evidence.push({year:y,events:group.length,error:+yearError.toFixed(2),cycleWeight:weights[i]});
 }
 return {value:+(weighted/total).toFixed(3),evidence,latestYear:years[0]};
}
function compute(input,history){
 const records=(input.races||[]).map(r=>{
  const past=correction(history.events,r.state,r.year),raw=r.pollMargin,actual=r.actualMargin;
  const adjusted=past===null?null:+(raw-past.value).toFixed(3);
  return {...r,correction:past?.value??null,adjustedMargin:adjusted,rawError:+(raw-actual).toFixed(3),rawAbsError:+Math.abs(raw-actual).toFixed(3),adjustedAbsError:adjusted===null?null:+Math.abs(adjusted-actual).toFixed(3),evidence:past?.evidence||[],pastOnly:true};
 });
 const score=items=>{
  const n=items.length;const mae=fn=>n?+(items.reduce((a,x)=>a+Math.abs(fn(x)),0)/n).toFixed(3):null;
  const rmse=fn=>n?+Math.sqrt(items.reduce((a,x)=>a+fn(x)**2,0)/n).toFixed(3):null;
  const correct=fn=>items.filter(x=>Math.sign(fn(x))===Math.sign(x.actualMargin)).length;
  return {n,rawMAE:mae(x=>x.pollMargin-x.actualMargin),adjustedMAE:mae(x=>x.adjustedMargin-x.actualMargin),
    rawRMSE:rmse(x=>x.pollMargin-x.actualMargin),adjustedRMSE:rmse(x=>x.adjustedMargin-x.actualMargin),
    rawWinners:correct(x=>x.pollMargin),adjustedWinners:correct(x=>x.adjustedMargin)};
 };
 const eligible=records.filter(x=>x.correction!==null);
 const all=records.length;
 return {asOf:input.asOf,method:'Past-only original-style error replay. Three most recent PREVIOUS state election cycles weighted 0.5/0.3/0.2, Senate errors prioritized within each year; 2016+ Senate/presidential evidence. DO NOT apply 2026 correction to historical years. No governor result appears in training.',
 constraints:'A small selected 2018/2022 cohort, not a nationally representative model validation; original 2026 correction is not an exact backtest of this replay. IA/KS/ME use only a last published survey, not an RCP average. Race candidates differ by cycle. No house, county or presidential probabilities are implied.',
 summary:{observed:all,eligible:eligible.length,notBacktestable:all-eligible.length,...score(eligible)},
 byYear:Object.fromEntries([...new Set(records.map(x=>x.year))].map(y=>[y,{observed:records.filter(x=>x.year===y).length,...score(eligible.filter(x=>x.year===y))}])),
 records};
}
const api={compute,correction};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ERVIN_GOVERNOR_BACKTEST=api;
})(typeof window!=='undefined'?window:globalThis);