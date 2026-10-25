// CONTAINERS-2: draw calls (main / shadow pass) and materials in a few fixed views where containers stand, at the
// Medium preset, 1366 × 768. Software renderer (SwiftShader): call counts only, no timing.
//   GAME_URL=http://localhost:8173/ node docs/lba3-production/reviews/CONTAINERS-2/calls.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const VIEWS = [
  { name: 'citadel square', area: null, x: -44, z: 2, a: 3.6 },
  { name: 'citadel harbour path', area: null, x: -62, z: 30, a: 2.2 },
  { name: 'citadel quay', area: null, x: -108, z: 44, a: 4.4 },
  { name: 'citadel south lane', area: null, x: -40, z: 22, a: 3.1 },
  { name: 'zeelich pier', area: 'zeelich', dx: -46, dz: 2, a: 1.6 },
  { name: 'desert village', area: 'desert', dx: -50, dz: 2, a: 1.2 },
  { name: 'desert camp', area: 'desert', dx: -8, dz: -40, a: 3.4 },
  { name: 'desert dig', area: 'desert', dx: 48, dz: 26, a: 1.6 },
];
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
const rows = await page.evaluate(async (VIEWS) => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, R = G.renderer.renderer;
  G.settings.quality = 'medium'; G.applySettings();
  const out = [];
  for (const v of VIEWS) {
    const h = G.hero;
    if (v.area) { const o = G.rooms[v.area].group.position; if (G.room?.id !== v.area) G.enterRoom(v.area, null, true); h.pos.set(o.x + v.dx, 0, o.z + v.dz); }
    else { if (G.room) G.exitRoom({ x: v.x, z: v.z }, true); h.pos.set(v.x, 0, v.z); }
    h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, 50); h.angle = v.a; h.onGround = true; G.lastSafe = { x: h.pos.x, z: h.pos.z };
    G.camRig.snap?.();
    for (let i = 0; i < 20; i++) G.frame(1 / 30, false);
    let main = 0, shadow = 0; const mats = new Set();
    const orig = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => { if (scene) { main++; mats.add(mat.uuid); } else shadow++; return orig(cam, scene, geo, mat, obj, grp); };
    G.perf.beginFrame(); G.frame(1 / 30, true);
    R.renderBufferDirect = orig;
    const givers = G.givers().filter((g) => Math.hypot(g.x - h.pos.x, g.z - h.pos.z) < 30).length;
    out.push({ view: v.name, calls: R.info.render.calls, main, shadow, materials: mats.size, containersWithin30m: givers });
  }
  return out;
}, VIEWS);
for (const r of rows) console.log(JSON.stringify(r));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
