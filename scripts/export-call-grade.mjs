#!/usr/bin/env node
/* Deterministic, offline export: never merges sourced calls with forecasts and never invents margins. */
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const a=read('final/forecast-final.json'),c=read('election-night/ap-calls.json'),d=a.data;
const house=d['house/ervin-forecast-2026-11-02.json'].races;
const senate=d['counties-watch/forecast-baselines.json'].states;
const gov=d['governors/data.json'].races;
const records=[];
const validURL=x=>typeof x==='string'&&x.startsWith('https://')?x:null;
function add(office,id,raw,adjusted,source,modelCandidate,modelParty){
const call=c.calls[id]||null;
const hasCall=!!(call&&['D','R','I'].includes(call.party)&&typeof call.winner==='string'&&validURL(call.sourceUrl));
const pred=office==='Governor'?null:Number.isFinite(adjusted)?adjusted>0?(modelParty==='I'?'I':'D'):'R':null;
const eligible=hasCall&&['D','R'].includes(pred)&&['D','R'].includes(call.party)&&
 (office==='House'||office==='Senate'&&modelParty==='D');
const status=eligible?'compared-party-direction':hasCall?'called-not-comparable':'no-attributed-call-in-local-ledger';
records.push({office,race_id:id,locked_poll_margin_d:Number.isFinite(raw)?raw:null,locked_model_margin_d:Number.isFinite(adjusted)?adjusted:null,projected_party:pred,called_party:hasCall?call.party:null,called_candidate:hasCall?call.winner:null,call_source_url:hasCall?call.sourceUrl:null,forecast_source_url:source||null,model_candidate:modelCandidate||null,status,party_direction_agrees:eligible?pred===call.party:null,margin_error:null,certified_results:false});
}
for(const [id,h] of Object.entries(house))add('House',id,null,h.marginD,h.presidentialBaseline?.sourceUrl||null,null,'D');
for(const [code,s] of Object.entries(senate))add('Senate',code+'-SENATE',s.pollMargin,s.adjustedMargin,validURL(s.source)?s.source:null,s.nonR,s.party);
for(const g of gov)add('Governor',g.code+'-GOVERNOR',g.poll?.margin,null,g.poll?.url,g.dem,'D');
records.sort((a,b)=>a.office.localeCompare(b.office)||a.race_id.localeCompare(b.race_id));
const summary={};
for(const office of ['House','Senate','Governor']){
 const rows=records.filter(r=>r.office===office);
 summary[office]={forecast_records:rows.length,comparable:rows.filter(r=>r.status==='compared-party-direction').length,agreed:rows.filter(r=>r.party_direction_agrees===true).length,disagreed:rows.filter(r=>r.party_direction_agrees===false).length,called_without_comparable:rows.filter(r=>r.status==='called-not-comparable').length,without_recorded_call:rows.filter(r=>r.status==='no-attributed-call-in-local-ledger').length};
}
const filename='analysis/forecast-coverage/data.json';
const previous=read(filename);
const payload={...previous,forecast_locked_at:a.lockedAt,call_ledger_count:Object.keys(c.calls).length,summary,records};
fs.writeFileSync(filename,JSON.stringify(payload,null,2)+'\n');
const cols=['office','race_id','locked_poll_margin_d','locked_model_margin_d','projected_party','called_party','called_candidate','call_source_url','forecast_source_url','model_candidate','status','party_direction_agrees','margin_error','certified_results'];
const q=s=>s===null||s===undefined?'':'"'+String(s).replaceAll('"','""')+'"';
fs.writeFileSync('analysis/forecast-coverage/scorecard.csv',[cols.join(','),...records.map(r=>cols.map(k=>q(r[k])).join(','))].join('\n')+'\n');
console.log('Exported '+records.length+' forecast rows; '+Object.keys(c.calls).length+' sourced calls. This does not create certified margins or calls.');