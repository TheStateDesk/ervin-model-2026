#!/usr/bin/env node
// Exercise the published artifact at desktop and phone sizes.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.SITE_BASE_URL || 'http://127.0.0.1:8767/';
const server=process.env.SITE_BASE_URL ? null : spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory','_news_public'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const release=JSON.parse(fs.readFileSync('_news_public/release.json','utf8'));
const pages=Object.keys(release.files).filter(file=>file.endsWith('.html'));
let browser;
fs.mkdirSync('newsroom-checks',{recursive:true});
try {
  for(let attempt=0;attempt<40;attempt++) {
    try { if((await fetch(base)).ok) break; } catch {}
    if(attempt===39) throw Error('Preview did not start');
    await sleep(250);
  }
  browser=await chromium.launch({headless:true});
  for(const width of [390,1440]) {
    const page=await browser.newPage({viewport:{width,height:844}});
    for(const file of pages) {
      const response=await page.goto(new URL(file,base).href,{waitUntil:'domcontentloaded'});
      if(!response.ok()) throw Error(`${file}: HTTP ${response.status()}`);
      await page.waitForLoadState('load');
      const state=await page.evaluate(()=>({
        headline:!!document.querySelector('h1'),
        navigation:document.querySelectorAll('.td-global-nav a').length,
        overflow:document.documentElement.scrollWidth>innerWidth+2,
        missingStyles:[...document.querySelectorAll('link[rel=stylesheet]')].filter(link=>!link.sheet).map(link=>link.href),
      }));
      if(!state.headline||state.navigation!==5||state.overflow||state.missingStyles.length) throw Error(`${file} at ${width}: ${JSON.stringify(state)}`);
      for(const img of await page.locator('img').all()) {
        await img.scrollIntoViewIfNeeded();
        const loaded=await img.evaluate(async el=>{
          if(!el.complete) await new Promise(resolve=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',resolve,{once:true});setTimeout(resolve,20000)});
          return el.naturalWidth>0;
        });
        if(!loaded) throw Error(`${file}: photograph failed to load: ${await img.getAttribute('src')}`);
      }
      await page.evaluate(()=>window.scrollTo(0,0));
      if(file==='index.html'||file.includes('october-jobs')||file.includes('jay-rockefeller')) {
        await page.screenshot({path:path.join('newsroom-checks',`${width}-${file.replaceAll('/','-')}.png`),fullPage:true});
      }
      console.log(`PASS ${width}px ${file}`);
    }
    await page.goto(base);
    for(const link of await page.locator('.td-global-nav a').all()) {
      if(!await link.isVisible()) throw Error('Navigation link is hidden');
      const href=await link.getAttribute('href');
      const destination=new URL(href,base).href;
      await link.click();
      await page.waitForURL(destination);
      await page.goto(base);
    }
    await page.close();
  }
} finally {
  await browser?.close();
  server?.kill();
}
