/* Research details are closed for casual visitors, but deep links open them. */
(()=>{'use strict';const box=document.getElementById('stateResearchDrawer');if(!box)return;
function sync(){if(['#stateSources','#miCandidateEffect','#stateSourceLedger'].includes(location.hash))box.open=true;}
window.addEventListener('hashchange',sync);sync();
document.querySelectorAll('a[href="#stateSources"]').forEach(a=>a.addEventListener('click',()=>{box.open=true}));
})();