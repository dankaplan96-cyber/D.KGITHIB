(async () => {
  // The battery profile's lamps on a walk (window.ROUTE, default street; 60 fps steps for NF frames): per pool light and
  // frame, its intensity and position. A "pop" is a light whose intensity changes by more than its lamp's intensity ×
  // (1/60 s ÷ FADE/2) × 1.5 (smoothstep's slope) × 1.1 in one frame, or that moves while lit. Also: how many lamp changes (a light taking another
  // lamp), and the lamps lit per frame.
  const G = game, LP = G.lightPool;
  const { FADE } = await import('/src/engine/lightpool.js');
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const NF = +(window.NF || 900), dt = 1 / 60; let t = 0;
  const prev = LP.lights.map((l) => ({ i: l.intensity, p: l.position.clone() }));
  let pops = 0, moves = 0, changes = 0, lit = 0, maxStep = 0; const ex = [];
  for (let i = 0; i < NF; i++) {
    t += dt; route.drive(t, dt); G.frame(dt, false);
    LP.lights.forEach((l, k) => {
      const P = prev[k], d = Math.abs(l.intensity - P.i), src = LP.slots?.[k]?.s, si = Math.max(src ? src.intensity : 0, P.si || 0), lim = si * (dt / (FADE / 2)) * 1.5 * 1.1 + 1e-6;   // (smoothstep's steepest slope is 1.5)
      if (l.intensity > 0) lit++;
      if (i > 0 && d > lim) { pops++; if (ex.length < 6) ex.push(`frame ${i} light ${k}: ${P.i.toFixed(2)} → ${l.intensity.toFixed(2)}`); }
      if (i > 0 && l.intensity > 0 && P.i > 0 && l.position.distanceTo(P.p) > 1e-3) { moves++; if (ex.length < 6) ex.push(`frame ${i} light ${k} moved while lit`); }
      if (i > 0 && P.i === 0 && l.intensity > 0) changes++;
      if (i > 0) maxStep = Math.max(maxStep, d / Math.max(1e-6, si || 1));
      P.i = l.intensity; P.p.copy(l.position); P.si = src ? src.intensity : 0;
    });
  }
  return `PROBE ${window.ROUTE || 'street'} · ${G.settings.quality} battery ${G.renderer.battery} fade ${LP.fade} · pool ${LP.lights.length} · ${NF} frames at 60 fps · lamps lit per frame ${(lit / NF).toFixed(2)} · lights taking a lamp ${changes} · pops ${pops} · moved while lit ${moves} · largest step ${(100 * maxStep).toFixed(1)} % of the lamp's intensity a frame${ex.length ? '\nPROBE ' + ex.join('\nPROBE ') : ''}`;
})()
