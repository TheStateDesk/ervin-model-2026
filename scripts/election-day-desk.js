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
 const insight=$('edSimulationPanel')||make('section','ed-sim-panel');insight.id='edSimulationPanel';insight.className='ed-sim-panel';
 insight.innerHTML="\n<div class=\"ed-final-mast\">\n <div class=\"ed-final-eyebrow\"><span class=\"ed-final-monogram\" aria-hidden=\"true\">E</span><span>THE ERVIN MODEL <small>2026 ELECTION FORECAST</small></span><span class=\"ed-final-edition\">ELECTION DAY EDITION · NOVEMBER 3, 2026</span></div>\n <div class=\"ed-final-hero-row\">\n  <div class=\"ed-final-title-wrap\"><span class=\"ed-final-kicker\">THE NATIONAL ELECTION DESK / LOCKED FORECAST</span><h2 class=\"ed-final-headline\" id=\"edFinalHeadline\"><span>FINAL</span><span>PREDICTION</span></h2><p class=\"ed-final-deck\">Our final party-by-party projections for the House, Senate, and governors. Every shaded contest receives a definitive forecast call—no toss-up colors.</p></div>\n  <aside class=\"ed-final-hero-aside\"><span>THE BIG PICTURE</span><strong>A blue House.</strong><strong>A Senate cliffhanger.</strong><small>The maps are frozen individual-race predictions. The 144,000 simulations below show the uncertainty around the national outcome.</small></aside>\n </div>\n <div class=\"ed-final-metadata\"><span><span class=\"ed-final-dot\"></span> FORECAST LOCKED · NOV. 3, 2026</span><span>PROJECTIONS, NOT REPORTED VOTES</span><a class=\"ed-sim-source\" href=\"https://github.com/geervin/ervin-model-2026/blob/main/research/FINAL_2026_ELECTION_DAY_AUDIT.md\">Read the forecasting audit</a></div>\n</div>\n<div id=\"edSimTabs\" class=\"ed-sim-tabs\" role=\"group\" aria-label=\"Choose House, Senate or governor final prediction map and scenario distribution\"></div>\n<div id=\"edFinalCallSummary\" class=\"ed-final-call-summary\" aria-live=\"polite\">Loading final projected winners…</div>\n<div class=\"ed-sim-map-pane ed-final-map-pane\">\n <div class=\"ed-sim-visual-heading\"><h3 id=\"edSimMapTitle\">House · final predictions by district</h3><span class=\"ed-sim-preview-flag\">FINAL RACE-BY-RACE CALLS</span></div>\n <svg id=\"edSimMap\" viewBox=\"0 0 1080 625\" role=\"group\" aria-label=\"Final election projection map\"><text x=\"540\" y=\"315\" text-anchor=\"middle\">Loading election geography…</text></svg>\n <div class=\"ed-sim-map-legend\"><span><i class=\"ed-sim-legend-d\"></i> Democratic call</span><span><i class=\"ed-sim-legend-r\"></i> Republican call</span><span><i class=\"ed-sim-legend-n\"></i> No election in 2026</span></div>\n <p class=\"ed-sim-map-readout\" id=\"edSimMapReadout\" aria-live=\"polite\">Hover, focus, or select a district to inspect the projected winner.</p>\n <p class=\"ed-sim-map-foot\" id=\"edSimMapNote\">Predicted winners are not counted vote totals or official race calls.</p>\n</div>\n<div class=\"ed-final-distribution\">\n <div class=\"ed-final-distribution-head\"><div><span class=\"ed-final-kicker\">THE MODEL / 144,000 SCENARIOS</span><h3>Where the election is most likely to land</h3></div><a class=\"ed-sim-source\" href=\"https://github.com/geervin/ervin-model-2026/blob/main/scripts/run-ensemble-144000.mjs\">Reproduce the simulation</a></div>\n <p class=\"ed-mini ed-final-chart-intro\">Forecast calls show each race’s predicted winner. The simulation distribution measures possible chamber totals under shared and local uncertainty; its median need not equal the number of individual race calls.</p>\n <div id=\"edSimSummary\" class=\"ed-sim-summary\">Loading the locked distribution…</div>\n <div class=\"ed-sim-hist-pane\"><div class=\"ed-sim-visual-heading\"><h3 id=\"edSimChartTitle\">House seat distribution</h3><span class=\"ed-sim-preview-flag\">144,000 RUNS</span></div><div id=\"edSimChart\" class=\"ed-sim-chart\" role=\"img\" aria-label=\"Seat count distribution\"></div><p id=\"edSimDetail\" class=\"ed-sim-detail\"></p></div>\n <p id=\"edSimAnomalies\" class=\"ed-sim-note\"></p>\n</div>";
 const byline=document.querySelector('.ed-byline');
 const heading=document.querySelector('.ed-headline');
 if(!insight.isConnected)(byline||heading||balance).insertAdjacentElement(byline||heading?'afterend':'beforebegin',insight);
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

/* The final election prediction explicitly calls every modeled contest D or R.
 * The 144k simulation histogram is an uncertainty distribution and is not
 * reverse-engineered into district calls. Nothing here reads election returns. */
const SVG_NS='http://www.w3.org/2000/svg';
const IS_FINITE=n=>typeof n==='number'&&Number.isFinite(n);
let mapRevision=0,districtShapes=null,districtPromise=null;
const CURRENT_CD120=new Set('AL CA FL GA LA NC NY OH TN TX UT'.split(' '));
const deg=Math.PI/180;
function finalParty(r){
 if(IS_FINITE(r?.margin)&&r.margin!==0)return r.margin>0?'D':'R';
 const rating=String(r?.rating||r?.qualitativeRating||'');
 if(/(?:^|\s)D$/.test(rating))return 'D';
 if(/(?:^|\s)R$/.test(rating))return 'R';
 return 'N';
}
function marginText(m){
 return !IS_FINITE(m)?'qualitative published rating':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(2)+' pts';
}
function makeSvg(tag,attrs){
 const el=document.createElementNS(SVG_NS,tag);
 for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
 return el;
}
function projectedRows(office,model){
 const states=window.ERVIN_US_GEOGRAPHY?.states||[];
 const out=Object.fromEntries(states.map(s=>[s.code,{code:s.code,name:s.name,entries:[],D:0,R:0,N:0}]));
 const entries=office==='house'?model.house:office==='senateD'?model.senate:model.governor;
 for(const r of entries||[]){
  const state=out[r.code];if(!state)continue;
  const kind=finalParty(r),row={...r,kind};
  state.entries.push(row);state[kind]++;
 }
 return out;
}
function renderCallTally(office,rows){
 const node=$('edFinalCallSummary');if(!node)return;
 const n=Object.values(rows).reduce((v,s)=>v+s.entries.length,0);
 const d=Object.values(rows).reduce((v,s)=>v+s.D,0);
 const r=Object.values(rows).reduce((v,s)=>v+s.R,0);
 const unknown=Object.values(rows).reduce((v,s)=>v+s.N,0);
 const expected=office==='house'?435:office==='senateD'?17:36;
 if(n!==expected||unknown){
  node.textContent='Cannot make a full set of final calls: '+n+' of '+expected+' contests, '+unknown+' without a supported call.';
  return false;
 }
 const label=office==='house'?'U.S. HOUSE':office==='senateD'?'U.S. SENATE':'GOVERNORS';
 const scope=office==='house'?'All 435 congressional districts':office==='senateD'?'17 modeled Senate contests; holdover seats excluded':'36 gubernatorial contests; 14 off-cycle states excluded';
 node.replaceChildren();
 const name=make('span','ed-final-call-name',label+' / PROJECTED WINNERS');
 const score=make('div','ed-final-call-totals');
 const dScore=make('strong','ed-final-call-d',fmt(d)+' D'),sep=make('span','ed-final-call-sep','—'),rScore=make('strong','ed-final-call-r',fmt(r)+' R');
 score.append(dScore,sep,rScore);
 node.append(name,score,make('small','',scope+' · no toss-up calls'));
 return true;
}
function shapeRings(g){
 if(!g)return [];
 if(g.type==='Polygon')return g.coordinates;
 if(g.type==='MultiPolygon')return g.coordinates.flat();
 return [];
}
function rawAlbers(pt){
 const phi1=29.5*deg,phi2=45.5*deg,phi0=38*deg;
 const n=(Math.sin(phi1)+Math.sin(phi2))/2;
 const c=Math.cos(phi1)**2+2*n*Math.sin(phi1);
 const rho0=Math.sqrt(c-2*n*Math.sin(phi0))/n;
 const rho=Math.sqrt(Math.max(0,c-2*n*Math.sin(pt[1]*deg)))/n;
 const theta=n*(pt[0]+96)*deg;
 return [rho*Math.sin(theta),rho0-rho*Math.cos(theta)];
}
function rawInset(pt,code){
 let lon=pt[0];if(code==='AK'&&lon>0)lon-=360;
 return [lon*Math.cos((code==='AK'?60:20)*deg),pt[1]];
}
function fitProjectedFeatures(features){
 const regions={CONUS:[],AK:[],HI:[]};
 for(const row of features){
  const code=row.code,region=code==='AK'?'AK':code==='HI'?'HI':'CONUS';
  const fn=region==='CONUS'?rawAlbers:pt=>rawInset(pt,code);
  const rings=shapeRings(row.geometry).filter(r=>r.length>=3).map(r=>r.filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])).map(fn)).filter(r=>r.length>=3);
  regions[region].push({...row,rings});
 }
 const frames={CONUS:{x:20,y:18,w:1040,h:540},AK:{x:56,y:436,w:245,h:163},HI:{x:310,y:525,w:165,h:73}};
 const output=[];
 for(const [region,rows] of Object.entries(regions)){
  const all=rows.flatMap(r=>r.rings.flat());
  if(!all.length)throw Error('The '+region+' region contains no district coordinates');
  const bx=[Math.min(...all.map(p=>p[0])),Math.max(...all.map(p=>p[0]))];
  const by=[Math.min(...all.map(p=>p[1])),Math.max(...all.map(p=>p[1]))];
  const frame=frames[region],dx=Math.max(.0001,bx[1]-bx[0]),dy=Math.max(.0001,by[1]-by[0]);
  const scale=Math.min(frame.w/dx,frame.h/dy);
  const ox=frame.x+(frame.w-dx*scale)/2,oy=frame.y+(frame.h-dy*scale)/2;
  for(const row of rows){
   const d=row.rings.map(ring=>ring.map((point,i)=>(i?'L':'M')+(ox+(point[0]-bx[0])*scale).toFixed(2)+' '+(oy+(by[1]-point[1])*scale).toFixed(2)).join('')+'Z').join('');
   if(!d)throw Error(row.code+' '+row.id+' has no projected geometry');
   output.push({id:row.id,code:row.code,d,region});
  }
 }
 return output;
}
function districtGeometry(){
 if(districtShapes)return Promise.resolve(districtShapes);
 if(districtPromise)return districtPromise;
 districtPromise=(async()=>{
  const codes=(window.ERVIN_US_GEOGRAPHY?.states||[]).map(s=>s.code);
  if(codes.length!==50)throw Error('50-state geography has not loaded');
  const records=[],errors=[];
  let cursor=0;
  await Promise.all(Array.from({length:9},async()=>{
   while(cursor<codes.length){
    const code=codes[cursor++];let data=null,last;
    for(let attempt=0;attempt<2&&!data;attempt++){
     try{
      const response=await fetch('../geo/districts/'+code+'.json',{cache:'force-cache',signal:typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?AbortSignal.timeout(18000):undefined});
      if(!response.ok)throw Error(code+' district HTTP '+response.status);
      const candidate=await response.json();
      if(candidate.type!=='FeatureCollection'||candidate.state!==code||!Array.isArray(candidate.features)||!candidate.features.length)throw Error(code+' district data invalid');
      if(CURRENT_CD120.has(code)&&candidate.boundaryYear!==2026)throw Error(code+' congressional geography is not the current 2026 map');
      data=candidate;
     }catch(e){last=e}
    }
    if(!data){errors.push(code+': '+last?.message);continue}
    for(const f of data.features){
     const id=code+'-'+String(f.id).padStart(2,'0');
     records.push({code,id,geometry:f.geometry});
    }
   }
  }));
  if(errors.length)throw Error('Could not validate every congressional district: '+errors.join('; '));
  if(records.length!==435||new Set(records.map(r=>r.id)).size!==435)throw Error('District geometry does not contain exactly 435 unique seats');
  districtShapes=fitProjectedFeatures(records);
  return districtShapes;
 })().catch(e=>{districtPromise=null;throw e});
 return districtPromise;
}
function fillStateMap(office,rows,revision){
 if(revision!==mapRevision)return;
 const el=$('edSimMap'),summary=$('edSimMapReadout');
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 el.replaceChildren();el.setAttribute('viewBox',window.ERVIN_US_GEOGRAPHY?.viewBox||'0 0 1080 625');
 el.dataset.simOffice=office;
 el.setAttribute('aria-label',office==='senateD'?'Final Senate forecast: 17 called contests on 50 state outlines':'Final governor forecast: 36 called contests on 50 state outlines');
 const what=office==='senateD'?'U.S. Senate':'governor';
 const defaultText=office==='senateD'?'All 17 modeled Senate contests have final winner calls. Gray states have no Senate race in this forecast.':'All 36 governor contests have final winner calls. Gray states have no governor election in 2026.';
 summary.textContent=defaultText;
 for(const geoState of geo){
  const s=rows[geoState.code],r=s.entries[0]||null,kind=r?.kind||'N';
  const candidate=kind==='D'?r?.dem:kind==='R'?r?.rep:null;
  const detail=r?s.name+' '+what+': projected '+(kind==='D'?'Democratic':'Republican')+' winner'+(candidate?' '+candidate:'')+' ('+(IS_FINITE(r.margin)?marginText(r.margin):r.rating||r.qualitativeRating||'publisher rating')+').':
   s.name+': no 2026 '+what+' election modeled on this map.';
  const link=makeSvg('a',{href:'../state/?state='+encodeURIComponent(s.code)+'#stateOverview','data-sim-state':s.code,'aria-label':detail+' Open state.',tabindex:0});
  const path=makeSvg('path',{d:geoState.d,class:'ed-sim-proj-state ed-sim-proj-'+kind,'data-sim-kind':kind});
  const tip=makeSvg('title');tip.textContent=detail;path.append(tip);link.append(path);
  link.addEventListener('pointerenter',()=>summary.textContent=detail);
  link.addEventListener('focus',()=>summary.textContent=detail);
  link.addEventListener('pointerleave',()=>summary.textContent=defaultText);
  link.addEventListener('blur',()=>summary.textContent=defaultText);
  el.append(link);
 }
}
async function fillHouseMap(rows,revision){
 const el=$('edSimMap'),summary=$('edSimMapReadout');
 el.dataset.simOffice='house-loading';
 summary.textContent='Assembling 435 congressional district boundaries from locally hosted 2026-compatible map files…';
 try{
  const shapes=await districtGeometry();
  if(revision!==mapRevision)return;
  const calls=new Map();
  for(const s of Object.values(rows))for(const row of s.entries)calls.set(row.id,row);
  const missing=shapes.filter(s=>!calls.has(s.id));
  if(missing.length||calls.size!==435)throw Error('Final House forecast and congressional boundaries do not agree ('+missing.length+' unmatched shapes)');
  const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
  const names=Object.fromEntries(geo.map(s=>[s.code,s.name]));
  const frag=document.createDocumentFragment();
  for(const shape of shapes){
   const r=calls.get(shape.id),detail=names[shape.code]+' '+shape.id+': projected '+(r.kind==='D'?'Democratic':'Republican')+' winner ('+(IS_FINITE(r.margin)?marginText(r.margin):r.rating+' source rating')+').';
   const district=String(Number(shape.id.slice(3))).padStart(2,'0');
   const link=makeSvg('a',{href:'../state/?state='+encodeURIComponent(shape.code)+'#house-'+district,'data-sim-district':shape.id,'data-sim-state':shape.code,'aria-label':detail+' Open district details.',tabindex:0});
   const path=makeSvg('path',{d:shape.d,class:'ed-sim-proj-district ed-sim-proj-'+r.kind,'data-sim-kind':r.kind,'fill-rule':'evenodd'});
   const title=makeSvg('title');title.textContent=detail;path.append(title);link.append(path);
   link.addEventListener('pointerenter',()=>summary.textContent=detail);
   link.addEventListener('focus',()=>summary.textContent=detail);
   link.addEventListener('pointerleave',()=>summary.textContent='Each of 435 districts carries an individual final predicted winner. Select a district to open its state dossier.');
   link.addEventListener('blur',()=>summary.textContent='Each of 435 districts carries an individual final predicted winner. Select a district to open its state dossier.');
   frag.append(link);
  }
  const ak=makeSvg('g',{class:'ed-sim-map-insets','aria-hidden':'true','pointer-events':'none'});
  for(const [code,x,y,w,h] of [['AK',45,427,262,183],['HI',303,518,187,88]]){
   ak.append(makeSvg('rect',{x,y,width:w,height:h,rx:2}));
   const label=makeSvg('text',{x:x+9,y:y+18});label.textContent=code;ak.append(label);
  }
  // Insets sit behind district paths so they never conceal the projected calls.
  el.replaceChildren(ak,frag);
  el.setAttribute('viewBox','0 0 1080 625');
  el.setAttribute('aria-label','Final House projection: 435 clickable congressional districts, each assigned a Democratic or Republican winner');
  el.dataset.simOffice='house';
  summary.textContent='Every one of 435 U.S. House districts has a final predicted winner. Select a district to open its state dossier.';
 }catch(error){
  if(revision!==mapRevision)return;
  el.replaceChildren(makeSvg('text',{x:540,y:310,'text-anchor':'middle'}));
  el.firstElementChild.textContent='District geography temporarily unavailable';
  el.dataset.simOffice='house-error';
  summary.textContent='Cannot validate the entire 435-district map: '+error.message+'. The final call totals and chart remain available.';
 }
}
function renderProjectionMap(office){
 const el=$('edSimMap'),summary=$('edSimMapReadout'),note=$('edSimMapNote'),title=$('edSimMapTitle');
 if(!el||!summary||!note||!title)return;
 const revision=++mapRevision;
 const isHouse=office==='house',isSen=office==='senateD';
 title.textContent=isHouse?'House · final prediction by congressional district':isSen?'Senate · final prediction by state':'Governors · final prediction by state';
 const model=window.ERVIN_HOME_FORECAST,geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 if(!model||!geo.length||!model.house?.length||!model.senate?.length||!model.governor?.length){
  el.replaceChildren(makeSvg('text',{x:540,y:315,'text-anchor':'middle'}));
  el.firstElementChild.textContent='Loading locked election-day forecast…';
  summary.textContent='Assembling the frozen final election forecasts.';
  return;
 }
 const rows=projectedRows(office,model);
 if(!renderCallTally(office,rows)){el.replaceChildren();return}
 if(isHouse){
  note.textContent='435 district-by-district predictions, including two contests assigned by sourced Cook ratings rather than a numeric poll. This point-call map can differ from the 144,000-run national median; it does not revise the locked model or display reported votes.';
  fillHouseMap(rows,revision);
 }else{
  note.textContent=isSen?
   '17 modeled 2026 Senate races are called Democratic or Republican; gray marks states without a modeled Senate contest, not toss-ups. All Republican-vs-independent races in this forecast favor the Republican candidate. Holdover senators are excluded.':
   'All 36 2026 governor elections have a winner call, including three based on attributed Cook ratings. Gray states have no gubernatorial contest in 2026, not an undecided forecast.';
  fillStateMap(office,rows,revision);
 }
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