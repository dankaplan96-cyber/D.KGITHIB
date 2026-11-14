// Chapter 1 (The Well), on the surface: the ball from the cupboard; the well; Mira won't open it for a "pipe fault"
// until Zoé's kettle crystals show it is the spring (the key); the lid rusted to the rim, kicked open (Aggressive);
// Xil's rope for Doran's stamp, Doran woken by the harbour bell (the magic ball); overhearing the kids in Discreet
// mode, Tim's confession; the warm stones on the bay rocks (Athletic jumps); down the well. New game (?nocine).
// (This route meets Mira before Zoé, the order that needs the walk back; tests/prologue.mjs plays the other order.)
export const steps = [
  ['intro', () => P.settle()],
  // CAMPAIGN-1 (hometap.js): the household problem first — the door waits for the tap, the tap is turned by hand (dry,
  // the pipe knocks), Arthur's cup carried from under the stove's overflow to the sink
  ['the door: the tap first', () => { const e = game.room.exits.find((x) => !x.room); P.tapFirst = false; const r = P.through(e.x, e.z); P.tapFirst = true; return { ...r, room: game.room?.id, fail: game.room?.id === 'house' && !game.flags.pr_tap ? null : 'left the house before the tap' }; }],
  ['the kitchen tap: dry, the pipe knocks', () => {
    const H = game.story.chapters[0].home.parts.house; const r = P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'h_tap' });
    for (let i = 0; i < 60 && !game.flags.pr_tap; i++) { game.step(0.25); P.settle(); }
    return { ...r, tap: !!game.flags.pr_tap, fail: game.flags.pr_tap ? null : 'tap not tried' };
  }],
  ["Arthur's cup: from the wrong pipe to the sink", () => {
    const H = game.story.chapters[0].home.parts.house; const r = P.use(H.stove.x, H.stove.z, { near: 1.2, kind: 'h_cup' });
    let carried = false;
    for (let i = 0; i < 80 && !game.flags.pr_cup; i++) { game.step(0.25); carried ||= !!H.carry; P.settle(); }
    const c = H.cup.position, d = Math.hypot(c.x - H.sinkAt.x, c.z - H.sinkAt.z);
    return { ...r, carried, cup: !!game.flags.pr_cup, d: +d.toFixed(2), fail: game.flags.pr_cup && carried && d < 0.05 ? null : 'cup not moved' };
  }],
  ['cupboard', () => { const s = game.room.searches[0]; const r = P.use(s.x, s.z); return { ...r, ball: game.hero.hasBall, fail: game.hero.hasBall ? null : 'no ball' }; }],
  ['out of the house', () => { const e = game.room.exits.find((x) => !x.room); const r = P.through(e.x, e.z); return { ...r, fail: r.to === 'citadel' ? null : 'still inside' }; }],
  // (the knocking followed: the garden standpipe as he steps out, the pipe at the pump room's door up the lane; no prompt)
  ['the yard: the garden pipe knocks', () => { const Y = game.story.chapters[0].home.parts.yard; P.go(Y.x - 0.9, Y.z + 0.8, { tol: 0.8 }); game.step(1.5); P.settle(); return { yard: !!game.flags.pr_yard, fail: game.flags.pr_yard ? null : 'yard pipe not heard' }; }],
  ['the lane: the pump room is shut, its pipe knocks', () => {
    const K = game.world.pumpKiosk; P.go(K.out.x + 0.4, K.out.z + 1.0, { tol: 0.9, run: true }); game.step(1.5); P.settle();
    const lane = !!game.flags.pr_lane; const r = P.use(K.door.x, K.door.z, { near: 1.0, kind: 'h_kiosk' });
    return { ...r, lane, room: game.room?.id || 'citadel', fail: lane && !game.room ? null : 'lane pipe' };
  }],
  ['look at the well', () => { const w = game.world.well; const r = P.use(w.x, w.z, { near: 2.0, run: true }); return { ...r, fail: game.flags.wellSeen ? null : 'well not seen' }; }],
  ['Gilbert and Mira: no key for a pipe fault', () => { const r = P.talk('gilbert', { run: true }); return { ...r, fail: game.flags.pr_miraNo && !game.flags.key ? null : 'no refusal' }; }],
  ['Zoé next door: the kettle crystals', () => { const r = P.talk('zoe', { run: true }); return { ...r, fail: game.flags.pr_kettle ? null : 'no kettle' }; }],
  ['Mira: the key', () => ({ ...P.talk('mira', { run: true }), fail: game.flags.key ? null : 'no key' })],
  ['the lid: rusted to the rim', () => { const w = game.world.well; const r = P.use(w.x, w.z, { near: 2.0 }); return { ...r, fail: game.flags.pr_lidStuck && !game.flags.pr_lidOpen ? null : 'lid' }; }],
  ['the lid: a kick (Aggressive)', () => {
    // (Aggressive: the well's prompt is a kick)
    const w = game.world.well, h = game.hero; P.tap('F3');
    const label = P.target()?.label;
    const r = P.use(w.x, w.z, { near: 2.0, kind: 'well' }); game.step(1.0); P.settle(); P.tap('F1');
    return { ...r, label, open: !!game.flags.pr_lidOpen, fail: game.flags.pr_lidOpen ? null : 'lid not open' };
  }],
  ['Xil', () => ({ ...P.talk('xil', { run: true }), fail: game.flags.metXil ? null : 'xil' })],
  ['Doran asleep', () => ({ ...P.talk('doran', { run: true }), fail: !game.flags.stamp && !game.flags.pr_bell ? null : 'awake already' })],
  ['the harbour bell: looked at', () => { const B = game.story.chapters[0].bell; const r = P.use(B.x, B.z - 0.8, { near: 1.6, kind: 'bell' }); return { ...r, fail: game.flags.pr_bellSeen ? null : 'bell not seen' }; }],
  ['the bell: the magic ball rings it, Doran stamps', () => {
    const B = game.story.chapters[0].bell;
    for (let k = 0; k < 5 && !game.flags.pr_bell; k++) { const a = -Math.PI / 2 + (k - 2) * 0.35; P.go(B.x - Math.sin(a) * 5, B.z - Math.cos(a) * 5, { tol: 0.6 }); P.throwAt(B.x, B.z); }
    P.wait(1.2); P.settle();
    return { bell: !!game.flags.pr_bell, stamp: !!game.flags.stamp, fail: game.flags.stamp ? null : 'no stamp' };
  }],
  ['Xil: the rope', () => ({ ...P.talk('xil', { run: true }), fail: game.flags.rope ? null : 'no rope' })],
  ['Tim and Lulu', () => P.talk('tim', { run: true })],
  ['overhear (Discreet)', () => { P.tap('F4'); const t = P.npc('tim'); P.go(t.pos.x + 6, t.pos.z, { tol: 1 }); P.settle(); P.go(t.pos.x, t.pos.z, { tol: 3 }); P.settle(); P.tap('F1'); return { overheard: game.flags.overheard, fail: game.flags.overheard ? null : 'not overheard' }; }],
  ['Tim confesses', () => ({ ...P.talk('tim'), fail: game.flags.timConfessed ? null : 'no confession' })],
  ['the clover Tim gives back', () => { const c = game.pickups.list.find((p) => p.type === 'clover' && !p.id); const n0 = game.hero.clovers; if (c) { P.go(c.pos.x, c.pos.z, { tol: 0.3 }); game.step(0.6); } return { found: !!c, clovers: [n0, game.hero.clovers] }; }],
  ['the bay rocks: looked at', () => { const b = game.story.chapters[0].bay[0]; const r = P.use(b.x + 1.8, b.z - 1.0, { near: 0.6, kind: 'rocks', run: true }); return { ...r, fail: r.target?.kind === 'rocks' ? null : 'rocks' }; }],
  ['the bay rocks: up (Athletic)', () => {
    const R = game.story.chapters[0].bay, h = game.hero, ys = [];
    for (let i = 0; i < R.length; i++) {
      let y = h.pos.y;
      for (let k = 0; k < 4 && Math.abs(h.pos.y - R[i].top) > 0.3; k++) {
        if (i > 0 && Math.abs(h.pos.y - R[i - 1].top) < 0.3) { const p = R[i - 1], a = Math.atan2(R[i].x - p.x, R[i].z - p.z); P.go(p.x - Math.sin(a) * 0.35, p.z - Math.cos(a) * 0.35, { tol: 0.2, maxT: 6, fight: false }); }
        y = P.hopTo(R[i].x, R[i].z, R[i].top, { walk: i === 0, from: i === 0 ? 1.9 : 1.6, brake: 0.6 });
      }
      ys.push(y);
    }
    P.tap('F1');
    return { ys, tops: R.map((r) => +r.top.toFixed(2)), fail: Math.abs(h.pos.y - R[2].top) < 0.3 ? null : 'not on top' };
  }],
  ['the warm stones', () => { const S = game.story.chapters[0].stones; const c0 = game.hero.coins; const r = P.use(S.x, S.z, { near: 0.4, kind: 'stones' }); return { ...r, coins: [c0, game.hero.coins], fail: game.flags.pr_stones ? null : 'no stones' }; }],
  ['down off the rocks', () => {
    // (a hop down each rock in turn, toward the sand, as a player steps off: the planner from the top rock can loop)
    const R = game.story.chapters[0].bay, h = game.hero;
    for (const i of [1, 0]) { const p = R[i]; P.go(p.x, p.z, { tol: 0.4, maxT: 8, fight: false }); }
    P.go(R[0].x + 2.6, R[0].z - 1.2, { tol: 0.6, maxT: 12, fight: false });
    const on = R.some((r) => Math.hypot(h.pos.x - r.x, h.pos.z - r.z) < r.r && Math.abs(h.pos.y - r.top) < 0.3);
    return { y: +h.pos.y.toFixed(2), fail: on ? 'still on the rocks' : null };
  }],
  ['down the well', () => { const w = game.world.well; const r = P.use(w.x, w.z, { near: 2.0, run: true }); return { ...r, fail: game.room?.id === 'well' ? null : 'not in the well' }; }],
];
