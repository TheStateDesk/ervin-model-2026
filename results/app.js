/* Source-documented results edition. Race call provenance remains AP-based and each result retains its original source link. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia'};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-'),apState=s=>'https://apnews.com/projects/elections-2026/'+slug(states[s]||s)+'-results/';
const label=id=>id.endsWith('-SENATE')?'senate':id.endsWith('-GOVERNOR')?'governor':'house';
const fmt=n=>Number(n).toLocaleString('en-US');
const safeLink=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null}catch{return null}};
const allowed=url=>{const u=safeLink(url);return u&&(/(^|\.)apnews\.com$|(^|\.)foxnews\.com$/).test(new URL(u).hostname)};
let rows=[],snap={},limit=36,firstRender=true;
const fetchJSON=async p=>{const r=await fetch(p+'?v='+Math.floor(Date.now()/60000),{cache:'no-store'});if(!r.ok)throw Error(p+' '+r.status);return r.json()};
for(const code of Object.keys(states)){const option=document.createElement('option');option.value=code;option.textContent=states[code];$('prState').append(option)}
function renderCards(){
 const cards=Object.entries(snap).filter(([id])=>id.endsWith('-SENATE')).map(([id,x])=>{
 const margin=x.pctD-x.pctR,place=states[x.state]||x.state;
 return '<div class="pr-snapshot-card"><small>'+esc(place)+' / U.S. SENATE</small><strong>'+esc(x.candidateD)+'</strong><span class="pr-margin">D +'+margin.toFixed(2)+'</span><p>'+fmt(x.votesD)+' D · '+fmt(x.votesR)+' R<br>'+x.reportingPct.toFixed(1)+'% reporting in the dated dated return snapshot</p><a href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Open source for these totals ↗</a><a href="'+apState(x.state)+'" target="_blank" rel="noopener noreferrer">Check latest results ↗</a></div>';
 });
 $('prSnapshotGrid').innerHTML=cards.join('')||'<p>Dated return snapshots are unavailable. <a href="https://apnews.com/projects/elections-2026/">View AP results directly</a>.</p>';
}
function draw(){
 const office=$('prOffice').value,state=$('prState').value,q=$('prSearch').value.toLowerCase().trim();
 let filtered=rows.filter(x=>(office==='all'||x.office===office)&&(state==='all'||x.state===state)&&(!q||[x.id,x.winner,x.place].join(' ').toLowerCase().includes(q)));
 filtered.sort((a,b)=>{const featured=['TX-SENATE','KS-SENATE','IA-SENATE','SC-SENATE','NC-SENATE','OH-SENATE','ME-SENATE'];const ai=featured.indexOf(a.id),bi=featured.indexOf(b.id);if(ai>=0||bi>=0)return (ai<0?99:ai)-(bi<0?99:bi);return a.id.localeCompare(b.id)});
 $('prCallNotice').textContent=fmt(filtered.length)+' locally documented source-linked race calls match these filters. These records do not replace AP’s full election ledger or certification.';
 $('prCallList').innerHTML=filtered.slice(0,limit).map(x=>{
 const source=safeLink(x.sourceUrl),party=x.party==='D'?'D':x.party==='R'?'R':'I';
 return '<article class="pr-race" id="race-'+esc(x.id)+'"><div><div class="pr-race-kicker">'+esc(x.place)+' · '+(x.office==='house'?'DISTRICT '+x.id.split('-')[1]:x.office.toUpperCase())+'</div><strong>'+esc(x.winner)+'</strong><small>Projected winner · not official certification</small>'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">Original call source ↗</a>':'')+'<a href="'+apState(x.state)+'" target="_blank" rel="noopener noreferrer">Latest state results ↗</a></div><span class="pr-party '+party+'">'+party+'</span></article>';
 }).join('')||'<p>No locally documented calls match. See <a href="https://apnews.com/projects/elections-2026/">AP’s full results</a> for current reporting.</p>';
 $('prShowMore').hidden=filtered.length<=limit;$('prStateNote').textContent=state==='all'?'Nationwide ledger':states[state]+' / sourced calls';
}
async function refresh(){
 try{const [calls,snapshot]=await Promise.all([fetchJSON('../election-night/ap-calls.json'),fetchJSON('./ap-verified-snapshots.json')]);
  if(calls.election!=='2026-11-03'||!calls.calls)throw Error('Invalid AP call ledger');
  rows=Object.entries(calls.calls).filter(([id,c])=>allowed(c.sourceUrl)&&typeof c.winner==='string'&&['D','R','I'].includes(c.party)).map(([id,c])=>({id,winner:c.winner,party:c.party,sourceUrl:c.sourceUrl,state:id.slice(0,2),place:states[id.slice(0,2)]||id.slice(0,2),office:label(id)}));
  snap=snapshot.races||{};const senate=rows.filter(x=>x.office==='senate').length,house=rows.filter(x=>x.office==='house').length,governor=rows.filter(x=>x.office==='governor').length;
  $('prAllCount').textContent=fmt(rows.length);$('prHouseCount').textContent=fmt(house);$('prStatewideCount').textContent=senate+' + '+governor;
  renderCards();draw();
  const params=new URLSearchParams(location.search);const state=params.get('state'),office=params.get('office'),race=params.get('race');
  if(state&&states[state.toUpperCase()])$('prState').value=state.toUpperCase();
  if(office&&['House','Senate','Governor'].includes(office))$('prOffice').value=office.toLowerCase();
  if(race){$('prSearch').value=race.toUpperCase();limit=36;}
  if(firstRender&&(state||office||race)){draw();setTimeout(()=>document.querySelector('#prRaces')?.scrollIntoView({block:'start'}),100)}firstRender=false
 }catch(err){console.error('AP results reader:',err);$('prCallNotice').innerHTML='This site's source-linked call ledger is temporarily unavailable. <a href="https://apnews.com/projects/elections-2026/">Open AP’s directly maintained results ↗</a>';renderCards()}
}
for(const id of ['prOffice','prState'])$(id).addEventListener('change',()=>{limit=36;draw()});
$('prSearch').addEventListener('input',()=>{limit=36;draw()});
$('prShowMore').addEventListener('click',()=>{limit+=72;draw()});
refresh();setInterval(()=>{if(!document.hidden)refresh()},5*60*1000);
})();