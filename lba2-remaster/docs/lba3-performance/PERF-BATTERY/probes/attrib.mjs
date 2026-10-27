// Attribution probe: per route and preset, where the triangles and calls go (main / shadow pass), by category,
// plus shaded-fragment counts (an overdraw proxy) and the scene pass's pixel count.
//   WT=<worktree lba2-remaster> QUALITIES=medium,high ROUTES=street,arrival OUT=file.json BATTERY=0|1
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const QS = (process.env.QUALITIES || 'medium').split(',');
const ROUTES = (process.env.ROUTES || 'street').split(',');
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {} }, QS[0]);
page.on('console', (m) => { if (/^PROBE/.test(m.text())) console.log(m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const out = {};
for (const q of QS) {
  await ev(({ q, bat, scell, dcell, fold }) => { game.settings.quality = q; game.applySettings(); if (bat != null && game.setBattery) game.setBattery(bat === '1');
    if (scell) { game.shadowCull.cell = +scell; game.shadowCull.reset(); game.drawBatch.reset(); }
    if (dcell) { game.drawBatch.cell = +dcell; game.drawBatch.reset(); } if (fold) { game.drawBatch.fold = fold === '1'; game.drawBatch.reset(); } }, { q, fold: process.env.FOLD, bat: process.env.BATTERY ?? null, scell: process.env.SCELL, dcell: process.env.DCELL });
  for (const id of ROUTES) {
    const r = await ev(async ({ id, frag, EVERY, NF }) => {
      const G = game, R = G.renderer.renderer, THREE = G.THREE || (await import('three'));
      const route = G.bench.routes().find((x) => x.id === id);
      G.state = 'play'; route.setup(); G.state = 'play';
      const cats = new Map(); let frames = 0;
      const catOf = (o) => {
        if (o.name === 'shadowBatch') return 'static shadow batches';
        if (o.name === 'lodBatch') return 'trees/bushes/rocks (BatchedMesh)';
        if (o.name === 'drawBatch') return 'draw batches (static non-casting)';
        if (o.isSkinnedMesh) return 'characters (skinned)';
        let src = null, top = null;
        for (let p = o; p && p !== G.scene; p = p.parent) { if (p.userData?.src && !src) src = p.userData.src; top = p; }
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (o.isInstancedMesh) { const tri = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; return `instanced ${m?.side === 2 ? 'grass(2-sided)' : 'mesh'} ${tri < 200 ? 'small' : 'big'}${o.castShadow ? ' cast' : ''}`; }
        if (o === G.terrain?.mesh || /terrain/i.test(o.name)) return 'terrain';
        if (o.material?.isShaderMaterial || o.material?.type === 'ShaderMaterial') return 'shader: ' + (o.name || src || top?.name || '?');
        return (src || top?.name || top?.type || '?') + (o.castShadow ? ' (cast)' : '');
      };
      const rbd = R.renderBufferDirect;
      let rec = false;
      R.renderBufferDirect = function (c, sc, g, mat, o, grp) {
        const t0 = R.info.render.triangles;
        const r = rbd.call(this, c, sc, g, mat, o, grp);
        if (!rec) return r;
        const k = (sc === null ? 'shadow | ' : 'main | ') + catOf(o);
        let e = cats.get(k); if (!e) cats.set(k, (e = { calls: 0, tris: 0 }));
        e.calls++; e.tris += R.info.render.triangles - t0;
        return r;
      };
      let t = 0; const tot = { calls: 0, tris: 0, shadow: 0, frags: 0, px: 0, casters: 0 };
      const fragTarget = frag ? new THREE.WebGLRenderTarget(683, 384, { depthBuffer: true }) : null;
      const over = frag ? new THREE.MeshBasicMaterial({ color: 0x010101, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, toneMapped: false, fog: false }) : null;
      const fragCount = () => {
        // shaded fragments (passing the depth test in three's draw order), at half resolution, ×4
        const comp = G.renderer.composer, cr = comp.render;
        let n = 0;
        comp.render = () => {
          const prev = R.getRenderTarget(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
          G.scene.overrideMaterial = over; R.setRenderTarget(fragTarget); R.setClearColor(0, 0); R.clear();
          const bg = G.scene.background; G.scene.background = null;
          try { R.render(G.scene, G.camera); } finally { G.scene.overrideMaterial = null; G.scene.background = bg; R.shadowMap.autoUpdate = au; }
          const px = new Uint8Array(683 * 384 * 4); R.readRenderTargetPixels(fragTarget, 0, 0, 683, 384, px);
          for (let i = 0; i < px.length; i += 4) n += px[i];
          R.setRenderTarget(prev);
        };
        try { G.renderer.render(); } finally { comp.render = cr; }
        return n * 4;
      };
      const samples = [];
      for (let i = 0; i < NF; i++) {
        const dt = 1 / 30; t += dt;
        route.drive(t, dt);
        const draw = t >= 1.5 && i % EVERY === 0;
        G.perf.beginFrame(); G._renderMs = 0;
        if (!draw) { G.frame(dt, false); continue; }
        const snap = new Map([...cats].map(([k, v]) => [k, { ...v }]));
        rec = true; G.frame(dt, true); rec = false;
        if (G._renderMs > 0) {
          frames++;
          tot.calls += R.info.render.calls; tot.tris += R.info.render.triangles; tot.shadow += G.perf.shadow;
          const T = G.renderer.composer.renderTarget1; const s = G.renderer.effScale();
          tot.px += Math.round(T.width * s) * Math.round(T.height * s);
          samples.push({ t: +t.toFixed(2), calls: R.info.render.calls, tris: R.info.render.triangles, shadow: G.perf.shadow });
          if (frag) tot.frags += fragCount();
        } else { cats.clear(); for (const [k, v] of snap) cats.set(k, v); }
      }
      R.renderBufferDirect = rbd;
      const f = Math.max(1, frames);
      const list = [...cats].map(([k, v]) => ({ k, calls: +(v.calls / f).toFixed(1), tris: Math.round(v.tris / f) })).sort((a, b) => b.tris - a.tris);
      return { frames, calls: Math.round(tot.calls / f), tris: Math.round(tot.tris / f), shadow: Math.round(tot.shadow / f), px: Math.round(tot.px / f), frags: Math.round(tot.frags / f),
        msaa: G.renderer.composer.renderTarget1.samples, pr: G.renderer.pixelRatio(), shadowType: R.shadowMap.type, shadowMap: G.env.sun.shadow.mapSize.x, fxaa: G.renderer.fxaa.enabled, list, samples };
    }, { id, frag: process.env.FRAG !== '0', EVERY: +(process.env.EVERY || 12), NF: +(process.env.NF || 225) });
    out[`${q}/${id}`] = r;
    console.log(`\n== ${q}/${id}: calls ${r.calls} (shadow ${r.shadow}) · tris ${(r.tris / 1000).toFixed(0)}k · scene px ${r.px} · shaded frags ${r.frags} (×${(r.frags / Math.max(1, r.px)).toFixed(2)}) · msaa ${r.msaa} · pr ${r.pr} · frames ${r.frames}`);
    for (const x of r.list.slice(0, Number(process.env.TOP || 30))) console.log(`   ${String((x.tris / 1000).toFixed(1)).padStart(7)}k  ${String(x.calls).padStart(6)} calls  ${x.k}`);
  }
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
await browser.close();
