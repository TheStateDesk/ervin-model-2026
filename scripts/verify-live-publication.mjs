#!/usr/bin/env node
// Post-deployment browser acceptance. Runs against GitHub Pages, not the source checkout.
import {chromium} from 'playwright';
import fs from 'node:fs';
const base='https://geervin.github.io/ervin-model-2026/';
const stamp=process.env.ERVIN_VERIFY_EXPECTED_BUILD||process.env.GITHUB_SHA||Date.now().toString();
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
   await page.waitForFunction(expectedState=>{
    const txt=document.querySelector('#districtDetail')?.textContent||'';
    return expectedState==='TX'
      ?txt.includes('ERVIN HOUSE · 2026 DISTRICT MODEL')&&txt.includes('Redrawn district:')
      :txt.includes('ERVIN HOUSE');
   },code,{timeout:30000});
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
 await front.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 const frontJsErrors=[],frontRequestFailures=[];
 front.on('pageerror',e=>frontJsErrors.push(e.message));
 front.on('requestfailed',r=>{if(/\/geo\/districts\/|\/scripts\/election-day-desk/.test(r.url()))frontRequestFailures.push({url:r.url(),reason:r.failure()?.errorText});});
 await front.goto(base+'states/?release='+stamp,{waitUntil:'domcontentloaded'});
 await front.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true'&&document.querySelector('#watchCards')?.querySelectorAll('.watch-card').length>=4&&document.querySelectorAll('#usMap path.ed-state').length>=50&&document.querySelector('#edFinalHeadline')?.textContent.includes('PREDICTION'),null,{timeout:35000});
 try{
  await front.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:85000});
 }catch(error){
  const status=await front.evaluate(()=>({
   url:location.href,meta:document.querySelector('meta[name="ervin-deploy"]')?.content,
   headline:document.querySelector('#edFinalHeadline')?.textContent,
   tabs:[...document.querySelectorAll('#edSimTabs button')].map(x=>x.textContent),
   mapOffice:document.querySelector('#edSimMap')?.dataset.simOffice,
   mapText:document.querySelector('#edSimMap')?.textContent?.slice(0,300),
   mapDetail:document.querySelector('#edSimMapReadout')?.textContent?.slice(0,1400),
   mapNote:document.querySelector('#edSimMapNote')?.textContent?.slice(0,500),
   finalTally:document.querySelector('#edFinalCallSummary')?.textContent?.slice(0,500),
   houseRows:window.ERVIN_HOME_FORECAST?.house?.length,
   forecastReady:!!window.ERVIN_HOME_FORECAST,
   districtPaths:document.querySelectorAll('#edSimMap [data-sim-district]').length,
   fileRequests:performance.getEntriesByType('resource').filter(x=>x.name.includes('/geo/districts/')).length
  }));
  throw Error('LIVE FINAL PREDICTION HOUSE GEOMETRY LOAD FAILURE '+JSON.stringify({status,frontJsErrors,frontRequestFailures:frontRequestFailures.slice(0,16)})+'; '+error.message);
 }
 try{
  await front.waitForFunction(expected=>document.querySelector('meta[name="ervin-deploy"]')?.content===expected,stamp,{timeout:20000});
 }catch(err){
  const diag=await front.evaluate(()=>({
   meta:document.querySelector('meta[name="ervin-deploy"]')?.content,
   build:document.querySelector('#publicBuildLabel')?.textContent?.trim(),
   title:document.title,
   version:document.querySelector('h1.ed-headline')?.textContent,
   selectors:[...document.querySelectorAll('[data-national-atlas-view]')].map(e=>e.dataset.nationalAtlasView),
   atlas:!!document.querySelector('#allCountyNation'),
   href:location.href,
   htmlLength:document.documentElement.outerHTML.length
  }));
  throw Error('LIVE BUILD MARKER MISMATCH before county atlas, expected '+stamp+' got '+JSON.stringify(diag));
 }
 const frontModel=await front.evaluate(()=>{
  const balance=document.querySelector('#balanceOfPower')?.getBoundingClientRect();
  const watch=document.querySelector('#watchSection')?.getBoundingClientRect();
  const map=document.querySelector('#nationMap')?.getBoundingClientRect();
  const lead=document.querySelector('#edSimulationPanel')?.getBoundingClientRect();
  const byline=document.querySelector('.ed-byline')?.getBoundingClientRect();
  return {watchTop:watch?.top,powerTop:balance?.top,mapTop:map?.top,simTop:lead?.top,bylineBottom:byline?.bottom,simMapCount:document.querySelectorAll('#edSimMap path.ed-sim-proj-district').length,retiredScenarios:!!document.querySelector('#edSimulationPanel .ed-final-distribution')||document.querySelector('#edSimulationPanel')?.textContent?.includes('144,000'),heroTitle:document.querySelector('#edFinalHeadline')?.textContent?.replace(/\s+/g,' ').trim(),nightActive:!!document.querySelector('#edResultsStage')&&!document.querySelector('#edResultsStage').hidden,
   width:watch?.width,watchCount:document.querySelectorAll('#watchCards .watch-card').length,
   finalDashboard:!!document.querySelector('#electionDashboard'),officeTabs:document.querySelectorAll('[data-map-office]').length,
   countyViewTabs:document.querySelectorAll('[data-national-county-view]').length,
   duplicateCountyMaps:document.querySelectorAll('#electionNationalMap,#electionLocalMap').length,
   oldLab:!!document.querySelector('#researchLab,#advancedPollingDrawer,#forecast-settings,#races'),
   badLinks:[...document.querySelectorAll('a')].filter(a=>a.getAttribute('href')==='../').length,
   count:document.querySelectorAll('#powerCards .power-card').length,
   governors:document.querySelector('[data-power-office="governors"]')?.textContent,
   senateD:Number(document.querySelector('[data-power-office="senate"] [data-power-d]')?.textContent),
   senateR:Number(document.querySelector('[data-power-office="senate"] [data-power-r]')?.textContent),
   overflow:document.documentElement.scrollWidth>window.innerWidth+4,
   deployedRevision:document.querySelector('meta[name="ervin-deploy"]')?.content,
   visibleBuild:document.querySelector('#publicBuildLabel')?.textContent?.trim(),
   stateMapOfficeTabs:document.querySelectorAll('[data-map-office]').length,
   nationalCountyTabs:document.querySelectorAll('[data-national-county-office]').length,
   mobileStateLinks:document.querySelectorAll('#mobileTileMap a').length,
   stampedStyles:[...document.querySelectorAll('link[rel="stylesheet"]')].filter(e=>e.getAttribute('href')?.includes('build=')).length,
   stampedScripts:[...document.querySelectorAll('script[src]')].filter(e=>e.getAttribute('src')?.includes('build=')).length};
 });
 const orderValid=frontModel.nightActive?(frontModel.mapTop<frontModel.watchTop&&frontModel.watchTop<frontModel.powerTop):
  (frontModel.simTop<frontModel.watchTop&&frontModel.watchTop<frontModel.powerTop&&frontModel.powerTop<frontModel.mapTop);
 if(!(frontModel.count===3&&frontModel.watchTop>=0&&frontModel.simTop>=frontModel.bylineBottom-2&&frontModel.simTop<frontModel.watchTop&&frontModel.simMapCount===435&&!frontModel.retiredScenarios&&frontModel.heroTitle?.includes('FINAL')&&frontModel.heroTitle?.includes('PREDICTION')&&orderValid
  &&frontModel.width>280&&frontModel.watchCount>=4&&frontModel.finalDashboard&&frontModel.officeTabs===3
  &&!frontModel.oldLab&&!frontModel.badLinks&&!frontModel.overflow
  &&frontModel.deployedRevision===stamp&&frontModel.visibleBuild?.includes(stamp.slice(0,8))
  &&frontModel.stateMapOfficeTabs===3&&frontModel.nationalCountyTabs===2&&frontModel.countyViewTabs===3&&frontModel.duplicateCountyMaps===0&&frontModel.mobileStateLinks===50
  &&frontModel.stampedStyles>=3&&frontModel.stampedScripts>=8))
  throw Error('LIVE MOBILE STATE DESK HOMEPAGE INCORRECT '+JSON.stringify(frontModel));
 for(const [office,label,coverage] of [['house','House',435],['senateD','Senate',17],['governorsD','Governors',36]]){
  await front.locator('#edSimTabs button').filter({hasText:label}).click();
  await front.waitForFunction(office=>document.querySelector('#edSimMap')?.dataset.simOffice===office,office,{timeout:65000});
  const selector=office==='house'?'#edSimMap path.ed-sim-proj-district':'#edSimMap path.ed-sim-proj-state';
  const nonNeutral=await front.locator(selector+':not(.ed-sim-proj-N)').count();
  const total=await front.locator(selector).count();
  if(nonNeutral!==coverage||total!==(office==='house'?435:50))throw Error('PUBLIC FINAL PREDICTION MAP CALLS INCORRECT '+JSON.stringify({office,coverage,nonNeutral,total}));
  if((await front.locator('#edSimMap path.ed-sim-proj-T').count())!==0)throw Error('PUBLIC FINAL MAP MUST NOT SHOW TOSS-UP SHADING');
  if(office!=='house'){
   const insets=await front.evaluate(()=>['AK','HI'].map((code,i)=>{
    const path=document.querySelector('#edSimMap g[data-sim-inset="'+code+'"] path');
    const group=path?.parentElement?.parentElement;
    const border=document.querySelectorAll('#edSimMap .ed-sim-map-insets rect')[i];
    const p=path?.getBoundingClientRect(),b=border?.getBoundingClientRect();
    return {code,moved:group?.getAttribute('transform')?.startsWith('translate('),inFrame:!!(p&&b&&p.width>10&&p.height>8&&p.left>=b.left-2&&p.right<=b.right+2&&p.top>=b.top-2&&p.bottom<=b.bottom+2)};
   }));
   if(insets.some(x=>!x.moved||!x.inFrame))throw Error('PUBLIC '+label+' ALASKA/HAWAII INSET ALIGNMENT FAILED '+JSON.stringify(insets));
  }

  await front.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/FINAL-PREDICTION-'+label+'-Mobile.png'});
 }
 await front.locator('#watchSection').screenshot({path:'postdeploy-checks/State-Desk-Races-To-Watch-Mobile.png'});
 await front.locator('#balanceOfPower').screenshot({path:'postdeploy-checks/State-Desk-Office-Balance-Mobile.png'});
 console.log('LIVE STATE DESK HOMEPAGE ACCEPTANCE PASS '+JSON.stringify(frontModel));
 await front.close();

 // Independently verify the real deployed live feature with a controlled
 // pre-poll-close clock, ensuring no votes can appear by accident.
 const liveHero=await browser.newPage({viewport:{width:390,height:844}});
 const liveErrors=[];liveHero.on('pageerror',e=>liveErrors.push(e.message));
 await liveHero.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 await liveHero.goto(base+'states/?preview=closing&release='+stamp,{waitUntil:'domcontentloaded'});
 await liveHero.waitForFunction(()=>document.querySelector('#edSimulationPanel')?.dataset.coverageMode==='live'&&
  document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true'&&
  document.querySelector('#edFinalHeadline')?.textContent.includes('COVERAGE')&&
  document.querySelector('#edLiveCommentary')?.hidden===false&&
  document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:85000});
 if(await liveHero.locator('#edResultsStage').count())throw Error('PUBLIC LIVE HOMEPAGE HAS DUPLICATE RESULTS STAGE');
 if((await liveHero.locator('#edSimMap path.ed-live-lead-N').count())!==435)throw Error('PUBLIC LIVE HOUSE MAP SHOWS UNSOURCED RETURNS OR OLD FORECAST');
 const houseLink=await liveHero.locator('#edSimMap a[data-sim-district="MI-09"]').getAttribute('href');
 if(!houseLink?.includes('/election-night/?state=MI&race=MI-09#nationalBoard'))throw Error('PUBLIC MI-09 LINK INVALID '+houseLink);
 if((await liveHero.locator('#edCommentaryEntries .ed-commentary-item').count())!==1)throw Error('PUBLIC COMMENTARY INVENTED UNSOURCED REPORTS');
 for(const [label,office,race] of [['Senate','senateD','MI-SENATE'],['Governors','governorsD','MI-GOVERNOR']]){
  await liveHero.locator('#edSimTabs button').filter({hasText:label}).click();
  await liveHero.waitForFunction(o=>document.querySelector('#edSimMap')?.dataset.simOffice===o&&document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',office,{timeout:30000});
  if((await liveHero.locator('#edSimMap path.ed-live-lead-N').count())!==50)throw Error('PUBLIC '+label+' LIVE MAP SHOWS UNVALIDATED COUNTS');
  const href=await liveHero.locator('#edSimMap a[data-sim-state="MI"]').getAttribute('href');
  if(!href?.includes('race='+race))throw Error('PUBLIC '+label+' MUST LINK TO PRECISE RACE '+href);
  if(office==='senateD'&&!((await liveHero.locator('#edSimMap a[data-sim-state="CO"]').getAttribute('href'))||'').includes('race=CO-SENATE'))throw Error('PUBLIC SENATE MAP MISSING UNMODELED CO RACE LINK');
 }
 if((await liveHero.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth))>5)throw Error('PUBLIC LIVE MOBILE OVERFLOW');
 await liveHero.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/LIVE-5-55-Mobile.png'});
 await liveHero.setViewportSize({width:1440,height:940});
 await liveHero.locator('#edSimTabs button').filter({hasText:'House'}).click();
 await liveHero.waitForFunction(()=>document.querySelector('#edSimMap')?.dataset.simOffice==='house'&&document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',null,{timeout:30000});
 await liveHero.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/LIVE-5-55-Desktop.png'});
 if(liveErrors.length)throw Error('PUBLIC LIVE COVERAGE JS ERRORS '+liveErrors.join(' | '));
 console.log('PUBLIC 5:55 LIVE COVERAGE ACCEPTANCE PASS · 435 race links · no fake votes · commentary');
 await liveHero.close();

 // Independently verify that REAL published CivicAPI votes—not a mock and
 // not the pre-close fixture—flow through the real live homepage. This
 // pass condition is conditional on the public snapshot having accepted
 // votes: early deployments with zero verified reports remain valid.
 const actualVotes=await browser.newPage({viewport:{width:1440,height:900}});
 const voteErrors=[];actualVotes.on('pageerror',e=>voteErrors.push(e.message));
 await actualVotes.goto(base+'states/?preview=closing&source-check='+stamp,{waitUntil:'domcontentloaded'});
 await actualVotes.waitForFunction(()=>document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true'&&
  document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:85000});
 const publishedCivic=await actualVotes.evaluate(async()=>{
  const url=new URL('../civicapi/races.json?actual-delivery='+Date.now(),location.href);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('PUBLIC CivicAPI JSON HTTP '+response.status);
  const json=await response.json();
  const accepted=window.ERVIN_RETURNS?.civic(json)||{};
  return {raw:Object.keys(json.races||{}).length,accepted:Object.keys(accepted)};
 });
 const publishedHouse=publishedCivic.accepted.filter(id=>/^([A-Z]{2})-[0-9]{2}$/.test(id));
 const publishedSenate=publishedCivic.accepted.filter(id=>id.endsWith('-SENATE'));
 const publishedGovernors=publishedCivic.accepted.filter(id=>id.endsWith('-GOVERNOR'));
 if(publishedHouse.length+publishedSenate.length+publishedGovernors.length!==publishedCivic.accepted.length)throw Error('PUBLIC REAL VOTE REPORT HAS UNCLASSIFIED CONTESTS');
 if(publishedHouse.length){
  await actualVotes.waitForFunction(expected=>{
   const results=window.ERVIN_HOME_RESULTS?.races||{};
   const paths=[...document.querySelectorAll('#edSimMap a[data-sim-district]')];
   return expected.every(id=>results[id]&&paths.some(a=>a.dataset.simDistrict===id&&
    a.querySelector('path')?.classList.contains('ed-live-lead-'+(()=>{const leaders=results[id].candidates.slice().sort((a,b)=>b.votes-a.votes);return leaders[0].votes===leaders[1].votes?'T':leaders[0].party==='O'?'I':leaders[0].party})())));
  },publishedHouse,{timeout:40000});
  const actual=await actualVotes.evaluate(()=>({
   visibleLeaders:document.querySelectorAll('#edSimMap path.ed-live-lead-D,#edSimMap path.ed-live-lead-R,#edSimMap path.ed-live-lead-I').length,
   liveTotal:document.querySelector('#edFinalCallSummary')?.dataset.liveReports,
   commentary:document.querySelectorAll('#edCommentaryEntries .ed-commentary-item').length,
   ids:Object.keys(window.ERVIN_HOME_RESULTS?.races||{})
  }));
  if(actual.visibleLeaders<publishedHouse.length||actual.commentary<2)
   throw Error('PUBLIC ACTUAL CIVICAPI VOTES NOT PRESENTED ON LIVE HOMEPAGE '+JSON.stringify({actual,publishedCivic}));
  await actualVotes.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/Actual-Reported-House-Votes.png'});
  console.log('PUBLIC REAL CIVICAPI VOTE DELIVERY PASS '+JSON.stringify({published:publishedCivic.raw,verified:publishedCivic.accepted.length,visible:actual.visibleLeaders,commentary:actual.commentary}));
 }
 if(publishedSenate.length){
  await actualVotes.locator('#edSimTabs button').filter({hasText:'Senate'}).click();
  await actualVotes.waitForFunction(expected=>{
   if(document.querySelector('#edSimMap')?.dataset.simOffice!=='senateD')return false;
   const results=window.ERVIN_HOME_RESULTS?.races||{};
   return expected.every(id=>{
    const row=results[id],order=row?.candidates?.slice().sort((a,b)=>b.votes-a.votes),leader=order?.[0],kind=leader&&(order[0].votes===order[1]?.votes?'T':leader.party==='O'?'I':leader.party);
    const anchor=[...document.querySelectorAll('#edSimMap a[data-sim-state]')].find(a=>a.dataset.simState===id.slice(0,2));
    return !!row&&!!kind&&anchor?.querySelector('path')?.classList.contains('ed-live-lead-'+kind);
   });
  },publishedSenate,{timeout:40000});
  await actualVotes.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/Actual-Reported-Senate-Votes.png'});
  console.log('PUBLIC REAL SENATE CIVICAPI VOTE DELIVERY PASS '+JSON.stringify({reportedSenate:publishedSenate}));
 }
 if(publishedGovernors.length){
  await actualVotes.locator('#edSimTabs button').filter({hasText:'Governors'}).click();
  await actualVotes.waitForFunction(expected=>{
   if(document.querySelector('#edSimMap')?.dataset.simOffice!=='governorsD')return false;
   const results=window.ERVIN_HOME_RESULTS?.races||{};
   return expected.every(id=>{
    const row=results[id],order=row?.candidates?.slice().sort((a,b)=>b.votes-a.votes),leader=order?.[0],kind=leader&&(order[0].votes===order[1]?.votes?'T':leader.party==='O'?'I':leader.party);
    const anchor=[...document.querySelectorAll('#edSimMap a[data-sim-state]')].find(a=>a.dataset.simState===id.slice(0,2));
    return !!row&&!!kind&&anchor?.querySelector('path')?.classList.contains('ed-live-lead-'+kind);
   });
  },publishedGovernors,{timeout:40000});
  await actualVotes.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/Actual-Reported-Governor-Votes.png'});
  console.log('PUBLIC REAL GOVERNOR CIVICAPI VOTE DELIVERY PASS '+JSON.stringify({reportedGovernors:publishedGovernors}));
 }
 if(!publishedCivic.accepted.length)console.log('PUBLIC REAL CIVICAPI VOTE DELIVERY: no accepted post-close vote records in public snapshot; no unverified votes displayed');
 if(voteErrors.length)throw Error('PUBLIC LIVE ACTUAL RESULTS PAGE JS ERRORS '+voteErrors.join(' | '));
 await actualVotes.close();

 const archive=await browser.newPage({viewport:{width:1220,height:900}});
 await archive.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-04T06:00:00Z')});
 await archive.goto(base+'states/?view=final&release='+stamp+'#edSimulationPanel',{waitUntil:'domcontentloaded'});
 await archive.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435&&
  document.querySelector('#edFinalHeadline')?.textContent.includes('PREDICTION'),null,{timeout:85000});
 if((await archive.locator('#edSimMap path.ed-sim-proj-D,#edSimMap path.ed-sim-proj-R').count())!==435)throw Error('PUBLIC ARCHIVED FINAL PREDICTION MUST PRESERVE ALL 435 CALLS AFTER HANDOFF');
 if(!(await archive.locator('#edLiveCommentary').isHidden()))throw Error('PUBLIC ARCHIVE SHOULD NOT SHOW LIVE COMMENTARY');
 await archive.locator('#edSimulationPanel').screenshot({path:'postdeploy-checks/Archived-Final-Prediction-After-5-55.png'});
 await archive.close();
 // CRITICAL: inspection must prove BOTH new full-width maps are actually
 // rendered on the LIVE public page, not merely present in repository HTML.
 const atlas=await browser.newPage({viewport:{width:1440,height:940},deviceScaleFactor:1});
 const atlasErrors=[];atlas.on('pageerror',e=>atlasErrors.push(e.message));
 await atlas.goto(base+'states/?release='+stamp+'&maps=verify',{waitUntil:'domcontentloaded'});
 await atlas.waitForFunction(expected=>document.querySelector('meta[name="ervin-deploy"]')?.content===expected,stamp,{timeout:20000});

 // The public atlas intentionally shows only one map at a time. County
 // polygons are IntersectionObserver-loaded after choosing the Counties tab.
 await atlas.waitForFunction(()=>document.querySelectorAll('#usMap path.ed-state').length>=50,null,{timeout:30000});
 const stateMapWidth=await atlas.locator('#nationMap').evaluate(e=>e.getBoundingClientRect().width);
 await atlas.locator('#nationMap').screenshot({path:'postdeploy-checks/LIVE-State-Map-Full-Width.png'});
 await atlas.locator('[data-national-atlas-view="counties"]').click();
 await atlas.waitForFunction(()=>!document.querySelector('#allCountyNation')?.hidden
   &&document.querySelector('#nationMap')?.hidden,null,{timeout:15000});
 await atlas.locator('#allCountyNation').scrollIntoViewIfNeeded();
 try{
  await atlas.waitForFunction(()=>document.querySelectorAll('#allCountyMap path.all-county').length>=3000
   &&document.querySelector('#allCountyStatus')?.textContent.includes('county'),null,{timeout:65000});
 }catch(err){
  const diag=await atlas.evaluate(()=>({count:document.querySelectorAll('#allCountyMap path.all-county').length,
   visible:!document.querySelector('#allCountyNation')?.hidden,
   status:document.querySelector('#allCountyStatus')?.textContent,
   forecastReady:!!window.ERVIN_HOME_FORECAST,
   countyRegistry:document.querySelector('#allCountySourceAudit')?.textContent,
   network:performance.getEntriesByType('resource').filter(x=>/geo\/packs|county-history|county-sources/.test(x.name)).slice(-15).map(x=>({url:x.name.split('/').pop(),duration:Math.round(x.duration)}))}));
  throw Error('LIVE NATIONAL COUNTY DIAGNOSTIC '+JSON.stringify({diag,atlasErrors})+' · '+err.message);
 }
 // At/after 5:55 the reported layer is correctly gray until source
 // reports arrive. Check the separate forecast layer for projection colors.
 await atlas.locator('[data-national-county-view="forecast"]').click();
 await atlas.waitForFunction(()=>document.querySelector('[data-national-county-view="forecast"]')?.getAttribute('aria-pressed')==='true'&&
  document.querySelectorAll('#allCountyMap path.atlas-D, #allCountyMap path.atlas-R').length>=100,null,{timeout:25000});
 const mapAudit=await atlas.evaluate((statesWidth)=>{
  const counties=document.querySelector('#allCountyNation'),shell=document.querySelector('.ed-shell');
  return {states:document.querySelectorAll('#usMap path.ed-state').length,
    counties:document.querySelectorAll('#allCountyMap path.all-county').length,
    coloredCounties:document.querySelectorAll('#allCountyMap path.atlas-D, #allCountyMap path.atlas-R').length,
    stateMapWidth:Math.round(statesWidth),countyMapWidth:Math.round(counties.getBoundingClientRect().width),
    contentWidth:Math.round(shell.getBoundingClientRect().width),
    stateHidden:document.querySelector('#nationMap').hidden,countyHidden:counties.hidden,
    countyTabSelected:document.querySelector('[data-national-atlas-view="counties"]')?.getAttribute('aria-pressed')==='true',
    stateControls:document.querySelectorAll('[data-map-office]').length,
    countyControls:document.querySelectorAll('[data-national-county-office]').length,
    status:document.querySelector('#allCountyStatus')?.textContent.trim(),
    build:document.querySelector('meta[name="ervin-deploy"]')?.content};
 },stateMapWidth);
 if(mapAudit.states<50||mapAudit.counties<3000||mapAudit.coloredCounties<100
  ||mapAudit.stateMapWidth<mapAudit.contentWidth*.92
  ||mapAudit.countyMapWidth<mapAudit.contentWidth*.92
  ||!mapAudit.stateHidden||mapAudit.countyHidden||!mapAudit.countyTabSelected
  ||mapAudit.stateControls!==3||mapAudit.countyControls!==2||mapAudit.build!==stamp||atlasErrors.length)
   throw Error('PUBLIC HOMEPAGE ATLAS MAPS NOT ACTUALLY RENDERED '+JSON.stringify({mapAudit,atlasErrors}));
 await atlas.locator('#allCountyNation').screenshot({path:'postdeploy-checks/LIVE-County-Projections-Senate.png'});
 await atlas.locator('[data-national-county-office="Governor"]').click();
 await atlas.waitForFunction(()=>document.querySelector('[data-national-county-office="Governor"]')?.getAttribute('aria-pressed')==='true'
   &&document.querySelector('#allCountyStatus')?.textContent.includes('Governor'),null,{timeout:30000});
 await atlas.locator('#allCountyNation').screenshot({path:'postdeploy-checks/LIVE-County-Projections-Governor.png'});
 await atlas.locator('[data-national-county-view="reported"]').click();
 await atlas.waitForFunction(()=>document.querySelector('[data-national-county-view="reported"]')?.getAttribute('aria-pressed')==='true',null,{timeout:12000});
 const reportedCheck=await atlas.evaluate(()=>({shapes:document.querySelectorAll('#allCountyMap path.all-county').length,unexpectedBeforePolls:Date.now()<Date.parse('2026-11-04T01:00:00Z')&&document.querySelectorAll('#allCountyMap path.all-county[data-reported="true"]').length>0,sourceSummary:document.querySelector('#allCountySourceAudit')?.textContent}));
 if(reportedCheck.shapes<3000||reportedCheck.unexpectedBeforePolls||!reportedCheck.sourceSummary?.includes('county'))throw Error('LIVE REPORTED COUNTY MAP CONTRADICTS VERIFIED SOURCES '+JSON.stringify(reportedCheck));
 await atlas.locator('#allCountyNation').screenshot({path:'postdeploy-checks/LIVE-County-Reported-Only.png'});
 await atlas.locator('[data-national-county-view="compare"]').click();
 await atlas.waitForFunction(()=>document.querySelector('[data-national-county-view="compare"]')?.getAttribute('aria-pressed')==='true',null,{timeout:10000});
 await atlas.locator('#allCountyNation').screenshot({path:'postdeploy-checks/LIVE-County-Forecast-Versus-Returns.png'});
 await atlas.locator('[data-national-atlas-view="states"]').click();
 await atlas.waitForFunction(()=>!document.querySelector('#nationMap')?.hidden
   &&document.querySelector('#allCountyNation')?.hidden,null,{timeout:10000});
 await atlas.locator('#themeToggle').click();
 await atlas.waitForFunction(()=>document.documentElement.classList.contains('theme-dark'),null,{timeout:10000});
 await atlas.locator('#nationMap').screenshot({path:'postdeploy-checks/LIVE-State-Map-Dark.png'});
 console.log('LIVE TWO-MAP DESKTOP VISUAL PASS '+JSON.stringify(mapAudit));
 await atlas.close();
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
 await michiganAudit.waitForFunction(()=>/^(?:D|R) \+\d+\.\d|Even$/.test(document.querySelector('#heroSenate')?.textContent?.trim()||''),null,{timeout:35000});
 const liveMISenate=(await michiganAudit.locator('#heroSenate').innerText()).trim();
 if(!/^(?:D|R) \+\d+\.\d|Even$/.test(liveMISenate))throw Error('LIVE MI SENATE MARGIN UNAVAILABLE');
 const cardDetails=await michiganAudit.locator('#stateRaceCards').innerText();
 if(cardDetails.includes('so it should not be mistaken for a documented religion-related polling bias'))throw Error('Requested Michigan forecast text still visible on the published website');
 if(!cardDetails.includes(liveMISenate))throw Error('LIVE MI SENATE RACE CARD NOT UPDATED');
 await michiganAudit.locator('#miCandidateEffect').screenshot({path:'postdeploy-checks/Michigan-Candidate-Effect-Evidence-Mobile.png'});
 await michiganAudit.locator('#stateOverview').screenshot({path:'postdeploy-checks/Michigan-Candidate-Strength-Model.png'});
 console.log('LIVE MI CANDIDATE-EFFECT AUDIT PASS 9 linked paired polls / no invented polling penalty');
 await michiganAudit.close();
 // Explicit acceptance of newly published national Election Night / governor model.
 const national=await browser.newPage({viewport:{width:1440,height:940}});
 await national.goto(base+'election-night/?release='+stamp,{waitUntil:'domcontentloaded'});
 await national.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83&&document.querySelector('#nationalCount')?.textContent.includes('506 indexed races'),null,{timeout:35000});
 if((await national.locator('#miD').innerText())!=='—')throw Error('Live national desk fabricated a pre-election vote total');
 if((await national.locator('#miForecast').innerText())!==liveMISenate)throw Error('LIVE ELECTION NIGHT MICHIGAN FORECAST INCORRECT');
 await national.screenshot({path:'postdeploy-checks/Election-Night-National.png',fullPage:false});
 console.log('LIVE NATIONAL NIGHT PASS 506 races / 83 Michigan counties / no premature votes');
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
