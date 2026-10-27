// A fixed set of point lights standing in for the lamps of whatever area is on screen.
//
// three.js builds a shader variant per number of visible lights. The rooms' and regions' lamps live inside
// their groups, so every room change altered the count and every lit material on screen compiled again
// (a stall on each door, and dozens of programs when a new game starts). Here the lamps the builders place
// are kept as invisible markers; each frame the SIZE most relevant ones near the focus (lit, in a visible
// part of the scene) are copied into SIZE real lights that never leave the scene. Unused ones go dark.
// Builders keep animating their own lamps' intensity as before.
//
// PERF-BATTERY-2: on battery (Medium/High: the battery profile) the pool has BATTERY_LAMPS lights, and they follow the
// lamps nearest the hero with a fade (`fade` on): each light keeps its lamp until another is clearly nearer (15 %),
// fades it out over FADE s, then fades the new one in. On the user's Vega 8 on battery the lamps were the largest
// single GPU cost (laptop-build220.txt: street 20.8 → 17.5 ms without them, the house 13.9 → 8.8 ms): every lit pixel
// pays for each lamp that reaches it. Plugged in (and on Low, which has 2 already) nothing changes. The light count
// is part of every lit shader's program: the battery profile's programs (made anyway on a switch, for its shadow filter)
// are made with 2 lights instead of 4/8, so no program is added.
import * as THREE from 'three';

// lights in the pool by graphics quality: every lit pixel pays for each one, so integrated GPUs get fewer
export const POOL_SIZE = { high: 8, medium: 4, low: 2 };
export const BATTERY_LAMPS = 2, FADE = 0.45;
// the pool's size for a preset, with the battery profile on or off (Low: unchanged)
export const poolSize = (q, battery = false) => {
  const n = POOL_SIZE[q] ?? 8;
  return battery && q !== 'low' ? Math.min(n, BATTERY_LAMPS) : n;
};
const _p = new THREE.Vector3();
const smooth = (w) => w * w * (3 - 2 * w);
const shownSrc = (s) => { for (let p = s.parent; p; p = p.parent) if (!p.visible) return false; return true; };

export class LightPool {
  constructor(scene, size = 8) {
    this.scene = scene;
    this.lights = [];
    this.fade = false;   // (PERF-BATTERY-2: the battery profile's nearest lamps, faded)
    this.slots = [];
    this.setSize(size);
    this.sources = [];
    this.collect();
  }
  // (changing the count recompiles the lit materials once: only on a quality or power change)
  setSize(n) {
    while (this.lights.length > n) this.scene.remove(this.lights.pop());
    while (this.lights.length < n) {
      const l = new THREE.PointLight('#ffffff', 0, 1, 2);
      l.userData.pool = true;
      this.scene.add(l);
      this.lights.push(l);
    }
    this.slots = this.lights.map(() => ({ s: null, w: 0 })); this._t = null;
  }
  setFade(on) { on = !!on; if (on !== this.fade) { this.fade = on; for (const S of this.slots) { S.s = null; S.w = 0; } this._t = null; } }
  // take in every point light the builders placed (call again if lamps are added later)
  collect() {
    this.scene.traverse((o) => {
      if (!o.isPointLight || o.userData.pool || o.userData.poolSource) return;
      o.userData.poolSource = true;
      o.visible = false; // (a marker: the pool lights it)
      this.sources.push(o);
    });
  }
  // focus: where the hero (or the shot's subject) is; time: the game's clock (s), for the battery profile's fades. A call
  // without it (a scene change, a warm-up: behind the black) takes the final state at once.
  update(focus, time = null) {
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
      cand.push({ s, edge, near: d / reach, x: _p.x, y: _p.y, z: _p.z });
    }
    if (this.fade) return this.nearest(cand, time);
    cand.sort((a, b) => a.edge - b.edge);
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i], c = cand[i];
      if (!c) { L.intensity = 0; continue; }
      L.position.set(c.x, c.y, c.z);
      L.color.copy(c.s.color); L.intensity = c.s.intensity; L.distance = c.s.distance; L.decay = c.s.decay;
    }
  }
  // (PERF-BATTERY-2) the lamps nearest the focus (by distance as a share of the lamp's reach: the lamp whose light is
  // strongest where he stands), each light fading between them
  nearest(cand, time) {
    const dt = time == null || this._t == null ? Infinity : Math.max(0, Math.min(0.25, time - this._t));
    this._t = time;
    const S = this.slots, n = S.length, by = new Map(cand.map((c) => [c.s, c]));
    for (const c of cand) if (S.some((x) => x.s === c.s)) c.near *= 0.85;   // (a lamp being shown keeps its light unless another is clearly nearer)
    cand.sort((a, b) => a.near - b.near);
    const want = new Set(cand.slice(0, n).map((c) => c.s));
    // (a lamp waiting for a light — the lantern switched on — has the leaving one fade twice as fast)
    const out = [...want].some((s) => !S.some((x) => x.s === s)) ? FADE / 2 : FADE;
    for (const x of S) {
      if (!x.s) continue;
      if (!by.has(x.s)) {
        // (switched off or no longer shown: its own doing, at once; left behind by the hero: faded out where it is)
        if (!(x.s.intensity > 0) || !shownSrc(x.s) || dt === Infinity) { x.s = null; x.w = 0; continue; }
        x.s.getWorldPosition(_p); by.set(x.s, { s: x.s, x: _p.x, y: _p.y, z: _p.z });
      }
      x.w = want.has(x.s) ? Math.min(1, x.w + dt / FADE) : Math.max(0, x.w - dt / out);
      if (x.w <= 0) { x.s = null; x.rest = dt !== Infinity; }   // (a light that has just gone dark takes its next lamp a frame later: never a jump while lit)
    }
    for (const c of cand.slice(0, n)) {
      if (S.some((x) => x.s === c.s)) continue;
      const free = S.find((x) => !x.s && !x.rest); if (!free) break;
      free.s = c.s; free.w = dt === Infinity ? 1 : Math.min(1, dt / FADE);
    }
    for (const x of S) x.rest = false;
    for (let i = 0; i < n; i++) {
      const L = this.lights[i], x = S[i], c = x.s && by.get(x.s);
      if (!c || !(x.w > 0)) { L.intensity = 0; continue; }
      L.position.set(c.x, c.y, c.z);
      L.color.copy(c.s.color); L.intensity = c.s.intensity * smooth(x.w); L.distance = c.s.distance; L.decay = c.s.decay;
    }
  }
}
