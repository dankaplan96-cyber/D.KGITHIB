// Chapter 10 of the expanded campaign ("Borrowed Time", story/throttle.js; tests/exp-throttle.mjs is its full test).
// Segment 12 ends with the isolator on Kell's feed (chapter 9's end) → chapter 10: Mira's call, the ship home to Citadel.
// Here: Mira at the Water Office takes him down to FunFrock's valve room; three bleeds, each wheel turned as it kicks (the
// step waits for the kick by the game's own clock), and Oren holds the mains; out to the fortress shelter: Gilbert, the
// washroom, Zoé on the relay → played as Zoé: the project office's register, the crates, the B-7 → she walks it to the
// shelter → Twinsen: the feed shut, the B-7 fitted, the feed opened, the band turned to green, the lever held as Oren
// swings it → Gilbert, Vesk on the wire, Baldino's call → the network (segment 13).
const TH = () => game.story.chapters.find((c) => c.key === 'throttle');
const use = (p, kind) => { const r = P.use(p.x, p.z, { kind, near: 0.7 }); for (let i = 0; i < 12; i++) game.step(0.1); P.settle(); return r.r; };
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: P.here(), fail: game.flags.chapterKey === 'throttle' ? null : 'not chapter 10' }; }],
  ['Mira at the Water Office: down to the valve room', () => { const r = P.talk('mira', { run: true }); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { ...r, room: P.here(), fail: game.flags.og_room ? null : 'valve room' }; }],
  ['three bleeds: each wheel opened as it kicks', () => {
    const G = game, V = G.rooms.valves, ch = TH(), tries = [];
    for (let k = 0; k < 8 && !G.flags.og_steady; k++) {
      const v = V.valves[k % 4];
      P.go(v.x, v.z + 0.65, { tol: 0.3 }); P.face(v.x, v.z);
      for (let j = 0; j < 600; j++) { const p = ch.phase(); if (p > 0.92 && p < 0.985) break; G.step(1 / 60); }   // (just before the bang: the turn lands in the kick)
      P.tap('KeyE', 0.05); G.step(0.9); P.settle();
      tries.push(G.flags.og_bleed | 0);
    }
    for (let i = 0; i < 40; i++) G.step(0.1); P.settle();
    return { tries, steady: !!G.flags.og_steady, fail: G.flags.og_steady ? null : 'bleeds' };
  }],
  ['out to the fortress shelter: Gilbert, Zoé on the relay', () => {
    P.exitTo('valves-out'); P.exitTo('outdoor-office'); P.go(-33.3, -36.4, { tol: 1.2, run: true });
    const r = P.talk('gilbert', { run: true }); P.settle(); for (let i = 0; i < 40; i++) game.step(0.1); P.settle();
    return { r: r.r, thanks: !!game.flags.og_thanks, zoe: game.hero.body === 'zoe', room: P.here(), fail: game.hero.body === 'zoe' && game.room?.id === 'projoffice' ? null : 'zoe' };
  }],
  ['Zoé: the register, the crates, the B-7', () => {
    const ch = TH(), out = [use(ch.officeAt([-5.55, -3.3]), 'threg')];
    for (let k = 0; k < 3 && !game.flags.th_b7; k++) out.push(use(ch.officeAt([3.4, -2.6]), 'thcrate'));
    return { out, b7: !!game.flags.th_b7, fail: game.flags.th_b7 ? null : 'b7' };
  }],
  ['Zoé to the shelter: Twinsen again', () => {
    P.exitTo('outdoor-projoffice'); P.settle(); const p = TH().front(1.2, -0.9);
    P.go(p.x, p.z, { tol: 1.5, run: true }); for (let i = 0; i < 30; i++) { game.step(0.1); if (game.state === 'dialog') P.settle(); } P.settle();
    return { body: game.hero.body, done: !!game.flags.th_zoeDone, fail: game.flags.th_zoeDone && game.hero.body === 'twinsen' ? null : 'hand-over' };
  }],
  ['the branch: feed shut, the B-7 fitted, feed open, the band to green', () => {
    const ch = TH(), f = game.flags, out = [];
    out.push(use(ch.front(0.55, -0.22), 'thfeed'), use(ch.front(), 'thflange'), use(ch.front(0.55, -0.22), 'thfeed'));
    for (let k = 0; k < 6 && !f.th_set; k++) out.push(use(ch.front(), 'thband'));
    return { out, band: f.th_band, set: !!f.th_set, fail: f.th_set ? null : 'band' };
  }],
  ['Oren swings the lever; a hand holds it → the network', () => {
    const G = game, f = G.flags, ch = TH();
    for (let i = 0; i < 80 && !f.th_push; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } P.settle();
    use(ch.front(), 'thhold');
    for (let i = 0; i < 600 && f.chapterKey === 'throttle'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    P.settle(60); P.settle(30);
    return { lever: !!f.th_lever, chapter: f.chapterKey, room: G.room?.id, fail: f.chapterKey === 'network' ? null : 'no network' };
  }],
];
