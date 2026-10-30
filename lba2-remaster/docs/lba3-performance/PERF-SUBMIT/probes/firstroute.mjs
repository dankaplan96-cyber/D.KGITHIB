// STABILIZATION (laptop 0.41.0: the full benchmark's first route, Low street, has one 2183 ms frame at 2.2 s into its
// measured window): what the game does in every frame of the first route after the benchmark starts, from New Game in
// Auto as the runner has it. Every frame: its interval, its own work, and what changed in it (programs, geometries,
// textures, shadow cache builds, draw/shadow batch builds, uploads, render targets) — the counts are exact here, the ms
// this machine's.
//   GAME_URL=http://localhost:8351/ BATTERY=1 Q=low ROUTE=street|arrival SECS=8 [EXTRA=1] node firstroute.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env, Q = E.Q || 'low', ROUTE = E.ROUTE || 'street', SECS = +(E.SECS || 8);
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
if (E.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await ev(() => { game.testFreeze = false; });
await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.preparing, null, { timeout: 900000 });
await page.waitForTimeout(3000);
await ev(({ Q, ROUTE, SECS, E2 }) => {
  const G = game, R = G.renderer.renderer;
  const L = (window.__fr = []);
  const cnt = () => ({ p: R.info.programs.length, g: R.info.memory.geometries, x: R.info.memory.textures, sc: G.shadowCache?.stats.full ?? 0, sl: G.shadowCache?.stats.sliced ?? 0, sw: G.shadowCache?.stats.swaps ?? 0,
    db: G.drawBatch?.builds ?? 0, sb: G.shadowCull?.builds ?? 0, up: G.uploadLog?.length ?? 0, rt: G.perf.targets?.size ?? 0, hold: !!G.gfxHold, trans: !!G.trans, black: !!G._shownBlack, ...(E2 ? scan() : {}) });
  // (EXTRA=1: skeletons with their bone texture made, batched meshes, and what is visible: a scene walk a frame, outside the work timed)
  function scan() { let sk = 0, bm = 0, vis = 0; G.scene.traverse((o) => { if (o.isSkinnedMesh && o.skeleton?.boneTexture) sk++; if (o.isBatchedMesh) bm++; }); G.scene.traverseVisible((o) => { if (o.isMesh) vis++; }); return { sk, bm, vis }; }
  let prev = cnt(), t0 = performance.now();
  const adv = G.advance.bind(G);
  G.advance = (real) => {
    const a = performance.now(); adv(real); const w = performance.now() - a, c = cnt(), d = [];
    for (const k of ['p', 'g', 'x', 'sc', 'sl', 'sw', 'db', 'sb', 'up', 'rt', 'sk', 'bm', 'vis']) if (c[k] !== prev[k]) d.push(`${k}${c[k] - prev[k] > 0 ? '+' : ''}${c[k] - prev[k]}`);
    L.push(`${((a - t0) / 1000).toFixed(2)}s iv ${(real * 1000).toFixed(0)} work ${w.toFixed(0)}${c.hold ? ' HOLD' : ''}${c.trans ? ' TRANS' : ''}${c.black ? ' black' : ''} op ${(G._fadeOp ?? 0).toFixed(2)}${G.benchTick ? '' : ' (no bench)'} ${d.join(' ')}`);
    prev = c;
  };
  window.__frdone = false;
  G.bench.run({ qualities: [Q], routes: [ROUTE], breakdown: false, played: false }).then((t) => { window.__frtext = t; window.__frdone = true; G.advance = adv; });
}, { Q, ROUTE, SECS, E2: !!E.EXTRA });
await page.waitForFunction(() => window.__frdone, null, { timeout: 3600000, polling: 2000 });
const r = await ev(() => ({ L: window.__fr, t: window.__frtext }));
console.log(r.L.join('\n'));
console.log('\n' + r.t.split('\n').filter((l) => /street|hitch|stall|@/.test(l)).slice(0, 20).join('\n'));
await browser.close();
