// Long-session stability: the same route many times (through the house door and out, three ball throws, a
// conversation) — does anything accumulate? Scene objects, GPU geometries/textures/programs, particles,
// pickups, music voices, live intervals and listeners, JS heap. The first cycles warm caches up; growth is
// judged between cycle 5 and the last. Played through the input harness. Software rendering (SwiftShader):
// the memory/object counts are meaningful, frame times are not.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { open, menu, checker, URL0 } from './lib/boot.mjs';
const N = +(process.env.CYCLES || 30);
const { check, done } = checker();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.addInitScript(() => {
  // count live intervals and listeners added (the game never removes most listeners: they are added once)
  const live = new Set(); const si = window.setInterval, ci = window.clearInterval;
  window.setInterval = (...a) => { const id = si(...a); live.add(id); return id; };
  window.clearInterval = (id) => { live.delete(id); return ci(id); };
  window.__live = live; window.__listeners = 0;
  const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (...a) { if (this === window || this === document || this === document.body) window.__listeners++; return ael.apply(this, a); };
});
await open(page, '?nocine'); await menu(page, 'new');
await page.evaluate(() => { const G = game; P.settle(); const s = G.room.searches[0]; P.use(s.x, s.z); const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); });
const sample = () => page.evaluate(() => {
  const G = game, R = G.renderer.renderer; let objs = 0; G.scene.traverse(() => objs++);
  window.gc?.();
  return { objs, children: G.scene.children.length, geo: R.info.memory.geometries, tex: R.info.memory.textures, progs: R.info.programs.length,
    particles: G.particles.list?.length ?? G.particles.count ?? null, pickups: G.pickups.list.length, enemies: G.enemies.length, npcs: G.npcs.length,
    voices: G.audio.music?.voices?.length ?? null, intervals: window.__live.size, listeners: window.__listeners,
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, bolts: G.bolts?.list?.length ?? null };
});
const rows = [];
for (let i = 0; i < N; i++) {
  await page.evaluate(() => {
    const G = game, d = G.world.houses[0].door;
    P.through(d.x, d.z); P.settle();
    const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle();
    for (let k = 0; k < 3; k++) { P.tap('KeyF', 0.05); G.step(1.5); }
    const n = G.npcs.filter((x) => x.present && !x.def.noTalk).sort((a, b) => a.pos.distanceTo(G.hero.pos) - b.pos.distanceTo(G.hero.pos))[0];
    if (n && n.pos.distanceTo(G.hero.pos) < 25) P.talk(n.def.id);
    G.renderer.render();
  });
  rows.push(await sample());
}
console.log('cycle  ' + Object.keys(rows[0]).join(' '));
rows.forEach((r, i) => { if (i < 3 || i % 5 === 4 || i === rows.length - 1) console.log(String(i).padStart(5), Object.values(r).join(' ')); });
const a = rows[Math.min(4, rows.length - 1)], b = rows[rows.length - 1];
const grow = (k, slack = 0) => (b[k] ?? 0) - (a[k] ?? 0) <= slack;
check(`${N} cycles: scene objects don't accumulate`, grow('objs', 10), { from: a.objs, to: b.objs });
check(`${N} cycles: GPU geometries/textures/programs don't accumulate`, grow('geo', 5) && grow('tex', 2) && grow('progs', 0), { a, b });
check(`${N} cycles: particles, pickups, bolts, enemies, NPCs stay bounded`, grow('particles', 50) && grow('pickups', 3) && grow('enemies') && grow('npcs') && grow('bolts', 3), { a, b });
check(`${N} cycles: never more than 2 music voices; intervals and listeners don't accumulate`, rows.every((r) => r.voices == null || r.voices <= 2) && grow('intervals', 1) && grow('listeners', 2), { a, b });
check(`${N} cycles: JS heap after GC grows less than 10 MB`, b.heapMB == null || b.heapMB - a.heapMB < 10, { a: a.heapMB, b: b.heapMB });
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
