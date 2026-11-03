// Ballastra's small buildings (W-1: Tessa's shed, the customs hut): a timber frame on a plinth, the lower walls clad in
// glazed tiles, the upper walls in painted boards, openings that are real holes with framed reveals, a thick roof with
// deep eaves and a ridge cap. Drawn into the region's Batch through a Place (props-esmer.js), its colliders in P.cols.
//
// CONTRACT
//   building(P, o) → { top }   o: { w, d, h, t = 0.18, plinth = 0.16, low = BM.celadon(), lowH = 0.9, up = BM.teal(),
//     roof = BM.roof(), ridge = BM.celadonDeep(), trim = BM.ochre(), kind = 'gable' | 'hip', rise, over = 0.45,
//     open: { s: [hole], n: [...], e: [...], w: [...] } }   a hole: { x, y, w, h, door?, arch? } along its wall,
//     x measured from the wall's middle as seen from outside; a door gets a leaf (o.leaf material), a window glass and
//     shutters (o.shutter)
//   Local frame: the floor at P.y, the front (s) toward +z.
import * as THREE from 'three';
import { cached, bbox, cyl, panelGeo, frameGeo, fillGeo } from '../kit.js';
import { BM } from './look.js';

const GLASS = () => BM.dark();
export function building(P, o) {
  const { w, d, h } = o, t = o.t ?? 0.18, pl = o.plinth ?? 0.16, lowH = o.lowH ?? 0.9;
  const low = o.low || BM.celadon(), up = o.up || BM.teal(), trim = o.trim || BM.ochre();
  // the plinth (timber sill on the float, or stone)
  P.add(bbox(w + 0.24, pl, d + 0.24, 0.03, 1.2), o.plinthM || BM.post(), 0, pl / 2, 0);
  const y0 = pl;
  // walls: [side, length, local placement]
  const sides = [
    ['s', w, (g, m) => P.add(g, m, 0, y0, d / 2 - t)],
    ['n', w, (g, m) => P.add(g, m, 0, y0, -d / 2 + t, 0, Math.PI)],
    ['e', d, (g, m) => P.add(g, m, w / 2 - t, y0, 0, 0, Math.PI / 2)],
    ['w', d, (g, m) => P.add(g, m, -w / 2 + t, y0, 0, 0, -Math.PI / 2)],
  ];
  const rise = o.rise ?? (o.kind === 'hip' ? Math.max(w, d) * 0.45 : d * 0.32);
  for (const [k, L, put] of sides) {
    const holes = (o.open?.[k] || []).map((q) => ({ ...q, y: q.y ?? 0 }));
    const len = k === 's' || k === 'n' ? L - 0.02 : L - 2 * t;
    // the tiled dado (cut by doors) and the boarded wall above it
    const lowHoles = holes.filter((q) => q.y < lowH).map((q) => ({ ...q, h: Math.min(q.h, lowH - q.y + 0.001) + 0.002 }));
    put(cached(`blbw${len}|${lowH}|${t}|${JSON.stringify(lowHoles)}`, () => panelGeo(len, lowH, t + 0.03, lowHoles, 1.0)), low);
    const upHoles = holes.filter((q) => q.y + q.h > lowH).map((q) => { const yy = Math.max(q.y, lowH) - lowH; return { ...q, y: yy, h: q.y + q.h - lowH - yy }; });
    put(cached(`blbu${len}|${h - lowH}|${t}|${JSON.stringify(upHoles)}`, () => { const g = panelGeo(len, h - lowH, t, upHoles, 2.2); g.translate(0, lowH, 0); return g; }), up);
    // a band where the tiles meet the boards
    put(cached(`blbband${len}`, () => { const g = bbox(len + 0.04, 0.07, 0.05, 0.015, 1).clone(); g.translate(0, lowH, t + 0.02); return g; }), trim);
    // the openings: a framed reveal, a door leaf or glass and shutters
    for (const q of holes) {
      const oo = { x: q.x, y: q.y, w: q.w, h: q.h, arch: !!q.arch };
      put(cached('blbfr' + JSON.stringify(oo) + t, () => { const g = frameGeo(oo, 0.09, 0.07, 1).clone(); g.translate(0, 0, t + 0.0); return g; }), trim);
      if (q.door) put(cached('blbleaf' + JSON.stringify(oo), () => { const g = fillGeo(oo, 0.005, 0.05, 0.6).clone(); g.translate(0, 0, t * 0.35); return g; }), o.leaf || BM.brick());
      else {
        put(cached('blbglass' + JSON.stringify(oo), () => { const g = fillGeo(oo, 0.01, 0.02, 1).clone(); g.translate(0, 0, t * 0.3); return g; }), GLASS());
        put(cached('blbsill' + q.x + q.y + q.w, () => { const g = bbox(q.w + 0.3, 0.06, 0.16, 0.015, 1).clone(); g.translate(q.x, q.y - 0.03, t + 0.07); return g; }), trim);
        if (o.shutter) for (const s of [-1, 1]) put(cached('blbsh' + q.x + q.y + q.w + q.h + s, () => { const g = bbox(q.w * 0.5, q.h + 0.06, 0.04, 0.01, 0.6).clone(); g.translate(q.x + s * (q.w * 0.75 + 0.1), q.y + q.h / 2, t + 0.05); return g; }), o.shutter);
      }
    }
    // gable ends (a gable roof's ridge runs along x: its gables are e and w)
    if (o.kind !== 'hip' && (k === 'e' || k === 'w')) put(cached(`blbgab${len}|${rise}|${t}`, () => {
      const s = new THREE.Shape(); s.moveTo(-len / 2 - t, 0); s.lineTo(len / 2 + t, 0); s.lineTo(0, rise); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, h, 0); return g;
    }), up);
  }
  // corner posts and a top plate (the frame shows at the corners)
  for (const a of [-1, 1]) for (const b of [-1, 1]) P.add(cached('blbpost' + h, () => bbox(0.2, h + 0.02, 0.2, 0.025, 1)), BM.post(), a * (w / 2 - 0.02), y0 + h / 2, b * (d / 2 - 0.02));
  P.add(bbox(w + 0.16, 0.14, d + 0.16, 0.02, 1), BM.post(), 0, y0 + h + 0.02, 0);
  // the roof
  const over = o.over ?? 0.45, th = 0.22, roof = o.roof || BM.roof(), ridge = o.ridge || BM.celadonDeep();
  const top = y0 + h + 0.09;
  if (o.kind === 'hip') {
    const side = Math.max(w, d) + 2 * over, r = side / Math.SQRT2;
    P.add(cached(`blhip${side}|${rise}`, () => new THREE.ConeGeometry(r, rise, 4, 1).rotateY(Math.PI / 4).translate(0, rise / 2, 0)), roof, 0, top, 0);
    P.add(cached(`blhipf${side}`, () => bbox(side, th, side, 0.04, 1)), trim, 0, top - th / 2 + 0.02, 0);
    P.add(cached('blhipfin', () => new THREE.SphereGeometry(0.16, 10, 8)), BM.bronze(), 0, top + rise + 0.05, 0);
  } else {
    const s = d / 2 + over, a = Math.atan2(rise, d / 2), L = s / Math.cos(a), gw = w + 2 * over * 0.8;
    for (const sg of [-1, 1]) {
      P.add(cached(`blgr${gw}|${L}|${th}`, () => bbox(gw, th, L, 0.04, 1.6)), roof, 0, top + rise - (s / 2) * Math.tan(a) + th * 0.5, sg * s / 2, sg * a);
      // the fascia under the eave and the boarded soffit line
      P.add(cached(`blgf${gw}`, () => bbox(gw, 0.16, 0.06, 0.02, 1)), trim, 0, top + rise - s * Math.tan(a) + 0.02, sg * (s - 0.02));
    }
    P.add(cached(`blgridge${gw}`, () => cyl(0.13, 0.13, gw + 0.1, 8, 0, false).rotateZ(Math.PI / 2)), ridge, 0, top + rise + th * 0.62, 0);
    // barge boards along the gables
    for (const gx of [-1, 1]) for (const sg of [-1, 1]) P.add(cached(`blgbb${L}`, () => bbox(0.06, 0.2, L, 0.02, 1)), trim, gx * gw / 2, top + rise - (s / 2) * Math.tan(a) + 0.02, sg * s / 2, sg * a);
  }
  P.box(0, 0, w / 2 + 0.05, d / 2 + 0.05, top + rise, { seeThrough: false, noStand: true });
  return { top, rise };
}
