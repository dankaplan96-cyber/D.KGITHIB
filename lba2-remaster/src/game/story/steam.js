// Chapter 5 — "Steam and Sand" (Desert Island).
//
// The vent under the island is the project's capped test bore; opened carelessly it would boil the oasis.
// Ilka's plan: send the steam through FunFrock's old condensers, buried under the dunes. The setback: Dallan
// requisitions the ferry for an evacuation that leaves Kesh off the list. Twinsen trades water for Brosk's
// shovel, digs out the hall's door, routes the steam on the valve manifold (past FunFrock's security drones)
// and opens the hangar's roof hatch. Dallan, at the post's gate, lets him through; the relief valve opens in
// a burst of geysers, and the plumes rise from the condensers instead of the oasis. Zoé, by Ilka's radio,
// has found the second vent: in the Hamalayi ice. The ferry has gone, recalled without Dallan; Hesk launches
// FunFrock's cargo glider from the hangar roof. → chapter 6 (The Pass).
import { ChapterBase } from './base.js';
import { t as t5 } from '../i18n.js';
import '../text/ch5.js';

const GOOD = { 1: true, 2: false, 3: true, 4: true };

export class Steam extends ChapterBase {
  get D() { return this.game.rooms.desert; }
  get A() { return this.game.rooms.condA; }
  get Bh() { return this.game.rooms.condB; }
  room() { return this.game.room?.id; }

  enemyDefs() {
    const A = this.A;
    if (!A?.patrol) return [];
    const P = A.patrol, n = P.length;
    return [
      { id: 'ffdrone1', kind: 'drone', group: 'condA', x: P[0][0], z: P[0][1], patrol: P, wp: 1, when: (f) => this.isCur(f) && !f.c5_routed },
      { id: 'ffdrone2', kind: 'drone', group: 'condA', x: P[2][0], z: P[2][1], patrol: P, wp: 3 % n, when: (f) => this.isCur(f) && !f.c5_routed },
      { id: 'ffguard1', kind: 'guard', group: 'condA', x: P[1][0], z: P[1][1], patrol: [...P].reverse(), wp: 0, when: (f) => this.isCur(f) && !f.c5_routed },
      // one of FunFrock's old troopers (LBA1), found in his buried hall and put back to work by the project
      { id: 'ffclone1', kind: 'fclone', group: 'condA', x: P[3 % n][0], z: P[3 % n][1], patrol: [P[3 % n]], when: (f) => this.isCur(f) && !f.c5_routed },
    ];
  }
  place(id) {
    const f = this.f, D = this.D;
    if (!this.reached() || !D) return undefined;
    const pz = D.plaza, S = D.npcSpots;
    const around = (k, n = 6, r = 3.2) => { const a = (k / n) * Math.PI * 2; return { x: pz.x + Math.cos(a) * r, z: pz.z + Math.sin(a) * r, a: a + Math.PI / 2 + Math.PI }; };
    switch (id) {
      case 'ilka': return f.c5_planned ? { x: pz.x + 2.2, z: pz.z + 1.0, a: -1.2 } : around(0);
      case 'tarra': return f.c5_planned ? S.tarra : around(1);
      case 'hesk':
        if (f.c5_glider && this.Bh) { const g = this.Bh.glider; return { x: g.x - 1.2, z: g.z, a: Math.PI }; }
        return f.c5_planned ? S.hesk : around(2);
      case 'dallan':
        if (f.c5_vent) return { x: pz.x - 2.4, z: pz.z + 1.6, a: 1.4 };
        if (f.c5_planned) { const g = D.post.gate; return { x: g.x - 1.0, z: g.z + 2.2, a: -Math.PI / 2 }; }
        return around(3);
      case 'doran': return f.c5_planned ? { x: pz.x - 1.6, z: pz.z - 2.6, a: 0.4 } : around(4);
      case 'weaver': return f.c5_planned ? S.weaver : around(5);
      case 'guard': return null;
    }
    return undefined;
  }

  begin() {
    const g = this.game, D = this.D;
    g.enterRoom('desert', { x: D.plaza.x + 1.5, z: D.plaza.z - 0.5, a: Math.PI }, true);
    this.story.refreshCast();
    this.chain([['narrator', 'c5_narr'], ['ilka', 'c5_ilka_1'], ['ilka', 'c5_ilka_2'], ['hesk', 'c5_hesk_1'], ['tarra', 'c5_tarra_1'],
      ['dallan', 'c5_dallan_1'], ['doran', 'c5_doran_1'], ['dallan', 'c5_dallan_2'], ['weaver', 'c5_weaver_1'], ['dallan', 'c5_dallan_3'], ['hero', 'c5_tw_1']], () => {
      this.f.c5_planned = true; this.f.c5_ferryTaken = true;
      D.ferry?.setVisible?.(false);
      this.story.refreshCast();
      g.updateObjective(); g.save(false);
    });
  }

  doors() {
    const D = this.D;
    if (this.f.c5_dug && D) return [{ region: 'desert', x: D.ruins.door.x, z: D.ruins.door.z, r: 1.0, room: 'condA' }];
    return [];
  }
  exitTo(to) {
    const D = this.D, A = this.A;
    if (to === 'cond-out') return { room: 'desert', x: D.ruins.stand.x, z: D.ruins.stand.z, a: 0 };
    if (to === 'cond-b') return { room: 'condB' };
    if (to === 'cond-a') return { room: 'condA', x: A.hangarDoor.x, z: A.hangarDoor.z + 0.9, a: 0 };
    return null;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, D = this.D, r = this.room();
    if (!this.isCur()) return;
    if (r === 'desert') {
      if (f.c5_planned && !f.c5_dug) consider(dist(D.ruins.door.x, D.ruins.door.z), 2.4, { kind: 'c5drift', label: f.c5_shovel ? 'p_dig' : 'p_look' });
      if (f.c5_jar && !f.c5_water) consider(dist(D.oasisEdge.x, D.oasisEdge.z), 2.2, { kind: 'c5fill', label: 'p_fill' });
      if (f.c5_dallanOK && !f.c5_relief) consider(dist(D.bore.valve.x, D.bore.valve.z), 1.6, { kind: 'c5relief', label: 'p_relief' });
    } else if (r === 'condA' && !f.c5_routed) {
      const A = this.A;
      consider(dist(A.diagram.x, A.diagram.z), 1.6, { kind: 'c5diagram', label: 'p_read' });
      for (const v of A.valves) consider(dist(v.x, v.z), 1.0, { kind: 'c5valve', valve: v, label: 'p_valve' });
    } else if (r === 'condB') {
      const Bh = this.Bh;
      if (!f.c5_gliderSeen) consider(dist(Bh.glider.x, Bh.glider.z), 2.4, { kind: 'c5glider', label: 'p_look' });
      if (f.c5_glider && f.c5_hatch) consider(dist(Bh.glider.x, Bh.glider.z), 2.4, { kind: 'c5board', label: 'p_board' });
    }
    void g;
  }
  interact(it) {
    const g = this.game, f = this.f, D = this.D, h = g.hero;
    switch (it.kind) {
      case 'c5drift':
        if (!f.c5_shovel) { this.chain([['hero', 'c5_drift']], () => { f.c5_needShovel = true; g.updateObjective(); }); return true; }
        h.act('use', 1.0, () => {
          f.c5_dug = true; D.ruins.setDrift(false); g.audio.play('door');
          g.particles.burst(D.ruins.door.x, h.pos.y + 0.6, D.ruins.door.z, '#f0d8a8', 24, 3);
          this.chain([['hero', 'c5_dug']], () => { g.updateObjective(); g.save(false); });
        }, 0.6);
        return true;
      case 'c5fill':
        f.c5_water = true; g.audio.play('heal'); g.hud.toast('c5_toast_water');
        this.chain([['hero', 'c5_fill']], () => { g.updateObjective(); g.save(false); });
        return true;
      case 'c5relief': this.openRelief(); return true;
      case 'c5diagram': f.c5_diagram = true; this.chain([['hero', 'c5_diagram']], () => g.updateObjective()); return true;
      case 'c5valve': {
        const v = it.valve;
        h.act('use', 0.8, () => {
          v.setOpen(!v.open); (f.c5_valves ||= {})[v.id] = v.open;
          g.audio.play(v.open ? 'chest' : 'select');
          g.hud.toast('c5_toast_valve', { v: v.id, state: t5(v.open ? 'c5_open' : 'c5_shut') });
          this.updateGauges();
          if (v.id === 2 && v.open) { g.audio.play('deny'); this.chain([['hero', 'c5_valve_aquifer']]); return; }
          this.checkRouting();
        }, 0.45);
        return true;
      }
      case 'c5glider':
        f.c5_gliderSeen = true;
        this.chain([['hero', 'c5_glider_1']], () => g.updateObjective());
        return true;
      case 'c5board': this.board(); return true;
    }
    return false;
  }
  updateGauges() {
    const st = this.f.c5_valves || {}, A = this.A;
    const flow = st[1] ? 1 : 0;
    A.gauges.set([flow * (st[3] ? 0.35 : 0.9), flow * (st[4] ? 0.35 : 0.9), flow * (st[2] ? 1.0 : 0.15)]);
  }
  checkRouting() {
    const g = this.game, f = this.f, st = f.c5_valves || {};
    if (f.c5_routed || !Object.entries(GOOD).every(([k, want]) => !!st[k] === want)) return;
    f.c5_routed = true;
    this.A.hangarDoor.open();
    for (const c of this.Bh.condensers) c.setSteam(0.4);
    g.audio.play('rumble'); g.camRig.shake(0.2);
    this.story.refreshCast();
    this.chain([['hero', 'c5_routed']], () => { g.updateObjective(); g.save(false); });
  }
  ballHit(p) {
    const g = this.game, f = this.f;
    if (!this.isCur() || this.room() !== 'condB' || f.c5_hatch) return false;
    const S = this.Bh.ballSwitch;
    if (Math.hypot(p.x - S.x, p.y - S.y, p.z - S.z) < 0.9) { this.openHatch(); return true; }
    void g;
    return false;
  }
  openHatch(silent = false) {
    const g = this.game, f = this.f, Bh = this.Bh;
    f.c5_hatch = true; Bh.ballSwitch.setOn(true); Bh.hatch.open();
    for (const tg of Bh.ballTargets) if (tg.hatch) tg.done = true;
    if (silent) return;
    g.audio.play('door'); g.hud.toast('c5_toast_hatch');
    this.chain([['hero', 'c5_hatch']], () => { g.updateObjective(); g.save(false); });
  }
  openRelief() {
    const g = this.game, f = this.f, h = g.hero;
    h.act('use', 1.2, () => {
      f.c5_relief = true; this.ventT = 0;
      g.audio.play('rumble'); g.camRig.shake(0.5);
      this.chain([['hero', 'c5_relief_1']], () => { g.hud.toast('c5_toast_out'); g.updateObjective(); });
    }, 0.8);
  }
  board() {
    const g = this.game, f = this.f;
    this.Bh.glider.uncover();
    this.chain([['narrator', 'c5_board_1'], ['hesk', 'c5_hesk_board']], () => {
      f.c5_done = true; g.save(false);
      g.startTransition(() => this.story.nextChapter());
    });
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id, h = g.hero;
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'dtrader':
        if (!f.c5_jar && (f.c5_needShovel || f.c5_planned)) return c([['dtrader', 'c5_trader_1']], () => { f.c5_jar = true; g.hud.toast('c5_toast_jar'); g.updateObjective(); g.save(false); });
        if (f.c5_water && !f.c5_shovel) return c([['dtrader', 'c5_trader_2']], () => { f.c5_shovel = true; g.hud.toast('c5_toast_shovel'); g.updateObjective(); g.save(false); });
        if (!f.c5_shovel) return c([['dtrader', 'c5_trader_wait']]);
        return c([['dtrader', 'c4_trader_2']]);
      case 'dallan':
        if (f.c5_vent && !f.c5_radio) return c([['dallan', 'c5_dallan_k1'], ['ilka', 'c5_ilka_k1']]);
        if (f.c5_routed && !f.c5_dallanOK) {
          return c([['dallan', 'c5_dallan_gate1'], ['hero', 'c5_tw_gate1'], ['dallan', 'c5_dallan_gate2'], ['hero', 'c5_tw_gate2'], ['dallan', 'c5_dallan_gate3']], () => {
            f.c5_dallanOK = true; this.D.post.gate.open(); g.updateObjective(); g.save(false);
          });
        }
        return c([['dallan', f.c5_dallanOK ? 'c5_dallan_gate3' : 'c5_dallan_3']]);
      case 'tarra':
        if (f.c5_vent && !f.c5_clover) return c([['tarra', 'c5_tarra_2']], () => { f.c5_clover = true; h.clovers = Math.min(9, h.clovers + 1); g.hud.toast('c5_toast_clover'); this.radio(); });
        if (f.c5_vent && !f.c5_radio) { this.radio(); return true; }
        return c([['tarra', f.c5_vent ? 'c4_tarra_idle' : 'c5_tarra_1']]);
      case 'ilka':
        if (f.c5_vent && !f.c5_radio) { this.radio(); return true; }
        return c([['ilka', f.c5_routed ? 'c5_ilka_2' : 'c5_ilka_1']]);
      case 'hesk':
        if (f.c5_radio && !f.c5_glider) return c([['hesk', 'c5_hesk_k1'], ['hesk', 'c5_hesk_k2']], () => { f.c5_glider = true; this.story.refreshCast(); g.updateObjective(); g.save(false); });
        if (f.c5_glider) return c([['hesk', 'c5_hesk_k2']]);
        return c([['hesk', 'c5_hesk_1']]);
      case 'doran': return c([['doran', 'c5_doran_1']]);
    }
    return false;
  }
  radio() {
    const g = this.game, f = this.f;
    this.chain([['ilka', 'c5_ilka_radio'], ['zoeradio', 'c5_zoe_radio1'], ['zoeradio', 'c5_zoe_radio2'], ['hero', 'c5_tw_radio'], ['zoeradio', 'c5_zoe_radio3'], ['dallan', 'c5_dallan_k1'], ['ilka', 'c5_ilka_k1']], () => {
      f.c5_radio = true; g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, D = this.D, h = g.hero;
    if (!this.isCur() || !D) return;
    // the geysers after the relief valve opens: get clear of the post
    if (f.c5_relief && !f.c5_vent && g.state === 'play') {
      this.ventT = (this.ventT || 0) + dt;
      this.burstT = (this.burstT || 0) - dt;
      if (this.burstT <= 0 && this.room() === 'desert') {
        this.burstT = 0.35;
        const P = D.post, x = P.x0 + Math.random() * (P.x1 - P.x0), z = P.z0 + Math.random() * (P.z1 - P.z0);
        g.particles.burst(x, D.bore.y + 0.3, z, '#ffffff', 18, 6);
        g.camRig.shake(0.08);
        if (Math.hypot(h.pos.x - x, h.pos.z - z) < 2.2 && !h.dead) h.damage(1, { x, y: h.pos.y, z });
      }
      if (this.ventT > 14) this.vent();
    }
    if (f.c5_vent) D.ruins.setPlume(1);
  }
  vent(silent = false) {
    const g = this.game, f = this.f, D = this.D;
    f.c5_vent = true;
    D.ruins.setPlume(1);
    for (const c of this.Bh?.condensers || []) c.setSteam(1);
    this.story.refreshCast();
    if (silent) return;
    g.audio.play('horn');
    this.chain([['narrator', 'c5_vent_1'], ['hero', 'c5_tw_vent']], () => { g.updateObjective(); g.save(false); });
  }
  onEnterRoom(id) {
    const f = this.f;
    if (!this.isCur()) return;
    if (id === 'condA' && !f.c5_hallSeen) { f.c5_hallSeen = true; this.chain([['hero', 'c5_hall_in']]); }
    if (id === 'condB' && !f.c5_hangarSeen) { f.c5_hangarSeen = true; this.chain([['hero', 'c5_hangar_in']]); }
  }
  applyFlags() {
    const f = this.f, D = this.D, A = this.A;
    if (!this.reached() || !D || !A) return;
    if (f.c5_ferryTaken) D.ferry?.setVisible?.(false);
    if (f.c5_dug) D.ruins.setDrift(false);
    for (const v of A.valves) { const o = !!f.c5_valves?.[v.id]; v.setOpen(o); }
    this.updateGauges();
    if (f.c5_routed) { A.hangarDoor.open(); for (const c of this.Bh.condensers) c.setSteam(0.4); }
    if (f.c5_hatch) this.openHatch(true);
    if (f.c5_dallanOK) D.post.gate.open();
    if (f.c5_relief && !f.c5_vent) this.vent(true); // (a save mid-eruption: the steam is through)
    if (f.c5_vent) this.vent(true);
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f;
    if (!f.c5_planned) return '';
    if (f.c5_glider) return f.c5_hatch ? this.goal('c5_obj_glider') : this.goal('c5_obj_hatch');
    if (f.c5_radio) return this.goal('c5_obj_hesk');
    if (f.c5_vent) return this.goal('c5_obj_kesh');
    if (f.c5_relief) return this.goal('c5_obj_out');
    if (f.c5_routed) return this.goal('c5_obj_relief');
    if (f.c5_dug) return this.goal('c5_obj_valves') + this.sub(!!f.c5_diagram, 'c5_sub_diagram');
    if (f.c5_needShovel || f.c5_jar) return this.goal('c5_obj_hall') + this.sub(!!f.c5_water, 'c5_sub_water') + this.sub(!!f.c5_shovel, 'c5_sub_shovel');
    return this.goal('c5_obj_hall');
  }
  items() {
    const f = this.f, out = [];
    if (f.c5_jar && !f.c5_shovel) out.push({ id: 'jar', icon: 'part' });
    if (f.c5_shovel && !f.c5_dug) out.push({ id: 'shovel', icon: 'part' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c5_j_plan', done: !!f.c5_planned },
      { key: 'c5_j_ferry', done: !!f.c5_planned },
      { key: 'c5_j_routed', done: !!f.c5_routed },
      { key: 'c5_j_vent', done: !!f.c5_vent },
      { key: 'c5_j_north', done: !!f.c5_glider },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}

