/* Source ledger for each State Desk edition. External publisher figures are not recast as primary data. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>/^https:\/\//.test(String(u||''))?esc(u):'';
const link=(url,label)=>safe(url)?'<a target="_blank" rel="noopener noreferrer" href="'+safe(url)+'">'+esc(label)+'</a>':'<span>'+esc(label)+' (source not available)</span>';
const fmt=n=>Number.isFinite(n)?(n>0?'D +':n<0?'R +':'Even ')+Math.abs(n).toFixed(2):'Not reported';
const dec=n=>Number.isFinite(n)?(n>0?'+':'')+n.toFixed(2):'—';
let all=null,active='MI';
function card(title,label,inner){return '<article class="ed-card"><div class="ed-kicker">'+esc(label)+'</div><h3>'+esc(title)+'</h3>'+inner+'</article>'}
function historicalRow(x,kind){
 return '<li><strong>'+esc(x.year)+' '+esc(x.office||'Governor')+'</strong> · published D–R '+fmt(x.pollMargin??x.poll)+' · result '+fmt(x.actualMargin??x.actual)+' · error '+dec(x.error??((x.pollMargin??x.poll)-(x.actualMargin??x.actual)))+' pts'+
 (Number.isFinite(x.weight)?' · weight '+Math.round(100*x.weight)+'%':'')+
 '<div class="ed-mini">'+link(x.sourceUrl||x.url,'Poll / average')+' · '+link(x.resultUrl||x.url,'Election result')+' · '+esc(x.pollType||x.kind||kind||'')+'</div></li>';
}
function draw(){
 if(!$('stateSourceLedger'))return;
 if(!all){$('sourceLedgerSummary').textContent='Loading source archive…';return;}
 const state=active;
 const {governors,governorHistory,senateHistory,houseModel,houseRegistry,coverage,senateBaseline}=all;
 const gov=governors.races?.find(x=>x.code===state);
 const governorEvents=(governorHistory.races||[]).filter(e=>e.state===state&&e.office==='Governor'&&e.year<2026&&e.pollType!=='single stale poll').sort((a,b)=>b.year-a.year).slice(0,3);
 const senate=senateHistory.senateStates?.[state];
 const baseline=senateBaseline.states?.[state],senIndex=coverage.senate?.states?.[state],govIndex=coverage.governor?.states?.[state];
 const districts=(houseRegistry.seats||[]).filter(r=>r.code===state).sort((a,b)=>r.id.localeCompare(b.id));
 const entries=[];
 if(gov){
  const m=gov.poll;
  let body='<p>2026 publisher polling input: <strong>'+fmt(m?.margin)+'</strong> · '+esc(m?.count??'Unknown')+' listed surveys · as of '+esc(m?.asOf||'undated')+'. '+link(m?.url,'Open source polling average')+'.</p>';
  body+='<p class="ed-mini">Historical adjustment uses the newest three available same-state governor elections, weighted 50/30/20 (renormalized when fewer than three). No Senate or presidential results are included. Individual polls and publisher averages are not interchangeable.</p>';
  body+=governorEvents.length?'<details open><summary>'+governorEvents.length+' same-state governor cycle'+(governorEvents.length===1?'':'s')+' used in 2026 correction</summary><ol class="ed-evidence-list">'+governorEvents.map(x=>historicalRow(x,'historical governor')).join('')+'</ol></details>':'<p class="ed-notice">No qualifying historical governor poll–result comparisons are in the verified archive. No governor-specific historical correction can be substantiated.</p>';
  body+='<p class="ed-mini"><a href="../research/governor-same-office-2014-2024.json">Governor historical input archive (JSON)</a> · <a href="../governors/#governorBacktest">Past-only governor backtest</a>. Polling and final returns are linked separately above, when distinct result sources exist.</p>';

  entries.push(card('Governor · '+esc(gov.dem)+' / '+esc(gov.rep),'GOVERNOR-TO-GOVERNOR HISTORY',body));
 }else entries.push(card('Governor','NO 2026 CONTEST','<p class="ed-mini">No governor race is scheduled in this state’s 2026 registry.</p>'));
 if(baseline||senate){
  let body='<p>2026 Original Ervin statewide estimate: <strong>'+fmt(baseline?.adjustedMargin)+'</strong> · original blended public polling: '+fmt(baseline?.pollMargin)+'. '+(baseline?.publisherInputs||0)+' publisher averages indexed. <a href="../elections/?office=senate&state='+encodeURIComponent(state)+'#pollSection">See this race’s publisher inputs and individual polls</a>.</p>';
  body+='<p class="ed-mini">The federal Senate model uses the pre-existing Original Ervin adjustment, not gubernatorial polling history. Its individual sources, including presidential history where prescribed by that model, are separated below.</p>';
  const events=senate?.events||[];
  body+=events.length?'<details open><summary>'+events.length+' archived original federal correction inputs · '+dec(senate.correction)+' pts</summary><ol class="ed-evidence-list">'+events.map(x=>historicalRow(x,'federal calibration')).join('')+'</ol></details>':'<p class="ed-notice">No state-specific Original Ervin historical events are in this exported archive; inspect the Senate methodology page.</p>';
  body+='<p class="ed-mini"><a href="../research/original-ervin-senate-calibration-2026-11-02.json">Federal original-model source file (JSON)</a></p>';
  entries.push(card('U.S. Senate · '+(baseline?.nonR||'Democrat')+' / '+(baseline?.rep||'Republican'),'ORIGINAL ERVIN · FEDERAL STATEWIDE',body));
 }else if(senIndex){
  entries.push(card('U.S. Senate · polling index only','NO ORIGINAL ERVIN FORECAST','<p>'+senIndex.count+' surveys listed in the public index; '+esc(senIndex.summary)+'. '+link(coverage.senate?.source,'Publisher index')+'. No unverified model value is substituted.</p>'));
 }
 let house='<p>'+districts.length+' voting House district'+(districts.length===1?'':'s')+'. Individual sources follow each district, distinguishing historical returns, the latest located polls, and independent race ratings. 2026-redrawn boundaries may make earlier district returns noncomparable.</p>';
 house+='<p class="ed-mini">'+link('https://electiondata.dev/datasets/house-results/','MIT Election Data & Science Lab · U.S. House returns')+' · '+link('https://www.cookpolitical.com/ratings/house-race-ratings','Cook Political Report ratings')+' · '+link('https://peoplespoll.com/house','House survey directory')+'. The House 2022→2024 lagged baseline test is NOT a full 2026 House model backtest.</p>';
 house+='<details><summary>Show sources for all '+districts.length+' House districts</summary><div class="ed-table-wrap"><table class="ed-table"><thead><tr><th>District</th><th>Model / history</th><th>Individual polls</th><th>Other sources</th></tr></thead><tbody>';
 house+=districts.map(d=>{
  const m=houseModel.races?.[d.id],polls=m?.surveys||[],uniq=[...new Set(polls.map(p=>p.url).filter(u=>safe(u)))].slice(0,4);
  return '<tr><td><a href="#stateHouse" data-ledger-district="'+esc(d.district)+'">'+esc(d.id)+'</a></td><td>'+esc(m?.modelRating||'No model')+' · '+fmt(m?.marginD)+'<div class="ed-mini">'+(m?.changed2026Map?'Redistricting warning · ':'')+'2022/24 House returns</div></td><td>'+ (uniq.length?uniq.map((u,i)=>link(u,'Poll '+(i+1))).join(' · '):'No archived individual survey')+'</td><td>'+link(d.ratingSource||houseRegistry.ratingSource,'Rating')+' · '+link(d.officialBallot||'https://www.usa.gov/election-office','Election office')+'</td></tr>';
 }).join('');
 house+='</tbody></table></div></details>';
 entries.push(card('U.S. House · district-by-district','435-DISTRICT NATIONAL MODEL',house));
 $('stateSourceLedger').innerHTML=entries.join('');
 $('sourceLedgerSummary').textContent='Race-level bibliography · '+(gov?'governor · ':'')+(baseline||senate?'modeled Senate · ':senIndex?'Senate index · ':'')+districts.length+' House districts';
 $('stateSourceLedger').querySelectorAll('[data-ledger-district]').forEach(a=>a.addEventListener('click',()=>{const b=document.querySelector('#districtButtons button[data-district="'+a.dataset.ledgerDistrict+'"]');if(b)b.click();}));
}
async function init(){
 const root=$('stateSourceLedger');if(!root)return;
 const urls=[
 '../governors/data.json','../research/governor-same-office-2014-2024.json',
 '../research/original-ervin-senate-calibration-2026-11-02.json',
 '../house/ervin-forecast-2026-11-02.json','../house/data.json',
 '../polling/coverage-2026-11-02.json','../counties-watch/forecast-baselines.json'
 ];
 try{
  const values=await Promise.all(urls.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+' HTTP '+r.status);return r.json()}));
  all=Object.fromEntries(['governors','governorHistory','senateHistory','houseModel','houseRegistry','coverage','senateBaseline'].map((k,i)=>[k,values[i]]));
  draw();
 }catch(e){root.innerHTML='<p class="ed-notice">Unable to load the linked source archive. See the Senate, House and governor polling pages for their source links.</p>';console.error('Source ledger',e);}
}
window.addEventListener('ervin:state-edition',e=>{active=e.detail?.code||'MI';draw()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();