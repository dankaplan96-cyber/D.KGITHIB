// LAMP-FADE (the user, 2.11.2026: "the lamps switch on and off, it looks odd"): the light pool (src/engine/lightpool.js)
// hands its few real lights between the street lamps. Running through Citadel's town to the harbour and back, no light
// may jump to another lamp while it is lit, and no light's strength may change by more than a fade step in one frame.
// The same inside Twinsen's house (the user saw it there too), walking between its rooms' lamps.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');

const walk = (q, where) => ev(([q, where]) => {
  const G = game, h = G.hero;
  G.settings.quality = q; G.applySettings();
  let path;
  if (where === 'town') {
    G.enterRoom(null, { x: -42, z: -4 }, true); P.settle(); G.step(0.5);
    path = [[-42, -4], [-60, 8], [-80, 24], [-100, 38], [-113, 44], [-90, 30], [-60, 10], [-30, -10], [-42, -4]];
  } else {
    G.enterRoom('house', null, true); P.settle(); G.step(0.5);
    const R = G.room, pts = [...(R.searches || []), ...(R.exits || [])].map((s) => [s.x, s.z]);
    path = [[h.pos.x, h.pos.z], ...pts, ...pts.slice().reverse(), [h.pos.x, h.pos.z]];
  }
  const L = G.lightPool.lights, srcMax = Math.max(1e-6, ...G.lightPool.sources.map((s) => s.intensity || 0));
  const prev = L.map((l) => ({ p: l.position.clone(), i: l.intensity }));
  let pops = 0, maxStep = 0, lit = 0, frames = 0;
  const y = h.pos.y, room = G.room?.id;
  for (let k = 1; k < path.length; k++) {
    const [x0, z0] = path[k - 1], [x1, z1] = path[k], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.12));
    for (let j = 1; j <= n; j++) {
      h.pos.x = x0 + (x1 - x0) * j / n; h.pos.z = z0 + (z1 - z0) * j / n;
      if (where === 'town') h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z); else h.pos.y = y;
      h.vel?.set?.(0, 0, 0);
      G.step(1 / 30); frames++;
      if ((G.room?.id || null) !== (room || null)) G.enterRoom(room || null, { x: h.pos.x, z: h.pos.z }, true);   // (a door on the path)
      L.forEach((l, i) => {
        const a = prev[i], moved = a.p.distanceToSquared(l.position) > 1e-4;
        if (moved && a.i > 0.05 && l.intensity > 0.05) pops++;
        if (!moved) maxStep = Math.max(maxStep, Math.abs(l.intensity - a.i) / srcMax);
        if (l.intensity > 0.05) lit++;
        a.p.copy(l.position); a.i = l.intensity;
      });
    }
  }
  return { q, where, size: L.length, sources: G.lightPool.sources.length, frames, lit, pops, maxStep: +maxStep.toFixed(3) };
}, [q, where]);

for (const where of ['town', 'house']) for (const q of ['high', 'medium']) {
  const r = await walk(q, where);
  check(`${where}, ${q}: walking about, no lamp light jumps between lamps while lit, and none flips on or off in one frame`, r.lit > 0 && r.pops === 0 && r.maxStep <= 0.3, r);
}
await browser.close();
done();
