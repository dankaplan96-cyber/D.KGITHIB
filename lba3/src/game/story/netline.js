// CAMPAIGN-8 (the user's treatment of 11.11.2026, section 10 "The network — allies take responsibility"): chapter 10's
// friends seen taking their stations over, and the knocking that turns from three to four. Not a chapter: network.js
// owns it (story._nw) and asks it first.
//
// Chapter 9 ended on Mill Lane with Baldino's isolator on Kell's feed box and "A network!". Here:
//   - Baldino wants the isolator back for the station's cracked code-line joint; Irsa has run the mills' line onto Kell's
//     feed switch (the bypass the project never built). He unclips the isolator, and Irsa takes the switch as he lets go
//     (Mill Lane is on his way from the old mill to the spaceport).
//   - On Citadel, Arthur, at home on the radio with his ear on the kitchen pipe (Zoé's job for him), counts the knocking:
//     three and a rest, and now four. In the valve room Mira reads the same on her FORTRESS gauge before anyone acts on
//     it; the needles kick four and rest.
//   - At each station the friend walks up and takes the handle as he lets go, seen before he leaves: Mira a valve wheel,
//     Zoé the dial bank (from its west end, clear of the way round), Ilka the bore's relief wheel (as the drones come;
//     Dallan at the relay after the fight), Pim a mirror's frame and Yorna the telescope's lever (both come up the ridge).
//   - The station's code box: the joint is Twinsen's. It jumps on every knock; the isolator, clipped on in the rest after
//     the fourth, bites and holds. Clipped after the third, the fourth throws it off.
//
// Flags (new, saved): nw_v (a game with the thread: set at chapter 10's start, or on loading a chapter-10 save from before),
// nw_irsa (Irsa holds the lane, the isolator in his pocket; 'past': a save from before that had left Zeelich), nw_irsaTold,
// nw_old (the thread was put on a save from before it),
// nw_arthur (Arthur's count heard), nw_gauge (Mira's reading), nw_mira, nw_zoe, nw_ilka, nw_yorna (each: the friend took the
// handle; 'past' in a save from before that was past it), nw_jointTold, nw_kick (the fourth throws the clip off: said
// once), nw_joint (clipped on). Without nw_v the chapter plays as it did.
import * as THREE from 'three';
import { handTo, touch } from './reach.js';
import { buildCodeJoint } from '../codejoint.js';
import '../text/netline.js';

// the knocking in chapter 10: three quick knocks, a short gap, a fourth (softer, late), and a rest; a 3 s cycle
export const FOUR = { cycle: 3.0, at: [0, 0.25, 0.5, 1.3], len: 0.18, soft: 0.6, ok: [1.52, 2.6] };
export const kickAt = (p) => { for (let i = 0; i < FOUR.at.length; i++) { const u = (p - FOUR.at[i]) / FOUR.len; if (u >= 0 && u <= 1) return Math.sin(Math.PI * u) * (i === 3 ? FOUR.soft : 1); } return 0; };
const HOUSE_RADIO = { x: 3.35, z: 1.35, a: Math.PI / 2 };   // (the house's own metres: Arthur's toy corner, the radio on its side table)

export class NetThread {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.story = ch.story; this.busy = false; this.walks = []; this.pt = 0; this.later = []; }
  get f() { return this.game.flags; }
  get on() { return !!this.f.nw_v; }
  cur() { return this.ch.isCur(); }
  room() { return this.game.room?.id; }
  npc(id) { return this.ch.npc(id); }
  get L() { return this.game.regions?.built?.('zeelich')?.lift; }
  phase() { return this.pt % FOUR.cycle; }
  // Arthur waits at home by the radio (Zoé's job for him), not in the lamp room
  arthurHome() { return this.on && this.f.nw_zoe !== 'past'; }

  // ---------------------------------------------------------------- state
  begin() { this.f.nw_v = 1; }
  applyFlags() {
    const f = this.f, g = this.game, cur = this.cur();
    // a save from before the thread, in chapter 10: the thread is on; a step it is past counts as done
    if (cur && !f.nw_v) {
      f.nw_v = 1; f.nw_old = true;   // (where the save stands is known only once it is loaded: Mill Lane is decided in update)
      if (f.c10_valves) { f.nw_gauge ||= 'past'; f.nw_mira ||= 'past'; f.nw_arthur ||= 'past'; }
      if (f.c10_light) { f.nw_zoe ||= 'past'; f.nw_arthur ||= 'past'; }
      if (f.c10_boreRelay || f.c10_bore) f.nw_ilka ||= 'past';
      if (f.c10_pim) f.nw_yorna ||= 'past';
    }
    this.busy = false; this.walks = []; this.later = []; this.hold = null;
    for (const n of this.game.npcs) if (n.nwWalk) { n.nwWalk = false; n.controlled = false; }
    this.push();
  }
  push() {
    const f = this.f, on = this.on, cur = this.cur();
    // Kell's feed box: the isolator comes off once Irsa holds the lane (chapter 9's KellThread put it on)
    this.game.regions?.whenBuilt?.('zeelich', (Z) => { if (on && f.nw_irsa) Z.lift?.setIso(false); });
    this.joint()?.show(this.story.cur && ['network', 'shell', 'core'].includes(this.story.cur.key) && on && this.ch.done() >= 5);
    this.joint()?.clip(!!f.nw_joint);
    void cur;
  }
  // the joint at the station (built on Citadel, beside the code box, the first time it is asked for)
  joint() {
    const g = this.game, C = this.ch.codeBoxAt?.();
    if (this.J || !g.world?.root || !C) return this.J;
    this.J = buildCodeJoint({ root: g.world.root, physics: g.physics, x: C.x + 1.15, z: C.z + 0.1, box: C });
    this.J.show(false);
    return this.J;
  }

  // ---------------------------------------------------------------- people
  place(id) {
    const f = this.f, g = this.game, R = g.rooms;
    if (!this.cur() || !this.on) return undefined;
    switch (id) {
      case 'zl_irsa': {
        const L = this.L; if (!L) return undefined;
        return f.nw_irsa === true ? this.irsaSwitch() : f.nw_irsa ? undefined : this.irsaWait();
      }
      case 'arthur': {
        if (!this.arthurHome()) return undefined;
        const H = R.house; if (!H) return null;
        return { x: H.group.position.x + HOUSE_RADIO.x, z: H.group.position.z + HOUSE_RADIO.z, a: HOUSE_RADIO.a, anim: 'tinker' };
      }
      case 'mira':
        if (!f.c10_miraAsk || !R.valves) return undefined;
        if (f.nw_mira === true) return this.miraWheel(f.nw_wheel ?? 0);
        if (f.nw_gauge === true && !f.nw_mira) return this.miraBoard();
        return undefined;
      case 'zoe':
        return f.nw_zoe === true ? this.zoeDial() : undefined;
      case 'ilka':
        return f.nw_ilka === true && this.D ? this.ilkaWheel() : undefined;
      case 'dallan':
        return f.nw_ilka === true && f.c10_bore && this.D ? this.dallanRelay() : undefined;
      case 'pim':
        return f.c10_pim && f.c10_domeRelay && f.nw_yorna !== 'past' && R.obsv ? this.pimMirror() : undefined;
      case 'yorna': {
        if (!f.c10_pim || f.nw_yorna === 'past' || !R.obsv) return undefined;
        const T = R.obsv.telescope;
        if (f.nw_yorna === true) return this.yornaLever();
        return { x: T.x - 1.9, z: T.z + 1.3, a: Math.PI / 2, via: this.game.regions?.built('hamalayi')?.observatory?.door };
      }
    }
    return undefined;
  }
  get D() { return this.game.regions?.built?.('desert'); }
  // Mill Lane: Irsa beside the motor house, then at the feed switch (her hands on the box at the switch: he stood at the isolator
  // beside it). The friends' spots and their actions were tried for the hands (tests/campaign-hands.mjs: within 1.2 cm)
  irsaWait() { const L = this.L; return { x: L.feed.x - 0.9, z: L.feed.z - 1.05, a: 0.55 }; }
  irsaSwitch() { const L = this.L; return { x: L.feed.x - 0.36, z: L.feed.front.z - 0.04, a: 0, anim: 'tinker' }; }
  // the valve room: the wheels (story/network.js valves: their spots 0.72 m before the wheel's face), the gauge board
  wheel(i) { const v = this.game.rooms.valves.valves[i]; return { x: v.x, z: v.z - 0.72 }; }
  wheelTouch(i) { const w = this.wheel(i); return touch(w.x + 0.24, w.z + 0.03, Math.PI, 'tinker'); }
  miraWheel(i) { const w = this.wheel(i); return { x: w.x, z: w.z + 0.5, a: Math.PI, anim: 'use' }; }
  miraBoard() { const V = this.game.rooms.valves; return { x: V.board.x - 0.2, z: V.board.z + 2.3, a: Math.PI - 0.12 }; }   // (back from the board, clear of the wheels: he must reach them past her)
  // the lamp room: Zoé at the dial bank's west end, between the cabinet and the microphone's table, clear of the way round
  lightPt(deg, r) { const L = this.game.rooms.lighttop, c = L.group.position, ph = (deg * Math.PI) / 180; return { x: c.x + Math.sin(ph) * r, z: c.z + Math.cos(ph) * r }; }
  dialKnob(i) { const L = this.game.rooms.lighttop, d = L.dials[i]; const p = d.mesh.getWorldPosition(new THREE.Vector3()); return { x: p.x, y: p.y, z: p.z }; }
  dialTouch(i) {
    const L = this.game.rooms.lighttop, s = L.searches.find((x) => x.id === 'dial' + (i + 1)), k = this.dialKnob(i);
    return touch(k.x, k.z, Math.atan2(k.x - s.x, k.z - s.z), 'tinker');
  }
  zoeDial() { const p = this.lightPt(230, 1.95), k = this.dialKnob(0); return { ...p, a: Math.atan2(k.x - p.x, k.z - p.z), anim: 'tinker' }; }
  // the bore: the relief wheel on the well-head (desert.js: a red wheel in the y–z plane, 1.0 m west of the bore, its hub
  // 1.15 m up), its rim in his right hand from the west; the relay on the frame (network.js decorate)
  reliefWheel() { const b = this.D.bore; return { x: b.x - 1.0, z: b.z + 0.2 }; }
  reliefTouch() { const w = this.reliefWheel(); return touch(w.x - 0.05, w.z - 0.4, Math.PI / 2, 'tinker'); }
  ilkaWheel() { const w = this.reliefWheel(); return { x: w.x - 0.54, z: w.z, a: Math.PI / 2, anim: 'tinker' }; }
  dallanRelay() { const b = this.D.bore; return { x: b.x + 1.4 + 0.72, z: b.z - 1.2, a: -Math.PI / 2, anim: 'tinker' }; }
  // the dome: Pim at the frame's edge of the mirror nearest the relay; Yorna at the telescope's setting lever
  pimMirror() {
    const O = this.game.rooms.obsv, T = O.telescope, rx = T.x - 1.3, rz = T.z - 0.4;
    const m = O.mirrors.reduce((a, b) => (Math.hypot(b.x - rx, b.z - rz) < Math.hypot(a.x - rx, a.z - rz) ? b : a));
    // (behind the mirror, his hands on the back of its frame: the glass faces the relay; obsroom.js turns the frame's
    //  face, local +z, to the turntable's angle, ±45° by its type; he stands at the turntable's rim)
    const r = m.type === 'A' ? Math.PI / 4 : -Math.PI / 4, nx = Math.sin(r), nz = Math.cos(r), s = (nx * (rx - m.x) + nz * (rz - m.z)) > 0 ? -1 : 1;
    const x = m.x + nx * s * 0.5, z = m.z + nz * s * 0.5;   // (a boy's arms: at the turntable's rim; 'tinker' puts his hands on the frame's back)
    return { x, z, a: Math.atan2(m.x - x, m.z - z), anim: 'tinker' };
  }
  yornaLever() { const p = this.game.rooms.obsv.telescope.lever.touch(); return { ...p.front, a: p.a, anim: 'tinker' }; }

  // ---------------------------------------------------------------- HUD
  // (network.js asks: the objective's extra line, the markers, the journal, the items)
  objective() {
    const f = this.f, ch = this.ch;
    if (!this.cur() || !this.on || !f.c10_started) return null;
    if (ch.done() >= 5 && !f.c10_done) return f.nw_jointTold && !f.nw_joint ? ch.goal('nw_obj_joint') : null;
    return null;
  }
  subIrsa() { const f = this.f; return this.on && this.cur() && f.nw_irsa !== 'past' ? this.ch.sub(!!f.nw_irsa, 'nw_sub_irsa') : ''; }
  markers() {
    const f = this.f, ch = this.ch;
    if (!this.cur() || !this.on || !f.c10_started) return null;
    if (ch.done() >= 5 && !f.c10_done) { const J = this.joint(); return J ? ch.stars(J) : null; }
    if (!f.nw_irsa && this.room() === 'zeelich' && f.c10_mill) return ch.stars(this.L?.isoAt);
    return null;
  }
  journal() {
    const f = this.f;
    if (!this.on) return [];
    return [{ key: 'nw_j_irsa', done: f.nw_irsa === true }, { key: 'nw_j_four', done: f.nw_arthur === true && f.nw_gauge === true },
      { key: 'nw_j_held', done: !!f.c10_done && [f.nw_mira, f.nw_zoe, f.nw_ilka, f.nw_yorna].every((x) => x === true) }].filter((l) => l.done);
  }
  items() { const f = this.f; return this.on && this.cur() && f.nw_irsa === true && !f.nw_joint ? [{ id: 'iso', icon: 'part' }] : []; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, r = this.room(), h = g.hero;
    if (!this.cur() || !this.on || !f.c10_started || this.busy) return false;
    if (r === 'zeelich' && !f.nw_irsa && this.L && Math.abs(h.pos.y - this.L.y0) < 0.6) consider(dist(this.L.isoAt.x, this.L.isoAt.z), 1.2, { kind: 'nw_unclip', label: 'p_unclip' });
    if (!r && this.ch.done() >= 5 && !f.c10_done) { const J = this.joint(); if (J && !f.nw_joint) consider(dist(J.x, J.z), 1.4, { kind: 'nw_joint', label: 'p_joint' }); return true; }
    return false;
  }
  interact(it) {
    switch (it.kind) {
      case 'nw_unclip': this.unclip(); return true;
      case 'nw_joint': this.clipJoint(); return true;
    }
    return false;
  }
  talkFirst(npc) {
    const f = this.f, ch = this.ch, id = npc.def.id;
    if (!this.cur() || !this.on || this.busy) return false;
    const c = (lines, done) => { ch.chain(lines, done); return true; };
    const ok = () => { this.story.refreshCast({ walk: true }); this.game.updateObjective(); this.game.save(false); };
    switch (id) {
      case 'zl_irsa':
        if (f.nw_irsa === true) return c([['zl_irsa', 'nw_irsa_after']]);
        if (!f.nw_irsa) return c([['zl_irsa', f.nw_irsaTold ? 'nw_irsa_wait' : 'nw_irsa_1']], () => { f.nw_irsaTold = true; });
        return false;
      case 'arthur':
        if (this.arthurHome() && this.room() === 'house') return c([['arthur', 'nw_ar_home']]);
        return false;
      case 'mira':
        if (f.nw_mira === true) return c([['mira', 'nw_mira_after']]);
        return false;
      case 'zoe':
        if (f.nw_zoe === true) return c([['zoe', 'nw_zoe_after']]);
        if (f.nw_zoe) return false;
        if (!f.c10_zoeAsk) return c([['zoe', 'nw_zoe_1'], ['zoe', 'nw_zoe_2']], () => { f.c10_zoeAsk = true; ok(); });
        if (!f.c10_light) return c([['zoe', 'nw_zoe_again']]);
        return false;
      case 'ilka':
        if (f.nw_ilka === true && f.c10_boreRelay && !f.c10_bore) return c([['ilka', 'nw_ilka_hold']]);
        if (f.nw_ilka === true && f.c10_bore) return c([['ilka', 'nw_ilka_after']]);
        return false;
      case 'yorna':
        if (f.nw_yorna === true) return c([['yorna', 'nw_yorna_after']]);
        return false;
      case 'baldino':
        if (this.ch.done() >= 5 && !f.c10_done && !f.nw_joint) { this.tellJoint(); return true; }
        return false;
    }
    return false;
  }
  // the lines that change in a game with the thread (network.js asks): Ilka's second, Yorna's send-off, Sefa's first
  line(key) { const f = this.f; if (!this.on) return key; if (key === 'c10_ilka_2' && !f.nw_ilka) return 'nw_ilka_2'; if (key === 'c10_yorna_2' && f.nw_yorna !== 'past') return 'nw_yorna_2'; if (key === 'c10_keeper_1' && f.nw_yorna !== 'past') return 'nw_keeper_1'; return key; }

  // ---------------------------------------------------------------- the takeover
  // He holds the handle (touch point p, his hand on it: a held 'tinker'); `contact` runs as his hand meets it, then
  // `lines1`. The friend walks up to `near` (beside him), says `say`; he lets go and steps back to `back`; the friend steps
  // onto the handle (`flag` set: place() puts her there with her hands on it), then `lines2`, then `done`.
  takeover({ p, who, near, back, say = [], flag, val = true, contact, lines1 = [], lines2 = [], done }) {
    const g = this.game, h = g.hero, f = this.f, ch = this.ch;
    this.busy = true;
    const finish = () => { this.busy = false; this.hold = null; done?.(); };
    const stepIn = () => {
      f[flag] = val;
      const n = this.npc(who);
      const spot = this.place(who) ?? this.ch.place(who);
      const end = () => { if (n) { n.nwWalk = false; n.controlled = false; } this.story.refreshCast(); ch.chain(lines2, finish); };
      if (n?.present && spot) this.walkNpc(n, [spot], end, 1.0); else end();
    };
    const letGo = () => {
      h.actT = Math.min(h.actT, 0.01); h.actCb = null;
      let gone = false; const go = () => { if (!gone) { gone = true; stepIn(); } };
      h.walkTo([back], { a: p.a, speed: 1.4, then: go, fail: go }); if (h.steer) h.steer.indoor = true;
      this.after(2.5, go);
    };
    const walkUp = () => {
      const n = this.npc(who);
      if (!n?.present) { f[flag] = val; this.story.refreshCast(); ch.chain([...say, ...lines2], () => { h.actT = Math.min(h.actT, 0.01); finish(); }); return; }
      this.walkNpc(n, near, () => ch.chain(say, letGo));
    };
    this.hold = p;
    handTo(h, p, () => { contact?.(); ch.chain(lines1, walkUp); }, 60);
  }
  // a friend walked by the story (straight lines between the points; no planner: short ways in rooms and yards)
  walkNpc(n, pts, done, speed = 1.3) {
    n.controlled = true; n.nwWalk = true; n.forceAnim = null; n.talking = false;
    this.walks.push({ n, pts: pts.map((q) => ({ x: q.x, z: q.z })), i: 0, t: 0, done, speed });
  }
  stepWalks(dt) {
    const g = this.game;
    for (const W of [...this.walks]) {
      const n = W.n, tg = W.pts[W.i]; W.t += dt;
      const end = () => { this.walks.splice(this.walks.indexOf(W), 1); if (tg) n.pos.set(W.pts.at(-1).x, g.physics.groundAt(W.pts.at(-1).x, W.pts.at(-1).z, n.pos.y + 0.5), W.pts.at(-1).z); n.sync(); W.done?.(); };
      if (!tg || W.t > 12 || !n.present) { end(); continue; }
      const dx = tg.x - n.pos.x, dz = tg.z - n.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { W.i++; if (W.i >= W.pts.length) end(); continue; }
      const hd = Math.atan2(dx, dz); n.angle += Math.atan2(Math.sin(hd - n.angle), Math.cos(hd - n.angle)) * Math.min(1, dt * 9);
      const s = Math.min(d, W.speed * dt), nx = n.pos.x + (dx / d) * s, nz = n.pos.z + (dz / d) * s;
      n.pos.set(nx, g.physics.groundAt(nx, nz, n.pos.y + 0.5), nz);
      n.rig.play('walk'); n.rig.update(dt, W.speed); n.sync();
    }
  }

  // ---------------------------------------------------------------- Mill Lane: the isolator off, Irsa on the switch
  unclip() {
    const g = this.game, f = this.f, L = this.L, ch = this.ch;
    const go = () => this.takeover({
      p: L.isoAt, who: 'zl_irsa', near: [{ x: L.feed.x - 0.75, z: L.feed.front.z - 0.25 }], back: { x: L.isoAt.front.x + 0.55, z: L.isoAt.front.z - 0.75 },
      flag: 'nw_irsa',
      contact: () => { L.setIso(false); g.audio.play('clunk', L.isoAt); g.audio.play('deny', L.feed); },
      lines1: [['hero', 'nw_unclip']],
      say: [['zl_irsa', 'nw_irsa_2']],
      lines2: [['zl_kell', 'nw_kell_irsa'], ['zl_irsa', 'nw_irsa_3']],
      done: () => { g.found('iso', 'cn_iso_toast'); g.updateObjective(); g.save(false); },
    });
    if (!f.nw_irsaTold) { this.busy = true; ch.chain([['zl_irsa', 'nw_irsa_1']], () => { f.nw_irsaTold = true; this.busy = false; go(); }); } else go();
  }

  // ---------------------------------------------------------------- Citadel: Arthur's count; Mira's gauge
  heardArthur() {
    const g = this.game, f = this.f;
    this.busy = true;
    g.audio.play('radio');
    this.ch.chain([['arthurradio', 'nw_ar_1'], ['arthurradio', 'nw_ar_2'], ['hero', 'nw_tw_ar'], ['balradio', 'nw_bal_ar'], ['hero', 'nw_tw_ar2']], () => {
      f.nw_arthur = true; this.busy = false; g.updateObjective(); g.save(false);
    });
  }
  // network.js asks when he is brought down to the valve room: Mira goes to the board and reads the fortress gauge
  valvesIn() {
    const g = this.game, f = this.f, ch = this.ch, n = this.npc('mira');
    if (!this.on || f.nw_gauge) return false;
    this.busy = true;
    const spot = this.miraBoard();
    const read = () => {
      f.nw_gauge = true; if (n) { n.nwWalk = false; n.controlled = false; } this.story.refreshCast();
      ch.chain([['mira', f.nw_arthur === true ? 'nw_mira_1' : 'nw_mira_1b'], ['narrator', 'nw_gauge'], ['mira', 'nw_mira_2'], ['hero', 'c10_valve_hint']], () => { this.busy = false; g.updateObjective(); g.save(false); });
    };
    if (n?.present) this.walkNpc(n, [spot], read); else read();
    return true;
  }
  // the wheels set (network.js asks): he holds the last one he turned, Mira takes it
  valvesDone(then) {
    const f = this.f, i = this.lastValve ?? 0, w = this.wheel(i);
    f.nw_wheel = i;
    this.takeover({
      p: this.wheelTouch(i), who: 'mira', near: [{ x: w.x - 0.75, z: w.z + 0.95 }], back: { x: w.x + 0.75, z: w.z + 1.35 },
      flag: 'nw_mira', lines1: [['narrator', 'c10_valves_ok']], say: [['mira', 'nw_mira_hold']], done: then,
    });
  }

  // ---------------------------------------------------------------- the lighthouse: Zoé takes the dial bank
  lightDone(i, then) {
    const g = this.game, near = this.lightPt(250, 1.75), here = this.dialTouch(i);
    // (round the north and the west of the lens, to the bank's west end; he steps back toward the lens to let her by)
    const way = [this.lightPt(40, 1.25), this.lightPt(345, 1.2), this.lightPt(300, 1.2), near];
    this.takeover({
      p: here, who: 'zoe', near: way, back: { x: here.front.x + (this.lightPt(0, 0).x - here.front.x) * 0.25, z: here.front.z + (this.lightPt(0, 0).z - here.front.z) * 0.25 },
      flag: 'nw_zoe', lines1: [['zoe', 'nw_zoe_right'], ['arthurradio', 'nw_ar_mic']], say: [['zoe', 'nw_zoe_hold']], done: then,
      contact: () => g.audio.play('select'),
    });
  }

  // ---------------------------------------------------------------- the bore: the relief wheel, Ilka takes it as the drones come
  boreRelay(then) {
    const g = this.game, ch = this.ch, w = this.reliefWheel(), p = this.reliefTouch();
    this.takeover({
      p, who: 'ilka', near: [{ x: w.x - 1.15, z: w.z + 0.75 }], back: { x: p.front.x - 0.6, z: p.front.z - 0.65 },
      flag: 'nw_ilka',
      contact: () => { ch.lightRelay('bore'); g.audio.play('valve', w); g.audio.play('steam', w); },
      lines1: [['narrator', 'nw_relay_bore']], say: [['ilka', 'nw_ilka_hold']], done: then,
    });
  }

  // ---------------------------------------------------------------- the dome: Pim to the mirror; the lever to SUNS, Yorna takes it
  domeRelay() {
    const n = this.npc('pim'), spot = this.pimMirror();
    if (n?.present) this.walkNpc(n, [spot], () => { n.nwWalk = false; n.controlled = false; this.story.refreshCast(); });
  }
  domeScope(then) {
    const g = this.game, O = g.rooms.obsv, T = O.telescope, p = T.lever.touch();
    this.takeover({
      p, who: 'yorna', near: [{ x: p.front.x - 0.7, z: p.front.z + 0.75 }], back: { x: p.front.x - 0.75, z: p.front.z - 0.55 },
      flag: 'nw_yorna',
      contact: () => { T.setting(2); T.pose('stars'); g.audio.play('lever', T); g.camRig.shake(0.2); this.ch.lightRelay('dome'); this.f.c10_domeLit = true; },
      lines1: [['narrator', 'nw_scope']], say: [['yorna', 'nw_yorna_hold']], lines2: [['pim', 'c10_pim_2'], ['keeper', 'c10_keeper_2']], done: then,
    });
  }

  // ---------------------------------------------------------------- the station: the joint is his
  tellJoint(then) {
    const f = this.f;
    this.busy = true;
    const past = f.nw_irsa !== true;
    this.ch.chain([['baldino', past ? 'nw_bal_joint_b' : 'nw_bal_joint'], ['hero', 'nw_tw_joint']], () => { f.nw_jointTold = true; if (past) f.nw_irsa ||= 'past'; this.busy = false; this.game.updateObjective(); then?.(); });
  }
  clipJoint() {
    const g = this.game, f = this.f, h = g.hero, J = this.joint();
    if (!f.nw_jointTold) { this.tellJoint(); return; }   // (Baldino says what it wants first; then it is his to time)
    this.busy = true;
    handTo(h, J.touch, () => {
      const p = this.phase(), ok = p >= FOUR.ok[0] && p <= FOUR.ok[1];
      this.lastTry = { p: +p.toFixed(2), ok };
      if (ok) {
        f.nw_joint = true; J.clip(true); g.audio.play('clunk', J);
        this.ch.chain([['hero', 'nw_clip']], () => { this.busy = false; this.ch.sendCode(); });
        return;
      }
      g.audio.play('clunk', J); g.audio.play('deny', J); J.kick(1);
      if (!f.nw_kick) { f.nw_kick = true; this.ch.chain([['hero', 'nw_kick']], () => { this.busy = false; }); }
      else { g.hud.toast('nw_toast_kick'); this.busy = false; }
    });
  }
  // the roll call while the code goes (network.js sendCode): Irsa and Arthur too
  rollCall() {
    const f = this.f;
    return [['miraradio', 'c10_radio_mira'], ['zoeradio', 'c10_radio_zoe'], ['okuradio', 'c10_radio_oku'], ...(f.nw_irsa === true ? [['zl_irsaradio', 'nw_radio_irsa']] : []),
      ['ilkaradio', 'c10_radio_ilka'], ['pimradio', 'c10_radio_pim'], ...(this.arthurHome() ? [['arthurradio', 'nw_radio_arthur']] : [])];
  }

  // ---------------------------------------------------------------- what moves
  after(t, fn) { this.later.push({ t, fn }); }
  update(dt) {
    const g = this.game, f = this.f;
    if (this.later.length) { for (const l of this.later) l.t -= dt; const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    this.stepWalks(dt);
    if (!this.cur() || !this.on) return;
    this.pt += dt;
    // (a save from before the thread that has left Zeelich: Mill Lane counts as done — Baldino brings the isolator himself)
    if (f.nw_old && !f.nw_irsa && g.state === 'play' && !g.trans && this.ch.region() !== 'zeelich') f.nw_irsa = 'past';
    const k = kickAt(this.phase()), r = this.room();
    // the valve room's needles kick with the knocking (four, and a rest), around where the wheels put them
    if (r === 'valves' && f.c10_started) { const lv = this.ch.gaugeLevels(); g.rooms.valves.gauges.set(lv.map((v, i) => v + k * (i === 0 ? 0.45 : 0.25))); }
    if (!r && this.J && this.ch.done() >= 5) this.J.kick(k);
    // a knock heard at the joint and in the valve room, at each kick's start
    const kk = k > 0.05; if (kk && !this.kWas && (r === 'valves' || (!r && this.J && Math.hypot(g.hero.pos.x - this.J.x, g.hero.pos.z - this.J.z) < 12))) g.audio.play('pipeKnock', r ? null : this.J);
    this.kWas = kk;
    // Arthur's call, the first time he is on Citadel in this chapter (in play)
    if (!f.nw_arthur && f.c10_started && !this.busy && g.state === 'play' && !g.trans && !g.cine && this.ch.region() === 'citadel' && this.arthurHome()) this.heardArthur();
  }
}

