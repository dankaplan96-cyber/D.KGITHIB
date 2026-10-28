// AUTO-QUALITY (I-13) in the game: the Auto setting, its migration from stored settings, the Settings screen, the
// knobs reaching the renderer / shadow map / lamps / vegetation / small casters, the commit knobs held to a scene
// change or a menu, plug / unplug, the title calibration and its cache, Auto vs the presets chosen by hand, the
// benchmark's Auto run. SwiftShader: no frame rate here means anything — the governor is fed frame times directly
// (game.autoQ.gov.frame), as tests/autoquality.mjs does for its logic.
//   GAME_URL=http://localhost:8123/ node tests/autoquality-game.mjs
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
const KEY = 'sunshard_settings_v1', CACHE = 'lba3_autoq_v1';
const reopen = async (q = '?nocine', set = undefined) => {
  await ev(([k, v, c]) => { localStorage.removeItem(c); if (v === null) localStorage.removeItem(k); else if (v !== undefined) localStorage.setItem(k, JSON.stringify(v)); }, [KEY, set, CACHE]);
  await open(page, q);   // (open() navigates afresh)
};
const st = () => ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, hand: game.settings.qualityChosenByHand, qv: game.settings.qv, knobs: game.renderer.knobs, label: game.autoQ.label(), src: game.autoQ.source }));

// ---------------------------------------------------------------- 1. a new player: Auto
await open(page, '?nocine');
const s1 = await st();
check('a new player: Quality Auto (not chosen by hand), running High here (software renderer under the tests: the governor is off)', s1.auto === true && s1.hand === false && s1.qv === 2 && s1.q === 'high' && s1.label === 'High' && !!s1.knobs && s1.src === 'test', s1);

// ---------------------------------------------------------------- 2. migration of stored settings
const mig = [];
for (const [name, set, want] of [
  ['the preset the game picked by GPU name (qv 1, never picked)', { quality: 'high', qv: 1, v: 2 }, { auto: true, hand: false }],
  ['a preset picked in Settings (qPicked)', { quality: 'medium', qPicked: true, qv: 1, v: 2 }, { auto: false, hand: true, q: 'medium' }],
  ['a preset from before 0.30 that is neither automatic pick (chosen by hand then)', { quality: 'low' }, { auto: false, hand: true, q: 'low' }],
  ['the old automatic pick from before 0.30', { quality: 'high' }, { auto: true, hand: false }],
  ['settings already on v2, Auto off by hand', { quality: 'medium', qv: 2, qualityAuto: false, qualityChosenByHand: true, v: 2 }, { auto: false, hand: true, q: 'medium' }],
  ['settings already on v2, Auto on', { quality: 'low', qv: 2, qualityAuto: true, qualityChosenByHand: false, v: 2 }, { auto: true, hand: false, q: 'high' }],
]) {
  await reopen('?nocine', set);
  const s = await st();
  const ok = s.auto === want.auto && s.hand === want.hand && (!want.q || s.q === want.q) && (s.auto ? !!s.knobs : s.knobs === null);
  mig.push(ok); check(`migration: ${name} → ${want.auto ? 'Auto' : `${want.q} by hand`}`, ok, { set, s });
}

// ---------------------------------------------------------------- 3. the Settings screen
await reopen('?nocine', null);
await page.click('#title [data-act="settings"]'); await ev(() => game.step(0.05));
await page.click('#settings [data-tab="display"]');
const ui0 = await ev(() => ({ chips: [...document.querySelectorAll('#settings .seg[data-setting="quality"] button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')), hint: document.querySelector('#settings [data-hint="quality"] .set-hint').textContent }));
check('Settings → Display → Graphics offers Auto / Low / Medium / High, Auto on, and says what it runs now', ui0.chips.join() === 'Auto*,Low,Medium,High' && /^Auto \(High\)/.test(ui0.hint) && /55–60 fps/.test(ui0.hint), ui0);
await page.click('#settings .seg[data-setting="quality"] button[data-v="medium"]');
const ui1 = await ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, hand: game.settings.qualityChosenByHand, knobs: game.renderer.knobs, on: document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v, map: game.env.sun.shadow.mapSize.x, bloom: game.renderer.bloom.enabled, hint: document.querySelector('#settings [data-hint="quality"] .set-hint').textContent }));
check('Medium by hand: the preset as it always was (no knobs, 1024 map, no bloom), recorded as chosen by hand, no Auto line', ui1.q === 'medium' && ui1.auto === false && ui1.hand === true && ui1.knobs === null && ui1.on === 'medium' && ui1.map === 1024 && !ui1.bloom && !/Auto/.test(ui1.hint), ui1);
await page.click('#settings .seg[data-setting="quality"] button[data-v="auto"]');
const ui2 = await ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, knobs: game.renderer.knobs, on: document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v, map: game.env.sun.shadow.mapSize.x, stored: JSON.parse(localStorage.getItem('sunshard_settings_v1')).qualityAuto }));
check('Auto again: the knobs back (High here), stored', ui2.auto === true && !!ui2.knobs && ui2.on === 'auto' && ui2.map === 4096 && ui2.stored === true, ui2);
await page.click('#settings [data-act="back"]');

// ---------------------------------------------------------------- 4. Auto at High / Medium vs the presets by hand
await menu(page, 'new');
const cmp = await ev(() => {
  const G = game, A = G.autoQ, out = {};
  const route = G.bench.routes().find((r) => r.id === 'street');
  const look = () => { G.state = 'play'; route.setup(); G.state = 'play'; G.frame(1 / 30, true); G.frame(1 / 30, true); G.frame(1 / 30, true); G.perf.beginFrame(); G.frame(1 / 30, true); const c = G.graphicsConfig(); return { ...c, calls: G.renderer.renderer.info.render.calls, lampsPool: G.lightPool.lights.length, cell: G.shadowCull.cell, casters: G.shadowCull.quality, samples: G.renderer.composer.renderTarget1.samples }; };
  G.settings.quality = 'high'; G.settings.qualityAuto = false; G.applySettings(); out.high = look();
  G.settings.qualityAuto = true; G.settings.quality = A.tier(); A.gov.setLevels(0, 0, 'test', true); G.applySettings(); A.applyAll(); out.autoHigh = look();
  G.settings.quality = 'medium'; G.settings.qualityAuto = false; G.applySettings(); out.medium = look();
  // Auto at the ladders' Medium marks, its resolution step taken back (Auto's Medium is drawn at 90 %)
  G.settings.qualityAuto = true; A.gov.setLevels(7, 4, 'test', true); G.settings.quality = A.tier(); G.applySettings(); A.applyAll(); G.renderer.setDyn(1); out.autoMed = look(); out.autoMedLabel = A.label();
  A.gov.setLevels(0, 0, 'test', true); A.applyAll(); G.settings.quality = A.tier(); G.applySettings();
  return out;
});
const same = (a, b, keys) => keys.every((k) => a[k] === b[k]);
const K = ['shadowFilter', 'pr', 'msaa', 'fxaa', 'shadows', 'shadowMap', 'bloom', 'lamps', 'smallFar', 'treeNear', 'samples', 'cell', 'lampsPool'];
check('Auto at the top of its ladders is High exactly: same pixel ratio, MSAA, shadow map / filter, bloom, lamps, vegetation, shadow cells, and the same draw calls', same(cmp.high, cmp.autoHigh, [...K, 'calls']), { high: cmp.high, auto: cmp.autoHigh });
check('Auto at its Medium marks (resolution back to 100 %) renders as Medium: filter, MSAA, map, bloom, lamps, vegetation, small casters (only the shadow cells stay High\'s 32 m)', same(cmp.medium, cmp.autoMed, ['shadowFilter', 'msaa', 'fxaa', 'shadows', 'shadowMap', 'bloom', 'lamps', 'smallFar', 'treeNear', 'samples', 'lampsPool']) && cmp.autoMed.casters === 'medium' && cmp.autoMed.cell === 32 && /^Medium/.test(cmp.autoMedLabel), { medium: cmp.medium, auto: cmp.autoMed, label: cmp.autoMedLabel });

// ---------------------------------------------------------------- 5. the governor's steps reach the picture; commit knobs wait
const live = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov, out = [];
  A.test = false; gov.enabled = true; gov.reset(0); gov.lastChange = -1e9; gov.lastDown = -1e9;   // (the governor on, as on a real GPU)
  let t = performance.now() + 100000;
  const feed = (secs, ms, cpu, gpu) => { for (let s = 0; s < secs * 1000; s += ms) { t += ms; gov.gpu(t, gpu); gov.frame({ t, ms, cpu, play: true }); } };
  const snap = (n) => ({ n, label: A.label(), scale: G.renderer.effScale(), bloom: G.renderer.bloom.enabled, map: G.env.sun.shadow.mapSize.x, filter: G.renderer.renderer.shadowMap.type, pending: gov.pending(), samples: G.renderer.composer.renderTarget1.samples });
  out.push(snap('start'));
  const n0 = A.log.length;
  feed(4, 25, 6, 23); out.push(snap('gpu pressure 4 s'));
  feed(9, 25, 6, 23); out.push(snap('gpu pressure 13 s'));
  return { out, steps: A.log.slice(n0).filter((e) => e.kind === 'down').map((e) => e.what) };
});
const L = live.out, S = live.steps;
check('GPU pressure through the game: first 90 % resolution (the scene pass\'s factor), then no bloom (the bloom pass off), then the shadow filter waits for a scene change while the 2048 map comes in',
  L[1].scale === 0.9 && L[1].bloom && /^scale/.test(S[0]) && /^bloom/.test(S[1]) && /^filter.*map/.test(S[2]) && !L[2].bloom && L[2].pending.includes('filter') && L[2].map === 2048 && L[2].filter === 2, live);
const commit = await ev(() => {
  const G = game, A = G.autoQ, before = G.renderer.renderer.shadowMap.type;
  G.setState('pause'); A.frame(1 / 60, 5); const afterPause = { type: G.renderer.renderer.shadowMap.type, pending: A.gov.pending(), hold: !!G.gfxHold };
  G.setState('play');
  return { before, afterPause, log: A.log.slice(-2).map((e) => e.kind + ': ' + (e.what || e.why)) };
});
check('... and the pause menu commits it (PCF soft → PCF, programs made behind the menu)', commit.before === 2 && commit.afterPause.type === 1 && !commit.afterPause.pending.length, commit);
const tr = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  gov.setLevels(4, 0, 'test', true); A.applyAll();
  // one GPU step that queues the lamps (a commit knob) and takes MSAA 2× now
  let t = performance.now() + 500000; gov.lastChange = -1e9; gov.hist = []; gov.quietUntil = 0;
  for (let s = 0; s < 4000; s += 25) { t += 25; gov.gpu(t, 23); gov.frame({ t, ms: 25, cpu: 6, play: true }); }
  G.renderer.applyResize();   // (a new sample count is applied just before the next frame is drawn)
  const mid = { pending: gov.pending(), lamps: G.lightPool.lights.length, samples: G.renderer.composer.renderTarget1.samples };
  G.enterRoom('house', null, false, true);
  for (let i = 0; i < 60 && G.trans; i++) G.frame(1 / 30, true);
  return { mid, after: { pending: gov.pending(), lamps: G.lightPool.lights.length, room: G.room?.id } };
});
check('a step onto the lamps (4) queues them and takes MSAA 2× at once; the next scene change (the house door) commits the lamps', tr.mid.pending.includes('lamps') && tr.mid.lamps === 8 && tr.mid.samples === 2 && !tr.after.pending.length && tr.after.lamps === 4 && tr.after.room === 'house', tr);

// ---------------------------------------------------------------- 6. plug / unplug
const pw = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  gov.setLevels(0, 0, 'test', true); A.applyAll();
  localStorage.removeItem('lba3_autoq_v1'); A.cache = {};
  G.setBattery(true); const bat = { g: gov.g, c: gov.c, label: A.label(), key: A.key, msaa: G.renderer.composer.renderTarget1.samples };
  G.setBattery(false); const ac = { g: gov.g, c: gov.c, label: A.label(), key: A.key };
  return { bat, ac, log: A.log.slice(-3).map((e) => e.why) };
});
check('unplugged with nothing measured on battery: one tier lower on both ladders (Medium marks), the battery key; plugged in again: one tier up (High)', pw.bat.g === 7 && pw.bat.c === 4 && /battery/.test(pw.bat.key) && pw.ac.g === 0 && pw.ac.c === 0 && /mains/.test(pw.ac.key), pw);
const nop = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  G.setBattery(true); gov.setLevels(3, 0, 'test', true); A.applyAll();
  let t = performance.now() + 900000; gov.lastChange = -1e9; gov.hist = []; gov.quietUntil = 0; const n0 = A.log.length;
  for (let s = 0; s < 30000; s += 25) { t += 25; gov.gpu(t, 30); gov.frame({ t, ms: 30, cpu: 6, play: true }); }
  const steps = A.log.slice(n0).filter((e) => e.kind === 'down').map((e) => e.what);
  G.setBattery(false);
  return steps;
});
check('on battery the GPU ladder skips the battery profile\'s own knobs (MSAA, filter, lamps)', nop.length >= 2 && nop.every((w) => !/msaa|filter|lamps/.test(w)), nop);

// ---------------------------------------------------------------- 7. the title calibration and its cache (?autoq: the governor on under the tests)
await reopen('?nocine&autoq', null);
const cal = await ev(() => {
  const G = game, A = G.autoQ;
  const before = { src: A.source, cal: !!A.cal, g: A.gov.g, c: A.gov.c };
  // the title's frames: GPU 13 ms, CPU 9 ms at High (fed as the loop would: frame times and timer results)
  G.state = 'title'; G.testFreeze = false;
  let r = null;
  try { for (let i = 0; i < 400 && !A.calResult; i++) { A.cal.gpu(13); A.frame(1 / 60, 9); const t = performance.now(); while (performance.now() - t < 6); } }
  finally { G.testFreeze = true; }
  r = A.calResult;
  return { before, r, pending: A.pendingStart, cached: JSON.parse(localStorage.getItem('lba3_autoq_v1') || '{}')[A.key] || null };
});
check('a first start with the governor on: the GPU name\'s guess, then the title measured (~2 s): a start position below High for 13 ms GPU / 9 ms CPU, cached for this machine', cal.before.src === 'guess' && cal.before.cal && cal.r && cal.r.gpuMs === 13 && (cal.r.g > 0 || cal.r.c > 0) && cal.cached?.src === 'calib' && cal.cached.g === cal.r.g, cal);
// (startNew directly: the title's New Game reloads the page once the session is "dirty", as the probes above made it)
await ev(() => { game.hideScreens(); game.startNew(); game.step(0.2); });
const started = await ev(() => ({ g: game.autoQ.gov.g, c: game.autoQ.gov.c, label: game.autoQ.label(), pending: game.autoQ.gov.pending() }));
check('... play starts at the calibrated position, its commit knobs in force', started.g === cal.r.g && started.c === cal.r.c && !started.pending.length, started);
await open(page, '?nocine&autoq');
const again = await ev(() => ({ src: game.autoQ.source, cal: !!game.autoQ.cal, g: game.autoQ.gov.g, c: game.autoQ.gov.c }));
check('... the next start uses the cache: no calibration, the same position', again.src === 'calib' && !again.cal && again.g === cal.r.g && again.c === cal.r.c, again);

// ---------------------------------------------------------------- 8. the benchmark: Auto's lines and the Auto run
await reopen('?nocine', null);
await menu(page, 'new');
const rep = await ev(async () => {
  const G = game; G.testFreeze = false;
  const text = await G.bench.runAuto({ routes: ['street'], measure: 3 });
  return { text, auto: G.settings.qualityAuto, benching: G.benching };
});
{ const out = new URL('./out/', import.meta.url).pathname; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(out + 'autoquality-bench-auto.txt', rep.text); }   // (a SwiftShader sample of the report)
check('the benchmark\'s Auto run (pause menu → Benchmark: Auto as played): a row per route, the states it ran, decisions, hitches with what ran in them; Auto still on afterwards',
  /Quality Auto as played/.test(rep.text) && /\n  street /.test(rep.text) && /frames at each state: High/.test(rep.text) && /decisions during the run/.test(rep.text) && /\[frame before: work \d+ ms/.test(rep.text) && rep.auto === true && rep.benching === false, rep.text.slice(0, 2500));
const fixed = await ev(async () => {
  const G = game;
  const text = await G.bench.run(['low'], { routes: ['street'], breakdown: false, played: false });
  return { text: text.split('\n').filter((l) => /quality:|Auto|street/.test(l)).join('\n'), auto: G.settings.qualityAuto, q: G.settings.quality, knobs: !!G.renderer.knobs };
});
check('the full benchmark\'s fixed runs use the presets by hand and give Auto back at the end; its report says what Auto ran', fixed.auto === true && fixed.knobs && fixed.q === 'high' && /quality: Auto — running High/.test(fixed.text), fixed);
await ev(() => { game.testFreeze = true; });

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
