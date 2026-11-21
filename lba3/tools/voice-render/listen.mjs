// VOICE-PHRASE: the listening files (mp3) and their measurements.
//   node tools/voice-render/listen.mjs <out dir> <old root (a checkout's lba3 with the voice before)>
// 1-AB-twinsen-zoe.mp3      the same six lines of chapter 1 at home (the opening's own subtitle times), four times:
//                           A the voice before (classic), B the soft style the user preferred, C1 the pre-rendered
//                           phrases, C2 the live phrase synthesis; N soft tones before part N; the voice alone.
// 2-cast-sampler.mp3        one simple question from the main cast and two residents, then Zoé worried and relieved.
// 3-long-conversation.mp3   a little over a minute of chapter-1 conversation in the chosen approach, over the music
//                           at its in-game level (ducked under the voices as in the game).
// Prints the measurements of every part (numbers only; they do not say how it sounds).
import { writeFileSync, mkdirSync, symlinkSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN, dialog } from './scenes.mjs';
import { measure, slice } from './measure.mjs';
import { renderBank, levelBank, encodeBank } from './build-banks.mjs';
import { makeVoice } from '../../src/engine/voice.js';

const [OUT, OLD] = process.argv.slice(2);
if (!OUT || !OLD) { console.error('usage: listen.mjs <out dir> <old lba3 root>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;

// Oren exists on the expansion branch only: his voice here, for the sampler (to be added to VOICES there)
export const OREN = { race: 'quetch', seed: 1201, f0: 150, k: 1.02, contour: 'flat', range: 3, rate: 0.78, legato: 0.92, breath: 0.05, tilt: 2.0, vib: [4.4, 6], glide: 0.07, jit: 0.15, cons: 'lnmvw', vow: 'oaeu', ask: 'high', sex: 'm' };
// a root for the sampler: the game's sources and banks, plus a bank for Oren
const SAMP = join(OUT, '.sampler-root');
rmSync(SAMP, { recursive: true, force: true });
mkdirSync(join(SAMP, 'assets', 'voice'), { recursive: true });
symlinkSync(join(LBA3, 'src'), join(SAMP, 'src'));
for (const f of readdirSync(join(LBA3, 'assets', 'voice'))) if (f.endsWith('.ogg')) symlinkSync(join(LBA3, 'assets', 'voice', f), join(SAMP, 'assets', 'voice', f));
{
  const man = JSON.parse(readFileSync(join(LBA3, 'assets', 'voice', 'manifest.json'), 'utf8'));
  const b = renderBank('oren', makeVoice(OREN, 'oren')); levelBank(b.pcm);
  man.banks.oren = encodeBank('oren', b, join(SAMP, 'assets', 'voice'));
  writeFileSync(join(SAMP, 'assets', 'voice', 'manifest.json'), JSON.stringify(man));
}

const R = await openRenderer({ roots: { game: LBA3, old: OLD, samp: SAMP } });
const mp3 = (name, data) => {
  const raw = join(OUT, '.' + name + '.f32');
  writeFileSync(raw, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw, '-c:a', 'libmp3lame', '-q:a', '2', join(OUT, name)]);
  rmSync(raw);
};
// loudness of a piece: EBU R128 integrated (LUFS) and true peak (dBFS), by ffmpeg
const ebu = (data) => {
  const raw = join(OUT, '.l.f32');
  writeFileSync(raw, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  const r = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -f f32le -ar ${SR} -ac 1 -i '${raw}' -af ebur128=peak=true -f null - 2>&1`], { encoding: 'utf8' });
  rmSync(raw);
  const I = r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0], P = r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0];
  return { lufs: +I, truePeak: +P };
};
// N soft tones (523 Hz, 0.12 s, soft edges, about -26 dBFS), then silence
const tones = (n) => {
  const one = 0.12, gap = 0.16, out = new Float32Array(Math.round((n * (one + gap) + 0.6) * SR));
  for (let k = 0; k < n; k++) {
    const s0 = Math.round(k * (one + gap) * SR), L = Math.round(one * SR);
    for (let i = 0; i < L; i++) out[s0 + i] = 0.05 * Math.sin((2 * Math.PI * 523.25 * i) / SR) * Math.pow(Math.sin((Math.PI * i) / L), 2);
  }
  return out;
};
const cat = (parts) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Float32Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };
const sil = (s) => new Float32Array(Math.round(s * SR));
const report = {};
const turnsOf = (scene, r) => scene.turns.filter((t) => t.key).map((t) => { const nx = scene.turns[scene.turns.indexOf(t) + 1]; return slice(r.voice, r.sr, t.at, nx ? nx.at : scene.len); });
const summary = (scene, r) => {
  const rows = turnsOf(scene, r).map((x) => measure(x, r.sr));
  const avg = (k) => +(rows.reduce((a, x) => a + x[k], 0) / rows.length).toFixed(2);
  return { ...ebu(r.voice), modDb: avg('modDb'), dipMedianDb: avg('dipMedianDb'), deepJoins: avg('deepJoins'), ioiCv: avg('ioiCv'), stepSt: avg('stepSt'), above3k: avg('above3k'), centroidHz: Math.round(avg('centroidHz')), clickCrestMax: Math.max(...rows.map((x) => x.clickCrest)), maxJump: Math.max(...rows.map((x) => x.maxJump)), voiceSecOverTyping: null, renderMs: Math.round(r.ms) };
};

// ---------------------------------------------------------------- 1. A/B: Twinsen and Zoé at home
{
  const parts = [], meas = {};
  const variants = [
    ['A classic (before)', { root: 'old', style: 'classic', opts: { pres: 3 } }],
    ['B soft (the reference the user preferred)', { root: 'old', style: 'soft', opts: { pres: 0 } }],
    ['C1 phrases (pre-rendered)', { root: 'game', opts: { presFromStyle: true } }],
    ['C2 phrase synthesis (live)', { root: 'game', opts: { presFromStyle: true }, banks: false }],
  ];
  for (let i = 0; i < variants.length; i++) {
    const [name, cfg] = variants[i];
    const r = await R.render({ scene: HOME, ...cfg });
    parts.push(tones(i + 1), r.voice, sil(0.8));
    meas[name] = summary(HOME, r);
  }
  mp3('1-AB-twinsen-zoe.mp3', cat(parts));
  report.AB = meas;
}

// ---------------------------------------------------------------- 2. the cast sampler
{
  const Q = 'Is everything all right?';
  const cast = [['hero', 'Twinsen'], ['zoe', 'Zoé'], ['arthur', 'Arthur'], ['baldino', 'Baldino'], ['vesk', 'Vesk'], ['sendell', 'Sendell'], ['oren', 'Oren'], ['farmer1', 'Farmer Joss (resident, Quetch man family)'], ['pippa', 'Pippa (resident, Rabbibunny woman family)']];
  const lines = cast.map(([id]) => [id, Q]);
  lines.push(['zoe', "The tap's stopped again..."], ['zoe', "Oh good, it's working again!"]);
  // each line its own dialogue box, a short beat between
  const scene = dialog(lines.map(([id, s], i) => [i % 2 ? id : id, s]), { gap: 0.5 });
  // (each a new box: a new speaker every time, the two Zoé lines too)
  scene.turns.forEach((t) => { t.say = true; });
  const r = await R.render({ root: 'samp', scene, opts: { presFromStyle: true }, inject: { oren: OREN } });
  mp3('2-cast-sampler.mp3', r.voice);
  const rows = turnsOf(scene, r).map((x, i) => ({ who: lines[i][0], line: lines[i][1], ...measure(x, r.sr) }));
  report.sampler = { ...ebu(r.voice), order: rows.map((x) => `${x.who}: ${x.line}`), perSpeaker: rows.map((x) => ({ who: x.who, f0: x.f0, rmsDb: x.rmsDb, peakDb: x.peakDb, modDb: x.modDb, centroidHz: x.centroidHz })), played: r.played };
}

// ---------------------------------------------------------------- 3. a long conversation, over the music
{
  const shift = (sc, dt) => sc.turns.map((t) => ({ ...t, at: +(t.at + dt).toFixed(3), end: t.end != null ? t.end + dt : undefined }));
  const t1 = HOME.len + 0.6, t2 = t1 + WELL.len + 0.6;
  const scene = { len: +(t2 + DORAN.len).toFixed(2), turns: [...shift(HOME, 0), ...shift(WELL, t1), ...shift(DORAN, t2)] };
  const r = await R.render({ scene, opts: { presFromStyle: true }, music: 'home.mp3' });
  mp3('3-long-conversation.mp3', r.mix);
  const ids = r.played.map((x) => x.split(':').slice(0, 2).join(':'));
  let immediate = 0; const seen = {};
  ids.forEach((x, i) => { seen[x] = (seen[x] || 0) + 1; if (i && ids[i - 1] === x) immediate++; });
  report.long = { seconds: scene.len, lines: scene.turns.filter((t) => t.key).length, voice: ebu(r.voice), mix: ebu(r.mix), clipsPlayed: ids.length, distinctClips: Object.keys(seen).length, usedMoreThanOnce: Object.entries(seen).filter(([, n]) => n > 1), immediateRepeats: immediate, maxVoicesAlive: Math.max(...r.log.map((x) => x[2])), maxUtterancesActive: Math.max(...r.log.map((x) => x[3])) };
  // the music alone at its in-game level, ducked, for the voice-to-music balance
  const m = await R.render({ scene, opts: { voiceVol: 0 }, music: 'home.mp3' });   // (the voices silent: the music ducks the same)
  report.long.musicDuckedAlone = ebu(m.mix);
}
await R.close();
rmSync(SAMP, { recursive: true, force: true });
writeFileSync(join(OUT, '.measurements.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
