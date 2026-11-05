"""Offline tests for the editorial headline watcher."""
import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("headline_watch", ROOT / "scripts" / "watch_major_headlines.py")
watch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(watch)
NOW = dt.datetime(2026, 11, 5, 3, tzinfo=dt.timezone.utc)
RSS_A = b"""<?xml version='1.0'?><rss version='2.0'><channel>
<item><title>Supreme Court rules on federal immigration case</title>
<link>https://news.example.org/politics/immigration-court</link>
<pubDate>Thu, 05 Nov 2026 02:10:00 GMT</pubDate></item>
<item><title>Local sports team wins game</title>
<link>https://news.example.org/sports/game</link>
<pubDate>Thu, 05 Nov 2026 02:12:00 GMT</pubDate></item>
</channel></rss>"""
RSS_B = b"""<?xml version='1.0'?><rss version='2.0'><channel>
<item><title>Federal immigration case decided by Supreme Court</title>
<link>https://another.example.net/us/court-case</link>
<pubDate>Thu, 05 Nov 2026 02:20:00 GMT</pubDate></item>
</channel></rss>"""
OLD_RSS = b"""<rss><channel>
<item><title>Governor resigns following election</title><link>https://example.com/old</link>
<pubDate>Tue, 03 Nov 2026 02:20:00 GMT</pubDate></item>
</channel></rss>"""
ATOM = b"""<feed xmlns='http://www.w3.org/2005/Atom'>
<entry><title>President announces historic cabinet resignation</title>
<link rel='alternate' href='https://atom.example.net/story'/>
<published>2026-11-05T02:50:00Z</published></entry></feed>"""


class HeadlineWatchTests(unittest.TestCase):
    def test_rss_excludes_sports_and_old_stories(self):
        a = watch.parse_feed(RSS_A, "Publisher A", NOW)
        self.assertEqual(len(a), 1)
        self.assertIn("Supreme Court", a[0]["title"])
        self.assertFalse(watch.parse_feed(OLD_RSS, "Publisher A", NOW))

    def test_atom_links_and_dates(self):
        a = watch.parse_feed(ATOM, "Publisher C", NOW)
        self.assertEqual(len(a), 1)
        self.assertEqual(a[0]["url"], "https://atom.example.net/story")

    def test_independent_reporting_is_grouped(self):
        articles = watch.parse_feed(RSS_A, "Publisher A", NOW) + watch.parse_feed(RSS_B, "Publisher B", NOW)
        priority, headlines = watch.rank(articles)
        self.assertEqual(len(headlines), 2)
        self.assertEqual(len(priority), 1)
        self.assertEqual(priority[0]["source_count"], 2)
        self.assertTrue(priority[0]["other_sources"])

    def test_json_idempotent_and_no_fake_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = pathlib.Path(tmp) / "latest.json"
            data = [("Publisher A", RSS_A), ("Publisher B", RSS_B)]
            first = watch.update(dest, data, NOW)
            second = watch.update(dest, data, NOW + dt.timedelta(minutes=30))
            self.assertTrue(first["changed"])
            self.assertFalse(second["changed"])
            seven_hours = watch.update(dest, data, NOW + dt.timedelta(hours=7))
            self.assertFalse(seven_hours["changed"], "An unchanged scan must not rewrite public JSON merely because six hours elapsed")
            saved = json.loads(dest.read_text())
            self.assertEqual(saved["priority"][0]["source_count"], 2)
            self.assertEqual(saved["generated_at"], NOW.isoformat().replace("+00:00", "Z"))
            with self.assertRaises(RuntimeError):
                watch.update(dest, [("Publisher A", RSS_A)], NOW)


if __name__ == "__main__":
    unittest.main()
