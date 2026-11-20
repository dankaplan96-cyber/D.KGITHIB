// VOICES-PIPER: the listening files for the Piper banks, through the game's own playback (the Babble of
// src/engine/voice.js, driven like the dialogue box by tools/voice-render/scene.js), and their measurements.
//   node tools/voice-render/listen-piper.mjs <out dir> [old lba3 root, for the loudness before]
// 6-ingame-conversation.mp3  chapter 1: Twinsen and Zoé at home (the opening's subtitle times), Mira and Gilbert at the
//                            well, Doran at the harbour (dialogue boxes): over a minute, over home.mp3 at its in-game
//                            level, ducked under the voices as in the game.
// 7-cast-sampler.mp3         "Is everything all right?" from the main cast and four residents, then Zoé worried and
//                            relieved.
// Prints numbers only (loudness, peaks, repetition); they do not say how a voice sounds.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN, dialog } from './scenes.mjs';
import { measure, slice } from './measure.mjs';

const [OUT, OLD] = process.argv.slice(2);
if (!OUT) { console.error('usage: listen-piper.mjs <out dir> [old lba3 root]'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const R = await openRenderer({ roots: { game: LBA3, ...(OLD ? { old: OLD } : {}) } });
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
const report = {};
const turnsOf = (scene, r) => scene.turns.filter((t) => t.key).map((t) => { const nx = scene.turns[scene.turns.indexOf(t) + 1]; return slice(r.voice, r.sr, t.at, nx ? nx.at : scene.len); });
const opts = { presFromStyle: true };

// ---------------------------------------------------------------- 6. a chapter-1 conversation, over the music
{
  const shift = (sc, dt) => sc.turns.map((t) => ({ ...t, at: +(t.at + dt).toFixed(3), end: t.end != null ? t.end + dt : undefined }));
  const t1 = HOME.len + 0.6, t2 = t1 + WELL.len + 0.6;
  const scene = { len: +(t2 + DORAN.len).toFixed(2), turns: [...shift(HOME, 0), ...shift(WELL, t1), ...shift(DORAN, t2)] };
  const r = await R.render({ scene, opts, music: 'home.mp3' });
  mp3('6-ingame-conversation.mp3', r.mix);
  const ids = r.played.map((x) => x.split(':').slice(0, 2).join(':'));
  let immediate = 0; const seen = {};
  ids.forEach((x, i) => { seen[x] = (seen[x] || 0) + 1; if (i && ids[i - 1] === x) immediate++; });
  const rows = turnsOf(scene, r).map((x) => measure(x, r.sr));
  report.conversation = {
    seconds: scene.len, lines: scene.turns.filter((t) => t.key).length, voice: ebu(r.voice), mix: ebu(r.mix),
    clipsPlayed: ids.length, distinctClips: Object.keys(seen).length, usedTwice: Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k), immediateRepeats: immediate,
    clickCrestMax: Math.max(...rows.map((x) => x.clickCrest ?? 0)), peakDbMax: Math.max(...rows.map((x) => x.peakDb)),
  };
  const m = await R.render({ scene, opts: { ...opts, voiceVol: 0 }, music: 'home.mp3' });
  report.conversation.musicDuckedAlone = ebu(m.mix);
  if (OLD) {   // the same conversation with the banks before (the synthesised phrases): the voice's loudness then
    const o = await R.render({ root: 'old', scene, opts, music: 'home.mp3' });
    report.conversation.before = { voice: ebu(o.voice), mix: ebu(o.mix) };
  }
}

// ---------------------------------------------------------------- 7. the cast sampler
{
  const Q = 'Is everything all right?';
  const cast = ['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'sendell', 'gilbert', 'mira', 'doran', 'farmer1', 'pippa', 'yorna', 'esren'];
  const lines = cast.map((id) => [id, Q]);
  lines.push(['zoe', "The tap's stopped again..."], ['zoe', "Oh good, it's working again!"]);
  const scene = dialog(lines, { gap: 0.5 });
  scene.turns.forEach((t) => { t.say = true; });   // (each its own box, the two Zoé lines too)
  const r = await R.render({ scene, opts });
  mp3('7-cast-sampler.mp3', r.voice);
  const rows = turnsOf(scene, r).map((x, i) => ({ who: lines[i][0], ...measure(x, r.sr) }));
  report.sampler = { ...ebu(r.voice), perSpeaker: rows.map((x) => `${x.who} f0 ${x.f0} rms ${x.rmsDb} peak ${x.peakDb}`), played: r.played };
}
await R.close();
writeFileSync(join(OUT, '.measurements-piper.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
