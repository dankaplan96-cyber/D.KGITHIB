// Chapter 7 — "The Observatory" (the Hamalayi).
//
// Up the ridge to the observatory on the peak: once Sendell's shrine, now kept by Sefa. Four floor mirrors
// carry the sunbeam from a wall slit to her crystal (three set right, one a decoy). Sendell speaks plainly for
// the first time: she has been holding the shell with her own light and is fading — she cannot do it alone.
// The dome's big mirror throws the light onto the glacier and melts the ice over the vent; a heavy project
// drone guards it. With the drone down, the old stone seal turns and the vent breathes. Arthur calls: the
// project is evacuating Citadel by its list. Hesk has the glider ready on the monastery slope. → chapter 8.
import { ChapterBase } from './base.js';
import '../text/ch7.js';

export class Observatory extends ChapterBase {
  get M() { return this.game.rooms.hamalayi; }
  get O() { return this.game.rooms.obsv; }
  room() { return this.game.room?.id; }
  heavy() { return this.game.enemies.find((e) => e.def?.id === 'heavydrone'); }

  npcDefs() {
    const k = this.O?.npcSpots?.keeper || { x: 0, z: 0, a: 0 };
    return [{ id: 'keeper', name: 'n_keeper', char: 'keeper', color: '#b0c8ff', x: k.x, z: k.z, angle: k.a }];
  }
  enemyDefs() {
    const M = this.M;
    if (!M?.ventPatrol) return [];
    const P = M.ventPatrol;
    return [{ id: 'heavydrone', kind: 'drone', group: 'vent', hp: 8, x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !!f.c7_scope && !f.c7_droneDown }];
  }
  place(id) {
    const f = this.f, M = this.M;
    if (!this.reached()) return id === 'keeper' ? null : undefined;
    if (!M) return undefined;
    switch (id) {
      case 'keeper': return this.O.npcSpots.keeper;
      case 'hesk': return f.c7_vent ? { x: M.monastery.gate.x + 2, z: M.monastery.gate.z + 1, a: Math.PI } : null;
    }
    return undefined;
  }
  begin() {
    const g = this.game, M = this.M;
    g.enterRoom('hamalayi', { x: M.monastery.yard.x, z: M.monastery.yard.z + 2, a: Math.PI }, true);
    this.story.refreshCast();
    this.chain([['narrator', 'c7_narr'], ['yorna', 'c7_yorna_1']], () => { this.f.c7_started = true; g.updateObjective(); g.save(false); });
  }
  doors() {
    const M = this.M;
    return this.isCur() && M ? [{ region: 'hamalayi', x: M.observatory.door.x, z: M.observatory.door.z, r: 1.0, room: 'obsv' }] : [];
  }
  exitTo(to) {
    const M = this.M;
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
        }, 0.3);
        return true;
      }
      case 'c7scope':
        f.c7_scope = true; this.M.vent.melt(); g.audio.play('door'); g.camRig.shake(0.3);
        this.story.refreshCast();
        this.chain([['narrator', 'c7_scope'], ['keeper', 'c7_keeper_5']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c7vent':
        h.act('use', 1.0, () => {
          f.c7_vent = true; this.M.vent.setOpen(true); g.audio.play('horn'); g.camRig.shake(0.5);
          this.story.refreshCast();
          this.chain([['hero', 'c7_vent_seal'], ['narrator', 'c7_vent_open'], ['hero', 'c7_tw_v1'], ['arthurradio', 'c7_arthur_1'], ['hero', 'c7_tw_ar1'], ['arthurradio', 'c7_arthur_2'], ['hero', 'c7_tw_ar2'], ['radio', 'c7_hesk_radio']], () => { g.updateObjective(); g.save(false); });
        }, 0.6);
        return true;
    }
    return false;
  }
  lightCrystal(silent = false) {
    const g = this.game, f = this.f;
    f.c7_lit = true; this.O.crystal.setLit(true);
    if (silent) return;
    g.audio.play('shard'); g.audio.cue?.('revelation');
    this.chain([['narrator', 'c7_lit'], ['sendell', 'c7_sendell_1'], ['hero', 'c7_tw_s1'], ['sendell', 'c7_sendell_2'], ['sendell', 'c7_sendell_3'], ['hero', 'c7_tw_s2'], ['sendell', 'c7_sendell_4'], ['keeper', 'c7_keeper_4']], () => {
      g.audio.endCue?.(); f.c7_sendell = true; g.updateObjective(); g.save(false);
    });
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'keeper':
        if (!f.c7_keeper) return c([['keeper', 'c7_keeper_1'], ['hero', 'c7_tw_k1'], ['keeper', 'c7_keeper_2'], ['keeper', 'c7_keeper_3'], ['hero', 'c7_mirror_hint']], () => { f.c7_keeper = true; g.updateObjective(); g.save(false); });
        if (f.c7_sendell && !f.c7_scope) return c([['keeper', 'c7_keeper_4']]);
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
    this.chain([['hesk', 'c6_hesk_1']], () => { g.save(false); g.startTransition(() => this.story.nextChapter()); });
  }
  update() {
    const g = this.game, f = this.f, M = this.M, h = g.hero;
    if (!this.isCur() || !M) return;
    M.snow.focus = h.pos;
    // the heavy drone: bigger, and its fall is the cue
    const hd = this.heavy();
    if (hd && !hd._big) { hd._big = true; hd.rig.root.scale.multiplyScalar(1.7); hd.hover = 2.2; hd.hitR = 1.3; hd.hitH = 3.6; }
    if (f.c7_scope && !f.c7_droneDown && hd && !hd.alive) {
      f.c7_droneDown = true;
      this.chain([['hero', 'c7_drone_down']], () => { g.updateObjective(); g.save(false); });
    }
    if (f.c7_scope && !f.c7_droneSeen && hd?.present && this.room() === 'hamalayi' && Math.hypot(h.pos.x - M.vent.x, h.pos.z - M.vent.z) < 22 && g.state === 'play') {
      f.c7_droneSeen = true; g.hud.toast('c7_toast_drone'); this.chain([['hero', 'c7_drone_in']]);
    }
    if (f.c7_vent && !f.c7_done && g.state === 'play' && this.room() === 'hamalayi' && Math.hypot(h.pos.x - M.monastery.gate.x, h.pos.z - M.monastery.gate.z) < 4) this.leave();
  }
  applyFlags() {
    const f = this.f, O = this.O, M = this.M;
    if (!this.reached() || !O || !M) return;
    for (const m of O.mirrors) if (f.c7_mirrors?.[m.i]) m.setType(f.c7_mirrors[m.i]);
    O.trace();
    if (f.c7_lit) this.lightCrystal(true);
    if (f.c7_scope) M.vent.melt(true);
    if (f.c7_vent) M.vent.setOpen(true);
  }
  objective() {
    const f = this.f, r = this.room();
    if (!f.c7_started) return '';
    if (f.c7_vent) return this.goal('c7_obj_home');
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
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
