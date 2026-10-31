// AUTO-QUALITY (I-13; settle-then-hold, PERF-CPU) in the game: the Auto setting, its migration from stored settings,
// the Settings screen, the five profiles reaching the renderer / shadow map / lamps / vegetation / small casters / the
// people's animation rate and far detail, every decision held to a scene change or a menu, plug / unplug, the title
// calibration, the evaluation, the settled profile's cache and the next start's try one up, Auto vs the presets chosen
// by hand, the benchmark's Auto run. SwiftShader: no frame rate here means anything — the governor is fed frame times directly
// (game.autoQ.gov.frame), as tests/autoquality.mjs does for its logic.
//   GAME_URL=http://localhost:8123/ node tests/autoquality-game.mjs
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
const KEY = 'sunshard_settings_v1', CACHE = 'lba3_autoq_v4';
const reopen = async (q = '?nocine', set = undefined) => {
  await ev(([k, v, c]) => { localStorage.removeItem(c); if (v === null) localStorage.removeItem(k); else if (v !== undefined) localStorage.setItem(k, JSON.stringify(v)); }, [KEY, set, CACHE]);
  await open(page, q);   // (open() navigates afresh)
};
const st = () => ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, hand: game.settings.qualityChosenByHand, qv: game.settings.qv, knobs: game.renderer.knobs, label: game.autoQ.label(), src: game.autoQ.source }));

// ---------------------------------------------------------------- 1. a new player: Auto
await open(page, '?nocine');
const s1 = await st();
check('a new player: Quality Auto (not chosen by hand), running High here (software renderer under the tests: the governor is off)', s1.auto === true && s1.hand === false && s1.qv === 4 && s1.q === 'high' && s1.label === 'High' && !!s1.knobs && s1.src === 'test', s1);

// ---------------------------------------------------------------- 2. migration of stored settings
const mig = [];
for (const [name, set, want] of [
  ['the preset the game picked by GPU name (qv 1, never picked)', { quality: 'high', qv: 1, v: 2 }, { auto: true, hand: false }],
  // (settings v3, the user 28.10 — no manual tuning: one time, every older setting moves to Auto, a hand-picked one included)
  ['a preset picked in Settings (qPicked), before v3: Auto once', { quality: 'medium', qPicked: true, qv: 1, v: 2 }, { auto: true, hand: false }],
  ['a preset from before 0.30 that is neither automatic pick, before v3: Auto once', { quality: 'low' }, { auto: true, hand: false }],
  ['the old automatic pick from before 0.30', { quality: 'high' }, { auto: true, hand: false }],
  ['settings on v2, Auto off by hand, before v3: Auto once', { quality: 'medium', qv: 2, qualityAuto: false, qualityChosenByHand: true, v: 2 }, { auto: true, hand: false }],
  ['settings on v3, a preset picked by hand after the switch: kept', { quality: 'medium', qv: 3, qualityAuto: false, qualityChosenByHand: true, v: 2 }, { auto: false, hand: true, q: 'medium' }],
  ['settings already on v2, Auto on', { quality: 'low', qv: 2, qualityAuto: true, qualityChosenByHand: false, v: 2 }, { auto: true, hand: false, q: 'high' }],
]) {
  await reopen('?nocine', set);
  const s = await st();
  const ok = s.auto === want.auto && s.hand === want.hand && (!want.q || s.q === want.q) && (s.auto ? !!s.knobs : s.knobs === null);
  mig.push(ok); check(`migration: ${name} → ${want.auto ? 'Auto' : `${want.q} by hand`}`, ok, { set, s });
}

// ---------------------------------------------------------------- 3. the Settings screen
// (a preset's click makes its shader programs at once, synchronously: on a loaded software renderer that can take
//  minutes, so the clicks wait long — PERF-CPU)
await reopen('?nocine', null);
await page.click('#title [data-act="settings"]', { timeout: 600000 }); await ev(() => game.step(0.05));
await page.click('#settings [data-tab="display"]', { timeout: 600000 });
const ui0 = await ev(() => ({ chips: [...document.querySelectorAll('#settings .seg[data-setting="quality"] button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')), hint: document.querySelector('#settings [data-hint="quality"] .set-hint').textContent }));
check('Settings → Display → Graphics offers Auto / Low / Medium / High, Auto on, and says what it runs now', ui0.chips.join() === 'Auto*,Low,Medium,High' && /^Auto \(High\)/.test(ui0.hint) && /55–60 fps/.test(ui0.hint), ui0);
await page.click('#settings .seg[data-setting="quality"] button[data-v="medium"]', { timeout: 600000 });
const ui1 = await ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, hand: game.settings.qualityChosenByHand, knobs: game.renderer.knobs, on: document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v, map: game.env.sun.shadow.mapSize.x, bloom: game.renderer.bloom.enabled, hint: document.querySelector('#settings [data-hint="quality"] .set-hint').textContent }));
check('Medium by hand: the preset as it always was (no knobs, 1024 map, no bloom), recorded as chosen by hand, no Auto line', ui1.q === 'medium' && ui1.auto === false && ui1.hand === true && ui1.knobs === null && ui1.on === 'medium' && ui1.map === 1024 && !ui1.bloom && !/Auto/.test(ui1.hint), ui1);
await page.click('#settings .seg[data-setting="quality"] button[data-v="auto"]', { timeout: 600000 });
const ui2 = await ev(() => ({ q: game.settings.quality, auto: game.settings.qualityAuto, knobs: game.renderer.knobs, on: document.querySelector('#settings .seg[data-setting="quality"] button.on')?.dataset.v, map: game.env.sun.shadow.mapSize.x, stored: JSON.parse(localStorage.getItem('sunshard_settings_v1')).qualityAuto }));
check('Auto again: the knobs back (High here), stored', ui2.auto === true && !!ui2.knobs && ui2.on === 'auto' && ui2.map === 4096 && ui2.stored === true, ui2);
await page.click('#settings [data-act="back"]', { timeout: 600000 });

// ---------------------------------------------------------------- 4. Auto's profiles vs the presets by hand
await menu(page, 'new');
const cmp = await ev(() => {
  const G = game, A = G.autoQ, out = {};
  const route = G.bench.routes().find((r) => r.id === 'street');
  const look = () => { G.state = 'play'; route.setup(); G.state = 'play'; G.frame(1 / 30, true); G.frame(1 / 30, true); G.frame(1 / 30, true); G.perf.beginFrame(); const RR = G.renderer.renderer, rbd = RR.renderBufferDirect; let main = 0; RR.renderBufferDirect = function (cam, scene, ...a) { if (scene) main++; return rbd.call(this, cam, scene, ...a); }; try { G.frame(1 / 30, true); } finally { RR.renderBufferDirect = rbd; } const c = G.graphicsConfig(); return { ...c, calls: main, lampsPool: G.lightPool.lights.length, cell: G.shadowCull.cell, casters: G.shadowCull.quality, samples: G.renderer.composer.renderTarget1.samples, eco: G.farCull.anim.eco, partPx: G.farCull.partPx }; };
  const at = (p) => { G.settings.qualityAuto = true; A.gov.setProfile(p, 'test', { phase: 'hold', commitNow: true }); G.settings.quality = A.tier(); G.applySettings(); A.applyAll(); };
  // (ROTATE-STALL: `calls` counts the main pass only — the shadow pass's count depends on where the static shadow
  //  cache's sliced build is in a given frame, not on the profile — and the first look, the street's cold entry, is
  //  thrown away: it also draws 3 short-lived sprites a warm look doesn't)
  G.settings.quality = 'high'; G.settings.qualityAuto = false; G.applySettings(); look(); out.high = look();
  at(0); out.autoHigh = look();
  G.settings.quality = 'medium'; G.settings.qualityAuto = false; G.applySettings(); out.medium = look();
  at(1); out.autoMed = look(); out.autoMedLabel = A.label();
  at(1); out.eco = look(); out.ecoLabel = A.label();   // (AUTO-2: Medium is Auto's floor)
  // (LOOK-FIRST: on battery the picture stays the profile's: no battery cuts)
  G.setBattery(true); G.frame(1 / 30, true); out.ecoBat = look(); G.setBattery(false);
  at(0);
  return out;
});
const same = (a, b, keys) => keys.every((k) => a[k] === b[k]);
const K = ['shadowFilter', 'pr', 'msaa', 'fxaa', 'shadows', 'shadowMap', 'bloom', 'lamps', 'smallFar', 'treeNear', 'samples', 'cell', 'lampsPool'];
check('Auto\'s High profile is High exactly: same pixel ratio, MSAA, shadow map / filter, bloom, lamps, vegetation, shadow cells, and the same draw calls', same(cmp.high, cmp.autoHigh, [...K, 'calls']) && !cmp.autoHigh.eco, { high: cmp.high, auto: cmp.autoHigh });
check('Auto\'s Medium profile renders as Medium (filter, MSAA, map, bloom, lamps, vegetation, small casters; only the shadow cells stay High\'s 32 m)', same(cmp.medium, cmp.autoMed, ['shadowFilter', 'msaa', 'fxaa', 'shadows', 'shadowMap', 'bloom', 'lamps', 'smallFar', 'treeNear', 'samples', 'lampsPool']) && cmp.autoMed.casters === 'medium' && cmp.autoMed.cell === 32 && cmp.autoMedLabel === 'Medium', { medium: cmp.medium, auto: cmp.autoMed, label: cmp.autoMedLabel });
check('Auto\'s floor is Medium itself (AUTO-2: no profile below Medium\'s look)', cmp.ecoLabel === 'Medium', { label: cmp.ecoLabel });
check('... and on battery: shadows stay on and the resolution stays ≥ 85 % (only the nearly invisible battery cuts)', cmp.ecoBat.shadows && cmp.ecoBat.pr >= 0.85, { eco: cmp.eco, bat: cmp.ecoBat });

// ---------------------------------------------------------------- 5. a decision waits for a commit point (nothing changes in play)
const live = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  A.test = false; gov.enabled = true; gov.setProfile(0, 'test: evaluating', { commitNow: true, t: performance.now() }); A.applyAll();
  let t = performance.now() + 100000; gov.resetWin(0); gov.quietUntil = 0;
  const feed = (secs, ms, cpu, gpu) => { for (let s = 0; s < secs * 1000; s += ms) { t += ms; gov.gpu(t, gpu); A.gov.frame({ t, ms, cpu, play: true, scene: 'citadel' }); } };
  const snap = (n) => ({ n, label: A.label(), scale: G.renderer.effScale(), bloom: G.renderer.bloom.enabled, map: G.env.sun.shadow.mapSize.x, pending: gov.pending(), samples: G.renderer.composer.renderTarget1.samples, quality: G.settings.quality });
  const out = [snap('start')];
  feed(6, 25, 6, 23); out.push(snap('gpu pressure 6 s'));
  return { out, steps: A.log.filter((e) => e.kind === 'down').map((e) => e.what) };
});
const L = live.out;
check('GPU pressure in the evaluation: one profile down (High → Medium) is queued; nothing changes in play (resolution, bloom, map, MSAA as before)',
  L[1].pending.length === 1 && L[1].label === 'High' && L[1].bloom === L[0].bloom && L[1].map === L[0].map && L[1].samples === L[0].samples && L[1].scale === L[0].scale && /High → Medium/.test(live.steps.at(-1) || ''), live);
const commit = await ev(() => {
  const G = game, A = G.autoQ;
  G.setState('pause'); A.frame(1 / 60, 5); const afterPause = { label: A.label(), bloom: G.renderer.bloom.enabled, map: G.env.sun.shadow.mapSize.x, pending: A.gov.pending(), quality: G.settings.quality };
  G.setState('play');
  return { afterPause, log: A.log.slice(-2).map((e) => e.kind + ': ' + (e.what || e.why)) };
});
check('... the pause menu commits it (Medium: no bloom, map 1024), programs made behind the menu', commit.afterPause.label === 'Medium' && !commit.afterPause.bloom && commit.afterPause.map === 1024 && !commit.afterPause.pending.length && commit.afterPause.quality === 'medium', commit);
const tr = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  gov.setProfile(0, 'test', { commitNow: true }); A.applyAll();   // (AUTO-2: from High, pressure queues Medium)
  let t = performance.now() + 500000; gov.resetWin(0); gov.quietUntil = 0;
  for (let s = 0; s < 6000; s += 25) { t += 25; gov.gpu(t, 23); gov.frame({ t, ms: 25, cpu: 6, play: true, scene: 'citadel' }); }
  const mid = { pending: gov.pending(), lamps: G.lightPool.lights.length, pr: G.renderer.pixelRatio(), label: A.label() };
  G.enterRoom('house', null, false, true);
  for (let i = 0; i < 60 && G.trans; i++) G.frame(1 / 30, true);
  return { mid, after: { pending: gov.pending(), lamps: G.lightPool.lights.length, pr: G.renderer.pixelRatio(), room: G.room?.id, label: A.label() } };
});
check('a step to Medium queued in play (High stays on screen); the next scene change (the house door) applies it', tr.mid.pending.length === 1 && tr.mid.label === 'High' && !tr.after.pending.length && tr.after.room === 'house' && tr.after.label === 'Medium', tr);

// ---------------------------------------------------------------- 6. plug / unplug
const pw = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov;
  gov.setProfile(0, 'test', { phase: 'hold', commitNow: true }); A.applyAll();
  localStorage.removeItem('lba3_autoq_v4'); A.cache = {};
  G.setBattery(true); const bat = { p: gov.applied, phase: gov.phase, label: A.label(), key: A.key, msaa: G.renderer.composer.renderTarget1.samples };
  G.setBattery(false); const ac = { p: gov.applied, phase: gov.phase, label: A.label(), key: A.key };
  return { bat, ac, log: A.log.slice(-3).map((e) => e.why) };
});
check('unplugged with nothing settled on battery: one profile lower (Medium), evaluated, the battery key; plugged in again: one higher (High)', pw.bat.p === 1 && pw.bat.phase === 'evaluate' && /battery/.test(pw.bat.key) && pw.ac.p === 0 && /mains/.test(pw.ac.key), pw);
const pw2 = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov, k = A.machineKey(true);
  A.cache[k] = { p: 1, src: 'settled', margin: false, at: 'test' }; localStorage.setItem('lba3_autoq_v4', JSON.stringify(A.cache));
  G.setBattery(true); const bat = { p: gov.applied, phase: gov.phase, label: A.label() };
  G.setBattery(false);
  return bat;
});
check('unplugged with Medium settled on battery: straight to Medium, held (no evaluation)', pw2.p === 1 && pw2.phase === 'hold' && pw2.label === 'Medium', pw2);

// ---------------------------------------------------------------- 7. the title calibration, the evaluation and the cache (?autoq: the governor on under the tests)
await reopen('?nocine&autoq', null);
const cal = await ev(() => {
  const G = game, A = G.autoQ;
  const before = { src: A.source, cal: !!A.cal, p: A.gov.p };
  // the title's frames: GPU 13 ms, CPU 9 ms at the guess (fed as the loop would: frame times and timer results)
  G.state = 'title'; G.testFreeze = false;
  try { for (let i = 0; i < 400 && !A.calResult; i++) { A.cal.gpu(13); A.frame(1 / 60, 9); const t = performance.now(); while (performance.now() - t < 6); } }
  finally { G.testFreeze = true; }
  return { before, r: A.calResult, pending: A.pendingStart, cached: JSON.parse(localStorage.getItem('lba3_autoq_v4') || '{}')[A.key] || null };
});
check('a first start with the governor on: the GPU name\'s guess, then the title measured (~2 s): a start below High for 13 ms GPU / 9 ms CPU, cached as a calibration', cal.before.src === 'guess' && cal.before.cal && cal.r && cal.r.gpuMs === 13 && cal.r.p > 0 && cal.cached?.src === 'calib' && cal.cached.p === cal.r.p, cal);
await ev(() => { game.hideScreens(); game.startNew(); game.step(0.2); });
const started = await ev(() => ({ p: game.autoQ.gov.applied, phase: game.autoQ.gov.phase, pending: game.autoQ.gov.pending() }));
check('... play starts at the calibrated profile, evaluating', started.p === cal.r.p && started.phase === 'evaluate' && !started.pending.length, started);
// the evaluation: light play, a scene change every 35 s (each a commit point, as the game's scene changes are) →
// one step up at most (room above, applied at the next scene change), then settled (held) and cached as settled
const ev1 = await ev(() => {
  const G = game, A = G.autoQ, gov = A.gov, S = ['citadel', 'house', 'citadel', 'well', 'citadel', 'house'];
  let t = performance.now() + 2e6, scene = S[0], ups = 0, done = null; gov.quietUntil = 0;
  for (let s = 0; s < 200000 && !done; s += 16.7) {
    t += 16.7; const now = S[Math.floor(s / 35000) % S.length];
    if (now !== scene) { scene = now; A.commit('scene change'); }
    gov.gpu(t, 5); const r = gov.frame({ t, ms: 16.7, cpu: 5, play: true, scene });
    if (r?.kind === 'up') ups++;
    if (r?.kind === 'settled') { A.settled(); done = Math.round(s / 1000); }
  }
  return { phase: gov.phase, p: gov.applied, pending: gov.pending(), ups, settledAt: done, cached: JSON.parse(localStorage.getItem('lba3_autoq_v4') || '{}')[A.key] || null, log: A.log.slice(-4).map((e) => e.kind + ': ' + (e.what || '') + ' — ' + e.why) };
});
check('... light play across scene changes: it went up at most once (applied at a scene change), then settled within ~2.5 min and cached the profile as settled', ev1.phase === 'hold' && ev1.ups <= 1 && ev1.settledAt != null && ev1.settledAt <= 150 && !ev1.pending.length && ev1.cached?.src === 'settled' && ev1.cached.p === ev1.p, ev1);
await open(page, '?nocine&autoq');
const again = await ev(() => ({ src: game.autoQ.source, cal: !!game.autoQ.cal, p: game.autoQ.gov.applied, phase: game.autoQ.gov.phase }));
check('... the next start goes straight to the settled profile: no calibration, no evaluation (held)', /settled/.test(again.src) && !again.cal && again.p === ev1.cached.p && again.phase === 'hold', again);
const tryUp = await ev(() => {
  const A = game.autoQ, k = A.key, c = JSON.parse(localStorage.getItem('lba3_autoq_v4'));
  c[k] = { p: 1, src: 'settled', margin: true, noTry: 0, at: 'test' }; localStorage.setItem('lba3_autoq_v4', JSON.stringify(c));
  return true;
});
await open(page, '?nocine&autoq');
const up = await ev(() => ({ src: game.autoQ.source, p: game.autoQ.gov.applied, phase: game.autoQ.gov.phase, trial: game.autoQ.gov.trial }));
check('... a settled profile whose session had room to spare: the next start tries one higher, evaluated', tryUp && /one higher/.test(up.src) && up.p === 0 && up.phase === 'evaluate' && !!up.trial, up);

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
check('the full benchmark\'s fixed runs use the presets by hand and give Auto back at the end; its report says what Auto ran', fixed.auto === true && fixed.knobs && fixed.q === 'high' && /quality: Auto — High · held/.test(fixed.text), fixed);
await ev(() => { game.testFreeze = true; });

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
