// DESERT-BAR (8.11.2026, Citadel's bar: docs/lba-maturity/citadel-bar.md; the inventory: desert-inventory.md): Desert
// Island's structures a player reads as usable do something, as Citadel's stands do (story/stands.js). Not a chapter:
// the director (index.js) asks it after the chapter in progress. No story flags: what it says is read from the story
// (story/kesh.js lifePhase: dry · wet · steam · after · evac · net · home).
//   - the pier's KESH sign, the research post's gate sign, Ilka's survey board at her camp (a hint in chapter 4: the
//     crystals grow on warm ground, as the dig's warm discs will show), the School of Magic's signpost (its slate thanks
//     him once the pupils' crystal is awake: purposes.js), Hesk's yacht stop (the ferry chalked out while the project
//     has it, the glider later);
//   - the oasis: dry mud before the pump runs; a drink once it does gives back a little life (once in a while), warm and
//     sour while the steam threatens it (chapter 5 before the vent).
// The words are text/desertlife.js's; so are the story's people's lines between their chapters (idle_<id>_<chapter>:
// prologue.js baseTalk), Kesh's three walkers' (story/citizens.js) and the keepers' in Kesh's homes (story/ihomes.js).
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/desertlife.js';

const DRINK_EVERY = 20;   // s between two drinks that give life back
// the oasis's drinking place (desert-local: the pond at (−40, −15), its collider 7.7 m round; on the village side, 3.5 m
// from Safi's dipping place, clear of the pump's joint and of the listening spot by the tower)
const OASIS_DRINK = { x: -45.8, z: -9.2, r: 1.8 };

export class DesertLife extends ChapterBase {
  get D() { return this.game.regions?.built('desert'); }
  get K() { return this.story.kesh; }
  phase() { return this.K?.open ? this.K.lifePhase() : null; }
  // a key for the state, else the plain one
  keyFor(base) { const p = this.phase(), k = `${base}_${p}`; return p && t(k) !== k ? k : base; }
  things() {
    const D = this.D; if (!D) return [];
    if (this._things && this._D === D) return this._things;
    const out = (D.reads || []).map((r) => ({ kind: 'dl_read', id: r.id, x: r.x, z: r.z, r: r.r }));
    // (Hesk's yacht stop faces (−0.91, −0.41), toward the pier road: keshlife.js; read from 1.4 m before it)
    if (D.kesh?.board) out.push({ kind: 'dl_read', id: 'board', x: D.kesh.board.x - 0.91 * 1.4, z: D.kesh.board.z - 0.41 * 1.4, r: 1.5 });
    out.push({ kind: 'dl_oasis', x: D.group.position.x + OASIS_DRINK.x, z: D.group.position.z + OASIS_DRINK.z, r: OASIS_DRINK.r });
    this._D = D; this._things = out;
    return out;
  }
  interactables(consider, dist) {
    const g = this.game;
    if (g.room?.id !== 'desert' || !this.K?.open) return;
    const b = g.hero.body; if (b === 'zoe' || b === 'worker') return;
    for (const it of this.things()) {
      const label = it.kind === 'dl_oasis' ? (this.wet() ? 'p_drink' : 'p_look') : 'p_read';
      consider(dist(it.x, it.z), it.r, { ...it, label });
    }
  }
  wet() { return (this.D?.oasis?.level ?? 0) > 0.5; }
  interact(it) {
    const g = this.game, h = g.hero;
    if (it.kind === 'dl_read') {
      g.audio.play('paper');
      // (chapter 5: the ferry is requisitioned partway through; until then the board and the gate read as in chapter 4)
      const early = this.phase() === 'steam' && !this.f.c5_ferryTaken && (it.id === 'board' || it.id === 'post');
      const key = it.id === 'school' ? (this.f.pp_lamp ? 'dl_school_lit' : 'dl_school') : early ? `dl_${it.id}_wet` : this.keyFor('dl_' + it.id);
      g.say('', [t(key)]);
      return true;
    }
    if (it.kind === 'dl_oasis') {
      if (!this.wet()) { g.say('n_hero', [t('dl_oasis_dry')], null, h); return true; }
      if (h.hp < h.maxHp && !(this._drank > g.time - DRINK_EVERY)) { this._drank = g.time; h.hp = Math.min(h.maxHp, h.hp + 2); g.audio.play('heal'); }
      const p = this.phase();
      g.say('n_hero', [t(p === 'steam' ? 'dl_oasis_steam' : p === 'wet' ? 'dl_oasis_drink' : 'dl_oasis_full')], null, h);
      return true;
    }
    return false;
  }
}
