(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=(n)=>Number.isFinite(n)?n.toLocaleString('en-US'):'—';
const fmt=x=>window.ERVIN_STATEWIDE.formatMargin(x);
let races=[],calibrated=null,selected='MI',sort='closest';
const color=r=>!r.model||r.model.adjustedMargin===null?'neutral':r.model.adjustedMargin>2?'d':r.model.adjustedMargin< -2?'r':'tie';
function grade(r){return r.model?.adjustedMargin===null?'No Ervin estimate':fmt(r.model.adjustedMargin)}
function card(r){const m=r.model,history=m?.events||[];return '<article class="gov-card er-forecast-card '+color(r)+'" data-code="'+esc(r.code)+'"><div class="gov-heading"><h3>'+esc(r.state)+'</h3><span class="race-flag">'+esc(r.code)+'</span></div><p class="gov-candidates">'+esc(r.dem)+' (D)<br>'+esc(r.rep)+' (R)</p><div class="gov-lead">'+esc(grade(r))+'</div><small>'+(m?.pollMargin===null?'No numeric public average':('Poll '+esc(fmt(m.pollMargin))+(m.correction===null?' · No original state correction':' → adjusted '+esc(grade(r))+' · correction '+(m.correction>=0?'+':'')+m.correction.toFixed(2))))+'</small><div class="er-evidence"><details><summary>2016–24 Ervin error calculation</summary><p class="race-muted">'+esc(m?.source)+'</p>'+ (history.length?'<table class="er-hist-table"><thead><tr><th>Year</th><th>Office</th><th>Poll error</th></tr></thead><tbody>'+history.map(h=>'<tr><td>'+h.year+'</td><td>'+esc(h.office)+'</td><td><a href="'+esc(h.url)+'" target="_blank" rel="noopener noreferrer">'+(h.error>0?'+':'')+h.error.toFixed(1)+' pts</a></td></tr>').join('')+'</tbody></table>':'<p class="race-muted">No comparable state-specific original errors are archived. This race is not artificially corrected with a national or regional average.</p>')+'<p class="race-muted">Governor office transfer has not been separately backtested. '+'<a href="../research/original-ervin-senate-calibration-2026-11-02.json">Historical input archive</a>.</p></details></div><a class="gov-card-open" href="../state/?state='+esc(r.code)+'#stateOverview">Open state overview</a></article>'}
function draw(){
 const q=$('govSearch').value.trim().toLowerCase(),order=$('govSort').value;
 let list=races.filter(x=>[x.code,x.state,x.dem,x.rep].join(' ').toLowerCase().includes(q));
 list.sort((a,b)=>order==='alpha'?a.state.localeCompare(b.state):order==='polls'?(b.poll?.count||0)-(a.poll?.count||0):(a.model?.adjustedMargin===null?1000:Math.abs(a.model.adjustedMargin))-(b.model?.adjustedMargin===null?1000:Math.abs(b.model.adjustedMargin)));
 $('govCards').innerHTML=list.map(card).join('')||'<p class="race-muted">No matching races.</p>';
}
function drawMap(){
 const geo=window.ERVIN_US_GEOGRAPHY;if(!geo?.states)return;
 const by=Object.fromEntries(races.map(r=>[r.code,r]));
 $('govUSMap').innerHTML=geo.states.map(x=>{const r=by[x.code];const type=r?'election '+color(r):'';return '<a href="'+(r?'#govCards':'#governorRaces')+'" data-code="'+x.code+'" aria-label="'+esc(x.name+(r?' governor '+grade(r):' no governor race'))+'"><path class="gov-state '+type+'" d="'+x.d+'"><title>'+esc(x.name+' '+(r?grade(r):'No 2026 governor contest'))+'</title></path></a>'}).join('');
 $('govUSMap').querySelectorAll('a[data-code]').forEach(a=>a.addEventListener('click',()=>{if(!by[a.dataset.code])return;$('govSearch').value=by[a.dataset.code].state;draw();}));
}
async function init(){
 try{
  const fetchJson=async path=>{let x=await fetch(path,{cache:'no-cache'});if(!x.ok)throw Error(path+' HTTP '+x.status);return x.json()};
  const [g,h,s]=await Promise.all([fetchJson('./data.json'),fetchJson('../research/original-ervin-senate-calibration-2026-11-02.json'),fetchJson('../counties-watch/forecast-baselines.json')]);
  calibrated=window.ERVIN_STATEWIDE.apply(h,g,s);races=calibrated.governor;
  $('coverage').textContent=races.length+' governors · '+calibrated.summary.adjustedGovernorRaces+' Ervin-adjusted · '+calibrated.summary.stateErrorHistory+' with direct state history';
  const m=$('governorMethod');if(m)m.textContent='Exact Original Ervin historical Senate-state corrections in '+calibrated.summary.adjustedGovernorRaces+' governor elections. '+calibrated.summary.withPublishedPolling+' have numeric published polling averages; races without comparable original state correction show raw publisher polling only and do NOT pretend to have a modeled adjustment. The governor-office transfer has not been separately backtested.';
  draw();drawMap();
 }catch(e){console.error(e);$('govCards').textContent='Unable to load original Ervin statewide calculations: '+e.message}
}
$('govSearch').addEventListener('input',draw);$('govSort').addEventListener('change',draw);init();
})();