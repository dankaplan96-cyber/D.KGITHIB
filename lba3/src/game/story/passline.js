// CAMPAIGN-5 (the user's treatment of 11.11.2026, section 5 "Hamalayi — the road under the ice"): the pulse on the
// rope lift's line (chapter 6, The Pass) and the direction it comes from (chapter 7, The Observatory). Not a chapter:
// pass.js and observatory.js own it (one instance for both, story._ps) and ask it first.
//
// Chapter 6. The pass along the ledge is cut; the old rope lift is the only way up, and its line carries the same knock
// as the kitchen wall: three kicks and a rest. The lamps on its rails swing and flicker, the cable jumps, and a kick runs
// down the line into the winch's drum (winchline.js). With the first two of Lhar on the platform Twinsen feels it at the
// crank and reads it on the line's gauge: red in the surge, green in the quiet while a whole trip still fits before the
// next one, amber after. He starts each trip in the quiet; started too late (or in the surge) the next kick stops the
// winch, the crank is kicked out of his hand and the platform runs back down with its riders: a missed start costs the
// trip, nothing more. Yorna cranks him up last in a quiet of her own, and up there he locks the old upper brake: its pawl
// holds the drum through a surge, and the rest of Lhar (Tam and Bodo with the last packs) come up without counting.
//
// Chapter 7. Outside, the snow fields shake in the same threes: powder jumps off them in a line down the mountain. Sefa's
// telescope has a fourth setting that follows that shaking. Twinsen sets it; the tube jerks three times, rests, jerks
// three more and stops pointing below the horizon; on the bearing ring under it he reads where: past the project's heat
// station and Desert Island, to Citadel. Then setting three, the glacier, as before. Opening the vent quiets the mountain.
//
// Flags (new, saved): ps_v (a game that reached chapter 6 with this thread: set at its start, or on loading a chapter-6
// save from before whose first trip is still ahead), ps_lamps, ps_read, ps_miss (count), ps_trip1, ps_trip2, ps_safe;
// ob_v (the same for chapter 7: at its start, or a chapter-7 save from before whose telescope is still unturned),
// ob_snow, ob_follow (the tube has followed the shaking: it points down), ob_dir. A save without the marker (from
// before, past the step) plays as it did: the trips untimed, no brake, the telescope one look.
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import '../text/passline.js';

const FIRST = ['lhar1', 'lhar2'], SECOND = ['yorna', 'pim', 'lhar3'];
const REST = ['lh_tam', 'lh_grum'];   // (storylife.js: the last of Lhar, up once the brake holds)
// chapter 7: the telescope's follow, on its own clock inside the dome (the line's clock runs outdoors): the kicks, the end
const FOLLOW = [0.6, 1.0, 1.4, 4.4, 4.8, 5.2], FOLLOW_END = 6.4;
const MENU = new Set(['pause', 'inventory', 'map', 'shop', 'title', 'loading', 'gameover']);

export class PassThread {
  constructor(story) { this.story = story; this.game = story.game; this.run = null; this.busy = false; this.boarded = 0; this.later = []; this.follow = null; this.followed = false; }
  get f() { return this.game.flags; }
  get key() { return this.story.cur?.key; }
  get ch() { return this.story.cur; }
  get M() { return this.game.regions?.built('hamalayi'); }
  get O() { return this.game.regions?.built('obsv'); }
  get L() { return this.M?.line; }
  get on6() { return !!this.f.ps_v; }
  get on7() { return !!this.f.ob_v; }
  inM() { return this.game.room?.id === 'hamalayi'; }
  // chapter 6's part: the lift ready until the brake is locked
  get open6() { const f = this.f; return this.key === 'pass' && this.on6 && !!f.c6_liftReady && !f.ps_safe; }
  // chapter 7's part: Sendell has spoken, the telescope's fourth setting is ahead
  get open7() { const f = this.f; return this.key === 'observatory' && this.on7 && !!f.c7_sendell && !f.ob_dir; }
  // the line's pulse is on: in chapter 6 (with the thread), and in chapter 7 until the vent breathes
  pulse() { const f = this.f; return (this.key === 'pass' && this.on6) || (this.key === 'observatory' && (this.on7 || this.on6) && !f.c7_vent); }

  // ---------------------------------------------------------------- state
  begin6() { this.f.ps_v = 1; }
  begin7() { this.f.ob_v = 1; }
  applyFlags() {
    const f = this.f;
    this.endRun(); this.boarded = 0; this.busy = false; this.later = []; this.follow = null; this.followed = !!f.ob_follow;
    // a save from before with the step still ahead of it: the thread is on
    if (this.key === 'pass' && !f.ps_v && !f.c6_trip1 && !f.c6_done) f.ps_v = 1;
    if (this.key === 'observatory' && !f.ob_v && !f.c7_scope && !f.c7_done) f.ob_v = 1;
    this.game.regions.whenBuilt('hamalayi', () => this.push());
    this.game.regions.whenBuilt('obsv', () => this.pushObs());
  }
  push() {
    const L = this.L, g = this.game, f = this.f;
    if (!L) return;
    L.active = this.pulse();
    L.hold = () => MENU.has(g.state);
    L.onKick = (i) => this.kicked(i);
    L.onRest = () => this.rested();
    L.brake.set(!!f.ps_safe);
  }
  pushObs() {
    const O = this.O, f = this.f;
    if (!O?.telescope?.pose) return;
    const T = O.telescope;
    if (f.c7_scope) { T.pose('glacier'); T.setting(3); }
    else if (f.ob_dir || f.ob_follow) { T.pose('down'); T.setting(4); }
    else { T.pose('stars'); T.setting(1); }
  }
  // a kick on the line: the knock where he can hear it; in chapter 7 the snow fields shake along the line
  kicked(i) {
    const g = this.game, M = this.M, h = g.hero;
    if (!M || !this.inM()) return;
    const w = M.lift.winch, near = Math.hypot(h.pos.x - w.x, h.pos.z - w.z);
    if (near < 45) { g.audio.play('pipeKnock', w); if (i === 0) g.audio.play('rattle', M.lift.pad); }
    if (near < 9 && g.state === 'play') g.camRig.shake(0.02);
    if (this.key === 'observatory') {
      // (a line from the peak down toward the project's heat station, the kicks marching down it: seen from the yard)
      const A = M.observatory, B = M.heatPost, k = 0.55 + 0.15 * i, x = A.x + (B.x - A.x) * k, z = A.z + (B.z - A.z) * k;
      if (Math.hypot(h.pos.x - x, h.pos.z - z) < 90) {
        const y = g.physics.groundAt(x, z);
        g.particles.burst(x, y + 0.3, z, '#f4f8ff', 18, 2.6);
        g.particles.burst(x + (B.x - A.x) * 0.04, y + 0.3, z + (B.z - A.z) * 0.04, '#e6eef8', 10, 1.8);
        g.audio.play('pipeKnock', { x, z });
      }
    }
  }
  // the lines a step of the chapter says while the line kicks, and the kick timed to them (pass.js: the winch thawed;
  // observatory.js: the chapter's start in the yard): the line's clock put just before a kick as the line shows
  seenLines(flag, key) {
    if (this.f[flag] || !(this.key === 'pass' ? this.on6 : this.on7)) return [];
    this.f[flag] = true;
    return [['hero', key]];
  }
  cue(id, key) { if (id === 'hero' && (key === 'ps_lamps' || key === 'ob_snow')) this.L?.sync(this.L.period - 0.35); }
  // the quiet: the pawl drops back with a click (the cue to start)
  rested() {
    const g = this.game, M = this.M, h = g.hero;
    if (!M || !this.inM() || this.key !== 'pass') return;
    const w = M.lift.winch;
    if (Math.hypot(h.pos.x - w.x, h.pos.z - w.z) < 25) g.audio.play('clunk', w);
  }

  // ---------------------------------------------------------------- chapter 6
  place(id) {
    const f = this.f, M = this.game.rooms.hamalayi;   // (read through rooms: the cast waits for the area)
    if (this.key !== 'pass' || !this.on6) return undefined;
    // the trip's riders, boarded: on the platform at the cliff's foot
    const ids = this.boarded === 1 ? FIRST : this.boarded === 2 ? SECOND : [];
    const i = ids.indexOf(id);
    if (i >= 0) { const p = M.lift.pad; return { x: p.x - 0.8 + i * 0.8, z: p.z, a: Math.PI }; }
    // Yorna stays at the top crank until the brake is locked (she tells him of it)
    if (id === 'yorna' && f.c6_up && !f.ps_safe) { const c = M.lift.crank; return { x: c.x, z: c.z, a: Math.PI }; }
    return undefined;
  }
  // the thread takes the winch (pass.js asks; the old trips are for a game without the thread)
  owns() { return this.open6; }
  objective6() {
    const f = this.f, ch = this.ch;
    if (!this.on6 || !f.c6_liftReady) return null;
    if (f.c6_up) return f.ps_safe ? null : ch.goal('ps_obj_brake');
    if (f.c6_trip2) return null;
    if (f.c6_sword && !f.c6_rope) return null;
    const sub = f.ps_read ? ch.sub(false, 'ps_sub_green') : '';
    if (f.c6_trip1) return ch.mitesLeft?.() > 0 ? null : ch.goal('ps_obj_trip2') + sub;
    return ch.goal('ps_obj_trip1') + sub;
  }
  marker6() {
    const f = this.f, L = this.L;
    if (!this.open6 || !L) return null;
    if (f.c6_up) return L.brake;
    return null;
  }
  interactables(consider, dist) {
    const f = this.f, M = this.M, L = this.L, h = this.game.hero;
    if (!M || !L || !this.inM()) return;
    if (this.key === 'pass' && this.on6) {
      if (L.active && f.c6_thawed) consider(dist(L.gauge.x, L.gauge.z), 1.1, { kind: 'ps_gauge', label: 'p_read' });
      if (this.busy || this.run) return;
      if (f.c6_liftReady && !f.c6_trip2 && Math.abs(h.pos.y - M.lift.y0) < 1.2) {
        const p = L.crank.touch();
        consider(Math.min(dist(p.front.x, p.front.z), dist(M.lift.winch.x, M.lift.winch.z)), 1.7, { kind: 'ps_winch', label: this.boarded && this.boarded === (f.c6_trip1 ? 2 : 1) ? 'p_crank' : 'p_winch' });
      }
      if (f.c6_up && !f.ps_safe) { const p = L.brake.touch(); consider(dist(p.front.x, p.front.z), 1.5, { kind: 'ps_brake', label: 'p_lock' }); }
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, L = this.L, ch = this.ch;
    switch (it.kind) {
      case 'ps_gauge': ch.chain([['hero', 'ps_gauge']]); return true;
      case 'ps_winch': {
        if (!f.c6_rope && f.c6_sword) { ch.chain([['hero', 'c6_rope_frozen']]); return true; }
        if (f.c6_trip1 && ch.mitesLeft() > 0) { ch.chain([['hero', 'c6_trip_wait']]); return true; }
        const trip = f.c6_trip1 ? 2 : 1;
        if (this.boarded !== trip) { this.board(trip); return true; }
        this.busy = true;
        handTo(h, L.crank.touch(), () => this.start(trip));
        return true;
      }
      case 'ps_brake':
        this.busy = true;
        handTo(h, L.brake.touch(), () => {
          L.brake.set(true); g.audio.play('lever', L.brake); g.audio.play('clunk', L.brake);
          f.ps_safe = true; g.save(false);
          ch.chain([['hero', 'ps_brake_on']], () => this.rest());
        });
        return true;
    }
    return false;
  }
  // the riders step onto the platform and he takes the crank (under the black, as the trips always did); the first
  // time, a surge comes as they stand there: he reads it
  board(trip) {
    const g = this.game, f = this.f, M = this.M, L = this.L, ch = this.ch;
    this.busy = true;
    g.startTransition(() => {
      this.boarded = trip;
      this.story.refreshCast();
      const p = L.crank.touch(), h = g.hero;
      h.pos.set(p.front.x, g.physics.groundAt(p.front.x, p.front.z, M.lift.y0 + 1), p.front.z); h.angle = p.a; h.vel?.set(0, 0);
      if (g.camRig.lba) g.camRig.lba.init = false;
      if (!f.ps_read && trip === 1) {
        L.sync(L.period - 1.3);   // (a surge just as they stand there)
        ch.chain([['hero', 'c6_trip1'], ['lhar1', 'ps_read_1'], ['hero', 'ps_read_2'], ['lhar2', 'ps_read_3'], ['hero', 'ps_read_4'], ['hero', 'ps_read_5']], () => {
          f.ps_read = true; this.busy = false; g.updateObjective(); g.save(false);
        });
        return;
      }
      ch.chain([['hero', trip === 1 ? 'c6_trip1' : 'c6_trip2']], () => { f.ps_read = true; this.busy = false; g.updateObjective(); });
    });
  }
  // his hand on the crank: the winch runs. In the surge, or too late in the quiet, the next kick stops it
  start(trip) {
    const g = this.game, M = this.M, L = this.L, lift = M.lift, h = g.hero;
    const riders = (trip === 1 ? FIRST : SECOND).map((id) => this.ch.npc(id)).filter((n) => n?.present);
    this.run = { trip, riders, t: 0, phase: 'up', good: L.green() };
    g.audio.play('liftWinch', lift.winch);
    lift.speed = L.speed;
    lift.ride(true, riders, () => this.arrive());
    g.setState('cutscene');
    g.cutscene = (dt) => { h.vel?.set(0, 0); h.rig.play('tinker'); h.rig.update(dt, 0); h.sync(); this.tick(dt); };
    // (with the beats on: the platform and its rails seen from beside the winch while it rides)
    const B = revealBeat(g, { in: 0.6 }), pad = lift.pad;
    B?.show(() => ({ pos: new THREE.Vector3(pad.x + 6.5, lift.y0 + 3.2, pad.z + 7.5), look: new THREE.Vector3(pad.x, Math.max(lift.y0 + 2, lift.y + 1.2), pad.z - 0.6), fov: 50 }), 0.6);
    this.beat = B;
  }
  tick(dt) {
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    const R = this.run, L = this.L, g = this.game, lift = this.M?.lift;
    if (!R || !lift) return;
    R.t += dt;
    if (R.phase !== 'up' || !L.surging()) return;
    if (R.trip !== 3) { this.slip(); return; }
    // the last of Lhar: the surge comes, the platform jolts and holds a moment on the locked pawl, then rides on
    if (R.held) return;
    R.held = true; this.restHeld = true; lift.halt(); lift.jolt(); g.audio.play('clunk', L.brake); g.audio.play('lever', L.brake);
    this.after(1.4, () => { lift.speed = L.speed; lift.ride(true, R.riders, () => this.restUp(R.riders)); });
  }
  // a surge stopped the winch: the crank kicked out of his hand, the platform jolts and runs back down with them
  slip() {
    const g = this.game, M = this.M, L = this.L, R = this.run, lift = M.lift;
    R.phase = 'down';
    lift.halt(); lift.jolt(); L.crank.kick();
    g.audio.play('clunk', lift.winch); g.audio.play('rattle', lift.pad); g.camRig.shake(0.15);
    this.after(0.6, () => { lift.speed = 2.6; lift.ride(false, R.riders, () => this.back()); });
  }
  back() {
    const g = this.game, f = this.f;
    this.endRun();
    f.ps_miss = (f.ps_miss || 0) + 1;
    this.story.refreshCast();
    if (f.ps_miss === 1) this.ch.chain([['hero', 'ps_missed']], () => { this.busy = false; g.updateObjective(); });
    else { g.hud.toast('ps_toast_missed'); this.busy = false; }
  }
  arrive() {
    const g = this.game, f = this.f, M = this.M, lift = M.lift, R = this.run;
    this.boarded = 0; R.phase = 'return';   // (up: the riders step off; the empty platform's way down is no trip)
    R.riders.forEach((n, i) => n.placeAt({ x: lift.top.x - 0.8 + i * 0.8, z: lift.top.z - 1.5, a: Math.PI }));
    lift.speed = null;
    lift.ride(false, [], () => {
      this.endRun();
      if (R.trip === 1) {
        f.c6_trip1 = true; f.ps_trip1 = true; this.story.refreshCast({ walk: true });
        this.ch.chain([['hero', 'c6_mites']], () => { this.busy = false; g.updateObjective(); g.save(false); });
      } else {
        f.c6_trip2 = true; f.ps_trip2 = true; this.story.refreshCast({ walk: true });
        this.ch.chain([['yorna', 'ps_yorna_top']], () => { this.busy = false; g.updateObjective(); g.save(false); });
      }
    });
  }
  endRun() {
    const g = this.game, lift = this.M?.lift;
    if (lift) lift.speed = null;
    this.beat?.release(0.8); this.beat = null;
    if (this.run && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    this.run = null;
  }
  // the hero's own ride: Yorna cranks in a quiet (pass.js waits for it)
  rideOK() { return !this.on6 || !this.L || this.L.green(); }
  // up: Yorna at the crank tells him of the brake
  atTop() {
    const g = this.game, f = this.f;
    if (!this.on6 || f.ps_safe) return false;
    this.ch.chain([['yorna', 'ps_brake_1'], ['hero', 'ps_tw_brake'], ['yorna', 'ps_brake_2']], () => { g.updateObjective(); g.save(false); });
    return true;
  }
  // the brake locked: the platform goes down and comes up with the last of Lhar; a surge on the way, and it holds
  rest() {
    const g = this.game, M = this.M, L = this.L, lift = M.lift, h = g.hero;
    const riders = REST.map((id) => this.ch.npc(id)).filter((n) => n?.present && !n.inside);
    g.setState('cutscene');
    g.cutscene = (dt) => { h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync(); this.tick(dt); };
    const B = revealBeat(g, { in: 0.6 }), pad = lift.pad;
    B?.show(() => ({ pos: new THREE.Vector3(pad.x + 5.5, lift.y1 + 4.0, pad.z - 7.5), look: new THREE.Vector3(pad.x, lift.y + 1.0, pad.z), fov: 52 }), 0.6);
    this.beat = B;
    const R = (this.run = { trip: 3, riders, t: 0, phase: 'down', held: false });
    lift.speed = 3.2;
    lift.ride(false, [], () => {
      for (const [i, n] of riders.entries()) { n.controlled = true; n.forceAnim = null; n.track = null; n.placeAt({ x: pad.x - 0.5 + i * 1.0, z: pad.z, a: Math.PI }); }
      L.sync(L.period - 1.6);   // (the next surge comes as they ride: the pawl catches it)
      lift.speed = L.speed; R.phase = 'up';
      lift.ride(true, riders, () => this.restUp(riders));
    });
  }
  restUp(riders) {
    const g = this.game, lift = this.M.lift;
    if (this.run) this.run.phase = 'top';
    for (const [i, n] of riders.entries()) n.placeAt({ x: lift.top.x - 0.5 + i * 1.0, z: lift.top.z - 1.5, a: Math.PI });
    // a fade: they go on to the camp, the scene is his again
    g.startTransition(() => {
      for (const n of riders) n.controlled = false;
      this.endRun();
      this.story.refreshCast();
      this.ch.chain([['yorna', 'ps_rest_1'], ['hero', 'ps_tw_rest']], () => { this.busy = false; g.updateObjective(); g.save(false); });
    });
  }
  after(t, fn) { this.later.push({ t, fn }); }

  // ---------------------------------------------------------------- chapter 7
  // Sefa's line after Sendell: the fourth setting first
  keeperLine() { return this.on7 && !this.f.ob_dir ? 'ob_keeper_4' : 'c7_keeper_4'; }
  objective7() {
    if (!this.open7) return null;
    return this.ch.goal(this.followed ? 'ob_obj_read' : 'ob_obj_set');
  }
  // the telescope's own prompts: the setting lever, then the ring (the glacier's turn waits for them)
  scopeOK() { return !this.on7 || !!this.f.ob_dir; }
  interactables7(consider, dist) {
    const O = this.O;
    if (!this.open7 || !O?.telescope?.lever || this.game.room?.id !== 'obsv' || this.follow) return;
    const T = O.telescope;
    if (!this.followed) { const p = T.lever.touch(); consider(dist(p.front.x, p.front.z), 1.5, { kind: 'ob_set', label: 'p_set' }); }
    else consider(dist(T.ring.x, T.ring.z), 1.6, { kind: 'ob_read', label: 'p_read' });
  }
  interact7(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, T = this.O?.telescope;
    switch (it.kind) {
      case 'ob_set':
        this.busy = true;
        handTo(h, T.lever.touch(), () => {
          T.setting(4); g.audio.play('lever', T); for (let i = 0; i < 3; i++) this.after(0.12 * (i + 1), () => g.audio.play('tick', T));
          this.startFollow();
        });
        return true;
      case 'ob_read':
        ch.chain([['hero', 'ob_read_1'], ['keeper', 'ob_keeper_down'], ['hero', 'ob_read_2'], ['keeper', 'ob_keeper_r']], () => {
          f.ob_dir = true; g.updateObjective(); g.save(false);
        });
        return true;
    }
    return false;
  }
  // the tube follows the snow: three jerks, a rest, three more, and it stops pointing down (its own clock: indoors)
  startFollow() {
    const g = this.game, h = g.hero, T = this.O.telescope;
    this.follow = { t: 0, k: 0 };
    g.setState('cutscene');
    g.cutscene = (dt) => {
      h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
      if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
      const F = this.follow; if (!F) return;
      F.t += dt;
      while (F.k < FOLLOW.length && F.t >= FOLLOW[F.k]) { F.k++; T.jerk(F.k / FOLLOW.length); g.audio.play('pipeKnock', T); g.audio.play('clunk', T); g.camRig.shake(0.04); }
      if (F.t >= FOLLOW_END) {
        this.follow = null; this.followed = true; this.busy = false; this.f.ob_follow = true;
        g.cutscene = null; g.setState('play');
        this.ch.chain([['hero', 'ob_follow']], () => { g.updateObjective(); g.save(false); });
      }
    };
  }
  talk7(npc) {
    if (npc.def.id !== 'keeper' || !this.open7) return false;
    this.ch.chain([['keeper', this.followed ? 'ob_keeper_read' : 'ob_keeper_wait']]);
    return true;
  }

  // ---------------------------------------------------------------- per frame (pass.js, observatory.js update)
  update(dt) {
    const g = this.game;
    if (this.later.length && g.state === 'play') { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    const L = this.L;
    if (L && !L.onKick) this.push();
    if (L) { const want = this.pulse(); if (L.active !== want) L.active = want; }
  }
}
