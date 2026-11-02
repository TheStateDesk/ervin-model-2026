/* Original Ervin statewide transfer: exact archived Senate per-state original corrections.
 * NO Ervin+ pooling, recency shrinkage, or region extrapolation. If a governor
 * state has no original comparable state-history sample, display its raw poll
 * separately and mark model adjustment unavailable; never invent a correction.
 * Sign convention: polling D-R minus actual D-R, adjusted=poll-correction.
 */
(function(root){'use strict';
function apply(archive,govs,senate){
 const entries=archive?.senateStates||{}, governor=(govs?.races||[]).map(r=>{
  const ref=entries[r.code],raw=Number.isFinite(r.poll?.margin)?r.poll.margin:null;
  const transferable=!!ref&&ref.historyMode==='standard'&&Number.isFinite(ref.correction);
  const correction=transferable?ref.correction:null;
  const adjusted=raw!==null&&correction!==null?Math.round((raw-correction)*100)/100:null;
  const ev=ref?.events||[];
  return {...r,model:{pollMargin:raw,adjustedMargin:adjusted,correction,
   years:[...new Set(ev.map(x=>x.year))],events:ev,
   calibrationEvents:ev.length,calibrationCycles:new Set(ev.map(x=>x.year)).size,
   source:transferable?'Same original Senate-state correction, transferred to governor race':'Original state-specific correction not available or not comparable; unadjusted publisher margin shown separately',
   asOf:'2026-11-02',method:'Original Ervin 2016–2024 state Senate/presidential historical-error correction — exact archived state correction, not Ervin+',
   correctionDefinition:'Historical D-minus-R poll error = poll − actual. For comparable state history, governor estimate = current publisher margin − the same original Senate-state correction.',
   fallback:!transferable,missingPolling:raw===null}};
 });
 const currentSenate=Object.entries(senate?.states||{}).map(([code,r])=>({code,...r,office:'Senate',model:{pollMargin:Number.isFinite(r.pollMargin)?r.pollMargin:null,adjustedMargin:Number.isFinite(r.adjustedMargin)?r.adjustedMargin:null,asOf:senate.asOf||'2026-11-02',method:'Original Ervin — existing Senate forecast unchanged',source:r.source||'Existing original Senate calculation'}}));
 return{asOf:'2026-11-02',method:'Verbatim Original Ervin state error correction where state history comparable; elsewhere no manufactured model adjustment',historicalSources:archive?.method||'Original Senate reference states',governor,senate:currentSenate,summary:{governorRaces:governor.length,withPublishedPolling:governor.filter(r=>r.model.pollMargin!==null).length,adjustedGovernorRaces:governor.filter(r=>r.model.adjustedMargin!==null).length,stateErrorHistory:governor.filter(r=>!r.model.fallback).length,senateRaces:currentSenate.length}};
}
const formatMargin=x=>x===null||!Number.isFinite(x)?'Not estimated':Math.abs(x)<.05?'Even':(x>0?'D +':'R +')+Math.abs(x).toFixed(1);
const api={apply,formatMargin};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ERVIN_STATEWIDE=api;
})(typeof window!=='undefined'?window:globalThis);