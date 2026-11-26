// DRONE-CHARGE (#58, the user's pick 26.11): a drone's wind-up has its own sound ('droneCharge'), no longer the shot's
// zap. Played through the real game (the developer yard's drone, game time stepped) and checked on what the engine
// started (AudioEngine.held / sfxRecent), then rendered offline with the game's own engine:
//   1. a wind-up starts one charge (no zap at its start), as long as the tell: 0.75 s, the first two depots' 1.1 s
//      (fight58 'a'), × the difficulty's wind-up (Gentle 1.3); placed at the drone (its side and level)
//   2. the shot: one zap, and the charge is stopped in the same step; its length is at most the time to the shot
//   3. cut at once: the drone beaten, staggered, stunned by the pulse, squealed at, sent away, a scene change
//   4. the bore's guardian: its charge too (a fourth lower), its alert kept
//   5. offline: the charge is silent from the end of its tell (the zap lands on silence) and 30 ms after a cut; it
//      peaks under -12 dBFS and under the zap's own 50 ms loudness + 3 dB
//   6. the guards' rifle tell (report only: what it plays as the aim starts)
// Automated runtime only (headless, SwiftShader); nothing listened to.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
check('the audio context runs (the first click)', await ev(() => game.audio.ctx?.state === 'running'), await ev(() => game.audio.ctx?.state));
await ev(() => {
  const G = game, A = G.audio;
  window.LOG = [];
  const h0 = A.held.bind(A); A.held = (n, at, o) => { const h = h0(n, at, o); const e = { k: 'held', n, t: G.time, dur: o?.dur, low: o?.low, h }; LOG.push(e); if (h) { const s0 = h.stop; h.stop = (f) => { if (!h.done) LOG.push({ k: 'stop', n, t: G.time }); return s0(f); }; } return h; };
  const p0 = A.play.bind(A); A.play = (n, at, o) => { const r = p0(n, at, o); if (!A._holdReq) LOG.push({ k: 'play', n, t: G.time, ok: r }); return r; };
  G.settings.controls = 'modern'; G.applySettings?.();
  G.devArena();
  const E = (id) => G.enemies.find((e) => e.id === id);
  window.Y = {
    E,
    step(s) { for (let t = 0; t < s - 1e-9; t += 1 / 60) G.step(1 / 60); },
    only(ids = [], at = [6194, 8], a = 0) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); }
      const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0;
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play';
    },
    // the yard's drone, dx m to his side and 5 m ahead, ready to fire; frames until its wind-up starts
    drone(dx = 0, tell = 0.75) {
      Y.only(['a_drone'], [6194, 8], Math.PI);
      const h = G.hero, d = E('a_drone');
      d.state = 'chase'; d.coolT = 0.1; d.hurtT = 0;   // (a few frames first: the listener follows him to the yard)
      d.stunT = 0; d.deafT = 0; d.steadyT = 0; d.staggers = []; d.hp = d.maxHp = 99; d.tune.tell = tell;
      d.pos.set(h.pos.x + dx, d.pos.y, h.pos.z - 5); d.patrol = [[d.pos.x, d.pos.z]]; d.angle = d.angleTo(h);
      LOG.length = 0;
      for (let i = 0; i < 120 && d.state !== 'windup'; i++) { G.step(1 / 60); h.hp = h.maxHp; }
      return d;
    },
    // frames until the wind-up ends (or s seconds); the step it ended
    untilEnd(d, s = 3) { for (let i = 0; i < s * 60 && d.state === 'windup'; i++) { G.step(1 / 60); G.hero.hp = G.hero.maxHp; } return G.time; },
    summary(t0) { return LOG.filter((e) => e.t >= t0 - 1e-6).map((e) => ({ k: e.k, n: e.n, t: +(e.t - t0).toFixed(3), dur: e.dur && +e.dur.toFixed(3), ok: e.ok, got: e.k === 'held' ? !!e.h : undefined })); },
  };
});

// 1–2. a wind-up and its shot, at 0.75 s, at the first depots' 1.1 s, and at Gentle's × 1.3; the drone to his right
const shot = await ev(() => {
  const G = game, out = {};
  for (const [name, tell, diff] of [['normal', 0.75, 'normal'], ['early', 1.1, 'normal'], ['gentle', 0.75, 'gentle']]) {
    G.settings.difficulty = diff;
    const d = Y.drone(3, tell), t0 = G.time, wound = d.state === 'windup';
    const start = LOG.filter((e) => e.k === 'held' && e.n === 'droneCharge');
    const zapAtStart = LOG.some((e) => e.k === 'play' && e.n === 'zap');
    const rec = (G.audio.sfxRecent || []).filter((r) => r.name === 'droneCharge').at(-1);
    const t1 = Y.untilEnd(d);
    const after = Y.summary(t0);
    const zaps = after.filter((e) => e.k === 'play' && e.n === 'zap' && e.ok);
    const stops = after.filter((e) => e.k === 'stop');
    out[name] = { wound, charges: start.length, got: !!start[0]?.h, dur: start[0] && +start[0].dur.toFixed(3), want: +d.tellLen().toFixed(3), zapAtStart, gain: rec?.gain, pan: rec?.pan,
      shotAt: zaps[0]?.t, stopAt: stops[0]?.t, zaps: zaps.length, stops: stops.length, ended: +(t1 - t0).toFixed(3), fired: G.bolts.list.length > 0 };
    G.bolts.clear();
  }
  G.settings.difficulty = 'normal';
  return out;
});
for (const [k, r] of Object.entries(shot)) {
  check(`${k}: a wind-up starts one charge, not a zap, as long as the tell (${r.want} s)`, r.wound && r.charges === 1 && r.got && !r.zapAtStart && Math.abs(r.dur - r.want) < 0.02, r);
  check(`${k}: the shot plays one zap and the charge stops in that step; the charge's length is at most the time to the shot`, r.fired && r.zaps === 1 && r.stops === 1 && r.stopAt === r.shotAt && r.dur <= r.shotAt + 1e-6, r);
}
check('the tells scale: 0.75 s, 1.1 s (the first two depots), 0.75 × 1.3 at Gentle', Math.abs(shot.normal.dur - 0.75) < 0.02 && Math.abs(shot.early.dur - 1.1) < 0.02 && Math.abs(shot.gentle.dur - 0.975) < 0.02, { n: shot.normal.dur, e: shot.early.dur, g: shot.gentle.dur });
check('the charge is placed at the drone (to his right: panned right, at its distance)', shot.normal.pan > 0.1 && shot.normal.gain > 0.3 && shot.normal.gain <= 1, shot.normal);

// 3. cut at once
const cut = await ev(() => {
  const G = game, out = {};
  const ways = {   // (beaten last: the yard's drone is gone after it)
    staggered: (d) => d.damage(1, G.hero.pos),
    pulsed: (d) => d.pulse({ stun: 2 }),
    squealed: (d) => d.squeal(2),
    sentAway: (d) => d.setPresent(false),
    sceneChange: () => G.resetCombat(),
    beaten: (d) => { d.hp = 1; d.damage(5, G.hero.pos); },
  };
  for (const [k, f] of Object.entries(ways)) {
    const d = Y.drone(0); Y.step(0.3);
    const ch = LOG.find((e) => e.k === 'held' && e.n === 'droneCharge')?.h;
    const before = ch && !ch.done;
    const t = G.time; f(d);
    const now = !!ch?.done;   // (stopped by the call itself, not a frame later)
    G.step(1 / 60);
    out[k] = { before, now, later: !!ch?.done, again: LOG.filter((e) => e.k === 'held' && e.t > t).length, state: d.state };
    d.hp = d.maxHp; G.bolts.clear();
  }
  return out;
});
for (const [k, r] of Object.entries(cut)) check(`the charge stops at once: ${k}`, r.before && (r.now || (k === 'sceneChange' && r.later)) && r.again === 0, r);

// 4. the bore's guardian (a drone, its own tell): built on its own and wound up by its own update
const boss = await ev(async () => {
  const G = game, { Guardian } = await import('./src/game/enemies.js');
  const h = G.hero, b = new Guardian(G, { id: 'g_test', kind: 'guardian', x: h.pos.x, z: h.pos.z - 6, hp: 99 });
  G.enemies.push(b); b.level = 1; b.state = 'chase'; b.coolT = 0; b.stateT = 0; LOG.length = 0;
  const t0 = G.time;
  for (let i = 0; i < 120 && b.state !== 'windup'; i++) G.step(1 / 60);
  const st = LOG.find((e) => e.k === 'held' && e.n === 'droneCharge');
  const alert = LOG.some((e) => e.k === 'play' && e.n === 'alert' && e.ok);
  Y.untilEnd(b, 3);
  const s = Y.summary(t0), zap = s.find((e) => e.k === 'play' && e.n === 'zap'), stop = s.find((e) => e.k === 'stop');
  b.setPresent(false); G.enemies.splice(G.enemies.indexOf(b), 1); G.bolts.clear(); b.fan?.hide(); b.marks?.hideAll?.();
  return { wound: !!st, low: st?.low, dur: st && +st.dur.toFixed(3), want: +(1.35 - 0.15).toFixed(3), alert, zapAt: zap?.t, stopAt: stop?.t };
});
check('the bore\'s guardian: its wind-up has the charge (lower), as long as its tell; its alert stays; stopped at its shot', boss.wound && boss.low && Math.abs(boss.dur - boss.want) < 0.02 && boss.alert && boss.zapAt != null && boss.stopAt === boss.zapAt, boss);

// 5. offline, with the game's own engine (dry: the effects bus straight to the master, no room, so a tail is the sound's)
const off = await ev(async () => {
  const SR = 48000, Proto = game.audio.constructor.prototype;
  function engine(len) {
    const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const ctx = new Proxy(oc, { get(t, k) { if (k === 'state') return 'running'; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const A = Object.create(Proto);
    A._targets = new Map(); A.vol = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8 }; A.ctx = ctx;
    A.master = oc.createGain(); A.master.gain.value = 0.8; A.master.connect(oc.destination);
    A.fxDuck = oc.createGain(); A.fxDuck.connect(A.master);
    A.sfxBus = oc.createGain(); A.sfxBus.gain.value = 0.8 * 1.5; A.sfxBus.connect(A.fxDuck);
    A.music = { duck() {} }; A.clock = () => oc.currentTime; A.noiseBuf = A._noise(2); A.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    return { A, oc };
  }
  const q = (t) => Math.round(t * SR / 128) * 128 / SR;
  const at = (oc, t, fn) => oc.suspend(q(t)).then(() => { fn(); oc.resume(); });
  const dB = (x) => (x > 1e-10 ? 20 * Math.log10(x) : -200);
  const scan = (buf, a, b) => { let p = 0; const L = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = Math.floor(a * SR); i < Math.min(L.length, b * SR); i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); return p; };
  const l50 = (buf, a, b) => { let m = 0; const L = buf.getChannelData(0), R = buf.getChannelData(1), w = 2400; for (let i = Math.floor(a * SR); i + w < Math.min(L.length, b * SR); i += 600) { let s = 0; for (let j = i; j < i + w; j++) s += L[j] * L[j] + R[j] * R[j]; m = Math.max(m, s / w); } return 10 * Math.log10(m + 1e-12); };
  const out = {};
  for (const T of [0.75, 1.1]) {
    // the charge alone, its tell from t0; then the zap alone, as the shot plays it
    const { A, oc } = engine(T + 0.6), t0 = q(0.05), ts = t0 + T;
    at(oc, 0.05, () => A.held('droneCharge', null, { dur: T }));
    const buf = await oc.startRendering();
    const Z = engine(0.6); at(Z.oc, 0.05, () => Z.A.play('zap')); const zb = await Z.oc.startRendering();
    out[T] = { peak: +dB(scan(buf, t0, ts)).toFixed(1), l50: +l50(buf, t0, ts).toFixed(1), lastQuarter: +dB(scan(buf, ts - T / 4, ts)).toFixed(1), firstQuarter: +dB(scan(buf, t0, t0 + T / 4)).toFixed(1), after: +dB(scan(buf, ts + 1 / SR, T + 0.6)).toFixed(1),
      zapPeak: +dB(scan(zb, 0.05, 0.6)).toFixed(1), zapL50: +l50(zb, 0.05, 0.6).toFixed(1) };
  }
  { // a cut 0.3 s in
    const { A, oc } = engine(1.2); let h = null;
    at(oc, 0.05, () => { h = A.held('droneCharge', null, { dur: 1.1 }); });
    at(oc, 0.35, () => h?.stop());
    const buf = await oc.startRendering();
    out.cut = { before: +dB(scan(buf, q(0.3), q(0.35))).toFixed(1), after: +dB(scan(buf, q(0.35) + 0.03, 1.2)).toFixed(1) };
  }
  return out;
});
for (const T of ['0.75', '1.1']) {
  const r = off[T];
  check(`offline ${T} s: the charge peaks under -12 dBFS and is no louder than the zap + 3 dB (50 ms)`, r.peak < -12 && r.l50 <= r.zapL50 + 3, r);
  check(`offline ${T} s: it swells to the shot (its last quarter near its peak, its first ≥ 3 dB under: heard from its start, growing) and is silent from the shot on`, r.lastQuarter >= r.peak - 1.5 && r.firstQuarter <= r.peak - 3 && r.after < -90, r);
}
check('offline: cut 0.3 s in, silent from 30 ms after the cut', off.cut.before > -40 && off.cut.after < -70, off.cut);

// 6. the guards' rifle (report only)
const rifle = await ev(() => {
  const G = game; Y.only(['a_guard'], [6194, 8], Math.PI);
  const h = G.hero, g = Y.E('a_guard');
  g.pos.set(h.pos.x, g.pos.y, h.pos.z - 5); g.patrol = [[g.pos.x, g.pos.z]]; g.state = 'chase'; g.coolT = 0; g.angle = g.angleTo(h); g.hp = g.maxHp = 99;
  LOG.length = 0; let t0 = null;
  for (let i = 0; i < 240; i++) { G.step(1 / 60); h.hp = h.maxHp; if (g.state === 'aim' && t0 == null) t0 = G.time; if (t0 != null && g.state !== 'aim') break; }
  const s = t0 == null ? [] : Y.summary(t0 - 1 / 60);
  g.setPresent(false); G.bolts.clear();
  return { aimed: t0 != null, sounds: s.filter((e) => e.ok !== false).map((e) => `${e.t}:${e.n}`) };
});
console.log('the guards\' rifle tell (report only):', JSON.stringify(rifle));

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
