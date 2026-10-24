// progress screenshots: node tests/lib/shots.mjs <outdir> [only,names | islands]  (GAME_URL as the tests). One browser, 1280x720,
// a new game, then each place from the normal play camera (outdoor regions and rooms entered directly, no story).
import { launch, open, menu } from './boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SET = process.argv[3] === 'islands' ? 'islands' : 'main';
const ONLY = SET === 'main' ? process.argv[3]?.split(',') : null;
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
const snap = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 180000 }); console.log('shot', name); };
const want = (n) => !ONLY || ONLY.includes(n);
await open(page, '?nocine');
if (want('00-title')) await snap('00-title');
await menu(page, 'new');
// spec: { room } enters that room at its spawn (or at x,z); { x, z } stands on Citadel; a = facing; t = seconds to settle
const place = (s) => ev((s) => { const G = game, h = G.hero;
  if (s.near) { const R = G.rooms[s.room], q = s.near.split('.').reduce((o, k) => o[k], R); s.x = q.x + (s.dx || 0); s.z = q.z + (s.dz || 0); }
  if (s.room) G.enterRoom(s.room, s.x != null ? { x: s.x, z: s.z, a: s.a } : null, true, true);
  else G.exitRoom({ x: s.x, z: s.z, a: s.a ?? 0 }, true, true);
  if (s.a != null) h.angle = s.a;
  G.camRig.lba && (G.camRig.lba.init = false); G.step(s.t ?? 1.5); G.renderer.render(); return G.room?.id || 'citadel'; }, s);
const MAIN = [
  ['01-house', { room: 'house', t: 2.5 }],
  ['02-village', { x: -42, z: -2, a: 0.6 }],
  ['03-pump', { x: -40.5, z: 66.5, a: 2.4 }],
  ['04-harbour-customs', { x: -107, z: 37, a: -1.2 }],
  ['05-pier', { x: -116, z: 46, a: -1.6 }],
  ['07-spaceport', { spaceport: true }],
  ['08-workshop', { room: 'workshop', t: 2 }],
  ['09-zeelich', { room: 'zeelich', t: 2 }],
  ['10-desert', { room: 'desert', t: 2 }],
  ['11-hamalayi', { room: 'hamalayi', t: 2 }],
  ['12-temple-bu', { room: 'butemple', t: 2 }],
  ['13-isle-celebration', { room: 'isle_celebration', t: 2 }],
  ['14-asylum', { room: 'asylum', t: 2 }],
  ['15-school', { room: 'school', t: 2 }],
  ['16-core', { room: 'c3core', t: 2 }],
];
// Zeelich, the original's Zeelich islands (shuttle landings), the Hamalayi (spots from its contract, hamalayi.js)
const ISLANDS = [
  ['z1-zeelich-dock', { room: 'zeelich', t: 2 }],
  ...['otringal', 'knartas', 'mosquibee', 'celebration', 'undergas', 'cxislet', 'platform'].map((k) => ['z-' + k, { room: 'isle_' + k, t: 2 }]),
  ['h1-landing', { room: 'hamalayi', t: 2 }],
  ['h2-lhar', { room: 'hamalayi', near: 'lhar', dz: 6, a: Math.PI, t: 2 }],
  ['h3-monastery', { room: 'hamalayi', near: 'monastery.yard', dz: 4, a: Math.PI, t: 2 }],
  ['h4-observatory', { room: 'hamalayi', near: 'observatory', dz: 7, a: Math.PI, t: 2 }],
];
const SHOTS = SET === 'islands' ? ISLANDS : MAIN;
for (const [name, s0] of SHOTS) {
  if (!want(name)) continue;
  let s = s0;
  if (s.spaceport) s = await ev(() => { const L = game.world.spaceport.landing; return { x: L.x, z: L.z, a: L.a }; });
  try { console.log(name, await place(s)); await snap(name); } catch (e) { console.log('FAILED', name, e.message.slice(0, 200)); }
}
console.log(errs.slice(0, 10).join('\n') || 'no errors');
await browser.close();
