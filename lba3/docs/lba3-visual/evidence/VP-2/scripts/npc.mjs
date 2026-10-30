// VP-2 (LOAD=vp0-save-01, outdoors in the prologue): walk (Classic Up) and run (Athletic) straight at Zoé from 4 m,
// and walk at her 0.3 m off-centre; the centre distance per frame and a contact sheet. Then the talk prompt from 1.6 m
// and 1.2 m.
import { FRAME } from '../../VP-5/scripts/lib.mjs';
export default async ({ ev, seqFast, log }) => {
  const T = process.env.TAG || 'x';
  await ev(`window.__F = ${JSON.stringify(FRAME)}`);
  await ev(() => P.settle());
  // an open approach: the direction from Zoé (of 8) whose straight 4.5 m line is walkable and away from doors
  log('approach', JSON.stringify(await ev(() => {
    const n = P.npc('zoe'), doors = game.story.doors();
    let best = null;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4, x = n.pos.x + Math.sin(a) * 4.5, z = n.pos.z + Math.cos(a) * 4.5;
      const pl = P.plan(x, z, { tol: 0.3 }); if (!pl.ok) continue;
      let ok = true; for (let i = 1; i <= 18 && ok; i++) { const f = i / 18, px = n.pos.x + Math.sin(a) * 4.5 * f, pz = n.pos.z + Math.cos(a) * 4.5 * f; const g = game.physics.groundAt(px, pz, n.pos.y + 0.6); if (Math.abs(g - n.pos.y) > 0.4 || game.physics.blockedAt(px, pz, g, 0.4) && f > 0.25) ok = false; }
      const dd = Math.min(...doors.map((d) => Math.hypot(d.x - x, d.z - z)), 99);
      if (ok && (!best || dd > best.dd)) best = { a, dd };
    }
    window.__dir = best ? best.a : 0; return best;
  })));
  const runInto = async (name, { off = 0, run = false } = {}) => {
    log(name, JSON.stringify(await ev(([off, run]) => {
      const n = P.npc('zoe'), a = window.__dir, sx = Math.sin(a), sz = Math.cos(a);
      // 4 m out on the open side, offset sideways by `off`, facing along the line (past her centre by `off`)
      const ox = n.pos.x + sx * 4 + sz * off, oz = n.pos.z + sz * 4 - sx * off;
      P.go(ox, oz, { tol: 0.3 }); P.face(ox - sx * 4, oz - sz * 4);
      if (run) P.tap('F2'); else if (game.hero.behaviour !== 'normal') P.tap('F1');
      return { d: +Math.hypot(game.hero.pos.x - n.pos.x, game.hero.pos.z - n.pos.z).toFixed(2), npcR: n.radius, heroR: game.hero.radius };
    }, [off, run])));
    const r = await seqFast(`${name}-${T}`, 20, ({ i }) => { if (i < 16) game.input.keys.add('ArrowUp'); else game.input.keys.delete('ArrowUp'); game.step(1 / 10); const n = P.npc('zoe'), f = eval(window.__F); f.d = +Math.hypot(game.hero.pos.x - n.pos.x, game.hero.pos.z - n.pos.z).toFixed(2); return f; }, { follow: true, size: 240, label: (i, d) => `${i} d=${d.d} ${d.anim} ${d.spd}` });
    await ev(() => { P.release(); P.tap('F1'); P.settle(); });
    const ds = r.data.map((d) => d.d);
    log(name, 'min centre distance', Math.min(...ds), 'per frame', JSON.stringify(r.data.map((d) => [d.d, d.anim, d.spd])));
  };
  await runInto('walk-into-zoe');
  await runInto('run-into-zoe', { run: true });
  await runInto('walk-off-centre', { off: 0.3 });
  for (const dd of [1.6, 1.2]) {
    log('prompt at', dd, JSON.stringify(await ev((dd) => { const n = P.npc('zoe'), a = window.__dir; P.go(n.pos.x + Math.sin(a) * (dd + 0.8), n.pos.z + Math.cos(a) * (dd + 0.8), { tol: 0.2 }); P.face(n.pos.x, n.pos.z); const h = game.hero; for (let i = 0; i < 40 && Math.hypot(h.pos.x - n.pos.x, h.pos.z - n.pos.z) > dd; i++) { game.input.keys.add('ArrowUp'); game.step(1 / 30); } P.release(); game.step(0.1); return { d: +Math.hypot(h.pos.x - n.pos.x, h.pos.z - n.pos.z).toFixed(2), target: P.target()?.kind, prompt: document.querySelector('#prompt').textContent }; }, dd)));
  }
};
