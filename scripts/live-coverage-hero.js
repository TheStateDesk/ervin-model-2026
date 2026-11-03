/* ERVIN MODEL — 5:55 p.m. ET national election-night lead feature.
 * The forecast SVG geography is reused. No model-colored races or synthetic
 * vote data can be presented as live counts. No unfounded winner calls.
 */
(()=>{'use strict';
const SWITCH_AT=Date.parse('2026-11-03T17:55:00-05:00');
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString('en-US');
const et=t=>new Date(t).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const stateNames=Object.fromEntries((window.ERVIN_US_GEOGRAPHY?.states||[]).map(s=>[s.code,s.name]));
const important=['MI','OH','TX','ME','GA','NC','IA','AK','NE','KS','MN'];
// USPS Nov. 3 federal ballot schedule: 33 regular plus FL/OH special Senate elections.
const SENATE_STATES_2026=new Set('AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY'.split(' '));
const watched=new Map(),previous=new Map(),pending=new Map(),published=new Set();
let active=false,lastPost=0,observed=null,office='house',lastSync=0,paintQueued=false;
const on=(e,fn)=>window.addEventListener(e,fn);
const officeFor=k=>k==='house'?'House':k==='senateD'?'Senate':'Governor';
const idFor=(code,k)=>code+'-'+(k==='senateD'?'SENATE':'GOVERNOR');
const safeSource=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password?x.href:null}catch{return null}};
function raceHref(id){
 if(!/^[A-Z]{2}-(?:[0-9]{2}|SENATE|GOVERNOR)$/.test(String(id)))return null;
 return '../election-night/?state='+id.slice(0,2)+'&race='+id+'#nationalBoard';
}
function accepted(id,expectedOffice){
 const row=window.ERVIN_HOME_RESULTS?.races?.[id],core=window.ERVIN_RETURNS;
 if(!row||!core||row.id!==id||row.office!==expectedOffice||core.canonical(id,expectedOffice)!==id||!row.source)return null;
 const timestamp=Date.parse(row.asOf||'');
 if(!Number.isFinite(timestamp)||timestamp<core.closeAt(id,expectedOffice)||timestamp>Date.now()+300000)return null;
 if(!Number.isSafeInteger(row.total)||row.total<=0||!Array.isArray(row.candidates)||row.candidates.length<2||row.candidates.length>25)return null;
 if(row.candidates.some(c=>!String(c.name||'').trim()||!Number.isSafeInteger(c.votes)||c.votes<0||!['D','R','O'].includes(c.party)))return null;
 if(Math.abs(row.total-row.candidates.reduce((n,c)=>n+c.votes,0))>Math.max(10,row.total*.005))return null;
 return row;
}
function leaders(row){
 if(!row)return null;
 const arr=[...row.candidates].sort((a,b)=>b.votes-a.votes);
 const [first,second]=arr;
 const tie=first.votes===second.votes;
 const kind=tie?'T':first.party==='D'?'D':first.party==='R'?'R':'I';
 return {first,second,kind,firstPct:(100*first.votes/row.total).toFixed(1),secondPct:(100*second.votes/row.total).toFixed(1),
  margin:100*(first.votes-second.votes)/row.total};
}
function detailedStatus(id,label,expectedOffice){
 const row=accepted(id,expectedOffice),top=leaders(row);
 if(!row)return label+': awaiting an attributed unofficial vote report.';
 const lead=top.kind==='T'?top.first.name+' and '+top.second.name+' are tied':top.first.name+' leads '+top.second.name;
 const pct=top.kind==='T'?'':', '+top.firstPct+'% to '+top.secondPct+'%';
 const progress=Number.isFinite(row.precincts)?' · '+row.precincts.toFixed(1)+'% of reporting units according to the source':' · Reporting-unit completion not supplied';
 return label+': '+lead+pct+' · '+fmt(row.total)+' unofficial votes'+progress+'. This is not an official race call.';
}
function mapOffice(){
 const aria=[...document.querySelectorAll('#edSimTabs button')].find(x=>x.getAttribute('aria-pressed')==='true');
 if(aria){const t=aria.textContent.trim().toLowerCase();return t==='senate'?'senateD':t==='governors'?'governorsD':'house';}
 return $('edSimMap')?.dataset.simOffice||office;
}
function knownStateRace(code,k){
 if(k==='senateD')return SENATE_STATES_2026.has(code);
 return !!window.ERVIN_HOME_FORECAST?.governor?.some(r=>r.code===code)||!!accepted(idFor(code,k),officeFor(k));
}
function summary(k,results){
 const holder=$('edFinalCallSummary');if(!holder)return;
 const d=results.filter(x=>x.kind==='D').length,r=results.filter(x=>x.kind==='R').length;
 const other=results.filter(x=>x.kind==='I').length,ties=results.filter(x=>x.kind==='T').length;
 const n=results.length,label=k==='house'?'HOUSE':k==='senateD'?'SENATE':'GOVERNORS';
 holder.replaceChildren();
 const meta=document.createElement('span');meta.className='ed-final-call-name';meta.textContent=label+' / UNOFFICIAL VOTE LEADERS';
 const stats=document.createElement('div');stats.className='ed-final-call-totals';
 for(const [text,cl] of [[fmt(d)+' D leading','ed-final-call-d'],['—','ed-final-call-sep'],[fmt(r)+' R leading','ed-final-call-r']]){
  const el=document.createElement(cl==='ed-final-call-sep'?'span':'strong');el.className=cl;el.textContent=text;stats.append(el);
 }
 const minor=document.createElement('small');
 minor.textContent=n?fmt(n)+' races with accepted unofficial totals'+(other?' · '+other+' independent/other leader'+(other===1?'':'s'):'')+(ties?' · '+ties+' tie'+(ties===1?'':'s'):'')+' · no race call inferred':
  'Awaiting source-validated unofficial returns · unreported contests remain gray';
 minor.textContent+=(k==='house'?' · 435 House districts':k==='senateD'?' · 35 Senate elections':' · 36 governor elections');
 holder.append(meta,stats,minor);holder.dataset.liveReports=String(n);
 const status=$('edCommentaryStatus');
 if(status)status.textContent=n?fmt(n)+' reporting race'+(n===1?'':'s')+' · checking every 30 seconds':'Waiting for the first accepted reports · checks every 30 seconds';
}
function paint(){
 paintQueued=false;
 if(!active)return;
 const map=$('edSimMap'),root=$('edSimulationPanel'),readout=$('edSimMapReadout');if(!map||!root)return;
 const k=mapOffice(),isHouse=k==='house',expectedOffice=officeFor(k);
 // The original district geometry is asynchronous. Never let the forecast fill
 // serve as live shading during its load or during an office-tab switch.
 if(map.dataset.simOffice!==k)return;
 const anchors=[...map.querySelectorAll(isHouse?'a[data-sim-district]':'a[data-sim-state]')];
 if(anchors.length!==(isHouse?435:50))return;
 office=k;
 const reported=[];
 for(const anchor of anchors){
  const code=anchor.dataset.simState,id=isHouse?anchor.dataset.simDistrict:idFor(code,k);
  const indexed=isHouse||knownStateRace(code,k);
  const href=indexed?raceHref(id):'../election-night/?state='+encodeURIComponent(code)+'#nationalBoard';
  if(href)anchor.setAttribute('href',href);
  anchor.dataset.liveRace=indexed?id:'';
  const row=indexed?accepted(id,expectedOffice):null;
  const info=leaders(row),kind=info?.kind||'N',shape=anchor.querySelector('path');
  if(!shape)continue;
  shape.classList.remove('ed-sim-proj-D','ed-sim-proj-R','ed-sim-proj-T','ed-sim-proj-N',
   'ed-live-lead-D','ed-live-lead-R','ed-live-lead-T','ed-live-lead-I','ed-live-lead-N');
  shape.classList.add('ed-live-lead-'+kind);
  shape.dataset.liveStatus=row?'reported':'pending';
  shape.dataset.simKind=kind;
  const label=isHouse?(stateNames[code]||code)+' '+id:stateNames[code]||code;
  const description=indexed?detailedStatus(id,label,expectedOffice):
   label+': no '+(k==='senateD'?'Senate':'governor')+' contest indexed for this state. Open the state results board.';
  anchor.setAttribute('aria-label',description+' Open '+(indexed?'this exact election-night race.':'the state results board.'));
  const title=shape.querySelector('title');if(title&&title.textContent!==description)title.textContent=description;
  anchor.dataset.liveDescription=description;
  if(!anchor.dataset.liveHoverBound){
   const focus=()=>{if(readout)readout.textContent=anchor.dataset.liveDescription};
   const unfocus=()=>{if(readout)readout.textContent='Select any district or state to open its live race results. Unreported units remain gray.'};
   // Installed after the forecast listeners so the live description wins.
   for(const e of ['pointerenter','focus'])anchor.addEventListener(e,focus);
   for(const e of ['pointerleave','blur'])anchor.addEventListener(e,unfocus);
   anchor.dataset.liveHoverBound='1';
  }
  if(row)reported.push(info);
 }
 const title=$('edSimMapTitle');if(title)title.textContent=isHouse?'House · live votes by congressional district':k==='senateD'?'Senate · live votes by state':'Governors · live votes by state';
 const headingFlag=root.querySelector('.ed-sim-preview-flag');if(headingFlag)headingFlag.textContent='SOURCE-VALIDATED UNOFFICIAL RETURNS';
 const note=$('edSimMapNote');
 if(note)note.textContent='Colors identify current vote leaders from accepted unofficial reports, not projected or certified winners. Each district or state links to the corresponding race; gray means no validated count.';
 if(readout&&!readout.matches(':focus'))readout.textContent='Select a race to see verified vote leaders, totals, reporting status and source details.';
 map.setAttribute('aria-label',isHouse?'Live unofficial House results: 435 clickable congressional districts':k==='senateD'?'Live unofficial Senate results by state':'Live unofficial governor results by state');
 summary(k,reported);root.dataset.liveReady='true';
}
function schedulePaint(){
 if(paintQueued||!active)return;
 paintQueued=true;
 queueMicrotask(paint);
}
function observeMap(){
 if(observed)return;
 const map=$('edSimMap');if(!map)return;
 observed=new MutationObserver(schedulePaint);
 // Only direct child changes: changing a <title> must not recursively repaint.
 observed.observe(map,{childList:true});
}
function post(text,time,source,url,raceId){
 const rail=$('edCommentaryEntries');if(!rail)return;
 const article=document.createElement('article');article.className='ed-commentary-item';
 const meta=document.createElement('div');meta.className='ed-commentary-meta';
 const stamp=document.createElement('time');stamp.dateTime=new Date(time).toISOString();stamp.textContent=et(time);
 const src=document.createElement('span');src.textContent=source||'Results desk';meta.append(stamp,src);
 const paragraph=document.createElement('p');paragraph.textContent=text;
 article.append(meta,paragraph);
 const links=document.createElement('div');links.className='ed-commentary-links';
 const raceLink=raceId?raceHref(raceId):null;if(raceLink){
  const a=document.createElement('a');a.href=raceLink;a.className='ed-commentary-link';a.textContent='This race';links.append(a);
 }
 const raw=safeSource(url);if(raw){const a=document.createElement('a');a.href=raw;a.target='_blank';a.rel='noopener noreferrer';a.className='ed-commentary-link';a.textContent='Original vote source';links.append(a);}
 if(links.childElementCount)article.append(links);
 rail.prepend(article);while(rail.children.length>10)rail.lastElementChild.remove();
}
function worthUpdating(now,prior){
 if(!prior)return true;
 const latestLead=leaders(now),oldLead=leaders(prior);
 if(!latestLead||!oldLead)return false;
 if(latestLead.first.name!==oldLead.first.name||latestLead.kind!==oldLead.kind)return true;
 const extra=now.total-prior.total;
 if(extra<=0)return false;
 const percentageChange=Math.abs(latestLead.margin-oldLead.margin);
 const progressChange=Number.isFinite(now.precincts)&&Number.isFinite(prior.precincts)?now.precincts-prior.precincts:0;
 return extra>=Math.max(150,prior.total*.008)||percentageChange>=.45||progressChange>=7.5;
}
function story(record){
 const {row,prev}=record,top=leaders(row),old=leaders(prev);
 const id=row.id,code=id.slice(0,2);
 const place=stateNames[code]||code;
 const contest=row.office==='House'?place+' '+id+' congressional race':place+(row.office==='Senate'?' U.S. Senate race':' governor race');
 const share=top.first.name+' leads '+top.second.name+' '+top.firstPct+'% to '+top.secondPct+'%';
 const completion=Number.isFinite(row.precincts)?' The source reports '+row.precincts.toFixed(1)+'% of precincts or batches counted.':'';
 const difference=prev?row.total-prev.total:0;
 let first='',second='';
 if(!prev){
  first='The first accepted unofficial returns for the '+contest+' show '+(top.kind==='T'?top.first.name+' and '+top.second.name+' tied':share)+'.';
  second='The tally contains '+fmt(row.total)+' reported votes'+(Number.isFinite(row.precincts)?', with '+row.precincts.toFixed(1)+'% of precincts or batches reported by the source':'')+'.';
 }else if(old&&top.first.name!==old.first.name){
  first=top.first.name+' has taken the lead from '+old.first.name+' in the '+contest+' as '+fmt(Math.max(0,difference))+' additional votes were reported.';
  second='The latest unofficial tally has '+share+' among '+fmt(row.total)+' counted votes.';
 }else{
  const movement=old&&Math.abs(top.margin-old.margin)>=1.2?(top.margin<old.margin?'narrowed':'widened'):'changed';
  first='A new report for the '+contest+' adds '+fmt(Math.max(0,difference))+' votes, bringing the unofficial count to '+fmt(row.total)+'.';
  second=(top.kind==='T'?top.first.name+' and '+top.second.name+' are tied':share)+'; the leading margin has '+movement+'.';
 }
 return {message:first+' '+second,source:row.source||'Unofficial reporting',url:row.sourceURL,id};
}
function rank(record){
 const {row,prev}=record,code=row.id.slice(0,2),now=leaders(row),before=leaders(prev);
 return (now?.first?.name!==before?.first?.name&&before?900:0)+(row.office==='Senate'?450:row.office==='Governor'?300:125)+
  Math.max(0,170-important.indexOf(code)*10)*(important.includes(code)?1:0)+
  (now?Math.max(0,80-now.margin*12):0)+Math.log10(Math.max(1,row.total))*12;
}
function publishNext(){
 if(!active||!pending.size||Date.now()-lastPost<110000)return;
 const candidates=[...pending.values()].filter(x=>Date.now()-Date.parse(x.row.asOf)<75*60000);
 if(!candidates.length){pending.clear();return}
 candidates.sort((a,b)=>rank(b)-rank(a));
 const item=candidates[0];pending.delete(item.row.id);
 const fingerprint=item.row.id+':'+item.row.asOf+':'+item.row.total+':'+item.row.candidates.map(c=>c.name+'='+c.votes).join(',');
 if(published.has(fingerprint))return;
 published.add(fingerprint);if(published.size>1000)published.clear();
 const update=story(item);post(update.message,Date.now(),update.source,update.url,update.id);
 lastPost=Date.now();
}
function sync(){
 if(!active)return;
 const rows=window.ERVIN_HOME_RESULTS?.races||{};
 for(const [id,raw] of Object.entries(rows)){
  const row=accepted(id,raw?.office);
  if(!row)continue;
  const signature=row.asOf+'|'+row.total+'|'+row.candidates.map(c=>c.name+':'+c.votes).join(',');
  if(watched.get(id)===signature)continue;
  const old=previous.get(id);
  watched.set(id,signature);
  previous.set(id,row);
  if(worthUpdating(row,old))pending.set(id,{row,prev:old});
 }
 publishNext();
 schedulePaint();
 lastSync=Date.now();
}
function activate(){
 if(active||new URLSearchParams(location.search).get('view')==='final')return;
 active=true;
 const panel=$('edSimulationPanel');if(!panel)return;
 panel.classList.add('ed-coverage-live');panel.dataset.liveReady='false';panel.dataset.coverageMode='live';
 const headline=$('edFinalHeadline');if(headline)headline.innerHTML='<span>LIVE</span><span>ELECTION</span><span>COVERAGE</span>';
 const mainTitle=panel.querySelector('.ed-final-eyebrow small');if(mainTitle)mainTitle.textContent='LIVE ELECTION COVERAGE';
 const kicker=panel.querySelector('.ed-final-kicker');if(kicker)kicker.textContent='2026 GENERAL ELECTION / LIVE RESULTS DESK';
 const dek=panel.querySelector('.ed-final-deck');if(dek)dek.textContent='The count, state by state and district by district. Explore verified unofficial returns for all 435 House districts, the Senate and governors.';
 const aside=panel.querySelector('.ed-final-hero-aside');
 if(aside){aside.replaceChildren();
  const sub=document.createElement('span');sub.textContent='THE COUNT IS UNDERWAY';
  const a=document.createElement('strong');a.textContent='Every race.';
  const b=document.createElement('strong');b.textContent='As results arrive.';
  const small=document.createElement('small');small.textContent='Gray areas are awaiting accepted vote reports. Colors show current leaders, not final election calls.';
  aside.append(sub,a,b,small);
 }
 const metadata=panel.querySelector('.ed-final-metadata');
 if(metadata){
  metadata.replaceChildren();
  const p=document.createElement('span');p.className='ed-live-tag';p.textContent='● LIVE RESULTS DESK · UNOFFICIAL REPORTING';
  const s=document.createElement('span');s.textContent='LIVE SOURCE UPDATES';
  const link=document.createElement('a');link.href='../election-night/#nationalBoard';link.className='ed-sim-source';link.textContent='Full race-by-race results';
  const archived=document.createElement('a');archived.href='../states/?view=final#edSimulationPanel';archived.className='ed-sim-source';archived.textContent='Original final prediction';
  metadata.append(p,s,link,archived);
 }
 const legend=panel.querySelector('.ed-sim-map-legend');
 if(legend)legend.innerHTML='<span><i class="ed-sim-legend-d"></i> Democratic vote leader</span><span><i class="ed-sim-legend-r"></i> Republican vote leader</span><span><i class="ed-live-legend-i"></i> Independent / other</span><span><i class="ed-sim-legend-n"></i> Awaiting accepted results</span>';
 const rail=$('edLiveCommentary');if(rail)rail.hidden=false;
 const tally=$('edFinalCallSummary');if(tally)tally.textContent='Checking source-validated election-night vote reports…';
 const scroller=panel.querySelector('.ed-final-map-scroller');if(scroller)scroller.setAttribute('aria-label','Scroll the 435 House districts or state outlines, each linking to its election-night race');
 const start=Date.now()<SWITCH_AT?Date.now():SWITCH_AT;
 post('The live national results desk opens at 5:55 p.m. Eastern. Races will remain neutral until source-validated unofficial vote totals arrive.',start,'Election-night desk',null,null);
 observeMap();
 schedulePaint();sync();
}
function init(){
 on('ervin:home-results-update',sync);
 on('ervin:forecast-ready',schedulePaint);
 on('ervin:election-night-open',activate);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(Date.now()>=SWITCH_AT)activate();sync();}});
 const map=$('edSimMap');if(map)observeMap();
 const panel=$('edSimulationPanel');if(panel)panel.addEventListener('click',e=>{
  if(active&&e.target.closest('#edSimTabs button'))panel.dataset.liveReady='false';
 },true);
 const params=new URLSearchParams(location.search),preview=params.get('preview');
 if(params.get('view')==='final')return;
 if(Date.now()>=SWITCH_AT||preview==='closing'||preview==='live')activate();
 else {
  const delay=SWITCH_AT-Date.now();
  if(delay>0&&delay<2147483647)setTimeout(activate,delay);
 }
 setInterval(()=>{if(active){sync();publishNext()}},60000);
}
window.ERVIN_LIVE_HERO=Object.freeze({activate,sync,paint:schedulePaint});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
