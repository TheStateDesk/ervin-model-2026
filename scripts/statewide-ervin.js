/* Ervin statewide method: apply the EXACT same pooled 2016-24 Senate/presidential correction,
 * not a new gubernatorial calibration fitted to unavailable governor history.
 * D-R sign convention, error = polled D-R minus actual D-R. Adjusted = poll - error.
 */
(function(root){'use strict';
function apply(archived,govs,senate){
 if(!root.ERVIN_ENGINE?.calibrate)throw Error('Original Ervin calibration engine missing');
 const events=archived?.events||[];
 const governor=(govs?.races||[]).map(r=>{
  const calibration=root.ERVIN_ENGINE.calibrate(events,r.code,2026);
  const pollMargin=Number.isFinite(r.poll?.margin)?r.poll.margin:null;
  const adjustedMargin=pollMargin===null?null:+(pollMargin-calibration.correction).toFixed(2);
  const own=events.filter(e=>e.state===r.code&&e.year>=2016&&e.year<2026).sort((a,b)=>a.year-b.year);
  return {...r,model:{pollMargin,adjustedMargin,correction:+calibration.correction.toFixed(3),
   years:[...new Set(own.map(e=>e.year))],events:own.map(e=>({year:e.year,office:e.office,poll:e.poll,actual:e.actual,error:e.error,url:e.url,nPollsters:e.nPollsters})),
   calibrationEvents:calibration.events,calibrationCycles:calibration.cycles,source:own.length?'State history and regional/national partial pooling':'Regional/national fallback only — no comparable local historical polling errors in current archive',
   asOf:'2026-11-02',method:'Original Ervin 2016–2024 Senate/presidential error correction; Governor transfer is provisional and not governor-backtested',
   correctionDefinition:'Historical D-minus-R poll margin minus actual margin, attenuated by the existing calibrator; adjusted margin = current poll margin minus expected error.',
   fallback:!own.length,missingPolling:pollMargin===null}};
 });
 const currentSenate=Object.entries(senate?.states||{}).map(([code,r])=>({code,...r,office:'Senate',model:{pollMargin:Number.isFinite(r.pollMargin)?r.pollMargin:null,adjustedMargin:Number.isFinite(r.adjustedMargin)?r.adjustedMargin:null,asOf:senate.asOf||'2026-11-02',method:'Original Ervin — existing Senate forecast preserved',source:r.source||'Existing original Senate calibration'}}));
 return {asOf:'2026-11-02',method:'Original Ervin 2016–2024 pooled historical polling-error engine, reused unchanged',historicalSources:archived?.method||'2016–2024 published Senate and presidential poll errors',governor,senate:currentSenate,
 summary:{governorRaces:governor.length,withPublishedPolling:governor.filter(x=>x.model.adjustedMargin!==null).length,stateErrorHistory:governor.filter(x=>!x.model.fallback).length,senateRaces:currentSenate.length}};
}
const formatMargin=x=>x===null||!Number.isFinite(x)?'No comparable average':Math.abs(x)<0.05?'Even':(x>0?'D +':'R +')+Math.abs(x).toFixed(1);
const api={apply,formatMargin};if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ERVIN_STATEWIDE=api;
})(typeof window!=='undefined'?window:globalThis);