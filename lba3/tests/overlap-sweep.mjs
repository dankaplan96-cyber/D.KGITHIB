// OVERLAP-SWEEP (the user, 17.11, P65: "again things overlapping — go over the whole game and check", a picture of Mill
// Lane Steps' ferry stage on Zeelich, its planks running on into the ground). One sweep over every area and room, by
// machine, in five categories (docs/lba-maturity/OVERLAP-SWEEP.md has the findings, the fixes and what is left):
//   (a) pieces through each other   tests/lib/sweep.js: the drawn parts as solids along vertical rays, a free piece (an
//                                   instance or a lone mesh under 3 m) inside another object's part by > 2 cm;
//                                   + place-scan's `inside` and `wall` (the Kit's pieces as boxes, PLACE=1)
//   (b) coplanar surfaces fighting  sweep.js: two different surfaces facing up within 3 mm on ≥ 4 rays (0.25 m²), the
//                                   ground among them; + worldfit's triangle pairs ≥ 0.15 m² (walls too, WORLDFIT=1)
//   (c) sunk or floating            sweep.js: a cluster of touching parts with a gap of 2 cm … 1 m under its lowest point
//                                   (nothing under it), a small one (< 2.5 m) wholly 5 cm or more in the ground;
//                                   + worldfit's buildings (gap under the plinth, ground over it) + place-scan's float/sunk
//   (d) decks, steps, paths into the ground   sweep.js: a part's flat top under the ground (or flush with it) on some rays
//                                   and above it on others, ≥ 0.12 m² of it
//   (e) ground patches on paving    sweep.js: foliage (grass, flowers, tulips) standing on a part's flat top that is not
//                                   the ground, or on terrain painted as cobbles; a see-through decal lying on a part;
//                                   (d) findings where the ground over a paving part is painted grass / dirt / sand
// Every finding that is not on KNOWN (below: by design, each with its reason) FAILS. The counts per area and category
// are printed (COUNTS lines) and kept in REPORT=<file.json>.
// Env: OUT=<dir> keeps each area's raw result (a rerun skips the areas already there: RESUME=1); ONLY=a,b the areas;
// PLACE=1 / WORLDFIT=1 add the two older scans (child runs, their REPORT read back); SHOTS=<dir> pictures of failing
// findings (the game camera near, from above). GAME_URL, BOOT_TIMEOUT as the other tests.
// Run: BOOT_TIMEOUT=900000 GAME_URL=http://localhost:8123/ node tests/overlap-sweep.mjs   (~25 min quiet; Automated runtime only)
import { launch, open, menu, checker, report } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker();
const LIB = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'sweep-'));
fs.mkdirSync(OUT, { recursive: true });

// the browsers: one per batch (every area of a batch built in it); a crash is retried once
const BATCHES = [
  ['citadel', 'house', 'well', 'office', 'projoffice', 'control', 'lighttop', 'cellar', 'tavern', 'tavcellar', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse',
    'nellhouse', 'pumproom', 'baggage', 'tralucave', 'terminal', 'sewer', 'sewervault', 'sewerglobe', 'wtent', 'school', 'asylum', 'bumaze', 'arena'],
  ['zeelich', 'workshop', 'upper', 'council', 'archive', 'zterminal', 'zh_*', 'valves', 'otrbar', 'otrhotel', 'celtemple'],
  ['isle_*', 'ih_*'],
  ['desert', 'condA', 'condB', 'butemple', 'hamalayi', 'obsv', 'ham_*', 'c3shaft', 'c3deep', 'c3gallery', 'c3sendell', 'c3core'],
  ['ballastra', 'bl_shed', 'bl_arches', 'bl_oren', 'bl_mags', 'bl_pump', 'bl_gardens', 'bl_tunnel', 'bl_kiln'],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const CITADEL = { x0: -206, x1: 54, z0: -114, z1: 146 };
const OUTDOOR = /^(citadel|zeelich|isle_.*|desert|hamalayi|ballastra|bl_arches|bl_gardens)$/;

// ------------------------------------------------------------------ KNOWN: measured, looked at, left by design
// [area, category, test (a RegExp on the finding's text) | null, near [x, z] | null, radius, why]
const ROCKS = /cliffRocks|plateauStones|smallPool|rimRock|rock|boulder|scree|pebble/i;
const KNOWN = [
  // rocks: set into the ground by design (a rock's foot is buried, its top shows: scatter in vegetation.js / world.js)
  ['*', 'c', ROCKS, null, 0, 'by design: rocks are set into the ground (their foot buried), not standing pieces'],
  ['*', 'd', ROCKS, null, 0, 'by design: a rock\'s flat facet under the ground beside its top: set into the ground'],
  ['*', 'c', /gull|bird/i, null, 0, 'not a placed piece: birds perched or flying (they move between frames)'],
  ['*', 'c', /foam|ripple/i, null, 0, 'by design: foam and ripples lie on the water\'s surface'],
  ['*', 'c', /over [^|]*(cloud sea|water)/, null, 0, 'by design: piles and posts end in the cloud sea or the water (nothing under them is seen)'],
  ['*', 'c', /bl_floating|marketFloat/, null, 0, 'by design: the Float Harbor\'s floating beds and market rafts ride on the water (Ballastra)'],
  // Citadel (chapters 1–2): looked at (captures/overlap-sweep/) or measured and left
  ['citadel', 'a', /asylum-front/, [-26.3, -51.4], 2.5, 'low: two merlons of the fort wall\'s crenellation stand inside the Workers\' Hostel front\'s roof, built against that wall (asylumhostel.js); the roof hides them'],
  ['citadel', 'd', /old-door-passage/, null, 0, 'by design: the old passage\'s stone vault runs into the hillside (its way in)'],
  ['citadel', 'd', /old-door-plateau-stair/, null, 0, 'by design: the old stair\'s top tread meets the plateau\'s slope'],
  ['citadel', 'e', /sewerhatch/, null, 0, 'by design: the sewer hatch\'s frame is set flush in the terrace\'s ground'],
  ['citadel', 'd', /statue/, [-44.7, -11.1], 2, 'low (9 cm): the statue\'s lowest step is set into the square\'s slope on its uphill side (looked at)'],
  ['citadel', 'c', /pipeline/, null, 0, 'by design: the project\'s pipeline goes into the ground by the station'],
  ['citadel', 'd', /pipeline/, null, 0, 'by design: the project\'s pipeline goes into the ground by the station'],
  ['citadel', 'c', /dressing/, [-27.2, -8.1], 1.5, 'looked at: the post stands on its feet on the ground; the feet are thinner than the rays\' spacing (the gap is to its board)'],
  // LBA1's rooms are the original's brick cells drawn as open faces (lba1room.js): their upper storeys ('lid' meshes) and
  // overhangs read as clusters over the floor below; place-scan does not measure them either
  ['asylum', 'c', /lid:|Buffer<Group /, null, 0, 'not measurable: LBA1\'s brick cells drawn as open faces (lba1room.js); the upper storeys and overhangs are not standing pieces'],
  ['asylum', 'b', /lid:/, null, 0, 'low (0.16 m², under 0.4 mm): two of LBA1\'s upper-storey faces in one plane, under the cut-away lids (lba1room.js)'],
  // the harbour's paving and what stands on it: the AUDIT-FIX worker's (world.js HARBOUR_*), not touched here
  ['citadel', 'c', /harbour/, [-110, 44], 20, 'AUDIT-FIX: on the harbour\'s paving, which the AUDIT-FIX worker is fixing (world.js HARBOUR_*); not touched here'],
  ['citadel', 'd', /harbour/, [-105, 44], 22, 'AUDIT-FIX: the harbour\'s paving under the ground, which the AUDIT-FIX worker is fixing (world.js HARBOUR_*); not touched here'],
];
const knownOf = (area, cat, f) => KNOWN.find(([a, c, re, near, r]) => (a === area || a === '*') && c === cat && (!re || re.test(f.text)) && (!near || Math.hypot(f.x - near[0], f.z - near[1]) < (r || 1)));

// ------------------------------------------------------------------ the findings of one area's scan
const nm = (D, oi) => { const d = D[oi]; if (!d) return '?'; if (d.terrain) return 'the ground (terrain)';
  if (d.geo === 'PlaneGeometry' && d.box && d.box[3] - d.box[0] > 100) return 'the cloud sea (' + d.path.split('<')[0] + ')';
  if (/water|river|sea\b|pond|lake|pool(?!<)/i.test(d.path) && !/smallPool/.test(d.path)) return 'the water (' + d.path.split('<').slice(0, 2).join('<') + ')'; return d.path.split('<').slice(0, 3).join('<') + (d.ins >= 0 ? '#' + d.ins : '') + (d.tex ? ' [' + d.tex + ']' : '') + (d.color ? ' #' + d.color : ''); };
function findingsOf(r) {
  const F = [], a = r.id, D = r.D;
  for (const s of r.zf) {
    if (s.gap > 0.0015 || s.n < 4 || (s.la.hex === s.lb.hex && s.la.tex === s.lb.tex) || s.seen < 2) continue;
    F.push({ area: a, cat: 'b', kind: 'coplanar', x: s.x, z: s.z, y: s.y, size: s.m2 + ' m²', text: `${nm(D, s.A)} | ${nm(D, s.B)} within ${(s.gap * 1000).toFixed(1)} mm (${s.n} rays, ${s.seen} in sight)`, raw: s });
  }
  for (const s of r.interp) {
    if (s.n < 3 || s.d < 0.08 || s.frac < 0.2 || s.v < 0.002) continue;
    const la = D[s.A], lb = D[s.B]; if (la && lb && la.tex === lb.tex && la.color === lb.color) continue;   // (one look: they read as one solid, no seam)
    F.push({ area: a, cat: 'a', kind: 'through', x: s.x, z: s.z, y: s.y, size: `${Math.round(s.frac * 100)} % of it in, ${s.d} m deep`, text: `${nm(D, s.A)} | ${nm(D, s.B)} (${s.n} rays)`, raw: s });
  }
  // (a cluster thinner than 10 cm one way across is a board, a rail, a frame or a plaque on a wall: held by the wall)
  for (const s of r.floats) if (s.gap >= 0.03 && Math.min(s.box[3] - s.box[0], s.box[5] - s.box[2]) >= 0.1) F.push({ area: a, cat: 'c', kind: 'floating', x: s.x, z: s.z, y: s.y, size: `${s.gap} m gap`, text: `${s.objs.map((o) => nm(D, o)).join(' + ')} (${s.parts} parts, box ${s.box.join(',')}) over ${s.sup >= 0 ? nm(D, s.sup) : 'nothing'}`, raw: s });
  for (const s of r.sunk) F.push({ area: a, cat: 'c', kind: 'sunk', x: s.x, z: s.z, y: s.y, size: `${s.depth} m in`, text: `${nm(D, s.A)} (box ${s.box.join(',')})`, raw: s });
  // ((d) needs a ground: the terrain, or Zeelich's island slab; Ballastra's districts stand on quays over the water, and a
  //  quay is not the ground a cap or a step runs into)
  const hasGround = r.census.terrains > 0 || a === 'zeelich';
  for (const s of r.buried) {
    if (s.m2 < 0.12 || !hasGround) continue;
    const paint = Object.entries(s.paint).sort((a, b) => b[1] - a[1])[0]?.[0];
    const onPaving = paint && /grass|dirt|sand/.test(paint) && s.box[4] - s.box[1] < 0.4;
    F.push({ area: a, cat: onPaving ? 'e' : 'd', kind: onPaving ? 'ground paint over paving' : 'into the ground', x: s.x, z: s.z, y: s.y, size: `${s.m2} m², ${s.depth} m deep`, text: `${nm(D, s.A)}: ${s.bur} rays under, ${s.flush} flush, ${s.exp} above (box ${s.box.join(',')})${paint ? ' painted ' + paint : ''}`, raw: s });
  }
  for (const s of r.plants) F.push({ area: a, cat: 'e', kind: 'plants on paving', x: s.at[0][0], z: s.at[0][2], y: s.at[0][1], size: `${s.n} plants`, text: `${s.kind} on ${s.on >= 0 ? nm(D, s.on) : '?'} ${s.look?.hex || ''}/${s.look?.tex || ''} (box ${s.box.join(',')})`, raw: s });
  // (decals: outdoors only, where a ground patch can lie on paving; indoors they are rugs, mats and labels on purpose.
  //  A round one is a blob shadow under someone or a puddle, not a patch)
  if (OUTDOOR.test(a)) for (const s of r.decals) if (!/^Circle/.test(s.path)) F.push({ area: a, cat: 'e', kind: 'decal on a part', x: s.x, z: s.z, y: s.y, size: s.size.join('×') + ' m', text: `${s.path} [${s.tex}] on ${nm(D, s.on)}`, raw: s });
  for (const f of F) { const k = knownOf(f.area, f.cat, f); f.known = k ? k[5] : null; }
  return F;
}

// ------------------------------------------------------------------ the ray sweep, per batch
async function runBatch(list) {
  const { browser, page } = await launch({ width: 960, height: 540 });
  page.setDefaultTimeout(3600000);
  try {
    await open(page, '?nocine');
    await menu(page, 'new');
    await page.evaluate(() => { const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
    await page.addScriptTag({ path: LIB });
    await page.evaluate(() => SW.init());
    const ids = await page.evaluate((list) => {
      const R = game.regions, all = [...R.of.keys()];
      const out = [];
      for (const pat of list) {
        if (pat === 'citadel') { out.push('citadel'); continue; }
        const re = new RegExp('^' + pat.replace('*', '.*') + '$');
        for (const id of all) if (re.test(id) && !out.includes(id)) out.push(id);
      }
      return out;
    }, list);
    for (const id of ids) {
      if (ONLY && !ONLY.includes(id)) continue;
      const file = path.join(OUT, id + '.json');
      if (process.env.RESUME && fs.existsSync(file)) continue;
      const t0 = Date.now();
      let r;
      try {
        r = await page.evaluate(async ([id, B]) => {
          if (id !== 'citadel') { game.regions.ensure(id, 'test'); for (let i = 0; i < 4; i++) game.step(0.05); }
          const R = id === 'citadel' ? null : game.rooms[id];
          if (id !== 'citadel' && !R) return { missing: true };
          const outdoor = id === 'citadel' || !!R.outdoor;
          return SW.scan(id === 'citadel' ? { bounds: B } : { room: id }, { step: outdoor ? 0.25 : 0.2, slabGround: id === 'zeelich' });
        }, [id, CITADEL]);
      } catch (e) { console.log(`AREA ${id}: scan failed ${String(e).slice(0, 300)}`); if (/crash|closed/i.test(String(e))) throw e; continue; }
      if (r.missing) { console.log(`AREA ${id}: not in this build`); continue; }
      r.id = id; r.secs = Math.round((Date.now() - t0) / 1000);
      fs.writeFileSync(file, JSON.stringify(r));
      console.log(`AREA ${id}: scanned in ${r.secs} s (${r.census.tris} triangles, ${r.census.parts} parts, ${r.census.rays} rays)`);
      if (process.env.SHOTS) {
        const dir = process.env.SHOTS; fs.mkdirSync(dir, { recursive: true });
        const pick = findingsOf(r).filter((f) => !f.known).sort((p, q) => p.cat.localeCompare(q.cat)).slice(0, +(process.env.SHOTS_N || 16));
        let i = 0;
        for (const f of pick) {
          const R = f.raw, A = R.A ?? R.on, B = R.B ?? R.sup ?? null;
          const span = R.box && R.box.length === 6 ? Math.max(R.box[3] - R.box[0], R.box[5] - R.box[2]) : R.box ? Math.max(R.box[2] - R.box[0], R.box[3] - R.box[1]) + 1 : 3;
          const u = await page.evaluate(([q, o]) => SW.shoot(q, o), [{ x: f.x, y: f.y ?? R.y ?? 0, z: f.z, A, B: B >= 0 ? B : null, span }, { zmap: true }]).catch((e) => { console.log('  shot failed', String(e).slice(0, 120)); return null; });
          if (!u) break;
          u.forEach((d, k) => fs.writeFileSync(path.join(dir, `${id}-${String(i).padStart(2, '0')}-${f.cat}${k ? '-z' : ''}.jpg`), Buffer.from(d.split(',')[1], 'base64')));
          console.log(`  shot ${id}-${String(i).padStart(2, '0')}-${f.cat}: ${f.kind} at ${f.x}, ${f.z}: ${f.text.slice(0, 160)}`);
          i++;
        }
      }
      await page.evaluate(() => SW.free());
    }
  } finally { await browser.close().catch(() => {}); }
}
if (!process.env.SKIP_RAYS) for (const b of BATCHES) {
  if (ONLY && !b.some((p) => ONLY.some((o) => new RegExp('^' + p.replace('*', '.*') + '$').test(o)))) continue;
  // (the machine under load: a crashed page is tried again (twice), the areas already kept are not scanned again; the
  // crash stays a FAIL only if the batch never finishes)
  const resume = process.env.RESUME, n0 = report.fails.length;
  for (let k = 0; k < 3; k++) {
    try { await runBatch(b); if (k) { const crashes = report.fails.filter((f, i) => i >= n0 && f.kind === 'page crashed'); for (const c of crashes) { report.fails.splice(report.fails.indexOf(c), 1); report.notes.push('page crashed, the batch tried again and finished: ' + c.text); } } break; }
    catch (e) { console.log(`BATCH crashed (try ${k + 1} of 3): ` + String(e).slice(0, 200)); process.env.RESUME = '1'; if (k === 2) check(`batch ${b[0]}… scanned`, false, String(e).slice(0, 200)); }
  }
  if (resume === undefined) delete process.env.RESUME; else process.env.RESUME = resume;
}

// ------------------------------------------------------------------ the older scans (child runs)
const child = (script, env) => {
  const rep = path.join(OUT, script.replace('.mjs', '') + '-report.json');
  if (!(process.env.RESUME && fs.existsSync(rep))) {
    const r = spawnSync(process.execPath, [path.join(HERE, script)], { env: { ...process.env, ...env, REPORT: rep, SHOTS: '' }, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 3 * 3600000 });
    fs.writeFileSync(rep.replace('-report.json', '.log'), (r.stdout || '') + (r.stderr || ''));
  }
  return fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : null;
};
const PL = process.env.PLACE ? child('place-scan.mjs', { ONLY: '' }) : null;
const WF = process.env.WORLDFIT ? child('worldfit.mjs', { AREAS: '' }) : null;

// ------------------------------------------------------------------ the findings, per area and category
const F = [];   // { area, cat, kind, text, x, z, size, known }
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.includes('-report'))) {
  const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  if (ONLY && !ONLY.includes(r.id)) continue;
  F.push(...findingsOf(r));
}
if (PL) for (const f of PL) {
  const cat = { inside: 'a', wall: 'a', float: 'c', sunk: 'c' }[f.kind]; if (!cat) continue;
  F.push({ area: f.room, cat, kind: 'place-scan ' + f.kind, x: f.world[0], z: f.world[1], size: f.measure, text: `${f.item}#${f.frame}: ${f.what}${f.left ? ' [place-scan LEFT: ' + f.left + ']' : ''}`, left: f.left });
}
if (WF) {
  for (const f of WF.fit) { const cat = /overlaps|duplicated|runs into|cuts into/.test(f.kind) ? 'a' : 'c'; F.push({ area: f.area, cat, kind: 'worldfit ' + f.kind, x: f.at[0], z: f.at[2], size: f.by != null ? f.by + ' m' : '', text: `${f.building}: ${f.kind} ${f.side || ''}` }); }
  for (const z of WF.zf) if (z.m2 >= 0.15) F.push({ area: z.area, cat: 'b', kind: 'worldfit coplanar', x: z.at[0], z: z.at[2], size: z.m2 + ' m²', text: `${z.a} | ${z.b}${z.near ? ' (' + z.near + ')' : ''}` });
}
for (const f of F) if (f.known === undefined) { const k = knownOf(f.area, f.cat, f) || (f.left ? [0, 0, 0, 0, 0, 'place-scan LEFT: ' + f.left] : null); f.known = k ? k[5] : null; }

// counts per area and category
const CATS = ['a', 'b', 'c', 'd', 'e'], counts = {};
for (const f of F) { const c = (counts[f.area] ??= { a: [0, 0], b: [0, 0], c: [0, 0], d: [0, 0], e: [0, 0] }); c[f.cat][f.known ? 1 : 0]++; }
console.log('COUNTS area: a through | b coplanar | c sunk/floating | d into ground | e paint/plants on paving   (open/known)');
const tot = { a: [0, 0], b: [0, 0], c: [0, 0], d: [0, 0], e: [0, 0] };
for (const [a, c] of Object.entries(counts).sort()) { console.log(`COUNTS ${a.padEnd(16)} ` + CATS.map((k) => `${k} ${c[k][0]}/${c[k][1]}`).join('  ')); for (const k of CATS) { tot[k][0] += c[k][0]; tot[k][1] += c[k][1]; } }
console.log('COUNTS TOTAL            ' + CATS.map((k) => `${k} ${tot[k][0]}/${tot[k][1]}`).join('  '));
const open_ = F.filter((f) => !f.known);
for (const f of open_) console.log(`  FOUND ${f.area} (${f.cat}) ${f.kind} at ${f.x}, ${f.z}${f.y != null ? ' y ' + f.y : ''} [${f.size}]: ${f.text}`);
for (const f of F.filter((f) => f.known)) console.log(`  known ${f.area} (${f.cat}) ${f.kind} at ${f.x}, ${f.z} [${f.size}]: ${f.text} — ${f.known}`);
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify({ counts, total: tot, findings: F.map(({ raw, ...f }) => ({ ...f, raw })) }, null, 1));
const scanned = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.includes('-report')).length;
check(`every area scanned (${scanned})`, ONLY ? scanned >= ONLY.length : scanned >= 100);
for (const k of CATS) checkVisual(`(${k}) ${{ a: 'no piece through another', b: 'no two surfaces fighting in one plane', c: 'nothing floating or sunk', d: 'no deck, step or path running into the ground', e: 'no ground paint, grass or flowers on paving' }[k]} but the known (${tot[k][0]} open)`, tot[k][0] === 0, open_.filter((f) => f.cat === k).slice(0, 8).map((f) => `${f.area} ${f.kind} ${f.x},${f.z} ${f.size}: ${f.text}`));
done();
