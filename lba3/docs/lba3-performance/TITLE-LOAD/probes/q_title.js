(async () => {
  // TITLE-LOAD: the title screen's live view — the camera going round Citadel at 110 m, 42 m up (main.js titleCamera:
  // a = time·0.05 + 2.2, one circle in 125.7 s) — angle by angle. For each angle, one frame as the game draws it (render
  // only, the clock frozen): calls and triangles of the main pass and of the shadow pass, by benchgpu.js group and by
  // object; for the main pass, the triangles whose bounds lie wholly beyond the fog's end in view depth (three's linear
  // fog: drawn in the fog's colour, which is the background's) — per instance for instanced and batched draws — and the
  // draws whose material has no fog. With W_VARS (ids below, '|'-separated): the same frame again with each variant on,
  // its counts and the differing pixels against the base frame (same state, same frame). W_SHOTS=1: PNGs per angle and
  // variant (OUTDIR). W_ANGLES=12 (evenly over the circle) or W_TIMES='0,20,40' (title seconds).
  const G = game, R = G.renderer.renderer, RR = G.renderer, W = G.world;
  const THREE = await import('three');
  const { gpuGroupOf } = await import('/src/engine/benchgpu.js');
  const N = +(window.ANGLES || 12), PERIOD = (2 * Math.PI) / 0.05;
  const TIMES = window.TIMES ? String(window.TIMES).split(',').map(Number) : Array.from({ length: N }, (_, k) => +((k * PERIOD) / N).toFixed(2));
  const VARS = String(window.VARS || '').split('|').filter(Boolean);
  const DC = await import('/src/engine/drawcull.js');
  const VARIANTS = {
    // TITLE-LOAD's fog-depth cull off (as before), and its caster part alone off
    fogOff: { apply: () => { DC.FOGCULL.on = false; }, undo: () => { DC.FOGCULL.on = true; } },
    // the hero and the enemies whose bodies have never been placed (their rig still at the world's origin) hidden
    originOff: { apply: (G) => { G._oh = []; for (const a of [G.hero, ...G.enemies]) { const r = a.rig?.root || a.group; if (r && r.visible && r.position.lengthSq() === 0) { r.visible = false; G._oh.push(r); } } }, undo: (G) => { for (const r of G._oh) r.visible = true; } },
    // (TITLE-LOAD: the bodies never placed shown again, as before: drawcull.js hideUnplaced off)
    unplacedShown: { apply: (G) => { G.farCull.unplaced = false; }, undo: (G) => { G.farCull.unplaced = true; } },
    castersOff: { apply: (G) => { G.boxCull.casters = false; }, undo: (G) => { G.boxCull.casters = true; } },
    // the camera's far plane at the fog's end (+1 m): everything beyond is the fog's colour anyway
    farFog: { apply: (G) => { G._f0 = G.camera.far; G.camera.far = G.scene.fog.far + 1; G.camera.updateProjectionMatrix(); }, undo: (G) => { G.camera.far = G._f0; G.camera.updateProjectionMatrix(); } },
    ...(window.__titleVariants || {}),
  };
  const own = (o) => { let s = null, n = null; for (let q = o; q && q !== G.scene; q = q.parent) { s ??= q.userData?.src; if (!n && q.name && !/^(shadowBatch|drawBatch)$/.test(q.name)) n = q.name; } return `${o.name === 'shadowBatch' ? 'shadowBatch' : o.userData?.drawBatch ? 'drawBatch' : o.isBatchedMesh ? 'BatchedMesh' : o.isInstancedMesh ? 'Instanced' : o.isSkinnedMesh ? 'Skinned' : o.type}:${n || '?'}${s ? '@' + s : ''}`; };
  const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere(), _bx = new THREE.Box3();
  const trisOf = (geo, obj, group) => { if (obj.isBatchedMesh) { let n = 0; const C = obj._multiDrawCounts; for (let i = 0; i < obj._multiDrawCount; i++) n += C[i]; return n / 3; }
    const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; return Math.min(c, geo.drawRange.count) / 3; };
  let tally = null, fogFar = 0;
  // view depth of a world sphere's nearest point (camera looks down -z)
  const depthMin = (cam, s) => -(_v.copy(s.center).applyMatrix4(cam.matrixWorldInverse).z) - s.radius;
  const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (tally && (scene === null || scene === G.scene)) {
      const pass = scene === null ? 'S' : 'M', g = gpuGroupOf(G, obj, mat), t1 = trisOf(geo, obj, group), n = obj.isInstancedMesh ? obj.count : 1;
      const e = (tally.g[pass + ' ' + g] ??= [0, 0]); e[0]++; e[1] += t1 * n;
      const k = pass + ' ' + own(obj); const o2 = (tally.o[k] ??= [0, 0, 0]); o2[0]++; o2[1] += t1 * n;
      if (pass === 'M') {
        _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
        let beyond = 0;
        if (obj.isInstancedMesh) {
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          for (let i = 0; i < obj.count; i++) { obj.getMatrixAt(i, _m); _m.premultiply(obj.matrixWorld); _sp.copy(geo.boundingSphere).applyMatrix4(_m); if (depthMin(cam, _sp) > fogFar) beyond += t1; }
        } else if (obj.isBatchedMesh) {
          const I = obj._instanceInfo || [];
          for (let i = 0; i < I.length; i++) { const f = I[i]; if (!f || !f.active || !f.visible) continue; const gi = f.geometryIndex; obj.getMatrixAt(i, _m); _m.premultiply(obj.matrixWorld); obj.getBoundingSphereAt(gi, _sp); _sp.applyMatrix4(_m);
            if (obj.perObjectFrustumCulled && !_fr.intersectsSphere(_sp)) continue; const r = obj._geometryInfo[gi]; const tt = (r.reservedIndexCount >= 0 && r.indexCount ? r.indexCount : r.vertexCount) / 3; if (depthMin(cam, _sp) > fogFar) beyond += tt; }
        } else {
          if (!geo.boundingBox) geo.computeBoundingBox();
          _bx.copy(geo.boundingBox).applyMatrix4(obj.matrixWorld); _bx.getBoundingSphere(_sp);
          // (the box's corners: the nearest view depth of the box itself, not its sphere)
          let dmin = Infinity; for (let c = 0; c < 8; c++) { _v.set(c & 1 ? _bx.max.x : _bx.min.x, c & 2 ? _bx.max.y : _bx.min.y, c & 4 ? _bx.max.z : _bx.min.z).applyMatrix4(cam.matrixWorldInverse); dmin = Math.min(dmin, -_v.z); }
          if (dmin > fogFar) beyond = t1;
        }
        o2[2] += beyond; tally.beyond += beyond;
        if (mat.fog === false || (mat.isShaderMaterial && !mat.fog)) { const f = (tally.nofog[own(obj) + ' ' + (mat.name || mat.type)] ??= [0, 0]); f[0]++; f[1] += t1 * n; }
      }
    }
    return rbd.apply(this, arguments);
  };
  const gl = R.getContext();
  const snapBuf = () => { const Wd = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(Wd * H * 4); R.setRenderTarget(null); gl.readPixels(0, 0, Wd, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return { Wd, H, px }; };
  const png = ({ Wd, H, px }) => { const cv = document.createElement('canvas'); cv.width = Wd; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(Wd, H);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * Wd * 4, (H - y) * Wd * 4), y * Wd * 4);
    for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255; cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
  const diff = (a, b) => { let d = 0, mx = 0; for (let i = 0; i < a.px.length; i += 4) { const m = Math.max(Math.abs(a.px[i] - b.px[i]), Math.abs(a.px[i + 1] - b.px[i + 1]), Math.abs(a.px[i + 2] - b.px[i + 2])); if (m) { d++; if (m > mx) mx = m; } } return { d, mx }; };
  const place = (s) => {
    G.time = s; G.titleCamera(0); G.camera.position.copy(G.camRig.override.pos); G.camera.lookAt(G.camRig.override.look); G.camera.updateMatrixWorld();
    // (TITLE-LOAD's visible options, from the page's switches: ?titlefar= the fog's end, ?titlelod= the detail levels' focus)
    const q = new URLSearchParams(location.search); if (q.has('titlefar')) G.scene.fog.far = Math.min(G.env.fogRange[1], +q.get('titlefar'));
    W.updateLod(G.titleLodFocus ? G.titleLodFocus() : G.camera.position); G.lightPool.update(G.camera.position, G.time);
    G.shadowCull.update(G.world.root, G.camera, G.hero.pos);
  };
  const frame = () => { tally = { g: {}, o: {}, beyond: 0, nofog: {} }; fogFar = G.scene.fog.far; RR.render(); const T = tally; tally = null; return T; };
  const sum = (T, p) => Object.entries(T.g).filter(([k]) => k[0] === p).reduce((s, [, v]) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
  const k1 = (x) => (x / 1000).toFixed(0) + 'k';
  const out = { __images: {}, lines: [], per: [] };
  out.lines.push(`title view: ${G.renderer.renderer.domElement.width}×${G.renderer.renderer.domElement.height}, pixel ratio ${R.getPixelRatio()}, ${G.autoQ?.on() ? 'Auto ' + G.autoQ.label() : G.settings.quality}, battery ${G.renderer.battery}, fog ${G.scene.fog.near}–${G.scene.fog.far} m, camera far ${G.camera.far} m, shadows ${R.shadowMap.enabled}`);
  for (const s of TIMES) {
    place(s); RR.render(); place(s);   // (a first frame of this view: the shadow batches, the cache and the pools settle)
    const T = frame(); const base = snapBuf();
    const M = sum(T, 'M'), S = sum(T, 'S');
    const a = ((s * 0.05 + 2.2) * 180 / Math.PI) % 360, p = G.camera.position;
    const rec = { t: s, angleDeg: +a.toFixed(0), cam: [p.x, p.y, p.z].map((v) => +v.toFixed(1)), main: { calls: M[0], tris: Math.round(M[1]) }, shadow: { calls: S[0], tris: Math.round(S[1]) }, beyondFogTris: Math.round(T.beyond),
      groups: Object.fromEntries(Object.entries(T.g).map(([k, v]) => [k, [v[0], Math.round(v[1])]])), vars: {} };
    out.lines.push(`t ${s} s (camera at ${rec.angleDeg}°): main ${M[0]} calls ${k1(M[1])} · shadow ${S[0]} calls ${k1(S[1])} · main triangles wholly beyond the fog ${k1(T.beyond)} (${(100 * T.beyond / Math.max(1, M[1])).toFixed(1)} %)`);
    out.lines.push('   groups: ' + Object.entries(T.g).filter(([k]) => k[0] === 'M').sort((x, y) => y[1][1] - x[1][1]).map(([k, v]) => `${k.slice(2)} ${v[0]}/${k1(v[1])}`).join(' · '));
    if (window.OWNERS) out.lines.push('   top objects (calls/tris/beyond fog): ' + Object.entries(T.o).filter(([k]) => k[0] === 'M').sort((x, y) => y[1][1] - x[1][1]).slice(0, +window.OWNERS).map(([k, v]) => `${k.slice(2)} ${v[0]}/${k1(v[1])}/${k1(v[2])}`).join(' · '));
    if (window.SOWNERS) out.lines.push('   shadow pass objects (calls/tris): ' + Object.entries(T.o).filter(([k]) => k[0] === 'S').sort((x, y) => y[1][1] - x[1][1]).slice(0, +window.SOWNERS).map(([k, v]) => `${k.slice(2)} ${v[0]}/${k1(v[1])}`).join(' · '));
    if (window.NOFOG) out.lines.push('   no-fog draws: ' + Object.entries(T.nofog).map(([k, v]) => `${k} ${v[0]}/${k1(v[1])}`).join(' · '));
    if (window.SHOTS) out.__images[`t${String(s).padStart(5, '0')}-base`] = png(base);
    for (const id of VARS) {
      const V = VARIANTS[id]; if (!V) { out.lines.push(`   (no variant ${id})`); continue; }
      V.apply(G); place(s); RR.render(); place(s);
      const T2 = frame(); const img = snapBuf(); const M2 = sum(T2, 'M'), S2 = sum(T2, 'S'), D = diff(base, img);
      V.undo(G); place(s);
      rec.vars[id] = { main: { calls: M2[0], tris: Math.round(M2[1]) }, shadow: { calls: S2[0], tris: Math.round(S2[1]) }, px: D.d, maxLevel: D.mx };
      out.lines.push(`   [${id}] main ${M2[0]} calls ${k1(M2[1])} (${M2[0] - M[0]} / ${k1(M2[1] - M[1])}) · shadow ${S2[0]} calls ${k1(S2[1])} · ${D.d} px differ (max ${D.mx} levels)`);
      if (window.SHOTS) out.__images[`t${String(s).padStart(5, '0')}-${id}`] = png(img);
    }
    out.per.push(rec);
    await new Promise((r) => setTimeout(r, 0));
  }
  const mean = (f) => out.per.reduce((a, r) => a + f(r), 0) / out.per.length;
  out.lines.push(`mean over ${out.per.length} angles: main ${mean((r) => r.main.calls).toFixed(1)} calls ${k1(mean((r) => r.main.tris))} · shadow ${mean((r) => r.shadow.calls).toFixed(1)} calls ${k1(mean((r) => r.shadow.tris))} · beyond fog ${k1(mean((r) => r.beyondFogTris))}`);
  for (const id of VARS) out.lines.push(`   [${id}] main ${mean((r) => r.vars[id]?.main.calls ?? 0).toFixed(1)} calls ${k1(mean((r) => r.vars[id]?.main.tris ?? 0))} · px differ max ${Math.max(...out.per.map((r) => r.vars[id]?.px ?? 0))}`);
  R.renderBufferDirect = rbd;
  out.text = out.lines.join('\n');
  return out;
})()
