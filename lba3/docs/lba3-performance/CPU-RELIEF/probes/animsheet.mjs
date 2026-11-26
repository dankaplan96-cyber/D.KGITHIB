// CPU-RELIEF (P137b): what CPU-eco changes on screen — a walking person 15-25 m from the camera, in view, on the
// Citadel street, posed every frame (Medium-lean) and at CPU-eco's lower rate (every other frame there), 10 frames
// of 1/60 s each: crops of each frame and the swing of the person's left hip per frame. Twinsen stands still, the
// follow camera behind him, the clock stepped by hand (automated runtime only, SwiftShader). Writes OUT/frames-*.png and
// OUT/anim.json for tools/cpu-relief-sheet.py.
//   GAME_URL=http://localhost:8347/ OUT=captures/cpu-relief node animsheet.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const E = process.env, OUT = E.OUT || 'captures/cpu-relief', N = +(E.N || 10);
fs.mkdirSync(OUT, { recursive: true });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await page.addInitScript(() => { try { if (!localStorage.getItem('cr_init')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 4, v: 2, fps: 'auto' })); localStorage.setItem('cr_init', '1'); } } catch {} });
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const apply = (id) => ev(async (id) => { const Q = await import('/src/engine/autoquality.js'), G = game; G.settings.qualityAuto = true; G.autoQ.gov.setProfile(Q.indexOfId(id), 'anim sheet', { phase: 'hold', commitNow: true, t: performance.now() }); G.settings.quality = G.autoQ.tier(); G.applySettings(); G.autoQ.applyAll(); G.warmGraphics(); }, id);
await apply('lean');
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 });
// Twinsen on the square, the follow camera; step until a walking person is 15-25 m from the camera and in view
const pick = await ev(async () => {
  const THREE = await import('three'), G = game, r = G.bench.routes().find((x) => x.id === 'street');
  G.bench.setCamera('follow'); G.state = 'play'; r.setup(); G.state = 'play'; G.bench.camera();
  const h = G.hero, at = { x: h.pos.x, y: h.pos.y, z: h.pos.z, a: h.angle };
  window.__hold = () => { h.pos.set(at.x, at.y, at.z); h.angle = at.a; h.vel.set(0, 0); G.doorCool = 1; };
  const fr = new THREE.Frustum(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  for (let i = 0; i < 3600; i++) {
    window.__hold(); G.frame(1 / 60, i % 4 === 0);
    if (i < 30 || i % 4) continue;
    const cam = G.camera; cam.updateMatrixWorld(); fr.setFromProjectionMatrix(m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const n of G.npcs) {
      const rg = n.rig; if (!rg?.root?.visible || rg.anim !== 'walk' || !n.pos) continue;
      const d = v.copy(n.pos).distanceTo(cam.position);
      if (d < 16 || d > 23 || !fr.containsPoint(v.set(n.pos.x, n.pos.y + 1, n.pos.z))) continue;
      window.__who = n; window.__t0 = G.time;
      return { who: n.name || n.def?.id, d: +d.toFixed(1), frame: i };
    }
  }
  return null;
});
console.log('PROBE person', JSON.stringify(pick));
if (!pick) { await browser.close(); process.exit(1); }
const out = { person: pick, variants: {} };
for (const id of ['lean', 'loweco']) {
  await apply(id);
  await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 });
  await ev(() => { for (let i = 0; i < 6; i++) { window.__hold(); game.frame(1 / 60, true); } });
  const rows = [];
  for (let k = 0; k < N; k++) {
    const f = await ev(async () => {
      const THREE = await import('three'), G = game, n = window.__who, cam = G.camera;
      window.__hold(); G.frame(1 / 60, true);
      const p = (y) => { const v = new THREE.Vector3(n.pos.x, n.pos.y + y, n.pos.z).project(cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; };
      const a = p(0), b = p(1.9), d = n.pos.distanceTo(cam.position);
      return { x: a.x, y: (a.y + b.y) / 2, hgt: Math.abs(a.y - b.y), hip: +n.rig.j.legL.hip.rotation.x.toFixed(4), knee: +n.rig.j.legL.knee.rotation.x.toFixed(4), lodN: n.rig.lodN | 0, d: +d.toFixed(1), deep: G.farCull.anim.deep };
    });
    const s = Math.max(60, Math.round(f.hgt * 1.5)), clip = { x: Math.max(0, Math.round(f.x - s / 2)), y: Math.max(0, Math.round(f.y - s / 2)), width: s, height: s };
    const file = `${OUT}/frames-${id}-${k}.png`;
    await page.screenshot({ path: file, clip });
    rows.push({ ...f, file });
  }
  out.variants[id] = rows;
  console.log('PROBE', id, JSON.stringify(rows.map((r) => [r.hip, r.lodN, r.d])));
}
fs.writeFileSync(`${OUT}/anim.json`, JSON.stringify(out, null, 1));
await browser.close();
