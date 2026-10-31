// SD-3 walk by input (tests/lib/player.js P.go: A* over the game's own collision rules, then Classic-control
// key presses): the landing → the tree bridge → the switchbacks → Lhar (every door, every villager's spot) → the
// lift's foot (heat post, winch); after a ride (story action, not walked) the lift's top → the monastery gate →
// the yard → out → the ridge → the observatory door. Also: repeated entry, quality low/high and a resize.
import { launch, open, menu } from '/home/user/geriatrics-course/.claude/worktrees/agent-a5c22898755b8fc79/lba2-remaster/tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine'); await menu(page, 'new');
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const step = async (label, f, a) => { const t0 = Date.now(); const r = await ev(f, a); const bad = r && r.fail; if (bad) fails++; console.log(`${bad ? 'FAIL' : 'ok  '} ${label} (${((Date.now() - t0) / 1000).toFixed(0)} s): ${JSON.stringify(r).slice(0, 300)}`); return r; };
await step('chapter 6 start', () => { const G = game; P.settle(); Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 4, chapterKey: 'steam', c5_planned: true, c5_vent: true, c5_glider: true, c5_done: true }); G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); P.settle(); return { room: G.room?.id, pos: [G.hero.pos.x - 4300, G.hero.pos.z].map(Math.round) }; });
// (the tree felled by the story's own call; the walk is what's tested)
await step('tree down', () => { const G = game, M = G.rooms.hamalayi; G.flags.c6_bridge = true; M.gorge.tree.fell(true); for (const t of M.ballTargets) if (t.tree) t.done = true; return { ok: true }; });
const legs = [
  ['landing → bridge south end', [[-6, 50]]],
  ['over the tree bridge', [[-6, 35.5]]],
  ['bridge → trail start', [[16, 34]]],
  ['up the switchbacks', [[30, 25], [24, 15], [12, 9]]],
  ['into the square', [[-8, 18]]],
  ['to the villagers and doors', 'lhar'],
  ['square → the lift', [[12, -5], [19, -14], [24, -19.5]]],
  ['heat post, winch', [[21.7, -19.5], [26.4, -19.4]]],
];
for (const [label, pts] of legs) {
  await step(label, (pts) => {
    const G = game, M = G.rooms.hamalayi, out = [];
    let list = pts;
    if (pts === 'lhar') { const S = M.npcSpots; list = [S.yorna, S.pim, S.v3, S.v2, S.v1, ...M.lharDoors].map((p) => [p.x - 4300, p.z]); }
    for (const [x, z] of list) { let r = P.go(4300 + x, z, { tol: 1.0, maxT: 120 }); P.settle(); if (Math.hypot(G.hero.pos.x - 4300 - x, G.hero.pos.z - z) > 1.6) { r = P.go(4300 + x, z, { tol: 1.0, maxT: 120 }); r.r += ' (after a story line)'; P.settle(); } const d = Math.hypot(G.hero.pos.x - 4300 - x, G.hero.pos.z - z); out.push([x, z, r.r, +d.toFixed(1)]); }
    const bad = out.filter((o) => o[3] > 1.6);
    return { out, fail: bad.length ? 'not reached: ' + JSON.stringify(bad) : null };
  }, pts);
}
await step('ride (story action, not walked)', () => { const G = game, L = G.rooms.hamalayi.lift; G.flags.c6_up = true; L.ride(true, [], null); G.step(12); G.hero.pos.set(L.top.x, G.physics.groundAt(L.top.x, L.top.z, 30), L.top.z); G.hero.onGround = true; G.step(0.5); return { y: +G.hero.pos.y.toFixed(1) }; });
for (const [label, pts] of [['lift top → gate', [[29, -32.6], [34, -32.5]]], ['gate → yard', [[34, -40], [31, -40], [37, -40], [34, -43.2]]], ['yard → out of the gate', [[34, -32]]], ['round the wall → the ridge', [[25, -32.4], [18, -40], [6, -56], [-6, -66]]], ['to the observatory door', [[-14, -66.2]]]]) {
  await step(label, (pts) => {
    const G = game, out = [];
    for (const [x, z] of pts) { let r = P.go(4300 + x, z, { tol: 1.0, maxT: 150 }); P.settle(); if (G.room?.id === 'hamalayi' && Math.hypot(G.hero.pos.x - 4300 - x, G.hero.pos.z - z) > 1.6) { r = P.go(4300 + x, z, { tol: 1.0, maxT: 150 }); r.r += ' (after a story line)'; P.settle(); } const d = Math.hypot(G.hero.pos.x - 4300 - x, G.hero.pos.z - z); out.push([x, z, r.r, +d.toFixed(1), G.room?.id]); }
    const bad = out.filter((o) => o[3] > 1.6 && o[4] === 'hamalayi');
    return { out, fail: bad.length ? 'not reached: ' + JSON.stringify(bad) : null };
  }, pts);
}
// repeated entry, quality switch both ways, a resize: no errors, the same draw calls after as before
await step('re-entry, quality, resize', async () => {
  const G = game, R = G.rooms.hamalayi, Rn = G.renderer, info = Rn.renderer.info;
  const meas = () => { G.enterRoom('hamalayi', { x: R.lhar.x, z: R.lhar.z + 6, a: Math.PI }, true, true); G.camRig.lba.init = false; G.step(1); info.reset(); Rn.render(); return [info.render.calls, info.render.triangles, info.memory.geometries, info.memory.textures]; };
  const a = meas();
  for (let i = 0; i < 3; i++) { G.enterRoom('house', null, true, true); G.step(0.5); meas(); }
  const b = meas();
  const q0 = Rn.quality; Rn.setQuality?.('low'); G.step(0.5); const low = meas(); Rn.setQuality?.(q0); G.step(0.5); const back = meas();
  return { first: a, after3Entries: b, low, back, quality: [q0, Rn.quality], fail: (Math.abs(b[0] - a[0]) > 2 || Math.abs(back[0] - a[0]) > 2 || b[2] > a[2] + 5 || back[3] > a[3] + 2) ? 'counts changed' : null };
});
await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(500); await ev(() => window.dispatchEvent(new Event('resize')));
await step('after resize', () => { const G = game; G.step(0.5); G.renderer.render(); return { w: G.renderer.canvas.width, h: G.renderer.canvas.height }; });
console.log(errs.slice(0, 10).join('\n') || 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
