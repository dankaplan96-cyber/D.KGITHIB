// VOICE-2: every Expressive bank brought to the same loudness as the game plays it (through the voice bus, which
// compresses a deep or a bright voice differently): three of the game's lines rendered per bank, their loudness
// (EBU R128) measured, and the bank's `gain` in assets/voice2/manifest.json set so each lands at TARGET LUFS (within
// 0.6-1.8x). Run after piper-expressive.py.   node tools/voice-render/v2-gain.mjs [--dry]
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { dialog } from './scenes.mjs';

const TARGET = -16.5, DRY = process.argv.includes('--dry');
const MF = join(LBA3, 'assets/voice2/manifest.json');
const man = JSON.parse(readFileSync(MF, 'utf8'));
const lufs = (data, sr) => {
  const p = '/dev/shm/.v2gain.f32'; writeFileSync(p, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  rmSync(p);
  return +r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0];
};
const LINES = ['Whatever Vesk tells you about the water, watch his face.', 'The shell? What shell?', 'Water! Steaming hot. You could boil an egg in it.'];
const inject = {}, keyOf = {};
for (const [id, b] of Object.entries(man.banks)) {
  if (!b.family) { keyOf[id] = id; continue; }
  const [race, sex] = b.family.split('-'), spk = +id.split('-').pop();
  const k = `calib_${id.replace(/-/g, '_')}`;
  inject[k] = { race, seed: 7, f0: b.f0, spk, ...(sex === 'kid' ? { kid: true } : { sex }) };
  keyOf[id] = k;
}
const R = await openRenderer({ roots: { game: LBA3 } });
const res = {};
for (const [id, key] of Object.entries(keyOf)) {
  const scene = dialog(LINES.map((l) => [key, l]), { gap: 0.4 });
  scene.turns.forEach((t) => { t.say = true; });
  const r = await R.render({ scene, mode: 'expressive', inject, opts: { presFromStyle: true } });
  const played = new Set(r.played.map((p) => p.split(':')[1]));
  const before = man.banks[id].gain ?? 1;
  const L = lufs(r.voice, r.sr);
  // (the bus compresses: a change of gain moves the output by less than its size; one step of 0.8 of the error)
  const g = Math.max(0.6, Math.min(1.8, before * Math.pow(10, (0.8 * (TARGET - L)) / 20)));
  res[id] = { lufs: L, gain: +g.toFixed(3), played: [...played] };
  if (!played.has(id)) console.warn('!! not played from its bank', id, [...played]);
  man.banks[id].gain = +g.toFixed(3);
  console.log(id.padEnd(13), L, 'LUFS -> gain', g.toFixed(3));
}
await R.close();
if (!DRY) writeFileSync(MF, JSON.stringify(man));
