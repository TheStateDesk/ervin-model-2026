/* Ervin Model 2026: homepage watch carousel, final projection atlas and verified-live handoff.
 * Forecasts and vote returns are separate datasets. No synthetic votes or calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root='../', finalAt=Date.parse('2026-11-03T12:00:00-05:00'), read=async(p)=>{const fetchRaw=async()=>{const r=await fetch(root+p,{cache:'no-store'});if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json()};return window.ERVIN_FINAL?window.ERVIN_FINAL.get(p,fetchRaw):fetchRaw()};
const margin=n=>!Number.isFinite(n)?'No numerical forecast':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
const states=window.ERVIN_US_GEOGRAPHY?.states||[], stateName=Object.fromEntries(states.map(s=>[s.code,s.name]));
let paused=false,cycles=0,model={senate:[],governor:[],house:[]}, watched=[],position=0,office='Senate',selected='MI',returns={},countyReports={},live=false,busy=false,lastResults=0,rotateTimer=null,lockedAt=null,phaseConfig={phase:'auto'},latestFeedAt=null,lastExternalFetch=0,modelBalance=null,phaseLast='forecast';
const isValid=n=>typeof n==='number'&&Number.isFinite(n), party=n=>!isValid(n)?'N':n>0?'D':n<0?'R':'T';
function label(x){return x.state+' · '+x.office+(x.office==='House'?' '+x.id:'')}
function races(){
 // Both candidates can be named and photographed on statewide races.
 const available=[...model.senate,...model.governor].filter(r=>isValid(r.margin)&&r.dem&&r.rep);
 return available.sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin));
}
function oddsText(r){
 if(!r.odds)return '';
 const d=window.ERVIN_ODDS.pct(r.odds.dem),rep=window.ERVIN_ODDS.pct(r.odds.rep);
 return '<div class="watch-chance"><div><b>'+d+'</b><small>'+esc(r.dem)+' · '+(r.office==='Senate'&&['MT','NE','SD'].includes(r.code)?'Ind.':'Dem.')+'</small></div><div><b>'+rep+'</b><small>'+esc(r.rep)+' · R</small></div></div>';
}
function watchFaces(r){
 return '<div class="watch-card__people watch-card__people--pair">'+[['D',r.dem],['R',r.rep]].map(([side,name])=>
 '<div class="watch-person '+side+'"><div class="watch-photo watch-photo--candidate" data-watch-photo="'+esc(r.id)+'-'+side+'">'+esc((name||'?').split(' ').map(w=>w[0]).slice(0,2).join(''))+'</div><span class="watch-candidate-name">'+esc(name||'Candidate not confirmed')+'</span></div>').join('')+'</div>';
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
  const source=r.kind==='poll'?'Publisher polling average':'Ervin forecast ('+r.office+')';
  const href='../state/?state='+encodeURIComponent(r.code)+(r.office==='House'?'#stateHouse':'#stateOverview');
    return '<article class="watch-card"><div class="watch-card__overline">'+esc(r.office)+' · #'+(position+i+1)+' CLOSEST</div>'+
  '<a class="watch-card__name" href="'+href+'">'+esc(label(r))+'</a>'+
  watchFaces(r)+
  '<div class="watch-card__margin '+party(r.margin)+'">'+esc(margin(r.margin))+'</div>'+
  oddsText(r)+'<small>'+esc(source)+' · rough odds</small>'+
  '<a class="watch-card__open" href="'+href+'">State details</a></article>';
 }).join('');
 $('watchPosition').textContent=(position+1)+'–'+(position+visible.length)+' of '+watched.length;
 $('watchPrev').disabled=false;$('watchNext').disabled=false;
 visible.forEach(r=>{if(r.id==='final-predictions')return;for(const [side,name] of [['D',r.dem],['R',r.rep]])window.ERVIN_PORTRAITS?.attach(panel.querySelector('[data-watch-photo="'+r.id+'-'+side+'"]'),name)});
}
function watchInit(){
 const panel=$('watchSection');if(!panel)return;
 const advance=direction=>{if(!watched.length)return;position=(position+direction+watched.length)%watched.length;drawWatch()};
 $('watchPrev')?.addEventListener('click',()=>advance(-4));
 $('watchNext')?.addEventListener('click',()=>advance(4));
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 if(reduced){paused=true;const b=$('watchPause');if(b){b.textContent='Rotation off';b.disabled=true}}
 $('watchPause')?.addEventListener('click',()=>{paused=!paused;const b=$('watchPause');b.setAttribute('aria-pressed',String(paused));b.textContent=paused?'Resume rotation':'Pause rotation'});
 if(!reduced){
  let hover=false,focus=false;
  panel.addEventListener('mouseenter',()=>hover=true);
  panel.addEventListener('mouseleave',()=>hover=false);
  panel.addEventListener('focusin',()=>focus=true);
  panel.addEventListener('focusout',e=>focus=panel.contains(e.relatedTarget));
  rotateTimer=setInterval(()=>{if(!document.hidden&&!hover&&!focus&&!paused&&!live&&watched.length>4&&cycles<Math.ceil(watched.length/4)){advance(4);cycles++}},7000);
 }
}
function drawHouseWatch(){
 const list=$('houseWatchList'),label=$('houseWatchCount');if(!list)return;
 const nearest=model.house.filter(r=>isValid(r.margin)).sort((a,b)=>Math.abs(a.margin)-Math.abs(b.margin)).slice(0,12);
 const tossups=model.house.filter(r=>isValid(r.margin)&&Math.abs(r.margin)<=1.5).length;
 if(label)label.textContent=tossups+' toss-up districts within ±1.5 points';
 list.innerHTML=nearest.length?nearest.map(r=>{
  const to='../state/?state='+encodeURIComponent(r.code)+'#stateHouse';
  const rating=Math.abs(r.margin)<=1.5?'Toss-up':r.rating||'Competitive';
  return '<a class="ed-house-watch-row" href="'+to+'"><strong>'+esc(r.id)+'</strong><span>'+esc(r.state)+'</span><b class="'+party(r.margin)+'">'+esc(margin(r.margin))+'</b><small>'+esc(rating)+'</small></a>';
 }).join(''):'<p class="ed-mini">The House model is temporarily unavailable; browse districts by state.</p>';
}
async function loadModel(){
 const [sen,gov,house,history]=await Promise.all([read('counties-watch/forecast-baselines.json'),read('governors/data.json'),read('house/ervin-forecast-2026-11-02.json'),read('research/governor-same-office-2014-2024.json')]);
 const applied=window.ERVIN_STATEWIDE.apply(history,gov,sen);
 model.senate=applied.senate.map(x=>({id:x.code+'-SENATE',code:x.code,state:x.state||stateName[x.code],office:'Senate',margin:x.model.adjustedMargin,dem:x.nonR,rep:x.rep,kind:'model',odds:window.ERVIN_ODDS?.estimate(x.model.adjustedMargin,'Senate')}));
 model.governor=applied.governor.map(x=>{const adjusted=isValid(x.model.adjustedMargin),m=adjusted?x.model.adjustedMargin:x.model.pollMargin;return{id:x.code+'-GOVERNOR',code:x.code,state:x.state||stateName[x.code],office:'Governor',margin:m,dem:x.dem,rep:x.rep,kind:adjusted?'model':'poll',qualitativeRating:x.qualitativeRating?.label||null,odds:window.ERVIN_ODDS?.estimate(m,'Governor',{cycles:x.model?.calibrationCycles||0})}});
 model.house=Object.values(house.races||{}).map(x=>({id:x.id,code:x.state,state:stateName[x.state]||x.state,office:'House',margin:x.marginD,kind:'model',rating:x.modelRating}));
 modelBalance=window.ERVIN_POWER?.compute?.(house,applied.senate,applied.governor)||null;watched=races();window.ERVIN_HOME_FORECAST=model;window.dispatchEvent(new CustomEvent('ervin:forecast-ready',{detail:{asOf:sen.asOf||gov.asOf}}));drawWatch();drawHouseWatch();updatePhase();
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
function finalForecastHeadline(){
 const b=modelBalance;if(!b)return 'Final Ervin forecast · 2026';
 const h=b.house.U?'House outlook includes '+b.house.U+' non-numeric House ballot exception(s)':b.house.D>=218?'Democrats favored to flip the House':b.house.R>=218?'Republicans favored to keep the House':'House control depends on the competitive districts';
 const senate=b.senate;
 const toss=model.senate.filter(r=>isValid(r.margin)&&Math.abs(r.margin)<1.5).map(r=>r.state||stateName[r.code]||r.code);
 const names=toss.length===1?toss[0]:toss.length===2?toss.join(' and '):toss.length>2?toss.slice(0,-1).join(', ')+' and '+toss.at(-1):'the remaining toss-ups';
 const d=senate.D+(senate.I||0);
 const s=d>=51?'Democrats favored to win the Senate':senate.R>=50?'Republicans favored to keep the Senate':'Senate control comes down to '+names;
 return h+'; '+s;
}
function updatePhase(){
 if(!model.senate.length)return;
 const now=Date.now(),preview=new URLSearchParams(location.search).get('preview');
 const override=['forecast','final','closing','live'].includes(phaseConfig.phase)?phaseConfig.phase:null;
 const isFinal=!!lockedAt&&now>=finalAt,closingAt=Date.parse('2026-11-03T17:55:00-05:00');
 const archived=new URLSearchParams(location.search).get('view')==='final';
 const phase=archived?'final':['final','closing','live'].includes(preview)?preview:override||(live?'live':now>=closingAt?'closing':isFinal?'final':'forecast');
 // There is one primary fifty-state forecast map. Detailed results appear as
 // a separate LIVE desk only when verified votes have been accepted.
 const showResults=phase==='live'||phase==='closing',forecastPublished=phase==='final'||phase==='closing'||showResults;
 $('electionDashboard').hidden=!showResults;
 const n=Object.keys(returns).length;
 $('dashboardTitle').textContent=showResults?(n?'Election night · reported votes':'Election night · awaiting verified returns'):'Final predictions · 2026';
 $('dashboardIntro').textContent=showResults?'The first polls close at 6 p.m. ET. Accepted unofficial reported votes are labeled separately from the locked forecast; areas without attributed returns remain gray.':'The Ervin forecast is a pre-election estimate.';
 $('reportingBanner').textContent=showResults?(n?('UNOFFICIAL RETURNS · '+n+' contest'+(n===1?'':'s')+' with source-validated totals'+(latestFeedAt?' · source update '+(window.ERVIN_AP_DATE?.timestamp(latestFeedAt)||new Date(latestFeedAt).toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'})):'')):'ELECTION NIGHT DESK OPEN · First polls close at 6 p.m. ET · Awaiting accepted vote reports'):'';
 for(const id of ['watchSection','balanceOfPower','stateDirectory','editorialNotes'])if($(id))$(id).hidden=false; // The States / Counties selector owns map visibility.
 const headline=document.querySelector('.ed-headline'),standfirst=document.querySelector('.ed-standfirst');
 const status=window.document.getElementById('finalPhaseStatus');
 if(headline)headline.textContent=showResults?(n?'Election Night 2026: The First Returns':'Election Night 2026: The Count Begins'):forecastPublished&&lockedAt?(phaseConfig.headline||finalForecastHeadline()):preview==='final'?'Rehearsal only · '+finalForecastHeadline():forecastPublished?'Election Day 2026: final forecast awaiting source lock':'Every state. One clear picture.';
 if(standfirst){
  const forecast=modelBalance?.house?.U?'House totals include '+modelBalance.house.U+' contests without a comparable two-party numerical margin. ':modelBalance?.house?.D>=218?'Democrats lead in '+modelBalance.house.D+' House districts under the model. ':modelBalance?'House control depends on competitive districts. ':'';
  standfirst.textContent=showResults?(n?n+' contest'+(n===1?' has':'s have')+' accepted unofficial counts. No leader is treated as a projected or certified winner. The final pre-election prediction remains above, separate from the incoming results.':'Polls begin closing at 6 p.m. Eastern. Our final House, Senate, and governor predictions are displayed above. The results desk will show validated unofficial returns as they arrive.') :forecastPublished?'The Ervin Model’s final House, Senate, and governor winner predictions are locked. Open a map above to inspect the forecast for any state or district.':'Explore Senate and governor polling, House districts, county scenarios and attributed results in one state edition.';
 }
 if(status){
  status.textContent=forecastPublished?(lockedAt?'Forecast locked '+(window.ERVIN_AP_DATE?.timestamp(lockedAt)||new Date(lockedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}))+' · The forecast is not revised as votes are counted.':'Polls are closing · final source lock has not been verified; estimates remain provisional.'):
    preview==='final'&&!lockedAt?'REHEARSAL ONLY · Final forecast will be published after an immutable source lock.':'Final forecast scheduled for noon Nov. 3 · no current vote totals are used.';
 }
 if((forecastPublished||showResults)&&rotateTimer){clearInterval(rotateTimer);rotateTimer=null;const pause=$('watchPause');if(pause){pause.textContent='Rotation stopped';pause.disabled=true}}
 if(showResults&&phaseLast!==phase)window.dispatchEvent(new CustomEvent('ervin:home-live',{detail:{count:n}}));
 phaseLast=phase;
}
async function refreshResults(){
 if(busy||!window.ERVIN_RETURNS)return;busy=true;
 try{
  const core=window.ERVIN_RETURNS,of=['Senate','Governor','House'];
  const checkExternal=Date.now()-lastExternalFetch>300000;
  if(checkExternal)lastExternalFetch=Date.now();
  const all=await Promise.allSettled([read('civicapi/races.json'),read('election-night/county-returns.json'),...of.map(x=>checkExternal&&window.ERVIN_EXTERNAL_FEED
   ?window.ERVIN_EXTERNAL_FEED.json('https://openamerica.io/elections/results.json?year=2026&office='+x,{timeout:11000})
   :Promise.resolve(null))]);
  const civic=all[0].status==='fulfilled'?core.civic(all[0].value):{};
  if(all[1].status==='fulfilled')countyReports=all[1].value;
  const secondary={};of.forEach((x,i)=>{if(all[i+2].status==='fulfilled'&&all[i+2].value)Object.assign(secondary,core.openAmerica(all[i+2].value,x))});
  const merged=core.reconcile([core.preferCivic(civic,secondary).races],returns);
  returns=merged.races;const prev=live;live=Object.keys(returns).length>0;lastResults=Date.now();
  window.ERVIN_HOME_RESULTS={races:returns,checkedAt:lastResults,source:'Validated civicAPI or explicitly attributed fallback'};
  window.dispatchEvent(new CustomEvent('ervin:home-results-update',{detail:{count:Object.keys(returns).length}}));const timestamps=Object.values(returns).map(x=>Date.parse(x.asOf||x.updatedAt||'')).filter(Number.isFinite);if(timestamps.length)latestFeedAt=Math.max(...timestamps);
  if(live||prev!==live)updatePhase();
  else if(model.senate.length)updatePhase();
 }catch(e){console.warn('Live homepage check failed; saved verified data preserved',e)}
 finally{busy=false}
}
function init(){
 watchInit();
 Promise.all([window.ERVIN_FINAL?.load?.()||Promise.resolve(null),window.ERVIN_FINAL?.status?.()||Promise.resolve({phase:'auto'})]).then(([snap,status])=>{lockedAt=snap?.lockedAt||null;phaseConfig=status||{phase:'auto'};return loadModel()}).catch(e=>{$('watchCards').textContent='Forecast models temporarily unavailable. Open a state edition for saved predictions.';console.error(e)});
 refreshResults();setInterval(()=>{if(!document.hidden)refreshResults()},30000);
 setInterval(()=>{if(model.senate.length)updatePhase()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();