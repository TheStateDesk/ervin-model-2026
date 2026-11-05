/* Sourced external-news headline monitor. Links do not represent State Desk reporting. */
(()=>{
'use strict';
const script=document.currentScript;
const root=new URL('../',script?.src||location.href);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:null;}catch{return null;}};
async function show(){
 if(new URLSearchParams(location.search).get('view')==='final')return;
 const anchor=document.querySelector('#postElectionDesk .post-state-package');
 if(!anchor)return;
 try{
  const url=new URL('headlines/latest.json',root);
  url.searchParams.set('v',String(Math.floor(Date.now()/1800000)));
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)return;
  const data=await r.json();
  const checked=Date.parse(data.generated_at||'');
  if(!Number.isFinite(checked)||Date.now()-checked>14*3600000||checked>Date.now()+600000)return;
  const leads=Array.isArray(data.priority)?data.priority.slice(0,5).filter(x=>validURL(x.url)&&typeof x.title==='string'&&typeof x.source==='string'):[];
  if(!leads.length)return;
  const area=document.createElement('section');area.className='wire-watch';area.setAttribute('aria-label','New major political headlines from other publishers');
  const updated=new Date(checked).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});
  area.innerHTML='<div class="wire-watch-heading"><div><span>NEWSWIRE WATCH · INDEPENDENT SOURCES</span><h2>Developing in politics</h2></div><small>Sources checked '+escapeHTML(updated)+' ET</small></div>'+
   '<div class="wire-watch-grid">'+leads.map(x=>'<a href="'+escapeHTML(validURL(x.url))+'" target="_blank" rel="noopener noreferrer"><span>'+escapeHTML(x.source)+'</span><strong>'+escapeHTML(x.title)+'</strong><small>'+(x.source_count>=2?'Also covered by '+escapeHTML(String(x.source_count-1))+' other outlet'+(x.source_count>2?'s':''):'Newsroom headline · developing')+'</small></a>').join('')+'</div>'+
   '<p class="wire-watch-note">Linked headlines from independent publishers, selected automatically as potential major developments—not independently confirmed or written by the State Desk. Original reporting is in <a href="../analysis/">Analysis</a>.</p>';
  anchor.insertAdjacentElement('afterend',area);
 }catch(e){console.info('Headline watch unavailable; keeping published articles',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
