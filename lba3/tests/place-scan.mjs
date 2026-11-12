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
// listed in docs/lba-maturity/PLACE-1.md). Outdoors (Citadel, Zeelich, the isles, the Desert and the Hamalayi) PLACE-2
// measures what is built outside the Kit too (tests/lib/placeout.js: Batch parts, merged meshes, the meshes and
// instances left in the scene, grouped into pieces by their maker) and judges them with outdoor rules
// (placejudge.mjs judgeOut: inside, building walls, float/sunk against the ground, doors, stairs, walkways, paths,
// benches, signs, wall-type pieces). docs/lba-maturity/PLACE-2.md has the outdoor list.
// PLACE-3 (docs/lba-maturity/PLACE-3.md) swept the Desert and the Hamalayi; the Hamalayi's put() names its pieces, and the
// Kit's buildings outdoors (a house's frames, the observatory's windows, the monastery's gate, walls' copings, snow
// drifts) are fixtures, as outside the Kit. SHOTS works for pieces built outside the Kit; VIEWS for regions.
// Run: BOOT_TIMEOUT=900000 GAME_URL=http://localhost:8123/ node tests/place-scan.mjs   (~3 min). Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { judge, judgeOut } from './lib/placejudge.mjs';
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
  // PLACE-3, outdoors (docs/lba-maturity/PLACE-3.md): the Desert and the Hamalayi after the campaign waves
  ['desert', 'float', 'tent', 'not a standing piece: a tent\'s guy lines, from its ridge and eaves to the tops of their pegs (17 cm up the peg)'],
  ['desert', 'inside', 'lantern', 'by design (5 cm): a lantern hung from its post\'s arm (desertdress.js lanternPost)'],
  ['desert', 'inside', 'wheel', 'by design: the sand-yacht\'s wheels in their forks, under its axle and bowsprit (one vehicle, desert.js)'],
  ['desert', 'inside', 'windsock', 'by design: the glider field\'s sock on its mast'],
  ['hamalayi', 'inside', 'windsock', 'by design: the glider field\'s sock on its mast'],
  ['hamalayi', 'inside', 'barrel', 'low (5 cm): the two barrels by house 2 touching', [4304.02, 0.22]],
  ['hamalayi', 'float', 'crate', 'low: a stack\'s top crate turned on the one under it, a corner over its edge (Lhar\'s west crates, the observatory\'s supplies)'],
  ['hamalayi', 'inside', 'winch', 'by design (chapter 6): the frozen winch in its ice (pass.js thaws it)'],
  ['hamalayi', 'float', 'winch', 'not changed: the lift winch\'s sled 12 cm over the snow; wave 3\'s crank sits on its drum at this height (winchline.js): reported, not moved', [4326.3, -21.06]],
  ['hamalayi', 'inside', 'freight', 'low (4 cm): the freight\'s crate against its barrel'],
  ['hamalayi', 'inside', 'yardCrates', 'low (5 cm): the yard\'s crate against its barrel'],
  ['hamalayi', 'inside', 'decorate', 'by design: the frozen mooring rope\'s post by the winch, the rope tied to the winch (pass.js)'],
  ['hamalayi', 'wall', 'wheels', 'by design: the prayer wheels\' roof against the monastery hall\'s front (a lean-to row)'],
  ['hamalayi', 'float', 'wheels', 'not measurable: the prayer wheels stand on the yard\'s paving, which is not recorded as ground (looked at: on the paving)'],
  ['hamalayi', 'wall', 'barrel', 'not measurable: the observatory\'s round wall, its parts arcs whose boxes reach out; the barrel stands 0.5 m off its plinth', [4280.59, -68.4]],
  ['hamalayi', 'sunk', 'foldHay', 'low (9 cm): the fold\'s hay rack in the snow'],
  ['hamalayi', 'sunk', 'custom', 'by design: LBA1\'s old gate set on the lowest ground under its posts (hamalayi.js place), its foot in the snow', [4294.5, 58]],
  // Citadel (chapters 1–2)
  ['citadel', 'inside', 'buildTownLife', 'by design: Nell\'s lean-to, the bench under its roof against its back wall (one structure, two builders)', [-102.8, 34.32]],
  ['citadel', 'inside', 'barrels', 'low (4 cm): the station\'s barrels, the lying one against a standing one', [-38.35, -60.4]],
  ['citadel', 'inside', 'barrels', 'by design: the depot yard\'s barrels, a lying one against the standing ones and the hand cart (looked at)', [-75.6, -77.2]],
  ['citadel', 'inside', 'barrels', 'by design: the depot yard\'s barrels against the hand cart (4 cm)', [-75.47, -75.76]],
  ['citadel', 'inside', 'handcart', 'by design: one hand cart, its wheels and its body', [-77.03, -76.26]],
  ['citadel', 'inside', 'crateStack', 'low (7–17 cm): a stack\'s crates turned against each other in the depot yard'],
  ['citadel', 'inside', 'crate', 'low (9 cm): the harbour\'s Esmer crate stack, a wooden crate against a teal one', [-81.38, 43.22]],
  ['citadel', 'inside', 'buildLid', 'by design: the dry well\'s lid and the crates\' lids resting on them (chapter 1 decoration)'],
  ['citadel', 'inside', 'cargoLift', 'low (4 cm): the cargo lift\'s frame against its crate', [-85.3, -0.92]],
  ['citadel', 'inside', 'windsock', 'by design: the glider field\'s sock on its mast', [-102.82, -68]],
  ['citadel', 'wall', 'meshFence', 'by design: the depot gate\'s hinge post beside the fence\'s end post', [-65, -77.3]],
  ['citadel', 'sunk', 'meshFence', 'by design: a fence post planted in the ground', [-65, -77.3]],
  ['citadel', 'wall', 'barrels', 'low (12 cm): a depot barrel against the yard\'s fence', [-74.8, -77.3]],
  ['citadel', 'float', 'custom', 'not a standing piece: the sewer hatch lever\'s quadrant on its post (sewers.js; the post is drawn outside the piece)'],
  ['citadel', 'float', 'flowerBox', 'low (6 cm): a window box under Twinsen\'s window', [-46.7, 82.1]],
  ['citadel', 'walk', 'mkCrate', 'by design: cargo by the crane on the quay\'s deck (3.2 m wide)', [-128.69, 43.4]],
  ['citadel', 'path', 'handcart', 'by design: the depot\'s staff yard behind the painted line; goods along its fence (world.js pathDist still runs through it)'],
  ['citadel', 'path', 'barrels', 'by design: the depot\'s staff yard behind the painted line; goods along its fence'],
  ['citadel', 'path', 'crateMesh', 'by design: the depot\'s breakable crates (W.crates: there to be broken)'],
  ['citadel', 'path', 'well', 'by design: the square\'s well, the paths meet round it', [-41.6, -4]],
  ['citadel', 'path', 'pot', 'by design: the pot beside the tavern\'s door, where its path ends', [-45.59, 26.6]],
  ['citadel', 'path', 'barrel', 'by design: Twinsen\'s barrels by his house (the home-barrels search spot)', [-48.77, 74.46]],
  // Zeelich
  ['zeelich', 'wall', 'cartWheel', 'by design: the cart wheel leaning against Baldino\'s wall (its turned box reaches into his collider)'],
  ['zeelich', 'sunk', 'cartWheel', 'by design: the leaning wheel\'s rim on the ground'],
  // the isles (chapters 4–5): what is left after the original's small things are seated on what is under them
  ['isle_otringal', 'float', 'fit', 'not measurable: the original\'s fitted pieces (a brass finial on a wall pier, looked at): the wall\'s top is not recorded as ground'],
  ['isle_knartas', 'float', 'fit', 'not measurable: a bush on the quay\'s paving, a slab with no brick under it (looked at: it stands on the paving)'],
  ['isle_mosquibee', 'float', 'fit', 'not measurable: the original\'s fitted pieces on the bank\'s lip'],
  ['isle_platform', 'float', 'fit', 'not measurable: a cypress on the bank\'s edge, its crown over the drop (looked at: its trunk on the ground)'],
  ['isle_otringal', 'inside', 'railing', 'by design (7–10 cm): a railing\'s end meeting the stall\'s canopy post and the planks against it'],
  ['isle_otringal', 'inside', 'crate', 'low (4–9 cm): a stack\'s crates touching'],
  ['isle_otringal', 'sunk', 'jar', 'low (9 cm): seated on the lowest ground under it, on a slope'],
  ['isle_otringal', 'sunk', 'crate', 'low (9–29 cm): seated on the lowest ground under it on a slope; the stall\'s crate under its counter'],
  ['isle_otringal', 'float', 'jars', 'by design: the stall\'s jars on its sloping shelf'],
  ['isle_otringal', 'float', 'zplant', 'not a standing piece: the plant in its planter'],
  ['isle_otringal', 'door', 'planter', 'by design: beside the hotel\'s door, in the trigger\'s ring, the way in clear (island-doors)'],
  ['isle_knartas', 'inside', 'jar', 'low (16 cm): the original\'s two jars side by side'],
  ['isle_knartas', 'inside', 'crate', 'low (4 cm): a stack\'s crates touching'],
  ['isle_knartas', 'float', 'fence', 'low: a fence along a slope, its rails level (one end 57 cm over the bank)'],
  ['isle_knartas', 'float', 'pole', 'low: a washing pole on the bank\'s edge'],
  ['isle_knartas', 'float', 'barrel', 'low: a container barrel on a slope (containers.js)'],
  ['isle_knartas', 'sunk', 'jar', 'low (11–40 cm): the original\'s jars seated on the lowest ground under them, on the bank'],
  ['isle_knartas', 'door', 'jar', 'low: beside the homes\' doors, in the trigger\'s ring; the way in clear (island-doors)'],
  ['isle_mosquibee', 'inside', 'crate', 'low (5 cm): a stack\'s crates touching'],
  ['isle_mosquibee', 'float', 'jar', 'not measurable: on the bank\'s lip, where the drawn ground and the heights differ (looked at: it stands on the grass)'],
  ['isle_celebration', 'float', 'pole', 'low (19–21 cm): a banner pole on the slope\'s edge'],
  ['isle_undergas', 'inside', 'crate', 'low (6–8 cm): the original\'s crates in rows, side by side'],
  ['isle_undergas', 'wall', 'crate', 'low: a crate of the island home\'s planner against the wall\'s pilaster (ihomes.js)'],
  ['isle_undergas', 'float', 'jar', 'low: a jar on the slope\'s edge'],
  ['isle_undergas', 'float', 'crate', 'by design: the original\'s crate on top of the row'],
  ['isle_undergas', 'float', 'planter', 'low (18 cm): a planter on a slope'],
  ['isle_undergas', 'sunk', 'jar', 'low (10–13 cm): seated on the lowest ground under it'],
  ['isle_platform', 'inside', 'crate', 'low (4 cm): a stack\'s crates touching'],
  ['isle_platform', 'sunk', 'jar', 'low: seated on the lowest ground; one 3.2 m jar half in the bank as the original has it'],
  ['isle_platform', 'sunk', 'bench', 'low (13–18 cm): a bench set on the lowest ground under it on a slope (zislands.js groundUnder: rather sunk than floating)'],
  ['isle_liftdock', 'inside', 'railRun', 'by design (9 cm): the deck\'s rail behind the goods at its edge'],
  ['isle_liftdock', 'inside', 'crate', 'low (4–5 cm): a stack\'s crates touching'],
  ['isle_liftdock', 'float', 'jar', 'by design: jars at the deck\'s edge (the samples past the edge read the cloud sea)'],
  ['isle_orchard', 'inside', 'crate', 'low (4–10 cm): a stack\'s crates touching'],
  ['isle_orchard', 'sunk', 'crate', 'low (10–20 cm): goods set on the lowest ground under them on the orchard\'s slopes (zislands.js groundUnder: rather sunk than floating)'],
  ['isle_orchard', 'sunk', 'honeyJars', 'low (9–20 cm): as the crates beside them'],
  ['isle_orchard', 'sunk', 'bench', 'low (10 cm): a bench on a slope'],
  ['isle_orchard', 'float', 'crate', 'low: a stack\'s top crate over a slope\'s low side'],
  ['lighttop', 'wall', 'transmitterCabinet', 'not measurable: a round wall\'s parts are arcs whose boxes reach into the room; looked at, it stands before the glazing', [-0.82, -2.24]],
];
const left = (f) => LEFT.find(([r, k, it, why, near]) => r === f.room && (k === '*' || k === f.kind) && (it === '*' || it === f.item) && (!near || Math.hypot(f.at[0] - near[0], f.at[1] - near[1]) < 0.6));

const { browser, page } = await launch({ width: 960, height: 540 });
page.setDefaultTimeout(1800000);
await page.addInitScript({ path: lib('placerec.js') });
// (PLACE-2: three's module hands itself to the recorder as it loads, so the recorder knows where each mesh is added;
//  the game's files are served as they are)
await page.route('**/vendor/three/build/three.module.min.js', async (route) => {
  const res = await route.fetch(), body = await res.text();
  await route.fulfill({ response: res, body: body + "\nimport * as __PLACE_T from './three.module.min.js'; globalThis.__PLACE_REC?.three?.(__PLACE_T);\n" });
});
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: lib('placecollect.js') });
await page.addScriptTag({ path: lib('placeout.js') });
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
// VIEWS=<file.json>: [{ name, room, focus: [x, z], at: [x, z], span?, dir? [x, z] }] in the room's frame (its centre; Citadel: the world):
// Twinsen put at `at`, the game camera's picture and a nearer look at `focus`, nothing judged (before/after pictures)
if (process.env.VIEWS) {
  const views = JSON.parse(fs.readFileSync(process.env.VIEWS)), dir = process.env.SHOTS || '.'; fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(async () => { await PLACE.init(); const G = game; for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } });
  for (const v of views) {
    const ok = await page.evaluate(([v]) => { const G = game, R = v.room === 'citadel' ? null : G.regions.ensure(v.room, 'test'); const cc = R ? R.center || G.regions.centreOf(v.room) : null, c = cc ? [cc.x, cc.z] : [0, 0];   // (PLACE-3: a region keeps its centre in regions.js)
      const f = [v.focus[0] + c[0], v.focus[1] + c[1]], a = [v.at[0] + c[0], v.at[1] + c[1]]; PLACE.stage(v.room, f, a); window.__f = f; return true; }, [v]).catch((e) => String(e).slice(0, 200));
    if (ok !== true) { console.log('VIEW', v.name, 'failed', ok); continue; }
    await page.screenshot({ path: path.join(dir, v.name + '-game.jpg'), type: 'jpeg', quality: 80 });
    // (PLACE-3: DRAWS=1 counts one frame's draw calls and triangles at the game camera's view, all passes; counts only)
    const dc = process.env.DRAWS ? await page.evaluate(() => { const G = game, R = G.renderer.renderer; G.perf.beginFrame(); G.renderer.render(); return [R.info.render.calls + G.perf.sub, R.info.render.triangles]; }) : null;
    const url = await page.evaluate((v) => PLACE.close(window.__f, [], v.span || 4.2, v.dir || null), v);
    fs.writeFileSync(path.join(dir, v.name + '-close.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('VIEW', v.name, 'written' + (dc ? ` draws ${dc[0]} tris ${dc[1]}` : ''));
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
  const D = PLACE.collect(ids);
  // (PLACE-2: outdoors, what the Kit did not place)
  const outIds = ids.filter((id) => D[id]?.outdoor);
  const O = await PLACE.collectOut(outIds);
  for (const id of outIds) D[id].out = O[id];
  return D;
}, ONLY);
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(data));

const all = [];
let pieces = 0, outPieces = 0;
for (const [id, A] of Object.entries(data)) {
  const r = A.outdoor && A.out ? judgeOut(id, A) : judge(id, A); pieces += r.pieces;
  if (A.out?.leftOut?.length) console.log(`LEFT OUT ${id}: ${A.out.leftOut.length} of the original's small things not drawn: ${JSON.stringify(A.out.leftOut.reduce((a, q) => (a[q.why] = (a[q.why] || 0) + 1, a), {}))}`);
  if (A.outdoor && A.out) { outPieces += r.own; console.log(`OUTDOOR ${id}: ${r.pieces} pieces (${r.kit} Kit, ${r.own} built outside it), ${A.out.walls.length} wall parts, ${A.out.doors.length} doors, ${A.out.stairs.length} stairs, ${A.out.walks.length} walkways; not pieces: ${JSON.stringify(A.out.skipped)}`); }
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
    // (PLACE-3: a piece built outside the Kit, outdoors, is A.out's piece i − 100000: its own hull and heights)
    const ownP = (i) => (i >= 100000 ? f.A.out?.pieces?.find((q) => q.i === i - 100000) : null);
    const P = ownP(f.frame) || f.A.frames.find((q) => q.i === f.frame), Q = f.other != null ? ownP(f.other) || f.A.frames.find((q) => q.i === f.other) : null;
    const box = (fr, all, color) => { if (fr.hull) return { hull: fr.hull, y0: fr.y0, y1: fr.y1, color }; const ps = []; const kids = (x) => { ps.push(...x.parts); for (const c of all.frames.filter((c) => c.p === x.i)) kids(c); }; kids(fr); const pts = ps.flatMap((p) => p[0]); return { hull: pts, y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[2])), color }; };
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
// (PLACE-2: the outdoor areas measured beyond the Kit: Citadel's dressing, Zeelich's street, the nine isles; PLACE-3: the
//  Desert and the Hamalayi)
const OUTDOOR = ['citadel', 'zeelich', 'isle_otringal', 'isle_knartas', 'isle_mosquibee', 'isle_celebration', 'isle_undergas', 'isle_platform', 'isle_liftdock', 'isle_orchard', 'isle_oldwatch', 'desert', 'hamalayi'].filter((id) => !ONLY || ONLY.includes(id));
const thin = OUTDOOR.filter((id) => !(data[id]?.out?.pieces?.length >= 20));
check(`the outdoor areas' dressing built outside the Kit measured (${outPieces} pieces; every one of ${OUTDOOR.length} areas ≥ 20)`, !thin.length, thin);
const open_ = all.filter((f) => !f.left);
check(`no piece out of place but those measured and left (${open_.length})`, open_.length === 0, open_.slice(0, 12).map((f) => `${f.room} ${f.kind} ${f.item}#${f.frame} at ${f.at}: ${f.measure}`));
await browser.close();
done();
