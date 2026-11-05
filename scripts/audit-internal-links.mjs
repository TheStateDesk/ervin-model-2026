#!/usr/bin/env node
/* Validate internal HTML links and suppress retired site-header destinations. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=[];
function scan(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules'].includes(e.name))continue;
  const p=path.join(dir,e.name);
  if(e.isDirectory())scan(p);
  else if(e.name.endsWith('.html'))pages.push(p);
 }
}
scan(root);
const issues=[];
let links=0;
for(const file of pages){
 const html=fs.readFileSync(file,'utf8'),relative=path.relative(root,file).split(path.sep).join('/');
 const pattern=/<(?:a|link|script|img|source|iframe)\b[^>]*?\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
 let m;
 while((m=pattern.exec(html))){
  const val=m[2].replace(/&amp;/g,'&').trim();
  if(!val||val==='#'||/^(https?:|\/\/|mailto:|tel:|data:|blob:|javascript:)/i.test(val)||/[\$\{\}]/.test(val)||val.includes("'")||val.includes('"'))continue;
  let url;
  try{url=new URL(val,'https://ervin.invalid/'+relative);}catch{issues.push(relative+': invalid URL '+val);continue;}
  if(url.origin!=='https://ervin.invalid')continue;
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');
  let target=path.resolve(root,rel);
  if(url.pathname.endsWith('/')||(!path.extname(target)&&!fs.existsSync(target)))target=path.join(target,'index.html');
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  links++;
  if(!(target===root||target.startsWith(root+path.sep))||!fs.existsSync(target)){issues.push(relative+': broken link '+val);continue;}
  if(url.hash&&/\.html$/i.test(target)&&!val.includes('?')){
   const hash=decodeURIComponent(url.hash.slice(1));
   const targetHtml=target===file?html:fs.readFileSync(target,'utf8');
   const ids=new Set([...targetHtml.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/g)].map(x=>x[2]));
   // The results-first homepage adds its editorial modules after DOM ready.
   // Audit their source rather than rejecting intentionally JS-mounted anchors.
   const dynamicHome=new Set(['postCloseRaces','postAnalysis','postElectionDesk']);
   const injected=rel==='states/index.html'&&hash&&dynamicHome.has(hash)&&fs.readFileSync(path.join(root,'scripts/post-election-2026.js'),'utf8').includes('id="'+hash+'"');
   if(hash&&!ids.has(hash)&&!injected)issues.push(relative+': missing anchor '+val);
  }
 }
}
const retired=fs.readFileSync(path.join(root,'elections/overview/index.html'),'utf8');
if(!retired.includes('noindex,nofollow')||!retired.includes('location.replace')||retired.includes('id="siteNavigation"'))issues.push('Retired Election Center must remain redirect-only without a visible header');
const headers=['index.html','election-night/index.html','elections/index.html','michigan/index.html','counties-watch/index.html','michigan/election-night/index.html'];
for(const rel of headers){
 const h=fs.readFileSync(path.join(root,rel),'utf8').match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0]||'';
 if(/href=["'][^"']*(?:elections\/overview\/|#researchLab)/i.test(h))issues.push(rel+': old research or Election Center header link');
 if(/<nav[\s\S]*?href=["'](?:\.\.\/)*michigan\/election-night\//i.test(h))issues.push(rel+': Michigan-only election night linked from header');
}
const nightHtml=fs.readFileSync(path.join(root,'election-night/index.html'),'utf8');
const nightHeader=nightHtml.match(/<header class="ed-head night-head"[\s\S]*?<\/header>/i)?.[0]||'';
const nightNav=nightHeader.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0]||'';
const nightLinks=[...nightNav.matchAll(/href=["']([^"']+)["']/g)].map(x=>x[1]);
const expectedNightLinks=['../states/','#nationalBoard','#michiganSpotlight','../stats-for-nerds/'];
if(JSON.stringify(nightLinks)!==JSON.stringify(expectedNightLinks))issues.push('Election Night nav must link only to the consolidated State Desk and on-page sections: '+nightLinks.join(', '));
if(nightHtml.includes('href="../michigan/election-night/"'))issues.push('Election Night retains link to retired separate Michigan results page');
if(!nightHtml.includes('href="../state/?state=MI#stateGeography"'))issues.push('Michigan context must link to consolidated county-history section');
if(nightHtml.includes('href="../state/?state=MI#stateResults"'))issues.push('Live national desk still points to retired results panel');
// Public pages must not navigate visitors into the retired standalone House,
// governor, election-center or original research interfaces. Archived JSON
// data may still be linked and remains available for source inspection.
for(const rel of ['states/index.html','state/index.html','stats-for-nerds/index.html','election-night/index.html']){
 const html=fs.readFileSync(path.join(root,rel),'utf8');
 const a=[...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(x=>x[1]);
 const retired=a.filter(u=>/^\.\.\/(?:house|governors|elections)(?:\/|$)/.test(u)&&!(/\.(?:json|csv|md)(?:[?#]|$)/.test(u)));
 if(retired.length)issues.push(rel+': public interface links to retired pages '+retired.join(', '));
}
const front=fs.readFileSync(path.join(root,'states/index.html'),'utf8');
const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
// The newspaper-style front page is the canonical public entry point.
// Keep the election dashboard available at /states/ without redirecting readers there.
if(!entry.includes('<title>The State Desk')||!entry.includes('aria-label="Primary sections"')||!(entry.includes('href="analysis/"')||entry.includes('href="./analysis/"'))||!entry.includes('href="states/"')||!entry.includes('AI assistance')||entry.includes('location.replace'))issues.push('Site root must show the State Desk newsroom homepage, preserve election-desk navigation and footer disclosure');
if(!front.includes('id="watchSection"')||!front.includes('id="balanceOfPower"')||!front.includes('id="powerCards"'))issues.push('State Desk homepage missing races carousel or projected office balance');
if(front.indexOf('id="watchSection"')>front.indexOf('id="balanceOfPower"')||front.indexOf('id="balanceOfPower"')>front.indexOf('id="nationMap"'))issues.push('The State Desk should show the races carousel and office balance before the geographic atlas');
if(!front.includes('../scripts/home-election-2026.js')||!front.includes('../scripts/home-power.js'))issues.push('National forecast scripts not loaded on actual homepage');
for(const rel of ['state/app.js','state/district-extra.js']){
 const body=fs.readFileSync(path.join(root,rel),'utf8');
 if(/href=\\?["']\.\.\/elections\//.test(body)||body.includes('Separate technical race dossier'))issues.push(rel+': runtime links to retired standalone district view');
}
const balanceEngine=fs.readFileSync(path.join(root,'election-night/power.js'),'utf8');
if(!balanceEngine.includes('states/?office=house#nationMap')||!balanceEngine.includes('states/?office=governor#nationMap'))issues.push('Home balance cards still link to old House or governor boards');
if(!front.includes('id="officeFocus"'))issues.push('House / governor focused state chooser missing from State Desk');
if(!nightHtml.includes('class="ed-head night-head"')||!nightHtml.includes('class="night-shell ed-shell"'))issues.push('Election Night has not adopted State Desk editorial layout');

if(/(?:id="(?:advancedPollingDrawer|researchLab|forecast-settings|races)"|window\.ERVIN_DATA|href=["'][^"']*(?:#researchLab|#races|#tabs|\?source=))/i.test(front))issues.push('Old research dashboard controls exposed on State Desk homepage');
if(front.includes('href="../elections/overview/"'))issues.push('State Desk links into retired election research dashboard');
for(const rel of ['governors/index.html','states/index.html','state/index.html']){
 const html=fs.readFileSync(path.join(root,rel),'utf8');
 if(!html.includes('statewide-ervin.js?v=20261102-power-oh-pollrefresh-v2'))issues.push(rel+': stale governor model script');
}
if(issues.length){console.error('INTERNAL LINK AUDIT FAILED:\n'+issues.join('\n'));process.exitCode=1;}
else console.log('INTERNAL LINK AUDIT PASS',JSON.stringify({htmlPages:pages.length,checkedLocalLinks:links,brokenLinks:0,retiredNavigation:0}));
