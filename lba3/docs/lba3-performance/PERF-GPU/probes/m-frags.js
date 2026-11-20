// shaded fragments per screen pixel, per object group, in the game's real draw order (main pass only), battery Medium
const G = game, R = G.renderer, r = R.renderer, gl = r.getContext();
G.settings.qualityAuto = false; G.settings.quality = 'medium'; G.applySettings();
G.setBattery(window.__BAT !== false);
G.warmGraphics(); await R.precompile();
const scene = window.__SCENE || 'street';
if (scene === 'street') { G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }
else if (scene === 'interior') G.enterRoom('house', null, true, true);
else if (scene === 'harbour') { G.exitRoom({ x: -107, z: 37, a: -1.2 }, true, true); G.camRig.setMode(G.settings.camera); }
else if (scene === 'hamalayi') { G.enterRoom('hamalayi', null, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; }
G.step(1.5); R.render(); R.render();
// groups
const charRoots = new Set();
for (const a of [G.hero, ...(G.npcs || []), ...(G.enemies || [])]) { const root = a?.rig?.root || a?.group || a?.mesh; if (root) charRoots.add(root); }
const under = (o, S) => { for (let p = o; p; p = p.parent) if (S.has(p)) return true; return false; };
const E = G.env;
const groupOf = (o, m) => {
  if (o.name === 'terrain') return 'terrain';
  if (o === E.water) return 'water';
  if (o === E.clouds || o === E.rain) return 'sky';
  if (o.isSkinnedMesh || under(o, charRoots)) return 'characters';
  if (o.name === 'lodBatch') return 'trees/bushes/rocks';
  if (o.name === 'smallPool') return 'grass/flowers';
  if (o.name === 'softParticles' || o.name === 'blobBatch' || o.isPoints) return 'particles/blobs';
  if (m.transparent) return 'other transparent';
  if (o.name === 'drawBatch' || o.name === 'merged' || under(o, new Set([G.world?.root].filter(Boolean)))) return 'static scenery';
  return 'other opaque';
};
const mats = new Map();
const matFor = (count, m) => {
  const k = [count, m.side, m.depthWrite, m.depthTest, m.depthFunc, m.transparent].join('|');
  let x = mats.get(k);
  if (!x) {
    x = new THREE_.MeshBasicMaterial({ color: 0xffffff, side: m.side, depthWrite: m.depthWrite, depthTest: m.depthTest, depthFunc: m.depthFunc, fog: false, toneMapped: false });
    if (count) { x.blending = THREE_.CustomBlending; x.blendEquation = THREE_.AddEquation; x.blendSrc = THREE_.OneFactor; x.blendDst = THREE_.OneFactor; x.transparent = m.transparent; }
    else { x.colorWrite = false; x.transparent = m.transparent; }
    mats.set(k, x); }
  return x;
};
const THREE_ = await import('three');
const C = R.composer, W = C.readBuffer.width, H = C.readBuffer.height;
const bg = G.scene.background, cc = r.getClearColor(new THREE_.Color()), ca = r.getClearAlpha();
const orig = r.renderBufferDirect.bind(r);
const spr = R.scenePass.render.bind(R.scenePass); R.scenePass.render = (rr, wb, rb, ...a) => { R.scenePass._lastWrite = rb; return spr(rr, wb, rb, ...a); };
const sm = r.shadowMap, au = sm.autoUpdate;
const seen = new Map();
const run = (want) => {
  G.scene.background = null; r.setClearColor(0x000000, 0); sm.autoUpdate = false;
  r.renderBufferDirect = (camera, sc, geometry, material, object, group) => {
    if (sc === null) return orig(camera, sc, geometry, material, object, group);
    const g = groupOf(object, material); seen.set(g, (seen.get(g) || 0) + 1);
    if (material.colorWrite === false) return orig(camera, sc, geometry, material, object, group);
    return orig(camera, sc, geometry, matFor(want === '*' || want === g, material), object, group);
  };
  try { R.render(); } finally { r.renderBufferDirect = orig; G.scene.background = bg; r.setClearColor(cc, ca); sm.autoUpdate = au; }
  const px = new Float32Array(W * H * 4);
  const T = R.scenePass._lastWrite || C.writeBuffer; r.setRenderTarget(T); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); r.setRenderTarget(null);
  let sum = 0, cov = 0, max = 0; for (let i = 0; i < px.length; i += 4) { const v = px[i]; sum += v; if (v > 0.5) cov++; if (v > max) max = v; }
  return { fragsPerPixel: +(sum / (W * H)).toFixed(3), coverage: +(cov / (W * H)).toFixed(3), maxLayers: Math.round(max) };
};
const out = { scene, W, H, msaa: C.readBuffer.samples, all: run('*') };
const groups = [...seen.keys()];
out.draws = Object.fromEntries(seen);
for (const g of groups) out[g] = run(g);
return out;
