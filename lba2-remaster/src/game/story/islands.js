// The Esmer shuttle to Zeelich's other islands (the regions in src/game/zislands.js). Not part of the story: from
// chapter 4 on (once Zeelich has been seen) and after the ending, the shuttle on the pad by Zeelich's dock takes
// Twinsen to any of the islands, and each island's shuttle takes him on or back. Every chapter's world stays as it
// was: the islands have no story, and coming back lands him beside Zeelich's pad.
import { ISLES } from '../zislands.js';
import { t } from '../i18n.js';
import '../text/islands.js';

export class IslandShuttle {
  constructor(story) { this.story = story; this.game = story.game; }
  open() {
    const s = this.story;
    return s.index >= s.chapters.findIndex((c) => c.key === 'dig');
  }
  pad() {
    const R = this.game.room;
    if (!R) return this.game.world.spaceport?.pad || null;
    if (R.id === 'zeelich') return R.shuttlePad || null;
    return R.isle ? R.pad : null;
  }
  interactables(consider, dist) {
    const p = this.pad();
    if (!p) return;
    if (this.open()) consider(dist(p.x, p.z), 5.0, { kind: 'isleShuttle', label: 'p_shuttle' });
    else if (!this.game.room) consider(dist(p.x, p.z), 5.0, { kind: 'portGrounded', label: 'p_shuttle' });
  }
  interact(it) {
    const g = this.game;
    if (it.kind === 'portGrounded') { g.audio.play('deny'); g.say('', [t('port_grounded')]); return true; }
    if (it.kind !== 'isleShuttle') return false;
    const here = g.room?.id ?? 'citadel';
    const items = ['citadel', 'zeelich', ...ISLES.map((n) => 'isle_' + n).filter((id) => g.rooms[id])].map((id) => ({
      key: id === 'citadel' || id === 'zeelich' ? 'isle_' + id : id, id, disabled: id === here, note: id === here ? 'isle_here' : '',
    }));
    g.audio.play('select');
    g.openMenu('isle_title', items, (o) => this.go(o.id));
    return true;
  }
  // where he lands: on an island beside its shuttle; on Zeelich beside the pad, facing the island's middle
  landing(id) {
    const g = this.game, R = g.rooms[id];
    if (id === 'citadel') return g.world.spaceport.landing;
    if (id !== 'zeelich') return R.spawn;
    const p = R.shuttlePad, cx = R.group.position.x, cz = R.group.position.z;
    const a = Math.atan2(cx - p.x, cz - p.z);
    return { x: p.x + Math.sin(a) * 5.4, z: p.z + Math.cos(a) * 5.4, a };
  }
  go(id) {
    const g = this.game;
    g.startTransition(() => {
      const l = this.landing(id);
      if (id === 'citadel') g.exitRoom(l, true); else g.enterRoom(id, l, true);
      this.story.refreshCast();
      g.audio.play('door');
      g.hud.toast(id === 'citadel' || id === 'zeelich' ? 'isle_' + id : id);
      g.updateObjective();
    });
  }
}
