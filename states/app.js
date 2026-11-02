/* Original Ervin national map navigation, state-centric rather than race-centric. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=(window.ERVIN_US_GEOGRAPHY?.states||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
const names=Object.fromEntries(states.map(s=>[s.code,s.name]));
const href=code=>'../state/?state='+encodeURIComponent(code);
const REGION={
 Northeast:'CT ME MA NH NJ NY PA RI VT',
 Midwest:'IL IN IA KS MI MN MO NE ND OH SD WI',
 South:'AL AR DE FL GA KY LA MD MS NC OK SC TN TX VA WV',
 West:'AK AZ CA CO HI ID MT NV NM OR UT WA WY'
};
function drawMap(){
 const svg=$('usMap');
 const geometry=window.ERVIN_US_GEOGRAPHY;
 if(!geometry?.states?.length){svg.textContent='State map unavailable; use the alphabetical index below.';return;}
 svg.innerHTML=geometry.states.map(s=>'<a href="'+href(s.code)+'" aria-label="Open full '+esc(s.name)+' election edition"><path class="ed-state" data-state="'+esc(s.code)+'" d="'+s.d+'"><title>'+esc(s.name)+' · full election picture</title></path></a>').join('');
 svg.setAttribute('viewBox',geometry.viewBox||'0 0 1080 625');
}
function buildDirectory(){
 const container=$('stateRegions');
 container.innerHTML=Object.entries(REGION).map(([region,values])=>{const set=new Set(values.split(' ')),arr=states.filter(s=>set.has(s.code));return '<div style="margin:18px 0 23px"><div class="ed-band" style="border-bottom:1px solid #bcc8cc;padding-bottom:7px;margin:0 0 11px"><h2 style="font:700 24px Georgia,serif;margin:0">'+esc(region)+'</h2><span class="ed-mini">'+arr.length+' states</span></div><div class="ed-scrollrow" style="flex-wrap:wrap;overflow:visible">'+arr.map(s=>'<a class="ed-state-chip" href="'+href(s.code)+'" data-search-name="'+esc(s.name.toLowerCase())+'">'+esc(s.name)+'</a>').join('')+'</div></div>';}).join('');
 $('directoryCount').textContent=states.length+' state editions · direct access';
}
function search(){
 const query=$('stateSearch').value.trim().toLowerCase();
 const matches=states.filter(s=>s.name.toLowerCase().includes(query)||s.code.toLowerCase()===query);
 for(const node of document.querySelectorAll('.ed-state-chip[data-search-name]'))node.hidden=Boolean(query)&&!node.dataset.searchName.includes(query)&&!node.textContent.toLowerCase().startsWith(query);
 for(const p of document.querySelectorAll('path[data-state]')){
  const match=matches.some(s=>s.code===p.dataset.state);
  p.style.opacity=query&&!match?'.18':'1';
  p.style.fill=query&&match?'#4f839d':'';
 }
 $('directoryCount').textContent=query?matches.length+' states matching "'+query+'"':states.length+' state editions';
}
function init(){
 drawMap();buildDirectory();
 $('quickSelect').innerHTML='<option value="">Choose a state…</option>'+states.map(s=>'<option value="'+s.code+'">'+esc(s.name)+'</option>').join('');
 $('quickSelect').onchange=e=>{if(names[e.target.value])location.href=href(e.target.value);};
 $('stateSearch').oninput=search;
 $('stateSearch').onkeydown=e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLowerCase();const match=states.find(s=>s.name.toLowerCase()===q||s.code.toLowerCase()===q)||states.find(s=>s.name.toLowerCase().startsWith(q));if(match)location.href=href(match.code);};
 $('todayLabel').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 $('featuredStates').innerHTML='<div class="ed-kicker" style="margin-top:12px">Quick editions</div>'+['MI','TX','PA','GA','AZ','ME'].map(code=>'<article><a href="'+href(code)+'"><strong>'+esc(names[code]||code)+'</strong></a><small>Senate · Governor · House · Counties · Returns</small></article>').join('');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();