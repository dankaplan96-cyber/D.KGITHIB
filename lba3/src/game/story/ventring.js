// #18 / #28 (?ch7stage=new, src/game/ch7stage.js; docs/lba-maturity/CH7-STAGE.md): chapter 7's vent seal as "the
// mountain's pulse", in place of the five discs that repeated chapter 4's dig. Not a chapter: story/observatory.js owns
// it and asks it first while the switch is on.
//
// The whole chapter the mountain has kicked in threes (the rope lift's line, story/passline.js; on the ridge the snow
// jumped beside him with each kick, and he said so). Under the melted cap the seal sits in a stone ring with an arrow cut
// in it, and five grooves run out from it across the ice (hamalayi.js → ventseal.js). The steam still pushes along one of
// them: on each kick its stones jump and the snow flies along it, farther out kick by kick; its ice is darker and wet. The arrow
// rests on the groove toward the descent, a dead one. He turns the ring a notch at a time (E at the seal); when a kick
// comes with the arrow on the live groove and the ring at rest, the steam finds its way and the vent opens as before.
// A kick with the arrow on a dead groove jolts the ring where it stands: the first time he says what he sees (the seal
// jolts; out on the ice the snow jumps along one of the grooves); later a short toast if he has turned it since.
// Nothing fails or resets: a wrong try costs the wait for the next kick (the line's rest, 11 s at most).
// Mashing E keeps the ring moving, and a moving ring is never read (it must have stood still for STILL s), so the stage
// is not solved by pressing at random. Two nudges if he stands there turning nothing: watch the grooves, then the arrow.
//
// Flags: c7_sealSeen (shared with the discs: the seal looked at), c7r_jolt (his line said once). The ring's notch is not
// saved: a load puts the arrow back on its rest (the vent open: on the live groove). A save from the discs' game loads
// here with the stage ahead (its c7_free flags are not read); a save from here loads in the discs' game with theirs.
// When the line itself is not running (a chapter-7 save from before CAMPAIGN-5 has no ob_v/ps_v), the stage keeps the
// line's own rhythm on a clock of its own, so the kicks still come.
import { CH7_NEW } from '../ch7stage.js';
import { PULSE } from '../winchline.js';
import '../text/ch7.js';

const STILL = 1.2;   // (s the ring must have stood at rest for a kick to read it)

export class VentRing {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.prevPh = null; this.ownT = 0; this.turnAt = -1e9; this.turned = false; this.kicks = 0; }
  get f() { return this.game.flags; }
  get M() { return this.game.regions?.built('hamalayi'); }
  get R() { return this.M?.ventRing; }
  on() { return CH7_NEW; }
  inM() { return this.game.room?.id === 'hamalayi'; }
  // the stage is there: the cap melted by the telescope, the vent still shut (the kicks show on the live groove)
  open() { const f = this.f; return CH7_NEW && !!this.R && this.ch.isCur() && !!f.c7_scope && !f.c7_vent; }
  // the ring can be worked: the drone is down
  ready() { return this.open() && !!this.f.c7_droneDown; }

  applyFlags() {
    this.prevPh = null; this.turned = false;
    this.game.regions.whenBuilt('hamalayi', (M) => { const R = M.ventRing; if (R) { R.set(this.f.c7_vent ? R.live : 0); R.setOpen(!!this.f.c7_vent); } });
  }
  interactables(consider, dist) {
    const f = this.f, R = this.R, V = this.M?.vent, h = this.game.hero;
    if (!this.ready() || !this.inM() || !V || R.moving || h.actT > 0) return;
    consider(dist(V.x, V.z), 4.2, f.c7_sealSeen ? { kind: 'c7ring', label: 'p_ring' } : { kind: 'c7vent', label: 'p_vent' });
  }
  interact(it) {
    const g = this.game, f = this.f, R = this.R, V = this.M?.vent, h = g.hero;
    if (!this.on() || !R || !V) return false;
    if (it.kind === 'c7vent') {
      f.c7_sealSeen = true;
      this.ch.chain([['hero', 'c7r_seal']], () => { g.updateObjective(); g.save(false); });
      return true;
    }
    if (it.kind !== 'c7ring') return false;
    h.actAt(V.x, V.z, 'use', 0.8, () => {
      if (!R.turn(() => g.audio.play('clunk', V))) return;
      g.audio.play('gearClack', V); g.particles.burst(V.x, g.physics.groundAt(V.x, V.z) + 0.3, V.z, '#e6eef8', 6, 1.2);
      this.turnAt = g.time; this.turned = true;
    }, 0.25);
    return true;
  }
  // the line's phase: its own clock while it runs; else the same rhythm on ours (only while in the Hamalayi and in play)
  phase(dt) {
    const L = this.M?.line;
    if (L?.active) return L.phase();
    if (this.game.state === 'play') this.ownT += dt;
    return this.ownT % PULSE.period;
  }
  update(dt) {
    const g = this.game, f = this.f;
    if (!this.open() || !this.inM()) { this.prevPh = null; return; }
    const ph = this.phase(dt), p0 = this.prevPh;
    this.prevPh = ph;
    if (p0 != null) PULSE.kicks.forEach((k, i) => { if (ph >= p0 ? k > p0 && k <= ph : k > p0 || k <= ph) this.kick(i); });
    // (HINTS-LESS: the seal looked at, then a while with nothing turned: first the grooves, later the arrow)
    const stuck = this.ready() && !!f.c7_sealSeen && g.time - this.turnAt > 20;
    this.ch.nudge(dt, 'c7r_watch', stuck, 45, 'c7r_nudge_watch');
    this.ch.nudge(dt, 'c7r_arrow', stuck, 90, 'c7r_nudge_arrow');
  }
  // a kick of the mountain: the snow jumps along the live groove, farther out kick by kick; the first one of a pulse
  // reads the ring
  kick(i) {
    const g = this.game, f = this.f, R = this.R, V = this.M.vent, h = g.hero;
    this.kicks++;
    const p = R.at(R.live, 0.17 + 0.333 * i), near = Math.hypot(h.pos.x - V.x, h.pos.z - V.z);
    R.hop(i);   // (that length of the groove's stones jumps)
    if (near < 70) {
      // (powder along that third of the groove, and grey-blue chips of its ice, which read against the white)
      for (const t of [0.06, 0.17, 0.28]) { const q = R.at(R.live, t + 0.333 * i); g.particles.burst(q.x, q.y + 0.3, q.z, '#f4f8ff', 26, 3.2); g.particles.burst(q.x, q.y + 0.2, q.z, '#8fa8bc', 8, 2.4); }
      g.audio.play('pipeKnock', p);
    }
    if (i !== 0 || !this.ready() || !f.c7_sealSeen || g.state !== 'play' || R.moving) return;
    if (R.aligned() && R.still >= STILL) { this.success(); return; }
    if (R.aligned()) return;   // (just set there: the next kick reads it)
    R.jolt(); g.audio.play('clang', V);
    if (near > 25) return;
    if (!f.c7r_jolt) { f.c7r_jolt = true; this.turned = false; this.ch.chain([['hero', 'c7r_jolt']], () => g.save(false)); }
    else if (this.turned) { this.turned = false; g.hud.toast('c7r_toast_jolt'); }
  }
  // the arrow on the live groove: the kick runs up it into the seal, and the vent opens (observatory.js openVent)
  success() {
    const g = this.game, R = this.R;
    for (const t of [0.6, 0.35, 0.1]) { const p = R.at(R.live, t); g.particles.burst(p.x, p.y + 0.3, p.z, '#f4f8ff', 26, 3.2); }
    g.audio.play('rumble'); g.camRig.shake(0.3);
    this.ch.openVent([['hero', 'c7r_there']]);
  }
  objective() {
    const f = this.f;
    if (!this.ready() || !f.c7_sealSeen) return null;
    return this.ch.goal('c7r_obj');
  }
}
