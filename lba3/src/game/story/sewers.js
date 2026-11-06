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
//   SEWERS-1 (CONNECTIONS_AUDIT.md S-1…S-5, C-2; the user 2.11: "the descent to the sewer should lead where it led in
//   the second game, more places to reach the sewer, e.g. from the wizard, and the secret place should mean something"):
//   LBA2's four ways into the hall, beside ours (the grate's lift stays the fifth):
//   5. Luc's cellar: a broken stretch of the walkway's railing over the dark drop. He falls through and comes up in the
//      hall's water by the east pier (one way). Old Fenn in the tavern warns about the hole (sw_fell: the first time).
//   6. The terrace porch above the stone house (stoneup): bolted from below. The bolt is on the hall's raised north
//      walkway; drawn, the door works both ways (sw_bolt).
//   7. Bersimon's tent: a trapdoor under his rug, a stair down to the hall's west end. Told about the warm air rising
//      under the town, he rolls the rug back and gives Twinsen the key of the little room he keeps down there (sw_ber,
//      the key sw_key until used). Coming up the stair from below opens it too (sw_trap). Both ways, every chapter.
//   8. The lower town's street door (pink): straight into the hall at the Works door by the east pier's head. Fosse,
//      the sewer man (LBA2's grumbler, twelve years on), wants the project's knocking stopped (sw_fosse); once the valve
//      is eased he puts the Works door on the latch, the way back out to the street (sw_works).
//   9. The globe's room behind the little blue door (Bersimon's key: sw_gdoor): the project's heat pipe has clouded his
//      weather globe. The bleed cock shut, it clears and shows the sky over Citadel as the weather is (sw_globe); Bersimon
//      explains that's where his magic for Twinsen comes from (sw_berGlobe). Looked at again, it shows the weather then.
//  10. Tralu's cave (C-2): Raph's guitar case, and a cache under the lantern (a clover, once: sw_cache). Luc mentions it.
//   Old saves have none of these flags: every door they name is shut and nothing is owed.
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
    this.falling = false;
    this.H?.setOpen(false);   // (shut whenever a game is loaded: lifted again, without a word, once he knows it)
    this.applyRooms();
    this.settleOwed('sw_oweClover', 'clover', 1, 'sw_toast_owed');
    this.settleOwed('sw_oweClover2', 'clover', 1, 'sw_toast_owed2');
  }
  // the rooms below as the flags have them (LAZY-REGIONS: also right after they are built, which may be while the
  // grate stands open above: that stays as it is)
  applyRooms() {
    const f = this.f, H = SEWER.hall;
    H?.setValve(!!f.sw_valve, true);
    if (H) { H.setDoor('bolt', !!f.sw_bolt, true); H.setDoor('works', !!f.sw_works, true); H.setDoor('globe', !!f.sw_gdoor, true); }
    SEWER.vault?.setChest(!!f.sw_chest);
    SEWER.globe?.setClear(!!f.sw_globe, true);
    // (regions.built never builds: reading rooms.wtent built the wizard's tent on access, LAZY-REGIONS — lazyregions.mjs)
    const T = this.game.regions ? this.game.regions.built('wtent') : this.game.rooms?.wtent;
    T?.trap?.setOpen(!!f.sw_trap);
  }
  regionBuilt(ids) { if (['sewer', 'sewervault', 'sewerglobe', 'wtent'].some((id) => ids.includes(id))) this.applyRooms(); }
  items() {
    const f = this.f, out = [];
    if (f.sw_chest && !f.sw_arthur) out.push({ id: 'sw_map', icon: 'map' });
    if (f.sw_ber && !f.sw_gdoor) out.push({ id: 'sw_key', icon: 'key' });
    return out;
  }
  // the sky over Citadel as the weather has it (src/game/weather.js; off or held by the story: clear)
  sky() { const w = this.game.weather; return (w?.enabled?.() && !w.held && w.P?.twinsun?.state) || 'clear'; }
  journal() {
    const f = this.f;
    return [
      { key: 'sw_j_knock', done: !!f.sw_valve, show: f.sw_hatch },
      { key: 'sw_j_gate', done: !!f.sw_chest, show: f.sw_valve },
      { key: 'sw_j_arthur', done: !!f.sw_arthur, show: f.sw_chest },
      { key: 'sw_j_fosse', done: !!f.sw_works, show: f.sw_fosse },
      { key: 'sw_j_globe', done: !!f.sw_globe, show: f.sw_ber },
      { key: 'sw_j_ber', done: !!f.sw_berGlobe, show: f.sw_globe },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- the knock
  update(dt) {
    const g = this.game, here = g.room?.id ?? 'citadel';
    // S-2: through the gap in Luc's cellar: once he has dropped below the walkway over the hole, the scene changes
    if (here === 'tavcellar' && !this.falling && g.state === 'play' && !g.trans) {
      const D = g.room.drop, p = g.hero.pos;
      if (D && p.x > D.x0 && p.x < D.x1 && p.z > D.z0 && p.z < D.z1 && p.y < D.y - 0.6) { this.falling = true; g.audio.play('whoosh'); g.enterRoom('sewer', (R) => R.entries?.fall); }
    }
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
    const y = g.hero.pos.y;
    if (R.id === 'sewer' && SEWER.hall) {
      const H = SEWER.hall, v = H.valve;
      consider(dist(v.x, v.z), 1.3, { kind: 'swvalve', label: f.sw_valve ? 'p_look' : 'p_sw_ease' });
      if (!f.sw_bolt && Math.abs(y - H.bolt.y) < 0.5) consider(dist(H.bolt.x, H.bolt.z), 1.2, { kind: 'swbolt', label: 'p_sw_bolt' });
      if (!f.sw_works && y < 0.6) consider(dist(H.works.x, H.works.z), 1.2, { kind: 'swworks', label: 'p_door' });
      if (!f.sw_gdoor && y < 0.6) consider(dist(H.gdoor.x, H.gdoor.z), 1.2, { kind: 'swgdoor', label: f.sw_ber ? 'p_sw_unlock' : 'p_door' });
    }
    if (R.id === 'sewervault' && SEWER.vault) { const c = SEWER.vault.chest; consider(dist(c.x, c.z), 1.3, { kind: 'swchest', label: f.sw_chest ? 'p_look' : 'p_open' }); }
    if (R.id === 'sewerglobe' && SEWER.globe) {
      const G = SEWER.globe;
      if (!f.sw_globe) consider(dist(G.cock.x, G.cock.z), 1.2, { kind: 'swcock', label: 'p_sw_shut' });
      consider(dist(G.globe.x, G.globe.z), 1.3, { kind: 'swglobe', label: 'p_look' });
    }
    if (R.id === 'tralucave' && R.cache) {
      consider(dist(R.cache.case.x, R.cache.case.z), 1.2, { kind: 'swcase', label: 'p_look' });
      if (!f.sw_cache) consider(dist(R.cache.crate.x, R.cache.crate.z), 1.2, { kind: 'swcache', label: 'p_open' });
    }
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
      case 'swbolt':
        h.act('use', 0.7, () => {
          f.sw_bolt = true; SEWER.hall.setDoor('bolt', true); g.audio.play('clunk');
          say(['sw_bolt1'], () => g.save(false));
        }, 0.35);
        return true;
      case 'swworks': g.audio.play('deny'); return say([f.sw_fosse ? 'sw_works_shut2' : 'sw_works_shut']);
      case 'swgdoor':
        if (!f.sw_ber) { g.audio.play('deny'); return say(['sw_gdoor_shut']); }
        h.act('use', 0.6, () => {
          f.sw_gdoor = true; SEWER.hall.setDoor('globe', true); g.audio.play('door');
          say(['sw_gdoor1'], () => g.save(false));
        }, 0.3);
        return true;
      case 'swcock':
        h.act('use', 0.8, () => {
          f.sw_globe = true; SEWER.globe.setSky(this.sky()); SEWER.globe.setClear(true); g.audio.play('ropeCreak');
          say(['sw_cock1', 'sw_sky_' + this.sky(), 'sw_globe2'], () => g.save(false));
        }, 0.4);
        return true;
      case 'swglobe': return say(f.sw_globe ? ['sw_sky_' + this.sky()] : ['sw_globe_fog']);
      case 'swcase': return say(['sw_case']);
      case 'swcache': {
        const C = g.room.cache.crate;
        h.act('use', 0.7, () => {
          f.sw_cache = true; g.audio.play('chest');
          say(['sw_cache1'], () => {
            this.reward('sw_oweClover2', 'clover', 1, C.at.x + (C.x - C.at.x) * 0.5, 1.0, C.at.z + (C.z - C.at.z) * 0.5, { pop: true });
            g.save(false);
          });
        }, 0.35);
        return true;
      }
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
  // SEWERS-1: arrivals by the other ways (the director calls this after the chapter's own)
  onEnterRoom(id) {
    const g = this.game, f = this.f, h = g.hero, R = g.room, near = (p, r = 0.9) => !!p && Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < r;
    if (id === 'sewer' && this.falling) {
      // S-2: out of the water by the east pier, the splash still spreading
      this.falling = false;
      SEWER.hall?.splash(); g.audio.play('gurgle');
      if (!f.sw_fell) { f.sw_fell = true; this.chain([['hero', 'sw_fall1']]); }
      return;
    }
    this.falling = false;
    // S-4: in from the street, the Works door clicks shut behind him (until Fosse puts it on the latch)
    if (id === 'sewer' && !f.sw_works && near(R?.entries?.pink)) { g.audio.play('clunk'); if (!f.sw_pinkIn) { f.sw_pinkIn = true; this.chain([['hero', 'sw_pink1']]); } }
    // S-1: up the stair from the hall: he pushes the trapdoor open from below (the rug slides off)
    if (id === 'wtent' && !f.sw_trap && near(R?.entries?.sewer, 1.2)) { f.sw_trap = true; R.trap?.setOpen(true); g.audio.play('clunk'); }
    if (id === 'sewerglobe') SEWER.globe?.setSky(this.sky());
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
    const f = this.f, g = this.game, h = g.hero, id = npc.def.id;
    if (h.body === 'zoe' || h.body === 'worker') return false;
    const topUp = () => { if (h.mp < h.mpMax) { h.mp = h.mpMax; g.audio.play('heal'); g.hud.toast('wz_toast_magic'); } };   // (as always: prologue.js baseTalk)
    // S-1: Bersimon (after the arsenal's pearl, which is asked first) sends him down to look; S-5: and explains the globe
    if (id === 'bersimon' && !f.sw_ber) {
      topUp();
      this.chain([['bersimon', 'sw_ber1'], ['bersimon', 'sw_ber2'], ['hero', 'sw_tw_ber'], ['bersimon', 'sw_ber3']], () => {
        f.sw_ber = true; f.sw_trap = true; g.rooms.wtent?.trap?.setOpen(true); g.audio.play('clunk');
        g.found('sw_key', 'it_sw_key', () => g.save(false), { icon: 'key' });
      });
      return true;
    }
    if (id === 'bersimon' && f.sw_globe && !f.sw_berGlobe) {
      topUp();
      this.chain([['bersimon', 'sw_ber_globe1'], ['bersimon', 'sw_ber_globe2']], () => { f.sw_berGlobe = true; g.save(false); });
      return true;
    }
    // S-4: Fosse the sewer man
    if (id === 'fosse') {
      if (!f.sw_valve) {
        if (f.sw_fosse) { this.chain([['fosse', 'sw_fo_again']]); return true; }
        this.chain([['fosse', 'sw_fo1'], ['fosse', 'sw_fo2'], ['hero', 'sw_tw_fo'], ['fosse', 'sw_fo3']], () => { f.sw_fosse = true; g.save(false); });
        return true;
      }
      if (!f.sw_works) {
        this.chain([['fosse', 'sw_fo_quiet1'], ['fosse', 'sw_fo_quiet2']], () => { f.sw_fosse = true; f.sw_works = true; SEWER.hall?.setDoor('works', true); g.audio.play('clunk'); g.save(false); });
        return true;
      }
      this.chain([['fosse', 'sw_fo_after']]);
      return true;
    }
    if (id !== 'arthur' || !f.sw_chest || f.sw_arthur) return false;
    this.chain([['hero', 'sw_tw_ar1'], ['arthur', 'sw_ar1'], ['hero', 'sw_tw_ar2'], ['arthur', 'sw_ar2'], ['hero', 'sw_tw_ar3'], ['arthur', 'sw_ar3']], () => {
      f.sw_arthur = true; g.save(false);
    });
    return true;
  }
}
