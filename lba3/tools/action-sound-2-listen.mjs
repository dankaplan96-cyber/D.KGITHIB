// ACTION-SOUND-2: the A/B listening files and the measurements. For each family (the ball, the sword and weapons,
// fists/kick/moves, pick-ups and containers) a short sequence of game events is rendered offline twice with the game's
// own src/engine/audio.js: as the events sounded at REF (the build before this pass; an event that made no sound there
// is silence) and as they sound now, at the default sliders through the effects bus and its room. The two are joined
// as BEFORE, a beep, AFTER, into <out>/<family>.wav (ffmpeg makes the mp3). It also measures every sound this pass made
// or changed against a voice line and the music (peak, K-weighted 50 ms and 400 ms loudness, the click at the onset,
// length) into <out>/measurements.json.
//   GAME_URL=http://127.0.0.1:8980/ REF=ccr-c1c2c4b9-dep6ed node tools/action-sound-2-listen.mjs <outDir>
// Measuring and rendering only: nothing here says how a sound is heard. Our synthesis only; no recordings.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = (process.argv[2] || '/tmp/as2-listen') + '/';
const URL0 = process.env.GAME_URL || 'http://127.0.0.1:8980/';
const REF = process.env.REF || 'ccr-c1c2c4b9-dep6ed';
mkdirSync(OUT, { recursive: true });
const before = execSync(`git show ${REF}:lba3/src/engine/audio.js`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();

// a family: [time s, before, after, where?]. A name is a sound; 'old:x' the old weapons.js direct synthesis; null silence.
const FAM = {
  ball: [
    [0.2, 'throw', 'throw'], [0.75, 'bounceGround', 'bounceStone'], [1.25, 'bounceGround', 'bounceStone'], [1.7, 'bounceWall', 'bounceWall'],
    [2.3, 'bounceGround', 'bounceWood'], [2.8, 'bounceWall', 'bounceMetal'], [3.3, 'bounceGround', 'bounceGround'],
    [3.9, null, 'ballReturn'], [4.4, 'catch', 'catch'],
    [5.2, 'throw', 'throw'], [5.7, 'ballHit', 'ballHit'], [5.7, 'hitFlesh', 'hitFlesh'], [6.4, 'catch', 'catch'],
    [7.2, 'throw', 'throw'], [7.8, null, 'ballSplash'], [8.3, null, 'ballReturn'], [8.9, 'catch', 'catch'],
    // no magic: the throw and the one contact, home
    [9.8, 'throw', 'throwDud'], [10.35, 'bounceWall', 'ballDud'], [11.0, 'catch', 'catch'],
  ],
  sword: [
    [0.2, 'equip', 'swordDraw'], [1.0, 'swing', 'swing'], [1.33, 'swing', 'swing'], [1.66, 'swingHeavy', 'swingHeavy'],
    [2.5, 'swing', 'swing'], [2.6, 'hitFlesh', 'slashFlesh'], [2.9, 'swing', 'swing'], [3.0, 'hitFlesh', 'slashFlesh'],
    [3.6, 'swing', 'swing'], [3.7, 'hitWood', 'hitWood'], [4.3, 'swing', 'swing'], [4.4, 'clang', 'clang'],
    [5.0, 'chargeFull', 'chargeFull'], [5.4, 'swingHeavy', 'swingHeavy'], [5.5, 'hitFlesh', 'slashFlesh'],
    [6.4, 'equip', 'swordSheathe'], [6.4, null, 'equipFists'],
    [7.3, 'equip', 'equip'], [7.8, 'old:dart', 'wDart'], [8.3, 'old:dart', 'wDart'], [8.9, 'old:laser', 'wLaser'], [9.6, 'old:lightning', 'wLightning'],
  ],
  moves: [
    [0.2, 'equip', 'equipFists'], [0.8, 'punch', 'punch'], [0.9, 'hitFlesh', 'hitFlesh'], [1.15, 'punch', 'punch'], [1.25, 'hitFlesh', 'hitFlesh'],
    [1.6, 'punch', 'kick'], [1.7, 'hitFlesh', 'hitFlesh'], [2.4, 'equip', 'equipGlove'], [2.9, 'punch', 'gloveJab'], [3.4, 'swingHeavy', 'gloveHeavy'],
    [4.2, 'dodge', 'dodge'], [4.9, 'mode', 'mode'], [5.3, 'jump', 'jump'], [6.0, 'land', 'land'], [6.0, 'step-stone', 'step-stone'],
    [6.6, null, 'landSoft'],
    ...[0, 1, 2, 3].map((i) => [7.2 + i * 0.4, 'step-stone', 'step-stone']),
    [9.0, 'mode', 'mode'], ...[0, 1, 2, 3].map((i) => [9.5 + i * 0.5, null, 'step-sneak']), [11.7, null, 'hide'],
  ],
  pickups: [
    ...[0, 1, 2, 3, 4].map((i) => [0.2 + i * 0.12, 'coin', 'coin']), [1.3, 'pickLife', 'pickLife'], [1.9, 'pickMagic', 'pickMagic'], [2.5, 'pickClover', 'pickClover'],
    [3.4, 'found', 'found'], [5.0, 'hurt', 'hurt'], [5.8, 'hurt', 'hurt'], [5.8, null, 'lowLife'],
    [7.0, 'rummage', 'rummageBin'], [7.35, 'bonus', 'bonus'], [8.1, 'rummage', 'rummageBarrel'], [8.45, 'bonus', 'bonus'],
    [9.2, 'rummage', 'rummageCrate'], [9.55, 'bonus', 'bonus'], [10.3, 'rummage', 'rummageCase'], [10.65, 'bonus', 'bonus'], [11.5, null, 'rummageEmpty'],
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() !== 'log') console.log('page:', m.text()); });
await page.goto(URL0 + 'README.md');
const res = await page.evaluate(async ({ before, base, FAM }) => {
  const SR = 48000;
  const fix = (src) => src.replace(/from '\.\/(\w+)\.js'/g, (_, m) => `from '${new URL('src/engine/' + m + '.js', base).href}'`);
  const now = await import(new URL('src/engine/audio.js', base).href);
  const old = await import(URL.createObjectURL(new Blob([fix(before)], { type: 'text/javascript' })));
  const lab = await import(new URL('tests/lib/voicelab.js', base).href);
  const voiceMod = await import(new URL('src/engine/voice.js', base).href);
  function engine(mod, len) {
    const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const ctx = new Proxy(oc, { get(t, k) { if (k === 'state') return 'running'; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const A = Object.create(mod.AudioEngine.prototype);
    A._targets = new Map(); A.vol = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8 }; A.ctx = ctx;
    A.master = oc.createGain(); A.master.gain.value = 0.8; A.master.connect(oc.destination);
    A.fxDuck = oc.createGain(); A.fxDuck.connect(A.master);
    A.sfxBus = oc.createGain(); A.sfxBus.gain.value = 0.8; A.sfxBus.connect(A.fxDuck);
    A.reverb = oc.createConvolver(); A.reverb.buffer = A._impulse(0.25);
    const rg = oc.createGain(); rg.gain.value = 0.35; A.reverb.connect(rg).connect(A.fxDuck); A.sfxBus.connect(A.reverb);
    A.music = { duck() {} }; A.clock = () => oc.currentTime; A.noiseBuf = A._noise(2); A.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    return { A, oc };
  }
  const errors = [];
  const at = (oc, t, fn) => oc.suspend(Math.round(t * SR / 128) * 128 / SR).then(() => { try { fn(); } catch (e) { errors.push(`${t}: ${e.message}`); } finally { oc.resume(); } });
  // the old weapons.js synthesis (REF), as it was: straight into the engine's tone and noise voices
  const OLD = {
    dart: (au) => { au._burst({ dur: 0.08, vol: 0.12, f: 2600, f1: 900, type: 'bandpass', q: 2 }); au._tone({ type: 'triangle', f0: 700, f1: 420, dur: 0.05, vol: 0.03 }); },
    laser: (au) => { au._tone({ type: 'sawtooth', f0: 1900, f1: 520, dur: 0.16, vol: 0.05 }); au._tone({ type: 'sine', f0: 2600, f1: 1400, dur: 0.12, vol: 0.04 }); },
    lightning: (au) => { au._burst({ dur: 0.35, vol: 0.28, f: 4200, f1: 600, type: 'bandpass', q: 0.8 }); au._tone({ type: 'square', f0: 140, f1: 60, dur: 0.3, vol: 0.06 }); },
  };
  const fire = (A, n) => { if (!n) return; if (n.startsWith('old:')) OLD[n.slice(4)](A); else A.play(n); };
  async function kweight(buf) {
    const oc = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
    const s = oc.createBufferSource(); s.buffer = buf;
    const sh = oc.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1681.97; sh.gain.value = 4;
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38.13; hp.Q.value = 0.5;
    s.connect(sh).connect(hp).connect(oc.destination); s.start();
    return oc.startRendering();
  }
  const dB = (x) => (x > 1e-10 ? 20 * Math.log10(x) : -200);
  async function measure(buf) {
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    let on = 0; for (let i = 0; i < n; i++) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > peak * 0.01) { on = i; break; }
    let off = on; for (let i = n - 1; i > on; i--) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > peak * 0.0316) { off = i; break; }
    let jump = 0; for (let i = Math.max(1, on); i < Math.min(n, on + 96); i++) jump = Math.max(jump, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]));
    // the end: the largest step in the last 2 ms before it falls under -60 dB of its peak (a tail cut short clicks)
    let end = on; for (let i = n - 1; i > on; i--) if (Math.max(Math.abs(L[i]), Math.abs(R[i])) > peak * 0.001) { end = i; break; }
    let tailJump = 0; for (let i = Math.max(on + 1, end - 96); i <= end; i++) tailJump = Math.max(tailJump, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]));
    const K = await kweight(buf), kl = K.getChannelData(0), kr = K.getChannelData(1);
    const cum = new Float64Array(n + 1); for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + kl[i] * kl[i] + kr[i] * kr[i];
    const win = (w, hop) => { let m = -200; for (let i = 0; i + w <= n; i += hop) m = Math.max(m, -0.691 + 10 * Math.log10((cum[i + w] - cum[i]) / w + 1e-12)); return m; };
    return { peak: +dB(peak).toFixed(1), lufs50: +win(2400, 600).toFixed(1), lufsM: +win(19200, 2400).toFixed(1), click: +(jump / (peak || 1)).toFixed(3), tail: +(tailJump / (peak || 1)).toFixed(4), durMs: Math.round(((off - on) / SR) * 1000) };
  }
  const wav = (bufs, gapS = 0.45) => {
    // BEFORE, a beep (1 kHz, 0.15 s, -20 dBFS, ramped), AFTER
    const gap = Math.round(gapS * SR), beep = Math.round(0.15 * SR);
    const n = bufs[0].length + gap + beep + gap + bufs[1].length;
    const L = new Float32Array(n), R = new Float32Array(n);
    L.set(bufs[0].getChannelData(0), 0); R.set(bufs[0].getChannelData(1), 0);
    for (let i = 0; i < beep; i++) { const e = Math.min(1, i / 240, (beep - i) / 240), v = 0.1 * e * Math.sin((2 * Math.PI * 1000 * i) / SR); L[bufs[0].length + gap + i] = v; R[bufs[0].length + gap + i] = v; }
    const o = bufs[0].length + gap + beep + gap; L.set(bufs[1].getChannelData(0), o); R.set(bufs[1].getChannelData(1), o);
    const b = new ArrayBuffer(44 + n * 4), v = new DataView(b);
    const s = (q, t) => { for (let i = 0; i < t.length; i++) v.setUint8(q + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let str = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(str);
  };
  const out = { families: {}, sounds: {}, refs: {} };
  for (const [fam, evs] of Object.entries(FAM)) {
    const len = Math.max(...evs.map((e) => e[0])) + 1.6, bufs = [];
    for (const [k, mod] of [[1, old], [2, now]]) {
      const { A, oc } = engine(mod, len);
      for (const e of evs) at(oc, e[0], () => fire(A, e[k]));
      bufs.push(await oc.startRendering());
    }
    out.families[fam] = { before: await measure(bufs[0]), after: await measure(bufs[1]), wav: wav(bufs), events: evs.length };
  }
  // every sound this pass made or changed, alone (now), and what the event used to make (REF)
  const pairs = new Map();
  for (const evs of Object.values(FAM)) for (const e of evs) if (e[2]) pairs.set(e[2], e[1]);
  for (const n of ['tPip', 'tSqueal', 'tJet', 'tReel', 'tSteam', 'tFizz', 'motor', 'winch', 'trickle', 'steam']) if (!pairs.has(n)) pairs.set(n, null);
  for (const [n, b] of pairs) {
    const rec = {};
    for (const [tag, mod, name] of [['after', now, n], ['before', old, b]]) {
      if (!name) continue;
      const { A, oc } = engine(mod, 2.2); at(oc, 0.05, () => fire(A, name));
      rec[tag] = { name, ...(await measure(await oc.startRendering())) };
      // take-to-take spread: 6 takes, each a fresh engine (the small variation; the round-robin is per engine)
      if (tag === 'after') {
        const levels = [];
        for (let k = 0; k < 6; k++) { const e2 = engine(mod, 2.2); e2.A._rrN = new Map([[name, k % 3 - 1]]); at(e2.oc, 0.05, () => fire(e2.A, name)); const m = await measure(await e2.oc.startRendering()); levels.push(m.peak); }
        rec.after.spreadDb = +(Math.max(...levels) - Math.min(...levels)).toFixed(1);
      }
    }
    out.sounds[n] = rec;
  }
  // references: a voice line through the voice chain, the music at its slider (and ducked under a line)
  voiceMod.voiceBanks?.(null);
  const r = await lab.render(voiceMod, 'n_hero', 'Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.', { sr: SR });
  {
    const oc = new OfflineAudioContext(2, r.data.length, SR), b = oc.createBuffer(1, r.data.length, SR); b.copyToChannel(r.data, 0);
    const s = oc.createBufferSource(); s.buffer = b;
    const vb = oc.createGain(); vb.gain.value = 0.8 * 2.2;
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const pres = oc.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2500; pres.Q.value = 0.8; pres.gain.value = voiceMod.voiceStyle().pres;
    const mk = oc.createGain(); mk.gain.value = 2.2;
    const lim = oc.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
    const ms = oc.createGain(); ms.gain.value = 0.8;
    s.connect(vb).connect(comp).connect(pres).connect(mk).connect(lim).connect(ms).connect(oc.destination); s.start();
    out.refs.voice = await measure(await oc.startRendering());
  }
  const mp3 = await (await fetch(new URL('assets/music/village.mp3', base))).arrayBuffer();
  const music = await new OfflineAudioContext(2, SR, SR).decodeAudioData(mp3);
  for (const [k, g] of [['music', 0.55 * 0.8], ['musicDucked', 0.55 * 0.8 * 0.5]]) {
    const oc = new OfflineAudioContext(2, 12 * SR, SR), s = oc.createBufferSource(); s.buffer = music;
    const gg = oc.createGain(); gg.gain.value = g; s.connect(gg).connect(oc.destination); s.start(0, 20);
    out.refs[k] = await measure(await oc.startRendering());
  }
  out.errors = errors;
  return out;
}, { before, base: URL0, FAM });
await browser.close();
for (const [fam, f] of Object.entries(res.families)) { writeFileSync(`${OUT}${fam}.wav`, Buffer.from(f.wav, 'base64')); delete f.wav; }
writeFileSync(OUT + 'measurements.json', JSON.stringify(res, null, 1));
console.log('refs', JSON.stringify(res.refs));
for (const [fam, f] of Object.entries(res.families)) console.log('family', fam, JSON.stringify(f));
for (const [n, s] of Object.entries(res.sounds)) console.log('sound', n, JSON.stringify(s));
if (res.errors.length) { console.log('ERRORS', res.errors); process.exitCode = 1; }
