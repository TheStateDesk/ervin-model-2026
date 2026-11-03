/* Accessible House district explorer: 2026 Census CD120 geography for redrawn states, unchanged earlier lines elsewhere. */
(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const path=r=>'../state/?state='+encodeURIComponent(r.code)+'#house-'+encodeURIComponent(r.district);
let seats=[],selectState='MI',generation=0;
function tone(r){
 const c=String(window.ERVIN_HOUSE_DATA?.races?.[r?.id]?.modelRating||r?.rating||'').toLowerCase();
 const grade=/^(solid|likely|lean|tilt) ([dr])$/.exec(c);
 if(!grade)return c==='tossup'?'var(--ed-grade-toss)':'var(--ed-map-neutral,#9cacb8)';
 const tier=grade[1]==='tilt'?'lean':grade[1];
 return 'var(--ed-grade-'+tier+'-'+grade[2]+')';
}
function fallback(races,msg){
 $('districtMapSvg').replaceChildren();
 $('districtMapStatus').textContent=msg+' Select any district below to open its election dashboard.';
 $('districtMapPicker').innerHTML='<div class="district-chip-grid">'+races.map(r=>'<a href="'+path(r)+'">'+escape(r.id)+'<small>'+escape(window.ERVIN_HOUSE_DATA?.races?.[r.id]?.modelRating||r.rating||'No rating')+'</small></a>').join('')+'</div>';
}
async function update(){
 const requested=$('houseState')?.value||'all';
 if(requested!=='all')selectState=requested;
 const code=selectState,all=seats.filter(r=>r.code===code).sort((a,b)=>a.district.localeCompare(b.district)),gen=++generation;
 const name=all[0]?.state||code;
 $('districtMapTitle').textContent=name+' · individual House districts';
 $('districtMapCount').textContent=all.length+' districts';
 $('districtState').textContent=code;
 const jump=$('districtJump');jump.innerHTML='<option value="">Choose a district to open…</option>'+all.map(r=>'<option value="'+path(r)+'">'+escape(r.id)+' · '+escape(window.ERVIN_HOUSE_DATA?.races?.[r.id]?.modelRating||r.rating||'Rating unavailable')+'</option>').join('');
 $('districtMapPicker').textContent='';
 $('districtMapStatus').textContent='Loading local district outlines…';
 try{
  const data=await window.ERVIN_GEO.get(code,'districts');if(gen!==generation)return;
  const available={...data,features:data.features.filter(f=>all.some(r=>r.district===String(f.id).padStart(2,'0')))};
  const count=window.ERVIN_GEO.draw($('districtMapSvg'),available,{kind:'districts',className:'geo-district',onSelect:(el,f)=>{
   const r=all.find(x=>String(x.district).padStart(2,'0')===String(f.id).padStart(2,'0'));if(!r)return;
   location.href=path(r);
  }});
  for(const el of $('districtMapSvg').querySelectorAll('path.geo-district')){
   const r=all.find(x=>x.district===String(el.dataset.district).padStart(2,'0'));el.style.fill=tone(r);el.dataset.rating=window.ERVIN_HOUSE_DATA?.races?.[r?.id]?.modelRating||r?.rating||'Not rated';
   el.querySelector('title').textContent=(r?.id||'District')+' · '+(window.ERVIN_HOUSE_DATA?.races?.[r?.id]?.modelRating||r?.rating||'No provisional model rating')+' · click to open race';
   el.addEventListener('pointerenter',()=>{$('districtMapStatus').textContent=(r?.id||'District')+' · '+(window.ERVIN_HOUSE_DATA?.races?.[r?.id]?.modelRating||r?.rating||'No provisional model rating')+' · click for individual election page';});
   el.addEventListener('focus',()=>{$('districtMapStatus').textContent=(r?.id||'District')+' · '+(r?.rating||'No published rating entered')+' · Enter to open';});
  }
  const verified2026=Number(data.boundaryYear)===2026;
  $('districtMapStatus').textContent=count+' '+(verified2026?'official Census 2026 CD120':'unchanged reference')+' district outlines · colored by provisional House scenarios (NOT reported election results) · select any race';
  const url=verified2026&&/^https:\/\//.test(data.sourceUrl||'')?data.sourceUrl:'https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.html';
  $('districtMapPicker').innerHTML=(verified2026?
   'Official <strong>2026 voting boundaries (120th Congress)</strong> from the U.S. Census Bureau. Polygon lines are simplified for display, not property-level surveying.':
   'Census 118th district geography, retained because these district boundaries were not changed for the 2026 election. Missouri’s later redistricting proposal was blocked.')+
   ' <a target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">Geographic source</a>. Presidential voting on these maps may still be a reconstructed estimate, not a certified district return.';
 }catch(e){if(gen!==generation)return;fallback(all,'District map unavailable: '+e.message+'.');}
}
async function init(){
 if(!$('districtExplorer'))return;
 try{
  const r=await fetch('./data.json',{cache:'force-cache'});if(!r.ok)throw Error('House race registry unavailable');
  seats=(await r.json()).seats||[];
  const m=await fetch('./ervin-forecast-2026-11-02.json',{cache:'no-cache'}).catch(()=>null);
  if(m?.ok)window.ERVIN_HOUSE_DATA=await m.json();
  const requested=(new URLSearchParams(location.search).get('state')||'MI').toUpperCase();
  if(seats.some(x=>x.code===requested))selectState=requested;
  const input=$('houseState');if(input){if(input.value==='all')input.value=selectState;input.addEventListener('change',update);}
  $('districtJump').onchange=e=>{if(e.target.value)location.href=e.target.value;};
  await update();
 }catch(e){$('districtMapStatus').textContent='District navigation could not load: '+e.message;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();