#!/usr/bin/env node
// Non-gating live-site diagnostic: shows whether the current Pages publication contains local geography.
import {chromium} from 'playwright';
import fs from 'node:fs';
const root='https://thestatedesk.github.io/';
const files=['','states/','state/?state=TX','state/?state=MI','geo/counties/TX.json','geo/counties/MI.json','geo/districts/TX.json','scripts/geo-engine.js','states/editorial.css'];
const results={checkedAt:new Date().toISOString(),root,paths:[],browser:[]};
for(const path of files)try{
 const r=await fetch(root+path,{signal:AbortSignal.timeout(18000)});
 results.paths.push({path,status:r.status,contentType:r.headers.get('content-type'),size:(await r.text()).length});
}catch(e){results.paths.push({path,error:e.message});}
let b;
try{
 b=await chromium.launch({headless:true});
 for(const code of ['TX','MI']){
  const p=await b.newPage({viewport:{width:1440,height:950}});
  const errors=[],failed=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('response',r=>{if(r.status()>=400&&/thestatedesk.github.io/.test(r.url()))failed.push({status:r.status(),url:r.url()});});
  const nav=await p.goto(root+'state/?state='+code,{waitUntil:'domcontentloaded',timeout:24000}).catch(e=>({error:e.message}));
  await p.waitForTimeout(6000);
  const details=await p.evaluate(()=>{
   const el=document.querySelector('#countyMap'),house=document.querySelector('#districtMap');
   return{countyPathCount:el?.querySelectorAll('path.county').length||0,housePathCount:house?.querySelectorAll('path.geo-district').length||0,countyStatus:document.querySelector('#countyStatus')?.textContent||null,documentTitle:document.title};
  });
  results.browser.push({code,httpStatus:nav.status?.()||nav.error,...details,errors,failed});
  fs.mkdirSync('visual-checks',{recursive:true});
  await p.screenshot({path:'visual-checks/live-'+code+'.png',fullPage:false});
  await p.close();
 }
}catch(e){results.browser.push({error:String(e)});}finally{await b?.close()}
fs.mkdirSync('visual-checks',{recursive:true});
fs.writeFileSync('visual-checks/live-site-audit.json',JSON.stringify(results,null,2));
console.log('CURRENT PUBLISHED SITE AUDIT',JSON.stringify(results));
