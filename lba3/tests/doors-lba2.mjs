// DOORS-LBA2 (tools/testlab/WORLD_ART_REQUESTS.md "## DOORS-LBA2", corrections (d)): every changed link goes where
// the laptop's decoded LBA2 links put it. Positions as the report gives them (Citadel: world metres; the hall:
// hall-local metres, world x − 5800). Each way is taken by the game's own path (the lift rides, the room exits, the
// tavern's drop) and checked where it lands; then old saves standing where a moved door used to be load somewhere valid.
//   #1/#2/#5 the lower town's hatch (−28.5, 27.6), railed N/E/S, two bollards on the west → the hall's NE corner
//            (deck (11.5, −10.5)); the Bug Street grate gone; the pink house off the hatch, its door shut with a line
//   #3/#4    the terrace hatch (−25.1, −31.5) on the terrace, no porch house, gated by sw_bolt → the NW corner (−12.4, −10.75)
//   #6       the well-house's door is the globe room's; no door left in the colonnade
//   #7       the treasure room's gate in the west wall at z ≈ 0
//   #8       the tavern cellar's drop lands on the island's platform ≈ (−0.2, −1.5)
//   #9       the tent's stair comes out in the west wall at z ≈ 10
//   kept, with their reasons (#10 the wizard's tent, #11 Tralu's cave door, #12 Twinsen's door): checked unchanged
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const URL0 = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const ready = () => page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: +process.env.BOOT_TIMEOUT || 480000 });
const boot = async (mode) => {
  await page.goto(URL0, { waitUntil: 'load', timeout: 180000 });
  await ready();
  await ev(() => { game.testFreeze = true; });
  await page.click(`[data-act="${mode}"]`, { timeout: 180000 });
  await page.addScriptTag({ path: HARNESS });
  await ev(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
};
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const near = (a, b, tol) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol;
// where he stands: the room, world (x, z, y), hall-local (x, z) when in the hall
const here = () => ev(() => { const R = game.room, h = game.hero.pos, c = R?.center; return { room: R?.id ?? 'citadel', p: [+h.x.toFixed(2), +h.z.toFixed(2)], y: +h.y.toFixed(2), loc: c ? [+(h.x - c.x).toFixed(2), +(h.z - c.z).toFixed(2)] : null, state: game.state, ground: game.hero.onGround }; });
const hallLoc = (p) => [p.x - 5800, p.z];

await boot('new');
await said();
await ev(() => { const s = game.room.searches[0]; P.use(s.x, s.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); });

// ---------------------------------------------------------------- the street side
let r = await ev(() => {
  const S = game.story.sewers, hs = Object.fromEntries(S.hatches.map((h) => [h.id, { x: h.x, z: h.z, y: +h.y.toFixed(2) }]));
  const pink = game.world.houses.find((h) => h.id === 'pink');
  const P_ = game.physics, cols = (x, z, R) => P_.colliders.filter((c) => c.enabled !== false && Math.hypot(c.x - x, c.z - z) < R).map((c) => ({ t: c.type, x: +c.x.toFixed(2), z: +c.z.toFixed(2), hw: c.hw, hd: c.hd, r: c.r }));
  return { hs, pink: { z: pink.z, south: pink.z + pink.d / 2, door: [+pink.door.x.toFixed(2), +pink.door.z.toFixed(2)] }, stoneup: !!game.world.houses.find((h) => h.id === 'stoneup'),
    sewerDoors: game.story.doors().filter((d) => d.room === 'sewer').length, cols: cols(-28.5, 27.6, 2.6), bug: cols(-45.4, 56.6, 1.0), oldGrate: game.scene.getObjectByName('sewerhatch') || null };
});
const st = r.hs.street, te = r.hs.terrace;
check('#1 the lower town\'s hatch at (−28.5, 27.6), on the street\'s level; the terrace\'s at (−25.1, −31.5), on the terrace (7 m+ up)',
  near([st.x, st.z], [-28.5, 27.6], 0.05) && Math.abs(st.y - 2.35) < 0.3 && near([te.x, te.z], [-25.1, -31.5], 0.05) && te.y > 9, r.hs);
const rails = r.cols.filter((c) => c.t === 'box'), bollards = r.cols.filter((c) => c.t === 'cyl' && c.x < -30);
const side = (dx, dz) => rails.some((c) => Math.abs(c.x - (st.x + dx)) < 0.2 && Math.abs(c.z - (st.z + dz)) < 0.2);
check('#1 railed on its north, east and south sides, open to the west between two bollards at (−30.3, 26.2) and (−30.3, 28.9)',
  side(0, -1.32) && side(1.32, 0) && side(0, 1.32) && !side(-1.32, 0) && bollards.length === 2 && bollards.every((b) => Math.abs(b.x + 30.3) < 0.1) && bollards.some((b) => Math.abs(b.z - 26.25) < 0.1) && bollards.some((b) => Math.abs(b.z - 28.95) < 0.1), { rails, bollards });
check('#1 the pink house no longer stands on the hatch (its south wall clears z 25.6); no house door leads down; no porch house on the terrace',
  r.pink.south <= 25.6 && r.sewerDoors === 0 && !r.stoneup, r.pink);
check('#5 the Bug Street grate is gone (no hatch, nothing solid at (−45.4, 56.6))', r.bug.length === 0 && !r.oldGrate, r.bug);
r = await ev(() => { const h = game.world.houses.find((x) => x.id === 'pink'); P.go(h.door.x, h.door.z + 1.0, { tol: 0.3 }); return P.use(h.door.x, h.door.z, { near: 0.9 }); });
let s = await said();
check('#1 the pink house\'s door: shut, with a reason (Fosse\'s Sewer Works office, he is below) (INPUT)', has(s, /SEWER WORKS/) && !has(s, /^Locked\.$/), { r, s });
r = await ev((T) => { game.exitRoom({ x: T.x + 2.2, z: T.z, a: -Math.PI / 2 }, true, true); P.settle(); return P.use(T.x, T.z, { near: 1.2, kind: 'swlid' }); }, te);
s = await said();
check('#3 the terrace hatch from above, before its catch is drawn: shut, with a reason (held from below) (INPUT)', has(s, /holds it from below/) && !(await ev(() => game.story.sewers.hatches.find((h) => h.id === 'terrace').open)), { r, s });

// ---------------------------------------------------------------- the street hatch down: the NE corner
const ride = (id) => ev((id) => {
  const S = game.story.sewers, H = S.hatches.find((h) => h.id === id);
  if (game.room) game.exitRoom({ x: H.x - 1.6, z: H.z, a: Math.PI / 2 }, true, true);
  else P.go(H.x - 1.6, H.z, { tol: 0.3 });
  P.settle();
  const u = P.use(H.x, H.z, { near: 1.1, kind: 'swhatch' }); P.settle();
  P.go(H.x + 0.1, H.z + 0.05, { tol: 0.2 }); P.wait(0.2);
  const t = P.target(); P.tap('KeyE', 0.02); let k = 0; while (game.state !== 'cutscene' && k++ < 240) game.step(1 / 60);
  P.settle();
  return { u: u.r || u, t: t?.kind, open: H.open };
}, id);
r = await ride('street');
let w = await here();
const HALL = await ev(() => { const R = game.rooms.sewer; const L = (p) => p && [+(p.x - R.center.x).toFixed(2), +(p.z - R.center.z).toFixed(2)]; const ex = (k) => R.exits.filter((e) => (e.to || e.room) === k).map(L);
  return { entries: Object.fromEntries(Object.entries(R.entries).map(([k, p]) => [k, L(p)])), exits: Object.fromEntries(['sewer-out', 'sewer-stoneup', 'sewerglobe', 'sewervault', 'wtent'].map((k) => [k, ex(k)])), spawn: L(R.spawn), gate: L(R.hall.gate) }; });
check('#2 down the street hatch\'s lift (INPUT): in the hall by its foot in the north-east corner (deck ≈ (11.5, −10.5))', r.t === 'swdown' && w.room === 'sewer' && w.loc && near(w.loc, [11.5, -10.5], 2.0) && w.loc[0] > 9 && w.loc[1] < -8.5 && Math.abs(w.y) < 0.1 && w.state === 'play', { r, w });
check('#2 the way back up (sewer-out) is on that deck once Fosse\'s padlock is off (shut on a new game)', HALL.exits['sewer-out'].length === 0, HALL.exits);
await ev(() => { game.flags.sw_works = true; game.story.sewers.applyRooms(); });
r = await ev(() => { const R = game.room, e = R.exits.find((x) => x.to === 'sewer-out'); return { at: e && [+(e.x - R.center.x).toFixed(2), +(e.z - R.center.z).toFixed(2)], t: P.exitTo('sewer-out') }; });
await ev(() => P.settle());
w = await here();
check('#2 up it (INPUT): the deck in the hall\'s NE corner → on the street hatch\'s lid at (−28.5, 27.6), playing', r.at && near(r.at, [11.5, -10.5], 0.05) && w.room === 'citadel' && near(w.p, [-28.5, 27.6], 0.3) && w.state === 'play' && w.ground, { r, w });

// ---------------------------------------------------------------- the terrace hatch: the NW corner
await ev(() => { game.flags.sw_bolt = true; game.story.sewers.applyRooms(); });
r = await ride('terrace');
w = await here();
check('#4 down the terrace hatch\'s lift (its catch drawn, sw_bolt) (INPUT): on the raised walkway by its foot in the north-west corner (≈ (−12.6, −10.8))', r.t === 'swdown' && w.room === 'sewer' && near(w.loc, [-12.4, -10.75], 1.8) && w.loc[0] < -10.5 && w.y > 1.5, { r, w });
r = await ev(() => { const R = game.room, e = R.exits.find((x) => x.to === 'sewer-stoneup'); return { at: e && [+(e.x - R.center.x).toFixed(2), +(e.z - R.center.z).toFixed(2)], t: P.exitTo('sewer-stoneup') }; });
await ev(() => P.settle());
w = await here();
check('#4 up it (INPUT): on the terrace hatch\'s lid at (−25.1, −31.5), on the terrace', r.at && near(r.at, [-12.4, -10.75], 0.05) && w.room === 'citadel' && near(w.p, [-25.1, -31.5], 0.3) && w.y > 9 && w.state === 'play', { r, w });

// ---------------------------------------------------------------- the hall's other links
check('#6 the globe room\'s door is the well-house\'s (≈ (−2.9, 0.4)), arriving before it; none left in the colonnade (x > 6)',
  near(HALL.entries.sewerglobe, [-2.9, 1.7], 0.3) && HALL.exits.sewerglobe.every((e) => e[0] < 0) && !Object.values(HALL.exits).flat().some((e) => e[0] > 12.5 && e[1] < -11.5), HALL);
check('#7 the treasure room\'s gate in the west wall at z ≈ 0 (its exit in the passage, its arrival on the west walkway)',
  HALL.exits.sewervault.length === 1 && HALL.exits.sewervault[0][0] < -14 && Math.abs(HALL.exits.sewervault[0][1]) < 0.5 && HALL.entries.sewervault[0] < -11.6 && Math.abs(HALL.entries.sewervault[1]) < 0.5 && near(HALL.gate, [-14.3, 0], 0.2), HALL);
check('#8 the tavern\'s drop lands on the island\'s raised platform ≈ (−0.2, −1.5), clear of the well-house (x > −1.4)', near(HALL.entries.fall, [-0.2, -1.5], 0.1) && HALL.entries.fall[0] > -1.4, HALL.entries.fall);
check('#9 the tent\'s stair in the west wall at z ≈ 10 (exit and arrival)', HALL.exits.wtent.length === 1 && Math.abs(HALL.exits.wtent[0][1] - 10) < 0.2 && HALL.exits.wtent[0][0] < -13.5 && Math.abs(HALL.entries.wtent[1] - 10) < 0.2, HALL);
// each taken by the game's own path and back
r = await ev(() => {
  const out = {};
  const loc = () => { const R = game.room, h = game.hero.pos; return [+(h.x - R.center.x).toFixed(2), +(h.z - R.center.z).toFixed(2), +h.y.toFixed(2)]; };
  game.enterRoom('sewer', (R) => R.entries.street, true, true); P.settle();
  game.flags.sw_valve = true; game.flags.sw_gdoor = true; game.story.sewers.applyRooms(); P.settle();
  out.vault = P.enter('sewervault').r; out.vaultRoom = game.room?.id;
  out.vaultBack = P.enter('sewer').r; out.vaultBackAt = loc();
  out.globe = P.enter('sewerglobe').r; out.globeRoom = game.room?.id;
  out.globeBack = P.enter('sewer').r; out.globeBackAt = loc();
  out.tent = P.enter('wtent').r; out.tentRoom = game.room?.id;
  out.tentBack = P.enter('sewer').r; out.tentBackAt = loc();
  game.enterRoom('tavcellar', null, true, true); P.settle();
  const D = game.room.drop; P.go(D.edge.x, D.edge.z, { tol: 0.25 }); P.face(D.edge.x + 5, D.edge.z);
  let k = 0; while (game.room?.id === 'tavcellar' && k++ < 60) P.holdFor(['ArrowUp'], 0.1);
  P.release(); P.settle();
  out.fallRoom = game.room?.id; out.fallAt = loc(); out.fallGround = game.hero.onGround;
  return out;
});
check('#6/#7/#9 through the gate, the blue door and up the tent\'s stair, and back to each one\'s arrival (INPUT)',
  r.vaultRoom === 'sewervault' && near(r.vaultBackAt, HALL.entries.sewervault, 1.0) && r.globeRoom === 'sewerglobe' && near(r.globeBackAt, HALL.entries.sewerglobe, 1.0) && r.tentRoom === 'wtent' && near(r.tentBackAt, HALL.entries.wtent, 1.0), r);
check('#8 off the cellar walkway through the gap (INPUT): standing on the platform (1.15 m) by (−0.2, −1.5)', r.fallRoom === 'sewer' && near(r.fallAt, [-0.2, -1.5], 0.8) && Math.abs(r.fallAt[2] - 1.15) < 0.1 && r.fallGround, r);

// ---------------------------------------------------------------- the kept doors: unchanged
r = await ev(() => { const d = game.story.doors(); const f = (room) => d.filter((x) => x.room === room).map((x) => [+x.x.toFixed(2), +x.z.toFixed(2)]); return { wtent: f('wtent'), tralu: f('tralucave'), house: f('house') }; });
check('kept (#10 the tent: LBA2\'s spot is our glider field; #11 Tralu\'s door: no bank there, the depot\'s yard; #12 Twinsen\'s door): where they were',
  near(r.wtent[0], [-96.25, -71], 0.1) && near(r.tralu[0], [-80.7, -82.0], 1.2) && near(r.house[0], [-46.1, 77.2], 0.2), r);

// ---------------------------------------------------------------- old saves standing where a moved door was
const oldSave = async (room, x, z) => {
  await ev(({ room, x, z }) => {
    game.exitRoom({ x: -40, z: 60, a: 0 }, true, true); P.settle(); game.save(false);
    const s = JSON.parse(localStorage.getItem('lba3_save_v1')); s.room = room; s.hero.x = x; s.hero.z = z;
    for (const k of Object.keys(s.flags)) if (k.startsWith('sw_')) delete s.flags[k];
    localStorage.setItem('lba3_save_v1', JSON.stringify(s));
  }, { room, x, z });
  await boot('continue');
  return ev(() => {
    P.wait(2);
    const R = game.room, h = game.hero.pos, c = R?.center, solid = game.physics.solidAt?.(h.x, h.z, h.y + 0.5, 0.25);
    return { room: R?.id ?? 'citadel', p: [+h.x.toFixed(2), +h.z.toFixed(2)], loc: c ? [+(h.x - c.x).toFixed(2), +(h.z - c.z).toFixed(2)] : null, y: +h.y.toFixed(2), state: game.state, ground: game.hero.onGround, solid: !!solid, step: (() => { const x0 = h.x, z0 = h.z; for (const [dx, dz] of [[1.2, 0.3], [0.3, 1.2], [-1.2, -0.3], [-0.3, -1.2]]) { const g = P.go(x0 + dx, z0 + dz, { tol: 0.4, maxT: 10 }).r; if (g === 'arrived') return g; } return 'stuck'; })() };
  });
};
for (const [name, room, x, z, want] of [
  ['outside the pink house\'s old door (its old way out)', null, -28.5, 29.1, (v) => v.room === 'citadel' && v.y < 3],
  ['on the old Bug Street grate', null, -45.4, 56.6, (v) => v.room === 'citadel'],
  ['before the old terrace porch', null, -25.5, -35.0, (v) => v.room === 'citadel' && v.y > 9],
  ['in the hall at the old Works door\'s arrival', 'sewer', 5807.75, -10.7, (v) => v.room === 'sewer'],
  ['in the hall at the old terrace door\'s arrival', 'sewer', 5796.0, -10.9, (v) => v.room === 'sewer' && v.y > 1.5],
  ['in the hall at the old well-house arrival', 'sewer', 5797.1, 1.75, (v) => v.room === 'sewer'],
  ['in the hall at the old drop\'s landing (the east pier)', 'sewer', 5807.5, 7.4, (v) => v.room === 'sewer'],
]) {
  const v = await oldSave(room, x, z);
  check(`an old save ${name}: loads into play standing on the ground, not inside anything, free to walk`, v.state === 'play' && v.ground && !v.solid && v.step === 'arrived' && want(v), v);
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
