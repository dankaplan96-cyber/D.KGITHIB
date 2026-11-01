// Citadel twelve years on (src/game/homelife.js, townlife.js, story/life.js): the family's house, The Old Pump and
// The Mislabelled Shipment, played by input (walking, E, talking) in both valid orders, with a save & Continue in
// the middle, the stories' changes before and after story events (prologue, chapter 2, the evacuation), and the
// main story's people unchanged. Also the REV-TY-1 fixes: the house's board and meter follow the story, the boat
// box keeps the pliers in the prologue, rewards survive a save made before they are picked up, the pump's handle
// meets his hands, and the lane's pipe, the posts and the trough are solid.
// ISO (logged): chapters are set by their flags; a fresh island per order; a few placements by exitRoom.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');

// readability from the normal camera: is each world point on screen and the first thing a ray from the camera meets?
const seen = (pts) => ev(async (pts) => {
  const THREE = await import('three'); game.renderer.render?.();
  const cam = game.camera, cp = new THREE.Vector3(); cam.getWorldPosition(cp); const rc = new THREE.Raycaster(); rc.camera = cam;
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const owner = (o) => { for (let x = o; x; x = x.parent) { if (x === game.hero.rig?.root) return 'Twinsen'; for (const n of game.npcs) if (x === n.rig?.root) return n.def.id; } return o.name || o.geometry?.type || 'mesh'; };
  const meshes = []; game.scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && shown(o)) meshes.push(o); });
  const out = {};
  for (const [n, p] of Object.entries(pts)) { const v = new THREE.Vector3(...p), ndc = v.clone().project(cam); if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1) { out[n] = 'off-screen'; continue; }
    const dir = v.clone().sub(cp), d = dir.length(); rc.set(cp, dir.normalize()); rc.far = d + 0.3;
    const hit = rc.intersectObjects(meshes, false).find((h) => !(h.object.material?.transparent && (h.object.material.opacity < 0.6 || h.object.material.depthWrite === false)));
    out[n] = hit && hit.distance < d - 0.2 ? 'hidden by ' + owner(hit.object) + ' @' + [hit.point.x, hit.point.y, hit.point.z].map((q) => q.toFixed(1)) : 'seen'; }
  return out; }, pts);
const couplerPts = () => ev(() => { const c = game.world.life.shop.coupler; return { top: [c.x, c.y + 0.27, c.z], front: [c.x, c.y + 0.13, c.z + 0.16], west: [c.x - 0.16, c.y + 0.13, c.z], east: [c.x + 0.16, c.y + 0.13, c.z] }; });
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const setChapter = (key, extra = {}) => ev(([key, extra]) => { const G = game, f = G.flags; P.settle(); Object.assign(f, { prologueDone: true, intro: true, chapterKey: key }, extra); f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true; G.story.applyFlags(); }, [key, extra]);
const toasts = () => ev(() => (game.hud.toastLog || []).slice());
await said();

// ---- the cast is there
const cast = await ev(() => ['bram', 'odile', 'nell'].map((id) => { const n = game.npcs.find((x) => x.def.id === id); return { id, present: n?.present, d: n && +Math.hypot(n.pos.x - game.world.life.spots[id].x, n.pos.z - game.world.life.spots[id].z).toFixed(2) }; }));
check('Bram, Officer Odile and Nell are on Citadel at their places', cast.every((c) => c.present && c.d < 0.5), cast);

// ---- the house (prologue, INPUT): each family corner gives a short look
const home = await ev(() => { const out = {}; const H = game.rooms.house.life;
  for (const w of ['desk', 'trunk', 'mend', 'meter', 'bench']) { const p = { desk: H.zoeDesk, trunk: H.trunk, mend: H.mendBox, meter: H.meter, bench: H.bench }[w]; const r = P.use(p.x, p.z, { near: 0.6, kind: 'lhome' }); out[w] = { r: r.r, lines: r.lines, what: r.target?.kind }; }
  return out; });
const homeLines = await said();
check('the house: Zoé\'s board, the old trunk, the mend box, the heat meter and Arthur\'s bench each have a short look (INPUT)', Object.values(home).every((h) => h.what === 'lhome' && h.lines >= 1) && homeLines.length >= 5 && homeLines.length <= 8, { home, homeLines });
check('before the heat network (prologue) Zoé\'s board and the meter say the house is waiting', homeLines.some((l) => /near the top/.test(l)) && homeLines.some((l) => /Not connected yet/.test(l)), homeLines);
const stage0 = await ev(() => game.rooms.house.life.stage);
check('…and show it: every pin on the board red, the meter\'s needle at rest, no note on it (stage 0) (REV-TY-1 D4)', stage0 === 0, stage0);
// Arthur's bench is in his room in view of the house's camera: nothing tall between it and the camera
const benchView = await ev(() => { const H = game.rooms.house.life, R = game.rooms.house, b = H.bench; const cam = { x: Math.sin(Math.PI / 4), z: Math.cos(Math.PI / 4) };
  // walk the line from the bench toward the camera (it rises at the iso pitch 0.58): no collider taller than the line
  const PH = game.physics, hits = []; for (let d = 0.6; d < 6; d += 0.1) { const x = b.x - 0.8 + cam.x * d, z = b.z + cam.z * d, y = 0.9 + Math.tan(0.58) * d; for (const c of PH.near(x, z)) if (c.enabled && R.colliders.includes(c) && c.top > y && c.bottom < y && PH._inside(c, x, z)) hits.push([+x.toFixed(1), +z.toFixed(1), +c.top.toFixed(1)]); }
  return hits.slice(0, 5); });
check('Arthur\'s workbench stands where the house\'s camera sees it (nothing tall in between) (REV-TY-1 D2)', benchView.length === 0, benchView);

// ---- prologue: the pump is dry, Bram and Odile fit the morning; the boat box is only looked at
const pro = await ev(() => { game.hero.hasBall = true; const L = game.world.life, out = {}; const r1 = P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); out.pump = r1.r; const r2 = P.talk ? P.talk('bram') : null; out.bram = r2?.r; out.flags = { ask: !!game.flags.l_pumpAsk }; return out; });
const proLines = await said();
check('prologue: the pump is dry and Bram only remarks on it (no side story yet)', proLines.some((l) => /dry/i.test(l)) && !pro.flags.ask, { pro, proLines });
iso('prologue: Twinsen put outdoors by the garden (exitRoom) for the boat box');
const box0 = await ev(() => { const L = game.world.life; game.exitRoom({ x: L.boatBox.x, z: L.boatBox.z + 1.2, a: Math.PI }, true); P.settle(); const r = P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); return { r: r.r, label: r.target?.label, pliers: !!game.flags.l_pliers, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines || [] }; });
const box0l = await said();
check('prologue: Arthur\'s boat box is only looked at; the pliers stay in it, no journal line (REV-TY-1 D6)', box0.label === 'p_look' && !box0.pliers && box0.journal.length === 0 && box0l.some((l) => /His things/.test(l)), { box0, box0l });

// ---- chapter 2, order A: Bram → the pump (no pliers) → Arthur → the boat box → the pump
await setChapter('project', { c1_water: true });
const a1 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('bram'); const ask = !!f.l_pumpAsk; P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); return { ask, need: !!f.l_needPliers, pin: !!f.l_pin }; });
check('chapter 2: Bram asks about his pump; the valve pin needs pliers Twinsen doesn\'t have', a1.ask && a1.need && !a1.pin, a1);
const a2 = await ev(() => { const f = game.flags; P.talk('arthur'); return { asked: !!f.l_arPliers, room: game.room?.id }; });
const a2l = await said();
check('Arthur admits he borrowed the pliers (his boat box, by the pond)', a2.asked && a2l.some((l) => /boat box/.test(l)), { a2, a2l });
const a3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero, U = L.pump.use, PH = game.physics;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' }); const pliers = !!f.l_pliers;
  // the pin, pulled from the trough side (east of the pump); the pump still answers there (REV-TY-3 N3)
  P.use(L.pump.x + 1.0, L.pump.z + 1.1, { near: 0.3, kind: 'lpump' }); const pin = !!f.l_pin; P.face(L.pump.x, L.pump.z);
  const afterPin = P.target()?.label;
  const round = {}; for (const [n, dx, dz] of [['north', 0.1, -1.15], ['north-east', 1.0, -0.95], ['south', 0.2, 1.2], ['south-west', -1.0, 0.9], ['trough side', 1.0, 1.1]]) { P.go(L.pump.x + dx, L.pump.z + dz, { tol: 0.25, maxT: 20 }); P.face(L.pump.x, L.pump.z); round[n] = P.target()?.label || null; }
  // between Bram and the pump: facing the pump it is the pump (Bram at his back), turned round it is Bram (FIX-PUMP-N)
  const bramN = game.npcs.find((n) => n.def.id === 'bram'); P.go(L.pump.x + 0.25, L.pump.z - 1.35, { tol: 0.1, maxT: 20 });
  P.face(L.pump.x, L.pump.z); const between = { pump: P.target()?.label, dBram: +Math.hypot(bramN.pos.x - h.pos.x, bramN.pos.z - h.pos.z).toFixed(2) };
  P.face(bramN.pos.x, bramN.pos.z); between.bram = P.target()?.label;
  // three strokes by hand (E), from the trough side, the lane to the south and the north, measured frame by frame:
  // he walks round to the grip at walking pace through nothing solid, and his hands are on the grip in every frame
  // of every stroke, the first and the last included (REV-TY-1 D7, REV-TY-3 N2)
  const bones = []; h.rig.root.traverse((o) => { if (/^hand[LR]$/.test(o.name)) bones.push(o); });
  const mid = () => bones[0].getWorldPosition(bones[0].position.clone()).add(bones[1].getWorldPosition(bones[1].position.clone())).multiplyScalar(0.5);
  const runs = [];
  for (const [n, dx, dz] of [['trough side', 1.0, 1.1], ['lane south', 0.6, 3.5], ['north', 0.3, -3.0]]) {
    if (f.l_pump) break;
    P.go(L.pump.x + dx, L.pump.z + dz, { tol: 0.3, maxT: 20 }); P.go(L.pump.x, L.pump.z, { tol: 0.3, stopWhen: () => P.target()?.label === 'p_pump' });
    const label = P.target()?.label, from = +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(2), s0 = f.l_strokes || 0;
    P.tap('KeyE', 0);
    let maxV = 0, solid = 0, prev = [h.pos.x, h.pos.z], at = null; const gap = [], ang = [];
    for (let i = 0; i < 360; i++) {
      game.step(1 / 60);
      maxV = Math.max(maxV, Math.hypot(h.pos.x - prev[0], h.pos.z - prev[1]) * 60); prev = [h.pos.x, h.pos.z];
      if (PH.blockedAt(h.pos.x, h.pos.z, h.pos.y, h.radius - 0.12)) solid++;
      if (h.rig.anim === 'pump') { if (!at) at = { d: +Math.hypot(h.pos.x - U.x, h.pos.z - U.z).toFixed(3), fromPump: +Math.hypot(h.pos.x - L.pump.x, h.pos.z - L.pump.z).toFixed(2) }; gap.push(+mid().distanceTo(L.pump.grip()).toFixed(3)); ang.push(L.pump.handleAngle()); }
      if ((f.l_strokes || 0) > s0 && h.rig.anim !== 'pump' && !h.steer && h.actT <= 0) break;
    }
    runs.push({ n, label, from, counted: (f.l_strokes || 0) - s0, maxV: +maxV.toFixed(2), solid, at, frames: gap.length, maxGap: Math.max(...gap), first: gap[0], last: gap[gap.length - 1], swing: +Math.max(...ang).toFixed(2), lift: +Math.min(...ang).toFixed(2), gap });
    P.settle();
  }
  const pumpOK = !!f.l_pump;
  for (let i = 0; i < 6 && !f.l_pump; i++) { P.wait(0.5); P.use(U.x, U.z, { near: 1.0, kind: 'lpump' }); }   // (in case: press again until it runs)
  P.settle();
  const water = L.pump.running; const hp0 = h.hp = Math.max(1, h.maxHp - 4); P.wait(0.5); P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' });
  const clov0 = h.clovers; P.talk('bram'); const owed = f.l_oweClover || 0; P.wait(1.5);
  // the clover pops out by Bram: he picks it up (INPUT)
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'clover' && p.owe === 'l_oweClover') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle();
  return { pliers, pin, afterPin, round, between, runs, pumpOK, pump: !!f.l_pump, water, healed: h.hp > hp0, thanks: !!f.l_bramThanks, owed, clovers: h.clovers - clov0, oweAfter: f.l_oweClover || 0, journal: game.story.journal().find((j) => j.title === 'Around town')?.lines };
});
check('the boat box has the pliers; the pin comes out; three strokes and the pump runs (INPUT)', a3.pliers && a3.pin && a3.pump && a3.water && a3.pumpOK, { ...a3, runs: a3.runs.map((r) => ({ ...r, gap: undefined })) });
check('with the pin out the pump answers from the trough side where the pin came out, and from round it (REV-TY-3 N3)', a3.afterPin === 'p_pump' && Object.values(a3.round).every((l) => l === 'p_pump'), { afterPin: a3.afterPin, round: a3.round });
check('between Bram and the pump, facing the pump at arm\'s length gives the pump with Bram just behind him; turned round, Bram (FIX-PUMP-N)', a3.between.pump === 'p_pump' && a3.between.bram === 'p_talk' && a3.between.dBram < 1.2, a3.between);
for (const r of a3.runs) console.log(`  stroke from ${r.n}: prompt ${r.from} m from the grip, walk ≤ ${r.maxV} m/s, ${r.frames} stroke frames, hands to grip first ${r.first} last ${r.last} max ${r.maxGap} m, handle lifted ${r.lift} and pushed down ${r.swing} rad`);
check('asked from the trough side, the lane or the north, he walks round to the grip at walking pace (≤ 2.5 m/s) through nothing solid, and works it standing at the grip, clear of the plinth (REV-TY-3 N2)', a3.runs.length === 3 && a3.runs.every((r) => r.label === 'p_pump' && r.counted === 1 && r.maxV <= 2.5 && r.solid === 0 && r.at && r.at.d < 0.05 && r.at.fromPump > 1.2), a3.runs.map((r) => ({ ...r, gap: undefined })));
check('his hands stay on the handle\'s grip through the whole stroke, first and last frames included (< 0.15 m); the handle is lifted and pushed down (REV-TY-1 D7)', a3.runs.every((r) => r.frames >= 40 && r.maxGap < 0.15 && r.swing > 0.2 && r.lift < -0.3), a3.runs.map((r) => ({ n: r.n, frames: r.frames, maxGap: r.maxGap, swing: r.swing, gap: r.gap.filter((g, i) => i < 4 || i > r.gap.length - 5) })));
check('the pump\'s water restores life; Bram thanks him with a clover (owed until picked up, then in his pocket); the journal tracks it', a3.healed && a3.thanks && a3.owed === 1 && a3.clovers === 1 && a3.oweAfter === 0 && a3.journal?.some((l) => l.key === 'l_j_pump0' && l.done), a3);

// ---- the lane's pipe and the new posts are solid (INPUT: walking into them)
iso('Twinsen put on the lane beside the pipe (exitRoom), then walks by holding Up');
const solid = await ev(() => { const L = game.world.life, h = game.hero, PH = game.physics, out = {}; const Pp = L.pump.pipe; out.px = Pp.x;
  game.exitRoom({ x: Pp.x - 1.2, z: L.pump.z - 4, a: Math.PI / 2 }, true); P.settle(); const y0 = h.pos.y;
  P.holdFor(['ArrowUp'], 2.0); out.pipe = { x: +h.pos.x.toFixed(2), maxRise: +(h.pos.y - y0).toFixed(2) };
  game.exitRoom({ x: Pp.x - 1.2, z: L.pump.z, a: Math.PI / 2 }, true); P.settle(); P.holdFor(['ArrowUp'], 1.6); out.gap = +h.pos.x.toFixed(2);
  const gy = (x, z) => PH.terrain.heightAt(x, z);
  out.trough = PH.groundInfo(L.trough.x, L.trough.z, gy(L.trough.x, L.trough.z) + 0.3).brick;
  const bp = L.customs.barrier.position; out.barrier = PH.blockedAt(bp.x, bp.z, gy(bp.x, bp.z), 0.1);
  out.sign = PH.blockedAt(L.pump.sign.x, L.pump.sign.z, gy(L.pump.sign.x, L.pump.sign.z), 0.1);
  out.pipeBlock = PH.blockedAt(Pp.x, L.pump.z - 4, gy(Pp.x, L.pump.z - 4), 0.1);
  out.valve = PH.blockedAt(L.pump.valve.x, L.pump.valve.z, gy(L.pump.valve.x, L.pump.valve.z), 0.1);
  return out; });
check('the copper pipe stops him (he is not lifted onto it); at the pump\'s footpath, where it runs under the ground, he walks across (REV-TY-1 D3)', solid.pipe.x < solid.px - 0.16 && solid.pipe.maxRise < 0.1 && solid.gap > solid.px + 0.3, solid);
check('the trough can\'t be stood on; the pump sign\'s post, the customs barrier\'s post, the pipe and its valve box are solid (REV-TY-1 D3)', !solid.trough && solid.barrier && solid.sign && solid.pipeBlock && solid.valve, solid);

// ---- the shipment: Odile → the crate → Nell → the bench → glow → the barrel → the bench → Odile → Nell
await setChapter('project', { c1_water: true });
const s1 = await ev(() => { const L = game.world.life, f = game.flags;
  P.talk('odile'); const ask = !!f.l_crateAsk;
  P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' });
  return { ask, open: !!f.l_crateOpen, cs: f.l_cs, carry: game.story.items().some((i) => i.id === 'coupler') }; });
check('Officer Odile holds the "soup pot"; opening it: a heat coupler, carried', s1.ask && s1.open && s1.carry, s1);
// first a trip: set it down and wait too long
const s2 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero, W = L.shop.work;
  P.talk('nell'); const knows = !!f.l_nellKnows;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const placed = f.l_cs;
  return { knows, placed, work: +Math.hypot(h.pos.x - W.x, h.pos.z - W.z).toFixed(3), facing: +Math.abs(Math.atan2(Math.sin(h.angle - W.a), Math.cos(h.angle - W.a))).toFixed(2) }; });
// the coupler heating, read from the normal camera (the camera has come round behind him at the bench): its look
// at each stage, and whether it is in view (not hidden by the roof or by Twinsen) (REV-TY-3, TY-1 D1)
const stages = [];
for (const [name, u] of [['cool', 0.05], ['warming', 0.25], ['glowing', 0.6], ['about to trip', 0.92]]) {
  const st = await ev((u) => { let t = 0; while (game.story.life.heat / 1.25 < u && t < 14 && game.flags.l_cs === 'bench') { game.step(1 / 30); t += 1 / 30; } const C = game.world.life.shop.coupler; return { cs: game.flags.l_cs, stage: C.stage, look: C.look() }; }, u);
  stages.push({ name, ...st, v: await seen(await couplerPts()) });
}
const s2b = await ev(() => { P.wait(4); P.settle(); return game.flags.l_cs; });
s2.after = s2b;
const s2l = await said();
check('on the bench it runs and heats; left too long it trips and goes cold (a limited setback)', s2.knows && s2.placed === 'bench' && s2.after === 'tripped', s2);
console.log('  coupler by stage: ' + stages.map((s) => `${s.name}: ${JSON.stringify(s.look)} ${JSON.stringify(s.v)}`).join(' | '));
check('he sets it down from his place at the bench\'s west end, facing the bench (REV-TY-3, TY-1 D1)', s2.work < 0.05 && s2.facing < 0.1, s2);
check('the coupler is in view from the normal camera while it heats: not hidden by the shop\'s roof or by Twinsen at the bench (REV-TY-3, TY-1 D1)', stages.every((s) => s.cs === 'bench' && ['top', 'front'].every((k) => s.v[k] === 'seen') && Object.values(s.v).filter((v) => v === 'seen').length >= 3), stages.map((s) => [s.name, s.v]));
const L4 = stages.map((s) => s.look);
check('its four heat stages look different: brass and still (cool), dull red with wisps (warming), bright orange with a halo and a light on the bench (glowing), yellow-white with a column of steam (about to trip)', stages.map((s) => s.stage).join() === '0,1,2,3' && L4[0].e === 0 && L4[0].light === 0 && L4[1].e > 0.3 && L4[1].c !== L4[2].c && L4[2].c !== L4[3].c && L4[2].light > L4[1].light * 2 && L4[2].halo > L4[1].halo && L4[3].puffs > L4[1].puffs, L4);
check('Nell knows the coupler: Xil was getting her one from Zeelich (REV-TY-1 D8)', s2l.some((l) => /Xil was getting me one/.test(l)), s2l);
const s3 = await ev(() => { const L = game.world.life, f = game.flags, h = game.hero;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  P.wait(4.5);   // glowing
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); const took = f.l_cs;
  P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); const cooled = f.l_cs;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  return { took, cooled, done: f.l_cs, coupler: !!f.l_coupler }; });
check('restarted, taken off while glowing, cooled in the barrel, set back: it settles and the engine runs (INPUT)', s3.took === 'hot' && s3.cooled === 'cooled' && s3.done === 'done' && s3.coupler, s3);
await said();
const s4 = await ev(() => { const f = game.flags, h = game.hero; P.talk('odile'); const c0 = h.coins; P.talk('nell'); const owed = f.l_oweFee || 0; P.wait(2); P.settle();
  for (let k = 0; k < 3; k++) for (const p of [...game.pickups.list]) if (p.type === 'coin' && p.owe === 'l_oweFee') P.go(p.pos.x, p.pos.z, { tol: 0.4, maxT: 10 });
  P.settle();
  return { cleared: !!f.l_cleared, paid: !!f.l_nellPaid, state: game.world.life.crate.state, owed, coins: h.coins - c0, oweAfter: f.l_oweFee || 0 }; });
const s4l = await said();
check('Odile clears the coupler\'s papers; the crate\'s tag reads CLEARED; Nell pays part of what she owes Xil for it (REV-TY-1 D8)', s4.cleared && s4.paid && s4.state === 'cleared' && s4l.some((l) => /Papers cleared/.test(l)) && s4l.some((l) => /what I owe Xil/.test(l)), { s4, s4l });
check('Nell\'s payment: three coins, owed until picked up, then his (INPUT)', s4.owed === 3 && s4.coins === 3 && s4.oweAfter === 0, s4);

// ---- save & Continue: the stories' state comes back
const file = path.join(os.tmpdir(), 'townlife-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const back = await ev(() => { P.settle(); const f = game.flags, L = game.world.life; return { pump: L.pump.running, crate: L.crate.state, cs: f.l_cs, nell: game.npcs.find((n) => n.def.id === 'nell').forceAnim }; });
check('save & quit → Continue: the pump runs, the crate is cleared, the engine is settled', back.pump && back.crate === 'cleared' && back.cs === 'done', back);

// ---- order B on a fresh flag set: the boat box first, the pump without asking Bram; and a save mid-heat
await ev(() => { const f = game.flags; for (const k of Object.keys(f)) if (k.startsWith('l_')) delete f[k]; game.story.applyFlags(); });
await setChapter('project', { c1_water: true });
const b1 = await ev(() => { const L = game.world.life, f = game.flags, U = L.pump.use;
  P.use(L.boatBox.x, L.boatBox.z, { near: 0.8, kind: 'lbox' });
  P.use(L.pump.x, L.pump.z + 1.4, { near: 1.0, kind: 'lpump' }); for (let i = 0; i < 6 && !f.l_pump; i++) P.use(U.x, U.z, { near: 1.0, kind: 'lpump' });
  const pump = !!f.l_pump; const c0 = game.hero.clovers; P.talk('bram'); return { pump, thanks: !!f.l_bramThanks, ask: !!f.l_pumpAsk, owed: f.l_oweClover || 0, c0, lying: game.pickups.list.filter((p) => p.owe === 'l_oweClover').length }; });
check('other order: pliers first, the pump fixed before Bram asked; Bram still thanks him', b1.pump && b1.thanks, b1);
// a save straight away, the clover still on the ground: it is given on Continue
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const b1c = await ev(() => { const t = (game.hud.toastLog || []).slice(); P.settle(); return { clovers: game.hero.clovers, owed: game.flags.l_oweClover || 0, t }; });
await said();
check('saved before he picked Bram\'s clover up: on Continue it is in his pocket (a toast says so), nothing owed (REV-TY-1 D5)', b1.owed === 1 && b1.lying === 1 && b1c.clovers === Math.min(9, b1.c0 + 1) && b1c.owed === 0 && b1c.t.some((s) => /Bram's clover/.test(s)), { b1, b1c });
const b2 = await ev(() => { const L = game.world.life, f = game.flags; P.talk('odile'); P.use(L.crate.x, L.crate.z, { near: 0.8, kind: 'lcrate' }); P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(1); return f.l_cs; });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();   // (a new page: hook the dialogue again)
const b3 = await ev(() => { P.settle(); const f = game.flags; return { cs: f.l_cs, items: game.story.items().map((i) => i.id) }; });
check('a save made with the coupler heating comes back with it cold on the bench (restartable)', b2 === 'bench' && b3.cs === 'tripped', { b2, b3 });
// finish it, and save with Nell's coins still on the ground: they are given on Continue
const b4 = await ev(() => { const L = game.world.life, f = game.flags;
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.wait(4.5);
  P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' }); P.use(L.shop.barrel.x, L.shop.barrel.z, { near: 0.8, kind: 'lbarrel' }); P.use(L.shop.bench.x, L.shop.bench.z, { near: 0.8, kind: 'lbench' });
  P.talk('odile'); const c0 = game.hero.coins; P.talk('nell'); return { done: f.l_cs, paid: !!f.l_nellPaid, owed: f.l_oweFee || 0, c0 }; });
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const b4c = await ev(() => { const t = (game.hud.toastLog || []).slice(); P.settle(); return { coins: game.hero.coins, owed: game.flags.l_oweFee || 0, t }; });
await said();
check('saved before he picked Nell\'s coins up: on Continue the three kashes are his, nothing owed (REV-TY-1 D5)', b4.done === 'done' && b4.paid && b4.owed === 3 && b4c.coins - b4.c0 === 3 && b4c.owed === 0 && b4c.t.some((s) => /Nell's payment: 3 kashes/.test(s)), { b4, b4c });

// ---- the heat is on (chapter 2): the board and the meter show it
const st1 = await ev(() => { const G = game; G.enterRoom('house', G.rooms.house.spawn, true); P.settle(); G.step(0.2); const st = G.rooms.house.life.stage; G.exitRoom({ x: G.world.life.pump.x - 3, z: G.world.life.pump.z + 6, a: 0 }, true); P.settle(); return st; });
check('with the project\'s heat on, the board shows Bug Street green and the harbour row red, the meter\'s needle up with Zoé\'s note (stage 1) (REV-TY-1 D4)', st1 === 1, st1);

// ---- the evacuation: the pump is the street's water; Bram's line changes
await setChapter('evacuation', { c1_water: true, c1_plan: true });
const ev8 = await ev(() => { P.settle(); const r = P.talk('bram'); return { r, room: game.room?.id ?? 'citadel', at: [game.hero.pos.x, game.hero.pos.z].map((v) => +v.toFixed(1)) }; });
const ev8l = await said();
check('evacuation: Bram\'s line follows the dark posts', ev8l.some((l) => /dark|Pipes break/i.test(l)), { ev8, ev8l });
const desk = await ev(() => { const H = game.rooms.house.life; P.use(H.zoeDesk.x, H.zoeDesk.z, { near: 0.6, kind: 'lhome' }); return H.stage; });
const deskl = await said();
check('after Zoé found the plan, her board reads differently (the red pins are the houses left out) and shows her chalk ring round them (stage 2)', deskl.some((l) => /missing from Vesk/.test(l)) && desk === 2, { desk, deskl });

// ---- collision and access: walk from the square to each new place and back (INPUT; chapter 2: the square is open)
await setChapter('project', { c1_water: true });
const walk = await ev(() => { const W = game.world, L = W.life, out = [];
  game.exitRoom({ x: W.well.x + 2, z: W.well.z + 2, a: 0 }, true); P.settle();
  for (const [n, p] of [['pump', L.spots.bram], ['pump handle', L.pump.use], ['garden', L.boatBox], ['customs', L.customs], ['shop', L.shop.bench], ['barrel', L.shop.barrel], ['square', { x: W.well.x + 2, z: W.well.z + 3 }]]) { const r = P.go(p.x, p.z, { tol: 1.2, run: true, maxT: 120 }); out.push([n, r.r]); }
  return out; });
check('from the square he walks to the pump, its handle, the garden, customs, the repair shop and its barrel and back (INPUT)', walk.every(([, r]) => r === 'arrived'), walk);
// the shop and the garden's beds keep off the paths
const paths = await ev(() => { const W = game.world, L = W.life, d = (x, z) => +W.pathDist(x, z).toFixed(2);
  return { bench: d(L.shop.bench.x, L.shop.bench.z), barrel: d(L.shop.barrel.wx, L.shop.barrel.wz), engine: d(L.shop.engine.x, L.shop.engine.z), beds: L.beds.map((b) => d(b.x, b.z)) }; });
check('Nell\'s shop (bench, engine, barrel) and the garden\'s raised beds are off the dirt paths (> 2.3 m from a path\'s middle) (REV-TY-1 D1)', paths.bench > 2.3 && paths.barrel > 2.3 && paths.engine > 2.3 && paths.beds.every((v) => v > 2.3), paths);

// ---- TOWN-LIFE-2 (src/game/townbusy.js, gulls.js): the town's small business, chapter 2 with the water back (this page is a
// Continue: nothing of it is saved, it starts over after a load). ISO (logged): placements by exitRoom; town time run with
// game.step; story flags set for the three states of the town's talk.
iso('TOWN-LIFE-2: Twinsen placed by exitRoom; town time run with game.step; c1_water / c1_veskGone set for the talk\'s states');
const tl0 = await ev(() => { const B = game.world.busy; return B && { flocks: B.flocks.map((f) => ({ n: f.n, draws: [f.body, f.wing].filter((m) => m.isInstancedMesh).length, shadow: f.body.castShadow || f.wing.castShadow })), piles: [B.quay, B.stall].map((p) => ({ n: p.n, inst: p.mesh.isInstancedMesh })), flags: Object.keys(game.flags).filter((k) => /^(tl|tb|busy)_/.test(k)) }; });
check('the town\'s small business is there after a Continue: two gull flocks (two instanced draws each, no shadow), Tobb\'s two crate piles (one instanced draw each); no new saved flag', tl0 && tl0.flocks.length === 2 && tl0.flocks.every((f) => f.draws === 2 && !f.shadow && f.n >= 2) && tl0.piles.every((p) => p.inst && p.n >= 1) && tl0.flags.length === 0, tl0);
// Tobb's crates: the one he takes comes off the quay's pile and stays on the stall's (town time, Twinsen far off: the abstract tier)
const tobb = await ev(() => { const G = game, B = G.world.busy, T = G.walkers.res.find((r) => r.def.id === 'tobb');
  G.exitRoom({ x: G.world.life.boatBox.x, z: G.world.life.boatBox.z + 2, a: 0 }, true); P.settle(); const c0 = { ...B.count }; let min = 9, max = 0;
  for (let i = 0; i < 420; i++) { G.step(1); min = Math.min(min, B.quay.n); max = Math.max(max, B.stall.n); }
  const took = B.count.took - c0.took, put = B.count.put - c0.put;
  const stopAt = (id) => { const s = T.stops.find((q) => q.id === id); return s && { x: s.x, z: s.z }; };
  const qs = stopAt('tobb_quay'), ss = stopAt('tobb_stall');
  return { took, put, quayMin: min, stallMax: max, log: B.log.slice(-8), reach: { quay: +Math.hypot(qs.x - B.quay.x, qs.z - B.quay.z).toFixed(2), stall: +Math.hypot(ss.x - B.stall.x, ss.z - B.stall.z).toFixed(2) } }; });
check('Tobb\'s round: he takes a crate off the quay\'s pile and sets it on the pile at the stall\'s end (each seen in the piles\' counts), standing beside each pile', tobb.took >= 1 && tobb.put >= 1 && tobb.quayMin < 6 && tobb.stallMax >= 2 && tobb.reach.quay < 1.2 && tobb.reach.stall < 1.2, tobb);
// the piles are solid, and the way from the harbour path to the pier is still open (INPUT)
const pileWalk = await ev(() => { const G = game, B = G.world.busy, h = G.hero, out = {};
  G.exitRoom({ x: B.quay.x + 2.2, z: B.quay.z, a: -Math.PI / 2 }, true); P.settle(); P.holdFor(['ArrowUp'], 2.0); out.quayStop = +(h.pos.x - B.quay.x).toFixed(2);
  G.exitRoom({ x: -100, z: 39.5, a: -Math.PI / 2 }, true); P.settle(); out.pier = P.go(G.world.pierStart.x + 1, G.world.pierStart.z, { tol: 1.0, maxT: 60 });
  out.square = P.go(B.stall.x - 1.5, B.stall.z - 2.5, { tol: 1.0, run: true, maxT: 120 });
  return out; });
check('the quay\'s crate pile stops him (he does not walk through it); the harbour path to the pier and the way to the stall stay open (INPUT)', pileWalk.quayStop > 0.6 && pileWalk.pier.r === 'arrived' && pileWalk.square.r === 'arrived', pileWalk);
// a word when bumped: walking into a standing resident; a bubble over it, the game goes on (no dialogue)
const bump = await ev(() => { const G = game, B = G.world.busy, W = G.walkers; let r = null;
  for (let k = 0; k < 300 && !r; k++) { G.step(0.5); r = W.res.find((x) => x.present && !x.away && x.st === 'dwell' && x.tmr > 4 && !x.sit && !x.stop?.door && Math.abs(x.pos.x) < 200 && !/tend|water/.test(x.stop?.act || '')); }
  if (!r) return { none: true };
  const a = r.angle; G.exitRoom({ x: r.pos.x + Math.sin(a) * 1.6, z: r.pos.z + Math.cos(a) * 1.6, a: a + Math.PI }, true); G.step(0.3); B.hide();
  P.holdFor(['ArrowUp'], 1.0);
  return { who: r.def.id, key: B.bub?.key, on: B.bub?.n === r, text: B.el?.textContent, shown: B.el?.style.display, state: G.state, logged: B.log.slice(-2) }; });
check('walked into, a resident steps aside and says a short line over its head (a bubble; no dialogue, play goes on)', bump.key && /^rb_/.test(bump.key) && bump.on && bump.text && bump.text.length < 70 && bump.shown === 'block' && bump.state === 'play', bump);
// heads turn as he passes; not in Discreet mode
const heads = await ev(() => { const G = game, B = G.world.busy, h = G.hero; let seen = null;
  for (let i = 0; i < 600 && !seen; i++) { G.step(0.25); seen = [...B.looks][0] || null; if (!seen) { const r = G.walkers.res.find((x) => x.present && !x.away && x.st === 'walk' && x.tier === 0 && Math.abs(x.pos.x) < 200); if (r && i % 20 === 0) { G.exitRoom({ x: r.pos.x + Math.sin(r.angle) * 2.5, z: r.pos.z + Math.cos(r.angle) * 2.5, a: r.angle + Math.PI }, true); } } }
  if (!seen) return { none: true };
  const out = { who: seen.def.id, look: seen.rig.lookAt === seen._tlLook, atHim: Math.hypot(seen.rig.lookAt.x - h.pos.x, seen.rig.lookAt.z - h.pos.z) < 0.01 };
  h.behaviour = 'discreet'; G.step(0.1); out.discreet = B.looks.size; h.behaviour = 'normal';
  return out; });
check('a resident he passes close to turns its head to him; in Discreet mode nobody notices him', heads.look && heads.atHim && heads.discreet === 0, heads);
// overheard: Maro and Tilde's talk by the plaza's benches, by the town's state (hot; after Vesk; dry)
const hear = async (flags) => ev((flags) => { const G = game, B = G.world.busy, W = G.walkers; Object.assign(G.flags, flags);
  const m = W.res.find((r) => r.def.id === 'maro'), t = W.res.find((r) => r.def.id === 'tilde');
  G.exitRoom({ x: -51.5, z: 41.5, a: Math.PI }, true);
  // (he stands by their meeting place and listens through their talks — the one going on, if any, and the next — until he
  //  has heard three lines; a bubble left over from the town's other state is cleared first)
  B.hide(); B.chat.speaker = null; const keys = []; let i = 0;
  for (; i < 2400 && keys.length < 3; i++) { G.step(0.25); if (B.bub && B.bub.prio === 1 && keys[keys.length - 1] !== B.bub.key + '@' + B.bub.n.def.id) keys.push(B.bub.key + '@' + B.bub.n.def.id); }
  return { waited: i / 4, keys, text: B.el?.textContent, chat: [m.st, t.st] }; }, flags);
const hHot = await hear({ c1_water: true, c1_veskGone: false });
const hGone = await hear({ c1_water: true, c1_veskGone: true });
const hDry = await hear({ c1_water: false, c1_veskGone: false });
await ev(() => { Object.assign(game.flags, { c1_water: true, c1_veskGone: false }); });
const parity = (L) => L.every((s) => { const [k, who] = s.split('@'); const i = +k.slice(-1); return (i % 2 === 0) === (who === 'maro'); });
check('overheard by the plaza\'s benches: Maro and Tilde\'s words, a line a turn, Maro\'s and Tilde\'s in turn; the water back: the heat', hHot.keys.length >= 2 && hHot.keys.every((s) => /^ro_hot_/.test(s)) && parity(hHot.keys), hHot);
check('…after Vesk\'s departure: the light over the fortress; the well dry: the water', hGone.keys.length >= 2 && hGone.keys.every((s) => /^ro_gone_/.test(s)) && parity(hGone.keys) && hDry.keys.length >= 2 && hDry.keys.every((s) => /^ro_dry_/.test(s)), { hGone, hDry });
// what the residents say after Vesk has gone
const gone = await ev(() => { const G = game, C = G.story.citizens, f = G.flags, out = {};
  for (const id of ['oda', 'brix', 'pico', 'ume']) { const n = G.npcs.find((x) => x.def.id === id); f.c1_veskGone = false; const a = C.linesFor(n); f.c1_veskGone = true; const b = C.linesFor(n); out[id] = { before: a.includes(`rs_${id}_gone`), after: b.includes(`rs_${id}_gone`) }; }
  f.c1_veskGone = false; return out; });
check('once Vesk has gone, each resident has a line about it (and not before)', Object.values(gone).every((g) => !g.before && g.after), gone);
// Odile at her counter: stamps forms while nobody is at the window; his again as he comes up, and she talks to him
const od = await ev(() => { const G = game, n = G.npcs.find((x) => x.def.id === 'odile'), S = G.world.life.spots.odile, r = {};
  G.exitRoom({ x: S.x + 1.5, z: S.z + 9, a: Math.PI }, true); P.settle(); G.step(2.5); r.far = { anim: n.forceAnim, face: +Math.abs(Math.atan2(Math.sin(n.angle - S.a - Math.PI), Math.cos(n.angle - S.a - Math.PI))).toFixed(2) };
  r.talk = P.talk('odile'); r.speaking = G.state; P.settle(); r.near = { anim: n.forceAnim }; r.at = +Math.hypot(n.pos.x - S.x, n.pos.z - S.z).toFixed(2); return r; });
check('Officer Odile works her counter (turned to it) while nobody is at the window; as he comes up she is the story\'s again: she turns and talks, and stays at her place', od.far.anim === 'tinker' && od.far.face < 0.3 && od.talk.r === 'talked' && od.near.anim === null && od.at < 0.05, od);
// the gulls take off as he walks up and come down again on a perch away from him; out of reach they sit still
const gl = await ev(() => { const G = game, B = G.world.busy, F = B.flocks[0], h = G.hero;
  const b = F.birds.find((x) => x.st === 'sit'); G.exitRoom({ x: b.x + 6, z: b.z, a: -Math.PI / 2 }, true); P.settle();
  P.holdFor(['ArrowUp'], 2.5); const went = F.birds.filter((x) => x.st !== 'sit'), up = went.length, l0 = went.map((x) => x.landed || 0); G.step(30);
  const down = went.filter((x, i) => (x.landed || 0) <= l0[i]).length, dist = went.map((x) => +Math.hypot(x.p.x - h.pos.x, x.p.z - h.pos.z).toFixed(1));
  G.exitRoom({ x: G.world.life.boatBox.x, z: G.world.life.boatBox.z + 2, a: 0 }, true); P.settle();
  const m0 = F.body.instanceMatrix.version; G.step(5); return { up, down, dist, still: F.body.instanceMatrix.version === m0 }; });
check('the harbour\'s gulls take off as he walks up to them and come down again within half a minute; far off they keep still (no work)', gl.up >= 1 && gl.down === 0 && gl.still, gl);
// interrupted: a bubble goes as he goes indoors; heads he turned are let go
const intr = await ev(() => { const G = game, B = G.world.busy; const r = G.walkers.res.find((x) => x.present && !x.away && !x.inside && Math.abs(x.pos.x) < 200);
  G.exitRoom({ x: r.pos.x + Math.sin(r.angle) * 2.5, z: r.pos.z + Math.cos(r.angle) * 2.5, a: r.angle + Math.PI }, true); G.step(0.2);
  B.say(r, 'rb_adult_0', 3, 2); G.step(0.1); const shown = B.el.style.display;
  G.enterRoom('house', G.rooms.house.spawn, true); P.settle(); G.step(0.3);
  return { shown, after: B.el.style.display, looks: B.looks.size }; });
check('a word over a head is put away when he goes indoors, and no head is left turned', intr.shown === 'block' && intr.after === 'none' && intr.looks === 0, intr);
// ---- TOWN-LIFE-3 (src/game/townplay.js, harbourlife.js, townbits.js; walkers.js `play` stops; townbusy.js townState): the
// children's games, Doran's rod and Xil's ledger, a broom, the washing, the cat; and the town's life in every chapter Citadel
// is seen in. ISO (logged): residents put at a stop (slotAt/arrived, as walkers.mjs does); placements by exitRoom; town
// time run with game.step; chapters set by their flags (setChapter).
iso('TOWN-LIFE-3: residents put at their play stops (slotAt/arrived); Twinsen placed by exitRoom; town time by game.step; chapters by their flags');
await setChapter('project', { c1_water: true });
await ev(() => { window.put = (id, sid, tmr = 60) => { const W = game.walkers, r = W.res.find((q) => q.def.id === id); const i = r.stops.findIndex((s) => s.id === sid); r.ri = i; r.engaged = false; r.inside = false; r.away = null; r.hold = 0; r.yieldT = 0; r.setPresent(true); r.slotAt(r.stops[i]); r.arrived(r.stops[i], true); r.tmr = tmr; return r; }; });
const t3 = await ev(() => { const B = game.world.busy, out = {};
  out.parts = { play: !!B.play, hook: game.walkers.play === B.play, chalk: !!B.play.hop?.mesh?.isMesh, lines: B.bits.lines.map((l) => l.im.isInstancedMesh), cat: !!B.bits.cat, rod: !!B.harbour.rod };
  out.flags = Object.keys(game.flags).filter((k) => /^(tl|tb|busy|tp|play|cat|fish)_/.test(k));
  out.stops = game.walkers.res.flatMap((r) => r.stops.filter((s) => s.play).map((s) => r.def.id + ':' + s.id + ':' + s.play));
  return out; });
check('TOWN-LIFE-3 is there after a Continue: the children\'s play stops (tag, hopscotch, gulls, a bench), Maro\'s broom, the chalk grid, two washing lines, the cat, Doran\'s rod; no new saved flag', t3.parts.play && t3.parts.hook && t3.parts.chalk && t3.parts.lines.length === 2 && t3.parts.lines.every(Boolean) && t3.parts.cat && t3.parts.rod && t3.flags.length === 0 && ['pico:pico_tag:tag', 'dot:dot_tag:tag', 'dot:dot_hop:hop', 'pico:pico_gulls:gulls', 'dot:dot_bench:swing', 'maro:maro_sweep:sweep'].every((k) => t3.stops.includes(k)), t3);
// tag: the two on the lawn, twenty seconds of play near Twinsen (in full), kept to the lawn, never inside anything or in the water
const tag = await ev(() => { const G = game, W = G.walkers, B = G.world.busy, P0 = G.physics, F = B.play; const pc = put('pico', 'pico_tag', 40), dt = put('dot', 'dot_tag', 40);
  const fld = pc.stop.field; G.exitRoom({ x: fld.x + 7, z: fld.z - 3, a: -1.4 }, true); P.settle(); const h0 = [G.hero.pos.x, G.hero.pos.z];
  const c0 = { ...F.count }; let maxR = 0, inCol = 0, water = 0, run = 0, frames = 0;
  for (let i = 0; i < 600; i++) { G.step(1 / 30); frames++;
    for (const r of [pc, dt]) { maxR = Math.max(maxR, Math.hypot(r.pos.x - fld.x, r.pos.z - fld.z)); if (r.rig.anim === 'run') run++;
      for (const c of P0.near(r.pos.x, r.pos.z)) if (c.enabled && c.top > r.pos.y + 0.55 && c.bottom < r.pos.y + 1.6 && P0._inside(c, r.pos.x, r.pos.z, 0.05)) { inCol++; break; }
      if (P0.terrain.heightAt(r.pos.x, r.pos.z) < -0.2) water++; } }
  return { games: F.count.tag - c0.tag, swaps: F.count.swap - c0.swap, st: [pc.st, dt.st], maxR: +maxR.toFixed(2), fieldR: fld.r, inCol, water, run, frames, path: +G.world.pathDist(fld.x, fld.z).toFixed(1), heroMoved: +Math.hypot(G.hero.pos.x - h0[0], G.hero.pos.z - h0[1]).toFixed(3), log: F.log.slice(-4) }; });
check('tag: Pico and Dot meet on the lawn west of the square and chase each other (the one caught is "it"), running, kept to the lawn (≤ its radius + 0.6 m), never inside anything or in the water, over 10 m from any path; Twinsen is never moved', tag.games >= 1 && tag.swaps >= 1 && tag.run > 60 && tag.maxR <= tag.fieldR + 0.6 && tag.inCol === 0 && tag.water === 0 && tag.path > 10 && tag.heroMoved < 1e-6, tag);
// talked to in the middle of the game: afterwards nobody is left stuck, the game goes on (or both go on with their rounds)
const tagTalk = await ev(() => { const G = game, F = G.world.busy.play, pc = G.walkers.res.find((r) => r.def.id === 'pico'), dt = G.walkers.res.find((r) => r.def.id === 'dot');
  pc.tmr = 40; G.walkers.pair('tag').until = G.time + 40;
  const t = P.talk('pico'); let dotMax = 0; const d0 = [dt.pos.x, dt.pos.z];
  for (let i = 0; i < 90; i++) { G.step(1 / 30); dotMax = Math.max(dotMax, Math.hypot(dt.pos.x - d0[0], dt.pos.z - d0[1])); }
  for (let i = 0; i < 240; i++) G.step(1 / 30);
  return { talk: t.r, lines: t.lines, st: [pc.st, dt.st], engagedAfter: pc.engaged, swaps: F.count.swap }; });
check('talked to while playing tag, Pico stops and talks; afterwards nobody is left stuck in a talk and the game goes on (or both go on with their rounds)', tagTalk.talk === 'talked' && !tagTalk.engagedAfter && ['chat', 'pairwait', 'walk', 'plan', 'dwell'].includes(tagTalk.st[0]), tagTalk);
// hopscotch: up the chalk grid and back; the feet are the rig's again when she stops
const hop = await ev(() => { const G = game, F = G.world.busy.play, H = F.hop, dt = put('dot', 'dot_hop', 14);
  G.exitRoom({ x: H.x + 4, z: H.z + 3, a: -2.2 }, true); G.step(0.2); const c0 = F.count.hops; let off = 0, maxLift = 0, onGrid = 0;
  for (let i = 0; i < 300; i++) { G.step(1 / 30); if (!dt.rig.plantLite) off++; maxLift = Math.max(maxLift, dt.rig.root.position.y - dt.pos.y);
    const ux = Math.sin(H.a), uz = Math.cos(H.a), dx = dt.pos.x - H.x, dz = dt.pos.z - H.z, al = dx * ux + dz * uz, ac = Math.abs(dx * uz - dz * ux); if (al > -0.5 && al < 3 && ac < 0.6) onGrid++; }
  dt.tmr = 0; let k = 0; for (; k < 600 && dt.stop.play === 'hop'; k++) G.step(1 / 30); G.step(0.2);
  return { hops: F.count.hops - c0, off, maxLift: +maxLift.toFixed(2), onGrid, left: dt.stop.id, plantBack: dt.rig.plantLite, noPlant: F.noPlant.size }; });
check('hopscotch: Dot hops up the chalk grid on the plaza and back (on the grid, off the ground in each hop); when she leaves, her feet are planted by the rig again', hop.hops >= 6 && hop.onGrid > 200 && hop.maxLift > 0.1 && hop.left !== 'dot_hop' && hop.plantBack && hop.noPlant === 0, hop);
// running at the gulls
const gul = await ev(() => { const G = game, B = G.world.busy, F = B.play, fl = B.flocks.find((f) => f.body.name === 'gullsSquare');
  for (const b of fl.birds) if (b.st !== 'sit' || !b.p.ground) { const p = fl.perches.find((q) => q.ground && !q.taken); if (p) { if (b.p) b.p.taken = null; fl.perch(b, p); } }
  const pc = put('pico', 'pico_gulls', 12); G.exitRoom({ x: pc.pos.x + 6, z: pc.pos.z + 5, a: -2.3 }, true); G.step(0.1); const c0 = F.count.gulls; let up = 0, cheer = 0;
  for (let i = 0; i < 240; i++) { G.step(1 / 30); up = Math.max(up, fl.birds.filter((b) => b.st !== 'sit').length); if (pc.rig.anim === 'cheer') cheer++; }
  return { runs: F.count.gulls - c0, up, cheer, log: F.log.slice(-2) }; });
check('Pico runs at the gulls on the ground by the stall: they take off, and he cheers and watches them', gul.runs >= 1 && gul.up >= 1 && gul.cheer > 10, gul);
// legs swinging on the plaza's bench; Maro's broom at his doorstep
const swing = await ev(() => { const G = game, dt = put('dot', 'dot_bench', 20); G.exitRoom({ x: dt.pos.x + 4, z: dt.pos.z - 3, a: 0.5 }, true); const k = []; for (let i = 0; i < 60; i++) { G.step(1 / 30); if (dt.st === 'seated') k.push(dt.rig.j.legL.knee.rotation.x); } return { st: dt.st, n: k.length, range: k.length ? +(Math.max(...k) - Math.min(...k)).toFixed(2) : 0 }; });
check('Dot sits on the plaza\'s bench and swings her legs', swing.st === 'seated' && swing.n > 20 && swing.range > 0.4, swing);
const sweep = await ev(() => { const G = game, F = G.world.busy.play, m = put('maro', 'maro_sweep', 4); G.exitRoom({ x: m.pos.x + 4, z: m.pos.z + 3, a: -2.2 }, true); let vis = 0, near = 9; const xs = []; for (let i = 0; i < 90; i++) { G.step(1 / 30); if (F.broom.visible) { vis++; near = Math.min(near, Math.hypot(F.broom.position.x - m.pos.x, F.broom.position.z - m.pos.z)); xs.push(F.broom.position.x + F.broom.position.z); } }
  for (let i = 0; i < 150 && m.stop.play === 'sweep'; i++) G.step(1 / 30); G.step(0.3);
  return { vis, near: +near.toFixed(2), swing: xs.length ? +(Math.max(...xs) - Math.min(...xs)).toFixed(2) : 0, after: F.broom.visible, next: m.stop.id }; });
check('Maro sweeps his doorstep (the broom in his hands, swept side to side before him), and puts it away when he goes in', sweep.vis > 60 && sweep.near < 1.2 && sweep.swing > 0.2 && !sweep.after && sweep.next !== 'maro_sweep', sweep);
// Doran fishes off the quay while nobody needs him; walk up to him: the rod against the wall, he talks; walk away: out again
const fish = await ev(() => { const G = game, B = G.world.busy, H = B.harbour, n = G.npcs.find((x) => x.def.id === 'doran'), S = H.spot; const out = { at: +Math.hypot(n.pos.x - S.x, n.pos.z - S.z).toFixed(2) };
  G.exitRoom({ x: S.x + 9, z: S.z - 6, a: -1 }, true); P.settle(); G.step(2); out.far = { st: H.f.st, line: H.line.visible, face: +Math.abs(Math.atan2(Math.sin(n.angle - S.fish), Math.cos(n.angle - S.fish))).toFixed(2) };
  H.f.st = 'wait'; H.f.wait = 0; H.f.t = 0; const c0 = H.count.catches + H.count.misses; const b0 = H.bucket.n; for (let i = 0; i < 200; i++) G.step(1 / 30); out.bite = H.count.catches + H.count.misses - c0; out.bucket = [b0, H.bucket.n];
  const t = P.talk('doran'); out.talk = t.r; out.near = { st: H.f.st, rodRest: Math.hypot(H.rod.position.x - H.rest.x, H.rod.position.z - H.rest.z) < 0.05 };
  G.exitRoom({ x: S.x + 9, z: S.z - 6, a: -1 }, true); G.step(2); out.again = H.f.st;
  n.forceAnim = 'hide'; G.step(0.5); out.napping = H.f.st; n.forceAnim = null; G.step(0.5);
  out.bucketSolid = G.physics.blockedAt(H.bucket.x, H.bucket.z, G.physics.groundAt(H.bucket.x, H.bucket.z, 3), 0.05);
  return out; });
check('Doran fishes off the quay by his shed (turned to the water, the line out) while Twinsen is off; a bite comes and is landed (a fish to the bucket, or a shrug)', fish.at < 0.6 && fish.far.st !== 'rest' && fish.far.line && fish.far.face < 0.3 && fish.bite >= 1, fish);
check('…walking up to him, the rod goes against the shed wall and he talks as before; walked away, he fishes again; napping (the prologue\'s pose) he does not; his bucket is solid', fish.talk === 'talked' && fish.near.st === 'rest' && fish.near.rodRest && fish.again !== 'rest' && fish.napping === 'rest' && fish.bucketSolid, fish);
const xil = await ev(() => { const G = game, H = G.world.busy.harbour, n = G.npcs.find((x) => x.def.id === 'xil'); G.exitRoom({ x: n.pos.x + 9, z: n.pos.z - 1, a: -1.5 }, true); P.settle(); G.step(1.5);
  const out = { far: { anim: n.forceAnim, ledger: H.ledger.visible, dl: +H.ledger.position.distanceTo(n.pos).toFixed(2) } }; const t = P.talk('xil'); out.talk = t.r; out.near = { anim: n.forceAnim, ledger: H.ledger.visible }; return out; });
check('Xil writes in his ledger on the pier (open between his hands); as Twinsen comes up it is put away and he talks', xil.far.anim === 'tinker' && xil.far.ledger && xil.far.dl < 2.5 && xil.talk === 'talked' && xil.near.anim === null && !xil.near.ledger, xil);
// the washing moves in the breeze near Twinsen, and keeps still far off; the posts are solid
const wash = await ev(() => { const G = game, Bt = G.world.busy.bits, L = Bt.lines[0]; G.exitRoom({ x: L.L.a.x - 5, z: L.L.a.z + 1.5, a: 1.5 }, true); G.step(0.5); const v0 = L.im.instanceMatrix.version; G.step(1); const moving = L.im.instanceMatrix.version > v0;
  G.exitRoom({ x: -42, z: -2, a: 0 }, true); G.step(0.5); const v1 = L.im.instanceMatrix.version; G.step(1);
  return { moving, still: L.im.instanceMatrix.version === v1, posts: Bt.lines.map((l) => [l.L.a, l.L.b].every((q) => G.physics.blockedAt(q.x, q.z, G.physics.groundAt(q.x, q.z, 4), 0.02))), path: Bt.lines.map((l) => +G.world.pathDist((l.L.a.x + l.L.b.x) / 2, (l.L.a.z + l.L.b.z) / 2).toFixed(1)), door: Bt.lines.map((l) => +G.walkers.doorDist((l.L.a.x + l.L.b.x) / 2, (l.L.a.z + l.L.b.z) / 2).toFixed(1)) }; });
check('the washing moves on its lines near Twinsen and keeps still far off; the posts are solid; both lines off the paths and doorways', wash.moving && wash.still && wash.posts.every(Boolean) && wash.path.every((d) => d > 3) && wash.door.every((d) => d > 2), wash);
// the cat: asleep on the bench by Twinsen's door; he walks up (INPUT): it wakes and trots off to another of its places, and settles
const cat = await ev(() => { const G = game, C = G.world.busy.bits.cat; C.reset(); const s0 = C.spots[0]; G.exitRoom({ x: s0.x + 3.5, z: s0.z - 6, a: 0 }, true); P.settle(); G.step(1); const out = { st0: C.st, spot0: C.spot };
  P.go(s0.x + 1.2, s0.z - 0.6, { tol: 0.4, maxT: 10 }); let k = 0; const sts = new Set(); for (; k < 900 && !(C.st === 'sleep' && C.spot !== 0); k++) { G.step(1 / 30); sts.add(C.st); }
  out.states = [...sts]; out.spot = C.spot; out.t = +(k / 30).toFixed(1); out.at = +Math.hypot(C.pos.x - C.spots[C.spot].x, C.pos.z - C.spots[C.spot].z).toFixed(2);
  out.offPaths = C.spots.map((q) => +G.world.pathDist(q.x, q.z).toFixed(1)); out.mrrp = C.count.mrrp; return out; });
check('the cat sleeps on the bench by Twinsen\'s door; walked up to, it wakes, stretches, trots off to another of its places and settles down again', cat.st0 === 'sleep' && cat.spot !== 0 && ['wake', 'stretch', 'go'].every((s) => cat.states.includes(s)) && cat.at < 0.1, cat);

// ---- every chapter Citadel is seen in: the town's state, its talk, who is about (TOWN-LIFE-3)
const STATES = { well: 'dry', project: 'hot', zeelich: 'away', dig: 'away', steam: 'away', pass: 'away', observatory: 'away', evacuation: 'evac', council: 'council', network: 'network', shell: 'deep', core: 'deep', home: 'home' };
const states = await ev(async (S) => { const { townState } = await import('/src/game/townbusy.js'); const { t } = await import('/src/game/i18n.js'); const G = game, f = G.flags, out = {}, bad = [];
  const keep = { chapterKey: f.chapterKey, chapter: f.chapter, index: G.story.index };
  for (const k of Object.keys(S)) { G.story.index = G.story.chapters.findIndex((c) => c.key === k); out[k] = townState(G);
    for (let i = 0; i < 6; i++) { const key = `ro_${out[k]}_${i}`, s = t(key); if (s === key || !/^[\x20-\x7e]+$/.test(s) || s.length > 80) bad.push(key); } }
  f.chapterKey = keep.chapterKey; f.chapter = keep.chapter; G.story.index = keep.index; return { out, bad }; }, STATES);
check('the town\'s state follows every chapter Citadel is seen in (dry, hot, Twinsen away, the evacuation, the council, the network, the descent, home), and each has six short English lines of talk', Object.entries(STATES).every(([k, v]) => states.out[k] === v) && states.bad.length === 0, states);
// the evacuation (chapter 8): the children, the fishing, Odile's counter, the other residents: off; Maro and Tilde pack, hurrying, and talk about it
await setChapter('evacuation', { c1_water: true, c1_plan: true });
const evac = await ev(() => { const G = game, W = G.walkers, B = G.world.busy; P.settle(); G.exitRoom({ x: -51.5, z: 41.5, a: Math.PI }, true); G.step(1);
  const res = W.res.filter((r) => Math.abs(r.stops[0]?.x ?? 999) < 300); const m = res.find((r) => r.def.id === 'maro'), t = res.find((r) => r.def.id === 'tilde');
  for (const r of [m, t]) { const i = r.stops.findIndex((s) => s.id === r.def.id + '_evac'); r.ri = i; r.away = null; r.setPresent(true); r.slotAt(r.stops[i]); r.arrived(r.stops[i], true); }
  B.hide(); B.chat.speaker = null; const keys = []; const sacks = new Set(), speed = [m.speed, t.speed];
  for (let i = 0; i < 1600 && keys.length < 2; i++) { G.step(0.25); if (B.bub && B.bub.prio === 1 && !keys.includes(B.bub.key)) keys.push(B.bub.key); }
  for (let i = 0; i < 400; i++) { G.step(0.25); for (const r of [m, t]) if (r.carrying) sacks.add(r.def.id + ':' + r.carrying); }
  const out = { keys, sacks: [...sacks], speed: [m.speed, t.speed].map((v) => +v.toFixed(2)), state: B.state, stage: W.stage };
  out.away = res.filter((r) => r !== m && r !== t).map((r) => [r.def.id, r.away]).filter(([, a]) => a !== 'story');
  out.present = [m.present || m.st === 'inside', t.present || t.st === 'inside'];
  out.play = res.filter((r) => r.stop?.play && !r.away && r.present).map((r) => r.def.id);
  out.fish = B.harbour.f.st; out.ledger = B.harbour.ledger.visible; out.odile = G.npcs.find((n) => n.def.id === 'odile')?.forceAnim ?? null;
  out.stops = [m, t].map((r) => r.stop.id); return out; });
check('evacuation: the other residents are off the streets (as before), no game, no fishing, no ledger, no counter work; Maro and Tilde stay to pack — bundles out of their houses, a hurried word at the benches about the evacuation', evac.state === 'evac' && evac.stage === 2 && evac.away.length === 0 && evac.present.every(Boolean) && evac.play.length === 0 && evac.fish === 'rest' && !evac.ledger && evac.odile !== 'tinker' && evac.keys.length >= 1 && evac.keys.every((k) => /^ro_evac_/.test(k)) && evac.sacks.length >= 1 && evac.speed.every((v) => v > 1.3), evac);
// home again (the epilogue, Keep Exploring): everyone back, the children play, the talk is festive
await setChapter('home', { c1_water: true, ep_dinner: true, ep_free: true });
const homeT = await ev(() => { const G = game, W = G.walkers, B = G.world.busy, F = B.play; P.settle(); if (G.room) G.exitRoom({ x: -42, z: -2, a: 0 }, true); G.step(1);
  const res = W.res.filter((r) => Math.abs(r.stops[0]?.x ?? 999) < 300); const back = res.filter((r) => r.away === 'story').map((r) => r.def.id);
  const pc = put('pico', 'pico_tag', 30); put('dot', 'dot_tag', 30); G.exitRoom({ x: pc.stop.field.x + 7, z: pc.stop.field.z - 3, a: -1.4 }, true); const c0 = F.count.tag; for (let i = 0; i < 120; i++) G.step(1 / 30);
  const lines = G.story.citizens.linesFor(G.npcs.find((n) => n.def.id === 'pico'));
  return { state: B.state, stage: W.stage, back, tag: F.count.tag - c0, lines: lines.slice(0, 2), maroSpeed: +res.find((r) => r.def.id === 'maro').speed.toFixed(2) }; });
const hHome = await hear({ c1_water: true });
check('home again (epilogue): everyone is back on the streets at their usual pace, the children play tag again, and the talk is festive (a resident\'s word, the plaza\'s talk)', homeT.state === 'home' && homeT.stage === 1 && homeT.back.length === 0 && homeT.tag >= 1 && homeT.lines[0] === 'rs_pico_home' && homeT.maroSpeed < 1.2 && hHome.keys.length >= 2 && hHome.keys.every((s) => /^ro_home_/.test(s)), { homeT, hHome });
// the council and the network (chapters 9, 10): the plaza's talk follows
await setChapter('council', { c1_water: true });
const hCouncil = await hear({ c1_water: true });
await setChapter('network', { c1_water: true });
const hNet = await hear({ c1_water: true });
check('chapters 9 and 10 on Citadel: the plaza\'s talk is of the council, then of the network\'s days', hCouncil.keys.length >= 2 && hCouncil.keys.every((s) => /^ro_council_/.test(s)) && hNet.keys.length >= 2 && hNet.keys.every((s) => /^ro_network_/.test(s)), { hCouncil, hNet });
await setChapter('project', { c1_water: true });
// its cost on the busy street: the layer's own update, timed over 300 frames on the square with the town running
const cost = await ev(() => { const G = game, B = G.world.busy; G.exitRoom({ x: G.world.well.x + 2, z: G.world.well.z + 4, a: Math.PI }, true); P.settle();
  const up = B.update.bind(B); let ms = 0, n = 0; B.update = (dt, t) => { const t0 = performance.now(); up(dt, t); ms += performance.now() - t0; n++; };
  const pt = B.play.tick.bind(B.play); let pms = 0; B.play.tick = (r, dt, s) => { const t0 = performance.now(); const v = pt(r, dt, s); pms += performance.now() - t0; return v; };
  for (let i = 0; i < 300; i++) G.step(1 / 60); B.update = up; B.play.tick = pt; return { msPerFrame: +(ms / Math.max(1, n)).toFixed(3), playMs: +(pms / Math.max(1, n)).toFixed(3), frames: n }; });
console.log(`  TOWN-LIFE-2/3 layer cost on the square: ${cost.msPerFrame} ms a frame (+ ${cost.playMs} ms in the residents' play) over ${cost.frames} frames (this machine, CPU)`);
check('the town\'s small business costs under 0.3 ms a frame on the square (CPU, this machine; TOWN-LIFE-3\'s games, rod, washing and cat included)', cost.frames >= 290 && cost.msPerFrame + cost.playMs < 0.3, cost);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
