#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const file='editorial/claims.json';
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(manifest.schema,1);
assert(fs.readFileSync('index.html','utf8').includes('AI assistance'),'Missing homepage editorial disclosure');
assert.equal(manifest.articles.length,10);
let claims=0,sourceCount=0;
const slugs=new Set();
for(const item of manifest.articles){
 assert(/^[a-z0-9-]+$/.test(item.slug),'Unsafe slug');
 assert(!slugs.has(item.slug),'Duplicate article slug');slugs.add(item.slug);
 assert(item.ai_assisted===true&&item.author_approval_required===true,'Editorial approval requirement absent');
 const article=path.join('analysis',item.slug,'index.html');
 const html=fs.readFileSync(article,'utf8');
 assert(/<a\s+href="https?:/i.test(html),'Missing source links '+article);
 for(const source of item.source_links){
  assert(typeof source==='string'&&source.startsWith('https://'),'Invalid source link');
  assert(html.includes(source),'Source inventory not matched on page: '+article+' '+source);
  sourceCount++;
 }
 for(const row of item.claims){
  claims++;
  assert(row.claim&&row.claim.length>=15,'Claim description too vague');
  assert(row.source_links.length+row.local_data_files.length>0,'Unreferenced claim: '+item.slug);
  for(const source of row.source_links)assert(item.source_links.includes(source),'Claim URL absent from source inventory');
  for(const rel of row.local_data_files){
   assert(typeof rel==='string'&&rel.startsWith('../../'),'Dataset link needs explicit repository-relative provenance: '+rel);
   const absolute=path.normalize(path.join('analysis',item.slug,rel));
   assert(!absolute.startsWith('..')&&fs.existsSync(absolute),'Dataset file missing: '+absolute);
  }
 }
}
console.log('PASS: '+slugs.size+' published features / '+claims+' mapped headline assertions / '+sourceCount+' source links. Editorial source verification and licensing remain human responsibilities.');
