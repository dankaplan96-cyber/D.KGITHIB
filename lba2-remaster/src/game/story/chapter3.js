// Chapters 11 and 12 — "The Shell" and "The Core" (one story, one set of rooms and flags, two chapters).
//
// The Shell (chapter 11): the lift down the shaft, the deep installation, the crystal galleries and Sendell's
// chamber. It ends when Twinsen leaves Sendell's chamber for the core (once her words are done): chapter 12's card
// shows and The Core begins in the core room. The Core (chapter 12): Vesk, the guardian, the three pylons, the
// overload coil, the console. -> the epilogue.
// The two chapters are this one class (ChapterCore at the bottom is the second part): every hook the rooms need
// works in both, so a room can be walked back through in either; only what starts, ends, shows and journals a part
// differs.
//
// Twinsen follows Vesk down the drill shaft. In the project's deep installation he cools the bore's heat
// exchanger to free a jammed shutter (a cooling diagram on the wall gives the circuit: valves A and C to
// the exchanger, B to a drain; valve C sits on a catwalk reached by knocking a ladder down with the ball),
// past a maintenance drone. In the crystal galleries the well's crystals have grown huge; waking three
// pillars with the ball raises stepping stones across the chasm (the cliffs' mechanic, bigger). Sendell
// tells him plainly what lies under the shell and why stopping the drill is not enough. In the core Vesk
// sets the bore's guardian on him; Twinsen converts the three pylons with bank shots while his allies,
// by radio, feed each one (Zoé's signal, Mira's valves, Oku's mills). Vesk will not let go: he wants her
// power for the project, overloads the guardian and raises a coil over his console; three hits with the ball
// break it, the console bursts, and Twinsen switches the bore to shield mode himself. → epilogue.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/ch3.js';
import { FinaleFx, COIL_Y, COIL_R } from './finale-fx.js';

const ROOMS = { 'c3-shaft': 'c3shaft', 'c3-deep': 'c3deep', 'c3-gallery': 'c3gallery', 'c3-sendell': 'c3sendell', 'c3-core': 'c3core' };
const CIRCUIT = { A: true, B: false, C: true }; // the diagram: A and C to the exchanger, B to the drain
const ALLIES = [['zoeradio', 'c3_pylon_1'], ['miraradio', 'c3_pylon_2'], ['okuradio', 'c3_pylon_3']];
// a brass throw plate in front of each pylon: the spot (from the room's suggested bank-shot spot) and the
// 8-way direction a bank shot off the panels was measured to reach the receiver from (tests/chapter3.mjs)
// (the third plate: a shot from where it first stood (bankFrom - 1 m) struck the bay's shield wall; the shot clears it from
//  0.5-1.0 m right of there. tests/chapter3.mjs throws from each plate's centre and wants the first throw to hit)
const PLATE = [{ dx: 0, dz: 0, k: 7 }, { dx: -0.5, dz: 0, k: 5 }, { dx: -0.25, dz: 0, k: 3 }];

export class Chapter3 extends ChapterBase {
  get part() { return 1; }   // 1: The Shell (to Sendell), 2: The Core (ChapterCore)
  get R() { return this.game.rooms; }
  on() { return this.isCur(); }
  pylons() { return [0, 1, 2].filter((i) => this.f['c3_pylon' + i]).length; }

  // ---------------------------------------------------------------- cast
  enemyDefs() {
    const D = this.R.c3deep, G = this.R.c3gallery, C = this.R.c3core, out = [];
    if (this.part === 1 && D?.patrol?.length) {
      const n = D.patrol.length;
      out.push({ id: 'c3drone', kind: 'drone', group: 'c3deep', x: D.patrol[0][0], z: D.patrol[0][1], patrol: D.patrol, wp: 1 % n, when: (f) => this.isCur(f) });
    }
    // (DIFFICULTY: the four mites wake one after the other: the second of each shelf stirs 2.5 s after it notices him)
    if (this.part === 1) (G?.mites || []).forEach((p, i) => out.push({ id: 'c3mite' + i, kind: 'mite', x: p.x, z: p.z, wake: i % 2 ? 2.5 : 0, when: (f) => this.isCur(f) }));
    if (this.part === 2 && C?.bossSpot) out.push({ id: 'guardian', kind: 'guardian', group: 'core', x: C.bossSpot.x, z: C.bossSpot.z, arena: C.arena, when: (f) => this.isCur(f) && !!f.c3_fight && !f.c3_turned });
    return out;
  }
  place(id) {
    const f = this.f;
    if (!this.reached()) return undefined;
    if (id === 'vesk') return f.c3_done ? null : (this.R.c3core?.npcSpots?.vesk ?? null);
    return undefined;
  }
  get guardian() { return this.game.enemies.find((e) => e.def?.id === 'guardian'); }

  // ---------------------------------------------------------------- start
  begin() {
    const g = this.game;
    if (this.part === 2) {   // The Core: in through the door from Sendell's chamber; Vesk's scene starts as the room is entered
      if (!this.R.c3core) return;
      // Sendell's light renews him on his way out of her chamber: the chapter's save (and every Retry of the final
      // fight from it) starts at full life, not at whatever the galleries left him with (2 of 3 bot runs had died at
      // 6 HP and come back at 6 HP each time)
      g.hero.hp = g.hero.maxHp;
      const to = this.exitTo('c3-core');
      g.enterRoom('c3core', to?.x != null ? to : null, true);
      return;
    }
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
  canExit(room, to) {
    // the door from Sendell's chamber to the core is where The Shell ends (once her words are done)
    if (this.part === 1 && room.id === 'c3sendell' && to === 'c3-core') {
      if (this.f.c3_sendell && !this.game.trans) this.toCore();
      return false;
    }
    if (room.id === 'c3core' && this.f.c3_fight && !this.f.c3_done) { this.chain([['hero', 'c3_exit_block']]); return false; }
    return true;
  }
  // chapter 12: its title card, then The Core's first scene (its rooms are built behind the black)
  toCore() {
    const g = this.game;
    g.audio.play('door');
    g.startTransition(() => { this.story.nextChapter(); }, this.story.nextAreas());
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
    this.chain([['hero', 'c3_cooled']], () => { g.updateObjective(); g.save(false); });
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
      if (room === 'c3core' && tg.coil) { this.hitCoil(tg); return true; }
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
    // (no toast: Baldino's radio said how; a stuck player gets a nudge later, update())
    g.audio.setMood?.('boss');
    g.updateObjective();
    if (this.pylons() >= 3) this.overload(); // (a reload after the third pylon: straight to Vesk's overload)
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
    this.chain([[who, key]], () => { g.save(false); if (n >= 3) this.overload(); else g.updateObjective(); });
  }
  // ---- the second phase: Vesk overloads the guardian; his coil must be broken (three hits)
  overload() {
    const g = this.game, f = this.f;
    f.c3_overload = true; f.c3_coil = 0;
    this.chain([['vesk', 'c3_vesk_over1'], ['hero', 'c3_tw_over'], ['vesk', 'c3_vesk_over2'], ['vesk', 'c3_vesk_over3']], () => {
      this.ensureCoil();
      const gd = this.guardian;
      if (gd) { gd.setLevel?.(4); gd.state = 'chase'; gd.stateT = 0; gd.coolT = 1.5; }
      g.audio.play('rumble'); g.camRig.shake(0.3);
      g.updateObjective(); g.save(false);   // (the objective names the coil; a nudge comes only if he is stuck)
    });
  }
  // the coil: a crackling ball of light high over Vesk's console (finale-fx.js draws it, and the burst after it), a ball
  // target while the overload lasts
  get fx() { const C = this.R.c3core; return C ? (C.finaleFx ||= new FinaleFx(this.game, C)) : null; }
  ensureCoil() {
    const C = this.R.c3core, f = this.f;
    if (!C?.console || this.coil || !f.c3_overload || f.c3_turned) return;
    this.fx.spawn(f.c3_coil || 0);
    const tg = { x: C.console.x, y: COIL_Y, z: C.console.z, r: COIL_R, coil: true };
    C.ballTargets.push(tg);
    this.coil = { tg };
  }
  hitCoil(tg) {
    const g = this.game, f = this.f;
    f.c3_coil = (f.c3_coil || 0) + 1;
    g.audio.play('shard'); g.camRig.shake(0.25);
    g.particles.burst(tg.x, tg.y, tg.z, '#d8a0ff', 30, 5);
    if (f.c3_coil < 3) this.fx?.hit(f.c3_coil);
    g.hud.toast('c3_toast_coil_hit', { n: f.c3_coil });
    if (f.c3_coil >= 3) { tg.done = true; this.veskFalls(); return; }
    this.chain([['vesk', f.c3_coil === 1 ? 'c3_vesk_hit1' : 'c3_vesk_hit2']], () => { g.updateObjective(); g.save(false); });
  }
  // the third hit: the coil bursts, the console blows out, Vesk is thrown against the rail (all on screen under the
  // narrator's line, which opens at once as before: finale-fx.js plays it on the room's own clock, dialogue or not)
  veskFalls() {
    const g = this.game, f = this.f, C = this.R.c3core;
    f.c3_turned = true;
    this.coil = null;
    this.guardian?.powerDown?.();
    this.story.refreshCast();
    const vesk = this.npc('vesk'), fx = this.fx;
    g.particles.burst(C.console.x, (C.floorY ?? 0) + 1.6, C.console.z, '#ffd080', 40, 6);
    g.audio.play('break'); g.camRig.shake(0.45);
    if (fx) { fx.burst(); fx.throwVesk(vesk); } else vesk?.rig?.play?.('hurt');
    this.chain([['narrator', 'c3_vesk_fall'], ['vesk', 'c3_vesk_down'], ['hero', 'c3_tw_down'], ['hero', 'c3_tw_switch']], () => {
      g.hero?.act?.('use', 0.8);
      C.drill?.setMode?.('shield');
      C.field?.setLevel?.(1);
      g.audio.play('horn'); g.camRig.shake(0.3);
      this.chain([['sendell', 'c3_sendell_end'], ['balradio', 'c3_bal_end']], () => this.finish());
    });
  }
  finish() {
    const g = this.game, f = this.f;
    f.c3_done = true;
    g.save(false);
    g.startTransition(() => {
      if (this.story.chapters.length > 4) this.story.nextChapter();
    }, this.story.nextAreas());
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
        ['hero', 'c3_tw_sendell3'], ['sendell', 'c3_sendell_4'], ...(f.crystalsAll ? [['sendell', 'c3_sendell_crystals']] : []), ['balradio', 'c3_bal_radio2'], ['balradio', 'c3_bal_radio3']], () => {
        f.c3_sendell = true; S.presence?.setIntensity?.(0.45); g.updateObjective(); g.save(false);
      });
    }
    if (id === 'c3core' && !f.c3_fight && !this.resumeFight) {
      this.chain([['vesk', 'c3_core_vesk1'], ['hero', 'c3_core_tw1'], ['vesk', 'c3_core_vesk2'], ['vesk', 'c3_core_vesk3']], () => this.startFight());
    }
    if (id === 'c3core' && f.c3_fight && !f.c3_turned) g.audio.setMood?.('boss');
  }
  plates() {
    const C = this.R.c3core;
    return (C?.pylons || []).map((P, i) => (P.bankFrom ? { i, x: P.bankFrom.x + PLATE[i].dx, z: P.bankFrom.z + PLATE[i].dz, a: PLATE[i].k * Math.PI / 4 } : null)).filter(Boolean);
  }
  // the plates are drawn once, into the core room's group
  ensurePlates() {
    const C = this.R.c3core;
    if (!C || this.plateMeshes) return;
    const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.6, roughness: 0.35, emissive: '#ffb040', emissiveIntensity: 0 });
    const ring = new THREE.RingGeometry(0.34, 0.46, 24).rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(0.34, 24).rotateX(-Math.PI / 2);
    const arrow = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.42), new THREE.Vector3(-0.16, 0, 0.1), new THREE.Vector3(0.16, 0, 0.1)]);
    arrow.computeVertexNormals();
    const dark = new THREE.MeshStandardMaterial({ color: '#4a3a24', roughness: 0.6 });
    const y = (C.floorY ?? 0) + 0.02, gp = C.group.position;
    this.plateMeshes = this.plates().map((p) => {
      const k = new THREE.Group(); k.position.set(p.x - gp.x, y, p.z - gp.z); k.rotation.y = p.a;
      k.add(new THREE.Mesh(disc, dark), new THREE.Mesh(ring, brass));
      const ar = new THREE.Mesh(arrow, brass); ar.position.y = 0.005; k.add(ar);
      C.group.add(k);
      return k;
    });
    this.plateMat = brass;
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.on()) return;
    if (this.resumeFight && g.room?.id === 'c3core' && g.state === 'play' && !g.trans) { this.resumeFight = false; this.startFight(); }
    // during the fight, standing still on a plate lines Twinsen up for the bank shot
    if (g.room?.id === 'c3core') {
      this.ensurePlates();
      if (this.plateMat) this.plateMat.emissiveIntensity = f.c3_fight && !f.c3_turned ? 0.35 + Math.sin(g.time * 3) * 0.2 : 0;
      const h = g.hero;
      if (f.c3_fight && !f.c3_turned && h.onGround && (h.speed ?? 0) < 0.4) {
        for (const p of this.plates()) {
          if (f['c3_pylon' + p.i]) continue;
          const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
          if (d < 0.55) { const k = Math.min(1, (dt || 0.016) * 8); h.pos.x += (p.x - h.pos.x) * k; h.pos.z += (p.z - h.pos.z) * k; h.angle = p.a; }
        }
      }
    }
    if (g.room?.id === 'c3core' && f.c3_overload && !f.c3_turned) {
      this.ensureCoil();   // (it animates itself: finale-fx.js, on the room's updaters)
    }
    // nudges for a stuck player only (HINTS-LESS): no pylon after 40 s of the fight, no hit on the coil after 25 s
    const core = g.room?.id === 'c3core';
    this.nudge(dt, 'pylons', core && f.c3_fight && !f.c3_overload && this.pylons() === 0, 40, 'c3_toast_fight');
    this.nudge(dt, 'coil', core && f.c3_overload && !f.c3_turned && !(f.c3_coil > 0) && !!this.coil, 25, 'c3_toast_coil');
    // a defeat during the fight respawns at the core's entrance with the fight still on (pylons kept)
    if (f.c3_fight && !f.c3_turned && g.room?.id === 'c3core') {
      const gd = this.guardian;
      if (gd && !gd.present) this.story.refreshCast();
    }
  }
  applyFlags(past) {
    const f = this.f;
    if (!this.reached()) return;
    // (LAZY-REGIONS: the flags are set now; what they change in an area goes on it when it is built — at once if it
    //  is: regions.whenBuilt. A load builds the save's area and its chapter's first.)
    if (this.part === 1) this.game.regions.whenBuilt('c3deep', () => this.applyRooms());   // (the rooms, for both parts: once)
    if (this.part !== 2) return;
    // a fight interrupted by a reload restarts once play is under way in the core (no intro again: the load enters the
    // room while the title is still up, and a dialogue started then is cut by the switch to play)
    if (f.c3_fight && !f.c3_turned) { f.c3_fight = false; this.resumeFight = true; }
    if (f.c3_turned && !f.c3_done) f.c3_turned = false;
    if (f.c3_overload && !f.c3_done) { f.c3_overload = false; f.c3_coil = 0; }
    void past;
  }
  // the underground's rooms as the flags have them
  applyRooms() {
    const f = this.f, R = this.R;
    const D = R.c3deep, G = R.c3gallery, C = R.c3core;
    if (D) {
      for (const v of D.valves || []) { const o = !!f.c3_valves?.[v.id]; v.setOpen?.(o); v.open = o; }
      if (f.c3_ladder) { for (const tg of D.ballTargets || []) if (tg.ballSwitch) tg.done = true; this.lowerLadder(true); }
      if (f.c3_cooled) D.coolDoor?.open?.();
    }
    if (G) for (const i of [0, 1, 2]) if (f['c3_pillar' + i]) { for (const tg of G.ballTargets || []) if (tg.pillar === i) tg.done = true; this.lightPillar(i, true); }
    if (C) {
      for (const i of [0, 1, 2]) if (f['c3_pylon' + i]) { for (const tg of C.ballTargets || []) if (tg.pylon === i) tg.done = true; this.convertPylon(i, true); }
      if (f.c3_done) { C.drill?.setMode?.('shield'); C.field?.setLevel?.(1); this.fx?.wreckNow(); }
    }
    if (f.c3_sendell) { R.c3sendell?.presence?.setVisible?.(true); R.c3sendell?.presence?.setIntensity?.(0.45); }
  }

  // ---------------------------------------------------------------- HUD
  objective() {
    const f = this.f, room = this.game.room?.id;
    if (this.part === 2) {
      if (f.c3_overload && !f.c3_turned) return this.goal('c3_obj_coil', { n: f.c3_coil || 0 });
      if (f.c3_fight) return this.goal('c3_obj_pylons', { n: this.pylons() });
      return this.goal('c3_obj_core');
    }
    if (!f.c3_started) return '';
    if (f.c3_sendell) return this.goal('c3_obj_core');
    if (f.c3_cooled) return this.goal(room === 'c3gallery' ? 'c3_obj_gallery' : 'c3_obj_deeper');
    if (room === 'c3deep') return this.goal('c3_obj_cool') + this.sub(!!f.c3_diagram, 'c3_sub_diagram') + this.sub(!!f.c3_ladder, 'c3_sub_up');
    return this.goal('c3_obj_shaft');
  }
  journal() {
    const f = this.f;
    const lines = this.part === 2 ? [
      { key: 'c3_j_core', done: !!f.c3_fight || !!f.c3_overload || !!f.c3_turned },
      { key: 'c3_j_pylons', done: this.pylons() >= 3 },
      { key: 'c3_j_vesk', done: !!f.c3_done },
    ] : [
      { key: 'c3_j_shaft', done: !!f.c3_started },
      { key: 'c3_j_cool', done: !!f.c3_cooled },
      { key: 'c3_j_gallery', done: !!(f.c3_pillar0 && f.c3_pillar1 && f.c3_pillar2) },
      { key: 'c3_j_sendell', done: !!f.c3_sendell },
    ];
    return lines.filter((l, i, a) => i === 0 || a[i - 1].done);
  }
}

// chapter 12, "The Core": the second part of the same story (see the top of this file)
export class ChapterCore extends Chapter3 {
  get part() { return 2; }
}
