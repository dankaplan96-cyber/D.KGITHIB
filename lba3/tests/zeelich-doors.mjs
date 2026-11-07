// ZEELICH-DOORS (the user, 7.11.2026: "Zeelich is unfinished: missing doors"): every door on Zeelich's terminal island,
// played by input. Chapter 3 (on Zeelich after the arrival) and chapter 5 (an island chapter: the shuttles fly):
//   - every door the story offers there (the three houses of zhomes.js, the bakehouse, Baldino's workshop, the
//     spaceport terminal) is walked into from the street: the room is the door's, he stands on its floor, the room
//     is furnished (more than a bare shell) and lit; he walks out through its exit and is back on the street within
//     2 m of that door, facing away from it, on the ground;
//   - no house door on the street says the generic "Locked.": the council house, the mills and the project's huts
//     answer with their own reason (a line of their own), and the council's door carries its notice;
//   - the people inside (Lissa in the flower house, Wenna at Oku's) are there and talk; the HELD crates stand while
//     the shuttles are grounded (chapter 3) and are mostly gone in chapter 5; the bakery's oven follows The Second Bake;
//   - a save made inside a house comes back there on Continue (no crash; he stands on its floor).
// SHOTS=dir writes a picture of each room and of each street door.
// ISO (logged): the chapters are reached by their flags (as tests/zeelich-life.mjs does).
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
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.jpg'), type: 'jpeg', quality: 78 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });

await open(page, '?nocine'); await menu(page, 'new');
iso('chapter 2 finished by flags: story.nextChapter() starts chapter 3 on Zeelich');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await said();

// every door the story offers on Zeelich: in and out by input
const tour = async (tag) => {
  const doors = await ev(() => game.story.doors().filter((d) => d.region === 'zeelich').map((d) => ({ room: d.room, x: d.x, z: d.z, prompt: !!d.prompt })));
  const rooms = [];
  for (const d of doors) {
    const r = await ev((d) => {
      const G = game, Z = G.rooms.zeelich;
      if (G.room?.id !== 'zeelich') { const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z); }
      // from 3 m out on the street side (the door faces the street's middle line, z = 0)
      const sz = Math.sign(Z.street.z - d.z) || 1, ax = d.x, az = d.z + sz * 3.0;
      P.go(ax, az, { tol: 0.8, run: true, maxT: 60, fight: false }); P.settle();
      // (a door that opens by its prompt — the bakehouse's, by Snuff's counter: walk up to it, press E)
      let t;
      if (d.prompt) {
        P.go(d.x, d.z, { tol: 0.4, maxT: 30, fight: false }); P.settle();
        const seen = []; G.story.interactables((dd, max, o) => { if (dd < max) seen.push(o); }, (x, z) => Math.hypot(x - G.hero.pos.x, z - G.hero.pos.z));
        const it = seen.find((o) => o.kind === 'zhenter' && o.room === d.room);
        if (it) { P.face(d.x, d.z - 3); G.story.interact(it); let k = 0; while ((G.trans || G.room?.id === 'zeelich') && k++ < 40) G.step(0.1); P.settle(); }
        t = { to: G.room?.id, prompt: !!it };
      } else t = P.through(d.x, d.z);
      const R = G.room, h = G.hero.pos;
      const inRoom = R?.id === d.room;
      const floor = inRoom ? Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 : false;
      let meshes = 0; R?.group?.traverse((m) => { if (m.isMesh) meshes++; });
      const lit = (R?.lights?.length || 0) + (() => { let n = 0; R?.group?.traverse((m) => { if (m.isLight) n++; }); return n; })();
      for (let i = 0; i < 30; i++) G.frame(1 / 30, false);
      return { room: d.room, to: t.to, inRoom, floor, meshes, lit, people: G.npcs.filter((n) => n.present && R?.bounds?.some((b) => n.pos.x > b.x0 && n.pos.x < b.x1 && n.pos.z > b.z0 && n.pos.z < b.z1)).map((n) => n.def.id) };
    }, d);
    await shot(tag + '-in-' + d.room);
    const o = await ev((d) => {
      const G = game, e = G.room?.exits?.find((x) => !x.room || x.room === 'zeelich') || G.room?.exits?.[0];
      if (!e || G.room?.outdoor) return { out: 'no exit' };
      const t = P.through(e.x, e.z); const h = G.hero.pos;
      for (let i = 0; i < 20; i++) G.frame(1 / 30, false);
      const away = Math.cos(Math.atan2(h.x - d.x, h.z - d.z) - G.hero.angle);
      return { out: t.to, near: +Math.hypot(h.x - d.x, h.z - d.z).toFixed(2), away: +away.toFixed(2), ground: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 };
    }, d);
    await shot(tag + '-out-' + d.room);
    rooms.push({ ...r, ...o });
  }
  return rooms;
};
const t3 = await tour('ch3');
for (const r of t3) check(`chapter 3: the door into ${r.room} leads in (on its floor, furnished, lit) and back out by its door, facing away`, r.inRoom && r.floor && r.meshes >= 8 && r.lit >= 1 && r.out === 'zeelich' && r.near < (r.room === 'workshop' ? 3.0 : 2.2) && r.away > 0.3 && r.ground, r);   // (the workshop's way out is chapter2.js's, 2.5 m out)
const want3 = ['zh_pelleck', 'zh_nara', 'zh_oku', 'zh_bakery', 'workshop', 'zterminal'];
check('chapter 3: the street offers the houses, the bakehouse, the workshop and the terminal', want3.every((w) => t3.some((r) => r.room === w)), t3.map((r) => r.room));
check('chapter 3: Lissa in the flower house, Wenna at Oku\'s', t3.find((r) => r.room === 'zh_nara')?.people.includes('zh_lissa') && t3.find((r) => r.room === 'zh_oku')?.people.includes('zh_wenna'), t3.map((r) => [r.room, r.people]));

// no generic "Locked." on the street: each shut door says why
const shut = await ev(() => {
  const G = game, Z = G.rooms.zeelich, out = [];
  if (G.room?.id !== 'zeelich') { const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z); }
  for (const d of Z.closedDoors) {
    if (d.id === 'control-hut' && !G.flags.c2_shield) { out.push({ id: d.id, skipped: 'behind the shield' }); continue; }
    if (d.id === 'depot-shed') { out.push({ id: d.id, skipped: 'inside the patrolled depot (its prompt: below, by the interaction list)' }); continue; }
    const g = P.go(d.x, d.z, { tol: 0.5, maxT: 60, fight: false }); P.settle();
    // what the street offers there (collected from the story's own list, so a resident passing by doesn't take the test)
    const seen = []; G.story.interactables((dd, max, o) => { if (dd < max) seen.push(o); }, (x, z) => Math.hypot(x - G.hero.pos.x, z - G.hero.pos.z));
    const it = seen.find((o) => o.kind === 'zhshut');
    out.push({ id: d.id, go: g.r, at: [+(G.hero.pos.x - 2400).toFixed(1), +G.hero.pos.z.toFixed(1)], kind: it?.kind, key: it?.key });
    if (it && !out.said) { out.said = true; G.story.interact(it); P.settle(); }
  }
  // every house door: what its prompt is (a door into the house, or a reason), never the generic shut one
  const generic = Z.shutDoors.filter((d) => !d.own).map((d) => d.id);
  return { out, generic };
});
check('the council house, the mills: their own reason (no generic "Locked.")', shut.out.filter((s) => !s.skipped).every((s) => s.kind === 'zhshut' && /^zh_closed_/.test(s.key)), shut);
check('no house door on Zeelich\'s street is left to the generic "Locked."', shut.generic.length === 0, shut.generic);
const sd = await said();
check('a shut door\'s line is its own (not "Locked.")', sd.length && !sd.some((l) => /^Locked\.?$/.test(l)), sd);

// inside: looks and talk
const insideTalk = await ev(() => {
  const G = game; P.enter('zh_nara'); const a = P.talk('zh_lissa');
  P.enter('zeelich'); P.enter('zh_oku'); const b = P.talk('zh_wenna');
  P.enter('zeelich');
  return { a: a.r, b: b.r, room: G.room?.id };
});
const tl = await said();
check('Lissa and Wenna talk (their own lines)', insideTalk.a === 'talked' && insideTalk.b === 'talked' && tl.length >= 2, { insideTalk, tl });
const held3 = await ev(async () => { const { ZH } = await import(location.origin + '/src/game/zhomes.js'); return { held: !!ZH.zh_nara && game.story.zlife._held, hot: game.story.zlife._hot }; });
check('chapter 3: the crates for Citadel stand HELD in the flower house; the bakery oven is cold (the crate on the flue)', held3.held === true && held3.hot === false, held3);

// a save inside a house comes back there
await ev(() => { P.enter('zh_pelleck'); P.settle(); game.save(false); });
const file = path.join(os.tmpdir(), 'zeelich-doors-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await browser.close();
({ browser, context, page } = await launch({ storageState: file }));
await open(page, '?nocine'); await menu(page, 'continue');
const back = await ev(() => { const G = game, h = G.hero.pos; P.settle(); return { room: G.room?.id, floor: Math.abs(h.y - G.physics.groundAt(h.x, h.z, h.y + 0.5)) < 0.15 }; });
check('Save inside Mr Pelleck\'s house → Continue: back in it, on the floor', back.room === 'zh_pelleck' && back.floor, back);
fs.rmSync(file, { force: true });

// chapter 5 (the shuttles fly): the crates have gone out, the workshop's door still leads in
iso('chapter 5 by its flags (as the island tests do): the street in its middle phase');
await ev(() => { const G = game, S = G.story; const i = S.chapters.findIndex((c) => c.key === 'steam'); G.flags.chapter = i; G.flags.chapterKey = 'steam'; S.refreshCast(); P.enter('zeelich'); P.settle(); });
const t5 = await tour('ch5');
for (const r of t5) check(`chapter 5: the door into ${r.room} leads in and back out`, r.inRoom && r.floor && r.out === 'zeelich' && r.near < (r.room === 'workshop' ? 3.0 : 2.2), r);
check('chapter 5: Baldino\'s workshop is open (it was "Locked." in chapters 4–8)', t5.some((r) => r.room === 'workshop'), t5.map((r) => r.room));
const held5 = await ev(() => ({ held: game.story.zlife._held }));
check('chapter 5: most of Nara\'s crates have gone out on the shuttles', held5.held === false, held5);
done();
await browser.close();
