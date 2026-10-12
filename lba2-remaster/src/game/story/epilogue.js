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

  place(id) {
    if (!this.on()) return undefined;
    const H = this.game.rooms.house?.npcSpots || {};
    switch (id) {
      case 'zoe': return H.zoe || undefined;
      case 'arthur': return H.arthur || undefined;
      case 'vesk': case 'baldino': case 'nara': case 'oku': case 'guard': case 'worker': return null;
    }
    return undefined;
  }

  begin() {
    const g = this.game, h = g.hero;
    h.swapBody?.('twinsen');
    h.hasBall = true; h.noBehaviours = false;
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
  doors() { return this.story.townDoors(); }
  objective() { return this.goal(this.f.ep_dinner ? 'ep_obj_free' : 'ep_obj_home'); }
  journal() { return [{ key: 'ep_j_home', done: !!this.f.ep_dinner }]; }
}
