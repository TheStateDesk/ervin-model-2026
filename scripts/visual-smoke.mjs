#!/usr/bin/env node
// Real Chromium screenshot and visibility test. Run with a root-level local static server.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const port=8766,root='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const results=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
try{
 for(let n=0;n<35;n++){try{const r=await fetch(root+'/state/');if(r.ok)break;}catch(_){ }await sleep(250)}
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 fs.mkdirSync('visual-checks',{recursive:true});
 // Mirror every legacy Chromium smoke suite in the release workflow before publishing.
 for(const file of ['browser_smoke','michigan_smoke','michigan_election_night_smoke','counties_watch_smoke','election_dossier_smoke','house_election_center_smoke','theme_smoke']){
  const test=await browser.newPage({viewport:{width:1200,height:950}});
  await test.goto(root+'/tests/'+file+'.html',{waitUntil:'domcontentloaded'});
  const resultSelector=file==='theme_smoke'?'#result':'#report';
  await test.waitForFunction(selector=>['PASS','FAIL'].includes(document.querySelector(selector)?.dataset.status),resultSelector,{timeout:55000});
  const passed=(await test.locator(resultSelector).getAttribute('data-status'))==='PASS';
  const report=await test.locator(resultSelector).innerText();
  if(!passed)throw Error('RELEASE BLOCKER '+file+': '+report.slice(0,2800));
  console.log('RELEASE SMOKE PASS '+file+' '+report.slice(0,100).replaceAll('\\n',' '));
  await test.close();
 }
 // Verify the consolidated national Election Night dashboard and all 83 Michigan counties.
 const homepage=await browser.newPage({viewport:{width:1440,height:940}});
 await homepage.goto(root+'/',{waitUntil:'domcontentloaded'});
 await homepage.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true',null,{timeout:30000});
 assert((await homepage.locator('#powerCards .power-card').count())===3,'Homepage must display House Senate Governors bars');
 assert((await homepage.locator('#balanceOfPower').boundingBox()).y<150,'Homepage power bars must be ABOVE the large hero');
 assert((await homepage.locator('[data-power-office="governors"] [data-power-d]').innerText())==='25','Governor balance must include Ohio Democratic projection');
 assert((await homepage.locator('[data-power-office="senate"] [data-power-d]').innerText())==='50','Michigan candidate strength must change Senate balance to 50-50');
 assert((await homepage.locator('[data-power-office="senate"] [data-power-r]').innerText())==='50','Senate GOP forecast must include Michigan');
 const seatRows=await homepage.locator('#powerCards .power-card').evaluateAll(elements=>elements.map(node=>({office:node.dataset.powerOffice,numbers:[...node.querySelectorAll('[data-power-d],[data-power-r],[data-power-t]')].map(x=>+x.textContent),bars:[...node.querySelectorAll('.power-segment')].map(x=>parseFloat(x.style.width))})));
 for(const row of seatRows){assert(row.numbers.reduce((a,b)=>a+b,0)===(row.office==='house'?435:row.office==='senate'?100:50),'Seat total inconsistent: '+row.office);assert(Math.abs(row.bars.reduce((a,b)=>a+b,0)-100)<.01,'Bar width not 100%: '+row.office);}
 await homepage.locator('#balanceOfPower').screenshot({path:'visual-checks/Homepage-Projected-Balance-Of-Power.png'});
 await homepage.close();
 const homeMobile=await browser.newPage({viewport:{width:390,height:844}});
 await homeMobile.goto(root+'/',{waitUntil:'domcontentloaded'});
 await homeMobile.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true',null,{timeout:30000});
 assert((await homeMobile.locator('#balanceOfPower').count())===1,'Mobile homepage forecast balance absent');
 assert((await homeMobile.locator('#balanceOfPower').boundingBox()).y<125,'Mobile homepage power bars must start in first screen');
 assert(await homeMobile.evaluate(()=>getComputedStyle(document.querySelector('#balanceOfPower')).display!=='none'&&document.querySelector('#balanceOfPower').getBoundingClientRect().width>250),'Mobile power bar must be visible');
 await homeMobile.locator('#balanceOfPower').screenshot({path:'visual-checks/Homepage-Power-Mobile.png'});
 await homeMobile.close();
 const nationalNight=await browser.newPage({viewport:{width:1440,height:940}});
 const nightErrors=[];nationalNight.on('pageerror',e=>nightErrors.push(e.message));
 await nationalNight.goto(root+'/election-night/',{waitUntil:'domcontentloaded'});
 const navTargets=await nationalNight.locator('.night-head nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
 assert(JSON.stringify(navTargets)===JSON.stringify(['../states/','#nationalBoard','#michiganSpotlight']),'Election Night links to retired dedicated pages');
 assert((await nationalNight.locator('.night-links a[href="../state/?state=MI#stateResults"]').count())===1,'Michigan source card must link into consolidated state page');

 await nationalNight.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83,null,{timeout:30000});
 await nationalNight.waitForFunction(()=>document.querySelector('#nationalCount')?.textContent.includes('488 indexed races'),null,{timeout:30000});
 assert((await nationalNight.locator('#balanceOfPower').count())===0,'Election Night must not display pre-election power bars');

 assert((await nationalNight.locator('#miCounties').innerText())==='0 / 83','Fake Michigan county counts before polls close');
 assert((await nationalNight.locator('#miD').innerText())==='—','Synthetic Michigan Senate votes before polls close');
 assert((await nationalNight.locator('#miForecast').innerText())==='R +0.8','Michigan national Election Night must display R +0.8 Ervin’s Take');
 assert(nightErrors.length===0,'National Election Night JS errors: '+nightErrors.join(', '));
 await nationalNight.locator('#michiganSpotlight').screenshot({path:'visual-checks/National-Election-Night-Michigan-83.png'});
 await nationalNight.locator('[data-office="Governor"]').click();
 await nationalNight.waitForFunction(()=>document.querySelectorAll('#raceList .race-row').length===36,null,{timeout:12000});
 await nationalNight.locator('[data-office="House"]').click();
 await nationalNight.waitForFunction(()=>document.querySelectorAll('#raceList .race-row').length===435,null,{timeout:12000});
 await nationalNight.locator('[data-office="All"]').click();
 await nationalNight.screenshot({path:'visual-checks/National-Election-Night-Full-Desk.png',fullPage:true});
 console.log('NATIONAL NIGHT QA PASS',JSON.stringify({counties:83,contests:488,gov:36,house:435,errors:nightErrors}));
 await nationalNight.close();
 const nightMobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await nightMobile.goto(root+'/election-night/',{waitUntil:'domcontentloaded'});
 await nightMobile.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83,null,{timeout:30000});
 const navBox=await nightMobile.locator('.night-head nav').boundingBox();
 const brandBox=await nightMobile.locator('.night-brand').boundingBox();
 const themeBox=await nightMobile.locator('#appearance').boundingBox();
 assert(navBox.y>brandBox.y,'Mobile nav must have its own row');
 assert(brandBox.x+brandBox.width<themeBox.x+1,'Brand and theme control must not overlap');
 assert((await nightMobile.locator('.night-head nav a').count())===3,'Mobile nav must contain exactly three destinations');
 assert(await nightMobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+4),'Mobile election-night masthead must not create horizontal scroll');
 await nightMobile.locator('.night-head').screenshot({path:'visual-checks/National-Election-Night-Mobile-Header.png'});
 await nightMobile.close();
 const governorPage=await browser.newPage({viewport:{width:1440,height:900}});
 await governorPage.goto(root+'/governors/',{waitUntil:'domcontentloaded'});
 await governorPage.waitForFunction(()=>document.querySelector('#coverage')?.textContent.includes('Ervin-adjusted'),null,{timeout:20000});
 assert((await governorPage.locator('#govCards .gov-card').count())===36,'Governor board no longer covers all 36 elections');
 const ohioCard=governorPage.locator('#govCards [data-code="OH"]');
 assert((await ohioCard.innerText()).includes('D +2.6'),'Ohio governor forecast must show D +2.6 (not R +0.0)');
 assert(await ohioCard.evaluate(el=>el.classList.contains('d')&&!el.classList.contains('tie')),'Ohio must have Democratic map tone, not tie');
 assert((await governorPage.locator('#govUSMap a[data-code="OH"] path.d').count())===1,'Ohio state geometry must match projected winner');
 assert((await governorPage.locator('#govCards .er-hist-table').count())>0,'No governor historical error evidence on new board');
 assert((await governorPage.locator('#coverage').innerText()).includes('19 Ervin-adjusted'),'Expected 19 governor-only corrections');
 await governorPage.waitForFunction(()=>document.querySelector('#govBacktestRaw')?.textContent.includes('4.66')&&document.querySelector('#govBacktestAdjusted')?.textContent.includes('4.71'),null,{timeout:12000});
 assert((await governorPage.locator('#govBacktestRows tr').count())===35,'Governor source-linked backtest missing historic events');
 await governorPage.screenshot({path:'visual-checks/Governor-Ervin-Corrections.png',fullPage:true});
 await ohioCard.screenshot({path:'visual-checks/Ohio-Governor-Ervins-Take-Verified.png'});
 await governorPage.close();
 const ohioDetail=await browser.newPage({viewport:{width:390,height:844}});
 await ohioDetail.goto(root+'/state/?state=OH',{waitUntil:'domcontentloaded'});
 await ohioDetail.waitForFunction(()=>document.querySelector('#heroGovernor')?.textContent==='D +2.6',null,{timeout:30000});
 assert((await ohioDetail.locator('#stateRaceCards').innerText()).includes('D +2.6'),'State dossier and map must use same Ohio forecast');
 assert(!(await ohioDetail.locator('#heroGovernor').innerText()).includes('R +0.0'),'Negative zero Ohio regression');
 await ohioDetail.screenshot({path:'visual-checks/Ohio-State-Desk-Actual-Mobile.png',fullPage:false});
 await ohioDetail.close();
 // Verify all-state aggregate ratings, hover D/R/T counts and each race margin.
 const stateAtlas=await browser.newPage({viewport:{width:1440,height:940}});
 const atlasErrors=[];stateAtlas.on('pageerror',e=>atlasErrors.push(e.message));
 await stateAtlas.goto(root+'/states/',{waitUntil:'domcontentloaded'});
 await stateAtlas.waitForFunction(()=>document.querySelectorAll('#usMap path[data-state]').length===50&&document.querySelector('#aggregateLegend')?.textContent.includes('50 states with'),null,{timeout:27000});
 await stateAtlas.locator('#usMap a[data-state-link="MI"]').focus();
 await stateAtlas.waitForFunction(()=>document.querySelector('#stateMapTooltip')&&!document.querySelector('#stateMapTooltip').hidden,null,{timeout:8000});
 const tipText=await stateAtlas.locator('#stateMapTooltip').innerText();
 assert(tipText.includes('Michigan')&&tipText.includes('U.S. Senate')&&tipText.includes('MI-07')&&/\d+D.{1,3}\d+R.{1,3}\d+T/.test(tipText),'State hover does not display all race types, margins and aggregate D-R-T totals: '+tipText.slice(0,500));
 assert(atlasErrors.length===0,'State atlas errors: '+atlasErrors.join(', '));
 await stateAtlas.screenshot({path:'visual-checks/States-Aggregate-2026-Michigan-Hover.png',fullPage:false});
 await stateAtlas.close();
 const miBiasPage=await browser.newPage({viewport:{width:390,height:844}});
 await miBiasPage.goto(root+'/state/?state=MI#stateSources',{waitUntil:'domcontentloaded'});
 await miBiasPage.waitForFunction(()=>document.querySelector('#miCandidateEffect')?.innerText.includes('median governor-minus-Senate margin'),null,{timeout:30000});
 const miBias=await miBiasPage.locator('#miCandidateEffect').innerText();
 assert(miBias.includes('not evidence of a hidden voting preference')||miBias.includes('not evidence of a hidden voting preference.'),'Candidate audit omitted stated-versus-hidden distinction');
 assert(miBias.includes('not applied'),'Unverified Muslim Bradley effect improperly presented as a correction');
 assert(miBias.includes('−1.84')&&miBias.includes('R +0.76'),'MI candidate-strength shift must be visible with sourcing');
 assert((await miBiasPage.locator('#miCandidateEffect details').count())===2,'Evidence and counterexample controls missing');
 await miBiasPage.locator('#miCandidateEffect').screenshot({path:'visual-checks/Michigan-Candidate-Effect-Evidence-Mobile.png'});
 await miBiasPage.close();
 const countyNight=await browser.newPage({viewport:{width:1440,height:940}}),nightPageErrors=[];
 countyNight.on('pageerror',e=>nightPageErrors.push(e.message));
 await countyNight.goto(root+'/state/?state=MI#stateResults',{waitUntil:'domcontentloaded'});
 await countyNight.waitForFunction(()=>document.querySelector('#heroSenate')?.textContent==='R +0.8',null,{timeout:20000});
 assert((await countyNight.locator('#stateRaceCards').innerText()).includes('R +0.8'),'Michigan state hero and model card disagree');
 await countyNight.locator('#stateOverview').screenshot({path:'visual-checks/MI-Ervins-Take-Candidate-Strength.png'});
 await countyNight.waitForFunction(()=>document.querySelectorAll('#countyNightMap path.night-county').length===83,null,{timeout:26000});
 await countyNight.waitForFunction(()=>document.querySelector('#nightCountyCount')?.textContent.includes('0 / 83'),null,{timeout:8000});
 assert((await countyNight.locator('#nightCountyDem').innerText())==='—','Michigan election-night county page shows fictitious ballots');
 assert((await countyNight.locator('#nightCountyRows tr').count())===83,'Michigan county night reporting table incomplete');
 assert(nightPageErrors.length===0,'Michigan state county desk errors: '+nightPageErrors.join(', '));
 await countyNight.locator('.ed-night-county').screenshot({path:'visual-checks/MI-State-Election-Night-83-land-clipped.png'});
 await countyNight.goto(root+'/state/?state=TX#stateResults',{waitUntil:'domcontentloaded'});
 await countyNight.waitForFunction(()=>document.querySelectorAll('#countyNightMap path.night-county').length===254,null,{timeout:27000});
 assert((await countyNight.locator('#nightCountyDem').innerText())==='—','Texas county results invented before election');
 await countyNight.close();
 console.log('ALL STATE NIGHT & AGGREGATE QA PASS',JSON.stringify({hover:'MI all races',states:50,miCounties:83,txCounties:254,errors:atlasErrors.concat(nightPageErrors)}));
 // Verify all 435 House model ratings and a genuinely interactive district-level geographic page.
 const nationalHouse=await browser.newPage({viewport:{width:1440,height:940}});
 await nationalHouse.goto(root+'/house/',{waitUntil:'domcontentloaded'});
 await nationalHouse.waitForFunction(()=>document.querySelector('#houseModelSummary')?.textContent.includes('Every House district, modeled'),null,{timeout:25000});
 const nationalSummary=await nationalHouse.locator('#houseModelSummary').innerText();
 assert(nationalSummary.includes('435 / 435'),'House model has incomplete race coverage');
 assert(nationalSummary.includes('underlying')||nationalSummary.includes('indexed'),'House model fails to attribute polling');
 await nationalHouse.locator('#houseMapSvg path[data-code="TX"]').click({force:true});
 await nationalHouse.waitForFunction(()=>document.querySelectorAll('#districtMapSvg path.geo-district').length===38,null,{timeout:25000});
 await nationalHouse.screenshot({path:'visual-checks/House-435-overview-TX-map.png',fullPage:true});
 await nationalHouse.close();
 const houseDistrict=await browser.newPage({viewport:{width:1440,height:940}});
 await houseDistrict.goto(root+'/state/?state=MI#house-7',{waitUntil:'domcontentloaded'});
 await houseDistrict.waitForFunction(()=>document.querySelector('#districtDetail')?.textContent.includes('ERVIN HOUSE')&&document.querySelector('#districtDetail')?.textContent.includes('2024 House'),null,{timeout:25000});
 const districtText=await houseDistrict.locator('#districtDetail').innerText();
 const corePolls=await houseDistrict.locator('#districtDetail .ed-house-surveys article').count();
 console.log('MI-07 DISTRICT VIEW',JSON.stringify({head:districtText.slice(0,850),corePolls,questionBrowser:(await houseDistrict.locator('.ed-question-archive summary').allTextContents()).slice(0,1)}));
 assert(districtText.includes('2024 House')&&corePolls>=1,'MI-07 model history or underlying polls missing');
 await houseDistrict.locator('#stateHouse').scrollIntoViewIfNeeded();
 await houseDistrict.screenshot({path:'visual-checks/MI-07-ervin-house-sourced-model.png',fullPage:true});
 await houseDistrict.close();
 for(const code of ['TX','MI','NY','CA','AK']){
  for(const theme of ['light','dark']){
   const page=await browser.newPage({viewport:{width:1440,height:940},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(theme=>localStorage.setItem('ervin-2026-appearance',theme),theme);
   await page.goto(root+'/state/?state='+code,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.querySelectorAll('#countyMap path.county').length>0,{timeout:25000});
   await page.waitForFunction(()=>document.querySelectorAll('#districtMap path.geo-district').length>0,{timeout:25000});
   const details=await page.evaluate(()=>{
    const svg=document.querySelector('#countyMap'),p=svg.querySelector('path.county'),house=document.querySelector('#districtMap');
    const pbox=p.getBoundingClientRect(),sbox=svg.getBoundingClientRect();
    const c=getComputedStyle(p), theme=getComputedStyle(document.body);
    const visible=Array.from(svg.querySelectorAll('path.county')).filter(p=>{const r=p.getBoundingClientRect(),s=getComputedStyle(p);return r.width>0.1&&r.height>0.1&&s.fill!=='none'&&s.display!=='none'}).length;
    return{counties:svg.querySelectorAll('path.county').length,visible,house:house.querySelectorAll('path.geo-district').length,firstPath:p.getAttribute('d')?.length,firstBounds:[pbox.x,pbox.y,pbox.width,pbox.height],svgBounds:[sbox.width,sbox.height],fill:c.fill,stroke:c.stroke,background:theme.backgroundColor,dark:document.documentElement.classList.contains('theme-dark'),status:document.querySelector('#countyStatus')?.textContent,houseStatus:document.querySelector('#districtMapStatus')?.textContent};
   });
   assert(details.counties>=3,'Counties missing '+code+' '+theme+': '+JSON.stringify(details));
   assert(details.visible>=Math.max(3,Math.floor(details.counties*.9)),'Invisible county shapes '+code+' '+theme+': '+JSON.stringify(details));
   assert(details.house>0,'House selector blank '+code+' '+theme);
   await page.waitForFunction(()=>document.querySelector('#districtDetail')?.textContent.includes('ERVIN HOUSE'),null,{timeout:25000});
   assert(details.dark===(theme==='dark'),'Wrong theme '+code+' '+theme);
   assert(!errors.length,'JS errors '+code+': '+errors.join(' | '));
   await page.screenshot({path:'visual-checks/'+code+'-'+theme+'-county.png',fullPage:true});
   results.push({code,theme,...details,errors});
   if(code==='TX'&&theme==='light'){
    await page.locator('#districtMap path.geo-district').first().click({force:true});
    assert((await page.locator('#districtTitle').textContent()).includes('District'),'House polygon click did not open report');
    await page.locator('#districtZoomIn').click();
    const houseView=await page.locator('#districtMap').getAttribute('viewBox');
    assert(houseView&&houseView!=='0 0 900 580','District zoom did not move viewBox');
    const body=await page.locator('body').innerText();
    assert(body.includes('Publisher averages'),'Texas governor source averages missing from display');
    for(const source of ['RealClearPolling','Decision Desk HQ','270toWin','Silver Bulletin'])assert(body.includes(source),'Missing Texas publisher average '+source);
    await page.screenshot({path:'visual-checks/TX-polling-race.png',fullPage:true});
   }
   await page.close();
  }
 }
 // Mobile view verifies actual county shapes and theme control, not merely DOM presence.
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mobile.goto(root+'/state/?state=TX',{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>document.querySelectorAll('#countyMap path.county').length===254,{timeout:25000});
 await mobile.locator('#themeToggle').click();
 assert(await mobile.locator('html').evaluate(e=>e.classList.contains('theme-dark')),'Dark toggle failed on mobile');
 await mobile.screenshot({path:'visual-checks/TX-mobile-dark.png',fullPage:true});
 await mobile.close();
 const directory=await browser.newPage({viewport:{width:1280,height:900}});
 await directory.goto(root+'/states/',{waitUntil:'domcontentloaded'});
 assert(await directory.locator('#themeToggle').isVisible(),'State directory theme switch missing');
 await directory.locator('#themeToggle').click();
 assert(await directory.locator('html').evaluate(e=>e.classList.contains('theme-dark')),'Directory dark mode failed');
 await directory.screenshot({path:'visual-checks/states-directory-dark.png',fullPage:true});
 await directory.close();
 fs.writeFileSync('visual-checks/visible-geometry-report.json',JSON.stringify(results,null,2));
 console.log('BROWSER VISUAL CHECK PASS '+JSON.stringify(results.map(r=>({state:r.code,mode:r.theme,counties:r.counties,visible:r.visible,house:r.house}))));
}catch(e){console.error('BROWSER VISUAL CHECK FAIL',e.stack);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill('SIGTERM');}
