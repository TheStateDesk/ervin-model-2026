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
 // Preflight the legacy homepage smoke as well; this blocked GitHub Pages despite healthy county maps.
 const homepage=await browser.newPage({viewport:{width:1200,height:950}});
 await homepage.goto(root+'/tests/browser_smoke.html',{waitUntil:'domcontentloaded'});
 await homepage.waitForFunction(()=>['PASS','FAIL'].includes(document.querySelector('#report')?.dataset.status),null,{timeout:45000});
 const homepageStatus=await homepage.locator('#report').getAttribute('data-status');
 const homepageReport=await homepage.locator('#report').innerText();
 if(homepageStatus!=='PASS')throw Error('Homepage smoke regression: '+homepageReport.slice(0,2400));
 console.log('HOMEPAGE BROWSER SMOKE PASS '+homepageReport.slice(0,130));
 await homepage.close();
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
