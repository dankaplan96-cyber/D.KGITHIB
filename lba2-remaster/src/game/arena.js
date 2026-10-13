// Developer combat test area (not part of the adventure): open with ?arena in the URL, or game.devArena()
// from the console. A walled yard at x = 6200 with: a stationary dummy, a slow moving target, one of each
// enemy role (mite, drone, sentry, crawler), a wall corner, a raised platform with steps, and a ball switch
// that opens a gate. Used by tests/combat.mjs; the real encounters live in the chapters.
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, rbox, cyl, torus } from './props.js';
import { Actor } from './actors.js';
import { createEnemy } from './enemies.js';

export function buildArena(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'arena', 6200, 0);
  const R = B.room, k = B.k;
  const W = 30, D = 24, H = 3.2;
  R.view = 24; R.follow = 0.55; R.music = 'facility';
  B.shell({ floor: MAT.tiles('#c8c0b0', '#a8a090', '#7a7468', true, 2), slab: MAT.stone('grey'), body: MAT.stone('sand', 2), low: MAT.stone('slate', 1), rail: MAT.iron(), cap: MAT.stone('grey'), W, D, H, t: 0.5, dado: 1.0, rimH: 0.5 });
  R.spawn = { x: B.cx - 10, z: B.cz + 8, a: Math.PI };
  // a wall with a corner (cover, line of sight, ricochets)
  for (const [x, z, w, d] of [[-2, 2, 6, 0.4], [1, 0, 0.4, 4.4]]) { k.add(rbox(w, 2.2, d, 0.04), MAT.stone('grey'), x, 1.1, z); B.col(x, z, w / 2, d / 2, 2.2); }
  // a raised platform (1.2 m) with two steps
  k.add(rbox(6, 1.2, 5, 0.05), MAT.stone('sand'), 10, 0.6, -7); B.col(10, -7, 3, 2.5, 1.2);
  for (const [i, h] of [[0, 0.4], [1, 0.8]]) { k.add(rbox(2, h, 0.8, 0.03), MAT.stone('sand'), 10, h / 2, -4.1 + (1 - i) * 0.8); B.col(10, -4.1 + (1 - i) * 0.8, 1, 0.4, h); }
  // the gate and its ball switch (a ringed target on the wall)
  const gate = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 0.2), MAT.iron()); gate.position.set(-13, 1.2, -6); B.group.add(gate);
  const gateCol = B.col(-13, -6, 1.5, 0.15, 2.4);
  const ringM = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#a02010', emissiveIntensity: 1 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 20), ringM); ring.position.set(-14.7, 1.9, -11.7); B.group.add(ring);
  R.gate = { open: false, set(b) { this.open = b; gate.position.y = b ? 3.4 : 1.2; if (gateCol) gateCol.enabled = !b; } };
  R.ballTargets.push({ x: B.cx - 14.7, y: 1.9, z: B.cz - 11.7, r: 0.7, done: false, onHit() { this.done = true; ringM.color.set('#6aff7a'); ringM.emissive.set('#20d040'); R.gate.set(true); } });
  B.light('#fff4e0', 6, 40, 0, 6, 0);
  void cyl; void torus;
  return B.finish();
}

// A training dummy: never fights back, never dies, counts hits (the stationary target)
export class Dummy extends Actor {
  constructor(game, def) {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#b8864a', roughness: 0.8 }), straw = new THREE.MeshStandardMaterial({ color: '#e8c860', roughness: 0.95 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), wood); post.position.y = 0.9; g.add(post);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.8, 12), straw); body.position.y = 1.2; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), straw); head.position.y = 1.85; g.add(head);
    const rig = { root: g, anim: 'idle', t: 0, flash: 0, play() {}, hitFlash() { this.flash = 1; }, update(dt) { this.flash = Math.max(0, this.flash - dt * 4); straw.emissive.setRGB(this.flash * 0.5, this.flash * 0.4, 0); body.rotation.z *= Math.exp(-dt * 6); }, j: {} };
    super(game, rig, def.x, def.z, 0.45);
    this.def = def; this.id = def.id; this.hp = this.maxHp = 99; this.hits = 0; this.present = true; this.state = 'idle';
    this.material = 'wood'; this.aimY = 1.2; this.markY = 1.9; this.recentHitT = 0; this.body = body;
  }
  get alive() { return true; }
  setPresent(on) { this.present = on; this.rig.root.visible = on; this.shadow.visible = on; }
  alert() {}
  damage(n, from) { this.hits++; this.hp = 99; this.rig.hitFlash(); this.recentHitT = 1; if (from) this.body.rotation.z = 0.25 * Math.sign(this.pos.x - from.x || 1); }
  update(dt) { if (!this.present) return; this.recentHitT = Math.max(0, this.recentHitT - dt); this.rig.update(dt); this.sync(); }
}

// set the arena up: its enemies, the weapons, and in we go
export function enterArena(game) {
  const g = game, R = g.rooms.arena, cx = 6200;
  const defs = [
    { id: 'a_dummy', kind: 'dummy', x: cx - 6, z: 6 },
    { id: 'a_target', kind: 'drone', x: cx + 6, z: 8, hp: 99, patrol: [[cx + 2, 8], [cx + 10, 8]], passive: true },
    { id: 'a_mite', kind: 'mite', x: cx - 4, z: -6, group: 'arena1' },
    { id: 'a_drone', kind: 'drone', x: cx + 6, z: -2, patrol: [[cx + 4, -2], [cx + 8, -2]], group: 'arena2' },
    { id: 'a_sentry', kind: 'sentry', x: cx - 8, z: -2, angle: Math.PI / 2, group: 'arena3' },
    { id: 'a_crawler', kind: 'crawler', x: cx + 4, z: -9, group: 'arena4' },
    { id: 'a_guard', kind: 'guard', x: cx, z: 3, patrol: [[cx - 2, 3], [cx + 2, 3]], group: 'arena5' },
    { id: 'a_guardG', kind: 'guardG', x: cx + 9, z: 3, angle: -Math.PI / 2, group: 'arena6' },
    { id: 'a_fclone', kind: 'fclone', x: cx, z: -6, angle: 0, group: 'arena8' },
    { id: 'a_gdog', kind: 'gdog', coat: 'brown', x: cx - 9, z: 3, group: 'arena7' },
  ];
  if (!g._arenaEnemies) {
    g._arenaEnemies = defs.map((d) => (d.kind === 'dummy' ? new Dummy(g, d) : createEnemy(g, d)));
    for (const e of g._arenaEnemies) { if (e.def.passive) { e.canAttackOverride = false; e.coolT = 1e9; } g.enemies.push(e); }
  }
  const h = g.hero;
  h.hasBall = true; h.hasSword = true; h.hasPulse = true; h.noBehaviours = false;
  if (!g.state || g.state === 'title' || g.state === 'loading') { g.hideScreens?.(); g.hud.show(true); g.beginPlay?.(); }
  g.enterRoom('arena', R.spawn, true);
  g.setState('play');
  return g._arenaEnemies;
}
