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
 // Verify the new 14,000-draw early-signal research tab without a live vote feed.
 const nerd=await browser.newPage({viewport:{width:1240,height:880}});
 const nerdErrors=[];nerd.on('pageerror',e=>nerdErrors.push(e.message));
 await nerd.goto(root+'/stats-for-nerds/',{waitUntil:'domcontentloaded'});
 await nerd.waitForFunction(()=>document.querySelector('#targetCards')?.textContent.includes('Texas')&&document.querySelector('#sampleHealth')?.textContent==='14,000',null,{timeout:30000});
 assert((await nerd.locator('.nerd-target').count())===3,'Stats for Nerds must show TX/KS/IA three-state scenario');
 await nerd.waitForFunction(()=>document.querySelector('#houseRosterSummary')?.textContent.includes('435 of 435 House districts'),null,{timeout:20000});
 assert((await nerd.locator('#houseRosterCards .nerd-house-record').count())===24,'Show 24 House districts per page');
 await nerd.locator('#houseCandidateSearch').fill('MI-10');
 await nerd.waitForFunction(()=>document.querySelectorAll('#houseRosterCards .nerd-house-record').length===1,null,{timeout:10000});
 assert((await nerd.locator('#houseRosterCards').innerText()).includes('Christina Bertrand Hines'),'Michigan House 10th candidate missing');
 assert((await nerd.locator('#houseRosterCards').innerText()).includes('Michael Bouchard'),'Michigan House 10th opponent missing');
 await nerd.locator('#houseCandidateSearch').fill('CA-11');
 await nerd.waitForFunction(()=>document.querySelector('#houseRosterCards')?.textContent.includes('Connie Chan'),null,{timeout:10000});
 const caText=await nerd.locator('#houseRosterCards').innerText();
 assert(caText.includes('Scott Wiener')&&!caText.includes('Republican'),'California top-two same-party ballot must not invent R nominee');
 await nerd.locator('#houseCandidateSearch').fill('');
 assert((await nerd.locator('#numApproved').innerText())==='0','Lab must not invent approved early-return signals');
 assert((await nerd.locator('#targetCards').innerText()).includes('50.6%'),'Texas original baseline must be D 50.6%');
 await nerd.locator('#inputRace').selectOption('VA-02');
 await nerd.locator('#inputShare').fill('65');
 await nerd.locator('#inputCoverage').fill('60');
 await nerd.locator('#whatifForm button[type="submit"]').click();
 assert((await nerd.locator('#sampleWarning').innerText()).includes('what-if'),'Hypothetical scenario not indicated');
 await nerd.locator('#includeManual').uncheck();
 assert((await nerd.locator('#sampleWarning').innerText()).includes('No audited'),'Disabling local hypotheticals must reset baseline');
 assert(nerdErrors.length===0,'Stats for Nerds browser errors: '+nerdErrors.join(', '));
 await nerd.screenshot({path:'visual-checks/Stats-For-Nerds-Desktop.png',fullPage:true});
 await nerd.close();
 const nerdMobile=await browser.newPage({viewport:{width:390,height:844}});
 await nerdMobile.goto(root+'/stats-for-nerds/',{waitUntil:'domcontentloaded'});
 await nerdMobile.waitForFunction(()=>document.querySelector('#houseRosterSummary')?.textContent.includes('435 of 435 House districts'),null,{timeout:30000});
 await nerdMobile.waitForFunction(()=>document.querySelector('#targetCards')?.textContent.includes('Iowa'),null,{timeout:30000});
 const nerdLayout=await nerdMobile.evaluate(()=>({
  viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
  elements:[...document.querySelectorAll('header,main,nav,.ed-head-inner,.ed-utility,.ed-nav-inner,.nerd-shell,.nerd-jump,.nerd-reading-guide,.nerd-section,.nerd-watch-tools,.nerd-table-wrap,.nerd-roster-controls,.nerd-evidence-summary')]
    .map(e=>({selector:e.id||e.className||e.tagName,offset:e.offsetWidth,scroll:e.scrollWidth,left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),overflow:getComputedStyle(e).overflowX})).filter(e=>e.scroll>e.offset+6||e.right>window.innerWidth+4).slice(0,25),
  nearEdge:[...document.querySelectorAll('body *')].map(e=>({name:e.tagName,id:e.id,cls:String(e.className||'').slice(0,65),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)}))
   .filter(e=>e.right>window.innerWidth+4&&e.right<550).slice(0,30),
  offenders:[...document.querySelectorAll('body *')].map(e=>({name:e.tagName,id:e.id,cls:String(e.className||'').slice(0,80),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.scrollWidth}))
   .filter(e=>e.right>window.innerWidth+4||e.left< -4).sort((x,y)=>y.right-x.right).slice(0,18)
 }));
 if(nerdLayout.scrollWidth>nerdLayout.viewport+4)console.error('STATS FOR NERDS PHONE OVERFLOW DIAGNOSTIC',JSON.stringify(nerdLayout));
 assert(nerdLayout.scrollWidth<=nerdLayout.viewport+4,'Stats for Nerds creates mobile horizontal overflow');
 await nerdMobile.screenshot({path:'visual-checks/Stats-For-Nerds-Mobile.png',fullPage:true});
 await nerdMobile.close();
 // Verify the consolidated national Election Night dashboard and all 83 Michigan counties.
 const homepage=await browser.newPage({viewport:{width:1440,height:940}});
 await homepage.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 const homepageErrors=[];homepage.on('pageerror',e=>homepageErrors.push(e.message));
 await homepage.goto(root+'/states/?view=final',{waitUntil:'domcontentloaded'});
 await homepage.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true'&&document.querySelectorAll('#watchCards .watch-card').length>0,null,{timeout:30000});
  assert(/Every state|A Blue House|Election Night|final/i.test(await homepage.locator('h1.ed-headline').innerText()),'State Desk must keep its public heading through forecast and live phases');
  assert((await homepage.locator('#watchSection').count())===1,'Closest races carousel must appear on State Desk');
  assert((await homepage.locator('#balanceOfPower').count())===1,'Office balance not placed on State Desk');
  assert((await homepage.locator('#senate-control').count())===1,'Public Senate control scenario panel missing');
  await homepage.waitForFunction(()=>/\d+%/.test(document.querySelector('#controlDemChance')?.textContent||'')&&/\d+%/.test(document.querySelector('#controlRepChance')?.textContent||''),null,{timeout:20000});
  const controlSum=(await homepage.locator('#controlDemChance,#controlRepChance,#controlUnknownChance').allTextContents()).reduce((n,x)=>n+Number.parseInt(x,10),0);
  assert(Math.abs(controlSum-100)<=2,'Control simulation should allocate nearly 100% of illustrative outcomes');
  assert((await homepage.locator('#stateDirectory').count())===1,'State directory must remain');
  assert((await homepage.locator('#electionDashboard').count())===1,'Scheduled national election dashboard is missing');
  // The final prediction must lead the page, without a competing simulation chart.
  await homepage.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435&&!document.querySelector('#edSimulationPanel .ed-final-distribution')&&document.querySelector('#edFinalHeadline')?.textContent.includes('FINAL'),null,{timeout:65000});
  const headingBottom=await homepage.locator('.ed-byline').evaluate(el=>el.getBoundingClientRect().bottom);
  const simTop=await homepage.locator('#edSimulationPanel').evaluate(el=>el.getBoundingClientRect().top);
  const deckTop=await homepage.locator('.ed-standfirst').evaluate(el=>el.getBoundingClientRect().top);
  assert(simTop>=headingBottom-2&&simTop<deckTop,'Final prediction maps must appear immediately beneath the page title and byline');
  assert(!(await homepage.locator('#edSimulationPanel').innerText()).includes('144,000')&&!await homepage.locator('#edSimulationPanel .ed-final-distribution').count(),'The final prediction hero must not expose the old simulation chart or its numerical scenario language');
  for(const [office,label,covered] of [['house','House',435],['senateD','Senate',17],['governorsD','Governors',36]]){
   await homepage.locator('#edSimTabs button').filter({hasText:label}).click();
   await homepage.waitForFunction(o=>document.querySelector('#edSimMap')?.dataset.simOffice===o,office,{timeout:65000});
   const selector=office==='house'?'#edSimMap path.ed-sim-proj-district':'#edSimMap path.ed-sim-proj-state';
   const mapCount=await homepage.locator(selector).count();
   const projected=await homepage.locator(selector+':not(.ed-sim-proj-N)').count();
   assert(mapCount===(office==='house'?435:50)&&projected===covered,office+' must show '+covered+' definitive calls on actual district or state shapes');
   assert((await homepage.locator('#edSimMap path.ed-sim-proj-T').count())===0,'Final map must not show toss-up calls');
   if(office!=='house'){
    const positions=await homepage.evaluate(()=>['AK','HI'].map((code,i)=>{
     const path=document.querySelector('#edSimMap g[data-sim-inset="'+code+'"] path');
     const group=path?.parentElement?.parentElement;
     const frame=document.querySelectorAll('#edSimMap .ed-sim-map-insets rect')[i];
     const a=path?.getBoundingClientRect(),b=frame?.getBoundingClientRect();
     return {code,transform:group?.getAttribute('transform'),valid:!!(a&&b&&a.width>10&&a.height>8&&a.left>=b.left-2&&a.top>=b.top-2&&a.right<=b.right+2&&a.bottom<=b.bottom+2)};
    }));
    assert(positions.length===2&&positions.every(x=>x.valid&&x.transform?.startsWith('translate(')),office+' Alaska and Hawaii must use House-aligned geographic inset frames: '+JSON.stringify(positions));
   }

   assert((await homepage.locator('#edFinalCallSummary').innerText()).includes(' D'),'Each map must show its final call tally');
   const target=office==='house'?'#edSimMap a[data-sim-district="MI-09"]':'#edSimMap a[data-sim-state="MI"]';
   const raceId=office==='house'?'MI-09':office==='senateD'?'MI-SENATE':'MI-GOVERNOR';
   const raceHref=await homepage.locator(target).first().getAttribute('href');
   assert(raceHref?.includes('/election-night/?state=MI&race='+raceId+'#nationalBoard'),office+' map must open the exact race, got '+raceHref);
   await homepage.locator(target).first().focus();
   assert((await homepage.locator('#edSimMapReadout').innerText()).includes('Michigan'),office+' forecast details missing');
   await homepage.locator('#edSimulationPanel').screenshot({path:'visual-checks/FINAL-PREDICTION-'+label+'-Large-Map.png'});
  }
  await homepage.locator('#edSimTabs button').filter({hasText:'House'}).click();
  await homepage.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:65000});
  assert((await homepage.locator('#edSimMapNote').innerText()).includes('435 district-by-district predictions'),'House map needs its 435-seat explanation');
  const [cpos,bpos,mpos]=await Promise.all(['#watchSection','#balanceOfPower','#nationMap'].map(async id=>(await homepage.locator(id).boundingBox()).y));
  const liveStage=await homepage.locator('#edResultsStage').isVisible();
  assert(simTop<cpos,'Headline projection must remain ahead of races-to-watch in every election phase');
  if(liveStage){
   assert(mpos<cpos&&cpos<bpos,'Election night must place the reported national map ahead of forecasts');
   assert((await homepage.locator('#edCommentaryTitle').innerText())==='Live commentary','Visible verified-count commentary rail missing from active desk');
  }else{
   assert(cpos<bpos&&bpos<mpos,'Before election night, closest races and office forecasts must precede national map');
   assert(simTop<cpos,'The headline forecast and three projection maps must precede races-to-watch on desktop');
  }
  const cardBefore=await homepage.locator('#watchCards .watch-card__name').first().innerText();
  await homepage.locator('#watchNext').click();
  assert((await homepage.locator('#watchCards .watch-card__name').first().innerText())!==cardBefore,'Races-to-watch next button did not advance');
  await homepage.locator('#watchPrev').click();
  assert((await homepage.locator('#powerCards .power-card').count())===3,'All three office balance cards must render');
 for(const [office,size] of [['house',435],['senate',100],['governors',50]]) { const items=await homepage.locator('[data-power-office="'+office+'"] .power-numbers strong').allTextContents(); assert(items.map(Number).reduce((a,b)=>a+b,0)===size,office+' balance must total '+size); }


 const links=await homepage.locator('#powerCards .power-card-head a').evaluateAll(a=>a.map(x=>x.href));
 assert(links.filter(x=>x.includes('/states/?office=house#nationMap')).length===1&&links.filter(x=>x.includes('/states/?office=governor#nationMap')).length===1,'House and governor power links must open consolidated State Desk office selections');
 assert(!links.some(x=>/\/(house|governors)\/$/.test(x)),'Retired research boards must not be linked by public balance cards');
 assert((await homepage.locator('a[href="../"],a[href*="#researchLab"],a[href*="#tabs"]').count())===0,'State Desk must not link to retired research home');
 assert((await homepage.locator('#researchLab,#advancedPollingDrawer,#races').count())===0,'Legacy forecast lab still present on public State Desk');
 // Validate the entire nationwide county map is real feature geometry and
 // switches from 2026 Senate to governor projections without changing files.
 assert(await homepage.locator('#allCountyNation').isHidden(),'Default States view should keep county atlas collapsed');
 await homepage.locator('[data-national-atlas-view="counties"]').click();
 assert(await homepage.locator('#allCountyNation').isVisible()&&await homepage.locator('#nationMap').isHidden(),'National view switch did not show counties exclusively');
 await homepage.locator('#allCountyNation').scrollIntoViewIfNeeded();
 await homepage.waitForFunction(()=>document.querySelectorAll('#allCountyMap path.all-county').length>=3000,null,{timeout:45000});
 const countyCount=await homepage.locator('#allCountyMap path.all-county').count();
 assert(countyCount>=3000,'Nationwide conditional county atlas must include at least 3,000 county polygons');
 assert((await homepage.locator('#allCountyMap path.all-county.atlas-D, #allCountyMap path.all-county.atlas-R').count())>=100,'Senate forecast county map cannot be just neutral boundaries');
 await homepage.locator('[data-national-county-office="Governor"]').click();
 assert((await homepage.locator('[data-national-county-office="Governor"]').getAttribute('aria-pressed'))==='true','Governor national county projection toggle failed');
 await homepage.locator('[data-national-county-office="Senate"]').click();
 assert((await homepage.locator('#allCountyStatus').innerText()).includes('Senate'),'County projection map did not return to Senate');
 await homepage.locator('[data-national-atlas-view="states"]').click();
 assert(await homepage.locator('#nationMap').isVisible()&&await homepage.locator('#allCountyNation').isHidden(),'County view must switch back to states');
 assert(homepageErrors.length===0,'State Desk browser errors: '+homepageErrors.join(', '));
 await homepage.locator('#watchSection').screenshot({path:'visual-checks/State-Desk-Races-To-Watch-Desktop.png'});
 await homepage.locator('#balanceOfPower').screenshot({path:'visual-checks/State-Desk-National-Balance-Desktop.png'});
 await homepage.close();
 // The default public page now leads with the post-election result desk.
 const postDesk=await browser.newPage({viewport:{width:1440,height:940}});
 const postErrors=[];postDesk.on('pageerror',e=>postErrors.push(e.message));
 await postDesk.goto(root+'/states/',{waitUntil:'domcontentloaded'});
 await postDesk.waitForFunction(()=>document.querySelector('#postElectionDesk h1')?.textContent.includes('A national wave')&&Number((document.querySelector('#postReported')?.textContent||'').replaceAll(',',''))>100&&document.querySelector('#edSimulationPanel')?.dataset.coverageMode==='live',null,{timeout:65000});
 assert((await postDesk.locator('#postCloseRaces').count())===1,'Post-election close-count desk missing');
 assert(await postDesk.locator('#watchSection').isHidden(),'Pre-election races must be archived');
 assert(await postDesk.locator('#balanceOfPower').isHidden(),'Forecast control bars still dominate homepage');
 assert((await postDesk.locator('#postMilestones a').count())>=4,'Attributable race calls missing');
 assert((await postDesk.locator('#postAnalysis .post-article-card').count())===9,'Nine original stories missing from newsroom');
 assert((await postDesk.locator('.post-package-card').count())===3,'Three major state features missing');
 assert(await postDesk.locator('#edSimulationPanel').isHidden(),'Old election forecast is visible on news homepage');
 assert(postErrors.length===0,'Post-election JS errors: '+postErrors.join(', '));
 await postDesk.locator('#postElectionDesk').screenshot({path:'visual-checks/Post-Election-Results-Desktop.png'});
 await postDesk.close();
 // Balance links must route to the same 50-state atlas, and from there to
 // the correct section inside the consolidated state edition.
 const officeDesk=await browser.newPage({viewport:{width:1100,height:820}});
 await officeDesk.goto(root+'/states/?view=final&office=house#nationMap',{waitUntil:'domcontentloaded'});
 await officeDesk.waitForSelector('#usMap a[data-state-link="MI"]',{timeout:18000});
 assert(await officeDesk.locator('#officeFocus').isVisible(),'House balance link did not open focused consolidated state map');
 assert((await officeDesk.locator('#officeFocus').innerText()).includes('House'),'House selection context missing');
 assert((await officeDesk.locator('#usMap a[data-state-link="MI"]').getAttribute('href')).includes('#stateHouse'),'House map must jump to House section within Michigan State Desk');
 await officeDesk.goto(root+'/states/?view=final&office=governor#nationMap',{waitUntil:'domcontentloaded'});
 await officeDesk.waitForSelector('#usMap a[data-state-link="OH"]',{timeout:18000});
 assert((await officeDesk.locator('#officeFocus').innerText()).includes('Governor'),'Governor state selection context missing');
 assert((await officeDesk.locator('#usMap a[data-state-link="OH"]').getAttribute('href')).includes('#stateOverview'),'Governor map must jump to statewide races within Ohio State Desk');
 await officeDesk.close();
 const homeMobile=await browser.newPage({viewport:{width:390,height:844}});
 await homeMobile.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 const mobileErrors=[];homeMobile.on('pageerror',e=>mobileErrors.push(e.message));
 await homeMobile.goto(root+'/states/?view=final',{waitUntil:'domcontentloaded'});
 await homeMobile.waitForFunction(()=>document.querySelector('#powerCards')?.dataset.powerReady==='true'&&document.querySelectorAll('#watchCards .watch-card').length>0,null,{timeout:30000});
  await homeMobile.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:65000});
  const mobileSimTop=(await homeMobile.locator('#edSimulationPanel').boundingBox()).y;
  const mobileWatchTop=(await homeMobile.locator('#watchSection').boundingBox()).y;
  assert(mobileSimTop<mobileWatchTop&&mobileSimTop>0,'Final forecast maps must appear above races to watch on mobile');
  assert(await homeMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),'State Desk homepage must not scroll sideways on phone');
  assert((await homeMobile.locator('#watchCards .watch-card').count())>=1,'Mobile races carousel missing');
  assert((await homeMobile.locator('#powerCards .power-card').count())===3,'Mobile projected office balance missing');
 assert(mobileErrors.length===0,'Mobile State Desk browser errors: '+mobileErrors.join(', '));
 await homeMobile.locator('#watchSection').screenshot({path:'visual-checks/State-Desk-Races-To-Watch-Mobile.png'});
 await homeMobile.close();
 const postMobile=await browser.newPage({viewport:{width:390,height:844}});
 await postMobile.goto(root+'/states/',{waitUntil:'domcontentloaded'});
 await postMobile.waitForSelector('#postElectionDesk h1',{timeout:25000});
 assert(await postMobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4),'Post-election homepage mobile overflow');
 await postMobile.locator('#postElectionDesk').screenshot({path:'visual-checks/Post-Election-Results-Mobile.png'});
 await postMobile.close();
 const nationalNight=await browser.newPage({viewport:{width:1440,height:940}});
 const nightErrors=[];nationalNight.on('pageerror',e=>nightErrors.push(e.message));
 await nationalNight.goto(root+'/election-night/',{waitUntil:'domcontentloaded'});
 assert((await nationalNight.locator('.night-head.ed-head').count())===1,'Election Night must use the shared editorial masthead');
 assert((await nationalNight.locator('.night-shell.ed-shell').count())===1,'Election Night must use the State Desk content grid');
 assert((await nationalNight.locator('.ed-sectionline').count())>=1,'Election Night requires State Desk section label');

 const navTargets=await nationalNight.locator('.night-head nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
 assert(JSON.stringify(navTargets)===JSON.stringify(['../states/','#nationalBoard','#michiganSpotlight','../stats-for-nerds/']),'Election Night links to retired dedicated pages');
 assert((await nationalNight.locator('.night-links a[href="../state/?state=MI#stateGeography"]').count())===1,'Michigan historical county link must be clearly distinct from live board');
 await nationalNight.locator('#nightStateFilter').selectOption('MI');
 await nationalNight.waitForFunction(()=>document.querySelectorAll('#raceList .race-row').length>0&&document.querySelectorAll('#raceList .race-row').length<=506,null,{timeout:12000});
 assert((await nationalNight.locator('#raceList').innerText()).includes('Michigan'),'State-specific live filter failed');
 await nationalNight.locator('#nightStateFilter').selectOption('all');

 await nationalNight.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83,null,{timeout:30000});
 await nationalNight.waitForFunction(()=>document.querySelector('#nationalCount')?.textContent.includes('506 indexed races'),null,{timeout:30000});
 assert((await nationalNight.locator('#raceList .race-row[id$="-SENATE"]').count())===35,'National election-night board must index all 35 Senate contests, not only 17 forecast races');
 assert((await nationalNight.locator('#balanceOfPower').count())===0,'Election Night must not display pre-election power bars');

 assert(/\d+\s*\/\s*83/.test((await nationalNight.locator('#miCounties').innerText())),'Michigan live county count must retain the 83-county denominator');
 assert(/^(?:—|[\d,]+)$/.test((await nationalNight.locator('#miD').innerText()).trim()),'Michigan live vote total must be numeric or missing, never synthetic');
 assert(/^(?:D|R) \+\d+(?:\.\d+)?$|^Even$/.test((await nationalNight.locator('#miForecast').innerText()).trim()),'Michigan Election Night forecast must show a model margin');
 assert(nightErrors.length===0,'National Election Night JS errors: '+nightErrors.join(', '));
 await nationalNight.locator('#michiganSpotlight').screenshot({path:'visual-checks/National-Election-Night-Michigan-83.png'});
 await nationalNight.locator('[data-office="Governor"]').click();
 await nationalNight.waitForFunction(()=>document.querySelectorAll('#raceList .race-row').length===36,null,{timeout:12000});
 await nationalNight.locator('[data-office="House"]').click();
 await nationalNight.waitForFunction(()=>document.querySelectorAll('#raceList .race-row').length===435,null,{timeout:12000});
 await nationalNight.locator('[data-office="All"]').click();
 await nationalNight.screenshot({path:'visual-checks/National-Election-Night-Full-Desk.png',fullPage:true});
 console.log('NATIONAL NIGHT QA PASS',JSON.stringify({counties:83,contests:506,gov:36,house:435,errors:nightErrors}));
 await nationalNight.close();
 const nightMobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await nightMobile.goto(root+'/election-night/',{waitUntil:'domcontentloaded'});
 await nightMobile.waitForFunction(()=>document.querySelectorAll('#miCountyMap path.county').length===83,null,{timeout:30000});
 const navBox=await nightMobile.locator('.night-head nav').boundingBox();
 const brandBox=await nightMobile.locator('.night-brand').boundingBox();
 const themeBox=await nightMobile.locator('#appearance').boundingBox();
 const mastBox=await nightMobile.locator('.night-head .ed-mast').boundingBox();
 assert(navBox.y>brandBox.y,'Editorial Election Night nav must have its own second row');
 assert(themeBox.y>=brandBox.y,'Theme and brand controls must not overlap vertically');
 assert(mastBox.x>=brandBox.x,'Editorial center masthead must remain visible');
 assert((await nightMobile.locator('.night-head nav a').count())===4,'Mobile nav must contain four State Desk destinations');
 assert(await nightMobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+4),'Editorial Election Night mobile masthead must not overflow');
 assert((await nightMobile.locator('.night-head .ed-mast a').innerText())==='Election Results','National masthead heading missing');
  await nightMobile.locator('.night-head').screenshot({path:'visual-checks/National-Election-Night-Mobile-Header.png'});
 await nightMobile.close();
 const governorPage=await browser.newPage({viewport:{width:1440,height:900}});
 await governorPage.goto(root+'/governors/',{waitUntil:'domcontentloaded'});
 await governorPage.waitForFunction(()=>document.querySelector('#coverage')?.textContent.includes('Ervin-adjusted'),null,{timeout:20000});
 assert((await governorPage.locator('#govCards .gov-card').count())===36,'Governor board no longer covers all 36 elections');
 const ohioCard=governorPage.locator('#govCards [data-code="OH"]');
 assert(/(?:D|R) \+\d+(?:\.\d+)?|Even/.test(await ohioCard.innerText()),'Ohio governor card must show a numeric estimate');

 assert((await governorPage.locator('#govUSMap a[data-code="OH"] path').count())===1,'Ohio governor state geometry must remain visible');
 assert((await governorPage.locator('#govCards .er-hist-table').count())>0,'No governor historical error evidence on new board');
 assert(/\d+ Ervin-adjusted/.test(await governorPage.locator('#coverage').innerText()),'Governor historical adjustments must be counted');
 assert((await governorPage.locator('#govBacktestN, #govBacktestRaw, #govBacktestRows').count())===0,'Long historical comparison metrics must not clutter the governor board');
 assert((await governorPage.locator('a[href="../research/governor-same-office-backtest-2026-11-02.json"]').count())>0,'Archived full governor backtest must remain available by direct research link');
 assert((await governorPage.locator('#govCards .er-hist-table').count())===36,'State-specific governor source comparisons should still be retained');
 await governorPage.screenshot({path:'visual-checks/Governor-Ervin-Corrections.png',fullPage:true});
 await ohioCard.screenshot({path:'visual-checks/Ohio-Governor-Ervins-Take-Verified.png'});
 await governorPage.close();
 const ohioDetail=await browser.newPage({viewport:{width:390,height:844}});
 await ohioDetail.goto(root+'/state/?state=OH',{waitUntil:'domcontentloaded'});
 await ohioDetail.waitForFunction(()=>/^(?:D|R) \+\d+(?:\.\d+)?$|^Even$/.test(document.querySelector('#heroGovernor')?.textContent||''),null,{timeout:30000});
 const ohioMargin=(await ohioDetail.locator('#heroGovernor').innerText()).trim();assert((await ohioDetail.locator('#stateRaceCards').innerText()).includes(ohioMargin),'Ohio statewide cards must agree with the forecast hero');
 assert(!ohioMargin.includes('-0.0'),'Negative zero Ohio regression');
 await ohioDetail.screenshot({path:'visual-checks/Ohio-State-Desk-Actual-Mobile.png',fullPage:false});
 await ohioDetail.close();
 // Verify all-state aggregate ratings, hover D/R/T counts and each race margin.
 const stateAtlas=await browser.newPage({viewport:{width:1440,height:940}});
 // Keep forecast-only state hover checks on a controlled pre-close clock;
 // live returns must not be required to display fictional D/R/T forecasts.
 await stateAtlas.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 const atlasErrors=[];stateAtlas.on('pageerror',e=>atlasErrors.push(e.message));
 await stateAtlas.goto(root+'/states/?view=final',{waitUntil:'domcontentloaded'});
 await stateAtlas.waitForFunction(()=>document.querySelectorAll('#usMap path[data-state]').length===50&&document.querySelector('#aggregateLegend')?.textContent.includes('states with forecasts'),null,{timeout:27000});
 await stateAtlas.locator('#usMap a[data-state-link="MI"]').focus();
 await stateAtlas.waitForFunction(()=>document.querySelector('#stateMapTooltip')&&!document.querySelector('#stateMapTooltip').hidden,null,{timeout:8000});
 const tipText=await stateAtlas.locator('#stateMapTooltip').innerText();
 assert(tipText.includes('Michigan')&&tipText.includes('U.S. Senate')&&tipText.includes('House:')&&/\d+D.{1,3}\d+R.{1,3}\d+T/.test(tipText),'State hover does not display all race types, margins and aggregate D-R-T totals: '+tipText.slice(0,500));
 assert(atlasErrors.length===0,'State atlas errors: '+atlasErrors.join(', '));
 await stateAtlas.screenshot({path:'visual-checks/States-Aggregate-2026-Michigan-Hover.png',fullPage:false});
 await stateAtlas.close();
 const miBiasPage=await browser.newPage({viewport:{width:390,height:844}});
 await miBiasPage.goto(root+'/state/?state=MI#stateSources',{waitUntil:'domcontentloaded'});
 await miBiasPage.waitForFunction(()=>document.querySelector('#miCandidateEffect')?.innerText.includes('median governor-minus-Senate margin'),null,{timeout:30000});
 assert((await miBiasPage.locator('#stateResearchDrawer').getAttribute('open'))!==null,'A direct citation anchor should open the research drawer');
 assert((await miBiasPage.locator('#miCandidateEffect').innerText()).includes('Scientific status: NOT VALIDATED'),'Scientific limitations should be visible within deliberate research drawer');

 const miBias=await miBiasPage.locator('#miCandidateEffect').innerText();
 assert(miBias.includes('not evidence of a hidden voting preference')||miBias.includes('not evidence of a hidden voting preference.'),'Candidate audit omitted stated-versus-hidden distinction');
 assert(miBias.includes('not applied'),'Unverified Muslim Bradley effect improperly presented as a correction');
 assert(miBias.includes('candidate')&&/\d+(?:\.\d+)?/.test(miBias),'Michigan candidate-strength sensitivity needs documented numbers');
 assert((await miBiasPage.locator('#miCandidateEffect details').count())>=3,'Sensitivity evidence and counterexample controls missing');
 await miBiasPage.locator('#miCandidateEffect').screenshot({path:'visual-checks/Michigan-Candidate-Effect-Evidence-Mobile.png'});
 await miBiasPage.close();
 const countyNight=await browser.newPage({viewport:{width:1440,height:940}}),nightPageErrors=[];
 countyNight.on('pageerror',e=>nightPageErrors.push(e.message));
 await countyNight.goto(root+'/state/?state=MI#stateResults',{waitUntil:'domcontentloaded'});
 await countyNight.waitForFunction(()=>/^(?:D|R) \+\d+(?:\.\d+)?$|^Even$/.test(document.querySelector('#heroSenate')?.textContent||''),null,{timeout:20000});
 const miMargin=(await countyNight.locator('#heroSenate').innerText()).trim();assert((await countyNight.locator('#stateRaceCards').innerText()).includes(miMargin),'Michigan state hero and race card must agree');
 await countyNight.locator('#stateOverview').screenshot({path:'visual-checks/MI-Ervins-Take-Candidate-Strength.png'});
 await countyNight.waitForFunction(()=>document.querySelectorAll('#countyMap path.county').length===83&&document.querySelectorAll('#countyNightMap').length===0,null,{timeout:26000});
 await countyNight.waitForFunction(()=>/\d+\s*\/\s*83/.test(document.querySelector('#nightCountyCount')?.textContent||''),null,{timeout:8000});
 assert(/^(?:—|[\d,]+)$/.test((await countyNight.locator('#nightCountyDem').innerText()).trim()),'Michigan county vote subtotal must be a reported number or unavailable');
 assert((await countyNight.locator('#nightCountyRows tr').count())===83,'Michigan county night reporting table incomplete');
 assert(nightPageErrors.length===0,'Michigan state county desk errors: '+nightPageErrors.join(', '));
 await countyNight.locator('#stateGeography').screenshot({path:'visual-checks/MI-Unified-Forecast-And-Results-83-Counties.png'});
 await countyNight.goto(root+'/state/?state=TX#stateResults',{waitUntil:'domcontentloaded'});
 await countyNight.waitForFunction(()=>document.querySelectorAll('#countyMap path.county').length===254&&document.querySelectorAll('#countyNightMap').length===0,null,{timeout:27000});
 assert(/^(?:—|[\d,]+)$/.test((await countyNight.locator('#nightCountyDem').innerText()).trim()),'Texas county vote subtotal must be reported or unavailable');
 await countyNight.close();
 console.log('ALL STATE NIGHT & AGGREGATE QA PASS',JSON.stringify({hover:'MI all races',states:50,miCounties:83,txCounties:254,errors:atlasErrors.concat(nightPageErrors)}));
 // Verify all 435 House model ratings and a genuinely interactive district-level geographic page.
 const nationalHouse=await browser.newPage({viewport:{width:1440,height:940}});
 await nationalHouse.goto(root+'/house/',{waitUntil:'domcontentloaded'});
 await nationalHouse.waitForFunction(()=>document.querySelector('#houseModelSummary')?.textContent.includes('House ratings and district evidence'),null,{timeout:25000});
 const nationalSummary=await nationalHouse.locator('#houseModelSummary').innerText();
 assert(nationalSummary.includes('Numerical House scenarios')&&nationalSummary.includes('reconstructed estimates')&&nationalSummary.includes('Special ballot formats'),'House forecast must distinguish comparable numerical models from unclassified redrawn districts');
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
   await page.waitForFunction(state=>{const txt=document.querySelector('#districtDetail')?.textContent||'';return txt.includes('ERVIN HOUSE · 2026 DISTRICT MODEL')&&(['TX','CA'].includes(state)?txt.includes('Redrawn district:'):true);},code,{timeout:25000});
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

 // Rehearse the historical election-night visualization in the forecast archive, not the post-election newsroom.
 const electionDesk=await browser.newPage({viewport:{width:1440,height:940}});
 await electionDesk.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 const deskErrors=[];electionDesk.on('pageerror',e=>deskErrors.push(e.message));
 await electionDesk.goto(root+'/states/?preview=closing',{waitUntil:'domcontentloaded'});
 await electionDesk.waitForFunction(()=>document.querySelector('#edSimulationPanel')?.dataset.coverageMode==='live'&&
  document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true'&&
  document.querySelector('#edFinalHeadline')?.textContent.includes('COVERAGE')&&
  document.querySelector('#edLiveCommentary')?.hidden===false&&
  document.querySelectorAll('#edSimMap a[data-sim-district]').length===435,null,{timeout:85000});
 assert((await electionDesk.locator('#edResultsStage').count())===0,'The 5:55 transition must not introduce a duplicate lower results stage');
 assert((await electionDesk.locator('#edSimMap path.ed-live-lead-N').count())===435,'No House race may retain forecast coloring when no results are reported');
 assert((await electionDesk.locator('#edSimMap a[data-sim-district="MI-09"]').getAttribute('href')).includes('/election-night/?state=MI&race=MI-09#nationalBoard'),'House district must open exactly its live race');
 assert((await electionDesk.locator('#edCommentaryEntries .ed-commentary-item').count())===1,'Unreported election cannot generate fictional vote commentary');
 for(const [label,office,race] of [['Senate','senateD','MI-SENATE'],['Governors','governorsD','MI-GOVERNOR']]){
  await electionDesk.locator('#edSimTabs button').filter({hasText:label}).click();
  await electionDesk.waitForFunction(o=>document.querySelector('#edSimMap')?.dataset.simOffice===o&&document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',office,{timeout:30000});
  assert((await electionDesk.locator('#edSimMap path.ed-live-lead-N').count())===50,label+' must remain gray before accepted reporting');
  assert((await electionDesk.locator('#edSimMap a[data-sim-state="MI"]').getAttribute('href')).includes('race='+race),label+' map must link to the precise race');
  if(office==='senateD')assert((await electionDesk.locator('#edSimMap a[data-sim-state="CO"]').getAttribute('href')).includes('race=CO-SENATE'),'Unmodeled but scheduled Colorado Senate race must have its exact live link');
  const insets=await electionDesk.evaluate(()=>['AK','HI'].map((code,i)=>{
   const p=document.querySelector('#edSimMap g[data-sim-inset="'+code+'"] path')?.getBoundingClientRect();
   const b=document.querySelectorAll('#edSimMap .ed-sim-map-insets rect')[i]?.getBoundingClientRect();
   return !!(p&&b&&p.width>10&&p.height>8&&p.left>=b.left-2&&p.right<=b.right+2&&p.top>=b.top-2&&p.bottom<=b.bottom+2);
  }));
  assert(insets.every(Boolean),label+' insets must match the House layout');
  await electionDesk.locator('#edSimulationPanel').screenshot({path:'visual-checks/Election-Night-'+label+'-5-55-Desktop.png'});
 }

 // Test only in this browser memory. No fake returns are written to any file.
 await electionDesk.locator('#edSimTabs button').filter({hasText:'House'}).click();
 await electionDesk.waitForFunction(()=>document.querySelector('#edSimMap')?.dataset.simOffice==='house'&&
   document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',null,{timeout:35000});
 await electionDesk.evaluate(()=>{
  Date.now=()=>Date.parse('2026-11-04T06:00:00Z');
  const timestamp='2026-11-04T05:30:00Z',source='CivicAPI (controlled local fixture)';
  const row=(id,office,d,r)=>({id,office,total:d+r,asOf:timestamp,source,
   sourceURL:'https://example.org/local-test-only',precincts:12.5,
   candidates:[{name:'Fixture Democrat',votes:d,party:'D'},{name:'Fixture Republican',votes:r,party:'R'}]});
  window.ERVIN_HOME_RESULTS={races:{
   'MI-09':row('MI-09','House',3200,3000),
   'MI-SENATE':row('MI-SENATE','Senate',55000,51000),
   'MI-GOVERNOR':row('MI-GOVERNOR','Governor',45000,47000)
  }};
  window.dispatchEvent(new Event('ervin:home-results-update'));
 });
 await electionDesk.waitForFunction(()=>document.querySelector('#edSimMap a[data-sim-district="MI-09"] path')?.classList.contains('ed-live-lead-D')&&
   document.querySelector('#edFinalCallSummary')?.dataset.liveReports==='1'&&
   document.querySelectorAll('#edCommentaryEntries .ed-commentary-item').length>=2,null,{timeout:25000});
 assert((await electionDesk.locator('#edSimMap path.ed-live-lead-N').count())===434,'Unreported House districts must stay neutral while only MI-09 is reporting');
 assert((await electionDesk.locator('#edCommentaryEntries .ed-commentary-item').first().innerText()).includes('unofficial'),'New vote commentary must distinguish reported totals from a winner call');
 assert((await electionDesk.locator('#edCommentaryEntries .ed-commentary-item').first().locator('a[href*="race="]').count())===1,'Commentary must link directly to the race that changed');
 await electionDesk.locator('#edSimTabs button').filter({hasText:'Senate'}).click();
 await electionDesk.waitForFunction(()=>document.querySelector('#edSimMap')?.dataset.simOffice==='senateD'&&
   document.querySelector('#edSimMap a[data-sim-state="MI"] path')?.classList.contains('ed-live-lead-D')&&
   document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',null,{timeout:25000});
 await electionDesk.locator('#edSimTabs button').filter({hasText:'Governors'}).click();
 await electionDesk.waitForFunction(()=>document.querySelector('#edSimMap')?.dataset.simOffice==='governorsD'&&
   document.querySelector('#edSimMap a[data-sim-state="MI"] path')?.classList.contains('ed-live-lead-R')&&
   document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true',null,{timeout:25000});
 await electionDesk.locator('#edSimulationPanel').screenshot({path:'visual-checks/Election-Night-Governors-Verified-Local-Fixture.png'});
 assert(deskErrors.length===0,'Election-night hero JavaScript errors: '+deskErrors.join(' | '));
 await electionDesk.close();

 // Regression: a new valid file must update the already-open page.
 // Fixtures are intercepted locally and never written to any published file.
 const refreshPage=await browser.newPage({viewport:{width:1100,height:800}});
 await refreshPage.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-04T06:00:00Z')});
 let refreshBody={version:1,election:'2026-11-03',races:{}},refreshFetches=0;
 await refreshPage.route('**/civicapi/races.json*',async route=>{
  refreshFetches++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(refreshBody)});
 });
 await refreshPage.route('https://openamerica.io/elections/results.json?**',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 await refreshPage.goto(root+'/states/?preview=closing',{waitUntil:'domcontentloaded'});
 await refreshPage.waitForFunction(()=>document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true'&&
  document.querySelectorAll('#edSimMap a[data-sim-district]').length===435&&
  !!window.ERVIN_HOME_RESULTS,null,{timeout:85000});
 assert((await refreshPage.locator('#edSimMap path.ed-live-lead-N').count())===435,'The first empty vote snapshot must not assign a party leader');
 refreshBody={version:1,election:'2026-11-03',races:{
  'MI-09':{office:'house',source:'civicAPI',verified:true,election:'2026-11-03',
   total:6200,asOf:'2026-11-04T05:30:00Z',
   sourceUrl:'https://example.org/browser-only-fixture',precinctsReporting:12.5,
   candidates:[{name:'Fixture Democrat',votes:3200,party:'D'},{name:'Fixture Republican',votes:3000,party:'R'}]}
 }};
 await refreshPage.evaluate(()=>window.dispatchEvent(new Event('ervin:check-results-now')));
 await refreshPage.waitForFunction(()=>document.querySelector('#edSimMap a[data-sim-district="MI-09"] path')?.classList.contains('ed-live-lead-D')&&
  window.ERVIN_HOME_RESULTS?.races?.['MI-09']?.total===6200,null,{timeout:35000});
 assert(refreshFetches>=2,'Live results request was cached and did not refetch after newly published results');
 assert((await refreshPage.locator('#edSimMap path.ed-live-lead-N').count())===434,'Unreported districts must remain neutral after one live update');
 await refreshPage.close();
 console.log('LIVE RESULTS REFRESH CACHE REGRESSION PASS · already-open page accepts source-validated updates without reload');
 const electionMobile=await browser.newPage({viewport:{width:390,height:844}});
 await electionMobile.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-03T21:30:00Z')});
 await electionMobile.goto(root+'/states/?preview=closing',{waitUntil:'domcontentloaded'});
 await electionMobile.waitForFunction(()=>document.querySelector('#edSimulationPanel')?.dataset.liveReady==='true'&&document.querySelector('#edLiveCommentary')?.hidden===false,null,{timeout:85000});
 const nightOverflow=await electionMobile.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert(nightOverflow<6,'Live coverage creates horizontal phone overflow '+nightOverflow+'px');
 await electionMobile.locator('#edSimulationPanel').screenshot({path:'visual-checks/Election-Night-5-55-Mobile.png'});
 await electionMobile.close();
 const archive=await browser.newPage({viewport:{width:1240,height:900}});
 await archive.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-04T06:00:00Z')});
 await archive.goto(root+'/states/?view=final#edSimulationPanel',{waitUntil:'domcontentloaded'});
 await archive.waitForFunction(()=>document.querySelectorAll('#edSimMap a[data-sim-district]').length===435&&
  document.querySelector('#edFinalHeadline')?.textContent.includes('PREDICTION'),null,{timeout:85000});
 assert((await archive.locator('#edSimMap path.ed-sim-proj-D,#edSimMap path.ed-sim-proj-R').count())===435,'The frozen final election prediction must remain accessible after 5:55');
 assert(await archive.locator('#edLiveCommentary').isHidden(),'Archived pre-election forecast should not pretend to be live');
 await archive.locator('#edSimulationPanel').screenshot({path:'visual-checks/Archived-Final-Prediction-After-5-55.png'});
 await archive.close();
 console.log('ELECTION NIGHT LIVE HERO PASS · 435 precise links · AK/HI aligned · zero invented votes');
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
