// PURPOSES (the user, 3.11.2026: "whatever stays must give something to the journey, not just a superfluous place";
// docs/future/CLUTTER_AUDIT.md "Purposes"). Not a chapter: the director (index.js) asks it before the chapter in
// progress for talk, after it for places. Its state is flags prefixed pp_ (saved with the game). Tibbo's counter on
// Citadel is story/shops.js's.
//
// The pupils' lamp (Desert Island, from chapter 4): the School's second building is the pupils' dormitory. Its study
//   crystal, on a bracket by the door, went to sleep in the last storm. Oni (on the rim walk) says only a pure note wakes
//   it and points to the dig's singing fork (Ilka's, story/kit2b.js). Struck within reach (the attack key, tools.js →
//   story.forkHit) the crystal wakes; a ball only makes it ring for a moment. Reward: Ker'aooc's ward costs 10, not
//   20 (story/arsenal.js); if he already has the ward, her treatment refills his magic too.
// The long call (Zeelich, from chapter 3): Marl trains the project's guard dogs in the yard behind the north houses.
//   She teaches the long call; with Arthur's conch blown by her gate after talking to her, it is learned (pp_call).
//   From then on the conch sends a guard dog home to lie down, deaf to him for a while (guarddog.js calm,
//   gadgets.js), instead of startling it for three seconds. A hit breaks it.
// The kept old houses (Desert Island, from chapter 4): S40 is Bashir's home (his round has a stop at its door; a knock
//   points to him; his lines point to the dormitory); S28 is the dig crew's bunkhouse, whose board holds Surveyor
//   Anko's sketch of FunFrock's old pipes (a find: line two runs to the oasis, a clue for chapter 5's valves).
// Citadel: the statue's plaque is read (a pointer to FunFrock's asylum, whose register and cell hold finds).
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/purposes.js';

const LAMP_REACH = 3.2;   // (how far above the hero's feet the crystal may be for the fork's note: it sits 2.5 m up)

const LIGHTHOUSE_DOOR = { x: -107.5, z: 94.2 };   // (as network.js: the lamp room's door, now up its steps)
export class Purposes extends ChapterBase {
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  from(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  get D() { return this.game.regions?.built('desert'); }
  get Z() { return this.game.regions?.built('zeelich'); }
  roomId() { return this.game.room?.id ?? 'citadel'; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }

  // ---------------------------------------------------------------- state → world
  applyFlags() { this.applyLamp(); }
  regionBuilt(ids) { if (ids.includes('desert')) this.applyLamp(); }
  applyLamp() {
    const D = this.D, L = D?.studyLamp;
    if (!L) return;
    L.wake(!!this.f.pp_lamp);
    // the ball can reach it (it rings and goes dark again); gone from the ball's aim once it is awake
    if (!this.lampTarget || this.lampTarget.R !== D) {
      this.lampTarget = { R: D, x: L.x, y: L.y, z: L.z, r: 0.6, onHit: () => this.lampBall() };
      (D.ballTargets ||= []).push(this.lampTarget);
    }
    this.lampTarget.done = !!this.f.pp_lamp;
  }
  items() { return this.f.pp_survey ? [{ id: 'survey', icon: 'map' }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'pp_j_lamp', done: !!f.pp_lamp, show: f.pp_oniAsk || f.pp_lamp },
      { key: 'pp_j_ward', done: !!this.game.hero.arms?.protect, show: f.pp_lamp },
      { key: 'pp_j_call', done: !!f.pp_call, show: f.pp_marlAsk || f.pp_call },
      { key: 'pp_j_survey', done: true, show: f.pp_survey },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }
  // Ker'aooc's price for the ward (story/arsenal.js)
  wardPrice(full) { return this.f.pp_lamp ? Math.ceil(full / 2) : full; }

  // ---------------------------------------------------------------- places
  interactables(consider, dist) {
    if (!this.able()) return;
    const g = this.game, here = this.roomId(), y = g.hero.pos.y;
    if (here === 'citadel') {
      const S = g.world?.statue;
      if (S) { const px = S.x + Math.sin(S.ry) * 1.7, pz = S.z + Math.cos(S.ry) * 1.7; consider(dist(px, pz), 1.3, { kind: 'pp_plaque', label: 'p_read' }); }
      // (USER-ASKS 3: the lighthouse's door, up its steps, when no chapter opens it: it says so)
      const LD = LIGHTHOUSE_DOOR;
      if (dist(LD.x, LD.z) < 2 && !this.story.doors().some((d) => d.room === 'lighttop')) consider(dist(LD.x, LD.z), 1.4, { kind: 'pp_lighthouse', label: 'p_look' });
      return;
    }
    if (here !== 'desert' || !this.from('dig') || !this.D) return;
    const O = this.D.oldHomes || {}, L = this.D.studyLamp;
    const door = (d, what, label) => { if (d && Math.abs(y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'pp_door', what, label }); };
    // (DESERT-BAR: S40's door leads into Bashir's home now, Leya inside (ihomes.js); S28's into the crew's bunkhouse: the
    //  board is on the wall beside it; the dormitory's door leads in once the crystal is awake: knocked on only while it
    //  is dark inside)
    const B = this.D.s28board;
    if (B && O.s28 && Math.abs(y - O.s28.y) < 1.6) consider(dist(B.x, B.z), 1.3, { kind: 'pp_door', what: 's28', label: 'p_read' });
    else door(O.s28, 's28', 'p_read');
    if (!this.f.pp_lamp) door(O.hall, 'hall', 'p_knock');
    if (L && Math.abs(L.y - y) < LAMP_REACH) consider(dist(L.x, L.z) + 0.4, 2.0, { kind: 'pp_lamp', label: 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'pp_plaque': return say([['narrator', 'pp_plaque'], 'pp_plaque_tw']);
      case 'pp_lighthouse': return say([['narrator', (g.world?.lighthouse?.power || 0) > 0 ? 'pp_lh_lit' : 'pp_lh_dark']]);
      case 'pp_lamp': return say([f.pp_lamp ? 'pp_lamp_lit' : 'pp_lamp_look'], () => { if (!f.pp_lamp) f.pp_oniAsk = true; });
      case 'pp_door':
        if (it.what === 's40') return say([['narrator', 'pp_s40_door']]);
        if (it.what === 'hall') return say([['narrator', f.pp_lamp ? 'pp_hall_lit' : 'pp_hall_dark']], () => { if (!f.pp_lamp) f.pp_oniAsk = true; });
        if (it.what === 's28') {
          if (f.pp_survey) return say([['narrator', 'pp_s28_after']]);
          return say([['narrator', 'pp_s28_board'], 'pp_s28_take'], () => {
            if (f.pp_survey) return;
            f.pp_survey = true;
            g.found('survey', 'it_survey', () => g.save(false));
          });
        }
    }
    return false;
  }
  // the ball on the crystal: it rings, and goes dark again
  lampBall() {
    if (this.f.pp_lamp || this._ballSaid > this.game.time - 3) return;
    this._ballSaid = this.game.time;
    this.f.pp_oniAsk = true;
    this.chain([['hero', 'pp_lamp_ball']]);
  }
  // the singing fork's note (tools.js → story.forkHit): the crystal wakes when it is within reach
  forkHit(o) {
    const g = this.game, f = this.f, L = this.D?.studyLamp;
    if (f.pp_lamp || !L || this.roomId() !== 'desert') return false;
    if (Math.hypot(L.x - o.x, L.z - o.z) > (o.reach || 3.6) + 0.7 || L.y - o.y > LAMP_REACH + 0.5 || L.y < o.y - 1) return false;
    f.pp_lamp = true; f.pp_oniAsk = true;
    this.applyLamp();
    g.audio.play('chest');
    g.particles?.burst(L.x, L.y, L.z, '#dff8ff', 22, 1.6);
    const oni = this.npc('oni'), near = oni?.present && Math.hypot(oni.pos.x - L.x, oni.pos.z - L.z) < 14;
    this.chain([['hero', 'pp_lamp_wake'], ...(near ? [['oni', 'pp_oni_thanks']] : [])], () => g.save(false));
    return true;
  }

  // ---------------------------------------------------------------- the conch at Marl's gate (gadgets.js blowConch)
  conchBlown() {
    const g = this.game, f = this.f, Y = this.Z?.dogYard, h = g.hero;
    if (f.pp_call || !f.pp_marlAsk || this.roomId() !== 'zeelich' || !Y) return;
    if (Math.hypot(h.pos.x - Y.gate.x, h.pos.z - Y.gate.z) > 9) return;
    f.pp_call = true;
    for (const d of this.Z.dogs || []) if (d.pos) g.hud.float('♪', { x: d.pos.x, y: d.pos.y + 1.0, z: d.pos.z }, '#9fe8a0');
    g.hud.toast('pp_toast_call');
    const marl = this.npc('marl'), near = marl?.present && Math.hypot(marl.pos.x - h.pos.x, marl.pos.z - h.pos.z) < 16;
    this.chain(near ? [['marl', 'pp_marl_learned']] : [], () => g.save(false));
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    if (!this.able()) return false;
    const g = this.game, f = this.f, id = npc.def.id, A = g.hero.arms || {};
    const c = (lines, done) => { npc.engage?.(); this.chain(lines, () => { npc.release?.(); done?.(); }); return true; };
    switch (id) {
      case 'oni':
        if (f.pp_lamp) return c([['oni', 'pp_oni_after']]);
        if (!f.pp_oniAsk || !f.pp_oniMet) return c([['oni', 'pp_oni_1'], ['oni', 'pp_oni_2'], ['oni', A.fork ? 'pp_oni_fork' : 'pp_oni_nofork']], () => { f.pp_oniAsk = f.pp_oniMet = true; g.save(false); });
        return c([['oni', A.fork ? 'pp_oni_fork' : 'pp_oni_wait']]);
      case 'marl':
        if (f.pp_call) return c([['marl', 'pp_marl_after']]);
        if (!f.pp_marlAsk) return c([['marl', 'pp_marl_1'], ['marl', 'pp_marl_2'], ['marl', A.conch ? 'pp_marl_conch' : 'pp_marl_noconch']], () => { f.pp_marlAsk = true; g.save(false); });
        return c([['marl', A.conch ? 'pp_marl_wait' : 'pp_marl_noconch']]);
      case 'keraooc': {
        // the pupils' friend, ward already learned: her treatment fills his magic too
        if (!f.pp_lamp || !A.protect) return false;
        const h = g.hero;
        h.hp = h.maxHp; h.mp = h.mpMax; g.audio.play('heal'); g.hud.toast('wz_toast_magic'); g.hud.stats?.(h);
        return c([['keraooc', 'pp_ker_thanks']]);
      }
    }
    return false;
  }
}
