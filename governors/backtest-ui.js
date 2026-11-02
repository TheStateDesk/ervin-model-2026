(()=>{'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const margin=n=>!Number.isFinite(n)?'—':Math.abs(n)<.05?'Even':(n>0?'D +':'R +')+Math.abs(n).toFixed(1);
fetch('../research/governor-same-office-backtest-2026-11-02.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
 const n=d.summary,s=d.preferredRCP;if(!n||!s)throw Error('Missing governor-only scorecard');
 $('govBacktestN').textContent=n.n+' / '+n.observed+' historical races';
 $('govBacktestRaw').textContent=n.rawMAE.toFixed(2)+' pts';
 $('govBacktestAdjusted').textContent=n.adjustedMAE.toFixed(2)+' pts';
 $('govBacktestWinners').textContent=n.rawWinners+' / '+n.adjustedWinners;
 $('govBacktestVerdict').innerHTML='<strong>Governor-to-governor only: the correction '+(n.adjustedMAE>n.rawMAE?'increased':'reduced')+' the average error.</strong> On '+n.n+' strictly past-only matched races, published raw governor polls missed by '+n.rawMAE.toFixed(2)+' points; adjusting using ONLY that same state’s previous governor elections missed by '+n.adjustedMAE.toFixed(2)+'. On the '+s.n+' RCP-aggregate-only target races: '+s.rawMAE.toFixed(2)+' raw versus '+s.adjustedMAE.toFixed(2)+' adjusted points. '+(n.observed-n.n)+' archival years cannot enter the holdout because no comparable PREVIOUS governor error was available or the poll was too stale. Races use 2014, 2018, 2022, never federal elections. A negative result is still reported.';
 $('govBacktestRows').innerHTML=(d.records||[]).map(r=>{
 const results='<a href="'+esc(r.resultUrl||r.sourceUrl)+'" target="_blank" rel="noopener noreferrer" title="Original reported result">result</a>';
 const poll='<a href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(r.state)+' '+r.year+'</a>';
 return '<tr><td>'+poll+'<small style="display:block">'+esc(r.pollType)+' · '+results+'</small></td><td>'+esc(margin(r.pollMargin))+'</td><td>'+esc(margin(r.actualMargin))+'</td><td>'+(r.correction===null?'Not testable':(r.correction>=0?'+':'')+r.correction.toFixed(2)+'<small style="display:block">'+r.evidence.map(h=>'<a href="'+esc(h.url)+'" target="_blank" rel="noopener noreferrer">'+h.year+'</a>').join(', ')+'</small>')+'</td><td>'+r.rawAbsError.toFixed(2)+'</td><td>'+(r.adjustedAbsError===null?'—':r.adjustedAbsError.toFixed(2))+'</td></tr>';
 }).join('');
}).catch(e=>{$('govBacktestVerdict').textContent='Unable to load sourced governor-only backtest: '+e.message;console.error(e)});
})();