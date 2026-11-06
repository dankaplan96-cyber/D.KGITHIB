// Diagnosis of a voice version: renders the three chapter-1 conversations (tools/voice-render/scenes.mjs) and measures
// each turn's voice: how many syllables were started, how long the voice runs against the text's typing time, the
// dips between syllables, the rhythm, pauses, pitch jumps, spectral balance, peaks and discontinuities.
//   node tools/voice-render/diagnose.mjs <root dir with src/engine/voice.js> <style|-> [out.json]
//   (NOBANKS=1: the synthesis alone, without the pre-rendered phrases)
import { writeFileSync } from 'node:fs';
import { openRenderer, LBA3 } from './render.mjs';
import { HOME, WELL, DORAN } from './scenes.mjs';
import { measure, slice, envelope } from './measure.mjs';

const [root = LBA3, style = '-', outFile] = process.argv.slice(2);
const R = await openRenderer({ roots: { game: LBA3, v: root } });
const res = {};
for (const [name, scene] of Object.entries({ HOME, WELL, DORAN })) {
  const r = await R.render({ root: 'v', style: style === '-' ? null : style, scene, opts: { presFromStyle: true }, banks: process.env.NOBANKS ? false : null });
  const turns = scene.turns.filter((t) => t.key);
  const rows = turns.map((t) => {
    const next = scene.turns[scene.turns.indexOf(t) + 1];
    const seg = slice(r.voice, r.sr, t.at, next ? next.at : scene.len);
    // how long the voice runs: first to last envelope frame within 40 dB of the turn's loudest
    const env = envelope(seg, r.sr); const mx = Math.max(1e-9, ...env); let last = 0, first = -1;
    env.forEach((x, k) => { if (x > mx * 0.01) { last = k; if (first < 0) first = k; } });
    const typing = t.mode === 'cine' ? t.text.length / Math.min(50, Math.max(28, t.text.length / (t.d * 0.8))) : t.text.length / 50;
    return { who: t.key.slice(2), text: t.text, chars: t.text.length, typingS: +typing.toFixed(2), voiceS: +(((last - first) * 5) / 1000).toFixed(2), ...measure(seg, r.sr) };
  });
  const maxLive = Math.max(...r.log.map((x) => x[2]));
  res[name] = { syllablesStarted: r.count, maxLive, rows };
}
await R.close();
if (outFile) writeFileSync(outFile, JSON.stringify(res, null, 1));
for (const [n, s] of Object.entries(res)) {
  console.log(`== ${n}: syllables started ${s.syllablesStarted}, max tone sources alive ${s.maxLive}`);
  for (const r of s.rows) console.log(`${r.who.padEnd(8)} ${String(r.chars).padStart(3)}ch type ${r.typingS}s voice ${r.voiceS}s | peaks ${r.peaks} ioi ${r.ioiMs}ms cv ${r.ioiCv} | mod ${r.modDb}dB dip ${r.dipMedianDb}dB deep ${r.deepJoins} | pauses ${r.pauses} (${r.pauseMedianMs}ms) | f0 ${r.f0} jumps/s ${r.jumpsPerSec} step ${r.stepSt}st | >3k ${r.above3k} >5k ${r.above5k} cen ${r.centroidHz} | pk ${r.peakDb} rms ${r.rmsDb} crest ${r.clickCrest} jmp ${r.maxJump}`);
}
