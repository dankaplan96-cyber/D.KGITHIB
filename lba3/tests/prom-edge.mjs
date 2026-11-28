// C66 (ORDER 66.2, the desktop on the real GPU, 22.11): the promenade on Citadel's sea wall, by held keys (Classic: Up
// walks, the heading set once at the start, as a player lines up and holds Up).
//   1. the water main's meter cabinet: walked south from the walk's north end, past the main's last trestle (which steers
//      him to x −72.95), he goes on past the cabinet (he stopped at its north face, 9 s, where it stood 0.7 m into the
//      walk); its collider is the drawn cabinet's outline (the brass coping and the front fittings)
//   2. the rail and the lanterns are the walk's edge: from inside, at every gap between the rails (the lantern pairs),
//      the two ends, straight at the line and on the slant, walking and with a jump, he never stands on the coping
//      outside the line (x −74.82); from the walk's north-west corner he does not go down the slope west of it (onto the
//      coping, or over the cliff into the sea), nor from the shelf's top above that slope onto the coping
//   3. the whole walk inside the rail, north end to the bollards at the south end: nothing new in the way
//   4. old saves: on the coping outside the rail and inside the cabinet where it stands now: load standing on the walk,
//      inside the rail, free to walk
// SHOTS=dir: pictures from the play camera at the end of some walks (default none).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const SHOTS = process.env.SHOTS || '';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const CAMWALK = fileURLToPath(new URL('./lib/camwalk.js', import.meta.url));
const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await ev(() => game.renderer.render()); await page.screenshot({ path: `${SHOTS}/${name}.jpg`, type: 'jpeg', quality: 82 }); };
const helpers = () => ev(() => {
  // a walk by held keys from (x, z) facing a (0 = +z, south): the trace, the longest stall, frames in the air, the
  // westmost x reached while on the walk's level (y over 5.9) and how long he stood on the coping outside the line
  window.walk = (x, z, a, s, { run = false, jumpAt = -1 } = {}) => {
    const h = game.hero;
    CW.place({ x, z, a });
    h.behaviour = run ? 'athletic' : 'normal';
    for (let i = 0; i < 10; i++) game.frame(1 / 60, false);
    game.input.keys.add('ArrowUp');
    const tr = []; let run0 = 0, maxStall = 0, minX = 1e9, out = 0;
    for (let i = 0; i < s * 60; i++) {
      const px = h.pos.x, pz = h.pos.z;
      if (i === jumpAt) game.input.taps.add('Space');
      game.frame(1 / 60, false);
      if (Math.hypot(h.pos.x - px, h.pos.z - pz) < 0.004) { run0++; maxStall = Math.max(maxStall, run0); } else run0 = 0;
      if (h.pos.y > 5.9) minX = Math.min(minX, h.pos.x);
      if (h.pos.x < -74.82 && h.pos.z > -29.45 && h.pos.z < 18.7 && h.pos.y > 5.9) out++;
      if (i % 15 === 0) tr.push([+h.pos.x.toFixed(2), +h.pos.z.toFixed(2), +h.pos.y.toFixed(2)]);
    }
    game.input.keys.delete('ArrowUp');
    for (let i = 0; i < 30; i++) game.frame(1 / 60, false);
    const p = h.pos;
    return { end: [+p.x.toFixed(2), +p.z.toFixed(2), +p.y.toFixed(2)], maxStall: +(maxStall / 60).toFixed(2), minX: +minX.toFixed(2), out, tr: tr.slice(-6), hp: h.hp, ground: h.onGround };
  };
});

await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: CAMWALK });
await ev(() => CW.setup());
await helpers();
await ev(() => { game.camRig.setMode('follow'); game.camRig.setFollowDistance?.('far'); });

// ---------------------------------------------------------------- 1. the meter cabinet
let r = await ev(() => {
  const C = game.physics.colliders.filter((c) => c.type === 'box' && Math.abs(c.z + 17) < 0.01 && c.x > -72.5 && c.x < -70 && c.hw > 1);
  const c = C[0]; if (!c) return { none: true };
  // its world footprint (rot π/2: local x along −z, local z along +x)
  return { n: C.length, x0: +(c.x - c.hd).toFixed(3), x1: +(c.x + c.hd).toFixed(3), z0: +(c.z - c.hw).toFixed(3), z1: +(c.z + c.hw).toFixed(3), top: +c.top.toFixed(2) };
});
// (the drawn cabinet, island.js buildMeter round PIPE_METER (−71.2, −17): the coping 2.4 m along z, 2.2 m along x; the
//  sight tube's rings on the east face to 1.21 m)
check('1. the cabinet\'s collider is its drawn outline (coping x −72.30…−70.10, z −18.2…−15.8; fittings to −69.99)', r.n === 1 && Math.abs(r.x0 + 72.3) < 0.01 && Math.abs(r.x1 + 69.99) < 0.01 && Math.abs(r.z0 + 18.2) < 0.01 && Math.abs(r.z1 + 15.8) < 0.01, r);
check('1. the cabinet stands off the walk (its west face on the walk\'s inland edge, x −72.29)', r.x0 >= -72.31, r);
r = await ev(() => walk(-73.7, -27, 0, 12));
check('1. south from the walk\'s north end (the trestle steers him to x −72.95): past the cabinet, never held', r.end[1] > -10 && r.maxStall < 0.3, r);
await shot('meter-passed');
r = await ev(() => walk(-72.75, -21, 0, 5));
check('1. south along the walk\'s inland edge (x −72.75): past the cabinet\'s west face', r.end[1] > -13 && r.maxStall < 0.3, r);
r = await ev(() => walk(-73.7, -10, Math.PI, 8));
check('1. north past it again, to the trestle (a brush of the trestle\'s leg on the walk, no hold)', r.end[1] < -20 && r.maxStall < 1.0, r);

// ---------------------------------------------------------------- 2. the rail's line
// (the gaps between the rails, where the lantern pairs stand, and the two ends; heading west −π/2, and 30° either way)
const W = -Math.PI / 2;
const tries = [];
for (const z of [-28.9, -20.2, -11.0, -1.55, 7.9, 17.15, 18.0]) for (const da of [0, -0.52, 0.52]) tries.push([z, da]);
let worst = null, outN = 0;
for (const [z, da] of tries) {
  const w = await ev(({ z, a }) => walk(-73.6, z, a, 2.5), { z, a: W + da });
  if (w.out) outN++;
  if (!worst || w.minX < worst.minX) worst = { z, da, ...w };
}
check(`2. into the rail's line at its gaps and ends, straight and on the slant (${tries.length} walks): never on the coping outside it`, outN === 0 && worst.minX > -74.82, { outN, worst });
await shot('rail-gap');
// with a jump at the line, and running
let jumpWorst = null, jumpOut = 0;
for (const z of [-20.2, -11.0, -1.55, 7.9, 17.15]) {
  const w = await ev(({ z }) => walk(-73.9, z, -Math.PI / 2, 2.5, { run: true, jumpAt: 20 }), { z });
  if (w.out) jumpOut++;
  if (!jumpWorst || w.minX < jumpWorst.minX) jumpWorst = { z, ...w };
}
check('2. running at the gaps with a jump: never on the coping outside the line', jumpOut === 0 && jumpWorst.minX > -74.82, { jumpOut, jumpWorst });
// round the north end: west and north-west from the walk's north end (the slope there ran down onto the coping and over
// the cliff into the sea), and south from the shelf's top above that slope
for (const [x, z, a] of [[-74.2, -29.2, -Math.PI / 2], [-74.3, -30.0, -Math.PI / 2], [-74.2, -29.7, -2.4]]) {
  r = await ev(({ x, z, a }) => walk(x, z, a, 2.5), { x, z, a });
  check(`2. from the walk's north end (${x}, ${z}) heading ${a.toFixed(2)}: not past the line, not into the sea`, r.out === 0 && r.minX > -75.2 && r.hp === 10, r);
}
r = await ev(() => walk(-75.6, -32.4, 0.3, 3));
check('2. from the shelf\'s top above the slope west of the walk, south: never on the coping (that slope ends over the cliff in the sea, as it did: not changed here)', r.out === 0, r);

// ---------------------------------------------------------------- 3. the walk inside the rail, end to end
r = await ev(() => walk(-73.9, -28.5, 0, 26));
check('3. the whole walk inside the rail, north end to the bollards at its south end (z 18.7): no stop on the way', r.end[1] > 17.5 && r.minX > -74.6, r);
r = await ev(() => walk(-72.95, 17.6, Math.PI, 26));   // (between the main's trestle legs: west of them a leg and the first rail leave 0.6 m)
check('3. and back north to the walk\'s north end', r.end[1] < -27 && r.minX > -74.6, r);

// ---------------------------------------------------------------- 4. old saves
const oldSave = async (x, z) => {
  await ev(({ x, z }) => {
    if (game.room) game.exitRoom({ x: -42, z: -2, a: 0 }, true, true); P.settle(); game.save(false);
    const s = JSON.parse(localStorage.getItem('lba3_save_v1')); s.room = null; s.hero.x = x; s.hero.z = z;
    localStorage.setItem('lba3_save_v1', JSON.stringify(s));
  }, { x, z });
  await open(page, '?nocine');
  await menu(page, 'continue');
  await page.addScriptTag({ path: CAMWALK });
  await ev(() => CW.setup());
  await helpers();
  return ev(() => {
    P.settle(); game.step(1);
    const h = game.hero, p = h.pos, x0 = p.x, z0 = p.z, y0 = p.y, ov = game.physics.overlapAt(p.x, p.z, p.y, h.radius), hp = h.hp;
    let moved = 'stuck';
    for (const [dx, dz] of [[0.3, 1.2], [0.3, -1.2], [1.2, 0.3]]) if (P.go(x0 + dx, z0 + dz, { tol: 0.4, maxT: 10 }).r === 'arrived') { moved = 'arrived'; break; }
    return { at: [+x0.toFixed(2), +z0.toFixed(2), +y0.toFixed(2)], ov: +ov.toFixed(3), ground: h.onGround, state: game.state, moved, hp, hp1: h.hp };
  });
};
for (const [x, z] of [[-75.22, -5.0], [-75.5, 10.0], [-75.6, -25.0], [-75.6, -30.5]]) {
  r = await oldSave(x, z);
  check(`4. an old save on the coping outside the rail or the slope west of the walk's end (${x}, ${z}): loads on the walk inside it, standing, free to walk`, r.state === 'play' && r.ground && r.ov < 0.03 && r.at[0] > -74.5 && Math.abs(r.at[2] - 6.06) < 0.05 && r.moved === 'arrived' && r.hp1 === r.hp, r);
}
for (const [x, z] of [[-70.5, -17.0], [-70.2, -16.0]]) {
  r = await oldSave(x, z);
  check(`4. an old save where the cabinet stands now (${x}, ${z}): loads on the walk beside it, standing, free to walk`, r.state === 'play' && r.ground && r.ov < 0.03 && r.at[0] < -72.6 && r.at[0] > -74.5 && Math.abs(r.at[2] - 6.06) < 0.05 && r.moved === 'arrived', r);
}
done();
await browser.close();
