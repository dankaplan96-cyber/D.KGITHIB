// POLISH-SWEEP (CLOUD_ORDERS 58): the people where they stand, in every region and room, at a chapter's state.
// node npcscan.mjs <url> <save.json|new> <out dir>   (the save's origin is rewritten to <url>)
// For every person present and drawn, after 3 s of play in their place (the game's own stepping):
//   feet   the body's ground height against the physics' ground under it (|Δ| > 8 cm: float / sunk), unless the story
//          holds them at a height (pinY: a seat, a ledge)
//   solid  the body's middle (0.9 m up) inside a collider (a wall, furniture, a door), r 0.12 m
//   overlap two people closer than 0.45 m
//   wall   standing still and talking/listening/idle with a collider 0.35 m in front of the face (facing a wall)
// A picture from the game's camera for each, with Twinsen put 3 m in front of them.
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, SAVE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT + '/shots', { recursive: true });
let storageState;
if (SAVE !== 'new') { const origin = new URL(URL0).origin; const raw = fs.readFileSync(SAVE, 'utf8').replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/g, origin); storageState = JSON.parse(raw); }
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1300,780', '--use-angle=d3d11'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, ...(storageState ? { storageState } : {}) })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.click(SAVE === 'new' ? '[data-act="new"]' : '[data-act="continue"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
const head = await page.evaluate(() => { const G = game; G.testFreeze = true; for (let i = 0; i < 120 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  return { chapter: G.story?.cur?.key, rooms: [...G.regions.of.keys()], outdoor: ['citadel'], regions: G.regions?.list?.() || null, state: G.state }; });
console.log(JSON.stringify({ chapter: head.chapter, state: head.state, rooms: head.rooms.length }));
// the places: Citadel outdoors, then every room (the regions are rooms too: zeelich, desert, hamalayi, ballastra, the isles)
const places = ['citadel', ...head.rooms];
const found = [], seen = {};
for (const place of places) {
  const r = await page.evaluate((place) => { const G = game, P = G.physics;
    try {
      if (place === 'citadel') { if (G.room) G.exitRoom({ x: -42, z: 2, a: 0 }, true); }
      else { G.regions?.ensure?.(place, 'load'); G.enterRoom(place, null, true, true); }
    } catch (e) { return { err: String(e).slice(0, 120) }; }
    for (let i = 0; i < 90; i++) { if (G.state !== 'play') { G.input.taps.add('KeyE'); } G.step(1 / 30); }
    const where = G.room?.id || 'citadel'; if (where !== place) return { err: 'not entered: ' + where };
    const here = G.npcs.filter((n) => n.rig?.root?.visible !== false && (n.present ?? true) && !n.dead && (n.room ?? n.where ?? null) !== undefined && (() => { for (let p = n.rig.root; p; p = p.parent) if (!p.visible) return false; return true; })() && Math.hypot(n.pos.x - G.hero.pos.x, n.pos.z - G.hero.pos.z) < 400);
    const out = [];
    for (const n of here) {
      const id = n.def?.id || n.id, x = n.pos.x, z = n.pos.z, y = n.pos.y, g = P.groundAt(x, z, y + 1.2), fa = n.angle ?? n.rig.root.rotation.y;
      const anim = n.rig.anim, held = n.pinY != null || /sit|slump|doze|kneel|lie|sleep/i.test(anim || '') || n.seated;
      if (g != null && isFinite(g) && !held) { const d = y - g; if (d > 0.08) out.push({ id, kind: 'float', d: +d.toFixed(2), x, z, anim , fa }); else if (d < -0.08) out.push({ id, kind: 'sunk', d: +d.toFixed(2), x, z, anim , fa }); }
      const self = n.collider || n.body; let inside = false;
      for (const c of P.near(x, z)) { if (!c.enabled || c === self || c.owner === n || c.npc === n || c.actor === n) continue; if (c.top > y + 0.9 - 0.12 && c.bottom < y + 0.9 + 0.12 && P._inside(c, x, z, 0.12)) { inside = c.name || c.kind || c.type || 'collider'; break; } }
      if (inside) out.push({ id, kind: 'solid', what: String(inside).slice(0, 40), x, z, anim , fa });
      const moving = Math.hypot(n.vel?.x || 0, n.vel?.z ?? n.vel?.y ?? 0) > 0.2;
      if (!moving && /idle|talk|listen/.test(anim || '')) { const a = n.angle ?? n.rig.root.rotation.y, fx = x + Math.sin(a) * 0.35, fz = z + Math.cos(a) * 0.35;
        let wall = false; for (const c of P.near(fx, fz)) { if (!c.enabled || c === self || c.npc || c.actor) continue; if (c.top > y + 1.4 && c.bottom < y + 1.4 && P._inside(c, fx, fz, 0.05)) { wall = c.name || c.kind || 'collider'; break; } }
        if (wall) out.push({ id, kind: 'wall', what: String(wall).slice(0, 40), x, z, anim , fa }); }
    }
    for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) { const a = here[i], b = here[j], d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
      if (d < 0.45 && Math.abs(a.pos.y - b.pos.y) < 1) out.push({ id: (a.def?.id || a.id) + '+' + (b.def?.id || b.id), kind: 'overlap', d: +d.toFixed(2), x: a.pos.x, z: a.pos.z }); }
    return { n: here.length, out };
  }, place);
  if (r.err) { seen[place] = r.err; continue; }
  seen[place] = r.n;
  for (const f of r.out) {
    f.place = place; found.push(f);
    const nm = `${place}-${f.kind}-${String(f.id).replace(/[^a-z0-9+_-]/gi, '')}`.slice(0, 80);
    await page.evaluate((f) => { const G = game, h = G.hero; const a = f.fa != null ? f.fa : Math.atan2(G.camera.position.x - f.x, G.camera.position.z - f.z);
      h.pos.set(f.x + Math.sin(a) * 3, G.physics.groundAt(f.x + Math.sin(a) * 3, f.z + Math.cos(a) * 3, 80) ?? h.pos.y, f.z + Math.cos(a) * 3); h.angle = a + Math.PI;
      G.camRig.lba && (G.camRig.lba.init = false); for (let i = 0; i < 12; i++) G.step(1 / 30); G.renderer.render(); }, f);
    await page.screenshot({ path: `${OUT}/shots/${nm}.jpg`, type: 'jpeg', quality: 75 });
  }
}
const res = { save: SAVE, chapter: head.chapter, places: seen, findings: found, errs: errs.slice(0, 5) };
fs.writeFileSync(`${OUT}/npcscan.json`, JSON.stringify(res, null, 1));
console.log(`findings ${found.length}: ` + JSON.stringify(found.reduce((a, f) => { a[f.kind] = (a[f.kind] || 0) + 1; return a; }, {})));
await browser.close(); process.exit(0);
