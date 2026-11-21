// WA-15b (the user's decision D2 of 28.10, EXPANSION_ART_DECISIONS.md: "here and there a newer building on the
// promenade/waterfront that looks more like Zeelich"; on the first pictures, 1.11: "what do these buildings give? they
// feel disconnected" → one building with a purpose): the Esmer trading house on Citadel's harbour front, where the
// Zeelich goods landed on the quay go after Odile's customs. On the shore south of the harbour path, between the quay
// and the baggage claim (in LBA2: the open harbour square before the ticket office), not in the old core.
// Zeelich's own building language (LBA2's Otringal: a band of blue tiles at the foot, pale plaster, an eight-sided pale
// turquoise dome with a gold band and finial), drawn by props-esmer.js esmerBuilding with the islands' own materials;
// at its door Zeelich cargo crates, a plain crate pair, glazed jars, a lamp and the Zeelich flag. One batch (a draw call
// per material). Every route, door, container and story spot stays clear (the laptop's Test Lab probe, WA-15b).
//
// CONTRACT
//   ZH                          the building: { id, x, z, ry, w, d, h, wallH } (+z of its own frame is its front)
//   zhClear(x, z, pad)          true inside its footprint and the goods before its door, grown by pad: trees, bushes,
//                               grass and flowers are filtered out there after the scatter (world.js)
//   buildHarbourZeelich(scene, physics, H)   the building, the goods at its door, their colliders
import * as THREE from 'three';
import { tm, Batch } from './kit.js';
import { Place, esmerBuilding, cm, crateStack, jars, lamp, flagPole } from './props-esmer.js';
import { domeTex } from './zeelich.js';

export const ZH = [{ id: 'zh-trading', x: -83.5, z: 47.2, ry: Math.PI, w: 5.6, d: 4.8, h: 6.4, wallH: 3.7 }];
// (the goods at the door stand within 3.6 m in front of the house: its clear zone reaches that far toward the path)
const FRONT = 3.6;
export function zhClear(x, z, pad = 0) {
  return ZH.some((b) => {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.ry), s = Math.sin(b.ry);
    const lx = c * dx - s * dz, lz = s * dx + c * dz;   // (into the building's own frame: Place.pt inverted)
    return Math.abs(lx) < b.w / 2 + 1.0 + pad && lz > -b.d / 2 - pad && lz < b.d / 2 + FRONT + pad;
  });
}

export function buildHarbourZeelich(scene, physics, H) {
  const group = new THREE.Group(); group.name = 'harbour-zeelich'; scene.add(group);
  const B = new Batch(group);
  // the islands' own materials (zislands.js): Otringal's pale plaster and the turquoise dome
  const wall = tm('plasterWall', { color: '#fbf0f0', rough: 0.95 });
  const dome = cm(domeTex('#2f8a9a', '#a8e8ee'), { rough: 0.4 });
  for (const b of ZH) {
    const y = Math.min(H(b.x - b.w / 2, b.z - b.d / 2), H(b.x + b.w / 2, b.z - b.d / 2), H(b.x - b.w / 2, b.z + b.d / 2), H(b.x + b.w / 2, b.z + b.d / 2));
    const P = new Place(B, b.x, y, b.z, b.ry);
    esmerBuilding(P, { w: b.w, d: b.d, h: b.h, wallH: b.wallH, wall, domeM: dome, trim: '#2f8a9a', accent: '#e8b84a', seed: 41, role: 'store', awning: ['#2f8a9a', '#f8eee4'] });
    physics.add({ type: 'box', x: b.x, z: b.z, hw: b.w / 2 - 0.05, hd: b.d / 2 - 0.05, rot: b.ry, top: y + b.h, noStand: true });
    // the goods at its door (building-local: +z is the front, toward the path): Zeelich cargo crates fresh off the quay,
    // a plain crate pair, glazed jars, a lamp, the Zeelich flag at the corner; their colliders as the islands add them
    const at = (lx, lz) => { const [x, z] = P.pt(lx, lz); return new Place(B, x, H(x, z), z, b.ry); };
    const goods = [crateStack(at(-2.4, b.d / 2 + 0.9), { seed: 3, kind: 'cargo', n: 4 }), crateStack(at(-3.1, b.d / 2 + 2.0), { seed: 5, kind: 'wood', n: 2 }),
      jars(at(2.1, b.d / 2 + 0.7), { n: 4, seed: 2 }), lamp(at(-3.2, -0.8)), flagPole(at(3.3, -1.6), { h: 5.2, colors: ['#2f8a9a', '#f0c040', '#f4eee0'] })];
    for (const Q of goods) for (const c of Q.cols) physics.add(c);
  }
  B.build();
  return group;
}
