/* Shared navigation: keyboard/mobile access and compact back-to-top action. */
(()=>{
"use strict";
const head=document.querySelector(".site-header");
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
 const mobileTheme=mainPanel.querySelector("#themeToggleMenu");
 mobileTheme?.addEventListener("click",()=>{
  const desktopTheme=document.getElementById("themeToggle");
  if(desktopTheme){desktopTheme.click()}else document.documentElement.classList.toggle("light");
 });
}
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
readingButton.textContent="A+ Text size";
readingButton.setAttribute("aria-pressed",String(savedLargeText));
readingButton.setAttribute("aria-label","Switch larger text on or off");
readingButton.title="Make text and controls larger";
const mainUtility=document.querySelector(".nav-utilities");
const interiorNav=document.querySelector(".site-header .site-nav");
if(mainUtility)mainUtility.insertBefore(readingButton,mainUtility.firstChild);
else if(interiorNav)interiorNav.appendChild(readingButton);
readingButton.addEventListener("click",()=>{
 const on=document.documentElement.classList.toggle("large-text");
 readingButton.setAttribute("aria-pressed",String(on));
 readingButton.textContent=on?"A− Normal text":"A+ Text size";
 try{window.localStorage.setItem(largeTextKey,on?"yes":"no")}catch{}
});
if(savedLargeText)readingButton.textContent="A− Normal text";

const back=document.createElement("button");
back.type="button";back.className="site-back-top";back.textContent="↑ Top";back.setAttribute("aria-label","Back to top");
back.hidden=true;document.body.append(back);
const update=()=>{back.hidden=window.scrollY<650};
window.addEventListener("scroll",update,{passive:true});update();
back.addEventListener("click",()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
})();
