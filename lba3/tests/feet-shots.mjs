// FEET-66 pictures: Twinsen walked by input onto each spot (ISO: placed 2.5 m short of it, facing it; ArrowUp held until
// he is on it or stopped), the play camera (the default, Far) left to settle, then a picture, the feet's screen point
// (for a crop), and the numbers: his feet (hero.pos.y) against the top drawn surface over them (tests/lib/sweep.js store).
// OUT=<dir> (default captures/feet-66/raw) TAG=<before|after>. SET=66b: FEET-66B's spots (captures/feet-66b/raw).
// SERVE=1 as the other suites. Automated runtime only.
import { launch, open, menu } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SWEEP = fileURLToPath(new URL('./lib/sweep.js', import.meta.url));
const SET = process.env.SET || '66';
const OUT = process.env.OUT || `captures/feet-${SET}/raw`, TAG = process.env.TAG || 'before', ONLY = process.env.ONLY || '';
fs.mkdirSync(OUT, { recursive: true });
// { id, area, x, z, a (the way he faces at the end: the camera looks along it), d (how far he walks in), what }
export const SPOTS = [
  { id: 'h1-arch-top', area: 'hamalayi', x: 4270, z: 36.9, a: Math.PI, d: 2.0, what: 'Hamalayi, the arch steps\' top tread under the rim\'s snow lip (walked up from the steps)' },
  { id: 'h2-arch-foot', area: 'hamalayi', x: 4270, z: 39.4, a: Math.PI, d: 2.5, what: 'Hamalayi, the foot of the arch steps in the gorge river (water: he wades)' },
  { id: 'h3-shelf', area: 'hamalayi', x: 4218.3, z: 44.1, a: Math.PI / 2, d: 2.5, what: 'Hamalayi gorge, an ice shelf along the bank' },
  { id: 'h4-floe', area: 'hamalayi', x: 4239.7, z: 41.1, a: Math.PI / 2, d: 2.5, what: 'Hamalayi gorge, a floe in the river (walked at)' },
  { id: 'h6-groove', area: 'hamalayi', x: 4243.1, z: -48.55, a: Math.PI / 2, d: 2.5, what: 'Hamalayi vent, the seal ring\'s groove strip' },
  { id: 'h7-lifttop', area: 'hamalayi', x: 4324, z: -27.4, a: 0, d: 2.5, what: 'Hamalayi, the lift\'s top: the ramp to the platform (a collider with nothing drawn on it before)' },
  { id: 'z1-street', area: 'zeelich', x: 2398.3, z: 0, a: Math.PI / 2, d: 2.5, what: 'Zeelich, the paved street' },
  { id: 'z3-dogyard', area: 'zeelich', x: 2370.5, z: -21.5, a: Math.PI / 2, d: 2.0, what: 'Zeelich, the dog yard\'s leaf bed and track (inside its palisade)' },
  { id: 'z2-pad', area: 'zeelich', x: 2376.9, z: 12.3, a: 0, d: 2.5, what: 'Zeelich, the shuttle pad' },
  { id: 'c1-spaceport', area: 'citadel', x: 1.0, z: 38.3, a: 0.3, d: 2.5, what: 'Citadel spaceport, the landing pad' },
  { id: 'b2-deck', area: 'bl_gardens', x: 2974.1, z: -4595.4, a: Math.PI / 2, d: 2.5, what: 'Ballastra Water Gardens, a floating deck' },
  { id: 'c2-plaza', area: 'citadel', x: -49.6, z: -9.4, a: -2.04, d: 2.5, what: 'Citadel square, the ring steps (a question, not changed)' },
];
// FEET-66B (the 122 handed on, class C, the lip): the square's ring steps first
const SPOTS_66B = [
  { id: 'c2-plaza', area: 'citadel', x: -49.6, z: -9.4, a: -2.04, d: 2.5, what: 'Citadel square, the ring steps (FLAT-TOWN): walked up from the street' },
  { id: 'c3-station', area: 'citadel', x: -24.3, z: -72.8, a: -2.01, d: 3, what: 'Citadel, the project station\'s yard: a plate on the platform' },
  { id: 'c8-doorstep', area: 'citadel', x: -56.84, z: -13.5, a: -2.06, d: 3, what: 'Citadel town, a house\'s door step' },
  { id: 'c6-hatch', area: 'citadel', x: -27.77, z: -62.19, a: -2.87, d: 3, what: 'Citadel, the old cellar hatch\'s boards' },
  { id: 'c4-stone', area: 'citadel', x: -37.57, z: 18.3, a: -2.81, d: 2.9, what: 'Citadel, a low stone by the street (no collider before)' },
  { id: 'c9-boulder', area: 'citadel', x: -33.18, z: 48.84, a: -Math.PI / 2, d: 2.6, what: 'Citadel, a boulder (class C: a flat standable top over its dome before)' },
  { id: 'c5-bedrim', area: 'citadel', x: -36.59, z: 69.86, a: -2.06, d: 1.5, what: 'Citadel, a tulip bed\'s rim (its collider over the drawn top before)' },
  { id: 'd1-slab', area: 'desert', x: 3358.95, z: -38.54, a: -2.12, d: 2, what: 'Desert Island, a low slab' },
  { id: 'z4-porch', area: 'zeelich', x: 2389.1, z: -10.5, a: -2.86, d: 2.5, what: 'Zeelich, a porch' },
  { id: 'h8-foldwall', area: 'hamalayi', x: 4275.97, z: 75.8, a: 2.56, d: 3.1, what: 'the Hamalayi landing, a dry-stone fold wall\'s top' },
  { id: 'h1-arch-top', area: 'hamalayi', x: 4270, z: 36.9, a: Math.PI, d: 2.0, what: 'Hamalayi, the arch steps\' top tread and the rim\'s snow lip beside it' },
];
const LIST = SET === '66b' ? SPOTS_66B : SPOTS;
const RUN = LIST.filter((s) => !ONLY || ONLY.split(',').some((o) => s.id.startsWith(o)));

const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine&allregions&nobatch');
await menu(page, 'new');
await page.addScriptTag({ path: SWEEP });
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); });
const out = [];
let storeArea = null;
for (const s of RUN) {
  const r = await ev(async ({ s, need }) => {
    const G = game, h = G.hero, PH = G.physics;
    if (need) { SW.free(); await SW.scan(s.area === 'citadel' ? { bounds: { x0: -215, x1: 63, z0: -123, z1: 155 } } : { room: s.area }, { buildOnly: true }); }
    const sx = s.x - Math.sin(s.a) * s.d, sz = s.z - Math.cos(s.a) * s.d;
    if (s.area === 'citadel') { if (G.room) G.exitRoom({ x: sx, z: sz, a: s.a }, true, true); }
    else if (G.room?.id !== s.area) G.enterRoom(s.area, { x: sx, z: sz, a: s.a }, true, true);
    G.step(0.3); if (G.state !== 'play' || G.trans) P.settle();
    for (const e of G.enemies) if (e.present) e.present = false;
    G.doorCool = 1e6;
    h.pos.set(sx, PH.groundAt(sx, sz, PH.groundAt(s.x, s.z) + 1.5), sz); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.behaviour = 'normal'; h.angle = s.a; G.step(0.2);
    G.input.keys.add('ArrowUp'); let t = 0;
    while (t < 3 && Math.hypot(h.pos.x - s.x, h.pos.z - s.z) > 0.25) { G.step(1 / 30); t += 1 / 30; }
    G.input.keys.delete('ArrowUp'); G.step(1.2);
    const { hits } = SW.raw.column(h.pos.x, h.pos.z);
    const over = hits.filter((q) => q.ny > 0.3 && q.y > h.pos.y - 0.6 && q.y < h.pos.y + 0.7).map((q) => ({ y: +q.y.toFixed(3), what: SW.raw.path(q.oi).slice(0, 50) }));
    G.renderer.render();
    const v = h.pos.clone(); v.project(G.camera);
    G.doorCool = 0;
    return { id: s.id, at: [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(3)), feetPx: [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)], over, top: over[0] ? +(over[0].y - h.pos.y).toFixed(3) : null };
  }, { s, need: storeArea !== s.area });
  storeArea = s.area;
  await page.screenshot({ path: path.join(OUT, `${TAG}-${s.id}.png`) });
  out.push({ ...r, what: s.what });
  console.log(`${TAG} ${s.id}: feet ${r.at[1]} at (${r.at[0]}, ${r.at[2]}); the top drawn surface ${r.top == null ? 'none within 0.7 m' : (r.top >= 0 ? r.top + ' m over his feet' : -r.top + ' m under them')} (${r.over.map((q) => q.y + ' ' + q.what).join('; ')})`);
}
fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(out, null, 1));
await browser.close();
