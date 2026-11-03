// VOICE-PHRASE: renders the phrase banks the game speaks from (assets/voice/*.ogg + manifest.json).
//   node tools/voice-render/build-banks.mjs [bank ...]      (no names: all of them)
//
// Each bank holds one voice's short performances: for each intention a few lengths (in syllables) and a few variants,
// each one connected gesture planned by src/engine/voiceplan.js and rendered by tools/voice-render/synth.mjs. The
// main cast have banks of their own; residents speak from their people's family bank (by sex and age), moved to their
// own pitch in the game. Every bank is brought to the same loudness (a K-weighted level, as loudness meters weigh it),
// the clips laid end to end with a short silence between them, and encoded as Ogg Opus at 16 kHz (the voices have
// nothing above 4 kHz). Needs ffmpeg with libopus. Original synthesis only: no recordings, no speech engine.
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { LBA3 } from './render.mjs';
import { voiceFor, makeVoice } from '../../src/engine/voice.js';
import { gesture, hashStr } from '../../src/engine/voiceplan.js';
import { renderGesture } from './synth.mjs';

const SR = 32000, OUT_SR = 16000, GAP = 0.03;
const OUT = join(LBA3, 'assets', 'voice');
const TARGET = -20;      // K-weighted level of a bank's speech (dB re full scale)
const BITRATE = '16k';

// the main cast's own banks, and the families
export const OWN = ['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'sendell', 'gilbert', 'mira', 'doran'];
export const FAMILIES = {
  'quetch-m': { race: 'quetch', seed: 7001, f0: 135, k: 0.96, contour: 'fall', rate: 0.95, sex: 'm' },
  'quetch-f': { race: 'quetch', seed: 7002, f0: 222, k: 1.12, contour: 'arc', range: 5, rate: 1.0, breath: 0.09, sex: 'f' },
  'quetch-kid': { race: 'quetch', seed: 7003, kid: true, f0: 305, k: 1.25, contour: 'bounce', range: 5, rate: 1.12 },
  'grobo-m': { race: 'grobo', seed: 7004, f0: 110, k: 0.82, rate: 0.85, sex: 'm' },
  'grobo-f': { race: 'grobo', seed: 7005, f0: 192, k: 0.92, contour: 'arc', range: 4, rate: 0.92, sex: 'f' },
  'grobo-kid': { race: 'grobo', seed: 7006, kid: true, f0: 288, k: 1.06, contour: 'bounce', range: 5, rate: 1.05 },
  'bunny-m': { race: 'bunny', seed: 7007, f0: 145, k: 1.06, contour: 'sing', rate: 0.95, legato: 0.7, sex: 'm' },
  'bunny-f': { race: 'bunny', seed: 7008, f0: 218, k: 1.2, contour: 'bounce', rate: 1.0, legato: 0.6, sex: 'f' },
  'esmer-m': { race: 'esmer', seed: 7009, f0: 132, k: 0.97, rate: 0.88, legato: 0.8, sex: 'm' },
  'esmer-f': { race: 'esmer', seed: 7010, f0: 232, k: 1.15, rate: 0.95, sex: 'f' },
};
// the clips: lengths (syllables) per intention, and how many variants (own bank, family bank)
const INVENTORY = {
  tell: [[1, 2, 3, 4, 6, 8], 3, 2],
  cont: [[2, 4, 6], 2, 1],
  ask: [[1, 3, 6], 2, 1], excl: [[1, 3, 6], 2, 1], no: [[1, 3, 6], 2, 1], worry: [[1, 3, 6], 2, 1], warm: [[1, 3, 6], 2, 1],
};

// K-weighting (ITU-R BS.1770: a high shelf of +4 dB from about 1.7 kHz, a high-pass at about 38 Hz) at any rate
function kWeight(x, sr) {
  const biq = (b, a) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = (b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0]; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  // RBJ high shelf, f 1681, gain 4 dB, Q 0.707
  let w = 2 * Math.PI * 1681 / sr, A = Math.pow(10, 4 / 40), al = Math.sin(w) / (2 * 0.707), c = Math.cos(w), sA = 2 * Math.sqrt(A) * al;
  const hs = biq([A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)], [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]);
  w = 2 * Math.PI * 38 / sr; al = Math.sin(w) / (2 * 0.5); c = Math.cos(w);
  x = hs;
  return biq([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]);
}
// the K-weighted level of the speech (400 ms blocks, those within 20 dB of the loudest block)
export function speechLevel(x, sr) {
  const k = kWeight(x, sr), B = Math.floor(0.4 * sr), bl = [];
  for (let s = 0; s + B <= k.length; s += B / 4) { let e = 0; for (let i = 0; i < B; i++) e += k[s + i] * k[s + i]; bl.push(e / B); }
  const mx = Math.max(...bl), keep = bl.filter((e) => e > mx / 100);
  return 10 * Math.log10(keep.reduce((a, b) => a + b, 0) / Math.max(1, keep.length)) - 0.691;
}

export function bankVoice(id) { return FAMILIES[id] ? makeVoice(FAMILIES[id], id) : voiceFor('n_' + id); }

// render one bank: { pcm (Float32Array at SR), clips, f0 }
export function renderBank(id, v0 = null) {
  const v = v0 || bankVoice(id), fam = !!FAMILIES[id];
  const clips = {}, parts = [], len = {}, vars = {};
  let pos = 0;
  const add = (cid, g) => {
    const lead = 0.03, x = renderGesture(v, g, { sr: SR, seed: hashStr(id + cid), lead, tail: 0.14 });
    clips[cid] = { o: +pos.toFixed(4), d: +(x.length / SR).toFixed(4), sp: +(lead + g.dur).toFixed(4),
      s: g.syl.map((s) => [+(lead + s.t).toFixed(3), +s.cd.toFixed(3), +(s.vd + (s.coda ? 0.05 : 0)).toFixed(3), s.vk, s.c, s.amp]) };
    parts.push(x, new Float32Array(Math.round(GAP * SR)));
    pos += x.length / SR + GAP;
  };
  for (const [intent, [lens, vOwn, vFam]] of Object.entries(INVENTORY)) {
    const nv = fam ? vFam : vOwn;
    len[intent] = lens; vars[intent] = nv;
    for (const n of lens) for (let k = 0; k < nv; k++) add(`${intent}.${n}.${k}`, gesture(v, n, intent, hashStr(`${id}.${intent}.${n}.${k}`)));
  }
  // Twinsen's hesitation: a short closed-mouth "hm"
  if (v.manner === 'hesitate') {
    len.hm = [1]; vars.hm = 2;
    for (let k = 0; k < 2; k++) {
      const g = gesture(v, 1, 'tell', hashStr(`${id}.hm.${k}`), { hesitate: true });
      add(`hm.1.${k}`, { syl: [g.syl[0]], dur: g.syl[0].vd, breath: 1 });
    }
  }
  const pcm = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length; }
  return { v, pcm, clips, len, var: vars, family: fam };
}

// level a bank to the target, peaks at most -1.5 dBFS; returns the gain applied
export function levelBank(pcm) {
  const L = speechLevel(pcm, SR);
  let g = Math.pow(10, (TARGET - L) / 20);
  let pk = 0; for (const s of pcm) pk = Math.max(pk, Math.abs(s));
  g = Math.min(g, Math.pow(10, -1.5 / 20) / pk);
  for (let i = 0; i < pcm.length; i++) pcm[i] *= g;
  return { gain: g, level: L, peak: pk * g };
}

// encode a rendered, levelled bank into dir/<id>.ogg; returns its manifest entry
export function encodeBank(id, b, dir) {
  const tmp = join(dir, `.${id}.f32`);
  writeFileSync(tmp, Buffer.from(b.pcm.buffer, b.pcm.byteOffset, b.pcm.byteLength));
  const file = id + '.ogg';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', tmp, '-af', 'aresample=resampler=soxr', '-ar', String(OUT_SR), '-c:a', 'libopus', '-b:a', BITRATE, '-application', 'audio', '-map_metadata', '-1', join(dir, file)]);
  rmSync(tmp);
  return { file, f0: b.v.f0, family: b.family || undefined, len: b.len, var: b.var, clips: b.clips };
}

if (process.argv[1] && process.argv[1].endsWith('build-banks.mjs')) {
  const want = process.argv.slice(2);
  const ids = want.length ? want : [...OWN, ...Object.keys(FAMILIES)];
  mkdirSync(OUT, { recursive: true });
  const mfile = join(OUT, 'manifest.json');
  const man = existsSync(mfile) ? JSON.parse(readFileSync(mfile, 'utf8')) : { version: 1, sr: OUT_SR, banks: {} };
  for (const id of ids) {
    const t0 = Date.now();
    const b = renderBank(id);
    const lv = levelBank(b.pcm);
    man.banks[id] = encodeBank(id, b, OUT);
    const kb = statSync(join(OUT, man.banks[id].file)).size / 1024;
    console.log(`${id.padEnd(11)} ${Object.keys(b.clips).length} clips, ${(b.pcm.length / SR).toFixed(1)} s, ${kb.toFixed(0)} KB, level ${lv.level.toFixed(1)} -> ${TARGET} dB (peak ${(20 * Math.log10(lv.peak)).toFixed(1)} dBFS), ${Date.now() - t0} ms`);
  }
  man.banks = Object.fromEntries(Object.entries(man.banks).sort());
  writeFileSync(mfile, JSON.stringify(man));
  let total = 0; for (const b of Object.values(man.banks)) total += statSync(join(OUT, b.file)).size;
  console.log(`assets/voice: ${Object.keys(man.banks).length} banks, ${(total / 1024 / 1024).toFixed(2)} MB + manifest ${(statSync(mfile).size / 1024).toFixed(0)} KB`);
}
