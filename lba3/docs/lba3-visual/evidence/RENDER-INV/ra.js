// RENDER-INV: in-page audit helpers (window.RA). Injected by the probes (audit.mjs, ab.mjs). Read-only except for
// the temporary renderBufferDirect / update wrappers it puts back itself.
// Every object is attributed to an AREA: 'citadel' (world.root), 'room:<id>' (a room or region group: interiors,
// Zeelich, the desert, …), 'actor:<here|away>' (people, enemies and their blob shadows, which live under the scene)
// or 'scene:<what>' (anything else directly under the scene: particles, the sky, the water, pickups, …).
(() => {
  const G = window.game;
  const lab = new Map();
  const relabel = () => {
    lab.clear();
    for (const [id, R] of Object.entries(G.rooms)) if (R?.group && !lab.has(R.group)) lab.set(R.group, 'room:' + id);
    lab.set(G.world.root, 'citadel');
  };
  relabel();
  const actorRoots = () => {
    const m = new Map();
    for (const a of [G.hero, ...G.npcs, ...G.enemies]) {
      if (!a?.rig?.root) continue;
      const here = a === G.hero || Math.hypot(a.pos.x - G.hero.pos.x, a.pos.z - G.hero.pos.z) < 300;
      const k = 'actor:' + (here ? 'here' : 'away');
      m.set(a.rig.root, k); if (a.shadow) m.set(a.shadow, k);
    }
    return m;
  };
  let AR = actorRoots();
  const areaOf = (o) => {
    for (let p = o; p; p = p.parent) {
      const l = lab.get(p) || AR.get(p); if (l) return l;
      if (p.parent && p.parent.isScene) return 'scene:' + (p.userData?.src || p.name || p.type);
    }
    return 'scene';
  };
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const tris = (g, o) => {
    const n = g.index ? g.index.count : g.attributes.position?.count || 0;
    const per = o.isInstancedMesh ? o.count : 1;
    return (n / 3) * per;
  };
  // bytes of a geometry's arrays not counted yet (terrain tiles share one set of attribute arrays: counted once)
  let seenBuf = new WeakSet();
  const gbytes = (g) => { let b = 0; for (const a of [...Object.values(g.attributes), g.index]) { const ab = a?.array?.buffer; if (!ab || seenBuf.has(ab)) continue; seenBuf.add(ab); b += ab.byteLength; } return b; };
  const add = (M, k, f, n = 1) => { let r = M.get(k); if (!r) M.set(k, (r = {})); r[f] = (r[f] || 0) + n; };

  // A/B: what each area has constructed (all of it, shown or not) and holds in memory
  function inventory() {
    AR = actorRoots(); seenBuf = new WeakSet();
    const M = new Map(), seenG = new Set(), seenT = new Set();
    G.scene.traverse((o) => {
      const a = areaOf(o);
      add(M, a, 'objects');
      if (shown(o)) add(M, a, 'shownObjects');
      if (o.isLight) add(M, a, 'lights');
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) {
        add(M, a, 'meshes');
        if (o.castShadow) add(M, a, 'casters');
        const g = o.geometry;
        if (g) { add(M, a, 'trisBuilt', tris(g, o)); if (!seenG.has(g)) { seenG.add(g); add(M, a, 'geoms'); add(M, a, 'geoMB', gbytes(g) / 1048576); } }
        for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap']) {
          const t = m?.[k]; if (t?.isTexture && !seenT.has(t)) { seenT.add(t); add(M, a, 'textures'); const im = t.image; if (im?.width) add(M, a, 'texMB', (im.width * im.height * 4 * 1.33) / 1048576); }
        }
      }
    });
    const out = {};
    for (const [k, v] of M) out[k] = Object.fromEntries(Object.entries(v).map(([f, n]) => [f, +n.toFixed(f.endsWith('MB') ? 1 : 0)]));
    return out;
  }
  // a coarse grouping for reports: Citadel, the room/region played now, other rooms/regions, actors here/away, the rest
  function bucket(k) {
    const cur = G.room ? 'room:' + G.room.id : 'citadel';
    if (k === cur) return 'CURRENT(' + k + ')';
    if (k === 'citadel') return 'citadel (not current)';
    if (k.startsWith('room:')) return 'other rooms/regions';
    if (k.startsWith('actor:')) return k;
    return 'scene-level (sky, water, fx, pickups)';
  }
  function sumBuckets(inv) {
    const out = {};
    for (const [k, v] of Object.entries(inv)) { const b = bucket(k); out[b] ??= {}; for (const [f, n] of Object.entries(v)) out[b][f] = +((out[b][f] || 0) + n).toFixed(1); }
    return out;
  }

  // C/D/E/F: one rendered frame (or `n`), attributed. Times are CPU (performance.now); the GPU queue is drained
  // first (readPixels) so a frame's own CPU time is not charged with the previous frame's software-GPU work.
  function frameCost({ n = 10, dt = 1 / 30, drive = null } = {}) {
    AR = actorRoots(); relabel();
    const R = G.renderer.renderer, gl = R.getContext(), px = new Uint8Array(4);
    const draws = new Map();
    const orig = R.renderBufferDirect;
    let on = false;
    R.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
      if (on) { const a = areaOf(obj), p = scene ? 'main' : 'shadow'; add(draws, a, p); add(draws, a, p + 'Tris', grp ? grp.count / 3 : tris(geo, obj)); }
      return orig.call(this, cam, scene, geo, mat, obj, grp);
    };
    // simulation split: Citadel's updaters (world.update), the room's updaters, people, enemies, env, the rest
    const T = { worldUpdate: 0, roomUpdaters: 0, npcs: 0, enemies: 0, env: 0, shadowCull: 0, lightPool: 0, rigUpdates: 0 };
    const restore = [];
    const wrap = (obj, key, bucketName, count) => { const f = obj[key]; obj[key] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { T[bucketName] += performance.now() - t0; if (count) T[count] = (T[count] || 0) + 1; } }; restore.push(() => { obj[key] = f; }); };
    wrap(G.world, 'update', 'worldUpdate');
    wrap(G.env, 'update', 'env');
    wrap(G.shadowCull, 'update', 'shadowCull');
    wrap(G.lightPool, 'update', 'lightPool');
    const npcHere = { n: 0, away: 0 };
    for (const a of G.npcs) { const f = a.update; a.update = function (...x) { const t0 = performance.now(); try { return f.apply(this, x); } finally { T.npcs += performance.now() - t0; if (this.present && !this.controlled) { if (Math.hypot(this.pos.x - G.hero.pos.x, this.pos.z - G.hero.pos.z) < 300) npcHere.n++; else npcHere.away++; } } }; const own = Object.prototype.hasOwnProperty.call(a, 'update') ? f : null; restore.push(() => { if (own) a.update = own; else delete a.update; }); }
    for (const e of G.enemies) { const f = e.update; e.update = function (...x) { const t0 = performance.now(); try { return f.apply(this, x); } finally { T.enemies += performance.now() - t0; } }; const own = Object.prototype.hasOwnProperty.call(e, 'update') ? f : null; restore.push(() => { if (own) e.update = own; else delete e.update; }); }
    const RU = G.room?.updaters;
    if (RU) for (let i = 0; i < RU.length; i++) { const f = RU[i]; RU[i] = (...x) => { const t0 = performance.now(); try { return f(...x); } finally { T.roomUpdaters += performance.now() - t0; } }; restore.push(() => { RU[i] = f; }); }
    // rig updates (skeletal animation): every Rig.update call
    let rigN = 0; const rigs = new Set();
    for (const a of [G.hero, ...G.npcs, ...G.enemies]) { const r = a?.rig; if (!r || rigs.has(r)) continue; rigs.add(r); const f = r.update; r.update = function (...x) { rigN++; const t0 = performance.now(); try { return f.apply(this, x); } finally { T.rigUpdates += performance.now() - t0; } }; const own = Object.prototype.hasOwnProperty.call(r, 'update') ? f : null; restore.push(() => { if (own) r.update = own; else delete r.update; }); }
    const frames = [];
    try {
      for (let i = 0; i < n + 3; i++) {
        drive?.(i * dt, dt);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const measure = i >= 3; on = measure; rigN = 0; npcHere.n = 0; npcHere.away = 0;
        for (const k in T) T[k] = 0;
        G.perf.beginFrame(); G._renderMs = 0;
        const t0 = performance.now(); G.frame(dt, true); const t1 = performance.now();
        on = false;
        if (measure) frames.push({ total: t1 - t0, render: G._renderMs, sim: t1 - t0 - G._renderMs, calls: R.info.render.calls, tris: R.info.render.triangles, shadowCalls: G.perf.shadow, rigN, npcHere: npcHere.n, npcAway: npcHere.away, ...T });
      }
    } finally { R.renderBufferDirect = orig; for (const f of restore.reverse()) f(); }
    const med = (k) => { const v = frames.map((f) => f[k]).sort((a, b) => a - b); return +v[v.length >> 1].toFixed(2); };
    const keys = Object.keys(frames[0]);
    const per = {}; for (const [a, v] of draws) per[a] = Object.fromEntries(Object.entries(v).map(([f, x]) => [f, Math.round(x / n)]));
    // lights on in this frame, by type; shadow-casting lights; the light pool
    const lights = {}; G.scene.traverseVisible((o) => { if (o.isLight && o.intensity > 0) { const k = o.type + (o.castShadow ? '+shadow' : ''); lights[k] = (lights[k] || 0) + 1; } });
    // what the per-frame scene walk visits (three's matrix update + projectObject only enter shown subtrees since PERF-2)
    let visitedShown = 0; G.scene.traverseVisible(() => { visitedShown++; });
    let all = 0; G.scene.traverse(() => { all++; });
    return { med: Object.fromEntries(keys.map((k) => [k, med(k)])), drawsByArea: per, lights, visitedShown, sceneObjects: all,
      mem: { ...R.info.memory, programs: R.info.programs.length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null },
      room: G.room?.id || 'citadel', state: G.state, quality: G.settings.quality, worldUpdaters: G.world.updaters.length, roomUpdaters: G.room?.updaters?.length || 0,
      npcsPresent: G.npcs.filter((x) => x.present).length, npcsTotal: G.npcs.length, enemiesTotal: G.enemies.length };
  }
  window.RA = { inventory, sumBuckets, frameCost, areaOf, relabel };
})();
