// OREN-GUARDIAN (EXPANSION_PLAN.md Revision R1.3): Oren's presence, and the Balance Works governor he speaks through.
//
// Oren is not a body. Where a part fired from Ballastra's terrace clay is joined to the bore by the project's pipes
// (R1.4 rules 1-2), he rises out of it as four glazed rings stacked a hand apart, widest at the bottom, each with a
// gap, turning slowly at its own rate, and one bronze bead travelling round them. When he speaks the rings stop with
// their gaps in line toward the listener and the bead stops at the front (attention); refusing (later chapters) they
// lock with a soft clack. Celadon glaze, bronze, one low amber light in the bead. Not Sendell's cyan light in stone.
//
// Cost: five meshes on two shared materials (the rings' glaze, the bead), no lights, no transparency, no particles;
// the caller adds it to one room's group, so it is drawn only there. The governor: five meshes (a flange, the glazed
// body, a bronze band, a cap, the maker's plate) on four shared materials.
//
// CONTRACT
//   buildOrenPresence() → { group, set(shown 0..1), setMode('turning'|'attending'|'locked'), update(dt, facing) }
//     group: origin at the bottom ring's centre; ≈0.9 m wide, ≈0.75 m tall at full size. `shown` 0 is hidden; the rise
//     scales it up out of the part below. `facing` (radians round y, in the group's parent frame) is where the gaps
//     and the bead turn to while attending.
//   buildGovernor() → THREE.Group (≈0.55 m wide, 1.25 m tall from its foot; the presence sits on its cap: GOV_TOP)
import * as THREE from 'three';
import { cyl, lathe, plane, sphere, canvasTex } from './props.js';

export const GOV_TOP = 1.25;
const RINGS = [{ r: 0.42, y: 0, w: 0.22 }, { r: 0.34, y: 0.24, w: -0.31 }, { r: 0.27, y: 0.46, w: 0.38 }, { r: 0.21, y: 0.66, w: -0.27 }];
const GAP = Math.PI * 0.16;   // each ring is open by this much: the gap is what shows it turning
let M = null;
const mats = () => (M ??= {
  glaze: new THREE.MeshStandardMaterial({ color: '#9cc8b4', roughness: 0.3, metalness: 0.05 }),
  bead: new THREE.MeshStandardMaterial({ color: '#e0a648', emissive: '#e0a648', emissiveIntensity: 0.9, roughness: 0.4 }),
  bronze: new THREE.MeshStandardMaterial({ color: '#b07a3a', roughness: 0.42, metalness: 0.6 }),
});
let RING_GEO = null;
// one geometry per ring size, lying flat (the ring's plane is xz), its gap centred on +z
const ringGeo = (r) => {
  RING_GEO ??= new Map();
  if (!RING_GEO.has(r)) {
    const g = new THREE.TorusGeometry(r, 0.034, 6, 28, Math.PI * 2 - GAP);
    g.rotateZ(Math.PI / 2 + GAP / 2);   // (the arc starts at +x; turned so the opening faces +y before the flat turn)
    g.rotateX(Math.PI / 2);             // flat; the opening now faces +z
    RING_GEO.set(r, g);
  }
  return RING_GEO.get(r);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function buildOrenPresence() {
  const m = mats();
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const rings = RINGS.map((d) => {
    const piv = new THREE.Group(); piv.position.y = d.y;
    const mesh = new THREE.Mesh(ringGeo(d.r), m.glaze); mesh.castShadow = false;
    piv.add(mesh); body.add(piv);
    return { ...d, piv, a: Math.random() * Math.PI * 2 };
  });
  const bead = new THREE.Mesh(sphere(0.05, 10, 8), m.bead); body.add(bead);
  let shown = 0, mode = 'turning', u = 0, clack = 0;
  const api = {
    group, rings, bead,
    get shown() { return shown; },
    get mode() { return mode; },
    set(s) { shown = Math.max(0, Math.min(1, s)); group.visible = shown > 0.001; const k = 0.25 + 0.75 * shown; body.scale.setScalar(k); body.position.y = -0.55 * (1 - shown); },
    setMode(md) { if (md === 'locked' && mode !== 'locked') clack = 0.25; mode = md; },
    // (dt in s; facing: the angle the gaps turn to while attending)
    update(dt, facing = 0) {
      if (!group.visible) return;
      const att = mode !== 'turning';
      for (const r of rings) {
        if (mode === 'locked') { /* held where they stopped */ }
        else if (att) r.a += wrap(facing - r.a) * Math.min(1, dt * 2.2);   // ease round into line
        else r.a += r.w * dt;
        r.piv.rotation.y = r.a;
      }
      // the bead: a slow climb round the rings while turning; at the front of the top ring while attending
      if (att) {
        const top = rings[rings.length - 1];
        bead.position.set(Math.sin(facing) * top.r, top.y + 0.035, Math.cos(facing) * top.r);
      } else {
        u = (u + dt * 0.12) % 1;
        const f = u * rings.length, i = Math.min(rings.length - 1, Math.floor(f)), r = rings[i], th = r.a + Math.PI + (f - i) * Math.PI * 2;
        bead.position.set(Math.sin(th) * r.r, r.y + 0.035, Math.cos(th) * r.r);
      }
      if (clack > 0) { clack -= dt; body.position.x = Math.sin(clack * 80) * 0.004; } else body.position.x = 0;
    },
  };
  api.set(0);
  return api;
}

let PLATE = null;
export function buildGovernor() {
  const m = mats(), g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = false; g.add(o); return o; };   // (only the body casts: it carries the silhouette)
  add(cyl(0.2, 0.24, 0.12, 14), m.bronze, 0, 0.06, 0);                                     // the flange on the inlet
  add(lathe([[0.12, 0], [0.2, 0.08], [0.27, 0.32], [0.28, 0.55], [0.22, 0.82], [0.13, 0.98], [0.1, 1.1]], 18), m.glaze, 0, 0.12, 0).castShadow = true;   // the glazed body
  add(cyl(0.285, 0.285, 0.06, 18), m.bronze, 0, 0.66, 0);                                  // the bronze band
  add(cyl(0.16, 0.11, 0.08, 14), m.bronze, 0, 1.2, 0);                                     // the cap
  PLATE ??= new THREE.MeshStandardMaterial({ map: canvasTex(256, 96, (x, w, h) => {
    x.fillStyle = '#b8873e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a14'; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10);
    x.fillStyle = '#3a2410'; x.textAlign = 'center'; x.font = 'bold 30px serif'; x.fillText('BALANCE WORKS', w / 2, 44); x.font = 'bold 20px serif'; x.fillText('BALLASTRA', w / 2, 74);
  }), roughness: 0.45, metalness: 0.5 });
  add(plane(0.3, 0.11), PLATE, 0, 0.46, 0.283);                                             // the maker's plate, on the front
  return g;
}
