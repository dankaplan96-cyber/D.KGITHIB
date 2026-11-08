// Chapter 7 — "The Observatory" (the Hamalayi).
//
// Up the ridge to the observatory on the peak: once Sendell's shrine, now kept by Sefa. Her crystal drank the light
// of both suns: three floor mirrors carry the first sun's beam from a wall slit; the second sun's slit is frozen over
// (the ball breaks the ice) and the fourth mirror carries that beam (CHAPTER-BALANCE, flag c7_ice). Sendell speaks plainly for
// the first time: she has been holding the shell with her own light and is fading — she cannot do it alone.
// The dome's big mirror throws the light onto the glacier and melts the ice over the vent; a heavy project
// drone guards it. The old stone seal is carved like the dig's: of five discs round its rim the three warm ones steam,
// and the ball wakes them (CHAPTER-BALANCE: chapter 4's warm seals applied anew, flags c7_disc0/2/3). With the drone
// down and the three awake, the seal turns and the vent breathes. Arthur calls: the
// project is evacuating Citadel by its list. Hesk has the glider ready on the monastery slope. → chapter 8.
import { ChapterBase } from './base.js';
import '../text/ch7.js';
import { storyJourney } from '../travelfilm.js';
import { revealBeat, twoShot, solidAt } from './revealcam.js';

// (WC-1) the glider on the monks' slope for its departure film, from the monastery's gate, and where it is watched from
// (on the terrace's lip east of the gate, clear of the rope lift's winch, nose south over the drop to Lhar; REV-HAM: on chapter
//  10's glider spot (network.js decorate: the gate + (6.3, 3.8)) — 1.3 m east and 0.8 m south of where it stood, its body and
//  tailplane through the gate's signpost (the gate + (4.5, 1.5)) as it took off. Its watch spot moved with it)
const SLOPE = { x: 6.3, z: 3.8, a: 0, lx: 14.3, lz: 2.8 };

export class Observatory extends ChapterBase {
  get M() { return this.game.rooms.hamalayi; }
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
      if (f.c7_sendell && !f.c7_scope) consider(dist(O.telescope.x, O.telescope.z), 1.8, { kind: 'c7scope', label: 'p_scope' });
    } else if (r === 'hamalayi') {
      const V = this.M.vent;
      if (f.c7_droneDown && !f.c7_vent) consider(dist(V.x, V.z), 4.2, { kind: 'c7vent', label: 'p_vent' });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
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
        this.story.refreshCast({ walk: true });
        this.chain([['narrator', 'c7_scope'], ['keeper', 'c7_keeper_5']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c7vent':
        // (the seal turns only with its three warm discs awake)
        if (this.discsLit() < 3) { f.c7_sealSeen = true; this.chain([['hero', this.discsLit() ? 'c7_seal_more' : 'c7_seal_stuck']], () => g.updateObjective()); return true; }
        h.act('use', 1.0, () => {
          f.c7_vent = true; this.M.vent.setOpen(true); g.audio.play('horn'); g.camRig.shake(0.5);
          this.story.refreshCast({ walk: true });
          this.chain([['hero', 'c7_vent_seal'], ['narrator', 'c7_vent_open'], ['hero', 'c7_tw_v1'], ['arthurradio', 'c7_arthur_1'], ['hero', 'c7_tw_ar1'], ['arthurradio', 'c7_arthur_2'], ['hero', 'c7_tw_ar2'], ['radio', 'c7_hesk_radio']], () => { g.updateObjective(); g.save(false); });
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
  discsLit() { return (this.M?.ventDiscs || []).filter((d) => d.warm && d.lit).length; }
  // a ball on one of the seal's discs (hamalayi.js R.ventDiscs): a warm one wakes, a cold one only rings
  hitDisc(i) {
    const g = this.game, f = this.f, D = this.M?.ventDiscs?.[i];
    if (!this.isCur() || !D || D.lit || f.c7_vent) return;
    if (!D.warm) { g.audio.play('clang'); g.hud.toast('c7_toast_cold'); return; }
    D.setLit(true); f['c7_disc' + i] = true;
    g.audio.play('shard'); g.particles.burst(D.x, D.y + 0.3, D.z, '#ffb060', 16, 2.5);
    const n = this.discsLit();
    if (n >= 3) { g.camRig.shake(0.2); this.chain([['hero', 'c7_seal_free']], () => { g.updateObjective(); g.save(false); }); }
    else { g.hud.toast('c7_toast_disc', { n }); g.save(false); }
  }
  lightCrystal(silent = false) {
    const g = this.game, f = this.f;
    f.c7_lit = true; this.O.crystal.setLit(true);
    if (silent) return;
    g.audio.play('shard'); g.audio.cue?.('revelation');
    const beat = this.crystalBeat();   // (REVEAL-CAMS: the camera closes on Twinsen and the lit crystal; null with ?nocine and in the tests)
    this.chain([['narrator', 'c7_lit'], ['sendell', 'c7_sendell_1'], ['hero', 'c7_tw_s1'], ['sendell', 'c7_sendell_2'], ['sendell', 'c7_sendell_3'], ['sendell', 'ml_c7_gift'], ['hero', 'c7_tw_s2'], ['sendell', 'c7_sendell_4'], ['keeper', 'c7_keeper_4']], () => {
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
        if (!f.c7_keeper) return c([['keeper', 'c7_keeper_1'], ['hero', 'c7_tw_k1'], ['keeper', 'c7_keeper_2'], ['keeper', 'c7_keeper_3'], ['keeper', f.c7_ice ? 'c7_keeper_sun_open' : 'c7_keeper_sun'], ['hero', 'c7_mirror_hint']], () => { f.c7_keeper = true; g.updateObjective(); g.save(false); });
        if (f.c7_sendell && !f.c7_scope) return c([['keeper', 'c7_keeper_4']]);
        if (!f.c7_lit) return c([['keeper', f.c7_ice ? 'c7_keeper_sun_open' : 'c7_keeper_sun']]);
        return c([['keeper', f.c7_scope ? 'c7_keeper_5' : 'c7_keeper_3']]);
      case 'yorna': return c([['yorna', 'c7_yorna_1']]);
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
  update() {
    const g = this.game, f = this.f, M = g.regions?.built('hamalayi'), h = g.hero;   // (LAZY-REGIONS: a per-frame read never builds the area)
    if (!this.isCur() || !M) return;
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
  }
  applyFlags() {
    const f = this.f, RG = this.game.regions;
    if (!this.reached()) return;
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
      // (a save from before the discs, the vent open: all three awake)
      for (const D of M.ventDiscs || []) D.setLit(D.warm && !!(f['c7_disc' + D.i] || f.c7_vent));
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
    if (f.c7_droneDown && f.c7_sealSeen && this.discsLit() < 3) return this.goal('c7_obj_discs', { n: this.discsLit() });
    if (f.c7_droneDown) return this.goal('c7_obj_vent');
    if (f.c7_scope) return this.goal('c7_obj_drone');
    if (f.c7_sendell) return this.goal('c7_obj_scope');
    if (f.c7_keeper || r === 'obsv') return this.goal('c7_obj_mirrors');
    return this.goal('c7_obj_ridge');
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c7_j_keeper', done: !!f.c7_keeper },
      { key: 'c7_j_sendell', done: !!f.c7_sendell },
      { key: 'c7_j_vent', done: !!f.c7_vent },
      { key: 'c7_j_home', done: !!f.c7_vent },
    ].filter((l) => l.done);   // (G1-NARR: what has happened, in the past tense; the step ahead is the objective)
  }
}
