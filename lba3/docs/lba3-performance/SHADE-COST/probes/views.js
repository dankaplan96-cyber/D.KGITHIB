// SHADE-COST: the frozen views every probe uses (run.mjs puts this file in scope of the probe). The street as the
// benchmark's route sees it (outdoor(-42, 2), the benchmark's orbit camera) at 3 headings, and Twinsen's house's
// surroundings (Twinsen 5 m out of his door, the player's Follow camera at Far) at 2. Each view is set, simulated 1.5 s
// with its heading held every frame, then frozen (testFreeze).
// A view: [name, set(), tick()] — tick runs before every simulated frame.
const SC_VIEWS = (G) => {
  const street = (yaw) => [() => { G.bench.setCamera('orbit'); G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = yaw; },
    () => { G.camRig.yaw = yaw; G.hero.vel?.set(0, 0); }];
  const house = (turn) => {
    let a = 0;
    return [() => {
      const h = G.world.houses?.find((x) => x.id === 'twinsen');
      const d = h?.door, ry = h?.ry ?? 0;
      const x = d && d.z != null ? d.x + Math.sin(ry) * 5 : -50.6 + 9, z = d && d.z != null ? d.z + Math.cos(ry) * 5 : 79.8;
      a = ry + turn;
      G.bench.setCamera('follow'); G.exitRoom({ x, z, a }, true, true); G.bench.camera();
    }, () => { G.hero.angle = a; G.hero.vel?.set(0, 0); }];
  };
  return [['street-a', ...street(Math.PI / 4)], ['street-b', ...street(Math.PI / 4 + 1.1)], ['street-c', ...street(Math.PI / 4 - 1.6)],
    ['house-a', ...house(0)], ['house-b', ...house(Math.PI * 0.75)]];
};
// set a view and freeze it: 45 frames of 1/30 s simulated (the camera settles), nothing drawn but the last 4
const SC_SET = async (G, set, tick) => {
  set(); G.state = 'play';
  const RR = G.renderer, rr = RR.render;
  try {
    for (let i = 0; i < 45; i++) {
      RR.render = i < 41 ? () => {} : rr;
      G.doorCool = Math.max(G.doorCool || 0, 0.5);
      tick?.();
      G.testFreeze = false; try { G.advance(1 / 30); } finally { G.testFreeze = true; }
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
    }
  } finally { RR.render = rr; }
};
const SC_TERRAIN_MATS = (G) => { const s = new Set(); G.scene.traverse((o) => { if (o.name === 'terrain' && o.material) s.add(o.material); }); return [...s]; };
