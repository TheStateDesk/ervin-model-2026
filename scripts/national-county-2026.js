/* All-state county atlas. Every polygon comes from locally hosted TIGER-derived
 * boundaries; 2026 colors are conditional county forecasts, NEVER 2026 counts.
 * The scenario builder is the exact one used by each individual State Desk. */
(()=>{'use strict';
const SVG='http://www.w3.org/2000/svg', $=id=>document.getElementById(id);
const FILES=Array.from({length:10},(_,i)=>'../geo/packs/p'+String(i+1).padStart(2,'0')+'.json');
const codes='AK AL AR AZ CA CO CT DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(' ');
let shapes=[],history=null,models=null,office='Senate',loaded=false,started=false;
const NS=(name)=>document.createElementNS(SVG,name);
const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=x=>!isNumber(x)?'No comparable estimate':(x<0?'R +':x>0?'D +':'Even ')+Math.abs(x).toFixed(1)+' pts';
function coords(lon,lat,state){
 if(state==='AK'){
  const a=lon>0?lon-360:lon;
  return [Math.max(15,Math.min(280,23+(a+180)*4.8)),Math.max(454,Math.min(615,460+(72-lat)*7.1))];
 }
 if(state==='HI')return [320+(lon+161.8)*13,530+(23.2-lat)*13];
 // Longitudes and latitudes use one projection for all CONUS states;
 // no per-state rescaling that misaligns boundaries.
 return [75+(lon+125.6)*16.6,30+(49.6-lat)*19.9];
}
function polys(geom){
 if(geom?.type==='Polygon')return [geom.coordinates];
 if(geom?.type==='MultiPolygon')return geom.coordinates;
 return [];
}
function pathFor(geom,code){
 let output='';
 for(const p of polys(geom)){
  for(const ring of p){
   let path='',last=null,n=0;
   for(const xy of ring){
    if(!Array.isArray(xy)||xy.length<2)continue;
    const [x,y]=coords(xy[0],xy[1],code);
    if(!isNumber(x)||!isNumber(y))continue;
    if(last&&Math.abs(x-last[0])+Math.abs(y-last[1])<.20)continue;
    path+=(n?'L':'M')+x.toFixed(1)+','+y.toFixed(1);
    last=[x,y];n++;
   }
   if(n>=3)output+=path+'Z';
  }
 }
 return output;
}
function scenario(code,target){
 if(!history||!window.ERVIN_SCENARIOS||!isNumber(target))return null;
 const first=shapes.find(s=>s.code===code)?.features?.[0]?.id;
 const prefix=String(first||'').padStart(5,'0').slice(0,2);
 return window.ERVIN_SCENARIOS.build(history,prefix,target).map;
}
function getModel(code){
 const rows=models?.[office.toLowerCase()]||[];
 const r=rows.find(x=>x.code===code);
 return isNumber(r?.margin)?r:null;
}
function color(val){
 if(!isNumber(val))return 'atlas-N';
 return val>=0?'atlas-D':'atlas-R';
}
function render(){
 const svg=$('allCountyMap'),status=$('allCountyStatus');
 if(!loaded||!svg)return;
 svg.replaceChildren();
 const frag=document.createDocumentFragment();let colored=0,shapeCount=0,raceStates=0;
 for(const {code,features} of shapes){
  const race=getModel(code),target=race?.margin,values=scenario(code,target);
  if(race)raceStates++;
  const group=NS('g');group.setAttribute('data-county-state',code);
  for(const feature of features){
   const key=String(feature.id||'').padStart(5,'0');
   const est=values?.get(key)?.expected??null;
   const d=feature._ervinPath||(feature._ervinPath=pathFor(feature.geometry,code));if(!d)continue;
   
   const p=NS('path');p.setAttribute('class','all-county '+color(est));p.setAttribute('d',d);
   p.setAttribute('data-county-id',key);
   if(isNumber(est)){
    colored++;
    const strength=Math.min(96,Math.max(46,47+Math.abs(est)*.9));
    p.style.fill='color-mix(in srgb, var(--atlas-'+(est>=0?'d':'r')+') '+Math.round(strength)+'%, var(--atlas-n))';
   }
   const tip=NS('title');tip.textContent=(feature.properties?.name||key)+' County, '+code+(isNumber(est)?' · conditional '+office+' scenario '+fmt(est):' · no 2026 '+office.toLowerCase()+' margin');
   p.append(tip);group.append(p);shapeCount++;
  }
  frag.append(group);
 }
 svg.append(frag);
 status.textContent=raceStates+' states with '+office+' estimates · '+colored+' county scenarios · '+shapeCount+' county/borough shapes';
 $('allCountyNote').textContent='Each colored county is a conditional 2026 '+office+' projection based on 2020/2024 county history shifted to the current statewide margin. No 2026 county polls or votes are inferred. Unmodeled counties stay neutral; third-party voting and changed turnout can alter outcomes.';
 for(const b of document.querySelectorAll('[data-national-county-office]'))b.setAttribute('aria-pressed',String(b.dataset.nationalCountyOffice===office));
}
async function start(){
 if(started)return;started=true;
 const el=$('allCountyStatus');el.textContent='Loading the nationwide 2026 Senate and governor county projection…';
 try{
  const results=await Promise.all([...FILES.map(p=>fetch(p,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Map package '+p+' '+r.status);return r.json()})),
    window.ERVIN_SCENARIOS.load()]);
  history=results.at(-1);
  shapes=codes.map(code=>{
   const pack=results.slice(0,-1).find(p=>p.states?.[code]?.counties);
   return {code,features:pack?.states?.[code]?.counties?.features||[]};
  });
  loaded=true;render();
 }catch(e){console.error(e);el.textContent='County geography could not be loaded; the 50-state map above and state editions remain available.'}
}
function initialize(){
 const section=$('allCountyNation');if(!section)return;
 document.querySelectorAll('[data-national-county-office]').forEach(b=>b.addEventListener('click',()=>{office=b.dataset.nationalCountyOffice;render()}));
 models=window.ERVIN_HOME_FORECAST||null;
 window.addEventListener('ervin:forecast-ready',()=>{models=window.ERVIN_HOME_FORECAST;if(loaded)render();else start()});
 if(models)start();
 else {
  const el=$('allCountyStatus');if(el)el.textContent='Preparing national county map from the current state forecasts…';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();