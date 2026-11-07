from pathlib import Path
import re,html,json
from urllib.parse import urljoin,urlsplit
import xml.etree.ElementTree as ET
ROOT=Path('_news_public')
def plain(value):
 return html.unescape(re.sub('<[^>]+>','',value)).strip()
def match(pattern,text,default=''):
 found=re.search(pattern,text,re.S|re.I)
 return found.group(1) if found else default
feed=ET.parse(ROOT/'feed.xml')
order={urlsplit(x.findtext('link')).path.split('/')[-2]:i for i,x in enumerate(feed.findall('channel/item'))}
stories={}
for path in (ROOT/'analysis').glob('*/index.html'):
 text=path.read_text(encoding='utf-8');slug=path.parent.name
 title=plain(match(r'<h1[^>]*>(.*?)</h1>',text))
 deck=plain(match(r'<meta name="description" content="([^"]+)"',text) or match(r'<p[^>]*class="[^"]*(?:deck|standfirst)[^"]*"[^>]*>(.*?)</p>',text))
 if not deck:
  paragraphs=re.findall(r'<p\b[^>]*>(.*?)</p>',text,re.S)
  deck=next((plain(p) for p in paragraphs if len(plain(p))>140),'')
 if len(deck)>210:deck=deck[:207].rsplit(' ',1)[0]+'…'
 image=match(r'(<img\b[^>]*>)',text)
 image=re.sub(r'loading="[^"]*"','',image).replace('<img','<img loading="lazy"',1)
 caption=match(r'<figcaption[^>]*>(.*?)</figcaption>',text)
 caption=re.sub(r'<a\b[^>]*>(.*?)</a>',r'\1',caption,flags=re.S)
 stories[slug]=(title,deck,'<figure class="td-photo">'+image+'<figcaption>'+caption+'</figcaption></figure>')
def card(slug,prefix):
 title,deck,figure=stories[slug]
 return '<a class="td-section-card" href="'+prefix+slug+'/">'+figure+'<h2>'+html.escape(title)+'</h2><p>'+html.escape(deck)+'</p></a>'
for section in ['analysis','congress','white-house','states-news','policy-economy']:
 path=ROOT/section/'index.html';text=path.read_text(encoding='utf-8')
 slugs=list(stories) if section=='analysis' else list(dict.fromkeys(re.findall(r'href="(?:\.\./)?analysis/([^/]+)/',text)))
 slugs=sorted((s for s in slugs if s in stories),key=lambda s:order.get(s,999))
 hero=match(r'(<div class="td-topic-hero">.*?</div>\s*</div>)',text)
 if not hero:
  title={'analysis':'Analysis','congress':'Congress','white-house':'White House','states-news':'States','policy-economy':'Policy & Economy'}[section]
  hero='<div class="td-topic-hero"><h1>'+title+'</h1></div>'
 main='<main id="main-content" class="td-layout td-section-index">'+hero+'<div class="td-section-rule"><span>Latest reporting</span></div><section class="td-topic-grid">'+''.join(card(s,'../analysis/') for s in slugs)+'</section></main>'
 text=re.sub(r'<main\b.*?</main>',lambda _:main,text,flags=re.S)
 path.write_text(text,encoding='utf-8')
# Populate text-only homepage previews from their corresponding published articles.
path=ROOT/'index.html';text=path.read_text(encoding='utf-8')
def preview(m):
 slug=m.group(1);body=m.group(2)
 if slug in stories and '<h2' in body and '<img' not in body:
  return card(slug,'analysis/')
 return m.group(0)
text=re.sub(r'<a\b[^>]*href="analysis/([^/]+)/"[^>]*>(.*?)</a>',preview,text,flags=re.S)
path.write_text(text,encoding='utf-8')
# Package photographs with the site so readers do not depend on Wikimedia redirects.
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,time
pages=list(ROOT.rglob('*.html'))
urls=set()
for page in pages:
 urls.update(re.findall(r'<img\b[^>]*src="(https://[^\"]+)"',page.read_text(encoding='utf-8')))
folder=ROOT/'images/news';folder.mkdir(parents=True,exist_ok=True)
def download(url):
 for attempt in range(3):
  try:
   with urlopen(Request(html.unescape(url),headers={'User-Agent':'StateDesk-Publication/1.0'}),timeout=40) as response:
    data=response.read();mime=response.headers.get_content_type()
   if mime not in ('image/jpeg','image/png','image/webp'):raise ValueError('Unexpected image type '+mime)
   extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[mime]
   name=hashlib.sha256(url.encode()).hexdigest()[:20]+extension
   (folder/name).write_bytes(data)
   return url,'images/news/'+name
  except Exception:
   if attempt==2:raise
   time.sleep(2*(attempt+1))
with ThreadPoolExecutor(max_workers=4) as pool:
 local=dict(pool.map(download,urls))
for page in pages:
 text=page.read_text(encoding='utf-8');prefix='../'*(len(page.relative_to(ROOT).parts)-1)
 for url,target in local.items():text=text.replace('src="'+url+'"','src="'+prefix+target+'"')
 page.write_text(text,encoding='utf-8')
print('Packaged',len(local),'photographs with the publication')
