// PLACE-1 (the user, 11.11, P13: "every item stands in a sensible place and not in the middle of the room, arranged
// normally, and no items one on top of another"): a measured sweep of every interior's placed pieces.
// tests/lib/placerec.js is installed before the game loads: props.js's Kit reports every placed piece (k.at, the
// room builders' put) and every drawn part, so each piece's drawn parts are known in the world as turned boxes, with
// its prop's name (chair, bed, bookcase ...). Every area and room is built; tests/lib/placecollect.js gathers each
// interior's pieces, its walls and partitions (the parts drawn outside pieces, the wall colliders), its floor, its
// exits and landing spot; tests/lib/placejudge.mjs judges them (its head lists each finding and its measure):
// inside, wall, float, sunk, back (a bookcase/wardrobe/bed turned or adrift), facing (a chair's back to its table),
// door (in the lane in from a door), adrift (a crate alone in the open).
//   FAIL  a finding not on the LEFT list below (each with its priority and why it is left)
//   SHOTS=<dir>  per finding: the game camera's view (Twinsen put by the piece) and a nearer look with the piece
//                outlined red (the other piece of a pair yellow); ONLY=room,room limits the rooms; FRAMES=i,j only those
//   REPORT=<file.json>  every finding with its measure; DUMP=<file.json> the raw collection (placejudge.mjs reads it)
// The chapter state is a new game's (room furniture does not change with the chapters; the quest props that do are
// listed in docs/lba-maturity/PLACE-1.md). Outdoors (Citadel, the regions, the isles) only what Kit placed is known:
// there the pieces are judged for inside / float / sunk only (no walls, no doors' lanes).
// Run: BOOT_TIMEOUT=900000 GAME_URL=http://localhost:8123/ node tests/place-scan.mjs   (~3 min). Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { judge } from './lib/placejudge.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const lib = (f) => fileURLToPath(new URL('./lib/' + f, import.meta.url));

// Measured and left (docs/lba-maturity/PLACE-1.md has each with its priority): [room, kind, item, why, near [x, z]
// in the room's frame (Citadel: the world)]
const LEFT = [
  // by design: what the measure reads as wrong is meant
  ['tavern', 'back', 'jukebox', 'by design: LBA2\'s Chez Luc has it at the stair\'s foot (tavern.js); Kip\'s stop is at its front', [3.4, -1.35]],
  ['otrbar', 'back', 'aquarium', 'by design: LBA2\'s Otringal bar has it in the middle, by the booths (otrbar.js)', [4.6, 1.6]],
  ['control', 'inside', 'console_', 'by design: three consoles joined into one curved bank (their side wings meet)'],
  ['tavern', 'inside', 'counter', 'by design: the L-shaped bar, two counters meeting at the corner', [-4, 0.68]],
  ['otrbar', 'inside', 'counter', 'by design: the L-shaped bar, two counters meeting at the corner', [-3.12, 5.65]],
  ['c3core', 'float', 'custom', 'by design: the receivers\' brass cages round the floating crystals, on their arms (underground.js)'],
  ['c3core', 'sunk', 'custom', 'by design: a pylon standing in the floor\'s ring channel (underground.js)', [8.07, 6.14]],
  ['c3shaft', 'float', 'rockWallRun', 'not a piece: the shaft\'s rock wall, rising from the shaft\'s floor 6 m down', [9.05, -5.36]],
  ['asylum', 'float', 'custom', 'not measured: LBA1\'s floors are cells (lba1room.js), not recorded parts: the boiler and the stove grate stand on them'],
  ['otrbar', 'float', 'railing', 'not measured: the gallery\'s railing stands on the gallery\'s edge, its floor not under its middle', [-8.23, -2.95]],
  // low: a few centimetres, seen only up close
  ['citadel', 'inside', 'workbench', 'low (6 cm): Nell\'s tapered landing leg on the bench, its thick end touching the top', [-102.8, 33.17]],
  ['office', 'inside', 'pottedPlant', 'low (6 cm): the plant behind the open door\'s leaf (a stealth room: left alone)', [3.6, -3.07]],
  ['workshop', 'inside', 'draftingTable', 'low (6 cm): Baldino\'s helix model on the drafting table\'s edge', [-3.43, 2.45]],
  ['pharmacy', 'inside', 'basket', 'low (5 cm): the basket under the bauble tree\'s branches', [1.64, 0.08]],
  ['otrbar', 'inside', 'railing', 'low (5 cm): the booths\' rail meeting the booths\' backs', [-3.05, -4.82]],
  ['otrbar', 'inside', 'custom', 'low (6 cm): the till on the bar\'s corner', [-3.2, 5.4]],
  ['otrhotel', 'inside', 'coinMachine', 'low (4 cm): the two coin machines\' tops under the tier lamp\'s shade'],
  ['c3shaft', 'inside', 'barrel', 'low (6 cm, chapter 11): a barrel against the column at the tunnel', [7.8, -4.7]],
  ['hamalayi', 'inside', 'pv', 'low (11 cm, outdoors, chapter 6): two pieces of the pass\'s dressing touching', [4289.8, 78.7]],
  ['hamalayi', 'inside', 'barrel', 'low (5 cm, outdoors): a barrel against its stack', [4304.19, 0.02]],
  ['hamalayi', 'inside', 'crate', 'low (7 cm, outdoors): a crate against its stack', [4304, -0.68]],
  ['hamalayi', 'inside', 'fn', 'low (4–6 cm, outdoors): stacked goods touching'],
  ['hamalayi', 'inside', 'custom', 'low (10 cm, outdoors): a market piece touching the stall', [4330.83, -34]],
  ['hamalayi', 'inside', 'custom', 'low (10 cm, outdoors): a market piece touching the stall', [4337.17, -34]],
  // not measurable here: the round room's glazing parts are arcs, their boxes reach into the room (the cabinet's back is
  // at 2.68 m from the middle, the glass at 2.9–3.0 m; looked at: it stands before the glazing)
  ['lighttop', 'wall', 'transmitterCabinet', 'not measurable: a round wall\'s parts are arcs whose boxes reach into the room; looked at, it stands before the glazing', [-0.82, -2.24]],
];
const left = (f) => LEFT.find(([r, k, it, why, near]) => r === f.room && k === f.kind && it === f.item && (!near || Math.hypot(f.at[0] - near[0], f.at[1] - near[1]) < 0.6));

const { browser, page } = await launch({ width: 960, height: 540 });
page.setDefaultTimeout(1800000);
await page.addInitScript({ path: lib('placerec.js') });
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: lib('placecollect.js') });
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
// VIEWS=<file.json>: [{ name, room, focus: [x, z], at: [x, z], span?, dir? [x, z] }] in the room's frame (its centre; Citadel: the world):
// Twinsen put at `at`, the game camera's picture and a nearer look at `focus`, nothing judged (before/after pictures)
if (process.env.VIEWS) {
  const views = JSON.parse(fs.readFileSync(process.env.VIEWS)), dir = process.env.SHOTS || '.'; fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(async () => { await PLACE.init(); const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
  for (const v of views) {
    const ok = await page.evaluate(([v]) => { const G = game, R = v.room === 'citadel' ? null : G.regions.ensure(v.room, 'test'); const c = R ? [R.center.x, R.center.z] : [0, 0];
      const f = [v.focus[0] + c[0], v.focus[1] + c[1]], a = [v.at[0] + c[0], v.at[1] + c[1]]; PLACE.stage(v.room, f, a); window.__f = f; return true; }, [v]).catch((e) => String(e).slice(0, 200));
    if (ok !== true) { console.log('VIEW', v.name, 'failed', ok); continue; }
    await page.screenshot({ path: path.join(dir, v.name + '-game.jpg'), type: 'jpeg', quality: 80 });
    const url = await page.evaluate((v) => PLACE.close(window.__f, [], v.span || 4.2, v.dir || null), v);
    fs.writeFileSync(path.join(dir, v.name + '-close.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('VIEW', v.name, 'written');
  }
  await browser.close();
  process.exit(0);
}
const data = await page.evaluate(async (ONLY) => {
  const G = game; await PLACE.init();
  window.__IH = (await import('./src/game/ihomes.js')).IH;
  for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.regions.ensureAll('test'); G.step(0.1);
  const ids = ['citadel', ...Object.keys(G.rooms)].filter((id) => (id === 'citadel' || G.regions.centreOf(id)) && (!ONLY || ONLY.includes(id)));
  return PLACE.collect(ids);
}, ONLY);
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(data));

const all = [];
let pieces = 0;
for (const [id, A] of Object.entries(data)) {
  const r = judge(id, A); pieces += r.pieces;
  if (r.find.length) console.log(`AREA ${id}: ${r.pieces} pieces, ${r.find.length} findings`);
  for (const f of r.find) { f.left = left(f)?.[3] || null; console.log(`  ${f.left ? 'left ' : 'FOUND'} ${f.kind.padEnd(6)} ${f.item}#${f.frame} at ${f.at.join(', ')} (world ${f.world.join(', ')}): ${f.what} — ${f.measure}${f.left ? ' [LEFT: ' + f.left + ']' : ''}`); }
  all.push(...r.find.map((f) => ({ ...f, A })));
}
console.log(`MEASURE ${Object.keys(data).length} rooms, ${pieces} pieces, ${all.length} findings (${all.filter((f) => f.left).length} on the LEFT list)`);
const byKind = {}; for (const f of all) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
console.log('MEASURE by kind ' + JSON.stringify(byKind));
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(all.map(({ A, ...f }) => f), null, 1));

if (process.env.SHOTS) {
  const dir = process.env.SHOTS; fs.mkdirSync(dir, { recursive: true });
  const FR = process.env.FRAMES ? process.env.FRAMES.split(',').map(Number) : null;
  const seen = new Set();
  for (const f of all) {
    if (FR && !FR.includes(f.frame)) continue;
    const key = f.room + '#' + f.frame; if (seen.has(key)) continue; seen.add(key);
    const P = f.A.frames.find((q) => q.i === f.frame), Q = f.other != null ? f.A.frames.find((q) => q.i === f.other) : null;
    const box = (fr, all, color) => { const ps = []; const kids = (x) => { ps.push(...x.parts); for (const c of all.frames.filter((c) => c.p === x.i)) kids(c); }; kids(fr); const pts = ps.flatMap((p) => p[0]); return { hull: pts, y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[2])), color }; };
    const outl = [box(P, f.A, 0xff2020)]; if (Q) outl.push(box(Q, f.A, 0xffd020));
    // (a box of lines round each: the hull of every part's corners)
    for (const o of outl) { const xs = o.hull.map((p) => p[0]), zs = o.hull.map((p) => p[1]); o.hull = [[Math.min(...xs), Math.min(...zs)], [Math.max(...xs), Math.min(...zs)], [Math.max(...xs), Math.max(...zs)], [Math.min(...xs), Math.max(...zs)]]; }
    const stood = await page.evaluate(([id, w]) => PLACE.stage(id, w), [f.room, f.world]);
    const name = `${f.room}-${f.frame}-${f.item}`;
    if (stood) await page.screenshot({ path: path.join(dir, name + '-game.jpg'), type: 'jpeg', quality: 70 });
    const url = await page.evaluate(([w, o]) => PLACE.close(w, o), [f.world, outl]);
    fs.writeFileSync(path.join(dir, name + '-close.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  }
}

check(`every interior collected and judged (${Object.keys(data).length} rooms, ${pieces} pieces)`, Object.keys(data).length >= (ONLY ? ONLY.length : 100) && pieces > 0);
const open_ = all.filter((f) => !f.left);
check(`no piece out of place but those measured and left (${open_.length})`, open_.length === 0, open_.slice(0, 12).map((f) => `${f.room} ${f.kind} ${f.item}#${f.frame} at ${f.at}: ${f.measure}`));
await browser.close();
done();
