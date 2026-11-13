// CAMPAIGN-9 (the user's treatment of 11.11.2026, sections 8, 11 and 12): chapter 11's answer under the shell and chapter 12's
// last act. Not a chapter: chapter3.js owns it (story._sh, one instance for The Shell and The Core) and asks it first.
//
// The knocking since chapter 1 is the cracked shell's: three and a rest. Down here something answers it: a damper on an old
// flue at the catwalk's end knocks back two (up at home Arthur heard only the first of them: the "fourth" of chapter 10).
//   Chapter 11 (The Shell)
//   - the shaft: the crew's test receiver for the core's pylons, behind a blast stub; a brass plate and panel: the bank shot,
//     tried where nothing shoots back (Baldino asks; optional, never a lock)
//   - the machinery: steam vents over the catwalk. Her first answer slams the dampers over its east end (that end is safe);
//     at its far end the fitters' knocker: two knocks, and she counts back four, slow, and the west end's vents latch (the way
//     to valve C). Three is answered like the drill (two); other counts get nothing
//   - after the cooling the heat shutter starts down on him; her crystal grows up at its posts and holds it (shown, unexplained)
//   - the galleries: the third pillar's heart faces the far side: from the middle stone's plate, off the crew's survey mirror
//   - Sendell's chamber: the arch he came in by grows shut behind him (shown first); Sendell explains both; the checkpoint
//   Chapter 12 (The Core), after the coil (the fight is as it was): four steps he has done before
//   - Mill Lane's branch turned over to the mills at its cock, in the rest (in a knock it kicks back: chapter 8's cock)
//   - Irsa, at Kell's switch, on the radio: holding. Vesk hears it and turns his own key in the central lock (his choice)
//   - the central lock's bar lifted after her two, not after the shell's three (chapter 10's joint): the drill winds down
//   - two knocks on the main to Citadel: Arthur hears them on the kitchen pipe ("twice for water", chapter 2), Zoé sends the
//     signal, the bore turns to a shield; the council's guard names the cut log and the list
//
// Flags (new, saved): sh_v (the chapter-11 thread is on), sh_bank (the test receiver hit), sh_knock (her first answer: the
// east vents latched), sh_reply (her second: the west vents), sh_held (the shutter held), sh_shut (the arch shut behind him),
// co_v (the chapter-12 thread is on), co_go (the last act begun), co_branch, co_irsa, co_vesk (his key turned), co_lock,
// co_signal. 'past': a save from before that was already past the step. Without sh_v / co_v the chapters play as they did.
import { t } from '../i18n.js';
import { handTo, touch, standFor } from './reach.js';
import '../text/answer.js';

// the knocking under the shell: the shell's three, her two (softer), a rest
export const ANSWER = { cycle: 3.6, three: [0, 0.25, 0.5], two: [1.25, 1.5], len: 0.18, lift: [1.75, 3.45] };
const KNOCKS = [...ANSWER.three.map((a) => ({ a, her: false })), ...ANSWER.two.map((a) => ({ a, her: true }))];
const knockAt = (p) => { for (const k of KNOCKS) { const u = (p - k.a) / ANSWER.len; if (u >= -0.15 && u <= 1.15) return k; } return null; };
const MSG_GAP = 2.6;   // s of quiet after a knock that ends a message at the knocker

export class ShellThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.busy = false; this.pt = 0; this.later = []; this.walks = []; this.msg = null; this.inT = 0; this.said = {}; }
  get f() { return this.game.flags; }
  key() { return this.story.cur?.key; }
  shell() { return this.key() === 'shell' && !!this.f.sh_v; }
  core() { return this.key() === 'core' && !!this.f.co_v; }
  room() { return this.game.room?.id; }
  R(id) { return this.game.rooms?.[id]; }
  npc(id) { return this.ch.npc(id); }
  phase() { return this.pt % ANSWER.cycle; }
  // the last act is on: after the coil, before the end
  act() { const f = this.f; return this.core() && !!f.co_go && !!f.c3_turned && !f.c3_done; }

  // ---------------------------------------------------------------- state
  begin() { this.f.sh_v = 1; }
  beginCore() { this.f.co_v = 1; }
  applyFlags() {
    const f = this.f, k = this.key();
    // a save from before the thread: on, and a step it is past counts as done
    if (k === 'shell' && !f.sh_v) {
      f.sh_v = 1;
      if (f.c3_deepSeen) f.sh_bank ||= 'past';
      if (f.c3_cooled || f.c3_valves?.C) { f.sh_knock ||= 'past'; f.sh_reply ||= 'past'; }
      if (f.c3_cooled && (f.c3_gallerySeen || f.c3_pillar0 || f.c3_pillar1 || f.c3_pillar2)) f.sh_held ||= 'past';
      if (f.c3_sendell) f.sh_shut ||= 'past';
    }
    if (k === 'core' && !f.co_v) f.co_v = 1;   // (every save from before is ahead of the last act: the old chapter ended with it)
    this.busy = false; this.later = []; this.walks = []; this.msg = null; this.inT = 0;
    for (const n of this.game.npcs) if (n.shWalk) { n.shWalk = false; n.controlled = false; }
  }
  // the rooms as the flags have them (chapter3.js applyRooms asks)
  applyRooms() {
    const f = this.f, S = this.R('c3shaft'), D = this.R('c3deep'), N = this.R('c3sendell'), C = this.R('c3core');
    if (S?.teach && f.sh_bank === true) { S.teach.setLit(true); S.teach.target.done = true; }
    if (D?.vents) for (const v of D.vents) if ((v.side === 'east' && f.sh_knock) || (v.side === 'west' && f.sh_reply) || !f.sh_v || f.c3_done || this.key() === 'core') v.latch(true);   // (quiet once he is past them: the core, the epilogue)
    if (D?.coolDoor && f.sh_held === true && f.c3_cooled) D.coolDoor.hold(true);
    N?.seal?.set(f.sh_shut === true && !f.c3_done && !f.co_signal, true);
    if (C?.lock) {
      C.branch.set(!!f.co_branch, true); C.lock.turn(!!f.co_vesk, true); C.lock.lift(!!f.co_lock, true);
      if (f.co_lock && !f.c3_done) C.drill?.setSpin?.(0);
    }
  }

  // ---------------------------------------------------------------- people
  place(id) {
    const f = this.f, k = this.key();
    if (k !== 'shell' && k !== 'core') return undefined;
    // Irsa keeps Kell's switch on Mill Lane through the last chapters (chapter 10 left nobody there)
    if (id === 'zl_irsa') {
      const L = this.game.regions?.built?.('zeelich')?.lift;
      if (!L?.feed) return undefined;
      return { x: L.feed.x - 0.36, z: L.feed.front.z - 0.04, a: 0, anim: 'tinker' };
    }
    if (k !== 'core' || !f.co_v) return undefined;
    const C = this.R('c3core');
    if (id === 'vesk' && C?.lock && f.c3_turned && f.co_vesk && !f.c3_done) { const s = this.veskKey(); return { ...s, anim: 'tinker' }; }
    if (id === 'dp_guard') return f.co_signal && !f.c3_done && C?.guardSpot ? { ...C.guardSpot } : null;
    return undefined;
  }
  veskKey() { const K = this.R('c3core').lock.key, s = standFor('tinker', K.x, K.z, K.a); return { x: s.x, z: s.z, a: K.a }; }

  // ---------------------------------------------------------------- HUD (chapter3.js asks first; null: its own)
  objective() {
    const f = this.f, ch = this.ch, r = this.room();
    if (this.shell()) {
      if (r === 'c3shaft' && !f.c3_cooled && f.sh_bank !== 'past') return ch.goal('c3_obj_shaft') + ch.sub(!!f.sh_bank, 'sh_sub_bank');
      if (r === 'c3deep' && !f.c3_cooled) return ch.goal('c3_obj_cool') + ch.sub(!!f.c3_diagram, 'c3_sub_diagram') + ch.sub(!!f.c3_ladder, 'c3_sub_up') + (f.c3_ladder ? ch.sub(!!f.sh_reply, 'sh_sub_steam') : '');
      return null;
    }
    if (this.act()) {
      if (!f.co_branch) return ch.goal('co_obj_branch');
      if (!f.co_lock) return ch.goal('co_obj_lock');
      if (!f.co_signal) return ch.goal('co_obj_signal');
    }
    return null;
  }
  journal() {
    const f = this.f, out = [];
    if (this.key() === 'shell' || (f.sh_v && this.key() !== 'shell')) {
      if (f.sh_reply === true) out.push({ key: 'sh_j_answer', part: 1, done: true });
      if (f.sh_held === true) out.push({ key: 'sh_j_held', part: 1, done: true });
      if (f.sh_shut === true && f.c3_sendell) out.push({ key: 'sh_j_shut', part: 1, done: true });
    }
    if (f.co_v) {
      if (f.co_irsa) out.push({ key: 'co_j_lane', part: 2, done: true });
      if (f.co_vesk) out.push({ key: 'co_j_vesk', part: 2, done: true });
      if (f.co_signal) out.push({ key: 'co_j_signal', part: 2, done: true });
    }
    return out;
  }

  // ---------------------------------------------------------------- talk at the start, Sendell's words
  arriveLines() { return this.f.sh_v ? [['balradio', 'sh_bal_teach']] : []; }
  sendellLines() { const f = this.f; return f.sh_v && f.sh_shut === true ? [['sendell', 'sh_sendell_held'], ['hero', 'sh_tw_door'], ['sendell', 'sh_sendell_door'], ['sendell', 'sh_sendell_keep']] : []; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, r = this.room(), h = g.hero;
    if (this.busy || g.hero.actT > 0) return false;
    if (this.shell() && r === 'c3deep') {
      const K = this.R('c3deep').knocker;
      if (K && Math.abs(h.pos.y - (K.y - 1.21)) < 0.6) consider(dist(K.x, K.z), 1.25, { kind: 'sh_knock', label: 'p_knock' });
    }
    if (this.act() && r === 'c3core') {
      const C = this.R('c3core');
      if (!f.co_branch) consider(dist(C.branch.x, C.branch.z), 1.3, { kind: 'co_cock', label: 'p_cock' });
      else if (f.co_vesk && !f.co_lock) consider(dist(C.lock.grip.x, C.lock.grip.z), 1.3, { kind: 'co_lock', label: 'p_lockbar' });
      else if (f.co_lock && !f.co_signal) consider(dist(C.coreKnocker.x, C.coreKnocker.z), 1.3, { kind: 'co_knock', label: 'p_knock' });
    }
    return false;
  }
  interact(it) {
    switch (it.kind) {
      case 'sh_knock': this.knock(this.R('c3deep').knocker); return true;
      case 'co_knock': this.knock(this.R('c3core').coreKnocker); return true;
      case 'co_cock': this.turnCock(); return true;
      case 'co_lock': this.liftLock(); return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- the knocker (both chapters): a message is the knocks he
  // strikes with less than MSG_GAP between them
  knock(K) {
    const g = this.game, h = g.hero;
    const p = touch(K.x, K.z, K.a ?? Math.PI, 'tinker');
    handTo(h, p, () => {
      K.strike(); g.audio.play('pipeKnock', K); g.camRig.shake(0.05);
      if (!this.msg) this.msg = { n: 0, last: 0, K };
      this.msg.n++; this.msg.last = this.pt;
    });
  }
  endMessage(m) {
    const f = this.f;
    if (this.key() === 'core') { this.signal(m.n); return; }
    if (m.n === 2 && f.sh_reply !== true && f.sh_reply !== 'past') { this.secondReply(); return; }
    if (m.n === 3 || (m.n === 2 && f.sh_reply)) { this.after(0.5, () => this.herTwo()); if (m.n === 3) this.once('sh_k3', 'sh_k3', 'sh_toast_k3'); return; }
    this.once('sh_kn', m.n === 4 ? 'sh_k4' : 'sh_knone', 'sh_toast_knone');
  }
  once(id, key, toast) { if (!this.said[id]) { this.said[id] = true; this.after(0.4, () => this.ch.chain([['hero', key]])); } else if (toast) this.game.hud.toast(toast); }
  // her two, out of turn (an answer to his three)
  herTwo() { const D = this.R('c3deep'); if (!D?.damper) return; for (const [i, d] of [0, 0.25].entries()) this.after(d, () => { D.damper.clank(i ? 0.65 : 1); this.game.audio.play('clunk', D.damper); }); }
  // her second reply: four slow knocks on the damper, then the west vents latch one after the other
  secondReply() {
    const g = this.game, f = this.f, D = this.R('c3deep');
    this.busy = true;
    [0.6, 1.25, 1.9, 2.55].forEach((d) => this.after(d, () => { D.damper.clank(1); g.audio.play('clunk', D.damper); g.camRig.shake(0.06); }));
    D.vents.filter((v) => v.side === 'west').forEach((v, i) => this.after(3.1 + i * 0.35, () => { v.latch(); g.audio.play('clunk', v); g.particles.burst(v.nozzle.x, v.nozzle.y, v.nozzle.z, '#cbb994', 8, 1.6); }));
    this.after(3.9, () => { f.sh_reply = true; this.ch.chain([['hero', 'sh_four'], ['hero', 'sh_west']], () => { this.busy = false; g.updateObjective(); g.save(false); }); });
  }
  // her first answer seen: the east vents latch
  firstAnswer() {
    const g = this.game, f = this.f, D = this.R('c3deep');
    this.busy = true;
    D.vents.filter((v) => v.side === 'east').forEach((v, i) => this.after(0.35 + i * 0.3, () => { v.latch(); g.audio.play('clunk', v); g.particles.burst(v.nozzle.x, v.nozzle.y, v.nozzle.z, '#cbb994', 8, 1.6); }));
    this.after(1.4, () => { f.sh_knock = true; this.ch.chain([['hero', 'sh_two'], ['hero', 'sh_two2'], ['hero', 'sh_east']], () => { this.busy = false; g.updateObjective(); g.save(false); }); });
  }

  // ---------------------------------------------------------------- the shutter held; the shaft's test receiver
  holdShutter() {
    const g = this.game, f = this.f, D = this.R('c3deep');
    if (f.sh_held || !D?.coolDoor) return;
    f.sh_held = true; this.busy = true;
    D.coolDoor.hold(); g.audio.play('rumble'); g.camRig.shake(0.2);
    this.after(0.45, () => { g.audio.play('shard', D.coolDoor); g.particles.burst(D.coolDoor.x, 1.0, D.coolDoor.z, '#c8a0ff', 18, 3); });
    this.after(1.1, () => this.ch.chain([['hero', 'sh_held']], () => { this.busy = false; g.updateObjective(); g.save(false); }));
  }
  teachHit() {
    const g = this.game, f = this.f, S = this.R('c3shaft');
    S.teach.setLit(true); S.teach.target.done = true;
    g.audio.play('shard'); g.particles.burst(S.teach.target.x, S.teach.target.y, S.teach.target.z, '#9fe8ff', 18, 3);
    if (f.sh_bank) return;
    f.sh_bank = true;
    this.ch.chain([['balradio', 'sh_bal_bank']], () => { g.updateObjective(); g.save(false); });
  }
  // a pillar woken (chapter3.js lightPillar): the middle stone up, the third heart still dark
  onPillar() {
    const f = this.f;
    if (!this.shell() || f.c3_pillar2 || !f.c3_pillar1 || this.said.third) return;
    this.said.third = true;
    this.after(1.6, () => this.ch.chain([['hero', 'sh_third']]));
  }

  // ---------------------------------------------------------------- Sendell's chamber: the arch shut behind him first
  sealFirst(then) {
    const g = this.game, f = this.f, N = this.R('c3sendell');
    if (!this.shell() || f.sh_shut || !N?.seal) return false;
    f.sh_shut = true; this.busy = true;
    this.after(0.5, () => { N.seal.set(true); g.audio.play('shard', N.seal); g.audio.play('rumble'); g.camRig.shake(0.25); g.particles.burst(N.seal.x, 1.4, N.seal.z, '#c8a0ff', 22, 3.5); });
    this.after(1.5, () => this.ch.chain([['hero', 'sh_shut_tw']], () => { this.busy = false; then(); }));
    return true;
  }
  sealed() { return this.f.sh_shut === true && this.R('c3sendell')?.seal?.shut; }

  // ---------------------------------------------------------------- chapter 12: the last act
  lastAct() {
    const g = this.game, f = this.f;
    f.co_go = true;
    this.story.refreshCast({ walk: false });
    g.updateObjective(); g.save(false);
    if (!f.co_branch) this.ch.chain([['hero', 'co_tw_lane']], () => g.updateObjective());
  }
  turnCock() {
    const g = this.game, f = this.f, C = this.R('c3core'), B = C.branch;
    this.busy = true;
    handTo(g.hero, touch(B.x, B.z, B.a, 'tinker'), () => {
      if (knockAt(this.phase())) {
        B.kick(); g.audio.play('clunk', B); g.audio.play('deny', B);
        if (!this.said.cock) { this.said.cock = true; this.ch.chain([['hero', 'co_cock_kick']], () => { this.busy = false; }); } else { g.hud.toast('co_toast_kick'); this.busy = false; }
        return;
      }
      B.set(true); g.audio.play('valve', B); f.co_branch = true;
      this.ch.chain([['hero', 'co_tw_cock']], () => this.irsaHolding());
    });
  }
  irsaHolding() {
    const g = this.game, f = this.f;
    g.audio.play('radio');
    this.ch.chain([['zl_irsaradio', 'co_irsa_1'], ['zl_irsaradio', 'co_irsa_2'], ['hero', 'co_tw_irsa']], () => { f.co_irsa = true; g.save(false); this.veskChooses(); });
  }
  // Vesk heard it: he gets up, walks to his lock and turns his own key (in view); his lines as himself
  veskChooses() {
    const g = this.game, f = this.f, C = this.R('c3core'), v = this.npc('vesk');
    const done = () => {
      C.lock.turn(true); g.audio.play('lever', C.lock); f.co_vesk = true;
      if (v) { v.shWalk = false; v.controlled = false; }
      this.story.refreshCast();
      this.ch.chain([['vesk', 'co_vesk_key'], ['hero', 'co_tw_key']], () => { this.busy = false; g.updateObjective(); g.save(false); });
    };
    const say = [['vesk', f.c3_veskHelped ? 'co_vesk_up_helped' : 'co_vesk_up_left']];
    if (!v?.present) { this.ch.chain(say, done); return; }
    this.ch.fx?.release?.(); v.rig.ko = null; v.rig.play('idle');
    this.ch.chain(say, () => {
      const s = this.veskKey();
      this.walkNpc(v, [s], () => { v.angle = s.a; v.rig.play('tinker'); this.after(0.6, done); }, 0.9);
    });
  }
  liftLock() {
    const g = this.game, f = this.f, C = this.R('c3core'), L = C.lock;
    this.busy = true;
    handTo(g.hero, touch(L.grip.x, L.grip.z, L.grip.a, 'tinker'), () => {
      const p = this.phase();
      if (p >= ANSWER.lift[0] && p <= ANSWER.lift[1]) {
        L.lift(true); f.co_lock = true; g.audio.play('lever', L); g.audio.play('rumble'); g.camRig.shake(0.25);
        this.spinDown = 1;
        this.ch.chain([['hero', 'co_lock_ok']], () => { this.busy = false; g.updateObjective(); g.save(false); });
        return;
      }
      L.lift(true); this.after(0.35, () => { L.lift(false); L.slam(); g.audio.play('clunk', L); g.audio.play('deny', L); });
      const early = p > ANSWER.three[2] + ANSWER.len && p < ANSWER.two[0];
      if (!this.said.slam) { this.said.slam = true; this.after(0.5, () => this.ch.chain([['hero', early ? 'co_lock_slam' : 'co_lock_knock']], () => { this.busy = false; })); }
      else { this.after(0.5, () => { g.hud.toast('co_toast_slam'); this.busy = false; }); }
    });
  }
  // two knocks on the main: Arthur hears them on the kitchen pipe (or Zoé in the lamp room), Zoé sends the signal
  signal(n) {
    const g = this.game, f = this.f, home = !!f.nw_v && f.nw_zoe !== 'past';
    this.busy = true;
    g.audio.play('radio');
    if (n !== 2) { this.ch.chain([[home ? 'arthurradio' : 'zoeradio', home ? 'co_ar_wrong' : 'co_zoe_wrong']], () => { this.busy = false; }); return; }
    this.ch.chain([...(home ? [['arthurradio', 'co_ar_two'], ['zoeradio', 'co_zoe_sig']] : [['zoeradio', 'co_zoe_two_b']])], () => { f.co_signal = true; this.shield(); });
  }
  shield() {
    const g = this.game, f = this.f, C = this.R('c3core'), N = this.R('c3sendell');
    C.drill?.setMode?.('shield'); C.field?.setLevel?.(1);
    for (const P of C.pylons || []) P.setState?.(2);
    g.audio.play('horn'); g.camRig.shake(0.3);
    N?.seal?.set(false);   // (she sleeps: the arch behind is open again)
    g.save(false);
    this.ch.chain([['sendell', 'c3_sendell_end'], ['balradio', 'co_bal_end']], () => this.guards());
  }
  // the council's guard comes in by the arch and takes Vesk: the cut log and the list
  guards() {
    const g = this.game, f = this.f, C = this.R('c3core'), n = this.npc('dp_guard');
    const talk = () => this.ch.chain([['dp_guard', 'co_guard_1'], ['vesk', 'co_vesk_guard'], ['dp_guard', 'co_guard_2']], () => { this.busy = false; this.ch.finish(); });
    this.story.refreshCast();
    if (!n?.present || !C.spawn) { talk(); return; }
    const sp = C.guardSpot;
    n.pos.set(C.spawn.x, g.physics.groundAt(C.spawn.x, C.spawn.z), C.spawn.z); n.sync();
    this.walkNpc(n, [sp], () => { n.angle = sp.a; talk(); }, 1.3);
  }

  // ---------------------------------------------------------------- walks, timers
  after(t, fn) { this.later.push({ t, fn }); }
  walkNpc(n, pts, done, speed = 1.2) { n.controlled = true; n.shWalk = true; n.talking = false; this.walks.push({ n, pts: pts.map((q) => ({ x: q.x, z: q.z })), i: 0, t: 0, done, speed }); }
  stepWalks(dt) {
    const g = this.game;
    for (const W of [...this.walks]) {
      const n = W.n, tg = W.pts[W.i]; W.t += dt;
      const end = () => { this.walks.splice(this.walks.indexOf(W), 1); const e = W.pts.at(-1); n.pos.set(e.x, g.physics.groundAt(e.x, e.z, n.pos.y + 1.2), e.z); n.sync(); W.done?.(); };
      if (!tg || W.t > 14 || !n.present) { end(); continue; }
      const dx = tg.x - n.pos.x, dz = tg.z - n.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { W.i++; if (W.i >= W.pts.length) end(); continue; }
      const hd = Math.atan2(dx, dz); n.angle += Math.atan2(Math.sin(hd - n.angle), Math.cos(hd - n.angle)) * Math.min(1, dt * 9);
      const s = Math.min(d, W.speed * dt), nx = n.pos.x + (dx / d) * s, nz = n.pos.z + (dz / d) * s;
      n.pos.set(nx, g.physics.groundAt(nx, nz, n.pos.y + 1.2), nz);
      n.rig.play('walk'); n.rig.update(dt, W.speed); n.sync();
    }
  }

  // ---------------------------------------------------------------- what moves
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, r = this.room();
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    this.stepWalks(dt);
    const k = this.key();
    if (!(k === 'shell' && f.sh_v) && !(k === 'core' && f.co_v)) return;
    const p0 = this.phase(); this.pt += dt; const p1 = this.phase();
    const crossed = (a) => (p0 <= p1 ? p0 < a && p1 >= a : p0 < a || p1 >= a);
    const play = g.state === 'play' && !g.trans;
    // a message at the knocker ends after a quiet
    if (this.msg && play && h.actT <= 0 && this.pt - this.msg.last > MSG_GAP) { const m = this.msg; this.msg = null; this.endMessage(m); }
    // the plates line him up (standing still on one)
    this.plates(dt);
    if (r === 'c3deep' && k === 'shell') this.deep(dt, crossed, play);
    if (r === 'c3core' && this.act()) {
      const C = this.R('c3core');
      for (const kk of KNOCKS) if (crossed(kk.a) && !(kk.her === false && f.co_signal)) { g.audio.play(kk.her ? 'clunk' : 'pipeKnock', C.coreKnocker); if (!f.co_branch && !kk.her) C.branch.kick(); }
      if (this.spinDown > 0) { this.spinDown = Math.max(0, this.spinDown - dt / 2.5); C.drill?.setSpin?.(0.8 * this.spinDown); }
    }
  }
  plates(dt) {
    const g = this.game, h = g.hero, r = this.room();
    let P = null;
    if (r === 'c3shaft' && this.shell()) P = this.R('c3shaft').teach?.plate;
    if (r === 'c3gallery' && this.key() === 'shell') { const S = this.R('c3gallery').stonePlate; if (S?.up() && !this.f.c3_pillar2) P = S; }
    const M = (r === 'c3shaft' ? this.R('c3shaft').teach?.mat : r === 'c3gallery' ? this.R('c3gallery').stonePlate?.mat : null);
    if (M) M.emissiveIntensity = P ? 0.35 + Math.sin(g.time * 3) * 0.2 : 0.1;
    if (!P || !h.onGround || (h.speed ?? 0) >= 0.4 || g.state !== 'play') return;
    const d = Math.hypot(h.pos.x - P.x, h.pos.z - P.z);
    if (d < 0.55) { const kk = Math.min(1, (dt || 0.016) * 8); h.pos.x += (P.x - h.pos.x) * kk; h.pos.z += (P.z - h.pos.z) * kk; h.angle = P.a; }
  }
  // the machinery: her answers on the damper, the shell's knocks in the pipes, the steam over the catwalk
  deep(dt, crossed, play) {
    const g = this.game, f = this.f, h = g.hero, D = this.R('c3deep');
    if (!D?.vents) return;
    this.inT += dt;
    for (const kk of KNOCKS) if (crossed(kk.a)) {
      if (kk.her) { D.damper.clank(kk.a === ANSWER.two[0] ? 1 : 0.65); g.audio.play('clunk', D.damper); }
      else g.audio.play('pipeKnock', D.damper);
      // her first answer, seen: on her second knock, once he is where the damper and the catwalk are in view (or has been in
      // the room a while)
      const near = Math.hypot(h.pos.x - D.damper.x, h.pos.z - D.damper.z) < 10.5;
      if (kk.her && kk.a === ANSWER.two[1] && !f.sh_knock && !this.busy && play && this.inT > 2.5 && (near || this.inT > 40)) this.firstAnswer();
    }
    // the steam out of every vent not latched: a white plume down over the deck; standing in one burns and pushes him out
    this.steamT = (this.steamT || 0) - dt;
    const puff = this.steamT <= 0; if (puff) this.steamT = 0.12;
    for (const v of D.vents) {
      if (v.latched) continue;
      if (puff) { const R = Math.random; g.particles.spawn({ x: v.nozzle.x + (R() - 0.5) * 0.9, y: v.nozzle.y, z: v.nozzle.z, vx: (R() - 0.5) * 0.4, vy: -1.2 - R(), vz: 1.2 + R() * 0.8, color: '#f4f8ff', a: 0.5, s0: 0.35, s1: 1.3, life: 0.8, grav: -0.6, drag: 0.6, add: 0.08, cell: 1, fi: 0.1, fo: 0.4 }); }
      if (play && !h.dead && h.pos.x > v.x0 && h.pos.x < v.x1 && h.pos.z > v.z0 && h.pos.z < v.z1 && Math.abs(h.pos.y - v.y) < 0.7) {
        const from = { x: v.x + (h.pos.x > v.x ? -1 : 1), y: h.pos.y, z: h.pos.z };
        if (!(h.invuln > 0)) { h.damage(1, from); g.audio.play('steam', v); if (!this.said.burn) { this.said.burn = true; this.after(0.6, () => this.ch.chain([['hero', 'sh_burn']])); } }
      }
    }
    this.hissT = (this.hissT || 0) - dt;
    if (this.hissT <= 0 && D.vents.some((v) => !v.latched)) { this.hissT = 2.4; const v = D.vents.find((x) => !x.latched); if (Math.hypot(h.pos.x - v.x, h.pos.z - v.z) < 9) g.audio.play('steam', v); }
    // the cooled exchanger's shutter starts down as he comes near; her crystal holds it
    const S = D.coolDoor;
    if (f.c3_cooled && !f.sh_held && S && play && !this.busy && Math.abs(h.pos.x - S.x) < 3.4 && h.pos.z < S.z + 3.6) this.holdShutter();
  }
}
