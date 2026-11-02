
/* Official state-count mirror through Open America. Never use these race totals as turnout rates. */
(()=>{'use strict';
const ROOT='https://openamerica.io/elections/results.json?year=2026&office=';
const $=id=>document.getElementById(id);
const offices=['Senate','Governor','House'];
const record={},lastFetch={};
let selected='Senate',busy=false;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const n=x=>Number(x||0).toLocaleString('en-US');
function dateText(s){const d=new Date(s);return Number.isNaN(+d)?'No timestamp':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});}
function valid(d,office){
 return d&&d.api===1&&d.year===2026&&d.office===office&&d.races&&typeof d.races==='object'&&!Array.isArray(d.races)&&typeof d.counting==='boolean';
}
function status(text,kind){$('liveStatus').textContent=text;$('livePulse').className='er-live-pulse'+(kind==='live'?' is-live':kind==='late'?' is-late':'');}
function keyURL(key){
 const part=key.split('-'),code=part[0].slice(0,2);
 if(selected==='House')return '../?office=house&state='+encodeURIComponent(code)+'&district='+encodeURIComponent(part[1]||'00');
 return '../?office='+selected.toLowerCase()+'&state='+encodeURIComponent(code);
}
function draw(){
 const data=record[selected],query=($('liveFind').value||'').trim().toLowerCase(),list=$('liveRows');
 if(!data){list.innerHTML='<div class="er-live-empty">Official result data is not connected right now. Polling forecasts remain accessible independently.</div>';return;}
 const rows=Object.entries(data.races).filter(([,race])=>race&&Number.isSafeInteger(race.total)&&race.total>0&&Array.isArray(race.cands));
 const counted=rows.reduce((total,[,r])=>total+r.total,0);
 $('liveRaceCount').textContent=rows.length.toLocaleString('en-US');
 $('liveTotalVotes').textContent=rows.length?n(counted):'Awaiting votes';
 $('liveFeedDate').textContent=data.as_of?dateText(data.as_of):'No result timestamp';
 $('liveFeedTime').textContent=data.as_of?'Feed-wide latest source update: '+dateText(data.as_of):'No vote update timestamp yet';
 $('liveCoverage').textContent='Official state-office reports via Open America; 22-state adapter coverage, varying by contest. Missing states are not zero.';
 status(data.live?'Live official counts':data.stale?'Reported figures may be delayed':data.final?'Reported precincts complete for covered races':data.counting?'Counting · source freshness unconfirmed':'Pre-election · awaiting votes',data.live?'live':data.stale?'late':'waiting');
 $('liveRefreshed').textContent='Checked: '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
 const filtered=rows.filter(([key,r])=>(key+' '+r.cands.map(c=>c.n).join(' ')).toLowerCase().includes(query)).sort((a,b)=>b[1].total-a[1].total);
 $('liveMatches').textContent=query?' · '+filtered.length+' matching':' · '+rows.length+' with votes';
 if(!rows.length){list.innerHTML='<div class="er-live-empty">No official 2026 votes have been reported in the supported '+esc(selected.toLowerCase())+' feed yet. Predictions, ratings and 2024 historical returns are not presented as 2026 results.</div>';return;}
 list.innerHTML=filtered.slice(0,120).map(([key,r])=>{
  const d=r.cands.filter(c=>c.p==='D').reduce((v,c)=>v+(Number(c.v)||0),0);
  const rep=r.cands.filter(c=>c.p==='R').reduce((v,c)=>v+(Number(c.v)||0),0);
  const other=Math.max(0,r.total-d-rep);
  const pct=x=>r.total?100*x/r.total:0;
  const leaders=[...r.cands].sort((a,b)=>(Number(b.v)||0)-(Number(a.v)||0)).slice(0,2).map(c=>esc(c.n)+' '+n(c.v)).join(' · ');
  const progress=typeof r.pct_in==='number'&&r.pct_in>=0&&r.pct_in<=100?r.pct_in.toFixed(1)+'% precincts reporting':'Precinct progress unavailable';
  return '<article class="er-live-race"><div><h3><a href="'+keyURL(key)+'">'+esc(key)+' · '+esc(selected)+'</a></h3><div class="er-live-sub">'+leaders+'</div></div>'+
   '<div><div class="er-live-sub">Vote share among ballots counted</div><div class="er-live-votes" role="img" aria-label="D '+pct(d).toFixed(1)+'%, R '+pct(rep).toFixed(1)+'%, other '+pct(other).toFixed(1)+'%"><span class="d" style="width:'+pct(d)+'%"></span><span class="r" style="width:'+pct(rep)+'%"></span><span class="other" style="width:'+pct(other)+'%"></span></div><div class="er-live-sub">'+progress+'</div></div>'+
   '<div class="er-live-figure">'+n(r.total)+'<small>votes reported · not a race call</small></div></article>';
 }).join('')+(filtered.length>120?'<div class="er-live-empty">Showing 120 matching races. Narrow the search for more.</div>':'');
}
async function load(office,force){
 if(lastFetch[office]&&Date.now()-lastFetch[office]<60000&&!force)return;
 if(lastFetch[office]&&Date.now()-lastFetch[office]<59000)return;
 lastFetch[office]=Date.now();
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try{
  const resp=await fetch(ROOT+encodeURIComponent(office),{mode:'cors',credentials:'omit',cache:'no-cache',signal:ctl.signal});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  const data=await resp.json();if(!valid(data,office))throw Error('Unexpected feed format');
  record[office]=data;
 }catch(e){if(selected===office){status('Official feed unavailable · previous published data may be old','late');$('liveRefreshed').textContent='Connection error: '+e.message;}}
 finally{clearTimeout(timer);if(office===selected)draw();}
}
function init(){
 const root=$('liveNationalDesk');if(!root)return;
 $('liveOffice').onchange=e=>{selected=e.target.value;draw();load(selected);};
 $('liveFind').oninput=draw;
 $('liveReload').onclick=()=>load(selected);
 $('liveOffice').value=selected;
 draw();load(selected);
 setInterval(()=>{if(!document.hidden)load(selected);},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(selected);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
