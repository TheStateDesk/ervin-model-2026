/* Results-first post-election page, AP calls and vote-leader isolation */
(function postElection(){
'use strict';
if(new URLSearchParams(location.search).get('view')==='final')return;
const $=id=>document.getElementById(id), root=new URL('../',document.currentScript?.src||location.href);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const when=d=>{const t=Date.parse(d||'');return Number.isFinite(t)?new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Not provided'};
const names=Object.fromEntries((window.ERVIN_US_GEOGRAPHY?.states||[]).map(s=>[s.code,s.name]));
const office=id=>id.endsWith('-SENATE')?'senate':id.endsWith('-GOVERNOR')?'governor':'house';
const href=id=>'../election-night/?state='+encodeURIComponent(id.slice(0,2))+'&race='+encodeURIComponent(id)+'#nationalBoard';
const apSource='https://apnews.com/article/9c5c4c5283f58b1ae0786e2f410c21a0';
let calls={},reports={},checkedAt=null,filter='all',busy=false;
function build(){
 const anchor=$('edSimulationPanel');if(!anchor)return;
 const el=document.createElement('section');el.id='postElectionDesk';el.className='post-desk';el.setAttribute('aria-label','2026 post-midterm results and analysis');
 el.innerHTML=`
 <div class="post-mast"><span>THE STATE DESK / POST-ELECTION EDITION</span><time datetime="2026-11-04">WEDNESDAY, NOVEMBER 4, 2026</time></div>
 <div class="post-hero">
  <div class="post-story"><div class="post-kicker">AMERICA AFTER THE MIDTERMS</div>
   <h1>Congress changes hands.</h1>
   <p class="post-deck">Democrats have won control of the House and Senate. The new balance of power redraws the landscape in Washington as election officials continue counting votes across the country.</p>
   <div class="post-story-actions"><a class="post-primary" href="#edSimulationPanel">National results map</a><a href="#postCloseRaces">Races still counting</a><a href="../analysis/">Read the analysis</a></div>
   <p class="post-attribution">National chamber calls: <a href="${apSource}" target="_blank" rel="noopener noreferrer">Associated Press, November 4</a>. Projections are not certifications.</p>
  </div>
  <div class="post-control" aria-label="National chamber outcomes">
   <div class="post-control-title">THE 2027 CONGRESS <span>PROJECTED CONTROL</span></div>
   <div class="post-chamber"><span>U.S. HOUSE</span><strong>Democratic majority</strong><small>Control projected by AP</small></div>
   <div class="post-chamber"><span>U.S. SENATE</span><strong>Democratic majority</strong><small>Control projected by AP</small></div>
   <div class="post-control-foot">Seat totals may change as remaining races are resolved. <a href="${apSource}" target="_blank" rel="noopener noreferrer">AP's national account</a>.</div>
  </div>
 </div>
 <div class="post-snapshot" aria-live="polite">
  <div><span class="post-figure-label">REPORTED CONTESTS</span><strong id="postReported">—</strong><small>Accepted unofficial vote records in this feed</small></div>
  <div><span class="post-figure-label">TRACKED AP CALLS</span><strong id="postCalled">—</strong><small>Individually sourced calls in the site's call ledger</small></div>
  <div><span class="post-figure-label">LATEST REPORTED RETURN</span><strong id="postSourceTime">Checking…</strong><small id="postDataHealth">CivicAPI / state election officials</small></div>
 </div>
 <div class="post-divider"><div><span class="post-kicker">ELECTION NIGHT VERDICTS</span><h2>Races that shaped 2026</h2></div><a href="../election-night/">Full results desk</a></div>
 <div class="post-milestones" id="postMilestones" aria-live="polite"><p>Loading AP calls…</p></div>
 <section class="post-watch" id="postCloseRaces" aria-labelledby="postCloseTitle">
  <div class="post-divider"><div><span class="post-kicker">COUNTING CONTINUES</span><h2 id="postCloseTitle">The closest outstanding counts</h2></div><span id="postOpenCount">Checking latest counts…</span></div>
  <p class="post-explainer">Reported races that lack an AP call <em>in our tracked ledger</em>, ranked by the narrowest unofficial margins. These races may have been called elsewhere; this is not an exhaustive list of nationally uncalled contests.</p>
  <div class="post-filters" id="postFilters" role="group" aria-label="Choose an election office">
   <button type="button" data-post-office="all" aria-pressed="true">All</button>
   <button type="button" data-post-office="senate" aria-pressed="false">Senate</button>
   <button type="button" data-post-office="house" aria-pressed="false">House</button>
   <button type="button" data-post-office="governor" aria-pressed="false">Governors</button>
  </div>
  <div class="post-close-list" id="postCloseList" aria-live="polite"><p>Loading current returns…</p></div>
  <p class="post-source-note" id="postCloseSource">Vote totals are unofficial and may be incomplete.</p>
 </section>
 <section class="post-analysis" id="postAnalysis" aria-labelledby="postAnalysisTitle">
  <div class="post-divider"><div><span class="post-kicker">THE POST-MIDTERM FILES / NOVEMBER 4</span><h2 id="postAnalysisTitle">The numbers behind the upheaval</h2></div><a href="../analysis/">All analysis</a></div>
  <div class="post-article-grid">
    <a href="../analysis/senate-seven-flips/" class="post-article-card post-article-card--lead"><span>01 / SENATE</span><strong>Seven states that changed the Senate</strong><p>The new majority runs through Texas, Kansas, Iowa and four more Republican-held seats. See the latest reported margins.</p><small>7 SENATE FLIPS · VIEW THE REPORT</small></a>
    <a href="../analysis/governors-switch/" class="post-article-card"><span>02 / GOVERNORS</span><strong>Four governorships turn Democratic</strong><p>Georgia, Iowa, Ohio and Texas move into the Democratic column, changing state-level governing power.</p><small>4 OFFICES FLIPPED · VIEW THE REPORT</small></a>
    <a href="../analysis/unfinished-count/" class="post-article-card"><span>03 / CLOSE COUNTS</span><strong>Where the count isn't over</strong><p>Mississippi and Alaska offer a reminder that a decided majority is not the same as every contest being called.</p><small>LIVE UNOFFICIAL MARGINS · VIEW THE REPORT</small></a>
    <a href="../analysis/new-congress/" class="post-article-card"><span>04 / WASHINGTON</span><strong>A new Congress, a different Washington</strong><p>How the new House and Senate majorities reshape the legislative calendar, oversight and next year's negotiations.</p><small>218 HOUSE · 51 SENATE · VIEW THE REPORT</small></a>
  </div>
 </section>`;
 anchor.insertAdjacentElement('beforebegin',el);
 const mapHeading=document.createElement('div');mapHeading.className='post-map-intro';
 mapHeading.innerHTML='<span class="post-kicker">THE RESULTS ATLAS</span><h2>How America voted</h2><p>See the House, Senate and governor maps. Color represents reported vote leaders; distinct markers identify newsroom calls. Select a state or district for its election results.</p>';
 anchor.insertAdjacentElement('beforebegin',mapHeading);
 anchor.setAttribute('aria-label','National election results map');
 el.querySelectorAll('[data-post-office]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.postOffice;el.querySelectorAll('[data-post-office]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));drawOutstanding()}));
}
function valid(r){return r&&r.verified===true&&Number.isSafeInteger(r.total)&&r.total>0&&Array.isArray(r.candidates)&&r.candidates.length>=2&&r.candidates.every(c=>Number.isSafeInteger(c.votes)&&c.votes>=0)}
function outstanding(){return Object.entries(reports).filter(([id,r])=>valid(r)&&!calls[id]).map(([id,r])=>{
 const c=r.candidates.slice().sort((a,b)=>b.votes-a.votes);
 return {id,r,top:c[0],second:c[1],gap:c[0].votes-c[1].votes,margin:100*(c[0].votes-c[1].votes)/r.total,office:office(id)};
}).sort((a,b)=>a.margin-b.margin||b.r.total-a.r.total)}
function drawOutstanding(){
 const all=outstanding(),subset=all.filter(r=>filter==='all'||r.office===filter).slice(0,9),count=$('postOpenCount'),host=$('postCloseList');if(!host)return;
 count.textContent=all.length+' counted races without a local AP call';
 host.innerHTML=subset.length?subset.map(x=>{
  const place=names[x.id.slice(0,2)]||x.id.slice(0,2),tag=x.office==='house'?'DISTRICT '+x.id.slice(3):x.office.toUpperCase(),a=(100*x.top.votes/x.r.total).toFixed(1),b=(100*x.second.votes/x.r.total).toFixed(1);
  return '<a class="post-close-item" href="'+href(x.id)+'"><div class="post-close-ident"><b>'+esc(place)+'</b><small>'+esc(tag)+'</small></div><div class="post-close-names"><strong>'+esc(x.top.name)+' leads</strong><span>'+esc(x.second.name)+' · '+a+'% to '+b+'%</span></div><div class="post-close-margin"><strong>'+x.margin.toFixed(2)+' pts</strong><small>'+fmt(x.gap)+' votes · unofficial</small></div><span class="post-close-arrow" aria-hidden="true">›</span></a>';
 }).join(''):'<p class="post-empty">No reported, locally uncalled races match this filter.</p>';
 const old=subset.filter(x=>Date.now()-Date.parse(x.r.asOf)>7200000).length;
 $('postCloseSource').textContent='Source: state-sourced CivicAPI results. '+(old?old+' displayed counts were last updated over two hours ago. ':'')+'Margins are between the top two reported candidates, not necessarily the two major parties. Last desk check: '+when(checkedAt)+'.';
}
function drawMilestones(){
 const picks=['TX-SENATE','KS-SENATE','IA-SENATE','NC-SENATE','OH-SENATE','SC-SENATE','ME-SENATE','GA-GOVERNOR'].filter(id=>calls[id]).slice(0,6);
 $('postMilestones').innerHTML=picks.length?picks.map(id=>{
 const c=calls[id],r=reports[id],match=valid(r)?r.candidates.find(x=>x.name===c.winner):null,share=match?(100*match.votes/r.total).toFixed(1)+'% of unofficial ballots':'Vote share pending';
 return '<a class="post-milestone" href="'+href(id)+'"><span>'+esc(names[id.slice(0,2)]||id.slice(0,2))+' / '+office(id).toUpperCase()+'</span><strong>'+esc(c.winner)+'</strong><small>AP: '+(c.party==='D'?'Democratic':'Republican')+' win · '+esc(share)+'</small></a>';
 }).join(''):'<p class="post-empty">Call ledger updating. <a href="../election-night/">View returns.</a></p>';
}
function drawSnapshot(){
 const validRows=Object.values(reports).filter(valid),latest=Math.max(0,...validRows.map(x=>Date.parse(x.asOf||'')).filter(Number.isFinite));
 $('postReported').textContent=fmt(validRows.length);$('postCalled').textContent=fmt(Object.keys(calls).length);
 $('postSourceTime').textContent=latest?when(new Date(latest).toISOString()):'No timed return';
 $('postDataHealth').textContent='CivicAPI / state election officials · checked '+when(checkedAt);
}
async function refresh(){
 if(busy)return;busy=true;
 const get=async path=>{const u=new URL(path,root);u.searchParams.set('fresh',Math.floor(Date.now()/60000));const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()};
 try{
  const [a,b]=await Promise.allSettled([get('election-night/ap-calls.json'),get('civicapi/races.json')]);
  if(a.status==='fulfilled'&&a.value?.election==='2026-11-03'&&a.value?.calls)calls=a.value.calls;
  if(b.status==='fulfilled'&&b.value?.election==='2026-11-03'&&b.value?.races)reports=b.value.races;
  if(a.status==='fulfilled'||b.status==='fulfilled')checkedAt=new Date().toISOString();
  drawSnapshot();drawMilestones();drawOutstanding();
 }catch(e){console.warn('Post-election desk source refresh failed:',e)}
 finally{busy=false}
}
function init(){build();refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
