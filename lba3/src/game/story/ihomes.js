// ISLE-HOMES (src/game/ihomes.js): the doors of Zeelich's islands' houses and of Kesh's, the rooms' looks, the doors
// kept shut with their reason and sign, and the keepers behind a few counters. Not a chapter: the director (index.js)
// asks it after the chapter in progress. No story flags; a keeper's lines follow the chapter (islandlife.js
// lineState: ord · evac · council · net · home). The islands are reached from chapter 4 and Kesh is visited from
// chapter 4 too, so the doors are offered whenever their region is built (a region is only built when he goes there).
//   doors(): a house's door leads in when its region is built: the trigger on the door's sill, a little out.
//   exitTo('<room>-out'): 1.45 m before that door, facing away from it, on its region (built behind the black first if
//     a save inside the room was loaded straight into it: regions.built in the probe, main.js checkDoors).
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { IHOMES, EXCEPT, IHOME_IDS, IH, KEEPERS, roomOf, regionOf, doorOf, signShutDoor } from '../ihomes.js';
import { lineState } from '../islandlife.js';
import '../text/ihomes.js';

const REGIONS = [...new Set(Object.keys(IHOMES).map(regionOf))];
const ROOMS = new Set(IHOME_IDS);
// (m from the door's sill: the trigger's middle and its reach (to 1.3 m out and 0.85 m either side: a portico's columns or
//  a step keep him that far from some sills); where he comes out, just past its reach)
const IN = 0.45, REACH = 0.85, OUT = 1.45;

export class IsleHomes extends ChapterBase {
  get R() { return this.game.regions; }
  // a region's shut doors that are ours, by id (once the region is built)
  ours(region) {
    const R = this.R?.built(region);
    if (!R?.shutDoors) return null;
    if (R._ih !== R.shutDoors.length) { R._ih = R.shutDoors.length; R._ihd = R.shutDoors.filter((d) => IHOMES[d.id] && d.sill); }
    return R._ihd;
  }
  doors() {
    const out = [];
    for (const reg of REGIONS) {
      if (!this.R?.has(reg) || !this.R.built(reg)) continue;
      for (const d of this.ours(reg) || []) {
        if (EXCEPT.has(d.id)) continue;
        const a = d.ry ?? 0;
        out.push({ region: reg, house: d.id, x: d.sill.x + Math.sin(a) * IN, z: d.sill.z + Math.cos(a) * IN, r: REACH, room: roomOf(d.id) });
      }
    }
    return out;
  }
  exitTo(to) {
    if (typeof to !== 'string' || !to.endsWith('-out')) return null;
    const rid = to.slice(0, -4);
    if (!ROOMS.has(rid)) return null;
    const id = doorOf(rid), reg = regionOf(id), R = this.R?.built(reg);   // (in main.js's probe: an unbuilt region is built first)
    const d = R?.shutDoors?.find((e) => e.id === id);
    if (!d?.sill) return R ? { room: reg, x: R.spawn.x, z: R.spawn.z, a: R.spawn.a } : null;
    const a = d.ry ?? 0;
    return { room: reg, x: d.sill.x + Math.sin(a) * OUT, z: d.sill.z + Math.cos(a) * OUT, a };
  }
  // a region just built: our doors are ours (not the generic "Locked."), and the shut ones carry their sign
  regionBuilt(ids) { for (const id of ids) if (REGIONS.includes(id)) this.mark(id); }
  applyFlags() { for (const reg of REGIONS) if (this.R?.built(reg)) this.mark(reg); }
  mark(reg) {
    const R = this.R.built(reg);
    for (const d of this.ours(reg) || []) {
      d.own = true;
      if (EXCEPT.has(d.id)) signShutDoor(R.group, d, IHOMES[d.id].sign);
    }
  }
  interactables(consider, dist) {
    const g = this.game, rid = g.room?.id;
    if (!rid) return;
    if (ROOMS.has(rid)) { for (const l of IH[rid]?.looks || []) consider(dist(l.at.x, l.at.z), l.r, { kind: 'ihlook', key: l.key, label: 'p_look' }); return; }
    if (!REGIONS.includes(rid)) return;
    const y = g.hero.pos.y;
    for (const d of this.ours(rid) || []) if (EXCEPT.has(d.id) && Math.abs(y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'ihshut', key: IHOMES[d.id].ex, label: 'p_door' });
  }
  interact(it) {
    const g = this.game;
    if (it.kind === 'ihlook') { g.say('n_hero', [t(it.key)], null, g.hero); return true; }
    if (it.kind === 'ihshut') { g.audio.play('doorLocked'); g.say('', [t(it.key)]); return true; }
    return false;
  }
  // ---------------------------------------------------------------- the keepers (defined once their room is built)
  npcDefs() {
    const out = [];
    for (const [id, K] of Object.entries(KEEPERS)) {
      const S = this.R?.built(K.room) && IH[K.room]?.npcSpots?.keeper;
      if (S) out.push({ id, name: 'n_' + id, char: K.char, color: K.color, x: S.x, z: S.z, angle: S.a });
    }
    return out;
  }
  place(id) {
    const K = KEEPERS[id]; if (!K) return undefined;
    const S = IH[K.room]?.npcSpots?.keeper;
    return S ? { x: S.x, z: S.z, a: S.a } : null;
  }
  talkFirst(npc) {
    const id = npc.def.id; if (!KEEPERS[id]) return false;
    const st = lineState(this.story), k = `${id}_${st}`, key = t(k) !== k ? k : `${id}_ord`;
    const n = (npc._ihN = (npc._ihN ?? -1) + 1), more = `${id}_2`;
    this.chain([[id, n % 2 && t(more) !== more ? more : key]]);
    return true;
  }
}
