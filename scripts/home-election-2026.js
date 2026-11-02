/* Ervin Model 2026: homepage watch carousel, final projection atlas and verified-live handoff.
 * Forecasts and vote returns are separate datasets. No synthetic votes or calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root='../', finalAt=Date.parse('2026-11-03T12:00:00-05:00'), read=async(p)=>{const r=await fetch(root+p,{cache:'no-store'});if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json()};
const margin=n=>!Number.isFinite(n)?'No numerical forecast':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
const states=window.ERVIN_US_GEOGRAPHY?.states||[], stateName=Object.fromEntries(states.map(s=>[s.code,s.name]));
let model={senate:[],governor:[],house:[]}, watched=[],position=0,office='Senate',selected='MI',returns={},countyReports={},live=false,busy=false,lastResults=0;
const isValid=n=>typeof n==='number'&&Number.isFinite(n), party=n=>!isValid(n)?'N':n>0?'D':n<0?'R':'T';
function label(x){return x.state+' · '+x.office+(x.office==='House'?' '+x.id:'')}
function races(){
 // Show genuinely close forecasts from every chamber instead of allowing
 // hundreds of House districts to crowd out every statewide contest.
 const closest=(rows,n)=>rows.filter(x=>isValid(x.margin)).sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin)).slice(0,n);
 return [...closest(model.senate,10),...closest(model.governor,10),...closest(model.house,16)]
   .sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin));
}
function photo(name,el){
 if(!name||!el||!/^[\w .'-]{4,90}$/.test(name))return;
 const url='https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=pageimages&pithumbsize=110&titles='+encodeURIComponent(name);
 fetch(url).then(x=>x.json()).then(j=>{
  const p=j.query?.pages?.[0],src=p?.thumbnail?.source;
  if(p?.title?.toLowerCase()!==name.toLowerCase()||!/^https:\/\/upload\.wikimedia\.org\//.test(src||''))return;
  const im=document.createElement('img');im.src=src;im.alt=name+' portrait';im.loading='lazy';im.referrerPolicy='no-referrer';el.replaceChildren(im);
 }).catch(()=>{});
}
function drawWatch(){
 const panel=$('watchCards');if(!panel)return;
 const visible=watched.slice(position,position+4);
 panel.innerHTML=visible.map((r,i)=>{
  if(r.id==='final-predictions')return '<article class="watch-card watch-card--final">'+
   '<div class="watch-card__overline">ELECTION DAY / NOVEMBER 3, 2026</div>'+
   '<a class="watch-card__name" href="#electionDashboard">Final predictions</a>'+
   '<p class="ed-mini">Full-country Senate, governor and House projections. Color-coded by predicted party leader, including clickable state and district maps.</p>'+
   '<div class="watch-card__margin">50 states</div>'+
   '<small>Updated published margins · forecast, not certified results</small>'+
   '<a class="watch-card__open" href="#electionDashboard">Open final projection maps</a></article>';
  const source=r.kind==='poll'?'Published poll, not adjusted':r.office==='House'?'Provisional district scenario':'Historical-error-adjusted forecast';
  const href='../state/?state='+encodeURIComponent(r.code)+(r.office==='House'?'#stateHouse':'#stateOverview');
  const initials=(r.dem||r.rep||r.state).split(' ').map(x=>x[0]).slice(0,2).join('');
  return '<article class="watch-card"><div class="watch-card__overline">'+esc(r.office)+' · #'+(position+i+1)+' CLOSEST</div>'+
  '<a class="watch-card__name" href="'+href+'">'+esc(label(r))+'</a>'+
  '<div class="watch-card__people"><div class="watch-photo" data-photo="'+esc(r.code)+'-'+esc(r.office)+'">'+esc(initials)+'</div><span>'+esc([r.dem,r.rep].filter(Boolean).join(' / ')||'District forecast')+'</span></div>'+
  '<div class="watch-card__margin '+party(r.margin)+'">'+esc(margin(r.margin))+'</div><small>'+esc(source)+'</small>'+
  '<a class="watch-card__open" href="'+href+'">Open state election desk</a></article>';
 }).join('');
 $('watchPosition').textContent=(position+1)+'–'+(position+visible.length)+' of '+watched.length;
 $('watchPrev').disabled=position===0;$('watchNext').disabled=position+4>=watched.length;
 visible.forEach(r=>{if(r.office==='Senate')photo(r.dem,panel.querySelector('[data-photo="'+r.code+'-'+r.office+'"]'))});
}
function watchInit(){
 $('watchPrev')?.addEventListener('click',()=>{position=Math.max(0,position-4);drawWatch()});
 $('watchNext')?.addEventListener('click',()=>{position=Math.min(Math.max(0,watched.length-4),position+4);drawWatch()});
}
async function loadModel(){
 const [sen,gov,house,history]=await Promise.all([read('counties-watch/forecast-baselines.json'),read('governors/data.json'),read('house/ervin-forecast-2026-11-02.json'),read('research/governor-same-office-2014-2024.json')]);
 const applied=window.ERVIN_STATEWIDE.apply(history,gov,sen);
 model.senate=applied.senate.map(x=>({id:x.code+'-SENATE',code:x.code,state:x.state||stateName[x.code],office:'Senate',margin:x.model.adjustedMargin,dem:x.nonR,rep:x.rep,kind:'model'}));
 model.governor=applied.governor.map(x=>({id:x.code+'-GOVERNOR',code:x.code,state:x.state||stateName[x.code],office:'Governor',margin:isValid(x.model.adjustedMargin)?x.model.adjustedMargin:x.model.pollMargin,dem:x.dem,rep:x.rep,kind:isValid(x.model.adjustedMargin)?'model':'poll'}));
 model.house=Object.values(house.races||{}).map(x=>({id:x.id,code:x.state,state:stateName[x.state]||x.state,office:'House',margin:x.marginD,kind:'model'}));
 watched=races();drawWatch();updatePhase();
}
function byState(code,off){return model[off.toLowerCase()].filter(r=>r.code===code)}
function raceFor(code,off){return byState(code,off)[0]||null}
function officeColor(code){
 const list=byState(code,office),has=list.filter(r=>isValid(r.margin));
 if(!has.length)return 'N';
 if(office!=='House')return party(has[0].margin);
 const d=has.filter(r=>r.margin>0).length,r=has.filter(r=>r.margin<0).length;
 return d>r?'D':r>d?'R':'T';
}
function actualColor(code){
 const list=Object.values(returns).filter(x=>x.id.startsWith(code+'-')&&x.office===office);
 if(!list.length)return null;
 let d=0,r=0;
 for(const row of list){d+=row.candidates.filter(c=>c.party==='D').reduce((a,c)=>a+c.votes,0);r+=row.candidates.filter(c=>c.party==='R').reduce((a,c)=>a+c.votes,0)}
 return d>r?'D':r>d?'R':'T';
}
function map(){
 const svg=$('electionNationalMap'),geo=window.ERVIN_US_GEOGRAPHY;
 if(!svg||!geo?.states?.length)return;
 svg.setAttribute('viewBox',geo.viewBox||'0 0 1080 625');
 svg.innerHTML=geo.states.map(s=>{
  const observed=live?actualColor(s.code):null,p=observed||officeColor(s.code),isActual=!!observed;
  const status=isActual?'unofficial returns':'projection';
  return '<a href="#electionDrill" data-choose-state="'+s.code+'" aria-label="'+esc(s.name+' · '+office+' · '+status)+'"><path class="atlas-state atlas-'+p+(isActual?' is-reporting':'')+'" d="'+s.d+'"><title>'+esc(s.name+' · '+office+' · '+status)+'</title></path></a>';
 }).join('');
 svg.querySelectorAll('[data-choose-state]').forEach(a=>a.addEventListener('click',()=>chooseState(a.dataset.chooseState)));
}
function projection(coords,bounds,w,h){
 let [minx,miny,maxx,maxy]=bounds,spanX=Math.max(.001,maxx-minx),spanY=Math.max(.001,maxy-miny),scale=Math.min((w-24)/spanX,(h-24)/spanY);
 const ox=(w-spanX*scale)/2,oy=(h-spanY*scale)/2;
 return [(coords[0]-minx)*scale+ox,(maxy-coords[1])*scale+oy];
}
function geoToPaths(geom){
 if(!geom||!geom.coordinates)return [];
 return geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
}
function mapStateFeatures(features,off){
 const width=820,height=520,all=[];
 for(const feature of features)for(const poly of geoToPaths(feature.geometry))for(const ring of poly)for(const xy of ring)all.push(xy);
 if(!all.length)return '<text x="10" y="28">Boundary data not available</text>';
 const xs=all.map(a=>a[0]),ys=all.map(a=>a[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 return features.map(f=>{
  const id=String(f.id||f.properties?.id||''),key=selected+'-'+id.padStart(2,'0');
  const record=returns[key],cparty=record?party((record.candidates.filter(c=>c.party==='D').reduce((a,c)=>a+c.votes,0))-(record.candidates.filter(c=>c.party==='R').reduce((a,c)=>a+c.votes,0))):null;
  const forecast=model.house.find(x=>x.id===key),shade=off==='House'?(live&&cparty?cparty:party(forecast?.margin)):'N';
  const title=off==='House'?key+(record?' · reporting '+record.total.toLocaleString()+' votes':forecast?' · projection '+margin(forecast.margin):' · forecast unavailable'):(f.properties?.name||id)+' County · no county-level vote totals verified';
  const d=geoToPaths(f.geometry).flatMap(poly=>poly.map(ring=>ring.map((xy,i)=>{const p=projection(xy,bounds,width,height);return(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)}).join(' ')+' Z')).join(' ');
  return '<path class="atlas-unit atlas-'+shade+'" data-unit="'+esc(id)+'" d="'+d+'"><title>'+esc(title)+'</title></path>';
 }).join('');
}
async function drill(){
 const target=$('electionDrill'),title=$('electionDrillTitle'),summary=$('electionDrillSummary'),svg=$('electionLocalMap');if(!target)return;
 title.textContent=(stateName[selected]||selected)+' · '+office;
 const items=byState(selected,office),actual=Object.values(returns).filter(x=>x.id.startsWith(selected+'-')&&x.office===office);
 summary.innerHTML=items.length?items.slice(0,16).map(r=>{
  const report=returns[r.id],names=[r.dem,r.rep].filter(Boolean).join(' vs. ');
  const counted=report?report.candidates.slice().sort((a,b)=>b.votes-a.votes).map(c=>'<span>'+esc(c.name)+' ('+esc(c.party)+') '+c.votes.toLocaleString()+'</span>').join(' · '):'No verified votes from connected feeds';
  return '<div class="atlas-result"><a href="../state/?state='+selected+(office==='House'?'#stateHouse':'#stateOverview')+'"><b>'+esc(r.id)+'</b></a> '+esc(names)+' <strong>'+esc(margin(r.margin))+'</strong><small>'+(report?'UNOFFICIAL · '+counted:'PROJECTED · '+counted)+'</small></div>';
 }).join(''):'No modeled '+office.toLowerCase()+' race here. State election-night sources remain accessible through the state desk.';
 const file=office==='House'?'geo/districts/'+selected+'.json':'geo/counties/'+selected+'.json';
 svg.innerHTML='<text x="12" y="35">Loading boundaries…</text>';svg.setAttribute('viewBox','0 0 820 520');
 try{
  const geo=await read(file);
  if(selected!==geo.state)return;
  svg.innerHTML=mapStateFeatures(geo.features||[],office);
  $('electionLocalStatus').textContent=office==='House'?'Congressional district projections in solid colors; verified vote leaders replace projections when available.':'County boundaries shown; colors remain neutral until independently attributed county returns are available. Statewide totals are not apportioned to counties.';
  if(office!=='House')paintCounties();
 }catch(e){svg.textContent='County/district geometry temporarily unavailable. Statewide reporting and forecasts above remain accessible.'}
}
function paintCounties(){
 // Only attributed county-level values are eligible; never copy statewide results into counties.
 const state=countyReports?.states?.[selected],list=state?.races?.[office]?.counties||[];
 for(const p of $('electionLocalMap')?.querySelectorAll('[data-unit]')||[]){
  const row=Array.isArray(list)?list.find(c=>String(c.fips)===p.dataset.unit):null;
  if(!row||!Number.isFinite(row.dem)||!Number.isFinite(row.rep))continue;
  p.setAttribute('class','atlas-unit atlas-'+party(row.dem-row.rep));
  p.querySelector('title').textContent=(row.county||'County')+' · D '+row.dem.toLocaleString()+' / R '+row.rep.toLocaleString()+' (unofficial)';
 }
}
function chooseState(code){selected=code;drill()}
function updatePhase(){
 if(!model.senate.length)return;
 const shouldShow=Date.now()>=finalAt||live;
 $('electionDashboard').hidden=!shouldShow;
 $('dashboardTitle').textContent=live?'Election night · America votes':'Final predictions · 2026';
 $('dashboardIntro').textContent=live?'Verified, unofficial vote leaders are displayed where reporting exists. Unreported geography retains the forecast shading, which is not a race call.':'Solid colors designate projected party leads by the Ervin Model; not race calls or certified results. Select a state to inspect each race.';
 $('reportingBanner').textContent=live?'LIVE / VERIFIED RETURNS · '+Object.keys(returns).length+' races reporting · checked '+new Date(lastResults||Date.now()).toLocaleTimeString():'FINAL FORECAST VIEW · NOV 3, 2026 · BASED ON LATEST PUBLISHED POLLING SNAPSHOT';
 $('nationMap').hidden=live;
 $('watchSection').hidden=live;
 $('balanceOfPower').hidden=live;
 $('stateDirectory').hidden=live;
 $('editorialNotes').hidden=live;
 const headline=document.querySelector('.ed-headline'),standfirst=document.querySelector('.ed-standfirst');
 if(headline)headline.textContent=live?'Election night 2026':'Every state. One clear picture.';
 if(standfirst)standfirst.textContent=live?'Verified, unofficial election returns from CivicAPI and attributed state sources. Select a state for statewide totals, county geography and congressional districts. Projections stay separate from counted votes.':'Explore the races shaping 2026 in a single state edition. Senate and governor polling, all House districts, county-level historical patterns, conditional forecasts and reported votes belong in one place.';
 if(shouldShow&&!live&&!watched.some(r=>r.id==='final-predictions')){
  watched.unshift({id:'final-predictions',office:'Final',state:'National atlas',code:'US',margin:null,kind:'feature'});
  position=0;drawWatch();
 }
 map();drill();
}
async function refreshResults(){
 if(busy||!window.ERVIN_RETURNS)return;busy=true;
 try{
  const core=window.ERVIN_RETURNS,of=['Senate','Governor','House'];
  const all=await Promise.allSettled([read('civicapi/races.json'),read('election-night/county-returns.json'),...of.map(x=>fetch('https://openamerica.io/elections/results.json?year=2026&office='+x,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('API '+r.status);return r.json()}))]);
  const civic=all[0].status==='fulfilled'?core.civic(all[0].value):{};
  if(all[1].status==='fulfilled')countyReports=all[1].value;
  const secondary={};of.forEach((x,i)=>{if(all[i+2].status==='fulfilled')Object.assign(secondary,core.openAmerica(all[i+2].value,x))});
  const merged=core.reconcile([core.preferCivic(civic,secondary).races],returns);
  returns=merged.races;const prev=live;live=Object.keys(returns).length>0;lastResults=Date.now();
  if(live||prev!==live)updatePhase();
  else if(Date.now()>=finalAt&&model.senate.length)updatePhase();
 }catch(e){console.warn('Live homepage check failed; saved verified data preserved',e)}
 finally{busy=false}
}
function init(){
 watchInit();
 for(const b of document.querySelectorAll('[data-atlas-office]'))b.addEventListener('click',()=>{office=b.dataset.atlasOffice;document.querySelectorAll('[data-atlas-office]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));map();drill()});
 $('electionStateSelect')?.addEventListener('change',e=>chooseState(e.target.value));
 $('electionStateSelect').innerHTML=states.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>'<option value="'+s.code+'">'+esc(s.name)+'</option>').join('');
 $('electionStateSelect').value=selected;
 $('electionNationalMap')?.addEventListener('click',e=>{const a=e.target.closest('[data-choose-state]');if(a){$('electionStateSelect').value=a.dataset.chooseState}});
 loadModel().catch(e=>{$('watchCards').textContent='Forecast models temporarily unavailable. Open a state edition for saved predictions.';console.error(e)});
 refreshResults();setInterval(()=>{if(!document.hidden)refreshResults()},30000);
 setInterval(()=>{if(model.senate.length&&Date.now()>=finalAt&&!live&&!$('electionDashboard').hidden){}else if(model.senate.length&&Date.now()>=finalAt&&!live)updatePhase()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();