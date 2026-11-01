// Under the Street (WA-14, optional, from chapter 1 on): Citadel's old sewers (src/game/sewers.js). Not a chapter:
// the director (index.js) asks it after the chapter in progress, like the town's side stories (life.js). Its state is
// flags prefixed sw_ (saved with the game; a save from before has none of them and simply finds the grate shut).
//
//   1. The grate in the lane north of the house, by the pump: something knocks down there, and there's chalk on the
//      rim, an arrow and "A + L" (Arthur's hand). Twinsen lifts the grate (sw_hatch). Under it, the old lift
//      (SEWER-LIFT, as LBA2's Citadel: a platform that goes down): on its deck, "Go down" pulls the lever and the deck
//      takes him down the shaft (~1.5 s, a clanking winch), then the scene changes to the hall. Back up the well-house,
//      he arrives on the deck as it rises the last stretch, the grate still lifted. A loaded game finds it shut (and
//      no ride half done); he lifts it again without a word.
//   2. The flooded hall. The project's new heat pipe comes down the well-house shaft into a blue valve box bolted onto
//      the old gate winch: its brace jams the winch, and the valve knocks every few seconds. Eased shut, the knocking
//      stops and the winch turns: the gate at the back rises (sw_valve).
//   3. The treasure room behind it: the star chest holds Arthur's map, a stub of chalk and someone's old coins
//      (sw_chest: the map, found; a clover, owed until picked up). The barrels in both rooms give, as containers do.
//   4. Back home, Arthur is asked about it (sw_arthur): he and Lulu found the room before the pipe went in.
// Nothing on the main path needs any of it.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import { SEWER, LIFT } from '../sewers.js';
import '../text/sewers.js';

// the lift (SEWER-LIFT): down, the lever pulled, a short take-up, then a steady descent; the scene changes after
// DOWN_T s (the deck goes on down behind the black). Up, the deck comes the last RISE m in RISE_T s, slowing to a stop.
const DOWN_T = 1.5, V_DOWN = 1.6, TAKE_UP = 0.15, RISE = 1.5, RISE_T = 1.0;

export class SewerLife extends ChapterBase {
  get H() { return SEWER.hatch; }
  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
    this.endRide();   // (a game loaded mid-ride: none of it stays)
    this.H?.setOpen(false);   // (shut whenever a game is loaded: lifted again, without a word, once he knows it)
    this.applyRooms();
    this.settleOwed('sw_oweClover', 'clover', 1, 'sw_toast_owed');
  }
  // the rooms below as the flags have them (LAZY-REGIONS: also right after they are built, which may be while the
  // grate stands open above: that stays as it is)
  applyRooms() { const f = this.f; SEWER.hall?.setValve(!!f.sw_valve, true); SEWER.vault?.setChest(!!f.sw_chest); }
  regionBuilt(ids) { if (ids.includes('sewer') || ids.includes('sewervault')) this.applyRooms(); }
  items() { return this.f.sw_chest && !this.f.sw_arthur ? [{ id: 'sw_map', icon: 'map' }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'sw_j_knock', done: !!f.sw_valve, show: f.sw_hatch },
      { key: 'sw_j_gate', done: !!f.sw_chest, show: f.sw_valve },
      { key: 'sw_j_arthur', done: !!f.sw_arthur, show: f.sw_chest },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- the knock
  update(dt) {
    const g = this.game, here = g.room?.id ?? 'citadel';
    if (here !== 'sewer' || this.f.sw_valve || !SEWER.hall || g.state !== 'play') { this.beat = 0; return; }
    this.beat = (this.beat || 0) + dt;
    if (this.beat >= 2.8) { this.beat = 0; SEWER.hall.knock(); g.audio.play('clunk'); }
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, R = g.room;
    if (g.hero.body === 'zoe' || g.hero.body === 'worker') return;
    if (!R) {
      const H = this.H, hp = g.hero.pos;
      if (!H || this.ride) return;
      if (!H.open) { consider(dist(H.x, H.z), 1.5, { kind: 'swhatch', label: 'p_sw_lift' }); return; }
      // the lift: on its deck (whichever way he faces), or at its rim facing it
      const d = Math.hypot(hp.x - H.x, hp.z - H.z);
      if (!g.hero.onGround || Math.abs(hp.y - H.deckTop()) > 0.5) return;
      if (d < LIFT.S + 0.15) consider(0.05 + d * 0.3, 1, { kind: 'swdown', label: 'p_sw_down' });
      else consider(dist(H.x, H.z), 1.2, { kind: 'swdown', label: 'p_sw_down' });
      return;
    }
    if (R.id === 'sewer' && SEWER.hall) { const v = SEWER.hall.valve; consider(dist(v.x, v.z), 1.3, { kind: 'swvalve', label: f.sw_valve ? 'p_look' : 'p_sw_ease' }); }
    if (R.id === 'sewervault' && SEWER.vault) { const c = SEWER.vault.chest; consider(dist(c.x, c.z), 1.3, { kind: 'swchest', label: f.sw_chest ? 'p_look' : 'p_open' }); }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), done); return true; };
    switch (it.kind) {
      case 'swhatch':
        // he kneels, lifts the grate on its hinge: then it's a way down
        h.act('use', 0.7, () => {
          const first = !f.sw_hatch;
          f.sw_hatch = true; this.H.setOpen(true); g.audio.play('clunk');
          if (first) say(['sw_hatch1', 'sw_hatch2'], () => g.save(false));
        }, 0.35);
        return true;
      case 'swdown': this.goDown(); return true;
      case 'swvalve':
        if (f.sw_valve) return say(['sw_valve_after']);
        h.act('use', 0.8, () => {
          f.sw_valve = true; SEWER.hall.setValve(true); g.audio.play('ropeCreak'); g.camRig?.shake?.(0.15);
          say(['sw_valve1', 'sw_valve2'], () => g.save(false));
        }, 0.4);
        return true;
      case 'swchest':
        if (f.sw_chest) return say(['sw_chest_after']);
        h.act('use', 0.7, () => {
          f.sw_chest = true; SEWER.vault.setChest(true); g.audio.play('chest');
          // (the clover pops from the chest's front lip, not from inside its collider: it lands in the room)
          const V = SEWER.vault.chest, c = { x: V.at.x + (V.x - V.at.x) * 0.45, z: V.at.z + (V.z - V.at.z) * 0.45 };
          say(['sw_chest1', 'sw_chest2'], () => {
            g.found('sw_map', 'it_sw_map', () => {
              this.reward('sw_oweClover', 'clover', 1, c.x, SEWER.vault.chest.y + 0.9, c.z, { pop: true });
              g.save(false);
            }, { icon: 'map' });
          });
        }, 0.35);
        return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the lift (SEWER-LIFT)
  // "Go down": he steps to the middle of the deck, turns to the lever and pulls it; the deck goes down with him on it
  // (stick input on the way there takes over: nothing happens)
  goDown() {
    const g = this.game, h = g.hero, H = this.H;
    const lever = Math.atan2(H.lever.x - H.x, H.lever.z - H.z);
    const pull = () => {
      if (!H.open || g.room || g.state !== 'play' || this.ride) return;
      h.act('use', 0.5, () => this.startRide('down'), 0.2);
    };
    h.walkTo([{ x: H.x, z: H.z }], { a: lever, speed: 1.4, then: pull, fail: pull });
  }
  // a ride: the game in a scene of its own (no input, no pause or save menu, nobody hurts him) for its length
  startRide(dir) {
    const g = this.game, h = g.hero, H = this.H;
    if (this.ride || !H || g.room || h.dead || (dir === 'down' && (!H.open || g.state !== 'play'))) return;
    const R = this.ride = { dir, t: 0, d: dir === 'down' ? 0 : RISE, v: 0, fn: null, sil: h.rig?.silhouette || null, cam: null };
    R.fn = (dt) => this.rideStep(dt, R);
    g.setState('cutscene'); g.cutscene = R.fn;
    h.actT = 0; h.actCb = null; h.actNext = null; h.steer = null; h.vel?.set(0, 0); h.vy = 0; h.onGround = true;
    // (his see-through silhouette would show his legs through the lane as he sinks: off for the ride)
    if (R.sil) R.sil.visible = false;
    if (dir === 'down') {
      // the camera follows him a little: from where it is, nearer and lower (at most to ~3.6 m off, 2.8 m up),
      // looking down into the shaft
      const c = g.camera.position, dx = c.x - H.x, dz = c.z - H.z, hd = Math.hypot(dx, dz) || 1;
      const nd = Math.min(hd, Math.max(3.6, hd * 0.6)), ny = Math.min(c.y - H.y, Math.max(2.8, (c.y - H.y) * 0.65));
      // (its aim point starts where it looks now: the override eases from camRig.look, which the follow view leaves stale)
      const fwd = g.camera.getWorldDirection(new THREE.Vector3());
      g.camRig.look.copy(c).addScaledVector(fwd, Math.hypot(dx, c.y - H.y, dz));
      R.cam = g.camRig.override = { pos: new THREE.Vector3(H.x + dx / hd * nd, H.y + ny, H.z + dz / hd * nd), look: new THREE.Vector3(H.x, H.y - 0.9, H.z) };
    }
    H.setOpen(true); H.setDeck(R.d);
    g.audio.play('liftWinch');
    this.rideStep(0, R);
  }
  rideStep(dt, R) {
    const g = this.game, h = g.hero, H = this.H;
    if (this.ride !== R) return;
    R.t += dt;
    if (R.dir === 'down') {
      H.setLever(Math.min(1, R.t / 0.25));
      if (R.t > TAKE_UP) { R.v = Math.min(V_DOWN, R.v + dt * V_DOWN / 0.35); R.d = Math.min(LIFT.DEPTH - 0.4, R.d + R.v * dt); }
      if (R.t >= DOWN_T && !R.fading) { R.fading = true; g.startTransition(() => this.arrive(R), ['sewer']); }
      // (the scene change gave up: the area could not be built. The deck brings him back up)
      else if (R.fading && !g.trans) { R.dir = 'up'; R.t = 0; R.from = R.d; }
    } else {
      const from = R.from ?? RISE, u = Math.min(1, R.t / (R.from ? R.from / RISE * RISE_T + 0.2 : RISE_T));
      R.d = from * (1 - u) * (1 - u);
      if (u >= 1) { R.d = 0; H.setDeck(0); h.pos.y = g.physics.groundAt(h.pos.x, h.pos.z); h.sync(); this.endRide(); return; }
    }
    H.setDeck(R.d);
    // planted on the deck: drawn to its middle, standing
    const k = 1 - Math.exp(-12 * dt);
    h.pos.x += (H.x - h.pos.x) * k; h.pos.z += (H.z - h.pos.z) * k; h.pos.y = H.deckTop();
    h.vy = 0; h.onGround = true;
    h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
    if (h.shadow && R.d > 0.05) h.shadow.visible = false;   // (his blob stays on the lane, over the hole: off while down)
  }
  // down: the scene changes to the hall, where he always arrives
  arrive(R) {
    if (this.ride !== R) return;   // (a game loaded during the fade)
    this.endRide();
    this.game.enterRoom('sewer', null, true);
  }
  // the ride over (or cut short by a load): play again, the camera its own, the deck at the top, the lever up
  endRide() {
    const R = this.ride, g = this.game;
    if (!R) return;
    this.ride = null;
    if (g.cutscene === R.fn) { g.cutscene = null; if (g.state === 'cutscene') g.setState('play'); }
    if (R.cam && g.camRig.override === R.cam) g.camRig.override = null;
    if (R.sil) R.sil.visible = true;
    this.H?.setDeck(0); this.H?.setLever(0);
  }
  // up the well-house shaft: out on the deck in the grate (sewerExit), which rises the last stretch with him
  onExitRoom(id) {
    const g = this.game, H = this.H, h = g.hero;
    if (id !== 'sewer' || g.room || !H || Math.hypot(h.pos.x - H.x, h.pos.z - H.z) > 0.3) return;
    this.endRide();
    this.startRide('up');
  }

  // ---------------------------------------------------------------- Arthur, afterwards (asked before the chapter)
  talkFirst(npc) {
    const f = this.f, g = this.game;
    if (npc.def.id !== 'arthur' || !f.sw_chest || f.sw_arthur) return false;
    if (g.hero.body === 'zoe' || g.hero.body === 'worker') return false;
    this.chain([['hero', 'sw_tw_ar1'], ['arthur', 'sw_ar1'], ['hero', 'sw_tw_ar2'], ['arthur', 'sw_ar2'], ['hero', 'sw_tw_ar3'], ['arthur', 'sw_ar3']], () => {
      f.sw_arthur = true; g.save(false);
    });
    return true;
  }
}
