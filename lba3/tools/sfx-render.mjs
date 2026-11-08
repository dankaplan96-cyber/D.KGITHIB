// ACTION-SOUND evidence: renders the game's synthesised sound effects offline (OfflineAudioContext in headless
// Chromium, the game's own src/engine/audio.js through the effects bus, its room and the master at the default slider
// levels), measures each one, and renders four mixed scenes (a quiet walk with a voice line over the music, rapid
// combat, a run of pickups, crowded machinery). With REF, the same for audio.js at that git revision (the A/B "before").
//   GAME_URL=http://localhost:8871/ REF=HEAD node tools/sfx-render.mjs <outDir>
// Writes <outDir>/sfx/<name>-<tag>.wav, <outDir>/scenes/<scene>-<tag>.wav, measurements.json, measurements.csv.
// Measuring only: nothing here says how a sound is heard. Our synthesis only; no recordings.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = (process.argv[2] || '/tmp/sfx-render') + '/';
const URL0 = process.env.GAME_URL || 'http://localhost:8871/';
const REF = process.env.REF || '';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const d of ['sfx', 'scenes']) mkdirSync(OUT + d, { recursive: true });
const before = REF ? execSync(`git show ${REF}:lba3/src/engine/audio.js`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString() : null;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('page:', m.text()));
await page.goto(URL0 + 'README.md');
const res = await page.evaluate(async ({ before, base, ONLY }) => {
  const SR = 48000;
  const fix = (src) => src.replace(/from '\.\/(\w+)\.js'/g, (_, m) => `from '${new URL('src/engine/' + m + '.js', base).href}'`);
  const now = await import(new URL('src/engine/audio.js', base).href);
  const old = before ? await import(URL.createObjectURL(new Blob([fix(before)], { type: 'text/javascript' }))) : null;
  const lab = await import(new URL('tests/lib/voicelab.js', base).href);
  const voiceMod = await import(new URL('src/engine/voice.js', base).href);

  // an engine on an offline context: the effects bus → master, the bus into the 0.25 s room (0.35) → master, as init()
  function engine(mod, len) {
    const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const ctx = new Proxy(oc, { get(t, k) { if (k === 'state') return 'running'; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const A = Object.create(mod.AudioEngine.prototype);
    A._targets = new Map(); A.vol = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8 }; A.ctx = ctx;
    A.master = oc.createGain(); A.master.gain.value = 0.8; A.master.connect(oc.destination);
    A.fxDuck = oc.createGain(); A.fxDuck.connect(A.master);   // (ACTION-SOUND's duck stage; the old engine leaves it at 1)
    A.sfxBus = oc.createGain(); A.sfxBus.gain.value = 0.8; A.sfxBus.connect(A.fxDuck);
    A.reverb = oc.createConvolver(); A.reverb.buffer = A._impulse(0.25);
    const rg = oc.createGain(); rg.gain.value = 0.35; A.reverb.connect(rg).connect(A.fxDuck); A.sfxBus.connect(A.reverb);
    A.music = { duck() {} }; A.clock = () => oc.currentTime;   // (the throttle's clock: offline time)
    A.noiseBuf = A._noise(2);
    A.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    return { A, oc };
  }
  // run fn at offline time t (the context's clock advances as in play)
  const at = (oc, t, fn) => oc.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => { try { fn(); } catch (e) { console.error('event at', t, e.message); } finally { oc.resume(); } });

  // K-weighting (BS.1770's two stages, as biquads at 48 kHz) for loudness
  async function kweight(buf) {
    const oc = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
    const s = oc.createBufferSource(); s.buffer = buf;
    const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1681.97; sh.gain.value = 4;
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38.13; hp.Q.value = 0.5;
    s.connect(sh).connect(hp).connect(oc.destination); s.start();
    return oc.startRendering();
  }
  const dB = (x) => (x > 1e-10 ? 20 * Math.log10(x) : -200);
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2, br = re[b] * cr - im[b] * ci, bi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  async function measure(buf) {
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    // envelope: 5 ms RMS
    const w = Math.round(0.005 * SR), env = [];
    for (let i = 0; i + w <= n; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += (L[j] * L[j] + R[j] * R[j]) / 2; env.push(Math.sqrt(s / w)); }
    let pk = 0, pi = 0; env.forEach((v, i) => { if (v > pk) { pk = v; pi = i; } });
    const on = env.findIndex((v) => v > pk * 0.01), at1 = env.findIndex((v) => v > pk * 0.89);
    let tail = pi; for (let i = env.length - 1; i > pi; i--) if (env[i] > pk * 0.0316) { tail = i; break; }
    const attackMs = Math.max(0, (at1 - on) * 5), decayMs = (tail - pi) * 5, durMs = (tail - on) * 5;
    // loudness: K-weighted momentary (400 ms) maximum and the mean over the active part
    const K = await kweight(buf), kl = K.getChannelData(0), kr = K.getChannelData(1);
    const win = Math.round(0.4 * SR), hop = Math.round(0.05 * SR); let mmax = -200;
    const cum = new Float64Array(n + 1); for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + kl[i] * kl[i] + kr[i] * kr[i];
    for (let i = 0; i + win <= n; i += hop) { const ms = (cum[i + win] - cum[i]) / win; mmax = Math.max(mmax, -0.691 + 10 * Math.log10(ms + 1e-12)); }
    // short-term peak of 50 ms (a fast transient's loudness, where 400 ms windows average a click away)
    const w50 = Math.round(0.05 * SR); let smax = -200;
    for (let i = 0; i + w50 <= n; i += Math.round(w50 / 4)) { const ms = (cum[i + w50] - cum[i]) / w50; smax = Math.max(smax, -0.691 + 10 * Math.log10(ms + 1e-12)); }
    // spectrum over the active part: centroid, the share above 5 kHz, the share in the voice's band (300–3400 Hz)
    const N = 2048, s0 = Math.max(0, on * w), s1 = Math.min(n, (tail + 1) * w + N);
    let E = 0, C = 0, hi = 0, vb = 0, lo = 0;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = s0; i + N <= Math.max(s1, s0 + N) && i + N <= n; i += N / 2) {
      for (let j = 0; j < N; j++) { const hw = 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / (N - 1)); re[j] = ((L[i + j] + R[i + j]) / 2) * hw; im[j] = 0; }
      fft(re, im);
      for (let k = 1; k < N / 2; k++) { const f = (k * SR) / N, p = re[k] * re[k] + im[k] * im[k]; E += p; C += p * f; if (f > 5000) hi += p; if (f >= 300 && f <= 3400) vb += p; if (f < 200) lo += p; }
    }
    return { peak: +dB(peak).toFixed(1), lufsM: +mmax.toFixed(1), lufs50: +smax.toFixed(1), attackMs, decayMs, durMs, centroid: Math.round(C / (E || 1)), hf: +(hi / (E || 1)).toFixed(3), voiceBand: +(vb / (E || 1)).toFixed(3), low: +(lo / (E || 1)).toFixed(3) };
  }
  const wav = (buf) => {
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, b = new ArrayBuffer(44 + n * 4), v = new DataView(b);
    const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let str = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(str);
  };
  // the sound names: the play() switch's cases
  const namesOf = (src) => { const p = src.indexOf('play(name'); return [...src.slice(p).matchAll(/case '([\w-]+)'/g)].map((m) => m[1]); };
  const srcNow = await (await fetch(new URL('src/engine/audio.js', base))).text();
  const LONG = { door: 2, rumble: 2, thunder: 3.5, victory: 2.2, liftWinch: 2.3, hum: 2.8, shard: 1.4, found: 2, die: 1.4, gate: 2 };
  const out = { sfx: [], scenes: [], refs: {} };
  for (const [tag, mod, src] of [['after', now, srcNow], ['before', old, before]]) {
    if (!mod) continue;
    for (const name of namesOf(src)) {
      if (ONLY && !ONLY.includes(name)) continue;
      const len = (LONG[name] ?? 1) + 0.4;
      const { A, oc } = engine(mod, len);
      at(oc, 0.05, () => A.play(name));
      const buf = await oc.startRendering();
      const m = await measure(buf);
      // variation: the same sound 6 times, the spread of level and centroid between takes
      const takes = [];
      for (let k = 0; k < 6; k++) { const e = engine(mod, len); at(e.oc, 0.05 + k * 0.0, () => e.A.play(name)); takes.push(await measure(await e.oc.startRendering())); }
      const spread = (f) => +(Math.max(...takes.map(f)) - Math.min(...takes.map(f))).toFixed(1);
      console.log(tag, name);
      out.sfx.push({ name, tag, ...m, varDb: spread((x) => x.lufs50), varCentroid: spread((x) => x.centroid), wav: wav(buf) });
    }
  }

  // references: a voice line through the voice chain (as init: bus 0.8 × 2.2, compressor, presence, ×2.2, limiter,
  // master 0.8) and the music at the slider's 0.55 (× master 0.8), plain and ducked (× 0.5)
  async function voiceLine(text, sr = SR) {
    voiceMod.voiceBanks?.(null);
    const r = await lab.render(voiceMod, 'n_hero', text, { sr });
    const oc = new OfflineAudioContext(2, r.data.length, sr);
    const b = oc.createBuffer(1, r.data.length, sr); b.copyToChannel(r.data, 0);
    const s = oc.createBufferSource(); s.buffer = b;
    const vb = oc.createGain(); vb.gain.value = 0.8 * 2.2;
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const pres = oc.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2500; pres.Q.value = 0.8; pres.gain.value = voiceMod.voiceStyle().pres;
    const mk = oc.createGain(); mk.gain.value = 2.2;
    const lim = oc.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
    const ms = oc.createGain(); ms.gain.value = 0.8;
    s.connect(vb).connect(comp).connect(pres).connect(mk).connect(lim).connect(ms).connect(oc.destination); s.start();
    return oc.startRendering();
  }
  const voice = await voiceLine('Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.');
  out.refs.voice = await measure(voice);
  const mp3 = await (await fetch(new URL('assets/music/village.mp3', base))).arrayBuffer();
  const music = await new OfflineAudioContext(2, SR, SR).decodeAudioData(mp3);
  async function musicAt(gain, sec = 12, from = 20) {
    const oc = new OfflineAudioContext(2, sec * SR, SR), s = oc.createBufferSource(); s.buffer = music;
    const g = oc.createGain(); g.gain.value = gain; s.connect(g).connect(oc.destination); s.start(0, from); return oc.startRendering();
  }
  out.refs.music = await measure(await musicAt(0.55 * 0.8));
  out.refs.musicDucked = await measure(await musicAt(0.55 * 0.8 * 0.5));

  // scenes: the engine on a context with the music bus and the voice in it; the events as play would call them
  const SCENES = {
    // walking on stone, a word with a neighbour (the music ducked), a door, the room's floor is wood
    quiet: { len: 9, duck: [2, 6.2], voice: 2.1, ev: (A, t, ex) => {
      for (let i = 0; i < 6; i++) t(0.2 + i * 0.32, () => A.play('step-stone'));
      t(6.6, () => A.play(namesHave(A, 'doorIn') ? 'doorIn' : 'door'));
      for (let i = 0; i < 5; i++) t(7.5 + i * 0.32, () => A.play('step-wood'));
      void ex;
    } },
    // three enemies: a sword combo with hits, a block, a ball throw off a wall onto an enemy, the catch, a hurt
    combat: { len: 7, ev: (A, t) => {
      const E1 = { x: 3, z: 1 }, E2 = { x: -6, z: 4 }, E3 = { x: 12, z: -9 };
      t(0.1, () => A.play('alert', E1)); t(0.15, () => A.play('alert', E2)); t(0.2, () => A.play('alert', E3));
      ['swing', 'swing', 'swingHeavy'].forEach((s, i) => { t(0.6 + i * 0.32, () => A.play(s)); t(0.7 + i * 0.32, () => A.play('hitFlesh', E1)); });
      t(1.7, () => A.play('zap', E2)); t(2.0, () => A.play('clang', E2));
      t(2.6, () => A.play('throw')); t(2.9, () => A.play(namesHave(A, 'bounceWall') ? 'bounceWall' : 'bounce'));
      t(3.15, () => A.play(namesHave(A, 'ballHit') ? 'ballHit' : 'hit', E2)); t(3.6, () => A.play('catch'));
      t(4.0, () => A.play('hurt')); t(4.4, () => A.play('punch')); t(4.5, () => A.play('hitFlesh', E1));
      t(4.6, () => A.play('hitFlesh', E1)); t(4.61, () => A.play('hitFlesh', E1)); t(4.62, () => A.play('hitFlesh', E1));   // (a repeated contact)
      t(5.0, () => A.play('break', E1)); t(5.5, () => A.play('slam', E3));
    } },
    // a crate's coins, a heart, a flask, then a found object
    pickups: { len: 6, ev: (A, t) => {
      t(0.1, () => A.play('break'));
      for (let i = 0; i < 8; i++) t(0.5 + i * 0.09, () => A.play('coin'));
      t(1.6, () => A.play(namesHave(A, 'pickLife') ? 'pickLife' : 'heal')); t(2.1, () => A.play(namesHave(A, 'pickMagic') ? 'pickMagic' : 'heal'));
      t(2.6, () => A.play(namesHave(A, 'pickClover') ? 'pickClover' : 'heal'));
      t(3.4, () => A.play(namesHave(A, 'found') ? 'found' : 'chest'));
    } },
    // the depot: valves, a lever, gears, the winch, a pipe knock, at once
    machinery: { len: 6, ev: (A, t) => {
      const M = { x: 4, z: 2 };
      t(0.1, () => A.play('liftWinch', M)); t(0.4, () => A.play(namesHave(A, 'lever') ? 'lever' : 'clunk'));
      t(0.7, () => A.play('gearClack', M)); t(0.75, () => A.play('grind', M)); t(1.2, () => A.play(namesHave(A, 'valve') ? 'valve' : 'clunk'));
      t(1.5, () => A.play('pipeKnock', M)); t(1.6, () => A.play('pipeKnock', M)); t(2.4, () => A.play('chest'));
      for (let i = 0; i < 8; i++) t(2.6 + i * 0.3, () => A.play('step-metal'));
      t(3, () => A.play('hum'));
    } },
  };
  const namesHave = (A, n) => A._names?.has(n);
  for (const [tag, mod, src] of [['after', now, srcNow], ['before', old, before]]) {
    if (!mod) continue;
    const names = new Set(namesOf(src));
    for (const [id, S] of Object.entries(SCENES)) {
      const { A, oc } = engine(mod, S.len);
      A._names = names;
      // the music bus (ducked while the line plays), the voice line
      const ms = oc.createBufferSource(); ms.buffer = music; const mg = oc.createGain(); mg.gain.value = 0.55 * 0.8;
      if (S.duck) { mg.gain.setValueAtTime(0.44, S.duck[0]); mg.gain.setTargetAtTime(0.22, S.duck[0], 0.08); mg.gain.setTargetAtTime(0.44, S.duck[1], 0.3); }
      ms.connect(mg).connect(oc.destination); ms.start(0, 30);
      if (S.voice != null) { const vs = oc.createBufferSource(); vs.buffer = voice; vs.connect(oc.destination); vs.start(S.voice); if (A.duck && S.duck) { at(oc, S.duck[0], () => A.duck?.(true)); at(oc, S.duck[1], () => A.duck?.(false)); } }
      S.ev(A, (tt, fn) => at(oc, tt, fn));
      const buf = await oc.startRendering();
      // the effects alone, for their share of the mix
      const e2 = engine(mod, S.len); e2.A._names = names; S.ev(e2.A, (tt, fn) => at(e2.oc, tt, fn));
      const fx = await e2.oc.startRendering();
      out.scenes.push({ id, tag, mix: await measure(buf), fx: await measure(fx), wav: wav(buf) });
    }
  }
  return out;
}, { before, base: URL0, ONLY });
await browser.close();

const rows = [];
for (const s of res.sfx) { writeFileSync(`${OUT}sfx/${s.name}-${s.tag}.wav`, Buffer.from(s.wav, 'base64')); delete s.wav; rows.push(s); }
for (const s of res.scenes) { writeFileSync(`${OUT}scenes/${s.id}-${s.tag}.wav`, Buffer.from(s.wav, 'base64')); delete s.wav; }
writeFileSync(OUT + 'measurements.json', JSON.stringify(res, null, 1));
const cols = ['name', 'tag', 'peak', 'lufsM', 'lufs50', 'attackMs', 'decayMs', 'durMs', 'centroid', 'hf', 'voiceBand', 'low', 'varDb', 'varCentroid'];
writeFileSync(OUT + 'measurements.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n');
console.log('refs', JSON.stringify(res.refs));
for (const s of res.scenes) console.log('scene', s.id, s.tag, JSON.stringify(s.mix), 'fx', JSON.stringify(s.fx));
console.log(rows.length, 'sounds measured →', OUT);
