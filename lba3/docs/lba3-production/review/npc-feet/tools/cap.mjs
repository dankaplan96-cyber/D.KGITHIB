// ANIM-POLISH-3 capture: a body of the game's cast walked, stopped and turned by script on a clear spot of chapter 1's Citadel (by
// Twinsen's house), filmed from the side by a fixed camera; every frame its feet and plant states to <OUT>/<seq>-<mode>.json and a crop
// round it to <OUT>/<seq>-<mode>-NNN.png. mode: off (the unplanted walk, as before ANIM-POLISH-3) / on (plantLite).
// usage: GAME_URL=... OUT=dir node cap.mjs look:speed[:turn] ...
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/dev/shm/npcf/cap';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(1800000);
page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
await page.goto((process.env.GAME_URL || 'http://localhost:8720/') + '?nocine', { waitUntil: 'load', timeout: 900000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 900000 });
await page.evaluate(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 900000 });
const home = await page.evaluate(async () => {
  const G = window.game; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.story.nextChapter(); G.step(0.5); talkAll();
  document.querySelectorAll('#hud, .hud, #objective, #prompt').forEach((e) => (e.style.display = 'none'));
  const C = await import('./src/game/characters.js'), RG = await import('./src/engine/rig.js');
  const P = G.physics, V = G.hero.pos.constructor, h = G.hero;
  // a flat spot near where chapter 1 starts: level within 3 cm over 3.5 m round, nobody within 8 m
  let best = null;
  for (let dx = -30; dx <= 30; dx += 2) for (let dz = -30; dz <= 30; dz += 2) {
    const x = h.pos.x + dx, z = h.pos.z + dz, y = P.groundAt(x, z); if (y < 0.05) continue;
    let ok = true;
    for (let a = 0; a < 8 && ok; a++) for (const r of [1.75, 3.5]) if (Math.abs(P.groundAt(x + Math.sin(a * 0.785) * r, z + Math.cos(a * 0.785) * r) - y) > 0.03) ok = false;
    if (ok) { const d = Math.hypot(dx, dz); if (!best || d < best[3]) best = [x, z, y, d]; }
  }
  const [x0, z0, y0] = best;
  for (const n of [...G.npcs, ...G.enemies]) if (Math.hypot(n.pos.x - x0, n.pos.z - z0) < 14) n.setPresent?.(false);
  for (const d of G.world.dogs || []) d.root.visible = false;
  h.pos.set(x0 + 9, P.groundAt(x0 + 9, z0 - 6), z0 - 6); h.rig.root.visible = false; if (h.rig.silhouette) h.rig.silhouette.visible = false;
  G.step(0.2);
  window.CAP = { G, C, RG, V, x0, z0, y0 };
  return best;
});
console.log('HOME', home.join(','));
for (const arg of process.argv.slice(2)) {
  const [look, sp, turn] = arg.split(':');
  for (const mode of ['off', 'on']) {
    const seq = `${look}-${sp}`;
    const init = await page.evaluate(([look, sp, mode, turn]) => {
      const { G, C, RG, V, x0, z0, y0 } = CAP;
      CAP.rig?.root.parent?.remove(CAP.rig.root);
      const rig = CAP.rig = C.createCharacter(look); G.scene.add(rig.root);
      if (mode === 'on') rig.plantIfFits(); else rig.plantLite = false;
      rig.fidgetT = 99; rig.t = 1.3; rig.blinkT = 99;   // (the same idle sway in both modes, no fidget, no blink)
      // walk along +x from 1.4 m before the spot, stop, then turn to face the camera's side and on round (a person turning to someone)
      CAP.s = { x: x0 - 1.6, z: z0, ang: Math.PI / 2, t: 0, sp: +sp, turn: turn || 'face' };
      const cam = G.camera; cam.position.set(x0 - 0.2, y0 + 1.15, z0 - 5.2); cam.lookAt(x0 - 0.2, y0 + 0.75, z0); cam.updateMatrixWorld();
      CAP.lock = cam.position.clone(); CAP.look = new V(x0 - 0.2, y0 + 0.75, z0);
      return { scale: rig.root.scale.y, plant: rig.plantLite };
    }, [look, sp, mode, turn]);
    const S = [];
    const fps = 60, dt = 1 / fps, walkT = 2.6 / +sp, total = walkT + 0.9 + 1.6;
    let shot = 0;
    for (let i = 0; i < Math.round(total * fps); i++) {
      const every = 3;
      const s = await page.evaluate(([dt, walkT, snap]) => {
        const { G, rig, s, y0, V } = CAP;
        const t = s.t; let anim = 'idle', sp = 0;
        if (t < 0.3) anim = 'idle';
        else if (t < 0.3 + walkT) { anim = 'walk'; sp = s.sp; }
        else if (t > 0.3 + walkT + 0.9) { const target = -Math.PI / 2 + 0.0001; s.ang += Math.atan2(Math.sin(target - s.ang), Math.cos(target - s.ang)) * (1 - Math.exp(-6 * dt)); }
        s.x += Math.sin(s.ang) * sp * dt; s.z += Math.cos(s.ang) * sp * dt; s.t += dt;
        rig.root.position.set(s.x, y0, s.z); rig.root.rotation.y = s.ang;
        rig.play(anim); rig.update(dt, sp); rig.root.updateMatrixWorld(true);
        const j = rig.j, sc = rig.root.scale.y, ank = (rig.hipsRest + j.legL.hip.position.y + j.legL.knee.position.y + j.legL.foot.position.y) * sc;
        const L = new V(), R = new V(); j.legL.foot.getWorldPosition(L); j.legR.foot.getWorldPosition(R);
        const F = rig._feet;
        const out = { t: +s.t.toFixed(3), anim, x: s.x, z: s.z, ang: s.ang, sc, L: [L.x, L.y - y0 - ank, L.z], R: [R.x, R.y - y0 - ank, R.z], plant: F && F.w > 0 ? ['L', 'R'].map((k) => (F[k].stepping ? 'step' : F[k].on && F[k].w > 0.5 ? 'down' : 'air')) : null };
        if (snap) {
          const cam = G.camera; cam.position.copy(CAP.lock); cam.lookAt(CAP.look); cam.updateMatrixWorld();
          G.renderer.render();
          const p = new V(s.x, y0 + 0.9 * sc, s.z).project(cam);
          out.px = [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight];
        }
        return out;
      }, [dt, walkT, i % every === 0]);
      if (s.px) {
        s.shot = shot;
        const w = 300, hgt = 340, cx = Math.max(w / 2, Math.min(960 - w / 2, s.px[0])), cy = Math.max(hgt / 2, Math.min(540 - hgt / 2, s.px[1]));
        await page.screenshot({ path: `${OUT}/${seq}-${mode}-${String(shot).padStart(3, '0')}.png`, clip: { x: cx - w / 2, y: cy - hgt / 2, width: w, height: hgt } });
        shot++;
      }
      S.push(s);
    }
    fs.writeFileSync(`${OUT}/${seq}-${mode}.json`, JSON.stringify({ init, walkT, samples: S }));
    console.log('captured', seq, mode, shot, 'shots');
  }
}
await browser.close();
