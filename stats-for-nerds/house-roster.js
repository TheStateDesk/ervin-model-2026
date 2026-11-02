/* House candidate atlas: 435 districts, sourced nomination lists, browser-only filtering. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[],shown=24,query='',state='all';
const party=p=>({D:'Democrat',R:'Republican',L:'Libertarian',I:'Independent',G:'Green',NPA:'No party'}[p]||p);
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'#'}catch{return '#'}};
function filter(){return rows.filter(r=>(state==='all'||r.code===state)&&(!query||[r.id,r.state,...(r.candidates||[]).flatMap(c=>[c.name,c.party,party(c.party)])].join(' ').toLowerCase().includes(query)));}
function render(){
 const found=filter();
 $('houseRosterSummary').textContent=found.length+' of 435 House districts match · '+rows.filter(x=>x.candidates.length).length+' districts have at least one on-ballot directory record. '+'Select any district for its forecast, maps and sources.';
 $('houseRosterCards').innerHTML=found.slice(0,shown).map(r=>{
  const c=r.candidates||[],major=c.filter(p=>p.party==='D'||p.party==='R'),extra=c.length-major.length;
  const cards=c.map(p=>{
   const tone=p.party==='D'?'d':p.party==='R'?'r':'o';
   return '<span class="nerd-roster-person '+tone+'"><b>'+esc(p.name)+'</b> <small>'+esc(party(p.party))+(p.incumbent?' · incumbent':'')+'</small></span>';
  }).join('');
  const uri='../state/?state='+encodeURIComponent(r.code)+'#house-'+encodeURIComponent(r.district);
  const alert=major.length===2&&major[0].party===major[1].party?'<small>Same-party general-election candidates</small>':'';
  return '<article class="nerd-house-record"><div><a class="nerd-house-link" href="'+uri+'">'+esc(r.id)+' · '+esc(r.state)+'</a><small>'+c.length+' listed candidate'+(c.length===1?'':'s')+'</small>'+alert+'</div>'+
   '<div class="nerd-roster-people">'+(cards||'<span class="nerd-subtle">No verified nominee listed</span>')+'</div>'+
   '<a class="nerd-house-explore" href="'+uri+'">District details</a></article>';
 }).join('')||'<p>No House races match. Try a candidate surname or a state.</p>';
 $('houseRosterMore').hidden=found.length<=shown;
 $('houseRosterMore').textContent='Show more · '+Math.min(24,found.length-shown)+' next';
}
async function init(){
 if(!$('houseCandidateSearch'))return;
 try{
  const [a,b]=await Promise.all([fetch('../house/candidates-2026.json',{cache:'no-cache'}),fetch('../house/data.json',{cache:'no-cache'})]);
  if(!a.ok||!b.ok)throw Error('Source file missing');
  const [roster,base]=await Promise.all([a.json(),b.json()]);
  if(roster.version!==1||roster.election!=='2026-11-03'||(base.seats||[]).length!==435||Object.keys(roster.races||{}).length!==435)throw Error('Candidate roster validation failed');
  rows=base.seats.map(r=>({...r,candidates:roster.races[r.id]?.candidates||[]}));
  const options=[...new Map(rows.map(x=>[x.code,x.state])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  $('houseCandidateState').innerHTML='<option value="all">All 50 states</option>'+options.map(([c,n])=>'<option value="'+esc(c)+'">'+esc(n)+'</option>').join('');
  $('houseCandidateState').onchange=v=>{state=v.target.value;shown=24;render()};
  $('houseCandidateSearch').oninput=v=>{query=v.target.value.trim().toLowerCase();shown=24;render()};
  $('houseRosterMore').onclick=()=>{shown+=24;render()};
  render();
 }catch(e){$('houseRosterSummary').textContent='House candidate source unavailable — consult the 435 district forecasts.';console.warn('House roster unavailable',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();