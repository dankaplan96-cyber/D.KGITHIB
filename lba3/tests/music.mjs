// Music playlists (MUSIC-2): what can be checked without listening. The places the player stays in rotate through
// two pieces, each played to its own end; outdoors a silence follows, indoors the next piece follows at once; the
// combat music still comes during a silence; arriving starts a piece at a phrase start, not always at bar 1; a
// change of place crossfades (equal power) starting on a bar line of the old track; dialogue ducks the music to 0.5;
// every track the manifest names is a shipped file. Runs on the real audio clock (the AudioContext runs in real
// time even with game.testFreeze), with the silences shortened by the test (gapRange) where it waits for one.
// Not a listening test: nothing here says how it sounds.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { gameFiles } from '../tools/game-files.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const wait = (s) => page.waitForTimeout(s * 1000);
// poll the page until fn() is truthy (real time), returns its value or null
async function until(fn, arg, timeout = 30) {
  try { return await (await page.waitForFunction(fn, arg, { timeout: timeout * 1000, polling: 100 })).jsonValue(); } catch { return null; }
}

await open(page, '?nocine'); await menu(page, 'new');
await until(() => game.audio.ctx && game.audio.music.manifest && Object.keys(game.audio.music.manifest.tracks).length);
const man = await ev(() => ({ tracks: game.audio.music.manifest.tracks }));
const { PLAYLISTS } = await ev(() => import('./src/engine/music.js').then((m) => ({ PLAYLISTS: m.PLAYLISTS })));

// ---------------------------------------------------------------- files
const shipped = new Set(Object.values(gameFiles()));
const files = Object.values(man.tracks).map((t) => 'assets/music/' + t.file);
check('every track in the manifest is a shipped file (tools/game-files.mjs)', files.every((f) => shipped.has(f)), files.filter((f) => !shipped.has(f)));
const named = [...new Set(Object.values(PLAYLISTS).flat())];
check('every playlist piece is in the manifest', named.every((n) => man.tracks[n]), named.filter((n) => !man.tracks[n]));
const lens = Object.fromEntries(Object.entries(PLAYLISTS).map(([k, l]) => [k, l.filter((n) => man.tracks[n]).length]));
check('Citadel town, the island and Zeelich have two pieces or more', lens.citadel >= 2 && lens.island >= 2 && lens.zeelich >= 2, lens);
check('every track has its bar lines (manifest bars, for phrase starts and bar-line crossfades)', Object.values(man.tracks).every((t) => t.bars?.length > 8), Object.entries(man.tracks).filter(([, t]) => !(t.bars?.length > 8)).map(([k]) => k));

// ---------------------------------------------------------------- out of the house: the town's playlist, from a phrase start
const firstOut = await ev(() => {
  const G = game, M = G.audio.music;
  M.rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); // a fixed sequence
  P.settle(); G.step(2.5);
  const s = G.room.searches[0]; P.use(s.x, s.z); // (as tests/audio.mjs: the first search, then out of the door)
  const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); G.step(2.5);
  return { base: M.baseName, list: M.base?.list, outdoor: M.outdoor, place: G.audio.place };
});
check('out of the house the music is an outdoor playlist (the open island around the house, or the town)', ['island', 'citadel'].includes(firstOut.list) && firstOut.outdoor, firstOut);
// into the village square: what the game's area check (audio.setOutdoorArea) asks for there
await ev(() => { const M = game.audio.music; if (M.base?.list !== 'citadel') game.audio.setMood('citadel'); });
let st = await until(() => { const s = game.audio.music.state(); return s.voices.find((v) => !v.stopping && v.list === 'citadel' && v.gain > 0.9) ? s : null; }, null, 60);
const startLine = (st?.log || []).filter((l) => /^play /.test(l)).pop() || '';
const at = +(startLine.match(/@([\d.]+)s/) || [])[1];
const piece = st?.voices.find((v) => !v.stopping)?.track;
const info = man.tracks[piece] || {};
const phraseStarts = [0, ...(info.bars || []).filter((_, i) => i >= (info.bodyBar || 0) && (i - (info.bodyBar || 0)) % (info.phrase || 8) === 0)];
check('a playlist piece plays in town', !!piece && PLAYLISTS.citadel.includes(piece), st && { piece, voices: st.voices });
check('it starts at a phrase start (bar 1 or the first bar of an 8-bar phrase)', Number.isFinite(at) && phraseStarts.some((p) => Math.abs(p - at) < 0.01), { at, phraseStarts: phraseStarts.slice(0, 12) });
const v0 = st?.voices.find((v) => !v.stopping);
const endPos = info.loop ? info.bodyEnd : info.duration;
check('it is played once to its end (end scheduled at the end of the piece)', v0 && Math.abs(v0.endsIn - (endPos - v0.pos)) < 1.5, { endsIn: v0?.endsIn, left: endPos - (v0?.pos || 0) });

// several arrivals: not always the same start
const starts = await ev(async () => {
  const M = game.audio.music, out = [];
  for (let i = 0; i < 8; i++) {
    const info = M.manifest.tracks[M.lists.get('citadel').tracks[0]];
    out.push(M._entry(info, 'phrase'));
  }
  return out;
});
check('arrivals start at different phrases (8 draws)', new Set(starts).size >= 3, starts);

// ---------------------------------------------------------------- the piece ends outdoors: silence, then the other piece
await ev(() => { game.audio.music.gapRange = [8, 8]; });
const before = await ev(() => game.audio.music.state().voices.find((v) => !v.stopping)?.track);
await ev(() => game.audio.music.finishPiece());
const inGap = await until(() => { const s = game.audio.music.state(); return s.target === null && s.lists.citadel?.gapIn > 0 && !s.voices.some((v) => !v.stopping) ? s : null; }, null, 5);
check('after a piece outdoors: a silence (nothing wanted, no voice but the one fading out)', !!inGap, inGap && { gapIn: inGap.lists.citadel.gapIn, voices: inGap.voices });
const silent = await until(() => { const s = game.audio.music.state(); return s.voices.length === 0 ? s : null; }, null, 12);
check('the piece fades out completely (over its last bars)', !!silent, silent?.voices);
const nextUp = await until(() => { const s = game.audio.music.state(); const v = s.voices.find((x) => !x.stopping && x.list === 'citadel'); return v ? { track: v.track, log: s.log.slice(-4) } : null; }, null, 20);
check('after the silence the other piece of the playlist plays', nextUp && nextUp.track !== before, { before, nextUp });
check('…from its first bar', nextUp && /@0\.0s/.test(nextUp.log.filter((l) => /^play /.test(l)).pop() || ''), nextUp?.log);
await ev(() => game.audio.music.finishPiece());
const third = await until(() => { const s = game.audio.music.state(); const v = s.voices.find((x) => !x.stopping && x.list === 'citadel' && x.pos < 3); return v ? v.track : null; }, null, 30);
check('and then the first one again (the playlist rotates)', third === before, { before, second: nextUp?.track, third });

// ---------------------------------------------------------------- combat during a silence: the combat music comes
await ev(() => { game.audio.music.gapRange = [40, 40]; game.audio.music.finishPiece(); });
await until(() => game.audio.music.state().lists.citadel?.gapIn > 30, null, 5);
await ev(() => { window.__threat = setInterval(() => game.audio.setCombat(1), 100); });
const fight = await until(() => { const s = game.audio.music.state(); return s.voices.find((v) => !v.stopping && v.track === 'combat') ? s : null; }, null, 20);
check('in a silence, a fight still brings the combat music', !!fight, fight && { combat: fight.combat, voices: fight.voices });
await ev(() => { clearInterval(window.__threat); window.__threat = setInterval(() => game.audio.setCombat(0), 100); });
const calm = await until(() => { const s = game.audio.music.state(); return !s.combat && !s.voices.some((v) => !v.stopping) ? s : null; }, null, 20);
check('after the fight the silence goes on (no piece forced in)', calm && calm.lists.citadel.gapIn > 5 && calm.target === null, calm && { gapIn: calm.lists.citadel.gapIn, target: calm.target });
await ev(() => clearInterval(window.__threat));

// ---------------------------------------------------------------- indoors: no silences
const indoor = await ev(() => {
  const G = game, M = G.audio.music;
  G.enterRoom('zeelich', null, true); G.enterRoom('upper', null, true);
  return { mood: M.baseName, list: M.base?.list, outdoor: M.outdoor, place: G.audio.place };
});
check('a Zeelich interior plays the Zeelich playlist, indoors', indoor.list === 'zeelich' && !indoor.outdoor, indoor);
const inPiece = await until(() => { const s = game.audio.music.state(); const v = s.voices.find((x) => !x.stopping && x.list === 'zeelich'); return v ? v.track : null; }, null, 30);
await ev(() => game.audio.music.finishPiece());
const noGap = await ev(() => game.audio.music.state());
check('indoors, the end of a piece leaves no silence (no gap pending)', noGap.lists.zeelich?.gapIn === null && noGap.target && noGap.target !== inPiece, { gapIn: noGap.lists.zeelich?.gapIn, was: inPiece, target: noGap.target });
const inNext = await until((was) => { const s = game.audio.music.state(); const v = s.voices.find((x) => !x.stopping && x.list === 'zeelich' && x.track !== was); return v ? v.track : null; }, inPiece, 30);
check('…the next piece follows at once (after the old one\'s last bars)', !!inNext, { was: inPiece, next: inNext });

// ---------------------------------------------------------------- change of place: an equal-power crossfade from a bar line
await ev(() => { game.exitRoom({ x: 0, z: 0 }, true, true); game.audio.setPlace('island'); game.audio.setMood('island'); });
await until(() => game.audio.music.state().voices.some((v) => !v.stopping && v.list === 'island' && v.gain > 0.95), null, 40);
const xf = await ev(async () => {
  const M = game.audio.music, A = game.audio;
  const old = M._current();
  const bars = old.info.bars;
  M.lists.get('citadel').gapUntil = 1e-3; // (the town's silence from the combat check has run out meanwhile)
  const samples = [];
  const t0 = A.ctx.currentTime;
  A.setMood('citadel');
  const iv = setInterval(() => samples.push({ t: +(A.ctx.currentTime - t0).toFixed(2), v: M.voices.map((x) => [x.name, +x.gain.gain.value.toFixed(3), !!x.stopping]) }), 100);
  await new Promise((r) => setTimeout(r, 9000));
  clearInterval(iv);
  // when the old one started to fade, where was it (relative to its bar lines)?
  const stopLine = M.log.filter((l) => l.startsWith(`stop ${old.name}`)).pop();
  const fadeAt = samples.find((s) => s.v.some(([n, g, stop]) => n === old.name && stop));
  return { old: old.name, samples, stopLine, bars: bars.slice(0, 4), fadeT: fadeAt?.t, oldPosAtStop: old.stopPos };
});
const both = xf.samples.filter((s) => s.v.length === 2);
const sums = both.map((s) => s.v[0][1] ** 2 + s.v[1][1] ** 2);
check('a change of place crossfades: both tracks sound together for a while', both.length >= 10, { n: both.length, fadeT: xf.fadeT });
check('…with equal power (sum of squared gains stays near 1)', sums.length && Math.min(...sums) > 0.8 && Math.max(...sums) < 1.2, { min: Math.min(...sums), max: Math.max(...sums) });
check('…starting within one bar of the request (it waits for the old track\'s bar line)', xf.fadeT !== undefined && xf.fadeT <= 3.4, { fadeT: xf.fadeT });
const barHit = await ev(() => game.audio.music.lastBarSwitch || null);
check('…and the old track was on a bar line when it began to fade', barHit && barHit.offBar < 0.12, barHit);

// ---------------------------------------------------------------- dialogue ducks the music to 0.5 (VOICE-MIX), then it comes back
const duck = await ev(async () => {
  const A = game.audio, g = A.music.out.gain, bus = A.musicBus.gain.value;
  const before = g.value, ctx = A.ctx.state, gs = game.state;
  A.duck(true); await new Promise((r) => setTimeout(r, 600)); const down = g.value;
  A.duck(false); await new Promise((r) => setTimeout(r, 2000)); const up = g.value;
  return { before, down, up, bus, vol: A.vol.music, voice: A.voiceBus.gain.value, voiceVol: A.vol.voice, ctx, gs };
});
check('dialogue ducks the music to 0.5 and it comes back to 1; the music bus stays at the slider value', Math.abs(duck.down - 0.5) < 0.01 && Math.abs(duck.up - 1) < 0.01 && Math.abs(duck.bus - duck.vol) < 1e-6, duck);
check('the voice bus is the voice slider x2.2 (VOICE-MIX)', Math.abs(duck.voice - duck.voiceVol * 2.2) < 1e-6, duck);

// ---------------------------------------------------------------- never more than two music voices
const maxVoices = await ev(() => game.audio.music.maxVoices || 0);
check('never more than two music voices alive at once during the whole run', maxVoices <= 2, { maxVoices });

done();
await browser.close();
