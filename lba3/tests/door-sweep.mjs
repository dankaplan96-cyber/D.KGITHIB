// DOOR-SWEEP (original-mechanics, wave 3: "interior entry and exit everywhere"): every door the story offers, in every
// region (Citadel, Zeelich's street and its homes, the isles' houses, Kesh and the post, Desert Island, the Hamalayi,
// the underground), across the chapters, checked for one consistent LBA door:
//   - walk-in doors forgive the approach: walked at by input (tank controls, Up held) from 2.6 m out along the way he
//     comes out of it, straight and 0.3 m to either side, he goes in (no pixel-precise doors);
//   - in: he lands on the room's floor clear of every exit trigger (no exit fires while he stands where he landed);
//   - out: he lands clear of every door trigger outside (DOOR_CLEAR m beyond its radius), facing away from the door he
//     came out of, on the ground, and standing still 2.5 s takes him nowhere (no accidental re-entry);
//   - a room's exit refused by the story says why (a line), never silence.
// ISO (logged): the chapter by its flags; he is put before each door (the walk in is by input); the way out is the
// game's own (Game.checkDoors's branch, run directly) and then 2.5 s with no input.
//   - a save made just out of a door (the game saves as he lands) comes back there on Continue and stays there: before
//     DOOR-CLEAR, Zeelich's terminal put him inside its own trigger and Continue walked him back in.
// CHAPTERS=1,2 limits the chapters (indices in story ORDER); ONLY=room,room limits the doors. BEFORE=1 turns DOOR-CLEAR
// off in the page (Game.clearOfDoors → the landing as given): the A/B.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const CH = (process.env.CHAPTERS || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const DOOR_CLEAR = 0.4, IN_CLEAR = 0.1;   // (the game keeps 0.45 m out of a door; a room's own spot is 0.15 m or more from its exit: main.js DOOR-CLEAR)

const before = () => (process.env.BEFORE ? ev(() => { game.clearOfDoors = (to) => to; }) : null);
await open(page, '?nocine'); await before(); await menu(page, 'new');
await ev(() => { P.settle(); const G = game; G.settings.controls = 'classic'; G.settings.autoControls = 'off'; G.applySettings(); });
const seen = new Set(), rows = [];
for (const ci of CH) {
  const key = await ev((ci) => {
    const G = game, S = G.story, f = G.flags, k = S.chapters[ci].key;
    Object.assign(f, { prologueDone: true, intro: true, chapter: ci, chapterKey: k }); G.hero.hasBall = true; S.refreshCast?.(); P.settle();
    return k;
  }, ci);
  iso(`chapter index ${ci} (${key}) by its flags`);
  await ev(() => { const G = game; for (const id of G.regions.of.keys()) if (G.regions.centreOf(id)?.outdoor || id.startsWith('isle_')) G.regions.ensure(id, 'sweep'); });
  const doors = await ev(({ only }) => game.story.doors().filter((d) => !only || only.includes(d.room)).map((d) => ({ room: d.room, region: d.region || 'citadel', x: d.x, z: d.z, r: d.r, prompt: !!d.prompt })), { only: ONLY });
  for (const d of doors) {
    const id = `${d.room}@${d.x.toFixed(1)},${d.z.toFixed(1)}`;
    if (seen.has(id)) continue; seen.add(id);
    const r = await ev(({ d, DOOR_CLEAR }) => {
      const G = game, S = G.story, h = G.hero, I = G.input, PH = G.physics;
      const here = () => G.room?.id ?? 'citadel';
      const goScene = (reg) => { if (here() === reg) return; if (reg === 'citadel') G.exitRoom({ x: G.world.well.x + 5, z: G.world.well.z + 5 }, true, true); else { G.regions.ensure(reg, 'sweep'); G.enterRoom(reg, G.rooms[reg].spawn, true, true); } };
      const sceneDoors = (reg) => S.doors().filter((q) => (q.region || 'citadel') === reg);
      const out = { room: d.room, region: d.region, r: d.r, prompt: d.prompt };
      if (!G.regions.has(d.room)) { out.err = 'no such room'; return out; }
      if (d.region !== 'citadel' && !G.regions.has(d.region)) { out.err = 'no such region'; return out; }
      const R = G.regions.ensure(d.room, 'sweep');
      // ---- in (the game's own: Game.checkDoors), then 2.5 s standing still
      goScene(d.region);
      const live = S.doors().find((q) => q.room === d.room && Math.abs(q.x - d.x) < 0.01 && Math.abs(q.z - d.z) < 0.01), spawn = live?.spawn || null;
      G.enterRoom(d.room, spawn, true, true);
      const sp = { x: h.pos.x, z: h.pos.z, a: h.angle };
      out.inFloor = Math.abs(h.pos.y - PH.groundAt(h.pos.x, h.pos.z, h.pos.y + 0.5)) < 0.2;
      out.inClear = Math.min(99, ...R.exits.map((e) => Math.hypot(sp.x - e.x, sp.z - e.z) - e.r));
      G.step(2.5);
      out.inStays = here() === d.room;
      // ---- out: each exit that leads outdoors; the one landing nearest this door is this door's
      const outs = R.exits.filter((e) => !e.room);
      out.exits = outs.length;
      let best = null;
      for (const e of outs) {
        if (here() !== d.room) G.enterRoom(d.room, spawn, true, true);
        h.pos.set(e.x, PH.groundAt(e.x, e.z), e.z);
        if (!S.canExit(R, e.to)) { (out.refused ??= []).push(e.to); continue; }
        const pr = G.regions.probe(() => S.exitTo(e.to));
        if (pr.error && !pr.misses.size) { out.err = 'exitTo threw ' + pr.error.message; continue; }
        for (const m of pr.misses) G.regions.ensure(m, 'sweep');
        const to = pr.misses.size ? S.exitTo(e.to) : pr.value;
        if (!to || !Number.isFinite(to.x)) { (out.noTo ??= []).push(e.to); continue; }
        if (to.room) G.enterRoom(to.room, to, true, true); else G.exitRoom(G.doorStep(to), true, true);
        const reg = here(), L = { x: h.pos.x, z: h.pos.z, a: h.angle, y: h.pos.y };
        const dd = Math.hypot(L.x - d.x, L.z - d.z);
        const ground = Math.abs(L.y - PH.groundAt(L.x, L.z, L.y + 0.5)) < 0.2;
        const trig = sceneDoors(reg).map((q) => ({ room: q.room, c: Math.hypot(L.x - q.x, L.z - q.z) - q.r }));
        const nearest = trig.sort((p, q) => p.c - q.c)[0];
        const away = Math.cos(Math.atan2(L.x - d.x, L.z - d.z) - L.a);
        G.step(2.5);
        const stays = here() === reg;
        const cand = { to: e.to, reg, dist: +dd.toFixed(2), clear: nearest ? +nearest.c.toFixed(2) : 99, clearOf: nearest?.room, away: +away.toFixed(2), ground, stays, L };
        if (reg === d.region && (!best || dd < best.dist)) best = cand;
        else if (!best) best = cand;
      }
      out.out = best;
      // (a door whose room has no way back out near it is one way: listed, not judged by where its room's other exits
      //  land. DOORS-LBA2: the sewer's ways from the street are hatches with lifts now, story/sewers.js, not doors)
      if (best && (best.reg !== d.region || best.dist > 6)) out.oneway = true;
      // ---- the walk in by input, from 2.6 m out along the way he comes out (straight, then 0.3 m and 0.5 m to the sides)
      if (best && best.reg === d.region && !d.prompt) {
        const ux0 = d.x - best.L.x, uz0 = d.z - best.L.z, ul = Math.hypot(ux0, uz0) || 1, ux = ux0 / ul, uz = uz0 / ul;
        const res = {};
        for (const off of [0, 0.3, -0.3, 0.5, -0.5]) {
          goScene(d.region);
          // (a line still open — the council clerk's refusals, said when the sweep asked the room's shut exits above — is
          //  read first: in a dialogue Up does nothing, and the straight walk at the council door read as 'missed')
          for (let k = 0; G.state === 'dialog' && k < 80; k++) P.tap('KeyE', 0.1);
          // (2.6 m out, or nearer where steps or a wall stand there: a player walks up to the door from wherever the street lets him)
          let sx, sz, gy, ok = false;
          // (level ground only: a slope or a flight of steps before a door is the street's matter, not the door's)
          for (const back of [2.6, 2.0, 1.6]) {
            sx = d.x - ux * back + uz * off; sz = d.z - uz * back - ux * off; gy = PH.groundAt(sx, sz, PH.groundAt(d.x, d.z) + 1.5);
            if (!PH.blockedAt(sx, sz, gy + 0.3, 0.4) && Math.abs(gy - PH.groundAt(d.x, d.z)) < 0.35) { ok = true; break; }
          }
          if (!ok) { res[off] = 'blocked start'; continue; }
          h.pos.set(sx, gy, sz); h.angle = Math.atan2(ux, uz); h.vy = 0; h.onGround = true; h.vel?.set?.(0, 0); h.resetMotion?.();
          G.doorCool = 0; G.camRig.snap(); G.step(0.1);
          if (here() !== d.region) { res[off] = 'left early'; continue; }
          I.keys.add('ArrowUp'); I.taps.add('ArrowUp');
          let t = 0; while (t < 4 && here() === d.region && !G.trans) { G.step(0.05); t += 0.05; }
          I.keys.delete('ArrowUp');
          let k = 0; while ((G.trans || G.state !== 'play') && k++ < 80) { if (G.state === 'dialog') P.tap('KeyE', 0.1); else G.step(0.1); }
          res[off] = here() === d.room ? 'in' : here() === d.region ? 'missed' : 'other:' + here();
          // (missed straight on: something stands across the way in — a fence, a sign, a person. Walked round it, as a
          //  player would, by the harness's planner from the same start: 'detour' when that leads in)
          if (res[off] === 'missed') {
            h.pos.set(sx, gy, sz); h.angle = Math.atan2(ux, uz); G.doorCool = 0; G.step(0.1);
            const t2 = P.through(d.x, d.z, { maxT: 30, fight: false });
            if (t2.to === d.room) res[off] = 'detour';
          }
          if (here() !== d.region) goScene(d.region);
        }
        out.walk = res;
      }
      goScene(d.region);
      return out;
    }, { d, DOOR_CLEAR });
    r.chapter = key;
    rows.push(r);
    const o = r.out;
    const okIn = r.inFloor && r.inClear > IN_CLEAR && r.inStays;
    const okOut = r.oneway || (o && o.ground && o.clear > DOOR_CLEAR && o.away > 0.3 && o.stays);
    const okWalk = !r.walk || ['0', '0.3', '-0.3'].every((k) => r.walk[k] === 'in' || r.walk[k] === 'detour' || r.walk[k] === 'blocked start');
    console.log(`DOOR ${key} ${r.region} → ${r.room} r=${r.r} in:${okIn ? 'ok' : 'BAD'} out:${okOut ? 'ok' : 'BAD'} walk:${okWalk ? 'ok' : 'BAD'} ${JSON.stringify({ inClear: +r.inClear?.toFixed?.(2), inStays: r.inStays, out: o && { dist: o.dist, clear: o.clear, of: o.clearOf, away: o.away, stays: o.stays, ground: o.ground, reg: o.reg }, walk: r.walk, oneway: r.oneway, refused: r.refused, err: r.err, noTo: r.noTo })}`);
  }
}
// ---- the doors between two rooms of one building (Twinsen's house and its cellar, the tavern's cellar, the sewers, the
// deep installation's chain): through each, he lands clear of the other room's exits and stays
const links = await ev(({ IN_CLEAR, only }) => {
  const G = game, out = [];
  const ids = [...G.regions.of.keys()].filter((id) => { const c = G.regions.centreOf(id); return c && !c.outdoor && !id.startsWith('isle_'); });
  for (const id of ids) {
    let R; try { R = G.regions.ensure(id, 'sweep'); } catch (e) { continue; }
    if (!R || R.outdoor) continue;
    for (const e of R.exits.filter((q) => q.room)) {
      if (only && !only.includes(id) && !only.includes(e.room)) continue;
      const R2 = G.regions.ensure(e.room, 'sweep'); if (!R2) { out.push({ from: id, to: e.room, err: 'no room' }); continue; }
      G.enterRoom(id, null, true, true);
      const from = G.room.id;
      G.enterRoom(e.room, (Q) => Q.entries?.[from] || Q.spawn, true, true);
      const h = G.hero, clear = Math.min(99, ...R2.exits.map((q) => Math.hypot(h.pos.x - q.x, h.pos.z - q.z) - q.r));
      G.step(2.5);
      out.push({ from: id, to: e.room, clear: +clear.toFixed(2), stays: (G.room?.id) === e.room, ok: clear > IN_CLEAR && (G.room?.id) === e.room });
    }
  }
  return out;
}, { IN_CLEAR, only: ONLY });
for (const l of links) console.log(`LINK ${l.from} → ${l.to} ${l.ok ? 'ok' : 'BAD'} ${JSON.stringify(l)}`);
check(`every door between two rooms: he lands ${IN_CLEAR} m clear of the other room's exits and stays`, links.every((l) => l.ok), links.filter((l) => !l.ok));
const bad = (f) => rows.filter(f).map((r) => `${r.room}(${r.region},${r.chapter})`);
check(`every door: in, he lands on the room's floor ${IN_CLEAR} m clear of its exits and stays`, bad((r) => !(r.inFloor && r.inClear > IN_CLEAR && r.inStays)).length === 0, bad((r) => !(r.inFloor && r.inClear > IN_CLEAR && r.inStays)));
const outBad = bad((r) => !r.oneway && !(r.out && r.out.ground && r.out.clear > DOOR_CLEAR && r.out.away > 0.3 && r.out.stays));
check(`every door: out, he lands on the ground ${DOOR_CLEAR} m clear of every door trigger, facing away, and stays`, outBad.length === 0, outBad);
const walkBad = bad((r) => r.walk && !['0', '0.3', '-0.3'].every((k) => r.walk[k] === 'in' || r.walk[k] === 'detour' || r.walk[k] === 'blocked start'));
check('every walk-in door takes him in from straight on and 0.3 m to either side (or round what stands before it)', walkBad.length === 0, walkBad);
console.log('NOTE one-way doors: ' + JSON.stringify(bad((r) => r.oneway)));
console.log('NOTE doors reached only round something before them: ' + JSON.stringify(bad((r) => r.walk && Object.values(r.walk).includes('detour'))));
console.log(`SWEPT ${rows.length} doors`);

// ---- out of Zeelich's terminal by input, the game's own save on landing, Continue: he stays out
if (!ONLY || ONLY.includes('zterminal')) {
  const o = await ev(() => {
    const G = game, S = G.story, f = G.flags, ci = S.chapters.findIndex((c) => c.key === 'steam');
    Object.assign(f, { chapter: ci, chapterKey: 'steam' }); S.refreshCast?.();
    G.regions.ensure('zeelich', 'sweep'); G.enterRoom('zeelich', G.rooms.zeelich.spawn, true, true); P.settle();
    const r = P.enter('zterminal'); if (G.room?.id !== 'zterminal') return { err: 'not in: ' + r.r };
    const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z);
    return { room: G.room?.id, at: { x: G.hero.pos.x, z: G.hero.pos.z } };
  });
  const file = path.join(os.tmpdir(), 'door-sweep-' + process.pid + '.json');
  await context.storageState({ path: file });   // (the game's own save as he landed: no Quit, which saves again where he stands by then)
  await browser.close();
  ({ browser, context, page } = await launch({ storageState: file }));
  await open(page, '?nocine'); await before(); await menu(page, 'continue');
  const back = await ev(() => { const G = game, h = G.hero.pos, d = G.story.doors().find((q) => q.room === 'zterminal'); const at0 = { room: G.room?.id, clear: d ? +(Math.hypot(h.x - d.x, h.z - d.z) - d.r).toFixed(2) : null }; G.step(3); return { ...at0, after: G.room?.id }; });
  check('out of Zeelich\'s terminal, saved on landing → Continue: on the street clear of its door, and still there 3 s on', o.room === 'zeelich' && back.room === 'zeelich' && back.clear > DOOR_CLEAR && back.after === 'zeelich', { o, back });
  fs.rmSync(file, { force: true });
}
done();
await browser.close();
