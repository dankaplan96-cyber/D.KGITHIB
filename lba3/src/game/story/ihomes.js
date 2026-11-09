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
// (WORKPLAN 9.11 Wave C item 5: three doors stand on patches across the clouds, out of reach on foot — Otringal's quay
//  cargo store in the barges' yard, its dock worker's house on the west quay, Mosquibee's honey room on its west islet.
//  No crossing is built for them; where the walk from the island's shuttle toward each one meets the cloud gap, a look
//  says so: FAR_LOOK_R m round that spot on the near shore)
const FAR = { 'otringal-40-43': 'ih_far_yard', 'otringal--49-55': 'ih_far_quay', 'mosquibee--15-28': 'ih_far_islet' }, FAR_LOOK_R = 2.6;

export class IsleHomes extends ChapterBase {
  get R() { return this.game.regions; }
  // a region's shut doors that are ours, by id (once the region is built)
  ours(region) {
    const R = this.R?.built(region);
    if (!R?.shutDoors) return null;
    if (R._ih !== R.shutDoors.length) { R._ih = R.shutDoors.length; R._ihd = R.shutDoors.filter((d) => IHOMES[d.id] && d.sill); }
    return R._ihd;
  }
  // DESERT-BAR: a door that opens with the story (IHOMES `shut`): the reason it is shut now, or null when it leads in.
  //   'storm': the post's bunk cabin while a chapter-4 sandstorm blows (the gate guard waits it out in there: dig.js)
  //   'lamp':  the School's dormitory until the pupils' study crystal is awake (dark inside; purposes.js has the knock)
  shutNow(id) {
    const w = IHOMES[id]?.shut;
    if (w === 'storm') return this.story.cur?.key === 'dig' && this.story.cur.stormy && !this.f.c4_notebook ? 'ih_shut_storm' : null;
    if (w === 'lamp') return this.f.pp_lamp ? null : '';
    return null;
  }
  doors() {
    const out = [];
    for (const reg of REGIONS) {
      if (!this.R?.has(reg) || !this.R.built(reg)) continue;
      for (const d of this.ours(reg) || []) {
        if (EXCEPT.has(d.id) || this.shutNow(d.id) != null) continue;
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
    for (const d of this.ours(rid) || []) {
      if (FAR[d.id]) { const s = this.farSpot(g.room, d); if (s && Math.abs(y - s.y) < 2.5) consider(dist(s.x, s.z), FAR_LOOK_R, { kind: 'ihfar', key: FAR[d.id], label: 'p_look' }); }
      if (Math.abs(y - d.y) >= 1.6) continue;
      if (EXCEPT.has(d.id)) consider(dist(d.x, d.z), 1.6, { kind: 'ihshut', key: IHOMES[d.id].ex, label: 'p_door' });
      else { const k = this.shutNow(d.id); if (k) consider(dist(d.x, d.z), 1.6, { kind: 'ihshut', key: k, label: 'p_door' }); }
    }
  }
  // the near shore across the clouds from a door out of reach (FAR): from the door toward the island's shuttle, past the
  // patch it stands on and the cloud between, the first solid ground, a metre on; null when no gap lies on that line
  farSpot(R, d) {
    if (d._far !== undefined) return d._far;
    const P = this.game.physics, sp = R.spawn, top = d.y + 25, cy = R.cloudY ?? -Infinity;
    const L = Math.hypot(sp.x - d.x, sp.z - d.z), ux = (sp.x - d.x) / L, uz = (sp.z - d.z) / L;
    const solid = (x, z) => { const gy = P.groundAt(x, z, top); return Number.isFinite(gy) && gy > cy + 0.3 ? gy : null; };
    // (the near shore's first level ground: the island's bank rising out of the cloud is no place to stand)
    const level = (x, z, gy) => [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([a, b]) => { const g2 = solid(x + a, z + b); return g2 != null && Math.abs(g2 - gy) < 0.35; });
    let gap = false; d._far = null;
    for (let s = 0.5; s < L; s += 0.25) {
      const x = d.x + ux * s, z = d.z + uz * s, gy = solid(x, z);
      if (gy == null) { gap = true; continue; }
      if (!gap || !level(x, z, gy)) continue;
      const x1 = x + ux * 0.8, z1 = z + uz * 0.8, y1 = solid(x1, z1);
      d._far = { x: x1, z: z1, y: y1 ?? gy };
      break;
    }
    return d._far;
  }
  // (DESERT-BAR: a Desert Island room's own look can follow Kesh's state: <key>_<state>, then <key>_after from chapter 6)
  lookKey(key) {
    const rid = this.game.room?.id, kp = rid && regionOf(doorOf(rid) || '') === 'desert' && this.story.kesh?.open ? this.story.kesh.lifePhase() : null;
    if (!kp) return key;
    const has = (k) => t(k) !== k;
    return has(`${key}_${kp}`) ? `${key}_${kp}` : !['dry', 'wet', 'steam'].includes(kp) && has(`${key}_after`) ? `${key}_after` : key;
  }
  interact(it) {
    const g = this.game;
    if (it.kind === 'ihlook') { g.say('n_hero', [t(this.lookKey(it.key))], null, g.hero); return true; }
    if (it.kind === 'ihshut') { g.audio.play('doorLocked'); g.say('', [t(it.key)]); return true; }
    if (it.kind === 'ihfar') { g.say('n_hero', [t(it.key)], null, g.hero); return true; }
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
    if (K.when && !this.keeperHere(K)) return null;
    const S = IH[K.room]?.npcSpots?.keeper;
    return S ? { x: S.x, z: S.z, a: S.a } : null;
  }
  // DESERT-BAR: a keeper who is only there in some states: Brann, the crew's long-shift driller, in the bunkhouse while the crew works
  // here (chapter 4, chapter 5 until the ferry takes the crew)
  keeperHere(K) {
    if (K.when === 'crew') { const k = this.story.cur?.key; return k === 'dig' || (k === 'steam' && !this.f.c5_ferryTaken); }
    return true;
  }
  talkFirst(npc) {
    const id = npc.def.id; if (!KEEPERS[id]) return false;
    // (Kesh's people follow Kesh's state, story/kesh.js lifePhase: dry · wet · steam · after · evac · net · home; a state
    //  with no line of its own says `after`'s)
    const kp = KEEPERS[id].phase === 'kesh' && this.story.kesh?.lifePhase?.();
    const st = kp || lineState(this.story), k = `${id}_${st}`, key = t(k) !== k ? k : kp && t(`${id}_after`) !== `${id}_after` ? `${id}_after` : `${id}_ord`;
    const n = (npc._ihN = (npc._ihN ?? -1) + 1), more = `${id}_2`;
    this.chain([[id, n % 2 && t(more) !== more ? more : key]]);
    return true;
  }
}
