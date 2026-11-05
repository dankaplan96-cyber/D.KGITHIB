// Story director: owns the chapter list and routes every story hook the game
// calls to the chapter in progress (flags.chapter). World props and NPCs for
// all chapters are created once at start; chapters decide who is where.
import { wizardDoors, wizardExit } from '../wizards.js';
import { lba1Doors, lba1Exit } from '../lba1places.js';
import { sewerDoors, sewerExit } from '../sewers.js';
import { tavernDoors, tavernExit } from '../tavern.js';
import { bazooDoors, bazooExit } from '../bazoo.js';
import { ticketDoors, ticketExit } from '../ticket.js';
import { pharmacyDoors, pharmacyExit } from '../pharmacy.js';
import { nbrhouseDoors, nbrhouseExit } from '../nbrhouse.js';
import { zterminalDoors, zterminalExit } from '../zterminal.js';
import { terminalDoors, terminalExit } from '../terminal.js';
import { otrBarDoors, otrBarExit } from '../otrbar.js';
import { otrHotelDoors, otrHotelExit } from '../otrhotel.js';
import { celTempleDoors, celTempleExit } from '../celtemple.js';
import { traluCaveDoors, traluCaveExit } from '../tralucave.js';
import { baggageDoors, baggageExit } from '../baggage.js';
import { nellhouseDoors, nellhouseExit } from '../nellhouse.js';
import * as THREE from 'three';
import { TrackRunner } from '../../engine/scripts.js';
import { t } from '../i18n.js';
import { CHAPTER_AREAS } from '../regions.js';
import { Prologue } from './prologue.js';
import { Chapter1 } from './chapter1.js';
import { Chapter2 } from './chapter2.js';
import { Chapter3, ChapterCore } from './chapter3.js';
import { Dig } from './dig.js';
import { Steam } from './steam.js';
import { Pass } from './pass.js';
import { Observatory } from './observatory.js';
import { Evacuation } from './evacuation.js';
import { Council } from './council.js';
import { Network } from './network.js';
import { Throttle } from './throttle.js';   // (OREN-GUARDIAN B: chapter 10 of the expanded campaign, OG-1 so far)
import { Survey } from './survey.js';       // (OREN-GUARDIAN D: chapter 11 of the expanded campaign, OG-2 so far)
import { Epilogue } from './epilogue.js';
import { IslandShuttle } from './islands.js';
import { TownLife } from './life.js';
import { Citizens } from './citizens.js';
import { InteriorLife } from './interiors.js';
import { WorkshopLife } from './workshop.js';
import { KeshLife } from './kesh.js';
import { ZeelichLife } from './zeelife.js';
import { Arsenal } from './arsenal.js';
import { Kit2 } from './kit2.js';
import { Kit2b } from './kit2b.js';
import { MagicLevels } from './magic.js';
import { SewerLife } from './sewers.js';
import { ChapterBase } from './base.js';
import { HostelLife } from './hostel.js';
import { Shops } from './shops.js';
import { Purposes } from './purposes.js';
import { IslandPeople } from './islandpeople.js';
import '../text/common.js';

// The story in order. Each chapter has a stable key; saves store the key (flags.chapterKey) as well as the
// position, so chapters can be inserted between existing ones without breaking saves. Chapter numbers shown
// to the player come from STORY_BIBLE.md's plan (the epilogue has no number). 'shell' and 'core' are the two halves
// of the final story (chapter3.js); saves before format 5 had them as one chapter (main.js migrateSave).
// EXP-PLAN §2.1 (save format 6): the expanded campaign (flags.exp) puts four chapters between the council and the
// network (EXP_KEYS). A save from before them that had already reached the network, the shell, the core or the end
// (flags.exp_base, main.js migrateSave) goes on as the base game: those four are not in its campaign and its chapters
// keep their old numbers (BASE_NUMBER). Until a new chapter is written it is an empty shell (ChapterShell) that the
// story passes straight through.
export const ORDER = ['well', 'project', 'zeelich', 'dig', 'steam', 'pass', 'observatory', 'evacuation', 'council', 'throttle', 'survey', 'ballastra', 'balances', 'network', 'shell', 'core', 'home'];
export const EXP_KEYS = ['throttle', 'survey', 'ballastra', 'balances'];
export const BASE_ORDER = ORDER.filter((k) => !EXP_KEYS.includes(k));
// the numbers shown: the expanded campaign's, and the base game's (a save on exp_base)
export const NUMBER = { well: 1, project: 2, zeelich: 3, dig: 4, steam: 5, pass: 6, observatory: 7, evacuation: 8, council: 9, throttle: 10, survey: 11, ballastra: 12, balances: 13, network: 14, shell: 15, core: 16 };
export const BASE_NUMBER = { well: 1, project: 2, zeelich: 3, dig: 4, steam: 5, pass: 6, observatory: 7, evacuation: 8, council: 9, network: 10, shell: 11, core: 12 };
// the campaign a set of flags plays: the base game's on exp_base, otherwise the expanded one
export const isBaseCampaign = (f) => !!f?.exp_base;
export const campaignOrder = (f) => (isBaseCampaign(f) ? BASE_ORDER : ORDER);
export const chapterNumber = (key, f) => (isBaseCampaign(f) ? BASE_NUMBER : NUMBER)[key];
// a chapter of the expanded campaign not written yet: no cast, no places, no lines; the story passes it straight on
// (Story.nextIndex skips it; a save standing in one, such as the expanded campaign's chapter-10 start, moves on at
// its first frame of play: Story.afterLoad)
export class ChapterShell extends ChapterBase {
  get passThrough() { return true; }
  update() { if (this.isCur() && this.game.state === 'play') this.story.afterLoad(); }
}
// the order saves before format 3 used (flags.chapter was a position in this list)
export const OLD_ORDER = ['well', 'project', 'zeelich', 'shell', 'home'];

const MOVE_FAR = 150;   // (VISIBLE-MOVES: m; a longer move is a cut)
const _sv = new THREE.Vector3(), _sm = new THREE.Matrix4(), _sf = new THREE.Frustum(), _ss = new THREE.Sphere();

export class Story {
  constructor(game) {
    this.game = game;
    const make = { well: Prologue, project: Chapter1, zeelich: Chapter2, dig: Dig, steam: Steam, pass: Pass, observatory: Observatory, evacuation: Evacuation, council: Council, throttle: Throttle, survey: Survey, ballastra: ChapterShell, balances: ChapterShell, network: Network, shell: Chapter3, core: ChapterCore, home: Epilogue };
    this.chapters = ORDER.map((k) => { const c = new make[k](this); c.key = k; return c; });
    this.isles = new IslandShuttle(this);
    this.life = new TownLife(this);   // Citadel twelve years on: its people and small stories (life.js)
    this.citizens = new Citizens(this);   // WORLD-LIFE: the residents who walk round Citadel (citizens.js)
    this.interiors = new InteriorLife(this);   // INTERIOR-LIFE: the interiors' and the spaceports' people, the household rounds (interiors.js)
    this.workshop = new WorkshopLife(this);   // Baldino's workshop years on: the test pair and the looks (workshop.js)
    this.kesh = new KeshLife(this);   // Kesh on Desert Island twelve years on: the cool room's wind-catcher (kesh.js)
    this.zlife = new ZeelichLife(this);   // Zeelich's street twelve years on: the watch house bakery (zeelife.js)
    this.arsenal = new Arsenal(this);   // weapons and gadgets in the world: stalls, gifts, dark places (arsenal.js)
    this.kit2 = new Kit2(this);   // EQUIP-2a: Arthur's pocket set and Bram's pump lance in the world (kit2.js; the tools: tools.js)
    this.kit2b = new Kit2b(this);   // EQUIP-2b: Ilka's singing fork, the Esmer line, the heat flask in the world (kit2b.js; the tools: tools.js)
    this.magic = new MagicLevels(this);   // MAGIC-LEVELS: the story's magic levels, never sold (magic.js)
    this.sewers = new SewerLife(this);   // WA-14: Citadel's old sewers under the lane by the pump (sewers.js)
    this.hostel = new HostelLife(this);   // ASYLUM-2: the workers' hostel in FunFrock's asylum, Vesk's store behind it (hostel.js)
    this.purposes = new Purposes(this);   // PURPOSES: what the kept places give the journey (purposes.js)
    this.ipeople = new IslandPeople(this);   // PEOPLE-1: the people of Zeelich's islands and what each island gives (islandpeople.js)
    this.shops = new Shops(this);   // SHOPS-1: Citadel's shops and the Esmer trading house: a keeper's talk opens the shop (shops.js)
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
    for (const c of [...this.chapters, this.life, this.citizens, this.interiors, this.hostel]) for (const d of c.npcDefs()) if (!seen.has(d.id)) seen.set(d.id, d);
    return [...seen.values()];
  }
  enemyDefs() { return this.chapters.flatMap((c) => c.enemyDefs()); }
  decorate() { for (const c of this.chapters) c.decorate(); this.arsenal.decorate(); this.kit2.decorate(); this.kit2b.decorate(); this.citizens.decorate(); }

  // ---- flow
  start() {
    this.f.chapter = 0; this.f.chapterKey = ORDER[0];
    this.f.exp = 1; delete this.f.exp_base;   // (a new game plays the expanded campaign)
    this.refreshCast();
    this.chapters[0].start();
  }
  // move on to the next chapter: title card, the chapter sets up the world
  // LAZY-REGIONS: the areas the next chapter works in (src/game/regions.js CHAPTER_AREAS): a scene change into it
  // builds them behind its black, under the loading card (startTransition's need)
  nextAreas() { return CHAPTER_AREAS[ORDER[this.nextIndex()]] || null; }
  // is this key part of the campaign the save plays (the base game's on exp_base)
  inCampaign(key, f = this.f) { return campaignOrder(f).includes(key); }
  // the chapter number shown for a key in this save's campaign (none for the epilogue)
  number(key, f = this.f) { return chapterNumber(key, f); }
  // the position of the chapter after `from`: the next one in this save's campaign that has something to play (an
  // empty shell completes at once: the story goes straight on to the chapter after it)
  nextIndex(from = this.index) {
    const last = this.chapters.length - 1;
    for (let i = from + 1; i <= last; i++) { const c = this.chapters[i]; if (this.inCampaign(c.key) && !c.passThrough) return i; }
    return Math.min(from + 1, last);
  }
  // a save standing in an empty shell (the expanded campaign's chapter-10 start, a key moved back to by the loader)
  // goes on to the chapter after it, behind a scene change as a chapter's end does (ChapterShell.update)
  afterLoad() {
    const g = this.game;
    if (!this.cur?.passThrough || g.trans) return false;
    g.startTransition(() => this.nextChapter(), this.nextAreas());
    return true;
  }
  nextChapter() {
    const g = this.game;
    const i = this.nextIndex();
    this.f.chapter = i; this.f.chapterKey = ORDER[i];
    const c = this.cur;
    for (const id of CHAPTER_AREAS[c.key] || []) g.regions?.ensure(id, 'chapter');   // (built already when a scene change led here)
    this.magic.catchUp();   // (MAGIC-LEVELS: a step behind him that he hasn't had — normally none)
    this.noWalk = true;   // (the chapter's scene is set under its card: everyone straight to their places)
    try { this.refreshCast(); } finally { this.noWalk = false; }
    // (the epilogue's card shows only its title)
    const n = this.number(c.key);
    g.hud.chapterCard(n ? t('chapter_n', { n }) : '', t('chapter_' + c.key));
    // the chapter sets up its scene now (under the fade); its first line waits for the card (below)
    // (say is put back exactly as it was: a wrapper someone set on the game, e.g. a test recording lines, stays)
    const held = [], own = Object.prototype.hasOwnProperty.call(g, 'say') ? g.say : null;
    g.say = (...a) => { held.push(a); };
    this.noWalk = true;
    try { c.begin(); } finally { if (own) g.say = own; else delete g.say; }
    try { this.refreshCast(); } finally { this.noWalk = false; }
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
  // (walk: the later chapters' own calls, in play — a person on screen walks to a new place: walkOn below)
  refreshCast({ walk = false } = {}) {
    const g = this.game, R = g.regions;
    for (const n of g.npcs) {
      let p, wait = false;
      // every chapter is asked: a later chapter hides its own cast before it begins
      // (returns null), and the latest chapter that has an opinion wins
      // (LAZY-REGIONS: a place read from an area not built yet — his spot is there — is not known yet: he waits
      //  hidden, and is placed when that area is built: regionBuilt calls this again. Nothing is built here.)
      for (let i = 0; i < this.chapters.length; i++) {
        const pr = R ? R.probe(() => this.chapters[i].place(n.def.id)) : { value: this.chapters[i].place(n.def.id), misses: new Set() };
        // (each chapter reads an area only for its own cast: a read of an area not built means his spot is there)
        if (pr.misses.size) { if (i <= this.index) { p = undefined; wait = true; } continue; }
        if (pr.error) throw pr.error;
        const r = pr.value;
        if (r !== undefined && (i <= this.index || r === null)) { p = r; wait = false; }
      }
      if (wait) { n.setPresent(false); continue; }
      if (n.def.pending && p === undefined) continue;   // (his own area not built yet: he stays hidden: Game.addActors)
      if (p === undefined) p = this.hostel.place(n.def.id);   // (ASYLUM-2: the hostel's people, by the chapter)
      if (p === undefined) p = this.life.place(n.def.id);
      if (p === undefined) p = this.interiors.place(n.def.id);   // (INTERIOR-LIFE: a room's or a port's people out of their chapter, or back)
      if (p === undefined) p = this.citizens.place(n.def.id);   // (WORLD-LIFE: a resident the story takes off the streets, or gives them back)
      if (p === undefined) continue;
      // (a walk to an earlier place, below, is over: this placement decides)
      const mv = this.moving?.get(n); if (mv) { this.moving.delete(n); if (n.track === mv.track) n.track = null; }
      const was = n.present;
      n.setPresent(!!p);
      // (INTERIOR-LIFE: the place the story gave is remembered; a household round's person whose place is still their
      //  usual mark carries on with the round instead of being put back on it: roomlife.js StoryRounds.keeps)
      const keep = !!p && this.interiors.keeps(n, p);
      n.placed = p;
      if (p && !keep && !(walk && this.walkOn(n, p, was))) n.placeAt(p);
    }
    for (const e of g.enemies) if (e.def?.when) e.setPresent(!!e.def.when(this.f));
  }

  // ---- routed hooks
  objective() { return this.cur.objective(); }
  markers() { return this.cur.markers(); }
  journal() {
    // (an empty shell, and a chapter not in this save's campaign, have no page)
    const out = this.chapters.slice(0, this.index + 1).filter((c) => !c.passThrough && this.inCampaign(c.key)).map((c) => { const n = this.number(c.key); return { title: (n ? n + '. ' : '') + t('chapter_' + c.key), lines: c.journal() }; });
    const life = this.life.journal();
    if (life.length) out.push({ title: t('life_title'), lines: life });
    const ws = this.workshop.journal();
    if (ws.length) out.push({ title: t('w_title'), lines: ws });
    const kl = this.kesh.journal();
    if (kl.length) out.push({ title: t('k_title'), lines: kl });
    const zl = this.zlife.journal();
    if (zl.length) out.push({ title: t('zl_title'), lines: zl });
    const ar = this.arsenal.journal();
    const k2 = [...this.kit2.journal(), ...this.kit2b.journal()];
    if (ar.length || k2.length) out.push({ title: t('a_title'), lines: [...ar, ...k2] });
    const sw = this.sewers.journal();
    if (sw.length) out.push({ title: t('sw_title'), lines: sw });
    const hs = this.hostel.journal();
    if (hs.length) out.push({ title: t('hs_title'), lines: hs });
    const sh = this.shops.journal();
    if (sh.length) out.push({ title: t('sh_j_title'), lines: sh });
    const pp = this.purposes.journal();
    if (pp.length) out.push({ title: t('pp_title'), lines: pp });
    const ip = this.ipeople.journal();
    if (ip.length) out.push({ title: t('ip_title'), lines: ip });
    return out;
  }
  items() { return [...this.chapters.slice(0, this.index + 1).flatMap((c) => c.items()), ...this.life.items(), ...this.kesh.items(), ...this.arsenal.items(), ...this.sewers.items(), ...this.hostel.items(), ...this.shops.items(), ...this.purposes.items(), ...this.ipeople.items()]; }
  // (the wizards' doors are open in every chapter: src/game/wizards.js)
  // WORLD-AUDIT: Twinsen's own front door opens in every chapter. The chapters set elsewhere (4–7, 9; 3, 11, 12) offer
  // no door of their own on Citadel, so on a visit home by ferry or ship it had no prompt at all while Zoé and Arthur
  // were inside on their marks.
  doors() { const cur = this.cur.doors(), h0 = this.game.world?.houses?.[0]; if (h0?.door && !cur.some((d) => d.room === 'house')) cur.push({ house: h0.id, x: h0.door.x, z: h0.door.z, r: 0.9, room: 'house' }); return [...cur, ...wizardDoors(), ...lba1Doors(), ...sewerDoors(this.game.world, this.game.flags), ...tavernDoors(this.game.world), ...bazooDoors(this.game.world), ...ticketDoors(this.game.world), ...pharmacyDoors(this.game.world), ...nbrhouseDoors(this.game.world, this.game.flags), ...nellhouseDoors(this.game.world), ...baggageDoors(this.game.world), ...traluCaveDoors(this.game.world), ...terminalDoors(this.game.world), ...zterminalDoors(this.game.world), ...otrBarDoors(this.game.world), ...otrHotelDoors(this.game.world), ...celTempleDoors(this.game.world)]; }
  // where an exit leads: the current chapter first, then the earlier ones (their rooms are still there)
  exitTo(to) { const w = wizardExit(to) || lba1Exit(to) || sewerExit(to, this.game.world) || tavernExit(to, this.game.world) || bazooExit(to, this.game.world) || ticketExit(to, this.game.world) || pharmacyExit(to, this.game.world) || nbrhouseExit(to, this.game.world) || nellhouseExit(to, this.game.world) || baggageExit(to, this.game.world) || traluCaveExit(to, this.game.world) || terminalExit(to, this.game.world) || zterminalExit(to, this.game.world) || otrBarExit(to, this.game.world) || otrHotelExit(to, this.game.world) || celTempleExit(to, this.game.world); if (w) return w; for (let i = this.index; i >= 0; i--) { const r = this.chapters[i].exitTo(to); if (r) return r; } return null; }
  // the town's doors on Citadel (house, water office, control room) for chapters set there after chapter 2
  // (chapter 2 offers the control room only until Zoé's office segment; later chapters need it again — ch. 8's relay)
  townDoors() {
    const out = (this.chapters.find((c) => c.key === 'project')?.doors() || []).filter((d) => d.room !== 'projoffice');
    const st = this.game.world.station;
    if (st && this.game.regions.has('control') && !out.some((d) => d.room === 'control')) out.push({ x: st.control.door.x, z: st.control.door.z, r: 0.9, room: 'control' });
    return out;
  }
  canExit(room, to) { return this.cur.canExit(room, to); }
  interactables(consider, dist) { this.cur.interactables(consider, dist); this.purposes.interactables(consider, dist); this.ipeople.interactables(consider, dist); this.isles.interactables(consider, dist); this.life.interactables(consider, dist); this.workshop.interactables(consider, dist); this.kesh.interactables(consider, dist); this.zlife.interactables(consider, dist); this.arsenal.interactables(consider, dist); this.kit2.interactables(consider, dist); this.kit2b.interactables(consider, dist); this.sewers.interactables(consider, dist); this.hostel.interactables(consider, dist); this.shops.interactables(consider, dist); }
  interact(it) { return this.shops.interact(it) || this.cur.interact(it) || this.purposes.interact(it) || this.ipeople.interact(it) || this.isles.interact(it) || this.life.interact(it) || this.workshop.interact(it) || this.kesh.interact(it) || this.zlife.interact(it) || this.arsenal.interact(it) || this.kit2.interact(it) || this.kit2b.interact(it) || this.sewers.interact(it) || this.hostel.interact(it) || this.chapters[0].baseInteract(it); }
  talk(npc) { if (this.shops.talkFirst(npc) || this.purposes.talkFirst(npc) || this.ipeople.talkFirst(npc) || this.citizens.talkFirst(npc) || this.kit2b.talkFirst(npc) || this.life.talkFirst(npc) || this.workshop.talkFirst(npc) || this.kesh.talkFirst(npc) || this.zlife.talkFirst(npc) || this.arsenal.talkFirst(npc) || this.kit2.talkFirst(npc) || this.sewers.talkFirst(npc) || this.hostel.talkFirst(npc) || this.magic.talkFirst(npc)) return; if (!this.cur.talk(npc) && !this.life.talk(npc)) this.chapters[0].baseTalk(npc); }
  ballHit(p) { return this.cur.ballHit(p); }
  meleeHit(o) { return this.cur.meleeHit?.(o) || this.arsenal.meleeHit(o); }
  pulseHit(o) { return this.cur.pulseHit?.(o) || false; }
  jetHit(o) { return this.cur.jetHit?.(o) || this.kit2.jetHit(o); }   // (EQUIP-2a: the pump lance's jet, tools.js)
  // EQUIP-2b (tools.js): the singing fork's note, the heat flask's blast, what the Esmer line can catch here
  forkHit(o) { return this.cur.forkHit?.(o) || this.kit2b.forkHit(o) || this.purposes.forkHit(o); }
  heatHit(o) { return this.cur.heatHit?.(o) || this.kit2b.heatHit(o); }
  lineTargets() { return this.kit2b.lineTargets(); }
  ballTargets() { return this.cur.ballTargets(); }
  update(dt) { this.stepMoves(dt); this.cur.update(dt); this.life.update(dt); this.interiors.update(dt); this.workshop.update(dt); this.kesh.update(dt); this.zlife.update(dt); this.arsenal.update(dt); this.kit2.update(dt); this.kit2b.update(dt); this.sewers.update(dt); this.shops.update(dt); this.ipeople.update(dt); this.citizens.update(dt); }
  onEnterRoom(id) { this.cur.onEnterRoom(id); this.sewers.onEnterRoom(id); this.hostel.onEnterRoom(id); }   // (SEWERS-1: arrivals by the other ways)
  onExitRoom(id) { this.cur.onExitRoom(id); this.sewers.onExitRoom(id); }   // (SEWER-LIFT: up the shaft onto the deck)
  applyFlags() {
    for (let i = 0; i < this.chapters.length; i++) this.chapters[i].applyFlags(i < this.index, i === this.index);
    this.life.applyFlags();
    this.workshop.applyFlags();
    this.kesh.applyFlags();
    this.zlife.applyFlags();
    this.arsenal.applyFlags();
    this.kit2.applyFlags();
    this.kit2b.applyFlags();
    this.sewers.applyFlags();
    this.hostel.applyFlags();
    this.purposes.applyFlags();
    this.ipeople.applyFlags();
    this.magic.catchUp();   // (MAGIC-LEVELS: a save from before: the levels its chapter has given; never lowered)
    this.noWalk = true;   // (a load: everyone on their places)
    try { this.refreshCast(); } finally { this.noWalk = false; }
  }
  // VISIBLE-MOVES (polish; the user: "characters that teleport without reason"): a new place from the story, in the
  // scene the hero is in, when the person or the place is in the camera's view, is walked to instead of jumped to
  // (chapter 5's meeting round the plaza ended with all six popping to their posts in front of him). He is put on the
  // place once there, or as soon as neither he nor the place is in view (never in view: blocked, he stops and waits).
  // Taken at once as before: behind a fade or a scene, at a chapter's start, on a load, a place with a floor (y), a pin
  // or a walk of its own, someone held by a scene (controlled), or a place in another scene. Nothing is saved: a load
  // puts everyone on their places.
  // Opt-in: the calls of chapters 3–12 and the epilogue pass { walk: true }; chapters 1–2's, the life modules' and the
  // tests' calls place at once as before (the coordinator may extend it to them).
  // A place may name `from`, a way in on the hero's scene (a door): someone arriving from elsewhere (another scene, or
  // not shown before) while the place or that way in is in view comes out of it and walks over, instead of appearing;
  // and `via`, a way out (a door) for someone the camera sees whose new place is in another scene: he walks to it and
  // goes, instead of vanishing.
  walkOn(n, p, was = n.present) {
    const g = this.game;
    if (this.noWalk || !n.present || n.controlled || n.pinY != null || p.y != null || p.pin || p.track) return false;
    if ((g.state !== 'play' && g.state !== 'dialog') || g.trans || g.cutscene || g.reveal?.on || g.preparing) return false;
    const R = g.regions, sc = R?.sceneOf(g.hero.pos.x, g.hero.pos.z);
    if (!R) return false;
    let arrive = false, to = p;
    if (R.sceneOf(p.x, p.z) !== sc) {
      // (to another scene: with a way out named (`via`, a door on this one) he walks to it, then goes)
      if (!p.via || !was || R.sceneOf(n.pos.x, n.pos.z) !== sc || !this.seen(n.pos)) return false;
      to = p.via;
    } else if (p.from && (!was || R.sceneOf(n.pos.x, n.pos.z) !== sc)) {
      if (!this.seen(p) && !this.seen(p.from)) return false;
      n.placeAt({ x: p.from.x, z: p.from.z, a: Math.atan2(p.x - p.from.x, p.z - p.from.z) });
      arrive = true;
    } else if (!was) return false;
    const d = Math.hypot(to.x - n.pos.x, to.z - n.pos.z);
    if (d < 0.8 || d > MOVE_FAR) return false;
    // (either end in view: he walks; out of view at both, he is put there at once. A place in view for someone out of
    //  view — Yorna sent from Lhar to the winch beside him — had him appear there)
    if (!arrive && (R.sceneOf(n.pos.x, n.pos.z) !== sc || (!this.seen(n.pos) && !this.seen(to)))) return false;
    const track = new TrackRunner([{ op: 'goto', x: to.x, z: to.z, speed: 1 }]);
    n.forceAnim = null; n.track = track;
    (this.moving ??= new Map()).set(n, { p, to, t: 0, track, arrive });
    return true;
  }
  stepMoves(dt) {
    if (!this.moving?.size) return;
    for (const [n, M] of this.moving) {
      M.t += dt;
      if (!n.present || n.placed !== M.p || (!M.stuck && n.track !== M.track)) { this.moving.delete(n); continue; }   // (decided otherwise since)
      const there = Math.hypot(M.to.x - n.pos.x, M.to.z - n.pos.z) < 0.6;
      if (there || (!this.seen(n.pos) && !this.seen(M.p))) { this.moving.delete(n); n.track = null; n.placeAt(M.p); continue; }
      // (a straight walk that something blocks: he stops and waits there, not walking on the spot into it; he is put on
      //  the place once out of view. Time beside the hero does not count: he stops to face him then, NPC.update)
      M.last ??= { x: n.pos.x, z: n.pos.z };
      if (M.stuck || n.distTo(this.game.hero) < 3.4) { M.chk = 0; M.last.x = n.pos.x; M.last.z = n.pos.z; continue; }
      if ((M.chk = (M.chk ?? 0) + dt) >= 1.5) {
        if (Math.hypot(n.pos.x - M.last.x, n.pos.z - M.last.z) < 0.5) { M.stuck = true; n.track = null; }
        M.chk = 0; M.last.x = n.pos.x; M.last.z = n.pos.z;
      }
    }
  }
  // is a point in the camera's view (a sphere round a person standing there, within 70 m)?
  seen(p) {
    const c = this.game.camera; if (!c) return false;
    const y = p.y ?? this.game.physics.groundAt(p.x, p.z);
    _sv.set(p.x, y + 0.9, p.z);
    if (c.position.distanceTo(_sv) > 70) return false;
    c.updateMatrixWorld(); _sm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); _sf.setFromProjectionMatrix(_sm);
    _ss.center.copy(_sv); _ss.radius = 1.2;
    return _sf.intersectsSphere(_ss);
  }
  afterEnding() { this.cur.afterEnding?.(); }
  // LAZY-REGIONS: after an area's build (src/main.js regionBuilt): what each part of the story keeps on it
  regionBuilt(ids) { for (const c of [...this.chapters, this.workshop, this.kesh, this.zlife, this.arsenal, this.kit2, this.kit2b, this.sewers, this.hostel, this.purposes, this.ipeople]) c.regionBuilt?.(ids); }
}
