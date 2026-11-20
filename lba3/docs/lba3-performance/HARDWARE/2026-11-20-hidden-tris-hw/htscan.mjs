// HIDDEN-TRIS-HW (CLOUD_ORDERS 59): the triangles a player never sees, and what they cost on this machine's GPU.
// node htscan.mjs <url> <out dir> <area: citadel|zeelich> [spacing m]
// 1. ID render: every drawn triangle of the static world (meshes, draw batches, instanced props; not the characters, whose
//    skinned meshes move, and not three's BatchedMesh) gets its own colour; the scene is drawn from every walkable spot of
//    the area on a grid, 8 headings each, with the game's follow camera offset and a higher view, and read back. A
//    triangle never seen from the front (nor, double-sided, from the back) is hidden; double-sided triangles whose back
//    is never seen are counted apart. Opaque first (writing depth), then the transparent ones against that depth.
// 2. The cost: the same camera points drawn with the game's own renderer and GPU timer, the world as built and the world
//    with the hidden triangles left out of their index (A/B/A/B), at Medium and at High.
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, OUT, AREA = 'citadel', SP = '4'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const AREAS = {
  // Twinsen's house (−50.6, 79.8), its yard and the lane, down to the square with the well
  citadel: { box: [-82, -14, -6, 100], start: [-44.5, 80.5], meas: [[-44.5, 80.5, -1.57], [-40, 70, 3.14], [-38, 50, 3.14], [-36, 30, 3.14], [-40, 10, 3.14], [-42, 2, 0], [-30, 2, -1.57], [-50, 40, 0]] },
  // Zeelich from its arrival point (the street): a box 70 m across round where he arrives; the camera points round it
  zeelich: { enter: 'zeelich', R: 35 },
};
const A = AREAS[AREA];
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1940,1220', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const log = (s) => { console.log(s); fs.appendFileSync(`${OUT}/log.txt`, s + '\n'); };
fs.writeFileSync(`${OUT}/log.txt`, '');
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
const setup = await page.evaluate(async (A) => {
  const THREE = await import('three');
  const G = game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  const h = G.hero;
  if (A.enter) { G.enterRoom(A.enter, null, true, true); for (let i = 0; i < 20; i++) G.step(1 / 30); const x = h.pos.x, z = h.pos.z;
    A.start = [x, z]; A.box = [x - A.R, x + A.R, z - A.R, z + A.R]; A.meas = [[x, z, 0], [x + 12, z, 1.57], [x - 12, z, -1.57], [x, z + 12, 3.14], [x, z - 12, 0], [x + 20, z + 15, 2.4], [x - 20, z - 15, -0.8], [x + 18, z - 18, 0.8]]; }
  const [sx, sz] = A.start; if (G.room && !A.enter) G.exitRoom({ x: sx, z: sz, a: -Math.PI / 2 }, true);
  h.pos.set(sx, G.physics.groundAt(sx, sz, h.pos.y + 20), sz); h.angle = -Math.PI / 2; G.camRig.lba && (G.camRig.lba.init = false);
  for (let i = 0; i < 40; i++) G.step(1 / 30);
  G.renderer.render();
  // the follow camera's offset in the hero's frame (behind and above him, looking at a point over him)
  const C = G.camera, c = Math.cos(h.angle), s = Math.sin(h.angle);
  const dx = C.position.x - h.pos.x, dz = C.position.z - h.pos.z;
  const off = { f: dx * s + dz * c, r: dx * c - dz * s, y: C.position.y - h.pos.y };
  const dir = new THREE.Vector3(); C.getWorldDirection(dir);
  // drawables: visible static meshes
  const D = []; let base = 0; const skipped = { skinned: 0, skinnedTris: 0, skinnedDs: 0, batchedMesh: 0, batchedTris: 0, groups: 0, other: 0 };
  const triOf = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  G.scene.traverse((o) => {
    if (!(o.isMesh)) return; let v = true; for (let p = o; p; p = p.parent) if (!p.visible) { v = false; break; } if (!v) return;
    const g = o.geometry; if (!g?.attributes?.position) return;
    const m = [].concat(o.material)[0];
    if (o.isSkinnedMesh) { skipped.skinned++; const t = triOf(g); skipped.skinnedTris += t; if (m?.side === THREE.DoubleSide) skipped.skinnedDs += t; return; }
    if (o.isBatchedMesh) { skipped.batchedMesh++; skipped.batchedTris += triOf(g); return; }
    if (Array.isArray(o.material) && o.material.length > 1) { skipped.groups++; }
    if (m?.isShaderMaterial && !m.isMeshStandardMaterial && !m.isMeshLambertMaterial && !m.isMeshPhongMaterial && !m.isMeshBasicMaterial && !m.isMeshToonMaterial) { skipped.other++; }
    const T = triOf(g), n = o.isInstancedMesh ? o.count : 1;
    D.push({ o, T, n, base, ds: m?.side === THREE.DoubleSide, tr: !!(m?.transparent && m.opacity < 1 || m?.transparent && !m.depthWrite), name: o.name || o.parent?.name || '', kind: o.isInstancedMesh ? 'instanced' : (o.userData?.batch || /batch/i.test(o.name || '')) ? 'batch' : 'mesh' });
    base += T * n;
  });
  // ID geometry per source geometry (non-indexed, a triangle index per vertex)
  const idGeo = new Map();
  const mkId = (g) => { let q = idGeo.get(g); if (q) return q; const P = g.attributes.position, I = g.index, T = triOf(g);
    const pos = new Float32Array(T * 9), tid = new Float32Array(T * 3);
    for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) { const vi = I ? I.getX(t * 3 + k) : t * 3 + k; pos[(t * 3 + k) * 3] = P.getX(vi); pos[(t * 3 + k) * 3 + 1] = P.getY(vi); pos[(t * 3 + k) * 3 + 2] = P.getZ(vi); tid[t * 3 + k] = t; }
    q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.BufferAttribute(pos, 3)); q.setAttribute('tid', new THREE.BufferAttribute(tid, 1)); idGeo.set(g, q); return q; };
  const VS = `in float tid; uniform float base; uniform float tcount; flat out highp int vid;
    void main() { mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
      gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      vid = int(base) + gl_InstanceID * int(tcount) + int(tid + 0.5);
    #else
      vid = int(base) + int(tid + 0.5);
    #endif
    }`;
  const FS = `flat in highp int vid; out highp vec4 oc;
    void main() { oc = vec4(float(vid & 255), float((vid >> 8) & 255), float((vid >> 16) & 255), gl_FrontFacing ? 255.0 : 127.0) / 255.0; }`;
  const sOp = new THREE.Scene(), sTr = new THREE.Scene(); sOp.matrixWorldAutoUpdate = false; sTr.matrixWorldAutoUpdate = false;
  for (const d of D) {
    const g = mkId(d.o.geometry), m = [].concat(d.o.material)[0];
    const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: FS, uniforms: { base: { value: d.base }, tcount: { value: d.T } }, side: m?.side ?? THREE.FrontSide, depthWrite: !d.tr, depthTest: true });
    let q;
    if (d.o.isInstancedMesh) { q = new THREE.InstancedMesh(g, mat, d.o.count); q.instanceMatrix = d.o.instanceMatrix; q.count = d.o.count; }
    else q = new THREE.Mesh(g, mat);
    q.matrixAutoUpdate = false; q.matrixWorld.copy(d.o.matrixWorld); q.frustumCulled = false;
    (d.tr ? sTr : sOp).add(q);
  }
  const r = G.renderer.renderer, bsz = new THREE.Vector2(); r.getDrawingBufferSize(bsz);
  const W = Math.round(bsz.x / 2), H = Math.round(bsz.y / 2);   // (half the drawing buffer: 960×540; a triangle smaller than 2 px never "seen" is noted)
  const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  const seenF = new Uint8Array(base), seenB = new Uint8Array(base), px = new Uint8Array(W * H * 4);
  const cam = new THREE.PerspectiveCamera(C.fov, bsz.x / bsz.y, C.near, C.far);
  window.__H = { box: A.box, THREE, D, base, sOp, sTr, rt, seenF, seenB, px, W, H, cam, off, idGeo, views: 0 };
  return { area: { start: A.start, box: A.box, meas: A.meas }, drawables: D.length, triangles: base, skipped, off, cam: { fov: C.fov, near: C.near, far: C.far, pitch: +Math.asin(dir.y).toFixed(3) }, rt: [W, H], byKind: D.reduce((a, d) => { const k = d.kind + (d.ds ? '/ds' : '') + (d.tr ? '/tr' : ''); a[k] = (a[k] || 0) + d.T * d.n; return a; }, {}) };
}, A);
log('setup ' + JSON.stringify(setup));
if (setup.area?.box) { A.box = setup.area.box; A.meas = setup.area.meas; A.start = setup.area.start; }
// the walkable spots on a grid
const spots = await page.evaluate(([A, SP]) => { const G = game, P = G.physics, out = []; const [x0, x1, z0, z1] = A.box;
  for (let x = x0; x <= x1; x += SP) for (let z = z0; z <= z1; z += SP) { const g = P.groundAt(x, z, 80); if (g == null || !isFinite(g) || g < 0.3) continue;
    const gs = [P.groundAt(x + 1, z, g + 2), P.groundAt(x - 1, z, g + 2), P.groundAt(x, z + 1, g + 2), P.groundAt(x, z - 1, g + 2)]; if (gs.some((q) => q == null || Math.abs(q - g) > 0.7)) continue;
    if (P.solidAt(x, z, g + 0.9, 0.3)) continue; if (G.water?.at?.(x, z)) continue; out.push([x, z, g]); }
  return out; }, [A, +SP]);
log(`spots ${spots.length}`);
// the ID render, in chunks
const T0 = Date.now();
for (let i = 0; i < spots.length; i += 12) {
  await page.evaluate((chunk) => { const S = window.__H, G = game, r = G.renderer.renderer, { THREE } = S;
    const prevRT = r.getRenderTarget(), cc = new THREE.Color(); r.getClearColor(cc); const ca = r.getClearAlpha(), ac = r.autoClear;
    r.autoClear = false;
    for (const [x, z, g] of chunk) for (let k = 0; k < 8; k++) for (const view of ['follow', 'high']) {
      const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), o = S.off;
      const f = view === 'high' ? o.f * 0.8 : o.f, y = view === 'high' ? o.y * 2.2 + 3 : o.y;
      S.cam.position.set(x + f * s + o.r * c, g + y, z + f * c - o.r * s); S.cam.lookAt(x, g + 1.0, z); S.cam.updateMatrixWorld();
      r.setRenderTarget(S.rt); r.setClearColor(0x000000, 0); r.clear(true, true, true); r.render(S.sOp, S.cam);
      r.readRenderTargetPixels(S.rt, 0, 0, S.W, S.H, S.px);
      for (let p = 0; p < S.px.length; p += 4) { const al = S.px[p + 3]; if (!al) continue; const id = S.px[p] | (S.px[p + 1] << 8) | (S.px[p + 2] << 16); if (al > 200) S.seenF[id] = 1; else S.seenB[id] = 1; }
      if (S.sTr.children.length) { r.clear(true, false, false); r.render(S.sTr, S.cam); r.readRenderTargetPixels(S.rt, 0, 0, S.W, S.H, S.px);
        for (let p = 0; p < S.px.length; p += 4) { const al = S.px[p + 3]; if (!al) continue; const id = S.px[p] | (S.px[p + 1] << 8) | (S.px[p + 2] << 16); if (al > 200) S.seenF[id] = 1; else S.seenB[id] = 1; } }
      S.views++;
    }
    r.setRenderTarget(prevRT); r.setClearColor(cc, ca); r.autoClear = ac; }, spots.slice(i, i + 12));
  if (i % 120 === 0) log(`  ${i}/${spots.length} spots · ${Math.round((Date.now() - T0) / 1000)} s`);
}
// the hidden set: per drawable and in all; a geometry used by several drawables (or instances) keeps a triangle any of them shows
const res = await page.evaluate(() => { const S = window.__H, { D, seenF, seenB } = S, THREE = S.THREE;
  let tot = 0, hid = 0, dsBackHid = 0, dsTot = 0; const byKind = {}, top = [];
  const keepByGeo = new Map();
  const [bx0, bx1, bz0, bz1] = S.box, M = 20, inA = (x, z) => x > bx0 - M && x < bx1 + M && z > bz0 - M && z < bz1 + M;
  const v = new THREE.Vector3(), mI = new THREE.Matrix4(), mW = new THREE.Matrix4();
  let outside = 0;
  for (const d of D) { const g = d.o.geometry; let keep = keepByGeo.get(g); if (!keep) keepByGeo.set(g, (keep = new Uint8Array(d.T)));
    const P = g.attributes.position, I = g.index; let h = 0, bh = 0, inT = 0;
    for (let n = 0; n < d.n; n++) { mW.copy(d.o.matrixWorld); if (d.o.isInstancedMesh) { d.o.getMatrixAt(n, mI); mW.multiply(mI); }
      for (let t = 0; t < d.T; t++) { const id = d.base + n * d.T + t; const seen = seenF[id] || seenB[id];
        let cx = 0, cz = 0; for (let q = 0; q < 3; q++) { const vi = I ? I.getX(t * 3 + q) : t * 3 + q; v.fromBufferAttribute(P, vi).applyMatrix4(mW); cx += v.x; cz += v.z; }
        if (!inA(cx / 3, cz / 3)) { keep[t] = 1; outside++; continue; }
        inT++; if (seen) keep[t] = 1; else h++; if (d.ds && !seenB[id]) bh++; } }
    tot += inT; hid += h; if (d.ds) { dsTot += inT; dsBackHid += bh; }
    const k = d.kind + (d.ds ? '/ds' : '') + (d.tr ? '/tr' : ''); const b = byKind[k] ??= { tris: 0, hidden: 0 }; b.tris += inT; b.hidden += h;
    if (inT) { const ch = []; for (let p = d.o; p && ch.length < 4; p = p.parent) if (p.name) ch.push(p.name.slice(0, 24)); g.computeBoundingSphere?.(); const c = g.boundingSphere ? g.boundingSphere.center.clone().applyMatrix4(d.o.matrixWorld) : null;
      top.push({ name: ch.join(' < '), kind: d.kind, tris: inT, hidden: h, ds: d.ds, at: c ? [Math.round(c.x), Math.round(c.y), Math.round(c.z)] : null, r: g.boundingSphere ? Math.round(g.boundingSphere.radius) : null, mat: [].concat(d.o.material)[0]?.name || [].concat(d.o.material)[0]?.type }); } }
  top.sort((a, b) => b.hidden - a.hidden);
  // the stripped geometries: the kept triangles only (geometry groups left as they are)
  let geoStripped = 0, geoGroups = 0, trisRemoved = 0; S.alt = new Map();
  for (const [g, keep] of keepByGeo) { const T = keep.length; let k = 0; for (let t = 0; t < T; t++) k += keep[t]; if (k === T) continue;
    if (g.groups?.length > 1) { geoGroups++; continue; }
    const I = g.index, idx = []; for (let t = 0; t < T; t++) if (keep[t]) for (let q = 0; q < 3; q++) idx.push(I ? I.getX(t * 3 + q) : t * 3 + q);
    const n = new THREE.BufferGeometry(); for (const [a, v] of Object.entries(g.attributes)) n.setAttribute(a, v); n.setIndex(idx);
    n.boundingSphere = g.boundingSphere?.clone() ?? null; n.boundingBox = g.boundingBox?.clone() ?? null; n.userData = g.userData;
    S.alt.set(g, n); geoStripped++; trisRemoved += T - k; }
  return { views: S.views, outsideArea: outside, triangles: tot, hidden: hid, hiddenPct: +(100 * hid / tot).toFixed(1), dsTris: dsTot, dsBackNeverSeen: dsBackHid, byKind, top: top.slice(0, 25), geoStripped, geoGroups, trisRemovedPerGeometry: trisRemoved }; });
log('hidden ' + JSON.stringify(res));
fs.writeFileSync(`${OUT}/hidden.json`, JSON.stringify({ setup, spots: spots.length, ...res }, null, 1));
// 3. the cost: the camera points drawn by the game's renderer with its GPU timer, as built (A) and stripped (B)
const swap = (on) => page.evaluate((on) => { const S = window.__H; for (const d of S.D) { const g0 = d.o.userData.__g0 || d.o.geometry; d.o.userData.__g0 = g0; const n = S.alt.get(g0); d.o.geometry = on && n ? n : g0; } }, on);
const measure = (pts) => page.evaluate(async (pts) => { const G = game, S = window.__H, R = G.renderer, T = G.perf.gpuTimer; R.timer = T; const out = [];
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  for (const [x, z, a] of pts) { const g = G.physics.groundAt(x, z, 80), c = Math.cos(a), s = Math.sin(a), o = S.off;
    G.camera.position.set(x + o.f * s + o.r * c, g + o.y, z + o.f * c - o.r * s); G.camera.lookAt(x, g + 1.0, z); G.camera.updateMatrixWorld();
    for (let i = 0; i < 40; i++) { R.render(); await raf(); }
    T.reset(); const iv = []; let last = performance.now();
    for (let i = 0; i < 240; i++) { R.render(); await raf(); const n = performance.now(); iv.push(n - last); last = n; }
    const I0 = { ...R.renderer.info.render }; R.render(); const I1 = R.renderer.info.render; const fr = { tris: I1.triangles - I0.triangles, calls: I1.calls - I0.calls };
    for (let i = 0; i < 8; i++) { await raf(); T.end?.(); }
    const st = T.stats(); iv.sort((p, q) => p - q);
    out.push({ at: [x, z], gpuP50: st?.p50 ?? null, gpuP95: st?.p95 ?? null, frameP50: +iv[120].toFixed(2), frameP95: +iv[228].toFixed(2), tris: fr.tris, calls: fr.calls }); }
  R.timer = null; return out; }, pts);
const setQ = (q) => page.evaluate(async (q) => { const G = game; Object.assign(G.settings, { quality: q, qualityAuto: false, qualityChosenByHand: true }); G.applySettings(); for (let i = 0; i < 90; i++) { G.renderer.render(); await new Promise((r) => requestAnimationFrame(r)); } return G.settings.quality; }, q);
const cost = {};
for (const q of ['medium', 'high']) {
  log(`quality ${await setQ(q)}`);
  const rounds = [];
  for (const [tag, on] of [['A', false], ['B', true], ['A', false], ['B', true], ['A', false], ['B', true]]) { await swap(on); const m = await measure(A.meas); rounds.push({ tag, m }); log(`  ${q} ${tag} ` + JSON.stringify(m.map((p) => [p.gpuP50, p.tris, p.calls]))); }
  cost[q] = rounds;
}
await swap(false);
fs.writeFileSync(`${OUT}/cost.json`, JSON.stringify(cost, null, 1));
log('errors ' + JSON.stringify(errs.slice(0, 5)));
await browser.close(); process.exit(0);
