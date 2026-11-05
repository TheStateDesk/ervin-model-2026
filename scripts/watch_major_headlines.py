#!/usr/bin/env python3
"""Source-linked U.S. politics headline watch. No automatic writing of original news stories."""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

UTC = dt.timezone.utc
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "headlines" / "latest.json"
UA = "ErvinStateDesk/1.0 (politics news link monitor; https://github.com/TheStateDesk/thestatedesk.github.io)"
SOURCES = [
    ("POLITICO", "https://www.politico.com/rss/politicopicks.xml"),
    ("NPR", "https://feeds.npr.org/1014/rss.xml"),
    ("THE HILL", "https://thehill.com/feed/"),
    ("THE GUARDIAN", "https://www.theguardian.com/us-news/us-politics/rss"),
    ("PBS NEWSHOUR", "https://www.pbs.org/newshour/feeds/rss/politics"),
    ("BBC NEWS", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"),
    ("AP VIA FLIPBOARD (UNOFFICIAL)", "https://flipboard.com/@associatedpress/top-stories-u7govdf1z.rss"),
    ("REUTERS VIA GOOGLE NEWS", "https://news.google.com/rss/search?q=when%3A1d%20site%3Areuters.com%20US%20politics&hl=en-US&gl=US&ceid=US:en"),
]
POLITICAL = re.compile(r"\b(president|white house|congress|senat(?:e|or)|house (?:of representatives|speaker)|"
    r"supreme court|federal|governor|election|midterm|vote|ballot|democrat|republican|gop|"
    r"trump|administration|cabinet|secretary of state|justice department|attorney general|"
    r"legislat|immigration|tariff|budget|tax(?:es|ation)?|medicaid|medicare|obamacare|"
    r"national security|state department|pentagon|politic|government|border|shutdown|"
    r"impeach|military|iran|ukraine|israel|china|nato|sanctions?)\b", re.I)
MAJOR = [
    (r"\b(emergency|government shutdown|shutdown)\b", 2),
    (r"\b(resign(?:s|ed|ation)?|ousted|fired|removed|dies|died|assassinat|indict(?:ed|ment)?|arrested)\b", 4),
    (r"\b(supreme court|impeachment|executive order|veto|signed into law)\b", 4),
    (r"\b(wins? election|won election|projected winner|calls? (?:the )?race|flips? (?:the )?seat)\b", 3),
    (r"\b(passes? (?:the )?bill|passes? (?:the )?senate|passes? (?:the )?house|spending bill|debt ceiling)\b", 3),
    (r"\b(invasion|ceasefire|sanctions?|tariffs?)\b", 2),
]
STOP = set(("the a an and or but on in at for with as of to from by over after before new latest says "
            "has have had is are was were will would can could about under amid more than this that "
            "their his her its us united states america american politics political election elections "
            "news updates live trump president democratic republican democrats republicans").split())


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def parse_date(raw: str) -> dt.datetime | None:
    if not raw:
        return None
    try:
        val = email.utils.parsedate_to_datetime(raw)
        if val:
            return val.replace(tzinfo=UTC) if val.tzinfo is None else val.astimezone(UTC)
    except (TypeError, ValueError, IndexError):
        pass
    try:
        val = dt.datetime.fromisoformat(raw.strip().replace("Z", "+00:00"))
        return val.replace(tzinfo=UTC) if val.tzinfo is None else val.astimezone(UTC)
    except ValueError:
        return None


def parse_feed(blob: bytes, publisher: str, now: dt.datetime) -> list[dict]:
    root = ET.fromstring(blob)
    articles = []
    if root.tag.lower().endswith("rss") or root.tag.lower().endswith("rdf"):
        nodes = root.findall(".//item")
    else:
        nodes = root.findall("{http://www.w3.org/2005/Atom}entry")
    for node in nodes[:100]:
        def get(tag):
            for child in node:
                if child.tag.rsplit("}", 1)[-1] == tag:
                    return child.text or ""
            return ""
        title = clean(get("title"))
        link = get("link").strip()
        if not link:
            for child in node:
                if child.tag.rsplit("}", 1)[-1] == "link" and child.attrib.get("rel", "alternate") == "alternate":
                    link = child.attrib.get("href", "")
                    break
        published = parse_date(get("pubDate") or get("published") or get("updated") or get("date"))
        if not title or not link.startswith("https://") or not published or not POLITICAL.search(title):
            continue
        age = (now - published).total_seconds()
        if not (-1800 <= age <= 18 * 3600):
            continue
        articles.append({"title": title[:180], "url": link, "source": publisher,
                         "published_at": published.isoformat().replace("+00:00", "Z")})
    return articles


def terms(title: str) -> set[str]:
    return {t for t in re.findall(r"[a-z][a-z-]{2,}", title.lower()) if t not in STOP}


def importance(title: str) -> int:
    return sum(weight for pattern, weight in MAJOR if re.search(pattern, title, re.I))


def rank(articles: list[dict]) -> tuple[list[dict], list[dict]]:
    # A ranking is an editorial lead, not confirmation of any underlying claim.
    dedup = {}
    for item in articles:
        key = item["url"].split("?")[0]
        if key not in dedup:
            dedup[key] = dict(item)
    items = sorted(dedup.values(), key=lambda x: x["published_at"], reverse=True)
    groups = []
    for item in items:
        t = terms(item["title"])
        if not t:
            continue
        attached = False
        for group in groups:
            if item["source"] in {x["source"] for x in group}:
                continue
            other = terms(group[0]["title"])
            match = len(t & other)
            if match >= 3 and match / max(1, min(len(t), len(other))) >= 0.52:
                group.append(item)
                attached = True
                break
        if not attached:
            groups.append([item])
    leads = []
    for group in groups:
        lead = max(group, key=lambda x: (importance(x["title"]), x["published_at"]))
        score = importance(lead["title"]) + (5 if len(group) >= 2 else 0)
        # A lone headline with incidental political keywords is not automatically
        # a major story. Prefer independently echoed developments; retain all other
        # source headlines for the six-hour editorial research queue.
        if score < 3 or (len(group) == 1 and score < 6):
            continue
        leads.append({**lead, "source_count": len(group),
                      "other_sources": [{"source": x["source"], "url": x["url"]} for x in group if x is not lead][:3],
                      "priority_score": score,
                      "note": "Potential major development; verify original reporting before publishing."})
    leads.sort(key=lambda x: (x["source_count"] >= 2, x["priority_score"], x["published_at"]), reverse=True)
    return leads[:8], items[:24]


def update(output: pathlib.Path, feeds: list[tuple[str, bytes]], now: dt.datetime, minimum_sources: int = 2) -> dict:
    items = []
    live = []
    errors = []
    for source, blob in feeds:
        try:
            parsed = parse_feed(blob, source, now)
            if parsed:
                items.extend(parsed)
                live.append(source)
            else:
                errors.append(source + ": no recent politics items")
        except ET.ParseError as exc:
            errors.append(source + ": invalid feed: " + str(exc)[:90])
    if len(live) < minimum_sources:
        raise RuntimeError(f"Only {len(live)} independently named sources returned fresh political headlines")
    leads, headlines = rank(items)
    data = {"schema_version": 1, "generated_at": now.isoformat().replace("+00:00", "Z"),
            "sources_checked": len(SOURCES), "sources_reporting": live,
            "source_warnings": errors, "priority": leads, "headlines": headlines}
    old = {}
    if output.exists():
        try:
            old = json.loads(output.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    # Avoid time-triggered rewrites when content is unchanged. Every scan remains in Actions logs.
    old_keys = [(x.get("url"), x.get("source_count")) for x in old.get("priority", [])]
    new_keys = [(x.get("url"), x.get("source_count")) for x in leads]
    old_headlines = [(x.get("url"), x.get("title")) for x in old.get("headlines", [])]
    new_headlines = [(x.get("url"), x.get("title")) for x in headlines]
    changed = (old_keys != new_keys or old_headlines != new_headlines or
               old.get("source_warnings", []) != errors or
               old.get("sources_reporting", []) != live)
    if changed:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"checked_at": data["generated_at"], "source_count": len(live),
                      "headlines_seen": len(items), "priority_leads": len(leads),
                      "write_required": changed, "warnings": errors}, ensure_ascii=False))
    return {"changed": changed, **data}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", type=pathlib.Path, default=OUTPUT)
    args = ap.parse_args()
    now = dt.datetime.now(UTC)
    feeds = []
    errors = []
    for name, url in SOURCES:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA,
                "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml, */*"})
            with urllib.request.urlopen(request, timeout=14) as response:
                blob = response.read(2_000_000)
            feeds.append((name, blob))
        except Exception as exc:
            errors.append(f"{name}: {type(exc).__name__}: {str(exc)[:100]}")
    try:
        state = update(args.output, feeds, now)
    except RuntimeError as exc:
        print("HEADLINE WATCH ERROR: " + str(exc) + "; " + "; ".join(errors), file=sys.stderr)
        return 1
    if errors:
        print("SOURCES TEMPORARILY UNAVAILABLE: " + "; ".join(errors))
    if not state["priority"]:
        print("No source-documented major headlines in this scan; no fabricated updates.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
