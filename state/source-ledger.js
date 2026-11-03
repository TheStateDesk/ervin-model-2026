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
 const {governors,governorHistory,senateHistory,houseModel,houseRegistry,coverage,senateBaseline,countyHistory}=all;
 const gov=governors.races?.find(x=>x.code===state);
 const governorEvents=(governorHistory.races||[]).filter(e=>e.state===state&&e.office==='Governor'&&e.year>=2018&&e.year<2026&&e.pollType!=='single stale poll').sort((a,b)=>b.year-a.year).slice(0,3);

 const senate=senateHistory.senateStates?.[state];
 const baseline=senateBaseline.states?.[state],senIndex=coverage.senate?.states?.[state],govIndex=coverage.governor?.states?.[state];
 const districts=(houseRegistry.seats||[]).filter(r=>r.code===state).sort((a,b)=>a.id.localeCompare(b.id));
 const entries=[];
 if(gov){
  const m=gov.poll;
  let body='<p>2026 publisher polling input: <strong>'+fmt(m?.margin)+'</strong> · '+esc(m?.count??'Unknown')+' listed surveys · as of '+esc(m?.asOf||'undated')+'. '+link(m?.url,'Open source polling average')+'.</p>';
  body+='<p class="ed-mini">Historical adjustment excludes 2014 and uses the newest three available 2018–2024 same-state governor elections, weighted 50/30/20, with one-cycle corrections reduced to one-third and two-cycle corrections to two-thirds. No Senate or presidential polling errors are included. Individual polls and publisher averages are not interchangeable.</p>';
  body+='<p class="ed-mini">This state has '+governorEvents.length+' recorded prior governor election'+(governorEvents.length===1?'':'s')+' for its 2026 correction. The rule is tested against earlier historical elections; the <a href="../research/governor-method-selection-2026-11-02.md">full reproducible policy comparison</a> remains in the research archive.</p>';
  if(state==='OH'&&gov.candidatePerformance?.comparisons?.length){
   const comparisons=gov.candidatePerformance.comparisons;
   const delta=comparisons.reduce((sum,x)=>sum+(x.referenceRepublicanMargin-x.comparisonRepublicanMargin)*x.weight,0);
   body+='<details open><summary>Ervin’s Take · Ohio candidate-performance shift +'+delta.toFixed(2)+' D points</summary><p class="ed-mini">'+esc(gov.candidatePerformance.method)+'</p><ol class="ed-evidence-list">'+comparisons.map(x=>'<li><strong>'+esc(x.year)+'</strong> · '+esc(x.reference)+' · Republican performance gap '+(x.referenceRepublicanMargin-x.comparisonRepublicanMargin).toFixed(2)+' points; '+Math.round(x.weight*100)+'% retained = +'+((x.referenceRepublicanMargin-x.comparisonRepublicanMargin)*x.weight).toFixed(2)+' D points<div class="ed-mini">'+link(x.referenceUrl,'Reference result')+' · '+link(x.comparisonUrl,'Comparison result')+'</div></li>').join('')+'</ol><p class="ed-mini">These are actual race-margin comparisons, not imported federal polling errors, and are not covered by the governor-only backtest.</p></details>';
  }
  body+=governorEvents.length?'<details open><summary>'+governorEvents.length+' same-state governor cycle'+(governorEvents.length===1?'':'s')+' used in 2026 correction</summary><ol class="ed-evidence-list">'+governorEvents.map(x=>historicalRow(x,'historical governor')).join('')+'</ol></details>':'<p class="ed-notice">No qualifying historical governor poll–result comparisons are in the verified archive. No governor-specific historical correction can be substantiated.</p>';
  body+='<p class="ed-mini"><a href="../research/governor-same-office-2014-2024.json">Governor historical input archive (JSON)</a> · <a href="../research/poll-dedup-and-office-audit-2026-11-02.json">All-races office/duplicate audit</a> · <a href="../research/governor-same-office-backtest-2026-11-02.json">Full governor validation records</a>. Polling and final returns are linked separately above, when distinct result sources exist.</p>';

  entries.push(card('Governor · '+esc(gov.dem)+' / '+esc(gov.rep),'GOVERNOR-TO-GOVERNOR HISTORY',body));
 }else entries.push(card('Governor','NO 2026 CONTEST','<p class="ed-mini">No governor race is scheduled in this state’s 2026 registry.</p>'));
 if(baseline||senate){
  let body='<p>2026 Original Ervin statewide estimate: <strong>'+fmt(baseline?.adjustedMargin)+'</strong> · original blended public polling: '+fmt(baseline?.pollMargin)+'. '+(baseline?.publisherInputs||0)+' publisher averages indexed. <a href="../elections/?office=senate&state='+encodeURIComponent(state)+'#pollSection">See this race’s publisher inputs and individual polls</a>.</p>';
  body+='<p class="ed-mini">The federal Senate model uses the pre-existing Original Ervin adjustment, not gubernatorial polling history. Its individual sources, including presidential history where prescribed by that model, are separated below.</p>';
  if(state==='MI'&&baseline?.candidateStrength){
   const w=baseline.candidateStrength;
   body+='<details open><summary>Ervin’s Take candidate-strength marker · '+(w.adjustmentD>0?'+':'')+w.adjustmentD.toFixed(2)+' Democratic-margin points</summary><p class="ed-mini">Michigan’s ordinary original historical Senate model, before candidate context, is D +'+w.referenceMarginD.toFixed(2)+'. In the August 2026 Democratic Senate primary, the candidate led the published poll average by '+w.pollingMarginD.toFixed(1)+' points but the final margin was '+w.actualMarginD.toFixed(1)+'. Ervin’s Take transfers '+Math.round(w.retainedFraction*100)+'% of that '+w.overstatementD.toFixed(1)+'-point primary discrepancy, producing a '+(w.adjustmentD>0?'+':'')+w.adjustmentD.toFixed(2)+'-point contextual change. The current Ervin’s Take forecast is '+fmt(baseline.adjustedMargin)+'.</p><p class="ed-mini"><strong>Qualitative, not a validated Bradley effect.</strong> The primary electorate and primary ballot are not identical to a November general election, and the primary included a withdrawn candidate. No categorical Muslim, polling-method, or county demographic penalty is imposed. '+link(w.sourcePolling,'2026 primary polling average')+' · '+link(w.sourceFinal,'2026 primary results')+'.</p></details>';
  }

  const events=(senate?.events||[]).filter(x=>x.office==='Senate'||x.office==='President');
  body+=events.length?'<details open><summary>'+events.length+' archived original federal correction inputs · '+dec(senate.correction)+' pts</summary><ol class="ed-evidence-list">'+events.map(x=>historicalRow(x,'federal calibration')).join('')+'</ol></details>':'<p class="ed-notice">No state-specific Original Ervin historical events are in this exported archive; inspect the Senate methodology page.</p>';
  if(senate?.candidateRepeatContext?.length)body+='<details open><summary>Alaska candidate-repeat context — NOT a general federal error</summary><p class="ed-mini">The archived Alaska Original Ervin correction includes two Mary Peltola prior House election comparisons. Those candidate-specific contextual records are separated from the general Senate/President federal evidence. The legacy published correction remains unchanged, and these House events must never be transferred to another Senate or governor contest.</p><ol class="ed-evidence-list">'+senate.candidateRepeatContext.map(e=>historicalRow(e,'separate Alaska candidate context')).join('')+'</ol></details>';
   body+='<p class="ed-mini"><a href="../research/original-ervin-senate-calibration-2026-11-02.json">Federal original-model source file (JSON)</a> · <a href="../research/poll-dedup-and-office-audit-2026-11-02.json">Source-family audit</a></p>';
  entries.push(card('U.S. Senate · '+(baseline?.nonR||'Democrat')+' / '+(baseline?.rep||'Republican'),'ORIGINAL ERVIN · FEDERAL STATEWIDE',body));
 }else if(senIndex){
  entries.push(card('U.S. Senate · polling index only','NO ORIGINAL ERVIN FORECAST','<p>'+senIndex.count+' surveys listed in the public index; '+esc(senIndex.summary)+'. '+link(coverage.senate?.source,'Publisher index')+'. No unverified model value is substituted.</p>'));
 }
 let house='<p>'+districts.length+' voting House district'+(districts.length===1?'':'s')+'. Individual sources follow each district, distinguishing historical returns, the latest located polls, and independent race ratings. 2026-redrawn boundaries may make earlier district returns noncomparable.</p>';
 house+='<p class="ed-mini">'+link('https://electiondata.dev/datasets/house-results/','MIT Election Data & Science Lab · U.S. House returns')+' · '+link('https://www.cookpolitical.com/ratings/house-race-ratings','Cook Political Report ratings')+' · '+link('https://peoplespoll.com/house','House survey directory')+'. The House 2022→2024 lagged baseline test is NOT a full 2026 House model backtest.</p>';
 house+='<details><summary>Show sources for all '+districts.length+' House districts</summary><div class="ed-table-wrap"><table class="ed-table"><thead><tr><th>District</th><th>Model / history</th><th>Individual polls</th><th>Other sources</th></tr></thead><tbody>';
 house+=districts.map(d=>{
  const m=houseModel.races?.[d.id],polls=m?.surveys||[],uniq=[...new Map(polls.filter(p=>safe(p.url)).map(p=>[p.url,p])).values()].slice(0,4);
  return '<tr><td><a href="#stateHouse" data-ledger-district="'+esc(d.district)+'">'+esc(d.id)+'</a></td><td>'+esc(m?.modelRating||'No model')+' · '+fmt(m?.marginD)+'<div class="ed-mini">'+(m?.changed2026Map?'Redistricting warning · ':'')+'2022/24 House returns</div></td><td>'+ (uniq.length?uniq.map((p,i)=>link(p.url,(p.pollster||'Survey')+' '+(p.date||'undated')+(p.kind&&/listing|directory|index/i.test(p.kind)?' (index)':''))).join(' · '):'No archived individual survey')+'</td><td>'+link(d.ratingSource||houseRegistry.ratingSource,'Rating')+' · '+link(d.officialBallot||'https://www.usa.gov/election-office','Election office')+'</td></tr>';
 }).join('');
 house+='</tbody></table></div></details>';
 entries.push(card('U.S. House · district-by-district','435-DISTRICT NATIONAL MODEL',house));
 const source=countyHistory?.source||{};
 const county='<p>2020 and 2024 county-level presidential baselines are used for the county-map scenarios. These are <strong>not governor election results</strong> and never enter the governor polling-error correction.</p>'+
 '<p class="ed-mini">'+link(source.president2020,'2020 county returns')+' · '+link(source.president2024,'2024 county returns')+' · <a href="../geo/county-history.json">Locally published baseline and FIPS mapping (JSON)</a> · <a href="../research/ALL_50_STATE_GEOGRAPHY_AUDIT_2026-11-01.md">County geography audit</a></p>'+
 '<p class="ed-mini">County expectations are conditional allocations of a statewide model margin, not independent county polls, verified 2026 returns or calibrated county forecasts.</p>';
 entries.push(card('County maps · historical sources','BASELINES / NOT MODEL CALIBRATION',county));
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
 '../polling/coverage-2026-11-02.json','../counties-watch/forecast-baselines.json','../geo/county-history.json'
 ];
 try{
  const values=await Promise.all(urls.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+' HTTP '+r.status);return r.json()}));
  all=Object.fromEntries(['governors','governorHistory','senateHistory','houseModel','houseRegistry','coverage','senateBaseline','countyHistory'].map((k,i)=>[k,values[i]]));
  draw();
 }catch(e){root.innerHTML='<p class="ed-notice">Unable to load the linked source archive. See the Senate, House and governor polling pages for their source links.</p>';console.error('Source ledger',e);}
}
window.addEventListener('ervin:state-edition',e=>{active=e.detail?.code||'MI';draw()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();