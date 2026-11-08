// ISLE-HOMES (wave 3 of the maturity pack; the user, 7.11.2026: "missing doors"): every house door on Zeelich's
// islands and in Kesh (src/game/ihomes.js), played by input in chapter 5 (the shuttles fly; Kesh is visited):
//   - every door the story offers in each region is walked into from 2.6 m before it: the room is the door's, he stands
//     on its floor, it is furnished (more than a bare shell) and lit, it has its own look (a line of its own, not
//     "Locked."); he walks out through its exit and is back in the region within 2.8 m of the door's sill (1.45 m out, the step he takes out of it, a resident by the door), facing away
//     from it, on the ground; a second entry (the room cached: warm) leads in again;
//   - no house door in those regions answers the generic "Locked.": each is a way in, a story door, a kept place's
//     door (desertold.js, purposes.js), or one of EXCEPT, which says its own reason and carries its sign;
//   - the keepers are behind their counters and talk;
//   - a save made inside a house comes back there on Continue (no crash, on its floor), and the door out still leads
//     out (the island built behind the black first).
// SHOTS=dir writes a picture of each room (and of the shut doors' signs). ROOMS=a,b limits the tour (a quick run).
// ISO (logged): the chapter by its flags; he is put on each region's spawn and 2.6 m before each door (the walk
// in and out is by input). On Knartas he walks to each door's spot from the pad / the last door (KNARTAS-GATE).
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.jpg'), type: 'jpeg', quality: 72, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const ONLY = process.env.ROOMS ? new Set(process.env.ROOMS.split(',')) : null;

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 5 by its flags (as the island tests do)');
await ev(() => { const G = game, f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'steam' }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'steam'); G.hero.hasBall = true; G.story.refreshCast(); P.settle(); });
await said();
const regions = ['isle_otringal', 'isle_knartas', 'isle_mosquibee', 'isle_celebration', 'isle_undergas', 'isle_platform', 'isle_orchard', 'desert', 'hamalayi'];   // (DOOR-SWEEP: and the Hamalayi's seven: the landing's hut, Lhar, the observatory keeper's)
const WALK = ['isle_knartas'];   // (regions whose doors he walks to from the landing, not placed before them)
const all = [];
for (const reg of regions) {
  iso('put on ' + reg + "'s spawn");
  const doors = await ev((reg) => { const G = game; G.regions.ensure(reg, 'test'); const R = G.rooms[reg]; G.enterRoom(reg, R.spawn, true); P.settle();
    return G.story.doors().filter((d) => d.region === reg && d.room?.startsWith('ih_')).map((d) => ({ room: d.room, house: d.house, x: d.x, z: d.z })); }, reg);
  for (const d of doors) {
    if (ONLY && !ONLY.has(d.room)) continue;
    const r = await ev(({ d, reg, WALK }) => {
      const G = game, R0 = G.rooms[reg], sd = R0.shutDoors.find((e) => e.id === d.house), a = sd.ry ?? 0;
      if (G.room?.id !== reg) { const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z); }
      // before the door (ISO: 2.6 m out, or nearer where the ground out there is a step below the door's), then in by
      // input; straight at it, or from either side as a player steps round someone standing before it
      // (KNARTAS-GATE: on Knartas he walks there instead, by the planner, from the shuttle pad for the first door and
      //  from the last door's step out for the next: the harbour and the diggers' village are one walk)
      let t = null, walked = null;
      for (const side of [0, 0.6, -0.6]) {
        if (G.room?.id === d.room) break;
        for (const out of [2.6, 2.0, 1.5]) {
          const b = a + side, sx = sd.sill.x + Math.sin(b) * out, sz = sd.sill.z + Math.cos(b) * out, gy = G.physics.groundAt(sx, sz, sd.y + 2);
          if (Math.abs(gy - sd.y) > 0.5 || G.physics.blockedAt(sx, sz, gy + 0.3, 0.4)) continue;
          if (WALK.includes(reg) && walked == null) {
            const from = [G.hero.pos.x, G.hero.pos.z].map((v) => +v.toFixed(1));
            let g = P.go(sx, sz, { tol: 0.35, maxT: 150, fight: false }), via = null;
            // (stuck at a bank too steep to walk up: first to the lane 5 m before the door, then up to it, as a player
            //  turns and comes at it from the front: knartas-28--36 stands on a grass mound, its front the gentle side)
            if (g.r !== 'arrived') { via = g.at; P.go(sd.sill.x + Math.sin(b) * 5, sd.sill.z + Math.cos(b) * 5, { tol: 0.5, maxT: 60, fight: false }); g = P.go(sx, sz, { tol: 0.35, maxT: 60, fight: false }); }
            // (still stuck: the harness's planner takes steps the hero cannot — knartas-16-18's terrace has no way up from
            //  the east, the gully by knartas-22-15's corner; ISO: back on the shuttle pad, and on foot from there)
            let pad = false;
            if (g.r !== 'arrived') { pad = true; G.enterRoom(reg, R0.spawn, true); P.settle(); g = P.go(sx, sz, { tol: 0.35, maxT: 150, fight: false }); }
            walked = g.r === 'arrived' ? { from, t: +g.t.toFixed(1), ...(via ? { via } : {}), ...(pad ? { fromPad: true } : {}) } : { from, failed: g.r, at: g.at };
            if (g.r === 'arrived') { P.face(d.x, d.z); t = P.through(d.x, d.z); break; }
          }
          G.hero.pos.set(sx, gy, sz); G.hero.angle = b + Math.PI; G.hero.vy = 0; P.settle();
          t = P.through(d.x, d.z); break;
        }
      }
      t ||= { to: G.room?.id ?? 'citadel', r: 'no place to start from' };
      const R = G.room, h = G.hero.pos;
      const inRoom = R?.id === d.room;
      const floor = inRoom ? Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 : false;
      let meshes = 0, lights = 0; R?.group?.traverse((m) => { if (m.isMesh) meshes++; if (m.isLight) lights++; });
      for (let i = 0; i < 20; i++) G.frame(1 / 30, false);
      return { room: d.room, house: d.house, reg, to: t.to, inRoom, floor, meshes, lights, walked };
    }, { d, reg, WALK });
    await shot(d.room);
    // its own look (the room's first piece), read by input
    const lk = await ev(async (rid) => {
      const G = game, { IH } = await import(location.origin + '/src/game/ihomes.js');
      const l = IH[rid]?.looks?.[0]; if (!l || G.room?.id !== rid) return { look: 'none' };
      P.go(l.x, l.z, { tol: 0.35, maxT: 20, fight: false }); P.face(l.at.x, l.at.z);
      const tg = P.target(); if (tg?.kind !== 'ihlook') return { look: 'no prompt', tg };
      P.tap('KeyE', 0.1); P.settle(); return { look: 'read', key: l.key };
    }, d.room);
    const sl = await said();
    const o = await ev(({ d, reg }) => {
      const G = game, e = G.room?.exits?.find((x) => !x.room) || G.room?.exits?.[0];
      if (!e || G.room?.outdoor) return { out: 'no exit' };
      const t = P.through(e.x, e.z); const h = G.hero.pos;
      for (let i = 0; i < 20; i++) G.frame(1 / 30, false);
      const sd = G.rooms[reg].shutDoors.find((x) => x.id === d.house);
      const away = Math.cos(Math.atan2(h.x - sd.sill.x, h.z - sd.sill.z) - G.hero.angle);
      const near = Math.hypot(h.x - sd.sill.x, h.z - sd.sill.z);
      // a second time in (warm: the room is built) and out again
      const t2 = P.through(d.x, d.z), in2 = G.room?.id === d.room;
      const e2 = G.room?.exits?.find((x) => !x.room); if (e2) P.through(e2.x, e2.z);
      return { out: t.to, near: +near.toFixed(2), away: +away.toFixed(2), ground: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, again: in2 && G.room?.id === reg, t2: t2.to };
    }, { d, reg });
    all.push({ ...r, ...lk, line: sl[0], ...o });
  }
  // the region's shut doors: none generic
  const sh = await ev(async (reg) => {
    const G = game, R = G.rooms[reg], { EXCEPT, IHOMES } = await import(location.origin + '/src/game/ihomes.js');
    if (G.room?.id !== reg) { const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z); }
    const live = G.story.doors().filter((e) => e.region === reg);
    const generic = R.shutDoors.filter((d) => !d.own && !live.some((e) => Math.hypot(e.x - d.x, e.z - d.z) < 2.2)).map((d) => d.id);
    const ex = [];
    for (const d of R.shutDoors.filter((q) => EXCEPT.has(q.id))) {
      G.hero.pos.set(d.x, G.physics.groundAt(d.x, d.z, d.y + 2), d.z); G.hero.angle = (d.ry ?? 0) + Math.PI; P.settle();
      const it = G.findInteractable();
      let sign = false; R.group.traverse((m) => { if (m.isMesh && m.material?.map && Math.hypot(m.getWorldPosition(m.position.clone()).x - d.sill.x, m.getWorldPosition(m.position.clone()).z - d.sill.z) < 0.5) sign = true; });
      ex.push({ id: d.id, kind: it?.kind, key: it?.key, sign, want: IHOMES[d.id].ex });
      if (it?.kind === 'ihshut') { G.story.interact(it); P.settle(); }
    }
    return { generic, ex };
  }, reg);
  const exl = await said();
  check(`${reg}: no house door is left to the generic "Locked."`, sh.generic.length === 0, sh.generic);
  if (sh.ex.length) {
    check(`${reg}: each door kept shut gives its own reason and carries its sign`, sh.ex.every((e) => e.kind === 'ihshut' && e.key === e.want && e.sign), sh.ex);
    check(`${reg}: the shut doors' lines are their own (not "Locked.")`, exl.length && !exl.some((l) => /^Locked\.?$/.test(l)), exl);
    for (const e of sh.ex) { await ev((id) => { const G = game, d = G.room.shutDoors.find((q) => q.id === id), a = (d.ry ?? 0); G.hero.pos.set(d.sill.x + Math.sin(a) * 3, G.physics.groundAt(d.sill.x + Math.sin(a) * 3, d.sill.z + Math.cos(a) * 3, d.y + 2), d.sill.z + Math.cos(a) * 3); G.hero.angle = a + Math.PI; P.settle(); for (let i = 0; i < 20; i++) G.frame(1 / 30, false); }, e.id); await shot('shut-' + e.id); }
  }
}
// (KNARTAS-LEDGE: Quill's office's door on Knartas, on its ledge over the quay's arm, has its steps down now (zislands.js
// doorStair): asked in again like every other door)
for (const r of all) check(`${r.room}: leads in (on its floor, furnished, lit), its own look reads, back out by its door facing away, and in again`,
  r.inRoom && r.floor && r.meshes >= 14 && r.lights >= 1 && r.look === 'read' && r.line && !/^Locked/.test(r.line) && r.out !== r.room && r.near < 2.8 && r.away > 0.3 && r.ground && r.again, r);
const walkedTo = all.filter((r) => WALK.includes(r.reg));
check('Knartas: every door, the harbour\'s and the diggers\' village\'s, reached on foot from the shuttle pad (one walk door to door, by the planner)', walkedTo.length > 0 && walkedTo.every((r) => r.walked && !r.walked.failed), { n: walkedTo.length, failed: walkedTo.filter((r) => !r.walked || r.walked.failed).map((r) => ({ room: r.room, ...r.walked })) });
for (const r of walkedTo) console.log('WALK ' + r.room + ' ' + JSON.stringify(r.walked));
if (!ONLY) check('every room of ISLE-HOMES was entered (70: 55 on the islands, 5 Kesh houses, 3 post cabins, 7 in the Hamalayi)', all.length === 70 && all.every((r) => r.inRoom), all.length);

// the keepers behind their counters, talking
const keep = await ev(async () => {
  const { KEEPERS } = await import(location.origin + '/src/game/ihomes.js');
  const G = game, out = [];
  for (const [id, K] of Object.entries(KEEPERS)) {
    if (!G.regions.built(K.room)) { out.push({ id, r: 'room not built' }); continue; }
    const reg = (await import(location.origin + '/src/game/ihomes.js')).regionOf((await import(location.origin + '/src/game/ihomes.js')).doorOf(K.room));
    if (G.room?.id !== K.room) { if (G.room?.id !== reg) { G.enterRoom(reg, G.rooms[reg].spawn, true); P.settle(); } const d = G.story.doors().find((x) => x.room === K.room); const sd = G.room.shutDoors.find((e) => e.id === d.house), a = sd.ry ?? 0; G.hero.pos.set(sd.sill.x + Math.sin(a) * 2.4, G.physics.groundAt(sd.sill.x + Math.sin(a) * 2.4, sd.sill.z + Math.cos(a) * 2.4, sd.y + 2), sd.sill.z + Math.cos(a) * 2.4); P.settle(); P.through(d.x, d.z); }
    const n = P.npc(id);
    out.push({ id, present: !!n?.present, inRoom: G.room?.id === K.room, talk: P.talk(id).r });
  }
  return out;
});
const kl = await said();
check('the keepers stand in their rooms and talk (their own lines)', keep.every((k) => k.present && k.inRoom && k.talk === 'talked') && kl.length >= keep.length, { keep, kl: kl.slice(0, 8) });

// a save inside a house comes back there, and its door still leads out
const rid = 'ih_otringal_6_m24';
await ev((rid) => { const G = game; if (G.room?.id !== rid) { const reg = 'isle_otringal'; if (G.room?.id !== reg) { const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z); if (G.room?.id !== reg) { G.enterRoom(reg, G.rooms[reg].spawn, true); P.settle(); } } P.enter(rid); } P.settle(); G.save(false); }, rid);
const file = path.join(os.tmpdir(), 'island-doors-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue');
const back = await ev(() => { const G = game, h = G.hero.pos; P.settle(); const r = { room: G.room?.id, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15, isle: !!G.regions.built('isle_otringal') };
  const e = G.room?.exits?.find((x) => !x.room); const t = e ? P.through(e.x, e.z) : null; return { ...r, out: t?.to, state: G.state }; });
check('Save inside the tea room → Continue: back in it, on the floor; its door leads out onto Otringal', back.room === rid && back.floor && back.out === 'isle_otringal' && back.state === 'play', back);
fs.rmSync(file, { force: true });
done();
await browser.close();
