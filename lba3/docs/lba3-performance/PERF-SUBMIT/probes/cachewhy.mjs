// PERF-SUBMIT: why the static shadow cache is rebuilt (shadowcache.js): on a route (fixed 60 Hz steps, every step
// drawn), each frame whose render rebuilt the cache in full, with what differed from the last frame's cache key —
// the area, the static casters (which left / joined), the sun's direction, the shadow box, the map — and whether the
// screen was black. GPU textures and geometries counted too.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=arrival SECONDS=10 node cachewhy.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'arrival', SEC = +(process.env.SECONDS || 10);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
const L = await ev(({ id, SEC }) => {
  const G = game, R = G.renderer.renderer, SC = G.shadowCache, route = G.bench.routes().find((x) => x.id === id), out = [];
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  // the key's parts, each frame the cache renders
  let last = null, cur = null;
  const statics = SC.statics.bind(SC);
  SC.statics = (A) => { const S = statics(A); const sun = SC.sun, d = sun.position.clone().sub(sun.target.position).normalize(), cam = sun.shadow.camera;
    cur = { root: A.root.name || A.root.uuid.slice(0, 6), ids: S.map((o) => o.id), names: new Map(S.map((o) => [o.id, (o.name || o.type) + '@' + (o.parent?.name || '')])), d: [d.x.toFixed(5), d.y.toFixed(5), d.z.toFixed(5)].join(','), box: [cam.left, cam.right, cam.top, cam.bottom, cam.near, cam.far].join(','), size: sun.shadow.mapSize.x, map: sun.shadow.map?.texture.uuid.slice(0, 6), type: R.shadowMap.type };
    return S; };
  let t = 0;
  for (let i = 0; i < SEC * 60; i++) {
    t += 1 / 60; route.drive(t, 1 / 60);
    const f0 = SC.stats.full, x0 = R.info.memory.textures, g0 = R.info.memory.geometries; cur = null;
    G.frame(1 / 60, true);
    const black = !!G.trans && (G.trans.hold || G._fadeOp >= 0.999);
    if (SC.stats.full > f0 && cur) {
      const why = [];
      if (!last) why.push('first');
      else {
        if (last.root !== cur.root) why.push(`area ${last.root} → ${cur.root}`);
        else {
          const a = new Set(last.ids), b = new Set(cur.ids), gone = last.ids.filter((x) => !b.has(x)), came = cur.ids.filter((x) => !a.has(x));
          if (gone.length || came.length) why.push(`casters −${gone.length} [${gone.slice(0, 4).map((x) => last.names.get(x)).join(' ')}] +${came.length} [${came.slice(0, 4).map((x) => cur.names.get(x)).join(' ')}]`);
          else if (last.ids.join() !== cur.ids.join()) why.push('casters reordered');
        }
        if (last.d !== cur.d) why.push(`sun ${last.d} → ${cur.d}`);
        if (last.box !== cur.box) why.push(`box ${last.box} → ${cur.box}`);
        if (last.size !== cur.size || last.map !== cur.map || last.type !== cur.type) why.push(`map ${last.size}/${last.map}/${last.type} → ${cur.size}/${cur.map}/${cur.type}`);
        if (!why.length) why.push('moved past the cache (window)');
      }
      out.push(`${t.toFixed(2)} s ${G.room?.id || 'citadel'} ${black ? 'BLACK' : G.trans ? 'fade ' : 'view '} · cache rebuilt: ${why.join('; ')} · +${R.info.memory.textures - x0} textures, +${R.info.memory.geometries - g0} geometries`);
    }
    if (cur) last = cur;
  }
  SC.statics = statics; G.benching = false;
  return out;
}, { id: ID, SEC });
console.log(`PERF-SUBMIT why the shadow cache was rebuilt · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · ${SEC} s`);
for (const l of L) console.log('  ' + l);
await browser.close();
