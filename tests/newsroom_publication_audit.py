#!/usr/bin/env python3
"""Newsroom prepublication audit: structural checks plus optional deployed-site checks."""
import pathlib,re,sys,urllib.request,urllib.error,time
root=pathlib.Path(__file__).resolve().parents[1]
articles=sorted((root/'analysis').glob('*/index.html'))
errors=[]; seen={}
for path in articles:
    s=path.read_text(encoding='utf-8')
    src=re.search(r'<img\b[^>]*\bsrc="([^"]+)"',s,re.I)
    if not src: errors.append(f'{path}: missing photo')
    else:
        url=src.group(1).split('?')[0]
        if url in seen: errors.append(f'{path}: photo duplicates {seen[url]}')
        seen[url]=path
    if 'td-article-standards.css' not in s: errors.append(f'{path}: missing shared styles')
    if 'EDITORIAL DRAFT' in s or 'NOT PUBLISHED' in s: errors.append(f'{path}: draft marker')
    if 'AI-assistance disclosure' in s: errors.append(f'{path}: article-level AI disclosure')
    if not re.search(r'<h1\b',s,re.I): errors.append(f'{path}: missing headline')
    if not re.search(r'<figcaption\b',s,re.I): errors.append(f'{path}: missing photo caption')
print(f'Checked {len(articles)} articles; {len(seen)} unique image references.')
if '--live' in sys.argv:
    base='https://thestatedesk.github.io/'
    for path in [root/'index.html',*articles]:
        url=base+path.relative_to(root).as_posix().removesuffix('index.html')
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'TheStateDesk-QA/1.0'}),timeout=18) as r:
                data=r.read().decode('utf-8','replace')
                if r.status!=200: errors.append(f'{url}: HTTP {r.status}')
                if path!=root/'index.html' and not re.search(r'<img\b',data,re.I): errors.append(f'{url}: missing live image')
        except Exception as e: errors.append(f'{url}: live check failed: {e}')
for err in errors: print('FAIL:',err)
if errors: sys.exit(1)
print('PASS: all checked pages meet structural standards'+(' and live pages respond' if '--live' in sys.argv else ''))
