/* Fail-safe per-source network backoff. Local CivicAPI/official result snapshots
 * remain independently available even if an external mirror fails.
 */
(function(root){'use strict';
const health=new Map();
const delays=[30000,60000,120000,300000,600000,900000];
const key=url=>{try{const u=new URL(url,root.location?.href||'https://example.org');return u.origin+u.pathname+'?'+u.searchParams.toString()}catch(_){return String(url)}};
async function json(url,options={}){
 const k=key(url),now=Date.now(),record=health.get(k);
 if(record&&now<record.retryAfter)throw Error('External reporting mirror in backoff until '+new Date(record.retryAfter).toISOString());
 const timeout=Math.max(1000,Math.min(20000,options.timeout||11000));
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{
  const response=await fetch(url,{cache:'no-store',signal:ctrl.signal});
  if(!response.ok)throw Error('Reporting provider HTTP '+response.status);
  const data=await response.json();
  if(!data||typeof data!=='object')throw Error('Reporting provider response not JSON data');
  health.set(k,{failures:0,retryAfter:0,verifiedAt:Date.now()});
  return data;
 }catch(err){
  const failures=Math.min(10,(record?.failures||0)+1);
  const hold=delays[Math.min(failures-1,delays.length-1)];
  health.set(k,{failures,retryAfter:Date.now()+hold,verifiedAt:record?.verifiedAt||null});
  throw err;
 }finally{clearTimeout(timer)}
}
const status=url=>Object.freeze({...health.get(key(url))||{failures:0,retryAfter:0,verifiedAt:null}});
root.ERVIN_EXTERNAL_FEED=Object.freeze({json,status});
})(typeof window!=='undefined'?window:globalThis);
