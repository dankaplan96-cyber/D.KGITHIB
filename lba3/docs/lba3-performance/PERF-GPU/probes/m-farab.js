// Follow camera at Far, Auto Medium on battery: far-view candidates, same frame — images + main-pass triangles
const G = game, R = G.renderer, r = R.renderer;
const kit = await import('./src/game/kit.js');
G.settings.camera = 'follow'; G.settings.camDist = 'far'; G.camRig.setMode('follow'); G.camRig.setFollowDistance?.('far');
G.settings.qualityAuto = true;
G.autoQ.gov.setProfile(1, 'probe', { phase: 'hold', commitNow: true, t: 0 }); G.autoQ.applyAll();
G.setBattery(true); G.autoQ.applyAll(); G.warmGraphics(); await R.precompile();
const views = window.__VIEWS || [{ x: -70, z: 20, a: Math.PI / 2 }, { x: -42, z: 2, a: 0 }, { x: -40, z: 40, a: Math.PI }];
const variants = window.__VARIANTS || [
  ['as-is', () => {}, () => {}],
  ['trees24', () => { kit.LOD_DETAIL.near = 24; }, () => { kit.LOD_DETAIL.near = 34; }],
  ['trees18', () => { kit.LOD_DETAIL.near = 18; }, () => { kit.LOD_DETAIL.near = 34; }],
];
const tris = () => { r.info.reset(); G.shadowCull.update(G.room?.group || G.world.root, G.camera, G.hero.pos); R.render(); return r.info.render.triangles; };
const snap = () => { const gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255;
  cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
const out = { __images: {} };
let vi = 0;
for (const v of views) {
  G.exitRoom({ x: v.x, z: v.z, a: v.a }, true, true); G.hero.angle = v.a; G.camRig.snap?.();
  for (let i = 0; i < 40; i++) G.step(0.05);
  G.testFreeze = true;
  for (const [id, apply, undo] of variants) {
    apply(); G.world.updateLod(G.hero.pos); tris();
    const t = tris();
    out[`v${vi} ${id}`] = t;
    out.__images[`v${vi}-${id}`] = snap();
    undo(); G.world.updateLod(G.hero.pos);
  }
  vi++;
}
return out;
