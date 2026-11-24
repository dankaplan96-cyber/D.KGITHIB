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
//
// OPENING-TUT-2 (P31): in a game begun with the opening's steps (story/openingsteps.js), the steps take the panel in the
// house and the yard until the yard is done: one goal line, always shown (Show control tips: Off hides only its keys),
// the key for it below, a few dots for the yard's progress, and a tick when a step is done. The lessons above are still
// observed meanwhile; after the yard they go on as before (the arc, the camera, out of magic, the town's).
//
// TUTOR-TARGETS (P67, the user, 18.11: "the tap", "the barrels" — the player couldn't identify the object): every step
// with a thing to find points at it. A gold marker bobs over the exact object (the cupboard, the front door, Zoé, the
// garden tap, the two barrels, the stretch of pipe level with him) with a ring at its foot, high over it; when it is
// off the screen, an arrow at the screen's edge with the thing's name points the way. A step left undone grows its hint:
// after HINT_WHERE s the panel adds where the thing is in words; after HINT_SAY s (and again each HINT_SAY) Zoé says it
// over her head. Shown with Show control tips Off too (that hides only the keys): the steps can't be finished without
// knowing what they mean. Nothing is saved: the step comes from the story's flags, the hint's clock starts again on a
// load. Cost: one small mesh pair moved per frame, one projection; built on first use, removed with the steps.
import * as THREE from 'three';
import { t, keyHints } from './i18n.js';
import { keyFor, keyLabel } from '../engine/input.js';
import './text/opening.js';
import './text/wswitch.js';   // (WEAPON-SWITCH / POCKET-SET: the two tips anywhere in the game)

const SHOW_DELAY = 0.6;     // s eligible before the tip shows (a lesson met in passing, or done at once, never flashes up)
const MIN_SHOW = 1.2;       // s a shown tip stays up through a flicker of its eligibility (not past its completion)
const LOS_EVERY = 0.25;     // s between the barrels' line-of-sight tests
const ADVANCES = 3;         // manual dialogue advances before the box's key hint goes
const HINT_WHERE = 15;      // s on a step before the panel says where its thing is (TUTOR-TARGETS)
const HINT_SAY = 35;        // s before Zoé's own reminder of what she means (TUTOR-TARGETS)
const HINT_SAY2 = 90;       // s before her second and last (her step's first ask again, not the same line)
// the project's copper heat pipe along the lane (x −43.5, z 66.0–72.1, 0.6 m high, too high to step over: lanegate.js
// names it): the jump practice, over it in Athletic or walked round its end
const PIPE = { x: -43.5, z0: 66.0, z1: 72.1, reach: 4.5 };
// every lesson, in the order a tip is offered when several apply (one at a time). talk/use/advance/map have no panel of
// their own: the game's own prompt ("E Talk"), the dialogue box's key hint and the toast at the cupboard teach them
// WEAPON-SWITCH / POCKET-SET (17.11): two tips that apply anywhere in the game, not only chapter 1's opening (ANY):
// 'pset' while Arthur's hidden radio valve is to find in the house (how to hold the set out, then how to read it and put
// it away; done when it is found), 'wswitch' once he comes to own a third weapon in play (the swap key's tap and hold,
// the wheel; done the first time he uses the swap key or the wheel with a choice to make)
// BEHAVIOUR-MODES (P125, the user's pick 24.11): two hide tips anywhere in the game (ANY). 'hide' the first time he is in
// Discreet with the panel free ("Hold {k} to hide"; done the first time he hides); 'cover' wherever the story asks him
// to hide (a watcher on his round: Zoé's office, the archive; or a room with cover spots and an enemy about): the same
// key and where it works, in each such place until he hides there (not saved: shown again after a load, a few seconds)
export const ORDER = ['cover', 'normal', 'hide', 'move', 'inventory', 'camera', 'athletic', 'jump', 'ball', 'arc', 'magic', 'discreet', 'kick', 'dodge', 'talk', 'use', 'advance', 'map', 'pset', 'wswitch'];   // (the hide tips first: they apply only in Discreet, the moment he is in it; the kids' "Back to Normal" before the plain hide tip)
const ANY = new Set(['pset', 'wswitch', 'hide', 'cover']);
const YARD = ['zoe', 'inv', 'tap', 'dino', 'barrels', 'pipe'];   // (OPENING-TUT-2: the yard's steps, story/openingsteps.js; BEHAVIOUR-MODES: 'dino')
const PANEL = new Set(['move', 'inventory', 'camera', 'athletic', 'jump', 'ball', 'arc', 'magic', 'cover', 'discreet', 'hide', 'normal', 'kick', 'dodge', 'pset', 'wswitch']);
const COVER_MAX = 12;       // s the 'cover' tip shows in one place at most

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
#tip .tgoal { font-weight: 600; }
#tip .tgoal .tdots { margin-inline-start: 8px; font-size: 11px; letter-spacing: 2px; opacity: 0.75; white-space: nowrap; }
#tip .tkeys { margin-top: 3px; font-size: 14px; opacity: 0.92; }
#tip .tgoal.ok { color: #9ff0a8; }
#tip .twhere { margin-top: 3px; font-size: 14px; color: #ffe08a; }
#tiparrow { position: absolute; transform: translate(-50%, -50%); display: none; pointer-events: none; color: #ffcf4a; font-weight: 700; font-size: 14px; text-shadow: 0 1px 3px #000, 0 0 2px #000; text-align: center; white-space: nowrap; }
#tiparrow .ta { display: inline-block; font-size: 30px; line-height: 1; }
body.hud-busy #tiparrow, body.found-on #tiparrow { visibility: hidden; }
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
    this.html = null; this.stepId = null; this.okT = 0; this.okHtml = null;
    this.ownN = null; this.wsArmed = false;   // (WEAPON-SWITCH: how many weapons he owned last frame; a third one arrived in play)
    this.stepFor = null; this.stepT = 0; this.hintN = 0; this.markAt = null;   // (TUTOR-TARGETS: the step's clock, its marker)
    this.coverAt = new Set(); this.coverT = {};   // (BEHAVIOUR-MODES: the places he has hidden in, the 'cover' tip's time in each)
  }
  snapshot() { return { v: 1, done: [...this.done], gone: [...this.gone] }; }
  // a save's lessons; a save from before the tips (no `tut`): all of them done, nothing pops up for a player under way
  load(s) {
    this.reset();
    if (!s || s.v !== 1) { for (const id of ORDER) if (id !== 'cover') this.done.add(id); return; }   // ('cover' is per place, never done)
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
      // (INTERACT-PICK: in Aggressive its "W Kick the lid" only while the prompt offers the kick, never beside another prompt)
      case 'kick': { const W = g.world.well; return at === 'town' && !!W && !!f.pr_lidStuck && !f.pr_lidOpen && Math.hypot(h.pos.x - W.x, h.pos.z - W.z) < 8 && (h.behaviour !== 'aggressive' || (g.promptFor?.kind === 'well' && !!g.promptFor.kick)); }
      // the first creature that comes for him, in the well's cave: the dodge (the ball he knows)
      case 'dodge': return at === 'cave' && g.enemies.some((e) => e.alive && e.present && (e.state === 'chase' || e.state === 'windup') && h.distTo(e) < 7);
      // (anywhere) Arthur's valve still to find, he in the house with the set (as himself), nothing on him
      case 'pset': return !!f.e2_hide && !f.e2_tube && !!h.arms?.pocketset && g.room?.id === 'house' && h.body !== 'zoe' && h.body !== 'worker' && !g.story?.cur?.steps?.panelStep?.();
      case 'wswitch': return this.wsArmed && (h.combat?.cycleList?.().length || 0) > 2;
      // BEHAVIOUR-MODES: in Discreet, not hiding, the panel free of the opening's steps
      case 'hide': return h.behaviour === 'discreet' && !h.hiding && !g.story?.cur?.steps?.panelStep?.();
      case 'cover': { const k = this.coverKey(); return !!k && h.behaviour === 'discreet' && !h.hiding && !this.coverAt.has(k) && (this.coverT[k] || 0) < COVER_MAX; }
    }
    return false;
  }
  // where the story asks him to hide, as a key for this place (null elsewhere): a watcher on his round in this scene, or a
  // room with cover spots and an enemy of it about
  coverKey() {
    const g = this.g, R = g.room;
    if (g.watching) for (const w of g.watching) if (w.active) return 'w:' + (R?.id || 'out');
    if (R?.cover?.length && g.enemies?.some((e) => e.alive && e.present)) return 'r:' + R.id;
    return null;
  }
  // an optional tip's time on screen in all before it is let go (none: it stays while it applies)
  max(id) { return { move: 40, inventory: 20, camera: 15, athletic: 25, jump: 25, ball: 40, arc: 15, magic: 8, discreet: 40, hide: 10, normal: 10, dodge: 10, wswitch: 14 }[id]; }
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
      case 'kick': return g.hero.behaviour !== 'aggressive' ? t('tut_aggressive', { k: this.mode(3) }) : g.promptFor?.kick ? t('tut_kick', { k: K('interact') }) : '';
      case 'dodge': return t('tut_dodge', { k: K('dodge') });
      case 'pset': return g.hero.combat?.weapon === 'pocketset' ? t('tut_pset_find', { e: K('interact'), k: K('swap') }) : t('tut_pset_hold', { k: K('swap') });
      case 'wswitch': return d === 'touch' ? t('tut_wswitch_touch', { k: K('swap') }) : t('tut_wswitch', { k: K('swap'), w: K('weapons') });
      case 'hide': return t('tut_hide', { k: K('action') });
      case 'cover': return t('tut_cover', { k: K('action') });
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
    // OPENING-TUT-2: the opening's steps have the panel while they run (a tick for a moment as one is done)
    const S = g.story?.cur?.steps, sid = S?.panelStep?.() ?? null;
    this.mark(sid ? S.target?.() : null, dt);
    if (sid !== this.stepFor) { this.stepFor = sid; this.stepT = 0; this.hintN = 0; }
    if (sid) {
      this.stepT += dt;
      // (Zoé's reminder: only in the yard, where she stands; the zoe step's own is her call)
      // (twice at most — at HINT_SAY and at HINT_SAY2 — never the same line on a loop: the panel's where line and the
      //  marker stay all along; P67's brief: "do not repeat the same hint continuously")
      if (YARD.includes(sid) && this.hintN < 2 && this.stepT > (this.hintN ? HINT_SAY2 : HINT_SAY)) { this.hintN++; S.speak?.(sid === 'zoe' ? 't2_zoe_call' : this.hintN === 1 ? 't2_hint_' + sid : 't2_ask_' + sid); }
    }
    if (this.okT > 0) { this.okT -= dt; this.cur = null; this.stepId = 'ok'; this.show(this.okHtml); return; }
    if (sid) { this.cur = null; this.stepId = sid; this.show(this.stepHtml(sid)); return; }
    if (this.stepId) { this.stepId = null; this.hide(); }
    // the first lesson that applies, not done and not let go
    let want = null;
    if (!g.trans) for (const id of ORDER) {
      if (!PANEL.has(id) || this.done.has(id) || this.gone.has(id)) continue;
      if (!at && !ANY.has(id)) continue;
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
    if (want === 'cover') { const k = this.coverKey(); if (k) this.coverT[k] = (this.coverT[k] || 0) + dt; }
    const mx = this.max(want);
    if (mx && this.shownT[want] > mx) { this.gone.add(want); this.hide(); this.cur = null; return; }
    const tx = this.text(want);
    if (tx) this.show(tx); else this.hide();   // (a key line held through MIN_SHOW that the prompt no longer offers: none)
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
        // (BEHAVIOUR-MODES: the yard's Dino-Fly step switches to Discreet and back; the kids' two tips are about their
        //  scene (sneak up to overhear Tim, then back): a switch made during the yard's steps does not count for them)
        const yard = !!g.story?.cur?.steps?.on;
        if (h.behaviour === 'discreet' && !yard) this.finish('discreet');
        if (h.behaviour === 'normal' && this.lastBeh === 'discreet' && !yard) this.finish('normal');
      }
      this.lastBeh = h.behaviour;
    }
    // a jump: the jump's own gravity on, off the ground
    const air = !!h.gravity && !h.onGround;
    if (air && !this.air) this.finish('jump');
    this.air = air;
    if (I.pressed('inventory')) { g.story?.cur?.steps?.onInventory?.(); this.finish('inventory'); }   // (OPENING-TUT-2: it opens on the kettle's crystals)
    if (I.pressed('map') && h.hasBall) this.finish('map');
    // the camera: turned by hand (Free) or sent behind him (LBA)
    if (g.settings.camera === 'free' && (I.padAxes[2] || I.padAxes[3] || I.down('camL') || I.down('camR') || I.mouse.rightDrag)) this.finish('camera');
    if (g.settings.camera === 'lba' && (I.pressed('recenter') || I.pressed('recenterPad'))) this.finish('camera');
    if (h.combat?.throwing?.charging) this.finish('arc');
    if (h.combat?.dodgeT > 0) this.finish('dodge');
    // BEHAVIOUR-MODES: he hid: the hide tip is learned, and this place's 'cover' tip is done
    if (h.hiding) { this.finish('hide'); const k = this.coverKey(); if (k) { this.coverAt.add(k); if (this.cur === 'cover') this.hide(); } }
    if (g.flags.pr_lidOpen) this.finish('kick');
    if (this.mp0 != null && h.mp > this.mp0) this.finish('magic');
    this.mp0 = h.mp;
    // WEAPON-SWITCH: a third weapon owned in play (not one a load brought) arms its tip; the swap key or the wheel with
    // a choice to make completes it. POCKET-SET: the valve found completes its tip
    const n = h.combat?.cycleList?.().length || 0;
    if (this.ownN != null && n > this.ownN && n > 2) this.wsArmed = true;
    this.ownN = n;
    if (n > 1 && (I.pressed('swap') || I.pressed('weapons'))) this.finish('wswitch');
    if (g.flags?.e2_tube) this.finish('pset');
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
  get shown() { return this._on ? (this.stepId ? 'step:' + this.stepId : this.cur) : null; }

  // ---------------------------------------------------------------- OPENING-TUT-2: the opening's steps in the panel
  // the step's goal (always) and its key (tips on), in the device in use
  stepHtml(id) {
    const S = this.g.story?.cur?.steps, [n, of] = S?.progress?.() || [0, 0];
    const dots = YARD.includes(id) ? `<span class="tdots">${'●'.repeat(n)}${'○'.repeat(of - n)}</span>` : '';
    const keys = this.tips ? this.stepKeys(id) : '';
    const where = this.stepFor === id && this.stepT > HINT_WHERE ? `<div class="twhere">${esc(t('t2_where_' + id))}</div>` : '';
    return `<div class="tgoal">${esc(t('t2_goal_' + id))}${dots}</div>${where}${keys ? `<div class="tkeys">${keys}</div>` : ''}`;
  }
  stepKeys(id) {
    const g = this.g, h = g.hero, K = (a) => this.key(a), it = g.promptFor;
    switch (id) {
      case 'ball': {
        if (!this.done.has('move')) return this.text('move');
        return it?.kind === 'roomsearch' && it.spot?.id === 'cupboard' ? t('t2_k_search', { k: K('interact') }) : '';
      }
      // (UI-P92, the HUD rule: from a distance the goal and the marker say where to go; the key for the thing comes up in
      //  reach of it, as the cupboard's does)
      // (INTERACT-PICK, P115: and only while the game's own prompt offers that thing — the panel said "W Try the tap" 2 m
      //  from the tap while the prompt said "W Talk" for Zoé beside it, and "W Talk" at Zoé's back with no prompt up and
      //  the key doing nothing: the panel and the prompt now always name the same action)
      case 'zoe': return it?.kind === 'npc' && it.npc?.def?.id === 'zoe' ? t('t2_k_talk', { k: K('interact') }) : '';
      case 'inv': return t('tut_inv', { k: K('inventory') });
      case 'tap': return it?.kind === 'h_yard' ? t('t2_k_try', { k: K('interact') }) : '';
      // (BEHAVIOUR-MODES: first the switch to Discreet; then, in reach of him asleep, the hand key)
      case 'dino': return h.behaviour !== 'discreet' ? this.text('discreet') : it?.kind === 'pet' && it.pet?.id === 'dinofly' && it.label === 'p_pet' ? t('t2_k_pet', { k: K('interact') }) : '';
      case 'barrels': return this.text('ball');
      case 'pipe': return h.behaviour !== 'athletic' ? this.text('athletic') : t('t2_k_jump', { k: K('action') });
    }
    return '';
  }
  // a step done: its goal with a tick, for a moment
  stepOk(id) {
    this.okHtml = `<div class="tgoal ok">✓ ${esc(t('t2_goal_' + id))}</div>`;
    this.okT = 1.1;
  }

  // ---------------------------------------------------------------- TUTOR-TARGETS: the marker over the step's thing
  // T: the target (openingsteps.js target()) or null. The marker: a gold point-down cone bobbing over it and a pulsing
  // ring at its foot; off the screen, the edge arrow and the thing's name instead.
  mark(T, dt) {
    this.markAt = T;
    const m = T ? this.markMesh() : this._mk;
    if (!m) return;
    if (!T) { if (m.group.visible) m.group.visible = false; this.arrow(null); return; }
    const k = (this._mkT = (this._mkT || 0) + dt);
    const big = this.stepT > HINT_WHERE ? 1.3 : 1;   // (a step left long: a larger marker)
    m.group.visible = true;
    m.cone.position.set(T.x, T.y + Math.sin(k * 3.2) * 0.12, T.z);
    m.cone.rotation.y = k * 1.6;
    m.cone.scale.setScalar(big);
    const p = (k * 0.8) % 1;
    m.ring.position.set(T.x, T.foot + 0.04, T.z);
    m.ring.scale.setScalar(T.r * (0.75 + p * 0.5) * big);
    m.ring.material.opacity = 0.75 * (1 - p);
    this.arrow(T);
  }
  markMesh() {
    if (this._mk) return this._mk;
    const sc = this.g.scene;
    if (!sc) return null;
    // (depth-tested: drawn over everything it sat on Twinsen's head when he stood between the camera and the tap, and
    //  read as his hair; it stands high enough over the thing to clear him and the fences, and the edge arrow covers the
    //  rest)
    const mat = (o) => new THREE.MeshBasicMaterial({ color: '#ffcf4a', transparent: true, depthWrite: false, fog: false, toneMapped: false, ...o });
    const group = new THREE.Group(); group.name = 'tutTarget'; group.renderOrder = 990;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.56, 4), mat({ opacity: 1 }));
    cone.rotation.order = 'YXZ'; cone.geometry.rotateX(Math.PI);   // (point down)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 32), mat({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    ring.geometry.rotateX(-Math.PI / 2);
    for (const o of [cone, ring]) { o.renderOrder = 990; o.frustumCulled = false; group.add(o); }
    group.visible = false;
    sc.add(group);
    return (this._mk = { group, cone, ring });
  }
  // the arrow at the screen's edge toward a thing off the screen (or behind the camera), with its name
  arrow(T) {
    if (typeof document === 'undefined') return;
    let el = this._ar;
    if (!T) { if (el && el.style.display !== 'none') el.style.display = 'none'; this.arrowOn = false; return; }
    const cam = this.g.camera;
    if (!cam) return;
    const v = (this._v ||= new THREE.Vector3()).set(T.x, T.y, T.z).project(cam);
    let x = v.x, y = v.y;
    const behind = v.z > 1;
    if (behind) { x = -x; y = -y; }
    if (!behind && Math.abs(x) < 0.94 && Math.abs(y) < 0.9) { if (el && el.style.display !== 'none') el.style.display = 'none'; this.arrowOn = false; return; }
    if (!el) {
      addStyle();
      el = this._ar = document.createElement('div'); el.id = 'tiparrow';
      el.innerHTML = '<span class="ta">➤</span><div class="tn"></div>';
      (document.getElementById('floats') || document.body).appendChild(el);
    }
    const n = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8, 1e-3);   // (onto the edge's rectangle, inside the margins)
    const ex = x / n, ey = y / n, W = innerWidth, H = innerHeight;
    el.style.left = (((ex + 1) / 2) * W).toFixed(0) + 'px';
    el.style.top = (((1 - ey) / 2) * H).toFixed(0) + 'px';
    const a = Math.atan2(-y * H, x * W);
    const ta = el.firstChild, nm = el.lastChild, label = t(T.name);
    ta.style.transform = `rotate(${a.toFixed(2)}rad)`;
    if (nm.textContent !== label) nm.textContent = label;
    if (el.style.display !== 'block') el.style.display = 'block';
    this.arrowOn = true;
  }

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
    const html = keyHints(`${this.key('interact')}${t(typing ? 'tut_dlg_all' : 'tut_dlg_next')}`);
    if (k._h !== html) { k.innerHTML = html; k._h = html; }
  }
}
