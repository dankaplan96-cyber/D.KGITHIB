// Givers (LBA2's zone giver) and the action hop:
//   1. Space in Normal mode with nothing in reach plays the hop (0.58 s); away from a giver nothing pops
//   2. by a giver the hop pops one bonus toward Twinsen on an arc; it lands, he takes it; a giver gives once
//   3. the bonus is what Twinsen needs most (broke: kashes worth n; hurt badly: a heart)
//   4. an untaken bonus blinks in its last 3 s and goes after 20 s
//   5. no kashes lie around outdoors; a save keeps the giver taken
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ev = (f, a) => page.evaluate(f, a);
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== '' ? ' ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.step(1.2);
  // stand by a giver (a little off it, facing it), Normal behaviour
  window.standBy = (gv, off = 0.9) => {
    const h = G.hero; h.setBehaviour('normal');
    const a = Math.atan2(G.room ? G.room.center.x - gv.x : 0, G.room ? G.room.center.z - gv.z : 1);
    h.pos.set(gv.x + Math.sin(a) * off, gv.y ?? G.physics.groundAt(gv.x + Math.sin(a) * off, gv.z + Math.cos(a) * off), gv.z + Math.cos(a) * off);
    h.angle = a + Math.PI; h.vel.set(0, 0); h.onGround = true; h.vy = 0; G.step(0.1);
  };
  window.hop = () => { G.input.taps.add('Space'); G.step(1 / 60); return { act: G.hero.actAnim, actT: +G.hero.actT.toFixed(2) }; };
  window.run = (s) => { for (let t = 0; t < s; t += 1 / 30) G.step(1 / 30); };
  window.bonuses = () => G.pickups.list.filter((p) => p.life !== Infinity).map((p) => ({ type: p.type, value: p.value, fly: !!p.fly, y: +p.pos.y.toFixed(2), vis: p.mesh.visible, life: +p.life.toFixed(1) }));
});

// ---------------------------------------------------------------- 1. the hop
const room = await ev(() => ({ id: game.room?.id, givers: game.room?.givers.map((g) => g.id) }));
check('the house has givers', room.id === 'house' && room.givers.length >= 4, room);
const away = await ev(() => { const G = game, h = G.hero; h.setBehaviour('normal'); h.pos.set(G.room.center.x, 0, G.room.center.z + 0.6); h.vel.set(0, 0); G.step(0.1);
  const r = hop(); const peak = []; for (let i = 0; i < 20; i++) { G.step(1 / 60); peak.push(h.rig.j.hips.position.y); } run(0.6); return { ...r, rise: +(Math.max(...peak) - Math.min(...peak)).toFixed(2), n: bonuses().length, after: h.actT <= 0 }; });
check('Space with nothing in reach hops (0.58 s, the hips rise)', away.act === 'action' && Math.abs(away.actT - 0.58) < 0.03 && away.rise > 0.25 && away.after, away);
check('away from a giver nothing pops', away.n === 0, away);

// ---------------------------------------------------------------- 2. a giver pops one bonus, once
const pop = await ev(() => {
  const G = game, gv = G.room.givers.find((g) => g.id === 'dresser'); G.hero.coins = 0;
  standBy(gv); const r = hop(); G.step(0.05);
  const b0 = bonuses(); run(0.3); const mid = bonuses();
  const h = G.hero; h.pos.set(G.room.center.x + 2.5, 0, G.room.center.z + 2.5); G.step(0.05); run(1.2); const landed = bonuses();
  return { r, b0, mid, landed, gv: { x: gv.x, z: gv.z } };
});
check('a hop by the dresser pops one bonus', pop.r.act === 'action' && pop.b0.length === 1 && pop.b0[0].fly, pop);
check('it flies up, then lands and stays (until taken)', pop.mid[0]?.y > pop.b0[0]?.y && pop.landed[0] && !pop.landed[0].fly, pop);
check('broke: the bonus is kashes worth 5', pop.b0[0]?.type === 'coin' && pop.b0[0]?.value === 5, pop.b0);
const take = await ev(() => { const G = game, p = G.pickups.list.find((q) => q.life !== Infinity); if (!p) return { none: true }; G.hero.pos.set(p.pos.x, G.physics.groundAt(p.pos.x, p.pos.z), p.pos.z); G.step(0.1); G.step(0.1); return { coins: G.hero.coins, left: bonuses().length }; });
check('taking it adds 5 kashes', take.coins === 5 && take.left === 0, take);
const again = await ev(() => { const G = game, gv = G.room.givers.find((g) => g.id === 'dresser'); standBy(gv); hop(); run(0.7); return bonuses().length; });
check('the same giver gives once', again === 0, again);

// ---------------------------------------------------------------- 3. what is needed most
const need = await ev(() => {
  const G = game, h = G.hero; h.coins = 60; h.hp = 1; h.mp = h.mpMax;
  const life = G.whichBonus(['money', 'life', 'magic']);
  h.hp = h.maxHp; h.mp = 0; const magic = G.whichBonus(['money', 'life', 'magic']);
  h.mp = h.mpMax; h.coins = 0; const money = G.whichBonus(['money', 'life', 'magic']);
  h.magicLevel = 0; const noMagic = G.whichBonus(['magic']); h.magicLevel = 1;
  const gv = G.room.givers.find((g) => g.id === 'chest'); h.coins = 60; h.hp = 1; standBy(gv); hop(); G.step(0.05);
  const b = bonuses(); h.hp = h.maxHp; h.pos.set(G.room.center.x + 2.5, 0, G.room.center.z + 2.5); G.step(0.05);
  return { life, magic, money, noMagic, b };
});
check('hurt badly → life, out of magic → magic, broke → money', need.life === 'life' && need.magic === 'magic' && need.money === 'money', need);
check('a magic-only giver gives a heart before the ball', need.noMagic === 'life', need);
check('the chest pops a heart for a hurt Twinsen', need.b[0]?.type === 'heart', need.b);

// ---------------------------------------------------------------- 4. blink and time out
const tout = await ev(() => { run(16.5); const a = bonuses()[0]; const vis = []; for (let i = 0; i < 40; i++) { game.step(0.05); vis.push(bonuses()[0]?.vis); } run(2); return { life: a?.life, blinks: vis.includes(false) && vis.includes(true), left: bonuses().length }; });
check('an untaken bonus blinks at the end and goes after 20 s', tout.life > 1 && tout.blinks && tout.left === 0, tout);

// ---------------------------------------------------------------- 5. outdoors and saves
const out = await ev(() => { const G = game; G.save(false); const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('save')) || '') || '{}');
  return { coinsOutside: G.pickups.list.filter((p) => p.type === 'coin').length, outGivers: G.world.givers.map((g) => g.id), saved: (s.searched || []).filter((k) => k.startsWith('giver:')) }; });
check('no kashes lie around outdoors', out.coinsOutside === 0, out);
check('a few givers outdoors (barrels, the stump)', out.outGivers.length >= 4 && out.outGivers.includes('stump'), out.outGivers);
check('the save keeps the givers taken', out.saved.includes('giver:house:dresser') && out.saved.includes('giver:house:chest'), out.saved);

console.log(errs.length ? errs.join('\n') : 'no errors');
if (errs.length) fails++;
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
