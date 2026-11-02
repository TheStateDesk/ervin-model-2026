(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const closeEastern=Date.parse('2026-11-03T20:00:00-05:00');
const closeCentral=Date.parse('2026-11-03T21:00:00-05:00');
const centralCounties=new Set(['Dickinson','Gogebic','Iron','Menominee']);
const countyDirectory='https://www.michigan.gov/sos/elections/election-results-and-data/candidate-listings-and-election-results-by-county';
const here='../michigan/election-night/';
const resultAPI='https://openamerica.io/elections/results.json?year=2026&office=';
const forecastURL='../counties-watch/forecast-baselines.json';
let all=[],races=[],filter='All',live={},geo=null,counties=[],selectedCounty='Wayne',sourceLinks={},history={},senate={},lastUpdated=0;
const countyOfficial=new Map(),countyAuto=new Map(),precinctRows=new Map(),countyResolved=new Map();
const tabular=n=>Number.isFinite(n)?fmt(n):'—';
const safeURL=v=>{try{const u=new URL(v,location.href);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
function isVote(n){return Number.isSafeInteger(n)&&n>=0&&n<12000000}
function date(t){if(!t)return 'Not published';const n=Date.parse(t);return Number.isFinite(n)?new Date(n).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Invalid timestamp'}
const upcoming=()=>Date.now()<closeEastern;
const fetchJSON=async(path,timeout=12000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{let r=await fetch(path,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()}finally{clearTimeout(timer)}};
function checkCountyFeed(payload,kind){
 if(!payload||payload.version!==1||payload.election!=='2026-11-03'||payload.office!=='US Senate'||!Array.isArray(payload.counties)||payload.counties.length>83)throw Error('Invalid '+kind+' county feed');
 const out=new Map(),published=Date.parse(payload.updatedAt||'');
 if(payload.counties.length&&(!Number.isFinite(published)||published> Date.now()+300000||published<closeEastern))throw Error('County timestamp invalid');
 for(const row of payload.counties){
  const c=counties.find(x=>x.name.toLowerCase()===String(row.county).toLowerCase());
  const ts=Date.parse(row.asOf||payload.updatedAt||'');
  if(!c||out.has(c.name)||![row.dem,row.rep,row.other].every(isVote)||row.dem+row.rep+row.other===0||!String(row.sourceUrl||'').startsWith('https://')||!Number.isFinite(ts)||ts<(centralCounties.has(c.name)?closeCentral:closeEastern)||ts>Date.now()+300000)throw Error('Unverified county '+row.county);
  out.set(c.name,{name:c.name,dem:row.dem,rep:row.rep,other:row.other,asOf:row.asOf||payload.updatedAt,url:row.sourceUrl,kind});
 }
 return out;
}
function checkPrecinct(payload){
 if(!payload||payload.version!==1||payload.election!=='2026-11-03'||payload.office!=='US Senate'||!Array.isArray(payload.precincts)||payload.precincts.length>15000)throw Error('Unrecognized precinct feed');
 const seen=new Set(),by=new Map();
 for(const p of payload.precincts){
  const county=counties.find(x=>x.name.toLowerCase()===String(p.county).toLowerCase());
  const t=Date.parse(p.asOf||'');
  if(!county||!p.precinct||![p.dem,p.rep,p.other].every(isVote)||!String(p.sourceUrl||'').startsWith('https://')||!Number.isFinite(t)||t<(centralCounties.has(county.name)?closeCentral:closeEastern)||t>Date.now()+300000)throw Error('Unverified precinct or invalid timestamp');
  const key=county.name.toLowerCase()+':'+String(p.precinct).toLowerCase();
  if(seen.has(key))throw Error('Duplicate reporting unit');seen.add(key);
  const old=by.get(county.name)||{name:county.name,dem:0,rep:0,other:0,units:0,url:p.sourceUrl,asOf:p.asOf,kind:'Partial precincts'};
  old.dem+=p.dem;old.rep+=p.rep;old.other+=p.other;old.units++;by.set(county.name,old);
 }
 return by;
}
function combineCounty(){
 countyResolved.clear();
 for(const [key,v] of precinctRows)countyResolved.set(key,v);
 for(const [key,v] of countyAuto)countyResolved.set(key,v);
 for(const [key,v] of countyOfficial)countyResolved.set(key,v);
 for(const county of counties){
  const path=$('miCountyMap').querySelector('path.county[data-name="'+CSS.escape(county.name)+'"]');
  if(!path)continue;
  const data=countyResolved.get(county.name);
  path.setAttribute('data-result',!data?'pending':data.dem>data.rep?'d':data.rep>data.dem?'r':'tie');
  const title=path.querySelector('title');if(title)title.textContent=county.name+' County · '+(data?'D '+fmt(data.dem)+' / R '+fmt(data.rep)+' · '+data.kind:'No reported votes');
 }
 const arr=[...countyResolved.values()],d=arr.reduce((s,r)=>s+r.dem,0),r=arr.reduce((s,x)=>s+x.rep,0);
 $('miD').textContent=arr.length?fmt(d):'—';$('miR').textContent=arr.length?fmt(r):'—';
 $('miCounties').textContent=arr.length+' / 83';
 $('miUpdated').textContent=arr.length?date(arr.map(x=>x.asOf).filter(Boolean).sort().at(-1)):'Not published';
 $('miFeedStatus').textContent=arr.length?'UNOFFICIAL MICHIGAN COUNTY RETURNS · '+arr.length+' counties. County-wide clerk returns replace overlapping precinct subtotals. Counted votes are not projected totals.':'No verified November 3 Michigan Senate county returns have been published to the site. The map shows official county boundaries, not votes.';
 $('miMapStatus').textContent=counties.length+' counties outlined · '+arr.length+' reporting';
 renderInspector();drawCounties();
}
function renderInspector(){
 const c=counties.find(x=>x.name===selectedCounty);if(!c)return;
 const h=history[String(c.fips)]||{},b=h.y24||null,source=sourceLinks[c.name]||countyDirectory;
 const prev=b&&b[0]+b[1]>0?100*(b[0]-b[1])/(b[0]+b[1]):null;
 const row=countyResolved.get(c.name);
 let swing='';
 if(row&&prev!==null&&row.dem+row.rep>0){const now=100*(row.dem-row.rep)/(row.dem+row.rep);swing='<p><strong>Two-party swing from 2024 presidential:</strong> '+(now-prev>=0?'+':'')+(now-prev).toFixed(1)+' D points · provisional comparison of different offices</p>'}
 $('miInspector').innerHTML='<strong>'+esc(c.name)+' County</strong><p>'+(row?'<strong>Reported:</strong> El-Sayed '+fmt(row.dem)+' · Rogers '+fmt(row.rep)+' · Other '+fmt(row.other)+'<br><strong>Source:</strong> '+esc(row.kind)+' · '+esc(date(row.asOf)):'Awaiting attributed 2026 county results')+'</p>'+(prev===null?'':'<p>2024 presidential two-party reference: '+(prev>=0?'D +':'R +')+Math.abs(prev).toFixed(1)+' points; historical context only.</p>')+swing+'<a href="'+safeURL(row?.url||source)+'" target="_blank" rel="noopener noreferrer">Open original county clerk source</a>';
 $('miCountyMap').querySelectorAll('path.county').forEach(p=>p.setAttribute('aria-selected',String(p.dataset.name===c.name)));
}
function drawCounties(){
 const q=$('miCountySearch').value.toLowerCase().trim();
 const ordered=counties.slice().sort((a,b)=>(countyResolved.has(b.name)?1:0)-(countyResolved.has(a.name)?1:0)||a.name.localeCompare(b.name));
 $('miCountyRows').innerHTML=ordered.filter(x=>!q||x.name.toLowerCase().includes(q)).map(x=>{const row=countyResolved.get(x.name);return '<tr><td><button type="button" data-name="'+esc(x.name)+'">'+esc(x.name)+'</button></td><td>'+(row?fmt(row.dem+row.rep+row.other):'—')+'</td><td><a href="'+safeURL(row?.url||sourceLinks[x.name]||countyDirectory)+'" target="_blank" rel="noopener noreferrer">'+(row?'Reported':'Clerk')+'</a></td></tr>'}).join('')||'<tr><td colspan="3">No counties match</td></tr>';
}
async function initCountyMap(){
 const g=await fetchJSON('../geo/counties/MI.json');geo=g;
 counties=(g.features||[]).map(f=>({fips:String(f.id),name:f.properties?.name})).filter(x=>x.name);
 if(counties.length!==83)throw Error('Michigan county shape coverage '+counties.length+' expected 83');
 window.ERVIN_GEO.draw($('miCountyMap'),g,{kind:'counties',className:'county',onSelect:(path,feature)=>{selectedCounty=feature.properties?.name||'';renderInspector();}});
 for(const path of $('miCountyMap').querySelectorAll('path.county')){
  const name=counties.find(x=>x.fips===path.dataset.fips||x.fips===path.dataset.id)?.name;
  const target=name||g.features.find(f=>String(f.id)===String(path.dataset.fips))?.properties?.name;
  const fallback=path.querySelector('title')?.textContent?.replace(' County','')?.trim();
  path.dataset.name=target||fallback||'';
  path.addEventListener('click',()=>{selectedCounty=path.dataset.name;renderInspector()});
 }
 const [a,b]=await Promise.allSettled([fetchJSON('../geo/county-history.json'),fetchJSON(here+'county_watch_sources.json')]);
 if(a.status==='fulfilled')history=a.value.counties||{};
 if(b.status==='fulfilled')sourceLinks=b.value.counties||{};
 renderInspector();combineCounty();
}
async function refreshCounty(){
 if(upcoming()){combineCounty();return}
 const locations=[here+'county_totals.json',here+'county_auto.json',here+'results.json'];
 const ans=await Promise.allSettled(locations.map(x=>fetchJSON(x)));
 let succeeded=0;
 for(let i=0;i<ans.length;i++){
  if(ans[i].status!=='fulfilled')continue;
  try{
   const parsed=i===2?checkPrecinct(ans[i].value):checkCountyFeed(ans[i].value,i===0?'County clerk':'Automated clerk');
   if(i===0){countyOfficial.clear();for(const [k,v] of parsed)countyOfficial.set(k,v)}
   if(i===1){countyAuto.clear();for(const [k,v] of parsed)countyAuto.set(k,v)}
   if(i===2){precinctRows.clear();for(const [k,v] of parsed)precinctRows.set(k,v)}
   succeeded++;
  }catch(e){console.warn('Reject invalid county feed',locations[i],e)}
 }
 if(!succeeded)$('miFeedStatus').textContent='Michigan county feeds unavailable or rejected as invalid. Latest previously validated results (if any) are retained and may be stale.';
 combineCounty();
}
function normalizeResults(data,office){
 if(!data||data.api!==1||data.year!==2026||data.office!==office||!data.races||typeof data.races!=='object'||!data.as_of)return null;
 const time=Date.parse(data.as_of);
 if(!Number.isFinite(time)||time<closeEastern||time>Date.now()+300000)return null;
 const valid={};
 for(const [key,r] of Object.entries(data.races)){
  if(!r||!Number.isSafeInteger(r.total)||r.total<=0||!Array.isArray(r.cands))continue;
  if(r.cands.some(c=>!isVote(c.v)||typeof c.n!=='string'))continue;
  if(Math.abs(r.cands.reduce((s,c)=>s+c.v,0)-r.total)>Math.max(10,r.total*.005))continue;
  valid[key]=r;
 }
 return {asOf:data.as_of,races:valid};
}
async function refreshNational(){
 if(upcoming()){$('feedStatus').textContent='Awaiting poll closing';$('countedRaces').textContent='—';return}
 const offices=['Senate','Governor','House'];
 const results=await Promise.allSettled(offices.map(x=>fetchJSON(resultAPI+x,11000)));
 let good=0;
 for(let i=0;i<results.length;i++){
  if(results[i].status!=='fulfilled')continue;
  const clean=normalizeResults(results[i].value,offices[i]);
  if(clean){live[offices[i]]=clean;good++}
 }
 const count=Object.values(live).reduce((n,x)=>n+Object.keys(x.races).length,0);
 $('countedRaces').textContent=fmt(count);$('feedStatus').textContent=good?count+' races with attributed counts · '+good+' office feeds':'Official results not yet available through this provider';
 const updated=Object.values(live).map(x=>x.asOf).sort().at(-1);
 $('feedAsOf').textContent=updated?date(updated):'Awaiting returns';
 $('lastRefresh').textContent='Checked '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'});
 drawRaces();
}
function lead(row){if(!row?.cands)return null;const ranked=row.cands.slice().sort((a,b)=>b.v-a.v);const top=ranked[0];return top?.n+' '+fmt(top?.v)+' · '+fmt(row.total)+' votes total'}
function raceURL(x){return x.office==='House'?'../state/?state='+encodeURIComponent(x.code)+'#house-'+Number(x.district):'../state/?state='+encodeURIComponent(x.code)+'#stateOverview'}
function renderRace(x){
 const data=live[x.office]?.races||{},key=x.office==='House'?x.id:x.code;
 const report=data[key]||data[x.code+'-'+(x.district||'')],reportText=report?lead(report):null;
 return '<article class="race-row" role="listitem"><div><h3>'+esc(x.office==='House'?x.id+' · '+x.state:x.state+' · '+x.office)+'</h3><small>'+esc(x.label||x.candidates||'')+'</small></div><div><span class="model-value">'+esc(x.modelText)+'</span><small>PRE-ELECTION ESTIMATE</small></div><div>'+(reportText?'<span class="live-value">'+esc(reportText)+'</span><small>COUNTED, UNOFFICIAL · NOT A CALL</small>':'<span class="no-data">No confirmed returns</span><small>NOT REPORTED TO THIS FEED</small>')+'</div><div><a href="'+raceURL(x)+'">State details</a></div></article>';
}
function drawRaces(){
 const q=$('raceFind').value.toLowerCase().trim(),kind=$('resultsFilter').value;
 const shown=races.filter(x=>(filter==='All'||x.office===filter)&&(!q||[x.code,x.id,x.state,x.label,x.candidates].join(' ').toLowerCase().includes(q))&&
 (kind!=='reported'||!!(live[x.office]?.races||{})[x.office==='House'?x.id:x.code])&&
 (kind!=='closest'||x.margin!==null&&Math.abs(x.margin)<=5));
 const top=shown.filter(x=>x.id==='MI-SENATE');const rest=shown.filter(x=>x.id!=='MI-SENATE').sort((a,b)=>a.office.localeCompare(b.office)||a.state.localeCompare(b.state)||String(a.district||'').localeCompare(String(b.district||'')));
 $('raceList').innerHTML=[...top,...rest].map(renderRace).join('')||'<p class="source-note">No races match the current filters.</p>';
 $('nationalCount').textContent=shown.length+' displayed · '+races.length+' indexed races, filtered without leaving this page';
}
async function loadRaces(){
 const [gov,house,sen,archive]=await Promise.all([fetchJSON('../governors/data.json'),fetchJSON('../house/data.json'),fetchJSON(forecastURL),fetchJSON('../research/calibration_events_2016_2024.json')]);
 const report=window.ERVIN_STATEWIDE.apply(archive,gov,sen);
 const houseForecast=await fetchJSON('../house/ervin-forecast-2026-11-02.json');
 senate=sen.states||{};
 const senRaces=report.senate.map(s=>({id:s.code+'-SENATE',code:s.code,state:s.state,office:'Senate',label:(s.nonR||'Independent/Democrat')+' vs. '+s.rep,margin:s.model.adjustedMargin,modelText:window.ERVIN_STATEWIDE.formatMargin(s.model.adjustedMargin)}));
 const govRaces=report.governor.map(g=>({id:g.code+'-GOVERNOR',code:g.code,state:g.state,office:'Governor',label:g.dem+' vs. '+g.rep,margin:g.model.adjustedMargin,modelText:window.ERVIN_STATEWIDE.formatMargin(g.model.adjustedMargin)}));
 const houseRaces=house.seats.map(h=>({id:h.id,code:h.code,state:h.state,district:h.district,office:'House',label:h.incumbent?'Historically: '+h.incumbent:'Candidate list not verified',margin:houseForecast.races[h.id]?.marginD??null,modelText:houseForecast.races[h.id]?.modelRating||'No model'}));
 races=[...senRaces,...govRaces,...houseRaces];
 $('miForecast').textContent=window.ERVIN_STATEWIDE.formatMargin(sen.states?.MI?.adjustedMargin??null);
 $('nightHorizon').textContent='Source coverage: 17 modeled Senate contests, 36 governor elections, all 435 House districts. The governor calibration uses the original 2016–2024 Ervin historical-error method; county counts below are verified separately.';
 drawRaces();
}
async function init(){
 $('appearance').onclick=()=>{const dark=document.documentElement.classList.toggle('light')===false;try{localStorage.setItem('ervin-2026-appearance',dark?'dark':'light')}catch(e){}$('appearance').textContent=dark?'Light mode':'Dark mode';};
 $('appearance').textContent=document.documentElement.classList.contains('light')?'Dark mode':'Light mode';
 $('miCountySearch').addEventListener('input',drawCounties);
 $('miCountyRows').addEventListener('click',e=>{const b=e.target.closest('button[data-name]');if(b){selectedCounty=b.dataset.name;renderInspector()}});
 for(const button of document.querySelectorAll('[data-office]'))button.addEventListener('click',()=>{filter=button.dataset.office;document.querySelectorAll('[data-office]').forEach(x=>x.classList.toggle('is-active',x===button));drawRaces()});
 $('raceFind').addEventListener('input',drawRaces);$('resultsFilter').addEventListener('change',drawRaces);
 $('refreshResults').onclick=()=>Promise.allSettled([refreshNational(),refreshCounty()]);
 try{await Promise.all([loadRaces(),initCountyMap()]);await Promise.allSettled([refreshNational(),refreshCounty()]);}
 catch(e){console.error(e);$('feedStatus').textContent='Some election sources unavailable';$('miFeedStatus').textContent='County reference or feed initialization failed: '+e.message}
 setInterval(()=>{if(!document.hidden)Promise.allSettled([refreshNational(),refreshCounty()])},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();