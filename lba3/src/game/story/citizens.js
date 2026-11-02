// WORLD-LIFE (WORKLIST #37): the residents who walk round Citadel (src/game/walkers.js, walkrounds.js): their cast entries,
// what they say when spoken to, and when the story takes them off the streets. Not a chapter: the director asks it after the
// chapter in progress, so anyone a chapter places is placed by the chapter first and only a resident is ever roaming.
// No story flags and nothing saved: a resident's round starts over after a load.
import { ChapterBase } from './base.js';
import { t } from '../i18n.js';
import '../text/walkers.js';
import { ambientDefs } from '../walkrounds.js';
import { TownBusy } from '../townbusy.js';

export const EVAC_STAY = new Set(['maro', 'tilde']);

export class Citizens extends ChapterBase {
  // TOWN-LIFE-2: the town's small business round its people (heads turning, a word when bumped, the plaza's chatter
  // overheard, Odile's counter, Tobb's crates, gulls, the harbour's sounds): townbusy.js, once per world
  constructor(story) {
    super(story);
    const W = this.game.world;
    if (W?.updaters && !W.busy) W.busy = new TownBusy(this.game);
  }
  npcDefs() {
    // (rebuilt when an area its residents live in has just been built; otherwise the same list)
    const key = (this.game.regions?.built('zeelich') ? 1 : 0) + (this.game.regions?.built('desert') ? 2 : 0);
    if (!this._defs || this._key !== key) { this._key = key; this._defs = ambientDefs(this.game); }
    return this._defs;
  }
  // the streets are empty while everyone is mustered at the depot (the evacuation); then back where their rounds start
  // (TOWN-LIFE-3: but two neighbours, Maro and Tilde, are still packing: bundles out of their houses, a word at the plaza's
  //  benches about it, back for more: walkrounds.js their stops of the town's state 2)
  get gone() { return this.story.cur?.key === 'evacuation'; }
  place(id) {
    const n = this.game.npcs.find((x) => x.def.id === id);
    if (!n?.ambient || n.def.indoor) return undefined;   // (INTERIOR-LIFE: the rooms' and the ports' people are story/interiors.js's)
    if (this.gone && !EVAC_STAY.has(id)) { n.away = 'story'; return null; }
    if (n.away === 'story') { n.away = null; return n.reset(); }
    return undefined;
  }
  // what is said first depends on the town (the well is dry before chapter 2's heat) and on what the resident is doing
  linesFor(npc) {
    const id = npc.def.id, f = this.f, has = (k) => t(k) !== k;
    const dry = this.story.index === 0 || (this.story.index === 1 && !f.c1_water);
    const hot = !dry && this.story.index === 1;   // (chapter 2, the water back: the town's talk is the heat)
    const gone = hot && !!f.c1_veskGone;          // (TOWN-LIFE-2: then the light over the fortress that took Vesk away)
    const evac = this.story.cur?.key === 'evacuation', home = this.story.cur?.key === 'home';   // (TOWN-LIFE-3: packing; the party)
    const busy = ['seated', 'sitin', 'chat'].includes(npc.st) || !!npc.carrying || /tend|water|draw|put/.test(npc.stop?.act || '');
    const keys = [];
    if (evac && has(`rs_${id}_evac`)) keys.push(`rs_${id}_evac`);
    if (home && has(`rs_${id}_home`)) keys.push(`rs_${id}_home`);
    if (busy && has(`rs_${id}_work`)) keys.push(`rs_${id}_work`);
    if (dry && has(`rs_${id}_dry`)) keys.push(`rs_${id}_dry`);
    if (gone && has(`rs_${id}_gone`)) keys.push(`rs_${id}_gone`);
    if (hot && has(`rs_${id}_hot`)) keys.push(`rs_${id}_hot`);
    // (INTERIOR-LIFE: the spaceports' people: `_g0…` while passenger flights are grounded, chapters 1–3; `_f0…` once they run)
    const fl = this.story.index >= 3 ? 'f' : 'g';
    for (let i = 0; i < 4 && has(`rs_${id}_${fl}${i}`); i++) keys.push(`rs_${id}_${fl}${i}`);
    for (let i = 0; i < 6 && has(`rs_${id}_${i}`); i++) keys.push(`rs_${id}_${i}`);
    return keys;
  }
  talkFirst(npc) {
    if (!npc.ambient) return false;
    const keys = this.linesFor(npc);
    if (!keys.length) return false;
    const n = (npc.talkN = (npc.talkN ?? -1) + 1);
    npc.engage();
    this.chain([[npc.def.id, keys[n % keys.length]]], () => npc.release());
    return true;
  }
}
