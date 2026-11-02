/* Per-state 2026 election night geography. No synthetic vote counts.
 * Every state has a land/county map, office switch, source-based county ledger.
 * Michigan Senate: only actual validated clerk county totals / precinct detail.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validVote=x=>Number.isSafeInteger(x)&&x>=0&&x<=12000000;
const validURL=x=>{try{let u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
const election='2026-11-03',north=new Set(['Dickinson','Gogebic','Iron','Menominee']);
const closingET=Date.parse('2026-11-03T20:00:00-05:00'),closingCT=Date.parse('2026-11-03T21:00:00-05:00');
const lateClosingUTC=Date.parse('2026-11-04T07:00:00Z');
let code=new URLSearchParams(location.search).get('state')?.toUpperCase()||'MI',office='Senate',counties=[],future=null,sourceMap={},rows=new Map(),editorialRows=[],requestId=0;
const fmt=n=>Number(n).toLocaleString('en-US'),margin=n=>!Number.isFinite(n)?'—':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
const src='https://www.nass.org/can-I-vote/state-election-officials';
const fetchJSON=async path=>{let r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()};
function safeRow(p,source,closeAt){
 const name=String(p.county||'').trim(), fips=String(p.fips||'').padStart(5,'0');
 const c=counties.find(x=>x.id===fips||x.name.toLowerCase()===name.toLowerCase());
 const timestamp=Date.parse(p.asOf||'');
 if(!c||!validURL(p.sourceUrl)||![p.dem,p.rep,p.other].every(validVote)||!Number.isFinite(timestamp)||timestamp<closeAt||timestamp>Date.now()+300000)throw Error('Unverified county source, timestamp, or vote count');
 return{id:c.id,name:c.name,dem:p.dem,rep:p.rep,other:p.other,asOf:p.asOf,url:p.sourceUrl,source};
}
function readCounty(payload,source){
 if(!payload||payload.version!==1||payload.election!==election||payload.office!=='US Senate'||!Array.isArray(payload.counties)||payload.counties.length>83)throw Error('Unexpected Michigan county source');
 const out=new Map();
 for(const p of payload.counties){const min=north.has(p.county)?closingCT:closingET;const clean=safeRow(p,source,min);if(out.has(clean.id))throw Error('Duplicate county');out.set(clean.id,clean)}
 return out;
}
function readPrecinct(payload){
 if(!payload||payload.version!==1||payload.election!==election||payload.office!=='US Senate'||!Array.isArray(payload.precincts)||payload.precincts.length>15000)throw Error('Unexpected Michigan precinct source');
 const group=new Map(),seen=new Set();
 for(const p of payload.precincts){
  const f=counties.find(x=>x.name.toLowerCase()===String(p.county).toLowerCase());if(!f||typeof p.precinct!=='string'||!p.precinct.trim())throw Error('Unknown reporting unit');
  let clean=safeRow({...p,fips:f.id},'Partial verified precincts',north.has(f.name)?closingCT:closingET),key=f.id+'-'+p.precinct.trim().toLowerCase();
  if(seen.has(key))throw Error('Duplicate precinct');seen.add(key);
  const v=group.get(f.id)||{...clean,dem:0,rep:0,other:0,units:0};
  v.dem+=clean.dem;v.rep+=clean.rep;v.other+=clean.other;v.units++;if(v.asOf<clean.asOf)v.asOf=clean.asOf;group.set(f.id,v);
 }return group;
}
function redraw(){
 const all=[...rows.values()];
 $('nightCountyCount').textContent=all.length+' / '+counties.length+' counties';
 $('nightCountyDem').textContent=all.length?fmt(all.reduce((t,x)=>t+x.dem,0)):'—';
 $('nightCountyRep').textContent=all.length?fmt(all.reduce((t,x)=>t+x.rep,0)):'—';
 $('nightCountySource').textContent=all.length?'County returns are unofficial · sourced at county level':'No verified 2026 '+office.toLowerCase()+' county votes available';
 $('nightCountyMapStatus').textContent=counties.length+' county outlines · '+all.length+' reporting';
 $('countyNightMap').querySelectorAll('path').forEach(p=>{
  const x=rows.get(p.dataset.fips),kind=x?(x.dem>x.rep?'d':x.dem<x.rep?'r':'t'):'n';p.setAttribute('data-night-result',kind);
  const title=p.querySelector('title');if(title)title.textContent=p.dataset.name+(x?' · D '+fmt(x.dem)+' / R '+fmt(x.rep):' · awaiting reported votes');
 });
 const query=$('nightCountySearch').value.trim().toLowerCase();
 const sorted=counties.slice().filter(x=>x.name.toLowerCase().includes(query)).sort((a,b)=>Number(rows.has(b.id))-Number(rows.has(a.id))||a.name.localeCompare(b.name));
 $('nightCountyRows').innerHTML=sorted.map(x=>{
  const v=rows.get(x.id),expect=editorialRows.find(y=>y.id===x.id),expected=expect?.[office.toLowerCase()];
  const link=validURL(v?.url)?v.url:(code==='MI'?sourceMap[x.name]||'https://www.michigan.gov/sos/elections/election-results-and-data/candidate-listings-and-election-results-by-county':src);
  return '<tr><td><button data-county="'+esc(x.id)+'">'+esc(x.name)+'</button></td><td>'+esc(margin(Number.isFinite(expected)?expected:null))+'</td><td>'+(v?fmt(v.dem)+' / '+fmt(v.rep):'—')+'</td><td><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+(v?'Report':'Clerk')+'</a></td></tr>';
 }).join('')||'<tr><td colspan="4">No matching county</td></tr>';
}
function inspector(fips){
 const c=counties.find(x=>x.id===fips);if(!c)return;
 const e=editorialRows.find(x=>x.id===fips),v=rows.get(fips),url=v?.url||(code==='MI'?sourceMap[c.name]:src);
 $('nightCountyInspector').innerHTML='<strong>'+esc(c.name)+' County</strong><p>'+(v?'<strong>Counted:</strong> D '+fmt(v.dem)+' · R '+fmt(v.rep)+' · Other '+fmt(v.other)+'<br><strong>Report:</strong> '+esc(v.source)+' · '+esc(v.asOf):'No verified 2026 '+esc(office)+' county report received')+'</p><p>2024 presidential reference: '+esc(margin(e?.m24))+' · conditional 2026 '+esc(office)+' margin: '+esc(margin(e?.[office.toLowerCase()]))+'</p><a href="'+esc(validURL(url)?url:src)+'" target="_blank" rel="noopener noreferrer">Original clerk source</a>';
}
async function paintMap(){
 try{
  const g=await window.ERVIN_GEO.get(code,'counties');
  window.ERVIN_GEO.draw($('countyNightMap'),g,{kind:'counties',className:'night-county',onSelect:(el,feature)=>inspector(String(feature.id).padStart(5,'0'))});
  counties=(g.features||[]).map(f=>({id:String(f.id).padStart(5,'0'),name:String(f.properties?.name||'County '+f.id)}));
  redraw();
 }catch(err){$('nightCountyMapStatus').textContent='County map unavailable: '+err.message;console.error(err)}
}
async function loadMichigan(sourceId){
 if(Date.now()<closingET||office!=='Senate'){rows.clear();redraw();return}
 const paths=['../michigan/election-night/results.json','../michigan/election-night/county_auto.json','../michigan/election-night/county_totals.json'];
 const got=await Promise.allSettled(paths.map(fetchJSON));
 if(sourceId!==requestId)return;
 let merged=new Map(),accepted=0,rejected=0;
 for(let i=0;i<3;i++){
  if(got[i].status!=='fulfilled'){rejected++;continue}
  try{const x=i===0?readPrecinct(got[i].value):readCounty(got[i].value,i===1?'Automated county clerk':'County clerk');for(const [id,val] of x)merged.set(id,val);accepted++}catch(err){rejected++;console.warn('Reject Michigan source',paths[i],err)}
 }
 // Manual county-wide and automatic reports supersede precinct partials (not sums).
 rows=merged;$('nightCountyFeedStatus').textContent=accepted+' of 3 Michigan source files validated · '+merged.size+' counties reporting · '+rejected+' sources unavailable or rejected';
 redraw();
}
async function loadNationalCounty(sourceId){
 if(Date.now()<lateClosingUTC){rows.clear();$('nightCountyFeedStatus').textContent='County results withheld until after poll-closing validation. No 2026 votes have been published to this verified feed.';redraw();return}
 try{
  const db=await fetchJSON('../election-night/county-returns.json');
  if(sourceId!==requestId)return;
  if(db.version!==1||db.election!==election)throw Error('Unexpected election feed version');
  const rr=db.states?.[code]?.races?.[office];
  const next=new Map();
  if(rr?.counties){
   if(!Array.isArray(rr.counties)||rr.counties.length>counties.length)throw Error('Invalid county feed length');
   for(const row of rr.counties){
    const v=safeRow(row,'Attributed county result',lateClosingUTC);
    if(next.has(v.id))throw Error('Duplicate county');next.set(v.id,v);
   }
  }
  rows=next;
  $('nightCountyFeedStatus').textContent=rr?.counties?.length?next.size+' validated county records · source timestamps retained':'No 2026 '+code+' '+office+' county reporting adapter connected yet. County outlines and forecasts remain accessible.';
 }catch(e){$('nightCountyFeedStatus').textContent='County feed unavailable or failed validation: '+e.message}
 redraw();
}
async function refresh(){
 if(!counties.length)return;
 const current=++requestId;
 $('nightCountyFeedStatus').textContent='Checking attributed county reports…';
 if(code==='MI'&&office==='Senate')await loadMichigan(current);else await loadNationalCounty(current);
}
function setCode(next){
 code=/^[A-Z]{2}$/.test(next)?next:'MI';rows.clear();editorialRows=[];counties=[];
 $('nightCountySearch').value='';
 $('nightCountyOffice').value='Senate';office='Senate';
 $('nightCountyHeading').textContent='County-by-county election night · '+code;
 $('nightCountyInspector').textContent='Select a county to see source information and any counted votes.';
 paintMap().then(refresh);
}
$('nightCountyOffice').addEventListener('change',e=>{office=e.target.value;rows.clear();redraw();refresh()});
$('nightCountySearch').addEventListener('input',redraw);
$('nightCountyRows').addEventListener('click',e=>{const button=e.target.closest('button[data-county]');if(button)inspector(button.dataset.county)});
$('nightCountyReload').addEventListener('click',refresh);
window.addEventListener('ervin:state-edition',e=>setCode(e.detail.code));
window.addEventListener('ervin:county-context',e=>{if(e.detail.code===code){editorialRows=e.detail.rows||[];redraw()}});
setCode(code);
setInterval(()=>{if(!document.hidden)refresh()},30000);
})();