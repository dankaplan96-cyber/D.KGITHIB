import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, locale: process.argv[2] || 'he-IL' });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + e.stack));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'P0-title.png', timeout: 180000 });
await page.click('[data-act="new"]');
const ev = (f, a) => page.evaluate(f, a);
const log = (...a) => console.log(...a);
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
log('after intro', await ev(() => [game.state, game.room?.id, game.flags.intro, game.hero.hasBall]));
await shot('P2-house.png');
// try to leave without the ball
await ev(() => { const e = game.room.exits[0]; game.step(1.2); T.tp(e.x, e.z, Math.PI); game.step(0.3); });
log('leave w/o ball', await ev(() => [game.state, game.room?.id]));
await ev(() => T.talkAll());
// cupboard
await ev(() => { const s = game.room.searches[0]; T.tp(s.x + 0.3, s.z, -Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); });
log('ball', await ev(() => [game.hero.hasBall, game.state]));
// leave the house
await ev(() => { const e = game.room.exits[0]; T.tp(e.x, e.z + 1.6, Math.PI); game.step(1.6); T.tp(e.x, e.z, Math.PI); game.step(1.2); });
log('outside', await ev(() => [game.state, game.room?.id ?? 'outdoor', T.p()]));
await shot('P3-outside.png');
// the well
await ev(() => { const w = game.world.well; T.tp(w.x - 2.2, w.z, Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); });
log('well seen', await ev(() => [game.flags.wellSeen, game.flags.key]));
await ev(() => { T.near('gilbert', 1.8); game.step(0.2); });
await shot('P4-argument.png');
await ev(() => T.talk('gilbert'));
log('key', await ev(() => [game.flags.key, game.hero.hasKey]));
await ev(() => T.talk('xil'));
log('met xil', await ev(() => [game.flags.metXil, game.flags.rope]));
await shot('P5-pier.png');
await ev(() => T.talk('doran'));
log('stamp', await ev(() => game.flags.stamp));
await ev(() => T.talk('xil'));
log('rope', await ev(() => game.flags.rope));
// kids
await ev(() => T.talk('tim'));
log('kids asked', await ev(() => [game.flags.kidsAsked, game.flags.overheard]));
await ev(() => { const t = T.npc('tim'); T.tp(t.pos.x - 6, t.pos.z, Math.PI / 2); T.tap('Digit4'); game.input.keys.add('ArrowUp'); for (let i = 0; i < 300 && game.state === 'play'; i++) game.step(1 / 60); game.input.keys.delete('ArrowUp'); });
log('overheard', await ev(() => [game.state, game.flags.overheard]));
await shot('P6-overhear.png');
await ev(() => { T.talkAll(); T.tap('Digit1'); T.talk('tim'); game.step(1.5); const c = game.pickups.list.find((p) => p.type === 'clover' && !p.id); if (c) { game.hero.pos.set(c.pos.x, game.hero.pos.y, c.pos.z); game.step(0.3); } });
log('tim confessed', await ev(() => [game.flags.timConfessed, game.hero.clovers]));
log('objective', await ev(() => document.querySelector('#objective').textContent));
// down the well
await ev(() => { const w = game.world.well; T.tp(w.x - 2.2, w.z, Math.PI / 2); T.tap('KeyE'); game.step(0.05); T.talkAll(); game.step(1); T.talkAll(); });
log('in well', await ev(() => [game.state, game.room?.id, game.flags.inWell]));
await shot('P7-cave.png');
// fight a mite with the ball
const mites = await ev(() => { const G = game, h = G.hero; h.hp = 10; let kills = 0; for (const m of G.enemies) { for (let i = 0; i < 8 && m.alive; i++) { h.pos.set(m.pos.x - 4, 0, m.pos.z); h.angle = h.angleTo(m) + (i % 3 - 1) * 0.3; G.ball.state = 'idle'; T.tap('KeyF'); G.step(0.9); h.hp = 10; } if (!m.alive) kills++; } return [kills, G.enemies.length]; });
log('mites killed', JSON.stringify(mites));
// wake the nodes
const nodes = await ev(() => { const G = game, h = G.hero; const out = []; for (const n of G.room.nodes) { for (let i = 0; i < 12 && !n.lit; i++) { const a = i * 0.52, r = 3 + (i % 3); h.pos.set(n.x - Math.cos(a) * r, 0, n.z - Math.sin(a) * r); h.onGround = true; h.angle = Math.atan2(n.x - h.pos.x, n.z - h.pos.z); G.ball.state = 'idle'; T.tap('Digit1'); T.tap('KeyF'); G.step(1.4); } out.push(n.lit); } G.step(1.5); return [out, G.flags.nodes, G.rooms.well.barrier.c.enabled]; });
log('nodes', JSON.stringify(nodes));
await shot('P8-nodes.png');
// walk to the vein
await ev(() => { const z = game.room.zones[0]; T.tp(z.x - 3, z.z, Math.PI / 2); game.step(0.3); T.tp(z.x, z.z, Math.PI / 2); game.step(0.3); });
log('cutscene', await ev(() => game.state));
await ev(() => game.step(2.3));
await shot('P9-pull.png');
await ev(() => { game.step(1); T.tap('KeyE'); game.step(1.2); });
await shot('P10-sendell.png');
await ev(() => T.talkAll());
log('ending', await ev(() => [game.state, game.flags.prologueDone]));
await shot('P11-end.png');
// the prologue flows straight into chapter 1 (fade, title card, morning dialogue)
await ev(() => { game.step(1.2); T.talkAll(); game.step(0.5); });
log('chapter', await ev(() => [game.flags.chapter, game.flags.c1_started]));
log('after', await ev(() => [game.state, game.room?.id ?? 'outdoor', T.p(), document.querySelector('#objective').textContent]));
const save = await ev(() => JSON.parse(localStorage.getItem('lba3_save_v1')));
log('save', JSON.stringify({ room: save.room, flags: Object.keys(save.flags).length, ball: save.hero.hasBall }));
console.log(errs.slice(0, 20).join('\n') || 'no errors');
await browser.close();
