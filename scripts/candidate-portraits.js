/* Source-labeled, name-verified candidate portraits. Never reuse a portrait
 * from another candidate when Wikimedia does not confirm the identity. */
(function(root){'use strict';
const API='https://en.wikipedia.org/w/api.php',CACHE=new Map(),DATA_URL=new URL('../candidate-portraits.json',document.currentScript?.src||location.href);
let dataset=null,pending=null;
const canonical=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const nameOK=(given,title)=>{
 const a=canonical(given),b=canonical(title);
 const first=canonical(given.split(' ')[0]),last=canonical(given.split(' ').at(-1));
 return a&&b&&(a===b||(b.startsWith(first)&&b.endsWith(last)&&last.length>3));
};
const safe=u=>{try{let v=new URL(u);return v.protocol==='https:'&&/^(upload\.wikimedia\.org|commons\.wikimedia\.org)$/.test(v.hostname)?v.href:null}catch{return null}};
const source=u=>{try{const x=new URL(u);return x.protocol==='https:'&&x.hostname==='en.wikipedia.org'?x.href:null}catch{return null}};
function load(){
 if(pending)return pending;
 pending=fetch(DATA_URL,{cache:'no-cache'}).then(x=>x.ok?x.json():null).then(x=>dataset=x?.portraits||{}).catch(()=>dataset={});
 return pending;
}
async function lookup(name){
 if(!name||name.length>90)return null;
 await load();
 const cached=dataset?.[name];if(cached?.url&&safe(cached.url)&&source(cached.page))return cached;
 const query=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'230',titles:name});
 try{
  const r=await fetch(API+'?'+query);if(!r.ok)return null;const data=await r.json();
  const page=data.query?.pages?.find(x=>!x.missing&&nameOK(name,x.title)&&safe(x.thumbnail?.source));
  if(!page)return null;
  return {url:safe(page.thumbnail.source),page:'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_')),source:'Wikipedia / Wikimedia'};
 }catch(e){return null}
}
function resolve(name){
 const k=canonical(name);
 if(!CACHE.has(k))CACHE.set(k,lookup(name));
 return CACHE.get(k);
}
function attach(container,name,options={}){
 if(!container||!name)return;
 container.setAttribute('data-candidate-name',name);
 const label=options.alt||name+' portrait',fallBack=options.fallback||name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('');
 if(!container.textContent.trim()&&!container.querySelector('img'))container.textContent=fallBack;
 resolve(name).then(info=>{
  if(!info||!container.isConnected||container.dataset.candidateName!==name)return;
  const img=document.createElement('img');img.src=info.url;img.alt=label;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.onerror=()=>{img.remove();container.textContent=fallBack;};
  container.replaceChildren(img);
  container.title='Portrait source: '+info.source+'. Click the candidate name for attribution.';
  const anchor=container.closest('a');
  if(anchor&&info.page){anchor.href=info.page;anchor.target='_blank';anchor.rel='noopener noreferrer'}
 }).catch(()=>{});
}
root.ERVIN_PORTRAITS={attach,resolve,load};
})(typeof window!=='undefined'?window:globalThis);