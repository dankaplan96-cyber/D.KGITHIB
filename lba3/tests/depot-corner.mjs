// DEPOT-CORNER (release audit v75, F12): the Zeelich depot's back corner by the locker (chapter 3). Walked into from the
// west or the south, Twinsen was wedged between the back fence and a crate stack (a slot 0.5 m wide; he is 0.8 m) and
// could not move in any of 8 headings; a save made there loaded him wedged again. The slots along the back fence are shut
// now (src/game/zeelich.js buildDepot) and a save made overlapping something loads him on the nearest clear spot
// (src/main.js unwedge).
//   1. along the back fence, nowhere he can stand overlaps two things at once (a scan of the strip, physics only)
//   2. walked by input (Up held, facing the old corner) from the west, south-west, south, south-east and east, and the
//      same at the other two old slots (north of the east crate and of the shed): wherever he ends, he walks out —
//      at least 3 of 8 headings move him more than 0.5 m, Down steps him back, and he walks to the middle of the yard
//   3. Save & quit in the corner → Continue: he stands clear of everything and walks out
//   4. an old save made at the old trap spot (2411.6, 24.7): Continue puts him clear within 3 m, in the depot (not
//      through the fence), and he walks out
// ISO (logged): chapter 3 is reached by its flags (as tests/zeelich-life.mjs); the starts are placed; the depot's
// drones are kept off (present = false) so no fight is mixed into the walking; the old save is written into storage.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const CORNER = { x: 2411.6, z: 24.7 };

const setup = async () => {
  await ev(() => {
    const G = game;
    window.DC = {
      hold: (keys, s) => { for (const k of keys) G.input.keys.add(k); G.step(s); for (const k of keys) G.input.keys.delete(k); G.step(0.2); },
      calm: () => { for (const e of G.enemies) if (e.present && e.pos.distanceTo(G.hero.pos) < 40) e.present = false; },
      ov: () => +G.physics.overlapAt(G.hero.pos.x, G.hero.pos.z, G.hero.pos.y, G.hero.radius).toFixed(3),
      // from where he stands: Up after facing each of 8 headings (0.8 s), Down (0.8 s), then a walk to the yard's middle
      out: () => {
        const h = G.hero, at = [h.pos.x, h.pos.y, h.pos.z], up8 = [];
        for (let k = 0; k < 8; k++) { h.pos.set(at[0], at[1], at[2]); h.angle = k * Math.PI / 4; G.step(0.1); const x0 = h.pos.x, z0 = h.pos.z; DC.hold(['ArrowUp'], 0.8); up8.push(+Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2)); }
        h.pos.set(at[0], at[1], at[2]); G.step(0.1);
        const x1 = h.pos.x, z1 = h.pos.z; DC.hold(['ArrowDown'], 0.8); const back = +Math.hypot(h.pos.x - x1, h.pos.z - z1).toFixed(2);
        h.pos.set(at[0], at[1], at[2]); G.step(0.1);
        const D = G.rooms.zeelich.depot, g = P.go(D.x, D.z, { tol: 0.8, fight: false, maxT: 40 });
        return { at: [at[0], at[2]].map((u) => +u.toFixed(2)), up8, free: up8.filter((d) => d > 0.5).length, back, toYard: g.r };
      },
    };
  });
};

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 2 finished by flags (as tests/zeelich-life.mjs): story.nextChapter() starts chapter 3 on Zeelich');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await setup();
const at0 = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey }));
check('chapter 3 on Zeelich', at0.room === 'zeelich' && at0.ch === 'zeelich', at0);

// ---- 1. the back strip: nowhere clear of the ground's rules is he squeezed between two things
const s1 = await ev(() => {
  const G = game, P0 = G.physics, r = G.hero.radius, bad = [];
  let n = 0;
  for (let x = 2404.3; x <= 2423.7; x += 0.1) for (let z = 21.5; z <= 24.95; z += 0.1) {
    const y = P0.groundAt(x, z, 8), hit = P0.near(x, z).filter((c) => P0.stops(c, y) && P0._inside(c, x, z, r) && !P0._inside(c, x, z, 0));
    n++;
    // two things reaching a little into him from opposite sides (pushes more than 145° apart, each under 0.2 m): a slot
    // narrower than he is that he can still squeeze into (a gap of 0.4–0.8 m; a narrower one he never gets into)
    if (hit.length >= 2) {
      const ps = hit.map((c) => P0._push(c, x, z, r)).filter(Boolean);
      const L = (p) => Math.hypot(p.x, p.z);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (L(ps[i]) > 0.02 && L(ps[j]) > 0.02 && L(ps[i]) < 0.2 && L(ps[j]) < 0.2 && (ps[i].x * ps[j].x + ps[i].z * ps[j].z) / (L(ps[i]) * L(ps[j])) < -0.8) { bad.push([+x.toFixed(1), +z.toFixed(1)]); i = ps.length; break; }
    }
  }
  return { sampled: n, squeezed: bad.length, first: bad.slice(0, 8) };
});
check('1. the depot\'s back strip (x 2404–2424, z 21.5–25): no slot he can squeeze into narrower than he is (two things pushing him from opposite sides)', s1.squeezed === 0, s1);

// ---- 2. walked into the corner (and the other two old slots) by input, then out
iso('the depot\'s drones kept off (present = false) for the walks; each start placed (logged)');
const s2 = await ev((C) => {
  const G = game, h = G.hero, P0 = G.physics, res = [];
  DC.calm();
  const targets = [[C.x, C.z, 'old corner'], [2417.6, 24.8, 'north of the east crate'], [2420.6, 24.9, 'north of the shed']];
  const from = [[-3, 0, 'west'], [-2.2, -2.2, 'south-west'], [0, -3, 'south'], [2.2, -2.2, 'south-east'], [3, 0, 'east']];
  for (const [tx, tz, tn] of targets) for (const [dx, dz, fn] of from) {
    // the start: 3 m off, or (inside something there now) the nearest clear spot to it in the yard
    let sx = tx + dx, sz = tz + dz, ok = false;
    const clear = (x, z) => z < 24.9 && x > 2404.6 && x < 2423.4 && P0.overlapAt(x, z, P0.groundAt(x, z, 8), h.radius + 0.05) === 0;
    for (let d = 0; d <= 2.6 && !ok; d += 0.2) for (let k = 0; k < (d ? 16 : 1) && !ok; k++) { const x = tx + dx + Math.sin(k * Math.PI / 8) * d, z = tz + dz + Math.cos(k * Math.PI / 8) * d; if (clear(x, z)) { sx = x; sz = z; ok = true; } }
    if (!ok) { res.push({ t: tn, from: fn, skipped: 'no clear start' }); continue; }
    h.pos.set(sx, P0.groundAt(sx, sz, 8), sz); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.behaviour = 'normal'; G.step(0.2);
    h.angle = Math.atan2(tx - sx, tz - sz); G.step(0.1);
    DC.hold(['ArrowUp'], 2.5);
    const ov = DC.ov(), o = DC.out();
    res.push({ t: tn, from: fn, start: [sx, sz].map((u) => +u.toFixed(1)), ov, ...o });
  }
  const stuck = res.filter((q) => !q.skipped && (q.free < 3 || q.back < 0.3 || q.toYard !== 'arrived'));
  return { walks: res.filter((q) => !q.skipped).length, skipped: res.filter((q) => q.skipped).length, stuck, worstOverlap: Math.max(...res.filter((q) => !q.skipped).map((q) => q.ov)), ends: res.map((q) => `${q.t}/${q.from}: ${q.skipped || q.start + '→' + q.at + ' free ' + q.free}`) };
}, CORNER);
check('2. walked by input into the old corner and the other two old slots from 5 sides each: wherever he ends he walks out (3+ of 8 headings, Down, to the yard\'s middle)', s2.walks >= 13 && !s2.stuck.length, s2);

// ---- 3. Save & quit in the corner → Continue
const s3a = await ev((C) => {
  const G = game, h = G.hero, P0 = G.physics;
  DC.calm();
  const sx = C.x - 0.4, sz = C.z - 3;
  h.pos.set(sx, P0.groundAt(sx, sz, 8), sz); h.vy = 0; h.onGround = true; G.step(0.2);
  h.angle = Math.atan2(C.x - sx, C.z - sz); G.step(0.1); DC.hold(['ArrowUp'], 2.5);
  return { at: [h.pos.x, h.pos.z].map((u) => +u.toFixed(2)), ov: DC.ov() };
}, CORNER);
{
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 300000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 });
  await reloaded;
  await open(page, '?nocine'); await menu(page, 'continue'); await setup();
}
const s3 = await ev(() => { P.settle(); DC.calm(); const h = game.hero; return { room: game.room?.id, at: [h.pos.x, h.pos.z].map((u) => +u.toFixed(2)), ov: DC.ov(), ...DC.out() }; });
check('3. Save & quit in the corner → Continue: on Zeelich, clear of everything, walks out', s3.room === 'zeelich' && s3.ov < 0.03 && s3.free >= 3 && s3.toYard === 'arrived', { before: s3a, after: s3 });

// ---- 4. an old save made at the old trap spot
iso('an old save: this game\'s snapshot with the hero at the old trap spot (2411.6, 24.7), written into storage');
await ev((C) => { const s = game.snapshot(); s.room = 'zeelich'; s.hero.x = C.x; s.hero.z = C.z; localStorage.setItem('lba3_save_v1', JSON.stringify(s)); }, CORNER);
await open(page, '?nocine'); await menu(page, 'continue'); await setup();
const s4 = await ev((C) => {
  P.settle(); DC.calm(); const G = game, h = G.hero, D = G.rooms.zeelich.depot;
  const at = [h.pos.x, h.pos.z], moved = +Math.hypot(at[0] - C.x, at[1] - C.z).toFixed(2);
  const inDepot = at[0] > 2404.2 && at[0] < 2423.8 && at[1] > 9.2 && at[1] < 25.08;
  return { room: G.room?.id, at: at.map((u) => +u.toFixed(2)), moved, inDepot, ov: DC.ov(), ...DC.out() };
}, CORNER);
check('4. an old save at the old trap spot: Continue puts him clear within 3 m, inside the depot, and he walks out', s4.room === 'zeelich' && s4.moved <= 3 && s4.inDepot && s4.ov < 0.03 && s4.free >= 3 && s4.toYard === 'arrived', s4);

done();
await browser.close();
