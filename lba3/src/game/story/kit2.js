// EQUIP-2a in the world: where LBA3's first two own tools come from, their first lessons and their puzzles (the tools
// themselves: src/game/tools.js; the concepts: docs/future/EQUIP2_CONCEPTS.md items 1 and 2). Not a chapter: the
// director (index.js) asks it after the chapter in progress, as the arsenal (arsenal.js). Its story state is flags
// prefixed e2_; what Twinsen owns is game.hero.arms.pocketset / lance / water (saved with the hero).
//
//   Arthur's pocket set (chapter 2, The Joint Project, after its radio scene; and later): on the rug in Arthur's toy corner, by his radio. Arthur
//     calls out to it once when Twinsen comes home; talking to him or taking it, Arthur explains (or his note does).
//     Its lesson: "something hums in the cellar" — with the set in hand the cellar whistles and the needle leads to a
//     loose tile in the south-east corner; under it Twinsen's old tin (a clover, or 10 kashes when he has nine; once).
//     Nothing else shows the tile: without the set there is no prompt. In fights: the squeal (the depot's drones).
//   Bram's pump lance (chapter 2 on, Bram's thanks after The Old Pump: life.js gives it after his clover; a save from
//     before EQUIP-2a, thanks already said, gets it on the next talk). It comes full. Its lesson is at the lane: the
//     trough fills it, and Bram's old stop-cock beside the project's heat pipe is too hot to touch — a jet cools it
//     for VALVE_COOL s, then it turns and fills his basin across the path (5 kashes from Bram, once; the basin is
//     water to fill from after that). The second use in chapter 2: Nell's coupler, glowing on her bench, settles under
//     a jet where it stands (life.js jetCool) — the other way to the barrel's dip. Water: the trough (once the pump
//     runs), the basin, the square's well, Nell's barrel, the sea's edge.
// Nothing on the main path needs either tool; both stay optional where the old arsenal is (the ball still does the
// fighting: the squeal and the jet do no damage).
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import { MAT, rbox, cyl, lathe, torus, Kit } from '../props.js';
import { pocketSetModel, LANCE } from '../tools.js';
import { WATER_FLOOR } from '../../engine/physics.js';
import '../text/kit2.js';

const SPOT = {
  set: { x: 3.5, z: 1.95, a: -0.5 },     // house-local: on the rug in Arthur's toy corner, between his boat and the radio's table
  tin: { x: 3.55, z: 3.45 },             // cellar-local: a loose floor tile in the south-east corner
};
const VALVE_COOL = 25;   // s a jet keeps the stop-cock cool enough to turn
const FILL_R = 1.15;     // m: near enough to water to fill the tank

export class Kit2 extends ChapterBase {
  get A() { return this.game.hero.arms; }
  roomId() { return this.game.room?.id ?? 'citadel'; }
  canUse() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  // the lance's lane: from chapter 2 (The Joint Project), as Citadel's side stories (life.js)
  get open() { return this.story.index >= 1; }
  // Arthur's set: once his radio has caught Baldino (chapter 2's radio scene), and in every later chapter
  get setReady() { return this.story.index >= 2 || !!this.f.c1_radio; }

  // ---------------------------------------------------------------- the props
  decorate() {
    const g = this.game, R = g.rooms, P = g.physics;
    const holder = (room, x, y, z, ry = 0) => { const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; room.group.add(grp); return grp; };
    const world = (grp) => { const v = new THREE.Vector3(); grp.getWorldPosition(v); return { x: v.x, y: v.y, z: v.z }; };
    // ---- Arthur's pocket set on the rug
    if (R.house && this.once('set')) {
      const s = SPOT.set, grp = holder(R.house, s.x, 0.02, s.z, s.a);
      const m = pocketSetModel(); m.rotation.set(-Math.PI / 2 + 0.15, 0, 0); m.position.set(0, 0.035, 0.1); m.scale.setScalar(1.25); grp.add(m);
      this.set = { grp, ...world(grp) };
    }
    // ---- the cellar's loose tile, and Twinsen's old tin under it
    if (R.cellar && this.once('tin')) {
      const s = SPOT.tin, grp = holder(R.cellar, s.x, 0, s.z, 0.12);
      const tile = new THREE.Mesh(rbox(0.5, 0.035, 0.5, 0.01), MAT.flat('#a86a40', 0.6)); tile.position.y = 0.022; tile.rotation.y = 0.05; grp.add(tile);
      const hole = new THREE.Mesh(rbox(0.44, 0.01, 0.44, 0.005), MAT.flat('#1a120c', 1)); hole.position.y = 0.006; hole.visible = false; grp.add(hole);
      const tin = new THREE.Group(); tin.position.set(0, 0.0, 0); tin.visible = false; grp.add(tin);
      const tb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.18), MAT.flat('#6a7a7a', 0.45, { metalness: 0.5 })); tb.position.y = 0.05; tin.add(tb);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.02, 0.19), MAT.flat('#3a6a9a', 0.5, { metalness: 0.3 })); tl.position.y = 0.1; tin.add(tl);
      this.tin = { grp, tile, hole, tin, room: 'cellar', ...world(grp) };
    }
    // ---- the lane: Bram's old stop-cock against the project's heat pipe, and his basin across the path
    const L = g.world?.life;
    if (L?.pump?.valve && this.once('valve')) {
      const v = L.pump.valve, root = new THREE.Group(); root.name = 'kit2lane'; g.scene.add(root);
      // (found, not fixed: the first spot north of the valve box that is level and open)
      const free = (x, z, r) => { const y = P.groundAt(x, z, 30); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, xx = x + Math.sin(a) * r, zz = z + Math.cos(a) * r; if (Math.abs(P.groundAt(xx, zz, y + 1) - y) > 0.25 || P.blockedAt(xx, zz, y, 0.15)) return null; } return P.blockedAt(x, z, y, 0.15) ? null : y; };
      let sc = null;
      for (const [dx, dz] of [[0.5, -1.3], [0.5, -1.7], [0.55, -0.95], [0.5, -2.1]]) { const y = free(v.x + dx, v.z + dz, 0.35); if (y != null) { sc = { x: v.x + dx, z: v.z + dz, y }; break; } }
      sc ??= { x: v.x + 0.5, z: v.z - 1.3, y: P.groundAt(v.x + 0.5, v.z - 1.3, 30) };
      let bs = null;
      for (const [dx, dz] of [[1.6, -1.5], [1.9, -1.9], [1.5, -2.4], [2.2, -1.3]]) { const y = free(v.x + dx, v.z + dz, 0.5); if (y != null) { bs = { x: v.x + dx, z: v.z + dz, y }; break; } }
      bs ??= { x: v.x + 1.6, z: v.z - 1.5, y: P.groundAt(v.x + 1.6, v.z - 1.5, 30) };
      const k = new Kit(root);
      // the stop-cock: an old iron riser out of the ground, a brass hand-wheel on top, a branch pipe toward the basin
      k.add(cyl(0.045, 0.055, 0.7, 8), MAT.iron(), sc.x, sc.y + 0.35, sc.z);
      k.add(cyl(0.07, 0.07, 0.08, 10), MAT.iron(), sc.x, sc.y + 0.72, sc.z);
      const ba = Math.atan2(bs.x - sc.x, bs.z - sc.z), bl = Math.hypot(bs.x - sc.x, bs.z - sc.z);
      k.add(cyl(0.03, 0.03, bl, 6), MAT.iron(), (sc.x + bs.x) / 2, sc.y + 0.05, (sc.z + bs.z) / 2, ba, { rx: Math.PI / 2 });
      // the basin: a round stone bowl on a short foot
      k.add(lathe([[0.001, 0], [0.22, 0], [0.16, 0.1], [0.14, 0.32], [0.38, 0.42], [0.44, 0.58], [0.4, 0.6], [0.36, 0.48], [0.001, 0.46]], 16), MAT.stone('grey', 1), bs.x, bs.y, bs.z);
      k.flush();
      const wheel = new THREE.Group(); wheel.position.set(sc.x, sc.y + 0.8, sc.z); root.add(wheel);
      const wm = MAT.brass();
      const rim = new THREE.Mesh(torus(0.13, 0.018, 6, 18), wm); rim.rotation.x = Math.PI / 2; wheel.add(rim);
      for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(cyl(0.011, 0.011, 0.26, 5), wm); sp.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0, 'YXZ'); wheel.add(sp); }
      const hub = new THREE.Mesh(cyl(0.03, 0.03, 0.04, 8), wm); wheel.add(hub);
      for (const o of wheel.children) o.castShadow = true;
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.37, 18).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7ab8e0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
      water.position.set(bs.x, bs.y + 0.54, bs.z); water.visible = false; root.add(water);
      P.add({ type: 'cyl', x: sc.x, z: sc.z, r: 0.16, top: sc.y + 0.9, noStand: true, seeThrough: true });
      P.add({ type: 'cyl', x: bs.x, z: bs.z, r: 0.42, top: bs.y + 0.6, noStand: true });
      this.valve = { root, wheel, water, x: sc.x, y: sc.y + 0.8, z: sc.z, basin: bs, turnT: 0, wispT: 0 };
    }
    this.applyFlags();
  }

  // ---------------------------------------------------------------- state → world
  regionBuilt() { this.applyFlags(); }
  applyFlags() {
    const f = this.f, A = this.A;
    if (this.set) this.set.grp.visible = !A.pocketset;
    if (this.tin) { const got = !!f.e2_tin; this.tin.tile.position.set(got ? 0.42 : 0, got ? 0.03 : 0.022, got ? 0.12 : 0); this.tin.tile.rotation.y = got ? 0.7 : 0.05; this.tin.hole.visible = got; }
    if (this.valve) this.valve.water.visible = !!f.e2_valve;
  }
  // the things that hum, for the pocket set (tools.js listen): [{ id, room, x, y, z }]
  hums() {
    const out = [];
    if (this.tin && !this.f.e2_tin) out.push({ id: 'tin', room: 'cellar', x: this.tin.x, y: this.tin.y, z: this.tin.z });
    return out;
  }
  journal() {
    const f = this.f, A = this.A;
    return [
      { key: 'e2_j_set', done: !!f.e2_tin, show: !!A.pocketset },
      { key: 'e2_j_valve', done: !!f.e2_valve, show: !!A.lance || !!f.e2_valveSeen },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- water for the lance
  // the water within reach of where he stands (null: none): { x, y, z, what }
  waterNear() {
    const g = this.game, h = g.hero, f = this.f, L = g.world?.life, near = (x, z, r) => Math.hypot(x - h.pos.x, z - h.pos.z) < r;
    if (g.room) return null;
    if (L?.trough && f.l_pump) { const x = L.trough.x + 0.75, z = L.trough.z; if (near(x, z, FILL_R)) return { x: L.trough.x, z, what: 'trough' }; }
    if (this.valve && f.e2_valve && near(this.valve.basin.x, this.valve.basin.z, FILL_R + 0.3)) return { x: this.valve.basin.x, z: this.valve.basin.z, what: 'basin' };
    const W = g.world;
    if (W?.well && near(W.well.x, W.well.z, 2.3)) return { x: W.well.x, z: W.well.z, what: 'well' };
    const B = L?.shop?.barrel;
    if (B && this.story.life.cs !== 'hot' && near(B.x, B.z, FILL_R + 0.2)) return { x: B.x, z: B.z, what: 'barrel' };
    // the sea's edge: open water within a long step of his feet, and he near its level
    if (h.pos.y < 1.6) {
      const P = g.physics;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, x = h.pos.x + Math.sin(a) * 1.3, z = h.pos.z + Math.cos(a) * 1.3, gi = P.groundInfo(x, z, h.pos.y + 1);
        if (!gi.brick && gi.h < WATER_FLOOR) return { x, z, what: 'sea' };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, A = this.A, here = this.roomId(), h = g.hero;
    if (!this.canUse()) return;
    if (here === 'house' && this.set && !A.pocketset && this.setReady) consider(dist(this.set.x, this.set.z), 1.15, { kind: 'e2_set', label: 'p_take' });
    if (here === 'cellar' && this.tin && !f.e2_tin && A.pocketset && g.gadgets?.tools?.held() === 'pocketset') consider(dist(this.tin.x, this.tin.z), 1.3, { kind: 'e2_tin', label: 'p_lift' });
    if (here !== 'citadel') return;
    if (this.valve && this.open) consider(dist(this.valve.x, this.valve.z), 1.25, { kind: 'e2_valve', label: !f.e2_valve && this.valveCool > 0 ? 'p_turn' : 'p_look' });
    if (A.lance && A.water < LANCE.tank) { const w = this.waterNear(); if (w) consider(Math.max(0.05, dist(w.x, w.z) - 0.8), 1.6, { kind: 'e2_fill', water: w, label: 'p_fill' }); }
    void h;
  }
  interact(it) {
    const g = this.game, f = this.f, A = this.A, h = g.hero;
    const hero = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), done); return true; };
    switch (it.kind) {
      case 'e2_set': {
        const ar = this.speaker('arthur'), home = ar && ar.present && g.room?.id === 'house' && h.distTo(ar) < 9;
        if (home) { this.chain([['hero', 'e2_set_look'], ...this.setLines()], () => this.giveSet()); return true; }
        return hero(['e2_set_look', 'e2_set_note'], () => this.giveSet());
      }
      case 'e2_tin': {
        if (f.e2_tin) return true;
        const T = this.tin;
        h.actAt(T.x, T.z, 'use', 0.7, () => {
          if (f.e2_tin) return;
          f.e2_tin = true; this.applyFlags(); T.tin.visible = true;
          g.audio.play('chest');
          const full = h.clovers >= 9;
          if (full) h.coins += 10; else h.clovers = Math.min(9, h.clovers + 1);
          hero(['e2_tin_lift', full ? 'e2_tin_kashes' : 'e2_tin_clover'], () => { T.tin.visible = false; if (full) g.hud.toast('a_toast_kashes', { n: 10 }); else g.hud.toast('toast_clover_found'); g.hud.stats?.(h); g.save(false); });
        }, 0.3);
        return true;
      }
      case 'e2_valve': {
        const V = this.valve;
        f.e2_valveSeen = true;
        if (f.e2_valve) return hero(['e2_valve_open']);
        if (!(this.valveCool > 0)) return hero([A.lance ? 'e2_valve_hot2' : 'e2_valve_hot']);
        h.actAt(V.x, V.z, 'use', 0.9, () => {
          if (f.e2_valve) return;
          f.e2_valve = true; V.turnT = 1.2; this.valveCool = 0;
          g.audio.play('ropeCreak');
          g.particles.burst(V.basin.x, V.basin.y + 0.6, V.basin.z, '#bfe6ff', 14, 2);
          this.applyFlags();
          const bram = this.speaker('bram'), by = bram?.present && !g.room && h.distTo(bram) < 12;
          // (Bram thanks him there and then; away, he does on the next talk: e2_bramOwes)
          if (by) this.chain([['hero', 'e2_valve_turn'], ['bram', 'e2_bram_valve']], () => this.payValve());
          else { f.e2_bramOwes = true; hero(['e2_valve_turn', 'e2_valve_later'], () => g.save(false)); }
        }, 0.3);
        return true;
      }
      case 'e2_fill': {
        const w = it.water;
        h.actAt(w.x, w.z, 'use', 0.6, () => {
          if (!g.gadgets.tools.fill()) return;
          g.particles.burst(w.x, (w.what === 'sea' ? 0 : g.physics.groundAt(w.x, w.z, h.pos.y + 1)) + 0.5, w.z, '#bfe6ff', 10, 1.8);
          g.hud.toast('e2_toast_filled', { n: LANCE.tank });
          g.hud.weapon?.(h);
        }, 0.25);
        return true;
      }
    }
    return false;
  }
  setLines() { return [['arthur', 'e2_ar_set1'], ['arthur', 'e2_ar_set2'], ['hero', 'e2_tw_set'], ['arthur', 'e2_ar_set3'], ['arthur', 'e2_ar_set4']]; }
  giveSet() {
    const g = this.game, A = this.A;
    if (A.pocketset) return;
    A.pocketset = true; this.f.e2_setHint = true;
    if (this.set) this.set.grp.visible = false;
    g.found('pocketset', 'it_pocketset', () => g.hud.toast('e2_toast_sethow', { w: g.hud.key('weapons'), k: g.hud.key('attack') }));
    g.hud.stats?.(g.hero);
    g.save(false);
  }
  payValve() { const g = this.game, h = g.hero; delete this.f.e2_bramOwes; h.coins += 5; g.audio.play('coin'); g.hud.toast('a_toast_kashes', { n: 5 }); g.hud.stats?.(h); g.save(false); }
  // Bram's thanks after The Old Pump (life.js calls this after his clover; or here on the next talk): his spare pump
  giveLance(intro = false) {
    const g = this.game, A = this.A;
    if (A.lance || !this.canUse()) return false;
    const lines = [['bram', 'e2_bram_l1'], ['bram', 'e2_bram_l2'], ['bram', 'e2_bram_l3']];
    if (intro) lines.unshift(['bram', 'e2_bram_l0']);
    this.chain(lines, () => {
      if (A.lance) return;
      A.lance = true; A.water = LANCE.tank;
      g.found('lance', 'it_lance', () => g.hud.toast('e2_toast_lancehow', { w: g.hud.key('weapons'), k: g.hud.key('attack') }));
      g.hud.stats?.(g.hero);
      g.save(false);
    });
    return true;
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    const g = this.game, f = this.f, A = this.A, id = npc.def.id;
    if (!this.canUse() || !this.open) return false;
    if (id === 'arthur' && this.setReady && !A.pocketset && g.room?.id === 'house' && this.set) { this.chain(this.setLines(), () => this.giveSet()); return true; }
    if (id === 'bram' && f.l_pump && f.l_bramThanks && !A.lance) return this.giveLance(true);
    if (id === 'bram' && f.e2_bramOwes && f.e2_valve) { this.chain([['bram', 'e2_bram_valve']], () => this.payValve()); return true; }
    return false;
  }

  // ---------------------------------------------------------------- the jet (tools.js) meeting the story
  // o: { from, dir (unit), len, end }. True when something here took it.
  jetHit(o) {
    const g = this.game, f = this.f;
    const segD = (x, y, z) => { const vx = x - o.from.x, vy = y - o.from.y, vz = z - o.from.z, t = Math.max(0, Math.min(o.len, vx * o.dir.x + vy * o.dir.y + vz * o.dir.z)); return Math.hypot(vx - o.dir.x * t, vy - o.dir.y * t, vz - o.dir.z * t); };
    if (g.room) return false;
    const V = this.valve;
    if (V && this.open && !f.e2_valve && (segD(V.x, V.y, V.z) < 0.85 || Math.hypot(o.end.x - V.x, o.end.z - V.z) < 0.9)) {
      const first = !(this.valveCool > 0);
      this.valveCool = VALVE_COOL; f.e2_valveSeen = true;
      g.particles.burst(V.x, V.y + 0.1, V.z, '#f4f4f4', 16, 1.0);
      g.gadgets.tools.sound('steam');
      if (first) g.hud.toast('e2_toast_cooled');
      return true;
    }
    const C = g.world?.life?.shop?.coupler;
    if (C && this.story.life.cs === 'bench' && segD(C.x, C.y ?? o.from.y, C.z) < 0.8) return this.story.life.jetCool();
    return false;
  }

  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    this.valveCool = Math.max(0, (this.valveCool || 0) - dt);
    // Arthur calls out to his present when Twinsen comes home (once)
    if (this.set && this.setReady && !this.A.pocketset && !f.e2_setHint && g.state === 'play' && !g.trans && g.room?.id === 'house' && this.canUse()) {
      const ar = this.speaker('arthur');
      if (ar?.present && h.distTo(ar) < 9) { f.e2_setHint = true; this.chain([['arthur', 'e2_ar_hint']]); }
    }
    // the stop-cock: a hot shimmer while the pipe cooks it (only near, outdoors), the wheel's turn once it opens
    const V = this.valve;
    if (V && !g.room) {
      if (V.turnT > 0) { V.turnT = Math.max(0, V.turnT - dt); V.wheel.rotation.y += dt * 4.5; }
      if (!f.e2_valve && this.open && !(this.valveCool > 0) && Math.hypot(V.x - h.pos.x, V.z - h.pos.z) < 14) {
        V.wispT -= dt;
        if (V.wispT <= 0) { V.wispT = 0.55; g.particles.burst(V.x, V.y + 0.08, V.z, '#e8e4dc', 1, 0.5); }
      }
    }
  }
}
