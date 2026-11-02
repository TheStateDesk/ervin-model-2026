/* Main forecast homepage balance: use only saved pre-election source snapshots. */
(()=>{'use strict';
const target=document.getElementById('powerCards');
if(!target)return;
const read=async path=>{const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw Error(path+' HTTP '+response.status);return response.json()};
async function start(){
 try{
  const [house,governor,senate,history]=await Promise.all([
   read('house/ervin-forecast-2026-11-02.json'),
   read('governors/data.json'),
   read('counties-watch/forecast-baselines.json'),
   read('research/governor-same-office-2014-2024.json')
  ]);
  if(!window.ERVIN_STATEWIDE?.apply||!window.ERVIN_POWER?.compute)throw Error('Balance model not loaded');
  const model=window.ERVIN_STATEWIDE.apply(history,governor,senate);
  const results=window.ERVIN_POWER.compute(house,model.senate,model.governor);
  window.ERVIN_POWER.render(target,results);
 }catch(error){
  console.error('Homepage balance forecast unavailable:',error);
  target.innerHTML='<p class="power-unavailable">The forecast balance could not be loaded. <a href="states/">Browse the current state forecasts</a>.</p>';
 }
}
start();
})();
