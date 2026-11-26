// ASYLUM-2, the story's part (the cloud's answer in tools/testlab/WORLD_ART_REQUESTS.md): FunFrock's old asylum is
// officially the Joint Project's hostel for its Esmer workers, and behind it Vesk's hidden store. The place and its
// handles are the laptop's (src/game/asylumhostel.js: R.npcSpots, R.asylumHostel); this writes who is there, what they
// say, the finds and the chapter states. Not a chapter: the director (index.js) asks it as it asks the sewers.
//
//   Phases (hostelPhase, from the chapter; nothing of it saved):
//     v  chapters 1–2   the hostel lived in (the foreman, the cook, four workers off shift, a sleeper); the store full
//                       and guarded by two of Vesk's guards (lba1places.js lba1EnemyDefs); his office locked
//     u  chapters 3–7   Vesk gone: the store cleared (crates, the humming crate, the guard posts), his office open,
//                       the workers still there, uneasy
//     s  chapter 8      the hostel one of the town's shelters (the workers' lines; the evacuation's own shelters are
//                       story/shelters.js)
//     l  chapter 9 on   and the epilogue: the workers, calmer
//   The finds (flags hs_, saved with the game):
//     hs_crate   the humming crate behind the boiler (phase v): Arthur's pocket set held out leads to it (kit2.js hums);
//                crystals stamped ZEELICH and Vesk's office key (hs_key)
//     hs_door    his office unlocked with the key (phase v); open anyway from phase u
//     hs_notes   his notebook on the desk: why he chose the sealed asylum; the strongbox beside it (hs_box: 20 kashes)
//     hs_plaque, hs_cell   the Council's plaque at the old bricking, the brass plaque at Twinsen's cell (looks)
//   The cook gives a bowl of soup (a full heal) once a visit when Twinsen is hurt.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/hostel.js';

const HS_IDS = ['foreman', 'cook', 'worker1', 'worker2', 'worker3', 'worker4', 'sleeper'];
const CHARS = { foreman: 'ztri1', cook: 'zmole2', worker1: 'zbee1', worker2: 'ztri2', worker3: 'zmole1', worker4: 'oku_b', sleeper: 'zbee2' };
const COLORS = { foreman: '#c8e0a0', cook: '#f0c0a0', worker1: '#f0d070', worker2: '#a8d8f0', worker3: '#d0c0e8', worker4: '#e0d0b0', sleeper: '#f0a0a0' };
const BOX_KASHES = 20;

// the hostel's state of the story (by the chapter in progress)
export function hostelPhase(S) {
  const i = S?.index ?? 0, k = S?.cur?.key;
  if (i <= 1) return 'v';
  if (k === 'evacuation') return 's';
  if (i < S.chapters.findIndex((c) => c.key === 'evacuation')) return 'u';
  return 'l';
}

export class HostelLife extends ChapterBase {
  get R() { return this.game.regions ? this.game.regions.built('asylum') : this.game.rooms?.asylum; }   // (never builds)
  get H() { return this.R?.asylumHostel; }
  phase() { return hostelPhase(this.story); }
  here() { return this.game.room?.id === 'asylum'; }
  able() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }

  // ---------------------------------------------------------------- the people (on the laptop's R.npcSpots)
  npcDefs() {
    const S = this.R?.npcSpots;
    return HS_IDS.map((k) => {
      const s = S?.[k], id = 'hs_' + k;
      const base = { id, name: 'n_' + id, char: CHARS[k], color: COLORS[k], ...(k === 'sleeper' ? { noTalk: true } : {}) };
      return s ? { ...base, x: s.x, z: s.z, angle: s.a, anim: this.pose(s) } : { ...base, x: 0, z: 0, angle: 0, pending: true };
    });
  }
  pose(s) { return s.pose === 'sit' ? 'sit' : s.pose === 'lie' ? 'sleep' : null; }
  place(id) {
    if (!id.startsWith('hs_')) return undefined;
    const s = this.R?.npcSpots?.[id.slice(3)];
    if (!s) return undefined;   // (the asylum not built yet: he waits hidden, Game.addActors)
    const pin = s.pose === 'sit' || s.pose === 'lie';
    return { x: s.x, y: s.y, z: s.z, a: s.a, anim: this.pose(s), pin };
  }

  // ---------------------------------------------------------------- state → world
  applyFlags() { this.applyWorld(!this.here()); }
  regionBuilt(ids) { if (ids.includes('asylum')) this.applyWorld(!this.here()); }
  onEnterRoom(id) { if (id === 'asylum') { this.fed = false; this.applyWorld(true); } }
  // the store cleared after chapter 2; his office shut in chapters 1–2 until the key opens it (shut only with Twinsen
  // out of the room: `door`), open after
  applyWorld(door) {
    const H = this.H, f = this.f;
    if (!H) return;
    const v = this.phase() === 'v';
    H.store?.setCleared?.(!v, true);
    H.hum?.setOn?.(v && !f.hs_crate);
    const open = !v || !!f.hs_door;
    if (door || open) H.veskOffice?.door?.setOpen?.(open, true);
  }
  // the humming crate, for the pocket set (kit2.js hums)
  hums() {
    const s = this.H?.spots?.hiddenCrate;
    return s && this.phase() === 'v' && !this.f.hs_crate ? [{ id: 'hs_crate', room: 'asylum', x: s.x, y: s.y ?? 0, z: s.z }] : [];
  }
  journal() {
    const f = this.f;
    return [
      { key: 'hs_j_crate', done: !!f.hs_crate, show: !!f.hs_heard || !!f.hs_crate },
      { key: 'hs_j_notes', done: !!f.hs_notes, show: !!f.hs_crate || !!f.hs_notes },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }
  items() { return this.f.hs_crate && !this.f.hs_door && this.phase() === 'v' ? [{ id: 'hs_key', icon: 'key' }] : []; }

  // ---------------------------------------------------------------- places
  // Vesk's office door (lba1 cells 41–43 of the corridor wall z 30; the corridor is the z > 30.5 side)
  doorSpot() { const R = this.R; if (!R?.cell) return null; const c = R.cell(42, 5, 31.3); return { x: c.x, z: c.z, y: this.game.physics.groundAt(c.x, c.z, c.y + 0.7) }; }
  interactables(consider, dist) {
    if (!this.here() || !this.able() || !this.H) return;
    const g = this.game, f = this.f, h = g.hero, S = this.H.spots, v = this.phase() === 'v';
    const level = (s, d = 1.4) => s && (s.y == null || Math.abs(h.pos.y - s.y) < d);
    if (level(S.plaque)) consider(dist(S.plaque.x, S.plaque.z), S.plaque.r, { kind: 'hs_plaque', label: 'p_look' });
    if (level(S.cellPlaque)) consider(dist(S.cellPlaque.x, S.cellPlaque.z) + 0.2, S.cellPlaque.r, { kind: 'hs_cell', label: 'p_look' });
    if (v && level(S.hiddenCrate)) {
      const held = g.gadgets?.tools?.held?.() === 'pocketset';
      if (f.hs_crate) consider(dist(S.hiddenCrate.x, S.hiddenCrate.z), S.hiddenCrate.r, { kind: 'hs_crate', label: 'p_look' });
      else if (held) consider(dist(S.hiddenCrate.x, S.hiddenCrate.z), S.hiddenCrate.r, { kind: 'hs_crate', label: 'p_hs_open' });
    }
    const D = this.doorSpot(), open = !v || f.hs_door;
    if (D && !open && level(D)) consider(dist(D.x, D.z), 1.3, { kind: 'hs_door', label: f.hs_crate ? 'p_hs_unlock' : 'p_look' });
    if (open && level(S.veskDesk)) consider(dist(S.veskDesk.x, S.veskDesk.z), S.veskDesk.r, { kind: 'hs_desk', label: f.hs_notes ? 'p_look' : 'p_hs_read' });
    // the sleeper: no talk, a listen at his bunk
    const sl = this.npc('hs_sleeper');
    if (sl?.present && Math.abs(h.pos.y - sl.pos.y) < 1.6) consider(dist(sl.pos.x, sl.pos.z) + 0.3, 1.8, { kind: 'hs_sleeper', label: 'p_listen' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'hs_plaque': return say([['narrator', 'hs_plaque1'], 'hs_plaque2'], () => { if (!f.hs_plaque) { f.hs_plaque = true; g.save(false); } });
      case 'hs_cell': return say([['narrator', 'hs_cellplaque1'], 'hs_cellplaque2'], () => { if (!f.hs_cell) { f.hs_cell = true; g.save(false); } });
      case 'hs_sleeper': { const L = t('hs_sleeper'), n = (this.sleepN = ((this.sleepN ?? -1) + 1) % L.length); g.say('', [L[n]]); return true; }
      case 'hs_crate': {
        if (f.hs_crate) return say(['hs_crate_after']);
        const s = this.H.spots.hiddenCrate;
        h.actAt(s.x, s.z, 'use', 0.7, () => {
          if (f.hs_crate) return;
          f.hs_crate = true; f.hs_heard = true; this.applyWorld(false);
          g.audio.play('chest');
          say(['hs_crate1', 'hs_crate2'], () => g.found('hs_key', 'it_hs_key', () => g.save(false), { icon: 'key' }));
        }, 0.3);
        return true;
      }
      case 'hs_door':
        if (!f.hs_crate) { g.audio.play('doorLocked'); return say(['hs_door_locked']); }
        f.hs_door = true; this.applyWorld(false); g.audio.play('door');
        return say(['hs_door_open'], () => g.save(false));
      case 'hs_desk': {
        const box = () => {
          if (f.hs_box) return;
          f.hs_box = true; h.coins += BOX_KASHES; g.audio.play('coin'); g.hud.toast('a_toast_kashes', { n: BOX_KASHES }); g.hud.stats?.(h); g.save(false);
        };
        if (f.hs_notes) return f.hs_box ? say(['hs_box_empty']) : say(['hs_box'], box);
        return say([['narrator', 'hs_notes1'], ['narrator', 'hs_notes2'], ['narrator', 'hs_notes3'], 'hs_notes_tw', ...(f.hs_box ? [] : ['hs_box'])], () => { f.hs_notes = true; box(); g.save(false); });
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- talk
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (!id?.startsWith('hs_') || !this.able()) return false;
    const g = this.game, h = g.hero, k = id.slice(3), ph = this.phase();
    const lines = t(`hs_${k}_${ph}`), L = Array.isArray(lines) ? lines : [lines];
    if (k === 'cook' && ph !== 'l') {
      if (h.hp < h.maxHp && !this.fed) {
        this.fed = true;
        return this.say1(id, [L[0], t('hs_cook_heal')], () => { h.hp = h.maxHp; g.audio.play('heal'); g.hud.stats?.(h); });
      }
    }
    if (k === 'worker3' && ph === 'v' && !this.f.hs_heard) this.f.hs_heard = true;
    const n = (npc.talkN = (npc.talkN ?? -1) + 1);
    return this.say1(id, [L[n % L.length]]);
  }
  say1(id, texts, done) {
    const g = this.game, n = this.npc(id);
    if (n) n.talking = true;
    g.say('n_' + id, texts, () => { if (n) n.talking = false; done?.(); }, n, COLORS[id.slice(3)]);
    return true;
  }
}
