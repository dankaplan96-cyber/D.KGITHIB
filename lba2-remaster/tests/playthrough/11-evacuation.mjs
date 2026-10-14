// Chapter 8 (Evacuation, Citadel): home to Zoé, Gilbert's tunnels, the fortress shelter's lever, the depot bunker's
// wheel (ball), Mira's water, Pippa's supplies, Zoé's run to the hill farms, the relay at the lighthouse, the
// control room, a project ship to Zeelich.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['home: Zoé', () => { const d = game.world.houses[0].door; P.enter('house', { run: true }); const r = P.talk('zoe'); return { ...r, home: game.flags.c8_home, fail: game.flags.c8_home ? null : 'home' }; }],
  ['Gilbert', () => ({ ...P.talk('gilbert', { run: true }), g: game.flags.c8_gilbert, fail: game.flags.c8_gilbert ? null : 'gilbert' })],
  ['the fortress lever', () => { const r = P.use(-33, -70, { run: true }); P.wait(1); P.settle(); return { ...r, fort: game.flags.c8_fort, fail: game.flags.c8_fort ? null : 'lever' }; }],
  ['the depot wheel (ball)', () => { const G = game, w = G.story.cur.wheelSpot; for (let k = 0; k < 8 && !G.flags.c8_depot; k++) { const a = k * 0.8; P.go(w.x - Math.sin(a) * 4, w.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(w.x, w.z); P.settle(); } return { depot: G.flags.c8_depot, fail: G.flags.c8_depot ? null : 'depot' }; }],
  ['Mira (Water Office)', () => ({ ...P.talk('mira', { run: true }), mira: game.flags.c8_mira, fail: game.flags.c8_mira ? null : 'mira' })],
  ['Pippa', () => { if (P.here() !== 'citadel') P.enter('citadel'); const r = P.talk('pippa', { run: true }); P.settle(); if (game.state === 'shop') P.tap('Escape', 0.2); P.settle(); return { ...r, pippa: game.flags.c8_pippa, fail: game.flags.c8_pippa ? null : 'pippa' }; }],
  ['Zoé starts her run', () => { const r = P.talk('zoe', { run: true }); P.wait(1); P.settle(); return { ...r, start: game.flags.c8_zoeStart, body: game.hero.body, fail: game.flags.c8_zoeStart ? null : 'zoe' }; }],
  ['the three farms', () => { for (const id of ['farmer1', 'farmer2', 'farmer3']) { P.talk(id, { run: true }); P.wait(1); P.settle(); } return { done: game.story.cur.farmsDone(), fail: game.story.cur.farmsDone() >= 3 ? null : 'farms' }; }],
  ['the lighthouse gathering', () => { const G = game; P.go(-66, -53, { tol: 2, run: true, maxT: 200 }); let t = 0; while (!G.flags.c8_relay && t < 20) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } P.settle(); return { relay: G.flags.c8_relay, body: G.hero.body, fail: G.flags.c8_relay ? null : 'relay' }; }],
  ['the control room', () => { P.enter('control', { run: true }); P.wait(0.5); P.settle(); return { vesk: game.flags.c8_vesk, fail: game.flags.c8_vesk ? null : 'control' }; }],
  ['a ship to Zeelich → chapter 9', () => { if (P.here() !== 'citadel') P.enter('citadel'); const F = game.world.pierStart; const r = P.use(F.x - 6, F.z, { run: true }); P.settle(60); P.settle(30); return { ...r, chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'council' ? null : 'no chapter 9' }; }],
];
