// I-24: the found-object ceremony. When Twinsen receives a real inventory object (the magic ball, a key, a quest
// item, a weapon; never kashes, hearts, magic or clover bonuses), the world stops as for a dialogue, the camera holds,
// he turns to face it and dances his "found" dance (rig.js FOUND), and a framed box near the top of the screen shows
// the object large and turning, with its name under it. Any key or button continues (after a short beat, so the key
// that took it can't skip it), or it continues by itself.
//
// Measured from LBA2 (INVENT.CPP DoFoundObj, the GPL source; and the user's ANIM.HQR for the dance):
//   the box: x 256-384, y 48-178 of the 640 x 480 screen: centred, its top at 10 % of the height, 27 % of the height
//     tall, nearly square (128 x 130); the inside shaded darker (ShadeBoxBlk level 8), a thin frame (DrawCadre)
//   it grows from its centre in 400 ms (BoundRegleTrois 20*20) and shrinks away in 300 ms (15*20)
//   the object turns 2 units of 4096 a millisecond: a turn in 2.05 s (itemlook.js TURN.found)
//   Twinsen first turns to face the camera in 500 ms (25*20, with the turn-left/right animation), dances (TROUVE)
//     until the player continues, then turns back to where he faced in 400 ms (20*20) and stands
//   the original waits for a key (a demo slide ends 4 s after the text); here it also ends by itself after AUTO s.
import { t } from './i18n.js';
import { stage, lookOf, TURN } from './itemlook.js';

const GROW = 0.4, SHRINK = 0.3, TURN_IN = 0.5, TURN_OUT = 0.4;
const SKIP_AFTER = 0.5;   // a key counts from here (the box is full; the key that took the object is let go)
const AUTO = 3.0;         // seconds from the start it continues by itself

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class FoundObject {
  constructor(game) {
    this.game = game;
    this.q = [];        // waiting: [{ look, name, then }]
    this.cur = null;    // the one showing
    this.shown = [];    // what has been shown (tests, and the report of a session)
    this.el = document.querySelector('#found');
  }
  get active() { return !!this.cur; }

  // Twinsen receives an object. id: the item's id (its look: itemlook.js lookOf), nameKey: its name's text key,
  // then: what follows once the box has gone (a line, a toast). With `then` in play it shows at once; otherwise it
  // waits for the next frame of play, so whatever the caller goes on to do (a line of dialogue, a scene) comes first
  // and never runs under the box. Bought at a stall, it waits till he leaves the stall (several in turn), the coin's
  // sound saying the purchase was made.
  give(id, nameKey, then = null, { icon } = {}) {
    const it = { look: lookOf(id, icon), id, name: t(nameKey), then };
    const s = this.game.state;
    if (!this.cur && then && s === 'play') this.start(it);
    else { this.q.push(it); if (s === 'shop') this.game.audio.play('coin'); }
  }
  // each frame of play (main.js updatePlay): the next waiting one; true if one started. (A box something else took
  // the screen from — a scene started under it — is closed first: nothing is left on screen.)
  next() {
    if (this.cur) { this.finish(); return true; }
    if (!this.q.length) return false;
    this.start(this.q.shift());
    return true;
  }
  start(it) {
    const g = this.game, h = g.hero, cam = g.camera.position;
    const face = Math.atan2(cam.x - h.pos.x, cam.z - h.pos.z);
    this.cur = { ...it, t: 0, out: -1, a0: h.angle, face, turn: wrap(face - h.angle) };
    this.shown.push(it.id);
    g.setState('found');
    g.audio.play('found');   // (ACTION-SOUND: a real object's own short gesture; kashes and bonuses never get it)
    h.combat?.reset?.();
    const el = this.el;
    el.querySelector('.found-name').textContent = it.name;
    el.classList.remove('hidden', 'out');
    void el.offsetWidth;   // (restart the grow)
    el.classList.add('in');
    document.body.classList.add('found-on');
    stage.spin([{ look: it.look, rate: TURN.found, canvas: el.querySelector('canvas') }]);
  }

  // state 'found' (main.js frame): the hero's turn and dance, the box, the keys
  update(dt, input) {
    const c = this.cur, g = this.game, h = g.hero;
    if (!c) { g.setState('play'); return; }
    c.t += dt;
    stage.tick(dt);
    if (c.out < 0) {
      // turning to the camera, then the dance
      const k = Math.min(1, c.t / TURN_IN);
      h.angle = c.a0 + c.turn * k;
      h.rig.play(k < 1 && Math.abs(c.turn) > 0.2 ? (c.turn > 0 ? 'turnL' : 'turnR') : 'found');
      if ((c.t >= SKIP_AFTER && input.anyPressed()) || c.t >= AUTO) this.leave();
    } else {
      c.out += dt;
      const k = Math.min(1, c.out / TURN_OUT);
      h.angle = c.face + wrap(c.a0 - c.face) * k;
      h.rig.play('idle');
      if (c.out >= Math.max(TURN_OUT, SHRINK)) this.finish();
    }
    h.syncSword?.(); h.rig.update(dt, 0); h.sync();
    for (const n of g.npcs) n.update(dt);
    g.occluders?.(dt);
  }
  leave() {
    const c = this.cur;
    c.out = 0;
    this.el.classList.remove('in');
    this.el.classList.add('out');
  }
  finish() {
    const c = this.cur, g = this.game;
    this.cur = null;
    this.el.classList.add('hidden');
    this.el.classList.remove('in', 'out');
    document.body.classList.remove('found-on');
    stage.spin(null);
    g.hero.angle = c.a0;
    g.setState('play');
    c.then?.();
  }
  // a scene change, a load, the title: nothing is left on screen or waiting
  reset() {
    if (this.cur) { this.el.classList.add('hidden'); this.el.classList.remove('in', 'out'); document.body.classList.remove('found-on'); stage.spin(null); }
    this.cur = null; this.q = [];
  }
}
