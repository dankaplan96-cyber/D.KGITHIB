// PERF-CALLS: one drawn frame per arrival area (the benchmark's arrival route: Zeelich, the desert, the Hamalayi,
// Citadel), draw calls by what they draw, main pass and shadow pass apart, and the area's unbatched meshes by builder
// path (the top three ancestors' names) — what the draws are made of.
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 [AREAS=zeelich,desert] [TOP=30] [SHADOWLIST=1] node areacalls.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', AREAS = (process.env.AREAS || 'zeelich,desert,hamalayi,citadel').split(','), TOP = +(process.env.TOP || 25);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(() => game.bench.prepareAreas());
for (const area of AREAS) {
  const r = await ev(({ area, top }) => {
    const G = game, R = G.renderer.renderer;
    G.state = 'play';
    if (area === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(area, null, true, true);
    G.bench.camera();
    G.state = 'play';
    for (let i = 0; i < 90; i++) G.frame(1 / 30, i % 3 === 0);
    const root = G.room?.group || G.world.root;
    const under = (o, f) => { for (let p = o; p; p = p.parent) if (f(p)) return p; return null; };
    const path = (o) => { const p = []; for (let x = o.parent; x && x !== root && p.length < 3; x = x.parent) p.push(x.name || x.type); return p.reverse().join('/') || '(root)'; };
    const kind = (o, m) => {
      if (o.userData.drawBatch) return 'area batch';
      if (o.userData.shadowProxy) return 'shadow batch';
      if (o.isSprite) return 'sprite'; if (o.isPoints) return 'points'; if (o.isLine || o.isLineSegments) return 'line';
      if (under(o, (p) => p === G.hero?.rig?.root || p === G.hero?.root || p === G.hero?.mesh)) return 'hero';
      if (o.isInstancedMesh) return 'instanced';
      if (m.transparent) return 'transparent';
      if (o.isSkinnedMesh || under(o, (p) => p.userData?.rig || p.userData?.npc || p.userData?.person)) return 'person / rig';
      if (under(o, (p) => p === root)) return 'area piece: ' + (o.castShadow ? 'casts own shadow' : under(o, (p) => p.userData?.keep) ? 'keep' : (m.onBeforeCompile && m.onBeforeCompile.toString().length > 20 && !m.userData?.twin) ? 'own shader' : m.map && m.map.wrapS !== 1000 ? 'clamped tex' : 'alone/other');
      return 'other (' + (under(o, (p) => p.parent?.isScene)?.name || '?') + ')';
    };
    const out = { main: {}, shadow: {} }, list = { main: new Map(), shadow: new Map() }, rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (c, sc, g, m, o, ...a) {
      const P = sc === null ? 'shadow' : 'main', k = kind(o, m); out[P][k] = (out[P][k] || 0) + 1;
      if (!o.userData.drawBatch && !o.userData.shadowProxy) { const key = k + ' | ' + (o.isInstancedMesh ? 'I ' : '') + path(o) + ' :: ' + (o.name || '') + ' [' + (m.name || m.type) + ']'; list[P].set(key, (list[P].get(key) || 0) + 1); }
      return rbd.call(this, c, sc, g, m, o, ...a);
    };
    G.frame(1 / 60, true);
    R.renderBufferDirect = rbd;
    const tot = (P) => Object.values(P).reduce((s, x) => s + x, 0);
    const srt = (M) => [...M].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, n]) => `${String(n).padStart(3)} ${k}`);
    return { area, room: G.room?.id || 'citadel', calls: R.info.render.calls, tris: R.info.render.triangles, main: tot(out.main), shadow: tot(out.shadow),
      byMain: Object.fromEntries(Object.entries(out.main).sort((a, b) => b[1] - a[1])), byShadow: Object.fromEntries(Object.entries(out.shadow).sort((a, b) => b[1] - a[1])),
      topMain: srt(list.main), topShadow: srt(list.shadow), batches: G.drawBatch.areas.get(root)?.stats() || null };
  }, { area, top: TOP });
  console.log('=== ' + area + ' calls ' + r.calls + ' (main ' + r.main + ', shadow ' + r.shadow + ') tris ' + r.tris);
  console.log('main', JSON.stringify(r.byMain)); console.log('shadow', JSON.stringify(r.byShadow)); console.log('batches', JSON.stringify(r.batches));
  console.log('-- main, unbatched by path'); for (const l of r.topMain) console.log('  ' + l);
  if (process.env.SHADOWLIST) { console.log('-- shadow, unbatched by path'); for (const l of r.topShadow) console.log('  ' + l); }
}
await browser.close();
