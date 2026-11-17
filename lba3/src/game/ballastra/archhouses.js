// W-2 · the Arch District's own pieces (arches.js builds the place from them). Ballastra's idea here is a city that
// lives by the water's level, so the pieces carry it in their form, not in their paint:
//   - tallHouse: narrow and tall, the living floor on top (jettied out on brackets over the wet floor below), a steep
//     gable to the water, a hoist beam out of the gable (goods go up, not in), the ground storey's walls stained to
//     the high-water line with a salt line on it and older marks above, dried weed caught at the marks
//   - tideMarks: the same record on any stone face (quays, piers, the terrace wall): green and wet below the low mark,
//     the salt line of the last flood, old marks with weed
//   - skiff, stall, bundles of goods: the small things that make the row and the market lived in
// Everything draws into the region's Batch through a Place (props-esmer.js), its colliders in Place.cols, materials
// cached (kit.js tm / pm), geometry cached by size: the district merges into a few draws per material.
//
// CONTRACT
//   AM.<name>()                         W-2's few materials beyond look.js's BM (the stains, the salt, mud, glazes)
//   tallHouse(P, o, X) → { top, front, wins }
//     o: { w, d, t = 0.2, storeys: [{ h, mat, frame?, jet?, stain?: { top, mat }, holes: { s, n, e, w } }],
//          roof: { kind: 'front' | 'side' | 'hip', mat, rise, over, ridge }, trim, leaf, stilts (m below the floor),
//          plinth: { mat, h } (a stone ground storey's foot), hoist, chimney, marks: [y …] (local heights) }
//     a hole: { x, y, w, h, door?, arch?, shut? } (x from the wall's middle as seen from outside, y from the storey's
//     floor); windows with shut: true get shutters drawn into X.open (open, against the wall) and X.shut (closed over
//     the glass): two Batches the caller shows or hides
//     Local frame: the ground floor at P.y, the front (s) toward +z; the jettied storeys reach jet further toward +z
//   tideMarks(B, face, o)               face: { x0, z0, x1, z1 } a vertical face from (x0, z0) to (x1, z1), its outside
//     (the water's side) at n = (dz, -dx) of the run's direction; o: { bottom, wet (top of the green), salt (the last flood's line),
//     marks: [y …] (old lines), weed: true, gaps: [[a, b] …] (along the run, metres, where nothing is drawn) }
//   skiffGeo(color) · stallGeo(kind, o) · weedGeo(len, seed)
import * as THREE from 'three';
import { tm, pm, cached, bbox, cyl, lathe, tube, compose, tint, panelGeo, frameGeo, fillGeo, ctex } from '../kit.js';
import { rng } from '../../engine/math.js';
import { TEX } from '../props.js';
import { BM } from './look.js';

export const AM = {
  stoneStain: () => tm('stone', { color: '#aeb096', rough: 0.95 }),        // stone below the high-water line
  rubbleStain: () => tm('rubble', { color: '#a3a387', rough: 0.95 }),
  limeStain: () => tm('plaster', { color: '#cfcbae', rough: 0.95 }),      // limewash below the line
  boardStain: () => pm('#b8bc9c', 0.86, { map: TEX.planks('grey') }),     // tarred-and-weathered boards below it
  salt: () => pm('#f6f2e4', 0.9),                                          // the salt line left by the last flood
  mark: () => pm('#8a8670', 0.95),                                         // an older water mark (a dark line)
  mud: () => tm('dirt', { color: '#7a6c52', rough: 1.0 }),
  lime: () => tm('plaster', { color: '#f2e8d2', rough: 0.95 }),
  limeWarm: () => tm('plaster', { color: '#efd9b4', rough: 0.95 }),
  ashlar: () => tm('stone', { color: '#ddd0b4', rough: 0.9 }),            // the terrace's older dressed stone
  ochreBoards: () => pm('#f4d48a', 0.74, { map: TEX.planks('grey') }),
  creamBoards: () => pm('#fff4dc', 0.74, { map: TEX.planks('grey') }),
  celadonBoards: () => pm('#c4f0dc', 0.74, { map: TEX.planks('grey') }),
  glazeRoof: () => tm('roof', { color: '#8cbcaa', rough: 0.38 }),          // glazed celadon roof tiles (the terrace)
  cobaltRoof: () => tm('roof', { color: '#7896c0', rough: 0.4 }),
  shutter: () => pm('#5f9a86', 0.7, { map: TEX.planks('grey') }),
  shutterRed: () => pm('#d8785a', 0.7, { map: TEX.planks('grey') }),
};

const GLASS = () => BM.dark();
// the parts of a run [−len/2, len/2] at height y not covered by holes (strips go round the doors)
function around(len, holes, y, pad = 0.12) {
  const cut = holes.filter((q) => y > q.y - 0.02 && y < q.y + q.h + 0.02).map((q) => [q.x - q.w / 2 - pad, q.x + q.w / 2 + pad]).sort((a, b) => a[0] - b[0]);
  const out = []; let a = -len / 2;
  for (const [c0, c1] of cut) { if (c0 > a + 0.05) out.push([a, c0]); a = Math.max(a, c1); }
  if (len / 2 > a + 0.05) out.push([a, len / 2]);
  return out;
}
// dried weed caught along a line: tufts of strands hanging from it (vertex-coloured)
export const weedGeo = (len, seed = 1) => cached('blw2weed' + len.toFixed(2) + seed, () => {
  const r = rng(seed * 17 + 3), parts = [], n = Math.max(1, Math.round(len / 0.32));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n) + (r() - 0.5) * 0.15, k = 2 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      const h = 0.12 + r() * 0.22, g = new THREE.PlaneGeometry(0.035 + r() * 0.03, h, 1, 2); g.translate(0, -h / 2, 0);
      parts.push([tint(g, ['#8a7a4a', '#6f7a44', '#9c8a58', '#5e6a3a'][Math.floor(r() * 4)]), x + (r() - 0.5) * 0.12, 0.01, 0.02 + r() * 0.02, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.5]);
    }
  }
  return compose(parts, true);
});

// ------------------------------------------------------------------ the tall house
export function tallHouse(P, o, X = {}) {
  const { w, d } = o, t = o.t ?? 0.2, trim = o.trim || BM.post();
  const wins = [];
  // stilts (timber piles with iron bands) and the floor slab; or a stone plinth
  if (o.stilts) {
    const sh = o.stilts + 0.2;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      P.add(cached('blw2stilt' + sh.toFixed(2), () => cyl(0.15, 0.18, sh, 7, 1)), BM.post(), a * (w / 2 - 0.12), -sh / 2 - 0.1, b * (d / 2 - 0.12));
    }
    P.add(bbox(w + 0.3, 0.26, d + 0.3, 0.03, 1.4), BM.post(), 0, -0.13, 0);
    for (const s of [-1, 1]) P.add(cached('blw2xbr' + w.toFixed(2) + sh.toFixed(2), () => bbox(0.08, 0.12, Math.hypot(w - 0.3, Math.min(sh, 1.6)), 0.01, 1).clone().rotateY(Math.PI / 2).rotateZ(Math.atan2(Math.min(sh, 1.6), w - 0.3))), BM.timber(), 0, -Math.min(sh, 1.6) / 2 - 0.2, s * (d / 2 - 0.12));
  }
  if (o.plinth) P.add(bbox(w + 0.36, o.plinth.h, d + 0.36, 0.04, 1.6), o.plinth.mat, 0, -o.plinth.h / 2 + 0.02, 0);
  let y = 0, front = d / 2;
  for (let si = 0; si < o.storeys.length; si++) {
    const st = o.storeys[si], h = st.h, jet = st.jet || 0, dd = d + jet, zc = jet / 2;
    front = d / 2 + jet;
    const sides = [
      ['s', w, (g, m) => P.add(g, m, 0, y, zc + dd / 2 - t)],
      ['n', w, (g, m) => P.add(g, m, 0, y, zc - dd / 2 + t, 0, Math.PI)],
      ['e', dd, (g, m) => P.add(g, m, w / 2 - t, y, zc, 0, Math.PI / 2)],
      ['w', dd, (g, m) => P.add(g, m, -w / 2 + t, y, zc, 0, -Math.PI / 2)],
    ];
    for (const [k, L, put] of sides) {
      const holes = (st.holes?.[k] || []).map((q) => ({ ...q, y: q.y ?? 0 }));
      const len = k === 's' || k === 'n' ? L : L - 2 * t;
      const cut = st.stain ? Math.min(st.stain.top, h) : 0;
      if (cut > 0.02) {
        const lo = holes.filter((q) => q.y < cut).map((q) => ({ x: q.x, y: q.y, w: q.w, h: Math.min(q.h, cut - q.y + 0.001) + 0.002, arch: q.arch && q.y + q.h <= cut }));
        put(cached(`blw2wl${len.toFixed(2)}|${cut.toFixed(2)}|${t}|${JSON.stringify(lo)}`, () => panelGeo(len, cut, t + 0.02, lo, 1.8)), st.stain.mat);
        // the salt line on the stain's top edge, round the openings
        for (const [a, b] of around(len, holes, cut)) put(cached(`blw2salt${(b - a).toFixed(2)}|${((a + b) / 2).toFixed(2)}|${cut.toFixed(2)}|${t}`, () => { const g = bbox(b - a, 0.05, 0.03, 0.01, 1).clone(); g.translate((a + b) / 2, cut, t + 0.02); return g; }), AM.salt());
      }
      if (h - cut > 0.02) {
        const up = holes.filter((q) => q.y + q.h > cut).map((q) => { const yy = Math.max(q.y, cut) - cut; return { x: q.x, y: yy, w: q.w, h: q.y + q.h - cut - yy, arch: q.arch }; });
        put(cached(`blw2wu${len.toFixed(2)}|${(h - cut).toFixed(2)}|${t}|${JSON.stringify(up)}|${cut.toFixed(2)}`, () => { const g = panelGeo(len, h - cut, t, up, 2.2); g.translate(0, cut, 0); return g; }), st.mat);
      }
      // older water marks on this storey (dark lines with weed caught on them), round the openings
      for (const my of (o.marks || [])) {
        const ly = my - y; if (ly < 0.1 || ly > h - 0.1) continue;
        for (const [a, b] of around(len, holes, ly)) {
          put(cached(`blw2mk${(b - a).toFixed(2)}|${((a + b) / 2).toFixed(2)}|${ly.toFixed(2)}|${t}`, () => { const g = bbox(b - a, 0.035, 0.025, 0.005, 1).clone(); g.translate((a + b) / 2, ly, t + 0.012); return g; }), AM.mark());
          if (b - a > 0.6) put(cached(`blw2wd${(b - a).toFixed(2)}|${((a + b) / 2).toFixed(2)}|${ly.toFixed(2)}|${t}`, () => { const g = weedGeo(b - a - 0.2, Math.round(ly * 10 + a * 3)).clone(); g.translate((a + b) / 2, ly, t + 0.01); return g; }), BM.vcCloth());
        }
      }
      // openings: framed reveals, a door leaf or glass, sills, shutters (two batches: open and closed)
      for (const q of holes) {
        const oo = { x: q.x, y: q.y, w: q.w, h: q.h, arch: !!q.arch };
        put(cached('blw2fr' + JSON.stringify(oo) + t, () => { const g = frameGeo(oo, 0.09, 0.07, 1).clone(); g.translate(0, 0, t); return g; }), trim);
        if (q.door) { if (!q.open) put(cached('blw2leaf' + JSON.stringify(oo) + t, () => { const g = fillGeo(oo, 0.005, 0.05, 0.6).clone(); g.translate(0, 0, t * 0.3); return g; }), q.leaf || o.leaf || BM.brick()); }
        else {
          put(cached('blw2glass' + JSON.stringify(oo) + t, () => { const g = fillGeo(oo, 0.01, 0.02, 1).clone(); g.translate(0, 0, t * 0.3); return g; }), GLASS());
          put(cached('blw2sill' + q.x + '|' + q.y + '|' + q.w + '|' + t, () => { const g = bbox(q.w + 0.26, 0.06, 0.16, 0.015, 1).clone(); g.translate(q.x, q.y - 0.03, t + 0.07); return g; }), trim);
          if (q.shut && X.open && X.shut) {
            const sm = q.shutMat || o.shutter || AM.shutter();
            // (put draws through P: for a moment P draws into the shutters' own batches, the same frame)
            const twin = (BB) => { const keep = P.B; P.B = BB; return () => { P.B = keep; }; };
            let undo = twin(X.open);
            for (const s of [-1, 1]) put(cached('blw2sho' + q.x + '|' + q.y + '|' + q.w + '|' + q.h + s + t, () => { const g = bbox(q.w * 0.5 + 0.02, q.h + 0.04, 0.04, 0.01, 0.6).clone(); g.translate(q.x + s * (q.w * 0.75 + 0.1), q.y + q.h / 2, t + 0.05); return g; }), sm);
            undo(); undo = twin(X.shut);
            for (const s of [-1, 1]) put(cached('blw2shc' + q.x + '|' + q.y + '|' + q.w + '|' + q.h + s + t, () => { const g = bbox(q.w * 0.5 + 0.02, q.h + 0.04, 0.05, 0.01, 0.6).clone(); g.translate(q.x + s * q.w * 0.25, q.y + q.h / 2, t + 0.1); return g; }), sm);
            undo();
            wins.push({ side: k, x: q.x, y: y + q.y, w: q.w, h: q.h });
          }
        }
      }
    }
    // the timber frame: corner posts on a board storey, the floor band; brackets under a jetty
    if (st.frame) for (const a of [-1, 1]) for (const b of [-1, 1]) P.add(cached('blw2post' + h, () => bbox(0.18, h + 0.02, 0.18, 0.025, 1)), BM.post(), a * (w / 2 - 0.02), y + h / 2, zc + b * (dd / 2 - 0.02));
    if (si > 0) {
      P.add(bbox(w + 0.14, 0.22, dd + 0.14, 0.02, 1), trim, 0, y + 0.02, zc);
      if (jet > 0.05) for (const a of [-1, 0, 1]) P.add(cached('blw2brk' + jet.toFixed(2), () => compose([[bbox(0.12, 0.12, jet + 0.3, 0.015), 0, -0.14, 0], [bbox(0.1, 0.1, Math.hypot(jet + 0.2, 0.7), 0.015), 0, -0.48, -0.08, Math.atan2(0.7, jet + 0.2)]])), BM.post(), a * (w / 2 - 0.25), y, d / 2 + jet / 2 - 0.1);
    }
    y += h;
  }
  // the top plate and the roof
  const top = y + 0.08, R = o.roof || {}, over = R.over ?? 0.45, th = 0.24, roof = R.mat || BM.roof(), jet = o.storeys[o.storeys.length - 1].jet || 0;
  const D = d + jet, zc = jet / 2;
  P.add(bbox(w + 0.16, 0.16, D + 0.16, 0.02, 1), BM.post(), 0, y + 0.02, zc);
  let rise = R.rise ?? (R.kind === 'side' ? D * 0.4 : w * 0.55);
  if (R.kind === 'hip') {
    rise = R.rise ?? Math.max(w, D) * 0.42;
    const side = Math.max(w, D) + 2 * over, r = side / Math.SQRT2;
    P.add(cached(`blw2hip${side.toFixed(2)}|${rise.toFixed(2)}`, () => new THREE.ConeGeometry(r, rise, 4, 1).rotateY(Math.PI / 4).translate(0, rise / 2, 0)), roof, 0, top, zc, 0, 0, 0, 1, 1, 1);
    P.add(bbox(side, th, side, 0.04, 1), trim, 0, top - th / 2 + 0.02, zc);
    P.add(cached('blw2hipfin', () => compose([[cyl(0.05, 0.08, 0.5, 8), 0, 0.25, 0], [new THREE.SphereGeometry(0.14, 10, 8), 0, 0.55, 0]])), BM.bronze(), 0, top + rise - 0.05, zc);
  } else if (R.kind === 'side') {
    // ridge along x: slopes to the front and back, gables at the sides
    const s = D / 2 + over, a = Math.atan2(rise, D / 2), L = s / Math.cos(a), gw = w + 2 * over * 0.8;
    for (const sg of [-1, 1]) {
      P.add(cached(`blw2rs${gw.toFixed(2)}|${L.toFixed(2)}`, () => bbox(gw, th, L, 0.04, 1.6)), roof, 0, top + rise - (s / 2) * Math.tan(a) + th * 0.5, zc + sg * s / 2, sg * a);
      P.add(cached(`blw2rf${gw.toFixed(2)}`, () => bbox(gw, 0.16, 0.06, 0.02, 1)), trim, 0, top + rise - s * Math.tan(a) + 0.02, zc + sg * (s - 0.02));
    }
    P.add(cached(`blw2rr${gw.toFixed(2)}`, () => cyl(0.13, 0.13, gw + 0.1, 8, 0).rotateZ(Math.PI / 2)), R.ridge || BM.celadonDeep(), 0, top + rise + th * 0.6, zc);
    for (const gx of [-1, 1]) P.add(cached(`blw2gs${D.toFixed(2)}|${rise.toFixed(2)}|${t}`, () => { const sh = new THREE.Shape(); sh.moveTo(-D / 2, 0); sh.lineTo(D / 2, 0); sh.lineTo(0, rise); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-t / 2, 0, 0); return g; }), o.storeys[o.storeys.length - 1].mat, gx * (w / 2 - t / 2), y, zc);
  } else {
    // 'front': the gable to the water (ridge along z), slopes to the sides
    const s = w / 2 + over, a = Math.atan2(rise, w / 2), L = s / Math.cos(a), gd = D + 2 * over;
    for (const sg of [-1, 1]) {
      P.add(cached(`blw2rq${gd.toFixed(2)}|${L.toFixed(2)}`, () => bbox(L, th, gd, 0.04, 1.6)), roof, sg * s / 2, top + rise - (s / 2) * Math.tan(a) + th * 0.5, zc, 0, 0, -sg * a);
      P.add(cached(`blw2rqf${gd.toFixed(2)}`, () => bbox(0.06, 0.16, gd, 0.02, 1)), trim, sg * (s - 0.02), top + rise - s * Math.tan(a) + 0.02, zc);
      // barge boards on the front gable
      P.add(cached(`blw2bb${L.toFixed(2)}`, () => bbox(L, 0.2, 0.07, 0.02, 1)), trim, sg * s / 2, top + rise - (s / 2) * Math.tan(a) + 0.02, zc + gd / 2, 0, 0, -sg * a);
    }
    P.add(cached(`blw2rqr${gd.toFixed(2)}`, () => cyl(0.13, 0.13, gd + 0.1, 8, 0).rotateX(Math.PI / 2)), R.ridge || BM.celadonDeep(), 0, top + rise + th * 0.6, zc);
    for (const gz of [-1, 1]) P.add(cached(`blw2gf${w.toFixed(2)}|${rise.toFixed(2)}|${t}`, () => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2); return g; }), o.storeys[o.storeys.length - 1].mat, 0, y, zc + gz * (D / 2 - t / 2));
    // a glazed ball on the gable's apex (a float's shape: the houses' sign of who built them)
    if (o.finial) P.add(cached('blw2finial', () => compose([[cyl(0.05, 0.08, 0.3, 8), 0, 0.15, 0], [new THREE.SphereGeometry(0.2, 12, 9), 0, 0.42, 0], [new THREE.TorusGeometry(0.2, 0.025, 4, 14).rotateX(Math.PI / 2), 0, 0.42, 0]])), o.finial, 0, top + rise + 0.12, zc + gd / 2 - 0.12);
    // a small round vent in the front gable (glazed ring)
    P.add(cached('blw2vent', () => new THREE.TorusGeometry(0.2, 0.05, 6, 14)), BM.celadonDeep(), 0, y + rise * 0.42, zc + D / 2 + 0.02);
    P.add(cached('blw2ventd', () => cyl(0.17, 0.17, 0.04, 12).rotateX(Math.PI / 2)), GLASS(), 0, y + rise * 0.42, zc + D / 2 - 0.02);
    // the hoist beam out of the gable's apex: goods go up to the living floor, not in at the water
    if (o.hoist) {
      const hy = y + rise * 0.72, hz = zc + D / 2;
      P.add(cached('blw2hoist', () => bbox(0.2, 0.22, 1.5, 0.02, 1)), BM.post(), 0, hy, hz + 0.55);
      P.add(cached('blw2hoistw', () => cyl(0.15, 0.15, 0.07, 10).rotateZ(Math.PI / 2)), BM.bronze(), 0, hy - 0.2, hz + 1.12);
      P.add(cached('blw2hoistr' + o.hoist, () => tube([[0.15, -0.2, 0], [0.15, -o.hoist, 0]], 0.014, 3, 1)), BM.rope(), 0, hy, hz + 1.12);
      P.add(cached('blw2hook', () => tube([[0, 0, 0], [0, -0.2, 0], [0.1, -0.3, 0], [0.15, -0.2, 0]], 0.025, 4, 1)), BM.iron(), 0.15, hy - o.hoist, hz + 1.12);
    }
  }
  if (o.chimney) {
    P.add(cached('blw2chim', () => compose([[cyl(0.2, 0.22, 1.3, 9), 0, 0.65, 0], [cyl(0.25, 0.2, 0.18, 9), 0, 1.36, 0]])), o.chimney, w * 0.22, top + rise * 0.45, zc - D * 0.25);
  }
  // one box for the whole house (noStand: nobody stands on its roof); the roof's eaves for the camera to keep out of
  // (the ground storey's footprint: a jettied floor overhangs the doorstep above head height)
  P.box(0, 0, w / 2 + 0.05, d / 2 + 0.02, top + rise, { seeThrough: false, noStand: true });
  return { top, rise, front: d / 2 + jet, wins };
}

// ------------------------------------------------------------------ the water's record on a stone face
export function tideMarks(B, f, o) {
  const L = Math.hypot(f.x1 - f.x0, f.z1 - f.z0); if (L < 0.2) return;
  const ry = Math.atan2(f.x1 - f.x0, f.z1 - f.z0) + Math.PI / 2;   // (the run's right-hand normal faces out)
  const dx = (f.x1 - f.x0) / L, dz = (f.z1 - f.z0) / L, nx = dz, nz = -dx, off = o.off ?? 0.03;
  const segs = []; let a = 0;
  for (const [g0, g1] of (o.gaps || []).slice().sort((p, q) => p[0] - q[0])) { if (g0 > a + 0.1) segs.push([a, g0]); a = Math.max(a, g1); }
  if (L > a + 0.1) segs.push([a, L]);
  for (const [s0, s1] of segs) {
    const len = s1 - s0, m = (s0 + s1) / 2, cx = f.x0 + dx * m + nx * off, cz = f.z0 + dz * m + nz * off;
    // green and wet from the foot to the low line, the stain to the salt line, the salt line itself
    if (o.wet != null) B.add(bbox(len, o.wet - o.bottom, 0.04, 0.01, 1.4), BM.wet(), cx, (o.bottom + o.wet) / 2, cz, 0, ry);
    if (o.salt != null && o.stain) B.add(bbox(len, o.salt - (o.wet ?? o.bottom), 0.03, 0.01, 1.6), o.stain, cx - nx * 0.005, ((o.wet ?? o.bottom) + o.salt) / 2, cz - nz * 0.005, 0, ry);
    if (o.salt != null) B.add(bbox(len, 0.06, 0.05, 0.01, 1), AM.salt(), cx + nx * 0.005, o.salt, cz + nz * 0.005, 0, ry);
    for (const my of o.marks || []) {
      B.add(bbox(len, 0.035, 0.035, 0.005, 1), AM.mark(), cx, my, cz, 0, ry);
      if (o.weed !== false && len > 0.8) B.add(weedGeo(Math.min(len - 0.3, 6), Math.round(my * 7 + s0)), BM.vcCloth(), cx + nx * 0.01, my, cz + nz * 0.01, 0, ry);
      if (o.weed !== false && len > 6.5) for (let k = 1; k * 6 < len - 0.5; k++) B.add(weedGeo(Math.min(len - 0.3 - k * 6, 6), Math.round(my * 7 + s0 + k)), BM.vcCloth(), f.x0 + dx * (s0 + 3 + k * 6) + nx * (off + 0.01), my, f.z0 + dz * (s0 + 3 + k * 6) + nz * (off + 0.01), 0, ry);
    }
  }
}

// ------------------------------------------------------------------ small things
// a working skiff (bow toward −z), its deck at +0.35; vertex-coloured
export const skiffGeo = (color = '#c6684c', seat = '#7a5c40') => cached('blw2skiff' + color, () => {
  const s = new THREE.Shape(); s.moveTo(-0.7, 1.7); s.lineTo(0.7, 1.7); s.quadraticCurveTo(0.82, -0.6, 0, -2.0); s.quadraticCurveTo(-0.82, -0.6, -0.7, 1.7);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 8 }); g.rotateX(Math.PI / 2); g.translate(0, 0.35, 0);
  return compose([[tint(g, color)], [tint(bbox(1.2, 0.06, 2.8, 0.02), '#d6b690'), 0, 0.3, 0], [tint(bbox(1.3, 0.08, 0.22, 0.02), seat), 0, 0.42, 0.6], [tint(bbox(1.1, 0.08, 0.2, 0.02), seat), 0, 0.42, -0.7],
    [tint(cyl(0.025, 0.025, 2.3, 5).rotateX(1.35), '#a68462'), 0.45, 0.5, 0.2], [tint(new THREE.TorusGeometry(0.06, 0.018, 4, 8), '#4c4e56'), 0, 0.52, -1.75]], true);
});
// a market stall (local: the counter toward +z): kind 'glaze' | 'fish' | 'cloth' | 'tea'; awning colours; vertex-coloured
// goods in one geometry (the stall frame and the awning are the caller's materials: BM.post, BM.vcCloth)
export function stall(P, kind, { w = 2.6, d = 1.5, awn = ['#5f9a86', '#f2ead6'], seed = 1 } = {}) {
  const r = rng(seed * 41 + 5);
  for (const a of [-1, 1]) for (const b of [-1, 1]) P.add(cached('blw2stp', () => bbox(0.1, 2.3, 0.1, 0.015, 1)), BM.post(), a * (w / 2 - 0.05), 1.15, b * (d / 2 - 0.05));
  P.add(cached('blw2stc' + w + d, () => compose([[bbox(w, 0.08, d * 0.62, 0.02), 0, 0.88, d * 0.19], [bbox(w - 0.1, 0.8, 0.06, 0.01), 0, 0.44, d / 2 - 0.05], [bbox(w - 0.1, 0.06, d - 0.2, 0.01), 0, 0.2, 0]])), BM.timber());
  // the awning: striped cloth sloping to the front, scalloped
  P.add(cached('blw2awn' + w + d + awn.join(), () => {
    const g = new THREE.PlaneGeometry(w + 0.4, d + 0.7, 8, 2); const p = g.attributes.position, c = [], cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x, 0, -y); cc.set(awn[Math.floor((x + w / 2 + 0.2) / ((w + 0.4) / 8)) % 2 ? 1 : 0]); c.push(cc.r, cc.g, cc.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.rotateX(-0.32); g.computeVertexNormals(); return g;
  }), BM.vcCloth(), 0, 2.32, 0.05);
  const goods = cached('blw2goods' + kind + w + d + seed, () => {
    const parts = [];
    if (kind === 'glaze') {   // Corvin's: bowls stacked, floats on a stepped shelf, a big glazed float hung
      for (let i = 0; i < 7; i++) parts.push([tint(lathe([[0.001, 0], [0.12, 0], [0.2, 0.08], [0.22, 0.12], [0.001, 0.05]], 10), ['#9cc8b4', '#3f6c9c', '#c8764e', '#e6b866'][i % 4]), -w / 2 + 0.35 + i * 0.32, 0.92, d * 0.3]);
      for (let i = 0; i < 5; i++) parts.push([tint(new THREE.SphereGeometry(0.17, 10, 8), i % 2 ? '#5f9a86' : '#9cc8b4'), -w / 2 + 0.45 + i * 0.45, 1.12, d * 0.05]);
      parts.push([tint(bbox(w - 0.2, 0.05, 0.3, 0.01), '#a68462'), 0, 1.0, -d * 0.2]);
      for (let i = 0; i < 4; i++) parts.push([tint(lathe([[0.001, -0.25], [0.2, -0.2], [0.28, 0], [0.2, 0.2], [0.001, 0.25]], 10), i % 2 ? '#3f6c9c' : '#c8764e'), -w / 2 + 0.5 + i * 0.55, 1.3, -d * 0.2]);
      parts.push([tint(lathe([[0.001, -0.3], [0.26, -0.24], [0.34, 0], [0.26, 0.24], [0.001, 0.3]], 12), '#5f9a86'), w / 2 - 0.4, 1.8, d * 0.3]);
    } else if (kind === 'fish') {   // fish on the counter in a bed of weed, a string of dried fish under the awning
      parts.push([tint(bbox(w - 0.3, 0.06, d * 0.5, 0.01), '#6f8a58'), 0, 0.95, d * 0.18]);
      for (let i = 0; i < 9; i++) { const g = new THREE.SphereGeometry(0.1, 8, 5); g.scale(2.6, 0.55, 0.9); parts.push([tint(g, ['#a8b8c0', '#c8a878', '#8aa0a8'][i % 3]), -w / 2 + 0.4 + (i % 5) * 0.45, 1.0, d * 0.05 + Math.floor(i / 5) * 0.28, 0, (r() - 0.5) * 0.6, 0]); }
      for (let i = 0; i < 6; i++) { const g = new THREE.SphereGeometry(0.07, 6, 4); g.scale(0.7, 2.6, 0.5); parts.push([tint(g, '#b89a6a'), -w / 2 + 0.4 + i * 0.36, 1.85, -d * 0.1]); }
      parts.push([tint(cyl(0.02, 0.02, w, 4).rotateZ(Math.PI / 2), '#6a5a4a'), 0, 2.05, -d * 0.1]);
      parts.push([tint(lathe([[0.001, 0], [0.26, 0], [0.3, 0.4], [0.001, 0.4]], 10), '#7a5c40'), w / 2 + 0.3, 0, d * 0.3]);
    } else if (kind === 'cloth') {   // bolts of cloth on the counter, lengths hung over a rail
      const cols = ['#c6684c', '#3f6c9c', '#e6b866', '#78b0a6', '#f0e8d6'];
      for (let i = 0; i < 5; i++) parts.push([tint(cyl(0.12, 0.12, d * 0.55, 10).rotateX(Math.PI / 2), cols[i]), -w / 2 + 0.35 + i * 0.48, 1.05, d * 0.18]);
      parts.push([tint(cyl(0.025, 0.025, w, 5).rotateZ(Math.PI / 2), '#a68462'), 0, 1.95, -d * 0.25]);
      for (let i = 0; i < 4; i++) { const g = new THREE.PlaneGeometry(0.5, 1.1, 1, 3); g.translate(0, -0.55, 0); parts.push([tint(g, cols[(i + 2) % 5]), -w / 2 + 0.5 + i * 0.6, 1.95, -d * 0.25 + 0.02]); }
    } else {   // the tea stand: a ceramic stove, a kettle, cups on the counter, low stools in front
      parts.push([tint(lathe([[0.001, 0], [0.3, 0], [0.34, 0.5], [0.26, 0.62], [0.001, 0.62]], 10), '#c8764e'), -w / 2 + 0.5, 0.92, -d * 0.15]);
      parts.push([tint(lathe([[0.001, 0], [0.16, 0], [0.18, 0.12], [0.1, 0.24], [0.04, 0.3], [0.001, 0.3]], 10), '#b07a3a'), -w / 2 + 0.5, 1.54, -d * 0.15]);
      for (let i = 0; i < 6; i++) parts.push([tint(lathe([[0.001, 0], [0.04, 0], [0.06, 0.08], [0.001, 0.08]], 8), i % 2 ? '#9cc8b4' : '#f2ead6'), -0.1 + (i % 3) * 0.3, 0.92, d * 0.12 + Math.floor(i / 3) * 0.2]);
      for (let i = 0; i < 3; i++) parts.push([tint(cyl(0.2, 0.18, 0.4, 8), '#a68462'), -0.8 + i * 0.8, 0.2, d / 2 + 0.6]);
    }
    return compose(parts, true);
  });
  P.add(goods, BM.vc());
  P.box(0, d * 0.19, w / 2 + 0.05, d * 0.33, 1.1, { block: true });
  for (const a of [-1, 1]) P.cyl(a * (w / 2 - 0.05), -(d / 2 - 0.05), 0.08, 2.3, { block: true });
  P.r = Math.max(w, d) / 2 + 0.4;
  return P;
}

// the painted level gauge (no words): bands every half metre, the three levels' glazed tiles, old flood notches
export const gaugeTex = () => ctex('blw2gauge', 64, 512, (x, W, H) => {
  x.fillStyle = '#efe6cf'; x.fillRect(0, 0, W, H);
  const Y = (m) => H - (m / 5.0) * H;   // 0 … 5 m
  for (let m = 0; m < 5; m += 0.5) { x.fillStyle = (m * 2) % 2 ? '#efe6cf' : '#2f4f6c'; x.fillRect(W * 0.32, Y(m + 0.5), W * 0.36, Y(m) - Y(m + 0.5)); }
  x.fillStyle = '#2f4f6c'; for (let m = 0; m <= 5; m += 0.1) x.fillRect(0, Y(m) - 1, m * 10 % 5 < 0.01 ? W * 0.3 : W * 0.16, 2);
  for (let m = 0; m <= 5; m += 0.1) x.fillRect(W - (m * 10 % 5 < 0.01 ? W * 0.3 : W * 0.16), Y(m) - 1, W, 2);
  x.strokeStyle = 'rgba(80,60,40,0.4)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, W - 1, H - 1);
}, false);
