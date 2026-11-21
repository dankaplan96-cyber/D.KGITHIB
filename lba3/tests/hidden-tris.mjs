// HIDDEN-TRIS (P85, the user on 20.11: "check whether there are hidden triangles in a small part of the game, to see
// whether it weighs on the game"). A diagnostic, not a regression test: docs/lba3-performance/HIDDEN-TRIS.md.
// Citadel from Twinsen's yard up the lane to the square with the well: Twinsen put at 18 points of the walk, 4
// headings each, the Follow camera (Medium distance), Medium quality, 1280x720.
//   A  the game as shipped (draw batches on): draws and triangles per pass, render time (before)
//   B  draw batches off: which meshes the main pass submits in each view (the batches hide the sources)
//   ID every triangle of those meshes rendered with its own id from each view's camera (only the meshes that view
//      submitted), at 2x the canvas: a triangle that covers no pixel in any view is "never seen"; classified, named
//   C  prototype, per cut (MODES=geo,all): the never-seen triangles cut from the index buffers ('geo': only those buried,
//      under or inside a solid, or a bottom on the ground — what a build-time fix could drop; 'all': every one never
//      seen — the upper bound of any culling), batches rebuilt: the same views; a BatchedMesh's get degenerate
//   D  per cut, draw batches off, per view: the picture with and without the cut (pixels that differ)
//   E  the originals back, batches rebuilt: the same views again (drift check against A)
// Env: GAME_URL, MODES, NVIEWS (first n views: a smoke run), OUT (json, default
// docs/lba3-performance/results/hidden-tris.json), SHOTS (default captures/hidden-tris), ROOM=house (the interior instead)
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const lib = (f) => fileURLToPath(new URL('./lib/' + f, import.meta.url));
const OUT = process.env.OUT || 'docs/lba3-performance/results/hidden-tris' + (process.env.ROOM ? '-' + process.env.ROOM : '') + '.json';
const SHOTS = process.env.SHOTS || 'captures/hidden-tris';
const { browser, page } = await launch({ width: 1280, height: 720 });
page.setDefaultTimeout(7200000);
await page.addInitScript({ path: lib('placerec.js') });
await page.addInitScript(() => { globalThis.__PLACE_REC.kitSites = true; });
await page.route('**/vendor/three/build/three.module.min.js', async (route) => {
  const res = await route.fetch(), body = await res.text();
  await route.fulfill({ response: res, body: body + "\nimport * as __PLACE_T from './three.module.min.js'; globalThis.__PLACE_REC?.three?.(__PLACE_T);\n" });
});
const ev = (f, a) => page.evaluate(f, a);
const t0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: lib('camwalk.js') });
await page.addScriptTag({ path: lib('hiddentris.js') });
log('setup', JSON.stringify(await ev(() => { const r = CW.setup(); game.settings.quality = 'medium'; game.applySettings(); __PLACE_REC.off = true; return { ...r, q: game.settings.quality, dpr: game.renderer.renderer.getPixelRatio(), canvas: [game.renderer.renderer.getContext().drawingBufferWidth, game.renderer.renderer.getContext().drawingBufferHeight] }; })));

// BURIED=1 (BURIED_ONLY=1: and stop): what a build-time trim of the shared vegetation geometries could drop (HT.buriedAll), then stop
if (process.env.BURIED_ONLY || process.env.BURIED) {
  const B = await ev(() => HT.buriedAll());
  for (const b of B) console.log('BURIED', JSON.stringify(b));
  fs.mkdirSync('docs/lba3-performance/results', { recursive: true });
  fs.writeFileSync('docs/lba3-performance/results/hidden-tris-buried.json', JSON.stringify(B, null, 1));
  if (process.env.BURIED_ONLY) { done(); await browser.close(); process.exit(0); }
}
// the walk's points (tests/hidden-tris.mjs's first run: P.go from the yard to the well, 1 s apart), and the yard's sides
const PTS = process.env.ROOM ? null : [
  ['yard-door', -46.1, 74.2], ['yard-west', -52, 79], ['garden', -58, 84], ['yard-east', -39, 74],
  ['lane-1', -44.4, 66.2], ['lane-gate', -40.9, 62.1], ['lane-2', -40.3, 56.1], ['lane-3', -40.1, 50.1], ['lane-4', -40.7, 44],
  ['lane-5', -41.4, 38.1], ['lane-6', -40.6, 32.1], ['lane-7', -40.5, 25.9], ['lane-8', -40.8, 19.7], ['south-lane', -41.9, 13.6],
  ['south-lane-2', -42.2, 7.4], ['square-south', -42.4, 1.2], ['square-west', -45.5, -7.5], ['square-east', -38.5, -3],
];
const HEAD = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
// (SwiftShader draws a frame in seconds here: one heading per point is timed — a different one at each point — the
//  counts are taken in every view)
const timed = (i) => i % 4 === Math.floor(i / 4) % 4;
let views = [];
if (PTS) for (const [name, x, z] of PTS) for (const a of HEAD) views.push({ name: `${name}@${Math.round((a * 180) / Math.PI)}`, x, z, a });
else {
  // the house: the room's own camera; points in the room's frame (its centre)
  const pts = [['spawn', 0, 0], ['a', 2.5, -2.5], ['b', -2.5, -2.5], ['c', 2.5, 2.5], ['d', -2.5, 2.5]];
  for (const [name, x, z] of pts) for (const a of HEAD) views.push({ name: `${name}@${Math.round((a * 180) / Math.PI)}`, x, z, a, room: process.env.ROOM });
}
if (process.env.NVIEWS) views = views.slice(0, +process.env.NVIEWS);
// place Twinsen (and the camera behind him), settled 1 s; a point he can't stand on is skipped
const place = (v) => ev((v) => {
  const G = game, P = G.physics;
  if (v.room) {
    if (G.room?.id !== v.room) { CW.place({ room: v.room }); }
    const R = G.room, x = R.spawn.x + v.x, z = R.spawn.z + v.z, h = G.hero, y = P.groundAt(x, z, R.spawn.y ?? h.pos.y + 1);
    if (P.blockedAt(x, z, y + 0.3, 0.3)) return { skip: 'blocked' };
    h.pos.set(x, y, z); h.angle = v.a; h.resetMotion(); h.vy = 0; h.onGround = true; G.camRig.snap?.();
    for (let t = 0; t < 1; t += 1 / 60) G.frame(1 / 60, false);
  } else {
    const g = P.groundAt(v.x, v.z);
    if (P.blockedAt(v.x, v.z, g + 0.3, 0.3)) return { skip: 'blocked' };
    CW.place({ x: v.x, z: v.z, a: v.a });
  }
  return { cam: HT.camRec(), room: G.room?.id || 'citadel' };
}, v);

const dist = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
const placeSame = async (v) => { let p = await place(v), d = dist(p.cam, v.cam); for (let k = 0; k < 2 && d > 0.05; k++) { p = await place(v); d = dist(p.cam, v.cam); } return +d.toFixed(3); };
const result = { when: new Date().toISOString(), views: [], notes: [] };
// ---- A: as shipped
log('A: as shipped, batches on');
const A = [];
for (const [i, v] of views.entries()) {
  v.timed = timed(i);
  const p = await place(v);
  if (p.skip) { log('skip', v.name, p.skip); v.skip = true; continue; }
  v.cam = p.cam;
  const r = await ev((tm) => { const c = HT.count().c; const t = tm ? HT.time(3, 1) : null; return { c, t }; }, v.timed);
  A.push({ name: v.name, ...r });
}
views = views.filter((v) => !v.skip);
log('A done', views.length, 'views');
fs.mkdirSync(SHOTS, { recursive: true });

// ---- B: batches off, the submitted meshes per view
log('B: batches off');
log('batch meshes left', await ev(() => { HT.views = []; return HT.batches(false); }));
const B = [];
for (const [i, v] of views.entries()) {
  await placeSame(v);
  const r = await ev(({ i, cam0 }) => {
    const { c, objs } = HT.count(true); const cam = HT.camRec();
    const dp = Math.hypot(cam.pos[0] - cam0.pos[0], cam.pos[1] - cam0.pos[1], cam.pos[2] - cam0.pos[2]);
    HT.views[i] = { cam, objs: [...objs] };
    return { c, dp: +dp.toFixed(3) };
  }, { i, cam0: v.cam });
  B.push({ name: v.name, ...r });
}
check('the camera stands where it stood with the batches on (same placement, within 5 cm)', B.every((b) => b.dp < 0.05), B.filter((b) => b.dp >= 0.05).map((b) => b.name + ' ' + b.dp));

// ---- ID: the soup and the id passes
log('ID: building the soup');
const soup = await ev(() => { const all = new Set(); for (const v of HT.views) for (const o of v.objs) all.add(o); return HT.build(all); });
result.moving = await ev(() => HT.movingReport());
log('moving (not judged)', JSON.stringify(result.moving));
log('soup', JSON.stringify(soup));
for (let i = 0; i < views.length; i++) {
  const r = await ev((i) => HT.idPass(HT.views[i]), i);
  if (i % 8 === 0) log('id pass', i, views[i].name, JSON.stringify(r));
}
log('analysis');
const AN = await ev(() => { const xs = HT.views.map((v) => v.cam.pos[0]), zs = HT.views.map((v) => v.cam.pos[2]); return HT.analyse(HT.views, [Math.min(...xs) - 120, Math.min(...zs) - 120, Math.max(...xs) + 120, Math.max(...zs) + 120]); });
result.soup = soup; result.analysis = AN;
log('totals', JSON.stringify(AN.totals));

// x-ray pictures: the view in grey, the never-seen triangles of the view-independent causes drawn through it
for (const [i, v] of views.entries()) if (i % (+process.env.XRAY_EVERY || 12) === 0) {
  const url = await ev((i) => HT.xray(HT.views[i]), i);
  fs.writeFileSync(`${SHOTS}/xray-${v.name.replace('@', '_')}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
// ---- C (per cut): the cut, batches rebuilt; D: the pictures, batches off, without and with it
const MODES = (process.env.MODES || 'geo,all').split(',').filter((m) => m && m !== 'none');
const avg = (L, f) => L.reduce((s, x) => s + f(x), 0) / L.length;
const sum = (L) => ({ calls: +avg(L, (x) => x.c.main).toFixed(1), tris: Math.round(avg(L, (x) => x.c.tmain)), shCalls: +avg(L, (x) => x.c.shadow).toFixed(1), shTris: Math.round(avg(L, (x) => x.c.tshadow)), ms: L.some((x) => x.t) ? +avg(L.filter((x) => x.t), (x) => x.t.med).toFixed(1) : null });
const measure = async () => { const out = []; for (const v of views) { const dp = await placeSame(v); out.push({ name: v.name, dp, ...(await ev((tm) => ({ c: HT.count().c, t: tm ? HT.time(3, 1) : null }), v.timed)) }); } return out; };
result.cuts = {};
for (const mode of MODES) {
  const trim = await ev((m) => { HT.applyTrim(false); return HT.trim(m); }, mode);
  log('trim', JSON.stringify(trim));
  await ev(() => { HT.applyTrim(true); HT.rebuild(); });
  log('C: cut', mode, 'batches on');
  const C = await measure();
  await ev(() => { HT.applyTrim(false); HT.batches(false); });
  log('D: pictures', mode);
  const D = [];
  for (const [i, v] of views.entries()) {
    const dp = await placeSame(v);
    const r = await ev(() => { HT.applyTrim(false); const a = HT.pixels(); HT.applyTrim(true); const b = HT.pixels(); HT.applyTrim(false); const d = HT.diff(a, b); if (d.share > 0.005) d.img = HT.diffImage(a, b); return d; });
    if (r.img) { if (D.filter((x) => x.saved).length < 4) { fs.writeFileSync(`${SHOTS}/diff-${mode}-${v.name.replace('@', '_')}.png`, Buffer.from(r.img.split(',')[1], 'base64')); r.saved = true; } delete r.img; }
    D.push({ name: v.name, dp, ...r });
  }
  await ev(() => { HT.applyTrim(false); return HT.batches(true); });
  result.cuts[mode] = { trim, C: sum(C), diff: { maxShare: Math.max(...D.map((d) => d.share)), avgShare: avg(D, (d) => d.share), maxPx: Math.max(...D.map((d) => d.n)) }, views: views.map((v, i) => ({ name: v.name, C: C[i], D: D[i] })) };
  log('cut', mode, JSON.stringify({ C: result.cuts[mode].C, diff: result.cuts[mode].diff }));
}
// ---- E: back as before, batches rebuilt (the drift since A)
await ev(() => { HT.applyTrim(false); HT.rebuild(); });
log('E: originals, batches on');
const E = await measure();
for (const [i, v] of views.entries()) if (i % 12 === 0) { await place(v); await ev(() => HT.draw()); await page.screenshot({ path: `${SHOTS}/view-${v.name.replace('@', '_')}.jpg`, type: 'jpeg', quality: 80 }); }

// ---- summary
result.summary = { A: sum(A), B: sum(B), E: sum(E), cuts: Object.fromEntries(Object.entries(result.cuts).map(([k, c]) => [k, { C: c.C, diff: c.diff, trim: c.trim }])) };
const pv = AN.perView;
result.summary.perView = { tris: Math.round(avg(pv, (x) => x.tris)), hid: Math.round(avg(pv, (x) => x.hid)), share: +avg(pv, (x) => x.hid / Math.max(1, x.tris)).toFixed(4), draws: +avg(pv, (x) => x.draws).toFixed(1), hidDraws: +avg(pv, (x) => x.hidDraws).toFixed(1), dbl: Math.round(avg(pv, (x) => x.dbl)), dblBackInF: Math.round(avg(pv, (x) => x.dblBackInF)), byClass: AN.classes.map((k, i) => [k, Math.round(avg(pv, (x) => x.hc[i]))]), pxAll: Math.round(avg(pv, (x) => x.pxAll || 0)), pxByClass: AN.classes.map((k, i) => [k, Math.round(avg(pv, (x) => x.px?.[i] || 0))]) };
result.views = views.map((v, i) => ({ name: v.name, A: A[i], B: B[i], E: E[i], pv: pv[i] }));
fs.mkdirSync(OUT.replace(/\/[^/]*$/, ''), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
log('summary', JSON.stringify(result.summary, null, 1));
log('top sources'); for (const s of AN.sources.slice(0, 30)) console.log('  ', s.label, 'hidden/view', Math.round(s.hidW / views.length), 'of', Math.round(s.triW / views.length), JSON.stringify(s.cls));
for (const [k, c] of Object.entries(result.cuts)) check(`cut "${k}": the pictures as they were (≤ 1 % of pixels differ in every view; slivers under the id pass's samples)`, c.diff.maxShare <= 0.01, c.diff);
done();
await browser.close();
