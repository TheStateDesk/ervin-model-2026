/* Ervin House: 435 individual provisional model ratings with explicit source provenance. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let seats=[],scenario=null;
const href=r=>'../state/?state='+encodeURIComponent(r.code)+'#house-'+encodeURIComponent(r.district);
const pick=r=>scenario?.races?.[r.id]||null;
const margin=m=>!Number.isFinite(m)?'No estimate':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1);
const rank=r=>{const x=pick(r);return x?Math.abs(x.marginD):100};
function draw(){
 const q=$('houseSearch').value.trim().toLowerCase(),code=$('houseState').value,cat=$('houseRating').value;
 let arr=seats.filter(r=>(code==='all'||r.code===code)&&(!q||[r.id,r.state,r.incumbent].join(' ').toLowerCase().includes(q))&&(cat==='all'||(cat==='rated'&&r.rating)||cat==='Tossup'?(false):true));
 // Respect existing advanced categories, now filtering the visible model grade.
 arr=seats.filter(r=>{
  const model=pick(r),rating=model?.modelRating||r.rating||'';
  const inState=code==='all'||r.code===code,match=!q||[r.id,r.state,r.incumbent,model?.modelRating].join(' ').toLowerCase().includes(q);
  const type=cat==='all'||(cat==='rated'&&!!r.rating)||(cat==='Tossup'&&/tossup/i.test(rating))||(cat==='Lean'&&/^(?:Lean|Tilt)/.test(rating))||(cat==='Likely'&&rating.startsWith('Likely'));
  return inState&&match&&type;
 });
 if($('houseSort').value==='competitive')arr.sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));else arr.sort((a,b)=>a.id.localeCompare(b.id));
 $('houseCount').textContent=arr.length+' districts';
 $('houseCards').innerHTML=arr.map(r=>{
  const x=pick(r);return '<a class="gov-card" href="'+href(r)+'"><div class="gov-heading"><h3 class="house-card-title">'+esc(r.id)+'</h3><span class="race-flag">'+esc(r.code)+'</span></div>'+
  '<p class="gov-candidates">'+esc(r.state)+(r.incumbent?'<br>Historical incumbent: <strong>'+esc(r.incumbent)+'</strong>':'<br>2026 candidate slate not verified')+'</p>'+
  '<div class="gov-lead">'+esc(x?.modelRating||r.rating||'No model loaded')+(x?' · '+esc(margin(x.marginD)):'')+' ↗</div>'+
  '<small>'+(x?'Ervin House · '+esc(x.confidence)+' · '+esc(x.publishedSurveyCount)+' indexed public polls'+(x.changed2026Map?' · redrawn geography warning':''):'Model not available')+(r.rating?' · Cook: '+esc(r.rating):'')+'</small></a>';
 }).join('')||'<p class="race-muted">No districts match your filters.</p>';
}
function outlook(){
 if(!$('houseModelSummary'))return;
 if(!scenario){$('houseModelSummary').innerHTML='<p class="race-muted">House-wide model file unavailable. The published Cook rating archive and geographic race links remain accessible.</p>';return}
 const summary=scenario.summary;const all=Object.values(scenario.races);
 const d=all.filter(r=>r.marginD>1.5).length,rep=all.filter(r=>r.marginD< -1.5).length,toss=435-d-rep;
 const changing=summary.changedMapDistricts;
 $('houseModelSummary').innerHTML='<div class="race-kicker">ERVIN HOUSE · SCENARIO · NOVEMBER 2</div><h2 style="margin:5px 0">Every House district, modeled</h2>'+
  '<div class="house-model-metrics"><div><strong>435 / 435</strong><small>Districts rated</small></div><div><strong>'+d+'</strong><small>D-leaning scenarios</small></div><div><strong>'+rep+'</strong><small>R-leaning scenarios</small></div><div><strong>'+toss+'</strong><small>Within ±1.5 points</small></div></div>'+
  '<p class="race-muted">A provisional 2026 House adaptation of the Ervin model, not a calibrated seat probability. Uses 2022/2024 House voting patterns, a <b>Democratic +'+scenario.method.genericBallot.demMargin.toFixed(1)+'</b> generic-ballot input, a limited historical Ervin state correction, and district surveys where compatible. <b>'+summary.districtsWithPollRows+' districts</b> have individual poll rows indexed in this edition, with <b>'+summary.indexedPublishedSurveys+' publicly indexed surveys</b> in the source directory (not all reproduced individually). <b>'+changing+' districts</b> are in states with changed 2026 maps, where the historical comparisons are less reliable.</p>'+
  '<p class="race-muted">The margins are heuristic model outputs; the sensitivity widths are <b>not</b> calibrated confidence intervals. The 2026 House ballot, redistricted boundary and sponsorship of each underlying survey should be checked before using the estimate. <a href="https://electiondata.dev/datasets/house-results/" target="_blank" rel="noopener noreferrer">MIT House historical returns</a> · <a href="https://peoplespoll.com/house" target="_blank" rel="noopener noreferrer">Underlying poll directory</a> · <a href="../state/?state=MI" >District map and details</a></p>';
}
function map(){
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 const sums={};for(const r of seats){const x=pick(r);if(!x)continue;const s=sums[r.code]||{d:0,rep:0,toss:0};if(x.marginD>1.5)s.d++;else if(x.marginD< -1.5)s.rep++;else s.toss++;sums[r.code]=s}
 $('houseMapSvg').innerHTML=geo.map(g=>{
  const s=sums[g.code]||{d:0,rep:0,toss:0};const flavor=s.d>s.rep?'model-d':s.rep>s.d?'model-r':'model-mix';
  return '<g><path role="button" tabindex="0" data-code="'+g.code+'" class="gov-state election '+flavor+'" d="'+g.d+'" aria-label="Filter '+esc(g.name)+' House districts"><title>'+esc(g.name+' · Ervin scenario D '+s.d+' / R '+s.rep+' / Toss '+s.toss)+'</title></path></g>';
 }).join('');
 const choose=code=>{$('houseState').value=code;$('houseState').dispatchEvent(new Event('change'));$('districtExplorer').scrollIntoView({behavior:'smooth',block:'start'});};
 $('houseMapSvg').querySelectorAll('path[data-code]').forEach(p=>{p.addEventListener('click',()=>choose(p.dataset.code));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p.dataset.code)}})});
}
async function init(){
 try{
  const a=await fetch('./data.json');if(!a.ok)throw Error('House registry unavailable');
  seats=(await a.json()).seats||[];
  const b=await fetch('./ervin-forecast-2026-11-02.json',{cache:'no-cache'}).catch(()=>null);scenario=b?.ok?await b.json():null;
  window.ERVIN_HOUSE_DATA=scenario;
  $('ratingsCount').textContent=seats.filter(x=>x.rating).length;
  $('closeCount').textContent=seats.filter(x=>x.rating==='Tossup').length;
  const states=[...new Map(seats.map(x=>[x.code,x.state])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  $('houseState').innerHTML='<option value="all">Every state</option>'+states.map(([code,name])=>'<option value="'+code+'">'+esc(name)+'</option>').join('');
  const requested=new URLSearchParams(location.search).get('state');
  $('houseState').value=requested&&states.some(([code])=>code===requested.toUpperCase())?requested.toUpperCase():'MI';
  outlook();draw();map();
  document.dispatchEvent(new CustomEvent('ervin-house-forecast-loaded',{detail:{available:!!scenario}}));
 }catch(e){$('houseCards').textContent='House data could not be loaded. Reload the page.';console.error(e)}
 ['houseSearch','houseState','houseRating','houseSort'].forEach(id=>$(id).addEventListener(id==='houseSearch'?'input':'change',draw));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();