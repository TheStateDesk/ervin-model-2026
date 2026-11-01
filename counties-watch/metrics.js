/* Deterministic, explicit Senate turnout / county-pacing scenarios.
 * NOT polling results, a calibrated forecast, or a guaranteed turnout model.
 * Live county comparisons require complete, attributed reporting.
 */
(function(root){"use strict";
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const shares=v=>v?.d+v?.r>0?v.d/(v.d+v.r):null;
const safe=(n)=>Number.isFinite(n)?n:null;
function county(unit,state,forecast,turnout=.8){
 const presState=state?.stateCycles?.["2024"];
 const historical=shares(unit?.v24),stateShare=presState?.share;
 if(historical==null||!Number.isFinite(stateShare)||stateShare<=0||stateShare>=1)return null;
 const twoParty=unit.v24.d+unit.v24.r;
 const total=Math.max(1,Math.round(twoParty*clamp(Number(turnout)||.8,.4,1.3)));
 const shift=.5-stateShare;
 const tieShare=clamp(historical+shift,.01,.99);
 const margin=Number(forecast?.adjustedMargin);
 const hasModel=Number.isFinite(margin)&&forecast?.mode==="Original Ervin";
 const modelTarget=hasModel?clamp(historical+(.5+margin/200-stateShare),.01,.99):null;
 const targets=(share)=>share==null?null:{share, nonRVotes:Math.round(total*share),repVotes:total-Math.round(total*share),
   nonRMargin:2*Math.round(total*share)-total,turnoutMajorParty:total};
 const v20=unit.v20,v16=unit.v16;
 const tr20=v20?.total>0?(unit.v24.total/v20.total-1)*100:null;
 const tr16=v16?.total>0?(unit.v24.total/v16.total-1)*100:null;
 const drift=unit.m20!=null?unit.m24-unit.m20:null;
 return {total, historicalShare:historical,
  totalBallots24:unit.v24.total,ballotsChange20:safe(tr20),ballotsChange16:safe(tr16),
  majorParty24:twoParty,minorParty24:Math.max(0,unit.v24.total-twoParty),
  netVotes24:unit.v24.d-unit.v24.r,marginShift20to24:safe(drift),
  tie:targets(tieShare),model:targets(modelTarget),
  adjustmentPts:modelTarget==null?null:100*(modelTarget-historical),
  baselineStateShare:stateShare,baselineCountyShare:historical,
  statewideTarget:hasModel?.5+margin/200:null};
}
function state(state,forecast,turnout=.8){
 const p=state?.stateCycles?.["2024"];
 if(!p?.d||!p?.r)return null;
 const total=Math.round((p.d+p.r)*clamp(Number(turnout)||.8,.4,1.3));
 const margin=Number(forecast?.adjustedMargin);
 const hasModel=forecast&&forecast.mode==="Original Ervin"&&Number.isFinite(margin);
 const targetShare=hasModel?clamp(.5+margin/200,.01,.99):null;
 const n=targetShare==null?null:Math.round(total*targetShare);
 return {total,turnoutPct:turnout*100,
  tieNonR:Math.ceil(total/2),tieR:Math.floor(total/2),
  modelShare:targetShare,modelNonR:n,modelR:n==null?null:total-n,
  raceMarginalPts:hasModel?margin:null,turnoutChange24:(turnout-1)*100};
}
function countyPace(unit,report,state,forecast,turnout=.8){
 const target=county(unit,state,forecast,turnout);
 if(!target||!report)return {status:"unavailable"};
 const d=Number(report.dem),r=Number(report.rep),other=Number(report.other);
 if(![d,r,other].every(x=>Number.isSafeInteger(x)&&x>=0)||d+r===0)return {status:"unavailable"};
 const reported=d+r;
 const observedShare=d/reported;
 const completeness=report.reportingStatus==="complete";
 const assumedFraction=reported/target.total;
 // Computed even for partial returns as context, but never labeled winning/losing pace.
 const model=target.model;
 const offset=model?Math.round(d-reported*model.share):null;
 return {status:completeness?"complete":"partial",reported,other,
  observedShare,estimatedMajorPartyTurnout:target.total,
  turnoutVsScenario:assumedFraction*100,
  observedMarginVotes:d-r,
  offsetModelVotes:completeness?offset:null,
  offsetTieVotes:completeness?Math.round(d-reported*target.tie.share):null,
  paceLabel:!completeness?"Partial: trend not comparable":model?(offset>=0?"At or above model benchmark":"Below model benchmark"):"No model benchmark"};
}
function turnoutScenarios(unit,state,forecast,levels=[.65,.8,1]){
 return levels.map(fraction=>{
  const c=county(unit,state,forecast,fraction),s=state?null:null;
  return {fraction,county:c};
 });
}
function stateTurnoutScenarios(stateRecord,forecast,levels=[.65,.8,1]){
 return levels.map(fraction=>({fraction,state:state(stateRecord,forecast,fraction)}));
}
function outstandingTarget(nonR,rep,assumedTotal){
 if(![nonR,rep,assumedTotal].every(x=>Number.isFinite(x)&&x>=0))return null;
 const remaining=Math.round(assumedTotal-nonR-rep);
 if(remaining<=0)return {remaining:0,required:null,share:null,possible:null};
 const needed=Math.floor((rep+remaining-nonR)/2)+1;
 return {remaining,required:Math.max(0,needed),
  share:clamp(needed/remaining,0,1),possible:needed<=remaining,unboundedRequired:needed,
  alreadyAhead:needed<=0};
}
root.ERVIN_WATCH_METRICS=Object.freeze({county,state,countyPace,turnoutScenarios,stateTurnoutScenarios,outstandingTarget});
})(window);
