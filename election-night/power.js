/* Balance-of-power forecast readout. Independent of live-vote reporting.
 * House: 435 district model estimates, model Tossup seats not allocated.
 * Senate: 47 D-aligned (including two caucusing independents) / 53 R baseline;
 * 17 Original Ervin tracked contests, other seats presumed to retain alignment.
 * Governors: 36 contest forecasts, 14 off-cycle offices (6 D, 8 R) held;
 * a missing state polling average is not projected as a partisan win.
 * Baselines: ballotpedia.org/United_States_Congress_elections,_2026,
 * ballotpedia.org/Election_results,_2026:_Governors
 */
(function(root){'use strict';
const TOSSUP_MARGIN=1.5;
const OFF_CYCLE_GOVERNORS={D:6,R:8};
const SENATE_BASE={D:47,R:53};
const DEM_HELD=new Set(['MI','GA','NH','MN']);
const INDEPENDENT_NONR=new Set(['NE','SD','MT']);
const total=c=>c.D+c.R+c.T+(c.I||0)+(c.U||0);
function label(count,denom){return count+' of '+denom}
function compute(house,senate,governors){
 const rows=Object.values(house?.races||{});
 if(rows.length!==435)throw Error('House balance requires all 435 districts; found '+rows.length);
 const h={D:0,R:0,T:0,U:0,denom:435,threshold:218};
 for(const x of rows){
  // The 173 redrawn districts cannot inherit numerical estimates from the
  // old district number. Use only separately sourced 2026 ratings; if none,
  // leave the House seat explicitly unprojected, never a fabricated toss-up.
  if(x.changed2026Map){
   if(!x.numericModelWithheld||Number.isFinite(x.marginD))throw Error('Unsafe old-map margin for '+x.id);
   if(x.modelRating==='Unrated')h.U++;
   else if(x.modelRating==='Tossup')h.T++;
   else if(/^(Solid|Likely|Lean|Tilt) D$/.test(x.modelRating))h.D++;
   else if(/^(Solid|Likely|Lean|Tilt) R$/.test(x.modelRating))h.R++;
   else throw Error('Unsupported redrawn source rating '+x.id);
   continue;
  }
  if(!Number.isFinite(x.marginD))h.U++;
  else if(x.modelRating==='Tossup'||Math.abs(x.marginD)<0.05)h.T++;
  else if(x.marginD>0)h.D++;
  else h.R++;
 }
 const s={D:SENATE_BASE.D,R:SENATE_BASE.R,T:0,I:0,denom:100,threshold:51};
 const seen=new Set();
 if(!Array.isArray(senate)||senate.length!==17)throw Error('Senate balance needs 17 Original Ervin states');
 for(const r of senate){
  if(seen.has(r.code))throw Error('Duplicate Senate race '+r.code);
  seen.add(r.code);
  const margin=r.model?.adjustedMargin;
  if(!Number.isFinite(margin))throw Error('Senate margin not available for '+r.code);
  if(Math.abs(margin)<TOSSUP_MARGIN){
   if(DEM_HELD.has(r.code))s.D--;else s.R--;
   s.T++;continue;
  }
  if(DEM_HELD.has(r.code)){if(margin<0){s.D--;s.R++;}}
  else if(margin>0){s.R--;if(INDEPENDENT_NONR.has(r.code))s.I++;else s.D++;}
 }
 const g={D:OFF_CYCLE_GOVERNORS.D,R:OFF_CYCLE_GOVERNORS.R,T:0,denom:50,threshold:26,rawOnly:0,modeled:0,offCycle:14};
 if(!Array.isArray(governors)||governors.length!==36)throw Error('Governor balance needs all 36 contests');
 const governorSeen=new Set();
 for(const r of governors){
  if(governorSeen.has(r.code))throw Error('Duplicate governor contest '+r.code);
  governorSeen.add(r.code);
  const modeled=r.model?.adjustedMargin,poll=r.model?.pollMargin;
  const margin=Number.isFinite(modeled)?modeled:Number.isFinite(poll)?poll:null;
  if(!Number.isFinite(margin)||Math.abs(margin)<TOSSUP_MARGIN){g.T++;continue;}
  if(!Number.isFinite(modeled))g.rawOnly++;else g.modeled++;
  if(margin>0)g.D++;else g.R++;
 }
 for(const x of [h,s,g])if(total(x)!==x.denom)throw Error('Balance totals inconsistent '+JSON.stringify(x));
 return {house:h,senate:s,governors:g};
}
function render(rootEl,projection){
 if(!rootEl)throw Error('Balance-of-power container missing');
 const specs=[
  {office:'house',label:'U.S. House',data:projection.house,href:'states/?office=house#nationMap',note:'435 districts · 218 for a majority · '+projection.house.U+' redrawn districts without current-map ratings remain unprojected; source-rated seats use qualitative Cook labels'},
  {office:'senate',label:'U.S. Senate',data:projection.senate,href:'#senate-control',note:projection.senate.D+' D-aligned · '+projection.senate.R+' Republican · '+projection.senate.T+' toss-up seats remain unresolved'+(projection.senate.I?' · '+projection.senate.I+' independent':'')+'. At 50–50 the Republican vice president breaks the tie; Democrats need 51 for control. Unmodeled contests are presumed held.'},
  {office:'governors',label:'Governorships',data:projection.governors,href:'states/?office=governor#nationMap',note:'50 states · 36 races · 14 holdovers · margins within 1.5 points treated as toss-ups; missing polls remain unprojected'}
 ];
 rootEl.innerHTML=specs.map(({office,label:headline,data,href,note})=>{
  const partyD=office==='senate'?'D-aligned':'Democratic';
  const other=data.I||0;
  const hover=partyD+' '+data.D+'; Republican '+data.R+(data.T?'; toss-up '+data.T:'')+(data.U?'; without comparable current-map ratings '+data.U:'')+(other?'; new independent '+other:'')+' — '+headline;
  const pct=n=>Number((n/data.denom*100).toFixed(4));
  return '<article class="power-card" data-power-office="'+office+'">'+
   '<div class="power-card-head"><h3>'+headline+'</h3><a href="'+href+'">'+(office==='senate'?'Control outlook':'Choose a state')+'</a></div>'+
   '<div class="power-numbers"><span class="power-d"><strong data-power-d>'+data.D+'</strong><small>'+partyD+'</small></span>'+
   '<span class="power-r"><strong data-power-r>'+data.R+'</strong><small>Republican</small></span>'+
   (data.T?'<span class="power-t"><strong data-power-t>'+data.T+'</strong><small>Toss-up</small></span>':'')+
   (data.U?'<span class="power-t"><strong data-power-u>'+data.U+'</strong><small>Unprojected</small></span>':'')+
   (other?'<span class="power-t"><strong>'+other+'</strong><small>New independent</small></span>':'')+'</div>'+
   '<div class="power-bar" role="img" aria-label="'+hover+'">'+
   '<div class="power-segment power-segment-d" style="width:'+pct(data.D)+'%" title="'+partyD+' '+label(data.D,data.denom)+'"></div>'+
   '<div class="power-segment power-segment-r" style="width:'+pct(data.R)+'%" title="Republican '+label(data.R,data.denom)+'"></div>'+
   (data.T+other+(data.U||0)?'<div class="power-segment power-segment-t" style="width:'+pct(data.T+other+(data.U||0))+'%" title="Toss-up or unprojected '+label(data.T+other+(data.U||0),data.denom)+'"></div>':'')+
   '<div class="power-majority-tick" style="left:'+pct(data.threshold)+'%" aria-hidden="true"></div></div><div class="power-card-footer"><small>'+note+'</small></div></article>';
 }).join('');
 rootEl.setAttribute('data-power-ready','true');
}
const api={compute,render};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ERVIN_POWER=api;
})(typeof window!=='undefined'?window:globalThis);
