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
 # Remove retired forecast cards as complete article units, not individual nested links.
 h=re.sub(r"""<article\b[^>]*>\s*<a\b[^>]*href=["'][^"']*analysis/forecast-(?:grade|coverage)/["'][^>]*>.*?</a>\s*</article>""",'',h,flags=re.I|re.S)
 # Remove only simple retired navigation links; never consume story cards or footer markup.
 retired_pat='|'.join(retired)
 h=re.sub(r"""<a\b[^>]*href=["'](?:\.\./|\./)*(?:"""+retired_pat+r""")/[^"']*["'][^>]*>[^<]*</a>""",'',h,flags=re.I)
 # Nested caption anchors inside clickable article cards invalidate HTML and can
 # cause Safari to reparent entire cards or the footer. Keep the credit as text.
 h=re.sub(r'(<figcaption>.*?)<a\b[^>]*>([^<]*)</a>(.*?</figcaption>)',lambda m:m.group(1)+m.group(2)+m.group(3),h,flags=re.I|re.S)
 # Remove sections dedicated to election atlas and forecast archive.
 h=re.sub(r"""<a\b[^>]*href=["'](?:\.\./|\./)*(?:"""+retired_pat+r""")/[^"']*["'][^>]*>[^<]*</a>""",'',h,flags=re.I)
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
