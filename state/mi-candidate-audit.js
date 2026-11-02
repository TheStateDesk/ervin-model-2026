/* Optional Michigan candidate-effects evidence — independent of the source ledger.
 * Purely descriptive. Never alters Ervin's Take margins. */
(()=>{'use strict';
const mount=document.getElementById('miCandidateEffectMount');if(!mount)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>(Number(x)>=0?'+':'')+Number(x).toFixed(1);
const link=(url,label)=>/^(https:\/\/|\.\.\/)/.test(url)?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':esc(label);
let loaded=false;
async function show(){
 if(loaded)return;
 try{
  const response=await fetch('../research/michigan-candidate-effect-audit-2026-11-02.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Audit '+response.status);
  const a=await response.json(),s=a.summary;
  if(a.pairs?.length!==9||s.medianGovernorMinusSenateMargin!==2)throw Error('Invalid paired poll audit');
  let out='<article class="ed-card" id="miCandidateEffect" data-bias-study="descriptive"><div class="ed-kicker">ERVIN’S TAKE · MICHIGAN EVIDENCE AUDIT</div><h3>Does the polling conceal a candidate penalty?</h3>';
  out+='<p class="ed-mini"><strong>Candidate preference differences are measurable; a hidden polling error is not established.</strong> In '+s.pairs+' matched Michigan survey samples, Benson has the larger Democratic margin in '+s.governorLeadWider+'; El-Sayed has the larger margin in '+s.senateLeadWider+'. The median governor-minus-Senate margin is <strong>'+fmt(s.medianGovernorMinusSenateMargin)+' points</strong> (range '+fmt(s.min)+' to '+fmt(s.max)+'). These are same-sample contrasts, not a causal estimate of religion.</p>';
  out+='<p class="ed-mini"><strong>Scientific status: NOT VALIDATED.</strong> These nine matched Michigan surveys show stated candidate preferences, not hidden votes. The surveys overlap and are not independently sampled, so a nominal eight-of-nine sign test is not confirmatory. The 20% primary-to-general transfer is a discretionary Ervin’s Take sensitivity, not a fitted Bradley-effect coefficient.</p>';
  out+='<details><summary>How robust is the Michigan candidate-strength adjustment?</summary><p class="ed-mini">The RCP primary error was 9.2 points; another overlapping aggregator implies 6.4. With no additional candidate adjustment the baseline is D +1.08; with a 10% RCP transfer it is D +0.16; with 20% it is R +0.76. A transfer above 11.7% flips the winner. No independent out-of-sample transfer calibration exists. '+link('../research/CANDIDATE_STRENGTH_VALIDATION_2026.md','Scientific validation audit')+' · '+link('../research/michigan-candidate-sensitivity-2026-11-02.json','Sensitivity calculations')+'.</p></details>';
  out+='<p class="ed-mini">The differences are already present in respondents’ Senate vote-intention answers. Extra fixed live-phone, IVR, online, county demographic or ticket-drag penalties could double-count them and remain <strong>not applied</strong>. Separately, Ervin’s Take now incorporates a <strong>−1.84 D-point candidate-strength adjustment</strong> (20% of El-Sayed’s 9.2-point 2026 primary overpolling), reducing the earlier D +1.08 forecast to <strong>R +0.76</strong>. That transfer is subjective and not evidence of a hidden religion-specific polling effect. '+link('https://www.realclearpolling.com/polls/senate/democratic-primary/2026/michigan','Primary polling')+' · '+link('https://ballotpedia.org/United_States_Senate_election_in_Michigan,_2026_(August_4_Democratic_primary)','Final primary results')+'.</p>';
  out+='<details><summary>View all '+s.pairs+' paired poll samples, modes and original sources</summary><div class="ed-table-wrap"><table class="ed-table"><thead><tr><th>Same survey</th><th>Senate D−R</th><th>Governor D−R</th><th>Difference</th><th>Mode / sources</th></tr></thead><tbody>';
  out+=a.pairs.map(x=>'<tr><td>'+esc(x.pollster)+'<small>'+esc(x.fieldEnd)+'</small></td><td>'+fmt(x.senateMargin)+'</td><td>'+fmt(x.governorMargin)+'</td><td><strong>'+fmt(x.governorMinusSenateMargin)+'</strong></td><td>'+esc(x.mode)+'<div class="ed-mini">'+link(x.senateSource,'Senate source')+' · '+link(x.governorSource,'Governor source')+'</div></td></tr>').join('');
  out+='</tbody></table></div></details>';
  out+='<p class="ed-mini">MSU/IPPSR found that about 38% said a Muslim candidate would make them less likely to vote for that candidate; that is a <em>stated</em> attitude, not evidence of a hidden voting preference. '+link(a.surveyAttitudes.source,'Read Michigan survey research')+'.</p>';
  out+='<details><summary>Historical counterexamples and research limitations</summary><p class="ed-mini">In 2018, El-Sayed won 30.5% in the Michigan Democratic governor primary versus a June–July average of 17.5%. In 2026, his Senate primary margin over Stevens was +1.0 versus a preceding +10.2 polling average. Opposite directions and unmatched dates/contests make these poor estimates of a general-election religious polling effect.</p>';
  out+=a.history.map(x=>'<p class="ed-mini">'+link(x.source,x.year+' Michigan primary')+': '+esc(x.caveat)+'</p>').join('');
  out+=a.research.map(x=>'<p class="ed-mini">'+link(x.url,x.title)+': '+esc(x.finding)+'</p>').join('');
  out+='</details><p class="ed-mini">A real test of concealed support requires poll-mode prediction errors against <strong>certified November 3 results</strong>, not simply a gap between two different candidates before voting. '+link('../research/michigan-candidate-effect-audit-2026-11-02.json','Download the complete source ledger (JSON)')+'</p></article>';
  mount.innerHTML=out;loaded=true;mount.dataset.biasReady='true';
 }catch(error){console.error('Michigan candidate-effect audit',error);mount.innerHTML='<p class="ed-notice">Candidate-effect research temporarily unavailable. See the linked source ledger.</p>';}
}
function select(code){const yes=(code||'MI').toUpperCase()==='MI';mount.hidden=!yes;if(yes)show();}
window.addEventListener('ervin:state-edition',e=>select(e.detail?.code));
select(new URLSearchParams(location.search).get('state')||'MI');
})();
