/* Optional Michigan candidate-effects evidence — independent of the source ledger.
 * Purely descriptive. Never alters Ervin's Take margins. */
(()=>{'use strict';
const mount=document.getElementById('miCandidateEffectMount');if(!mount)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>(Number(x)>=0?'+':'')+Number(x).toFixed(1);
const link=(url,label)=>/^https:\/\//.test(url)?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':esc(label);
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
  out+='<p class="ed-mini">The differences are already present in respondents’ Senate vote-intention answers. An extra fixed live-phone, IVR, online, county demographic or ticket-drag correction could double-count them. Those proposed numerical penalties are <strong>not applied</strong> to the existing Ervin’s Take margin, which retains the state’s historical Senate polling-error correction.</p>';
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
