/* National single county atlas: same 3143 FIPS shapes for pre-election
 * conditional forecasts and independently validated 2026 county counts.
 * Never allocates civicAPI statewide totals into county boundaries. */
(()=>{'use strict';
const NS='http://www.w3.org/2000/svg',$=id=>document.getElementById(id),C=window.ERVIN_COUNTY_CORE;
const FILES=Array.from({length:10},(_,i)=>'../geo/packs/p'+String(i+1).padStart(2,'0')+'.json');
const codes='AK AL AR AZ CA CO CT DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(' ');
const isN=n=>typeof n==='number'&&Number.isFinite(n),vote=n=>Number.isSafeInteger(n)&&n>=0&&n<=16000000;
const fmt=m=>!isN(m)?'No available forecast':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1)+' pts';
const iso=n=>new Date(n).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
let shapes=[],history=null,models=null,office='Senate',view='forecast',loaded=false,started=false,authority=null,health=null,results=null,rows={},busy=false,lastFetch=0,runId=0;
const el=name=>document.createElementNS(NS,name);
const fetchJSON=async p=>{let r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json()};
function coords(lon,lat,code){
 if(code==='AK'){const a=lon>0?lon-360:lon;return[Math.max(15,Math.min(280,23+(a+180)*4.8)),Math.max(454,Math.min(615,460+(72-lat)*7.1))]}
 if(code==='HI')return [320+(lon+161.8)*13,530+(23.2-lat)*13];
 return[75+(lon+125.6)*16.6,30+(49.6-lat)*19.9]
}
function paths(geom){return geom?.type==='Polygon'?[geom.coordinates]:geom?.type==='MultiPolygon'?geom.coordinates:[]}
function geometryPath(geom,code){
 let output='';for(const poly of paths(geom))for(const ring of poly){
  let chunk='',previous=null,n=0;
  for(const xy of ring){if(!Array.isArray(xy)||xy.length<2)continue;const [x,y]=coords(xy[0],xy[1],code);
   if(!isN(x)||!isN(y))continue;if(previous&&Math.abs(x-previous[0])+Math.abs(y-previous[1])<.20)continue;
   chunk+=(n?'L':'M')+x.toFixed(1)+','+y.toFixed(1);previous=[x,y];n++}
  if(n>=3)output+=chunk+'Z'}
 return output;
}
function scenario(code,target){
 if(!history||!window.ERVIN_SCENARIOS||!isN(target))return null;
 const first=shapes.find(x=>x.code===code)?.features?.[0]?.id,prefix=String(first||'').padStart(5,'0').slice(0,2);
 return window.ERVIN_SCENARIOS.build(history,prefix,target).map;
}
function forecast(code){
 const r=models?.[office.toLowerCase()]?.find(x=>x.code===code);return isN(r?.margin)?r:null;
}
function report(code,fips){return rows[office]?.[code]?.get(fips)||null}
const shade=n=>!isN(n)?'atlas-N':n>=0?'atlas-D':'atlas-R';
function updateSummary(stats){
 const active=health?.summary,asOf=health?.checkedAt?iso(health.checkedAt):'not independently probed';
 const coverage=$('allCountySourceAudit');
 if(coverage)coverage.textContent=(active?.countyEquivalents||3143).toLocaleString()+' county-equivalent boundaries · '+(active?.countySourcesIndependentlyLinked||104)+' authority-listed county sources · '+(active?.countiesWithoutDirectVerifiedSource||3039)+' counties lack independently indexed direct results pages. Source website accessibility last checked: '+asOf+'. An indexed URL is NOT a validated live vote feed.';
 $('allCountyStatus').textContent=stats.states+' states with '+office+' forecast margins · '+stats.forecast+' conditional county scenarios · '+stats.actual+' counties with validated unofficial '+office+' vote leaders · '+stats.polygons+' geographic shapes';
 $('allCountyNote').textContent=view==='reported'?'REPORTED VOTES ONLY: a colored county has a validated, independently attributed 2026 '+office+' result. Gray counties have no accepted feed. No source is treated as zero votes.':
  view==='compare'?'COMPARISON: full-color counties have validated unofficial results; faded, dashed counties show conditional pre-election '+office+' forecasts only. Forecasts are NOT votes.':
  'FORECAST: conditional 2026 '+office+' county scenarios derived from earlier presidential geography and statewide margins. This is not independent county polling or counted votes.';
}
function render(){
 const svg=$('allCountyMap');if(!svg||!loaded)return;
 const fragment=document.createDocumentFragment();let stateN=0,nForecast=0,nActual=0,n=0;
 for(const {code,features} of shapes){
  const race=forecast(code),values=scenario(code,race?.margin);if(race)stateN++;
  const grp=el('g');grp.setAttribute('data-county-state',code);
  for(const f of features){
   const fips=String(f.id).padStart(5,'0'),estimate=values?.get(fips)?.expected??null;
   const current=report(code,fips),actual=current?100*(current.dem-current.rep)/(current.dem+current.rep+current.other):null;
   const val=view==='reported'?actual:view==='compare'?(isN(actual)?actual:estimate):estimate;
   const d=f._ervinPath||(f._ervinPath=geometryPath(f.geometry,code));if(!d)continue;
   const a=el('a');a.setAttribute('href','../state/?state='+code+'&county='+fips+'#stateGeography');a.setAttribute('aria-label',(f.properties?.name||'County')+', '+code+', '+(current?'unofficial '+office+' results available':view==='reported'?'no validated results':'conditional forecast'));
   const p=el('path');p.setAttribute('class','all-county '+shade(val));p.setAttribute('d',d);p.dataset.countyId=fips;
   p.dataset.reported=current?'true':'false';
   if(isN(val)){
    const strength=Math.min(96,Math.max(48,47+Math.abs(val)*.9));
    p.style.fill='color-mix(in srgb, var(--atlas-'+(val>=0?'d':'r')+') '+Math.round(strength)+'%, var(--atlas-n))';
    if(view==='compare'&&!current){p.style.opacity='.45';p.style.strokeDasharray='2 1'}
   }
   const title=el('title');
   title.textContent=(f.properties?.name||fips)+' County, '+code+' · '+office+(current?' · UNOFFICIAL D '+current.dem.toLocaleString()+' / R '+current.rep.toLocaleString()+' · source '+current.url+(isN(estimate)?' · pre-election '+fmt(estimate):''):
     view==='reported'?' · no independently verified 2026 results':
     isN(estimate)?' · conditional forecast '+fmt(estimate):' · no 2026 forecast');
   p.append(title);a.append(p);grp.append(a);
   if(isN(estimate))nForecast++;if(current)nActual++;n++;
  }
  fragment.append(grp);
 }
 svg.replaceChildren(fragment);
 updateSummary({states:stateN,forecast:nForecast,actual:nActual,polygons:n});
 for(const b of document.querySelectorAll('[data-national-county-office]'))b.setAttribute('aria-pressed',String(b.dataset.nationalCountyOffice===office));
 for(const b of document.querySelectorAll('[data-national-county-view]'))b.setAttribute('aria-pressed',String(b.dataset.nationalCountyView===view));
}
function scrutinizeMichigan(geography,raw,source,kind){
 const allowed=new Map((geography.features||[]).map(f=>[C.normalize(f.properties.name),String(f.id).padStart(5,'0')]));
 if(raw?.version!==1||raw.election!=='2026-11-03'||raw.office!=='US Senate')return null;
 const rows=kind==='precinct'?raw.precincts:raw.counties;
 if(!Array.isArray(rows)||rows.length>(kind==='precinct'?16000:83))return null;
 const output=new Map(),seen=new Set(),ct=new Set(['Dickinson','Gogebic','Iron','Menominee']);
 for(const row of rows){
  const id=allowed.get(C.normalize(row.county));if(!id||(!vote(row.dem)||!vote(row.rep)||!vote(row.other)))return null;
  const close=ct.has(row.county)?Date.parse('2026-11-04T02:00:00Z'):Date.parse('2026-11-04T01:00:00Z');
  const timestamp=Date.parse(row.asOf||'');
  if(!Number.isFinite(timestamp)||timestamp<close||timestamp>Date.now()+300000||!C.sourceAllowed('MI',row.county,row.sourceUrl,authority))return null;
  if(kind==='precinct'&&(!row.precinct||typeof row.precinct!=='string'))return null;
  const key=kind==='precinct'?id+'-'+row.precinct.toLowerCase().trim():id;
  if(seen.has(key))return null;seen.add(key);
  const previous=output.get(id)||{id,fips:id,dem:0,rep:0,other:0,asOf:row.asOf,url:row.sourceUrl,source};
  previous.dem+=row.dem;previous.rep+=row.rep;previous.other+=row.other;
  if(row.asOf>previous.asOf){previous.asOf=row.asOf;previous.url=row.sourceUrl}
  output.set(id,previous);
 }
 return output;
}
async function check(){
 if(!loaded||!authority||busy)return;
 busy=true;const token=++runId;
 try{
  const jobs=[fetchJSON('../election-night/county-returns.json')];
  const mi=Date.now()>=Date.parse('2026-11-04T01:00:00Z');
  if(mi)jobs.push(...['results.json','county_auto.json','county_totals.json'].map(x=>fetchJSON('../michigan/election-night/'+x).catch(()=>null)));
  const got=await Promise.all(jobs);if(token!==runId)return;
  results=got[0];const next={Senate:{},Governor:{}};
  for(const {code,features}of shapes)for(const o of ['Senate','Governor']){
   const old=rows[o]?.[code]||new Map();
   const parsed=C.parse(results,code,o,features,authority,old);
   if(parsed.available)next[o][code]=parsed.rows;
  }
  if(mi){
   const geography=shapes.find(x=>x.code==='MI');
   let county=new Map();
   const sources=['Precinct reports','Automated county clerk','County clerk'];
   for(let i=1;i<got.length;i++){
    const checked=scrutinizeMichigan({features:geography.features},got[i],sources[i-1],i===1?'precinct':'county');
    if(checked)for(const[id,row]of checked)county.set(id,row); // later full county source replaces partial precincts.
   }
   if(county.size)next.Senate.MI=county;
  }
  rows=next;
  render();
  if(Object.values(next.Senate).some(v=>v.size)||Object.values(next.Governor).some(v=>v.size))window.dispatchEvent(new CustomEvent('ervin:national-county-reporting',{detail:{count:Object.values(next.Senate).reduce((n,v)=>n+v.size,0)+Object.values(next.Governor).reduce((n,v)=>n+v.size,0)}}));
 }catch(err){console.warn('National county feed unavailable; prior validated rows preserved',err)}
 finally{busy=false;lastFetch=Date.now()}
}
async function start(){
 if(started)return;started=true;
 $('allCountyStatus').textContent='Loading all 50 states of county boundaries and independently registered result sources…';
 try{
  const [packs,countyHistory,registr,sourceHealth]=await Promise.all([
    Promise.all(FILES.map(fetchJSON)),window.ERVIN_SCENARIOS.load(),fetchJSON('../election-night/county-sources.json'),fetchJSON('../election-night/county-source-health.json').catch(()=>null)]);
  history=countyHistory;authority=registr;health=sourceHealth;
  shapes=codes.map(code=>{const pack=packs.find(p=>p.states?.[code]?.counties);return{code,features:pack?.states?.[code]?.counties?.features||[]}});
  loaded=true;render();check();
 }catch(e){console.error(e);$('allCountyStatus').textContent='County projection geography or evidence registry unavailable. The state directory and individual state maps remain accessible.'}
}
function init(){
 if(!$('allCountyNation'))return;
 document.querySelectorAll('[data-national-county-office]').forEach(b=>b.addEventListener('click',()=>{office=b.dataset.nationalCountyOffice;render()}));
 document.querySelectorAll('[data-national-county-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.nationalCountyView;render()}));
 models=window.ERVIN_HOME_FORECAST||null;
 window.addEventListener('ervin:forecast-ready',()=>{models=window.ERVIN_HOME_FORECAST;if(loaded)render();else start()});
 window.addEventListener('ervin:home-live',()=>{if(view==='forecast'){view='reported';render()}});
 if(models)start();
 setInterval(()=>{if(!document.hidden&&loaded&&Date.now()-lastFetch>=30000)check()},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();