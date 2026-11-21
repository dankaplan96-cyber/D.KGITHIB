// VOICE-2: markdown tables from v2.mjs's measurements (medians over a mode's lines, per speaker and over all).
//   node tools/voice-render/v2-table.mjs <measurements.json> [...]
import { readFileSync } from 'node:fs';
const med = (a) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const max = (a) => Math.max(...a.filter((x) => Number.isFinite(x)));
const cols = [['f0 Hz', 'f0Med'], ['range st (5-95)', 'rangeSt90'], ['pitch sd st', 'pitchSdSt'], ['end st', 'endSt'], ['syll. timing CV', 'sylIoiCv'], ['syll. loudness sd dB', 'peakSdDb'], ['join dip dB', 'joinDipDb'],
  ['voiced', 'voicedShare'], ['tilt dB/oct', 'tiltDbOct'], ['centroid Hz', 'centroidHz'], ['< 250 Hz', 'lowShare'], ['> 3 kHz', 'highShare'], ['voice s / typing s', null]];
const all = {};
for (const f of process.argv.slice(2)) {
  const R = JSON.parse(readFileSync(f, 'utf8'));
  const rows = R.rows || {};
  if (R.conversation) for (const m of R.modes) rows['conversation'] = { ...(rows.conversation || {}), [m]: { lines: R.conversation[m].rows, ebu: R.conversation[m].voice } };
  for (const [who, byMode] of Object.entries(rows)) for (const [m, d] of Object.entries(byMode)) {
    (all[m] ??= []).push(...d.lines);
    console.log(`\n**${who}, ${m}**${d.ebu ? ` (${d.ebu.lufs} LUFS, true peak ${d.ebu.truePeak} dBFS)` : ''}\n`);
    console.log('| line | ' + cols.map((c) => c[0]).join(' | ') + ' | click crest |');
    console.log('|' + '---|'.repeat(cols.length + 2));
    for (const x of d.lines) console.log(`| ${x.intent || x.who || ''} | ` + cols.map(([, k]) => (k ? x[k] : `${x.voiceSec} / ${x.typingSec}`)).join(' | ') + ` | ${x.clickCrest} |`);
  }
}
console.log('\n**Medians over all lines**\n');
console.log('| mode | lines | ' + cols.slice(0, -1).map((c) => c[0]).join(' | ') + ' | voice / typing | max click crest |');
console.log('|' + '---|'.repeat(cols.length + 3));
for (const [m, L] of Object.entries(all)) console.log(`| ${m} | ${L.length} | ` + cols.slice(0, -1).map(([, k]) => med(L.map((x) => x[k]))).join(' | ') + ` | ${med(L.map((x) => x.voiceSec / Math.max(0.3, x.typingSec))).toFixed(2)} | ${max(L.map((x) => x.clickCrest))} |`);
