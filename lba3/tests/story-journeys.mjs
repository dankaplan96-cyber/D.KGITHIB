// WC-1 Journeys: the story's own crossings show their journey films (TRAVEL-1; src/game/travelfilm.js storyJourney,
// crossByShip's onward leg, storyArrival). With the films on, each of the three crossings that were plain fades:
//   end of chapter 3 (Zeelich's platform console, story/chapter2.js toShell): Doran's ship leaves Zeelich Spaceport
//     (take-off, cabin, space), then the ferry is seen coming in to Kesh's pier, where chapter 4 starts (Doran steps off)
//   end of chapter 5 (FunFrock's hangar, story/steam.js board): Hesk's glider leaves from the dunes over the buried hall
//     and is seen coming down in the Hamalayi foothills, where chapter 6 starts (Hesk steps off)
//   end of chapter 7 (the monastery's gate, story/observatory.js leave): the glider runs off the monks' slope and is seen
//     coming down on Citadel's glider field, where chapter 8 starts
// each: the right films in FILMS.log (part, mode, points), played out; the next chapter at its start (the region, the
// landing spot, in play, its first line said after the card); nothing of the films left in the scene. Then the skip
// (hold E) in each departure: the whole journey's film ends, the chapter still changes; a skip in an arrival; and with
// the films off (?nocine's default) the chapter changes with no film, as before.
// SHOTS=dir: one frame of each film (departure and arrival) for review (SHOT_T=0.3,0.9: departure frames at those
// times too). ONLY=ch5,ch7: those crossings only (no skip-in-arrival, no Save → Continue).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
await open(page, '?nocine'); await menu(page, 'new');

await ev(() => {
  const G = game;
  window.J = {
    // answer dialogue (E) until the game is back in play with no scene change, film or held card
    settle(max = 60) { for (let t = 0; t < max; t += 1 / 30) { if (G.state === 'play' && !G.trans && !G.cine && !G.cutscene) break; if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(1 / 30); } G.step(0.2); },
    // jump to the end of a chapter: the chapter before it (by key) with flags, then nextChapter, as the chapter suites do
    to(prevKey, extra, endFlags) {
      const f = G.flags; J.settle(); G.travel.films.on = false;
      Object.assign(f, { prologueDone: true, intro: true, chapterKey: prevKey, ...extra }); f.chapter = G.story.chapters.findIndex((c) => c.key === prevKey);
      G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); J.settle();
      Object.assign(f, endFlags); G.story.refreshCast(); G.step(0.2);
      return f.chapterKey;
    },
    begin(films) { G.travel.films.on = films; window._j = { n0: G.travel.films.n || 0, key0: G.flags.chapterKey, states: [], cardInFilm: false, cardAfter: false, aboardInFilm: null }; },
    // step until a film of `part` has reached time t (for a picture or a skip)
    until(part, t, who) { const F = G.travel.films; for (let k = 0; k < 3000; k++) { J.watch(who); const e = F.log.at(-1); if (G.cine && (F.n || 0) > _j.n0 && e?.part === part && G.cine.t >= t) return true; if (G.state === 'dialog') G.input.taps.add('KeyE'); G.step(1 / 30); } return false; },
    // what is seen each step: the states, the card and the rider while the arrival film plays
    watch(who) {
      const R = _j;
      if (!R.states.includes(G.state)) R.states.push(G.state);
      const arr = G.cine && G.travel.films.log.at(-1)?.part === 'arrive' && (G.travel.films.n || 0) > R.n0;
      if (arr && G.state === 'cinematic') {
        if (document.querySelector('#chapter').classList.contains('show')) R.cardInFilm = true;
        const n = who && G.npcs.find((x) => x.def.id === who);
        if (n && G.cine.t < 1.0 && R.aboardInFilm !== true) R.aboardInFilm = n.rig.root.visible;
      }
      if (R.sawArrive && !G.cine && G.state === 'cutscene' && document.querySelector('#chapter').classList.contains('show')) R.cardAfter = true;
      if (arr) R.sawArrive = true;
    },
    // play everything out (dialogue answered with E)
    finish(who) {
      const R = _j;
      for (let k = 0; k < 4000; k++) {
        J.watch(who);
        if (G.state === 'play' && !G.trans && !G.cine && !G.cutscene && G.flags.chapterKey !== R.key0) break;
        if (G.state === 'dialog') G.input.taps.add('KeyE');
        G.step(1 / 30);
      }
      J.settle();
    },
    report(where, who) {
      const F = G.travel.films, R = _j, h = G.hero;
      const parts = F.log.filter((e) => e.n > R.n0).map((e) => ({ part: e.part, mode: e.mode, from: e.from, to: e.to, len: e.length, t: e.t, skipped: e.skipped, parked: e.parked }));
      const L = where();
      const n = who && G.npcs.find((x) => x.def.id === who);
      return {
        parts, key: G.flags.chapterKey, room: G.room?.id ?? 'citadel', state: G.state, trans: !!G.trans, cine: !!G.cine, cutscene: !!G.cutscene,
        d: L ? +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(2) : null, heroShown: h.rig.root.visible,
        hud: !document.querySelector('#hud').classList.contains('hidden'), card: document.querySelector('#chapter').classList.contains('show'),
        left: ['filmCraft', 'shipCabin', 'filmSpace'].filter((x) => G.scene.getObjectByName(x)),
        rider: n ? { present: n.present, shown: n.rig.root.visible } : null,
        states: R.states, cardInFilm: R.cardInFilm, cardAfter: R.cardAfter, aboardInFilm: R.aboardInFilm,
      };
    },
  };
});
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${name}.png`, timeout: 180000 }); };
// hold the skip key the way a player does (the skip's dip to black runs on the clock)
const holdSkip = async () => {
  await page.keyboard.down('KeyE');
  await ev(() => { for (let i = 0; i < 36; i++) game.frame(1 / 30, false); });
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(700);
};

// ---------------------------------------------------------------- the three crossings
const CROSS = {
  ch3: {
    name: 'end of chapter 3 (Zeelich → Citadel by ship, the ferry to Desert Island)', next: 'dig', region: 'desert', who: 'doran', started: 'c4_started',
    setup: () => ev(() => J.to('project', { c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true },
      { c2_plan: true, c2_planBack: true, c2_okuOK: true, c2_cog: true, c2_cyl: true, c2_key: true, c2_broadcast: true, c2_shield: true, c2_veskDown: true, c2_done: false })),
    go: () => ev(() => { const G = game; if (G.room?.id !== 'zeelich') G.enterRoom('zeelich', null, true); G.step(0.2); G.story.cur.toShell(); G.step(1 / 30); }),
    where: () => game.rooms.desert.dock,
    films: [['depart', 'ship', 'zeelich_port', 'citadel_port'], ['arrive', 'ferry', null, 'desert_ferry']],
  },
  ch5: {
    name: 'end of chapter 5 (Desert Island → the Hamalayi by Hesk\'s glider)', next: 'pass', region: 'hamalayi', who: 'hesk', started: 'c6_started',
    setup: () => ev(() => J.to('dig', { c4_started: true, c4_done: true, c4_pump: true, c4_trust: true, c4_carving: true },
      { c5_planned: true, c5_routed: true, c5_hatch: true, c5_vent: true, c5_radio: true, c5_glider: true, c5_gliderSeen: true, c5_done: false })),
    go: () => ev(() => { const G = game; G.enterRoom('condB', null, true); G.story.refreshCast(); G.step(0.2); G.story.cur.board(); G.step(1 / 30); }),
    where: () => game.rooms.hamalayi.landing,
    films: [['depart', 'glider', 'c5_hangar', 'hamalayi_glider'], ['arrive', 'glider', null, 'hamalayi_glider']],
  },
  ch7: {
    name: 'end of chapter 7 (the Hamalayi → Citadel by Hesk\'s glider)', next: 'evacuation', region: 'citadel', who: null, started: 'c8_started',
    setup: () => ev(() => J.to('pass', { c6_started: true, c6_bridge: true, c6_heat: true, c6_thawed: true, c6_trip1: true, c6_trip2: true, c6_up: true, c6_done: true },
      { c7_keeper: true, c7_lit: true, c7_sendell: true, c7_scope: true, c7_droneDown: true, c7_vent: true, c7_done: false })),
    go: () => ev(() => { const G = game; const g = G.rooms.hamalayi.monastery.gate; if (G.room?.id !== 'hamalayi') G.enterRoom('hamalayi', null, true); G.story.refreshCast(); G.step(0.2); G.hero.pos.set(g.x + 1, G.physics.groundAt(g.x + 1, g.z + 2), g.z + 2); G.story.cur.leave(); G.step(1 / 30); }),
    where: () => game.travel.points.citadel_glider.landing,
    films: [['depart', 'glider', 'c7_slope', 'citadel_glider'], ['arrive', 'glider', null, 'citadel_glider']],
  },
};
const filmsOK = (r, want) => r.parts.length === want.length && want.every(([part, mode, from, to], i) => { const e = r.parts[i]; return e.part === part && e.mode === mode && e.from === from && e.to === to && !e.skipped && e.t >= e.len - 0.05; });
const landedOK = (r, C) => r.key === C.next && r.room === C.region && r.state === 'play' && !r.trans && !r.cine && !r.cutscene && r.d != null && r.d < 1.5 && r.heroShown && r.hud && !r.card && !r.left.length;

const ONLY = process.env.ONLY;   // (a quick run: ONLY=ch5,ch7)
for (const [id, C] of Object.entries(CROSS)) {
  if (ONLY && !ONLY.split(',').includes(id)) continue;
  // films on, played out
  await C.setup();
  await ev(() => J.begin(true));
  await C.go();
  if (SHOTS) {
    const lenDep = id === 'ch3' ? 4.8 : 1.2;   // (the ship: in the cabin; the glider: on its run)
    for (const t of (process.env.SHOT_T || '').split(',').filter(Boolean).map(Number)) if (await ev(([t, w]) => J.until('depart', t, w), [t, C.who])) await shot(`${id}-depart-${t}`);
    if (await ev(([t, w]) => J.until('depart', t, w), [lenDep, C.who])) await shot(`${id}-depart`);
    if (id === 'ch3' && await ev((w) => J.until('depart', 7.6, w), C.who)) await shot(`${id}-space`);
    if (await ev((w) => J.until('arrive', 1.6, w), C.who)) await shot(`${id}-arrive`);
  }
  await ev((who) => J.finish(who), C.who);
  const r = await ev(([w, who]) => J.report(new Function('return (' + w + ')()'), who), [C.where.toString(), C.who]);
  const started = await ev((k) => !!game.flags[k], C.started);
  check(`WC-1 ${C.name}: films on — the journey's films play (${C.films.map((f) => f.slice(0, 2).join(' ')).join(', ')})`, filmsOK(r, C.films), r.parts);
  check(`WC-1 ${C.name}: lands in the next chapter (${C.next}) at its start, in play, nothing of the films left`, landedOK(r, C), r);
  check(`WC-1 ${C.name}: the chapter card waits for the arrival film and its first line follows`, !r.cardInFilm && r.cardAfter && started, { cardInFilm: r.cardInFilm, cardAfter: r.cardAfter, started });
  if (C.who) check(`WC-1 ${C.name}: ${C.who} comes with him (hidden while the craft comes in, standing by the landing after)`, r.aboardInFilm === false && r.rider?.present && r.rider?.shown, { aboardInFilm: r.aboardInFilm, rider: r.rider });

  // films on, skipped in the departure: the whole journey's film ends, the chapter still changes
  await C.setup();
  await ev(() => J.begin(true));
  await C.go();
  const okDep = await ev((w) => J.until('depart', 1.0, w), C.who);
  await holdSkip();
  await ev((who) => J.finish(who), C.who);
  const s = await ev(([w, who]) => J.report(new Function('return (' + w + ')()'), who), [C.where.toString(), C.who]);
  check(`WC-1 ${C.name}: holding E in the departure ends the journey's film (no arrival film); the chapter changes, he stands at its start in play`,
    okDep && s.parts.length === 1 && s.parts[0].part === 'depart' && s.parts[0].skipped && landedOK(s, C), s);

  // films off: the plain scene change, as before
  await C.setup();
  await ev(() => J.begin(false));
  await C.go();
  await ev((who) => J.finish(who), C.who);
  const o = await ev(([w, who]) => J.report(new Function('return (' + w + ')()'), who), [C.where.toString(), C.who]);
  check(`WC-1 ${C.name}: films off — no film, the chapter changes and he stands at its start in play`, o.parts.length === 0 && landedOK(o, C) && !o.states.includes('cinematic'), o);
}

// a skip in a story arrival: the film ends at once, the card comes back, the chapter's first line follows
if (!ONLY) {
  const C = CROSS.ch5;
  await C.setup();
  await ev(() => J.begin(true));
  await C.go();
  const okArr = await ev((w) => J.until('arrive', 1.0, w), C.who);
  await holdSkip();
  await ev((who) => J.finish(who), C.who);
  const r = await ev(([w, who]) => J.report(new Function('return (' + w + ')()'), who), [C.where.toString(), C.who]);
  const started = await ev((k) => !!game.flags[k], C.started);
  check('WC-1 skip in the glider\'s arrival (chapter 6): the film ends, he stands at the landing in play, Hesk by him, the chapter\'s first line said',
    okArr && r.parts.length === 2 && !r.parts[0].skipped && r.parts[1].skipped && landedOK(r, C) && started && r.rider?.shown, { r, started });
}

// Save → Continue after a crossing with films: the next chapter, at its start
if (!ONLY) {
  const c = await ev(() => { const G = game; G.save(false); G.startContinue(); G.step(0.5); J.settle(); const L = game.rooms.hamalayi.landing, h = G.hero; return { key: G.flags.chapterKey, room: G.room?.id, state: G.state, d: +Math.hypot(h.pos.x - L.x, h.pos.z - L.z).toFixed(2) }; });
  check('WC-1: Save → Continue after the glider\'s films: chapter 6 on the Hamalayi at the landing, in play', c.key === 'pass' && c.room === 'hamalayi' && c.state === 'play' && c.d < 1.5, c);
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
