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
// lifts him to his ship, and he is gone to Zeelich. Later Arthur's radio
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
import { crossByShip } from '../travelfilm.js';
import { revealBeat, solidAt, twoShot } from './revealcam.js';
import { dampAngle } from '../../engine/math.js';
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
      { id: 'worker', name: 'n_worker', char: 'worker', color: '#9fe0d0', x: pe.x + 6.5, z: pe.z + 0.9, angle: -1.42, anim: 'use' },
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
    // (on their way somewhere the story sent them: where they are, the rest of the way still to walk — walkOff)
    const wk = this.walkers?.[id];
    if (wk) return { x: wk.n.pos.x, z: wk.n.pos.z, a: wk.n.angle, track: wk.n.track ? wk.n.track.cmds.slice(wk.n.track.pc) : null };
    // (STAGING-1, the user 4.11: after the talk Twinsen stood in the beam pad's light: Vesk waits off the pad, in front
    //  of its arch (west), Zoé beside the way in; nobody has to step on the pad to talk to him)
    const PAD = st ? { vesk: { x: st.beamPad.x - 3.4, z: st.beamPad.z + 0.3, a: -Math.PI / 2 }, zoe: { x: st.beamPad.x - 4.7, z: st.beamPad.z + 2.1, a: Math.atan2(1.3, -1.8) } } : null;
    switch (id) {
      case 'vesk':
        if (this.arriving) return undefined;   // (on deck or on the gangway: startArrival moves him)
        if (f.c1_veskGone || !f.c1_arrived) return null;
        if (!f.c1_water) return { x: ps.x - 2.5, z: ps.z + 1.2, a: Math.PI / 2 };   // (facing the town, not the sea)
        if (f.c1_zoeDone) return PAD ? PAD.vesk : gateIn;
        return R.control?.npcSpots?.vesk ?? gateIn;
      case 'worker':
        // (POLISH-A: on the pier's north side, working toward the crane's mast, 3.4 m from Xil and clear of Vesk's way off
        //  the gangway: he stood 0.6 m from Xil's middle, the two bodies in each other)
        if (!f.c1_water) return { x: pe.x + 6.5, z: pe.z + 0.9, a: -1.42, anim: 'use' };
        return R.control?.npcSpots?.worker ?? { x: gateIn.x + 2, z: gateIn.z + 2, a: 0 };
      case 'guard':
        // (POLISH-A: on the quay beside the way onto the pier: he stood in the harbour bell's post and the mouth's pillar)
        if (!f.c1_water) return { x: ps.x + 0.6, z: ps.z - 1.4, a: -Math.PI / 2 };
        if (f.c1_zoeStart && !f.c1_zoeDone) return R.projoffice ? { x: R.projoffice.patrol[0][0], z: R.projoffice.patrol[0][1], a: 0 } : null;
        return { x: W.gate.x + 1.2, z: W.gate.z + 2.6, a: -Math.PI / 2 };
      case 'zoe':
        if (f.c1_zoeStart && !f.c1_zoeDone) return null; // the player is Zoe
        if (f.c1_needZoe && !f.c1_zoeStart) return { x: W.gate.x - 1.5, z: W.gate.z + 1.5, a: Math.PI / 2 };
        if (f.c1_zoeDone && !f.c1_veskGone) return PAD ? PAD.zoe : undefined;
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
        return f.c1_water ? { x: W.well.x + 2.2, z: W.well.z + 1.4, a: Math.atan2(-1, 1.4), anim: 'wipe' } : R.office?.npcSpots?.gilbert ?? undefined;
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
        this.chain([['hero', 'c1_map_1'], ['mira', 'c1_mira_map']], () => { g.updateObjective(); g.found('pipemap', 'it_pipemap'); });   // (Mira says she marked them)
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
        // (STAGING-1: he sets off up the quay toward the town and the spaceport, and is at the ship once out of sight)
        if (f.c1_radio) return c([['doran', 'c1_doran_ferry1'], ['hero', 'c1_tw_ferry'], ['doran', 'c1_doran_ferry2']], () => {
          f.c1_ship = true;
          const ps = g.world.pierStart;
          this.walkOff('doran', [{ x: ps.x + 5.5, z: ps.z + 2.6 }, { x: -95.8, z: 37.4 }, { x: -82.0, z: 36.0 }, { x: -67.9, z: 29.6 }], 1.15);
          g.updateObjective(); g.save(false);
        });
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
    if (v.id === 'depot') this.depotStandDown(); // the depot drones stand down
    if (n >= 3) this.waterT = 0.9; // (game time: pauses with the game, see update)
  }

  // The depot's patrol stands down once its valve is open (POLISH-A; the user: nobody pops out of sight in view). It
  // used to be a refresh of the cast: the two drones, the guard and his dog vanished mid-chase in front of him. Now the
  // ones the camera can't see go at once; the others drop the chase (their own minds off: no shots, no bites, not a
  // target) and go back to walking (flying) their round, calm, and are gone the moment they are out of view (25 s at
  // most). Nothing is saved: after a load their `when` keeps them away, as before.
  depotStandDown() {
    const g = this.game;
    this.standing = [];
    for (const e of g.enemies) {
      if (e.def?.group !== 'depot' || !e.present) continue;
      if (!e.alive || e.gone || this.unseen(e.pos)) { e.setPresent(!!e.def.when?.(this.f)); continue; }
      e.present = false;   // (its update stops here: drawn still, moved by tickStandDown)
      if (e.aimLine) e.aimLine.visible = false;
      g.combatDir?.done(e);
      this.standing.push({ e, t: 0 });
    }
  }
  tickStandDown(dt) {
    const S = this.standing, g = this.game;
    if (!S?.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i], e = s.e;
      s.t += dt;
      if (!e.rig.root.visible || !e.alive || (s.t > 0.6 && this.unseen(e.pos)) || s.t > 25) { e.setPresent(false); S.splice(i, 1); continue; }
      if (g.state !== 'play') continue;
      const pts = e.patrol?.length ? e.patrol : [[e.home.x, e.home.z]], [tx, tz] = pts[e.wp % pts.length];
      const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz), flyer = e.hover != null;
      if (d < 0.6 && pts.length > 1) e.wp = (e.wp + 1) % pts.length;
      const sp = d < 0.6 || s.t < 0.8 ? 0 : flyer ? 1.6 : 1.3;   // (a beat where it stands, then its round at a walk)
      e.angle = dampAngle(e.angle, Math.atan2(dx, dz), 4, dt);
      if (sp) g.physics.move(e, Math.sin(e.angle) * sp * dt, Math.cos(e.angle) * sp * dt);
      if (flyer) { e.rig.mood = 'calm'; e.rig.play?.('idle'); e.rig.update(dt); e.syncHover(); continue; }
      g.physics.fall?.(e, dt);
      e.rig.play(sp ? 'walk' : 'idle');
      e.placeRig?.();
      e.rig.update(dt, sp);
      e.sync();
    }
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
    const cues = [[0.15, () => A.play('pipeKnock')], [0.45, () => A.play('pipeKnock')], [0.8, () => { A.play('gurgle'); W.well.setWater?.(true); g.particles.burst(wl.x, gy + 1.1, wl.z, '#cfefff', 14, 2.4); }], [1.0, () => A.play('waterRun')], [1.1, light]];
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
  // The project ferry glides in without a sound, a horn, the gangway, and Vesk walks down to the quay.
  // FERRY-1 (the user, 4.11): it sailed on its round after chapter 1's opening (prologue.js ferryAway), so this is its
  // return, not a second arrival. It comes in from the open sea on one smooth curve (a Bézier, at a speed that eases
  // off over its last 16 m), swings alongside and settles against the fenders with a small roll; the glow under its
  // hull trails a pale mist, the funnel puffs, and at the berth the horn blows with a cloud of steam. Vesk rides on
  // deck, a figure at the rail in the wide shot, and is revealed close: low at the gangway's foot as he comes down it,
  // then walking into a medium shot at his mark for the speech (VESK-ENTRANCE). E / Space skips to the end state.
  startArrival() {
    const g = this.game, W = g.world, F = W.ferry, h = g.hero;
    this.arriving = true;
    g.setState('cutscene');
    F.setVisible(true);
    const grp = F.group, base = grp.position.clone();
    const ps = W.pierStart, pe = W.pierEnd;
    const vesk = this.npc('vesk');
    const mark = { x: ps.x - 2.5, z: ps.z + 1.2 };
    const gang = F.gangway || { x: F.x, z: F.z + 2 };
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const world = (lx, ly, lz) => { grp.updateMatrixWorld(true); return grp.localToWorld(V3(lx, ly, lz)); };
    const ground = (x, z) => g.physics.groundAt(x, z);
    const deckY = F.y ?? 1.73, pierY = ground(gang.x + 0.5, ps.z);
    // the way in, in the harbour's frame (the ferry's bow is its local +x; it berths heading +x)
    const P = [[-46, -24], [-26, -23], [-15, 0.15], [0, 0]].map(([dx, dz]) => ({ x: base.x + dx, z: base.z + dz }));
    const bez = (u) => { const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; return { x: a * P[0].x + b * P[1].x + c * P[2].x + d * P[3].x, z: a * P[0].z + b * P[1].z + c * P[2].z + d * P[3].z }; };
    const LUT = [0];
    { let q = bez(0); for (let i = 1; i <= 200; i++) { const r = bez(i / 200); LUT.push(LUT[i - 1] + Math.hypot(r.x - q.x, r.z - q.z)); q = r; } }
    const L = LUT[200], V0 = 8.5, DEC = 16;   // m/s gliding in, then easing to a stop over its last DEC m
    const T_CRUISE = (L - DEC) / V0, T_SAIL = T_CRUISE + (2 * DEC) / V0;
    const sAt = (t) => (t < T_CRUISE ? V0 * t : t < T_SAIL ? L - DEC + DEC * (1 - Math.pow(1 - (t - T_CRUISE) / (T_SAIL - T_CRUISE), 2)) : L);
    const uAt = (s) => { let i = 1; while (i < 200 && LUT[i] < s) i++; const s0 = LUT[i - 1], s1 = LUT[i]; return (i - 1 + (s1 > s0 ? Math.min(1, (s - s0) / (s1 - s0)) : 0)) / 200; };
    const SETTLE = 1.3;
    let tt = 0, dock = null, prevYaw = null, puffT = 0, mistT = 0, walk = null, said = false, skip = false;
    // Vesk aboard: at the rail by the gangway, looking at the town
    const RIDE = { x: 1.0, z: 1.05 };
    vesk.setPresent(true); vesk.controlled = true; vesk.forceAnim = null;
    const ride = (dt = 0) => { const p = world(RIDE.x, deckY, RIDE.z); vesk.pos.copy(p); vesk.angle = grp.rotation.y; vesk.rig.play('idle'); vesk.rig.update(dt, 0); vesk.sync(); };
    const shipAt = (t) => {
      const s = sAt(Math.min(t, T_SAIL)), u = uAt(s), p = bez(u), q = bez(Math.min(1, u + 0.004)), r = bez(Math.max(0, u - 0.004));
      const yaw = Math.atan2(-(q.z - r.z), q.x - r.x);
      grp.position.x = p.x; grp.position.z = p.z; grp.rotation.y = yaw;
      return { yaw, v: t < T_CRUISE ? V0 : t < T_SAIL ? V0 * (1 - (t - T_CRUISE) / (T_SAIL - T_CRUISE)) : 0 };
    };
    // steam from the funnel (a puff, or the berth's cloud)
    const steam = (n, big = false) => {
      for (let k = 0; k < n; k++) {
        const p = world(-3.4 + (Math.random() - 0.5) * 0.4, deckY + 3.45, (Math.random() - 0.5) * 0.4);
        g.particles.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * (big ? 1.2 : 0.4), vy: (big ? 1.8 : 1.1) + Math.random() * 0.6, vz: (Math.random() - 0.5) * (big ? 1.2 : 0.4),
          color: '#f2f0ea', a: big ? 0.6 : 0.4, s0: 0.35, s1: big ? 2.2 : 1.3, life: big ? 2.6 : 1.9, grav: -0.2, drag: 0.8, drift: 0.6, add: 0, cell: 1, fi: 0.1, fo: 0.4 });
      }
    };
    // under way: mist from the glow under the hull, spray off the bow, the funnel's puffs
    const fx = (dt, v) => {
      const P2 = g.particles;
      if (v > 0.4) {
        mistT += dt * (6 + v * 1.6);
        for (; mistT >= 1; mistT--) {
          const lx = -5.8 + Math.random() * 9, sd = Math.random() < 0.5 ? -1 : 1, p = world(lx, 0.05, sd * 2.1);
          P2.spawn({ x: p.x, y: p.y + 0.1, z: p.z, vx: (Math.random() - 0.5) * 0.4, vy: 0.25 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.4,
            color: '#c4f2ff', a: 0.32, s0: 0.5, s1: 1.6, life: 1.4 + Math.random() * 0.8, grav: -0.05, drag: 1.2, drift: 0.4, add: 0.35, cell: 1, fi: 0.15, fo: 0.35 });
        }
        if (Math.random() < dt * v * 1.2) {
          const p = world(6.1, 0.25, (Math.random() - 0.5) * 0.6);
          P2.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 1.2, vy: 0.9 + Math.random(), vz: (Math.random() - 0.5) * 1.2, color: '#f4fbff', a: 0.55, s0: 0.25, s1: 0.7, life: 0.8, grav: 2.5, drag: 1.2, add: 0.2, cell: 1 });
        }
      }
      puffT -= dt;
      if (puffT <= 0 && v > 0.2) { puffT = 0.35; steam(1); }
    };
    // at the berth: mist rolls off the hull's pier side
    const berthMist = () => {
      for (let k = 0; k < 16; k++) {
        const p = world(-5.5 + k * 0.72, 0.1, 2.25);
        g.particles.spawn({ x: p.x, y: p.y + 0.2, z: p.z, vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.5, vz: 0.6 + Math.random() * 0.5, color: '#d2f6ff', a: 0.42, s0: 0.5, s1: 1.9, life: 1.8 + Math.random(), grav: -0.05, drag: 1.4, drift: 0.5, add: 0.3, cell: 1 });
      }
    };
    // Vesk's way down: deck → the rail's gap → down the gangway → onto the pier → his mark (his height eased along the gangway)
    const startWalk = () => {
      const a = world(RIDE.x, deckY, RIDE.z), b = world(2.0, deckY, 1.3), c = world(2.0, deckY, 2.95), d = { x: c.x + 0.4, z: c.z + 0.6 };
      walk = { i: 1, gang: 2, pts: [{ x: a.x, z: a.z, y: a.y }, { x: b.x, z: b.z, y: b.y }, { x: c.x, z: c.z, y: ground(c.x, c.z) }, { x: d.x, z: d.z, y: ground(d.x, d.z) }, { x: mark.x, z: mark.z, y: ground(mark.x, mark.z) }] };
    };
    const stepWalk = (dt) => {
      const SPD = 1.5, p = vesk.pos;
      let left = SPD * dt;
      while (left > 1e-6 && walk.i < walk.pts.length) {
        const A = walk.pts[walk.i - 1], B = walk.pts[walk.i], dx = B.x - p.x, dz = B.z - p.z, d = Math.hypot(dx, dz);
        if (d > 0.05) { const ang = Math.atan2(dx, dz); vesk.angle += Math.atan2(Math.sin(ang - vesk.angle), Math.cos(ang - vesk.angle)) * Math.min(1, dt * 8); }
        if (d <= left) { p.x = B.x; p.z = B.z; p.y = B.y; left -= d; walk.i++; continue; }
        p.x += (dx / d) * left; p.z += (dz / d) * left; left = 0;
        const seg = Math.hypot(B.x - A.x, B.z - A.z) || 1, k = 1 - Math.hypot(B.x - p.x, B.z - p.z) / seg;
        p.y = walk.i === walk.gang ? A.y + (B.y - A.y) * k : walk.i < walk.gang ? A.y : ground(p.x, p.z);
      }
      vesk.rig.play('walk'); vesk.rig.update(dt, SPD); vesk.sync();
      return walk.i >= walk.pts.length;
    };
    // ---- the shots (a revealcam beat; with beats off — ?nocine, the tests — the same framings drive the scripted
    // camera, which smooths them)
    const beat = revealBeat(g, { in: 0.6 });
    const ov = beat ? null : (g.camRig.override = { pos: V3(0, 0, 0), look: V3(0, 0, 0) });
    const vHead = (k = 1.55) => V3(vesk.pos.x, vesk.pos.y + k, vesk.pos.z);
    const clear = (p, look) => { for (let i = 0; i < 16 && (solidAt(g, p.x, p.y, p.z, 0.3) || (h.pos.distanceTo(p) < 0.9 && p.y < h.pos.y + 2)); i++) { p.lerp(look, 0.1); p.y += 0.05; } return p; };
    const dirM = (() => { const dx = mark.x - gang.x, dz = mark.z - gang.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; })();
    // (the first spot that stands clear, 0.6 m round, and sees every point in `to` — a crate or a shed by the pier
    //  filled half the frame from the first spot tried)
    const pick = (cands, to) => {
      const free = (p) => g.npcs.every((n) => !n.present || n === vesk || Math.hypot(n.pos.x - p.x, n.pos.z - p.z) > 1.4);   // (nobody standing at the lens)
      for (const p of cands) if (!solidAt(g, p.x, p.y, p.z, 0.6) && h.pos.distanceTo(p) > 1.4 && free(p) && to.every((q) => g.physics.lineOfSight(p.x, p.y, p.z, q.x, q.y, q.z))) return p;
      return clear(cands[0], to[0]);
    };
    const gTop = world(2.0, deckY + 1.6, 1.4), gFoot = V3(gang.x, pierY + 1.6, ps.z - 1.0);
    const S = {
      // out to sea from the pier's end: the ship coming in, Vesk a figure at its rail
      sea: () => { const p = clear(V3(pe.x + 0.6, (pe.y ?? pierY) + 2.3, pe.z + 0.9), V3(pe.x - 4, 1, pe.z - 4)); return () => ({ pos: p, look: world(0.5, deckY + 1.2, 0), fov: 42 }); },
      // from the pier's root, low, down the pier: it slides alongside toward us and settles
      side: () => { const p = clear(V3(gang.x + 9.2, pierY + 1.35, ps.z - 1.0), V3(gang.x, deckY, gang.z)); return () => ({ pos: p, look: world(1.8, deckY + 0.9, 0.6), fov: 46 }); },
      // the reveal: low at the gangway's foot, looking up as he comes down it toward us
      reveal: () => { const y = pierY + 0.55, p = pick([V3(gang.x + 2.4, y, ps.z - 1.3), V3(gang.x + 3.2, y, ps.z - 1.2), V3(gang.x - 3.0, y, ps.z + 0.3), V3(gang.x - 2.2, y, ps.z + 1.1)], [gTop, gFoot]); return () => ({ pos: p, look: vHead(1.45), fov: 40 }); },
      // he walks into a medium shot at his mark (the lens stands past it, to the quay's side)
      lead: () => {
        const y = ground(mark.x, mark.z) + 1.55, M = V3(mark.x, y, mark.z), c = (k, s2) => V3(mark.x + dirM.x * k + dirM.z * s2, y, mark.z + dirM.z * k - dirM.x * s2);
        const p = pick([c(3.2, 1.2), c(3.2, -1.2), c(2.6, 1.9), c(2.6, -1.9), c(3.8, 0.6)], [M, V3(gang.x + dirM.x * 3, y, gang.z + dirM.z * 3 + 1.2)]);
        return () => ({ pos: p, look: vHead(1.4), fov: 40 });
      },
      // the speech: Vesk and Twinsen together, eye to eye
      // (the user, 5.11, a photo: "the camera went from Vesk to here" — the two-shot's spot, 5.6 m off to the side, had
      //  a post and the quay's passers-by in front of the lens and Vesk out of the frame. Now over Twinsen's shoulder
      //  at Vesk, the first spot of a few that stands clear and sees his head; the two-shot only if none does)
      speech: () => {
        const memo = {}, vx = vesk.pos.x - h.pos.x, vz = vesk.pos.z - h.pos.z, l = Math.hypot(vx, vz) || 1, ux = vx / l, uz = vz / l;
        const head = vHead(1.4), hy = h.pos.y + 1.6;
        const cands = [[2.6, 1.35], [2.6, -1.35], [2.0, 1.5], [2.0, -1.5], [3.2, 1.2], [3.2, -1.2], [1.6, 2.2], [1.6, -2.2]].map(([b, s]) => V3(h.pos.x - ux * b + uz * s, hy, h.pos.z - uz * b - ux * s));
        // (nobody at the lens, and nobody standing in the line to his head: Doran on the pier hid him from the first try)
        const free = (p) => g.npcs.every((n) => {
          if (!n.present || n === vesk) return true;
          const sx = head.x - p.x, sz = head.z - p.z, L2 = sx * sx + sz * sz || 1, k = Math.max(0, Math.min(1, ((n.pos.x - p.x) * sx + (n.pos.z - p.z) * sz) / L2));
          return Math.hypot(n.pos.x - p.x, n.pos.z - p.z) > 1.0 && (k > 0.92 || Math.hypot(p.x + sx * k - n.pos.x, p.z + sz * k - n.pos.z) > 0.75);
        });
        const p = cands.find((c) => !solidAt(g, c.x, c.y, c.z, 0.35) && free(c) && g.physics.lineOfSight(c.x, c.y, c.z, head.x, head.y, head.z));
        if (p) return () => ({ pos: p, look: V3(head.x, head.y - 0.2, head.z), fov: 40 });
        return ({ t }) => twoShot({ x: h.pos.x, y: h.pos.y + 1.2, z: h.pos.z }, { x: vesk.pos.x, y: vesk.pos.y + 1.35, z: vesk.pos.z }, { memo, ok: (x, y, z) => !solidAt(g, x, y, z, 0.35), height: 1.3, drop: 0.45, fov: 40, dist: 5.6, t });
      },
    };
    let cur = null, fn = null;
    const shot = (k, secs = 0.35) => { if (cur === k) return; cur = k; fn = S[k](); beat?.show(fn, secs); };
    const frame = () => { if (ov && fn) { const f2 = fn({ t: tt }); ov.pos.copy(f2.pos); ov.look.copy(f2.look); } };
    h.angle = Math.atan2(gang.x - h.pos.x, gang.z - h.pos.z);
    // the end state: the ship at its berth, Vesk on his mark, the speech (where a skip comes to as well)
    const done = () => {
      g.cutscene = null;
      grp.position.copy(base); grp.rotation.y = 0; grp.rotation.z = 0;
      vesk.placeAt({ x: mark.x, z: mark.z, a: Math.atan2(h.pos.x - mark.x, h.pos.z - mark.z) });
      vesk.controlled = false;
      this.f.c1_arrived = true;
      this.arriving = false;
      F.setVisible(true);
      this.story.refreshCast();
      g.setState('play');
      h.angle = Math.atan2(mark.x - h.pos.x, mark.z - h.pos.z);
      if (ov) g.camRig.override = null;
      shot('lead', skip ? 0.05 : 0.35);
      this.chain([['narrator', 'c1_arrive_1'], ['vesk', 'c1_vesk_speech'], ['gilbert', 'c1_gil_speech']], () => { beat?.release(1.4); g.updateObjective(); g.save(false); },
        (i) => { if (i === 1) shot('speech', 0.9); else if (i === 2) beat?.release(1.4); });
    };
    shot('sea', 0.6); shipAt(0); ride(); frame();
    if (ov) g.camRig.snap();
    g.audio.play('horn');
    g.cutscene = (dt) => {
      tt += dt;
      const I = g.input;
      if (!said && tt > 0.8 && (I.pressed('interact') || I.pressed('action'))) { skip = true; said = true; done(); return; }
      if (dock == null) {
        const { yaw, v } = shipAt(tt);
        // a lean into the turn, from how fast the heading changes
        const turn = prevYaw == null ? 0 : Math.atan2(Math.sin(yaw - prevYaw), Math.cos(yaw - prevYaw)) / Math.max(dt, 1e-3);
        prevYaw = yaw;
        grp.rotation.z += (Math.max(-0.06, Math.min(0.06, -turn * 0.25)) - grp.rotation.z) * Math.min(1, dt * 3);
        fx(dt, v);
        ride(dt);
        if (cur === 'sea' && L - sAt(tt) < 20) shot('side', 1.2);
        if (tt >= T_SAIL) { dock = 0; g.audio.play('horn'); steam(10, true); berthMist(); g.camRig.shake(0.12); }
      } else {
        // against the fenders: a nudge toward the pier and back, a roll that dies away
        dock += dt;
        const k = dock / SETTLE, e = Math.exp(-dock * 2.6);
        grp.position.x = base.x; grp.position.z = base.z + 0.12 * Math.sin(Math.min(1, k) * Math.PI) * e;
        grp.rotation.y = 0; grp.rotation.z = 0.035 * Math.sin(dock * 5.2) * e;
        if (!walk) { ride(dt); if (dock > 0.6) { startWalk(); shot('reveal', 0.45); } }
        else if (stepWalk(dt)) { if (!said) { said = true; done(); return; } }
        else if (cur === 'reveal' && walk.i >= 4 && Math.hypot(vesk.pos.x - gang.x, vesk.pos.z - gang.z) > 1.6) shot('lead', 0.5);
      }
      frame();
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
      this.watcher = new Watcher(g, guard, R.patrol, { range: 7.5, fov: 0.82, notice: 1.6, cool: 0.35, speed: 1.35, glance: true, onSpot: () => this.zoeSpotted() });   // (the user, 5.11: "too easy": was 6.5 m, 0.7 rad, no glances)
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
    this.chain([['zoe', 'c1_zoe_plan1'], ['zoe', 'c1_zoe_plan2'], ['zoe', 'c1_zoe_plan3']], () => { g.audio.endCue(); g.updateObjective(); g.save(false); g.found('evacplan', 'it_evacplan'); });
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
    if (st) { const x = st.beamPad.x - 6.2, z = st.beamPad.z + 0.4; h.pos.set(x, g.physics.groundAt(x, z), z); h.angle = Math.PI / 2; }
    g.updateObjective();
    g.save(false);
  }

  // Vesk steps into the transit beam and is gone (STAGING-1, the user 4.11: Twinsen was left standing in the pad's light
  // and Zoé vanished). He turns and walks up onto the pad through its arch; the beam rises round him as he reaches the
  // middle and draws him up the light, shrinking into it; Twinsen, if he stood on the pad, steps back off it as the beam
  // comes. Zoé's word and Twinsen's ("Let's go home, Zoé") and she sets off home, seen walking out of the yard — she is
  // at home for Arthur's radio, put there only once nobody sees it (walkOff). Framed from the yard: the two who stay
  // and the light, then the two of them (a revealcam beat; the play camera with beats off).
  veskLeaves() {
    const g = this.game, f = this.f, W = g.world, h = g.hero, vesk = this.npc('vesk');
    g.setState('cutscene');
    const st = W.station, pad = st?.beamPad || { x: vesk.pos.x, z: vesk.pos.z };
    const padY = pad.y ?? g.physics.groundAt(pad.x, pad.z);
    const from = { x: vesk.pos.x, z: vesk.pos.z }, wd = Math.hypot(pad.x - from.x, pad.z - from.z), WALK = 1.25;
    const base = (vesk.baseScale ??= vesk.rig.root.scale.y || 1);
    vesk.controlled = true;
    g.audio.play('rumble');
    const beat = revealBeat(g, { in: 1.0 });
    const ok = (x, y, z) => !solidAt(g, x, y, z, 0.35);
    if (beat) { const memo = {}; beat.show(({ t }) => twoShot({ x: h.pos.x, y: h.pos.y + 1.2, z: h.pos.z }, { x: pad.x, y: padY + 1.5, z: pad.z }, { memo, ok, height: 1.45, drop: 0.15, fov: 46, dist: 7.6, t })); }
    const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k);
    let tt = 0, beamAt = null, gone = false;
    g.cutscene = (dt) => {
      tt += dt;
      // Twinsen: off the pad if he stood on it (turned away from the light, a few steps), then facing it
      const hr = Math.hypot(h.pos.x - pad.x, h.pos.z - pad.z), out = Math.atan2(h.pos.x - pad.x, h.pos.z - pad.z);
      if (hr < 3.4 && tt < 4) {
        h.angle = turn(h.angle, out, dt * 8);
        g.physics.move(h, Math.sin(h.angle) * 1.7 * dt, Math.cos(h.angle) * 1.7 * dt); g.physics.fall?.(h, dt);
        h.rig.play('walk'); h.rig.update(dt, 1.7);
      } else { h.angle = turn(h.angle, out + Math.PI, dt * 5); h.rig.play('idle'); h.rig.update(dt, 0); }
      h.sync();
      if (gone) return;
      // Vesk: across to the middle of the pad (his height follows the pad's steps), the beam rising as he nears it
      const k = Math.min(1, (tt * WALK) / Math.max(0.01, wd));
      if (beamAt == null) {
        vesk.pos.x = from.x + (pad.x - from.x) * k; vesk.pos.z = from.z + (pad.z - from.z) * k;
        vesk.pos.y = g.physics.groundAt(vesk.pos.x, vesk.pos.z);
        vesk.angle = turn(vesk.angle, Math.atan2(pad.x - from.x, pad.z - from.z), dt * 6);
        vesk.rig.play(k < 1 ? 'walk' : 'idle'); vesk.rig.update(dt, k < 1 ? WALK : 0); vesk.sync();
        if (wd * (1 - k) < 1.4 && !st?.beam) { st?.setBeam?.(true); g.audio.play('shard'); }
        if (k >= 1) { beamAt = tt; vesk.angle = turn(vesk.angle, out, 1); }
        return;
      }
      // drawn up the light: eased up 2 m, shrinking into it over its last second, sparks of the beam's colour
      const u = (tt - beamAt) / 1.6, uu = Math.min(1, u), e = uu * uu * (3 - 2 * uu);
      vesk.pos.y = padY + 2.0 * e;
      vesk.rig.root.scale.setScalar(base * Math.max(0.02, 1 - Math.max(0, (u - 0.35) / 0.65)));
      vesk.rig.play('idle'); vesk.rig.update(dt, 0); vesk.sync();
      if (Math.random() < 0.5) g.particles.burst(vesk.pos.x, vesk.pos.y + 1, vesk.pos.z, '#9ff4ff', 2, 2);
      if (u < 1) return;
      gone = true;
      vesk.rig.root.scale.setScalar(base);
      vesk.controlled = false;
      f.c1_veskGone = true;
      // (Zoé stays where she is for her word with him, then walks home: held, not sent home by the refresh)
      const zoe0 = this.npc('zoe');
      if (zoe0?.present) this.walkOff('zoe', [], 0, true);
      this.story.refreshCast();
      st?.setBeam?.(false);
      g.cutscene = null;
      g.setState('play');
      const zoe = this.npc('zoe');
      if (beat && zoe?.present) { const memo = {}; beat.show(({ t }) => twoShot({ x: h.pos.x, y: h.pos.y + 1.2, z: h.pos.z }, { x: zoe.pos.x, y: zoe.pos.y + 1.1, z: zoe.pos.z }, { memo, ok, fov: 40, t }), 1.2); }
      this.chain([['zoe', 'c1_after_zoe'], ['hero', 'c1_after_tw']], () => {
        beat?.release(1.4);
        // she sets off home: out through the yard and the gate, down the road
        const G = W.gate;
        const home = W.houses?.[0]?.door;
        const far = home ? (() => { const dx = home.x - (G.x - 9), dz = home.z - G.z, l = Math.hypot(dx, dz) || 1, k = Math.min(l, 30) / l; return { x: G.x - 9 + dx * k, z: G.z + dz * k }; })() : null;
        if (G) this.walkOff('zoe', [{ x: G.x + 3.2, z: G.z }, { x: G.x - 1.2, z: G.z }, { x: G.x - 9, z: G.z + 0.5 }, ...(far ? [far] : [])], 1.25);
        g.updateObjective(); g.save(false);
      });
    };
  }

  // STAGING-1 (the user, 4.11: "Doran teleports", "Zoé disappears"): someone the story sends elsewhere walks off along
  // `pts` and is put in their next place (place()) only once that jump can't be seen — out of the camera's view or far
  // from it, and the place they go to as well. While walking they keep walking through any refresh of the cast.
  // (hold: kept where they stand, turning to whoever speaks, until a walkOff with points sends them)
  walkOff(id, pts, speed = 1.1, hold = false) {
    const n = this.npc(id);
    if (!n?.present) { delete this.walkers?.[id]; this.story.refreshCast(); return; }
    if (hold) { (this.walkers ??= {})[id] = { n, pts: [], i: 0, t: 0, speed: 0, stuck: 0, hold: true }; return; }
    n.talking = false; n.listenTo = null; n.forceAnim = null; n.controlled = true;
    (this.walkers ??= {})[id] = { n, pts, i: 0, t: 0, speed, stuck: 0 };
  }
  tickWalkers(dt) {
    const g = this.game;
    if (!this.walkers) return;
    for (const id of Object.keys(this.walkers)) {
      const w = this.walkers[id], n = w.n;
      if (!n.present) { n.controlled = false; delete this.walkers[id]; continue; }
      if (w.hold) continue;
      w.t += dt;
      const p = w.pts[w.i];
      if (p && g.state === 'play') {
        const dx = p.x - n.pos.x, dz = p.z - n.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.45) w.i++;
        else {
          const want = Math.atan2(dx, dz);
          n.angle += Math.atan2(Math.sin(want - n.angle), Math.cos(want - n.angle)) * Math.min(1, dt * 6);
          const x0 = n.pos.x, z0 = n.pos.z;
          g.physics.move(n, Math.sin(n.angle) * w.speed * dt, Math.cos(n.angle) * w.speed * dt);
          g.physics.fall?.(n, dt);
          w.stuck = Math.hypot(n.pos.x - x0, n.pos.z - z0) < w.speed * dt * 0.3 ? w.stuck + dt : 0;
          if (w.stuck > 1.5) { w.stuck = 0; w.i++; }   // (blocked: on toward the next point)
          n.rig.play('walk'); n.rig.update(dt, w.speed); n.sync();
        }
      } else { n.rig.play('idle'); n.rig.update(dt, 0); n.sync(); }
      if (w.i < w.pts.length && w.t < 30) continue;
      // there (or long enough): to the next place as soon as neither here nor there is on screen
      delete this.walkers[id];
      const to = this.place(id);
      if (!this.unseen(n.pos) || (to && Number.isFinite(to.x) && !this.unseen({ x: to.x, y: g.physics.groundAt(to.x, to.z), z: to.z }))) { this.walkers[id] = w; continue; }
      n.controlled = false;
      this.story.refreshCast();
    }
  }
  unseen(p) {
    const g = this.game;
    if (g.room) return true;   // (he is in a room: the street is not on screen)
    const cam = g.camRig.cam;
    cam.updateMatrixWorld();
    if (cam.position.distanceTo(p) > 70) return true;
    const v = new THREE.Vector3(p.x, (p.y ?? 0) + 1, p.z).project(cam);
    return !(Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.2 && v.z < 1);
  }

  // Doran flies Twinsen to Zeelich in the project's ship, from Citadel Spaceport
  // (TRAVEL-1: the project's ship takes off with them — the take-off, the cabin, space: src/game/travelfilm.js — then
  //  the chapter changes under the black as before)
  toZeelich() {
    const g = this.game, f = this.f;
    const doran = this.npc('doran');
    crossByShip(g, (then) => g.startTransition(() => {
      if (this.story.chapters.length > 2) { this.story.nextChapter(); return; }
      // chapter 2 isn't in this build yet: close the chapter properly
      f.c1_done = true;
      g.save(false);
      g.setState('ending');
      g.hud.show(false);
      g.showScreen('ending');
      g.audio.setMood('ending');
    }, this.story.nextAreas(), then), { aboard: [doran], onward: { to: 'zeelich_port', mode: 'ship', landWith: [doran] } });   // (LAZY-REGIONS: Zeelich built behind the black, under its card; WC-1: the ship seen coming down on Zeelich Spaceport's pad, where chapter 3 starts)
  }
  afterEnding() { this.game.updateObjective(); }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, W = g.world;
    if (!f.c1_started) return;
    this.tickWalkers(dt);
    this.tickStandDown(dt);
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
    if (!f.c1_water && (W.valves || []).length && W.valves.every((v) => v.open)) { f.c1_water = true; W.well?.setWater?.(true); }
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
    // (POLISH-A: someone in a room — Vesk in the station's control room once the water is back — is starred at that room's
    //  street door: the room's far-off coordinates fell off the map, and "Visit Vesk at the old fortress" had no star)
    const npcAt = (id, label) => {
      const n = this.npc(id); if (!n?.present) return;
      let x = n.pos.x, z = n.pos.z;
      const sc = g.regions?.sceneOf?.(x, z);
      if (sc && sc !== 'citadel') { const d = this.story.doors().find((q) => q.room === sc && !q.region); if (!d) return; x = d.x; z = d.z; }
      m.push({ x, z, kind: 'star', color: gold, r: 7, edge: true, label: label && t(label) });
    };
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
