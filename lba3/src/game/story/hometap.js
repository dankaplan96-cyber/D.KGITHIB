// CAMPAIGN-1 (the user's treatment of 11.11.2026, section 1 "Home — the water stops"): chapter 1's household problem,
// played before anything needs saving. It continues from the opening film (the tap coughed, ran warm, stopped again;
// "I'll check the well"; Zoé: "I'll ask next door"): it does not show those again.
//
//   1. The kitchen. Arthur is at his boat; Zoé has gone next door, as the film showed. The brass pipe over the sink knocks
//      by itself until Twinsen tries the tap: he holds his hand under the spout (not a drop; the pipe shakes on the wall)
//      and Arthur says it has knocked like that since breakfast. Optional: the door only waits for the magic ball (the
//      film's "Take your magic ball").
//   2. The yard. The garden standpipe by the door: his hand on its handle, it knocks too ("it runs under the lane, toward
//      the square"); up the lane the pipe at the pump room's door knocks as he passes. The project's fitters left spare
//      pipe lengths on the path (a low stack: jumped in Athletic, or walked round).
//   3. The well's bottom. The pool at the shaft's foot is warm to his hand; when the pump starts above, the crystals
//      grown on the old masonry lean toward it. Sendell's words stay as they were. His last thought gives the reason to
//      stay on Citadel: the pump runs in cycles, and he wants to watch the next.
//
// OPENING-TUT (the user, 14.11.2026): Arthur's cup objective is gone (its cup, trivet, overflow pipe, lines and the door
// that waited for it). Flags (saved): pr_v2 (a game begun with this thread), pr_tap, pr_yard, pr_lane, pr_pool,
// pr_growth, pr_arTrick. A save from before has no pr_v2: every step counts as done and the chapter plays as it did; a
// save with pr_cup or pr_zoeOut (the cup's flags) loads and plays on: they are no longer read.
// Not a chapter: story/prologue.js owns it and asks it first (as chapter1.js asks depotwatch.js).
import * as THREE from 'three';
import { t as tr } from '../i18n.js';
import { mergeStatic } from '../../engine/merge.js';
import { buildPumpKiosk } from '../pumproom.js';
import { touch, handTo } from './reach.js';
import '../text/thread.js';


const YARD = { x: -43.9, z: 74.7 };      // the garden standpipe: across the path from the door, where the lane's pipe ends
const POOL = { x: -8.0, z: 1.9, r: 0.6, h: 0.44 };   // the catch basin at the foot of the shaft, the cave's frame (interiors.js buildWell): knee high, so a hand reaches its water
const GROW = { x: -3.0, z: 1.5, r: 0.7 };    // the slate pillar nearest the shaft: the growth is on its west side

export class HomeTap {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.knockT = 2; this.parts = {}; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.pr_v2 && this.ch.isCur() && !this.f.prologueDone; }
  // the kitchen pipe knocks by itself until he has tried the tap (a save from before the thread: never)
  get indoors() { return this.on && !this.f.pr_tap; }

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
      // his hand on the handle on top (the set-down clip's hand height, 1.05 m: the handle's top is 1.04), from the path's
      // side, facing west (OPENING-TUT: the water inspected by hand, as at the kitchen tap)
      const hand = touch(YARD.x, YARD.z, -Math.PI / 2, 'setDown');
      P.yard = { grp, stream, x: YARD.x, z: YARD.z, y: gy, t: null, hand, front: hand.front };
      // the pump room's door on the lane (src/game/pumproom.js): shut in this chapter; its pipe knocks
      P.kiosk = W.pumpKiosk || buildPumpKiosk(g);
    }
    const H = g.regions?.built?.('house');
    if (!P.house && H?.kitchen && H.group) {
      const K = H.kitchen, o = H.group.position, BZ = K.spout.z - o.z - 0.27, bx = K.spout.x - o.x;
      // the supply: a brass riser up the wall beside the picture, an elbow across to the tap's plate (it shakes: kept apart)
      const pipe = new THREE.Group(); pipe.position.set(bx - 0.27, 0, BZ + 0.035); pipe.userData.keep = true; H.group.add(pipe);
      const pm = (geo, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, brass); m.position.set(x, y, z); m.rotation.z = rz; pipe.add(m); };
      pm(new THREE.CylinderGeometry(0.02, 0.02, 1.55, 8), 0, 1.3 + 0.775, 0);
      pm(new THREE.CylinderGeometry(0.02, 0.02, 0.27, 8), 0.135, 1.3, 0, Math.PI / 2);
      pm(new THREE.SphereGeometry(0.03, 8, 6), 0, 1.3, 0);
      for (const y of [1.75, 2.45]) pm(new THREE.TorusGeometry(0.028, 0.008, 5, 10), 0, y, 0);
      mergeStatic(pipe, { recolor: false });
      // (the kitchen floor wet in front of the sink: chapter 2, the tap Arthur left open; story/pumpline.js)
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshStandardMaterial({ color: '#6fa8c8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.25, 0.8, 1); puddle.position.set(bx + 0.1, 0.012, BZ + 1.05); puddle.visible = false; H.group.add(puddle);
      // his hand under the spout, over the basin's front (the tap's handle is at the wall, out of an arm's reach across
      // the sink)
      const tap = touch(K.spout.x + 0.18, o.z + BZ + 0.44, Math.PI, 'setDown');
      P.house = { H, K, o, BZ, pipe, puddle, shake: 0, tap, spout: { x: K.spout.x, z: K.spout.z }, front: tap.front };
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
  // a new game's first frame of play (the things were built before its flags were set)
  reset() { this.setGrowth(0); }
  setGrowth(k) { const C = this.parts.cave; if (!C) return; C.lean = k; C.growth.rotation.z = -0.22 * k; C.growth.scale.y = 1 + 0.12 * k; }

  // ---------------------------------------------------------------- the story's hooks (prologue.js asks first)
  // (OPENING-TUT: the cup's hooks are gone: Zoé is not held at the sink, the door does not wait, the objective is the
  //  chapter's own "Check the well" with the ball's step. Nothing here holds the player.)
  interactables(consider, dist) {
    const g = this.game, P = this.parts.house, Y = this.parts.yard;
    if (this.on && g.room?.id === 'house' && P) consider(dist(P.tap.x, P.tap.z), 1.45, { kind: 'h_tap', label: 'p_tap' });
    // the garden standpipe: his hand on it (from the path; not from the other side of the lane's pipe)
    if (this.on && !g.room && Y && Math.abs(g.hero.pos.y - Y.y) < 0.6) consider(dist(Y.x, Y.z), 1.5, { kind: 'h_yard', label: 'p_tap' });
    const C = this.parts.cave;
    if (this.on && C && g.room === C.R) {
      consider(dist(C.pool.x, C.pool.z), 1.6, { kind: 'h_pool', label: 'p_feel' });
      if (this.f.pr_growth) consider(dist(C.grow.x, C.grow.z), 1.3, { kind: 'h_growth', label: 'p_look' });
    }
    const Kk = this.parts.kiosk;
    if (Kk && !g.room && this.ch.isCur()) consider(dist(Kk.door.x, Kk.door.z), 1.5, { kind: 'h_kiosk', label: 'p_door' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, P = this.parts.house, C = this.parts.cave;
    switch (it.kind) {
      case 'h_tap':
        // his hand under the spout (he steps to the sink first): not a drop, and the pipe knocks behind the tiles; Arthur,
        // at his boat, has heard it all morning
        handTo(h, P.tap, () => {
          this.knock(true);
          if (f.pr_tap) { ch.chain([['hero', 'prh_tap_2']]); return; }
          const ar = this.ch.speaker('arthur'), near = ar?.present && ar.distTo(h) < 8;
          ch.chain([['hero', 'prh_tap_1'], ...(near ? [['arthur', 'prh_ar_knock']] : [])], () => { f.pr_tap = true; g.updateObjective(); g.save(false); });
        });
        return true;
      case 'h_yard': {
        // his hand on the garden standpipe's handle: dry, and it knocks too; the sound runs on under the lane
        const Y = this.parts.yard;
        handTo(h, Y.hand, () => {
          this.rattle('yard');
          ch.chain([['hero', f.pr_yard ? 'prh_yard_2' : 'prh_yard']], () => { if (!f.pr_yard) { f.pr_yard = true; g.updateObjective(); g.save(false); } });
        });
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
  // Arthur at his boat, in the house: the morning (before the ball), then the trick he wants to see (once)
  talk(npc) {
    const f = this.f, ch = this.ch, id = npc.def.id, g = this.game;
    if (!this.on || g.room?.id !== 'house' || id !== 'arthur') return false;
    if (!g.hero.hasBall) { ch.chain([['arthur', f.pr_tap ? 'prh_ar_knock2' : 'prh_ar_boat']]); return true; }
    if (!f.pr_arTrick) { ch.chain([['arthur', 'prh_ar_trick']], () => { f.pr_arTrick = true; g.save(false); }); return true; }
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
      // the pipe's shake
      if (P.shake > 0) { P.shake = Math.max(0, P.shake - dt); P.pipe.rotation.z = Math.sin(g.time * 55) * 0.012 * P.shake; P.pipe.position.y = Math.sin(g.time * 70) * 0.004 * P.shake; }
      // the wall knocks by itself until he has tried the tap (what draws him to the sink: no marker)
      if (this.indoors && g.room === P.H && g.state === 'play' && (this.knockT -= dt) <= 0) { this.knockT = 5.5; this.knock(); }
    }
    // the yard's standpipe knocks once as he first comes by (its prompt is his to take); the lane's pipe at the pump
    // room's door, as he passes it: the sound runs toward the square
    if (this.on && !g.room && g.state === 'play' && !g.trans) {
      if (Y && !this.yardHeard && !f.pr_yard && Math.hypot(h.pos.x - Y.x, h.pos.z - Y.z) < 3.4) { this.yardHeard = true; this.rattle('yard'); }
      else if (Kk && !f.pr_lane && !this.pendingLine && Math.hypot(h.pos.x - Kk.pipe.x, h.pos.z - Kk.pipe.z) < 3.6) {
        f.pr_lane = true; this.rattle('kiosk');
        this.pendingLine = { t: 0.9, fn: () => this.ch.chain([['hero', f.pr_yard ? 'prh_lane' : 'prh_lane0']], () => g.save(false)) };
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
    this.later = []; this.pendingLine = null; this.pumpIn = null; this.yardHeard = false;
    this.build();
    const C = this.parts.cave; if (C) { C.pump = null; this.setGrowth(f.pr_growth || !f.pr_v2 ? 1 : 0); }
    if (this.parts.house) this.parts.house.shake = 0;
  }
}

