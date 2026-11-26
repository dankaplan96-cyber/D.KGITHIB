// CAMPAIGN-3 (the user's treatment of 11.11.2026, section 3 "Zeelich — a town that needs the project"): chapter 3's
// arrival, between the spaceport and Baldino. Not a chapter: story/chapter2.js owns it and asks it first.
//
// Twinsen lands with the gauge's strip from Citadel's pump room and a name off its plate: IRSA'S PUMP WORKS, MILL LANE.
// At the bridge's mouth Brel, a docker, carries the stores landed there to the hatch under the cistern lift, and gives
// the way: left at the mill, the brass wheel on a mast (seen from there). The lift (src/game/zlift.js) has stopped half
// way with the quarter's water cart on its deck; Kell, its operator, holds the brake and will not let it move with the
// cart loose and the dockers working below. Twinsen takes the stair to the upper landing, lets the frame's safety chain
// down onto the cart (the hand wheel on the post) and rings the landing bell. Kell clears the lane and calls the
// platform for power: Vesk answers on the speaking tube and gives the lift the mill line; Twinsen throws the feed
// switch on the motor house, the deck comes down, he steps on beside the cart and rides up with it, shoves it along
// its rails to the cistern's filler and opens its cock. The quarter's standpipe runs: Brel fills up, Kell thanks him.
// Irsa's bench runs off the cistern: she knows her No. 14's strip, and lets him set her test pump No. 9 to it and crank
// it — the same rhythm, but the needle kicks the other way: a pump pushes, the strip is pushed. Something below is
// knocking back. Then Baldino, who would not start without that proof.
//
// Flags (new, saved): zt_v (a game that landed with the strip), zt_seen, zt_brel, zt_kell, zt_hook, zt_bell, zt_feed,
// zt_ride, zt_shove, zt_water, zt_kellThanks, zt_irsa, zt_irsa2, zt_bench, zt_fall. A save without zt_v (from before,
// or one that never took the strip) finds the lift mended and the cistern full, and the chapter plays as it did.
//
// THE SECOND SHIFT (P109, docs/SECOND-SHIFT.md; optional): Kell's lunch. Once the water is in and Kell has thanked him,
// Twinsen coming by the lift hears Brel at the tap pass on Mother Snuff's word (her bakery is out of earshot): Kell's
// bread is out (warm if her oven's flue was cleared, story/zeelife.js; yesterday's if not). Kell won't leave the
// handle: Brel's barrow goes up next. Twinsen takes the handle for one trip: Kell lets the deck down, Brel wheels the
// barrow on, Kell goes for his bread. At the handle (his keys: up, down, let go) the deck's lip can't be seen against the
// landing; a strip of cloth tied on the haul rope and a nail in the batten beside it can: cloth to the nail and the deck
// is level (zlift.js). Stopped there, Brel's wheel rolls over the joint (its own sound, the barrow seen to cross). A near
// miss: the wheel catches the lip and jolts back, Brel calls the way ("Up a touch!"; the second time he names the cloth
// and the nail) and the deck is nudged from where it is: nothing starts over. Let go and walk off, and Kell comes back
// with his bread and waits by the lever; the trip is still his to finish. Kell eats. No reward, no meter.
// Flags (saved): zt_lunchCall (the word passed on, the deck let down for the barrow), zt_lunchGo (Kell went for his
// bread), zt_lunch (the trip made). Without zt_water the lunch never comes up; a save from before has none of them.
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import { ZH } from '../zhomes.js';
import '../text/thread.js';

const DIALS = ['steady', 'double', 'triple'];
// THE SECOND SHIFT: how near the landing is level (m; the knot and the nail's head overlap), how far off a stop still
// has Brel try his wheel (beyond it he waits, or says to keep her coming)
const LEVEL = 0.07, NEAR = 0.45;

// an NPC's walk along points (the story's own walks on Mill Lane): he gives Twinsen room for a moment, then goes on
export function stepWalk(g, W, dt) {
  const n = W.n, to = W.pts[0];
  if (!to) return true;
  const dx = to.x - n.pos.x, dz = to.z - n.pos.z, d = Math.hypot(dx, dz);
  W.t = (W.t || 0) + dt;
  if (d < 0.25 || W.t > 14) { if (W.t > 14) { n.pos.x = to.x; n.pos.z = to.z; } W.pts.shift(); W.t = 0; if (!W.pts.length) { if (to.a != null) n.angle = to.a; n.rig.play('idle'); n.rig.update(dt, 0); n.sync(); return true; } return false; }
  const h = g.hero;
  if (Math.hypot(h.pos.x - n.pos.x - (dx / d) * 0.8, h.pos.z - n.pos.z - (dz / d) * 0.8) < 0.75 && (W.wait = (W.wait || 0) + dt) < 2.5) { n.rig.play('idle'); n.rig.update(dt, 0); n.sync(); return false; }
  const spd = W.spd || 1.3, want = Math.atan2(dx, dz);
  n.angle += Math.atan2(Math.sin(want - n.angle), Math.cos(want - n.angle)) * Math.min(1, dt * 8);
  g.physics.move(n, Math.sin(n.angle) * spd * dt, Math.cos(n.angle) * spd * dt); g.physics.fall?.(n, dt);
  n.rig.play('walk'); n.rig.update(dt, spd); n.sync();
  return false;
}

export class LiftThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.dial = 0; this.walks = []; this.tweens = []; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.zt_v; }
  get L() { return this.game.regions?.built?.('zeelich')?.lift; }
  // the arrival's part is over (or was never in this save): Baldino will talk
  get done() { return !this.f.zt_v || !!this.f.zt_bench; }
  get open() { return this.on && !this.done && this.ch.isCur(); }

  // ---------------------------------------------------------------- state
  begin() { if (this.f.ct_strip) this.f.zt_v = 1; }
  lookFor(f = this.f) {
    if (!f.zt_v || !this.ch.isCur()) return { deck: 'top', hooked: false, fed: true, cart: 'filler', water: true };
    if (f.zt_lunchCall && !f.zt_lunch) return { deck: 'low', hooked: false, fed: true, cart: 'filler', water: true, dial: this.dial };   // (THE SECOND SHIFT: down for the barrow)
    return { deck: f.zt_ride ? 'top' : f.zt_feed ? 'low' : 'half', hooked: !!f.zt_hook && !f.zt_ride, fed: !!f.zt_feed, cart: f.zt_shove || f.zt_water ? 'filler' : 'deck', water: !!f.zt_water, dial: this.dial };
  }
  applyFlags() {
    this.later = []; this.pending = null; this.brel = null; this.busy = false; this.dial = 0;
    // (THE SECOND SHIFT: the lunch's moment as the flags have it: nothing in hand, nobody on the way)
    if (this.hold) this.hold = null;
    if (this._holdFn && this.game.heroHold === this._holdFn) this.game.heroHold = null;
    for (const W of this.walks) W.n.controlled = false;
    this.walks = []; this.tweens = []; this.lunchPh = null; this.kellAway = false; this.deckDown = false; this.misses = 0; this.saidMore = false;
    this.game.regions.whenBuilt('zeelich', (Z) => {
      const L = Z.lift; if (!L) return;
      L.setState(this.lookFor()); L.shiftHook = () => this.shiftLook();
      L.setBarrow(this.on && this.ch.isCur() && this.f.zt_lunch ? L.shift.barrowOff : null, L.top);   // (unloaded at the service door)
    });
  }
  // THE SECOND SHIFT: what the lane shows for the story, every frame (zlift.js asks): Brum's coat on its peg once he has run
  // the lift (after chapter 9), Brel's barrow only in this chapter's lunch
  shiftLook() {
    const L = this.L, f = this.f;
    if (!L) return;
    const coat = f.cn_brum === true && this.story.cur?.key !== 'council';
    if (L.coatShown() !== coat) L.setCoat(coat);
    if (L.barrowAt().shown && !(this.on && this.ch.isCur() && f.zt_lunchCall)) L.setBarrow(null);
  }
  lunchOn() { const f = this.f; return this.on && this.ch.isCur() && !!f.zt_water && !!f.zt_kellThanks; }
  // THE SECOND SHIFT, free play (the brief: "Kell can finally eat warm bread in the bakery while the lift runs outside"):
  // after the ending, once Brum has the handle (chapter 9's lesson, cn_brum) and Mother Snuff's oven is hot (the Second
  // Bake, zl_crate), Kell eats his bread in her bakehouse; nobody else stands at his lever (Brum has it: council.js). No
  // banner, no scene: he is just there. A game without Brum's lesson or with her oven cold keeps him where he was.
  breadTime() { const f = this.f; return this.story.cur?.key === 'home' && f.cn_brum === true && !!f.zl_crate; }
  // his loaf in his hand while he is there (asked every frame by story/zeelife.js, which runs in every chapter)
  kellBread() {
    const n = this.ch.npc('zl_kell'), on = !!n?.present && this.breadTime();
    if (on === !!this._bread && (!on || this._loaf?.parent)) return;
    this._bread = on; this.loaf(n, on);
  }
  lunchOpen() { return this.lunchOn() && !!this.f.zt_lunchCall && !this.f.zt_lunch; }
  // where Brel stands behind his barrow (its heading a: 0 = the wheel west), facing it
  behind(p) { const b = this.L.shift.behind; return { x: p.x + Math.cos(p.a || 0) * b, z: p.z - Math.sin(p.a || 0) * b, a: Math.atan2(-Math.cos(p.a || 0), Math.sin(p.a || 0)) }; }
  push() { this.L?.setState(this.lookFor()); }
  place(id) {
    const f = this.f, L = this.L;
    if (!L) return undefined;
    const S = L.spots, cur = this.ch.isCur(), stuck = this.on && cur && !f.zt_bell, SH = L.shift;
    const walking = (n) => !!n && (this.walks.some((W) => W.n === n) || this.tweens.some((T) => T.n === n));
    { const n = (id === 'zl_kell' || id === 'zl_brel') && this.ch.npc(id); if (walking(n)) return { x: n.pos.x, y: n.pos.y, z: n.pos.z, a: n.angle, pin: true }; }   // (THE SECOND SHIFT: on a walk of this thread's: where he is)
    switch (id) {
      case 'zl_kell':
        // THE SECOND SHIFT: off for his bread while Twinsen has the handle; back by the lever with it; after chapter 9
        // Brum has the handle and Kell sees to the cart up at the cistern
        if (this.lunchOpen()) { if (this.kellAway) return null; if (f.zt_lunchGo) return { ...SH.kellAside }; }
        // (free play after the ending, Brum at the handle and Mother Snuff's oven hot: in her bakehouse with his bread; the
        //  bakehouse not built yet: he waits for it, Story.refreshCast)
        if (!cur && this.breadTime()) { const B = this.game.regions?.built?.('zh_bakery'); const s = B && ZH.zh_bakery?.npcSpots?.kell; return s ? { ...s } : undefined; }
        if (!cur && f.cn_brum === true && this.story.index > this.story.chapters.findIndex((c) => c.key === 'council')) return { ...SH.kellCart, y: L.top, anim: 'tinker' };
        return { ...S.kell, anim: this.on && cur && !f.zt_ride ? 'use' : null };   // (his hand on the brake until the deck is up)
      case 'zl_brel':
        if (this.brel) return { x: this.brel.n.pos.x, z: this.brel.n.pos.z, a: this.brel.n.angle };   // (on his way: where he is)
        if (this.lunchOn() && f.zt_lunchCall) {
          if (f.zt_lunch) return { ...this.behind(SH.barrowOff), y: L.top, anim: 'use' };   // (on the terrace, unloading at the service door)
          if (this.lunchPh === 'ready' || this.lunchPh === 'hold' || !this.lunchPh) return { ...this.behind(SH.barrowDeck), y: L.deckY, pin: true };   // (on the deck behind his barrow)
        }
        return stuck ? { ...S.brelA } : this.on && cur && !f.zt_water ? { ...S.brelClear } : { ...S.brelTap, anim: 'kneelWork' };   // (NO-AIR: down at the trough under the running spout, his hands at its rim; a standing 'use' had nothing at that height before him and was stood down)
      case 'zl_irsa': return { ...S.irsa };
    }
    return undefined;
  }
  objective() {
    const f = this.f, ch = this.ch;
    if (!this.open) return null;
    if (f.zt_water) return f.zt_irsa2 ? ch.goal('zt_obj_bench') + ch.sub(this.dial === 2, 'zt_sub_dial') + ch.sub(false, 'zt_sub_crank') : ch.goal('zt_obj_bench');
    if (f.zt_kell || f.zt_hook || f.zt_irsa) return ch.goal('zt_obj_lift') + ch.sub(!!f.zt_hook, 'zt_sub_hook') + ch.sub(!!f.zt_bell, 'zt_sub_bell') + (f.zt_bell ? ch.sub(!!f.zt_feed, 'zt_sub_feed') + ch.sub(!!f.zt_ride, 'zt_sub_ride') + ch.sub(!!f.zt_water, 'zt_sub_cart') : '');
    return ch.goal('zt_obj_find');
  }
  journal() { const f = this.f; return this.on ? [{ key: 'zt_j_lift', done: !!f.zt_water }, { key: 'zt_j_bench', done: !!f.zt_bench }, { key: 'zt_j_lunch', done: !!f.zt_lunch }].filter((l) => l.done) : []; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, L = this.L, h = g.hero;
    if (!L || g.room?.id !== 'zeelich') return;
    const up = Math.abs(h.pos.y - L.top) < 0.6, down = Math.abs(h.pos.y - L.y0) < 0.6;
    if (up) consider(dist(L.cistern.x, L.cistern.z), 2.6, { kind: 'zt_cistern', label: 'p_read' });
    if (down) { consider(dist(L.standpipe.x, L.standpipe.z), 1.5, { kind: 'zt_standpipe', label: 'p_look' }); consider(dist(L.sign.x, L.sign.z), 1.6, { kind: 'zt_sign', label: 'p_read' }); }
    // THE SECOND SHIFT: the handle for the lunch trip (in his hands: the prompt says how to let go)
    if (this.lunchOpen() && down) {
      if (this.hold) consider(-1, 3, { kind: 'zt_letgo', label: 'p_letgo' });   // (ahead of anyone: the handle is in his hands)
      else if (this.lunchPh === 'ready' && !this.busy && !this.kellWalking()) consider(dist(L.handle.x, L.handle.z), 1.5, { kind: 'zt_handle', label: 'p_handle' });
    }
    if (!this.open || this.busy) return;
    if (!f.zt_bell && up) {
      if (!f.zt_hook) consider(dist(L.hook.x, L.hook.z), 1.3, { kind: 'zt_hook', label: 'p_hook' });
      consider(dist(L.bell.x, L.bell.z), 1.3, { kind: 'zt_bell', label: 'p_zt_bell' });
    }
    if (f.zt_bell && !f.zt_feed && down) consider(dist(L.feed.x, L.feed.z), 1.4, { kind: 'zt_feed', label: 'p_feed' });
    if (f.zt_feed && !f.zt_ride && !L.moving && Math.abs(L.deckY - L.low) < 0.05 && h.pos.y < L.y0 + 0.6) consider(dist(L.deck.x, L.deck.z), 2.3, { kind: 'zt_ride', label: 'p_ride' });
    if (f.zt_ride && !f.zt_shove && up) consider(dist(L.cart.x, L.cart.z), 1.7, { kind: 'zt_cart', label: 'p_cart' });
    if (f.zt_shove && !f.zt_water && up) consider(dist(L.cock.x, L.cock.z), 1.6, { kind: 'zt_cock', label: 'p_cock' });
    if (f.zt_irsa2 && !f.zt_bench && down) {
      consider(dist(L.dial.x, L.dial.z), 1.1, { kind: 'zt_dial', label: 'p_dial' });
      consider(dist(L.crank.x, L.crank.z), 1.1, { kind: 'zt_crank', label: 'p_crank' });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, ch = this.ch, L = this.L;
    const at = (p, fn, dur = null) => handTo(h, p, fn, dur);   // (his hand on the thing: story/reach.js)
    switch (it.kind) {
      case 'zt_cistern': ch.chain([['hero', !this.on || !ch.isCur() || f.zt_water ? 'zt_cistern_full' : 'zt_cistern']]); return true;
      case 'zt_standpipe': ch.chain([['hero', !this.on || !ch.isCur() || f.zt_water ? 'zt_standpipe' : 'zt_standpipe_dry']]); return true;
      case 'zt_sign': ch.chain([['hero', 'zt_works_sign']]); return true;
      case 'zt_handle': this.takeHandle(); return true;
      case 'zt_letgo': this.letGo(); return true;
      case 'zt_hook':
        // the hand wheel on the post lets the frame's chain down: the hook drops onto the cart's ring
        at(L.hook, () => { L.turnHook(); g.audio.play('winch', L.hook); this.after(1.1, () => g.audio.play('clunk', L.cart)); this.pending = { t: 1.3, fn: () => { f.zt_hook = true; L.state.hooked = true; ch.chain([['hero', 'zt_hook_1']], () => { g.updateObjective(); g.save(false); }); } }; }, 1.7);
        return true;
      case 'zt_bell':
        if (!f.zt_hook) { ch.chain([['hero', 'zt_bell_first']]); return true; }
        at(L.bell, () => { L.ringBell(); for (let i = 0; i < 3; i++) this.after(i * 0.4, () => g.audio.play('clang', L.bell)); this.pending = { t: 1.5, fn: () => this.belled() }; }, 1.4);
        return true;
      case 'zt_feed':
        at(L.feed, () => {
          f.zt_feed = true; L.state.fed = true; L.running = true; g.audio.play('lever', L.feed); g.audio.play('motor', L.feed);
          this.busy = true;
          ch.chain([['hero', 'zt_feed_1'], ['zl_kell', 'zt_kell_ride']], () => {
            // the deck comes down to the landing (the chain paying out with it)
            g.audio.play('liftWinch', L.deck);
            L.moveDeck(L.low, 3.2, [], () => { this.busy = false; g.audio.play('clunk', L.deck); this.story.refreshCast(); g.updateObjective(); g.save(false); });
          });
        });
        return true;
      case 'zt_ride': this.ride(); return true;
      case 'zt_cart':
        // a shove on its bar: it rolls along the rails to the filler's stop
        at(L.cart, () => {
          f.zt_shove = true; this.busy = true; g.audio.play('thump', L.cart); this.roll = { t: 0 };
          ch.chain([['hero', 'zt_cart_1']]);
        });
        return true;
      case 'zt_cock': at(L.cock, () => { g.audio.play('valve', L.cock); this.busy = true; this.tip = { t: 0 }; }); return true;
      case 'zt_dial':
        at(L.dial, () => {
          this.dial = (this.dial + 1) % 3; L.state.dial = this.dial; L.setState({ ...L.state });
          g.audio.play('select'); ch.chain([['hero', 'zt_dial_' + DIALS[this.dial]]], () => g.updateObjective());
        });
        return true;
      case 'zt_crank':
        at(L.crank, () => {
          // three turns: the test pump beats as its dial is set, the needle kicking forward with each beat
          L.spinCrank(3); g.audio.play('winch', L.crank);
          const n = this.dial + 1, good = this.dial === 2;
          for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) this.after(0.5 + r * 1.15 + i * 0.25, () => { L.kick(1); g.audio.play('thump', L.bench); });
          this.pending = { t: 3.1, fn: () => {
            if (!good) { ch.chain([['hero', 'zt_crank_wrong']]); return; }
            ch.chain([['hero', 'zt_crank_right'], ['zl_irsa', 'zt_irsa_5'], ['hero', 'zt_tw_irsa'], ['zl_irsa', 'zt_irsa_6']], () => { f.zt_bench = true; g.updateObjective(); g.save(false); });
          } };
        }, 2.6);
        return true;
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    const cur = this.on && ch.isCur();
    // THE SECOND SHIFT: the lunch trip's words (Kell: the handle is Twinsen's for the asking; back with his bread, eating)
    if (this.lunchOn() && f.zt_lunchCall && (id === 'zl_kell' || id === 'zl_brel')) {
      if (id === 'zl_kell') {
        if (f.zt_lunch) return c([['zl_kell', 'zt_kell_lunch_after']]);
        if (this.lunchPh === 'ready' && !f.zt_lunchGo && !this.busy) { this.takeHandle(); return true; }
        return c([['zl_kell', f.zt_lunchGo ? 'zt_lunch_kell_eat' : 'zt_lunch_kell_wait']]);
      }
      return c([['zl_brel', f.zt_lunch ? 'zt_lunch_brel_after' : 'zt_lunch_brel_wait']]);
    }
    switch (id) {
      case 'zl_brel':
        if (!cur) return c([['zl_brel', 'zt_brel_idle']]);
        if (!f.zt_brel) return c([['zl_brel', 'zt_brel_1'], ['zl_brel', 'zt_brel_2']], () => { f.zt_brel = true; g.updateObjective(); g.save(false); });
        return c([['zl_brel', f.zt_water ? (f.zt_bench ? 'zt_brel_after' : 'zt_brel_water') : 'zt_brel_3']]);
      case 'zl_kell':
        if (!cur) return c([['zl_kell', this.breadTime() ? 'zt_kell_bread' : this.story.cur?.key === 'home' ? 'zt_kell_home' : this.on ? (f.c2_veskDown ? 'zt_kell_later' : 'zt_kell_after') : 'zt_kell_idle']]);   // (DIALOGUE-2: the epilogue's word; THE SECOND SHIFT: at his bread; KELL-LINES: later chapters reach here through zeelife.js talkFirst)
        if (!f.zt_kell && !f.zt_bell) return c([['zl_kell', 'zt_kell_1'], ['hero', 'zt_tw_kell'], ['zl_kell', 'zt_kell_2'], ['zl_kell', 'zt_kell_3']], () => { f.zt_kell = true; g.updateObjective(); g.save(false); });
        if (!f.zt_bell) return c([['zl_kell', 'zt_kell_wait']]);
        if (!f.zt_feed) return c([['zl_kell', 'zt_kell_wait2']]);
        if (!f.zt_water) return c([['zl_kell', 'zt_kell_wait3']]);
        if (!f.zt_kellThanks) return c([['zl_kell', 'zt_kell_done']], () => { f.zt_kellThanks = true; g.save(false); });
        return c([['zl_kell', f.c2_veskDown ? 'zt_kell_later' : 'zt_kell_after']]);
      case 'zl_irsa':
        if (!cur) return c([['zl_irsa', this.story.cur?.key === 'home' ? 'zt_irsa_home' : this.on ? (f.c2_veskDown ? 'zt_irsa_later' : 'zt_irsa_after') : 'zt_irsa_idle']]);
        if (f.zt_bench) return c([['zl_irsa', f.c2_veskDown ? 'zt_irsa_later' : 'zt_irsa_after']]);
        if (!f.zt_water) { if (f.zt_irsa) return c([['zl_irsa', 'zt_irsa_wait']]); return c([['zl_irsa', 'zt_irsa_1'], ['zl_irsa', 'zt_irsa_2']], () => { f.zt_irsa = true; g.updateObjective(); g.save(false); }); }
        if (!f.zt_irsa2) return c([['zl_irsa', 'zt_irsa_3'], ['zl_irsa', 'zt_irsa_4']], () => { f.zt_irsa2 = true; g.updateObjective(); g.save(false); });
        return c([['zl_irsa', 'zt_irsa_4']]);
      case 'baldino':
        // he will not start without the proof: Irsa's bench first
        if (this.open && !f.c2_plan) return c([['baldino', 'zt_bal_first']], () => { f.zt_bal = true; g.updateObjective(); g.save(false); });
        return false;
    }
    return false;
  }

  // ---------------------------------------------------------------- the scenes
  after(t, fn) { (this.later ||= []).push({ t, fn }); }
  // the bell rung: Kell clears the lane, the dockers stand off, and the platform answers on the speaking tube
  belled() {
    const g = this.game, f = this.f, ch = this.ch;
    f.zt_bell = true;
    this.brelTo('brelClear');
    ch.chain([['zl_kell', 'zt_kell_bell'], ['zl_brel', 'zt_brel_clear'], ['veskhorn', 'zt_vesk_1'], ['veskhorn', 'zt_vesk_2'], ['zl_kell', 'zt_kell_feed']], () => { g.updateObjective(); g.save(false); },
      (i, id) => { if (id === 'veskhorn') g.audio.play('radio', this.L.feed); });
  }
  // he steps onto the deck beside the cart, and Kell takes them both up
  ride() {
    const g = this.game, f = this.f, h = g.hero, L = this.L;
    this.busy = true;
    const up = () => {
      g.setState('cutscene');
      h.angle = -Math.PI / 2;   // (at the cart's bar, facing it)
      g.audio.play('lever', L.spots.kell); g.audio.play('liftWinch', L.deck);
      g.cutscene = (dt) => { h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync(); };
      L.moveDeck(L.top, 4.6, [h], () => {
        g.cutscene = null; g.setState('play');
        f.zt_ride = true; f.zt_hook = false; L.state.hooked = false; L.state.deck = 'top'; L.setHook(0);
        g.audio.play('clunk', L.deck); this.busy = false;
        this.story.refreshCast();
        this.ch.chain([['hero', 'zt_ride_top']], () => { g.updateObjective(); g.save(false); });
      });
    };
    // (onto the deck from the lane, to his place at the cart's bar)
    h.walkTo([{ x: L.ride.x + 1.0, z: L.ride.z }, L.ride], { a: -Math.PI / 2, then: up, fail: () => { this.busy = false; } }); if (h.steer) h.steer.indoor = true;
  }
  // Brel leaves his carrying and walks to a spot (S.<key>), seen to go
  brelTo(key) {
    const n = this.ch.npc('zl_brel'), L = this.L;
    if (!n?.present || !L) { this.brel = null; return; }
    this.sack(n, false);
    this.brel = { n, to: L.spots[key], mode: 'go', via: key === 'brelTap' ? L.spots.brelWay.slice() : [], t: 0 };
    n.controlled = true; n.forceAnim = null;
  }
  // the sack he carries by its neck (in his hand while he walks to the hatch)
  sack(n, on) {
    if (!this._sack) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshStandardMaterial({ color: '#c8b890', roughness: 0.95 }));
      m.scale.set(1, 1.25, 0.85); m.castShadow = true; this._sack = m;
    }
    const hand = n.rig.j?.armR?.hand, m = this._sack;
    if (on && hand) { const sc = n.rig.root.scale.x || 1; hand.add(m); m.position.set(0, -0.2 / sc, 0); m.scale.set(1 / sc, 1.25 / sc, 0.85 / sc); m.visible = true; } else if (m.parent) { m.parent.remove(m); }
  }
  stepBrel(dt) {
    const g = this.game, f = this.f, L = this.L, n = this.ch.npc('zl_brel');
    if (!n?.present || !L || g.room?.id !== 'zeelich') return;
    let B = this.brel;
    // while the lift is stuck he carries from the stack at the bridge's mouth to the hatch under it, and back
    if (!B && this.open && !f.zt_bell) { B = this.brel = { n, mode: 'work', leg: 0, wait: 1.2 }; n.controlled = true; n.forceAnim = null; }
    if (!B) return;
    const stop = () => { n.rig.play('idle'); n.rig.update(dt, 0); n.sync(); };
    if (g.state !== 'play' || n.talking || n.listenTo) { stop(); return; }
    const walk = (to, spd = 1.15) => {
      const dx = to.x - n.pos.x, dz = to.z - n.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.3) return true;
      // (he gives Twinsen room: stands while he is in the way)
      if (Math.hypot(g.hero.pos.x - n.pos.x - (dx / d) * 0.8, g.hero.pos.z - n.pos.z - (dz / d) * 0.8) < 0.8) { stop(); return false; }
      const want = Math.atan2(dx, dz); n.angle += Math.atan2(Math.sin(want - n.angle), Math.cos(want - n.angle)) * Math.min(1, dt * 7);
      g.physics.move(n, Math.sin(n.angle) * spd * dt, Math.cos(n.angle) * spd * dt); g.physics.fall?.(n, dt);
      n.rig.play('walk'); n.rig.update(dt, spd); n.sync();
      return false;
    };
    if (B.mode === 'go') {
      B.t += dt;
      if (B.via.length) { if (walk(B.via[0], 1.35)) B.via.shift(); return; }
      // (there, or held up too long and out of sight: at his place)
      if (walk(B.to, 1.35) || (B.t > 40 && Math.hypot(g.hero.pos.x - n.pos.x, g.hero.pos.z - n.pos.z) > 25)) { n.angle = B.to.a ?? n.angle; n.controlled = false; this.brel = null; this.story.refreshCast(); }
      return;
    }
    const ends = [L.spots.brelA, L.spots.brelB];
    if (B.wait > 0) {
      // at an end: his hands on the stack (a sack taken) or at the hatch (a sack put in)
      B.wait -= dt; n.angle = ends[B.leg].a; n.rig.play('use'); n.rig.update(dt, 0); n.sync();
      if (B.wait <= 0) { this.sack(n, B.leg === 0); B.leg = 1 - B.leg; }
      return;
    }
    if (walk(ends[B.leg])) B.wait = 1.3;
  }
  // ---------------------------------------------------------------- THE SECOND SHIFT: Kell's lunch
  walkNpc(n, pts, spd, done) { n.controlled = true; n.forceAnim = null; this.walks = this.walks.filter((W) => W.n !== n); this.walks.push({ n, pts: pts.map((p) => ({ ...p })), spd, done }); }
  kellWalking() { const n = this.ch.npc('zl_kell'); return !!n && this.walks.some((W) => W.n === n); }
  // a barrow's move from where it is to `to` over `secs` (y: the height it rolls at), Brel behind it; each step: onStep(k)
  wheelTo(to, secs, y, done, onStep) {
    const L = this.L, from = L.barrowAt(), n = this.ch.npc('zl_brel');
    this.tweens.push({ n, from, to, secs, t: 0, y, done, onStep, d0: 0 });
  }
  stepTweens(dt) {
    const L = this.L;
    for (const T of this.tweens.slice()) {
      T.t = Math.min(T.secs, T.t + dt);
      const k = T.t / T.secs, e = k * k * (3 - 2 * k), da = Math.atan2(Math.sin((T.to.a || 0) - (T.from.a || 0)), Math.cos((T.to.a || 0) - (T.from.a || 0)));
      const p = { x: T.from.x + (T.to.x - T.from.x) * e, z: T.from.z + (T.to.z - T.from.z) * e, a: (T.from.a || 0) + da * e };
      const y = typeof T.y === 'function' ? T.y(k) : T.y;
      const was = L.barrowAt(); L.setBarrow(p, y); L.rollBarrow(Math.hypot(p.x - was.x, p.z - was.z) * (T.back ? -1 : 1));
      if (T.n?.present) { const b = this.behind(p); T.n.pos.set(b.x, y, b.z); T.n.angle = b.a; T.n.rig.play(T.t < T.secs ? 'walk' : 'idle'); T.n.rig.update(dt, T.t < T.secs ? 1.0 : 0); T.n.sync(); }
      T.onStep?.(k, p);
      if (T.t >= T.secs) { this.tweens.splice(this.tweens.indexOf(T), 1); T.done?.(); }
    }
  }
  // the loaf in Kell's hand
  loaf(n, on) {
    if (!this._loaf) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), new THREE.MeshStandardMaterial({ color: '#c88a46', roughness: 0.85 })); m.scale.set(1.5, 0.8, 0.9); m.castShadow = true; this._loaf = m; }
    const hand = n?.rig.j?.armR?.hand, m = this._loaf;
    if (on && hand) { const sc = n.rig.root.scale.x || 1; hand.add(m); m.position.set(0, -0.12 / sc, 0.04 / sc); m.scale.set(1.5 / sc, 0.8 / sc, 0.9 / sc); m.visible = true; } else if (m.parent) m.parent.remove(m);
  }
  // Brel at the tap passes on Mother Snuff's word to Kell; Twinsen offers; the deck comes down; Brel wheels his barrow on
  lunchCall() {
    const g = this.game, f = this.f, ch = this.ch, L = this.L;
    this.busy = true;
    const warm = !!f.zl_crate;   // (Mother Snuff's oven: hot once the crate is off her flue, the Second Bake: story/zeelife.js)
    ch.chain([['zl_brel', warm ? 'zt_lunch_brel' : 'zt_lunch_brel_b'], ['zl_kell', 'zt_lunch_kell1'], ['hero', 'zt_lunch_tw1'], ['zl_kell', 'zt_lunch_kell2']], () => {
      f.zt_lunchCall = true; g.save(false);
      this.lunchPh = 'call'; this.deckDown = false;
      g.audio.play('lever', L.spots.kell); g.audio.play('liftWinch', L.deck); L.running = true;
      L.moveDeck(L.low, 3.2, [], () => { g.audio.play('clunk', L.deck); this.deckDown = true; this.lunchAboard(); });
      const n = ch.npc('zl_brel'), SH = L.shift;
      L.setBarrow(SH.barrowLane, L.y0);   // (by the lane's crates, loaded: paper for the archive's back door, and his sacks)
      if (!n?.present) { this.barrowOn = true; L.setBarrow(SH.barrowDeck, L.low); this.lunchAboard(); return; }
      this.sack(n, false);
      this.walkNpc(n, [L.spots.brelWay[1], L.spots.brelWay[0], this.behind(SH.barrowLane)], 1.35, () => {
        const wait = () => { if (!this.deckDown) { this.after(0.3, wait); return; }
          this.wheelTo(SH.barrowDeck, 2.2, (k) => L.y0 + (L.low - L.y0) * Math.min(1, Math.max(0, (k - 0.35) / 0.2)), () => { this.barrowOn = true; this.lunchAboard(); },
            (k) => { if (k > 0.45 && !this._put) { this._put = true; g.audio.play('put', L.deck); } });
        };
        this._put = false; wait();
      });
    });
  }
  lunchAboard() {
    if (!this.deckDown || !this.barrowOn || this.lunchPh !== 'call') return;
    const g = this.game, n = this.ch.npc('zl_brel');
    this.lunchPh = 'ready'; this.busy = false; this.L.running = true;
    if (n?.present) n.controlled = true;   // (he rides: the deck carries him, story/zeelift.js ridersTo)
    g.save(false);
  }
  // a load or a return in the middle of it: the deck down, the barrow aboard with Brel, Kell at his lever or (gone once
  // for his bread) back beside it with the loaf
  lunchResume() {
    const L = this.L, f = this.f, SH = L.shift, n = this.ch.npc('zl_brel'), kell = this.ch.npc('zl_kell');
    this.lunchPh = 'ready'; this.deckDown = this.barrowOn = true; this.busy = false;
    L.setState(this.lookFor()); L.setBarrow(SH.barrowDeck, L.low);
    if (n?.present) { this.sack(n, false); const b = this.behind(SH.barrowDeck); n.controlled = true; n.placeAt({ ...b, y: L.low, pin: true }); }
    if (kell?.present && f.zt_lunchGo) this.loaf(kell, true);
  }
  takeHandle() {
    const g = this.game, f = this.f, ch = this.ch, L = this.L, h = g.hero, kell = ch.npc('zl_kell');
    this.busy = true;
    const go = () => handTo(h, L.handle, () => this.startHold(), 1.0);
    if (!f.zt_lunchGo && !this.kellAway && kell?.present) {
      ch.chain([['zl_kell', 'zt_lunch_kell3']], () => {
        f.zt_lunchGo = true; g.save(false);
        this.kellAway = true; this.awayT = 0;
        this.walkNpc(kell, L.shift.kellAway, 1.3, () => { kell.controlled = false; this.story.refreshCast(); });   // (out of the lane toward the street: away)
        this.after(0.8, go);
      });
      return;
    }
    go();
  }
  startHold() {
    const g = this.game, L = this.L, h = g.hero;
    this.busy = false; this.lunchPh = 'hold';
    this.hold = { held: 0, still: 0, tried: true, moved: false, lock: false, snd: 0 };
    h.angle = L.handle.a;
    this._holdFn ||= (dt, input) => this.holdStep(dt, input);
    g.heroHold = this._holdFn;
    g.hud.toast('zt_toast_handle', { u: g.hud.key('up'), d: g.hud.key('down'), e: g.hud.key('interact') }, 6500);
  }
  letGo() {
    const g = this.game, L = this.L;
    if (this._holdFn && g.heroHold === this._holdFn) g.heroHold = null;
    if (this.hold?.held > 0) g.audio.play('clunk', L.spots.kell);
    this.hold = null; this.lunchPh = 'ready'; this.awayT = 0; L.setLever(0);
  }
  ridersTo(y) {
    const L = this.L, n = this.ch.npc('zl_brel');
    L.setBarrow(L.barrowAt(), y);
    if (n?.present && n.controlled) { n.pos.y = y; n.sync(); }
  }
  // in his hands: up and down move the deck (slow to start, so a tap nudges), let go of the keys and the brake holds
  holdStep(dt, input) {
    const g = this.game, L = this.L, h = g.hero, H = this.hold;
    if (!H || !L || g.room?.id !== 'zeelich') { if (g.heroHold === this._holdFn) g.heroHold = null; return false; }
    const pose = () => { h.vel?.set(0, 0); h.angle = L.handle.a; h.rig.play('use'); h.rig.update(dt, 0); h.sync(); };
    if (H.lock) { L.setLever(0); pose(); return true; }   // (Brel's wheel at the lip, or over: the handle held)
    if (input.pressed('interact') || input.pressed('action') || input.pressed('dodge')) { this.letGo(); return true; }
    const mv = input.move().y, dir = mv > 0.35 ? 1 : mv < -0.35 ? -1 : 0;
    if (dir) {
      if (!H.held) { g.audio.play('lever', L.spots.kell); g.audio.play('motor', L.feed); }
      H.held += dt; H.still = 0; H.tried = false; H.moved = true;
      const spd = 0.18 + 0.42 * Math.min(1, H.held / 0.7);
      const y = Math.min(L.top + L.over, Math.max(L.low, L.deckY + dir * spd * dt));
      if (y !== L.deckY) { L.setDeck(y); this.ridersTo(y); if ((H.snd -= dt) <= 0) { H.snd = 0.45; g.audio.play('rattle', L.rope); } }
      L.setLever(dir);
    } else {
      if (H.held > 0) g.audio.play('clunk', L.spots.kell);   // (the brake takes her)
      H.held = 0; H.still += dt; L.setLever(0);
    }
    if (!H.tried && H.moved && H.still > 0.55) this.brelTries();
    pose();
    return true;
  }
  // the deck stopped: is it level? Brel tries his wheel at the landing (or waits, or calls her on)
  brelTries() {
    const g = this.game, L = this.L, H = this.hold, ch = this.ch, dy = L.deckY - L.top;
    H.tried = true;
    if (dy < -NEAR) { if (!this.saidMore && dy > -2.0) { this.saidMore = true; ch.chain([['zl_brel', 'zt_lunch_more']]); } return; }
    H.lock = true;
    const SH = L.shift, at = { ...SH.barrowDeck };
    if (Math.abs(dy) <= LEVEL) { this.cross(); return; }
    // a near miss: the wheel runs at the landing, catches its lip and comes back; Brel calls the way
    this.misses = (this.misses || 0) + 1;
    const lip = { ...at, x: at.x - 0.24 };
    this.wheelTo(lip, 0.35, L.deckY, () => {
      g.audio.play('thump', L.joint); g.camRig?.shake?.(0.06);
      this.wheelTo(at, 0.4, L.deckY, () => {
        const up = dy < 0, k = this.misses === 2 ? (up ? 'zt_lunch_up2' : 'zt_lunch_down2') : up ? 'zt_lunch_up' : 'zt_lunch_down';
        ch.chain([['zl_brel', k]], () => { if (this.hold) this.hold.lock = false; });
      });
      this.tweens[this.tweens.length - 1].back = true;
    });
  }
  // level: the wheel rolls over the joint (its sound as it crosses), onto the terrace and on toward the service door
  cross() {
    const g = this.game, L = this.L, SH = L.shift, ch = this.ch;
    L.setDeck(L.top); this.ridersTo(L.top);   // (within a few cm: the deck's lip at the landing's)
    this._joint = false;
    this.wheelTo(SH.barrowLand, 1.5, L.top, () => {
      this.wheelTo(SH.barrowOff, 1.3, L.top, () => {
        const n = ch.npc('zl_brel'); if (n?.present) { n.rig.play('use'); }
        ch.chain([['zl_brel', 'zt_lunch_brel_ok']], () => this.lunchDone());
      });
    }, (k, p) => { if (!this._joint && p.x - 0.58 <= L.joint.x) { this._joint = true; g.audio.play('wheelJoint', L.joint); } });   // (the wheel leads by 0.58 m)
  }
  // Kell back with his bread (from the street, or from beside the lever), Twinsen steps away, Kell takes his handle back
  lunchDone() {
    const g = this.game, f = this.f, ch = this.ch, L = this.L, h = g.hero, kell = ch.npc('zl_kell'), warm = !!f.zl_crate;
    const finish = () => {
      if (this._holdFn && g.heroHold === this._holdFn) g.heroHold = null;
      this.hold = null; L.setLever(0);
      f.zt_lunch = true; this.lunchPh = 'done';
      const n = ch.npc('zl_brel'); if (n) n.controlled = false;
      h.walkTo([L.shift.aside], { a: L.shift.aside.a, then: () => {}, fail: () => {} });
      if (kell?.present) this.walkNpc(kell, [{ ...L.spots.kell }], 1.2, () => { kell.controlled = false; this.loaf(kell, false); this.story.refreshCast(); });
      this.story.refreshCast(); g.updateObjective(); g.save(false);
    };
    if (this.kellAway && kell) {
      this.kellAway = false; kell.setPresent(true);
      const P = L.shift.kellAway; kell.placeAt({ ...P[P.length - 1], a: Math.atan2(P[0].x - P[1].x, P[0].z - P[1].z) });
      this.loaf(kell, true);
      this.walkNpc(kell, [P[0], { ...L.shift.kellAside }], 1.3, () => ch.chain([['zl_kell', warm ? 'zt_lunch_kell_back' : 'zt_lunch_kell_back_b']], finish));
      return;
    }
    ch.chain([['zl_kell', 'zt_lunch_kell_saw']], finish);
  }
  // let go and walked off (or a long wait): Kell comes back with his bread and waits by the lever
  kellBack() {
    const L = this.L, kell = this.ch.npc('zl_kell');
    this.kellAway = false;
    if (!kell) return;
    kell.setPresent(true);
    const P = L.shift.kellAway; kell.placeAt({ ...P[P.length - 1] });
    this.loaf(kell, true);
    this.walkNpc(kell, [P[0], { ...L.shift.kellAside }], 1.3, () => { kell.controlled = false; this.story.refreshCast(); });
  }
  stepLunch(dt) {
    const g = this.game, f = this.f, L = this.L, h = g.hero;
    for (const W of this.walks.slice()) if (stepWalk(g, W, dt)) { this.walks.splice(this.walks.indexOf(W), 1); W.done?.(); }
    this.stepTweens(dt);
    if (!this.lunchOn() || f.zt_lunch) return;
    const S = L.spots;
    if (!f.zt_lunchCall) {
      // (once: the water in, Kell's thanks said, Brel at his tap; Twinsen by the lift on the lane)
      const near = Math.abs(h.pos.y - L.y0) < 0.6 && Math.hypot(h.pos.x - S.kell.x, h.pos.z - S.kell.z) < 4.5;
      if (near && g.state === 'play' && !g.trans && !this.busy && !this.brel && !this.walks.length && h.actT <= 0 && !h.steer && this.ch.npc('zl_brel')?.present && this.ch.npc('zl_kell')?.present) this.lunchCall();
      return;
    }
    if (!this.lunchPh) this.lunchResume();
    if (this.kellAway && !this.hold && this.lunchPh === 'ready' && !this.kellWalking()) {
      this.awayT = (this.awayT || 0) + dt;
      if (this.awayT > 25 || Math.hypot(h.pos.x - L.handle.x, h.pos.z - L.handle.z) > 9) this.kellBack();
    }
  }
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, L = this.L, ch = this.ch;
    if (this.later?.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (this.pending && g.state === 'play' && (this.pending.t -= dt) <= 0) { const fn = this.pending.fn; this.pending = null; fn(); }
    if (!L || g.room?.id !== 'zeelich') return;
    this.stepBrel(dt);
    this.stepLunch(dt);
    if (!this.open) return;
    // the first sight of it from the lane: the deck half way, the cart on it (a cut-away while he says so)
    if (!f.zt_seen && g.state === 'play' && !g.trans && Math.hypot(h.pos.x - L.lane.x, h.pos.z - L.lane.z) < 7.5) {
      f.zt_seen = true;
      const beat = revealBeat(g, { in: 0.5 });
      beat?.show(() => ({ pos: new THREE.Vector3(L.lane.x + 2.2, L.y0 + 2.6, L.lane.z + 4.2), look: new THREE.Vector3(L.deck.x, L.half + 0.5, L.deck.z), fov: 44 }), 0.5);
      ch.chain([['hero', 'zt_see']], () => { beat?.release(1.2); g.updateObjective(); g.save(false); });
    }
    // the cart rolling to the filler, then tipping into it; the standpipe below runs
    if (this.roll) {
      const R = this.roll; R.t += dt;
      const k = Math.min(1, R.t / 2.2), e = 1 - (1 - k) * (1 - k);
      L.setCart(Math.max(0.001, e), 0);
      if (k >= 1) { this.roll = null; this.busy = false; g.audio.play('clunk', L.filler); g.updateObjective(); g.save(false); }
    }
    if (this.tip) {
      const T = this.tip; T.t += dt;
      const k = Math.min(1, T.t / 0.8); L.setCart(1, k); L.pourOn(T.t > 0.5 && T.t < 3.4);
      if (T.t > 0.5 && !T.snd) { T.snd = true; g.audio.play('waterRun', L.filler); g.audio.play('gurgle', L.filler); }
      if (T.t >= 3.6) {
        this.tip = null; this.busy = false; L.pourOn(false);
        f.zt_water = true; L.setState(this.lookFor());
        g.audio.play('trickle', L.standpipe);
        this.brelTo('brelTap');
        ch.chain([['hero', 'zt_cart_2'], ['zl_kell', 'zt_kell_done']], () => { f.zt_kellThanks = true; g.updateObjective(); g.save(false); });
      }
    }
    // a step off the open bay (or the parapet's gap): a long way down, the task as it was
    if (!h.onGround) { if (this._airY == null) this._airY = h.pos.y; }
    else {
      if (this._airY != null && this._airY > L.top - 0.3 && this._airY - h.pos.y > 1.2 && g.state === 'play' && !this.busy) { this.fell = (this.fell || 0) + 1; if (!f.zt_fall) { f.zt_fall = true; ch.chain([['hero', 'zt_fall']], () => g.save(false)); } }
      this._airY = null;
    }
  }
}

// CAMPAIGN-7 (wave 5, chapter 9): Mill Lane again. Not a chapter: story/cnline.js (the council's thread, owned by
// council.js) owns it and asks it first. Kell takes Twinsen up his lift to the service door on the cistern's terrace (it
// opens on the archive's back gallery: Vesk's standing order is on the front door, not on Kell's landing). When the
// council's stop is thrown at the platform, Mill Lane loses its line: the afternoon cart stops half way, Brel's jug comes
// up empty (the project's valve shuts when the line drops). Baldino's isolator, clipped on the motor house's feed box,
// holds the lane's one relay on the mills: the deck rises, the standpipe runs.
// Flags (the thread's, cnline.js): cn_closed (the order read), cn_kellAsk (Kell agreed: the deck down for them),
// cn_kell (up with him, the service door open), cn_stop (the lane dry), cn_iso (the isolator in hand), cn_lane (on Kell's
// feed: the lane runs). Without cn_v (a save from before) nothing here changes the lane.
//
// THE SECOND SHIFT (P109, docs/SECOND-SHIFT.md): Brum comes downstairs. Once the stop has dried the lane, Councillor Brum
// (it is his ward, and his vote) is down on Mill Lane by the dry tap. With the isolator on, the motor runs off the mills,
// but the mills' line has no stop of its own at the landing (the platform's had): from now on somebody stops the deck by
// hand at the handle, while somebody rides up and tips the cart. Kell brings the deck down and steps on with the cart;
// Brum offers the handle. Twinsen shows him where to stand and what to watch, the cloth on the haul rope and the nail
// (Brel tugs the rope to point it out if Twinsen is slow to come); Brel minds his coat. Brum runs the trip himself: the
// cloth to the nail, the cart's wheels over the joint (the sound of chapter 3's barrow), the cistern filled, the lane's
// tap running; Kell's thanks, and the chapter ends as before. Brum's presence solves the staffing; the fault is the
// isolator's, as before. On a later visit he has the handle, his council coat on a peg clear of the rope, and Kell is
// up by the cart. Flags (saved): cn_bv (the clip made with this beat: a save with cn_lane and without it is from before,
// and ends the chapter as it did), cn_brumShow (shown: Brum at the handle), cn_brum (his trip made; the Core's radio
// exchange, story/answer.js, follows only this).
export class KellThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.walk = null; this.busy = false; this.later = []; this.walks = []; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.cn_v; }
  get L() { return this.game.regions?.built?.('zeelich')?.lift; }
  cur() { return this.ch.isCur(); }
  dry() { const f = this.f; return this.on && !!f.cn_stop && !f.cn_lane; }
  // THE SECOND SHIFT: the lesson to come (power back, Brum not yet shown), and his trip ahead (shown, not yet run)
  lesson() { const f = this.f; return this.on && this.cur() && !!f.cn_lane && !!f.cn_bv && !f.cn_brumShow; }
  trip() { const f = this.f; return this.on && this.cur() && !!f.cn_bv && !!f.cn_brumShow && !f.cn_brum; }
  // the lift's look in chapter 9 (null: chapter 3's thread decides, as it always did)
  look() {
    const f = this.f;
    if (!this.on) return null;
    const ci = this.story.chapters.findIndex((c) => c.key === 'council');
    if (this.story.index < ci) return null;
    if (this.cur() && f.cn_kellAsk && !f.cn_kell) return { deck: 'low', cart: 'filler', fed: true, water: true };
    if (this.dry()) return { deck: 'half', cart: 'deck', fed: false, water: false };
    if (this.lesson() || this.trip()) return { deck: 'low', cart: 'deck', fed: true, water: false };   // (THE SECOND SHIFT: down for Kell and the cart)
    if (f.cn_lane) return { deck: 'top', cart: f.cn_brum === true ? 'filler' : 'deck', fed: true, water: true };
    return null;
  }
  push() {
    const L = this.L; if (!L) return;
    const s = this.look(); if (s) L.setState(s);
    L.setIso(!!this.f.cn_lane);
    L.setService(this.cur() && this.on && this.f.cn_kell === true && !this.f.c9_plans);
  }
  applyFlags() {
    for (const W of this.walks || []) W.n.controlled = false;
    this.walk = null; this.busy = false; this.later = []; this.kellUp = false; this.walks = []; this.tugT = 0; this.tugs = 0; this.ended = false; this.tripOn = false;
    this.game.regions?.whenBuilt?.('zeelich', () => this.push());
  }
  // Kell by the service door once he has opened it (this visit), else at his brake; Brel at the dry tap
  // (THE SECOND SHIFT: Brum by the dry tap once the stop has dried his ward; for the lesson Kell on the deck by his cart,
  // Brum waiting by the motor house, Brel by the rope; shown, Brum at the handle)
  place(id) {
    const L = this.L, f = this.f;
    if (!L || !this.cur() || !this.on) return undefined;
    const W = this.walks.find((w) => w.n.def.id === id);
    if (W) return { x: W.n.pos.x, y: W.n.pos.y, z: W.n.pos.z, a: W.n.angle, pin: true };
    const SH = L.shift;
    if (id === 'zl_kell') {
      if (this.walk) return undefined;
      if (this.kellUp) return { ...L.kellDoor, y: L.top };
      if (this.lesson() || this.trip()) return { ...L.kellDeck, y: L.deckY, pin: true };
      if (f.cn_bv && f.cn_brum) return { ...L.kellDeck, y: L.top };
      return { ...L.spots.kell, anim: this.dry() ? 'use' : null };   // (his hand on the brake while the deck hangs half way)
    }
    if (id === 'councilC' && f.cn_stop) {
      if (this.dry()) return { ...SH.brumDry };
      if (this.lesson()) return { ...SH.brumWait };
      if (f.cn_brumShow) return { ...L.spots.kell, anim: 'use' };
    }
    if (id === 'zl_brel' && this.lesson()) return { ...SH.brelTug };
    return undefined;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, L = this.L, h = g.hero;
    if (!L || !this.cur() || !this.on || g.room?.id !== 'zeelich' || this.busy) return;
    const up = Math.abs(h.pos.y - L.top) < 0.6, down = Math.abs(h.pos.y - L.y0) < 0.6;
    if (f.cn_kellAsk && !f.cn_kell && down && !L.moving && Math.abs(L.deckY - L.low) < 0.05) consider(dist(L.deck.x, L.deck.z), 2.3, { kind: 'cn_ride', label: 'p_ride' });
    if (f.cn_kell === true && !f.c9_plans && up) consider(dist(L.service.x, L.service.z), 1.3, { kind: 'cn_service', label: 'p_service' });
    if (f.cn_iso && !f.cn_lane && down) consider(dist(L.isoAt.x, L.isoAt.z), 1.2, { kind: 'cn_clip', label: 'p_clip' });
    if (this.lesson() && down && !this.walks.length) consider(dist(L.handle.x, L.handle.z), 1.5, { kind: 'cn_show', label: 'p_show' });
  }
  interact(it) {
    const g = this.game, h = g.hero, L = this.L;
    switch (it.kind) {
      case 'cn_ride': this.ride(); return true;
      case 'cn_service':
        this.busy = true;
        handTo(h, L.service, () => {
          L.setService(true); g.audio.play('door', L.service);
          this.after(0.5, () => { this.busy = false; this.kellUp = false; g.enterRoom('archive', (R) => R.gallery); });
        });
        return true;
      case 'cn_clip': this.clip(); return true;
      case 'cn_show': this.show(); return true;
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.cur() || !this.on || this.busy) return false;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    // THE SECOND SHIFT: Brum on Mill Lane (his ward dry, then waiting for his lesson, then at the handle); Brel points at the cloth
    if (id === 'councilC' && f.cn_stop) {
      if (this.dry()) return c([['councilC', 'cn_brum_dry']]);
      if (this.lesson()) return c([['councilC', 'cn_brum_wait']]);
      if (f.cn_brumShow) return c([['councilC', 'cn_brum_show']]);
    }
    if (this.lesson() && id === 'zl_brel') { this.tug(true); return true; }
    if (this.lesson() && id === 'zl_kell') return c([['zl_kell', 'cn_kell_deck']]);
    if (id === 'zl_kell') {
      if (this.dry()) return c([['zl_kell', 'cn_lane_kell']]);
      if (f.cn_lane) return c([['zl_kell', 'cn_kell_late']]);
      if (f.cn_kell && this.kellUp) return c([['zl_kell', 'cn_kell_after']]);
      if (f.cn_closed && !f.cn_kell && !f.c9_plans) {
        if (f.cn_kellAsk) return c([['zl_kell', 'cn_kell_wait']]);
        return c([['zl_kell', 'cn_kell_1'], ['hero', 'cn_tw_kell'], ['zl_kell', f.zt_water ? 'cn_kell_2' : 'cn_kell_2b'], ['zl_kell', 'cn_kell_3']], () => {
          f.cn_kellAsk = true; g.updateObjective(); g.save(false);
          // the deck comes down for them (the cart stays up at the filler)
          const L = this.L; this.busy = true; g.audio.play('lever', L.spots.kell); g.audio.play('liftWinch', L.deck);
          L.moveDeck(L.low, 3.2, [], () => { this.busy = false; g.audio.play('clunk', L.deck); g.updateObjective(); });
        });
      }
      return false;
    }
    if (id === 'zl_brel') { if (this.dry()) return c([['zl_brel', 'cn_lane_brel']]); if (f.cn_lane) return c([['zl_brel', 'cn_brel_late']]); return false; }
    if (id === 'zl_irsa' && this.dry()) return c([['zl_irsa', 'cn_lane_irsa']]);
    return false;
  }

  // ---------------------------------------------------------------- Kell takes him up
  ride() {
    const g = this.game, f = this.f, h = g.hero, L = this.L, kell = this.ch.npc('zl_kell');
    this.busy = true;
    const up = () => {
      g.setState('cutscene');
      h.angle = -Math.PI / 2;
      if (kell?.present) { kell.controlled = true; kell.placeAt({ ...L.kellDeck }); kell.rig.play('idle'); }
      g.audio.play('lever', L.spots.kell); g.audio.play('liftWinch', L.deck);
      g.cutscene = (dt) => { h.vel?.set(0, 0); h.rig.play('idle'); h.rig.update(dt, 0); h.sync(); if (kell?.present) { kell.rig.update(dt, 0); kell.sync(); } };
      L.moveDeck(L.top, 4.6, [h, ...(kell?.present ? [kell] : [])], () => {
        g.cutscene = null; g.setState('play'); g.audio.play('clunk', L.deck);
        L.setState({ deck: 'top', cart: 'filler', fed: true, water: true });
        // Kell steps off across the landing to the service door and unlocks it
        if (kell?.present) { const d = L.kellDoor; this.walk = { n: kell, pts: [{ x: L.deck.x - 1.25, z: L.kellDeck.z }, { x: d.x, z: d.z }], i: 0, t: 0, done: () => this.unlock() }; }
        else this.unlock();
      });
    };
    h.walkTo([{ x: L.ride.x + 1.0, z: L.ride.z }, L.ride], { a: -Math.PI / 2, then: up, fail: () => { this.busy = false; } }); if (h.steer) h.steer.indoor = true;
  }
  unlock() {
    const g = this.game, f = this.f, L = this.L, kell = this.ch.npc('zl_kell');
    this.kellUp = true;
    if (kell?.present) { kell.controlled = false; kell.placeAt({ ...L.kellDoor, y: L.top, anim: 'use' }); }
    g.audio.play('clunk', L.service); L.setService(true); g.audio.play('door', L.service);
    this.ch.chain([['zl_kell', 'cn_kell_door']], () => {
      f.cn_kell = true; this.busy = false;
      if (kell?.present) kell.placeAt({ ...L.kellDoor, y: L.top });
      g.updateObjective(); g.save(false);
    });
  }
  // the isolator on Kell's feed box: the lane runs off the mills; the deck rises, the standpipe runs
  clip() {
    const g = this.game, f = this.f, h = g.hero, L = this.L, ch = this.ch;
    this.busy = true;
    handTo(h, L.isoAt, () => {
      L.setIso(true); g.audio.play('clunk', L.isoAt); f.cn_lane = true; f.cn_bv = 1;
      ch.chain([['hero', 'cn_lane_clip']], () => {
        L.state.fed = true; L.running = true; g.audio.play('motor', L.feed); g.audio.play('liftWinch', L.deck);
        // THE SECOND SHIFT: running off the mills; Kell brings the stalled cart down to the lane to ride up with it
        ch.chain([['zl_kell', 'cn_lane_kell2b']]);
        L.moveDeck(L.low, 3.0, [], () => {
          g.audio.play('clunk', L.deck);
          L.setState({ deck: 'low', cart: 'deck', fed: true, water: false }); L.setIso(true);
          this.lessonStart();
        });
      });
    });
  }
  // ---------------------------------------------------------------- THE SECOND SHIFT: Brum comes downstairs
  walkNpc(n, pts, done, spd = 1.25) { n.controlled = true; n.forceAnim = null; this.walks = this.walks.filter((W) => W.n !== n); this.walks.push({ n, pts: pts.map((p) => ({ ...p })), spd, done }); }
  // the lane needs a hand at the handle now: Kell says why, Brum offers his, Kell steps onto the deck by his cart
  lessonStart() {
    const g = this.game, f = this.f, ch = this.ch, L = this.L, SH = L.shift;
    const kell = ch.npc('zl_kell'), brum = ch.npc('councilC'), brel = ch.npc('zl_brel');
    ch.chain([['zl_kell', 'cn_kell_two'], ...(brum?.present ? [['councilC', 'cn_brum_take']] : []), ['zl_kell', f.zt_lunch ? 'cn_kell_show' : 'cn_kell_show_b']], () => {
      g.save(false);
      const settle = (n, p) => () => { n.controlled = false; n.placeAt(p); };
      if (kell?.present) this.walkNpc(kell, [{ x: L.deck.x + 1.45, z: L.kellDeck.z }, { ...L.kellDeck }], () => settle(kell, { ...L.kellDeck, y: L.deckY, pin: true })());
      if (brum?.present) this.walkNpc(brum, [L.spots.brelWay[1], { ...SH.brumWait }], settle(brum, { ...SH.brumWait }));
      if (brel?.present) this.walkNpc(brel, [L.spots.brelWay[1], { ...SH.brelTug }], settle(brel, { ...SH.brelTug }));
      this.busy = false; this.tugT = 0;
      g.updateObjective();
    });
  }
  // Brel tugs the haul rope: the cloth jumps (and, the first time or asked, he says what it is)
  tug(say) {
    const g = this.game, L = this.L, n = this.ch.npc('zl_brel'), h = g.hero;
    this.tugT = 0; this.tugs = (this.tugs || 0) + 1;
    L.tug(); g.audio.play('rattle', L.rope);
    if (n?.present) { n.forceAnim = 'use'; this.after(1.4, () => { if (n.forceAnim === 'use' && !n.controlled) n.forceAnim = null; }); }
    if ((say || this.tugs === 1) && Math.hypot(h.pos.x - L.handle.x, h.pos.z - L.handle.z) < 16) this.ch.chain([['zl_brel', 'cn_brel_tug']]);
  }
  // at the handle: where to stand, what to watch; Brel minds the coat; Brum takes the handle
  show() {
    const g = this.game, f = this.f, h = g.hero, L = this.L, ch = this.ch;
    const brum = ch.npc('councilC'), brel = ch.npc('zl_brel');
    this.busy = true;
    handTo(h, L.handle, () => {
      h.angle = L.handle.a; L.tug();
      ch.chain([['hero', 'cn_tw_show'], ...(brum?.present ? [['councilC', 'cn_brum_show']] : []), ...(brel?.present && brum?.present ? [['zl_brel', 'cn_brel_coat'], ['councilC', 'cn_brum_coat']] : [])], () => {
        f.cn_brumShow = true;
        h.walkTo([L.shift.aside], { a: L.shift.aside.a, then: () => {}, fail: () => {} });
        if (brel?.present) this.walkNpc(brel, [L.spots.brelWay[1], { ...L.spots.brelTap }], () => { brel.controlled = false; this.story.refreshCast(); });
        g.updateObjective(); g.save(false);
        if (brum?.present) this.walkNpc(brum, [{ ...L.spots.kell }], () => { brum.controlled = false; brum.placeAt({ ...L.spots.kell, anim: 'use' }); this.after(0.6, () => this.brumTrip()); });
        else this.brumTrip();
      });
    });
  }
  // his trip: up with Kell and the cart, stopped with the cloth at the nail; the cart over the joint to the filler, tipped
  brumTrip() {
    if (this.tripOn) return;
    const g = this.game, L = this.L, kell = this.ch.npc('zl_kell');
    this.tripOn = true; this.busy = true;
    if (kell?.present) { kell.controlled = true; kell.placeAt({ ...L.kellDeck, y: L.deckY, pin: true }); kell.rig.play('idle'); }
    g.audio.play('lever', L.spots.kell); g.audio.play('liftWinch', L.deck); L.running = true; L.setLever(1);
    L.moveDeck(L.top, 4.6, kell?.present ? [kell] : [], () => {
      L.setLever(0); g.audio.play('clunk', L.spots.kell);
      if (kell?.present) kell.forceAnim = 'use';
      this.cartRoll = { t: 0, joint: false };
    });
  }
  // the cart's roll and tip (update), then the lane's water and the end of the chapter
  stepTrip(dt) {
    const g = this.game, f = this.f, L = this.L, ch = this.ch, R = this.cartRoll;
    if (!R) return;
    R.t += dt;
    const k = Math.min(1, R.t / 2.2), e = 1 - (1 - k) * (1 - k);
    if (k < 1) { L.setCart(Math.max(0.001, e), 0); if (!R.joint && e > 0.07) { R.joint = true; g.audio.play('wheelJoint', L.joint); } return; }
    const tt = R.t - 2.2;
    L.setCart(1, Math.min(1, tt / 0.8)); L.pourOn(tt > 0.5 && tt < 3.0);
    if (tt > 0.5 && !R.snd) { R.snd = true; g.audio.play('waterRun', L.filler); g.audio.play('gurgle', L.filler); }
    if (tt < 3.2) return;
    this.cartRoll = null; L.pourOn(false);
    L.setState({ deck: 'top', cart: 'filler', fed: true, water: true }); L.setIso(true);
    g.audio.play('trickle', L.standpipe);
    const kell = ch.npc('zl_kell'); if (kell) { kell.forceAnim = null; kell.controlled = false; kell.placeAt({ ...L.kellDeck, y: L.top }); }
    ch.chain([['zl_brel', 'cn_lane_brel2'], ['zl_kell', 'cn_kell_level'], ['zl_kell', 'cn_lane_kell3']], () => {
      f.cn_brum = true; this.busy = false; this.ended = true;
      g.updateObjective(); g.save(false); this.ch.thread.end();
    });
  }
  // the stop's cut-away: the afternoon cart on its way up, the line gone, the deck held half way; Brel's jug
  cut(beat) {
    const L = this.L;
    if (!L) return;
    L.setState({ deck: 'low', cart: 'deck', fed: true, water: true });
    L.moveDeck(L.half, 1.4, [], () => { L.setState({ deck: 'half', cart: 'deck', fed: false, water: false }); this.game.audio.play('clunk', L.deck); });
    void beat;
  }
  after(t, fn) { this.later.push({ t, fn }); }
  update(dt) {
    const g = this.game, f = this.f;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    // THE SECOND SHIFT: the lane's people on their way, the cart's roll; a load in the middle of it; Brel's reminder
    if (this.L && g.room?.id === 'zeelich') {
      for (const w of this.walks.slice()) if (stepWalk(g, w, dt)) { this.walks.splice(this.walks.indexOf(w), 1); w.done?.(); }
      this.stepTrip(dt);
      if (this.cur() && this.on && g.state === 'play' && !g.trans && !this.busy) {
        // (a save with the lane running and the beat done or never begun — from before it, or made just before the
        //  chapter's end — ends the chapter as it did; a save made after the lesson runs Brum's trip)
        if (f.cn_lane && !this.ended && (f.cn_brum || !f.cn_bv)) { this.ended = true; this.ch.thread.end(); }
        else if (this.trip() && !this.tripOn && !this.walks.length) this.brumTrip();
        else if (this.lesson() && !this.walks.length) {
          const h = g.hero, far = Math.hypot(h.pos.x - this.L.handle.x, h.pos.z - this.L.handle.z) > 2.2;
          if (far && (this.tugT = (this.tugT || 0) + dt) > (this.tugs ? 22 : 10)) this.tug(false);
        }
      }
    }
    const W = this.walk;
    if (!W) return;
    const n = W.n, tg = W.pts[W.i]; W.t += dt;
    if (!tg || W.t > 12) { this.walk = null; W.done(); return; }
    const dx = tg.x - n.pos.x, dz = tg.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { W.i++; if (W.i >= W.pts.length) { this.walk = null; W.done(); } return; }
    const hd = Math.atan2(dx, dz); n.angle += Math.atan2(Math.sin(hd - n.angle), Math.cos(hd - n.angle)) * Math.min(1, dt * 8);
    g.physics.move(n, Math.sin(n.angle) * 1.3 * dt, Math.cos(n.angle) * 1.3 * dt); g.physics.fall?.(n, dt);
    n.rig.play('walk'); n.rig.update(dt, 1.3); n.sync();
  }
}
