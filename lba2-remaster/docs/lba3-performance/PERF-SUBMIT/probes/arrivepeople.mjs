// STABILIZATION (laptop 0.41.0: an arrival's first frame in view after the black, 167–184 ms, "+12/+13 textures"):
// through a scene change into each of the arrival route's regions, on the game's fixed clock, every frame: the
// transition's phase, the fade, the people shown (skinned bodies in the render), the skeletons with their bone
// texture made (three makes it at a body's first draw: one GPU texture each) and the GPU's texture count.
//   GAME_URL=http://localhost:8351/ BATTERY=1 node arrivepeople.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env;
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
if (E.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await ev(() => { game.testFreeze = false; });
await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.preparing && !game.gfxHold, null, { timeout: 900000 });
await ev(() => game.bench.prepareAreas());
await page.waitForFunction(() => !game.preparing && !game.gfxHold && !game.trans, null, { timeout: 900000 });
for (const id of (E.AREAS || 'zeelich,desert,hamalayi').split(',')) {
  const r = await ev((id) => {
    const G = game, R = G.renderer.renderer; G.testFreeze = true;
    const out = [];
    const scan = () => { let shown = 0, bones = 0; G.scene.traverseVisible((o) => { if (o.isSkinnedMesh) shown++; }); G.scene.traverse((o) => { if (o.isSkinnedMesh && o.skeleton?.boneTexture) bones++; }); return { shown, bones }; };
    // (the render's own list: skinned bodies actually drawn this frame)
    let drawn = 0; const rbd = R.renderBufferDirect.bind(R); R.renderBufferDirect = (c, s, g, m, o, gr) => { if (o.isSkinnedMesh && !c.isOrthographicCamera) drawn++; return rbd(c, s, g, m, o, gr); };
    G.enterRoom(id, null, false, true);
    for (let i = 0; i < 90; i++) {
      drawn = 0; const x0 = R.info.memory.textures;
      const T = G.trans; const ph = !T ? 'play' : T.hold ? 'hold' : !T.called ? 'fade out' : T.held ? 'settle' : 'fade in';
      G._transBudget = null; G.frame(1 / 60, true);   // (the fade's per-frame budget is advance()'s: none here)
      const s = scan();
      out.push(`${String(i).padStart(3)} ${ph.padEnd(8)} fade ${(G._fadeOp ?? 0).toFixed(2)} · bodies shown ${s.shown}, drawn ${drawn} · bone textures ${s.bones} · GPU textures ${R.info.memory.textures - x0 >= 0 ? '+' : ''}${R.info.memory.textures - x0}`);
    }
    R.renderBufferDirect = rbd;
    // (back to Citadel for the next)
    G.exitRoom({ x: -42, z: 2, a: 0 }, false, true); for (let i = 0; i < 60; i++) { G._transBudget = null; G.frame(1 / 60, true); }
    // only the lines where something changed
    return out.filter((l, k) => k === 0 || l.replace(/^\s*\d+/, '') !== out[k - 1].replace(/^\s*\d+/, ''));
  }, id);
  console.log(`== ${id}\n` + r.join('\n'));
}
await browser.close();
