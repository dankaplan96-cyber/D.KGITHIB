// Chapter 11 of the expanded campaign (Under the Well, OREN-GUARDIAN OG-2 "The Fenced Square"; tests/oren-square.mjs is
// its full test). Gilbert asked for his well at the fortress shelter's door (segment 12b's end). Here: to the square's
// gate (Oren's condition through its lock: one cask a family, three must agree); Bram and the draw-off's lever, held
// through a drill stroke; Granny Ume's tonic from Mira's tap at the Water Office; Pico and the bell latch (the ball);
// the gate opens; Gilbert's board and Baldino's call; the spaceship to Zeelich → the network (chapters 12–13 still pass
// through), segment 13.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: P.here(), fail: game.flags.chapterKey === 'survey' ? null : 'not chapter 11' }; }],
  ["to the gate: Oren's condition", () => { const S = game.story.chapters.find((c) => c.key === 'survey'), p = S.at(0.4, 3.2); const r = P.go(p.x, p.z, { tol: 0.6, run: true }); P.settle(); for (let i = 0; i < 25; i++) game.step(0.1); P.settle(); return { r: r.r, met: !!game.flags.og2_met, fail: game.flags.og2_met ? null : 'gate' }; }],
  ['Bram', () => ({ ...P.talk('bram'), ask: !!game.flags.og2_bramAsk })],
  ["the draw-off's lever, held through a stroke", () => { const S = game.story.chapters.find((c) => c.key === 'survey'), lv = S.at(-1.95, 1.75); const r = P.use(lv.x, lv.z, { near: 0.6, kind: 'og2lever' }); for (let i = 0; i < 40; i++) game.step(0.1); P.settle(); return { r: r.r, bram: !!game.flags.og2_bram, fail: game.flags.og2_bram ? null : 'lever' }; }],
  ['Granny Ume', () => ({ ...P.talk('ume'), ask: !!game.flags.og2_umeAsk })],
  ["Mira's tap (the Water Office)", () => { const r = P.talk('mira', { run: true }); return { r: r.r, tonic: !!game.flags.og2_tonic, fail: game.flags.og2_tonic ? null : 'tonic' }; }],
  ['back to Ume: the tonic', () => { P.exitTo('outdoor-office'); const r = P.talk('ume', { run: true }); for (let i = 0; i < 30; i++) game.step(0.1); P.settle(); return { r: r.r, ume: !!game.flags.og2_ume, fail: game.flags.og2_ume ? null : 'ume' }; }],
  ['Pico', () => ({ ...P.talk('pico'), ask: !!game.flags.og2_picoAsk })],
  ['the bell latch (ball) → the gate opens', () => {
    const G = game, S = G.story.chapters.find((c) => c.key === 'survey'), b = S.ballTargets()[0];
    let tries = 0;
    for (; b && tries < 6 && !G.flags.og2_bell; tries++) { const a = 0.35 * (tries - 2); P.go(b.x + Math.sin(a) * 3.2, b.z + Math.cos(a) * 3.2, { tol: 0.4 }); P.face(b.x, b.z); P.tap('KeyF', 0.05); G.step(1.4); P.settle(); }
    for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
    return { tries, bell: !!G.flags.og2_bell, open: !!G.flags.og2_open, fail: G.flags.og2_open ? null : 'gate' };
  }],
  ["Gilbert: the board; Baldino's call", () => { const r = P.talk('gilbert', { run: true }); P.settle(); return { r: r.r, done: !!game.flags.og2_done, fail: game.flags.og2_done ? null : 'gilbert' }; }],
  ['the spaceship to Zeelich → the network', () => { const r = P.shipTo('citadel_port'); for (let i = 0; i < 40; i++) { game.step(0.1); P.settle(); } return { r: r.room ?? r.r, chapter: game.flags.chapterKey, room: P.here(), fail: game.flags.chapterKey === 'network' && game.flags.c10_started ? null : 'no network' }; }],
];
