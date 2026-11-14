// VOICE-2 (the user, 14.11: "the voices resemble English, but sound monotonous, robotic and excessively deep; they
// lack expression and natural phrasing"): listening files and measurements through the game's own playback (the
// Babble of src/engine/voice.js driven like the dialogue box by tools/voice-render/scene.js, the voice bus as in the
// game, an OfflineAudioContext at 48 kHz).
//
//   node tools/voice-render/v2.mjs diag <out dir> [mode ...]     five speakers x (statement, question, warning, warm)
//   node tools/voice-render/v2.mjs ab <out dir> [mode ...]       Twinsen and Zoé: greeting, curious question, worried
//                                                                observation, urgent warning, warm/amused reply
//   node tools/voice-render/v2.mjs cast <out dir> [mode]         the cast sampler: one question by several speakers,
//                                                                then one speaker in two moods
//   node tools/voice-render/v2.mjs talk <out dir> [mode ...]     the chapter-1 conversation over its music (> 1 min)
//
// Modes: classic (the Piper phrase banks of VOICES-PIPER), words (P18's letters on the formant synthesiser, as it was
// on 14.11, setVoiceWordsLegacy), words2 (the Words synthesis after VOICE-2), expressive (VOICE-2's new phrase banks).
// Every file is written as a small mono MP3 (22.05 kHz) and every line measured (measurements-<stage>.json).
// Numbers only: none of them says how a voice sounds to a person. Automated runtime only; nothing listened to.
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN, dialog } from './scenes.mjs';
import { measure, envelope, prosody, balance, contrast } from './measure.mjs';

const [STAGE, OUT, ...MODES_ARG] = process.argv.slice(2);
if (!STAGE || !OUT) { console.error('usage: v2.mjs diag|ab|cast|talk <out dir> [mode ...]'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const SR = 48000;
const MODES = {
  classic: { mode: 'classic' },
  words: { mode: 'words', engine: 'render', legacy: true },
  words2: { mode: 'words', engine: 'render' },
  expressive: { mode: 'expressive' },
};
const want = MODES_ARG.length ? MODES_ARG : STAGE === 'diag' ? ['classic', 'words'] : ['words', 'expressive'];

const raw = (name, data) => { const p = join(OUT, name); writeFileSync(p, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); return p; };
const enc = (name, data, args) => { const p = raw('.' + name + '.f32', data); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, ...args, join(OUT, name)]); rmSync(p); };
export const mp3 = (name, data, q = 5) => enc(name, data, ['-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-q:a', String(q)]);
const ebu = (data) => {
  const p = raw('.l.f32', data);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  rmSync(p);
  return { lufs: +r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0], truePeak: +r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0] };
};
// a turn's sound: where it starts and ends (5 ms frames within 40 dB of its loudest)
function sound(x, sr) {
  const env = envelope(x, sr), mx = Math.max(1e-9, ...env), q = mx * Math.pow(10, -40 / 20);
  const a = Math.max(0, env.findIndex((e) => e > q)); let b = env.length - 1; while (b > 0 && env[b] <= q) b--;
  return { start: a * 0.005, end: (b + 1) * 0.005 };
}
const turnsOf = (scene, r) => scene.turns.filter((t) => t.key).map((t) => { const nx = scene.turns[scene.turns.indexOf(t) + 1]; const a = Math.floor(t.at * r.sr), b = Math.floor((nx ? nx.at : scene.len) * r.sr); return { t, x: r.voice.subarray(a, b) }; });
// a speaker's lines for listening: each turn from its first sound to 0.25 s after its last, `gap` s apart
function trimmed(parts0, gap = 0.6) {
  const parts = [];
  for (const x of parts0) { const s = sound(x, SR); parts.push(x.subarray(Math.max(0, Math.floor((s.start - 0.05) * SR)), Math.min(x.length, Math.floor((s.end + 0.25) * SR))), new Float32Array(Math.floor(gap * SR))); }
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
// every measure of one line (the voice alone, after the bus)
function lineRow(t, x) {
  const s = sound(x, SR), seg = x.subarray(Math.floor(s.start * SR), Math.ceil(s.end * SR));
  const M = measure(seg, SR), P = prosody(seg, SR), Bl = balance(seg, SR), C = contrast(seg, SR);
  const dur = s.end - s.start;
  return {
    text: t.text, intent: t.label || null, voiceSec: +dur.toFixed(2), typingSec: +(t.text.length / 50).toFixed(2), subtitleSec: t.d ?? null,
    f0Med: P.f0Med, f0P5: P.f0P5, f0P95: P.f0P95, rangeSt90: P.rangeSt90, pitchSdSt: P.pitchSdSt, endSt: P.endSt,
    voicedShare: +((P.voicedFrames * 0.01) / Math.max(0.01, dur)).toFixed(2),
    sylIoiCv: M.ioiCv, sylIoiMs: M.ioiMs, peakSdDb: C.peakSdDb, joinDipDb: M.dipMedianDb, deepJoins: M.deepJoins, modDb: M.modDb, pauses: M.pauses,
    tiltDbOct: Bl.tiltDbOct, centroidHz: Bl.centroid, lowShare: Bl.lowShare, highShare: Bl.highShare,
    peakDb: M.peakDb, rmsDb: M.rmsDb, clickCrest: M.clickCrest, track: P.track,
  };
}
const R = await openRenderer({ roots: { game: LBA3 } });
const render = (scene, m, extra = {}) => R.render({ scene, opts: { presFromStyle: true, ...(extra.opts || {}) }, ...MODES[m], music: extra.music || null });
const report = { note: 'Automated runtime only; nothing listened to. Headless Chromium, OfflineAudioContext at 48 kHz, the game\'s voice bus.', stage: STAGE, modes: want, rows: {} };

// ---------------------------------------------------------------- the lines (the game's own English text)
// [label, line key (voicemeta.js), text]
const DIAG = {
  twinsen: ['hero', [['statement', 'op_tw_1', 'I fixed that yesterday.'], ['question', 'c1_tw_tour2', 'The shell? What shell?'],
    ['warning', 'c1_tw_radio', "Baldino! Vesk took the beam up to his ship. He's flying to Zeelich. His drill is pressing on the shell!"], ['warm', 'c1_tw_tour1b', 'People like them. Zoé is already planning a hot bath.']]],
  zoe: ['zoe', [['statement', 'c1_zoe_locker1', 'Delivery forms. And a very old sandwich.'], ['question', 'c2_zoe_in', 'The lighthouse. Baldino said three dials, then the microphone. What was the order again?'],
    ['warning', 'c1_zoe_wait', 'Whatever Vesk tells you about the water, watch his face.'], ['warm', 'ep_zoe_3', 'Sit. Eat. Then tell us everything. Slowly.']]],
  arthur: ['arthur', [['statement', 'c1_ar_home2', 'Fixing, fixing... I never get to see anything interesting.'], ['question', 'c1_ar_after', 'When you get back, will you tell me what space looks like?'],
    ['warning', 'c10_ar_wrong', 'The needle is jumping. Not that one!'], ['warm', 'c1_ar_radio2', 'I fixed the radio! Me! That counts as helping, right?']]],
  vesk: ['vesk', [['statement', 'dt_vesk_1', 'Clean cut. The ground is settling after the stop. Log it, Dallan.'], ['question', 'c2_vesk_1', 'Twinsen. I knew Baldino would send you. And that broadcast from the Citadel lighthouse, was that you as well?'],
    ['warning', 'dp_vesk_over', 'Get away from my console!'], ['warm', 'co_vesk_up_helped', 'You pulled me out of that. And the lane holds without my line.']]],
  'joss-npc': ['farmer1', [['statement', 'idle_farmer1_home', "The goats are back in their field. They won't look at the lighthouse. Can't blame them."], ['question', 'ro_gone_0', 'Did you see the light over the old fortress?'],
    ['warning', 'c10_hesk_land', 'Down we go. Mind the step.'], ['warm', 'dt_bye', "Thanks. Now off my pad. I've a log to write."]]],
};
// the brief's point 9: Twinsen and Zoé, the same five situations each
const AB = {
  twinsen: ['hero', [['greeting', 'l_tw_hi', 'Morning, Gilbert. Any water yet?'], ['curious', 'c1_tw_tour2', 'The shell? What shell?'],
    ['worried', 'c1_tw_tour1', 'But the crystals in your pipes are just like the ones at the bottom of the well.'], ['urgent', 'c1_tw_radio', "Baldino! Vesk took the beam up to his ship. He's flying to Zeelich. His drill is pressing on the shell!"],
    ['warm', 'c1_tw_tour1b', 'People like them. Zoé is already planning a hot bath.']]],
  zoe: ['zoe', [['greeting', 'c1_zoe_home1', 'There you are! You climbed into the well and vanished. What did you find?'], ['curious', 'c2_zoe_in', 'The lighthouse. Baldino said three dials, then the microphone. What was the order again?'],
    ['worried', 'prh_zoe_1', 'Dry again. But listen. Something is still knocking in there.'], ['urgent', 'c1_conf_zoe1', 'Vesk! "Ship capacity: 30%"? What about everyone else?'],
    ['warm', 'ep_zoe_3', 'Sit. Eat. Then tell us everything. Slowly.']]],
};

async function perSpeaker(set, tag) {
  for (const [who, [id, lines]] of Object.entries(set)) {
    const scene = dialog(lines.map(([, , text]) => [id, text]), { gap: 0.5 });
    scene.turns.forEach((t, i) => { t.say = true; if (lines[i]) { t.label = lines[i][0]; t.lineKey = lines[i][1]; } });
    report.rows[who] = {};
    for (const m of want) {
      const r = await render(scene, m);
      const turns = turnsOf(scene, r);
      mp3(`${who}-${tag}-${m}.mp3`, trimmed(turns.map((u) => u.x)));
      report.rows[who][m] = { ebu: ebu(trimmed(turns.map((u) => u.x), 0.3)), lines: turns.map(({ t, x }) => lineRow(t, x)), ms: Math.round(r.ms) };
      process.stdout.write(`${who} ${m} done\n`);
    }
  }
}

if (STAGE === 'diag') await perSpeaker(DIAG, 'diag');
if (STAGE === 'ab') await perSpeaker(AB, 'ab');
if (STAGE === 'cast') {
  // one simple question by several speakers, then one speaker asking it worried and pleased
  const Q = 'Have you seen the pump?';
  const who = ['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'sendell', 'gilbert', 'mira', 'doran', 'farmer1', 'nara', 'councilC', 'tilde'];
  const m = want[0];
  const scene = dialog(who.map((id) => [id, Q]), { gap: 0.4 });
  scene.turns.forEach((t) => { t.say = true; });
  const r = await render(scene, m);
  const turns = turnsOf(scene, r);
  const s2 = dialog([['zoe', 'The pump is broken again...'], ['zoe', 'The pump works again! Well done.']], { gap: 0.4 });
  s2.turns.forEach((t) => { t.say = true; });
  const r2 = await render(s2, m);
  const t2 = turnsOf(s2, r2);
  mp3(`cast-sampler-${m}.mp3`, trimmed([...turns.map((u) => u.x), ...t2.map((u) => u.x)], 0.5));
  report.rows.cast = { [m]: { lines: [...turns, ...t2].map(({ t, x }) => ({ who: t.key, ...lineRow(t, x) })) } };
}
if (STAGE === 'talk') {
  const shift = (sc, dt) => sc.turns.map((t) => ({ ...t, at: +(t.at + dt).toFixed(3), end: t.end != null ? t.end + dt : undefined }));
  const t1 = HOME.len + 0.6, t2 = t1 + WELL.len + 0.6;
  const scene = { len: +(t2 + DORAN.len).toFixed(2), turns: [...shift(HOME, 0), ...shift(WELL, t1), ...shift(DORAN, t2)] };
  report.conversation = { seconds: scene.len, lines: scene.turns.filter((t) => t.key).length };
  for (const m of want) {
    const r = await render(scene, m, { music: 'home.mp3' });
    mp3(`conversation-${m}.mp3`, r.mix, 6);
    const rows = turnsOf(scene, r).map(({ t, x }) => ({ who: t.key, ...lineRow(t, x) }));
    report.conversation[m] = { voice: ebu(r.voice), mix: ebu(r.mix), rows, played: r.played?.slice(-64) };
  }
}
await R.close();
// (the pitch tracks are kept in the JSON for the pictures, rounded)
writeFileSync(join(OUT, `measurements-${STAGE}.json`), JSON.stringify(report));
// a summary table on stdout
const summ = (rows) => rows.map((x) => `${(x.intent || x.who || '').padEnd(10)} f0 ${String(x.f0Med).padStart(3)} (${x.f0P5}-${x.f0P95}) rng ${String(x.rangeSt90).padStart(4)} sd ${x.pitchSdSt} end ${x.endSt} | ioiCv ${x.sylIoiCv} pkSd ${x.peakSdDb} join ${x.joinDipDb} deep ${x.deepJoins} voiced ${x.voicedShare} | tilt ${x.tiltDbOct} cen ${x.centroidHz} low ${x.lowShare} hi ${x.highShare} | pk ${x.peakDb} click ${x.clickCrest} | ${x.voiceSec}s / type ${x.typingSec}s`).join('\n');
for (const [who, byMode] of Object.entries(report.rows)) for (const [m, d] of Object.entries(byMode)) console.log(`== ${who} ${m} ${d.ebu ? `${d.ebu.lufs} LUFS tp ${d.ebu.truePeak}` : ''}\n${summ(d.lines)}`);
if (report.conversation) for (const m of want) { const c = report.conversation[m]; console.log(`== conversation ${m}: voice ${c.voice.lufs} LUFS tp ${c.voice.truePeak}, mix ${c.mix.lufs} tp ${c.mix.truePeak}\n${summ(c.rows)}`); }
