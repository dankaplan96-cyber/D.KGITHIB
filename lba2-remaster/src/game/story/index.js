// Story director: owns the chapter list and routes every story hook the game
// calls to the chapter in progress (flags.chapter). World props and NPCs for
// all chapters are created once at start; chapters decide who is where.
import { wizardDoors, wizardExit } from '../wizards.js';
import { lba1Doors, lba1Exit } from '../lba1places.js';
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
import { Council } from './council.js';
import { Network } from './network.js';
import { Epilogue } from './epilogue.js';
import { IslandShuttle } from './islands.js';
import { TownLife } from './life.js';
import { WorkshopLife } from './workshop.js';
import { KeshLife } from './kesh.js';
import { ZeelichLife } from './zeelife.js';
import { Arsenal } from './arsenal.js';
import '../text/common.js';

// The story in order. Each chapter has a stable key; saves store the key (flags.chapterKey) as well as the
// position, so chapters can be inserted between existing ones without breaking saves. Chapter numbers shown
// to the player come from STORY_BIBLE.md's 12-chapter plan (the epilogue has no number).
export const ORDER = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'network', 'shell', 'home'];
export const NUMBER = { well: 1, project: 2, zeelich: 3, dig: 4, steam: 5, pass: 6, observatory: 7, evacuation: 8, council: 9, network: 10, shell: 11, core: 12 };
// the order saves before format 3 used (flags.chapter was a position in this list)
export const OLD_ORDER = ['well', 'project', 'zeelich', 'shell', 'home'];

export class Story {
  constructor(game) {
    this.game = game;
    const make = { well: Prologue, project: Chapter1, zeelich: Chapter2, dig: Dig, steam: Steam, pass: Pass, observatory: Observatory, evacuation: Evacuation, council: Council, network: Network, shell: Chapter3, home: Epilogue };
    this.chapters = ORDER.map((k) => { const c = new make[k](this); c.key = k; return c; });
    this.isles = new IslandShuttle(this);
    this.life = new TownLife(this);   // Citadel twelve years on: its people and small stories (life.js)
    this.workshop = new WorkshopLife(this);   // Baldino's workshop years on: the test pair and the looks (workshop.js)
    this.kesh = new KeshLife(this);   // Kesh on Desert Island twelve years on: the cool room's wind-catcher (kesh.js)
    this.zlife = new ZeelichLife(this);   // Zeelich's street twelve years on: the watch house bakery (zeelife.js)
    this.arsenal = new Arsenal(this);   // weapons and gadgets in the world: stalls, gifts, dark places (arsenal.js)
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
    for (const c of [...this.chapters, this.life]) for (const d of c.npcDefs()) if (!seen.has(d.id)) seen.set(d.id, d);
    return [...seen.values()];
  }
  enemyDefs() { return this.chapters.flatMap((c) => c.enemyDefs()); }
  decorate() { for (const c of this.chapters) c.decorate(); this.arsenal.decorate(); }

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
    // the chapter sets up its scene now (under the fade); its first line waits for the card (below)
    // (say is put back exactly as it was: a wrapper someone set on the game, e.g. a test recording lines, stays)
    const held = [], own = Object.prototype.hasOwnProperty.call(g, 'say') ? g.say : null;
    g.say = (...a) => { held.push(a); };
    try { c.begin(); } finally { if (own) g.say = own; else delete g.say; }
    this.refreshCast();
    g.updateObjective();
    g.save(false);
    if (held.length) this.holdForCard(held);
  }
  // The title card is read on its own: the opening line (and its speech bubble) starts once the card has faded,
  // instead of over it. Twinsen stands while the card shows (no control, as through the fade before it); E / Space
  // / a click after the first second cuts the card short. Game time, so a pause or a slow frame can't overlap them.
  holdForCard(held) {
    const g = this.game, h = g.hero;
    const CARD = 3.2, FADE = 0.9, SKIP_AFTER = 1.0, SKIP_FADE = 0.4;   // s (the card's CSS fade-out is 0.9 s)
    // (the lines, in the order the chapter said them — as before, a later say replaces an earlier one)
    const lines = () => { for (const a of held) g.say(...a); };
    if (g.cutscene || g.state === 'dialog') { g.hud.chapterCardHide(); lines(); return; }   // (a scene of its own: as before)
    let t = 0, end = null;
    g.hud.chapterCardHold();
    g.setState('cutscene');
    g.cutscene = (dt) => {
      t += dt;
      h.rig.play('idle'); h.rig.update(dt, 0); h.sync();
      const I = g.input;
      if (end == null && (t >= CARD || (t >= SKIP_AFTER && (I.pressed('interact') || I.pressed('action') || I.pressed('click'))))) {
        end = t + (t >= CARD ? FADE : SKIP_FADE);
        g.hud.chapterCardHide();
      }
      if (end != null && t >= end) {
        g.cutscene = null;
        g.setState('play');   // (forgets the key that cut the card short, so it can't also skip the first line)
        lines();
      }
    };
  }

  // place/hide NPCs for the current chapter
  refreshCast() {
    const g = this.game;
    for (const n of g.npcs) {
      let p;
      // every chapter is asked: a later chapter hides its own cast before it begins
      // (returns null), and the latest chapter that has an opinion wins
      for (let i = 0; i < this.chapters.length; i++) { const r = this.chapters[i].place(n.def.id); if (r !== undefined && (i <= this.index || r === null)) p = r; }
      if (p === undefined) p = this.life.place(n.def.id);
      if (p === undefined) continue;
      n.setPresent(!!p);
      if (p) n.placeAt(p);
    }
    for (const e of g.enemies) if (e.def?.when) e.setPresent(!!e.def.when(this.f));
  }

  // ---- routed hooks
  objective() { return this.cur.objective(); }
  markers() { return this.cur.markers(); }
  journal() {
    const out = this.chapters.slice(0, this.index + 1).map((c) => ({ title: (NUMBER[c.key] ? NUMBER[c.key] + '. ' : '') + t('chapter_' + c.key), lines: c.journal() }));
    const life = this.life.journal();
    if (life.length) out.push({ title: t('life_title'), lines: life });
    const ws = this.workshop.journal();
    if (ws.length) out.push({ title: t('w_title'), lines: ws });
    const kl = this.kesh.journal();
    if (kl.length) out.push({ title: t('k_title'), lines: kl });
    const zl = this.zlife.journal();
    if (zl.length) out.push({ title: t('zl_title'), lines: zl });
    const ar = this.arsenal.journal();
    if (ar.length) out.push({ title: t('a_title'), lines: ar });
    return out;
  }
  items() { return [...this.chapters.slice(0, this.index + 1).flatMap((c) => c.items()), ...this.life.items(), ...this.kesh.items(), ...this.arsenal.items()]; }
  // (the wizards' doors are open in every chapter: src/game/wizards.js)
  doors() { return [...this.cur.doors(), ...wizardDoors(), ...lba1Doors()]; }
  // where an exit leads: the current chapter first, then the earlier ones (their rooms are still there)
  exitTo(to) { const w = wizardExit(to) || lba1Exit(to); if (w) return w; for (let i = this.index; i >= 0; i--) { const r = this.chapters[i].exitTo(to); if (r) return r; } return null; }
  // the town's doors on Citadel (house, water office, control room) for chapters set there after chapter 2
  // (chapter 2 offers the control room only until Zoé's office segment; later chapters need it again — ch. 8's relay)
  townDoors() {
    const out = (this.chapters.find((c) => c.key === 'project')?.doors() || []).filter((d) => d.room !== 'projoffice');
    const st = this.game.world.station;
    if (st && this.game.rooms.control && !out.some((d) => d.room === 'control')) out.push({ x: st.control.door.x, z: st.control.door.z, r: 0.9, room: 'control' });
    return out;
  }
  canExit(room, to) { return this.cur.canExit(room, to); }
  interactables(consider, dist) { this.cur.interactables(consider, dist); this.isles.interactables(consider, dist); this.life.interactables(consider, dist); this.workshop.interactables(consider, dist); this.kesh.interactables(consider, dist); this.zlife.interactables(consider, dist); this.arsenal.interactables(consider, dist); }
  interact(it) { return this.cur.interact(it) || this.isles.interact(it) || this.life.interact(it) || this.workshop.interact(it) || this.kesh.interact(it) || this.zlife.interact(it) || this.arsenal.interact(it) || this.chapters[0].baseInteract(it); }
  talk(npc) { if (this.life.talkFirst(npc) || this.workshop.talkFirst(npc) || this.kesh.talkFirst(npc) || this.zlife.talkFirst(npc) || this.arsenal.talkFirst(npc)) return; if (!this.cur.talk(npc) && !this.life.talk(npc)) this.chapters[0].baseTalk(npc); }
  ballHit(p) { return this.cur.ballHit(p); }
  meleeHit(o) { return this.cur.meleeHit?.(o) || this.arsenal.meleeHit(o); }
  pulseHit(o) { return this.cur.pulseHit?.(o) || false; }
  ballTargets() { return this.cur.ballTargets(); }
  update(dt) { this.cur.update(dt); this.life.update(dt); this.workshop.update(dt); this.kesh.update(dt); this.zlife.update(dt); this.arsenal.update(dt); }
  onEnterRoom(id) { this.cur.onEnterRoom(id); }
  onExitRoom(id) { this.cur.onExitRoom(id); }
  applyFlags() {
    for (let i = 0; i < this.chapters.length; i++) this.chapters[i].applyFlags(i < this.index, i === this.index);
    this.life.applyFlags();
    this.workshop.applyFlags();
    this.kesh.applyFlags();
    this.zlife.applyFlags();
    this.arsenal.applyFlags();
    this.refreshCast();
  }
  afterEnding() { this.cur.afterEnding?.(); }
}
