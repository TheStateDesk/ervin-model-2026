/* Sourced historical presidential returns plus explicitly conditional 2026 statewide scenario.
 * 2026 county values are not independent polls, results, or validated outcome forecasts. */
(()=>{"use strict";
let promise;
async function load(){
 if(!promise)promise=fetch("../geo/county-history.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("County historical baseline missing");return r.json();}).catch(e=>{promise=null;throw e});
 return promise;
}
const margin=pair=>Array.isArray(pair)&&pair.length===2&&pair[0]+pair[1]>0?100*(pair[0]-pair[1])/(pair[0]+pair[1]):null;
const toFips=n=>String(n||"").padStart(5,"0");
function build(history,code,target){
 const items=Object.entries(history.counties||{}).filter(([f])=>f.startsWith(code));
 if(!items.length)return {source:"Missing historical county baselines",map:new Map(),covered:0,rawState:null,target:null};
 let d24=0,r24=0,d20=0,r20=0;
 for(const [,v] of items){if(v.y24){d24+=v.y24[0];r24+=v.y24[1]}if(v.y20){d20+=v.y20[0];r20+=v.y20[1]}}
 const m24=margin([d24,r24]),m20=margin([d20,r20]),stateSwing=Number.isFinite(m20)?m24-m20:0;
 const output=new Map(),boundedTarget=Number.isFinite(target)?Math.max(-85,Math.min(85,target)):null;
 let weightedSum=0,weight=0;
 for(const [fips,v] of items){
  const current=margin(v.y24),old=margin(v.y20),votes=v.y24?.[0]+v.y24?.[1]||0;
  if(current==null)continue;
  const regionalTrend=old==null?0:.18*((current-old)-stateSwing);
  const initial=boundedTarget==null?null:Math.max(-99.5,Math.min(99.5,current+(boundedTarget-m24)+regionalTrend));
  if(initial!=null){weightedSum+=initial*votes;weight+=votes}
  output.set(toFips(fips),{m24:current,m20:old,trend:current-(old??current),votes,expected:initial});
 }
 if(boundedTarget!=null&&weight){
  const correction=boundedTarget-weightedSum/weight;
  for(const rec of output.values())if(rec.expected!=null)rec.expected=Math.max(-99.5,Math.min(99.5,rec.expected+correction));
 }
 return {source:"2024/2020 county presidential baselines + conditional uniform statewide shift, regional trend at 18%, turnout weighting. Model illustration only, not calibrated.",map:output,covered:output.size,rawState:m24,target:boundedTarget};
}
window.ERVIN_SCENARIOS={load,build,margin};
})();