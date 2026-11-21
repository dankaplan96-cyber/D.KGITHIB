// ROCKS-1 (the user, 2.11: "hollow rocks", "in general, too square"): Citadel's cliff rocks (src/game/cliffs.js, one
// merged mesh, visual only) are closed solids, irregular faceted prisms, textured without stretching; the triangle
// budget, the placements and the reach onto the paths hold; the build is the same every time.
//   1. closed: every edge of the mesh shared by exactly two triangles, once each way (consistently wound), wound
//      outward (positive volume), drawn one-sided
//   2. budget: at most +30 % triangles over the box-shaped blocks' 8 144 (the user's Intel UHD is GPU-tight on the
//      street at Low); the placements: the box-shaped blocks' 509, from the same random draws (WORLD-80)
//   3. texture: texel density even on every face (5th to 95th percentile of uv area per m² within 25 %), the
//      projection's stretch (the ratio of its two scales) under 1.5 on 90 % of the area (the old side faces: 9.6 median)
//   4. reach: no rock above the ground within 1.8 m of a path's centre line (the old blocks: 2.11 m), little rock
//      over flat ground
//   5. deterministic: a second page load builds the same mesh (a checksum of every position)
//   SHOTS=dir: four views from the play camera (the user's two photos' places, two more sea cliffs)
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, checkVisual, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => { game.setState('play'); game.step(0.3); });

const measure = () => ev(async () => {
  const G = game; let m = null; G.world.root.traverse((o) => { if (o.name === 'cliffRocks') m = o; });
  if (!m) return null;
  const geo = m.geometry, P = geo.attributes.position, UV = geo.attributes.uv, I = geo.index, n = I ? I.count : P.count, tris = n / 3;
  const vi = (k) => (I ? I.getX(k) : k);
  const key = (i) => `${Math.round(P.getX(i) * 1000)},${Math.round(P.getY(i) * 1000)},${Math.round(P.getZ(i) * 1000)}`;
  const und = new Map(), dir = new Map();
  let vol = 0, sum = 0;
  const dens = [], st = [];
  for (let t = 0; t < tris; t++) {
    const ia = vi(3 * t), ib = vi(3 * t + 1), ic = vi(3 * t + 2), ks = [key(ia), key(ib), key(ic)];
    for (let e = 0; e < 3; e++) {
      const p = ks[e], q = ks[(e + 1) % 3];
      const u = p < q ? p + '|' + q : q + '|' + p; und.set(u, (und.get(u) || 0) + 1);
      dir.set(p + '>' + q, (dir.get(p + '>' + q) || 0) + 1);
    }
    const a = [P.getX(ia), P.getY(ia), P.getZ(ia)], b = [P.getX(ib), P.getY(ib), P.getZ(ib)], c = [P.getX(ic), P.getY(ic), P.getZ(ic)];
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (const v of [a, b, c]) for (const x of v) sum = (sum * 31 + Math.round(x * 1000)) % 2147483647;
    // the texture's map on this triangle: area ratio (density) and the ratio of its two scales (stretch)
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], wa = Math.hypot(...cr) / 2;
    if (wa < 1e-4) continue;
    const u1 = [UV.getX(ib) - UV.getX(ia), UV.getY(ib) - UV.getY(ia)], u2 = [UV.getX(ic) - UV.getX(ia), UV.getY(ic) - UV.getY(ia)];
    dens.push(Math.abs(u1[0] * u2[1] - u1[1] * u2[0]) / 2 / wa);
    const l1 = Math.hypot(...e1), d = (e2[0] * e1[0] + e2[1] * e1[1] + e2[2] * e1[2]) / l1, hy = Math.sqrt(Math.max(1e-12, (e2[0] ** 2 + e2[1] ** 2 + e2[2] ** 2) - d * d));
    const A = u1[0] / l1, C = u1[1] / l1, B = (u2[0] - A * d) / hy, D = (u2[1] - C * d) / hy;
    const tt = A * A + B * B + C * C + D * D, de = Math.abs(A * D - B * C), qq = Math.sqrt(Math.max(0, tt * tt / 4 - de * de));
    const s1 = Math.sqrt(tt / 2 + qq), s2 = Math.sqrt(Math.max(0, tt / 2 - qq));
    st.push([s2 > 1e-9 ? s1 / s2 : 1e9, wa]);
  }
  let open = 0, many = 0, sameDir = 0;
  for (const v of und.values()) { if (v === 1) open++; else if (v > 2) many++; }
  for (const v of dir.values()) if (v > 1) sameDir++;
  dens.sort((x, y) => x - y); st.sort((x, y) => x[0] - y[0]);
  const pct = (p) => dens[Math.min(dens.length - 1, Math.floor(dens.length * p))];
  const tot = st.reduce((s, x) => s + x[1], 0); let acc = 0, s90 = 0; for (const x of st) { acc += x[1]; if (acc >= tot * 0.9) { s90 = x[0]; break; } }
  // reach: points over every triangle (corners, edge middles, centre) more than 0.1 m above the ground
  const W = await import(location.origin + location.pathname.replace(/[^/]*$/, '') + 'src/game/world.js');
  const T = G.world.terrain, H = (x, z) => T.heightAt(x, z);
  let minPath = 1e9, flat = 0, above = 0;
  const test = (x, y, z) => { if (y - H(x, z) < 0.1) return; above++; if (T.slopeAt(x, z) < 0.5) flat++; minPath = Math.min(minPath, W.pathDist(x, z)); };
  for (let t = 0; t < n; t += 3) {
    const v = [0, 1, 2].map((k) => [P.getX(vi(t + k)), P.getY(vi(t + k)), P.getZ(vi(t + k))]);
    for (const q of v) test(...q);
    for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) test((v[i][0] + v[j][0]) / 2, (v[i][1] + v[j][1]) / 2, (v[i][2] + v[j][2]) / 2);
    test((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, (v[0][2] + v[1][2] + v[2][2]) / 3);
  }
  return { tris, blocks: m.userData.blocks, chunks: m.userData.chunks, open, many, sameDir, vol: Math.round(vol), side: m.material.side, sum,
    dens: [+pct(0.05).toFixed(4), +pct(0.5).toFixed(4), +pct(0.95).toFixed(4)], stretch90: +s90.toFixed(2), minPath: +minPath.toFixed(2), flatFrac: +(flat / Math.max(1, above)).toFixed(4) };
});

const a = await measure();
check('the cliff rocks are built (one mesh, cliffRocks)', !!a, a);
if (a) {
  check(`1. closed: no open edge (${a.open}), no edge shared by more than two triangles (${a.many})`, a.open === 0 && a.many === 0, a);
  check(`1. consistently wound (no edge twice the same way: ${a.sameDir}) and outward (volume ${a.vol} m³ > 0), drawn one-sided`, a.sameDir === 0 && a.vol > 0 && a.side === 0, { sameDir: a.sameDir, vol: a.vol, side: a.side });
  check(`2. triangles ${a.tris} ≤ 10 587 (+30 % over the box-shaped blocks' 8 144: ${((a.tris / 8144 - 1) * 100).toFixed(1)} %)`, a.tris <= 10587, a.tris);
  check(`2. placements: ${a.blocks} rocks (${a.chunks} chunks), as the box-shaped blocks' 509 (WORLD-80: the same random draws)`, a.blocks === 509, a.blocks);
  check(`3. texel density even: 5th/95th percentile ${a.dens[0]} / ${a.dens[2]} (≥ 0.75)`, a.dens[0] / a.dens[2] >= 0.75, a.dens);
  check(`3. no stretched faces: the projection's stretch ≤ 1.5 on 90 % of the area (${a.stretch90})`, a.stretch90 <= 1.5, a.stretch90);
  checkVisual(`4. no rock above the ground within 1.8 m of a path's centre line (nearest ${a.minPath} m)`, a.minPath >= 1.8, a.minPath);
  checkVisual(`4. little rock over flat ground: ${(a.flatFrac * 100).toFixed(2)} % of the points above the ground (≤ 2 %)`, a.flatFrac <= 0.02, a.flatFrac);
}

// the four views (the user's photos: the slope over the sea near Zoé's house, the sea cliff by the fort's old outfall;
// two more sea cliffs on the north rim), from the play camera
if (process.env.SHOTS) {
  const OUT = process.env.SHOTS; fs.mkdirSync(OUT, { recursive: true });
  for (const [name, x, z, ang] of [['1-zoe-slope', -36, 96, 2.6], ['2-fort-outfall', -87, -85, 1.57], ['3-north-cliff-run', -94, -84, 1.57], ['4-north-rim-east', 2, -84, 0]]) {
    await ev(({ x, z, ang }) => { const G = game; G.exitRoom({ x, z, a: ang }, true, true); G.hero.angle = ang; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.5); G.renderer.render(); }, { x, z, ang });
    await page.screenshot({ path: path.join(OUT, name + '.png'), timeout: 240000 });
  }
}

// 5. the same build on a second load
await open(page, '?nocine');
await menu(page, 'new');
const b = await measure();
check('5. deterministic: a second load builds the same mesh (checksum of every position)', a && b && a.sum === b.sum && a.tris === b.tris, { first: a?.sum, second: b?.sum });

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
