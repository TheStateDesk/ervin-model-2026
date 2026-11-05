/* Independent 2026 election newsroom; documented AP-based calls, multi-outlet reporting and original analysis. */
(function postElection(){
'use strict';
if(new URLSearchParams(location.search).get('view')==='final'){
 document.addEventListener('DOMContentLoaded',()=>document.getElementById('postElectionDesk')?.remove(),{once:true});
 return;
}
const $=id=>document.getElementById(id),root=new URL('../',document.currentScript?.src||location.href);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toLocaleString('en-US'),type=id=>id.endsWith('-SENATE')?'senate':id.endsWith('-GOVERNOR')?'governor':'house';
const picks=['TX-SENATE','KS-SENATE','IA-SENATE','SC-SENATE','NC-SENATE','OH-SENATE','ME-SENATE','GA-GOVERNOR','TX-GOVERNOR','IA-GOVERNOR','OH-GOVERNOR'];
const names={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const href=id=>'../results/?state='+id.slice(0,2)+'&race='+encodeURIComponent(id)+'#prRaces';
const ap='https://apnews.com/projects/elections-2026/';
const dataSource='https://apnews.com/article/ef6199e25927a9ac9f4c18eae0e497cd';
const stories=[
{slug:'forecast-grade',k:'FORECAST AUDIT · ACCOUNTABILITY',title:'We graded our forecast. The adjustment missed the wave.',desc:'A preliminary seven-race scorecard compares the locked Ervin forecast with its raw polling inputs and unofficial results.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/US%20Capitol%20East%20Front.JPG?width=720",read:'8 MIN'},
{slug:'three-state-election-margins',k:'DATA ANALYSIS · THE RED-STATE REVERSAL',title:'A 23-point reversal in the Republican heartland.',desc:'Texas, Kansas and South Carolina were deep-red presidential states in 2024. How far did the 2026 Senate result move?',img:"https://commons.wikimedia.org/wiki/Special:FilePath/US%20Capitol%20East%20Front.JPG?width=720",read:'7 MIN'},
{slug:'texas-new-era',k:'TEXAS · THE NEW AGENDA',title:'Talarico’s win gives Texas a new direction.',desc:'The economic proposals, coalition and difficult governing questions behind a historic Democratic Senate victory.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/TexasStateCapitolBuilding.jpg?width=720",read:'4 MIN'},
{slug:'kansas-hamilton-upset',k:'KANSAS · THE NEW SENATOR',title:'The pastor who broke a 94-year streak.',desc:'Adam Hamilton defeated Roger Marshall. His priorities extend from rural hospitals to tariffs and housing.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/Kansas%20state%20capitol%20building.jpg?width=720",read:'4 MIN'},
{slug:'south-carolina-andrews',k:'SOUTH CAROLINA · HEALTH CARE',title:'Annie Andrews made costs the campaign.',desc:'A pediatrician’s extraordinary Senate win puts rural care and affordability at the center of the story.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/South%20Carolina%20State%20House%2C%20Gervais%20Street%2C%20Columbia%2C%20SC.jpg?width=720",read:'4 MIN'},
{slug:'polls-underestimated-democrats',k:'THE BIG READ · POLLING',title:'The polls missed the Democratic wave.',desc:'In seven Senate flips, Democrats beat the final published polling averages by an average of 4.87 points. What happened?',img:"https://commons.wikimedia.org/wiki/Special:FilePath/2013%20Cambridge%20Massachusetts%20November%205th.jpg?width=720",read:'8 MIN'},
{slug:'senate-seven-flips',k:'THE SENATE',title:'Seven Senate seats changed hands.',desc:'How a sweep across very different states redrew the chamber.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/US%20Capitol%20East%20Front.JPG?width=720",read:'5 MIN'},
{slug:'governors-switch',k:'THE STATES',title:'Five governors’ races flipped; Alaska is still unresolved.',desc:'Georgia, Iowa, Nevada, Ohio and Texas changed parties. Alaska remains uncalled by AP.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/TexasStateCapitolBuilding.jpg?width=720",read:'5 MIN'},
{slug:'unfinished-count',k:'THE COUNT',title:'Why not every close race is finished.',desc:'A race call, a vote lead and certification are three distinct things.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/1900%20New%20York%20polling%20place.jpg?width=720",read:'5 MIN'},
{slug:'new-congress',k:'WASHINGTON',title:'The new politics of divided government.',desc:'The constitutional arithmetic changes in January.',img:"https://commons.wikimedia.org/wiki/Special:FilePath/Flickr%20-%20USCapitol%20-%20East%20Front%20of%20the%20U.S.%20Capitol.jpg?width=720",read:'5 MIN'}
];
let calls={},filter='all',busy=false,limit=30;
function init(){
 const anchor=$('edSimulationPanel');if(!anchor)return;
 const section=$('postElectionDesk')||document.createElement('section');section.id='postElectionDesk';section.className='post-desk';
 section.setAttribute('aria-label','Election results and original post-midterm journalism');
 section.innerHTML=`
 <div class="post-mast"><span>THE ERVIN MODEL / THE AFTERMATH</span><time datetime="2026-11-04">NOVEMBER 4, 2026</time></div>
 <div class="post-hero"><div class="post-story"><div class="post-kicker">AMERICA AFTER THE MIDTERMS</div>
 <h1>A national wave. A new political map.</h1>
 <p class="post-deck">Democrats captured both chambers of Congress while Senate victories in Texas, Kansas and South Carolina reached deep into Republican territory. Meet the new senators and examine what voters decided.</p>
 <div class="post-story-actions"><a class="post-primary" href="../results/">Election results</a><a href="../analysis/polls-underestimated-democrats/">Why the polls missed</a><a href="../analysis/">All reporting</a></div>
 <p class="post-attribution">Chamber control is projected in <a href="https://www.reuters.com/business/media-telecom/takeaways-us-midterm-elections-2026-11-04/" target="_blank" rel="noopener noreferrer">Reuters' national election analysis</a> and <a href="${dataSource}" target="_blank" rel="noopener noreferrer">AP reporting</a>. Projections are not certifications.</p></div>
 <div class="post-control"><div class="post-control-title">THE NEXT CONGRESS <span>PROJECTED CONTROL</span></div>
 <div class="post-chamber"><span>HOUSE OF REPRESENTATIVES</span><strong>Democratic majority</strong><small><a href="https://www.cbsnews.com/news/democrats-win-house-majority/" target="_blank" rel="noopener noreferrer">CBS News projected Nov. 3, 10:22 p.m. ET</a></small></div>
 <div class="post-chamber"><span>U.S. SENATE</span><strong>At least 54 D-aligned seats</strong><small><a href="https://www.cbsnews.com/news/senate-control-democrats-republicans-2026-midterm-elections/" target="_blank" rel="noopener noreferrer">CBS projected control Nov. 3, 11:46 p.m. ET</a>; two contests uncalled Nov. 4</small></div>
 <div class="post-control-foot"><a href="${ap}" target="_blank" rel="noopener noreferrer">Latest calls and votes at AP ↗</a></div></div></div>
 <section class="post-state-package" aria-label="Featured reporting from Texas Kansas and South Carolina">
 <div class="post-package-heading"><span>THE BIG THREE / NOVEMBER 4, 2026</span><strong>Election night rewrote the map in three red states.</strong><a href="../analysis/three-state-election-margins/">See the data behind the shift →</a></div>
 <div class="post-package-grid">
 <a href="../analysis/texas-new-era/" class="post-package-card"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/TexasStateCapitolBuilding.jpg?width=700" alt="Texas State Capitol, historic illustration" loading="lazy"><span>TEXAS · THE NEW SENATOR</span><strong>James Talarico's new mandate</strong><small>Economics, corruption and a 12-point Senate lead in the November 4 snapshot</small></a>
 <a href="../analysis/kansas-hamilton-upset/" class="post-package-card"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Kansas%20state%20capitol%20building.jpg?width=700" alt="Kansas State Capitol, historic illustration" loading="lazy"><span>KANSAS · THE HISTORIC UPSET</span><strong>Adam Hamilton ends 94 years of Republican Senate wins</strong><small>What the Methodist pastor wants to change in Washington</small></a>
 <a href="../analysis/south-carolina-andrews/" class="post-package-card"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/South%20Carolina%20State%20House%2C%20Gervais%20Street%2C%20Columbia%2C%20SC.jpg?width=700" alt="South Carolina State House, historic illustration" loading="lazy"><span>SOUTH CAROLINA · THE UPSET</span><strong>Annie Andrews’ next test: health care and costs</strong><small>Rural hospitals, groceries and the first Democratic win since 1998</small></a></div>
 </section>
 <div class="post-snapshot" aria-live="polite">
 <div><span class="post-figure-label">U.S. SENATE</span><strong>54+</strong><small>D-aligned seats in Nov. 4 reporting; two seats still uncalled</small></div>
 <div><span class="post-figure-label">GOVERNOR FLIPS</span><strong>5</strong><small>Called Democratic gains; Alaska unresolved by AP</small></div>
 <div><span class="post-figure-label">CURRENT RESULTS COVERAGE</span><strong id="postSourceTime">AP NEWS</strong><small id="postDataHealth"><a href="${ap}" target="_blank" rel="noopener noreferrer">Open AP's live election results ↗</a></small></div>
 </div>
 <div class="post-divider"><div><span class="post-kicker">THE ELECTION'S PIVOTAL RESULTS</span><h2>Races that changed the map</h2></div><a href="../results/">Browse verified calls</a></div>
 <div class="post-milestones" id="postMilestones"><p>Checking locally sourced winner calls…</p></div>
 <section class="post-watch" id="postCloseRaces" aria-labelledby="postCloseTitle">
 <div class="post-divider"><div><span class="post-kicker">SOURCE-LINKED ELECTION RETURNS</span><h2 id="postCloseTitle">Explore the results</h2></div><span id="postOpenCount">Loading source records</span></div>
 <p class="post-explainer">The board documents published newsroom projections, not official certifications. Our local record is a partial index of called races. For current counts, open the linked results publisher.</p>
 <div class="post-filters" id="postFilters" role="group" aria-label="Choose an election office">
 <button type="button" data-post-office="all" aria-pressed="true">All</button><button type="button" data-post-office="senate" aria-pressed="false">Senate</button><button type="button" data-post-office="house" aria-pressed="false">House</button><button type="button" data-post-office="governor" aria-pressed="false">Governors</button></div>
 <div class="post-close-list" id="postCloseList"><p>Loading AP-attributed winners…</p></div><button id="postMore" class="post-more" type="button" hidden>Show more sourced results</button>
 <p class="post-source-note" id="postCloseSource">Winner calls are sourced separately from vote totals. The underlying call ledger uses AP reporting, including AP-syndicated publishers.</p></section>
 <section class="post-peer-coverage" aria-label="Reporting from other newsrooms">
  <div class="post-divider"><div><span class="post-kicker">ADDITIONAL REPORTING / ORIGINAL LOCAL AND NATIONAL NEWSROOMS</span><h2>Reporting from other newsrooms</h2></div><a href="../analysis/">Our own analysis</a></div>
  <div class="post-peer-grid">
   <a href="https://www.texastribune.org/2026/11/04/texas-democrats-blue-wave/" target="_blank" rel="noopener noreferrer"><span>THE TEXAS TRIBUNE · TEXAS</span><strong>How Texas's statewide power structure changed</strong><small>Local reporting on the sweep, the governor's race and the road ahead.</small></a>
   <a href="https://kansasreflector.com/2026/11/03/hamilton-makes-history-with-u-s-senate-win/" target="_blank" rel="noopener noreferrer"><span>KANSAS REFLECTOR · KANSAS</span><strong>A historic Senate race seen from the counties</strong><small>Turnout in Johnson, Sedgwick and Wyandotte counties, and Hamilton's path.</small></a>
   <a href="https://courthousenews.com/annie-andrews-defeats-darline-graham-in-south-carolina-senate-race/" target="_blank" rel="noopener noreferrer"><span>COURTHOUSE NEWS SERVICE · SOUTH CAROLINA</span><strong>Two Republican-leaning counties shift toward Andrews</strong><small>Greenville and York reveal why the statewide margin matters.</small></a>
   <a href="https://www.reuters.com/business/media-telecom/takeaways-us-midterm-elections-2026-11-04/" target="_blank" rel="noopener noreferrer"><span>REUTERS · NATIONAL</span><strong>Economic anxiety underlies the 2026 results</strong><small>Voter concerns, control of Congress and the limits of a new majority.</small></a>
  </div>
 </section>
 <section class="post-analysis" id="postAnalysis" aria-labelledby="postAnalysisTitle">
 <div class="post-divider"><div><span class="post-kicker">INDEPENDENT ANALYSIS / FEATURED STORIES</span><h2 id="postAnalysisTitle">The numbers behind the upheaval</h2></div><a href="../analysis/">All reporting</a></div>
 <div class="post-article-grid">${stories.map((s,i)=>'<a class="post-article-card'+(i===0?' post-article-card--lead':'')+'" href="../analysis/'+s.slug+'/"><div class="post-article-photo"><img src="'+s.img+'" loading="'+(i===0?'eager':'lazy')+'" alt="Historical editorial illustration for this 2026 election article"></div><span>'+s.k+'</span><strong>'+s.title+'</strong><p>'+s.desc+'</p><small>'+s.read+' READ · EXPLORE →</small></a>').join('')}</div>
 </section>`;
 if(!section.isConnected)anchor.insertAdjacentElement('beforebegin',section);
 const note=document.createElement('div');note.className='post-map-intro';
 note.innerHTML='<span class="post-kicker">SUPPLEMENTAL GEOGRAPHIC DATA / NOT AN AP FEED</span><h2>The election atlas</h2><p>This geographic visualization is maintained separately from AP. For authoritative, up-to-the-minute vote counts and winner calls, use the <a href="../results/">AP-led results board</a> or <a href="https://apnews.com/projects/elections-2026/" target="_blank" rel="noopener noreferrer">AP directly</a>. Map data may lag.</p>';
 anchor.insertAdjacentElement('beforebegin',note);
 section.querySelectorAll('[data-post-office]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.postOffice;limit=30;section.querySelectorAll('[data-post-office]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()})); const more=$('postMore');if(more)more.addEventListener('click',()=>{limit+=40;draw();});
 refresh();setInterval(()=>{if(!document.hidden)refresh()},5*60*1000);
}
function safe(c){try{const u=new URL(c.sourceUrl);return /^https:$/.test(u.protocol)&&/(^|\.)(apnews|foxnews)\.com$/.test(u.hostname)}catch{return false}}
function matching(){return Object.entries(calls).filter(([id,c])=>safe(c)&&['D','R','I'].includes(c.party)&&typeof c.winner==='string')}
function draw(){
 const ledger=matching(),eligible=ledger.filter(([id])=>filter==='all'||type(id)===filter);
 const sorted=eligible.sort((a,b)=>{const x=picks.indexOf(a[0]),y=picks.indexOf(b[0]);if(x!==-1||y!==-1)return (x===-1?999:x)-(y===-1?999:y);return a[0].localeCompare(b[0])});
 const list=sorted.slice(0,limit); const more=$('postMore');if(more){more.hidden=sorted.length<=limit;more.textContent='Show more sourced results ('+(sorted.length-limit)+' remaining)';}$('postOpenCount').textContent=fmt(eligible.length)+' source-linked calls in this office';
 $('postCloseList').innerHTML=list.length?list.map(([id,c])=>{
 const state=names[id.slice(0,2)]||id.slice(0,2),office=type(id),label=office==='house'?'DISTRICT '+id.slice(3):office.toUpperCase();
 return '<a class="post-close-item" href="'+href(id)+'"><div class="post-close-ident"><b>'+esc(state)+'</b><small>'+label+'</small></div><div class="post-close-names"><strong>'+esc(c.winner)+'</strong><span>Projected winner · Original call documented</span></div><div class="post-close-margin"><strong>'+esc(c.party)+'</strong><small>Source-linked</small></div><span class="post-close-arrow" aria-hidden="true">›</span></a>';
 }).join(''):'<p class="post-empty">No AP-attributed calls match this office in our local ledger. <a href="https://apnews.com/projects/elections-2026/">Browse AP directly.</a></p>';
 $('postCloseSource').innerHTML='Method: the site\'s archived winner-call ledger draws on AP reporting and AP-syndicated publications; the original call source is linked for each race. It is not a direct live API. The ledger updates when the repository is refreshed. <a href="'+ap+'" target="_blank" rel="noopener noreferrer">Check the underlying results publisher</a>.';
 if($('postReported'))$('postReported').textContent=fmt(ledger.filter(([id])=>type(id)==='house').length);
 if($('postCalled'))$('postCalled').textContent=fmt(ledger.length);
 $('postMilestones').innerHTML=picks.filter(id=>calls[id]&&safe(calls[id])).slice(0,6).map(id=>{
 const c=calls[id],state=names[id.slice(0,2)]||id.slice(0,2);
 return '<a class="post-milestone" href="'+href(id)+'"><span>'+state+' / '+type(id).toUpperCase()+'</span><strong>'+esc(c.winner)+'</strong><small>Projected winner · Open race</small></a>';
 }).join('')||'<p class="post-empty">AP-attributed ledger updating. <a href="'+ap+'">Browse AP results.</a></p>';
}
async function refresh(){
 if(busy)return;busy=true;
 try{const url=new URL('election-night/ap-calls.json',root);url.searchParams.set('fresh',Math.floor(Date.now()/300000));const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Call ledger '+r.status);const j=await r.json();if(j.election!=='2026-11-03'||!j.calls)throw Error('Invalid AP call ledger');calls=j.calls;draw()}
 catch(e){console.warn('AP-attributed homepage ledger unavailable',e);$('postCloseList').innerHTML='<p>Our locally documented calls are unavailable. <a href="'+ap+'">View AP results directly.</a></p>'}
 finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
