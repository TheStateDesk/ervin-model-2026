/* Ervin House: 435 individual provisional model ratings with explicit source provenance. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let seats=[],scenario=null,cookNational=null,houseRoster={races:{}};
let liveRows={};
window.addEventListener('ervin:office-results',e=>{if(e.detail?.office==='House'){liveRows=e.detail.races||{};if(seats.length)draw()}});
window.addEventListener('ervin:nbc-calls-update',()=>{if(seats.length)draw()});
const href=r=>'../state/?state='+encodeURIComponent(r.code)+'#house-'+encodeURIComponent(r.district);
const pick=r=>scenario?.races?.[r.id]||null;
const margin=m=>!Number.isFinite(m)?'No estimate':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1);
const candidateText=r=>{const people=houseRoster.races?.[r.id]?.candidates||[];return people.length?people.map(c=>c.party+': '+c.name).join(' · '):'2026 roster not confirmed';};
const rank=r=>{const x=pick(r);return x&&Number.isFinite(x.marginD)?Math.abs(x.marginD):100};
function draw(){
 const q=$('houseSearch').value.trim().toLowerCase(),code=$('houseState').value,cat=$('houseRating').value;
 // Respect existing advanced categories, now filtering the visible model grade.
 let arr=seats.filter(r=>{
  const model=pick(r),rating=model?.modelRating||r.rating||'';
  const inState=code==='all'||r.code===code,match=!q||[r.id,r.state,r.incumbent,model?.modelRating,candidateText(r)].join(' ').toLowerCase().includes(q);
  const type=cat==='all'||(cat==='rated'&&!!r.rating)||(cat==='Tossup'&&/tossup/i.test(rating))||(cat==='Lean'&&/^(?:Lean|Tilt)/.test(rating))||(cat==='Likely'&&rating.startsWith('Likely'));
  return inState&&match&&type;
 });
 if($('houseSort').value==='competitive')arr.sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));else arr.sort((a,b)=>a.id.localeCompare(b.id));
 $('houseCards').innerHTML=arr.map(r=>{
  const x=pick(r),live=liveRows[r.id];
  const url=live?'../election-night/?state='+encodeURIComponent(r.code)+'&race='+encodeURIComponent(r.id)+'#nationalBoard':href(r);
  const top=live?.candidates?.slice().sort((a,b)=>b.votes-a.votes).slice(0,2)||[];
  const call=window.ERVIN_NBC_CALLS?.get(r.id);
  const nbcHTML=call?'<div class="gov-lead"><strong>NBC NEWS PROJECTS '+esc(call.winner)+' ('+esc(call.party)+')</strong> · <a href="'+esc(call.sourceUrl)+'" target="_blank" rel="noopener noreferrer">NBC source</a></div>':'';
  const reported=live?'<div class="gov-lead"><small>UNOFFICIAL VOTES REPORTED</small><br>'+esc(top.map(c=>c.name+' '+c.votes.toLocaleString()).join(' · '))+'<small> · '+live.total.toLocaleString()+' votes · '+esc(live.source)+'</small></div>':'';
  return '<a class="gov-card" href="'+url+'"><div class="gov-heading"><h3 class="house-card-title">'+esc(r.id)+'</h3><span class="race-flag">'+esc(r.code)+'</span></div>'+
  '<p class="gov-candidates">'+esc(r.state)+'<br><strong>2026 candidates:</strong> '+esc(candidateText(r))+'</p>'+
  '<div class="gov-lead">'+esc(x?.modelRating||r.rating||'No model loaded')+(x&&Number.isFinite(x.marginD)?' · '+esc(margin(x.marginD)):'')+' ↗</div>'+
  nbcHTML+reported+'<small>'+(x?(x.changed2026Map?'2026 Census map · reconstructed presidential vote allocation':'Ervin House model')+' · '+esc(x.confidence)+' · '+esc(x.publishedSurveyCount)+' indexed public polls':'Model not available')+(r.rating?' · Cook: '+esc(r.rating):'')+'</small></a>';
 }).join('')||'<p class="race-muted">No districts match your filters.</p>';
 $('houseCount').textContent=arr.length+' districts';
}
function outlook(){
 if(!$('houseModelSummary'))return;
 if(!scenario){$('houseModelSummary').innerHTML='<p class="race-muted">House-wide model file unavailable. The published Cook rating archive and geographic race links remain accessible.</p>';return}
 const summary=scenario.summary;const all=Object.values(scenario.races);
 const d=all.filter(r=>r.modelRating?.endsWith(' D')).length,rep=all.filter(r=>r.modelRating?.endsWith(' R')).length,
  toss=all.filter(r=>r.modelRating==='Tossup').length,unrated=all.filter(r=>r.modelRating==='Unrated').length;
 const changing=summary.changedMapDistricts;
 $('houseModelSummary').innerHTML='<div class="race-kicker">ERVIN HOUSE · ELECTION-DAY EDITION</div><h2 style="margin:5px 0">House ratings and district evidence</h2>'+
  '<div class="house-model-metrics"><div><strong>'+summary.modeledCount+' / 435</strong><small>Numerical House scenarios</small></div><div><strong>'+d+'</strong><small>Democratic-rated</small></div><div><strong>'+rep+'</strong><small>Republican-rated</small></div><div><strong>'+toss+'</strong><small>Toss-up</small></div><div><strong>'+summary.qualitativeOnly+'</strong><small>Special ballot formats</small></div></div>'+
  '<p class="race-muted">All 173 redrawn districts now use <strong>actual 2026 U.S. Census congressional boundaries</strong>, with historical presidential voting allocated onto the new districts. Those vote allocations are <b>reconstructed estimates, not certified district totals</b>, and carry an extra uncertainty allowance. The 2022 and 2024 same-number House results are no longer used as though they came from the same voters. <b>'+summary.districtsWithPollRows+' districts</b> have published survey rows; '+summary.indexedPublishedSurveys+' polls are indexed by the directory (not all reproduced individually).</p>'+
  '<p class="race-muted"><strong>House-only historical model:</strong> 2018 and 2022 are development elections; a separate 2024 holdout of <b>'+esc(scenario.method.holdout2024?.n||'—')+' comparable contests</b> produced '+esc(scenario.method.holdout2024?.MAE?.toFixed(2)||'—')+'-point mean absolute D−R margin error for the base model. The historically tested returning-candidate correction is used only where the same candidate and comparable previous House district can be matched. The national generic ballot is D +'+esc(scenario.method.genericBallot.demMargin.toFixed(2))+' (source edition '+esc(scenario.method.genericBallot.asOf||'unknown')+'). <a href="../research/house-presidential-backtest-2026.json">Full chronological backtest and limitations</a>.</p>'+
  (cookNational?'<p class="race-muted"><strong>Independent Cook Political Report · '+esc(cookNational.asOf)+':</strong> '+(cookNational.solidD+cookNational.likelyD+cookNational.leanD)+' seats rated Democratic, '+(cookNational.solidR+cookNational.likelyR+cookNational.leanR)+' seats rated Republican, '+cookNational.tossup+' toss-ups nationwide. This is Cook’s separately published all-435 rating set, not the Ervin numerical count. <a href="'+esc(cookNational.source)+'" target="_blank" rel="noopener noreferrer">Cook source</a>.</p>':'')+
  '<p class="race-muted">These are pre-election forecast scenarios, <b>not calibrated win probabilities or counted votes</b>. Alaska ranked-choice and California’s non-comparable candidate ballot remain qualitative, not forced into a D−R margin. <a href="../house/presidential-2026-boundaries.json">2026 district presidential baselines</a> · <a href="https://peoplespoll.com/house" target="_blank" rel="noopener noreferrer">Public poll directory</a> · <a href="../state/?state=MI">State district atlas</a></p>';

}
function map(){
 const geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 const sums={};for(const r of seats){const x=pick(r);if(!x)continue;const s=sums[r.code]||{d:0,rep:0,toss:0,u:0};
 if(x.modelRating?.endsWith(' D'))s.d++;else if(x.modelRating?.endsWith(' R'))s.rep++;
 else if(x.modelRating==='Tossup')s.toss++;else s.u++;sums[r.code]=s}
 $('houseMapSvg').innerHTML=geo.map(g=>{
  const s=sums[g.code]||{d:0,rep:0,toss:0};const flavor=s.d>s.rep?'model-d':s.rep>s.d?'model-r':'model-mix';
  return '<g><path role="button" tabindex="0" data-code="'+g.code+'" class="gov-state election '+flavor+'" d="'+g.d+'" aria-label="Filter '+esc(g.name)+' House districts"><title>'+esc(g.name+' · Ervin scenario D '+s.d+' / R '+s.rep+' / Toss '+s.toss+' / Ballot exception '+s.u)+'</title></path></g>';
 }).join('');
 const choose=code=>{$('houseState').value=code;$('houseState').dispatchEvent(new Event('change'));$('districtExplorer').scrollIntoView({behavior:'smooth',block:'start'});};
 $('houseMapSvg').querySelectorAll('path[data-code]').forEach(p=>{p.addEventListener('click',()=>choose(p.dataset.code));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p.dataset.code)}})});
}
async function init(){
 try{
  const a=await fetch('./data.json');if(!a.ok)throw Error('House registry unavailable');
  const raw=await a.json();seats=raw.seats||[];cookNational=raw.nationalCookSnapshot||null;
  const b=await fetch('./ervin-forecast-2026-11-02.json',{cache:'no-cache'}).catch(()=>null);scenario=b?.ok?await b.json():null;
  window.ERVIN_HOUSE_DATA=scenario;
  const roster=await fetch('./candidates-2026.json',{cache:'no-cache'}).catch(()=>null);
  if(roster?.ok){const d=await roster.json();if(d.election==='2026-11-03'&&d.version===1&&Object.keys(d.races||{}).length===435)houseRoster=d;}
  window.ERVIN_HOUSE_ROSTER=houseRoster;
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