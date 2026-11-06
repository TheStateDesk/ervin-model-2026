/* Apply an editorial drop cap to the first actual body paragraph, never a deck or byline. */
(()=>{
  function apply(){
    const main=document.querySelector('main');
    if(!main||!document.body.classList.contains('td-news'))return;
    const story=main.querySelector('.story-copy,.story-content,.story-prose,.story-article,.td-article,article')||main;
    const paragraphs=[...story.querySelectorAll('p')];
    const candidate=paragraphs.find(p=>{
      if(p.closest('header,aside,nav,figure,footer,.story-heading,.story-deck,.story-byline,.td-article-meta,.td-card-grid'))return false;
      if(p.matches('.story-deck,.story-byline,.td-deck,.td-standfirst,.td-eyebrow,.label,.meta,.byline,.td-card-byline'))return false;
      const t=(p.textContent||'').trim();
      if(t.length<95||/^(by |published |updated |the state desk\s*[·/]|photograph:|image:)/i.test(t))return false;
      return true;
    });
    if(candidate)candidate.classList.add('td-story-opening');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
