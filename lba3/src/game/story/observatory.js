// Chapter 7 — "The Observatory" (the Hamalayi).
//
// Up the ridge to the observatory on the peak: once Sendell's shrine, now kept by Sefa. Her crystal drank the light
// of both suns: three floor mirrors carry the first sun's beam from a wall slit; the second sun's slit is frozen over
// (the ball breaks the ice) and the fourth mirror carries that beam (CHAPTER-BALANCE, flag c7_ice). Sendell speaks plainly for
// the first time: she has been holding the shell with her own light and is fading — she cannot do it alone.
// The dome's big mirror throws the light onto the glacier and melts the ice over the vent; a heavy project
// drone guards it. The old stone seal is carved like the dig's, five discs round its rim over the vent's channels
// (PUZZLES P-B, which replaced CHAPTER-BALANCE's "wake the three warm discs": chapter 4's decision again): three steam,
// breathing already; two are choked under ice. The ice breaks to the ball or a blow (flags c7_free1, c7_free4); a ball
// on a breathing one only rings. With the drone down and all five breathing, the seal turns and the vent breathes.
// Arthur calls: the
// project is evacuating Citadel by its list. Hesk has the glider ready on the monastery slope. → chapter 8.
import { ChapterBase } from './base.js';
import '../text/ch7.js';
import { storyJourney } from '../travelfilm.js';
import { revealBeat, twoShot, solidAt } from './revealcam.js';
import { PassThread } from './passline.js';

// (WC-1) the glider on the monks' slope for its departure film, from the monastery's gate, and where it is watched from
// (on the terrace's lip east of the gate, clear of the rope lift's winch, nose south over the drop to Lhar; REV-HAM: on chapter
//  10's glider spot (network.js decorate: the gate + (6.3, 3.8)) — 1.3 m east and 0.8 m south of where it stood, its body and
//  tailplane through the gate's signpost (the gate + (4.5, 1.5)) as it took off. Its watch spot moved with it)
const SLOPE = { x: 6.3, z: 3.8, a: 0, lx: 14.3, lz: 2.8 };

export class Observatory extends ChapterBase {
  get M() { return this.game.rooms.hamalayi; }
  // CAMPAIGN-5: the snow fields' shaking and the telescope's fourth setting (passline.js; one thread for 6 and 7)
  get ps() { return (this.story._ps ||= new PassThread(this.story)); }
  get O() { return this.game.rooms.obsv; }
  room() { return this.game.room?.id; }
  heavy() { return this.game.enemies.find((e) => e.def?.id === 'heavydrone'); }

  npcDefs() {
    const k = this.O?.npcSpots?.keeper || { x: 0, z: 0, a: 0, pending: true };
    return [{ id: 'keeper', name: 'n_keeper', char: 'keeper', color: '#b0c8ff', x: k.x, z: k.z, angle: k.a, ...(k.pending ? { pending: true } : {}) }];
  }
  enemyDefs() {
    const M = this.M;
    if (!M?.ventPatrol) return [];
    const P = M.ventPatrol;
    return [{ id: 'heavydrone', kind: 'drone', model: 'hauler', group: 'vent', hp: 8, x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !!f.c7_scope && !f.c7_droneDown }];
  }
  place(id) {
    const f = this.f;
    if (!this.reached()) return id === 'keeper' ? null : undefined;
    if (id !== 'keeper' && id !== 'hesk') return undefined;
    // (LAZY-REGIONS: the area is read only for this chapter's own cast: an NPC whose spot is in an area not built
    //  yet waits for it, Story.refreshCast)
    const M = this.M;
    if (!M) return undefined;
    switch (id) {
      // (HAMALAYI-LIFE: chapters 8 and 9, no story at the dome: Sefa is at home next door, writing up the night: story/hamlife.js)
      case 'keeper': return ['evacuation', 'council'].includes(this.story.cur?.key) ? this.story.hlife.home('keeper') : this.O.npcSpots.keeper;
      case 'hesk': return f.c7_vent ? { x: M.monastery.gate.x + 2, z: M.monastery.gate.z + 1, a: Math.PI } : null;
    }
    return undefined;
  }
  begin() {
    const g = this.game, M = this.M;
    g.enterRoom('hamalayi', { x: M.monastery.yard.x, z: M.monastery.yard.z + 2, a: Math.PI }, true);
    this.ps.begin7();   // (CAMPAIGN-5: a game that reaches chapter 7 now has the fourth setting ahead)
    this.story.refreshCast({ walk: true });
    this.chain([['narrator', 'c7_narr'], ['yorna', 'c7_yorna_1']], () => { this.f.c7_started = true; g.updateObjective(); g.save(false); });
  }
  doors() {
    const M = this.game.regions.built('hamalayi');   // (a door in the Hamalayi: once it is built)
    return this.isCur() && M ? [{ region: 'hamalayi', x: M.observatory.door.x, z: M.observatory.door.z, r: 1.0, room: 'obsv' }] : [];
  }
  exitTo(to) {
    const M = to === 'obs-out' ? this.M : null;
    if (to === 'obs-out') return { room: 'hamalayi', x: M.observatory.door.x, z: M.observatory.door.z + 2.2, a: 0 };
    return null;
  }

  interactables(consider, dist) {
    const f = this.f, r = this.room();
    if (!this.isCur()) return;
    if (r === 'obsv') {
      const O = this.O;
      if (f.c7_keeper && !f.c7_lit) for (const m of O.mirrors) consider(dist(m.x, m.z), 1.2, { kind: 'c7mirror', mirror: m, label: 'p_mirror' });
      this.ps.interactables7(consider, dist);   // (CAMPAIGN-5: the setting lever, the ring)
      if (f.c7_sendell && !f.c7_scope && this.ps.scopeOK()) consider(dist(O.telescope.x, O.telescope.z), 1.8, { kind: 'c7scope', label: 'p_scope' });
    } else if (r === 'hamalayi') {
      const V = this.M.vent;
      if (f.c7_droneDown && !f.c7_vent) consider(dist(V.x, V.z), 4.2, { kind: 'c7vent', label: 'p_vent' });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    if (this.ps.interact7(it)) return true;
    switch (it.kind) {
      case 'c7mirror': {
        const m = it.mirror;
        h.act('use', 0.6, () => {
          m.setType(m.type === 'A' ? 'B' : 'A'); (f.c7_mirrors ||= {})[m.i] = m.type;
          g.audio.play('select');
          const res = this.O.trace();
          if (res.lit) this.lightCrystal();
          else if (res.n === 1 && !this._faint) { this._faint = true; this.chain([['hero', f.c7_ice ? 'c7_faint_ice' : 'c7_faint']]); }
        }, 0.3);
        return true;
      }
      case 'c7scope':
        f.c7_scope = true; this.M.vent.melt(); g.audio.play('door'); g.camRig.shake(0.3);
        this.O.telescope?.setting?.(3); this.O.telescope?.pose?.('glacier');   // (CAMPAIGN-5: setting three, the glacier)
        this.story.refreshCast({ walk: true });
        this.chain([['narrator', 'c7_scope'], ['keeper', 'c7_keeper_5']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c7vent':
        // (PUZZLES P-B: the seal turns only with all five of its channels breathing)
        if (this.breathing() < 5) { f.c7_sealSeen = true; this.chain([['hero', this.breathing() > 3 ? 'c7_seal_more' : 'c7_seal_stuck']], () => g.updateObjective()); return true; }
        h.act('use', 1.0, () => {
          f.c7_vent = true; this.M.vent.setOpen(true); g.audio.play('horn'); g.camRig.shake(0.5);
          this.story.refreshCast({ walk: true });
          // (P81: the seal described once: a player who has already looked at it hears only the narration of its turning)
          this.chain([...(f.c7_sealSeen ? [] : [['hero', 'c7_vent_seal']]), ['narrator', 'c7_vent_open'], ['hero', 'c7_tw_v1'], ['arthurradio', 'c7_arthur_1'], ['hero', 'c7_tw_ar1'], ['arthurradio', 'c7_arthur_2'], ['hero', 'c7_tw_ar2'], ['heskradio', 'c7_hesk_radio']], () => { g.updateObjective(); g.save(false); });
        }, 0.6);
        return true;
    }
    return false;
  }
  // the ball breaks the ice over the second sun's slit (obsroom.js R.ice's ball target)
  breakIce() {
    const g = this.game, f = this.f, O = this.O;
    if (!this.isCur() || f.c7_ice || f.c7_lit) return;
    f.c7_ice = true; O.ice.setBroken(true);
    g.audio.play('shard'); g.camRig.shake(0.15);
    const res = O.trace();
    if (res.lit) { this.lightCrystal(); return; }
    this.chain([['narrator', 'c7_ice']], () => { g.updateObjective(); g.save(false); });
  }
  // PUZZLES P-B: how many of the seal's five channels breathe (three warm ones always; a choked one once its ice is off)
  breathing() { return (this.M?.ventDiscs || []).filter((d) => d.breathing).length; }
  // the ice over a choked disc broken (its ball target, hamalayi.js R.ventDiscs, or a blow: meleeHit): it breathes
  hitDisc(i) {
    const g = this.game, f = this.f, M = this.M, D = M?.ventDiscs?.[i];
    if (!this.isCur() || !D || D.breathing || f.c7_vent || !M.vent.melted) return;
    D.setFree(true); f['c7_free' + i] = true; this.discAt = g.time;
    g.audio.play('shard'); g.particles.burst(D.x, D.y + 0.4, D.z, '#e8f6ff', 18, 3); M.ventPuff?.(i, 3);
    const n = this.breathing();
    if (n >= 5) { g.camRig.shake(0.25); g.audio.play('rumble'); this.chain([['hero', 'c7_seal_free']], () => { g.updateObjective(); g.save(false); }); }
    else { g.hud.toast('c7_toast_free', { n }); g.updateObjective(); g.save(false); }
  }
  // a ball on a breathing disc (chapter 4's rule: "wake the steaming ones"): it rings, puffs, and he says so once
  ballHit(p) {
    const g = this.game, f = this.f, M = this.M;
    if (!this.isCur() || this.room() !== 'hamalayi' || !M?.ventDiscs || !M.vent.melted || M.vent.open || f.c7_vent) return false;
    const D = M.ventDiscs.find((d) => d.warm && Math.hypot(p.x - d.x, p.y - d.y, p.z - d.z) < 0.8);
    if (!D) return false;
    g.audio.play('clang'); M.ventPuff?.(D.i, 1.2); this.discAt = g.time;
    if (!this.warmSaid) { this.warmSaid = true; this.chain([['hero', 'c7_warm_hit']]); }
    else g.hud.toast('c7_toast_warm');
    return true;
  }
  // (the breathing ones are things a ball thrown at them curves to, so a throw at one gets its answer: the ring)
  ballTargets() {
    const f = this.f, M = this.M;
    if (!this.isCur() || this.room() !== 'hamalayi' || !M?.ventDiscs || !M.vent.melted || M.vent.open || f.c7_vent) return [];
    return M.ventDiscs.filter((d) => d.warm).map((d) => ({ x: d.x, y: d.y, z: d.z }));
  }
  // a blow (fist, kick, sword) on a choked disc's ice breaks it too: it is ice on the ground
  meleeHit(o) {
    const M = this.M;
    if (!this.isCur() || this.room() !== 'hamalayi' || !M?.ventDiscs || !M.vent.melted || M.vent.open || this.f.c7_vent) return false;
    for (const D of M.ventDiscs) {
      if (D.breathing || o.hitSet.has(D) || !o.inArc(D.x, D.z, 0.7)) continue;
      o.hitSet.add(D); this.game.impact(D.x, D.y + 0.2, D.z, 'crystal', 'break'); this.hitDisc(D.i);
      return true;
    }
    return false;
  }
  lightCrystal(silent = false) {
    const g = this.game, f = this.f;
    f.c7_lit = true; this.O.crystal.setLit(true);
    if (silent) return;
    g.audio.play('shard'); g.audio.cue?.('revelation');
    const beat = this.crystalBeat();   // (REVEAL-CAMS: the camera closes on Twinsen and the lit crystal; null with ?nocine and in the tests)
    this.chain([['narrator', 'c7_lit'], ['sendell', 'c7_sendell_1'], ['hero', 'c7_tw_s1'], ['sendell', 'c7_sendell_2'], ['sendell', 'c7_sendell_3'], ['sendell', 'ml_c7_gift'], ['hero', 'c7_tw_s2'], ['sendell', 'c7_sendell_4'], ['keeper', this.ps.keeperLine()]], () => {
      beat?.release();
      g.audio.endCue?.(); f.c7_sendell = true; g.updateObjective(); g.save(false);
      this.story.magic.grant(3);   // MAGIC-LEVELS (story/magic.js): Sendell's light in the ball: level 3, the red ball
    }, (i, id) => { if (id === 'keeper') beat?.release(); });   // (her words done: the view eases back as Sefa answers)
  }
  // REVEAL-CAMS: a medium two-shot of Twinsen (wherever the last mirror left him) and Sendell's crystal, held through her
  // words. The lens stays inside the hall (the walls are tall on the far sides) and out of the telescope and the plinth.
  crystalBeat() {
    const g = this.game, h = g.hero, O = this.O;
    const beat = revealBeat(g, { room: 'obsv' });
    if (!beat) return null;
    const c = O.center, bounds = { box: { x0: c.x - 5.3, x1: c.x + 5.3, z0: c.z - 5.3, z1: c.z + 5.3 } };
    const ok = (x, y, z) => !solidAt(g, x, y, z, 0.45);
    const memo = {};
    beat.show(({ t }) => twoShot({ x: h.pos.x, y: h.pos.y + 1.15, z: h.pos.z }, { x: O.crystal.x, y: 1.6, z: O.crystal.z - 0.6 }, { bounds, ok, memo, height: 1.9, drop: 0.95, fov: 50, dist: 6.2, t }));
    return beat;
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'keeper':
        if (this.ps.talk7(npc)) return true;   // (CAMPAIGN-5: the fourth setting)
        if (!f.c7_keeper) return c([['keeper', 'c7_keeper_1'], ['hero', 'c7_tw_k1'], ['keeper', 'c7_keeper_2'], ['keeper', 'c7_keeper_3'], ['keeper', f.c7_ice ? 'c7_keeper_sun_open' : 'c7_keeper_sun'], ['hero', 'c7_mirror_hint']], () => { f.c7_keeper = true; g.updateObjective(); g.save(false); });
        if (f.c7_sendell && !f.c7_scope) return c([['keeper', 'c7_keeper_4']]);
        if (!f.c7_lit) return c([['keeper', f.c7_ice ? 'c7_keeper_sun_open' : 'c7_keeper_sun']]);
        // (P81: after the vent his "Hurry… something flying down there" was stale: the steam, and where Hesk waits)
        return c([['keeper', f.c7_vent ? 'c7_keeper_after' : f.c7_scope ? 'c7_keeper_5' : 'c7_keeper_3']]);
      case 'yorna': return c([['yorna', f.c7_vent ? 'c7_yorna_after' : 'c7_yorna_1']]);
      case 'hesk': if (f.c7_vent) { this.leave(); return true; } return false;
    }
    return false;
  }
  leave() {
    const g = this.game, f = this.f;
    if (f.c7_done) return;
    f.c7_done = true;
    this.chain([['hesk', 'c7_hesk_go']], () => {
      g.save(false);
      // WC-1: the glider's film (TRAVEL-1): Hesk's glider runs off the terrace's lip by the monastery's gate and is seen coming
      // down on Citadel's glider field on the plateau, where chapter 8 starts (Hesk flies on south: he stays aboard)
      storyJourney(g, { from: this.slopeSpot(), to: 'citadel_glider', mode: 'glider', aboard: [this.npc('hesk')] },
        (then) => g.startTransition(() => this.story.nextChapter(), this.story.nextAreas(), then));
    });
  }
  // the monks' slope: the glider stands on the terrace's lip beside the monastery's gate, its nose over the drop to Lhar
  // (a hill to jump from, as Hesk wanted); watched from by the gate
  slopeSpot() {
    const M = this.game.regions?.built('hamalayi'), gt = M?.monastery?.gate;
    if (!gt) return null;
    return { id: 'c7_slope', region: 'hamalayi', mode: 'glider', craft: 'glider', x: gt.x + SLOPE.x, z: gt.z + SLOPE.z, a: SLOPE.a, landing: { x: gt.x + SLOPE.lx, z: gt.z + SLOPE.lz, a: 0 } };
  }
  update(dt) {
    const g = this.game, f = this.f, M = g.regions?.built('hamalayi'), h = g.hero;   // (LAZY-REGIONS: a per-frame read never builds the area)
    if (!this.isCur() || !M) return;
    this.ps.update(dt);
    M.snow.focus = h.pos;
    // (the frozen slit's ball target answers to this chapter, however it began: a load, or chapter 6 played on)
    const O = g.regions?.built('obsv');
    if (O?.ice && !O.ice.onBreak) O.ice.onBreak = () => this.breakIce();
    if (!M.onDisc) M.onDisc = (i) => this.hitDisc(i);
    // the heavy drone: bigger, and its fall is the cue
    const hd = this.heavy();
    if (hd && !hd._big) { hd._big = true; hd.rig.root.scale.multiplyScalar(1.7); hd.hover = 2.2; hd.hitR = 1.3; hd.hitH = 3.6; }
    if (f.c7_scope && !f.c7_droneDown && hd && !hd.alive) {
      f.c7_droneDown = true;
      this.chain([['hero', 'c7_drone_down']], () => { g.updateObjective(); g.save(false); });
    }
    if (f.c7_scope && !f.c7_droneSeen && hd?.present && this.room() === 'hamalayi' && Math.hypot(h.pos.x - M.vent.x, h.pos.z - M.vent.z) < 22 && g.state === 'play') {
      f.c7_droneSeen = true; this.chain([['hero', 'c7_drone_in']]);
    }
    if (f.c7_vent && !f.c7_done && g.state === 'play' && this.room() === 'hamalayi' && Math.hypot(h.pos.x - M.monastery.gate.x, h.pos.z - M.monastery.gate.z) < 4) this.leave();
    // (PUZZLES P-B: the seal tried, a while with nothing struck: first the two that don't steam, later the ice; HINTS-LESS)
    const stuck = this.room() === 'hamalayi' && !!f.c7_sealSeen && !f.c7_vent && this.breathing() < 5 && g.time - (this.discAt ?? -1e9) > 20;
    this.nudge(dt, 'c7_steam', stuck, 45, 'c7_nudge_steam');
    this.nudge(dt, 'c7_ice', stuck, 90, 'c7_nudge_ice');
  }
  applyFlags() {
    const f = this.f, RG = this.game.regions;
    if (!this.reached()) return;
    this.ps.applyFlags();   // (CAMPAIGN-5: the line's pulse, the telescope's setting as the flags have them)
    // (LAZY-REGIONS: the flags are set now; what they change in an area goes on it when it is built — at once if it
    //  is: regions.whenBuilt. A load builds the save's area and its chapter's first.)
    RG.whenBuilt('obsv', (O) => {
      O.ice.onBreak = () => this.breakIce();
      // (a save from before the second sun, with the crystal lit: the slit open, the fourth mirror set right)
      O.ice.setBroken(!!(f.c7_ice || f.c7_lit));
      if (f.c7_lit && !f.c7_mirrors?.[3] && O.mirrors[3]) O.mirrors[3].setType('A');
      for (const m of O.mirrors) if (f.c7_mirrors?.[m.i]) m.setType(f.c7_mirrors[m.i]);
      O.trace();
      if (f.c7_lit) this.lightCrystal(true);
    });
    RG.whenBuilt('hamalayi', (M) => {
      if (f.c7_scope) M.vent.melt(true);
      if (f.c7_vent) M.vent.setOpen(true);
      // (PUZZLES P-B: a choked disc freed stays free; the vent open: all free. A save from the build before, whose three
      //  warm discs were all woken, had the seal ready to turn: it comes back so, both caps gone)
      const oldReady = !!(f.c7_disc0 && f.c7_disc2 && f.c7_disc3);
      for (const D of M.ventDiscs || []) if (!D.warm) D.setFree(!!(f['c7_free' + D.i] || f.c7_vent || oldReady));
    });
  }
  // GUIDE: the dome, the vent, the monastery's gate on the Hamalayi's map (base.js star)
  markers() {
    const f = this.f, M = this.game.regions?.built('hamalayi');
    if (!this.isCur() || !f.c7_started || !M) return [];
    if (f.c7_vent) return this.stars(M.monastery.gate);
    if (f.c7_scope) return this.stars(M.vent);
    return this.stars(M.observatory.door);
  }
  objective() {
    const f = this.f, r = this.room();
    if (!f.c7_started) return '';
    if (f.c7_vent) return this.goal('c7_obj_home');
    if (f.c7_droneDown && f.c7_sealSeen && this.breathing() < 5) return this.goal('c7_obj_free', { n: this.breathing() });
    if (f.c7_droneDown) return this.goal('c7_obj_vent');
    if (f.c7_scope) return this.goal('c7_obj_drone');
    { const po = this.ps.objective7(); if (po) return po; }   // (CAMPAIGN-5: the fourth setting)
    if (f.c7_sendell) return this.goal('c7_obj_scope');
    if (f.c7_keeper || r === 'obsv') return this.goal('c7_obj_mirrors');
    return this.goal('c7_obj_ridge');
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c7_j_keeper', done: !!f.c7_keeper },
      { key: 'c7_j_sendell', done: !!f.c7_sendell },
      { key: 'ob_j_dir', done: !!f.ob_dir },
      { key: 'c7_j_vent', done: !!f.c7_vent },
      { key: 'c7_j_home', done: !!f.c7_vent },
    ].filter((l) => l.done);   // (G1-NARR: what has happened, in the past tense; the step ahead is the objective)
  }
}
