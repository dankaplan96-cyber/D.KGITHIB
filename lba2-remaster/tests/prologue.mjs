import { launch, checker } from './lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 1280, height: 720, locale: process.argv[2] || 'he-IL' });
const { check, done } = checker({ info: 'always' });
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'P0-title.png', timeout: 180000 });
await page.click('[data-act="new"]');
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
// a story step's end state, judged (R7-VERDICTS): PASS/FAIL with the values it read
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
const shot = async (n) => { await ev(() => { game.renderer.render(); game.behMenu.render(game.renderer.renderer, 1 / 60); }); await page.screenshot({ path: n, timeout: 180000 }); };
await ev(() => {
  const G = window.game; G.testFreeze = true;
  window.T = {
    tap(c) { G.input.taps.add(c); G.step(1 / 60); },
    hold(c, s) { G.input.keys.add(c); G.step(s); G.input.keys.delete(c); },
    tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; G.camRig.lba.init = false; G.step(0.1); },
    face(o) { const h = G.hero; h.angle = Math.atan2(o.x - h.pos.x, o.z - h.pos.z); },
    talkAll(max = 40) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.8); },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    near(id, d = 1.6) { const n = T.npc(id); const h = G.hero; const a = n.angle; h.pos.set(n.pos.x + Math.sin(a) * d, n.pos.y, n.pos.z + Math.cos(a) * d); h.onGround = true; T.face(n.pos); G.step(0.05); },
    talk(id) { T.near(id); T.tap('KeyE'); G.step(0.05); T.talkAll(); },
    p() { return G.hero.pos.toArray().map((v) => +v.toFixed(1)); },
  };
});
await shot('P1-intro.png');
await ev(() => T.talkAll(60));
is('the intro ends: in play in the house, no ball yet', await ev(() => [game.state, game.room?.id, game.flags.intro, game.hero.hasBall]), (v) => v[0] === 'play' && v[1] === 'house' && v[2] === true && v[3] === false);
await shot('P2-house.png');
// try to leave without the ball
await ev(() => { const e = game.room.exits[0]; game.step(1.2); T.tp(e.x, e.z, Math.PI); game.step(0.3); });
is('leaving without the ball: refused with a line, still in the house', await ev(() => [game.state, game.room?.id]), (v) => v[0] === 'dialog' && v[1] === 'house');
await ev(() => T.talkAll());
// cupboard
await ev(() => { const s = game.room.searches[0]; T.tp(s.x + 0.3, s.z, -Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); });
is('the cupboard gives the ball', await ev(() => [game.hero.hasBall, game.state]), (v) => v[0] === true && v[1] === 'play');
// leave the house
await ev(() => { const e = game.room.exits[0]; T.tp(e.x, e.z + 1.6, Math.PI); game.step(1.6); T.tp(e.x, e.z, Math.PI); game.step(1.2); });
is('out of the house, in play', await ev(() => [game.state, game.room?.id ?? 'outdoor', T.p()]), (v) => v[0] === 'play' && v[1] === 'outdoor');
await shot('P3-outside.png');
// the well
await ev(() => { const w = game.world.well; T.tp(w.x - 2.2, w.z, Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); });
is('the well looked at', await ev(() => [game.flags.wellSeen, game.flags.key]), (v) => v[0] === true);
await ev(() => { T.near('gilbert', 1.8); game.step(0.2); });
await shot('P4-argument.png');
await ev(() => T.talk('gilbert'));
is('Gilbert gives the lid key', await ev(() => [game.flags.key, game.hero.hasKey]), (v) => v[0] === true && v[1] === true);
await ev(() => T.talk('xil'));
is('Xil met at the pier', await ev(() => [game.flags.metXil, game.flags.rope]), (v) => v[0] === true);
await shot('P5-pier.png');
await ev(() => T.talk('doran'));
is("Doran's stamp", await ev(() => game.flags.stamp), (v) => v === true);
await ev(() => T.talk('xil'));
is("Xil's rope", await ev(() => game.flags.rope), (v) => v === true);
// kids
await ev(() => T.talk('tim'));
is('the kids asked', await ev(() => [game.flags.kidsAsked, game.flags.overheard]), (v) => v[0] === true);
await ev(() => { const t = T.npc('tim'); T.tp(t.pos.x - 6, t.pos.z, Math.PI / 2); T.tap('Digit4'); game.input.keys.add('ArrowUp'); for (let i = 0; i < 300 && game.state === 'play'; i++) game.step(1 / 60); game.input.keys.delete('ArrowUp'); });
is('the kids overheard (discreet)', await ev(() => [game.state, game.flags.overheard]), (v) => v[1] === true);
await shot('P6-overhear.png');
await ev(() => { T.talkAll(); T.tap('Digit1'); T.talk('tim'); game.step(1.5); const c = game.pickups.list.find((p) => p.type === 'clover' && !p.id); if (c) { game.hero.pos.set(c.pos.x, game.hero.pos.y, c.pos.z); game.step(0.3); } });
is('Tim confesses, his clover picked up', await ev(() => [game.flags.timConfessed, game.hero.clovers]), (v) => v[0] === true && v[1] > 0);
is('an objective is set (the well)', await ev(() => document.querySelector('#pause-objective').textContent), (v) => v.length > 0);
// down the well
await ev(() => { const w = game.world.well; T.tp(w.x - 2.2, w.z, Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); game.step(1); T.talkAll(); });
is('down the well', await ev(() => [game.state, game.room?.id, game.flags.inWell]), (v) => v[0] === 'play' && v[1] === 'well' && v[2] === true);
await shot('P7-cave.png');
// fight a mite with the ball
// (16 tries a mite, magic kept up like his life: a wandering mite dodged all 8 once in four runs, and misses
// spent his magic, 25–26.10)
// (the well's own mites only: G.enemies holds every chapter's enemies, and teleporting to those elsewhere left the well)
const mites = await ev(() => { const G = game, h = G.hero; h.hp = 10; let kills = 0; const well = G.enemies.filter((m) => /^mite\d+$/.test(m.def.id)); for (const m of well) { for (let i = 0; i < 16 && m.alive; i++) { h.pos.set(m.pos.x - 4, 0, m.pos.z); h.angle = h.angleTo(m) + (i % 3 - 1) * 0.3; G.ball.state = 'idle'; T.tap('KeyF'); G.step(0.9); h.hp = 10; h.mp = Math.max(h.mp, 4); } if (!m.alive) kills++; } return [kills, well.length, G.room?.id]; });
is("the well's mites beaten with the ball", mites, (v) => v[1] > 0 && v[0] === v[1] && v[2] === 'well');
// wake the nodes
const nodes = await ev(() => { const G = game, h = G.hero; const out = []; for (const n of G.room.nodes) { for (let i = 0; i < 12 && !n.lit; i++) { const a = i * 0.52, r = 3 + (i % 3); h.pos.set(n.x - Math.cos(a) * r, 0, n.z - Math.sin(a) * r); h.onGround = true; h.angle = Math.atan2(n.x - h.pos.x, n.z - h.pos.z); G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); } out.push(n.lit); } G.step(1.5); return [out, G.flags.nodes, G.rooms.well.barrier.c.enabled]; });
is('the nodes woken by the ball, the barrier down', nodes, (v) => v[0].length > 0 && v[0].every(Boolean) && v[2] === false);
await shot('P8-nodes.png');
// walk to the vein
await ev(() => { const z = game.room.zones[0]; T.tp(z.x - 3, z.z, Math.PI / 2); game.step(0.3); T.tp(z.x, z.z, Math.PI / 2); game.step(0.3); });
log('cutscene', await ev(() => game.state));
await ev(() => game.step(2.3));
await shot('P9-pull.png');
await ev(() => { game.step(1); T.tap('KeyE'); game.step(1.2); });
await shot('P10-sendell.png');
await ev(() => T.talkAll());
is("Sendell's words end the prologue", await ev(() => [game.state, game.flags.prologueDone]), (v) => v[1] === true);
await shot('P11-end.png');
// the prologue flows straight into chapter 1 (fade, title card, morning dialogue)
await ev(() => { game.step(1.2); T.talkAll(); game.step(0.5); });
is('chapter 1 reached and started', await ev(() => [game.flags.chapter, game.flags.c1_started]), (v) => v[0] === 1 && v[1] === true);
is("chapter 1's morning: in play, an objective set", await ev(() => [game.state, game.room?.id ?? 'outdoor', T.p(), document.querySelector('#pause-objective').textContent]), (v) => v[0] === 'play' && v[3].length > 0);
const save = await ev(() => JSON.parse(localStorage.getItem('lba3_save_v1')));
is('saved in chapter 1 with the ball', { room: save.room, flags: Object.keys(save.flags).length, ball: save.hero.hasBall, chapter: save.flags.chapter }, (v) => v.ball === true && v.chapter === 1);
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
