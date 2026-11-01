/* State and county election benchmark UI; arithmetic uses ERVIN_WATCH_METRICS.
 * Never assumes partial reported counties have representative sample composition.
 */
(function(root){"use strict";
const M=root.ERVIN_WATCH_METRICS;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;":"&quot;","'":"&#39;"}[c]));
const fmt=x=>Number(x).toLocaleString("en-US");
const pct=(x,d=1)=>Number.isFinite(x)?(100*x).toFixed(d)+"%":"—";
const pt=(x,d=1)=>Number.isFinite(x)?x.toFixed(d)+" pts":"—";
const sign=(x,d=1)=>Number.isFinite(x)?(x>0?"+":"")+x.toFixed(d):"—";
const card=(label,value,explanation)=>'<div class="benchmark-item"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(explanation)+'</small></div>';
const modelInfo=(forecast)=>forecast&&Number.isFinite(forecast.adjustedMargin)&&forecast.mode==="Original Ervin";
function statePanels(state,forecast,turnout){
 const s=M.state(state,forecast,turnout);if(!s)return {top:"<p>Benchmarks unavailable</p>",table:"",explain:""};
 const has=modelInfo(forecast),margin=has?forecast.adjustedMargin:null;
 const label=state.party==="I"?"named non-Republican independent":"Democratic candidate";
 const target=s.modelShare;
 const top='<div class="eyebrow">2026 WINNING-PACE WORKSHEET · NOT REPORTED VOTES</div><div class="benchmark-grid">'+
 card("Modeled statewide non-R margin",has?sign(margin)+" pts":"No comparable forecast","Ervin’s Take · Original Ervin; non-R minus Republican")+
 card("Assumed statewide D+R turnout",fmt(s.total),"2024 presidential major-party turnout × "+pct(turnout,0))+
 card("Votes for outright 2-party lead",fmt(Math.floor(s.total/2)+1),"Either side needs at least this many under a two-candidate assumption")+
 card("Ervin modeled non-R vote pace",has?fmt(s.modelNonR):"Unavailable",has?"R "+fmt(s.modelR)+" · non-R "+pct(target)+" of assumed turnout":"No current modeled margin; historical tie remains available")+
 '</div><p class="footnote">This is a <b>hypothetical vote-count worksheet</b> for '+esc(state.state)+'. A winning threshold depends on actual turnout, third-party votes and certified returns. '+(state.party==="I"?"An independent opponent is not interchangeable with prior Democratic presidential returns. ":"")+'The statewide polling margin is not a county poll.</p>';
 const levels=[.55,.65,.8,.9,1,1.1];
 const rows=levels.map(x=>{const v=M.state(state,forecast,x);
  return '<tr class="'+(Math.abs(x-turnout)<.001?'chosen':'')+'"><td>'+pct(x,0)+' of 2024</td><td>'+fmt(v.total)+'</td><td>'+fmt(v.tieNonR)+'</td><td>'+(v.modelNonR==null?'—':fmt(v.modelNonR))+'</td><td>'+(v.modelR==null?'—':fmt(v.modelR))+'</td></tr>';
 }).join("");
 const table='<h3>Turnout sensitivity · statewide vote benchmarks</h3><p class="description">Try several Senate turnout totals against 2024 major-party presidential voting. Counts refer to the <b>named non-Republican candidate</b> versus Republican; they are scenario targets, not projected ballots.</p><div class="table-scroll"><table><thead><tr><th>Assumed turnout</th><th>Statewide D+R ballots</th><th>Votes for tie</th><th>Ervin non-R pace</th><th>Ervin Republican pace</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 return {top,table};
}
function countyPanel(unit,state,forecast,reported,turnout){
 const m=M.county(unit,state,forecast,turnout);if(!m)return'<p class="footnote">County benchmarks unavailable.</p>';
 const pace=M.countyPace(unit,reported,state,forecast,turnout);
 const b=m.model;
 const baseMajor=unit.v24.d+unit.v24.r;
 const party=state.party==="I"?"independent / non-R":"Democratic";
 const model= b?'<span class="numgold">'+pct(b.share)+'</span> · '+fmt(b.nonRVotes)+" "+party+" votes / "+fmt(b.repVotes)+" R":'<span>Model benchmark not available</span>';
 const row=(label,value,note)=>'<div class="county-indicator"><small>'+esc(label)+'</small><b>'+esc(value)+'</b><span>'+esc(note)+'</span></div>';
 const indicators='<div class="county-indicators">'+
 row("2024 actual two-party turnout",fmt(baseMajor),"2024 presidential D+R votes")+
 row("2024 vs 2020 turnout change",m.ballotsChange20==null?"Not comparable":sign(m.ballotsChange20)+"%", "All presidential ballots, not registered voter turnout")+
 row("2024 vs 2016 turnout change",m.ballotsChange16==null?"Not comparable":sign(m.ballotsChange16)+"%","All presidential ballots; historical geography must match")+
 row("2024 county net votes",(m.netVotes24>=0?"D +":"R +")+fmt(Math.abs(m.netVotes24)),"Democratic minus Republican, presidential")+
 row("Other 2024 ballots",fmt(m.minorParty24),"Not included in two-party benchmark")+
 row("Model swing vs 2024 county",m.adjustmentPts==null?"Unavailable":sign(m.adjustmentPts)+" pts","Uniform share shift; not a county-specific Senate poll")+
 '</div>';
 let live='';
 if(pace.status==="complete"){
  const delta=pace.offsetModelVotes;
  live='<div class="live-pace complete"><b>Verified complete local result · '+esc(pace.paceLabel)+'</b><p>Actual major-party votes: '+fmt(pace.reported)+'. Compared with the modeled share <b>at the actual observed D+R total</b>: '+(delta==null?"No model comparison":(delta>=0?'+':'')+fmt(delta)+" non-R votes versus the benchmark")+'. County only—not a projection of statewide victory.</p></div>';
 }else if(pace.status==="partial"){
  live='<div class="live-pace partial"><b>Partial local result</b><p>'+fmt(pace.reported)+' D+R ballots recorded; vote mix and reporting geography may be unrepresentative. This county is <b>not</b> assigned an ahead/behind benchmark status until its source marks reporting complete.</p></div>';
 }else live='<div class="live-pace"><b>Awaiting verified local returns</b><p>Benchmarks are pre-election scenarios. No November 2026 ballots have been counted in this unit on this page.</p></div>';
 return '<section class="county-benchmarks"><h3>Election-night numbers to watch</h3><div class="county-targets">'+
 card("Tie-state county benchmark",pct(m.tie.share),fmt(m.tie.nonRVotes)+" non-R of "+fmt(m.total)+" two-party ballots")+
 card("Original Ervin winning pace",b?pct(b.share):"Unavailable",b?fmt(b.nonRVotes)+" non-R and "+fmt(b.repVotes)+" Republican":"No eligible model margin")+
 card("Illustrative local turnout",fmt(m.total),pct(turnout,0)+" × 2024 major-party turnout")+
 card("Required margin at model pace",b?(b.nonRMargin>=0?"non-R +":"R +")+fmt(Math.abs(b.nonRMargin)):"Unavailable","Votes at scenario turnout; not a live result")+
 '</div>'+indicators+
 '<div class="county-target-detail"><b>Watch threshold:</b> '+model+'. A statewide tie instead requires '+fmt(m.tie.nonRVotes)+' non-R / '+fmt(m.tie.repVotes)+' Republican votes at this turnout. These thresholds move when turnout or the national forecast changes.</div>'+live+
 '<div class="footnote">Source baseline: 2024 presidential returns. Actual reporting may contain independents, different turnout patterns and voting rules. A county’s vote target is descriptive; complete county offsets cannot determine a statewide winner by themselves.</div></section>';
}
function paceSummary(state,forecast,rows,turnout){
 const complete=[],partial=[];
 for(const unit of state.units){const r=rows.find(x=>x.fips===unit.fips);if(!r)continue;
 const p=M.countyPace(unit,r,state,forecast,turnout);
 if(p.status==="complete")complete.push(p);
 else if(p.status==="partial")partial.push(p);
 }
 const assessed=complete.filter(p=>p.offsetModelVotes!=null);
 const surplus=assessed.reduce((a,p)=>a+p.offsetModelVotes,0);
 return '<div class="county-pace-mini">'+
 card("Fully reported watch units",complete.length+' / 10',partial.length+" additional units have incomplete figures")+
 card("Complete-unit model pace",!assessed.length?"Not yet measurable":(surplus>=0?"+":"")+fmt(surplus)+" non-R votes",assessed.length+" completely reported units only; not a statewide projected lead")+
 '</div>';
}
function extraStatePath(state,forecast,statewide,turnout){
 const code=state.code, race=statewide?.races?.[code];
 if(!race||!Array.isArray(race.cands))return'<p class="footnote">When attributable statewide candidate counts arrive, the sheet will calculate the remaining non-R vote share under this turnout scenario. No current statewide totals are available.</p>';
 const normalize=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const nonR=normalize(state.dem),rep=normalize(state.rep);
 const clean=c=>normalize(c.n);
 const last=s=>s.split(" ").at(-1)||s;
 function find(name){
  const exact=race.cands.filter(c=>clean(c)===name);
  if(exact.length===1)return exact[0];
  const tail=last(name),rough=race.cands.filter(c=>clean(c).split(" ").includes(tail));
  return rough.length===1?rough[0]:null;
 }
 const d=find(nonR),r=find(rep),v=M.state(state,forecast,turnout);
 if(!d||!r||d===r||![d.v,r.v].every(n=>Number.isSafeInteger(n)&&n>=0))
  return'<p class="footnote">State feed is available, but matching both named Senate candidates to the verified count is not confirmed. No remaining-vote threshold is inferred.</p>';
 const t=M.outstandingTarget(d.v,r.v,v.total);
 if(!t)return'';
 if(t.remaining<=0)return'<p class="footnote">Reported two-party votes have reached or exceeded the selected illustrative turnout total. Increase the turnout assumption; the model cannot infer uncounted ballots from this input.</p>';
 let description=t.possible?(t.alreadyAhead?'Already numerically ahead under this turnout assumption':fmt(t.required)+' of '+fmt(t.remaining)+' hypothetical remaining two-party votes ('+pct(t.share)+')'): 'Over 100% of hypothetical remaining votes would be needed at this assumed turnout';
 return '<div class="outstanding-detail"><strong>What share of remaining votes would '+esc(state.dem)+' need?</strong><p>'+esc(description)+'. Calculated from '+fmt(d.v)+' reported non-R and '+fmt(r.v)+' Republican votes, assuming '+fmt(v.total)+' final major-party ballots.</p><small>This is a conditional arithmetic scenario, not an estimate of real outstanding ballots or a live win probability. State results are still unofficial.</small></div>';
}
root.ERVIN_WATCH_WIDGETS=Object.freeze({statePanels,countyPanel,paceSummary,extraStatePath});
})(window);
