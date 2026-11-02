/* Governor forecasts: same-office, same-state gubernatorial polling-error comparisons.
 * Senate retains its existing Original Ervin forecasts WITHOUT modification.
 * The independent historic governor correction is sourced in
 * research/governor-same-office-2014-2024.json.
 */
(function(root){'use strict';
function apply(archive,govs,senate){
 if(!root.ERVIN_GOVERNOR_BACKTEST?.correction)throw Error('Governor-only historical model unavailable');
 const old=archive?.races||[];
 const governor=(govs?.races||[]).map(r=>{
   const history=root.ERVIN_GOVERNOR_BACKTEST.correction(old,r.code,2026);
   const pollMargin=Number.isFinite(r.poll?.margin)?r.poll.margin:null;
   const correction=history?.value??null;
   // Historical governor error is like-for-like. A narrowly discounted
   // within-Ohio candidate-relative results shift is separate from poll errors.
   const candidateComparisons=r.candidatePerformance?.comparisons||[];
   if(candidateComparisons.some(x=>!Number.isFinite(x.referenceRepublicanMargin)||!Number.isFinite(x.comparisonRepublicanMargin)||!Number.isFinite(x.weight)||x.weight<0||x.weight>0.2||x.year<2018||x.year>=2026))throw Error('Invalid candidate performance input '+r.code);
   const candidateShift=+(candidateComparisons.reduce((sum,x)=>sum+(x.referenceRepublicanMargin-x.comparisonRepublicanMargin)*x.weight,0)).toFixed(2);
   const historicalMargin=pollMargin!==null&&correction!==null?+((pollMargin-correction).toFixed(2)):null;
   const adjustedMargin=historicalMargin!==null?+(historicalMargin+candidateShift).toFixed(2):null;
   return {...r,model:{pollMargin,adjustedMargin,historicalMargin,candidateShift,candidateComparisons,correction,years:history?.years||history?.evidence?.map(e=>e.year)||[],
     events:history?.evidence||[],calibrationEvents:history?.evidence?.length||0,
     calibrationCycles:history?.evidence?.length||0,
     source:history?'Prior '+history.evidence.length+' governor election(s) in '+r.state+' only; weighted newest first':'No verified prior governor polling-error comparison in '+r.state+' in the current source archive',
     method:'Ervin’s Take uses same-state governor polling errors, most recent three 2018–2024 events weighted 50/30/20 and renormalized. Where documented, add a separately sourced and strongly discounted statewide candidate-performance context shift; never federal polling errors.',
     correctionDefinition:'Governor error = prior governor D–R polling margin minus prior governor actual margin. Ervin’s Take = current governor poll margin − same-office historical error + any documented discounted candidate-relative result shift.',
     asOf:archive?.asOf||'2026-11-02',fallback:!history,missingPolling:pollMargin===null,
     weakEvidence:!history||history.evidence.length<3,
     currentPollingSource:r.poll?.url||null}};
 });
 const currentSenate=Object.entries(senate?.states||{}).map(([code,r])=>({code,...r,office:'Senate',model:{pollMargin:Number.isFinite(r.pollMargin)?r.pollMargin:null,adjustedMargin:Number.isFinite(r.adjustedMargin)?r.adjustedMargin:null,asOf:senate.asOf||'2026-11-02',method:'Original Ervin federal Senate forecast unchanged',source:r.source||'Existing Senate forecast'}}));
 return {asOf:archive?.asOf||'2026-11-02',method:'Governor-only historical state errors (2018–2024), strictly separate from the existing original federal Senate model',historicalSources:archive?.sourcesScope||'Archived governor polling averages and governor election results',
 governor,senate:currentSenate,summary:{governorRaces:governor.length,withPublishedPolling:governor.filter(x=>x.model.pollMargin!==null).length,adjustedGovernorRaces:governor.filter(x=>x.model.adjustedMargin!==null).length,stateErrorHistory:governor.filter(x=>!x.model.fallback).length,senateRaces:currentSenate.length}};
}
const formatMargin=x=>x===null||!Number.isFinite(x)?'Not estimated':Math.abs(x)<.05?'Even':(x>0?'D +':'R +')+Math.abs(x).toFixed(1);
const api={apply,formatMargin};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ERVIN_STATEWIDE=api;
})(typeof window!=='undefined'?window:globalThis);