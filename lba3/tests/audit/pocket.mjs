// RELEASE-AUDIT v75: is a spot where the playthrough bot stalled a trap for a player? PT=x,z (Citadel outdoors, or the
// current outdoor room). He walks into the spot by input from 3 m off on 8 sides (Up held 2.5 s toward it), and from where
// each walk ends tries to leave: a turn to 8 headings and Up 0.8 s each, then Down 1 s. Moving under 0.5 m every way =
// trapped. Run: LOAD=<save> PT=x,z node tests/lib/seg.mjs tests/audit/pocket.mjs
const PT = (process.env.PT || '0,0').split(',').map(Number);
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id || 'citadel' }; }],
  ['walk in from 8 sides, then try to leave', ([px, pz]) => {
    const G = game, h = G.hero, I = G.input, P0 = G.physics, res = [];
    const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.2); };
    const gy = P0.groundAt(px, pz);
    for (let w = 0; w < 8; w++) {
      const b = w * Math.PI / 4, sx = px - Math.sin(b) * 3, sz = pz - Math.cos(b) * 3, g = P0.groundAt(sx, sz, gy + 1.5);
      if (P0.blockedAt(sx, sz, g + 0.3, 0.4) || Math.abs(g - gy) > 1.5) { res.push({ side: w, skip: 'start blocked' }); continue; }
      h.pos.set(sx, g, sz); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.hp = h.maxHp; G.step(0.2); h.angle = b; G.step(0.1);
      hold(['ArrowUp'], 2.5);
      const at = [h.pos.x, h.pos.z], outs = [];
      for (let k = 0; k < 8; k++) { h.angle = k * Math.PI / 4; G.step(0.1); const x0 = h.pos.x, z0 = h.pos.z; hold(['ArrowUp'], 0.8); outs.push(+Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2)); h.pos.set(at[0], h.pos.y, at[1]); G.step(0.1); }
      const x1 = h.pos.x, z1 = h.pos.z; hold(['ArrowDown'], 1.0); const back = +Math.hypot(h.pos.x - x1, h.pos.z - z1).toFixed(2);
      res.push({ side: w, endedAt: at.map((u) => +u.toFixed(2)), up8: outs, back, trapped: outs.every((d) => d < 0.5) && back < 0.5 });
    }
    return { sides: res.map((r) => r.skip ? r.side + ":skip" : r.side + ":" + (r.trapped ? "TRAPPED@" + r.endedAt : "free")), trapped: res.filter((r) => r.trapped).length };
  }, PT],
];
