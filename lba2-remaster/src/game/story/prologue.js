// LBA3 – "The Awakening", prologue (fan continuation, original story).
//
// Twelve years after LBA2. The square's well has stopped giving water.
// Zoe sends Twinsen to look; on the way: a water-bill quarrel (the key),
// an Esmer trader who can't get a permit (the rope) and a kid who threw
// something into the well (optional, overheard in Discreet mode).
// At the bottom: warm water, crystals that weren't there before, and the
// magic ball pulled toward the wall. Then Sendell speaks.
import * as THREE from 'three';
import { POI } from '../world.js';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { playOpening } from './opening.js';
import { lba1EnemyDefs } from '../lba1places.js';

const V = POI.village;
const _pullTmp = new THREE.Vector3(), _handTmp = new THREE.Vector3(); // (Sendell's pull, no per-frame allocation)

export class Prologue extends ChapterBase {
  constructor(story) {
    super(story);
    this.tremorT = 50;
  }

  // ---------------------------------------------------------------- actors
  npcDefs() {
    const W = this.game.world, R = this.game.rooms;
    const well = W.well;
    const kids = { x: V.x - 7, z: V.z + 8 };
    return [
      { id: 'zoe', name: 'n_zoe', char: 'zoe', color: '#ffb0d0', ...R.house.npcSpots.zoe, angle: R.house.npcSpots.zoe.a, look: { tunic: '#3f9a6a', robe: '#3f9a6a', hair: '#8a3a1a', ponytail: true, skin: '#f0c49b' } },
      // (ARTHUR-12: twelve; his model and size are LOOKS.arthur's — `look` is only the fallback palette — and his own
      // pose is at his boat, as place() puts him: the small boy's 0.62 scale and 'hide' crouch are gone)
      { id: 'arthur', name: 'n_arthur', char: 'arthur', color: '#ffe070', ...R.house.npcSpots.arthur, angle: R.house.npcSpots.arthur.a, look: { tunic: '#2a66d9', pants: '#f2ead6', hair: '#6a3a1a' }, anim: 'kneelWork' },
      { id: 'gilbert', name: 'n_gilbert', char: 'gilbert', color: '#ffb070', x: well.x + 2.4, z: well.z + 1.6, angle: Math.atan2(-1.2, 1.3), look: { tunic: '#b8483b', pants: '#5a4a3a', hair: '#c0c0c0', beard: '#c0c0c0', skin: '#e6b993' }, anim: 'talk' },
      { id: 'mira', name: 'n_mira', char: 'mira', color: '#d8a8ff', x: well.x + 1.2, z: well.z + 2.9, angle: Math.atan2(1.2, -1.3), look: { tunic: '#3b5bb8', pants: '#3b5bb8', ears: '#f4e9dc', skin: '#f4e9dc', hair: '#f4e9dc', apron: '#dfe6f5' }, anim: 'talk' },
      { id: 'pippa', name: 'n_pippa', char: 'pippa', color: '#ffb070', x: W.stall.x, z: W.stall.z, angle: W.stall.a, look: { tunic: '#e58a3a', pants: '#6a4a8a', ears: '#f4e9dc', apron: '#ffffff', skin: '#f4e9dc', hair: '#f4e9dc' } },
      { id: 'doran', name: 'n_doran', char: 'doran', color: '#8fd3ff', x: W.pierStart.x, z: W.pierStart.z + 2.2, angle: Math.PI, look: { tunic: '#2f8a6a', pants: '#3a4a6a', hat: '#d8b94a', trunk: true, skin: '#8fa3b8', hair: '#8fa3b8', scale: 1.15 }, anim: 'hide' },
      { id: 'xil', name: 'n_xil', char: 'xil', color: '#9fffc8', x: W.pierEnd.x + 3.1, z: W.pierEnd.z - 0.65, angle: Math.PI / 2 + 0.3, look: { tunic: '#6a3a9a', robe: '#6a3a9a', skin: '#7fc8a8', hair: '#7fc8a8', scale: 1.12 } },
      { id: 'tim', name: 'n_tim', char: 'tim', color: '#ffd27a', x: kids.x, z: kids.z, angle: Math.PI / 2, look: { tunic: '#e0c03a', pants: '#3a5a9a', scale: 0.7, hair: '#c06a2a' }, anim: 'talk' },
      { id: 'lulu', name: 'n_lulu', char: 'lulu', color: '#ff9ad0', x: kids.x + 1.3, z: kids.z, angle: -Math.PI / 2, look: { tunic: '#e05a9a', robe: '#e05a9a', scale: 0.66, hair: '#2a1a10' } },
      // Joe the Elf, Twinsen's old friend from LBA2, by the square (he only chats: baseTalk's idle_joe lines)
      { id: 'joe', name: 'n_joe', char: 'joe', color: '#9fe89a', x: V.x + 6.5, z: V.z - 7.5, angle: -2.4 },
      // LBA1's Spheros, back on Citadel (looks sphero1/sphero2): Pom by the square, Madam Rondo with her poodle
      { id: 'sphero1', name: 'n_sphero1', char: 'sphero1', color: '#9fe0a0', x: V.x + 2, z: V.z + 10, angle: Math.PI },
      { id: 'sphero2', name: 'n_sphero2', char: 'sphero2', color: '#e8c890', x: V.x + 8, z: V.z - 3.5, angle: -Math.PI / 2 },
      // Twinsun's wizards (src/game/wizards.js): Bersimon in his tent; the rector and Ker'aooc at the School of Magic
      { id: 'bersimon', name: 'n_bersimon', char: 'bersimon', color: '#7fe0e8', ...(R.wtent?.npcSpots?.bersimon || { x: 0, z: 0, a: 0, pending: true }), angle: R.wtent?.npcSpots?.bersimon?.a ?? 0 },
      { id: 'magus', name: 'n_magus', char: 'magus', color: '#9fc8ff', ...(R.school?.npcSpots?.magus || { x: 0, z: 0, a: 0, pending: true }), angle: R.school?.npcSpots?.magus?.a ?? 0 },
      { id: 'keraooc', name: 'n_keraooc', char: 'keraooc', color: '#b0e0ff', ...(R.school?.npcSpots?.keraooc || { x: 0, z: 0, a: 0, pending: true }), angle: R.school?.npcSpots?.keraooc?.a ?? 0 },
    ];
  }

  enemyDefs() {
    // (and LBA1's places, open in every chapter: src/game/lba1places.js)
    return (this.game.rooms.well?.mites || []).map((p, i) => ({ id: 'mite' + i, kind: 'mite', ...p })).concat(lba1EnemyDefs(this.game.rooms));
  }

  // Esmer cargo on the pier, stamped with the energy project's emblem
  decorate() {
    if (!this.once('citadel')) return;
    const W = this.game.world, scene = W.root;
    const e = W.pierEnd;
    const crate = new THREE.MeshStandardMaterial({ color: '#5a6a80', roughness: 0.5, metalness: 0.4 });
    const emblem = new THREE.MeshStandardMaterial({ color: '#7fe8ff', emissive: '#2ab0e0', emissiveIntensity: 1.5 });
    for (const [dx, dz, s] of [[0.9, 0.85, 1], [0.9, -0.55, 0.8], [1.9, 0.25, 0.9]]) { // (at the very end of the pier, clear of the project lift)
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crate);
      m.position.set(e.x + dx, e.y + s / 2, e.z + dz); m.castShadow = true; scene.add(m);
      const em = new THREE.Mesh(new THREE.CircleGeometry(s * 0.25, 6), emblem);
      em.position.set(e.x + dx, e.y + s / 2, e.z + dz + s / 2 + 0.01); scene.add(em);
      W.physics.add({ type: 'box', x: e.x + dx, z: e.z + dz, hw: s / 2, hd: s / 2, rot: 0, top: e.y + s, seeThrough: true });
    }
    // harbour master's shed
    const s = W.pierStart;
    const g = W.H(s.x, s.z + 4);
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2), new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 0.9 }));
    shed.position.set(s.x, g + 1.2, s.z + 4.4); shed.castShadow = true; scene.add(shed);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2.4), new THREE.MeshStandardMaterial({ color: '#2f6fb0' }));
    roof.position.set(s.x, g + 2.5, s.z + 4.4); roof.rotation.x = 0.12; scene.add(roof);
    W.physics.add({ type: 'box', x: s.x, z: s.z + 4.4, hw: 1.3, hd: 1, rot: 0, top: g + 3 });
  }

  // ---------------------------------------------------------------- flow
  // A new game opens with the in-engine opening (opening.js); it ends in the house with control and the
  // first objective. `?nocine` (developers, tests) goes straight to that end state.
  start() {
    const g = this.game;
    if (new URLSearchParams(location.search).has('nocine')) {
      g.enterRoom('house', null, true, true);
      const end = g.rooms.house.npcSpots.twinsen;
      g.hero.pos.set(end.x + 2.0, 0, end.z - 1.5);
      g.hero.angle = Math.atan2(-1, 0.25);
      this.afterOpening();
      return;
    }
    this.opening = playOpening(this.story);
    this.opening.start();
  }
  // the end state of the opening (played or skipped): where everyone is, the flags, control, objective, save
  afterOpening() {
    const g = this.game, f = this.f;
    f.intro = true; f.opening = true;
    if (!this.game.hero.hasBall) f.ballHint = true; // (Zoé said "Take your magic ball": the objective shows that step)
    this.opening = null;
    this.story.refreshCast();
    g.hud.show(true);
    document.querySelector('#touch')?.classList.toggle('hidden', !g.touch);
    g.camRig.cine = false;
    g.camRig.override = null;
    g.setState('play');
    // (the first goal comes up in the objective panel for a few seconds as control comes back, in either HUD: CLAR-2)
    g.updateObjective();
    g.audio.setMood('home');
    g.save(false);
  }
  // while the prologue runs after the opening: Zoé went next door (the neighbours' house), Arthur is at his boat
  // (for later chapters this is the family's default: at home; a chapter that wants them elsewhere says so)
  place(id) {
    const f = this.f, g = this.game;
    if (id !== 'zoe' && id !== 'arthur') return undefined;
    const home = g.rooms.house.npcSpots[id];
    if (id === 'arthur') return { x: home.x, z: home.z, a: home.a, anim: 'kneelWork' };
    if (f.opening && !f.prologueDone && this.isCur()) {
      const hs = g.world.houses.find((h) => h.id === 'nbr') || g.world.houses.find((h) => h.id === 'water');
      return { x: hs.door.x + Math.sin(hs.ry) * 1.1, z: hs.door.z + Math.cos(hs.ry) * 1.1, a: hs.ry + Math.PI, anim: 'idle' };
    }
    return { x: home.x, z: home.z, a: home.a, anim: null };
  }

  items() {
    const f = this.f, out = [];
    if (f.key && !f.prologueDone) out.push({ id: 'lidkey', icon: 'key' });
    if (f.stamp && !f.rope) out.push({ id: 'stamp', icon: 'stamp' });
    if (f.rope && !f.inWell) out.push({ id: 'rope', icon: 'rope' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'pr_j_well', done: !!f.wellSeen },
      { key: 'pr_j_key', done: !!f.key },
      { key: 'pr_j_rope', done: !!f.rope },
      { key: 'pr_j_cave', done: !!f.inWell },
      { key: 'pr_j_sendell', done: !!f.sendellHeard },
    ].filter((l, i, a) => i === 0 || a[i - 1].done || l.done);
  }
  objective() {
    const f = this.f, h = this.game.hero;
    const s = (ok, key) => `<span class="s ${ok ? 'ok' : ''}">◆ ${t(key)}</span>`;
    if (f.prologueDone) return `<b>${t('pr_obj_done')}</b>`;
    if (!h.hasBall) return `<b>${t('pr_obj_well')}</b>` + (f.ballHint ? s(false, 'pr_obj_ball') : '');
    if (f.inWell) return `<b>${t('pr_obj_cave')}</b>` + (f.nodes >= 3 ? '' : s(false, 'pr_obj_nodes'));
    if (!f.wellSeen) return `<b>${t('pr_obj_well')}</b>`;
    return `<b>${t('pr_obj_descend')}</b>` + s(f.key, 'pr_obj_key') + s(f.rope, 'pr_obj_rope') + s(f.timConfessed, 'pr_obj_tim');
  }

  markers() {
    const f = this.f, g = this.game, m = [];
    const gold = '#ffcf4a';
    const npc = (id) => g.npcs.find((n) => n.def.id === id);
    if (!g.hero.hasBall) return m;
    if (!f.inWell && !f.prologueDone) m.push({ x: g.world.well.x, z: g.world.well.z, kind: 'star', color: gold, r: 8, edge: true, label: t('pr_map_well') });
    if (f.wellSeen && !f.key) { const n = npc('mira'); m.push({ x: n.pos.x, z: n.pos.z, kind: 'star', color: gold, r: 6, edge: true }); }
    if (f.wellSeen && !f.rope) { const n = npc(f.metXil && !f.stamp ? 'doran' : 'xil'); m.push({ x: n.pos.x, z: n.pos.z, kind: 'star', color: gold, r: 6, edge: true, label: t(f.metXil && !f.stamp ? 'n_doran' : 'n_xil') }); }
    return m;
  }

  // outdoor doors you can walk into
  doors() {
    const d = this.game.world.houses[0].door;
    return [{ x: d.x, z: d.z, r: 0.9, room: 'house' }];
  }

  // where an interior exit leads
  exitTo(to) {
    const W = this.game.world;
    if (to === 'outdoor') {
      const h = W.houses[0];
      return { x: h.door.x + Math.sin(h.ry) * 1.4, z: h.door.z + Math.cos(h.ry) * 1.4, a: h.ry };
    }
    return { x: W.well.x + 1.8, z: W.well.z - 1.6, a: 0 };
  }

  // can the player leave this room yet?
  canExit(room) {
    if (room.id === 'house' && !this.game.hero.hasBall) {
      this.chain([['hero', 'pr_tw_ballfirst']], () => { this.f.ballHint = true; this.game.updateObjective(); });
      return false;
    }
    return true;
  }

  // world interactions that exist in every chapter (called by the director)
  baseInteractables(consider, dist, cur) {
    const g = this.game, W = g.world;
    if (!g.room) {
      const open = new Set(cur.doors().map((d) => d.house));
      W.houses.forEach((h, i) => { if (i > 0 && !open.has(h.id)) consider(dist(h.door.x, h.door.z), 1.6, { kind: 'locked', label: 'p_door' }); });
      // (WORLD-80: the original's other doors, shut: the islet's dome, the plateau's, the passage's two ends; only
      // from the door's own level, not from the slope above it)
      for (const d of W.shutDoors || []) if (Math.abs(g.hero.pos.y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'shut', label: 'p_door' });
      if (!W.chest.open) consider(dist(W.chest.x, W.chest.z), 2.2, { kind: 'chest', label: 'p_open' });
    } else {
      for (const s of g.room.searches) if (!g.searched.includes(s.id)) consider(dist(s.x, s.z), s.r, { kind: 'roomsearch', spot: s, label: 'p_search' });
      // (WORLD-80 step 3: an outdoor region's shut doors, Desert Island's old places: desertold.js)
      for (const d of g.room.shutDoors || []) if (Math.abs(g.hero.pos.y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'shut', label: 'p_door' });
    }
  }
  interactables(consider, dist) {
    const g = this.game, W = g.world;
    if (!g.room) {
      consider(dist(W.well.x, W.well.z), 2.6, { kind: 'well', label: 'p_well' });
      consider(dist(W.gate.x, W.gate.z), 3.0, { kind: 'fortgate', label: 'p_gate' });
    }
  }

  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'roomsearch':
        if (it.spot.id === 'asylum_register') {   // FunFrock's asylum (LBA1): the old register in the office
          g.searched.push(it.spot.id); g.audio.play('chest');
          this.chain([['hero', 'asy_register1'], ['hero', 'asy_register2']], () => { h.clovers = Math.min(9, h.clovers + 1); g.hud.toast('toast_clover_found'); g.save(false); });
          return true;
        }
        if (it.spot.id !== 'cupboard') return false;
        g.searched.push(it.spot.id);
        g.audio.play('chest');
        h.hasBall = true;
        g.say('n_hero', t('pr_cupboard'), () => { g.hud.toast('pr_toast_ball', { ball: g.hud.key('ball'), map: g.hud.key('map') }); g.updateObjective(); g.save(false); }, h);
        return true;
      case 'well':
        if (f.prologueDone) { g.say('n_hero', t('pr_well_after'), null, h); return true; }
        if (!f.wellSeen) { f.wellSeen = true; g.updateObjective(); }
        if (!f.key) { g.say('n_hero', t('pr_well_locked'), () => g.updateObjective(), h); return true; }
        if (!f.rope) { g.say('n_hero', t('pr_well_rope'), () => g.updateObjective(), h); return true; }
        g.say('n_hero', t('pr_well_go'), () => { g.audio.play('door'); g.enterRoom('well'); }, h);
        return true;
      case 'fortgate':
        g.audio.play('deny');
        g.say('', [t('pr_fort')]);
        return true;
    }
    return false;
  }

  baseInteract(it) {
    const g = this.game, f = this.f, h = g.hero;
    switch (it.kind) {
      case 'locked':
        g.say('n_hero', t('pr_locked'), null, h);
        return true;
      case 'shut':
        g.audio.play('deny');
        g.say('', [t('w_door_shut')]);
        return true;
      case 'chest':
        g.world.chest.open = true;
        f.chest = true;
        g.audio.play('chest');
        for (let i = 0; i < 8; i++) g.pickups.spawn('coin', g.world.chest.x, g.physics.groundAt(g.world.chest.x, g.world.chest.z) + 1.2, g.world.chest.z, { pop: true });
        g.say('', [t('pr_chest')]);
        return true;
      case 'roomsearch':
        g.searched.push(it.spot.id);
        g.audio.play('chest');
        if (it.spot.reward) g.pickups.spawn(it.spot.reward, it.spot.x, g.physics.groundAt(it.spot.x, it.spot.z) + 1, it.spot.z, { pop: true });
        else g.say('n_hero', t('gen_search_nothing'), null, h);
        return true;
    }
    return false;
  }
  // an NPC the current chapter has nothing special for
  baseTalk(npc) {
    const id = npc.def.id;
    if (id === 'pippa') return this.chain([['pippa', 'pr_pippa']], () => this.game.openShop());
    // the Weather Wizard tops up Twinsen's magic, the healing wizard his life (LBA2's Ker'aooc "treats everybody")
    const h = this.game.hero;
    if (id === 'bersimon' && h.mp < h.mpMax) { h.mp = h.mpMax; this.game.audio.play('heal'); this.game.hud.toast('wz_toast_magic'); }
    if (id === 'keraooc' && h.hp < h.maxHp) { h.hp = h.maxHp; this.game.audio.play('heal'); this.game.hud.toast('wz_toast_heal'); }
    const key = 'idle_' + id + '_' + this.story.cur.key, own = 'idle_' + id;
    if (t(key) === key && Array.isArray(t(own))) { const all = t(own); return this.game.say('n_' + id, [all[Math.floor(Math.random() * all.length)]]); }
    this.chain([[id, t(key) !== key ? key : 'idle_generic']]);
  }

  talk(npc) {
    const g = this.game, f = this.f, h = g.hero;
    const id = npc.def.id;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    switch (id) {
      case 'zoe':
        if (f.prologueDone) return c([['zoe', 'pr_zoe_after']]);
        if (f.opening && !f.zoeNext && !g.room) return c([['zoe', 'pr_zoe_next']], () => { f.zoeNext = true; });
        return c([['zoe', h.hasBall ? 'pr_zoe_go' : 'pr_zoe_ball']]);
      case 'arthur':
        return c([['arthur', f.prologueDone ? 'pr_ar_after' : 'pr_ar_hint']]);
      case 'gilbert': case 'mira':
        if (!f.key) {
          return c([['gilbert', 'pr_gil_1'], ['mira', 'pr_mira_1'], ['gilbert', 'pr_gil_2'], ['hero', 'pr_tw_well'], ['mira', 'pr_mira_2'], ['gilbert', 'pr_gil_3']], () => {
            f.key = true; f.wellSeen = true; h.hasKey = true; g.hud.toast('pr_toast_key'); g.audio.play('chest'); g.updateObjective(); g.save(false);
          });
        }
        return c([[id, id === 'gilbert' ? 'pr_gil_wait' : 'pr_mira_wait']]);
      case 'xil':
        if (f.rope) return c([['xil', 'pr_xil_after']]);
        if (f.stamp) {
          return c([['xil', 'pr_xil_3'], ['xil', 'pr_xil_4']], () => {
            f.rope = true; f.wellSeen = true; g.hud.toast('pr_toast_rope'); g.audio.play('chest'); g.updateObjective(); g.save(false);
          });
        }
        return c([['xil', 'pr_xil_1'], ['xil', 'pr_xil_2'], ['hero', 'pr_tw_xil']], () => { f.metXil = true; g.updateObjective(); });
      case 'doran':
        if (f.stamp) return c([['doran', 'pr_doran_after']]);
        if (!f.metXil) return c([['doran', 'pr_doran_snore'], ['hero', 'pr_tw_snore']]);
        npc.forceAnim = null;
        return c([['doran', 'pr_doran_1'], ['hero', 'pr_tw_doran'], ['doran', 'pr_doran_2'], ['doran', 'pr_doran_3']], () => {
          f.stamp = true; g.hud.toast('pr_toast_stamp'); g.audio.play('select'); g.updateObjective();
        });
      case 'tim': case 'lulu':
        if (f.timConfessed) return c([[id, id === 'tim' ? 'pr_tim_after' : 'pr_lulu_after']]);
        if (f.overheard) {
          return c([['hero', 'pr_tw_tim'], ['tim', 'pr_tim_3'], ['tim', 'pr_tim_4'], ['hero', 'pr_tw_tim2']], () => {
            f.timConfessed = true;
            g.pickups.spawn('clover', npc.pos.x, npc.pos.y + 1, npc.pos.z, { pop: true });
            g.updateObjective(); g.save(false);
          });
        }
        f.kidsAsked = true;
        return c([['tim', 'pr_tim_1'], ['lulu', 'pr_lulu_1'], ['hero', 'pr_tw_kids']]);
      case 'pippa':
        this.chain([['pippa', 'pr_pippa']], () => g.openShop());
        return true;
    }
    return false;
  }

  onEnterRoom(id) {
    const g = this.game, f = this.f;
    if (id === 'well') {
      g.audio.setMood('storm');
      if (!f.inWell) {
        f.inWell = true;
        f.nodes = 0;
        g.updateObjective();
        this.chain([['hero', 'pr_cave_1'], ['hero', 'pr_cave_2']], () => g.save(false));
      }
    }
  }
  onExitRoom(id) {
  }

  // restore world state from saved flags
  applyFlags() {
    const g = this.game, f = this.f;
    if (f.chest) { g.world.chest.open = true; g.world.chest.openT = 1; }
    g.hero.hasKey = !!f.key;
    const R = g.rooms.well;
    if (f.nodes) R.nodes.slice(0, f.nodes).forEach((n) => this.lightNode(n, true));
    if (f.nodes >= 3) this.openBarrier(true);
  }

  lightNode(n, silent = false) {
    // (the node's own look — the flash, the ring over the floor, the glow and its light — is the well room's updater,
    // interiors.js: it reads `lit` and `quiet`; a node restored from a save is awake at once, with no flash)
    n.lit = true; n.quiet = silent;
    if (silent) return;
    const g = this.game;
    this.f.nodes = (this.f.nodes || 0) + 1;
    g.audio.play('heal');
    g.particles.burst(n.x, n.y, n.z, '#bff8ff', 26, 4);   // (sparks: a bright core and a wider cyan spray)
    g.particles.burst(n.x, n.y, n.z, '#ffffff', 10, 6.5);
    g.hud.toast('pr_toast_node', { n: this.f.nodes });
    g.updateObjective();
    if (this.f.nodes >= 3) this.barrierT = 0.7;
  }

  openBarrier(silent = false) {
    const g = this.game, B = g.rooms.well.barrier;
    B.group.visible = false;
    B.c.enabled = false;
    if (silent) return;
    g.audio.play('break'); g.audio.play('rumble');
    g.camRig.shake(0.6);
    const p = B.c;
    g.particles.burst(p.x, 1.5, p.z, '#bff8ff', 60, 6);
    g.updateObjective();
    g.save(false);
  }

  ballHit(p) {
    const g = this.game;
    if (g.room !== g.rooms.well) return false;
    for (const tg of g.room.ballTargets) {
      if (!tg.node.lit && Math.hypot(p.x - tg.x, p.y - tg.y, p.z - tg.z) < tg.r) { this.lightNode(tg.node); return true; }
    }
    return false;
  }

  // Sendell's call: the ball is pulled into the crystal vein.
  //  0.00–0.52  Twinsen's throw winds up (the rig's 'throw': the ball held high behind the head, in his hand), the ball
  //             trembling and brightening as the vein calls it;
  //  0.52       the whip: the ball leaves the hand (it is pulled out of it, not thrown: it takes up the hand's own
  //             path first and is drawn off it over 0.2 s, so nothing snaps);
  //  0.52–1.80  an eased flight to the vein, on a rising arc with a small spiral, trail and halo all along;
  //  1.80–2.25  it sinks into the crystal: a flash and a ring where it goes in, then it shrinks and dims away to nothing.
  // (every phase is on the clock `cut`, so 30 and 60 fps play the same; the words start at 2.6)
  startSendell() {
    const g = this.game, h = g.hero, R = g.rooms.well;
    this.f.sendellHeard = true;
    g.setState('cutscene');
    g.cutscene = (dt) => this.updateSendell(dt);
    this.cut = 0; this.spoke = false; this.absorbed = false; this.released = false;
    g.ball.state = 'held';
    g.ball.holder = h;
    g.ball.mesh.visible = true;
    g.ball.track = true; g.ball.sn = 0; g.ball.span = 0.9; // (a slow pull: a longer trail, so the path reads)
    g.ball.mesh.scale.setScalar(1);
    g.ball.followHand();
    g.audio.play('rumble');
    this.veinTarget = new THREE.Vector3(R.vein.x + 0.3, R.vein.y + 0.3, R.vein.z - 0.7);
    g.audio.cue('revelation');
  }
  updateSendell(dt) {
    const g = this.game, h = g.hero, R = g.rooms.well, B = g.ball;
    this.cut += dt;
    const c = this.cut, T_REL = 0.52, T_FLY = 1.28, T_IN = T_REL + T_FLY, T_SINK = 0.45;
    const ease = (k) => k * k * (3 - 2 * k);
    h.angle = Math.atan2(R.vein.x - h.pos.x, R.vein.z - h.pos.z);
    h.rig.play(c < 1.2 ? 'throw' : 'idle');
    h.rig.update(dt, 0); h.sync();
    if (!this.released) {
      // in the hand, as it winds up: a tremble and a brightening
      B.followHand();
      this.handPos ??= new THREE.Vector3();
      this.handPos.copy(B.mesh.position);
      const w = Math.min(1, c / T_REL);
      B.mesh.position.x += Math.sin(c * 47) * 0.012 * w; B.mesh.position.y += Math.sin(c * 39) * 0.012 * w;
      B.mesh.scale.setScalar(1 + w * 0.3);
      B.mat.emissiveIntensity = 2.5 + w * 3;
      R.vein.power = w * 0.35;
      if (c >= T_REL) { this.released = true; this.p0 = this.handPos.clone(); B.flash(this.p0.x, this.p0.y, this.p0.z, 0.45, false); }
    }
    if (this.released && !this.absorbed) {
      const k = Math.min(1, (c - T_REL) / T_FLY), e = ease(k);
      const p = _pullTmp.copy(this.p0).lerp(this.veinTarget, e);
      p.y += Math.sin(k * Math.PI) * 0.7;                                   // (a rising arc)
      const sp = Math.sin(k * Math.PI * 2.5) * 0.22 * (1 - k);              // (a small spiral that dies away as it nears the wall)
      p.x += Math.cos(k * 3) * sp * 0.4; p.z += sp; p.y += Math.sin(k * Math.PI * 2.5 + 1.2) * 0.12 * (1 - k);
      // the first fifth of a second still carries the hand's own path: it is drawn off the hand, not cut loose from it
      const hand = _handTmp;
      B.followHand(); hand.copy(B.mesh.position);
      const j = ease(Math.min(1, (c - T_REL) / 0.2));
      B.mesh.position.copy(hand).lerp(p, j);
      B.mesh.scale.setScalar(1.3 - 0.15 * e);
      B.mat.emissiveIntensity = 5.5 + e * 3;
      R.vein.power = 0.35 + e * 0.5;
      g.camRig.shake(0.05 * Math.sin(k * Math.PI));
      if (c >= T_IN) { this.absorbed = true; this.landPos = B.mesh.position.clone(); B.flash(this.landPos.x, this.landPos.y, this.landPos.z, 2.2); g.camRig.shake(0.3); g.audio.play('heal'); }
    }
    if (this.absorbed) {
      // into the crystal: it goes a little further in as it shrinks and dims, the vein flaring as it takes it
      const k = Math.min(1, (c - T_IN) / T_SINK), e = ease(k);
      B.mesh.position.copy(this.landPos); B.mesh.position.z -= 0.35 * e;
      B.mesh.scale.setScalar(Math.max(0.001, 1.15 * (1 - e)));
      B.mat.emissiveIntensity = 8 * (1 - e * 0.6);
      R.vein.power = 0.85 + 0.7 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - 0.4 * k);
      if (k >= 1 && B.mesh.visible) { B.mesh.visible = false; B.track = false; B.span = 0.4; }
    }
    if (c > 2.6 && !this.spoke) {
      this.spoke = true;
      g.cutscene = null;
      this.chain([['hero', 'pr_tw_ball'], ['sendell', 'pr_sendell_1'], ['hero', 'pr_tw_sendell'], ['sendell', 'pr_sendell_2']], () => this.endPrologue());
    }
  }
  endPrologue() {
    const g = this.game;
    this.f.prologueDone = true;
    g.ball.state = 'idle';
    g.ball.mesh.visible = false; g.ball.track = false; g.ball.span = 0.4; g.ball.mesh.scale.setScalar(1);
    g.rooms.well.vein.power = 0;
    g.audio.play('victory');
    // on to chapter 1: fade out of the cave, title card, morning in the square
    g.startTransition(() => this.story.nextChapter(), this.story.nextAreas());
  }
  afterEnding() {
    // back to the surface, the ball returns home
    const g = this.game;
    g.exitRoom(this.exitTo('outdoor-well'));
  }

  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    if (this.barrierT > 0 && (this.barrierT -= dt) <= 0) this.openBarrier();
    // overhearing the kids (Discreet mode, close and quiet)
    if (!g.room && !f.overheard && h.behaviour === 'discreet') {
      const tim = this.speaker('tim');
      if (tim && h.distTo(tim) < 3.6) {
        f.overheard = true;
        this.chain([['lulu', 'pr_lulu_2'], ['tim', 'pr_tim_2a'], ['tim', 'pr_tim_2b'], ['lulu', 'pr_lulu_3']], () => g.updateObjective());
        return;
      }
    }
    // tremors once the story has started (outdoors)
    if (f.intro && !g.room && h.hasBall) {
      this.tremorT -= dt;
      if (this.tremorT <= 0) {
        this.tremorT = 55 + Math.random() * 40;
        g.camRig.shake(0.7);
        g.audio.play('rumble');
        g.particles.burst(h.pos.x, h.pos.y + 0.2, h.pos.z, '#c8b48a', 20, 3);
        // (felt and heard; said in words only for a player who turned the camera shake off)
        if (!f.tremorSeen) { f.tremorSeen = true; if (g.settings?.shake === 'off') g.hud.toast('pr_toast_tremor'); }
      }
    }
    // reaching the vein
    if (g.room === g.rooms.well && !f.sendellHeard && f.nodes >= 3) {
      if (h.pos.x > g.room.chamberX) this.startSendell();
    }
  }
}
