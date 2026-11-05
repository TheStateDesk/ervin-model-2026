/* Dated AP uncalled list + locally recorded attributed calls; never infer live AP status. */
(()=>{'use strict';
const root=new URL('../',document.currentScript?.src||location.href);
const names=['AK-SENATE','MS-SENATE','AK-GOVERNOR','KS-GOVERNOR'];
const target=document.getElementById('ledgerNote');
async function load(){
try{
 const url=new URL('election-night/ap-calls.json',root);
 const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('Call ledger HTTP '+res.status);
 const payload=await res.json();
 if(payload.election!=='2026-11-03'||!payload.calls||typeof payload.calls!=='object')throw Error('Unexpected call-ledger format');
 let count=0;
 for(const id of names){
  const node=document.querySelector('[data-race="'+id+'"]');if(!node)continue;
  const status=node.querySelector('.audit-status'),c=payload.calls[id];
  if(c&&typeof c.winner==='string'&&['D','R','I'].includes(c.party)&&typeof c.sourceUrl==='string'){
   let source=null;try{const u=new URL(c.sourceUrl);if(u.protocol==='https:'&&/(^|\.)(?:apnews|foxnews)\.com$/.test(u.hostname))source=u.href}catch{}
   if(source){
    count++;status.dataset.status='recorded';status.textContent='Call recorded in local ledger: '+c.winner;
    const a=document.createElement('a');a.href=source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Source for this recorded call';
    node.appendChild(a);continue;
   }
  }
  status.dataset.status='not-recorded';status.textContent='No attributed call recorded in our local ledger';
 }
 document.getElementById('calledInWatch').textContent=String(count);
 document.getElementById('ledgerTotal').textContent=Object.keys(payload.calls).length.toLocaleString('en-US');
 if(target)target.textContent='Read the State Desk’s local election-night call records. The ledger is not licensed AP API access or a claim of full coverage. This check does not confirm whether an omitted race is still uncalled by AP.';
}catch(e){
 for(const node of document.querySelectorAll('.audit-status')){node.dataset.status='not-recorded';node.textContent='Source ledger unavailable; current call status not verified'}
 if(target)target.textContent='The local call ledger is unavailable; no current result claim is made. Check the linked AP election pages. ('+e.message+')';
}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
