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
 for(const path of ['states/','state/','election-night/','geo/counties/TX.json','geo/counties/MI.json','states/editorial.css'])await ready(path);
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const [code,expect,house] of [['TX',254,38],['MI',83,13]]){
  for(const mode of ['light','dark']){
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   await page.addInitScript(mode=>localStorage.setItem('ervin-2026-appearance',mode),mode);
   await page.goto(base+'state/?state='+code+'&release='+stamp,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(({n,h})=>document.querySelectorAll('#countyMap path.county').length===n&&document.querySelectorAll('#districtMap path.geo-district').length===h,{n:expect,h:house},{timeout:25000});
   // County geometry is loaded independently of the optional House model/poll archives.
   // Wait for both before assessing published content; DOMContentLoaded is too early.
   await page.waitForFunction(()=>document.querySelector('#districtDetail')?.textContent.includes('ERVIN HOUSE'),null,{timeout:30000});
   if(code==='TX'&&mode==='light'){
    try{
     await page.waitForFunction(()=>{
      const text=document.querySelector('#pollStatewide')?.textContent||'';
      return text.includes('Publisher averages')&&text.includes('Decision Desk HQ')&&text.includes('270toWin');
     },null,{timeout:30000});
    }catch(err){
     const diagnostics=await page.evaluate(()=>({pollText:document.querySelector('#pollStatewide')?.textContent?.slice(0,1200),mainState:document.querySelector('#stateTitle')?.textContent,warning:document.querySelector('#pollHouse')?.textContent?.slice(-300)}));
     throw Error('Texas polling publisher averages did not render after archive loading: '+JSON.stringify(diagnostics)+'; '+err.message);
    }
   }
   const status=await page.evaluate(()=>{
    const counties=[...document.querySelectorAll('#countyMap path.county')];
    return{visible:counties.filter(p=>{const r=p.getBoundingClientRect(),s=getComputedStyle(p);return r.width>.2&&r.height>.2&&s.fill!=='none';}).length,dark:document.documentElement.classList.contains('theme-dark'),text:document.body.innerText};
   });
   if(status.visible!==expect||status.dark!==(mode==='dark'))throw Error('LIVE RENDER FAILED '+code+' '+mode+' '+JSON.stringify({visible:status.visible,expected:expect,dark:status.dark}));
   if(code==='TX'&&mode==='light'&&(!status.text.includes('Publisher averages')||!status.text.includes('Decision Desk HQ')||!status.text.includes('270toWin')))throw Error('Texas publisher averages missing after archived sources loaded');
   await page.screenshot({path:'postdeploy-checks/'+code+'-'+mode+'.png',fullPage:false});
   console.log('LIVE PAGES PASS '+code+' '+mode+' counties='+status.visible+' House='+house);
   await page.close();
  }
 }
 // The State Desk is the only canonical public homepage. The root path
 // redirects here; the experimental research workbench is not linked from it.
 const rootPage=await browser.newPage();
 await rootPage.goto(base+'?release='+stamp,{waitUntil:'domcontentloaded'});
 await rootPage.waitForURL(/\/states\//,{timeout:18000});
 await rootPage.close();
 const front=await browser.newPage({viewport:{width:390,height:844}});
 await front.goto(base+'states/?release='+stamp,{waitUntil:'domcontentloaded'});
 await front.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true'&&document.querySelector('#watchCards')?.querySelectorAll('.watch-card').length>=4&&document.querySelectorAll('#usMap path.ed-state').length>=50,null,{timeout:35000});
 const frontModel=await front.evaluate(()=>{
  const balance=document.querySelector('#balanceOfPower')?.getBoundingClientRect();
  const watch=document.querySelector('#watchSection')?.getBoundingClientRect();
  const map=document.querySelector('#nationMap')?.getBoundingClientRect();
  return {watchTop:watch?.top,powerTop:balance?.top,mapTop:map?.top,
   width:watch?.width,watchCount:document.querySelectorAll('#watchCards .watch-card').length,
   finalDashboard:!!document.querySelector('#electionDashboard'),officeTabs:document.querySelectorAll('[data-atlas-office]').length,
   oldLab:!!document.querySelector('#researchLab,#advancedPollingDrawer,#forecast-settings,#races'),
   badLinks:[...document.querySelectorAll('a')].filter(a=>a.getAttribute('href')==='../').length,
   count:document.querySelectorAll('#powerCards .power-card').length,
   governors:document.querySelector('[data-power-office="governors"]')?.textContent,
   senateD:Number(document.querySelector('[data-power-office="senate"] [data-power-d]')?.textContent),
   senateR:Number(document.querySelector('[data-power-office="senate"] [data-power-r]')?.textContent),
   overflow:document.documentElement.scrollWidth>window.innerWidth+4};
 });
 if(!(frontModel.count===3&&frontModel.watchTop>=0&&frontModel.watchTop<850
  &&frontModel.watchTop<frontModel.powerTop&&frontModel.powerTop<frontModel.mapTop
  &&frontModel.width>280&&frontModel.watchCount>=4&&frontModel.finalDashboard&&frontModel.officeTabs===3
  &&!frontModel.oldLab&&!frontModel.badLinks&&!frontModel.overflow))
  throw Error('LIVE MOBILE STATE DESK HOMEPAGE INCORRECT '+JSON.stringify(frontModel));
 await front.locator('#watchSection').screenshot({path:'postdeploy-checks/State-Desk-Races-To-Watch-Mobile.png'});
 await front.locator('#balanceOfPower').screenshot({path:'postdeploy-checks/State-Desk-Office-Balance-Mobile.png'});
 console.log('LIVE STATE DESK HOMEPAGE ACCEPTANCE PASS '+JSON.stringify(frontModel));
 await front.close();
 const oh=await browser.newPage({viewport:{width:390,height:844}});
 await oh.goto(base+'state/?state=OH&release='+stamp,{waitUntil:'domcontentloaded'});
 await oh.waitForFunction(()=>/^(?:D|R) \+\d+\.\d|Even$/.test(document.querySelector('#heroGovernor')?.textContent||''),null,{timeout:35000});
 const ohModel=await oh.locator('#heroGovernor').innerText();
 const ohRaces=await oh.locator('#stateRaceCards').innerText();
 if(!ohRaces.includes(ohModel))throw Error('LIVE OHIO FORECAST HERO/CARD MISMATCH '+JSON.stringify({ohModel,ohRaces:ohRaces.slice(0,300)}));
 await oh.screenshot({path:'postdeploy-checks/Ohio-Governor-State-Desk-Mobile.png',fullPage:false});
 console.log('LIVE OHIO GOVERNOR CROSS-CHECK PASS '+ohModel);
 await oh.close();
 // A deployed model must show the evidence, not silently introduce a
 // religion- or county-demographic penalty into Michigan's Ervin's Take.
 const michiganAudit=await browser.newPage({viewport:{width:390,height:844}});
 await michiganAudit.goto(base+'state/?state=MI&release='+stamp+'#stateSources',{waitUntil:'domcontentloaded'});
 await michiganAudit.waitForFunction(()=>document.querySelector('#miCandidateEffect')?.textContent.includes('not applied'),null,{timeout:35000});
 const michiganEvidence=await michiganAudit.locator('#miCandidateEffect').innerText();
 if(!michiganEvidence.includes('In 9 matched Michigan survey samples')||!michiganEvidence.includes('not applied')||!michiganEvidence.includes('−1.84'))throw Error('LIVE MI CANDIDATE-EFFECT AUDIT MISSING '+michiganEvidence.slice(0,400));
 const liveMISenate=await michiganAudit.locator('#heroSenate').innerText();
 if(!/^(?:D|R) \+\d+\.\d|Even$/.test(liveMISenate))throw Error('LIVE MI SENATE MARGIN UNAVAILABLE');
 const cardDetails=await michiganAudit.locator('#stateRaceCards').innerText();
 if(!cardDetails.includes(liveMISenate))throw Error('LIVE MI SENATE RACE CARD NOT UPDATED');
 await michiganAudit.locator('#miCandidateEffect').screenshot({path:'postdeploy-checks/Michigan-Candidate-Effect-Evidence-Mobile.png'});
 await michiganAudit.locator('#stateOverview').screenshot({path:'postdeploy-checks/Michigan-Candidate-Strength-Model.png'});
 console.log('LIVE MI CANDIDATE-EFFECT AUDIT PASS 9 linked paired polls / no invented polling penalty');
 await michiganAudit.close();
 // Explicit acceptance of newly published national Election Night / governor model.
 const national=await browser.newPage({viewport:{width:1440,height:940}});
 await national.goto(base+'election-night/?release='+stamp,{waitUntil:'domcontentloaded'});
 await national.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83&&document.querySelector('#nationalCount')?.textContent.includes('488 indexed races'),null,{timeout:35000});
 if((await national.locator('#miD').innerText())!=='—')throw Error('Live national desk fabricated a pre-election vote total');
 if((await national.locator('#miForecast').innerText())!==liveMISenate)throw Error('LIVE ELECTION NIGHT MICHIGAN FORECAST INCORRECT');
 await national.screenshot({path:'postdeploy-checks/Election-Night-National.png',fullPage:false});
 console.log('LIVE NATIONAL NIGHT PASS 488 races / 83 Michigan counties / no premature votes');
 await national.close();
 const governor=await browser.newPage({viewport:{width:1440,height:940}});
 await governor.goto(base+'governors/?release='+stamp,{waitUntil:'domcontentloaded'});
 await governor.waitForFunction(()=>document.querySelector('#coverage')?.textContent.includes('Ervin-adjusted'),null,{timeout:25000});
 if((await governor.locator('#govCards .gov-card').count())!==36)throw Error('Not all governor Ervin projections live');
 const liveOH=governor.locator('#govCards [data-code="OH"]');
 if(!(await liveOH.innerText()).includes(ohModel))throw Error('LIVE OHIO GOVERNOR CARD DOES NOT MATCH STATE DESK '+ohModel);
 await governor.screenshot({path:'postdeploy-checks/Governor-Ervin-Live.png',fullPage:false});
 console.log('LIVE GOVERNORS PASS 36 races');
 await governor.close();
 console.log('LIVE DEPLOYMENT VISUAL ACCEPTANCE PASS '+stamp);
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();}
