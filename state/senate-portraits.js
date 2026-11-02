/* 2026 Governor + Senate photo pairs. Portraits never generated from names;
 * only a matched attributed Wikimedia source becomes a photograph. */
(()=>{'use strict';
const code=()=>((new URLSearchParams(location.search).get('state')||'MI').toUpperCase());
const endpoints=['../counties-watch/forecast-baselines.json','../governors/data.json'];
let senate=null,governors=null,loading=null;
function fetchRaces(){
 if(loading)return loading;
 loading=Promise.all(endpoints.map(p=>fetch(p,{cache:'force-cache'}).then(x=>x.ok?x.json():null).catch(()=>null)))
  .then(([s,g])=>{senate=s?.states||{};governors=Object.fromEntries((g?.races||[]).map(x=>[x.code,x]))});
 return loading;
}
function portraitPair(data){
 if(!data)return null;
 const parent=document.createElement('div');parent.className='senate-candidate-pair';parent.setAttribute('aria-label','2026 candidate photographs from credited sources');
 for(const [name,kind]of [[data.dem||data.nonR,'Democratic / non-Republican'],[data.rep,'Republican']]){
  if(!name)continue;
  const anchor=document.createElement('a');anchor.className='senate-candidate-portrait';anchor.href='https://en.wikipedia.org/wiki/'+encodeURIComponent(name.replaceAll(' ','_'));anchor.target='_blank';anchor.rel='noopener noreferrer';
  const face=document.createElement('span');face.className='senate-candidate-avatar';face.textContent=name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('');
  const caption=document.createElement('span');caption.className='senate-portrait-label';caption.textContent=name+' · '+kind;
  anchor.append(face,caption);parent.append(anchor);
  window.ERVIN_PORTRAITS?.attach(face,name);
 }
 return parent;
}
async function display(){
 const target=document.querySelector('#stateRaceCards');if(!target)return;
 await fetchRaces();const c=code(),cards=[...target.querySelectorAll('.ed-race')];
 const races=[senate?.[c]?{...senate[c],office:'Senate'}:null,governors?.[c]?{...governors[c],office:'Governor'}:null].filter(Boolean);
 for(const record of races){
  const card=cards.find(x=>x.querySelector('h3')?.textContent.trim()===(record.office==='Senate'?'U.S. Senate':'Governor'));
  if(!card||card.querySelector('.senate-candidate-pair'))continue;
  const row=portraitPair(record),heading=card.querySelector('.ed-race-h p')||card.querySelector('h3');
  if(row&&heading)heading.insertAdjacentElement('afterend',row);
 }
}
function init(){
 const target=document.querySelector('#stateRaceCards');if(!target)return;
 const observer=new MutationObserver(()=>display());
 observer.observe(target,{childList:true});
 window.addEventListener('popstate',display);
 display();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();