// Chapter 3 — "The Shell".
//
// Twinsen follows Vesk down the drill shaft. In the project's deep installation he cools the bore's heat
// exchanger to free a jammed shutter (a cooling diagram on the wall gives the circuit: valves A and C to
// the exchanger, B to a drain; valve C sits on a catwalk reached by knocking a ladder down with the ball),
// past a maintenance drone. In the crystal galleries the well's crystals have grown huge; waking three
// pillars with the ball raises stepping stones across the chasm (the cliffs' mechanic, bigger). Sendell
// tells him plainly what lies under the shell and why stopping the drill is not enough. In the core Vesk
// sets the bore's guardian on him; Twinsen converts the three pylons with bank shots while his allies,
// by radio, feed each one (Zoé's signal, Mira's valves, Oku's mills). The readings change, and Vesk makes
// the final switch himself. → epilogue.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/ch3.js';

const ROOMS = { 'c3-shaft': 'c3shaft', 'c3-deep': 'c3deep', 'c3-gallery': 'c3gallery', 'c3-sendell': 'c3sendell', 'c3-core': 'c3core' };
const CIRCUIT = { A: true, B: false, C: true }; // the diagram: A and C to the exchanger, B to the drain
const ALLIES = [['zoeradio', 'c3_pylon_1'], ['miraradio', 'c3_pylon_2'], ['okuradio', 'c3_pylon_3']];

export class Chapter3 extends ChapterBase {
  get R() { return this.game.rooms; }
  on() { return (this.f.chapter || 0) === 3; }
  pylons() { return [0, 1, 2].filter((i) => this.f['c3_pylon' + i]).length; }

  // ---------------------------------------------------------------- cast
  enemyDefs() {
    const D = this.R.c3deep, G = this.R.c3gallery, C = this.R.c3core, out = [];
    if (D?.patrol?.length) {
      const n = D.patrol.length;
      out.push({ id: 'c3drone', kind: 'drone', group: 'c3deep', x: D.patrol[0][0], z: D.patrol[0][1], patrol: D.patrol, wp: 1 % n, when: (f) => (f.chapter || 0) === 3 });
    }
    (G?.mites || []).forEach((p, i) => out.push({ id: 'c3mite' + i, kind: 'mite', x: p.x, z: p.z, when: (f) => (f.chapter || 0) === 3 }));
    if (C?.bossSpot) out.push({ id: 'guardian', kind: 'guardian', group: 'core', x: C.bossSpot.x, z: C.bossSpot.z, arena: C.arena, when: (f) => (f.chapter || 0) === 3 && !!f.c3_fight && !f.c3_turned });
    return out;
  }
  place(id) {
    const f = this.f;
    if ((f.chapter || 0) < 3) return undefined;
    if (id === 'vesk') return f.c3_done ? null : (this.R.c3core?.npcSpots?.vesk ?? null);
    return undefined;
  }
  get guardian() { return this.game.enemies.find((e) => e.def?.id === 'guardian'); }

  // ---------------------------------------------------------------- start
  begin() {
    const g = this.game;
    if (!this.R.c3shaft) return; // (rooms missing in this build)
    g.enterRoom('c3shaft', null, true);
    this.chain([['narrator', 'c3_arrive'], ['hero', 'c3_tw_arrive'], ['balradio', 'c3_bal_radio1']], () => {
      this.f.c3_started = true; g.updateObjective(); g.save(false);
    });
  }

  // ---------------------------------------------------------------- moving between rooms
  exitTo(to) {
    if (to === 'c3-up') {
      const P = this.R.zeelich?.platform;
      if (!P) return null;
      return { room: 'zeelich', x: P.pad.x + 2.2, z: P.pad.z, a: Math.PI / 2 };
    }
    const id = ROOMS[to];
    if (!id || !this.R[id]) return null;
    const T = this.R[id], from = this.game.room?.id;
    const back = T.exits.find((e) => ROOMS[e.to] === from);
    if (!back) return { room: id };
    // step in from the matching doorway, toward the middle of the room
    const dx = T.center.x - back.x, dz = T.center.z - back.z, l = Math.hypot(dx, dz) || 1;
    return { room: id, x: back.x + (dx / l) * 1.7, z: back.z + (dz / l) * 1.7, a: Math.atan2(dx, dz) };
  }
  canExit(room) {
    if (room.id === 'c3core' && this.f.c3_fight && !this.f.c3_done) { this.chain([['hero', 'c3_exit_block']]); return false; }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, room = g.room?.id, h = g.hero;
    if (!this.on()) return;
    if (room === 'zeelich') {
      const P = this.R.zeelich.platform;
      if (this.R.c3shaft) consider(dist(P.pad.x, P.pad.z), 2.0, { kind: 'c3down', label: 'p_down' });
    } else if (room === 'c3deep') {
      const D = this.R.c3deep;
      if (D.diagram) consider(dist(D.diagram.x, D.diagram.z), 1.9, { kind: 'c3diagram', label: 'p_read' });
      if (!f.c3_cooled) for (const v of D.valves || []) {
        if (v.y != null && Math.abs(h.pos.y - v.y) > 1.3) continue; // (valve C: only from the catwalk)
        consider(dist(v.x, v.z), 1.7, { kind: 'c3valve', valve: v, label: 'p_valve' });
      }
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'c3down':
        g.startTransition(() => { g.enterRoom('c3shaft', null, true); g.updateObjective(); });
        return true;
      case 'c3diagram': {
        f.c3_diagram = true;
        const lines = [['hero', 'c3_diagram'], ['hero', 'c3_diagram_tw']];
        if (!this.R.c3deep.ladder?.lowered) lines.push(['hero', 'c3_diagram_high']);
        this.chain(lines, () => g.updateObjective());
        return true;
      }
      case 'c3valve': {
        const v = it.valve;
        h.act('use', 0.8, () => {
          const open = !v.open;
          v.setOpen(open); v.open = open;
          (f.c3_valves ||= {})[v.id] = open;
          g.audio.play(open ? 'chest' : 'select');
          g.hud.toast(open ? 'c3_toast_valve_open' : 'c3_toast_valve_closed', { v: v.id });
          if (v.id === 'B' && open) { this.chain([['hero', 'c3_valve_drain']]); return; }
          this.checkCooling();
        }, 0.45);
        return true;
      }
    }
    return false;
  }
  checkCooling() {
    const g = this.game, f = this.f, D = this.R.c3deep;
    const st = f.c3_valves || {};
    if (f.c3_cooled || !Object.entries(CIRCUIT).every(([k, want]) => !!st[k] === want)) return;
    f.c3_cooled = true;
    D.coolDoor?.open?.();
    g.audio.play('rumble'); g.camRig.shake(0.25);
    this.chain([['hero', 'c3_cooled']], () => { g.hud.toast('c3_toast_door'); g.updateObjective(); g.save(false); });
  }

  // ---------------------------------------------------------------- the magic ball
  ballHit(p) {
    const g = this.game, f = this.f, room = g.room?.id;
    if (!this.on() || !g.room) return false;
    for (const tg of g.room.ballTargets || []) {
      if (tg.done) continue;
      if (Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) > (tg.r || 1) + 0.15) continue;
      if (room === 'c3deep' && tg.ballSwitch) { tg.done = true; this.lowerLadder(); return true; }
      if (room === 'c3gallery' && tg.pillar != null) { tg.done = true; this.lightPillar(tg.pillar); return true; }
      if (room === 'c3core' && tg.pylon != null) {
        if (!f.c3_fight) return false;
        tg.done = true; this.convertPylon(tg.pylon); return true;
      }
    }
    return false;
  }
  lowerLadder(silent = false) {
    const g = this.game, D = this.R.c3deep;
    this.f.c3_ladder = true;
    D.ballSwitch?.setOn?.(true);
    if (!D.ladder?.lowered) D.ladder?.lower?.();
    if (silent) return;
    g.audio.play('door');
    this.chain([['hero', 'c3_ladder']], () => { g.updateObjective(); g.save(false); });
  }
  lightPillar(i, silent = false) {
    const g = this.game, f = this.f, G = this.R.c3gallery;
    f['c3_pillar' + i] = true;
    G.pillars?.[i]?.setLit?.(true);
    G.stones?.raise?.(i);
    if (silent) return;
    const n = [0, 1, 2].filter((k) => f['c3_pillar' + k]).length;
    g.audio.play('shard');
    const p = G.pillars?.[i];
    if (p) g.particles.burst(p.x, p.y ?? 2, p.z, '#bff4ff', 20, 3);
    g.hud.toast('c3_toast_pillar', { n });
    if (n >= 3) this.chain([['hero', 'c3_stones_all']], () => { g.updateObjective(); g.save(false); });
    else g.save(false);
  }

  // ---------------------------------------------------------------- the core
  startFight() {
    const g = this.game, f = this.f;
    f.c3_fight = true;
    this.story.refreshCast();
    const gd = this.guardian;
    if (gd) { gd.state = 'chase'; gd.stateT = 0; gd.coolT = 2.5; gd.setLevel?.(this.pylons()); }
    g.hud.toast('c3_toast_fight');
    g.audio.setMood?.('boss');
    g.updateObjective();
  }
  convertPylon(i, silent = false) {
    const g = this.game, f = this.f, C = this.R.c3core;
    f['c3_pylon' + i] = true;
    C.pylons?.[i]?.setState?.(2);
    const n = this.pylons();
    C.field?.setLevel?.(n / 3 * 0.8);
    if (silent) return;
    g.audio.play('shard'); g.camRig.shake(0.2);
    const p = C.pylons?.[i];
    if (p) g.particles.burst(p.x, p.y ?? 2.5, p.z, '#9fe8ff', 26, 4);
    g.hud.toast('c3_toast_pylon', { n });
    this.guardian?.setLevel?.(n);
    const [who, key] = ALLIES[n - 1];
    this.chain([[who, key]], () => { g.save(false); if (n >= 3) this.veskTurns(); else g.updateObjective(); });
  }
  veskTurns() {
    const g = this.game, f = this.f, C = this.R.c3core;
    f.c3_turned = true;
    this.guardian?.powerDown?.();
    this.story.refreshCast();
    const vesk = this.npc('vesk');
    this.chain([['vesk', 'c3_vesk_turn1'], ['hero', 'c3_tw_turn'], ['vesk', 'c3_vesk_turn2'], ['vesk', 'c3_vesk_turn3']], () => {
      vesk?.rig?.play?.('use');
      C.drill?.setMode?.('shield');
      C.field?.setLevel?.(1);
      g.audio.play('horn'); g.camRig.shake(0.3);
      this.chain([['sendell', 'c3_sendell_end']], () => this.finish());
    });
  }
  finish() {
    const g = this.game, f = this.f;
    f.c3_done = true;
    g.save(false);
    g.startTransition(() => {
      if (this.story.chapters.length > 4) this.story.nextChapter();
    });
  }

  // ---------------------------------------------------------------- per room
  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (!this.on()) return;
    if (id === 'c3deep' && !f.c3_deepSeen) { f.c3_deepSeen = true; this.chain([['hero', 'c3_deep_in']], () => g.updateObjective()); }
    if (id === 'c3gallery' && !f.c3_gallerySeen) { f.c3_gallerySeen = true; this.chain([['hero', 'c3_gallery_in'], ['hero', 'c3_gallery_hint']], () => g.updateObjective()); }
    if (id === 'c3sendell' && !f.c3_sendell) {
      const S = this.R.c3sendell;
      S.presence?.setVisible?.(true); S.presence?.setIntensity?.(1);
      this.chain([['sendell', 'c3_sendell_1'], ['hero', 'c3_tw_sendell1'], ['sendell', 'c3_sendell_2'], ['hero', 'c3_tw_sendell2'], ['sendell', 'c3_sendell_3'],
        ['hero', 'c3_tw_sendell3'], ['sendell', 'c3_sendell_4'], ['balradio', 'c3_bal_radio2'], ['balradio', 'c3_bal_radio3']], () => {
        f.c3_sendell = true; S.presence?.setIntensity?.(0.45); g.updateObjective(); g.save(false);
      });
    }
    if (id === 'c3core' && !f.c3_fight) {
      this.chain([['vesk', 'c3_core_vesk1'], ['hero', 'c3_core_tw1'], ['vesk', 'c3_core_vesk2'], ['vesk', 'c3_core_vesk3']], () => this.startFight());
    }
    if (id === 'c3core' && f.c3_fight && !f.c3_turned) g.audio.setMood?.('boss');
  }
  update() {
    const g = this.game, f = this.f;
    if (!this.on()) return;
    // a defeat during the fight respawns at the core's entrance with the fight still on (pylons kept)
    if (f.c3_fight && !f.c3_turned && g.room?.id === 'c3core') {
      const gd = this.guardian;
      if (gd && !gd.present) this.story.refreshCast();
    }
  }
  applyFlags(past) {
    const f = this.f, R = this.R;
    if ((f.chapter || 0) < 3) return;
    const D = R.c3deep, G = R.c3gallery, C = R.c3core;
    if (D) {
      for (const v of D.valves || []) { const o = !!f.c3_valves?.[v.id]; v.setOpen?.(o); v.open = o; }
      if (f.c3_ladder) { for (const tg of D.ballTargets || []) if (tg.ballSwitch) tg.done = true; this.lowerLadder(true); }
      if (f.c3_cooled) D.coolDoor?.open?.();
    }
    if (G) for (const i of [0, 1, 2]) if (f['c3_pillar' + i]) { for (const tg of G.ballTargets || []) if (tg.pillar === i) tg.done = true; this.lightPillar(i, true); }
    if (C) {
      for (const i of [0, 1, 2]) if (f['c3_pylon' + i]) { for (const tg of C.ballTargets || []) if (tg.pylon === i) tg.done = true; this.convertPylon(i, true); }
      if (f.c3_done) { C.drill?.setMode?.('shield'); C.field?.setLevel?.(1); }
    }
    if (f.c3_sendell) { R.c3sendell?.presence?.setVisible?.(true); R.c3sendell?.presence?.setIntensity?.(0.45); }
    // a fight interrupted by a reload restarts when the core is entered again
    if (f.c3_fight && !f.c3_turned) f.c3_fight = false;
    if (f.c3_turned && !f.c3_done) f.c3_turned = false;
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f, room = this.game.room?.id;
    if (!f.c3_started) return '';
    if (f.c3_fight) return this.goal('c3_obj_pylons', { n: this.pylons() });
    if (f.c3_sendell) return this.goal('c3_obj_core');
    if (f.c3_cooled) return this.goal(room === 'c3gallery' ? 'c3_obj_gallery' : 'c3_obj_deeper');
    if (room === 'c3deep') return this.goal('c3_obj_cool') + this.sub(!!f.c3_diagram, 'c3_sub_diagram') + this.sub(!!f.c3_ladder, 'c3_sub_up');
    return this.goal('c3_obj_shaft');
  }
  journal() {
    const f = this.f;
    return [
      { key: 'c3_j_shaft', done: !!f.c3_started },
      { key: 'c3_j_cool', done: !!f.c3_cooled },
      { key: 'c3_j_gallery', done: !!(f.c3_pillar0 && f.c3_pillar1 && f.c3_pillar2) },
      { key: 'c3_j_sendell', done: !!f.c3_sendell },
      { key: 'c3_j_pylons', done: this.pylons() >= 3 },
      { key: 'c3_j_vesk', done: !!f.c3_done },
    ].filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}
