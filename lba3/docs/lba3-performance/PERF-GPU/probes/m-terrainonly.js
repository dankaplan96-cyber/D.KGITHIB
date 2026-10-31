// the terrain alone (no other draw, no shadow casters) from fixed cameras: for a pixel A/B of terrain shader versions
const G = game, R = G.renderer, r = R.renderer;
G.settings.qualityAuto = true;
G.autoQ.gov.setProfile(1, 'probe', { phase: 'hold', commitNow: true, t: 0 }); G.autoQ.applyAll();
G.setBattery(true); G.autoQ.applyAll(); G.warmGraphics(); await R.precompile();
const snap = () => { const gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); r.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  for (let k = 3; k < im.data.length; k += 4) im.data[k] = 255;
  cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
const out = { __images: {} };
const prev = r.renderBufferDirect;
r.renderBufferDirect = function (c, s, g, m, o, gr) { if (s === null || (s === G.scene && o.name !== 'terrain')) return; return prev.call(this, c, s, g, m, o, gr); };
const views = [[-42, 2, -30, 40, 30], [-42, 2, 10, 25, -20], [-107, 37, -80, 30, 60], [-40, 66, 0, 30, 90], [20, -40, -20, 60, -10]];
let i = 0;
for (const [x, z, cx, cy, cz] of views) {
  G.exitRoom({ x, z, a: 0 }, true, true); G.step(0.2);
  G.camera.position.set(x + cx, cy, z + cz); G.camera.lookAt(x, 0, z); G.camera.updateMatrixWorld();
  R.render(); R.render();
  out.__images['t' + i++] = snap();
}
r.renderBufferDirect = prev;
out.n = i; return out;
