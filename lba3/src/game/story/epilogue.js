// Epilogue — "Home".
//
// Four days later, back on Citadel Island: dinner at home with Zoé and Arthur (the prologue's "be back for
// dinner"), then the end screen, and free roam where everyone in town has something new to say.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/ch3.js';

const LINES = {
  gilbert: 'ep_gilbert', mira: 'ep_mira', doran: 'ep_doran', pippa: 'ep_pippa', tim: 'ep_tim', lulu: 'ep_lulu', xil: 'ep_xil', arthur: 'ep_arthur', zoe: 'ep_zoe_idle',
};

export class Epilogue extends ChapterBase {
  on() { return this.reached(); }

  // EPILOGUE-HOME (the campaign): four days on, everyone the later chapters moved is back where they live, and has a
  // word about it (idle_<id>_home, said through baseTalk where the epilogue has no line of its own). Before, the last
  // chapter to place someone kept him there for good: Gilbert at the fortress shelter's door, Tim and Lulu at the depot
  // bunker, the hill families up by the plateau, Mira down in the valve room, Ilka and Dallan at the bore, Oku on his
  // mill, Pim holding the dome's mirror, Yorna's village in the monks' camp; and Doran, Baldino, Nara and Oku were not
  // in the world at all. (Each spot is read from its own area: an area not built yet makes him wait for it, refreshCast.)
  place(id) {
    if (!this.on()) return undefined;
    const g = this.game, R = g.rooms, W = g.world;
    const H = R.house?.npcSpots || {};
    const def = () => { const n = this.npc(id); return n ? { x: n.def.x, z: n.def.z, a: n.def.angle ?? 0 } : undefined; };
    switch (id) {
      case 'zoe': return H.zoe || undefined;
      case 'arthur': return H.arthur || undefined;
      case 'vesk': case 'guard': case 'worker': return null;
      // Citadel: the well, the water office, the harbour, the street
      case 'gilbert': return { x: W.well.x + 2.2, z: W.well.z + 1.4, a: Math.atan2(-1, 1.4), anim: 'wipe' };
      case 'mira': return R.office?.npcSpots?.mira;
      case 'doran': return { x: W.pierStart.x, z: W.pierStart.z + 2.2, a: Math.PI };
      case 'tim': case 'lulu': case 'xil': case 'farmer1': case 'farmer2': case 'farmer3': return def();
      // Zeelich: Baldino at his bench, Nara and Oku on the street
      case 'baldino': return R.workshop?.npcSpots?.baldino ?? R.zeelich?.npcSpots?.baldinoOut;
      case 'nara': return R.zeelich?.npcSpots?.esmer1;
      case 'oku': return R.zeelich?.npcSpots?.esmer2;
      // Desert Island: Kesh's square (Ilka and Dallan as after the vent, chapter 5)
      case 'ilka': case 'dallan': case 'tarra': case 'hesk': {
        const D = R.desert; if (!D) return undefined;
        const pz = D.plaza, S = D.npcSpots;
        if (id === 'ilka') return { x: pz.x + 2.2, z: pz.z + 1.0, a: -1.2 };
        if (id === 'dallan') return { x: pz.x - 2.4, z: pz.z + 1.6, a: 1.4 };
        return S[id];
      }
      // the Hamalayi: Lhar lived in again (its people were in the monks' camp since chapter 6)
      case 'yorna': case 'pim': case 'lhar1': case 'lhar2': case 'lhar3': {
        const M = R.hamalayi; if (!M) return undefined;
        const S = M.npcSpots;
        return { yorna: S.yorna, pim: S.pim, lhar1: S.v1, lhar2: S.v2, lhar3: S.v3 }[id];
      }
    }
    return undefined;
  }

  begin() {
    const g = this.game, h = g.hero;
    this.story.chapters.find((c) => c.key === 'network')?.showProps?.();   // (Baldino's code box leaves the bore with him)
    h.swapBody?.('twinsen');
    h.hasBall = true; h.noBehaviours = false;
    this.sheathe();   // (at the family table he is unarmed; the weapon he chose is still equipped for free play)
    g.world.bunting?.setVisible(true);
    g.enterRoom('house', null, true);
    g.audio.setMood?.('home');
    this.story.refreshCast();
    this.chain([['narrator', 'ep_narr'], ['zoe', 'ep_zoe_1'], ['hero', 'ep_tw_1'], ['arthur', 'ep_ar_1'], ['hero', 'ep_tw_2'], ['zoe', 'ep_zoe_2'], ['zoe', 'ep_zoe_3']], () => {
      this.f.ep_dinner = true;
      g.save(false);
      this.showEnd();
    });
  }
  // The sword in his hand is only drawn (Hero.showSword); the equipped weapon is left alone, so free play has it back
  // as the player chose. Hero.update shows it again each play frame, so until the dinner is over it is hidden again
  // after that (update() below).
  sheathe() { const m = this.game.hero.swordMesh; if (m) m.visible = false; }
  update() { if (this.on() && !this.f.ep_dinner) this.sheathe(); }
  showEnd() {
    const g = this.game;
    g.setState('ending');
    g.hud.show(false);
    document.querySelector('#ending h1').textContent = t('ep_end_title');
    document.querySelector('#ending p').innerHTML = t('ep_end_text');
    g.showScreen('ending');
    g.audio.setMood?.('ending');
  }
  afterEnding() { this.f.ep_free = true; this.game.updateObjective(); }

  talk(npc) {
    if (!this.on()) return false;
    const key = LINES[npc.def.id];
    if (!key) return false;
    this.chain([[npc.def.id, key]]);
    return true;
  }
  applyFlags() { this.game.world.bunting?.setVisible(this.on()); if (this.on()) this.game.world.station?.setActive?.(true); } // (the bore runs as a shield: the heat posts glow again)
  // (Citadel's town doors, and the two rooms where someone waits with a word after the ending: Baldino's workshop on
  //  Zeelich and Sefa's dome in the Hamalayi; their doors belonged to their chapters only, so Baldino stood at his bench
  //  behind a door with no prompt. Their exits are the chapters' own: Story.exitTo looks back through them.)
  doors() {
    const out = this.story.townDoors(), RG = this.game.regions, Z = RG.built('zeelich'), M = RG.built('hamalayi');
    if (Z && RG.has('workshop')) out.push({ region: 'zeelich', x: Z.workshopDoor.x, z: Z.workshopDoor.z, r: 0.9, room: 'workshop' });
    if (M?.observatory && RG.has('obsv')) out.push({ region: 'hamalayi', x: M.observatory.door.x, z: M.observatory.door.z, r: 1.0, room: 'obsv' });
    return out;
  }
  objective() { return this.goal(this.f.ep_dinner ? 'ep_obj_free' : 'ep_obj_home'); }
  journal() { return [{ key: 'ep_j_home', done: !!this.f.ep_dinner }]; }
}
