#!/usr/bin/env node
// The bridge's proof: one code-built prop out of the running game, through the installed Blender, and back into the game.
//
//   node tools/blender-bridge/roundtrip.mjs [--gpu] [--skip-extract]
//
// 1. the game (SwiftShader, or --gpu: this machine's GPU through installed Chrome) builds the prop with props.js and
//    writes it as an lba3-polyprop (+ its canvas textures) to art/blender/props/<name>/source/ (the baseline);
// 2. the jobs in jobs/chest-roundtrip.json run in Blender: working .blend, inspect, validate, preview, export;
// 3. the game loads the exported candidate next to its own prop and compares: size per part, orientation, the
//    materials (the same cached game materials), draw calls and triangles, a pixel difference from the game camera,
//    and a walk into each from the front and the side (where the collider stops him);
// 4. reports/roundtrip.json + previews/game/*.png.
import fs from 'node:fs';
import path from 'node:path';
import { discover, runJob, GAME_ROOT } from './bridge.mjs';
import { openGame } from './lib/gamepage.mjs';

const ARGS = process.argv.slice(2);
const GPU = ARGS.includes('--gpu');
const PROP = { name: 'chest_honey', builder: 'chest', opts: { w: 0.8, d: 0.46, h: 0.44, pal: 'honey' }, recipes: [['wood', 'honey'], ['brass'], ['iron']],
  usedAt: 'src/game/interiors.js:501 (a honey chest; the same builder makes the chests at homelife.js:115, interiors.js:540/622, nbrhouse.js:98)' };
const BASE = path.join(GAME_ROOT, 'art', 'blender', 'props', PROP.name);
const P = (...p) => path.join(BASE, ...p);
const relG = (p) => path.relative(GAME_ROOT, p).replace(/\\/g, '/');
const log = (...a) => console.log('[roundtrip]', ...a);

const out = { prop: PROP, at: new Date().toISOString(), gpu: GPU, steps: [], checks: [] };
const check = (name, ok, info) => { out.checks.push({ name, ok: !!ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info).slice(0, 300) : ''}`); return ok; };

const blender = discover();
if (!blender.exe) { console.error(blender.error); process.exit(2); }
out.blender = { exe: blender.exe, version: blender.version, how: blender.how };
log('Blender', blender.version, 'at', blender.exe, `(${blender.how})`);

let game = await openGame({ gpu: GPU });
try {
  const { page } = game;
  // ---------------------------------------------------------------- 1. baseline out of the game
  const GAME_ONLY = ARGS.includes('--game-only');   // (reuse the last baseline and candidate: only step 3)
  if (!ARGS.includes('--skip-extract') && !GAME_ONLY) {
    const { data, textures } = await page.evaluate(async (prop) => {
      const m = await import('/tools/blender-bridge/game/polyprop.mjs');
      return m.extractProp(prop);
    }, PROP);
    data.source.usedAt = PROP.usedAt;
    data.source.extractedFrom = 'the running game (tools/blender-bridge/game/polyprop.mjs extractProp)';
    fs.mkdirSync(P('source', 'textures'), { recursive: true });
    for (const [f, t] of Object.entries(textures)) fs.writeFileSync(P('source', 'textures', f), Buffer.from(t.dataURL.split(',')[1], 'base64'));
    fs.writeFileSync(P('source', `${PROP.name}.polyprop.json`), JSON.stringify(data));
    out.baseline = { file: relG(P('source', `${PROP.name}.polyprop.json`)), bbox: data.bbox, triangles: data.triangles, parts: data.parts.map((p) => ({ key: p.material.key, verts: p.pos.length / 3, tris: p.idx.length / 3, map: p.material.map })), footprint: data.footprint,
      textures: Object.fromEntries(Object.entries(textures).map(([f, t]) => [f, t.size])) };
    log('baseline', JSON.stringify(out.baseline.bbox), out.baseline.triangles, 'tris');
  }
  const baseline = JSON.parse(fs.readFileSync(P('source', `${PROP.name}.polyprop.json`), 'utf8'));

  // ---------------------------------------------------------------- 2. Blender jobs
  const jobs = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tools', 'blender-bridge', 'jobs', 'chest-roundtrip.json'), 'utf8'));
  for (const j of GAME_ONLY ? [] : jobs) {
    if (j.op === 'validate') j.options = { ...j.options, expectSize: baseline.bbox.size };   // (the baseline's own size, measured in the game)
    const r = await runJob(j, { blender, file: 'jobs/chest-roundtrip.json' });
    out.steps.push({ op: r.op, name: r.name, ok: r.ok, seconds: r.seconds, summary: r.result?.summary, errors: r.errors, log: relG(r.log) });
    check(`blender ${r.op}: ${r.name}`, r.ok, r.result?.summary || r.errors);
    if (!r.ok) throw new Error(`job failed: ${r.name}`);
  }
  const cand = JSON.parse(fs.readFileSync(P('export', `${PROP.name}.candidate.polyprop.json`), 'utf8'));

  // ---------------------------------------------------------------- 3. the candidate in the game
  const res = await page.evaluate(async ({ prop, cand }) => {
    const m = await import('/tools/blender-bridge/game/polyprop.mjs');
    const THREE = await import('three');
    const Pm = await import('/src/game/props.js');
    const G = game, R = { };
    // a clear spot in the developer test yard (the arena), its enemies taken out for this check
    const { enterArena } = await import('/src/game/arena.js');
    enterArena(G); G.enemies.length = 0; for (const e of G._arenaEnemies || []) { e.group && (e.group.visible = false); e.dead = true; }
    G.step(0.2);
    const s = G.room.spawn, spot = { x: s.x, z: s.z - 4 }, gy = G.hero.pos.y;   // (the yard's floor height: where he stands at the spawn)
    R.floorY = +gy.toFixed(3);
    R.spotClear = G.physics.near(spot.x, spot.z).filter((c) => c.enabled && Math.hypot((c.x ?? spot.x) - spot.x, (c.z ?? spot.z) - spot.z) < 2).length;
    // the game's own prop, built as a room builder does (Kit + flush), and the candidate from the file
    const orig = new THREE.Group(); const k = new Pm.Kit(orig); const fp = Pm[prop.builder](k, prop.opts); k.flush();
    const candG = m.buildPolyProp(cand);
    // (in world space, outside the room group whose transform and visibility the room system owns)
    for (const g of [orig, candG]) { g.position.set(spot.x, gy, spot.z); (G.renderer.scene || G.scene).add(g); g.visible = false; g.updateMatrixWorld(true); }
    // per part: size and centre (so a turned or mirrored part shows), and the material object itself
    const partInfo = (g) => g.children.filter((c) => c.isMesh).map((c) => { const b = new THREE.Box3().setFromObject(c); const sz = new THREE.Vector3(), ct = new THREE.Vector3(); b.getSize(sz); b.getCenter(ct);
      return { name: c.name || c.material.uuid.slice(0, 6), mat: c.material.uuid, tris: (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3, verts: c.geometry.attributes.position.count,
        size: sz.toArray().map((x) => +x.toFixed(4)), centre: [ct.x - spot.x, ct.y - gy, ct.z - spot.z].map((x) => +x.toFixed(4)) }; });
    R.orig = partInfo(orig); R.cand = partInfo(candG); R.fp = fp;
    // draw calls and triangles: the same frame with neither, with the original, with the candidate
    const rd = G.renderer.renderer;   // (three's WebGLRenderer; G.renderer.render() draws the game's whole frame, post passes included)
    const h = G.hero; h.pos.set(spot.x - 2.5, gy, spot.z + 2.5);   // (out of the frame) h.sync?.(); G.camRig?.recenter?.(); for (let i = 0; i < 6; i++) G.step(1 / 30);
    // a fixed view of the spot (the follow camera may face elsewhere): three-quarter from the front-right, at eye height
    const cam = G.renderer.camera || G.camera, aim = () => { const wp = new THREE.Vector3(spot.x + 1.25, gy + 1.0, spot.z + 1.5); if (cam.parent) { cam.parent.updateMatrixWorld(true); cam.parent.worldToLocal(wp); } cam.position.copy(wp); cam.lookAt(spot.x, gy + 0.28, spot.z); cam.updateMatrixWorld(true); };   // (the camera may sit in a rig: its position is in the parent's frame; lookAt works in world space)
    const pre0 = G.renderer.pre; G.renderer.pre = () => { pre0?.(); aim(); };   // (the frame's own pre step places the camera: aim after it)
    const frame = (vis) => { orig.visible = vis === 'orig'; candG.visible = vis === 'cand'; aim(); rd.info.autoReset = false; rd.info.reset(); G.renderer.render(); const r = { calls: rd.info.render.calls, triangles: rd.info.render.triangles }; rd.info.autoReset = true; return r; };
    G.renderer.render();
    R.info = { none: frame('none'), orig: frame('orig'), cand: frame('cand') };
    // pixels: the game camera's view of each, compared in the page
    const grab = (vis) => { frame(vis); const c = document.createElement('canvas'); const src = rd.domElement; c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); return { url: c.toDataURL('image/png'), px: x.getImageData(0, 0, c.width, c.height).data }; };
    const a = grab('orig'), b = grab('cand'), n = grab('none');
    let diff = 0, maxd = 0, propPx = 0;
    for (let i = 0; i < a.px.length; i += 4) {
      const d = (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2])) / 3;
      const isProp = Math.abs(a.px[i] - n.px[i]) + Math.abs(a.px[i + 1] - n.px[i + 1]) + Math.abs(a.px[i + 2] - n.px[i + 2]) > 6;
      if (isProp) { propPx++; diff += d; maxd = Math.max(maxd, d); }
    }
    R.pixels = { propPixels: propPx, meanDiffOnProp: +(diff / Math.max(1, propPx)).toFixed(3), maxDiff: maxd };
    R.images = { orig: a.url, cand: b.url };
    // collision: the game's collider for each (as RoomBuilder.put makes it from the footprint), then walk into it
    const colOf = (f) => G.physics.add(f.r ? { type: 'cyl', x: spot.x, z: spot.z, r: f.r, top: f.top, noStand: true } : { type: 'box', x: spot.x, z: spot.z, hw: f.hw, hd: f.hd, rot: 0, top: f.top, noStand: true });
    G.renderer.pre = pre0;
    const walk = (fromX, fromZ, dx, dz) => { h.pos.set(fromX, gy, fromZ); h.vel?.set?.(0, 0, 0); for (let i = 0; i < 90; i++) G.physics.move(h, dx * 0.03, dz * 0.03); return { x: +(h.pos.x - spot.x).toFixed(3), z: +(h.pos.z - spot.z).toFixed(3) }; };
    const walks = {};
    for (const [label, f] of [['orig', fp], ['cand', cand.footprint]]) {
      const c = colOf(f);
      walks[label] = { fromFront: walk(spot.x, spot.z + 1.6, 0, -1), fromSide: walk(spot.x + 1.6, spot.z, -1, 0) };
      c.enabled = false;
    }
    R.walks = walks;
    orig.removeFromParent(); candG.removeFromParent();
    return R;
  }, { prop: PROP, cand });

  fs.mkdirSync(P('previews', 'game'), { recursive: true });
  for (const [k, u] of Object.entries(res.images)) fs.writeFileSync(P('previews', 'game', `in-game-${k}${GPU ? '-gpu' : ''}.png`), Buffer.from(u.split(',')[1], 'base64'));
  delete res.images;
  out.game = res;
  check('test spot clear of other colliders', res.spotClear === 0, res.spotClear);
  check('same number of parts (draw calls) as the original', res.orig.length === res.cand.length, [res.orig.length, res.cand.length]);
  const byMat = new Map(res.orig.map((p) => [p.mat, p]));
  for (const c of res.cand) {
    const o = byMat.get(c.mat);
    check(`part ${c.name}: the same cached game material as the original`, !!o, c.mat);
    if (!o) continue;
    const ds = Math.max(...c.size.map((v, i) => Math.abs(v - o.size[i]))), dc = Math.max(...c.centre.map((v, i) => Math.abs(v - o.centre[i])));
    check(`part ${c.name}: size and place (orientation) match within 1 mm`, ds < 0.001 && dc < 0.001, { size: c.size, orig: o.size, centreDiff: +dc.toFixed(5) });
    check(`part ${c.name}: triangles unchanged`, c.tris === o.tris, [o.tris, c.tris]);
  }
  check('draw calls in the game: candidate = original', res.info.cand.calls === res.info.orig.calls, res.info);
  check('triangles drawn in the game: candidate = original', res.info.cand.triangles === res.info.orig.triangles, res.info);
  check('looks the same from the game camera (mean pixel difference on the prop < 2/255)', res.pixels.propPixels > 8000 && res.pixels.meanDiffOnProp < 2, res.pixels);
  const w = res.walks;
  check('collision: he stops at the same place, from the front and from the side', Math.abs(w.orig.fromFront.z - w.cand.fromFront.z) < 0.01 && Math.abs(w.orig.fromSide.x - w.cand.fromSide.x) < 0.01 && w.cand.fromFront.z > 0.2 && w.cand.fromSide.x > 0.3, w);
  check('no page errors', game.errors.length === 0, game.errors.slice(0, 3));
} catch (err) {
  check('round trip ran to the end', false, err.message);
} finally {
  await game.close();
}
out.passed = out.checks.every((c) => c.ok);
fs.mkdirSync(P('reports'), { recursive: true });
fs.writeFileSync(P('reports', `roundtrip${GPU ? '-gpu' : ''}.json`), JSON.stringify(out, null, 2));
log(out.passed ? 'ALL PASSED' : 'FAILED', '->', relG(P('reports', `roundtrip${GPU ? '-gpu' : ''}.json`)));
process.exit(out.passed ? 0 : 1);
