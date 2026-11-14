// MUSIC-BY-PLACE (wave C item 6, docs/lba-maturity/music-by-place.md): each new piece plays in its place, on the real
// audio clock. The School of Magic, its dormitory and the weather wizard's tent play 'school'; Desert Island outdoors
// starts its own piece (desert_isle) and rotates to Sea Wind; Kesh's houses hear it through the walls; the Hamalayi
// outdoors plays 'mountain' (then The Well), the monastery hall keeps the same piece going (it was silent: R.music
// 'mountain' had no mood), Lhar's houses hear it muffled; a mood whose piece is missing plays its `alt`; the three
// renders are in the manifest with their loop points and bar lines, at the palette's loudness, small files.
// Rooms are entered directly (game.enterRoom), not walked to: Automated runtime, not a listening test.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
async function until(fn, arg, timeout = 30) {
  try { return await (await page.waitForFunction(fn, arg, { timeout: timeout * 1000, polling: 100 })).jsonValue(); } catch { return null; }
}

await open(page, '?nocine'); await menu(page, 'new');
await until(() => game.audio.ctx && game.audio.music.manifest && Object.keys(game.audio.music.manifest.tracks).length);

// ---------------------------------------------------------------- the renders
const NEW = ['school', 'mountain', 'desert_isle'];
const man = await ev((names) => Object.fromEntries(names.map((n) => [n, game.audio.music.manifest.tracks[n] || null])), NEW);
for (const n of NEW) {
  const t = man[n];
  check(`${n}: in the manifest, a loop (loopStart after its body's start, loopEnd inside the file, 1 s of tail), bar lines`,
    t && t.loop && t.loopStart > t.bodyStart && t.loopEnd < t.duration - 0.9 && t.loopEnd > t.bodyEnd && t.bars?.length > 30 && t.phrase === 8,
    t && { loopStart: t.loopStart, loopEnd: t.loopEnd, bodyStart: t.bodyStart, bodyEnd: t.bodyEnd, duration: t.duration, bars: t.bars.length });
  check(`${n}: loudness −17.5…−18 LUFS (the palette's beds), true peak ≤ −3 dBTP, no limiting, ≤ 1.7 MB`,
    t && t.lufs <= -17.4 && t.lufs >= -18.6 && t.truePeak <= -3 && t.limiterGR === 0 && t.bytes < 1.7e6,
    t && { lufs: t.lufs, truePeak: t.truePeak, limiterGR: t.limiterGR, bytes: t.bytes });
}

// where the music stands: the base mood, the wanted track, the live voice (not fading out) with its gain and low-pass
const snap = () => ev(() => {
  const M = game.audio.music, s = M.state(), v = M.voices.find((x) => !x.stopping);
  return { room: game.room?.id || null, base: s.base, target: s.target, list: s.list, track: v?.name || null, gain: v ? +v.gain.gain.value.toFixed(2) : null,
    lowpass: v ? Math.round(v.filter.frequency.value) : null, alive: M.voices.length, log: s.log.slice(-3) };
});
// enter a room the way a scene change lands there (its area built first, as a door's loading card does)
const enter = (id) => ev((id) => { const G = game; G.regions.ensure(id, 'test'); G.enterRoom(id, null, true); P.settle?.(); G.step(0.5); return G.room?.id; }, id);
// wait until the live voice is `track` at full gain (decoded, crossfade done), or at `gain` with a low-pass
const playing = (track, gain = 1, lowpass = null, timeout = 40) => until(([t, g, lp]) => {
  const v = game.audio.music.voices.find((x) => !x.stopping);
  if (!v || v.name !== t || Math.abs(v.gain.gain.value - g) > 0.05) return null;
  if (lp && Math.abs(v.filter.frequency.value - lp) > 30) return null;
  return { track: v.name, gain: +v.gain.gain.value.toFixed(2), lowpass: Math.round(v.filter.frequency.value) };
}, [track, gain, lowpass], timeout);

// a fixed sequence: each playlist starts with its first piece (the place's own), as a new session may
await ev(() => { game.audio.music.rand = () => 0; });

// ---------------------------------------------------------------- Desert Island
await enter('desert');
let p = await playing('desert_isle');
check('Desert Island outdoors: its own piece (desert_isle), first of the Desert playlist', !!p && (await snap()).list === 'desert', { p, s: await snap() });

// the School of Magic, its dormitory, the weather wizard's tent: 'school'
await enter('school');
p = await playing('school');
const sch = await snap();
check('the School of Magic: its own piece (school), not the island through the walls', !!p && sch.base === 'school' && sch.room === 'school', { p, sch });
check('…one voice playing, at most two alive (the old one fading)', sch.alive <= 2, sch);
const out = await ev(() => { const G = game; const e = G.room.exits.find((x) => /out/.test(x.to || '')) || G.room.exits[0]; P.through(e.x, e.z); P.settle?.(); G.step(1); return { room: G.room?.id || 'citadel', to: e.to }; });
const back = await playing('desert_isle');
const bs = await snap();
check('out of the School by its door: the desert piece again, resumed where it was (not from bar 1)', !!back && bs.base === 'desert' && /revive desert_isle|play desert_isle @(?!0\.0s)/.test(bs.log.join(' ')), { out, back, bs });
await enter('ih_hall');
p = await playing('school');
check('the pupils\' dormitory: the School\'s piece', !!p && (await snap()).base === 'school', { p, s: await snap() });
await enter('wtent');
p = await playing('school');
check('the weather wizard\'s tent: the School\'s piece (it had Twinsen\'s Home)', !!p && (await snap()).base === 'school', { p, s: await snap() });

// Kesh's houses: the desert piece through the walls
await enter('desert');
await playing('desert_isle');
await enter('ih_kesh_house0');
p = await playing('desert_isle', 0.6, 1100);
check('a Kesh house: the desert piece through the walls (−4.4 dB, 1.1 kHz low-pass), not restarted', !!p && (await snap()).base === 'desert_in', { p, s: await snap() });
await enter('ih_s28');
p = await playing('desert_isle', 0.6, 1100);
check('the dig crew\'s bunkhouse: the same', !!p, { p, s: await snap() });

// the playlist goes on to Sea Wind after the desert piece (indoors at once, as every playlist)
const nx = await ev(() => { const M = game.audio.music; M.finishPiece(); return M.lists.get('desert').tracks; });
p = await playing('island_b', 0.6, 1100, 40);
check('the Desert playlist: desert_isle then Sea Wind (island_b)', !!p && nx.join() === 'desert_isle,island_b', { nx, p });

// ---------------------------------------------------------------- the Hamalayi
await enter('hamalayi');
p = await playing('mountain');
check('the Hamalayi outdoors: its own piece (mountain), first of its playlist (it had The Well alone)', !!p && (await snap()).list === 'hamalayi', { p, s: await snap() });
const before = await ev(() => game.audio.music.voices.find((x) => !x.stopping));
await enter('ham_hall');
p = await playing('mountain');
const hall = await snap();
check('the monastery hall: the mountain\'s piece goes on (it was silent: no mood \'mountain\')', !!p && hall.base === 'mountain' && hall.target === 'mountain' && !hall.log.some((l) => /no track/.test(l)), { p, hall });
check('…the same voice, not restarted', await ev(() => game.audio.music.voices.filter((x) => !x.stopping).length === 1 && /play mountain/.test(game.audio.music.log.filter((l) => /^play /.test(l)).pop())), hall.log);
await enter('ih_ham_lhar0');
p = await playing('mountain', 0.6, 1100);
check('a house in Lhar: the mountain through the walls (it had Twinsen\'s Home)', !!p && (await snap()).base === 'hamalayi_in', { p, s: await snap() });

// ---------------------------------------------------------------- the alt fallback (a build without the new renders)
const alt = await ev(() => {
  const M = game.audio.music, T = M.manifest.tracks, keep = { school: T.school, mountain: T.mountain, desert_isle: T.desert_isle };
  const out = {};
  delete T.school; delete T.mountain; delete T.desert_isle;
  M.lists.clear();
  M.setMood('school'); out.school = M.target()?.track;
  M.setMood('mountain'); out.mountain = M.target()?.track;
  M.setMood('hamalayi'); out.hamalayi = M.lists.get('hamalayi')?.tracks;
  M.setMood('desert'); out.desert = M.lists.get('desert')?.tracks;
  Object.assign(T, keep); M.lists.clear(); M.setMood('silence');
  return out;
});
check('without the renders each place plays what it had: school → home, mountain → well, the Hamalayi → [well], the Desert → [island_b]',
  alt.school === 'home' && alt.mountain === 'well' && alt.hamalayi?.join() === 'well' && alt.desert?.join() === 'island_b', alt);
check('never more than two music voices audible at once (the manager\'s own count)', await ev(() => game.audio.music.maxVoices <= 2), await ev(() => game.audio.music.maxVoices));

done();
await browser.close();
