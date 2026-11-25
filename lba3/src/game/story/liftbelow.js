// WAVE 6 · H-16 "The Lift Below" (docs/lba-maturity/CONTENT-15H.md §3; EXPANSION_PLAN.md OP-7; WAVE6.md). Not a
// chapter: the director (index.js) asks it beside the chapter in progress, as it asks ferry.js … quietchannel.js. Its
// world is src/game/wanniemine.js (the deep seam's three rooms) and src/game/gasblow.js (the Blow), its text
// text/liftbelow.js. Open from chapter 4 (the shuttles run) to the end; nothing in the main story needs it.
//
// The arc (each step's clue comes from a person or a thing in the world; every step can be left and taken up again):
//   1. The deep shift is stuck below. Foreman Krum and Mother Pudd on the Platform, Burr at the mine's face, a voice
//      behind the project's boards at the old incline's top, Vash at the Lift Dock: the project's reserved lift is the
//      only way down; its buyer, Sorrel, holds the key and stopped coming.
//   2. Otringal: the Imperial Hotel's register and Clerk Edda (Sorrel charges everything to the harbour bar), Old
//      Haskel the explorer in the lounge (the cage's motor coughs in the gas: brake on the cough).
//   3. The harbour bar: Madam Orla holds Sorrel's key against his tab (40 kashes). Pay it, OR free the stage's jammed
//      curtain winch with the ball (high on the frame): the show pays the tab. Either way: the key and Sorrel's bill.
//   4. The Lift Dock: the key in the lever; the ride down into the gas. The motor coughs: brake (E) in time and the cage
//      eases down to the deep landing; too late and the safety catch stops it and Vash winds it back up (try again).
//   5. The deep landing: Gant, the ganger, keeps the project's rule out of fear (ore only, the incline boarded). Show
//      him Sorrel's bill (a choice): he decides for the shift, and gives Twinsen his Wannie glove (or, if he has the
//      adit's glove already, says so). Marl's oil jar: the gallery's three lamp posts lit, the seam glitters.
//   6. The deep seam: the project's boards across the old incline, held by two wedges; the glove knocks them out (the
//      lamp by the boards lit first: in the dark nothing shows what holds them); it all slides into the sump. Up the
//      incline and out of the old mouth onto the Platform: the shortcut both ways from then on.
//   7. Consequences: the shift home (Tull with his mother, Gant at the mouth beside Krum, Marl relighting the seam),
//      Gant's word on the gems (the project's crates wait), Vash's lift runs for anyone, the bar's curtain up and Lys
//      singing (if the winch way), and the people's lines after.
//   Optional: the Blow, the gas monster in the pocket the project's drill opened (wm_blow): asleep without a glove;
//   with one it wakes and spits fire; caught with the glove and thrown back, three hits beat it (gasblow.js). The
//   seam cools; the deep shift's strongbox, lost in the gas: 40 kashes and a clover leaf (kashes when he has nine).
//
// State (flags zo_; an old save has none: nothing made up, the quest is there as for a new player):
//   zo_heard, zo_reserved, zo_register, zo_tab (Orla named it), zo_winch (the curtain freed), zo_key ('paid'|'winch'),
//   zo_miss (brake misses), zo_down (reached the landing), zo_gant (1 told, 2 decided), zo_glove ('given'|'own'),
//   zo_oil, zo_lamps (bits 1|2|4), zo_wedges (bits 1|2), zo_open (the boards down), zo_done (the shift home),
//   zo_paid (Gant's whip-round to a player who had the glove), zo_blow (the Blow beaten), zo_box (its strongbox).
//   A ride, a fall of the boards or a fight under way is not saved: a load puts him at the dock / the room's door.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { islePhase } from '../islandlife.js';
import { BAR } from '../otrbar.js';
import { HOTEL } from '../otrhotel.js';
import { WM, WM_AT, wannieMineDoors, wannieMineExit, setMineMouth } from '../wanniemine.js';
import { Blow } from '../gasblow.js';
import '../text/liftbelow.js';

export const TAB = 40;                  // kashes: Sorrel's tab
export const BOX = { kashes: 40 };      // the strongbox
export const WHIP = 30;                 // Gant's whip-round (a player who had the glove already)
// the ride: the cage's level on the Lift Dock's tower (1 at the deck, 0 at its shaft's foot 18 m under, zislands.js)
export const RIDE = { down: 0.075, cough: 0.42, fast: 0.2, window: 1.8, braked: 0.06, end: 0.24, back: 0.16, catchT: 1.0, arrive: 1.4, cageFrom: 2.8 };
const ROOMS = ['wm_landing', 'wm_gallery', 'wm_blow'];
const COLORS = { zo_gant: '#d8c090', zo_tull: '#a8a0c8', zo_marl: '#a0c8e0', zo_singer: '#f0a8d0', zo_explorer: '#d8c8a8', zo_gantvoice: '#d8c090' };
const bit = (f, k, i) => !!((f[k] || 0) & (1 << i));

export class LiftBelow extends ChapterBase {
  constructor(story) { super(story); this.ride = null; this.fall = null; this.blow = null; this.lastMove = null; this.catching = null; }
  open() { return islePhase(this.story) != null; }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  here() { return this.game.room?.id || 'citadel'; }
  built(id) { return this.game.regions?.built?.(id); }
  busy() { return !!(this.ride || this.fall); }

  // ================================================================ the cast
  npcDefs() {
    const L = WM_AT.wm_landing;
    return [
      { id: 'zo_gant', name: 'n_zo_gant', char: 'zmole1', tint: '#f4e8d8', color: COLORS.zo_gant, x: L.x + 5, z: L.z - 4.9, angle: 0 },
      { id: 'zo_tull', name: 'n_zo_tull', char: 'zmole1_b', tint: '#e8f0ff', color: COLORS.zo_tull, x: L.x + 6.3, z: L.z + 0.8, angle: 0 },
      { id: 'zo_marl', name: 'n_zo_marl', char: 'zmole2_b', tint: '#fff0f8', color: COLORS.zo_marl, x: L.x + 2, z: L.z - 5.3, angle: 0 },
      { id: 'zo_singer', name: 'n_zo_singer', char: 'ztri2', tint: '#fff0fa', color: COLORS.zo_singer, x: 9006, z: -4.4, angle: 0 },
      { id: 'zo_explorer', name: 'n_zo_explorer', char: 'archivist_b', tint: '#fff6e8', color: COLORS.zo_explorer, x: 9399, z: -0.4, angle: 0 },
    ];
  }
  place(id) {
    if (!['zo_gant', 'zo_tull', 'zo_marl', 'zo_singer', 'zo_explorer'].includes(id)) return undefined;
    if (!this.open()) return null;
    const f = this.f, g = this.game;
    if (id === 'zo_singer') {
      const R = this.built('otrbar'); if (!R || !BAR.stage) return null;   // (never builds it: placed again once it is built)
      return { x: BAR.stage.x, z: BAR.stage.z + 0.2, a: 0, anim: f.zo_winch ? 'cheer' : 'idle', track: null };
    }
    if (id === 'zo_explorer') {
      const R = this.built('otrhotel'); if (!R || !HOTEL.npcSpots?.explorer) return null;
      const s = HOTEL.npcSpots.explorer; return { x: s.x + 1.05, z: s.z + 0.35, a: s.a - 0.6, anim: null, track: null };   // (beside his armchair)
    }
    // the deep shift: in the landing until the boards are down; then home on the Platform (Marl stays below)
    if (!f.zo_open || id === 'zo_marl') {
      if (id === 'zo_marl' && f.zo_open) { const R = this.built('wm_gallery'); if (!R) return null; const s = R.npcSpots.marl; return { x: s.x, z: s.z, a: s.a, anim: 'tinker', track: null }; }
      const R = this.built('wm_landing'); if (!R) return null;
      const s = R.npcSpots[id.slice(3)]; return { x: s.x, z: s.z, a: s.a, anim: id === 'zo_marl' ? 'tinker' : null, track: null };
    }
    const P = this.built('isle_platform'), W = P?.wannie; if (!W?.mine) return null;
    if (id === 'zo_gant') { const m = W.mine, sx = Math.cos(m.a), sz = -Math.sin(m.a); return { x: m.x + sx * 2.2, z: m.z + sz * 2.2, a: m.a + Math.PI, anim: null, track: null }; }
    const v = W.npcSpots?.villager1; if (!v) return null;
    return { x: v.x + 1.3, z: v.z + 0.6, a: v.a, anim: null, track: null };
  }
  tint(id, c) { const n = this.npc(id); if (n && !n._zoTint) { n._zoTint = true; n.rig?.mesh?.material?.color?.set?.(c); } }

  // ================================================================ the world from the flags
  regionBuilt(ids) {
    if (ids.includes('isle_platform')) setMineMouth(this.game.rooms.isle_platform?.wannie);
    if (ids.includes('otrbar')) this.barTarget();
    if (ids.some((i) => ROOMS.includes(i)) || ids.includes('otrbar')) this.applyWorld();
  }
  decorate() { const P = this.built('isle_platform'); if (P) setMineMouth(P.wannie); if (this.built('otrbar')) this.barTarget(); this.applyWorld(); }
  // the bar's winch as a ball target of the room (the ball's aim finds it; its hit frees the curtain)
  barTarget() {
    const R = this.built('otrbar'); if (!R || !BAR.winch || this._winchT) return;
    const W = BAR.winch;
    this._winchT = { x: W.x, y: W.y, z: W.z, r: 0.75, material: 'machine', result: 'switch', done: !!this.f.zo_winch, onHit: () => this.freeWinch() };
    R.ballTargets.push(this._winchT);
  }
  applyFlags() {
    const f = this.f;
    for (const k of ['zo_lamps', 'zo_wedges', 'zo_miss']) if (f[k] != null && !(Number.isInteger(f[k]) && f[k] >= 0)) delete f[k];
    if (f.zo_key && !['paid', 'winch'].includes(f.zo_key)) f.zo_key = 'paid';
    if (f.zo_open) f.zo_wedges = 3;
    if ((f.zo_wedges & 3) === 3) f.zo_open = true;
    if (f.zo_open) f.zo_down = true;
    this.endRide(true); this.fall = null; this.catching = null; this.lastMove = null;
    this.blow?.reset(); if (f.zo_blow) this.blow?.calm();
    if (this._winchT) this._winchT.done = !!f.zo_winch;
    this.applyWorld();
  }
  applyWorld() {
    const f = this.f;
    BAR.setCurtain?.(!!f.zo_winch);
    const G = this.built('wm_gallery') && WM.gallery;
    if (G) { for (let i = 0; i < 3; i++) G.setLamp(i, bit(f, 'zo_lamps', i) || !!f.zo_open); G.setBulk(f.zo_open ? 'open' : 'shut'); if (!f.zo_open) for (let i = 0; i < 2; i++) G.setWedge(i, bit(f, 'zo_wedges', i)); }
    const L = this.built('wm_landing') && WM.landing;
    if (L && !this.ride) { L.setCage(0); L.setLever(false); }
    const B = this.built('wm_blow') && WM.blow;
    if (B) {
      B.setCalm(!!f.zo_blow); B.setBox(!!f.zo_box);
      if (!this.blow) {
        const R = this.built('wm_blow');
        this.blow = new Blow(this.game, R, B); this.blow.onBeaten = () => this.blowBeaten(); this.blow.onHint = (k) => this.game.hud.toast(k, { k: this.game.hud.key('attack') }, 3200);
        // (a ball target that follows it while it is awake: the ball's aim finds it, and goes through its gas)
        this._blowT = { x: 0, y: 0, z: 0, r: 1.45, material: 'flesh', result: 'switch', done: true, onHit: (p) => this.blow.puff(p) };
        R.ballTargets.push(this._blowT);
      }
      if (f.zo_blow) this.blow.calm();
    }
  }

  // ================================================================ doors (the Platform's mine mouth)
  doors() {
    if (!this.open() || this.here() !== 'isle_platform') return [];
    return wannieMineDoors();
  }
  exitTo(to) {
    if (to !== 'wm-out') return null;
    if (!wannieMineDoors().length) { this.game.regions?.ensure?.('isle_platform', 'wm-out'); setMineMouth(this.game.rooms.isle_platform?.wannie); }
    return wannieMineExit(to);
  }
  onEnterRoom(id) {
    const f = this.f, g = this.game;
    // (the Blow starts asleep on every visit: a fight left half way is not kept)
    if (this.blow) { this.blow.reset(); if (f.zo_blow) this.blow.calm(); }
    if (id === 'wm_blow') this.sleepSaid = false;
    this.catching = null; this.lastMove = null;
    // out of the old mouth with the boards down: the shift has walked home ahead of him
    if (id === 'isle_platform' && f.zo_open && !f.zo_done) { f.zo_done = true; this.story.refreshCast(); g.save(false); }
    if (ROOMS.includes(id) && !f.zo_heard) f.zo_heard = true;
  }
  onExitRoom() { if (this.blow?.awake) { this.blow.reset(); if (this.f.zo_blow) this.blow.calm(); } }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here();
    if (!this.open() || !this.able() || this.busy() || h.actT > 0 || g.state !== 'play') return;
    if (here === 'isle_liftdock') {
      const L = g.rooms.isle_liftdock?.lift; if (!L?.lever) return;
      consider(dist(L.lever.x, L.lever.z), 1.4, { kind: 'zo_lever', x: L.lever.x, z: L.lever.z, label: f.zo_key ? 'p_zo_ride' : 'p_read' });
      return;
    }
    if (here === 'otrhotel' && HOTEL.register) { const r = HOTEL.register; consider(dist(r.x, r.z), r.r + 0.3, { kind: 'zo_register', x: r.x, z: r.z, label: 'p_read' }); return; }
    if (here === 'wm_landing' && WM.landing) {
      const L = WM.landing;
      consider(dist(L.lever.x, L.lever.z), 1.2, { kind: 'zo_up', x: L.lever.x, z: L.lever.z, label: 'p_zo_up' });
      consider(dist(L.crates.x, L.crates.z), 1.4, { kind: 'zo_crates', x: L.crates.x, z: L.crates.z, label: 'p_look' });
      if (!f.zo_oil && !f.zo_open) consider(dist(L.oil.x, L.oil.z), 1.2, { kind: 'zo_oil', x: L.oil.x, z: L.oil.z, label: 'p_zo_oil' });
      return;
    }
    if (here === 'wm_gallery' && WM.gallery) {
      const G = WM.gallery;
      G.posts.forEach((p, i) => { if (!bit(f, 'zo_lamps', i) && !f.zo_open) consider(dist(p.x, p.z), 1.2, { kind: 'zo_post', i, x: p.x, z: p.z, label: f.zo_oil ? 'p_zo_light' : 'p_look' }); });
      if (!f.zo_open) {
        consider(dist(G.bulk.x, G.bulk.z) + 0.3, 1.8, { kind: 'zo_bulk', x: G.bulk.x, z: G.bulk.z, label: 'p_look' });
        if (Math.abs(h.pos.y - G.back.y) < 1.2) consider(dist(G.back.x, G.back.z), 2.2, { kind: 'zo_back', x: G.back.x, z: G.back.z, label: 'p_look' });
      }
      return;
    }
    if (here === 'wm_blow' && WM.blow && (!this.blow?.awake)) {
      const B = WM.blow;
      if (!f.zo_box) consider(dist(B.box.x, B.box.z), 1.3, { kind: 'zo_box', x: B.box.x, z: B.box.z, label: f.zo_blow ? 'p_zo_open' : 'p_look' });
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('zo_')) return false;
    const g = this.game, f = this.f;
    switch (it.kind) {
      case 'zo_lever': return this.lever();
      case 'zo_register': f.zo_register = true; f.zo_heard = true; g.audio.play('paper'); this.chain([['hero', 'zo_register']], () => g.save(false)); return true;
      case 'zo_up': return this.rideUp();
      case 'zo_crates': this.chain([['hero', 'zo_crates']]); return true;
      case 'zo_oil': f.zo_oil = true; g.audio.play('tFill'); this.chain([['hero', 'zo_oil_take']], () => g.save(false)); return true;
      case 'zo_post': return this.lightPost(it.i);
      case 'zo_bulk': this.chain([['hero', bit(f, 'zo_lamps', 2) ? 'zo_bulk_look' : 'zo_bulk_dark']]); return true;
      case 'zo_back': {
        f.zo_heard = true;
        const gant = !f.zo_down;   // (the shift answers until he has come down to them)
        this.chain(gant ? [['hero', 'zo_back_look'], ['zo_gantvoice', 'zo_back_gant']] : [['hero', 'zo_back_look2']], () => g.save(false));
        return true;
      }
      case 'zo_box': return this.openBox();
    }
    return false;
  }
  // ---------------------------------------------------------------- the people (asked before the islands' own talk)
  talkFirst(npc) {
    const id = npc?.def?.id, g = this.game, f = this.f;
    if (!id || !this.open() || !this.able() || this.busy()) return false;
    const c = (lines, done) => { npc.engage?.(); this.chain(lines.map((l) => (Array.isArray(l) ? l : [id, l])), () => { npc.release?.(); done?.(); }); return true; };
    const heard = () => { f.zo_heard = true; };   // (set before the lines: a hook is a talk in the box, not a remark over the head)
    switch (id) {
      // ---- the Platform
      case 'pf_foreman':
        if (f.zo_done) return c(['zo_krum_done']);
        if (f.zo_heard && f.zo_krum) return false;
        f.zo_krum = true; heard(); return c(['zo_krum_1', 'zo_krum_2']);
      case 'pf_vill1': case 'il_pudd': {   // (Mother Pudd out on the Platform, or at home: isleslife.js il_pudd)
        if (f.zo_done ? f.zo_puddDone : f.zo_pudd) return false;
        if (f.zo_done) f.zo_puddDone = true; else { f.zo_pudd = true; heard(); }
        npc.engage?.(); npc.talking = true;
        g.say('n_pf_vill1', [t(f.zo_done ? 'zo_pudd_done' : 'zo_pudd_1')], () => { npc.talking = false; npc.release?.(); }, npc);
        return true;
      }
      case 'pf_miner1':
        if (f.zo_open) { if (f.zo_burr2) return false; f.zo_burr2 = true; return c(['zo_burr_done']); }
        if (f.zo_burr) return false;
        f.zo_burr = true; heard(); return c(['zo_burr_1']);
      // ---- the Lift Dock
      case 'ld_op':
        if (f.zo_done) return c(['zo_vash_done']);
        if (f.zo_key) return c([f.zo_miss ? 'zo_vash_miss' : 'zo_vash_key']);
        f.zo_reserved = true; heard(); return c(['zo_vash_1', 'zo_vash_2']);
      // ---- Otringal
      case 'ot_clerk':
        if (!f.zo_heard || f.zo_key) return false;
        return c(['zo_edda']);
      case 'zo_explorer':
        if (f.zo_down) return c(['zo_has_done']);
        if (f.zo_heard) return c(['zo_has_0', 'zo_has_brake']);
        return c(['zo_has_0']);
      case 'zo_singer':
        return c([f.zo_winch ? 'zo_lys_after' : 'zo_lys_0']);
      case 'ot_boss': return this.orla(npc, c);
      // ---- the deep shift
      case 'zo_gant': return this.gant(npc, c);
      case 'zo_tull': return c(f.zo_done ? ['zo_tull_done'] : ['zo_tull_0', 'zo_tull_1']);
      case 'zo_marl':
        if (f.zo_blow) return c(['zo_marl_blowdone']);
        if (f.zo_open) return c(['zo_marl_after', 'zo_marl_blow']);
        if ((f.zo_gant || 0) >= 2 || f.zo_glove) return c(f.zo_oil ? ['zo_marl_blow'] : ['zo_marl_oil', 'zo_marl_blow']);
        return c(['zo_marl_0', 'zo_marl_blow']);
    }
    return false;
  }
  // Madam Orla: Sorrel's key against his tab; paid, or the curtain freed
  orla(npc, c) {
    const g = this.game, f = this.f, h = g.hero;
    if (f.zo_key) return f.zo_winch && !f.zo_orlaAfter ? c(['zo_orla_after'], () => { f.zo_orlaAfter = true; }) : false;
    if (f.zo_winch) return c(['zo_orla_square'], () => this.giveKey('winch'));
    if (!f.zo_heard && !f.zo_reserved) return false;
    const first = !f.zo_tab;
    return c(first ? ['zo_orla_tab', 'zo_orla_tab2'] : ['zo_orla_wait'], () => {
      f.zo_tab = true; g.save(false);
      // (the islands' small counter: the kashes taken there, the panel shut, then her line and the key)
      this.story.ipeople.sell(() => [{ id: 'coin', key: 'zo_sh_tabItem', desc: 'zo_shd_tab', price: TAB, disabled: !!f.zo_key, why: 'zo_sh_tabDone' }], 'zo_sh_tab', () => {
        if (f.zo_key) return;
        this.chain([['ot_boss', 'zo_orla_paid']], () => this.giveKey('paid'));
      });
      void h;
    });
  }
  giveKey(how) {
    const g = this.game, f = this.f;
    if (f.zo_key) return;
    f.zo_key = how; f.zo_tab = true; f.zo_heard = true;
    g.found('key', 'it_zo_key', () => g.save(false));
  }
  // the ball on the bar's curtain winch: the curtain rises, Lys sings, Orla calls the tab square
  freeWinch() {
    const g = this.game, f = this.f, W = BAR.winch;
    if (f.zo_winch) return;
    f.zo_winch = true; if (this._winchT) this._winchT.done = true;
    g.audio.play('winch', W); g.audio.play('clunk', W); g.particles?.burst(W.x, W.y, W.z, '#ffe0a0', 14, 2);
    BAR.setCurtain?.(true);
    this.story.refreshCast();
    const orla = this.speaker('ot_boss')?.present;
    this.chain([['zo_singer', 'zo_lys_free'], ...(orla && (f.zo_tab || f.zo_heard) && !f.zo_key ? [['ot_boss', 'zo_orla_square']] : [])], () => {
      if (orla && (f.zo_tab || f.zo_heard) && !f.zo_key) this.giveKey('winch'); else g.save(false);
    });
  }
  // Gant: the rule out of fear; Sorrel's bill shown (a choice); the turn, the glove, the wedges
  gant(npc, c) {
    const g = this.game, f = this.f;
    if (f.zo_done) {
      if (f.zo_glove === 'own' && !f.zo_paid) return c(['zo_gant_done', 'zo_gant_pay'], () => { f.zo_paid = true; g.hero.coins += WHIP; g.audio.play('coin'); g.hud.toast('zo_toast_kashes', { n: WHIP }); g.hud.stats?.(g.hero); g.save(false); });
      return c(['zo_gant_done']);
    }
    if (f.zo_open) return c(['zo_gant_open']);
    if ((f.zo_gant || 0) >= 2) return c(['zo_gant_wait']);
    const ask = () => g.openMenu('zo_m_title', [{ key: 'zo_m_bill', id: 'bill' }, { key: 'zo_m_leave', id: 'leave' }], (o) => {
      if (o.id !== 'bill') { this.chain([['zo_gant', 'zo_gant_leave']]); return; }
      this.chain([['hero', 'zo_gant_bill'], ['zo_gant', 'zo_gant_turn'], ['zo_gant', 'zo_gant_turn2']], () => {
        f.zo_gant = 2;
        const own = !!g.hero.arms?.glove;
        f.zo_glove = own ? 'own' : 'given';
        const after = () => this.chain([['zo_gant', 'zo_gant_lamps']], () => g.save(false));
        if (own) this.chain([['zo_gant', 'zo_gant_glove_own']], after);
        else this.chain([['zo_gant', 'zo_gant_glove']], () => this.story.arsenal.gain('glove', 'it_glove', () => { g.hud.toast('zo_toast_glove', { k: g.hud.key('attack'), w: g.hud.key('weapons') }, 4200); after(); }));
      });
    });
    if (!f.zo_gant) return c(['zo_gant_1', 'zo_gant_2', 'zo_gant_3'], () => { f.zo_gant = 1; g.save(false); ask(); });
    return c(['zo_gant_3'], ask);
  }

  // ---------------------------------------------------------------- the lamps, the boards, the box
  lightPost(i) {
    const g = this.game, f = this.f, G = WM.gallery;
    if (!f.zo_oil) { this.chain([['hero', 'zo_post_dry']]); return true; }
    f.zo_lamps = (f.zo_lamps || 0) | (1 << i);
    G.setLamp(i, true);
    const p = G.posts[i]; g.audio.play('tCast', p); g.particles?.burst(p.x, 2.2, p.z, '#ffd27a', 10, 1.5);
    this.chain([['hero', (f.zo_lamps & 7) === 7 ? 'zo_post_all' : 'zo_post_lit']], () => g.save(false));
    return true;
  }
  // a punch (story.meleeHit): the wedges in the gallery, the Blow's gas
  meleeHit({ hero, move, inArc }) {
    const g = this.game, f = this.f, here = this.here();
    if (!this.open()) return false;
    if (here === 'wm_gallery' && !f.zo_open && WM.gallery && !this.fall) {
      const G = WM.gallery;
      let any = false;
      G.wedges.forEach((w, i) => {
        if (bit(f, 'zo_wedges', i) || !inArc(w.x, w.z, 0.45)) return;
        any = true;
        if (!bit(f, 'zo_lamps', 2)) { g.impact?.(w.x, 0.3, w.z, 'wood', 'blocked'); g.hud.toast('zo_wedge_dark'); return; }
        if (!move.glove) { g.impact?.(w.x, 0.3, w.z, 'wood', 'blocked'); g.hud.toast('zo_wedge_solid'); return; }
        f.zo_wedges = (f.zo_wedges || 0) | (1 << i);
        G.setWedge(i, true);
        g.audio.play('hitWood', w); g.particles?.burst(w.x, 0.4, w.z, '#c8a070', 14, 3);
        if ((f.zo_wedges & 3) === 3) this.startFall(); else { g.hud.toast('zo_wedge_out'); g.save(false); }
      });
      return any;
    }
    if (here === 'wm_blow' && this.blow) return this.blow.fistHit(inArc);
    void hero;
    return false;
  }
  startFall() {
    const g = this.game;
    this.fall = { t: 0 };
    g.audio.play('rumble'); g.audio.play('break', WM.gallery.bulk); g.camRig?.shake?.(0.5);
  }
  stepFall(dt) {
    const g = this.game, f = this.f, G = WM.gallery, F = this.fall;
    F.t += dt;
    const k = Math.min(1, F.t / 1.4);
    G.setBulk('falling', k * k);
    if (Math.random() < dt * 30) g.particles?.burst(G.bulk.x - 1 + Math.random() * 1.5, 0.5 + Math.random() * 2, G.bulk.z + (Math.random() - 0.5) * 10, '#a89888', 3, 3);
    if (k < 1) return;
    this.fall = null;
    f.zo_open = true; f.zo_wedges = 3; f.zo_down = true;
    G.setBulk('open'); for (let i = 0; i < 3; i++) G.setLamp(i, true);
    g.audio.play('thump', G.bulk); g.camRig?.shake?.(0.3);
    this.story.refreshCast();
    this.chain([['hero', 'zo_open_hero']], () => g.save(false));
  }
  openBox() {
    const g = this.game, f = this.f, h = g.hero, B = WM.blow;
    if (!f.zo_blow) { this.chain([['hero', 'zo_box_gas']]); return true; }
    if (f.zo_box) return true;
    f.zo_box = true; B.setBox(true);
    const clover = h.clovers < 9, n = BOX.kashes + (clover ? 0 : 15);
    h.coins += n; if (clover) h.clovers++;
    g.audio.play('chest', B.boxAt); g.audio.play('coin');
    g.hud.toast(clover ? 'zo_toast_box' : 'zo_toast_kashes', { n }); g.hud.stats?.(h);
    this.chain([['hero', 'zo_box_open']], () => g.save(false));
    return true;
  }

  // ---------------------------------------------------------------- the lift
  lever() {
    const g = this.game, f = this.f;
    if (!f.zo_key) {
      f.zo_reserved = true; f.zo_heard = true; g.audio.play('deny');
      const vash = this.speaker('ld_op'), there = vash?.present && vash.pos.distanceTo(g.hero.pos) < 14;
      this.chain([['narrator', 'zo_plate'], ...(there ? [['ld_op', 'zo_vash_1'], ['ld_op', 'zo_vash_2']] : [])], () => g.save(false));
      return true;
    }
    this.startRide();
    return true;
  }
  startRide() {
    const g = this.game, h = g.hero, L = g.rooms.isle_liftdock?.lift; if (!L) return;
    this.ride = { ph: 'down', t: 0, level: 1, L };
    L.setLevel(1, true); L.setLever(true);
    g.lastSafe = { x: L.front.x, z: L.front.z };
    h.angle = L.front.a + Math.PI; h.vel?.set(0, 0);
    g.audio.play('lever', L.lever); g.audio.play('liftWinch', L.top);
    g.hud.toast('zo_toast_ride', null, 3000);
    this._hold ||= (dt, input) => this.rideStep(dt, input);
    g.heroHold = this._hold;
    this.rideStep(0, null);
  }
  endRide(silent = false) {
    const g = this.game;
    if (this._hold && g.heroHold === this._hold) g.heroHold = null;
    if (this._cam && g.camRig?.override === this._cam) g.camRig.override = null;
    this._cam = null;
    const R = this.ride; this.ride = null;
    if (R?.L && !silent) { R.L.setLever(false); }
  }
  // in the cage: the hero held on its floor; the cough and the brake; the catch and the wind back; the arrival
  rideStep(dt, input) {
    const g = this.game, h = g.hero, R = this.ride, f = this.f;
    if (!R) { if (g.heroHold === this._hold) g.heroHold = null; return false; }
    R.t += dt;
    // (in the tower's cage he stands at its front right, clear of the two crates it carries: zislands liftTower)
    if (!R.at && R.L) { const ry = R.L.local?.ry ?? 0, lx = 0.45, lz = 0.8; R.at = { x: R.L.top.x + lx * Math.cos(ry) + lz * Math.sin(ry), z: R.L.top.z - lx * Math.sin(ry) + lz * Math.cos(ry) }; }
    // (on the tower he counts as off the ground: a save made on the way is put at the lift's front, Game.snapshot lastSafe)
    const pose = (y, anim = 'idle') => { h.pos.set(R.at.x, y, R.at.z); h.vy = 0; h.onGround = R.ph === 'arrive'; h.vel?.set(0, 0); h.rig.play(anim); h.rig.update(dt, 0); h.sync(); };
    if (R.ph === 'arrive') {
      const W = WM.landing, k = Math.min(1, R.t / RIDE.arrive), y = RIDE.cageFrom * (1 - k * (2 - k));
      W.setCage(y); R.at = W.cage; pose(0.14 + y);
      if (k >= 1) { W.setCage(0); this.endRide(true); this.arrived(); }
      return true;
    }
    const L = R.L, cageY = () => L.top.y + 0.2 - (1 - R.level) * 18 + 0.14;
    const press = !!input && (input.pressed('interact') || input.pressed('action'));
    if (R.ph === 'down') {
      R.level = Math.max(RIDE.cough, R.level - RIDE.down * dt);
      if (R.level <= RIDE.cough) { R.ph = 'cough'; R.t = 0; g.audio.play('motor', L.top); g.audio.play('clunk', L.top); g.camRig?.shake?.(0.35); g.hud.toast('zo_toast_brake', null, 1800); }
    } else if (R.ph === 'cough') {
      R.level = Math.max(RIDE.end, R.level - RIDE.fast * dt);
      if (Math.random() < dt * 20) g.particles?.burst(h.pos.x, h.pos.y + 2.2, h.pos.z, '#ffd890', 2, 2);
      if (press) { R.ph = 'braked'; R.t = 0; g.audio.play('valveShut', L.top); g.audio.play('rattle', L.top); g.hud.toast('zo_ride_braked', null, 2200); }
      else if (R.t >= RIDE.window || R.level <= RIDE.end) { R.ph = 'caught'; R.t = 0; f.zo_miss = (f.zo_miss || 0) + 1; g.audio.play('slam', L.top); g.camRig?.shake?.(0.6); }
    } else if (R.ph === 'braked') {
      R.level = Math.max(RIDE.end, R.level - RIDE.braked * dt);
      if (R.level <= RIDE.end) {
        R.ph = 'black';
        g.startTransition(() => {
          L.setLevel(0, true); L.setLever(false);
          if (this._cam && g.camRig.override === this._cam) g.camRig.override = null;
          this._cam = null;
          g.enterRoom('wm_landing', WM.landing?.cage || null, true);
          this.ride = { ph: 'arrive', t: 0, level: 0, L }; WM.landing.setCage(RIDE.cageFrom); g.heroHold = this._hold;
        }, ['wm_landing']);
      }
    } else if (R.ph === 'caught') {
      if (R.t >= RIDE.catchT) { R.ph = 'back'; R.t = 0; g.audio.play('liftWinch', L.top); g.hud.toast('zo_ride_caught', null, 3600); }
    } else if (R.ph === 'back') {
      R.level = Math.min(1, R.level + RIDE.back * dt);
      if (R.level >= 1) {
        L.setLevel(1, true); L.setLever(false);
        this.endRide(true);
        const F = L.front; h.pos.set(F.x, g.physics.groundAt(F.x, F.z, L.top.y + 2), F.z); h.angle = F.a; h.onGround = true; h.sync();
        const vash = this.speaker('ld_op');
        if (vash?.present) this.chain([['ld_op', 'zo_vash_miss']], () => g.save(false)); else g.save(false);
        return true;
      }
    }
    L.level = L.target = R.level;
    if (R.ph !== 'black') {
      pose(cageY(), R.ph === 'braked' ? 'use' : 'idle');
      // the ride's shot: from out over the gas beyond the dock's nearest edge (the decks would hide the cage from under
      // them), a little above the cage and going down with it (worked out once: the way off the decks nearest the tower)
      if (!R.out) {
        const P = g.physics; let best = null;
        const sea = (ux, uz, d) => { for (let e = 0; e <= 12; e += 1) if (P.groundAt(L.top.x + ux * (d + e), L.top.z + uz * (d + e), L.top.y + 3) > L.top.y - 6) return false; return true; };   // (open gas from here on for 12 m)
        for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a); for (let d = 2; d <= 40; d += 1) { if (sea(ux, uz, d)) { if (!best || d < best.d) best = { d, ux, uz }; break; } } }
        R.out = best || { d: 8, ux: 0, uz: -1 };
      }
      const O = R.out, far = O.d + 5;
      const pos = new THREE.Vector3(L.top.x + O.ux * far + O.uz * 2.5, h.pos.y + 2.6, L.top.z + O.uz * far - O.ux * 2.5), look = new THREE.Vector3(h.pos.x, h.pos.y + 0.9, h.pos.z);
      if (!this._cam || g.camRig.override !== this._cam) { this._cam = { pos, look }; g.camRig.override = this._cam; } else { this._cam.pos.copy(pos); this._cam.look.copy(look); }
    }
    return true;
  }
  arrived() {
    const g = this.game, f = this.f, first = !f.zo_down;
    f.zo_down = true; f.zo_heard = true;
    if (first && !f.zo_open && this.speaker('zo_gant')?.present) this.chain([['zo_gant', 'zo_gant_arrive']], () => g.save(false));
    else g.save(false);
  }
  rideUp() {
    const g = this.game;
    WM.landing.setLever(true); g.audio.play('lever', WM.landing.lever); g.audio.play('liftWinch', WM.landing.lever);
    g.startTransition(() => {
      const R = g.rooms.isle_liftdock, L = R?.lift;
      L?.setLevel(1, true); L?.setLever(false); WM.landing.setLever(false);
      g.enterRoom('isle_liftdock', L?.front ? { ...L.front } : R.spawn, true);
    }, ['isle_liftdock']);
    return true;
  }

  // ---------------------------------------------------------------- the Blow
  blowBeaten() {
    const g = this.game, f = this.f;
    f.zo_blow = true;
    WM.blow.setCalm(true);
    g.audio.setMood('cave'); g.audio.play('victory');
    this.chain([['hero', 'zo_blow_done']], () => g.save(false));
  }
  stepBlow(dt) {
    const g = this.game, h = g.hero, f = this.f, B = this.blow;
    if (!B || f.zo_blow) return;
    const armed = !!h.arms?.glove;
    if (B.state === 'asleep') {
      if (h.pos.x > WM.blow.wake && !h.dead) {
        if (armed) { B.wake(); g.audio.setMood('boss'); g.hud.toast('zo_blow_wake', { k: g.hud.key('attack') }, 4500); }
        else if (!this.sleepSaid) { this.sleepSaid = true; this.chain([['hero', 'zo_blow_asleep']]); }
      }
    }
    // a glove punch: the first one that starts while a fireball is on the glove throws it; one that starts empty-handed
    // catches the first fireball that comes within reach in front while it lasts
    const m = h.combat?.move;
    if (m && m !== this.lastMove) {
      this.lastMove = m;
      if (m.def?.glove) { if (B.held) { B.throwFrom(h); this.catching = null; } else this.catching = m; }
      else this.catching = null;
    }
    if (!m) this.lastMove = null;
    if (this.catching && m === this.catching && !B.held) { if (B.catchFrom(h)) this.catching = null; }
    B.update(dt);
    const T = this._blowT; if (T) { T.x = B.pos.x; T.y = B.pos.y; T.z = B.pos.z; T.done = !B.awake || B.state === 'dying'; }
  }
  ballHit(p) {
    if (this.here() === 'wm_blow' && this.blow?.ballHit(p)) return true;
    return false;
  }

  // ================================================================ each frame
  update(dt) {
    const g = this.game;
    if (this.fall && this.here() === 'wm_gallery') this.stepFall(dt);
    if (this.here() === 'wm_blow' && g.state === 'play' && !g.trans) this.stepBlow(dt);
  }

  // ================================================================ the journal and the pockets
  journalTitle() { return t('zo_j_title'); }
  journal() {
    const f = this.f, out = [];
    if (!this.open() || !(f.zo_heard || f.zo_reserved)) return out;
    out.push({ key: 'zo_j_shift', done: !!f.zo_done });
    if (!f.zo_done) {
      out.push({ key: 'zo_j_key', done: !!f.zo_key });
      if (f.zo_key) out.push({ key: 'zo_j_down', done: !!f.zo_down });
      if (f.zo_down) out.push({ key: 'zo_j_gant', done: (f.zo_gant || 0) >= 2 || !!f.zo_open });
      if ((f.zo_gant || 0) >= 2 || f.zo_down) out.push({ key: 'zo_j_way', done: !!f.zo_open });
    }
    if (f.zo_down || f.zo_blow) out.push({ key: 'zo_j_blow', done: !!f.zo_blow });
    return out;
  }
  items() { const f = this.f; return f.zo_key ? [{ id: 'zo_key', icon: 'key' }, ...(f.zo_done ? [] : [{ id: 'zo_bill', icon: 'leaflet' }])] : []; }
}
