/* House and governor offices: results first, sources always labeled */
(function officeResults(){
'use strict';
const script=document.currentScript,root=new URL('../',script?.src||location.href);
const mode=document.body.dataset.liveOffice;if(!['House','Governor'].includes(mode))return;
const $=id=>document.getElementById(id),format=n=>Number(n).toLocaleString('en-US');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=false;
const url=id=>'../results/?state='+id.slice(0,2)+'&race='+id+'#nationalBoard';
const fetchJSON=async path=>{const u=new URL(path,root);u.searchParams.set('updated',Math.floor(Date.now()/60000));const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(path+' '+r.status);return r.json()};
const good=x=>x&&x.verified===true&&Number.isSafeInteger(x.total)&&x.total>0&&Array.isArray(x.candidates)&&x.candidates.length>=2;
const update=async()=>{
 if(active)return;active=true;
 try{
  const [a,b]=await Promise.allSettled([fetchJSON('civicapi/races.json'),fetchJSON('election-night/ap-calls.json')]);
  const races=a.status==='fulfilled'?a.value.races||{}:{},calls=b.status==='fulfilled'?b.value.calls||{}:{};
  if(mode==='House'){
   const called=Object.entries(calls).filter(([id])=>/^[A-Z]{2}-\d{2}$/.test(id)),d=called.filter(x=>x[1].party==='D').length,r=called.filter(x=>x[1].party==='R').length;
   const counted=Object.entries(races).filter(([id,v])=>/^[A-Z]{2}-\d{2}$/.test(id)&&good(v)).length;
   $('peOfficeTitle').textContent='The new House, district by district';
   $('peOfficeSummary').textContent='Democrats have won control of the House. Explore independently sourced district calls and the current unofficial vote count. Our call ledger may lag decisions published elsewhere.';
   $('peOfficeStats').innerHTML='<div><strong>'+d+'</strong><small>Democratic winners in local AP ledger</small></div><div><strong>'+r+'</strong><small>Republican winners in local AP ledger</small></div><div><strong>'+counted+'</strong><small>Districts with accepted unofficial counts</small></div>';
   const narrow=Object.entries(races).filter(([id,v])=>/^[A-Z]{2}-\d{2}$/.test(id)&&good(v)&&!calls[id]).map(([id,v])=>{
    const c=v.candidates.slice().sort((x,y)=>y.votes-x.votes),margin=100*(c[0].votes-c[1].votes)/v.total;return {id,lead:c[0].name,margin};
   }).sort((x,y)=>x.margin-y.margin).slice(0,4);
   $('peOfficeRaces').innerHTML=narrow.map(x=>'<a href="'+url(x.id)+'"><b>'+esc(x.id)+'</b><span>'+esc(x.lead)+' currently leads</span><strong>'+x.margin.toFixed(2)+' pts</strong></a>').join('')||'<span>Accepted uncalled district totals are not available.</span>';
  }else{
   $('peOfficeTitle').textContent='Four governorships change hands';
   $('peOfficeSummary').textContent='Democrats won governor races in Georgia, Iowa, Ohio and Texas, flipping four Republican-held offices. The candidate totals below remain unofficial and are not the same as certification.';
   const wins=['GA','IA','OH','TX'].map(code=>{const id=code+'-GOVERNOR',call=calls[id],v=races[id],winner=call?.winner||'AP call pending in site ledger';const top=good(v)?v.candidates.slice().sort((x,y)=>y.votes-x.votes):[],margin=top.length?100*(top[0].votes-top[1].votes)/v.total:null;return {id,code,winner,margin}});
   $('peOfficeStats').innerHTML='<div><strong>4</strong><small>GOP-held governorships flipped</small></div><div><strong>36</strong><small>Governor races in 2026</small></div><div><strong>'+Object.keys(calls).filter(id=>id.endsWith('-GOVERNOR')).length+'</strong><small>Governor calls in our AP ledger</small></div>';
   $('peOfficeRaces').innerHTML=wins.map(x=>'<a href="'+url(x.id)+'"><b>'+esc(x.code)+'</b><span>'+esc(x.winner)+'</span><strong>'+(x.margin===null?'Count pending':x.margin.toFixed(1)+'-pt lead')+'</strong></a>').join('');
  }
  $('peOfficeStatus').textContent='Unofficial vote reports · '+new Date().toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'})+' desk check. Newsroom calls are recorded separately.';
 }catch(e){$('peOfficeStatus').textContent='Latest accepted totals temporarily unavailable. Open the national results desk for independent reporting.'}
 finally{active=false}
};
const init=()=>{
 const anchor=document.querySelector('.race-topline')||document.querySelector('.race-lede');if(!anchor)return;
 const section=document.createElement('section');section.className='pe-office-results';section.setAttribute('aria-label','Post-election results first');
 section.innerHTML='<div class="pe-office-lede"><div><span>2026 / THE POST-ELECTION DESK</span><h2 id="peOfficeTitle">Election results</h2><p id="peOfficeSummary">Loading sourced unofficial returns…</p></div><a href="../analysis/">Read the analysis</a></div><div class="pe-office-stats" id="peOfficeStats"><div>Checking…</div></div><div class="pe-office-races" id="peOfficeRaces"></div><p class="pe-office-method" id="peOfficeStatus">Sourcing the latest results and newsroom calls…</p><div class="pe-office-source"><a href="https://apnews.com/projects/elections-2026/" target="_blank" rel="noopener noreferrer">AP official results coverage</a><a href="../results/">National results desk</a></div>';
 anchor.insertAdjacentElement('afterend',section);
 update();setInterval(()=>{if(!document.hidden)update()},60000);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
