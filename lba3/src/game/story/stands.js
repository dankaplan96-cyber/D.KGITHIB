// CITADEL-STANDS (the user, 7.11.2026, a photo of the spaceport deck: "another structure that's just there"): Citadel's
// small structures a player reads as usable were empty or did nothing. Each now has a purpose (citadel-structures.md in
// docs/lba-maturity lists them all, with the ones that already had one). Not a chapter: the director (index.js) asks it
// after the chapter in progress, like the town's life. No story flags: what it says is read from the chapter.
//   - the spaceport's TICKETS · INFO kiosk (spaceport.js): Corla, the port's information clerk, behind the counter in
//     every chapter. Her lines follow the port: grounded by the project (chapters 1–3), flying (4–7, 9–12, the
//     epilogue), the evacuation (8: no seats, water and directions). While the spaceship flies she sells the seat
//     herself: after her line, the spaceship's menu, as the counter inside the terminal does (story/islands.js).
//   - the two street notice boards (citydress.js): the town's notices for its state (the well dry, the heat, the
//     shuttles, the evacuation, the return);
//   - the two information stands (the square's town map, the spaceport's Zeelich map): read;
//   - the two drinking fountains (by the lane, on the deck): dry while the well is (chapter 1, chapter 2 before the
//     valves), warm in chapter 2, cool after; a drink gives back a little life (once in a while);
//   - the hand carts (the lane's flour cart, the deck's cargo cart): whose they are;
//   - Doran's shed and the harbour master's shed (island.js): shut, each with its reason on a line of its own.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { destinations, travelTo, TITLE } from '../travel.js';
import { portPhase } from '../roomlife.js';
import '../text/stands.js';

// the kiosk (spaceport.js: at (−10.4, 45.5), turned π, its hatch toward the walkway at z ≈ 40); Corla stands behind the
// counter, 0.15 m into the booth from its middle, facing the hatch
export const KIOSK = { x: -10.4, z: 45.5, clerk: { x: -10.4, z: 45.66, a: Math.PI } };
// the deck's furniture with a purpose (spaceport.js) and the streets' (citydress.js: W.cityDress.items by name)
const PORT_THINGS = [
  { kind: 'cs_info', key: 'cs_info_port', x: -7.7, z: 44.1, r: 1.5 },
  { kind: 'cs_fount', x: -0.9, z: 32.2, r: 1.2 },
  { kind: 'cs_cart', key: 'cs_cart_port', x: 7.6, z: 28.6, r: 1.9 },
];
const DRINK_EVERY = 20;   // s between two drinks that give life back

export class CitadelStands extends ChapterBase {
  npcDefs() {
    const c = KIOSK.clerk;
    return [{ id: 'cs_corla', name: 'n_cs_corla', char: 'clerk', color: '#9fd0f0', x: c.x, z: c.z, angle: c.a }];
  }
  // she keeps her kiosk in every chapter (in the evacuation too: water and directions)
  place(id) {
    if (id !== 'cs_corla') return undefined;
    if (!this.game.world?.spaceport) return null;
    const c = KIOSK.clerk;
    return { x: c.x, z: c.z, a: c.a };
  }
  // the town's state for the notices and the fountains: 'dry' (chapter 1, chapter 2 before the valves), 'hot' (chapter 2
  // with the water back), 'mid' (3–7), 'evac' (8), 'late' (9–12), 'home' (the epilogue)
  townState() {
    const S = this.story, f = this.f, i = S.index, k = S.cur?.key;
    if (i === 0 || (i === 1 && !f.c1_water)) return 'dry';
    if (i === 1) return 'hot';
    if (k === 'evacuation') return 'evac';
    if (k === 'home') return 'home';
    if (i >= S.chapters.findIndex((c) => c.key === 'council')) return 'late';
    return 'mid';
  }
  // the street's things, once Citadel is built (citydress.js items: notice boards, the town map, the fountain, the cart)
  things() {
    const W = this.game.world;
    if (!W) return [];
    if (this._things && this._W === W) return this._things;
    const out = [], items = W.cityDress?.items || [];
    let board = 0;
    for (const it of items) {
      const r = (it.r ?? Math.max(it.hw || 0, it.hd || 0)) + 1.0;
      if (it.name === 'board-notices') out.push({ kind: 'cs_board', which: board++ ? 'lane' : 'square', x: it.x, z: it.z, r: r + 0.3 });
      else if (it.name === 'infostand') out.push({ kind: 'cs_info', key: 'cs_info_town', x: it.x, z: it.z, r });
      else if (it.name === 'fountain') out.push({ kind: 'cs_fount', x: it.x, z: it.z, r: r + 0.2 });
      else if (it.name === 'handcart') out.push({ kind: 'cs_cart', key: 'cs_cart_flour', x: it.x, z: it.z, r: r + 0.3 });
      else if (it.name === 'handcart-quay') out.push({ kind: 'cs_cart', key: 'cs_cart_quay', x: it.x, z: it.z, r: r + 0.3 });
    }
    if (W.spaceport) out.push(...PORT_THINGS);
    const sh = W.harbourShed?.door;
    if (sh) out.push({ kind: 'cs_shed', key: 'cs_shed_doran', x: sh.x, z: sh.z, r: 1.4 });
    // the harbour master's shed at the pier's foot: 2.6 m east-west, its door in the east face (island.js)
    const ps = W.pierStart;
    if (ps) out.push({ kind: 'cs_shed', key: 'cs_shed_harbour', x: ps.x + 1.3 + 0.6, z: ps.z + 4.4, r: 1.3 });
    this._W = W; this._things = out;
    return out;
  }
  interactables(consider, dist) {
    const g = this.game;
    if (g.room) return;
    const b = g.hero.body; if (b === 'zoe' || b === 'worker') return;   // (Zoé's and the disguise's own scenes)
    for (const it of this.things()) {
      const label = it.kind === 'cs_fount' ? 'p_drink' : it.kind === 'cs_shed' ? 'p_door' : it.kind === 'cs_cart' ? 'p_look' : 'p_read';
      consider(dist(it.x, it.z), it.r, { ...it, label });
    }
  }
  interact(it) {
    const g = this.game, h = g.hero;
    const say = (key) => { g.say('', [t(key)]); return true; };
    switch (it.kind) {
      case 'cs_board': g.audio.play('select'); return say(`cs_board_${it.which}_${this.townState()}`);
      case 'cs_info': g.audio.play('select'); return say(it.key);
      case 'cs_cart': return say(it.key === 'cs_cart_port' ? (portPhase(this.story) === 'grounded' ? 'cs_cart_port_g' : 'cs_cart_port') : it.key);
      case 'cs_shed': g.audio.play('deny'); return say(it.key);
      case 'cs_fount': {
        const st = this.townState();
        if (st === 'dry') { g.audio.play('deny'); return say('cs_fount_dry'); }
        if (h.hp < h.maxHp && !(this._drank > g.time - DRINK_EVERY)) { this._drank = g.time; h.hp = Math.min(h.maxHp, h.hp + 2); g.audio.play('heal'); }
        g.say('n_hero', [t(st === 'hot' ? 'cs_fount_warm' : 'cs_fount_cool')], null, h);
        return true;
      }
    }
    return false;
  }
  // ---------------------------------------------------------------- Corla at the kiosk
  // her line for the chapter in progress (her own per chapter where the port's news is, else the port's state)
  clerkKey() {
    const S = this.story, k = S.cur?.key, ph = portPhase(S), f = this.f;
    if (k === 'well') return 'cs_corla_well';
    if (k === 'project') return f.c1_ship ? 'cs_corla_project_ship' : 'cs_corla_project';
    if (k === 'zeelich') return 'cs_corla_zeelich';
    if (ph === 'evac') return 'cs_corla_evac';
    const own = 'cs_corla_' + k;
    return t(own) !== own ? own : 'cs_corla_fly';
  }
  talkFirst(npc) {
    if (npc.def.id !== 'cs_corla') return false;
    const g = this.game, from = g.travel?.points?.citadel_port;
    const n = (this._n = (this._n ?? -1) + 1);
    const key = this.clerkKey(), sells = portPhase(this.story) !== 'evac' && from && destinations(g, from).length;
    // (a second line, every other time: how the islands are reached, or what grounds the ships)
    const extra = n % 2 ? (sells ? 'cs_corla_islands' : portPhase(this.story) === 'grounded' ? 'cs_corla_grounded' : null) : null;
    this.chain([['cs_corla', key], ...(extra ? [['cs_corla', extra]] : [])], () => {
      if (!sells) return;
      const dests = destinations(g, from);
      g.audio.play('select');
      g.openMenu(TITLE.ship, dests.map((d) => ({ key: d.point.name, id: d.point.id, point: d.point, note: '' })), (o) => travelTo(g, o.point, from));
    });
    return true;
  }
}
