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
 const current=Object.entries(feed.races||{}).filter(([key,r])=>key.startsWith(code+'-')&&validKey(key)&&r?.verified===true&&Array.isArray(r.candidates));
 const total=Number(audit.targetRaces)||488,registered=Number(audit.registeredRaces)||0;
 const records=current.map(([key,r])=>'<article class="dx-civic-row"><strong>'+esc(key)+' · '+fmt(r.total)+' unofficial votes</strong>'+
 '<small>'+r.candidates.map(c=>esc(c.name)+': '+fmt(c.votes)).join(' · ')+'</small>'+
 '<small>As of '+esc(r.asOf)+' · timestamp: '+esc(r.timestampBasis||'provider verified')+' · <a target="_blank" rel="noopener noreferrer" href="'+url(r.sourceUrl)+'">CivicAPI original contest</a></small></article>').join('');
 const lag=Date.parse(audit.checkedAt||'');
 const age=Number.isFinite(lag)?Math.max(0,Math.round((Date.now()-lag)/60000)):null;
 host.innerHTML='<p class="ed-mini"><strong>Primary reporting service: <a href="https://civicapi.org" target="_blank" rel="noopener noreferrer">civicAPI v2</a>.</strong> Matched '+fmt(registered)+' of '+fmt(total)+' races to provider IDs. '+
 (age===null?'No collector timestamp.':'Last collector check: '+age+' minutes ago. ')+
 'The site checks election, office, district, report timestamp, ballot totals and provider test-data flags before displaying votes.</p>'+
 (records||'<p class="ed-mini">No verified civicAPI vote totals for this state yet. Missing returns are not zero votes.</p>')+
 '<p class="ed-mini">National publisher schedule is best effort; actual refresh time can lag behind civicAPI reporting. When a civicAPI record is missing or stale, a separately attributed fallback may be displayed in the national results view. Providers are never added together.</p>'+
 '<p class="ed-mini"><strong>Polling:</strong> '+esc(audit.polling?.note||'CivicAPI polling endpoint not independently verified.')+'</p>'+
 '<a href="https://civicapi.org/api-documentation" target="_blank" rel="noopener noreferrer">API documentation and attribution</a>';
}
function ready(){
 if(!$('civicAudit'))return;
 window.addEventListener('ervin:state-edition',()=>setTimeout(()=>{if(cache)show(cache);else load()},0));
 $('reloadResults')?.addEventListener('click',()=>{at=0;load()});
 load();setInterval(()=>{if(!document.hidden&&document.querySelector('#civicSourceDrawer[open]'))load()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();