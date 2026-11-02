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
let all=[],races=[],filter='All',live={},geo=null,counties=[],selectedCounty='Wayne',sourceLinks={},history={},senate={},lastUpdated=0,selectedState='all',selectedRace='',sourceWarnings=[];
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
 const h=history[c.name]||{},p=h.president2024||{},b=Number.isFinite(p.d)&&Number.isFinite(p.r)?[p.d,p.r]:null,source=sourceLinks[c.name]||countyDirectory;
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
 const [a,b]=await Promise.allSettled([fetchJSON('../michigan/county_history.json'),fetchJSON(here+'county_watch_sources.json')]);
 if(a.status==='fulfilled')history=Object.fromEntries((a.value.counties||[]).map(x=>[x.name,x]));
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
async function refreshNational(){
 const core=window.ERVIN_RETURNS;
 if(!core){$('feedStatus').textContent='Results validator unavailable; no unverified votes displayed';return}
 const offices=['Senate','Governor','House'];
 const urls=offices.map(x=>resultAPI+x).concat(['../civicapi/races.json']);
 const results=await Promise.allSettled(urls.map(x=>fetchJSON(x,13000)));
 const incoming=[];
 let working=0;
 for(let i=0;i<offices.length;i++){
  if(results[i].status!=='fulfilled')continue;
  const parsed=core.openAmerica(results[i].value,offices[i]);
  if(Object.keys(parsed).length){working++;incoming.push(parsed)}
 }
 if(results[3].status==='fulfilled'){
  const parsed=core.civic(results[3].value);
  if(Object.keys(parsed).length){working++;incoming.push(parsed)}
 }
 const prior={};for(const [office,rows] of Object.entries(live)){
  for(const [key,row] of Object.entries(rows.races||{}))prior[key]=row;
 }
 const merged=core.reconcile(incoming,prior);
 sourceWarnings=merged.warnings;
 live={House:{races:{}},Senate:{races:{}},Governor:{races:{}}};
 for(const [id,row] of Object.entries(merged.races))if(live[row.office])live[row.office].races[id]=row;
 const count=Object.values(merged.races).length;
 $('countedRaces').textContent=fmt(count);
 $('feedStatus').textContent=count?
  count+' contests with attributed 2026 returns · '+working+' available provider feeds'+(sourceWarnings.length?' · '+sourceWarnings.length+' source conflicts held':''):
  Date.now()<Date.parse('2026-11-03T18:00:00-05:00')?'Awaiting polls to close':'No verified 2026 results from available providers';
 const updated=Object.values(merged.races).map(x=>x.asOf).sort().at(-1);
 $('feedAsOf').textContent=updated?date(updated):'Awaiting returns';
 $('lastRefresh').textContent='Checked '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'});
 const status=$('civicReportingStatus');
 if(status)status.textContent='CivicAPI v2 '+(results[3].status==='fulfilled'?'snapshot retrieved':'snapshot unavailable')+
   ' · '+sourceWarnings.length+' held conflicts · never combines provider vote totals';
 drawRaces();
}
function lead(row){
 if(!row?.candidates?.length)return null;
 const ranked=row.candidates.slice().sort((a,b)=>b.votes-a.votes);
 const top=ranked[0];return top?.name+' '+fmt(top?.votes)+' · '+fmt(row.total)+' votes total';
}
function raceURL(x){return '../state/?state='+encodeURIComponent(x.code)+(x.office==='House'?'#house-'+Number(x.district):'#stateOverview')}
function liveRaceURL(x){return '?state='+encodeURIComponent(x.code)+'&race='+encodeURIComponent(x.id)+'#nationalBoard'}
function renderRace(x){
 const id=x.office==='House'?x.id:x.code+'-'+x.office.toUpperCase();
 const report=live[x.office]?.races?.[id],reportText=report?lead(report):null;
 const source=report?.sourceURL?'<a href="'+esc(report.sourceURL)+'" target="_blank" rel="noopener noreferrer">Original count source</a>':'Source pending';
 return '<article class="race-row" id="race-'+esc(x.id)+'" role="listitem"><div><h3>'+esc(x.office==='House'?x.id+' · '+x.state:x.state+' · '+x.office)+'</h3><small>'+esc(x.label||x.candidates||'')+'</small></div><div><span class="model-value">'+esc(x.modelText)+'</span><small>PRE-ELECTION ESTIMATE</small></div><div>'+
 (reportText?'<span class="live-value">'+esc(reportText)+'</span><small>UNOFFICIAL · '+esc(report.source)+' · '+esc(date(report.asOf))+'</small>':'<span class="no-data">No verified returns</span><small>NOT REPORTED TO THIS FEED</small>')+
 '</div><div><div class="night-row-links"><a href="'+liveRaceURL(x)+'">Election-night race view</a><a href="'+raceURL(x)+'">State/district context</a></div><small>'+source+'</small></div></article>';
}
function drawRaces(){
 const q=$('raceFind').value.toLowerCase().trim(),kind=$('resultsFilter').value;
 const shown=races.filter(x=>(selectedState==='all'||x.code===selectedState)&&(filter==='All'||x.office===filter)&&(!selectedRace||x.id===selectedRace)&&(!q||[x.code,x.id,x.state,x.label,x.candidates].join(' ').toLowerCase().includes(q))&&
 (kind!=='reported'||!!(live[x.office]?.races||{})[x.office==='House'?x.id:x.code+'-'+x.office.toUpperCase()])&&
 (kind!=='closest'||x.margin!==null&&Math.abs(x.margin)<=5));
 const top=shown.filter(x=>x.id==='MI-SENATE');const rest=shown.filter(x=>x.id!=='MI-SENATE').sort((a,b)=>a.office.localeCompare(b.office)||a.state.localeCompare(b.state)||String(a.district||'').localeCompare(String(b.district||'')));
 $('raceList').innerHTML=[...top,...rest].map(renderRace).join('')||'<p class="source-note">No races match the current filters.</p>';
 $('nationalCount').textContent=shown.length+' displayed · '+races.length+' indexed races, filtered without leaving this page';
}
async function loadRaces(){
 const [gov,house,sen,archive]=await Promise.all([fetchJSON('../governors/data.json'),fetchJSON('../house/data.json'),fetchJSON(forecastURL),fetchJSON('../research/governor-same-office-2014-2024.json')]);
 const report=window.ERVIN_STATEWIDE.apply(archive,gov,sen);
 const houseForecast=await fetchJSON('../house/ervin-forecast-2026-11-02.json');
 const houseRoster=await fetchJSON('../house/candidates-2026.json').catch(()=>null);
 const ballotNames=h=>{const a=houseRoster?.races?.[h.id]?.candidates||[];return a.length?a.map(c=>c.name+' ('+c.party+')').join(' · '):'2026 candidate roster not confirmed'};
 senate=sen.states||{};
 const senRaces=report.senate.map(s=>({id:s.code+'-SENATE',code:s.code,state:s.state,office:'Senate',label:(s.nonR||'Independent/Democrat')+' vs. '+s.rep,margin:s.model.adjustedMargin,modelText:window.ERVIN_STATEWIDE.formatMargin(s.model.adjustedMargin)}));
 const govRaces=report.governor.map(g=>({id:g.code+'-GOVERNOR',code:g.code,state:g.state,office:'Governor',label:g.dem+' vs. '+g.rep,margin:g.model.adjustedMargin,modelText:Number.isFinite(g.model.adjustedMargin)?window.ERVIN_STATEWIDE.formatMargin(g.model.adjustedMargin):Number.isFinite(g.model.pollMargin)?window.ERVIN_STATEWIDE.formatMargin(g.model.pollMargin)+' · unadjusted':'No numeric published poll'}));
 const region=$('nightStateFilter');
 if(region){const opts=[...new Map(house.seats.map(x=>[x.code,x.state]))].sort((a,b)=>a[1].localeCompare(b[1]));
  region.innerHTML='<option value="all">Every state</option>'+opts.map(([c,n])=>'<option value="'+c+'">'+esc(n)+'</option>').join('');
  if(selectedState!=='all')region.value=selectedState;
 }
 const houseRaces=house.seats.map(h=>({id:h.id,code:h.code,state:h.state,district:h.district,office:'House',label:ballotNames(h),margin:houseForecast.races[h.id]?.marginD??null,modelText:houseForecast.races[h.id]?.modelRating||'No model'}));
 races=[...senRaces,...govRaces,...houseRaces];
 $('miForecast').textContent=window.ERVIN_STATEWIDE.formatMargin(sen.states?.MI?.adjustedMargin??null);
 $('nightHorizon').textContent='Source coverage: 17 modeled Senate contests, 36 governor elections, all 435 House districts. The governor calibration uses 2018–2024 same-state governor-only polling errors; county counts below are verified separately.';
 drawRaces();
}
async function init(){
 $('appearance').onclick=()=>{const dark=document.documentElement.classList.toggle('light')===false;try{localStorage.setItem('ervin-2026-appearance',dark?'dark':'light')}catch(e){}$('appearance').textContent=dark?'Light mode':'Dark mode';};
 $('appearance').textContent=document.documentElement.classList.contains('light')?'Dark mode':'Light mode';
 $('miCountySearch').addEventListener('input',drawCounties);
 $('miCountyRows').addEventListener('click',e=>{const b=e.target.closest('button[data-name]');if(b){selectedCounty=b.dataset.name;renderInspector()}});
 for(const button of document.querySelectorAll('[data-office]'))button.addEventListener('click',()=>{filter=button.dataset.office;document.querySelectorAll('[data-office]').forEach(x=>x.classList.toggle('is-active',x===button));drawRaces()});
 $('raceFind').addEventListener('input',()=>{selectedRace='';drawRaces()});$('resultsFilter').addEventListener('change',drawRaces);
 const urlSearch=new URLSearchParams(location.search),requested=(urlSearch.get('state')||'').toUpperCase();
 if(/^[A-Z]{2}$/.test(requested))selectedState=requested;
 const race=requested?(urlSearch.get('race')||'').toUpperCase():null;
 if(race&&/^[A-Z]{2}-(?:\d{1,2}|SENATE|GOVERNOR)$/.test(race))selectedRace=race;
 $('nightStateFilter')?.addEventListener('change',e=>{
  selectedState=e.target.value;selectedRace='';const url=new URL(location.href);
  if(selectedState==='all')url.searchParams.delete('state');else url.searchParams.set('state',selectedState);
  url.searchParams.delete('race');history.replaceState(null,'',url);drawRaces();
 });
 $('clearNightRace')?.addEventListener('click',()=>{selectedRace='';const url=new URL(location.href);url.searchParams.delete('race');history.replaceState(null,'',url);drawRaces()});
 $('refreshResults').onclick=()=>Promise.allSettled([refreshNational(),refreshCounty()]);
 try{await Promise.all([loadRaces(),initCountyMap()]);await Promise.allSettled([refreshNational(),refreshCounty()]);}
 catch(e){console.error(e);$('feedStatus').textContent='Some election sources unavailable';$('miFeedStatus').textContent='County reference or feed initialization failed: '+e.message}
 setInterval(()=>{if(!document.hidden)Promise.allSettled([refreshNational(),refreshCounty()])},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();