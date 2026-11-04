import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const p of ['states/index.html','state/index.html','election-night/index.html','house/index.html','governors/index.html','stats-for-nerds/index.html','michigan/election-night/index.html','elections/index.html'])assert(read(p).includes('returns-core.js'),p+' must load source validator');
for(const p of ['house/index.html','governors/index.html']){assert(read(p).includes('office-live-results.js'));assert(read(p).includes('id="officeLiveStatus"'))}
assert(read('house/board.js').includes('ervin:office-results'));
assert(read('governors/board.js').includes('ervin:office-results'));
assert(read('stats-for-nerds/app.js').includes("core.openAmerica(outcomes[5].value,'Governor')"));
assert(read('michigan/election-night/app.js').includes('core.preferCivic'),'Michigan must use national reconciliation');
assert(read('elections/night-desk.js').includes('core.preferCivic'),'Legacy race dossier must use national reconciliation');
for(const p of ['scripts/office-live-results.js','state/app.js','election-night/night.js','scripts/home-election-2026.js'])assert(read(p).includes('60000'));
console.log('PASS: live result feeds wired across House, governors, State Desk, Michigan, national desk, and diagnostics');
