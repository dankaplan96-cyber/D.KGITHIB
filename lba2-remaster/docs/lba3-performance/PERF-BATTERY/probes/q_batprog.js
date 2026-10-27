(async () => {
  const G = game, R = G.renderer.renderer; await G.bench.prepareAreas();
  const out = {};
  for (const q of ['medium', 'high']) {
    G.settings.quality = q; G.applySettings();
    for (const bat of [true, false]) {
      const p0 = R.info.programs.length;
      G.setBattery(bat);
      await new Promise((r) => setTimeout(r, 300));
      const p1 = R.info.programs.length;
      for (const id of ['street', 'interior', 'arrival']) {
        const route = G.bench.routes().find((x) => x.id === id); G.state = 'play'; route.setup(); G.state = 'play';
        for (let i = 0; i < 100; i++) { route.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i % 10 === 9); }
      }
      out[`${q} battery ${bat}`] = { warmed: p1 - p0, compiledOnRoutes: R.info.programs.length - p1, profile: G.renderer.batteryProfile(), msaa: G.renderer.composer.renderTarget1.samples, type: R.shadowMap.type };
    }
  }
  return JSON.stringify(out, null, 1);
})()
