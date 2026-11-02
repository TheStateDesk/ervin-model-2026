#!/usr/bin/env node
const api='https://api.github.com/repos/geervin/ervin-model-2026/actions/workflows/deploy-pages.yml/runs?branch=main&per_page=8';
const r=await fetch(api,{headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
const text=await r.text();
if(!r.ok)throw Error('GitHub API status '+r.status+': '+text.slice(0,1000));
const j=JSON.parse(text);
console.log('PAGES RELEASE RUNS '+JSON.stringify((j.workflow_runs||[]).map(x=>({id:x.id,status:x.status,conclusion:x.conclusion,created_at:x.created_at,head_sha:x.head_sha,event:x.event,html_url:x.html_url}))));
