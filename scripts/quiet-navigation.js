/* Old bookmarked research anchors should open the optional research drawer. */
(()=>{'use strict';function openLinkedResearch(){
 const drawer=document.getElementById('advancedPollingDrawer');
 if(drawer&&(['#researchLab','#insightStats','#insightSourceRows'].includes(location.hash)))drawer.open=true;
}
window.addEventListener('hashchange',openLinkedResearch);
openLinkedResearch();
})();
