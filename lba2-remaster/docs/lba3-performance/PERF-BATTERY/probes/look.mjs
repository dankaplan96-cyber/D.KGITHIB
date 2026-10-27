// Equivalent views, this build's changes off ("before") and on ("after"), and the battery profile; pixel diffs.
//   OUT=dir  Q=medium  ROUTE=street
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT, Q = process.env.Q || 'medium', ROUTE = process.env.ROUTE || 'street';
fs.mkdirSync(OUT, { recursive: true });
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.hud.el.style.visibility = 'hidden'; });
await ev(async (route) => {
  await game.bench.prepareAreas();
  const G = game, r = G.bench.routes().find((x) => x.id === route); G.state = 'play'; r.setup(); G.state = 'play';
  for (let i = 0; i < +(window.NSTEP || 75); i++) { r.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i % 15 === 14); }
  const THREE = await import('three');
  window.__T = THREE;
  // "before" switches: the sea as the old 220 × 220 plane, terrain in the old draw order, no shadow cache, the draw
  // batches as before (no folding, 48 m cells: cut pieces drawn whole is what draw batches off shows: their originals)
  const E = G.env, newGeo = E.water.geometry, oldGeo = new THREE.PlaneGeometry(1400, 1400, 220, 220); oldGeo.rotateX(-Math.PI / 2);
  const terr = []; G.scene.traverse((o) => { if (o.isMesh && o.name === 'terrain') terr.push(o); });
  window.__mode = (before) => {
    E.water.geometry = before ? oldGeo : newGeo; if (before) E.water.position.set(0, 0, 0); else E.water.position.set(Math.round(G.camera.position.x / (1400 / 220)) * (1400 / 220), 0, Math.round(G.camera.position.z / (1400 / 220)) * (1400 / 220));
    for (const o of terr) o.renderOrder = before ? 0 : 1;
    G.shadowCache.enabled = !before;
    G.drawBatch.fold = !before; G.drawBatch.reset(); G.drawBatch.update(G.room?.group || G.world.root);
  };
  const gl = G.renderer.renderer.getContext();
  window.__grab = () => { G.renderer.render(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
}, ROUTE);
const shot = async (name) => { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 }); };
const res = await ev(() => {
  const G = game, d = (a, b) => { let n = 0, big = 0; for (let k = 0; k < a.length; k += 4) { const m = Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2])); if (m) n++; if (m > 16) big++; } return { differ: n, over16: big, of: a.length / 4 }; };
  __mode(true); const before = __grab(); __mode(false); const after = __grab();
  return d(before, after);
});
await ev(() => __mode(true)); await shot(`${Q}-${ROUTE}-before`);
await ev(() => __mode(false)); await shot(`${Q}-${ROUTE}-after`);
const bat = await ev(() => { const G = game, a = __grab(); G.setBattery(true); G.renderer.setAutoRes(true); G.renderer.setDyn(+(window.DYN || 0.6)); const b = __grab(); let n = 0; for (let k = 0; k < a.length; k += 4) if (Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2])) > 16) n++; return { over16: n, profile: G.renderer.batteryProfile(), pr: G.renderer.pixelRatio() }; });
await shot(`${Q}-${ROUTE}-battery-x0.6`);
await ev(() => { game.renderer.setDyn(1); });
await shot(`${Q}-${ROUTE}-battery-x1`);
console.log(JSON.stringify({ q: Q, route: ROUTE, beforeAfter: res, battery: bat }));
await browser.close();
