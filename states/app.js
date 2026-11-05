/* National State Desk: fifty real SVG states; all races on hover, aggregate muted tint. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=(window.ERVIN_US_GEOGRAPHY?.states||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
const names=Object.fromEntries(states.map(x=>[x.code,x.name]));
const selectedOffice=new URLSearchParams(location.search).get('office');
const focusedOffice=['house','governor'].includes(selectedOffice)?selectedOffice:null;
let mapOffice=['house','governor','senate'].includes(selectedOffice)?selectedOffice:'senate',mapView=new URLSearchParams(location.search).get('view')==='final'?'forecast':'reported';
const href=code=>'../state/?state='+encodeURIComponent(code)+(focusedOffice==="house"?'#stateHouse':focusedOffice==="governor"?'#stateOverview':'');
const REGION={Northeast:'CT ME MA NH NJ NY PA RI VT',Midwest:'IL IN IA KS MI MN MO NE ND OH SD WI',South:'AL AR DE FL GA KY LA MD MS NC OK SC TN TX VA WV',West:'AK AZ CA CO HI ID MT NV NM OR UT WA WY'};
const MARGIN=n=>!Number.isFinite(n)?'No comparable margin':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
const rank=n=>!Number.isFinite(n)?null:Math.abs(n)<=1.5?'T':n>0?'D':'R';
let byState={},stateScenarios={};
function summarize(){
 const all=Object.fromEntries(states.map(x=>[x.code,{name:x.name,code:x.code,races:[],D:0,R:0,T:0}]));
 for(const x of Object.values(all)){
  for(const r of x.races){let k=rank(r.margin);if(k)x[k]++}
 }
 byState=all;
}
function officeTotals(row,office){
 const counts={D:0,R:0,T:0};
 if(!row)return counts;
 for(const race of row.races||[]){
  const eligible=office==='house'?race.label.includes(' · House '):office==='governor'?race.label.startsWith('Governor'):race.label.startsWith('U.S. Senate');
  if(eligible){const type=rank(race.margin)||(office==='senate'?race.ratingParty:null);if(type)counts[type]++;}
 }
 return counts;
}
function totalsText(c){return c.D+'D–'+c.R+'R–'+c.T+'T'}
function stateTitle(s){const row=byState[s.code];return row?s.name+' — '+mapOffice+' '+totalsText(officeTotals(row,mapOffice)):s.name+' — loading forecasts';}
function officeRaces(r){
 if(!r)return [];
 return r.races.filter(x=>mapOffice==='house'?x.label.includes(' · House '):mapOffice==='governor'?x.label.startsWith('Governor'):x.label.startsWith('U.S. Senate'));
}
function liveLead(code){
 const raw=window.ERVIN_HOME_RESULTS?.races;
 if(!raw)return null;
 const office=mapOffice==='house'?'House':mapOffice==='governor'?'Governor':'Senate';
 const matched=Object.values(raw).filter(x=>x.id?.startsWith(code+'-')&&x.office===office&&x.total>0);
 if(!matched.length)return null;
 const leader=(row)=>{
  const sorted=(row.candidates||[]).slice().sort((a,b)=>b.votes-a.votes);
  if(!sorted.length)return null;
  if(sorted.length>1&&sorted[0].votes===sorted[1].votes)return'T';
  return ['D','R'].includes(sorted[0].party)?sorted[0].party:'T';
 };
 const count={D:0,R:0,T:0};for(const row of matched){const p=leader(row);if(p)count[p]++}
 const party=matched.length===1?leader(matched[0]):count.D>count.R?'D':count.R>count.D?'R':'T';
 return {party,matched:matched.length,records:matched,office};
}
function forecastTone(r){
 const races=officeRaces(r),valid=races.filter(x=>Number.isFinite(x.margin));
 if(!valid.length){const sourced=races.find(x=>x.type==='source-rating'&&x.ratingParty);if(sourced){const tier=sourced.rating?.startsWith('Solid')?'solid':sourced.rating?.startsWith('Likely')?'likely':'lean';return 'var(--ed-grade-'+tier+'-'+sourced.ratingParty.toLowerCase()+')';}return 'var(--ed-map-neutral)';}
 if(valid.length===1){
  const m=valid[0].margin;
  if(Math.abs(m)<1.5)return 'var(--ed-grade-toss)';
  const party=m>0?'d':'r';
  const tier=Math.abs(m)>=17?'solid':Math.abs(m)>=9?'likely':'lean';
  return 'var(--ed-grade-'+tier+'-'+party+')';
 }
 const counts={D:0,R:0,T:0};
 for(const x of valid){const k=rank(x.margin);if(k)counts[k]++}
 if(counts.T===valid.length)return 'var(--ed-map-even)';
 const net=(counts.D-counts.R)/valid.length;
 if(Math.abs(net)<.025)return 'var(--ed-map-even)';
 const strength=Math.min(.88,Math.max(.45,Math.abs(net)*.4+.48));
 return 'color-mix(in srgb, var(--ed-map-'+(net>0?'blue':'red')+') '+Math.round(strength*100)+'%, var(--ed-map-base))';
}
function tone(r){
 if(mapView==='forecast')return forecastTone(r);
 const code=r?.code,live=liveLead(code);
 if(!live)return mapView==='reported'?'var(--ed-map-neutral)':forecastTone(r);
 const base=live.party==='D'?'var(--ed-map-blue)':live.party==='R'?'var(--ed-map-red)':'var(--ed-map-even)';
 return mapView==='compare'?'color-mix(in srgb, '+base+' 83%, '+forecastTone(r)+')':base;
}
function setMapView(which){
 mapView=which;
 for(const b of document.querySelectorAll('[data-state-map-view]'))b.setAttribute('aria-pressed',String(b.dataset.stateMapView===which));
 const label=$('aggregateLegend');
 if(label)label.textContent=mapView==='reported'?'UNOFFICIAL reported 2026 vote leaders only. Gray states have no accepted result for this office. Independents are not automatically labeled Democratic.':
  mapView==='compare'?'Reported vote leaders shown in stronger colors; faded states remain pre-election projections. No race calls or missing vote totals are inferred.':
  'Pre-election '+mapOffice+' forecasts; gold denotes estimated toss-ups, gray means no supported forecast.';
 drawMap();
}
function drawTileMap(){
 const target=$('mobileTileMap');if(!target)return;
 target.innerHTML=states.map(s=>'<a href="'+href(s.code)+'" aria-label="'+esc(s.name)+' state edition" title="'+esc(s.name)+'" style="background:'+tone(byState[s.code])+'">'+s.code+'</a>').join('');
}
function setOffice(which){
 mapOffice=which;
 for(const button of document.querySelectorAll('[data-map-office]'))button.setAttribute('aria-pressed',String(button.dataset.mapOffice===mapOffice));
 const text=$('aggregateLegend');if(text)text.textContent=mapView==='reported'?'Verified 2026 reported vote leaders only · gray is unreported':mapView==='compare'?'Reported results compared with faded forecasts':'2026 '+(mapOffice==='house'?'House districts':mapOffice==='governor'?'governor':'Senate')+' forecasts · gold: estimated toss-up';
 drawMap();drawTileMap();
}
function drawMap(){
 const svg=$('usMap'),geo=window.ERVIN_US_GEOGRAPHY;
 if(!geo?.states?.length){svg.textContent='State map unavailable. Use the index below.';return}
 svg.innerHTML=geo.states.map(s=>{const actual=liveLead(s.code),fade=mapView==='compare'&&!actual;
 return '<a href="'+href(s.code)+'" data-state-link="'+s.code+'" tabindex="0" aria-label="'+esc(stateTitle(s))+' — open state" class="ed-state-link"><path class="ed-state" data-state="'+s.code+'" data-report-status="'+(actual?'reported':'unreported')+'" d="'+s.d+'" style="fill:'+tone(byState[s.code])+';'+(fade?'opacity:.45;stroke-dasharray:3 2;':'')+'"><title>'+esc(stateTitle(s))+(mapView==='reported'?' · '+(actual?'UNOFFICIAL reported leader':'no verified vote return'):mapView==='compare'?' · '+(actual?'reported vs forecast':'forecast only'):'')+'</title></path></a>'}).join('');
 svg.setAttribute('viewBox',geo.viewBox||'0 0 1080 625');
 drawTileMap();
 for(const a of svg.querySelectorAll('a[data-state-link]')){
  a.addEventListener('pointerenter',event=>show(a.dataset.stateLink,event));a.addEventListener('pointermove',event=>locate(event));
  a.addEventListener('pointerleave',hide);a.addEventListener('focus',()=>show(a.dataset.stateLink,null));a.addEventListener('blur',hide);
 }
}
function show(code,event){
 const r=byState[code],tooltip=$('stateMapTooltip');if(!r||!tooltip)return;
 const statewides=r.races.filter(x=>!x.label.includes(' · House '));
 const houses=r.races.filter(x=>x.label.includes(' · House ')).sort((a,b)=>Math.abs(a.margin??999)-Math.abs(b.margin??999));
 const houseCounts={D:0,R:0,T:0};for(const x of houses){const k=rank(x.margin);if(k)houseCounts[k]++}
 const featured=[...statewides,...(houses.length?[{label:'House: '+houseCounts.D+' D · '+houseCounts.R+' R · '+houseCounts.T+' toss-ups',margin:null,type:'summary'},...houses.slice(0,3)]:[])];
 const displayed=featured.map(x=>'<div class="ed-map-race"><span>'+esc(x.label)+'</span><b>'+(x.type==='summary'?'':esc(x.type==='source-rating'?x.rating:MARGIN(x.margin)))+(x.type==='poll'?'<i> poll</i>':x.type==='source-rating'?'<i> publisher rating</i>':'')+'</b></div>').join('');
 const live=liveLead(code);
 const liveText=mapView==='forecast'?'':live?'<p class="ed-mini"><strong>UNOFFICIAL counted '+esc(live.office)+' contests: '+live.matched+'</strong> · '+esc(live.records.map(row=>row.candidates.slice().sort((a,b)=>b.votes-a.votes).slice(0,2).map(c=>c.party+' '+c.votes.toLocaleString()).join(' / ')).join('; '))+'</p>':'<p class="ed-mini">No validated 2026 reported vote totals for this state and office.</p>';
 const raceHeader=mapOffice==='senate'&&officeTotals(r,'senate').D+officeTotals(r,'senate').R+officeTotals(r,'senate').T===0?'No Senate race in 2026':(mapOffice==='senate'?'Senate':mapOffice==='governor'?'Governor':'House')+' '+totalsText(officeTotals(r,mapOffice));
 tooltip.innerHTML='<div class="ed-map-tip-head"><strong>'+esc(r.name)+'</strong><b>'+esc(raceHeader)+'</b></div><div class="ed-map-race-list">'+(displayed||'<span>No race estimates available</span>')+'</div>'+liveText+'<small>House: provisional Ervin. Governor historical correction applied only where comparable same-state results are sourced. Uncorrected publisher polls are distinctly identified. No race calls.</small>';
 tooltip.hidden=false;locate(event);
}
function locate(event){
 const surface=document.querySelector('.ed-map-surface'),tooltip=$('stateMapTooltip');if(tooltip.hidden)return;
 if(!event){const focus=document.activeElement?.querySelector?.('path.ed-state');const p=focus?.getBoundingClientRect(),b=surface.getBoundingClientRect();tooltip.style.left=Math.max(4,Math.min(p?p.left-b.left:10,b.width-tooltip.offsetWidth-7))+'px';tooltip.style.top=Math.max(4,Math.min(p?p.bottom-b.top+8:10,b.height-tooltip.offsetHeight-7))+'px';return}
 const box=surface.getBoundingClientRect(),x=event.clientX-box.left+15,y=event.clientY-box.top+15;
 tooltip.style.left=Math.min(Math.max(x,4),Math.max(4,box.width-tooltip.offsetWidth-7))+'px';
 tooltip.style.top=Math.min(Math.max(y,4),Math.max(4,box.height-tooltip.offsetHeight-7))+'px';
}
function hide(){const tooltip=$('stateMapTooltip');if(tooltip)tooltip.hidden=true}
function directory(){
 $('stateRegions').innerHTML=Object.entries(REGION).map(([reg,values])=>{
  const set=new Set(values.split(' ')),arr=states.filter(s=>set.has(s.code));
  return '<section class="ed-directory-region"><div class="ed-band ed-region-heading"><h2>'+esc(reg)+'</h2><span class="ed-mini">'+arr.length+' states</span></div><div class="ed-scrollrow ed-directory-chips">'+arr.map(s=>{
   const r=byState[s.code],sen=officeTotals(r,'senate'),gov=officeTotals(r,'governor'),house=officeTotals(r,'house');
   const mark=c=>(c.D+c.R+c.T)?totalsText(c):'—';
   return '<a class="ed-state-chip" href="'+href(s.code)+'" data-search-name="'+esc(s.name.toLowerCase())+'" data-state-code="'+s.code+'"><strong>'+esc(s.name)+'</strong><small>Sen '+mark(sen)+' · Gov '+mark(gov)+' · House '+mark(house)+'</small></a>';
  }).join('')+'</div></section>';
 }).join('');
 $('directoryCount').textContent=states.length+' state editions · Senate includes 17 numerical forecasts and 18 separately sourced qualitative ratings';
}
function search(){
 const status=$('stateSearchStatus');if(status)status.textContent='';const q=$('stateSearch').value.trim().toLowerCase(),matches=states.filter(s=>s.name.toLowerCase().includes(q)||s.code.toLowerCase()===q);
 for(const el of document.querySelectorAll('.ed-state-chip[data-search-name]'))el.hidden=!!q&&!el.dataset.searchName.includes(q)&&el.dataset.stateCode.toLowerCase()!==q;
 for(const p of document.querySelectorAll('path[data-state]')){
  const match=matches.some(s=>s.code===p.dataset.state);
  p.style.opacity=q&&!match?'.16':'1';
  p.style.filter=q&&match?'brightness(.87)':'';
 }
 $('directoryCount').textContent=q?matches.length+(matches.length===1?' state':' states')+' matching "'+q+'"':states.length+' state editions';
}
async function populate(){
 const read=async url=>{const fetchRaw=async()=>{const res=await fetch(url,{cache:'no-cache'});if(!res.ok)throw Error('Data '+url+' '+res.status);return res.json()};return window.ERVIN_FINAL?window.ERVIN_FINAL.get(url.replace(/^\.\.\//,''),fetchRaw):fetchRaw()};
 try{
 const [house,gov,sen,archive,qual]=await Promise.all([read('../house/ervin-forecast-2026-11-02.json'),read('../governors/data.json'),read('../counties-watch/forecast-baselines.json'),read('../research/governor-same-office-2014-2024.json'),read('../research/senate-qualitative-2026.json').catch(()=>({races:{}}))]);
 const G=window.ERVIN_STATEWIDE.apply(archive,gov,sen);
 for(const state of states)byState[state.code]={name:state.name,code:state.code,races:[],D:0,R:0,T:0};
 for(const r of Object.values(house.races||{})){
  const state=byState[r.state];if(!state)continue;
  state.races.push({label:r.id+' · House '+r.modelRating,margin:Number.isFinite(r.marginD)?r.marginD:null,type:'model'});
 }
 for(const s of G.senate){
  if(byState[s.code])byState[s.code].races.push({label:'U.S. Senate · '+(s.code==='MI'?'Ervin’s Take':'Original Ervin'),margin:s.model.adjustedMargin,type:'model'});
 }
 for(const [code,r] of Object.entries(qual.races||{})){
  if(byState[code]&&!byState[code].races.some(x=>x.label.startsWith('U.S. Senate'))){byState[code].races.push({label:'U.S. Senate · '+r.rating+' (independent source rating; not numerical Ervin)',margin:null,type:'source-rating',rating:r.rating,ratingParty:r.party,source:r.ratingSource});}
 }
 for(const g of G.governor){
  if(byState[g.code])byState[g.code].races.push({label:'Governor · '+(Number.isFinite(g.model.adjustedMargin)?'Ervin’s Take':'publisher poll · no verified governor history'),margin:Number.isFinite(g.model.adjustedMargin)?g.model.adjustedMargin:g.model.pollMargin,type:Number.isFinite(g.model.adjustedMargin)?'model':'poll'});
 }
 for(const r of Object.values(byState)){for(const x of r.races){const side=rank(x.margin)||(x.type==='source-rating'?x.ratingParty:null);if(side)r[side]++}r.races.sort((a,b)=>(a.label.startsWith('U.S. Senate')?0:a.label.startsWith('Governor')?1:2)-(b.label.startsWith('U.S. Senate')?0:b.label.startsWith('Governor')?1:2)||a.label.localeCompare(b.label))}
 const has=[...Object.values(byState)].filter(r=>r.D+r.R+r.T>0).length;
 $('aggregateLegend').textContent=has+' states with forecasts · select Senate, Governor or House for office-specific ratings';
 drawMap();directory();search();for(const code of ['MI','TX','PA','GA','AZ','ME']){const el=document.querySelector('[data-quick-offices="'+code+'"]');if(el)el.textContent=[byState[code]?.races.some(x=>x.label.startsWith('U.S. Senate'))?'Senate':null,byState[code]?.races.some(x=>x.label.startsWith('Governor'))?'Governor':null,'House','Counties'].filter(Boolean).join(' · ');}
 }catch(e){console.error(e);$('aggregateLegend').textContent='Forecast aggregate unavailable; state links still work.'}
}
function setAtlasView(mode){
 const showCounties=mode==='counties';
 const statesMap=$('nationMap'),countyMap=$('allCountyNation');
 if(statesMap)statesMap.hidden=showCounties;
 if(countyMap)countyMap.hidden=!showCounties;
 for(const b of document.querySelectorAll('[data-national-atlas-view]')){
  b.setAttribute('aria-pressed',String(b.dataset.nationalAtlasView===mode));
 }
}
function init(){
 for(const b of document.querySelectorAll('[data-national-atlas-view]'))b.addEventListener('click',()=>setAtlasView(b.dataset.nationalAtlasView));
 setAtlasView('states');
 if(focusedOffice){
  const heading=focusedOffice==='house'?'U.S. House districts':'Governor elections';
  const cta=focusedOffice==='house'?'House candidates, polls and district maps':'Governor candidates, polls and statewide forecasts';
  const panel=$('officeFocus');
  if(panel){
   panel.hidden=false;
   panel.innerHTML='<strong>'+heading+'</strong><span>Choose any state using the map or search. Its consolidated State Desk edition opens directly to '+cta+'. The map colors reflect the office selected above.</span><a href="./#nationMap">Show all offices</a>';
  }
 }
 drawMap();directory();
 for(const button of document.querySelectorAll('[data-map-office]'))button.addEventListener('click',()=>setOffice(button.dataset.mapOffice));
 for(const button of document.querySelectorAll('[data-state-map-view]'))button.addEventListener('click',()=>setMapView(button.dataset.stateMapView));
 window.addEventListener('ervin:home-results-update',()=>{if(mapView!=='forecast')drawMap()});
 window.addEventListener('ervin:home-live',()=>setMapView('reported'));
 setMapView(new URLSearchParams(location.search).get('view')==='final'?'forecast':'reported');
 $('quickSelect').innerHTML='<option value="">Choose a state…</option>'+states.map(s=>'<option value="'+s.code+'">'+esc(s.name)+'</option>').join('');
 $('quickSelect').onchange=e=>{if(names[e.target.value])location.href=href(e.target.value)};
 $('stateSearch').addEventListener('input',search);
 document.addEventListener('keydown',e=>{
  const el=e.target,editing=el?.matches?.('input, textarea, select, [contenteditable="true"]');
  if(e.key==='/'&&!editing&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('stateSearch').focus();}
 });
 try{
  const recent=localStorage.getItem('ervin-last-state');
  if(recent&&names[recent]){
   const link=$('recentStateLink');
   if(link){link.href=href(recent);link.textContent='Back to '+names[recent]+' →';link.hidden=false;}
  }
 }catch(_){};
 $('stateSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLowerCase(),match=states.find(s=>s.name.toLowerCase()===q||s.code.toLowerCase()===q)||states.find(s=>s.name.toLowerCase().startsWith(q));if(match)location.href=href(match.code);else {const status=$('stateSearchStatus');if(status)status.textContent='No state matches “'+e.target.value.trim()+'”';}});
 if(document.documentElement.classList.contains('ed-post-election')){$('todayLabel').textContent='Nov. 4, 2026 · Post-election edition'}else{fetch('../refresh_log.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(log=>{if(log?.checkedAt)$('todayLabel').textContent='Polls checked '+new Date(log.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});else $('todayLabel').textContent='Update time unavailable'}).catch(()=>{$('todayLabel').textContent='Update time unavailable'});}
 $('featuredStates').innerHTML='<div class="ed-kicker" style="margin-top:12px">Quick editions</div>'+['MI','TX','PA','GA','AZ','ME'].map(code=>'<article><a href="'+href(code)+'"><strong>'+esc(names[code]||code)+'</strong></a><small data-quick-offices="'+code+'">House · Counties</small></article>').join('');
 populate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();