// CONTAINERS (the user's decision, 2026-10-25; BUILD109_REVIEW §10): as in LBA2, searching a bin, a barrel, a crate
// or a suitcase makes one bonus pop out, and Twinsen takes it by walking over it. A heart or a flask is not taken
// while life or magic is full: it stays on the ground. A container's bonus never times out, and it is kept in the
// save until taken.
//   1. containers stand outdoors: Citadel's streets and harbour (the original's spots), Zeelich and its islands
//   2. a hop by one pops one bonus that lands and stays (well past LBA2's 20 s), the verb prompt before, not after
//   3. he takes it by walking over it (input)
//   4. full life: a heart stays (and is still there later); hurt: he takes it. The same for a flask and magic
//   5. repeated input at a container: one bonus, one record; the interact key searches in any behaviour
//   6. a bonus left lying: save → quit → Continue (a real page reload): the same bonus, same place, still once
//   7. region change and return: hidden away, there again on return; a room's bonus is not seen outdoors
//   8. interrupted: a door in the middle of the flight, a save in mid-air, a line of dialogue: it lands and stays
//   9. death and Retry: the bonus left before the last save is back
//  10. quest rewards (owed pickups) are untouched; the glint shows on unsearched containers only
// GAME_URL as the other tests.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
let { browser, context, page, errs } = await launch();
await open(page, '?nocine');
await menu(page, 'new');
const ev = (f, a) => page.evaluate(f, a);

// helpers in the page (setup only: positions; taking a bonus is always by walking)
const helpers = () => ev(() => {
  const G = game;
  window.C = {
    loot: () => G.pickups.list.filter((p) => p.loot).map((p) => ({ k: p.loot, type: p.type, w: p.where, fly: !!p.fly, vis: p.mesh.visible, life: p.life, x: +p.pos.x.toFixed(2), y: +p.baseY.toFixed(2), z: +p.pos.z.toFixed(2) })),
    out: (x = -42, z = -4) => { if (G.room) G.exitRoom({ x, z }, true); P.settle(); },
    // stand beside giver `id` of the current area, facing it, on open ground in reach
    standBy: (id) => {
      const gv = G.givers().find((g) => g.id === id), h = G.hero;
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8, d = gv.r - 0.35, x = gv.x + Math.sin(a) * d, z = gv.z + Math.cos(a) * d;
        const y = G.physics.groundAt(x, z, (gv.y ?? h.pos.y) + 0.6), g0 = gv.y ?? G.physics.groundAt(gv.x, gv.z, y + 0.6);
        if (G.physics.blockedAt(x, z, y, 0.35) || Math.abs(y - g0) > 0.3) continue;
        h.pos.set(x, y, z); h.angle = a + Math.PI; h.vel.set(0, 0); h.vy = 0; h.onGround = true; G.lastSafe = { x, z }; G.step(0.1);
        if (G.findInteractable() && k < 15) continue;   // (somewhere nothing else answers the key: a sign, a person, a board)
        return { x, z, gv: { x: gv.x, z: gv.z, r: gv.r } };
      }
      return null;
    },
    hop: () => { P.tap('Space', 0.05); },
    // a hop with life, magic and kashes all full enough: WhichBonus picks at random, made to pick a heart (it stays)
    hopHeart: () => { const h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax; h.coins = 99; const rnd = Math.random; Math.random = () => 0.4; const n = G.searched.length; for (let i = 0; i < 3 && G.searched.length === n; i++) { if (i) G.step(0.3); P.tap('Space', 0.05); } Math.random = rnd; },   // (pressed again if the first press went unseen)
    // walk onto a bonus (input: the harness's A* walk)
    walkTo: (k) => { const p = G.pickups.list.find((q) => q.loot === k); if (!p) return 'gone'; const r = P.go(p.pos.x, p.pos.z, { tol: 0.3, maxT: 20 }); G.step(0.3); return r; },
    away: (d = 4) => { const h = G.hero; P.go(h.pos.x + d, h.pos.z, { tol: 0.6, maxT: 10 }); },
    prompt: () => (G.hud._prompt || '').replace(/<[^>]+>/g, '').trim(),
  };
});
await helpers();
await ev(() => { game.hero.clovers = 0; C.out(); });

// ---------------------------------------------------------------- 1. where they stand
const where = await ev(() => {
  const G = game, rc = G.regionContainers || {};
  return { citadel: G.world.containers, kinds: [...new Set(G.world.givers.map((g) => g.kind).filter(Boolean))], regions: Object.fromEntries(Object.entries(rc).map(([k, v]) => [k, v.placed.length])), skipped: Object.values(rc).flatMap((v) => v.skipped) };
});
check('Citadel: the original\'s outdoor spots hold a container (bins, barrels, crates, a suitcase trolley), none skipped', where.citadel.placed.length >= 8 && !where.citadel.skipped.length && ['bin', 'barrel', 'crate', 'cases'].every((k) => where.kinds.includes(k)), where);
check('Citadel: each stands within 3 m of its spot', where.citadel.placed.every((p) => p.moved <= 3), where.citadel.placed);
check('Zeelich and its islands have containers', where.regions.zeelich >= 2 && Object.keys(where.regions).filter((k) => k.startsWith('isle_')).length >= 3 && !where.skipped.length, where);

// ---------------------------------------------------------------- 2./3. pop, land, stay, take by walking
const pop = await ev(() => {
  const G = game, h = G.hero; h.coins = 0; h.hp = h.maxHp; h.mp = h.mpMax;
  const s = C.standBy('c-path-bin'); G.step(0.6); const before = C.prompt();
  const n0 = G.pickups.list.length; C.hop(); const b0 = C.loot(); const after = (G.step(0.3), C.prompt());
  // (he steps well away at once, or the coin's pull would bring it to him)
  h.pos.set(h.pos.x + 7, G.physics.groundAt(h.pos.x + 7, h.pos.z), h.pos.z); G.step(2); const landed = C.loot();
  // well past LBA2's 20 s
  for (let i = 0; i < 40; i++) G.step(1);
  return { s, before, after, n: G.pickups.list.length - n0, b0, landed, later: C.loot() };
});
check('the verb prompt ("Search") by an unsearched container, gone once searched', /Search$/.test(pop.before) && !/Search/.test(pop.after), [pop.before, pop.after]);
check('a hop by the bin pops one bonus (kashes for a broke Twinsen), in flight', pop.n === 1 && pop.b0.length === 1 && pop.b0[0].fly && pop.b0[0].type === 'coin' && pop.b0[0].k === 'giver:out:c-path-bin', pop.b0);
check('it lands, and is still there 40 s later (no timeout, no blinking)', !pop.landed[0]?.fly && pop.later.length === 1 && pop.later[0].vis && pop.later[0].life === Infinity, pop.later);
const take = await ev(() => { const G = game, c0 = G.hero.coins; const r = C.walkTo('giver:out:c-path-bin'); return { r, gained: G.hero.coins - c0, left: C.loot().length }; });
check('he takes it by walking over it (+2 kashes: the original\'s n)', take.gained === 2 && take.left === 0, take);

// ---------------------------------------------------------------- 4. full life / full magic
const full = await ev(() => {
  const G = game, h = G.hero; h.hp = h.maxHp;
  C.standBy('c-west-barrel'); C.hop(); G.step(2); const b = C.loot()[0];
  const r = C.walkTo(b.k); for (let i = 0; i < 30; i++) G.step(0.1);   // (he stands on it for 3 s)
  const stays = C.loot().find((p) => p.k === b.k), hp1 = h.hp;
  C.away(5); for (let i = 0; i < 25; i++) G.step(1);
  const later = C.loot().find((p) => p.k === b.k);
  h.hp = h.maxHp - 3; const r2 = C.walkTo(b.k);
  return { type: b.type, r, stays: !!stays, onGround: stays && !stays.fly, hp1, max: h.maxHp, later: !!later, hp2: h.hp, gone: !C.loot().some((p) => p.k === b.k) };
});
check('full life: the barrel\'s heart is not taken, it stays on the ground', full.type === 'heart' && full.stays && full.hp1 === full.max, full);
check('...and is still there 25 s later', full.later, full);
check('hurt: walking over it heals him and it is gone', full.gone && full.hp2 === full.max, full);
const flask = await ev(() => {
  const G = game, h = G.hero; h.hp = h.maxHp; h.coins = 99; h.mp = 0; h.magicLevel = Math.max(1, h.magicLevel);
  G.exitRoom({ x: -60, z: 30 }, true); P.settle();
  C.standBy('c-lane-barrel'); C.hop(); G.step(2); const b = C.loot().find((p) => p.k.endsWith('c-lane-barrel'));
  h.mp = h.mpMax; C.walkTo(b.k); for (let i = 0; i < 20; i++) G.step(0.1);
  const stays = C.loot().some((p) => p.k === b.k);
  h.mp = 1; C.walkTo(b.k);
  return { type: b.type, stays, mp: +h.mp.toFixed(1), max: h.mpMax, gone: !C.loot().some((p) => p.k === b.k) };
});
check('full magic: a flask stays; with magic spent he takes it', flask.type === 'flask' && flask.stays && flask.gone && flask.mp === flask.max, flask);
const coinFull = await ev(() => { const G = game, h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax; h.coins = 0; C.standBy('c-path-crate'); C.hop(); const b = C.loot().find((p) => p.k.endsWith('c-path-crate')); G.step(3); return { type: b?.type, gained: h.coins, left: C.loot().some((p) => p.k === b?.k) }; });
check('kashes are taken whatever his life and magic', coinFull.type === 'coin' && coinFull.gained > 0 && !coinFull.left, coinFull);

// ---------------------------------------------------------------- 5. repeated input; the interact key in any behaviour
const mash = await ev(() => {
  // (life, magic and kashes all full enough: WhichBonus picks at random — made to pick a heart, which then stays)
  const G = game, h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax; h.coins = 99;
  const rnd = Math.random; Math.random = () => 0.4;
  let spawned = 0; const sp = G.pickups.spawn; G.pickups.spawn = function (...a) { spawned++; return sp.apply(this, a); };
  C.standBy('c-lane-bin');
  for (let i = 0; i < 12; i++) { P.tap(i % 2 ? 'Space' : 'KeyE', 0.02); }
  G.step(1); G.pickups.spawn = sp; Math.random = rnd;
  return { spawned, recorded: G.searched.filter((k) => k === 'giver:out:c-lane-bin').length, lying: C.loot().map((p) => p.type) };
});
check('mashing Space/E at a container: one bonus, recorded once', mash.spawned === 1 && mash.recorded === 1, mash);
const beh = await ev(() => {
  const G = game, h = G.hero; h.setBehaviour('athletic'); C.standBy('c-west-bin'); G.step(0.5); const pr = C.prompt();
  const rnd = Math.random; Math.random = () => 0.4; P.tap('KeyE', 0.05); Math.random = rnd;
  const got = G.searched.includes('giver:out:c-west-bin'); h.setBehaviour('normal'); G.step(2);
  return { pr, got };
});
check('the interact key searches it in another behaviour (Athletic), with the prompt shown', beh.got && /Search$/.test(beh.pr), beh);

// ---------------------------------------------------------------- 6. save → quit → Continue with a bonus lying
const left = await ev(() => C.loot());
check('(two hearts are left lying for the reload)', left.length === 2 && left.every((p) => p.type === 'heart'), left);
const keepFile = path.join(os.tmpdir(), 'containers-save-' + process.pid + '.json');
await quitAndKeep(page, context, keepFile);
await browser.close();
({ browser, context, page, errs: errs } = await launch({ storageState: keepFile }));
await open(page, '?nocine');
await menu(page, 'continue');
await helpers();
const reload = await ev(() => ({ loot: C.loot(), searched: game.searched.filter((k) => k.startsWith('giver:out:c-')), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /save/.test(k) && !/backup|unreadable|settings/.test(k)))).loot }));
const same = left.length > 0 && left.every((a) => reload.loot.some((b) => b.k === a.k && b.type === a.type && Math.hypot(a.x - b.x, a.z - b.z) < 0.05));
check('after a reload the bonuses left lying are back, same kind, same place', same && reload.loot.length === left.length, { left, now: reload.loot });
check('the save holds them (loot) and the containers stay searched', reload.saved.length === left.length && reload.searched.length >= 6, reload);
const again = await ev(() => { const G = game, n0 = G.pickups.list.length; C.standBy('c-lane-bin'); C.hop(); G.step(1); return { n: G.pickups.list.length - n0 }; });
check('a searched container gives nothing more after the reload', again.n === 0, again);
const takeAfter = await ev(() => { const G = game, h = G.hero, b = C.loot().find((p) => p.k.endsWith('c-lane-bin')); h.hp = 3; const hp0 = h.hp; C.walkTo(b.k); G.save(false); const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /save/.test(k) && !/backup|unreadable|settings/.test(k)))); return { type: b.type, hp0, hp: h.hp, inSave: s.loot.some((l) => l.k === b.k) }; });
check('taking it after the reload works, and the save forgets it', takeAfter.hp > takeAfter.hp0 && !takeAfter.inSave, takeAfter);

// ---------------------------------------------------------------- 7. region change and return; a room's bonus stays in the room
const region = await ev(() => {
  const G = game, h = G.hero;
  C.standBy('c-head-crate'); C.hopHeart(); G.step(2);
  const b = C.loot().find((p) => p.k.endsWith('c-head-crate'));
  G.enterRoom('zeelich', null, true); P.settle(); G.step(0.5);
  const away = C.loot().find((p) => p.k === b.k);
  // search one of Zeelich's, leave its bonus there
  const zg = G.givers()[G.givers().length - 1]; C.standBy(zg.id); C.hopHeart(); G.step(2);
  const zb = C.loot().find((p) => p.w === 'zeelich');
  G.exitRoom({ x: -108, z: 95 }, true); P.settle(); G.step(0.3);
  const back = C.loot().find((p) => p.k === b.k), zOut = C.loot().find((p) => p.k === zb?.k);
  h.hp = 2; const hp0 = h.hp; C.walkTo(b.k);
  return { b, away: away && { vis: away.vis }, zb: !!zb, zOutVis: zOut?.vis, back: back && { vis: back.vis, x: back.x, z: back.z }, healed: h.hp > hp0, gone: !C.loot().some((p) => p.k === b.k) };
});
check('away in Zeelich the Citadel bonus is kept, unseen', region.away && region.away.vis === false, region);
check('back on Citadel it is there, where it landed, and he takes it', region.back?.vis && Math.hypot(region.back.x - region.b.x, region.back.z - region.b.z) < 0.05 && region.healed && region.gone, region);
check('Zeelich\'s bonus waits in Zeelich (not seen on Citadel)', region.zb && region.zOutVis === false, region);

// ---------------------------------------------------------------- 8. interrupted
const inter = await ev(() => {
  const G = game, h = G.hero;
  // (a) a door straight after the hop: the bonus is still in the air when the scene changes
  C.standBy('c-path-barrel'); C.hopHeart(); const k = C.loot().find((p) => p.k.endsWith('c-path-barrel'))?.k;
  const fly0 = C.loot().find((p) => p.k === k)?.fly;
  G.enterRoom('zeelich', null, true); G.step(1); G.exitRoom({ x: -66, z: 30 }, true); P.settle(); G.step(2);
  const a = C.loot().find((p) => p.k === k);
  // (b) a line of dialogue right after the hop: the bonus lands meanwhile
  C.standBy('c-quay-cases'); C.hop(); G.say('', ['…']); for (let i = 0; i < 20; i++) G.step(0.1);
  const kq = C.loot().find((p) => p.k.endsWith('c-quay-cases'));
  P.settle();
  // (c) a save in mid-air
  return { fly0, a: a && { fly: a.fly, vis: a.vis }, q: kq && { fly: kq.fly } };
});
check('a door in mid-flight: the bonus lands and waits', inter.fly0 && inter.a && !inter.a.fly && inter.a.vis, inter);
check('a line of dialogue in mid-flight: it lands meanwhile', inter.q && !inter.q.fly, inter);
const midair = await ev(() => {
  const G = game, h = G.hero;
  const zg = G.rooms.isle_otringal.givers.find((g) => g.id === 'otringal-c1');
  G.enterRoom('isle_otringal', null, true); P.settle();
  C.standBy('otringal-c1'); C.hopHeart(); G.step(0.15);
  const b = C.loot().find((p) => p.k.endsWith('otringal-c1'));
  if (!b) return { none: true, state: G.state, room: G.room?.id, it: G.findInteractable()?.kind, searched: G.searched.filter((k) => k.includes('otringal')), act: G.hero.actT, beh: G.hero.behaviour, ground: G.hero.onGround, busy: G.hero.combat.busy, trans: !!G.trans, reach: !!G.giverInReach(), d: Math.hypot(G.hero.pos.x - zg.x, G.hero.pos.z - zg.z), dy: G.hero.pos.y - zg.y, jet: !!G.gadgets.jet?.air };
  G.save(false);
  const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /save/.test(k) && !/backup|unreadable|settings/.test(k))));
  // Continue from the save in this page: the bonuses of before go, the save's come back (and fall to the ground)
  G.startContinue(); P.settle(); G.step(2);
  const after = C.loot().filter((p) => p.k === b.k);
  return { inAir: b.fly, savedFly: s.loot.find((l) => l.k === b.k)?.f, after, ground: after[0] && +G.physics.groundAt(after[0].x, after[0].z, after[0].y).toFixed(2) };
});
check('a save in mid-air keeps it; loaded, it falls to the ground (one copy)', midair.inAir && midair.savedFly === 1 && midair.after.length === 1 && !midair.after[0].fly && Math.abs(midair.after[0].y - 0.3 - midair.ground) < 0.2, midair);

// ---------------------------------------------------------------- 9. death and Retry
const before = await ev(() => { const G = game; G.save(false); return C.loot().map((p) => p.k).sort(); });
await ev(() => { const h = game.hero; h.clovers = 0; h.damage(999, null); for (let i = 0; i < 80 && game.state !== 'gameover'; i++) game.step(0.1); });
const go = await ev(() => game.state);
const reloaded = page.waitForEvent('load', { timeout: 300000 });
await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
await reloaded;
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state === 'play', null, { timeout: 300000 }).catch(() => {});
await page.evaluate(() => { game.testFreeze = true; });
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
await helpers();
const retry = await ev(() => ({ state: game.state, loot: C.loot().map((p) => p.k).sort() }));
check('death → Retry: the bonuses left before the last save are back, once each', go === 'gameover' && JSON.stringify(retry.loot) === JSON.stringify(before) && before.length > 0, { go, before, retry });

// ---------------------------------------------------------------- 10. quest rewards; the glint
const quest = await ev(() => {
  const G = game, h = G.hero, cur = G.story.cur; C.out(-40, 8);
  const c0 = h.coins; cur.reward('t_owe', 'coin', 2, h.pos.x + 2, h.pos.y + 0.5, h.pos.z);
  const inLoot = G.lootSnapshot().length, owed = G.flags.t_owe;
  G.step(1); P.go(h.pos.x + 2, h.pos.z, { tol: 0.3 }); G.step(0.5);
  return { owed, inLoot: inLoot === G.lootSnapshot().length, gained: h.coins - c0, left: G.flags.t_owe || 0 };
});
check('a quest reward (owed pickups) is not container loot and still settles its debt', quest.owed === 2 && quest.inLoot && quest.gained === 2 && quest.left === 0, quest);
const glint = await ev(() => {
  const G = game, seen = (id) => { C.standBy(id); const h = G.hero; h.pos.x += 3; G.step(0.6); let v = 0; for (let i = 0; i < 120; i++) { G.step(1 / 30); if (G.cues.sprites.some((s) => s.visible && Math.hypot(s.position.x - G.givers().find((g) => g.id === id).x, s.position.z - G.givers().find((g) => g.id === id).z) < 0.5)) v++; } return v; };
  G.exitRoom({ x: -42, z: -4 }, true); P.settle();
  const fresh = G.givers().find((g) => !G.giverTaken(g));   // (the house's barrels, the shop's: this test searched all the new ones)
  return { fresh: fresh?.id, unsearched: fresh ? seen(fresh.id) : -1, searched: seen('c-path-bin') };
});
check('a glint twinkles over an unsearched container, none over a searched one', glint.unsearched > 0 && glint.searched === 0, glint);

fs.rmSync(keepFile, { force: true });
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
