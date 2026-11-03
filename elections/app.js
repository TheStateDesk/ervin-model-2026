/* ERVIN MODEL — 2026 state election dossiers. No synthetic returns. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FIPS={AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',FL:'12',GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56'};
const sourceLabels={rcp:'RealClearPolling',ddhq:'Decision Desk HQ',win270:'270toWin',silver:'Silver Bulletin',average:'Wikipedia aggregator average'};
const weights={rcp:.40,ddhq:.29,win270:.21,silver:.10};
const params=new URLSearchParams(location.search);
const desiredOffice=['senate','governor','house'].includes(params.get('office'))?params.get('office'):'governor';
const desiredDistrict=String(params.get('district')||'01').replace(/[^0-9]/g,'').padStart(2,'0').slice(-2);
const desiredCode=(params.get('state')||'MI').toUpperCase().replace(/[^A-Z]/g,'').slice(0,2);
const href=r=>'?office='+encodeURIComponent(r.office.toLowerCase())+'&state='+encodeURIComponent(r.code)+(r.office==='House'?'&district='+encodeURIComponent(r.district):'');
let raceList=[],current=null,pollArchive={},countyHistory={},michiganHistory=[],allHistorical={},scenario=null,housePolling={},governorPolls={};
function toDate(value){const d=Date.parse(/\b20\d{2}\b/.test(String(value))?String(value):String(value)+', 2026');return Number.isFinite(d)?d:null}
function formatMargin(m,dem,rep){if(m==null||!Number.isFinite(m))return 'No comparable average';if(Math.abs(m)<.05)return 'Tied';return (m>0?dem:rep).split(' ').slice(-1)[0]+' +'+Math.abs(m).toFixed(1)}
function senateAggregate(r){
 const seen=new Set(),inputs=[];
 for(const [key,weight] of Object.entries(weights)){
   const q=r.sources?.[key];if(!q||q.proxy||!Number.isFinite(Number(q.value)))continue;
   const id=String(q.publisherId||q.origin||key).trim().toLowerCase();
   if(seen.has(id))continue;seen.add(id);
   const time=toDate(q.date),age=time==null?21:Math.max(0,(Date.now()-time)/86400000);
   inputs.push({key,value:+q.value,weight:weight*Math.max(.5,Math.exp(-age/35)),date:q.date,source:q.origin,url:q.url});
 }
 const total=inputs.reduce((n,x)=>n+x.weight,0);
 if(!total){const q=r.sources?.rcp;return {raw:q&&Number.isFinite(+q.value)?+q.value:null,inputs:[],date:q?.date||'Unverified',origin:'RCP proxy fallback'};}
 const raw=inputs.reduce((n,x)=>n+x.weight*x.value,0)/total;
 const mostRecent=[...inputs].sort((a,b)=>(toDate(b.date)||0)-(toDate(a.date)||0))[0];
 return {raw,inputs,date:mostRecent?.date||'Unknown',origin:'Ervin’s Take (dated source blend)'};
}
function renderNav(){
 const selected=current;
 $('raceJump').innerHTML=['senate','governor','house'].map(office=>{
  const entries=raceList.filter(r=>r.office.toLowerCase()===office).sort((a,b)=>a.state.localeCompare(b.state));
  return '<optgroup label="'+(office==='senate'?'Senate elections':office==='governor'?'Governor elections':'House elections')+'">'+entries.map(r=>'<option value="'+href(r)+'">'+esc(r.office==='House'?r.id:r.state+' · '+r.office)+'</option>').join('')+'</optgroup>';
 }).join('');
 $('raceJump').value=href(selected);
 $('raceJump').onchange=()=>{location.href=$('raceJump').value};
 const same=raceList.filter(r=>r.office===selected.office&&(r.office!=='House'||r.code===selected.code)).sort((a,b)=>a.state.localeCompare(b.state));
 $('raceList').innerHTML=same.map(r=>'<a href="'+href(r)+'" '+(r.code===selected.code&&(r.office!=='House'||r.district===selected.district)?'aria-current="page"':'')+'><span><span class="race-code">'+esc(r.office==='House'?r.id:r.code)+'</span> '+esc(r.office==='House'?r.state+' District '+r.district:r.state)+'</span><b>'+esc(r.office==='Senate'?'SEN':r.office==='House'?'HOUSE':'GOV')+'</b></a>').join('');
}
function renderHeader(r){
 if(r.office==='House'){
  document.title=r.id+' 2026 U.S. House · Ervin Model';
  $('raceTitle').textContent=r.state+' · U.S. House District '+Number(r.district);
  $('raceDeck').textContent='2026 House district '+r.id+' · current published ratings and geographic county context. The candidate ballot slate and fitted district forecast are not independently verified; sourced individual public surveys are shown where available. Reference district geography is historical (2022).';
  $('topKicker').textContent='2026 elections / house / '+r.id;
  $('backLink').href='../house/?state='+r.code;
  $('backLink').textContent='← All 435 House districts';
  $('mapTitle').textContent=r.state+' House district or county reference geography';
  $('matchupTitle').textContent=r.id+' · district intelligence';
  $('candidates').innerHTML='<div class="race-candidate"><small>2024 incumbent / historical context</small><strong>'+esc(r.incumbent||'Not verified')+'</strong><div class="race-party">Not confirmation of the 2026 ballot slate</div></div><div class="race-candidate r"><small>2026 major-party nominees</small><strong>Not independently verified</strong><div class="race-party">Check the state election office for final candidates</div></div>';
  return;
 }
 document.title=r.state+' '+r.office+' 2026 · Ervin Model';
 $('raceTitle').textContent=r.state+' '+r.office+' election';
 $('raceDeck').textContent=r.dem+' ('+(r.party==='I'?'Independent':'D')+') vs '+r.rep+' (R) · November 3, 2026. Source-attributed polling, county geography, and documented election results.';
 $('topKicker').textContent='2026 elections / '+r.office.toLowerCase()+' / '+r.code;
 $('backLink').href=r.office==='Governor'?'../governors/':'../?race='+encodeURIComponent(r.code)+'#map-area';
 $('backLink').textContent=r.office==='Governor'?'← All governor races':'← National Senate forecast';
 $('mapTitle').textContent=r.state+' county boundaries';
 $('matchupTitle').textContent=r.state+' '+r.office;
 $('candidates').innerHTML='<div class="race-candidate"><small>'+(r.party==='I'?'Independent candidate':'Democratic ticket')+'</small><strong>'+esc(r.dem)+'</strong><div class="race-party">'+(r.party==='I'?'Independent':'Democrat')+'</div></div><div class="race-candidate r"><small>Republican ticket</small><strong>'+esc(r.rep)+'</strong><div class="race-party">Republican</div></div>';
}
function renderForecast(r){
 if(r.office==='House'){
  $('leadLabel').textContent='Cook Political Report rating · Oct 30, 2026';
  $('leadValue').textContent=r.rating||'Rating not entered';$('leadValue').className='';
  $('leadExplanation').textContent='A qualitative publisher rating only. No numerical House winning chance or vote-share prediction was computed.';
  $('repBar').style.width='0%';$('demBar').style.width='0%';
  $('modelStatus').textContent='Uncalibrated';const p=housePolling[r.id];$('pollCount').textContent=p?.count!=null?p.count+' listed surveys':'Not indexed';$('pollDate').textContent=p?.date||'Unavailable';
  $('pollDate').parentElement.querySelector('small').textContent='Latest individual poll date';
  $('raceSources').innerHTML='<a href="'+esc(r.ratingSource||'https://www.cookpolitical.com/ratings/house-race-ratings')+'" target="_blank" rel="noopener noreferrer">Cook source ratings ↗</a><a href="../house/?state='+r.code+'">All '+r.code+' districts ↗</a>';
  $('certainty').textContent='The House district is indexed, but a full matchup, district boundary and matching archived polling are not available. No Ervin district probability or historical-error adjustment is claimed.';
  $('qualifiers').textContent='Ratings are publisher judgments, not a quantitative seat forecast. The 2026 district may have been redrawn; counties on this map may lie outside the district. Do not treat state-level baseline counties as district-level votes.';
  $('methodology').textContent='House: 435 districts indexed using post-2020 census apportionment. The ratings shown on reviewed districts come from Cook Political Report (Oct 30, 2026). A 2026 House-specific backtest and complete matched candidate-poll archive have not yet been established.';
  $('methodLinks').innerHTML='<a href="../research/cross_office_backtest_scorecard.json">Historical audit ↗</a><a href="../house/">House directory ↗</a>';
  $('resultLinks').innerHTML='<a href="https://www.usa.gov/election-office" target="_blank" rel="noopener noreferrer">State election office ↗</a>';
  return;
 }
 const isSen=r.office==='Senate';
 if(isSen&&r.sourceRating){
  $('leadLabel').textContent='Inside Elections · publisher qualitative Senate rating';
  $('leadValue').textContent=r.sourceRating;
  $('leadValue').className='';
  $('leadExplanation').textContent='Independent source rating, not a numerical Ervin forecast or a polling average.';
  $('repBar').style.width='0%';$('demBar').style.width='0%';
  $('modelStatus').textContent='Publisher rating';$('pollCount').textContent='No numerical average';
  $('pollDate').textContent='Nov. 3, 2026';
  $('raceSources').innerHTML='<a href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Inside Elections ratings</a><a href="'+esc(r.candidateSource)+'" target="_blank" rel="noopener noreferrer">Candidate sources</a>';
  $('certainty').textContent='This contest does not have a historically calibrated Original Ervin numerical margin. Idaho features a Republican and an independent, not a Democratic-versus-Republican matchup.';
  $('qualifiers').textContent='The qualitative rating is attributed to its publisher. No numerical probability, polling bias adjustment or vote share has been inferred.';
  $('methodology').textContent='Inside Elections 2026 rating: separate from 17 Original Ervin numerical Senate estimates. No unrelated state or governor historical errors are transferred.';
  $('methodLinks').innerHTML='<a href="../research/senate-qualitative-coverage-2026.json">Source provenance</a>';
  $('resultLinks').innerHTML='<a href="https://www.nass.org/can-I-vote/state-election-officials" target="_blank" rel="noopener noreferrer">State election offices</a>';
  return;
 }
 const poll=isSen?senateAggregate(r):null;
 const raw=isSen?poll.raw:r.poll?.margin??null;
 const correction=isSen&&r.history_mode!=='not_comparable'?Number(r.correction)||0:0;
 const adjusted=isSen&&raw!=null?raw-correction:raw;
 const shown=isSen?adjusted:raw;
 $('leadLabel').textContent=isSen?'Original Ervin adjusted Senate margin':'Published gubernatorial polling lead';
 $('leadValue').textContent=formatMargin(shown,r.dem,r.rep);
 $('leadValue').className=shown==null?'':shown>=0?'race-positive':'race-negative';
 $('leadExplanation').textContent=isSen?(raw==null?'Current comparable polling input unavailable.':'Publisher blend '+(raw>=0?'D +':'R +')+Math.abs(raw).toFixed(1)+' − historical R-oriented correction '+correction.toFixed(1)+' = adjusted margin. Original Ervin scenario; not a validated win probability.'):(raw==null?'No verified numerical gubernatorial average in this snapshot.':'Published '+(raw>=0?'D +':'R +')+Math.abs(raw).toFixed(1)+' on Nov 1. This is an external polling average, NOT an Ervin gubernatorial forecast.');
 const left=shown==null?50:Math.max(8,Math.min(92,50-shown*1.55));
 $('repBar').style.width=left.toFixed(1)+'%';$('demBar').style.width=(100-left).toFixed(1)+'%';
 $('modelStatus').textContent=isSen?'Original Ervin':'Source average';
 $('pollCount').textContent=isSen?'See surveys':r.poll?.count??'Unavailable';
 $('pollDate').textContent=isSen?poll.date:r.poll?.asOf||'Unavailable';
 $('pollDate').parentElement.querySelector('small').textContent=isSen?'Latest publisher input':'Dated source snapshot';
 $('raceSources').innerHTML=(isSen?'<a href="../?race='+r.code+'#map-area">Edit Senate model assumptions ↗</a>':'<a href="../governors/">All gubernatorial races ↗</a>')+'<a href="'+esc(isSen?(r.sources?.rcp?.url||r.sourceUrl):r.poll?.url||'https://www.onpointpolitics.us/polls/governor')+'" target="_blank" rel="noopener noreferrer">Polling publisher ↗</a>';
 $('certainty').textContent=isSen?'The Senate page applies state historical error under the Original Ervin assumptions. Its scenario bands have not been statistically validated as election probabilities, and independent candidacies may not be directly comparable.':'No Ervin historical governor calibration is published for this race. These are unadjusted third-party polling margins, not a projected percentage of the vote and not a chance of winning.';
 $('qualifiers').textContent=(r.otherCandidates||r.notes||'Polls reflect sampled opinion; they do not measure verified ballots.')+(isSen?' Historical correction: '+(r.history_mode==='not_comparable'?'not transferred to this matchup':correction.toFixed(2)+' R-oriented points')+'.':' Polling source may include overlapping underlying surveys; no new Ervin governor historical adjustment has been calculated.');
 $('methodology').textContent=isSen?'Senate display reproduces the dashboard’s Ervin’s Take four-publisher blend (RCP 40%, DDHQ 29%, 270toWin 21%, Silver 10%), filtering declared proxy entries, de-duplicating publisher identities, and applying its Original Ervin correction where comparable. The detailed survey archive is context and may overlap these averages.':'Governor margins are a separately attributed November 1, 2026 On Point publisher snapshot. A governor-specific Ervin prediction requires additional historical governor backtesting; Senate adjustments must not be recycled to manufacture one. Individual polls below are an independent audit list, not proof that the aggregator used each one.';
 $('methodLinks').innerHTML=isSen?'<a href="../#methodology">Senate methodology ↗</a><a href="../research/CALIBRATION_2016_2024_REPORT.md">Historical audit ↗</a>':'<a href="https://www.nga.org/governors/elections/" target="_blank" rel="noopener noreferrer">Governor nominee roster ↗</a><a href="https://www.onpointpolitics.us/polls/governor" target="_blank" rel="noopener noreferrer">Poll board ↗</a>';
 $('resultLinks').innerHTML='<a href="https://www.nass.org/can-I-vote/state-election-officials" target="_blank" rel="noopener noreferrer">State election offices ↗</a>'+(r.code==='MI'?'<a href="../michigan/election-night/">Michigan source audit ↗</a>':'');
}
function renderPolls(r){
 if(r.office==='House'){
  const p=housePolling[r.id];
  $('pollIntro').textContent=p?'The latest documented public district survey is shown below. Other listed surveys, if any, are accessible in the linked directory. This is not an Ervin polling average. Sponsor independence and methodology vary by poll.':'No 2026 House district survey has been imported for this district. A missing local poll record does not mean no public polling exists.';
  if(p){
    const label=p.margin>0?'D +'+p.margin.toFixed(1):p.margin<0?'R +'+Math.abs(p.margin).toFixed(1):'Tie';
    $('pollRows').innerHTML='<div class="race-row"><div><strong><a href="'+esc(p.url)+'" rel="noopener noreferrer" target="_blank">'+esc(p.pollster)+'</a></strong><small>'+esc(p.date)+' · most recent public survey in directory · '+esc(p.count)+' publicly indexed survey(s)</small><small>'+esc(p.sourceKind)+'</small></div><div class="race-number">'+esc(label)+'</div></div><div class="race-note">Reported major-party shares: D '+esc(p.dem.toFixed(1))+'% · R '+esc(p.rep.toFixed(1))+'%. Third-party and undecided responses are not reassigned. Confirm the sponsor and respondent sample in the original release.</div>';
    $('pollPlot').innerHTML='<b>Latest documented public survey · not an average</b><div class="bar '+(p.margin<0?'r':'')+'" style="height:'+Math.max(14,Math.min(84,25+Math.abs(p.margin)*2))+'%"><span>'+esc(label)+'</span></div>';
  }else{
    $('pollRows').innerHTML='<div class="race-note">No comparable race-specific public poll in the imported sample. Open the linked full public polling directories for additional releases.</div>';
    $('pollPlot').innerHTML='<div class="race-muted" style="margin:auto">No sourced district survey imported</div>';
  }
  $('pollLinks').innerHTML='<a href="../house/research-polls.json">Local poll evidence index ↗</a><a href="https://peoplespoll.com/house" target="_blank" rel="noopener noreferrer">Complete public House polls directory ↗</a><a href="https://www.realclearpolling.com/latest-polls/house" target="_blank" rel="noopener noreferrer">RealClearPolling House surveys ↗</a><a href="../house/">All 435 House districts ↗</a>';return;
 }
 let polls=[],rows=[];
 if(r.office==='Senate'){
  const avg=senateAggregate(r);
  rows=Object.entries(r.sources||{}).filter(([key])=>sourceLabels[key]).map(([key,q])=>({name:sourceLabels[key],value:+q.value,source:q.origin,kind:q.proxy?'Reference/proxy — excluded from blend':'Publisher average; overlaps possible',date:q.date,url:q.url}));
  polls=pollArchive[r.code]||[];
  $('pollIntro').textContent='Publisher surveys are separately indexed; a publisher qualitative Senate rating does not constitute a numerical Ervin forecast. The archive can contain overlapping polls.';
 }else{
  if(r.poll)rows=[{name:'On Point Politics polling average',value:r.poll.margin,kind:r.poll.count+' underlying public surveys; publisher own methodology',date:r.poll.asOf,source:r.poll.source,url:r.poll.url}];
  polls=[...(r.recentPolls||[]).map(p=>({pollster:p.pollster,margin:p.margin,dates:p.date,sample:p.note,url:p.url,sourceKind:p.source})),...(governorPolls[r.code]||[]).map(p=>({...p,dates:p.date}))];
  const signatures=new Set();polls=polls.filter(p=>{const key=String(p.pollster).toLowerCase().replace(/[^a-z]/g,'')+'|'+p.dates+'|'+p.margin;if(signatures.has(key))return false;signatures.add(key);return true});
  $('pollIntro').textContent='The displayed statewide polling average is a third-party aggregate; individual polls below are separately sourced context. Survey lists may overlap each other and the publisher aggregate, and dates can indicate publication rather than exact field periods.';
 }
 const avgHtml=rows.length?rows.map(q=>'<div class="race-row"><div><strong><a href="'+esc(q.url||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(q.name)+'</a></strong><small>'+esc(q.kind||q.source||'')+' · '+esc(q.date||'date unavailable')+'</small></div><div class="race-number">'+esc(formatMargin(q.value,r.dem,r.rep))+'</div></div>').join(''):'<div class="race-note">No verified, comparable publisher-average input is available for this contest.</div>';
 const sorted=[...polls].sort((a,b)=>(toDate(b.fieldEnd||b.publishedAt||b.dates)||0)-(toDate(a.fieldEnd||a.publishedAt||a.dates)||0)).slice(0,40);
 const surveyHtml=sorted.length?sorted.map(p=>'<div class="race-row"><div><strong><a href="'+esc(p.url||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(p.pollster)+'</a></strong><small>'+esc(p.dates||p.date||'Field date unverified')+' · '+esc(p.sample||'Sample not independently verified')+'</small><small>'+esc(p.sourceKind||'Individual poll; not independent of publisher averages')+'</small></div><div class="race-number">'+esc(formatMargin(+p.margin,r.dem,r.rep))+'</div></div>').join(''):'<div class="race-note">Individual polls are not archived for this race yet. The published source link above leads to any available poll-level information.</div>';
 $('pollRows').innerHTML='<h3 style="margin:8px 0 2px">Published source averages</h3>'+avgHtml+'<h3 style="margin:17px 0 2px">Recent individual surveys ('+sorted.length+' shown)</h3>'+surveyHtml;
 const plotted=sorted.filter(p=>Number.isFinite(+p.margin)).slice(0,16).reverse();
 $('pollPlot').innerHTML='<b>Individual polls · non-R minus R</b>'+plotted.map(p=>{const val=+p.margin;return '<div class="bar '+(val<0?'r':'')+'" style="height:'+Math.max(8,Math.min(88,20+Math.abs(val)*3))+'%" title="'+esc(p.pollster+': '+formatMargin(val,r.dem,r.rep))+'"><span>'+esc((p.pollster||'').split(' ')[0].slice(0,6))+'</span></div>'}).join('')+(plotted.length?'':'<div class="race-muted" style="margin:auto">No individual survey chart available</div>');
 $('pollLinks').innerHTML=r.office==='Governor'?'<a href="'+esc(r.poll?.url||'https://www.onpointpolitics.us/polls/governor')+'" target="_blank" rel="noopener noreferrer">Full publisher polling history ↗</a><a href="https://www.realclearpolling.com/latest-polls/governor" target="_blank" rel="noopener noreferrer">RCP recent governor surveys ↗</a>':'<a href="../recent_polls.json" target="_blank" rel="noopener noreferrer">Recent survey archive (JSON) ↗</a>';
}
function svgNode(tag,props){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(props||{}))el.setAttribute(k,v);return el}
function fallbackMap(r,msg){
 const geo=window.ERVIN_US_GEOGRAPHY?.states?.find(g=>g.code===r.code),svg=$('countyMap');
 svg.replaceChildren();if(!geo){svg.append(svgNode('text',{x:200,y:200,fill:'#9aabbc'})).textContent='State map unavailable';$('countyCount').textContent='Map unavailable';return}
 const outline=svgNode('path',{d:geo.d,class:'state-outline'});svg.append(outline);
 const bbox=outline.getBBox(),m=Math.max(bbox.width,bbox.height)*.16;
 svg.setAttribute('viewBox',[bbox.x-m,bbox.y-m,bbox.width+2*m,bbox.height+2*m].join(' '));
 $('countyCount').textContent='State outline';
 $('mapProvenance').textContent=msg+' Geographic outline: PublicaMundi/MappingAPI. County results are not connected.';
 $('countyInspector').textContent=r.state+': statewide outline only. No 2026 local returns verified.';
}
/* County historical layers are always distinct from 2026 vote reporting.
   83 Michigan counties plus the 160 three-cycle national watch counties have
   sourced margin records. No fake colors for unavailable counties. */
function historicCounty(code,name,fips){
 const norm=x=>String(x||'').toLowerCase().trim().replace(/ county$/,'');
 const item=(countyHistory[code]?.units||[]).find(x=>(fips&&String(x.fips)===String(fips))||norm(x.name)===norm(name));
  const nationwide=allHistorical[String(fips).padStart(5,'0')];
  if(nationwide){const m=window.ERVIN_SCENARIOS.margin;return {m24:m(nationwide.y24),m20:m(nationwide.y20),source:'2024/2020 county presidential returns'};}
 const mi=code==='MI'?michiganHistory.find(x=>norm(x.name)===norm(name)):null;
 if(mi){
  const margin=e=>e&&(e.d+e.r)>0?100*(e.d-e.r)/(e.d+e.r):null;
  return {m24:margin(mi.president2024),m20:margin(mi.president2020),source:'Michigan historical county file'};
 }
 return item?{m24:item.m24,m20:item.m20,source:'Three-cycle county watch archive'}:null;
}
function applyCountyLayer(){
 if(!current)return;
 const mode=$('countyMapMode')?.value||'2024',paths=$('countyMap').querySelectorAll('path.county');
  if(mode==='2026live'&&window.ErvinCountyLayer){window.ErvinCountyLayer();return;}
 let n=0;
 for(const p of paths){
  const info=historicCounty(current.code,p.dataset.name,p.dataset.fips);
  const predicted=scenario?.map.get(String(p.dataset.fips).padStart(5,'0'));
   const value=mode==='expected'?predicted?.expected??null:!info||mode==='unreported'||mode==='district'?null:mode==='swing'&&Number.isFinite(info.m24)&&Number.isFinite(info.m20)?info.m24-info.m20:mode==='2024'?info.m24:null;
  p.style.fill=value==null?'':value>=0?(Math.abs(value)>=15?'#347caf':'#90bedc'):(Math.abs(value)>=15?'#bd6573':'#e2a2a9');
  p.dataset.historical=value==null?'unknown':String(value);
  if(value!=null)n++;
 }
 $('countyMapLegend').textContent=mode==='expected'?'ILLUSTRATIVE 2026 county scenario · anchored to '+(current.office==='Governor'?'unadjusted publisher polling average':'Original Ervin Senate adjusted margin')+' · '+n+' counties · not a validated forecast':mode==='2024'?'2024 PRESIDENTIAL HISTORICAL margin · blue = D, red = R · '+n+' sourced counties; gray = unavailable':mode==='swing'?'2020→2024 PRESIDENTIAL historical change · blue = D shift, red = R shift · '+n+' sourced counties':'2026 UNREPORTED geography · no verified votes displayed';
 $('mapDate').textContent=mode==='expected'?'2026 CONDITIONAL SCENARIO · never counted votes':mode==='unreported'?'2026 unreported geography':'Historical source only · not 2026 votes';
}

function countyInteraction(path,name,fips){
 const title=svgNode('title');title.textContent=name+' County — 2026 results unavailable';path.append(title);
 path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',name+' County: see data status');
 const show=()=>{
  const code=current.code,normal=x=>String(x||'').trim().toLowerCase().replace(/ county$/,'');
  const item=(countyHistory[code]?.units||[]).find(x=>(fips&&String(x.fips)===fips)||normal(x.name)===normal(name));
   const nationwide=allHistorical[String(fips).padStart(5,'0')];
   const forecast=scenario?.map.get(String(fips).padStart(5,'0'));
   const srcM=window.ERVIN_SCENARIOS?.margin;
  const mi=code==='MI'?michiganHistory.find(x=>normal(x.name)===normal(name)):null;
  const pct=(a,b)=>a+b?((a-b)/(a+b)*100).toFixed(1):null;
  let historical='';
  if(item)historical=' · 2024 presidential '+(item.m24>=0?'D +':'R +')+Math.abs(item.m24).toFixed(1)+' points; 2020 '+(item.m20>=0?'D +':'R +')+Math.abs(item.m20).toFixed(1)+' points (county historical archive).';
  else if(mi){const now=mi.president2024,prior=mi.president2020,g=mi.governor2022;historical=' · 2024 presidential D–R '+pct(now.d,now.r)+' points; 2020 D–R '+pct(prior.d,prior.r)+' points; 2022 governor D–R '+pct(g.d,g.r)+' points (historical vote shares).'}
  if(!item&&nationwide)historical=' · 2024 presidential D–R '+srcM(nationwide.y24).toFixed(1)+' pts'+(nationwide.y20?' · 2020 D–R '+srcM(nationwide.y20).toFixed(1)+' pts':'')+' (sourced county results)';
   const expected=forecast?.expected!=null?' · 2026 conditional county scenario '+(forecast.expected>=0?'D +':'R +')+Math.abs(forecast.expected).toFixed(1)+' pts (statewide race adjustment, NOT independent county polling)':' · 2026 numerical county projection not available for this race';
   $('countyInspector').textContent=name+' County'+(fips?' · FIPS '+fips:'')+historical+expected+' — No verified county return in this dossier.'+(current.office==='House'?' District-level county allocation is not verified; county does not necessarily lie entirely inside this district.':'');
 };
 path.addEventListener('click',show);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}})
}
function publishCountyTable(r,data){
 const rows=(data.features||[]).map(f=>{
  const fips=String(f.id||"").padStart(5,"0"),record=scenario?.map.get(fips),archive=allHistorical[fips],
  margin=window.ERVIN_SCENARIOS?.margin;
  return{fips,name:String(f.properties?.name||"County "+fips),m20:record?.m20??margin?.(archive?.y20)??null,m24:record?.m24??margin?.(archive?.y24)??null,expected:r.office==="House"?null:record?.expected??null};
 });
 window.dispatchEvent(new CustomEvent("ervin:county-scenario",{detail:{code:r.code,office:r.office,target:r.office==="House"?null:scenario?.target??null,rows}}));
}
async function drawMap(r,forceRefresh=false){
 const svg=$('countyMap');svg.replaceChildren(svgNode('text',{x:450,y:290,'text-anchor':'middle',fill:'#8ca4b7'}));
 svg.firstChild.textContent='Loading locally hosted geographic boundaries…';
 try{
  if(!window.ERVIN_GEO)throw Error('Local geographic renderer unavailable');
  const districtMode=r.office==='House'&&$('countyMapMode').value==='district';
  const kind=districtMode?'districts':'counties';
  const data=await window.ERVIN_GEO.get(r.code,kind,{refresh:forceRefresh});
  if(current!==r)return;
  if(districtMode){
   const countyData=await window.ERVIN_GEO.get(r.code,'counties').catch(()=>({features:[]}));
   publishCountyTable(r,countyData);
   const match=data.features.find(f=>String(f.id).padStart(2,'0')===String(r.district).padStart(2,'0'));
   if(!match)throw Error('Historic district boundary unavailable for '+r.id);
   window.ERVIN_GEO.draw(svg,{...data,features:[match]},{kind:'districts',className:'geo-district',onSelect:()=>{$('countyInspector').textContent=r.id+' · 118th Congress (2022 Census) geographic reference, NOT confirmed for 2026 redistricting. Switch map layer to see statewide historical counties.'}});
   $('countyCount').textContent=r.id+' · reference boundary';
   $('countyMapLegend').textContent='118th CONGRESS reference district shape · 2026 lines may have changed; historical geometry is not a result, forecast or guaranteed valid ballot boundary';
   $('mapProvenance').textContent='Census TIGER 2022 congressional district boundaries via Civic Interconnect. Changes since 2022 are not verified. For county context choose 2024 history.';
   $('countyInspector').textContent='Select the district for reference information. Switch to a county layer to explore historical county results.';
   return;
  }
  publishCountyTable(r,data);
  const n=window.ERVIN_GEO.draw(svg,data,{kind:'counties'});
  for(const p of svg.querySelectorAll('path.county'))countyInteraction(p,p.dataset.name,p.dataset.fips);
  if($('countyMapMode').value==='2026live'&&window.ErvinCountyLayer)window.ErvinCountyLayer();else applyCountyLayer();
  $('countyCount').textContent=n+' county outlines';
  if($('erReloadMap')){$('erReloadMap').disabled=false;$('erReloadMap').textContent='Reload boundaries';}
  $('mapProvenance').textContent='Locally hosted Census-derived 2022 county-equivalent boundaries. Historical colors come from attributed 2020/2024 presidential returns; 2026 scenario colors are separate analytical assumptions. House county boundaries are statewide context and NOT clipped to congressional districts.';
  $('countyInspector').textContent='Select a county to compare historical margins and the conditional 2026 scenario where available; this is not verified 2026 county vote reporting.';
 }catch(error){
  console.warn('Local county rendering:',error.message);
  if($('erReloadMap')){$('erReloadMap').disabled=false;$('erReloadMap').textContent='Retry county boundaries';}
  fallbackMap(r,'Local county data unavailable: '+error.message+'. Try another state; the site must not invent geographic boundaries.');
 }
}
async function loadSenate(){
 const response=await fetch('../research/senate-workbench-data.json');if(!response.ok)throw Error('Senate source file unavailable');
 const data=await response.json();
 if(!Array.isArray(data.states)||data.states.length!==17)throw Error('Preserved Senate model record invalid');
 const numeric=(data.states||[]).map(r=>({...r,office:'Senate'}));
 const sourceResponse=await fetch('../counties-watch/forecast-baselines.json',{cache:'no-cache'});
 if(!sourceResponse.ok)throw Error('Senate source rating snapshot unavailable');
 const snapshot=await sourceResponse.json();
 const rated=Object.entries(snapshot.sourceRated||{}).map(([code,r])=>({
  code,state:r.state,office:'Senate',dem:r.nonR,rep:r.rep,party:r.party,
  sourceRating:r.rating,sourceUrl:r.sourceUrl,candidateSource:r.candidateSource,
  sources:{},history_mode:'not_comparable',correction:null
 }));
 if(numeric.length!==17||rated.length!==18||new Set([...numeric,...rated].map(x=>x.code)).size!==35)
  throw Error('Required 17 numeric and 18 source-rated 2026 Senate races');
 return [...numeric,...rated];
}
async function start(){
 try{
  const [governors,senate,archive,house,counties,mi,national,housePolls,govArchive]=await Promise.all([
   fetch('../governors/data.json').then(r=>{if(!r.ok)throw Error('Governor registry unavailable');return r.json()}),
   loadSenate(),
   fetch('../recent_polls.json').then(r=>r.ok?r.json():{}).catch(()=>({})),
   fetch('../house/data.json').then(r=>{if(!r.ok)throw Error('House registry unavailable');return r.json()}),
   fetch('../counties-watch/history.json').then(r=>r.ok?r.json():{states:{}}).catch(()=>({states:{}})),
   fetch('../michigan/county_history.json').then(r=>r.ok?r.json():{counties:[]}).catch(()=>({counties:[]})),
    window.ERVIN_SCENARIOS.load().catch(()=>({counties:{}})),
    fetch('../house/research-polls.json').then(r=>r.ok?r.json():{polls:{}}).catch(()=>({polls:{}})),
    fetch('../governors/recent_verified_polls.json').then(r=>r.ok?r.json():{states:{}}).catch(()=>({states:{}}))
  ]);
  raceList=[...senate,...governors.races,...house.seats];pollArchive=archive.polls||{};countyHistory=counties.states||{};michiganHistory=mi.counties||[];allHistorical=national.counties||{};housePolling=housePolls.polls||{};governorPolls=govArchive.states||{};
  current=raceList.find(r=>r.code===desiredCode&&r.office.toLowerCase()===desiredOffice&&(r.office!=='House'||r.district===desiredDistrict)) || raceList.find(r=>r.office.toLowerCase()===desiredOffice) || raceList[0];
  const target=current.office==='Senate'?(()=>{const a=senateAggregate(current).raw;return Number.isFinite(a)?a-(current.history_mode==='not_comparable'?0:Number(current.correction)||0):null})():current.office==='Governor'&&Number.isFinite(current.poll?.margin)?current.poll.margin:null;
   scenario=window.ERVIN_SCENARIOS.build(national,FIPS[current.code],target);
   // Alaska's 2024 reporting units do not align with most 2022 borough/census-area FIPS; avoid projecting artificial county results.
   if(current.code==='AK'){scenario.target=null;for(const rec of scenario.map.values())rec.expected=null;}
   if(current.office==='House')$('countyMapMode').value='district';else $('countyMapMode').value=target==null||current.code==='AK'?'2024':'expected';
   renderHeader(current);renderNav();renderForecast(current);renderPolls(current);if($('erReloadMap'))$('erReloadMap').onclick=()=>{const button=$('erReloadMap');button.disabled=true;button.textContent='Reloading…';drawMap(current,true).finally(()=>{button.disabled=false;if(button.textContent==='Reloading…')button.textContent='Reload boundaries';});};$('countyMapMode').onchange=()=>{const districtPaths=$('countyMap').querySelector('path.geo-district');if($('countyMapMode').value==='district'||districtPaths)drawMap(current);else applyCountyLayer()};drawMap(current);
 }catch(error){console.error('Election dossier data error',error);$('raceTitle').textContent='Election data unavailable';$('raceDeck').textContent='The published source files could not be loaded. Return to the race index or try reloading.';$('raceList').textContent='Data request unsuccessful.'}
}
start();
})();