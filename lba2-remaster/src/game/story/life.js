// Citadel twelve years on: the people and small stories of the places in src/game/townlife.js and the house's
// family corners (src/game/homelife.js). Not a chapter: the director (index.js) asks it after the chapter in
// progress, so the main story always comes first. Its state is flags prefixed l_ (saved with the game).
//
// New people (this sequel's, not from LBA1/LBA2): Bram, who keeps the lane's old hand pump; Officer Odile at the
// harbour's customs booth; Nell, who runs the repair shop for imported machines. Arthur and Xil (the sequel's own
// cast) have a part in them.
//
// The Old Pump (from chapter 2): the project's heat pipe went in past Bram's pump and the pump seized. Its valve pin
// needs pliers — Arthur borrowed Twinsen's for his boat's rudder (they're in his boat box by the garden pond); then
// three strokes of the handle. The pump runs (water in the trough; Bram's thanks: a clover); a drink there restores
// life; in the evacuation, with the project's posts dark, it is the street's water.
// The Mislabelled Shipment (from chapter 2): customs holds Xil's crate, filed as "SOUP POT (1)". Odile asks what it
// really is. Opened: a heat coupler, which Nell's engine has waited a month for. On the bench it runs, heats and
// glows; it must be taken off and dipped in the water barrel before it trips, then set back: it settles and the
// engine runs. Odile files it as machinery and clears it; Nell pays the finder's fee. (Couplers overheat: the same
// limit Baldino's network has in chapter 10.)
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import '../text/life.js';

const HEAT_GLOW = 0.45, HEAT_TRIP = 1.25, HEAT_RATE = 1 / 8;   // glows after ~3.6 s on the bench, trips at ~10 s
const HOLD_LIMIT = 9;                                          // seconds he can hold it hot before he must drop it

export class TownLife extends ChapterBase {
  constructor(story) {
    super(story);
    this.heat = 0; this.holdT = 0; this.warned = false;
  }
  get L() { return this.game.world.life; }
  get open() { return this.story.index >= 1; }          // side stories from chapter 2 on
  get evac() { return this.story.cur?.key === 'evacuation'; }

  // ---------------------------------------------------------------- cast
  npcDefs() {
    const S = this.game.world.life.spots;
    return [
      { id: 'bram', name: 'n_bram', char: 'bram', color: '#b8d8a0', ...S.bram, angle: S.bram.a },
      { id: 'odile', name: 'n_odile', char: 'odile', color: '#a8c0ff', ...S.odile, angle: S.odile.a },
      { id: 'nell', name: 'n_nell', char: 'nell', color: '#ffb880', ...S.nell, angle: S.nell.a },
    ];
  }
  // they keep their places in every chapter (a later chapter could say otherwise)
  place(id) {
    const S = this.L.spots;
    if (id === 'bram') return { ...S.bram, anim: null };
    if (id === 'odile') return { ...S.odile, anim: null };
    if (id === 'nell') return { ...S.nell, anim: this.f.l_coupler ? null : 'kneelWork' };
    return undefined;
  }

  // ---------------------------------------------------------------- state
  // where the coupler is: 'crate' (not opened), 'hand' (carried, cold), 'bench' (heating), 'hot' (carried, hot),
  // 'cooled' (carried, quenched), 'tripped' (on the bench, cold), 'done' (settled, the engine runs)
  get cs() { return this.f.l_cs || (this.f.l_crateOpen ? 'hand' : 'crate'); }
  set cs(v) { this.f.l_cs = v; }
  applyFlags() {
    const f = this.f, L = this.L;
    L.pump.setRunning(!!f.l_pump);
    L.crate.setState(f.l_cleared ? 'cleared' : f.l_crateOpen ? 'open' : 'held');
    // (a save made with the coupler heating or hot in hand comes back with it cold on the bench)
    if (this.cs === 'bench' || this.cs === 'hot') this.cs = 'tripped';
    const on = this.cs === 'done';
    L.shop.coupler.setVisible(on || this.cs === 'tripped'); L.shop.coupler.setHeat(on ? 0.12 : 0);
    L.shop.engine.setRunning(on);
    if (f.l_cleared) L.customs.barrier.rotation.z = 1.2;
  }
  items() {
    const f = this.f, out = [];
    if (f.l_pliers && !f.l_pin) out.push({ id: 'pliers', icon: 'part' });
    if (['hand', 'hot', 'cooled'].includes(this.cs) && f.l_crateOpen) out.push({ id: 'coupler', icon: 'part' });
    return out;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'l_j_pump0', done: !!f.l_pump, show: f.l_pumpAsk || f.l_needPliers || f.l_pump },
      { key: 'l_j_pliers', done: !!f.l_pliers, show: f.l_needPliers || f.l_pliers },
      { key: 'l_j_crate0', done: !!f.l_crateOpen, show: f.l_crateAsk || f.l_crateOpen },
      { key: 'l_j_crate1', done: !!f.l_coupler, show: f.l_crateOpen },
      { key: 'l_j_crate2', done: !!f.l_cleared, show: f.l_coupler },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, R = g.room;
    if (R?.id === 'house' && R.life) {
      const H = R.life;
      consider(dist(H.zoeDesk.x, H.zoeDesk.z), 1.2, { kind: 'lhome', what: 'desk', label: 'p_look' });
      consider(dist(H.trunk.x, H.trunk.z), 1.0, { kind: 'lhome', what: 'trunk', label: 'p_look' });
      consider(dist(H.mendBox.x, H.mendBox.z), 0.9, { kind: 'lhome', what: 'mend', label: 'p_look' });
      consider(dist(H.meter.x, H.meter.z), 0.9, { kind: 'lhome', what: 'meter', label: 'p_look' });
      consider(dist(H.bench.x, H.bench.z), 1.1, { kind: 'lhome', what: 'bench', label: 'p_look' });
      return;
    }
    if (R) return;
    const L = this.L;
    consider(dist(L.pump.x, L.pump.z), 2.3, { kind: 'lpump', label: f.l_pump ? 'p_drink' : 'p_look' });
    consider(dist(L.boatBox.x, L.boatBox.z), 1.2, { kind: 'lbox', label: 'p_open' });
    if (!this.open) return;
    consider(dist(L.crate.x, L.crate.z), 1.4, { kind: 'lcrate', label: f.l_crateOpen ? 'p_look' : 'p_open' });
    const cs = this.cs;
    if (cs !== 'crate' && cs !== 'done') consider(dist(L.shop.bench.x, L.shop.bench.z), 1.4, { kind: 'lbench', label: cs === 'bench' ? 'p_take' : 'p_place' });
    if (cs === 'hot') consider(dist(L.shop.barrel.x, L.shop.barrel.z), 1.5, { kind: 'lbarrel', label: 'p_cool' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero, L = this.L;
    const say = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), done); return true; };
    switch (it.kind) {
      case 'lhome': return this.home(it.what);
      case 'lpump':
        if (f.l_pump) { if (h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + 3); g.audio.play('heal'); } L.pump.stroke(); return say(['l_pump_drink']); }
        if (!this.open) return say(['l_pump_dry']);
        if (!f.l_pin) {
          if (!f.l_pliers) { f.l_needPliers = true; g.updateObjective(); return say(['l_pump_pin']); }
          h.act('use', 0.9, () => { f.l_pin = true; g.audio.play('select'); say(['l_pump_pinout'], () => g.save(false)); }, 0.5);
          return true;
        }
        h.act('use', 0.6, () => {
          f.l_strokes = (f.l_strokes || 0) + 1; L.pump.stroke(); g.audio.play('ropeCreak');
          if (f.l_strokes >= 3) {
            f.l_pump = true; L.pump.setRunning(true); g.audio.play('chest');
            g.particles.burst(L.trough.x, g.physics.groundAt(L.trough.x, L.trough.z) + 0.5, L.trough.z, '#bfe6ff', 16, 2);
            say(['l_pump_runs'], () => { g.hud.toast('l_toast_pump'); g.save(false); });
          }
        }, 0.3);
        return true;
      case 'lbox':
        if (f.l_pliers) return say(['l_box_after']);
        h.act('use', 0.6, () => { f.l_pliers = true; g.audio.play('chest'); say([f.l_needPliers || f.l_benchSeen ? 'l_box_pliers' : 'l_box_pliers0'], () => { g.hud.toast('l_toast_pliers'); g.save(false); }); }, 0.3);
        return true;
      case 'lcrate':
        if (f.l_crateOpen) return say([f.l_cleared ? 'l_crate_cleared' : 'l_crate_open2']);
        if (!f.l_crateAsk) return say(['l_crate_look', 'l_crate_ask']);
        h.act('use', 0.8, () => { f.l_crateOpen = true; this.cs = 'hand'; L.crate.setState('open'); g.audio.play('chest'); say(['l_crate_open'], () => { g.hud.toast('l_toast_coupler'); g.save(false); }); }, 0.4);
        return true;
      case 'lbench': return this.bench();
      case 'lbarrel':
        h.act('use', 0.6, () => {
          this.cs = 'cooled'; this.holdT = 0; g.audio.play('door');
          g.particles.burst(L.shop.barrel.x + 0.75, g.physics.groundAt(L.shop.barrel.x, L.shop.barrel.z) + 1.0, L.shop.barrel.z, '#f4f4f4', 18, 1.6);
          say(['l_coupler_cooled']);
        }, 0.3);
        return true;
    }
    return false;
  }
  bench() {
    const g = this.game, f = this.f, L = this.L, h = g.hero, cs = this.cs;
    const C = L.shop.coupler;
    if (cs === 'hand' || cs === 'tripped') {
      h.act('use', 0.6, () => { this.cs = 'bench'; this.heat = 0; this.warned = false; C.setVisible(true); C.setHeat(0); L.shop.engine.setRunning(true); g.audio.play('select'); this.chain([['hero', 'l_coupler_on']]); }, 0.3);
      return true;
    }
    if (cs === 'bench') {
      if (this.heat < HEAT_GLOW) { this.chain([['hero', 'l_coupler_notyet']]); return true; }
      h.act('use', 0.5, () => { this.cs = 'hot'; this.holdT = 0; C.setVisible(false); L.shop.engine.setRunning(false); g.audio.play('select'); }, 0.2);
      return true;
    }
    if (cs === 'hot') { this.chain([['hero', 'l_coupler_hothand']]); return true; }
    if (cs === 'cooled') {
      h.act('use', 0.6, () => {
        this.cs = 'done'; f.l_coupler = true; C.setVisible(true); C.setHeat(0.12); L.shop.engine.setRunning(true); g.audio.play('chest');
        this.story.refreshCast();
        this.chain([['hero', 'l_coupler_settled'], ['nell', 'l_nell_runs']], () => { g.hud.toast('l_toast_engine'); g.save(false); });
      }, 0.3);
      return true;
    }
    return false;
  }
  home(what) {
    const f = this.f, heat = !!f.c1_water || this.story.index >= 2;
    const lines = {
      desk: f.c1_plan ? ['l_desk_1', 'l_desk_plan'] : heat ? ['l_desk_1', 'l_desk_2'] : ['l_desk_0'],
      trunk: ['l_trunk'],
      mend: ['l_mend'],
      meter: heat ? ['l_meter_1', 'l_meter_2'] : ['l_meter_0'],
      bench: f.l_pin ? ['l_bench_after'] : ['l_bench'],
    }[what];
    if (what === 'bench') f.l_benchSeen = true;
    this.chain(lines.map((k) => ['hero', k]));
    return true;
  }

  // ---------------------------------------------------------------- people
  // asked before the chapter: only for moments of these stories (Arthur and the pliers)
  talkFirst(npc) {
    const f = this.f, id = npc.def.id;
    if (id === 'arthur' && f.l_needPliers && !f.l_pliers && !f.l_arPliers) {
      this.chain([['hero', 'l_tw_pliers'], ['arthur', 'l_ar_pliers1'], ['hero', 'l_tw_pliers2'], ['arthur', 'l_ar_pliers2']], () => { f.l_arPliers = true; this.game.save(false); });
      return true;
    }
    return false;
  }
  talk(npc) {
    const g = this.game, f = this.f, id = npc.def.id, h = g.hero;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    const pick = (key) => { const a = t(key); return Array.isArray(a) ? a[(f['l_n_' + key] = ((f['l_n_' + key] ?? -1) + 1) % a.length)] : a; };
    const one = (spk, key) => { g.say('n_' + spk, [pick(key)], null, this.speaker(spk)); return true; };
    switch (id) {
      case 'bram':
        if (!this.open) return c([['bram', 'l_bram_dry']]);
        if (f.l_pump && !f.l_bramThanks) {
          return c([['bram', 'l_bram_done1'], ['bram', 'l_bram_done2']], () => {
            f.l_bramThanks = true; g.pickups.spawn('clover', npc.pos.x, npc.pos.y + 1, npc.pos.z, { pop: true }); g.save(false);
          });
        }
        if (f.l_pump) return one('bram', this.evac ? 'l_bram_evac' : 'l_bram_after');
        if (!f.l_pumpAsk) return c([['bram', 'l_bram_1'], ['bram', 'l_bram_2'], ['hero', 'l_tw_bram'], ['bram', 'l_bram_3']], () => { f.l_pumpAsk = true; g.updateObjective(); g.save(false); });
        return c([['bram', f.l_pin ? 'l_bram_pin' : 'l_bram_wait']]);
      case 'odile':
        if (!this.open) return c([['odile', 'l_odile_0']]);
        if (!f.l_odileMet) return c([['odile', 'l_odile_1'], ['hero', 'l_tw_odile'], ['odile', 'l_odile_2'], ['odile', 'l_odile_3']], () => { f.l_odileMet = true; f.l_crateAsk = true; g.save(false); });
        if (f.l_coupler && !f.l_cleared) {
          return c([['odile', 'l_odile_clear1'], ['hero', 'l_tw_clear'], ['odile', 'l_odile_clear2']], () => {
            f.l_cleared = true; this.L.crate.setState('cleared'); g.audio.play('select'); g.hud.toast('l_toast_cleared'); g.save(false);
          });
        }
        if (f.l_cleared) return one('odile', 'l_odile_after');
        if (f.l_crateOpen) return c([['odile', 'l_odile_wait']]);
        return c([['odile', 'l_odile_2'], ['odile', 'l_odile_3']], () => { f.l_crateAsk = true; });
      case 'nell':
        if (f.l_coupler && f.l_cleared && !f.l_nellPaid) {
          return c([['nell', 'l_nell_pay']], () => {
            f.l_nellPaid = true;
            for (let i = 0; i < 3; i++) g.pickups.spawn('coin', npc.pos.x, npc.pos.y + 1.2, npc.pos.z, { pop: true });
            g.save(false);
          });
        }
        if (f.l_coupler) return one('nell', 'l_nell_after');
        if (this.cs === 'hand' || this.cs === 'tripped') return c([['nell', 'l_nell_c1'], ['nell', 'l_nell_c2']], () => { f.l_nellKnows = true; });
        if (this.cs === 'hot' || this.cs === 'bench') return c([['nell', 'l_nell_hot']]);
        if (this.cs === 'cooled') return c([['nell', 'l_nell_cooled']]);
        if (!f.l_nellMet) return c([['nell', 'l_nell_0'], ['nell', 'l_nell_1']], () => { f.l_nellMet = true; });
        return c([['nell', this.open && (f.c1_water || this.story.index >= 2) ? 'l_nell_posts' : 'l_nell_1']]);
    }
    return false;
  }

  // ---------------------------------------------------------------- the coupler heating
  update(dt) {
    const g = this.game, h = g.hero, L = this.L;
    if (g.state !== 'play') return;
    if (this.cs === 'bench') {
      this.heat += dt * HEAT_RATE;
      L.shop.coupler.setHeat(Math.min(1, this.heat));
      if (this.heat >= HEAT_GLOW && !this.warned) { this.warned = true; g.hud.toast('l_toast_hot'); g.audio.play('alert'); }
      if (this.heat >= HEAT_TRIP) {
        this.cs = 'tripped'; this.heat = 0; L.shop.coupler.setHeat(0); L.shop.engine.setRunning(false);
        g.particles.burst(L.shop.bench.x + 0.75, g.physics.groundAt(L.shop.bench.x, L.shop.bench.z) + 1.1, L.shop.bench.z, '#5a5a5a', 14, 1.5);
        g.audio.play('deny'); g.hud.toast('l_toast_tripped');
      }
    } else if (this.cs === 'hot') {
      this.holdT += dt;
      if (this.holdT >= HOLD_LIMIT || g.room) {
        // too hot to hold: he drops it back on the bench (or leaves it there when he walks off)
        this.cs = 'tripped'; this.holdT = 0; L.shop.coupler.setVisible(true); L.shop.coupler.setHeat(0);
        if (!g.room) { h.damage(1, null); g.hud.toast('l_toast_dropped'); }
      }
    }
  }
}
