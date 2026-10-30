// PERF-CALLS: one deterministic view of an area (an arrival area, or a benchmark route with ROUTE=), for before/after
// pixel comparisons (../../PERF-CPU/probes/diff.py, patches.py). Prints the frame's draw calls (all passes).
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 AREA=desert [YAW=0.85] [CAM=follow] [QS=&nooverlap] OUT=a.png node areashot.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', AREA = process.env.AREA || 'desert', ROUTE = process.env.ROUTE || '', T = +(process.env.T || 2);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 }).catch(() => {});
const info = await ev(({ area, route, T, cam, yaw, hide }) => {
  const G = game, R = G.renderer.renderer;
  G.state = 'play';
  let rt = null;
  if (route) { rt = G.bench.routes().find((x) => x.id === route); rt.setup(); }
  else { if (area === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(area, null, true, true); G.bench.camera(); if (yaw != null) G.camRig.yaw = yaw; }
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  G.state = 'play';
  for (let t = 0; t < T; t += 1 / 30) { rt?.drive(t, 1 / 30); G.frame(1 / 30, false); }
  // (HIDEACTORS: people, the hero and particles out of the picture — their poses follow Math.random, whose sequence any
  //  change in the number of objects made shifts (three's ids draw from it): the world alone is compared)
  if (hide) { const off = (o) => { if (o) o.visible = false; }; off(G.hero?.rig?.root); off(G.hero?.mesh); off(G.hero?.root); for (const n of G.npcs || []) { off(n.rig?.root); off(n.mesh); off(n.root); } for (const e of G.enemies || []) { off(e.rig?.root); off(e.mesh); off(e.root); } off(G.particles?.mesh); off(G.particles?.points); G.scene.traverse((o) => { if (o.isSkinnedMesh || o.name === 'softParticles' || o.name === 'blobBatch') o.visible = false; }); }
  G.frame(1 / 60, true); G.perf.beginFrame(); G.frame(0, true);
  return { room: G.room?.id || 'citadel', calls: R.info.render.calls, shadow: G.perf.shadow, tris: R.info.render.triangles, hero: [G.hero.pos.x.toFixed(2), G.hero.pos.z.toFixed(2)], runs: G.drawBatch.areas.get(G.room?.group || G.world.root)?.runs ?? null };
}, { area: AREA, route: ROUTE, T, cam: process.env.CAM || '', yaw: process.env.YAW != null ? +process.env.YAW : null, hide: !!process.env.HIDEACTORS });
console.log(JSON.stringify(info));
await page.screenshot({ path: process.env.OUT || 'shot.png', timeout: 300000 });
await browser.close();
