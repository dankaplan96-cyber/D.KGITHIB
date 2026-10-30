// VP-3 (new game): take the ball, walk out of the front door by input. A contact sheet of the exit (1/20 s, with the
// DOM fade), the measures per frame, full shots when control returns (+0, 0.5, 1, 4 s), then 2 m away (pop check).
// KEEP=… keeps a save made standing at the door (for exit-continue.mjs).
import { FRAME } from '../../VP-5/scripts/lib.mjs';
import { MEAS } from './meas.mjs';
export default async ({ ev, shot, seq, log, W }) => {
  const T = process.env.TAG || 'x';
  await ev(`window.__F = ${JSON.stringify(FRAME)}; ${MEAS}`);
  await ev(() => P.settle());
  const cb = await ev(() => { const s = game.room.searches[0]; return [s.x, s.z]; });
  log(JSON.stringify(await ev((c) => { P.go(c[0], c[1], { tol: 1.1, stopWhen: () => { const t = P.target(); return t && t.kind !== 'npc' && Math.hypot(game.hero.pos.x - c[0], game.hero.pos.z - c[1]) < 2.2; } }); P.face(c[0], c[1]); P.tap('KeyE', 0.1); P.settle(); return { ball: game.hero.hasBall }; }, cb)));
  const ex = await ev(() => { const e = game.room.exits.find((x) => !x.room); return [e.x, e.z]; });
  log(JSON.stringify(await ev((e) => { const r = P.go(e[0], e[1], { tol: 1.6 }); P.face(e[0], e[1]); return r; }, ex)));
  const r = await seq(`exit-fade-${T}`, 28, () => { if (game.state === 'play') game.input.keys.add('ArrowUp'); game.step(1 / 20); const f = eval(window.__F); Object.assign(f, window.__meas()); return f; }, { full: true, cols: 4, label: (i, d) => `${i} ${d.room} fade ${d.fade || '-'} hero ${d.heroPx ?? '-'} veil ${d.veil ?? '-'}%` });
  log('exit', JSON.stringify(r.data.map((d) => [d.room, d.fade, d.trans, d.st, d.heroPx, d.veil, d.ownHouse])));
  await ev(() => { P.release(); for (let i = 0; i < 400 && (game.trans || game.state !== 'play'); i++) game.step(1 / 60); });
  for (const [dt, nm] of [[0, '0.0'], [0.5, '0.5'], [0.5, '1.0'], [3, '4.0']]) {
    const m = await ev((dt) => { game.step(dt); return { ...eval(window.__F), ...window.__meas() }; }, dt);
    log(`control +${nm}s`, JSON.stringify(m));
    await shot(`door-out-${nm}s-${W}-${T}`);
  }
  // walk 2 m away from the door (Up), measures every 2/15 s: no pop larger than one step
  const w = await ev(() => { const out = []; for (let i = 0; i < 9; i++) { game.input.keys.add('ArrowUp'); game.step(2 / 15); out.push({ ...window.__meas(), pos: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(2)) }); } P.release(); P.settle(); return out; });
  log('walk away', JSON.stringify(w.map((m) => [m.veil, m.ownHouse, m.heroPx])));
  log('kept spot', JSON.stringify(await ev(() => ({ pos: [game.hero.pos.x, game.hero.pos.z], lastSafe: game.lastSafe }))));
};
