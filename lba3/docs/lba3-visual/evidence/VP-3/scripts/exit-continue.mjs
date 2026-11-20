// VP-3 (LOAD=vp3-door.json, a save kept by exit-new.mjs 'before' a few metres from the front door): Continue —
// the first frames; then in through the door and out again by input, the same measures as exit-new.
import { FRAME } from '../../VP-5/scripts/lib.mjs';
import { MEAS } from './meas.mjs';
export default async ({ ev, shot, seq, log, W }) => {
  const T = process.env.TAG || 'x';
  await ev(`window.__F = ${JSON.stringify(FRAME)}; ${MEAS}`);
  for (const [dt, nm] of [[0, '0.0'], [0.1, '0.1'], [0.4, '0.5']]) {
    const m = await ev((dt) => { if (dt) game.step(dt); else game.camRig.update(0, game.hero.pos, game.hero.angle, false, null); return { ...eval(window.__F), ...window.__meas() }; }, dt);
    log(`continue +${nm}s`, JSON.stringify(m));
    await shot(`continue-${nm}s-${W}-${T}`);
  }
  await ev(() => P.settle());
  // into the house through its door, then straight back out (Classic keys, A* to the door)
  log('enter', JSON.stringify(await ev(() => { const r = P.enter('house'); P.settle(); return { r, room: game.room?.id }; })));
  const ex = await ev(() => { const e = game.room.exits.find((x) => !x.room); return [e.x, e.z]; });
  log(JSON.stringify(await ev((e) => { const r = P.go(e[0], e[1], { tol: 1.6 }); P.face(e[0], e[1]); return r; }, ex)));
  const r = await seq(`reexit-fade-${T}`, 28, () => { if (game.state === 'play') game.input.keys.add('ArrowUp'); game.step(1 / 20); const f = eval(window.__F); Object.assign(f, window.__meas()); return f; }, { full: true, cols: 4, label: (i, d) => `${i} ${d.room} fade ${d.fade || '-'} hero ${d.heroPx ?? '-'} veil ${d.veil ?? '-'}%` });
  log('re-exit', JSON.stringify(r.data.map((d) => [d.room, d.fade, d.trans, d.st, d.heroPx, d.veil, d.ownHouse])));
  await ev(() => { P.release(); for (let i = 0; i < 400 && (game.trans || game.state !== 'play'); i++) game.step(1 / 60); });
  for (const [dt, nm] of [[0, '0.0'], [1, '1.0']]) {
    const m = await ev((dt) => { game.step(dt); return { ...eval(window.__F), ...window.__meas() }; }, dt);
    log(`re-exit control +${nm}s`, JSON.stringify(m));
    await shot(`reexit-${nm}s-${W}-${T}`);
  }
};
