(async () => {
  // CPU per frame phase on a route (window.ROUTE, default street), every frame drawn, the GPU queue drained before
  // each frame (a 1-pixel read) so the software rasteriser's work for the last frame is not in this one's JS time.
  // Phases are timed by wrapping the game's own functions; three's internals by wrapping WebGLRenderer methods.
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const acc = new Map(), cur = new Map(), now = () => performance.now();
  const wrap = (obj, name, label) => {
    if (!obj || typeof obj[name] !== 'function') return;
    const f = obj[name];
    obj[name] = function (...a) { const t0 = now(); try { return f.apply(this, a); } finally { cur.set(label, (cur.get(label) || 0) + now() - t0); } };
  };
  const RR = G.renderer;
  wrap(RR, 'pre', 'render: pre (farCull, blobs)'); wrap(RR, 'mid', 'render: mid (drawBatch.watch)'); wrap(RR, 'post', 'render: post');
  wrap(RR.composer, 'render', 'render: composer (all passes)');
  wrap(R.shadowMap, 'render', 'render: shadow map (cache + live)');
  wrap(RR.scenePass, 'render', 'render: scene pass');
  wrap(RR.output, 'render', 'render: output pass');
  wrap(R, 'render', 'three render() calls');
  wrap(R, 'renderBufferDirect', 'three renderBufferDirect (incl. setProgram + uniforms)');
  wrap(G.camRig, 'update', 'sim: camRig.update');
  wrap(G, 'occluders', 'sim: occluders');
  wrap(G.world, 'update', 'sim: world.update');
  wrap(G.world, 'updateLod', 'sim: world.updateLod');
  wrap(G.lightPool, 'update', 'sim: lightPool.update');
  wrap(G.shadowCull, 'update', 'sim: shadowCull.update');
  wrap(G.env, 'update', 'sim: env.update');
  wrap(G.hero, 'update', 'sim: hero.update');
  wrap(G.gadgets, 'updateEnemies', 'sim: enemies');
  wrap(G.particles, 'update', 'sim: particles');
  wrap(G.hud, 'updateFloats', 'sim: hud.updateFloats');
  wrap(G.cues, 'update', 'sim: cues');
  wrap(G.story, 'update', 'sim: story.update');
  wrap(G.pickups, 'update', 'sim: pickups');
  wrap(G.behMenu, 'render', 'render: behMenu');
  for (const n of G.npcs) wrap(n, 'update', 'sim: npcs');
  wrap(G, 'updatePlay', 'sim: updatePlay (all)');
  wrap(G.hud, 'mapTick', 'sim: hud.mapTick'); wrap(G, 'findInteractable', 'sim: findInteractable'); wrap(G, 'giverInReach', 'sim: giverInReach');
  wrap(G.audio, 'updateSources', 'sim: audio.updateSources'); wrap(G, 'soundSources', 'sim: soundSources'); wrap(G.hud, 'stats', 'sim: hud.stats');
  wrap(G.hud, 'prompt', 'sim: hud.prompt'); wrap(G.audio, 'setOutdoorArea', 'sim: audio.setOutdoorArea'); wrap(G, 'checkDoors', 'sim: checkDoors');
  wrap(G.combatDir, 'update', 'sim: combatDir'); wrap(G.ball, 'update', 'sim: ball'); wrap(G.weapons, 'update', 'sim: weapons'); wrap(G.gadgets, 'update', 'sim: gadgets.update');
  wrap(G.targeting, 'update', 'sim: targeting'); wrap(G.bolts, 'update', 'sim: bolts'); wrap(G.hud, 'weapon', 'sim: hud.weapon'); wrap(G.world.zones, 'update', 'sim: zones');
  wrap(G, 'stableSpot', 'sim: stableSpot'); wrap(G.input, 'update', 'sim: input.update'); wrap(G, 'updateTransition', 'sim: updateTransition');
  const N = +(window.NF || 120), dt = 1 / 30;
  let t = 0;
  const frames = [];
  for (let i = 0; i < N + 30; i++) {
    t += dt; route.drive(t, dt);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    cur.clear();
    G.perf.beginFrame(); G._renderMs = 0;
    const t0 = now(); G.frame(dt, true); const ms = now() - t0;
    if (i >= 30) { frames.push({ ms, render: G._renderMs, calls: R.info.render.calls }); for (const [k, v] of cur) { let a = acc.get(k); if (!a) acc.set(k, (a = [])); a.push(v); } }
  }
  const med = (a) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.floor(v.length / 2)].toFixed(2); };
  const out = [`route ${window.ROUTE || 'street'} · ${G.settings.quality} · battery ${G.renderer.battery} · frames ${frames.length} · frame CPU p50 ${med(frames.map((f) => f.ms))} ms · render submit p50 ${med(frames.map((f) => f.render))} ms · calls p50 ${med(frames.map((f) => f.calls))}`];
  const mean = (a) => a.reduce((x, y) => x + y, 0) / frames.length;
  for (const [k, v] of [...acc].sort((a, b) => mean(b[1]) - mean(a[1]))) out.push(`${mean(v).toFixed(3).padStart(8)} mean · ${med(v.concat(Array(frames.length - v.length).fill(0))).toFixed(3).padStart(7)} p50 · ${Math.max(...v).toFixed(1).padStart(6)} max ms  ${k}`);
  return out.join('\n');
})()
