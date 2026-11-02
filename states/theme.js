/* The State Desk shares the original Ervin appearance preference. */
(()=>{'use strict';
const key='ervin-2026-appearance';
let mode='light';
try { mode=localStorage.getItem(key)==='dark'?'dark':'light'; }catch(_){}
const apply=()=> {
 const dark=mode==='dark';
 document.documentElement.classList.toggle('theme-dark',dark);
 document.documentElement.classList.toggle('light',!dark);
 document.documentElement.style.colorScheme=dark?'dark':'light';
 const button=document.getElementById('themeToggle');
 if(button){button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');button.textContent=dark?'Light mode':'Dark mode';}
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute('content',dark?'#101925':'#f5f3ee');
};
apply();
const init=()=> {apply();const b=document.getElementById('themeToggle');if(b)b.addEventListener('click',()=>{mode=mode==='dark'?'light':'dark';try{localStorage.setItem(key,mode);}catch(_){}apply();});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
