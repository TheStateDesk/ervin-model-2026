/* Sourced NBC News Decision Desk projections. This file never calls a race.
   A documented NBC source is required for every published record. */
(()=>{'use strict';
const script=document.currentScript;
const endpoint=new URL('../election-night/nbc-calls.json',script?.src||location.href).href;
const calls=new Map();
const allowed=/^www\.nbc[a-z0-9-]+\.com$/i;
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
function validate(key,row){
 if(!/^[A-Z]{2}-(?:[0-9]{2}|SENATE|GOVERNOR)$/.test(key)||!row||!['D','R','I','O'].includes(row.party))return null;
 if(typeof row.winner!=='string'||row.winner.length<3||row.winner.length>110)return null;
 try{const url=new URL(row.sourceUrl);
  if(url.protocol!=='https:'||!allowed.test(url.hostname)||url.username||url.password)return null;
  return Object.freeze({id:key,winner:row.winner.trim(),party:row.party,sourceUrl:url.href,publisher:'NBC News Decision Desk'});
 }catch{return null}
}
let busy=false;
async function refresh(){
 if(busy)return;busy=true;
 try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
  let response;try{response=await fetch(endpoint+'?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('NBC calls HTTP '+response.status);
  const payload=await response.json();
  if(payload.version!==1||payload.election!=='2026-11-03'||payload.publisher!=='NBC News Decision Desk'||!payload.calls||typeof payload.calls!=='object'||Object.keys(payload.calls).length>506)throw Error('Invalid NBC calls dataset');
  const fresh=new Map();for(const [id,row] of Object.entries(payload.calls)){const safe=validate(id,row);if(!safe)throw Error('Unverified NBC call '+id);fresh.set(id,safe)}
  calls.clear();for(const [k,v] of fresh)calls.set(k,v);
  window.dispatchEvent(new CustomEvent('ervin:nbc-calls-update',{detail:{count:calls.size}}));
 }catch(e){console.warn('NBC call refresh unavailable; preserving last sourced calls',e.message)}
 finally{busy=false}
}
const api=Object.freeze({get:id=>calls.get(String(id||'').toUpperCase())||null,all:()=>Object.fromEntries(calls),count:()=>calls.size,refresh,normalize});
window.ERVIN_NBC_CALLS=api;
refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();