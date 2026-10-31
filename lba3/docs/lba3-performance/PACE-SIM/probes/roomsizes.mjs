// PACE-SIM: how far each interior reaches from its centre (its group's box), how far apart the scenes stand, and the
// fog's far distance per scene: the numbers offscene.js's rule rests on.
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 640, height: 360 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const out = await ev(async () => {
  const G = game, THREE = await import('three'); G.regions.ensureAll('test');
  const rows = [], B = new THREE.Box3();
  for (const [id, R] of Object.entries(G.regions.rooms_)) {
    const c = R.center || R.group.position; B.setFromObject(R.group);
    const reach = B.isEmpty() ? 0 : Math.max(...[[B.min.x, B.min.z], [B.min.x, B.max.z], [B.max.x, B.min.z], [B.max.x, B.max.z]].map(([x, z]) => Math.hypot(x - c.x, z - c.z)));
    let nearest = 1e9, nid = null;
    for (const [j, Q] of Object.entries(G.regions.rooms_)) { if (j === id) continue; const d = G.regions.centreOf(j); const dd = Math.hypot(d.x - c.x, d.z - c.z); if (dd < nearest) { nearest = dd; nid = j; } }
    rows.push({ id, outdoor: !!R.outdoor, cx: Math.round(c.x), cz: Math.round(c.z), reach: Math.round(reach), nearest: Math.round(nearest), nid, box: [Math.round(B.min.x), Math.round(B.max.x), Math.round(B.min.z), Math.round(B.max.z)] });
  }
  // the people and enemies: is any of them more than 60 m from the centre of the interior it stands nearest to?
  const odd = [];
  for (const a of [...G.npcs, ...G.enemies]) {
    const p = a.pos; if (Math.abs(p.x) < 400 && Math.abs(p.z) < 400) continue;
    let best = null, bd = 1e9; for (const r of rows) { const d = Math.hypot(p.x - r.cx, p.z - r.cz); if (d < bd) { bd = d; best = r; } }
    if (best && !best.outdoor && bd > 40) odd.push(`${a.def?.id || a.id} ${Math.round(p.x)},${Math.round(p.z)} ${Math.round(bd)} m from ${best.id}`);
  }
  return { rows: rows.sort((a, b) => a.cx - b.cx), odd, fog: G.scene.fog ? [G.scene.fog.near, G.scene.fog.far] : null };
});
for (const r of out.rows) console.log(`${r.id.padEnd(16)} ${r.outdoor ? 'outdoor' : 'interior'} centre ${r.cx},${r.cz} · reaches ${r.reach} m · nearest scene ${r.nid} at ${r.nearest} m · box x ${r.box[0]}..${r.box[1]} z ${r.box[2]}..${r.box[3]}`);
console.log('actors over 40 m from the nearest scene centre (outside Citadel):', out.odd);
console.log('fog', out.fog);
await browser.close();
