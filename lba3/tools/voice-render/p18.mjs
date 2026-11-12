// P18-VOICES: the Words voices against the classic ones, through the game's own playback (the Babble of
// src/engine/voice.js driven like the dialogue box by tools/voice-render/scene.js, the voice bus as in the game).
//   node tools/voice-render/p18.mjs <out dir>            (captures/p18 for the files the user listens to)
// Writes, per speaker, <who>-classic.wav and <who>-words.wav (the same two lines, the same timing), a few of the
// rejected candidate (<who>-words-chain.wav: Words lines on the live synthesis chain), spectrogram pictures, the
// chapter-1 conversation over its music in both modes (conversation-*.mp3, over a minute), and measurements.json:
// peak and RMS, the joins between syllables (dB, as VOICE-PHRASE measured them), the voiced share, the line's length
// against the typing and against the classic line, the cost of a render. Numbers only: none says how a voice sounds.
import { writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN, dialog } from './scenes.mjs';
import { measure, envelope } from './measure.mjs';

const [OUT] = process.argv.slice(2);
if (!OUT) { console.error('usage: p18.mjs <out dir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const R = await openRenderer({ roots: { game: LBA3 } });
const raw = (name, data) => { const p = join(OUT, name); writeFileSync(p, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); return p; };
const enc = (name, data, args) => { const p = raw('.' + name + '.f32', data); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, ...args, join(OUT, name)]); rmSync(p); };
const wav = (name, data) => enc(name, data, ['-ar', '22050', '-c:a', 'pcm_s16le']);
const mp3 = (name, data) => enc(name, data, ['-c:a', 'libmp3lame', '-q:a', '6']);
// (the whole 0-11 kHz: its zoom option, stop=8000, drew a mirrored band near 1.4 kHz that is not in the audio)
const spectro = (name, wavName) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, wavName), '-lavfi', 'showspectrumpic=s=640x240:legend=1:color=intensity,format=pal8', join(OUT, name)]);
// a speaker's lines for listening: each turn from its first sound to 0.25 s after its last, 0.6 s apart (the reading
// time between the dialogue boxes left out: the files stay small)
function trimmed(scene, r) {
  const parts = [];
  for (const { x } of turnsOf(scene, r)) { const s = sound(x, r.sr); parts.push(x.subarray(Math.max(0, Math.floor((s.start - 0.05) * r.sr)), Math.min(x.length, Math.floor((s.end + 0.25) * r.sr))), new Float32Array(Math.floor(0.6 * r.sr))); }
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const ebu = (data) => {
  const p = raw('.l.f32', data);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  rmSync(p);
  return { lufs: +r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0], truePeak: +r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0] };
};
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200);
// a turn's sound: where it starts and ends (5 ms frames within 40 dB of its loudest), the voiced share of that time
function sound(x, sr) {
  const env = envelope(x, sr), mx = Math.max(1e-9, ...env), q = mx * Math.pow(10, -40 / 20);
  let a = env.findIndex((e) => e > q), b = env.length - 1; while (b > 0 && env[b] <= q) b--;
  return { start: a * 0.005, end: (b + 1) * 0.005 };
}
const turnsOf = (scene, r) => scene.turns.filter((t) => t.key).map((t) => { const nx = scene.turns[scene.turns.indexOf(t) + 1]; const a = Math.floor(t.at * r.sr), b = Math.floor((nx ? nx.at : scene.len) * r.sr); return { t, x: r.voice.subarray(a, b) }; });
const MODES = { classic: { mode: 'classic' }, words: { mode: 'words', engine: 'render' }, chain: { mode: 'words', engine: 'chain' } };

// ---------------------------------------------------------------- the speakers' lines (the game's own English text)
const SPEAKERS = {
  twinsen: ['hero', ['I fixed that yesterday.', "Next door's kettle furred up with these since breakfast. Pipes don't do that."]],
  zoe: ['zoe', ["Twinsen. The tap's stopped again.", "That's warm. It's never warm."]],
  arthur: ['arthur', ['Dad, can I fix the next radio too?', "Dad? Dad! It's Arthur. Mum's busy. Everyone's busy!"]],
  'joss-quetch-resident': ['farmer1', ["The goats are back in their field. They won't look at the lighthouse. Can't blame them."]],
  'nara-esmer': ['nara', ['Need anything?', "Esmer goods. That pistol came off the shuttle yard's bench: it runs on a crystal cell, or on your own magic if it has to."]],
};
const report = { note: 'Automated runtime only; nothing listened to (SwiftShader / headless Chromium, OfflineAudioContext at 48 kHz, the game\'s voice bus).', lines: [], speakers: {} };
for (const [who, [id, lines]] of Object.entries(SPEAKERS)) {
  const scene = dialog(lines.map((l) => [id, l]), { gap: 0.5 });
  scene.turns.forEach((t) => { t.say = true; });
  const S = report.speakers[who] = {};
  for (const [m, o] of Object.entries(MODES)) {
    const r = await R.render({ scene, opts: { presFromStyle: true }, ...o });
    if (m !== 'chain' || who === 'twinsen' || who === 'zoe') { wav(`${who}-${m === 'chain' ? 'words-chain' : m}.wav`, trimmed(scene, r)); }
    const rows = turnsOf(scene, r).map(({ t, x }) => {
      const M = measure(x, r.sr), s = sound(x, r.sr);
      return { text: t.text, typingSec: +(t.text.length / 50).toFixed(2), voiceSec: +(s.end - s.start).toFixed(2), ...M, voicedShare: +(M.voicedSec / Math.max(0.01, s.end - s.start)).toFixed(2) };
    });
    S[m] = { ebu: ebu(r.voice), rows, syllables: r.count, renderMs: Math.round(r.ms) };
  }
  for (const m of ['classic', 'words']) spectro(`${who}-${m}.png`, `${who}-${m}.wav`);
}

// ---------------------------------------------------------------- the chapter-1 conversation (over a minute), both modes
{
  const shift = (sc, dt) => sc.turns.map((t) => ({ ...t, at: +(t.at + dt).toFixed(3), end: t.end != null ? t.end + dt : undefined }));
  const t1 = HOME.len + 0.6, t2 = t1 + WELL.len + 0.6;
  const scene = { len: +(t2 + DORAN.len).toFixed(2), turns: [...shift(HOME, 0), ...shift(WELL, t1), ...shift(DORAN, t2)] };
  report.conversation = { seconds: scene.len, lines: scene.turns.filter((t) => t.key).length };
  for (const m of ['classic', 'words']) {
    const r = await R.render({ scene, opts: { presFromStyle: true }, music: 'home.mp3', ...MODES[m] });
    mp3(`conversation-${m}.mp3`, r.mix);
    const rows = turnsOf(scene, r).map(({ t, x }) => ({ who: t.key, ...measure(x, r.sr), ...sound(x, r.sr) }));
    report.conversation[m] = { voice: ebu(r.voice), mix: ebu(r.mix), peakDbMax: Math.max(...rows.map((x) => x.peakDb)), clickCrestMax: Math.max(...rows.map((x) => x.clickCrest ?? 0)), maxJump: Math.max(...rows.map((x) => x.maxJump ?? 0)) };
  }
}

// ---------------------------------------------------------------- in the page: the plans (words vs classic length over the
// game's whole English text), what the letters became, the cost of a render (main thread, and a worker's round trip)
const texts = [];
for (const f of readdirSync(join(LBA3, 'src/game/text'))) {
  const s = readFileSync(join(LBA3, 'src/game/text', f), 'utf8');
  for (const m of s.matchAll(/\b[a-z][a-zA-Z0-9_]*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    const t = (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
    if (/[A-Za-z]{3}/.test(t) && !/[\u0590-\u05ff]/.test(t) && !/[{}<>]/.test(t) && t.length > 3) texts.push(t);
  }
}
report.page = await R.page.evaluate(async (texts) => {
  const V = await import('http://voice.local/game/src/engine/voice.js');
  const P = await import('http://voice.local/game/src/engine/voiceplan.js');
  const W = await import('http://voice.local/game/src/engine/voicewords.js');
  const Y = await import('http://voice.local/game/src/engine/voicesynth.js');
  V.voiceBanks('http://voice.local/game/assets/voice/');
  V.setVoiceMode('words');
  const B = new V.Babble({ ctx: null, vol: { voice: 0.8 } });
  await B.prepare(['n_hero'], { wait: true });   // (the manifest: the banked speakers' pitch and pace)
  const out = { corpus: {}, cost: {} };
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))].toFixed(2); };
  for (const id of ['hero', 'zoe', 'arthur', 'farmer1', 'nara', 'vesk', 'sendell', 'baldino']) {
    const v0 = V.voiceFor('n_' + id), v = V.wordsVoice(v0);
    const ratio = [], vsType = [], cvsType = [], spoken = [], planMs = [];
    for (const t of texts) {
      const t0 = performance.now();
      const w = V.planVoiceLine(v0, t);
      planMs.push(performance.now() - t0);
      const c = V.classicLength(v0, t);
      ratio.push(w.dur / c); vsType.push(w.dur / Math.max(0.3, t.length / 50)); cvsType.push(c / Math.max(0.3, t.length / 50));
      const all = W.clauseWords(t).reduce((a, x) => a + x.syl.length, 0) || 1;
      spoken.push(w.syl.filter((s) => !s.hum).length / all);
    }
    out.corpus[id] = { f0: v.f0, pace: +P.speech(v).pace.toFixed(2), lines: texts.length, wordsOverClassic: { p10: q(ratio, 0.1), median: q(ratio, 0.5), p90: q(ratio, 0.9), max: q(ratio, 1) },
      wordsOverTyping: { median: q(vsType, 0.5), p90: q(vsType, 0.9) }, classicOverTyping: { median: q(cvsType, 0.5), p90: q(cvsType, 0.9) }, writtenSyllablesSpoken: { median: q(spoken, 0.5), p10: q(spoken, 0.1) }, planMs: { median: q(planMs, 0.5), p99: q(planMs, 0.99) } };
  }
  // what the letters became: the text's phones, then the syllables Twinsen speaks
  const ex = 'Have you seen the pump?';
  const pl = P.planLine(V.wordsVoice(V.voiceFor('n_hero')), ex, { mode: 'words' });
  out.example = { text: ex, phones: W.phonesOf(ex), spoken: pl.syl.map((s) => [...s.on.map((c) => c[0]), s.vk + (s.vk2 ? '>' + s.vk2 : ''), ...s.co.map((c) => c[0])].join('')).join(' ') };
  // the letters kept: the share of the text's consonants spoken as written, and of its vowels (over the corpus, Twinsen)
  { const v = V.wordsVoice(V.voiceFor('n_hero')); let cK = 0, cN = 0;
    for (const t of texts.slice(0, 400)) { const pl2 = P.planLine(v, t, { mode: 'words' }); const ref = W.clauseWords(t).flatMap((x) => x.syl); let i = 0;
      for (const s of pl2.syl) { if (s.hum) continue; const r = ref[i++]; if (!r) break; r.on.forEach((c, j) => { cN++; if (s.on[j]?.[0] === c) cK++; }); } }
    out.consonantsAsWritten = +(cK / Math.max(1, cN)).toFixed(2); }
  // the cost of a render (warm, the median of five), main thread, at 48 kHz (the game's context rate)
  const lines = ['I fixed that yesterday.', "Next door's kettle furred up with these since breakfast. Pipes don't do that.", texts.reduce((a, b) => (b.length > a.length && b.length < 220 ? b : a), '')];
  for (const id of ['hero', 'zoe', 'sendell']) {
    const v = V.wordsVoice(V.voiceFor('n_' + id));
    for (const t of lines) {
      const pl2 = P.planLine(v, t, { mode: 'words' });
      const g = { syl: pl2.syl, leg: pl2.phrases[0].g.leg, breath: 1 }, o = { sr: 48000, seed: 1, lead: 0.02, tail: 0.15, cons: 0.5, words: true };
      const ms = []; let sec = 0;
      for (let k = 0; k < 6; k++) { const t0 = performance.now(); const pcm = Y.renderLine(v, g, o, 0.1); ms.push(performance.now() - t0); sec = pcm.length / 48000; }
      ms.shift();
      out.cost[`${id}: ${t.slice(0, 30)}`] = { sec: +sec.toFixed(2), ms: q(ms, 0.5), msPerSec: +(q(ms, 0.5) / sec).toFixed(2) };
    }
  }
  // the worker: a line's round trip (post, render, back)
  const wk = new Worker(URL.createObjectURL(new Blob([Y.workerSource()], { type: 'text/javascript' })));
  const v = V.wordsVoice(V.voiceFor('n_zoe')), pl3 = P.planLine(v, "Twinsen. The tap's stopped again.", { mode: 'words' });
  const job = { v: JSON.parse(JSON.stringify(v)), g: { syl: pl3.syl, leg: 0.9, breath: 1 }, o: { sr: 48000, seed: 1, lead: 0.02, tail: 0.15, cons: 0.5, words: true }, rms: 0.1 };
  const rt = [];
  for (let k = 0; k < 6; k++) { const t0 = performance.now(); await new Promise((res) => { wk.onmessage = res; wk.postMessage({ id: k, ...job }); }); rt.push(performance.now() - t0); }
  rt.shift(); wk.terminate();
  out.workerRoundTripMs = q(rt, 0.5);
  return out;
}, texts);
await R.close();
writeFileSync(join(OUT, 'measurements.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
