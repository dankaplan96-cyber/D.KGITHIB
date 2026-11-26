// P58-HW (CLOUD_ORDERS 60.3): Twinsen walked round the project station's huts in the fort (office (43.2, 45.5), control
// (50.3, 45.6)) by input (the test harness's P.go: the keys a player presses), the play camera as set: Follow, then
// Fixed (LBA2). Every frame stepped at 1/60: two rays from the camera to his chest and head against the drawn world
// (opaque meshes; not people, not transparent things, not sprites); both blocked = hidden. A run hidden for 0.4 s or more
// is a finding: its spot, the camera's place, what blocks (the mesh's name and its parents), a picture.
// node p58walk.mjs <url> <out dir> <follow|lba>
// (headless variant, OVERLAP-3 night 21.11: SwiftShader, the environment's Playwright; the blocker is reported with its
//  material colour and the hit point in the station's design coordinates, the chest ray's blocker too)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, OUT, MODE = 'follow'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.addScriptTag({ path: new URL('../../../../tests/lib/player.js', import.meta.url).pathname });
await page.evaluate(async (mode) => { const G = game, THREE = await import('three'); G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true });
  G.settings.camera = mode; G.applySettings();
  if (G.room) G.exitRoom({ x: 46.7 - 76, z: 40.5 - 101, a: 0 }, true); for (let i = 0; i < 60; i++) G.step(1 / 60);
  // the hidden check, every frame (wrapped round the game's step)
  const rc = new THREE.Raycaster(), V = THREE.Vector3, h = G.hero;
  const people = () => new Set([h.rig?.root, h.root, ...G.npcs.map((n) => n.rig?.root)].filter(Boolean));
  const opaque = (o) => { if (!o.isMesh || o.isSprite) return false; const P_ = window.__people ??= people(); for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (P_.has(p)) return false; } const m = [].concat(o.material)[0]; return !(m?.transparent && m.opacity < 0.95) && m?.visible !== false && m?.colorWrite !== false; };
  // the world's solid meshes within 35 m of the huts, once (their world bounds), tried one by one
  const M = []; const ctr = new V(46.7 - 76, 20, 45.5 - 101);
  G.scene.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh || o.isSprite || !o.geometry?.attributes?.position) return; try { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const bs = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (bs.center.distanceTo(ctr) < 35 + bs.radius) M.push(o); } catch {} });
  window.__nM = M.length;
  const blockedBy = (to) => { const C = G.camera.position, d = to.clone().sub(C), L = d.length(); rc.set(C, d.normalize()); rc.near = 0.3; rc.far = L - 0.35;
    const hits = []; for (const o of M) { if (!opaque(o)) continue; try { o.raycast(rc, hits); } catch {} } hits.sort((p, q) => p.distance - q.distance);
    if (!hits.length) return null; const o = hits[0].object, ch = []; for (let p = o; p && ch.length < 4; p = p.parent) if (p.name) ch.push(p.name); const m0 = [].concat(o.material)[0], pt = hits[0].point; return { at: +hits[0].distance.toFixed(2), what: (ch.join(' < ') || o.geometry?.type || 'mesh') + ' ' + (m0?.name || '') + '#' + (m0?.color?.getHexString?.() || '') + ' @' + [pt.x + 76, pt.y, pt.z + 101].map((v) => v.toFixed(2)).join(',') }; };
  window.__H = { run: 0, list: [], frames: 0, hiddenFrames: 0, last: null };
  const step0 = G.step.bind(G);
  G.step = (dt) => { h.hp = h.maxHp ?? Math.max(h.hp, 10); if (G.state === 'gameover' || h.dead) { h.dead = false; G.setState?.('play'); } step0(dt); const S = window.__H; S.frames++;
    if (G.state !== 'play' || G.room) { S.run = 0; return; }
    const p = h.pos, chest = new V(p.x, p.y + 1.0, p.z), head = new V(p.x, p.y + 1.55, p.z);
    const a = blockedBy(chest), b = a && blockedBy(head);
    if (a && b) { S.hiddenFrames++; S.run += dt; if (S.run >= 0.4 && !S.cur) { S.cur = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), heading: +h.angle.toFixed(2), cam: [G.camera.position.x, G.camera.position.y, G.camera.position.z].map((v) => +v.toFixed(2)), by: b.what, byChest: a.what, y: +p.y.toFixed(2), mode: G.settings.camera, t: S.frames }; S.list.push(S.cur); S.shotDue = true; } if (S.cur) S.cur.secs = +S.run.toFixed(2); }
    else { S.run = 0; S.cur = null; } };
}, MODE);
// the walks: round each hut at ~1.3 m from its walls, between them, behind them, to the fort wall's corner and back
const DX = -76, DZ = -101;   // (island.js SHIFT.station: the design coordinates to the world's)
const O = { x: 43.2 + DX, z: 45.5 + DZ, w: 6.2, d: 4.4 }, K = { x: 50.3 + DX, z: 45.6 + DZ, w: 5.0, d: 4.2 };
const ring = (H, m) => { const x0 = H.x - H.w / 2 - m, x1 = H.x + H.w / 2 + m, z0 = H.z - H.d / 2 - m, z1 = H.z + H.d / 2 + m; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]; };
const paths = { officeCW: ring(O, 1.3), controlCW: ring(K, 1.3), officeCCW: ring(O, 1.3).reverse(), controlCCW: ring(K, 1.3).reverse(),
  between: [[46.75, 40.5], [46.75, 50.5], [46.75, 40.5]], behind: [[38, 49.8], [55, 49.8], [38, 49.8]], front: [[37, 41.5], [56, 41.5], [37, 41.5]],
  wide: [[36, 38], [58, 38], [58, 53], [36, 53], [36, 38]] };
for (const k of ['between', 'behind', 'front', 'wide']) paths[k] = paths[k].map(([x, z]) => [x + DX, z + DZ]);
const res = {};
for (const [name, pts] of Object.entries(paths)) {
  const r = await page.evaluate(([pts]) => { const out = []; for (const [x, z] of pts) { const q = P.go(x, z, { tol: 0.5, maxT: 25, fight: false }); out.push(q?.r || q); } return out; }, [pts]);
  res[name] = r;
  // pictures of the findings met on this walk (re-made: Twinsen put back where it happened, the camera as it was)
  const list = await page.evaluate(() => { const S = window.__H; const l = S.list.filter((f) => !f.shot); l.forEach((f) => { f.shot = true; }); return l; });
  for (const f of list) {
    await page.evaluate((f) => { const G = game, h = G.hero; h.pos.set(f.x, G.physics.groundAt(f.x, f.z, h.pos.y + 3), f.z); h.angle = f.heading; G.camera.position.set(...f.cam); G.camera.lookAt(f.x, h.pos.y + 1.2, f.z); G.camera.updateMatrixWorld(); G.renderer.render(); }, f);
    await page.screenshot({ path: `${OUT}/${MODE}-${name}-${f.x}_${f.z}.jpg`, type: 'jpeg', quality: 78 });
  }
}
const S = await page.evaluate(() => window.__H);
const out = { mode: MODE, frames: S.frames, hiddenFrames: S.hiddenFrames, findings: S.list, walks: res, errs: errs.slice(0, 5) };
fs.writeFileSync(`${OUT}/p58-${MODE}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ mode: MODE, frames: S.frames, hiddenFrames: S.hiddenFrames, findings: S.list.map((f) => [f.x, f.z, f.secs, f.by]) }));
await browser.close(); process.exit(0);
