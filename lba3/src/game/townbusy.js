// TOWN-LIFE-2 (Citadel town life, chapters 1–2): the small things that make the town feel lived in, laid over the residents
// (walkers.js, walkrounds.js) and the story's people without changing what either does:
//   - heads turn: a resident Twinsen passes close to follows him with its head (rig.lookAt); not in Discreet mode;
//   - a word when bumped: a resident he walks into (it steps aside: walkers.js giveWay) says a short line over its head;
//   - overheard: what Maro and Tilde say between the plaza's benches, a line for each turn they take, when he comes close;
//     by the town's state (the well dry; the water back, hot; after Vesk's departure; TOWN-LIFE-3: and every later chapter
//     Citadel is seen in: townState below);
//   - Officer Odile works her counter while nobody is at the window (the rule walkers.js keeps for Pippa's stall: only
//     her pose and the way she faces, only at her own place, and she is the story's again as soon as Twinsen comes near):
//     she stamps forms and rings the counter's bell now and then;
//   - Tobb's crates: the one he carries comes off a pile on the quay and stays on a pile at the end of Pippa's stall. The
//     quay's pile is made up again, and the stall's taken in, while nobody sees them;
//   - gulls on the harbour and a pair by the stall (gulls.js);
//   - sound: water lapping round the quay and the pier, the gulls' cries, the customs stamp and bell (the game's own
//     audio graph: its context, buses and noise; no sound files).
// TOWN-LIFE-3 adds the children's games and Maro's broom (townplay.js), Doran's rod and Xil's ledger (harbourlife.js), the
// washing and the cat (townbits.js), and the evacuation's pace; Odile's counter rests in the evacuation.
// No flag is added and nothing is saved: everything is read from the story's own flags, and after a load it starts over.
// Cost: outdoors on Citadel only; residents are looked at only within a few metres of Twinsen, in the full tier; the gulls
// and the piles are a draw each per group, culled as one; the bubble is one DOM element.
import * as THREE from 'three';
import { t } from './i18n.js';
import { dampAngle, clamp } from '../engine/math.js';
import { Gulls, part, merge, M4, MATL } from './gulls.js';
import { QUAY_PILE, stallDrop, PLAY } from './walkrounds.js';
import { TownPlay } from './townplay.js';
import { HarbourLife } from './harbourlife.js';
import { TownBits } from './townbits.js';

// TOWN-LIFE-3: the town's state, for every chapter Citadel is seen in (docs/lba3-production/STORY_MAP.md): what its people
// talk about and what they do. dry: the well dry (chapter 1, and 2 until the valves) · hot: the water back, hot · gone: after
// Vesk's departure · away: chapters 3-7, Twinsen off the island · evac: chapter 8, the evacuation · council: chapter 9 ·
// network: chapter 10 · deep: chapters 11-12 · home: the epilogue and Keep Exploring. Read from the story's own flags.
export function townState(game) {
  const st = game.story, f = game.flags, key = st?.cur?.key;
  switch (key) {
    case 'well': return 'dry';
    case 'project': return !f.c1_water ? 'dry' : f.c1_veskGone ? 'gone' : 'hot';
    case 'evacuation': return 'evac';
    case 'council': return 'council';
    case 'network': return 'network';
    case 'shell': case 'core': return 'deep';
    case 'home': return 'home';
  }
  return 'away';
}

const KIDS = new Set(['pico', 'dot', 'tamu']), OLD = new Set(['brix', 'ume', 'bashir']);
const LOOK_R = 3.6;                  // m: a resident's head follows Twinsen within this
const BARK_EACH = 9, BARK_ANY = 2.5; // s: one resident's bark again / anyone's
const HEAR_R = 7.5;                  // m from the chatting pair: their words are heard
const COUNTER_R = 5.0;               // m: Odile leaves her forms when Twinsen comes this close
const QUAY_FULL = 6, QUAY_MIN = 2, STALL_MAX = 3;

// ------------------------------------------------------------------ a pile of crates (one instanced draw)
// (Tobb's crate as he carries it, walkers.js CARRY.crate, a fifth larger on the piles: a pile of the hand size read as
//  shoe boxes beside the quay's cargo. The colours are darker than the carried one's: the LBA ramp lifts vertex colours)
let CRATE = null;
const CS = 1.2, CH = 0.26 * CS;
const crateGeo = () => CRATE ||= merge([
  part(new THREE.BoxGeometry(0.36 * CS, CH, 0.3 * CS), '#7e5530', M4(0, CH / 2, 0)),
  part(new THREE.BoxGeometry(0.375 * CS, 0.05 * CS, 0.315 * CS), '#4a3018', M4(0, CH / 2, 0)),
  part(new THREE.BoxGeometry(0.05 * CS, CH + 0.002, 0.3 * CS + 0.004), '#5e3e20', M4(0, CH / 2, 0)),
]);
class Pile {
  constructor(parent, physics, { x, z, ry, slots, n, name, hw, hd }) {
    this.x = x; this.z = z; this.slots = slots; this.n = n;
    this.y0 = physics.groundAt(x, z);
    const m = this.mesh = new THREE.InstancedMesh(crateGeo(), MATL, slots.length);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    const c = Math.cos(ry), s = Math.sin(ry);
    slots.forEach(([lx, ly, lz, yaw], i) => m.setMatrixAt(i, M4(x + lx * c + lz * s, this.y0 + ly, z - lx * s + lz * c, 0, ry + yaw, 0)));
    m.count = n;
    m.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, this.y0 + 0.4, z), 1.2);
    parent.add(m);
    this.top = (k) => Math.max(...slots.slice(0, Math.max(1, k)).map((q) => q[1])) + CH;
    this.col = physics.add({ type: 'box', x, z, hw, hd, rot: ry, top: this.y0 + this.top(n), block: true });   // (a low solid: never a step)
  }
  set(n) {
    n = clamp(n, 1, this.slots.length);
    if (n === this.n) return;
    this.n = n; this.mesh.count = n; this.col.top = this.y0 + this.top(n);
  }
}

// ------------------------------------------------------------------ the layer
export class TownBusy {
  constructor(game) {
    this.game = game;
    const W = (this.W = game.world), P = game.physics;
    this.looks = new Set(); this.yieldPrev = new Map(); this.barkAt = new Map(); this.barkAny = 0; this.barkN = 0;
    this.bub = null; this.el = null;
    this.chat = { k: 0, speaker: null };
    this.odile = { on: false, stampT: 1.5, n: 0 };
    this.tobb = { carry: undefined, lastDrop: -99 };
    this.unseenT = 0;
    this.log = []; this.count = { took: 0, put: 0 };   // (tests: what happened)
    const g = new THREE.Group(); g.name = 'townbusy'; W.root.add(g); this.group = g;
    // Tobb's piles
    this.quay = new Pile(g, P, { ...QUAY_PILE, name: 'quayPile', n: QUAY_FULL, hw: 0.5, hd: 0.43,
      slots: [[-0.235, 0, -0.2, 0.05], [0.235, 0, -0.19, -0.08], [-0.225, 0, 0.2, 0.1], [0.235, 0, 0.21, -0.03], [-0.1, CH, -0.02, 0.25], [0.15, CH, 0.04, -0.12]] });
    const D = stallDrop(W);
    this.stall = D ? new Pile(g, P, { ...D.pile, name: 'stallPile', n: 1, hw: 0.27, hd: 0.24, slots: [[0, 0, 0, 0.1], [0.02, CH, -0.01, -0.18], [-0.02, 2 * CH, 0.01, 0.22]] }) : null;
    // the gulls: the harbour (rail posts on the quay's west edge, the cargo stacks' tops, the customs roof, the open quay)
    // and the square (two on the ground before the stall, the stall's back posts)
    this.flocks = [
      new Gulls({ parent: g, physics: P, name: 'gullsHarbour', n: 6, seed: 11, perches: [
        { x: -119.55, z: 36.0 }, { x: -119.55, z: 39.0 }, { x: -119.55, z: 40.9 }, { x: -119.55, z: 48.0 }, { x: -119.55, z: 51.0 },
        { x: -117.1, z: 35.4 }, { x: -116.9, z: 39.4 }, { x: -116.0, z: 35.0 },
        { x: -110.1, z: 35.3, y: 4.39 },
        { x: -113.2, z: 44.6, ground: true }, { x: -111.6, z: 43.3, ground: true }, { x: -114.4, z: 47.3, ground: true },
      ] }),
    ];
    if (W.stall) {
      const a = W.stall.a, cx = W.stall.x - Math.sin(a) * 1.6, cz = W.stall.z - Math.cos(a) * 1.6;
      const post = (lx) => ({ x: cx + lx * Math.cos(a) - 0.5 * Math.sin(a), z: cz - lx * Math.sin(a) - 0.5 * Math.cos(a), y: P.terrain.heightAt(cx, cz) + 2.5 });
      const fr = (lx, lz) => ({ x: cx + lx * Math.cos(a) + lz * Math.sin(a), z: cz - lx * Math.sin(a) + lz * Math.cos(a), ground: true });
      this.flocks.push(new Gulls({ parent: g, physics: P, name: 'gullsSquare', n: 2, seed: 5, perches: [fr(-1.2, 2.6), fr(-0.3, 3.1), fr(-2.1, 2.2), post(-1.5), post(1.5)] }));
    }
    this.snd = null;
    // TOWN-LIFE-3: the children's games and a broom (townplay.js, run from walkers.js), Doran's rod and Xil's ledger
    // (harbourlife.js), washing on the lines and the lane's cat (townbits.js)
    this.play = new TownPlay(game, this, g);
    if (game.walkers) game.walkers.play = this.play;
    this.play.chalk(PLAY.hop);
    this.harbour = new HarbourLife(game, this, g);
    this.bits = new TownBits(game, this, g);
    W.updaters.push((dt, time) => this.update(dt, time));
  }
  note(s) { this.log.push(`${this.game.time.toFixed(1)} ${s}`); if (this.log.length > 40) this.log.shift(); }

  // ---------------------------------------------------------------- the frame
  update(dt) {
    const g = this.game, h = g.hero;
    if (!h || g.state === 'title' || g.state === 'loading') return;
    const live = (g.state === 'play' || g.state === 'dialog') && !g.room;
    const res = g.walkers?.res || [];
    if (g.walkers && !g.walkers.play) g.walkers.play = this.play;
    this.state = townState(g);
    this.pace(res);
    this.play.update(dt);
    this.cargo(res, dt);
    this.counter(dt, live && this.state !== 'evac');
    this.harbour.update(dt, live, this.state);
    this.bits.update(dt, live, this.state);
    // the gulls (they keep still out of play; out of reach they are put back on their perches)
    const near = [];
    for (const d of this.W.dogs || []) near.push({ x: d.pos.x, z: d.pos.z, run: (d.speed || 0) > 1.2 });
    for (const r of res) if (r.present && !r.away && !r.inside && r.tier === 0 && ((r.st === 'walk' && r.speed > 1.4) || r._run)) near.push({ x: r.pos.x, z: r.pos.z, run: true });
    if (g.state === 'play' || !live) {
      const ctx = { outdoors: live, hero: { x: h.pos.x, y: h.pos.y, z: h.pos.z, speed: h.speed || 0 }, near, cry: (x, z, n) => this.cry(x, z, n) };
      for (const f of this.flocks) f.update(g.state === 'play' ? dt : 0, ctx);
    }
    this.sound(dt, live);
    if (!live) { this.dropLooks(); this.hide(); return; }
    this.heads(res, h);
    if (g.state === 'play') { this.bumps(res, dt); this.overhear(res, h); }
    this.bubble(dt);
  }

  // ---------------------------------------------------------------- the evacuation's pace: the two still packing hurry
  pace(res) {
    const evac = this.state === 'evac';
    for (const r of res) {
      if (r.def.id !== 'maro' && r.def.id !== 'tilde') continue;
      r.speed = (r.def.speed || 1.05) * (evac ? 1.35 : 1);
    }
  }

  // ---------------------------------------------------------------- heads turn
  heads(res, h) {
    const sneak = h.behaviour === 'discreet';
    for (const r of res) {
      let want = false;
      if (!sneak && r.present && !r.away && !r.inside && !r.engaged && r.tier === 0 && r.st !== 'chat' && r.st !== 'pairwait' && !(r.stop?.play && r.st !== 'walk' && r.st !== 'plan')) {
        const dx = h.pos.x - r.pos.x, dz = h.pos.z - r.pos.z, d = Math.hypot(dx, dz);
        if (d < LOOK_R) {
          const rel = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - r.angle), Math.cos(Math.atan2(dx, dz) - r.angle)));
          want = rel < 2.2;   // (not straight behind it)
        }
      }
      if (want) { const p = (r._tlLook ||= { x: 0, y: 0, z: 0 }); p.x = h.pos.x; p.y = h.pos.y + 1.5; p.z = h.pos.z; r.rig.lookAt = p; this.looks.add(r); }
      else if (this.looks.has(r)) { if (r.rig.lookAt === r._tlLook) r.rig.lookAt = null; this.looks.delete(r); }
    }
  }
  dropLooks() { for (const r of this.looks) if (r.rig.lookAt === r._tlLook) r.rig.lookAt = null; this.looks.clear(); }

  // ---------------------------------------------------------------- a word when bumped
  bumps(res, dt) {
    const now = this.game.time;
    this.barkAny -= dt;
    for (const r of res) {
      const y = r.yieldT || 0, y0 = this.yieldPrev.get(r) ?? 0;
      this.yieldPrev.set(r, y);
      // (it has just been walked into and steps aside: walkers.js giveWay sets its timer to 0.8 s, which otherwise only runs
      //  down — by a frame or, in the reduced tier, three frames before this sees it — so any rise is a new bump)
      if (!(y > y0 + 0.05)) continue;
      if (this.barkAny > 0 || now < (this.barkAt.get(r) ?? -99)) continue;
      const id = r.def.id, kind = KIDS.has(id) ? 'kid' : OLD.has(id) ? 'old' : 'adult', n = { kid: 3, old: 3, adult: 4 }[kind];
      const key = r.carrying && t('rb_' + r.carrying) !== 'rb_' + r.carrying ? 'rb_' + r.carrying : `rb_${kind}_${(this.barkN++ + (id.length % n)) % n}`;
      this.barkAt.set(r, now + BARK_EACH); this.barkAny = BARK_ANY;
      this.say(r, key, 2.6, 2);
      this.note(`bump ${id} ${key}`);
    }
  }

  // ---------------------------------------------------------------- overheard
  // (TOWN-LIFE-3: their talk follows the town in every chapter Citadel is seen in: townState)
  phase() { return townState(this.game); }
  overhear(res, h) {
    const ph = this.phase();
    const maro = res.find((r) => r.def.id === 'maro'), tilde = res.find((r) => r.def.id === 'tilde');
    if (!ph || !maro || !tilde || maro.st !== 'chat' || tilde.st !== 'chat' || !maro.stop?.pair) { this.chat.speaker = null; return; }
    if (Math.hypot(h.pos.x - (maro.pos.x + tilde.pos.x) / 2, h.pos.z - (maro.pos.z + tilde.pos.z) / 2) > HEAR_R) { this.chat.speaker = null; return; }
    const sp = this.game.walkers.pair(maro.stop.pair).speaker;
    if (!sp || sp === this.chat.speaker) return;
    this.chat.speaker = sp;
    if (this.bub && this.bub.prio > 1) return;   // (a bump's word is up)
    let k = this.chat.k % 6; if (k % 2 !== (sp === 'maro' ? 0 : 1)) k = (k + 1) % 6;
    this.chat.k = k + 1;
    this.say(sp === 'maro' ? maro : tilde, `ro_${ph}_${k}`, 4.4, 1);
    this.note(`heard ${sp} ro_${ph}_${k}`);
  }

  // ---------------------------------------------------------------- the bubble over a head
  say(n, key, dur, prio) {
    if (!this.el) {
      const host = document.getElementById('floats') || document.body;
      const el = (this.el = document.createElement('div'));
      el.className = 'townbark';
      Object.assign(el.style, { position: 'absolute', transform: 'translate(-50%, -100%)', maxWidth: '300px', padding: '5px 11px', background: 'rgba(6, 12, 20, 0.86)',
        border: '1px solid rgba(255, 255, 255, 0.6)', color: '#fff', fontWeight: '500', fontSize: '15px', lineHeight: '1.3', textAlign: 'center', textShadow: '0 1px 2px #000', pointerEvents: 'none', display: 'none', whiteSpace: 'normal', width: 'max-content' });
      host.appendChild(el);
    }
    this.el.textContent = t(key);
    this.el.style.borderRadius = document.body.classList.contains('hud-lba') ? '0' : '9px';
    this.el.style.fontSize = document.body.classList.contains('big-text') ? '18px' : '15px';   // (the Large subtitles setting, as the toasts)
    this.el.style.borderColor = n.def.color || '#ffffff';
    this.bub = { n, t: dur, prio, key };
    this.lastSaid = key;
  }
  hide() { if (this.el && this.el.style.display !== 'none') this.el.style.display = 'none'; this.bub = null; }
  bubble(dt) {
    const B = this.bub;
    if (!B) return;
    B.t -= dt;
    const n = B.n, h = this.game.hero;
    if (B.t <= 0 || !n.present || n.inside || n.away || n.engaged || Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) > 16) { this.hide(); return; }
    // (over its head: the rig's height measured once)
    if (n._tlTop == null) { const b = new THREE.Box3().setFromObject(n.rig.root); n._tlTop = Math.max(1.0, b.max.y - n.pos.y); }
    const v = (this._v ||= new THREE.Vector3()).set(n.pos.x, n.pos.y + n._tlTop + 0.25, n.pos.z).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { this.el.style.display = 'none'; return; }
    const el = this.el;
    el.style.left = ((v.x + 1) / 2 * innerWidth).toFixed(0) + 'px';
    el.style.top = ((1 - v.y) / 2 * innerHeight).toFixed(0) + 'px';
    el.style.opacity = String(clamp(B.t / 0.3, 0, 1));
    if (el.style.display !== 'block') el.style.display = 'block';
  }

  // ---------------------------------------------------------------- Odile's counter
  counter(dt, live) {
    const g = this.game, S = this.W.life?.spots?.odile, n = S && g.npcs.find((x) => x.def.id === 'odile');
    if (!n) return;
    const mine = this.odile.on && n.forceAnim === 'tinker';
    const h = g.hero, dh = Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
    const free = live && n.present && !n.talking && !n.listenTo && !n.controlled && Math.hypot(n.pos.x - S.x, n.pos.z - S.z) < 0.6;
    if (free && dh > COUNTER_R && (!n.forceAnim || mine)) {
      if (!mine) { n.forceAnim = 'tinker'; this.odile.on = true; }
      n.angle = dampAngle(n.angle, S.a + Math.PI, 4, dt);   // (her counter is behind her place: she turns to it)
      if (g.state === 'play' && (this.odile.stampT -= dt) <= 0) {
        this.odile.stampT = 2.2 + Math.random() * 1.8;
        const cx = S.x, cz = S.z - 0.35;
        if (++this.odile.n % 5 === 0) this.bell(cx + 0.6, cz); else this.stamp(cx, cz);
      }
      return;
    }
    if (mine) { n.forceAnim = null; this.odile.on = false; }
    // (he is coming up to the window: she has turned back to the quay before he gets there; closer, she turns to him)
    if (free && !n.forceAnim && dh > 3.2) n.angle = dampAngle(n.angle, S.a, 4, dt);
  }

  // ---------------------------------------------------------------- Tobb's crates
  cargo(res, dt) {
    const tb = res.find((r) => r.def.id === 'tobb');
    if (tb && this.stall) {
      const c = tb.carrying || null;
      if (this.tobb.carry !== undefined && c !== this.tobb.carry) {
        const dq = Math.hypot(tb.pos.x - this.quay.x, tb.pos.z - this.quay.z), ds = Math.hypot(tb.pos.x - this.stall.x, tb.pos.z - this.stall.z);
        if (c === 'crate' && dq < 3) { this.quay.set(this.quay.n - 1); this.count.took++; this.note('quay pile ' + this.quay.n); }
        if (!c && ds < 3) { this.stall.set(this.stall.n + 1); this.count.put++; this.tobb.lastDrop = this.game.time; this.note('stall pile ' + this.stall.n); }
      }
      this.tobb.carry = c;
    }
    // (a new load on the quay, the stall's crates taken in: only where nobody sees)
    if ((this.unseenT -= dt) > 0) return;
    this.unseenT = 3;
    const Wk = this.game.walkers, unseen = (p) => !Wk || Wk.unseen(p.x, p.z, p.y0);
    if (this.quay.n <= QUAY_MIN && unseen(this.quay)) { this.quay.set(QUAY_FULL); this.note('quay pile restocked'); }
    if (this.stall && this.stall.n >= STALL_MAX - 1 && this.game.time - this.tobb.lastDrop > 40 && unseen(this.stall)) { this.stall.set(1); this.note('stall pile taken in'); }
  }

  // ---------------------------------------------------------------- sound
  audio() { const A = this.game.audio; return A && A.ctx && A.ctx.state === 'running' && A.sfxBus && A.noiseBuf ? A : null; }
  level(x, z, r) { const h = this.game.hero.pos, d = Math.hypot(h.x - x, h.z - z); return d >= r ? 0 : (1 - d / r) ** 2; }
  cry(x, z, n = 2) {
    const A = this.audio(); if (!A) return;
    const v = this.level(x, z, 40) * 0.07; if (v < 0.002) return;
    const ctx = A.ctx, t0 = ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const at = t0 + i * 0.34 + Math.random() * 0.08, f = 1150 + Math.random() * 250;
      const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * 1.35, at + 0.07); o.frequency.exponentialRampToValueAtTime(f * 0.72, at + 0.3);
      gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(v, at + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      o.connect(gn).connect(A.sfxBus); o.start(at); o.stop(at + 0.34);
    }
  }
  stamp(x, z) {
    const A = this.audio(); if (!A || this.game.state !== 'play') return;
    const v = this.level(x, z, 16) * 0.16; if (v < 0.002) return;
    const ctx = A.ctx, at = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = A.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(v, at); gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    n.connect(f).connect(gn).connect(A.sfxBus); n.start(at, Math.random()); n.stop(at + 0.08);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(80, at + 0.08);
    og.gain.setValueAtTime(v * 0.6, at); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    o.connect(og).connect(A.sfxBus); o.start(at); o.stop(at + 0.1);
  }
  bell(x, z) {
    const A = this.audio(); if (!A || this.game.state !== 'play') return;
    const v = this.level(x, z, 18) * 0.05; if (v < 0.002) return;
    const ctx = A.ctx, at = ctx.currentTime;
    for (const [fq, k] of [[2093, 1], [5230, 0.25]]) {
      const o = ctx.createOscillator(), gn = ctx.createGain(); o.frequency.value = fq;
      gn.gain.setValueAtTime(v * k, at); gn.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      o.connect(gn).connect(A.sfxBus); o.start(at); o.stop(at + 1.15);
    }
  }
  // the water lapping round the quay's stone edge and the pier's piles: a loop of the game's noise, as loud as he is close
  sound(dt, live) {
    const A = this.audio();
    if (!A) return;
    const h = this.game.hero.pos;
    let lv = 0;
    if (live) {
      const dq = Math.hypot(h.x - clamp(h.x, -120, -118.5), h.z - clamp(h.z, 34, 54));   // (the quay's west edge)
      const dp = Math.hypot(h.x - clamp(h.x, -135, -118), h.z - 43);                     // (the pier)
      const d = Math.min(dq, dp);
      lv = d >= 24 ? 0 : (1 - d / 24) ** 2 * 0.22;
    }
    if (!this.snd) {
      if (lv <= 0) return;
      const ctx = A.ctx, src = ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true; src.playbackRate.value = 0.8;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.7;
      const sw = ctx.createGain(); sw.gain.value = 0.55;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.31; const lg = ctx.createGain(); lg.gain.value = 0.42; lfo.connect(lg).connect(sw.gain);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.19; const lg2 = ctx.createGain(); lg2.gain.value = 160; lfo2.connect(lg2).connect(f.frequency);
      const out = ctx.createGain(); out.gain.value = 0;
      src.connect(f).connect(sw).connect(out).connect(A.ambBus);
      src.start(); lfo.start(); lfo2.start();
      this.snd = { out, last: 0 };
    }
    if (Math.abs(lv - this.snd.last) > 0.003) { this.snd.last = lv; this.snd.out.gain.setTargetAtTime(lv, A.ctx.currentTime, 0.4); }
  }
}
