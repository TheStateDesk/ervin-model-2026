/* The Ervin State Desk — one editorial dashboard per state, no synthetic outcomes. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>/^https:\/\//i.test(String(u||''))?esc(u):'https://www.nass.org/can-I-vote/state-election-officials';
const fmt=n=>Number(n||0).toLocaleString('en-US');
const margin=v=>Number.isFinite(v)?(v>0?'D +':v<0?'R +':'Even ')+Math.abs(v).toFixed(1):'Not available';
const regionMap={CT:'Northeast',ME:'Northeast',MA:'Northeast',NH:'Northeast',RI:'Northeast',VT:'Northeast',NJ:'Northeast',NY:'Northeast',PA:'Northeast',MI:'Midwest',WI:'Midwest',OH:'Midwest',IN:'Midwest',IL:'Midwest',IA:'Midwest',MN:'Midwest',MO:'Midwest',KS:'Midwest',NE:'Midwest',ND:'Midwest',SD:'Midwest'};
const stateList=window.ERVIN_US_GEOGRAPHY?.states||[];
const byCode=Object.fromEntries(stateList.map(x=>[x.code,x]));
let house=[],governors=[],baselines={},historical={counties:{}},senatePolls={},govPolls={},housePolls={};
let code='MI',stateHouse=[],selectedDistrict=null,countyShape=null,districtShape=null,cachedCountyRows=[],countyScenario={senate:null,governor:null},selectedCounty=null,mapToken=0,resultLast=0;
const pollCutoff=Date.parse('2026-11-03T18:00:00-05:00');
function stateName(c){return byCode[c]?.name||house.find(x=>x.code===c)?.state||c;}
function sourceItem(text,url,detail=''){return '<article><strong><a href="'+safeURL(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+'</a></strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</article>';}
const pick=r=>r?.office==='Governor'?'governor':'senate';
function getGov(){return governors.find(x=>x.code===code);}
function getSen(){return baselines[code]||null;}
function getDistrict(id){return stateHouse.find(x=>String(x.district).padStart(2,'0')===String(id).padStart(2,'0'));}
function stateRoute(c){return '?state='+encodeURIComponent(c)}
function prepareSelection(){
 $('stateSelect').innerHTML=stateList.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>'<option value="'+esc(s.code)+'">'+esc(s.name)+'</option>').join('');
 $('stateSelect').onchange=e=>{window.history.pushState(null,'',stateRoute(e.target.value));display(e.target.value);};
 window.addEventListener('popstate',()=>display(new URLSearchParams(location.search).get('state')||'MI'));
}
function renderLead(){
 const gov=getGov(),sen=getSen();
 $('stateSelect').value=code;
 document.title=stateName(code)+' Elections 2026 | The Ervin State Desk';
 $('stateTitle').textContent=stateName(code)+', all in one place.';
 $('stateDeck').textContent='Your complete '+stateName(code)+' election notebook: '+(sen?'a modeled Senate contest, ':'')+(gov?'a governor election, ':'')+stateHouse.length+' House district'+(stateHouse.length!==1?'s':'')+', county history and verified reporting sources.';
 const n=r=>r===1?'One district':fmt(r)+' districts';
 $('heroHouse').textContent=fmt(stateHouse.length);
 $('heroHouseSub').textContent=stateHouse.filter(r=>r.rating).length+' published competitiveness ratings indexed';
 $('heroSenate').textContent=sen?margin(Number(sen.adjustedMargin)):'No modeled race';
 $('heroSenateSub').textContent=sen?'Original Ervin adjustment · '+fmt(sen.publisherInputs)+' publisher inputs':'No Senate race in the 17-state model';
 $('heroGovernor').textContent=gov?.poll&&Number.isFinite(gov.poll.margin)?margin(gov.poll.margin):gov?'No average':'No election';
 $('heroGovSub').textContent=gov?'Governor publisher snapshot; not an Ervin projection':'No governor contest in the 2026 registry';
 $('houseCoverage').textContent=n(stateHouse.length)+' · '+stateName(code);
 $('editionDate').textContent='Research snapshot · November 2026';
}
function statewideCard(title,sub,candidates,forecast,explain,source,href){
 return '<article class="ed-race"><div class="ed-race-h"><div><div class="ed-kicker">'+esc(sub)+'</div><h3>'+esc(title)+'</h3><p>'+esc(candidates)+'</p></div><div class="ed-race-big">'+esc(forecast)+'</div></div><p>'+esc(explain)+'</p><div class="ed-link-list"><a href="'+safeURL(source)+'" target="_blank" rel="noopener noreferrer">Polling/source reference</a><a href="'+esc(href)+'">Detailed methodology</a></div></article>';
}
function renderOverview(){
 const s=getSen(),g=getGov();
 const senate=s?statewideCard('U.S. Senate','Original Ervin adjustment',s.nonR+' vs. '+s.rep,margin(Number(s.adjustedMargin)),'Historical partisan polling adjustment applied to sourced statewide averages. Not a race call or a win probability. '+(s.stale?'Publisher inputs may be outdated.':''),'https://www.realclearpolling.com/elections/senate/2026/toss-ups','../elections/?office=senate&state='+code):'<article class="ed-race"><div class="ed-kicker">U.S. Senate</div><h3>No Ervin-modeled Senate contest</h3><p>This state is not among the 17 modeled Senate races. The absence of a model entry does not imply an uncontested race.</p></article>';
 const governor=g?statewideCard('Governor','Published polling average',g.dem+' vs. '+g.rep,g.poll&&Number.isFinite(g.poll.margin)?margin(g.poll.margin):'No published average','Publisher-owned polling aggregation, not historically adjusted by the Senate model. '+(g.otherCandidates||''),g.poll?.url||g.nomineesSource,'../elections/?office=governor&state='+code):'<article class="ed-race"><div class="ed-kicker">Governor</div><h3>No 2026 gubernatorial contest</h3><p>The state's governorship is not up for election in this registry.</p></article>';
 $('stateRaceCards').innerHTML=senate+governor;
 const withPolls=stateHouse.filter(x=>housePolls[x.id]).length,withRatings=stateHouse.filter(x=>x.rating).length;
 $('stateNotebook').innerHTML='<article><strong>State contests</strong><small>'+(s?'Senate model available · ':'No Senate model · ')+(g?'Governor polling indexed':'No governor election')+'</small></article>'+
 '<article><strong>'+withRatings+' of '+stateHouse.length+' House ratings sourced</strong><small>Ratings are qualitative; missing ratings are not Safe D or Safe R predictions.</small></article>'+
 '<article><strong>'+withPolls+' House districts with documented public polling</strong><small>Latest indexed survey only; no House polling average manufactured.</small></article>'+
 '<article><strong>Locally hosted county geography</strong><small>2022 Census reference boundaries and 2020/2024 presidential results, not certified 2026 voting totals.</small></article>';
}
function buildScenario(){
 const stateFips=stateHouse[0]?.id?.slice(0,2)||code;
 const sample=stateHouse.length?stateHouse[0].id:null;
 const f=String((countyShape?.features?.[0]?.id)||'').slice(0,2);
 countyScenario.senate=window.ERVIN_SCENARIOS.build(historical,f||'00',Number.isFinite(+getSen()?.adjustedMargin)?Number(getSen().adjustedMargin):null);
 countyScenario.governor=window.ERVIN_SCENARIOS.build(historical,f||'00',Number.isFinite(+getGov()?.poll?.margin)?Number(getGov().poll.margin):null);
 const valid=countyShape?.features||[];
 cachedCountyRows=valid.map(x=>{const id=String(x.id).padStart(5,'0'),history=historical.counties?.[id];
 return{id,name:String(x.properties?.name||'County '+id),m24:window.ERVIN_SCENARIOS.margin(history?.y24),m20:window.ERVIN_SCENARIOS.margin(history?.y20),senate:countyScenario.senate?.map.get(id)?.expected??null,governor:countyScenario.governor?.map.get(id)?.expected??null};});
}
function activeCountyMargin(row,layer){
 if(layer==='2024')return row.m24;
 if(layer==='2020')return row.m20;
 if(layer==='swing')return Number.isFinite(row.m24)&&Number.isFinite(row.m20)?row.m24-row.m20:null;
 if(layer==='senate')return row.senate;
 if(layer==='governor')return row.governor;
 return null;
}
function countyInformation(row){
 if(!row)return 'Select a county to see historical voting and conditional statewide race estimates.';
 const format=(x)=>Number.isFinite(x)?margin(x)+' points':'Unavailable';
 return '<strong>'+esc(row.name)+' County</strong> · FIPS '+esc(row.id)+
 '<div class="ed-split" style="margin-top:8px;gap:8px;font-size:12px"><div>2020 presidential: <strong>'+esc(format(row.m20))+'</strong><div>2024 presidential: <strong>'+esc(format(row.m24))+'</strong></div></div>'+
 '<div>2026 Senate scenario: <strong>'+esc(format(row.senate))+'</strong><div>2026 governor scenario: <strong>'+esc(format(row.governor))+'</strong></div></div></div>'+
 '<p class="ed-mini">Scenario figures allocate a statewide estimated margin using 2020/2024 presidential voting. These are not separate county surveys or reported 2026 returns.</p>';
}
function drawCounties(){
 const layer=$('countyLayer').value;
 const surface=$('countyMap'),data=countyShape;
 if(!data){surface.textContent='County geography unavailable. Try Reload map.';return;}
 const byId=new Map(cachedCountyRows.map(r=>[r.id,r]));
 window.ERVIN_GEO.draw(surface,data,{kind:'counties',className:'county',onSelect:(el,f)=>{const id=String(f.id).padStart(5,'0');selectedCounty=id;for(const x of surface.querySelectorAll('path.county'))x.classList.toggle('is-selected',x.dataset.fips===id);$('countyInspector').innerHTML=countyInformation(byId.get(id));}});
 let colored=0;
 for(const p of surface.querySelectorAll('path.county')){
  const r=byId.get(String(p.dataset.fips).padStart(5,'0')),v=r?activeCountyMargin(r,layer):null;
  p.style.fill=Number.isFinite(v)?v>=0?(Math.abs(v)>=15?'#3b82ac':'#9bbfd6'):(Math.abs(v)>=15?'#b45463':'#dca0a4'):'#cfd7da';
  if(Number.isFinite(v))colored++;
  p.setAttribute('aria-label',String(p.dataset.name)+' County, '+(Number.isFinite(v)?margin(v)+' points':"no comparable figure"));
  p.classList.toggle('is-selected',selectedCounty===String(p.dataset.fips).padStart(5,'0'));
 }
 $('countySourceLabel').textContent=layer==='senate'?'Conditional Ervin Senate scenario · '+colored+' counties':layer==='governor'?'Conditional published-governor polling scenario · '+colored+' counties':layer==='neutral'?'Geographic outlines only':layer==='swing'?'Change in two-party presidential margin · '+colored+' counties':layer+' presidential results · '+colored+' counties';
 $('countyInspector').innerHTML=countyInformation(cachedCountyRows.find(r=>r.id===selectedCounty));
 renderCountyTable();
}
function renderCountyTable(){
 const query=$('countyTableFind').value.trim().toLowerCase(),layer=$('countyLayer').value;
 const rows=cachedCountyRows.filter(r=>r.name.toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
 const preferred=layer==='senate'?'senate':layer==='governor'?'governor':getSen()?'senate':getGov()?'governor':null;
 $('scenarioExplanation').textContent=preferred==='senate'?'Conditional county scenario anchored to the Original Ervin Senate statewide margin. Not independent county polling.':preferred==='governor'?'Conditional county scenario anchored to an unadjusted governor publisher average. Not independent county polling.':'No comparable statewide 2026 margin to allocate; showing presidential history only.';
 $('countyTableBody').innerHTML=rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(margin(r.m24))+'</td><td>'+esc(margin(preferred?r[preferred]:null))+'</td></tr>').join('')||'<tr><td colspan="3">No matching counties.</td></tr>';
 $('countyCount').textContent=fmt(cachedCountyRows.length)+' county-equivalent geographic shapes';
}
function countyCSV(){
 const select=getSen()?'senate':getGov()?'governor':null;
 const rows=[['County','FIPS','2020 presidential D-R','2024 presidential D-R','Conditional 2026 Senate D-R','Conditional 2026 Governor D-R'],...cachedCountyRows.map(r=>[r.name,r.id,r.m20??'',r.m24??'',r.senate??'',r.governor??''])];
 const csv=rows.map(items=>items.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='ervin-'+code+'-county-context.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadCountyMap(reload=false){
 const generation=++mapToken;
 $('countyInspector').textContent='Loading '+stateName(code)+' county geography…';
 try{
  const shape=await window.ERVIN_GEO.get(code,'counties',{refresh:reload});
  if(generation!==mapToken)return;
  countyShape=shape;selectedCounty=null;buildScenario();
  $('countySuggestions').innerHTML=shape.features.map(x=>'<option value="'+esc(x.properties?.name||'')+'"></option>').join('');
  drawCounties();
 }catch(e){if(generation!==mapToken)return;countyShape=null;$('countyInspector').textContent='Map loading problem: '+e.message+'. Use Reload map to retry.';}
}
function initCountyControls(){
 $('countyLayer').onchange=drawCounties;
 $('countyTableFind').oninput=renderCountyTable;
 $('countyCSV').onclick=countyCSV;
 $('countyRetry').onclick=()=>loadCountyMap(true);
 $('countySearch').oninput=e=>{const input=e.target.value.trim().toLowerCase().replace(/ county$/,'');const hit=cachedCountyRows.find(x=>x.name.toLowerCase()===input);if(hit){selectedCounty=hit.id;drawCounties();const path=$('countyMap').querySelector('path[data-fips="'+hit.id+'"]');path?.scrollIntoView?.({block:'nearest'});}};
}
function toneRating(r){const t=String(r?.rating||'').toLowerCase();return t.includes('tossup')?'#b2a080':/\b(?:lean|likely|solid) d\b/.test(t)?'#4b89ac':/\b(?:lean|likely|solid) r\b/.test(t)?'#b25e6e':'#b8c7cd';}
function renderDistrictDetail(r){
 if(!r)return;
 selectedDistrict=r;
 const p=housePolls[r.id],rating=r.rating||'No source rating entered';
 $('districtTitle').textContent=r.state+' District '+Number(r.district);
 $('districtDetail').innerHTML='<div class="ed-kicker">2026 HOUSE ELECTION · '+esc(r.id)+'</div><div class="ed-stat" style="margin:14px 0"><small>Published rating</small><strong>'+esc(rating)+'</strong></div>'+
 '<p><strong>Incumbent in source registry:</strong> '+esc(r.incumbent||'Not verified')+'</p>'+
 (p?'<div class="ed-coverage"><div><strong>'+esc(p.pollster)+'</strong><small>Latest indexed survey · '+esc(p.date)+' · '+esc(p.sourceKind)+'</small></div><strong>'+esc(margin(p.margin))+'</strong></div><p class="ed-mini">Survey shares: D '+esc(p.dem)+'%, R '+esc(p.rep)+'%. Latest survey is not a district polling average; sponsorship and field dates vary.</p>':'<p class="ed-notice">No comparable public district survey imported. Missing polling is not evidence that none exists.</p>')+
 '<p class="ed-mini">2022 congressional reference shape; 2026 redistricting status is not independently certified. Counties are statewide context, not a district-level vote forecast.</p>'+
 '<div class="ed-link-list"><a target="_blank" rel="noopener noreferrer" href="'+safeURL(p?.url||r.ratingSource||'https://www.cookpolitical.com/ratings/house-race-ratings')+'">Original polling / rating source</a><a href="../elections/?office=house&state='+code+'&district='+esc(r.district)+'">Technical race dossier</a></div>';
 $('districtButtons').querySelectorAll('button[data-district]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.district===r.district)));
 $('districtMap').querySelectorAll('path.geo-district').forEach(path=>path.classList.toggle('is-selected',String(path.dataset.district).padStart(2,'0')===String(r.district).padStart(2,'0')));
 const dest='#house-'+r.district;if(location.hash.startsWith('#house-'))history.replaceState(null,'',location.pathname+location.search+dest);
}
function initDistrictButtons(){
 $('districtButtons').innerHTML=stateHouse.map(r=>'<button type="button" data-district="'+esc(r.district)+'" aria-pressed="false">'+esc(code)+'–'+esc(r.district)+'<small>'+esc(r.rating||'Rating unavailable')+'</small></button>').join('');
 $('districtButtons').onclick=e=>{const b=e.target.closest('button[data-district]');if(b){const r=getDistrict(b.dataset.district);if(r)renderDistrictDetail(r);}};
}
async function loadHouseMap(reload=false){
 const token=++mapToken;
 try{
  const shape=await window.ERVIN_GEO.get(code,'districts',{refresh:reload});if(token!==mapToken)return;
  districtShape=shape;const map=$('districtMap');
  window.ERVIN_GEO.draw(map,shape,{kind:'districts',className:'geo-district',onSelect:(el,f)=>{const r=getDistrict(f.id);if(r)renderDistrictDetail(r);}});
  for(const path of map.querySelectorAll('path.geo-district')){
   const r=getDistrict(path.dataset.district);path.style.fill=toneRating(r);path.querySelector('title').textContent=(r?.id||'District')+' · '+(r?.rating||'Rating unavailable')+' · click to inspect';
  }
  const requested=location.hash.match(/^#house-(\d{1,2})$/)?.[1];renderDistrictDetail(getDistrict(requested)||selectedDistrict&&getDistrict(selectedDistrict.district)||stateHouse[0]);
 }catch(e){document.getElementById('districtDetail').textContent='District map unavailable: '+e.message+'. The district buttons remain usable.';}
}
function listPolls(data,asOf,limit=12){const clean=Array.isArray(data)?data.filter(p=>Number.isFinite(+p.margin)):[];
 return clean.sort((a,b)=>Date.parse(b.fieldEnd||b.publishedAt||b.date||0)-Date.parse(a.fieldEnd||a.publishedAt||a.date||0)).slice(0,limit).map(p=>'<article class="ed-coverage"><div><strong><a href="'+safeURL(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.pollster||'Survey')+'</a></strong><small>'+esc(p.date||p.dates||'Field date unknown')+' · '+esc(p.sample||'Sample details unverified')+'</small></div><strong>'+esc(margin(+p.margin))+'</strong></article>').join('');
}
function renderPolls(){
 const s=senatePolls[code]||[],g=govPolls[code]||[],gp=getGov();
 let senateContent=getSen()?'<div class="ed-cap">Senate · individual surveys</div>'+listPolls(s):'';
 let govContent=gp?'<div class="ed-cap" style="margin-top:14px">Governor · publisher average</div><div class="ed-coverage"><div><strong><a href="'+safeURL(gp.poll?.url)+'" target="_blank" rel="noopener noreferrer">Published statewide governor average</a></strong><small>'+esc(gp.poll?.count||'Unknown')+' underlying surveys; methodology belongs to publisher</small></div><strong>'+esc(margin(gp.poll?.margin))+'</strong></div><div class="ed-cap" style="margin-top:14px">Recent individual surveys</div>'+listPolls(g):'';
 $('pollStatewide').innerHTML=senateContent+govContent||'<div class="ed-empty">No comparable statewide polling input is indexed for this state.</div>';
 const h=stateHouse.filter(x=>housePolls[x.id]).map(x=>({seat:x,poll:housePolls[x.id]})).sort((a,b)=>(b.poll.date||'').localeCompare(a.poll.date||''));
 $('pollHouse').innerHTML=h.length?h.map(({seat,poll})=>'<div class="ed-coverage"><div><strong>'+esc(seat.id)+' · '+esc(poll.pollster)+'</strong><small>'+esc(poll.date)+' · latest indexed public poll, not an average</small></div><strong>'+esc(margin(poll.margin))+'</strong></div>').join(''):'<div class="ed-empty">No public House polling entry in the imported 110-district sample for this state.</div>';
 $('pollHouse').innerHTML+='<p class="ed-mini"><a href="https://peoplespoll.com/house" target="_blank" rel="noopener noreferrer">House poll directory</a> · <a href="https://www.realclearpolling.com/latest-polls/governor" target="_blank" rel="noopener noreferrer">Governor poll listings</a>. Survey lists may overlap published averages.</p>';
}
function stateCodeFromResultKey(k){return String(k).slice(0,2).toUpperCase();}
async function loadReturns(force=false){
 const now=Date.now();if(!force&&now-resultLast<60000)return;resultLast=now;
 const editions=['Senate','Governor','House'],ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),11000),chunks=[];
 $('resultStatus').className='ed-inline-status';$('resultStatus').textContent='Checking documented state-office sources';
 try{
  const answers=await Promise.allSettled(editions.map(async office=>{
   const response=await fetch('https://openamerica.io/elections/results.json?year=2026&office='+office,{cache:'no-cache',signal:ctrl.signal});
   if(!response.ok)throw Error(office+' feed unreachable');
   const j=await response.json();if(j.year!==2026||j.office!==office||j.api!==1||!j.races||typeof j.races!=='object')throw Error('Unsupported feed format');return j;
  }));
  for(let i=0;i<answers.length;i++){
   const rr=answers[i];if(rr.status!=='fulfilled')continue;
   for(const [key,row] of Object.entries(rr.value.races||{})){
    if(stateCodeFromResultKey(key)!==code||!Number.isFinite(row.total)||row.total<=0||!Array.isArray(row.cands))continue;
    const leader=[...row.cands].sort((a,b)=>(b.v||0)-(a.v||0)).slice(0,2).map(x=>x.n+' '+fmt(x.v)).join(' · ');
    chunks.push('<article><strong>'+esc(editions[i]+' · '+key)+'</strong><small>'+esc(leader)+' · '+fmt(row.total)+' votes counted · '+(Number.isFinite(row.pct_in)?row.pct_in.toFixed(1)+'% precincts reporting':'precinct reporting unavailable')+'</small></article>');
   }
  }
  const count=chunks.length;
  $('resultRows').innerHTML=count?chunks.slice(0,60).join(''):'<div class="ed-empty">No confirmed 2026 counted-vote records for '+esc(stateName(code))+' in the supported feeds. This does not mean zero votes or no election.</div>';
  $('resultStatus').className='ed-inline-status'+(count?' live':'');
  $('resultStatus').textContent=count?count+' reported contests in supported result feeds':'No supported published return for this state yet';
  $('resultUpdated').textContent='Checked '+new Date().toLocaleTimeString()+' · Official state-office data mirrored by Open America, which covers only a subset of states. Publication and precinct percentages may lag; no winner calls are made.';
 }catch(e){$('resultStatus').className='ed-inline-status stale';$('resultStatus').textContent='Published source unavailable';$('resultRows').innerHTML='<div class="ed-empty">Unable to confirm state results. Open the official state election office for the latest figures.</div>';}
 finally{clearTimeout(timer);}
}
function officialLinks(){
 let links='<a href="https://www.nass.org/can-I-vote/state-election-officials" target="_blank" rel="noopener noreferrer">Directory of state election offices</a>';
 if(code==='MI')links+='<a href="../michigan/election-night/">Michigan clerk / county dashboard</a><a href="https://www.michigan.gov/sos/elections/election-results-and-data/voter-participation-dashboard" target="_blank" rel="noopener noreferrer">Official Michigan participation dashboard</a>';
 links+='<a href="https://openamerica.io/elections/api/" target="_blank" rel="noopener noreferrer">Results mirror coverage and methodology</a>';
 $('officialStateLinks').innerHTML=links;
}
async function display(next){
 const c=String(next||'MI').toUpperCase();code=byCode[c]?c:'MI';
 selectedDistrict=null;countyShape=null;districtShape=null;cachedCountyRows=[];selectedCounty=null;mapToken++;
 stateHouse=house.filter(x=>x.code===code).sort((a,b)=>String(a.district).localeCompare(String(b.district)));
 renderLead();renderOverview();initDistrictButtons();renderPolls();officialLinks();
 $('countyLayer').value='2024';$('countyTableFind').value='';$('countySearch').value='';
 $('countyMap').replaceChildren();$('districtMap').replaceChildren();
 // Map loaders have independent selection identity, and operate on local vetted data.
 await Promise.allSettled([loadCountyMap(),loadHouseMap()]);
 loadReturns(true);
}
async function start(){
 try{
  const fetchJSON=async p=>{const r=await fetch(p);if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json();};
  const [h,g,b,ch,sp,gp,hp]=await Promise.all([
   fetchJSON('../house/data.json'),fetchJSON('../governors/data.json'),fetchJSON('../counties-watch/forecast-baselines.json'),
   window.ERVIN_SCENARIOS.load(),fetchJSON('../recent_polls.json'),fetchJSON('../governors/recent_verified_polls.json'),fetchJSON('../house/research-polls.json')]);
  house=h.seats||[];governors=g.races||[];baselines=b.states||{};historical=ch;senatePolls=sp.polls||{};govPolls=gp.states||{};housePolls=hp.polls||{};
  prepareSelection();initCountyControls();$('houseMapReload').onclick=()=>loadHouseMap(true);$('reloadResults').onclick=()=>loadReturns(true);
  $('headerDate').textContent=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  await display(new URLSearchParams(location.search).get('state')||'MI');
  setInterval(()=>{if(!document.hidden)loadReturns(false)},60000);
 }catch(e){console.error('State desk failed',e);$('stateTitle').textContent='State data could not be loaded';$('stateDeck').textContent='An essential source file is temporarily unavailable. Try reloading the page.';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();