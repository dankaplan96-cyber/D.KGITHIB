// PERF-SUBMIT: a benchmark route's draws by kind, main pass and shadow pass apart, averaged over FRAMES drawn frames
// (as the benchmark drives it), with the most frequent unbatched main-pass draws by builder path.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street FRAMES=60 [CAM=follow] [TOP=40] node drawkinds.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 60), TOP = +(process.env.TOP || 40);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const r = await ev(({ id, cam, FR, top }) => {
  const G = game, R = G.renderer.renderer, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  let t = 0;
  for (let i = 0; i < 240; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  const actors = () => { const s = new Map(); for (const a of [...G.npcs, ...G.enemies, G.hero]) if (a?.rig?.root) s.set(a.rig.root, a === G.hero ? 'hero' : G.enemies.includes(a) ? 'enemy' : 'person'); return s; };
  const out = { main: {}, shadow: {} }, list = new Map();
  const rbd = R.renderBufferDirect; let A = actors();
  const kind = (o, m) => {
    if (o.userData.drawBatch) return 'draw batch';
    if (o.userData.shadowProxy) return 'shadow batch';
    for (let p = o; p; p = p.parent) { const k = A.get(p); if (k) return k + (o.isSkinnedMesh ? ' body (skinned)' : ' part'); }
    if (o.name === 'blobBatch') return 'blob shadows (instanced)';
    if (o.isInstancedMesh) return 'instanced';
    if (o.isBatchedMesh) return 'batched mesh (trees)';
    if (o.isSprite || o.isPoints || o.isLine) return 'sprite/points/line';
    if (m.transparent) return 'transparent';
    if (o.castShadow) return 'piece casting its own shadow';
    return 'other mesh';
  };
  const path = (o) => { const p = []; for (let x = o.parent; x && !x.isScene && p.length < 3; x = x.parent) p.push(x.name || x.type); return p.reverse().join('/') || '(scene)'; };
  R.renderBufferDirect = function (c, sc, g, m, o) {
    const P = sc === null ? 'shadow' : 'main', k = kind(o, m); out[P][k] = (out[P][k] || 0) + 1;
    if (P === 'main' && !o.userData.drawBatch) { const key = `${k} | ${path(o)} :: ${o.name || ''} [${m.name || m.type}]`; list.set(key, (list.get(key) || 0) + 1); }
    return rbd.apply(this, arguments);
  };
  for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); A = actors(); G.perf.beginFrame(); G.frame(1 / 60, true); }
  R.renderBufferDirect = rbd;
  const avg = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / FR).toFixed(1)]));
  return { main: avg(out.main), shadow: avg(out.shadow), top: [...list].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, n]) => `${(n / FR).toFixed(1).padStart(5)}  ${k}`) };
}, { id: ID, cam: process.env.CAM || '', FR, top: TOP });
const sum = (o) => Object.values(o).reduce((s, x) => s + x, 0).toFixed(1);
console.log(`PERF-SUBMIT draws by kind · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} · ${FR} frames`);
console.log(`main ${sum(r.main)}:`, JSON.stringify(r.main));
console.log(`shadow ${sum(r.shadow)}:`, JSON.stringify(r.shadow));
console.log('-- main-pass draws other than draw batches, by path (a frame)');
for (const l of r.top) console.log('  ' + l);
await browser.close();
