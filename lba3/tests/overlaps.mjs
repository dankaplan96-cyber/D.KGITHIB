// OVERLAP-1 (the user, 5.11: "check all the places where floor tiles, walls etc. overlap", after two kinds of floor
// flickered in one plane under the fort's gate): two surfaces in one plane flicker. tests/lib/overlap.js casts a grid
// of rays down (every 0.25 m) and across (walls, at three heights) over each area and flags where two different
// surfaces lie within 2 cm of each other, facing the same way. This suite judges the ones a player can see flicker:
//   FAIL  gap ≤ 1 mm (one plane: they flicker at any distance), ≥ 8 rays (≈ 0.5 m² of floor), seen (not inside a solid
//         nor sealed by a face pressed on it) on at least half of them and ≥ 8, at most 2 surfaces over it on the ray,
//         two different looks (colour or texture), and not on the KNOWN list below
//   listed: the rest within 3 mm and ≥ 4 rays (the report; REPORT=<file.json> keeps every spot)
// Areas: Citadel outdoors (the town, the harbour, the fort, the station, the terrace and climb, the lighthouse) and
// every Citadel interior; REGIONS=1 adds the other areas the story builds (Desert Island, Zeelich and its islands, the
// Hamalayi, the underground, the condensers, the temples, the council quarter), ONLY=a,b scans those only.
// SHOTS=<dir> writes a plain and a red/green picture of each failing and listed spot. SwiftShader: no fps here.
// Run: BOOT_TIMEOUT=900000 GAME_URL=http://localhost:8123/ node tests/overlaps.mjs   (~12 min; REGIONS=1 ~40 min)
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker();
const LIB = fileURLToPath(new URL('./lib/overlap.js', import.meta.url));

const ROOM = { floorY: 0, heights: [0.3, 0.8, 1.5, 2.5, 3.5, 5, 7], step: 0.2, hstep: 0.2 };
const CITADEL_ROOMS = ['house', 'well', 'office', 'projoffice', 'control', 'workshop', 'lighttop', 'cellar', 'tavern', 'tavcellar', 'bazoo', 'ticket',
  'pharmacy', 'nbrhouse', 'nellhouse', 'baggage', 'tralucave', 'terminal', 'sewer', 'sewervault', 'sewerglobe', 'wtent', 'school', 'asylum'];
const OTHER_ROOMS = ['zterminal', 'zh_pelleck', 'zh_nara', 'zh_oku', 'zh_bakery', 'otrbar', 'otrhotel', 'celtemple', 'c3shaft', 'c3deep', 'c3gallery', 'c3sendell', 'c3core', 'condA', 'condB',
  'butemple', 'obsv', 'upper', 'council', 'archive', 'valves', 'arena', 'ham_hall'];
const REGIONS = ['desert', 'zeelich', 'hamalayi', 'isle_otringal', 'isle_knartas', 'isle_mosquibee', 'isle_celebration', 'isle_undergas',
  'isle_platform', 'isle_liftdock', 'isle_orchard', 'isle_oldwatch'];
let AREAS = [{ tag: 'citadel', bounds: { x0: -206, x1: 54, z0: -114, z1: 146 } }, ...CITADEL_ROOMS.map((room) => ({ room, opt: ROOM }))];
if (process.env.REGIONS) AREAS.push(...OTHER_ROOMS.map((room) => ({ room, opt: ROOM })), ...REGIONS.map((room) => ({ room, opt: { step: 0.3, hstep: 0.3 } })));
if (process.env.ONLY) { const only = process.env.ONLY.split(','); AREAS = [...AREAS, ...[...OTHER_ROOMS, ...REGIONS].map((room) => ({ room, opt: REGIONS.includes(room) ? { step: 0.3, hstep: 0.3 } : ROOM }))].filter((a) => only.includes(a.tag || a.room)); }

// Seen and judged, not a flicker a player meets: [area, x, z, radius, why]
const KNOWN = [
  ['citadel', -26.6, -50.1, 3, 'the asylum front\'s pediment under its slate roof (laptop art, asylumhostel.js): two layers 0.8 mm apart, both under the slates'],
];
const known = (tag, s) => KNOWN.find(([a, x, z, r]) => a === tag && Math.hypot(s.x - x, s.z - z) < r);
const same = (s) => s.la.hex === s.lb.hex && s.la.tex === s.lb.tex;

const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.evaluate(() => { const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
await page.addScriptTag({ path: LIB });
await page.evaluate(() => OVL.init());

const report = [], fails = [];
for (const area of AREAS) {
  const tag = area.tag || area.room;
  let r;
  try { r = await page.evaluate(([a, o]) => OVL.scan(a, o), [area, area.opt || {}]); }
  catch (e) { check(`${tag}: scanned`, false, String(e).slice(0, 300)); continue; }
  const bad = r.spots.filter((s) => s.gap <= 0.001 && s.n >= 8 && s.vis >= Math.max(8, s.n / 2) && s.rank <= 2 && !same(s) && !known(tag, s));
  const listed = r.spots.filter((s) => s.gap <= 0.003 && s.n >= 4 && !same(s) && !bad.includes(s));
  const line = (s) => `${s.fam} at ${s.x}, ${s.y}, ${s.z} (${(s.box[3] - s.box[0]).toFixed(1)} × ${(s.box[5] - s.box[2]).toFixed(1)} m, ${s.n} rays, ${s.vis} seen, ${s.rank} over it, gap ${(s.gap * 1000).toFixed(1)} mm): ${r.D[s.A].path} ${s.la.hex}/${s.la.tex} | ${r.D[s.B].path} ${s.lb.hex}/${s.lb.tex}${known(tag, s) ? ' (KNOWN: ' + known(tag, s)[4] + ')' : ''}`;
  console.log(`AREA ${tag}: ${r.census.meshes} meshes, ${r.census.tris} triangles, ${r.census.terrains} ground grids, rays down ${r.census.rays.nv} / across ${r.census.rays.nh} with 2+ surfaces, ${r.spots.length} spots within 2 cm, ${bad.length} failing, ${listed.length} listed`);
  for (const s of bad) console.log('  FLICKER ' + line(s));
  for (const s of listed) console.log('  listed  ' + line(s));
  if (process.env.SHOTS) {
    fs.mkdirSync(process.env.SHOTS, { recursive: true });
    const pick = [...bad, ...listed.filter((s) => s.vis >= 2)].slice(0, 12);
    for (let i = 0; i < pick.length; i++) {
      const u = await page.evaluate((s) => OVL.shoot(s, { zmap: true }), pick[i]);
      u.forEach((d, k) => fs.writeFileSync(`${process.env.SHOTS}/${tag}-${String(i).padStart(2, '0')}${k ? 'z' : ''}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
    }
  }
  report.push({ tag, census: r.census, spots: r.spots.filter((s) => s.gap <= 0.003).map((s) => ({ ...s, A: r.D[s.A], B: r.D[s.B] })) });
  for (const s of bad) fails.push(`${tag}: ${line(s)}`);
  checkVisual(`${tag}: no two surfaces in one plane where they can be seen (${bad.length})`, bad.length === 0, bad.slice(0, 4).map(line));
}
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(report, null, 1));
check(`every area scanned (${report.length} of ${AREAS.length})`, report.length === AREAS.length);
await browser.close();
done();
