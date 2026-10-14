// Kesh twelve years on (Desert Island): the people and the small story of the places in src/game/keshlife.js. Not a
// chapter: the director (index.js) asks it after the chapter in progress, like the town's life (life.js) and
// Baldino's workshop (workshop.js). Its state is flags prefixed k_ (saved with the game).
//
// The Wind-Catcher (from chapter 4 on, whenever Twinsen is on Desert Island): Kesh keeps its water jars, Brosk's
// dates and Lumi's dyed wool in one of FunFrock's old blockhouses, dug out of a dune, with a wind-catcher Kesh built on
// its roof. The last storm turned the cowl away from the wind and tore its sand screen: the cool room is stuffy.
//   - Brosk (the trader) or a look at the door tells Twinsen (Brosk: the storm tore Lumi's screen off it); Sani says
//     how to find the wind (the pump's wheel faces it, Hesk's flags stream away from it; the roof has a windsock).
//     The door's hint and Brosk's advice follow how the cowl stands now (hint()): the wrong way, into the wind with no
//     screen (then the screen is what's missing), or the screen on but the wrong way.
//   - Lumi wove a new screen. Before the pump runs (chapter 4) she won't hand it to someone off the project's ferry;
//     after it, she does.
//   - On the roof (the stair up the east wall) the crank turns the cowl a quarter at a time. Its mouth into the wind
//     (west) with the screen on: the room draws. Into the wind without the screen: sand pours down the tower into the
//     room (a setback: the screen fixes it). Any order works (screen first or turn first).
//   - After: the curtain lifts, the jars stay cold (a drink there restores life), Brosk's dates join the jars, Sani sits in
//     the doorway, and Brosk pays five kashes (owed until picked up: ChapterBase.reward).
// Lines change with the main story: before and after the pump (chapter 4), with the steam threatening the oasis
// (chapter 5) and after the vent opened. Nothing on the main path depends on it; chapter 5's errand with Brosk (the
// jar and the shovel) comes first.
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/kesh.js';

export class KeshLife extends ChapterBase {
  get K() { return this.game.rooms.desert?.kesh; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  get open() { const i = this.idx('dig'); return i >= 0 && this.story.index >= i; }
  here() { return this.game.room?.id === 'desert' && !!this.K; }
  // where Kesh is in the main story: 'dry' (chapter 4, the pump seized) · 'wet' (the pump runs) · 'steam' (chapter 5,
  // before the vent) · 'after' (the vent is open, or a later chapter)
  phase() {
    const f = this.f, i = this.story.index;
    if (f.c5_vent || i > this.idx('steam')) return 'after';
    if (i === this.idx('steam')) return 'steam';
    return f.c4_pump ? 'wet' : 'dry';
  }
  get dir() { return this.f.k_dir ?? 2; }

  // ---------------------------------------------------------------- state → world
  applyFlags() {
    const f = this.f, C = this.K?.cool;
    if (!C) return;
    C.setDir(this.dir, true);
    C.setScreen(f.k_fit ? 'fitted' : 'torn');
    C.setDrawing(!!f.k_done);
    C.setSand(!!f.k_sand && !f.k_done);
    C.setDates(!!f.k_done);
    this.push();
    this.settleOwed('k_owe', 'coin', 5, 'k_toast_owed');
  }
  // the things that follow the main story: the water jars (few before the pump), the ferry chalked out on the board
  push() {
    const K = this.K; if (!K) return;
    const jars = this.phase() === 'dry' ? 2 : 5;
    if (jars !== this._jars) { this._jars = jars; K.cool.setJars(jars); }
    const ferry = !this.f.c5_ferryTaken;
    if (ferry !== this._ferry) { this._ferry = ferry; K.board.setFerry(ferry); }
  }
  // Sani's place once the room draws: sitting in its doorway (asked by dig.js for chapters from 4 on)
  saniSpot() { return this.f.k_done && this.K ? this.K.cool.sani : null; }
  items() { const f = this.f; return f.k_screen && !f.k_fit ? [{ id: 'kscreen', icon: 'cloth' }] : []; }
  journal() {
    const f = this.f;
    return [
      { key: 'k_j_cool', done: !!f.k_done, show: f.k_ask || f.k_sand || f.k_screen || f.k_done },
      { key: 'k_j_screen', done: !!f.k_fit, show: f.k_screen },
      { key: 'k_j_paid', done: !!f.k_paid, show: f.k_done },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    if (!this.open || !this.here()) return;
    const f = this.f, C = this.K.cool, y = this.game.hero.pos.y;
    if (y > C.roofY - 0.4) consider(dist(C.crank.x, C.crank.z), 1.3, { kind: 'kcrank', label: f.k_done ? 'p_look' : f.k_screen && !f.k_fit ? 'p_fit' : 'p_turn' });
    else if (y < C.roofY - 1.2) consider(dist(C.door.x, C.door.z), 1.5, { kind: 'kdoor', label: f.k_done ? 'p_drink' : 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, C = this.K?.cool;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    switch (it.kind) {
      case 'kdoor': {
        if (f.k_done) { if (h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + 3); g.audio.play('heal'); } return say(['k_drink']); }
        const inside = f.k_sand ? 'k_door_sand' : this.phase() === 'dry' ? 'k_door_dry' : 'k_door_wet';
        const first = !f.k_doorSeen; f.k_doorSeen = true; f.k_ask = true;
        return say([...(first ? ['k_door_1'] : []), inside, this.hint()], () => g.save(false));
      }
      case 'kcrank':
        if (f.k_done) return say(['k_cowl_done']);
        if (f.k_screen && !f.k_fit) {
          h.act('use', 0.8, () => {
            if (f.k_fit) return;
            f.k_fit = true; C.setScreen('fitted'); g.audio.play('chest');
            if (this.dir === 0) this.finish('k_fit'); else say(['k_fit', 'k_fit_turn'], () => g.save(false));
          }, 0.4);
          return true;
        }
        h.act('use', 0.9, () => {
          if (f.k_done) return;
          f.k_dir = (this.dir + 1) % 4; C.setDir(f.k_dir); g.audio.play('ropeCreak');
          f.k_turns = (f.k_turns || 0) + 1;
          if (f.k_dir !== 0) { say([f.k_dir === 2 ? 'k_turn_away' : 'k_turn_side'], () => g.save(false)); return; }
          if (f.k_fit) { this.finish(); return; }
          // into the wind with no screen: the room takes in half a dune
          f.k_sand = true; f.k_ask = true; C.setSand(true); C.gust();
          g.audio.play('deny');
          say(['k_turn_sand', 'k_turn_sand2'], () => g.save(false));
        }, 0.45);
        return true;
    }
    return false;
  }
  // what is wrong up there now: the mouth's way, or (into the wind) the missing screen
  hint() {
    const f = this.f;
    if (this.dir === 0) return 'k_door_hint_screen';   // (into the wind without a screen: done otherwise)
    return f.k_fit ? 'k_door_hint_fit' : 'k_door_hint';
  }
  finish(first = null) {
    const g = this.game, f = this.f, C = this.K.cool;
    f.k_done = true; f.k_ask = true;
    C.setDrawing(true); C.setSand(false); C.setDates(true);
    g.audio.play('chest');
    this.story.refreshCast();
    this.chain([...(first ? [['hero', first]] : []), ['hero', 'k_draws']], () => { g.hud.toast('k_toast_cool'); g.save(false); });
  }

  // ---------------------------------------------------------------- people (asked before the chapter)
  talkFirst(npc) {
    if (!this.open || !this.here()) return false;
    const g = this.game, f = this.f, id = npc.def.id, ph = this.phase();
    const dig = this.story.cur?.key === 'dig';
    const c = (lines, done) => { this.chain(lines.filter(Boolean), done); return true; };
    // one of a list, a different one each time
    const pick = (key) => { const a = t(key); return Array.isArray(a) ? a[(f['k_n_' + key] = ((f['k_n_' + key] ?? -1) + 1) % a.length)] : a; };
    const one = (spk, key) => { g.say('n_' + spk, [pick(key)], null, this.speaker(spk)); return true; };
    switch (id) {
      case 'dtrader': {
        // (chapter 5: his jar and shovel come first)
        if (this.story.cur?.key === 'steam' && !f.c5_shovel) return false;
        if (f.k_done && !f.k_paid) {
          return c([['dtrader', 'k_brosk_pay']], () => {
            f.k_paid = true;
            this.reward('k_owe', 'coin', 1, npc.pos.x, npc.pos.y + 1.2, npc.pos.z, { pop: true, value: 5 });
            g.save(false);
          });
        }
        if (f.k_done) return one('dtrader', ph === 'after' ? 'k_brosk_after' : ph === 'steam' ? 'k_brosk_steamdone' : 'k_brosk_done');
        // sand in his dates: what to do next depends on how it stands up there
        if (f.k_sand) return c([['dtrader', 'k_brosk_sand'], ['dtrader', this.dir === 0 ? 'k_brosk_sand_screen' : f.k_fit ? 'k_brosk_sand_fit' : 'k_brosk_sand_turn']], () => { f.k_ask = true; });
        if (!f.k_ask) return c([dig ? ['dtrader', f.c4_pump ? 'c4_trader_2' : 'c4_trader_1'] : null, ['dtrader', 'k_brosk_i_' + ph], ['dtrader', 'k_brosk_2']], () => { f.k_ask = true; g.save(false); });
        return c([['dtrader', 'k_brosk_wait']]);
      }
      case 'weaver':
        if (f.k_done) return one('weaver', ph === 'after' ? 'k_lumi_after' : 'k_lumi_done');
        // before the pump runs she keeps her work from ferry people
        if (ph === 'dry') return c([['weaver', 'c4_weaver_1'], f.k_sand ? ['weaver', 'k_lumi_drysand'] : null]);
        if (!f.k_screen) {
          return c([dig ? ['weaver', 'c4_weaver_2'] : null, ['weaver', f.k_sand ? 'k_lumi_1s' : 'k_lumi_1'], ['weaver', 'k_lumi_2']], () => {
            f.k_screen = true; f.k_ask = true; g.audio.play('chest'); g.hud.toast('k_toast_screen'); g.save(false);
          });
        }
        return c([['weaver', f.k_fit ? 'k_lumi_fit' : 'k_lumi_wait']]);
      case 'dkid':
        if (f.k_done) return one('dkid', ph === 'steam' ? 'k_sani_steam' : 'k_sani_done');
        return c([dig ? ['dkid', f.c4_pump ? 'c4_kid_2' : 'c4_kid_1'] : null, ['dkid', 'k_sani_wind']]);
    }
    return false;
  }

  // ---------------------------------------------------------------- per frame
  // (the sand and dust the cool room blows about are keshlife.js's: they follow setSand/setDrawing and the cowl)
  update() {
    if (!this.K) return;
    this.push();
  }
}
