/* Ervin Model 2026: locked final prediction and election-night editorial desk.
   Static-site commentary is deterministic, generated only from normalized, source-attributed
   unofficial vote records; it does not invent live reporting, winner calls, or turnout. */
(()=>{'use strict';
const SWITCH_AT=Date.parse('2026-11-03T17:55:00-05:00');
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString('en-US');
const labelTime=when=>new Date(when).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const stateNames={AK:'Alaska',AZ:'Arizona',GA:'Georgia',IA:'Iowa',KS:'Kansas',ME:'Maine',MI:'Michigan',MN:'Minnesota',MT:'Montana',NC:'North Carolina',NE:'Nebraska',NH:'New Hampshire',OH:'Ohio',PA:'Pennsylvania',SD:'South Dakota',TX:'Texas',WI:'Wisconsin'};
const priorityStates=['MI','OH','TX','ME','GA','NC','IA','AK','NE','KS','MN'];
// Ballot coverage is broader than the 17 numerical Senate forecasts.
const SENATE_BALLOT_STATES=new Set('AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY'.split(' '));
let active=false,lastPost=0,posted=new Set(),selectedDistribution='house';
const pending=new Map(),seen=new Map();
function make(tag,cls,textValue){const el=document.createElement(tag);if(cls)el.className=cls;if(textValue!==undefined)el.textContent=textValue;return el;}
function safeLink(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function build(){
 const balance=$('balanceOfPower'),dashboard=$('electionDashboard');if(!balance||!dashboard)return;
 const insight=$('edSimulationPanel')||make('section','ed-sim-panel');insight.id='edSimulationPanel';insight.className='ed-sim-panel';
 insight.innerHTML="\n<div class=\"ed-final-mast\">\n <div class=\"ed-final-eyebrow\"><span class=\"ed-final-monogram\" aria-hidden=\"true\">E</span><span>THE ERVIN MODEL <small>2026 ELECTION FORECAST</small></span><span class=\"ed-final-edition\">ELECTION DAY EDITION · NOVEMBER 3, 2026</span></div>\n <div class=\"ed-final-hero-row\">\n  <div class=\"ed-final-title-wrap\"><span class=\"ed-final-kicker\">THE NATIONAL ELECTION DESK / LOCKED FORECAST</span><h2 class=\"ed-final-headline\" id=\"edFinalHeadline\"><span>FINAL</span><span>PREDICTION</span></h2><p class=\"ed-final-deck\">Our final party-by-party projections for the House, Senate, and governors. Every shaded contest receives a definitive forecast call—no toss-up colors.</p></div>\n  <aside class=\"ed-final-hero-aside\"><span>THE BIG PICTURE</span><strong>A blue House.</strong><strong>A Senate cliffhanger.</strong><small>The final party-by-party predictions, locked before election-night returns. Open any district or state for its detailed forecast.</small></aside>\n </div>\n <div class=\"ed-final-metadata\"><span><span class=\"ed-final-dot\"></span> FORECAST LOCKED · NOV. 3, 2026</span><span>PROJECTIONS, NOT REPORTED VOTES</span><a class=\"ed-sim-source\" href=\"https://github.com/geervin/ervin-model-2026/blob/main/research/FINAL_2026_ELECTION_DAY_AUDIT.md\">Read the forecasting audit</a></div>\n</div>\n<div id=\"edSimTabs\" class=\"ed-sim-tabs\" role=\"group\" aria-label=\"Choose House, Senate or governor final prediction map\"></div>\n<div id=\"edFinalCallSummary\" class=\"ed-final-call-summary\" aria-live=\"polite\">Loading final projected winners…</div>\n<div class=\"ed-coverage-layout\"><div class=\"ed-sim-map-pane ed-final-map-pane\">\n <div class=\"ed-sim-visual-heading\"><h3 id=\"edSimMapTitle\">House · final predictions by district</h3><span class=\"ed-sim-preview-flag\">FINAL RACE-BY-RACE CALLS</span></div>\n <div class=\"ed-final-map-scroller\" tabindex=\"0\" role=\"region\" aria-label=\"Explore projected winners on the interactive map\"><svg id=\"edSimMap\" viewBox=\"0 0 1080 625\" role=\"group\" aria-label=\"Final election projection map\"><text x=\"540\" y=\"315\" text-anchor=\"middle\">Loading election geography…</text></svg></div>\n <div class=\"ed-sim-map-legend\"><span><i class=\"ed-sim-legend-d\"></i> Democratic call</span><span><i class=\"ed-sim-legend-r\"></i> Republican call</span><span><i class=\"ed-sim-legend-n\"></i> No election in 2026</span></div>\n <p class=\"ed-sim-map-readout\" id=\"edSimMapReadout\" aria-live=\"polite\">Hover, focus, or select a district to inspect the projected winner.</p>\n <p class=\"ed-sim-map-foot\" id=\"edSimMapNote\">Predicted winners are not counted vote totals or official race calls.</p>\n</div>\n<aside id=\"edLiveCommentary\" class=\"ed-commentary ed-live-commentary\" aria-labelledby=\"edCommentaryTitle\" hidden>\n <div class=\"ed-commentary-head\"><div class=\"ed-kicker\">ELECTION NIGHT / VERIFIED REPORTS</div><h3 id=\"edCommentaryTitle\">Live commentary</h3><p id=\"edCommentaryStatus\">Awaiting new verified election reports</p></div>\n <div id=\"edCommentaryEntries\" class=\"ed-commentary-entries\" aria-live=\"polite\" aria-relevant=\"additions\"></div>\n <p class=\"ed-commentary-method\">Automatic short updates from attributed unofficial vote reports. Changes in leads are not official race calls.</p>\n <a class=\"ed-night-action\" href=\"../election-night/#nationalBoard\">See the national results desk</a>\n</aside>\n</div>\n";
 const byline=document.querySelector('.ed-byline');
 const heading=document.querySelector('.ed-headline');
 if(!insight.isConnected)(byline||heading||balance).insertAdjacentElement(byline||heading?'afterend':'beforebegin',insight);
 const hero=document.querySelector('.ed-headline');
 if(hero)hero.dataset.electionOriginal=hero.textContent;
 renderFinalTabs('house');
}
function addEntry(message,time,url,source,prepend=true,raceId=null){
 const holder=$('edCommentaryEntries');if(!holder)return;
 const item=make('article','ed-commentary-item');
 const header=make('div','ed-commentary-meta');
 const tm=make('time','',labelTime(time));tm.dateTime=new Date(time).toISOString();
 header.append(tm,make('span','',source||'Results desk'));
 const para=make('p','',message);item.append(header,para);
 const links=make('div','ed-commentary-links');
 const race=raceId&&nightRaceHref(raceId);
 if(race){const anchor=make('a','ed-commentary-link','Open race results');anchor.href=race;links.append(anchor);}
 const href=safeLink(url);
 if(href){const a=make('a','ed-commentary-link','Original results source');a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
 if(links.childElementCount)item.append(links);
 if(prepend)holder.prepend(item);else holder.append(item);
 while(holder.children.length>12)holder.lastElementChild.remove();
}
function nightRaceHref(id){
 if(!/^[A-Z]{2}-(?:[0-9]{2}|SENATE|GOVERNOR)$/.test(String(id||'')))return null;
 return '../election-night/?state='+encodeURIComponent(id.slice(0,2))+'&race='+encodeURIComponent(id)+'#nationalBoard';
}
// The public homepage is focused on the locked final race calls.
function renderFinalTabs(selected){
 selectedDistribution=selected;
 const tabs=$('edSimTabs');if(!tabs)return;
 tabs.replaceChildren();
 for(const [key,label] of [['house','House'],['senateD','Senate'],['governorsD','Governors']]){
  const button=make('button','',label);button.type='button';
  button.setAttribute('aria-pressed',String(key===selected));
  button.addEventListener('click',()=>renderFinalTabs(key));tabs.append(button);
 }
 renderProjectionMap(selected);
}

/* The final prediction calls every modeled contest D or R.
 * This feature never reads live election results. */
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
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const [x,y] of all){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
  const bx=[minX,maxX],by=[minY,maxY];
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
  await Promise.all(Array.from({length:12},async()=>{
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
     // Local district files include a few non-electoral 'ZZ' water/territory shapes.
     // Match the site's district engine: only numbered congressional districts count.
     if(!/^\d{1,2}$/.test(String(f.id)))continue;
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

/* Align the Senate/Governor state silhouettes with the exact House inset
 * frames. Alaska and Hawaii keep their state outlines; only the visual inset
 * translation/scale changes, never the forecast data or office coverage. */
const FINAL_INSETS={
 AK:{x:56,y:436,w:245,h:163,border:[45,427,262,183]},
 HI:{x:310,y:525,w:165,h:73,border:[303,518,187,88]}
};
function stateInsetTransform(d,code){
 const frame=FINAL_INSETS[code];if(!frame)return '';
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,count=0;
 for(const p of d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)){
  const x=Number(p[1]),y=Number(p[2]);
  if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
  count++;
 }
 if(count<3||!Number.isFinite(minX)||maxX<=minX||maxY<=minY)throw Error(code+' inset geometry cannot be positioned');
 const scale=Math.min(frame.w/(maxX-minX),frame.h/(maxY-minY));
 const tx=frame.x+(frame.w-(maxX-minX)*scale)/2-minX*scale;
 const ty=frame.y+(frame.h-(maxY-minY)*scale)/2-minY*scale;
 return 'translate('+tx.toFixed(3)+' '+ty.toFixed(3)+') scale('+scale.toFixed(5)+')';
}
function addFinalInsetFrames(svg){
 const frameGroup=makeSvg('g',{class:'ed-sim-map-insets','aria-hidden':'true','pointer-events':'none'});
 for(const code of ['AK','HI']){
  const [x,y,w,h]=FINAL_INSETS[code].border;
  frameGroup.append(makeSvg('rect',{x,y,width:w,height:h,rx:2}));
  const name=makeSvg('text',{x:x+9,y:y+18});name.textContent=code;frameGroup.append(name);
 }
 svg.append(frameGroup);
}
function fillStateMap(office,rows,revision){
 if(revision!==mapRevision)return;
 const el=$('edSimMap'),summary=$('edSimMapReadout');
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 el.replaceChildren();el.setAttribute('viewBox',window.ERVIN_US_GEOGRAPHY?.viewBox||'0 0 1080 625');
 el.dataset.simOffice=office;
 el.setAttribute('aria-label',office==='senateD'?'Final Senate forecast: 17 called contests, 50 state outlines with Alaska and Hawaii insets':'Final governor forecast: 36 called contests, 50 state outlines with Alaska and Hawaii insets');
 const what=office==='senateD'?'U.S. Senate':'governor';
 const defaultText=office==='senateD'?'All 17 modeled Senate contests have final winner calls. Gray states have no Senate race in this forecast.':'All 36 governor contests have final winner calls. Gray states have no governor election in 2026.';
 summary.textContent=defaultText;
 // The same x/y inset rectangles used by the House map remain in every tab.
 addFinalInsetFrames(el);
 const insetLayers=[];
 for(const geoState of geo){
  const s=rows[geoState.code],r=s.entries[0]||null,kind=r?.kind||'N';
  const candidate=kind==='D'?r?.dem:kind==='R'?r?.rep:null;
  const onBallot=office==='senateD'?SENATE_BALLOT_STATES.has(s.code):!!r;
  const detail=r?s.name+' '+what+': projected '+(kind==='D'?'Democratic':'Republican')+' winner'+(candidate?' '+candidate:'')+' ('+(IS_FINITE(r.margin)?marginText(r.margin):r.rating||r.qualitativeRating||'publisher rating')+').':
   s.name+(onBallot?': 2026 '+what+' contest without a numerical Ervin forecast.':': no 2026 '+what+' election on this map.');
  const raceId=s.code+'-'+(office==='senateD'?'SENATE':'GOVERNOR');
  const target=onBallot?nightRaceHref(raceId):'../state/?state='+encodeURIComponent(s.code)+'#stateOverview';
  const link=makeSvg('a',{href:target,'data-sim-state':s.code,'aria-label':detail+(onBallot?' Open this race.':' Open state election overview.'),tabindex:0});
  const path=makeSvg('path',{d:geoState.d,class:'ed-sim-proj-state ed-sim-proj-'+kind,'data-sim-kind':kind});
  const tip=makeSvg('title');tip.textContent=detail;path.append(tip);link.append(path);
  link.addEventListener('pointerenter',()=>summary.textContent=detail);
  link.addEventListener('focus',()=>summary.textContent=detail);
  link.addEventListener('pointerleave',()=>summary.textContent=defaultText);
  link.addEventListener('blur',()=>summary.textContent=defaultText);
  if(FINAL_INSETS[s.code]){
   const group=makeSvg('g',{'data-sim-inset':s.code,transform:stateInsetTransform(geoState.d,s.code)});
   group.append(link);insetLayers.push(group);
  }else el.append(link);
 }
 for(const layer of insetLayers)el.append(layer);
}

async function fillHouseMap(rows,revision,attempt=0){
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
   const link=makeSvg('a',{href:nightRaceHref(shape.id),'data-sim-district':shape.id,'data-sim-state':shape.code,'aria-label':detail+' Open this congressional race.',tabindex:0});
   const path=makeSvg('path',{d:shape.d,class:'ed-sim-proj-district ed-sim-proj-'+r.kind,'data-sim-kind':r.kind,'fill-rule':'evenodd'});
   const title=makeSvg('title');title.textContent=detail;path.append(title);link.append(path);
   link.addEventListener('pointerenter',()=>summary.textContent=detail);
   link.addEventListener('focus',()=>summary.textContent=detail);
   link.addEventListener('pointerleave',()=>summary.textContent='Each of 435 districts carries an individual final predicted winner. Select a district to open its race page.');
   link.addEventListener('blur',()=>summary.textContent='Each of 435 districts carries an individual final predicted winner. Select a district to open its race page.');
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
  summary.textContent='Every one of 435 U.S. House districts has a final predicted winner. Select a district to open its race page.';
 }catch(error){
  if(revision!==mapRevision)return;
  if(attempt<2){
   summary.textContent='Refreshing the congressional map after a temporary geography loading error…';
   setTimeout(()=>{if(mapRevision===revision)fillHouseMap(rows,revision,attempt+1)},2000+attempt*2500);
   return;
  }
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
  note.textContent='435 district-by-district predictions, including two contests assigned by attributed publisher ratings rather than numeric polling. These are projected winners, not reported votes.';
  fillHouseMap(rows,revision);
 }else{
  note.textContent=isSen?
   '17 modeled 2026 Senate races are called Democratic or Republican; gray marks states without a modeled Senate contest, not toss-ups. All Republican-vs-independent races in this forecast favor the Republican candidate. Holdover senators are excluded.':
   'All 36 2026 governor elections have a winner call, including three based on attributed Cook ratings. Gray states have no gubernatorial contest in 2026, not an undecided forecast.';
  fillStateMap(office,rows,revision);
 }
}

function enter(){
 if(active||new URLSearchParams(location.search).get('view')==='final')return;
 active=true;
 document.documentElement.classList.add('ed-election-night');
 window.ERVIN_LIVE_HERO?.activate?.();
 window.dispatchEvent(new Event('ervin:election-night-open'));
}
function pollPhase(){
 const params=new URLSearchParams(location.search),preview=params.get('preview');
 if(params.get('view')==='final')return;
 if(Date.now()>=SWITCH_AT||preview==='closing'||preview==='live')enter();
}
function storyScore(r){
 const id=r.id||'',code=id.slice(0,2);
 const important=priorityStates.indexOf(code),office=r.office;
 return (office==='Senate'?500:office==='Governor'?300:100)+(important<0?0:110-important*8)+Math.log10(Math.max(1,r.total))*10+(Number.isFinite(r.precincts)?r.precincts/10:0);
}
function enqueue(){
 if(window.ERVIN_LIVE_HERO)return;
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
 if(window.ERVIN_LIVE_HERO)return;
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