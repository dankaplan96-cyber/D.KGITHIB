// WORLD-LIFE (WORKLIST #37): the residents who walk round Citadel (src/game/walkers.js, walkrounds.js): their cast entries,
// what they say when spoken to, and when the story takes them off the streets. Not a chapter: the director asks it after the
// chapter in progress, so anyone a chapter places is placed by the chapter first and only a resident is ever roaming.
// No story flags and nothing saved: a resident's round starts over after a load.
import { ChapterBase } from './base.js';
import { t } from '../i18n.js';
import '../text/walkers.js';
import { ambientDefs, DESERT_ROSTER_IDS } from '../walkrounds.js';
import { TownBusy } from '../townbusy.js';
import { storyDefs, dressStoryLife } from '../storylife.js';
import { isleDefs, islesKey, dressIsle, ISLE_PEOPLE } from '../islandlife.js';
import { portPhase } from '../roomlife.js';
import '../text/storylife.js';

export const EVAC_STAY = new Set(['maro', 'tilde']);
// (DESERT-BAR: Citadel's evacuation empties Citadel's streets, not Kesh's: Safi, Tamu and Bashir keep their rounds on
//  Desert Island in chapter 8, which the ferry still reaches)
const OFF_CITADEL = new Set(DESERT_ROSTER_IDS);

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
    const R = this.game.regions, key = (R?.built('zeelich') ? 1 : 0) + (R?.built('desert') ? 2 : 0) + (R?.built('hamalayi') ? 4 : 0) + '|' + islesKey(this.game);   // (PEOPLE-1: and which islands are built)
    if (!this._defs || this._key !== key) { this._key = key; this._defs = [...ambientDefs(this.game), ...storyDefs(this.game), ...isleDefs(this.game)]; }
    return this._defs;
  }
  // WC-3: the places' things the story residents work at (storylife.js), once per area as it is built
  decorate() { for (const a of ['desert', 'hamalayi']) dressStoryLife(this.game, a); for (const n of Object.keys(ISLE_PEOPLE)) dressIsle(this.game, n); }
  // the streets are empty while everyone is mustered at the depot (the evacuation); then back where their rounds start
  // (TOWN-LIFE-3: but two neighbours, Maro and Tilde, are still packing: bundles out of their houses, a word at the plaza's
  //  benches about it, back for more: walkrounds.js their stops of the town's state 2)
  get gone() { return this.story.cur?.key === 'evacuation'; }
  place(id) {
    const n = this.game.npcs.find((x) => x.def.id === id);
    if (!n?.ambient || n.def.indoor) return undefined;   // (INTERIOR-LIFE: the rooms' and the ports' people are story/interiors.js's)
    if (n.def.story) return this.placeStory(n);
    if (this.gone && !EVAC_STAY.has(id) && !OFF_CITADEL.has(id)) { n.away = 'story'; return null; }
    if (n.away === 'story') { n.away = null; return n.reset(); }
    return undefined;
  }
  // ---------------------------------------------------------------- WC-3: the residents where the story goes (storylife.js)
  // Each has a state of its area read from the chapter and the story's flags (`phase`: a round, or null: not here). A
  // change takes it at once where nobody can see it (another area, a scene change's black, out of the camera's view);
  // in view it carries on with what it was doing and changes as soon as it (and where it is going) is out of sight
  // (update). Nothing is saved: after a load the state is read again and the round starts over.
  placeStory(n) {
    const d = n.def;
    if (!d.rounds) return undefined;   // (its area not built yet: hidden, refreshCast leaves it so)
    const want = d.phase(this.f, this.story) ?? null;
    if (n.phaseKey !== undefined && want === n.phaseKey && n.away !== 'story') { n.wantPhase = undefined; return undefined; }
    if (n.phaseKey !== undefined && this.seen(n, want)) { n.wantPhase = want; return undefined; }
    return this.applyPhase(n, want);
  }
  applyPhase(n, want) {
    n.wantPhase = undefined; n.phaseKey = want;
    n.engaged = false; n.inside = false; n.hold = 0; n.sit = null; n.path = null; n.job = null; n.insideT = 0;
    if (want == null) { n.away = 'story'; return null; }
    n.away = null;   // (asleep or away: here now; update puts it to sleep again if the hero is in another area)
    n.setRound(n.def.rounds[want].map((s) => ({ ...s })), n.def.start || 0);
    const s = n.stop;
    return { x: s.x, z: s.z, a: s.a ?? n.angle };
  }
  // could the player see this resident now (where it stands, or where its new round starts)?
  seen(n, want) {
    const g = this.game, W = g.walkers;
    if (!W || !n.present || n.away || n.inside || g.trans || (g.state !== 'play' && g.state !== 'dialog')) return false;
    if ((g.room?.id ?? 'citadel') !== n.def.area) return false;
    W.prep();
    if (!W.unseen(n.pos.x, n.pos.z, n.pos.y)) return true;
    const st = want != null ? n.def.rounds[want] : null, s0 = st?.[(n.def.start || 0) % st.length];
    return !!s0 && !W.unseen(s0.x, s0.z, g.physics.groundAt(s0.x, s0.z));
  }
  // a waiting change made out of sight; and out of its area a story resident sleeps (no update at all: walkers.js skips
  // anyone `away`), carrying on where it was when the hero comes back
  update(dt) {
    if ((this._t = (this._t || 0) + dt) < 0.25) return;
    this._t = 0;
    const g = this.game, here = g.room?.id ?? 'citadel';
    this._story ||= g.npcs.filter((n) => n.def?.story);
    if (this._storyN !== g.npcs.length) { this._storyN = g.npcs.length; this._story = g.npcs.filter((n) => n.def?.story); }
    for (const n of this._story) {
      if (!n.def.rounds) continue;
      if (n.wantPhase !== undefined && !this.seen(n, n.wantPhase)) {
        const p = this.applyPhase(n, n.wantPhase);
        n.setPresent(!!p); n.placed = p;
        if (p) n.placeAt(p);
      }
      if (n.away === 'story') continue;
      if (here !== n.def.area) { if (!n.away) n.away = 'sleep'; }
      else if (n.away === 'sleep') n.away = null;
    }
  }
  // what is said first depends on the town (the well is dry before chapter 2's heat) and on what the resident is doing
  linesFor(npc) {
    const id = npc.def.lines || npc.def.id, f = this.f, has = (k) => t(k) !== k;   // (WC-4: one of the town's people in another place has lines of its own there)
    const dry = this.story.index === 0 || (this.story.index === 1 && !f.c1_water);
    const hot = !dry && this.story.index === 1;   // (chapter 2, the water back: the town's talk is the heat)
    const gone = hot && !!f.c1_veskGone;          // (TOWN-LIFE-2: then the light over the fortress that took Vesk away)
    const evac = this.story.cur?.key === 'evacuation', home = this.story.cur?.key === 'home';   // (TOWN-LIFE-3: packing; the party)
    const busy = ['seated', 'sitin', 'chat'].includes(npc.st) || !!npc.carrying || /tend|water|draw|put/.test(npc.stop?.act || '');
    const keys = [];
    // (DESERT-BAR: Kesh's three follow Kesh's state first, story/kesh.js lifePhase: rs_safi_kdry … rs_safi_khome)
    const kp = OFF_CITADEL.has(id) && this.story.kesh?.open ? this.story.kesh.lifePhase() : null;
    if (kp && has(`rs_${id}_k${kp}`)) keys.push(`rs_${id}_k${kp}`);
    if (npc.phaseKey && has(`rs_${id}_${npc.phaseKey}`)) keys.push(`rs_${id}_${npc.phaseKey}`);   // (WC-3: the area's state: Lhar or the monastery, at work or packing)
    if (evac && has(`rs_${id}_evac`)) keys.push(`rs_${id}_evac`);
    if (home && has(`rs_${id}_home`)) keys.push(`rs_${id}_home`);
    if (busy && has(`rs_${id}_work`)) keys.push(`rs_${id}_work`);
    if (dry && has(`rs_${id}_dry`)) keys.push(`rs_${id}_dry`);
    if (gone && has(`rs_${id}_gone`)) keys.push(`rs_${id}_gone`);
    if (hot && has(`rs_${id}_hot`)) keys.push(`rs_${id}_hot`);
    // (INTERIOR-LIFE: the spaceports' people: `_g0…` while passenger flights are grounded, chapters 1–3; `_f0…` once they run.
    //  WC-4: `_e0…` in the evacuation, `_c0…` in chapter 9, `_a0…` in chapter 10 and the epilogue; one who has none of
    //  that state's lines says the flying ones)
    const ph = portPhase(this.story), L = { grounded: 'g', flying: 'f', evac: 'e', council: 'c', after: 'a' }[ph];
    const fl = ph === 'grounded' || has(`rs_${id}_${L}0`) ? L : 'f';
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
