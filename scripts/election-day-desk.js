/* Ervin Model 2026: frozen-forecast simulation evidence and election-night editorial desk.
   Static-site commentary is deterministic, generated only from normalized, source-attributed
   unofficial vote records; it does not invent live reporting, winner calls, or turnout. */
(()=>{'use strict';
const SWITCH_AT=Date.parse('2026-11-03T17:55:00-05:00');
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString('en-US');
const pct=n=>(100*n).toFixed(1)+'%';
const labelTime=when=>new Date(when).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const stateNames={AK:'Alaska',AZ:'Arizona',GA:'Georgia',IA:'Iowa',KS:'Kansas',ME:'Maine',MI:'Michigan',MN:'Minnesota',MT:'Montana',NC:'North Carolina',NE:'Nebraska',NH:'New Hampshire',OH:'Ohio',PA:'Pennsylvania',SD:'South Dakota',TX:'Texas',WI:'Wisconsin'};
const priorityStates=['MI','OH','TX','ME','GA','NC','IA','AK','NE','KS','MN'];
let active=false,ensemble=null,lastPost=0,posted=new Set(),selectedDistribution='house';
const pending=new Map(),seen=new Map();
function make(tag,cls,textValue){const el=document.createElement(tag);if(cls)el.className=cls;if(textValue!==undefined)el.textContent=textValue;return el;}
function safeLink(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function build(){
 const balance=$('balanceOfPower'),dashboard=$('electionDashboard');if(!balance||!dashboard)return;
 const insight=make('section','ed-sim-panel');insight.id='edSimulationPanel';
 insight.innerHTML='<div class="ed-sim-top"><div><div class="ed-kicker">FINAL FORECAST / 144,000 SIMULATED ELECTIONS</div><h2>Where the election is most likely to land</h2><p class="ed-mini">Frozen pre-election Ervin projections alongside the 144,000-scenario seat distribution. These are model-dependent forecasts, not results or calibrated election probabilities.</p></div><a class="ed-sim-source" href="https://github.com/geervin/ervin-model-2026/blob/main/scripts/run-ensemble-144000.mjs">Reproduce the model</a></div><div id="edSimSummary" class="ed-sim-summary">Loading the locked forecast distribution…</div><div id="edSimTabs" class="ed-sim-tabs" role="group" aria-label="Choose House, Senate or governor forecast map and distribution"></div><div class="ed-sim-visual-grid"><div class="ed-sim-map-pane"><div class="ed-sim-visual-heading"><h3 id="edSimMapTitle">House · state-by-state projection</h3><span class="ed-sim-preview-flag">PRE-ELECTION ESTIMATE</span></div><svg id="edSimMap" viewBox="0 0 1080 625" role="group" aria-label="Interactive map of modeled election projections for each state"><text x="540" y="300" text-anchor="middle">Preparing projected state map…</text></svg><div class="ed-sim-map-legend"><span><i class="ed-sim-legend-d"></i> Democratic lead</span><span><i class="ed-sim-legend-r"></i> Republican lead</span><span><i class="ed-sim-legend-t"></i> Toss-up / split</span><span><i class="ed-sim-legend-n"></i> Not modeled</span></div><p class="ed-sim-map-readout" id="edSimMapReadout" aria-live="polite">Select a state to inspect its forecast.</p><p class="ed-sim-map-foot" id="edSimMapNote">These map colors show state/district model leads, not reported votes or individual probabilities.</p></div><div class="ed-sim-hist-pane"><div class="ed-sim-visual-heading"><h3 id="edSimChartTitle">House seat distribution</h3><span class="ed-sim-preview-flag">144,000 RUNS</span></div><div id="edSimChart" class="ed-sim-chart" role="img" aria-label="Seat count distribution"></div><p id="edSimDetail" class="ed-sim-detail"></p></div></div><p id="edSimAnomalies" class="ed-sim-note"></p>';
 const byline=document.querySelector('.ed-byline');
 const heading=document.querySelector('.ed-headline');
 (byline||heading||balance).insertAdjacentElement(byline||heading?'afterend':'beforebegin',insight);
 const stage=make('section','ed-night-stage');stage.id='edResultsStage';stage.hidden=true;
 stage.innerHTML='<div class="ed-night-stage-head"><div><div class="ed-kicker">ELECTION NIGHT / GENERAL ELECTION RETURNS</div><h2>The national results desk</h2><p id="edNightContext">The first polls close at 6 p.m. Eastern. Until validated returns appear, unreported states and counties remain gray.</p></div><a class="ed-night-action" href="../election-night/">See the complete results board</a></div><div class="ed-night-columns"><div id="edNightMapSlot" class="ed-night-map-slot"></div><aside class="ed-commentary" aria-labelledby="edCommentaryTitle"><div class="ed-commentary-head"><div class="ed-kicker">ELECTION NIGHT / SOURCE-LINKED UPDATES</div><h2 id="edCommentaryTitle">Live commentary</h2><p id="edCommentaryStatus">Awaiting source-attributed unofficial returns</p></div><div id="edCommentaryEntries" class="ed-commentary-entries" aria-live="polite" aria-relevant="additions"></div><p class="ed-commentary-method">Updates are automatically composed from accepted vote records every few minutes when figures change. They are not independent newsroom race calls. Forecasts and counted votes are kept separate.</p></aside></div>';
 dashboard.insertAdjacentElement('afterend',stage);
 const hero=document.querySelector('.ed-headline');
 if(hero)hero.dataset.electionOriginal=hero.textContent;
 loadEnsemble();
}
function addEntry(message,time,url,source,prepend=true){
 const holder=$('edCommentaryEntries');if(!holder)return;
 const item=make('article','ed-commentary-item');
 const header=make('div','ed-commentary-meta');
 const tm=make('time','',labelTime(time));tm.dateTime=new Date(time).toISOString();
 header.append(tm,make('span','',source||'Data desk'));
 const para=make('p','',message);item.append(header,para);
 const href=safeLink(url);
 if(href){const a=make('a','ed-commentary-link',href.includes('/elections/api/')?'About the attributed results feed':'View underlying vote source');a.href=href;a.target='_blank';a.rel='noopener noreferrer';item.append(a);}
 if(prepend)holder.prepend(item);else holder.append(item);
 while(holder.children.length>10)holder.lastElementChild.remove();
}
async function loadEnsemble(){
 try{
  const response=await fetch('../final/ensemble-144000.json',{cache:'no-store'});
  if(!response.ok)throw Error('Ensemble currently unavailable');
  const data=await response.json();
  if(data.schema!==1||data.trials!==144000||!data.center||!data.outcomes||
    !['house','senateD','governorsD'].every(k=>data.center[k].rawBinCountsSum===144000&&data.center[k].histogram.reduce((n,x)=>n+x.count,0)===144000))throw Error('Simulation integrity check failed');
  ensemble=data;renderEnsemble(selectedDistribution);
 }catch(error){const el=$('edSimSummary');if(el)el.textContent='The 144,000-run data is temporarily unavailable. The locked state-by-state forecast is still accessible.';}
}
function renderEnsemble(selected){
 selectedDistribution=selected;
 renderProjectionMap(selected);
 if(!ensemble)return;
 const titles={house:'U.S. House · Democratic seats',senateD:'U.S. Senate · Democratic seats',governorsD:'Governorships · Democratic'};
 const c=ensemble.center[selected];
 $('edSimChartTitle').textContent=selected==='house'?'House seat distribution':selected==='senateD'?'Senate seat distribution':'Governor distribution';
 const tabs=$('edSimTabs');tabs.replaceChildren();
 for(const key of Object.keys(titles)){
  const b=make('button','',key==='house'?'House':key==='senateD'?'Senate':'Governors');b.type='button';
  b.setAttribute('aria-pressed',String(selected===key));b.addEventListener('click',()=>renderEnsemble(key));tabs.append(b);
 }
 const card=$('edSimSummary');card.replaceChildren();
 const data=[['House',ensemble.center.house.median+' D / '+(435-ensemble.center.house.median)+' R'],['Senate',ensemble.center.senateD.median+' D-aligned seats*'],['Governors',ensemble.center.governorsD.median+' D / '+(50-ensemble.center.governorsD.median)+' R']];
 for(const [k,val] of data){const block=make('div','ed-sim-stat');block.append(make('small','',k+' · median'),make('strong','',val));card.append(block);}
 const bars=$('edSimChart');bars.replaceChildren();bars.setAttribute('aria-label',titles[selected]+': simulated results, 144,000 runs, most common '+c.mode+' seats');
 const step=selected==='house'?3:1,lo=selected==='house'?213:c.histogram[0].seats,hi=selected==='house'?291:c.histogram.at(-1).seats;
 const groups=[];for(let start=lo;start<=hi;start+=step){const end=Math.min(hi,start+step-1),count=c.histogram.filter(h=>h.seats>=start&&h.seats<=end).reduce((sum,r)=>sum+r.count,0);groups.push({start,end,count});}
 const max=Math.max(...groups.map(g=>g.count));
 for(const g of groups){
  const col=make('div','ed-sim-bin');
  if(g.start<=c.median&&g.end>=c.median)col.classList.add('is-median');
  const fill=make('span','ed-sim-fill');fill.style.height=Math.max(1,Math.round(g.count/max*100))+'%';
  col.append(fill);
  const lbl=make('small','',String(g.start));
  if(selected==='house'&&((g.start-lo)/step)%3!==0)lbl.textContent='';
  col.append(lbl);col.title=g.start+(g.end>g.start?'–'+g.end:'')+' Democratic seats: '+fmt(g.count)+' scenarios ('+pct(g.count/ensemble.trials)+')';bars.append(col);
 }
 $('edSimDetail').textContent=titles[selected]+'. Average '+c.mean+'; median '+c.median+'; most frequent '+c.mode+' ('+pct(c.modeShare)+' of scenarios). The central 90% of simulations fall between '+c.p05+' and '+c.p95+' seats.';
 const house=ensemble.unusual?.house?.[0],sen=ensemble.unusual?.senateD||[];
 $('edSimAnomalies').textContent='Distribution audit: The House is approximately bell-shaped (skew '+ensemble.center.house.skewness+'); individual one-seat bumps are not separate forecasts. '+(house?'The '+house.seats+'-seat bin occurs '+fmt(house.count)+' times versus '+fmt(house.normalExpected)+' under a matched normal curve. ':'')+(sen.length?'Senate tail bins, including '+sen[0].seats+' seats, also differ from a rounded normal approximation. ':'')+'These are descriptive diagnostics, not proof of a second mode or a reason to alter the forecast. *Independent-caucus assignments can affect Senate control.';
}

/* Each distribution tab has its own frozen, interactive 50-state projection map.
 * House colors show the plurality of district-level model leads in a state,
 * NOT a forecast of statewide popular vote; Senate/governor only color contests
 * actually modeled for 2026. Live returns never modify this map. */
const SVG_NS='http://www.w3.org/2000/svg';
const IS_FINITE=n=>typeof n==='number'&&Number.isFinite(n);
function projectedCategory(r,office){
 if(IS_FINITE(r?.margin))return Math.abs(r.margin)<=1.5?'T':r.margin>0?'D':'R';
 const rating=office==='house'?r?.rating:r?.qualitativeRating;
 return /\bD$/.test(rating||'')?'D':/\bR$/.test(rating||'')?'R':'N';
}
const marginLabel=m=>!IS_FINITE(m)?'qualitative source rating only':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1)+' pts';
function buildProjectionRows(office,model){
 const out={};
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 for(const g of geo)out[g.code]={code:g.code,name:g.name,rows:[],D:0,R:0,T:0,N:0,kind:'N'};
 const entries=office==='house'?model.house:office==='senateD'?model.senate:model.governor;
 for(const r of entries||[]){
  const state=out[r.code];
  if(!state)continue;
  const kind=projectedCategory(r,office==='house'?'house':'state');
  state[kind]++;
  state.rows.push({id:r.id,margin:r.margin,kind,sourceRated:!IS_FINITE(r.margin),rating:r.rating||r.qualitativeRating||''});
 }
 for(const s of Object.values(out)){
  if(!s.rows.length)continue;
  if(office==='house'){
   // A state's House color represents the most numerous party-leading districts.
   s.kind=s.D===s.R?'T':s.D>s.R?'D':'R';
  }else s.kind=s.rows[0].kind;
 }
 return out;
}
function renderProjectionMap(office){
 const el=$('edSimMap'),summary=$('edSimMapReadout'),note=$('edSimMapNote');
 if(!el||!summary||!note)return;
 const isHouse=office==='house',isSen=office==='senateD';
 const title=$('edSimMapTitle');
 title.textContent=isHouse?'House · district leaders by state':isSen?'Senate · 2026 races':'Governors · 2026 races';
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 const model=window.ERVIN_HOME_FORECAST;
 if(!geo.length||!model||!model.house?.length||!model.senate?.length||!model.governor?.length){
  el.replaceChildren();const t=document.createElementNS(SVG_NS,'text');
  t.setAttribute('x','540');t.setAttribute('y','315');t.setAttribute('text-anchor','middle');
  t.textContent='Loading frozen state-by-state projections…';el.append(t);
  summary.textContent='Projection geography is loading. The seat distribution remains available.';
  note.textContent='Forecast maps will use the locked election-day data, not live returns.';
  return;
 }
 const rows=buildProjectionRows(office,model);
 const filled=Object.values(rows).filter(x=>x.rows.length).length;
 const counts=Object.values(rows).reduce((total,x)=>total+x.rows.length,0);
 const expected=isHouse?435:isSen?17:36;
 if(counts!==expected){summary.textContent='Source coverage changed: '+counts+' of '+expected+' expected contests. Map withheld to avoid a misleading display.';el.replaceChildren();return}
 el.replaceChildren();el.setAttribute('viewBox',window.ERVIN_US_GEOGRAPHY.viewBox||'0 0 1080 625');
 el.dataset.simOffice=office;
 el.setAttribute('aria-label',(isHouse?'House district model leaders by state':isSen?'2026 Senate model projections':'2026 governor model projections')+' — 50 clickable states, frozen November 3 forecast.');
 const defaultText=isHouse?'House: '+counts+' districts grouped by their state; click or focus any state for projected leaders.':
  (isSen?'Senate: '+filled+' numerically modeled races (17 in all).':'Governors: '+filled+' races, including three publisher-rated contests.')+' Click or focus a state for its forecast.';
 summary.textContent=defaultText;
 const descriptor=s=>{
  if(!s.rows.length)return s.name+': '+(isHouse?'no modeled House districts available':isSen?'no numerically modeled 2026 Senate contest':'no governor election in 2026')+'.';
  if(isHouse)return s.name+': '+s.D+' Democratic-leading districts, '+s.R+' Republican-leading districts, '+s.T+' toss-ups (within ±1.5 pts)'+(s.rows.some(r=>r.sourceRated)?'; nonnumeric races use source ratings':'')+'. State shading reflects which party leads in more districts, not a statewide vote prediction.';
  const r=s.rows[0],what=isSen?'U.S. Senate':'governor';
  return s.name+' '+what+': '+(r.sourceRated?(r.rating+' · publisher rating, no numeric margin'):(marginLabel(r.margin)+(r.kind==='T'?' · toss-up':'')))+'. Pre-election estimate, not counted votes.';
 };
 for(const g of geo){
  const s=rows[g.code],link=document.createElementNS(SVG_NS,'a');
  const to='../state/?state='+encodeURIComponent(g.code)+(isHouse?'#stateHouse':'#stateOverview');
  link.setAttribute('href',to);link.setAttribute('tabindex','0');
  link.dataset.simState=g.code;
  link.setAttribute('aria-label',descriptor(s)+' Open state edition.');
  const path=document.createElementNS(SVG_NS,'path');
  path.setAttribute('d',g.d);path.setAttribute('class','ed-sim-proj-state ed-sim-proj-'+s.kind);
  path.dataset.simKind=s.kind;
  const tooltip=document.createElementNS(SVG_NS,'title');tooltip.textContent=descriptor(s);
  path.append(tooltip);link.append(path);
  link.addEventListener('pointerenter',()=>summary.textContent=descriptor(s));
  link.addEventListener('focus',()=>summary.textContent=descriptor(s));
  link.addEventListener('pointerleave',()=>summary.textContent=defaultText);
  link.addEventListener('blur',()=>summary.textContent=defaultText);
  el.append(link);
 }
 note.textContent=isHouse?
  'House shading summarizes 435 individual district forecasts by state (including two publisher-rated exceptions). It is not a statewide House popular-vote estimate or a forced allocation of the national median seat count. Gold indicates equal D/R leads or an all-toss-up state.':
  isSen?
  'Only the 17 Senate contests with modeled margins are colored; other Senate states are gray, not projected Republican or Democratic wins. Gold indicates a margin within ±1.5 points. Independent candidates may not caucus with Democrats.':
  'All 36 governor contests are shown. Three without numeric polling use attributed publisher ratings; the other 14 states have no 2026 governor race and remain gray. Gold indicates a margin within ±1.5 points.';
}
function enter(){
 if(active)return;active=true;
 const stage=$('edResultsStage'),map=$('nationMap'),slot=$('edNightMapSlot'),dashboard=$('electionDashboard');
 if(!stage||!map||!slot)return;
 stage.hidden=false;dashboard.hidden=false;slot.append(map);document.documentElement.classList.add('ed-election-night');
 addEntry('The national results desk opened at 5:55 p.m. Eastern, five minutes before the first polls closed. Unreported contests stay neutral until source-attributed unofficial returns arrive.',SWITCH_AT,null,'Election-night desk',false);
 const btns=document.querySelectorAll('[data-state-map-view="reported"]');
 let switched=false,attempts=0;
 const setReported=()=>{if(switched||!btns.length||attempts++>20)return;const btn=btns[0];if(btn.getAttribute('aria-pressed')==='true'){switched=true;return;}btn.click();switched=btn.getAttribute('aria-pressed')==='true';};
 setReported();const interval=setInterval(()=>{setReported();if(switched||attempts>20)clearInterval(interval);},1000);
 const ctx=$('edNightContext');if(ctx)ctx.textContent='Source-attributed, unofficial returns update as they are published. Gray means no accepted report; a vote leader is not an election call. Switch the map to Forecast or Compare at any time.';
 const status=$('edCommentaryStatus');if(status)status.textContent='Checks every 30 seconds · new commentary when verified counts change';
 window.dispatchEvent(new Event('ervin:election-night-open'));
}
function pollPhase(){
 const preview=new URLSearchParams(location.search).get('preview');
 if(Date.now()>=SWITCH_AT||preview==='closing'||preview==='live')enter();
}
function storyScore(r){
 const id=r.id||'',code=id.slice(0,2);
 const important=priorityStates.indexOf(code),office=r.office;
 return (office==='Senate'?500:office==='Governor'?300:100)+(important<0?0:110-important*8)+Math.log10(Math.max(1,r.total))*10+(Number.isFinite(r.precincts)?r.precincts/10:0);
}
function enqueue(){
 if(!active)return;
 const rows=window.ERVIN_HOME_RESULTS?.races||{};
 for(const [id,r] of Object.entries(rows)){
  if(!r||r.id!==id||!Number.isSafeInteger(r.total)||r.total<=0||!Array.isArray(r.candidates)||r.candidates.length<2||!Number.isFinite(Date.parse(r.asOf)))continue;
  const signature=r.total+'@'+r.asOf+':'+r.candidates.map(c=>c.name+'='+c.votes).join(';');
  if(seen.get(id)===signature)continue;
  seen.set(id,signature);pending.set(id,r);
 }
 flush(false);
}
function flush(force){
 if(!active||!pending.size||(!force&&lastPost&&Date.now()-lastPost<150000))return;
 const ranked=[...pending.values()].sort((a,b)=>storyScore(b)-storyScore(a));
 const r=ranked[0];pending.delete(r.id);
 if(!r)return;
 const ordered=[...r.candidates].sort((a,b)=>b.votes-a.votes);
 const lead=ordered[0],second=ordered[1],total=r.total;
 const code=r.id.slice(0,2),name=stateNames[code]||code;
 const race=name+(r.office==='Senate'?' Senate':r.office==='Governor'?' governor':r.office==='House'?' '+r.id.slice(3)+'th district':' election');
 const a=(100*lead.votes/total).toFixed(1),b=(100*second.votes/total).toFixed(1);
 const match=lead.votes===second.votes?lead.name+' and '+second.name+' are tied':lead.name+' leads '+second.name;
 const stamp=Date.parse(r.asOf),age=(Date.now()-stamp)/60000;
 let sentence=race+': '+match+' '+a+'% to '+b+'% among '+fmt(total)+' ballots in the latest accepted unofficial count.';
 if(Number.isFinite(r.precincts))sentence+=' '+r.precincts.toFixed(1)+'% of precincts are reported; this is not a projected or certified winner.';
 else sentence+=' The source has not supplied comparable precinct-completion data, so this is not a projected or certified winner.';
 if(age>45)sentence+=' The source update is more than 45 minutes old and may be delayed.';
 const fingerprint=r.id+':'+r.asOf+':'+r.total;
 if(posted.has(fingerprint))return;
 posted.add(fingerprint);lastPost=Date.now();
 addEntry(sentence,stamp,r.sourceURL||(/Open America/.test(r.source||'')?'https://openamerica.io/elections/api/':null),r.source||'Unofficial vote report');
}
function init(){
 build();pollPhase();
 window.addEventListener('ervin:forecast-ready',()=>renderProjectionMap(selectedDistribution));
 renderProjectionMap(selectedDistribution);
 setInterval(pollPhase,10000);
 window.addEventListener('ervin:home-results-update',enqueue);
 window.addEventListener('ervin:home-live',()=>{enter();enqueue();});
 setInterval(()=>{enqueue();flush(true);},180000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();