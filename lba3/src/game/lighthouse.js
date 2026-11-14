// The Citadel lighthouse's tower, in LBA2's shape (CITADEL-85, after the curator's resemblance-citadel.md §6 and LBA2's
// body 7, looked at and measured, nothing copied): a square white tower with its corners cut and dressed in grey stone
// quoins, on an octagonal rubble footing; a grey stone upper stage under a corbelled gallery with an iron railing; a
// glazed octagonal lantern (the lamp's own material) under a domed grey cap; at its foot, on the door's side, a low
// stone annex under a lean-to of boards, the wooden door in its front. White and grey, no stripes: twelve years on it
// is LBA2's tower with our own windows, lantern bracket and steps.
// Same kit as before (src/game/kit.js), so the whole building is a handful of meshes: one per material, and only the
// plaster and the dressed stone of the tower cast a shadow.
// What the story and the tests read is unchanged: position, the door on +z (world.js POI.lighthouse; story
// network.js LIGHTHOUSE_DOOR, 3.7 m out), the cylinder collider of radius 3.1, the doorstep and its steps, the lamp
// material, beam and light (world.js). The annex's front corners stand up to 0.4 m beyond the cylinder: world.js
// gives it a box of its own (LH_ANNEX), so he never walks into them.
import * as THREE from 'three';
import { Batch, tm, pm, lathe, boxUV, tint, cached } from './kit.js';

export const LH = {
  HW: 2.2, CH: 0.5,    // the shaft: half-width and the corners' cut (corner points 2.78 m from the axis)
  FOOT: 3.08,          // the footing's octagon, circumradius (inside the collider's 3.1)
  H: 15.25,            // the gallery floor
  DOOR_Y: 0.3,         // the sill, on the footing
  WHITE: '#f2f5ff', GREY: '#dcdde0', GREY_D: '#b4b6bc',   // (tints over the textures: the plaster's cream drawn to white, the dressed stone's warm grey to grey)
};
// the annex on the door's side: x ±hw, from inside the tower to its front face (z1); its walls' top under the lean-to
export const LH_ANNEX = { hw: 1.45, z0: 1.9, z1: 3.15, top: 3.9 };
// the steps down from the doorstep (top 0.15, to z 3.3) to the path at about −1.1 (tops relative to the tower's foot)
export const LH_STEP_W = 2.1;
export const LH_STEPS = [{ z0: 3.3, z1: 3.75, top: -0.1 }, { z0: 3.75, z1: 4.2, top: -0.36 }, { z0: 4.2, z1: 4.65, top: -0.61 }, { z0: 4.65, z1: 5.1, top: -0.87 }];   // (treads 0.45: his 0.45 m body never meets two risers at once)
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

// the outline of a square with its corners cut: 8 points (x, z) round the axis; the faces between them are alternately
// a main face (+x, +z, −x, −z: even i) and a cut corner (odd i)
function octPts(hw, ch) {
  const a = hw - ch;
  return [[hw, -a], [hw, a], [a, hw], [-a, hw], [-hw, a], [-hw, -a], [-a, -hw], [a, -hw]];
}
// the upright faces of that outline from y0 to y1 (which: 'main' | 'corner' | 'all'), flat-shaded quads with world
// UVs (u along the perimeter, v up, 1 tile per `tile` m); with caps, its top and bottom too
function octRing(hw, ch, y0, y1, which = 'all', tile = 1.8, caps = false) {
  return cached(`lho${hw},${ch},${y0},${y1},${which},${tile},${caps}`, () => {
    const P = octPts(hw, ch), pos = [], nor = [], uv = [];
    let u0 = 0;
    for (let i = 0; i < 8; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % 8], L = Math.hypot(x1 - x0, z1 - z0);
      if (which === 'all' || (which === 'main') === (i % 2 === 0)) {
        let nx = (z1 - z0) / L, nz = -(x1 - x0) / L;
        if (nx * (x0 + x1) + nz * (z0 + z1) < 0) { nx = -nx; nz = -nz; }
        // A B C D round the quad; (B−A) × (D−A) = (−dz·dy, 0, dx·dy): wound to face (nx, nz)
        const A = [x0, y0, z0, u0, y0], B = [x1, y0, z1, u0 + L, y0], C = [x1, y1, z1, u0 + L, y1], D = [x0, y1, z0, u0, y1];
        const out = -(z1 - z0) * nx + (x1 - x0) * nz > 0;
        for (const v of out ? [A, B, C, A, C, D] : [A, C, B, A, D, C]) { pos.push(v[0], v[1], v[2]); nor.push(nx, 0, nz); uv.push(v[3] / tile, v[4] / tile); }
      }
      u0 += L;
    }
    if (caps) for (const [y, up] of [[y1, 1], [y0, -1]]) {
      for (let i = 0; i < 8; i++) {
        const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % 8];
        const tri = (z0 * x1 - x0 * z1 > 0) === (up > 0) ? [[0, 0], [x0, z0], [x1, z1]] : [[0, 0], [x1, z1], [x0, z0]];   // (y of P[i] × P[i+1])
        for (const [x, z] of tri) { pos.push(x, y, z); nor.push(0, up, 0); uv.push(x / tile, z / tile); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
}
// a flat shape (x across, y up) extruded `depth` toward +z, its UVs world-scaled (1 tile per `tile` m)
function slabShape(shape, depth, tile = 1.8) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}

/**
 * Builds the tower into `grp` (a group at the foot of the tower, +z the door side). `lampMat` is the lamp's own
 * material (world.js drives its glow, the beam and the light). Returns { topY, lampY, capY }: the gallery's level,
 * the lamp's middle and the cap's foot.
 */
export function buildLighthouse(grp, lampMat) {
  const topY = LH.H, { HW, CH } = LH;
  const plaster = tm('plasterWall', { vc: true, rough: 0.78 });
  const ashlar = tm('stone', { vc: true, rough: 0.86 });
  const rubble = tm('rubble', { vc: true });
  const wood = tm('wood', { vc: true, rough: 0.85 });
  const iron = pm('#ffffff', 0.5, { vertexColors: true, metalness: 0.5 });
  const BC = new Batch(grp, { cast: true }), BN = new Batch(grp, { cast: false });
  const white = (g) => tint(g, LH.WHITE), grey = (g, c = LH.GREY) => tint(g, c);
  const rb = (g, c = '#cfc5b0') => tint(g, c), wd = (g, c = '#7a5a3a') => tint(g, c), fe = (g, c = '#2c2f38') => tint(g, c);

  // ---- the footing: an octagon of rubble, its faces square to the tower's, a dressed rim on top
  const fa = LH.FOOT * Math.cos(Math.PI / 8), fch = fa - LH.FOOT * Math.sin(Math.PI / 8);   // (apothem 2.85; the corners on 3.08)
  BN.add(rb(octRing(fa, fch, -0.7, 0.18, 'all', 1.7)), rubble);
  BN.add(grey(octRing(fa + 0.02, fch + 0.008, 0.18, LH.DOOR_Y, 'all', 1.8, true), '#e6e3dc'), ashlar);

  // ---- the shaft: white faces, grey quoins on the cut corners (the corner faces, and blocks proud of them in
  //      alternate courses, long and short, as LBA2's dressed corners)
  const S0 = LH.DOOR_Y, S1 = 12.45;
  BC.add(white(octRing(HW, CH, S0, S1, 'main', 2.2)), plaster);
  BC.add(grey(octRing(HW, CH, S0, S1, 'corner', 1.8)), ashlar);
  // (a block on each cut corner every course, 6 cm proud; every other course a block on each main face beside it, so
  //  the corners read long and short up the tower)
  const cl = CH * Math.SQRT2, SP = octPts(HW, CH);
  for (let k = 0, y = S0 + 0.05; y + 0.42 < S1 - 0.05; k++, y += 0.46) {
    const c = k % 3 ? LH.GREY : '#e8e9ec';
    for (let q = 0; q < 4; q++) {
      const ang = Math.PI / 4 + q * Math.PI / 2, r = (HW - CH / 2) * Math.SQRT2 + 0.01;
      BN.add(grey(bx(cl + 0.02, 0.4, 0.1, 1.8), c), ashlar, Math.sin(ang) * r, y + 0.2, Math.cos(ang) * r, 0, ang, 0);
    }
    if (k % 2) continue;
    for (let i = 0; i < 8; i += 2) {
      const [x0, z0] = SP[i], [x1, z1] = SP[i + 1], L = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / L, tz = (z1 - z0) / L;
      const nx = Math.sign(x0 + x1) * Math.abs(tz), nz = Math.sign(z0 + z1) * Math.abs(tx), bw = 0.42;
      for (const [ex, ez, sg] of [[x0, z0, 1], [x1, z1, -1]]) BN.add(grey(bx(bw, 0.4, 0.08, 1.8), c), ashlar, ex + sg * tx * bw / 2 + nx * 0.03, y + 0.2, ez + sg * tz * bw / 2 + nz * 0.03, 0, Math.atan2(nx, nz), 0);
    }
  }
  // the string course over the white shaft, then the grey upper stage, corbelled out a little
  BC.add(grey(octRing(HW + 0.12, CH + 0.05, S1, S1 + 0.24, 'all', 1.8, true), '#ecebe6'), ashlar);
  const U0 = S1 + 0.24, U1 = 14.75;
  BC.add(grey(octRing(HW + 0.06, CH + 0.03, U0, U1, 'all', 1.8), '#d2d3d7'), ashlar);

  // ---- windows: small arched lights up the shaft, grey dressed frames round dark panes with a white cross (the door
  //      is the annex's, below)
  const win = (y, ang, w = 0.46, h = 0.86, face = HW) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(ang) * face, y, Math.cos(ang) * face), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), new THREE.Vector3(1, 1, 1));
    const add = (geo, mat, dx, dy2, dz2) => BN.addM(geo, mat, m.clone().multiply(new THREE.Matrix4().makeTranslation(dx, dy2, dz2)));
    add(grey(archFrame(w, h, 0.13, 0.12), '#e2e3e6'), ashlar, 0, 0, -0.02);
    add(fe(archSlab(w, h, 0.03), '#232834'), iron, 0, 0, 0.005);   // (5 mm off the wall: no face shared with it)
    add(wd(bx(0.035, h - 0.08, 0.03, 1), '#efe7d3'), wood, 0, h * 0.5, 0.04);
    add(wd(bx(w - 0.04, 0.035, 0.03, 1), '#efe7d3'), wood, 0, h * 0.42, 0.04);
    add(grey(bx(w + 0.34, 0.07, 0.16, 1), '#e2e3e6'), ashlar, 0, -0.04, 0.06);   // the sill
  };
  win(4.4, Math.PI / 2); win(6.9, -Math.PI / 2); win(9.2, Math.PI); win(9.8, 0); win(11.2, Math.PI / 2);
  win(13.2, 0, 0.56, 1.0, HW + 0.06); win(13.2, Math.PI, 0.56, 1.0, HW + 0.06);   // (the upper stage's)

  // ---- the gallery: a corbel course, the floor slab, an iron railing round its edge
  BC.add(grey(octRing(HW + 0.3, CH + 0.12, U1, U1 + 0.26, 'all', 1.8, true), '#e6e3dc'), ashlar);   // (its top inside the slab: no two faces in one plane)
  BC.add(grey(octRing(HW + 0.42, CH + 0.17, U1 + 0.24, topY, 'all', 1.8, true), '#eeece6'), ashlar);
  for (let q = 0; q < 4; q++) for (const s of [-1, 1]) {   // corbel blocks under the course, two per face
    const ang = q * Math.PI / 2, r = HW + 0.14, off = s * 0.85;
    BN.add(grey(bx(0.24, 0.3, 0.2, 1)), ashlar, Math.sin(ang) * r + Math.cos(ang) * off, U1 - 0.12, Math.cos(ang) * r - Math.sin(ang) * off, 0, ang, 0);
  }
  const RP = octPts(HW + 0.3, CH + 0.12), rail = '#3b5a5c';   // (LBA2's railing reads dark teal)
  for (let i = 0; i < 8; i++) {
    const [x0, z0] = RP[i], [x1, z1] = RP[(i + 1) % 8], L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
    BN.add(fe(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 5), rail), iron, x0, topY + 0.47, z0);
    for (const [y, t] of [[0.92, 0.05], [0.5, 0.03]]) BN.add(fe(bx(t, t, L, 1), rail), iron, (x0 + x1) / 2, topY + y, (z0 + z1) / 2, 0, ry, 0);
    if (L > 1.5) BN.add(fe(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 5), rail), iron, (x0 + x1) / 2, topY + 0.45, (z0 + z1) / 2);
  }

  // ---- the lantern: an octagonal stone base, the glazing (the lamp's own material, glowing when lit) in a wooden
  //      frame of posts and rails, a cornice, the domed grey cap with a finial and a rod
  const lampR = 1.18, glazeY0 = topY + 0.42, glazeH = 1.5;
  BC.add(grey(octRing(lampR + 0.14, (lampR + 0.14) * 0.586, topY - 0.02, glazeY0 + 0.02, 'all', 1.8, true), '#e6e3dc'), ashlar);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(lampR, lampR, glazeH, 8).rotateY(Math.PI / 8), lampMat);
  lamp.position.y = glazeY0 + glazeH / 2; lamp.castShadow = false; grp.add(lamp);
  const LP = octPts(lampR + 0.02, (lampR + 0.02) * 0.586), frame = '#5a4632';
  for (let i = 0; i < 8; i++) {
    const [x0, z0] = LP[i], [x1, z1] = LP[(i + 1) % 8], L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
    BN.add(wd(bx(0.08, glazeH, 0.08, 1), frame), wood, x0, glazeY0 + glazeH / 2, z0, 0, ry, 0);
    for (const y of [0.04, 0.55, glazeH - 0.04]) BN.add(wd(bx(0.06, 0.07, L, 1), frame), wood, (x0 + x1) / 2, glazeY0 + y, (z0 + z1) / 2, 0, ry, 0);
  }
  const capY = glazeY0 + glazeH;
  BC.add(grey(octRing(lampR + 0.3, (lampR + 0.3) * 0.586, capY - 0.02, capY + 0.16, 'all', 1.8, true), '#c8c9cd'), ashlar);
  BC.add(grey(lathe([[lampR + 0.42, 0], [lampR + 0.44, 0.07], [lampR + 0.25, 0.2], [lampR + 0.02, 0.42], [lampR - 0.12, 0.72], [0.86, 1.02], [0.55, 1.26], [0.22, 1.4], [0, 1.43]], 16, 1.4), LH.GREY_D), ashlar, 0, capY + 0.14, 0);
  BN.add(fe(new THREE.SphereGeometry(0.14, 8, 6), '#d6b45a'), iron, 0, capY + 1.66, 0);
  BN.add(fe(new THREE.CylinderGeometry(0.012, 0.03, 0.75, 5), '#46505e'), iron, 0, capY + 2.0, 0);   // the lightning rod

  // ---- the annex: low stone walls against the door's face, a lean-to of boards over them, the door in its front
  const A = LH_ANNEX, dw = 1.1, dh = 2.3, dy = LH.DOOR_Y, T = 0.3;
  const roofAt = (z) => 3.86 - (z - 1.9) * (0.92 / 1.6);   // the lean-to's top over z (3.86 at the tower, 2.94 at 3.5)
  {
    const s = new THREE.Shape();   // the front wall: x across, y up, the arched doorway through it
    const fw = A.hw - T;   // (between the side walls, which run to the front: no faces overlapping at the corners)
    s.moveTo(-fw, -0.3); s.lineTo(fw, -0.3); s.lineTo(fw, roofAt(A.z1) - 0.1); s.lineTo(-fw, roofAt(A.z1) - 0.1); s.lineTo(-fw, -0.3);
    const p = new THREE.Path(), x = dw / 2 + 0.02;   // (2 cm wider than the surround's opening: their reveals never share a plane)
    p.moveTo(-x, dy); p.lineTo(x, dy); p.lineTo(x, dy + dh - dw / 2); p.absarc(0, dy + dh - dw / 2, x, 0, Math.PI, false); p.lineTo(-x, dy);
    s.holes.push(p);
    BC.add(grey(slabShape(s, T), '#d0d1d5'), ashlar, 0, 0, A.z1 - T);
    // the side walls: their top follows the lean-to
    const sd = new THREE.Shape();
    sd.moveTo(A.z0, -0.3); sd.lineTo(A.z1, -0.3); sd.lineTo(A.z1, roofAt(A.z1) - 0.1); sd.lineTo(A.z0, roofAt(A.z0) - 0.1); sd.lineTo(A.z0, -0.3);
    const side = slabShape(sd, T).rotateY(-Math.PI / 2);   // (shape x → z; its depth → −x)
    BC.add(grey(side, '#d0d1d5'), ashlar, A.hw, 0, 0);
    BC.add(grey(side, '#d0d1d5'), ashlar, -A.hw + T, 0, 0);
    // the door leaf, recessed (the doorway's sill is the wall's own stone, at the footing's level)
    BN.add(wd(archSlab(dw, dh - 0.005, 0.08), '#6e4a2c'), wood, 0, dy + 0.005, A.z1 - T + 0.1);
    for (const y of [0.5, 1.55]) BN.add(fe(bx(dw * 0.86, 0.09, 0.03, 1)), iron, 0, dy + y, A.z1 - T + 0.195);   // straps
    BN.add(fe(new THREE.TorusGeometry(0.09, 0.02, 6, 12)), iron, dw * 0.28, dy + 1.05, A.z1 - T + 0.21);
    // the surround standing proud of the front, its keystone
    BN.add(grey(archFrame(dw, dh + 0.17, 0.18, 0.09), '#eceae4'), ashlar, 0, dy - 0.17, A.z1 - 0.02);   // (its back sunk in the wall, its feet in the step)
    BN.add(grey(bx(0.32, 0.26, 0.12, 1), '#f2f0ea'), ashlar, 0, dy + dh + 0.1, A.z1 + 0.05);
    // the lean-to: a slab of boards, dark battens down it, an end board at the eaves
    const zr0 = 1.9, zr1 = 3.5, ang = Math.atan2(0.92, 1.6), L = Math.hypot(1.6, 0.92), zm = (zr0 + zr1) / 2, ym = (roofAt(zr0) + roofAt(zr1)) / 2 - 0.07;
    BN.add(wd(bx(A.hw * 2 + 0.36, 0.14, L, 1.6), '#7a5236'), wood, 0, ym, zm, ang, 0, 0);   // (no shadow: one mesh fewer)
    for (let i = -3; i <= 3; i++) BN.add(wd(bx(0.07, 0.05, L, 1), '#4e3420'), wood, i * 0.5, ym + 0.085, zm, ang, 0, 0);
    BN.add(wd(bx(A.hw * 2 + 0.4, 0.2, 0.08, 1), '#5e4028'), wood, 0, roofAt(zr1) - 0.12, zr1 + 0.02);
    // a lantern on a bracket beside the door
    BN.add(fe(bx(0.05, 0.05, 0.36, 1)), iron, 1.05, dy + 2.25, A.z1 + 0.18);
    BN.add(fe(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 8)), iron, 1.05, dy + 2.1, A.z1 + 0.34);
  }
  // the step before the door, to z 3.3 (he stands >= 3.5 from the axis), and the flight down to the path
  // (USER-ASKS 3, "a door in the air": the headland falls ~1.1 m in front of the door; world.js gives each its collider)
  BN.add(rb(bx(dw + 1.0, 0.4, 0.55, 1)), rubble, 0, -0.05, 3.02);
  for (const S of LH_STEPS) BN.add(rb(bx(LH_STEP_W, S.top + 1.5, S.z1 - S.z0, 1)), rubble, 0, S.top - (S.top + 1.5) / 2, (S.z0 + S.z1) / 2);

  BC.build(); BN.build();
  return { topY, lampY: glazeY0 + glazeH / 2, capY };
}
