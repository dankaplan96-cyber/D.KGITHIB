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
import * as THREE from 'three';
import { revealBeat } from './revealcam.js';
import { handTo } from './reach.js';
import '../text/thread.js';

const DIALS = ['steady', 'double', 'triple'];

export class LiftThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.dial = 0; }
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
    return { deck: f.zt_ride ? 'top' : f.zt_feed ? 'low' : 'half', hooked: !!f.zt_hook && !f.zt_ride, fed: !!f.zt_feed, cart: f.zt_shove || f.zt_water ? 'filler' : 'deck', water: !!f.zt_water, dial: this.dial };
  }
  applyFlags() {
    this.later = []; this.pending = null; this.brel = null; this.busy = false; this.dial = 0;
    this.game.regions.whenBuilt('zeelich', (Z) => Z.lift?.setState(this.lookFor()));
  }
  push() { this.L?.setState(this.lookFor()); }
  place(id) {
    const f = this.f, L = this.L;
    if (!L) return undefined;
    const S = L.spots, cur = this.ch.isCur(), stuck = this.on && cur && !f.zt_bell;
    switch (id) {
      case 'zl_kell': return { ...S.kell, anim: this.on && cur && !f.zt_ride ? 'use' : null };   // (his hand on the brake until the deck is up)
      case 'zl_brel':
        if (this.brel) return { x: this.brel.n.pos.x, z: this.brel.n.pos.z, a: this.brel.n.angle };   // (on his way: where he is)
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
  journal() { const f = this.f; return this.on ? [{ key: 'zt_j_lift', done: !!f.zt_water }, { key: 'zt_j_bench', done: !!f.zt_bench }].filter((l) => l.done) : []; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, L = this.L, h = g.hero;
    if (!L || g.room?.id !== 'zeelich') return;
    const up = Math.abs(h.pos.y - L.top) < 0.6, down = Math.abs(h.pos.y - L.y0) < 0.6;
    if (up) consider(dist(L.cistern.x, L.cistern.z), 2.6, { kind: 'zt_cistern', label: 'p_read' });
    if (down) { consider(dist(L.standpipe.x, L.standpipe.z), 1.5, { kind: 'zt_standpipe', label: 'p_look' }); consider(dist(L.sign.x, L.sign.z), 1.6, { kind: 'zt_sign', label: 'p_read' }); }
    if (!this.open || this.busy) return;
    if (!f.zt_bell && up) {
      if (!f.zt_hook) consider(dist(L.hook.x, L.hook.z), 1.3, { kind: 'zt_hook', label: 'p_hook' });
      consider(dist(L.bell.x, L.bell.z), 1.3, { kind: 'zt_bell', label: 'p_bell' });
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
    switch (id) {
      case 'zl_brel':
        if (!cur) return c([['zl_brel', 'zt_brel_idle']]);
        if (!f.zt_brel) return c([['zl_brel', 'zt_brel_1'], ['zl_brel', 'zt_brel_2']], () => { f.zt_brel = true; g.updateObjective(); g.save(false); });
        return c([['zl_brel', f.zt_water ? (f.zt_bench ? 'zt_brel_after' : 'zt_brel_water') : 'zt_brel_3']]);
      case 'zl_kell':
        if (!cur) return c([['zl_kell', this.on ? 'zt_kell_later' : 'zt_kell_idle']]);
        if (!f.zt_kell && !f.zt_bell) return c([['zl_kell', 'zt_kell_1'], ['hero', 'zt_tw_kell'], ['zl_kell', 'zt_kell_2'], ['zl_kell', 'zt_kell_3']], () => { f.zt_kell = true; g.updateObjective(); g.save(false); });
        if (!f.zt_bell) return c([['zl_kell', 'zt_kell_wait']]);
        if (!f.zt_feed) return c([['zl_kell', 'zt_kell_wait2']]);
        if (!f.zt_water) return c([['zl_kell', 'zt_kell_wait3']]);
        if (!f.zt_kellThanks) return c([['zl_kell', 'zt_kell_done']], () => { f.zt_kellThanks = true; g.save(false); });
        return c([['zl_kell', f.c2_veskDown ? 'zt_kell_later' : 'zt_kell_after']]);
      case 'zl_irsa':
        if (!cur) return c([['zl_irsa', this.on ? 'zt_irsa_later' : 'zt_irsa_idle']]);
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
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, L = this.L, ch = this.ch;
    if (this.later?.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (this.pending && g.state === 'play' && (this.pending.t -= dt) <= 0) { const fn = this.pending.fn; this.pending = null; fn(); }
    if (!L || g.room?.id !== 'zeelich') return;
    this.stepBrel(dt);
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
export class KellThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.walk = null; this.busy = false; this.later = []; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.cn_v; }
  get L() { return this.game.regions?.built?.('zeelich')?.lift; }
  cur() { return this.ch.isCur(); }
  dry() { const f = this.f; return this.on && !!f.cn_stop && !f.cn_lane; }
  // the lift's look in chapter 9 (null: chapter 3's thread decides, as it always did)
  look() {
    const f = this.f;
    if (!this.on) return null;
    const ci = this.story.chapters.findIndex((c) => c.key === 'council');
    if (this.story.index < ci) return null;
    if (this.cur() && f.cn_kellAsk && !f.cn_kell) return { deck: 'low', cart: 'filler', fed: true, water: true };
    if (this.dry()) return { deck: 'half', cart: 'deck', fed: false, water: false };
    if (f.cn_lane) return { deck: 'top', cart: 'deck', fed: true, water: true };
    return null;
  }
  push() {
    const L = this.L; if (!L) return;
    const s = this.look(); if (s) L.setState(s);
    L.setIso(!!this.f.cn_lane);
    L.setService(this.cur() && this.on && this.f.cn_kell === true && !this.f.c9_plans);
  }
  applyFlags() { this.walk = null; this.busy = false; this.later = []; this.kellUp = false; this.game.regions?.whenBuilt?.('zeelich', () => this.push()); }
  // Kell by the service door once he has opened it (this visit), else at his brake; Brel at the dry tap
  place(id) {
    const L = this.L;
    if (!L || !this.cur() || !this.on) return undefined;
    if (id === 'zl_kell') {
      if (this.walk) return undefined;
      if (this.kellUp) return { ...L.kellDoor, y: L.top };
      return { ...L.spots.kell, anim: this.dry() ? 'use' : null };   // (his hand on the brake while the deck hangs half way)
    }
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
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.cur() || !this.on || this.busy) return false;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
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
      L.setIso(true); g.audio.play('clunk', L.isoAt); f.cn_lane = true;
      ch.chain([['hero', 'cn_lane_clip']], () => {
        L.state.fed = true; L.running = true; g.audio.play('motor', L.feed); g.audio.play('liftWinch', L.deck);
        ch.chain([['zl_kell', 'cn_lane_kell2']]);
        L.moveDeck(L.top, 4.0, [], () => {
          g.audio.play('clunk', L.deck);
          L.setState({ deck: 'top', cart: 'deck', fed: true, water: true }); L.setIso(true);
          g.audio.play('trickle', L.standpipe);
          this.story.refreshCast();
          ch.chain([['zl_brel', 'cn_lane_brel2'], ['zl_kell', 'cn_lane_kell3']], () => { this.busy = false; g.save(false); this.ch.thread.end(); });
        });
      });
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
    const g = this.game;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
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
