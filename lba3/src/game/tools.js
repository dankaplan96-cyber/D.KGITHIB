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
// EQUIP-2b: three more (docs/future/EQUIP2_CONCEPTS.md items 3–5; where each comes from: story/kit2b.js):
//  - The singing fork (chapter 4, Ilka's, once she trusts Twinsen): the attack key strikes it. Warm crystal within
//    FORK.reach in front answers (story.forkHit: a crust cracks, a sleeping crystal wakes as a lamp, a stuck crystal
//    wheel turns); crystal mites and crawlers within FORK.fightR stagger FORK.stagger s (Mite.forkRing); a sentry's
//    crystal-celled guard drops for one hit (Sentry.forkRing). FORK.cool between strikes; nothing else answers it.
//  - The Esmer line (chapter 3, Nara's case; chapter 9 her gift): a sticky cord on a hand reel. It catches only cord
//    rings, loose things and light enemies within LINE.range, in sight. A ring reels Twinsen along a checked route
//    (across a gap, up to a ledge: zipStep, in steps of at most 0.2 m with the route's clearance checked before he
//    leaves and each step on the way: collision decides, no tunnelling at any frame rate); a loose thing comes to
//    him (story); a light enemy is hauled to LINE.pullTo m from him, a sentry's shield is yanked aside, anything
//    heavier only twangs the cord.
//  - The heat flask (chapter 6, Lhar's smith from Baldino's plans): one charge, drawn with E at a heat post, a
//    steam vent or a brazier (story/kit2b.js heatNear); it fades in FLASK.keep s (arms.heat counts down in play).
//    The attack key lets it out in front: FLASK.dmg within FLASK.r (ice creatures FLASK.ice times that), and the
//    story's cold things take it (story.heatHit: the frozen winch, the monks' frozen chest). Cold, it only clicks.
// Effects reuse the soft particle pool (game.particles); no lights; sounds are the engine's short synth voices, so
// nothing keeps sounding after an interruption. Gadgets (gadgets.js) owns this module: update with the gadgets
// (play state only: dialogue, menus and cut-scenes stop the whistle with everything else), reset on a scene change.
import * as THREE from 'three';
import { writeBodyStencil } from './characters.js';
import { Kit } from './props.js';

export const POCKET = { cool: 8, deafR: 10, deafT: 3, sense: 12 };
export const LANCE = { tank: 8, range: 6.5, push: 3, bossPush: 0.8, freeze: 2, cool: 0.45, spray: 0.26, width: 0.2 };
export const FORK = { cool: 5, fightR: 6, stagger: 1.5, reach: 3.6 };
export const LINE = { range: 14, cool: 0.9, zip: 9, out: 0.16, back: 0.22, pullTo: 1.5, pullSpeed: 8, cone: 0.42 };
export const FLASK = { keep: 90, dmg: 2, r: 2.5, ice: 2, cool: 0.7, half: 1.05 };
export const TOOL_IDS = ['pocketset', 'lance', 'fork', 'line', 'heatflask'];
// ice creatures (the flask's double): the Hamalayi's mites, or any def that says so
export const isIce = (e) => !!e?.def?.ice || /^(imite|nmite)/.test(e?.def?.id || '');
const UP = new THREE.Vector3(0, 1, 0);
const LIGHT = (e) => (e.def?.kind === 'mite') || e.def?.kind === 'gdog' || (e.def?.kind === 'drone' && e.def?.model !== 'hauler');

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
// EQUIP-2b. Ilka's singing fork: a dig tool, not a music-room one: two long steel tines on a short stem, a warm-crystal
// bead set where the tines meet (it brightens as the fork rings), a turned wooden handle bound with cord
export function forkModel() {
  const g = new THREE.Group();
  const steel = M('#c8ccd4', { metalness: 0.85, roughness: 0.25 }), wood = M('#8a5a34', { roughness: 0.75 }), cord = M('#d8c08a', { roughness: 0.9 });
  part(g, new THREE.CylinderGeometry(0.016, 0.019, 0.12, 8), wood, 0, -0.01, 0);
  for (const y of [0.04, -0.06]) part(g, new THREE.TorusGeometry(0.019, 0.005, 4, 10), cord, 0, y, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.007, 0.007, 0.07, 6), steel, 0, -0.1, 0);
  part(g, new THREE.TorusGeometry(0.026, 0.0065, 5, 12, Math.PI), steel, 0, -0.135, 0, 0, Math.PI);
  for (const sx of [-0.026, 0.026]) part(g, new THREE.BoxGeometry(0.011, 0.2, 0.008), steel, sx, -0.235, 0);
  const bead = part(g, new THREE.OctahedronGeometry(0.017, 0), M('#bff8ff', { emissive: '#30c8f0', emissiveIntensity: 0.6, roughness: 0.15 }), 0, -0.14, 0.004, 0, 0, true);
  done(g);
  g.userData.bead = bead;
  g.rotation.x = -0.1;
  writeBodyStencil(g);
  return g;
}
// the Esmer line: a hand reel in Esmer lilac and brass: a grip, a drum of tan cord with a little crank, a short guide
// tube along the forearm's line and the cord's sticky orange tip in its mouth (gone while the cord is out)
export function lineModel() {
  const g = new THREE.Group();
  const brass = M('#e0b25a', { metalness: 0.7, roughness: 0.32 }), lilac = M('#9a7ab8', { roughness: 0.55 }), cord = M('#e2cc96', { roughness: 0.9 }), wood = M('#6a4426', { roughness: 0.8 });
  part(g, new THREE.CylinderGeometry(0.018, 0.02, 0.1, 8), wood, 0, 0.0, 0);
  part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), lilac, 0, -0.08, -0.035, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.036, 0.036, 0.052, 14), cord, 0, -0.08, -0.035, 0, Math.PI / 2);
  for (const sx of [-0.028, 0.028]) part(g, new THREE.CylinderGeometry(0.049, 0.049, 0.006, 14), brass, sx, -0.08, -0.035, 0, Math.PI / 2);
  part(g, new THREE.BoxGeometry(0.008, 0.05, 0.008), brass, 0.035, -0.06, -0.035);
  part(g, new THREE.SphereGeometry(0.009, 6, 5), wood, 0.04, -0.035, -0.035);
  part(g, new THREE.CylinderGeometry(0.011, 0.014, 0.16, 8), brass, 0, -0.14, 0.012);
  const tip = part(g, new THREE.SphereGeometry(0.016, 8, 6), M('#ff8a3a', { roughness: 0.4 }), 0, -0.225, 0.012, 0, 0, true);
  done(g);
  g.userData.tip = tip;
  g.rotation.x = -0.12;
  writeBodyStencil(g);
  return g;
}
// the heat flask: Baldino's drawing, Tashi's smithing: a squat copper flask in a leather band, a brass neck turned
// forward, and a window onto the project heat cell inside that glows orange while it holds heat (cold: dull)
export function flaskModel() {
  const g = new THREE.Group();
  const copper = M('#c8743a', { metalness: 0.6, roughness: 0.38 }), brass = M('#e0b25a', { metalness: 0.7, roughness: 0.32 }), leather = M('#5a3a24', { roughness: 0.85 });
  const prof = [[0.001, 0], [0.05, 0.004], [0.066, 0.04], [0.064, 0.11], [0.04, 0.15], [0.018, 0.165], [0.001, 0.166]].map(([r, y]) => new THREE.Vector2(r, y));
  part(g, new THREE.CylinderGeometry(0.016, 0.016, 0.05, 8), brass, 0, 0.01, 0);
  part(g, new THREE.LatheGeometry(prof, 16), copper, 0, -0.024, 0, Math.PI);   // (its narrow shoulder forward, into the neck)
  part(g, new THREE.CylinderGeometry(0.069, 0.069, 0.03, 16), leather, 0, -0.12, 0);
  part(g, new THREE.CylinderGeometry(0.014, 0.02, 0.06, 10), brass, 0, -0.215, 0);
  part(g, new THREE.TorusGeometry(0.018, 0.005, 4, 10), brass, 0, -0.245, 0, Math.PI / 2);
  const cell = part(g, new THREE.BoxGeometry(0.036, 0.05, 0.012), M('#ffb070', { emissive: '#ff6a1a', emissiveIntensity: 0, roughness: 0.2 }), 0, -0.1, 0.064, 0, 0, true);
  done(g);
  g.userData.cell = cell;
  g.rotation.x = -0.1;
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
    this.stats = { squeals: 0, deafened: 0, jets: 0, pushed: 0, frozen: 0, story: 0, empty: 0, fills: 0, pips: 0,
      rings: 0, rung: 0, casts: 0, zips: 0, hauled: 0, yanked: 0, heavy: 0, missed: 0, blocked: 0, things: 0, blasts: 0, burned: 0, cold: 0, draws: 0, faded: 0 };
    // EQUIP-2b: the fork's, the line's and the flask's own state
    this.forkCool = 0; this.castCool = 0; this.blastCool = 0;
    this.zip = null;    // the line reeling him along a route: { pts, i, d, tg }
    this.hauls = [];    // light enemies being hauled in on the line: { e, left }
    this.cord = null;   // the cord in the air: { end (Vector3 | null), e (enemy | null), t, phase: 'out'|'hold'|'back', then, holdT }
    // the cord (one thin open tube, its length scaled each frame) and its sticky tip; no light
    this.cordMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1, 4, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#e8d4a0' }));
    this.cordTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff8a3a' }));
    for (const m of [this.cordMesh, this.cordTip]) { m.visible = false; m.frustumCulled = false; m.castShadow = false; game.scene.add(m); }
    this.cordMesh.name = 'esmerCord';
    this.wispT = 0;
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
  held() { const w = this.h.combat?.weapon; return TOOL_IDS.includes(w) ? w : null; }
  // what using `w` would need right now: null = fine, else a toast key (the HUD greys the pill)
  short(w) {
    if (w === 'lance') return this.arms.water > 0 ? null : 'e2_toast_empty';
    if (w === 'heatflask') return this.arms.heat > 0 ? null : 'e2_toast_cold';
    return null;
  }
  cool(w) {
    if (w === 'pocketset') return this.squealCool / POCKET.cool;
    if (w === 'fork') return this.forkCool / FORK.cool;
    if (w === 'line') return this.zip || this.cord ? 1 : this.castCool / LINE.cool;
    if (w === 'heatflask') return this.blastCool / FLASK.cool;
    return this.jetCool / LANCE.cool;
  }

  // the attack key with a tool in hand (combat.js); true when it did something (the combat controller plants him)
  fire(w, aim) {
    if (w === 'pocketset') return this.squeal(aim);
    if (w === 'lance') return this.jet(aim);
    if (w === 'fork') return this.ring(aim);
    if (w === 'line') return this.cast(aim);
    if (w === 'heatflask') return this.blast(aim);
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

  // ---------------------------------------------------------------- the singing fork (EQUIP-2b)
  ring(aim) {
    const g = this.game, h = this.h, F = FORK;
    if (this.forkCool > 0) return false;
    this.forkCool = F.cool;
    if (aim) h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    this.sound('ring');
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle);
    // the note: two thin pale rings from the fork out to its reach (the pool's ring cell)
    for (let i = 0; i < 2; i++) g.particles.spawn({ x: h.pos.x + fx * 0.5, y: h.pos.y + 1.2 - i * 0.55, z: h.pos.z + fz * 0.5, color: '#bff4ff', a: 0.5 - i * 0.18, s0: 0.3, s1: F.fightR * 2, life: 0.55 + i * 0.15, add: 1, cell: 2, fi: 0.02, fo: 0.35, rot: 0 });
    let n = 0;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || !e.forkRing) continue;
      if (Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) > F.fightR || Math.abs(e.pos.y - h.pos.y) > 3) continue;
      if (!e.forkRing(F.stagger)) continue;
      n++;
      const y = e.pos.y + (e.aimY ?? 0.8);
      g.particles.burst(e.pos.x, y, e.pos.z, '#bff8ff', 10, 2.2);
      g.hud.float('♪', { x: e.pos.x, y: y + 0.8, z: e.pos.z }, '#bff8ff');
    }
    const story = !!g.story.forkHit?.({ x: h.pos.x, y: h.pos.y, z: h.pos.z, fx, fz, reach: F.reach });
    if (story) this.stats.story++;
    this.stats.rings++; this.stats.rung += n;
    this.ringGlow = 1;
    this.lastRing = { n, story };
    return true;
  }

  // ---------------------------------------------------------------- the Esmer line (EQUIP-2b)
  // the hand the cord leaves from (and is reeled back to)
  hand() { const h = this.h; return new THREE.Vector3(h.pos.x + Math.sin(h.angle) * 0.5, h.pos.y + 1.2, h.pos.z + Math.cos(h.angle) * 0.5); }
  cast(aim) {
    const g = this.game, h = this.h, P = g.physics, L = LINE;
    if (this.castCool > 0 || this.zip || this.cord) return false;
    this.castCool = L.cool;
    h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    const from = this.hand();
    this.sound('cast'); this.stats.casts++;
    const sees = (x, y, z) => Math.hypot(x - from.x, y - from.y, z - from.z) <= L.range && P.clearTo(from.x, from.y, from.z, x, y, z, 0.5);
    const ok = (e) => !!e && e.alive && e.present && sees(e.pos.x, e.pos.y + (e.aimY ?? 0.8), e.pos.z);
    // what it catches: the enemy the aim means (a lock or the soft target), else the cord ring or loose thing nearest
    // the aim (within LINE.cone of it, in sight), else an enemy in a narrow cone
    const T = g.targeting;
    let e = T?.lock || (T && T.cone() > 0 ? T.pick(aim, L.range, Math.max(0.3, T.cone())) : null);
    if (!ok(e)) e = null;
    let tg = null;
    if (!e) {
      let best = L.cone;
      for (const t of g.story.lineTargets?.() || []) {
        const dx = t.x - h.pos.x, dz = t.z - h.pos.z;
        if (Math.hypot(dx, dz) < 0.3) continue;
        const a = Math.atan2(dx, dz) - h.angle, off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        if (off < best && sees(t.x, t.y, t.z)) { best = off; tg = t; }
      }
    }
    if (!e && !tg) { const c = T?.pick?.(aim, L.range, 0.3); if (ok(c)) e = c; }
    const at = (t) => new THREE.Vector3(t.x, t.y, t.z);
    if (tg?.kind === 'ring') {
      const route = tg.route(h.pos);
      if (!route || !this.clear([h.pos.clone(), ...route])) {
        // (the cord catches, but the way there is not clear: he stays; it says so)
        this.stats.blocked++;
        this.cord = { end: at(tg), t: 0, phase: 'out', then: () => { g.hud.toast('e2_toast_noroute'); this.sound('twang'); } };
        return true;
      }
      this.cord = { end: at(tg), t: 0, phase: 'out', hold: true, then: () => this.startZip(route, tg) };
    } else if (tg) {
      this.cord = { end: at(tg), t: 0, phase: 'out', then: () => { this.stats.things++; this.sound('reel'); tg.pull(this.hand()); } };
    } else if (e) {
      this.cord = { e, t: 0, phase: 'out', then: () => this.haul(e) };
    } else {
      // nothing it can catch: the cord flies out (stopped by a wall), droops and is reeled in
      this.stats.missed++;
      const d = new THREE.Vector3(aim.x, 0, aim.z).normalize();
      let len = 6;
      for (let s = 0.25; s <= 6; s += 0.25) if (P.solidAt(from.x + d.x * s, from.z + d.z * s, from.y, 0.05)) { len = Math.max(0.3, s - 0.2); break; }
      this.cord = { end: from.clone().addScaledVector(d, len).setY(from.y - 0.5), t: 0, phase: 'out', then: () => this.sound('slack') };
    }
    return true;
  }
  // a route the line may reel him along: nothing solid (walls, railings, fences: the seen-through ones too) within his
  // girth at his knees, chest and head anywhere on it, and no ground above his feet before its end
  clear(pts) {
    const P = this.game.physics, T = P.terrain;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.2));
      for (let j = 1; j <= n; j++) {
        const k = j / n, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = a.z + (b.z - a.z) * k;
        for (const dy of [0.45, 1.0, 1.6]) if (P.solidAt(x, z, y + dy, 0.22)) return false;
        if (!(i === pts.length - 2 && j === n) && T.heightAt(x, z) > y + 0.05) return false;
      }
    }
    return true;
  }
  startZip(route, tg) {
    const h = this.h;
    this.zip = { pts: [h.pos.clone(), ...route.map((p) => new THREE.Vector3(p.x, p.y, p.z))], i: 0, d: 0, tg };
    h.onGround = false; h.vy = 0; h.vel.set(0, 0); h.gravity = null; h.steer = null;
    this.stats.zips++;
    this.sound('reel');
  }
  // Hero.update (actors.js) hands the body over while the line reels him in: it moves him along the route in steps
  // of at most 0.2 m (whatever the frame rate), draws him, and is true while it does
  zipStep(h, dt) {
    const Z = this.zip, P = this.game.physics;
    if (!Z) return false;
    h.prevPos.copy(h.pos);
    let adv = LINE.zip * Math.min(dt, 0.1);
    while (adv > 1e-6 && this.zip) {
      const a = Z.pts[Z.i], b = Z.pts[Z.i + 1], L = a.distanceTo(b);
      if (L < 1e-4) { if (++Z.i >= Z.pts.length - 1) this.endZip(true); continue; }
      const s = Math.min(adv, L - Z.d, 0.2);
      Z.d += s; adv -= s;
      const k = Z.d / L, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = a.z + (b.z - a.z) * k;
      // (the route was checked before he left; a step into something solid now ends it where he is: he falls as
      //  from a jump, and the fall's own recovery catches anything worse)
      if (P.solidAt(x, z, y + 1.0, 0.15)) { this.endZip(false); break; }
      h.pos.set(x, y, z);
      if (Z.d >= L - 1e-6) { Z.i++; Z.d = 0; if (Z.i >= Z.pts.length - 1) this.endZip(true); }
    }
    const dx = h.pos.x - h.prevPos.x, dz = h.pos.z - h.prevPos.z;
    if (Math.hypot(dx, dz) > 1e-3) h.angle = Math.atan2(dx, dz);
    h.speed = 0;
    h.rig.play(this.zip ? 'jump' : h.onGround ? 'idle' : 'fall');
    h.rig.root.position.copy(h.pos); h.rig.root.rotation.y = h.angle; h.rig.plantFrame = h.onGround;
    h.rig.update(dt, 0);
    h.sync();
    return true;
  }
  endZip(ok) {
    const g = this.game, h = this.h, Z = this.zip, P = g.physics;
    this.zip = null;
    if (this.cord) { this.cord.phase = 'back'; this.cord.t = 0; }
    if (!Z) return;
    if (ok) {
      const gy = P.groundAt(h.pos.x, h.pos.z, h.pos.y + 0.6);
      if (Math.abs(gy - h.pos.y) < 0.7) { h.pos.y = gy; h.onGround = true; h.vy = 0; h.rig.land?.(0.5); g.audio.play('land'); }
      Z.tg?.arrived?.();
    }
    h.vel.set(0, 0);
  }
  // the cord caught an enemy: a light one is hauled in, a sentry's shield yanked aside, anything else only twangs it
  haul(e) {
    const g = this.game, h = this.h, C = this.cord;
    if (!e.alive || !e.present) { if (C) C.phase = 'back'; return; }
    e.alert?.(h.pos);
    const y = e.pos.y + (e.aimY ?? 0.8);
    if (e.yank?.()) { this.stats.yanked++; g.audio.play('clang'); g.particles.burst(e.pos.x, y, e.pos.z, '#ffe0a0', 10, 2.5); if (C) C.holdT = 0.3; return; }
    if (!LIGHT(e)) {
      this.stats.heavy++; this.sound('twang'); g.particles.burst(e.pos.x, y, e.pos.z, '#e8d4a0', 6, 1.5);
      if (!this.heavySaid) { this.heavySaid = true; g.hud.toast('e2_toast_heavy'); }
      if (C) C.holdT = 0.15;
      return;
    }
    const d = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z);
    this.hauls = this.hauls.filter((p) => p.e !== e);
    this.hauls.push({ e, left: Math.max(0, d - LINE.pullTo) });
    e.kb?.set(0, 0);
    // (a bite or a shot being wound up is cut short; it needs a moment before the next)
    if (e.state === 'windup' || e.state === 'lunge') { e.state = 'chase'; e.stateT = 0; if ('bit' in e) e.bit = false; if (e.aimLine) e.aimLine.visible = false; g.combatDir?.done(e); }
    if ('coolT' in e) e.coolT = Math.max(e.coolT || 0, 0.9);
    this.stats.hauled++;
    this.sound('reel');
    if (C) C.holdT = 0.5;
  }
  // the hauls: toward him, in steps of at most 0.2 m through the physics (walls and the sea's edge stop them)
  stepHauls(dt) {
    const P = this.game.physics, h = this.h;
    for (let i = this.hauls.length - 1; i >= 0; i--) {
      const p = this.hauls[i], e = p.e;
      if (!e.alive || !e.present) { this.hauls.splice(i, 1); continue; }
      const dx = h.pos.x - e.pos.x, dz = h.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
      const step = Math.min(p.left, Math.max(0, d - LINE.pullTo), LINE.pullSpeed * dt);
      const n = Math.max(1, Math.ceil(step / 0.2)), s = step / n;
      let stopped = step <= 1e-4;
      for (let k = 0; k < n && !stopped; k++) {
        const x0 = e.pos.x, z0 = e.pos.z;
        P.move(e, (dx / d) * s, (dz / d) * s);
        if (Math.hypot(e.pos.x - x0, e.pos.z - z0) < s * 0.3) stopped = true;
      }
      p.left = stopped ? 0 : p.left - step;
      if (p.left <= 0.01) { this.hauls.splice(i, 1); e.sync?.(); }
    }
  }
  // the cord in the air: out to its end (then its catch), held while it reels, back into the reel
  stepCord(dt) {
    const C = this.cord, M = this.cordMesh, Tp = this.cordTip;
    if (!C) { M.visible = false; Tp.visible = false; return; }
    C.t += dt;
    const hand = this.hand();
    const end = C.e ? new THREE.Vector3(C.e.pos.x, C.e.pos.y + (C.e.aimY ?? 0.8), C.e.pos.z) : C.end;
    let tip;
    if (C.phase === 'out') {
      const k = Math.min(1, C.t / LINE.out);
      tip = hand.clone().lerp(end, k);
      if (k >= 1) {
        C.t = 0; C.phase = C.hold ? 'hold' : 'back';
        const fn = C.then; C.then = null; fn?.();
        if (this.cord === C && C.holdT > 0 && C.phase === 'back') C.phase = 'hold';
      }
    } else if (C.phase === 'hold') {
      tip = end;
      if (!C.hold && (C.t >= (C.holdT || 0) || (C.e && !C.e.alive))) { C.phase = 'back'; C.t = 0; }
    }
    if (C.phase === 'back') {
      C.from ??= (tip || end).clone();
      const k = Math.max(0, 1 - C.t / LINE.back);
      tip = hand.clone().lerp(C.from, k);
      if (k <= 0) { this.cord = null; M.visible = false; Tp.visible = false; return; }
    }
    const dir = tip.clone().sub(hand), len = dir.length();
    M.visible = len > 0.05; Tp.visible = true;
    M.position.copy(hand);
    if (len > 1e-4) M.quaternion.setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
    M.scale.set(1, Math.max(0.01, len), 1);
    Tp.position.copy(tip);
  }

  // ---------------------------------------------------------------- the heat flask (EQUIP-2b)
  blast(aim) {
    const g = this.game, h = this.h, a = this.arms, F = FLASK;
    if (this.blastCool > 0) return false;
    if (!(a.heat > 0)) { this.stats.cold++; g.hud.toast('e2_toast_cold'); this.sound('click'); return false; }
    a.heat = 0; this.blastCool = F.cool;
    if (aim) h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    this.sound('blast');
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle), ox = h.pos.x + fx * 0.55, oy = h.pos.y + 1.15, oz = h.pos.z + fz * 0.55;
    // the heat let out: a fan of warm puffs as far as it reaches (the soft pool; no light)
    for (let i = 0; i < 16; i++) {
      const j = (i / 15 - 0.5) * 1.6 * F.half, sp = 3.4 + Math.random() * 1.4;
      g.particles.spawn({ x: ox, y: oy, z: oz, vx: Math.sin(h.angle + j) * sp, vy: 0.4 + Math.random() * 0.8, vz: Math.cos(h.angle + j) * sp, color: i % 3 ? '#ffb060' : '#ff7a30', a: 0.6, s0: 0.18, s1: 0.9, life: 0.5, drag: 2.2, add: 0.7, cell: 0, fi: 0.03, fo: 0.5 });
    }
    let n = 0;
    for (const e of g.enemies) {
      if (!e.alive || !e.present) continue;
      const dx = e.pos.x - h.pos.x, dz = e.pos.z - h.pos.z, d = Math.hypot(dx, dz);
      if (d > F.r + (e.hitR || 0.6) * 0.5 || Math.abs(e.pos.y - h.pos.y) > 2) continue;
      const off = Math.atan2(dx, dz) - h.angle;
      if (d > 0.5 && Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) > F.half) continue;
      const ice = isIce(e), dmg = F.dmg * (ice ? F.ice : 1), p = new THREE.Vector3(e.pos.x, e.pos.y + (e.aimY ?? 0.8), e.pos.z);
      const fake = { damage: dmg, charged: false, hits: new Set(), arsenal: true };   // (as weapons.js hitEnemy)
      const res = e.ballHit ? e.ballHit(fake, p) : (e.damage(dmg, p), 'hit');
      g.impact(p.x, p.y, p.z, res === 'blocked' ? 'armor' : 'magic', res, ice ? 1.2 : 0.9);
      if (res !== 'blocked') n++;
    }
    const story = !!g.story.heatHit?.({ x: h.pos.x, y: h.pos.y, z: h.pos.z, fx, fz, r: F.r + 0.8 });
    if (story) this.stats.story++;
    this.stats.blasts++; this.stats.burned += n;
    this.lastBlast = { n, story };
    return true;
  }
  // heat drawn at a source (story/kit2b.js); false without the flask
  warm() {
    const a = this.arms;
    if (!a.heatflask) return false;
    a.heat = FLASK.keep; this.stats.draws++;
    this.sound('draw');
    return true;
  }

  // ---------------------------------------------------------------- each frame (play only)
  update(dt) {
    const g = this.game, h = this.h;
    this.squealCool = Math.max(0, this.squealCool - dt);
    this.jetCool = Math.max(0, this.jetCool - dt);
    this.forkCool = Math.max(0, this.forkCool - dt);
    this.castCool = Math.max(0, this.castCool - dt);
    this.blastCool = Math.max(0, this.blastCool - dt);
    this.stepPushes(dt);
    this.stepHauls(dt);
    this.stepCord(dt);
    if (h.dead && this.zip) this.endZip(false);
    // the flask's heat fades (in play only: a dialogue or a menu holds it)
    const A = this.arms;
    if (A?.heat > 0) { A.heat = Math.max(0, A.heat - dt); if (A.heat === 0) { this.stats.faded++; this.sound('fizz'); g.hud.toast('e2_toast_faded'); } }
    {
      const M = g.weapons?.models || {};
      this.ringGlow = Math.max(0, (this.ringGlow || 0) - dt * 0.7);
      if (M.fork) M.fork.userData.bead.material.emissiveIntensity = 0.6 + 3.2 * this.ringGlow;
      if (M.heatflask) M.heatflask.userData.cell.material.emissiveIntensity = A?.heat > 0 ? 0.5 + 2 * (A.heat / FLASK.keep) : 0;
      if (M.line) M.line.userData.tip.visible = !this.cord && !this.zip;
      // (a warm flask in hand breathes a faint shimmer at its neck, twice a second)
      if (this.held() === 'heatflask' && A?.heat > 0 && g.state === 'play' && (this.wispT -= dt) <= 0) { this.wispT = 0.5; const p = this.hand(); g.particles.burst(p.x, p.y + 0.05, p.z, '#ffd0a0', 1, 0.35); }
    }
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
    // (EQUIP-2b: the cord reeled in, nothing hauled; a reel under way ends — the scene change has placed him)
    this.hauls = []; this.cord = null; this.zip = null;
    this.cordMesh.visible = false; this.cordTip.visible = false;
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
    // EQUIP-2b: the fork's note (a strike, then two pure tones that die away), the line's whip, ratchet and twang, the
    // flask's draw, its whoomp, its cold click and the hiss as the heat fades
    if (kind === 'ring') { au._tone({ type: 'triangle', f0: 2600, f1: 2400, dur: 0.04, vol: 0.03 }); au._tone({ type: 'sine', f0: 1318, f1: 1312, dur: 1.4, vol: 0.045, at: 0.01 }); au._tone({ type: 'sine', f0: 1976, f1: 1970, dur: 0.9, vol: 0.02, at: 0.01 }); }
    if (kind === 'cast') { au._burst({ dur: 0.18, vol: 0.07, f: 1800, f1: 600, type: 'bandpass', q: 2 }); au._tone({ type: 'triangle', f0: 320, f1: 180, dur: 0.07, vol: 0.04 }); }
    if (kind === 'reel') { for (let i = 0; i < 6; i++) au._tone({ type: 'square', f0: 900, f1: 860, dur: 0.02, vol: 0.018, at: i * 0.05 }); }
    if (kind === 'twang') { au._tone({ type: 'triangle', f0: 150, f1: 110, dur: 0.3, vol: 0.05 }); au._tone({ type: 'sine', f0: 300, f1: 220, dur: 0.25, vol: 0.02 }); }
    if (kind === 'slack') { au._burst({ dur: 0.15, vol: 0.03, f: 500, type: 'lowpass', q: 1 }); }
    if (kind === 'blast') { au._burst({ dur: 0.5, vol: 0.12, f: 900, f1: 200, type: 'lowpass', q: 0.8 }); au._tone({ type: 'sine', f0: 90, f1: 50, dur: 0.35, vol: 0.08 }); }
    if (kind === 'click') { au._tone({ type: 'triangle', f0: 1200, f1: 1100, dur: 0.03, vol: 0.03 }); au._burst({ dur: 0.05, vol: 0.02, f: 2000, type: 'bandpass', q: 3, at: 0.02 }); }
    if (kind === 'draw') { au._tone({ type: 'sine', f0: 180, f1: 420, dur: 0.5, vol: 0.04 }); au._burst({ dur: 0.5, vol: 0.04, f: 1200, f1: 2400, type: 'bandpass', q: 1.5 }); }
    if (kind === 'fizz') { au._burst({ dur: 0.6, vol: 0.035, f: 4000, f1: 2000, type: 'highpass', q: 0.7 }); }
  }
}
