// ZFIGHT: z-fighting (two surfaces drawn on one another, the user's "flickering stones") seen from the play camera,
// measured on the game's real scene, materials and cameras (the method: tests/lib/zfight.js's header).
// For each spot — Twinsen placed there, the play camera settled on him (Follow at Medium outdoors; a room's own iso
// view indoors) — the ID passes are rendered and every pair of meshes that fights over pixels is listed with its
// pixels, the gap between the two surfaces, where it is and who built each mesh. Spots: a STEP m grid over each
// outdoor area's walkable ground (one view toward the area's middle, HEADINGS=2 adds the opposite one), named spots
// of Citadel (both ways along the street), and each interior's spawn and floor boxes.
//   AREAS=citadel,desert,hamalayi,zeelich,isle_*,rooms,<room id>…   (default: everything; `rooms`: every interior)
//   STEP=20  HEADINGS=1  K=4 (steps of the 24-bit depth buffer under which two surfaces count as fighting)
//   OUT=<file.json>  every spot's findings and the ranking (default zfight-report.json in the current directory)
//   TRACE=1  name each mesh's builder (the stack of the add() that put it in the scene; merge.js / props.js Kit parts)
//   SHOTS=<dir> a picture of each of the top findings (the real frame at that spot, the place marked)
//   LIMIT=<px> FAIL any pair with more fighting core pixels than this at one spot (default: none; the run only reports)
//   ISO_NEAR=<m> scan the rooms' iso views with this near plane (an A/B of the view's depth precision)
//   NAMED=1 only Citadel's named spots   GAPM=0.001 (m: nearer than this along the view also counts, see zfight.js)
// GAME_URL / BOOT_TIMEOUT as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { checkVisual, check, done } = checker();
const ENV = process.env, STEP = +(ENV.STEP || 20), HEADINGS = +(ENV.HEADINGS || 1), K = +(ENV.K || 4), LIMIT = ENV.LIMIT ? +ENV.LIMIT : null;
const OUT = ENV.OUT || 'zfight-report.json', SHOTS = ENV.SHOTS, TRACE = !!ENV.TRACE;

let browser, context, page;
if (ENV.ATTACH) {
  // (ATTACH=<http://host:port>: a game already booted in a browser with remote debugging, e.g. for a series of sweeps)
  const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
  browser = await chromium.connectOverCDP(ENV.ATTACH); context = browser.contexts()[0]; page = context.pages()[0];
} else {
  ({ browser, context, page } = await launch({ width: 640, height: 360 }));
  if (TRACE) {
    await context.addInitScript(() => { Error.stackTraceLimit = 30; window.__zfTrace = 1; });
    const snippet = fs.readFileSync(path.join(HERE, 'lib/zfight-trace.js'), 'utf8');
    await page.route('**/vendor/three/build/three.core.min.js', async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, body: (await r.text()) + snippet, headers: { ...r.headers(), 'content-type': 'text/javascript' } });
    });
  }
  await open(page, '?nocine&allregions');
  await menu(page, 'new');
  await page.evaluate(() => { const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
}
await page.addScriptTag({ path: path.join(HERE, 'lib/zfight.js') });
await page.evaluate(() => ZF.init(640, 360));

// Citadel's named spots: [name, x, z, facing] (facing: 0 = +z, π/2 = +x; each is also looked at the other way)
const PI = Math.PI;
const NAMED = [
  ['square', -42, -4, 0], ['start', -38, 4, PI], ['harbour', -113.5, 44, -PI / 2], ['quay', -100, 40, PI / 2], ['lighthouse', -104, 88, -PI / 2],
  ['fort west gate', -46, -65.6, PI / 2], ['fort yard', -30, -65, PI / 2], ['asylum door', -14, -65, PI / 2], ['depot', -86, -76, -PI / 2], ['camp', -76, -68, PI],
  ['climb ramp', -37, -20, PI * 0.9], ['climb ramp top', -34, -36, PI], ['asylum steps', -33, -37.2, PI * 0.95], ['terrace', -26, -47, PI / 2],
  ['twinsen door', -44.5, 76, 0], ['bay sand', -70, 88, -PI / 2], ['plateau', -56, -40, PI], ['stones start', -66, -20, PI],
  ['bug street', -56, -12, PI], ['promenade', -66, -4.5, -PI / 2], ['west street', -60, 33, -PI / 2], ['baggage', -90, 38, -PI / 2], ['fields', -46, 40, 0], ['station', -45, -60, PI / 2],
];

const areasWanted = (ENV.AREAS || 'citadel,zeelich,desert,hamalayi,isle_*,rooms').split(',');
const all = await page.evaluate(() => Object.entries(game.rooms).map(([id, R]) => ({ id, outdoor: !!R.outdoor })));
const areas = [];
for (const w of areasWanted) {
  if (w === 'citadel') areas.push('citadel');
  else if (w === 'rooms') areas.push(...all.filter((a) => !a.outdoor).map((a) => a.id));
  else if (w.endsWith('*')) areas.push(...all.filter((a) => a.id.startsWith(w.slice(0, -1))).map((a) => a.id));
  else areas.push(w);
}

const spots = [];
for (const id of areas) {
  if (id === 'citadel') for (const [name, x, z, a] of NAMED) { spots.push({ area: id, x, z, a, tag: name }); spots.push({ area: id, x, z, a: a + PI, tag: name + ' (back)' }); }
  if (ENV.NAMED) continue;
  const S = await page.evaluate(([id, step]) => {
    const R = id === 'citadel' ? null : game.rooms[id];
    if (R && R.outdoor && game.room?.id !== id) game.enterRoom(id, null, true, true);   // (its walkable ground needs it active)
    return ZF.spots(id, step);
  }, [id, STEP]);
  // outdoors: face the area's middle (and the other way with HEADINGS=2)
  const mx = S.reduce((s, p) => s + p.x, 0) / Math.max(1, S.length), mz = S.reduce((s, p) => s + p.z, 0) / Math.max(1, S.length);
  for (const s of S) {
    if (s.iso) { spots.push(s); continue; }
    const a = Math.atan2(mx - s.x, mz - s.z);
    spots.push({ ...s, a });
    if (HEADINGS > 1) spots.push({ ...s, a: a + PI, tag: s.tag + ' (back)' });
  }
}
console.log(`${spots.length} spots in ${areas.length} areas`);

const results = [];
const t0 = Date.now();
for (const [i, s] of spots.entries()) {
  const r = await page.evaluate(([s, K, gapM, near]) => { const at = ZF.place(s); const f = ZF.scan({ K, gapM, top: 10, near: s.iso ? near : 0 }); return { at, f }; }, [s, K, +(ENV.GAPM || 0.001), +(ENV.ISO_NEAR || 0)]).catch((e) => ({ err: String(e.message).slice(0, 300) }));
  results.push({ spot: s, ...r });
  if (r.err) console.log('spot error', s.area, s.tag, r.err);
  else if (LIMIT != null) for (const q of r.f.top) checkVisual(`${s.area} ${s.tag} (${s.x}, ${s.z}): ${q.a.path} × ${q.b === 'self' ? 'itself' : q.b.path}`, q.fcore <= LIMIT, { fcore: q.fcore, core: q.core, at: q.at, gapEst: q.gapEst });
  if (i % 10 === 9) { console.log(`… ${i + 1}/${spots.length} (${Math.round((Date.now() - t0) / 1000)} s)`); fs.writeFileSync(OUT, JSON.stringify({ partial: true, results }, null, 0)); }
}

// ranking: each pair of meshes over all spots, by its fighting core pixels summed (a patch seen fighting at the play
// camera), then its flagged core pixels (fighting or within GAPM), then pixels
const rank = new Map();
for (const R of results) for (const q of R.f?.top || []) {
  const key = [q.keyA, q.keyB].sort().join('|');
  let e = rank.get(key);
  if (!e) rank.set(key, (e = { key, fcore: 0, fight: 0, core: 0, px: 0, spots: 0, best: null, where: R.spot }));
  e.fcore += q.fcore ?? 0; e.fight += q.fight ?? 0; e.core += q.core; e.px += q.px; e.spots++;
  if (!e.best || (q.fcore ?? 0) > (e.best.fcore ?? 0) || ((q.fcore ?? 0) === (e.best.fcore ?? 0) && q.core > e.best.core)) { e.best = q; e.where = R.spot; }
}
const ranked = [...rank.values()].sort((u, v) => v.fcore - u.fcore || v.core - u.core || v.px - u.px);
const fc = results.reduce((s, R) => s + (R.f?.fcore || 0), 0), tot = results.reduce((s, R) => s + (R.f?.core || 0), 0), totPx = results.reduce((s, R) => s + (R.f?.flagged || 0), 0), drawn = results.reduce((s, R) => s + (R.f?.drawn || 0), 0);
fs.writeFileSync(OUT, JSON.stringify({ K, step: STEP, spots: spots.length, total: { fcore: fc, core: tot, flagged: totPx, drawn }, ranked, results }, null, 0));
console.log(`spots ${spots.length}; fighting core pixels ${fc}; flagged pixels ${totPx} (core ${tot}) of ${drawn} drawn; ${ranked.length} mesh pairs`);
const nm = (d) => (d === 'self' ? '(itself)' : `${d.area}:${d.part?.src?.[0] || d.src?.[0] || d.path}${d.inst != null ? '#' + d.inst : ''}`);
for (const [i, e] of ranked.slice(0, 25).entries()) {
  const q = e.best;
  console.log(`${String(i + 1).padStart(2)}. fight core ${e.fcore} (px ${e.fight}), overlap core ${e.core} px ${e.px} at ${e.spots} spot(s); best ${q.core} at ${q.at ? q.at.join(',') : '?'} (${e.where.area} ${e.where.tag}), dist ${q.dist} m, gap≈${q.gapEst} m (${q.stepsMed} steps; ray ${q.gapRay}, normal ${q.gapN}, angle ${q.angle}°)`);
  console.log(`    ${nm(q.a)}  ×  ${nm(q.b)}`);
}

// pictures of the top findings: the real frame at the spot, the pixel marked
if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [i, e] of ranked.slice(0, +(ENV.NSHOTS || 12)).entries()) {
    await page.evaluate((s) => { ZF.place(s); for (let k = 0; k < 3; k++) game.frame(1 / 60, true); }, e.where);
    const [x, y] = e.best.pixel, f = path.join(SHOTS, `zf-${String(i + 1).padStart(2, '0')}-${e.where.area}-${e.where.tag.replace(/[^a-z0-9]+/gi, '_')}.png`);
    await page.screenshot({ path: f, clip: { x: Math.max(0, Math.min(640 - 240, x - 120)), y: Math.max(0, Math.min(360 - 150, y - 75)), width: 240, height: 150 } });
  }
}
check('every spot scanned', results.every((R) => !R.err), results.filter((R) => R.err).slice(0, 3).map((R) => R.spot.tag + ': ' + R.err));
if (!ENV.ATTACH) await browser.close();
done();
process.exit();
