/* The Ervin State Desk — one editorial dashboard per state, no synthetic outcomes. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>/^https:\/\//i.test(String(u||''))?esc(u):'https://www.nass.org/can-I-vote/state-election-officials';
const fmt=n=>Number(n||0).toLocaleString('en-US');
const margin=v=>Number.isFinite(v)?(Math.abs(v)<.05?'Even':(v>0?'D +':'R +')+Math.abs(v).toFixed(1)):'Not available';
const NON_SENATE_2026=new Set('AZ CA CT HI IN MD MO NV NY ND PA UT VT WA WI'.split(' '));
const regionMap={CT:'Northeast',ME:'Northeast',MA:'Northeast',NH:'Northeast',RI:'Northeast',VT:'Northeast',NJ:'Northeast',NY:'Northeast',PA:'Northeast',MI:'Midwest',WI:'Midwest',OH:'Midwest',IN:'Midwest',IL:'Midwest',IA:'Midwest',MN:'Midwest',MO:'Midwest',KS:'Midwest',NE:'Midwest',ND:'Midwest',SD:'Midwest'};
const stateList=window.ERVIN_US_GEOGRAPHY?.states||[];
const byCode=Object.fromEntries(stateList.map(x=>[x.code,x]));
let house=[],governors=[],baselines={},historical={counties:{}},senatePolls={},govPolls={},housePolls={},coverage={senate:{states:{}},governor:{states:{}},house:{districts:{}}},pollingWarning='';
let sourceTimeLabel='Source update time unavailable';let historicalError=null;let governorErvin={};let houseRoster={races:{}};let houseScenario={races:{},summary:{}};let houseQuestions={races:{},summary:{}};let houseVerified={races:{}};let statewideLatest={senate:{},governor:{}};let texasGovAverages=null,texasGovSurveys={polls:[]};let houseZoom=1,houseCenter={x:450,y:290};
let countyChosenByUser=false; for(const b of document.querySelectorAll('[data-county-view]'))b.setAttribute('aria-pressed',String(b.dataset.countyView==='forecast'));let code='MI',stateHouse=[],selectedDistrict=null,countyShape=null,districtShape=null,cachedCountyRows=[],countyScenario={senate:null,governor:null},selectedCounty=null,countyToken=0,houseToken=0,resultLast=0,mapZoom=1,mapCenter={x:450,y:290},siena={races:{}};
const pollCutoff=Date.parse('2026-11-03T18:00:00-05:00');
function stateName(c){return byCode[c]?.name||house.find(x=>x.code===c)?.state||c;}
function sourceItem(text,url,detail=''){return '<article><strong><a href="'+safeURL(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+'</a></strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</article>';}
const pick=r=>r?.office==='Governor'?'governor':'senate';
function getGov(){return governors.find(x=>x.code===code);}
function getSen(){return baselines[code]||null;}
function getDistrict(id){return stateHouse.find(x=>String(x.district).padStart(2,'0')===String(id).padStart(2,'0'));}
function stateRoute(c){return '?state='+encodeURIComponent(c)}
function prepareSelection(){
 $('stateSelect').innerHTML=stateList.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>'<option value="'+esc(s.code)+'">'+esc(s.name)+'</option>').join('');
 $('stateSelect').onchange=e=>{window.history.pushState(null,'',stateRoute(e.target.value));display(e.target.value);};
 window.addEventListener('popstate',()=>display(new URLSearchParams(location.search).get('state')||'MI'));
}
function renderLead(){
 const gov=getGov(),sen=getSen();
 $('stateSelect').value=code;
 document.title=stateName(code)+' Elections 2026 | The Ervin State Desk';
 $('stateTitle').textContent=stateName(code)+', all in one place.';
 $('stateDeck').textContent='Your complete '+stateName(code)+' election notebook: '+(sen?'a modeled Senate contest, ':'')+(gov?'a governor election, ':'')+stateHouse.length+' House district'+(stateHouse.length!==1?'s':'')+', county history and verified reporting sources.';
 const n=r=>r===1?'One district':fmt(r)+' districts';
 $('heroHouse').textContent=fmt(stateHouse.length);
 $('heroHouseSub').textContent=stateHouse.filter(r=>r.rating).length+' published competitiveness ratings indexed';
 const senateIndex=coverage.senate?.states?.[code];
 $('heroSenate').textContent=sen?margin(Number(sen.adjustedMargin)):senateIndex?fmt(senateIndex.count)+' polls indexed':'No modeled race';
 $('heroSenateSub').textContent=sen?(code==='MI'?'Ervin’s Take · candidate-strength context · ':'Original Ervin adjustment · ')+fmt(sen.publisherInputs)+' publisher inputs':senateIndex?'Public Senate poll index · not an Ervin prediction':NON_SENATE_2026.has(code)?'No U.S. Senate election in 2026':'2026 Senate contest outside the numerical model';
 $('heroGovernor').textContent=gov?(Number.isFinite(governorErvin[code]?.model?.adjustedMargin)?margin(governorErvin[code].model.adjustedMargin):Number.isFinite(governorErvin[code]?.model?.pollMargin)?margin(governorErvin[code].model.pollMargin):'No poll input'):'No election';
 $('heroGovSub').textContent=gov?(Number.isFinite(governorErvin[code]?.model?.adjustedMargin)?'Ervin’s Take · governor calibration':governorErvin[code]?.model?'Published poll · comparable state history not yet verified':'Loading Ervin correction'):'No governor contest in the 2026 registry';
 $('houseCoverage').textContent=n(stateHouse.length)+' · '+stateName(code);
 $('editionDate').textContent=sourceTimeLabel;
}
function statewideCard(title,sub,candidates,forecast,explain,source,href){
 return '<article class="ed-race"><div class="ed-race-h"><div><div class="ed-kicker">'+esc(sub)+'</div><h3>'+esc(title)+'</h3><p>'+esc(candidates)+'</p></div><div class="ed-race-big">'+esc(forecast)+'</div></div><p>'+esc(explain)+'</p><div class="ed-link-list"><a href="'+safeURL(source)+'" target="_blank" rel="noopener noreferrer">Polling/source reference</a><a href="'+esc(href)+'">Detailed methodology</a></div></article>';
}
function renderOverview(){
 const s=getSen(),g=getGov(),indexedSenate=coverage.senate?.states?.[code];
 const senate=s?statewideCard('U.S. Senate',code==='MI'?'Ervin’s Take · candidate-strength context':'Original Ervin adjustment',s.nonR+' vs. '+s.rep+(code==='MT'?' · Alani Bankhead (D) also on ballot':''),margin(Number(s.adjustedMargin)),'Historical partisan polling correction applied to sourced statewide averages. '+(s.candidateStrength?'The candidate-specific, discounted primary-overpolling comparison is also applied; methodology in the source ledger. ':'')+'Forecast margin; not counted votes. '+(s.stale?'Publisher inputs may be outdated.':''),'https://www.realclearpolling.com/latest-polls/senate','../elections/?office=senate&state='+code+'#pollSection'):'<article class="ed-race"><div class="ed-kicker">U.S. Senate</div><h3>'+(indexedSenate?'Senate polling indexed':'No Ervin-modeled Senate contest')+'</h3><p>'+(indexedSenate?'A separate public polling index lists '+fmt(indexedSenate.count)+' published surveys and displays '+esc(indexedSenate.summary)+'. This index is not an Ervin forecast or a verified candidate-matched polling average.':NON_SENATE_2026.has(code)?'No U.S. Senate election in '+stateName(code)+' in 2026.':'A Senate election is scheduled but is outside the numerical Ervin model; this does not mean it is uncontested.')+'</p>'+(indexedSenate?'<a href="'+safeURL(coverage.senate.source)+'" target="_blank" rel="noopener noreferrer">Review all Senate polls at publisher</a>':'')+'</article>';
 const govEst=governorErvin[code]?.model;const governor=g?statewideCard('Governor',Number.isFinite(govEst?.adjustedMargin)?'Ervin’s Take':'Published polling average',g.dem+' vs. '+g.rep,govEst&&Number.isFinite(govEst.adjustedMargin)?margin(govEst.adjustedMargin):Number.isFinite(govEst?.pollMargin)?margin(govEst.pollMargin)+' · published average':(g.qualitativeRating?'Cook '+g.qualitativeRating.label+' · no numeric poll':'No comparable public poll average'),govEst?'Published poll: '+(Number.isFinite(govEst.pollMargin)?margin(govEst.pollMargin):'unavailable')+'; 2018–24 governor-only error correction '+(govEst.correction===null?'not available':govEst.correction.toFixed(2)+' points')+'. '+(govEst.candidateShift?'Candidate-performance context +'+govEst.candidateShift.toFixed(2)+' D points (included in Ervin’s Take). ':'')+(govEst.fallback?'No verified same-state governor polling error available; the displayed publisher margin is not a modeled Ervin forecast. ':'Same-state governor history included. ')+'The small-sample governor adjustment is evaluated in 20 strictly past-only governor election-years; compare the raw and adjusted error in the linked source.': 'Awaiting historical calibration inputs.',g.poll?.url||g.qualitativeRating?.url||g.nomineesSource,'../governors/?state='+code):'<article class="ed-race"><div class="ed-kicker">Governor</div><h3>No 2026 gubernatorial contest</h3><p>The governorship is not up for election in this registry.</p></article>';
 $('stateRaceCards').innerHTML=senate+governor;
 if(code==='MI'&&s?.candidateStrength){
  const p=s.candidateStrength,box=document.createElement('div');box.className='ed-notice';
  box.innerHTML='<strong>Why the Michigan forecast differs from published polls</strong><p>Publisher input: '+esc(margin(s.pollMargin))+'; historical Senate calibration before the candidate term: '+esc(margin(p.referenceMarginD))+'; discounted primary-polling context: '+esc(p.adjustmentD.toFixed(2))+' Democratic points. Combined forecast: '+esc(margin(s.adjustedMargin))+'.</p>';
  $('stateRaceCards').firstElementChild?.insertAdjacentElement('afterend',box);
 }
 // Conditional statewide odds use office-specific historic error widths, not
 // sample MOE or certified race-call probabilities.
 const cards=$('stateRaceCards').querySelectorAll('.ed-race');
 const potential=[s?{race:s,office:'Senate',margin:Number(s.adjustedMargin)}:null,
  g?{race:g,office:'Governor',margin:Number.isFinite(govEst?.adjustedMargin)?govEst.adjustedMargin:govEst?.pollMargin,cycles:govEst?.calibrationCycles||0}:null].filter(Boolean);
 potential.forEach((entry)=>{
  const card=[...cards].find(el=>el.querySelector('h3')?.textContent.trim()===(entry.office==='Senate'?'U.S. Senate':'Governor'));
  const forecast=card?.querySelector('.ed-race-big'),ch=window.ERVIN_ODDS?.estimate(entry.margin,entry.office,{cycles:entry.cycles||0});
  if(!forecast||!ch)return;
  forecast.insertAdjacentHTML('afterend','<div class="ed-win-odds"><span><b>'+window.ERVIN_ODDS.pct(ch.dem)+'</b> '+(entry.office==='Senate'&&['NE','MT','SD'].includes(code)?'Independent':'Dem.')+'</span><span><b>'+window.ERVIN_ODDS.pct(ch.rep)+'</b> R</span></div><small class="ed-odds-footnote">Illustrative model win chances · ±'+ch.sigma.toFixed(1)+' pts assumed forecast error; not validated probabilities'+(entry.office==='Governor'&&!Number.isFinite(govEst?.adjustedMargin)?' · publisher average only':'')+'</small>');
 });

 const withPolls=stateHouse.filter(x=>housePolls[x.id]||houseVerified.races?.[x.id]?.length||coverage.house?.districts?.[x.id]).length,withRatings=stateHouse.filter(x=>x.rating).length;
 $('stateNotebook').innerHTML='<article><strong>State contests</strong><small>'+(s?'Senate model available · ':'No Senate model · ')+(g?'Governor polling indexed':'No governor election')+'</small></article>'+
 '<article><strong>'+withRatings+' of '+stateHouse.length+' House ratings sourced</strong><small>Ratings are qualitative; missing ratings are not Safe D or Safe R predictions.</small></article>'+
 '<article><strong>'+withPolls+' House districts with documented public polling</strong><small>Latest indexed survey only; no House polling average manufactured.</small></article>'+
 '<article><strong>Locally hosted county geography</strong><small>2022 Census reference boundaries and 2020/2024 presidential results, not certified 2026 voting totals.</small></article>';
}
function buildScenario(){
 const f=String((countyShape?.features?.[0]?.id)||'').slice(0,2);
 countyScenario.senate=window.ERVIN_SCENARIOS.build(historical,f||'00',Number.isFinite(+getSen()?.adjustedMargin)?Number(getSen().adjustedMargin):null);
 countyScenario.governor=window.ERVIN_SCENARIOS.build(historical,f||'00',Number.isFinite(governorErvin[code]?.model?.adjustedMargin)?governorErvin[code].model.adjustedMargin:Number.isFinite(getGov()?.poll?.margin)?getGov().poll.margin:null);
 const valid=countyShape?.features||[];
 cachedCountyRows=valid.map(x=>{const id=String(x.id).padStart(5,'0'),history=historical.counties?.[id];
 return{id,name:String(x.properties?.name||'County '+id),m24:window.ERVIN_SCENARIOS.margin(history?.y24),m20:window.ERVIN_SCENARIOS.margin(history?.y20),senate:countyScenario.senate?.map.get(id)?.expected??null,governor:countyScenario.governor?.map.get(id)?.expected??null};});
 window.dispatchEvent(new CustomEvent('ervin:county-context',{detail:{code,rows:cachedCountyRows}}));
}
function activeCountyMargin(row,layer){
 if(layer==='2024')return row.m24;
 if(layer==='2020')return row.m20;
 if(layer==='swing')return Number.isFinite(row.m24)&&Number.isFinite(row.m20)?row.m24-row.m20:null;
 if(layer==='senate')return row.senate;
 if(layer==='governor')return row.governor;
 return null;
}
function countyInformation(row){
 if(!row)return 'Select a county to see historical voting and conditional statewide race estimates.';
 const format=(x)=>Number.isFinite(x)?margin(x)+' points':'Unavailable';
 return '<strong>'+esc(row.name)+' County</strong> · FIPS '+esc(row.id)+
 '<div class="ed-split" style="margin-top:8px;gap:8px;font-size:12px"><div>2020 presidential: <strong>'+esc(format(row.m20))+'</strong><div>2024 presidential: <strong>'+esc(format(row.m24))+'</strong></div></div>'+
 '<div>2026 Senate scenario: <strong>'+esc(format(row.senate))+'</strong><div>2026 governor scenario: <strong>'+esc(format(row.governor))+'</strong></div></div></div>'+
 '<p class="ed-mini">Scenario figures allocate a statewide estimated margin using 2020/2024 presidential voting. They are not county surveys or counted 2026 votes.</p>'+
  (()=>{const o=$('nightCountyOffice')?.value||'Senate',v=window.ERVIN_COUNTY_DATA?.get(code,o)?.get(row.id);
  return v?'<p><strong>UNOFFICIAL '+esc(o)+' votes:</strong> D '+fmt(v.dem)+' · R '+fmt(v.rep)+' · Other '+fmt(v.other)+' · '+esc(v.asOf)+'</p><a href="'+safeURL(v.url)+'" target="_blank" rel="noopener noreferrer">Original reported county source</a>':
   '<p class="ed-mini"><strong>2026 '+esc(o)+' votes:</strong> No independently verified county returns. Missing results are not zero votes.</p><a href="'+safeURL(window.ERVIN_COUNTY_DATA?.source(row.id))+'" target="_blank" rel="noopener noreferrer">Original election authority</a>'})();
}
function updateCountyViewport(){
 const w=900/mapZoom,h=580/mapZoom,cx=Math.max(w/2,Math.min(900-w/2,mapCenter.x)),cy=Math.max(h/2,Math.min(580-h/2,mapCenter.y));
 $('countyMap').setAttribute('viewBox',[(cx-w/2).toFixed(2),(cy-h/2).toFixed(2),w.toFixed(2),h.toFixed(2)].join(' '));
}
function countyZoom(factor){mapZoom=Math.max(1,Math.min(7,mapZoom*factor));updateCountyViewport();}
function drawCounties(){
 const layer=$('countyLayer').value,reportView=layer==='reported'||layer==='compare',
  office=$('nightCountyOffice')?.value||(''+layer==='governor'?'Governor':'Senate'),
  returns=window.ERVIN_COUNTY_DATA?.get(code,office)||new Map();
 const surface=$('countyMap'),data=countyShape;
 if(!data){$('countyStatus').textContent='County geography unavailable · Reload map';$('countyStatus').classList.add('is-warning');surface.replaceChildren();return;}
 const byId=new Map(cachedCountyRows.map(r=>[r.id,r]));
 window.ERVIN_GEO.draw(surface,data,{kind:'counties',className:'county',onSelect:(el,f)=>{
  const id=String(f.id).padStart(5,'0');selectedCounty=id;
  for(const x of surface.querySelectorAll('path.county'))x.classList.toggle('is-selected',x.dataset.fips===id);
  $('countyInspector').innerHTML=countyInformation(byId.get(id));
  window.ERVIN_COUNTY_DATA?.inspect?.(id);
 }});
 updateCountyViewport();
 const visiblePaths=surface.querySelectorAll('path.county').length;
 $('countyStatus').textContent=visiblePaths+' county outlines · '+stateName(code)+(reportView?' · '+returns.size+' counties with reported results':'');
 $('countyStatus').classList.toggle('is-warning',visiblePaths!==data.features.length);
 let colored=0,reported=0,projected=0;
 for(const p of surface.querySelectorAll('path.county')){
  const id=String(p.dataset.fips).padStart(5,'0'),r=byId.get(id),row=returns.get(id);
  const actual=row&&row.dem+row.rep+row.other>0?100*(row.dem-row.rep)/(row.dem+row.rep+row.other):null;
  const scenario=r?activeCountyMargin(r,office==='Senate'?'senate':'governor'):null;
  const v=layer==='reported'?actual:layer==='compare'?(Number.isFinite(actual)?actual:scenario):r?activeCountyMargin(r,layer):null;
  p.style.fill=Number.isFinite(v)?v>=0?(Math.abs(v)>=15?'#3b82ac':'#9bbfd6'):(Math.abs(v)>=15?'#b45463':'#dca0a4'):'#cfd7da';
  p.style.fillOpacity=layer==='compare'&&!Number.isFinite(actual)?'.45':'1';
  p.style.strokeDasharray=layer==='compare'&&!Number.isFinite(actual)?'3 2':'';
  p.dataset.countyReported=Number.isFinite(actual)?'true':'false';
  if(Number.isFinite(v))colored++;
  if(reportView&&Number.isFinite(actual))reported++;
  if(layer==='compare'&&!Number.isFinite(actual)&&Number.isFinite(scenario))projected++;
  p.setAttribute('aria-label',String(p.dataset.name)+' County · '+(reportView?
   Number.isFinite(actual)?'UNOFFICIAL reported '+margin(actual)+' · projected '+margin(scenario):
   layer==='compare'?'No verified votes; faded conditional forecast '+margin(scenario):'Awaiting independently verified counts':
   Number.isFinite(v)?margin(v)+' forecast / historical points':'No comparable figure'));
  const title=p.querySelector('title');if(title)title.textContent=p.getAttribute('aria-label');
  p.classList.toggle('is-selected',selectedCounty===id);
 }
 $('countySourceLabel').textContent=layer==='reported'?'UNOFFICIAL reported '+office+' results · '+reported+' counties; gray means awaiting verified data':
  layer==='compare'?'Reported '+office+' results '+reported+' counties · '+projected+' counties show faded conditional forecasts':
  layer==='senate'?'Conditional Ervin Senate scenario · '+colored+' counties':
  layer==='governor'?'Conditional governor scenario · '+colored+' counties':
  layer==='neutral'?'Geographic outlines only':layer==='swing'?'Change in two-party presidential margin · '+colored+' counties':
  layer+' presidential results · '+colored+' counties';
 $('countyInspector').innerHTML=countyInformation(cachedCountyRows.find(r=>r.id===selectedCounty));
 renderCountyTable();
}
function renderCountyTable(){
 const query=$('countyTableFind').value.trim().toLowerCase(),layer=$('countyLayer').value;
 const rows=cachedCountyRows.filter(r=>r.name.toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name));
 const preferred=layer==='senate'?'senate':layer==='governor'?'governor':getSen()?'senate':getGov()?'governor':null;
 $('scenarioExplanation').textContent=layer==='reported'?'Reported mode contains only validated unofficial county vote totals linked to an election authority. Missing source data stays blank.':layer==='compare'?'Comparison displays verified vote leaders over the pre-election county scenarios. Unreported counties remain faded, never counted.':preferred==='senate'?'Conditional Senate county scenario from the Ervin statewide margin; not independent county polling.':preferred==='governor'?'Conditional governor scenario (state historical adjustment where supported, publisher margin otherwise); not independent county polling.':'No comparable statewide 2026 margin to allocate; showing presidential history only.';
 const office=$('nightCountyOffice')?.value||'Senate',counted=window.ERVIN_COUNTY_DATA?.get(code,office)||new Map();
 $('countyTableBody').innerHTML=rows.map(r=>{const actual=counted.get(r.id),u=actual?.url||window.ERVIN_COUNTY_DATA?.source(r.id);
  return '<tr><td>'+esc(r.name)+'</td><td>'+esc(margin(r.m24))+'</td><td>'+esc(margin(r[office.toLowerCase()]))+'</td><td>'+(actual?fmt(actual.dem)+' / '+fmt(actual.rep):'Unreported')+'</td><td><a href="'+safeURL(u)+'" target="_blank" rel="noopener noreferrer">'+(actual?'Original report':'Election office')+'</a></td></tr>'}).join('')||'<tr><td colspan="5">No matching counties.</td></tr>';
 $('countyCount').textContent=fmt(cachedCountyRows.length)+' county-equivalent geographic shapes';
}
function countyCSV(){
 const select=getSen()?'senate':getGov()?'governor':null;
 const rows=[['County','FIPS','2020 presidential D-R','2024 presidential D-R','Conditional 2026 Senate D-R','Conditional 2026 Governor D-R'],...cachedCountyRows.map(r=>[r.name,r.id,r.m20??'',r.m24??'',r.senate??'',r.governor??''])];
 const csv=rows.map(items=>items.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='ervin-'+code+'-county-context.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadCountyMap(reload=false){
 const generation=++countyToken;
 $('countyInspector').textContent='Loading '+stateName(code)+' county geography…';
 $('countyStatus').textContent='Retrieving '+stateName(code)+' county boundaries…';
 $('countyStatus').classList.remove('is-warning');
 try{
  const shape=await window.ERVIN_GEO.get(code,'counties',{refresh:reload});
  if(generation!==countyToken)return;
  countyShape=shape;selectedCounty=null;mapZoom=1;mapCenter={x:450,y:290};
   try{buildScenario();}catch(scenarioError){
    console.warn('County context unavailable; rendering outlines first',scenarioError);
    countyScenario={senate:{map:new Map()},governor:{map:new Map()}};
    cachedCountyRows=shape.features.map(x=>({id:String(x.id).padStart(5,'0'),name:String(x.properties?.name||'County '+x.id),m24:null,m20:null,senate:null,governor:null}));
   }
  $('countySuggestions').innerHTML=shape.features.map(x=>'<option value="'+esc(x.properties?.name||'')+'"></option>').join('');
  drawCounties();
 }catch(e){if(generation!==countyToken)return;countyShape=null;$('countyStatus').textContent='County map failed to load · Try Reload map';$('countyStatus').classList.add('is-warning');$('countyInspector').textContent='Map loading problem: '+e.message+'. Use Reload map to retry.';}
}
function initCountyControls(){
 $('countyZoomIn').onclick=()=>countyZoom(1.65);
 $('countyZoomOut').onclick=()=>countyZoom(1/1.65);
 $('countyZoomReset').onclick=()=>{mapZoom=1;mapCenter={x:450,y:290};updateCountyViewport();};
 const updateMode=()=>{const v=$('countyLayer').value;for(const b of document.querySelectorAll('[data-county-view]'))b.setAttribute('aria-pressed',String(b.dataset.countyView===(v==='reported'?'reported':v==='compare'?'compare':'forecast')))};
 $('countyLayer').onchange=()=>{countyChosenByUser=true;const v=$('countyLayer').value,o=$('nightCountyOffice');if(o&&['senate','governor'].includes(v)&&o.value!==v[0].toUpperCase()+v.slice(1)){o.value=v[0].toUpperCase()+v.slice(1);o.dispatchEvent(new Event('change'))}updateMode();drawCounties()};
 for(const b of document.querySelectorAll('[data-county-view]'))b.addEventListener('click',()=>{const view=b.dataset.countyView;const layer=$('countyLayer');layer.value=view==='forecast'?($('nightCountyOffice')?.value||'Senate').toLowerCase():view;layer.dispatchEvent(new Event('change',{bubbles:true}));});
 updateMode();
 $('countyTableFind').oninput=renderCountyTable;
 $('countyCSV').onclick=countyCSV;
 $('countyRetry').onclick=()=>loadCountyMap(true);
 window.addEventListener('ervin:county-results-update',e=>{if(e.detail.code===code&&countyShape)drawCounties()});
 $('countySearch').oninput=e=>{const input=e.target.value.trim().toLowerCase().replace(/ county$/,'');const hit=cachedCountyRows.find(x=>x.name.toLowerCase()===input);if(hit){selectedCounty=hit.id;drawCounties();const path=$('countyMap').querySelector('path[data-fips="'+hit.id+'"]');if(path){const box=path.getBBox?.();if(box&&box.width>0&&box.height>0){mapZoom=Math.min(6,Math.max(1,Math.min(900/Math.max(box.width*4,15),580/Math.max(box.height*4,15))));mapCenter={x:box.x+box.width/2,y:box.y+box.height/2};updateCountyViewport();}}}};
}
function toneRating(r){
 const c=String(getModel(r)?.modelRating||r?.rating||'').toLowerCase();
 const grade=/^(solid|likely|lean|tilt) ([dr])$/.exec(c);
 if(!grade)return c==='tossup'?'var(--ed-grade-toss)':'var(--ed-map-neutral,#9cacb8)';
 return 'var(--ed-grade-'+(grade[1]==='tilt'?'lean':grade[1])+'-'+grade[2]+')';
}
function getModel(r){return houseScenario.races?.[r?.id]||null;}
const modeledMargin=m=>Number.isFinite(m)?(Math.abs(m)>=49.999?(m>0?'D +50 or more':'R +50 or more')+' (model cap)':Math.abs(m)<.05?'Even':(m>0?'D +':'R +')+Math.abs(m).toFixed(1)):'Not estimated';
const formatHouseYear=(v,y)=>!v?'No comparable '+y+' return available':y+' House: D '+fmt(v.D)+' · R '+fmt(v.R)+' · '+modeledMargin(v.margin)+(v.contested?'':' · uncontested/limited');
function candidateRosterCard(r){
 const row=houseRoster.races?.[r.id],people=row?.candidates||[];
 if(!people.length)return '<div class="ed-notice" style="margin:14px 0">2026 general-election candidate roster not confirmed for this district. The historical incumbent is not necessarily on the ballot.</div>';
 const label=p=>p==='D'?'Democratic':p==='R'?'Republican':p==='I'?'Independent':p==='L'?'Libertarian':p==='G'?'Green':p;
 const html=people.map(c=>{
  const color=c.party==='D'?'#3f82c2':c.party==='R'?'#cc5060':'#8595a4';
  return '<article class="ed-coverage" style="margin:6px 0;padding:10px 12px;border-left:3px solid '+color+'"><div><strong>'+esc(c.name)+'</strong><small>'+esc(label(c.party))+(c.incumbent?' · Incumbent':'')+'</small></div><a href="'+safeURL(c.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Candidate source</a></article>';
 }).join('');
 return '<div class="ed-cap" style="margin-top:19px">2026 general-election candidates · '+people.length+' listed</div><div class="ed-house-surveys">'+html+'</div><p class="ed-mini">Listed in public general-election directories; the state election office remains the final ballot authority. The list is not a certified race call or polling input.</p>';
}
function renderDistrictDetail(r){
 if(!r)return;selectedDistrict=r;
 const model=getModel(r),rating=model?.modelRating||r.rating||'No model rating available';
 const p=housePolls[r.id],indexed=coverage.house?.districts?.[r.id],verified=houseVerified.races?.[r.id]||[];
 const historicalHouse=historicalError?.house?.unchangedDistrictHoldout;
 const historicalP90=Number(historicalHouse?.p90Abs);
 const comparableHistorical=model&&!model.changed2026Map&&Number.isFinite(historicalP90);
 const historicalDisplay=model?.changed2026Map?'Not comparable':comparableHistorical?'±'+historicalP90.toFixed(1)+' pts':'Unverified';
 const historicalDetail=model?.changed2026Map?'Redrawn boundaries: historic 2022→24 district errors do not apply':comparableHistorical?'90th percentile absolute historical 2022→24 margin error · '+historicalHouse.n+' comparable districts · not 2026 MOE':'Insufficient comparable archived historical results';
 $('districtTitle').textContent=r.state+' District '+Number(r.district);
 const source='<div class="ed-kicker">2026 HOUSE ELECTION · '+esc(r.id)+'</div>';
 const currentPres=model?.presidentialBaseline||{};
 const presInfo=model?'<p class="ed-mini"><strong>District presidential voting on the current congressional boundaries:</strong> 2024 '+esc(modeledMargin(currentPres.pres2024MarginD))+'; 2020 '+esc(modeledMargin(currentPres.pres2020MarginD))+'; national-centered district lean '+esc(modeledMargin(currentPres.districtLeanD))+'. '+(currentPres.estimatedVoteAllocation?'Historical precinct/block votes RECONSTRUCTED for the 2026 district. These are model-derived allocations, not certified vote totals.':'Historical election voting normalized to currently comparable congressional boundaries.')+' <a href="'+safeURL(currentPres.sourceUrl||'https://www.census.gov')+'" target="_blank" rel="noopener noreferrer">Source and methods</a>.</p>':'';
 const top=model?
 '<div class="ed-house-grade"><div><small>ERVIN HOUSE · 2026 DISTRICT MODEL</small><strong>'+esc(model.modelRating)+'</strong><span>'+(Number.isFinite(model.marginD)?'Modeled D−R margin: '+esc(modeledMargin(model.marginD)):'Special candidate ballot · qualitative '+esc(model.modelRating))+'</span></div><div><small>HISTORICAL ERROR EVIDENCE</small><strong>±'+esc(model.uncertaintySensitivity.toFixed(1))+' pts</strong><span>Scenario sensitivity, not a calibrated confidence interval; +8 points of uncertainty for reconstructed redrawn-district presidential votes</span></div></div>'+
 '<div class="ed-house-minigrid"><div><small>Comparable poll rows used</small><strong>'+fmt(model.pollEvidence)+'</strong></div><div><small>Published poll count in index</small><strong>'+fmt(model.publishedSurveyCount)+'</strong></div><div><small>Independent Cook rating</small><strong>'+esc(model.sourceRating||'Not stored')+'</strong></div></div>'+
 '<p class="ed-mini">'+esc(model.methodNote)+'</p>'+presInfo+
 (model.changed2026Map?'<p class="ed-notice">Redrawn district: this map uses official 2026 Census congressional boundaries. Its historical presidential vote shares were reconstructed for the new electorate; do not interpret older House votes under this district number as comparable results. The extra modeling uncertainty is shown above.</p>':'')+
 (Number.isFinite(model.marginD)?'<details class="ed-model-math"><summary>How the House estimate was calculated</summary><div class="ed-model-calculation"><p>House-only district presidential lean: <strong>'+esc(modeledMargin(currentPres.districtLeanD))+'</strong> · National congressional generic ballot <strong>'+esc(modeledMargin(model.generic2026D))+'</strong> · Historical presidential coefficient <strong>'+esc(model.historicalModelCoefficient)+'</strong>.</p><p>Historically tested repeat-candidate House correction: <strong>'+esc(modeledMargin(model.candidateEffectD||0))+'</strong> · '+esc(model.candidateSource||'none')+'. No statewide Senate/governor polling-error term.</p><p>House-only baseline <strong>'+esc(modeledMargin(model.fundamentalsD))+'</strong> · Comparable candidate-matched survey mean <strong>'+esc(modeledMargin(model.pollMeanD))+'</strong> · Survey blending weight <strong>'+esc(Math.round(model.pollWeight*100))+'%</strong> · Final model <strong>'+esc(modeledMargin(model.marginD))+'</strong>.</p><p>Retrospective House history for context (NOT a basis for redrawn-seat numbers): '+esc(formatHouseYear(model.historic?.['2022'],'2022'))+'; '+esc(formatHouseYear(model.historic?.['2024'],'2024'))+'.</p><p><a href="../research/house-presidential-backtest-2026.json">House-only chronological backtest: 2018/22 development, 2024 holdout</a>. Sensitivity is not a calibrated election probability.</p></div></details>':'<p class="ed-notice">Candidate-ballot exception: a two-party numerical scenario would be misleading here. The source Cook rating is displayed instead; district presidential votes are contextual history only.</p>'):
 '<div class="ed-stat" style="margin:14px 0"><small>Current rating</small><strong>'+esc(r.rating||'Not available')+'</strong></div><p class="ed-notice">The independent House source archive is unavailable; do not interpret missing model values as results.</p>';
 const rows=model?.surveys||[];
 const questions=houseQuestions.races?.[r.id]||[];
 const additional=questions.length?'<details class="ed-model-math ed-question-archive"><summary>Browse '+fmt(questions.length)+' additional public poll questions (with candidate names and sample sizes)</summary><p class="ed-mini">Additional archived matchup questions—not independent surveys and not inputs to the numerical Ervin model. The same poll ID may contain several hypothetical candidate matchups. Some questions are from 2025 or feature independent candidates, so do not treat each as an election-day candidate comparison.</p><div class="ed-house-surveys">'+questions.map(q=>'<article class="ed-coverage"><div><strong>'+esc(q.pollster||'Poll')+'</strong><small>'+esc(q.date||'Date unknown')+' · '+(Number.isFinite(q.sampleSize)?fmt(q.sampleSize)+' respondents · ':'')+'poll ID '+esc(q.pollId||'not provided')+'</small><small>'+esc(q.demCandidate||'D')+' '+esc(Number.isFinite(q.dem)?q.dem+'%':'—')+' / '+esc(q.repCandidate||'R')+' '+esc(Number.isFinite(q.rep)?q.rep+'%':'—')+(q.otherCandidate?' / '+esc(q.otherCandidate)+' '+esc(Number.isFinite(q.otherShare)?q.otherShare+'%':'—'):'')+'</small><small>Archived question · not separately counted in Ervin model</small></div><a href="'+safeURL(q.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Question data</a></article>').join('')+'</div><p class="ed-mini"><a href="'+safeURL(houseQuestions.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source dataset and compilation context</a> · Multiple rows can refer to one underlying poll. Refer to the original poll release for questionnaire and methodology.</p></details>':'';
 const surveyMarkup=rows.length?'<div class="ed-cap" style="margin-top:18px">Public surveys · '+fmt(rows.length)+' locally identified records</div>'+
 '<div class="ed-house-surveys">'+rows.map(v=>{
  const comparable=v.compatible&&Number.isFinite(v.dem)&&Number.isFinite(v.rep);
  return '<article class="ed-coverage"><div><strong><a href="'+safeURL(v.url)+'" target="_blank" rel="noopener noreferrer">'+esc(v.pollster||'Public survey')+'</a></strong><small>'+esc(v.date||'Date not confirmed')+' · '+esc(v.kind||v.source||'Public listing')+'</small><small>'+esc(v.matchup||((v.demCandidate||'D')+' '+(Number.isFinite(v.dem)?v.dem+'%':'—')+' · '+(v.repCandidate||'R')+' '+(Number.isFinite(v.rep)?v.rep+'%':'—')))+'</small><small>'+esc(v.note||'Verify poll methodology and sponsor in original release.')+'</small></div><div><strong>'+esc(comparable?modeledMargin(v.dem-v.rep):'Different ballot')+'</strong><small>'+(comparable?'D/R comparison':'Excluded from model')+'</small></div></article>';
 }).join('')+'</div>':
 '<p class="ed-notice">No individual survey records currently available in the local poll archive. The model uses history and the national environment, not invented district polling.</p>';
 const indexText=model?.publishedSurveyCount||indexed?.count||0;
 const caveat='<p class="ed-mini">The survey directory may index '+fmt(indexText)+' polls for this district, but only '+fmt(rows.length)+' identifiable local entries are displayed here. Original releases, sponsors and ranked-choice/same-party ballot structures may differ. A directory count is not a poll average.</p>';
 const links='<div class="ed-source-links"><a href="'+safeURL(model?.pollDirectoryLink||p?.url||'https://peoplespoll.com/house')+'" target="_blank" rel="noopener noreferrer">Full published district poll directory</a><a href="https://www.cookpolitical.com/ratings/house-race-ratings" target="_blank" rel="noopener noreferrer">Cook comparison ratings</a><a href="https://electiondata.dev/datasets/house-results/" target="_blank" rel="noopener noreferrer">2022/2024 House returns</a><a href="#stateResults">State Desk source audit and reported returns</a></div>';
 $('districtDetail').innerHTML=source+top+candidateRosterCard(r)+(houseRoster.races?.[r.id]?.candidates?.some(c=>c.incumbent===true)?'<p class="ed-mini"><strong>2026 incumbent listed:</strong> '+esc(houseRoster.races[r.id].candidates.filter(c=>c.incumbent===true).map(c=>c.name).join(', '))+' · attributed public candidate directory, not state ballot certification.</p>':r.incumbent?'<p class="ed-mini"><strong>Prior officeholder in research index:</strong> '+esc(r.incumbent)+' · their 2026 candidacy is not assumed.</p>':'')+surveyMarkup+additional+caveat+links;
 $('districtButtons').querySelectorAll('button[data-district]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.district===r.district)));
 $('districtMap').querySelectorAll('path.geo-district').forEach(path=>path.classList.toggle('is-selected',String(path.dataset.district).padStart(2,'0')===String(r.district).padStart(2,'0')));
 $('districtSelect').value=String(r.district);
 $('districtMapStatus').textContent=r.id+' · '+rating+' · '+(model?(Number.isFinite(model.marginD)?modeledMargin(model.marginD):'No comparable current-map numerical estimate')+' · '+fmt(model.publishedSurveyCount)+' indexed public polls':verified.length+' new listings');
 const dest='#house-'+Number(r.district);if(location.hash!==dest)history.replaceState(null,'',location.pathname+location.search+dest);
}
function updateDistrictViewport(){
 const w=900/houseZoom,h=580/houseZoom,cx=Math.max(w/2,Math.min(900-w/2,houseCenter.x)),cy=Math.max(h/2,Math.min(580-h/2,houseCenter.y));
 $('districtMap').setAttribute('viewBox',[(cx-w/2).toFixed(2),(cy-h/2).toFixed(2),w.toFixed(2),h.toFixed(2)].join(' '));
}
function initDistrictButtons(){
 const select=$('districtSelect');
 select.innerHTML=stateHouse.map(r=>'<option value="'+esc(r.district)+'">'+esc(code)+'–'+Number(r.district)+(getModel(r)?' · '+esc(getModel(r).modelRating):r.rating?' · '+esc(r.rating):'')+'</option>').join('');
 select.onchange=e=>{const r=getDistrict(e.target.value);if(r)renderDistrictDetail(r);};
 $('districtButtons').hidden=true;$('districtButtons').replaceChildren();
 houseZoom=1;houseCenter={x:450,y:290};
 $('districtZoomIn').onclick=()=>{houseZoom=Math.min(7,houseZoom*1.6);updateDistrictViewport();};
 $('districtZoomOut').onclick=()=>{houseZoom=Math.max(1,houseZoom/1.6);updateDistrictViewport();};
 $('districtZoomReset').onclick=()=>{houseZoom=1;houseCenter={x:450,y:290};updateDistrictViewport();};
}
async function loadHouseMap(reload=false){
 const token=++houseToken;
 try{
  const shape=await window.ERVIN_GEO.get(code,'districts',{refresh:reload});if(token!==houseToken)return;
  districtShape=shape;const map=$('districtMap');
  window.ERVIN_GEO.draw(map,shape,{kind:'districts',className:'geo-district',onSelect:(el,f)=>{const r=getDistrict(f.id);if(r)renderDistrictDetail(r);}});
   updateDistrictViewport();
  for(const path of map.querySelectorAll('path.geo-district')){
   const r=getDistrict(path.dataset.district);path.style.fill=toneRating(r);path.querySelector('title').textContent=(r?.id||'District')+' · '+(getModel(r)?.modelRating||r?.rating||'Rating unavailable')+' · click to inspect';
    path.setAttribute('aria-label',(r?.id||'District')+' — '+(getModel(r)?.modelRating||r?.rating||'No model rating')+', open district report');
    path.addEventListener('pointerenter',()=>{$('districtMapStatus').textContent=(r?.id||'District')+' · '+(r?.rating||'No published rating')+' · tap to inspect';});
    path.addEventListener('pointerleave',()=>{if(selectedDistrict)$('districtMapStatus').textContent=selectedDistrict.id+' · select another district on the map';});
  }
  const requested=location.hash.match(/^#house-(\d{1,2})$/)?.[1];renderDistrictDetail(getDistrict(requested)||selectedDistrict&&getDistrict(selectedDistrict.district)||stateHouse[0]);
 }catch(e){$('districtMapStatus').classList.add('is-warning');$('districtMapStatus').textContent='District map unavailable — use district selector';$('districtDetail').textContent='Map failed: '+e.message+'. Choose a district by number above.';}
}
function listPolls(data,asOf,limit=12){
 const entries=Array.isArray(data)?data.filter(p=>Number.isFinite(+p.margin)):[];
 const seen=new Set(),clean=[];
 for(const p of entries){
  const pollster=String(p.pollster||'').toLowerCase().replace(/(new york times|nyt|cbs news|cnn|\bssrs\b|\bresearch\b|siena|mitchell|\/)/g,' ').trim();
  const family=/siena/i.test(p.pollster||'')?'siena':/ssrs/i.test(p.pollster||'')?'ssrs':/mitchell/i.test(p.pollster||'')?'mitchell':pollster;
  const end=String(p.fieldEnd||p.date||p.dates||p.publishedAt||'');
  const key=family+'|'+end+'|'+Number(p.margin).toFixed(2);
  if(seen.has(key))continue;seen.add(key);clean.push(p);
 }

 return clean.sort((a,b)=>Date.parse(b.fieldEnd||b.publishedAt||b.date||0)-Date.parse(a.fieldEnd||a.publishedAt||a.date||0)).slice(0,limit).map(p=>'<article class="ed-coverage"><div><strong><a href="'+safeURL(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.pollster||'Survey')+'</a></strong><small>'+esc(p.date||p.dates||'Field date unknown')+' · '+esc(p.sample||'Sample details unverified')+'</small></div><strong>'+esc(margin(+p.margin))+'</strong></article>').join('');
}
function renderTexasGovernorSources(){
 if(!texasGovAverages?.averages?.length)return '<p class="ed-mini">Texas governor publisher average comparison is loading. Individual surveys remain available below.</p>';
 const a=texasGovAverages,rows=(texasGovSurveys.polls||[]).slice().sort((x,y)=>y.fieldEnd.localeCompare(x.fieldEnd));
 const src='<div class="ed-cap" style="margin-top:19px">Texas Governor · Publisher averages (November 1 snapshot)</div>'+
 '<div class="ed-poll-detail"><h3>Publisher averages</h3><p class="ed-mini">Greg Abbott (R) vs. Gina Hinojosa (D). Publisher calculations are separate from one another and from the Ervin model. The same individual polls often appear in several averages.</p>'+
 '<div class="ed-table-wrap"><table class="ed-table ed-tx-source-table"><thead><tr><th>Source</th><th>Hinojosa (D)</th><th>Abbott (R)</th><th>Lead</th><th>Source quality</th></tr></thead><tbody>'+
 a.averages.map(x=>'<tr><td><a href="'+safeURL(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.publisher)+'</a></td><td>'+esc(x.dem.toFixed(1))+'%</td><td>'+esc(x.rep.toFixed(1))+'%</td><td><strong>'+esc(margin(x.margin))+'</strong></td><td><small>'+esc(x.kind)+'</small></td></tr>').join('')+
 '</tbody></table></div><p class="ed-mini">Silver Bulletin and FiftyPlusOne values are attributed to a secondary aggregation table, not independently retrieved original feeds. They are labeled separately rather than silently incorporated into the Ervin model.</p>'+
 '<p class="ed-mini"><a href="'+safeURL(a.aggregateOfAggregates.url)+'" target="_blank" rel="noopener noreferrer">Wikipedia publisher-average comparison</a> · reported comparison reference: '+esc(margin(a.aggregateOfAggregates.margin))+'. This is not counted as another independent polling source.</p></div>';
 const surveys='<div class="ed-cap" style="margin-top:19px">Individual polling ledger · '+fmt(rows.length)+' verified published matchups</div>'+
 '<div class="ed-poll-detail"><h3>Recent Texas governor surveys</h3><p class="ed-mini">Selected recent candidate-matched polls (field-end date as reported by linked publisher). Polls from the same firm or sponsor are not automatically independent observations.</p>'+
 '<div class="ed-table-wrap"><table class="ed-table ed-tx-source-table"><thead><tr><th>Survey</th><th>Field end</th><th>Sample</th><th>Hinojosa (D)</th><th>Abbott (R)</th><th>Lead</th></tr></thead><tbody>'+
 rows.map(x=>'<tr><td><a href="'+safeURL(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.pollster)+'</a></td><td>'+esc(x.fieldEnd)+'</td><td>'+esc(x.sample)+'</td><td>'+esc(x.dem)+'%</td><td>'+esc(x.rep)+'%</td><td><strong>'+esc(margin(x.margin))+'</strong></td></tr>').join('')+
 '</tbody></table></div></div>';
 return src+surveys;
}
function renderPolls(){
 const localSenate=senatePolls[code]||[],localGov=govPolls[code]||[],gov=getGov(),verified=siena.races?.[code];
 const indexedSen=coverage.senate?.states?.[code],indexedGov=coverage.governor?.states?.[code];
 const sourceNotice=(index,url,type)=>index?'<div class="ed-coverage ed-index"><div><strong><a href="'+safeURL(url)+'" target="_blank" rel="noopener noreferrer">'+esc(type)+' polling index</a></strong><small>'+fmt(index.count)+' published poll(s) indexed by the publisher. Summary: '+esc(index.summary)+' · does not replace individual polls or Ervin forecast.</small></div><span class="ed-pill">Index</span></div>':'';
 let senateContent=statewideLatest.senate?.[code]?.length?'<div class="ed-cap">Senate · November 2 publisher listings</div>'+listPolls(statewideLatest.senate[code],null,7):'';
  senateContent+=verified?.senate?'<div class="ed-cap">Primary-source Senate release · Nov 1</div>'+listPolls([verified.senate],null,1):'';
 senateContent+=localSenate.length?'<div class="ed-cap">Senate · earlier indexed individual surveys ('+fmt(localSenate.length)+')</div>'+listPolls(localSenate,null,14):'';
 senateContent+=sourceNotice(indexedSen,coverage.senate?.source,'Senate');
 let govContent=statewideLatest.governor?.[code]?.length?'<div class="ed-cap" style="margin-top:14px">Governor · November 2 publisher listings</div>'+listPolls(statewideLatest.governor[code],null,7):'';
  govContent+=verified?.governor?'<div class="ed-cap" style="margin-top:14px">Primary-source governor release · Nov 1</div>'+listPolls([verified.governor],null,1):'';
 govContent+=gov?'<div class="ed-cap" style="margin-top:14px">Governor · published average</div><div class="ed-coverage"><div><strong><a href="'+safeURL(gov.poll?.url)+'" target="_blank" rel="noopener noreferrer">Published statewide governor average</a></strong><small>'+esc(gov.poll?.count||'Unknown')+' underlying surveys; methodology belongs to publisher</small></div><strong>'+esc(margin(gov.poll?.margin))+'</strong></div>':'';
 if(localGov.length)govContent+='<div class="ed-cap" style="margin-top:14px">Governor · individual surveys ('+fmt(localGov.length)+')</div>'+listPolls(localGov,null,14);
 govContent+=sourceNotice(indexedGov,coverage.governor?.source,'Governor');
 $('pollStatewide').innerHTML=senateContent+(code==='TX'?renderTexasGovernorSources():'')+govContent||'<div class="ed-empty">No comparable statewide polling found in the linked data sources for this state. The race may still have unindexed polls.</div>';
 const polled=stateHouse.filter(x=>housePolls[x.id]||houseVerified.races?.[x.id]?.length||coverage.house?.districts?.[x.id]);
 const h=polled.map(x=>({seat:x,poll:housePolls[x.id],recent:houseVerified.races?.[x.id]?.[0],index:coverage.house?.districts?.[x.id]})).sort((a,b)=>((b.recent?.date||b.poll?.date||'').localeCompare(a.recent?.date||a.poll?.date||'')));
 $('pollHouse').innerHTML=h.length?h.map(({seat,poll,recent,index})=>'<div class="ed-coverage"><div><strong><button class="ed-inline-race" type="button" data-poll-district="'+esc(seat.district)+'">'+esc(seat.id)+'</button> · '+esc(recent?.pollster||poll?.pollster||'Poll directory')+'</strong><small>'+(recent?esc(recent.date)+' · new sourced survey':poll?esc(poll.date)+' · earlier survey':'Published poll index only')+(index?' · '+fmt(index.count)+' indexed polls':'')+'</small></div><strong>'+esc(recent?margin(recent.margin):poll?margin(poll.margin):index?.summary||'Published')+'</strong></div>').join(''):'<div class="ed-empty">No public House polling listed for this state in the connected indexes.</div>';
 $('pollHouse').innerHTML+='<p class="ed-mini"><a href="'+safeURL(coverage.house?.source||'https://www.poliwave.com/us/fed/polls')+'" target="_blank" rel="noopener noreferrer">Broader House polling index</a> · <a href="https://peoplespoll.com/house" target="_blank" rel="noopener noreferrer">Original/public House poll links</a> · <a href="https://www.realclearpolling.com/latest-polls/house" target="_blank" rel="noopener noreferrer">RCP individual polls</a>. Aggregates and surveys can overlap; partisan sponsors are not independently verified. '+esc(pollingWarning)+'</p>';
 $('pollHouse').onclick=e=>{const b=e.target.closest('button[data-poll-district]');if(b){const r=getDistrict(b.dataset.pollDistrict);if(r){renderDistrictDetail(r);document.getElementById('stateHouse').scrollIntoView({behavior:'smooth',block:'start'});}}};
}
function stateCodeFromResultKey(k){return String(k).slice(0,2).toUpperCase();}
async function loadReturns(force=false){
 const now=Date.now();
 if(!force&&now-resultLast<60000)return;
 resultLast=now;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),11000);
 $('resultStatus').className='ed-inline-status';
 $('resultStatus').textContent='Checking civicAPI v2 and source-backed fallback reports';
 try{
  const core=window.ERVIN_RETURNS;
  if(!core)throw Error('Result validator not initialized');
  const urls=['../civicapi/races.json',...['Senate','Governor','House'].map(o=>'https://openamerica.io/elections/results.json?year=2026&office='+o)];
  const response=await Promise.allSettled(urls.map(async u=>{
   const v=await fetch(u,{cache:'no-store',signal:ctrl.signal});
   if(!v.ok)throw Error(u+' HTTP '+v.status);
   return v.json();
  }));
  const civic=response[0].status==='fulfilled'?core.civic(response[0].value):{};
  const fallback={};
  let working=0;
  for(let i=1;i<response.length;i++){
   if(response[i].status!=='fulfilled')continue;
   const rows=core.openAmerica(response[i].value,['Senate','Governor','House'][i-1]);
   if(Object.keys(rows).length){Object.assign(fallback,rows);working++}
  }
  const chosen=core.preferCivic(civic,fallback);
  const inState=Object.values(chosen.races).filter(row=>row.id.startsWith(code+'-'));
  $('resultRows').innerHTML=inState.length?inState.map(row=>{
   const sorted=row.candidates.slice().sort((a,b)=>b.votes-a.votes);
   const summary=sorted.slice(0,3).map(c=>c.name+' '+fmt(c.votes)).join(' · ');
   return '<article><strong>'+esc(row.office+' · '+row.id)+'</strong><small>'+esc(summary)+' · '+fmt(row.total)+' unofficial votes · '+esc(row.source)+' · '+esc(row.asOf)+'</small>'+
   (row.sourceURL?'<a href="'+safeURL(row.sourceURL)+'" target="_blank" rel="noopener noreferrer">Count provenance</a>':'')+'</article>';
  }).join(''):'<div class="ed-empty">No accepted 2026 vote totals for '+esc(stateName(code))+' in the published providers. This does not mean that zero votes have been counted.</div>';
  const civicCount=inState.filter(r=>r.source.includes('CivicAPI')).length;
  $('resultStatus').className='ed-inline-status'+(inState.length?' live':'');
  $('resultStatus').textContent=inState.length?inState.length+' contests with attributed returns · '+civicCount+' from CivicAPI':'Awaiting attributed current-election results';
  $('resultUpdated').textContent='Checked '+new Date().toLocaleTimeString()+' · CivicAPI primary, independent fallback if unavailable or behind · '+chosen.warnings.length+' held source discrepancies. This is a source audit, not a projection or race-call desk.';
 }catch(e){
  $('resultStatus').className='ed-inline-status stale';
  $('resultStatus').textContent='Source audit unavailable: '+String(e.message||e).slice(0,90);
  $('resultRows').innerHTML='<div class="ed-empty">Open the live Election Night dashboard or state election office for available counts.</div>';
 }finally{clearTimeout(timer)}
}
function officialLinks(){
 let links='<a href="https://www.nass.org/can-I-vote/state-election-officials" target="_blank" rel="noopener noreferrer">Directory of state election offices</a>';
 if(code==='MI')links+='<a href="../michigan/election-night/">Michigan clerk / county dashboard</a><a href="https://www.michigan.gov/sos/elections/election-results-and-data/voter-participation-dashboard" target="_blank" rel="noopener noreferrer">Official Michigan participation dashboard</a>';
 links+='<a href="https://openamerica.io/elections/api/" target="_blank" rel="noopener noreferrer">Results mirror coverage and methodology</a>';
 $('officialStateLinks').innerHTML=links;
}
async function display(next){
 const c=String(next||'MI').toUpperCase();code=byCode[c]?c:'MI';try{localStorage.setItem('ervin-last-state',code)}catch(_){};document.querySelectorAll('[data-election-night-state]').forEach(link=>link.href='../election-night/?state='+encodeURIComponent(code)+'#nationalBoard');window.dispatchEvent(new CustomEvent('ervin:state-edition',{detail:{code}}));
 selectedDistrict=null;countyShape=null;districtShape=null;cachedCountyRows=[];selectedCounty=null;countyToken++;houseToken++;
 stateHouse=house.filter(x=>x.code===code).sort((a,b)=>String(a.district).localeCompare(String(b.district)));
 renderLead();renderOverview();initDistrictButtons();renderPolls();officialLinks();
 countyChosenByUser=false;$('countyLayer').value=getSen()?'senate':getGov()?'governor':'2024';$('countyTableFind').value='';$('countySearch').value='';
 $('countyMap').replaceChildren();$('districtMap').replaceChildren();
 // Map and results start independently; slow polling metadata cannot block geographic boundaries.
 loadReturns(true);
 await Promise.allSettled([loadCountyMap(),loadHouseMap()]);
}
async function start(){
 try{
  const fetchJSON=async p=>{const fetchRaw=async()=>{const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw Error(p+' HTTP '+r.status);return r.json()};return window.ERVIN_FINAL?window.ERVIN_FINAL.get(p.replace(/^\.\.\//,''),fetchRaw):fetchRaw()};
  // The two small election registries initialize navigation; maps do not
  // depend on the Senate model, poll archives or historical results being reachable.
  const [h,g]=await Promise.all([fetchJSON('../house/data.json'),fetchJSON('../governors/data.json')]);
  house=h.seats||[];governors=g.races||[];
  prepareSelection();initCountyControls();$('houseMapReload').onclick=()=>loadHouseMap(true);$('reloadResults').onclick=()=>loadReturns(true);
  fetchJSON('../refresh_log.json').then(log=>{if(log.checkedAt){sourceTimeLabel='Updated '+new Date(log.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});$('headerDate').textContent=sourceTimeLabel;$('editionDate').textContent=sourceTimeLabel}}).catch(()=>{$('headerDate').textContent='Source update time unavailable'});
  const optionalFiles=[
   fetchJSON('../counties-watch/forecast-baselines.json'),
   window.ERVIN_SCENARIOS.load(),
   fetchJSON('../recent_polls.json'),
   fetchJSON('../governors/recent_verified_polls.json'),
   fetchJSON('../house/research-polls.json'),
   fetchJSON('../polling/coverage-2026-11-02.json'),
   fetchJSON('../polling/primary-seven-states-2026-11-01.json'),
    fetchJSON('../polling/house-verified-2026-11-02.json'),
    fetchJSON('../polling/latest-statewide-2026-11-02.json'),
    fetchJSON('../polling/texas-governor-publisher-averages-2026-11-02.json'),
    fetchJSON('../polling/texas-governor-surveys-2026-11-02.json'),
    fetchJSON('../house/ervin-forecast-2026-11-02.json'),
    fetchJSON('../house/poll-questions-2026-11-02.json'),
    fetchJSON('../research/governor-same-office-2014-2024.json'),
    fetchJSON('../house/candidates-2026.json'),
    fetchJSON('../research/election-night-historical-moe-2026.json')];
  const updated=Promise.allSettled(optionalFiles).then(results=>{
   const values=results.map((r,i)=>{if(r.status==='fulfilled')return r.value;console.warn('Optional State Desk data unavailable',i,r.reason);return null;});
   baselines=values[0]?.states||{};historical=values[1]||{counties:{}};
   senatePolls=values[2]?.polls||{};govPolls=values[3]?.states||{};housePolls=values[4]?.polls||{};
   coverage=values[5]||coverage;siena=values[6]||siena;houseVerified=values[7]||houseVerified;statewideLatest=values[8]||statewideLatest;texasGovAverages=values[9]||texasGovAverages;texasGovSurveys=values[10]||texasGovSurveys;houseScenario=values[11]||houseScenario;houseQuestions=values[12]||houseQuestions;houseRoster=values[14]||houseRoster;historicalError=values[15]?.version===1?values[15]:null;
   if(values[13]&&window.ERVIN_STATEWIDE){const cal=window.ERVIN_STATEWIDE.apply(values[13],{races:governors},{states:baselines});governorErvin=Object.fromEntries(cal.governor.map(g=>[g.code,g]));}
   if(!countyChosenByUser){
    $('countyLayer').value=getSen()?'senate':getGov()?'governor':'2024';
    if(countyShape)drawCounties();
   }

   pollingWarning=results.some(r=>r.status==='rejected')?'Some polling/history sources are unavailable; counts may be incomplete.':'';
   renderLead();renderOverview();renderPolls();
   if(countyShape){buildScenario();drawCounties();}
   if(districtShape){for(const path of $('districtMap').querySelectorAll('path.geo-district')){const r=getDistrict(path.dataset.district);path.style.fill=toneRating(r);path.querySelector('title').textContent=(r?.id||'District')+' · '+(getModel(r)?.modelRating||r?.rating||'Rating unavailable');}}
    if(selectedDistrict)renderDistrictDetail(selectedDistrict);
  }).catch(e=>{console.warn('State desk optional data refresh',e);});
  await display(new URLSearchParams(location.search).get('state')||'MI');
  // Optional polling/archive data can finish after map draw, without blocking it.
  updated.then(()=>{});
  setInterval(()=>{if(!document.hidden)loadReturns(false)},60000);
 }catch(e){console.error('State desk failed',e);$('stateTitle').textContent='State data could not be loaded';$('stateDeck').textContent='A required election registry could not be retrieved. Reload to try again.';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();