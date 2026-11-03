/* Governor-specific historic errors only. Past-only test uses prior gubernatorial
 * races IN THE SAME STATE, never Senate/presidential election margins.
 * Recency weights: most recent 50%, second 30%, third 20%, renormalized
 * if fewer gubernatorial cycles are available. No 2026 result leaks.
 */
(function(root){'use strict';
const W=[.5,.3,.2],exclude=r=>r.pollType==='single stale poll';
const round=n=>+n.toFixed(3);
function correction(events,state,targetYear){
 const eligible=(events||[]).filter(e=>e.state===state&&e.office==='Governor'&&e.year<targetYear&&e.year>=2018&&Number.isFinite(e.pollMargin)&&Number.isFinite(e.actualMargin)&&!exclude(e))
 .sort((a,b)=>b.year-a.year).slice(0,3);
 if(!eligible.length)return null;
 const sum=W.slice(0,eligible.length).reduce((a,b)=>a+b,0);
 const entries=eligible.map((e,i)=>({year:e.year,office:'Governor',poll:e.pollMargin,actual:e.actualMargin,
 error:round(e.pollMargin-e.actualMargin),weight:round(W[i]/sum),pollType:e.pollType,url:e.sourceUrl,resultUrl:e.resultUrl,note:e.note}));
 const rawValue=round(entries.reduce((v,e)=>v+e.error*e.weight,0));
 const shrink=entries.length===1?1/3:entries.length===2?2/3:1;
 return {value:round(rawValue*shrink),unshrunkCorrection:rawValue,shrinkFactor:shrink,evidence:entries,years:entries.map(x=>x.year),n:entries.length,
 note:entries.length<3?'Only '+entries.length+' historic gubernatorial comparison(s) available. Correction shrunk to '+Math.round(shrink*100)+'% to reduce small-sample overfitting.':'Three past gubernatorial cycles; governor-only calibration.'};
}
function score(records){
 const eligible=records.filter(x=>x.correction!==null&&Number.isFinite(x.pollMargin)&&Number.isFinite(x.actualMargin));
 const n=eligible.length;
 const mae=fn=>n?round(eligible.reduce((t,x)=>t+Math.abs(fn(x)),0)/n):null;
 const rms=fn=>n?round(Math.sqrt(eligible.reduce((t,x)=>t+fn(x)**2,0)/n)):null;
 const wins=fn=>eligible.filter(x=>Math.sign(fn(x))===Math.sign(x.actualMargin)).length;
 return {n,rawMAE:mae(x=>x.pollMargin-x.actualMargin),adjustedMAE:mae(x=>x.adjustedMargin-x.actualMargin),rawRMSE:rms(x=>x.pollMargin-x.actualMargin),adjustedRMSE:rms(x=>x.adjustedMargin-x.actualMargin),rawWinners:wins(x=>x.pollMargin),adjustedWinners:wins(x=>x.adjustedMargin)};
}
function compute(input){
 const races=(input?.races||[]).filter(e=>e.year>=2018).sort((a,b)=>a.year-b.year||a.state.localeCompare(b.state));
 const rows=races.map(r=>{
   const past=correction(races,r.state,r.year);
   const adjusted=past?round(r.pollMargin-past.value):null;
   return {...r,error:round(r.pollMargin-r.actualMargin),correction:past?.value??null,
     adjustedMargin:adjusted,rawAbsError:round(Math.abs(r.pollMargin-r.actualMargin)),
     adjustedAbsError:adjusted===null?null:round(Math.abs(adjusted-r.actualMargin)),
     evidence:past?.evidence||[],eligible:past!==null&&!exclude(r),pastOnly:true};
 });
 const scored=rows.filter(x=>x.eligible),strict=scored.filter(x=>x.pollType==='RCP average');
 return {asOf:input.asOf,method:'Only earlier state governor polls vs actual governor results. D-R error = poll margin minus actual margin. Latest 3 same-state governor errors weighted 0.5/0.3/0.2; 1 historical event is shrunk to one-third, 2 events to two-thirds, 3 events to full. No federal-election inputs, no future election results.',
 caveats:'Nonrandom 2018–24 sourced cohort, different candidates and survey sources; sparse states with only one prior election have fragile corrections. Single stale surveys (Aug 2022 South Carolina) are displayed but excluded from calibration and scoring. RCP-only target subset scored separately. No calibrated win chances or exact retrospective recreation of 2026.',
 summary:{observed:rows.length,eligible:scored.length,notBacktestable:rows.length-scored.length,...score(scored)},
 preferredRCP:score(strict),
 byYear:Object.fromEntries([...new Set(rows.map(x=>x.year))].map(year=>[year,{observed:rows.filter(x=>x.year===year).length,...score(scored.filter(x=>x.year===year))}])),
 records:rows};
}
const api={correction,compute,score};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ERVIN_GOVERNOR_BACKTEST=api;
})(typeof window!=='undefined'?window:globalThis);