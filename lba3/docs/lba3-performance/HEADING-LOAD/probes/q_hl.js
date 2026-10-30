(async () => {
  // HEADING-LOAD: the Follow camera's street views (Far), heading by heading, as ROTATE-STALL's q_view.js sets them up
  // (the street route's setup, Twinsen turned to each of HEADINGS headings and settled ~1.3 s). For each heading, one
  // frame's draws by pass and by benchgpu.js group: calls and triangles; the main pass's triangles by distance from
  // the camera (per instance for instanced draws); the pixels each group finally shows (an ID frame: every main-pass
  // draw in a flat colour of its group, read back from the scene pass); and, with window.VARS (benchgpu.js variant ids, '|'-separated), the same counts and an image per switch, the switch on, on the same frozen frame.
  //   W_HEADINGS=8 W_ONLY=0,3,5 W_VARS=a,b W_IDS=1 W_SHOTS=1
  const G = game, R = G.renderer.renderer, DT = 1 / 30, N = +(window.HEADINGS || 8);
  const THREE = await import('three');
  const { gpuGroupOf, GPU_VARIANTS } = await import('/src/engine/benchgpu.js');
  const only = window.ONLY ? String(window.ONLY).split(',').map(Number) : null;
  const VARS = window.VARS ? String(window.VARS).split('|').filter(Boolean) : [];   // (benchgpu variant ids or parts of them, '|'-separated)
  G.bench.setCamera('follow');
  const route = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; route.setup(); G.state = 'play';
  const h = G.hero, a0 = h.angle;
  const step = () => { G.testFreeze = false; try { G.advance(DT); } finally { G.testFreeze = true; } };
  const own = (o) => { let s = null, n = null; for (let q = o; q && q !== G.scene; q = q.parent) { s ??= q.userData?.src; if (!n && q.name && !/^(shadowBatch|drawBatch)$/.test(q.name)) n = q.name; } return `${o.name === 'shadowBatch' ? 'shadowBatch' : o.userData?.drawBatch ? 'drawBatch' : o.isBatchedMesh ? 'BatchedMesh' : o.isInstancedMesh ? 'Instanced' : o.isSkinnedMesh ? 'Skinned' : o.type}:${n || '?'}${s ? '@' + s : ''}`; };
  const BINS = [15, 30, 60, 100, Infinity], binOf = (d) => { let i = 0; while (d > BINS[i]) i++; return i; };
  const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere();
  const rbd = R.renderBufferDirect; let tally = null;
  const trisOf = (geo, obj, group) => { if (obj.isBatchedMesh) { let n = 0; const C = obj._multiDrawCounts; for (let i = 0; i < obj._multiDrawCount; i++) n += C[i]; return n / 3; }
    const c = group ? group.count : geo.index ? geo.index.count : geo.attributes.position?.count ?? 0; return Math.min(c, geo.drawRange.count) / 3; };
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
    if (tally && (scene === null || scene === G.scene)) {
      const pass = scene === null ? 'S' : 'M', g = gpuGroupOf(G, obj, mat), t1 = trisOf(geo, obj, group), n = obj.isInstancedMesh ? obj.count : 1;
      const e = (tally.g[pass + ' ' + g] ??= [0, 0]); e[0]++; e[1] += t1 * n;
      const o2 = (tally.o[pass + ' ' + own(obj)] ??= [0, 0]); o2[0]++; o2[1] += t1 * n;
      if (pass === 'M') {
        const cp = cam.getWorldPosition(new THREE.Vector3()), B = (tally.bins[g] ??= [0, 0, 0, 0, 0]);
        if (obj.isInstancedMesh) { if (!geo.boundingSphere) geo.computeBoundingSphere(); _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); const IV = (tally.iv[g] ??= [0, 0]);
          for (let i = 0; i < obj.count; i++) { obj.getMatrixAt(i, _m); _m.premultiply(obj.matrixWorld); _v.copy(geo.boundingSphere.center).applyMatrix4(_m); B[binOf(_v.distanceTo(cp))] += t1; _sp.set(_v, geo.boundingSphere.radius * _m.getMaxScaleOnAxis()); IV[0] += t1; if (_fr.intersectsSphere(_sp)) IV[1] += t1; } }
        else { if (!geo.boundingSphere) geo.computeBoundingSphere(); _v.copy(geo.boundingSphere.center).applyMatrix4(obj.matrixWorld); B[binOf(_v.distanceTo(cp))] += t1; }
      }
    }
    return rbd.apply(this, arguments);
  };
  // the ID frame: each main-pass draw in its group's flat colour (see-through draws left out: they show what is behind)
  const GROUPS = ['terrain', 'water', 'sky', 'characters', 'trees', 'grass', 'particles', 'transparent', 'scenery'];
  const idMats = new Map();
  const idMat = (g, m) => { const k = g + '|' + m.side; let x = idMats.get(k); if (!x) { x = new THREE.MeshBasicMaterial({ side: m.side, fog: false, toneMapped: false }); x.color.setRGB((GROUPS.indexOf(g) + 1) / 16, 0, 0); idMats.set(k, x); } return x; };
  const RR = G.renderer, C = RR.composer;
  const idFrame = () => {
    const gl = R.getContext(), W = C.readBuffer.width, H = C.readBuffer.height;
    const bg = G.scene.background, cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha(), fogS = G.scene.fog;
    const spr = RR.scenePass.render; let last = null; RR.scenePass.render = function (rr, wb, rb, ...a) { last = rb; return spr.call(this, rr, wb, rb, ...a); };
    const prev = R.renderBufferDirect;
    R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) {
      if (scene !== G.scene) return prev.apply(this, arguments);
      if (mat.transparent || mat.depthWrite === false || mat.colorWrite === false) return;
      return prev.call(this, cam, scene, geo, mat.isShaderMaterial && gpuGroupOf(G, obj, mat) === 'water' ? idMat('water', mat) : idMat(gpuGroupOf(G, obj, mat), mat), obj, group);
    };
    G.scene.background = null; R.setClearColor(0x000000, 0);
    try { RR.render(); } finally { R.renderBufferDirect = prev; RR.scenePass.render = spr; G.scene.background = bg; R.setClearColor(cc, ca); }
    const px = new Float32Array(W * H * 4); R.setRenderTarget(last || C.readBuffer); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); R.setRenderTarget(null);
    const cnt = {}; for (let i = 0; i < px.length; i += 4) { const k = Math.round(px[i] * 16) - 1; if (k >= 0) cnt[GROUPS[k]] = (cnt[GROUPS[k]] || 0) + 1; }
    return { W, H, px: cnt };
  };
  const snap = () => { const gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); R.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255;
    cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
  // one frame, as the game draws it (the frozen state: render only, nothing advances)
  const frame = (shot) => { tally = { g: {}, o: {}, bins: {}, iv: {} }; RR.render(); const T = tally; tally = null; const img = shot ? snap() : null; return { T, img }; };
  const fmt = (T) => {
    const sum = (p) => Object.entries(T.g).filter(([k]) => k[0] === p).reduce((s, [, v]) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
    const M = sum('M'), S = sum('S');
    const groups = Object.entries(T.g).filter(([k]) => k[0] === 'M').sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => `${k.slice(2)} ${v[0]}/${(v[1] / 1000).toFixed(0)}k`).join(' · ');
    return { line: `main ${M[0]} calls ${(M[1] / 1000).toFixed(0)}k tris · shadow ${S[0]} calls ${(S[1] / 1000).toFixed(0)}k tris`, groups, M, S };
  };
  const out = { __images: {}, lines: [], per: [] };
  for (let k = 0; k < N; k++) {
    if (only && !only.includes(k)) continue;
    G.benchTick = () => { G.doorCool = Math.max(G.doorCool || 0, 0.5); h.angle = a0 + (k * 2 * Math.PI) / N; h.vel.set(0, 0); };
    for (let i = 0; i < 40; i++) { step(); if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
    G.benchTick = null;
    RR.render();   // (a first frame of this view: the cache and LOD settle)
    const base = frame(!!window.SHOTS), F = fmt(base.T);
    out.lines.push(`heading ${k} (${((k * 360) / N).toFixed(0)}°, camera yaw ${G.camRig.yaw?.toFixed(2)}): ${F.line}`);
    out.lines.push('   ' + F.groups);
    out.lines.push('   main tris by distance (0-15/15-30/30-60/60-100/100+ m, k): ' + Object.entries(base.T.bins).sort((a, b) => b[1].reduce((s, x) => s + x) - a[1].reduce((s, x) => s + x)).map(([g, B]) => `${g} ${B.map((x) => (x / 1000).toFixed(0)).join('/')}`).join(' · '));
    out.lines.push('   instanced draws, tris in view / drawn (k): ' + Object.entries(base.T.iv).map(([g, v]) => `${g} ${(v[1] / 1000).toFixed(0)}/${(v[0] / 1000).toFixed(0)}`).join(' · '));
    if (window.TOP) out.lines.push('   top: ' + Object.entries(base.T.o).filter(([q]) => q[0] === 'M').sort((a, b) => b[1][1] - a[1][1]).slice(0, +window.TOP).map(([q, v]) => `${q.slice(2)} ${v[0]}/${(v[1] / 1000).toFixed(1)}k`).join(' · '));
    if (window.IDS) { const I = idFrame(); out.lines.push(`   pixels shown (of ${I.W}x${I.H}): ` + Object.entries(I.px).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${(100 * n / (I.W * I.H)).toFixed(1)}% (${((base.T.g['M ' + g]?.[1] || 0) / Math.max(1, n)).toFixed(2)} tris/px)`).join(' · ')); }
    if (window.WHY && String(window.WHY).split(',').map(Number).includes(k)) {
      const { explain } = await import('/src/engine/drawbatch.js');
      const why = {}, seen = new Set(), rb2 = R.renderBufferDirect;
      const path = (o) => { const L = []; for (let q = o; q && q !== G.scene && L.length < 4; q = q.parent) L.push(q.name || (q.isMesh ? q.type : 'g')); return L.join('<'); };
      R.renderBufferDirect = function (cam, scene, geo, mat, obj, group) { if (scene === G.scene && !obj.userData?.drawBatch && !seen.has(obj)) { seen.add(obj); const w = (obj.isMesh ? explain(obj, G.world.root) : obj.type) + ' :: ' + path(obj) + ' [' + (mat.name || mat.type) + ']'; const e = (why[w] ??= [0, 0]); e[0]++; e[1] += trisOf(geo, obj, group) * (obj.isInstancedMesh ? obj.count : 1); } return rb2.apply(this, arguments); };
      RR.render(); R.renderBufferDirect = rb2;
      out.lines.push('   drawn on its own (reason :: path [material] count/tris):\n      ' + Object.entries(why).sort((a, b) => b[1][0] - a[1][0]).map(([w, v]) => `${v[0]}× ${w} ${(v[1] / 1000).toFixed(1)}k`).join('\n      '));
    }
    if (base.img) out.__images[`h${k}-base`] = base.img;
    const rec = { k, base: { calls: F.M[0], tris: Math.round(F.M[1]), shadowCalls: F.S[0], shadowTris: Math.round(F.S[1]), groups: base.T.g } };
    for (const v of VARS) {
      const sw = GPU_VARIANTS.find((x) => x.id.includes(v)); if (!sw) { out.lines.push(`   (no variant ${v})`); continue; }
      sw.apply(G); G.world?.updateLod?.(G.hero.pos); RR.render();
      const r2 = frame(!!window.SHOTS), F2 = fmt(r2.T);
      sw.undo(G); G.world?.updateLod?.(G.hero.pos); RR.render();
      out.lines.push(`   [${v}] ${F2.line}  (Δ main ${F2.M[0] - F.M[0]} calls ${((F2.M[1] - F.M[1]) / 1000).toFixed(1)}k tris)`);
      out.lines.push('      ' + F2.groups);
      if (r2.img) out.__images[`h${k}-${v.replace(/[^a-z0-9]+/gi, '_')}`] = r2.img;
      rec[v] = { calls: F2.M[0], tris: Math.round(F2.M[1]), shadowCalls: F2.S[0], shadowTris: Math.round(F2.S[1]), groups: r2.T.g };
    }
    out.per.push(rec);
  }
  R.renderBufferDirect = rbd;
  out.text = out.lines.join('\n'); delete out.lines;
  return out;
})()
