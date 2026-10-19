// PERF-2: the synchronous CPU cost of the per-transition shader warm-up (Game.warmScene → Renderer.precompile →
// three's compileAsync), outdoors and in the house, after everything has been compiled once.
import { launch, open } from '/home/user/geriatrics-course/.claude/worktrees/agent-aeb700a18e33d78c7/lba2-remaster/tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = await page.evaluate(async () => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, res = {};
  let n = 0; G.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) n++; }); res.drawables = n;
  for (const [k, go] of [['outdoor', () => G.exitRoom({ x: -45, z: 76, a: 0 }, true, true)], ['house', () => G.enterRoom('house', null, true, true)], ['outdoor2', () => G.exitRoom({ x: -45, z: 76, a: 0 }, true, true)], ['house2', () => G.enterRoom('house', null, true, true)]]) {
    go(); G.frame(1 / 30, true);
    const ts = [], ws = [];
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); const p = G.renderer.precompile(); ts.push(+(performance.now() - t0).toFixed(1)); await p; }
    // the transition's own warm-up (Game.warmScene), as in play (not frozen), twice in the same state
    for (let i = 0; i < 2; i++) {
      const T = {}; G.testFreeze = false; const t0 = performance.now(); G.warmScene(T); ws.push(+(performance.now() - t0).toFixed(1)); G.testFreeze = true;
      for (let k = 0; k < 200 && T.hold; k++) await new Promise((r) => setTimeout(r, 20));
      G.frame(1 / 30, true);
    }
    const t1 = performance.now(); G.lightPool.update(G.hero.pos); const lp = performance.now() - t1;
    res[k] = { precompileSyncMs: ts, warmSceneMs: ws, lightPoolMs: +lp.toFixed(1) };
  }
  return res;
});
console.log(JSON.stringify(out));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
