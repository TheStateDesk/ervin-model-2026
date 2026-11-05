#!/usr/bin/env node
/**
 * One-time migration from the old project-site URL to thestatedesk.github.io.
 * Run ONLY after renaming the GitHub account and existing repository:
 *   geervin → TheStateDesk
 *   ervin-model-2026 → thestatedesk.github.io
 *
 * Dry run: node scripts/migrate-pages-url.mjs
 * Apply:   node scripts/migrate-pages-url.mjs --apply
 */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const apply=process.argv.includes('--apply');
const oldSite='thestatedesk.github.io';
const newSite='thestatedesk.github.io';
const oldRepo='TheStateDesk/thestatedesk.github.io';
const newRepo='TheStateDesk/thestatedesk.github.io';
const textFile=/\.(?:html?|css|[cm]?js|json|xml|ya?ml|md|txt|py|toml|svg|webmanifest|csv|sh)$/i;

if(apply){
 const remote=execFileSync('git',['remote','get-url','origin'],{encoding:'utf8'}).trim();
 if(!/TheStateDesk\/thestatedesk\.github\.io(?:\.git)?$/i.test(remote))
  throw Error('Refusing to apply: first rename the account and repository; remote is '+remote);
}
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const changed=[];
for(const file of tracked){
 if(!textFile.test(file)||!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
 const bytes=fs.readFileSync(file);
 if(bytes.includes(0))continue;
 const before=bytes.toString('utf8');
 let after=before.replaceAll(oldSite,newSite).replaceAll(oldRepo,newRepo)
  .replaceAll('geervin\\.github\\.io','thestatedesk\\.github\\.io')
  .replaceAll('thestatedesk.github.io',newSite)
  .replaceAll('/','/');
 if(after===before)continue;
 changed.push(file);
 if(apply)fs.writeFileSync(file,after);
}
console.log(JSON.stringify({mode:apply?'applied':'dry-run',
 old:'https://'+oldSite+'/',next:'https://'+newSite+'/',count:changed.length,files:changed},null,2));
console.log('Review the diff, test all site routes, deploy and inspect the live domain. The old github.io URL is not automatically redirected.');
