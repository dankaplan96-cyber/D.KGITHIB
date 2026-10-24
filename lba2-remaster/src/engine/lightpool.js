// A fixed set of point lights standing in for the lamps of whatever area is on screen.
//
// three.js builds a shader variant per number of visible lights. The rooms' and regions' lamps live inside
// their groups, so every room change altered the count and every lit material on screen compiled again
// (a stall on each door, and dozens of programs when a new game starts). Here the lamps the builders place
// are kept as invisible markers; each frame the SIZE most relevant ones near the focus (lit, in a visible
// part of the scene) are copied into SIZE real lights that never leave the scene. Unused ones go dark.
// Builders keep animating their own lamps' intensity as before.
import * as THREE from 'three';

// lights in the pool by graphics quality: every lit pixel pays for each one, so integrated GPUs get fewer
export const POOL_SIZE = { high: 8, medium: 4, low: 2 };
const _p = new THREE.Vector3();

export class LightPool {
  constructor(scene, size = 8) {
    this.scene = scene;
    this.lights = [];
    this.setSize(size);
    this.sources = [];
    this.collect();
  }
  // (changing the count recompiles the lit materials once: only on a quality change)
  setSize(n) {
    while (this.lights.length > n) this.scene.remove(this.lights.pop());
    while (this.lights.length < n) {
      const l = new THREE.PointLight('#ffffff', 0, 1, 2);
      l.userData.pool = true;
      this.scene.add(l);
      this.lights.push(l);
    }
  }
  // take in every point light the builders placed (call again if lamps are added later)
  collect() {
    this.scene.traverse((o) => {
      if (!o.isPointLight || o.userData.pool || o.userData.poolSource) return;
      o.userData.poolSource = true;
      o.visible = false; // (a marker: the pool lights it)
      this.sources.push(o);
    });
  }
  update(focus) {
    const cand = [];
    for (const s of this.sources) {
      if (!(s.intensity > 0)) continue;
      let shown = true;
      for (let p = s.parent; p; p = p.parent) if (!p.visible) { shown = false; break; }
      if (!shown) continue;
      s.getWorldPosition(_p);
      const d = _p.distanceTo(focus), reach = s.distance > 0 ? s.distance : 40;
      const edge = d - reach; // how far the edge of its light is from the focus
      if (edge > 25) continue;
      cand.push({ s, edge, x: _p.x, y: _p.y, z: _p.z });
    }
    cand.sort((a, b) => a.edge - b.edge);
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i], c = cand[i];
      if (!c) { L.intensity = 0; continue; }
      L.position.set(c.x, c.y, c.z);
      L.color.copy(c.s.color); L.intensity = c.s.intensity; L.distance = c.s.distance; L.decay = c.s.decay;
    }
  }
}
