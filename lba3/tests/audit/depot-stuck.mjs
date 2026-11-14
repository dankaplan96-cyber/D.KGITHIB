// RELEASE-AUDIT v75: the Zeelich depot (chapter 3), where the playthrough bot ended a fight at (2411.6, 24.7) and could not
// plan a way to the locker ("go:stuck"). Steps as tests/playthrough/06-zeelich.mjs up to the fight; then, standing where the
// fight left him, a turn to 8 headings and Up held 0.8 s each (Classic: Up walks forward), the distance each moved, and
// the colliders within 2 m. Run: LOAD=<a chapter-3-start save> node tests/lib/seg.mjs tests/audit/depot-stuck.mjs
export const steps = [
  ['continue (arrival)', () => { P.settle(); return { started: game.flags.c2_started }; }],
  ['Baldino\'s workshop', () => {
    const Z = game.rooms.zeelich, d = Z.workshopDoor; const r = P.through(d.x, d.z, { run: true }); const t = P.talk('baldino');
    const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); return { r: r.to, t: t.r, plan: game.flags.c2_plan };
  }],
  ['depot fight', () => {
    const G = game, D = G.rooms.zeelich.depot;
    P.go(D.x - 4, D.z - 11, { tol: 1.5, run: true, fight: false });
    const f = P.fight({ maxT: 120, minHp: 2 });
    const assisted = G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(G.hero.pos) < 30) ? P.assistFight({}) : 0;
    const h = G.hero.pos; return { ...f, assisted, hp: G.hero.hp, at: [h.x, h.y, h.z].map((u) => +u.toFixed(2)), depot: { x: D.x, z: D.z }, locker: D.locker };
  }],
  ['mobility where he stands', () => {
    const G = game, h = G.hero, I = G.input, P0 = G.physics, out = [];
    h.hp = Math.max(h.hp, 5);
    const at0 = [h.pos.x, h.pos.z];
    for (let k = 0; k < 8; k++) {
      h.pos.set(at0[0], h.pos.y, at0[1]); h.angle = k * Math.PI / 4; h.resetMotion?.(); G.step(0.1);
      const x0 = h.pos.x, z0 = h.pos.z; I.keys.add('ArrowUp'); G.step(0.8); I.keys.delete('ArrowUp'); G.step(0.2);
      out.push(+(Math.hypot(h.pos.x - x0, h.pos.z - z0)).toFixed(2));
    }
    h.pos.set(at0[0], h.pos.y, at0[1]); G.step(0.1);
    const near = []; for (const c of P0.near(at0[0], at0[1])) if (c.enabled && Math.hypot(c.x - at0[0], c.z - at0[1]) < 3) near.push(`${c.type}${c.type === 'cyl' ? ' r' + c.r.toFixed(2) : ' ' + (2 * c.hw).toFixed(1) + 'x' + (2 * c.hd).toFixed(1)}@${c.x.toFixed(1)},${c.z.toFixed(1)} top ${c.top?.toFixed?.(1)}${c.name ? ' ' + c.name : ''}`);
    const moved = out.filter((d) => d > 0.5).length;
    return { at: at0.map((u) => +u.toFixed(2)), movedPerHeading: out, near, trapped: moved < 2 };
  }],
  ['mobility at (2411.6, 24.7), placed there (supplement)', () => {
    const G = game, h = G.hero, I = G.input, P0 = G.physics, out = [];
    h.hp = Math.max(h.hp, 5);
    const at0 = [2411.6, 24.7]; h.pos.set(at0[0], P0.groundAt(at0[0], at0[1], h.pos.y + 1), at0[1]); G.step(0.1);
    for (let k = 0; k < 8; k++) {
      h.pos.set(at0[0], h.pos.y, at0[1]); h.angle = k * Math.PI / 4; h.resetMotion?.(); G.step(0.1);
      const x0 = h.pos.x, z0 = h.pos.z; I.keys.add('ArrowUp'); G.step(0.8); I.keys.delete('ArrowUp'); G.step(0.2);
      out.push(+(Math.hypot(h.pos.x - x0, h.pos.z - z0)).toFixed(2));
    }
    h.pos.set(at0[0], h.pos.y, at0[1]); G.step(0.1);
    const near = []; for (const c of P0.near(at0[0], at0[1])) if (c.enabled && Math.hypot(c.x - at0[0], c.z - at0[1]) < 3) near.push(`${c.type}${c.type === 'cyl' ? ' r' + c.r.toFixed(2) : ' ' + (2 * c.hw).toFixed(1) + 'x' + (2 * c.hd).toFixed(1)}@${c.x.toFixed(1)},${c.z.toFixed(1)} top ${c.top?.toFixed?.(1)}${c.name ? ' ' + c.name : ''}`);
    const moved = out.filter((d) => d > 0.5).length;
    return { at: at0.map((u) => +u.toFixed(2)), movedPerHeading: out, near, trapped: moved < 2 };
  }],
  ['the locker from there (as the route does)', () => {
    const L = game.rooms.zeelich.depot.locker; const r = P.use(L.x, L.z, { near: 1.2, run: true }); P.wait(1.2); P.settle();
    return { ...r, cyl: game.flags.c2_cyl, fail: game.flags.c2_cyl ? null : 'locker' };
  }],
];
