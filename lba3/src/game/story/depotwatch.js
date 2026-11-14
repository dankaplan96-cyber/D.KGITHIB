// P9 (the user, 7.11.2026, chapter 2's depot valve): "why are there enemies, what do they want, what did I do wrong?
// They don't exist before the water valve is needed and vanish afterwards even if I didn't kill them."
//
// The project depot's watch: two drones, one of Vesk's guards and his dog. They are the project's standing watch over
// its store from the first day of the game (the prologue included) until the depot's bypass valve is opened, and what
// they guard is in plain sight: a fenced yard of project crates and containers, a "Staff Only" sign at the gate and a
// yellow-and-black line painted across the yard (island.js buildDepot). The public path through the depot, between the
// two gates, is everyone's: nobody minds Twinsen on it. The yard past the line, and the valve, are not.
//  - Calm (the default): they walk and fly their round and take no action on what they see (enemies.js/guards.js/
//    guarddog.js: def.calm). This watch looks for them: Twinsen in the yard, seen by any of them.
//  - Each answers in its own way: a drone (a machine) only flashes and calls it in, the dog barks, the guard decides.
//    The first time, the guard warns him and turns him out at the nearest gate (a fade, as Zoé is put back in the
//    project office); nobody is hurt. Saved (c1_depotWarned).
//  - Caught in the yard again after that, or at the valve, or striking any of them: the watch fights, as before (the
//    guards' and drones' own AI: chase, aim, baton, bite). With the guard beaten, the machines no longer warn.
//  - Hostile ends once he is out of the yard and they are all back on their round.
//  - The depot valve opens: the station radios the guard (Vesk has seen the pressure rise and knows it is Twinsen), and
//    the whole watch is called up to the station gate. They walk out of the east gate toward the fortress and are gone
//    only once out of view; nothing pops. After a load they are where they went: no longer at the depot (their `when`).
// The machinery of the fight is untouched; only who starts it, and why, is the story's.
import { t } from '../i18n.js';
import { dampAngle } from '../../engine/math.js';

const GUARD_COLOR = '#9fe0d0';
const RADIO_COLOR = '#a8ffb8';
const CALM_STATES = new Set(['patrol', 'guard', 'home']);

export class DepotWatch {
  constructor(ch) {
    this.ch = ch; this.story = ch.story; this.game = ch.game;
    this.hostile = false;
    this.calmT = 0;
    this.leaving = [];
    this.busy = false;   // (a warning or the radio call under way)
  }
  get f() { return this.game.flags; }
  // the watch, as the chapter's enemy defs are made (story/chapter1.js enemyDefs)
  def(d) { return { ...d, watch: true, calm: () => !this.hostile }; }
  // present from the first chapter until the depot valve is opened (never in a later chapter, whatever a save holds)
  on(f) { return this.story.indexOf(f) <= this.ch.pos && !f.c1_valve_depot; }

  members() { return this.game.enemies.filter((e) => e.def?.watch); }
  live() { return this.members().filter((e) => e.present && e.alive && !e.gone); }
  guard() { return this.live().find((e) => e.def.kind === 'guard'); }

  // where he stands: 'yard' (past the line, or at the valve), 'path' (inside the fence, on the path), 'out'
  zone(p = this.game.hero.pos) {
    const D = this.game.world.depot, Y = D?.yard;
    if (!Y) return 'out';
    const v = D.valve;
    // (by the valve counts as the yard only on the yard's side of the line: the rail on the line (P17) keeps the path
    //  public right in front of it)
    if (v && p.z >= Y.z0 - 0.3 && Math.hypot(p.x - v.x, p.z - v.z) < 2.4) return 'yard';
    if (p.x < Y.x0 || p.x > Y.x1 || p.z > Y.z1) return 'out';
    if (p.z >= Y.z0) return 'yard';
    return p.z > Y.z0 - 6 ? 'path' : 'out';
  }
  // does this one see him (its own look, whatever the calm says)?
  sees(e, h) {
    if (e.def.kind === 'gdog') return e.notices(h, true);
    return e.sees(h, true);
  }

  update(dt) {
    const g = this.game, h = g.hero;
    this.tickLeaving(dt);
    // (a scene of the watch's that never got to its end, a load in the middle of it: let go after a moment of play)
    if (this.busy) { this.busyT = g.state === 'play' && !g.trans ? (this.busyT || 0) + dt : 0; if (this.busyT > 2) this.busy = false; } else this.busyT = 0;
    if (g.room || g.state !== 'play' || g.trans || this.busy || h.dead) return;
    const L = this.live();
    if (!L.length) { this.hostile = false; return; }
    const z = this.zone();
    if (this.hostile) {
      // over once he is out of the yard and they are all back on their round
      const calm = z !== 'yard' && L.every((e) => CALM_STATES.has(e.state));
      this.calmT = calm ? this.calmT + dt : 0;
      if (this.calmT > 2.5) { this.hostile = false; this.calmT = 0; }
      return;
    }
    // struck: the fight is on
    if (L.some((e) => e.recentHitT > 0)) { this.goHostile(); return; }
    if (z !== 'yard') return;
    const spotter = L.find((e) => this.sees(e, h));
    if (spotter) this.spotted(spotter);
  }

  // someone of the watch has seen him in the yard
  spotted(e) {
    const g = this.game, f = this.f, h = g.hero;
    g.audio.play('alert');
    g.hud?.float?.('!', { x: e.pos.x, y: e.pos.y + (e.hover ?? 0) + (e.def.kind === 'gdog' ? 1.5 : 2.4), z: e.pos.z }, e.def.kind === 'drone' ? '#ffb060' : '#e090ff');
    if (e.def.kind === 'drone') { e.rig.mood = 'search'; e.angle = e.angleTo(h); }   // (its eye goes amber: called in)
    const dog = this.live().find((x) => x.def.kind === 'gdog');
    dog?.bark?.();
    const guard = this.guard();
    if (!guard) { this.goHostile(); return; }   // (the machines and the dog alone: no warnings)
    if (!f.c1_depotWarned) { this.warn(guard); return; }
    // he was told: this time it is a fight
    this.busy = true;
    this.say([['guard', 'dw_again']], () => { this.busy = false; this.goHostile(); });
  }

  goHostile() {
    const h = this.game.hero;
    this.hostile = true; this.calmT = 0;
    for (const e of this.live()) e.alert(h.pos);
  }

  // the first time: the guard tells him what he did, and sees him out of the nearest gate
  warn(guard) {
    const g = this.game, f = this.f, h = g.hero, D = g.world.depot;
    this.busy = true;
    f.c1_depotWarned = true;
    // (a turn of the valve's wheel under way is stopped: he did not get to it)
    h.actCb = null; h.actT = 0; h.actNext = null;
    g.resetCombat?.();
    const v = D.valve, atValve = v && Math.hypot(h.pos.x - v.x, h.pos.z - v.z) < 2.4;
    const lines = f.c1_task && !f.c1_valve_depot
      ? [['guard', atValve ? 'dw_warn_valve' : 'dw_warn'], ['hero', 'dw_tw_vesk'], ['guard', 'dw_warn_task']]
      : [['guard', atValve ? 'dw_warn_valve' : 'dw_warn']];
    this.say(lines, () => {
      g.startTransition(() => {
        // out on the path beyond the nearer gate, facing away; the guard at the gate behind him
        const G = D.gates.reduce((a, b) => (Math.hypot(h.pos.x - a.in.x, h.pos.z - a.in.z) <= Math.hypot(h.pos.x - b.in.x, h.pos.z - b.in.z) ? a : b));
        g.resetCombat?.();
        h.pos.set(G.out.x, g.physics.groundAt(G.out.x, G.out.z), G.out.z); h.angle = G.a;
        h.vy = 0; h.onGround = true; h.vel?.set(0, 0); h.reanchor = true;
        g.lastSafe = { x: G.out.x, z: G.out.z };
        guard.pos.set(G.in.x, g.physics.groundAt(G.in.x, G.in.z), G.in.z);
        guard.angle = Math.atan2(G.out.x - G.in.x, G.out.z - G.in.z);
        guard.state = 'patrol'; guard.stateT = 0; guard.waitT = 1.6;
        guard.wp = nearestWp(guard);
        guard.sync?.();
        g.camRig.snap?.();
      }, null, () => {
        this.say([['guard', 'dw_warn_out']], () => { this.busy = false; g.save(false); });
      });
    });
  }

  // the depot valve is open: the station calls the watch up to its gate (story/chapter1.js openValve)
  recall() {
    const g = this.game, L = this.live();
    const wasHostile = this.hostile;
    this.hostile = false; this.calmT = 0;
    for (const e of L) {
      e.present = false;   // (its own mind off: no shots, no bites, not a target; drawn still, moved by tickLeaving)
      if (e.aimLine) e.aimLine.visible = false;
      g.combatDir?.done(e);
    }
    const go = () => {
      const D = g.world.depot, E = D.gates[1], gate = g.world.gate;
      const route = [E.in, E.out, { x: -58, z: -66 }, gate ? { x: gate.x, z: gate.z } : { x: -48, z: -56 }];
      this.leaving = L.map((e, i) => ({ e, t: -0.25 * i, pts: route.map((p) => ({ x: p.x, z: p.z })), i: 0, stuck: 0 }));
    };
    const guard = L.find((e) => e.def.kind === 'guard');
    if (!guard) { go(); return; }
    this.busy = true;
    g.audio.play('radio');   // (the guard's radio: a squelch and a click)
    this.say([['radio', 'dw_radio_1'], ['radio', 'dw_radio_2'], ['guard', wasHostile ? 'dw_go_fight' : 'dw_go']], () => { this.busy = false; go(); });
  }

  // the watch on its way to the station gate; each one is gone the moment it is out of view (and never before)
  tickLeaving(dt) {
    const S = this.leaving, g = this.game;
    if (!S.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i], e = s.e;
      s.t += dt;
      const off = () => { e.setPresent(false); S.splice(i, 1); };
      if (!e.rig.root.visible || !e.alive) { off(); continue; }
      if (s.t > 1.0 && this.ch.unseen(e.pos)) { off(); continue; }
      if (s.t > 90) { off(); continue; }
      if (g.state !== 'play') continue;
      const p = s.pts[s.i], flyer = e.hover != null;
      let sp = 0;
      if (p && s.t > 0.6) {
        const dx = p.x - e.pos.x, dz = p.z - e.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.8) s.i++;
        else {
          e.angle = dampAngle(e.angle, Math.atan2(dx, dz), 4, dt);
          sp = flyer ? 2.0 : e.def.kind === 'gdog' ? 1.7 : 1.5;
          const x0 = e.pos.x, z0 = e.pos.z;
          g.physics.move(e, Math.sin(e.angle) * sp * dt, Math.cos(e.angle) * sp * dt);
          s.stuck = Math.hypot(e.pos.x - x0, e.pos.z - z0) < sp * dt * 0.3 ? s.stuck + dt : 0;
          if (s.stuck > 1.5) { s.stuck = 0; s.i++; }
        }
      }
      if (flyer) { e.rig.mood = 'calm'; e.rig.play?.('idle'); e.rig.update(dt); e.syncHover(); continue; }
      g.physics.fall?.(e, dt);
      e.rig.play(sp ? 'walk' : 'idle');
      e.placeRig?.();
      e.rig.update(dt, sp);
      e.sync();
    }
  }

  // a few lines between the guard (an enemy, not a person of the cast), Twinsen and the guard's radio
  say(lines, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { done?.(); return; }
      const [id, key] = lines[i];
      const guard = this.members().find((e) => e.def.kind === 'guard' && e.alive);
      const sp = id === 'hero' ? g.hero : id === 'guard' ? guard : null;
      const name = id === 'hero' ? 'n_hero' : id === 'guard' ? 'n_dw_guard' : 'n_radio';   // (VOICE-CAST-5: the depot's Quetch guard has a voice of his own, not the pier's Grobo guard's)
      if (guard && id === 'guard') guard.angle = guard.angleTo(g.hero);
      g.say(name, [t(key)], () => next(i + 1), sp, id === 'guard' ? GUARD_COLOR : id === 'radio' ? RADIO_COLOR : null);
    };
    next(0);
  }
}

function nearestWp(e) {
  let best = 0, bd = Infinity;
  (e.patrol || []).forEach(([x, z], i) => { const d = Math.hypot(x - e.pos.x, z - e.pos.z); if (d < bd) { bd = d; best = i; } });
  return best;
}
