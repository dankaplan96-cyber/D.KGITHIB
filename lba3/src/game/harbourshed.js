// The harbour master's shed on the quay (I-3, from AUDIT-CH12 #9): plank walls on a rubble plinth, a framed door with a
// brace and a step, a small shuttered window on each long wall, a blue roof with an overhang, a ridge cap and a
// fascia, with a rain barrel and two crates against the front. It replaces the plain box and slab the prologue
// set here, on the same footprint (2.6 x 2.0 m, the collider unchanged).
// Built from the town's kit (kit.js Batch): one mesh per material, four in all (planks, roof, rubble, plain), and
// only the walls and the roof cast a shadow.
import * as THREE from 'three';
import { Batch, tm, pm, bbox, boxUV, tint, cached, cyl } from './kit.js';

const bx = (w, h, d, tile = 1) => cached(`shb${w},${h},${d},${tile}`, () => boxUV(new THREE.BoxGeometry(w, h, d), tile));   // a plain box with world-scaled UVs (the kit's bevelled bbox costs ~10x the triangles; the trims are small)
export const SHED = { w: 2.0, d: 2.6, h: 2.15, pitch: 0.5, overhang: 0.3, T: 0.12 };

function panel(len, h, T, gable, holes) {   // a wall in its own XY plane, x along the wall, extruded toward +z by T
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h);
  if (gable) s.lineTo(0, h + gable);
  s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path(), x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = o.y, y1 = o.y + o.h;
    p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.lineTo(x0, y0);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 1.6);
  return g;
}

/**
 * Builds the shed into `parent`, its foot (ground level) at the group's origin, the door on local +z.
 * Returns { group, door: {x, z} local (the spot in front of the door), crates: [{x, z, s}] and a barrel, all local }.
 */
export function buildHarbourShed(parent, ry = 0) {
  const { w, d, h, pitch, overhang, T } = SHED;
  const g = new THREE.Group(); g.rotation.y = ry; parent.add(g);
  const planks = tm('planks', { vc: true, rough: 0.9 });
  const roofM = tm('roofBlue', { vc: true, rough: 0.8 });
  const stone = tm('rubble', { vc: true });
  const plain = pm('#ffffff', 0.55, { vertexColors: true, metalness: 0.15 });
  const BC = new Batch(g, { cast: true }), BN = new Batch(g, { cast: false });
  const WALL = '#f6ecd2', TRIM = '#f1e6c9', DOORC = '#8a5e36', TEAL = '#2a8a7a', IRON = '#2c2f38';
  const gableH = (w / 2) * pitch;

  // ---- plinth (also the floor behind the openings), and a rubble step before the door
  BN.add(tint(bx(w + 0.12, 0.38, d + 0.12, 1.4), '#bdb2a0'), stone, 0, 0.04, 0);
  BN.add(tint(bx(1.5, 0.2, 0.55, 1.4), '#cfc5b0'), stone, 0, 0.0, d / 2 + 0.3);

  // ---- walls: front (door), back, left and right (a window each), each a panel with real thickness
  const y0 = 0.15, wh = h - y0;
  const door = { x: 0, y: 0.22 - y0, w: 0.88, h: 1.78 }, winL = { x: 0.45, y: 0.95 - y0, w: 0.6, h: 0.55 }, winR = { x: -0.2, y: 0.95 - y0, w: 0.5, h: 0.5 };
  const sides = [
    { holes: [door], len: w, pos: [0, y0, d / 2 - T], ry: 0, gable: gableH },
    { holes: [], len: w, pos: [0, y0, -d / 2 + T], ry: Math.PI, gable: gableH },
    { holes: [winL], len: d - 2 * T + 0.002, pos: [-w / 2 + T, y0, 0], ry: -Math.PI / 2, gable: 0 },
    { holes: [winR], len: d - 2 * T + 0.002, pos: [w / 2 - T, y0, 0], ry: Math.PI / 2, gable: 0 },
  ];
  for (const sd of sides) BC.add(tint(panel(sd.len, wh, T, sd.gable, sd.holes), WALL), planks, sd.pos[0], sd.pos[1], sd.pos[2], 0, sd.ry, 0);
  // corner posts, proud of the boards, and a sill board at the foot
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) BN.add(tint(bx(0.14, h - 0.1, 0.14, 1), '#7a5a3a'), planks, cx * (w / 2 - 0.02), 0.1 + (h - 0.1) / 2, cz * (d / 2 - 0.02));
  for (const sz of [-1, 1]) BN.add(tint(bx(w + 0.06, 0.16, 0.1, 1), '#7a5a3a'), planks, 0, h - 0.06, sz * (d / 2 + 0.01));   // eave beams

  // ---- the door: a frame, a leaf set in it with a brace, a ring handle
  const fz = d / 2 + 0.01;
  for (const [x, y, ww, hh] of [[0, door.y + y0 + door.h + 0.06, door.w + 0.28, 0.12], [-door.w / 2 - 0.07, y0 + door.y + door.h / 2, 0.14, door.h], [door.w / 2 + 0.07, y0 + door.y + door.h / 2, 0.14, door.h]]) BN.add(tint(bx(ww, hh, 0.08, 1), TRIM), planks, x, y, fz);
  BN.add(tint(bx(door.w, door.h, 0.05, 1), DOORC), planks, 0, y0 + door.y + door.h / 2, d / 2 - 0.05);
  for (const y of [0.4, 1.4]) BN.add(tint(bx(door.w - 0.1, 0.1, 0.03, 1), '#a67c4a'), planks, 0, y0 + door.y + y, d / 2 - 0.02);
  BN.add(tint(bx(0.1, 1.45, 0.03, 1), '#a67c4a'), planks, 0, y0 + door.y + 0.9, d / 2 - 0.018, 0, 0, 0.62);   // the brace
  BN.add(tint(new THREE.TorusGeometry(0.06, 0.014, 6, 12), '#d6b45a'), plain, 0.27, y0 + door.y + 0.95, d / 2 + 0.02);
  BN.add(tint(bx(door.w + 0.2, 0.06, 0.1, 1), '#e2d9c4'), stone, 0, 0.215, d / 2 + 0.05);   // the threshold

  // ---- the windows: a dark pane with a cross, a frame, a sill, and a shutter hung open beside it
  const win = (o, side) => {   // side: the sides[] index; positions in that wall's panel frame, mapped to the group
    const sd = sides[side], c = Math.cos(sd.ry), s = Math.sin(sd.ry);
    const at = (lx, ly, lz) => [sd.pos[0] + c * lx + s * lz, sd.pos[1] + ly, sd.pos[2] - s * lx + c * lz];
    const put = (geo, mat, lx, ly, lz) => BN.add(geo, mat, ...at(lx, ly, lz), 0, sd.ry, 0);
    put(tint(bx(o.w, o.h, 0.03, 1), '#1d2733'), plain, o.x, o.y + o.h / 2, T - 0.04);
    put(tint(bx(0.035, o.h, 0.04, 1), TRIM), planks, o.x, o.y + o.h / 2, T - 0.02);
    put(tint(bx(o.w, 0.035, 0.04, 1), TRIM), planks, o.x, o.y + o.h * 0.5, T - 0.02);
    for (const [x, y, ww, hh] of [[o.x, o.y + o.h + 0.04, o.w + 0.16, 0.08], [o.x, o.y - 0.04, o.w + 0.2, 0.08], [o.x - o.w / 2 - 0.04, o.y + o.h / 2, 0.08, o.h], [o.x + o.w / 2 + 0.04, o.y + o.h / 2, 0.08, o.h]]) put(tint(bx(ww, hh, 0.07, 1), TRIM), planks, x, y, T + 0.01);
    put(tint(bx(o.w / 2 - 0.02, o.h + 0.06, 0.04, 1), TEAL), plain, o.x + o.w / 2 + 0.08 + o.w / 4, o.y + o.h / 2, T + 0.03);   // the shutter, open against the boards
  };
  win(winL, 2); win(winR, 3);
  // a little round vent in each gable
  for (const sz of [-1, 1]) BN.add(tint(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12).rotateX(Math.PI / 2), '#1d2733'), plain, 0, h + gableH * 0.35, sz * (d / 2 + 0.005));

  // ---- the roof: two thick slabs with overhang, a fascia along each eave, a ridge cap
  const half = w / 2 + overhang, slope = Math.hypot(half, half * pitch), ang = Math.atan(pitch), len = d + overhang * 1.6;
  for (const sx of [-1, 1]) {
    BC.add(tint(bx(slope, 0.11, len, 1.6), '#ffffff'), roofM, sx * (slope / 2) * Math.cos(ang), h + gableH + 0.0 - (slope / 2) * Math.sin(ang) - 0.05, 0, 0, 0, sx * -ang);
    BN.add(tint(bx(0.05, 0.16, len + 0.02, 1), '#7a5a3a'), planks, sx * (half - 0.02), h + gableH - half * pitch - 0.08, 0);   // fascia
  }
  BN.add(tint(bx(0.2, 0.12, len + 0.04, 1), '#d8e4f2'), roofM, 0, h + gableH + 0.02, 0);

  // ---- a rain barrel at the front corner and two crates against the wall (the local frame of the door side)
  const barrel = { x: 1.33, z: 0.9, r: 0.3 };
  BN.add(tint(cyl(0.3, 0.27, 0.78, 14, 0.8), '#8a6a44'), planks, barrel.x, 0.39, barrel.z);
  for (const y of [0.15, 0.6]) BN.add(tint(cyl(0.305, 0.29, 0.04, 14, 0), IRON), plain, barrel.x, y, barrel.z);
  const crates = [{ x: 1.05, z: d / 2 + 0.34, s: 0.62, y: 0 }, { x: 1.05, z: d / 2 + 0.36, s: 0.5, y: 0.62 }, { x: 1.72, z: d / 2 + 0.3, s: 0.5, y: 0 }];
  crates.forEach((c, i) => {
    BN.add(tint(bbox(c.s, c.s, c.s, 0.03, 0.8), i % 2 ? '#a07a50' : '#b48a58'), planks, c.x, c.y + c.s / 2, c.z, 0, 0.12 * (i - 1), 0);
    BN.add(tint(bx(c.s + 0.02, 0.05, c.s + 0.02, 1), '#5a3e24'), planks, c.x, c.y + c.s / 2, c.z, 0, 0.12 * (i - 1), 0);
  });

  BC.build(); BN.build();
  return { group: g, barrel, crates, door: { x: 0, z: d / 2 + 0.9 } };
}
