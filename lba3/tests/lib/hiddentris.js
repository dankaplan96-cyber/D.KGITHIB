// HIDDEN-TRIS (P85), page side: which of the triangles the game submits from a small area can a player never see?
// tests/hidden-tris.mjs drives it; docs/lba3-performance/HIDDEN-TRIS.md reads it. A diagnostic: nothing here runs in play.
//   HT.count(collect)  one render of the game as it is, its draws and triangles per pass (main / shadow / post);
//                      collect: also the main pass's submitted objects
//   HT.time(n)         n renders, each waited for (a 1-pixel read), ms each
//   HT.build(objs)     the "soup": every triangle of the given meshes in world space, one id each (instances and a
//                      BatchedMesh's instances expanded), split by side (front / double) and by occluding or not
//                      (see-through, alpha-tested, no depth write: drawn after, never hide anything)
//   HT.idPass(view)    renders the soup's triangles of the objects the game submitted in that view, from its camera, at
//                      2x the canvas, id per pixel; marks each triangle that covers a pixel (front / back)
//   HT.analyse()       classifies the never-seen triangles and names their sources (placerec.js's parts and sites)
//   HT.trim(mode) / HT.applyTrim(on)   the prototype: index buffers without the never-seen triangles (a geometry's
//                      triangle goes only if it is unseen in every object that uses it)
(() => {
const G = window.game, R = G.renderer.renderer, gl = R.getContext();
const REC = globalThis.__PLACE_REC, T = REC?.T;
const HT = (window.HT = { views: [] });
// (Game.frame(dt, true) updates the shadow batches of the area just before it renders — the one step a frame without a
//  picture skips — and only then does Renderer.mid check the draw batches (main.js): the same here before each render)
const areaRoot = () => G.room?.group || G.world.root;
const draw = () => { G.shadowCull.update(areaRoot(), G.camera, G.cine?.focus || G.hero.pos); G.renderer.render(); };
HT.draw = draw;
HT.tri = (t) => ({ p: Array.from(triPos.subarray(t * 9, t * 9 + 9)).map((v) => +v.toFixed(2)), o: triObj[t], local: triLocal[t], flag: triFlag[t] });
const inGame = (o) => { for (let p = o; p; p = p.parent) if (p === G.scene) return true; return false; };

function trisOf(geo, obj, grp) {
  if (obj.isBatchedMesh) { let n = 0; const c = obj._multiDrawCounts; for (let i = 0; i < obj._multiDrawCount; i++) n += c[i]; return n / 3; }
  const cnt = geo.index ? geo.index.count : geo.attributes.position.count;
  const s = Math.max(grp ? grp.start : 0, geo.drawRange.start);
  const e = Math.min(grp ? grp.start + grp.count : Infinity, geo.drawRange.start + geo.drawRange.count, cnt);
  return (Math.max(0, e - s) / 3) * (obj.isInstancedMesh ? obj.count : 1);
}

const BMK = new Map(), bmIds = new Map();
const bmKey = (bm, inst, gi) => { if (!bmIds.has(bm)) bmIds.set(bm, bmIds.size); const k = `${bmIds.get(bm)}:${inst}:${gi}`; if (!BMK.has(k)) BMK.set(k, { key: k, bm, inst, gi }); return k; };
const IMK = new Map(), imIds = new Map(), SIG = new Map();
HT.moving = new Set();
HT.movingReport = () => {
  const L = [...HT.moving].map((o) => ({ name: o.name || o.type, site: siteLabel(REC?.sites?.get(o)?.site || ''), tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }));
  const perView = HT.views.map((v) => v.objs.reduce((s, o) => s + (HT.moving.has(o) ? (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 : 0), 0));
  return { list: L, perView: Math.round(perView.reduce((a, b) => a + b, 0) / Math.max(1, perView.length)) };
};
const imKey = (im, A, i) => {
  if (!imIds.has(im)) imIds.set(im, imIds.size);
  const o = i * 16, k = `i${imIds.get(im)}:${A[o + 12].toFixed(3)}:${A[o + 13].toFixed(3)}:${A[o + 14].toFixed(3)}:${A[o].toFixed(3)}:${A[o + 2].toFixed(3)}`;
  if (!IMK.has(k)) IMK.set(k, { key: k, im, M: A.slice(o, o + 16) });
  return k;
};
HT.count = (collect = false) => {
  const c = { main: 0, shadow: 0, post: 0, tmain: 0, tshadow: 0, tpost: 0, lines: 0 }, objs = collect ? new Set() : null;
  const orig = R.renderBufferDirect;
  R.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
    let p = scene ? 'main' : 'shadow';
    if (p === 'main' && !inGame(obj)) p = 'post';
    c[p]++;
    if (obj.isMesh) c['t' + p] += trisOf(geo, obj, grp); else c.lines++;
    if (objs && p === 'main') {
      // (a BatchedMesh draws only the instances three's own culling kept, each with its current sculpt (LodBatch's
      //  distance detail): one entry per instance and sculpt drawn, from its indirect list)
      if (obj.isBatchedMesh) { const ids = obj._indirectTexture.image.data; for (let i = 0; i < obj._multiDrawCount; i++) objs.add(bmKey(obj, ids[i], obj._instanceInfo[ids[i]].geometryIndex)); }
      // (an InstancedMesh: one entry per instance by its matrix — the grass and flower pools are refilled for each view
      //  with the squares in it, world.js viewPools)
      else if (obj.isInstancedMesh) { const A = obj.instanceMatrix.array; for (let i = 0; i < obj.count; i++) objs.add(imKey(obj, A, i)); }
      else {
        objs.add(obj);
        // (a mesh that stands elsewhere in another view moves with the camera — the sea, the sky — or on its own: the
        //  soup holds one place for each mesh, so these are left out of it: drawn, never judged, never occluding)
        const e = obj.matrixWorld.elements, sg = `${e[12].toFixed(3)},${e[13].toFixed(3)},${e[14].toFixed(3)},${e[0].toFixed(4)},${e[2].toFixed(4)}`;
        const was = SIG.get(obj); if (was == null) SIG.set(obj, sg); else if (was !== sg) HT.moving.add(obj);
      }
    }
    return orig.call(this, cam, scene, geo, mat, obj, grp);
  };
  try { draw(); } finally { R.renderBufferDirect = orig; }
  c.tmain = Math.round(c.tmain); c.tshadow = Math.round(c.tshadow); c.tpost = Math.round(c.tpost);
  return { c, objs };
};

const px1 = new Uint8Array(4);
const sync = () => { R.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); };
HT.time = (n = 8, warm = 2) => {
  for (let i = 0; i < warm; i++) { draw(); sync(); }
  const out = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); draw(); sync(); out.push(performance.now() - t0); }
  out.sort((a, b) => a - b);
  return { med: +out[n >> 1].toFixed(2), min: +out[0].toFixed(2), max: +out[n - 1].toFixed(2) };
};
// the picture as drawn (the canvas's drawing buffer, read in the same task as the render)
HT.pixels = () => { draw(); R.setRenderTarget(null); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
HT.diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d > 2) n++; if (d > mx) mx = d; } return { n, share: n / (a.length / 4), max: mx }; };

// (the picture with the pixels that differ in magenta, the rest darkened: a PNG data URL)
HT.diffImage = (A, B) => {
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4, d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    if (d > 2) { im.data[o] = 255; im.data[o + 1] = 0; im.data[o + 2] = 255; } else { im.data[o] = A[i] * 0.6; im.data[o + 1] = A[i + 1] * 0.6; im.data[o + 2] = A[i + 2] * 0.6; }
    im.data[o + 3] = 255;
  }
  cx.putImageData(im, 0, 0); return cv.toDataURL('image/png');
};
HT.camRec = () => { const c = G.renderer.camera; c.updateMatrixWorld(); return { M: c.matrixWorld.toArray(), P: c.projectionMatrix.toArray(), pos: c.position.toArray().map((v) => +v.toFixed(3)), hero: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z] }; };

// ------------------------------------------------------------------ the soup
class Grow { constructor(T0, n = 1 << 16) { this.T = T0; this.a = new T0(n); this.n = 0; } push1(x) { if (this.n + 1 > this.a.length) { const b = new this.T(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = x; } push3(x, y, z) { if (this.n + 3 > this.a.length) { const b = new this.T(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = x; this.a[this.n++] = y; this.a[this.n++] = z; } get() { return this.a.subarray(0, this.n); } }
const S = (HT.S = { objs: [], chunks: new Map(), N: 0 });
// per triangle (filled at build): its object, its index in its geometry, flags (1 double-sided, 2 not occluding, 4 BatchedMesh)
let triObj, triLocal, triFlag, triPos;
const objIndex = new Map();
function chunkOf(key) {
  if (!S.chunks.has(key)) S.chunks.set(key, { key, pos: new Grow(Float32Array), tid: new Grow(Float32Array), oid: new Grow(Float32Array) });
  return S.chunks.get(key);
}
HT.build = (objList) => {
  G.scene.updateMatrixWorld(true);
  const list = [...objList].map((o) => (typeof o === 'string' ? BMK.get(o) || IMK.get(o) : o)).filter((o) => o.bm || o.im || (!HT.moving.has(o) && o.isMesh && !o.isSkinnedMesh && !o.isBatchedMesh && o.geometry?.attributes?.position));
  // first: count the triangles, to size the per-triangle arrays
  const plan = [];
  let N = 0;
  const M = new T.Matrix4(), MI = new T.Matrix4();
  for (const ent of list) {
    const o = ent.bm || ent.im || ent;
    const g = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups = Array.isArray(o.material) ? g.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    const cnt = g.index ? g.index.count : g.attributes.position.count;
    const insts = [];
    if (ent.bm) {
      const gi = o._geometryInfo[ent.gi]; o.getMatrixAt(ent.inst, MI); insts.push({ M: new T.Matrix4().multiplyMatrices(o.matrixWorld, MI), s: gi.start, c: gi.count });
    } else if (ent.im) {
      MI.fromArray(ent.M); insts.push({ M: new T.Matrix4().multiplyMatrices(o.matrixWorld, MI) });
    } else if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, MI); insts.push({ M: new T.Matrix4().multiplyMatrices(o.matrixWorld, MI) }); }
    } else insts.push({ M: o.matrixWorld.clone() });
    const segs = [];
    for (const gr of groups) {
      const m = mats[gr.materialIndex ?? 0]; if (!m || m.visible === false || m.colorWrite === false) continue;
      const s0 = Math.max(gr.start, g.drawRange.start), e0 = Math.min(gr.start + gr.count, g.drawRange.start + g.drawRange.count, cnt);
      if (e0 <= s0) continue;
      segs.push({ m, s0, e0 });
    }
    let n = 0;
    for (const I of insts) for (const sg of segs) { const s = I.s != null ? Math.max(sg.s0, I.s) : sg.s0, e = I.c != null ? Math.min(sg.e0, I.s + I.c) : sg.e0; if (e > s) n += Math.floor((e - s) / 3); }
    if (!n) continue;
    plan.push({ o, ent, insts, segs, n }); N += n;
  }
  triObj = new Int32Array(N); triLocal = new Int32Array(N); triFlag = new Uint8Array(N); triPos = new Float32Array(N * 9);
  S.N = N; S.objs = []; S.chunks.clear(); objIndex.clear();
  let t = 0;
  const v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const P of plan) {
    const o = P.o, g = o.geometry, pos = g.attributes.position, idx = g.index, oi = S.objs.length;
    const rec = { o, oi, t0: t, n: P.n, inst: P.insts.length, bm: P.ent.bm ? P.ent : null, im: P.ent.im ? P.ent : null, batched: false, geo: g, label: null };
    S.objs.push(rec); objIndex.set(P.ent.bm || P.ent.im ? P.ent.key : o, oi);
    for (const I of P.insts) {
      const e = I.M.elements, flip = I.M.determinant() < 0;
      for (const sg of P.segs) {
        const m = sg.m, dbl = m.side === T.DoubleSide, back = m.side === T.BackSide;
        const occl = !(m.transparent || m.alphaTest > 0 || m.alphaMap || m.alphaHash || m.depthWrite === false);
        const key = `${occl ? 1 : 0}|${dbl ? 2 : 0}|${m.polygonOffset ? m.polygonOffsetFactor + ',' + m.polygonOffsetUnits : '0'}`;
        const C = chunkOf(key);
        const s = I.s != null ? Math.max(sg.s0, I.s) : sg.s0, en = I.c != null ? Math.min(sg.e0, I.s + I.c) : sg.e0;
        for (let k = s; k + 3 <= en; k += 3) {
          for (let j = 0; j < 3; j++) {
            const vi = idx ? idx.getX(k + j) : k + j, x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
            v[j * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; v[j * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; v[j * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          }
          if (!(Number.isFinite(v[0] + v[1] + v[2] + v[3] + v[4] + v[5] + v[6] + v[7] + v[8]))) { S.nan = (S.nan || 0) + 1; for (let j = 0; j < 9; j++) v[j] = 0; }
          // (front faces stay counter-clockwise: a mirrored instance or a back-side material swaps two corners)
          const sw = flip !== back;
          const order = sw ? [0, 2, 1] : [0, 1, 2];
          for (const j of order) { C.pos.push3(v[j * 3], v[j * 3 + 1], v[j * 3 + 2]); C.tid.push1(t); C.oid.push1(oi); }
          for (let j = 0; j < 3; j++) { const q = order[j]; triPos[t * 9 + j * 3] = v[q * 3]; triPos[t * 9 + j * 3 + 1] = v[q * 3 + 1]; triPos[t * 9 + j * 3 + 2] = v[q * 3 + 2]; }
          triObj[t] = oi; triLocal[t] = k / 3; triFlag[t] = (dbl ? 1 : 0) | (occl ? 0 : 2) | (P.ent.bm ? 4 : 0);
          t++;
        }
      }
    }
  }
  S.N = t;
  // the meshes the id pass draws: one per chunk, its vertices in the world
  const vs = `
    attribute float tid; attribute float oid; uniform sampler2D vis; flat varying float vId;
    void main() {
      ivec2 c = ivec2(int(mod(oid, 256.0)), int(floor(oid / 256.0)));
      float on = texelFetch(vis, c, 0).r;
      vId = tid;
      gl_Position = on > 0.5 ? projectionMatrix * modelViewMatrix * vec4(position, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
    }`;
  const fs = `
    flat varying float vId;
    layout(location = 0) out highp vec4 idOut;
    void main() {
      float id = vId + 1.0;
      float r = mod(id, 256.0), g = mod(floor(id / 256.0), 256.0), b = floor(id / 65536.0);
      idOut = vec4(r, g, b, gl_FrontFacing ? 255.0 : 128.0) / 255.0;
    }`;
  const nObj = S.objs.length, H = Math.max(1, Math.ceil(nObj / 256));
  S.visData = new Uint8Array(256 * H);
  S.vis = new T.DataTexture(S.visData, 256, H, T.RedFormat, T.UnsignedByteType);
  S.vis.needsUpdate = true;
  S.scene = new T.Scene();
  S.meshes = [];
  for (const C of S.chunks.values()) {
    const [occl, dbl, po] = C.key.split('|');
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(C.pos.get(), 3));
    geo.setAttribute('tid', new T.BufferAttribute(C.tid.get(), 1));
    geo.setAttribute('oid', new T.BufferAttribute(C.oid.get(), 1));
    const mat = new T.ShaderMaterial({ glslVersion: T.GLSL3, vertexShader: vs, fragmentShader: fs, uniforms: { vis: { value: S.vis } }, side: dbl === '2' ? T.DoubleSide : T.FrontSide, depthWrite: occl === '1', depthTest: true });
    if (po !== '0') { const [f, u] = po.split(',').map(Number); mat.polygonOffset = true; mat.polygonOffsetFactor = f; mat.polygonOffsetUnits = u; }
    const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.userData.occl = occl === '1';
    S.scene.add(mesh); S.meshes.push(mesh);
    C.pos = C.tid = C.oid = null;
  }
  S.seenPix = new Uint32Array(S.N); S.seenFlag = new Uint8Array(S.N); S.views = 0;
  return { nan: S.nan || 0, tris: S.N, objs: nObj, chunks: [...S.chunks.keys()], bmEntries: S.objs.filter((r) => r.bm).length };
};

// ------------------------------------------------------------------ the id pass
const cam = () => (S.cam ??= new T.PerspectiveCamera());
// (jit: the picture is drawn this many times, shifted by half a pixel of the 2x target each time (0,0 · ½,0 · 0,½ · ½,½):
//  4 = the samples of a 4x target. A rail seen nearly edge-on is a sliver thinner than a pixel: the game's 2x MSAA may
//  still give it a sample, so fewer samples here would call it unseen.)
HT.idPass = (view, scale = 2, jit = 4) => {
  const W = gl.drawingBufferWidth * scale, H = gl.drawingBufferHeight * scale;
  if (!S.rt || S.rt.width !== W || S.rt.height !== H) { S.rt?.dispose(); S.rt = new T.WebGLRenderTarget(W, H, { depthBuffer: true, samples: 0, minFilter: T.NearestFilter, magFilter: T.NearestFilter }); S.buf = new Uint8Array(W * H * 4); }
  // only the objects the game submitted in this view
  S.visData.fill(0); for (const o of view.objs) { const i = objIndex.get(o); if (i != null) S.visData[i] = 255; } S.vis.needsUpdate = true;
  const C = cam(); C.matrixWorld.fromArray(view.cam.M); C.matrixWorld.decompose(C.position, C.quaternion, C.scale); C.updateMatrixWorld(true);
  C.projectionMatrix.fromArray(view.cam.P); C.projectionMatrixInverse.copy(C.projectionMatrix).invert();
  const prev = { t: R.getRenderTarget(), ac: R.autoClear, cc: R.getClearColor(new T.Color()), ca: R.getClearAlpha(), sm: R.shadowMap.enabled };
  R.shadowMap.enabled = false;
  R.setRenderTarget(S.rt); R.setClearColor(0x000000, 0);
  let seen = 0;
  const read = () => {
    R.readRenderTargetPixels(S.rt, 0, 0, W, H, S.buf);
    const b = S.buf, pix = S.seenPix, fl = S.seenFlag;
    for (let i = 0; i < b.length; i += 4) {
      const a = b[i + 3]; if (!a) continue;
      const t = (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) - 1;
      if (pix[t]++ === 0) seen++;
      fl[t] |= a === 255 ? 1 : 2;
    }
  };
  try {
    const P0 = C.projectionMatrix.clone(), e0 = P0.elements;
    for (const [jx, jy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]].slice(0, jit)) {
      const e = C.projectionMatrix.elements, dx = (2 * jx) / W, dy = (2 * jy) / H;
      for (let c = 0; c < 4; c++) { e[c * 4] = e0[c * 4] + dx * e0[c * 4 + 3]; e[c * 4 + 1] = e0[c * 4 + 1] + dy * e0[c * 4 + 3]; }
      for (const m of S.meshes) m.visible = m.userData.occl;
      R.autoClear = true; R.render(S.scene, C); read();
      for (const m of S.meshes) m.visible = !m.userData.occl;
      R.autoClear = false; R.clear(true, false, false); R.render(S.scene, C); read();
    }
    C.projectionMatrix.copy(P0);
  } finally {
    for (const m of S.meshes) m.visible = true;
    R.setRenderTarget(prev.t); R.autoClear = prev.ac; R.setClearColor(prev.cc, prev.ca); R.shadowMap.enabled = prev.sm;
  }
  S.views++;
  return { newSeen: seen };
};

// ------------------------------------------------------------------ names: placerec's parts (boxes in the world) and sites
const GENERIC = /^(add|addM|bpart|put|at|mesh|k|kk|\?|fn|build|flush|push|callers|site|R\.\w+|Kit\.\w+|Batch\.\w+|<anonymous>|Array\.\w+|forEach|map)$/;
const siteLabel = (site) => {
  if (!site) return '';
  const fr = site.split(' < ').map((s) => { const m = /^(.*)@([\w.-]+):(\d+)$/.exec(s); return m ? { fn: m[1], file: m[2] } : null; }).filter(Boolean);
  const good = fr.filter((f) => !GENERIC.test(f.fn) && !/^(placerec|three\.module\.min|three\.core\.min)\.js$/.test(f.file));
  const f = good[0] || fr[0]; if (!f) return '';
  return `${f.fn}@${f.file}`;
};
function nameOf(src) {
  let m = /^put:\(?(\w+)/.exec(src); if (m && m[1] !== 'k' && m[1] !== 'kk') return m[1];
  if ((m = /^put:\(kk?\)\s*=>\s*(?:P\.)?(\w+)/.exec(src))) return m[1];
  if ((m = /P\.(\w+)\(/.exec(src))) return m[1];
  if ((m = /\b(\w+)\(\s*kk?\b/.exec(src))) return m[1];
  return 'custom';
}
const kitLabel = (f) => { const n = nameOf(f.src); if (n !== 'fn' && n !== 'custom' && n !== 'k') return 'kit:' + n; for (let q = f; q; q = q.parent) { const m = nameOf(q.src); if (m !== 'fn' && m !== 'custom' && m !== 'k') return `kit:${n} in ${m}` + (f.site ? ' ' + siteLabel(f.site) : ''); } return `kit:${n} ` + siteLabel(f.site || ''); };
function partsIndex(box) {
  // every recorded part whose world box meets `box` ([x0, z0, x1, z1]), in a 4 m grid
  const parts = [], cellSz = 4, grid = new Map();
  const corners = (Mw, b, label) => {
    const e = Mw.elements; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let c = 0; c < 8; c++) {
      const x = c & 1 ? b[3] : b[0], y = c & 2 ? b[4] : b[1], z = c & 4 ? b[5] : b[2];
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (X < x0) x0 = X; if (Y < y0) y0 = Y; if (Z < z0) z0 = Z; if (X > x1) x1 = X; if (Y > y1) y1 = Y; if (Z > z1) z1 = Z;
    }
    if (x1 < box[0] || x0 > box[2] || z1 < box[1] || z0 > box[3]) return;
    const p = { b: [x0 - 0.03, y0 - 0.03, z0 - 0.03, x1 + 0.03, y1 + 0.03, z1 + 0.03], v: (x1 - x0 + 0.01) * (y1 - y0 + 0.01) * (z1 - z0 + 0.01), label };
    parts.push(p);
    for (let gx = Math.floor(x0 / cellSz); gx <= Math.floor(x1 / cellSz); gx++) for (let gz = Math.floor(z0 / cellSz); gz <= Math.floor(z1 / cellSz); gz++) {
      const k = gx * 100000 + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
    }
  };
  if (REC) {
    const Mw = new T.Matrix4();
    for (const b of REC.bparts) { if (!b.parent) continue; b.parent.updateWorldMatrix(true, false); Mw.multiplyMatrices(b.parent.matrixWorld, b.m); corners(Mw, b.box, 'batch:' + (b.tag?.tag || siteLabel(b.site))); }
    for (const p of REC.mergedParts) corners(p.m, p.box, 'merged:' + (p.tag?.tag || siteLabel(p.site) || p.name));
    for (const f of REC.frames) { if (!f.parts.length) continue; const W0 = f.kit.group.matrixWorld; for (const q of f.parts) { Mw.multiplyMatrices(W0, q[0]); corners(Mw, [q[1], q[2], q[3], q[4], q[5], q[6]], kitLabel(f)); } }
  }
  const find = (t) => {
    const p = triPos, o = t * 9, cx = (p[o] + p[o + 3] + p[o + 6]) / 3, cz = (p[o + 2] + p[o + 5] + p[o + 8]) / 3;
    const L = grid.get(Math.floor(cx / cellSz) * 100000 + Math.floor(cz / cellSz)); if (!L) return null;
    let best = null;
    for (const q of L) {
      const b = q.b; let ok = true;
      for (let j = 0; j < 9 && ok; j += 3) if (p[o + j] < b[0] || p[o + j] > b[3] || p[o + j + 1] < b[1] || p[o + j + 1] > b[4] || p[o + j + 2] < b[2] || p[o + j + 2] > b[5]) ok = false;
      if (ok && (!best || q.v < best.v)) best = q;
    }
    return best?.label || null;
  };
  return { n: parts.length, find };
}
function objLabel(r) {
  const o = r.o;
  if (r.bm) { const m = o.material; return { own: `lodBatch:${m?.name || m?.type}:sculpt${r.bm.gi}(${o._geometryInfo[r.bm.gi].count / 3} tris)`, built: false, desc: '' }; }
  const s = REC?.sites?.get(o);
  const own = s ? (s.tag?.tag || siteLabel(s.site)) : '';
  const built = REC?.built?.has(o) || o.name === 'merged' || !own;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  const desc = `${o.isInstancedMesh ? 'inst ' : o.isBatchedMesh ? 'batchedmesh ' : ''}${o.name || ''}[${m?.name || m?.type || ''}]`;
  return { own, built, desc };
}

// ------------------------------------------------------------------ the analysis
const CLASSES = ['buried', 'under/inside a solid', 'bottom on the ground', 'never front-facing', 'outside every view', 'tiny', 'occluded'];
HT.CLASSES = CLASSES;
HT.analyse = (views, box) => {
  const N = S.N, cls = (S.cls = new Int8Array(N).fill(-1));   // -1 seen (or not analysed)
  const terrain = G.physics.terrain, phys = G.physics;
  const W1 = gl.drawingBufferWidth, H1 = gl.drawingBufferHeight;
  // per view: the frustum, the camera, the projection
  const VV = views.map((v) => {
    const Mw = new T.Matrix4().fromArray(v.cam.M), P = new T.Matrix4().fromArray(v.cam.P), Vi = Mw.clone().invert(), PV = P.clone().multiply(Vi);
    const F = new T.Frustum().setFromProjectionMatrix(PV);
    const objs = new Set(); for (const o of v.objs) { const i = objIndex.get(o); if (i != null) objs.add(i); }
    return { F, PV: PV.elements, cp: new T.Vector3().setFromMatrixPosition(Mw), objs };
  });
  // which views submitted each object
  const objViews = S.objs.map(() => []);
  VV.forEach((v, vi) => { for (const i of v.objs) objViews[i].push(vi); });
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
  const inF = (F, p, o) => { for (const pl of F.planes) { const N0 = pl.normal, d = pl.constant; if (N0.x * p[o] + N0.y * p[o + 1] + N0.z * p[o + 2] + d < 0 && N0.x * p[o + 3] + N0.y * p[o + 4] + N0.z * p[o + 5] + d < 0 && N0.x * p[o + 6] + N0.y * p[o + 7] + N0.z * p[o + 8] + d < 0) return false; } return true; };
  const area = (E, p, o) => {
    const s = [];
    for (let j = 0; j < 9; j += 3) { const x = p[o + j], y = p[o + j + 1], z = p[o + j + 2], w = E[3] * x + E[7] * y + E[11] * z + E[15]; if (w <= 0.05) return 1e9; s.push(((E[0] * x + E[4] * y + E[8] * z + E[12]) / w) * 0.5 * W1, ((E[1] * x + E[5] * y + E[9] * z + E[13]) / w) * 0.5 * H1); }
    return Math.abs((s[2] - s[0]) * (s[5] - s[1]) - (s[4] - s[0]) * (s[3] - s[1])) / 2;
  };
  const p = triPos;
  for (let t = 0; t < N; t++) {
    if (S.seenPix[t]) continue;
    const o = t * 9;
    a.fromArray(p, o); b.fromArray(p, o + 3); c.fromArray(p, o + 6);
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const len = n.length(); if (len > 0) n.divideScalar(len);
    const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
    // view-independent causes first
    if (a.y < terrain.heightAt(a.x, a.z) - 0.03 && b.y < terrain.heightAt(b.x, b.z) - 0.03 && c.y < terrain.heightAt(c.x, c.z) - 0.03) { cls[t] = 0; continue; }
    let inside = false;
    for (const C of phys.near(cx, cz)) {
      if (!C.enabled || C.seeThrough) continue;
      if (cy < C.top - 0.05 && cy > (C.bottom ?? -1e9) - 0.6 && phys._inside(C, cx, cz, -0.06)) { inside = true; break; }
    }
    if (inside) { cls[t] = 1; continue; }
    if (n.y < -0.7 && cy - phys.groundAt(cx, cz, cy + 0.05) < 0.3) { cls[t] = 2; continue; }
    // then what the samples saw
    let anyF = false, anyFace = false, maxA = 0;
    const dbl = triFlag[t] & 1;
    for (const vi of objViews[triObj[t]]) {
      const V = VV[vi];
      if (!inF(V.F, p, o)) continue;
      anyF = true;
      const face = dbl || (n.x * (V.cp.x - cx) + n.y * (V.cp.y - cy) + n.z * (V.cp.z - cz)) > 0;
      if (!face) continue;
      anyFace = true;
      const A = area(V.PV, p, o); if (A > maxA) maxA = A;
      if (maxA >= 1) break;
    }
    cls[t] = !anyF ? 4 : !anyFace ? 3 : maxA < 1 ? 5 : 6;
  }
  // ---- totals
  const T0 = { tris: 0, seen: 0, batched: 0, dbl: 0, dblBackSeen: 0, dblSeen: 0, byClass: CLASSES.map(() => 0) };
  for (let t = 0; t < N; t++) {
    if (triFlag[t] & 4) T0.batched++;
    T0.tris++;
    if (S.seenPix[t]) T0.seen++; else T0.byClass[cls[t]]++;
    if (triFlag[t] & 1) { T0.dbl++; if (S.seenPix[t]) T0.dblSeen++; if (S.seenFlag[t] & 2) T0.dblBackSeen++; }
  }
  // ---- per view: what was submitted (soup objects of that view), and how much of it is never seen
  const objHidden = S.objs.map((r) => { let h = 0, hc = CLASSES.map(() => 0), dbl = 0; for (let t = r.t0; t < r.t0 + r.n; t++) { if (triFlag[t] & 1) dbl++; if (!S.seenPix[t]) { h++; hc[cls[t]]++; } } return { h, hc, dbl }; });
  const perView = VV.map((V, vi) => {
    let tris = 0, hid = 0, draws = 0, hidDraws = 0, dbl = 0, dblBackInF = 0; const hc = CLASSES.map(() => 0);
    const per = new Map();   // (an InstancedMesh's entries are one draw)
    for (const i of V.objs) {
      const r = S.objs[i];
      tris += r.n; hid += objHidden[i].h; dbl += objHidden[i].dbl; objHidden[i].hc.forEach((x, k) => (hc[k] += x));
      if (r.bm) continue;
      const q = per.get(r.o) || { n: 0, h: 0 }; q.n += r.n; q.h += objHidden[i].h; per.set(r.o, q);
    }
    for (const q of per.values()) { draws++; if (q.h === q.n) hidDraws++; }
    // double-sided triangles turned away from this camera but in its view: rasterised only because of the double side
    for (const i of V.objs) {
      const r = S.objs[i]; if (!objHidden[i].dbl) continue;
      for (let t = r.t0; t < r.t0 + r.n; t++) {
        if (!(triFlag[t] & 1)) continue; const o = t * 9;
        if (!inF(V.F, p, o)) continue;
        a.fromArray(p, o); b.fromArray(p, o + 3); c.fromArray(p, o + 6); n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        if (n.x * (V.cp.x - a.x) + n.y * (V.cp.y - a.y) + n.z * (V.cp.z - a.z) < 0) dblBackInF++;
      }
    }
    // the pixels the never-seen triangles cover when rasterised (in the view, turned to the camera, clipped to the screen
    // by their box only: an upper bound of the fragments they cost — what the depth test rejects early is cheaper), by class
    const px = CLASSES.map(() => 0); let pxAll = 0;
    if (HT.fragArea !== false) for (const i of V.objs) {
      const r = S.objs[i];
      for (let t = r.t0; t < r.t0 + r.n; t++) {
        const o = t * 9; if (!inF(V.F, p, o)) continue;
        a.fromArray(p, o); b.fromArray(p, o + 3); c.fromArray(p, o + 6); n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        if (!(triFlag[t] & 1) && n.x * (V.cp.x - a.x) + n.y * (V.cp.y - a.y) + n.z * (V.cp.z - a.z) <= 0) continue;
        const A = Math.min(area(V.PV, p, o), W1 * H1);
        pxAll += A; if (!S.seenPix[t]) px[cls[t]] += A;
      }
    }
    return { tris, hid, draws, hidDraws, dbl, dblBackInF, hc, px: px.map(Math.round), pxAll: Math.round(pxAll) };
  });
  // ---- sources: by label, weighted by the views that submitted them
  const PI = partsIndex(box);
  const byLabel = new Map();
  const add = (label, file, k, cnt, w) => {
    let e = byLabel.get(label); if (!e) byLabel.set(label, (e = { label, tris: 0, hidden: 0, hidW: 0, triW: 0, cls: CLASSES.map(() => 0) }));
    if (k < 0) { e.tris += cnt; e.triW += cnt * w; } else { e.tris += cnt; e.triW += cnt * w; e.hidden += cnt; e.hidW += cnt * w; e.cls[k] += cnt; }
  };
  for (const r of S.objs) {
    const L = objLabel(r), w = objViews[r.oi].length;
    r.label = L;
    for (let t = r.t0; t < r.t0 + r.n; t++) {
      let lab = L.own || '';
      if (L.built) lab = PI.find(t) || ('mesh:' + (L.own || L.desc));
      add(lab, '', S.seenPix[t] ? -1 : cls[t], 1, w);
    }
  }
  const sources = [...byLabel.values()].sort((x, y) => y.hidW - x.hidW).slice(0, 40);
  return { totals: T0, classes: CLASSES, perView, sources, parts: PI.n };
};

// ------------------------------------------------------------------ the prototype: index buffers without the unseen triangles
// mode 'all': every never-seen triangle; 'geo': only the view-independent causes (buried, under/inside a solid, bottoms)
HT.trim = (mode = 'all') => {
  const keepSet = new Map();   // geometry → Uint8Array keep flags per triangle (1 = seen somewhere, keep)
  const users = new Map();
  for (const r of S.objs) { if (r.bm) continue; const g = r.geo; if (!users.has(g)) users.set(g, []); users.get(g).push(r); }
  let removed = 0, geos = 0, skipped = 0, total = 0;
  S.trims = [];
  for (const [g, rs] of users) {
    if (Array.isArray(rs[0].o.material) || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) { skipped++; continue; }
    const cnt = (g.index ? g.index.count : g.attributes.position.count) / 3;
    // (a triangle goes only if no object of the soup that uses this geometry shows it; users outside the soup were never
    //  submitted at a sample, so at the samples the picture is the same — elsewhere in Citadel it may not be: a prototype)
    const keep = new Uint8Array(cnt);
    for (const r of rs) for (let t = r.t0; t < r.t0 + r.n; t++) { const unseen = !S.seenPix[t]; const k = S.cls[t]; const go = unseen && (mode === 'all' || k <= 2); if (!go) keep[triLocal[t]] = 1; }
    let n = 0; for (let i = 0; i < cnt; i++) n += keep[i];
    total += cnt;
    if (n === cnt) continue;
    const old = g.index, src = old ? old.array : null, idx = new Uint32Array(Math.max(3, n * 3)); let j = 0;
    for (let i = 0; i < cnt; i++) if (keep[i]) { idx[j++] = src ? src[i * 3] : i * 3; idx[j++] = src ? src[i * 3 + 1] : i * 3 + 1; idx[j++] = src ? src[i * 3 + 2] : i * 3 + 2; }
    if (!n) { const v0 = src ? src[0] : 0; idx[0] = idx[1] = idx[2] = v0; }
    S.trims.push({ g, orig: old, trimmed: new T.BufferAttribute(idx, 1) });
    removed += cnt - n; geos++;
  }
  // a BatchedMesh's sculpts share one index buffer and its draw ranges: a triangle unseen in every instance drawn with that
  // sculpt is made degenerate (its three corners one vertex): rejected before rasterising, its vertices still shaded
  const bmUsers = new Map();
  for (const r of S.objs) { if (!r.bm) continue; const k = r.o; if (!bmUsers.has(k)) bmUsers.set(k, []); bmUsers.get(k).push(r); }
  let degen = 0; S.bmTrims = [];
  for (const [bm, rs] of bmUsers) {
    const idx = bm.geometry.index; if (!idx) continue;
    const seenK = new Set(), all = new Set();
    for (const r of rs) for (let t = r.t0; t < r.t0 + r.n; t++) { const k = triLocal[t]; all.add(k); const go = !S.seenPix[t] && (mode === 'all' || S.cls[t] <= 2); if (!go) seenK.add(k); }
    const ks = [...all].filter((k) => !seenK.has(k)); if (!ks.length) continue;
    const orig = new Uint32Array(ks.length * 3);
    ks.forEach((k, i) => { orig[i * 3] = idx.getX(k * 3); orig[i * 3 + 1] = idx.getX(k * 3 + 1); orig[i * 3 + 2] = idx.getX(k * 3 + 2); });
    S.bmTrims.push({ idx, ks, orig }); degen += ks.length;
  }
  return { mode, geos, removed, skipped, total, bmDegenerate: degen };
};
HT.applyTrim = (on) => {
  for (const q of S.trims || []) q.g.setIndex(on ? q.trimmed : q.orig);
  for (const q of S.bmTrims || []) { q.ks.forEach((k, i) => { const a = q.orig[i * 3]; q.idx.setX(k * 3, a); q.idx.setX(k * 3 + 1, on ? a : q.orig[i * 3 + 1]); q.idx.setX(k * 3 + 2, on ? a : q.orig[i * 3 + 2]); }); q.idx.needsUpdate = true; }
};
// the draw batches rebuilt from the geometries as they are now
// (main.js's mid() runs drawBatch.update only for an area shadowcull.js holds; Citadel at Medium was not one in these
//  runs, so `enabled = false` alone left its batches drawn: reset and build them here)
HT.batches = (on) => { const D = G.drawBatch; if (!on) { D.enabled = false; D.reset(); } else { D.enabled = true; D.update(areaRoot()); } draw(); let n = 0; G.scene.traverse((o) => { if (o.userData.drawBatch) n++; }); return n; };
HT.rebuild = () => { HT.batches(false); return HT.batches(true); };
// ------------------------------------------------------------------ what a build-time trim could drop, over EVERY instance
// For the shared vegetation geometries (kit.js LodBatch's sculpts: trees, bushes, rocks; world.js's grass and flower
// tufts): a triangle whose three corners lie under the terrain (by `margin`) at every instance placed with it, on the
// whole island — not only the ones this walk saw. Such a triangle is never visible anywhere (the camera never goes under
// the ground); dropping it from the shared geometry changes no picture. Counted per geometry, with its instances.
// (Inside the page's closure: G, T and HT as above.)
HT.buriedAll = async (margin = 0.03) => {
  const T3 = T, terrain = G.physics.terrain, out = [];
  const MI = new T3.Matrix4(), v = new T3.Vector3();
  const judge = (geo, start, count, mats, label) => {
    const idx = geo.index, pos = geo.attributes.position, n = Math.floor(count / 3);
    const corner = (k) => (idx ? idx.getX(k) : k);
    const vtx = new Map();   // vertex → its slot
    for (let k = start; k < start + n * 3; k++) { const vi = corner(k); if (!vtx.has(vi)) vtx.set(vi, vtx.size); }
    const under = new Uint8Array(vtx.size), buried = new Uint8Array(n).fill(1);
    for (const W of mats) {
      for (const [vi, s] of vtx) { v.fromBufferAttribute(pos, vi).applyMatrix4(W); under[s] = v.y < terrain.heightAt(v.x, v.z) - margin ? 1 : 0; }
      let left = 0;
      for (let t = 0; t < n; t++) if (buried[t]) { const k = start + t * 3; if (!(under[vtx.get(corner(k))] && under[vtx.get(corner(k + 1))] && under[vtx.get(corner(k + 2))])) buried[t] = 0; else left++; }
      if (!left) break;
    }
    let b = 0; for (let t = 0; t < n; t++) b += buried[t];
    out.push({ label, tris: n, inst: mats.length, buried: b, share: +(b / n).toFixed(3) });
  };
  const kit = await import(new URL('src/game/kit.js', location.href).href);
  for (const L of kit.LOD_BATCHES) {
    const bm = L.mesh; if (!bm || !L.inst) continue;
    const users = new Map();
    for (const I of L.inst) for (const g of [I.hi, I.lo]) { if (g < 0) continue; if (!users.has(g)) users.set(g, []); users.get(g).push(I.k); }
    for (const [g, ks] of users) {
      const info = bm._geometryInfo[g];
      const mats = ks.filter((k) => bm._instanceInfo[k]?.active).map((k) => { bm.getMatrixAt(k, MI); return new T3.Matrix4().multiplyMatrices(bm.matrixWorld, MI); })
        .filter((W) => Math.abs(W.elements[0]) + Math.abs(W.elements[2]) > 1e-3);   // (a tree taken out by a house is scaled to 1e-4)
      if (!mats.length) continue;
      judge(bm.geometry, info.start, info.count, mats, `lodBatch:${bm.material.name || bm.material.type}:sculpt${g}`);
    }
  }
  for (const P of G.world.smallPools || []) {
    const mats = [];
    for (const t of P.tiles) for (let i = 0; i < t.count; i++) { t.getMatrixAt(i, MI); if (Math.abs(MI.elements[0]) + Math.abs(MI.elements[2]) < 1e-3) continue; mats.push(new T3.Matrix4().multiplyMatrices(t.matrixWorld, MI)); }
    if (mats.length) judge(P.g, 0, P.g.index ? P.g.index.count : P.g.attributes.position.count, mats, `smallPool:${P.m.name || P.m.type}`);
  }
  return out;
};
// ------------------------------------------------------------------ a picture: the view in grey, the never-seen triangles
// of the view-independent causes drawn through everything (x-ray): red buried, orange under/inside a solid, yellow a
// bottom on the ground. (After HT.analyse; the soup's chunks and the view's objects as in the id pass.)
HT.xray = (view, W = 1280, H = 720) => {
  const N = S.N, CW = 4096, CH = Math.ceil(N / CW), data = new Uint8Array(CW * CH);
  for (let t = 0; t < N; t++) data[t] = S.seenPix[t] ? 0 : S.cls[t] + 1;
  const tex = new T.DataTexture(data, CW, CH, T.RedFormat, T.UnsignedByteType); tex.needsUpdate = true;
  S.visData.fill(0); for (const o of view.objs) { const i = objIndex.get(o); if (i != null) S.visData[i] = 255; } S.vis.needsUpdate = true;
  const vs = `attribute float tid; attribute float oid; uniform sampler2D vis; flat varying float vId; varying vec3 vP;
    void main() { ivec2 c = ivec2(int(mod(oid, 256.0)), int(floor(oid / 256.0))); float on = texelFetch(vis, c, 0).r; vId = tid; vP = position;
      gl_Position = on > 0.5 ? projectionMatrix * modelViewMatrix * vec4(position, 1.0) : vec4(2.0, 2.0, 2.0, 1.0); }`;
  const fs = (xr) => `uniform sampler2D cls; flat varying float vId; varying vec3 vP; layout(location = 0) out highp vec4 outC;
    void main() { int k = int(texelFetch(cls, ivec2(int(mod(vId, 4096.0)), int(floor(vId / 4096.0))), 0).r * 255.0 + 0.5);
      vec3 n = normalize(cross(dFdx(vP), dFdy(vP))); float l = 0.45 + 0.4 * abs(n.y) + 0.15 * abs(n.x);
      ${xr ? 'if (k < 1 || k > 3) discard; vec3 c = k == 1 ? vec3(1.0, 0.1, 0.1) : k == 2 ? vec3(1.0, 0.55, 0.0) : vec3(1.0, 0.95, 0.1); outC = vec4(c * (0.6 + 0.4 * l), 0.55);'
          : 'outC = vec4(vec3(k == 0 ? 0.62 : 0.42) * l, 1.0);'} }`;
  const mk = (xr) => new T.ShaderMaterial({ glslVersion: T.GLSL3, vertexShader: vs, fragmentShader: fs(xr), uniforms: { vis: { value: S.vis }, cls: { value: tex } }, side: T.DoubleSide, depthTest: !xr, depthWrite: !xr, transparent: xr });
  const m1 = mk(true), keep = S.meshes.map((m) => m.material), m0s = keep.map((k) => { const m = mk(false); m.side = k.side; return m; });
  const rt = new T.WebGLRenderTarget(W, H, { samples: 0 }), buf = new Uint8Array(W * H * 4);
  const C = S.cam; C.matrixWorld.fromArray(view.cam.M); C.matrixWorld.decompose(C.position, C.quaternion, C.scale); C.updateMatrixWorld(true);
  C.projectionMatrix.fromArray(view.cam.P); C.projectionMatrixInverse.copy(C.projectionMatrix).invert();
  const prev = { t: R.getRenderTarget(), ac: R.autoClear, sm: R.shadowMap.enabled };
  R.shadowMap.enabled = false;
  try {
    R.setRenderTarget(rt); R.setClearColor(0x9fb8cc, 1); R.autoClear = true;
    S.meshes.forEach((m, i) => (m.material = m0s[i])); R.render(S.scene, C);
    R.autoClear = false; for (const m of S.meshes) m.material = m1; R.render(S.scene, C);
    R.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  } finally { S.meshes.forEach((m, i) => (m.material = keep[i])); R.setRenderTarget(prev.t); R.autoClear = prev.ac; R.shadowMap.enabled = prev.sm; m0s.forEach((m) => m.dispose()); m1.dispose(); tex.dispose(); rt.dispose(); }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) im.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  cx.putImageData(im, 0, 0); return cv.toDataURL('image/png');
};
})();
