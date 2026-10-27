(async () => {
  // Shader programs on battery (start the page with DESKTOP_BATTERY=1, as the desktop app on battery): programs ready at
  // the title, compiled on every benchmark route at each preset (every 10th frame drawn), and prepared at a power switch.
  const G = game, R = G.renderer.renderer, out = [`PROBE started on battery ${G.renderer.battery} · programs ${R.info.programs.length} after loading`];
  for (const q of (window.QS || 'medium,high,low').split(',')) {
    const p0 = R.info.programs.length;
    G.settings.quality = q; G.applySettings();
    await new Promise((r) => setTimeout(r, 300));
    const p1 = R.info.programs.length, per = {};
    for (const id of ['street', 'interior', 'combat', 'transition', 'arrival', 'hamalayi']) {
      const route = G.bench.routes().find((x) => x.id === id); if (!route) continue;
      const a = R.info.programs.length;
      G.state = 'play'; route.setup(); G.state = 'play';
      for (let i = 0; i < 150; i++) { route.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i % 10 === 9); }
      per[id] = R.info.programs.length - a;
    }
    out.push(`PROBE ${q} battery ${G.renderer.battery}: prepared at the preset change ${p1 - p0} · compiled on the routes ${JSON.stringify(per)} · pool ${G.lightPool.lights.length} fade ${G.lightPool.fade}`);
  }
  // a switch to mains and back at Medium
  G.settings.quality = 'medium'; G.applySettings(); await new Promise((r) => setTimeout(r, 300));
  for (const bat of [false, true]) {
    const p0 = R.info.programs.length; G.setBattery(bat); await new Promise((r) => setTimeout(r, 300)); const p1 = R.info.programs.length;
    const route = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; route.setup(); G.state = 'play';
    for (let i = 0; i < 100; i++) { route.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i % 10 === 9); }
    out.push(`PROBE switch to ${bat ? 'battery' : 'mains'} at medium: prepared ${p1 - p0} · compiled on the street after ${R.info.programs.length - p1} · pool ${G.lightPool.lights.length}`);
  }
  return out.join('\n');
})()
