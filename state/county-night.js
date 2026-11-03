/* One county atlas per state: this adapter supplies verified 2026 vote
 * records and source audits to the SAME countyMap used for forecasts.
 * No second election-night map; never synthesizes local totals from CivicAPI. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=window.ERVIN_COUNTY_CORE;
const election='2026-11-03',closeEastern=Date.parse('2026-11-03T20:00:00-05:00'),closeCentral=Date.parse('2026-11-03T21:00:00-05:00');
const CT=new Set(['Dickinson','Gogebic','Iron','Menominee']);
const fmt=n=>Number(n).toLocaleString('en-US'),marg=n=>!Number.isFinite(n)?'—':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
const url=x=>{try{let u=new URL(x);return u.protocol==='https:'?u.href:null}catch{return null}};
let code=(new URLSearchParams(location.search).get('state')||'MI').toUpperCase(),office='Senate',counties=[],forecast=[],rows=new Map(),registry=null,health=null,req=0,status='Checking election sources…';
const memory=new Map();
const fetchJSON=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json()};
function officialURL(c){
 const x=registry?.states?.[code];
 const direct=Object.entries(x?.countyLinks||{}).find(([n])=>core.normalize(n)===core.normalize(c.name))?.[1];
 return direct||x?.authority||registry?.nationalElectionAuthorities||'https://www.nass.org/can-I-vote/state-election-officials';
}
function sanitize(row,kind){
 const fips=String(row?.fips||'').padStart(5,'0'),name=String(row?.county||'').trim();
 const county=counties.find(c=>c.id===fips||core.normalize(c.name)===core.normalize(name));
 const ts=Date.parse(row?.asOf||''),minimum=CT.has(county?.name)?closeCentral:closeEastern;
 if(!county||!Number.isFinite(ts)||ts<minimum||ts>Date.now()+300000)throw Error('County identity or result timestamp invalid');
 if(![row.dem,row.rep,row.other].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=16000000)||row.dem+row.rep+row.other===0)throw Error('Invalid vote totals');
 if(!core.sourceAllowed('MI',county.name,row.sourceUrl,registry))throw Error('Source not independently linked by Michigan election authority');
 return{id:county.id,fips:county.id,name:county.name,dem:row.dem,rep:row.rep,other:row.other,asOf:row.asOf,url:row.sourceUrl,source:kind,status:'unofficial'};
}
function readPrecinct(data){
 if(data?.version!==1||data.election!==election||data.office!=='US Senate'||!Array.isArray(data.precincts)||data.precincts.length>16000)throw Error('Invalid precinct file');
 const found=new Set(),result=new Map();
 for(const p of data.precincts){
  if(typeof p.precinct!=='string'||!p.precinct.trim())throw Error('Invalid precinct name');
  const c=sanitize(p,'Partial verified precinct reports'),key=c.id+'-'+p.precinct.trim().toLowerCase();
  if(found.has(key))throw Error('Duplicate precinct');found.add(key);
  let old=result.get(c.id);
  if(!old){old={...c,dem:0,rep:0,other:0,units:0};result.set(c.id,old);}
  old.dem+=c.dem;old.rep+=c.rep;old.other+=c.other;old.units++;
  if(c.asOf>old.asOf){old.asOf=c.asOf;old.url=c.url}
 }
 return result;
}
function countySource(data,kind){
 if(data?.version!==1||data.election!==election||data.office!=='US Senate'||!Array.isArray(data.counties)||data.counties.length>83)throw Error('Invalid Michigan county file');
 const found=new Map();for(const row of data.counties){
  const c=sanitize(row,kind);if(found.has(c.id))throw Error('Duplicate county');found.set(c.id,c);
 }return found;
}
function notify(){
 memory.set(code+'-'+office,new Map(rows));
 window.dispatchEvent(new CustomEvent('ervin:county-results-update',{detail:{code,office,reported:rows.size}}));
}
function statusLabel(){
 const n=counties.length,official=health?.states?.[code]||null,direct=official?.linkedCountySources||0;
 const last=health?.checkedAt?new Date(health.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'not yet probed';
 const e=$('countySourceAudit');if(e)e.innerHTML='<strong>Independent source audit:</strong> '+n+' county geographies · '+direct+' county-specific authority links · '+rows.size+' validated 2026 county vote records. Connectivity checked '+esc(last)+'. Website availability alone does not confirm a machine-readable election feed. <a href="'+esc(official?.stateAuthority||registry?.nationalElectionAuthorities||'#')+'" target="_blank" rel="noopener noreferrer">Official election authority</a>';
}
function redraw(){
 if(!counties.length)return;
 $('nightCountyCount').textContent=rows.size+' / '+counties.length;
 $('nightCountyDem').textContent=rows.size?fmt([...rows.values()].reduce((t,r)=>t+r.dem,0)):'—';
 $('nightCountyRep').textContent=rows.size?fmt([...rows.values()].reduce((t,r)=>t+r.rep,0)):'—';
 $('nightCountySource').textContent=rows.size?'Unofficial '+office+' returns from '+rows.size+' independently attributed counties':'No verified '+office+' county vote totals in this feed';
 $('nightCountyMapStatus').textContent=counties.length+' counties · '+rows.size+' reporting';
 $('nightCountyFeedStatus').textContent=status;
 const term=$('nightCountySearch').value.toLowerCase().trim(),prefer=office.toLowerCase();
 const sorted=counties.filter(c=>c.name.toLowerCase().includes(term)).sort((a,b)=>Number(rows.has(b.id))-Number(rows.has(a.id))||a.name.localeCompare(b.name));
 $('nightCountyRows').innerHTML=sorted.map(c=>{
  const v=rows.get(c.id),f=forecast.find(z=>z.id===c.id),link=url(v?.url)||officialURL(c);
  return '<tr><td><button type="button" data-county="'+c.id+'">'+esc(c.name)+'</button></td><td>'+esc(marg(f?.[prefer]))+'</td><td>'+(v?fmt(v.dem)+' / '+fmt(v.rep):'Unreported')+'</td><td><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+(v?'Reported source':(registry?.states?.[code]?.countyLinks&&Object.keys(registry.states[code].countyLinks).length?'Authority page':'Find authority'))+'</a></td></tr>';
 }).join('')||'<tr><td colspan="4">No matching counties</td></tr>';
 statusLabel();
 notify();
}
function inspect(fips){
 const c=counties.find(x=>x.id===fips);if(!c)return;
 const f=forecast.find(x=>x.id===fips)||{},v=rows.get(fips);
 const link=url(v?.url)||officialURL(c);
 const text='<strong>'+esc(c.name)+' County · '+office+'</strong><p>'+(v?'<strong>UNOFFICIAL COUNTED VOTES:</strong> D '+fmt(v.dem)+' / R '+fmt(v.rep)+' / Other '+fmt(v.other)+' · '+esc(v.asOf):'<strong>No validated vote counts.</strong> Missing results are neither a tie nor zero votes.')+'</p><p>Pre-election conditional '+office+' forecast: '+esc(marg(f[office.toLowerCase()]))+' · 2024 presidential reference: '+esc(marg(f.m24))+'</p><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Original election authority</a>';
 $('nightCountyInspector').innerHTML=text;
 return text;
}
async function setCounties(generation){
 try{
  const g=await window.ERVIN_GEO.get(code,'counties');
  if(req!==generation)return;
  counties=(g.features||[]).map(f=>({id:String(f.id).padStart(5,'0'),name:String(f.properties?.name||'')}));
  status='Geography loaded. County vote records will be shown only after a validated official source publishes them.';
  redraw();await refresh();
 }catch(e){status='County geographic source unavailable: '+e.message;$('nightCountyFeedStatus').textContent=status}
}
async function loadMichigan(generation){
 const paths=['../michigan/election-night/results.json','../michigan/election-night/county_auto.json','../michigan/election-night/county_totals.json'];
 const got=await Promise.allSettled(paths.map(fetchJSON));if(req!==generation)return;
 const next=new Map();let ok=0,rejected=0;
 for(let i=0;i<got.length;i++){
  if(got[i].status!=='fulfilled'){rejected++;continue}
  try{const file=i===0?readPrecinct(got[i].value):countySource(got[i].value,i===1?'Automated county clerk':'County clerk');
   for(const [id,val] of file)next.set(id,val);ok++;
  }catch(e){rejected++;console.warn('County file rejected',paths[i],e)}
 }
 // Strongest source last: county clerk count supersedes automated portal,
 // which supersedes partial precincts. NEVER sum overlapping reports.
 rows=next;
 status=ok+' of 3 official-source input files structurally accepted · '+rows.size+' counties reporting · '+rejected+' unavailable/rejected. A valid empty file is not a verified live result.';
 redraw();
}
async function loadOther(generation){
 try{
  const data=await fetchJSON('../election-night/county-returns.json');if(generation!==req)return;
  const result=core.parse(data,code,office,counties.map(c=>({id:c.id,properties:{name:c.name}})),registry,rows);
  if(!result.available)status='No separately attributed '+office+' county return file for '+code+'. '+(health?.states?.[code]?.linkedCountySources||0)+' authority-listed county sites; no totals inferred.';
  else{rows=result.rows;status=result.checked+' rows checked, '+result.rows.size+' valid county returns, '+result.rejected.length+' rejected. '+(result.rejected.length?'Some reporting was not accepted as authoritative.':'')}
 }catch(e){status='County results unavailable or rejected: '+e.message+' · earlier validated counts retained';}
 redraw();
}
async function refresh(){
 if(!counties.length||!registry)return;
 const gen=++req;
 const t=core.close(code,office);
 if(Date.now()<t){
  rows=new Map();status='Polls have not closed for this contest. No reported 2026 county votes are displayed.';redraw();return;
 }
 $('nightCountyFeedStatus').textContent='Checking independent county result sources…';
 if(code==='MI'&&office==='Senate')await loadMichigan(gen);else await loadOther(gen);
}
async function setCode(next){
 code=/^[A-Z]{2}$/.test(next)?next:'MI';req++;counties=[];rows=new Map();forecast=[];
 $('nightCountySearch').value='';
 // Match the default layer used by the state forecast.
 office=$('countyLayer')?.value==='governor'?'Governor':'Senate';
 $('nightCountyOffice').value=office;
 $('nightCountyHeading').textContent='County result comparison · '+code;
 $('nightCountyInspector').textContent='Select a county to inspect the forecast and independently reported votes.';
 await setCounties(req);
}
window.ERVIN_COUNTY_DATA={
 get:(c,o)=>c===code&&o===office?new Map(rows):new Map(memory.get(c+'-'+o)||[]),
 source:(fips)=>officialURL(counties.find(c=>c.id===fips)||{name:''}),
 inspect,refresh,
 getStatus:()=>({code,office,counties:counties.length,reported:rows.size,checkedAt:health?.checkedAt||null})
};
$('nightCountyOffice').addEventListener('change',()=>{office=$('nightCountyOffice').value;rows=new Map(memory.get(code+'-'+office)||[]);const layer=$('countyLayer');if(layer&&['senate','governor'].includes(layer.value)){layer.value=office.toLowerCase();layer.dispatchEvent(new Event('change',{bubbles:true}));}redraw();refresh()});
$('nightCountyReload').addEventListener('click',refresh);
$('nightCountySearch').addEventListener('input',redraw);
$('nightCountyRows').addEventListener('click',e=>{const b=e.target.closest('button[data-county]');if(b){inspect(b.dataset.county);const input=$('countySearch');if(input){input.value=counties.find(c=>c.id===b.dataset.county)?.name||'';input.dispatchEvent(new Event('input',{bubbles:true}))}}});
$('countyMap').addEventListener('click',e=>{const p=e.target.closest('path.county');if(p)inspect(String(p.dataset.fips||''))});
window.addEventListener('ervin:state-edition',e=>setCode(e.detail.code));
window.addEventListener('ervin:county-context',e=>{if(e.detail.code===code){forecast=e.detail.rows||[];redraw()}});
Promise.all([fetchJSON('../election-night/county-sources.json'),fetchJSON('../election-night/county-source-health.json').catch(()=>null)]).then(([a,b])=>{registry=a;health=b;setCode(code)}).catch(e=>{$('nightCountyFeedStatus').textContent='Independent county source registry could not load: '+e.message});
setInterval(()=>{if(!document.hidden&&counties.length)refresh()},30000);
})();