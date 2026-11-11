// CAMPAIGN-2 (the user's treatment of 11.11.2026, section 2 "Citadel — the wrong pipe"): chapter 2's investigation,
// between the water's return to the square and Vesk's tour of the station. Not a chapter: story/chapter1.js owns it and
// asks it first (as it asks depotwatch.js).
//
// The three valves opened, the project's worker opens the line: the square's well fills, steaming (the scene that was
// there). New: the houses stay dry. Twinsen tries his own tap (dry, knocking); Zoé stays at it and will knock on the
// pipe when it runs (twice for water, once for nothing); Arthur has seen the fitters take a copper pipe down the pump
// room on the lane. The worker at its door has opened "two pipes, as on the diagram". Below (src/game/pumproom.js):
// the wall diagram shows two pipes, the room has three; the copper one shivers three beats and rests (felt with a hand,
// seen and heard along its run behind the pier); at the bypass a cock on each old pipe: the upper one only sends more
// water to the square (it springs back; Zoé knocks once), the lower one fills the houses' line (two knocks). Shut off,
// the copper pipe's gauge still kicks: the push comes up the project's pipe, from the fortress end. He tears off the
// gauge's strip and reads the booster pump's plate: IRSA'S PUMP WORKS · MILL LANE · ZEELICH. Up in the street the
// garden tap runs, the shopkeeper washes her counter, and at home the tap Arthur left open floods the sink until
// Twinsen shuts it. Then the station: Vesk calls the kicks "a new pump settling", and the radio's Baldino knows Irsa.
//
// Flags (new, saved): ct_v (a game that came to the water's return with the thread), ct_dry, ct_worker, ct_diagram,
// ct_felt, ct_seen, ct_wrong, ct_bypass, ct_strip, ct_plate, ct_home, ct_tapShut, ct_wback. A save from before has no
// ct_v: the thread counts as done (the bypass set right, the strip gone) and the chapter plays as it did.
import '../text/thread.js';

// a few steps to a thing in a room (story/life.js cancels walks indoors that are not marked as the room's own)
const walkIn = (h, pts, o) => { h.walkTo(pts, o); if (h.steer) h.steer.indoor = true; };

export class PumpLine {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.ct_v; }
  // the repair made, the strip taken, the plate read (or a save from before the thread)
  get done() { const f = this.f; return !f.ct_v || !!(f.ct_bypass && f.ct_strip && f.ct_plate); }
  // the thread's stretch of the chapter: the square has water, the lane has none yet (or the proof is still below)
  get open() { return this.on && !!this.f.c1_water && !this.done; }
  get R() { return this.game.regions?.built?.('pumproom'); }
  get home() { return this.story.chapters[0].home; }
  get kiosk() { return this.game.world?.pumpKiosk; }

  // ---------------------------------------------------------------- state
  begin() { this.f.ct_v = 1; }
  applyFlags(cur) {
    const f = this.f, g = this.game;
    // (a save from before the thread, in this chapter and not yet at the water's return, has the step ahead of it)
    if (!f.ct_v && cur && f.c1_started && !f.c1_water) f.ct_v = 1;
    this.later = []; this.pending = null;
    g.regions.whenBuilt('pumproom', (R) => R.pump.setState({ bypass: this.done || !!f.ct_bypass, strip: this.on && !f.ct_strip }));
    this.push();
  }
  // the street's state: the garden tap and the kitchen tap run once the houses' line is open
  push() {
    const f = this.f, H = this.home?.parts, runs = !this.on || !!f.ct_bypass, past = (this.story.index ?? 0) > this.ch.pos;
    if (H?.yard?.stream) H.yard.stream.visible = this.ch.reached() && (past || (!!f.c1_water && runs));
    const K = H?.house?.K;
    if (K?.stream && this.ch.isCur()) { const on = this.on && !!f.ct_bypass && !f.ct_tapShut; K.stream.visible = on; K.stream.scale.set(1, 1, 1); if (H.house.puddle) H.house.puddle.visible = on || (this.on && !!f.ct_bypass && !f.c1_veskGone); }
  }
  place(id) {
    const f = this.f, g = this.game, W = g.world, K = this.kiosk;
    if (!this.on || !f.c1_water) return undefined;
    // the worker at the pump room's door until Twinsen has been and gone; then up at the station, as he was
    // Zoé beside the sink (the tap is his to try), until the station's tour takes the story on
    const HZ = this.home?.parts?.house?.zoe;
    if (id === 'zoe' && HZ && !f.c1_tour) return { x: HZ.x, z: HZ.z, a: HZ.a, anim: null };
    if (id === 'worker' && K && !f.ct_wback) return { x: K.out.x - 0.2, z: K.out.z + 1.3, a: Math.PI / 2 + 0.9, anim: null };
    // the shopkeeper washes her counter down with the first hot water
    if (id === 'pippa' && f.ct_bypass && !f.c1_veskGone && W.stall) return { x: W.stall.x, z: W.stall.z, a: W.stall.a, anim: 'wipe' };
    return undefined;
  }
  objective() {
    const f = this.f, ch = this.ch;
    if (!this.on || !f.c1_water || f.c1_tour) return null;
    if (!f.ct_dry) return ch.goal('ct_obj_home');
    if (this.game.room?.id === 'pumproom' || f.ct_seen || f.ct_bypass) {
      if (this.done) return f.ct_home ? null : ch.goal('ct_obj_street');
      return ch.goal('ct_obj_room') + (f.ct_bypass ? '' : ch.sub(!!f.ct_diagram, 'ct_sub_diagram') + ch.sub(!!f.ct_felt, 'ct_sub_feel')) + ch.sub(!!f.ct_bypass, 'ct_sub_cock') + (f.ct_bypass ? ch.sub(!!f.ct_strip, 'ct_sub_strip') + ch.sub(!!f.ct_plate, 'ct_sub_plate') : '');
    }
    return ch.goal('ct_obj_lane');
  }
  markers() {
    const f = this.f, g = this.game, W = g.world, K = this.kiosk, gold = '#ffcf4a';
    if (!this.on || !f.c1_water || f.c1_tour) return null;
    const star = (p) => [{ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true }];
    if (!f.ct_dry || (this.done && !f.ct_home)) return star(W.houses[0]);
    if (!this.done) return K ? star(K) : [];
    return null;
  }
  journal() { const f = this.f; return [{ key: 'ct_j_dry', done: !!f.ct_dry }, { key: 'ct_j_bypass', done: !!f.ct_bypass }, { key: 'ct_j_strip', done: !!(f.ct_strip && f.ct_plate) }].filter((l) => l.done && this.on); }
  items() { const f = this.f; return f.ct_strip && !f.zt_bench ? [{ id: 'pstrip', icon: 'leaflet' }] : []; }
  canExit(room) {
    const f = this.f;
    if (room.id === 'pumproom' && this.on && f.ct_bypass && !this.done) { this.ch.chain([['hero', 'ct_need_strip']]); return false; }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, K = this.kiosk, H = this.home?.parts?.house;
    if (!g.room && K && !f.c1_water) consider(dist(K.door.x, K.door.z), 1.5, { kind: 'ct_kiosk', label: 'p_door' });
    if (!this.on || !f.c1_water) return;
    if (g.room?.id === 'house' && H && !f.c1_veskGone) consider(dist(H.spout.x, H.spout.z), 1.5, { kind: 'ct_tap', label: 'p_tap' });
    const Y = this.home?.parts?.yard;
    if (!g.room && Y && f.ct_bypass) consider(dist(Y.x, Y.z), 1.3, { kind: 'ct_yard', label: 'p_look' });
    const R = this.R, U = R?.pump;
    if (!U || g.room !== R) return;
    consider(dist(U.diagram.x, U.diagram.z), 1.5, { kind: 'ct_diagram', label: 'p_read' });
    for (const k of ['upper', 'lower', 'copper']) consider(dist(U.feel[k].x, U.feel[k].z), 1.05, { kind: 'ct_feel', which: k, label: 'p_feel' });
    if (!f.ct_bypass) for (const k of ['upper', 'lower']) consider(dist(U.cocks[k].x, U.cocks[k].z), 1.0, { kind: 'ct_cock', which: k, label: 'p_cock' });
    consider(dist(U.plate.x, U.plate.z), 1.0, { kind: 'ct_plate', label: 'p_plate' });
    if (!f.ct_strip) consider(dist(U.gauge.x, U.gauge.z), 1.0, { kind: 'ct_strip', label: f.ct_bypass ? 'p_strip' : 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, U = this.R?.pump, H = this.home?.parts?.house;
    const at = (p, fn, dur = 1.1) => walkIn(h, [p.front], { a: Math.atan2(p.x - p.front.x, p.z - p.front.z), then: () => h.actAt(p.x, p.z, 'use', dur, fn, 0.5), fail: () => h.actAt(p.x, p.z, 'use', dur, fn, 0.5) });
    switch (it.kind) {
      case 'ct_kiosk': g.audio.play('doorLocked'); ch.chain([['hero', 'ct_kiosk_locked']]); return true;
      case 'ct_yard': ch.chain([['hero', 'ct_yard_runs']]); return true;
      case 'ct_tap': {
        // his hand on the kitchen tap again: dry and knocking; or, the line open, shut on the water Arthur left running
        const turn = () => h.actAt(H.spout.x, H.spout.z, 'use', 1.25, () => {
          g.audio.play('tapSqueak'); this.home.turnT = 0;
          if (!f.ct_bypass) { this.home.knock(true); ch.chain([['hero', 'ct_tap_dry']]); return; }
          if (!f.ct_tapShut) { f.ct_tapShut = true; this.push(); g.save(false); }
          ch.chain([['hero', 'ct_tap_runs']]);
        }, 0.5);
        walkIn(h, [H.front], { a: Math.PI, then: turn, fail: turn });
        return true;
      }
      case 'ct_diagram': g.audio.play('paper'); ch.chain([['hero', 'ct_diagram']], () => { if (!f.ct_diagram) { f.ct_diagram = true; g.updateObjective(); g.save(false); } }); return true;
      case 'ct_feel': {
        const p = U.feel[it.which];
        at(p, () => {
          if (it.which === 'copper') { U.shake('copper', 0.5); g.audio.play('rattle', p); }
          ch.chain([['hero', 'ct_feel_' + it.which], ...(it.which === 'copper' && !f.ct_felt ? [['hero', 'ct_follow']] : [])], () => { if (it.which === 'copper' && !f.ct_felt) { f.ct_felt = true; g.updateObjective(); g.save(false); } });
        });
        return true;
      }
      case 'ct_cock': {
        const c = U.cocks[it.which];
        at(c, () => {
          g.audio.play('valve', c);
          if (it.which === 'upper') {
            // the wrong line: the square's pipe roars; it is let go at once, and Zoé knocks once (nothing at the tap)
            c.set(true); U.shake('upper', 0.9); g.audio.play('waterRun', U.upperAt);
            f.ct_wrong = (f.ct_wrong || 0) + 1;
            this.after(0.9, () => { c.set(false); g.audio.play('valveShut', c); });
            this.after(1.3, () => this.knocks(1));
            this.pending = { t: 1.9, fn: () => ch.chain([['hero', 'ct_cock_wrong'], ['hero', 'ct_zoe_knock1']]) };
            return;
          }
          f.ct_bypass = true; f.ct_seen = true;
          this.story.refreshCast();   // (the street above: the shopkeeper at her counter)
          U.setState({ bypass: true, strip: !f.ct_strip });
          g.audio.play('waterRun', U.lowerAt); g.audio.play('gurgle', U.lowerAt); U.shake('lower', 0.8);
          this.push();
          this.after(1.2, () => this.knocks(2));
          this.pending = { t: 2.1, fn: () => ch.chain([['hero', 'ct_cock_right'], ['hero', 'ct_zoe_knock2'], ['hero', 'ct_pulse']], () => { g.updateObjective(); g.save(false); }) };
          g.updateObjective(); g.save(false);
        }, 1.3);
        return true;
      }
      case 'ct_plate': ch.chain([['hero', f.ct_plate ? 'ct_plate_again' : 'ct_plate']], () => { if (!f.ct_plate) { f.ct_plate = true; g.updateObjective(); g.save(false); } }); return true;
      case 'ct_strip':
        if (!f.ct_bypass) { ch.chain([['hero', 'ct_gauge_early']]); return true; }
        at(U.gauge, () => {
          f.ct_strip = true; U.setState({ bypass: true, strip: false }); g.audio.play('paper');
          ch.chain([['hero', 'ct_strip']], () => { g.updateObjective(); g.save(false); g.found('pstrip', 'ct_toast_strip'); });
        });
        return true;
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.on || !f.c1_water || f.c1_tour) return false;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    switch (id) {
      case 'zoe':
        if (g.room?.id !== 'house') return false;
        if (!f.ct_dry) return c([['zoe', 'ct_zoe_dry1'], ['hero', 'ct_tw_dry'], ['zoe', 'ct_zoe_dry2'], ['arthur', 'ct_ar_dry']], () => { f.ct_dry = true; g.updateObjective(); g.save(false); });
        if (!f.ct_bypass) return c([['zoe', 'ct_zoe_wait']]);
        if (!f.ct_home) return c([['zoe', 'ct_zoe_runs'], ['arthur', 'ct_ar_runs']], () => { f.ct_home = true; g.updateObjective(); g.save(false); });
        return false;
      case 'arthur':
        if (g.room?.id !== 'house' || !f.ct_dry || f.ct_home) return false;
        return c([['arthur', f.ct_bypass ? 'ct_ar_runs' : 'ct_ar_dry']]);
      case 'worker':
        if (f.ct_wback) return false;
        if (f.ct_bypass) return c([['worker', 'ct_worker_done']]);
        if (!f.ct_worker) return c([['worker', 'ct_worker_1'], ['hero', 'ct_tw_worker'], ['worker', 'ct_worker_2']], () => { f.ct_worker = true; g.save(false); });
        return c([['worker', 'ct_worker_3']]);
      case 'guard': return this.done ? false : c([['guard', 'ct_guard_later']]);
      case 'pippa':
        if (!f.ct_bypass) return false;
        ch.chain([['pippa', 'ct_pippa_step']], () => g.openShop());
        return true;
    }
    return false;
  }
  onEnterRoom(id) {
    const f = this.f;
    if (id === 'pumproom' && this.on && !f.ct_roomIn) { f.ct_roomIn = true; this.ch.chain([['hero', 'ct_room_in']], () => this.game.updateObjective()); }
    if (id === 'house') this.push();
  }

  // ---------------------------------------------------------------- what moves
  after(t, fn) { (this.later ||= []).push({ t, fn }); }
  // Zoé's knocks on the lower pipe, from the kitchen: n of them, the pipe shaking with each
  knocks(n) {
    const g = this.game, U = this.R?.pump; if (!U) return;
    for (let i = 0; i < n; i++) this.after(i * 0.32, () => { g.audio.play('pipeKnock', U.lowerAt); U.shake('lower', 0.25); g.particles.burst(U.lowerAt.x, 1.6, U.lowerAt.z + 0.1, '#b8a890', 3, 0.7); });
  }
  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    if (this.later?.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (this.pending && g.state === 'play' && (this.pending.t -= dt) <= 0) { const fn = this.pending.fn; this.pending = null; fn(); }
    if (!this.on || !f.c1_water) return;
    const R = this.R, U = R?.pump;
    if (U && g.room === R && g.state === 'play' && !f.ct_bypass) {
      // the copper pipe followed: it rattles at the pier as he comes by, and the bypass is seen in the alcove behind it
      if (!this._pier && Math.hypot(h.pos.x - U.pier.x, h.pos.z - U.pier.z) < 1.7) { this._pier = true; U.shake('copper', 0.7); g.audio.play('rattle', U.pier); g.particles.burst(U.pier.x + 0.3, 0.9, U.pier.z - 0.8, '#b8a890', 5, 0.8); }
      if (!f.ct_seen && h.pos.x > U.alcoveX + 0.2) { f.ct_seen = true; this.ch.chain([['hero', 'ct_bypass_see']], () => { g.updateObjective(); g.save(false); }); }
    }
    // the worker goes back up to the station once Twinsen has left the lane (never seen to vanish)
    if (f.ct_bypass && !f.ct_wback && g.state === 'play') {
      const K = this.kiosk, far = K ? Math.hypot(h.pos.x - K.x, h.pos.z - K.z) : 99;
      if ((g.room && g.room.id !== 'pumproom') || (!g.room && far > 45)) { f.ct_wback = true; this.story.refreshCast(); }
    }
    // the kitchen floor's puddle while the tap Arthur left open runs
    const H = this.home?.parts?.house;
    if (H && g.room === H.H && f.ct_bypass && !f.ct_tapShut && Math.random() < dt * 6) g.particles.burst(H.spout.x, H.K.basin.y + 0.05, H.spout.z + 0.05, '#cfe8ff', 1, 0.8);
  }
}
