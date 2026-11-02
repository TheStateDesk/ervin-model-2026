/* ERVIN GEOGRAPHY 2.0 — local Census-derived boundaries; no runtime D3 or CDN required. */
(()=>{"use strict";
const NS="http://www.w3.org/2000/svg",cache=new Map(),packCache=new Map(),BASE=new URL("../geo/",document.currentScript?.src||location.href).href,REV="20261102-mi-land-shoreline-1";
const STATES="AK AL AR AZ CA CO CT DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY".split(" ");
// Every state now has its own locally hosted county and district files.
// Regional bundles remain a redundant fallback, not the primary browser download.
const DIRECT=new Set(STATES);
async function fromPack(code,kind){
 const index=STATES.indexOf(code);if(index<0)throw Error("Unknown state "+code);
 const pack="packs/p"+String(Math.floor(index/5)+1).padStart(2,"0")+".json";
 if(!packCache.has(pack))packCache.set(pack,fetch(BASE+pack+"?rev="+encodeURIComponent(REV),{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("Local map bundle not found");return r.json();}).catch(e=>{packCache.delete(pack);throw e}));
 const content=await packCache.get(pack);
 const shapes=content.states?.[code]?.[kind];if(!shapes)throw Error("No "+kind+" data for "+code+" in local package");
 return shapes;
}
const make=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
const slug=x=>String(x||"").toUpperCase().replace(/[^A-Z]/g,"").slice(0,2);
async function get(code,kind="counties",options={}){
 code=slug(code);if(!["counties","districts"].includes(kind)||!code)throw Error("Invalid geographic request");
 const key=kind+"/"+code;
 if(options.refresh){cache.delete(key);packCache.clear();}
 if(!cache.has(key))cache.set(key,(async()=>{
   let data=null,primaryError=null;
   try{
     if(!DIRECT.has(code))throw Error("State uses regional bundle");
     const response=await fetch(BASE+key+".json?rev="+encodeURIComponent(REV),{cache:"no-cache"});
     if(!response.ok)throw Error("state asset HTTP "+response.status);
     const parsed=await response.json();
     if(parsed.type!=="FeatureCollection"||parsed.state!==code||!Array.isArray(parsed.features)||!parsed.features.length)throw Error("State asset invalid");
     data=parsed;
   }catch(e){primaryError=e;}
   if(!data){
     try{data=await fromPack(code,kind);}
     catch(e){throw Error(code+" "+kind+" shapes unavailable (state: "+(primaryError?.message||"unavailable")+"; pack: "+e.message+")");}
   }
   if(data.type!=="FeatureCollection"||!Array.isArray(data.features)||!data.features.length||data.state!==code)throw Error("State geometry invalid for "+code);
   return data;
 })().catch(e=>{cache.delete(key);throw e}));
 return cache.get(key);
}
function rings(geometry){return geometry?.type==="Polygon"?geometry.coordinates:geometry?.type==="MultiPolygon"?geometry.coordinates.flat():[];}
function draw(svg,collection,options={}){
 const features=(collection.features||[]).filter(f=>options.kind!=="districts"||/^\d{1,2}$/.test(String(f.id||""))),w=900,h=580,pad=25,ak=collection.state==="AK";
 const lon=x=>ak&&x>0?x-360:x;
 // Mercator-like local projection with a simple state-specific longitudinal scale.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const f of features)for(const ring of rings(f.geometry))for(const p of ring){if(p?.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])){const x=lon(p[0]),y=p[1];minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
 if(!Number.isFinite(minX))throw Error("County or district polygons are empty");
 let lat=(minY+maxY)/2,shrink=Math.cos(lat*Math.PI/180),xSpan=Math.max(0.01,(maxX-minX)*shrink),ySpan=Math.max(0.01,maxY-minY);
 let scale=Math.min((w-pad*2)/xSpan,(h-pad*2)/ySpan);
 const x0=(w-xSpan*scale)/2,y0=(h-ySpan*scale)/2;
 const toXY=point=>[x0+(lon(point[0])-minX)*shrink*scale,h-y0-(point[1]-minY)*scale];
 const makePath=geometry=>rings(geometry).map(ring=>{
   if(!ring?.length)return "";
   return ring.map((pt,i)=>{let [x,y]=toXY(pt);return(i?"L":"M")+x.toFixed(2)+" "+y.toFixed(2)}).join("")+"Z";
 }).join("");
 const frag=document.createDocumentFragment(),positions=[];
 for(const f of features){
  const d=makePath(f.geometry);if(!d)continue;
  const id=String(f.id??""),name=String(f.properties?.name||((options.kind==="districts"?"District ":"County ")+id)),el=make("path",{d,class:options.className||"county","fill-rule":"evenodd",tabindex:"0",role:"button","aria-label":name+(options.kind==="districts"?" — open House race":" — inspect county")});
  el.dataset.name=name;el.dataset.fips=id;el.dataset.district=id;
  const title=make("title");title.textContent=name;el.append(title);
  el.addEventListener("click",()=>options.onSelect?.(el,f));
  el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();options.onSelect?.(el,f);}});
  frag.append(el);
  if(options.kind==="districts"){
   // Average vertices are often outside concave polygons; using bbox centers is a visual reference only.
   let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
   const outer=rings(f.geometry)[0]||[];for(const pt of outer){const [x,y]=toXY(pt);xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
   if(Number.isFinite(xmin)&&xmax-xmin>22&&ymax-ymin>20)positions.push({x:(xmin+xmax)/2,y:(ymin+ymax)/2,id,name});
  }
 }
 if(options.kind==="districts"&&options.labels!==false&&features.length<55){
  const labels=make("g",{"aria-hidden":"true","pointer-events":"none"});
  for(const d of positions){const el=make("text",{x:d.x,y:d.y,"text-anchor":"middle","dominant-baseline":"middle",class:"geo-district-label"});el.textContent=Number(d.id)||d.id;labels.append(el)}
  frag.append(labels);
 }
 svg.replaceChildren(frag);svg.setAttribute("viewBox","0 0 900 580");
 svg.setAttribute("aria-label",features.length+" "+(options.kind==="districts"?"historic congressional district":"county")+" outlines for "+collection.state);
 return features.length;
}
window.ERVIN_GEO={get,draw,reload:(code,kind="counties")=>get(code,kind,{refresh:true}),revision:REV};
})();