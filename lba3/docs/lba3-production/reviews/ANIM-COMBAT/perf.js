// ANIM-COMBAT cost probe (page expression for a Playwright evaluate in the developer arena): the hero rig's update
// time per frame with foot planting on and off, standing in his stance and through a sword strike (CPU, median and
// 95th percentile over many calls; performance.now() resolution limits single calls, so blocks of 20 are timed).
(() => {
  const G = game, h = G.hero, r = h.rig, out = {};
  for (const e of G.enemies) e.setPresent?.(false);
  h.pos.set(6194, G.physics.groundAt(6194, 4), 4); h.angle = 0; h.vel.set(0, 0); G.resetCombat(); G.state = 'play';
  for (let i = 0; i < 60; i++) G.frame(1 / 60, false);
  const time = (label, anim, plant) => {
    r.footPlant = plant; r.play(anim); const xs = [];
    for (let b = 0; b < 150; b++) {
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) { r.root.position.copy(h.pos); r.plantFrame = true; if (r.actionT > 0.6) r.actionT = 0; r.update(1 / 60, 0); }
      xs.push((performance.now() - t0) / 20);
    }
    xs.sort((a, b) => a - b);
    out[label] = { medianMs: +xs[75].toFixed(4), p95Ms: +xs[142].toFixed(4) };
  };
  r.guard = true; r.guardKind = 'sword'; r.atk = { s: 0.11, a: 0.1, r: 0.22 };
  time('stance, planting', 'idle', true); time('stance, no planting', 'idle', false);
  time('slash1, planting', 'slash1', true); time('slash1, no planting', 'slash1', false);
  r.footPlant = true; r.atk = null; r.guard = false;
  return out;
})()
