// WORLD-POLISH 3 (isles-inventory.md, "The camera by keyboard"): Zeelich's islands' tight camera spots walked with the
// KEYBOARD at the user's settings (Follow, Medium, Classic), as tests/camcitadel.mjs walks Citadel's. Every key is a real
// key event (Playwright's page.keyboard, through the game's own key listener); the frames are stepped at 60 fps and
// tests/lib/camwalk.js records every camera update (an island is an outdoor room: the camera reads its R.occ).
// Per walk:
//   - the arm: under 3.1 m no more than 0.15 s in all; under 5 m no longer than 3 s at a stretch (camcitadel's bounds)
//   - never in anything solid the camera knows (a collider, a scenery volume, the terrain)
//   - [visual] never behind a drawn face (inside a closed mesh: an arch's vault, a roof, a wall) more than 6 frames
//   - [visual] out of sight — the lines from the camera to his head and to his chest both cut by the ground, a wall-like
//     collider or a scenery volume (camwalk.js CW.seen; a lamp post, a pole, a rail or a faded roof cut nothing) — no
//     longer than 0.75 s at a stretch (camRig.hiddenBy, the fixed view's own test, is listed beside it)
// The spots: Knartas's gatehouse arch (walked and run through both ways, a turn inside) and the lane behind it; Otringal
// from the fountain to the Grand Hall's steps between its banners, and from the plaza to the new flight's foot and up
// it; the Platform's mine mouth and its village lane; the Orchard's press house. Chapter 5 by its flags.
// SHOTS=<dir> a picture at each walk's least arm; ONLY=<regular expression>; TRACE=1; OUT=<file.json>. GAME_URL as the
// other tests.
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
await ev(async () => {
  const ZI = await import('/src/game/zislands.js'); window.ZI = ZI;
  const G = game, f = G.flags; P.settle();
  Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'steam', c1_water: true, c1_done: true, c5_started: true });
  f.chapter = G.story.chapters.findIndex((c) => c.key === 'steam'); G.hero.hasBall = true;
  G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  // an island's local (x, z) → the world's
  window.ISW = (n, x, z) => { const o = ZI.ISLE_AT(ZI.SLOTS.indexOf(n)); return [o.x + x, o.z + z]; };
});

const N = Math.PI, S = 0, E = Math.PI / 2, Wd = -Math.PI / 2;
// the spots (island, local x, z), and walks: from (x, z) heading a (0 south, π/2 east), keys [[keys], seconds]
const SPOTS = {
  gate: ['knartas', 0.3, -22.25], lane: ['knartas', 8, -22.3], hall: ['otringal', 4, -10], foot: ['otringal', -6.9, -19.5],
  mine: ['platform', 25.5, -12], village: ['platform', 26.5, 2], press: ['orchard', 3, 16],
};
const walk = (spot, name, x, z, a, keys) => ({ spot, name, x, z, a, keys });
const WALKS = [
  walk('gate', 'Knartas gatehouse: walk east through the arch', -8.5, -22.25, E, [[['ArrowUp'], 9.5], [[], 0.8]]),
  walk('gate', 'Knartas gatehouse: walk west through the arch', 8.5, -22.25, Wd, [[['ArrowUp'], 9.5], [[], 0.8]]),
  walk('gate', 'Knartas gatehouse: run east through the arch', -8.5, -22.25, E, [[['Digit2'], 0.05], [['ArrowUp'], 4.5], [[], 0.8]]),
  walk('gate', 'Knartas gatehouse: run west through the arch', 8.5, -22.25, Wd, [[['Digit2'], 0.05], [['ArrowUp'], 4.5], [[], 0.8]]),
  walk('gate', 'Knartas gatehouse: walk in, turn round under the arch, walk back out', -7, -22.25, E, [[['ArrowUp'], 4], [['ArrowLeft'], 1.8], [['ArrowUp'], 4], [[], 0.8]]),
  walk('gate', 'Knartas gatehouse: walk in along its south wall', -8.5, -23.0, E, [[['ArrowUp'], 9.5], [[], 0.8]]),
  walk('lane', 'Knartas lane behind the gatehouse: out of the arch and up the lane north-east', 3, -22.25, E, [[['ArrowUp'], 2.5], [['ArrowUp', 'ArrowLeft'], 0.5], [['ArrowUp'], 4], [[], 0.8]]),
  walk('hall', 'Otringal: from the fountain south to the Grand Hall between its banners', -2.3, 6.7, Math.atan2(7.9, -22.9), [[['ArrowUp'], 10], [[], 0.8]]),
  walk('hall', 'Otringal: along the Grand Hall\'s front west to the new flight', 6, -15.5, Wd, [[['ArrowUp'], 5.5], [['ArrowUp', 'ArrowLeft'], 0.6], [['ArrowUp'], 2], [[], 0.8]]),
  walk('foot', 'Otringal: from the plaza to the new flight\'s foot and up it', -4, -12.5, Math.atan2(-2.9, -7), [[['ArrowUp'], 3.5], [['ArrowUp'], 5], [[], 0.8]]),
  walk('foot', 'Otringal: down the new flight to the plaza', -6.9, -28.2, S, [[['ArrowUp'], 6], [[], 0.8]]),
  walk('mine', 'Platform: from the yard south to the mine mouth', 26, -21, S, [[['ArrowUp'], 6], [[], 0.8]]),
  walk('village', 'Platform: up the village lane from the mine', 26.2, -4, S, [[['ArrowUp'], 6], [[], 0.8]]),
  walk('press', 'Orchard: from the cloud catcher down to the press house', -0.7, 5.5, Math.atan2(4.2, 13), [[['ArrowUp'], 7], [[], 0.8]]),
];
const walks = WALKS.filter((w) => !ONLY || new RegExp(ONLY).test(w.name));
const results = [];
let lastSpot = null;
for (const w of walks) {
  const [isle, sx, sz] = SPOTS[w.spot];
  if (lastSpot !== w.spot) {
    const n = await ev(([isle, sx, sz]) => { const [x, z] = ISW(isle, sx, sz); CW.place({ room: 'isle_' + isle, x, z, a: 0 }); return CW.tris({ x0: x - 24, x1: x + 24, z0: z - 24, z1: z + 24 }); }, [isle, sx, sz]);
    lastSpot = w.spot; console.log('  surfaces round', w.spot, JSON.stringify(n));
  }
  const run = async (stopAt = -1) => {
    const start = await ev(([isle, w]) => { const [x, z] = ISW(isle, w.x, w.z); const p = CW.place({ room: 'isle_' + isle, x, z, a: w.a }); CW.start(); return { at: p, room: game.room?.id }; }, [isle, w]);
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
  const trace = await ev(() => CW.trace(6));
  const unseenRun = st.unseenMax / 60;
  results.push({ name: w.name, spot: w.spot, start, ...st, unseenRun, trace });
  console.log(`- ${w.name}: in ${start.room} from ${JSON.stringify(start.at)} arm min ${st.minArm} (@${st.minAt}), <3.1 ${st.under31} s, <5 m ${st.under5} s (run ${st.under5run}), inside ${st.inside}${st.insWhy ? ' ' + st.insWhy : ''}, behind a face ${st.behindFace}${st.backWho ? ' ' + st.backWho : ''}, out of sight ${st.unseen} (longest ${st.unseenMax}), hiddenBy ${st.hidden} (longest ${st.hidMax}${st.hidWho ? ' ' + st.hidWho : ''}), near-cut ${st.xray}, frames ${st.frames}, end ${JSON.stringify(st.end)}`);
  if (process.env.TRACE) console.log(trace.join('\n'));
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    // (at the least arm; and in the middle of the longest stretch out of sight, where there is one of 10 frames or more)
    for (const [at, tag] of [[st.minAt, ''], ...(st.unseenMax >= 10 ? [[st.unseenAt, '-unseen']] : [])]) {
      const file = path.join(SHOTS, w.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + tag + '.png');
      await run(at);
      await ev(() => { CW.on = false; game.renderer.render(); });
      await page.screenshot({ path: file, timeout: 300000 });
      for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) await page.keyboard.up(k);
    }
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

for (const r of results) {
  const ok = r.frames > 60 && r.under31 <= 0.15 && r.under5run <= 3 && r.inside === 0 && /^isle_/.test(r.start.room || '');
  check(`${r.name}: on the island, under 3.1 m ≤ 0.15 s, under 5 m ≤ 3 s at a stretch, never in a collider, volume or the ground`, ok,
    { room: r.start.room, frames: r.frames, minArm: r.minArm, under31: r.under31, under5run: r.under5run, inside: r.inside, insWhy: r.insWhy, end: r.end });
  checkVisual(`${r.name}: behind a drawn face (inside a mesh) on at most 6 frames`, r.behindFace <= 6, { behindFace: r.behindFace, backWho: r.backWho, backCam: r.backCam, minSurf: r.minSurf });
  checkVisual(`${r.name}: out of sight (head and chest both cut) no longer than 0.75 s at a stretch`, r.unseenRun <= 0.75, { unseen: r.unseen, longest: r.unseenMax, hiddenBy: r.hidden, hiddenByLongest: r.hidMax, hiddenByWho: r.hidWho });
}
await browser.close();
done();
