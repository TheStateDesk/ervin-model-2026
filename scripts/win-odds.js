/* Transparently illustrative win shares, not backtested or calibrated probabilities.
 * Normal error centered on each current D-R forecast. An explicit wider
 * uncertainty floor guards sparse governor and poll-only cases. */
(function(root){'use strict';
function cdf(z){
 const x=Math.abs(z)/Math.SQRT2,t=1/(1+.3275911*x);
 const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);
 return .5*(1+(z<0?-erf:erf));
}
function estimate(margin,office,meta={}){
 if(typeof margin!=='number'||!Number.isFinite(margin))return null;
 const sen=office==='Senate',history=Number(meta.cycles)||0;
 // 2018-24 Senate holdout adjusted RMSE 5.56, governor same-office
 // historical holdout adjusted RMSE 5.65 (n=15); floors wider.
 const sigma=sen?Math.max(6.5,Number(meta.sigma)||0):history>=3?7:history>=1?8.2:9.8;
 const dem=Math.max(.001,Math.min(.999,cdf(margin/sigma)));
 return {dem,rep:1-dem,sigma,margin,conditional:true,
  explanation:'Illustrative normal-error scenario with '+sigma.toFixed(1)+'-point D–R margin uncertainty; not an empirically calibrated 2026 win probability.'};
}
const pct=p=>p===null||!Number.isFinite(p)?'—':p<.01?'<1%':p>.99?'>99%':Math.round(100*p)+'%';
const api={estimate,pct,cdf};
if(typeof module==='object'&&module.exports)module.exports=api;
root.ERVIN_ODDS=api;
})(typeof window!=='undefined'?window:globalThis);
