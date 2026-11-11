// CAMPAIGN-1 (the user's treatment of 11.11.2026, section 1 "Home — the water stops"): chapter 1's household problem,
// played before anything needs saving. It continues from the opening film (the tap coughed, ran warm, stopped again;
// "I'll check the well"; Zoé: "I'll ask next door"): it does not show those again.
//
//   1. The kitchen. Zoé is still at the sink, Arthur at his boat. The tap is dry but the brass pipe over the sink knocks:
//      Twinsen holds his hand under the spout (not a drop; the pipe shakes on the wall). Arthur has put his cup under
//      the wrong pipe (the stove boiler's overflow): Twinsen lifts it, carries it in his hand to the sink and puts it
//      under the tap, and one drip falls into it. (Every hand at a real thing: story/reach.js.)
//   2. The yard. The garden standpipe by the door knocks too, and up the lane the pipe at the pump room's door: the sound
//      runs toward the square. (Heard as he passes; no prompt, no marker.)
//   3. The well's bottom. The pool at the shaft's foot is warm to his hand; when the pump starts above, the crystals
//      grown on the old masonry lean toward it. Sendell's words stay as they were. His last thought gives the reason to
//      stay on Citadel: the pump runs in cycles, and he wants to watch the next.
//
// Flags (new, saved): pr_v2 (a game begun with this thread), pr_tap, pr_cup, pr_zoeOut, pr_yard, pr_lane, pr_pool,
// pr_growth. A save from before has no pr_v2: every step counts as done and the chapter plays as it did.
// Not a chapter: story/prologue.js owns it and asks it first (as chapter1.js asks depotwatch.js).
import * as THREE from 'three';
import { t as tr } from '../i18n.js';
import { mergeStatic } from '../../engine/merge.js';
import { buildPumpKiosk } from '../pumproom.js';
import { touch, handTo } from './reach.js';
import '../text/thread.js';


const STX = -3.35;                       // the stove's middle, the house's frame (interiors.js buildHouse)
const YARD = { x: -43.9, z: 74.7 };      // the garden standpipe: across the path from the door, where the lane's pipe ends
const POOL = { x: -8.0, z: 1.9, r: 0.6, h: 0.44 };   // the catch basin at the foot of the shaft, the cave's frame (interiors.js buildWell): knee high, so a hand reaches its water
const GROW = { x: -3.0, z: 1.5, r: 0.7 };    // the slate pillar nearest the shaft: the growth is on its west side
const _v = new THREE.Vector3();

export class HomeTap {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.knockT = 2; this.parts = {}; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.pr_v2 && this.ch.isCur() && !this.f.prologueDone; }
  // the house's steps still to do (a save from before the thread has none)
  get indoors() { return this.on && !this.f.pr_cup; }

  // ---------------------------------------------------------------- the things
  build() {
    const g = this.game, W = g.world, P = this.parts;
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a040', roughness: 0.32, metalness: 0.8 });
    if (!P.yard && W?.root) {
      // the garden standpipe: a brass riser with a tap on a stone foot, a bucket under it
      const gy = g.physics.groundAt(YARD.x, YARD.z);
      const grp = new THREE.Group(); grp.position.set(YARD.x, gy, YARD.z); grp.userData.keep = true; W.root.add(grp);
      const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; grp.add(o); return o; };
      const stone = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.95 }), tin = new THREE.MeshStandardMaterial({ color: '#7f8a94', roughness: 0.5, metalness: 0.6 });
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10), stone, 0, 0.06, 0);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), brass, 0, 0.55, 0);
      add(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), brass, 0.1, 0.92, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.02, 0.026, 0.08, 8), brass, 0.2, 0.88, 0);
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), brass, 0, 1.03, 0);
      add(new THREE.CylinderGeometry(0.13, 0.1, 0.22, 10, 1, true), tin, 0.2, 0.11, 0).material.side = THREE.DoubleSide;
      mergeStatic(grp, { recolor: false });
      g.physics.add({ type: 'cyl', x: YARD.x, z: YARD.z, r: 0.2, top: gy + 1.05, noStand: true, seeThrough: true });
      // (its water, once the houses' line is open again: chapter 2, story/pumpline.js)
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.64, 6), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, transparent: true, opacity: 0.75, emissive: '#5a8ab0', emissiveIntensity: 0.2 }));
      stream.position.set(YARD.x + 0.2, gy + 0.52, YARD.z); stream.visible = false; stream.userData.keep = true; W.root.add(stream);
      P.yard = { grp, stream, x: YARD.x, z: YARD.z, y: gy, t: null };
      // the pump room's door on the lane (src/game/pumproom.js): shut in this chapter; its pipe knocks
      P.kiosk = W.pumpKiosk || buildPumpKiosk(g);
    }
    const H = g.regions?.built?.('house');
    if (!P.house && H?.kitchen && H.group) {
      const K = H.kitchen, o = H.group.position, BZ = K.spout.z - o.z - 0.27, bx = K.spout.x - o.x;
      const iron = new THREE.MeshStandardMaterial({ color: '#3d3f45', roughness: 0.6, metalness: 0.5 });
      // the supply: a brass riser up the wall beside the picture, an elbow across to the tap's plate (it shakes: kept apart)
      const pipe = new THREE.Group(); pipe.position.set(bx - 0.27, 0, BZ + 0.035); pipe.userData.keep = true; H.group.add(pipe);
      const pm = (geo, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, brass); m.position.set(x, y, z); m.rotation.z = rz; pipe.add(m); };
      pm(new THREE.CylinderGeometry(0.02, 0.02, 1.55, 8), 0, 1.3 + 0.775, 0);
      pm(new THREE.CylinderGeometry(0.02, 0.02, 0.27, 8), 0.135, 1.3, 0, Math.PI / 2);
      pm(new THREE.SphereGeometry(0.03, 8, 6), 0, 1.3, 0);
      for (const y of [1.75, 2.45]) pm(new THREE.TorusGeometry(0.028, 0.008, 5, 10), 0, y, 0);
      mergeStatic(pipe, { recolor: false });
      // the stove boiler's overflow: a thin iron pipe out of the tiles over the stove's right end, forward to its front
      // edge and turned down over it (the cup stands under it, where a hand set down from the room meets it: reach.js)
      // (it stands on a little iron trivet on the stove top, 9 cm up: the cup's rim at the height of his set-down hand)
      const cupAt = { x: STX + 0.5, y: 0.965, z: BZ + 0.53 };
      const ov = new THREE.Group(); H.group.add(ov);
      const om = (geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, iron); m.position.set(x, y, z); m.rotation.x = rx; ov.add(m); };
      om(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6), cupAt.x, 1.27, BZ + 0.28, Math.PI / 2);
      om(new THREE.CylinderGeometry(0.014, 0.018, 0.12, 6), cupAt.x, 1.21, cupAt.z);
      { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.008, 5, 12), iron); ring.position.set(cupAt.x, cupAt.y - 0.008, cupAt.z); ring.rotation.x = Math.PI / 2; ov.add(ring);
        for (let i = 0; i < 3; i++) { const t = (i * 2 * Math.PI) / 3; om(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), cupAt.x + Math.cos(t) * 0.044, 0.875 + 0.045, cupAt.z + Math.sin(t) * 0.044); } }   // (the trivet)
      mergeStatic(ov, { recolor: true });
      // Arthur's cup: blue enamel, a handle (moved: kept apart)
      const cup = new THREE.Group(); cup.userData.keep = true; H.group.add(cup);
      const enamel = new THREE.MeshStandardMaterial({ color: '#3a6fb0', roughness: 0.35, metalness: 0.2 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.085, 12), enamel); body.position.y = 0.0425; cup.add(body);
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 5, 10, Math.PI), enamel); ear.position.set(0.042, 0.045, 0); ear.rotation.z = -Math.PI / 2; cup.add(ear);
      mergeStatic(cup, { recolor: false });
      // one drop from the spout (shown as it falls)
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.1, emissive: '#5a8ab0', emissiveIntensity: 0.3 }));
      drop.visible = false; H.group.add(drop);
      // in the sink the cup stands in the basin under the spout's line, the watering can beside it
      const sinkAt = { x: bx - 0.13, y: K.basin.y + 0.02, z: K.spout.z - o.z + 0.03 };
      // (the kitchen floor wet in front of the sink: chapter 2, the tap Arthur left open; story/pumpline.js)
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshStandardMaterial({ color: '#6fa8c8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.25, 0.8, 1); puddle.position.set(bx + 0.1, 0.012, BZ + 1.05); puddle.visible = false; H.group.add(puddle);
      // his hand under the spout, over the basin's front (the tap's handle is at the wall, out of an arm's reach across
      // the sink); his hand on the cup on the stove
      const tap = touch(K.spout.x + 0.18, o.z + BZ + 0.44, Math.PI, 'setDown'), cupT = touch(o.x + cupAt.x, o.z + cupAt.z, Math.PI, 'setDown');
      P.house = { H, K, o, BZ, pipe, cup, drop, cupAt, sinkAt, puddle, shake: 0, tap, cupT,
        spout: { x: K.spout.x, z: K.spout.z }, front: tap.front,
        stove: { x: cupT.x, z: cupT.z }, stoveFront: cupT.front,
        zoe: { x: o.x - 0.9, z: o.z + BZ + 1.75, a: Math.atan2(-1.4, -1.48) } };
      this.setCup();
    }
    const R = g.regions?.built?.('well');
    if (!P.cave && R?.group) {
      const o = R.group.position;
      // the catch basin at the shaft's foot: a knee-high drum of dressed slate, warm water at its lip
      const grp = new THREE.Group(); grp.position.set(POOL.x, 0, POOL.z); R.group.add(grp);
      const slate = new THREE.MeshStandardMaterial({ color: '#5d6470', roughness: 0.9 });
      { const d = new THREE.Mesh(new THREE.CylinderGeometry(POOL.r + 0.08, POOL.r + 0.14, POOL.h, 14), slate); d.position.y = POOL.h / 2; d.castShadow = true; grp.add(d);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(POOL.r + 0.04, 0.05, 6, 16), slate); lip.rotation.x = Math.PI / 2; lip.position.y = POOL.h; grp.add(lip); }
      mergeStatic(grp, { recolor: true });
      const water = new THREE.Mesh(new THREE.CircleGeometry(POOL.r, 20), new THREE.MeshStandardMaterial({ color: '#7fd0d8', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78, emissive: '#1f6a78', emissiveIntensity: 0.35 }));
      water.rotation.x = -Math.PI / 2; water.position.set(POOL.x, POOL.h + 0.012, POOL.z); R.group.add(water);
      g.physics.add({ type: 'cyl', x: o.x + POOL.x, z: o.z + POOL.z, r: POOL.r + 0.04, top: 0.75, noStand: true, seeThrough: true });   // (walked round, reached into from beside it)
      // the growth: crystals climbing the old pillar's west side (they lean when the pump runs: kept apart, one draw)
      const glow = new THREE.MeshStandardMaterial({ color: '#d8fbff', emissive: '#56d8ff', emissiveIntensity: 0.9, roughness: 0.25 });
      const growth = new THREE.Group(); growth.position.set(GROW.x - GROW.r - 0.02, 0, GROW.z + 0.1); growth.userData.keep = true; R.group.add(growth);
      for (let i = 0; i < 11; i++) {
        const s = 0.07 + ((i * 7) % 5) * 0.022, c = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), glow);
        c.scale.y = 2.1; c.position.set(-0.04 - (i % 3) * 0.05, 0.25 + i * 0.2, ((i * 5) % 7) * 0.09 - 0.3); c.rotation.set(0.3 * ((i % 4) - 1.5), i, 0.9 + 0.2 * (i % 3)); growth.add(c);
      }
      mergeStatic(growth, { recolor: false });
      P.cave = { R, o, water, growth, glow, lean: 0, pump: null, pool: { x: o.x + POOL.x, z: o.z + POOL.z }, grow: { x: o.x + GROW.x - GROW.r - 0.6, z: o.z + GROW.z } };
      this.setGrowth(this.f.pr_growth || !this.f.pr_v2 ? 1 : 0);
    }
  }
  setCup() {
    const P = this.parts.house; if (!P) return;
    const at = this.f.pr_cup || !this.f.pr_v2 ? P.sinkAt : P.cupAt;
    P.cup.position.set(at.x, at.y, at.z); P.cup.rotation.set(0, 0.6, 0); P.carry = false; P.putT = null;
  }
  // a new game's first frame of play (the things were built before its flags were set)
  reset() { this.setCup(); this.setGrowth(0); }
  setGrowth(k) { const C = this.parts.cave; if (!C) return; C.lean = k; C.growth.rotation.z = -0.22 * k; C.growth.scale.y = 1 + 0.12 * k; }

  // ---------------------------------------------------------------- the story's hooks (prologue.js asks first)
  // Zoé at the sink and Arthur at his boat until the cup stands under the right pipe; then she is next door (as the
  // film said), put there once nobody can see it happen
  place(id) {
    const f = this.f, P = this.parts.house;
    if (!this.on || id !== 'zoe' || f.pr_zoeOut || !P) return undefined;
    return { x: P.zoe.x, z: P.zoe.z, a: P.zoe.a, anim: null };
  }
  canExit() {
    if (!this.indoors || this.f.pr_tap) return true;
    this.ch.chain([['hero', 'prh_leave']]);
    return false;
  }
  objective() {
    const f = this.f, s = (ok, key) => `<span class="s ${ok ? 'ok' : ''}">◆ ${tr(key)}</span>`;
    if (!this.indoors) return null;
    return `<b>${tr('prh_obj')}</b>` + s(!!f.pr_tap, 'prh_sub_tap') + (f.pr_tap ? s(false, 'prh_sub_cup') : '') + (this.game.hero.hasBall ? '' : s(false, 'pr_obj_ball'));
  }
  interactables(consider, dist) {
    const g = this.game, f = this.f, P = this.parts.house;
    if (this.on && g.room?.id === 'house' && P) {
      consider(dist(P.tap.x, P.tap.z), 1.45, { kind: 'h_tap', label: 'p_tap' });
      // (the cup is his to move once the tap has been tried: it stands an arm's length from the sink, and its prompt would take the tap's)
      if (f.pr_tap && !f.pr_cup && !P.carry) consider(dist(P.stove.x, P.stove.z), 1.45, { kind: 'h_cup', label: 'p_cup' });
    }
    const C = this.parts.cave;
    if (this.on && C && g.room === C.R) {
      consider(dist(C.pool.x, C.pool.z), 1.6, { kind: 'h_pool', label: 'p_feel' });
      if (f.pr_growth) consider(dist(C.grow.x, C.grow.z), 1.3, { kind: 'h_growth', label: 'p_look' });
    }
    const Kk = this.parts.kiosk;
    if (Kk && !g.room && this.ch.isCur()) consider(dist(Kk.door.x, Kk.door.z), 1.5, { kind: 'h_kiosk', label: 'p_door' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, P = this.parts.house, C = this.parts.cave;
    switch (it.kind) {
      case 'h_tap':
        // his hand under the spout (he steps to the sink first): not a drop, and the pipe knocks behind the tiles
        handTo(h, P.tap, () => {
          this.knock(true);
          if (f.pr_cup) { this.drip(); ch.chain([['hero', 'prh_tap_3']]); return; }
          if (f.pr_tap) { ch.chain([['hero', 'prh_tap_2']]); return; }
          ch.chain([['hero', 'prh_tap_1'], ['zoe', 'prh_zoe_1'], ['zoe', 'prh_zoe_2'], ['arthur', 'prh_ar_1']], () => { f.pr_tap = true; g.updateObjective(); g.save(false); });
        });
        return true;
      case 'h_cup': {
        // his hand on it on the stove, carried in that hand to the sink, put into the basin under the tap; a drip falls into it
        const set = () => handTo(h, P.tap, () => {
          f.pr_cup = true; P.carry = false; P.putFrom = P.cup.position.clone(); P.putT = 0; g.audio.play('put');
          this.drip();
          ch.chain([['hero', 'prh_cup_2'], ['arthur', 'prh_ar_2'], ['zoe', 'prh_zoe_3']], () => { g.updateObjective(); g.save(false); });
        });
        handTo(h, P.cupT, () => { P.carry = true; g.audio.play('tick'); ch.chain([['hero', 'prh_cup_1']], set); });
        return true;
      }
      case 'h_pool': {
        // he bends to the basin from where he came to it, turned so that his hand (not his chest) is over the water
        const a0 = Math.atan2(C.pool.x - h.pos.x, C.pool.z - h.pos.z), d = POOL.r + 0.44;
        const p = { x: C.pool.x, z: C.pool.z, a: a0 + 0.64, clip: 'pickup', front: { x: C.pool.x - Math.sin(a0) * d, z: C.pool.z - Math.cos(a0) * d } };
        handTo(h, p, () => {
          g.audio.play('trickle');
          g.particles.burst(C.pool.x - Math.sin(a0) * 0.3, POOL.h + 0.05, C.pool.z - Math.cos(a0) * 0.3, '#cfefff', 6, 1.2);
          ch.chain([['hero', f.pr_pool ? 'prh_pool_2' : 'prh_pool_1']], () => { if (!f.pr_pool) { f.pr_pool = true; g.save(false); this.pumpIn = 1.2; } });
        });
        return true;
      }
      case 'h_growth': ch.chain([['hero', 'prh_growth_look']]); return true;
      case 'h_kiosk': g.audio.play('doorLocked'); this.rattle('kiosk'); ch.chain([['hero', 'ct_kiosk_locked']]); return true;
    }
    return false;
  }
  talk(npc) {
    const f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.indoors || this.game.room?.id !== 'house') return false;
    if (id === 'zoe') { ch.chain([['zoe', f.pr_tap ? 'prh_zoe_2' : 'prh_zoe_1']]); return true; }
    if (id === 'arthur') { ch.chain([['arthur', f.pr_tap ? 'prh_ar_1' : 'prh_ar_boat']]); return true; }
    return false;
  }
  journal() {
    const f = this.f;
    return [{ key: 'prh_j_tap', done: true, show: !!f.pr_yard }, { key: 'prh_j_growth', done: true, show: !!f.pr_growth && !!f.pr_v2 }];
  }

  // ---------------------------------------------------------------- what moves
  // three knocks in the pipe (heard where it is), the pipe shaking on the wall
  knock(now = false) {
    const g = this.game, P = this.parts.house;
    if (!P) return;
    const at = { x: P.spout.x, z: P.spout.z };
    P.shake = 0.9;
    for (let i = 0; i < 3; i++) (this.later ||= []).push({ t: (now ? 0.25 : 0) + i * 0.22, fn: () => { g.audio.play('pipeKnock', at); if (g.room === P.H) g.particles.burst(P.spout.x - 0.27, 1.9 + i * 0.2, P.spout.z - 0.2, '#d8cdb8', 2, 0.6); } });
  }
  rattle(which) {
    const g = this.game, T = this.parts[which];
    if (!T) return;
    T.t = 0;
    const at = which === 'kiosk' ? T.pipe : T;
    for (let i = 0; i < 3; i++) (this.later ||= []).push({ t: i * 0.22, fn: () => { g.audio.play('pipeKnock', at); g.particles.burst(at.x, (at.y ?? T.y) + 0.9, at.z, '#b8a890', 3, 0.8); } });
  }
  drip() {
    const P = this.parts.house; if (!P) return;
    P.dripT = 0;
  }
  // the pump starts above the cave: a hum and a thump through the rock, the growth leaning toward it
  pumpStarts() {
    const g = this.game, f = this.f, C = this.parts.cave, ch = this.ch;
    if (!C || f.pr_growth) return;
    f.pr_growth = true;
    C.pump = 0;
    g.audio.play('rumble'); g.audio.play('motor'); g.camRig.shake(0.25);
    const h = g.hero;
    h.angle = Math.atan2(C.grow.x + 0.6 - h.pos.x, C.grow.z - h.pos.z);
    this.pendingLine = { t: 1.6, fn: () => ch.chain([['hero', 'prh_growth_1'], ['hero', 'prh_growth_2']], () => { g.updateObjective(); g.save(false); }) };
  }

  update(dt) {
    const g = this.game, f = this.f, h = g.hero, P = this.parts.house, C = this.parts.cave, Y = this.parts.yard, Kk = this.parts.kiosk;
    if (this.later?.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (this.pendingLine && g.state === 'play' && (this.pendingLine.t -= dt) <= 0) { const fn = this.pendingLine.fn; this.pendingLine = null; fn(); }
    if (P) {
      // the pipe's shake, the handle's turn, the cup in his hand, the drop
      if (P.shake > 0) { P.shake = Math.max(0, P.shake - dt); P.pipe.rotation.z = Math.sin(g.time * 55) * 0.012 * P.shake; P.pipe.position.y = Math.sin(g.time * 70) * 0.004 * P.shake; }
      if (P.putT != null) { P.putT += dt; const k = Math.min(1, P.putT / 0.22); P.cup.position.set(P.putFrom.x + (P.sinkAt.x - P.putFrom.x) * k, P.putFrom.y + (P.sinkAt.y - P.putFrom.y) * k, P.putFrom.z + (P.sinkAt.z - P.putFrom.z) * k); if (k >= 1) { P.putT = null; this.setCup(); } }
      if (P.carry) {
        const hand = h.rig.j?.armR?.hand;
        if (hand) { hand.updateWorldMatrix(true, false); hand.getWorldPosition(_v); P.cup.position.set(_v.x - P.o.x, _v.y - 0.06, _v.z - P.o.z); }
      }
      if (P.dripT != null) {
        P.dripT += dt;
        const y0 = P.K.spout.y, y1 = P.sinkAt.y + 0.08, k = Math.min(1, P.dripT / 0.42);
        const sx = P.K.spout.x - P.o.x, sz = P.K.spout.z - P.o.z;
        P.drop.visible = k < 1; P.drop.position.set(sx + (P.sinkAt.x - sx) * k, y0 + (y1 - y0) * k * k, sz + (P.sinkAt.z - sz) * k);
        if (k >= 1) { P.dripT = null; g.audio.play('tick', P.spout); }
      }
      // the wall knocks by itself while the question is open
      if (this.indoors && g.room === P.H && g.state === 'play' && (this.knockT -= dt) <= 0) { this.knockT = 5.5; this.knock(); }
    }
    // the yard's standpipe and the lane's pipe, as he comes by: the sound runs toward the square
    if (this.on && f.pr_tap && !g.room && g.state === 'play' && !g.trans) {
      if (Y && !f.pr_yard && Math.hypot(h.pos.x - Y.x, h.pos.z - Y.z) < 3.4) {
        f.pr_yard = true; this.rattle('yard');
        this.pendingLine = { t: 0.9, fn: () => this.ch.chain([['hero', 'prh_yard']], () => { g.updateObjective(); g.save(false); }) };
      } else if (Kk && f.pr_yard && !f.pr_lane && !this.pendingLine && Math.hypot(h.pos.x - Kk.pipe.x, h.pos.z - Kk.pipe.z) < 3.6) {
        f.pr_lane = true; this.rattle('kiosk');
        this.pendingLine = { t: 0.9, fn: () => this.ch.chain([['hero', 'prh_lane']], () => g.save(false)) };
      }
      // Zoé goes next door (the film's word) once neither her door nor the neighbours' is in view
      if (f.pr_cup && !f.pr_zoeOut) {
        const hs = g.world.houses.find((x) => x.id === 'nbr') || g.world.houses.find((x) => x.id === 'water');
        const far = Math.hypot(h.pos.x - hs.door.x, h.pos.z - hs.door.z);
        if (far > 40 || (far > 12 && this.story.chapters[1]?.unseen?.({ x: hs.door.x, y: g.physics.groundAt(hs.door.x, hs.door.z), z: hs.door.z }))) { f.pr_zoeOut = true; this.story.refreshCast(); }
      }
    }
    for (const T of [Y, Kk]) if (T && T.t != null) { T.t += dt; const k = Math.max(0, 1 - T.t / 0.9); T.grp.rotation.z = Math.sin(T.t * 48) * 0.035 * k; if (k <= 0) { T.t = null; T.grp.rotation.z = 0; } }
    if (C) {
      // the pump's cycle below: first heard a moment after he has felt the water (or as he nears the pillar)
      if (this.on && g.room === C.R && g.state === 'play' && !f.pr_growth) {
        if (this.pumpIn != null && (this.pumpIn -= dt) <= 0) { this.pumpIn = null; this.pumpStarts(); }
        else if (this.pumpIn == null && Math.hypot(h.pos.x - C.grow.x, h.pos.z - C.grow.z) < 2.4) this.pumpStarts();
      }
      if (C.pump != null) {
        C.pump += dt;
        const k = Math.min(1, C.pump / 1.4), e = k * k * (3 - 2 * k);
        this.setGrowth(e);
        C.glow.emissiveIntensity = 0.9 + 1.4 * Math.sin(Math.min(1, C.pump / 2.2) * Math.PI);
        if (C.pump < 2.2 && Math.random() < dt * 14) g.particles.burst(C.grow.x + 0.5, 0.4 + Math.random() * 2.2, C.grow.z + (Math.random() - 0.5) * 0.6, '#bff8ff', 1, 0.9);
        if (C.pump >= 2.4) { C.pump = null; C.glow.emissiveIntensity = 1.1; }
      }
    }
  }

  applyFlags() {
    const f = this.f;
    this.later = []; this.pendingLine = null; this.pumpIn = null;
    // (a game begun with the thread and loaded after the cup: Zoé is next door, as she was)
    if (f.pr_v2 && f.pr_cup) f.pr_zoeOut = true;
    this.build();
    this.setCup();
    const C = this.parts.cave; if (C) { C.pump = null; this.setGrowth(f.pr_growth || !f.pr_v2 ? 1 : 0); }
    if (this.parts.house) { this.parts.house.dripT = null; this.parts.house.drop.visible = false; this.parts.house.shake = 0; }
  }
}

