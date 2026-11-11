// RELEASE-AUDIT v75: Continue from the save made in the depot corner (tests/audit/depot-trap.mjs, KEEP): where does he
// stand, and can he walk (8 headings by turning and Up, then Down)?
export const steps = [
  ['continue', () => { P.settle(); const h = game.hero; return { chapter: game.flags.chapterKey, room: game.room?.id, at: [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(3)) }; }],
  ['walk out', () => {
    const G = game, h = G.hero, I = G.input;
    const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.3); };
    const at = [h.pos.x, h.pos.z], d = () => +Math.hypot(h.pos.x - at[0], h.pos.z - at[1]).toFixed(2), r = [];
    for (let k = 0; k < 8; k++) { hold(['ArrowLeft'], 0.35); hold(['ArrowUp'], 0.8); r.push(d()); }
    hold(['ArrowDown'], 1.0); r.push(d());
    return { moved: r, free: Math.max(...r) > 0.5 };
  }],
  ['a jump (Athletic) at 8 headings, then a dodge (X) at 8, health logged', () => {
    const G = game, h = G.hero, I = G.input;
    const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.3); };
    const at = [h.pos.x, h.pos.z], d = () => +Math.hypot(h.pos.x - at[0], h.pos.z - at[1]).toFixed(2), jumps = [], dodges = [];
    const foes = () => G.enemies.filter((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 12).map((e) => e.def?.id || e.kind);
    P.tap('F2', 0.2); for (let k = 0; k < 8; k++) { hold(['ArrowLeft'], 0.35); I.keys.add('ArrowUp'); P.tap('Space', 0.6); I.keys.delete('ArrowUp'); G.step(0.4); jumps.push(d() + '/hp' + h.hp); }
    P.tap('F1', 0.2); for (let k = 0; k < 8; k++) { hold(['ArrowLeft'], 0.35); P.tap('KeyX', 0.6); dodges.push(d() + '/hp' + h.hp); }
    return { jumps, dodges, foesNear: foes(), at: [h.pos.x, h.pos.z].map((u) => +u.toFixed(2)) };
  }],
];
