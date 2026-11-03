(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const closeEastern=Date.parse('2026-11-03T20:00:00-05:00');
// Source: USPS October 2026 key elections · 35 Senate ballots.
const SENATE_STATES_2026='AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY'.split(' ');
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
function date(t){if(!t)return 'Not published';const n=Date.parse(t);return Number.isFinite(n)?(window.ERVIN_AP_DATE?.timestamp(t)||new Date(n).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})):'Invalid timestamp'}
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
let refreshNationalBusy=false;
async function refreshNational(){
 if(refreshNationalBusy)return;
 refreshNationalBusy=true;
 try{
  const core=window.ERVIN_RETURNS;
  if(!core){$('feedStatus').textContent='Results validator unavailable; no unverified votes displayed';return}
  const offices=['Senate','Governor','House'];
  const urls=['../civicapi/races.json','../civicapi/discovery.json',...offices.map(x=>resultAPI+x)];
  const responses=await Promise.allSettled(urls.map(x=>x.startsWith('https://openamerica.io/')
   &&window.ERVIN_EXTERNAL_FEED?window.ERVIN_EXTERNAL_FEED.json(x,{timeout:13000}):fetchJSON(x,13000)));
  const civic=responses[0].status==='fulfilled'?core.civic(responses[0].value):{};
  const metadata=responses[1].status==='fulfilled'?responses[1].value:null;
  const fallback={};
  let fallbackSources=0;
  for(let i=0;i<offices.length;i++){
   if(responses[i+2].status!=='fulfilled')continue;
   const parsed=core.openAmerica(responses[i+2].value,offices[i]);
   if(Object.keys(parsed).length){Object.assign(fallback,parsed);fallbackSources++}
  }
  const chosen=core.preferCivic(civic,fallback);
  const prior={};
  for(const row of Object.values(live))Object.assign(prior,row.races||{});
  const merged=core.reconcile([chosen.races],prior);
  sourceWarnings=[...chosen.warnings,...merged.warnings];
  live={House:{races:{}},Senate:{races:{}},Governor:{races:{}}};
  for(const [id,row] of Object.entries(merged.races))if(live[row.office])live[row.office].races[id]=row;
  // Source-validated Senate totals can cover states outside the 17 numerical
  // forecast contests. Add an actual race row only when a verified report exists.
  const indexed=new Set(races.map(r=>r.id));
  for(const row of Object.values(merged.races)){
   if(row.office!=='Senate'||indexed.has(row.id)||!/^[A-Z]{2}-SENATE$/.test(row.id))continue;
   const code=row.id.slice(0,2),state=races.find(x=>x.code===code)?.state||code;
   const label=row.candidates.map(c=>c.name+' ('+c.party+')').join(' vs. ');
   races.push({id:row.id,code,state,office:'Senate',label,margin:null,modelText:'No standalone numerical forecast'});
   indexed.add(row.id);
  }
  // Newly accepted vote sources supply candidate names for otherwise
  // unmodeled Senate contests, without manufacturing a pre-election margin.
  for(const row of Object.values(merged.races)){
   if(row.office!=='Senate')continue;
   const entry=races.find(x=>x.id===row.id);
   if(entry&&entry.modelText==='No numerical Ervin estimate')
    entry.label=row.candidates.map(c=>c.name+' ('+c.party+')').join(' vs. ');
  }
  const acceptedCivic=Object.values(merged.races).filter(r=>r.source?.includes('CivicAPI')).length;
  const acceptedFallback=Object.values(merged.races).filter(r=>!r.source?.includes('CivicAPI')).length;
  const count=acceptedCivic+acceptedFallback;
  $('countedRaces').textContent=fmt(count);
  $('feedStatus').textContent=count?
    acceptedCivic+' CivicAPI races · '+acceptedFallback+' fallback races'+(sourceWarnings.length?' · '+sourceWarnings.length+' conflicts held':''):
    Date.now()<Date.parse('2026-11-03T18:00:00-05:00')?'CivicAPI primary feed ready; awaiting poll closings':'No verified 2026 vote totals in connected result feeds';
  const asOf=Object.values(merged.races).map(x=>x.asOf).sort().at(-1);
  $('feedAsOf').textContent=asOf?date(asOf):'Awaiting results';
  $('lastRefresh').textContent='Checked '+(window.ERVIN_AP_DATE?.timestamp(Date.now())||new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'}));
  const status=$('civicReportingStatus');
  if(status){
   const checked=Date.parse(metadata?.checkedAt||'');
   const age=Number.isFinite(checked)?Math.round((Date.now()-checked)/60000):null;
   const eligible=Number(metadata?.registeredRaces)||0;
   const connectivity=metadata?.providerConnectivity||{};
   const failing=['KY-06','MI-SENATE'].map(key=>connectivity[key]).filter(x=>x?.connected===false);
   const upstreamIssue=failing.length?' · RACE API ERRORS: '+failing.map(x=>x.detail||x.failure).join(' / ').slice(0,160):
      connectivity.statusEndpoint?.connected===true?' · Provider status endpoint reachable':' · Provider connection not yet verified';
   status.textContent='PRIMARY: civicAPI v2 · '+eligible+' of 506 contest IDs mapped'+
      (age!==null?' · last collector run '+Math.max(0,age)+' min ago':' · awaiting collector health report')+
      ' · '+acceptedCivic+' accepted CivicAPI reports · '+acceptedFallback+' source-attributed fallback reports'+upstreamIssue+
      (age!==null&&age>20?' · WARNING: the published collection is delayed':'')+
      '. County clerk counts remain independent.';
  }
  drawRaces();
 }finally{refreshNationalBusy=false}
}
function lead(row){
 if(!row?.candidates?.length)return null;
 const ranked=row.candidates.slice().sort((a,b)=>b.votes-a.votes);
 const top=ranked[0];return top?.name+' '+fmt(top?.votes)+' · '+fmt(row.total)+' votes total';
}
function countedBreakdown(row){
 if(!row?.candidates?.length||!Number.isSafeInteger(row.total)||row.total<=0)return '';
 return '<div class="night-counts">'+row.candidates.slice().sort((a,b)=>b.votes-a.votes).slice(0,5).map(c=>{
  const p=(100*c.votes/row.total).toFixed(1);
  const cls=c.party==='D'?'dem':c.party==='R'?'rep':'other';
  return '<div class="night-counted-candidate '+cls+'">'+(c.photo?'<img class="night-candidate-photo" src="'+esc(c.photo)+'" alt="'+esc(c.name)+' portrait" loading="lazy" referrerpolicy="no-referrer">':'')+'<span>'+esc(c.name)+'</span><b>'+fmt(c.votes)+'</b><small>'+p+'%</small></div>';
 }).join('')+'</div>'+
 (Number.isFinite(row.precincts)?'<small class="night-report-progress">'+row.precincts.toFixed(1)+'% precincts/batches estimated reported by source — not vote share</small>':'');
}
function raceURL(x){return '../state/?state='+encodeURIComponent(x.code)+(x.office==='House'?'#house-'+Number(x.district):'#stateOverview')}
function liveRaceURL(x){return '?state='+encodeURIComponent(x.code)+'&race='+encodeURIComponent(x.id)+'#nationalBoard'}
function renderRace(x){
 const id=x.office==='House'?x.id:x.code+'-'+x.office.toUpperCase();
 const report=live[x.office]?.races?.[id],reportText=report?lead(report):null;
 const source=report?.sourceURL?'<a href="'+esc(report.sourceURL)+'" target="_blank" rel="noopener noreferrer">Original count source</a>':'Source pending';
 return '<article class="race-row" id="race-'+esc(x.id)+'" role="listitem"><div><h3>'+esc(x.office==='House'?x.id+' · '+x.state:x.state+' · '+x.office)+'</h3><small>'+esc(x.label||x.candidates||'')+'</small></div><div><span class="model-value">'+esc(x.modelText)+'</span><small>PRE-ELECTION ESTIMATE</small></div><div>'+
 (reportText?countedBreakdown(report)+'<small>UNOFFICIAL · '+esc(report.source)+' · '+esc(date(report.asOf))+'</small>':'<span class="no-data">Awaiting verified results</span><small>County/state feed has not supplied attributable 2026 vote totals yet</small>')+
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
 const govRaces=report.governor.map(g=>({id:g.code+'-GOVERNOR',code:g.code,state:g.state,office:'Governor',label:g.dem+' vs. '+g.rep,margin:g.model.adjustedMargin,modelText:Number.isFinite(g.model.adjustedMargin)?window.ERVIN_STATEWIDE.formatMargin(g.model.adjustedMargin):Number.isFinite(g.model.pollMargin)?window.ERVIN_STATEWIDE.formatMargin(g.model.pollMargin)+' · published poll (no same-state comparison)':'No numeric published poll'}));
 const region=$('nightStateFilter');
 if(region){const opts=[...new Map(house.seats.map(x=>[x.code,x.state]))].sort((a,b)=>a[1].localeCompare(b[1]));
  region.innerHTML='<option value="all">Every state</option>'+opts.map(([c,n])=>'<option value="'+c+'">'+esc(n)+'</option>').join('');
  if(selectedState!=='all')region.value=selectedState;
 }
 const houseRaces=house.seats.map(h=>({id:h.id,code:h.code,state:h.state,district:h.district,office:'House',label:ballotNames(h),margin:houseForecast.races[h.id]?.marginD??null,modelText:houseForecast.races[h.id]?.modelRating||'No model'}));
 const modeled=new Set(senRaces.map(x=>x.code));
 const additionalSenate=SENATE_STATES_2026.filter(code=>!modeled.has(code)).map(code=>({
  id:code+'-SENATE',code,state:house.seats.find(h=>h.code===code)?.state||code,
  office:'Senate',label:'Awaiting attributed candidate and vote report',margin:null,modelText:'No numerical Ervin estimate'
 }));
 if(senRaces.length!==17||additionalSenate.length!==18)throw Error('2026 Senate roster not 35 distinct states');
 races=[...senRaces,...additionalSenate,...govRaces,...houseRaces];
 $('miForecast').textContent=window.ERVIN_STATEWIDE.formatMargin(sen.states?.MI?.adjustedMargin??null);
 $('nightHorizon').textContent='Source coverage: 35 Senate races (17 with numerical forecasts), 36 governor elections, all 435 House districts. The governor calibration uses 2018–2024 same-state governor-only polling errors; county counts below are verified separately.';
 drawRaces();
}
async function init(){
 $('appearance').onclick=()=>{const dark=document.documentElement.classList.toggle('light')===false;document.documentElement.classList.toggle('theme-dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';try{localStorage.setItem('ervin-2026-appearance',dark?'dark':'light')}catch(e){}$('appearance').textContent=dark?'Light mode':'Dark mode';$('appearance').setAttribute('aria-pressed',String(dark));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101925':'#f5f3ee');};
 $('appearance').textContent=document.documentElement.classList.contains('light')?'Dark mode':'Light mode';$('appearance').setAttribute('aria-pressed',String(!document.documentElement.classList.contains('light')));
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
  url.searchParams.delete('race');window.history.replaceState(null,'',url);drawRaces();
 });
 $('clearNightRace')?.addEventListener('click',()=>{selectedRace='';const url=new URL(location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url);drawRaces()});
 $('refreshResults').onclick=()=>Promise.allSettled([refreshNational(),refreshCounty()]);
 try{await Promise.all([loadRaces(),initCountyMap()]);await Promise.allSettled([refreshNational(),refreshCounty()]);}
 catch(e){console.error(e);$('feedStatus').textContent='Some election sources unavailable';$('miFeedStatus').textContent='County reference or feed initialization failed: '+e.message}
 setInterval(()=>{if(!document.hidden)Promise.allSettled([refreshNational(),refreshCounty()])},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();