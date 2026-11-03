/* National State Desk: fifty real SVG states; all races on hover, aggregate muted tint. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=(window.ERVIN_US_GEOGRAPHY?.states||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
const names=Object.fromEntries(states.map(x=>[x.code,x.name]));
const selectedOffice=new URLSearchParams(location.search).get('office');
const focusedOffice=['house','governor'].includes(selectedOffice)?selectedOffice:null;
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
function stateTitle(s){const row=byState[s.code];return row?s.name+' — '+row.D+'D-'+row.R+'R-'+row.T+'T':s.name+' — loading forecasts';}
function tone(r){
 if(!r||!r.races.length)return 'var(--ed-map-neutral)';
 const net=(r.D-r.R)/(r.D+r.R+r.T||1);
 const strength=Math.min(.80,Math.abs(net)*.24+.53);
 // Pale blue = net Democratic; pale red = net Republican; sand = dead even.
 if(net>.025)return 'color-mix(in srgb, var(--ed-map-blue) '+Math.round(strength*100)+'%, var(--ed-map-base))';
 if(net<-.025)return 'color-mix(in srgb, var(--ed-map-red) '+Math.round(strength*100)+'%, var(--ed-map-base))';
 return 'color-mix(in srgb, var(--ed-map-even) 65%, var(--ed-map-base))';
}
function drawMap(){
 const svg=$('usMap'),geo=window.ERVIN_US_GEOGRAPHY;
 if(!geo?.states?.length){svg.textContent='State map unavailable. Use the index below.';return}
 svg.innerHTML=geo.states.map(s=>'<a href="'+href(s.code)+'" data-state-link="'+s.code+'" tabindex="0" aria-label="'+esc(stateTitle(s))+' — open state" class="ed-state-link"><path class="ed-state" data-state="'+s.code+'" d="'+s.d+'" style="fill:'+tone(byState[s.code])+'"><title>'+esc(stateTitle(s))+'</title></path></a>').join('');
 svg.setAttribute('viewBox',geo.viewBox||'0 0 1080 625');
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
 const displayed=featured.map(x=>'<div class="ed-map-race"><span>'+esc(x.label)+'</span><b>'+(x.type==='summary'?'':esc(MARGIN(x.margin)))+(x.type==='poll'?'<i> poll</i>':'')+'</b></div>').join('');
 tooltip.innerHTML='<div class="ed-map-tip-head"><strong>'+esc(r.name)+'</strong><b>'+r.D+'D–'+r.R+'R–'+r.T+'T</b></div><div class="ed-map-race-list">'+(displayed||'<span>No race estimates available</span>')+'</div><small>House: provisional Ervin. Governor historical correction applied only where comparable same-state results are sourced. Uncorrected publisher polls are distinctly identified. No race calls.</small>';
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
 $('stateRegions').innerHTML=Object.entries(REGION).map(([reg,values])=>{const set=new Set(values.split(' ')),arr=states.filter(s=>set.has(s.code));return '<div style="margin:18px 0 23px"><div class="ed-band" style="border-bottom:1px solid #bcc8cc;padding-bottom:7px;margin:0 0 11px"><h2 style="font:700 24px Georgia,serif;margin:0">'+esc(reg)+'</h2><span class="ed-mini">'+arr.length+' states</span></div><div class="ed-scrollrow" style="flex-wrap:wrap;overflow:visible">'+arr.map(s=>{const r=byState[s.code];return '<a class="ed-state-chip" href="'+href(s.code)+'" data-search-name="'+esc(s.name.toLowerCase())+'" data-state-code="'+s.code+'" data-state-code="'+s.code+'">'+esc(s.name)+(r?' <small>'+r.D+'D-'+r.R+'R-'+r.T+'T</small>':'')+'</a>'}).join('')+'</div></div>'}).join('');
 $('directoryCount').textContent=states.length+' state editions · modeled race aggregation';
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
 const [house,gov,sen,archive]=await Promise.all([read('../house/ervin-forecast-2026-11-02.json'),read('../governors/data.json'),read('../counties-watch/forecast-baselines.json'),read('../research/governor-same-office-2014-2024.json')]);
 const G=window.ERVIN_STATEWIDE.apply(archive,gov,sen);
 for(const state of states)byState[state.code]={name:state.name,code:state.code,races:[],D:0,R:0,T:0};
 for(const r of Object.values(house.races||{})){
  const state=byState[r.state];if(!state)continue;
  state.races.push({label:r.id+' · House '+r.modelRating,margin:Number.isFinite(r.marginD)?r.marginD:null,type:'model'});
 }
 for(const s of G.senate){
  if(byState[s.code])byState[s.code].races.push({label:'U.S. Senate · '+(s.code==='MI'?'Ervin’s Take':'Original Ervin'),margin:s.model.adjustedMargin,type:'model'});
 }
 for(const g of G.governor){
  if(byState[g.code])byState[g.code].races.push({label:'Governor · '+(Number.isFinite(g.model.adjustedMargin)?'Ervin’s Take':'publisher poll · no verified governor history'),margin:Number.isFinite(g.model.adjustedMargin)?g.model.adjustedMargin:g.model.pollMargin,type:Number.isFinite(g.model.adjustedMargin)?'model':'poll'});
 }
 for(const r of Object.values(byState)){for(const x of r.races){const side=rank(x.margin);if(side)r[side]++}r.races.sort((a,b)=>(a.label.startsWith('U.S. Senate')?0:a.label.startsWith('Governor')?1:2)-(b.label.startsWith('U.S. Senate')?0:b.label.startsWith('Governor')?1:2)||a.label.localeCompare(b.label))}
 const has=[...Object.values(byState)].filter(r=>r.D+r.R+r.T>0).length;
 $('aggregateLegend').textContent=has+' states with aggregate ratings · D/R/T counts include all modeled House districts and available statewide margins';
 drawMap();directory();search();for(const code of ['MI','TX','PA','GA','AZ','ME']){const el=document.querySelector('[data-quick-offices="'+code+'"]');if(el)el.textContent=[byState[code]?.races.some(x=>x.label.startsWith('U.S. Senate'))?'Senate':null,byState[code]?.races.some(x=>x.label.startsWith('Governor'))?'Governor':null,'House','Counties'].filter(Boolean).join(' · ');}
 }catch(e){console.error(e);$('aggregateLegend').textContent='Forecast aggregate unavailable; state links still work.'}
}
function init(){
 if(focusedOffice){
  const heading=focusedOffice==='house'?'U.S. House districts':'Governor elections';
  const cta=focusedOffice==='house'?'House candidates, polls and district maps':'Governor candidates, polls and statewide forecasts';
  const panel=$('officeFocus');
  if(panel){
   panel.hidden=false;
   panel.innerHTML='<strong>'+heading+'</strong><span>Choose any state using the map or search. Its consolidated State Desk edition opens directly to '+cta+'. The map colors remain aggregated across offices.</span><a href="./#nationMap">Show all offices</a>';
  }
 }
 drawMap();directory();
 $('quickSelect').innerHTML='<option value="">Choose a state…</option>'+states.map(s=>'<option value="'+s.code+'">'+esc(s.name)+'</option>').join('');
 $('quickSelect').onchange=e=>{if(names[e.target.value])location.href=href(e.target.value)};
 $('stateSearch').addEventListener('input',search);
 $('stateSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLowerCase(),match=states.find(s=>s.name.toLowerCase()===q||s.code.toLowerCase()===q)||states.find(s=>s.name.toLowerCase().startsWith(q));if(match)location.href=href(match.code);else {const status=$('stateSearchStatus');if(status)status.textContent='No state matches “'+e.target.value.trim()+'”';}});
 $('todayLabel').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 $('featuredStates').innerHTML='<div class="ed-kicker" style="margin-top:12px">Quick editions</div>'+['MI','TX','PA','GA','AZ','ME'].map(code=>'<article><a href="'+href(code)+'"><strong>'+esc(names[code]||code)+'</strong></a><small data-quick-offices="'+code+'">House · Counties</small></article>').join('');
 populate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();