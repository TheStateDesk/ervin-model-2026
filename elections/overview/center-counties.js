/* Nation-to-county drilldown. Every state uses the locally hosted Census geometry pack. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let ticket=0;
function draw(selectState){
 const svg=$('centerUSMap'),geo=window.ERVIN_US_GEOGRAPHY?.states||[];
 svg.innerHTML=geo.map(g=>'<path class="er-national-state" data-code="'+esc(g.code)+'" tabindex="0" role="button" aria-label="Open '+esc(g.name)+' county map" d="'+g.d+'"><title>'+esc(g.name)+' · open county map</title></path>').join('');
 svg.setAttribute('aria-label','Geographic US state map; select a state to display its locally stored county boundaries');
 svg.querySelectorAll('path').forEach(p=>{const go=()=>selectState(p.dataset.code);p.addEventListener('click',go);p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
 $('centerMapLegend').textContent='Choose a state to see its full local county outlines below. Geography is Census 2022 reference data; no 2026 vote totals are implied by these neutral state colors.';
}
async function drill(code,kind){
 const mark=++ticket,container=$('centerStateInfo');if(!container||!window.ERVIN_GEO)return;
 const box=document.createElement('section');box.className='er-drilldown';
 box.innerHTML='<div class="er-drill-head"><strong>'+esc(code)+' · '+(kind==='districts'?'House districts':'County boundaries')+'</strong><span id="erDrillCount">Loading shapes…</span></div><svg id="erDrillMap" viewBox="0 0 900 580" role="group" aria-label="'+esc(code)+' detailed geographic map"></svg><p id="erDrillInfo" class="race-muted">Select a '+(kind==='districts'?'district to open its election page':'county for its geographic record')+'.</p>';
 container.append(box);
 try{
  const data=await window.ERVIN_GEO.get(code,kind);if(ticket!==mark||!box.isConnected)return;
  const n=window.ERVIN_GEO.draw(box.querySelector('svg'),data,{kind,className:kind==='districts'?'geo-district':'county',onSelect:(el,f)=>{
   if(kind==='districts'){const n=String(f.id).padStart(2,'0');location.href='../../state/?state='+encodeURIComponent(code)+'#house-'+encodeURIComponent(n);}
   else box.querySelector('#erDrillInfo').textContent=String(f.properties?.name||'County')+' · FIPS '+String(f.id)+' · historical geographic boundary only. Open a statewide race dossier for 2020/2024 voting history and a 2026 conditional scenario.';
  }});
  box.querySelector('#erDrillCount').textContent=n+' shapes';
  box.querySelector('#erDrillInfo').textContent=(kind==='districts'?'Click a district to open the 2026 election dossier. 118th Congress shapes may differ from new 2026 boundaries.':'Click a county to inspect its historical geography; not verified 2026 results.');
 }catch(e){if(ticket!==mark)return;box.querySelector('#erDrillCount').textContent='Unavailable';box.querySelector('#erDrillInfo').textContent='Local geography failed to load: '+e.message+'. State election links above remain available.';}
}
window.ERVIN_CENTER_COUNTIES=draw;
window.ERVIN_CENTER_GEO={drill};
})();