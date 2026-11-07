#!/usr/bin/env python3
"""Audit the exact Pages artifact, its internal dependencies, and deployed revision."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://thestatedesk.github.io/'
ROOT = Path(__file__).resolve().parents[1] / '_news_public'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.anchors = 0
        self.nested = False
        self.classes = set()
        self.tags = set()
        self.viewport = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.add(tag)
        self.classes.update(attrs.get('class', '').split())
        if tag == 'a':
            self.nested |= self.anchors > 0
            self.anchors += 1
        if tag == 'meta' and attrs.get('name') == 'viewport':
            self.viewport = True
        if tag == 'img':
            self.images.append(attrs.get('src', ''))
        for key in ('href', 'src'):
            if attrs.get(key):
                self.links.append(attrs[key])

    def handle_endtag(self, tag):
        if tag == 'a':
            self.anchors = max(0, self.anchors - 1)


def target_for(url):
    target = ROOT / unquote(urlsplit(url).path.lstrip('/'))
    return target / 'index.html' if target.is_dir() else target


def local_checks():
    errors = []
    photos = {}
    pages = sorted(ROOT.rglob('*.html'))
    if not pages:
        return ['Build the publication with scripts/build-news-public.py first.']
    for path in pages:
        name = path.relative_to(ROOT).as_posix()
        source = path.read_text(encoding='utf-8')
        page = Page()
        page.feed(source)
        for required in ('td-global-header', 'td-global-nav', 'td-site-footer'):
            if required not in page.classes:
                errors.append(f'{name}: missing {required}')
        if not page.viewport or 'h1' not in page.tags or page.nested:
            errors.append(f'{name}: missing viewport/headline or nested links')
        for ref in page.links:
            url = urljoin(BASE + name, ref)
            if urlsplit(url).netloc == urlsplit(BASE).netloc and not target_for(url).is_file():
                errors.append(f'{name}: missing published dependency {ref}')
        if name.startswith('analysis/') and name.count('/') == 2:
            if not page.images or 'figcaption' not in page.tags:
                errors.append(f'{name}: missing photograph or caption')
            if 'td-article-standards.css' not in source:
                errors.append(f'{name}: missing article styles')
            for image in page.images:
                key = image.split('?')[0]
                if key in photos:
                    errors.append(f'{name}: photograph duplicates {photos[key]}')
                photos[key] = name
        for marker in ('EDITORIAL DRAFT', 'NOT PUBLISHED', '__ERVIN_BUILD__', 'Proposed Nov.'):
            if marker in source:
                errors.append(f'{name}: unresolved publication marker {marker}')
    for filename, tag in [('sitemap.xml', '{*}loc'), ('feed.xml', 'channel/item/link')]:
        tree = ET.parse(ROOT / filename)
        for link in tree.findall('.//' + tag):
            if not target_for(link.text).is_file():
                errors.append(f'{filename}: missing published destination {link.text}')
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    listed = {element.text for element in sitemap.findall('.//{*}loc')}
    for path in pages:
        url = BASE + path.relative_to(ROOT).as_posix().removesuffix('index.html')
        if url not in listed:
            errors.append(f'sitemap.xml: missing page {url}')
    print(f'Checked {len(pages)} published pages and {len(photos)} article photographs.')
    return errors


def fetch(path):
    request = Request(BASE + path, headers={'User-Agent': 'TheStateDesk-PublicationAudit/2.0', 'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=30) as response:
        return response.read()


def live_checks(expected):
    for attempt in range(12):
        try:
            release = json.loads(fetch('release.json?check=' + str(time.time_ns())))
            if expected and release['revision'] != expected:
                raise ValueError('The requested revision has not reached Pages yet')
            break
        except Exception:
            if attempt == 11:
                raise
            time.sleep(10)

    def check_file(item):
        name, digest = item
        for attempt in range(3):
            try:
                data = fetch(name + '?release=' + release['revision'])
                if hashlib.sha256(data).hexdigest() != digest:
                    raise ValueError('content differs from deployed artifact')
                return None
            except Exception as error:
                if attempt == 2:
                    return f'{name}: {error}'
                time.sleep(5)

    with ThreadPoolExecutor(max_workers=5) as pool:
        errors = [error for error in pool.map(check_file, release['files'].items()) if error]
    print(f"Checked {len(release['files'])} live files at revision {release['revision']}.")
    return errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--expected', default=os.environ.get('EXPECTED_REVISION'))
    args = parser.parse_args()
    errors = local_checks()
    if args.live and not errors:
        errors.extend(live_checks(args.expected))
    for error in errors:
        print('FAIL:', error)
    if errors:
        raise SystemExit(1)
    print('PASS: publication structure, navigation, assets, and feeds' + ('; live artifact verified' if args.live else ''))
