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
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import '../text/ch7.js';
import { glowSprite } from '../interiors.js';
import { stepWalk } from './zeelift.js';
import { storyJourney } from '../travelfilm.js';
import { revealBeat, twoShot, solidAt } from './revealcam.js';
import { PassThread } from './passline.js';

// (WC-1) the glider on the monks' slope for its departure film, from the monastery's gate, and where it is watched from
// (on the terrace's lip east of the gate, clear of the rope lift's winch, nose south over the drop to Lhar; REV-HAM: on chapter
//  10's glider spot (network.js decorate: the gate + (6.3, 3.8)) — 1.3 m east and 0.8 m south of where it stood, its body and
//  tailplane through the gate's signpost (the gate + (4.5, 1.5)) as it took off. Its watch spot moved with it)
const SLOPE = { x: 6.3, z: 3.8, a: 0, lx: 14.3, lz: 2.8 };

// THE SECOND SHIFT (P109 part 2, docs/SECOND-SHIFT.md "Hamalayi, chapter 7 — The wrong roof"): before the mirrors and
// Sendell. Coming up onto the peak, Twinsen finds Sefa outside at the observatory's old signalling shutter (a heliograph:
// a mirror, four slats, a sighting tube; hamalayi.js R.shutter), Pim beside him (he said in chapter 6 that he knows the
// ridge). Sefa greets him and flashes three long and one short at the roof he remembers, seen through the sight: the one
// roof in Lhar whose ridge clears the rock shelf (hamalayi.js R.goatHouse). Nothing answers. Pim: that's Grandma's old
// house, where we keep the goats now; Grandma lives with them, he'd know if he ever came down ("I'd know if anyone ever
// came up"). On his way to the ridge Twinsen walked past Tashi minding the lift's upper brake (the line still kicks in
// threes until the vent breathes): he takes the shutter. His keys swing and tip it (the light is a bright patch where the
// beam meets the ground, followed through the sight); when it touches the lift's top landing Tashi answers at once from
// his belt buckle: two quick, one long (a visible flash, a caption, a sound). Sefa: "Somebody answered." He goes in; the
// mirrors and Sendell follow as before (his greeting is not said twice). No waiting, no second maze, no fail state: the
// sweep cannot fail, and letting go keeps it for later.
// Flags (saved): rf_v (a game that meets Sefa this way: set at the chapter's start, or on loading a chapter-7 save that has
// not met him yet), rf_shut (the scene said: the shutter is Twinsen's to try), rf_roof (Tashi answered). A save from
// before with Sefa met (c7_keeper) has none of it: Sefa inside, Pim and Tashi at the monastery, as it was.
const ROOF_R = 10;   // (m from the shutter: he has come up onto the peak; the dome's door is 6.5 m from it)
const dirOf = (az, el) => ({ x: Math.sin(az) * Math.cos(el), y: Math.sin(el), z: Math.cos(az) * Math.cos(el) });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
class RoofThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.later = []; this.walk = null; this.hold = null; this.busy = false; }
  get f() { return this.game.flags; }
  get M() { return this.game.regions?.built('hamalayi'); }
  get S() { return this.M?.shutter; }
  on() { return !!this.f.rf_v; }
  cur() { return this.ch.isCur(); }
  // Sefa out at his shutter (until Tashi has answered); Pim up on the peak (until the vent breathes); Tashi at the landing
  outside() { const f = this.f; return this.on() && this.cur() && !f.rf_roof && !f.c7_keeper; }
  pimUp() { return this.on() && this.cur() && !this.f.c7_vent; }
  begin() { const f = this.f; if (!f.c7_keeper && !f.c7_lit) f.rf_v = 1; }
  applyFlags() {
    const f = this.f, g = this.game;
    if (this.cur() && !f.rf_v && !f.c7_keeper && !f.c7_lit) f.rf_v = 1;   // (a chapter-7 save from before, Sefa not met yet: the scene is ahead)
    if (this._holdFn && g.heroHold === this._holdFn) g.heroHold = null;
    this.beat?.release?.(0); this.beat = null;
    if (this.walk) this.walk.n.controlled = false;
    this.later = []; this.walk = null; this.hold = null; this.busy = false;
    this.light(null); this.flash(false);
    g.regions.whenBuilt('hamalayi', () => this.push());
  }
  // the shutter as the flags have it: shut, aimed at the old roof, or (answered) at the landing
  push() { const S = this.S; if (!S) return; const t = this.f.rf_roof ? this.aimAt(S.station, 1.0) : { az: S.az0, el: S.el0 }; S.aim(t.az, t.el); S.open(0); }
  aimAt(p, up) { const S = this.S, e = S.eye, y = this.game.physics.groundAt(p.x, p.z) + up; return { az: Math.atan2(p.x - e.x, p.z - e.z), el: Math.atan2(y - e.y, Math.hypot(p.x - e.x, p.z - e.z)) }; }
  place(id) {
    if (!this.cur() || !this.on() || !['keeper', 'pim', 'lhar1'].includes(id)) return undefined;
    const S = this.S;
    if (!S) return undefined;
    const f = this.f;
    if (id === 'keeper') {
      if (this.walk) { const n = this.walk.n; return { x: n.pos.x, y: n.pos.y, z: n.pos.z, a: n.angle, pin: true }; }
      if (this.outside()) return f.rf_shut ? { ...S.aside } : { ...S.sefa, anim: 'use' };
      return undefined;
    }
    if (id === 'pim') return this.pimUp() ? { ...S.pim } : undefined;
    return { ...S.station };   // (lhar1: Tashi at the landing all chapter)
  }
  after(t, fn) { this.later.push({ t, fn }); }
  // where the beam meets the ground (or a roof): a march along it from the mirror, 0.5 m a step, 140 m at most
  cast() {
    const S = this.S, P = this.game.physics, e = S.eye, d = dirOf(S.az, S.el);
    for (let t = 1; t <= 140; t += 0.5) {
      const x = e.x + d.x * t, y = e.y + d.y * t, z = e.z + d.z * t, gy = P.groundAt(x, z, y + 0.6);
      if (y <= gy) return { x, y: gy, z, t };
    }
    return null;
  }
  // the light on the snow: a bright patch where the beam lands (in the region's group, so it is drawn with it)
  light(p) {
    const M = this.M;
    if (!p || !M) { if (this._spot) this._spot.visible = false; return; }
    if (!this._spot) { this._spot = glowSprite('#fff4d0', 3.0, 0.95); this._spot.renderOrder = 5; }
    if (this._spot.parent !== M.group) M.group.add(this._spot);
    const o = M.group.position; this._spot.position.set(p.x - o.x, p.y + 0.35 - o.y, p.z - o.z); this._spot.visible = true;
  }
  flash(on) {
    const M = this.M, n = this.ch.npc('lhar1');
    if (!on || !M || !n?.present) { if (this._flash) this._flash.visible = false; return; }
    if (!this._flash) { this._flash = glowSprite('#ffffff', 2.2, 1.0); this._flash.renderOrder = 6; }
    if (this._flash.parent !== M.group) M.group.add(this._flash);
    const o = M.group.position, a = n.angle; this._flash.position.set(n.pos.x + Math.sin(a) * 0.3 - o.x, n.pos.y + 1.0 - o.y, n.pos.z + Math.cos(a) * 0.3 - o.z); this._flash.visible = true;
  }
  // the view through the shutter's sight: from just ahead of the mirror along its aim, a narrow lens on where the light falls
  scope() {
    const beat = revealBeat(this.game, { in: 0.5 });
    if (!beat) return null;
    beat.show(() => {
      const S = this.S, e = S.eye, d = dirOf(S.az, S.el), p = this.cast() || { x: e.x + d.x * 80, y: e.y + d.y * 80, z: e.z + d.z * 80 };
      return { pos: new THREE.Vector3(e.x + d.x * 0.8, e.y + 0.22, e.z + d.z * 0.8), look: new THREE.Vector3(p.x, p.y + 1.0, p.z), fov: 14 };
    }, 0.6);
    return beat;
  }
  // he comes up onto the peak: Sefa's greeting, his old signal at the roof he remembers (nothing answers), Pim, the goats
  scene() {
    const g = this.game, f = this.f, ch = this.ch, S = this.S;
    this.busy = true;
    ch.chain([['keeper', 'c7_keeper_1'], ['keeper', 'rf_sefa_try']], () => {
      this.beat = this.scope();
      const at = this.cast();
      for (const [t0, d] of [[0.3, 0.7], [1.3, 0.7], [2.3, 0.7], [3.3, 0.25]]) {
        this.after(t0, () => { S.open(1); this.light(at); g.audio.play('gearClack', S); });
        this.after(t0 + d, () => { S.open(0); this.light(null); g.audio.play('gearClack', S); });
      }
      this.after(4.6, () => ch.chain([['keeper', 'rf_sefa_none'], ['pim', 'rf_pim_roof'], ['keeper', 'rf_sefa_goats'], ['pim', 'rf_pim_down'], ['keeper', 'rf_sefa_up']], () => {
        this.beat?.release(0.8); this.beat = null;
        ch.chain([['hero', 'rf_tw_try']], () => {
          f.rf_shut = true; this.busy = false;
          this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
        });
      }));
    });
  }
  // at the shutter: he steps behind it and takes its handles; the sight, the light on the snow
  take() {
    const h = this.game.hero, S = this.S;
    this.busy = true;
    h.walkTo([S.sefa], { a: S.sefa.a, speed: 1.6, then: () => this.startHold(), fail: () => this.startHold() });
    if (h.steer) h.steer.indoor = true;   // (a story's own steps: life.js lets them be)
  }
  startHold() {
    const g = this.game, S = this.S;
    this.busy = false;
    const p0 = this.cast();
    this.hold = { snd: 0, done: false, az: S.az, R: p0 ? Math.hypot(p0.x - S.eye.x, p0.z - S.eye.z) : 80 };
    S.open(1); this.light(p0);
    this._holdFn ||= (dt, input) => this.holdStep(dt, input);
    g.heroHold = this._holdFn;
    this.beat = this.scope();
    g.hud.toast('rf_toast_shutter', { l: g.hud.key('left'), r: g.hud.key('right'), u: g.hud.key('up'), d: g.hud.key('down'), e: g.hud.key('interact') }, 6500);
  }
  letGo() {
    const g = this.game, S = this.S;
    if (this._holdFn && g.heroHold === this._holdFn) g.heroHold = null;
    this.hold = null; S?.open(0); this.light(null);
    this.beat?.release(0.8); this.beat = null;
  }
  // in his hands: left and right swing it, up and down tip it; the light follows over the snow. On the landing: an answer
  holdStep(dt, input) {
    const g = this.game, S = this.S, h = g.hero, H = this.hold;
    if (!H || !S || g.room?.id !== 'hamalayi') { if (g.heroHold === this._holdFn) g.heroHold = null; return false; }
    h.vel?.set(0, 0); h.angle = S.az; h.rig.play('use'); h.rig.update(dt, 0); h.sync();
    if (H.done) return true;
    H.t = (H.t || 0) + dt;   // (the key that took it, still down this frame, does not let it go again)
    if (H.t > 0.3 && (input.pressed('interact') || input.pressed('action') || input.pressed('dodge'))) { this.letGo(); return true; }
    const mv = input.move();
    if (Math.abs(mv.x) > 0.2 || Math.abs(mv.y) > 0.2) {
      // (facing south over the drop, east is on his left: a left key swings the light east, toward the landing. Up and
      //  down tip the mirror so the light runs farther over the snow or comes nearer: it stays on the ground)
      H.az = clamp(H.az - mv.x * 0.4 * dt, S.az0 - 0.6, S.az0 + 1.6);
      H.R = clamp(H.R + mv.y * 16 * dt, 14, 130);
      const e = S.eye, x = e.x + Math.sin(H.az) * H.R, z = e.z + Math.cos(H.az) * H.R, y = this.game.physics.groundAt(x, z, e.y);
      S.aim(H.az, Math.atan2(y + 0.2 - e.y, H.R));
      if ((H.snd -= dt) <= 0) { H.snd = 0.35; g.audio.play('tick', S); }
    }
    const p = this.cast();
    if (this.onStation(p)) { const T = S.station; this.light({ x: T.x, y: this.game.physics.groundAt(T.x, T.z), z: T.z }); this.answered(); return true; }
    this.light(p);
    return true;
  }
  // the beam falls on whoever stands at the landing: within 3 m of his chest, short of where it lands (a mirror's beam is
  // a cone a few degrees wide, and a flash is seen off its edge: at 50 m it lights a man whether or not its middle is on him)
  onStation(p) {
    const S = this.S, e = S.eye, d = dirOf(S.az, S.el), T = S.station, ty = this.game.physics.groundAt(T.x, T.z) + 1.2;
    const vx = T.x - e.x, vy = ty - e.y, vz = T.z - e.z, t = vx * d.x + vy * d.y + vz * d.z;
    if (t <= 0 || (p && t > p.t + 1.5)) return false;
    return Math.hypot(vx - d.x * t, vy - d.y * t, vz - d.z * t) < 3.0;
  }
  // Tashi answers at once from his belt buckle: two quick, one long
  answered() {
    const g = this.game, f = this.f, ch = this.ch, S = this.S, n = ch.npc('lhar1');
    this.hold.done = true;
    f.rf_roof = true; g.save(false);
    if (n?.present) { n.forceAnim = 'reachHigh'; this.after(1.7, () => { if (n.forceAnim === 'reachHigh') n.forceAnim = null; }); }
    for (const [t0, d] of [[0.3, 0.14], [0.6, 0.14], [0.9, 0.55]]) { this.after(t0, () => { this.flash(true); g.audio.play('blip', S.station); }); this.after(t0 + d, () => this.flash(false)); }
    this.after(1.9, () => ch.chain([['narrator', 'rf_flash'], ['pim', 'rf_pim_tashi'], ['keeper', 'rf_sefa_answer'], ['keeper', 'rf_sefa_in']], () => {
      this.letGo(); g.updateObjective(); this.sefaIn();
    }));
  }
  // Sefa goes in to his mirrors; Pim stays at the shutter, keeping Tashi company
  sefaIn() {
    const n = this.ch.npc('keeper'), M = this.M;
    if (!n?.present || !M) { this.story.refreshCast(); return; }
    const d = M.observatory.door;
    n.controlled = true;
    this.walk = { n, pts: [{ x: d.x + 0.6, z: d.z + 1.0 }, { x: d.x, z: d.z - 0.15 }], spd: 1.1, done: () => { n.controlled = false; this.walk = null; this.story.refreshCast(); } };
  }
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, S = this.S;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (this.walk && stepWalk(g, this.walk, dt)) this.walk.done();
    if (!S || !this.outside() || f.rf_shut || this.busy || g.room?.id !== 'hamalayi') return;
    if (g.state === 'play' && !g.trans && !h.steer && h.actT <= 0 && Math.hypot(h.pos.x - S.x, h.pos.z - S.z) < ROOF_R && this.ch.npc('keeper')?.present) this.scene();
  }
  interactables(consider, dist) {
    const S = this.S, f = this.f;
    if (!S || !this.cur() || !this.on() || this.game.room?.id !== 'hamalayi') return;
    if (this.hold) { if (!this.hold.done) consider(-1, 3, { kind: 'rf_letgo', label: 'p_letgo' }); return; }
    if (this.busy) return;
    // (from where one works it, behind it: ahead of Sefa and Pim beside it, people being ranked 0.35 m ahead: Game.findInteractable)
    if (this.outside() && f.rf_shut) { const d = dist(S.sefa.x, S.sefa.z); if (d < 1.6) consider(d - 0.45, 1.6, { kind: 'rf_shutter', label: 'p_signal' }); }
    else if (!this.outside()) consider(dist(S.x, S.z), 1.5, { kind: 'rf_look', label: 'p_look' });
  }
  interact(it) {
    switch (it.kind) {
      case 'rf_shutter': this.take(); return true;
      case 'rf_letgo': this.letGo(); return true;
      case 'rf_look': this.ch.chain([['hero', this.f.rf_roof ? 'rf_look_after' : 'rf_look']]); return true;
    }
    return false;
  }
  talk(npc) {
    const f = this.f, id = npc.def.id, c = (lines) => { this.ch.chain(lines); return true; };
    if (!this.cur() || !this.on() || this.busy || this.hold) return false;
    if (id === 'keeper' && this.outside()) { if (!f.rf_shut) { this.scene(); return true; } return c([['keeper', 'rf_sefa_wait']]); }
    if (id === 'pim' && this.pimUp()) return c([['pim', f.rf_roof ? 'rf_pim_after' : f.rf_shut ? 'rf_pim_wait' : 'rf_pim_kite']]);
    if (id === 'lhar1') return c([['lhar1', f.rf_roof ? 'rf_tashi_after' : 'rf_tashi']]);
    return false;
  }
  objective() {
    const f = this.f;
    if (!this.outside()) return this.on() && f.rf_roof && !f.c7_keeper && this.game.room?.id !== 'obsv' ? this.ch.goal('rf_obj_in') : null;
    return f.rf_shut ? this.ch.goal('rf_obj_flash') : this.game.room?.id === 'obsv' ? this.ch.goal('rf_obj_sefa') : null;   // (in the dome first: he is outside)
  }
  markers() { const S = this.S; return S && this.outside() && this.f.rf_shut && !this.hold ? this.ch.stars(S) : null; }
  journal() { return this.f.rf_roof ? [{ key: 'rf_j_roof', done: true }] : []; }
}

export class Observatory extends ChapterBase {
  get M() { return this.game.rooms.hamalayi; }
  get roof() { return (this._roof ||= new RoofThread(this)); }
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
    { const rp = this.roof.place(id); if (rp !== undefined) return rp; }   // (THE SECOND SHIFT: Sefa at his shutter, Pim on the peak, Tashi at the landing)
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
    this.roof.begin();   // (THE SECOND SHIFT: Sefa at his signalling shutter on the peak)
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
    this.roof.interactables(consider, dist);   // (THE SECOND SHIFT: the signalling shutter)
    if (this.roof.hold) return;
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
    if (this.roof.interact(it)) return true;
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
    if (this.roof.talk(npc)) return true;   // (THE SECOND SHIFT: at the shutter; Pim on the peak; Tashi at the landing)
    switch (id) {
      case 'keeper':
        if (this.ps.talk7(npc)) return true;   // (CAMPAIGN-5: the fourth setting)
        // (THE SECOND SHIFT: met at his shutter, he has greeted Twinsen already)
        if (!f.c7_keeper) return c([...(f.rf_roof ? [] : [['keeper', 'c7_keeper_1']]), ['hero', 'c7_tw_k1'], ['keeper', 'c7_keeper_2'], ['keeper', 'c7_keeper_3'], ['keeper', f.c7_ice ? 'c7_keeper_sun_open' : 'c7_keeper_sun'], ['hero', 'c7_mirror_hint']], () => { f.c7_keeper = true; g.updateObjective(); g.save(false); });
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
    this.chain([['hesk', 'c7_hesk_go']], () => { g.save(false); this.fly(); });
  }
  // (END-RESUME, base.js: a save made at the glider's film — Save & quit during it — flies again after the load; leave()
  //  above returns once c7_done is set, so it was a dead end: no prompt, no trigger)
  endSaved() { return !!this.f.c7_done; }
  resumeEnd() { this.fly(); }
  fly() {
    const g = this.game;
    // WC-1: the glider's film (TRAVEL-1): Hesk's glider runs off the terrace's lip by the monastery's gate and is seen coming
    // down on Citadel's glider field on the plateau, where chapter 8 starts (Hesk flies on south: he stays aboard)
    storyJourney(g, { from: this.slopeSpot(), to: 'citadel_glider', mode: 'glider', aboard: [this.npc('hesk')] },
      (then) => g.startTransition(() => this.story.nextChapter(), this.story.nextAreas(), then));
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
    this.roof.update(dt);
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
    this.roof.applyFlags();   // (THE SECOND SHIFT: the shutter's aim; nothing in hand)
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
    { const rm = this.roof.markers(); if (rm) return rm; }   // (THE SECOND SHIFT: the shutter, Twinsen's to try)
    if (f.c7_vent) return this.stars(M.monastery.gate);
    if (f.c7_scope) return this.stars(M.vent);
    return this.stars(M.observatory.door);
  }
  objective() {
    const f = this.f, r = this.room();
    if (!f.c7_started) return '';
    { const ro = this.roof.objective(); if (ro) return ro; }   // (THE SECOND SHIFT: the shutter; then in to the mirrors)
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
      ...this.roof.journal(),   // (THE SECOND SHIFT)
      { key: 'c7_j_keeper', done: !!f.c7_keeper },
      { key: 'c7_j_sendell', done: !!f.c7_sendell },
      { key: 'ob_j_dir', done: !!f.ob_dir },
      { key: 'c7_j_vent', done: !!f.c7_vent },
      { key: 'c7_j_home', done: !!f.c7_vent },
    ].filter((l) => l.done);   // (G1-NARR: what has happened, in the past tense; the step ahead is the objective)
  }
}
