// Zeelich's street twelve years on: the people and the small story of the places in src/game/zeelife.js. Not a
// chapter: the director (index.js) asks it after the chapter in progress, like Citadel's life (life.js), Baldino's
// workshop (workshop.js) and Kesh (kesh.js). Its state is flags prefixed zl_ (saved with the game).
//
// The Second Bake (from chapter 3 on, whenever Twinsen is on Zeelich; nothing on the main path depends on it):
// Mother Snuff bakes the street's bread in the old watch house, on the Joint Project's heat. Her oven is cold: the
// project's heat box shuts itself off when the flue can't breathe, and Bzizz the Mosquibee, who lands his nectar
// crates on the watch house's flat roof, has left one on the flue (unsigned crates stay on the stage: rules).
//   - Snuff, the heat box's red lamp or the hatch tell Twinsen; Bzizz says the crate is his and stays put.
//   - Up the guards' stair, a shove moves the crate off the flue (it stays on the roof: Bzizz is pleased); or the
//     magic ball knocks it off from the street (it falls and breaks: nectar on the grass, Bzizz is not). Either way the
//     heat box resets, the hatch glows, loaves go on the counter, the slate says FRESH BREAD.
//   - Snuff pays five kashes (one coin, owed until picked up: ChapterBase.reward); a roll at the hatch restores life;
//     Tavo carries the rolls to the depot.
// Lines change with the main story: chapter 3 before and after the shield drops, chapters 4–8 (the shuttles fly
// again), the council (chapter 9), the network (chapter 10) and after. The street folk's other lines carry the
// argument over the project's heat (Snuff, Bzizz and Mr Pelleck gain by it; Old Grumm and the west end wait; Oku
// would rather have his mills back), and the heat posts show who has it.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/zeelife.js';
import { ZHOMES, ZH, zhomeDoors, zhomeExit } from '../zhomes.js';

// DOOR-CLEAR: a resident's stop never stands before a house door: 2.2 m out from it and 0.7 m either side of its middle
// (as the isles' dressing keeps it, zislands.js). A stop inside is moved sideways out of it, keeping where it faces
export function clearOfDoors(stops, Z) {
  const doors = (Z?.houseDoors || []).map((d, i) => ({ ...d, a: Z.houseFacing?.[i] ?? 0 }));
  return stops.map((s) => {
    for (const d of doors) {
      const fx = Math.sin(d.a), fz = Math.cos(d.a), dx = s.x - d.x, dz = s.z - d.z;
      const out = dx * fx + dz * fz, side = dx * fz - dz * fx;
      if (out < -0.2 || out > 2.2 || Math.abs(side) > 0.7) continue;
      const k = (side < 0 ? -1 : 1) * (1.05 - Math.abs(side));
      s = { ...s, x: s.x + fz * k, z: s.z - fx * k };
    }
    return s;
  });
}

export class ZeelichLife extends ChapterBase {
  // (LAZY-REGIONS: Zeelich once it is built; never builds it — the street's state goes on it as it is built)
  get Z() { return this.game.regions?.built('zeelich'); }
  get L() { return this.Z?.life; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  get open() { const i = this.idx('zeelich'); return i >= 0 && this.story.index >= i; }
  here() { return this.game.room?.id === 'zeelich' && !!this.L; }
  // where the street is in the main story: 'pre' / 'post' (chapter 3, before and after the shield drops) · 'mid'
  // (chapters 4–8: the shuttles fly again) · 'council' (9) · 'network' (10) · 'late' (after)
  phase() {
    const k = this.story.cur?.key, i = this.story.index;
    if (k === 'zeelich') return this.f.c2_shield ? 'post' : 'pre';
    if (k === 'council') return 'council';
    if (k === 'network') return 'network';
    return i > this.idx('network') ? 'late' : 'mid';
  }
  get off() { return !!this.f.zl_crate; }   // the crate is off the flue: the oven is hot
  // Twinsen up on the watch house (the roof, or the guards' stair above the first steps)
  up() { const h = this.game.hero.pos, w = this.L?.watch; return !!w && h.y > w.roofY - 3.1 && Math.hypot(h.x - w.flue.x, h.z - w.flue.z) < 6.5; }

  // ---------------------------------------------------------------- ZEELICH-DOORS: the houses inside (zhomes.js)
  // Lissa (Nara's niece, in the flower house) and Wenna (Oku's wife, at home): placed once their room is built
  npcDefs() {
    const at = (S) => (S ? { x: S.x, z: S.z, angle: S.a } : { x: 0, z: 0, angle: 0, pending: true });
    return [
      ...this.streetFolk(),
      { id: 'zh_lissa', name: 'n_zh_lissa', char: 'nara', color: '#f4c0d0', ...at(ZH.zh_nara?.npcSpots?.lissa) },
      { id: 'zh_wenna', name: 'n_zh_wenna', char: 'nara', color: '#e8c8a0', ...at(ZH.zh_oku?.npcSpots?.wenna) },
    ];
  }
  // ZEELICH-LIFE: three of the street's working people, on rounds (walkers.js Resident): Fennick the project's heat
  // fitter (the lit posts, the dark ones, the bakery's heat box, the feed under the street), Rezz the shuttle pilot
  // (grounded in chapter 3: on the bench by the pad, at his shuttle; away flying from chapter 4, back for the council's
  // checks in chapter 9), Oma who keeps the council's notices (the council door, the petition box, the street's tags)
  streetFolk() {
    const Z = this.Z, ox = Z?.group?.position.x ?? 2400, oz = Z?.group?.position.z ?? 0;
    const A = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
    const S = (id, x, z, tx, tz, dur, act = 'stand', o = {}) => ({ id, x: ox + x, z: oz + z, a: A(x, z, tx, tz), dur, act, ...o });
    const pad = Z?.shuttlePad ? [Z.shuttlePad.x - ox, Z.shuttlePad.z - oz] : [-44, 8];
    const def = (id, char, color, speed, stops0) => { const stops = Z ? clearOfDoors(stops0, Z) : stops0; return (Z ? { id, name: 'n_' + id, char, tint: '#ffffff', color, speed, ambient: true, x: stops[0].x, z: stops[0].z, angle: stops[0].a, round: stops, start: 0 }
      : { id, name: 'n_' + id, char, tint: '#ffffff', color, ambient: true, x: 0, z: 0, angle: 0, pending: true }); };
    return [
      def('zr_fennick', 'worker', '#e8a040', 1.0, [
        S('fen_post1', 15.0, -5.6, 15.6, -6.4, [8, 12], 'tend'),
        S('fen_box', 14.6, -10.0, 13.56, -10.15, [10, 14], 'tend'),
        S('fen_feed', 16.9, 2.6, 16.0, 0, [6, 9]),
        S('fen_dark', -43.3, -6.3, -42.4, -7.2, [9, 13], 'tend'),
        S('fen_sw', -35.3, 6.5, -36.2, 7.5, [6, 9]),
      ]),
      def('zr_rezz', 'xil', '#80c0e8', 0.9, [
        S('rez_ship', pad[0] + 5.4, pad[1] + 0.6, pad[0], pad[1], [14, 20], 'browse'),
        S('rez_look', pad[0] + 6.2, pad[1] - 3.4, pad[0] + 30, pad[1] - 20, [8, 12]),
        S('rez_gate', -44.0, 1.6, -52, 0, [8, 12]),
      ]),
      // (DOOR-CLEAR: the notice board east of the council door and the petition box west of it were one leg of her
      //  round, and that leg crossed the door's front 1.5 m out: in chapter 9 she stood in the straight way in. Her stop
      //  at the box was inside the planter beside it, so she stopped wherever the planner put her, nearer the door. The
      //  box is reached from the tags now (down past the planter's door side, 1 m clear of the door's way in), and she
      //  leaves it north, to look the council house over from the street, before the notice board)
      def('zr_oma', 'archivist', '#c8b0e0', 0.85, [
        S('oma_door', -22.4, -5.7, -25.5, -8.4, [9, 13]),
        S('oma_fount', -21.6, 2.6, -24, 0, [6, 9]),
        S('oma_tag', -28.9, 6.8, -29.9, 8.0, [6, 9]),
        S('oma_box', -27.2, -6.7, -27.6, -8.4, [8, 11], 'put'),
        S('oma_look', -26.8, -1.8, -25.5, -8.4, [5, 8]),
      ]),
    ];
  }
  folkHere(id) {
    const ph = this.phase();
    if (id === 'zr_rezz') return ph === 'pre' || ph === 'post' || ph === 'council';   // (grounded, or the council checks every departure)
    return true;
  }
  place(id) {
    if (id.startsWith('zr_')) {
      const n = this.npc(id);
      if (!n?.ambient) return undefined;
      if (!this.open || !this.folkHere(id)) { n.away = 'zl'; return null; }
      if (n.away === 'zl') { n.away = null; return n.reset(); }
      return undefined;
    }
    const S = id === 'zh_lissa' ? ZH.zh_nara?.npcSpots?.lissa : id === 'zh_wenna' ? ZH.zh_oku?.npcSpots?.wenna : undefined;
    if (!id.startsWith('zh_')) return undefined;
    if (!this.open) return null;
    return S ? { x: S.x, z: S.z, a: S.a } : undefined;   // (the room not built yet: she waits hidden)
  }
  // the street's doors that lead in (from chapter 3); Baldino's workshop also in the chapters that offer no door of
  // their own to it (4–8, after the network: the test pair, his fee tin)
  doors() {
    const Z = this.Z;
    if (!this.open || !Z) return [];
    const out = zhomeDoors(Z);
    const cur = this.story.cur?.doors?.() || [];
    if (Z.workshopDoor && this.game.regions.has('workshop') && !cur.some((d) => d.room === 'workshop')) out.push({ region: 'zeelich', x: Z.workshopDoor.x, z: Z.workshopDoor.z, r: 0.9, room: 'workshop' });
    return out;
  }
  exitTo(to) { return zhomeExit(to, this.Z); }
  // a door kept shut on purpose, with its reason (the council house between hearings, the mills, the project's huts);
  // not where a door of the story's is live
  closedDoors() {
    const Z = this.Z; if (!Z) return [];
    const live = [...(this.story.cur?.doors?.() || []), ...this.doors()].filter((d) => d.region === 'zeelich');
    return (Z.closedDoors || []).filter((d) => !live.some((e) => Math.hypot(e.x - d.x, e.z - d.z) < 2.2));
  }
  // the rooms' state from the story: Nara's crates held while the shuttles are grounded; Snuff's oven
  applyHomes() {
    const held = this.phase() === 'pre' || this.phase() === 'post', hot = this.off;
    if (ZH.zh_nara?.setHeld && this._held !== held) { this._held = held; ZH.zh_nara.setHeld(held); }
    if (ZH.zh_bakery?.setOven && this._hot !== hot) { this._hot = hot; ZH.zh_bakery.setOven(hot); }
  }

  // ---------------------------------------------------------------- state → world
  applyFlags() {
    const f = this.f;
    if (f.zl_crate && !f.zl_done) f.zl_done = true;   // (a save made while it fell)
    this.applyStreet();
    this.settleOwed('zl_owe', 'coin', 5, 'zl_toast_owed');
  }
  // the watch house as the flags have it (on a load; on Zeelich's build after it)
  applyStreet() {
    const L = this.L; if (!L) return;
    const f = this.f;
    L.watch.setCrate(f.zl_crate || 'flue');
    L.watch.setOven(this.off);
    this._ph = null; this.push();
    this.target();
  }
  regionBuilt(ids) { if (ids.includes('zeelich')) this.applyStreet(); if (ids.some((i) => ZHOMES.includes(i))) { this._held = this._hot = null; this.applyHomes(); } }
  // what follows the main story: Nara's crates wait by the pad only while the project grounds the shuttles (ch. 3)
  push() {
    const L = this.L; if (!L) return;
    const ph = this.phase();
    if (ph !== this._ph) {
      this._ph = ph; const grounded = ph === 'pre' || ph === 'post';
      L.flowers.setVisible(grounded);
      // (the user, 6.11, of Citadel: "Vesk's ship is already in the harbour in the opening, not logical": here, three
      //  shuttles circled over Zeelich in chapter 3 while the crates by the pad read HELD, the shuttles grounded. They
      //  fly from chapter 4, when the island routes open, travel.js)
      for (const s of this.Z?.traffic || []) s.visible = !grounded;
    }
  }
  // the crate as a target for the magic ball (thrown from the street, or anywhere): only while it sits on the flue
  target() {
    const Z = this.Z, L = this.L;
    if (!Z || !L || this._tgt) return;
    const me = this, w = L.watch;
    this._tgt = {
      r: 0.9, zl: true,
      get x() { return w.crateAt().x; }, get y() { return w.crateAt().y; }, get z() { return w.crateAt().z; },
      get done() { return !(me.open && w.crate === 'flue'); },
      onHit() { me.knock(); },
    };
    Z.ballTargets.push(this._tgt);
  }
  // where a street folk stands once the oven is hot (asked by chapter2.js for Zeelich's folk)
  spot(id) {
    if (id === 'ztri2' && this.off && this.L) return this.L.watch.tavo;
    return null;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'zl_j_oven', done: !!f.zl_done, show: f.zl_ask || f.zl_bz || f.zl_done },
      { key: 'zl_j_paid', done: !!f.zl_paid, show: f.zl_done },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const rid = this.game.room?.id;
    if (this.open && ZHOMES.includes(rid)) { for (const l of ZH[rid]?.looks || []) consider(dist(l.x, l.z), l.r, { kind: 'zhlook', key: l.key, label: 'p_look' }); return; }
    if (rid === 'zeelich' && this.Z) {
      const y = this.game.hero.pos.y;
      for (const d of this.closedDoors()) if (Math.abs(y - d.y) < 1.6) consider(dist(d.x, d.z), 1.6, { kind: 'zhshut', key: d.key, label: 'p_door' });
      if (this.open && Math.abs(y - 6.0) < 1.0) for (const d of this.doors()) if (d.prompt) consider(dist(d.x, d.z), 1.3, { kind: 'zhenter', room: d.room, label: 'p_door' });
    }
    if (!this.open || !this.here()) return;
    const L = this.L, w = L.watch, f = this.f, y = this.game.hero.pos.y;
    if (y > w.roofY - 0.4) {
      consider(dist(w.flue.x, w.flue.z), 1.45, w.crate === 'flue' ? { kind: 'zlshove', label: 'p_shove' } : { kind: 'zlflue', label: 'p_look' });
      return;
    }
    if (y > w.roofY - 3.0 && Math.hypot(this.game.hero.pos.x - w.stairMid.x, this.game.hero.pos.z - w.stairMid.z) < 3) return;   // (on the stair)
    consider(dist(w.hatch.x, w.hatch.z), 1.35, { kind: 'zlhatch', label: f.zl_done ? 'p_roll' : 'p_look' });
    consider(dist(w.heatbox.x, w.heatbox.z), 1.2, { kind: 'zlbox', label: 'p_look' });
    for (const p of L.posts) if (p.tag) consider(dist(p.x, p.z), 1.25, { kind: 'zltag', tag: p.tag, label: 'p_look' });
    consider(dist(L.burrow.vent.x, L.burrow.vent.z), 1.3, { kind: 'zlburrow', label: 'p_look' });
    if (this.phase() === 'pre' || this.phase() === 'post') consider(dist(L.flowers.x, L.flowers.z), 1.4, { kind: 'zlnara', label: 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, w = this.L?.watch;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'zlhatch': {
        if (f.zl_done) { if (h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + 3); g.audio.play('heal'); } return say(['zl_roll']); }
        const first = !f.zl_hatchSeen; f.zl_hatchSeen = true; f.zl_ask = true;
        return say([...(first ? ['zl_hatch_1'] : []), 'zl_hatch_cold', 'zl_hatch_hint'], () => g.save(false));
      }
      case 'zlbox': f.zl_ask = f.zl_ask || !f.zl_done; return say([f.zl_done ? 'zl_box_green' : 'zl_box_red']);
      case 'zlflue': return say(['zl_flue_hot']);
      case 'zltag': return say(['zl_tag_' + it.tag]);
      case 'zlburrow': return say(['zl_burrow']);
      case 'zlnara': return say(['zl_flowers']);
      case 'zhshut': g.audio.play('deny'); return say([it.key]);
      case 'zhenter': g.audio.play('door'); g.walkNext = true; g.enterRoom(it.room); g.walkNext = false; return true;   // (as a door walked into: main.js)
      case 'zhlook': return say([this.lookKey(it.key)]);
      case 'zlshove':
        h.act('use', 0.8, () => {
          if (this.off) return;
          f.zl_crate = 'shoved'; f.zl_done = true; w.setCrate('shoved'); g.audio.play('thump');
          this.heat('zl_shoved');
        }, 0.4);
        return true;
    }
    return false;
  }
  // a look inside the houses: some say what changed (the crates, the oven)
  lookKey(k) {
    const held = this.phase() === 'pre' || this.phase() === 'post';
    if (k === 'zh_nara_crates') return held ? 'zh_nara_crates' : 'zh_nara_crates_gone';
    if (k === 'zh_bak_oven') return this.off ? 'zh_bak_oven_hot' : 'zh_bak_oven';
    if (k === 'zh_bak_racks') return this.off ? 'zh_bak_racks_full' : 'zh_bak_racks';
    return k;
  }
  // the ball knocks the crate off the roof: it falls and breaks on the grass
  knock() {
    const g = this.game, f = this.f, w = this.L.watch;
    if (this.off || w.crate !== 'flue') return;
    f.zl_crate = 'broken'; f.zl_done = true;
    g.audio.play('hitWood');
    w.fall(() => {
      const b = w.broken;
      g.audio.play('break');
      g.particles.burst(b.x, g.physics.groundAt(b.x, b.z) + 0.3, b.z, '#f0a828', 18, 2.2);
      this.heat(null, true);
    });
  }
  // the heat box resets: the hatch glows, loaves on the counter, Tavo comes for the rolls
  heat(first, fell = false) {
    const g = this.game, w = this.L.watch;
    w.setOven(true);
    g.audio.play('bonus');
    this.story.refreshCast();
    const lines = [];
    if (fell) lines.push(['zbee1', 'zl_bz_nectar'], ['hero', 'zl_knocked']);
    if (first) lines.push(['hero', first]);
    // on the roof the heat box is somewhere below; from the street (the ball way) he sees its lamp
    lines.push(['hero', this.up() ? 'zl_draws' : 'zl_draws_st'], ['zmole2', 'zl_snuff_warm']);
    this.chain(lines, () => { g.save(false); });
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    if (!this.open || (!this.here() && !ZHOMES.includes(this.game.room?.id))) return false;
    const g = this.game, f = this.f, id = npc.def.id, ph = this.phase();
    const c = (lines, done) => { this.chain(lines.filter(Boolean), done); return true; };
    // one of a list, a different one each time
    const pick = (key) => { const a = t(key); return Array.isArray(a) ? a[(f['zl_n_' + key] = ((f['zl_n_' + key] ?? -1) + 1) % a.length)] : a; };
    const one = (spk, key) => { g.say('n_' + spk, [pick(key)], null, this.speaker(spk)); return true; };
    const pk = (base) => base + '_' + (ph === 'late' ? 'network' : ph === 'post' ? 'pre' : ph);   // (shared line sets)
    switch (id) {
      case 'zmole2':   // Mother Snuff
        if (f.zl_done && !f.zl_paid) {
          const b = f.zl_crate === 'broken';   // (the ball way: the crate fell on her grass, nobody was on her roof)
          return c([['zmole2', !f.zl_ask ? (b ? 'zl_snuff_paynoask_b' : 'zl_snuff_paynoask') : b ? 'zl_snuff_pay_b' : 'zl_snuff_pay']], () => {
            f.zl_paid = true;
            this.reward('zl_owe', 'coin', 1, npc.pos.x, npc.pos.y + 1.2, npc.pos.z, { pop: true, value: 5 });
            g.save(false);
          });
        }
        if (f.zl_done) return one('zmole2', pk('zl_snuff_after'));
        // (she points him to the stair: she is talked to from the street only, never from her roof or the stair,
        // which are too high above her or out of reach: Game.findInteractable, TALK_ABOVE)
        if (!f.zl_ask) return c([['zmole2', 'zl_snuff_1'], ['zmole2', 'zl_snuff_i_' + ph], ['zmole2', 'zl_snuff_2']], () => { f.zl_ask = true; g.save(false); });
        // asked already: what the street talks about now, then the flue
        return c([['zmole2', 'zl_snuff_i_' + ph], ['zmole2', 'zl_snuff_wait']]);
      case 'zbee1':    // Bzizz
        if (f.zl_done && !f.zl_bzThanks) return c([['zbee1', f.zl_crate === 'broken' ? 'zl_bz_broken' : 'zl_bz_shoved']], () => { f.zl_bzThanks = true; g.save(false); });
        if (f.zl_done) return one('zbee1', pk('zl_bz_after'));
        if (!f.zl_bz) return c([['zbee1', 'zl_bz_1'], ['zbee1', 'zl_bz_2']], () => { f.zl_bz = true; g.save(false); });
        return c([['zbee1', 'zl_bz_i_' + (ph === 'post' ? 'pre' : ph)], ['zbee1', 'zl_bz_wait']]);
      case 'ztri1': return one('ztri1', pk('zl_pel'));     // Mr Pelleck
      case 'zr_fennick': case 'zr_rezz': case 'zr_oma': {   // (a resident on a round: it stops and turns while it talks)
        const k = { zr_fennick: 'zr_fen_', zr_rezz: 'zr_rez_', zr_oma: 'zr_oma_' }[id] + (ph === 'post' ? 'pre' : id === 'zr_rezz' && ph !== 'council' ? 'pre' : ph);
        npc.engage?.();
        g.say('n_' + id, [pick(k)], () => npc.release?.(), npc);
        return true;
      }
      case 'zh_lissa': return one('zh_lissa', 'zh_lissa_' + (ph === 'post' ? 'pre' : ph));
      case 'zh_wenna': return one('zh_wenna', 'zh_wenna_' + (ph === 'pre' && this.story.chapters[this.idx('zeelich')]?.millsBraked?.() ? 'braked' : ph === 'post' ? 'braked' : ph));
      case 'zmole1': return one('zmole1', pk('zl_grumm')); // Old Grumm
      case 'ztri2': return f.zl_done ? one('ztri2', 'zl_tavo_done') : false;   // Tavo (his idle lines until then)
      // Nara and Oku when no chapter needs them (chapters 4–8 and after the network; after the ending they have their
      // own word about it: story/epilogue.js EPILOGUE-HOME)
      case 'nara': return (ph === 'mid' || ph === 'late') && this.story.cur?.key !== 'home' ? one('nara', 'zl_nara') : false;
      case 'oku': return (ph === 'mid' || ph === 'late') && this.story.cur?.key !== 'home' ? one('oku', 'zl_oku') : false;
    }
    return false;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    this.applyHomes();
    if (!this.L) return;
    this.push();
    const g = this.game, L = this.L;
    if (!this.here() || g.state !== 'play') return;
    // the flue breathes once the oven is hot; the moles' vent always does
    if (this.off && L.watch.crate !== 'falling') {
      this.puffT = (this.puffT || 0) - dt;
      if (this.puffT <= 0) { this.puffT = 0.55; const p = L.watch.flue; g.particles.burst(p.x, p.y + 0.15, p.z, '#f4ece4', 2, 0.5); }
    }
    this.ventT = (this.ventT || 0) - dt;
    if (this.ventT <= 0) { this.ventT = 0.9; const v = L.burrow.vent; g.particles.burst(v.x, v.y, v.z, '#f8f0f4', 1, 0.35); }
  }
}
