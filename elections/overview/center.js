(()=>{'use strict';const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let house=[],governors=[],senate=[],baseline={},countyHistory={},audit=null,all=[],fav=new Set();
try{fav=new Set(JSON.parse(localStorage.getItem('ervin-model-watchlist-v2')||'[]'))}catch{}
const id=r=>r.office==='House'?r.id:r.office.toLowerCase()+':'+r.code;
const route=r=>'../../state/?state='+encodeURIComponent(r.code)+(r.office==='House'?'#house-'+encodeURIComponent(r.district):'#stateOverview');
const labels=r=>r.office==='House'?r.id:r.state+' '+r.office;
const status=r=>r.office==='House'?(r.rating||'Rating not entered'):r.office==='Governor'?(Number.isFinite(r.model?.adjustedMargin)?'Original Ervin '+(r.model.adjustedMargin>=0?'D':'R')+' +'+Math.abs(r.model.adjustedMargin).toFixed(1)+(r.model.fallback?' · pooled history':' · state history'):'No comparable governor polling'):(baseline[r.code]&&Number.isFinite(baseline[r.code].adjustedMargin)?'Ervin adj. '+(baseline[r.code].adjustedMargin>=0?'D':'R')+' +'+Math.abs(baseline[r.code].adjustedMargin).toFixed(1):'No current model estimate');
const quality=r=>r.office==='House'?r.rating==='Tossup'?0:r.rating?.startsWith('Lean')?1:r.rating?.startsWith('Likely')?2:5:r.office==='Senate'?3:4;
function store(){try{localStorage.setItem('ervin-model-watchlist-v2',JSON.stringify([...fav]))}catch{}renderFav();renderSearch()}
function renderFav(){const rows=all.filter(r=>fav.has(id(r)));$('centerWatchlist').innerHTML=rows.length?rows.map(r=>'<div class="center-watch"><a href="'+route(r)+'">'+esc(labels(r))+'</a><button type="button" data-favorite="'+esc(id(r))+'" aria-label="Remove '+esc(labels(r))+' from watchlist">Remove</button></div>').join(''):'<div class="race-note">No saved races yet. Open the Race finder and select ☆ Save on any contest.</div>'}
function renderSearch(){
const query=$('centerSearchText').value.trim().toLowerCase(),office=$('centerOffice').value,sort=$('centerSort').value;
const filtered=all.filter(r=>(office==='all'||r.office===office)&&(!query||[r.state,r.code,r.id,r.office,r.incumbent,r.dem,r.rep].join(' ').toLowerCase().includes(query)));
if(sort==='priority')filtered.sort((a,b)=>quality(a)-quality(b)||labels(a).localeCompare(labels(b)));else filtered.sort((a,b)=>labels(a).localeCompare(labels(b)));
$('centerCount').textContent=filtered.length+' races';
$('centerResults').innerHTML=filtered.map(r=>'<div class="center-result"><strong>'+esc(labels(r))+'</strong><small>'+esc(status(r))+(r.office==='House'?' · Cook snapshot':'')+'</small><div class="center-result-actions"><a href="'+route(r)+'">Election dashboard ↗</a><button type="button" data-favorite="'+esc(id(r))+'" aria-pressed="'+fav.has(id(r))+'">'+(fav.has(id(r))?'★ Saved':'☆ Save')+'</button></div></div>').join('')||'<div class="race-note">No matching races.</div>';
}
function drawMap(){
const geo=window.ERVIN_US_GEOGRAPHY?.states||[],layer=$('centerMapLayer').value;
 if(layer==='counties'){if(window.ERVIN_CENTER_COUNTIES)window.ERVIN_CENTER_COUNTIES(chooseState);else $('centerMapLegend').textContent='County atlas is loading…';return;}
const hCount={};for(const r of house)if(r.rating&&(/Tossup|Lean/.test(r.rating)))hCount[r.code]=(hCount[r.code]||0)+1;
const value=code=>layer==='senate'?baseline[code]?.adjustedMargin:layer==='governor'?governors.find(r=>r.code===code)?.model?.adjustedMargin:layer==='house'?hCount[code]||0:countyHistory[code]?.stateCycles?.['2024']?.margin*100;
const color=code=>{const v=value(code);if(v==null||!Number.isFinite(v))return document.documentElement.classList.contains('light')?'#d7e3ea':'#36556b';if(layer==='house'){const n=Math.max(0,+v);return n===0?'#b4c6d4':n>=4?'#775d9a':n>=2?'#9981b2':'#b9a2c9'}const a=Math.min(1,Math.abs(v)/20);if(v<0)return a>.5?'#a7495e':'#d78c95';return a>.5?'#276b9c':'#7bb5db'};
$('centerUSMap').innerHTML=geo.map(g=>'<path data-code="'+g.code+'" tabindex="0" role="button" aria-label="Select '+esc(g.name)+'" fill="'+color(g.code)+'" d="'+g.d+'"><title>'+esc(g.name)+' — '+(value(g.code)==null?'No published input':layer==='house'?hCount[g.code]||0:typeof value(g.code)==='number'?value(g.code).toFixed(1)+' margin points':'No input')+'</title></path>').join('');
$('centerMapLegend').textContent=layer==='senate'?'Blue = non-Republican adjusted lead; red = Republican adjusted lead. Only 17 modeled Senate states. No unmodeled race calls.':layer==='governor'?'Blue = Original Ervin-adjusted Democratic lead; red = Original Ervin-adjusted Republican lead. Governor transfer is provisional and uses 2016–2024 historical Senate/presidential errors.':layer==='house'?'Purple intensity = count of sourced Lean/Tossup House district ratings in each state. Gray does not imply safe; no House seat outcomes calculated.':'Historical 2024 presidential two-party county-summed state margin where available. This is not a forecast.';
$('centerUSMap').querySelectorAll('path').forEach(p=>{p.addEventListener('click',()=>chooseState(p.dataset.code));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseState(p.dataset.code)}})});
}
const layerChoice=()=>$('centerMapLayer').value;
function chooseState(code){
 // The State Desk is now the canonical one-stop state edition.
 location.href='../../state/?state='+encodeURIComponent(code);return;
const state=window.ERVIN_US_GEOGRAPHY?.states?.find(g=>g.code===code)?.name||code;
const s=senate.find(r=>r.code===code),g=governors.find(r=>r.code===code),h=house.filter(r=>r.code===code);
const historic=countyHistory[code]?.stateCycles?.['2024'];
$('centerStateInfo').innerHTML='<h3>'+esc(state)+' · '+code+'</h3><p class="race-muted">'+esc(s?status(s):'No Senate race in the 17-contest model')+' · '+esc(g?status(g):'No 2026 governor election')+' · '+h.length+' House districts'+(historic?' · 2024 presidential D–R '+(historic.margin*100).toFixed(1)+' points':'')+'</p><div class="center-state-links">'+(s?'<a href="'+route(s)+'">Senate dashboard ↗</a>':'')+(g?'<a href="'+route(g)+'">Governor dashboard ↗</a>':'')+h.slice(0,15).map(r=>'<a href="'+route(r)+'">'+r.id+' ↗</a>').join('')+(h.length>15?'<a href="../../house/?state='+code+'">More House districts ↗</a>':'')+'<a href="../../house/?state='+code+'#districtExplorer">Explore clickable House district map ↗</a><a href="../../counties-watch/">County watch benchmarks ↗</a></div>';
 if((layerChoice()==='house'||layerChoice()==='counties')&&window.ERVIN_CENTER_GEO)window.ERVIN_CENTER_GEO.drill(code,layerChoice()==='house'?'districts':'counties');
}
function showAudit(){
if(!audit){$('centerBacktestCards').textContent='Audit file not yet available.';return}
const n=x=>Number(x).toFixed(2);
const cells=[
['Senate raw-poll walk-forward',audit.senate.n+' races','Raw MAE '+n(audit.senate.rawMAE)+' pts · past-only state correction '+n(audit.senate.adjMAE)+' pts','2018–2024 · raw reconstructed polls, not publisher averages. Winner correctness '+audit.senate.rawWinners+' raw vs '+audit.senate.adjWinners+' corrected.'],
['Pooled historical calibration',audit.pooled.n+' observations','Raw MAE '+n(audit.pooled.rawMAE)+' pts · corrected '+n(audit.pooled.correctedMAE)+' pts','Senate and presidential; separate archive and overlapping state-year observations. Not House/governor validation.'],
['Matched publisher comparison','4 Senate races','RCP adj. '+n(audit.publishers.rcp.adjustedMAE)+' · DDHQ '+n(audit.publishers.ddhq.adjustedMAE)+' · 270toWin '+n(audit.publishers.win270.adjustedMAE),'2024 only, no matched Silver average. Four races are too few to establish reliable source rankings.'],
['County baseline holdout',audit.counties.n+' selected counties','2020 repeat MAE '+n(audit.counties.baselineMAE)+' · linear-trend '+n(audit.counties.trendMAE),'Predict 2024 from 2016/2020. Watch counties were selected with 2024 data, so this is retrospective and selection-biased.'],
['Governor calibration','Not yet validated','No honest office-specific MAE','36 races indexed; cannot score 2026 governor forecasts as backtested without time-stamped matched governor averages.'],
['House probability model','Not yet validated','No honest House win percentages','435 districts indexed; sourced competitive ratings are qualitative, not independent numerical predictions.']
];
$('centerBacktestCards').innerHTML=cells.map(([title,headline,detail,note])=>'<div><h3>'+esc(title)+'</h3><strong>'+esc(headline)+'</strong><p>'+esc(detail)+'</p><small>'+esc(note)+'</small></div>').join('');
}
function switchTab(tab){for(const p of document.querySelectorAll('.center-tab-pane'))p.hidden=p.id!==({summary:'centerSummary',map:'centerMapPane',search:'centerSearch',research:'centerResearch'}[tab]);document.querySelectorAll('[data-tab]').forEach(b=>{const yes=b.dataset.tab===tab;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes))});if(tab==='map')drawMap();if(tab==='search')renderSearch();if(tab==='research')showAudit()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.querySelectorAll('[data-go-tab]').forEach(b=>b.onclick=()=>{switchTab(b.dataset.goTab);window.scrollTo({top:0,behavior:'smooth'})});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-favorite]');if(!b)return;const k=b.dataset.favorite;if(fav.has(k))fav.delete(k);else fav.add(k);store()});
$('centerMapLayer').onchange=drawMap;
['centerSearchText','centerOffice','centerSort'].forEach(k=>$(k).addEventListener(k==='centerSearchText'?'input':'change',renderSearch));
async function start(){
try{
const root='../../';
const [h,g,baselineData,countyData,score,source,archive]=await Promise.all([
fetch(root+'house/data.json').then(r=>r.json()),fetch(root+'governors/data.json').then(r=>r.json()),
fetch(root+'counties-watch/forecast-baselines.json').then(r=>r.json()),
fetch(root+'counties-watch/history.json').then(r=>r.json()),
fetch(root+'research/cross_office_backtest_scorecard.json').then(r=>r.json()),
fetch(root+'index.html').then(r=>r.text()),
fetch(root+'research/calibration_events_2016_2024.json').then(r=>r.json())
]);
house=h.seats||[];governors=window.ERVIN_STATEWIDE.apply(archive,g,baselineData).governor;baseline=baselineData.states||{};countyHistory=countyData.states||{};audit=score;
const pre='window.ERVIN_DATA = ',a=source.indexOf(pre);if(a<0)throw Error('Senate source missing');
const begin=a+pre.length,end=source.indexOf(';\n\n</script><script>',begin);if(end<0)throw Error('Senate source terminator missing');
senate=JSON.parse(source.slice(begin,end)).states.map(x=>({...x,office:'Senate'}));
all=[...senate,...governors,...house];
renderFav();renderSearch();drawMap();showAudit();
const tab=new URLSearchParams(location.search).get('tab');if(['summary','map','search','research'].includes(tab))switchTab(tab);
}catch(err){console.error(err);$('centerCount').textContent='Data unavailable';$('centerResults').textContent='Unable to load race data. Try again.'}}
start();
})();