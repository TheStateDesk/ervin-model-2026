#!/usr/bin/env python3
"""Build a news-only public GitHub Pages artifact; retain election code in git."""
from pathlib import Path
import shutil,re,json,os,subprocess,hashlib
import xml.etree.ElementTree as ET
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
# Published reporting still cites these evidence files and legacy article styles.
shutil.copy2(ROOT/'states/editorial.css',OUT/'scripts/legacy-editorial.css')
shutil.copytree(ROOT/'editorial/provenance',OUT/'editorial/provenance')
shutil.copy2(ROOT/'final/forecast-final.json',OUT/'editorial/forecast-final.json')
retired=['archive','results','states','state','elections','election-night','michigan','governors','house','uncalled','counties-watch','stats-for-nerds','polling']
# Remove links/cards to retired features, keeping current election reporting.
for p in OUT.rglob('*.html'):
 h=p.read_text(encoding='utf-8')
 depth=len(p.relative_to(OUT).parts)-1
 prefix='../'*depth
 h=h.replace('states/editorial.css','scripts/legacy-editorial.css')
 h=h.replace('final/forecast-final.json','editorial/forecast-final.json')
 # Remove the entire retired promotion, including its otherwise orphaned copy.
 h=re.sub(r'<aside\b[^>]*aria-label="Election results"[^>]*>.*?</aside>','',h,flags=re.S)
 # Remove retired forecast cards as complete article units, not individual nested links.
 h=re.sub(r"""<article\b[^>]*>\s*<a\b[^>]*href=["'][^"']*analysis/forecast-(?:grade|coverage)/["'][^>]*>.*?</a>\s*</article>""",'',h,flags=re.I|re.S)
 # Preserve citation text when its retired destination is excluded from this build.
 h=re.sub(r'<a\b[^>]*href=["\'][^"\']*analysis/forecast-(?:grade|coverage)/["\'][^>]*>(.*?)</a>',r'\1',h,flags=re.S)
 h=re.sub(r'<a\b[^>]*href=["\']\.\./forecast-(?:grade|coverage)/["\'][^>]*>(.*?)</a>',r'\1',h,flags=re.S)
 # Remove only simple retired navigation links; never consume story cards or footer markup.
 retired_pat='|'.join(retired)
 h=re.sub(r"""<a\b[^>]*href=["'](?:\.\./|\./)*(?:"""+retired_pat+r""")/[^"']*["'][^>]*>[^<]*</a>""",'',h,flags=re.I)
 # Nested caption anchors inside clickable article cards invalidate HTML and can
 # cause Safari to reparent entire cards or the footer. Keep the credit as text.
 # Credit links in standalone figures remain clickable. Source cards are checked
 # for nested anchors by the publication audit before deployment.
 if depth<=1:
  h=re.sub(r'(<figcaption>.*?)<a\b[^>]*>([^<]*)</a>(.*?</figcaption>)',lambda m:m.group(1)+m.group(2)+m.group(3),h,flags=re.I|re.S)
 # Remove sections dedicated to election atlas and forecast archive.
 h=re.sub(r"""<a\b[^>]*href=["'](?:\.\./|\./)*(?:"""+retired_pat+r""")/[^"']*["'][^>]*>[^<]*</a>""",'',h,flags=re.I)
 h=re.sub(r'<meta name="description" content="([^"]*)2026 election([^"]*)">',lambda m:'<meta name="description" content="'+m.group(1).rstrip(' ,;')+'.">',h,flags=re.I)
 h=re.sub(r'<script\b[^>]*src=["\'][^"\']*(?:post-editorial-chrome|home-election|nbc-calls|live-coverage-hero)[^"\']*["\'][^>]*></script>','',h,flags=re.I)
 if p.parent.parent.name=='analysis' and p.name=='index.html':
  if 'td-article-standards.css' not in h: h=h.replace('</head>','<link rel="stylesheet" href="../../scripts/td-article-standards.css"></head>')
  if 'newsroom-dropcap.js' not in h: h=h.replace('</body>','<script defer src="../../scripts/newsroom-dropcap.js"></script></body>')
 # Remove AI notices from public page copy as requested by the publisher.
 h=re.sub(r'<p\b[^>]*>(?:(?!</p>).)*(?:AI-assistance disclosure|AI assistance|AI-assisted)(?:(?!</p>).)*</p>','',h,flags=re.I|re.S)
 p.write_text(h,encoding='utf-8')
# Generate section layouts from actual published article content.
import runpy
runpy.run_path(str(ROOT/'scripts/build-news-previews.py'))
# Filter complete XML records. A cross-record regex could erase valid entries
# before a retired URL and could not remove RSS items at all.
ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
ET.register_namespace('atom', 'http://www.w3.org/2005/Atom')
for f in ['sitemap.xml','feed.xml']:
 p=OUT/f
 if p.exists():
  tree=ET.parse(p)
  parent=tree.getroot() if f=='sitemap.xml' else tree.find('channel')
  for item in list(parent):
   tag=item.tag.rsplit('}',1)[-1]
   if tag not in ('url','item'): continue
   link=item.find('{*}loc') if tag=='url' else item.find('link')
   target=OUT/urlsplit(link.text).path.lstrip('/')
   if not target.suffix: target=target/'index.html'
   if not target.is_file(): parent.remove(item)
  tree.write(p,encoding='utf-8',xml_declaration=True)
# Include every public page, including older pages lost by the previous regex.
namespace='http://www.sitemaps.org/schemas/sitemap/0.9'
sitemap=ET.parse(OUT/'sitemap.xml')
listed={element.text for element in sitemap.findall('.//{*}loc')}
for page in sorted(OUT.rglob('*.html')):
 url='https://thestatedesk.github.io/'+page.relative_to(OUT).as_posix().removesuffix('index.html')
 if url not in listed:
  entry=ET.SubElement(sitemap.getroot(),'{'+namespace+'}url')
  ET.SubElement(entry,'{'+namespace+'}loc').text=url
sitemap.write(OUT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
# The same revision is checked after deployment, so an older HTTP 200 cannot pass.
revision=os.environ.get('GITHUB_SHA') or subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
hashes={p.relative_to(OUT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.rglob('*')) if p.is_file()}
(OUT/'release.json').write_text(json.dumps({'revision':revision,'files':hashes},indent=2)+'\n',encoding='utf-8')
(OUT/'.nojekyll').touch()
assert (OUT/'index.html').exists()
assert not any((OUT/name).exists() for name in retired)
print('NEWS-ONLY PUBLIC BUILD READY:',len(list(OUT.rglob('*.html'))),'HTML pages')

