/* 2026 Counties to Watch — historical indicators and attributed vote snapshots.
 * No prediction is represented as a verified vote or a calibrated county win probability.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const metrics=window.ERVIN_WATCH_METRICS,widgets=window.ERVIN_WATCH_WIDGETS;
const money=n=>Number(n||0).toLocaleString("en-US");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=(n,d=1)=>Number.isFinite(Number(n))?Number(n).toFixed(d)+"%":"—";
const signed=(n,d=1)=>(n>=0?"D +":"R +")+Math.abs(n).toFixed(d);
const num=(n,d=1)=>(n>0?"+":"")+Number(n).toFixed(d);
const formatTime=s=>{if(!s)return"Unreported";let t=new Date(s);return Number.isFinite(+t)?t.toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Unreported"};
const fromURL=new URLSearchParams(location.search);
let hist=null,sources=null,forecast=null,live=null,statewide=null,code=fromURL.get("state")?.toUpperCase()||"MI",selected=null,sort="importance",turnout=.8,search="",lastStatus="Loading county result snapshot";
let requestBusy=false,lastChecked=0;
function winMargin(c){return 100*(c.d-c.r)/Math.max(1,c.d+c.r)}
function histories(u){
 return [[2016,u.v16],[2020,u.v20],[2024,u.v24]].filter(p=>p[1]);
}
function winnerRow(u){return u.v24.d>u.v24.r?"Democratic":u.v24.d<u.v24.r?"Republican":"Tied"}
function liveRows(){
 const entry=live?.states?.[code];
 return Array.isArray(entry?.counties)?entry.counties:[];
}
function safeLink(url){
 try{const x=new URL(url);return x.protocol==="https:"&&!x.username&&!x.password?x.href:null}catch{return null}
}
function validLiveSnapshot(value){
 if(!value||value.version!==1||value.election!=="2026-11-03"||value.office!=="US Senate"||!value.states||typeof value.states!=="object")throw Error("Unrecognized source");
 const earliest=Date.parse("2026-11-04T00:00:00Z"),now=Date.now();
 const acceptable={};
 for(const [key,r] of Object.entries(value.states)){
  if(!hist?.states[key]||!Array.isArray(r.counties)||r.counties.length>400)continue;
  const seen=new Set(),rows=[];
  for(const raw of r.counties){
   const unit=hist.states[key].units.find(x=>x.fips===String(raw.fips));
   if(!unit||seen.has(unit.fips))continue;
   const okVotes=[raw.dem,raw.rep,raw.other].every(x=>Number.isSafeInteger(x)&&x>=0&&x<50000000);
   const timestamp=Date.parse(raw.asOf),source=safeLink(raw.sourceUrl);
   if(!okVotes||raw.dem+raw.rep+raw.other<=0||!Number.isFinite(timestamp)||timestamp<earliest||timestamp>now+300000||!source)continue;
   if(!["partial","complete"].includes(raw.reportingStatus))continue;
   seen.add(unit.fips);rows.push({...raw,fips:unit.fips,sourceUrl:source});
  }
  acceptable[key]={...r,counties:rows};
 }
 return {...value,states:acceptable};
}
const STATEWIDE_API="https://openamerica.io/elections/results.json?year=2026&office=Senate";
let lastStatewideCheck=0,statewideLoading=false,statewideCheckedAt=null;
function renderStatewide(){
 const box=$("statewideLive");if(!box||!hist)return;
 const race=statewide?.races?.[code],valid=race&&Array.isArray(race.cands)&&race.cands.length>=2;
 if(!valid){
  box.innerHTML='<strong>Statewide 2026 U.S. Senate count</strong><p>No verified statewide count available in the public supported-state feed for '+esc(hist.states[code].state)+'. The official state election portal is linked below. No vote is inferred.</p>';
  return;
 }
 const cands=race.cands.filter(c=>c&&typeof c.n==="string"&&/^[A-ZILGCWDR]$/.test(c.p||"")&&Number.isSafeInteger(c.v)&&c.v>=0).sort((a,b)=>b.v-a.v);
 if(cands.length<2){box.innerHTML='<strong>Statewide reporting</strong><p>Provider candidate counts unavailable.</p>';return;}
 const count=cands.reduce((n,c)=>n+c.v,0);
 if(!count){box.innerHTML='<strong>Statewide reporting</strong><p>Awaiting verified candidate votes.</p>';return;}
 const timestamp=statewideCheckedAt||statewide.as_of;
 box.innerHTML='<div class="section-head"><div><strong>Statewide Senate count · verified state-feed transcription</strong><small>Not a race call, projection or sum of the watched counties</small></div><span class="status-tag live">'+esc(race.pct_in==null?"Reporting share unavailable":pct(race.pct_in)+" precincts")+'</span></div>'+
 '<div class="statewide-candidates">'+cands.slice(0,5).map(c=>'<div class="statewide-candidate"><span>'+esc(c.n)+' <small>('+esc(c.p)+')</small></span><b>'+money(c.v)+' <small>'+pct(100*c.v/count)+'</small></b></div>').join("")+'</div>'+
 '<p class="footnote">State-level reported totals from <a href="https://openamerica.io/elections/api/" target="_blank" rel="noopener noreferrer">Open America’s state-results transcription</a> · Provider updated: '+esc(formatTime(timestamp))+'. The original election agency remains authoritative.</p>';
}
async function refreshStatewide(force=false){
 if(statewideLoading||document.hidden||!hist)return;
 if(Date.now()<Date.parse("2026-11-04T00:00:00Z"))return;
 if(!force&&Date.now()-lastStatewideCheck<58000)return;
 statewideLoading=true;lastStatewideCheck=Date.now();
 try{
  const ctrl=new AbortController(),clock=setTimeout(()=>ctrl.abort(),10500);
  let response;try{response=await fetch(STATEWIDE_API,{cache:"no-store",signal:ctrl.signal})}finally{clearTimeout(clock)}
  if(!response.ok)throw Error("Statewide endpoint "+response.status);
  const raw=await response.json();
  if(raw.year!==2026||String(raw.office).toLowerCase()!=="senate"||raw.source!=="state"||typeof raw.races!=="object")throw Error("Wrong election or office");
  if(raw.as_of){const asOf=Date.parse(raw.as_of);if(!Number.isFinite(asOf)||asOf>Date.now()+300000||asOf<Date.parse("2026-11-04T00:00:00Z"))throw Error("Statewide result timestamp not for the 2026 count");}
  statewide=raw;statewideCheckedAt=raw.as_of||null;
 }catch(err){if(!statewide)statewide={races:{}}}
 statewideLoading=false;renderStatewide();
 if(hist?.states?.[code])$("stateOutstanding").innerHTML=widgets.extraStatePath(hist.states[code],forecast?.states?.[code],statewide,turnout);
}
function watchList(){
 const units=[...hist.states[code].units];
 const score=(u)=>sort==="volume"?u.v24.total:sort==="swing"?Math.abs(u.swing||0):sort==="close"?-Math.abs(u.m24):sort==="alignment"?(u.alignment.cycles>=2?u.alignment.rate:-1):u.score;
 units.sort((a,b)=>score(b)-score(a)||a.rank-b.rank);
 return units.filter(u=>u.name.toLowerCase().includes(search.toLowerCase()));
}
function liveFor(u){return liveRows().find(x=>x.fips===u.fips)}
function benchmarks(u){
 const votes=Math.round((u.v24.d+u.v24.r)*turnout);
 const d=Math.round(votes*u.benchmarkShare/100);
 return {votes,d,r:votes-d,share:u.benchmarkShare,baseline:u.v24.d/(u.v24.d+u.v24.r)*100};
}
function renderSummary(){
 const s=hist.states[code],c=s.stateCycles,baseline=c["2024"],name=(s.party==="I"?"Independent / non-Republican":"Democratic");
 $("stateTitle").textContent=s.state+" · "+s.dem+" vs "+s.rep;
 const official=sources?.sources?.[code];
 if(official){$("officialLink").href=official.url;$("officialLink").textContent=official.name+" ↗";}
 const b=s.stateBaselineTwoPartyDShare;
 const stateRows=liveRows(),count=stateRows.length;
 let known=stateRows.reduce((total,row)=>total+row.dem+row.rep+row.other,0);
 $("stateFeedStatus").textContent=count?count+" watch units with returns":"No verified county returns";
 $("stateFeedStatus").classList.toggle("live",count>0);
 $("stateStats").innerHTML=[
  ["2024 presidential margin",signed((b-.5*100)*2,1),"Two-party vote, state baseline"],
  ["Top ten vote coverage",pct(s.selectedBallotShare,1),"Share of all 2024 presidential votes"],
  ["Statewide tie shift",num(50-b,1)+" pts","D-share movement from 2024 to 50%"],
  ["Verified watch units",count+" / 10",count?money(known)+" reported votes in watch units":"No attributed 2026 vote snapshot"]
 ].map(([lab,value,note])=>'<div class="stat"><span>'+esc(lab)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>').join("");
 $("stateMeter").innerHTML='<div class="state-meter"><div class="d" style="width:'+b+'%"></div><div class="r" style="width:'+(100-b)+'%"></div></div><div class="legend"><span><strong>D '+pct(b)+'</strong> · 2024 presidential two-party share</span><span><strong>R '+pct(100-b)+'</strong></span></div>';
 $("stateContext").textContent="The 2024 presidential two-party result provides the starting point—not a Senate vote forecast. The highlighted counties accounted for "+pct(s.selectedBallotShare)+" of all 2024 ballots. A statewide tie would require a "+Math.abs(50-b).toFixed(1)+"-point "+(b<50?"Democratic":"Republican")+" shift in the two-party share under a uniform-swing illustration. "+(s.party==="I"?"This Senate challenger is an independent, and these D/R presidential benchmarks are especially limited.":"");
 renderStatewide();
 $("rankHeading").textContent="Top 10 "+(code==="AK"?"Alaska state House districts":"counties")+" to watch";
 $("coverageText").textContent=code==="AK"?"Alaska: 2024 state House district results are first-choice presidential votes; boundaries and vote methods differ from past elections. Historical county/state agreement is unavailable.":"The ten selected counties together represented "+pct(s.selectedBallotShare)+" of 2024 presidential votes in "+s.state+". Benchmark votes are scaled to "+pct(turnout*100,0)+" of the county's 2024 D+R turnout, not a 2026 turnout prediction.";
 const years=[2016,2020,2024];
 $("historicalState").innerHTML=years.filter(y=>c[y]).map(y=>{
  const row=c[y],m=100*row.margin;
  return '<div class="history-state-row"><strong>'+y+'</strong><span class="'+(m>=0?"numblue":"numred")+'">'+signed(m,1)+'</span><span>'+money(row.d+row.r)+' D+R votes</span></div>';
 }).join("");
 const msg=count?count+" of ten chosen units have verified 2026 returns recorded; "+money(known)+" total votes shown. These are not a statewide call.":"No verified November 3, 2026 Senate county returns in this site's feed. The official source link is available for independent checking.";
 $("feedMessage").textContent=msg;
 const pace=widgets.statePanels(s,forecast?.states?.[code],turnout);
 $("winningBenchmarks").innerHTML=pace.top;
 $("turnoutSensitivity").innerHTML=pace.table;
 $("countyPaceSummary").innerHTML=widgets.paceSummary(s,forecast?.states?.[code],stateRows,turnout);
 $("stateOutstanding").innerHTML=widgets.extraStatePath(s,forecast?.states?.[code],statewide,turnout);
}
function renderTable(){
 const rows=watchList(),s=hist.states[code];
 $("countyRows").innerHTML=rows.length?rows.map(u=>{
  const b=benchmarks(u),votes=liveFor(u),cor=u.alignment,m=metrics.county(u,s,forecast?.states?.[code],turnout);
  const agreement=cor.cycles>=2?pct(cor.rate,0):"N/A";
  const move=u.swing==null?"Different boundaries":num(u.swing)+" pts D";
  const liveCell=votes?'<strong class="'+(votes.dem>=votes.rep?"numblue":"numred")+'">'+signed(winMargin(votes),1)+'</strong><small>'+money(votes.dem)+" / "+money(votes.rep)+" votes · "+esc(votes.reportingStatus)+'</small>':'<small>Awaiting attributed returns</small>';
  return '<tr tabindex="0" role="button" aria-label="Inspect '+esc(u.name)+'" data-fips="'+esc(u.fips)+'" class="'+(selected===u.fips?"active":"")+'"><td><strong><span class="numgold">#'+u.rank+'</span> '+esc(u.name)+'</strong><small>Importance '+u.score+' / 100</small></td><td class="'+(u.m24>=0?"numblue":"numred")+'">'+signed(u.m24,1)+'</td><td>'+esc(move)+'</td><td>'+money(u.v24.total)+'</td><td><strong>'+pct(u.benchmarkShare)+'</strong><small>'+money(b.d)+' / '+money(b.votes)+' D+R ballots</small></td><td><strong class="numgold">'+(m?.model?pct(m.model.share*100):"Unavailable")+'</strong><small>'+(m?.model?money(m.model.nonRVotes)+" non-R of "+money(m.total):"No modeled benchmark")+'</small></td><td><span class="aligned">'+agreement+'</span><small>'+(cor.cycles>=2?cor.matches+'/'+cor.cycles+' years aligned':'Insufficient comparable years')+'</small></td><td>'+(m?.ballotsChange20==null?"Not comparable":(m.ballotsChange20>=0?"+":"")+m.ballotsChange20.toFixed(1)+"%")+'</td><td>'+liveCell+'</td></tr>';
 }).join(""):'<tr><td colspan="9">No watched counties match the search.</td></tr>';
}
function renderCounty(){
 const s=hist.states[code],u=s.units.find(x=>x.fips===selected)||s.units[0];if(!u)return;selected=u.fips;
 const b=benchmarks(u),liveVotes=liveFor(u);
 const agreement=u.alignment.cycles>=2?pct(u.alignment.rate,0):"Not available";
 $("countyInspector").innerHTML='<div class="eyebrow">RANK #'+u.rank+' · '+esc(u.kind.toUpperCase())+'</div><h2>'+esc(u.name)+'</h2><div class="big-number">'+signed(u.m24,1)+' in 2024</div><div class="county-metrics">'+[
 ["Historical statewide alignment",agreement,u.alignment.cycles>=2?u.alignment.matches+' matches / '+u.alignment.cycles+' presidential elections; not 2026 win odds':'District boundaries not historically comparable'],
 ["Statewide-tie benchmark",pct(u.benchmarkShare),money(b.d)+' D/independent votes of '+money(b.votes)+' assumed D+R votes'],
 ["2020→2024 two-party swing",u.swing==null?"Not comparable":num(u.swing,1)+" pts",u.swing==null?"District boundaries changed":"Presidential Democratic-share change × 2"],
 ["Share of 2024 state vote",pct(u.voteShare,2),money(u.v24.total)+' presidential votes']
 ].map(([a,v,n])=>'<div><small>'+esc(a)+'</small><strong>'+esc(v)+'</strong><small>'+esc(n)+'</small></div>').join("")+'</div>'+
 '<h3>Election history</h3><div class="county-history">'+histories(u).map(([year,r])=>{
  const share=100*r.d/(r.d+r),m=winMargin(r);
  return '<div class="history-row"><b>'+year+'</b><div class="track"><i style="width:'+share+'%" class="'+(m<0?'r':'')+'"></i></div><b>'+signed(m,1)+' · '+money(r.d)+' / '+money(r.r)+'</b></div>';
 }).join("")+'</div>'+
 '<h3>2026 verified returns</h3>'+
 (liveVotes?'<p><b>'+money(liveVotes.dem)+' '+esc(s.party==="I"?"non-R":"D")+' / '+money(liveVotes.rep)+' R</b> · '+esc(liveVotes.reportingStatus)+' as of '+esc(formatTime(liveVotes.asOf))+' · <a target="_blank" rel="noopener noreferrer" href="'+esc(liveVotes.sourceUrl)+'">Original result source ↗</a></p>':'<p class="description">Not yet reported to the verified county snapshot. <a href="'+esc(sources?.sources?.[code]?.url||'#')+'" target="_blank" rel="noopener noreferrer">Check official state results ↗</a></p>')+
 '<p class="footnote">Benchmark at '+pct(turnout*100,0)+' of 2024 major-party turnout: '+money(b.d)+' non-R and '+money(b.r)+' R votes to match the illustrative 50–50 statewide uniform-swing scenario. This is not the Ervin Senate forecast.</p>';
 $("countyInspector").insertAdjacentHTML("beforeend",widgets.countyPanel(u,s,forecast?.states?.[code],liveVotes,turnout));
}
function render(){
 if(!hist?.states[code])code="MI";
 if(!hist.states[code].units.some(x=>x.fips===selected))selected=hist.states[code].units[0].fips;
 $("stateSelect").value=code;
 renderSummary();renderTable();renderCounty();
}
function selectUnit(fips){
 if(!hist.states[code].units.some(x=>x.fips===fips))return;
 selected=fips;renderTable();renderCounty();
}
async function loadResults(force=false){
 if(requestBusy||document.hidden||!hist)return;
 if(!force&&Date.now()-lastChecked<55000)return;
 requestBusy=true;lastChecked=Date.now();
 try{
  const response=await fetch("./results.json?ts="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const raw=await response.json();live=validLiveSnapshot(raw);lastStatus="County data checked "+formatTime(new Date().toISOString());
 }catch(e){lastStatus="County snapshot unavailable; last verified figures retained: "+e.message;}
 $("feedMessage").title=lastStatus;
 requestBusy=false;render();
}
async function init(){
 try{
  const [h,s,fore]=await Promise.all([fetch("./history.json").then(r=>{if(!r.ok)throw Error("History HTTP "+r.status);return r.json()}),
   fetch("./sources.json").then(r=>r.json()),fetch("./forecast-baselines.json").then(r=>{if(!r.ok)throw Error("Forecast snapshot unavailable");return r.json()})]);
  if(h.version!==1||Object.keys(h.states||{}).length!==17||Object.values(h.states).some(x=>x.units.length!==10))throw Error("Historical county dataset incomplete");
  hist=h;sources=s;
  forecast=fore?.version===1&&Object.keys(fore.states||{}).length===17?fore:null;
  const order=Object.values(hist.states).sort((a,b)=>a.state.localeCompare(b.state));
  $("stateSelect").innerHTML=order.map(x=>'<option value="'+x.code+'">'+esc(x.state)+' ('+x.code+')</option>').join("");
  $("stateSelect").addEventListener("change",e=>{code=e.target.value;selected=null;search="";$("countySearch").value="";const u=new URL(location.href);u.searchParams.set("state",code);history.replaceState(null,"",u);render()});
  $("sortMode").addEventListener("change",e=>{sort=e.target.value;renderTable()});
  $("turnoutMode").addEventListener("change",e=>{turnout=Number(e.target.value)||.8;render()});
  $("countySearch").addEventListener("input",e=>{search=e.target.value;renderTable()});
  $("countyRows").addEventListener("click",e=>{const tr=e.target.closest("tr[data-fips]");if(tr)selectUnit(tr.dataset.fips)});
  $("countyRows").addEventListener("keydown",e=>{if(!["Enter"," "].includes(e.key))return;const tr=e.target.closest("tr[data-fips]");if(tr){e.preventDefault();selectUnit(tr.dataset.fips)}});
  $("reloadResults").addEventListener("click",()=>loadResults(true));
  $("copyLink").addEventListener("click",async()=>{const u=new URL(location.href);u.searchParams.set("state",code);try{await navigator.clipboard.writeText(u.toString());$("copyLink").textContent="Link copied ✓"}catch{$("copyLink").textContent="Copy unavailable"}});
  render();await Promise.all([loadResults(true),refreshStatewide(true)]);
  setInterval(()=>{if(document.visibilityState==="visible"&&Date.now()>=Date.parse("2026-11-04T00:00:00Z")){loadResults();refreshStatewide()}},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){loadResults();refreshStatewide()}});
 }catch(err){$("countyRows").innerHTML='<tr><td colspan="7">Unable to load the verified history dataset: '+esc(err.message)+'</td></tr>';$("feedMessage").textContent="History load failed."}
}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();