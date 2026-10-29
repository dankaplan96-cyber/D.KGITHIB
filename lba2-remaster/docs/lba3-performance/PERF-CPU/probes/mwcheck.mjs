// PERF-CPU: are the world matrices the render uses exactly three's? On each route, in every drawn frame right after the
// shown-world update (at Renderer.mid, before the draw batches and the passes), every shown object's matrixWorld is
// compared with what three's formula gives from scratch (the parent's expected world × compose(position, quaternion,
// scale), or × .matrix for a matrixAutoUpdate=false object), computed on the side without touching the scene.
// Run it with the cached update (default) and with three's own (OPT below) — both must print ALL EQUAL.
//   GAME_URL=http://localhost:8214/ ROUTES=street,combat,interior,transition,arrival FRAMES=150 node mwcheck.mjs
//   OPT="(await import('/src/engine/drawcull.js')).MW.cached = false" …
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ROUTES = (process.env.ROUTES || 'street,combat,interior,transition,arrival').split(','), FR = +(process.env.FRAMES || 150);
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await ev(() => {
  const G = game, M4 = G.camera.matrixWorld.constructor, mid = G.renderer.mid;
  const pool = []; let pi = 0; const tmp = () => (pool[pi] ??= new M4(), pool[pi++]);
  const path = (o) => { const p = []; for (let x = o; x; x = x.parent) p.push(x.name || x.type); return p.slice(0, 4).join('<'); };
  window.__chk = { checked: 0, bad: 0, samples: [] };
  G.renderer.mid = function (...a) {
    pi = 0; const C = window.__chk;
    const walk = (o, W) => {
      for (const k of o.children) {
        if (!k.visible) continue;
        const L = k.matrixAutoUpdate ? tmp().compose(k.position, k.quaternion, k.scale) : k.matrix;
        const E = tmp().multiplyMatrices(W, L);
        if (!k.matrixWorldAutoUpdate) { walk(k, k.matrixWorld); continue; }
        C.checked++;
        const e = E.elements, f = k.matrixWorld.elements; let d = 0;
        for (let j = 0; j < 16; j++) if (e[j] !== f[j] && !(e[j] !== e[j] && f[j] !== f[j])) d = Math.max(d, Math.abs(e[j] - f[j]) || 1);
        if (d) { C.bad++; if (C.samples.length < 10) C.samples.push(`${path(k)} Δ${d.toExponential(2)} @${C.frame}`); }
        if (k.isSkinnedMesh && k.bindMode === 'attached') {
          const I = tmp().copy(E).invert(), a = I.elements, b = k.bindMatrixInverse.elements; let di = 0;
          for (let j = 0; j < 16; j++) if (a[j] !== b[j] && !(a[j] !== a[j] && b[j] !== b[j])) di = Math.max(di, Math.abs(a[j] - b[j]) || 1);
          if (di) { C.bad++; if (C.samples.length < 10) C.samples.push(`${path(k)} bindMatrixInverse Δ${di.toExponential(2)} @${C.frame}`); }
        }
        walk(k, E);
      }
    };
    const S = G.scene, W0 = S.matrixAutoUpdate ? tmp().compose(S.position, S.quaternion, S.scale) : S.matrix;
    walk(S, W0);
    return mid.apply(this, a);
  };
});
let bad = 0;
for (const id of ROUTES) {
  const r = await ev(({ id, FR }) => {
    const G = game; const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.state = 'play';
    const C = window.__chk; C.checked = 0; C.bad = 0; C.samples = [];
    let t = 0, frames = 0;
    for (let i = 0; i < FR; i++) { C.frame = i; t += 1 / 60; route.drive(t, 1 / 60); const draw = i % 3 === 0; G.frame(1 / 60, draw); if (draw && G._renderMs) frames++; }
    return { frames, checked: C.checked, bad: C.bad, samples: C.samples };
  }, { id, FR });
  bad += r.bad;
  console.log(`${id}: ${r.frames} drawn frames, ${r.checked} world matrices compared, ${r.bad} different`);
  for (const m of r.samples) console.log('   ', m);
}
console.log(bad ? `MISMATCHES: ${bad}` : 'ALL EQUAL');
await browser.close();
