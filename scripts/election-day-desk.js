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
let active=false,ensemble=null,lastPost=0,posted=new Set();
const pending=new Map(),seen=new Map();
function make(tag,cls,textValue){const el=document.createElement(tag);if(cls)el.className=cls;if(textValue!==undefined)el.textContent=textValue;return el;}
function safeLink(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function build(){
 const balance=$('balanceOfPower'),dashboard=$('electionDashboard');if(!balance||!dashboard)return;
 const insight=make('section','ed-sim-panel');insight.id='edSimulationPanel';
 insight.innerHTML='<div class="ed-sim-top"><div><div class="ed-kicker">FINAL FORECAST / 144,000 SIMULATED ELECTIONS</div><h2>Where the election is most likely to land</h2><p class="ed-mini">Empirical historical error draws, shared national movement and office-specific uncertainty. These frequencies depend on the assumptions and are not externally calibrated winning probabilities.</p></div><a class="ed-sim-source" href="https://github.com/geervin/ervin-model-2026/blob/main/scripts/run-ensemble-144000.mjs">Reproduce the model</a></div><div id="edSimSummary" class="ed-sim-summary">Loading the locked forecast distribution…</div><div id="edSimTabs" class="ed-sim-tabs" role="group" aria-label="Forecast distribution"></div><div id="edSimChart" class="ed-sim-chart" role="img" aria-label="Seat count distribution"></div><p id="edSimDetail" class="ed-sim-detail"></p><p id="edSimAnomalies" class="ed-sim-note"></p>';
 balance.insertAdjacentElement('afterend',insight);
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
  ensemble=data;renderEnsemble('house');
 }catch(error){const el=$('edSimSummary');if(el)el.textContent='The 144,000-run data is temporarily unavailable. The locked state-by-state forecast is still accessible.';}
}
function renderEnsemble(selected){
 if(!ensemble)return;
 const titles={house:'U.S. House · Democratic seats',senateD:'U.S. Senate · Democratic seats',governorsD:'Governorships · Democratic'};
 const c=ensemble.center[selected];
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
  const lbl=make('small','',g.start===g.end?String(g.start):String(g.start));
  if(selected==='house'&&((g.start-lo)/step)%3!==0)lbl.textContent='';
  col.append(lbl);col.title=g.start+(g.end>g.start?'–'+g.end:'')+' Democratic seats: '+fmt(g.count)+' scenarios ('+pct(g.count/ensemble.trials)+')';bars.append(col);
 }
 $('edSimDetail').textContent=titles[selected]+'. Average '+c.mean+'; median '+c.median+'; most frequent '+c.mode+' ('+pct(c.modeShare)+' of scenarios). The central 90% of simulations fall between '+c.p05+' and '+c.p95+' seats.';
 const house=ensemble.unusual?.house?.[0],sen=ensemble.unusual?.senateD||[];
 $('edSimAnomalies').textContent='Distribution audit: The House is approximately bell-shaped (skew '+ensemble.center.house.skewness+'); individual one-seat bumps are not separate forecasts. '+(house?'The '+house.seats+'-seat bin occurs '+fmt(house.count)+' times versus '+fmt(house.normalExpected)+' under a matched normal curve. ':'')+(sen.length?'Senate tail bins, including '+sen[0].seats+' seats, also differ from a rounded normal approximation. ':'')+'These are descriptive diagnostics, not proof of a second mode or a reason to alter the forecast. *Independent-caucus assignments can affect Senate control.';
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
 setInterval(pollPhase,10000);
 window.addEventListener('ervin:home-results-update',enqueue);
 window.addEventListener('ervin:home-live',()=>{enter();enqueue();});
 setInterval(()=>{enqueue();flush(true);},180000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();