// INTERIOR-LIFE: the people of Citadel's interiors and of the two spaceports (src/game/roomlife.js), and the household
// rounds of the story's people at home (roomlife.js StoryRounds). Not a chapter: the director (index.js) asks it after the
// chapter in progress and the town's stories, so anyone a chapter places is placed by the chapter first. No story flags
// and nothing saved: a round starts over after a load. Their lines are text/interiors.js, said through story/citizens.js
// (every Resident's talk: what is said first depends on the town's state and on what they are doing).
//
// Who is there when:
//   - the rooms: always, except in the evacuation (chapter 8), when only Luc and Mr Bazoo stay, packing (`stays`);
//   - Citadel Spaceport: the grounded set (a port guard, two stranded travellers) in chapters 1–3, the flying set
//     (passengers, a visitor at the board, a family) from chapter 4; the clerk and the mechanic in both; nobody in the
//     evacuation (the project's boarding queue is the story's: evacuation.js);
//   - Zeelich Spaceport: whenever Zeelich is built, but the evacuation.
import { ChapterBase } from './base.js';
import { placeDefs, StoryRounds } from '../roomlife.js';
import '../text/interiors.js';

export class InteriorLife extends ChapterBase {
  constructor(story) {
    super(story);
    this.rounds = new StoryRounds(this.game);
  }
  npcDefs() {
    // (rebuilt when a place its people live in has just been built; otherwise the same list)
    const R = this.game.regions, ids = ['tavern', 'bazoo', 'ticket', 'pharmacy', 'nbrhouse', 'nellhouse', 'baggage', 'zeelich'];
    const key = ids.map((id) => (R?.built(id) ? 1 : 0)).join('') + (this.game.world?.spaceport ? 1 : 0) + (R?.built('zeelich')?.spaceport ? 1 : 0);
    if (!this._defs || this._key !== key) { this._key = key; this._defs = placeDefs(this.game); }
    return this._defs;
  }
  get evac() { return this.story.cur?.key === 'evacuation'; }
  // is this person in their place in the chapter in progress?
  here(d) {
    if (this.evac) return !!d.stays;
    if (d.when === 'grounded') return this.story.index < 3;
    if (d.when === 'flying') return this.story.index >= 3;
    return true;
  }
  place(id) {
    const n = this.game.npcs.find((x) => x.def.id === id);
    if (!n?.ambient || !n.def.indoor) return undefined;
    if (!this.here(n.def)) { n.away = 'story'; return null; }
    if (n.away === 'story') { n.away = null; return n.reset(); }
    return undefined;
  }
  // refreshCast: a placement that leaves a household round's person on their mark does not put them back on it
  keeps(n, p) { return this.rounds.keeps(n, p); }
  update(dt) { this.rounds.update(dt); }
}
