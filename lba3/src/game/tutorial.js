// OPENING-TUT (the user, 14.11.2026): the control tips of the opening, at home and in the yard, and the few contextual
// ones chapter 1 needs later in town. One quiet panel, one instruction at a time, in the bindings the player really uses
// (rebound keys, the pad's buttons, the touch buttons), updated on a remap or a device switch.
//
// Tutorial state is its own, never a story flag: `done` (the real gameplay event happened: he moved, switched to Athletic,
// jumped, hit the barrels...) and `gone` (an optional tip shown long enough and let go). Both are saved with the game
// (main.js snapshot `tut`) and survive a death or a reload; a save from before this build has none: every lesson counts
// as done there (a player already under way). A new game starts them afresh.
//
// Each lesson: `when()` its eligibility (where and when it is any use), `text()` the prompt, and its completion, which is
// always the action itself, observed here or reported by the game (event()): never the prompt having been shown. Actions
// done before a tip would have appeared complete it all the same. Turning tips off (Settings, Controls: Show control tips) hides
// the panel and the dialogue's key hint; the lessons are still recognised, and no quest ever waits on one.
//
// Cost: a handful of comparisons per frame in play; the one line-of-sight test (the barrels) runs four times a second
// and only in the yard. No world scans, no input is held or swallowed.
//
// Lesson state machine (per lesson): locked → eligible (when() true) → shown (after SHOW_DELAY in view, the first eligible
// one in ORDER, tips on) → done (its action) | gone (an optional tip shown for `max` seconds in all). A shown tip that
// stops being eligible (he walks off, a dialogue opens) hides and can show again later, until it is done or gone.
import { t } from './i18n.js';
import { keyFor, keyLabel } from '../engine/input.js';
import './text/opening.js';

const SHOW_DELAY = 0.6;     // s eligible before the tip shows (a lesson met in passing, or done at once, never flashes up)
const MIN_SHOW = 1.2;       // s a shown tip stays up through a flicker of its eligibility (not past its completion)
const LOS_EVERY = 0.25;     // s between the barrels' line-of-sight tests
const ADVANCES = 3;         // manual dialogue advances before the box's key hint goes
// the project's copper heat pipe along the lane (x −43.5, z 66.0–72.1, 0.6 m high, too high to step over: lanegate.js
// names it): the jump practice, over it in Athletic or walked round its end
const PIPE = { x: -43.5, z0: 66.0, z1: 72.1, reach: 4.5 };
// every lesson, in the order a tip is offered when several apply (one at a time). talk/use/advance/map have no panel of
// their own: the game's own prompt ("E Talk"), the dialogue box's key hint and the toast at the cupboard teach them
export const ORDER = ['move', 'inventory', 'camera', 'athletic', 'jump', 'ball', 'arc', 'magic', 'discreet', 'normal', 'kick', 'dodge', 'talk', 'use', 'advance', 'map'];
const PANEL = new Set(['move', 'inventory', 'camera', 'athletic', 'jump', 'ball', 'arc', 'magic', 'discreet', 'normal', 'kick', 'dodge']);

let styled = false;
function addStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
#tip { position: absolute; top: 40%; inset-inline-start: 16px; max-width: min(340px, 44vw); background: rgba(6, 12, 20, 0.88); border: 1px solid rgba(255, 255, 255, 0.42); border-radius: 10px; padding: 8px 14px; font-weight: 500; color: #fff; text-shadow: 0 1px 2px #000; line-height: 1.5; opacity: 0; transform: translateX(-8px); transition: opacity 0.25s, transform 0.25s; pointer-events: none; }
#tip.show { opacity: 1; transform: none; }
#tip kbd { margin-inline-end: 4px; }
#hud.busy #tip, body.found-on #tip { opacity: 0; transition: none; }
body.hud-lba #tip { border-radius: 0; background: rgba(0, 0, 0, 0.72); border: 1px solid rgba(255, 255, 255, 0.85); }
body.big-text #tip { font-size: 18px; }
@media (pointer: coarse) and (max-width: 640px) { #tip { top: 168px; max-width: 60vw; font-size: 14px; } }
#dialog .tutkey { position: absolute; bottom: 7px; inset-inline-end: 40px; font-size: 13px; opacity: 0.8; }
#dialog .tutkey kbd { font-size: 12px; padding: 0 5px; min-width: 18px; }`;
  document.head.appendChild(st);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Tutorial {
  constructor(game) {
    this.g = game;
    this.reset();
  }
  // a new game: every lesson to learn again
  reset() {
    this.done = new Set(); this.gone = new Set();
    this.shownT = {}; this.eligT = {};
    this.cur = null; this.curT = 0; this.moved = 0; this.advances = 0;
    this.lastBeh = null; this.air = false; this.mp0 = null; this.losT = 0; this.los = false;
    this.html = null;
  }
  snapshot() { return { v: 1, done: [...this.done], gone: [...this.gone] }; }
  // a save's lessons; a save from before the tips (no `tut`): all of them done, nothing pops up for a player under way
  load(s) {
    this.reset();
    if (!s || s.v !== 1) { for (const id of ORDER) this.done.add(id); return; }
    for (const id of s.done || []) if (ORDER.includes(id)) this.done.add(id);
    for (const id of s.gone || []) if (ORDER.includes(id)) this.gone.add(id);
  }
  get tips() { return this.g.settings?.tips !== 'off'; }
  finish(id) { if (!this.done.has(id)) { this.done.add(id); if (this.cur === id) this.hide(); } }
  // what the game reports: 'interact' (kind), 'advance' (a dialogue line moved on by the player), 'target' (the yard's
  // barrels hit), 'inventory' (opened)
  event(kind, data) {
    if (kind === 'interact') this.finish(data === 'npc' ? 'talk' : 'use');
    else if (kind === 'advance') { if (++this.advances >= ADVANCES) this.finish('advance'); }
    else if (kind === 'target') this.finish('ball');
    else if (kind === 'inventory') this.finish('inventory');
  }

  // ---------------------------------------------------------------- bindings, in the device in use
  dev() { return this.g.input?.lastDevice || 'kbd'; }
  key(a) { return `<kbd>${esc(this.g.hud?.key?.(a) || keyLabel(keyFor(a)))}</kbd>`; }
  // the behaviours: a key each on the keyboard and pad (1–4 / the d-pad), the cycle button on a touch screen
  mode(n) { return this.dev() === 'touch' ? this.key('cycle') : this.key('b' + n); }
  classic() { return this.g.settings?.controls !== 'modern'; }

  // ---------------------------------------------------------------- the lessons
  // where the player is: chapter 1 before the well, and which place
  where() {
    const g = this.g, f = g.flags, h = g.hero;
    if (f.chapterKey !== 'well' || f.prologueDone) return null;
    if (g.room) return g.room.id === 'house' ? 'house' : g.room.id === 'well' ? 'cave' : 'room';
    const d = g.world.houses?.[0]?.door;
    const home = d ? Math.hypot(h.pos.x - d.x, h.pos.z - d.z) : 99;
    return home < 22 ? 'yard' : 'town';
  }
  nearPipe() {
    const p = this.g.hero.pos;
    return p.z > PIPE.z0 - 1 && p.z < PIPE.z1 + 1.5 && Math.abs(p.x - PIPE.x) < PIPE.reach;
  }
  when(id, at) {
    const g = this.g, f = g.flags, h = g.hero;
    switch (id) {
      case 'move': return at === 'house' && !h.steer;
      case 'inventory': return h.hasBall && (at === 'house' || at === 'yard');
      case 'camera': return at === 'yard' && (g.settings.camera === 'free' || g.settings.camera === 'lba');
      case 'athletic': return at === 'yard' && h.hasBall && this.nearPipe() && h.behaviour !== 'athletic';
      case 'jump': return at === 'yard' && h.behaviour === 'athletic' && this.nearPipe() && h.onGround;
      case 'ball': {
        const T = g.story.cur?.barrels?.();
        if (at !== 'yard' || !h.hasBall || !T) return false;
        if (Math.hypot(h.pos.x - T.x, h.pos.z - T.z) > 12) return false;
        return this.los;
      }
      case 'arc': { const T = g.story.cur?.barrels?.(); return at === 'yard' && this.done.has('ball') && !!T && Math.hypot(h.pos.x - T.x, h.pos.z - T.z) < 12 && this.los; }
      // out of magic while practising: the ball still flies (LBA2: it comes back at its first contact), it only stops
      // bouncing; a flask refills it. Said once, a few seconds (no healing or magic lesson is forced on him)
      case 'magic': return (at === 'yard' || at === 'town') && h.hasBall && h.mp < 1;
      case 'discreet': { const k = g.npcs.find((n) => n.def.id === 'tim'); return at === 'town' && f.kidsAsked && !f.overheard && !!k && h.distTo(k) < 12; }
      case 'normal': return !!f.overheard && h.behaviour === 'discreet' && at === 'town';
      case 'kick': { const W = g.world.well; return at === 'town' && !!W && !!f.pr_lidStuck && !f.pr_lidOpen && Math.hypot(h.pos.x - W.x, h.pos.z - W.z) < 8; }
      // the first creature that comes for him, in the well's cave: the dodge (the ball he knows)
      case 'dodge': return at === 'cave' && g.enemies.some((e) => e.alive && e.present && (e.state === 'chase' || e.state === 'windup') && h.distTo(e) < 7);
    }
    return false;
  }
  // an optional tip's time on screen in all before it is let go (none: it stays while it applies)
  max(id) { return { move: 40, inventory: 20, camera: 15, athletic: 25, jump: 25, ball: 40, arc: 15, magic: 8, discreet: 40, normal: 10, dodge: 10 }[id]; }
  text(id) {
    const g = this.g, d = this.dev(), K = (a) => this.key(a);
    switch (id) {
      case 'move':
        if (d === 'pad') return t('tut_move_pad');
        if (d === 'touch') return t('tut_move_touch');
        return this.classic() ? t('tut_move_classic', { w: K('up'), lr: K('left') + K('right') }) : t('tut_move', { k: K('up') + K('left') + K('down') + K('right') });
      case 'inventory': return t('tut_inv', { k: K('inventory') });
      case 'camera':
        if (g.settings.camera === 'lba') return t('tut_cam_lba', { k: d === 'pad' ? '<kbd>R3</kbd>' : K('recenter') });
        return d === 'pad' ? t('tut_cam_pad') : d === 'touch' ? t('tut_cam_touch') : t('tut_cam', { k: K('camL') + K('camR') });
      case 'athletic': return t('tut_athletic', { k: this.mode(2) });
      case 'jump': return t('tut_jump', { k: K('action') });
      case 'ball': {
        const aim = d === 'pad' ? t('tut_aim_pad') : d === 'touch' || this.classic() ? t('tut_aim_face') : t('tut_aim_mouse');
        return t('tut_ball', { aim, k: K('ball') });
      }
      case 'arc': return t('tut_arc', { k: K('ball') });
      case 'magic': return t('tut_magic');
      case 'discreet': return t('tut_discreet', { k: this.mode(4) });
      case 'normal': return t('tut_normal', { k: this.mode(1) });
      case 'kick': return g.hero.behaviour === 'aggressive' ? t('tut_kick', { k: K('interact') }) : t('tut_aggressive', { k: this.mode(3) });
      case 'dodge': return t('tut_dodge', { k: K('dodge') });
    }
    return '';
  }

  // ---------------------------------------------------------------- every frame in play (main.js updatePlay, first)
  update(dt) {
    const g = this.g, h = g.hero, I = g.input;
    if (!h || g.state !== 'play') return;
    this.observe(dt, h, I);
    const at = this.where();
    // the barrels' line of sight, a few times a second and only in the yard
    if (at === 'yard' && (this.losT -= dt) <= 0) {
      this.losT = LOS_EVERY;
      this.los = this.barrelsClear(h);
    }
    // the first lesson that applies, not done and not let go
    let want = null;
    if (at && !g.trans) for (const id of ORDER) {
      if (!PANEL.has(id) || this.done.has(id) || this.gone.has(id)) continue;
      if (!this.when(id, at)) { this.eligT[id] = 0; continue; }
      this.eligT[id] = (this.eligT[id] || 0) + dt;
      want = id; break;
    }
    // a shown tip holds through a short flicker of its eligibility
    if (this.cur && want !== this.cur && !this.done.has(this.cur) && this.curT < MIN_SHOW && this.when(this.cur, at)) want = this.cur;
    if (want && (this.eligT[want] || 0) < SHOW_DELAY && want !== this.cur) want = null;
    if (!this.tips) want = null;
    if (want !== this.cur) { this.cur = want; this.curT = 0; }
    if (!want) { this.hide(); return; }
    this.curT += dt;
    this.shownT[want] = (this.shownT[want] || 0) + dt;
    const mx = this.max(want);
    if (mx && this.shownT[want] > mx) { this.gone.add(want); this.hide(); this.cur = null; return; }
    this.show(this.text(want));
  }
  // a throw from here can reach the barrels: the line to them clear along both sides of the ball's way (it leaves his
  // hand a little to his side): from the door the house's corner hides them, a few steps up the path they are in view
  barrelsClear(h) {
    const g = this.g, T = g.story.cur?.barrels?.();
    if (!T) return false;
    const dx = T.x - h.pos.x, dz = T.z - h.pos.z, d = Math.hypot(dx, dz);
    if (d > 12 || d < 1) return false;
    const sx = (-dz / d) * 0.35, sz = (dx / d) * 0.35, P = g.physics, y = h.pos.y + 1.4;
    return P.clearTo(h.pos.x + sx, y, h.pos.z + sz, T.x + sx, T.y, T.z + sz, 0.8) && P.clearTo(h.pos.x - sx, y, h.pos.z - sz, T.x - sx, T.y, T.z - sz, 0.8);
  }
  // the real actions, whatever is on screen
  observe(dt, h, I) {
    const g = this.g;
    // moving: the ground he covers by his own input (a scripted walk to a tap does not count)
    if (h.wantsMove && !h.steer && h.onGround) { this.moved += h.speed * dt; if (this.moved > 1.5) this.finish('move'); }
    if (this.lastBeh !== h.behaviour) {
      if (this.lastBeh != null) {
        if (h.behaviour === 'athletic') this.finish('athletic');
        if (h.behaviour === 'discreet') this.finish('discreet');
        if (h.behaviour === 'normal' && this.lastBeh === 'discreet') this.finish('normal');
      }
      this.lastBeh = h.behaviour;
    }
    // a jump: the jump's own gravity on, off the ground
    const air = !!h.gravity && !h.onGround;
    if (air && !this.air) this.finish('jump');
    this.air = air;
    if (I.pressed('inventory')) this.finish('inventory');
    if (I.pressed('map') && h.hasBall) this.finish('map');
    // the camera: turned by hand (Free) or sent behind him (LBA)
    if (g.settings.camera === 'free' && (I.padAxes[2] || I.padAxes[3] || I.down('camL') || I.down('camR') || I.mouse.rightDrag)) this.finish('camera');
    if (g.settings.camera === 'lba' && (I.pressed('recenter') || I.pressed('recenterPad'))) this.finish('camera');
    if (h.combat?.throwing?.charging) this.finish('arc');
    if (h.combat?.dodgeT > 0) this.finish('dodge');
    if (g.flags.pr_lidOpen) this.finish('kick');
    if (this.mp0 != null && h.mp > this.mp0) this.finish('magic');
    this.mp0 = h.mp;
  }

  // ---------------------------------------------------------------- the panel
  el() {
    if (this._el !== undefined) return this._el;
    addStyle();
    const hud = typeof document !== 'undefined' ? document.querySelector('#hud') : null;
    if (!hud) return (this._el = null);
    const d = document.createElement('div'); d.id = 'tip'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite');
    hud.appendChild(d);
    return (this._el = d);
  }
  show(html) {
    const e = this.el(); if (!e) return;
    if (html !== this.html) { e.innerHTML = html; this.html = html; }
    if (!this._on) { this._on = true; e.classList.add('show'); }
  }
  hide() {
    if (!this._on) return;
    this._on = false; this._el?.classList.remove('show');
  }
  // the text up now (tests)
  get shown() { return this._on ? this.cur : null; }

  // ---------------------------------------------------------------- the dialogue box's key hint (main.js, each dialogue frame)
  // While a line types, the key shows it all at once; then the same key moves on. In the box's corner, beside its ▼,
  // until the player has moved a few lines on by hand.
  dialog() {
    const D = this.g.hud?.dialog;
    if (!D?.el) return;
    const on = this.tips && !this.done.has('advance');
    let k = D.el.querySelector('.tutkey');
    if (!on) { if (k) k.remove(); return; }
    addStyle();
    if (!k) { k = document.createElement('span'); k.className = 'tutkey'; D.el.appendChild(k); }
    const typing = D.full && D.shown < D.full.length;
    const html = `${this.key('interact')}${t(typing ? 'tut_dlg_all' : 'tut_dlg_next')}`;
    if (k._h !== html) { k.innerHTML = html; k._h = html; }
  }
}
