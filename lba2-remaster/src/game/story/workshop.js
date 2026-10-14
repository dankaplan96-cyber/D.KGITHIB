// Baldino's workshop, years on: the test pair and the looks at the things in src/game/workshoplife.js. Not a
// chapter: the director (index.js) asks it after the chapter in progress, like the town's life (life.js). Its
// state is flags prefixed w_ (saved with the game).
//
// The Test Pair (from chapter 3, "Zeelich"): Baldino mentions it when he has nothing pressing to say. Two bench
// relays of the kind he later builds for the network (chapter 10) and one heat coupler feeding them:
//   - the lever starts them; the second relay hangs from the old hoist, low behind the flying machine's nose, so
//     it can't see the first and blinks (relays talk by sight); cranking the hoist raises it clear;
//   - with the drip tap shut the coupler heats, glows and trips (couplers overheat); with it open it runs cool;
//   - once they have held together for SYNC_TIME the five SYNC lamps are lit, the pair stays on for good,
//     and Baldino (or his fee tin, when he's out) pays half the shuttle yard's test fee.
// Failures are recoverable (switch on again), nothing on the main path depends on it, and a save made with the
// pair running comes back with it switched off (hoist and tap as they were).
import { ChapterBase } from './base.js';
import '../text/workshop.js';

const HEAT_RATE = 1 / 8;      // tap shut: glows after ~3.6 s, trips at 8 s
const HEAT_GLOW = 0.45, HEAT_TRIP = 1;
const COOL_LEVEL = 0.3;       // tap open: the heat settles here, below the glow
const SYNC_TIME = 10;         // seconds the pair must hold together
const YEARS = 6;              // Baldino's w_bal_y* lines

export class WorkshopLife extends ChapterBase {
  constructor(story) {
    super(story);
    this.on = false; this.heat = 0; this.sync = 0; this.tOn = 0; this.warned = false; this.sightSaid = false;
  }
  get L() { return this.game.rooms.workshop?.life; }
  get open() { const i = this.story.chapters.findIndex((c) => c.key === 'zeelich'); return i >= 0 && this.story.index >= i; }
  // the pair's parts are his to show: from his "At last!" in chapter 3 (c2_plan), or any later chapter
  get ready() { const i = this.story.chapters.findIndex((c) => c.key === 'zeelich'); return this.open && (this.story.index > i || !!this.f.c2_plan); }
  here() { return this.game.room?.id === 'workshop' && !!this.L; }
  // Baldino in his workshop (not at the platform, not away)
  balHere() {
    const b = this.npc('baldino'), c = this.game.rooms.workshop?.center;
    return !!(b && b.present && c && this.here() && Math.hypot(b.pos.x - c.x, b.pos.z - c.z) < 6);
  }

  // ---------------------------------------------------------------- state
  applyFlags() {
    // (a save made with the pair running comes back switched off and cold)
    this.on = false; this.heat = 0; this.sync = 0; this.tOn = 0;
    // (0.25.0 saves could finish the pair and then lower the hoist or shut the tap (REV-TY-2 D1, D2): a finished
    // pair is up and dripping)
    if (this.f.w_pair) { this.f.w_up = true; this.f.w_tap = true; }
    this.push();
    this.L?.snap();
    this.settleOwed('w_owe', 'coin', 5, 'w_toast_owed');
  }
  push() {
    const f = this.f, L = this.L;
    if (!L) return;
    const s = L.state;
    s.on = this.on; s.up = !!f.w_up; s.tap = !!f.w_tap; s.done = !!f.w_pair;
    s.heat = f.w_pair ? 0.18 : this.heat; s.sync = f.w_pair ? 1 : this.sync;
    s.pulse = !f.c10_pulse && !this.game.hero.hasPulse;
  }
  journal() {
    const f = this.f;
    return [
      { key: 'w_j_pair', done: !!f.w_pair, show: f.w_ask || f.w_pair },
      { key: 'w_j_rules', done: true, show: f.w_pair },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- Baldino
  // asked before the chapter, only when chapter 3 has nothing pressing for him (no key to build, no Zoé to call)
  talkFirst(npc) {
    const g = this.game, f = this.f;
    if (npc.def.id !== 'baldino' || !this.here() || this.story.cur?.key !== 'zeelich') return false;
    if (!f.c2_plan || f.c2_shield || (f.c2_cog && f.c2_cyl && !f.c2_key) || (f.c2_key && !f.c2_broadcast)) return false;
    if (!f.w_ask) {
      this.chain([['baldino', 'w_bal_ask1'], ['baldino', 'w_bal_ask2']], () => { f.w_ask = true; g.save(false); });
      return true;
    }
    if (f.w_pair && !f.w_paid) { this.pay(npc); return true; }
    const i = f.w_n = ((f.w_n ?? -1) + 1) % YEARS;
    this.chain([['baldino', f.c2_key ? 'c2_bal_after' : 'c2_bal_wait'], ['baldino', 'w_bal_y' + i]]);
    return true;
  }
  // half the fee: one coin worth five kashes, tossed toward Twinsen (from Baldino's hand, or from the tin)
  pay(at) {
    const g = this.game, f = this.f, to = g.hero.pos;
    const p = at?.pos ? { x: at.pos.x, y: at.pos.y + 1.2, z: at.pos.z } : this.L.tin;
    const a = Math.atan2(to.x - p.x, to.z - p.z);
    f.w_paid = true;
    g.audio.play('bonus');
    // (owed until he picks it up: a save made while it lies on the floor gives it on loading)
    this.reward('w_owe', 'coin', 1, p.x, p.y, p.z, { fly: { vx: Math.sin(a) * 1.13, vy: 3.15, vz: Math.cos(a) * 1.13 }, value: 5 });
    g.save(false);
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    if (!this.open || !this.here()) return;
    const f = this.f, S = this.L.spots, done = !!f.w_pair;
    if (!this.ready) consider(dist(S.lever.x, S.lever.z), S.lever.r, { kind: 'wlook', what: 'pre', label: 'p_look' });   // (before Baldino's hello: hands off)
    else {
      consider(dist(S.lever.x, S.lever.z), S.lever.r, { kind: 'wlever', label: done ? 'p_look' : this.on ? 'p_switch_off' : 'p_switch_on' });
      consider(dist(S.tap.x, S.tap.z), S.tap.r, { kind: 'wtap', label: done ? 'p_look' : f.w_tap ? 'p_tap_close' : 'p_tap_open' });
      consider(dist(S.crank.x, S.crank.z), S.crank.r, { kind: 'wcrank', label: done ? 'p_look' : 'p_crank' });
    }
    // (Ilo's crate is also a giver, shaken by a hop: its look is offered until read, then again once the giver is spent)
    const crateLook = !f.w_crateSeen || this.game.searched.includes('giver:workshop:crate');
    for (const w of ['fan', 'pulse', 'kettle', 'crate']) if (w !== 'crate' || crateLook) consider(dist(S[w].x, S[w].z), S[w].r, { kind: 'wlook', what: w, label: 'p_look' });
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const say = (keys, done) => { this.chain(keys.map((k) => (Array.isArray(k) ? k : ['hero', k])), done); return true; };
    const bal = this.balHere();
    switch (it.kind) {
      case 'wlever':
        if (f.w_pair) return say(['w_pair_after']);
        h.act('use', 0.6, () => {
          if (f.w_pair) return;   // (pressed in the pair's last moment: it finished first)
          this.on = !this.on; this.sync = 0; this.tOn = 0; this.warned = false; this.sightSaid = false;
          g.audio.play(this.on ? 'select' : 'door');
          if (this.on && !f.w_ask) { f.w_ask = true; say(['w_tw_tag']); }
          this.push();
        }, 0.3);
        return true;
      case 'wtap':
        if (f.w_pair) return say(['w_tap_done']);
        h.act('use', 0.5, () => {
          if (f.w_pair) return;
          f.w_tap = !f.w_tap; g.audio.play('select');
          const key = !f.w_tap ? 'w_tap_close' : f.w_tapSeen ? 'w_tap_open' : 'w_tap_open0';
          f.w_tapSeen = true; this.push();
          say([key], () => g.save(false));
        }, 0.25);
        return true;
      case 'wcrank':
        if (f.w_pair) return say(['w_crank_done']);
        h.act('use', 1.0, () => {
          if (f.w_pair) return;
          f.w_up = !f.w_up; g.audio.play('ropeCreak'); this.push();
          if (!f.w_crankSeen) { f.w_crankSeen = true; say(['w_crank0'], () => g.save(false)); } else g.save(false);
        }, 0.3);
        return true;
      case 'wlook': {
        const w = it.what;
        if (w === 'crate') f.w_crateSeen = true;
        if (w === 'pulse' && !this.L.state.pulse) return say(['w_pulse_gone']);
        const lines = {
          pre: ['w_pair_pre'],
          fan: ['w_fan', ...(bal ? [['baldino', 'w_bal_fan']] : [])],
          pulse: ['w_pulse', ...(bal ? [['baldino', 'w_bal_pulse']] : [])],
          kettle: ['w_kettle1', 'w_kettle2', ...(bal ? [['baldino', 'w_bal_kettle']] : [])],
          crate: ['w_crate', ...(bal ? [['baldino', 'w_bal_crate']] : [])],
        }[w];
        return say(lines);
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- the pair running
  update(dt) {
    const g = this.game, f = this.f, L = this.L;
    if (!L) return;
    if (this.on && !this.here()) { this.on = false; this.sync = 0; this.heat = 0; }   // he switched it off on his way out
    if (g.state === 'play' && this.here() && !f.w_pair) {
      if (this.on) {
        this.tOn += dt;
        if (f.w_tap) this.heat += (COOL_LEVEL - this.heat) * Math.min(1, dt * 0.6);
        else this.heat += dt * HEAT_RATE;
        if (this.heat >= HEAT_GLOW && !f.w_tap && !this.warned) { this.warned = true; g.hud.toast('w_toast_hot'); g.audio.play('alert'); }
        if (this.heat >= HEAT_TRIP) this.trip();
        else if (f.w_up && L.lift >= 0.98 && f.w_tap) {
          // (they hold together only while the coupler runs cool: the tap shut, the sync starts again)
          this.sync += dt / SYNC_TIME;
          if (this.sync >= 1) this.success();
        } else {
          this.sync = 0;
          if (!this.sightSaid && this.tOn > 1.5 && !f.w_up) {
            this.sightSaid = true;
            this.chain([['hero', 'w_tw_sight'], ...(this.balHere() ? [['baldino', 'w_bal_sight']] : [])]);
          }
        }
      } else this.heat = Math.max(0, this.heat - dt * 0.25);
    }
    this.push();
  }
  trip() {
    const g = this.game, f = this.f, C = this.L.coupler;
    this.on = false; this.heat = 0; this.sync = 0;
    f.w_trips = (f.w_trips || 0) + 1;
    g.particles.burst(C.x, C.y + 0.1, C.z, '#5a5a5a', 16, 1.5);
    g.audio.play('deny'); g.hud.toast('w_toast_trip');
    this.push();
    this.chain([['hero', 'w_tw_trip'], ...(this.balHere() ? [['baldino', f.w_trips > 1 ? 'w_bal_trip2' : 'w_bal_trip']] : [])]);
  }
  success() {
    const g = this.game, f = this.f, C = this.L.coupler;
    f.w_pair = true; f.w_ask = true; this.on = false; this.sync = 1;
    this.push();
    g.audio.play('chest');
    g.particles.burst(C.x, C.y + 0.4, C.z, '#ffe8a0', 18, 2.5);
    const bal = this.balHere();
    const lines = [['narrator', 'w_pair_ok'], ...(bal ? [['baldino', 'w_bal_ok1'], ['baldino', 'w_bal_ok2']] : [['hero', 'w_tw_ok'], ['hero', 'w_tin']])];
    this.chain(lines, () => { g.hud.toast('w_toast_pair'); this.pay(bal ? this.npc('baldino') : null); });
  }
}
