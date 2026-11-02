/* 2026 district explorer additions — separate pre-election forecasts from counted votes. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=window.ERVIN_US_GEOGRAPHY?.states||[];
const KEY=()=>new URLSearchParams(location.search).get('state')?.toUpperCase()||'MI';
const CLOSE=Date.parse('2026-11-03T20:00:00-05:00');
let registry=[],forecast={},mode='forecast',live={},asOf='',provider='',snapshotChecked=false,lastCheck=0,renderToken=0;
const raceId=r=>r?.id||'';
const normalize=(value)=>{const r=String(value||'').toUpperCase().match(/^([A-Z]{2})[- ]?(\d{1,2})$/);return r?r[1]+'-'+r[2].padStart(2,'0'):''};
const number=v=>Number(v).toLocaleString('en-US');
const safeHTTPS=url=>/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(String(url||''))?String(url):'';
const party=c=>{const raw=String(c?.party||c?.p||'').toUpperCase();return raw==='D'||raw==='DEM'||raw==='DEMOCRATIC'?'D':raw==='R'||raw==='REP'||raw==='REPUBLICAN'?'R':''};
const partyName=p=>p==='D'?'Democrat':p==='R'?'Republican':'Party unverified';
const goodVote=v=>Number.isSafeInteger(v)&&v>=0&&v<30000000;
const today=()=>Date.now();
function record(r){return live[raceId(r)]||null}
function validateCandidates(rows,total){if(!Array.isArray(rows)||!rows.length||rows.length>15||!goodVote(total)||total<1)return null;const c=rows.map(x=>({name:String(x?.name||x?.n||'').trim(),party:party(x),votes:x?.votes??x?.v,photo:safeHTTPS(x?.photo||'')}));if(c.some(x=>!x.name||x.name.length>140||!goodVote(x.votes)))return null;if(Math.abs(c.reduce((n,x)=>n+x.votes,0)-total)>Math.max(10,total*.005))return null;return c}
function marginD(r){const m=forecast?.[r.id]?.marginD;return Number.isFinite(m)?m:null}
function fmtMargin(m){return !Number.isFinite(m)?'Not estimated':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1)}
function modelTone(r){const m=marginD(r);if(m!==null)return Math.abs(m)<=1.5?'#b9a783':m>0?'#579ac5':'#be7180';const rating=String(r.rating||'').toLowerCase();return rating.includes('toss')?'#b9a783':/\b(?:tilt|lean|likely|solid) d\b/.test(rating)?'#579ac5':/\b(?:tilt|lean|likely|solid) r\b/.test(rating)?'#be7180':'#b5c0c7'}
function resultTone(r){const x=record(r);if(!x)return '#c9ced5';const dem=x.candidates.filter(c=>c.party==='D').reduce((n,c)=>n+c.votes,0),rep=x.candidates.filter(c=>c.party==='R').reduce((n,c)=>n+c.votes,0);return !dem&&!rep?'#c9ced5':dem>rep?'#4a88cf':rep>dem?'#c45058':'#b1a085'}
function selected(){const code=KEY(),district=String($('districtSelect')?.value||'').padStart(2,'0');return registry.find(x=>x.code===code&&String(x.district).padStart(2,'0')===district)||registry.find(x=>x.code===code)||null}
function portrait(c){const initials=c.name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase(),src=safeHTTPS(c.photo);return src?'<img loading="lazy" alt="" src="'+escapeHTML(src)+'">':'<span aria-hidden="true">'+escapeHTML(initials)+'</span>'}
function candidateCard(c,caption){const p=c.party,cls=p==='D'?'dem':p==='R'?'rep':'other';
 return '<div class="dx-candidate '+cls+'"><div class="dx-avatar">'+portrait(c)+'</div><div><strong>'+escapeHTML(c.name)+'</strong><small>'+escapeHTML(partyName(p))+' · '+escapeHTML(caption)+'</small></div>'+(Number.isFinite(c.votes)?'<b>'+number(c.votes)+'</b>':'')+'</div>';
}
function inspector(){
 const box=$('districtEnhancement');if(!box)return;const r=selected();if(!r){box.innerHTML='<p class="ed-mini">Choose a House district above.</p>';return}
 const x=record(r),paint=mode==='results',current=paint&&x,model=forecast?.[r.id];
 let html='<div class="dx-heading"><div><div class="ed-kicker">'+escapeHTML(r.id)+' / CONGRESSIONAL DISTRICT</div><h3>'+(paint?'Election returns':'District outlook')+'</h3></div><span class="dx-stamp '+(current?'reported':'')+'">'+(paint?(current?'UNOFFICIAL RETURNS':'AWAITING RESULTS'):'FORECAST · NOT VOTES')+'</span></div>';
 if(current){
  html+='<div class="dx-candidate-list">'+current.candidates.slice().sort((a,b)=>b.votes-a.votes).map(c=>candidateCard(c,'counted votes')).join('')+'</div>';
  html+='<p class="dx-caption">'+number(current.total)+' votes reported · '+(Number.isFinite(current.pct)?current.pct.toFixed(1)+'% precincts reporting · ':'')+'Source: '+escapeHTML(current.provider)+' · '+escapeHTML(current.asOf||asOf)+'. These are partial unofficial returns, not a projected final margin.</p>';
 }else if(paint){
  html+='<p class="dx-empty">No attributed 2026 votes for '+escapeHTML(r.id)+' in the connected result feeds. Districts without counts remain gray; this is not a zero-vote report.</p>';
 }else{
  html+='<div class="dx-forecast-number">'+escapeHTML(fmtMargin(marginD(r)))+'</div><p class="dx-caption">'+escapeHTML(model?.modelRating||r.rating||'No verified rating')+' · Original Ervin House scenario. A forecast is not a vote count or a race call.</p>';
  html+='<div class="dx-candidate-list">'+candidateCard({name:r.incumbent||'Incumbent not verified',party:'',votes:null},'historical incumbent; not confirmed 2026 nominee')+'</div>';
  html+='<p class="dx-caption">Candidate portraits and 2026 party affiliations appear only when supported by an attributed roster or results feed. Historical incumbency does not establish the 2026 candidate slate.</p>';
 }
 html+='<div class="dx-links"><a href="../elections/?office=house&state='+encodeURIComponent(r.code)+'&district='+encodeURIComponent(r.district)+'#resultSection">Full results and sources</a><a href="https://civicapi.org/results" target="_blank" rel="noopener noreferrer">CivicAPI election coverage</a></div>';
 box.innerHTML=html;
}
function updatePaint(){
 const paths=$('districtMap')?.querySelectorAll('path.geo-district')||[];
 for(const el of paths){const id=String(el.dataset.district||'').padStart(2,'0'),r=registry.find(x=>x.code===KEY()&&String(x.district).padStart(2,'0')===id);if(!r)continue;
  el.style.fill=mode==='results'?resultTone(r):modelTone(r);
  const hint=mode==='results'?(record(r)?'unofficial reported returns':'awaiting results'):'pre-election forecast';
  const label=r.id+' · '+hint+' · click to select';
  el.setAttribute('aria-label',label);const title=el.querySelector('title');if(title)title.textContent=label;
 }
 const status=$('districtModeInfo');if(status)status.textContent=mode==='results'?'2026 reported votes only; gray means no verified count.': 'Original Ervin pre-election district margins; colors are projections.';
 for(const b of document.querySelectorAll('[data-dx-mode]')){b.setAttribute('aria-pressed',String(b.dataset.dxMode===mode));b.classList.toggle('selected',b.dataset.dxMode===mode)}
 inspector();
}
function normalizedOpenAmerica(data){
 if(data?.api!==1||data.year!==2026||data.office!=='House'||!data.races||typeof data.races!=='object')return {};
 const t=Date.parse(data.as_of||'');if(!Number.isFinite(t)||t<CLOSE||t>today()+300000)return {};
 const output={};
 for(const [key,v] of Object.entries(data.races)){const id=normalize(key),r=registry.find(x=>x.id===id);if(!r)continue;
  const c=validateCandidates(v.cands,v.total);if(!c)continue;output[id]={candidates:c,total:v.total,pct:Number.isFinite(v.pct_in)&&v.pct_in>=0&&v.pct_in<=100?v.pct_in:null,provider:'Open America / state office',asOf:data.as_of};
 }
 return output;
}
function normalizedCivic(data){
 if(data?.version!==1||data.election!=='2026-11-03'||typeof data.races!=='object')return {};
 const output={};for(const [key,x] of Object.entries(data.races||{})){
  const id=normalize(key);if(!registry.some(r=>r.id===id)||x?.verified!==true||x?.source!=='civicAPI')continue;
  const t=Date.parse(x.asOf||'');if(!Number.isFinite(t)||t<CLOSE||t>today()+300000)continue;
  const c=validateCandidates(x.candidates,x.total);if(!c)continue;
  output[id]={candidates:c,total:x.total,pct:Number.isFinite(x.precinctsReporting)?x.precinctsReporting:null,provider:'CivicAPI · independent result mirror',asOf:x.asOf};
 }
 return output;
}
async function json(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}finally{clearTimeout(timer)}}
async function checkResults(force=false){
 if(!force&&today()-lastCheck<60000)return;
 lastCheck=today();
 const core=window.ERVIN_RETURNS;
 if(!core){live={};updatePaint();return}
 const [ca,oa]=await Promise.allSettled([
  json('../civicapi/races.json'),
  json('https://openamerica.io/elections/results.json?year=2026&office=House')
 ]);
 const civic=ca.status==='fulfilled'?core.civic(ca.value):{};
 const mirror=oa.status==='fulfilled'?core.openAmerica(oa.value,'House'):{};
 const chosen=core.preferCivic(civic,mirror).races;
 live={};
 for(const [id,row] of Object.entries(chosen)){
  if(row.office!=='House'||!registry.some(x=>x.id===id))continue;
  live[id]={candidates:row.candidates,total:row.total,pct:row.precincts,provider:row.source,asOf:row.asOf};
 }
 snapshotChecked=true;updatePaint();
}
async function boot(){
 if(!$('districtMap')||!$('districtModeControls'))return;
 try{
  const [a,b]=await Promise.all([json('../house/data.json'),json('../house/ervin-forecast-2026-11-02.json').catch(()=>({}))]);
  registry=a.seats||[];forecast=b.races||{};
 }catch(e){console.warn('District display supplements unavailable',e);return}
 document.querySelectorAll('[data-dx-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.dxMode;updatePaint();if(mode==='results')checkResults(true)}));
 $('districtSelect').addEventListener('change',()=>setTimeout(updatePaint,0));
 $('districtMap').addEventListener('click',()=>setTimeout(updatePaint,0));
 $('districtMap').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')setTimeout(updatePaint,0)});
 new MutationObserver(()=>setTimeout(updatePaint,0)).observe($('districtMap'),{childList:true});
 window.addEventListener('ervin:state-edition',()=>{live={};lastCheck=0;setTimeout(()=>{updatePaint();checkResults(true)},300)});
 updatePaint();checkResults(true);
 setInterval(()=>{if(!document.hidden&&mode==='results')checkResults(false)},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();