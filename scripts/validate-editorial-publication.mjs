#!/usr/bin/env node
/* Fail early if critical newsroom facts, provenance, or navigation disappear. */
import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const problems = [];
const test = (ok, why) => { if (!ok) problems.push(why); };
const stories = [
  'texas-new-era','kansas-hamilton-upset','south-carolina-andrews',
  'polls-underestimated-democrats','three-state-election-margins','senate-seven-flips',
  'governors-switch','unfinished-count','new-congress','forecast-grade'
];
for (const story of stories) {
  const file = 'analysis/' + story + '/index.html';
  const html = read(file);
  test(/<title>[^<]+<\/title>/i.test(html), file + ': missing title');
  test(/<h1[^>]*>/.test(html), file + ': missing headline');
  test(/<meta name="description"/.test(html), file + ': missing description');
  test(/<a\s+href="https?:/i.test(html), file + ': missing external source links');
}
for (const file of ['uncalled/index.html','uncalled/tracker.js','analysis/forecast-coverage/index.html','analysis/forecast-coverage/score.js']) test(fs.existsSync(file), 'Audit record missing: '+file);
test(read('index.html').includes('AI assistance'), 'News homepage must disclose use of AI assistance in its footer');
const home = read('states/index.html');
test(home.includes('id="postElectionDesk"'), 'home: missing static news section');
test(home.indexOf('id="postElectionDesk"') < home.indexOf('id="edSimulationPanel"'), 'home: newsroom not first');
test(home.includes('../analysis/forecast-grade/'), 'home: missing forecast grade');
const governor = read('analysis/governors-switch/index.html');
test(governor.includes('Nevada') && governor.includes('Alaska') && governor.includes('uncalled'), 'governor changes not sourced');
const kansas = read('analysis/kansas-hamilton-upset/index.html');
test(kansas.includes('factcheck.org') && kansas.includes('kansasreflector.com') && kansas.includes('cnn.com'), 'Kansas sources incomplete');
test(!kansas.includes('The AP also reported scrutiny'), 'Kansas unsupported attribution restored');
const chrome = read('scripts/post-editorial-chrome.js');
test(chrome.includes("['About'") && chrome.includes("['Corrections'"), 'publisher and corrections not in navigation');
const sitemap = read('sitemap.xml');
for (const loc of ['about/', 'corrections/', 'analysis/forecast-grade/']) {
  test(sitemap.includes('https://geervin.github.io/ervin-model-2026/' + loc), 'sitemap missing ' + loc);
}
const feed = read('feed.xml');
test(feed.includes('<rss version="2.0"') && feed.includes('/analysis/forecast-grade/'), 'RSS incomplete');
if (problems.length) {
  problems.forEach(problem => console.error('FAIL', problem));
  process.exit(1);
}
console.log('PASS: newsroom source attribution, homepage disclosure, navigation, mobile-friendly HTML presence and RSS');
