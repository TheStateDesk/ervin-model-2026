/* Shared 2026 county results validator for national, state, and night desks.
 * Never converts a statewide CivicAPI race count into county counts.
 * Only accepts a linked election-authority result for the SAME FIPS + office,
 * from after the state's polls closed. No source totals are summed together. */
(function(root){'use strict';
const DATE='2026-11-03',OFFICES=new Set(['Senate','Governor']);
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const number=x=>Number.isSafeInteger(x)&&x>=0&&x<=16000000;
const url=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u:null}catch{return null}};
const validDate=(x,min,now)=>Number.isFinite(Date.parse(x||''))&&Date.parse(x)>=min&&Date.parse(x)<=now+300000;
const close=(state,office)=>{
 const ref=root.ERVIN_RETURNS?.closeAt?.(state+'-'+(office==='Senate'?'SENATE':'GOVERNOR'),office);
 // Conservative fallback if the office-specific closing-hour table was unavailable.
 return Number.isFinite(ref)?ref:Date.parse('2026-11-04T07:00:00Z');
};
const related=(candidate,authority)=>{
 const a=url(authority),c=url(candidate);return !!(a&&c&&(a.hostname===c.hostname||c.hostname.endsWith('.'+a.hostname)));
};
function sourceAllowed(state,county,sourceUrl,registry){
 const record=registry?.states?.[state];
 if(!record||!url(sourceUrl))return false;
 const links=record.countyLinks||{};
 const listed=Object.entries(links).find(([name])=>normalize(name)===normalize(county));
 if(listed)return related(sourceUrl,listed[1])||
   (record.alternateResults?.[listed[0]]||[]).some(allowed=>related(sourceUrl,allowed));
 // Some state authorities operate official centralized county-level result portals.
 if(!['county-dashboard','county-extract','state-and-county-results','county-results'].includes(record.authorityRole))return false;
 return related(sourceUrl,record.authority);
}
function parse(blob,state,office,features,registry,previous={},now=Date.now()){
 const out=new Map(),rejected=[],geos=new Map();
 for(const f of features||[]){const id=String(f.id||'').padStart(5,'0'),name=String(f.properties?.name||'');
   if(/^\d{5}$/.test(id))geos.set(id,name);}
 if(!/^[A-Z]{2}$/.test(state)||!OFFICES.has(office)||blob?.version!==1||blob?.election!==DATE
    ||!blob.states||typeof blob.states!=='object')
  return {rows:out,rejected:[{reason:'invalid_countrywide_contract'}],checked:0,available:false};
 const rs=blob.states?.[state]?.races?.[office];
 if(!rs)return {rows:out,rejected:[],checked:0,available:false};
 if(!Array.isArray(rs.counties)||rs.counties.length>geos.size)
  return {rows:out,rejected:[{reason:'invalid_county_collection'}],checked:0,available:false};
 const cutoff=close(state,office);
 for(const row of rs.counties){
  const fips=String(row?.fips??'').padStart(5,'0'),name=geos.get(fips),key=state+'-'+fips;
  let reason=null;
  if(!name)reason='unknown_county_fips';
  else if(row.county&&normalize(row.county)!==normalize(name))reason='county_name_mismatch';
  else if(out.has(fips))reason='duplicate_county';
  else if(![row.dem,row.rep,row.other].every(number)||row.dem+row.rep+row.other===0)reason='invalid_votecount';
  else if(!validDate(row.asOf,cutoff,now))reason='invalid_or_early_timestamp';
  else if(!sourceAllowed(state,name,row.sourceUrl,registry))reason='source_not_authority_listed';
  else {
   const old=previous.get?.(fips)||previous[fips];
   const priorTotal=old?old.dem+old.rep+old.other:0;
   if(old&&Date.parse(row.asOf)<Date.parse(old.asOf))reason='older_than_saved_count';
   else if(old&&row.dem+row.rep+row.other<priorTotal&&row.officialCorrection!==true)reason='decreasing_total_without_official_correction';
  }
  if(reason){rejected.push({county:fips,reason});continue}
  out.set(fips,{id:fips,fips,name,county:name,dem:row.dem,rep:row.rep,other:row.other,
    asOf:row.asOf,url:row.sourceUrl,source:'Independently listed election authority',office,state,
    status:'unofficial',officialCorrection:row.officialCorrection===true});
 }
 return {rows:out,rejected,checked:rs.counties.length,available:true};
}
const api=Object.freeze({parse,sourceAllowed,close,normalize});
if(typeof module==='object'&&module.exports)module.exports=api;
root.ERVIN_COUNTY_CORE=api;
})(typeof window!=='undefined'?window:globalThis);
