#!/usr/bin/env node
// Post-deployment browser acceptance. Runs against GitHub Pages, not the source checkout.
import {chromium} from 'playwright';
import fs from 'node:fs';
const base='https://geervin.github.io/ervin-model-2026/';
const stamp=process.env.GITHUB_SHA||Date.now().toString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(path){
 let last;
 for(let i=0;i<12;i++){
  try{const r=await fetch(base+path+(path.includes('?')?'&':'?')+'release='+stamp,{cache:'no-store'});if(r.ok)return r;last='HTTP '+r.status;}catch(e){last=e.message}
  await sleep(5000);
 }
 throw Error('Published asset missing '+path+' : '+last);
}
let browser;
try{
 fs.mkdirSync('postdeploy-checks',{recursive:true});
 for(const path of ['states/','state/','geo/counties/TX.json','geo/counties/MI.json','states/editorial.css'])await ready(path);
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const [code,expect,house] of [['TX',254,38],['MI',83,13]]){
  for(const mode of ['light','dark']){
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   await page.addInitScript(mode=>localStorage.setItem('ervin-2026-appearance',mode),mode);
   await page.goto(base+'state/?state='+code+'&release='+stamp,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(({n,h})=>document.querySelectorAll('#countyMap path.county').length===n&&document.querySelectorAll('#districtMap path.geo-district').length===h,{n:expect,h:house},{timeout:25000});
   const status=await page.evaluate(()=>{
    const counties=[...document.querySelectorAll('#countyMap path.county')];
    return{visible:counties.filter(p=>{const r=p.getBoundingClientRect(),s=getComputedStyle(p);return r.width>.2&&r.height>.2&&s.fill!=='none';}).length,dark:document.documentElement.classList.contains('theme-dark'),text:document.body.innerText};
   });
   if(status.visible!==expect||status.dark!==(mode==='dark'))throw Error('LIVE RENDER FAILED '+code+' '+mode+' '+JSON.stringify({visible:status.visible,expected:expect,dark:status.dark}));
   if(code==='TX'&&mode==='light'&&(!status.text.includes('Publisher averages')||!status.text.includes('Decision Desk HQ')))throw Error('Texas publisher averages missing on LIVE page');
   await page.screenshot({path:'postdeploy-checks/'+code+'-'+mode+'.png',fullPage:false});
   console.log('LIVE PAGES PASS '+code+' '+mode+' counties='+status.visible+' House='+house);
   await page.close();
  }
 }
 console.log('LIVE DEPLOYMENT VISUAL ACCEPTANCE PASS '+stamp);
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();}
