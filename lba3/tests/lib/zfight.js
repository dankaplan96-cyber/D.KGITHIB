// Page side of tests/zfight.mjs (installed with page.addScriptTag after the game booted): finds z-fighting in what
// the current camera sees, with the game's own scene, cameras, visibility and materials' depth state.
//
// How: every mesh the main pass would draw (its own and its parents' `visible`, the camera's layers; a draw batch's
// pieces — drawbatch.js — are rendered as the originals they were merged from, so a finding names its builder's
// mesh, not the batch) is drawn with an ID material of the same side, polygon offset, alpha cut-out and instancing /
// skinning / batching, into a float target: per pixel (id, triangle, window depth gl_FragCoord.z, facing). id is per
// mesh and instance (an InstancedMesh's or BatchedMesh's instances apart); "triangle" is gl_VertexID of the provoking
// vertex (flat), so two triangles of one merged mesh are told apart. Three passes:
//   A  every mesh in one order (renderOrder = its index), depth test LEQUAL as the game draws
//   B  the same in the reverse order: where A's and B's winner differ, the two surfaces have exactly the same depth
//      there and only the draw order decides which shows (the game's order among meshes of one material sorts by
//      distance, so it changes as the camera moves: a flicker)
//   C  depth peeling: A again, each fragment of A's winning triangle discarded, so C holds the surface just behind
// A pixel "fights" when B ≠ A (a tie) or when C's depth is within K steps of the 24-bit depth buffer (the game's
// scene target: renderer.js setup, depth+stencil = D24S8) of A's: (zC − zA)·2²⁴ < K. It is flagged when it fights or
// when the two surfaces are within GAPM m of each other along the view (an overlap that fights seen from farther, or
// through a camera with a nearer near plane: the fixed LBA view, a cinematic); `fight` counts the first kind apart. Polygon offset is in both
// (copied from each material), so a decal lifted with polygonOffset is judged with its offset.
// Pixels are grouped by their pair of meshes (unordered; a mesh with itself when two of its own triangles fight).
// A flagged pixel is "core" when at least 9 of the 25 pixels round it are flagged with the same pair: a surface patch,
// not the line where a wall meets the ground it stands on (that line is listed with the pixels, never ranked by them).
// For each pair, the core pixel nearest the cluster's middle is cast as a ray (three's Raycaster against just the
// two meshes): the world point, both surfaces' distances along the ray, their normals, the gap between them along
// the normal, the angle between them, and for a mesh merged by merge.js (TRACE: globalThis.__zfTrace before boot)
// the source part the hit triangle came from; with TRACE the stack of the add() that put each mesh in the scene
// (tests/lib/zfight-trace.js) names the builder.
(() => {
  const G = window.game;
  const ZF = (window.ZF = { K: 4, GAPM: 0.001, W: 640, H: 360 });
  const CORE = 9;
  let THREE, rtA, rtB, rtC, dummy, idMats = new WeakMap(), peelU, modeU;

  const VS = `
#include <common>
#include <batching_pars_vertex>
#include <skinning_pars_vertex>
#ifdef ZF_CUT
uniform mat3 zfUvT; varying vec2 vZfUv;
#endif
flat varying float vZfVid; flat varying float vZfInst;
void main() {
  #include <batching_vertex>
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vZfVid = float(gl_VertexID);
  vZfInst = 0.0;
  #ifdef USE_INSTANCING
  vZfInst = float(gl_InstanceID);
  #endif
  #ifdef USE_BATCHING
  vZfInst = float(getIndirectIndex(gl_DrawID));
  #endif
  #ifdef ZF_CUT
  vZfUv = (zfUvT * vec3(uv, 1.0)).xy;
  #endif
}`;
  const FS = `
uniform float zfBase; uniform int zfMode; uniform highp sampler2D zfPeel;
#ifdef ZF_CUT
uniform sampler2D zfMap; uniform float zfCut; uniform float zfOpacity; uniform int zfChan; varying vec2 vZfUv;
#endif
flat varying float vZfVid; flat varying float vZfInst;
void main() {
  #ifdef ZF_CUT
  vec4 t = texture2D(zfMap, vZfUv);
  float a = (zfChan == 1 ? t.g : t.a) * zfOpacity;
  if (a < zfCut) discard;
  #endif
  float id = zfBase + vZfInst + 1.0;
  if (zfMode == 1) { vec4 w = texelFetch(zfPeel, ivec2(gl_FragCoord.xy), 0); if (w.x == id && w.y == vZfVid) discard; }
  gl_FragColor = vec4(id, vZfVid, gl_FragCoord.z, gl_FrontFacing ? 1.0 : -1.0);
}`;

  ZF.init = async (W = ZF.W, H = ZF.H) => {
    THREE = await import('three');
    ZF.W = W; ZF.H = H;
    const mk = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true, stencilBuffer: false });
    rtA = mk(); rtB = mk(); rtC = mk();
    // (the peel pass reads A's target; A and B sample a 1×1 stand-in: a target bound as a sampler while drawn into is a
    //  feedback loop, and WebGL drops every draw)
    dummy = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType); dummy.needsUpdate = true;
    peelU = { value: dummy }; modeU = { value: 0 };
    return true;
  };

  // does the main pass draw this material in a way two surfaces can fight over the depth test?
  const usable = (m) => m && m.visible !== false && m.colorWrite !== false && m.depthTest !== false
    && (m.depthFunc === THREE.LessEqualDepth || m.depthFunc === THREE.LessDepth) && !(m.transparent && m.opacity < 0.05);
  function idMat(m) {
    const cutTex = m.alphaTest > 0 || m.transparent ? (m.map || m.alphaMap) : null;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, side: m.side, fog: false, lights: false,
      polygonOffset: !!m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor || 0, polygonOffsetUnits: m.polygonOffsetUnits || 0,
      depthTest: true, depthWrite: true, transparent: false,
      defines: cutTex ? { ZF_CUT: 1 } : {},
      uniforms: { zfBase: { value: 0 }, zfMode: modeU, zfPeel: peelU, ...(cutTex ? { zfMap: { value: cutTex }, zfUvT: { value: (cutTex.matrixAutoUpdate && cutTex.updateMatrix(), cutTex.matrix) }, zfCut: { value: m.alphaTest > 0 ? m.alphaTest : 0.1 }, zfOpacity: { value: m.opacity ?? 1 }, zfChan: { value: cutTex === m.map ? 0 : 1 } } : {}) },
    });
    mat.userData.zfOf = m;
    return mat;
  }
  // the ID material(s) of an object (cached; one per object so each carries its own id base)
  function matsOf(o) {
    let e = idMats.get(o);
    const src = o.material;
    if (!e || e.src !== src) { e = { src, mat: Array.isArray(src) ? src.map((m) => (usable(m) ? idMat(m) : null)) : usable(src) ? idMat(src) : null }; idMats.set(o, e); }
    return e;
  }

  // what the main pass would draw now (see the header); others: renderables to keep out of the ID passes
  function collect(cam) {
    const list = [], others = [];
    const walk = (o) => {
      if (!o.visible) return;
      if (o.isMesh || o.isLine || o.isPoints || o.isSprite) {
        let ok = o.isMesh && !o.userData.drawBatch && !o.userData.shadowProxy && (o.layers.test(cam.layers) || o.userData.drawBatched) && o.geometry?.attributes?.position;
        if (ok) { const e = matsOf(o); ok = Array.isArray(e.mat) ? e.mat.some(Boolean) : !!e.mat; }
        (ok ? list : others).push(o);
      }
      for (const c of o.children) walk(c);
    };
    walk(G.scene);
    return { list, others };
  }

  const counts = (o) => (o.isInstancedMesh ? o.count : o.isBatchedMesh ? (o._instanceInfo?.length ?? o.maxInstanceCount ?? 1) : 1);

  // render the three passes with the current camera; returns the pixel buffers and the id → object table
  ZF.passes = () => {
    const R = G.renderer.renderer, S = G.scene, cam = G.camera;
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    // (the game's own per-render steps, as Renderer.render runs them: far and out-of-view actors left out, the blob
    //  shadows drawn as one instanced batch instead of each, the draw batches checked, boxes outside the view hidden)
    const GR = G.renderer; GR.pre?.(); S.updateMatrixWorld(); GR.mid?.();
    let list, others;
    try { ({ list, others } = collect(cam)); } catch (e) { GR.post?.(); throw e; }
    const base = new Float64Array(list.length + 1);
    for (let i = 0; i < list.length; i++) base[i + 1] = base[i] + counts(list[i]);
    const save = [];
    for (let i = 0; i < list.length; i++) {
      const o = list[i], e = matsOf(o);
      save.push([o, o.material, o.layers.mask, o.renderOrder]);
      if (Array.isArray(e.mat)) { for (const m of e.mat) if (m) m.uniforms.zfBase.value = base[i]; o.material = e.mat.map((m) => m || HIDE()); }
      else { e.mat.uniforms.zfBase.value = base[i]; o.material = e.mat; }
      o.layers.enable(0); for (let l = 0; l < 32; l++) if (cam.layers.isEnabled(l)) o.layers.enable(l);
      o.__zfOrd = i;
    }
    for (const o of others) o.__zfVis = o.visible, o.visible = false;
    const st = { rt: R.getRenderTarget(), auto: R.autoClear, sm: R.shadowMap.autoUpdate, smn: R.shadowMap.needsUpdate, bg: S.background, cc: R.getClearColor(new THREE.Color()), ca: R.getClearAlpha() };
    R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = false; S.background = null;
    R.setClearColor(0x000000, 0); R.autoClear = true;
    const N = list.length;
    try {
      R.setOpaqueSort((a, b) => (a.object.__zfOrd - b.object.__zfOrd) || (a.id - b.id));
      modeU.value = 0; R.setRenderTarget(rtA); R.render(S, cam);
      R.setOpaqueSort((a, b) => (b.object.__zfOrd - a.object.__zfOrd) || (b.id - a.id));
      R.setRenderTarget(rtB); R.render(S, cam);
      R.setOpaqueSort((a, b) => (a.object.__zfOrd - b.object.__zfOrd) || (a.id - b.id));
      modeU.value = 1; peelU.value = rtA.texture; R.setRenderTarget(rtC); R.render(S, cam);
    } finally {
      modeU.value = 0; peelU.value = dummy;
      R.setOpaqueSort(G.renderer.opaqueSort);
      R.setRenderTarget(st.rt); R.autoClear = st.auto; R.shadowMap.autoUpdate = st.sm; R.shadowMap.needsUpdate = st.smn; S.background = st.bg; R.setClearColor(st.cc, st.ca);
      for (const [o, m, mask, ro] of save) { o.material = m; o.layers.mask = mask; o.renderOrder = ro; delete o.__zfOrd; }
      for (const o of others) { o.visible = o.__zfVis; delete o.__zfVis; }
      GR.post?.();
    }
    const W = ZF.W, H = ZF.H, A = new Float32Array(W * H * 4), B = new Float32Array(W * H * 4), C = new Float32Array(W * H * 4);
    R.readRenderTargetPixels(rtA, 0, 0, W, H, A); R.readRenderTargetPixels(rtB, 0, 0, W, H, B); R.readRenderTargetPixels(rtC, 0, 0, W, H, C);
    return { A, B, C, list, base, N };
  };
  let _hide = null; const HIDE = () => (_hide ??= new THREE.MeshBasicMaterial({ visible: false }));

  // id → { o, inst }
  const lookup = (P, id) => {
    const v = id - 1; let lo = 0, hi = P.list.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (P.base[mid] <= v) lo = mid; else hi = mid - 1; }
    return { o: P.list[lo], inst: v - P.base[lo] };
  };
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const srcOf = (o, err) => {
    const e = err || globalThis.__zfSrc?.get(o); if (!e) return null;
    const fr = String(e.stack).split('\n').slice(1).map((l) => l.trim().replace(/^at /, ''))
      .filter((l) => /\/src\//.test(l) && !/three\.|zfight|engine\/drawcull/.test(l)).map((l) => l.replace(/\(?https?:\/\/[^/]+\//, '').replace(/\)$/, ''));
    return fr.slice(0, 4);
  };
  const pathOf = (o) => { const p = []; for (let a = o; a && a !== G.scene && p.length < 6; a = a.parent) p.push(a.name || (a === G.world.root ? 'world.root' : a.type)); return p.join(' < '); };
  const areaOf = (o) => { for (let a = o; a; a = a.parent) { if (a === G.world.root) return 'citadel'; for (const [id, R] of Object.entries(G.rooms)) if (R.group === a) return id; } return 'scene'; };
  const matInfo = (m) => m ? { type: m.type, name: m.name || undefined, color: m.color ? '#' + m.color.getHexString() : undefined, map: m.map ? (m.map.name || m.map.source?.data?.id || m.map.uuid.slice(0, 6)) : undefined, po: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : undefined, transparent: m.transparent || undefined, depthWrite: m.depthWrite === false ? false : undefined, side: m.side } : null;
  function describe(o, inst, faceIndex) {
    const g = o.geometry, d = { name: o.name || '', type: o.type, area: areaOf(o), path: pathOf(o), inst: o.isInstancedMesh || o.isBatchedMesh ? inst : undefined, tris: g.index ? g.index.count / 3 : g.attributes.position.count / 3, mat: matInfo(Array.isArray(o.material) ? o.material[0] : o.material), batched: !!o.userData.drawBatched || undefined, src: srcOf(o) || undefined, ud: Object.keys(o.userData).filter((k) => !/^_|drawBatched|zf/.test(k)).slice(0, 6) };
    const parts = g.userData?.zfParts;
    if (parts && faceIndex != null) {
      const i = faceIndex * 3, p = parts.find((q) => i >= q.from && i < q.from + q.n);
      if (p?.o) d.part = { name: p.o.name || '', path: pathOf(p.o.parent || p.o), mat: matInfo(p.o.material), geo: p.o.geometry?.type, src: srcOf(p.o) || undefined };
      else if (p) d.part = { geo: p.geo, src: srcOf(null, p.err) || undefined };   // (a Kit's part: props.js Kit.add)
    }
    return d;
  }

  // a ray against a plain mesh's own triangles (three's Mesh.raycast can turn a ray away by a geometry's stored bounds)
  const _ta = [], _tm = [];
  function rayTris(o, ray, skip = -1) {
    const g = o.geometry, Pa = g.attributes.position, I = g.index, n = I ? I.count : Pa.count;
    if (!_ta.length) for (let k = 0; k < 4; k++) _ta.push(new THREE.Vector3());
    const [a, b, c, q] = _ta, M = o.matrixWorld, side = (Array.isArray(o.material) ? o.material[0] : o.material).side;
    let best = null;
    for (let i = 0; i + 2 < n; i += 3) {
      if (i / 3 === skip) continue;
      a.fromBufferAttribute(Pa, I ? I.getX(i) : i).applyMatrix4(M); b.fromBufferAttribute(Pa, I ? I.getX(i + 1) : i + 1).applyMatrix4(M); c.fromBufferAttribute(Pa, I ? I.getX(i + 2) : i + 2).applyMatrix4(M);
      if (!ray.intersectTriangle(a, b, c, side === THREE.FrontSide, q)) continue;
      const d = q.distanceTo(ray.origin);
      if (!best || d < best.distance) {
        const nrm = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
        best = { distance: d, point: q.clone(), faceIndex: i / 3, face: { normal: nrm }, world: true };
      }
    }
    return best;
  }

  // analyse the passes: clusters by mesh pair
  ZF.analyse = (P, { K = ZF.K, gapM = ZF.GAPM, top = 12 } = {}) => {
    const W = ZF.W, H = ZF.H, { A, B, C } = P, n = W * H, S24 = 16777216;
    const cn = G.camera.near, cf = G.camera.far, stepAt = (zw) => { const d = (cn * cf) / (cf - zw * (cf - cn)); return (d * d * (cf - cn)) / (cf * cn * S24); };
    const pairOf = new Int32Array(n).fill(-1), fightAt = new Uint8Array(n), keys = new Map(), pairs = [];
    let drawn = 0;
    for (let p = 0; p < n; p++) {
      const a = A[p * 4]; if (!a) continue; drawn++;
      const av = A[p * 4 + 1], b = B[p * 4], bv = B[p * 4 + 1], c = C[p * 4];
      const tie = b !== a || bv !== av;
      const steps = c ? (C[p * 4 + 2] - A[p * 4 + 2]) * S24 : Infinity;
      const fight = tie || steps < K;
      // (or nearer than gapM metres along the view: an overlap that fights from a farther camera or a lower near plane)
      if (!fight && !(steps * stepAt(A[p * 4 + 2]) < gapM)) continue;
      const other = tie ? b : c, lo = Math.min(a, other), hi = Math.max(a, other), k = lo + ':' + hi;
      let q = keys.get(k);
      if (q === undefined) { q = pairs.length; keys.set(k, q); pairs.push({ id: q, a: lo, b: hi, px: 0, fight: 0, fcore: 0, core: 0, tie: 0, steps: [], sx: 0, sy: 0 }); }
      const Q = pairs[q]; Q.px++; if (fight) Q.fight++; if (tie) Q.tie++; else if (Q.steps.length < 400) Q.steps.push(steps);
      pairOf[p] = q; if (fight) fightAt[p] = 1;
    }
    // core: at least CORE of the 25 pixels round it flagged with the same pair (a fighting patch comes out speckled — a
    // pixel where one surface wins by more than K steps sits beside one where they tie — so the test is a density,
    // which the 1–2 pixel line where a wall stands on the ground does not reach)
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const p = y * W + x, q = pairOf[p]; if (q < 0) continue;
      let s = 0, sf = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const r = p + dy * W + dx; if (pairOf[r] === q) { s++; sf += fightAt[r]; } }
      const Q = pairs[q];
      if (s >= CORE) { Q.core++; Q.sx += x; Q.sy += y; }
      if (fightAt[p] && sf >= CORE) Q.fcore++;   // (the same density among the fighting pixels alone)
    }
    ZF.last = { pairOf, fightAt, W, H };   // (for a picture of where it fights: ZF.overlay)
    pairs.sort((u, v) => v.fcore - u.fcore || v.core - u.core || v.px - u.px);
    const cam = G.camera, rc = new THREE.Raycaster(), ndc = new THREE.Vector2(), out = [];
    rc.layers.enableAll();   // (a draw batch's piece is off layer 0)
    const nearD = cam.near, farD = cam.far;
    const viewZ = (zw) => (nearD * farD) / (farD - zw * (farD - nearD));   // (window depth → distance along the view)
    for (const Q of pairs.slice(0, top)) {
      // the core pixel nearest the cluster's middle (or any pixel of the pair)
      const qi = Q.id;   // (pairOf holds the index before the sort)
      const mx = Q.core ? Q.sx / Q.core : W / 2, my = Q.core ? Q.sy / Q.core : H / 2;
      const cand = [];
      for (let p = 0; p < n; p++) if (pairOf[p] === qi) { const x = p % W, y = (p / W) | 0; cand.push([(x - mx) ** 2 + (y - my) ** 2, p]); }
      cand.sort((u, v) => u[0] - v[0]);
      const ia = lookup(P, Q.a), ib = lookup(P, Q.b);
      const hitOf = (I, skip) => {
        const hs = rc.intersectObject(I.o, false).filter((h) => (I.o.isInstancedMesh ? h.instanceId === I.inst : I.o.isBatchedMesh ? h.batchId === I.inst : true) && h.faceIndex !== skip);
        return hs[0] || (I.o.isInstancedMesh || I.o.isBatchedMesh || I.o.isSkinnedMesh ? null : rayTris(I.o, rc.ray, skip));
      };
      // (the pixel nearest the middle whose ray meets both meshes: three's ray test can miss at a triangle's very edge)
      let best = cand[0][1], ha = null, hb = null;
      for (const [, p] of cand.slice(0, 40)) {
        const x = p % W, y = (p / W) | 0;
        ndc.set(((x + 0.5) / W) * 2 - 1, ((y + 0.5) / H) * 2 - 1);
        rc.setFromCamera(ndc, cam);
        const a = hitOf(ia), b = Q.a === Q.b ? hitOf(ia, a?.faceIndex ?? -1) : hitOf(ib);
        if (!ha || (a && b)) { best = p; ha = a; hb = b; }
        if (a && b) break;
      }
      const x = best % W, y = (best / W) | 0;
      ndc.set(((x + 0.5) / W) * 2 - 1, ((y + 0.5) / H) * 2 - 1); rc.setFromCamera(ndc, cam);
      const nOf = (h, o) => h?.face ? (h.world ? h.face.normal.clone() : h.face.normal.clone().transformDirection(o.matrixWorld)) : null;
      const na = nOf(ha, ia.o), nb = nOf(hb, ib.o);
      const zA = A[best * 4 + 2], dist = viewZ(zA);
      const st = Q.steps.slice().sort((u, v) => u - v);
      out.push({
        px: Q.px, fight: Q.fight, fcore: Q.fcore, core: Q.core, tie: Q.tie, stepsMin: st.length ? r3(st[0]) : null, stepsMed: st.length ? r3(st[st.length >> 1]) : null,
        at: ha ? [ha.point.x, ha.point.y, ha.point.z].map((v) => Math.round(v * 100) / 100) : null, pixel: [x, H - 1 - y], dist: Math.round(dist * 10) / 10,
        // (one step of the 24-bit depth buffer at this distance, in metres along the view)
        stepM: Number(((dist * dist * (farD - nearD)) / (farD * nearD * S24)).toPrecision(2)),
        gapEst: st.length ? Number((st[st.length >> 1] * ((dist * dist * (farD - nearD)) / (farD * nearD * S24))).toPrecision(2)) : 0,   // (metres along the view: the median steps × one step)
        gapRay: ha && hb ? r3(hb.distance - ha.distance) : null,
        gapN: ha && hb && na ? Number((Math.abs(hb.distance - ha.distance) * Math.abs(rc.ray.direction.dot(na))).toPrecision(2)) : null,
        angle: na && nb ? Math.round((Math.acos(Math.min(1, Math.abs(na.dot(nb)))) * 180) / Math.PI) : null,
        facing: na && nb ? (na.dot(nb) > 0 ? 'same' : 'opposite') : null,
        a: describe(ia.o, ia.inst, ha?.faceIndex), b: Q.a === Q.b ? 'self' : describe(ib.o, ib.inst, hb?.faceIndex),
        keyA: ia.o.uuid + '#' + ia.inst, keyB: ib.o.uuid + '#' + ib.inst,
      });
    }
    const flagged = pairs.reduce((s, Q) => s + Q.px, 0), core = pairs.reduce((s, Q) => s + Q.core, 0), fight = pairs.reduce((s, Q) => s + Q.fight, 0), fcore = pairs.reduce((s, Q) => s + Q.fcore, 0);
    return { drawn, flagged, core, fight, fcore, pairs: pairs.length, meshes: P.list.length, near: cam.near, far: cam.far, fov: Math.round(cam.fov * 10) / 10, cam: [cam.position.x, cam.position.y, cam.position.z].map((v) => Math.round(v * 10) / 10), top: out };
  };
  // (o.near: the camera's near plane for this scan only, e.g. to compare a view's precision with another near plane)
  ZF.scan = (o = {}) => {
    const cam = G.camera, n0 = cam.near;
    if (o.near) { cam.near = o.near; cam.updateProjectionMatrix(); }
    try { return ZF.analyse(ZF.passes(), o); } finally { if (o.near) { cam.near = n0; cam.updateProjectionMatrix(); } }
  };

  // the last analysed view's flagged pixels over a picture of the same view (a PNG's base64): red where two surfaces
  // fight, amber where they lie within GAPM of each other; returns a PNG data URL
  ZF.overlay = async (b64) => {
    const L = ZF.last, img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas'); c.width = L.W; c.height = L.H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, L.W, L.H);
    const D = x.getImageData(0, 0, L.W, L.H), d = D.data;
    for (let p = 0; p < L.W * L.H; p++) {
      if (L.pairOf[p] < 0) continue;
      const q = ((L.H - 1 - ((p / L.W) | 0)) * L.W + (p % L.W)) * 4;   // (the passes' rows run bottom-up)
      const [r, g, b] = L.fightAt[p] ? [255, 0, 0] : [255, 170, 0];
      d[q] = (d[q] + 2 * r) / 3; d[q + 1] = (d[q + 1] + 2 * g) / 3; d[q + 2] = (d[q + 2] + 2 * b) / 3;
    }
    x.putImageData(D, 0, 0);
    return c.toDataURL('image/png');
  };

  // ---------------------------------------------------------------- spots
  // An area's play spots: a STEP m grid over its extent, each point on the ground he walks there (the terrain's
  // street level, or the floor bricks over the sea of Zeelich and the islands at the spawn's level), dry, above the
  // clouds, not inside anything solid, not too steep; plus each named spot. For an interior: its spawn and the middle of
  // each of its floor boxes (the iso view shows the whole room).
  ZF.extent = (id) => {
    if (id === 'citadel') return { x0: -211, x1: 59, z0: -119, z1: 151 };
    const R = G.rooms[id], p = R.group.position;
    if (R.size) { const [w, d] = R.size; return { x0: p.x - w / 2 - 10, x1: p.x + w / 2 + 10, z0: p.z - d / 2 - 10, z1: p.z + d / 2 + 10 }; }
    const b = new THREE.Box3().setFromObject(R.group), L = 260;
    return { x0: Math.max(b.min.x, p.x - L), x1: Math.min(b.max.x, p.x + L), z0: Math.max(b.min.z, p.z - L), z1: Math.min(b.max.z, p.z + L) };
  };
  ZF.spots = (id, step = 20) => {
    const P = G.physics, out = [];
    const R = id === 'citadel' ? null : G.rooms[id];
    if (R && !R.outdoor) {
      const sp = R.spawn || { x: R.group.position.x, z: R.group.position.z };
      out.push({ area: id, x: sp.x, z: sp.z, a: sp.a ?? 0, iso: true, tag: 'spawn' });
      for (const [k, b] of [].concat(R.bounds || []).entries()) if (k < 4 && Number.isFinite(b?.x0 + b?.x1 + b?.z0 + b?.z1)) out.push({ area: id, x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, a: 0, iso: true, tag: 'floor' + k });
      return out;
    }
    const E = ZF.extent(id), cloud = R?.cloudY ?? -Infinity, sy = R?.spawn ? P.groundAt(R.spawn.x, R.spawn.z) : null;
    for (let x = E.x0 + step / 2; x < E.x1; x += step) for (let z = E.z0 + step / 2; z < E.z1; z += step) {
      const th = P.terrain.heightAt(x, z);
      let g = th >= -0.35 ? P.groundAt(x, z, th + 0.3) : sy != null ? P.groundAt(x, z, sy + 1.5) : -Infinity;
      if (!(g > -0.3) || g < cloud + 0.5 || P.blockedAt(x, z, g, 0.45) || P.steepAt(x, z, g + 0.05)) continue;
      out.push({ area: id, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, a: 0, tag: 'grid' });
    }
    return out;
  };
  // Twinsen at a spot, facing `a`, the play camera (Follow, Medium; a room's iso view) settled on him
  ZF.place = (s) => {
    const h = G.hero, P = G.physics;
    if (s.area === 'citadel') { if (G.room) G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); }
    else if (G.room?.id !== s.area) G.enterRoom(s.area, { x: s.x, z: s.z, a: s.a }, true, true);
    G.camRig.setMode('follow'); G.camRig.setFollowDistance('medium');
    h.pos.set(s.x, P.groundAt(s.x, s.z, (s.y ?? P.groundAt(s.x, s.z)) + 0.3), s.z); h.angle = s.a; h.vy = 0; h.onGround = true; h.vel?.set?.(0, 0);
    G.camRig.lba.init = false; if (G.camRig.ch) G.camRig.ch.init = false; G.camRig.recenter();
    for (let i = 0; i < 40 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    G.step(0.5);
    const c = G.camera.position;
    return { state: G.state, room: G.room?.id ?? 'citadel', hero: [h.pos.x, h.pos.y, h.pos.z].map((v) => Math.round(v * 10) / 10), cam: [c.x, c.y, c.z].map((v) => Math.round(v * 10) / 10), mode: G.camRig.why?.mode, near: G.camera.near };
  };
})();
