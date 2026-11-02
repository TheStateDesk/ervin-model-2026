
/* Full-country county-boundary exploration using Census-derived TopoJSON. */
(()=>{'use strict';
const STATE={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'};
let atlasPromise=null,generation=0;
function ns(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}
async function draw(selectState){
 const ticket=++generation,svg=document.getElementById('centerUSMap'),legend=document.getElementById('centerMapLegend');
 svg.replaceChildren();const status=ns('text');status.setAttribute('x','540');status.setAttribute('y','300');status.setAttribute('text-anchor','middle');status.setAttribute('fill','#8b9aa8');status.textContent='Preparing complete county geography…';svg.append(status);
 if(typeof d3==='undefined'||typeof topojson==='undefined'){status.textContent='County mapping libraries unavailable. Select a state to browse local maps.';return;}
 if(!atlasPromise)atlasPromise=fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json').then(r=>{if(!r.ok)throw Error('County atlas unavailable');return r.json();}).catch(e=>{atlasPromise=null;throw e;});
 try{
  const atlas=await atlasPromise;
  if(ticket!==generation||document.getElementById('centerMapLayer').value!=='counties')return;
  if(!atlas.objects?.counties||!atlas.objects?.states)throw Error('Unexpected atlas contents');
  const counties=topojson.feature(atlas,atlas.objects.counties).features,states=topojson.feature(atlas,atlas.objects.states).features;
  const projection=d3.geoAlbersUsa().fitExtent([[20,16],[1060,607]],{type:'FeatureCollection',features:states}),path=d3.geoPath(projection);
  const frag=document.createDocumentFragment(),visible=new Map();
  for(const c of counties){
   const code=STATE[String(c.id).padStart(5,'0').slice(0,2)],d=path(c);if(!code||!d)continue;
   const name=String(c.properties?.name||'Unlabeled county');
   const p=ns('path');p.setAttribute('d',d);p.setAttribute('class','er-county-path');p.dataset.code=code;p.dataset.name=name;
   const t=ns('title');t.textContent=name+' County, '+code+' · select state contests';p.append(t);frag.append(p);
   visible.set(code,(visible.get(code)||0)+1);
  }
  for(const s of states){
   const code=STATE[String(s.id).padStart(2,'0')],d=path(s);if(!code||!d)continue;
   const p=ns('path');p.setAttribute('d',d);p.classList.add('er-state-stroke');p.dataset.code=code;p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label','Open '+code+' election dashboard');p.setAttribute('fill','none');
   p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectState(code);}});
   frag.append(p);
  }
  svg.replaceChildren(frag);
  svg.setAttribute('aria-label','Nationwide county shapes; click a county to open its state election directory. State borders are keyboard-selectable.');
  svg.onclick=e=>{const p=e.target.closest?.('path[data-code]');if(p&&STATE[String((p.dataset.code||''))]===undefined)selectState(p.dataset.code);};
  legend.textContent=counties.length.toLocaleString('en-US')+' Census-derived county geometries nationwide · outline only · gray does not mean a 2026 result · select a county to browse its state contests. Boundaries are historical atlas cartography, not 2026 district outlines.';
 }catch(e){status.textContent='County atlas could not load. State map layers remain available.';legend.textContent='External county geometry unavailable ('+e.message+'); select another map layer.';svg.replaceChildren(status);}
}
window.ERVIN_CENTER_COUNTIES=draw;
})();
