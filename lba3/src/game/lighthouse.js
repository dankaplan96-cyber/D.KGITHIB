// The Citadel lighthouse's tower (I-3, from AUDIT-CH12 #10): a tapered tower in cream and red bands on a rubble
// footing, an arched door with its surround and a step, small arched windows round the stair, a gallery with a
// railing, a glazed lamp room and a red cap. Same kit as the town's houses (src/game/kit.js: textures, Batch), so
// the whole building is a handful of meshes: one per material, and only the plastered body casts a shadow.
// What the story and the tests read is unchanged: position, the door on +z (world.js POI.lighthouse; story
// network.js LIGHTHOUSE_DOOR), the cylinder collider of radius 3.1, the lamp material, beam and light (world.js).
import * as THREE from 'three';
import { Batch, tm, pm, cyl, lathe, boxUV, tint, cached } from './kit.js';

export const LH = {
  R0: 2.78,            // body radius at the foot (the plinth, 3.05, stays inside the collider's 3.1)
  SLOPE: 0.074,        // radius lost per metre of height: 1.6 at the gallery
  H: 16,               // gallery floor (the old tower was five 3.2 m drums to this height)
  DOOR_Y: 0.3,         // the sill, on the plinth
  CREAM: '#fbf5e6', RED: '#d04a33',
};
const rAt = (y) => LH.R0 - LH.SLOPE * y;
const bx = (w, h, d, tile = 1) => cached(`lhb${w},${h},${d},${tile}`, () => boxUV(new THREE.BoxGeometry(w, h, d), tile));   // a plain box with world-scaled UVs (the kit's bevelled bbox costs ~10x the triangles; these are small)

// an arched opening cut through a flat frame: the surround stands proud, the opening shows what lies in it
function archFrame(w, h, ring, depth) {
  return cached(`lhf${w},${h},${ring},${depth}`, () => {
    const hw = w / 2 + ring, s = new THREE.Shape();
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h - w / 2); s.absarc(0, h - w / 2, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
    const p = new THREE.Path(), x = w / 2;
    p.moveTo(-x, 0); p.lineTo(x, 0); p.lineTo(x, h - w / 2); p.absarc(0, h - w / 2, x, 0, Math.PI, false); p.lineTo(-x, 0);
    s.holes.push(p);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.8, uv.getY(i) / 1.8);
    return g;
  });
}
function archSlab(w, h, depth) {   // the plain filled opening (door leaf, dark window pane)
  return cached(`lhs${w},${h},${depth}`, () => {
    const x = w / 2, s = new THREE.Shape();
    s.moveTo(-x, 0); s.lineTo(x, 0); s.lineTo(x, h - w / 2); s.absarc(0, h - w / 2, x, 0, Math.PI, false); s.lineTo(-x, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.1, uv.getY(i) / 2.2);
    return g;
  });
}

/**
 * Builds the tower into `grp` (a group at the foot of the tower, +z the door side). `lampMat` is the lamp's own
 * material (world.js drives its glow, the beam and the light). Returns { topY, lampY, capY }: the gallery's level,
 * the lamp's middle and the cap's foot.
 */
export function buildLighthouse(grp, lampMat) {
  const topY = LH.H;
  const plaster = tm('plasterWall', { vc: true, rough: 0.78 });
  const stone = tm('rubble', { vc: true });
  const dress = plaster;   // (the dressed stone of the frames, courses and gallery: the body's own texture and mesh kind, tinted)
  const wood = tm('wood', { vc: true, rough: 0.85 });
  const iron = pm('#ffffff', 0.5, { vertexColors: true, metalness: 0.5 });
  const glass = pm('#ffffff', 0.18, { vertexColors: true, metalness: 0.15 });
  const BC = new Batch(grp, { cast: true }), BN = new Batch(grp, { cast: false });
  const cream = (g) => tint(g, LH.CREAM), red = (g) => tint(g, LH.RED);
  const st = (g, c) => tint(g, c), wd = (g, c = '#7a5a3a') => tint(g, c), fe = (g, c = '#2c2f38') => tint(g, c);

  // ---- the body: five bands, cream and red as before, tapering all the way; the rubble footing under them
  const EDGE = [3.3, 5.6, 8.1, 10.6, 13.1, topY];
  for (let i = 0; i < 5; i++) BC.add((i % 2 ? red : cream)(cyl(rAt(EDGE[i + 1]), rAt(EDGE[i]), EDGE[i + 1] - EDGE[i], 28, 2.2, true)), plaster, 0, (EDGE[i] + EDGE[i + 1]) / 2, 0);
  BN.add(st(cyl(rAt(3.3), rAt(-0.4), 3.7, 28, 1.7, true), '#d8cfba'), stone, 0, 1.45, 0);
  BN.add(st(cyl(3.05, 3.08, 0.8, 28, 1.7, true), '#bdb2a0'), stone, 0, -0.1, 0);                  // the plinth (inside the collider's 3.1)
  BN.add(st(new THREE.RingGeometry(rAt(0.3), 3.05, 28).rotateX(-Math.PI / 2), '#bdb2a0'), stone, 0, 0.3, 0);   // its top, round the foot
  // string courses at the band joints
  for (const y of EDGE.slice(0, 5)) {
    const r = rAt(y);
    BN.add(st(lathe([[r - 0.02, -0.1], [r + 0.11, -0.07], [r + 0.13, 0.03], [r + 0.08, 0.1], [r - 0.02, 0.1]], 28, 1.7), '#c0b5a2'), stone, 0, y, 0);
  }

  // ---- the door (+z), recessed: an arched surround proud of the wall, the leaf set inside it, a step in front
  const wz = (x, y) => Math.sqrt(rAt(y) ** 2 - x * x);   // the wall's z at x (the wall is round)
  const dw = 1.1, dh = 2.3, dy = LH.DOOR_Y, rF = rAt(dy);   // rF: the footing's radius at the sill
  BN.add(st(archFrame(dw, dh, 0.22, 0.55), '#d8cfba'), dress, 0, dy, rF - 0.3);
  BN.add(wd(archSlab(dw, dh, 0.09)), wood, 0, dy, rF - 0.02);
  for (const y of [0.55, 1.5]) BN.add(fe(bx(dw * 0.86, 0.09, 0.03, 1)), iron, 0, dy + y, rF + 0.085);   // straps
  BN.add(fe(new THREE.TorusGeometry(0.09, 0.02, 6, 12)), iron, dw * 0.28, dy + 1.05, rF + 0.1);
  BN.add(st(bx(dw + 1.0, 0.4, 0.55, 1), '#cfc5b0'), stone, 0, -0.05, 3.02);                       // the step, to z 3.3 (he stands >= 3.5 from the axis)
  BN.add(st(bx(0.34, 0.26, 0.22, 1), '#e2d9c4'), dress, 0, dy + dh + 0.12, rF + 0.25);                // keystone
  BN.add(fe(bx(0.05, 0.05, 0.4, 1)), iron, 1.25, dy + 2.0, wz(1.25, dy + 2.0) + 0.1);                // a lantern bracket by the door
  BN.add(fe(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 8)), iron, 1.25, dy + 1.85, wz(1.25, dy + 2.0) + 0.3);

  // ---- windows: narrow arched slits spiralling up the stair, each a stone frame round a dark pane with a cross
  const win = (y, ang, big = false) => {
    const w = big ? 0.6 : 0.46, h = big ? 1.05 : 0.85, r = rAt(y + h / 2) + 0.03;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(ang) * r, y, Math.cos(ang) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), new THREE.Vector3(1, 1, 1));
    const add = (geo, mat, dx, dy2, dz2) => BN.addM(geo, mat, m.clone().multiply(new THREE.Matrix4().makeTranslation(dx, dy2, dz2)));
    add(st(archFrame(w, h, 0.13, 0.28), '#d8cfba'), dress, 0, 0, -0.14);
    add(fe(archSlab(w, h, 0.05), '#232834'), glass, 0, 0, 0.0);
    add(wd(bx(0.035, h - 0.08, 0.04, 1), '#efe7d3'), wood, 0, h * 0.5, 0.07);
    add(wd(bx(w - 0.04, 0.035, 0.04, 1), '#efe7d3'), wood, 0, h * 0.42, 0.07);
    add(st(bx(w + 0.34, 0.07, 0.3, 1), '#e2d9c4'), dress, 0, -0.04, 0.02);   // the sill
  };
  win(4.2, 0.9); win(6.4, -1.0); win(8.9, 2.4); win(11.2, -2.3, true); win(13.7, 0.6);

  // ---- the gallery: a corbelled floor, a railing of posts and rails
  const gr = 2.38;
  BN.add(st(lathe([[rAt(15.0) - 0.03, 15.0], [rAt(15.2) + 0.14, 15.2], [gr - 0.28, 15.5], [gr, 15.72], [gr + 0.06, 15.8], [gr + 0.06, topY - 0.02], [gr - 0.05, topY], [1.0, topY]], 28, 1.7), '#bdb2a0'), stone, 0, 0, 0);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26, r = rAt(15.2) + 0.2; BN.add(st(bx(0.2, 0.34, 0.2, 1), '#cfc3ad'), stone, Math.sin(a) * r, 15.28, Math.cos(a) * r, 0, a, 0); }   // corbel blocks
  const rr = gr - 0.1;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; BN.add(fe(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 5), '#46505e'), iron, Math.sin(a) * rr, topY + 0.47, Math.cos(a) * rr); }
  for (const [y, t] of [[0.96, 0.035], [0.5, 0.022], [0.07, 0.025]]) BN.add(fe(new THREE.TorusGeometry(rr, t, 4, 32), '#46505e'), iron, 0, topY + y, 0, Math.PI / 2, 0, 0);

  // ---- the lamp room: a stone drum, then glazing in an iron cage (the lamp's own material, glowing when it is lit),
  //      the cap with a finial and a rod
  const lampR = 1.32, glazeY0 = topY + 0.55, glazeH = 1.6;
  BN.add(st(cyl(lampR + 0.12, lampR + 0.18, 0.55, 20, 1.7, true), '#d8cfba'), stone, 0, topY + 0.27, 0);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(lampR, lampR, glazeH, 20), lampMat);
  lamp.position.y = glazeY0 + glazeH / 2; lamp.castShadow = false; grp.add(lamp);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.31; BN.add(fe(bx(0.07, glazeH, 0.07, 1), '#38404c'), iron, Math.sin(a) * (lampR + 0.01), glazeY0 + glazeH / 2, Math.cos(a) * (lampR + 0.01), 0, a, 0); }
  for (const [y, t] of [[0.5, 0.04], [1, 0.06], [0, 0.06]]) BN.add(fe(new THREE.TorusGeometry(lampR + 0.02, t, 4, 20), '#38404c'), iron, 0, glazeY0 + glazeH * y, 0, Math.PI / 2, 0, 0);
  const capY = glazeY0 + glazeH;
  BC.add(red(lathe([[0, 0], [lampR + 0.55, 0], [lampR + 0.6, 0.1], [lampR + 0.4, 0.2], [lampR - 0.1, 0.34], [0.8, 0.95], [0.42, 1.35], [0.2, 1.6], [0, 1.65]], 24, 1.7)), plaster, 0, capY, 0);
  BN.add(fe(new THREE.SphereGeometry(0.15, 8, 6), '#d6b45a'), iron, 0, capY + 1.7, 0);
  BN.add(fe(new THREE.CylinderGeometry(0.012, 0.03, 0.8, 5), '#46505e'), iron, 0, capY + 2.05, 0);   // the lightning rod

  BC.build(); BN.build();
  return { topY, lampY: glazeY0 + glazeH / 2, capY };
}
