/* Governor forecasts: same-office, same-state gubernatorial polling-error comparisons.
 * Senate retains its existing Original Ervin forecasts WITHOUT modification.
 * The independent historic governor correction is sourced in
 * research/governor-same-office-2014-2022.json.
 */
(function(root){'use strict';
function apply(archive,govs,senate){
 if(!root.ERVIN_GOVERNOR_BACKTEST?.correction)throw Error('Governor-only historical model unavailable');
 const old=archive?.races||[];
 const governor=(govs?.races||[]).map(r=>{
   const history=root.ERVIN_GOVERNOR_BACKTEST.correction(old,r.code,2026);
   const pollMargin=Number.isFinite(r.poll?.margin)?r.poll.margin:null;
   const correction=history?.value??null;
   const adjustedMargin=pollMargin!==null&&correction!==null?+((pollMargin-correction).toFixed(2)):null;
   return {...r,model:{pollMargin,adjustedMargin,correction,years:history?.years||history?.evidence?.map(e=>e.year)||[],
     events:history?.evidence||[],calibrationEvents:history?.evidence?.length||0,
     calibrationCycles:history?.evidence?.length||0,
     source:history?'Prior '+history.evidence.length+' governor election(s) in '+r.state+' only; weighted newest first':'No verified prior governor polling-error comparison in '+r.state+' in the current source archive',
     method:'Same-state Governor vs Governor: prior 2022 (50%), 2018 (30%), 2014 (20%) when available; available weights renormalized. No federal Senate or presidential errors.',
     correctionDefinition:'Error = governor D–R polling margin minus governor D–R actual result; adjusted 2026 governor margin = current published polling margin minus weighted historic governor error.',
     asOf:archive?.asOf||'2026-11-02',fallback:!history,missingPolling:pollMargin===null,
     weakEvidence:!history||history.evidence.length<3,
     currentPollingSource:r.poll?.url||null}};
 });
 const currentSenate=Object.entries(senate?.states||{}).map(([code,r])=>({code,...r,office:'Senate',model:{pollMargin:Number.isFinite(r.pollMargin)?r.pollMargin:null,adjustedMargin:Number.isFinite(r.adjustedMargin)?r.adjustedMargin:null,asOf:senate.asOf||'2026-11-02',method:'Original Ervin federal Senate forecast unchanged',source:r.source||'Existing Senate forecast'}}));
 return {asOf:archive?.asOf||'2026-11-02',method:'Governor-only historical state errors (2014/2018/2022), strictly separate from the existing original federal Senate model',historicalSources:archive?.sourcesScope||'Archived governor polling averages and governor election results',
 governor,senate:currentSenate,summary:{governorRaces:governor.length,withPublishedPolling:governor.filter(x=>x.model.pollMargin!==null).length,adjustedGovernorRaces:governor.filter(x=>x.model.adjustedMargin!==null).length,stateErrorHistory:governor.filter(x=>!x.model.fallback).length,senateRaces:currentSenate.length}};
}
const formatMargin=x=>x===null||!Number.isFinite(x)?'Not estimated':Math.abs(x)<.05?'Even':(x>0?'D +':'R +')+Math.abs(x).toFixed(1);
const api={apply,formatMargin};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ERVIN_STATEWIDE=api;
})(typeof window!=='undefined'?window:globalThis);