// LBA1's rooms rebuilt from their layouts (src/game/lba1places.js): FunFrock's asylum under its block-house on
// Citadel (in through the door, its guards are posted after the prologue, the old register in the office, out by
// the stair-well), and the Temple of Bù's maze and halls (down the stair from our temple, through the maze to the
// halls with their crystal mites, and back up at the far end).
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
  const stand = (x, z, y = 99) => { h.pos.set(x, G.physics.groundAt(x, z, y), z); h.onGround = true; G.doorCool = 0; for (let i = 0; i < 90 && !G.trans; i++) G.step(1 / 30); G.step(2.5); talkAll(); return G.room?.id ?? 'citadel'; };
  talkAll(); h.hasBall = true; G.flags.prologueDone = true; G.story.refreshCast();
  const out = {};
  G.exitRoom({ x: -6, z: -65, a: 0 }); G.step(2);
  const d = G.story.doors().find((x) => x.room === 'asylum');
  out.enter = d && stand(d.x, d.z, 20);
  out.floor = h.pos.y > 0.5 && h.onGround;
  const A = G.enemies.filter((e) => e.group === 'asylum');
  out.guards = A.filter((e) => e.present).length; out.kinds = [...new Set(A.map((e) => e.def.kind))].sort();
  for (const e of A) e.setPresent(false);   // (search in peace)
  const R = G.rooms.asylum, s = R.searches[0], c0 = h.clovers;
  h.pos.set(s.x + 0.6, G.physics.groundAt(s.x + 0.6, s.z, 30), s.z); h.onGround = true; G.step(0.5);
  G.input.taps.add('KeyE'); G.step(0.1); out.search = G.state; talkAll(); out.clover = h.clovers > c0;
  out.out = stand(R.exits[0].x, R.exits[0].z, 10);
  G.enterRoom('butemple'); G.step(2);
  const st = G.rooms.butemple.exits.find((e) => e.room === 'bumaze');
  out.maze = stand(st.x, st.z, 5); out.mazeFloor = h.onGround && Math.abs(h.pos.y - G.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 1)) < 0.3;
  out.halls = stand(G.rooms.bumaze.goal.x, G.rooms.bumaze.goal.z, 5);
  out.mites = G.enemies.filter((e) => e.group === 'buhalls' && e.present).length;
  const ex = G.rooms.buhalls.exits.find((e) => e.room === 'butemple');
  out.back = stand(ex.x, ex.z, 12);
  return out;
});
check('the asylum: in through the block-house on Citadel, standing on its floor', r.enter === 'asylum' && r.floor, r);
check("the asylum's guards are posted (Quetch guards, the fat trooper, guard dogs)", r.guards >= 8 && ['fclone', 'gdog', 'guard'].every((k) => r.kinds.includes(k)), r);
check('the old register in the office: a search, a clover', r.search === 'dialog' && r.clover, r);
check('out by the stair-well, back on Citadel', r.out === 'citadel', r);
check("the Temple of Bù: down the stair into the maze", r.maze === 'bumaze' && r.mazeFloor, r);
check("through the maze to the halls, the crystal mites there", r.halls === 'buhalls' && r.mites >= 4, r);
check('the far end of the halls leads back up to the temple', r.back === 'butemple', r);
console.log(errs.length ? errs.join('\n') : 'no errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
