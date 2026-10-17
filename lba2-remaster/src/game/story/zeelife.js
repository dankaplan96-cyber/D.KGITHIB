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

export class ZeelichLife extends ChapterBase {
  get Z() { return this.game.rooms.zeelich; }
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

  // ---------------------------------------------------------------- state → world
  applyFlags() {
    const L = this.L; if (!L) return;
    const f = this.f;
    if (f.zl_crate && !f.zl_done) f.zl_done = true;   // (a save made while it fell)
    L.watch.setCrate(f.zl_crate || 'flue');
    L.watch.setOven(this.off);
    this._ph = null; this.push();
    this.target();
    this.settleOwed('zl_owe', 'coin', 5, 'zl_toast_owed');
  }
  // what follows the main story: Nara's crates wait by the pad only while the project grounds the shuttles (ch. 3)
  push() {
    const L = this.L; if (!L) return;
    const ph = this.phase();
    if (ph !== this._ph) { this._ph = ph; L.flowers.setVisible(ph === 'pre' || ph === 'post'); }
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
    this.chain(lines, () => { g.hud.toast('zl_toast_oven'); g.save(false); });
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    if (!this.open || !this.here()) return false;
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
      case 'zmole1': return one('zmole1', pk('zl_grumm')); // Old Grumm
      case 'ztri2': return f.zl_done ? one('ztri2', 'zl_tavo_done') : false;   // Tavo (his idle lines until then)
      // Nara and Oku when no chapter needs them (chapters 4–8 and after the network)
      case 'nara': return ph === 'mid' || ph === 'late' ? one('nara', 'zl_nara') : false;
      case 'oku': return ph === 'mid' || ph === 'late' ? one('oku', 'zl_oku') : false;
    }
    return false;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
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
