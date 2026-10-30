const G = game, R = G.renderer, r = R.renderer;
const { GPU_VARIANTS } = await import('./src/engine/benchgpu.js');
G.settings.qualityAuto = false; G.settings.quality = 'medium'; G.applySettings(); G.setBattery(true);
G.warmGraphics(); await R.precompile();
G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.bench.camera(); G.camRig.yaw = Math.PI / 4; G.step(1.5); R.render();
let main = 0, shadow = 0, tris = 0;
const base = r.renderBufferDirect;
r.renderBufferDirect = function (c, s, g, m, o, gr) { if (s === null) shadow++; else main++; return base.call(this, c, s, g, m, o, gr); };
const frame = () => { main = shadow = 0; r.shadowMap.needsUpdate = true; R.render(); return { main, shadow }; };
const out = { 'as is': frame() };
for (const v of GPU_VARIANTS) {
  try { v.apply(G); frame(); out[v.id] = frame(); v.undo(G); out[v.id].after = frame(); } catch (e) { out[v.id] = 'ERROR ' + e.message; }
}
r.renderBufferDirect = base;
return out;
