// STABILIZATION (laptop 0.41.0: a 2183 ms frame IN VIEW 2.2 s into the full benchmark's first route, Low street, the
// frame before it "+3 geometries, +1 textures"; the arrival's first frame in view after the black 184 ms, "+12/+13
// textures"): what is drawn for the FIRST time, and when. A route after a preset change (as the benchmark starts it), on
// the game's fixed clock (60 steps a second, every one drawn): every draw call goes through renderBufferDirect (the shadow
// pass too); the first draw of each geometry and of each texture is noted with the route's time, the object (its path
// of names), its size and kind. Exact here (what is drawn when does not depend on this machine's speed).
//   GAME_URL=http://localhost:8351/ BATTERY=1 Q=low ROUTE=street CAM=orbit SECS=8 node firstdraw.mjs
//   GAME_URL=… TITLE=1 SECS=60 node firstdraw.mjs   (the title screen from its first frame)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env, Q = E.Q || 'low', ROUTE = E.ROUTE || 'street', SECS = +(E.SECS || 8), CAM = E.CAM || 'orbit';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
if (E.BATTERY) await ev(() => game.setBattery(true));
if (E.TITLE) {
  // (TITLE=1: the title screen instead — the world behind the menu, its camera going round Citadel — from its first frame)
  await page.waitForFunction(() => window.game && game.screen === 'title' && !game.preparing, null, { timeout: 900000 });
  await ev(() => { window.__route = null; });
} else {
  await ev(() => { document.querySelector('[data-act="new"]').click(); });
  await ev(() => { game.testFreeze = false; });
  await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.preparing && !game.gfxHold, null, { timeout: 900000 });
  await ev(() => game.bench.prepareAreas());
  await page.waitForFunction(() => !game.preparing && !game.gfxHold && !game.trans, null, { timeout: 900000 });
  // the benchmark's start: the preset, the route's setup; the hold until the programs are made
  await ev(({ Q, ROUTE, CAM }) => {
    const G = game; G.benching = true; G.bench.setCamera(CAM);
    G.settings.quality = Q; G.settings.qualityAuto = false; G.applySettings();
    const route = G.bench.routes().find((r) => r.id === ROUTE); G.state = 'play'; route.setup(); window.__route = route;
  }, { Q, ROUTE, CAM });
  await page.waitForFunction(() => !game.gfxHold && !game.trans, null, { timeout: 900000, polling: 500 });
}
await ev(() => {
  const G = game, R = G.renderer.renderer; G.testFreeze = true;
  const seenG = new Set(), seenT = new Set(), log = (window.__fd = []); window.__t = 0; window.__i = 0;
  const path = (o) => { const n = []; for (let p = o; p && n.length < 5; p = p.parent) n.push(p.name || p.type); return n.join(' < '); };
  const texOf = (m) => { const o = []; for (const k in m) { const v = m[k]; if (v?.isTexture) o.push(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (v?.isTexture) o.push(v); } return o; };
  const rbd = R.renderBufferDirect.bind(R);
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const pass = camera?.isOrthographicCamera ? 'ortho: shadow or a pass' : 'main';
    if (!seenG.has(geometry.id)) { seenG.add(geometry.id); window.__new.push({ k: 'geo', pass, what: path(object), kind: object.isBatchedMesh ? 'batched' : object.isInstancedMesh ? `instanced ${object.count}` : object.isSkinnedMesh ? 'skinned' : object.type, verts: geometry.attributes.position?.count ?? 0 }); }
    for (const t of texOf(material)) if (!seenT.has(t.id)) { seenT.add(t.id); window.__new.push({ k: 'tex', pass, what: path(object), kind: `${t.constructor.name} ${t.image?.width ?? '?'}×${t.image?.height ?? '?'}${t.isRenderTargetTexture ? ' (target)' : ''}` }); }
    if (object.isSkinnedMesh && object.skeleton && !object.skeleton.boneTexture && !seenT.has('bone' + object.skeleton.uuid)) { seenT.add('bone' + object.skeleton.uuid); window.__new.push({ k: 'bone texture', pass, what: path(object), kind: 'skeleton ' + object.skeleton.bones.length }); }
    return rbd(camera, scene, geometry, material, object, group);
  };
  window.__mark = () => ({ g: R.info.memory.geometries, x: R.info.memory.textures, p: R.info.programs.length });
});
const FR = Math.round(SECS * 60), CH = 30;
for (let i = 0; i < FR; i += CH) {
  const out = await ev(({ CH }) => {
    const G = game, route = window.__route, o = [];
    for (let k = 0; k < CH; k++) {
      window.__new = []; const a = window.__mark(); const t0 = performance.now();
      const lod0 = G.world.lodTiles?.reduce((n, T) => n + (T.near ? 1 : 0) + (T.hi?.visible ? 2 : 0), 0);
      window.__t += 1 / 60; route?.drive(window.__t, 1 / 60); G.frame(1 / 60, true); window.__i++;
      const lod1 = G.world.lodTiles?.reduce((n, T) => n + (T.near ? 1 : 0) + (T.hi?.visible ? 2 : 0), 0);
      if (lod1 !== lod0) window.__new.push({ k: 'LOD switch', pass: '-', what: 'world lodTiles', kind: `${lod0}→${lod1}` });
      const b = window.__mark();
      if (window.__new.length || b.g !== a.g || b.x !== a.x || b.p !== a.p) o.push({ i: window.__i, t: +window.__t.toFixed(2), ms: +(performance.now() - t0).toFixed(0), dg: b.g - a.g, dx: b.x - a.x, dp: b.p - a.p, n: window.__new });
    }
    return o;
  }, { CH });
  for (const f of out) {
    console.log(`frame ${f.i} t ${f.t}s (${f.ms} ms here) · GPU counts: geometries ${f.dg >= 0 ? '+' : ''}${f.dg}, textures ${f.dx >= 0 ? '+' : ''}${f.dx}, programs +${f.dp} · first drawn: ${f.n.length}`);
    const byWhat = new Map(); for (const n of f.n) { const k = `${n.k} [${n.pass}] ${n.kind}${n.verts ? ' ' + n.verts + ' verts' : ''} · ${n.what}`; byWhat.set(k, (byWhat.get(k) || 0) + 1); }
    for (const [k, c] of [...byWhat].slice(0, 14)) console.log(`     ${c > 1 ? c + '× ' : ''}${k}${''}`);
    if (byWhat.size > 14) console.log(`     … +${byWhat.size - 14} more kinds`);
  }
}
await browser.close();
