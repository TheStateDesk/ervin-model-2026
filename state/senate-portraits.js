/* Candidate photos limited to 2026 Senate races unless CivicAPI supplies
 * a verified provider image. Wikipedia portraits link to their source page. */
(()=>{'use strict';
const CODE=/^[A-Z]{2}$/, esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sourceRoot='../counties-watch/forecast-baselines.json';
let data=null,last='',busy=false;
function image(name,node){
 const url='https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=pageimages&pithumbsize=120&titles='+encodeURIComponent(name);
 fetch(url).then(x=>{if(!x.ok)throw Error('portrait search');return x.json()}).then(json=>{
  const page=json?.query?.pages?.[0],src=page?.thumbnail?.source;
  if(page?.title?.toLowerCase()!==name.toLowerCase()||!/^https:\/\/upload\.wikimedia\.org\//.test(src||''))return;
  if(!node.isConnected)return;
  node.innerHTML='<img loading="lazy" src="'+esc(src)+'" alt="'+esc(name)+' portrait"><small>Wikipedia</small>';
  node.setAttribute('href','https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_')));
 }).catch(()=>{});
}
async function load(){
 if(busy)return;const target=document.querySelector('#stateRaceCards');
 if(!target)return;
 const code=(new URLSearchParams(location.search).get('state')||'MI').toUpperCase();
 if(!CODE.test(code))return;
 if(!data){
  busy=true;
  try{const r=await fetch(sourceRoot,{cache:'no-cache'});if(!r.ok)return;data=await r.json()}
  catch(e){return}finally{busy=false}
 }
 const s=data?.states?.[code],card=target.querySelector('.ed-race');
 if(!s||!card||!s.nonR||!s.rep)return;
 if(!card.textContent.includes('U.S. Senate'))return;
 const signature=code+'|'+s.nonR+'|'+s.rep+'|'+target.children.length;
 if(last===signature&&card.querySelector('.senate-candidate-pair'))return;
 last=signature;
 card.querySelector('.senate-candidate-pair')?.remove();
 const panel=document.createElement('div');panel.className='senate-candidate-pair';panel.setAttribute('aria-label','U.S. Senate candidate portraits');
 for(const [name,side] of [[s.nonR,'D / non-Republican'],[s.rep,'Republican']]){
  const a=document.createElement('a');a.className='senate-candidate-portrait';a.target='_blank';a.rel='noopener noreferrer';a.href='https://en.wikipedia.org/wiki/'+encodeURIComponent(name.replaceAll(' ','_'));
  const head=document.createElement('span');head.className='senate-candidate-avatar';head.textContent=name.split(' ').map(w=>w[0]).slice(0,2).join('');
  const caption=document.createElement('span');caption.className='senate-portrait-label';caption.textContent=name+' · '+side;
  a.append(head,caption);panel.append(a);image(name,head);
 }
 const p=card.querySelector('.ed-race-h p')||card.querySelector('p');p?.insertAdjacentElement('afterend',panel);
}
function init(){
 const t=document.querySelector('#stateRaceCards');
 if(!t)return;
 let scheduled=false;const ob=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;load()})});
 ob.observe(t,{childList:true});
 window.addEventListener('popstate',load);load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();