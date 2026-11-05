#!/usr/bin/env node
/* Check the actual newspaper interface on mobile and desktop in Chromium. */
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=8767,base='http://127.0.0.1:'+port+'/',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const pages=[['Home',''],['Congress','congress/'],['White House','white-house/'],['States','states-news/'],['Policy & Economy','policy-economy/'],['Analysis','analysis/'],['Election Results','results/'],['Forecast Archive','archive/']];
try{
 for(let i=0;i<40;i++){try{const result=await fetch(base);if(result.ok)break;}catch{}await sleep(250)}
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  for(const [name,path] of pages){
   const link=page.locator('.td-global-nav a',{hasText:name});
   if((await link.count())!==1)throw Error('Missing or duplicated '+name+' section tab at '+width);
   await link.click();
   await page.waitForURL(url=>url.pathname==='/'+path,{timeout:12000});
   const state=await page.evaluate(()=>({
    header:!!document.querySelector('.td-global-header'),
    h1:!!document.querySelector('main h1'),
    navOverflow:document.querySelector('.td-global-nav')?.scrollWidth>innerWidth+2,
    sectionTitle:document.title,
    draft:/EDITORIAL PREVIEW|remains unpublished|Proposed analysis/.test(document.body.innerText)
   }));
   if(!state.header||!state.h1||state.navOverflow||state.draft)throw Error('NEWSROOM PAGE FAILED '+width+' '+path+' '+JSON.stringify(state));
   console.log('NEWSPAPER NAV PASS '+width+' '+name+' '+state.sectionTitle);
   await page.goto(base,{waitUntil:'domcontentloaded'});
  }
  await page.close();
 }
 // Verify that every newly added editorial photograph actually loads, not merely exists as an <img>.
 const check=await browser.newPage({viewport:{width:390,height:800}});
 for(const slug of ['congress-veto-budget-2027','medicaid-subsidies-2027','markets-2026-election-reaction']){
  await check.goto(base+'analysis/'+slug+'/',{waitUntil:'domcontentloaded'});
  await check.locator('.td-article-photo img').waitFor({state:'visible'});
  // Wikimedia's image redirect can occasionally be slow or transiently fail.
  // Retry the actual image request, never accept a broken or merely present IMG.
  let imageLoaded=false;
  for(let attempt=1;attempt<=3&&!imageLoaded;attempt++){
   try {
    await check.waitForFunction(()=>{const im=document.querySelector('.td-article-photo img');return im?.complete&&im.naturalWidth>0},null,{timeout:20000});
    imageLoaded=true;
   } catch {
    const diag=await check.locator('.td-article-photo img').evaluate(im=>({src:im.currentSrc,complete:im.complete,width:im.naturalWidth}));
    console.warn('IMAGE ATTEMPT '+attempt+' '+slug+' '+JSON.stringify(diag));
    if(attempt<3)await check.locator('.td-article-photo img').evaluate(im=>{
      const src=new URL(im.src);src.searchParams.set('verify',String(Date.now()));im.src=src.href;
    });
   }
  }
  if(!imageLoaded)throw Error('Article photograph failed to load after 3 real network attempts: '+slug);
  console.log('ARTICLE IMAGE LOAD PASS '+slug);
 }
 await check.close();
 console.log('NEWSROOM MOBILE, DESKTOP AND PHOTOGRAPH CHECKS PASS');
}catch(error){console.error(error);process.exitCode=1}
finally{await browser?.close();server.kill('SIGTERM')}
