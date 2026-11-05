/* Shared post-midterm editorial wayfinding for every public race desk */
(function chrome(){
'use strict';
const script=document.currentScript;
const root=new URL('../',script?.src||location.href);
const url=p=>new URL(p,root).href;
const path=location.pathname;
const isArchive=new URLSearchParams(location.search).get('view')==='final';
const where=path.includes('/corrections/')?'corrections':path.includes('/about/')?'about':path.includes('/archive/')?'archive':path.includes('/analysis/')?'analysis':path.includes('/results/')?'results':path.includes('/election-night/')?'other':path.includes('/states/')?'states':path.includes('/state/')?'state':path.includes('/house/')?'house':path.includes('/governors/')?'governors':path.includes('/michigan/')?'michigan':path.includes('/stats-for-nerds/')?'methods':'other';
const items=[
 ['Home','states/','states'],
 ['Results','results/','results'],
 ['Texas','analysis/texas-new-era/','texas'],
 ['Kansas','analysis/kansas-hamilton-upset/','kansas'],
 ['South Carolina','analysis/south-carolina-andrews/','south-carolina'],
 ['House','house/','house'],
 ['Governors','governors/','governors'],
 ['Analysis','analysis/','analysis'],
 ['Forecast grade','analysis/forecast-grade/','grade'],
 ['About','about/','about'],
 ['Corrections','corrections/','corrections'],
 ['Archive','archive/','archive']
];
const nav=document.createElement('nav');nav.className='pe-global-nav';nav.setAttribute('aria-label','Ervin Model election reporting sections');
const label=document.createElement('div');label.className='pe-global-label';label.innerHTML='<strong>THE STATE DESK</strong><small>ELECTIONS · NEWS · DATA</small>';
const links=document.createElement('div');links.className='pe-global-links';
for(const [name,target,section] of items){
 const a=document.createElement('a');a.href=url(target);a.textContent=name;
 if((where===section&&!isArchive)||(section==='archive'&&isArchive))a.setAttribute('aria-current','page');
 links.append(a);
}
nav.append(label,links);
const insert=()=>{if(document.querySelector('.pe-global-nav'))return;
 document.body.classList.add('pe-site');
 const header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',nav);else document.body.prepend(nav);
 document.querySelectorAll('a').forEach(a=>{const text=(a.textContent||'').trim();
  if(text==='Election night'||text==='Election Night')a.textContent='Election results';
  if(text==='National forecast'&&where!=='analysis')a.textContent='National results';
 });
 const main=document.querySelector('main');
 if(main&&!['states','analysis'].includes(where)){
  const notices={
   results:['THE NATIONAL RESULTS DESK','Unofficial returns, attributed race calls and local reporting.'],
   state:['THE STATE EDITION','County vote returns, congressional districts and the archived 2026 outlook.'],
   house:['THE HOUSE DESK','All 435 districts, with source-linked returns and election dossiers.'],
   governors:['THE GOVERNOR DESK','36 races for state executives, election results and historical context.'],
   michigan:['MICHIGAN / DATA ARCHIVE','For live Michigan statewide and county reporting, open the current State Desk.'],
   methods:['DATA & METHODOLOGY','Historical backtests and pre-election research are preserved as a dated archive.'],
   other:['ELECTION RESEARCH ARCHIVE','Explore the new post-midterm national desk for current results.']
  };
  const [title,detail]=notices[where]||notices.other;
  const edition=document.createElement('div');edition.className='pe-edition-line';
  const left=document.createElement('span');left.textContent=title;
  const right=document.createElement('span');right.textContent=detail;
  edition.append(left,right);main.insertAdjacentElement('beforebegin',edition);
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insert,{once:true});else insert();
// Site-wide, privacy-preserving page-visit instrumentation. Cloudflare Web Analytics
// requires an owner-issued public site token; never invent or hard-code one.
// Pages loaded locally, in CI, or on unrecognized hosts must not send traffic.
if(/^geervin\\.github\\.io$/i.test(location.hostname)){
 fetch(url('analytics/config.json'),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{
  const token=typeof cfg?.cloudflareSiteToken==='string'?cfg.cloudflareSiteToken.trim():'';
  if(!/^[a-f0-9]{32}$/i.test(token))return;
  const beacon=document.createElement('script');
  beacon.defer=true;beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon',JSON.stringify({token}));
  document.head.appendChild(beacon);
 }).catch(()=>{}); // Do not block navigation or reporting when analytics is unavailable.
}
})();
