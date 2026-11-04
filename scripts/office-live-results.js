/* Validated election-night coverage for House and governor directories. Forecasts stay frozen. */
(()=>{'use strict';
const office=document.body.dataset.liveOffice,host=document.getElementById('officeLiveStatus');
if(!host||!['House','Governor'].includes(office))return;
const counter=document.getElementById('officeLiveCount'),core=window.ERVIN_RETURNS;
let saved={},busy=false,health=null;
const safeFetch=async(url)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),11000);
 try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error(url+' '+r.status);return r.json()}finally{clearTimeout(t)}};
async function refresh(){
 if(busy)return;busy=true;
 try{
  if(!core)throw Error('Provider validator unavailable');
  const mirrorURL='https://openamerica.io/elections/results.json?year=2026&office='+office;
  const [primary,audit,mirror]=await Promise.allSettled([
   safeFetch('../civicapi/races.json'),safeFetch('../civicapi/discovery.json'),
   window.ERVIN_EXTERNAL_FEED?window.ERVIN_EXTERNAL_FEED.json(mirrorURL,{timeout:11000}):safeFetch(mirrorURL)
  ]);
  if(audit.status==='fulfilled'&&audit.value?.election==='2026-11-03')health=audit.value;
  const first=primary.status==='fulfilled'?core.civic(primary.value):{};
  const second=mirror.status==='fulfilled'?core.openAmerica(mirror.value,office):{};
  saved=core.reconcile([core.preferCivic(first,second).races],saved).races;
  const races=Object.fromEntries(Object.entries(saved).filter(([,r])=>r.office===office));
  const n=Object.keys(races).length,max=office==='House'?435:36;
  const newest=Object.values(races).map(r=>Date.parse(r.asOf)).filter(Number.isFinite);
  const timestamp=newest.length?new Date(Math.max(...newest)).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):null;
  const nCivic=Object.values(races).filter(r=>r.source?.includes('CivicAPI')).length;
  host.textContent=n?n+' of '+max+' '+office.toLowerCase()+' races reporting unofficial votes · '+nCivic+' CivicAPI, '+(n-nCivic)+' attributed fallback'+(timestamp?' · newest report '+timestamp:'')+'.':
   'No independently validated '+office.toLowerCase()+' results in current sources; pre-election ratings are not vote totals.';
  const checked=Date.parse(health?.checkedAt||'');
  if(Number.isFinite(checked)&&Date.now()-checked>1800000)host.textContent+=' National collector snapshot is more than 30 minutes old.';
  if(counter)counter.textContent=n+' reporting / '+max;
  window.ERVIN_OFFICE_LIVE={office,races,health};
  window.dispatchEvent(new CustomEvent('ervin:office-results',{detail:{office,races,health}}));
 }catch(e){host.textContent='Results update unavailable; pre-election forecasts remain visible. '+String(e.message||e).slice(0,55)}
 finally{busy=false}
}
refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();