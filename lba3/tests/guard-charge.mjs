// GUARD-CHARGE (the user's pick 26.11): a guard's rifle aim has its own sound ('guardCharge', the rifle powering up);
// it was silent, the shot's zap the only sound. Played through the real game (the developer yard's three rifle guards:
// a Quetch 'guard', a Grobo 'guardG', a FunFrock trooper 'fclone'; game time stepped) and checked on what the engine
// started (AudioEngine.held / sfxRecent), then rendered offline with the game's own engine:
//   1. an aim starts one charge (no zap at its start), as long as the tell (0.8 s; × the difficulty's wind-up: Gentle
//      1.3; a guard's own def.tune tell), the heavier two a tone lower; placed at the guard (its side and level)
//   2. the shot: one zap, and the charge is stopped in the same step; its length is at most the time to the shot
//   3. cut at once: hit (staggered), the pulse (jammed), lost sight, sent away, stood down, beaten, a scene change
//   4. offline: a click at its start, swells to the shot and is silent from the end of its tell and 30 ms after a cut;
//      quieter than the shot (peak and 50 ms loudness); unlike the drone's charge (lower, no flutter)
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
    step(s) { for (let t = 0; t < s - 1e-9; t += 1 / 60) { G.step(1 / 60); G.hero.hp = G.hero.maxHp; } },
    only(ids = [], at = [6194, 8], a = 0) {
      for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); }
      const h = G.hero; h.pos.set(at[0], G.physics.groundAt(at[0], at[1]), at[1]); h.angle = a; h.vel.set(0, 0); h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0;
      G.resetCombat(); G.combatDir.grace = 0; G.state = 'play';
    },
    // a yard guard, dx m to his side and 5 m ahead, ready to fire (a few frames first: the listener follows him to the
    // yard); frames until its aim starts
    guard(id = 'a_guard', dx = 0, tell = null) {
      Y.only([id], [6194, 8], Math.PI);
      const h = G.hero, g = E(id);
      g.state = 'chase'; g.stateT = 0; g.coolT = 0.1; g.hurtT = 0; g.jamT = 0; g.hp = g.maxHp = 99; g.inv = null;
      g.tune.tell = tell ?? 0.8;
      g.pos.set(h.pos.x + dx, g.pos.y, h.pos.z - 5); g.patrol = [[g.pos.x, g.pos.z]]; g.home = { x: g.pos.x, z: g.pos.z }; g.angle = g.angleTo(h);
      LOG.length = 0;
      for (let i = 0; i < 120 && g.state !== 'aim'; i++) { G.step(1 / 60); h.hp = h.maxHp; }
      return g;
    },
    untilEnd(g, s = 3) { for (let i = 0; i < s * 60 && g.state === 'aim'; i++) { G.step(1 / 60); G.hero.hp = G.hero.maxHp; } return G.time; },
    summary(t0) { return LOG.filter((e) => e.t >= t0 - 1e-6).map((e) => ({ k: e.k, n: e.n, t: +(e.t - t0).toFixed(3), dur: e.dur && +e.dur.toFixed(3), ok: e.ok, got: e.k === 'held' ? !!e.h : undefined })); },
  };
});

// 1–2. an aim and its shot: each kind at 0.8 s, the Quetch at Gentle and with its own tell; the guard to his right
const shot = await ev(() => {
  const G = game, out = {};
  for (const [name, id, tell, diff] of [['guard', 'a_guard', 0.8, 'normal'], ['guardG', 'a_guardG', 0.8, 'normal'], ['fclone', 'a_fclone', 0.8, 'normal'], ['gentle', 'a_guard', 0.8, 'gentle'], ['ownTell', 'a_guard', 1.1, 'normal']]) {
    G.settings.difficulty = diff;
    const g = Y.guard(id, 2, tell), t0 = G.time, aimed = g.state === 'aim';
    const start = LOG.filter((e) => e.k === 'held' && e.n === 'guardCharge');
    const zapAtStart = LOG.some((e) => e.k === 'play' && e.n === 'zap');
    const rec = (G.audio.sfxRecent || []).filter((r) => r.name === 'guardCharge').at(-1);
    const t1 = Y.untilEnd(g);
    const after = Y.summary(t0);
    const zaps = after.filter((e) => e.k === 'play' && e.n === 'zap' && e.ok);
    const stops = after.filter((e) => e.k === 'stop' && e.n === 'guardCharge');
    out[name] = { aimed, charges: start.length, got: !!start[0]?.h, low: !!start[0]?.low, dur: start[0] && +start[0].dur.toFixed(3), want: +g.tellLen().toFixed(3), zapAtStart, gain: rec?.gain, pan: rec?.pan,
      shotAt: zaps[0]?.t, stopAt: stops[0]?.t, zaps: zaps.length, stops: stops.length, ended: +(t1 - t0).toFixed(3), fired: G.bolts.list.length > 0, state: g.state };
    G.bolts.clear();
  }
  G.settings.difficulty = 'normal';
  return out;
});
for (const [k, r] of Object.entries(shot)) {
  check(`${k}: an aim starts one charge, not a zap, as long as the tell (${r.want} s)`, r.aimed && r.charges === 1 && r.got && !r.zapAtStart && Math.abs(r.dur - r.want) < 0.02, r);
  check(`${k}: the shot plays one zap and the charge stops in that step; the charge's length is at most the time to the shot`, r.fired && r.zaps === 1 && r.stops === 1 && r.stopAt === r.shotAt && r.dur <= r.shotAt + 1e-6, r);
}
check('the heavier two (Grobo, FunFrock trooper) take the lower charge, the Quetch the usual', shot.guardG.low && shot.fclone.low && !shot.guard.low, { g: shot.guard.low, G: shot.guardG.low, f: shot.fclone.low });
check('the tells scale: 0.8 s, 0.8 × 1.3 at Gentle, a guard\'s own 1.1 s', Math.abs(shot.guard.dur - 0.8) < 0.02 && Math.abs(shot.gentle.dur - 1.04) < 0.02 && Math.abs(shot.ownTell.dur - 1.1) < 0.02, { n: shot.guard.dur, g: shot.gentle.dur, o: shot.ownTell.dur });
check('the charge is placed at the guard (to his right: panned right, at its distance)', shot.guard.pan > 0.1 && shot.guard.gain > 0.3 && shot.guard.gain <= 1, shot.guard);

// 3. cut at once
const cut = await ev(() => {
  const G = game, out = {};
  const ways = {   // (the ones that take the guard out last, each on its own guard)
    staggered: ['a_guard', (g) => g.damage(1, G.hero.pos)],
    pulsed: ['a_guard', (g) => g.pulse({ stun: 2 })],
    lostSight: ['a_guard', () => { const h = G.hero; h.pos.set(h.pos.x, h.pos.y, h.pos.z + 30); }],
    sentAway: ['a_guard', (g) => g.setPresent(false)],
    sceneChange: ['a_guard', () => G.resetCombat()],
    stoodDown: ['a_guardG', (g) => g.standDown()],
    beaten: ['a_fclone', (g) => { g.hp = 1; g.damage(5, G.hero.pos); }],
  };
  for (const [k, [id, f]] of Object.entries(ways)) {
    const g = Y.guard(id, 0); Y.step(0.3);
    const ch = LOG.find((e) => e.k === 'held' && e.n === 'guardCharge')?.h;
    const before = ch && !ch.done && g.state === 'aim';
    const t = G.time; f(g);
    const now = !!ch?.done;   // (stopped by the call itself, not a frame later)
    G.step(1 / 60);
    out[k] = { before, now, later: !!ch?.done, again: LOG.filter((e) => e.k === 'held' && e.t > t).length, zap: LOG.some((e) => e.k === 'play' && e.n === 'zap' && e.ok && e.t > t), state: g.state };
    if (g.alive) g.hp = g.maxHp; G.bolts.clear();
  }
  return out;
});
// (lost sight and a scene change end the aim in the next step: the guard's own update, resetCombat's cutHeld)
for (const [k, r] of Object.entries(cut)) check(`the charge stops at once: ${k}`, r.before && (r.now || ((k === 'sceneChange' || k === 'lostSight') && r.later)) && r.again === 0 && !r.zap, r);

// 4. offline, with the game's own engine (dry: the effects bus straight to the master, no room, so a tail is the sound's)
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
  // the flutter: how much the level moves in 5 ms windows over the middle half (std / mean of the RMS), and the pitch
  // there (zero crossings a second / 2, of the left channel)
  const shape = (buf, a, b) => {
    const L = buf.getChannelData(0), w = 240, r = []; let zc = 0;
    for (let i = Math.floor(a * SR); i + w < b * SR; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += L[j] * L[j]; r.push(Math.sqrt(s / w)); }
    for (let i = Math.floor(a * SR) + 1; i < b * SR; i++) if ((L[i - 1] < 0) !== (L[i] < 0)) zc++;
    const m = r.reduce((x, y) => x + y, 0) / r.length, sd = Math.sqrt(r.reduce((x, y) => x + (y - m) ** 2, 0) / r.length);
    return { flutter: +(sd / m).toFixed(2), hz: Math.round(zc / 2 / (b - a)) };
  };
  const out = {};
  for (const T of [0.8, 1.04]) {
    const { A, oc } = engine(T + 0.6), t0 = q(0.05), ts = t0 + T;
    at(oc, 0.05, () => A.held('guardCharge', null, { dur: T }));
    const buf = await oc.startRendering();
    const Z = engine(0.6); at(Z.oc, 0.05, () => Z.A.play('zap')); const zb = await Z.oc.startRendering();
    const D = engine(T + 0.6); at(D.oc, 0.05, () => D.A.held('droneCharge', null, { dur: T })); const db = await D.oc.startRendering();
    out[T] = { peak: +dB(scan(buf, t0, ts)).toFixed(1), l50: +l50(buf, t0, ts).toFixed(1), click: +dB(scan(buf, t0, t0 + 0.03)).toFixed(1),
      lastQuarter: +dB(scan(buf, ts - T / 4, ts)).toFixed(1), firstQuarter: +dB(scan(buf, t0 + 0.08, t0 + T / 4)).toFixed(1), after: +dB(scan(buf, ts + 1 / SR, T + 0.6)).toFixed(1),
      zapPeak: +dB(scan(zb, 0.05, 0.6)).toFixed(1), zapL50: +l50(zb, 0.05, 0.6).toFixed(1),
      mid: shape(buf, t0 + T / 4, t0 + T * 0.75), droneMid: shape(db, t0 + T / 4, t0 + T * 0.75) };
  }
  { // a cut 0.3 s in
    const { A, oc } = engine(1.2); let h = null;
    at(oc, 0.05, () => { h = A.held('guardCharge', null, { dur: 1.04, low: true }); });
    at(oc, 0.35, () => h?.stop());
    const buf = await oc.startRendering();
    out.cut = { before: +dB(scan(buf, q(0.3), q(0.35))).toFixed(1), after: +dB(scan(buf, q(0.35) + 0.03, 1.2)).toFixed(1) };
  }
  return out;
});
for (const T of ['0.8', '1.04']) {
  const r = off[T];
  check(`offline ${T} s: quieter than the shot (peak and 50 ms loudness under the zap's), under -12 dBFS`, r.peak < -12 && r.peak < r.zapPeak && r.l50 < r.zapL50, r);
  check(`offline ${T} s: a click at its start; swells to the shot (its last quarter near its peak, its first ≥ 3 dB under); silent from the shot on`, r.click > -50 && r.lastQuarter >= r.peak - 1.5 && r.firstQuarter <= r.peak - 3 && r.after < -90, r);
  check(`offline ${T} s: unlike the drone's charge: lower (zero-crossing pitch under its 0.8×) and smooth (level flutter under half the drone's)`, r.mid.hz < r.droneMid.hz * 0.8 && r.mid.flutter < r.droneMid.flutter * 0.5, { guard: r.mid, drone: r.droneMid });
}
check('offline: cut 0.3 s in, silent from 30 ms after the cut', off.cut.before > -45 && off.cut.after < -70, off.cut);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
