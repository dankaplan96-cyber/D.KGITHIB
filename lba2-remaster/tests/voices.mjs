// Gibberish voices (src/engine/voice.js, VOICE-1). Two parts:
// 1. Offline (OfflineAudioContext, the game's own Babble driven like the dialogue box, tests/lib/voicelab.js): the
//    voices are measurably distinct (pairwise feature distance), stay under a level ceiling at a steady loudness,
//    have no clicks (and the click check is shown to catch a clicky control), keep the old syllable timing, repeat
//    exactly, and stop cleanly mid-line.
// 2. In the game: a character's line babbles, signs and notes stay silent, the radio is band-limited, and nothing
//    keeps sounding after the text is skipped, the dialogue closes, or a cinematic pauses.
// Not a listening test: nothing here says how a voice sounds to a person.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== '' ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };

// every speaker name key the game shows (n_*), from the English text
const keys = new Set();
for (const f of ['src/game/i18n.js', ...readdirSync(ROOT + 'src/game/text').map((x) => 'src/game/text/' + x)]) {
  for (const m of readFileSync(ROOT + f, 'utf8').matchAll(/\b(n_[a-zA-Z0-9]+):/g)) keys.add(m[1]);
}

// ------------------------------------------------------------------ 1. offline
await page.goto(URL0 + 'README.md');
const MAIN = ['hero', 'zoe', 'arthur', 'baldino', 'vesk'];
const OTHERS = ['farmer1', 'doran', 'guard', 'pippa', 'mira', 'sphero1', 'nara', 'oku', 'zbee1', 'zmole1', 'zmole2', 'joe', 'ztri1', 'sendell'];
const LINE = 'Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.';
const off = await ev(async ({ MAIN, OTHERS, LINE, keys, base }) => {
  const lab = await import(new URL('tests/lib/voicelab.js', base).href);
  const V = await import(new URL('src/engine/voice.js', base).href);
  const m = {};
  for (const id of [...MAIN, ...OTHERS]) { const r = await lab.render(V, 'n_' + id, LINE); m[id] = { ...lab.analyse(r.data, r.sr), syl: r.syllables, f: lab.features(lab.analyse(r.data, r.sr)) }; }
  // repeatable: the same line from the same speaker renders the same
  const a = await lab.render(V, 'n_zoe', LINE), b = await lab.render(V, 'n_zoe', LINE);
  let same = 0; for (let i = 0; i < a.data.length; i++) same = Math.max(same, Math.abs(a.data[i] - b.data[i]));
  // stopped mid-line (the line closed / skipped at 0.6 s): silent from 0.2 s after the stop
  const s = await lab.render(V, 'n_baldino', LINE, { stopAt: 0.6 });
  let before = 0, after = 0;
  for (let i = Math.floor(0.3 * s.sr); i < 0.6 * s.sr; i++) before = Math.max(before, Math.abs(s.data[i]));
  for (let i = Math.floor(0.8 * s.sr); i < s.data.length; i++) after = Math.max(after, Math.abs(s.data[i]));
  // voice volume 0.25: about 12 dB lower
  const q = lab.analyse((await lab.render(V, 'n_hero', LINE, { vol: 0.25 })).data, 32000);
  // pooling: the filter chains are made once; a later line makes only its few sources
  const pool = await lab.render(V, 'n_hero', LINE, { lines: 3 });
  const poolBee = await lab.render(V, 'n_zbee1', LINE, { lines: 2 });
  // the click check on a deliberately clicky control
  const ctl = lab.analyse(lab.clickyControl(), 32000);
  // every named speaker
  const named = keys.map((k) => [k, V.voiceFor(k)]);
  const ids = [...new Set(named.filter(([, v]) => v).map(([, v]) => v.id))];
  const own = ids.filter((id) => V.VOICES[id]);
  const seeds = own.map((id) => V.VOICES[id].seed);
  const sig = own.map((id) => { const v = V.voiceFor('n_' + id); return [v.race, Math.round(v.f0 / 4), Math.round(v.k * 30), v.contour, Math.round(v.rate * 10), Math.round(v.legato * 10)].join('|'); });
  return { m, nodes: pool.nodes, nodesBee: poolBee.nodes, same, before, after, quietRms: q.rmsDb, ctl, ids, missing: ids.filter((id) => !V.VOICES[id]), seedsUnique: new Set(seeds).size === seeds.length,
    sigUnique: new Set(sig).size === sig.length, dupSig: sig.filter((x, i) => sig.indexOf(x) !== i),
    balradio: V.voiceFor('n_balradio')?.id, radio: V.voiceFor('n_zoeradio')?.radio, hero: V.voiceFor('n_hero')?.f0, zoeF0: V.voiceFor('n_zoe')?.f0,
    stranger: V.voiceFor('n_somebody')?.f0, strangerAgain: V.voiceFor('n_somebody')?.f0, place: V.voiceFor('n_lighthouse'), races: Object.keys(V.RACES) };
}, { MAIN, OTHERS, LINE, keys: [...keys], base: URL0 });

const M = off.m, ALL = [...MAIN, ...OTHERS];
const dist = (a, b) => Math.hypot(...M[a].f.map((x, i) => x - M[b].f[i]));
const axes = (a, b) => M[a].f.filter((x, i) => Math.abs(x - M[b].f[i]) >= 1).length;
let worst = null;
for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) { const d = dist(ALL[i], ALL[j]); if (!worst || d < worst[2]) worst = [ALL[i], ALL[j], +d.toFixed(2)]; }
check('every pair of voices differs (feature distance ≥ 1.5: pitch, range, timbre, rate, legato)', worst[2] >= 1.5, { closest: worst });
const mainBad = [];
for (const a of MAIN) for (const b of ALL) if (a !== b && (dist(a, b) < 2 || axes(a, b) < 2)) mainBad.push([a, b, +dist(a, b).toFixed(2), axes(a, b)]);
check('Twinsen, Zoé, Arthur, Baldino and Vesk each differ from every other voice on ≥ 2 axes (distance ≥ 2)', mainBad.length === 0, mainBad);
const lv = ALL.map((id) => [id, M[id].peakDb, M[id].rmsDb]);
check('level under the ceiling at full voice volume: peak ≤ −9 dBFS', lv.every((x) => x[1] <= -9), lv.filter((x) => x[1] > -9));
const rms = lv.map((x) => x[2]);
check('steady loudness: active RMS −37…−27 dBFS, spread ≤ 7 dB', Math.min(...rms) >= -37 && Math.max(...rms) <= -27 && Math.max(...rms) - Math.min(...rms) <= 7, lv);
check('the voice volume setting scales the voice (0.25 → about −12 dB)', Math.abs(M.hero.rmsDb - 12 - off.quietRms) < 1.5, { full: M.hero.rmsDb, quarter: off.quietRms });
check('the click check catches a clicky control (crest > 12)', off.ctl.clickCrest > 12, off.ctl);
const clicks = ALL.map((id) => [id, M[id].clickCrest, M[id].maxJump]);
check('no clicks: click crest < 7 and no sample-to-sample jump over 0.12', clicks.every((x) => x[1] < 7 && x[2] < 0.12), clicks.filter((x) => x[1] >= 7 || x[2] >= 0.12));
check("syllables still timed to the text: Twinsen's line has 12–20 (the old voice: 15)", M.hero.syl >= 12 && M.hero.syl <= 20, M.hero.syl);
check('audio nodes pooled: after the first line, a line makes ≤ 6 nodes (its tone, vibrato, noise; a bee\'s flutter)', off.nodes[1] <= 6 && off.nodes[2] <= 6 && off.nodesBee[1] <= 6, { hero: off.nodes, bee: off.nodesBee });
check('the same line from the same speaker sounds the same each time (seeded)', off.same < 1e-5, off.same);
check('a line stopped mid-way is silent 0.2 s later', off.before > 0.02 && off.after < 0.001, { before: off.before, after: off.after });
check('every named speaker has an own voice with its own seed', off.missing.length === 0 && off.seedsUnique, { missing: off.missing, n: off.ids.length });
check('no two named voices share the same settings', off.sigUnique, off.dupSig);
check('every race has a colour', ['quetch', 'grobo', 'bunny', 'sphero', 'esmer', 'bee', 'mole'].every((r) => off.races.includes(r)), off.races);
check("Baldino on the radio is Baldino's voice; radio voices are band-limited", off.balradio === 'baldino' && off.radio === true, { bal: off.balradio, radio: off.radio });
check('Twinsen and Zoé keep the original median pitch (195 / 252 Hz)', off.hero === 195 && off.zoeF0 === 252 && Math.abs(M.hero.f0 - 195) < 20 && Math.abs(M.zoe.f0 - 252) < 30, { hero: M.hero.f0, zoe: M.zoe.f0 });
check('anyone else gets a stable voice, places none', off.stranger > 100 && off.stranger === off.strangerAgain && off.place === null, { f0: off.stranger, place: off.place });

// ------------------------------------------------------------------ 2. in the game
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await ev(async () => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  await G.audio.ctx?.resume?.();
  const A = G.audio, B = A.babble, ctx = A.ctx;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  // what reaches the voice bus
  const an = ctx.createAnalyser(); an.fftSize = 2048; A.voiceBus.connect(an);
  const buf = new Float32Array(an.fftSize);
  const level = () => { an.getFloatTimeDomainData(buf); let p = 0; for (const x of buf) p = Math.max(p, Math.abs(x)); return p; };
  const close = () => { for (let i = 0; i < 8 && G.state === 'dialog'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } };
  // (played in real time: the voice keeps to the audio clock and drops what the text outruns)
  const run = async (name, line) => { const c0 = B.count; G.say(name, [line]); for (let i = 0; i < 90; i++) { G.step(1 / 30); await wait(33); } const n = B.count - c0; close(); return n; };
  const out = { running: ctx.state };
  out.zoe = await run('n_zoe', 'Twinsen, did you see the dean of the school of magic? He was looking for you!');
  out.sign = await run('', 'To the lighthouse at the end of the island.');
  out.note = await run('n_note', 'Back soon.');
  await wait(700);
  out.quietBefore = level();
  // a long line, typed in real time: it sounds; then E skips to the full text: silence, sources gone
  const long = 'Twinsen! My boy! The pump, the valves, the whole contraption... it is all wrong, all of it, and I know exactly why!';
  G.say('n_baldino', [long]);
  let speak = 0;
  for (let i = 0; i < 40; i++) { G.step(1 / 60); await wait(16); speak = Math.max(speak, level()); }
  out.speaking = speak; out.liveSpeaking = B.live;
  G.input.taps.add('KeyE'); G.step(0.02);       // skip: the whole line shows
  out.skipped = G.hud.dialog.shown >= long.length;
  await wait(250);
  let tail = 0; for (let i = 0; i < 10; i++) { tail = Math.max(tail, level()); await wait(20); }
  out.afterSkip = tail;
  await wait(400); out.liveAfterSkip = B.live;
  close(); out.closed = G.state;
  out.voiceAfterClose = B.v;
  // a cinematic pause (pause menu / lost focus): the line's voice stops and does not come back on resume
  const { Cinematic } = await import('/src/engine/cinematic.js');
  const cine = new Cinematic(G, { length: 1 });
  B.start('n_zoe');
  const line = 'We have to go now, the ferry is leaving and the captain does not wait for anyone at all.';
  let typed = 0; speak = 0;
  for (let i = 0; i < 30; i++) { const to = Math.min(line.length, typed + 1); B.chars(line, typed, to); typed = to; await wait(16); speak = Math.max(speak, level()); }
  out.cineSpeaking = speak;
  cine.pause();
  await wait(200); out.suspended = ctx.state;
  cine.resume(); await wait(50); out.resumed = ctx.state;
  await wait(250);
  tail = 0; for (let i = 0; i < 10; i++) { tail = Math.max(tail, level()); await wait(20); }
  out.afterPause = tail;
  await wait(300); out.liveAfterPause = B.live;
  B.stop();
  A.voiceBus.disconnect(an);
  return out;
});
check('the audio context runs headless', r.running === 'running', r);
check("Zoé's line babbles (several syllables)", r.zoe >= 6 && r.zoe <= 40, r);
check('a sign and a note stay silent', r.sign === 0 && r.note === 0, r);
check('a line sounds while it types out (and nothing before it)', r.quietBefore < 0.001 && r.speaking > 0.01 && r.liveSpeaking >= 1, r);
check('skipping the text stops the voice: silent 0.25 s later, its sources ended', r.skipped && r.afterSkip < 0.001 && r.liveAfterSkip === 0, r);
check('closing the dialogue drops the speaker', r.closed === 'play' && r.voiceAfterClose === null, r);
check('a cinematic pause stops the line: silent after resume, sources ended', r.cineSpeaking > 0.01 && r.suspended === 'suspended' && r.resumed === 'running' && r.afterPause < 0.001 && r.liveAfterPause === 0,
  { speaking: r.cineSpeaking, suspended: r.suspended, resumed: r.resumed, after: r.afterPause, live: r.liveAfterPause });
console.log(errs.length ? errs.join('\n') : 'no errors');
if (errs.length) fails++;
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
