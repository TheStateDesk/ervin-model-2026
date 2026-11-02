/* Ervin Model · county-level research table.
   Historic presidential margins and conditional 2026 state scenarios only; NOT 2026 vote totals. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const state={rows:[],office:"",code:"",target:null};
const fmt=v=>Number.isFinite(v)?(v>=0?"D +":"R +")+Math.abs(v).toFixed(1):"Not available";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const csvCell=x=>'"'+String(x??"").replace(/"/g,'""')+'"';
function sorted(){
 const query=($("countyScenarioFind")?.value||"").trim().toLowerCase(),mode=$("countyScenarioSort")?.value||"name";
 let arr=state.rows.filter(x=>!query||x.name.toLowerCase().includes(query)||x.fips.includes(query));
 if(mode==="expected")arr.sort((a,b)=>(b.expected??-9999)-(a.expected??-9999)||a.name.localeCompare(b.name));
 else if(mode==="swing")arr.sort((a,b)=>((b.m24??0)-(b.m20??0))-((a.m24??0)-(a.m20??0))||a.name.localeCompare(b.name));
 else arr.sort((a,b)=>a.name.localeCompare(b.name));
 return arr;
}
function render(){
 const count=$("countyScenarioCount"),target=$("countyScenarioTarget"),tbody=$("countyScenarioRows");
 if(!tbody)return;
 count.textContent=state.rows.filter(x=>Number.isFinite(x.m24)).length.toLocaleString("en-US");
 target.textContent=fmt(state.target);
 $("countyScenarioExplain").textContent=state.office==="House"
 ?"Statewide county presidential history is shown for context only. House district county allocations are not calculated without validated district geography and past district-level election returns; counties may overlap multiple districts."
 :"Conditional 2026 margins are scenario allocations of the statewide "+(state.office==="Governor"?"published polling margin":"Ervin Senate polling adjustment")+" using historical county voting and a partial local-trend adjustment. They are neither independent county polls nor votes counted.";
 const entries=sorted();
 tbody.innerHTML=entries.map(x=>'<tr><th scope="row">'+esc(x.name)+'<small>'+esc(x.fips)+'</small></th><td>'+esc(fmt(x.m20))+'</td><td>'+esc(fmt(x.m24))+'</td><td>'+esc(fmt(x.expected))+'</td></tr>').join("")||'<tr><td colspan="4">No matching county records.</td></tr>';
 $("countyScenarioFoot").textContent=entries.length+" county records shown. County-equivalent boundaries and margins reflect historical 2022 geographic shapes and 2020/2024 presidential returns; model assumptions do not establish 2026 county candidate-specific results. Missing estimates remain blank.";
}
function exportCSV(){
 const data=[["state","county","fips","2020_presidential_D_minus_R_points","2024_presidential_D_minus_R_points","conditional_2026_D_minus_R_points","source_type","note"],...sorted().map(x=>[state.code,x.name,x.fips,x.m20??"",x.m24??"",x.expected??"",state.office==="House"?"Historical county context":"Conditional statewide race model","Model illustration, not live vote reporting"])];
 const csv=data.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");
 a.href=url;a.download="ervin-"+state.code+"-county-research-2026.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 $("countyScenarioFind")?.addEventListener("input",render);
 $("countyScenarioSort")?.addEventListener("change",render);
 $("countyScenarioExport")?.addEventListener("click",exportCSV);
 window.addEventListener("ervin:county-scenario",event=>{
  const x=event.detail||{};state.rows=Array.isArray(x.rows)?x.rows:[];state.office=x.office||"";state.code=x.code||"";state.target=x.target??null;render();
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();