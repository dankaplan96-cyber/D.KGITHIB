// OPENING-TUT-2 (P31, the user, 15.11.2026: "there wasn't really a tutorial of the first stage; I just took the ball and
// went outside"). P22's tips were all optional and timed out, so a player who walked from the cupboard to the well saw
// one tip in the house and none in the yard (measured: OPENING-TUT-2.md). Now the yard is a short errand for Zoé, one
// step at a time, each needing one of the basic skills (TUT-MYSTERY: since 20.11 clues on the way, never a gate: below).
//
//   house   ball     Take your magic ball from the cupboard      walk, use with the hand   (the door waits for it, as before)
//           out      Go out to the yard                          (the door)
//   yard    zoe      Talk to Zoé                                 talk, dialogue            her kettle (pr_kettle), the found box
//           inv      Look at the Kettle Crystals in your inventory   the inventory key     (tut 'inventory')
//           tap      Try the garden tap                          use with the hand         (pr_yard: hometap.js)
//           dino     Sneak up to the sleeping Dino-Fly, pet him  Discreet, the hand key    (pr_dino: dinofly.js)
//           barrels  Hit the barrels with the magic ball         the ball, a visible hit   (pr_barrel: prologue.js ballHit)
//           pipe     Switch to Athletic, jump the project's pipe Athletic, a running jump  (pr_pipe: cleared, or three tries)
//
// BEHAVIOUR-MODES (P125, the user's pick 24.11, proposal 3): 'dino', a short step for Discreet. The Dino-Fly naps on the
// yard's west lawn (dinofly.js DINO_AT: LBA2's own spot is outside the yard's edge); in Normal, Athletic or Aggressive he
// hears Twinsen at 9 m and wakes; in Discreet he does not. Asleep, the hand key strokes him (pr_dino). Nothing fails and
// nothing is timed: woken, he dozes off again 3 s after he last heard him, and Zoé says so once in a while
// (t2_dino_woke). Petted early, it counts. On ?dino=lba2 (he naps on his shelf outside the yard) the step is left out.
// The pipe step asks for the switch to Athletic in its goal: walked round after the switch, it ends as he leaves the yard
// ("close enough"); walked round in another behaviour, the yard lets go as before (Zoé's one call).
//
// The current step is the first not done, so anything done early counts and is skipped. Each step: one goal line in the
// tip panel (tutorial.js; always shown, Settings, Show control tips only hides its keys), a short line from Zoé over her
// head as it begins, a tick and a chime as it is done. The yard's edge: 15 m from the front door (the lane's water gate
// is 16.7 m up the lane): crossed before the last step, Zoé called him (until TUT-MYSTERY; now one call and he goes on) and he turned and walked
// back a few steps. Not a wall: a person in the story with something to ask. An expert finishes the yard in well under
// two minutes; nothing waits on a timer, nothing can be failed (a pipe not cleared in three tries is "close enough").
//
// Flags (saved): pr_tut2 (a game begun with these steps: story/prologue.js afterOpening), pr_pipe (1 cleared, 2 close
// enough), pr_yardOk (the yard done: the edge is open, the well's objective and star come back). A save without pr_tut2
// (every save from before this build) never sees a step or a call. A save with pr_tut2 that is somehow already past the
// yard's edge is let go (pr_yardOk), never pulled back.
//
// TUT-MYSTERY (REVIEW-TASKS-19-11 task 4, the user, 19.11: the opening tutorial as part of the water mystery; with
// PUZZLES item 1 and P81 scene 4, 20.11): the yard's steps are clues on the way to the well, not a gate.
//   - no call back and no walk back: crossing the yard's edge with steps open lets the yard go (pr_yardOk) and Zoé
//     calls once, over her head (pinned to the screen's edge with her name when she is out of view), with what matters
//     on the main route: the kettle if he has not taken it (Mira wants proof), else "show Mira the crystals". Control
//     stays with the player all along. Nothing is granted for a step left undone.
//   - the tap (hometap.js): dry, and the knock answers from behind the near barrel at the house's corner (it rocks, Zoé
//     turns to look); the ball (prologue.js revealJoint) knocks that barrel aside: the joint he mended yesterday held,
//     but it weeps warm water and is furred like the kettle. A kick does it too; a shove by hand gets a word, not a beep.
//   - the pipe: over it is the straight line from the yard north; walked round, the step ends as he leaves the yard.
//   - the map's star and the world's marker on the same thing as the panel: none on the inventory's step (a key, not a
//     place) and none on the door's (the marker on the door is enough); the barrels' on the near barrel.
import * as THREE from 'three';
import { t } from '../i18n.js';
import '../text/opening.js';

export const STEPS = ['ball', 'out', 'zoe', 'inv', 'tap', 'dino', 'barrels', 'pipe'];
export const YARD_STEPS = ['zoe', 'inv', 'tap', 'dino', 'barrels', 'pipe'];
const LEASH = 15;          // m from the front door: the yard's edge while a yard step is open
// the project's copper heat pipe along the lane's east side (tutorial.js PIPE, lanegate.js): 0.6 m high
const PIPE = { x: -43.5, z0: 66.0, z1: 72.1 };
const HOME = new Set(['house', 'cellar']);
const TRIES = 3;           // jumps at the pipe before Zoé lets it go
const DINO_NEAR = 6;       // m round the Dino-Fly that count as the yard while his step is open (he naps near its edge)
const WOKE_AGAIN = 14;     // s at least between two of Zoé's "he heard you" 

export class OpeningSteps {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.reset(); }
  reset() {
    this.last = undefined; this.asked = new Set(); this.say = null; this.left = null;
    this.air = false; this.takeoff = 0; this.tries = 0; this.prevD = null;
    this.woke = null; this.wokeSaid = -99;
    this.hideBubble();
  }
  get f() { return this.game.flags; }
  // the steps run: a game begun with them, chapter 1, the yard not done yet
  get on() { const f = this.f; return !!f.pr_tut2 && !f.pr_yardOk && !f.prologueDone && this.ch.isCur(); }
  door() { return this.game.world.houses[0].door; }
  fromDoor() { const d = this.door(), p = this.game.hero.pos; return Math.hypot(p.x - d.x, p.z - d.z); }
  inHouse() { return HOME.has(this.game.room?.id); }   // (the house and its cellar: P23)
  // the Dino-Fly (dinofly.js: his pet entry, its state) and whether he naps inside the yard (else his step is left out)
  dino() { return this.game.world?.pets?.find((p) => p.id === 'dinofly') || null; }
  dinoInYard() { const p = this.dino(), d = this.door(); return !!p && Math.hypot(p.x - d.x, p.z - d.z) < LEASH - 2; }

  isDone(id) {
    const g = this.game, f = this.f;
    switch (id) {
      case 'ball': return !!g.hero.hasBall;
      case 'out': return !this.game.room;
      case 'zoe': return !!f.pr_kettle;
      case 'inv': return g.tutorial.done.has('inventory');
      case 'tap': return !!f.pr_yard;
      case 'dino': return !!f.pr_dino || !this.dinoInYard();
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
  // TUTOR-TARGETS (P67, the user, 18.11: "the tap", "the barrels": the player couldn't tell which object was meant):
  // the exact thing the current step means, where it is, for the marker over it and the arrow at the screen's edge
  // (tutorial.js): { x, y (the marker's height), z, foot (the ground under it), r (its ring), name (a short label key) }.
  // None for the inventory's step (it is a key, not a place) or where the thing is not in this scene.
  target() {
    const id = this.panelStep(), g = this.game, h = g.hero, R = g.room;
    if (!id) return null;
    const at = (x, foot, z, up, r, name) => ({ x, y: foot + up, z, foot, r, name: 't2_n_' + name });
    switch (id) {
      case 'ball': {
        if (R?.id !== 'house') { const e = R?.exits?.find((x) => x.room === 'house'); return e ? at(e.x, h.pos.y, e.z, 2.2, 0.6, 'out') : null; }
        const c = R.cupboard; return c ? at(c.x, h.pos.y, c.z, c.h + 0.6, 0.8, 'ball') : null;
      }
      case 'out': {
        const e = R?.exits?.find((x) => (R.id === 'house' ? x.to === 'outdoor' : x.room === 'house'));
        return e ? at(e.x, h.pos.y, e.z, 2.6, 0.7, 'out') : null;
      }
    }
    if (R) return null;
    switch (id) {
      case 'zoe': { const z = this.ch.npc('zoe'); return z?.present ? at(z.pos.x, z.pos.y, z.pos.z, 2.45, 0.6, 'zoe') : null; }
      case 'tap': { const Y = this.ch.home.parts.yard; return Y ? at(Y.x, Y.y, Y.z, 2.35, 0.45, 'tap') : null; }
      // (over his back, a ring round him)
      case 'dino': { const p = this.dino(); return p ? at(p.x, g.physics.groundAt(p.x, p.z), p.z, 2.6, 1.6, 'dino') : null; }
      // (TUT-MYSTERY: over the near barrel, the one in front of the joint; the hit still counts on either)
      case 'barrels': { const B = this.ch.home.parts.barrel, T = this.ch.barrels?.(); if (B && !B.aside) return at(B.x0, B.B.y, B.z0, 2.1, 0.6, 'barrels'); return T ? at(T.x, T.y - 0.55, T.z, 2.3, 1.1, 'barrels') : null; }
      // (the pipe is 6 m long: the marker stands on it level with him, so it points at the stretch he would jump)
      case 'pipe': { const z = Math.min(PIPE.z1 - 0.4, Math.max(PIPE.z0 + 0.4, h.pos.z)), foot = g.physics.groundAt(PIPE.x + 1.6, z); return at(PIPE.x, foot, z, 1.15, 0.5, 'pipe'); }
    }
    return null;
  }
  // the yard's progress for the panel's dots: [done, of]
  progress() { return [YARD_STEPS.filter((id) => this.isDone(id)).length, YARD_STEPS.length]; }

  // ---------------------------------------------------------------- the story's hooks (prologue.js)
  // the objective's sub-step while a step runs (the brief panel shows the goal, "Check the well")
  objective() { const id = this.current(); return id ? t('t2_goal_' + id) : null; }
  // the minimap's and holomap's star: the step's place, not the well yet
  markers() {
    const id = this.current(), g = this.game, Y = this.ch.home.parts.yard, B = this.ch.home.parts.barrel, T = B ? { x: B.x0, z: B.z0 } : this.ch.barrels?.();
    const star = (x, z, label) => ({ x, z, kind: 'star', color: '#ffcf4a', r: 4, edge: true, ...(label ? { label } : {}) });
    const z = this.ch.npc('zoe');
    switch (id) {
      // (TUT-MYSTERY: the star where the panel's action is: on Zoé while she is the step; none for the door (its marker
      //  is in the house) or the inventory (a key: the star over Zoé sent players back to her))
      case 'zoe': return z?.present ? [star(z.pos.x, z.pos.z, t('n_zoe'))] : [];
      case 'tap': return Y ? [star(Y.x, Y.z)] : [];
      case 'dino': { const p = this.dino(); return p ? [star(p.x, p.z)] : []; }
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
    // the Dino-Fly's step: woken by Twinsen's steps, Zoé's gentle word (not on every waking, never as the step begins)
    const S = cur === 'dino' ? this.dino()?.state : null;
    if (!S) this.woke = null;
    else if (this.woke == null) this.woke = S.woke;
    else if (S.woke > this.woke) { this.woke = S.woke; if (!this.say && g.time - this.wokeSaid > WOKE_AGAIN) { this.wokeSaid = g.time; this.speak('t2_dino_woke', 4.2, true); } }
    // the yard's edge, walked across with a yard step open (TUT-MYSTERY: no call back, no walk back): the yard lets go,
    // Zoé calls once with what matters next, and he goes on. (BEHAVIOUR-MODES: round the Dino-Fly is still the yard
    // while his step is open; the pipe walked round after the switch to Athletic ends the yard, "close enough")
    if (d != null && !g.trans && cur && YARD_STEPS.includes(cur) && d > LEASH) {
      const p = cur === 'dino' ? this.dino() : null;
      if (p && Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < DINO_NEAR) return;
      if (cur === 'pipe' && (h.behaviour === 'athletic' || g.tutorial?.done?.has('athletic')) && YARD_STEPS.every((id) => id === 'pipe' || this.isDone(id))) { f.pr_pipe = 2; g.save(false); return; }
      this.leave(cur);
    }
  }
  // he heads off before the yard is done: her one call (over her head, or at the screen's edge with her name when she
  // is out of view), the well's objective and star back. Nothing is granted for what he skipped
  leave(cur) {
    const g = this.game, f = this.f;
    f.pr_yardOk = true;
    this.say = null;
    this.left = cur;
    this.speak(f.pr_kettle ? 't2_call_go' : 't2_call_kettle', 5.5, true);
    g.updateObjective();
    g.save(false);
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

  // ---------------------------------------------------------------- Zoé's word over her head (one element, in play only)
  // (far: a call across the yard — when she is out of view the words stand at the screen's edge toward her, her name first)
  speak(key, dur, far = false) {
    const z = this.ch.npc('zoe');
    if (!z?.present || typeof document === 'undefined') return;
    const text = t(key);
    this.bub = { n: z, t: dur ?? Math.min(4.2, 1.4 + text.length * 0.045), key, far, text, pinned: null };
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
    const off = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
    if (off && !B.far) { el.style.display = 'none'; return; }
    let x = v.x, y = v.y;
    if (off) {   // (pinned inside the screen's edge, toward her)
      if (v.z > 1) { x = -x; y = -y; }
      const n2 = Math.max(Math.abs(x) / 0.8, Math.abs(y) / 0.72, 1e-3); x /= n2; y /= n2;
    }
    if (B.pinned !== off) { B.pinned = off; el.textContent = off ? t('n_zoe') + ': ' + B.text : B.text; el.style.transform = off ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)'; }
    el.style.left = ((x + 1) / 2 * innerWidth).toFixed(0) + 'px';
    el.style.top = ((1 - y) / 2 * innerHeight).toFixed(0) + 'px';
    el.style.opacity = String(Math.min(1, B.t / 0.3));
    if (el.style.display !== 'block') el.style.display = 'block';
  }
}
