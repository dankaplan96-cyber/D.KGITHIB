// U-3 "Off the Wall" — the user's own side quest (docs/lba-maturity/DEPTH-PLAN.md, "The user's five side quests";
// docs/lba-maturity/U3-OFF-THE-WALL.md). Not a chapter: the director (index.js) asks it beside the chapter in progress,
// like ferry.js. The court's pieces are src/game/offwall.js. It replaces DES-2 (Rector Hougo's rebound trials, never
// built): one rebound school, Tali's, and DES-2's crystal slot (sc-trial) is her prize.
//
// Desert Island, from chapter 4 on. Tali, a pupil of the School of Magic, has made up a ball game on the sandy terrace
// behind the School: a bell on a post in front of the two white blocks. One rule: the bell must never be hit straight.
//   - Talk to her: the rule, and she shows it (her red ball off her chalk X on the wall, into the bell). Her ring in the
//     sand is where she throws from; his magic ball is allowed.
//   - Game 1, off the wall: ring the bell after at least one rebound. A straight hit rings it and is refused, kindly
//     (a hit is straight when the ball struck no wall on the way: actors.js MagicBall.contacts; skipping on the sand is
//     not a wall either).
//   - Game 2, clean: she carries the bell further out; off the wall and onto the bell without touching the sand. The
//     ball comes down about seven metres out (its arc: offwall.js THROW), so the answer is where he stands (closer to the
//     wall); a flatter, harder behaviour reaches a little further.
//   - Game 3, the board: she stands her old blackboard up beside the bell, as a screen. "From my ring there's only one
//     way. It took me a week": a thin bank off the white wall past the board's end. The way she never thought of is the
//     board itself: it stops a ball, so it is a wall. Off the board (from anywhere): she is floored, and moves the board
//     into the middle of the court ("then it moves"). If he finds her way first, she is proud of it; Twinsen asks if it
//     could come off the board; "...Go on, then": the same surprise follows his first ring off the board.
//   - The prize: Rector Hougo's singing crystal (DES-2's slot, given with depth.js giveCrystal), and the court: the board
//     and the bell each move between three spots scratched in the sand (E: his hands on it, he carries it there). Rings
//     off the wall are counted on her board under his name; straight ones are not.
//   - Later: she practises on the court (her own throws, off the board once it is in play), with a line for each part of
//     the story the first time he talks to her there.
// Her magic top-up: a pupil's first spell; talk to her with little magic left (and a dud throw on the court says so).
// Nothing on the main path depends on it.
//
// State (flags, dx_ow_; an old save has none: Tali is at her bell from chapter 4 on, the game not started):
//   dx_ow_met (the rule told), dx_ow_alone (he rang it off the wall before she told him), dx_ow_c1, dx_ow_c2 (games won),
//   dx_ow_c3 ('hers' | 'board': how the last game was first won), dx_ow_moved (the board moved: the quest done, the
//   court his), dx_ow_miss (misses in the game in play), dx_ow_hint (hints said in it), dx_ow_direct (straight hits),
//   dx_ow_bspot / dx_ow_lspot (the board's and the bell's spots on the court, 0..2), dx_ow_rings (rings off the wall on
//   the court), dx_ow_heard ('dig,steam,…': the later lines said). A move or a throw in progress is not saved: the
//   pieces are where the flags put them.
import * as THREE from 'three';
import { t } from '../i18n.js';
import { ChapterBase } from './base.js';
import { buildOffWall, OWC, flight } from '../offwall.js';
import { touch, handTo } from './reach.js';
import { TrackRunner } from '../../engine/scripts.js';
import '../text/offwall.js';

const COLOR = '#ffb070';
const NAME = { ow_tali: 'n_ow_tali', hero: 'n_hero' };
const COLORS = { ow_tali: COLOR, hero: '#8fc2ff' };
const TALI_REL = { f: 0.35, s: -0.12, u: 0.95 };   // (where her ball leaves her hand: a child's throw)
const STAGES = ['pre', 'c1', 'c2', 'c3', 'c3b', 'court'];
const PRAISE = { 5: 'ow_ring_5', 15: 'ow_ring_15', 30: 'ow_ring_30' };
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class OffTheWall extends ChapterBase {
  get D() { return this.game.regions?.built?.('desert') || null; }
  get C() { return this.D?.offwall || null; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  get open() { const i = this.idx('dig'); return i >= 0 && this.story.index >= i; }
  able() { const h = this.game.hero; return h.body !== 'zoe' && h.body !== 'worker' && !!h.hasBall; }
  here() { return this.game.room?.id === 'desert' && !!this.C; }
  W(p) { return this.C.W(p.x, p.z); }
  stage() {
    const f = this.f;
    if (f.dx_ow_moved) return 'court';
    if (!f.dx_ow_met) return 'pre';
    if (!f.dx_ow_c1) return 'c1';
    if (!f.dx_ow_c2) return 'c2';
    if (!f.dx_ow_c3) return 'c3';
    return 'c3b';
  }
  // the part of the story the island is in, for her later lines
  phase() {
    const k = this.story.cur?.key;
    if (k === 'dig' || k === 'steam' || k === 'home') return k;
    if (k === 'pass' || k === 'observatory') return 'mid';
    return 'late';
  }
  // where the bell, the board and the sand's lines are in a stage
  layout(st = this.stage()) {
    const f = this.f, O = OWC;
    if (st === 'court') {
      const b = clamp(f.dx_ow_bspot | 0, 0, 2), l = clamp(f.dx_ow_lspot | 0, 0, 2);
      return { bell: O.pBell[l], board: O.pBoard[b], marks: [...O.pBoard.map((p) => ({ kind: 'bspot', ...p })), ...O.pBell.map((p) => ({ kind: 'lspot', ...p }))] };
    }
    if (st === 'c3' || st === 'c3b') return { bell: O.bell.c3, board: O.board.c3, marks: [{ kind: 'ring', ...O.ring3 }] };
    if (st === 'c2') return { bell: O.bell.c2, board: O.board.store, marks: [] };
    return { bell: O.bell.c1, board: O.board.store, marks: [{ kind: 'ring', ...O.ring1 }] };
  }

  // ================================================================ the cast
  npcDefs() {
    const D = this.D, o = D?.group?.position;
    const p = o ? { x: o.x + OWC.tali.x, z: o.z + OWC.tali.z, angle: this.homeA() } : { x: 0, z: 0, angle: 0, pending: true };
    return [{ id: 'ow_tali', name: 'n_ow_tali', char: 'lulu', color: COLOR, ...p }];
  }
  homeA() { return angTo(OWC.tali, { x: -75.6, z: -75.5 }); }   // (she faces the bell's corner of the court)
  place(id) {
    if (id !== 'ow_tali') return undefined;
    if (!this.open) return null;
    if (!this.C) return undefined;   // (the island not built: she waits hidden)
    const n = this.npc(id);
    if (this.seq || (n?.track && n.track.pc < n.track.cmds.length)) return undefined;   // (walking to or from a piece: leave her at it)
    const w = this.W(OWC.tali);
    return { x: w.x, z: w.z, a: this.homeA(), track: null };
  }

  // ================================================================ the world from the flags
  decorate() {
    const D = this.D;
    if (!D || !D.group) return;
    if (!D.offwall) { buildOffWall(this.game, D); this.targets(); }
    else if (this.once('owTargets')) this.targets();
    this.applyWorld();
  }
  regionBuilt(ids) { if (ids.includes('desert')) { this.decorate(); } }
  applyFlags() {
    const f = this.f;
    // (consistent: each step implies the ones before it)
    if (f.dx_ow_moved && !f.dx_ow_c3) f.dx_ow_c3 = 'board';
    if (f.dx_ow_c3 && f.dx_ow_c3 !== 'hers' && f.dx_ow_c3 !== 'board') f.dx_ow_c3 = 'hers';
    if (f.dx_ow_c3) f.dx_ow_c2 = true;
    if (f.dx_ow_c2) f.dx_ow_c1 = true;
    if (f.dx_ow_c1) f.dx_ow_met = true;
    for (const k of ['dx_ow_bspot', 'dx_ow_lspot']) if (f[k] != null && !(Number.isInteger(f[k]) && f[k] >= 0 && f[k] <= 2)) delete f[k];
    // (the prize: owed from the moment the board moved; a save from before she handed it over gets it now, as depth.js
    //  settles every quest crystal)
    const D = this.story.depth;
    if (f.dx_ow_moved && D && !D.has('sc-trial') && !f.dx_owe_sc_trial && !this.game.pickups?.list?.some((p) => p.id === 'sc-trial')) { f.dx_owe_sc_trial = 1; D.settleCrystals?.(); }
    this.seq = null; this.mv = null; this.tb = null; this.thr = null; this.busy = false; this._q = [];
    this.C?.ballShow(null);
    this.applyWorld();
  }
  applyWorld() {
    const C = this.C; if (!C || this.mv) return;
    const L = this.layout();
    C.setBell(L.bell); C.setBoard(L.board); C.marks(L.marks);
    C.score(this.scoreLines());
    C.root.visible = this.open;
    C.boardCol.enabled = this.open && C.boardStanding();
    C.bellCol.enabled = this.open;
    this._plan = null;   // (her throw is planned again for the new layout)
  }
  scoreLines() { const f = this.f; return f.dx_ow_moved ? ['TALI 31', 'JOSS 2', `TWINSEN ${1 + (f.dx_ow_rings | 0)}`] : ['TALI 31', 'JOSS 2']; }
  // the bell as the ball's mark: never aimed at (the throw is his own: Game.ballAimTargets leaves out a target whose
  // node is lit), struck anywhere in a tall cylinder round it (the bell, its post and the air under it: a ball skipping
  // along the sand rings it too)
  targets() {
    const D = this.D, me = this, g = this.game;
    D.ballTargets.push({
      r: 0.5, material: 'armor', result: 'switch', node: { lit: true }, ow: true,
      get x() { return me.C.W(me.C.bell.x, me.C.bell.z).x; }, get z() { return me.C.W(me.C.bell.x, me.C.bell.z).z; },
      get y() { return clamp(g.ball?.pos?.y ?? 0, OWC.g + 0.1, OWC.g + 1.9); },
      get done() { return !me.live(); },
      onHit() { me.rung(); },
    });
  }
  // the bell can be rung now (her game is there and nothing is being carried)
  tali() { return (this._tali ||= this.npc('ow_tali')); }
  live() { return this.open && !!this.C && !this.mv && this.able() && !!this.tali()?.present; }
  inCourt(p) { const o = this.D.group.position, C = OWC.court; const x = p.x - o.x, z = p.z - o.z; return x > C.x0 && x < C.x1 && z > C.z0 && z < C.z1; }

  // ================================================================ his throws
  // the ball rang the bell: how it got there decides
  rung() {
    const g = this.game, f = this.f, C = this.C, B = g.ball;
    const cs = B.contacts || [], walls = cs.filter((c) => c.kind === 'wall'), sand = cs.some((c) => c.kind === 'ground');
    const board = walls.some((c) => c.c === C.boardCol);
    if (this.thr) this.thr.rung = true;
    C.ringBell(walls.length ? 1 : 0.6);   // (its clang is the hit's own: Game.impact, the 'armor' material)
    const st = this.stage();
    if (!walls.length) { f.dx_ow_direct = (f.dx_ow_direct | 0) + 1; return this.straight(st, sand); }
    switch (st) {
      case 'pre':
        f.dx_ow_alone = true;
        return this.say([['ow_tali', 'ow_pre_alone']]);
      case 'c1': return this.win('c1');
      case 'c2':
        if (sand) return this.fail([['ow_tali', this.pick('ow_c2_sand')]]);
        return this.win('c2');
      case 'c3': return board ? this.surprise() : this.win('c3');
      case 'c3b':
        if (board) return this.surprise();
        return this.say([['ow_tali', 'ow_c3b_again']]);
      case 'court': {
        f.dx_ow_rings = (f.dx_ow_rings | 0) + 1;
        C.score(this.scoreLines());
        g.hud.toast('ow_toast_ring', { n: 1 + f.dx_ow_rings });
        if (PRAISE[f.dx_ow_rings] && this.tali()?.present) return this.say([['ow_tali', PRAISE[f.dx_ow_rings]]]);
        g.save(false);
        return;
      }
    }
  }
  straight(st, sand) {
    const g = this.game;
    if (st === 'court') { g.hud.toast('ow_toast_direct'); return; }
    if (st === 'pre') return this.say([['ow_tali', 'ow_pre_direct'], ['ow_tali', 'ow_pre_direct2']]);
    return this.fail([['ow_tali', sand ? 'ow_ground' : this.pick('ow_direct')]]);
  }
  // a game won
  win(k) {
    const g = this.game, f = this.f;
    f.dx_ow_miss = 0; f.dx_ow_hint = 0;
    g.audio.play('found');
    if (k === 'c1') { f.dx_ow_c1 = true; return this.say([['ow_tali', 'ow_c1_done'], ['ow_tali', 'ow_c2_set']], () => this.moveBell(OWC.bell.c1, OWC.bell.c2)); }
    if (k === 'c2') { f.dx_ow_c2 = true; return this.say([['ow_tali', 'ow_c2_done'], ['ow_tali', 'ow_c3_set']], () => this.setupC3()); }
    // her way, the last game: proud of it; he asks about the board
    f.dx_ow_c3 = 'hers';
    return this.say([['ow_tali', 'ow_c3_mine'], ['hero', 'ow_tw_board'], ['ow_tali', 'ow_c3_board1'], ['ow_tali', 'ow_c3_board2']]);
  }
  // off the board: the way she never thought of. She moves the board into the court, and gives the prize
  surprise() {
    const g = this.game, f = this.f;
    if (f.dx_ow_moved) return;
    if (!f.dx_ow_c3) f.dx_ow_c3 = 'board';
    f.dx_ow_moved = true; f.dx_ow_bspot = 0; f.dx_ow_lspot = 0; f.dx_ow_miss = 0; f.dx_ow_hint = 0;
    g.audio.play('found');
    g.save(false);   // (saved as done: a save from here on has the board in the court and the crystal owed)
    this.say([['ow_tali', 'ow_wow_1'], ['ow_tali', 'ow_wow_2'], ['ow_tali', 'ow_wow_3']], () => {
      this.carry('tali', 'board', OWC.board.c3, OWC.pBoard[0], () => {
        this.settle(false);
        this.say([['ow_tali', 'ow_wow_4']], () => {
          const n = this.tali(), d = this.story.depth;
          if (n && d?.giveCrystal) d.giveCrystal('sc-trial', n.pos.x + Math.sin(n.angle) * 0.6, n.pos.y + 0.8, n.pos.z + Math.cos(n.angle) * 0.6, 'desert');
          this.say([['ow_tali', 'ow_wow_5']], () => { this.home(); g.hud.toast('ow_toast_court'); });
        });
      });
    });
  }
  // a try that did not win the game in play (a miss, a straight hit, a ring off the sand): counted; her hint after the
  // third and the sixth, said after her word on the try (or alone, for a plain miss). Nothing is lost
  miss() {
    const f = this.f, st = this.stage();
    if (!['c1', 'c2', 'c3', 'c3b'].includes(st)) return null;
    f.dx_ow_miss = (f.dx_ow_miss | 0) + 1;
    const lvl = f.dx_ow_miss >= 6 ? 2 : f.dx_ow_miss >= 3 ? 1 : 0;
    if (lvl <= (f.dx_ow_hint | 0)) return null;
    f.dx_ow_hint = lvl;
    return this.hintKey(st, lvl);
  }
  fail(lines) { const k = this.miss(); return this.say(k ? [...lines, ['ow_tali', k]] : lines); }
  hintKey(st, lvl) { return { c1: ['ow_c1_hint', 'ow_c1_hint2'], c2: ['ow_c2_hint', 'ow_c2_hint2'], c3: ['ow_c3_hint', 'ow_c3_hint'], c3b: ['ow_c3b_hint', 'ow_c3b_hint'] }[st]?.[lvl - 1]; }

  // ================================================================ moving the pieces
  // a piece carried from one spot to another by Tali or by him: he/she walks to it, takes hold (the hand on it), walks
  // to the new spot with it alongside, sets it down. The flags are already the new spot's: the move is only seen.
  handle(what, p) {
    if (what === 'bell') return { x: p.x + OWC.POST, z: p.z - 0.55 };
    return Math.abs(Math.sin(p.rot || 0)) > 0.5 ? { x: p.x, z: p.z - OWC.BOARD.w / 2 - 0.45 } : { x: p.x, z: p.z - 0.5 };
  }
  // where his hand takes hold, from the court's side (north): the post, or the board's frame (its face, or its north end)
  grip(what, p) {
    if (what === 'bell') return { x: p.x + OWC.POST, z: p.z - 0.07 };
    return Math.abs(Math.sin(p.rot || 0)) > 0.5 ? { x: p.x, z: p.z - OWC.BOARD.w / 2 - 0.05 } : { x: p.x, z: p.z - 0.1 };
  }
  carry(who, what, from, to, done) {
    const g = this.game, C = this.C, h = g.hero;
    const hA = this.handle(what, from), hB = this.handle(what, to), A = this.W(hA), Bw = this.W(hB);
    this.mv = { who, what, from, to, A, B: Bw, done, k: 0, lift: what === 'board' && from.down ? 0 : 1, phase: 'go' };
    if (what === 'board') C.boardCol.enabled = false; else C.bellCol.enabled = false;
    const finish = () => this.endCarry();
    if (who === 'tali') {
      const n = this.tali();
      if (!n?.present) { finish(); return; }
      this.walk(n, [
        { op: 'goto', x: A.x, z: A.z, speed: 1.1, near: 0.2 }, { op: 'face', a: angTo(A, this.W(what === 'bell' ? { x: from.x + OWC.POST, z: from.z } : from)) },
        { op: 'anim', name: 'reach', t: 0.6 }, { op: 'call', fn: () => { this.mv && (this.mv.phase = 'carry'); } },
        { op: 'goto', x: Bw.x, z: Bw.z, speed: 0.8, near: 0.2 }, { op: 'anim', name: 'reach', t: 0.5 },
        { op: 'call', fn: () => finish() },
      ]);
      return;
    }
    // him: his hand on it ('tinker': the board's frame, the bell's post at the hand's height), then the walk
    const at = this.W(this.grip(what, from)), tp = touch(at.x, at.z, 0, 'tinker');   // (from the court's side, facing the wall)
    this.busy = true;
    handTo(h, tp, () => {
      if (!this.mv) return;
      this.mv.phase = 'carry'; this.mv.A = { x: h.pos.x, z: h.pos.z };
      const ang = angTo(h.pos, Bw);
      h.walkTo([Bw], { a: ang, speed: 1.0, then: finish, fail: finish });
      if (h.steer) h.steer.indoor = true;
    });
  }
  endCarry() {
    const M = this.mv, C = this.C; if (!M) return;
    this.mv = null; this.busy = false;
    if (M.what === 'bell') C.setBell(M.to); else C.setBoard(M.to);
    C.bellCol.enabled = this.open;
    const n = this.tali();
    if (M.who === 'tali' && n) { n.track = null; n.forceAnim = null; }
    this.game.audio.play('put', this.W(M.to));
    const d = M.done; M.done = null;
    if (d) d(); else this.settle(M.who === 'tali');
    this.game.save(false);
  }
  // the moves are over: everything where the flags put it, and she goes back to her place
  settle(home = true) { this.applyWorld(); if (home) this.home(); }
  // she walks back to her place by the boulder
  home() {
    const n = this.tali(); if (!n?.present) return;
    const w = this.W(OWC.tali);
    this.walk(n, [{ op: 'goto', x: w.x, z: w.z, speed: 1.0, near: 0.2 }, { op: 'face', a: this.homeA() }]);
  }
  // her walk: busy with it (a person busy at something does not stop to face him when he stands close: actors.js
  // NPC.update), so she keeps walking past him; her hands' own moments (`anim`) in between; idle at its end
  walk(n, cmds) {
    const busy = { op: 'call', fn: (q) => { q.forceAnim = 'walk'; } };
    const out = [busy];
    for (const c of cmds) { out.push(c); if (c.op === 'anim') out.push(busy); }
    out.push({ op: 'call', fn: (q) => { if (q.forceAnim === 'walk') q.forceAnim = null; } });
    n.track = new TrackRunner(out); n.forceAnim = 'walk';
  }
  moveBell(from, to, done) { this.carry('tali', 'bell', from, to, done); }
  setupC3() { this.carry('tali', 'bell', OWC.bell.c2, OWC.bell.c3, () => this.carry('tali', 'board', OWC.board.store, OWC.board.c3, () => { this.settle(); this.say([['ow_tali', 'ow_c3_set2']]); })); }
  // the in-between of a move: the piece where its carrier has got to
  stepCarry(dt) {
    const M = this.mv, C = this.C; if (!M) return;
    const who = M.who === 'tali' ? this.tali() : this.game.hero;
    if (!who) return;
    if (M.phase === 'go' && M.what === 'board' && M.from.down) { /* lying: it waits */ }
    if (M.phase === 'carry' && M.lift < 1) M.lift = Math.min(1, M.lift + dt / 0.6);
    let k = 0;
    if (M.phase === 'carry') { const L = Math.hypot(M.B.x - M.A.x, M.B.z - M.A.z) || 1; k = clamp(1 - Math.hypot(M.B.x - who.pos.x, M.B.z - who.pos.z) / L, 0, 1); }
    M.k = Math.max(M.k, k);
    const f = M.from, to = M.to, lerp = (a, b) => a + (b - a) * M.k;
    let r0 = f.rot || 0, r1 = to.rot || 0; while (r1 - r0 > Math.PI) r1 -= Math.PI * 2; while (r1 - r0 < -Math.PI) r1 += Math.PI * 2;
    if (M.what === 'bell') C.setBell({ x: lerp(f.x, to.x), z: lerp(f.z, to.z) });
    else { C.setBoard({ x: lerp(f.x, to.x), z: lerp(f.z, to.z), rot: lerp(r0, r1), down: false }, M.lift); C.boardCol.enabled = false; }
    if (M.what === 'bell') C.bellCol.enabled = false;
  }

  // ================================================================ Tali's own throws
  // a throw of hers from (x, z) local that rings the bell off a wall: its angle and path (her ball flies the magic ball's
  // arc on the island's colliders: offwall.js flight). Off the board when it stands and that works (the board in play).
  planFrom(p, preferBoard = false) {
    const C = this.C, g = this.game, w = this.W(p), bw = this.W({ x: C.bell.x, z: C.bell.z });
    const hit = (x, y, z) => Math.hypot(x - bw.x, z - bw.z) < 0.45 && y > OWC.g + 0.1 && y < OWC.g + 1.9;
    let best = null, run = [], runs = [];
    const ok = (r) => r.hit && r.contacts.some((c) => c.kind === 'wall') && (!preferBoard || r.contacts.some((c) => c.c === C.boardCol));
    for (let d = -100; d <= 100; d += 1) {   // (toward the wall's side of the court: +z)
      const a = (d * Math.PI) / 180, r = flight(g, w.x, w.z, a, { rel: TALI_REL, hit });
      if (ok(r)) run.push({ a, r }); else if (run.length) { runs.push(run); run = []; }
    }
    if (run.length) runs.push(run);
    runs.sort((x, y) => y.length - x.length);
    if (runs[0]) best = runs[0][runs[0].length >> 1];
    if (!best && preferBoard) return this.planFrom(p, false);
    return best;
  }
  // her throw: the anim, the red ball along its path, the knocks and the bell
  taliThrow(p, done) {
    const n = this.tali(), g = this.game; if (!n?.present) { done?.(); return; }
    const plan = p.plan; if (!plan) { done?.(); return; }
    n.angle = n.targetAngle = plan.a;
    n.forceAnim = 'throw';
    this.tb = { plan, t: -0.5, done, n, ci: 0 };
    void g;
  }
  stepThrow(dt) {
    const T = this.tb, g = this.game, C = this.C; if (!T) return;
    T.t += dt;
    if (T.t > 0.5 && T.n.forceAnim === 'throw') T.n.forceAnim = null;
    if (T.t < 0) return;
    const P = T.plan.r.path, i = Math.min(P.length - 1, Math.floor(T.t * 60));
    C.ballShow(P[i]);
    // the knocks as it gets to them
    const cs = T.plan.r.contacts;
    while (T.ci < cs.length && cs[T.ci].i <= i) {
      const c = cs[T.ci++];
      g.audio.play(c.kind === 'wall' ? (c.c?.mat === 'wood' ? 'bounceWood' : 'bounceWall') : 'bounceGround', { x: c.at[0], z: c.at[2] });
    }
    if (i >= P.length - 1) {
      C.ballShow(null); this.tb = null;
      if (T.plan.r.hit) { C.ringBell(1); g.audio.play('clang', C.bellWorld()); }
      T.done?.();
    }
  }
  // her practice: now and then, when nobody is busy and he is about (before the game is told, and on the court after)
  ambient(dt) {
    const g = this.game, st = this.stage(), n = this.tali();
    if (!n?.present || this.tb || this.mv || this.seq || n.talking || (n.track && n.track.pc < n.track.cmds.length)) return;
    if (st !== 'pre' && st !== 'court') return;
    if (g.state !== 'play' || n.distTo(g.hero) > 28 || n.distTo(g.hero) < 2.5) { this._amb = Math.min(this._amb ?? 6, 6); return; }
    if (g.ball && g.ball.state !== 'idle' && g.ball.state !== 'inhand' && g.ball.state !== 'held') return;
    this._amb = (this._amb ?? 6) - dt;
    if (this._amb > 0) return;
    this._amb = 13 + Math.random() * 5;
    if (this._plan === null || this._plan === undefined) this._plan = this.planFrom(OWC.tali, st === 'court') || false;
    if (!this._plan) return;
    this.taliThrow({ plan: this._plan });
  }

  // ================================================================ interaction
  interactables(consider, dist) {
    if (!this.open || !this.here() || !this.able() || this.mv || this.busy || this.seq) return;
    const C = this.C, h = this.game.hero;
    if (h.steer || h.actT > 0) return;
    if (Math.abs(h.pos.y - OWC.g) > 0.6) return;
    const bw = this.W({ x: C.bell.x + OWC.POST, z: C.bell.z });
    const court = this.stage() === 'court';
    consider(dist(bw.x, bw.z), 1.2, { kind: 'dx_ow_bell', label: court ? 'p_move' : 'p_look' });
    const bh = this.W(C.board.down ? { x: C.board.x, z: C.board.z } : this.handle('board', C.board));
    consider(dist(bh.x, bh.z), C.board.down ? 1.6 : 1.2, { kind: 'dx_ow_board', label: court && !C.board.down ? 'p_move' : 'p_look' });
  }
  interact(it) {
    if (typeof it?.kind !== 'string' || !it.kind.startsWith('dx_ow_')) return false;
    const f = this.f, C = this.C, court = this.stage() === 'court';
    if (it.kind === 'dx_ow_bell') {
      if (!court) return this.look('ow_look_bell');
      const from = C.bell, l = ((f.dx_ow_lspot | 0) + 1) % 3;
      f.dx_ow_lspot = l;
      this.carry('hero', 'bell', from, OWC.pBell[l], null);
      return true;
    }
    if (it.kind === 'dx_ow_board') {
      if (!court || C.board.down) return this.look(C.board.down ? 'ow_look_board' : 'ow_look_board_c3');
      const from = C.board, b = ((f.dx_ow_bspot | 0) + 1) % 3;
      f.dx_ow_bspot = b;
      this.carry('hero', 'board', from, OWC.pBoard[b], null);
      return true;
    }
    return false;
  }
  look(key, vars) { const g = this.game; g.say('n_hero', [t(key, vars)], () => g.save(false), g.hero, COLORS.hero); return true; }

  // ================================================================ talk
  talkFirst(npc) {
    const id = npc?.def?.id;
    if (id !== 'ow_tali' || !this.open || !this.here()) return false;
    const g = this.game, f = this.f, h = g.hero, st = this.stage();
    if (!this.able()) return this.say([['ow_tali', 'ow_noball']]);
    if (this.mv || this.seq) return this.say([['ow_tali', 'ow_busy']]);
    const refill = h.mp < Math.min(3, h.mpMax);
    const top = (then) => { if (!refill) { then(); return true; } this.say([['ow_tali', 'ow_refill']], () => { h.mp = h.mpMax; g.audio.play('heal'); g.hud.toast('ow_toast_magic'); g.hud.stats?.(h); then(); }); return true; };
    if (st === 'pre') {
      f.dx_ow_met = true;
      if (f.dx_ow_alone) { f.dx_ow_c1 = true; f.dx_ow_miss = 0; return top(() => this.say([['ow_tali', 'ow_hi_1'], ['ow_tali', 'ow_hi_alone'], ['ow_tali', 'ow_c2_set']], () => this.moveBell(OWC.bell.c1, OWC.bell.c2))); }
      // the rule, then she shows it from her ring
      return top(() => this.say([['ow_tali', 'ow_hi_1'], ['ow_tali', 'ow_hi_2']], () => this.demo()));
    }
    if (st === 'court') {
      const ph = this.phase(), heard = String(f.dx_ow_heard || '').split(',').filter(Boolean);
      if (!heard.includes(ph)) { heard.push(ph); f.dx_ow_heard = heard.join(','); return top(() => this.say([['ow_tali', 'ow_later_' + ph]])); }
      return top(() => this.say([['ow_tali', this.pick('ow_court_any')]]));
    }
    // a game in play: her hint if one is due, else the game's own reminder
    const lvl = f.dx_ow_hint | 0, key = lvl ? this.hintKey(st, lvl) : 'ow_wait_' + st;
    return top(() => this.say([['ow_tali', key]]));
  }
  // her demonstration: to her ring, a throw off her X into the bell, back; the rest of the rule
  demo() {
    const n = this.tali(), r = this.W(OWC.ring1);
    if (!n?.present) { this.say([['ow_tali', 'ow_hi_3'], ['hero', 'ow_tw_hi'], ['ow_tali', 'ow_hi_4']]); return; }
    this.seq = 'demo';
    this.walk(n, [{ op: 'goto', x: r.x, z: r.z, speed: 1.1, near: 0.15 }, { op: 'call', fn: () => {
      const rest = () => { this.seq = null; n.track = null; this.say([['ow_tali', 'ow_hi_3'], ['hero', 'ow_tw_hi'], ['ow_tali', 'ow_hi_4']], () => this.home()); };
      const plan = this.planFrom(OWC.ring1);
      if (plan) this.taliThrow({ plan }, rest); else rest();
    } }]);
  }
  // a conversation (as ChapterBase.chain), with Tali under her own name and colour
  say(lines, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= lines.length) { const n = this.tali(); if (n) { n.talking = false; n.listenTo = null; } done?.(); g.save(false); return; }
      const [id, key] = lines[i];
      const sp = this.speaker(id), raw = Array.isArray(key) ? t(key[0])[key[1]] : t(key), text = Array.isArray(raw) ? raw : [raw];
      const tali = this.tali();
      if (tali && id === 'hero') tali.listenTo = g.hero;
      if (sp && sp !== g.hero) sp.talking = true;
      g.say(NAME[id] || 'n_' + id, text, () => { if (sp && sp !== g.hero) sp.talking = false; next(i + 1); }, sp, COLORS[id]);
    };
    next(0);
    return true;
  }
  pick(key) { const a = t(key); if (!Array.isArray(a)) return key; const N = (this._n ||= {}); N[key] = ((N[key] ?? -1) + 1) % a.length; return [key, N[key]]; }

  // ================================================================ per frame
  update(dt) {
    const g = this.game, C = this.C;
    if (!C) return;
    if (C.root.visible !== this.open) this.applyWorld();
    C.update(dt);
    const live = g.state === 'play' || g.state === 'dialog';
    if (!live) return;
    this.stepCarry(dt);
    this.stepThrow(dt);
    if (!this.here()) return;
    // his throws on the court: a new one is watched to its end (a miss, a dud with no magic)
    const B = g.ball, st = this.stage(), h = g.hero;
    if (B) {
      const flying = B.state === 'fly' || B.state === 'impact' || B.state === 'return';
      if (flying && !this.thr && B.life < 0.5) {
        this.thr = { court: this.inCourt(h.pos) && this.open && this.able(), rung: false, magic: B.magic !== false };
        if (this.thr.court && !this.thr.magic && this.tali()?.present && !this._dudSaid) { this._dudSaid = true; this.later(0.6, () => this.say([['ow_tali', 'ow_dud']])); }
      } else if (!flying && this.thr) {
        const T = this.thr; this.thr = null;
        if (T.court && !T.rung && T.magic) { const k = this.miss(); if (k && this.tali()?.present && g.state === 'play') this.say([['ow_tali', k]]); }
      }
    }
    if (h.mp >= 1) this._dudSaid = false;
    if (this._q?.length && g.state === 'play') for (let i = this._q.length - 1; i >= 0; i--) { const q = this._q[i]; if ((q.t -= dt) <= 0) { this._q.splice(i, 1); q.fn(); } }
    if (g.state === 'play') this.ambient(dt);
    // (a carry of his that never got going — the walk to the piece cut short — gives the court back after a while)
    if (this.mv && this.mv.who === 'hero' && this.mv.phase === 'go' && !h.steer && !(h.actT > 0) && g.state === 'play') { this._mvT = (this._mvT || 0) + dt; if (this._mvT > 3) { this._mvT = 0; this.endCarry(); } } else this._mvT = 0;
    // (hers: if she is stuck on the way — something in her path — the piece is put where it goes after a while)
    if (this.mv && this.mv.who === 'tali') { this._tvT = (this._tvT || 0) + dt; if (this._tvT > 25) { this._tvT = 0; this.endCarry(); } } else this._tvT = 0;
  }
  later(s, fn) { (this._q ||= []).push({ t: s, fn }); }

  journal() {
    const f = this.f, out = [];
    if (!f.dx_ow_met) return out;
    out.push({ key: 'ow_j_rule', done: !!f.dx_ow_c1 });
    if (f.dx_ow_c1) out.push({ key: 'ow_j_c2', done: !!f.dx_ow_c2 });
    if (f.dx_ow_c2) out.push({ key: 'ow_j_c3', done: !!f.dx_ow_c3 });
    if (f.dx_ow_c3 === 'hers') out.push({ key: 'ow_j_board', done: !!f.dx_ow_moved });
    if (f.dx_ow_moved) out.push({ key: 'ow_j_done', done: true });
    return out;
  }
}
