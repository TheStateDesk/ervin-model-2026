/* Stats for Nerds — bounded, reproducible 14,000-draw early-signal lab.
   Separate baseline, verified source records, and local hypotheticals.
   No fictional results; no model changes elsewhere on the site. */
(()=>{'use strict';
const $=id=>document.getElementById(id),SEED=20261103,N=14000;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const closeTimes={'KY-06':'2026-11-03T18:00:00-05:00','VA-02':'2026-11-03T19:00:00-05:00',
 'VA-05':'2026-11-03T19:00:00-05:00','GA-SENATE':'2026-11-03T19:00:00-05:00',
 'SC-SENATE':'2026-11-03T19:00:00-05:00','FL-27':'2026-11-03T19:00:00-05:00',
 'NC-SENATE':'2026-11-03T19:30:00-05:00','OH-SENATE':'2026-11-03T19:30:00-05:00'};
const specs=[
 {id:'KY-06',title:'Kentucky 6th · House',close:'6:00 p.m.',why:'Interior / rural-suburban swing; a possible early check on Kansas and Iowa.',focus:'KS, IA',w:[.95,.10,.40,.30,.60]},
 {id:'VA-02',title:'Virginia 2nd · House',close:'7:00 p.m.',why:'Competitive coastal / suburban House vote; a test for national persuasion.',focus:'TX, KS',w:[1.05,.35,.05,.75,.05]},
 {id:'VA-05',title:'Virginia 5th · House',close:'7:00 p.m.',why:'Rural and exurban performance; possible signal for nonmetro Kansas/Iowa.',focus:'KS, IA',w:[.90,.15,.25,.10,.65]},
 {id:'GA-SENATE',title:'Georgia · Senate',close:'7:00 p.m.',why:'Statewide coalition test; early vote-heavy counties need mode and geography review.',focus:'TX',w:[1.05,.90,.02,.45,.10]},
 {id:'SC-SENATE',title:'South Carolina · Senate',close:'7:00 p.m.',why:'Southern statewide swing; partial counties alone can mislead.',focus:'TX',w:[.95,.85,.03,.10,.35]},
 {id:'FL-27',title:'Florida 27th · House',close:'7:00 p.m.',why:'Miami-area Hispanic/suburban swing; not a clean proxy for every Texas voter.',focus:'TX',w:[.85,.62,.03,.60,.00]},
 {id:'NC-SENATE',title:'North Carolina · Senate',close:'7:30 p.m.',why:'Statewide competitive race; early-vote composition especially important.',focus:'TX, KS',w:[1.00,.70,.15,.45,.15]},
 {id:'OH-SENATE',title:'Ohio · Senate',close:'7:30 p.m.',why:'Midwestern industrial and exurban indicator, particularly for Iowa and Kansas.',focus:'IA, KS',w:[1.12,.04,.95,.24,.40]}
];
const targetParams={TX:{w:[.92,.80,.08,.43,.10],noise:3.6},KS:{w:[.98,.10,.83,.21,.46],noise:3.7},IA:{w:[1.03,.03,.94,.25,.36],noise:3.6}};
let baselines={},house={},candidateRoster={},reviewed=[],raw={},manual=[],includeManual=true,draws=[],lastCheck=0;
let firstLoad=true,signalMeta={};
const sources=['../counties-watch/forecast-baselines.json','../house/ervin-forecast-2026-11-02.json'];
const pct=v=>Number(v).toFixed(1)+'%';
const margin=v=>Number.isFinite(v)?(Math.abs(v)<.05?'Even':(v>0?'D +':'R +')+Math.abs(v).toFixed(1)):'Unavailable';
const share=v=>50+v/2;
function rand(seed){return function(){seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}
function gauss(u){let a=Math.max(u(),1e-10),b=u();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b)}
function factors(u){return [gauss(u)*2.6,gauss(u)*2.15,gauss(u)*2.05,gauss(u)*1.6,gauss(u)*1.45]}
function dot(a,b){return a.reduce((n,x,i)=>n+x*b[i],0)}
function initial(){
 const u=rand(SEED);draws=[];
 for(let i=0;i<N;i++){
  const f=factors(u),out={};
  for(const id of Object.keys(targetParams)){
   const t=targetParams[id];out[id]=dot(f,t.w)+gauss(u)*t.noise;
  }
  for(const s of specs)out[s.id]=dot(f,s.w)+gauss(u)*4.4;
  draws.push(out);
 }
}
function baseline(id){
 if(id.endsWith('-SENATE'))return Number(baselines[id.slice(0,2)]?.adjustedMargin);
 if(id in targetParams)return Number(baselines[id]?.adjustedMargin);
 return Number(house[id]?.marginD);
}
function readableBaseline(id){const x=baseline(id);return Number.isFinite(x)?margin(x):'No comparable baseline'}
function validFraction(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1}
function officialUrl(x){try{const u=new URL(x);return u.protocol==='https:'&&u.hostname.includes('.')&&!u.username&&!u.password}catch{return false}}
function validated(record){
 const key=String(record?.raceId||''),s=specs.find(x=>x.id===key);
 if(!s)return {ok:false,why:'Race outside approved shortlist'};
 if(!Number.isFinite(baseline(key)))return {ok:false,why:'No pre-election baseline'};
 if(record?.audit!=='reviewed'||record?.geographyReviewed!==true||record?.modeReviewed!==true)return {ok:false,why:'Human geography and vote-mode audit absent'};
 if(record?.election!=='2026-11-03'||record?.office!==(key.includes('SENATE')?'Senate':'House'))return {ok:false,why:'Election/office mismatch'};
 const t=Date.parse(record.asOf||''),now=Date.now();
 if(!Number.isFinite(t)||t<Date.parse(closeTimes[key])||t>now+300000)return {ok:false,why:'Source timestamp before local close or invalid'};
 if(!officialUrl(record.sourceUrl))return {ok:false,why:'No documented HTTPS report link'};
 const isCount=x=>Number.isSafeInteger(x)&&x>=0&&x<30000000;
 if(!isCount(record.dem)||!isCount(record.rep)||record.dem+record.rep<(key.includes('SENATE')?10000:3000))return {ok:false,why:'Insufficient or invalid two-party vote counts'};
 if(!isCount(record.total)||record.total<record.dem+record.rep||record.total>record.dem+record.rep+Math.max(500,record.total*.20))return {ok:false,why:'Inconsistent vote totals'};
 if(!validFraction(record.expectedVoteFraction)||record.expectedVoteFraction<.35)return {ok:false,why:'Less than 35% of estimated final turnout'};
 if(!validFraction(record.geographicCoverage)||record.geographicCoverage<.50)return {ok:false,why:'Insufficient geography coverage'};
 if(!Number.isSafeInteger(record.reportingUnits)||record.reportingUnits<20)return {ok:false,why:'Fewer than 20 independent reporting units'};
 if(!record.voteModes||!isCount(record.voteModes.early)||!isCount(record.voteModes.inPerson))return {ok:false,why:'Missing mode breakdown'};
 const totalModes=record.voteModes.early+record.voteModes.inPerson;
 if(totalModes<record.dem+record.rep||totalModes>record.total)return {ok:false,why:'Mode totals fail reconciliation'};
 if(!validFraction(record.expectedEarlyFraction)||Math.abs(record.voteModes.early/totalModes-record.expectedEarlyFraction)>.08)return {ok:false,why:'Early/mail mix differs from audited expectation by more than 8 points'};
 if(record?.ballotType&&record.ballotType!=='mixed')return {ok:false,why:'Only one ballot mode represented'};
 return {ok:true,why:'Reviewed geography and vote-mode mix',marginD:100*(record.dem-record.rep)/(record.dem+record.rep),fraction:record.expectedVoteFraction};
}
function audit(){
 signalMeta={};
 for(const s of specs)signalMeta[s.id]= {state:'watch',reason:'No audited early signal',observed:null};
 for(const r of reviewed){
  const id=String(r?.raceId||'');if(!signalMeta[id])continue;
  const v=validated(r);
  signalMeta[id]={state:v.ok?'approved':'rejected',reason:v.why,observed:v.ok?{id,delta:v.marginD-baseline(id),frac:v.fraction,method:'reviewed',mode:'verified',url:r.sourceUrl,asOf:r.asOf}:null};
 }
}
function compute(){
 const active=specs.flatMap(s=>{
  const a=signalMeta[s.id]?.observed?[signalMeta[s.id].observed]:[];
  const m=includeManual?manual.filter(x=>x.id===s.id):[];
  // A single race cannot provide two independent observations of the same votes.
  return a.length?a:m;
 });
 const logWeight=new Float64Array(N),results={};
 let high=-Infinity;
 for(let i=0;i<N;i++){
  let v=0;for(const s of active){
   const sd=s.method==='reviewed'?Math.max(3.1,4.8/Math.sqrt(Math.max(.35,s.frac)/.5)):Math.max(5.8,9/Math.sqrt(Math.max(.1,s.frac)/.5));
   const z=(draws[i][s.id]-s.delta)/sd;
   v+=-.5*z*z;
  }
  logWeight[i]=v;if(v>high)high=v;
 }
 const weights=new Float64Array(N);let wSum=0,wSq=0;
 for(let i=0;i<N;i++){const w=Math.exp(logWeight[i]-high);weights[i]=w;wSum+=w;wSq+=w*w}
 const ess=(wSum*wSum)/wSq;
 for(const id of Object.keys(targetParams)){
  const b=baseline(id),rank=[];
  let predicted=0;
  for(let i=0;i<N;i++){let v=b+draws[i][id];rank.push([v,weights[i]]);predicted+=v*weights[i]}
  rank.sort((a,b)=>a[0]-b[0]);
  let cumulative=0,lo=rank[0][0],hi=rank[rank.length-1][0];
  for(const [value,w] of rank){cumulative+=w;if(cumulative>=wSum*.10&&lo===rank[0][0])lo=value;if(cumulative>=wSum*.90){hi=value;break}}
  results[id]={baseline:b,posterior:predicted/wSum,lo,hi,ess,hasEvidence:active.length>0};
 }
 return {results,active,ess};
}
function signalStrength(s,target){const n=N,avg=(key)=>draws.reduce((v,d)=>v+d[key],0)/n;let a=avg(s.id),b=avg(target),cov=0,v=0;for(const d of draws){cov+=(d[s.id]-a)*(d[target]-b);v+=(d[s.id]-a)**2}return cov/v}
function candidateMarkup(id){
 const key=id in targetParams?id+'-SENATE':id;
 const c=candidateRoster[key];
 const fallback=id in targetParams?{democrat:baselines[id]?.nonR,republican:baselines[id]?.rep,other:[],sourceUrl:''}:null;
 const x=c||fallback;
 if(!x?.democrat||!x?.republican)return '<div class="nerd-candidate-unavailable">2026 general-election candidates: roster unavailable.</div>';
 const primary='<div class="nerd-candidate-pair"><div><span class="nerd-party d">D</span> <strong>'+esc(x.democrat)+'</strong></div>'+
 '<div><span class="nerd-party r">R</span> <strong>'+esc(x.republican)+'</strong></div></div>';
 const other=Array.isArray(x.other)?x.other:[];
 const extras=other.length?'<details class="nerd-other-candidates"><summary>'+other.length+' additional candidate'+(other.length===1?'':'s')+' / write-ins</summary>'+
 '<ul>'+other.map(z=>'<li>'+esc(z.name)+' — '+esc(z.party)+(z.writeIn?' (write-in)':'')+'</li>').join('')+'</ul></details>':'';
 const source=x.sourceUrl&&officialUrl(x.sourceUrl)?'<a class="nerd-candidate-source" href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Candidate roster source</a>':
 '<small class="nerd-candidate-source">Names from baseline forecast; check general-election roster.</small>';
 return '<div class="nerd-candidate-roster">'+primary+extras+source+'</div>';
}
function targetHTML(id,r){
 const isUpdated=r.hasEvidence,base=share(r.baseline),conditional=share(r.posterior),change=conditional-base;
 const cls=conditional>=50?'D':'R';
 return '<article class="nerd-target"><small>U.S. SENATE · '+id+'</small><h3>'+({TX:'Texas',KS:'Kansas',IA:'Iowa'}[id])+'</h3>'+
 candidateMarkup(id)+
 '<div class="nerd-compare"><div><small>Original Ervin D two-party</small><strong>'+pct(base)+'</strong></div><div class="adjusted"><small>'+(isUpdated?'Conditional D two-party':'No eligible signal')+'</small><strong>'+pct(conditional)+'</strong></div></div>'+
 '<div class="nerd-band"><span style="width:'+Math.min(100,Math.max(0,conditional))+'%"></span></div>'+
 '<p>Baseline: '+margin(r.baseline)+'. Conditional: '+margin(r.posterior)+'. '+
 (isUpdated?'Scenario shift: '+(change>=0?'+':'')+change.toFixed(2)+' D share points.':'No shift without applicable evidence.')+
 ' Model 10th–90th sensitivity range: '+pct(share(r.lo))+'–'+pct(share(r.hi))+' D share. Not a validated probability interval.</p></article>';
}
function render(){
 const data=compute(),{results,active,ess}=data;
 $('targetCards').innerHTML=['TX','KS','IA'].map(id=>targetHTML(id,results[id])).join('');
 $('numApproved').textContent=Object.values(signalMeta).filter(x=>x.state==='approved').length;
 $('sampleHealth').textContent=Math.round(ess).toLocaleString();
 $('sampleWarning').textContent=active.length?
 'Applied '+active.length+' independent signal scenario(s); '+active.filter(x=>x.method==='reviewed').length+' audited live, '+active.filter(x=>x.method!=='reviewed').length+' your what-if. Effective draws: '+Math.round(ess).toLocaleString()+' / 14,000.'+
 (ess<500?' LOW effective sample size: this result is unstable and should not be interpreted as a forecast.':' Posterior ranges are heuristic sensitivity only.'):
 'All 14,000 scenarios remain equally weighted. No audited early reported vote is being applied. The baseline remains unchanged.';
 const ranks=specs.map(s=>({...s,relevance:Math.max(...Object.keys(targetParams).map(t=>Math.abs(signalStrength(s,t))))})).sort((a,b)=>b.relevance-a.relevance);
 $('signalRows').innerHTML=ranks.map((s,i)=>{
  const meta=signalMeta[s.id],r=raw[s.id],base=readableBaseline(s.id);
  const close=Date.parse(closeTimes[s.id]);
  const when=Date.now()<close?'Polls not yet closed':r?'Published contest record detected':'No comparable counted-vote feed';
  const status=meta.state==='approved'?'Reviewed input eligible':meta.state==='rejected'?'Rejected by audit':'Research watchlist';
  const cls=meta.state==='approved'?'good':meta.state==='rejected'||r?'warn':'';
  const latest=r?'<small>Reported total: '+Number(r.total||0).toLocaleString()+(Number.isFinite(r.marginD)?' · raw D–R '+margin(r.marginD)+' (unadjusted, composition unknown)':'')+' · NOT an eligible adjustment (mode/geography audit missing).</small>':'';
  const relevant=Object.keys(targetParams).map(t=>({t,slope:signalStrength(s,t)})).sort((a,b)=>Math.abs(b.slope)-Math.abs(a.slope));
  const target=relevant.slice(0,2).map(z=>z.t).join(' / ');
  return '<tr><td><strong>'+esc(s.title)+'</strong><small>'+esc(s.close)+' ET · '+esc(s.id)+'</small>'+candidateMarkup(s.id)+'<small>Original Ervin reference: '+esc(base)+'</small></td>'+
   '<td>'+esc(s.why)+'<small>Strongest provisional transfer: '+esc(target)+' · rank '+(i+1)+'</small></td>'+
   '<td>'+esc(when)+latest+'</td><td><span class="nerd-flag '+cls+'">'+esc(status)+'</span><small>'+esc(meta.reason)+'</small>'+
   '<small><a href="../elections/?office='+(s.id.includes('SENATE')?'senate':'house')+'&state='+s.id.slice(0,2)+(s.id.includes('SENATE')?'':'&district='+s.id.slice(3))+'">Open race dossier</a></small></td></tr>';
 }).join('');
 $('manualList').innerHTML=manual.map(x=>'<div class="nerd-manual"><div><b>'+esc(x.id)+'</b> · what-if D share '+pct(share(baseline(x.id)+x.delta))+' · assumed '+pct(x.frac*100)+' reported · '+esc(x.mode)+'<br><small>Hypothetical, not official votes; D-R deviation: '+margin(x.delta)+'. '+(x.url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'">Research link</a>':'No source link')+'</small></div><button type="button" class="nerd-button" data-remove="'+esc(x.id)+'">Remove</button></div>').join('');
}
async function json(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),11000);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}finally{clearTimeout(timer)}}
function oaIndex(key){if(key.includes('-SENATE'))return key.slice(0,2);return key}
async function refresh(force=false){
 if(!force&&Date.now()-lastCheck<60000)return;lastCheck=Date.now();
 const sourcesToFetch=[json('../stats-for-nerds/reviewed-signals.json'),
  json('https://openamerica.io/elections/results.json?year=2026&office=House'),
  json('https://openamerica.io/elections/results.json?year=2026&office=Senate')];
 const outcomes=await Promise.allSettled(sourcesToFetch);raw={};
 if(outcomes[0].status==='fulfilled'){
  const v=outcomes[0].value;
  reviewed=v?.election==='2026-11-03'&&v?.version===1&&Array.isArray(v.signals)?v.signals.slice(0,150):[];
 }
 const names=['House','Senate'];
 for(let i=1;i<=2;i++){
  if(outcomes[i].status!=='fulfilled')continue;
  const v=outcomes[i].value;
  if(v?.api!==1||v.year!==2026||v.office!==names[i-1]||typeof v.races!=='object')continue;
  for(const [id,row] of Object.entries(v.races)){
   const key=String(id).toUpperCase();
   const possible=specs.find(s=>i===1?s.id===key:(s.id.endsWith('-SENATE')&&s.id.slice(0,2)===key));
   if(!possible||!Number.isSafeInteger(row?.total)||row.total<1||!Array.isArray(row.cands))continue;
   const timestamp=Date.parse(v.as_of||'');
   if(v.source!=='state'||!Number.isFinite(timestamp)||timestamp<Date.parse(closeTimes[possible.id])||timestamp>Date.now()+300000)continue;
   const parties=Object.fromEntries(['D','R'].map(p=>[p,row.cands.filter(c=>c?.p===p&&Number.isSafeInteger(c?.v)&&c.v>=0).reduce((n,c)=>n+c.v,0)]));
   const validParties=parties.D>0&&parties.R>0&&parties.D+parties.R<=row.total;
   raw[possible.id]={total:row.total,asOf:v.as_of,provider:'Open America',marginD:validParties?100*(parties.D-parties.R)/(parties.D+parties.R):null};
  }
 }
 audit();
 const passed=Object.values(signalMeta).filter(x=>x.state==='approved').length;
 $('sourceStatus').textContent='Last source check: '+new Date().toLocaleString('en-US')+'. '+passed+' reviewed eligible signal(s). '+
 (outcomes[0].status==='fulfilled'?'Reviewed-intake file accessible.':'Reviewed-intake file unavailable; no new automatic inputs.')+
 ' Open America may report an unaudited contest total, which is flagged but not used.';
 render();
}
async function init(){
 $('numWatch').textContent=specs.length;
 $('inputRace').innerHTML=specs.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join('');
 $('inputRace').value='VA-02';
 $('refreshSignals').addEventListener('click',()=>refresh(true));
 $('includeManual').onchange=e=>{includeManual=e.target.checked;render()};
 $('clearManual').onclick=()=>{manual=[];render()};
 $('whatifForm').addEventListener('submit',e=>{
  e.preventDefault();
  const id=$('inputRace').value,dem=+$('inputShare').value,coverage=+$('inputCoverage').value/100;
  const mode=$('inputMode').value,source=$('inputURL').value.trim(),b=baseline(id);
  if(!Number.isFinite(b)||!Number.isFinite(dem)||dem<0||dem>100||coverage<=0||coverage>1||(source&&!officialUrl(source))){$('formStatus').textContent='Invalid values or source link; nothing added.';return}
  manual=manual.filter(x=>x.id!==id);
  manual.push({id,delta:2*dem-100-b,frac:coverage,mode,method:'hypothetical',url:source});
  $('formStatus').textContent='Hypothetical stored for this browser session only; not a verified return.';
  render();
 });
 $('manualList').addEventListener('click',e=>{const key=e.target.closest('button[data-remove]')?.dataset.remove;if(!key)return;manual=manual.filter(x=>x.id!==key);render()});
 try{
  const [a,b,candidates]=await Promise.all([...sources.map(json),json('./candidates-2026.json').catch(()=>null)]);
  baselines=a.states||{};house=b.races||{};
  candidateRoster=(candidates?.version===1&&candidates?.election==='2026-11-03'&&typeof candidates.races==='object')?candidates.races:{};
  const selected=$('inputRace').value;
  $('inputRace').innerHTML=specs.map(x=>{
   const c=candidateRoster[x.id];
   return '<option value="'+esc(x.id)+'">'+esc(x.id+' · '+(c?c.democrat+' (D) vs. '+c.republican+' (R)':x.title))+'</option>';
  }).join('');
  $('inputRace').value=selected;
  if(['TX','KS','IA'].some(x=>!Number.isFinite(baseline(x))))throw Error('Target baseline missing');
  initial();audit();render();
  $('sourceStatus').textContent='Original Ervin polling and district files loaded. Awaiting independent verified early signals.';
  await refresh(true);
  setInterval(()=>{if(!document.hidden)refresh(false)},60000);
 }catch(e){$('sourceStatus').textContent='The baseline data could not be verified: '+e.message+'. No provisional model output will be displayed.';$('targetCards').textContent='Unable to load reproducible simulations.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();