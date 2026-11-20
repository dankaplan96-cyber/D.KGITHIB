// U-2 "One More Place" — the user's own side quest (docs/lba-maturity/DEPTH-PLAN.md, "The user's five side quests";
// docs/lba-maturity/U2-ONE-MORE-PLACE.md). Not a chapter: the director (index.js) asks it beside the chapter in progress,
// as it asks ferry.js. The house's new pieces are src/game/oneplace.js.
//
// From chapter 2, once the hot water runs in the house (story/pumpline.js: ct_home; a save from before the pump thread:
// the water's return), Zoé has laid the table for four: a fourth chair stands on its north side, a bowl at each place.
// Talked to at home, she says it is Old Brix's place: he lived next door (Hedda lives there now) and ate with them every
// week until he moved up the lane, and nobody has asked him since. Arthur: he sits on the lane's benches.
//   - Old Brix is the old man of Citadel's benches (walkrounds.js, his round: the lane's benches, the well, the pump).
//     Asked, he comes, but brings his radio ("your house always had music in it") and takes his short cut: he stays on
//     his bench until the camera no longer sees him, then he is at the house.
//   - At the table, his tall old set on its north-west corner. It hasn't found a station since he moved. The rule, told
//     before it is needed: turn the wheel on top slowly and watch the green eye; wide open is a station. And the goal:
//     the tune he heard through their window every week.
//   - The tuning (his right hand on the wheel; the camera close behind his shoulder on the dial): left / right turn it,
//     E lets go. The needle runs along the dial; three stations open the eye: the project's bulletin (or, later, the
//     weather), a Zeelich station (horns and bells), and the house's own tune — the music the game plays in the house
//     ('home', engine/music.js). By ear: the house's music stops while he tunes and comes back on its station. By sight:
//     the needle, the eye's glow, and the radio's caption under the picture (the bulletin's words; ♪ for music). A
//     wrong station: Brix's word, nothing lost. Held on the house's tune for a moment: it is found.
//   - "Sit down, all of you": E at Twinsen's chair. A short scene at the table (skippable): the four of them and Brix,
//     the radio playing; the emotional turn ("Come next week. Same chair."). Life refilled.
// Afterwards: the chair stays. Coming home in a later chapter (4–7, 9, 11–12, after the ending: wherever Zoé and Arthur
// are at home), the table is laid and Brix sits at it with his radio, its eye open; E at the chair: a short meal, a new
// conversation the first time in a chapter that has one, otherwise music and food. One meal an outing (he has been out
// of the house and its garden since). Brix on the lane has a word of it once a chapter. In chapter 2's radio scene Arthur
// tunes Grandpa's radio "slowly, like Mr Brix showed us" (chapter1.js).
//
// State (flags, dx_om_; an old save has none: the quest is offered where its chapter allows, nothing is made up):
//   dx_om_ask (Zoé told), dx_om_chair (the chair looked at), dx_om_yes (Brix said yes), dx_om_here (his radio's rule
//   heard), dx_om_dial (the needle, 0..1, kept between tries), dx_om_wrong (wrong stations lingered on), dx_om_tuned,
//   dx_om_done (the first meal eaten), dx_om_lastCh (the chapter key of the last meal), dx_om_away (out of the house and
//   garden since), dx_om_heard ('dig,pass,…': conversations heard), dx_om_bseen (the chapters whose lane word he said),
//   dx_om_meals (meals eaten), dx_om_ep (the ending's dinner counted as that visit's meal).
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { Cinematic } from '../../engine/cinematic.js';
import { buildOnePlace, SEATS } from '../oneplace.js';
import { handTo } from './reach.js';
import { Resident } from '../walkers.js';
import { SEAT } from '../roomlife.js';
import '../text/oneplace.js';

// where the quest may be offered (Zoé at home, Brix on the lane): not the well (ch. 1), Zeelich (3), the evacuation (8:
// the streets are empty), the network (10: Zoé at the lighthouse)
const ELIGIBLE = new Set(['project', 'dig', 'steam', 'pass', 'observatory', 'council', 'shell', 'core', 'home']);
// the later meals, by chapter: the conversation's key (null: music and food only)
const MEAL = { dig: 'dig', steam: 'steam', pass: 'pass', observatory: 'obs', council: 'council', shell: 'deep', core: 'deep', home: 'home' };
const WHO = { first: ['om_brix', 'zoe', 'om_brix', 'arthur', 'om_brix', 'hero', 'om_brix'], dig: ['om_brix', 'zoe', 'arthur', 'om_brix'], steam: ['om_brix', 'zoe', 'om_brix', 'arthur'], pass: ['om_brix', 'hero', 'om_brix'], council: ['om_brix', 'zoe', 'om_brix', 'arthur'], home: ['om_brix', 'arthur', 'om_brix', 'zoe', 'om_brix'] };
const KEYS = { first: 'om_m0_', dig: 'om_m_dig_', steam: 'om_m_steam_', pass: 'om_m_pass_', council: 'om_m_council_', home: 'om_m_home_' };
// Brix's word on the lane afterwards, by chapter
const AFTER = { project: 'om_after_project', dig: 'om_after_mid', steam: 'om_after_mid', pass: 'om_after_mid', observatory: 'om_after_mid', council: 'om_after_council', shell: 'om_after_deep', core: 'om_after_deep', home: 'om_after_home' };
// the radio's stations along the dial (0..1)
export const STATIONS = [{ id: 'news', k: 0.24 }, { id: 'home', k: 0.63 }, { id: 'zee', k: 0.86 }];
const ON = 0.022;        // within this of a station: on it (the eye wide open)
const NEAR = 0.09;       // the eye starts to open this far off one
const SPEED = 0.16;      // dial per second, the key held
const LOCK = 1.4;        // s on the house's tune: found
const AWAY = 40;         // m from the house's door: out of the house and its garden
const NAME = { om_brix: 'n_brix', brix: 'n_brix', zoe: 'n_zoe', arthur: 'n_arthur', hero: 'n_hero' };
const COLORS = { om_brix: '#b8d8a0', brix: '#b8d8a0', zoe: '#ffb0d0', arthur: '#ffe070', hero: '#8fc2ff' };
const BRIX_TINT = '#e8e4f0';   // (walkrounds.js: the walker's own tint, so the guest is the same Brix)
const $ = (s) => document.querySelector(s);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// the meal's scene: a Cinematic with a synchronous start (as ferry.js's SailFilm)
class MealFilm extends Cinematic {
  start() {
    const g = this.game;
    this.state = 'prep';
    g.cine = this; g.camRig.cine = true; g.camRig.override = null;
    if (g.hero.rig.silhouette) g.hero.rig.silhouette.visible = false;
    g.setState('cinematicEnd');
    g.hud.show(false);
    document.body.classList.add('cine-on');
    $('#touch')?.classList.add('hidden');
    $('#fade').classList.remove('quick');
    $('#fade').classList.add('on', 'instant');
    this.ui(true);
    try { this.def.prepare?.(this); } catch (e) { console.error('meal prepare failed', e); }
    this.state = 'run';
    g.setState('cinematic');
    this.apply(0);
    const reveal = () => $('#fade').classList.remove('instant', 'on');
    requestAnimationFrame(reveal); setTimeout(reveal, 250);
  }
}

export class OnePlace extends ChapterBase {
  get H() { return this.game.regions?.built?.('house') || null; }
  get OP() { return this._op || null; }
  get key() { return this.story.cur?.key; }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  inHouse() { return this.game.room?.id === 'house'; }

  // ================================================================ the cast
  npcDefs() {
    const c = this.game.regions?.centreOf?.('house') || { x: 1000, z: 0 };
    return [{ id: 'om_brix', name: 'n_brix', char: 'desertTrader', dressOf: 'brix', color: COLORS.om_brix, x: c.x + SEATS.guest.x, z: c.z + SEATS.guest.z, angle: SEATS.guest.a }];
  }
  place(id) {
    if (id === 'om_brix') return this.guestSeat() || null;
    if (id === 'brix') {
      const n = this.npc('brix'); if (!n) return undefined;
      if (this.brixAway()) { n.away = 'story'; return null; }
      return undefined;   // (citizens.js puts a walker we took off back on his round)
    }
    return undefined;
  }
  // he is at the table: from his yes to the first meal; afterwards while a meal is laid and Twinsen is home
  guestDue() { const f = this.f; return (!!f.dx_om_yes && !f.dx_om_done) || (!!f.dx_om_done && this.inHouse() && this.mealReady()); }
  brixAway() { const f = this.f; return (!!f.dx_om_yes && !f.dx_om_done && !!this._left) || (!!f.dx_om_done && this.inHouse() && this.mealReady()); }
  guestSeat() {
    if (!this.guestDue() || !this.OP) return null;
    const n = this.npc('om_brix'); if (!n) return null;
    return { ...this.sitPose(n, this.OP.seats.guest), anim: 'sit', pin: true, track: null };
  }

  // ================================================================ when
  // chapter 2: the hot water runs in the house (a save from before the pump thread: the water is back)
  projectReady() { const f = this.f; return !!f.c1_home && !!f.c1_water && (!f.ct_v || !!f.ct_home); }
  // the table laid for four, the chair out: the quest open in this chapter
  windowOpen() { const k = this.key; return !this.f.dx_om_done && ELIGIBLE.has(k) && (k !== 'project' || this.projectReady()); }
  atHome(id) { const n = this.npc(id), R = this.game.regions; return !!(n?.present && R?.sceneOf?.(n.pos.x, n.pos.z) === 'house'); }
  // Zoé tells it (in the house, with no main-path word of hers due: chapter 2's radio scene after Vesk has gone)
  offer() { const f = this.f; return this.windowOpen() && !f.dx_om_ask && this.atHome('zoe') && !(this.key === 'project' && f.c1_veskGone && !f.c1_radio); }
  // a later meal is laid: the quest done; a chapter with meals; Zoé and Arthur at home; not the ending's own dinner; not
  // the same visit as the last meal
  mealReady() {
    const f = this.f, k = this.key;
    if (!f.dx_om_done || !MEAL[k] || this.film) return false;
    if (k === 'home' && !f.ep_dinner) return false;
    if (!this.atHome('zoe') || !this.atHome('arthur')) return false;
    return f.dx_om_lastCh !== k || !!f.dx_om_away;
  }
  phase() { return MEAL[this.key] || null; }
  heard(ph) { return String(this.f.dx_om_heard || '').split(',').includes(ph); }
  addTo(flag, v) { const s = new Set(String(this.f[flag] || '').split(',').filter(Boolean)); s.add(v); this.f[flag] = [...s].join(','); }

  // ================================================================ the world from the flags
  ensure() {
    const H = this.H;
    if (this._op || !H?.group) return !!this._op;
    this._op = buildOnePlace(this.game, H);
    this.applyWorld();
    return true;
  }
  // (the guest is made with the cast at its chair: hidden at once, before any scene can show him standing there)
  decorate() { this.ensure(); const n = this.npc('om_brix'); if (n?.present && !this.guestSeat()) n.setPresent(false); }
  regionBuilt(ids) { if (ids.includes('house')) { this.ensure(); this.applyWorld(); } }
  applyFlags() {
    const f = this.f;
    // (consistent: each step implies the ones before it)
    if (f.dx_om_done) f.dx_om_tuned = true;
    if (f.dx_om_tuned) f.dx_om_here = true;
    if (f.dx_om_here) f.dx_om_yes = true;
    if (f.dx_om_yes) f.dx_om_ask = true;
    if (f.dx_om_dial != null && !(typeof f.dx_om_dial === 'number' && f.dx_om_dial >= 0 && f.dx_om_dial <= 1)) delete f.dx_om_dial;
    this._left = true;   // (on a load he has gone on ahead to the house)
    if (this.tune) this.endTune(false, true);
    this.film = null; this.busy = false; this._room = undefined;
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const OP = this.OP, f = this.f; if (!OP) return;
    const quest = !!f.dx_om_yes && !f.dx_om_done, ready = !!f.dx_om_done && this.mealReady();
    OP.setChair(!!f.dx_om_done || !!f.dx_om_ask || this.windowOpen());
    OP.setBowls((!f.dx_om_done && (!!f.dx_om_ask || this.windowOpen())) || ready || !!this.film);
    OP.setRadio(quest || (ready && this.inHouse()) || !!this.film);
    if (!this.tune) { const k = f.dx_om_tuned ? STATIONS[1].k : (f.dx_om_dial ?? 0.08); OP.setNeedle(k); OP.setEye(this.eyeAt(k)); }
  }
  // (the eye: shut far from a station, opening as the needle nears one, wide open on it: Brix's rule)
  eyeAt(k) { let d = 9; for (const s of STATIONS) d = Math.min(d, Math.abs(k - s.k)); return Math.pow(clamp01((NEAR - d) / (NEAR - ON)), 1.3); }
  recast() {
    this.story.refreshCast(); this.applyWorld();
    // (seated, his feet under the table: only his legs stand out from the chair, whose own collider holds the rest; the
    //  body circle a standing Grobo keeps others out of would keep Twinsen off his place at the radio)
    const n = this.npc('om_brix'); if (n) n.bodyR = 0.3;
  }
  // the sitter's place on a chair: the seat's own shape (roomlife.js SEAT.chair) and this body's in the sit pose
  // (walkers.js Resident.sitShape, measured once per body), as the residents sit on benches
  sitPose(n, s) {
    const sh = Resident.prototype.sitShape.call({ def: { char: n.def?.char || 'twinsen' }, rig: n.rig, carryMesh: null, foldCoat: Resident.prototype.foldCoat });
    const sp = SEAT.chair, zl = Math.max(sp.back + 0.07 - sh.back, sp.front + 0.015 - sh.shin);
    return { x: s.x + Math.sin(s.a) * zl, z: s.z + Math.cos(s.a) * zl, y: sp.seatY + 0.008 - sh.bottom, a: s.a };
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const OP = this.OP, f = this.f, h = this.game.hero;
    if (!OP || !this.inHouse() || !this.able() || this.busy || this.tune || this.film || h.steer || h.actT > 0) return;
    const S = OP.seats, guest = this.npc('om_brix')?.present;
    if (OP.state.chair && !guest) consider(dist(S.guest.x, S.guest.z), 1.2, { kind: 'dx_om_chair', label: 'p_look' });
    if (f.dx_om_yes && !f.dx_om_tuned && guest) consider(dist(OP.wheel.x, OP.wheel.z), 1.25, { kind: 'dx_om_radio', label: 'p_tune' });
    if (guest && ((f.dx_om_tuned && !f.dx_om_done) || (f.dx_om_done && this.mealReady()))) consider(dist(S.hero.x, S.hero.z), 1.25, { kind: 'dx_om_sit', label: 'p_sit' });
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_om_')) return false;
    const g = this.game, f = this.f;
    switch (it.kind) {
      case 'dx_om_chair': {
        f.dx_om_chair = true;
        const k = f.dx_om_done ? 'om_chair_done' : f.dx_om_yes ? 'om_chair_yes' : f.dx_om_ask ? 'om_chair_ask' : 'om_chair_0';
        this.chain([['hero', k]], () => g.save(false));
        return true;
      }
      case 'dx_om_radio':
        if (!f.dx_om_here) { this.hearRule(() => this.toWheel()); return true; }
        this.toWheel();
        return true;
      case 'dx_om_sit': this.startMeal(); return true;
    }
    return false;
  }
  // Brix's radio and its rule, before he needs it (by talking to him, or reaching for the set first)
  hearRule(then) {
    const g = this.game, f = this.f;
    const lines = [['om_brix', 'om_brix_here1'], ['om_brix', 'om_brix_here2'], ['om_brix', 'om_brix_here3']];
    if (this.atHome('arthur')) lines.push(['arthur', 'om_ar_here']);
    lines.push(['om_brix', 'om_brix_here4']);
    this.chain(lines, () => { f.dx_om_here = true; g.save(false); then?.(); });
  }
  // his hand on the wheel (he steps to his place north of the table, facing it), then the tuning
  toWheel() {
    const g = this.game, h = g.hero;
    this.busy = true;
    handTo(h, this.OP.touch, () => this.startTune(), 1.0);
  }

  // ================================================================ talk
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (!this.able() || (id !== 'zoe' && id !== 'brix' && id !== 'om_brix')) return false;
    const g = this.game, f = this.f;
    const c = (lines, done) => { this.chain(lines, () => { done?.(); g.save(false); }); return true; };
    if (id === 'zoe') {
      if (!this.inHouse()) return false;
      if (this.offer()) {
        const lines = [['zoe', this.key === 'project' ? 'om_zoe_1' : 'om_zoe_1b'], ['hero', 'om_tw_1'], ['zoe', 'om_zoe_2'], ['zoe', 'om_zoe_3']];
        if (this.atHome('arthur')) lines.push(['arthur', 'om_ar_1']);
        return c(lines, () => { f.dx_om_ask = true; this.applyWorld(); });
      }
      if (f.dx_om_tuned && !f.dx_om_done && !(this.key === 'project' && f.c1_veskGone && !f.c1_radio)) return c([['zoe', 'om_zoe_sit']]);
      if (this.npc('om_brix')?.present && f.dx_om_done && this.mealReady() && !this._nudged) { this._nudged = true; return c([['zoe', 'om_zoe_ready']]); }
      return false;
    }
    if (id === 'brix') {
      if (!npc.ambient) return false;
      const talk = (lines, done) => { npc.engage?.(); this.chain(lines, () => { npc.release?.(); done?.(); g.save(false); }); return true; };
      if (f.dx_om_ask && !f.dx_om_yes) return talk([['hero', 'om_tw_inv'], ['brix', 'om_brix_inv1'], ['brix', 'om_brix_inv2'], ['brix', 'om_brix_inv3']], () => { f.dx_om_yes = true; this._left = false; this.applyWorld(); this.story.refreshCast(); });
      if (f.dx_om_yes && !f.dx_om_done) return talk([['brix', 'om_brix_go']]);
      const k = this.key, line = AFTER[k];
      if (f.dx_om_done && line && !String(f.dx_om_bseen || '').split(',').includes(k)) return talk([['brix', line]], () => this.addTo('dx_om_bseen', k));
      return false;
    }
    // Brix at the table
    if (f.dx_om_yes && !f.dx_om_done) {
      if (!f.dx_om_here) { this.hearRule(); return true; }
      return c([['om_brix', f.dx_om_tuned ? 'om_brix_sit' : 'om_brix_hint']]);
    }
    return c([['om_brix', 'om_brix_sitdown']]);
  }
  // a conversation (as ChapterBase.chain), the guest under Brix's own name and voice
  chain(lines, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { for (const [oid] of lines) { const o = this.speaker(oid); if (o && o !== g.hero) o.listenTo = null; } done?.(); return; }
      const [id, key] = lines[i];
      const sp = this.speaker(id), text = Array.isArray(t(key)) ? t(key) : [t(key)];
      for (const [oid] of lines) { const o = this.speaker(oid); if (o && o !== sp && sp && o !== g.hero) o.listenTo = sp; }
      if (sp && sp !== g.hero) sp.talking = true;
      g.say(NAME[id] || 'n_' + id, text, () => { if (sp && sp !== g.hero) sp.talking = false; next(i + 1); }, sp, COLORS[id]);
    };
    next(0);
  }

  // ================================================================ the tuning
  startTune() {
    const g = this.game, f = this.f, OP = this.OP, h = g.hero;
    this.busy = false;
    if (!OP || g.state !== 'play') return;
    const k0 = f.dx_om_dial ?? 0.08;
    this.tune = { k: k0, hold: 0, st: undefined, stT: 0, said: new Set(), line: null, lineT: 0 };
    h.vel?.set(0, 0); h.angle = OP.touch.a;
    if (h.rig.silhouette) h.rig.silhouette.visible = false;   // (the see-through outline is a play aid: off in the close-up)
    g.setState('cutscene');
    g.cutscene = (dt) => this.tuneStep(dt);
    // the close-up: from the room's side of the table, over it, down onto the dial on the set's top; he stands beyond the
    // set facing the camera, his right hand on the wheel at its east end
    const d = OP.dialAt, pos = new THREE.Vector3(d.x - 0.03, d.y + 0.56, d.z + 0.52), look = new THREE.Vector3(d.x + 0.06, d.y + 0.03, d.z - 0.03);
    g.camRig.override = { pos, look };
    g.camera.position.copy(pos); g.camRig.look.copy(look); g.camera.lookAt(look);
    this.setFov();
    g.audio.setMood('silence');   // (the room hushes: everyone listens to the set)
    this.overlay(true);
    this.station(null, true);
  }
  setFov() { const c = this.game.camera; if (c.fov !== 38) { c.fov = 38; c.updateProjectionMatrix(); } }
  tuneStep(dt) {
    const g = this.game, I = g.input, h = g.hero, T = this.tune, OP = this.OP;
    if (!T) return;
    h.vel?.set(0, 0); h.rig.play('tinker'); h.rig.update(dt, 0); h.sync();
    this.setFov();
    if (I.pressed('interact') || I.pressed('pause') || I.menu('back') || I.pressed('action')) { this.endTune(false); return; }
    const mx = I.move().x, dir = Math.abs(mx) > 0.15 ? Math.sign(mx) * Math.min(1, Math.abs(mx)) : 0;
    if (dir) {
      const k1 = clamp01(T.k + dir * SPEED * dt);
      if (Math.floor(k1 * 40) !== Math.floor(T.k * 40)) g.audio.play('tClick');
      OP.spinWheel(k1 - T.k); T.k = k1; OP.setNeedle(k1);
    }
    let near = STATIONS[0], d = 9;
    for (const s of STATIONS) { const e = Math.abs(T.k - s.k); if (e < d) { d = e; near = s; } }
    OP.setEye(this.eyeAt(T.k));
    const on = d < ON ? near.id : null;
    if (on !== T.st) this.station(on); else T.stT += dt;
    // the house's tune, held: found
    if (on === 'home') { T.hold += dt; if (T.hold >= LOCK) { this.tuned(); return; } } else T.hold = 0;
    // a wrong station lingered on: Brix's word (once each time), nothing lost
    const f = this.f;
    if (on === 'news' && T.stT > 2.2 && !T.said.has('news')) { T.said.add('news'); f.dx_om_wrong = (f.dx_om_wrong || 0) + 1; this.say('om_brix', this.key === 'project' && !f.c1_veskGone ? 'om_brix_news' : 'om_brix_news_b'); }
    if (on === 'zee' && T.stT > 1.6 && !T.said.has('zee')) { T.said.add('zee'); f.dx_om_wrong = (f.dx_om_wrong || 0) + 1; this.say('om_brix', 'om_brix_zee'); }
    if (T.line && (T.lineT -= dt) <= 0) { T.line = null; this.overlay(true); }
  }
  // the station under the needle: the music, the caption
  station(id, first = false) {
    const g = this.game, T = this.tune, A = g.audio; if (!T) return;
    T.st = id; T.stT = 0;
    if (!id) T.said.delete('news'), T.said.delete('zee');
    if (id === 'home') { A.endCue(); A.setMood('home'); }
    else if (id === 'zee') A.cue('zeelich_b');
    else { A.endCue(); if (!first) A.setMood('silence'); }
    this.overlay(true);
  }
  caption() {
    const T = this.tune; if (!T) return '';
    if (T.st === 'home') return t('om_cap_home');
    if (T.st === 'zee') return t('om_cap_zee');
    if (T.st === 'news') return t(this.key === 'project' && !this.f.c1_veskGone ? 'om_cap_news' : 'om_cap_news_b');
    return t('om_cap_hiss');
  }
  say(id, key) { const T = this.tune; if (!T) return; T.line = { who: t(NAME[id]), color: COLORS[id], text: t(key) }; T.lineT = 3.2; this.overlay(true); }
  // the tuning's strip under the picture: what the set plays, who says what, the keys
  overlay(on) {
    let el = $('#omtune');
    if (!el) {
      el = document.createElement('div'); el.id = 'omtune';
      el.style.cssText = 'position:fixed;left:50%;bottom:7%;transform:translateX(-50%);max-width:min(720px,92vw);padding:10px 18px;border-radius:10px;'
        + 'background:rgba(6,12,20,0.82);border:1px solid rgba(255,255,255,0.4);color:#fff;text-align:center;font-weight:500;line-height:1.5;'
        + 'text-shadow:0 1px 2px #000;pointer-events:none;z-index:40;display:none;';
      document.body.appendChild(el);
    }
    if (!on || !this.tune) { el.style.display = 'none'; return; }
    const T = this.tune, I = this.game.input, kb = (a) => `<kbd>${I.label(a)}</kbd>`;
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    el.innerHTML = `<div class="omcap" style="font-size:1.08em;color:#ffe8b0">${esc(this.caption())}</div>`
      + (T.line ? `<div class="omline"><b style="color:${T.line.color}">${esc(T.line.who)}</b> ${esc(T.line.text)}</div>` : '')
      + `<div class="omkeys" style="opacity:0.85;font-size:0.92em;margin-top:2px">${t('om_tune_hint', { l: kb('left'), r: kb('right'), e: kb('interact') })}</div>`;
    el.style.display = 'block';
  }
  endTune(found, quiet = false) {
    const g = this.game, f = this.f, T = this.tune, h = g.hero;
    if (!T) return;
    this.tune = null;
    if (!found) f.dx_om_dial = +T.k.toFixed(3);
    if (g.cutscene && g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
    g.camRig.override = null; g.camRig.snap?.();
    h.actT = 0; h.rig.play('idle');
    if (h.rig.silhouette) h.rig.silhouette.visible = true;
    this.overlay(false);
    if (!found) { g.audio.endCue(); if (this.inHouse()) g.audio.setMood('home'); }
    g.input.clearEdges?.();
    if (!quiet) g.save(false);
  }
  tuned() {
    const g = this.game, f = this.f, OP = this.OP;
    f.dx_om_tuned = true; f.dx_om_dial = STATIONS[1].k;
    OP.setNeedle(STATIONS[1].k); OP.setEye(1);
    this.endTune(true);
    g.audio.endCue(); g.audio.setMood('home');
    const lines = [];
    if (this.atHome('zoe')) lines.push(['zoe', 'om_tuned_zoe']);
    if (this.atHome('arthur')) lines.push(['arthur', 'om_tuned_ar']);
    lines.push(['om_brix', 'om_tuned_brix']);
    if (this.atHome('zoe')) lines.push(['zoe', 'om_zoe_sit']);
    this.chain(lines, () => g.save(false));
  }

  // ================================================================ the meal
  startMeal() {
    const g = this.game, f = this.f, OP = this.OP, h = g.hero;
    const first = !f.dx_om_done, ph = this.phase();
    const set = first ? 'first' : ph && KEYS[ph] && !this.heard(ph) ? ph : null;
    const lines = set ? WHO[set].map((who, i) => [who, KEYS[set] + (i + 1)]) : [];
    const T = lines.length ? 2.4 + lines.length * 5.0 + 2.2 : 10;
    const people = [['zoe', OP.seats.zoe], ['arthur', OP.seats.arthur], ['om_brix', OP.seats.guest]].map(([id, s]) => [this.npc(id), s]).filter(([n]) => n?.present);
    const me = this.sitPose(h, OP.seats.hero);
    const C = OP.table, tb = new THREE.Vector3(C.x, 0.85, C.z);
    // a slow push in, high over the table from the south-west, inside the family room: Brix and Twinsen across the table
    // side by side (from the south or the south-east Twinsen stood in front of Brix)
    const A = { pos: new THREE.Vector3(C.x - 1.85, 2.7, C.z + 2.0), look: tb.clone().add(new THREE.Vector3(0.2, 0.15, -0.3)), fov: 48 };
    const B = { pos: new THREE.Vector3(C.x - 1.6, 2.55, C.z + 1.75), look: tb.clone().add(new THREE.Vector3(0.22, 0.15, -0.35)), fov: 48 };
    const subs = lines.map(([who, key], i) => ({ t: 2.4 + i * 5.0, d: 4.5, who: t(NAME[who]), text: t(key), color: COLORS[who], voice: NAME[who] }));
    this.film = { set, first };
    const cine = new MealFilm(g, {
      length: T, subs,
      shots: [{ t0: 0, t1: T - 1.6, from: A, to: B }, { t0: T - 1.6, t1: T, to: 'game' }],
      events: [{ t: 0.3, fn: () => g.audio.play('put') }],
      tracks: [{ t0: 0, t1: T, fn: (k, tt, dt) => { h.pos.set(me.x, me.y, me.z); h.angle = me.a; h.rig.play('sit'); h.rig.update(dt, 0); h.sync(); } }],
      prepare: (c) => {
        this.applyWorld();
        // (Zoé's body, LBA2's, keeps its legs straight in the rig's sit pose (seen in this scene's pictures: she stood a
        //  chair's height up); and one in a long dress cannot sit without its skirt through the seat, walkers.js canSit:
        //  she stands at her place behind her chair, as one does who has just served)
        for (const [n, s] of people) {
          n.track = null; n.talking = false; n.listenTo = null;
          if (n.def.id !== 'zoe' && Resident.prototype.canSit.call({ def: n.def })) n.placeAt({ ...this.sitPose(n, s), anim: 'sit', pin: true });
          else n.placeAt({ x: s.x - Math.sin(s.a) * 0.52, z: s.z - Math.cos(s.a) * 0.52, a: s.a, anim: null });
        }
        if (h.swordMesh) h.swordMesh.visible = false;
        h.vel?.set(0, 0); h.shadow && (h.shadow.visible = false);
        g.audio.endCue(); g.audio.setMood('home');
        c.focus = h.pos;
      },
      finish: (skipped) => this.mealDone(set, first, skipped),
    });
    cine.speakers = { n_brix: this.npc('om_brix'), n_zoe: this.npc('zoe'), n_arthur: this.npc('arthur'), n_hero: h };
    cine.start();
  }
  mealDone(set, first, skipped) {
    const g = this.game, f = this.f, h = g.hero, OP = this.OP;
    this.film = null;
    for (const id of ['zoe', 'arthur', 'om_brix']) { const n = this.npc(id); if (n) n.pinY = null; }
    if (first) f.dx_om_done = true;
    else if (set) this.addTo('dx_om_heard', set);
    f.dx_om_meals = (f.dx_om_meals || 0) + 1;
    f.dx_om_lastCh = this.key; f.dx_om_away = false; this._nudged = false;
    // up from the table: he stands beside his chair, on the room's side
    const s = OP.seats.hero, sx = s.x + 0.55, sz = s.z + 0.75;
    h.pos.set(sx, g.physics.groundAt(sx, sz, 0.5), sz); h.angle = Math.atan2(OP.table.x - sx, OP.table.z - sz); h.vel?.set(0, 0); h.onGround = true;
    if (h.shadow) h.shadow.visible = true;
    h.rig.play('idle'); h.sync();
    h.hp = h.maxHp; g.hud.stats?.(h);
    this.story.refreshCast(); this.applyWorld();
    g.camRig.cine = false; g.camRig.snap?.();
    g.hud.show(true); $('#touch')?.classList.toggle('hidden', !g.touch);
    g.setState('play');
    g.audio.play('heal'); g.hud.toast('om_toast_meal');
    g.save(false);
  }

  // ================================================================ per frame (in play)
  update(dt) {
    const g = this.game, f = this.f;
    if (!this._op && !this.ensure()) return;
    if (this.tune || this.film) return;
    const room = g.room?.id ?? 'citadel';
    if (room !== this._room) { this._room = room; this._nudged = false; this.recast(); }
    // out of the house and its garden since the last meal
    if (f.dx_om_done && !f.dx_om_away) {
      const d = g.world?.houses?.[0]?.door;
      if ((g.room && room !== 'house' && room !== 'cellar') || (!g.room && d && Math.hypot(g.hero.pos.x - d.x, g.hero.pos.z - d.z) > AWAY)) f.dx_om_away = true;
    }
    // the ending's family dinner is that visit's meal
    if (this.key === 'home' && f.ep_dinner && f.dx_om_done && !f.dx_om_ep) { f.dx_om_ep = true; f.dx_om_lastCh = 'home'; f.dx_om_away = false; }
    // after his yes he stays on his bench while the camera sees him, then takes his short cut
    if (f.dx_om_yes && !f.dx_om_done && !this._left) {
      const n = this.npc('brix');
      if (!n?.present || room !== 'citadel' || !this.story.seen(n.pos)) { this._left = true; this.recast(); }
    }
    if ((this._t = (this._t ?? 0) - dt) <= 0) {
      this._t = 0.5;
      this.applyWorld();
      const n = this.npc('om_brix');
      if (n) {
        if (!n._omTint && n.rig?.mesh?.material?.color) { n._omTint = true; n.rig.mesh.material.color.set(BRIX_TINT); }
        if (n.present !== !!this.guestSeat()) this.recast();
      }
    }
    // (a hand action that never reached the wheel gives the prompts back)
    if (this.busy && !g.hero.steer && !(g.hero.actT > 0) && g.state === 'play') { this._busyT = (this._busyT || 0) + dt; if (this._busyT > 3) { this.busy = false; this._busyT = 0; } } else this._busyT = 0;
  }
  onEnterRoom() { if (!this.tune && !this.film) { this._room = this.game.room?.id ?? 'citadel'; this.recast(); } }

  journal() {
    const f = this.f, out = [];
    if (f.dx_om_ask && !f.dx_om_yes) out.push({ key: 'om_j_ask', done: false });
    if (f.dx_om_yes && !f.dx_om_here) out.push({ key: 'om_j_yes', done: false });
    if (f.dx_om_here && !f.dx_om_tuned) out.push({ key: 'om_j_here', done: false });
    if (f.dx_om_tuned && !f.dx_om_done) out.push({ key: 'om_j_tuned', done: false });
    if (f.dx_om_done) out.push({ key: 'om_j_done', done: true });
    return out;
  }
}
