// VOICE-1 evidence: renders each main character's gibberish voice offline (OfflineAudioContext in headless
// Chromium, the game's own src/engine/voice.js driven like the dialogue box) to WAV files, measures them, and
// does the same for the previous voice.js (git HEAD~ or REF) as the A/B "before".
//   GAME_URL=http://localhost:8196/ node tools/voice-render.mjs [outDir]
// Writes <outDir>/<id>-after.wav, <id>-before.wav, measurements.json, measurements.csv. Our synthesis only.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || ROOT + 'docs/lba3-production/reviews/VOICE-1/';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const REF = process.env.REF || '';   // the "before" voice.js: a git revision, or none (no A/B)
mkdirSync(OUT, { recursive: true });

const LINE = 'Hello there! Have you seen the lighthouse keeper? The water gets warmer every day.';
// [id, who] — the five who must be unmistakable, then one or two of each race
const CAST = [
  ['hero', 'Twinsen (Quetch)'], ['zoe', 'Zoé (Quetch)'], ['arthur', 'Arthur (Quetch child)'], ['baldino', 'Baldino'], ['vesk', 'Vesk'],
  ['farmer1', 'Farmer Joss (Quetch villager)'], ['doran', 'Doran (Grobo)'], ['guard', 'Guard (Grobo)'], ['pippa', 'Pippa (Rabbibunny)'],
  ['mira', 'Mira (Rabbibunny)'], ['sphero1', 'Pom (Sphero)'], ['nara', 'Nara (Esmer)'], ['oku', 'Oku (Esmer)'], ['zbee1', 'Bzizz (Mosquibee)'],
  ['zmole1', 'Old Grumm (mole)'], ['zmole2', 'Mother Snuff (mole)'], ['joe', 'Joe the Elf'], ['ztri1', 'Mr Pelleck (Zeelich)'], ['sendell', 'Sendell'],
];
const AB = new Set(['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'doran', 'zbee1']);
const before = REF ? execSync(`git show ${REF}:lba2-remaster/src/engine/voice.js`, { cwd: ROOT }).toString() : null;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL0 + 'README.md');
const res = await page.evaluate(async ({ CAST, AB, LINE, before, base }) => {
  const lab = await import(new URL('tests/lib/voicelab.js', base).href);
  const now = await import(new URL('src/engine/voice.js', base).href);
  const old = before ? await import(URL.createObjectURL(new Blob([before], { type: 'text/javascript' }))) : null;
  const out = [];
  for (const [id, who] of CAST) {
    for (const [tag, mod] of [['after', now], ['before', old]]) {
      if (!mod || (tag === 'before' && !AB.includes(id))) continue;
      const r = await lab.render(mod, 'n_' + id, LINE);
      const m = lab.analyse(r.data, r.sr);
      out.push({ id, who, tag, syllables: r.syllables, ...m, f: lab.features(m), wav: lab.wavBase64(r.data, r.sr) });
    }
  }
  // the A/B sheet: spectrograms before | after, 0–6 kHz
  const ids = CAST.map((c) => c[0]).filter((id) => AB.includes(id));
  const W = 420, H = 110, cv = document.createElement('canvas');
  cv.width = 140 + 2 * W + 30; cv.height = 40 + ids.length * (H + 12);
  const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#eee'; g.font = '15px sans-serif';
  if (old) g.fillText('before (previous voice.js)', 140, 24);
  g.fillText('after (VOICE-1)  ·  0–6 kHz', 160 + W, 24);
  for (const [n, id] of ids.entries()) {
    const yy = 36 + n * (H + 12);
    g.fillStyle = '#eee'; g.fillText(CAST.find((c) => c[0] === id)[1].split(' (')[0], 10, yy + H / 2);
    for (const [col, mod] of [[0, old], [1, now]]) {
      if (!mod) continue;
      const r = await lab.render(mod, 'n_' + id, LINE);
      lab.spectrogram(g, r.data, r.sr, 140 + col * (W + 20), yy, W, H);
    }
  }
  cv.id = 'sheet'; document.body.innerHTML = ''; document.body.style.margin = '0'; document.body.appendChild(cv);
  // the music's level for the mix comparison: home.mp3 (first 60 s)
  let music = null;
  try {
    const ab = await (await fetch(new URL('assets/music/home.mp3', base))).arrayBuffer();
    const buf = await new OfflineAudioContext(1, 48000, 48000).decodeAudioData(ab);
    let e = 0, n = 0; const L = Math.min(buf.length, buf.sampleRate * 60);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < L; i++) { e += d[i] * d[i]; n++; } }
    music = +(20 * Math.log10(Math.sqrt(e / n))).toFixed(1);
  } catch (e) { music = String(e); }
  // audio nodes made per line (three lines of Twinsen's in a row): the pooled chains vs one set per syllable
  const nodes = { after: (await lab.render(now, 'n_hero', LINE, { lines: 3 })).nodes, before: old ? (await lab.render(old, 'n_hero', LINE, { lines: 3 })).nodes : null };
  const ctl = lab.analyse(lab.clickyControl(), 32000);
  return { nodes, music, out, control: { maxJump: ctl.maxJump, maxD2: ctl.maxD2, clickCrest: ctl.clickCrest }, names: lab.FEATURE_NAMES };
}, { CAST, AB: [...AB], LINE, before, base: URL0 });
await page.setViewportSize({ width: 1200, height: 1000 });
await page.locator('#sheet').screenshot({ path: OUT + 'spectrograms-before-after.jpg', type: 'jpeg', quality: 85 });
await browser.close();

const rows = [];
for (const r of res.out) {
  writeFileSync(`${OUT}${r.id}-${r.tag}.wav`, Buffer.from(r.wav, 'base64'));
  delete r.wav;
  rows.push(r);
}
// pairwise distances (feature units) within each set
const dist = (a, b) => Math.hypot(...a.f.map((x, i) => x - b.f[i]));
const pairs = (tag) => {
  const L = rows.filter((r) => r.tag === tag && (tag === 'after' || AB.has(r.id)));
  const P = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) P.push([L[i].id, L[j].id, +dist(L[i], L[j]).toFixed(2), L[i].f.filter((x, k) => Math.abs(x - L[j].f[k]) >= 1).length]);
  return P.sort((a, b) => a[2] - b[2]);
};
// in the game: voice bus 0.8 (default); music bus 0.55 (default), ducked to 0.55 under dialogue (music.js)
const mix = { musicHomeRmsDb: res.music, musicInDialogueDb: typeof res.music === 'number' ? +(res.music + 20 * Math.log10(0.55 * 0.55)).toFixed(1) : null, voiceDefaultOffsetDb: +(20 * Math.log10(0.8)).toFixed(1) };
const json = { line: LINE, mix, nodesPerLine: res.nodes, sampleRate: 32000, textSpeed: '50 characters/s (normal)', voiceVolume: 1, features: res.names, control: res.control, voices: rows, closestAfter: pairs('after').slice(0, 8), closestBefore: REF ? pairs('before').slice(0, 8) : null };
writeFileSync(OUT + 'measurements.json', JSON.stringify(json, null, 1));
const head = 'id,who,version,syllables,f0_median_hz,f0_p10_hz,f0_p90_hz,pitch_range_st,centroid_hz,syllables_per_s,voiced_share,peak,peak_dbfs,rms_active,rms_dbfs,max_jump,max_d2,click_crest';
writeFileSync(OUT + 'measurements.csv', [head, ...rows.map((r) => [r.id, `"${r.who}"`, r.tag, r.syllables, r.f0, r.f0lo, r.f0hi, r.rangeSt, r.centroid, r.sylRate, r.voiced, r.peak, r.peakDb, r.rmsActive, r.rmsDb, r.maxJump, r.maxD2, r.clickCrest].join(','))].join('\n') + '\n');
console.table(rows.map((r) => ({ id: r.id, v: r.tag, f0: r.f0, lo: r.f0lo, hi: r.f0hi, st: r.rangeSt, cen: r.centroid, rate: r.sylRate, voi: r.voiced, pk: r.peakDb, rms: r.rmsDb, jump: r.maxJump, d2: r.maxD2, crest: r.clickCrest })));
console.log('click control', res.control, 'mix', mix, 'nodes per line', res.nodes);
console.log('closest after', JSON.stringify(json.closestAfter));
if (REF) console.log('closest before', JSON.stringify(json.closestBefore));
