// STABILIZATION (laptop 0.41.0: an arrival's first frame in view after the black, 167–184 ms, "+12/+13 textures"): a
// first visit on the game's own loop (the settle frames as a player gets them, not the tests' fixed stepping), every
// frame through the scene change: its phase, fade, what it added to the GPU (textures, geometries, programs, render
// targets) and what it drew for the first time (textures by kind, render targets).
//   GAME_URL=http://localhost:8351/ BATTERY=1 AREA=zeelich node arrivereal.mjs
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
await ev((area) => {
  const G = game, R = G.renderer.renderer, L = (window.__ar = []);
  const seen = new Set(); let fresh = [];
  const rbd = R.renderBufferDirect.bind(R);
  R.renderBufferDirect = (c, s, g, m, o, gr) => {
    for (const k in m) { const v = m[k]; if (v?.isTexture && !seen.has(v.id)) { seen.add(v.id); fresh.push(`${k} ${v.image?.width ?? '?'}×${v.image?.height ?? '?'} (${o.name || o.type}${o.parent ? ' < ' + (o.parent.name || o.parent.type) : ''})`); } }
    if (o.isSkinnedMesh && o.skeleton && !o.skeleton.boneTexture) fresh.push('bone texture (' + (o.name || 'body') + ')');
    if (o.isBatchedMesh && !seen.has('b' + o.id)) { seen.add('b' + o.id); fresh.push('batch data textures (' + (o.name || 'batched') + ')'); }
    return rbd(c, s, g, m, o, gr);
  };
  // (what is already drawn before the scene change: not new)
  const cnt = () => ({ x: R.info.memory.textures, g: R.info.memory.geometries, p: R.info.programs.length, rt: G.perf.targets?.size ?? 0 });
  let prev = cnt(); const adv = G.advance.bind(G); let n = 0, after = -1;
  G.advance = (real) => {
    const T = G.trans; const ph = !T ? 'play' : T.hold ? 'hold' : !T.called ? 'fade out' : T.held ? 'settle' : 'fade in';
    fresh = []; adv(real); const c = cnt();
    L.push(`${String(n++).padStart(3)} iv ${(real * 1000).toFixed(0).padStart(6)} ${ph.padEnd(8)} fade ${(G._fadeOp ?? 0).toFixed(2)}${G._shownBlack ? ' black' : ''} · GPU textures ${c.x - prev.x >= 0 ? '+' : ''}${c.x - prev.x}, geometries ${c.g - prev.g >= 0 ? '+' : ''}${c.g - prev.g}, programs +${c.p - prev.p}, targets ${c.rt - prev.rt >= 0 ? '+' : ''}${c.rt - prev.rt}${fresh.length ? ' · first drawn: ' + fresh.slice(0, 12).join('; ') + (fresh.length > 12 ? ` … +${fresh.length - 12}` : '') : ''}`);
    prev = c;
    if (!G.trans && after < 0 && n > 3) after = n;
    if (after > 0 && n - after > 4) { G.advance = adv; window.__ardone = true; }
  };
  G.renderer.render(); fresh = [];   // (what Citadel's view already drew is not new)
  G.enterRoom(area, null, false, true);
}, E.AREA || 'zeelich');
await page.waitForFunction(() => window.__ardone, null, { timeout: 3600000, polling: 2000 });
console.log((await ev(() => window.__ar)).join('\n'));
await browser.close();
