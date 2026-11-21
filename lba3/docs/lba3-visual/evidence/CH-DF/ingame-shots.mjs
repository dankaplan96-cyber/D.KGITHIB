// CH-DF: the Dino-Fly in the game, in the garden north of Twinsen's house, from the normal play camera (1280x720).
//   GAME_URL=http://localhost:8176/ node ingame-shots.mjs <outdir> [prefix]
// Shots: far (he dozes), near (he lifts his head and looks at Twinsen), talking (the nuzzle and the first line),
// and the frame's draw calls / triangles at the garden (game.perf over 30 rendered frames).
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const snap = async (name) => { await page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 }); console.log('shot', name); };
await open(page, '?nocine');
await menu(page, 'new');
const DF = { x: -50.5, z: 68.5 };
const place = (s) => ev((s) => { const G = game, h = G.hero;
  G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true); h.angle = s.a;
  G.camRig.lba && (G.camRig.lba.init = false); G.step(s.t); G.renderer.render();
  const df = G.scene.getObjectByName('dinofly');
  let tris = 0, meshes = 0; df?.traverse((m) => { if (m.isMesh) { meshes++; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; } });
  return { room: G.room?.id || 'citadel', hero: [+h.pos.x.toFixed(2), +h.pos.z.toFixed(2)], dinofly: { meshes, tris } }; }, s);
const face = (x, z) => Math.atan2(DF.x - x, DF.z - z);
// far: 12 m away, south-east (he dozes)
console.log('far', JSON.stringify(await place({ x: -40, z: 62, a: face(-40, 62), t: 3 })));
await snap('garden-far');
// near: 5 m in front of him (he looks at Twinsen)
console.log('near', JSON.stringify(await place({ x: -45.5, z: 66.8, a: face(-45.5, 66.8), t: 3 })));
await snap('garden-near');
const perf = await ev(() => { const G = game; G.perf.reset(); for (let i = 0; i < 30; i++) G.advance(1 / 30); const s = G.perf.stats(); return { calls: s.calls, tris: s.tris }; });
console.log('perf at the garden (near):', JSON.stringify(perf));
// the wing stretch (it comes 9 s after the island is built, then every 14–24 s): wait for one, mid-way
const st = await ev(() => { const G = game; for (let i = 0; i < 25 * 30; i++) { G.step(1 / 30); const w = G.scene.getObjectByName('dinofly')?.userData.model?.bones.wing1L; if (w && Math.abs(w.rotation.z * 180 / Math.PI + 34) < 12) { G.renderer.render(); return i / 30; } } return -1; });
console.log('stretch found after', st, 's');
await snap('garden-stretch');
// talk: the first exchange (the nuzzle)
const talked = await ev(() => { const G = game; const p = (G.world.pets || []).find((q) => q.id === 'dinofly'); if (!p) return 'no pet'; p.talk(G); G.step(0.6); G.renderer.render(); return 'ok'; });
console.log('talk', talked);
await snap('garden-talk');
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
