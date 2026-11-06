// STABILIZATION step 2: the CPU/runtime audit of a route, EXACT counts per drawn frame (fixed 60 Hz steps, every step
// drawn): physics calls by kind, interaction lookups, raycasts and the objects they test, path searches and their cells,
// DOM mutations, localStorage writes (synchronous saves), console output, desktop IPC (window.desktop calls), rAF
// requests; and the JS allocated per frame by function (V8's sampling heap profiler; garbage the collector must clear).
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street CAM=follow FRAMES=120 [TOP=30] node audit.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 120), TOP = +(process.env.TOP || 30);
const { browser, context, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => {
  try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {}
  const C = (window.__aud = { on: false, n: {} }), inc = (k, v = 1) => { if (C.on) C.n[k] = (C.n[k] || 0) + v; };
  const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { inc('localStorage writes'); inc('localStorage KB written', String(v).length / 1024); return set.call(this, k, v); };
  for (const m of ['log', 'info', 'warn', 'debug']) { const f = console[m]; console[m] = function (...a) { inc('console.' + m); return f.apply(this, a); }; }
}, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(async ({ id, cam }) => {
  const G = game, C = window.__aud, inc = (k, v = 1) => { if (C.on) C.n[k] = (C.n[k] || 0) + v; };
  const THREE = await import('three');
  const route = G.bench.routes().find((x) => x.id === id);
  G.bench.setCamera(cam); G.state = 'play'; route.setup(); G.state = 'play';
  window.__route = route; window.__t = 0;
  for (let i = 0; i < 240; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 3 === 0); }
  // counters
  const P = G.physics;
  for (const m of ['move', 'fall', 'groundInfo', 'steepAt', 'blockedAt', 'solidAt', 'clearTo', 'lineOfSight', 'near', '_inside', '_push', 'ballFenceAt', 'ballFenceBetween']) { const f = P[m]; if (typeof f !== 'function') continue; P[m] = function (...a) { inc('physics.' + m); const r = f.apply(this, a); if (m === 'near' && r?.length != null) inc('physics.near candidates', r.length); return r; }; }
  { const f = G.findInteractable; G.findInteractable = function (...a) { inc('findInteractable'); return f.apply(this, a); }; }
  { const f = G.story.interactables; if (f) G.story.interactables = function (consider, dist) { inc('story.interactables'); return f.call(this, (...a) => { inc('interactables considered'); return consider(...a); }, dist); }; }
  for (const m of ['intersectObject', 'intersectObjects']) { const f = THREE.Raycaster.prototype[m]; THREE.Raycaster.prototype[m] = function (...a) { inc('raycast.' + m); return f.apply(this, a); }; }
  for (const K of [THREE.Mesh, THREE.InstancedMesh, THREE.SkinnedMesh, THREE.Points, THREE.Line, THREE.Sprite]) { const f = K.prototype.raycast; if (!Object.prototype.hasOwnProperty.call(K.prototype, 'raycast')) continue; K.prototype.raycast = function (...a) { inc('raycast: objects tested'); return f.apply(this, a); }; }
  const WN = G.walknav || G.walkers?.nav || G.nav;
  if (WN) for (const m of ['request', 'step', 'planSync', 'info', 'lineOK', 'nearest']) { const f = WN[m]; if (typeof f !== 'function') continue; WN[m] = function (...a) { inc('walknav.' + m); return f.apply(this, a); }; }
  if (window.desktop) for (const k of Object.keys(window.desktop)) { const f = window.desktop[k]; if (typeof f === 'function') window.desktop[k] = (...a) => { inc('desktop IPC.' + k); return f(...a); }; }
  { const f = window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { inc('rAF requests'); return f(cb); }; }
  window.__mo = new MutationObserver(() => {}); window.__mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  window.__walkHas = !!WN;
}, { id: ID, cam: process.env.CAM || 'orbit' });
const cdp = await context.newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
const r = await ev((n) => {
  const G = game, C = window.__aud; C.n = {}; C.on = true; let dom = 0, domKinds = {};
  window.__mo.takeRecords();
  for (let i = 0; i < n; i++) {
    window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60); G.frame(1 / 60, true);
    for (const m of window.__mo.takeRecords()) { dom++; const k = m.type + ' ' + (m.target.id ? '#' + m.target.id : m.target.nodeName?.toLowerCase() || '?') + (m.attributeName ? '@' + m.attributeName : ''); domKinds[k] = (domKinds[k] || 0) + 1; }
  }
  C.on = false;
  return { n: C.n, dom, domKinds: Object.entries(domKinds).sort((a, b) => b[1] - a[1]).slice(0, 12), walk: window.__walkHas, npcs: G.npcs.length, present: G.npcs.filter((x) => x.present).length };
}, FR);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const self = new Map(); let total = 0;
const walk = (n, parent) => { const f = n.callFrame, me = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber + 1}`; const k = f.url ? me : `${f.functionName || '(builtin)'} ← ${parent}`; if (n.selfSize) { self.set(k, (self.get(k) || 0) + n.selfSize); total += n.selfSize; } for (const c of n.children || []) walk(c, f.url ? me : parent); };
walk(profile.head, '(root)');
console.log(`STABILIZATION audit · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · camera ${process.env.CAM || 'orbit'} · ${FR} drawn frames · people ${r.npcs} (present ${r.present}) · walknav found ${r.walk}`);
console.log('-- per frame (exact counts / FRAMES)');
for (const [k, v] of Object.entries(r.n).sort((a, b) => b[1] - a[1])) console.log(`  ${(v / FR).toFixed(2).padStart(9)}  ${k}`);
console.log(`  ${(r.dom / FR).toFixed(2).padStart(9)}  DOM mutations; most: ${r.domKinds.map(([k, v]) => `${k} ${(v / FR).toFixed(2)}`).join(' · ')}`);
console.log(`-- JS allocated: ${(total / FR / 1024).toFixed(1)} KB a frame (sampled), by function:`);
for (const [k, b] of [...self].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log((b / FR / 1024).toFixed(2).padStart(9), 'KB', k);
await browser.close();
