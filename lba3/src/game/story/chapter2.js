// Chapter 2 — "Zeelich".
//
// Doran flies Twinsen to Zeelich in the project's ship (Twinsun and Zeelich are two planets: the crossing is by
// spaceship, PLANET-1); they set down on Zeelich Spaceport, the deck off the terminal island's south shore, and a
// project guard meets the ship there. On the Esmer street he finds
// Baldino's workshop. Baldino explains the shell around the planet and Vesk's drill: stopping the drill
// halfway would crack the shell, it has to be turned around from below. To get past the drill platform's
// shield they need his override key — still missing a cog from the top of the old mill (a climb) and the
// code cylinder in the project depot's locker (past two patrol drones) — and the shield's power cut by
// braking the three wind-mills with the magic ball. When Baldino assembles the key, the story cuts to Zoe
// at the Citadel lighthouse (playable): she tunes the old transmitter (sun, wave, star) and warns the
// whole island. Back on Zeelich the key opens the shield; Vesk refuses to listen and goes down the drill
// shaft. Twinsen follows him — chapter 3.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import '../text/ch2.js';
import { revealBeat, twoShot, solidAt } from './revealcam.js';

const DIAL = ['sun', 'wave', 'star'];
// Zeelich's street folk and where they stand
const ZFOLK = [['zbee1', 'bee1'], ['zbee2', 'bee2'], ['zmole1', 'mole1'], ['zmole2', 'mole2'], ['ztri1', 'tri1'], ['ztri2', 'tri2']];
const SOLUTION = [0, 1, 2];

export class Chapter2 extends ChapterBase {
  get Z() { return this.game.rooms.zeelich; }
  // where the project's ship sets him down: Zeelich Spaceport's deck (travel.js), the dock in a build without it
  arrival() { const Z = this.Z; return Z.spaceport?.landing || Z.dock; }
  inZ() { return this.game.room?.id === 'zeelich'; }
  millsBraked() { return (this.Z?.mills || []).filter((m) => this.f['c2_mill_' + m.id]).length; }

  // ---------------------------------------------------------------- cast
  npcDefs() {
    const S = this.Z?.npcSpots || {};
    const at = (k) => S[k] || { x: 0, z: 0, a: 0, pending: true }, pend = (k) => (S[k] ? {} : { pending: true });
    return [
      { id: 'baldino', name: 'n_baldino', char: 'baldino', color: '#ffd890', x: at('baldinoOut').x, z: at('baldinoOut').z, angle: at('baldinoOut').a, ...pend('baldinoOut') },
      { id: 'nara', name: 'n_nara', char: 'nara', color: '#ffc0a0', x: at('esmer1').x, z: at('esmer1').z, angle: at('esmer1').a, ...pend('esmer1') },
      { id: 'oku', name: 'n_oku', char: 'oku', color: '#bfe8d8', x: at('esmer2').x, z: at('esmer2').z, angle: at('esmer2').a, ...pend('esmer2') },
      // street life: Mosquibees, moles and the triangle-headed townsfolk (they only chat: baseTalk's idle_<id> lines)
      ...ZFOLK.map(([id, spot]) => ({ id, name: 'n_' + id, char: id, color: '#e8e0c0', x: at(spot).x, z: at(spot).z, angle: at(spot).a, ...pend(spot) })),
    ];
  }

  enemyDefs() {
    const D = this.Z?.depot;
    if (!D) return [];
    const when = (f) => this.reached(f) && !f.c2_shield;
    const n = D.patrol.length, h = Math.floor(n / 2);
    return [
      { id: 'zdrone1', kind: 'drone', group: 'zdepot', x: D.patrol[0][0], z: D.patrol[0][1], patrol: D.patrol, wp: 1, when },
      { id: 'zdrone2', kind: 'drone', group: 'zdepot', x: D.patrol[h][0], z: D.patrol[h][1], patrol: D.patrol, wp: (h + 1) % n, when },
      { id: 'zguard1', kind: 'guardG', group: 'zdepot', x: D.patrol[n - 1][0], z: D.patrol[n - 1][1], patrol: [...D.patrol].reverse(), wp: 1, when },
      { id: 'zgdog1', kind: 'gdog', coat: 'brown', group: 'zdepot', x: D.patrol[h][0], z: D.patrol[h][1], patrol: [...D.patrol].reverse(), wp: (n - h) % n, when },
    ];
  }

  // where everyone is during chapter 2 (null: not here, undefined: another chapter decides)
  place(id) {
    const f = this.f, R = this.game.rooms;
    const folk = ZFOLK.find((z) => z[0] === id);
    if (!this.reached()) return ['baldino', 'nara', 'oku'].includes(id) || folk ? null : undefined;
    if (!folk && !['baldino', 'nara', 'oku', 'doran', 'vesk', 'guard', 'zoe', 'worker'].includes(id)) return undefined;
    // (LAZY-REGIONS: Zoé and the worker are placed without Zeelich; the rest stand on it)
    if (id === 'zoe') return f.c2_zoeStart && !f.c2_broadcast ? null : undefined;
    if (id === 'worker') return null;
    const Z = this.Z;
    if (folk) return this.story.zlife?.spot(id) || this.Z.npcSpots[folk[1]];   // (Tavo at Snuff's counter once her oven is hot: zeelife.js)
    const S = Z.npcSpots;
    const plat = Z.platform;
    switch (id) {
      case 'baldino':
        if (f.c2_shield) return { x: plat.gate.x - 1.6, z: plat.gate.z + 1.4, a: Math.PI / 2 };
        return R.workshop?.npcSpots?.baldino ?? S.baldinoOut;
      case 'nara': return S.esmer1;
      case 'oku': return S.esmer2;
      case 'doran': { const L = this.arrival(); return { x: L.x - 1.8, z: L.z + 0.8, a: Math.PI / 2 }; }   // (by the ship he flew)
      case 'vesk': return f.c2_veskDown ? null : S.vesk;
      case 'guard':
        if (f.c2_started && !f.c2_planTaken) { const L = this.arrival(); return { x: L.x + 0.6, z: L.z - 1.8, a: 0 }; } // (meets the ship)
        return f.c2_shield ? { x: plat.gate.x + 0.5, z: plat.gate.z + 3.2, a: -Math.PI / 2 } : S.guard;
      case 'zoe': return f.c2_zoeStart && !f.c2_broadcast ? null : undefined;
      case 'worker': return null;
    }
    return undefined;
  }

  // ---------------------------------------------------------------- arrival
  begin() {
    const g = this.game, Z = this.Z;
    g.enterRoom('zeelich', this.arrival(), true);
    g.hero.hasBall = true;
    Z.ferry?.setVisible?.(false);   // (the sky-ferry at the dock is not how he came: no ferry crosses to Twinsun)
    this.story.refreshCast();
    this.chain([['narrator', 'c2_arrive'], ['doran', 'c2_doran_1'], ['hero', 'c2_tw_arrive']], () => {
      this.f.c2_started = true;
      this.story.refreshCast();
      this.confiscate();
    });
  }
  // the setback: the project's guard meets the ship and takes the evacuation plan (it ends up in the depot)
  confiscate() {
    const g = this.game, f = this.f;
    if (f.c2_planTaken || !f.c1_plan) { g.updateObjective(); g.save(false); return; }
    this.chain([['guard', 'c2_guard_dock1'], ['hero', 'c2_tw_dock1'], ['guard', 'c2_guard_dock2']], () => {
      f.c2_planTaken = true;
      g.audio.play('deny');
      this.story.refreshCast();
      this.chain([['hero', 'c2_tw_dock2']], () => { g.updateObjective(); g.save(false); });
    });
  }

  doors() {
    const Z = this.game.regions.built('zeelich'), out = [];   // (a door on Zeelich: none to find before Zeelich is built)
    if (this.reached() && Z && this.game.regions.has('workshop')) out.push({ region: 'zeelich', x: Z.workshopDoor.x, z: Z.workshopDoor.z, r: 0.9, room: 'workshop' });
    return out;
  }
  exitTo(to) {
    if (to === 'zeelich-workshop') {
      const Z = this.Z;   // (LAZY-REGIONS: read only for this exit)
      // step out of the door toward the street
      const d = Z.workshopDoor, s = Z.street, a = Math.atan2(s.x - d.x, s.z - d.z), l = Math.hypot(s.x - d.x, s.z - d.z) || 1;
      return { room: 'zeelich', x: d.x + ((s.x - d.x) / l) * 1.7, z: d.z + ((s.z - d.z) / l) * 1.7, a };
    }
    if (to === 'outdoor-lighthouse') return { room: 'workshop' }; // Zoe's segment ends by itself; never wander out
    return null;
  }
  canExit(room) {
    if (room.id === 'lighttop' && !this.f.c2_broadcast) { this.chain([['zoe', 'c2_zoe_notyet']]); return false; }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, Z = g.regions?.built('zeelich'), h = g.hero;   // (LAZY-REGIONS: read each frame: never builds)
    if (!this.reached()) return;
    if (this.inZ()) {
      const mt = Z.millTop;
      if (f.c2_plan && !f.c2_cog && Math.abs(h.pos.y - mt.y) < 1.3) consider(dist(mt.x, mt.z), 1.6, { kind: 'c2cog', label: 'p_climb' });
      if (f.c2_plan && !f.c2_cyl) consider(dist(Z.depot.locker.x, Z.depot.locker.z), 1.6, { kind: 'c2locker', label: 'p_search' });
      if (f.c2_plan && !f.c2_shield) consider(dist(Z.platform.console.x, Z.platform.console.z), 1.7, { kind: 'c2console', label: 'p_console' });
      if (f.c2_veskDown) consider(dist(Z.platform.pad.x, Z.platform.pad.z), 2.0, { kind: 'c2shaft', label: 'p_shaft' });
    } else if (g.room?.id === 'workshop') {
      for (const s of g.room.searches || []) {
        if (s.id === 'bench' && f.c2_cog && f.c2_cyl && !f.c2_key) consider(dist(s.x, s.z), s.r, { kind: 'c2bench', label: 'p_bench' });
      }
    } else if (g.room?.id === 'lighttop' && f.c2_zoeStart && !f.c2_broadcast) {
      for (const s of g.room.searches || []) {
        const m = /^dial(\d)$/.exec(s.id);
        if (m) consider(dist(s.x, s.z), s.r, { kind: 'c2dial', i: +m[1] - 1, label: 'p_dial' });
        if (s.id === 'mic') consider(dist(s.x, s.z), s.r, { kind: 'c2mic', label: 'p_mic' });
      }
    }
  }

  interact(it) {
    const g = this.game, f = this.f, h = g.hero, Z = g.regions?.built('zeelich');   // (LAZY-REGIONS: its things exist only once built)
    switch (it.kind) {
      case 'c2cog':
        if (f.c2_planTaken && !f.c2_okuOK) { this.chain([['hero', 'c2_cog_ask']]); return true; }
        h.act('pickup', 0.9, () => {
          f.c2_cog = true; g.audio.play('shard');
          this.chain([['hero', 'c2_got_cog']], () => { g.hud.toast('c2_toast_cog'); g.updateObjective(); g.save(false); });
        }, 0.45);
        return true;
      case 'c2locker':
        h.act('use', 1.0, () => {
          f.c2_cyl = true; g.audio.play('chest');
          const back = f.c2_planTaken && !f.c2_planBack;
          if (back) f.c2_planBack = true;
          this.chain([['hero', 'c2_got_cyl'], ...(back ? [['hero', 'c2_got_plan']] : [])], () => {
            g.hud.toast('c2_toast_cyl');
            g.updateObjective(); g.save(false);
          });
        }, 0.5);
        return true;
      case 'c2console':
        if (!f.c2_key) { this.chain([['hero', 'c2_console_nokey']]); return true; }
        if (this.millsBraked() < 3) { g.audio.play('deny'); this.chain([['hero', 'c2_console_nobrakes']]); return true; }
        h.act('use', 1.2, () => this.shieldDown(), 0.6);
        return true;
      case 'c2shaft': this.toShell(); return true;
      case 'c2bench': this.buildKey(); return true;
      case 'c2dial': {
        const d = (this.dials ||= [1, 2, 0]);
        d[it.i] = (d[it.i] + 1) % 3;
        g.room.dials?.[it.i]?.set?.(d[it.i]);
        g.audio.play('select');
        this.chain([['zoe', 'c2_dial_' + DIAL[d[it.i]]]]);
        return true;
      }
      case 'c2mic': {
        const d = this.dials || [1, 2, 0];
        if (d.every((v, i) => v === SOLUTION[i])) this.broadcast();
        else { g.audio.play('deny'); this.chain([['zoe', 'c2_mic_wrong'], ['radio', 'c2_radio_wrong']]); }
        return true;
      }
    }
    return false;
  }

  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id;
    if (!this.reached()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'doran': return c([['doran', 'c2_doran_idle']]);
      case 'nara':
        if (f.c2_planBack && !f.c2_naraSaw) return c([['hero', 'c2_tw_show_nara'], ['nara', 'c2_nara_plan']], () => { f.c2_naraSaw = true; g.save(false); });
        if (f.c2_shield) return c([['nara', 'c2_nara_after']]);
        if (!f.c2_metNara) return c([['nara', 'c2_nara_1'], ['nara', 'c2_nara_2'], ['nara', 'c2_nara_3']], () => { f.c2_metNara = true; });
        return c([['nara', f.c2_plan ? 'c2_nara_2' : 'c2_nara_3']]);
      case 'oku':
        if (f.c2_planBack && !f.c2_okuOK) return c([['hero', 'c2_tw_show_oku'], ['oku', 'c2_oku_plan']], () => { f.c2_okuOK = true; g.updateObjective(); g.save(false); });
        if (f.c2_plan && f.c2_planTaken && !f.c2_okuOK && !f.c2_cog) return c([['oku', 'c2_oku_1'], ['oku', 'c2_oku_ask']]);
        if (this.millsBraked() >= 3) return c([['oku', 'c2_oku_after']]);
        if (f.c2_plan && !f.c2_cog) return c([['oku', 'c2_oku_mill']]);
        return c([['oku', 'c2_oku_1'], ['oku', 'c2_oku_2']]);
      case 'baldino':
        if (!f.c2_plan) {
          return c([['baldino', 'c2_bal_1'], ['hero', 'c2_tw_bal1'], ['baldino', 'c2_bal_2'], ['baldino', 'c2_bal_3'], ['hero', 'c2_tw_bal2'], ['baldino', 'c2_bal_4'], ['baldino', 'c2_bal_5'], ['baldino', 'c2_bal_6'], ['baldino', 'c2_bal_7']], () => {
            f.c2_plan = true; g.updateObjective(); g.save(false);
          });
        }
        if (f.c2_cog && f.c2_cyl && !f.c2_key) { this.buildKey(); return true; }
        if (f.c2_key && !f.c2_broadcast) { this.startZoe(); return true; }
        return c([['baldino', f.c2_key ? 'c2_bal_after' : 'c2_bal_wait']]);
      case 'guard': return c([['guard', f.c2_shield ? 'c2_guard_after' : 'c2_guard_block']]);
      case 'vesk':
        if (f.c2_shield && !f.c2_veskDown) {
          const lines = [['vesk', 'c2_vesk_1'], ['hero', 'c2_tw_vesk1'], ['vesk', 'c2_vesk_2']];
          if (this.npc('baldino')?.present) lines.push(['baldino', 'c2_bal_vesk']);
          lines.push(['vesk', 'c2_vesk_3'], ['hero', 'c2_tw_vesk2'], ['vesk', 'c2_vesk_4']);
          const beat = this.veskBeat();   // (REVEAL-CAMS: a close two-shot while he speaks, then the low view of the descent; null with ?nocine and in the tests)
          return c(lines, () => this.veskDescends(beat));
        }
        return false;
    }
    return false;
  }

  // ---------------------------------------------------------------- mills (magic ball on the brake)
  ballHit(p) {
    const f = this.f;
    if (!this.inZ() || !f.c2_plan) return false;
    for (const m of this.Z.mills) {
      if (f['c2_mill_' + m.id]) continue;
      if (Math.hypot(p.x - m.brake.x, p.y - m.brake.y, p.z - m.brake.z) < 0.9) { this.brakeMill(m); return true; }
    }
    return false;
  }
  ballTargets() {
    const f = this.f;
    if (!this.inZ() || !f.c2_plan) return [];
    return this.Z.mills.filter((m) => !f['c2_mill_' + m.id]).map((m) => ({ x: m.brake.x, y: m.brake.y, z: m.brake.z }));
  }
  brakeMill(m, silent = false) {
    const g = this.game, f = this.f;
    f['c2_mill_' + m.id] = true;
    m.setSpinning(false);
    if (silent) return;
    g.audio.play('chest');
    g.particles.burst(m.brake.x, m.brake.y, m.brake.z, '#ffe8a0', 16, 3);
    g.hud.toast('c2_toast_mill', { n: this.millsBraked() });
    this.chain([['hero', 'c2_mill_brake']], () => { g.updateObjective(); g.save(false); });
  }

  // ---------------------------------------------------------------- the key
  buildKey() {
    const g = this.game, f = this.f;
    g.audio.play('mode');
    this.chain([['baldino', 'c2_bal_build']], () => {
      f.c2_key = true;
      g.audio.play('shard');
      g.camRig.shake(0.2);
      const p = g.hero.pos;
      g.particles.burst(p.x, p.y + 1.2, p.z, '#ffe8a0', 24, 3);
      g.hud.toast('c2_toast_key');
      this.chain([['baldino', 'c2_bal_built']], () => { g.save(false); this.startZoe(); });
    });
  }

  // ---------------------------------------------------------------- Zoe at the lighthouse (Citadel)
  startZoe() {
    const g = this.game, f = this.f, h = g.hero;
    if (!g.regions.has('lighttop')) { f.c2_zoeStart = true; f.c2_broadcast = true; g.updateObjective(); return; } // room not in this build
    f.c2_zoeStart = true;
    this.saved = { behaviour: h.behaviour, hasBall: h.hasBall };
    this.story.refreshCast();
    this.dials = [1, 2, 0];
    g.rooms.lighttop.dials?.forEach((d, i) => d.set?.(this.dials[i]));
    g.rooms.lighttop.transmitter?.setOn?.(false);
    g.startTransition(() => {
      h.swapBody('zoe');
      h.hasBall = false; h.noBehaviours = true; h.behaviour = 'normal';
      g.hud.behaviour('normal');
      g.enterRoom('lighttop', null, true);
      g.updateObjective();
    });
  }
  broadcast() {
    const g = this.game, f = this.f;
    g.room?.transmitter?.setOn?.(true);
    g.audio.play('horn');
    this.chain([['zoe', 'c2_zoe_broadcast'], ['zoe', 'c2_zoe_after']], () => this.endZoe());
  }
  endZoe() {
    const g = this.game, f = this.f, h = g.hero;
    f.c2_broadcast = true;
    g.startTransition(() => {
      h.swapBody('twinsen');
      h.hasBall = true; h.noBehaviours = false;
      h.behaviour = this.saved?.behaviour || 'normal';
      g.hud.behaviour(h.behaviour);
      this.story.refreshCast();
      if (g.regions.has('workshop')) g.enterRoom('workshop', null, true); else g.enterRoom('zeelich', this.Z.workshopDoor, true);
      g.updateObjective();
      g.save(false);
    });
  }

  // ---------------------------------------------------------------- platform
  shieldDown(silent = false) {
    const g = this.game, f = this.f;
    f.c2_shield = true;
    this.Z.platform.shield.setOn(false);
    this.story.refreshCast();
    if (silent) return;
    g.audio.play('rumble');
    g.camRig.shake(0.4);
    this.chain([['hero', 'c2_shield_down']], () => { g.updateObjective(); g.save(false); });
  }
  // REVEAL-CAMS: Vesk's last words in a medium two-shot with Twinsen, then (veskDescends) the low view of him on the lift
  veskBeat() {
    const g = this.game, h = g.hero, vesk = this.npc('vesk');
    const beat = revealBeat(g);
    if (!beat || !vesk) return null;
    const ok = (x, y, z) => !solidAt(g, x, y, z, 0.45);
    const memo = {};
    beat.show(({ t }) => twoShot({ x: h.pos.x, y: h.pos.y + 1.2, z: h.pos.z }, { x: vesk.pos.x, y: vesk.pos.y + 1.3, z: vesk.pos.z }, { ok, memo, prefer: { x: -1, z: -1 }, height: 1.25, drop: 0.5, fov: 40, dist: 5.4, t }), 2.2);
    return beat;
  }
  // the camera for the descent: down at the lift's lip, a few metres ahead of him and to one side as he walks onto
  // the pad, looking up at him and following him down as the pad sinks
  veskDescentFrame(pad, vesk) {
    const g = this.game, ok = (x, y, z) => !solidAt(g, x, y, z, 0.45);
    const y0 = pad.y ?? g.physics.groundAt(pad.x, pad.z), base = Math.atan2(pad.x - vesk.pos.x, pad.z - vesk.pos.z);
    let at = null;
    for (const r of [4.4, 3.8, 3.2]) for (const da of [0.55, -0.55, 0.9, -0.9, 0.2, -0.2, 1.3, -1.3]) {
      if (at) break;
      const a = base + da, x = pad.x + Math.sin(a) * r, z = pad.z + Math.cos(a) * r;
      let good = true;
      for (let k = 0.2; k <= 1.0001; k += 0.2) if (!ok(pad.x + (x - pad.x) * k, y0 + 0.4, pad.z + (z - pad.z) * k)) { good = false; break; }
      if (good) at = { x, z };
    }
    at ??= { x: pad.x - Math.sin(base) * 3.2, z: pad.z - Math.cos(base) * 3.2 };
    const pos = new THREE.Vector3(at.x, y0 + 0.4, at.z), look = new THREE.Vector3();
    return () => {
      // (as the pad sinks the aim follows him down only to the deck: then it rests on the open shaft, not the floor)
      look.set(vesk.pos.x * 0.7 + pad.x * 0.3, Math.max(y0 + 0.35, vesk.pos.y + 1.25), vesk.pos.z * 0.7 + pad.z * 0.3);
      return { pos, look, fov: 44 };
    };
  }
  veskDescends(beat = null) {
    const g = this.game, f = this.f, Z = this.Z, vesk = this.npc('vesk'), pad = Z.platform.pad;
    g.setState('cutscene');
    g.audio.cue('revelation');
    beat ??= this.veskBeat();
    beat?.show(this.veskDescentFrame({ x: pad.x, z: pad.z, y: Z.platform.y }, vesk), 2.4);
    let tt = 0, lowering = false;
    g.cutscene = (dt) => {
      tt += dt;
      const d = Math.hypot(pad.x - vesk.pos.x, pad.z - vesk.pos.z);
      if (!lowering && d > 0.3 && tt < 6) {
        vesk.angle = Math.atan2(pad.x - vesk.pos.x, pad.z - vesk.pos.z);
        g.physics.move(vesk, Math.sin(vesk.angle) * 1.4 * dt, Math.cos(vesk.angle) * 1.4 * dt);
        vesk.controlled = true; vesk.rig.play('walk'); vesk.rig.update(dt, 1.4); vesk.sync();
      } else if (!lowering) {
        lowering = true;
        vesk.placeAt({ x: pad.x, z: pad.z, a: vesk.angle });
        vesk.controlled = true;
        g.audio.play('rumble');
        Z.platform.lift.lower(() => {
          g.cutscene = null;
          vesk.controlled = false;
          f.c2_veskDown = true;
          beat?.release(2.6);   // (a long hand-back: the low view and the isometric one are far apart)
          this.story.refreshCast();
          g.setState('play');
          const lines = [['hero', 'c2_after_tw']];
          if (this.npc('baldino')?.present) lines.push(['baldino', 'c2_after_bal']);
          this.chain(lines, () => { g.updateObjective(); g.save(false); });
        }, [vesk]);
      }
      if (lowering) { vesk.rig.play('idle'); vesk.rig.update(dt, 0); }
    };
  }
  // the shaft: Vesk has sealed it from below. Baldino sends Twinsen south to learn what the shell is
  // (chapter 4, Desert Island): Doran flies him home to Citadel Spaceport and takes the ferry south from there. A save from the old end-of-demo screen gets here again from the lift.
  toShell() {
    const g = this.game, f = this.f;
    if (f.c2_done) { g.startTransition(() => this.story.nextChapter(), this.story.nextAreas()); return; }
    g.audio.play('door'); g.camRig.shake(0.35);
    const lines = [['narrator', 'c2_sealed_1'], ['hero', 'c2_tw_sealed0']];
    if (this.npc('baldino')?.present) lines.push(['baldino', 'c2_bal_sealed1'], ['hero', 'c2_tw_sealed'], ['baldino', 'c2_bal_sealed2']);
    else lines.push(['radio', 'c2_bal_sealed1'], ['hero', 'c2_tw_sealed'], ['radio', 'c2_bal_sealed2']);
    lines.push(['doran', 'c2_doran_sealed']);
    this.chain(lines, () => {
      f.c2_done = true;
      g.save(false);
      g.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
    });
  }


  // ---------------------------------------------------------------- per frame / rooms / saves
  update() {
    const g = this.game, f = this.f;
    if (!this.reached()) return;
    // a save made during Zoe's segment resumes before it (in the workshop, as Twinsen)
    if (g.room?.id === 'lighttop' && !f.c2_zoeStart && g.state === 'play' && !g.trans) g.enterRoom(g.regions.has('workshop') ? 'workshop' : 'zeelich', null, true);
  }
  onEnterRoom(id) {
    const f = this.f;
    if (id === 'lighttop' && f.c2_zoeStart && !f.c2_broadcast) this.chain([['zoe', 'c2_zoe_in'], ['radio', 'c2_radio_freq']]);
  }
  applyFlags() {
    const f = this.f, RG = this.game.regions;
    // (LAZY-REGIONS: the flags are set now; what they change in an area goes on it when it is built — at once if it
    //  is: regions.whenBuilt. A load builds the save's area and its chapter's first.)
    RG.whenBuilt('zeelich', (Z) => Z.ferry?.setVisible?.(false));   // (the dock's sky-ferry stays away: Twinsun and Zeelich are joined by spaceship only)
    if (!this.reached()) return;
    RG.whenBuilt('zeelich', (Z) => {
      for (const m of Z.mills) if (f['c2_mill_' + m.id]) this.brakeMill(m, true);
      if (f.c2_shield) this.shieldDown(true);   // (keeps the flag set; the shield goes down)
    });
    if (f.c2_zoeStart && !f.c2_broadcast) f.c2_zoeStart = false;
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f;
    if (!f.c2_started) return '';
    const n = this.millsBraked();
    if (f.c2_veskDown) return this.goal('c2_obj_shaft');
    if (f.c2_shield) return this.goal('c2_obj_vesk');
    if (f.c2_zoeStart && !f.c2_broadcast) return this.goal('c2_obj_zoe');
    if (f.c2_key) return n < 3 ? this.goal('c2_obj_mills', { n }) : this.goal('c2_obj_gate');
    if (f.c2_cog && f.c2_cyl) return this.goal('c2_obj_build') + this.sub(n >= 3, 'c2_sub_mills', { n });
    if (f.c2_plan) return this.goal('c2_obj_parts') + this.sub(f.c2_cog, 'c2_sub_cog') + this.sub(f.c2_cyl, 'c2_sub_cyl') + this.sub(n >= 3, 'c2_sub_mills', { n });
    return this.goal('c2_obj_find');
  }
  markers() { return []; }
  items() {
    const f = this.f, out = [];
    if (f.c2_cog && !f.c2_key) out.push({ id: 'cog', icon: 'part' });
    if (f.c2_cyl && !f.c2_key) out.push({ id: 'cyl', icon: 'part' });
    if (f.c2_key && !f.c2_shield) out.push({ id: 'okey', icon: 'key' });
    return out;
  }
  // (G1-NARR: only what has happened is listed, in the past tense; the step ahead is the objective at the top of the same screen)
  journal() {
    const f = this.f;
    return [
      { key: 'c2_j_arrive', done: !!f.c2_started },
      { key: 'c2_j_taken', done: !!f.c2_planTaken },
      { key: 'c2_j_bal', done: !!f.c2_plan },
      { key: 'c2_j_back', done: !!f.c2_okuOK },
      { key: 'c2_j_parts', done: !!(f.c2_cog && f.c2_cyl) },
      { key: 'c2_j_key', done: !!f.c2_key },
      { key: 'c2_j_zoe', done: !!f.c2_broadcast },
      { key: 'c2_j_shield', done: !!f.c2_shield },
      { key: 'c2_j_vesk', done: !!f.c2_veskDown },
    ].filter((l) => l.done);
  }
}
