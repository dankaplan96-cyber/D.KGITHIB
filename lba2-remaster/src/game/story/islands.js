// Travel by input (CONNECT; src/game/travel.js): at a travel point — a spaceport pad, a shuttle pad, the ferry
// stops, the glider fields — E opens the menu of where that craft goes now. Twinsun's regions are joined by the
// ferry and the glider, Zeelich's by Esmer shuttles, and the two planets only by the spaceship between Citadel
// Spaceport and Zeelich Spaceport. Routes open with their chapters (travel.js); the story's own crossings (the
// project's ferry, Hesk's flights) stay as they were. Every chapter's world stays as it was: travelling only moves
// Twinsen.
import { buildTravel, destinations, travelTo, TITLE, LABEL } from '../travel.js';
import { t } from '../i18n.js';
import '../text/islands.js';

export class IslandShuttle {
  constructor(story) { this.story = story; this.game = story.game; buildTravel(this.game); }
  open() { return this.story.index >= this.story.chapters.findIndex((c) => c.key === 'dig'); }
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
    const region = g.room ? (g.room.outdoor ? g.room.id : null) : 'citadel'; if (!region) return;
    for (const p of Object.values(T.points)) {
      if (p.region !== region) continue;
      if (destinations(g, p).length) consider(dist(p.x, p.z), p.r, { kind: 'isleShuttle', point: p, label: LABEL[p.mode] });
      else if (p.id === 'citadel_port') consider(dist(p.x, p.z), p.r, { kind: 'portGrounded', label: 'p_shuttle' });
    }
  }
  interact(it) {
    const g = this.game;
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
    g.openMenu(TITLE[p.mode], items, (o) => travelTo(g, o.point));
    return true;
  }
  go(id) { const p = this.game.travel?.points[id === 'citadel' ? 'citadel_port' : id === 'zeelich' ? 'zeelich_shuttle' : id]; if (p) travelTo(this.game, p); }
}
