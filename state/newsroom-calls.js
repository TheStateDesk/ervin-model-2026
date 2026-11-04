/* State-page Associated Press / NBC newsroom winner calls. Not vote counts. */
(()=>{'use strict';
const box=document.getElementById('stateNewsroomCalls'),status=document.getElementById('stateCallsStatus'),rows=document.getElementById('stateCallsRows'),official=document.getElementById('stateCallsOfficials');
if(!box||!status||!rows||!official)return;
const sources={
 PA:[['Pennsylvania official unofficial returns','https://electionreturns.pa.gov/'],['AP Pennsylvania results','https://apnews.com/projects/elections-2026/pennsylvania-results/']],
 NV:[['Nevada Silver State election results','https://results.nv.gov/'],['AP Nevada results','https://apnews.com/projects/elections-2026/nevada-results/']]
};
const mk=(tag,text,cl)=>{const x=document.createElement(tag);if(text!==null)x.textContent=text;if(cl)x.className=cl;return x};
const hyperlink=(title,href)=>{const a=mk('a',title);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
const known=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const code=()=>{const c=String(document.getElementById('stateSelect')?.value||new URLSearchParams(location.search).get('state')||'MI').toUpperCase();return known.has(c)?c:'MI'};
let lastPaintedState='';
function paint(){
 const state=code();lastPaintedState=state;
 const api=window.ERVIN_NBC_CALLS,all=api?.all()||{};
 const calls=Object.entries(all).filter(([key])=>key.startsWith(state+'-')).sort((a,b)=>a[0].localeCompare(b[0]));
 rows.replaceChildren();official.replaceChildren();
 const label=state==='PA'?'Pennsylvania':state==='NV'?'Nevada':state;
 status.textContent=api?(calls.length?calls.length+' independently sourced AP/NBC newsroom winner calls for '+label+'. These are not inferred from provisional vote leads.':'No AP or NBC newsroom calls in the currently sourced registry for '+label+'. An uncalled contest is not a zero-vote contest.'):
  'Checking separately sourced AP and NBC winner calls…';
 for(const [id,call] of calls){
  const item=mk('article',null,'ed-race');item.style.cssText='padding:12px 15px;margin-bottom:9px';
  item.append(mk('strong',(call.publisher==='Associated Press'?'AP CALLS · ':'NBC PROJECTS · ')+id+' · '+call.winner+' ('+call.party+')'));
  const more=mk('p',null,'ed-mini');more.append(hyperlink('Original '+call.publisher+' source',call.sourceUrl));
  more.append(document.createTextNode(' · '));
  const race=mk('a','Open race results');race.href='../election-night/?state='+state+'&race='+id+'#nationalBoard';more.append(race);
  item.append(more);rows.append(item);
 }
 const links=sources[state]||[];
 if(links.length){
  const context=mk('p',state==='PA'?'Pennsylvania results feed: the CivicAPI snapshot has not supplied valid candidate totals for its 17 House contests and governor race. AP newsroom calls are displayed independently; official state totals are available below.':'Nevada results feed: the CivicAPI snapshot has not supplied valid candidate totals for all four House contests and governor race. Nevada delays the first statewide release until all waiting voters have finished; official results and AP calls are separate sources.','ed-mini');
  official.append(context);
  for(const [label,url] of links){official.append(hyperlink(label,url),document.createTextNode(' · '))}
 }
}
window.addEventListener('ervin:nbc-calls-update',paint);
document.getElementById('stateSelect')?.addEventListener('change',paint);
window.addEventListener('popstate',()=>setTimeout(paint,50));
// The state's asynchronous initial data load sets the selector programmatically;
// watch only for a changed selection to avoid repeatedly repainting the calls.
setInterval(()=>{if(!document.hidden&&code()!==lastPaintedState)paint()},1200);
paint();
})();
