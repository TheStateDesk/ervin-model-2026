
/* Ervin election dossier / official result verification and a distinct two-marker margin scale. */
(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const office=['senate','house','governor'].includes(params.get('office'))?params.get('office'):'governor';
const state=String(params.get('state')||'MI').toUpperCase().slice(0,2);
const district=String(params.get('district')||'01').padStart(2,'0').slice(-2);
const feedOffice=office[0].toUpperCase()+office.slice(1);
const code=office==='house'?state+'-'+district:state;
const BASE='https://openamerica.io/elections/results.json?year=2026&office=';
const CLOSE=Date.parse('2026-11-03T18:00:00-05:00');
let latest=null,countyFeed=null,fetchAt=0,lastResultAt=0,sourceError=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-US');
function datetime(s){const d=new Date(s);return Number.isNaN(+d)?'Unverified':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'});}
function setStatus(t,kind){$('erNightStatus').textContent=t;$('erNightDot').className='er-night-dot'+(kind?' is-'+kind:'');}
function baseline(){
 const el=$('leadValue'),raw=el?.textContent||'',value=raw.match(/\+\s*(\d+(?:\.\d+)?)/);
 const ambiguous=($('raceDeck')?.textContent||'').includes('independent')&&office==='senate';
 if(!value||office==='house'||ambiguous){$('erPreMargin').textContent='Not estimated';$('erPreMarker').hidden=true;return null;}
 const v=Number(value[1])*(el.classList.contains('race-negative')?-1:1);
 $('erPreMargin').textContent=(v>=0?'Non-R +':'R +')+Math.abs(v).toFixed(1)+' pts';
 $('erPreMarker').hidden=false;$('erPreMarker').style.top=(50-Math.max(-25,Math.min(25,v))*1.75)+'%';
 $('erPreDetail').textContent=office==='senate'?'Original Ervin pre-election polling adjustment':'Published governor polling average; not an Ervin forecast';
 return v;
}
function updateGauge(race){
 baseline();
 const r=race?.cands?.filter(c=>c.p==='R').reduce((v,c)=>v+(Number(c.v)||0),0)||0;
 const d=race?.cands?.filter(c=>c.p==='D').reduce((v,c)=>v+(Number(c.v)||0),0)||0;
 const total=Number(race?.total)||0;
 if(!total||!(d||r)){$('erLiveMargin').textContent='Awaiting votes';$('erLiveMarker').hidden=true;return;}
 const delta=(d-r)*100/total;
 $('erLiveMargin').textContent=(delta>=0?'D +':'R +')+Math.abs(delta).toFixed(1)+' pts';
 $('erLiveMarker').style.top=(50-Math.max(-25,Math.min(25,delta))*1.75)+'%';
 $('erLiveMarker').hidden=false;
 $('erLiveDetail').textContent='Reported D–R margin as % of all votes counted; not a final-vote estimate';
}
function show(race,data){
 if(!race||!Number.isSafeInteger(race.total)||race.total<=0||Date.now()<CLOSE){
  $('votesReported').textContent='Awaiting returns';$('countiesReported').textContent='Not available';$('outstanding').textContent='Not calculated';
  $('nightCandidates').replaceChildren();$('erLiveMargin').textContent='Awaiting votes';$('erLiveMarker').hidden=true;
  $('resultNotice').textContent='No confirmed 2026 results for this contest in the connected 22-state source. A missing contest is not a vote total of zero. Check the original state election office for newer reports.';
  setStatus(Date.now()<CLOSE?'Pre-election · no votes counted':'No matching official-source race',null);
  return;
 }
 $('votesReported').textContent=fmt(race.total);
 $('countiesReported').textContent=typeof race.pct_in==='number'&&race.pct_in>=0&&race.pct_in<=100?race.pct_in.toFixed(1)+'% precincts':'Not supplied by state';
 $('outstanding').textContent='Not estimated';
 $('nightCandidates').innerHTML=[...race.cands].sort((a,b)=>(Number(b.v)||0)-(Number(a.v)||0)).map(c=>
  '<div class="er-night-candidate"><span><span class="er-party">'+esc(c.p||'—')+'</span>'+esc(c.n)+'</span><strong>'+fmt(c.v)+' · '+(Number.isFinite(c.pct)?c.pct.toFixed(1):((Number(c.v)||0)/race.total*100).toFixed(1))+'%</strong></div>'
 ).join('');
 $('resultNotice').textContent='Unofficial votes reported by state election offices via Open America. Feed-wide latest-source timestamp: '+datetime(data.as_of)+'. '+(data.stale?'Provider marks the feed as stale. ':data.live?'Provider marks the feed as live. ':'Provider freshness not confirmed. ')+'No independent race call is made here.';
 setStatus(data.stale?'Published results · possibly delayed':data.live?'Source reporting live':'Published unofficial results',data.stale?'stale':data.live?'live':null);
 updateGauge(race);
}
async function readResults(){
 if(Date.now()-lastResultAt<59000)return;
 lastResultAt=Date.now();$('erRefresh').disabled=true;setStatus('Checking attributed state returns',null);
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),11000);
 try{
  const res=await fetch(BASE+encodeURIComponent(feedOffice),{mode:'cors',credentials:'omit',cache:'no-cache',signal:ctrl.signal});
  if(!res.ok)throw Error('HTTP '+res.status);
  const p=await res.json();if(p.api!==1||p.year!==2026||p.office!==feedOffice||!p.races||typeof p.counting!=='boolean')throw Error('Unexpected official feed schema');
  latest=p;sourceError=false;
  const row=p.races[code];show(row,p);
  $('erChecked').textContent='Checked '+datetime(new Date().toISOString());
 }catch(e){sourceError=true;setStatus('Source unavailable · prior data may be old','stale');$('erChecked').textContent='Request failed: '+e.message;
  if(!latest)$('resultNotice').textContent='Official feed cannot be checked from this browser. No vote figures are claimed. Follow the state election office link below.';
 }finally{clearTimeout(timeout);$('erRefresh').disabled=false;}
}
function normalize(n){return String(n||'').trim().toLowerCase().replace(/ county$/,'');}
function recolor(){
 const mode=$('countyMapMode')?.value;if(mode!=='2026live')return;
 const shapes=$('countyMap')?.querySelectorAll('path.county')||[];
 let count=0;
 for(const shape of shapes){
  const r=state==='MI'?countyFeed?.get(normalize(shape.dataset.name)):null;
  const total=r?Number(r.dem)+Number(r.rep)+Number(r.other||0):0;
  const margin=total>0?100*(r.dem-r.rep)/total:null;
  shape.style.fill=margin==null?'#92a1af':margin>=0?(margin>15?'#2e6e9c':'#8bb2d2'):(margin < -15?'#a84d60':'#dfa0aa');
  shape.setAttribute('aria-label',shape.dataset.name+' County, '+(r?'unofficial verified votes available':'2026 votes not connected'));
  if(r)count++;
 }
 $('countyMapLegend').textContent=state==='MI'?count+' / 83 Michigan counties with attributed 2026 Senate county-wide tallies · gray = unreported':'2026 county-wide feed not connected for this state · geography only';
 $('mapDate').textContent='2026 official-source returns · no invented county results';
 $('mapProvenance').textContent='County colors reflect verified, attributed 2026 local totals only where supported. For other states, 2026 county results are not connected; historical boundaries remain available.';
}
window.ErvinCountyLayer=recolor;
async function readCounties(){
 if(state!=='MI'||office!=='senate')return;
 try{
  const res=await fetch('../michigan/election-night/county_totals.json?check='+Math.floor(Date.now()/30000),{cache:'no-store'});
  if(!res.ok)throw Error('No verified county feed');
  const payload=await res.json();
  if(payload.version!==1||payload.election!=='2026-11-03'||payload.office!=='US Senate'||!Array.isArray(payload.counties))throw Error('Invalid county schema');
  const ok=new Map();
  for(const row of payload.counties){
   if(!row||typeof row.county!=='string'||!Number.isSafeInteger(row.dem)||!Number.isSafeInteger(row.rep)||row.dem<0||row.rep<0||!/^https:\/\//.test(row.sourceUrl||''))continue;
   const stamp=Date.parse(row.asOf),close=Date.parse('2026-11-03T20:00:00-05:00');
   if(!Number.isFinite(stamp)||stamp<close||stamp>Date.now()+300000)continue;
   ok.set(normalize(row.county),row);
  }
  countyFeed=ok;recolor();
 }catch(e){if(!countyFeed)countyFeed=new Map();recolor();}
}
function initMap(){
 const svg=$('countyMap');
 const button=$('erExpandMap'),panel=$('mapSection');
 button.onclick=()=>{const next=!panel.classList.contains('er-map-expanded');panel.classList.toggle('er-map-expanded',next);button.textContent=next?'Close large map':'Expand county map';button.setAttribute('aria-expanded',String(next));};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('er-map-expanded'))button.click();});
 const find=$('erCountyFind'),suggest=$('erCountySuggestions');
 const observer=new MutationObserver(()=>{
  if(!svg.querySelector('path.county'))return;
  suggest.innerHTML=[...svg.querySelectorAll('path.county')].map(p=>'<option value="'+esc(p.dataset.name)+'"></option>').join('');
  observer.disconnect();
 });
 observer.observe(svg,{childList:true,subtree:false});
 find.oninput=()=>{
  const t=normalize(find.value),paths=[...svg.querySelectorAll('path.county')];
  paths.forEach(p=>p.classList.toggle('is-found',!!t&&normalize(p.dataset.name)===t));
  const found=paths.find(p=>normalize(p.dataset.name)===t);
  if(found){found.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
 };
 svg.addEventListener('click',e=>{
  const path=e.target.closest?.('path.county');if(!path||$('countyMapMode')?.value!=='2026live')return;
  const row=countyFeed?.get(normalize(path.dataset.name));if(!row)return;
  $('countyInspector').textContent=path.dataset.name+' County · verified, attributed 2026 unofficial vote counts · '+fmt(row.dem)+' D, '+fmt(row.rep)+' R, '+fmt(row.other||0)+' other · '+datetime(row.asOf)+' · original reporting source: '+row.sourceUrl;
 });
}
function init(){
 if(!$('erNightStatus'))return;
 initMap();$('erRefresh').onclick=readResults;
 const obs=new MutationObserver(baseline);obs.observe($('leadValue'),{childList:true,characterData:true,attributes:true});baseline();
 readResults();readCounties();
 setInterval(()=>{if(!document.hidden)readResults();},60000);
 setInterval(()=>{if(!document.hidden&&Date.now()>=CLOSE)readCounties();},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){readResults();readCounties();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
