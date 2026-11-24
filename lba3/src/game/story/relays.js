// EXPANSION WAVE 1 (24.11.2026, CONTENT-15H.md §3 wave 1; DEPTH-PLAN.md cards C11-1 and C12-1). Not a chapter: chapter3.js
// owns both threads (story._rl, story._fd: one instance each for The Shell and The Core) and asks them.
//
// H-1 · Baldino's relays down the shaft (chapter 15, The Shell; 11 on the base campaign). Baldino pressed two relays into
// Twinsen's hands at the collar: below the shaft his radio goes blind, and relays talk by sight. In each of the two halls
// of the descent (the deep installation, the crystal galleries) the crew left survey brackets; a relay clamped on one
// shows two lamps, each on the side of the door it is for: green when it sees that door (the physics' own line of sight,
// the guards' rule, from the relay's head to the doorway), red when it doesn't. Only one bracket per hall sees both: in
// the machinery the catwalk's east post (from the floor the shutter is out of sight along its wall); in the galleries the
// bracket by the old arch (the pillars hide the arch from the start shelf, and the tunnel from most of the far shelf). A
// relay is lifted and moved freely until he leaves the hall through its far door: that door refuses him (a line, then a
// toast) until a relay there has both lamps green; going through fixes it and takes any spare along. Past the galleries
// Sendell's light carries the signal (Baldino says so in her chamber).
//   Flags (saved): dx_relay_v (on), dx_relay_told (the hook said), dx_relay_at ('D2,G1': the brackets holding a relay),
//   dx_relay_deep / dx_relay_gal (true: fixed by play; 'past': a save from before that was already past the hall).
//   A relay is never lost: two minus the placed ones are in his hands.
//
// H-2 · The allies' feeds at the deck ring (chapter 16, The Core; 12 on the base campaign). A bank shot no longer turns a
// pylon on its own: it opens it (amber), and the open pylon draws on the guardian, which sags and cannot rise until the
// pylon holds (no enemy pressure during a box; the fight itself is as long as before). The ally of that pylon's station
// speaks (through the relays) and asks for one thing at the junction box beside it, labelled with the station; done, the
// pylon holds (as before: cyan, the ally's old line, the guardian a level up) and the fight goes on.
//   LIGHTHOUSE (Zoé): three dials, star, sun, wave, the same as always (chapters 3 and 10). All three different but not
//   in that order: a buzz, and Zoé says it once.
//   MAINS (Mira): the wheel raises the needle a notch a turn; stop between the two marks (her chapter-10 rule) and let it
//   settle; past the second it trips back to nothing.
//   MILLS (Oku): the coupling's flywheel spins with a painted mark; a ball hit brakes it: with the mark near the top it
//   holds, otherwise it slips loose and spins on (no penalty).
//   Flags (saved): c3_prime (the pylon open, its box waiting), dx_feed_light / dx_feed_mains / dx_feed_mills (true, or
//   'past': a pylon a save from before had already turned). A reload during a box comes back to that box, the pylon
//   open and the guardian down (the box starts over).
import * as THREE from 'three';
import { MAT, rbox, cyl, sphere, torus, disc, plane, canvasTex, CANV, Kit, valveWheel } from '../props.js';
import { glowSprite } from '../interiors.js';
import '../text/relays.js';

// ================================================================ H-1: the relays
// the survey brackets, in each room's own frame (metres from the room builder's origin; y: the floor they stand on)
//   post: a freestanding post on the floor; rail: an arm off the catwalk's east post, over the catwalk
export const BRACKETS = [
  { id: 'D1', room: 'c3deep', x: -8.8, z: 3.5, y: 0, post: true },          // the floor, beside the way in from the shaft
  { id: 'D2', room: 'c3deep', x: -0.2, z: -6.2, y: 3.0, post: false },      // the catwalk's east post (the one that sees both)
  { id: 'G1', room: 'c3gallery', x: -9.8, z: -3.2, y: 3.0, post: true },    // the start shelf, by the crew's crates
  { id: 'G2', room: 'c3gallery', x: 7.6, z: 2.6, y: 3.0, post: true },      // the far shelf, north of the stones' landing
  { id: 'G3', room: 'c3gallery', x: 10.4, z: -8.6, y: 3.0, post: true },    // the far shelf, beside the old arch (both)
];
// each hall's doors: the one he came in by, the one on; its flag; its bracket that sees both
export const HALLS = {
  c3deep: { in: 'c3-shaft', on: 'c3-gallery', flag: 'dx_relay_deep', right: 'D2', ok: 'rl_bal_deep', block: 'rl_block_deep', red: { on: 'rl_red_on_deep', in: 'rl_red_in_deep' } },
  c3gallery: { in: 'c3-deep', on: 'c3-sendell', flag: 'dx_relay_gal', right: 'G3', ok: 'rl_bal_gal', block: 'rl_block_gal', red: { on: 'rl_red_on_gal', in: 'rl_red_in_gal' } },
};
const HEAD = 0.26;   // the relay's lamps over its bracket's plate
const GREEN = '#3cff6a', RED = '#ff3a26';
const list = (s) => (typeof s === 'string' && s ? s.split(',').filter((id) => BRACKETS.some((b) => b.id === id)) : []);
const roomOf = (id) => BRACKETS.find((b) => b.id === id)?.room;

export class RelayThread {
  constructor(ch) { this.ch0 = ch; this.game = ch.game; this.story = ch.story; this.said = {}; this.built = {}; this.marks = {}; }
  // (the chapter that is on: The Shell's or The Core's instance of chapter3.js; each keeps its own nudges and coil)
  get ch() { const c = this.story.cur; return c && typeof c.plates === 'function' ? c : this.ch0; }
  get f() { return this.game.flags; }
  key() { return this.story.cur?.key; }
  room() { return this.game.room?.id; }
  R(id) { return this.game.rooms?.[id]; }
  // the thread is on in the shell (a new chapter turns it on; a save from before turns it on with its halls past counted)
  on() { return this.key() === 'shell' && !!this.f.dx_relay_v; }
  at() { return list(this.f.dx_relay_at); }
  hand() { return Math.max(0, 2 - this.at().length); }
  fixed(room) { const H = HALLS[room]; return !!H && !!this.f[H.flag]; }
  // a hall still to do: in it, the thread on, not fixed
  open(room = this.room()) { return this.on() && !!HALLS[room] && !this.fixed(room); }

  // ---------------------------------------------------------------- state
  begin() { const f = this.f; f.dx_relay_v = 1; f.dx_relay_told = true; delete f.dx_relay_at; delete f.dx_relay_deep; delete f.dx_relay_gal; }
  hookLines() { return [['balradio', 'rl_bal_hook'], ['hero', 'rl_tw_hook']]; }
  applyFlags() {
    const f = this.f, k = this.key();
    if (k !== 'shell' && k !== 'core' && k !== 'home') return;
    // a save from before the relays: on, the halls behind him counted as set (the relay on the bracket that sees both)
    if (!f.dx_relay_v) {
      f.dx_relay_v = 1;
      const pastDeep = k !== 'shell' || !!(f.c3_gallerySeen || f.c3_pillar0 || f.c3_pillar1 || f.c3_pillar2 || f.c3_sendell || f.c3_done);
      const pastGal = k !== 'shell' || !!(f.c3_sendell || f.c3_done);
      const at = new Set(this.at());
      if (pastDeep) { f.dx_relay_deep ||= 'past'; at.add('D2'); }
      if (pastGal) { f.dx_relay_gal ||= 'past'; at.add('G3'); }
      if (at.size) f.dx_relay_at = [...at].join(','); else delete f.dx_relay_at;
      if (pastDeep && pastGal) f.dx_relay_told = true;   // (nothing left to set: no hook)
    }
    // (a hall that counts as set always has its relay on the bracket that sees both: a save edited by hand)
    for (const [room, H] of Object.entries(HALLS)) if (f[H.flag] && !this.at().some((id) => roomOf(id) === room)) f.dx_relay_at = [...this.at(), H.right].join(',');
    while (this.at().length > 2) f.dx_relay_at = this.at().slice(0, 2).join(',');
  }

  // ---------------------------------------------------------------- the props (once per room, built into its group)
  ensure(roomId) {
    const R = this.R(roomId);
    if (!R?.group || this.built[roomId]) return;
    this.built[roomId] = true;
    for (const b of BRACKETS.filter((q) => q.room === roomId)) this.marks[b.id] = this.buildBracket(R, b);
  }
  buildBracket(R, b) {
    const g = this.game, gp = R.group.position, grp = new THREE.Group();
    const iron = MAT.iron(), hz = MAT.hazard(), brass = MAT.brass();
    grp.position.set(b.x, b.y, b.z); R.group.add(grp);
    let top;
    if (b.post) {
      // a survey post: a weighted foot, an iron pole, a hazard-striped plate with a brass clamp on top
      top = 1.36;
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; grp.add(o); return o; };
      add(cyl(0.2, 0.24, 0.1, 10), iron, 0, 0.05, 0);
      add(cyl(0.045, 0.045, top - 0.06, 8), iron, 0, top / 2, 0);
      add(rbox(0.34, 0.05, 0.26, 0.015), hz, 0, top - 0.02, 0);
      for (const s of [-1, 1]) add(rbox(0.05, 0.07, 0.2, 0.01), brass, s * 0.13, top + 0.04, 0);
      const c = g.physics.add({ type: 'cyl', x: gp.x + b.x, z: gp.z + b.z, r: 0.16, top: b.y + top, noStand: true, seeThrough: true });
      R.colliders?.push?.(c);
    } else {
      // an arm off the catwalk's post, over the catwalk at chest height: a plate and a brass clamp
      top = 1.2;
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; grp.add(o); return o; };
      add(rbox(0.08, 0.08, 0.42, 0.015), iron, 0, top - 0.06, 0.2);
      add(rbox(0.06, 0.24, 0.06, 0.01), iron, 0, top - 0.2, 0.38);
      add(rbox(0.34, 0.05, 0.26, 0.015), hz, 0, top - 0.02, 0);
      for (const s of [-1, 1]) add(rbox(0.05, 0.07, 0.2, 0.01), brass, s * 0.13, top + 0.04, 0);
    }
    // the relay on it (hidden while the bracket is empty): a brass box, a whip aerial, a lamp on the side of each door
    const relay = new THREE.Group(); relay.position.y = top + 0.02; relay.scale.setScalar(1.35); grp.add(relay); relay.visible = false;
    const body = new THREE.Mesh(rbox(0.24, 0.16, 0.16, 0.03), brass); body.position.y = 0.08; body.castShadow = true; relay.add(body);
    const face = new THREE.Mesh(rbox(0.18, 0.1, 0.01, 0.005), MAT.flat('#1e2226', 0.5)); face.position.set(0, 0.09, 0.081); relay.add(face);
    const mast = new THREE.Mesh(cyl(0.008, 0.008, 0.42, 5), iron); mast.position.set(0.08, 0.37, -0.04); relay.add(mast);
    const tip = new THREE.Mesh(sphere(0.022, 8, 6), MAT.flat('#e8402a', 0.4)); tip.position.set(0.08, 0.59, -0.04); relay.add(tip);
    const lamps = ['in', 'on'].map((side) => {
      const m = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 2.4, roughness: 0.35 });
      m.userData.noShadow = true;
      const s = new THREE.Mesh(sphere(0.045, 10, 8), m); relay.add(s);
      const glow = glowSprite(RED, 0.5, 0.9); relay.add(glow);
      return { side, m, s, glow };
    });
    // where each lamp sits: on the relay's rim, toward its door (set once the doors are known)
    const H = HALLS[b.room], world = (to) => { const e = R.exits.find((x) => x.to === to); return e ? { x: e.x - gp.x, z: e.z - gp.z } : null; };
    for (const L of lamps) {
      const d = world(H[L.side]); const a = d ? Math.atan2(d.x - b.x, d.z - b.z) : (L.side === 'in' ? -1 : 1);
      L.s.position.set(Math.sin(a) * 0.15, HEAD - 0.08, Math.cos(a) * 0.15); L.glow.position.copy(L.s.position);
    }
    return { b, grp, relay, lamps, top, x: gp.x + b.x, z: gp.z + b.z, y: b.y, hx: gp.x + b.x, hy: b.y + top + HEAD * 1.35, hz: gp.z + b.z };
  }
  // what a relay on bracket b sees: each door, by the physics' line of sight from its head to the doorway's middle
  sees(b) {
    const R = this.R(b.room), P = this.game.physics, H = HALLS[b.room], m = this.marks[b.id];
    if (!R || !m) return { in: false, on: false };
    const floor = R.deckY ?? 0;
    const one = (to) => { const e = R.exits.find((x) => x.to === to); return !!e && P.lineOfSight(m.hx, m.hy, m.hz, e.x, floor + 1.4, e.z); };
    return { in: one(H.in), on: one(H.on) };
  }
  show(id) {
    const m = this.marks[id]; if (!m) return;
    const on = this.at().includes(id);
    m.relay.visible = on;
    if (!on) return;
    const s = this.sees(m.b);
    for (const L of m.lamps) { const c = s[L.side] ? GREEN : RED; L.m.color.set(c); L.m.emissive.set(c); L.glow.material.color.set(c); }
    return s;
  }
  applyRooms() {
    for (const room of Object.keys(HALLS)) { this.ensure(room); for (const b of BRACKETS.filter((q) => q.room === room)) this.show(b.id); }
  }
  // the relay in this hall that sees both doors, if any
  goodHere(room) { return this.at().map((id) => this.marks[id]).find((m) => m && m.b.room === room && (() => { const s = this.sees(m.b); return s.in && s.on; })()) || null; }

  // ---------------------------------------------------------------- talk
  sendellLines() { return this.f.dx_relay_gal === true ? [['balradio', 'rl_bal_sendell']] : []; }
  sub() { const r = this.room(); return this.open(r) ? this.ch.sub(!!this.goodHere(r), 'rl_sub') : ''; }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, h = g.hero, r = this.room();
    if (!this.open(r) || h.actT > 0) return;
    this.ensure(r);
    const at = this.at();
    for (const b of BRACKETS.filter((q) => q.room === r)) {
      const m = this.marks[b.id]; if (!m || Math.abs(h.pos.y - b.y) > 1.0) continue;
      const here = at.includes(b.id);
      if (here) consider(dist(m.x, m.z), 1.3, { kind: 'rl_take', b, x: m.x, z: m.z, label: 'p_take' });
      else if (this.hand() > 0) consider(dist(m.x, m.z), 1.3, { kind: 'rl_set', b, x: m.x, z: m.z, label: 'p_relay' });
    }
  }
  interact(it) {
    const g = this.game, h = g.hero;
    if (it.kind === 'rl_set') { h.act('use', 0.7, () => this.set(it.b), 0.4); return true; }
    if (it.kind === 'rl_take') { h.act('use', 0.6, () => this.take(it.b), 0.3); return true; }
    return false;
  }
  set(b) {
    const g = this.game, f = this.f, H = HALLS[b.room];
    if (this.at().includes(b.id) || this.hand() <= 0) return;
    f.dx_relay_at = [...this.at(), b.id].join(',');
    const s = this.show(b.id) || { in: false, on: false };
    g.audio.play('chest', this.marks[b.id]);
    g.hud.toast('rl_toast_hand', { n: this.hand() });
    if (s.in && s.on) {
      g.audio.play('radio');
      if (!this.said['ok' + b.room]) { this.said['ok' + b.room] = true; this.ch.chain([['balradio', H.ok]], () => { g.updateObjective(); g.save(false); }); return; }
      g.updateObjective(); g.save(false); return;
    }
    g.audio.play('deny', this.marks[b.id]);
    const key = !s.in && !s.on ? 'rl_red_both' : !s.on ? H.red.on : H.red.in;
    if (!this.said[key]) { this.said[key] = true; this.ch.chain([['hero', key]], () => { g.updateObjective(); g.save(false); }); return; }
    g.hud.toast('rl_toast_red'); g.updateObjective(); g.save(false);
  }
  take(b) {
    const g = this.game, f = this.f;
    if (!this.at().includes(b.id)) return;
    const rest = this.at().filter((id) => id !== b.id);
    if (rest.length) f.dx_relay_at = rest.join(','); else delete f.dx_relay_at;
    this.show(b.id);
    g.audio.play('select');
    g.hud.toast('rl_toast_hand', { n: this.hand() });
    g.updateObjective(); g.save(false);
  }
  // the hall's far door (chapter3.js canExit): refused until a relay there sees both doors; through it, the hall is set
  // and any spare relay in it comes along
  canExit(room, to) {
    const H = HALLS[room?.id];
    if (!H || to !== H.on || !this.open(room.id)) return true;
    const g = this.game, f = this.f, good = this.goodHere(room.id);
    if (!good) {
      if (g.state === 'play') { if (!this.said['block' + room.id]) { this.said['block' + room.id] = true; this.ch.chain([['hero', H.block]]); } else g.hud.toast('rl_toast_block'); }
      return false;
    }
    f[H.flag] = true;
    const spare = this.at().filter((id) => id !== good.b.id && this.marks[id]?.b.room === room.id);
    if (spare.length) { f.dx_relay_at = this.at().filter((id) => !spare.includes(id)).join(','); for (const id of spare) this.show(id); g.hud.toast('rl_toast_spare'); }
    return true;
  }

  // ---------------------------------------------------------------- what moves
  update(dt) {
    const g = this.game, f = this.f, r = this.room();
    if (HALLS[r] && !this.built[r]) { this.ensure(r); for (const b of BRACKETS.filter((q) => q.room === r)) this.show(b.id); }
    if (!this.on()) return;
    // a save from before, loaded in the shell with a hall still to set: Baldino says it once play is under way
    if (!f.dx_relay_told && g.state === 'play' && !g.trans && ['c3shaft', 'c3deep', 'c3gallery'].includes(r) && !this.story._sh?.busy) {
      f.dx_relay_told = true; this.ch.chain([['balradio', 'rl_bal_hook']], () => g.updateObjective());
    }
    // a red lamp left in a hall that is still open, for a while: a nudge (HINTS-LESS)
    const red = this.open(r) && !this.goodHere(r) && this.at().some((id) => this.marks[id]?.b.room === r);
    this.ch.nudge(dt, 'rl_red', red, 45, 'rl_nudge');
  }
}

// ================================================================ H-2: the feeds
// one box per pylon, by the station that feeds it: where it stands (polar round the deck's middle, in the core's frame:
// the angle as underground.js polar(), sin/cos; metres) and who speaks
export const FEEDS = [
  { i: 0, st: 'light', flag: 'dx_feed_light', who: 'zoeradio', ask: 'fd_zoe_ask', obj: 'fd_obj_light', nudge: 'fd_nudge_light', sign: 'LIGHTHOUSE', ang: 5.93, r: 7.3 },
  { i: 1, st: 'mains', flag: 'dx_feed_mains', who: 'miraradio', ask: 'fd_mira_ask', obj: 'fd_obj_mains', nudge: 'fd_nudge_mains', sign: 'MAINS', ang: 4.72, r: 6.9 },
  { i: 2, st: 'mills', flag: 'dx_feed_mills', who: 'okuradio', ask: 'fd_oku_ask', obj: 'fd_obj_mills', nudge: 'fd_nudge_mills', sign: 'MILLS', ang: 3.64, r: 7.2 },
];
export const CODE = [2, 0, 1];                 // star, sun, wave (the dials: 0 sun · 1 wave · 2 star), as the lighthouse's
export const NEEDLE = { start: 0.08, step: 0.13, lo: 0.5, hi: 0.7, settle: 1.2 };   // the MAINS gauge: two marks, a notch a turn
export const FLY = { w: 1.2, brake: 0.3, win: 1.2, slip: 1.4 };   // (24.11: widened to the card's "no tight timing": ~2 s in each 5.2 s turn, was 0.9 s in 3.9)                       // the MILLS flywheel: rad/s, s, ± rad, s
const DIAL_X = [-0.36, 0, 0.36];
const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const signTex = (word) => canvasTex(256, 64, (x, W, H) => {
  x.fillStyle = '#26302e'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#e8b830'; x.lineWidth = 4; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#efe2bf'; x.font = "bold 34px 'Arial Narrow', Arial"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, W / 2, H / 2 + 2);
});
// the MAINS gauge face: a scale from -120° to +120°, two brass marks round the band, red past the second
const gaugeTex = () => canvasTex(128, 128, (x) => {
  x.fillStyle = '#f2ead2'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  const A = (v) => -Math.PI / 2 + (-120 + v * 240) * Math.PI / 180;
  x.lineWidth = 10; x.strokeStyle = '#c8452f'; x.beginPath(); x.arc(64, 64, 48, A(NEEDLE.hi), A(1)); x.stroke();
  x.strokeStyle = '#2a2018'; for (let i = 0; i <= 12; i++) { const a = A(i / 12); x.lineWidth = i % 3 ? 1.5 : 3; x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  x.strokeStyle = '#b8862a'; x.lineWidth = 7; for (const v of [NEEDLE.lo, NEEDLE.hi]) { const a = A(v); x.beginPath(); x.moveTo(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30); x.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); x.stroke(); }
});
const gaugeAngle = (v) => -(-120 + Math.max(0, Math.min(1.05, v)) * 240) * Math.PI / 180;

export class FeedThread {
  constructor(ch) { this.ch0 = ch; this.game = ch.game; this.story = ch.story; this.said = {}; this.boxes = null; this.box = {}; }
  get ch() { const c = this.story.cur; return c && typeof c.plates === 'function' ? c : this.ch0; }
  get f() { return this.game.flags; }
  get C() { return this.game.rooms?.c3core; }
  // (the boxes' rules, for the tests' player: what Zoé, Mira and Oku say)
  get rules() { return { CODE, NEEDLE, FLY }; }
  core() { return this.story.cur?.key === 'core'; }
  pending() { const p = this.f.c3_prime; return Number.isInteger(p) && p >= 0 && p < 3 ? p : null; }
  // the fight's first phase is on and a pylon is open, its box waiting
  live() { const f = this.f; return this.core() && !!f.c3_fight && !f.c3_overload && !f.c3_turned && this.pending() != null; }

  // ---------------------------------------------------------------- state
  applyFlags() {
    const f = this.f;
    // a pylon already turned counts its feed done (a save from before, or a pylon turned through the story's own call)
    for (const F of FEEDS) if (f['c3_pylon' + F.i] && !f[F.flag]) f[F.flag] = 'past';
    const p = this.pending();
    if (f.c3_prime != null && (p == null || f['c3_pylon' + p] || f.c3_overload || f.c3_turned || f.c3_done)) delete f.c3_prime;
    this.reset();
  }
  reset(i = null) {
    for (const F of FEEDS) if (i == null || F.i === i) this.box[F.i] = { dials: [0, 1, 2], p: NEEDLE.start, shown: NEEDLE.start, lastTurn: -1e9, ang: 0, w: FLY.w, brakeT: -1, slipT: 0, busy: false };
  }

  // ---------------------------------------------------------------- the boxes (built once into the core's group)
  ensure() {
    const C = this.C;
    if (!C?.group || this.boxes) return;
    if (!this.box[0]) this.reset();
    const gp = C.group.position, y0 = (C.floorY ?? 0);
    this.boxes = FEEDS.map((F) => {
      const lx = Math.sin(F.ang) * F.r, lz = Math.cos(F.ang) * F.r;
      // facing its pylon's plate (the player comes to it from there)
      const pl = this.ch.plates().find((q) => q.i === F.i), face = pl ? Math.atan2(pl.x - gp.x - lx, pl.z - gp.z - lz) : Math.atan2(-lx, -lz);
      const grp = new THREE.Group(); grp.position.set(lx, y0, lz); grp.rotation.y = face; C.group.add(grp);
      const k = new Kit(grp), teal = MAT.paint('#3f8a86', 0.45), iron = MAT.iron(), brass = MAT.brass();
      const w = F.st === 'light' ? 1.15 : 0.95;
      k.add(rbox(w + 0.06, 0.14, 0.48, 0.02), iron, 0, 0.07, 0);
      k.add(rbox(w, 1.1, 0.42, 0.03), teal, 0, 0.69, 0);
      k.add(rbox(w + 0.04, 0.05, 0.46, 0.015), brass, 0, 1.265, 0);
      for (const s of [-1, 1]) k.add(cyl(0.035, 0.035, 0.5, 6), MAT.paint('#2a3436', 0.5), s * (w / 2 - 0.12), -0.1, -0.12);   // (its feed cables into the deck)
      k.add(plane(0.84, 0.21), MAT.map(signTex(F.sign), 0.6), 0, 1.43, 0.02, 0, { rx: -0.25 });
      k.add(rbox(0.9, 0.25, 0.04, 0.01), brass, 0, 1.43, -0.005, 0, { rx: -0.25 });
      k.add(cyl(0.025, 0.025, 0.2, 6), iron, w / 2 - 0.1, 1.38, -0.1);
      const B = { F, grp, x: gp.x + lx, z: gp.z + lz, y: y0, face };
      // the station lamp on top: dark, amber while its pylon is open, green once fed
      B.lampM = new THREE.MeshStandardMaterial({ color: '#40362a', emissive: '#ffb040', emissiveIntensity: 0, roughness: 0.35 }); B.lampM.userData.noShadow = true;
      const lamp = new THREE.Mesh(sphere(0.07, 10, 8), B.lampM); lamp.position.set(w / 2 - 0.1, 1.52, -0.1); grp.add(lamp);
      B.glow = glowSprite('#ffb040', 0.7, 0); B.glow.position.copy(lamp.position); grp.add(B.glow);
      const fz = 0.215;
      if (F.st === 'light') {
        B.dials = DIAL_X.map((dx, j) => {
          k.add(torus(0.13, 0.018, 5, 22), brass, dx, 0.86, fz);
          k.add(disc(0.12, 24), MAT.map(CANV.tuning(['#3f8a5a', '#d8a13b', '#c8452f'][j]), 0.5), dx, 0.86, fz + 0.006);
          const piv = new THREE.Group(); piv.position.set(dx, 0.86, fz + 0.012); grp.add(piv);
          const bar = new THREE.Mesh(rbox(0.02, 0.11, 0.012, 0.004), MAT.flat('#a8201a', 0.4)); bar.position.y = 0.05; piv.add(bar);
          const hub = new THREE.Mesh(cyl(0.03, 0.03, 0.03, 10), MAT.flat('#1e1e22', 0.5)); hub.rotation.x = Math.PI / 2; piv.add(hub);
          return { piv, dx, target: 0 };
        });
      } else if (F.st === 'mains') {
        k.add(torus(0.17, 0.02, 5, 24), brass, -0.2, 0.88, fz);
        k.add(disc(0.165, 28), MAT.map(gaugeTex(), 0.5), -0.2, 0.88, fz + 0.005);
        B.needle = new THREE.Group(); B.needle.position.set(-0.2, 0.88, fz + 0.012); grp.add(B.needle);
        const nd = new THREE.Mesh(rbox(0.014, 0.14, 0.01, 0.003), MAT.flat('#1e1e22', 0.5)); nd.position.y = 0.06; B.needle.add(nd);
        B.wheel = new THREE.Group(); B.wheel.position.set(0.24, 0.74, fz + 0.06); grp.add(B.wheel);
        const wk = new Kit(B.wheel); valveWheel(wk, { r: 0.15, color: '#c8302a' }); wk.flush();
        k.add(cyl(0.03, 0.03, 0.06, 8), iron, 0.24, 0.74, fz + 0.03, 0, { rx: Math.PI / 2 });
      } else {
        // the coupling's flywheel on the box's face: an iron disc, a white mark to its rim, a brake shoe above
        B.fly = new THREE.Group(); B.fly.position.set(0, 0.74, fz + 0.12); grp.add(B.fly);
        const dm = new THREE.Mesh(cyl(0.34, 0.34, 0.06, 28), MAT.iron()); dm.rotation.x = Math.PI / 2; dm.castShadow = true; B.fly.add(dm);
        const rim = new THREE.Mesh(torus(0.34, 0.025, 5, 28), brass); B.fly.add(rim);
        const mark = new THREE.Mesh(rbox(0.07, 0.3, 0.012, 0.004), MAT.flat('#f2ead2', 0.5)); mark.position.set(0, 0.17, 0.035); B.fly.add(mark);
        const tipm = new THREE.Mesh(rbox(0.09, 0.06, 0.014, 0.004), MAT.flat('#c8302a', 0.45)); tipm.position.set(0, 0.3, 0.037); B.fly.add(tipm);
        k.add(cyl(0.05, 0.05, 0.14, 10), iron, 0, 0.74, fz + 0.05, 0, { rx: Math.PI / 2 });
        k.add(rbox(0.12, 0.04, 0.012, 0.004), MAT.paint('#e8b830', 0.5), 0, 1.215, fz + 0.006);   // (the top mark on the housing: where the wheel's mark must stop)
        B.shoe = new THREE.Mesh(rbox(0.22, 0.05, 0.12, 0.015), MAT.paint('#c8302a', 0.5)); B.shoe.position.set(0, 1.12, fz + 0.12); grp.add(B.shoe);
        const v = new THREE.Vector3(0, 0.74, fz + 0.14); grp.localToWorld(v);
        B.target = { x: v.x, y: v.y, z: v.z, r: 0.5, feedWheel: true };
      }
      k.flush();
      grp.traverse((o) => { if (o.isMesh && !o.material?.userData?.noShadow) o.castShadow = true; });
      // a collider for him (the ball and the guardian's bolts go through: noBall, seeThrough)
      const c = this.game.physics.add({ type: 'box', x: B.x, z: B.z, hw: w / 2 + 0.03, hd: 0.25, rot: face, top: y0 + 1.3, noStand: true, seeThrough: true, noBall: true });
      C.colliders?.push?.(c);
      // where his hands go: the front, 0.6 m out (dials: each in front of its own)
      const front = (dx, out = 0.62) => { const p = new THREE.Vector3(dx, 0, fz + out); grp.localToWorld(p); return { x: p.x, z: p.z }; };
      B.front = front(0); B.dialFront = DIAL_X.map((dx) => front(dx, 0.55)); B.wheelAt = front(0.24, 0.55);
      return B;
    });
  }
  applyRooms() {
    this.ensure(); if (!this.boxes) return;
    const f = this.f, p = this.pending(), C = this.C;
    for (const B of this.boxes) {
      const i = B.F.i, done = !!f[B.F.flag], st = this.box[i];
      if (done) { if (B.dials) st.dials = [...CODE]; if (B.needle) st.p = st.shown = (NEEDLE.lo + NEEDLE.hi) / 2; if (B.fly) { st.ang = 0; st.w = 0; } }
      this.lamp(B, done ? 'done' : p === i ? 'open' : 'idle');
      if (B.dials) B.dials.forEach((d, j) => { d.target = -(st.dials[j] - 1) * (Math.PI / 3); d.piv.rotation.z = d.target; });
      if (B.needle) B.needle.rotation.z = gaugeAngle(st.shown);
      if (B.fly) { B.fly.rotation.z = st.ang; B.shoe.position.y = done ? 1.1 : 1.16; }
    }
    if (p != null) { C?.pylons?.[p]?.setState?.(1); for (const tg of C?.ballTargets || []) if (tg.pylon === p) tg.done = true; }
    this.wheelTarget(p === 2 && !f.dx_feed_mills);
  }
  lamp(B, s) { B.lampM.emissiveIntensity = s === 'idle' ? 0 : 2.6; B.lampM.emissive.set(s === 'done' ? '#40ff70' : '#ffb040'); B.glow.material.color.set(s === 'done' ? '#40ff70' : '#ffb040'); B.glow.material.opacity = s === 'idle' ? 0 : 0.8; B.state = s; }
  // the flywheel is a ball target only while its box is waiting (the aim leaves it alone in the fight)
  wheelTarget(on) {
    const C = this.C, B = this.boxes?.[2]; if (!C || !B?.target) return;
    const i = C.ballTargets.indexOf(B.target);
    if (on && i < 0) C.ballTargets.push(B.target);
    if (!on && i >= 0) C.ballTargets.splice(i, 1);
  }
  sub() { return ''; }
  objective() { const p = this.pending(); return this.core() && this.f.c3_fight && p != null ? this.ch.goal(FEEDS[p].obj) : null; }

  // ---------------------------------------------------------------- the bank shot opens a pylon (chapter3.js ballHit)
  prime(i) {
    const g = this.game, f = this.f, C = this.C;
    this.ensure();
    f.c3_prime = i; this.reset(i);
    C.pylons?.[i]?.setState?.(1);
    g.audio.play('shard'); g.camRig.shake(0.25);
    const P = C.pylons?.[i]; if (P) g.particles.burst(P.x, P.y ?? 2.5, P.z, '#ffd27a', 26, 4);
    g.bolts?.clear?.();
    this.hold();
    const B = this.boxes?.[i]; if (B) this.lamp(B, 'open');
    this.wheelTarget(i === 2);
    const F = FEEDS[i], lines = [];
    if (!f.dx_feed_told) lines.push(['hero', 'fd_tw_prime']);
    if (!f.dx_feed_told && f.dx_relay_gal === true) lines.push(['balradio', 'fd_bal_through']);
    f.dx_feed_told = true;
    g.audio.play('radio');
    lines.push([F.who, F.ask]);
    this.ch.chain(lines, () => { g.updateObjective(); g.save(false); });
  }
  // the guardian sags and stays down while a pylon is open (no pressure during a box)
  hold() {
    const gd = this.ch.guardian; if (!gd?.alive) return;
    if (gd.state !== 'stunned') { gd.state = 'stunned'; gd.stateT = 0; }
    gd.stunT = 1e9; gd.fan?.hide?.(); gd.marks?.hide?.();
  }
  release() { const gd = this.ch.guardian; if (gd?.alive && gd.state === 'stunned') { gd.stateT = 0; gd.stunT = 1.6; } }
  // the box done: the pylon holds (chapter3.js convertPylon: the ally's line, the guardian a level up, the save)
  fed(i) {
    const g = this.game, f = this.f, B = this.boxes?.[i];
    f[FEEDS[i].flag] = true; delete f.c3_prime;
    if (B) this.lamp(B, 'done');
    this.wheelTarget(false);
    g.audio.play('chest');
    this.release();
    this.ch.convertPylon(i);
  }

  // ---------------------------------------------------------------- at the boxes
  interactables(consider, dist) {
    const g = this.game, h = g.hero, p = this.pending();
    if (!this.live() || h.actT > 0 || g.room?.id !== 'c3core') return;
    this.ensure();
    const B = this.boxes?.[p], st = this.box[p]; if (!B || st.busy) return;
    if (B.dials) B.dials.forEach((d, j) => { const q = B.dialFront[j], c = this.dialAt(B, j); consider(dist(c.x, c.z) + Math.hypot(h.pos.x - q.x, h.pos.z - q.z) * 0.25, 1.15, { kind: 'fd_dial', j, x: c.x, z: c.z, label: 'p_dial' }); });
    if (B.wheel) { const c = this.wheelAt(B); consider(dist(c.x, c.z), 1.2, { kind: 'fd_wheel', x: c.x, z: c.z, label: 'p_valve' }); }
  }
  dialAt(B, j) { const v = new THREE.Vector3(B.dials[j].dx, 0, 0.22); B.grp.localToWorld(v); return { x: v.x, z: v.z }; }
  wheelAt(B) { const v = new THREE.Vector3(0.24, 0, 0.3); B.grp.localToWorld(v); return { x: v.x, z: v.z }; }
  interact(it) {
    const g = this.game, h = g.hero, p = this.pending();
    if (it.kind === 'fd_dial') { h.act('use', 0.45, () => this.turnDial(p, it.j), 0.2); return true; }
    if (it.kind === 'fd_wheel') { h.act('use', 0.6, () => this.turnWheel(p), 0.3); return true; }
    return false;
  }
  turnDial(p, j) {
    const g = this.game, st = this.box[p], B = this.boxes?.[p];
    if (!this.live() || p !== 0 || !B) return;
    st.dials[j] = (st.dials[j] + 1) % 3; B.dials[j].target = -(st.dials[j] - 1) * (Math.PI / 3);
    g.audio.play('select', B);
    if (st.dials.every((v, k) => v === CODE[k])) { st.busy = true; g.audio.play('radio'); this.later(0.5, () => { st.busy = false; this.fed(0); }); return; }
    if (new Set(st.dials).size === 3) {   // (all three different, not her order: the box buzzes)
      g.audio.play('deny', B);
      if (!this.said.wrong) { this.said.wrong = true; this.ch.chain([['zoeradio', 'fd_zoe_wrong']]); } else g.hud.toast('fd_toast_wrong');
    }
  }
  turnWheel(p) {
    const g = this.game, st = this.box[p], B = this.boxes?.[p];
    if (!this.live() || p !== 1 || !B) return;
    st.p += NEEDLE.step; st.lastTurn = this.t; st.spin = (st.spin || 0) + 1;
    g.audio.play('valve', B);
    if (st.p > NEEDLE.hi + 1e-6) {   // past the second mark: the needle swings into the red and the box trips back to nothing
      st.busy = true;
      this.later(0.7, () => {
        st.p = NEEDLE.start; g.audio.play('clunk', B); g.audio.play('deny', B); g.camRig.shake(0.05);
        if (!this.said.trip) { this.said.trip = true; this.ch.chain([['miraradio', 'fd_mira_trip']], () => { st.busy = false; }); } else { g.hud.toast('fd_toast_trip'); st.busy = false; }
      });
    }
  }
  // the flywheel struck (chapter3.js ballHit): it brakes; with the mark near the top it holds
  wheelHit(tg) {
    const p = this.pending(), st = this.box[2], B = this.boxes?.[2];
    if (!this.live() || p !== 2 || !B || tg !== B.target) return false;
    if (st.brakeT >= 0 || st.slipT > 0) return true;
    st.brakeT = 0; st.w0 = st.w;
    this.game.audio.play('clang', B); this.game.particles.burst(tg.x, tg.y, tg.z, '#ffd27a', 14, 3);
    return true;
  }
  later(t, fn) { (this.timers ||= []).push({ t, fn }); }

  // ---------------------------------------------------------------- what moves
  update(dt) {
    const g = this.game, f = this.f;
    this.t = (this.t || 0) + dt;
    if (this.timers?.length) { for (const l of this.timers) l.t -= dt; const due = this.timers.filter((l) => l.t <= 0); this.timers = this.timers.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    if (g.room?.id !== 'c3core') return;
    this.ensure(); if (!this.boxes) return;
    const p = this.pending(), live = this.live();
    if (live) this.hold();
    // the boxes' moving parts
    for (const B of this.boxes) {
      const st = this.box[B.F.i], done = !!f[B.F.flag];
      if (B.dials) for (const d of B.dials) { const e = d.target - d.piv.rotation.z; d.piv.rotation.z += Math.abs(e) < 0.002 ? e : e * Math.min(1, dt * 12); }
      if (B.wheel) B.wheel.rotation.z += ((st.spin || 0) * -Math.PI / 2 - B.wheel.rotation.z) * Math.min(1, dt * 8);
      if (B.needle) {
        // the needle swings after the pressure with a little overshoot, and settles
        st.v = (st.v || 0) + ((st.p - st.shown) * 40 - (st.v || 0) * 7) * dt; st.shown += st.v * dt;
        B.needle.rotation.z = gaugeAngle(st.shown);
        if (live && p === 1 && !done && !st.busy && st.p >= NEEDLE.lo && st.p <= NEEDLE.hi && this.t - st.lastTurn > NEEDLE.settle && Math.abs(st.v) < 0.05) { st.busy = true; g.audio.play('radio'); this.later(0.3, () => { st.busy = false; this.fed(1); }); }
      }
      if (B.fly) {
        if (done) { B.fly.rotation.z += norm(0 - B.fly.rotation.z) * Math.min(1, dt * 6); continue; }
        if (st.brakeT >= 0) {
          // braking: the shoe drops, the wheel stops within FLY.brake s
          st.brakeT += dt; const u = Math.min(1, st.brakeT / FLY.brake);
          st.w = st.w0 * (1 - u); B.shoe.position.y = 1.16 - 0.06 * u;
          if (u >= 1) {
            st.brakeT = -1; st.w = 0;
            if (live && p === 2 && Math.abs(norm(st.ang)) <= FLY.win) { st.busy = true; g.audio.play('lever', B); this.later(0.5, () => { st.busy = false; this.fed(2); }); }
            else {
              st.slipT = FLY.slip; g.audio.play('deny', B);
              if (live && p === 2) { if (!this.said.slip) { this.said.slip = true; this.ch.chain([['okuradio', 'fd_oku_wrong']]); } else g.hud.toast('fd_toast_slip'); }
            }
          }
        } else if (st.slipT > 0) { st.slipT -= dt; B.shoe.position.y = 1.1 + 0.06 * (1 - st.slipT / FLY.slip); if (st.slipT <= 0) st.w = FLY.w; }
        else { st.w += (FLY.w - st.w) * Math.min(1, dt * 2); B.shoe.position.y = 1.16; }
        // (the mark turns clockwise as seen from the front: rotation.z falls)
        st.ang = norm(st.ang - st.w * dt); B.fly.rotation.z = st.ang;
      }
    }
    for (const B of this.boxes) if (B.state === 'open') B.lampM.emissiveIntensity = 1.6 + Math.sin(this.t * 6) * 1.0;
    if (live) this.ch.nudge(dt, 'fd' + p, live && !this.box[p].busy, 45, FEEDS[p].nudge);
  }
}
