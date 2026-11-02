
/* Model baseline and verified reported-vote margin — explicitly separate. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const fmt=(v)=>Math.abs(v).toFixed(1);
function setPointer(el,value){if(!Number.isFinite(value)){el.hidden=true;return;}el.hidden=false;el.style.top=(50-Math.max(-20,Math.min(20,value))*2.15)+'%';}
function readCounts(){
 const dText=$('reportedD')?.textContent||'',rText=$('reportedR')?.textContent||'';
 const good=s=>/^\d[\d,]*$/.test(s.trim());
 if(!good(dText)||!good(rText)){$('miReportedMargin').textContent='Awaiting county votes';setPointer($('miLivePointer'),null);return;}
 const d=Number(dText.replace(/,/g,'')),r=Number(rText.replace(/,/g,''));if(!(d+r)){$('miReportedMargin').textContent='Awaiting county votes';setPointer($('miLivePointer'),null);return;}
 const margin=(d-r)/(d+r)*100;
 $('miReportedMargin').textContent=(margin>=0?'D +':'R +')+fmt(margin)+' pts';
 setPointer($('miLivePointer'),margin);
}
async function baseline(){
 try{
  const res=await fetch('../../research/senate-workbench-data.json',{cache:'force-cache'});if(!res.ok)throw Error('Model source unavailable');
  const config=await res.json();
  const mi=config?.states?.find(x=>x.code==='MI');if(!mi)throw Error('Michigan forecast unavailable');
  const shares={rcp:.40,ddhq:.29,win270:.21,silver:.10};
  const selected=Object.entries(shares).filter(([key])=>mi.sources?.[key]&&!mi.sources[key].proxy&&Number.isFinite(+mi.sources[key].value));
  if(!selected.length)throw Error('No comparable current polling sources');
  const total=selected.reduce((t,[,w])=>t+w,0),raw=selected.reduce((t,[key,w])=>t+w*Number(mi.sources[key].value),0)/total;
  const adjusted=raw-(Number(mi.correction)||0);
  $('miBaselineMargin').textContent=(adjusted>=0?'D +':'R +')+fmt(adjusted)+' pts';
  setPointer($('miPrePointer'),adjusted);
  $('miBaselineDetail').textContent='Source blend less Original Ervin historical R correction; static pre-election comparison only.';
 }catch(e){$('miBaselineMargin').textContent='Unavailable';$('miBaselineDetail').textContent=e.message;}
}
function init(){
 if(!$('miMarginWatch'))return;
 const obs=new MutationObserver(readCounts);
 for(const id of ['reportedD','reportedR']){const el=$(id);if(el)obs.observe(el,{childList:true,characterData:true,subtree:true});}
 baseline();readCounts();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
