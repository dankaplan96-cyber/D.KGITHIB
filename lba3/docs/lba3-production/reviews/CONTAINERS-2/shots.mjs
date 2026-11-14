// CONTAINERS-2: a picture of each container added on Citadel, Desert Island, Zeelich and its islands, from the play
// camera with Twinsen beside it (the glint and the Search prompt as the player sees them).
//   GAME_URL=http://localhost:8173/ node docs/lba3-production/reviews/CONTAINERS-2/shots.mjs <out dir> [id prefix,...]
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '.'; const only = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.evaluate(() => { const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(1); });
const list = await page.evaluate(() => {
  const G = game, L = [];
  for (const gv of G.world.givers) if (gv.kind) L.push({ area: null, id: gv.id });
  for (const [id, R] of Object.entries(G.rooms)) if (R.outdoor) for (const gv of R.givers || []) if (gv.kind) L.push({ area: id, id: gv.id });
  return L;
});
for (const it of list) {
  if (only.length && !only.some((p) => it.id.startsWith(p))) continue;
  const info = await page.evaluate(({ area, id }) => {
    const G = game, h = G.hero;
    if (area) { if (G.room?.id !== area) G.enterRoom(area, null, true); } else if (G.room) G.exitRoom({ x: -42, z: -4 }, true);
    const gv = G.givers().find((g) => g.id === id);
    // stand 2.2 m from it on open ground, facing it, where the play camera shows both (he must not hide it)
    const gy = gv.y ?? G.physics.groundAt(gv.x, gv.z, h.pos.y + 3), V = new G.camera.position.constructor();
    const scr = (x, y, z) => { V.set(x, y, z).project(G.camera); return [V.x * 480, -V.y * 270, V.z]; };
    let best = null, bs = -1;
    // (the camera settles behind the way he faces: he looks a quarter turn off it, so it stands beside him on screen)
    for (let k = 0; k < 8; k++) for (const turn of [Math.PI / 2, -Math.PI / 2]) {
      const a = (k * Math.PI) / 4, x = gv.x + Math.sin(a) * 2.2, z = gv.z + Math.cos(a) * 2.2;
      const y = G.physics.groundAt(x, z, gy + 0.6);
      if (G.physics.blockedAt?.(x, z, y, 0.35) || Math.abs(y - gy) > 0.6) continue;
      h.pos.set(x, y, z); h.angle = a + Math.PI + turn; h.vel.set(0, 0); h.onGround = true; G.camRig.snap?.(); for (let i = 0; i < 10; i++) G.step(1 / 30);
      const c = scr(gv.x, gy + (gv.top ?? 0.8) * 0.6, gv.z), p = scr(h.pos.x, h.pos.y + 1, h.pos.z);
      if (Math.abs(c[0]) > 400 || Math.abs(c[1]) > 220 || c[2] > 1) continue;
      const s = Math.min(160, Math.hypot(c[0] - p[0], c[1] - p[1])) - Math.hypot(c[0], c[1]) * 0.2;   // (apart from him, near the middle)
      if (s > bs) { bs = s; best = { x, z, y, a, turn }; }
    }
    if (!best) return { id, none: true };
    h.pos.set(best.x, best.y, best.z); h.angle = best.a + Math.PI + best.turn; h.vel.set(0, 0); h.onGround = true; G.lastSafe = { x: best.x, z: best.z };
    G.camRig.snap?.(); for (let i = 0; i < 40; i++) G.step(1 / 30);
    // (a frame with its glint up)
    for (let i = 0; i < 120; i++) { G.step(1 / 30); if (G.cues.sprites.some((s) => s.visible && s.scale.x > 0.3 && Math.hypot(s.position.x - gv.x, s.position.z - gv.z) < 0.5)) break; }
    G.renderer.render();
    return { id, area: area || 'citadel', kind: gv.kind, at: [+gv.x.toFixed(1), +gv.z.toFixed(1)] };
  }, it);
  console.log(JSON.stringify(info));
  if (!info.none) await page.screenshot({ path: `${out}/${it.id}.jpg`, type: 'jpeg', quality: 70 });
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
