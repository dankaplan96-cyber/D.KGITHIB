// GUARD-CHARGE (the user's pick 26.11) listening file: a guard's rifle aim and shot, BEFORE (the aim silent, then the
// shot's zap: audio.js at REF, default the branch before this change) and AFTER (the aim's own charge, then the same
// zap: this checkout's audio.js), the Quetch's and the heavier troopers' (a tone lower), then the drone's charge and
// shot once for comparison. Rendered offline in headless Chromium with the game's own engine (the effects bus, its
// 0.25 s room, the master at the default sliders), the source 5.2 m off, a little to the right, as in play; then the
// whole file scaled by one factor so its peak is -3 dBFS (the order of loudness inside it is the game's). Our
// synthesis only; no recordings.
//   REF=<git rev> node tools/guard-charge-listen.mjs [out.wav]
// Layout: 0.3 s · BEFORE 0.8 · 1 s · AFTER 0.8 · 1 s · AFTER heavy 0.8 · 2 s · DRONE (after) 0.75 · 0.5 s
// Prints the layout and each part's peak and 50 ms loudness (at the game's level, before the scaling). Measuring
// only: nothing here says how it sounds.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveLocal } from '../tests/lib/serve.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || ROOT + 'captures/guard-sound/before-after-loud.wav';
const REF = process.env.REF || 'ccr-c1c2c4b9-dep6ed';
const before = execSync(`git show ${REF}:lba3/src/engine/audio.js`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
const URL0 = 'http://localhost:8123/';

const browser = await chromium.launch();
const page = await browser.newPage();
await serveLocal(page, URL0);
await page.route(URL0 + '__blank.html', (r) => r.fulfill({ status: 200, body: '<!doctype html><title>render</title>', headers: { 'content-type': 'text/html' } }));   // (a page on the game's origin, without the game)
await page.goto(URL0 + '__blank.html');
const res = await page.evaluate(async ({ before, base }) => {
  const SR = 48000;
  const fix = (src) => src.replace(/from '\.\/(\w+)\.js'/g, (_, m) => `from '${new URL('src/engine/' + m + '.js', base).href}'`);
  const now = await import(new URL('src/engine/audio.js', base).href);
  const old = await import(URL.createObjectURL(new Blob([fix(before)], { type: 'text/javascript' })));
  function engine(mod, len) {
    const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR);
    const ctx = new Proxy(oc, { get(t, k) { if (k === 'state') return 'running'; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    const A = Object.create(mod.AudioEngine.prototype);
    A._targets = new Map(); A.vol = { master: 0.8, music: 0.55, sfx: 0.8, voice: 0.8 }; A.ctx = ctx;
    A.master = oc.createGain(); A.master.gain.value = 0.8; A.master.connect(oc.destination);
    A.fxDuck = oc.createGain(); A.fxDuck.connect(A.master);
    A.sfxBus = oc.createGain(); A.sfxBus.gain.value = 0.8 * 1.5; A.sfxBus.connect(A.fxDuck);   // (SFX_MAKEUP, as applyVolumes; the game's limiter after it, at -6 dB, is never reached by these)
    A.reverb = oc.createConvolver(); A.reverb.buffer = A._impulse(0.25);
    const rg = oc.createGain(); rg.gain.value = 0.35; A.reverb.connect(rg).connect(A.fxDuck); A.sfxBus.connect(A.reverb);
    A.music = { duck() {} }; A.clock = () => oc.currentTime; A.noiseBuf = A._noise(2);
    A.listener = { x: 0, z: 0, rx: 1, rz: 0 };
    return { A, oc };
  }
  const q = (t) => Math.round(t * SR / 128) * 128 / SR;
  const at = (oc, t, fn) => oc.suspend(q(t)).then(() => { fn(); oc.resume(); });
  const SRC = { x: 1.5, z: 5 };   // (5.2 m ahead, a little right: level 0.77, side 0.17)
  // one part: the aim (or the drone's wind-up) at 0.05 s, the shot T later. before: nothing, then the zap (the guards' aim
  // was silent); guard: the held charge, cut at the shot, + zap; heavy: the same, low; drone: its charge + zap
  async function part(kind, T) {
    const { A, oc } = engine(kind === 'before' ? old : now, T + 0.55); let h = null;
    at(oc, 0.05, () => { if (kind === 'guard' || kind === 'heavy') h = A.held('guardCharge', SRC, { dur: T, low: kind === 'heavy' }); else if (kind === 'drone') h = A.held('droneCharge', SRC, { dur: T }); });
    at(oc, 0.05 + T, () => { h?.stop(); A.play('zap', SRC); });
    return oc.startRendering();
  }
  const parts = [], lay = [];
  const sil = (s) => parts.push({ L: new Float32Array(Math.round(s * SR)), R: new Float32Array(Math.round(s * SR)) });
  const add = (b) => parts.push({ L: b.getChannelData(0).slice(), R: b.getChannelData(1).slice() });
  const len = () => parts.reduce((s, p) => s + p.L.length, 0) / SR;
  const dB = (x) => (x > 1e-10 ? 20 * Math.log10(x) : -200);
  const meas = (b, a, z) => { const L = b.getChannelData(0), R = b.getChannelData(1); let pk = 0, m = 0; for (let i = Math.floor(a * SR); i < Math.min(L.length, z * SR); i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); for (let i = Math.floor(a * SR); i + 2400 < Math.min(L.length, z * SR); i += 600) { let s = 0; for (let j = i; j < i + 2400; j++) s += L[j] * L[j] + R[j] * R[j]; m = Math.max(m, s / 2400); } return { peak: +dB(pk).toFixed(1), l50: +(10 * Math.log10(m + 1e-12)).toFixed(1) }; };
  const NAME = { before: 'BEFORE guard (silent aim)', guard: 'AFTER guard', heavy: 'AFTER heavy guard (Grobo / trooper)', drone: 'DRONE (its new charge)' };
  sil(0.3);
  for (const [kind, T, gap] of [['before', 0.8, 0], ['guard', 0.8, 1.0], ['heavy', 0.8, 1.0], ['drone', 0.75, 2.0]]) {
    if (gap) sil(gap);
    const b = await part(kind, T), t0 = len();
    add(b);
    lay.push({ part: `${NAME[kind]} tell ${T} s`, aim: +(t0 + q(0.05)).toFixed(3), shot: +(t0 + q(0.05 + T)).toFixed(3), aimSound: meas(b, q(0.05), q(0.05 + T)), shotSound: meas(b, q(0.05 + T), T + 0.55) });
  }
  sil(0.5);
  const n = parts.reduce((s, p) => s + p.L.length, 0), L = new Float32Array(n), R = new Float32Array(n);
  let o = 0; for (const p of parts) { L.set(p.L, o); R.set(p.R, o); o += p.L.length; }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  // one gain for the whole file: its peak to -3 dBFS (louder than the game, for listening; the parts keep their order)
  const gain = Math.pow(10, -3 / 20) / pk;
  for (let i = 0; i < n; i++) { L[i] *= gain; R[i] *= gain; }
  // 16-bit PCM WAV, stereo, 48 kHz
  const buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { wav: btoa(bin), seconds: +(n / SR).toFixed(2), peak: +dB(pk).toFixed(1), gain: +(20 * Math.log10(gain)).toFixed(1), lay };
}, { before, base: URL0 });
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(res.wav, 'base64'));
console.log(`${OUT}: ${res.seconds} s, the game's peak ${res.peak} dBFS, scaled +${res.gain} dB to -3 dBFS (REF ${REF} for BEFORE)`);
for (const l of res.lay) console.log(JSON.stringify(l));
