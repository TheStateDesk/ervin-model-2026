"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.join(__dirname,"..");
const context={window:{},console,Date,Math};
vm.runInNewContext(fs.readFileSync(path.join(root,"counties-watch/metrics.js"),"utf8"),context);
const M=context.window.ERVIN_WATCH_METRICS;
assert(M&&typeof M.county==="function"&&typeof M.outstandingTarget==="function");
const historical=JSON.parse(fs.readFileSync(path.join(root,"counties-watch/history.json"),"utf8"));
const forecast=JSON.parse(fs.readFileSync(path.join(root,"counties-watch/forecast-baselines.json"),"utf8"));
assert.strictEqual(Object.keys(historical.states).length,17);
assert.strictEqual(Object.keys(forecast.states).length,17);
let checked=0;
for(const [code,state] of Object.entries(historical.states)){
 const f=forecast.states[code];assert(f&&Number.isFinite(f.adjustedMargin)&&f.nonR&&f.rep);
 const statewide=M.state(state,f,.8);
 assert(statewide.total>0&&statewide.modelNonR!=null&&Math.abs((statewide.modelNonR+statewide.modelR)-statewide.total)<2);
 assert(Math.abs(statewide.modelShare-(.5+f.adjustedMargin/200))<1e-6||Math.abs(f.adjustedMargin)>98);
 assert.strictEqual(state.units.length,10);
 for(const unit of state.units){
  const c=M.county(unit,state,f,.8);
  assert(c&&c.model&&c.tie&&c.total>0);
  assert(c.model.nonRVotes+c.model.repVotes===c.total);
  assert(c.tie.nonRVotes+c.tie.repVotes===c.total);
  const p65=M.county(unit,state,f,.65),p100=M.county(unit,state,f,1);
  assert(p65.total<p100.total,"Turnout should scale vote targets");
  assert(Math.abs(c.model.share-c.tie.share-f.adjustedMargin/200)<1e-6||c.model.share===.01||c.model.share===.99||c.tie.share===.01||c.tie.share===.99);
  const valid={dem:100,rep:90,other:2,reportingStatus:"complete"};
  const complete=M.countyPace(unit,valid,state,f,.8);
  assert.strictEqual(complete.status,"complete");
  assert(Number.isFinite(complete.offsetModelVotes));
  assert.strictEqual(complete.reported,190);
  const partial=M.countyPace(unit,{...valid,reportingStatus:"partial"},state,f,.8);
  assert.strictEqual(partial.status,"partial");
  assert.strictEqual(partial.offsetModelVotes,null);
  checked++;
 }
}
assert.strictEqual(checked,170);
const x=M.outstandingTarget(400,500,2000);
assert.strictEqual(x.remaining,1100);
assert.strictEqual(x.required,601);
assert(x.share>.54&&x.share<.55);
const y=M.outstandingTarget(1900,100,1500);
assert.strictEqual(y.remaining,0);
const bad=M.outstandingTarget(-1,100,800);
assert.strictEqual(bad,null);
console.log("PASS: "+checked+" counties, 17 states, turnout sensitivity, complete-only pace and statewide outstanding vote thresholds.");
