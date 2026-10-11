// Zeelich — the terminal island above the clouds (chapter 2). An outdoor region: a room flagged `outdoor`,
// shown with the LBA exterior camera and its own sky (Environment.setRegion), far from Citadel in the same
// scene. Walkable ground is physics bricks only: past the island's edge there is no floor (the terrain there
// is open sea, which actors may not enter), so nobody walks off into the clouds.
//
// CONTRACT used by src/game/story/chapter2.js (keep these names and meanings when rebuilding the art):
//   R.dock {x,z,a}            where the ferry ties up; R.ferry {group, x, z, setVisible(b)}
//   R.street {x,z}            Esmer street centre; R.npcSpots {esmer1, esmer2, esmer3, baldinoOut, doran, vesk, guard} {x,z,a}
//   R.workshopDoor {x,z}      door into Baldino's workshop (interior room 'workshop')
//   R.mills [{id, x, z, brake:{x,y,z}, spinning, setSpinning(b)}]  three wind-mills, a ball target (brake) each
//   R.millTop {x,y,z}         the cog on top of the old mill (reached by jumping up its stair-stones)
//   R.depot {x, z, patrol:[[x,z],...], locker:{x,z}}  the project depot (drones patrol it), locker holds the code cylinder
//   R.platform {x, z, gate:{x,z}, console:{x,z}, shield:{on, setOn(b)}, pad:{x,z}, lift:{lower(cb)}}
//   R.cloudY                  height of the cloud sea
import * as THREE from 'three';

export const ZEELICH = { x: 2400, z: 0 };

export function buildZeelich(scene, physics) {
  const ox = ZEELICH.x, oz = ZEELICH.z;
  const group = new THREE.Group();
  group.name = 'zeelich';
  group.visible = false;
  scene.add(group);
  const W = (x, z) => ({ x: ox + x, z: oz + z });
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const floor = (x, z, w, d, top, color = '#c8b8d8') => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), mat(color));
    m.position.set(ox + x, top - 0.5, oz + z); m.receiveShadow = true; group.add(m);
    physics.add({ type: 'box', x: ox + x, z: oz + z, hw: w / 2, hd: d / 2, rot: 0, top });
  };
  // placeholder layout (replaced by the art pass): dock → street → mills / depot → platform
  floor(0, 0, 70, 40, 2.0);
  floor(-40, 0, 14, 8, 2.0, '#b8a888');
  const R = {
    id: 'zeelich', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters: [],
    music: 'zeelich', cloudY: -6,
    env: { fog: '#e6c8e8', sun: '#fff0e0', hemiSky: '#f0d8ff', hemiGround: '#8a6a9a', sunI: 2.4, hemiI: 1.25, fogRange: [70, 260] },
    spawn: { ...W(-38, 0), a: Math.PI / 2 },
    dock: { ...W(-40, 0), a: Math.PI / 2 },
    street: W(-15, 0),
    workshopDoor: W(-12, -10),
    npcSpots: {
      esmer1: { ...W(-18, 4), a: 0 }, esmer2: { ...W(-10, 5), a: Math.PI }, esmer3: { ...W(-6, -6), a: 1 },
      baldinoOut: { ...W(-12, -7), a: 0 }, doran: { ...W(-41, 2), a: Math.PI / 2 }, vesk: { ...W(26, 0), a: -Math.PI / 2 }, guard: { ...W(18, 4), a: -Math.PI / 2 },
    },
    mills: [],
    millTop: { ...W(5, -14), y: 2.0 },
    depot: { ...W(5, 12), patrol: [[ox + 0, oz + 9], [ox + 10, oz + 9], [ox + 10, oz + 16], [ox + 0, oz + 16]], locker: W(8, 15) },
    platform: { ...W(25, 0), gate: W(18, 0), console: W(17, -3), pad: W(28, 0), shield: { on: true, setOn(b) { this.on = b; } }, lift: { lower(cb) { cb?.(); } } },
    ferry: { group: new THREE.Group(), ...W(-44, 0), setVisible() {} },
  };
  for (const [i, [x, z]] of [[-2, -16], [8, -18], [0, 18]].entries()) {
    const id = ['north', 'east', 'south'][i];
    const m = { id, ...W(x, z), brake: { ...W(x, z + 1.2), y: 4 }, spinning: true, setSpinning(b) { this.spinning = b; } };
    R.mills.push(m);
  }
  return R;
}
