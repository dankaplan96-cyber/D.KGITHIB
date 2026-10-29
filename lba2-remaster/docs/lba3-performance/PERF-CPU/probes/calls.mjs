// PERF-CPU: one drawn frame's draw calls by what they draw (main pass and shadow pass apart): the area's batches, its
// pieces left out of them, people (rigs), enemies, instanced meshes, sprites / points / lines, transparent pieces, …
//   GAME_URL=http://localhost:8214/ ROUTE=arrival Q=low BATTERY=1 [CAM=follow] node calls.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ID = process.env.ROUTE || 'arrival';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, cam }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  for (let i = 0; i < 90; i++) { route.drive(i / 30, 1 / 30); G.frame(1 / 30, i % 3 === 0); }
  const root = G.room?.group || G.world.root;
  const under = (o, f) => { for (let p = o; p; p = p.parent) if (f(p)) return p; return null; };
  const kind = (o, m) => {
    if (o.userData.drawBatch) return 'area batch';
    if (o.userData.shadowProxy) return 'shadow batch';
    if (o.isSprite) return 'sprite'; if (o.isPoints) return 'points'; if (o.isLine || o.isLineSegments) return 'line';
    if (under(o, (p) => p === G.hero?.rig?.root || p === G.hero?.root || p === G.hero?.mesh)) return 'hero';
    if (o.isInstancedMesh) return 'instanced';
    if (m.transparent) return 'transparent';
    if (under(o, (p) => p.userData?.enemy || /enemy|mite|drone|sentry|crawler|guard/i.test(p.name || ''))) return 'enemy';
    if (o.isSkinnedMesh || under(o, (p) => p.userData?.rig || p.userData?.npc || p.userData?.person)) return 'person / rig';
    if (under(o, (p) => p === root)) return 'area piece, not batched: ' + (o.castShadow ? 'casts its own shadow' : under(o, (p) => p.userData?.keep) ? 'keep (moves)' : m.onBeforeCompile && m.onBeforeCompile.toString().length > 20 && !m.userData?.twin ? 'own shader' : m.map && m.map.wrapS !== 1000 ? 'clamped texture' : 'alone in its cell / other');
    return 'other (' + (under(o, (p) => p.parent === G.renderer.scene || p.parent?.isScene)?.name || '?') + ')';
  };
  const out = { main: {}, shadow: {} }, rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (c, sc, g, m, o, ...a) { const P = sc === null ? out.shadow : out.main, k = kind(o, m); P[k] = (P[k] || 0) + 1; return rbd.call(this, c, sc, g, m, o, ...a); };
  G.frame(1 / 60, true);
  R.renderBufferDirect = rbd;
  const tot = (P) => Object.values(P).reduce((s, x) => s + x, 0);
  return { room: G.room?.id || 'citadel', calls: R.info.render.calls, main: tot(out.main), shadow: tot(out.shadow), byMain: Object.fromEntries(Object.entries(out.main).sort((a, b) => b[1] - a[1])), byShadow: out.shadow };
}, { id: ID, cam: process.env.CAM || '' });
console.log(JSON.stringify(r, null, 1));
await browser.close();
