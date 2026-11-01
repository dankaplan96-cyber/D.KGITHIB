// Under the Street (WA-14, optional, from chapter 1 on): Citadel's old sewers (src/game/sewers.js). Not a chapter:
// the director (index.js) asks it after the chapter in progress, like the town's side stories (life.js). Its state is
// flags prefixed sw_ (saved with the game; a save from before has none of them and simply finds the grate shut).
//
//   1. The grate in the lane north of the house, by the pump: something knocks down there, and there's chalk on the
//      rim, an arrow and "A + L" (Arthur's hand). Twinsen lifts the grate (sw_hatch): lifted, it is a door down.
//      Climbing back out he puts it back; a loaded game finds it shut; he lifts it again without a word.
//   2. The flooded hall. The project's new heat pipe comes down the well-house shaft into a blue valve box bolted onto
//      the old gate winch: its brace jams the winch, and the valve knocks every few seconds. Eased shut, the knocking
//      stops and the winch turns: the gate at the back rises (sw_valve).
//   3. The treasure room behind it: the star chest holds Arthur's map, a stub of chalk and someone's old coins
//      (sw_chest: the map, found; a clover, owed until picked up). The barrels in both rooms give, as containers do.
//   4. Back home, Arthur is asked about it (sw_arthur): he and Lulu found the room before the pipe went in.
// Nothing on the main path needs any of it.
import { ChapterBase } from './base.js';
import { SEWER } from '../sewers.js';
import '../text/sewers.js';

export class SewerLife extends ChapterBase {
  get H() { return SEWER.hatch; }
  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
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
    const g = this.game;
    // (out of the sewers by the well-house ladder, he puts the grate back behind him)
    const here = g.room?.id ?? 'citadel';
    if (here === 'citadel' && this.was?.startsWith('sewer') && this.H?.open) this.H.setOpen(false);
    this.was = here;
    const H = this.H, hp = g.hero.pos;
    if (here === 'citadel' && H?.open && !H.armed && Math.hypot(hp.x - H.x, hp.z - H.z) > 0.9) H.armed = true;
    if (here !== 'sewer' || this.f.sw_valve || !SEWER.hall || g.state !== 'play') { this.beat = 0; return; }
    this.beat = (this.beat || 0) + dt;
    if (this.beat >= 2.8) { this.beat = 0; SEWER.hall.knock(); g.audio.play('clunk'); }
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, R = g.room;
    if (g.hero.body === 'zoe' || g.hero.body === 'worker') return;
    if (!R) {
      const H = this.H;
      if (H && !H.open) consider(dist(H.x, H.z), 1.5, { kind: 'swhatch', label: 'p_sw_lift' });
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
