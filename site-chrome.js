/* Shared navigation: keyboard/mobile access and compact back-to-top action. */
(()=>{
"use strict";
const head=document.querySelector(".site-header");
/* The 50-state editorial desk is now the primary public navigation.
   Resolve from this script URL, not from a nested page's relative path. */
const siteRoot=new URL('./',document.currentScript?.src||location.href);
const stateDeskURL=new URL('states/',siteRoot).href;
const nationalNightURL=new URL('election-night/',siteRoot).href;
for(const nav of [document.querySelector('.site-header .site-nav'),document.getElementById('topNavigation')]){
 if(nav&&!nav.querySelector('[data-state-desk]')){
  const a=document.createElement('a');a.href=stateDeskURL;a.dataset.stateDesk='true';
  a.textContent='All states';a.setAttribute('aria-label','All 50 state election editions');
  nav.prepend(a);
 }
 if(nav&&!nav.querySelector('[data-night-desk]')&&!Array.from(nav.querySelectorAll('a')).some(a=>a.href===nationalNightURL)){
  const a=document.createElement('a');a.href=nationalNightURL;a.dataset.nightDesk='true';a.textContent='Election Night';a.setAttribute('aria-label','All 2026 election-night contests and Michigan Senate county reporting');nav.append(a);
 }
}

if(head){
 const button=head.querySelector(".site-mobile-toggle"),nav=head.querySelector(".site-nav");
 function collapse(){if(!button||!nav)return;nav.classList.remove("is-open");button.setAttribute("aria-expanded","false")}
 button?.addEventListener("click",()=>{
   const open=nav.classList.toggle("is-open");button.setAttribute("aria-expanded",String(open));
 });
 nav?.addEventListener("click",e=>{if(e.target.closest("a"))collapse()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")collapse()});
 document.addEventListener("pointerdown",e=>{if(!head.contains(e.target))collapse()});
}
/* The full main-page directory is independent of the compact desktop links. */
const mainToggle=document.getElementById("mainMenuToggle");
const mainPanel=document.getElementById("globalMenuPanel");
if(mainToggle&&mainPanel){
 function closeMain(){
  mainPanel.hidden=true;
  mainToggle.setAttribute("aria-expanded","false");
 }
 mainToggle.addEventListener("click",()=>{
  const next=mainPanel.hidden;
  mainPanel.hidden=!next;
  mainToggle.setAttribute("aria-expanded",String(next));
 });
 mainPanel.addEventListener("click",e=>{
  if(e.target.closest("a"))closeMain();
 });
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!mainPanel.hidden){closeMain();mainToggle.focus()}
 });
 document.addEventListener("pointerdown",e=>{
  if(!mainPanel.hidden&&!e.target.closest(".topbar"))closeMain();
 });
 window.addEventListener("resize",()=>{if(window.innerWidth>1240)closeMain()},{passive:true});
}
/* One accessible, persistent appearance control across all four pages. */
const themeStorageKey="ervin-2026-appearance";
const htmlRoot=document.documentElement;
const siteHeader=document.querySelector(".site-header .site-header-inner");
let interiorThemeButton=null;
if(siteHeader){
 interiorThemeButton=document.createElement("button");
 interiorThemeButton.type="button";
 interiorThemeButton.className="site-theme-toggle";
 interiorThemeButton.id="themeToggleInterior";
 const mobileMenu=siteHeader.querySelector(".site-mobile-toggle");
 if(mobileMenu)siteHeader.insertBefore(interiorThemeButton,mobileMenu);
 else siteHeader.appendChild(interiorThemeButton);
}
const themeButtons=[
 document.getElementById("themeToggle"),
 document.getElementById("themeToggleMenu"),
 interiorThemeButton
].filter(Boolean);
function updateTheme(isDark,save){
 htmlRoot.classList.toggle("light",!isDark);
 const themeColor=document.querySelector('meta[name="theme-color"]');
 if(themeColor)themeColor.setAttribute("content",isDark?"#0c1826":"#f4f6f8");
 for(const button of themeButtons){
  button.setAttribute("aria-pressed",String(isDark));
  button.setAttribute("aria-label",isDark?"Use light appearance":"Use dark appearance");
  button.title=isDark?"Use light appearance":"Use dark appearance";
  button.innerHTML='<span class="theme-glyph" aria-hidden="true">'+(isDark?"☀":"☾")+'</span><span class="theme-text">'+(isDark?"Light mode":"Dark mode")+'</span>';
 }
 if(save){try{localStorage.setItem(themeStorageKey,isDark?"dark":"light")}catch(e){}}
}
updateTheme(!htmlRoot.classList.contains("light"),false);
themeButtons.forEach(button=>{
 // The original dashboard attached a legacy onclick toggle; use one shared
 // handler so a click never toggles dark mode twice.
 button.onclick=null;
 button.addEventListener("click",()=>{
 const dark=htmlRoot.classList.contains("light");
 updateTheme(dark,true);
 });
});
/* Dark appearance is user-selected; system preference does not silently
   override a user's selected theme in another page. */
/* Larger-text reading preference for visitors who prefer comfortable type.
 * Defensive storage: preferences work for this session even with blocked storage.
 */
const largeTextKey="ervin-2026-large-text";
const savedLargeText=(()=>{
 try{return window.localStorage.getItem(largeTextKey)==="yes"}
 catch{return false}
})();
if(savedLargeText)document.documentElement.classList.add("large-text");
const readingButton=document.createElement("button");
readingButton.type="button";
readingButton.id="readingToggle";
readingButton.className="reading-toggle";
function readingLabel(on){return '<span class="reading-short" aria-hidden="true">'+(on?'A−':'A+')+'</span><span class="reading-long" aria-hidden="true">'+(on?'A− Normal text':'A+ Text size')+'</span>'}
readingButton.innerHTML=readingLabel(savedLargeText);
readingButton.setAttribute("aria-pressed",String(savedLargeText));
readingButton.setAttribute("aria-label",savedLargeText?"Use normal text size":"Use larger text size");
readingButton.title="Toggle comfortable reading text size";
const mainUtility=document.querySelector(".nav-utilities");
const interiorNav=document.querySelector(".site-header .site-nav");
if(mainUtility)mainUtility.insertBefore(readingButton,mainUtility.firstChild);
else if(interiorNav)interiorNav.appendChild(readingButton);
readingButton.addEventListener("click",()=>{
 const on=document.documentElement.classList.toggle("large-text");
 readingButton.setAttribute("aria-pressed",String(on));
 readingButton.setAttribute("aria-label",on?"Use normal text size":"Use larger text size");
 readingButton.innerHTML=readingLabel(on);
 try{window.localStorage.setItem(largeTextKey,on?"yes":"no")}catch{}
});


const back=document.createElement("button");
back.type="button";back.className="site-back-top";back.textContent="↑ Top";back.setAttribute("aria-label","Back to top");
back.hidden=true;document.body.append(back);
const update=()=>{back.hidden=window.scrollY<650};
window.addEventListener("scroll",update,{passive:true});update();
back.addEventListener("click",()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
})();
