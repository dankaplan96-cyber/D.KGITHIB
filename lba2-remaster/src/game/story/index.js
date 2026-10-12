// Story director: owns the chapter list and routes every story hook the game
// calls to the chapter in progress (flags.chapter). World props and NPCs for
// all chapters are created once at start; chapters decide who is where.
import { t } from '../i18n.js';
import { Prologue } from './prologue.js';
import { Chapter1 } from './chapter1.js';
import { Chapter2 } from './chapter2.js';
import { Chapter3 } from './chapter3.js';
import { Dig } from './dig.js';
import { Steam } from './steam.js';
import { Pass } from './pass.js';
import { Observatory } from './observatory.js';
import { Evacuation } from './evacuation.js';
import { Epilogue } from './epilogue.js';
import '../text/common.js';

// The story in order. Each chapter has a stable key; saves store the key (flags.chapterKey) as well as the
// position, so chapters can be inserted between existing ones without breaking saves. Chapter numbers shown
// to the player come from STORY_BIBLE.md's 12-chapter plan (the epilogue has no number).
export const ORDER = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'shell', 'home'];
export const NUMBER = { well: 1, project: 2, zeelich: 3, dig: 4, steam: 5, pass: 6, observatory: 7, evacuation: 8, council: 9, network: 10, shell: 11, core: 12 };
// the order saves before format 3 used (flags.chapter was a position in this list)
export const OLD_ORDER = ['well', 'project', 'zeelich', 'shell', 'home'];

export class Story {
  constructor(game) {
    this.game = game;
    const make = { well: Prologue, project: Chapter1, zeelich: Chapter2, dig: Dig, steam: Steam, pass: Pass, observatory: Observatory, evacuation: Evacuation, shell: Chapter3, home: Epilogue };
    this.chapters = ORDER.map((k) => { const c = new make[k](this); c.key = k; return c; });
  }
  // position of the chapter in progress for a set of flags (by key when the save has one)
  indexOf(f = this.f) {
    if (f.chapterKey) { const i = ORDER.indexOf(f.chapterKey); if (i >= 0) return i; }
    return Math.min(f.chapter || 0, this.chapters.length - 1);
  }
  keyOf(i) { return ORDER[i]; }
  // later chapters are registered by their modules (keeps imports one-way)
  register(ch) { this.chapters.push(ch); }

  get f() { return this.game.flags; }
  get index() { return this.indexOf(this.f); }
  get cur() { return this.chapters[this.index]; }

  // ---- construction
  npcDefs() {
    const seen = new Map();
    for (const c of this.chapters) for (const d of c.npcDefs()) if (!seen.has(d.id)) seen.set(d.id, d);
    return [...seen.values()];
  }
  enemyDefs() { return this.chapters.flatMap((c) => c.enemyDefs()); }
  decorate() { for (const c of this.chapters) c.decorate(); }

  // ---- flow
  start() {
    this.f.chapter = 0; this.f.chapterKey = ORDER[0];
    this.refreshCast();
    this.chapters[0].start();
  }
  // move on to the next chapter: title card, the chapter sets up the world
  nextChapter() {
    const g = this.game;
    const i = Math.min(this.index + 1, this.chapters.length - 1);
    this.f.chapter = i; this.f.chapterKey = ORDER[i];
    const c = this.cur;
    this.refreshCast();
    // (the epilogue's card shows only its title)
    const n = NUMBER[c.key];
    g.hud.chapterCard(n ? t('chapter_n', { n }) : '', t('chapter_' + c.key));
    c.begin();
    this.refreshCast();
    g.updateObjective();
    g.save(false);
  }

  // place/hide NPCs for the current chapter
  refreshCast() {
    const g = this.game;
    for (const n of g.npcs) {
      let p;
      // every chapter is asked: a later chapter hides its own cast before it begins
      // (returns null), and the latest chapter that has an opinion wins
      for (let i = 0; i < this.chapters.length; i++) { const r = this.chapters[i].place(n.def.id); if (r !== undefined && (i <= this.index || r === null)) p = r; }
      if (p === undefined) continue;
      n.setPresent(!!p);
      if (p) n.placeAt(p);
    }
    for (const e of g.enemies) if (e.def?.when) e.setPresent(!!e.def.when(this.f));
  }

  // ---- routed hooks
  objective() { return this.cur.objective(); }
  markers() { return this.cur.markers(); }
  journal() { return this.chapters.slice(0, this.index + 1).map((c) => ({ title: (NUMBER[c.key] ? NUMBER[c.key] + '. ' : '') + t('chapter_' + c.key), lines: c.journal() })); }
  items() { return this.chapters.slice(0, this.index + 1).flatMap((c) => c.items()); }
  doors() { return this.cur.doors(); }
  // where an exit leads: the current chapter first, then the earlier ones (their rooms are still there)
  exitTo(to) { for (let i = this.index; i >= 0; i--) { const r = this.chapters[i].exitTo(to); if (r) return r; } return null; }
  // the town's doors on Citadel (house, water office, control room) for chapters set there after chapter 2
  townDoors() { return (this.chapters.find((c) => c.key === 'project')?.doors() || []).filter((d) => d.room !== 'projoffice'); }
  canExit(room) { return this.cur.canExit(room); }
  interactables(consider, dist) { this.cur.interactables(consider, dist); }
  interact(it) { return this.cur.interact(it) || this.chapters[0].baseInteract(it); }
  talk(npc) { if (!this.cur.talk(npc)) this.chapters[0].baseTalk(npc); }
  ballHit(p) { return this.cur.ballHit(p); }
  ballTargets() { return this.cur.ballTargets(); }
  update(dt) { this.cur.update(dt); }
  onEnterRoom(id) { this.cur.onEnterRoom(id); }
  onExitRoom(id) { this.cur.onExitRoom(id); }
  applyFlags() {
    for (let i = 0; i < this.chapters.length; i++) this.chapters[i].applyFlags(i < this.index, i === this.index);
    this.refreshCast();
  }
  afterEnding() { this.cur.afterEnding?.(); }
}
