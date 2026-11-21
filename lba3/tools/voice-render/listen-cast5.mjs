// VOICE-CAST-5 / VOICE-FLOW (wave 5): listening files, through the game's own playback (tools/voice-render/scene.js),
// the music at its in-game level and ducked under the voices as in the game. A/B files: the version before (old
// root), a double beep, the version after; the same lines, the same subtitle timing, the same mix.
//   node tools/voice-render/listen-cast5.mjs <out dir> <old lba3 root>
// 10-flow-ab.mp3        chapter 1: Twinsen and Zoé at home, Mira and Gilbert at the well, Doran's long lines
// 11-street-ab.mp3      Zeelich's street: Fennick, Oma, Rezz, Lissa, Wenna with Nara, Oku and Twinsen (over a minute)
// 12-keepers-ab.mp3     Corla, the isle keepers, the depot guard, each with a neighbour
// 13-cast-sampler.mp3   "Is everything all right?" from each new speaker (some neighbours between), then Corla warm
//                       and Corla sorry
// 14-pause-cut-sim.wav  a simulation of where the output stops when a story scene pauses: music cut mid-wave (before)
//                       and faded over 20 ms first (after). Not a capture of the game.
// Prints numbers only (loudness, peaks, repetition); they do not say how a voice sounds.
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN } from './scenes.mjs';
import { STREET, KEEPERS, SAMPLER } from './cast5.mjs';

const [OUT, OLD] = process.argv.slice(2);
if (!OUT || !OLD) { console.error('usage: listen-cast5.mjs <out dir> <old lba3 root>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const R = await openRenderer({ roots: { game: LBA3, old: OLD } });
const raw = (name, data) => { const p = join(OUT, name); writeFileSync(p, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); return p; };
const mp3 = (name, data) => {
  const p = raw('.' + name + '.f32', data);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-c:a', 'libmp3lame', '-q:a', '4', join(OUT, name)]);
  rmSync(p);
};
const ebu = (data) => {
  const p = raw('.l.f32', data);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  rmSync(p);
  const I = r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0], P = r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0];
  return { lufs: +I, truePeak: +P };
};
// a soft double beep (880 Hz, 0.12 s each, 0.1 s apart) between A and B, 0.8 s of quiet either side
const beep = () => {
  const n = Math.round(SR * 2.04), b = new Float32Array(n);
  for (const t0 of [0.8, 1.02]) for (let i = 0; i < SR * 0.12; i++) { const k = Math.round(t0 * SR) + i, e = Math.sin(Math.PI * i / (SR * 0.12)); b[k] = 0.12 * e * e * Math.sin(2 * Math.PI * 880 * i / SR); }
  return b;
};
const cat = (...xs) => { const n = xs.reduce((a, x) => a + x.length, 0), o = new Float32Array(n); let k = 0; for (const x of xs) { o.set(x, k); k += x.length; } return o; };
const shift = (sc, dt) => sc.turns.map((t) => ({ ...t, at: +(t.at + dt).toFixed(3), end: t.end != null ? t.end + dt : undefined }));
const join3 = (...scs) => { let t = 0; const turns = []; for (const s of scs) { turns.push(...shift(s, t)); t += s.len + 0.6; } return { len: +(t - 0.6).toFixed(2), turns }; };
const opts = { presFromStyle: true };
const report = {};
const repeats = (played) => { const ids = played.map((x) => x.split(':').slice(0, 2).join(':')); let imm = 0; ids.forEach((x, i) => { if (i && ids[i - 1] === x) imm++; }); return { clips: ids.length, distinct: new Set(ids).size, immediateRepeats: imm }; };

const ab = async (file, scene, music) => {
  const a = await R.render({ root: 'old', scene, opts, music });
  const b = await R.render({ root: 'game', scene, opts, music });
  mp3(file, cat(a.mix, beep(), b.mix));
  report[file] = { seconds: scene.len, lines: scene.turns.filter((t) => t.key).length, before: { voice: ebu(a.voice), mix: ebu(a.mix), ...repeats(a.played) }, after: { voice: ebu(b.voice), mix: ebu(b.mix), ...repeats(b.played) } };
};
await ab('10-flow-ab.mp3', join3(HOME, WELL, DORAN), 'home.mp3');
await ab('11-street-ab.mp3', STREET, 'home.mp3');
await ab('12-keepers-ab.mp3', KEEPERS, 'home.mp3');
{
  const s = await R.render({ root: 'game', scene: SAMPLER, opts });
  mp3('13-cast-sampler.mp3', s.mix);
  report['13-cast-sampler.mp3'] = { seconds: SAMPLER.len, voice: ebu(s.voice), ...repeats(s.played) };
}
await R.close();
// 14: the stop point, simulated on a stretch of the music (the game's own home.mp3, as decoded by ffmpeg)
{
  const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', '20', '-t', '2', '-i', join(LBA3, 'assets/music/home.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']);
  const m = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
  // the cut: at the loudest sample of the second half (a cut mid-wave at its worst)
  let at = Math.floor(m.length / 2); for (let i = at; i < m.length; i++) if (Math.abs(m[i]) > Math.abs(m[at])) at = i;
  const hard = m.slice(0, at), soft = m.slice(0, at), F = Math.round(0.02 * SR);
  for (let i = 0; i < F; i++) soft[at - F + i] *= 1 - (i + 1) / F;
  const quiet = new Float32Array(SR);
  const wav = cat(hard, quiet, beep(), soft, quiet);
  const p = raw('.c.f32', wav);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-c:a', 'pcm_s16le', join(OUT, '14-pause-cut-sim.wav')]);
  rmSync(p);
  report['14-pause-cut-sim.wav'] = { lastSampleBefore: +Math.abs(hard[hard.length - 1]).toFixed(3), lastSampleAfter: +Math.abs(soft[soft.length - 1]).toFixed(4) };
}
console.log(JSON.stringify(report, null, 1));
writeFileSync(join(OUT, 'measurements.json'), JSON.stringify(report, null, 1));
