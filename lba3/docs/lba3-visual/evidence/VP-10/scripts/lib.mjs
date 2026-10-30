// shared page-side probes for VP-0 scenarios
export const boxAt = (page, p, size, W, H) => page.evaluate(([p, size, W, H]) => {
  const v = new game.hero.pos.constructor(p[0], p[1], p[2]); v.project(game.camera);
  const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, s = Math.min(size, W, H);
  if (!(Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 && v.z < 1)) return null;
  return { x: Math.max(0, Math.min(W - s, x - s / 2)), y: Math.max(0, Math.min(H - s, y - s / 2)), width: s, height: s };
}, [p, size, W, H]);
// one frame's state: what the player sees in words
export const FRAME = `(() => { const h = game.hero, q = (s) => document.querySelector(s);
  const vis = (s) => { const e = q(s); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).opacity !== '0'; };
  return { t: +game.time.toFixed(2), st: game.state, anim: h.rig.anim, spd: +(h.speed || 0).toFixed(2), pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), ang: +h.angle.toFixed(2),
    fade: q('#fade').style.opacity, prompt: vis('#prompt') ? q('#prompt').textContent : '', trans: !!game.trans, room: game.room?.id ?? 'citadel' }; })()`;
// page-side: plan once to (tx, tz) with the harness's A*, then each call steers one frame like P.go (Classic keys)
export const DRIVE = `window.__drive = (tx, tz, tol = 0.6) => { const p = P.plan(tx, tz, { tol: 0.4 }); window.__D = { pts: p.pts, wi: 1, tx, tz, tol }; return p.ok; };
window.__driveStep = (dt = 1 / 15) => { const D = window.__D, h = game.hero, k = game.input.keys, norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  k.delete('ArrowLeft'); k.delete('ArrowRight'); k.delete('ArrowUp');
  if (D && Math.hypot(h.pos.x - D.tx, h.pos.z - D.tz) > D.tol) {
    while (D.wi < D.pts.length - 1 && Math.hypot(D.pts[D.wi].x - h.pos.x, D.pts[D.wi].z - h.pos.z) < 0.45) D.wi++;
    const w = D.pts[Math.min(D.wi, D.pts.length - 1)]; const diff = norm(Math.atan2(w.x - h.pos.x, w.z - h.pos.z) - h.angle);
    if (diff > 0.1) k.add('ArrowLeft'); else if (diff < -0.1) k.add('ArrowRight');
    if (Math.abs(diff) < (h.speed > 3.5 ? 0.22 : 0.32)) k.add('ArrowUp');
  }
  game.step(dt); return eval(window.__F); };`;
