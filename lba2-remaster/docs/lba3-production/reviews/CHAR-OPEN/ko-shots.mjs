// CHAR-OPEN: Vesk's guard (look 'vguard', the knee-length uniform coat) knocked out in the game, on the dev arena's flat
// floor (as tests/deaths.mjs does it), hit from the front (falls on his back) and from behind (falls on his front).
//   GAME_URL=http://127.0.0.1:8173/ node ko-shots.mjs <outdir> [prefix]
// For each: frames from the side and three-quarter at 0.6 s / rest (1.4 s), and the measures at rest: the feet's and
// the hips' height over the floor, the lowest vertex's bone, and how far the coat (vertices on the skirt bones) stands
// off the line of the body (its highest point over the floor, lying).
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(async () => {
  const G = window.game; G.testFreeze = true; G.devArena();
  const M = await import('/src/game/enemies.js');
  window.K = {
    spawn(x, z) {
      const def = { id: 'ko_' + (K.n = (K.n || 0) + 1), kind: 'guard', x, z, group: 'kog' + K.n, patrol: [[x, z]] };
      const e = M.createEnemy(G, def); G.enemies.push(e); e.coolT = 99; e.canAttackOverride = false; e.home = { x, z };
      for (const o of G.enemies) if (o !== e && o.present && !o.ko && o.alive) o.setPresent(false);
      const h = G.hero; h.pos.set(x - 12, G.physics.groundAt(x - 12, z + 19), z + 19); h.invuln = 99; G.resetCombat(); G.state = 'play';
      e.pos.set(x, G.physics.groundAt(x, z), z); e.angle = -Math.PI / 2; e.sync?.();
      return e;
    },
    measure(e) {
      const V = G.camera.position.constructor, v = new V(), root = e.rig.root; root.updateMatrixWorld(true);
      const gy = (p) => p.y - G.physics.groundAt(p.x, p.z, p.y + 0.6);
      const w = (b) => { const p = new V(); b.getWorldPosition(p); return +gy(p).toFixed(3); };
      let lo = Infinity, loB = '', coatHi = -Infinity, coatLo = Infinity;
      root.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const P = o.geometry.attributes.position, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight, B = o.skeleton.bones;
        for (let i = 0; i < P.count; i++) {
          o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); const d = gy(v);
          if (d < lo) { lo = d; loB = B[SI.getX(i)].name; }
          const skirt = [0, 1, 2, 3].reduce((s, k) => s + (/^skirt/.test(B[SI.getComponent(i, k)].name) ? SW.getComponent(i, k) : 0), 0);
          if (skirt > 0.5) { coatHi = Math.max(coatHi, d); coatLo = Math.min(coatLo, d); }
        }
      });
      const j = e.rig.j;
      return { feet: [w(j.legL.foot), w(j.legR.foot)], knees: [w(j.legL.knee), w(j.legR.knee)], hips: w(j.hips), lowest: +lo.toFixed(3), lowestBone: loB, coatHigh: +coatHi.toFixed(3), coatLow: +coatLo.toFixed(3) };
    },
    view(e, yaw, dist = 7.5, h = 2.2) {
      const p = new (G.camera.position.constructor)(); e.rig.j.hips.getWorldPosition(p);
      G.camera.position.set(p.x + Math.sin(yaw) * dist, G.physics.groundAt(p.x, p.z) + h, p.z + Math.cos(yaw) * dist);
      G.camera.lookAt(p.x, G.physics.groundAt(p.x, p.z) + 0.25, p.z); G.camera.updateMatrixWorld(); G.renderer.render();
    },
  };
});
const shot = (name) => page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 });
for (const [label, fromDx] of [['back', -1.5], ['front', 1.5]]) {
  // the guard faces −x: a blow from −x is from the front (he falls on his back), from +x from behind (on his front)
  await ev((fromDx) => { const e = K.spawn(6196, -9); for (let i = 0; i < 6; i++) game.frame(1 / 60, false); window.E = e;
    e.take ? e.take(99, { x: e.pos.x + fromDx, y: e.pos.y, z: e.pos.z }) : e.damage(99, { x: e.pos.x + fromDx, y: e.pos.y, z: e.pos.z }, 4); }, fromDx);
  const log = [];
  for (const [t, views] of [[0.6, [['side', 0]]], [1.4, [['side', 0], ['34', 0.75], ['34b', -0.75]]]]) {
    const m = await ev((t) => { const e = window.E; while ((e.ko?.t ?? 99) < t) game.frame(1 / 60, false); return { t: +(e.ko?.t ?? -1).toFixed(2), ...K.measure(e) }; }, t);
    log.push(m);
    for (const [vn, yaw] of views) { await ev((yaw) => K.view(window.E, yaw), yaw); await shot(`ko-${label}-${t}-${vn}`); }
  }
  console.log('KO', label, JSON.stringify(log));
  await ev(() => { const e = window.E; for (let i = 0; i < 400 && !e.gone; i++) game.frame(1 / 60, false); });
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
