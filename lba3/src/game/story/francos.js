// H-15 · The Francos' dig, twelve years on (docs/lba-maturity/FRANCOS.md; CONTENT-15H.md §3 wave 6; the user, 25.11:
// the relic may be our own invention and funny, in LBA's humour; nothing claimed from LBA2). Not a chapter: the director
// (index.js) asks it beside the chapter in progress, as it asks wave4.js. Its pieces in the world: src/game/francosworld.js;
// its text: text/francos.js. From chapter 4 (the islands open) to the ending.
//
// On Knartas, on the slope between the harbour and the diggers' village (the gully under the gold dome), the Francos
// still dig for their relic, the Great Waker, which the Founder buried and which woke the first shift. Every digger
// knows a piece of the rhyme and reads it wrong:
//   1. Foreman Mott (on the rock over the slope): the story; a spare spade (found). Nothing is gated on him but the spade.
//   2. Old Gubb: "Below the gold dome." He takes "below" for "under the house" and digs at its wall, up on the bank.
//      (Twinsen: or just downhill from it?) The gold dome's foot is the gully.
//   3. Pella: "Twelve steps from the Founder's Seat, the way the Founder looked." She loses count at seven: her holes
//      lie on the seat's line, short of the end. The seat (a Look) faces up the gully.
//   4. Tuffo, ear to the ground: "the Waker hums". Arthur's Pocket Set hears hums: held out, it leads to the spot within
//      12 m (story/kit2.js hums()). Without it, the two other tips meet in the gully all the same.
//   The tips come in any order; none is required (a player may dig at once). Digging (E with the spade, anywhere on the
//   slope): nothing but earth and a line (his holes stay till a load, at most five); at the spot: a tin box, the Great
//   Waker found (an alarm clock with two bells, still ticking: SELF-WINDING, and twelve years of digging shook it wound).
//   5. Tuffo shouts, the four gather at the hole. Mott (TALK; the others send him there): "smaller than in the songs";
//   wound, it rings, they jump and cheer; the finder's purse (FINDERS kashes; not a clover leaf: CLOVER-BALANCE); the
//   spade back; they set it up where it slept: a little shrine with its roof, the clock on top (the visible payoff,
//   a camera beat where beats run). After: their own lines, Gubb resting on the Founder's Seat, the shrine's Look.
//
// State (flags, new only; an old save has none: the dig is there as for a new player): fr_hook (Mott's story heard),
// fr_spade (the spare spade), fr_gubb, fr_pella, fr_tuffo (each tip heard), fr_seat (the seat looked at), fr_digs (his
// empty holes, a count), fr_found (the Great Waker dug up), fr_given (shown to Mott: the purse, the shrine),
// fr_mottAfter, fr_gubbAfter, fr_pellaAfter, fr_tuffoAfter (each after-line said once). A dig under way is not saved.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { islePhase } from '../islandlife.js';
import { ISLE_AT, SLOTS } from '../zislands.js';
import { FW, buildField, digHole, clearHoles } from '../francosworld.js';
import { revealBeat } from './revealcam.js';
import '../text/francos.js';

export const FINDERS = 25;   // the finder's purse (kashes)
const ROOM = 'isle_knartas';
const O = ISLE_AT(SLOTS.indexOf('knartas'));
const W = (x, z) => ({ x: O.x + x, z: O.z + z });
// ---------------------------------------------------------------- the layout (Knartas's own metres; measured 25.11)
// The slope south of the village: a gully runs up to the gold dome's house (the dig foreman's, knartas-22-15); the
// Founder's Seat on the slope's east side faces up the gully. The Waker lies in the gully's floor where the seat's line
// meets the ground below the dome.
export const DIG = {
  relic: [23.0, 7.4],
  seat: [28.9, 5.0],
  // Gubb's two on the ledge at the gold dome's wall (up the grass ramp west of the gully); Pella's two at "seven"
  open: [[19.4, 11.1, Math.PI], [20.6, 11.2, Math.PI / 2], [25.47, 6.4, -Math.PI / 2], [24.9, 6.63, Math.PI / 2]],
  filled: [[24.4, 9.6, 0.2], [20.8, 6.6, 1.1], [26.8, 4.4, 2.0], [16.2, 5.6, 0.7], [15.0, 4.0, 2.4], [28.2, 7.0, 0.3]],
  spades: [[18.6, 11.2, 0.3], [26.1, 5.7, -1.1]],
  // people: [x, z, facing toward x, z]
  work: { fr_mott: [19.8, 3.4, 23, 7.4], fr_gubb: [21.4, 10.9, 20.6, 11.2], fr_pella: [25.8, 7.18, 25.47, 6.4], fr_tuffo: [18.0, 5.3, 18.6, 7.4] },
  gather: { fr_mott: [24.4, 7.9], fr_gubb: [21.7, 8.2], fr_pella: [23.7, 5.9], fr_tuffo: [22.2, 6.3] },
  after: { fr_mott: [24.2, 7.0], fr_pella: [21.8, 6.6], fr_tuffo: [23.0, 5.9] },
  field: { x: 23.0, z: 7.4, r: 9.5 },
};
const RELIC = W(...DIG.relic);
const HIT_R = 1.1;          // a dig this near the Waker finds it
const REACH = 0.7;          // the spade goes in this far ahead of him
const DIG_T = 1.0;          // the dig's time ('use')
const CAST = ['fr_mott', 'fr_gubb', 'fr_pella', 'fr_tuffo'];
const CHEER_T = 2.2;       // the Waker rings: they jump and cheer this long
const DEFS = {
  fr_mott: { char: 'oku_b', tint: '#fff4e4', color: '#e0b070' },
  fr_gubb: { char: 'oku', tint: '#f4eee4', color: '#b8a888' },
  fr_pella: { char: 'nara_c', tint: '#f4fff0', color: '#9ad0a0' },
  fr_tuffo: { char: 'desertkid_b', tint: '#fff6e8', color: '#f0c878' },
};

export class Francos extends ChapterBase {
  constructor(story) { super(story); this.dig = null; this.cheerT = 0; this.beat = null; }
  get here() { return this.game.room?.id ?? 'citadel'; }
  open() { return islePhase(this.story) != null; }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  built() { return this.game.regions?.built?.(ROOM); }
  onIsle() { return this.here === ROOM && !!FW.field; }

  // ================================================================ the cast
  npcDefs() { return CAST.map((id) => ({ id, name: 'n_' + id, ...DEFS[id], x: RELIC.x, z: RELIC.z - 40, angle: 0 })); }
  place(id) {
    if (!CAST.includes(id)) return undefined;
    if (!this.open() || !FW.field) return null;   // (absent till Knartas is built: regionBuilt places them then)
    const f = this.f;
    const face = (x, z, tx, tz) => { const p = W(x, z), q = W(tx, tz); return { x: p.x, z: p.z, a: Math.atan2(q.x - p.x, q.z - p.z) }; };
    if (f.fr_given) {
      if (id === 'fr_gubb') { const S = this.seatSit(); return S ? { ...S, anim: 'sit', pin: true, track: null } : null; }
      const [x, z] = DIG.after[id];
      return { ...face(x, z, ...DIG.relic), anim: null, track: null };
    }
    if (f.fr_found) { const [x, z] = DIG.gather[id]; return { ...face(x, z, ...DIG.relic), anim: null, track: null }; }
    const [x, z, tx, tz] = DIG.work[id];
    const anim = id === 'fr_gubb' ? 'kneelWork' : id === 'fr_pella' ? 'kneelWork' : id === 'fr_tuffo' ? 'kneelLook' : null;
    return { ...face(x, z, tx, tz), anim, track: null };
  }
  // where Gubb sits on the Founder's Seat after (its right half, facing as it faces)
  seatSit() {
    const S = FW.seat; if (!S) return null;
    const rx = Math.cos(S.ry), rz = -Math.sin(S.ry);
    return { x: S.x + rx * 0.3 + Math.sin(S.ry) * 0.04, z: S.z + rz * 0.3 + Math.cos(S.ry) * 0.04, y: S.y, a: S.ry };
  }

  // ================================================================ the world
  decorate() { this.ensure(); }
  regionBuilt() { if (this.ensure()) this.story.refreshCast(); }
  ensure() {
    if (FW.field) return false;
    const R = this.built(); if (!R) return false;
    const w3 = (a) => { const p = W(a[0], a[1]); return [p.x, p.z, a[2] ?? 0]; };
    const s = W(...DIG.seat), aim = Math.atan2(RELIC.x - s.x, RELIC.z - s.z);
    buildField(this.game, R, { relic: RELIC, seat: { x: s.x, z: s.z, ry: aim }, shrineRy: aim + Math.PI, open: DIG.open.map(w3), filled: DIG.filled.map(w3), spades: DIG.spades.map(w3) });
    this.applyWorld();
    return true;
  }
  applyFlags() {
    const f = this.f;
    if (f.fr_digs != null && !(Number.isInteger(f.fr_digs) && f.fr_digs >= 0)) delete f.fr_digs;
    // (each step implies the ones before it)
    if (f.fr_given) f.fr_found = true;
    if (f.fr_found) { f.fr_spade = true; f.fr_hook = true; }
    if (f.fr_spade) f.fr_hook = true;
    this.endDig(); clearHoles(); this.cheerT = 0; this.cheerThen = null; this.endBeat();
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const f = this.f;
    FW.box?.setOn(!!f.fr_found && !f.fr_given);
    FW.shrine?.setOn(!!f.fr_given);
  }

  // ================================================================ the pocket set (story/kit2.js hums)
  hums() {
    if (this.f.fr_found || !this.open() || !FW.field) return [];
    return [{ id: 'fr_waker', room: ROOM, x: RELIC.x, y: this.game.physics.groundAt(RELIC.x, RELIC.z, 40) + 0.2, z: RELIC.z }];
  }

  // ================================================================ interaction
  // the spot the spade would go in (null: not here): on the slope, level with his feet, clear of holes, the seat, people
  digSpot() {
    const g = this.game, h = g.hero, f = this.f;
    if (!f.fr_spade || f.fr_found || !this.onIsle() || !h.onGround) return null;
    const x = h.pos.x + Math.sin(h.angle) * REACH, z = h.pos.z + Math.cos(h.angle) * REACH;
    const F = W(DIG.field.x, DIG.field.z);
    if (Math.hypot(x - F.x, z - F.z) > DIG.field.r) return null;
    const P = g.physics, y = P.groundAt(x, z, h.pos.y + 1.0);
    if (Math.abs(y - h.pos.y) > 0.6 || P.blockedAt(x, z, y, 0.25) || P.steepAt?.(x, z, y + 0.5)) return null;
    const near = (px, pz, r) => Math.hypot(px - x, pz - z) < r;
    if (DIG.open.some(([a, b]) => near(O.x + a, O.z + b, 0.8)) || FW.holes.some((o) => near(o.x, o.z, 0.8))) return null;
    if (FW.seat && near(FW.seat.x, FW.seat.z, 1.1)) return null;
    if (g.npcs.some((n) => n.present && near(n.pos.x, n.pos.z, 0.7))) return null;
    return { x, z, y };
  }
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f;
    if (!this.open() || !this.able() || !this.onIsle() || this.dig || h.actT > 0 || g.state !== 'play') return;
    const S = FW.seat;
    if (S) consider(dist(S.x, S.z), 1.7, { kind: 'fr_seat', label: 'p_look' });
    if (f.fr_given && FW.shrine) consider(dist(RELIC.x, RELIC.z), 1.6, { kind: 'fr_shrine', label: 'p_look' });
    const sp = this.digSpot();
    // (behind the people: a digger in reach and faced keeps "Talk"; the spot ahead otherwise)
    if (sp) consider(dist(sp.x, sp.z) + 0.6, 1.7, { kind: 'fr_dig', x: sp.x, z: sp.z, label: 'p_dig' });
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('fr_')) return false;
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'fr_seat': {
        const first = !f.fr_seat; f.fr_seat = true;
        return say([f.fr_given ? 'fr_seat_after' : 'fr_seat_look', ...(first && f.fr_pella && !f.fr_found ? ['fr_tw_seat'] : [])], () => g.save(false));
      }
      case 'fr_shrine': return say(['fr_shrine_look']);
      case 'fr_dig': {
        const sp = this.digSpot(); if (!sp) return true;
        h.angle = Math.atan2(sp.x - h.pos.x, sp.z - h.pos.z);
        const hit = Math.hypot(sp.x - RELIC.x, sp.z - RELIC.z) < HIT_R;
        this.dig = { t: DIG_T, hit, x: hit ? RELIC.x : sp.x, z: hit ? RELIC.z : sp.z };
        h.act('use', DIG_T, null, 0.6);
        g.audio.play('rummage');
        return true;
      }
    }
    return false;
  }
  endDig() { this.dig = null; }
  // the dig's end: a hole and a line, or the box
  digDone(D) {
    const g = this.game, f = this.f, P = g.physics;
    g.particles?.burst(D.x, P.groundAt(D.x, D.z, 40) + 0.4, D.z, '#8a6a44', 18, 2.4);
    if (!D.hit) {
      digHole(g, D.x, D.z);
      const n = (f.fr_digs = (f.fr_digs || 0) + 1);
      const set = g.hero.arms?.pocketset && g.gadgets?.tools?.held?.() !== 'pocketset' && Math.hypot(D.x - RELIC.x, D.z - RELIC.z) < 12 && f.fr_tuffo;
      this.chain([['hero', 'fr_dig_none' + (((n - 1) % 3) + 1)], ...(set && n % 3 === 2 ? [['hero', 'fr_tw_useset']] : [])], () => g.save(false));
      return;
    }
    f.fr_found = true; this.applyWorld(); g.audio.play('chest');
    this.chain([['hero', 'fr_dig_box']], () => {
      g.found('clock', 'it_fr_clock', () => {
        // (they come running: a short cut to them gathered round the hole — walking, each would stop to face him short of it)
        this.chain([['hero', 'fr_dig_clock'], ['fr_tuffo', 'fr_tuffo_found']], () => g.startTransition(() => this.story.refreshCast(), null, () => g.save(false)));
      });
    });
  }

  // ================================================================ the people (asked before the chapter's own talk)
  talkFirst(npc) {
    const id = npc?.def?.id, g = this.game, f = this.f;
    if (!CAST.includes(id) || !this.able() || this.dig || this.cheerT > 0) return false;
    const c = (lines, done) => { npc.engage?.(); this.chain(lines.map((l) => (Array.isArray(l) ? l : [id, l])), () => { npc.release?.(); done?.(); }); return true; };
    if (f.fr_given) {
      const k = id + '_after', fl = id + 'After';
      return c([f[fl] ? k + '2' : k], () => { f[fl] = true; });
    }
    if (f.fr_found) {
      if (id !== 'fr_mott') return c(['fr_x_tomott']);
      return this.handOver(npc);
    }
    switch (id) {
      case 'fr_mott':
        if (!f.fr_hook) return c(['fr_mott_0', 'fr_mott_1', 'fr_mott_2'], () => { f.fr_hook = true; this.giveSpade(); });
        if (!f.fr_spade) return c(['fr_mott_2'], () => this.giveSpade());
        return c([f.fr_gubb && f.fr_pella && f.fr_tuffo ? 'fr_mott_all' : 'fr_mott_wait']);
      case 'fr_gubb':
        if (f.fr_gubb) return c(['fr_gubb_again']);
        return c(['fr_gubb_0', 'fr_gubb_1', ['hero', 'fr_tw_gubb']], () => { f.fr_gubb = true; g.save(false); });
      case 'fr_pella':
        if (f.fr_pella) return c(['fr_pella_again']);
        return c(['fr_pella_0', 'fr_pella_1', ['hero', 'fr_tw_pella']], () => { f.fr_pella = true; g.save(false); });
      case 'fr_tuffo': {
        if (f.fr_tuffo) return c(['fr_tuffo_again']);
        const set = !!g.hero.arms?.pocketset;
        return c(['fr_tuffo_0', 'fr_tuffo_1', ['hero', set ? 'fr_tw_tuffo_set' : 'fr_tw_tuffo_noset']], () => { f.fr_tuffo = true; g.save(false); });
      }
    }
    return false;
  }
  giveSpade() {
    const g = this.game, f = this.f;
    if (f.fr_spade) { g.save(false); return; }
    f.fr_spade = true; f.fr_hook = true;
    g.found('shovel', 'it_fr_spade', () => g.save(false));
  }
  // the Waker shown to Mott: the songs, wound and ringing (they jump and cheer: a moment out of the talk, so it shows),
  // then the purse, the spade back, set up where it slept
  handOver(npc) {
    const g = this.game;
    npc.engage?.();
    this.chain([['fr_mott', 'fr_mott_see'], ['fr_gubb', 'fr_gubb_see'], ['fr_pella', 'fr_pella_see'], ['hero', 'fr_tw_wind'], ['fr_mott', 'fr_mott_wind']], () => {
      npc.release?.();
      g.audio.play('alarmBell');
      for (const n of CAST.map((k) => this.npc(k))) if (n?.present) { n.forceAnim = 'cheer'; n.listenTo = null; }
      this.cheerT = CHEER_T; this.cheerThen = () => this.handOver2();
    });
    return true;
  }
  handOver2() {
    const g = this.game, f = this.f, h = g.hero;
    this.story.refreshCast();
    this.chain([['fr_tuffo', 'fr_tuffo_ring'], ['fr_mott', 'fr_mott_thanks'], ['fr_mott', 'fr_mott_pay'], ['fr_mott', 'fr_mott_set']], () => {
      f.fr_given = true;
      h.coins += FINDERS; g.audio.play('coin'); g.hud.toast('fr_toast_kashes', { n: FINDERS }); g.hud.stats?.(h);
      g.save(false);
      // (a short cut: the shrine stands where it slept, Gubb has sat down on the seat; then the view goes to it)
      g.startTransition(() => { this.applyWorld(); this.story.refreshCast(); }, null, () => {
        g.particles?.burst(RELIC.x, (FW.shrine?.y ?? 0) + 1.4, RELIC.z, '#ffe6a0', 20, 1.6);
        this.showShrine();
      });
    });
  }
  // the payoff seen: the view goes to the shrine for a moment (a camera beat; none with ?nocine or in tests)
  showShrine() {
    const g = this.game, S = FW.shrine; if (!S) return;
    const beat = revealBeat(g, { in: 0.9 });
    if (!beat) return;
    const look = new THREE.Vector3(RELIC.x, S.y + 1.3, RELIC.z), pos = new THREE.Vector3(RELIC.x - 3.4, S.y + 3.0, RELIC.z - 4.2);
    beat.show(() => ({ pos, look, fov: 42 }));
    this.beat = { beat, t: 3.0 };
  }
  endBeat() { if (this.beat) { this.beat.beat.release(); this.beat = null; } }

  // ================================================================ each frame
  update(dt) {
    const g = this.game;
    if (this.dig) {
      const D = this.dig;
      if (!this.onIsle()) this.dig = null;
      else if ((D.t -= dt) <= 0) { this.dig = null; this.digDone(D); }
    }
    // (the cheer over: the rest of the hand-over; held while a menu or the pause is up; gone if he left Knartas — he
    //  shows it to Mott again, the whole scene again)
    if (this.cheerT > 0 && (this.cheerT -= dt) <= 0) {
      const then = this.cheerThen;
      if (then && g.state !== 'play' && this.here === ROOM) { this.cheerT = 0.1; return; }
      this.cheerT = 0; this.cheerThen = null;
      if (then && this.here === ROOM) then(); else this.story.refreshCast();
    }
    if (this.beat && (this.beat.t -= dt) <= 0) this.endBeat();
  }

  // ================================================================ the journal and the pockets
  journal() {
    const f = this.f;
    if (!f.fr_hook && !f.fr_gubb && !f.fr_pella && !f.fr_tuffo) return [];
    const L = [{ key: 'fr_j_hook', done: !!f.fr_found }];
    if (f.fr_gubb) L.push({ key: 'fr_j_gubb', done: !!f.fr_found });
    if (f.fr_pella) L.push({ key: 'fr_j_pella', done: !!f.fr_found });
    if (f.fr_tuffo) L.push({ key: 'fr_j_tuffo', done: !!f.fr_found });
    if (f.fr_spade) L.push({ key: 'fr_j_dig', done: !!f.fr_found });
    if (f.fr_found) L.push({ key: 'fr_j_give', done: !!f.fr_given });
    return [{ title: t('fr_j_title'), lines: L }];
  }
  items() {
    const f = this.f, out = [];
    if (f.fr_spade && !f.fr_given) out.push({ id: 'fr_spade', icon: 'shovel' });
    if (f.fr_found && !f.fr_given) out.push({ id: 'fr_clock', icon: 'clock' });
    return out;
  }
}
