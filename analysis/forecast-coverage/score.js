/* Recalculate only comparable called parties from immutable election forecast. */
(()=>{'use strict';
const root=new URL('../../',document.currentScript?.src||location.href);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safe=raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&/(^|\.)(?:apnews|foxnews)\.com$/.test(u.hostname)?u.href:null}catch{return null}};
async function evaluateCalls(){
try{
 const [fRes,cRes]=await Promise.all([fetch(new URL('final/forecast-final.json',root)),fetch(new URL('election-night/ap-calls.json',root),{cache:'no-store'})]);
 if(!fRes.ok||!cRes.ok)throw Error('Forecast or sourced calls unavailable');
 const [archive,ledger]=await Promise.all([fRes.json(),cRes.json()]);
 if(archive.schema!==1||ledger.election!=='2026-11-03'||!ledger.calls)throw Error('Unsupported data version');
 const house=archive.data?.['house/ervin-forecast-2026-11-02.json']?.races||{};
 const senate=archive.data?.['counties-watch/forecast-baselines.json']?.states||{};
 let hTotal=0,hMatch=0,sTotal=0,sMatch=0;const errors=[];
 for(const [id,c] of Object.entries(ledger.calls)){
  if(!c||!['D','R'].includes(c.party)||typeof c.winner!=='string')continue;
  const link=safe(c.sourceUrl);
  if(id.endsWith('-SENATE')){
   const record=senate[id.slice(0,2)];
   if(!record||record.party!=='D'||!Number.isFinite(record.adjustedMargin)||!link)continue;
   sTotal++;const pred=record.adjustedMargin>0?'D':'R';if(pred===c.party)sMatch++;
   else errors.push({office:'Senate',id,pred,actual:c.party,winner:c.winner,source:link,margin:record.adjustedMargin});
  }else if(/^([A-Z]{2})-\d{2}$/.test(id)){
   const record=house[id];if(!record||!Number.isFinite(record.marginD)||!link)continue;
   hTotal++;const pred=record.marginD>0?'D':'R';if(pred===c.party)hMatch++;
   else errors.push({office:'House',id,pred,actual:c.party,winner:c.winner,source:link,margin:record.marginD});
  }
 }
 const show=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v};
 show('houseScore',hMatch+' / '+hTotal);
 show('senateScore',sMatch+' / '+sTotal);
 show('coverageScore',hTotal+' / 435');
 const table=document.getElementById('gradeDifferences');
 table.replaceChildren();
 if(!errors.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='No disagreements in the comparable local records at this check.';tr.append(td);table.append(tr)}
 for(const e of errors.sort((a,b)=>a.office.localeCompare(b.office)||a.id.localeCompare(b.id))){
  const tr=document.createElement('tr');
  const td1=document.createElement('td');td1.textContent=e.office+' · '+e.id;
  const td2=document.createElement('td');td2.textContent=(e.pred==='D'?'D +':'R +')+Math.abs(e.margin).toFixed(2)+' points';
  const td3=document.createElement('td');td3.textContent=e.winner+' ('+e.actual+')';
  const td4=document.createElement('td');const anchor=document.createElement('a');anchor.href=e.source;anchor.rel='noopener noreferrer';anchor.target='_blank';anchor.textContent='Open call';td4.append(anchor);
  tr.append(td1,td2,td3,td4);table.append(tr);
 }
 show('gradePrecision','Recomputed from the locked Nov. 3 archive and '+Object.keys(ledger.calls).length+' source-linked local winner-call entries. '+hTotal+' House and '+sTotal+' Senate entries were comparable. Calls are not complete national results; independent or same-party contests need separate treatment.');
}catch(e){const el=document.getElementById('gradePrecision');if(el)el.textContent='Could not safely grade the latest local files: '+e.message+'. No substitute figures are displayed.';}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',evaluateCalls,{once:true});else evaluateCalls();
})();