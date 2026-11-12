// CAMPAIGN-6 (the user's treatment of 11.11.2026, section 7 "The evacuation — Zoé finds the omission"): chapter 8's lane.
// Not a chapter: evacuation.js owns it (story._ev) and asks it first. The pump room is chapter 2's (pumproom.js, reused:
// its copper pipe, now with the culvert's pipe and cock).
//
// The lane of chapter 2 (Bug Street, Twinsen's own) is the district the evacuation leaves behind. Its old water gate shuts
// itself while the culvert under it is full, and the culvert has filled since the water office was shut down. Arriving on
// the plateau, Twinsen watches the project's list cart come down to the lane's gate with every seat empty, stop, and turn
// away (a cut-away). At home Zoé knows the gate and goes to read the cart's timetable. On her run (played), after the hill
// families and the relay, she reads the SCHEDULE on the lighthouse path's board against the driver's ROUTE: the lane's
// names are on one and crossed off the other. She brings Bram, then Hedda and Tobin to the cart landing inside the gate
// (Pippa is there already, with bread). Back as Twinsen: Bram knows the gate is a float gate; every pipe on the lane meets
// in the pump room. There the culvert's cast-iron pipe drops into the project's copper pipe, which still pulls toward the
// fortress and still kicks three and a rest (harder now: every watt goes to the bore). He opens its cock in a rest (turned
// in a kick, the pipe kicks it back out of his hand: a retry); the culvert drains down the project's own pipe, the float
// drops, the gate swings open. Up on the lane the cart comes in through it; the lane boards (Bram, Hedda, Tobin, and Pippa,
// who is on no list but has bread) and is driven to the bridge, where they stand in the queue for the ships.
//
// Flags (new, saved): ev_v (a game that reached chapter 8 with this thread: set at its start, or on loading a chapter-8 save
// from before whose relay is still ahead), ev_cart (the cart seen at the gate), ev_s, ev_r (the schedule, the route read),
// ev_sched (both read: the lane's part is on), ev_bram, ev_hedda (told), ev_landing (Zoé's part done: Twinsen at the landing),
// ev_in, ev_seen (the pump room, the culvert's pipe), ev_kick (count), ev_gate (the cock open: the gate open), ev_board.
// A save without the marker (from before, past the relay) plays as it did: the gate stands open, no cart, no stop.
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import { buildLaneGate, buildLaneBoard, pathPose } from '../lanegate.js';
import '../text/laneline.js';

const LANE_PEOPLE = ['bram', 'ev_hedda', 'ev_tobin'];
const RIDERS = ['bram', 'ev_hedda', 'ev_tobin', 'pippa'];
const WALK = 2.0, WALK_HARD = 45;
// the box the cart sweeps on its way in and out (the hero is never left standing in it when the cart comes)
const SWEPT = { x0: -47.1, x1: -44.4, z0: 55.0, z1: 64.9 };

export class LaneThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.walks = new Map(); this.later = []; this.scene = null; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.ev_v; }
  // the thread's part of the chapter is over (or there is none)
  get done() { return !this.on || !!this.f.ev_board; }
  get L() { return this.game.world?.laneGate; }
  get R() { return this.game.regions?.built?.('pumproom'); }
  cur() { return this.ch.isCur(); }
  zoeNow() { return this.game.hero.body === 'zoe'; }

  // ---------------------------------------------------------------- world
  decorate() {
    const L = buildLaneGate(this.game);
    buildLaneBoard(this.game);
    return L;
  }
  begin() { this.f.ev_v = 1; }
  // (cur: chapter 8 in progress)
  applyFlags() {
    const f = this.f, g = this.game, cur = this.cur();
    // a save from before the thread, in chapter 8 with the relay still ahead: the lane is on; the arrival is past once home
    if (cur && !f.ev_v && !f.c8_zoeDone && f.c8_started) { f.ev_v = 1; if (f.c8_home) f.ev_cart = 'past'; }   // ('past': counted, not seen: no journal line for it)
    // (a save during Zoé's run resumes before it: evacuation.js; her part of the lane with it)
    if (cur && this.on && f.c8_zoeStart && !f.c8_zoeDone) { for (const k of ['ev_s', 'ev_r', 'ev_sched', 'ev_bram', 'ev_hedda']) delete f[k]; f.c8_relay = false; }
    this.endScene(true); this.walks.clear(); this.later = []; this.passWait = 0;
    const L = this.L;
    if (L) {
      const shut = cur && this.on && !f.ev_gate;
      L.gate.setOpen(!shut, true); L.culvert.setFull(shut, true);
      L.board?.show(cur && this.on);
      L.landing.bundles.visible = cur && this.on && !!(f.ev_bram || f.ev_hedda) && !f.ev_board;
      L.cart.show(false);
    }
    g.regions?.whenBuilt?.('pumproom', (R) => this.pushRoom(R));
  }
  pushRoom(R = this.R) {
    const U = R?.pump, f = this.f; if (!U?.culvert) return;
    U.surge = this.cur() && this.on;
    U.culvert.set(!!f.ev_gate);
    U.culvert.setFull(this.cur() && this.on && !f.ev_gate, true);
  }

  // ---------------------------------------------------------------- people
  spots() {
    const L = this.L, W = this.game.world;
    const nbr = W.houses?.find((h) => h.id === 'nbr');
    const out = nbr ? { x: Math.sin(nbr.ry), z: Math.cos(nbr.ry) } : { x: 1, z: 0 };
    const door = nbr?.door || { x: -31.1, z: 75.3 }, side = { x: -out.z, z: out.x };
    const home = (s) => ({ x: door.x + out.x * 1.7 + side.x * s, z: door.z + out.z * 1.7 + side.z * s, a: Math.atan2(out.x, out.z) });   // (out of their door, facing the street)
    const B = W.spaceport?.bridge;
    const q = (dx, dz) => (B ? { x: B.x1 + dx, z: B.z + dz, a: Math.PI / 2 } : null);
    const ls = L?.landing.spots || [];
    return {
      landing: { bram: ls[0], ev_hedda: ls[1], ev_tobin: ls[2], pippa: ls[3] },
      home: { ev_hedda: home(0.7), ev_tobin: home(-0.7) },
      bridge: { bram: q(-5.0, 0.9), ev_hedda: q(-6.0, 0.5), ev_tobin: q(-6.9, 0.95), pippa: B ? { x: B.x0 + 1.6, z: B.z - 1.1, a: -Math.PI / 2 } : null },
      zoe: { x: -44.9, z: 65.0, a: -2.3 },
    };
  }
  npcDefs() {
    return [
      { id: 'ev_hedda', name: 'n_ev_hedda', char: 'farmerB', dressOf: 'hedda', color: '#f0b8a0', x: -29.4, z: 75.3, angle: Math.PI / 2 },
      { id: 'ev_tobin', name: 'n_ev_tobin', char: 'farmerA', color: '#c8b088', x: -29.4, z: 76.7, angle: Math.PI / 2 },
    ];
  }
  place(id) {
    const f = this.f;
    const mine = id === 'ev_hedda' || id === 'ev_tobin';
    if (!this.cur() || !this.on) return mine ? null : undefined;
    if (this.walks.has(id) || this.scene?.ids?.has(id)) return undefined;   // (on his way, or in the cart: left to the thread)
    const S = this.spots();
    if (id === 'worker') return f.ev_board ? undefined : null;   // (driving the list cart on its rounds, out of sight)
    if (id === 'zoe') return f.c8_zoeDone && !f.ev_board ? S.zoe : undefined;
    if (f.ev_board) return S.bridge[id] ? { ...S.bridge[id], anim: null } : (mine ? null : undefined);
    if (id === 'pippa') return f.ev_sched ? { ...S.landing.pippa, anim: null } : undefined;
    if (id === 'bram') return f.ev_bram ? { ...S.landing.bram, anim: null } : undefined;
    if (mine) return f.ev_hedda ? { ...S.landing[id], anim: null } : { ...S.home[id], anim: null };
    return undefined;
  }

  // ---------------------------------------------------------------- objective, map, journal
  objective() {
    const f = this.f, ch = this.ch;
    if (!this.cur() || !this.on || f.ev_board) return null;
    if (f.c8_zoeStart && !f.c8_zoeDone && f.c8_relay) {
      if (!f.ev_sched) return ch.goal('ev_obj_sched') + ch.sub(!!f.ev_s, 'ev_sub_sched') + ch.sub(!!f.ev_r, 'ev_sub_route');
      const n = (f.ev_bram ? 1 : 0) + (f.ev_hedda ? 1 : 0);
      return n < 2 ? ch.goal('ev_obj_lane', { n }) : ch.goal('ev_obj_landing');
    }
    if (!f.c8_zoeDone) return null;
    if (!f.ev_gate) return ch.goal('ev_obj_gate') + ch.sub(!!f.ev_seen, 'ev_sub_culvert') + ch.sub(false, 'ev_sub_cock');
    return ch.goal('ev_obj_board');
  }
  markers() {
    const f = this.f, ch = this.ch, L = this.L;
    if (!this.cur() || !this.on || f.ev_board || !L) return null;
    if (f.c8_zoeStart && !f.c8_zoeDone && f.c8_relay) {
      if (!f.ev_sched) return ch.stars(L.board);
      const who = [];
      if (!f.ev_bram) who.push(ch.starNpc('bram'));
      if (!f.ev_hedda) who.push(ch.starNpc('ev_hedda'));
      return who.length ? ch.stars(who) : ch.stars(L.landing);
    }
    if (!f.c8_zoeDone) return null;
    if (!f.ev_gate) return ch.stars(this.game.world.pumpKiosk);
    return ch.stars(L.landing);
  }
  journal() {
    const f = this.f;
    if (!this.on) return [];
    return [{ key: 'ev_j_cart', done: f.ev_cart === true }, { key: 'ev_j_sched', done: !!f.ev_sched && !!f.c8_zoeDone }, { key: 'ev_j_lane', done: !!f.ev_landing },
      { key: 'ev_j_gate', done: !!f.ev_gate }, { key: 'ev_j_board', done: !!f.ev_board }].filter((l) => l.done);
  }
  // the chapter's control room waits for the lane (evacuation.js asks)
  ready() { return this.done; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, L = this.L, h = g.hero;
    if (!this.cur() || !this.on || this.scene) return;
    if (!g.room && L?.board && this.zoeNow() && f.c8_relay && !f.ev_sched) {
      consider(dist(L.board.sched.front.x, L.board.sched.front.z), 0.75, { kind: 'ev_sched', label: 'p_sched' });
      consider(dist(L.board.route.front.x, L.board.route.front.z), 0.75, { kind: 'ev_route', label: 'p_route' });
    }
    const U = this.R?.pump;
    if (g.room?.id === 'pumproom' && U?.culvert && f.c8_zoeDone && !this.zoeNow()) {
      // (one thing: looked at first — the pipe out of the floor grate, where it goes —, then its cock is turned)
      if (!f.ev_seen || f.ev_gate) consider(dist(U.culvert.x, U.culvert.z), 1.0, { kind: 'ev_culvert', label: 'p_look' });
      else consider(dist(U.culvert.x, U.culvert.z), 1.0, { kind: 'ev_cock', label: 'p_cock' });
    }
    void h;
  }
  interact(it) {
    const g = this.game, f = this.f, ch = this.ch;
    switch (it.kind) {
      case 'ev_sched': case 'ev_route': {
        const k = it.kind === 'ev_sched' ? 'ev_s' : 'ev_r';
        g.audio.play('paper');
        ch.chain([['zoe', it.kind === 'ev_sched' ? 'ev_z_sched' : 'ev_z_route']], () => {
          f[k] = true; g.updateObjective(); g.save(false);
          if (f.ev_s && f.ev_r && !f.ev_sched) ch.chain([['zoe', 'ev_z_both'], ['zoe', 'ev_z_go']], () => { f.ev_sched = true; this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false); });
        });
        return true;
      }
      case 'ev_culvert': {
        const first = !f.ev_seen;
        ch.chain([['hero', f.ev_gate ? 'ev_cock_look' : 'ev_culvert']], () => { if (first) { f.ev_seen = true; g.updateObjective(); g.save(false); } });
        return true;
      }
      case 'ev_cock': this.turnCock(); return true;
    }
    return false;
  }
  // his hand on the culvert's cock: in a kick the copper pipe kicks it back out of his hand; in the rest it turns
  turnCock() {
    const g = this.game, f = this.f, ch = this.ch, h = g.hero, U = this.R?.pump;
    if (!U?.culvert) return;
    this.busy = true;
    handTo(h, U.culvert, () => {
      if (f.ev_gate) { this.busy = false; return; }
      if (U.kicking()) {
        U.culvert.jolt(); U.shake('copper', 0.4); g.audio.play('clunk', U.culvert); g.audio.play('pipeKnock', U.culvert);
        f.ev_kick = (f.ev_kick || 0) + 1;
        if (f.ev_kick === 1) ch.chain([['hero', 'ev_kick_1']], () => { this.busy = false; g.save(false); });
        else { g.hud.toast('ev_toast_kick'); this.busy = false; }
        return;
      }
      f.ev_gate = true; f.ev_seen = true;
      U.culvert.set(true); U.culvert.setFull(false); U.shake('copper', 1.2);
      g.audio.play('valve', U.culvert); g.audio.play('gurgle', U.sumpAt); g.audio.play('waterRun', U.sumpAt);
      const L = this.L;
      if (L) { L.gate.setOpen(true, true); L.culvert.setFull(false, true); }
      g.updateObjective(); g.save(false);
      this.after(1.6, () => { g.audio.play('clang', U.sumpAt); g.camRig?.shake?.(0.05); });
      this.after(2.0, () => ch.chain([['hero', 'ev_cock_open'], ['hero', 'ev_gate_clank']], () => { this.busy = false; g.updateObjective(); g.save(false); }));
    });
  }
  // the people: Zoé on her round, Twinsen while they wait, after at the bridge (asked before the town's own talk)
  talkFirst(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.cur() || !this.on || this.scene) return false;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    const isLane = LANE_PEOPLE.includes(id) || id === 'pippa' || id === 'zoe';
    if (!isLane) return false;
    if (f.ev_board) {
      if (id === 'bram') return c([['bram', 'ev_bram_bridge']]);
      if (id === 'ev_hedda') return c([['ev_hedda', 'ev_hedda_bridge']]);
      if (id === 'ev_tobin') return c([['ev_tobin', 'ev_tobin_bridge']]);
      if (id === 'pippa') { ch.chain([['pippa', 'ev_pippa_bridge']], () => g.openShop()); return true; }
      return false;
    }
    if (this.zoeNow() && f.c8_relay) {
      // Zoé's round of the lane (after the board)
      if (id === 'bram') {
        if (!f.ev_sched) return c([['bram', 'ev_bram_z0']]);
        if (!f.ev_bram) return c([['bram', 'ev_bram_z1'], ['zoe', 'ev_zoe_bram'], ['bram', 'ev_bram_z2']], () => { f.ev_bram = true; this.walkTo(npc, this.spots().landing.bram); this.L.landing.bundles.visible = true; g.updateObjective(); g.save(false); });
        return c([['bram', 'ev_bram_wait']]);
      }
      if (id === 'ev_hedda' || id === 'ev_tobin') {
        if (!f.ev_sched) return c([['ev_hedda', 'ev_hedda_z0'], ['ev_tobin', 'ev_tobin_z0']]);
        if (!f.ev_hedda) return c([['ev_hedda', 'ev_hedda_z0'], ['ev_tobin', 'ev_tobin_z0'], ['zoe', 'ev_zoe_hedda'], ['ev_hedda', 'ev_hedda_z1'], ['ev_tobin', 'ev_tobin_z1']], () => {
          f.ev_hedda = true; const S = this.spots().landing;
          for (const k of ['ev_hedda', 'ev_tobin']) { const n = ch.npc(k); if (n?.present) this.walkTo(n, S[k], k === 'ev_tobin' ? 0.6 : 0); }
          this.L.landing.bundles.visible = true; g.updateObjective(); g.save(false);
        });
        return c([[id, id === 'ev_hedda' ? 'ev_hedda_wait' : 'ev_tobin_wait']]);
      }
      if (id === 'pippa' && f.ev_sched) return c([['pippa', 'ev_pippa_land']]);
      return false;
    }
    if (!this.zoeNow() && f.c8_zoeDone) {
      // Twinsen, while they wait at the landing for the gate
      if (id === 'zoe') return c([['zoe', 'ev_zoe_wait']]);
      if (id === 'bram') return c([['bram', 'ev_bram_wait']]);
      if (id === 'ev_hedda') return c([['ev_hedda', 'ev_hedda_wait']]);
      if (id === 'ev_tobin') return c([['ev_tobin', 'ev_tobin_wait']]);
      if (id === 'pippa') return c([['pippa', 'ev_pippa_wait']]);
    }
    // Hedda and Tobin at their door before Zoé's round (Twinsen, or Zoé before the board)
    if (id === 'ev_hedda' || id === 'ev_tobin') return c(this.zoeNow() ? [['ev_hedda', 'ev_hedda_z0'], ['ev_tobin', 'ev_tobin_z0']] : [['ev_hedda', 'ev_hedda_tw0'], ['ev_tobin', 'ev_tobin_tw0']]);
    return false;
  }

  // ---------------------------------------------------------------- a person walks to a place (a planned route)
  walkTo(npc, to, delay = 0) {
    if (!npc || !to) return;
    const g = this.game, nav = g.walkers?.nav;
    let pts = [{ x: to.x, z: to.z }];
    try { const j = nav?.planSync({ x: npc.pos.x, z: npc.pos.z }, { x: to.x, z: to.z }); if (j?.ok && j.pts?.length) pts = [...j.pts.slice(1), { x: to.x, z: to.z }]; } catch { /* (no planner: straight) */ }
    npc.controlled = true; npc.talking = false; npc.listenTo = null;
    this.walks.set(npc.def.id, { npc, pts, i: 0, t: -delay, to });
  }
  walkStep(dt) {
    const g = this.game, P = g.physics, W = g.walkers;
    for (const [id, w] of this.walks) {
      const a = w.npc; w.t += dt;
      if (w.t < 0) { a.rig.play('idle'); a.rig.update(dt, 0); a.sync(); continue; }
      const tg = w.pts[w.i];
      const unseen = (p) => !W || W.unseen(p.x, p.z, P.groundAt(p.x, p.z));
      let done = !tg || w.t > WALK_HARD || (w.t > 20 && unseen(a.pos) && unseen(w.to));
      if (!done) {
        const dx = tg.x - a.pos.x, dz = tg.z - a.pos.z, d = Math.hypot(dx, dz);
        if (d < (w.i === w.pts.length - 1 ? 0.25 : 0.6)) w.i++;
        else {
          const hd = Math.atan2(dx, dz), diff = Math.atan2(Math.sin(hd - a.angle), Math.cos(hd - a.angle));
          a.angle += Math.max(-6 * dt, Math.min(6 * dt, diff));
          if (Math.abs(diff) < 1.2) P.move(a, Math.sin(hd) * WALK * dt, Math.cos(hd) * WALK * dt);
        }
        P.fall(a, dt);
        a.rig.play('walk'); a.rig.update(dt, WALK); a.sync();
        done = done || w.i >= w.pts.length;
      }
      if (done) { this.walks.delete(id); a.controlled = false; const p = this.place(id); if (p) a.placeAt(p); }
    }
  }
  finishWalks() { for (const [id, w] of [...this.walks]) { this.walks.delete(id); w.npc.controlled = false; const p = this.place(id); if (p) w.npc.placeAt(p); } }

  // ---------------------------------------------------------------- Zoé's part ends at the landing: back to Twinsen
  handover() {
    const g = this.game, f = this.f, ch = this.ch;
    this.handing = true;
    ch.chain([['pippa', 'ev_pippa_land'], ['zoe', 'ev_zoe_land']], () => {
      f.ev_landing = true;
      ch.backToTwinsen({ x: -46.3, z: 66.2, a: Math.PI }, () => {
        this.handing = false;
        ch.chain([['bram', 'ev_bram_float'], ['hero', 'ev_tw_room']], () => { g.updateObjective(); g.save(false); });
      });
    });
  }

  // ---------------------------------------------------------------- the list cart's scenes
  // 'pass' (the arrival): down to the shut gate, a stop, off to the fields. A cut-away: the camera is the lane's, the hero
  // stands where he is; E / Space skips it after a moment
  pass(done) {
    const L = this.L, g = this.game;
    if (!L) { this.f.ev_cart = true; done?.(); return; }
    const gy = g.physics.groundAt(L.gate.x, L.gate.z);
    this.startScene({ kind: 'pass', legs: [{ path: L.paths.pass, speed: 5, stopAt: L.paths.passStop, stopFor: 1.3 }], done,
      cam: { pos: new THREE.Vector3(-44.4, gy + 3.1, 65.4), look: new THREE.Vector3(-46.2, gy + 0.9, 55.8), fov: 50 } });
  }
  // the boarding: in through the gate to the landing, the lines, the four up, backed out, away to the bridge
  board() {
    const L = this.L, g = this.game, f = this.f, ch = this.ch;
    const gy = g.physics.groundAt(L.landing.x, L.landing.z);
    const cam = { pos: new THREE.Vector3(-41.6, gy + 3.6, 59.6), look: new THREE.Vector3(-46.9, gy + 0.9, 62.6), fov: 50 };
    const riders = RIDERS.map((id) => ch.npc(id)).filter((n) => n?.present);
    this.startScene({ kind: 'board', legs: [{ path: L.paths.come, speed: 3.6, slow: 5 }], cam, riders, done: () => {
      // stopped at the landing: the lines, then up, then away
      g.audio.play('horn', L.landing);
      ch.chain([['worker', 'ev_drv_1'], ['bram', 'ev_bram_board'], ['ev_hedda', 'ev_hedda_board'], ['ev_tobin', 'ev_tobin_board'], ['pippa', 'ev_pippa_board'], ['worker', 'ev_drv_2'], ['pippa', 'ev_pippa_board2'], ['worker', 'ev_drv_3']], () => {
        this.startScene({ kind: 'up', legs: [], cam, riders, keep: true, done: () => {
          this.startScene({ kind: 'away', legs: [{ path: L.paths.back, speed: 2.0, reverse: true }, { path: L.paths.leave, speed: 4.5 }], cam, riders, keep: true, done: () => {
            f.ev_board = true; L.landing.bundles.visible = false;
            this.story.refreshCast();
            ch.chain([['zoe', 'ev_zoe_board'], ['zoe', 'ev_zoe_board2']], () => { g.updateObjective(); g.save(false); });
          } });
        } });
      });
    } });
  }
  startScene(o) {
    const g = this.game, L = this.L, C = L.cart, ch = this.ch;
    const drv = ch.npc('worker');
    const prev = this.scene;
    this.scene = { ...o, t: 0, leg: 0, s: 0, wait: 0, ids: new Set(['worker', ...(o.riders || []).map((n) => n.def.id)]), drv, seated: prev?.seated || new Set(), steps: prev?.steps || new Map(), beat: prev?.beat || null };
    if (drv) { drv.setPresent(true); drv.controlled = true; drv.talking = false; }
    for (const n of o.riders || []) { n.controlled = true; n.listenTo = null; }
    C.show(true);
    if (!o.keep) { const first = o.legs[0]; const p = pathPose(first.path, 0); C.pose(p.x, p.z, p.a); }
    this.poseRiders(0);
    g.setState('cutscene');
    g.cutscene = (dt) => this.stepScene(dt);
    if (!this.scene.beat && o.cam) { const cam = o.cam, b = revealBeat(g, { in: 0.05 }); b?.show(() => ({ pos: cam.pos, look: cam.look, fov: cam.fov }), 0.05); this.scene.beat = b; }
  }
  stepScene(dt) {
    const g = this.game, S = this.scene, L = this.L, C = L.cart, h = g.hero;
    if (!S) return;
    h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
    S.t += dt;
    // (the arrival can be skipped once it has begun: the cart is gone, the line follows)
    if (S.kind === 'pass' && S.t > 0.6 && (g.input.pressed('interact') || g.input.pressed('action') || g.input.pressed('click'))) { this.finishScene(); return; }
    if (S.kind === 'up') { if (this.stepUp(dt)) this.finishScene(); else this.poseRiders(dt); return; }
    const leg = S.legs[S.leg];
    if (!leg) { this.finishScene(); return; }
    // speed: slows into a stop (stopAt) and at the end of a leg that ends the scene's driving (slow)
    const len = pathPose(leg.path, 0).len;
    let v = leg.speed;
    if (leg.stopAt != null && S.s < leg.stopAt) v = Math.max(1.0, Math.min(v, (leg.stopAt - S.s) * 1.6 + 0.6));
    if (leg.slow) v = Math.max(0.8, Math.min(v, (len - S.s) * 1.2 + 0.5));
    if (leg.stopAt != null && S.s >= leg.stopAt && S.wait < leg.stopFor) {
      if (S.wait === 0) g.audio.play('horn', C);
      S.wait += dt;
    } else S.s += v * dt;
    if (Math.floor(S.t * 1.4) !== S.rum) { S.rum = Math.floor(S.t * 1.4); g.audio.play('rumble', C); }
    const p = pathPose(leg.path, S.s);
    C.pose(p.x, p.z, leg.reverse ? p.a + Math.PI : p.a);
    this.poseRiders(dt);
    if (p.end) { S.leg++; S.s = 0; S.wait = 0; if (S.leg >= S.legs.length) this.finishScene(); }
  }
  // the driver on his bench, the riders on theirs (seated) or standing at the landing
  poseRiders(dt) {
    const S = this.scene, C = this.L.cart;
    if (!S) return;
    if (S.drv) { const d = C.driver(); S.drv.pos.set(d.x, d.y, d.z); S.drv.angle = d.a; S.drv.rig.play('sit'); S.drv.rig.update(dt, 0); S.drv.sync(); }
    let i = 0;
    for (const n of S.riders || []) {
      if (S.seated.has(n.def.id)) { const s = C.seat(i); n.pos.set(s.x, s.y, s.z); n.angle = s.a; n.rig.play('sit'); n.rig.update(dt, 0); n.sync(); }
      else if (!S.steps.has(n.def.id)) { n.rig.play('idle'); n.rig.update(dt, 0); n.sync(); }
      i++;
    }
  }
  // the four up, one after another: each walks to the cart's side and climbs onto his bench (true when all are seated)
  stepUp(dt) {
    const S = this.scene, C = this.L.cart, P = this.game.physics;
    const order = S.riders || [];
    for (let k = 0; k < order.length; k++) {
      const n = order[k], id = n.def.id;
      if (S.seated.has(id)) continue;
      if (S.t < k * 0.9) continue;
      const to = C.side(), dx = to.x - n.pos.x, dz = to.z - n.pos.z, d = Math.hypot(dx, dz);
      S.steps.set(id, true);
      if (d < 0.3 || S.t > k * 0.9 + 4) { S.seated.add(id); S.steps.delete(id); this.game.audio.play('step-wood', C); continue; }
      const hd = Math.atan2(dx, dz); n.angle = hd;
      P.move(n, Math.sin(hd) * 1.6 * dt, Math.cos(hd) * 1.6 * dt); P.fall(n, dt);
      n.rig.play('walk'); n.rig.update(dt, 1.6); n.sync();
    }
    return order.every((n) => S.seated.has(n.def.id));
  }
  finishScene() {
    const S = this.scene, g = this.game;
    if (!S) return;
    const done = S.done;
    if (S.kind === 'pass') this.f.ev_cart = true;
    if (S.kind === 'away') this.f.ev_board = true;   // (before the scene is put away: its riders go with the cart, and are placed on the bridge after)
    const next = S.kind === 'board' || S.kind === 'up';   // (the boarding goes on in the next part)
    if (!next) this.endScene(false);
    else { this.scene = { ...S, legs: [], kind: 'held' }; g.cutscene = null; g.setState('play'); }
    done?.();
  }
  // (instant: a load or a reset; the cart and its people are put away at once)
  endScene(instant) {
    const S = this.scene, g = this.game, L = this.L;
    this.scene = null;
    if (L) L.cart.show(false);
    if (S) {
      S.beat?.release(instant ? 0.01 : 0.05);
      if (S.drv) { S.drv.controlled = false; S.drv.setPresent(false); }
      for (const n of S.riders || []) { n.controlled = false; if (!instant && this.f.ev_board) n.setPresent(false); }
      if (g.state === 'cutscene' && g.cutscene) { g.cutscene = null; g.setState('play'); }
    }
  }

  // ---------------------------------------------------------------- what moves
  after(t, fn) { this.later.push({ t, fn }); }
  onEnterRoom(id) {
    const f = this.f, g = this.game;
    if (id === 'pumproom') { this.pushRoom(); if (this.cur() && this.on && f.c8_zoeDone && !f.ev_gate && !f.ev_in) { f.ev_in = true; this.ch.chain([['hero', 'ev_room_in']], () => { g.updateObjective(); g.save(false); }); } }
  }
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, L = this.L;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (!this.cur() || !this.on || !L) return;
    if (this.walks.size) this.walkStep(dt);
    if (g.state !== 'play' || g.trans || this.scene || this.handing || this.busy) return;
    // a save from before (or one made before the arrival was seen): the arrival plays once he is in play outdoors
    if (!f.ev_cart && f.c8_started && !f.c8_home && !f.c8_zoeStart && !g.room) {
      this.passWait += dt;
      if (this.passWait > 0.8) { this.passWait = 0; this.pass(() => this.ch.chain([['hero', 'ev_cart_1']], () => g.save(false))); }
      return;
    }
    // Zoé at the landing with the lane told and arrived
    if (this.zoeNow() && f.c8_zoeStart && !f.c8_zoeDone && f.ev_bram && f.ev_hedda && !this.walks.size && !g.room && Math.hypot(h.pos.x - L.landing.x, h.pos.z - L.landing.z) < 4.2) { this.handover(); return; }
    // the gate open and he is up in the lane, out of the cart's way: it comes
    if (!this.zoeNow() && f.ev_gate && !f.ev_board && !g.room && Math.hypot(h.pos.x - L.landing.x, h.pos.z - L.landing.z) < 24
      && !(h.pos.x > SWEPT.x0 && h.pos.x < SWEPT.x1 && h.pos.z > SWEPT.z0 && h.pos.z < SWEPT.z1)) this.board();
  }
}
