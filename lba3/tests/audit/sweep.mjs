// RELEASE-AUDIT v75: a fresh-eyes picture sweep. Five seeded-random spots per region at Follow / Medium (Classic
// controls), each a short random offset from a place a player goes (a door, a person, a search spot, a giver), a picture
// from the play camera with the HUD, and the camera's own reading (in view? what hides him?). Automated runtime only:
// the pictures are for a person to look at; the numbers only flag where to look.
//   LOAD=<storage.json> (a chain save; else a new game)  REGION=citadel|zeelich|desert|hamalayi|underground|isles|rooms
//   SEED=<n> (default 75)  N=<spots, default 5>  OUT=<dir for pictures>  ; GAME_URL as the other tests
import { launch, open, menu, checker } from '../lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker();
const OUT = process.env.OUT || '/dev/shm/audit-sweep'; fs.mkdirSync(OUT, { recursive: true });
const REGION = process.env.REGION || 'citadel', SEED = +(process.env.SEED || 75), N = +(process.env.N || 5);
const { browser, page } = await launch({ width: 960, height: 540, storageState: process.env.LOAD });
await open(page, '?nocine');
await menu(page, process.env.LOAD ? 'continue' : 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('../lib/camwalk.js', import.meta.url)) });
const info = await page.evaluate(() => { const r = CW.setup(); return { ...r, chapter: game.story?.cur?.key, room: game.room?.id || 'citadel' }; });
console.log('setup', JSON.stringify(info));
// the areas of a region (room ids; '' = Citadel outdoors)
const AREAS = { citadel: [''], zeelich: ['zeelich'], desert: ['desert'], hamalayi: ['hamalayi'],
  underground: ['c3shaft', 'c3deep', 'c3gallery', 'c3sendell', 'c3core'],
  isles: ['isle_otringal', 'isle_knartas', 'isle_mosquibee', 'isle_celebration', 'isle_undergas', 'isle_platform', 'isle_liftdock', 'isle_orchard', 'isle_oldwatch'],
  rooms: ['house', 'tavern', 'pharmacy', 'bazoo', 'nbrhouse', 'otrbar', 'zh_nara', 'school', 'obsv', 'council', 'workshop', 'zterminal', 'terminal', 'asylum'] };
const spots = await page.evaluate(({ areas, seed, n }) => {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const G = game, P = G.physics, out = [], anchors = [];
  for (const id of areas) {
    let R = null;
    if (id) { if (!G.regions.has(id)) continue; R = G.regions.ensure(id, 'audit'); }
    const add = (o, why) => { if (o && Number.isFinite(o.x) && Number.isFinite(o.z)) anchors.push({ room: id, x: o.x, z: o.z, why }); };
    if (R) {
      for (const e of R.exits || []) add(e, 'exit'); for (const e of R.searches || []) add(e, 'search'); for (const e of R.givers || []) add(e.pos || e, 'giver');
      if (R.spawn) add(R.spawn, 'spawn');
      for (const d of R.houseDoors || R.lharDoors || R.postDoors || []) add(d, 'door');
      for (const [k, v] of Object.entries(R.npcSpots || {})) add(v, 'spot ' + k);
      const ox = R.group?.position?.x ?? R.spawn?.x ?? 0;
      // (an interior: only people within 40 m of its spawn, the rooms stand 100-200 m apart; an outdoor area: its extent)
      const reach = R.outdoor ? 260 : 40, oz = R.outdoor ? (R.group?.position?.z ?? R.spawn?.z ?? 0) : R.spawn?.z ?? 0, ox2 = R.outdoor ? ox : R.spawn?.x ?? ox;
      for (const m of G.npcs) if (m.present && m.pos && Math.abs(m.pos.x - ox2) < reach && Math.abs(m.pos.z - oz) < (R.outdoor ? 400 : 40)) add(m.pos, 'npc ' + m.def.id);
    } else {
      for (const m of G.npcs) if (m.present && m.pos && Math.abs(m.pos.x) < 200 && Math.abs(m.pos.z) < 200) add(m.pos, 'npc ' + m.def.id);
      for (const hs of G.world?.houses || []) add(hs.door, 'door ' + (hs.id || hs.name || ''));
      for (const [k, v] of Object.entries(G.world?.POI || {})) add(v, 'poi ' + k);
      for (const sg of G.world?.signs || []) add(sg.pos || sg, 'sign');
    }
  }
  const tried = new Set();
  for (let k = 0; k < 400 && out.length < n && anchors.length; k++) {
    const A = anchors[Math.floor(rnd() * anchors.length)];
    const d = 2 + rnd() * 4, b = rnd() * Math.PI * 2, x = A.x + Math.sin(b) * d, z = A.z + Math.cos(b) * d;
    if (A.room && G.room?.id !== A.room) { G.enterRoom(A.room, G.rooms[A.room].spawn, true, true); G.step(0.2); }
    else if (!A.room && G.room) { G.exitRoom({ x, z, a: 0 }, true, true); G.step(0.2); }
    const ay = P.groundAt(A.x, A.z), g = P.groundAt(x, z, ay + 2);
    if (!Number.isFinite(g) || Math.abs(g - ay) > 1.6 || P.blockedAt(x, z, g + 0.3, 0.4)) continue;
    if (!A.room && G.world.terrain.heightAt(x, z) < 0.3 && g < 0.3) continue;   // (the sea)
    const key = A.why + Math.round(x) + ',' + Math.round(z); if (tried.has(key)) continue; tried.add(key);
    out.push({ room: A.room, x: +x.toFixed(2), z: +z.toFixed(2), y: +g.toFixed(2), a: +(rnd() * Math.PI * 2).toFixed(2), near: A.why });
  }
  return { out, anchors: anchors.length };
}, { areas: AREAS[REGION], seed: SEED, n: N });
console.log('anchors', spots.anchors, 'spots', spots.out.length);
check(`${REGION}: ${N} spots found`, spots.out.length === N, JSON.stringify(spots.out.map((s) => s.near)));
let i = 0;
for (const s of spots.out) {
  i++;
  const r = await page.evaluate((s) => {
    const G = game; const p = CW.place({ room: s.room || undefined, x: s.x, z: s.z, y: s.y, a: s.a });
    CW.start(); CW.step(1.5); const st = CW.stop(); G.renderer.render();
    const h = G.hero;
    return { at: p, room: G.room?.id || 'citadel', y: +h.pos.y.toFixed(2), ground: +G.physics.groundAt(h.pos.x, h.pos.z, h.pos.y + 1).toFixed(2), seen: CW.seen(), hidden: CW.hidden(h.pos), cam: [G.camera.position.x, G.camera.position.y, G.camera.position.z].map((u) => +u.toFixed(1)), stats: st && { minArm: st.minArm, unseen: st.unseen, hidden: st.hidden, ins: st.ins } };
  }, s);
  const name = `${REGION}-${String(i).padStart(2, '0')}-${(s.room || 'citadel')}-${s.near.replace(/[^a-z0-9]+/gi, '_')}`;
  await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 180000 });
  console.log(name, JSON.stringify(s), JSON.stringify(r));
  check(`${name}: standing on ground (|y - ground| < 0.3)`, Math.abs(r.y - r.ground) < 0.3, `y ${r.y} ground ${r.ground}`);
}
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
