// Chapter 10 of the expanded campaign — "Borrowed Time" (key 'throttle'). OREN-GUARDIAN increment B: OG-1 "A Steady
// Hand", the first encounter with Oren (docs/future/EXPANSION_PLAN.md Revision R1.11). BR-1…BR-4, the rest of this
// chapter, are still documents; when they are built, OG-1's entry (call()) moves to his arrival home after BR-3.
//
// After the council's vote Mira calls the council chamber over Zoé's lighthouse relay (chapter 8's link): the mains
// under Citadel are hammering, and every kick goes to FunFrock's two shelters, where the town waits. A seen spaceship
// crossing takes him home. In FunFrock's valve room the needles leap every 3.2 s with a bang; a wheel opened *while it
// kicks* bleeds the kick down the drain (opened between kicks it kicks back and pushes him off: no damage). After three
// bleeds the line is quiet enough for the Balance Works governor the project bolted to the inlet to be held (R1.4
// rule 4: a shock beyond the part's range shakes Oren's hold loose): it rings, Oren's rings rise out of it and the
// needles settle on green. Oren speaks: his name, where he is, a count of the people in the shelters by weight. Mira
// asks for a little more on wheel IV; it turns itself back ("Green holds."). At the fortress shelter Gilbert and the
// children thank him, and thank Oren aloud; the chapter ends there and chapter 11 (story/survey.js, OG-2 "The Fenced
// Square") begins at the same door with Gilbert asking for his well. (OG-2: Baldino's call, which ended this chapter in
// increment B, now ends chapter 11.)
//
// Flags (og_): og_started (the call heard), og_home (the crossing made), og_arrived (on Citadel, saved), og_room (Mira
// took him down), og_bleed 0-3, og_steady (Oren holds the mains), og_thanks (the shelter), og_done (the chapter's end;
// a save with it set — increment B's, waiting for the ship to Zeelich — goes on to chapter 11 at its first frame).
// Only the expanded campaign plays this chapter (Story.inCampaign); the governor shows only there.
import { ChapterBase } from './base.js';
import { t } from '../i18n.js';
import { buildOrenPresence, buildGovernor, GOV_TOP } from '../orenpresence.js';
import { shelterFrame } from './shelters.js';
import { playJourney } from '../travelfilm.js';
import { cyl, MAT } from '../props.js';
import * as THREE from 'three';
import '../text/oren.js';

const PERIOD = 3.2;                 // s between kicks
const AMP = [3, 2.3, 1.6, 0.9];     // the needles' leap after 0-3 bleeds (the gauges read 0..3, green at 2)
const BASE = 0.35;                  // where the needles sag between kicks (the shelters starved)
const GOV = { x: 5.15, z: -3.45 };  // the governor in the valve room's own frame (valveroom.js: the manifold's inlet end)
const FORT = { x: -50, z: -71, ry: 0.3 };   // FunFrock's fortress shelter (story/evacuation.js FORT, FORT_RY)
const FORT_F = shelterFrame(FORT.x, FORT.z, FORT.ry);
export const ZEELICH_ROOMS = new Set(['zeelich', 'workshop', 'upper', 'council', 'archive']);
const gold = '#ffcf4a';

export class Throttle extends ChapterBase {
  get V() { return this.game.regions.built('valves'); }   // (a per-frame read never builds the room)
  room() { return this.game.room?.id ?? null; }
  onZeelich() { const id = this.room(); return !!id && (ZEELICH_ROOMS.has(id) || id.startsWith('isle_')); }
  inMine() { return this.reached() && this.story.inCampaign(this.key); }
  // 0..1 through the hammer's cycle: the bang at 0, the needles high to ~0.3, a creep up from ~0.85
  phase() { return (((this.game.time || 0) % PERIOD) + PERIOD) % PERIOD / PERIOD; }
  inKick(p = this.phase()) { return p < 0.42 || p > 0.9; }
  hammering() { const f = this.f; return this.isCur() && this.room() === 'valves' && !!f.og_room && !f.og_steady; }

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
    switch (id) {
      case 'mira': {
        if (f.og_room) { const V = R.valves; return V ? { x: V.spawn.x + 1.6, z: V.spawn.z - 1.8, a: Math.PI * 0.75 } : undefined; }
        return R.office?.npcSpots?.mira ?? undefined;
      }
      case 'gilbert': { const p = FORT_F.at(2.6, 0.3); return { x: p.x, z: p.z, a: FORT.ry }; }
      case 'tim': { const p = FORT_F.at(2.3, 1.7); return { x: p.x, z: p.z, a: FORT.ry - 0.6 }; }
      case 'lulu': { const p = FORT_F.at(2.0, 2.6); return { x: p.x, z: p.z, a: FORT.ry - 0.9 }; }
      case 'zoe': return R.house?.npcSpots?.zoe ?? undefined;
      case 'arthur': return R.house?.npcSpots?.arthur ?? undefined;
      case 'vesk': return null;
    }
    return undefined;
  }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.game, h = g.hero;
    h.swapBody?.('twinsen'); h.hasBall = true; h.disguised = false;
    this.story.refreshCast();
    this.call();
  }
  // the call (from begin, or the first frame of a save standing in this chapter before it: the expanded campaign's
  // chapter-10 start, a save from batch 1 when this chapter was an empty shell)
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
    //  calls it at once with no arrival film, as the plain fade here did before; EXP-MERGE-35)
    playJourney(g, { from, to, mode: 'ship' }, (then) => g.startTransition(swap, null, then));
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.isCur()) return;
    const free = g.state === 'play' && !g.trans;
    if (!f.og_started && free) { this.call(); return; }
    // home: on Citadel (by the story's ship, or a save that took the travel menu itself)
    if (f.og_started && !f.og_arrived && free && !this.onZeelich()) { f.og_home = f.og_arrived = true; g.updateObjective(); g.save(false); }
    this.nudge(dt, 'og_bleed', this.hammering() && !(f.og_bleed > 0), 45, 'og_nudge');
    // the shelter's thanks: chapter 11 (OG-2) begins (a save made after them, from increment B, too)
    if (f.og_done && free && !this.leaving) this.end();
  }

  // ---------------------------------------------------------------- moving about
  doors() { return this.isCur() ? this.story.townDoors() : []; }
  exitTo(to) {
    if (!this.isCur()) return null;
    if (to === 'valves-out') return { room: 'office', ...this.game.rooms.office.spawn };
    return null;
  }
  onEnterRoom(id) {
    if (!this.isCur()) return;
    this.story.refreshCast();
    if (id === 'valves') this.setupValves();
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
    const f = this.f;
    if (!this.isCur() || this.room() !== 'valves' || !this.V) return;
    const V = this.V, c = V.group.position;
    if (this.hammering()) for (const v of V.valves) consider(dist(v.x, v.z), 1.1, { kind: 'ogvalve', valve: v, label: 'p_valve' });
    if (f.og_steady) consider(dist(c.x + GOV.x - 0.2, c.z + GOV.z + 0.7), 1.0, { kind: 'oggov', label: 'p_governor' });
  }
  interact(it) {
    const g = this.game, h = g.hero;
    switch (it.kind) {
      case 'ogvalve':
        h.act('use', 0.6, () => this.bleed(it.valve), 0.3);
        return true;
      case 'oggov':
        this.chain([['hero', 'og_gov_look']]);
        return true;
    }
    return false;
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
      ['mira', 'og_mira_wheel'], ['oren', 'og_oren_6'], ['mira', 'og_mira_s3'], ['hero', 'og_tw_o3'], ['oren', 'og_oren_7'], ['mira', 'og_mira_s4']], () => {
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
          return c([['gilbert', 'og_gil_1'], ['hero', 'og_tw_g1'], ['gilbert', 'og_gil_2'], ['tim', 'og_tim_1'], ['lulu', 'og_lulu_1'], ['gilbert', 'og_gil_3']], () => {
            f.og_thanks = true; f.og_done = true; g.updateObjective(); g.save(false);
            this.end();
          });
        }
        return c([['gilbert', f.og_thanks ? 'og_gil_after' : 'og_gil_wait']]);
      case 'tim': return c([['tim', f.og_thanks ? 'og_tim_after' : 'og_tim_wait']]);
      case 'lulu': return c([['lulu', f.og_thanks ? 'og_lulu_after' : 'og_lulu_wait']]);
      case 'zoe': return c([['zoe', f.og_steady ? 'og_zoe_2' : 'og_zoe_1']]);
      case 'arthur': return c([['arthur', f.og_steady ? 'og_ar_2' : 'og_ar_1']]);
    }
    return false;
  }
  // the chapter's end: chapter 11 begins (behind a scene change, its card, at the shelter's door: survey.js begin)
  end() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
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

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
    // (a save in the valve room keeps its bleeds; once Oren holds the mains, the needles load on green)
    if (f.og_bleed > 3) f.og_bleed = 3;
    this.leaving = false; this.rising = 0;
    if (this.isCur() && f.og_steady) this.needle = 2;
    this.game.regions.whenBuilt('valves', () => this.showGovernor());
  }
  objective() {
    const f = this.f;
    if (!f.og_started) return '';
    if (f.og_steady) return this.goal('og_obj_gilbert');
    if (f.og_room) return this.goal('og_obj_hammer') + this.sub((f.og_bleed | 0) >= 3, 'og_sub_bleed', { n: f.og_bleed | 0 });
    if (this.onZeelich()) return this.goal('og_obj_ship');
    return this.goal('og_obj_office');
  }
  markers() {
    const f = this.f, W = this.game.world, m = [];
    if (!this.isCur() || !f.og_started || this.onZeelich()) return m;
    if (!f.og_room) { const o = W.houses?.find((x) => x.id === 'water'); if (o) m.push({ x: o.door.x, z: o.door.z, kind: 'star', color: gold, r: 7, edge: true, label: t('og_mk_office') }); }
    else if (f.og_steady && !f.og_thanks) { const p = FORT_F.at(2.0, 0); m.push({ x: p.x, z: p.z, kind: 'star', color: gold, r: 7, edge: true, label: t('og_mk_shelter') }); }
    return m;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'og_j_call', done: !!f.og_started },
      { key: 'og_j_steady', done: !!f.og_steady },
      { key: 'og_j_thanks', done: !!f.og_thanks },
    ].filter((l) => l.done);
  }
}
