/* Election-night 2026 provider normalization; Node and browser, no model estimates.
 * Exactly one source per race; no arithmetic addition across providers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ERVIN_RETURNS=api})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const DATE='2026-11-03';
 const states='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
 const codes=new Set(states),OFFICES=new Set(['House','Senate','Governor']);
 // Conservative all-polls-close ET including split-zone states. Source: 2026 state closing-hour schedules.
 const closeByState={
 AL:'20:00',AK:'01:00',AZ:'21:00',AR:'20:30',CA:'23:00',CO:'21:00',CT:'20:00',
 DE:'20:00',FL:'20:00',GA:'19:00',HI:'00:00',ID:'23:00',IL:'20:00',IN:'19:00',
 IA:'21:00',KS:'21:00',KY:'19:00',LA:'21:00',ME:'20:00',MD:'20:00',MA:'20:00',
 MI:'21:00',MN:'21:00',MS:'20:00',MO:'20:00',MT:'22:00',NE:'21:00',NV:'22:00',
 NH:'20:00',NJ:'20:00',NM:'21:00',NY:'21:00',NC:'19:30',ND:'22:00',OH:'19:30',
 OK:'20:00',OR:'23:00',PA:'20:00',RI:'20:00',SC:'19:00',SD:'21:00',TN:'20:00',
 TX:'21:00',UT:'22:00',VT:'19:00',VA:'19:00',WA:'23:00',WV:'19:30',WI:'21:00',WY:'21:00'
 };
 // House district may finish earlier than split-zone statewide deadline.
 const districtClose={'KY-06':'18:00','VA-02':'19:00','VA-05':'19:00','FL-27':'20:00','AL-07':'20:00','MI-07':'20:00','TX-18':'21:00'};
 const numeric=n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=30000000;
 const canonical=(key,office)=>{
  const s=String(key||'').toUpperCase().trim().replace(/_/g,'-');
  const m=s.match(/^([A-Z]{2})-(AL|\d{1,2}|SENATE|GOVERNOR)$/);
  if(!m||!codes.has(m[1]))return null;
  const id=m[2]==='AL'?'01':/^\d+$/.test(m[2])?String(Number(m[2])).padStart(2,'0'):m[2];
  if(office==='House'&& !/^\d{2}$/.test(id))return null;
  if(office==='Senate'&&id!=='SENATE')return null;
  if(office==='Governor'&&id!=='GOVERNOR')return null;
  return m[1]+'-'+id;
 };
 const closeAt=(key,office)=>{
  const id=canonical(key,office);if(!id)return NaN;
  const code=id.slice(0,2),time=districtClose[id]||closeByState[code];
  if(!time)return NaN;
  const d=(time==='01:00'||time==='00:00')?'2026-11-04':'2026-11-03';
  return Date.parse(d+'T'+time+':00-05:00');
 };
 const safeURL=(u)=>{try{const r=new URL(String(u));return r.protocol==='https:'&&!!r.hostname&& !r.username&&!r.password?r.href:null}catch{return null}};
 const verifiedCandidates=(raw)=>{
  if(!Array.isArray(raw)||raw.length<2||raw.length>25)return null;
  const seen=new Set(),a=[];
  for(const c of raw){
   const name=String(c?.name??c?.n??'').trim(),votes=c?.votes??c?.v;
   if(!name||name.length>155||!numeric(votes)||seen.has(name.toLowerCase()))return null;
   seen.add(name.toLowerCase());const p=String(c?.party??c?.p??'').trim().toUpperCase();
   const party=['D','DEM','DEMOCRATIC'].includes(p)?'D':['R','REP','REPUBLICAN'].includes(p)?'R':'O';
   a.push({name,votes,party,photo:safeURL(c?.photo||'')});
  }
  return a;
 };
 const build=(id,office,total,arr,timestamp,source,ref,precincts)=>{
  const candidates=verifiedCandidates(arr),time=Date.parse(String(timestamp||''));
  if(!candidates||!numeric(total)||total===0||!Number.isFinite(time)||time<closeAt(id,office)||time>Date.now()+300000)return null;
  const sum=candidates.reduce((n,x)=>n+x.votes,0);
  // Disallow feeds whose total includes unrepresented vote tallies beyond a small rounding tolerance.
  if(Math.abs(sum-total)>Math.max(10,total*.005))return null;
  return {id,office,total,candidates,asOf:new Date(time).toISOString(),source,sourceURL:safeURL(ref),precincts:Number.isFinite(precincts)&&precincts>=0&&precincts<=100?precincts:null};
 };
 function civic(data){
  if(data?.version!==1||data.election!==DATE||!data.races||typeof data.races!=='object')return {};
  const results={};for(const [key,r] of Object.entries(data.races)){
   const office=r?.office==='house'?'House':r?.office==='senate'?'Senate':r?.office==='governor'?'Governor':null;
   if(!office||r.verified!==true||r.source!=='civicAPI'||r.election!==DATE)continue;
   const id=canonical(key,office);if(!id)continue;
   const normalized=build(id,office,r.total,r.candidates,r.asOf,'CivicAPI (provider-verified schema)',r.sourceUrl,r.precinctsReporting);
   if(normalized)results[id]=normalized;
  }return results;
 }
 function openAmerica(data,office){
  if(data?.api!==1||data.year!==2026||data.office!==office||typeof data.races!=='object')return {};
  const result={};for(const [key,r] of Object.entries(data.races)){
   const id=canonical(office==='House'?key:key+'-'+office.toUpperCase(),office);
   if(!id)continue;
   const row=build(id,office,r?.total,r?.cands,data.as_of,'Open America / state reporting mirror',data.source_url||null,r?.pct_in);
   if(row)result[id]=row;
  }return result;
 }
 const candidatesEqual=(a,b)=>{
  const map=x=>new Map(x.map(c=>[c.name.toLowerCase(),c.votes]));
  const am=map(a),bm=map(b);
  return am.size===bm.size&&[...am].every(([n,v])=>bm.get(n)===v);
 };
 function reconcile(sources,previous={}){
  const out={...previous},warnings=[];
  // A race may appear in multiple mirrors; never add totals or votes together.
  for(const source of sources){
   for(const [id,row] of Object.entries(source||{})){
    if(!row||id!==row.id)continue;
    const prior=out[id];if(!prior){out[id]=row;continue}
    const a=Date.parse(row.asOf),b=Date.parse(prior.asOf);
    if(a<b){warnings.push('older_snapshot:'+id);continue}
    if(row.total<prior.total){warnings.push('total_rollback_requires_review:'+id);continue}
    if(a===b&&row.total===prior.total){
     if(!candidatesEqual(row.candidates,prior.candidates))warnings.push('source_disagreement:'+id);
     continue;
    }
    if(a>b||row.total>prior.total)out[id]=row;
   }
  }
  return {races:out,warnings};
 }
 return Object.freeze({DATE,closeAt,canonical,civic,openAmerica,reconcile,verifiedCandidates,closeByState});
});
