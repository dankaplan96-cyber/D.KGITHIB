// WAVE 4 (docs/lba-maturity/WAVE4.md; CONTENT-15H.md §3 H-9, H-10, H-11; cards DEPTH-PLAN.md CIT-2, ISL-2, CIT-3 and
// EXPANSION_PLAN.md OP-4). Not a chapter: the director (index.js) asks it beside the chapter in progress, as it asks
// ferry.js … liftbelow.js. Its pieces in the world are src/game/wave4world.js, its text text/wave4.js. Three side stories:
//
// H-9 · Arthur's boat against Lulu's (chapters 2–7 and the ending's free play; Citadel's garden pond and harbour)
//   1. Arthur at home (or Lulu wherever she is): Lulu's boat beats his every time. Both are at the pond after that
//      (Arthur only while Twinsen is outdoors: in the house he is at home, as every chapter has him).
//   2. At the pond the first race is watched: Lulu's boat runs straight across; Arthur's leans in every gust and turns
//      into the wind. Twinsen says so.
//   3. Lulu's boat rests on the rim: a lead lump under its hull (a keel weight). The harbour's flags (two poles at the
//      pier's root) stream inland: the wind comes off the sea, from the side of the pond's east-to-west course.
//   4. Arthur's boat (E at the pond): fit a keel weight (once Lulu's is seen), set the sail: tight, half out, all out.
//   5. The race (Lulu or Arthur): played out by the two settings. No keel: it leans and turns into the wind. Tight: it
//      goes round in circles. All out: the sail flaps and it drifts sideways. Keel and half out: Arthur wins by a nose.
//      Every loss costs nothing; the settings stay. Lulu pays her bet (10 kashes) and gives away her secret.
//   6. The ending (after the win): Arthur at the pier with a lamp on the masthead; the boat out on the basin blinks a
//      signal; Twinsen says it back (a choice of three). Right: it turns and comes home; Arthur's clover leaf.
// H-10 · The letters filed as cargo (hooked in chapters 4–9; it can be finished later)
//   1. Tellem at the hostel: he writes home every week, nothing arrives. 2. Officer Odile at customs: a sack filed as
//   CARGO, UNDECLARED. Letters are correspondence: her form, one choice (deliver to). The sack's top letter and Tellem
//   both say Knartas. Wrong: her line, again. 3. The sack to Mila on Knartas (by spaceship and shuttle): a clover leaf and
//   15 kashes; her letter for Tellem (optional, a second trip). Tem, Tellem: lines after.
// H-11 · Raph's guitar (chapter 4 on)
//   1. Old Fenn in the tavern, or the postcard behind the bar itself: Raph kept the lighthouse, plays on Otringal now.
//   2. His guitar case in Tralu's cave (it was a look before): taken. 3. Otringal: Sim the barkeep (he plays outside by
//   the door; the stage is Lys's, WAVE6). Raph on a crate by the bar's door with a borrowed Esmer harp. The case: his
//   guitar again, 20 kashes from his tip jar, a word with Madam Orla (the Knartas lens at 8). 4. The ending: Raph plays
//   by Citadel's lighthouse door.
//
// State (flags, new only; an old save has none: nothing is made up, each story is there as for a new player):
//   w4b_hook (1), w4b_seen, w4b_keelSeen, w4b_wind, w4b_keel, w4b_sail ('tight'|'half'|'free'), w4b_tries, w4b_won,
//   w4b_arAfter, w4b_luAfter, w4b_lampHeard, w4b_lamp, w4b_lampTries, w4b_lampSaid;
//   w4l_ask, w4l_heard (Odile's explanation), w4l_wrong, w4l_sack, w4l_given, w4l_reply, w4l_replyGiven, w4l_telSent,
//   w4l_telAfter, w4l_milaAfter, w4l_temAfter, w4l_odAfter;
//   w4r_fenn, w4r_card, w4r_case, w4r_sim, w4r_met, w4r_found.
//   A race or a signal under way is not saved: a load stands the boats at rest.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { CLOVER_FULL_KASHES } from '../actors.js';
import { islePhase } from '../islandlife.js';
import { W4, buildPondBoats, buildHarbourBits, buildPostcard, buildRaphSeat } from '../wave4world.js';
import { TAVERN_PLAN } from '../tavern.js';
import { otrBarDoors } from '../otrbar.js';
import '../text/wave4.js';

export const BOAT_KEYS = ['project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'home'];
export const LETTER_HOOK = ['dig', 'steam', 'pass', 'observatory', 'evacuation', 'council'];
export const PAY = { lulu: 10, mila: 15, raph: 20 };   // (Mila's and Arthur's leaf at the cap: the one clover rule, actors.js)
export const RACE = { lulu: 0.42, win: 0.47, len: 2.2, hold: 1.4 };
// the ending's signals: L long, S short (s on); the gaps between
export const LAMP = { L: 0.95, S: 0.3, gap: 0.4, rest: 1.3, reps: 2, pats: ['LSS', 'SLS', 'SSL'] };
// where Arthur and his boat stand for the signals: on the pier's west arm, the boat out on the basin south of it
export const PIER = { x: -122.0, z: 43.1, a: Math.PI, boat: { x: -122.0, z: 37.2 } };
// Raph's seats: beside Otringal's bar door (from the door, along the house's front and out), and by the lighthouse
export const RAPH_OTR = { dx: -2.6, dz: 1.5, a: 0.75 };
export const RAPH_HOME = { x: -105.2, z: 92.6, a: -2.4 };
const COLORS = { w4_raph: '#e8c890' };

export class Wave4 extends ChapterBase {
  constructor(story) { super(story); this.race = null; this.lamp = null; this._room = undefined; }
  get ck() { return this.story.cur?.key; }
  boatOpen() { return BOAT_KEYS.includes(this.ck); }
  boatActive() { const f = this.f; return this.boatOpen() && !!f.w4b_hook && !f.w4b_won; }
  lampOpen() { const f = this.f; return this.ck === 'home' && !!f.w4b_won && !f.w4b_lamp; }
  isleOpen() { return islePhase(this.story) != null; }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  here() { return this.game.room?.id || 'citadel'; }
  built(id) { return this.game.regions?.built?.(id); }
  busy() { return !!(this.race || this.lamp); }
  pending(id) { return !!this.story.cur?.pendingTalk?.(id); }

  // ================================================================ the cast
  npcDefs() { return [{ id: 'w4_raph', name: 'n_w4_raph', char: 'keeper_b', tint: '#fff2e0', color: COLORS.w4_raph, x: 0, z: -40, angle: 0 }]; }
  // asked before the chapters (index.js refreshCast): Arthur and Lulu at the pond while the race is on, Arthur at the pier
  // for the ending's signals. Arthur only while Twinsen is outdoors on Citadel (indoors he is at home, as the chapter has
  // him: the house's own scenes never miss him).
  placeFirst(id) {
    if (id !== 'arthur' && id !== 'lulu') return undefined;
    if (this.pending(id)) return undefined;
    const P = W4.pond; if (!P) return undefined;
    const out = this.here() === 'citadel';
    if (this.boatActive()) {
      if (id === 'arthur' && !out) return undefined;
      const s = this.spots()[id];
      return { x: s.x, z: s.z, a: s.a, anim: null, track: null };
    }
    if (id === 'arthur' && this.lampOpen() && out) return { x: PIER.x, z: PIER.z, a: PIER.a, anim: null, track: null };
    return undefined;
  }
  spots() {
    const P = W4.pond, at = (dx, dz) => ({ x: P.x + dx, z: P.z + dz, a: Math.atan2(-dx, -dz) });
    return { arthur: at(0.75, -2.15), lulu: at(-1.05, -2.0) };
  }
  place(id) {
    if (id !== 'w4_raph') return undefined;
    const f = this.f;
    if (!this.isleOpen()) return null;
    if (this.ck === 'home' && f.w4r_found) {
      const S = this.raphHome(); if (!S) return null;
      return { x: S.sit.x, y: S.y, z: S.sit.z, a: S.a, anim: 'sit', pin: true, track: null };
    }
    const S = this.raphOtr(); if (!S) return null;
    return { x: S.sit.x, y: S.y, z: S.sit.z, a: S.a, anim: 'sit', pin: true, track: null };
  }

  // ================================================================ the world
  decorate() { this.ensure(); this.applyWorld(); }
  regionBuilt(ids) { this.ensure(ids); this.applyWorld(); }
  ensure() {
    const g = this.game;
    if (!W4.boats && g.world?.life?.pond) buildPondBoats(g);
    if (!W4.flags && g.world?.root) buildHarbourBits(g);
    const T = this.built('tavern'); if (T && !W4.card) buildPostcard(T, TAVERN_PLAN);
    this.raphOtr(); if (this.ck === 'home') this.raphHome();
  }
  raphOtr() {
    if (W4.seats.otr) return W4.seats.otr;
    const R = this.built('isle_otringal'); const d = R && otrBarDoors()?.[0]; if (!d) return null;
    const x = d.x + RAPH_OTR.dx, z = d.z + RAPH_OTR.dz, y = this.game.physics.groundAt(x, z, 60);
    return buildRaphSeat(R.group, 'otr', x, z, y, RAPH_OTR.a, this.game.physics);
  }
  raphHome() {
    if (W4.seats.home) return W4.seats.home;
    const W = this.game.world; if (!W?.root) return null;
    const { x, z, a } = RAPH_HOME, y = this.game.physics.groundAt(x, z, 20);
    return buildRaphSeat(W.root, 'home', x, z, y, a, this.game.physics);
  }
  applyFlags() {
    const f = this.f;
    if (f.w4b_sail && !['tight', 'half', 'free'].includes(f.w4b_sail)) delete f.w4b_sail;
    for (const k of ['w4b_tries', 'w4b_lampTries', 'w4l_wrong']) if (f[k] != null && !(Number.isInteger(f[k]) && f[k] >= 0)) delete f[k];
    // (each step implies the ones before it)
    if (f.w4b_won) { f.w4b_keel = true; f.w4b_sail = 'half'; }
    if (f.w4b_keel) f.w4b_keelSeen = true;
    if (f.w4b_keelSeen || f.w4b_won) f.w4b_seen = true;
    if (f.w4b_seen) f.w4b_hook = 1;
    if (f.w4l_given) f.w4l_sack = true;
    if (f.w4l_sack) f.w4l_ask = true;
    if (f.w4r_found) f.w4r_case = true;
    if (f.w4r_case) f.w4r_card = true;
    this.endRace(true); this.endLamp(true);
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const f = this.f, B = W4.boats, P = W4.pond;
    if (B && P && !this.race && !this.lamp) {
      const A = B.arthur, L = B.lulu;
      // Arthur's boat: on the basin for the ending's signals (after the win), else on the pond where the toy boat was
      if (this.ck === 'home' && f.w4b_won) { A.setAt(PIER.boat.x, 0.03, f.w4b_lamp ? PIER.z - 1.6 : PIER.boat.z, f.w4b_lamp ? -Math.PI / 2 : Math.PI / 2); A.setMast(true); A.setLamp(false); }   // (after the signals: moored by the pier)
      else { A.setAt(P.x + 0.7, P.y, P.z - 0.55, Math.PI + 0.25); A.setMast(false); A.setLamp(false); }
      A.setKeel(!!f.w4b_keel); A.setSail(this.sailAngle(f.w4b_sail)); A.visible(true);
      // Lulu's boat: on the rim beside her while the race is on (the weight under it shows), else she has it with her
      const on = this.boatActive();
      L.visible(on);
      if (on) { const a = Math.atan2(-0.62, -1.46); L.setAt(P.x - 0.62, P.rimY + 0.115, P.z - 1.46, a + Math.PI / 2, 0, 0); L.setSail(0.5); }
    }
    W4.sack?.setOn(!f.w4l_sack);
    const C = this.built('tralucave')?.cache; C?.setCase?.(!f.w4r_case);
    const so = W4.seats.otr, sh = W4.seats.home, home = this.ck === 'home' && f.w4r_found;
    so?.setOn(this.isleOpen() && !home); so?.set(f.w4r_found ? 'guitar' : 'harp');
    sh?.setOn(home); sh?.set('guitar');
  }
  sailAngle(s) { return s === 'tight' ? 0.12 : s === 'half' ? 0.75 : s === 'free' ? 1.35 : 0.45; }
  onEnterRoom(id) { this.refreshIf(id); }
  onExitRoom() { this.refreshIf(this.here()); }
  // (Arthur at the pond or the pier only while Twinsen is outdoors on Citadel: placed again on every way in and out)
  refreshIf(id) {
    const out = (id || 'citadel') === 'citadel';
    if (this._room === out) return;
    this._room = out;
    if (this.boatActive() || this.lampOpen()) this.story.refreshCast();
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here();
    if (!this.able() || this.busy() || h.actT > 0 || g.state !== 'play') return;
    if (here === 'citadel') {
      const P = W4.pond, B = W4.boats;
      if (P && B && this.boatActive()) {
        const A = B.arthur.pos, L = B.lulu.pos;
        consider(dist(A.x, A.z), 1.7, { kind: 'w4b_aboat', x: A.x, z: A.z, label: f.w4b_seen ? 'p_w4_fix' : 'p_look' });
        consider(dist(L.x, L.z), 1.35, { kind: 'w4b_lboat', x: L.x, z: L.z, label: 'p_look' });
      }
      for (const p of W4.flags || []) consider(dist(p.x, p.z), 1.4, { kind: 'w4b_flag', x: p.x, z: p.z, label: 'p_look' });
      if (W4.sack && !f.w4l_sack && this.isleOpen()) consider(dist(W4.sack.x, W4.sack.z), 1.2, { kind: 'w4l_sack', x: W4.sack.x, z: W4.sack.z, label: 'p_look' });
      return;
    }
    if (here === 'tavern' && W4.card && this.isleOpen()) { const c = W4.card; consider(dist(c.x, c.z), 1.1, { kind: 'w4r_card', x: c.x, z: c.z, label: 'p_read' }); return; }
    if (here === 'tralucave' && (f.w4r_card || f.w4r_fenn) && !f.w4r_case) {
      const C = g.room?.cache?.case; if (C) consider(dist(C.x, C.z), 1.2, { kind: 'w4r_case', x: C.x, z: C.z, label: 'p_w4_take' });
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !/^w4[blr]_/.test(it.kind)) return false;
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'w4b_lboat':
        if (!f.w4b_seen) return say(['w4b_lboat_0']);
        f.w4b_keelSeen = true; g.audio.play('paper');
        return say(['w4b_lboat_1'], () => g.save(false));
      case 'w4b_aboat':
        if (!f.w4b_seen) return say(['w4b_aboat_0']);
        return this.fixMenu();
      case 'w4b_flag': {
        const active = this.boatActive() || (this.boatOpen() && f.w4b_hook);
        const again = !!f.w4b_wind;
        if (active) f.w4b_wind = true;
        return say([again ? 'w4b_flag_again' : 'w4b_flag_look', ...(active && f.w4b_seen && !f.w4b_won ? ['w4b_tw_course'] : [])], () => { if (active) g.save(false); });
      }
      case 'w4l_sack': return say([f.w4l_ask ? 'w4l_sack_look' : 'w4l_sack_none']);
      case 'w4r_card': {
        const first = !f.w4r_card;
        f.w4r_card = true; g.audio.play('paper');
        return say(first ? ['w4r_card', 'w4r_tw_card'] : ['w4r_card_again'], () => g.save(false));
      }
      case 'w4r_case':
        h.act?.('pickup', 0.6, null, 0.3);
        f.w4r_case = true; g.room?.cache?.setCase?.(false); g.audio.play('rummageCase');
        g.found('parcel', 'it_w4r_case', () => this.chain([['hero', 'w4r_take']], () => g.save(false)));
        return true;
    }
    return false;
  }
  // Arthur's boat: the keel (once Lulu's is seen) and the sail's three settings
  fixMenu() {
    const g = this.game, f = this.f, h = g.hero;
    const items = [];
    if (!f.w4b_keel) items.push({ key: 'w4b_m_keel', id: 'keel' });
    for (const s of ['tight', 'half', 'free']) items.push({ key: 'w4b_m_' + s, id: s, disabled: f.w4b_sail === s });
    items.push({ key: 'w4b_m_leave', id: 'leave' });
    g.openMenu('w4b_m_fix', items, (o) => {
      if (o.id === 'leave') return;
      if (o.id === 'keel') {
        if (!f.w4b_keelSeen) { this.chain([['hero', 'w4b_tw_why']]); return; }
        f.w4b_keel = true; W4.boats.arthur.setKeel(true);
        h.act?.('kneelWork', 1.0, null, 0.5); g.audio.play('rattle');
        const ar = this.speaker('arthur'), near = ar?.present && ar.distTo(h) < 6;
        this.chain([['hero', 'w4b_tw_keel'], ...(near ? [['arthur', 'w4b_ar_keel']] : [])], () => g.save(false));
        return;
      }
      f.w4b_sail = o.id; W4.boats.arthur.setSail(this.sailAngle(o.id)); g.audio.play('tSlack');
      this.chain([['hero', 'w4b_tw_set_' + o.id], ...(f.w4b_wind ? [] : [['hero', 'w4b_tw_noflags']])], () => g.save(false));
    });
    return true;
  }

  // ================================================================ the people (asked before the chapter's own talk)
  talkFirst(npc) {
    const id = npc?.def?.id, g = this.game, f = this.f;
    if (!id || !this.able() || this.busy()) return false;
    const c = (lines, done) => { npc.engage?.(); this.chain(lines.map((l) => (Array.isArray(l) ? l : [id, l])), () => { npc.release?.(); done?.(); }); return true; };
    const out = this.here() === 'citadel';
    switch (id) {
      // ---- H-9
      case 'arthur': {
        if (this.pending('arthur')) return false;
        if (this.lampOpen() && out) return this.lampTalk(npc, c);
        if (this.ck === 'home' && f.w4b_lamp && !f.w4b_lampSaid) return c(['w4b_ar_lampdone'], () => { f.w4b_lampSaid = true; });
        if (!this.boatOpen()) return false;
        if (!f.w4b_hook) {
          // (not over another story's business with him: the pocket set, the pliers)
          if ((this.story.kit2?.setReady && !g.hero.arms?.pocketset) || (f.l_needPliers && !f.l_pliers && !f.l_arPliers)) return false;
          return c(['w4b_ar_hook1', 'w4b_ar_hook2'], () => { f.w4b_hook = 1; g.save(false); this.story.refreshCast({ walk: true }); this.applyWorld(); });
        }
        if (f.w4b_won) { if (f.w4b_arAfter || out) return false; return c(['w4b_ar_after'], () => { f.w4b_arAfter = true; }); }
        if (!out) return c([f.w4b_seen ? 'w4b_ar_home' : 'w4b_ar_wait']);
        return this.pondTalk(npc, c);
      }
      case 'lulu': {
        if (this.pending('lulu') || !this.boatOpen()) return false;
        if (!f.w4b_hook) return c(['w4b_lu_hook'], () => { f.w4b_hook = 1; g.save(false); this.story.refreshCast({ walk: true }); this.applyWorld(); });
        if (f.w4b_won) { if (f.w4b_luAfter) return false; return c(['w4b_lu_after'], () => { f.w4b_luAfter = true; }); }
        return this.pondTalk(npc, c);
      }
      // ---- H-10
      case 'hs_worker2': return this.tellem(npc, c);
      case 'odile': return this.odile(npc, c);
      case 'kn_mother': case 'il_mila': return this.mila(npc, c);
      case 'kn_kid':
        if (!f.w4l_given || f.w4l_temAfter) return false;
        f.w4l_temAfter = true;   // (before the line: said once, then his own lines again; a remark over his head would never call back)
        return c(['w4l_tem_after']);
      // ---- H-11
      case 'fenn':
        if (!this.isleOpen() || f.w4r_fenn || f.w4r_case) return false;
        return c(['w4r_fenn'], () => { f.w4r_fenn = true; g.save(false); });
      case 'ot_keep':
        if (!(f.w4r_card || f.w4r_fenn) || f.w4r_found || f.w4r_sim) return false;
        return c(['w4r_sim'], () => { f.w4r_sim = true; g.save(false); });
      case 'w4_raph': return this.raph(npc, c);
    }
    return false;
  }
  // at the pond: the first race watched; after it, a race when asked
  pondTalk(npc, c) {
    const f = this.f, g = this.game;
    if (!f.w4b_seen) { npc.engage?.(); this.chain([['lulu', 'w4b_lu_go']], () => { npc.release?.(); this.startRace(true); }); return true; }
    g.openMenu('w4b_m_race', [{ key: 'w4b_m_yes', id: 'yes' }, { key: 'w4b_m_no', id: 'no' }], (o) => {
      if (o.id !== 'yes') return;
      this.chain([['lulu', 'w4b_lu_again'], ['lulu', 'w4b_lu_go']], () => this.startRace(false));
    });
    return true;
  }
  tellem(npc, c) {
    const f = this.f, g = this.game;
    if (!this.isleOpen()) return false;
    if (!f.w4l_ask) {
      if (!LETTER_HOOK.includes(this.ck)) return false;
      return c(['w4l_tel_1', 'w4l_tel_2'], () => { f.w4l_ask = true; g.save(false); });
    }
    if (f.w4l_reply && !f.w4l_replyGiven) {
      return c(['w4l_tel_reply'], () => { f.w4l_replyGiven = true; f.w4l_telSent = true; g.audio.play('paper'); g.save(false); });
    }
    if (f.w4l_given && !f.w4l_telSent) return c(['w4l_tel_sent'], () => { f.w4l_telSent = true; g.save(false); });
    if (!f.w4l_given) return c(['w4l_tel_wait']);
    if (!f.w4l_telAfter && f.w4l_replyGiven) return c(['w4l_tel_after'], () => { f.w4l_telAfter = true; });
    return false;
  }
  odile(npc, c) {
    const f = this.f, g = this.game, L = this.story.life;
    if (f.w4l_given && !f.w4l_odAfter && !(L?.open && !f.l_cleared)) return c(['w4l_od_after'], () => { f.w4l_odAfter = true; });
    if (!this.isleOpen() || !f.w4l_ask || f.w4l_sack) return false;
    const letters = () => c(f.w4l_heard ? ['w4l_od_sack2'] : ['w4l_od_sack1', 'w4l_od_sack2'], () => { f.w4l_heard = true; g.save(false); this.formMenu(); });
    // (her own crate, the Mislabelled Shipment, still open: she asks which)
    const crate = L?.open && !f.l_cleared;
    if (!crate) return letters();
    g.openMenu('w4l_od_menu', [{ key: 'w4l_m_crate', id: 'crate' }, { key: 'w4l_m_letters', id: 'letters' }], (o) => {
      if (o.id === 'crate') this.story.talkRest(npc); else letters();
    });
    return true;
  }
  formMenu() {
    const g = this.game, f = this.f;
    g.openMenu('w4l_m_form', [{ key: 'w4l_m_kn', id: 'kn' }, { key: 'w4l_m_zee', id: 'zee' }, { key: 'w4l_m_otr', id: 'otr' }, { key: 'w4l_m_later', id: 'later' }], (o) => {
      if (o.id === 'later') return;
      g.audio.play('put');
      if (o.id !== 'kn') { f.w4l_wrong = (f.w4l_wrong || 0) + 1; this.chain([['odile', 'w4l_od_wrong']], () => g.save(false)); return; }
      this.chain([['odile', 'w4l_od_right']], () => { f.w4l_sack = true; W4.sack?.setOn(false); g.found('parcel', 'it_w4l_sack', () => g.save(false)); });
    });
  }
  mila(npc, c) {
    const f = this.f, g = this.game, h = g.hero;
    if (f.w4l_sack && !f.w4l_given) {
      return c(['w4l_mila_give', 'w4l_mila_give2', 'w4l_mila_gift'], () => {
        f.w4l_given = true; f.w4l_reply = true;
        // (CLOVER-BALANCE option A, the user's pick 25.11: no leaf, her kashes and the leaf's worth: 15 + 10)
        const n = PAY.mila + CLOVER_FULL_KASHES;
        h.coins += n;
        g.audio.play('coin'); g.hud.toast('w4l_toast_kashes', { n }); g.hud.stats?.(h);
        g.found('leaflet', 'it_w4l_reply', () => g.save(false));
      });
    }
    if (f.w4l_given && !f.w4l_milaAfter) return c(['w4l_mila_after'], () => { f.w4l_milaAfter = true; });
    return false;
  }
  raph(npc, c) {
    const f = this.f, g = this.game, h = g.hero;
    if (this.ck === 'home' && f.w4r_found) return c(['w4r_raph_home']);
    if (f.w4r_found) return c(['w4r_raph_after']);
    if (f.w4r_case) {
      return c(['w4r_raph_case', 'w4r_raph_case2'], () => {
        f.w4r_found = true; f.w4r_met = true;
        h.coins += PAY.raph; g.audio.play('coin'); g.hud.toast('w4r_toast_kashes', { n: PAY.raph }); g.hud.stats?.(h);
        this.applyWorld(); g.save(false);
      });
    }
    return c(f.w4r_met ? ['w4r_raph_0'] : ['w4r_raph_0', 'w4r_raph_1'], () => { f.w4r_met = true; g.save(false); });
  }

  // ================================================================ the race on the pond
  // first: the race watched (Arthur's boat as it was). Its result follows the keel and the sail.
  startRace(first) {
    const g = this.game, f = this.f, P = W4.pond, B = W4.boats, h = g.hero;
    if (!P || !B || g.state !== 'play') return;
    const kind = first || !f.w4b_keel ? 'heel' : f.w4b_sail === 'half' ? 'win' : f.w4b_sail === 'tight' ? 'circle' : f.w4b_sail === 'free' ? 'drift' : 'heel';
    const x0 = P.x + RACE.len / 2, zA = P.z + 0.33, zL = P.z - 0.33;
    this.race = { first, kind, t: 0, end: null, A: { x: x0, z: zA, yaw: Math.PI, v: 0 }, L: { x: x0, z: zL, done: false } };
    B.lulu.visible(true); B.lulu.setSail(0.75); B.arthur.setSail(first ? 0.45 : this.sailAngle(f.w4b_sail));
    h.vel?.set(0, 0);
    g.setState('cutscene');
    g.cutscene = (dt) => this.raceStep(dt);
    const pos = new THREE.Vector3(P.x + 1.0, P.y + 2.3, P.z + 3.3), look = new THREE.Vector3(P.x - 0.1, P.y + 0.1, P.z - 0.5);
    g.camRig.override = { pos, look }; g.camera.position.copy(pos); g.camRig.look?.copy?.(look); g.camera.lookAt(look);
    g.audio.play('ballSplash');
    this.raceStep(0);
  }
  raceStep(dt) {
    const R = this.race, g = this.game, P = W4.pond, B = W4.boats; if (!R) return;
    R.t += dt;
    const t = R.t, fin = P.x - RACE.len / 2, gust = Math.max(0, Math.sin(t * 2.3)) * (0.6 + 0.4 * Math.sin(t * 0.7));
    // Lulu's: straight across, upright
    if (!R.L.done) { R.L.x -= RACE.lulu * dt; if (R.L.x <= fin) { R.L.x = fin; R.L.done = true; R.L.at = t; } }
    B.lulu.setAt(R.L.x, P.y, R.L.z, Math.PI, 0.06 + gust * 0.04, 0);
    // Arthur's: by its settings
    const A = R.A;
    let heel = 0.05, flap = 0;
    if (R.kind === 'win') { A.x -= RACE.win * dt; heel = 0.08 + gust * 0.05; if (A.x <= fin) { A.x = fin; A.done ??= t; } }
    else if (R.kind === 'heel') {
      const k = Math.min(1, t / 2.6);
      A.yaw = Math.PI - (Math.PI / 2) * k * k;   // (turns into the wind: toward the sea, −z)
      const v = 0.32 * (1 - k) + 0.03;
      A.x += Math.cos(A.yaw) * v * dt; A.z -= Math.sin(A.yaw) * v * dt;
      heel = 0.25 + gust * 0.45; flap = k > 0.8 ? 0.25 : 0;
    } else if (R.kind === 'circle') {
      if (t > 0.7) A.yaw -= 1.5 * dt;
      A.x += Math.cos(A.yaw) * 0.26 * dt; A.z -= Math.sin(A.yaw) * 0.26 * dt; heel = 0.1;
    } else if (R.kind === 'drift') {
      A.x -= 0.06 * dt; A.z += 0.2 * dt; A.yaw = Math.PI + Math.min(0.9, t * 0.3); flap = 0.35; heel = 0.04;
    }
    // (kept on the water: inside the pond's rim)
    const dx = A.x - P.x, dz = A.z - P.z, d = Math.hypot(dx, dz), rmax = P.r - 0.3;
    if (d > rmax) { A.x = P.x + dx / d * rmax; A.z = P.z + dz / d * rmax; }
    B.arthur.setAt(A.x, P.y, A.z, A.yaw, heel, 0);
    if (flap) B.arthur.flap(t, flap); else B.arthur.setSail(B.arthur.sail);
    // the end: the winner in, a moment to see it
    const over = R.kind === 'win' ? A.done != null : R.L.done;
    if (over && R.end == null) { R.end = t + RACE.hold; g.audio.play(R.kind === 'win' ? 'victory' : 'ballSplash'); }
    if (R.end != null && t >= R.end) this.raceOver();
  }
  raceOver() {
    const R = this.race, g = this.game, f = this.f, h = g.hero;
    this.endRace(false);
    if (R.first) {
      f.w4b_seen = true;
      this.chain([['arthur', 'w4b_ar_lose'], ['hero', 'w4b_tw_seen'], ['lulu', 'w4b_lu_best']], () => { this.applyWorld(); g.save(false); });
      return;
    }
    f.w4b_tries = (f.w4b_tries || 0) + 1;
    if (R.kind !== 'win') {
      const lines = R.kind === 'heel' ? [['arthur', 'w4b_ar_heel'], ['hero', f.w4b_keelSeen ? 'w4b_tw_heel' : 'w4b_tw_why']] : R.kind === 'circle' ? [['arthur', 'w4b_ar_circle'], ['hero', 'w4b_tw_circle']] : [['arthur', 'w4b_ar_drift'], ['hero', 'w4b_tw_drift']];
      this.chain(lines, () => { this.applyWorld(); g.save(false); });
      return;
    }
    this.chain([['arthur', 'w4b_ar_win'], ['lulu', 'w4b_lu_lose']], () => {
      f.w4b_won = true; f.w4b_wind = true;
      h.coins += PAY.lulu; g.audio.play('coin'); g.hud.toast('w4b_toast_kashes', { n: PAY.lulu }); g.hud.stats?.(h);
      this.story.refreshCast(); this.applyWorld(); g.save(false);
    });
  }
  endRace(silent) {
    const g = this.game;
    if (!this.race) return;
    this.race = null;
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.camRig.override = null; g.camRig.snap?.();
    if (!silent) g.input.clearEdges?.();
  }

  // ================================================================ the ending: signals by lamp on the basin
  lampTalk(npc, c) {
    const f = this.f;
    if (!f.w4b_lampHeard) return c(['w4b_ar_lamp0', 'w4b_ar_lamp1'], () => { f.w4b_lampHeard = true; this.startLamp(); });
    return c(['w4b_ar_lampwait'], () => this.startLamp());
  }
  startLamp(pat) {
    const g = this.game, B = W4.boats; if (!B || g.state !== 'play') return;
    const p = pat || LAMP.pats[Math.floor(Math.random() * LAMP.pats.length)];
    this.lamp = { pat: p, t: 0, ph: 'watch', seq: this.lampSeq(p) };
    g.setState('cutscene'); g.cutscene = (dt) => this.lampStep(dt);
    const b = PIER.boat, pos = new THREE.Vector3(b.x - 1.5, 2.0, b.z - 5.0), look = new THREE.Vector3(b.x, 0.5, b.z + 3.0);   // (from over the basin: the boat near, Arthur on the pier behind it)
    g.camRig.override = { pos, look }; g.camera.position.copy(pos); g.camRig.look?.copy?.(look); g.camera.lookAt(look);
    this.lampStep(0);
  }
  // on/off times of a pattern, repeated LAMP.reps times: [[t0, t1], …] and its length
  lampSeq(p) {
    const on = []; let t = 0.6;
    for (let r = 0; r < LAMP.reps; r++) { for (const ch of p) { const d = ch === 'L' ? LAMP.L : LAMP.S; on.push([t, t + d]); t += d + LAMP.gap; } t += LAMP.rest; }
    return { on, len: t };
  }
  lampStep(dt) {
    const Lm = this.lamp, g = this.game, A = W4.boats.arthur; if (!Lm) return;
    Lm.t += dt;
    const bob = Math.sin(Lm.t * 1.7) * 0.012;
    if (Lm.ph === 'watch') {
      A.setAt(PIER.boat.x, 0.03 + bob, PIER.boat.z, Math.PI / 2, Math.sin(Lm.t * 1.3) * 0.04);
      A.setLamp(Lm.seq.on.some(([a, b]) => Lm.t >= a && Lm.t < b));
      if (Lm.t >= Lm.seq.len) { A.setLamp(false); this.lampMenu(); }
    } else if (Lm.ph === 'no') {
      A.setLamp(Math.floor(Lm.t / 0.1) % 2 === 0);
      if (Lm.t >= 1.4) { A.setLamp(false); this.endLamp(false); this.chain([['arthur', 'w4b_ar_lampno']], () => this.startLamp(Lm.pat)); }
    } else if (Lm.ph === 'home') {
      // it turns and sails in to the pier
      const k = Math.min(1, Lm.t / 3.2), z = PIER.boat.z + (PIER.z - 1.6 - PIER.boat.z) * k;
      A.setAt(PIER.boat.x, 0.03 + bob, z, Math.PI / 2 - Math.PI * Math.min(1, Lm.t / 0.8), 0.06);
      A.setLamp(Math.floor(Lm.t / 0.5) % 2 === 0);
      if (k >= 1) this.lampDone();
    }
  }
  lampMenu() {
    const g = this.game, Lm = this.lamp;
    // (the menu over the stopped scene: back to play for it, the camera kept on the boat)
    Lm.ph = 'menu';
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.openMenu('w4b_m_lamp', [{ key: 'w4b_m_l1', id: 'LSS' }, { key: 'w4b_m_l2', id: 'SLS' }, { key: 'w4b_m_l3', id: 'SSL' }, { key: 'w4b_m_lwatch', id: 'watch' }], (o) => {
      const f = this.f;
      if (o.id === 'watch') { this.lamp = null; this.startLamp(Lm.pat); return; }
      g.audio.play('select');
      g.setState('cutscene'); g.cutscene = (dt) => this.lampStep(dt);
      Lm.t = 0;
      if (o.id !== Lm.pat) { f.w4b_lampTries = (f.w4b_lampTries || 0) + 1; Lm.ph = 'no'; return; }
      Lm.ph = 'home';
    }, { forced: true });
  }
  lampDone() {
    const g = this.game, f = this.f, h = g.hero;
    this.endLamp(false);
    f.w4b_lamp = true;
    this.chain([['arthur', 'w4b_ar_lampyes'], ['arthur', 'w4b_ar_lampgift']], () => {
      // (CLOVER-BALANCE option A, the user's pick 25.11: kashes, not a leaf)
      h.coins += CLOVER_FULL_KASHES; g.hud.toast('w4b_toast_kashes', { n: CLOVER_FULL_KASHES }); g.hud.stats?.(h);
      g.audio.play('coin');
      this.story.refreshCast(); this.applyWorld(); g.save(false);
    });
  }
  endLamp(silent) {
    const g = this.game;
    if (!this.lamp) return;
    this.lamp = null;
    W4.boats?.arthur?.setLamp(false);
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.camRig.override = null; g.camRig.snap?.();
    if (!silent) g.input.clearEdges?.();
  }

  // ================================================================ each frame (the boats bob at rest)
  update(dt) {
    const B = W4.boats, P = W4.pond; if (!B || !P || this.race || this.lamp) return;
    this._t = (this._t || 0) + dt;
    const A = B.arthur;
    if (this.ck === 'home' && this.f.w4b_won) A.setAt(A.pos.x, 0.03 + Math.sin(this._t * 1.7) * 0.012, A.pos.z, A.yaw, Math.sin(this._t * 1.3) * 0.04);
    else A.setAt(A.pos.x, P.y + Math.sin(this._t * 2.1) * 0.004, A.pos.z, A.yaw, Math.sin(this._t * 1.1) * 0.03);
  }

  // ================================================================ the journal and the pockets
  journal() {
    const f = this.f, out = [];
    if ((this.boatOpen() || f.w4b_won) && f.w4b_hook) {
      const L = [{ key: 'w4b_j_watch', done: !!f.w4b_seen }];
      if (f.w4b_seen) L.push({ key: 'w4b_j_why', done: !!f.w4b_keelSeen }, { key: 'w4b_j_fix', done: !!f.w4b_keel && f.w4b_sail === 'half' || !!f.w4b_won }, { key: 'w4b_j_race', done: !!f.w4b_won });
      if (f.w4b_won && this.ck === 'home') L.push({ key: 'w4b_j_lamp', done: !!f.w4b_lamp });
      out.push({ title: t('w4b_j_title'), lines: L });
    }
    if (f.w4l_ask) {
      const L = [{ key: 'w4l_j_ask', done: !!f.w4l_heard || !!f.w4l_sack }, { key: 'w4l_j_form', done: !!f.w4l_sack }];
      if (f.w4l_sack) L.push({ key: 'w4l_j_carry', done: !!f.w4l_given });
      if (f.w4l_given) L.push({ key: 'w4l_j_reply', done: !!f.w4l_replyGiven });
      out.push({ title: t('w4l_j_title'), lines: L });
    }
    if (f.w4r_card || f.w4r_fenn) out.push({ title: t('w4r_j_title'), lines: [{ key: 'w4r_j_find', done: !!f.w4r_met || !!f.w4r_found }, { key: 'w4r_j_case', done: !!f.w4r_found }] });
    return out;
  }
  items() {
    const f = this.f, out = [];
    if (f.w4l_sack && !f.w4l_given) out.push({ id: 'w4l_sack', icon: 'cloth' });
    if (f.w4l_reply && !f.w4l_replyGiven) out.push({ id: 'w4l_reply', icon: 'leaflet' });
    if (f.w4r_case && !f.w4r_found) out.push({ id: 'w4r_case', icon: 'cloth' });
    return out;
  }
}
