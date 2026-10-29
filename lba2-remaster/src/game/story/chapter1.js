// Chapter 1 — "The Joint Project" (Citadel Island).
//
// The morning after the well. The project ferry brings Vesk, the friendly
// Zeelich engineer who leads the Joint Project. He asks Twinsen to reopen the
// three old bypass valves of Funfrock's pipeline so the town gets its water
// back (orchard: magic-ball shot through the bars; depot: past the security
// drones; cliffs: the stepping-stone puzzle). The water returns — hot. Vesk
// shows Twinsen the station built in Funfrock's old fortress: the same
// crystals as at the bottom of the well. Zoe slips into the project office
// (playable, stealth) and finds the evacuation plan: only part of the
// population is on it. Confronted, Vesk steps into the transit beam, which
// lifts him to his ship, and he is gone to Zeelich. That evening Arthur's radio
// catches Baldino calling from Zeelich: Baldino has radioed Doran the start code
// of the project's ship at Citadel Spaceport (passenger flights are grounded; a
// project flight is the exception). Doran meets Twinsen at the spaceport and
// flies him across. Twinsun and Zeelich are two planets: the crossing is always
// by spaceship.
import * as THREE from 'three';
import { POI } from '../world.js';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { Watcher } from '../enemies.js';
import '../text/ch1.js';

const V = POI.village;

export class Chapter1 extends ChapterBase {
  constructor(story) {
    super(story);
    this.steamT = 0;
  }

  // ---------------------------------------------------------------- cast
  npcDefs() {
    const W = this.game.world;
    const pe = W.pierEnd;
    return [
      { id: 'vesk', name: 'n_vesk', char: 'vesk', color: '#c8a8ff', x: pe.x + 2, z: pe.z + 1, angle: Math.PI / 2 },
      { id: 'worker', name: 'n_worker', char: 'worker', color: '#9fe0d0', x: pe.x + 4, z: pe.z - 1.2, angle: 0, anim: 'use' },
      { id: 'guard', name: 'n_guard', char: 'guard', color: '#9fe0d0', x: pe.x + 5, z: pe.z + 1.5, angle: Math.PI / 2 },
    ];
  }

  enemyDefs() {
    const W = this.game.world;
    const D = W.depot || { x: POI.camp.x, z: POI.camp.z, patrol: [[POI.camp.x - 5, POI.camp.z - 4], [POI.camp.x + 5, POI.camp.z - 4], [POI.camp.x + 5, POI.camp.z + 5], [POI.camp.x - 5, POI.camp.z + 5]] };
    const when = (f) => this.reached(f) && !f.c1_valve_depot;
    const n = D.patrol.length;
    return [
      { id: 'drone1', kind: 'drone', group: 'depot', x: D.patrol[0][0], z: D.patrol[0][1], patrol: D.patrol, wp: 1, when },
      { id: 'drone2', kind: 'drone', group: 'depot', x: D.patrol[Math.floor(n / 2)][0], z: D.patrol[Math.floor(n / 2)][1], patrol: D.patrol, wp: (Math.floor(n / 2) + 1) % n, when },
      // one of Vesk's guards walks the loop the other way (src/game/guards.js)
      { id: 'guard1', kind: 'guard', group: 'depot', x: D.patrol[n - 1][0], z: D.patrol[n - 1][1], patrol: [...D.patrol].reverse(), wp: 1, when },
      // and his guard dog (LBA2's Zeelich guard dog, src/game/guarddog.js) trots the loop ahead of him
      { id: 'gdog1', kind: 'gdog', coat: 'grey', group: 'depot', x: D.patrol[Math.floor(n / 2)][0], z: D.patrol[Math.floor(n / 2)][1], patrol: [...D.patrol].reverse(), wp: (n - Math.floor(n / 2)) % n, when },
    ];
  }

  // where everyone is during chapter 1
  place(id) {
    const g = this.game, f = this.f, W = g.world, R = g.rooms;
    if (!this.reached()) return id === 'vesk' || id === 'worker' || id === 'guard' ? null : undefined;
    const pe = W.pierEnd, ps = W.pierStart, st = W.station;
    const gateIn = { x: W.gate.x + 3.2, z: W.gate.z };
    switch (id) {
      case 'vesk':
        if (f.c1_veskGone || !f.c1_arrived) return null;
        if (!f.c1_water) return { x: ps.x - 2.5, z: ps.z + 1.2, a: -Math.PI / 2 };
        if (f.c1_zoeDone) return st ? { x: st.beamPad.x + 1.6, z: st.beamPad.z, a: -Math.PI / 2 } : gateIn;
        return R.control?.npcSpots?.vesk ?? gateIn;
      case 'worker':
        if (!f.c1_water) return { x: pe.x + 3.5, z: pe.z - 1.1, a: 0, anim: 'use' };
        return R.control?.npcSpots?.worker ?? { x: gateIn.x + 2, z: gateIn.z + 2, a: 0 };
      case 'guard':
        if (!f.c1_water) return { x: ps.x - 1, z: ps.z - 1.6, a: -Math.PI / 2 };
        if (f.c1_zoeStart && !f.c1_zoeDone) return R.projoffice ? { x: R.projoffice.patrol[0][0], z: R.projoffice.patrol[0][1], a: 0 } : null;
        return { x: W.gate.x + 1.2, z: W.gate.z + 2.6, a: -Math.PI / 2 };
      case 'zoe':
        if (f.c1_zoeStart && !f.c1_zoeDone) return null; // the player is Zoe
        if (f.c1_needZoe && !f.c1_zoeStart) return { x: W.gate.x - 1.5, z: W.gate.z + 1.5, a: Math.PI / 2 };
        if (f.c1_zoeDone && !f.c1_veskGone) return st ? { x: st.beamPad.x - 2.2, z: st.beamPad.z + 1.2, a: Math.PI / 2 } : undefined;
        return R.house.npcSpots.zoe;
      case 'arthur':
        return R.house.npcSpots.arthur;
      case 'doran': {
        // agreed to fly the project's ship: he waits for Twinsen by its hatch at the spaceport
        const sp = W.spaceport;
        if (f.c1_ship && sp) return { x: sp.landing.x - 1.0, z: sp.landing.z + 2.6, a: -Math.PI / 2 };   // (by the walkway, clear of the pad)
        return this.isCur() ? { x: ps.x, z: ps.z + 2.2, a: Math.PI } : undefined;   // (at his harbour, as the prologue left him)
      }
      case 'gilbert':
        return f.c1_water ? { x: W.well.x + 2.2, z: W.well.z + 1.4, a: Math.atan2(-1, 1.4), anim: 'idle' } : R.office?.npcSpots?.gilbert ?? undefined;
      case 'mira':
        return R.office?.npcSpots?.mira ?? undefined;
    }
    return undefined;
  }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.game, W = g.world;
    // morning: back on the surface by the well
    g.exitRoom({ x: W.well.x + 1.8, z: W.well.z - 1.6, a: 0 }, true);
    g.hero.hasBall = true;
    W.ferry?.setVisible?.(false);
    g.audio.endCue();
    g.audio.setMood('calm');
    this.chain([['hero', 'c1_tw_morning'], ['gilbert', 'c1_gil_morning'], ['hero', 'c1_tw_morning2']], () => { this.f.c1_started = true; g.updateObjective(); g.save(false); });
  }

  doors() {
    const g = this.game, W = g.world, f = this.f, out = [];
    const h0 = W.houses[0];
    out.push({ house: h0.id, x: h0.door.x, z: h0.door.z, r: 0.9, room: 'house' });
    const office = W.houses.find((h) => h.id === 'water');
    if (office && g.regions.has('office')) out.push({ house: 'water', x: office.door.x, z: office.door.z, r: 0.9, room: 'office' });
    const st = W.station;
    if (st && f.c1_water && g.regions.has('control') && !f.c1_zoeStart) out.push({ x: st.control.door.x, z: st.control.door.z, r: 0.9, room: 'control' });
    if (st && f.c1_zoeStart && !f.c1_zoeDone && g.regions.has('projoffice')) out.push({ x: st.office.door.x, z: st.office.door.z, r: 0.9, room: 'projoffice' });
    return out;
  }

  exitTo(to) {
    const W = this.game.world, st = W.station;
    const out = (d, ry = 0) => ({ x: d.x + Math.sin(ry) * 1.2, z: d.z + Math.cos(ry) * 1.2, a: ry });
    if (to === 'outdoor-office') { const h = W.houses.find((x) => x.id === 'water'); return out(h.door, h.ry); }
    if (to === 'outdoor-control' && st) return { x: st.control.door.x, z: st.control.door.z - 1.6, a: Math.PI };
    if (to === 'outdoor-projoffice' && st) return { x: st.office.door.x, z: st.office.door.z - 1.6, a: Math.PI };
    return null;
  }

  canExit(room) {
    if (room.id === 'projoffice' && !this.f.c1_plan) { this.chain([['zoe', 'c1_zoe_notyet']]); return false; }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, W = g.world, f = this.f;
    if (!g.room) {
      consider(dist(W.well.x, W.well.z), 2.6, { kind: 'c1well', label: 'p_well' });
      if (f.c1_task) for (const v of W.valves || []) if (!v.open) consider(dist(v.x, v.z), v.kind === 'use' ? 1.8 : 2.4, { kind: 'valve', valve: v, label: v.kind === 'use' ? 'p_valve' : 'p_look' });
      if (!W.gate.open) consider(dist(W.gate.x, W.gate.z), 3.0, { kind: 'c1gate', label: 'p_gate' });
      const st = W.station;
      if (st && f.c1_veskGone && !f.c1_radio) consider(dist(st.beamPad.x, st.beamPad.z), 2.5, { kind: 'beam', label: 'p_look' });
      // the project's ship on the spaceport's pad, once Doran has its start code (same spot and reach as the
      // pad's grounded notice: the chapter's interaction wins the tie, story/islands.js)
      const sp = W.spaceport;
      if (sp && f.c1_ship) consider(dist(sp.pad.x, sp.pad.z), 5.0, { kind: 'c1ship', label: 'p_board' });
    } else if (g.room.id === 'projoffice') {
      for (const s of g.room.searches || []) if (!g.searched.includes(s.id)) consider(dist(s.x, s.z), s.r, { kind: 'locker', spot: s, label: 'p_search' });
    } else if (g.room.id === 'office') {
      for (const s of g.room.searches || []) if (s.id === 'pipemap') consider(dist(s.x, s.z), s.r, { kind: 'pipemap', label: 'p_read' });
    }
  }

  interact(it) {
    const g = this.game, f = this.f, h = g.hero, W = g.world;
    switch (it.kind) {
      case 'c1well':
        if (f.c1_water) { this.chain([['hero', 'c1_well_hot']]); return true; }
        this.chain([['hero', 'c1_well_dry']]);
        return true;
      case 'valve': {
        const v = it.valve;
        if (v.kind === 'ball') { this.chain([['hero', 'c1_valve_bars']]); return true; }
        h.actAt(v.x, v.z, 'use', 1.4, () => this.openValve(v), 0.25);
        g.audio.play('grind');   // (the stiff old wheel; the valve's own hiss when it gives: openValve)
        return true;
      }
      case 'c1gate':
        g.audio.play('deny');
        this.chain([['hero', f.c1_task ? 'c1_gate_task' : 'c1_gate']]);
        return true;
      case 'pipemap':
        g.audio.play('select');
        // (G1-QUEST #19: once the water is back the map is only a map: Mira no longer marks valves that are open)
        if (f.c1_water) { this.chain([['hero', 'c1_map_after']]); return true; }
        f.c1_map = true;
        this.chain([['hero', 'c1_map_1'], ['mira', 'c1_mira_map']], () => { g.updateObjective(); });   // (Mira says she marked them)
        return true;
      case 'locker':
        g.searched.push(it.spot.id);
        h.act('search', 1.1, () => {
          g.audio.play('chest');
          if (it.spot.id === 'locker2') this.foundPlan();
          else this.chain([['zoe', it.spot.id === 'locker1' ? 'c1_zoe_locker1' : 'c1_zoe_locker3']]);
        }, 0.2);
        return true;
      case 'beam':
        this.chain([['hero', 'c1_beam_dead']]);
        return true;
      case 'c1ship':
        this.chain([['doran', 'c1_doran_board']], () => this.toZeelich());
        return true;
    }
    return false;
  }

  talk(npc) {
    const g = this.game, f = this.f;
    const id = npc.def.id;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'zoe':
        if (f.c1_needZoe && !f.c1_zoeStart) return c([['zoe', 'c1_zoe_gate1'], ['hero', 'c1_tw_gate'], ['zoe', 'c1_zoe_gate2'], ['zoe', 'c1_zoe_gate3']], () => this.startZoe());
        if (f.c1_radio) return c([['zoe', 'c1_zoe_go']]);
        if (f.c1_veskGone) return c([['zoe', 'c1_zoe_home2']]);
        if (!f.c1_home) return c([['zoe', 'c1_zoe_home1'], ['hero', 'c1_tw_home1'], ['zoe', 'c1_zoe_home2a'], ['arthur', 'c1_ar_home1'], ['zoe', 'c1_zoe_home3'], ['arthur', 'c1_ar_home2']], () => { f.c1_home = true; g.updateObjective(); g.save(false); });
        return c([['zoe', f.c1_water ? 'c1_zoe_water' : 'c1_zoe_wait']]);
      case 'arthur':
        if (f.c1_veskGone && !f.c1_radio) return c([['arthur', 'c1_ar_radio1'], ['radio', 'c1_baldino_1'], ['hero', 'c1_tw_radio'], ['radio', 'c1_baldino_2'], ['arthur', 'c1_ar_radio2'], ['zoe', 'c1_zoe_radio']], () => { f.c1_radio = true; g.updateObjective(); g.save(false); });
        return c([['arthur', f.c1_radio ? 'c1_ar_after' : 'c1_ar_idle']]);
      case 'vesk':
        if (!f.c1_task) {
          return c([['vesk', 'c1_vesk_1'], ['hero', 'c1_tw_vesk1'], ['vesk', 'c1_vesk_2'], ['hero', 'c1_tw_vesk2'], ['vesk', 'c1_vesk_3'], ['vesk', 'c1_vesk_4']], () => {
            f.c1_task = true; g.updateObjective(); g.save(false);   // (the new goal shows in the objective panel)
          });
        }
        if (!f.c1_water) return c([['vesk', 'c1_vesk_wait']]);
        if (!f.c1_tour) return c([['vesk', 'c1_vesk_tour1'], ['vesk', 'c1_vesk_tour1b'], ['hero', 'c1_tw_tour1b'], ['hero', 'c1_tw_tour1'], ['vesk', 'c1_vesk_tour2'], ['hero', 'c1_tw_tour2'], ['vesk', 'c1_vesk_tour3']], () => {
          f.c1_tour = true; f.c1_needZoe = true; this.story.refreshCast(); g.updateObjective(); g.save(false);
        });
        if (f.c1_zoeDone && !f.c1_veskGone) return c([['zoe', 'c1_conf_zoe1'], ['vesk', 'c1_conf_vesk1'], ['hero', 'c1_conf_tw1'], ['vesk', 'c1_conf_vesk2'], ['zoe', 'c1_conf_zoe2'], ['vesk', 'c1_conf_vesk3'], ['hero', 'c1_conf_tw2'], ['vesk', 'c1_conf_vesk4']], () => this.veskLeaves());
        return c([['vesk', 'c1_vesk_busy']]);
      case 'worker': return c([['worker', f.c1_water ? 'c1_worker_2' : 'c1_worker_1']]);
      case 'guard': return c([['guard', f.c1_water ? 'c1_guard_2' : 'c1_guard_1']]);
      case 'gilbert': return c([['gilbert', f.c1_water ? 'c1_gil_water' : f.c1_task ? 'c1_gil_task' : 'c1_gil_idle']]);
      // (G1-QUEST #19: she asked for the valves even after they were open)
      case 'mira': return c([['mira', f.c1_veskGone ? 'c1_mira_gone' : f.c1_water ? 'c1_mira_water' : f.c1_map ? 'c1_mira_after' : 'c1_mira_idle']]);
      case 'doran':
        // at the harbour he agrees and goes ahead to the spaceport; there, by the ship, he takes Twinsen aboard
        if (f.c1_ship) return c([['doran', 'c1_doran_board']], () => this.toZeelich());
        if (f.c1_radio) return c([['doran', 'c1_doran_ferry1'], ['hero', 'c1_tw_ferry'], ['doran', 'c1_doran_ferry2']], () => { f.c1_ship = true; this.story.refreshCast(); g.updateObjective(); g.save(false); });
        return c([['doran', f.c1_valve_depot ? 'c1_doran_depot' : f.c1_task ? 'c1_doran_drones' : 'c1_doran_idle']]);
      case 'xil': return c([['xil', f.c1_water ? 'c1_xil_2' : 'c1_xil_1']]);
      case 'pippa':
        this.chain([['pippa', f.c1_veskGone ? 'c1_pippa_2' : f.c1_water ? 'c1_pippa_heat' : 'c1_pippa_1']], () => g.openShop());
        return true;
      case 'tim': case 'lulu': return c([[id, 'c1_' + id + (f.c1_water ? '_heat' : '')]]);
    }
    return false;
  }

  ballHit(p) {
    const g = this.game, f = this.f;
    if (g.room || !f.c1_task) return false;
    for (const v of g.world.valves || []) {
      if (v.kind === 'ball' && !v.open && Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z) < 0.9) { this.openValve(v); return true; }
    }
    return false;
  }
  ballTargets() {
    const g = this.game;
    if (g.room || !this.f.c1_task) return [];
    return (g.world.valves || []).filter((v) => v.kind === 'ball' && !v.open).map((v) => ({ x: v.x, y: v.y, z: v.z }));
  }

  openValve(v, silent = false) {
    const g = this.game, f = this.f;
    v.setOpen?.(silent);
    v.open = true;
    f['c1_valve_' + v.id] = true;
    const n = (g.world.valves || []).filter((x) => x.open).length;
    g.world.setWaterFlow?.(n / 3);
    if (silent) return;
    this.valveCue();
    g.particles.burst(v.x, v.y + 0.3, v.z, '#cfefff', 20, 3);
    g.hud.toast('c1_toast_valve', { n });
    g.updateObjective();
    g.save(false);
    if (v.id === 'depot') this.story.refreshCast(); // the depot drones stand down
    if (n >= 3) this.waterT = 0.9; // (game time: pauses with the game, see update)
  }

  // the valve gives (G1-QUEST #5: it played the treasure chest's chime): a clunk and a knock in the pipe, the hiss of
  // the pressure let go and water rushing on down the line (audio.js's synth: its noise bursts and tones)
  valveCue() {
    const A = this.game.audio;
    if (!A.ctx || A.ctx.state !== 'running') return;
    A.play('clunk');
    A.play('pipeKnock');
    A._burst({ dur: 1.25, vol: 0.13, type: 'highpass', f: 5200, f1: 2400, at: 0.08 });          // hiss
    A._burst({ dur: 1.0, vol: 0.12, type: 'bandpass', f: 1500, f1: 900, q: 0.9, at: 0.45 });     // the rush down the pipe
    [300, 380, 340, 470].forEach((fq, i) => A._tone({ f0: fq, f1: fq * 1.3, dur: 0.06, vol: 0.035, at: 0.7 + i * 0.07 }));   // a gurgle
  }

  // the stepping stones on the Whispering Cliffs, heard as they rise after the old target is hit (G1-QUEST #5: the hit
  // only rumbled): a grind as every other one starts and a knock as they settle (main.js hitTarget raises them)
  stonesCue() {
    const W = this.game.world, A = this.game.audio;
    if (!W.stonesRisen || this._stonesHeard || !W.stones?.length) return;
    if (!this._stonesSeen && W.stones.every((s) => s.t > 2)) { this._stonesHeard = true; return; }   // (risen before: silent)
    this._stonesSeen = true;
    const last = W.stones.length - 1;
    for (const [i, s] of W.stones.entries()) {
      if (s.t >= 0 && !s.heard) { s.heard = true; if (i % 2 === 0) A.play('grind'); }
      if (s.t >= 1.4 && !s.settled) { s.settled = true; if (i % 2 === 1 || i === last) A.play('thump'); }
    }
    if (W.stones.every((s) => s.settled)) this._stonesHeard = true;
  }

  // all three valves open: the water comes back to the well — hot. G1-QUEST #4: a short cut to the square shows it (it
  // was only told, over the last valve's view): the pipes knock, the well gurgles and steams, the heat posts light up;
  // the narration comes over that shot, then back to Twinsen for his line. E cuts the shot short; the narration waits.
  waterReturns() {
    const g = this.game, f = this.f, W = g.world;
    f.c1_water = true;
    W.gate.open = true;
    g.audio.play('rumble');
    g.camRig.shake(0.5);
    this.story.refreshCast();
    const done = () => { g.updateObjective(); g.save(false); };
    const shot = g.room ? null : this.waterShotFraming();
    if (!shot) { W.station?.setActive?.(true); this.chain([['narrator', 'c1_water_1'], ['hero', 'c1_tw_water']], done); return; }
    const A = g.audio, wl = W.well, gy = g.physics.groundAt(wl.x, wl.z), h = g.hero;
    let tt = 0, puffT = 0, lit = false;
    const light = () => { if (!lit) { lit = true; W.station?.setActive?.(true); } };   // (the posts warm up over the next seconds)
    const cues = [[0.15, () => A.play('pipeKnock')], [0.45, () => A.play('pipeKnock')], [0.8, () => { A.play('gurgle'); g.particles.burst(wl.x, gy + 1.1, wl.z, '#cfefff', 14, 2.4); }], [1.0, () => A.play('waterRun')], [1.1, light]];
    // the well's steam goes on while the shot holds, under the narration's box too (world updaters run in every state)
    const steam = (dt) => { if ((puffT -= dt) <= 0) { puffT = 0.08; g.particles.burst(wl.x + (Math.random() - 0.5) * 0.8, gy + 1.0, wl.z + (Math.random() - 0.5) * 0.8, '#e8f4ff', 2, 1.4); } };
    W.updaters.push(steam);
    const back = () => {
      const i = W.updaters.indexOf(steam); if (i >= 0) W.updaters.splice(i, 1);
      if (g.camRig.override === shot) { g.camRig.override = null; g.camRig.snap(); }
    };
    g.setState('cutscene');
    g.camRig.override = shot;
    g.camRig.snap();
    g.cutscene = (dt) => {
      tt += dt;
      while (cues.length && tt >= cues[0][0]) cues.shift()[1]();
      h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
      const I = g.input;
      if (tt >= 2.6 || (tt >= 0.9 && (I.pressed('interact') || I.pressed('action') || I.pressed('click')))) {
        light();
        g.cutscene = null;
        g.setState('play');
        this.chain([['narrator', 'c1_water_1'], ['hero', 'c1_tw_water']], () => { back(); done(); }, (i) => { if (i === 1) back(); });
      }
    };
  }
  // the square seen past the well toward Pippa's stall and its heat post (the town's houses behind)
  waterShotFraming() {
    const W = this.game.world, P = this.game.physics, wl = W.well;
    const post = W.heatPosts?.posts?.[W.heatPosts.posts.length - 1] || W.stall;
    if (!wl || !post) return null;
    let ux = wl.x - post.x, uz = wl.z - post.z; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
    // (turned off that line, to the side away from Gilbert — he stands by the well once the water is back: at the frame's
    //  edge, not in front of the lens — so the well's roof does not hide the post either; the first turn and distance with
    //  nothing standing up into the near part of the view (the square's lamps). The aim is low, so the well sits above
    //  the middle of the picture: the narration's box takes the bottom)
    const gy = P.groundAt(wl.x, wl.z), ty = gy + 1.0;
    const clear = (px, py, pz) => {
      for (let k = 0.04; k <= 0.75; k += 0.04) {
        const x = px + (wl.x - px) * k, y = py + (ty - py) * k, z = pz + (wl.z - pz) * k;
        for (const c of P.near(x, z)) if (c.enabled && c.top > y - 1.3 && c.bottom < y && P._inside(c, x, z, 0.5)) return false;
      }
      return true;
    };
    let pos = null;
    for (const d of [7.5, 6.5, 8.5]) for (const a of [-0.45, -0.7, -0.25, -0.95]) {
      if (pos) break;
      const rx = ux * Math.cos(a) - uz * Math.sin(a), rz = ux * Math.sin(a) + uz * Math.cos(a);
      const x = wl.x + rx * d, z = wl.z + rz * d, y = Math.max(gy, P.groundAt(x, z)) + 3.8;
      if (clear(x, y, z)) pos = new THREE.Vector3(x, y, z);
    }
    if (!pos) return null;   // (nowhere clear: the narration plays over the play camera, as before)
    return { pos, look: new THREE.Vector3(wl.x + (post.x - wl.x) * 0.5, gy - 1.4, wl.z + (post.z - wl.z) * 0.5) };
  }

  // ---------------------------------------------------------------- Vesk arrives
  // The project ferry glides in without a sound, a horn, the gangway, and Vesk
  // walks down to the quay where half the town is waiting.
  startArrival() {
    const g = this.game, W = g.world, F = W.ferry, h = g.hero, f = this.f;
    this.arriving = true;
    g.setState('cutscene');
    F.setVisible(true);
    F.cols?.forEach?.((c) => (c.enabled = false));
    const base = F.group.position.clone();
    const ps = W.pierStart;
    const vesk = this.npc('vesk');
    const spot = { x: ps.x - 2.5, z: ps.z + 1.2 };
    const gang = F.gangway || { x: F.x, z: F.z + 2 };
    let tt = 0, spoke = false;
    this._veskDue = null;
    // the camera watches from the quay, over Twinsen's shoulder
    const camPos = new THREE.Vector3(ps.x + 9, g.physics.groundAt(ps.x, ps.z) + 6.5, ps.z + 9);
    g.camRig.override = { pos: camPos, look: new THREE.Vector3(gang.x, F.y ?? 1.2, gang.z) };
    h.angle = Math.atan2(gang.x - h.pos.x, gang.z - h.pos.z);
    g.cutscene = (dt) => {
      tt += dt;
      const k = Math.min(1, tt / 6), e = 1 - Math.pow(1 - k, 3);
      F.group.position.set(base.x - (1 - e) * 34, base.y, base.z - (1 - e) * 6);
      F.group.rotation.y = (1 - e) * 0.25;
      if (tt > 0.2 && !this._horn1) { this._horn1 = true; g.audio.play('horn'); }
      if (tt > 5.8 && !this._horn2) { this._horn2 = true; g.audio.play('horn'); g.camRig.shake(0.15); }
      if (tt > 6.4 && !vesk.present) { vesk.setPresent(true); vesk.placeAt({ x: gang.x, z: gang.z, a: Math.atan2(spot.x - gang.x, spot.z - gang.z) }); }
      if (vesk.present) {
        const d = Math.hypot(spot.x - vesk.pos.x, spot.z - vesk.pos.z);
        // (if something blocks his path he is placed on his mark: the scene must never hang)
        this._veskDue ??= tt + d / 1.5 + 3;
        if (tt > this._veskDue && d > 0.3) vesk.placeAt({ x: spot.x, z: spot.z, a: vesk.angle });
        else if (d > 0.3) {
          vesk.angle = Math.atan2(spot.x - vesk.pos.x, spot.z - vesk.pos.z);
          g.physics.move(vesk, Math.sin(vesk.angle) * 1.5 * dt, Math.cos(vesk.angle) * 1.5 * dt);
          vesk.controlled = true; vesk.rig.play('walk'); vesk.rig.update(dt, 1.5); vesk.sync();
        } else if (!spoke) {
          spoke = true;
          vesk.controlled = false;
          g.cutscene = null;
          g.camRig.override = null;
          F.group.position.copy(base); F.group.rotation.y = 0;
          f.c1_arrived = true;
          this.arriving = false;
          F.setVisible(true);
          this.story.refreshCast();
          g.setState('play');
          this.chain([['narrator', 'c1_arrive_1'], ['vesk', 'c1_vesk_speech'], ['gilbert', 'c1_gil_speech']], () => { g.updateObjective(); g.save(false); });
        }
      }
      h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
    };
  }

  // ---------------------------------------------------------------- Zoe's segment
  startZoe() {
    const g = this.game, f = this.f, h = g.hero, R = g.rooms.projoffice;
    f.c1_zoeStart = true;
    this.story.refreshCast();
    // Twinsen keeps Vesk busy; we follow Zoe
    this.saved = { behaviour: h.behaviour, hasBall: h.hasBall };
    h.swapBody('zoe');
    h.hasBall = false; h.noBehaviours = true; h.behaviour = 'discreet';
    g.hud.behaviour('discreet');
    g.hud.weapon(h); g.hud.weaponShowT = 0;   // (G1-QUEST #21: Zoé carries nothing: no "Fists" pill flashing up as she goes in)
    // (the objective panel says it as the room comes up: "Zoé: find the evacuation plan without getting caught")
    const guard = this.npc('guard');
    if (R && guard) {
      guard.controlled = true;
      this.watcher = new Watcher(g, guard, R.patrol, { range: 6.5, fov: 0.7, onSpot: () => this.zoeSpotted() });
    }
    g.enterRoom('projoffice');
    g.updateObjective();
  }
  zoeSpotted() {
    const g = this.game, R = g.rooms.projoffice;
    this.watcher.stop();
    g.audio.play('alert');
    this.chain([['guard', 'c1_guard_spot'], ['zoe', 'c1_zoe_spotted']], () => {
      g.startTransition(() => {
        const sp = R.spawn;
        g.hero.pos.set(sp.x, g.physics.groundAt(sp.x, sp.z), sp.z); g.hero.angle = sp.a ?? 0;
        this.watcher.start();
      });
    });
  }
  // G1-QUEST #7: the guard's sight, drawn the way he looks and only as far as he can see. enemies.js's sector lay turned
  // half round (behind him: through the office wall and out of the room) and ran on through walls and lockers. Here it
  // is a fan of rays at his eye height, each stopped by the room's walls (and its door) and by anything taller than that
  // (desks are lower: he sees over them, as his check does), redrawn as he turns.
  updateCone() {
    const w = this.watcher, g = this.game, P = g.physics, R = g.room;
    if (!w?.active || !w.cone) return;
    const N = 20;
    if (!this._cone || w.cone.geometry !== this._cone.geo) {
      const pos = new Float32Array((N + 2) * 3), idx = [];
      for (let i = 1; i <= N; i++) idx.push(0, i, i + 1);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      w.cone.geometry.dispose(); w.cone.geometry = geo; w.cone.frustumCulled = false;
      this._cone = { geo, pos };
    }
    const n = w.npc, y = n.pos.y + 1.2, C = this._cone, b = R?.bounds;
    const blocked = (x, z) => {
      if (b && (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1)) return true;
      for (const c of P.near(x, z)) if (c.enabled && !c.seeThrough && c.top > y && c.bottom < y && P._inside(c, x, z)) return true;
      return false;
    };
    for (let i = 0; i <= N; i++) {
      const th = -w.fov + (2 * w.fov * i) / N, a = n.angle + th, dx = Math.sin(a), dz = Math.cos(a);
      let d = 0.35;
      while (d < w.range && !blocked(n.pos.x + dx * d, n.pos.z + dz * d)) d += 0.2;
      d = d >= w.range ? w.range : Math.max(0.35, d - 0.1);   // (half a step back: to the edge of what stopped it)
      if (b) {   // (and never past the room's inside: exactly, not to the nearest step)
        if (dx > 1e-6) d = Math.min(d, (b.x1 - n.pos.x) / dx); else if (dx < -1e-6) d = Math.min(d, (b.x0 - n.pos.x) / dx);
        if (dz > 1e-6) d = Math.min(d, (b.z1 - n.pos.z) / dz); else if (dz < -1e-6) d = Math.min(d, (b.z0 - n.pos.z) / dz);
        d = Math.max(0, d);
      }
      C.pos[(i + 1) * 3] = Math.sin(th) * d; C.pos[(i + 1) * 3 + 1] = 0; C.pos[(i + 1) * 3 + 2] = Math.cos(th) * d;
    }
    C.geo.attributes.position.needsUpdate = true;
    w.cone.material.opacity = 0.26 + w.suspicion * 0.24;   // (Watcher's 0.14 hardly showed on the office's pale tiles)
  }
  foundPlan() {
    const g = this.game, f = this.f;
    f.c1_plan = true;
    g.audio.cue('revelation');
    g.audio.play('shard');
    this.chain([['zoe', 'c1_zoe_plan1'], ['zoe', 'c1_zoe_plan2'], ['zoe', 'c1_zoe_plan3']], () => { g.audio.endCue(); g.updateObjective(); g.save(false); });
  }
  endZoe() {
    const g = this.game, f = this.f, h = g.hero;
    f.c1_zoeDone = true;
    this.watcher?.stop();
    const guard = this.npc('guard');
    if (guard) guard.controlled = false;
    h.swapBody('twinsen');
    h.hasBall = true; h.noBehaviours = false;
    h.behaviour = this.saved?.behaviour || 'normal';
    g.hud.behaviour(h.behaviour);
    this.story.refreshCast();
    const st = g.world.station;
    if (st) { h.pos.set(st.beamPad.x - 3, g.physics.groundAt(st.beamPad.x - 3, st.beamPad.z), st.beamPad.z); h.angle = Math.PI / 2; }
    g.updateObjective();
    g.save(false);
  }

  // Vesk steps into the transit beam and is gone
  veskLeaves() {
    const g = this.game, f = this.f, W = g.world, vesk = this.npc('vesk');
    g.setState('cutscene');
    W.station?.setBeam?.(true);
    g.audio.play('rumble');
    let tt = 0;
    const pad = W.station?.beamPad || vesk.pos;
    g.cutscene = (dt) => {
      tt += dt;
      if (tt < 1.6) {
        vesk.angle = Math.atan2(pad.x - vesk.pos.x, pad.z - vesk.pos.z);
        g.physics.move(vesk, Math.sin(vesk.angle) * 1.2 * dt, Math.cos(vesk.angle) * 1.2 * dt);
        vesk.rig.play('walk'); vesk.rig.update(dt, 1.2); vesk.sync();
      } else if (tt < 2.6) {
        vesk.rig.play('idle'); vesk.rig.update(dt, 0);
        const k = 1 - (tt - 1.6);
        vesk.rig.root.scale.setScalar(Math.max(0.01, k) * (vesk.baseScale ??= vesk.rig.root.scale.y || 1));
        if (Math.random() < 0.4) g.particles.burst(vesk.pos.x, vesk.pos.y + 1, vesk.pos.z, '#9ff4ff', 3, 2);
      } else {
        g.cutscene = null;
        vesk.rig.root.scale.setScalar(vesk.baseScale || 1);
        f.c1_veskGone = true;
        W.station?.setBeam?.(false);
        this.story.refreshCast();
        g.setState('play');
        this.chain([['zoe', 'c1_after_zoe'], ['hero', 'c1_after_tw']], () => { g.updateObjective(); g.save(false); });
      }
    };
  }

  // Doran flies Twinsen to Zeelich in the project's ship, from Citadel Spaceport
  toZeelich() {
    const g = this.game, f = this.f;
    g.startTransition(() => {
      if (this.story.chapters.length > 2) { this.story.nextChapter(); return; }
      // chapter 2 isn't in this build yet: close the chapter properly
      f.c1_done = true;
      g.save(false);
      g.setState('ending');
      g.hud.show(false);
      g.showScreen('ending');
      g.audio.setMood('ending');
    }, this.story.nextAreas());   // (LAZY-REGIONS: Zeelich built behind the black, under its card)
  }
  afterEnding() { this.game.updateObjective(); }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, W = g.world;
    if (!f.c1_started) return;
    if (this.waterT > 0 && g.state === 'play' && (this.waterT -= dt) <= 0) this.waterReturns();
    // the ferry is in the harbour once Vesk has arrived
    if (!this.arriving) W.ferry?.setVisible?.(!!f.c1_arrived);
    // first time Twinsen comes down to the harbour after talking to Zoe: the ferry docks
    if (f.c1_home && !f.c1_arrived && !g.room && g.state === 'play' && W.ferry && W.pierStart && Math.hypot(h.pos.x - W.pierStart.x, h.pos.z - W.pierStart.z) < 16) this.startArrival();
    // the well steams once the hot water is back
    if (f.c1_water && !g.room) {
      this.steamT -= dt;
      if (this.steamT <= 0) { this.steamT = 0.25; g.particles.burst(W.well.x + (Math.random() - 0.5), g.physics.groundAt(W.well.x, W.well.z) + 1.0, W.well.z + (Math.random() - 0.5), '#e8f4ff', 2, 1.2); }
    }
    // resumed from a save made in Zoe's segment: Twinsen was put back in the project office; out to the gate
    if (g.room?.id === 'projoffice' && !f.c1_zoeStart && g.state === 'play' && !g.trans) { g.exitRoom(this.exitTo('outdoor-projoffice'), true); g.updateObjective(); }
    if (this.watcher?.active) { this.watcher.update(dt); this.updateCone(); }
    this.stonesCue();
    // Zoe slips out with the plan
    if (g.room?.id === 'projoffice' && f.c1_zoeStart && !this.watcher?.active && !f.c1_plan && g.state === 'play') this.watcher?.start();
  }

  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (id === 'projoffice' && f.c1_zoeStart && !f.c1_zoeDone) {
      this.watcher?.start();
      if (!f.c1_zoeIntro) { f.c1_zoeIntro = true; this.chain([['zoe', 'c1_zoe_in']]); }
    }
    if (id === 'control' && !f.c1_control) { f.c1_control = true; this.chain([['hero', 'c1_tw_control']]); }
    if (id === 'office' && !f.c1_officeSeen) { f.c1_officeSeen = true; this.chain([['mira', 'c1_mira_office']]); }
  }
  onExitRoom(id) {
    const f = this.f;
    if (id === 'projoffice' && f.c1_plan && !f.c1_zoeDone) this.endZoe();
  }

  applyFlags(past, current) {
    const g = this.game, f = this.f, W = g.world;
    for (const v of W.valves || []) if (f['c1_valve_' + v.id]) this.openValve(v, true);
    // a save from between the third valve and the water scene must not leave the chapter stuck
    if (!f.c1_water && (W.valves || []).length && W.valves.every((v) => v.open)) f.c1_water = true;
    if (f.c1_water) { W.gate.open = true; W.station?.setActive?.(true); }
    // a save made during Zoe's segment resumes at its start (as Twinsen at the station gate: see update), with
    // the lockers to search again — a plan found and saved but not carried out must be findable again
    if (f.c1_zoeStart && !f.c1_zoeDone) { f.c1_zoeStart = false; f.c1_plan = false; g.searched = g.searched.filter((id) => !/^locker\d$/.test(id)); g.hero.hasBall = true; g.hero.behaviour = 'normal'; }   // (and his own ball: the save was taken after Zoé's swap)
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f, g = this.game;
    const valves = g.world.valves || [];
    if (!f.c1_started) return '';
    if (f.c1_ship) return this.goal('c1_obj_ship');
    if (f.c1_radio) return this.goal('c1_obj_ferry');
    if (f.c1_veskGone) return this.goal('c1_obj_home');
    if (f.c1_zoeDone) return this.goal('c1_obj_confront');
    if (f.c1_zoeStart) return f.c1_plan ? this.goal('c1_obj_zoe_out') : this.goal('c1_obj_zoe');
    if (f.c1_needZoe) return this.goal('c1_obj_meetzoe');
    if (f.c1_water) return this.goal('c1_obj_station');
    if (f.c1_task) return this.goal('c1_obj_valves') + valves.map((v) => this.sub(v.open, 'c1_valve_' + v.id)).join('');
    if (!f.c1_home) return this.goal('c1_obj_home1');
    return this.goal('c1_obj_harbour');
  }
  markers() {
    const f = this.f, g = this.game, W = g.world, m = [];
    const gold = '#ffcf4a';
    const npcAt = (id, label) => { const n = this.npc(id); if (n?.present) m.push({ x: n.pos.x, z: n.pos.z, kind: 'star', color: gold, r: 7, edge: true, label: label && t(label) }); };
    if (!f.c1_started) return m;
    if (!f.c1_home) m.push({ x: W.houses[0].x, z: W.houses[0].z, kind: 'star', color: gold, r: 7, edge: true });
    else if (!f.c1_arrived) m.push({ x: W.pierStart.x, z: W.pierStart.z, kind: 'star', color: gold, r: 7, edge: true });
    else if (!f.c1_task) npcAt('vesk', 'n_vesk');
    else if (!f.c1_water && (f.c1_map || f.c1_task)) for (const v of W.valves || []) if (!v.open) m.push({ x: v.x, z: v.z, kind: 'star', color: gold, r: 6, edge: true, label: t('c1_mk_' + v.id) });   // (G1-QUEST #21: a short name on the map; the objective keeps the hint)
    if (f.c1_water && !f.c1_tour) npcAt('vesk', 'n_vesk');
    if (f.c1_needZoe && !f.c1_zoeStart) npcAt('zoe', 'n_zoe');
    if (f.c1_veskGone && !f.c1_radio) m.push({ x: W.houses[0].x, z: W.houses[0].z, kind: 'star', color: gold, r: 7, edge: true });
    if (f.c1_ship && W.spaceport) m.push({ x: W.spaceport.pad.x, z: W.spaceport.pad.z, kind: 'star', color: gold, r: 7, edge: true, label: t('n_doran') });
    else if (f.c1_radio) npcAt('doran', 'n_doran');
    return m;
  }
  items() {
    const f = this.f, out = [];
    if (f.c1_map && !f.c1_water) out.push({ id: 'pipemap', icon: 'map' });
    if (f.c1_needZoe && !f.c1_plan) out.push({ id: 'leaflet', icon: 'leaflet' });
    if (f.c1_plan && (!f.c2_planTaken || f.c2_planBack)) out.push({ id: 'evacplan', icon: 'plan' }); // (confiscated on Zeelich until recovered)
    return out;
  }
  // (G1-QUEST #3: the next, unfinished step was listed too, written as done, in the past tense. The journal keeps what
  // has happened; the step ahead is the objective, at the top of the same screen)
  journal() {
    const f = this.f;
    return [
      { key: 'c1_j_morning', done: !!f.c1_started },
      { key: 'c1_j_vesk', done: !!f.c1_task },
      { key: 'c1_j_valves', done: !!f.c1_water },
      { key: 'c1_j_station', done: !!f.c1_tour },
      { key: 'c1_j_plan', done: !!f.c1_plan },
      { key: 'c1_j_vesk_gone', done: !!f.c1_veskGone },
      { key: 'c1_j_radio', done: !!f.c1_radio },
    ].filter((l) => l.done);
  }
}
