// Chapter 10 of the expanded campaign (Borrowed Time, OREN-GUARDIAN OG-1 "A Steady Hand"; tests/oren-first.mjs is its
// full test). Segment 12 ends with Mira's call in the council chamber and the ship home to Citadel. Here: Mira at the
// Water Office takes him down to FunFrock's valve room; the mains hammer every 3.2 s; a wheel opened as it kicks bleeds
// the kick (a player watches the needles leap and turns as they do: the step waits for the kick by the game's own
// clock); three bleeds and the governor holds the mains (Oren speaks); out to the fortress shelter: Gilbert, Tim and
// Lulu thank him → chapter 11 (segment 12c).
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: P.here(), fail: game.flags.chapterKey === 'throttle' ? null : 'not chapter 10' }; }],
  ['Mira at the Water Office: down to the valve room', () => { const r = P.talk('mira', { run: true }); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); return { ...r, room: P.here(), fail: game.flags.og_room ? null : 'valve room' }; }],
  ['three bleeds: each wheel opened as it kicks', () => {
    const G = game, V = G.rooms.valves, ch = G.story.cur, tries = [];
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
  ['out to the fortress shelter: Gilbert → chapter 11', () => {
    P.exitTo('valves-out'); P.exitTo('outdoor-office');
    const r = P.talk('gilbert', { run: true }); P.settle(); for (let i = 0; i < 30; i++) game.step(0.1); P.settle();
    return { r: r.r, thanks: !!game.flags.og_thanks, chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'survey' ? null : 'no chapter 11' };
  }],
];
