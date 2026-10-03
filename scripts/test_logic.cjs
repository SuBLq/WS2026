/* Behavior checks for real search, calculator and worker code. No dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({ window: {}, Intl, console, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: { querySelector: () => null, querySelectorAll: () => [] } });
const run = file => vm.runInContext(read(file), context, { filename: file });
run('assets/js/calculator-math.js');
const duration = context.window.WOS.math.duration;
assert.equal(duration(86400, 100), 43200);
assert.equal(duration(86400, 100, .8), 34560);
assert.equal(duration(86400, 10 + 15 + 25), 57600);
assert.equal(duration(100, -100), 100);
assert.equal(duration(Infinity, 0), 0);

// Search can be tested without the UI: its public pure functions use real data.
vm.runInContext(read('assets/js/search.js'), vm.createContext({ window: context.window, Intl }));
run('assets/js/search-index.js');
const rank = context.window.WOS.search.rank, index = context.window.WOS_SEARCH_INDEX;
assert.equal(rank(index, 'медведь')[0].url, 'guides/events/bear-hunt.html');
assert.equal(rank(index, 'медведя')[0].url, 'guides/events/bear-hunt.html');
assert.equal(rank(index, 'стройка')[0].url, 'tools/construction/index.html');
assert.equal(rank(index, 'калькулятор строительства')[0].url, 'tools/construction/index.html');
assert.equal(rank(index, 'исследования')[0].url, 'tools/research/index.html');
assert.equal(rank(index, 'неизвестноеслово').length, 0);
assert.equal(rank(index, '<script>alert(1)</script>').length, 0);

// Expose closed-over engine functions only inside this isolated test context.
run('tools/research/research-data.js');
const source = read('tools/research/research-app.js').replace(/\ninit\(\);\s*\n\}\)\(\);\s*$/, '\nwindow.engine={buildTechs,closure,topo,simulate,cumulativeReqs,maxLevel,normalizeState,cascadeDown,techs:()=>TECHS};\n})();');
assert.notEqual(source, read('tools/research/research-app.js'));
vm.runInContext(source, context); const engine = context.window.engine; engine.buildTechs();
const techs = engine.techs(); let routes = 0;
for (const [id, tech] of Object.entries(techs)) {
  const target = engine.closure({}, id, engine.maxLevel(id));
  const order = engine.topo({}, target), completed = {};
  assert.ok(order.length, id);
  for (const node of order) {
    assert.equal(node.l, (completed[node.id] || 0) + 1, 'Skipped a level: ' + node.key);
    for (const [required, level] of Object.entries(engine.cumulativeReqs(node.id, node.l))) assert.ok((completed[required] || 0) >= level, 'Prerequisite order: ' + node.key + ' requires ' + required);
    completed[node.id] = node.l;
  }
  assert.equal(completed[id], engine.maxLevel(id));
  const result = engine.simulate({}, target, 100);
  let speed = 100, time = 0, base = 0; const resources = { meat: 0, wood: 0, coal: 0, iron: 0, steel: 0 };
  for (const node of order) {
    const data = techs[node.id].levels[String(node.l)], seconds = Number(data['research-time-seconds']) || 0;
    time += seconds / (1 + speed / 100); base += seconds;
    for (const resource of Object.keys(resources)) resources[resource] += Number(data.cost?.[resource]) || 0;
    if (techs[node.id].stat === 'research-speed') speed += Number(data['stat-addition']) || 0;
  }
  assert.ok(Math.abs(result.actual - time) < .001, 'Duration differs: ' + id);
  assert.equal(result.base, base); for (const key of Object.keys(resources)) assert.equal(result[key], resources[key]);
  assert.equal(engine.simulate(target, target, 100).nodes, 0, 'Completed technology charged again'); routes++;
}
run('assets/js/construction-data.js');
const db = context.window.WOS_BUILD_DATA;
assert.equal(Object.keys(db).length, 11); assert.equal(Object.values(db).flat().length, 206);
const furnace = db['Топка'].find(item => item.label === '25 → 26');
assert.equal(furnace.seconds, 1823160); assert.equal(duration(furnace.seconds, 100), 911580);
assert.equal(furnace.resources.food, 100000000);

async function testWorker() {
  const cachesMap = new Map(); let fetches = 0, offline = false, failImage = false;
  const urlOf = request => typeof request === 'string' ? new URL(request, 'https://example.test/WS2026/').href : request.url;
  function cache(name) {
    if (!cachesMap.has(name)) cachesMap.set(name, new Map()); const map = cachesMap.get(name);
    return {
      async match(request, options) {
        const url = urlOf(request);
        if (map.has(url)) return map.get(url).clone();
        if (options?.ignoreSearch) { const clean = value => value.split('?')[0]; for (const [key, response] of map) if (clean(key) === clean(url)) return response.clone(); }
      },
      async put(request, response) { map.set(urlOf(request), response.clone()); },
      async addAll(urls) { for (const url of urls) map.set(urlOf(url), new Response('shell')); },
      async keys() { return [...map.keys()].map(url => new Request(url)); },
      async delete(request) { return map.delete(urlOf(request)); }
    };
  }
  const handlers = {}, worker = vm.createContext({ URL, Request, Response, AbortController, setTimeout, clearTimeout,
    self: { location: { href: 'https://example.test/WS2026/sw.js' }, addEventListener: (type, handler) => { handlers[type] = handler; }, clients: { claim: async () => {} }, skipWaiting() {} },
    caches: { open: async name => cache(name), keys: async () => [...cachesMap.keys()], delete: async name => cachesMap.delete(name) },
    fetch: async request => { fetches++; if (offline) throw Error('offline'); return new Response('network', { status: failImage && urlOf(request).includes('bad.webp') ? 404 : 200 }); }
  });
  vm.runInContext(read('sw.js'), worker);
  let pending; handlers.install({ waitUntil: promise => { pending = promise; } }); await pending;
  const shellName = [...cachesMap.keys()][0]; assert.equal(cachesMap.get(shellName).size, 16);
  async function request(url, mode = 'cors') {
    let response; handlers.fetch({ request: { url: 'https://example.test' + url, method: 'GET', mode }, respondWith: promise => { response = promise; } }); return response;
  }
  assert.equal(await request('/other/site.js'), undefined, 'Worker escaped project scope');
  await request('/WS2026/a.js?v=1'); const count = fetches;
  await request('/WS2026/a.js?v=1'); assert.equal(fetches, count, 'Cached asset fetched again');
  await request('/WS2026/a.js?v=2'); assert.equal(fetches, count + 1, 'New asset version not fetched');
  await request('/WS2026/guides/test.html', 'navigate'); offline = true;
  assert.equal(await (await request('/WS2026/guides/test.html', 'navigate')).text(), 'network');
  assert.equal((await request('/WS2026/guides/unvisited.html', 'navigate')).status, 503);
  offline = false; failImage = true; let reply;
  handlers.message({ data: { type: 'SAVE_PAGE', url: 'https://example.test/WS2026/test.html', resources: ['https://example.test/WS2026/bad.webp'] }, ports: [{ postMessage: data => { reply = data; } }], waitUntil: promise => { pending = promise; } }); await pending;
  assert.equal(reply.ok, false, 'Failed page claimed available offline');
  failImage = false;
  handlers.message({ data: { type: 'SAVE_PAGE', url: 'https://example.test/WS2026/test.html', resources: ['https://example.test/WS2026/good.webp'] }, ports: [{ postMessage: data => { reply = data; } }], waitUntil: promise => { pending = promise; } }); await pending;
  assert.equal(reply.ok, true); assert.equal(cachesMap.get('wos-guide-saved-v1').size, 2);
  cachesMap.set('wos-guide-site-v79', new Map()); handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.ok(!cachesMap.has('wos-guide-site-v79')); assert.ok(cachesMap.has('wos-guide-saved-v1'));
}
testWorker().then(() => console.log('PASS: search, construction data/bonuses, ' + routes + ' research routes, cache versions/scope/offline downloads.')).catch(error => { console.error(error); process.exitCode = 1; });
