// OPENING-TUT-2 (P31, the user, 15.11.2026: "there wasn't really a tutorial of the first stage; I just took the ball and
// went outside"). P22's tips were all optional and timed out, so a player who walked from the cupboard to the well saw
// one tip in the house and none in the yard (measured: OPENING-TUT-2.md). Now the yard is a short errand for Zoé, one
// step at a time, each needing one of the basic skills, and she calls him back if he heads off before it is done.
//
//   house   ball     Take your magic ball from the cupboard      walk, use with the hand   (the door waits for it, as before)
//           out      Go out to the yard                          (the door)
//   yard    zoe      Talk to Zoé                                 talk, dialogue            her kettle (pr_kettle), the found box
//           inv      Look at the Kettle Crystals in your inventory   the inventory key     (tut 'inventory')
//           tap      Try the garden tap                          use with the hand         (pr_yard: hometap.js)
//           barrels  Hit the barrels with the magic ball         the ball, a visible hit   (pr_barrel: prologue.js ballHit)
//           pipe     Jump over the project's pipe                Athletic, a running jump  (pr_pipe: cleared, or three tries)
//
// The current step is the first not done, so anything done early counts and is skipped. Each step: one goal line in the
// tip panel (tutorial.js; always shown, Settings, Show control tips only hides its keys), a short line from Zoé over her
// head as it begins, a tick and a chime as it is done. The yard's edge: 15 m from the front door (the lane's water gate
// is 16.7 m up the lane): crossed before the last step, Zoé calls him (a line in the box, her voice) and he turns and walks
// back a few steps. Not a wall: a person in the story with something to ask. An expert finishes the yard in well under
// two minutes; nothing waits on a timer, nothing can be failed (a pipe not cleared in three tries is "close enough").
//
// Flags (saved): pr_tut2 (a game begun with these steps: story/prologue.js afterOpening), pr_pipe (1 cleared, 2 close
// enough), pr_yardOk (the yard done: the edge is open, the well's objective and star come back). A save without pr_tut2
// (every save from before this build) never sees a step or a call. A save with pr_tut2 that is somehow already past the
// yard's edge is let go (pr_yardOk), never pulled back.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { dampAngle, angleDiff } from '../../engine/math.js';
import '../text/opening.js';

export const STEPS = ['ball', 'out', 'zoe', 'inv', 'tap', 'barrels', 'pipe'];
export const YARD_STEPS = ['zoe', 'inv', 'tap', 'barrels', 'pipe'];
const LEASH = 15;          // m from the front door: the yard's edge while a yard step is open
const BACK = 3.2;          // m he walks back in when called
// the project's copper heat pipe along the lane's east side (tutorial.js PIPE, lanegate.js): 0.6 m high
const PIPE = { x: -43.5, z0: 66.0, z1: 72.1 };
const HOME = new Set(['house', 'cellar']);
const TRIES = 3;           // jumps at the pipe before Zoé lets it go

export class OpeningSteps {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.reset(); }
  reset() {
    this.last = undefined; this.asked = new Set(); this.say = null; this.calls = 0; this.callsFor = {};
    this.air = false; this.takeoff = 0; this.tries = 0; this.prevD = null; this.graceD = 0; this.back = null;
    this.hideBubble();
  }
  get f() { return this.game.flags; }
  // the steps run: a game begun with them, chapter 1, the yard not done yet
  get on() { const f = this.f; return !!f.pr_tut2 && !f.pr_yardOk && !f.prologueDone && this.ch.isCur(); }
  door() { return this.game.world.houses[0].door; }
  fromDoor() { const d = this.door(), p = this.game.hero.pos; return Math.hypot(p.x - d.x, p.z - d.z); }
  inHouse() { return HOME.has(this.game.room?.id); }   // (the house and its cellar: P23)

  isDone(id) {
    const g = this.game, f = this.f;
    switch (id) {
      case 'ball': return !!g.hero.hasBall;
      case 'out': return !this.game.room;
      case 'zoe': return !!f.pr_kettle;
      case 'inv': return g.tutorial.done.has('inventory');
      case 'tap': return !!f.pr_yard;
      case 'barrels': return !!f.pr_barrel;
      case 'pipe': return !!f.pr_pipe;
    }
    return true;
  }
  yardDone() { return YARD_STEPS.every((id) => this.isDone(id)); }
  current() {
    if (!this.on) return null;
    for (const id of STEPS) if (!this.isDone(id)) return id;
    return null;
  }
  // what the tip panel shows (tutorial.js): the current step where he is (the house, the yard), else nothing
  panelStep() {
    const g = this.game;
    if (!this.on || g.trans) return null;
    if (g.room && !this.inHouse()) return null;
    return this.current();
  }
  // the yard's progress for the panel's dots: [done, of]
  progress() { return [YARD_STEPS.filter((id) => this.isDone(id)).length, YARD_STEPS.length]; }

  // ---------------------------------------------------------------- the story's hooks (prologue.js)
  // the objective's sub-step while a step runs (the brief panel shows the goal, "Check the well")
  objective() { const id = this.current(); return id ? t('t2_goal_' + id) : null; }
  // the minimap's and holomap's star: the step's place, not the well yet
  markers() {
    const id = this.current(), g = this.game, Y = this.ch.home.parts.yard, T = this.ch.barrels?.();
    const star = (x, z, label) => ({ x, z, kind: 'star', color: '#ffcf4a', r: 4, edge: true, ...(label ? { label } : {}) });
    const z = this.ch.npc('zoe');
    switch (id) {
      case 'out': case 'zoe': case 'inv': return z?.present ? [star(z.pos.x, z.pos.z, t('n_zoe'))] : [];
      case 'tap': return Y ? [star(Y.x, Y.z)] : [];
      case 'barrels': return T ? [star(T.x, T.z)] : [];
      case 'pipe': return [star(PIPE.x, (PIPE.z0 + PIPE.z1) / 2)];
    }
    return [];
  }
  // Zoé asked again while a step is open: what she wants now (the same line as her bubble)
  talk() {
    const id = this.current();
    if (!id || !YARD_STEPS.includes(id) || id === 'zoe' || this.game.room) return false;
    this.ch.chain([['zoe', 't2_ask_' + id]]);
    this.asked.add(id);
    return true;
  }
  applyFlags() { this.reset(); }
  // the inventory key pressed during the inventory's step: it opens on the item she asked him to look at (tutorial.js,
  // before the game opens it)
  onInventory() {
    const inv = this.game.inventory;
    if (this.current() !== 'inv' || !inv?.items) return;
    const i = inv.items().findIndex((it) => it.id === 'kettle');
    if (i >= 0) inv.sel = i;
  }

  // ---------------------------------------------------------------- every frame in play (prologue.js update)
  update(dt) {
    const g = this.game, f = this.f, h = g.hero;
    this.bubble(dt);
    if (!this.on) { if (this.last !== undefined) this.last = undefined; return; }
    // already well past the yard's edge without walking across it (a save is a file; a test or a scene puts him
    // there): let the yard go, never pull him back. Walking, he is called at the edge itself, a frame's step past it
    const d = g.room ? null : this.fromDoor();
    if (d != null && d > LEASH + 4 && (this.prevD == null || d - this.prevD > 2.5 || this.prevD > LEASH + 3)) { this.prevD = d; f.pr_yardOk = true; g.updateObjective(); return; }
    this.prevD = d;
    if (g.state !== 'play') return;
    this.watchPipe(h);
    const cur = this.current();
    if (cur !== this.last) {
      const prev = this.last;
      this.last = cur;
      if (prev && YARD_STEPS.includes(prev) && this.isDone(prev)) { g.tutorial?.stepOk?.(prev); g.audio.play('bonus'); }   // (the ball's own found box is its feedback; the door needs none)
      g.updateObjective();
      if (cur && YARD_STEPS.includes(cur) && !this.asked.has(cur)) { this.asked.add(cur); this.say = { key: cur === 'zoe' ? 't2_zoe_call' : 't2_ask_' + cur, t: prev ? 0.9 : 0.3 }; }
    }
    // all five done: her last word, the well's objective and its star come back, the edge opens
    if (!cur && this.yardDone() && !g.room) { this.finish(); return; }
    if (this.say && (this.say.t -= dt) <= 0) { const k = this.say.key; this.say = null; this.speak(k); }
    // the yard's edge: Zoé calls him back (again only if he goes on further than where her last call left him: a walk
    // back that something blocked never turns into a string of calls)
    if (d != null && !g.trans && !h.steer && h.onGround && cur && YARD_STEPS.includes(cur) && d > Math.max(LEASH, this.graceD + 1)) this.callBack(cur);
    else if (d != null && d < LEASH - 0.5) this.graceD = 0;
  }
  finish() {
    const g = this.game, f = this.f;
    f.pr_yardOk = true;   // (the last step's tick and chime: update(), as for every step)
    this.speak(f.pr_pipe === 2 ? 't2_zoe_close' : 't2_zoe_done', 3.4);
    g.updateObjective();
    g.save(false);
  }

  // the pipe: a jump that takes off on one side and comes down on the other, along its length; or three tries at it
  watchPipe(h) {
    const f = this.f;
    if (f.pr_pipe) return;
    const near = (p, m) => p.z > PIPE.z0 - m && p.z < PIPE.z1 + m && Math.abs(p.x - PIPE.x) < 3.5;
    const air = !!h.gravity && !h.onGround;
    if (air && !this.air) {
      this.takeoff = near(h.pos, 0.3) ? Math.sign(h.pos.x - PIPE.x) : 0;
      if (this.takeoff && this.current() === 'pipe') this.tries++;
    }
    if (!air && this.air && h.onGround && this.takeoff) {
      if (near(h.pos, 1.2) && Math.sign(h.pos.x - PIPE.x) !== this.takeoff) { f.pr_pipe = 1; this.game.save(false); }
      else if (this.tries >= TRIES && this.current() === 'pipe') { f.pr_pipe = 2; this.game.save(false); }
      this.takeoff = 0;
    }
    this.air = air;
  }

  // Zoé calls him back: her line (in the box, her voice), then he turns and walks a few steps back toward the door
  callBack(cur) {
    const g = this.game, ch = this.ch, h = g.hero, d = this.door();
    // (her line names the step; every second call for the same step, a plainer one: the panel names it all along)
    const n = this.callsFor?.[cur] || 0;
    (this.callsFor ||= {})[cur] = n + 1;
    this.calls++;
    h.resetMotion?.();
    ch.chain([['zoe', n % 2 ? 't2_back_again' : 't2_back_' + cur]], () => {
      const dx = d.x - h.pos.x, dz = d.z - h.pos.z, dd = Math.hypot(dx, dz) || 1;
      this.back = { x: h.pos.x + (dx / dd) * BACK, z: h.pos.z + (dz / dd) * BACK, t: 0 };
      g.setState('cutscene');
      g.cutscene = (dt2) => this.walkBack(dt2);
    });
  }
  walkBack(dt) {
    const g = this.game, h = g.hero, S = this.back, P = g.physics;
    if (!S) { this.endBack(); return; }
    S.t += dt;
    const dx = S.x - h.pos.x, dz = S.z - h.pos.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
    h.angle = dampAngle(h.angle, want, 9, dt);
    const facing = Math.abs(angleDiff(h.angle, want)) < 0.6;
    let sp = 0;
    if (d > 0.12 && S.t < 3.5) {
      if (facing) { sp = Math.min(2.2, d * 4 + 0.6); const k = Math.min(d, sp * dt) / d; P.move(h, dx * k, dz * k); }
      P.fall(h, dt);
      h.rig.play(sp > 0.1 ? 'walk' : 'idle'); h.rig.update(dt, sp); h.sync();
      return;
    }
    this.endBack();
  }
  endBack() {
    const g = this.game;
    this.back = null;
    this.graceD = this.fromDoor();
    g.hero.resetMotion?.();
    if (g.state === 'cutscene') { g.cutscene = null; g.setState('play'); }
  }

  // ---------------------------------------------------------------- Zoé's word over her head (one element, in play only)
  speak(key, dur) {
    const z = this.ch.npc('zoe');
    if (!z?.present || typeof document === 'undefined') return;
    const text = t(key);
    this.bub = { n: z, t: dur ?? Math.min(4.2, 1.4 + text.length * 0.045), key };
    const el = this.bubEl();
    el.textContent = text;
    el.style.borderRadius = document.body.classList.contains('hud-lba') ? '0' : '9px';
    el.style.fontSize = document.body.classList.contains('big-text') ? '18px' : '15px';
    (this.saidLog ||= []).push(key);   // (what she said, for the tests)
  }
  bubEl() {
    if (this._el) return this._el;
    const host = document.getElementById('floats') || document.body;
    const el = (this._el = document.createElement('div'));
    el.className = 'zoebark';
    Object.assign(el.style, { position: 'absolute', transform: 'translate(-50%, -100%)', maxWidth: '300px', padding: '5px 11px', background: 'rgba(6, 12, 20, 0.86)',
      border: '1px solid #ffb0d0', color: '#fff', fontWeight: '500', lineHeight: '1.3', textAlign: 'center', textShadow: '0 1px 2px #000', pointerEvents: 'none', display: 'none', whiteSpace: 'normal', width: 'max-content' });
    host.appendChild(el);
    // (out of play, the box, a menu, the found box: out of the way; update() does not run there)
    const st = document.createElement('style'); st.textContent = 'body.hud-busy .zoebark, body.found-on .zoebark { visibility: hidden; }'; document.head.appendChild(st);
    return el;
  }
  hideBubble() { if (this._el && this._el.style.display !== 'none') this._el.style.display = 'none'; this.bub = null; }
  bubble(dt) {
    const B = this.bub, g = this.game;
    if (!B) return;
    if (g.state !== 'play') { if (this._el) this._el.style.display = 'none'; return; }   // (the box, a menu: out of the way; the time waits)
    B.t -= dt;
    const n = B.n;
    if (B.t <= 0 || !n.present || g.room) { this.hideBubble(); return; }
    if (n._zbTop == null) { const b = new THREE.Box3().setFromObject(n.rig.root); n._zbTop = Math.max(1.2, b.max.y - n.pos.y); }
    const v = (this._v ||= new THREE.Vector3()).set(n.pos.x, n.pos.y + n._zbTop + 0.25, n.pos.z).project(g.camera);
    const el = this._el;
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { el.style.display = 'none'; return; }
    el.style.left = ((v.x + 1) / 2 * innerWidth).toFixed(0) + 'px';
    el.style.top = ((1 - v.y) / 2 * innerHeight).toFixed(0) + 'px';
    el.style.opacity = String(Math.min(1, B.t / 0.3));
    if (el.style.display !== 'block') el.style.display = 'block';
  }
}
