// Travel by input (CONNECT; src/game/travel.js): at a travel point — a spaceport pad, a shuttle pad, the ferry
// stops, the glider fields — E opens the menu of where that craft goes now. Twinsun's regions are joined by the
// ferry and the glider, Zeelich's by Esmer shuttles, and the two planets only by the spaceship between Citadel
// Spaceport and Zeelich Spaceport. Routes open with their chapters (travel.js). The story's own crossings between the
// planets are spaceship flights too (PLANET-1): the project's ship in chapter 2 (the one exception to the grounded
// notice below), the project ships in chapters 3→4 and 8, the public spaceship in chapter 10; Hesk's glider flies
// on Twinsun only. Every chapter's world stays as it was: travelling only moves Twinsen.
//
// SPACEPORT-1: inside the two terminals (terminal.js, zterminal.js) the ticket counter sells the same spaceship as the
// pad outside: Twinsen picks where to in the menu there, goes out through the gate onto the deck under the black, and
// the ship's journey film starts from the pad as if he had boarded there. While passenger flights are grounded
// (chapters 1–3: no spaceship route open yet) the clerk says so instead. The departures boards inside are read here too.
//
// SPACEPORT-2: Citadel's deck is airside, reached only through the terminal. Its gate lets him out of the hall onto the
// deck whenever a ship flies from it (chapter 4 on: passengers; the evacuation: the project's ships by their list) and,
// while passenger flights are grounded (chapters 1–3), only when the story has a ship for him (chapter 2: Doran with the
// project's ship, the clerk sends him out through the gate: tm_pilot). Otherwise the port's guard at the gate (or, with
// nobody there, the GROUNDED notice) says why: the reason the clerk and the notice already give. The way in from the
// deck by the gate is always open (arrivals; a save on the deck), so he is never shut out there.
import { buildTravel, destinations, travelTo, TITLE, LABEL } from '../travel.js';
import { FILMS } from '../travelfilm.js';
import { TERMINAL } from '../terminal.js';
import { ZTERMINAL } from '../zterminal.js';
import { t } from '../i18n.js';
import { portPhase } from '../roomlife.js';
import '../text/islands.js';

// each terminal: its handle, the travel point outside, its gate's exit, its clerk, what the clerk says while grounded,
// its board's text
const TERMINALS = {
  terminal: { H: TERMINAL, point: 'citadel_port', gate: 'terminal-gate', clerk: 'ama', grounded: 'tm_grounded', board: 'port_board' },
  zterminal: { H: ZTERMINAL, point: 'zeelich_port', gate: 'zterminal-gate', clerk: 'velo', grounded: 'zt_grounded', board: 'zt_board' },
};

export class IslandShuttle {
  constructor(story) { this.story = story; this.game = story.game; buildTravel(this.game); }
  open() { return this.story.index >= this.story.chapters.findIndex((c) => c.key === 'dig'); }
  // SPACEPORT-2: may he go out of Citadel's terminal by its gate now? (index.js canExit asks first)
  // SPACEPORT-3: in chapter 2 the project's flight wants its form signed at the counter first (story/chapter1.js: Doran's
  // errand, c1_errand; a save from before the errand had no form to sign: the gate opens for it as before)
  gateOpen() {
    const S = this.story, f = this.game.flags;
    if (portPhase(S) !== 'grounded') return true;
    return !!f.c1_ship && S.index <= 1 && (!f.c1_errand || !!f.c1_form);   // (chapter 2: the project's ship waits for him at the pad)
  }
  // (chapter 2, Doran's errand, the form not signed yet: the guard sends him to the counter, not away)
  formWanted() { const f = this.game.flags; return !!(f.c1_ship && f.c1_errand && !f.c1_form) && this.story.index <= 1; }
  canExit(room, to) {
    if (room?.id !== 'terminal' || to !== 'terminal-gate' || this.gateOpen()) return true;
    this.game.audio.play('deny');
    const guard = this.story.interiors.speaker('bern'), form = this.formWanted();
    if (guard?.present && !guard.away) this.story.interiors.chain([['bern', form ? 'c1_bern_form' : 'tm_grounded']]);
    else this.game.say('', [t(form ? 'c1_gate_form' : 'tm_gate_shut')]);
    return false;
  }
  // SPACEPORT-3: the apron's working day, from the chapter (no save): a ship readied while flights run, and in chapter 2
  // the project's ship Doran flies (the fuel hose run out to it); grounded otherwise (the nozzle hung on the cart). Called
  // every frame (index.js update): it changes the port only on a change
  portLook() {
    const sp = this.game.world?.spaceport; if (!sp?.setWork) return;
    sp.setWork(portPhase(this.story) !== 'grounded' || (this.game.flags.c1_ship && this.story.index <= 1) ? 'run' : 'idle');
  }
  // the TICKETS · INFO kiosk on the shore sells the same seat: out through the terminal's gate under the black, then the
  // journey from the pad, as the counter inside does (story/stands.js)
  boardFromKiosk(from, to) { this.board(TERMINALS.terminal, from, to); }
  // the main pad of the region he is in (the spaceport's on Citadel, the shuttle's on Zeelich and the islands)
  pad() {
    const R = this.game.room;
    if (!R) return this.game.world.spaceport?.pad || null;
    if (R.id === 'zeelich') return R.shuttlePad || null;
    return R.isle ? R.pad : null;
  }
  // where he lands: on an island beside its shuttle; on Zeelich beside the shuttle pad; on Citadel at the spaceport
  landing(id) {
    const T = this.game.travel?.points || {};
    if (id === 'citadel') return T.citadel_port?.landing || this.game.world.spaceport.landing;
    if (id === 'zeelich') return T.zeelich_shuttle?.landing;
    return T[id]?.landing || this.game.rooms[id]?.spawn;
  }
  interactables(consider, dist) {
    const g = this.game, T = g.travel; if (!T) return;
    const tm = TERMINALS[g.room?.id];
    if (tm && tm.H.counter) {
      consider(dist(tm.H.counter.x, tm.H.counter.z), tm.H.counter.r, { kind: 'termCounter', tm, label: 'p_tickets' });
      consider(dist(tm.H.board.x, tm.H.board.z), tm.H.board.r, { kind: 'termBoard', tm, label: 'p_read' });
      return;
    }
    const region = g.room ? (g.room.outdoor ? g.room.id : null) : 'citadel'; if (!region) return;
    for (const p of Object.values(T.points)) {
      if (p.region !== region) continue;
      if (destinations(g, p).length) consider(dist(p.x, p.z), p.r, { kind: 'isleShuttle', point: p, label: LABEL[p.mode] });
      else if (p.id === 'citadel_port') consider(dist(p.x, p.z), p.r, { kind: 'portGrounded', label: 'p_shuttle' });
    }
  }
  interact(it) {
    const g = this.game;
    // (WC-4: a board reads the port's state when it has a line for it: the evacuation's, the council's checks)
    if (it.kind === 'termBoard') { const k = `${it.tm.board}_${portPhase(this.story)}`; g.audio.play('paper'); g.say('', [t(t(k) !== k ? k : it.tm.board)]); return true; }
    if (it.kind === 'termCounter') return this.counter(it.tm);
    if (it.kind === 'portGrounded') { g.audio.play('deny'); g.say('', [t('port_grounded')]); return true; }
    if (it.kind !== 'isleShuttle') return false;
    const p = it.point, dests = destinations(g, p);
    const items = dests.map((d) => ({ key: d.point.name, id: d.point.id, point: d.point, note: '' }));
    // (a shuttle's menu names the island he is on too, greyed: the islands' list reads the same from every pad)
    if (p.mode === 'shuttle') {
      const all = [p, ...dests.map((d) => d.point)].sort((a, b) => (a.id === 'zeelich_shuttle' ? -1 : b.id === 'zeelich_shuttle' ? 1 : 0) || Object.keys(g.travel.points).indexOf(a.id) - Object.keys(g.travel.points).indexOf(b.id));
      items.length = 0;
      for (const q of all) items.push({ key: q.name, id: q.id, point: q, disabled: q === p, note: q === p ? 'isle_here' : '' });
    }
    g.audio.play('select');
    g.openMenu(TITLE[p.mode], items, (o) => travelTo(g, o.point, p));   // (TRAVEL-1: from this point: its craft's film)
    return true;
  }
  // the ticket counter: the spaceship's menu from the pad outside; grounded, the clerk's word (or the notice's, with
  // nobody behind the counter)
  counter(tm) {
    if (this.story.cur.portCounter?.(tm)) return true;   // (SPACEPORT-3: the chapter's own business at the counter first)
    const g = this.game, from = g.travel?.points[tm.point], dests = from ? destinations(g, from) : [];
    if (!dests.length) {
      g.audio.play('deny');
      const clerk = this.story.interiors.speaker(tm.clerk), doran = this.story.interiors.speaker('doran');
      // (chapter 2: Doran has the project ship's start code and waits by its hatch: the clerk points him out there)
      const pilot = tm.point === 'citadel_port' && g.flags.c1_ship && this.story.index <= 1 && doran?.present;
      if (clerk?.present && !clerk.away) this.story.interiors.chain(pilot ? [[tm.clerk, tm.grounded], [tm.clerk, 'tm_pilot']] : [[tm.clerk, tm.grounded]]);
      else g.say('', [t('port_grounded')]);
      return true;
    }
    g.audio.play('select');
    g.openMenu(TITLE.ship, dests.map((d) => ({ key: d.point.name, id: d.point.id, point: d.point, note: '' })), (o) => this.board(tm, from, o.point));
    return true;
  }
  // from the counter to the ship: out through the gate onto the deck under the black, then the journey from the pad (its
  // departure film there); without the films (?nocine) straight to the journey's own scene change
  board(tm, from, to) {
    const g = this.game;
    if (!FILMS.on) { travelTo(g, to, from); return; }
    const out = this.story.exitTo(tm.gate);
    g.startTransition(() => { if (out.room) g.enterRoom(out.room, out, true); else g.exitRoom(out, true); }, out.room ? [out.room] : null, () => travelTo(g, to, from));
  }
  go(id) { const p = this.game.travel?.points[id === 'citadel' ? 'citadel_port' : id === 'zeelich' ? 'zeelich_shuttle' : id]; if (p) travelTo(this.game, p); }
}
