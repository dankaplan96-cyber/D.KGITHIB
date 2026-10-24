// Shared behaviour for every chapter module. A chapter only overrides the
// hooks it needs; the Story director (index.js) routes game events to the
// current chapter and falls back to these defaults.
import { t } from '../i18n.js';

export const SPEAKER_COLORS = {
  hero: '#8fc2ff', narrator: '#ffffff', sendell: '#bff4ff', zoe: '#ffb0d0', vesk: '#c8a8ff', baldino: '#ffd890', radio: '#a8ffb8',
};

export class ChapterBase {
  constructor(story) {
    this.story = story;
    this.game = story.game;
  }
  get f() { return this.game.flags; }
  // where this chapter sits in the story (set by the director): reached = this chapter or a later one
  get pos() { return this.story.chapters.indexOf(this); }
  reached(f = this.f) { return this.story.indexOf(f) >= this.pos; }
  isCur(f = this.f) { return this.story.indexOf(f) === this.pos; }

  // ---- defaults (override in chapters)
  npcDefs() { return []; }
  enemyDefs() { return []; }
  decorate() {}
  begin() {}                      // called once when the chapter starts
  place() { return undefined; }   // (npcId) → {x,z,a,anim,room} | null (absent) | undefined (leave as is)
  doors() { return []; }
  exitTo() { return null; }
  canExit() { return true; }
  interactables() {}
  interact() { return false; }
  talk() { return false; }
  ballHit() { return false; }
  ballTargets() { return []; }
  update() {}
  objective() { return ''; }
  markers() { return []; }
  onEnterRoom() {}
  onExitRoom() {}
  applyFlags() {}
  journal() { return []; }        // [{key, done}] lines for the journal screen
  items() { return []; }          // [{id, icon, n?}] items carried from this chapter

  // ---- helpers
  speaker(id) {
    const g = this.game;
    if (id === 'hero') return g.hero;
    return g.npcs.find((n) => n.def.id === id && n.present) || g.npcs.find((n) => n.def.id === id) || null;
  }
  npc(id) { return this.game.npcs.find((n) => n.def.id === id); }

  // A reward tossed out as pickups (a clover, a few coins): owed under `flag` (saved with the game) until picked up,
  // so a save made before he collects it doesn't lose it (Game.collect counts it down).
  reward(flag, type, n, x, y, z, opts = {}) {
    this.f[flag] = (this.f[flag] || 0) + n;
    for (let i = 0; i < n; i++) this.game.pickups.spawn(type, x, y, z, { ...opts, owe: flag });
  }
  // After a load: what is still owed and isn't lying in the world any more is given straight away, with a toast.
  settleOwed(flag, type, value = 1, toastKey = null) {
    const g = this.game, n = this.f[flag] || 0;
    if (n <= 0 || g.pickups.list.some((p) => p.owe === flag)) return false;
    delete this.f[flag];
    const h = g.hero;
    if (type === 'coin') h.coins += n * value;
    else if (type === 'clover') h.clovers = Math.min(9, h.clovers + n);
    if (toastKey) g.hud.toast(toastKey, { n: n * value });
    return true;
  }

  // Run a conversation between several speakers: [[speakerId, textKey], ...]
  chain(lines, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { done?.(); return; }
      const [id, key] = lines[i];
      const sp = this.speaker(id);
      const name = id === 'narrator' ? '' : 'n_' + (id === 'hero' ? 'hero' : id);
      const text = Array.isArray(t(key)) ? t(key) : [t(key)];
      // everyone else in the conversation turns toward whoever speaks
      for (const [oid] of lines) {
        const o = this.speaker(oid);
        if (o && o !== sp && sp && o !== g.hero) o.listenTo = sp;
      }
      if (sp && sp !== g.hero) sp.talking = true;
      g.say(name, text, () => {
        if (sp && sp !== g.hero) sp.talking = false;
        if (i + 1 >= lines.length) for (const [oid] of lines) { const o = this.speaker(oid); if (o && o !== g.hero) o.listenTo = null; }
        next(i + 1);
      }, sp, SPEAKER_COLORS[id]);
    };
    next(0);
  }

  // objective line helpers
  goal(key, p) { return `<b>${t(key, p)}</b>`; }
  sub(ok, key, p) { return `<span class="s ${ok ? 'ok' : ''}">◆ ${t(key, p)}</span>`; }
}
