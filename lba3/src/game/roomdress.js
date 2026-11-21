// ROOMS-FULL (the user 3.11: "make sure the rooms and shops don't feel too empty, like the shop on Citadel Island …
// maybe shrink a little and add detail"): small pieces that furnish Citadel's rooms — stocked shelves, sacks, stacks
// of boxes, striped wall hangings, baskets, the odd tool — in the rooms' own style (bevelled shapes, flat colours).
// Kept cheap: every piece is drawn in plain colours of a few fixed roughnesses (a Kit merges those into one
// vertex-coloured mesh per roughness, see props.js MAT) and the room's own woods and brass; no new textures, no lights.
//
// CONTRACT (all draw into a Kit `k` at the current k.at() origin, +z away from the wall they stand at)
//   goodsShelf(k, { w, h, d, rows, pal, seed, goods })  → footprint { hw, hd, top }: a standing shelf unit, stocked
//   sack(k, { s, c, tie })                              → { r, top }: a tied sack of grain or flour
//   sackPile(k, { seed })                              → { hw, hd, top }: three sacks leant together
//   boxStack(k, { n, seed, w })                         → { hw, hd, top }: parcels and boxes stacked
//   basket(k, { r, fill })                              → { r, top }: a wicker basket, heaped
//   hanging(k, { w, h, bands })                         : a striped cloth hung from a brass rod (on a wall: +z out)
//   shelfGoods(k, w, y, seed)                           : a row of small goods along a board at height y
import { MAT, rbox, cyl, sphere, lathe, jar } from './props.js';

const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
// the plain colours, at the roughnesses the rooms already use (merged per roughness)
const P = (c) => MAT.paint(c, 0.6), F = (c) => MAT.flat(c, 0.8);
const TINS = ['#c8452f', '#2f8a9a', '#e8b84a', '#3a72c4', '#5e9a4a', '#b8b6c0'], BOXES = ['#c8a070', '#b88a5a', '#d8c8a0', '#a8683a', '#e8dcc0'];

// a row of small goods along a board: tins, boxes, jars and bottles, spaced along w (centred), standing at y
export function shelfGoods(k, w, y, seed = 1, z = 0) {
  const r = rng(seed * 31 + 7);
  for (let x = -w / 2 + 0.1; x < w / 2 - 0.1;) {
    const t = r();
    if (t < 0.3) { const rr = 0.045 + r() * 0.02, h = 0.1 + r() * 0.06; k.add(cyl(rr, rr, h, 10), P(TINS[Math.floor(r() * TINS.length)]), x + rr, y + h / 2, z); x += rr * 2 + 0.03; }
    else if (t < 0.55) { const bw = 0.14 + r() * 0.1, bh = 0.1 + r() * 0.12; k.add(rbox(bw, bh, 0.16, 0.01), P(BOXES[Math.floor(r() * BOXES.length)]), x + bw / 2, y + bh / 2, z); x += bw + 0.03; }
    else if (t < 0.8) { jar(k, x + 0.07, y, z, r() < 0.5 ? 'jar' : 'crock', ['#2f8a8a', '#c8a050', '#c8452f', '#3f6a9a'][Math.floor(r() * 4)], 0.8 + r() * 0.3); x += 0.17; }
    else if (t < 0.9) { jar(k, x + 0.05, y, z, 'bottle', ['#2f8a7a', '#7a3a2a', '#c8a050'][Math.floor(r() * 3)], 0.8 + r() * 0.2); x += 0.13; }
    else x += 0.08 + r() * 0.1;   // (a gap: something sold)
  }
}

// a standing shelf unit against a wall: two side boards, a back, `rows` boards of goods (goods(k, w, y, row) may
// replace the mixed goods)
export function goodsShelf(k, { w = 1.4, h = 2.0, d = 0.38, rows = 4, pal = 'honey', seed = 1, goods = null } = {}) {
  const m = MAT.wood(pal);
  for (const sx of [-1, 1]) k.add(rbox(0.05, h, d, 0.01), m, sx * (w / 2 - 0.025), h / 2, 0);
  k.add(rbox(w, h, 0.03, 0.005), MAT.wood(pal === 'dark' ? 'dark' : 'honey'), 0, h / 2, -d / 2 + 0.015);
  k.add(rbox(w, 0.05, d, 0.01), m, 0, h - 0.025, 0);
  for (let i = 0; i < rows; i++) {
    const y = 0.12 + i * ((h - 0.25) / rows);
    k.add(rbox(w - 0.06, 0.035, d - 0.03, 0.008), m, 0, y, 0.01);
    if (goods) goods(k, w - 0.12, y + 0.018, i); else shelfGoods(k, w - 0.12, y + 0.018, seed * 5 + i, 0.02);
  }
  return { hw: w / 2, hd: d / 2, top: h };
}

// a tied sack, a little slumped
export function sack(k, { s = 1, c = '#d8c8a0', tie = '#8a6a3a' } = {}) {
  k.add(lathe([[0.001, 0], [0.2 * s, 0], [0.24 * s, 0.08 * s], [0.25 * s, 0.25 * s], [0.2 * s, 0.42 * s], [0.08 * s, 0.5 * s], [0.06 * s, 0.53 * s], [0.1 * s, 0.6 * s], [0.001, 0.62 * s]], 10), MAT.flat(c, 0.95), 0, 0, 0, 0, { sz: 0.85 });
  k.add(cyl(0.065 * s, 0.065 * s, 0.03 * s, 8), MAT.flat(tie, 0.95), 0, 0.515 * s, 0);
  return { r: 0.25 * s, top: 0.6 * s };
}
export function sackPile(k, { seed = 1 } = {}) {
  const r = rng(seed * 11 + 3), cols = ['#d8c8a0', '#c8b48a', '#e8dcc0'];
  [[-0.22, -0.05, 0.95], [0.24, 0.02, 1.05], [0.0, 0.25, 0.85]].forEach(([x, z, s], i) => k.at(x, 0, z, r() * 3, () => sack(k, { s, c: cols[i % 3] })));
  return { hw: 0.5, hd: 0.42, top: 0.62 };
}

// parcels and boxes stacked: n boxes, the lower ones bigger
export function boxStack(k, { n = 3, seed = 1, w = 0.6 } = {}) {
  const r = rng(seed * 17 + 5);
  let y = 0, bw = w;
  for (let i = 0; i < n; i++) {
    const h = 0.25 + r() * 0.2, c = BOXES[Math.floor(r() * BOXES.length)];
    k.add(rbox(bw, h, bw * 0.8, 0.015), P(c), (r() - 0.5) * 0.06, y + h / 2, (r() - 0.5) * 0.06, (r() - 0.5) * 0.3);
    k.add(rbox(bw + 0.004, 0.03, 0.04, 0.004), F('#8a6a3a'), 0, y + h / 2, 0, 0, {});   // (the string round it)
    y += h; bw *= 0.8;
  }
  return { hw: w / 2, hd: w * 0.4, top: y };
}

// a wicker basket heaped with fruit or rolls
export function basket(k, { r = 0.22, fill = '#e8a030' } = {}) {
  k.add(lathe([[0.001, 0], [r * 0.75, 0], [r, r * 0.6], [r * 1.04, r * 0.62], [r * 0.95, r * 0.62], [r * 0.7, 0.03], [0.001, 0.03]], 14), MAT.flat('#b8884a', 0.95), 0, 0, 0);
  for (let i = 0; i < 7; i++) { const a = i * 2.4, rr = (i ? 0.55 : 0) * r; k.add(sphere(r * 0.32, 8, 6), MAT.flat(fill, 0.5), Math.sin(a) * rr, r * 0.62 + (i ? 0 : r * 0.15), Math.cos(a) * rr); }
  return { r, top: r * 0.9 };
}

// a striped cloth hung from a brass rod, flat to the wall (+z out of it); bands: its colours top to bottom
export function hanging(k, { w = 1.0, h = 1.4, bands = ['#b0302c', '#e8dcc0', '#2f6f74', '#e8dcc0', '#b0302c'] } = {}) {
  k.add(cyl(0.02, 0.02, w + 0.16, 6), MAT.brass(), 0, h / 2 + 0.03, 0.04, 0, { rz: Math.PI / 2 });
  const bh = h / bands.length;
  bands.forEach((c, i) => k.add(rbox(w, bh + 0.002, 0.015, 0.003), MAT.flat(c, 0.95), 0, h / 2 - bh * (i + 0.5), 0.03));
  for (let i = 0; i < 7; i++) k.add(cyl(0.006, 0.006, 0.08, 4), MAT.flat(bands[0], 0.95), -w / 2 + 0.06 + i * ((w - 0.12) / 6), -h / 2 - 0.04, 0.03);
}
