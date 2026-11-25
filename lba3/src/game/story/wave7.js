// WAVE 7 (docs/lba-maturity/WAVE7.md; CONTENT-15H.md §3 H-17, H-18; cards EXPANSION_PLAN.md §4.5 OP-1 and OP-6). Not a
// chapter: the director (index.js) asks it beside the chapter in progress, as it asks wave4.js. Its pieces in the world
// are src/game/wave7world.js, its text text/wave7.js. Two side stories, both optional: nothing on the main path needs
// either, and neither changes a main-path rule.
//
// H-17 · Missing Deliveries (chapters 8–14 on Citadel: from Pippa's supplies in chapter 8 until the network ends)
//   1. Pippa at her stall (or Tim, wherever he is): her second cart for the depot shelter never came. Blankets and water
//      casks; she chalked SHELTER on every crate (one beside her stall shows her hand: the loop on the S).
//   2. The harbour's cargo lift (the opening's, not moved): its hook is down on a crate aboard the barge, stencilled
//      STATION; under the paint, Pippa's chalk. The barge's other crate has nothing under its stencil (the compare).
//      The lift's lever is clamped: HELD, UNCLAIMED GOODS, KEY AT THE BAGGAGE CLAIM. (Odile's ledger, optional, says how:
//      the lift crew restencilled them; the station never collected; the paper and the key went to Osk.)
//   3. The baggage claim: Osk holds them for the station: what's in them? (a choice: drill parts / blankets and water
//      casks / lamp oil and rope; a wrong one costs nothing). Right: never the station's; the back store opens off the
//      old conveyor's lever, which only listens to a kick.
//   4. The back store (a cage in the front hall): the lever is seized — a melee hit frees it; run out (the shutter rolls
//      up, the bales come out) or in (the wrong way: nothing lost). Inside: the lift's key on its hook; the back door,
//      unbolted, opens the back passage behind the house (it stays open: a way from the sea wall stair to the square).
//   5. The lift: the key off the clamp; Hoist, then Swing over and lower (swinging first only heels the barge; it can be
//      lowered back). The crate on the pier.
//   6. Pippa: Tim and Lulu take the cart; a clover leaf (kashes at nine). The shelter's doorway stocked with blankets
//      and casks; the lift's crate gone from the pier while the shelters are in use; Tim's and Pippa's lines after.
// H-18 · Dallan's Debt (chapter 14 after the bore's relay, and the ending's free play; Kesh)
//   1. Lumi's shade tore when the vent blew. Asked what she needs (not "Dallan should pay"): canvas, two poles, the top
//      ring back on its hook. 2. Dallan (at the bore, or in Kesh): "I can carry it." "No. I'll carry it." He is at the
//      sail with the canvas, the low corners tied. 3. The ball hooks the top ring (a ball target at the high pole's
//      hook). Lumi: "The sail's straight. That's something." No apology speech; Lumi is not won over.
//
// State (flags, new only; an old save has none: nothing is made up):
//   w7m_hook, w7m_labels, w7m_tag, w7m_ledger, w7m_claim, w7m_wrong (n), w7m_free, w7m_store, w7m_key, w7m_back,
//   w7m_unclamp, w7m_hoist, w7m_lift, w7m_done, w7m_piAfter, w7m_timAfter, w7m_osAfter;
//   w7d_paid (asked the wrong way once), w7d_need, w7d_dallan, w7d_up, w7d_luAfter, w7d_daAfter.
//   A lift or shutter moving is not saved: a load stands each where its flags put it.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { W7, buildLiftBits, buildStallCrate, buildBackStore, buildBackDoor, buildShelterStock, buildShade } from '../wave7world.js';
import { BAGGAGE_PLAN } from '../baggage.js';
import { shelterFrame, centreForWheel } from './shelters.js';
import '../text/wave7.js';

export const MD_KEYS = ['evacuation', 'council', 'throttle', 'ballastra', 'balances', 'survey', 'network'];
// the chapters in which the town still waits in the shelters (evacuation.js applyFlags: its props shown)
export const SHELTER_KEYS = [...MD_KEYS, 'shell', 'core'];
export const PAY = { clover: 1, at9: 15 };
export const LIFT = { rest: 0.2, up: 0.45, pier: 1.0, tUp: 2.4, tSwing: 3.6 };
// the depot shelter's frame, as evacuation.js builds it (DEPOT door, its wheel 1.7 m west, turned 1.4)
const DEPOT = { x: -90, z: -72, ry: 1.4 };
const DEPOT_C = centreForWheel(DEPOT.x - 1.7, DEPOT.z, DEPOT.ry);
export const DEPOT_F = shelterFrame(DEPOT_C.x, DEPOT_C.z, DEPOT.ry);
const DALLAN_KEYS = ['network', 'shell', 'core', 'home'];

export class Wave7 extends ChapterBase {
  constructor(story) { super(story); this.anim = null; this.posed = false; }
  get ck() { return this.story.cur?.key; }
  here() { return this.game.room?.id || 'citadel'; }
  built(id) { return this.game.regions?.built?.(id); }
  able() { const b = this.game.hero.body; return !b || b === 'twinsen'; }
  busy() { return !!this.anim; }
  pending(id) { return !!this.story.cur?.pendingTalk?.(id); }
  // H-17's window: from Pippa's supplies (chapter 8) until the network ends
  mdOpen() { const f = this.f, k = this.ck; return MD_KEYS.includes(k) && (k !== 'evacuation' || !!f.c8_pippa); }
  mdActive() { return this.mdOpen() && !this.f.w7m_done; }
  // H-18's window: the shade torn by the bore's vent (chapter 14, the relay held) until it is up again
  shadeTorn() { const f = this.f, k = this.ck; return DALLAN_KEYS.includes(k) && (k !== 'network' || !!f.c10_bore) && !f.w7d_up; }
  dOpen() { return this.shadeTorn() && this.here() === 'desert'; }

  // ================================================================ the cast (no new people)
  // asked before the chapters (index.js refreshCast): Dallan at Lumi's sail once he has brought the canvas, until it is up
  placeFirst(id) {
    if (id !== 'dallan') return undefined;
    const f = this.f;
    if (!f.w7d_dallan || !this.shadeTorn() || this.pending('dallan')) return undefined;
    const S = W7.shade; if (!S) return undefined;
    return { x: S.dallan.x, z: S.dallan.z, a: S.dallan.a, anim: null, track: null };
  }

  // ================================================================ the world
  decorate() { this.ensure(); this.applyWorld(); }
  regionBuilt(ids) { this.ensure(); this.applyWorld(); if (ids?.includes?.('desert') && this.f.w7d_dallan && this.shadeTorn()) this.story.refreshCast(); }
  ensure() {
    const g = this.game;
    if (g.world?.cargoLift) buildLiftBits(g);
    if (g.world?.stall) buildStallCrate(g);
    if (g.world?.houses) buildBackDoor(g);
    if (g.world?.root && !W7.stock) buildShelterStock(g, DEPOT_F);
    const B = this.built('baggage'); if (B && !W7.store) buildBackStore(B, BAGGAGE_PLAN, g.physics);
    const D = this.built('desert');
    if (D?.kesh?.sail && !W7.shade) { buildShade(D); this.shadeTarget(D); }
  }
  // the high ring's hook as a ball target of Desert Island (the ball's aim finds it while the ring waits for it)
  shadeTarget(D) {
    const S = W7.shade, f = this.f, self = this; if (!S || this._ringT) return;
    this._ringT = { x: S.hook.x, y: S.hook.y, z: S.hook.z, r: 0.75, material: 'wood', result: 'switch', get done() { return !(f.w7d_dallan && self.shadeTorn()); }, onHit: () => this.ringUp() };
    D.ballTargets.push(this._ringT);
  }
  applyFlags() {
    const f = this.f;
    if (f.w7m_wrong != null && !(Number.isInteger(f.w7m_wrong) && f.w7m_wrong >= 0)) delete f.w7m_wrong;
    // (each step implies the ones before it)
    if (f.w7m_done) f.w7m_lift = true;
    if (f.w7m_lift) { f.w7m_hoist = true; f.w7m_unclamp = true; }
    if (f.w7m_unclamp) f.w7m_key = true;
    if (f.w7m_key || f.w7m_back) f.w7m_store = true;
    if (f.w7m_store) f.w7m_free = true;
    if (f.w7m_free) f.w7m_claim = true;
    if (f.w7m_claim) f.w7m_hook = true;
    if (f.w7d_up) f.w7d_dallan = true;
    if (f.w7d_dallan) f.w7d_need = true;
    this.endAnim();
    this.ensure(); this.applyWorld();
  }
  applyWorld() {
    const f = this.f, A = this.mdActive(), open = this.mdOpen();
    // the lift: stalled with Pippa's crate aboard while the story is on, else as the opening left it
    const Lb = W7.lift;
    if (Lb && !this.anim) {
      const L = Lb.L;
      if (A) {
        L.pose(f.w7m_lift ? LIFT.pier : f.w7m_hoist ? LIFT.up : LIFT.rest, true); L.lever.rotation.z = 0.42;
        Lb.setOn(true); Lb.setPin(!f.w7m_unclamp); Lb.setCrate(true); this.posed = true;
      } else if (this.posed || (open && f.w7m_done) || Lb.L.crate.visible === false) {
        L.pose(1); Lb.setOn(false); Lb.setPin(false); Lb.setCrate(!(open && f.w7m_done)); this.posed = false;
      }
    }
    W7.stall?.setOn(A);
    W7.stock?.setOn(!!f.w7m_done && SHELTER_KEYS.includes(this.ck));
    const S = W7.store;
    if (S && !this.anim) {
      S.setShutter(f.w7m_store ? 1 : 0); S.setLever(f.w7m_store ? 1 : 0);
      S.setBales(f.w7m_done ? null : f.w7m_store ? 'out' : 'back');
      S.setPin(!f.w7m_key); S.setDoor(!!f.w7m_back);
      const R = this.built('baggage');
      if (R) { const has = R.exits.includes(this._exit); if (f.w7m_back && !has) R.exits.push(this._exit ||= { x: S.exit.x, z: S.exit.z, r: 0.55, to: 'w7-back-out' }); if (!f.w7m_back && has) R.exits.splice(R.exits.indexOf(this._exit), 1); }
    }
    W7.backDoor?.setOpen(!!f.w7m_back);
    W7.shade?.setState(this.shadeTorn() ? (f.w7d_dallan ? 'rigged' : 'torn') : 'whole');
  }
  // the back passage: the 'bug' house's back door leads into the back store; out of it, behind the house
  doors() {
    const D = W7.backDoor, S = W7.store;
    if (!this.f.w7m_back || !D) return [];
    return [{ house: 'bug-back', x: D.door.x, z: D.door.z, r: 0.8, room: 'baggage', spawn: S ? S.spawn : (R) => R.spawn }];
  }
  exitTo(to) {
    if (to !== 'w7-back-out') return null;
    const D = W7.backDoor; return D ? { ...D.out } : null;
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, f = this.f, here = this.here();
    if (!this.able() || this.busy() || h.actT > 0 || g.state !== 'play') return;
    if (here === 'citadel') {
      if (this.mdActive()) {
        const Lb = W7.lift;
        if (Lb) {
          // (the barge lies 1.5 m off the pier's edge, beside the lift's mast: its two crates are looked at from the lift's
          //  control, one look for the lift; once lowered, Pippa's crate on the pier on its own)
          if (f.w7m_lift) { const a = Lb.crateA(); consider(dist(a.x, a.z), 1.5, { kind: 'w7m_crA', x: a.x, z: a.z, label: 'p_look' }); }
          else consider(dist(Lb.ctrl.x, Lb.ctrl.z), 1.6, { kind: 'w7m_ctrl', x: Lb.ctrl.x, z: Lb.ctrl.z, label: f.w7m_key ? 'p_w7_lift' : 'p_look' });
        }
        const St = W7.stall; if (St) consider(dist(St.at.x, St.at.z), 1.3, { kind: 'w7m_stall', x: St.at.x, z: St.at.z, label: 'p_look' });
      }
      const D = W7.backDoor;
      if (D && !f.w7m_back) consider(dist(D.door.x, D.door.z), 1.2, { kind: 'w7m_backshut', x: D.door.x, z: D.door.z, label: 'p_look' });
      return;
    }
    if (here === 'baggage' && W7.store) {
      const S = W7.store, inside = S.inside(h.pos.x, h.pos.z);
      if (!inside && !f.w7m_store) consider(dist(S.lever.x, S.lever.z), 1.2, { kind: 'w7m_lever', x: S.leverAt.x, z: S.leverAt.z, label: f.w7m_free ? 'p_w7_kick' : 'p_look' });
      if (inside && !f.w7m_key) consider(dist(S.pin.x, S.pin.z), 1.2, { kind: 'w7m_key', x: S.pin.x, z: S.pin.z, label: 'p_w7_take' });
      if (inside && !f.w7m_back) consider(dist(S.door.x, S.door.z), 1.2, { kind: 'w7m_bolt', x: S.door.x, z: S.door.z, label: 'p_w7_bolt' });
    }
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !/^w7[md]_/.test(it.kind)) return false;
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'w7m_stall': return say(['w7m_stall_look']);
      case 'w7m_crA': return say(['w7m_crA_pier']);
      case 'w7m_ctrl': {
        if (!f.w7m_key) {
          // the crates under the hook (the compare: chalk under one stencil, nothing under the other), then the clamp's tag
          const lines = [];
          if (!f.w7m_hook) lines.push('w7m_crA_0', 'w7m_crB');
          else if (!f.w7m_labels) { lines.push('w7m_crA_1', 'w7m_crB', 'w7m_crA_2'); f.w7m_labels = true; g.audio.play('paper'); }
          lines.push(f.w7m_tag ? 'w7m_tag_again' : 'w7m_tag');
          f.w7m_tag = true;
          return say(lines, () => g.save(false));
        }
        if (!f.w7m_unclamp) {
          h.act?.('use', 0.7, null, 0.3); f.w7m_unclamp = true; W7.lift.setPin(false); g.audio.play('lever');
          return say(['w7m_unclamp'], () => { g.save(false); this.liftMenu(); });
        }
        return this.liftMenu();
      }
      case 'w7m_lever': {
        if (!f.w7m_claim) return say(['w7m_lev_no']);
        if (!f.w7m_free) { g.audio.play('deny'); return say(['w7m_lev_stuck']); }
        return this.leverMenu();
      }
      case 'w7m_key':
        h.act?.('pickup', 0.6, null, 0.3);
        f.w7m_key = true; W7.store.setPin(false); g.audio.play('tClick');
        g.found('key', 'it_w7m_key', () => this.chain([['hero', 'w7m_key']], () => g.save(false)));
        return true;
      case 'w7m_bolt':
        h.act?.('use', 0.7, null, 0.3);
        f.w7m_back = true; g.audio.play('door'); this.applyWorld();
        return say(['w7m_bolt'], () => g.save(false));
      case 'w7m_backshut': return say(['w7m_back_shut']);
    }
    return false;
  }
  liftMenu() {
    const g = this.game, f = this.f;
    const items = [];
    if (!f.w7m_hoist) items.push({ key: 'w7m_m_hoist', id: 'hoist' });
    items.push({ key: 'w7m_m_swing', id: 'swing' });
    if (f.w7m_hoist) items.push({ key: 'w7m_m_back', id: 'back' });
    items.push({ key: 'w7m_m_leave', id: 'leave' });
    g.openMenu('w7m_m_lift', items, (o) => {
      if (o.id === 'leave') return;
      if (o.id === 'hoist') { this.runLift(LIFT.rest, LIFT.up, LIFT.tUp, () => { f.w7m_hoist = true; this.chain([['hero', 'w7m_up']], () => g.save(false)); }); return; }
      if (o.id === 'back') { this.runLift(LIFT.up, LIFT.rest, LIFT.tUp, () => { f.w7m_hoist = false; this.chain([['hero', 'w7m_lowered_back']], () => g.save(false)); }); return; }
      if (!f.w7m_hoist) {
        // (the boom drags at a crate still on the barge: the barge heels, nothing moves)
        g.audio.play('deny'); g.camRig.shake?.(0.15);
        const B = W7.lift.L.barge, z0 = B.rotation.z; B.rotation.z = 0.08; setTimeout(() => { B.rotation.z = z0; }, 600);
        this.chain([['hero', 'w7m_swing_no']]);
        return;
      }
      this.runLift(LIFT.up, LIFT.pier, LIFT.tSwing, () => { f.w7m_lift = true; this.chain([['hero', 'w7m_lowered']], () => g.save(false)); });
    });
    return true;
  }
  // the lift's cycle from u0 to u1 over dur s (in play; the lever moves with it)
  runLift(u0, u1, dur, done) {
    this.anim = { kind: 'lift', u0, u1, dur, t: 0, done };
    this.game.audio.play('ropeCreak');
  }
  leverMenu() {
    const g = this.game, f = this.f, S = W7.store;
    g.openMenu('w7m_m_lever', [{ key: 'w7m_m_out', id: 'out' }, { key: 'w7m_m_in', id: 'in' }, { key: 'w7m_m_leave', id: 'leave' }], (o) => {
      if (o.id === 'leave') return;
      g.hero.act?.('use', 0.8, null, 0.3);
      if (o.id === 'in') {
        S.setLever(-1); g.audio.play('rattle');
        this.anim = { kind: 'in', t: 0, dur: 1.4, done: () => { S.setLever(0); this.chain([['hero', 'w7m_lev_in']]); } };
        return;
      }
      S.setLever(1); g.audio.play('ropeCreak');
      this.anim = { kind: 'out', t: 0, dur: 2.0, done: () => { f.w7m_store = true; this.applyWorld(); this.chain([['hero', 'w7m_lev_out']], () => g.save(false)); } };
    });
    return true;
  }
  // a kick (story.meleeHit): the seized lever
  meleeHit({ inArc, hitSet }) {
    const f = this.f, g = this.game, S = W7.store;
    if (this.here() !== 'baggage' || !S || f.w7m_free || f.w7m_store || hitSet?.has(S)) return false;
    if (!inArc(S.leverAt.x, S.leverAt.z, 0.6)) return false;
    hitSet?.add(S);
    if (!f.w7m_claim) { g.impact(S.leverAt.x, 0.9, S.leverAt.z, 'machine', 'blocked'); return true; }
    f.w7m_free = true;
    g.impact(S.leverAt.x, 0.9, S.leverAt.z, 'machine', 'hit'); S.setLever(0.3); setTimeout(() => S.setLever(0), 250);
    this.chain([['hero', 'w7m_lev_kick']], () => g.save(false));
    return true;
  }
  ringUp() {
    const g = this.game, f = this.f;
    if (f.w7d_up) return;
    f.w7d_up = true;
    g.audio.play('chest');
    this.applyWorld();
    // (Dallan says his line where he stands, by the sail; then the chapter has him again)
    const lu = this.speaker('weaver'), da = this.speaker('dallan');
    this.chain([...(lu?.present ? [['weaver', 'w7d_lu_up']] : []), ...(da?.present ? [['dallan', 'w7d_da_up']] : [])], () => { g.save(false); this.story.refreshCast(); });
  }

  // ================================================================ the people (asked before the chapter's own talk)
  talkFirst(npc) {
    const id = npc?.def?.id, g = this.game, f = this.f;
    if (!id || !this.able() || this.busy()) return false;
    const c = (lines, done) => { npc.engage?.(); this.chain(lines.map((l) => (Array.isArray(l) ? l : [id, l])), () => { npc.release?.(); done?.(); }); return true; };
    switch (id) {
      // ---- H-17
      case 'pippa': {
        if (!this.mdOpen() || this.pending('pippa')) return false;
        if (!f.w7m_hook) return c(['w7m_pi_hook1', 'w7m_pi_hook2', ['hero', 'w7m_tw_hook']], () => { f.w7m_hook = true; g.save(false); this.applyWorld(); });
        if (f.w7m_lift && !f.w7m_done) return c(['w7m_pi_done1', 'w7m_pi_done2'], () => this.deliver());
        if (f.w7m_done && !f.w7m_piAfter) return c(['w7m_pi_after'], () => { f.w7m_piAfter = true; });
        return false;
      }
      case 'tim': {
        if (this.pending('tim') || (f.c8_gap && !f.c8_depot)) return false;
        if (this.mdOpen() && !f.w7m_hook) return c(['w7m_tim_hook', ['hero', 'w7m_tw_hook']], () => { f.w7m_hook = true; g.save(false); this.applyWorld(); });
        if (f.w7m_done && !f.w7m_timAfter && SHELTER_KEYS.includes(this.ck)) return c(['w7m_tim_after'], () => { f.w7m_timAfter = true; });
        return false;
      }
      case 'odile':
        if (!this.mdActive() || f.w7m_ledger || !(f.w7m_hook && (f.w7m_labels || f.w7m_tag))) return false;
        return c(['w7m_od_1', 'w7m_od_2'], () => { f.w7m_ledger = true; g.save(false); });
      case 'osk': return this.osk(npc, c);
      // ---- H-18
      case 'weaver': return this.lumi(npc, c);
      case 'dallan': return this.dallan(npc, c);
    }
    return false;
  }
  osk(npc, c) {
    const f = this.f, g = this.game;
    if (f.w7m_back && f.w7m_done && !f.w7m_osAfter) return c(['w7m_os_after'], () => { f.w7m_osAfter = true; });
    if (!this.mdActive() || !f.w7m_hook) return false;
    if (f.w7m_claim) { if (f.w7m_store) return false; return c(['w7m_os_wait']); }
    npc.engage?.();
    this.chain([['hero', 'w7m_tw_osk'], ['osk', 'w7m_os_1']], () => { npc.release?.(); this.claimMenu(); });
    return true;
  }
  claimMenu() {
    const g = this.game, f = this.f;
    g.openMenu('w7m_m_what', [{ key: 'w7m_m_drill', id: 'drill' }, { key: 'w7m_m_blank', id: 'blank' }, { key: 'w7m_m_oil', id: 'oil' }, { key: 'w7m_m_later', id: 'later' }], (o) => {
      if (o.id === 'later') return;
      if (o.id !== 'blank') { f.w7m_wrong = (f.w7m_wrong || 0) + 1; this.chain([['osk', 'w7m_os_wrong']], () => g.save(false)); return; }
      this.chain([['osk', 'w7m_os_right'], ['osk', 'w7m_os_2']], () => { f.w7m_claim = true; g.save(false); });
    });
  }
  // Pippa sends Tim and Lulu with the cart: the crate and the bales go to the shelter; her clover leaf
  deliver() {
    const g = this.game, f = this.f, h = g.hero;
    f.w7m_done = true;
    const clover = h.clovers < 9;
    if (clover) { h.clovers++; g.hud.toast('w7m_toast_clover'); } else { h.coins += PAY.at9; g.hud.toast('w7m_toast_kashes', { n: PAY.at9 }); }
    g.audio.play('coin'); g.hud.stats?.(h);
    this.applyWorld(); g.save(false);
  }
  lumi(npc, c) {
    const f = this.f, g = this.game;
    if (f.w7d_up && !f.w7d_luAfter && this.here() === 'desert') return c(['w7d_lu_after'], () => { f.w7d_luAfter = true; });
    if (!this.dOpen()) return false;
    if (f.w7d_dallan) return c(['w7d_lu_rigged']);
    if (f.w7d_need) return c(['w7d_lu_wait']);
    npc.engage?.();
    this.chain([['weaver', 'w7d_lu_0']], () => {
      npc.release?.();
      g.openMenu('w7d_m_ask', [{ key: 'w7d_m_pay', id: 'pay' }, { key: 'w7d_m_need', id: 'need' }, { key: 'w7d_m_leave', id: 'leave' }], (o) => {
        if (o.id === 'leave') return;
        if (o.id === 'pay') { f.w7d_paid = true; this.chain([['weaver', 'w7d_lu_pay']], () => g.save(false)); return; }
        this.chain([['weaver', 'w7d_lu_need']], () => { f.w7d_need = true; g.save(false); });
      });
    });
    return true;
  }
  dallan(npc, c) {
    const f = this.f;
    if (f.w7d_up && !f.w7d_daAfter && this.here() === 'desert') return c(['w7d_da_after'], () => { f.w7d_daAfter = true; });
    if (!this.dOpen() || !f.w7d_need) return false;
    if (this.ownFirst(npc)) return true;   // (TALK-ORDER: the chapter's own talk with him first)
    if (f.w7d_dallan) return c(['w7d_da_rigged']);
    return c([['hero', 'w7d_tw_tell'], 'w7d_da_key', ['hero', 'w7d_tw_carry'], 'w7d_da_carry'], () => {
      f.w7d_dallan = true; this.game.save(false); this.applyWorld(); this.story.refreshCast();
    });
  }

  // ================================================================ each frame: the lift, the shutter, the bales
  update(dt) {
    // (a new chapter, Pippa's supplies, the bore's relay held: the pieces follow; nothing else changes them meanwhile)
    const f = this.f, sig = `${this.ck}|${!!f.c8_pippa}|${!!f.c10_bore}`;
    if (sig !== this._sig) { this._sig = sig; if (!this.anim) { this.applyWorld(); if (f.w7d_dallan) this.story.refreshCast(); } }
    const A = this.anim; if (!A) return;
    A.t += dt;
    const k = Math.min(1, A.t / A.dur);
    if (A.kind === 'lift') W7.lift.L.pose(A.u0 + (A.u1 - A.u0) * k, true);
    else if (A.kind === 'out') { const S = W7.store; S.setShutter(Math.min(1, k * 1.6)); S.baleX(S.BALES.back + (S.BALES.out - S.BALES.back) * Math.max(0, (k - 0.35) / 0.65)); }
    else if (A.kind === 'in') { const S = W7.store; S.baleX(S.BALES.back - Math.sin(k * Math.PI) * 0.12); }
    if (k >= 1) { this.anim = null; A.done?.(); }
  }
  endAnim() { this.anim = null; }

  // ================================================================ the journal and the pockets
  journal() {
    const f = this.f, out = [];
    if (f.w7m_hook && (this.mdOpen() || f.w7m_done)) {
      const L = [{ key: 'w7m_j_hook', done: !!f.w7m_done }, { key: 'w7m_j_labels', done: !!f.w7m_labels || !!f.w7m_lift }];
      if (f.w7m_tag || f.w7m_claim) L.push({ key: 'w7m_j_key', done: !!f.w7m_key });
      if (f.w7m_key) L.push({ key: 'w7m_j_lift', done: !!f.w7m_lift });
      if (f.w7m_lift) L.push({ key: 'w7m_j_done', done: !!f.w7m_done });
      out.push({ title: t('w7m_j_title'), lines: L });
    }
    if (f.w7d_paid || f.w7d_need) {
      const L = [{ key: 'w7d_j_ask', done: !!f.w7d_need }];
      if (f.w7d_need) L.push({ key: 'w7d_j_dallan', done: !!f.w7d_dallan });
      if (f.w7d_dallan) L.push({ key: 'w7d_j_ring', done: !!f.w7d_up });
      out.push({ title: t('w7d_j_title'), lines: L });
    }
    return out;
  }
  items() {
    const f = this.f;
    return f.w7m_key && !f.w7m_unclamp ? [{ id: 'w7m_key', icon: 'key' }] : [];
  }
}
