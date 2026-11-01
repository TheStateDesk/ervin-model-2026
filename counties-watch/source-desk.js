/* Public election-night source desk.
 * Outbound verified links, never a data API or a claim that this site imported a reporter's votes.
 */
(function(root){"use strict";
const $=x=>document.getElementById(x);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=url=>{try{const x=new URL(url);return x.protocol==="https:"?x.href:null}catch{return null}};
const card=(eyebrow,title,description,url,action,kind)=>{
 const link=safe(url);
 return '<article class="source-desk-card"><span class="source-desk-kind">'+esc(eyebrow)+'</span>'+
 '<h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+
 (link?'<a class="source-desk-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer" title="'+esc(kind)+'">'+esc(action)+' ↗</a>':'<span class="source-desk-unavailable">Link unavailable</span>')+'</article>';
};
function render(state,code){
 const region=$("sourceDesk");if(!region||!state)return;
 const official=state.sources?.[code],dd=state.reporters?.ddhq,ap=state.reporters?.ap;
 const stateName=document.getElementById("stateSelect")?.selectedOptions?.[0]?.textContent?.replace(/ \([A-Z]{2}\)$/,"")||code;
 const items=[
  card("1 · Election authority","Official "+stateName+" returns","Primary reference for certified and unofficial counts. A statewide file or county page may be posted only after polls close.",official?.url,"Open official results","Official public source"),
  card("2 · Fast public reporter",dd?.name||"Decision Desk HQ","Independent county and state reporting through its publicly accessible results viewer. A link here does not authorize automated reuse of its commercial results.",dd?.url,"Open fast results desk","Free public news results viewer"),
  card("3 · Independent cross-check",ap?.name||"Associated Press","Separate reporting and verification of local votes and race calls. Public articles and interactive county breakdowns depend on coverage.",ap?.url,"Open AP election coverage","Public journalism, not the paid AP API")
 ];
 region.innerHTML='<div class="source-desk-heading"><div><span class="eyebrow">ELECTION NIGHT · SOURCE DESK</span><h2>Where to check '+esc(stateName)+' results first</h2><p class="description">These links open external reporting. They are <b>not</b> automatically ingested into this site. Verified county figures appear here only after our importer has a matched, timestamped report.</p></div><span class="source-desk-status">3 public source routes</span></div>'+
 '<div class="source-desk-grid">'+items.join("")+'</div>'+
 '<p class="source-desk-footnote"><strong>Speed versus provenance:</strong> DDHQ and AP may post figures sooner than a state agency page, but reported vote counts can differ temporarily in timestamp and reporting coverage. Do not merge the three totals or treat a media race call as state certification. If the county reporting feed is unavailable, use one of the external viewers above. Checked source descriptions: '+esc(state.checkedAt||"October 31, 2026")+'.</p>';
}
root.ERVIN_SOURCE_DESK=Object.freeze({render});
})(window);
