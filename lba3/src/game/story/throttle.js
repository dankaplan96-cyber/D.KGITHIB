// Chapter 10 of the expanded campaign — "Borrowed Time" (key 'throttle'). EXP-1 (docs/lba-maturity/EXP-PLAN-2.md,
// team-only): the bridge between the council (chapter 9) and Baldino's network, re-based on the campaign as it is now.
//
// Chapter 9 ends on Mill Lane, Zeelich: the stop thrown, the drill quiet, the kicks going on by themselves, Baldino's
// isolator on Kell's feed, "a network!". While Baldino builds his relays, the town is on borrowed time:
//   1. OG-1 "A Steady Hand": Mira calls on Zoé's lighthouse relay: since the stop nothing evens the kicks out, and every
//      kick hammers the shelters' pipes. A seen crossing home (the ship's film). In FunFrock's valve room a wheel opened
//      *while it kicks* bleeds the kick down the drain (between kicks it kicks back and pushes him off: no harm). After
//      three, the Balance Works governor the project bolted to the inlet can hold the line: it rings, Oren's rings rise
//      out of it, the needles settle on green. Oren: his name, Ballastra, the people in the shelters counted by weight.
//      Mira asks for more on wheel IV (Gilbert's washroom); it turns itself back ("Green holds.").
//   2. The fortress shelter: Gilbert's thanks, and his washroom still shut. The governor's plate (Balance Works) rings a
//      bell with Zoé, on the relay: the project's delivery register.
//   3. Played as Zoé: the project office of chapter 2 again, by its door this time (the council's order). The guard who
//      never saw her. The register names crate 212/3 and says "returned"; two crates read 212/1 and 212/2; the third is
//      under another, turned to the wall. In it the B-7, a local regulator with a hand lever, and Vesk's own tag: it works,
//      a station fitted with it can refuse the control room, do not fit, log it as returned (his decision, his hand).
//      She walks it to the shelter.
//   4. Twinsen at the shelter's branch: shut the feed first (opened with the feed on, the flange sprays him back), fit
//      the B-7, open the feed, turn its band until the branch gauge's needle sits on green (too much: the old joint
//      weeps; too little: a trickle). Oren tries the lever (the B-7 is Ballastra ware on the project's metal); a hand on
//      it beats him. Gilbert takes the lever. Vesk on the project's wire: a station that can say no will say no; Zoé
//      answers him. Baldino calls: the relays are built (EXP-2: with chapter 11 next, a relay only passes word along, the
//      B-7 holds a station by hand: Zoé's return label, Ballastra, the council's freighter). The next chapter begins.
//
// Flags: og_ (OG-1: og_started, og_home, og_arrived, og_room, og_bleed 0-3, og_steady, og_thanks); th_ (EXP-1: th_zoeGo,
// th_met, th_reg, th_cA, th_cC, th_cB 1|2, th_b7, th_zoeDone, th_feedShut, th_fitted, th_band 1-5, th_set, th_push,
// th_lever, th_vesk, th_done). Only the expanded campaign plays this chapter (Story.inCampaign); the governor and the
// branch's B-7 show only there. The branch is built the first time the chapter is reached (never for a base-game save).
import { ChapterBase } from './base.js';
import { t } from '../i18n.js';
import { buildOrenPresence, buildGovernor, GOV_TOP } from '../orenpresence.js';
import { shelterFrame } from './shelters.js';
import { playJourney } from '../travelfilm.js';
import { cyl, torus, MAT } from '../props.js';
import { compose } from '../kit.js';
import * as THREE from 'three';
import { readyCast } from './ballastra.js';   // (EXP-2: chapter 11's cast, fetched as chapter 10 ends)
import '../text/throttle.js';

const PERIOD = 3.2;                 // s between kicks
const AMP = [3, 2.3, 1.6, 0.9];     // the needles' leap after 0-3 bleeds (the gauges read 0..3, green at 2)
const BASE = 0.35;                  // where the needles sag between kicks (the shelters starved)
const GOV = { x: 5.15, z: -3.45 };  // the governor in the valve room's own frame (valveroom.js: the manifold's inlet end)
const FORT = { x: -50, z: -71, ry: 0.3 };   // FunFrock's fortress shelter (story/evacuation.js FORT, FORT_RY)
const FORT_F = shelterFrame(FORT.x, FORT.z, FORT.ry);
export const ZEELICH_ROOMS = new Set(['zeelich', 'workshop', 'upper', 'council', 'archive']);
const gold = '#ffcf4a';
// the shelter's branch: a riser up the headwall's face right of the door (shelters.js frame: f out, s along the face)
const RISER = { f: 0.3, s: 2.05 };
const BAND_RIGHT = 3, BAND_START = 5;
const BAND_P = [0, 0.35, 1.05, 2.0, 2.55, 2.95];   // the branch gauge's reading per band (green at 2: 1.7-2.3)
const BAND_FLOW = [0, 0.12, 0.35, 1, 1, 1];        // the washroom stream's strength per band
const LEVER_SHUT_S = 3.0;                           // s for Oren to swing the lever shut
// the project office's crates and its register, in the room's own frame (interiors.js buildProjOffice: BZ -5, LX -6.5)
const OFFICE = { reg: [-5.55, -3.3], A: [-0.05, -3.8], C: [-5.3, -1.95], B: [3.4, -2.6] };
const OFFICE_SPAWN = [4.8, -3.7];   // (the room's spawn in its frame: its origin is the spawn less this)

export class Throttle extends ChapterBase {
  get V() { return this.game.regions.built('valves'); }   // (a per-frame read never builds the room)
  room() { return this.game.room?.id ?? null; }
  onZeelich() { const id = this.room(); return !!id && (ZEELICH_ROOMS.has(id) || id.startsWith('isle_')); }
  inMine() { return this.reached() && this.story.inCampaign(this.key); }
  asZoe() { return this.game.hero?.body === 'zoe'; }
  zoePart() { const f = this.f; return this.isCur() && !!f.th_zoeGo && !f.th_zoeDone; }
  // 0..1 through the hammer's cycle: the bang at 0, the needles high to ~0.3, a creep up from ~0.85
  phase() { return (((this.game.time || 0) % PERIOD) + PERIOD) % PERIOD / PERIOD; }
  inKick(p = this.phase()) { return p < 0.42 || p > 0.9; }
  hammering() { const f = this.f; return this.isCur() && this.room() === 'valves' && !!f.og_room && !f.og_steady; }
  speaker(id) { return id === 'zoe' && this.asZoe() ? this.game.hero : super.speaker(id); }
  officeAt(p) { const R = this.game.regions.built('projoffice'); if (!R?.spawn) return null; return { x: R.spawn.x - OFFICE_SPAWN[0] + p[0], z: R.spawn.z - OFFICE_SPAWN[1] + p[1] }; }

  // ---------------------------------------------------------------- props: the governor and Oren's rings
  decorate() {
    const g = this.game, V = this.V;
    if (!V || !this.once('valves')) return;
    const gov = buildGovernor();
    gov.position.set(GOV.x, 0, GOV.z);
    // the elbow from the governor's side into the manifold's end (valveroom.js: the manifold at y 0.6, z -4.0)
    const elbow = new THREE.Mesh(cyl(0.11, 0.11, 0.5, 10), MAT.copper());
    elbow.rotation.x = Math.PI / 2; elbow.position.set(0, 0.6, -0.33); gov.add(elbow);
    V.group.add(gov);
    const pres = buildOrenPresence();
    pres.group.position.set(GOV.x, GOV_TOP + 0.14, GOV.z);
    V.group.add(pres.group);
    this.gov = gov; this.pres = pres;
    this.govCol = g.physics.add({ type: 'cyl', x: V.group.position.x + GOV.x, z: V.group.position.z + GOV.z, r: 0.32, top: 1.4, noStand: true });
    this.needle = this.f.og_steady ? 2 : BASE; this.lastP = 0; this.closing = [];
    V.updaters.push((dt) => this.roomTick(dt));
    this.showGovernor();
  }
  showGovernor() {
    if (!this.gov) return;
    const on = this.inMine();
    this.gov.visible = on; this.govCol.enabled = on;
    // (Oren's rings: up and idly turning once he holds the mains; risen by the scene when he first does)
    if (!on || !this.f.og_steady) this.pres.set(0);
    else if (!this.rising) { this.pres.set(1); this.pres.setMode('turning'); }
  }

  // ---------------------------------------------------------------- props: the fortress shelter's branch and the B-7
  // Built once, the first time a save in the expanded campaign has reached this chapter (a base-game player never gets
  // it): 12 small merged meshes on the kit's shared materials (3 cast shadows), a thin collider round the riser.
  ensureBranch() {
    const g = this.game, root = g.world?.root;
    if (this.branch || !root || !this.inMine()) return this.branch;
    const P = FORT_F.at(RISER.f, RISER.s), gy = g.physics.groundAt(P.x, P.z);
    const grp = new THREE.Group(); grp.name = 'th_branch'; grp.position.set(P.x, gy, P.z); grp.rotation.y = FORT.ry; root.add(grp);
    const cu = MAT.copper(), ir = MAT.iron(), br = MAT.brass(), red = MAT.paint('#b8302a', 0.5);
    // (each part's pieces are merged per material: 12 meshes in all, 3 casting shadows; EXP-1 measured 47 draws before)
    const mesh = (parent, mat, parts, shadow = false, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(compose(parts), mat); m.position.set(x, y, z); m.castShadow = shadow; parent.add(m); return m; };
    // the riser (up from a foot to the flange gap, on to an elbow into the wall) and the washroom spout off its side
    mesh(grp, cu, [[cyl(0.06, 0.06, 0.85, 10), 0, 0.425, 0], [cyl(0.06, 0.06, 1.15, 10), 0, 1.725, 0], [cyl(0.06, 0.06, 0.32, 10), 0, 2.3, -0.16, Math.PI / 2],
      [cyl(0.035, 0.035, 0.42, 8), 0.21, 0.72, 0, 0, 0, Math.PI / 2], [cyl(0.035, 0.03, 0.12, 8), 0.42, 0.66, 0]], true);
    // iron: the flanges, the wheel's stem, the old joint, the wire box's grille
    mesh(grp, ir, [[cyl(0.13, 0.13, 0.04, 14), 0, 0.85, 0], [cyl(0.13, 0.13, 0.04, 14), 0, 1.15, 0], [cyl(0.025, 0.025, 0.12, 6), 0, 0.45, 0.06, Math.PI / 2],
      [cyl(0.09, 0.09, 0.14, 10), 0, 1.75, 0], [new THREE.BoxGeometry(0.18, 0.12, 0.012), -0.55, 1.66, 0.035]]);
    // the bucket under the spout; the project's wire box on the headwall (Vesk's voice comes out of it)
    mesh(grp, MAT.paint('#8a9aa8', 0.5), [[cyl(0.16, 0.13, 0.3, 14, true), 0.42, 0.15, 0]], true);
    mesh(grp, MAT.paint('#5a6a6e', 0.55), [[new THREE.BoxGeometry(0.26, 0.32, 0.1), -0.55, 1.6, -0.02]]);
    // the gauge on the riser: its face, the green arc, the needle
    mesh(grp, MAT.flat('#f0ead8', 0.6), [[cyl(0.085, 0.085, 0.03, 16), 0, 1.42, 0.07, Math.PI / 2]]);
    mesh(grp, MAT.flat('#3aa04a', 0.6), [[torus(0.06, 0.008, 4, 10, Math.PI * 0.3), 0, 0, 0, 0, 0, Math.PI * 0.35]], false, 0, 1.42, 0.088);
    const needle = new THREE.Group(); needle.position.set(0, 1.42, 0.092); grp.add(needle);
    mesh(needle, MAT.flat('#2a2a2a', 0.6), [[cyl(0.006, 0.004, 0.065, 4), 0, 0.03, 0]]);
    // the feed wheel low on the riser, facing out
    const wheel = new THREE.Group(); wheel.position.set(0, 0.45, 0.12); grp.add(wheel);
    mesh(wheel, red, [[torus(0.13, 0.016, 5, 16)], [cyl(0.012, 0.012, 0.26, 5), 0, 0, 0, 0, 0, Math.PI / 2], [cyl(0.012, 0.012, 0.26, 5)]]);
    // the stream into the bucket
    const stream = mesh(grp, MAT.glass('#cfefff', 0.6), [[cyl(0.016, 0.02, 0.36, 6)]], false, 0.42, 0.42, 0);
    // the B-7: a brass body between the flanges, its band knob in front (a pointer on it), the red hand lever on top
    const b7 = new THREE.Group(); b7.position.set(0, 1.0, 0); grp.add(b7);
    mesh(b7, br, [[cyl(0.11, 0.11, 0.26, 14)], [cyl(0.12, 0.12, 0.03, 14), 0, 0.06, 0]], true);
    const knob = new THREE.Group(); knob.position.set(0, 0, 0.12); b7.add(knob);
    mesh(knob, ir, [[cyl(0.045, 0.045, 0.05, 10), 0, 0, 0, Math.PI / 2], [new THREE.BoxGeometry(0.012, 0.05, 0.012), 0, 0.022, 0.028]]);
    const lever = new THREE.Group(); lever.position.set(0, 0.14, 0); b7.add(lever);
    mesh(lever, red, [[new THREE.BoxGeometry(0.03, 0.03, 0.3), 0, 0.02, 0.13]]);
    this.col = g.physics.add({ type: 'cyl', x: P.x, z: P.z, r: 0.16, top: 2.4, noStand: true });
    this.branch = { grp, wheel, needle, stream, b7, knob, lever, P, gy, need: 0, flow: 0, leverA: 0, sprayT: 0 };
    this.showBranch();
    return this.branch;
  }
  // points in the world: out in front of the riser (where he stands to work it), the joint, the spout
  front(off = 0.62, side = 0) { return FORT_F.at(RISER.f + off, RISER.s + side); }
  jointAt() { const B = this.branch; return { x: B.P.x, y: B.gy + 1.75, z: B.P.z }; }
  showBranch() {
    const B = this.branch, f = this.f;
    if (!B) return;
    B.grp.visible = this.inMine();
    B.b7.visible = !!f.th_fitted;
    B.knob.rotation.z = -((f.th_band || BAND_START) - 1) * 0.6;
    B.wheel.rotation.z = f.th_feedShut ? Math.PI * 1.5 : 0;
  }
  // what the branch's water does now: the target needle and flow (fed through the B-7 at its band; or the washroom's
  // line shut, as Oren keeps it, before the B-7)
  branchState() {
    const f = this.f, B = this.branch;
    if (!f.th_fitted || f.th_feedShut) return { p: f.th_feedShut ? 0 : 0.2, flow: 0, weep: false };
    const k = f.th_band || BAND_START, lev = f.th_lever ? 1 : 1 - (B?.leverA || 0);
    return { p: BAND_P[k] * lev, flow: BAND_FLOW[k] * lev, weep: k > BAND_RIGHT && lev > 0.5 };
  }
  branchTick(dt) {
    const g = this.game, B = this.branch, f = this.f;
    if (!B || !B.grp.visible) return;
    const s = this.branchState();
    // Oren's push: the lever swings shut until a hand holds it
    if (f.th_push && !f.th_lever && !this.holding) B.leverA = Math.min(1, B.leverA + dt / LEVER_SHUT_S);
    else if (f.th_lever || this.holding) B.leverA = Math.max(0, B.leverA - dt * 2);
    B.lever.rotation.x = B.leverA * 1.2;
    B.need += (s.p - B.need) * Math.min(1, dt * 2.5);
    B.needle.rotation.z = 1.2 - (Math.max(0, Math.min(3, B.need + 0.03 * Math.sin(g.time * 3))) / 3) * 2.4;
    B.flow += (s.flow - B.flow) * Math.min(1, dt * 3);
    B.stream.visible = B.flow > 0.05;
    B.stream.scale.set(0.3 + B.flow * 0.9, 1, 0.3 + B.flow * 0.9);
    if (s.weep && (B.sprayT -= dt) <= 0) { B.sprayT = 0.5; const J = this.jointAt(); g.particles.burst(J.x, J.y, J.z, '#cfe8ff', 6, 1.4); }
  }

  // the valve room's own clock (every frame while he is in it, dialogue too): needles, the bang, the rings, the wheels
  roomTick(dt) {
    const g = this.game, f = this.f, V = this.V;
    if (!V) return;
    // (the shove runs in the line's dialogue too: it starts with the line)
    if (this.shove && g.state !== 'title') { const s = this.shove, d = Math.min(dt, s.t); g.physics.move(g.hero, s.x * 2.0 * d, s.z * 2.0 * d); if ((s.t -= dt) <= 0) this.shove = null; }
    for (let i = this.closing.length - 1; i >= 0; i--) { const c = this.closing[i]; if ((c.t -= dt) <= 0) { c.v.setOpen(false); this.closing.splice(i, 1); } }
    if (this.pres.group.visible || this.rising) {
      if (this.rising) { this.rising = Math.min(1, this.rising + dt / 2.0); this.pres.set(this.rising); if (this.rising >= 1) this.rising = 0; }
      const h = g.hero, c = V.group.position;
      this.pres.update(dt, Math.atan2(h.pos.x - (c.x + GOV.x), h.pos.z - (c.z + GOV.z)));
    }
    if (!this.isCur()) return;   // (the network sets the gauges itself)
    const p = this.phase();
    if (this.hammering()) {
      const amp = AMP[Math.min(3, f.og_bleed | 0)];
      if (p < this.lastP && g.state !== 'title') { g.audio.play('pipeKnock'); if (amp > 2) g.audio.play('thump'); g.camRig.shake(0.04 + 0.06 * amp / 3); }
      const kick = p < 0.08 ? p / 0.08 : p < 0.3 ? 1 - ((p - 0.08) / 0.22) * 0.6 : p < 0.45 ? 0.4 * (1 - (p - 0.3) / 0.15) : p > 0.85 ? (p - 0.85) / 0.15 * 0.25 : 0;
      this.needle = BASE + amp * kick;
    } else if (f.og_steady) this.needle += (2 - this.needle) * Math.min(1, dt * 1.5);
    this.lastP = p;
    V.gauges.set([this.needle + 0.04 * Math.sin(g.time * 3.1), this.needle + 0.04 * Math.sin(g.time * 2.3 + 1), this.needle + 0.03 * Math.sin(g.time * 2.7 + 2)].map((v) => Math.max(0, Math.min(3, v))));
  }

  // ---------------------------------------------------------------- cast
  place(id) {
    const f = this.f, R = this.game.rooms;
    if (!this.isCur()) return undefined;   // (later chapters place their own; this chapter's spots end with it)
    const at = (fo, s, a) => { const p = FORT_F.at(fo, s); return { x: p.x, z: p.z, a }; };
    switch (id) {
      case 'mira': {
        if (f.og_room) { const V = R.valves; return V ? { x: V.spawn.x + 1.6, z: V.spawn.z - 1.8, a: Math.PI * 0.75 } : undefined; }
        return R.office?.npcSpots?.mira ?? undefined;
      }
      // (Gilbert: by the door until the B-7 is on; then at its lever, his hand on it)
      case 'gilbert': return f.th_lever ? at(RISER.f + 0.5, RISER.s + 0.12, FORT.ry + Math.PI) : at(2.6, 0.3, FORT.ry);
      case 'tim': return at(2.3, 1.7, FORT.ry - 0.6);
      case 'lulu': return at(2.0, 2.6, FORT.ry - 0.9);
      // (Zoé: at home until her part; played during it; at the shelter after she has brought the B-7)
      case 'zoe': return f.th_zoeDone ? at(1.6, 0.9, FORT.ry + 0.4) : f.th_zoeGo ? null : R.house?.npcSpots?.zoe ?? undefined;
      case 'arthur': return R.house?.npcSpots?.arthur ?? undefined;
      case 'guard': {
        if (!this.zoePart()) return undefined;
        const p = this.officeAt([1.65, -3.3]);
        return p ? { ...p, a: Math.PI * 0.8 } : undefined;
      }
      case 'vesk': return null;
    }
    return undefined;
  }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.game, h = g.hero;
    h.swapBody?.('twinsen'); h.hasBall = true; h.disguised = false;
    this.ensureBranch();
    this.story.refreshCast();
    this.call();
  }
  // the call (from begin, or the first frame of a save standing in this chapter before it: the expanded campaign's
  // chapter-10 start made from a base-game save, expandedStart)
  call() {
    const g = this.game, f = this.f, away = this.onZeelich();
    f.og_started = true;
    this.chain([['miraradio', 'og_mira_call1'], ['miraradio', 'og_mira_call2'], ['hero', 'og_tw_call'], ['miraradio', 'og_mira_call3']], () => {
      g.updateObjective(); g.save(false);
      if (away) this.flyHome(); else { f.og_home = true; g.updateObjective(); }
    });
  }
  // a seen crossing (TRAVEL-1, R4): the ship's film from Zeelich Spaceport to Citadel's, then the landing there
  flyHome() {
    const g = this.game, T = g.travel, from = T?.points?.zeelich_port, to = T?.points?.citadel_port;
    const swap = () => {
      const l = to?.landing || { x: -58, z: -60, a: Math.PI };
      if (g.room) g.exitRoom(l, true);
      else { g.hero.pos.set(l.x, g.physics.groundAt(l.x, l.z), l.z); g.hero.angle = l.a ?? 0; }
      this.f.og_home = true;
      this.story.refreshCast(); g.audio.play('door'); g.updateObjective();
    };
    // (one scene change, always through the ship's film: with the films off or no Citadel port point, playJourney
    //  calls it at once with no arrival film)
    playJourney(g, { from, to, mode: 'ship' }, (then) => g.startTransition(swap, null, then));
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (this.branch) this.branchTick(dt);
    if (!this.isCur()) return;
    const free = g.state === 'play' && !g.trans;
    if (!f.og_started && free) { this.call(); return; }
    // home: on Citadel (by the story's ship, or a save that took the travel menu itself)
    if (f.og_started && !f.og_arrived && free && !this.onZeelich()) { f.og_home = f.og_arrived = true; g.updateObjective(); g.save(false); }
    this.nudge(dt, 'og_bleed', this.hammering() && !(f.og_bleed > 0), 45, 'og_nudge');
    // a save made during Zoé's part comes back as Zoé where she stood (her finds kept)
    if (this.resumeZoe && free) { this.resumeZoe = false; this.becomeZoe(); }
    // Zoé at the shelter with the B-7: back to Twinsen there
    if (this.zoePart() && f.th_b7 && free && this.asZoe() && !this.room() && !this.handing) {
      const p = FORT_F.at(1.5, 1.0), h = g.hero;
      if (Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < 5) this.backToTwinsen();
    }
    // Oren's push: once the band is right and the water runs, the lever starts to go
    if (f.th_set && !f.th_push && free && (this.pushT = (this.pushT || 0) + dt) > 1.5) {
      f.th_push = true; g.updateObjective();
      this.game.audio.play('orenTone');
      this.chain([['oren', 'th_oren_push']], () => g.updateObjective());
    }
    if (f.th_push && !f.th_lever && free && this.branch?.leverA >= 1 && !this.toldShut) { this.toldShut = true; this.chain([['gilbert', 'th_gil_shut']]); }
    if (f.th_done && free && !this.leaving) this.end();
  }

  // ---------------------------------------------------------------- moving about
  doors() {
    if (!this.isCur()) return [];
    const out = this.story.townDoors(), st = this.game.world.station;
    // (Zoé's part: the project office's door, until she has the B-7)
    if (st && this.zoePart() && !this.f.th_b7 && this.game.regions.has('projoffice')) out.push({ x: st.office.door.x, z: st.office.door.z, r: 0.9, room: 'projoffice' });
    return out;
  }
  exitTo(to) {
    if (!this.isCur()) return null;
    if (to === 'valves-out') return { room: 'office', ...this.game.rooms.office.spawn };
    return null;
  }
  onEnterRoom(id) {
    if (!this.isCur()) return;
    this.story.refreshCast();
    if (id === 'valves') this.setupValves();
    if (id === 'projoffice' && this.zoePart() && !this.f.th_met) {
      this.f.th_met = true;
      this.chain([['guard', 'th_guard_1'], ['zoe', 'th_zoe_g1'], ['guard', 'th_guard_2'], ['zoe', 'th_zoe_g2']], () => { this.game.updateObjective(); this.game.save(false); });
    }
  }
  onExitRoom() { if (this.isCur()) this.story.refreshCast(); }
  setupValves() {
    const V = this.V;
    if (!V) return;
    for (const v of V.valves) v.setOpen(false);
    this.closing = [];
    if (this.f.og_steady) this.needle = 2;
    this.showGovernor();
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const f = this.f, r = this.room();
    if (!this.isCur()) return;
    if (r === 'valves' && this.V) {
      const V = this.V, c = V.group.position;
      if (this.hammering()) for (const v of V.valves) consider(dist(v.x, v.z), 1.1, { kind: 'ogvalve', valve: v, label: 'p_valve' });
      if (f.og_steady) consider(dist(c.x + GOV.x - 0.2, c.z + GOV.z + 0.7), 1.0, { kind: 'oggov', label: 'p_governor' });
      return;
    }
    if (r === 'projoffice' && this.zoePart() && this.asZoe() && !f.th_b7) {
      const reg = this.officeAt(OFFICE.reg);
      if (reg) consider(dist(reg.x, reg.z), 1.1, { kind: 'threg', label: f.th_reg ? 'p_read' : 'p_cabinet' });
      if (f.th_reg) {
        for (const k of ['A', 'C']) { const p = this.officeAt(OFFICE[k]); if (p) consider(dist(p.x, p.z), 1.15, { kind: 'thcrate', which: k, label: 'p_look' }); }
        const b = this.officeAt(OFFICE.B);
        if (b) consider(dist(b.x, b.z), 1.15, { kind: 'thcrate', which: 'B', label: !f.th_cB ? 'p_look' : f.th_cB === 1 ? 'p_move' : 'p_open' });
      }
      return;
    }
    if (!r && this.branch && f.th_zoeDone && !f.th_lever && !this.asZoe()) {
      const fr = this.front(), wl = this.front(0.55, -0.22);
      if (!f.th_fitted || f.th_feedShut) consider(dist(wl.x, wl.z), 0.9, { kind: 'thfeed', label: 'p_valve' });
      if (!f.th_fitted) consider(dist(fr.x, fr.z), 0.95, { kind: 'thflange', label: 'p_fit' });
      else if (!f.th_feedShut && !f.th_set) consider(dist(fr.x, fr.z), 0.95, { kind: 'thband', label: 'p_dial' });
      else if (f.th_push && !this.holding) consider(dist(fr.x, fr.z), 1.0, { kind: 'thhold', label: 'p_hold' });
    }
  }
  interact(it) {
    const g = this.game, h = g.hero, f = this.f;
    switch (it.kind) {
      case 'ogvalve':
        h.act('use', 0.6, () => this.bleed(it.valve), 0.3);
        return true;
      case 'oggov':
        this.chain([['hero', 'og_gov_look']]);
        return true;
      case 'threg':
        h.act('use', 0.7, () => {
          const first = !f.th_reg;
          f.th_reg = true; g.audio.play('paper');
          this.chain(first ? [['narrator', 'th_reg'], ['zoe', 'th_zoe_reg']] : [['narrator', 'th_reg']], () => { g.updateObjective(); if (first) g.save(false); });
        }, 0.3);
        return true;
      case 'thcrate': this.crate(it.which); return true;
      case 'thfeed':
        h.act('use', 0.8, () => {
          f.th_feedShut = !f.th_feedShut; g.audio.play(f.th_feedShut ? 'valveShut' : 'valve');
          this.showBranch(); g.updateObjective();
          // (the feed opened on the B-7: its band shows at once, too much from the box)
          if (!f.th_feedShut && f.th_fitted) this.chain([['gilbert', 'th_gil_joint']], () => g.save(false));
          else g.save(false);
        }, 0.35);
        return true;
      case 'thflange':
        if (!f.th_feedShut) {   // the wrong order: the open flange sprays him back
          h.act('use', 0.5, () => {
            g.audio.play('waterRun'); g.camRig.shake(0.15);
            const J = this.jointAt(); g.particles.burst(J.x, J.y - 0.75, J.z, '#cfefff', 18, 3);
            const p = this.branch.P, a = Math.atan2(h.pos.x - p.x, h.pos.z - p.z);
            g.physics.move(h, Math.sin(a) * 0.6, Math.cos(a) * 0.6);
            this.chain([['narrator', 'th_spray'], ['hero', 'th_tw_spray']]);
          }, 0.25);
          return true;
        }
        h.act('use', 1.2, () => {
          f.th_fitted = true; f.th_band = BAND_START; g.audio.play('clunk');
          this.showBranch(); g.updateObjective(); g.save(false);
          this.chain([['narrator', 'th_fit']]);
        }, 0.6);
        return true;
      case 'thband':
        h.act('use', 0.6, () => this.turnBand(), 0.3);
        return true;
      case 'thhold':
        this.holding = true;
        h.act('use', 1.0, () => this.held(), 0.4);
        return true;
    }
    return false;
  }
  // the band knob: a notch down each turn (from 1 round to 5); the needle and the water answer in a second
  turnBand() {
    const g = this.game, f = this.f;
    f.th_band = ((f.th_band || BAND_START) + 3) % 5 + 1;   // 5→4→3→2→1→5
    g.audio.play('valve'); this.showBranch();
    const k = f.th_band;
    if (k === BAND_RIGHT) {
      f.th_set = true; this.pushT = 0;
      g.updateObjective(); g.save(false);
      this.chain([['gilbert', 'th_gil_right']]);
      return;
    }
    g.save(false);
    this.chain([['gilbert', k > BAND_RIGHT ? 'th_gil_less' : 'th_gil_trickle']]);
  }
  // a hand on the lever: Oren lets go; Gilbert takes it; Vesk on the wire; Baldino's call ends the chapter
  held() {
    const g = this.game, f = this.f;
    g.audio.play('clunk');
    this.chain([['narrator', 'th_hold'], ['oren', 'th_oren_hand'], ['gilbert', 'th_gil_mine']], () => {
      f.th_lever = true; this.holding = false;
      this.story.refreshCast({ walk: true }); g.updateObjective(); g.save(false);
      this.chain([['oren', 'th_oren_tired']], () => {
        g.audio.play('radio');
        this.chain([['veskwire', 'th_vesk_1'], ['hero', 'th_tw_v1'], ['veskwire', 'th_vesk_2'], ['zoe', 'th_zoe_v1'], ['veskwire', 'th_vesk_3']], () => {
          f.th_vesk = true; g.updateObjective(); g.save(false);
          // (EXP-2: with chapter 11 next, Baldino's call asks where the B-7 came from: the crate's return label, Ballastra,
          //  the council's freighter; else, the network next, the relays are built and he comes)
          const toBallastra = this.story.keyOf(this.story.nextIndex()) === 'ballastra';
          if (toBallastra) readyCast();   // (the Ballastra cast's models, fetched ahead)
          const lines = toBallastra
            ? [['balradio', 'th_bal_exp1'], ['hero', 'th_tw_exp1'], ['zoe', 'th_zoe_exp1'], ['narrator', 'th_label'], ['hero', 'th_tw_exp2'], ['balradio', 'th_bal_exp2'], ['zoe', 'th_zoe_end']]
            : [['balradio', 'th_bal_end1'], ['hero', 'th_tw_end'], ['zoe', 'th_zoe_end']];
          this.chain(lines, () => {
            f.th_done = true; g.save(false);
            this.end();
          });
        });
      });
    });
  }
  // the project office's crates (Zoé): 212/1, 212/2, and the stack by the door, its bottom crate turned to the wall
  crate(which) {
    const g = this.game, f = this.f, h = g.hero;
    if (which === 'A') { f.th_cA = true; this.chain([['narrator', 'th_crateA']]); return; }
    if (which === 'C') { f.th_cC = true; this.chain([['narrator', 'th_crateC']]); return; }
    if (!f.th_cB) { f.th_cB = 1; this.chain([['narrator', 'th_crateB1']]); return; }
    if (f.th_cB === 1) {
      h.act('use', 1.0, () => {
        f.th_cB = 2; g.audio.play('rummageCrate'); g.updateObjective(); g.save(false);
        this.chain([['narrator', 'th_crateB2'], ['guard', 'th_guard_3']]);
      }, 0.5);
      return;
    }
    h.act('use', 1.0, () => {
      f.th_b7 = true; g.audio.play('rummageCrate');
      this.chain([['narrator', 'th_crate_open'], ['narrator', 'th_note'], ['zoe', 'th_zoe_note1'], ['zoe', 'th_zoe_note2']], () => {
        this.story.refreshCast(); g.updateObjective(); g.save(false);
      });
    }, 0.5);
  }
  // a wheel turned: during a kick it takes the kick down the drain; between kicks it kicks back
  bleed(v) {
    const g = this.game, f = this.f, h = g.hero;
    if (!this.hammering()) return;
    if (this.inKick()) {
      f.og_bleed = Math.min(3, (f.og_bleed | 0) + 1);
      v.setOpen(true); this.closing.push({ v, t: 0.8 });
      g.audio.play('waterRun');
      g.updateObjective();
      if (f.og_bleed >= 3) { this.steady(); return; }
      g.save(false);
      this.chain([['mira', f.og_bleed === 1 ? 'og_mira_bleed1' : 'og_mira_bleed2']]);
      return;
    }
    g.audio.play('clang'); g.camRig.shake(0.12);
    const a = Math.atan2(h.pos.x - v.x, h.pos.z - v.z);
    this.shove = { x: Math.sin(a), z: Math.cos(a), t: 0.35 };   // (roomTick: about 0.7 m back over a third of a second)
    if (!this.toldEarly) { this.toldEarly = true; this.chain([['hero', 'og_tw_early']]); }
  }
  // the line is quiet enough to be held: the governor rings, Oren rises and speaks
  steady() {
    const g = this.game, f = this.f, V = this.V;
    f.og_steady = true;
    g.audio.play('orenTone');
    this.rising = 0.001; this.pres.setMode('attending');
    this.showGovernor();
    g.updateObjective();
    const wheel = V?.valves?.[3];
    this.chain([['mira', 'og_mira_s1'], ['oren', 'og_oren_1'], ['hero', 'og_tw_o1'], ['oren', 'og_oren_2'], ['hero', 'og_tw_o2'], ['oren', 'og_oren_3'], ['oren', 'og_oren_4'], ['mira', 'og_mira_s2'], ['oren', 'og_oren_5'],
      ['mira', 'og_mira_wheel'], ['oren', 'og_oren_6'], ['mira', 'og_mira_s3'], ['hero', 'og_tw_o3'], ['oren', 'og_oren_7'], ['mira', 'og_mira_plate'], ['mira', 'og_mira_s4']], () => {
      this.pres.setMode('turning');
      g.updateObjective(); g.save(false);
    }, (i, id, key) => {
      // (Mira tries wheel IV for Gilbert's washroom; it turns itself back to shut as Oren answers)
      if (key === 'og_mira_wheel' && wheel) { wheel.setOpen(true); g.audio.play('tapSqueak'); }
      if (key === 'og_oren_6' && wheel) { wheel.setOpen(false); g.audio.play('clunk'); }
    });
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id, r = this.room();
    if (!this.isCur()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'mira':
        if (r === 'office' && !f.og_room) return c([['mira', 'og_mira_office1'], ['hero', 'og_tw_office'], ['mira', 'og_mira_office2']], () => this.downstairs());
        if (r === 'valves') return c([['mira', f.og_steady ? 'og_mira_after' : 'og_mira_room2']]);
        return false;
      case 'gilbert':
        if (f.og_steady && !f.og_thanks) {
          return c([['gilbert', 'og_gil_1'], ['hero', 'og_tw_g1'], ['gilbert', 'og_gil_2'], ['tim', 'og_tim_1'], ['lulu', 'og_lulu_1'], ['gilbert', 'og_gil_3'],
            ['gilbert', 'th_gil_wash'], ['hero', 'th_tw_wash'], ['zoeradio', 'th_zoe_r1'], ['hero', 'th_tw_z1'], ['zoeradio', 'th_zoe_r2']], () => {
            f.og_thanks = true; g.save(false);
            this.startZoe();
          });
        }
        if (f.th_lever) return c([['gilbert', 'th_gil_after']]);
        if (f.th_zoeDone) return c([['gilbert', f.th_fitted ? 'th_gil_right' : 'th_gil_wash']]);
        return c([['gilbert', 'og_gil_wait']]);
      case 'tim': return c([['tim', f.th_lever ? 'th_tim_after' : 'og_tim_wait']]);
      case 'lulu': return c([['lulu', f.th_lever ? 'th_lulu_after' : 'og_lulu_wait']]);
      case 'zoe':
        if (f.th_zoeDone) return c([['zoe', f.th_lever ? 'th_zoe_after' : 'th_zoe_hand2']]);
        return c([['zoe', f.og_steady ? 'og_zoe_2' : 'og_zoe_1']]);
      case 'arthur': return c([['arthur', f.og_steady ? 'og_ar_2' : 'og_ar_1']]);
      case 'guard':
        if (this.zoePart()) return c([['guard', f.th_b7 ? 'th_guard_after' : f.th_cB === 2 ? 'th_guard_3' : 'th_guard_2']]);
        return false;
    }
    return false;
  }
  // the chapter's end: the next chapter of the campaign begins (behind a scene change, its card)
  // (on Citadel, the network's start in Baldino's workshop is on Zeelich: the ship's film across first, TRAVEL-1)
  end() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game, T = g.travel, go = (then) => g.startTransition(() => this.story.nextChapter(), this.story.nextAreas(), then);
    if (this.onZeelich() || this.story.keyOf(this.story.nextIndex()) !== 'network') { go(null); return; }
    playJourney(g, { from: T?.points?.citadel_port, to: T?.points?.zeelich_port, mode: 'ship' }, go);
  }
  // Mira takes him down from the Water Office to FunFrock's valve room (as the network does, network.js)
  downstairs() {
    const g = this.game, f = this.f;
    f.og_home = f.og_arrived = true;
    g.startTransition(() => {
      g.enterRoom('valves', null, true);
      f.og_room = true;
      this.story.refreshCast(); this.setupValves();
      this.chain([['mira', 'og_mira_room1'], ['mira', 'og_mira_room2']], () => { g.updateObjective(); g.save(false); });
    });
  }

  // ---------------------------------------------------------------- Zoé's part
  // Zoé, in the project office at the station: behind a scene change from the shelter (the relay's last line)
  startZoe() {
    const g = this.game, f = this.f, h = g.hero;
    f.th_zoeGo = true;
    this.savedBeh = h.behaviour;
    g.startTransition(() => {
      this.becomeZoe();
      g.enterRoom('projoffice', null, true);
      this.story.refreshCast();
      g.updateObjective();
    }, ['projoffice']);
  }
  becomeZoe() {
    const g = this.game, h = g.hero;
    h.swapBody('zoe'); h.hasBall = false; h.noBehaviours = true; h.behaviour = 'normal'; g.hud.behaviour('normal');
    g.hud.weapon(h); g.hud.weaponShowT = 0;
    this.story.refreshCast();
  }
  // Zoé reaches the shelter with the B-7: Twinsen again, beside the riser, and she hands it over
  backToTwinsen() {
    const g = this.game, f = this.f, h = g.hero;
    this.handing = true;
    g.startTransition(() => {
      f.th_zoeDone = true;
      h.swapBody('twinsen'); h.hasBall = true; h.noBehaviours = false; h.behaviour = this.savedBeh || 'normal'; g.hud.behaviour(h.behaviour);
      const p = FORT_F.at(1.35, 1.6), r = this.front();
      h.pos.set(p.x, g.physics.groundAt(p.x, p.z), p.z); h.angle = Math.atan2(r.x - p.x, r.z - p.z);
      this.ensureBranch();
      this.story.refreshCast();
      g.updateObjective();
    }, null, () => {
      this.handing = false;
      this.chain([['zoe', 'th_zoe_hand1'], ['hero', 'th_tw_hand'], ['zoe', 'th_zoe_hand2']], () => { g.updateObjective(); g.save(false); });
    });
  }

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f, g = this.game;
    // (a save in the valve room keeps its bleeds; once Oren holds the mains, the needles load on green)
    if (f.og_bleed > 3) f.og_bleed = 3;
    if (f.th_band != null && !(f.th_band >= 1 && f.th_band <= 5)) f.th_band = BAND_START;
    this.leaving = false; this.rising = 0; this.handing = false; this.holding = false; this.toldShut = false; this.pushT = 0;
    if (this.isCur() && f.og_steady) this.needle = 2;
    this.game.regions.whenBuilt('valves', () => this.showGovernor());
    this.ensureBranch(); this.showBranch();
    if (this.branch) this.branch.leverA = f.th_push && !f.th_lever ? 1 : 0;
    // a save made as Zoé loads with Twinsen's body: she comes back at the first frame of play
    this.resumeZoe = this.zoePart() && g.hero?.body !== 'zoe';
    // (a save from after Zoé's part, or any other state: Twinsen's own body)
    if (this.isCur() && !this.zoePart() && g.hero?.body === 'zoe') { g.hero.swapBody('twinsen'); g.hero.hasBall = true; g.hero.noBehaviours = false; }
  }
  objective() {
    const f = this.f;
    if (!f.og_started) return '';
    if (f.th_zoeGo && !f.th_zoeDone) {
      if (f.th_b7) return this.goal('th_obj_zoe_take');
      return this.goal(f.th_reg ? 'th_obj_zoe_crate' : 'th_obj_zoe_reg');
    }
    if (f.th_zoeDone) {
      if (f.th_push && !f.th_lever) return this.goal('th_obj_hold');
      return this.goal('th_obj_fit') + this.sub(!!f.th_feedShut || !!f.th_fitted, 'th_sub_feed') + this.sub(!!f.th_fitted, 'th_sub_fit') + this.sub(!!f.th_fitted && !f.th_feedShut, 'th_sub_open') + this.sub(!!f.th_set, 'th_sub_band');
    }
    if (f.og_steady) return this.goal('og_obj_gilbert');
    if (f.og_room) return this.goal('og_obj_hammer') + this.sub((f.og_bleed | 0) >= 3, 'og_sub_bleed', { n: f.og_bleed | 0 });
    if (this.onZeelich()) return this.goal('og_obj_ship');
    return this.goal('og_obj_office');
  }
  markers() {
    const f = this.f, W = this.game.world, m = [];
    if (!this.isCur() || !f.og_started || this.onZeelich()) return m;
    const shelter = () => { const p = FORT_F.at(2.0, 0); m.push({ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true, label: t('og_mk_shelter') }); };
    if (f.th_zoeGo && !f.th_zoeDone) {
      const st = W.station;
      if (!f.th_b7 && st && this.room() !== 'projoffice') m.push({ x: st.office.door.x, z: st.office.door.z, kind: 'star', color: gold, r: 7, edge: true, label: t('th_mk_projoffice') });
      else if (f.th_b7) shelter();
      return m;
    }
    if (f.th_zoeDone && !f.th_lever) { shelter(); return m; }
    if (!f.og_room) { const o = W.houses?.find((x) => x.id === 'water'); if (o) m.push({ x: o.door.x, z: o.door.z, kind: 'star', color: gold, r: 7, edge: true, label: t('og_mk_office') }); }
    else if (f.og_steady && !f.og_thanks) shelter();
    return m;
  }
  items() { const f = this.f; return this.isCur() && f.th_b7 && !f.th_fitted ? [{ id: 'b7', icon: 'part', n: 1 }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'og_j_call', done: !!f.og_started },
      { key: 'og_j_steady', done: !!f.og_steady },
      { key: 'og_j_thanks', done: !!f.og_thanks },
      { key: 'th_j_zoe', done: !!f.th_b7 },
      { key: 'th_j_fit', done: !!f.th_set },
      { key: 'th_j_hold', done: !!f.th_lever },
      { key: 'th_j_vesk', done: !!f.th_vesk },
    ].filter((l) => l.done);
  }
}
