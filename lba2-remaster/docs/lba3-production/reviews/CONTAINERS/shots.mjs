// CONTAINERS: a picture of every outdoor container from the play camera, Twinsen standing by it.
//   GAME_URL=http://localhost:8182/ node docs/lba3-production/reviews/CONTAINERS/shots.mjs <out dir> [id filter]
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '.'; const only = process.argv[3] || '';
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
  if (only && !it.id.includes(only)) continue;
  const info = await page.evaluate(({ area, id }) => {
    const G = game, h = G.hero;
    if (area) { if (G.room?.id !== area) G.enterRoom(area, null, true); } else if (G.room) G.exitRoom({ x: -42, z: -4 }, true);
    const gv = G.givers().find((g) => g.id === id);
    // stand by it on open ground, facing it
    let best = null;
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8, D = +(window.SHOT_D || 3.2), x = gv.x + Math.sin(a) * D, z = gv.z + Math.cos(a) * D;
      const y = G.physics.groundAt(x, z, (gv.y ?? h.pos.y) + 0.6);
      if (G.physics.blockedAt?.(x, z, y, 0.35) || Math.abs(y - (gv.y ?? G.physics.groundAt(gv.x, gv.z, y + 0.5))) > 0.6) continue;
      if (!best) best = { x, z, y, a };
    }
    if (!best) return { id, none: true };
    h.pos.set(best.x, best.y, best.z); h.angle = best.a + Math.PI; h.vel.set(0, 0); h.onGround = true; G.lastSafe = { x: best.x, z: best.z };
    G.camRig.snap?.(); for (let i = 0; i < 40; i++) G.step(1 / 30);
    G.renderer.render();
    return { id, area: area || 'citadel', at: [+gv.x.toFixed(1), +gv.z.toFixed(1)], prompt: document.querySelector('#prompt')?.textContent || G.hud._prompt };
  }, it);
  console.log(JSON.stringify(info));
  if (!info.none) await page.screenshot({ path: `${out}/${it.id}.jpg`, type: 'jpeg', quality: 70 });
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
