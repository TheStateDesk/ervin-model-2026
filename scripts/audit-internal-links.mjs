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
   if(hash&&!ids.has(hash))issues.push(relative+': missing anchor '+val);
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
const nightHeader=nightHtml.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0]||'';
const nightNav=nightHeader.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0]||'';
const nightLinks=[...nightNav.matchAll(/href=["']([^"']+)["']/g)].map(x=>x[1]);
const expectedNightLinks=['../states/','#nationalBoard','#michiganSpotlight'];
if(JSON.stringify(nightLinks)!==JSON.stringify(expectedNightLinks))issues.push('Election Night nav must link only to the consolidated State Desk and on-page sections: '+nightLinks.join(', '));
if(nightHtml.includes('href="../michigan/election-night/"'))issues.push('Election Night retains link to retired separate Michigan results page');
if(!nightHtml.includes('href="../state/?state=MI#stateResults"'))issues.push('Michigan results must link to consolidated state dossier');
if(issues.length){console.error('INTERNAL LINK AUDIT FAILED:\n'+issues.join('\n'));process.exitCode=1;}
else console.log('INTERNAL LINK AUDIT PASS',JSON.stringify({htmlPages:pages.length,checkedLocalLinks:links,brokenLinks:0,retiredNavigation:0}));
