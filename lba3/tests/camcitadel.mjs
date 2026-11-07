// CAM-KEYWALK (the user on Follow, Medium, Citadel: "the camera zooms in on Twinsen when climbing the stairs", "the camera
// lost balance and is not behind Twinsen", "in this passage the camera goes crazy"): Citadel's tight spots walked with
// the KEYBOARD, the user's settings (Follow, Medium, Classic). Every key is a real key event (Playwright's
// page.keyboard down/up, through the game's own key listener): Up walks, Left/Right turn him on the spot or as he
// walks, Down backs him up, 1 walks and 2 runs (Normal / Athletic). The frames are stepped at 60 fps (game.testFreeze).
// For each walk (tests/lib/camwalk.js records every camera update):
//   - the arm (the camera to his pivot): under 3.1 m (a zoom onto his back) no more than 0.15 s in all; under 5 m no
//     longer than 3 s at a stretch (Medium's arm is 8.75 m; with his back to a wall MIN-VIEW holds 3.2 m over his head)
//   - the view's heading no more than 55° off his back while he walks a steady way (his facing held 0.6 s, moving)
//   - never in anything solid the camera knows: a collider, a scenery volume, the terrain (0.3 m)
//   - [visual] never behind a drawn face (inside a closed mesh: a rock, a cliff, a roof, a cornice) more than 6 frames
//   - listed, not judged: drawn faces cut open by the near plane in front of the lens (NEAR-CUT cuts what stands within
//     1 m of it on purpose: an eave, a branch, a post the camera stands just behind)
// The spots (CAM-KEYWALK's list, SPOTS below): the hostel's front door (out of it, turning from it, past it, a turn on
// the spot); the terrace's west corner at the fort wall; behind Twinsen's house; the alley by the house; along the
// house's west wall; Dino-Fly's rise; the street to the stepping stones; the pier's start by the hut; the water meter
// behind the Bug-street house; the station yard; the passage by the fort's south-west tower; the climb's flight to the
// fort walked and run up and down, from the ramp, turned mid-flight and at the top. The walks through a spot come from a
// sweep (SWEEP=1: every spot walked through from 8 headings and turned on the spot) — the ways the base went wrong.
// OUT=<file.json> keeps every walk's numbers (the before/after comparison); SHOTS=<dir> a picture at each walk's least
// arm; ONLY=<regular expression> runs some walks; TRACE=1 prints each walk's frames. GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, checkVisual, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS || '', ONLY = process.env.ONLY || '', OUT = process.env.OUT || '';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/camwalk.js', import.meta.url)) });
const setup = await ev(() => CW.setup());
check('the user\'s settings: Follow, Medium, Classic controls', setup.cam === 'follow' && setup.dist === 'medium' && setup.controls === 'classic', setup);

const N = Math.PI, S = 0, E = Math.PI / 2, Wd = -Math.PI / 2;
// the spots' middles (the drawn triangles are gathered round them; the level to stand on where two are stacked)
const SPOTS = { 1: [-26.8, -48.8, 16], 2: [-29.3, -49.6, 16], 3: [-45.6, 84], 4: [-46.1, 80.9], 5: [-54.8, 75.5], 6: [-54, 92], 7: [-64, -18], 8: [-118, 46], 9: [-67.3, -12.9], 10: [-28, -60], 11: [-38, -49.5, 14.2], 12: [-32.6, -38] };
// a walk through spot `id` heading `deg` (0 south, 90 east, 180 north, 270 west): from 3 m before it (nearer where that
// stands in a house: CW.place), Up for `s` s
// (run: Athletic)
const thru = (id, deg, name, { s = 3.5, run = false } = {}) => {
  const [x, z, y] = SPOTS[id], a = (deg * Math.PI) / 180;
  return { name, thru: [x, z, y], x: x - Math.sin(a) * 3, z: z - Math.cos(a) * 3, y, a, spot: id, keys: [...(run ? [[['Digit2'], 0.05]] : []), [['ArrowUp'], s], [[], 0.8]] };
};
// turned on the spot a whole turn (Left, Normal's 100°/s)
const turn = (id, name, a = 0) => { const [x, z, y] = SPOTS[id]; return { name, x, z, y, a, spot: id, keys: [[['ArrowLeft'], 3.6], [[], 0.8]] }; };
// a walk: where he starts (x, z, heading a; y: the level to stand on), and the keys: [[keys], seconds]
// (exit: out of the hostel's front door first, the game's own exit)
const WALKS = [
  { name: 'hostel door: facing it, turn round and walk south', x: -26.8, z: -48.8, a: N, keys: [[['ArrowLeft'], 1.8], [['ArrowUp'], 3], [[], 1]], spot: 1 },
  { name: 'hostel door: out of the door, walk south', exit: 'asylum-front', keys: [[['ArrowUp'], 3], [[], 1]], spot: 1 },
  { name: 'hostel door: out of the door, turn right and walk west', exit: 'asylum-front', keys: [[['ArrowRight'], 0.9], [['ArrowUp'], 2], [[], 1]], spot: 1 },
  { name: 'hostel door: walk up to it, turn round, run south', x: -26.8, z: -45.5, a: N, keys: [[['ArrowUp'], 1.6], [[], 0.3], [['ArrowRight'], 1.8], [['Digit2'], 0.05], [['ArrowUp'], 2], [[], 1]], spot: 1 },
  thru(1, 45, 'hostel door: walk past it heading south-east'),
  thru(1, 270, 'hostel door: walk west past it along the portico'),
  turn(1, 'hostel door: a whole turn on the spot'),
  { name: 'terrace west corner: push north into the fort wall', x: -29.3, z: -47.5, a: N, keys: [[['ArrowUp'], 2.5], [[], 1.5]], spot: 2 },
  turn(2, 'terrace west corner: a whole turn at the wall'),
  thru(2, 45, 'terrace west corner: walk through heading south-east'),
  { name: 'behind the house: face north and stand', x: -45.6, z: 84, a: S, keys: [[['ArrowLeft'], 1.8], [[], 2]], spot: 3 },
  thru(3, 45, 'behind the house: walk through heading south-east'),
  thru(3, 90, 'behind the house: walk east past its corner'),
  thru(3, 135, 'behind the house: walk through heading north-east'),
  thru(4, 0, 'house alley: walk south along the wall'),
  thru(4, 135, 'house alley: walk through heading north-east'),
  turn(4, 'house alley: a whole turn by the wall'),
  thru(5, 180, 'house west wall: walk north along it'),
  thru(5, 225, 'house west wall: walk through heading north-west'),
  thru(5, 270, 'house west wall: walk west away from it'),
  { name: 'Dino-Fly rise: face west and stand', x: -54, z: 92, a: E, keys: [[['ArrowLeft'], 1.8], [[], 2]], spot: 6 },
  thru(6, 270, 'Dino-Fly rise: walk west'),
  thru(7, 135, 'stepping-stones street: walk through heading north-east'),
  thru(7, 180, 'stepping-stones street: walk north'),
  thru(7, 225, 'stepping-stones street: walk through heading north-west'),
  turn(7, 'stepping-stones street: a whole turn'),
  thru(8, 225, 'pier start by the hut: walk through heading north-west'),
  turn(8, 'pier start by the hut: a whole turn'),
  thru(9, 225, 'water meter behind the Bug-street house: walk through heading north-west'),
  thru(9, 270, 'water meter behind the Bug-street house: walk west'),
  thru(9, 315, 'water meter behind the Bug-street house: walk through heading south-west'),
  thru(10, 135, 'station yard: walk through heading north-east'),
  thru(10, 180, 'station yard: walk north'),
  thru(10, 225, 'station yard: walk through heading north-west'),
  turn(10, 'station yard: a whole turn'),
  thru(11, 270, 'SW tower passage: walk west'),
  thru(11, 90, 'SW tower passage: walk east'),
  thru(11, 315, 'SW tower passage: walk through heading south-west'),
  thru(11, 270, 'SW tower passage: run west', { run: true, s: 2 }),
  turn(11, 'SW tower passage: a whole turn'),
  { name: 'climb: walk up the flight', x: -32.6, z: -29, a: N, keys: [[['ArrowUp'], 10], [[], 1]], spot: 12 },
  { name: 'climb: run up the flight', x: -32.6, z: -29, a: N, keys: [[['Digit2'], 0.05], [['ArrowUp'], 4.5], [[], 1]], spot: 12 },
  { name: 'climb: walk down the flight', x: -32.6, z: -46, a: S, keys: [[['ArrowUp'], 9], [[], 1]], spot: 12 },
  { name: 'climb: run down the flight', x: -32.6, z: -46, a: S, keys: [[['Digit2'], 0.05], [['ArrowUp'], 4], [[], 1]], spot: 12 },
  { name: 'climb: walk up, turn round mid-flight, walk down', x: -32.6, z: -33, a: N, keys: [[['ArrowUp'], 3], [['ArrowLeft'], 1.8], [['ArrowUp'], 2.5], [[], 1]], spot: 12 },
  { name: 'climb: walk up, stop mid-flight, back down a little', x: -32.6, z: -33, a: N, keys: [[['ArrowUp'], 3], [[], 0.5], [['ArrowDown'], 1.5], [[], 1]], spot: 12 },
  { name: 'climb: run up, turn right at the top', x: -32.6, z: -33, a: N, keys: [[['Digit2'], 0.05], [['ArrowUp'], 2.6], [['ArrowUp', 'ArrowRight'], 1.0], [['ArrowUp'], 1.5], [[], 1]], spot: 12 },
  { name: 'climb: run up, turn left at the top, run on west', x: -32.6, z: -33, a: N, keys: [[['Digit2'], 0.05], [['ArrowUp'], 2.6], [['ArrowUp', 'ArrowLeft'], 1.0], [['ArrowUp'], 1.5], [[], 1]], spot: 12 },
  { name: 'climb: walk up from the ramp, turning onto the flight', x: -36.2, z: -24, a: Math.PI * 0.94, keys: [[['ArrowUp'], 2], [['ArrowUp', 'ArrowRight'], 0.4], [['ArrowUp'], 7], [[], 1]], spot: 12 },
  turn(12, 'climb: a whole turn mid-flight'),
];
// SWEEP=1: every spot walked through from 8 headings (from 3 m before it, 3.5 s of Up) and turned on the spot 360°
// (Left, 3.6 s): to find which way the review's spots go wrong
if (process.env.SWEEP) {
  WALKS.length = 0;
  for (const [id, [x, z, y]] of Object.entries(SPOTS)) {
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; WALKS.push({ name: `sweep ${id} through h${k * 45}`, x: x - Math.sin(a) * 3, z: z - Math.cos(a) * 3, y, a, keys: [[['ArrowUp'], 3.5], [[], 0.8]], spot: +id }); }
    WALKS.push({ name: `sweep ${id} turn`, x, z, y, a: 0, keys: [[['ArrowLeft'], 3.6], [[], 0.8]], spot: +id });
  }
}
const walks = WALKS.filter((w) => !ONLY || new RegExp(ONLY).test(w.name));   // (ONLY: a regular expression)
const results = [];
let lastBox = null;
for (const w of walks) {
  // the drawn triangles round the walk's spot (built again when the walk is elsewhere)
  const [bx, bz] = SPOTS[w.spot];
  const box = { x0: Math.round(bx) - 22, x1: Math.round(bx) + 22, z0: Math.round(bz) - 22, z1: Math.round(bz) + 22 };
  if (!lastBox || lastBox.x0 !== box.x0 || lastBox.z0 !== box.z0) { const n = await ev(([b, s]) => { CW.place({ x: s[0], z: s[1], y: s[2], a: 0 }); return CW.tris(b); }, [box, SPOTS[w.spot]]); lastBox = box; console.log("  surfaces round", w.name, n); }   // (Citadel drawn: placed there first)
  const run = async (stopAt = -1) => {
    const start = await ev(async (w) => {
      if (w.exit) {
        const G = game, to = (await import('./src/game/lba1places.js')).lba1Exit(w.exit);
        CW.place({ x: -26.5, z: -45, a: 0 });
        if (!to) return { none: true };
        G.enterRoom('asylum', null, true); G.step(0.5);
        G.exitRoom(G.doorStep(to), true); CW.start();
        return { at: [G.hero.pos.x, G.hero.pos.y, G.hero.pos.z].map((u) => +u.toFixed(2)), a: +G.hero.angle.toFixed(2) };
      }
      const p = CW.place(w); CW.start(); return { at: p };
    }, w);
    let stopped = false;
    for (const [keys, s] of w.keys) {
      for (const k of keys) await page.keyboard.down(k);
      if (!stopped) stopped = await ev(([s, stopAt]) => CW.step(s, 60, stopAt), [s, stopAt]);
      for (const k of keys) await page.keyboard.up(k);
      if (stopped) break;
    }
    return start;
  };
  const start = await run();
  const st = await ev(() => CW.stop());
  const trace = await ev(() => CW.trace(15));
  results.push({ name: w.name, spot: w.spot, start, ...st, trace });
  console.log(`- ${w.name}: from ${JSON.stringify(start.at)} arm min ${st.minArm} (@${st.minAt}), <5 m ${st.under5} s (run ${st.under5run}), off-back ${st.maxOffSteady}° steady / ${st.maxOff}° all, inside ${st.inside}${st.insWhy ? ' ' + st.insWhy : ''}, behind a face ${st.behindFace}${st.backWho ? ' ' + st.backWho : ''}, x-ray ${st.xray}${st.xrWho ? ' ' + st.xrWho : ''}, surface ${st.minSurf} m, unseen ${st.unseen}/${st.frames}, end ${JSON.stringify(st.end)}`);
  if (process.env.TRACE) console.log(trace.join('\n'));
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    const file = path.join(SHOTS, w.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png');
    await run(st.minAt);
    await ev(() => { CW.on = false; game.renderer.render(); });
    await page.screenshot({ path: file, timeout: 300000 });
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) await page.keyboard.up(k);
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

// the checks: per walk, against CAM-KEYWALK's bounds
for (const r of results) {
  const ok = r.frames > 60 && r.under31 <= 0.15 && r.under5run <= 3 && r.maxOffSteady <= 55 && r.inside === 0;
  check(`${r.name}: under 3.1 m ≤ 0.15 s, under 5 m ≤ 3 s at a stretch, ≤ 55° off his back walking steady, never in a collider, volume or the ground`, ok,
    { frames: r.frames, minArm: r.minArm, under31: r.under31, under5: r.under5, under5run: r.under5run, maxOffSteady: r.maxOffSteady, inside: r.inside, insWhy: r.insWhy, end: r.end });
  checkVisual(`${r.name}: behind a drawn face (inside a mesh) on at most 6 frames`, r.behindFace <= 6, { behindFace: r.behindFace, backWho: r.backWho, minSurf: r.minSurf, nearCut: r.xray, nearCutWho: r.xrWho });
}
await browser.close();
done();
