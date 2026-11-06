#!/usr/bin/env python3
"""Build a news-only public GitHub Pages artifact; retain election code in git."""
from pathlib import Path
import shutil,re
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_news_public'
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
sections=['about','corrections','congress','white-house','states-news','policy-economy','analysis']
files=['index.html','favicon.svg','feed.xml','robots.txt','sitemap.xml','CNAME']
for f in files:
 p=ROOT/f
 if p.is_file(): shutil.copy2(p,OUT/f)
for name in sections:
 src=ROOT/name
 if src.exists(): shutil.copytree(src,OUT/name)
# Retain newspaper styling and imagery, but no election dashboards or datasets.
for name in ['scripts','images','assets','img']:
 src=ROOT/name
 if src.exists():
  if name=='scripts':
   (OUT/name).mkdir()
   for f in src.iterdir():
    if f.is_file() and (f.suffix=='.css' or f.name=='newsroom-dropcap.js'): shutil.copy2(f,OUT/name/f.name)
  else: shutil.copytree(src,OUT/name)
# Forecast methodology and scoring are not public journalism.
for slug in ['forecast-grade','forecast-coverage']:
 shutil.rmtree(OUT/'analysis'/slug,ignore_errors=True)
retired=['archive','results','states','state','elections','election-night','michigan','governors','house','uncalled','counties-watch','stats-for-nerds','polling']
# Remove links/cards to retired features, keeping current election reporting.
for p in OUT.rglob('*.html'):
 h=p.read_text(encoding='utf-8')
 depth=len(p.relative_to(OUT).parts)-1
 prefix='../'*depth
 # Remove all anchors pointing to old election tools and archives.
 def drop_link(m):
  href=m.group(2)
  path=urlsplit(href).path
  target=path
  while target.startswith('../'):target=target[3:]
  if target.startswith('./'):target=target[2:]
  if target.split('/')[0] in retired or target.startswith('analysis/forecast-'):
   return ''
  return m.group(0)
 h=re.sub(r'<a\b([^>]*?)href=(["\'])(.*?)\2([^>]*)>.*?</a>',lambda m: '' if (lambda u: (lambda t:t.split('/')[0] in retired or t.startswith('analysis/forecast-'))(re.sub(r'^(?:\.\./|\./)+','',urlsplit(u).path)))(m.group(3)) else m.group(0),h,flags=re.I|re.S)
 # Remove sections dedicated to election atlas and forecast archive.
 h=re.sub(r'<aside\b[^>]*class=["\'][^"\']*td-news-band[^"\']*["\'][^>]*>.*?</aside>','',h,flags=re.I|re.S)
 h=re.sub(r'<meta name="description" content="([^"]*)2026 election([^"]*)">',lambda m:'<meta name="description" content="'+m.group(1).rstrip(' ,;')+'.">',h,flags=re.I)
 h=re.sub(r'<script\b[^>]*src=["\'][^"\']*(?:post-editorial-chrome|home-election|nbc-calls|live-coverage-hero)[^"\']*["\'][^>]*></script>','',h,flags=re.I)
 if p.parent.parent.name=='analysis' and p.name=='index.html':
  if 'td-article-standards.css' not in h: h=h.replace('</head>','<link rel="stylesheet" href="../../scripts/td-article-standards.css"></head>')
  if 'newsroom-dropcap.js' not in h: h=h.replace('</body>','<script defer src="../../scripts/newsroom-dropcap.js"></script></body>')
 p.write_text(h,encoding='utf-8')
# Keep XML feeds/sitemap free of excluded URLs.
for f in ['sitemap.xml','feed.xml']:
 p=OUT/f
 if p.exists():
  h=p.read_text()
  h=re.sub(r'<url>.*?<loc>https?://[^<]+/(?:'+ '|'.join(retired)+r')/[^<]*</loc>.*?</url>','',h,flags=re.S)
  h=re.sub(r'<url>.*?<loc>https?://[^<]+/analysis/forecast-[^<]*</loc>.*?</url>','',h,flags=re.S)
  p.write_text(h)
assert (OUT/'index.html').exists()
assert not any((OUT/name).exists() for name in retired)
print('NEWS-ONLY PUBLIC BUILD READY:',len(list(OUT.rglob('*.html'))),'HTML pages')
