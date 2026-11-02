(()=>{'use strict';const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const m=n=>!Number.isFinite(n)?'not scoreable':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
fetch('../research/governor-backtest-scorecard-2026-11-02.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
 const n=d.summary; if(!n)throw Error('Missing backtest scores');
 $('govBacktestN').textContent=n.n+' / '+d.summary.observed;
 $('govBacktestRaw').textContent=n.rawMAE.toFixed(2)+' pts';
 $('govBacktestAdjusted').textContent=n.adjustedMAE.toFixed(2)+' pts';
 $('govBacktestWinners').textContent=n.rawWinners+' / '+n.adjustedWinners;
 const worse=n.adjustedMAE>n.rawMAE;
 $('govBacktestVerdict').innerHTML='<strong>'+(worse?'The historical adjustment worsened the results in this test.':'The correction improved average error in this limited test.')+'</strong> The raw polls were '+n.rawMAE.toFixed(2)+' points off, compared with '+n.adjustedMAE.toFixed(2)+' after correction; '+d.summary.notBacktestable+' historic race lacked earlier state evidence. Both statistics use the same '+n.n+' eligible races. No winner probabilities were calibrated.';
 $('govBacktestRows').innerHTML=(d.records||[]).map(r=>'<tr><td><a href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(r.state)+' '+r.year+'</a><small> '+(r.pollType==='RCP final average'?'RCP':'single survey')+'</small></td><td>'+esc(m(r.pollMargin))+'</td><td>'+esc(m(r.actualMargin))+'</td><td>'+esc(r.correction===null?'No past records':(r.correction>0?'+':'')+r.correction.toFixed(2))+'</td><td>'+r.rawAbsError.toFixed(2)+'</td><td>'+(r.adjustedAbsError===null?'—':r.adjustedAbsError.toFixed(2))+'</td></tr>').join('');
}).catch(e=>{$('govBacktestVerdict').textContent='Sourced backtest temporarily unavailable: '+e.message;console.error(e)});
})();