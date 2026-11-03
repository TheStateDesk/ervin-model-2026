/* Public homepage: a standalone Senate-majority outlook.
 * Uses archived 17-state Ervin's Take margins and the existing 14,000-draw
 * shared-swing simulator. Keeps reported election-night votes strictly separate.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const siteRoot=new URL('../',document.currentScript?.src||new URL('../scripts/home-control.js',location.href));
const read=async path=>{const raw=async()=>{const r=await fetch(new URL(path,siteRoot),{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()};return window.ERVIN_FINAL?window.ERVIN_FINAL.get(path,raw):raw()};
const pct=n=>Math.round(n*100)+'%';
let baseline=null, historical=null, last=null;
const stateCodes=['ME','MI','OH','TX','IA','KS','MN','AK','GA','NC','NH','NE','SC','MS','FL','SD','MT'];
function render(){
 const root=$('senate-control'),status=$('controlStatus');
 if(!root||!baseline)return;
 if(!window.ERVIN_SENATE_CONTROL?.project){status.textContent='Simulation unavailable; see the published state forecasts.';return}
 const u=Number($('controlUncertainty').value);
 const error=Number(historical?.senate?.raw?.rmse);
 const sigma=Number.isFinite(error)&&error>0?Math.max(5.2,error):5.2;
 const entries=stateCodes.map(code=>{
  const r=baseline.states?.[code];if(!r||!Number.isFinite(r.adjustedMargin))throw Error('Missing 2026 Senate forecast: '+code);
  return {code,margin:r.adjustedMargin,sigma};
 });
 const result=window.ERVIN_SENATE_CONTROL.project(entries,{trials:14000,commonSigma:2.8,uncertaintyMultiplier:u});
 if(!Number.isFinite(result.partyD)||Math.abs(result.partyD+result.partyR+result.uncertain-1)>1e-6)throw Error('Senate control probability sum failed');
 last=result;
 $('controlDemChance').textContent=pct(result.partyD);
 $('controlRepChance').textContent=pct(result.partyR);
 $('controlUnknownChance').textContent=pct(result.uncertain);
 $('controlDemSeats').textContent=result.demSeats.toFixed(1);
 $('controlRepSeats').textContent=result.repSeats.toFixed(1);
 $('controlDemBar').style.width=(result.partyD*100)+'%';
 $('controlRepBar').style.width=(result.partyR*100)+'%';
 $('controlUnknownBar').style.width=(result.uncertain*100)+'%';
 $('controlBar').setAttribute('aria-label','D-aligned control '+pct(result.partyD)+', Republican control '+pct(result.partyR)+', unresolved '+pct(result.uncertain));
 $('controlRange').textContent='Illustrative 10th–90th percentile seats: D-aligned '+result.demRange.join('–')+' · Republican '+result.repRange.join('–');
 status.textContent='14,000 illustrative simulations · 17 tracked states · '+(historical?'historic error sample used':'conservative uncertainty floor used')+' · unmodeled Senate seats assumed unchanged; independent caucus choices may be unresolved';
}
async function start(){
 try{
  [baseline,historical]=await Promise.all([read('counties-watch/forecast-baselines.json'),read('research/election-night-historical-moe-2026.json').catch(()=>null)]);
  if(!baseline?.states||Object.keys(baseline.states).length!==17)throw Error('Unexpected 17-state Senate snapshot');
  $('controlUncertainty').addEventListener('change',render);
  render();
 }catch(e){
  console.error('Senate control unavailable:',e);
  $('controlStatus').textContent='Senate control simulation unavailable. Individual state forecasts remain available below.';
  $('controlDemChance').textContent='—';$('controlRepChance').textContent='—';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();