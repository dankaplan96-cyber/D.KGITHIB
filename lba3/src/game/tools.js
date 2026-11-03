// EQUIP-2a: LBA3's own first two tools (docs/future/EQUIP2_CONCEPTS.md items 1 and 2). Both are carried like the
// arsenal's weapons: chosen on the weapon wheel (or with E in the inventory), held in Twinsen's right hand, worked
// with the attack key. What he owns is game.hero.arms (pocketset, lance, water: saved with the hero; freshArms reads
// any save, old ones carry neither). Where each comes from, and their puzzles: src/game/story/kit2.js.
//
//  - Arthur's pocket set (chapter 2, Arthur's toy corner): his radio's little brother, built from its spare parts.
//    Held out, it is tuned: it whistles louder and quicker near hidden things that hum (kit2.js hums()), and a needle
//    on the ground at his feet points the way while one is within POCKET.sense. The attack key: a feedback squeal —
//    project drones within POCKET.deafR lose their aim for POCKET.deafT (no wind-up, the head wanders; Drone.squeal);
//    people, animals and the bore's guardian don't mind. POCKET.cool between squeals. Machines only, no damage.
//  - Bram's hand-pump lance (chapter 2, Bram's thanks after The Old Pump): a jet of water along the aim (a lock or
//    the soft target first, as the guns), stopped by walls. Pushes the first enemy it meets LANCE.push back (through
//    collision, in short steps: no tunnelling at any frame rate); crystal mites freeze for LANCE.freeze instead; no
//    damage. Story targets take it through story.jetHit (a too-hot valve, Nell's coupler). LANCE.tank jets a tank,
//    filled at any water (kit2.js: the trough, a basin, a well, a barrel, the sea's edge).
// Effects reuse the soft particle pool (game.particles); no lights; sounds are the engine's short synth voices, so
// nothing keeps sounding after an interruption. Gadgets (gadgets.js) owns this module: update with the gadgets
// (play state only: dialogue, menus and cut-scenes stop the whistle with everything else), reset on a scene change.
import * as THREE from 'three';
import { writeBodyStencil } from './characters.js';
import { Kit } from './props.js';

export const POCKET = { cool: 8, deafR: 10, deafT: 3, sense: 12 };
export const LANCE = { tank: 8, range: 6.5, push: 3, bossPush: 0.8, freeze: 2, cool: 0.45, spray: 0.26, width: 0.2 };

// ---------------------------------------------------------------- models (ours; the hand bone's -y is the forearm's line)
// (merged per material as the hop-pack is: a few draws in the hand, no shadow passes; the needle and the
// sight-tube's water stay their own meshes, they move)
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const kits = new Map();
function part(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0, own = false) {
  if (own) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = false; g.add(m); return m; }
  if (!kits.has(g)) kits.set(g, new Kit(g));
  mat.userData.noShadow = true;   // (a hand-sized thing: its shadow is lost in his; no shadow passes for it)
  kits.get(g).add(geo, mat, x, y, z, 0, { rx, rz });
  return null;
}
function done(g) { kits.get(g)?.flush(); kits.delete(g); }
// Arthur's pocket set: a little box in his radio's red-brown wood, a cream dial with a red needle (it swings with the
// signal), two brass knobs, a cloth speaker and a wire aerial with a bead on top
export function pocketSetModel() {
  const g = new THREE.Group();
  const wood = M('#8a3a2a', { roughness: 0.6 }), brass = M('#e0b25a', { metalness: 0.7, roughness: 0.32 });
  part(g, new THREE.BoxGeometry(0.11, 0.15, 0.06), wood, 0, -0.1, 0.01);
  part(g, new THREE.CylinderGeometry(0.032, 0.032, 0.006, 18), M('#f2e6c8', { roughness: 0.5 }), 0, -0.07, 0.042, Math.PI / 2);
  const needle = new THREE.Group(); needle.position.set(0, -0.085, 0.047); g.add(needle);
  part(needle, new THREE.BoxGeometry(0.004, 0.03, 0.003), M('#d02a20'), 0, 0.015, 0, 0, 0, true);
  part(g, new THREE.BoxGeometry(0.07, 0.035, 0.004), M('#6a4a2a', { roughness: 0.95 }), 0, -0.145, 0.041);
  for (const sx of [-0.035, 0.035]) part(g, new THREE.CylinderGeometry(0.01, 0.011, 0.012, 10), brass, sx, -0.115, 0.044, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), M('#cccccc', { metalness: 0.8, roughness: 0.3 }), 0.04, 0.06, 0, 0, -0.18);
  part(g, new THREE.SphereGeometry(0.009, 8, 6), M('#e8403a'), 0.058, 0.158, 0);
  done(g);
  g.userData.needle = needle;
  writeBodyStencil(g);
  return g;
}
// Bram's pump lance: a brass barrel with a nozzle (along the forearm, as the blowgun lies), a copper tank slung under it
// with a glass sight-tube that shows the water left, a wooden T-handle at the back for the pump stroke
export function lanceModel() {
  const g = new THREE.Group();
  const brass = M('#d8a848', { metalness: 0.7, roughness: 0.32 }), copper = M('#c8743a', { metalness: 0.6, roughness: 0.38 }), wood = M('#7a5030', { roughness: 0.8 });
  part(g, new THREE.CylinderGeometry(0.022, 0.026, 0.42, 10), brass, 0, -0.2, 0.0);
  part(g, new THREE.CylinderGeometry(0.008, 0.02, 0.07, 10), brass, 0, -0.44, 0.0);
  for (const y of [-0.06, -0.33]) part(g, new THREE.TorusGeometry(0.028, 0.006, 4, 12), copper, 0, y, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.055, 0.055, 0.2, 14), copper, 0, -0.16, -0.075);
  for (const y of [-0.06, -0.26]) part(g, new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), copper, 0, y, -0.075, y < -0.1 ? Math.PI : 0);
  part(g, new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8), M('#e8f6ff', { transparent: true, opacity: 0.45, roughness: 0.1 }), 0.05, -0.16, -0.06);
  const level = part(g, new THREE.CylinderGeometry(0.009, 0.009, 0.155, 8).translate(0, 0.0775, 0), M('#4a9ae0', { emissive: '#2a6ab0', emissiveIntensity: 0.4, roughness: 0.2 }), 0.05, -0.2375, -0.06, 0, 0, true);
  part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), brass, 0, 0.03, 0);
  part(g, new THREE.CylinderGeometry(0.016, 0.016, 0.13, 8), wood, 0, 0.075, 0, 0, Math.PI / 2);
  done(g);
  g.userData.level = level;
  g.rotation.x = -0.15;
  writeBodyStencil(g);
  return g;
}

export class Tools {
  constructor(game) {
    this.game = game;
    this.squealCool = 0; this.jetCool = 0;
    this.pushes = [];   // enemies being pushed back by a jet: { e, x, z (unit), left (m) }
    this.sprays = [];   // jets in the air (their droplets): { from, dir, len, t }
    this.pipT = 0;
    this.sense = null;  // the pocket set's reading: { d, k, x, z } of the nearest hum in reach, or null
    this.stats = { squeals: 0, deafened: 0, jets: 0, pushed: 0, frozen: 0, story: 0, empty: 0, fills: 0, pips: 0 };
    // the needle on the ground at his feet (one small flat arrow; no light)
    const s = new THREE.Shape(); s.moveTo(0, 0.32); s.lineTo(0.13, 0); s.lineTo(0.04, 0.03); s.lineTo(0, -0.08); s.lineTo(-0.04, 0.03); s.lineTo(-0.13, 0); s.closePath();
    this.needle = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.needle.name = 'pocketNeedle'; this.needle.visible = false; this.needle.renderOrder = 6; this.needle.frustumCulled = false;
    // (out of play — a dialogue, a menu, a cut-scene — the frozen needle fades: update only runs in play)
    this.needle.onBeforeRender = () => { if (game.state !== 'play') this.needle.material.opacity = 0; };
    game.scene.add(this.needle);
  }
  get h() { return this.game.hero; }
  get arms() { return this.h.arms; }
  // the tool in his hand (the wheel's choice, when he may hold it)
  held() { const w = this.h.combat?.weapon; return w === 'pocketset' || w === 'lance' ? w : null; }
  // what using `w` would need right now: null = fine, else a toast key (the HUD greys the pill)
  short(w) { if (w === 'lance') return this.arms.water > 0 ? null : 'e2_toast_empty'; return null; }
  cool(w) { return w === 'pocketset' ? this.squealCool / POCKET.cool : this.jetCool / LANCE.cool; }

  // the attack key with a tool in hand (combat.js); true when it did something (the combat controller plants him)
  fire(w, aim) {
    if (w === 'pocketset') return this.squeal(aim);
    if (w === 'lance') return this.jet(aim);
    return false;
  }

  // ---------------------------------------------------------------- the pocket set's feedback squeal
  squeal(aim) {
    const g = this.game, h = this.h, P = POCKET;
    if (this.squealCool > 0) return false;
    this.squealCool = P.cool;
    if (aim) h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    this.sound('squeal');
    // the squeal's ring: two flat rings from his feet out to its reach (the pool's ring cell)
    for (let i = 0; i < 2; i++) g.particles.spawn({ x: h.pos.x, y: h.pos.y + 0.08 + i * 0.6, z: h.pos.z, color: '#ffe8a0', a: 0.55 - i * 0.2, s0: 0.6, s1: P.deafR * 2, life: 0.5 + i * 0.12, add: 1, cell: 2, fi: 0.02, fo: 0.3, rot: 0 });
    let n = 0;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || !e.squeal) continue;
      if (Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) > P.deafR || Math.abs(e.pos.y - h.pos.y) > 6) continue;
      if (!e.squeal(P.deafT)) continue;
      n++;
      const y = e.pos.y + (e.aimY ?? 1.2);
      g.particles.burst(e.pos.x, y, e.pos.z, '#ffe35a', 8, 2);
      g.hud.float('?', { x: e.pos.x, y: y + 0.8, z: e.pos.z }, '#ffe35a');
    }
    this.stats.squeals++; this.stats.deafened += n;
    this.lastSqueal = { n };
    return true;
  }

  // ---------------------------------------------------------------- the pump lance's jet
  jet(aim) {
    const g = this.game, h = this.h, a = this.arms, L = LANCE, P = g.physics;
    if (this.jetCool > 0) return false;
    if (!(a.water > 0)) { this.stats.empty++; g.hud.toast('e2_toast_empty'); this.sound('dry'); return false; }
    a.water--;
    this.jetCool = L.cool;
    h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    const from = g.weapons.origin(aim), { dir } = g.weapons.dirTo(from, aim, L.range);
    // along the jet in short steps: the first wall, the first enemy (a little width: it is a spray)
    let len = L.range, hit = null;
    for (let d = 0.25; d <= L.range + 1e-6; d += 0.25) {
      const x = from.x + dir.x * d, y = from.y + dir.y * d, z = from.z + dir.z * d;
      if (P.groundAt(x, z, y + 0.05) > y || P.blockedAt(x, z, y - 0.6, 0)) { len = Math.max(0.3, d - 0.2); break; }
      for (const e of g.enemies) {
        if (!e.alive || !e.present) continue;
        if (Math.hypot(x - e.pos.x, z - e.pos.z) < (e.hitR || 0.75) + L.width && y > e.pos.y - 0.5 && y < e.pos.y + (e.hitH || 2) + 0.4) { hit = e; break; }
      }
      if (hit) { len = d; break; }
    }
    const end = new THREE.Vector3(from.x + dir.x * len, from.y + dir.y * len, from.z + dir.z * len);
    this.sprays.push({ from: from.clone(), dir: dir.clone(), len, t: L.spray });
    this.sound('jet');
    this.stats.jets++;
    if (hit) this.soak(hit, dir);
    else if (g.story.jetHit?.({ from, dir, len, end })) this.stats.story++;
    this.lastJet = { len: +len.toFixed(2), hit: hit?.id || null };
    return true;
  }
  // an enemy the jet strikes: a crystal mite freezes, anything else is pushed back (the bore's guardian barely)
  soak(e, dir) {
    const g = this.game, L = LANCE;
    const y = e.pos.y + (e.aimY ?? 0.8);
    g.particles.burst(e.pos.x, y, e.pos.z, '#d8f0ff', 10, 3);
    e.alert?.(this.h.pos);
    if (e.def?.kind === 'mite' && e.freeze) {
      if (e.freeze(L.freeze)) { this.stats.frozen++; g.particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, '#e8fbff', 12, 1.0); }
      return;
    }
    const d = Math.hypot(dir.x, dir.z) || 1;
    this.pushes = this.pushes.filter((p) => p.e !== e);
    this.pushes.push({ e, x: dir.x / d, z: dir.z / d, left: e.def?.kind === 'guardian' ? L.bossPush : L.push });
    e.kb?.set(0, 0);
    this.stats.pushed++;
  }
  // the pushes: ~0.35 s each, eased out, in steps of at most 0.2 m through the physics (walls stop them; ledges don't)
  stepPushes(dt) {
    const P = this.game.physics;
    for (let i = this.pushes.length - 1; i >= 0; i--) {
      const p = this.pushes[i], e = p.e;
      if (!e.alive || !e.present) { this.pushes.splice(i, 1); continue; }
      const step = Math.min(p.left, (4 + 9 * Math.min(1, p.left / LANCE.push)) * dt);
      const n = Math.max(1, Math.ceil(step / 0.2)), s = step / n;
      for (let k = 0; k < n; k++) {
        const x0 = e.pos.x, z0 = e.pos.z;
        P.move(e, p.x * s, p.z * s);
        const m = Math.hypot(e.pos.x - x0, e.pos.z - z0);
        if (m < s * 0.3) { p.left = 0; break; }   // (against a wall: it stops there)
      }
      p.left -= step;
      if (p.left <= 0.01) { this.pushes.splice(i, 1); e.sync?.(); }
    }
  }
  // a tank filled at water (kit2.js); false when it was already full
  fill() {
    const a = this.arms;
    if (!a.lance || a.water >= LANCE.tank) return false;
    a.water = LANCE.tank; this.stats.fills++;
    this.sound('fill');
    return true;
  }

  // ---------------------------------------------------------------- each frame (play only)
  update(dt) {
    const g = this.game, h = this.h;
    this.squealCool = Math.max(0, this.squealCool - dt);
    this.jetCool = Math.max(0, this.jetCool - dt);
    this.stepPushes(dt);
    // the jets' droplets: a few a frame from the nozzle while it sprays, falling a little over their run
    for (let i = this.sprays.length - 1; i >= 0; i--) {
      const S = this.sprays[i]; S.t -= dt;
      const sp = 15, life = Math.max(0.12, S.len / sp);
      for (let k = 0; k < 3; k++) {
        const j = () => (Math.random() - 0.5) * 0.9;
        g.particles.spawn({ x: S.from.x, y: S.from.y, z: S.from.z, vx: S.dir.x * sp + j(), vy: S.dir.y * sp + j() + life * 2.5, vz: S.dir.z * sp + j(), color: '#cfeaff', a: 0.75, s0: 0.07, s1: 0.16, life, grav: 5, drag: 0.2, add: 0.35, cell: 0, fi: 0.05, fo: 0.4 });
      }
      if (S.t <= 0) {
        const e = S.from.clone().addScaledVector(S.dir, S.len);
        g.particles.burst(e.x, e.y, e.z, '#d8f0ff', 8, 2.5);
        this.sprays.splice(i, 1);
      }
    }
    // the tool in his hand: the lance's sight-tube shows the water left; the pocket set listens
    const held = this.held();
    const m = g.weapons?.models?.lance;
    if (m) m.userData.level.scale.y = Math.max(0.02, (this.arms?.water || 0) / LANCE.tank);
    this.listen(held === 'pocketset' && g.state === 'play' && !h.dead, dt);
  }
  // the pocket set, tuned: the nearest hum within reach sets the whistle's pace and pitch and the needle's heading
  listen(on, dt) {
    const g = this.game, h = this.h, N = this.needle;
    let best = null;
    if (on) {
      const here = g.room?.id ?? 'citadel';
      for (const s of g.story.kit2?.hums() || []) {
        if (s.room !== here || Math.abs(s.y - h.pos.y) > 4) continue;
        const d = Math.hypot(s.x - h.pos.x, s.z - h.pos.z);
        if (d <= POCKET.sense && (!best || d < best.d)) best = { d, x: s.x, z: s.z, id: s.id };
      }
    }
    if (best) best.k = 1 - best.d / POCKET.sense;
    this.sense = best;
    const model = g.weapons?.models?.pocketset;
    if (model) model.userData.needle.rotation.z = THREE.MathUtils.lerp(model.userData.needle.rotation.z, best ? 0.9 - best.k * 1.8 : 0.9 + Math.sin(g.time * 7) * 0.08, Math.min(1, dt * 8));
    if (!best) { N.visible = false; this.pipT = 0; return; }
    // the needle: at his feet, toward the hum, brighter as it nears; right on top of it, it turns slowly round
    const a = best.d > 0.6 ? Math.atan2(best.x - h.pos.x, best.z - h.pos.z) : g.time * 3;
    N.visible = true;
    N.position.set(h.pos.x + Math.sin(a) * 0.75, h.pos.y + 0.06, h.pos.z + Math.cos(a) * 0.75);
    N.rotation.y = a;
    N.material.opacity = 0.3 + 0.55 * best.k;
    N.scale.setScalar(0.85 + best.k * 0.5);
    // the whistle: pips from about one a second at the edge to a near-steady tone on top of it
    this.pipT -= dt;
    if (this.pipT <= 0) { this.pipT = 0.95 - 0.83 * best.k; this.stats.pips++; this.sound('pip', best.k); }
  }
  // a scene change, a load: nothing in the air, nothing being pushed, the needle away (the cooldowns run on)
  reset() {
    this.pushes = []; this.sprays = []; this.sense = null; this.pipT = 0;
    this.needle.visible = false;
  }
  sound(kind, k = 0) {
    const au = this.game.audio;
    if (!au?.ctx || au.ctx.state !== 'running') return;
    if (kind === 'pip') { au._tone({ type: 'sine', f0: 820 + 900 * k, f1: 860 + 940 * k, dur: 0.07, vol: 0.018 + 0.03 * k }); }
    if (kind === 'squeal') { au._tone({ type: 'sawtooth', f0: 1800, f1: 3600, dur: 0.45, vol: 0.035 }); au._tone({ type: 'square', f0: 2400, f1: 1900, dur: 0.5, vol: 0.02, at: 0.05 }); au._burst({ dur: 0.4, vol: 0.05, f: 4000, f1: 2500, type: 'bandpass', q: 6 }); }
    if (kind === 'jet') { au._tone({ type: 'triangle', f0: 170, f1: 90, dur: 0.08, vol: 0.06 }); au._burst({ dur: 0.32, vol: 0.12, f: 2200, f1: 900, type: 'bandpass', q: 1.2, at: 0.03 }); }
    if (kind === 'dry') { au._tone({ type: 'triangle', f0: 170, f1: 120, dur: 0.07, vol: 0.05 }); au._burst({ dur: 0.08, vol: 0.04, f: 700, type: 'bandpass', q: 3, at: 0.05 }); }
    if (kind === 'fill') { for (let i = 0; i < 5; i++) au._tone({ type: 'sine', f0: 210 + i * 30, f1: 320 + i * 35, dur: 0.09, vol: 0.05, at: i * 0.11 }); au._burst({ dur: 0.6, vol: 0.05, f: 900, f1: 500, type: 'lowpass', q: 1 }); }
    if (kind === 'steam') { au._burst({ dur: 0.7, vol: 0.09, f: 5200, f1: 2600, type: 'highpass', q: 0.7 }); }
  }
}
