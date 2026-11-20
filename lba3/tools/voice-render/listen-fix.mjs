// AUDIO-FIX (the user, 4.11: Sendell not angelic enough; Twinsen and Vesk too alike): the before/after listening files,
// through the game's own playback (the Babble of src/engine/voice.js, driven like the dialogue box by scene.js), over
// the music at its in-game level and ducked as in the game. Each file: the old version, a beep, the new version.
//   node tools/voice-render/listen-fix.mjs <out dir> <old lba3 root>
// 8-sendell.mp3        Sendell and Twinsen at the shell (chapter 3's lines), over well.mp3
// 9-twinsen-vesk.mp3   Twinsen meets Vesk in the square, then asks about the shell (chapter 1), over facility.mp3
// Prints numbers only (loudness, pitch, peaks); they do not say how a voice sounds.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { dialog } from './scenes.mjs';
import { measure, slice } from './measure.mjs';

const [OUT, OLD] = process.argv.slice(2);
if (!OUT || !OLD) { console.error('usage: listen-fix.mjs <out dir> <old lba3 root>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const R = await openRenderer({ roots: { game: LBA3, old: OLD } });

const SENDELL = dialog([
  ['sendell', 'Twinsen.'],
  ['hero', 'Sendell. Who is "her"? What is under the shell?'],
  ['sendell', 'A child of this world. She is not ready to wake, and the drill has cracked her shell.'],
  ['hero', 'Then we stop the drill.'],
  ['sendell', 'Stopping it will not close the cracks. I have held them alone for weeks. I cannot hold them much longer.'],
  ['hero', 'Baldino says the bore can be turned around. Into a shield.'],
  ['sendell', 'Then turn it. I will hold on as long as I can.'],
]);
const VESK = dialog([
  ['vesk', 'c1_vesk_1'], ['hero', 'c1_tw_vesk1'], ['vesk', 'c1_vesk_2'], ['hero', 'c1_tw_vesk2'], ['vesk', 'c1_vesk_3'],
  ['hero', 'c1_tw_tour2'], ['vesk', 'c1_vesk_tour3'],
]);

const beep = () => {
  const a = new Float32Array(Math.round(SR * 1.1));
  for (let i = 0; i < SR * 0.22; i++) { const t = i / SR; a[Math.round(SR * 0.45) + i] = 0.12 * Math.sin(2 * Math.PI * 880 * t) * Math.min(1, t / 0.01, (0.22 - t) / 0.02); }
  return a;
};
const join3 = (a, b) => { const z = beep(), o = new Float32Array(a.length + z.length + b.length); o.set(a); o.set(z, a.length); o.set(b, a.length + z.length); return o; };
const raw = (name, data) => { const p = join(OUT, name); writeFileSync(p, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); return p; };
const mp3 = (name, data) => {
  const p = raw('.' + name + '.f32', data);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-c:a', 'libmp3lame', '-q:a', '2', join(OUT, name)]);
  rmSync(p);
};
const ebu = (data) => {
  const p = raw('.l.f32', data);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  rmSync(p);
  const I = r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0], P = r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0];
  return { lufs: +I, truePeak: +P };
};
const turns = (scene, r, who) => scene.turns.filter((t) => t.key === 'n_' + who).map((t) => { const nx = scene.turns[scene.turns.indexOf(t) + 1]; return measure(slice(r.voice, r.sr, t.at, nx ? nx.at : scene.len), r.sr); });
const med = (xs) => { const s = xs.filter((x) => x).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const report = {};
const opts = { presFromStyle: true };
for (const [file, scene, music, who] of [['8-sendell.mp3', SENDELL, 'well.mp3', ['sendell', 'hero']], ['9-twinsen-vesk.mp3', VESK, 'facility.mp3', ['vesk', 'hero']]]) {
  const o = await R.render({ root: 'old', scene, opts, music });
  const n = await R.render({ root: 'game', scene, opts, music });
  mp3(file, join3(o.mix, n.mix));
  const row = {};
  for (const [k, r] of [['old', o], ['new', n]]) {
    row[k] = { voice: ebu(r.voice), mix: ebu(r.mix) };
    for (const w of who) { const m = turns(scene, r, w); row[k][w] = { f0: med(m.map((x) => x.f0)), clickCrestMax: Math.max(...m.map((x) => x.clickCrest ?? 0)), peakDbMax: Math.max(...m.map((x) => x.peakDb)) }; }
  }
  report[file] = row;
}
await R.close();
writeFileSync(join(OUT, '.measurements-fix.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
