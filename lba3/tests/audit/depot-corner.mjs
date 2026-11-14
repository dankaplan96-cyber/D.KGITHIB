// RELEASE-AUDIT v75: the Zeelich depot's corner by the locker (chapter 3), where a fight left the playthrough bot unable
// to move (tests/audit/depot-stuck.mjs). Here he walks INTO that corner by input from a few metres off, from several
// sides, and then tries to leave it every way a player can: Up after turning to 8 headings, Down (back-step), a jump
// in Athletic. Run: LOAD=<a chapter-3-start save> node tests/lib/seg.mjs tests/audit/depot-corner.mjs
export const steps = [
  ['continue (arrival)', () => { P.settle(); return { chapter: game.flags.chapterKey }; }],
  ['walk into the corner by the locker, then try to leave', () => {
  const G = game, h = G.hero, I = G.input, P0 = G.physics, res = [];
  const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.2); };
  const ways = [[-3, 0], [-2.5, -2], [0, -2.5], [-2, 1.5]];
  for (const [dx, dz] of ways) {
    const sx = 2411.6 + dx, sz = 24.7 + dz;
    h.pos.set(sx, P0.groundAt(sx, sz, 7), sz); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.behaviour = 'normal'; G.step(0.2);
    h.angle = Math.atan2(2411.9 - sx, 24.9 - sz); G.step(0.1);
    hold(['ArrowUp'], 2.5);
    const at = [h.pos.x, h.pos.z];
    const outs = [];
    for (let k = 0; k < 8; k++) { h.angle = k * Math.PI / 4; G.step(0.1); const x0 = h.pos.x, z0 = h.pos.z; hold(['ArrowUp'], 0.8); outs.push(+Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2)); h.pos.set(at[0], h.pos.y, at[1]); G.step(0.1); }
    const x1 = h.pos.x, z1 = h.pos.z; hold(['ArrowDown'], 0.8); const back = +Math.hypot(h.pos.x - x1, h.pos.z - z1).toFixed(2); h.pos.set(at[0], h.pos.y, at[1]); G.step(0.1);
    res.push({ from: [sx, sz].map((u) => +u.toFixed(1)), endedAt: at.map((u) => +u.toFixed(2)), up8: outs, back, free: outs.filter((d) => d > 0.5).length });
  }
    return { r: res, trapped: res.filter((q) => q.free < 2 && q.back < 0.5).length };
  }],
];
