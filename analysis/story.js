/* Dynamic, source-attributed race results for short editorial features. */
(()=>{'use strict';
const root=new URL('../',document.currentScript.src);
const ids={"senate-seven-flips":["IA-SENATE","KS-SENATE","ME-SENATE","NC-SENATE","OH-SENATE","SC-SENATE","TX-SENATE"],"governors-switch":["GA-GOVERNOR","IA-GOVERNOR","OH-GOVERNOR","TX-GOVERNOR"],"unfinished-count":["AK-SENATE","MS-SENATE"],"new-congress":["TX-SENATE","KS-SENATE","IA-SENATE","NC-SENATE","OH-SENATE","SC-SENATE","ME-SENATE"]};
const stateNames={AK:'Alaska',MS:'Mississippi',IA:'Iowa',KS:'Kansas',ME:'Maine',NC:'North Carolina',OH:'Ohio',SC:'South Carolina',TX:'Texas',GA:'Georgia'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const stamp=d=>{const n=Date.parse(d||'');return Number.isFinite(n)?new Date(n).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}):'not available'};
const safe=r=>!!r&&r.verified===true&&Number.isSafeInteger(r.total)&&r.total>0&&Array.isArray(r.candidates)&&r.candidates.length>=2&&r.candidates.every(c=>Number.isSafeInteger(c.votes)&&c.votes>=0);
async function update(){
 const code=document.body.dataset.story;
 const selected=ids[code];if(!selected)return;
 const fetchJSON=async path=>{const url=new URL(path,root);url.searchParams.set('v',Math.floor(Date.now()/60000));const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return response.json()};
 const [votes,calls]=await Promise.allSettled([fetchJSON('civicapi/races.json'),fetchJSON('election-night/ap-calls.json')]);
 const data=votes.status==='fulfilled'?votes.value?.races||{}:{},called=calls.status==='fulfilled'?calls.value?.calls||{}:{};
 const tbl=document.getElementById('storyTable'),node=document.getElementById('storyDataStamp');
 const rows=selected.map(id=>{const r=data[id],ap=called[id],place=stateNames[id.slice(0,2)]||id.slice(0,2),kind=id.endsWith('GOVERNOR')?'Governor':'U.S. Senate';
 if(!safe(r))return '<tr><td><a href="../../election-night/?state='+id.slice(0,2)+'&race='+id+'#nationalBoard">'+place+' · '+kind+'</a></td><td colspan="3">Accepted totals unavailable</td><td>'+(ap?esc(ap.winner)+' (AP)':'No locally tracked call')+'</td></tr>';
 const c=r.candidates.slice().sort((a,b)=>b.votes-a.votes),diff=c[0].votes-c[1].votes,pct=100*diff/r.total,leader=c[0];
 return '<tr><td><a href="../../election-night/?state='+id.slice(0,2)+'&race='+id+'#nationalBoard">'+place+' · '+kind+'</a></td><td><strong>'+esc(leader.name)+'</strong><small>'+stamp(r.asOf)+'</small></td><td>'+fmt(r.total)+'</td><td>'+pct.toFixed(2)+' pts · '+fmt(diff)+' votes</td><td>'+(ap?esc(ap.winner)+' (AP)':'No locally tracked call')+'</td></tr>';
 });
 tbl.innerHTML=rows.join('');
 node.textContent=(votes.status==='fulfilled'?'CivicAPI reported totals':'Election returns unavailable')+' · '+(calls.status==='fulfilled'?'AP call ledger':'AP call ledger unavailable')+' · independently sourced; not certified.';
}
update();setInterval(()=>{if(!document.hidden)update()},60000);
})();