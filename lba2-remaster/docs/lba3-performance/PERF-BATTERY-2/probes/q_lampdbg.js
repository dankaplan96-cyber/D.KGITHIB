(async () => {
  // debug: the battery pool's slots on a walk, every 20th frame
  const G = game, LP = G.lightPool, out = [];
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'interior')); G.state = 'play'; route.setup(); G.state = 'play';
  const ids = new Map(); const id = (s) => { if (!s) return '-'; if (!ids.has(s)) ids.set(s, ids.size); return ids.get(s); };
  let t = 0;
  for (let i = 0; i < 600; i++) {
    t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, false);
    if (i % 20 === 0 && i >= 380) out.push(`PROBE f${i} time ${G.time.toFixed(2)} state ${G.state} trans ${!!G.trans} hero ${G.hero.pos.x.toFixed(1)},${G.hero.pos.z.toFixed(1)} · slots ${(LP.slots || []).map((x) => `${id(x.s)}:${x.w.toFixed(2)}`).join(' ')} · lights ${LP.lights.map((l) => l.intensity.toFixed(2)).join(' ')} · lit sources ${LP.sources.filter((s) => s.intensity > 0).length}`);
  }
  return out.join('\n');
})()
