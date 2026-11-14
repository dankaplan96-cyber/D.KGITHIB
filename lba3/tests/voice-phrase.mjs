// VOICE-PHRASE (src/engine/voice.js, voiceplan.js, assets/voice): the phrase is the unit of speech. Mechanical checks
// only; nothing here says how a voice sounds to a person.
// 1. Offline (an OfflineAudioContext driven frame by frame like the dialogue box, tools/voice-render/scene.js), for
//    the pre-rendered phrases and for the synthesis alone:
//    - one utterance per turn: a line typed out letter by letter starts its voice once, never once per letter;
//    - a turn's voice is released when the next line starts, the box closes, or the text is skipped; never two at once;
//    - rapid skipping (a line every 60 ms, revealed at once) never stacks voices, never clips, never clicks;
//    - closing the dialogue leaves nothing sounding 0.2 s later; voice volume 0 is silent but the mouth still moves;
//    - the phrase banks: in the size budget, every clip inside its file, every main speaker and family present;
//    - a missing bank falls back to the synthesis.
// 2. In the game: Zoé's lines in a real dialogue box (the banks fetched and decoded by the game itself): one phrase
//    per line from her bank, the text skip and the close release it, the mouth moves while she speaks.
// P18-VOICES: the Words voices (the default since P18) take the same mechanical checks offline (one utterance, the
// release, rapid skipping, turns, mute), and their own: the line's letters read to sounds, the syllables follow them,
// about the classic line's length, the bank's pitch; in the game a Words line is rendered off the main thread (the
// worker) and released the same way; Settings → Sound → Voice Style loads from settings saved before P18 (no value, a
// wrong one) as Words, and a choice is kept.
// VOICE-2: the Expressive voices (the default since VOICE-2, assets/voice2) take the same mechanical checks offline, and
// their own: clips from the Expressive bank, the line's intention from its metadata (voicemeta.js), the accent where
// the metadata puts it, a repeated line not played the same twice running, a new speaker never over the last one's
// fading tail (the start at least 85 ms after the release), a skip fading out within 0.15 s; in the game Zoé's line from
// her Expressive bank; the setting: old settings (none, a wrong value, unreadable, or Words saved before VOICE-2) load as
// Expressive, Words chosen after VOICE-2 stays Words, Classic picked is kept. Mechanical only: nothing here says how a
// voice sounds; that is the user's to judge (docs/lba-maturity/VOICE-2.md).
import { launch, open, menu, checker, optional, URL0 } from './lib/boot.mjs';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { check, done } = checker({ info: 'always' });
optional(/nonexistent-voice-banks/, 'the missing-bank fallback check asks for banks that are not there');

// ------------------------------------------------------------------ the banks on disk
const man = JSON.parse(readFileSync(ROOT + 'assets/voice/manifest.json', 'utf8'));
const files = readdirSync(ROOT + 'assets/voice').filter((f) => f.endsWith('.ogg'));
const bytes = files.reduce((a, f) => a + statSync(ROOT + 'assets/voice/' + f).size, 0) + statSync(ROOT + 'assets/voice/manifest.json').size;
// (VOICES-PIPER: the user's budget for the Piper banks is about 6 MB, up from the synthesised banks' 3)
check('the phrase banks stay under 6 MB in all', bytes < 6 * 1024 * 1024, { MB: +(bytes / 1048576).toFixed(2), banks: files.length });
// (VOICES-PIPER: a resident family is several speakers' banks, listed in manifest.families)
const fams = ['quetch-m', 'quetch-f', 'quetch-kid', 'grobo-m', 'grobo-f', 'bunny-m', 'bunny-f', 'esmer-m', 'esmer-f'];
const need = ['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'sendell', ...fams.flatMap((f) => man.families?.[f] || [f])];
check('a bank for each of the main cast and each resident family (two speakers or more), its file present', need.every((b) => man.banks[b] && files.includes(man.banks[b].file)) && fams.every((f) => man.families?.[f]?.length >= 2), need.filter((b) => !man.banks[b]));
const badClip = [];
for (const [id, b] of Object.entries(man.banks)) for (const [k, c] of Object.entries(b.clips)) if (!(c.d > 0 && c.sp <= c.d && c.s.length >= 1 && c.s.every((s) => s[0] >= 0 && s[0] < c.d))) badClip.push(id + ':' + k);
check('every clip has its speech inside its own span, and its syllables for the mouth', badClip.length === 0, badClip.slice(0, 5));
// VOICE-FLOW: every clip carries its measured sound edges (tools/voice-render/clip-edges.py), sound inside the speech
const noEdge = [];
for (const [id, b] of Object.entries(man.banks)) for (const [k, c] of Object.entries(b.clips)) if (!(c.a >= 0 && c.e > c.a && c.e <= c.sp + 1e-9)) noEdge.push(id + ':' + k);
check('every clip has its sound edges (0 <= a < e <= sp), which the playback joins clauses by', noEdge.length === 0, noEdge.slice(0, 5));
// VOICE-2: the Expressive banks
const man2 = JSON.parse(readFileSync(ROOT + 'assets/voice2/manifest.json', 'utf8'));
const files2 = readdirSync(ROOT + 'assets/voice2').filter((f) => f.endsWith('.ogg'));
const bytes2 = files2.reduce((a, f) => a + statSync(ROOT + 'assets/voice2/' + f).size, 0) + statSync(ROOT + 'assets/voice2/manifest.json').size;
check('Expressive: the banks stay under 9 MB in all', bytes2 < 9 * 1024 * 1024, { MB: +(bytes2 / 1048576).toFixed(2), banks: files2.length });
const need2 = ['hero', 'zoe', 'arthur', 'baldino', 'vesk', 'sendell', 'gilbert', 'mira', 'doran', ...fams.flatMap((f) => man2.families?.[f] || [f])];
check('Expressive: a bank for each of the main cast and each resident family, its file present', need2.every((b) => man2.banks[b] && files2.includes(man2.banks[b].file)) && fams.every((f) => man2.families?.[f]?.length >= 1), need2.filter((b) => !man2.banks[b]));
const bad2 = [];
for (const [id, b] of Object.entries(man2.banks)) {
  for (const it of ['tell', 'cont', 'ask', 'unsure', 'warm', 'worry', 'excl', 'no']) if (!b.len[it]) bad2.push(id + ' lacks ' + it);
  for (const [k, c] of Object.entries(b.clips)) if (!(c.d > 0 && c.sp <= c.d && c.s.length >= 1 && c.a >= 0 && c.e > c.a && c.e <= c.sp + 1e-9)) bad2.push(id + ':' + k);
}
check('Expressive: every bank has every intention, every clip its speech, edges and syllables', bad2.length === 0, bad2.slice(0, 6));

// ------------------------------------------------------------------ 1. offline
const { browser, page } = await launch();
await page.goto(URL0 + 'README.md');
const off = await page.evaluate(async (base) => {
  const V = await import(new URL('src/engine/voice.js', base).href);
  const S = await import(new URL('tools/voice-render/scene.js', base).href);
  const out = {};
  const LINE = "Next door's kettle furred up with these since breakfast. Pipes don't do that.";
  const lines = ['Same next door.', 'Their tap ran warm, then stopped.', 'And look at their kettle.', 'Furred with these since breakfast.', "Mira's telling everyone it's Gilbert's old pipes.", 'Show her these. Then the well.'];
  for (const mode of ['phrases', 'synthesis', 'words', 'expressive']) {
    V.setVoiceMode(mode === 'words' || mode === 'expressive' ? mode : 'classic');
    V.voiceBanks(mode !== 'synthesis' ? new URL('assets/voice/', base).href : null);
    const prep = mode !== 'synthesis' ? { prepare: (B) => B.prepare(['n_hero', 'n_zoe'], { wait: true }) } : {};
    const o = out[mode] = {};
    // (a) one line, typed out letter by letter: one utterance; then the box closes
    {
      const scene = { len: 6, turns: [{ key: 'n_hero', text: LINE, at: 0.2, say: true, mode: 'dialog' }, { key: '', text: '', at: 4.6, say: true, mode: 'dialog', end: 4.61 }] };
      let calls = 0;
      const r = await S.renderScene(V, scene, { ...prep, prepare: async (B, A) => { await prep.prepare?.(B); const c = B.chars.bind(B); B.chars = (...a) => { calls++; return c(...a); }; o.B1 = B; } });
      const B = o.B1; delete o.B1;
      o.charsCalls = calls; o.lines = B.lines; o.played = B.played.slice(); o.syllables = r.count;
      const sr = r.sr, pk = (a, b) => { let m = 0; for (let i = Math.floor(a * sr); i < Math.min(r.voice.length, b * sr); i++) m = Math.max(m, Math.abs(r.voice[i])); return m; };
      o.during = pk(0.3, 1.5); o.afterClose = pk(4.85, 6); o.liveEnd = r.log[r.log.length - 1][2];
      o.mouthOpen = Math.max(...r.log.filter((x) => x[0] > 0.3 && x[0] < 1.5).map((x) => x[1]));
      o.maxActive = Math.max(...r.log.map((x) => x[3]));
      if (mode === 'words') { const lab = await import(new URL('tests/lib/voicelab.js', base).href); o.f0 = lab.analyse(r.voice.subarray(Math.floor(0.2 * r.sr), Math.floor(4.4 * r.sr)), r.sr).f0; }
    }
    // (b) rapid skipping: a line every 60 ms in one box, each revealed at once 30 ms after it starts; then the box closes
    {
      const turns = []; let t = 0.2;
      for (let i = 0; i < 18; i++) { turns.push({ key: 'n_zoe', text: lines[i % lines.length], at: +t.toFixed(3), say: i === 0, mode: 'dialog' }); t += 0.06; }
      turns.push({ key: '', text: '', at: +(t + 0.2).toFixed(3), say: true, mode: 'dialog', end: t + 0.21 });
      const skipAt = turns.slice(0, -1).map((u) => +(u.at + 0.03).toFixed(3));
      const r = await S.renderScene(V, { len: t + 1.4, turns }, { ...prep, skipAt });
      const lab = await import(new URL('tests/lib/voicelab.js', base).href);
      const a = lab.analyse(r.voice, r.sr);
      o.rapid = { maxActive: Math.max(...r.log.map((x) => x[3])), maxLive: Math.max(...r.log.map((x) => x[2])), peak: a.peak, peakDb: a.peakDb, clickCrest: a.clickCrest, maxJump: a.maxJump };
      let tail = 0; for (let i = Math.floor((t + 0.6) * r.sr); i < r.voice.length; i++) tail = Math.max(tail, Math.abs(r.voice[i]));
      o.rapid.after = tail; o.rapid.liveEnd = r.log[r.log.length - 1][2];
    }
    // (c) two speakers taking turns: never two voices at once, no clicks at the changes
    {
      const turns = [];
      const ex = [['n_zoe', "Twinsen. The tap's stopped again."], ['n_hero', 'I fixed that yesterday.'], ['n_zoe', 'It worked yesterday.'], ['n_hero', "I'll check the well."]];
      let t = 0.2; for (const [k, s] of ex) { turns.push({ key: k, text: s, at: t, say: true, mode: 'dialog' }); t += 1.1; }
      turns.push({ key: '', text: '', at: t, say: true, mode: 'dialog', end: t + 0.01 });
      const r = await S.renderScene(V, { len: t + 1, turns }, prep);
      const lab = await import(new URL('tests/lib/voicelab.js', base).href);
      const a = lab.analyse(r.voice, r.sr);
      o.turns = { maxActive: Math.max(...r.log.map((x) => x[3])), clickCrest: a.clickCrest, maxJump: a.maxJump, peakDb: a.peakDb };
    }
    // (d) voice volume 0: silent, nothing made, the mouth still moves in time
    {
      const scene = { len: 2.5, turns: [{ key: 'n_zoe', text: 'It worked yesterday.', at: 0.2, say: true, mode: 'dialog' }] };
      const r = await S.renderScene(V, scene, { ...prep, voiceVol: 0 });
      let pk = 0; for (const x of r.voice) pk = Math.max(pk, Math.abs(x));
      o.muted = { peak: pk, maxLive: Math.max(...r.log.map((x) => x[2])), mouth: Math.max(...r.log.map((x) => x[1])) };
    }
    // (f) VOICE-FLOW: a line of several clauses from the phrases: the silences between them are about the planned pauses
    //     (a comma 0.13 s, a full stop 0.3 s), not the third of a second at a comma and half a second at a full stop
    //     the clips' own silences added before
    if (mode === 'phrases' || mode === 'expressive') {
      const text = 'The depot at the old camp? Drones, a guard and a dog. Keep to the path and nobody minds you. Past the yellow line, go slowly.';
      const r = await S.renderScene(V, { len: 8, turns: [{ key: 'n_doran', text, at: 0.2, say: true, mode: 'dialog' }] }, { prepare: (B) => B.prepare(['n_doran'], { wait: true }) });
      // (silences: 5 ms frames 35 dB under the loudest, 40 ms or longer, between sounds)
      const h = Math.round(r.sr * 0.005), env = [];
      for (let s = 0; s + h <= r.voice.length; s += h) { let e = 0; for (let i = 0; i < h; i++) e += r.voice[s + i] ** 2; env.push(Math.sqrt(e / h)); }
      const q = Math.max(...env) * Math.pow(10, -35 / 20), sil = []; let run = 0, on = false;
      for (const x of env) { if (x > q) { if (on && run >= 8) sil.push(+(run * 0.005).toFixed(3)); run = 0; on = true; } else if (on) run++; }
      const P = await import(new URL('src/engine/voiceplan.js', base).href);
      o.flow = { silences: sil, planned: P.clauses(text).slice(0, -1).map((c) => c.pause), played: r.played.length };
    }
  }
  // (g) P18-VOICES: what the Words voices make of the letters, and how long their lines are
  {
    const W = await import(new URL('src/engine/voicewords.js', base).href);
    V.setVoiceMode('words');
    const ex = { 'Have you seen the pump?': 'h ae v | y uw | s iy1 n | dh ax | p ah1 m p', 'The names were written on the lighthouse door': 'dh ax | n ey1 m z | w er | r ih1 . t eh n | aa n | dh ax | l ay1 t . h aw s | d ao1 r',
      'night, cheese, ship, judge, sing, motion': 'n ay1 t || ch iy1 z || sh ih1 p || j ah1 j || s ih1 ng || m aa1 . sh ax n' };
    out.phones = Object.entries(ex).map(([t, want]) => [t, W.phonesOf(t).join(' || '), want]);
    const lines = ['I fixed that yesterday.', "Next door's kettle furred up with these since breakfast. Pipes don't do that.", "Twinsen. The tap's stopped again.", "That's warm. It's never warm.",
      'Dad, can I fix the next radio too?', 'The depot at the old camp? Drones, a guard and a dog. Keep to the path and nobody minds you. Past the yellow line, go slowly.', 'Need anything?', 'Hm.'];
    const rows = [];
    for (const id of ['hero', 'zoe', 'arthur', 'doran', 'farmer1', 'nara', 'oku', 'sendell', 'vesk', 'baldino', 'zbee1', 'ztri1', 'zmole1']) {
      const v = V.voiceFor('n_' + id);
      for (const t of lines) {
        const p = V.planVoiceLine(v, t), c = V.classicLength(v, t);
        // (the onset consonants of the syllables spoken against the text's own, in order: the same kind of sound, a stop,
        //  a fricative, a nasal ..., not necessarily the same letter: the babble moves some of them)
        const ref = W.clauseWords(t).flatMap((x) => x.syl), spoken = p.syl.filter((s) => !s.hum);
        rows.push({ id, t: t.slice(0, 20), syl: spoken.length, written: ref.length, ratio: +(p.dur / c).toFixed(2), maxDur: p.dur });
      }
    }
    out.plans = rows;
    out.f0s = Object.fromEntries(['hero', 'zoe', 'arthur'].map((id) => [id, V.wordsVoice(V.voiceFor('n_' + id)).f0]));
    // repeatable: the same line from the same speaker renders the same, sample for sample
    const S2 = await import(new URL('tools/voice-render/scene.js', base).href);
    const sc = { len: 2.5, turns: [{ key: 'n_zoe', text: 'It worked yesterday.', at: 0.2, say: true, mode: 'dialog' }] };
    const a = await S2.renderScene(V, sc, { prepare: (B) => B.prepare(['n_zoe'], { wait: true }) }), b = await S2.renderScene(V, sc, { prepare: (B) => B.prepare(['n_zoe'], { wait: true }) });
    let d = 0; for (let i = 0; i < a.voice.length; i++) d = Math.max(d, Math.abs(a.voice[i] - b.voice[i]));
    out.repeat = d;
  }
  // (h) VOICE-2: the Expressive voices' own: the metadata's intentions and accent, a repeated line, a speaker change
  {
    for (const f of ['ch1', 'ch2', 'ch3', 'opening', 'well', 'common']) await import(new URL(`src/game/text/${f}.js`, base).href).catch(() => null);
    const M = await import(new URL('src/game/text/voicemeta.js', base).href);
    M.resetVoiceMeta();
    V.setVoiceMode('expressive');
    V.voiceBanks(new URL('assets/voice/', base).href);
    const say = async (pairs, extra = {}) => {
      const turns = []; let t = 0.2;
      for (const [k, s, gap] of pairs) { turns.push({ key: k, text: s, at: +t.toFixed(3), say: true, mode: 'dialog' }); t += gap ?? 3; }
      turns.push({ key: '', text: '', at: t, say: true, mode: 'dialog', end: t + 0.01 });
      const ev = [];
      const r = await S.renderScene(V, { len: t + 1, turns }, { ...extra, prepare: async (B) => {
        await B.prepare([...new Set(pairs.map((p) => p[0]))], { wait: true });
        const rel = B._release.bind(B); B._release = (u, now) => { if (!u.released) ev.push(['release', now]); return rel(u, now); };
        const ex = B._expr.bind(B); B._expr = (plan, text, b, e, T0, meta) => { ev.push(['start', T0, plan.phrases.map((p) => p.intent)]); return ex(plan, text, b, e, T0, meta); };
        o2.B = B; } });
      const B = o2.B; delete o2.B;
      return { r, ev, played: B.played.slice() };
    };
    const o2 = out.expr = {};
    // the metadata: "The shell? What shell?" curious (ask), "Then give the water back." annoyed (no), Zoé's "There you are! ..."
    // relieved, concerned, curious
    const a = await say([['n_hero', 'The shell? What shell?'], ['n_hero', 'Then give the water back.'], ['n_zoe', 'There you are! You climbed into the well and vanished. What did you find?', 4.5]]);
    o2.intents = a.ev.filter((e) => e[0] === 'start').map((e) => e[2]);
    o2.meta = M.metaFor('The shell? What shell?') ? 'found' : 'missing';
    o2.playedA = a.played;
    // a repeated line: the same speaker says it three times; not the same clips twice running
    const rep = await say([['n_zoe', 'Delivery forms. And a very old sandwich.', 2.5], ['n_zoe', 'Delivery forms. And a very old sandwich.', 2.5], ['n_zoe', 'Delivery forms. And a very old sandwich.', 2.5]]);
    const sets = []; let cur = [];
    for (const p of rep.played) { cur.push(p); if (cur.length === 2) { sets.push(cur.join()); cur = []; } }
    o2.repeat = sets;
    // a speaker change mid-line: Zoé is cut off by Twinsen 0.6 s into her line; his line starts after her fade
    const cut = await say([['n_zoe', 'Doran is getting the ship ready at the spaceport. Be careful up there, Twinsen. And come back.', 0.6], ['n_hero', 'I fixed that yesterday.', 2]]);
    const rel = cut.ev.filter((e) => e[0] === 'release').map((e) => e[1]), st = cut.ev.filter((e) => e[0] === 'start').map((e) => e[1]);
    o2.cut = { release: rel[0], start: st[1], gap: +(st[1] - rel[0]).toFixed(3) };
    // the skipped line is silent 0.15 s after the release
    const sr = cut.r.sr; let tail = 0; for (let i = Math.floor((rel[0] + 0.15) * sr); i < Math.floor((st[1] - 0.005) * sr); i++) tail = Math.max(tail, Math.abs(cut.r.voice[i]));
    o2.cut.tailAfter150ms = tail;
  }
  // (e) a bank that is not there: the line is synthesised
  V.setVoiceMode('classic');
  {
    V.voiceBanks(new URL('nonexistent-voice-banks/', base).href);
    const scene = { len: 2.5, turns: [{ key: 'n_zoe', text: 'It worked yesterday.', at: 0.2, say: true, mode: 'dialog' }] };
    const r = await S.renderScene(V, scene, { prepare: (B) => B.prepare(['n_zoe'], { wait: true }) });
    let pk = 0; for (let i = Math.floor(0.3 * r.sr); i < 1.5 * r.sr; i++) pk = Math.max(pk, Math.abs(r.voice[i]));
    out.fallback = { peak: pk, played: r.played.length };
  }
  V.voiceBanks(new URL('assets/voice/', base).href);
  return out;
}, URL0);

for (const mode of ['phrases', 'synthesis', 'words', 'expressive']) {
  const o = off[mode];
  check(`${mode}: a line typed letter by letter starts one utterance (not one per letter)`, o.charsCalls > 20 && o.lines === 1 && o.maxActive === 1, { chars: o.charsCalls, lines: o.lines, maxActive: o.maxActive, syllables: o.syllables });
  if (mode === 'phrases') check('phrases: one clip per clause, from the speaker\'s own bank', o.played.length >= 1 && o.played.length <= 3 && o.played.every((x) => x.startsWith('hero:')), o.played);
  if (mode === 'expressive') check('expressive: one clip per clause, from the speaker\'s Expressive bank', o.played.length >= 1 && o.played.length <= 3 && o.played.every((x) => x.startsWith('x:hero:')), o.played);
  if (mode === 'phrases' || mode === 'expressive') {
    const s = [...o.flow.silences].sort((a, b) => a - b);
    check(mode + ': a line of clauses flows: no silence inside it over 0.4 s, the median about a full stop\'s 0.3 s or less (was 0.45-0.6 s at a full stop)', o.flow.played >= 4 && s.length >= 3 && s[s.length - 1] <= 0.4 && s[Math.floor(s.length / 2)] <= 0.32, o.flow);
  }
  check(`${mode}: the line sounds while it is spoken, the mouth moves with it`, o.during > 0.02 && o.mouthOpen > 0.3, { peak: o.during, mouth: o.mouthOpen });
  check(`${mode}: the box closed, silent 0.25 s later, nothing left playing`, o.afterClose < 0.001 && o.liveEnd === 0, { after: o.afterClose, live: o.liveEnd });
  const R = o.rapid;
  check(`${mode}: rapid skipping (18 lines, 60 ms apart, each revealed) never stacks voices`, R.maxActive <= 1, R);
  check(`${mode}: rapid skipping does not clip (peak under -1 dBFS) or click (crest < 7, no jump over 0.25)`, R.peakDb <= -1 && R.clickCrest < 7 && R.maxJump < 0.25, R);
  check(`${mode}: after the skipping and the close, silence and nothing alive`, R.after < 0.001 && R.liveEnd === 0, R);
  check(`${mode}: two speakers taking turns: one voice at a time, no clicks at the changes`, o.turns.maxActive <= 1 && o.turns.clickCrest < 7 && o.turns.maxJump < 0.25, o.turns);
  check(`${mode}: voice volume 0 is silent and makes nothing, the mouth still moves`, o.muted.peak === 0 && o.muted.maxLive === 0 && o.muted.mouth > 0.3, o.muted);
}
check('a missing bank: the line is synthesised instead', off.fallback.peak > 0.02 && off.fallback.played === 0, off.fallback);
// P18-VOICES
check('words: a line from its English letters (digraphs, a silent e, soft c and g, -tion, stress): the phones expected', off.phones.every(([, got, want]) => got === want), off.phones);
const pl = off.plans, long = pl.filter((r) => r.written >= 3);
check('words: the syllables follow the text: a line speaks at least 60 % of its written syllables (most: all of them)', long.every((r) => r.syl >= Math.ceil(0.6 * r.written)), long.filter((r) => r.syl < Math.ceil(0.6 * r.written)).slice(0, 5));
const rat = pl.map((r) => r.ratio).sort((a, b) => a - b);
check('words: a line about as long as the classic one (the median within 0.95-1.15, none under 0.6 or over 2.2), so the typing and the voice still end together', rat[rat.length >> 1] >= 0.95 && rat[rat.length >> 1] <= 1.15 && rat[0] >= 0.6 && rat[rat.length - 1] <= 2.2, { median: rat[rat.length >> 1], min: rat[0], max: rat[rat.length - 1] });
// (VOICE-2: the Words voice takes the pitch of the speaker's Expressive bank: Twinsen 158 Hz, not 130)
check("words: a banked speaker speaks at their Expressive bank's pitch (Twinsen 158, Zoé 218, Arthur 262 Hz) and is heard there", off.f0s.hero === 158 && off.f0s.zoe === 218 && off.f0s.arthur === 262 && Math.abs(off.words.f0 - 158) < 20, { planned: off.f0s, heard: off.words.f0 });
const X = off.expr;
check('expressive: the metadata gives each clause its intention ("The shell? What shell?" curious, "Then give the water back." annoyed, Zoé relieved / concerned / curious)', X.meta === 'found' && X.intents[0].join() === 'ask,ask' && X.intents[1].join() === 'no' && X.intents[2].join() === 'warm,worry,ask' && X.playedA.some((p) => /:excl\.|:ask\./.test(p)), { intents: X.intents, played: X.playedA });
check('expressive: a line said three times running is not the same performance twice in a row', X.repeat.length === 3 && X.repeat[0] !== X.repeat[1] && X.repeat[1] !== X.repeat[2], X.repeat);
check('expressive: a speaker cutting in starts after the last voice has faded (85 ms or more after its release), silent 0.15 s after the release', X.cut.gap >= 0.085 && X.cut.tailAfter150ms < 0.003, X.cut);
check('words: the same line from the same speaker renders the same each time', off.repeat < 1e-6, off.repeat);

// ------------------------------------------------------------------ 2. in the game
await open(page, '?nocine');
await page.evaluate(() => localStorage.clear());
await menu(page, 'new');
const g = await page.evaluate(async () => {
  const G = window.game; G.testFreeze = true;
  G.settings.voiceMode = 'classic'; G.applySettings();   // (P18-VOICES: the phrases are the classic voices)
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  await G.audio.ctx?.resume?.();
  const A = G.audio, B = A.babble;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const out = { running: A.ctx.state };
  // the bank is fetched and decoded by the game: the call that asks for it returns at once
  const t0 = performance.now(); B.prepare(['n_zoe']); out.prepareMs = +(performance.now() - t0).toFixed(2);
  await wait(1500);
  const l0 = B.lines, p0 = B.played.length;
  const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.voiceBus.connect(an);
  const buf = new Float32Array(an.fftSize);
  const level = () => { an.getFloatTimeDomainData(buf); let p = 0; for (const x of buf) p = Math.max(p, Math.abs(x)); return p; };
  const zoe = G.npcs.find((n) => n.def?.id === 'zoe');
  G.say('n_zoe', ["Same next door. Their tap ran warm, then stopped.", 'And look at their kettle.'], null, zoe);
  var speak = 0, mouth = 0, active = 0;
  for (let i = 0; i < 40; i++) { G.step(1 / 30); await wait(33); speak = Math.max(speak, level()); mouth = Math.max(mouth, B.mouth().o); active = Math.max(active, B.active); }
  out.firstLine = { lines: B.lines - l0, played: B.played.slice(p0), speak, mouth, active };
  // E: the text is out already (typed in 1 s): the next line; then E reveals it at once (the voice released), then E closes
  G.input.taps.add('KeyE'); G.step(0.02);
  for (let i = 0; i < 3; i++) { G.step(1 / 30); await wait(33); }
  G.input.taps.add('KeyE'); G.step(0.02);   // (revealed)
  out.revealed = G.hud.dialog.shown >= G.hud.dialog.full.length;
  await wait(300);
  var tail = 0; for (let i = 0; i < 8; i++) { tail = Math.max(tail, level()); await wait(20); }
  out.afterReveal = { tail, live: B.live, active: B.active, lines: B.lines - l0 };
  out.played0 = B.played.length;
  G.input.taps.add('KeyE'); G.step(0.02);   // (closed)
  await wait(300);
  out.closed = { state: G.state, v: B.v, live: B.live };
  // P18-VOICES: the Words voices in the game: Zoé's line rendered off the main thread, heard, her mouth moving; revealing
  // the next line releases it; closing leaves nothing
  G.settings.voiceMode = 'words'; G.applySettings();
  const l1 = B.lines;
  G.say('n_zoe', ["Same next door. Their tap ran warm, then stopped.", 'And look at their kettle.'], null, zoe);
  speak = 0; mouth = 0; active = 0;
  let firstSound = null; const tw0 = performance.now();
  for (let i = 0; i < 40; i++) { G.step(1 / 30); await wait(33); const l = level(); if (l > 0.01 && firstSound == null) firstSound = performance.now() - tw0; speak = Math.max(speak, l); mouth = Math.max(mouth, B.mouth().o); active = Math.max(active, B.active); }
  out.words = { lines: B.lines - l1, played: B.played.length - out.played0, cpu: B.cpu, speak, mouth, active, firstSoundMs: firstSound && Math.round(firstSound) };
  G.input.taps.add('KeyE'); G.step(0.02);
  for (let i = 0; i < 3; i++) { G.step(1 / 30); await wait(33); }
  G.input.taps.add('KeyE'); G.step(0.02);
  await wait(300);
  tail = 0; for (let i = 0; i < 8; i++) { tail = Math.max(tail, level()); await wait(20); }
  out.words.afterReveal = { tail, live: B.live, active: B.active, lines: B.lines - l1 };
  G.input.taps.add('KeyE'); G.step(0.02);
  await wait(300);
  out.words.closed = { state: G.state, v: B.v, live: B.live };
  // VOICE-2: the Expressive voices in the game (the default): Zoé's line from her Expressive bank, heard, her mouth moving;
  // revealing the next releases it; closing leaves nothing; the frame the line starts on does no synthesis
  G.settings.voiceMode = 'expressive'; G.applySettings();
  B.prepare(['n_zoe']); await wait(1500);
  const l2 = B.lines, p2 = B.played.length;
  // (the voice's own work when a line starts: the metadata, the plan, the clips chosen and scheduled)
  const exl = B._exprLine.bind(B), xms = []; B._exprLine = (...a) => { const t0 = performance.now(); const r = exl(...a); xms.push(performance.now() - t0); return r; };
  G.say('n_zoe', ['There you are! You climbed into the well and vanished. What did you find?', 'And look at their kettle.'], null, zoe);
  speak = 0; mouth = 0; active = 0;
  for (let i = 0; i < 70; i++) { G.step(1 / 30); await wait(33); speak = Math.max(speak, level()); mouth = Math.max(mouth, B.mouth().o); active = Math.max(active, B.active); }
  out.expr = { lines: B.lines - l2, played: B.played.slice(p2), speak, mouth, active };
  G.input.taps.add('KeyE'); G.step(0.02);
  for (let i = 0; i < 3; i++) { G.step(1 / 30); await wait(33); }
  G.input.taps.add('KeyE'); G.step(0.02);
  await wait(300);
  tail = 0; for (let i = 0; i < 8; i++) { tail = Math.max(tail, level()); await wait(20); }
  out.expr.afterReveal = { tail, live: B.live, lines: B.lines - l2 };
  G.input.taps.add('KeyE'); G.step(0.02);
  await wait(300);
  out.expr.closed = { state: G.state, v: B.v, live: B.live };
  out.exprStartMs = +Math.max(...xms).toFixed(2); delete B._exprLine;
  A.voiceBus.disconnect(an);
  return out;
});
check('in the game: the audio context runs headless', g.running === 'running', g);
check('in the game: asking for a bank costs the frame nothing (it loads and decodes off the main thread)', g.prepareMs < 5, g.prepareMs);
check("in the game: Zoé's line is one phrase from her bank, heard, her mouth moving", g.firstLine.lines === 1 && g.firstLine.played.length >= 1 && g.firstLine.played.every((x) => x.startsWith('zoe:')) && g.firstLine.speak > 0.01 && g.firstLine.mouth > 0.3 && g.firstLine.active === 1, g.firstLine);
check('in the game: the next line starts its own phrase; revealing it at once releases it (silent 0.3 s later, not replayed)', g.revealed && g.afterReveal.tail < 0.001 && g.afterReveal.live === 0 && g.afterReveal.lines === 2, g.afterReveal);
check('in the game: closing the dialogue drops the speaker, nothing left playing', g.closed.state === 'play' && g.closed.v === null && g.closed.live === 0, g.closed);
const gw = g.words;
check('in the game, Words: one line, rendered off the main thread (the worker), heard soon after the box opens, the mouth moving, no phrase clip', gw.lines === 1 && gw.played === 0 && gw.cpu?.worker === true && gw.speak > 0.01 && gw.mouth > 0.3 && gw.active === 1 && gw.firstSoundMs != null && gw.firstSoundMs < 400, gw);
check('in the game, Words: the next line starts its own; revealing it releases it (silent 0.3 s later); closing leaves nothing', gw.afterReveal.tail < 0.001 && gw.afterReveal.live === 0 && gw.afterReveal.lines === 2 && gw.closed.state === 'play' && gw.closed.v === null && gw.closed.live === 0, { reveal: gw.afterReveal, closed: gw.closed });
const gx = g.expr;
check('in the game, Expressive: one line, clips from Zoé\'s Expressive bank, heard, the mouth moving', gx.lines === 1 && gx.played.length >= 1 && gx.played.every((x) => x.startsWith('x:zoe:')) && gx.speak > 0.01 && gx.mouth > 0.3 && gx.active === 1, gx);
check('in the game, Expressive: revealing the next line releases it (silent 0.3 s later); closing leaves nothing', gx.afterReveal.tail < 0.001 && gx.afterReveal.live === 0 && gx.afterReveal.lines === 2 && gx.closed.state === 'play' && gx.closed.v === null && gx.closed.live === 0, { reveal: gx.afterReveal, closed: gx.closed });
check('in the game, Expressive: a line\'s start costs the main thread little (the metadata, the plan, the clips scheduled: under 5 ms; no synthesis)', g.exprStartMs < 5, g.exprStartMs);

// ------------------------------------------------------------------ 3. P18-VOICES: the setting, saved and loaded
const KEY = 'sunshard_settings_v1';
const loadAs = async (stored) => {
  await page.evaluate(([k, s]) => { if (s == null) localStorage.removeItem(k); else localStorage.setItem(k, s); }, [KEY, stored]);
  await open(page, '?nocine');
  return page.evaluate(async () => ({ setting: game.settings.voiceMode, mode: (await import('./src/engine/voice.js')).voiceMode() }));
};
const before = await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k) || '{}'); delete s.voiceMode; delete s.voiceV; return JSON.stringify(s); }, KEY);
const s1 = await loadAs(before), s2 = await loadAs(JSON.stringify({ ...JSON.parse(before), voiceMode: 'loud' })), s3 = await loadAs('{not json');
// (VOICE-2, then the user 14.11: Words left the menu; any saved Words, the old default or a choice, loads as Expressive)
const s5 = await loadAs(JSON.stringify({ ...JSON.parse(before), voiceMode: 'words' })), s6 = await loadAs(JSON.stringify({ ...JSON.parse(before), voiceMode: 'words', voiceV: 2 }));
check('settings with no Voice Style, a wrong value, unreadable, or Words (the old default or a choice, Words left the menu): the game loads with Expressive', [s1, s2, s3, s5, s6].every((x) => x.setting === 'expressive' && x.mode === 'expressive'), { s1, s2, s3, s5, s6 });
const pick = await page.evaluate(async () => {
  const b = document.querySelector('#settings .seg[data-setting="voiceMode"] button[data-v="classic"]');
  b.click();
  return { label: document.querySelector('#settings [data-hint="voiceMode"] .set-label').textContent, buttons: [...document.querySelectorAll('#settings .seg[data-setting="voiceMode"] button')].map((x) => x.textContent), page: b.closest('.set-page').dataset.page,
    setting: game.settings.voiceMode, mode: (await import('./src/engine/voice.js')).voiceMode(), stored: JSON.parse(localStorage.getItem('sunshard_settings_v1')).voiceMode };
});
const s4 = await loadAs(await page.evaluate((k) => localStorage.getItem(k), KEY));
check('Settings → Sound → Voice Style (Expressive / Classic): Classic picked is applied, saved, and still Classic after a reload', pick.page === 'sound' && pick.label === 'Voice Style' && pick.buttons.join() === 'Expressive,Classic' && pick.setting === 'classic' && pick.mode === 'classic' && pick.stored === 'classic' && s4.setting === 'classic' && s4.mode === 'classic', { pick, reload: s4 });
await browser.close();
done();
