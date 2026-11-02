/* House district explorer: accessible map-first selection using locally hosted 118th Congress reference geometry. */
(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const path=r=>'../elections/?office=house&state='+encodeURIComponent(r.code)+'&district='+encodeURIComponent(r.district);
let seats=[],selectState='MI',generation=0;
function tone(r){let c=(r?.rating||'').toLowerCase();return c.includes('tossup')?'#bca481':c.includes('d')?'#5194c4':c.includes('r')?'#b96172':'#89a1b4';}
function fallback(races,msg){
 $('districtMapSvg').replaceChildren();
 $('districtMapStatus').textContent=msg+' Select any district below to open its election dashboard.';
 $('districtMapPicker').innerHTML='<div class="district-chip-grid">'+races.map(r=>'<a href="'+path(r)+'">'+escape(r.id)+'<small>'+escape(r.rating||'No rating')+'</small></a>').join('')+'</div>';
}
async function update(){
 const requested=$('houseState')?.value||'all';
 if(requested!=='all')selectState=requested;
 const code=selectState,all=seats.filter(r=>r.code===code).sort((a,b)=>a.district.localeCompare(b.district)),gen=++generation;
 const name=all[0]?.state||code;
 $('districtMapTitle').textContent=name+' · individual House districts';
 $('districtMapCount').textContent=all.length+' districts';
 $('districtState').textContent=code;
 const jump=$('districtJump');jump.innerHTML='<option value="">Choose a district to open…</option>'+all.map(r=>'<option value="'+path(r)+'">'+escape(r.id)+' · '+escape(r.rating||'Rating unavailable')+'</option>').join('');
 $('districtMapPicker').textContent='';
 $('districtMapStatus').textContent='Loading local district outlines…';
 try{
  const data=await window.ERVIN_GEO.get(code,'districts');if(gen!==generation)return;
  const count=window.ERVIN_GEO.draw($('districtMapSvg'),data,{kind:'districts',className:'geo-district',onSelect:(el,f)=>{
   const r=all.find(x=>String(x.district).padStart(2,'0')===String(f.id).padStart(2,'0'));if(!r)return;
   location.href=path(r);
  }});
  for(const el of $('districtMapSvg').querySelectorAll('path.geo-district')){
   const r=all.find(x=>x.district===String(el.dataset.district).padStart(2,'0'));el.style.fill=tone(r);el.dataset.rating=r?.rating||'Not rated';
   el.querySelector('title').textContent=(r?.id||'District')+' · '+(r?.rating||'No publisher rating')+' · click to open race';
   el.addEventListener('pointerenter',()=>{$('districtMapStatus').textContent=(r?.id||'District')+' · '+(r?.rating||'No published rating entered')+' · click for individual election page';});
   el.addEventListener('focus',()=>{$('districtMapStatus').textContent=(r?.id||'District')+' · '+(r?.rating||'No published rating entered')+' · Enter to open';});
  }
  $('districtMapStatus').textContent=count+' reference shapes loaded · colored by published Cook rating where entered · click any shape to open its race';
  $('districtMapPicker').textContent='The labeled polygons are 2022 Census (118th Congress) reference geography. If 2026 redistricting changed this state, shapes may be outdated. District links use the 2026 House race index; geographic references are not certified 2026 ballot boundaries.';
 }catch(e){if(gen!==generation)return;fallback(all,'District map unavailable: '+e.message+'.');}
}
async function init(){
 if(!$('districtExplorer'))return;
 try{
  const r=await fetch('./data.json',{cache:'force-cache'});if(!r.ok)throw Error('House race registry unavailable');
  seats=(await r.json()).seats||[];
  const requested=(new URLSearchParams(location.search).get('state')||'MI').toUpperCase();
  if(seats.some(x=>x.code===requested))selectState=requested;
  const input=$('houseState');if(input){if(input.value==='all')input.value=selectState;input.addEventListener('change',update);}
  $('districtJump').onchange=e=>{if(e.target.value)location.href=e.target.value;};
  await update();
 }catch(e){$('districtMapStatus').textContent='District navigation could not load: '+e.message;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();