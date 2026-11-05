#!/usr/bin/env node
/* Uniform newspaper shell and section-link regression checks. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(), read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tabs=[['Home',''],['Congress','congress/'],['White House','white-house/'],['States','states-news/'],['Policy & Economy','policy-economy/'],['Analysis','analysis/'],['Election Results','results/'],['Forecast Archive','archive/']];
const pages=[];
function walk(dir){
 for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  const rel=path.join(dir,e.name).replaceAll('\\','/');
  if(e.isDirectory()){if(!['.git','node_modules','tests'].includes(e.name))walk(rel)}
  else if(rel.endsWith('.html')&&rel!=='elections/overview/index.html')pages.push(rel);
 }
}
walk('');
assert(pages.length>=30,'Too few public HTML pages covered by shared chrome: '+pages.length);
for(const p of pages){
 const h=read(p),up='../'.repeat(p.split('/').length-1)||'./';
 assert(h.includes('class="td-global-header"')&&h.includes('class="td-site-footer"'),p+' lacks shared newspaper header/footer');
 assert(h.includes('td-newsroom.css'),p+' is missing shared stylesheet');
 const mainTag=h.match(/<main\\b[^>]*>/i)?.[0]||'';
 const mainId=mainTag.match(/\\bid="([^"]+)"/)?.[1];
 assert(mainId&&h.includes('class="td-skip" href="#'+mainId+'"'),p+' has no working keyboard skip anchor');
 assert(h.includes('class="td-global-nav"'),p+' lacks real section navigation');
 for(const [name,target] of tabs)assert(h.includes('href="'+up+target+'"'),p+' has no working '+name+' section link');
}
const rootHtml=read('index.html');
assert(!read('about/index.html').includes('AI assistance'),'The publication notice belongs in the homepage footer rather than a second About-page disclosure');
assert(!/editorial preview|proposed analysis|remains unpublished/i.test(rootHtml),'Unpublished draft label visible on public front page');
assert(rootHtml.includes('href="states/"'),'Preserved interactive election atlas must remain accessible');
assert(rootHtml.includes('AI assistance')&&rootHtml.indexOf('AI assistance')>rootHtml.lastIndexOf('<footer'),'Homepage editorial notice must be in footer only');
for(const section of ['congress','white-house','states-news','policy-economy','analysis']){
 const s=read(section+'/index.html');
 assert(s.includes('class="td-topic-grid"'),section+' is missing its distinct story index');
 assert(s.includes('td-photo')&&s.includes('analysis/'),section+' is missing image-led story links');
 assert(!/EDITORIAL PREVIEW|remains unpublished|Proposed analysis/i.test(s),section+' still carries draft-only text');
}
for(const slug of ['congress-veto-budget-2027','medicaid-subsidies-2027','markets-2026-election-reaction','forecast-grade','forecast-coverage']){
 const h=read('analysis/'+slug+'/index.html');
 assert(h.includes('class="td-article-photo"')&&/<img\b[^>]+alt="[^"]+"/.test(h),slug+' has no illustrated article lead');
 assert(h.includes('Wikimedia Commons'),'Image needs source credit: '+slug);
}
const css=read('scripts/td-newsroom.css');
assert(css.includes('repeat(4,minmax(0,1fr))')&&css.includes('td-global-nav'),'Mobile nav must show all real section choices without clipping');
assert(!fs.existsSync(path.join(root,'editorial/EDITORIAL_STANDARDS.md')),'Internal editorial-policy document must not publish');
console.log('NEWSPAPER SHELL PASS',JSON.stringify({pages:pages.length,tabs:tabs.length,topicPages:5,articlePhotos:5}));
