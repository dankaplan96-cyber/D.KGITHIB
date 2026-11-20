// RELEASE-AUDIT v75: the Zeelich depot corner trap (chapter 3; tests/audit/depot-corner.mjs). He walks into the corner
// between the fence and the crate by the locker from 3 m west (Up held 2.5 s), then tries every way out a player has:
// Up after a turn to 8 headings, Down, a jump in Athletic (F2, Space) at 8 headings, a roll/dodge (X). With KEEP=<file>
// the segment ends with Save & quit (the game's own save), and tests/audit/depot-trap-load.mjs Continues from it.
export const steps = [
  ['continue (arrival)', () => { P.settle(); return { chapter: game.flags.chapterKey }; }],
  ['walk into the corner from 3 m west', () => {
    const G = game, h = G.hero, I = G.input, P0 = G.physics;
    const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.2); };
    const sx = 2408.6, sz = 24.7;
    h.pos.set(sx, P0.groundAt(sx, sz, 7), sz); h.vy = 0; h.onGround = true; h.resetMotion?.(); G.step(0.2);
    h.angle = Math.PI / 2; G.step(0.1);
    hold(['ArrowUp'], 2.5);
    return { at: [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(3)), state: G.state, hp: h.hp };
  }],
  ['every way out', () => {
    const G = game, h = G.hero, I = G.input;
    const hold = (keys, s) => { for (const k of keys) I.keys.add(k); G.step(s); for (const k of keys) I.keys.delete(k); G.step(0.3); };
    const at = [h.pos.x, h.pos.z], d = () => +Math.hypot(h.pos.x - at[0], h.pos.z - at[1]).toFixed(2), r = {};
    r.turnThenUp = []; for (let k = 0; k < 8; k++) { hold(['ArrowLeft'], 0.35); hold(['ArrowUp'], 0.8); r.turnThenUp.push(d()); }
    r.down = (hold(['ArrowDown'], 1.0), d());
    P.tap('F2', 0.2); r.jumps = []; for (let k = 0; k < 8; k++) { hold(['ArrowLeft'], 0.35); I.keys.add('ArrowUp'); P.tap('Space', 0.6); I.keys.delete('ArrowUp'); G.step(0.4); r.jumps.push(d()); }
    P.tap('F1', 0.2); r.dodge = []; for (let k = 0; k < 4; k++) { hold(['ArrowLeft'], 0.7); P.tap('KeyX', 0.6); r.dodge.push(d()); }
    r.after = [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(2));
    const free = Math.max(...r.turnThenUp, r.down, ...r.jumps, ...r.dodge) > 0.5;
    return { ...r, free, fail: null };
  }],
];
