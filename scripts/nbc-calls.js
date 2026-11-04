/* Attributed newsroom winner calls, never inferred from votes or model forecasts.
 * The historical ERVIN_NBC_CALLS API name is preserved for existing pages;
 * individual records carry the exact newsroom publisher (AP or NBC).
 */
(()=>{'use strict';
const script=document.currentScript;
const base=new URL('../election-night/',script?.src||location.href);
const configurations=[
 {id:'nbc',file:'nbc-calls.json',publisher:'NBC News Decision Desk'},
 {id:'ap',file:'ap-calls.json',publisher:'Associated Press'}
];
const tables=new Map(),calls=new Map(),normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const allowedHosts={
 nbc:/^www\.nbc[a-z0-9-]+\.com$/i,
 ap:/^(?:apnews\.com|www\.apnews\.com|whyy\.org|www\.publicsource\.org|mapthegeneral\.com)$/i
};
function validate(id,row,desk){
 if(!/^[A-Z]{2}-(?:[0-9]{2}|SENATE|GOVERNOR)$/.test(id)||!row||!['D','R','I','O'].includes(row.party))return null;
 if(typeof row.winner!=='string'||row.winner.trim().length<3||row.winner.length>110)return null;
 try{
  const url=new URL(row.sourceUrl);
  if(url.protocol!=='https:'||!allowedHosts[desk.id].test(url.hostname)||url.username||url.password||url.pathname==='/')return null;
  return Object.freeze({id,winner:row.winner.trim(),party:row.party,sourceUrl:url.href,publisher:desk.publisher});
 }catch{return null}
}
let busy=false;
async function fetchDesk(desk){
 const url=new URL(desk.file,base);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
 try{
  const resp=await fetch(url.href+'?t='+Math.floor(Date.now()/60000),{cache:'no-store',signal:controller.signal});
  if(!resp.ok)throw Error(desk.id+' HTTP '+resp.status);
  const payload=await resp.json();
  if(payload.version!==1||payload.election!=='2026-11-03'||payload.publisher!==desk.publisher||!payload.calls||typeof payload.calls!=='object'||Object.keys(payload.calls).length>506)throw Error(desk.id+' metadata invalid');
  const next=new Map();
  for(const [id,row] of Object.entries(payload.calls)){
   const safe=validate(id,row,desk);
   if(!safe)throw Error('Unverified '+desk.id+' source for '+id);
   next.set(id,safe);
  }
  tables.set(desk.id,next);
 }finally{clearTimeout(timer)}
}
function rebuild(){
 const combined=new Map(tables.get('nbc')||[]);
 // AP is preferred only when its winner agrees with any independent NBC call.
 for(const [id,row] of tables.get('ap')||[]){
  const existing=combined.get(id);
  if(existing&&(normalize(existing.winner)!==normalize(row.winner)||existing.party!==row.party)){
   combined.delete(id);
   console.warn('Conflicting published newsroom winner calls withheld for '+id);
   continue;
  }
  combined.set(id,row);
 }
 calls.clear();for(const [k,v] of combined)calls.set(k,v);
 const byDesk={};for(const row of calls.values())byDesk[row.publisher]=(byDesk[row.publisher]||0)+1;
 window.dispatchEvent(new CustomEvent('ervin:nbc-calls-update',{detail:{count:calls.size,byDesk}}));
}
async function refresh(){
 if(busy)return;busy=true;
 try{
  const res=await Promise.allSettled(configurations.map(fetchDesk));
  for(let i=0;i<res.length;i++)if(res[i].status==='rejected')console.warn('Keeping last '+configurations[i].publisher+' calls:',res[i].reason?.message);
  rebuild();
 }finally{busy=false}
}
const gated=id=>{
 const key=String(id||'').toUpperCase(),record=calls.get(key);
 if(!record)return null;
 const office=key.endsWith('-SENATE')?'Senate':key.endsWith('-GOVERNOR')?'Governor':'House';
 const closedAt=window.ERVIN_RETURNS?.closeAt(key,office);
 const minimum=Number.isFinite(closedAt)?closedAt:Date.parse('2026-11-03T18:00:00-05:00');
 return Date.now()>=minimum?record:null;
};
const visible=()=>Object.fromEntries([...calls].filter(([key])=>gated(key)));
window.ERVIN_NBC_CALLS=Object.freeze({get:gated,all:visible,count:()=>Object.keys(visible()).length,refresh,normalize});
refresh();setInterval(()=>{if(!document.hidden)refresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
