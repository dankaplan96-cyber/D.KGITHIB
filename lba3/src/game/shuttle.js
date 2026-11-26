// The Esmers' shuttles, after LBA2's (bodies 70–78, numbers only): a round craft about 4 m tall and 7 m across —
// a red base with a pale band, a gold upper hull, a blue glass canopy on top and a short fin, four landing legs
// with wide pads. Twelve years on they are Zeelich's ordinary traffic: cargo and officials between the worlds
// ("their shuttles come and go through Bald Mountain"), and the project's own.
//   esmerShuttle({ landed })  a Group (origin on the ground, front +z); landed: legs down, else legs tucked and a glow under it
//   shuttleTraffic(parent, updaters, { cx, cz, y, r, n, speed })  saucers circling high over a region
import * as THREE from 'three';
import { MAT, lathe, cyl, sphere, rbox } from './props.js';

const H = 3.2, R = 3.4;   // (hull above the legs; legs add 0.24 of the full height)   // height and half-width (the original's 1.94 H tall, 1.67 H wide, H = Twinsen's 2.1 m)

export function esmerShuttle({ landed = true, scale = 1 } = {}) {
  const g = new THREE.Group(); g.name = 'esmerShuttle';
  const red = MAT.paint('#b82a24', 0.45), gold = MAT.paint('#e8b04a', 0.4), band = MAT.paint('#f2dcae', 0.5), grey = MAT.paint('#8a8a90', 0.5), glass = MAT.glow('#5ab0e0', '#1a5a8a', 0.5);
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const y0 = landed ? H * 0.24 : H * 0.12;
  // the hull: an octagonal lathe in three colours (red base, pale band, gold upper)
  // (the original's sections: red base to 0.5 H, a pale band, the gold upper hull to 0.85 H, a small blue canopy)
  add(lathe([[0.001, 0], [R * 0.6, 0], [R * 0.9, H * 0.12], [R, H * 0.22], [R * 0.99, H * 0.26]], 8), red, 0, y0, 0);
  add(lathe([[R * 0.99, 0], [R * 0.97, H * 0.05], [R * 0.001, H * 0.05]], 8), band, 0, y0 + H * 0.26, 0);
  add(lathe([[R * 0.96, 0], [R * 0.88, H * 0.12], [R * 0.66, H * 0.26], [R * 0.42, H * 0.33], [0.001, H * 0.33]], 8), gold, 0, y0 + H * 0.31, 0);
  // the canopy and the fin
  add(lathe([[R * 0.44, 0], [R * 0.38, H * 0.08], [R * 0.22, H * 0.15], [0.001, H * 0.16]], 8), glass, 0, y0 + H * 0.62, 0);
  const fin = add(rbox(0.12, H * 0.3, R * 0.5, 0.02), grey, 0, y0 + H * 0.7, -R * 0.55);
  fin.rotation.x = -0.35;
  // running lights round the rim
  const lamp = MAT.glow('#fff2c0', '#ffb040', 1.8);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; add(sphere(0.12, 8, 6), lamp, Math.sin(a) * R * 1.0, y0 + H * 0.285, Math.cos(a) * R * 1.0); }
  // legs: four struts with wide pads (landed), or tucked under the hull and a glow beneath (flying)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, lx = Math.sin(a) * R * 0.6, lz = Math.cos(a) * R * 0.6;
    if (landed) {
      add(cyl(0.12, 0.16, y0, 8), grey, lx, y0 / 2, lz);
      add(cyl(0.6, 0.7, 0.12, 8), MAT.paint('#e88a64', 0.5), lx * 1.12, 0.06, lz * 1.12);
    } else add(cyl(0.16, 0.16, 0.25, 8), grey, lx, y0 - 0.1, lz);
  }
  if (!landed) {
    const glow = new THREE.Mesh(new THREE.CircleGeometry(R * 0.55, 16), new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = Math.PI / 2; glow.position.y = y0 - 0.05; g.add(glow);
  }
  g.scale.setScalar(scale);
  return g;
}

// a few saucers circling high over a region, each on its own ellipse, banking and bobbing
export function shuttleTraffic(parent, updaters, { cx = 0, cz = 0, y = 34, r = 90, n = 2, speed = 0.05, scale = 1 } = {}) {
  const ships = [];
  for (let i = 0; i < n; i++) {
    const s = esmerShuttle({ landed: false, scale });
    parent.add(s);
    ships.push({ s, ph: (i / n) * Math.PI * 2, rx: r * (0.8 + 0.25 * i), rz: r * (0.6 + 0.2 * ((i + 1) % 2)), y: y + i * 6, k: speed * (i % 2 ? -1 : 1) * (1 + i * 0.15) });
  }
  updaters.push((dt, t) => {
    for (const p of ships) {
      const a = p.ph + t * p.k;
      const x = cx + Math.cos(a) * p.rx, z = cz + Math.sin(a) * p.rz;
      const nx = cx + Math.cos(a + 0.01 * Math.sign(p.k)) * p.rx, nz = cz + Math.sin(a + 0.01 * Math.sign(p.k)) * p.rz;
      p.s.position.set(x, p.y + Math.sin(t * 0.7 + p.ph) * 1.2, z);
      p.s.rotation.y = Math.atan2(nx - x, nz - z);
      p.s.rotation.z = -0.12 * Math.sign(p.k);
    }
  });
  return ships.map((p) => p.s);
}
