// RENDER-INV: what a frame submits, by class (static mesh, instanced, batched, character body/part, scene-level) and
// pass, and how many static draws share a material + attribute layout + flags inside one 48 m cell (what a per-cell
// merge could turn into one draw). Several frames per view, averaged.
//   GAME_URL=http://localhost:8176/ QUALITY=medium VIEWS=street,harbour,door node who.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const RA = fileURLToPath(new URL('./ra.js', import.meta.url));
const FOLD = process.env.FOLD, CELL = +(process.env.CELL || 0), quality = process.env.QUALITY || 'medium', VIEWS = (process.env.VIEWS || 'street,harbour,door').split(','), TOP = +(process.env.TOP || 25);
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
await page.addScriptTag({ path: RA });
const out = await page.evaluate(({ VIEWS, TOP, CELL, FOLD }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  if (CELL && G.drawBatch) { G.drawBatch.reset(); G.drawBatch.cell = CELL; }   // (a cell size to compare; CELL=-1: draw batches off)
  if (CELL < 0 && G.drawBatch) G.drawBatch.enabled = false;
  if (FOLD === '0' && G.drawBatch) { G.drawBatch.reset(); G.drawBatch.fold = false; }   // (the batches without folding colours)
  const W = G.renderer.renderer, res = {};
  const views = {
    street: { setup: () => { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); return (t, dt) => r.drive(t, dt); }, at: [2.5, 4, 5.5] },
    harbour: { setup: () => { G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; G.camRig.pitch = 0.3; return null; }, at: [1, 1.5, 2] },
    door: { setup: () => { G.exitRoom({ x: -45, z: 76, a: 0 }, true, true); G.bench.camera(); return null; }, at: [1, 1.5, 2] },
    zeelich: { setup: () => { G.enterRoom('zeelich', null, true, true); return null; }, at: [1, 1.5, 2] },
    desert: { setup: () => { G.enterRoom('desert', null, true, true); return null; }, at: [1, 1.5, 2] },
    hamalayi: { setup: () => { G.enterRoom('hamalayi', null, true, true); return null; }, at: [1, 1.5, 2] },
    otringal: { setup: () => { G.enterRoom('isle_otringal', null, true, true); return null; }, at: [1, 1.5, 2] },
    house: { setup: () => { G.enterRoom('house', null, true, true); return null; }, at: [1, 1.5, 2] },
  };
  for (const v of VIEWS) {
    const V = views[v]; G.state = 'play'; const drive = V.setup(); G.state = 'play';
    const cls = new Map(), groups = new Map(), tris = new Map(); let frames = 0, calls = 0, cur = false, fi = 0;
    const orig = W.renderBufferDirect;
    W.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
      if (cur) {
        const pass = scene ? 'main' : 'shadow', area = RA.areaOf(obj);
        const k = obj.userData.shadowProxy ? 'shadow batch' : obj.isSkinnedMesh ? 'character body (skinned)' : area.startsWith('actor') ? 'character part (rigid)' : obj.isBatchedMesh ? 'batched (multi-draw)' : obj.isInstancedMesh ? 'instanced' : obj.isPoints || obj.isLine || obj.isSprite ? 'points/lines/sprites' : area.startsWith('scene') ? 'scene-level mesh' : mat.transparent ? 'static mesh, transparent' : 'static mesh';
        const key = pass + ' | ' + k; cls.set(key, (cls.get(key) || 0) + 1); calls++;
        const tr = (grp ? grp.count : geo.index ? geo.index.count : geo.attributes.position?.count || 0) / 3 * (obj.isInstancedMesh ? obj.count : 1) + (obj.isBatchedMesh ? 0 : 0);
        tris.set(key, (tris.get(key) || 0) + tr);
        if (pass === 'main' && (k === 'static mesh' || k === 'instanced' || k === 'static mesh, transparent')) {
          obj.getWorldPosition(_p);
          const cell = Math.floor(_p.x / 48) + ',' + Math.floor(_p.z / 48);
          const gk = [fi, k, area, mat.uuid.slice(0, 6) + ':' + mat.type + (mat.map ? '+map' : '') + (mat.vertexColors ? '+vc' : ''), Object.keys(geo.attributes).sort().join(','), obj.castShadow, obj.receiveShadow, obj.renderOrder, cell, k === 'instanced' ? geo.uuid.slice(0, 6) : ''].join('|');
          groups.set(gk, (groups.get(gk) || 0) + 1);
        }
      }
      return orig.call(this, cam, scene, geo, mat, obj, grp);
    };
    const _p = new (G.camera.position.constructor)();
    let t = 0;
    for (let i = 0; t < Math.max(...V.at) + 0.02; i++) { const dt = 1 / 30; t += dt; drive?.(t, dt); const d = V.at.some((a) => Math.abs(t - a) < 0.017); cur = d; if (d) { frames++; fi++; } G.frame(dt, d); cur = false; }
    W.renderBufferDirect = orig;
    // a per-cell merge: every group of n > 1 static draws becomes one (instanced: same geometry only)
    let mergeable = 0, saved = 0; for (const [, n] of groups) if (n > 1) { mergeable += n; saved += n - 1; }
    const byMat = new Map(); for (const [gk, n] of groups) { const p = gk.split('|'); const mk = p[1] + ' | ' + p[2] + ' | ' + p[3]; byMat.set(mk, (byMat.get(mk) || 0) + n); }
    res[v] = { batches: G.drawBatch?.stats(), frames, callsPerFrame: +(calls / frames).toFixed(1), byClass: Object.fromEntries([...cls].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, +(n / frames).toFixed(1)])), trisK: Object.fromEntries([...tris].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, Math.round(n / frames / 1000)])), infoTris: W.info.render.triangles, perCellMergeSaves: +(saved / frames).toFixed(1), ofDraws: +(mergeable / frames).toFixed(1), topMaterials: [...byMat].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, n]) => `${(n / frames).toFixed(1)} ${k}`) };
  }
  return res;
}, { VIEWS, TOP, CELL, FOLD });
console.log(JSON.stringify({ quality, out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
