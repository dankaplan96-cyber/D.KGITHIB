// RENDER-INV: why the static pieces still drawn on their own were not put in a draw batch (engine/drawbatch.js).
//   GAME_URL=http://localhost:8176/ QUALITY=medium VIEW=street node whynot.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium', VIEW = process.env.VIEW || 'street';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = await page.evaluate((VIEW) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const W = G.renderer.renderer, THREE_O = Object.getPrototypeOf(G.scene.children[0]);
  const setups = { street: () => { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); r.drive(2.5, 1 / 30); }, zeelich: () => G.enterRoom('zeelich', null, true, true), desert: () => G.enterRoom('desert', null, true, true), house: () => G.enterRoom('house', null, true, true), hamalayi: () => G.enterRoom('hamalayi', null, true, true), otringal: () => G.enterRoom('isle_otringal', null, true, true) };
  G.state = 'play'; setups[VIEW](); G.state = 'play';
  for (let i = 0; i < 6; i++) G.frame(1 / 30, true);
  const root = G.room?.group || G.world.root, seen = new Set(), why = new Map(), ex = new Map();
  const orig = W.renderBufferDirect;
  W.renderBufferDirect = function (c, scene, geo, mat, o, grp) {
    if (scene && o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh && !o.userData.drawBatch && !seen.has(o)) {
      seen.add(o);
      let inRoot = false; for (let p = o; p; p = p.parent) if (p === root) inRoot = true;
      let r = !inRoot ? 'outside the area root' : o.castShadow ? 'casts its own shadow' : !o.frustumCulled ? 'not frustum-culled' : o.onBeforeRender !== Object.getPrototypeOf(G.scene).onBeforeRender ? 'onBeforeRender' : Array.isArray(o.material) ? 'material array' : mat.transparent ? 'transparent' : mat.depthWrite === false ? 'no depth write' : geo.attributes.tangent ? 'tangent' : geo.drawRange.count !== Infinity ? 'drawRange' : Object.values(geo.attributes).some((a) => a.isInterleavedBufferAttribute) ? 'interleaved' : (() => { for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return true; return false; })() ? 'userData.keep' : 'alone in its cell (or left)';
      if (r === 'casts its own shadow') { const sc = G.shadowCull.area, C = sc?.solo.find((x) => x.o === o); r += C ? ' (shadowcull solo: ' + (o.material.alphaTest > 0 ? 'alpha test' : C.solo ? 'moved/toggled' : 'not batchable/shown') + ')' : sc?.members.find((x) => x.o === o) ? ' (member?)' : ' (not in shadowcull)'; }
      why.set(r, (why.get(r) || 0) + 1);
      const k = r + ' :: ' + (o.name || o.type) + ' < ' + (o.parent?.name || o.parent?.type) + ' [' + (() => { for (let p = o; p; p = p.parent) if (p.userData?.src) return p.userData.src; return '?'; })() + ']';
      ex.set(k, (ex.get(k) || 0) + 1);
    }
    return orig.call(this, c, scene, geo, mat, o, grp);
  };
  G.frame(1 / 30, true); W.renderBufferDirect = orig;
  return { drawnOnTheirOwn: seen.size, why: Object.fromEntries([...why].sort((a, b) => b[1] - a[1])), examples: [...ex].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => n + ' ' + k), batch: G.drawBatch?.stats() };
}, VIEW);
console.log(JSON.stringify({ quality, VIEW, out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
