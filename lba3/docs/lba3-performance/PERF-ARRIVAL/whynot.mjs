// PERF-ARRIVAL: the meshes an area draws on its own in the main pass (not merged into a draw batch, drawbatch.js), and
// why each was left out, on the arrival route's view. Same rules as drawbatch.js `eligible`, in order.
//   GAME_URL=http://localhost:8177/ QUALITY=high AREA=zeelich node whynot.mjs
import { launch, open } from '../../../tests/lib/boot.mjs';
const Q = process.env.QUALITY || 'high', AREA = process.env.AREA || 'zeelich';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
await open(page, '?nocine');
const out = await page.evaluate(({ AREA }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const W = G.renderer.renderer;
  G.bench.routes().find((x) => x.id === 'arrival').setup();
  if (AREA === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(AREA, null, true, true);
  G.state = 'play';
  for (let i = 0; i < 4; i++) G.frame(1 / 30, true);
  const root = G.room?.group || G.world.root;
  const BASE = Object.getPrototypeOf(new (W.constructor === Object ? Object : Object)()).constructor;   // (unused)
  const obr = Object.getPrototypeOf(Object.getPrototypeOf(G.hero.rig?.root || G.scene)).onBeforeRender;
  const reason = (o) => {
    if (o.isSkinnedMesh) return 'skinned'; if (o.isInstancedMesh) return 'instanced'; if (o.isBatchedMesh) return 'batched';
    if (o.isSprite) return 'sprite'; if (o.isPoints || o.isLine) return 'points/line';
    if (o.userData.shadowProxy || o.userData.drawBatch) return 'batch itself';
    if (o.castShadow) return 'casts its own shadow (shadowcull solo)';
    if (!o.frustumCulled) return 'not frustum-culled';
    if (o.onBeforeRender !== obr) return 'onBeforeRender';
    if (Array.isArray(o.material)) return 'material array';
    const m = o.material, g = o.geometry;
    if (m.transparent) return 'transparent'; if (m.depthWrite === false) return 'no depth write'; if (m.userData?.noBatch) return 'noBatch';
    if (m.isShaderMaterial) return 'ShaderMaterial';
    if (m.onBeforeCompile && m.onBeforeCompile.toString() !== 'onBeforeCompile(){}' && !m.userData?.twin) return 'onBeforeCompile';
    if (g.attributes.tangent) return 'tangent'; if (g.drawRange.count !== Infinity) return 'drawRange';
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return 'userData.keep (moves/toggles)';
    if (o.userData.drawBatched) return '(batched)';
    return 'eligible: alone in its cell+material';
  };
  const seen = new Map(), mats = new Map();
  const orig = W.renderBufferDirect;
  W.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
    if (scene) { const r = reason(obj); const e = seen.get(r) || { n: 0, ex: [] }; e.n++; if (e.ex.length < 6) { const p = []; for (let x = obj; x && x !== root && x !== G.scene; x = x.parent) p.push(x.name || x.type); e.ex.push(p.slice(0, 4).join('<') + ' ' + (mat.name || mat.type) + (mat.map ? '+map' : '') + (mat.vertexColors ? '+vc' : '')); } seen.set(r, e); }
    return orig.call(this, cam, scene, geo, mat, obj, grp);
  };
  G.frame(1 / 30, true);
  W.renderBufferDirect = orig;
  return [...seen].sort((a, b) => b[1].n - a[1].n).map(([r, e]) => `${String(e.n).padStart(4)}  ${r}\n        ${e.ex.join('\n        ')}`);
}, { AREA });
console.log(`${AREA} (${Q}) main-pass draws by reason they are not in a draw batch:\n` + out.join('\n'));
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await browser.close();
