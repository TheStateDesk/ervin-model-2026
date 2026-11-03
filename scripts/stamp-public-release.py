#!/usr/bin/env python3
"""Stamp the deployed HTML artifact with its exact commit and cache-bust all
local JS/CSS. This runs AFTER tests and BEFORE GitHub Pages artifact upload.

GitHub Pages caches HTML and assets. Source code may have changed while users'
browsers keep using JavaScript/CSS with an old hard-coded ?v= token.
"""
from __future__ import annotations
import os
import pathlib
import re
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = pathlib.Path(__file__).resolve().parents[1]
FULL = sys.argv[1] if len(sys.argv)>1 else os.environ.get("GITHUB_SHA", "")
if not re.fullmatch(r"[a-fA-F0-9]{40}", FULL):
    raise SystemExit("Refusing to stamp without the full 40-character GitHub commit SHA")
FULL = FULL.lower()
SHORT = FULL[:8]
TAG = '<meta name="ervin-deploy" content="' + FULL + '">'
LINK = re.compile(r'(?P<pre>\b(?:src|href)=")(?P<url>[^"]+)(?P<post>")')
updated = []
def stamp_url(m):
    u = m.group("url")
    if u.startswith(("https://", "http://", "mailto:", "#", "//", "data:")):
        return m.group(0)
    parts = urlsplit(u)
    if not parts.path.lower().endswith((".js", ".css")):
        return m.group(0)
    q = [(k,v) for k,v in parse_qsl(parts.query,keep_blank_values=True) if k!="build"]
    q.append(("build",SHORT))
    u = urlunsplit(("", "", parts.path, urlencode(q), parts.fragment))
    return m.group("pre")+u+m.group("post")
for f in ROOT.rglob("*.html"):
    if any(s in f.parts for s in ("node_modules",".git",".venv","venv")):
        continue
    original=f.read_text(encoding="utf-8")
    result=LINK.sub(stamp_url,original).replace("__ERVIN_BUILD__",SHORT)
    if '<meta name="ervin-deploy"' in result:
        result=re.sub(r'<meta name="ervin-deploy" content="[a-f0-9]{40}">',TAG,result)
    elif '</head>' in result:
        result=result.replace('</head>',TAG+'</head>',1)
    else:
        raise SystemExit("Missing head in "+str(f))
    if result!=original:
        f.write_text(result,encoding="utf-8")
        updated.append(str(f.relative_to(ROOT)))
home=(ROOT/"states"/"index.html").read_text()
assert 'Build '+SHORT in home and TAG in home, "Homepage release identity missing"
assert 'editorial.css?' in home and ('build='+SHORT) in home,"Cache-busted stylesheet missing"
assert 'home-election-2026.js?' in home,"Cache-busted homepage JavaScript missing"
print("STAMPED DEPLOYMENT",FULL,"HTML pages:",len(updated))
print("Release marker visible in states/index.html, and local JavaScript/styles use a unique build key")
