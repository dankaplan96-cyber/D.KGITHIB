// Twinsun's wizards (src/game/wizards.js), open in every chapter: Bersimon's tent on Citadel's plateau (walk in
// through its door, he tops up Twinsen's magic, walk back out), and the School of Magic's stone face on Desert
// Island (walk in, the rector is there, Ker'aooc heals Twinsen, walk back out to the desert).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
let fails = 0;
const check = (name, ok, info) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name, ok ? '' : JSON.stringify(info)); };
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await page.evaluate(() => {
  const G = game, h = G.hero; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  const stand = (x, z) => { h.pos.set(x, G.physics.groundAt(x, z, 99), z); h.onGround = true; G.doorCool = 0; for (let i = 0; i < 90 && !G.trans; i++) G.step(1 / 30); G.step(2.5); talkAll(); };
  const talk = (id) => { const n = G.npcs.find((x) => x.def.id === id); h.pos.set(n.pos.x + Math.sin(n.angle) * 1.3, n.pos.y, n.pos.z + Math.cos(n.angle) * 1.3); h.angle = Math.atan2(n.pos.x - h.pos.x, n.pos.z - h.pos.z); G.step(0.5); G.input.taps.add('KeyE'); G.step(0.1); const st = G.state; talkAll(); return st; };
  talkAll(); h.hasBall = true;
  const out = {};
  G.exitRoom({ x: -92, z: -71, a: 0 }); G.step(2);
  const d = G.story.doors().find((x) => x.room === 'wtent');
  stand(d.x, d.z); out.tent = G.room?.id;
  h.mp = 1; out.bTalk = talk('bersimon'); out.mp = [h.mp, h.mpMax];
  const e = G.rooms.wtent.exits[0]; stand(e.x, e.z); out.tentOut = G.room?.id ?? 'citadel';
  G.enterRoom('desert', { x: 3330, z: 33, a: Math.PI }); G.step(2);
  const s = G.story.doors().find((x) => x.room === 'school');
  stand(s.x, s.z); out.school = G.room?.id;
  const m = G.npcs.find((x) => x.def.id === 'magus'); out.rector = m.present && Math.abs(m.pos.y - G.physics.groundAt(m.pos.x, m.pos.z, m.pos.y + 1)) < 0.6;
  h.hp = 3; out.kTalk = talk('keraooc'); out.hp = [h.hp, h.maxHp];
  const e2 = G.rooms.school.exits[0]; stand(e2.x, e2.z); out.schoolOut = G.room?.id;
  return out;
});
check("Bersimon's tent: in through its door on the plateau", r.tent === 'wtent', r);
check('Bersimon talks and tops up the magic', r.bTalk === 'dialog' && r.mp[0] === r.mp[1], r);
check('out of the tent, back on Citadel', r.tentOut === 'citadel', r);
check("the School of Magic: in through the stone face's door; the rector stands on the floor", r.school === 'school' && r.rector, r);
check("Ker'aooc talks and heals", r.kTalk === 'dialog' && r.hp[0] === r.hp[1], r);
check('out of the school, back on Desert Island', r.schoolOut === 'desert', r);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
