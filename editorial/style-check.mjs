#!/usr/bin/env node
// Editorial style lint: advisory, not a substitute for fact-checking.
import {readFileSync} from 'node:fs';
const files=process.argv.slice(2);
if(!files.length){console.error('Usage: node editorial/style-check.mjs <draft-article.html> ...');process.exit(2)}
const banned=['must not be conflated','not a photograph','this article does not','our first obligation','we cannot conclude'];
let warnings=0;
for(const file of files){
  const html=readFileSync(file,'utf8');
  const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
  const words=text.split(/\s+/).length;
  const warn=msg=>{warnings++;console.warn(file+': '+msg)};
  for(const phrase of banned)if(text.toLowerCase().includes(phrase))warn('Review defensive phrase: '+phrase);
  for(const term of ['unofficial','preliminary']){const n=(text.match(new RegExp('\\b'+term+'\\b','gi'))||[]).length;if(n>1)warn(term+' appears '+n+' times');}
  const neg=(text.match(/\b(?:not|no|never|cannot|can't|doesn't|isn't|won't|mustn't)\b/gi)||[]).length;
  if(neg>Math.max(2,Math.ceil(words/100)))warn(neg+' negations in '+words+' words');
  const h=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]?.replace(/<[^>]+>/g,'').trim()||'';
  if(h.endsWith('.'))warn('Headline ends in a period');
  if(/^(we|our|the state desk)\b/i.test(h))warn('Headline leads with publication');
  if(/EDITORIAL PROPOSAL|NOT PUBLISHED/.test(text))warn('Internal editorial status visible');
}
console.log('Editorial style warnings: '+warnings);
process.exit(warnings?1:0);
