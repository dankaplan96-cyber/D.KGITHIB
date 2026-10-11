// Story director: owns the chapter list and routes every story hook the game
// calls to the chapter in progress (flags.chapter). World props and NPCs for
// all chapters are created once at start; chapters decide who is where.
import { t } from '../i18n.js';
import { Prologue } from './prologue.js';
import { Chapter1 } from './chapter1.js';
import '../text/common.js';

export const CHAPTERS = ['prologue', 'ch1', 'ch2', 'ch3', 'epilogue'];

export class Story {
  constructor(game) {
    this.game = game;
    this.chapters = [new Prologue(this), new Chapter1(this)];
  }
  // later chapters are registered by their modules (keeps imports one-way)
  register(ch) { this.chapters.push(ch); }

  get f() { return this.game.flags; }
  get index() { return Math.min(this.f.chapter || 0, this.chapters.length - 1); }
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
    this.f.chapter = 0;
    this.refreshCast();
    this.chapters[0].start();
  }
  // move on to the next chapter: title card, the chapter sets up the world
  nextChapter() {
    const g = this.game;
    this.f.chapter = (this.f.chapter || 0) + 1;
    const c = this.cur;
    this.refreshCast();
    g.hud.chapterCard(t('chapter_n', { n: this.index }), t('chapter_' + this.index));
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
  journal() { return this.chapters.slice(0, this.index + 1).map((c, i) => ({ title: t('chapter_' + i), lines: c.journal() })); }
  items() { return this.chapters.slice(0, this.index + 1).flatMap((c) => c.items()); }
  doors() { return this.cur.doors(); }
  exitTo(to) { return this.cur.exitTo(to) ?? this.chapters[0].exitTo(to); }
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
