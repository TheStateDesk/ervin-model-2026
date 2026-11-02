/* Secondary civicAPI source ledger: shown independently from Open America; never summed. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validKey=x=>/^[A-Z]{2}-(?:\d{2}|SENATE|GOVERNOR)$/.test(x);
const fmt=n=>Number(n).toLocaleString('en-US');
const url=x=>/^https:\/\/[a-z0-9.-]+\//i.test(String(x||''))?esc(x):'https://civicapi.org';
let cache=null,at=0,seq=0;
const state=()=>new URLSearchParams(location.search).get('state')?.toUpperCase()||'MI';
async function load(){
 const host=$('civicAudit');if(!host)return;const curr=++seq;
 if(cache&&Date.now()-at<60000){show(cache);return}
 try{
  const r=await Promise.all(['../civicapi/discovery.json','../civicapi/races.json'].map(x=>fetch(x,{cache:'no-store'})));
  if(!r[0].ok||!r[1].ok)throw Error('Pending first source check');
  const data=await Promise.all(r.map(x=>x.json()));if(curr!==seq)return;
  cache=data;at=Date.now();show(cache);
 }catch(e){if(curr!==seq)return;host.textContent='CivicAPI pilot source checks are not yet published. The existing official-source result feed is unaffected.'}
}
function show(data){
 const host=$('civicAudit');if(!host)return;
 const code=state(),[audit,feed]=data;
 const targets=Object.entries(audit.status||{}).filter(([key])=>key.startsWith(code+'-')&&validKey(key));
 const live=Object.entries(feed.races||{}).filter(([key,r])=>key.startsWith(code+'-')&&validKey(key)&&r?.verified===true&&Array.isArray(r.candidates));
 const checks=targets.map(([key,v])=>'<li><b>'+esc(key)+'</b> · '+esc(String(v.state||'unknown').replaceAll('_',' '))+'</li>').join('');
 const records=live.map(([key,r])=>'<article class="dx-civic-row"><strong>'+esc(key)+' · '+fmt(r.total)+' counted ballots</strong><small>'+r.candidates.map(c=>esc(c.name)+': '+fmt(c.votes)).join(' · ')+'</small><small>civicAPI snapshot '+esc(r.asOf)+' · <a target="_blank" rel="noopener noreferrer" href="'+url(r.sourceUrl)+'">Original API record</a></small></article>').join('');
 host.innerHTML='<p class="ed-mini">Independent provider check: '+esc(audit.checkedAt||'Time unavailable')+'. Only six pilot contests are currently queried; missing data do not mean zero votes. CivicAPI and Open America may mirror the same official totals and must not be added together.</p>'+
  (live.length?records:'<p class="ed-mini">No independently validated CivicAPI result has passed identity, timestamp and vote-total checks for this state yet.</p>')+
  (targets.length?'<ul class="dx-civic-list">'+checks+'</ul>':'<p class="ed-mini">No race in this state is included in the initial six-race pilot.</p>')+
  '<p class="ed-mini"><strong>Polling:</strong> '+esc(audit.polling?.note||'Polling schema not yet verified.')+'</p>'+
  '<a href="https://civicapi.org/api-documentation" target="_blank" rel="noopener noreferrer">CivicAPI documentation and attribution</a>';
}
function ready(){
 if(!$('civicAudit'))return;
 window.addEventListener('ervin:state-edition',()=>setTimeout(()=>{if(cache)show(cache);else load()},0));
 $('reloadResults')?.addEventListener('click',()=>{at=0;load()});
 load();setInterval(()=>{if(!document.hidden&&document.querySelector('#civicSourceDrawer[open]'))load()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();