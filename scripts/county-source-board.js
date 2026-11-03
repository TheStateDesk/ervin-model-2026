/* 50-state source readiness: a public audit, not a race call or data feed.
 * This intentionally distinguishes 104 independently linked county webpages
 * from actual machine-readable November 3 vote records (initially zero). */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names='AL Alaska?'; // display postal codes; names can be opened in state dossiers.
let data=null,registry=null;
function report(){
 const node=$('countySourceBoardRows');if(!node||!data)return;
 const search=$('countySourceBoardFind')?.value.trim().toUpperCase()||'';
 const list=Object.entries(data.states||{}).filter(([code,item])=>!search||code.includes(search)||String(item.authorityRole).toUpperCase().includes(search)).sort(([a],[b])=>a.localeCompare(b));
 node.innerHTML=list.map(([code,row])=>{
  const links=row.linkedCountySources||0,reach=Object.values(row.countySources||{}).filter(s=>s.connectivity==='reachable').length;
  const gap=row.boundaryCount-links;
  return '<tr><td><strong><a href="../state/?state='+code+'#stateGeography">'+code+'</a></strong></td>'+
   '<td>'+row.boundaryCount.toLocaleString()+'</td>'+
   '<td>'+links.toLocaleString()+' / '+row.boundaryCount+(gap?' · '+gap+' not directly indexed':'')+'</td>'+
   '<td>'+reach+' responding'+(links-reach?' · '+(links-reach)+' blocked/unavailable':'')+'</td>'+
   '<td><strong>Not yet verified</strong><small>No official county vote feed established by this HTTP audit.</small></td>'+
   '<td><a target="_blank" rel="noopener noreferrer" href="'+safe(row.stateAuthority)+'">Original authority</a></td></tr>';
 }).join('')||'<tr><td colspan="6">No matching state</td></tr>';
}
async function load(){
 try{
  const r=await fetch('../election-night/county-source-health.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  data=await r.json();
  const q=data.summary,t=data.checkedAt?new Date(data.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Awaiting first probe';
  $('countySourceBoardStatus').textContent=q.states+' states · '+q.countyEquivalents.toLocaleString()+' county geographies · '+q.countySourcesIndependentlyLinked+' independently linked source pages · '+q.countySourcePagesResponding+' responding webpages · '+q.countiesWithoutDirectVerifiedSource.toLocaleString()+' not yet directly indexed · no election-night county vote feeds verified by the connectivity audit. Last independent probe: '+t+'.';
  report();
 }catch(e){$('countySourceBoardStatus').textContent='Source audit temporarily unavailable: '+e.message+'; never treat absent county evidence as zero votes.'}
}
function init(){if(!$('countySourceBoard'))return;$('countySourceBoardFind')?.addEventListener('input',report);load();setInterval(()=>{if(!document.hidden)load()},300000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();