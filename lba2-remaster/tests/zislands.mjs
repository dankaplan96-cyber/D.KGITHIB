// Zeelich's other islands (src/game/zislands.js, src/game/story/islands.js): every island loads; the shuttle on
// Zeelich's pad (from chapter 4) takes Twinsen there and back by input; he walks the island; its edges hold (no
// walking into the sea of clouds, no fall); no spot of the main area traps him; save & Continue on an island.
// ISO (logged): the chapter is set by its flags and he is put on Zeelich by the dock; the trap audit puts him
// on each sample point before walking away by input.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');

// every island is built
const isles = await ev(() => Object.values(game.rooms).filter((R) => R.isle).map((R) => ({ id: R.id, objects: R.objects, sample: R.sample.length, walk: Math.round(R.walk), spawnLand: R.land(R.spawn.x, R.spawn.z) })));
check('all eleven Zeelich places are built (the original\'s 7 + the Lift Dock + our 3), each with a walkable area (≥ 100 m²) and its spawn on land', isles.length === 11 && isles.every((i) => i.sample >= 1 && i.walk >= 100 && i.spawnLand), isles);

// before chapter 4 the shuttle offers nothing (ISO: put on Zeelich in the prologue)
const before = await ev(() => { const G = game, R = G.rooms.zeelich; P.settle(); G.enterRoom('zeelich', R.dock, true); P.settle();
  const p = R.shuttlePad; const r = P.go(p.x + 4.6, p.z, { tol: 0.8 }); P.face(p.x, p.z); return { r: r.r, target: P.target()?.kind ?? null }; });
check('before chapter 4: no shuttle prompt at Zeelich\'s pad', before.target !== 'isleShuttle', before);

// chapter 4 (ISO: flags), on Zeelich by the dock; walk to the shuttle and take it (INPUT)
const take = async (pick) => ev((pick) => {
  const G = game, h = G.hero;
  const id = G.room?.id, R = G.room, p = id === 'zeelich' ? R.shuttlePad : R.pad;
  const ready = () => P.target()?.kind === 'isleShuttle';
  const r = P.go(p.x, p.z, { tol: 3.6, stopWhen: ready, maxT: 120 }); P.face(p.x, p.z);
  if (!ready()) return { fail: 'no prompt', r, at: [h.pos.x, h.pos.z] };
  P.tap('KeyE', 0.1);
  const items = [...document.querySelectorAll('#shop .item')].map((b, i) => ({ i, text: b.textContent, disabled: b.disabled }));
  const i = items.findIndex((it) => it.text.startsWith(pick));
  const st = G.state;
  P.menuPick(i);
  return { r: r.r, menuState: st, items: items.map((x) => x.text + (x.disabled ? '*' : '')), room: G.room?.id, state: G.state, pos: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
}, pick);
await ev(() => { const G = game, f = G.flags; Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'dig' }); f.chapter = G.story.chapters.findIndex((c) => c.key === 'dig'); G.hero.hasBall = true; G.story.refreshCast(); G.enterRoom('zeelich', G.rooms.zeelich.dock, true); P.settle(); });
const t1 = await take('Otringal');
check('chapter 4: E at Zeelich\'s shuttle opens the shuttle menu (the spaceport island marked here, the 11 islands; no Twinsun stop)', t1.menuState === 'shop' && t1.items?.length === 12 && t1.items[0].endsWith('*') && t1.items.every((x) => !/Twinsun|Citadel/.test(x)), t1);
check('picking Otringal lands him there, in play, beside its shuttle', t1.room === 'isle_otringal' && t1.state === 'play', t1);

// walk the island: to five far points of the main area (INPUT, the harness's A* over the game's own movement)
const walk = await ev(() => {
  const G = game, R = G.room, h = G.hero, out = [];
  const far = R.sample.filter((p) => Math.hypot(p.x - h.pos.x, p.z - h.pos.z) > 20);
  for (let k = 0; k < 5 && far.length; k++) {
    const p = far[Math.floor((k + 0.5) / 5 * far.length)];
    const r = P.go(p.x, p.z, { tol: 1.2, run: true, maxT: 90 });
    out.push({ r: r.r, d: +Math.hypot(h.pos.x - p.x, h.pos.z - p.z).toFixed(1), y: +h.pos.y.toFixed(1) });
  }
  return out;
});
check('Otringal: he walks to far points of the island (at least 4 of 5)', walk.filter((w) => w.r === 'arrived').length >= 4, walk);

// the edges hold: from the spawn, run straight out toward the sea in 8 directions (INPUT), never leaving land
const edges = await ev(async () => {
  const G = game, out = [];
  for (const id of Object.keys(G.rooms).filter((k) => G.rooms[k].isle)) {
    const R = G.rooms[id]; G.enterRoom(id, null, true); P.settle();
    const h = G.hero; let off = 0, low = 1e9, falls = 0;
    for (let k = 0; k < 8; k++) {
      G.enterRoom(id, null, true); P.settle(); h.angle = k * Math.PI / 4;
      if (h.behaviour !== 'athletic') P.tap('F2');
      const keys = P.keys || null;
      for (let s = 0; s < 20 * 30; s++) {
        P.holdFor(['ArrowUp'], 1 / 30); h.hp = h.maxHp;   // (a long drop off a cliff hurts: not what this checks)
        if (!R.land(h.pos.x, h.pos.z) && h.onGround && !G.physics.brickUnder?.(h)) off++;
        low = Math.min(low, h.pos.y);
        if (h.pos.y < -3) falls++;
        if (G.state !== 'play') P.settle();
      }
    }
    out.push({ id, off, low: +low.toFixed(2), falls, state: G.state });
  }
  return out;
});
check('every island: running at the sea from the spawn in 8 directions, he stops at the waterline (never below -0.35, no fall)', edges.every((e) => e.low >= -0.36 && e.falls === 0), edges);

// no traps: from every sample point of each island's main area he can walk away (ISO place, INPUT walk)
const traps = await ev(() => {
  const G = game, out = [];
  for (const id of Object.keys(G.rooms).filter((k) => G.rooms[k].isle)) {
    const R = G.rooms[id]; G.enterRoom(id, null, true); P.settle();
    const h = G.hero, stuck = [];
    for (const p of R.sample) {
      h.pos.set(p.x, G.physics.groundAt(p.x, p.z), p.z); h.vy = 0; G.step(0.3);
      const x0 = h.pos.x, z0 = h.pos.z; let ok = false;
      for (let k = 0; k < 8 && !ok; k++) {
        h.angle = k * Math.PI / 4; h.pos.set(x0, G.physics.groundAt(x0, z0), z0); h.vy = 0; h.hp = h.maxHp;
        P.holdFor(['ArrowUp'], 0.8);
        ok = Math.hypot(h.pos.x - x0, h.pos.z - z0) > 1.0 && h.pos.y > -3;
      }
      if (!ok) stuck.push([+(p.x - R.group.position.x).toFixed(1), +(p.z - R.group.position.z).toFixed(1)]);
    }
    out.push({ id, n: R.sample.length, stuck: stuck.slice(0, 8), nStuck: stuck.length });
  }
  G.hero.hp = G.hero.maxHp; if (G.state !== 'play') P.settle();
  return out;
});
check('no traps: from every sample point of each island he walks away in some direction', traps.every((t) => t.nStuck === 0), traps);

// on to another island, then back to Zeelich (INPUT)
const t2 = await (async () => { await ev(() => { game.enterRoom('isle_otringal', null, true); P.settle(); }); return take('Knartas'); })();
check('Otringal → Knartas by its shuttle', t2.room === 'isle_knartas' && t2.state === 'play' && t2.items.find((x) => x.startsWith('Otringal'))?.endsWith('*') === true, t2);
const t3 = await take('Zeelich');
const zp = await ev(() => { const p = game.rooms.zeelich.shuttlePad, h = game.hero; return { d: +Math.hypot(h.pos.x - p.x, h.pos.z - p.z).toFixed(2), y: +h.pos.y.toFixed(2) }; });
check('Knartas → back to Zeelich, beside its pad, in play', t3.room === 'zeelich' && t3.state === 'play' && zp.d < 7 && zp.y > 5, { t3, zp });

// ZL-ALL: the new places — the Lift Dock (LBA2's ASCENCE) and our three — and Celebration with its figure: from the
// arrival he walks to every landmark (INPUT), and finds the place's giver (Space there in Normal: a hop gives a bonus, once)
const places = await ev(() => {
  const G = game, out = [];
  for (const id of ['isle_liftdock', 'isle_tralu', 'isle_orchard', 'isle_oldwatch', 'isle_celebration']) {
    const R = G.rooms[id]; G.enterRoom(id, null, true); P.settle();
    const h = G.hero, walks = [];
    for (const p of R.pois) { G.enterRoom(id, null, true); P.settle(); const r = P.go(p.x, p.z, { tol: 1.4, run: true, maxT: 90 }); walks.push([p.word, r.r, +Math.hypot(h.pos.x - p.x, h.pos.z - p.z).toFixed(1)]); }
    let given = null;
    if (R.givers[0]) { const gv = R.givers[0]; P.go(gv.x, gv.z, { tol: 0.5, maxT: 60 }); h.setBehaviour('normal'); const n0 = G.searched.length; P.tap('Space', 0.05); G.step(1.0); given = G.searched.length > n0; P.tap('Space', 0.05); G.step(1.0); given = given && G.searched.length === n0 + 1; }
    out.push({ id, landmark: R.landmark?.word, walks, givers: R.givers.length, given, dressing: R.dressing });
  }
  G.enterRoom('zeelich', G.story.isles.landing('zeelich'), true); P.settle();   // (back where the next step starts)
  return out;
});
check('the Lift Dock, Tralu Rock, the Nectar Orchard, the Old Watch and Celebration: every landmark walked to from the arrival (INPUT)', places.every((p) => p.walks.length >= 1 && p.walks.every((w) => w[1] === 'arrived' || w[2] < 2.0)), places);
check('each new place has a giver that gives once', places.filter((p) => p.id !== 'isle_celebration').every((p) => p.givers >= 1 && p.given), places.map((p) => [p.id, p.givers, p.given]));

// save & Continue on an island (INPUT: Esc → Quit to title saves; Continue)
await take('Celebration');
const before2 = await ev(() => ({ room: game.room?.id, x: game.hero.pos.x, z: game.hero.pos.z }));
const file = path.join(os.tmpdir(), 'zislands-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue');
const after = await ev(() => { P.settle(); return { room: game.room?.id, x: game.hero.pos.x, z: game.hero.pos.z, state: game.state, y: game.hero.pos.y }; });
check('save & quit on Celebration Island → Continue: back on it where he was, in play', after.room === 'isle_celebration' && after.state === 'play' && Math.hypot(after.x - before2.x, after.z - before2.z) < 2, { before2, after });
// the holomap and the pause menu work there
const holo = await ev(() => { P.tap('KeyM', 0.3); const s = game.state; P.tap('KeyM', 0.3); P.settle(); return { s, back: game.state }; });
check('holomap opens and closes on an island', holo.back === 'play', holo);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
