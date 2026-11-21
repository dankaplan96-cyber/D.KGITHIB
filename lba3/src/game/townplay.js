// TOWN-LIFE-3: what the town's residents do at a few of their stops besides standing (src/game/walkers.js asks this file for
// any stop with `play`, walkrounds.js gives the stops). Each game is run only while the resident is simulated (walkers.js tiers:
// near Twinsen or in view); out of view it is a dwell like any other, and after a load it starts again with the round.
//   tag     two children chase each other round an open lawn (a pair stop: both wait for the other, as the plaza's talkers do;
//           the first there plays on its own a while); the one who is "it" counts, then chases; caught, it swaps
//   hop     hopscotch on a chalk grid on the plaza's paving: up the grid one hop a square (one foot on a single, both on a
//           double), a hop round at the end, and back
//   gulls   a child runs at the gulls on the ground by the stall; they take off (gulls.js: a resident running at them) and
//           it cheers and watches them wheel
//   swing   seated on a bench, a child swings its legs
//   sweep   a broom at a doorstep: a few strokes either side, a puff of dust now and then
//   joy     (P36, the user 15.11: "the water came back — they should go to the well and be happy") when chapter 1's water
//           returns (story/chapter1.js waterReturns calls wellJoy), the nearest few of the square's people (four at most)
//           leave what they are doing for a place round the well: they cheer as they get there, talk, cheer again now and
//           then, and say a word if Twinsen is by. Once he has seen it a while (or after a few minutes without him) they go
//           back to their rounds. The stop is put into each round for once and taken out as it is left (walkers.js leave);
//           nothing is saved: a game loaded after that point has the square as it always is.
// Nothing is saved; no flag. The props (the chalk grid, the broom) are one draw each, the broom shown only while in use.
import * as THREE from 'three';
import { dampAngle, clamp } from '../engine/math.js';
import { part, merge, M4, MATL } from './gulls.js';

const RUN = { runner: 2.3, chaser: 2.45 };
const JOY = { max: 4, reach: 32, ring: 2.4, seen: 24, minAge: 30, maxAge: 160, lines: 4 };
const _others = [], _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ the hopscotch grid (rows of one or two squares)
export const HOP_ROWS = [1, 1, 2, 1, 2, 1], HOP_L = 0.44;
function chalkGeo() {
  const C = '#e8e6dc', w = 0.035, h = 0.006, parts = [];
  const line = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); parts.push(part(new THREE.BoxGeometry(w, h, L + w), C, M4((x0 + x1) / 2, h / 2, (z0 + z1) / 2, 0, Math.atan2(x1 - x0, z1 - z0), 0))); };
  // (along +z from the start line; x across)
  HOP_ROWS.forEach((n, k) => {
    const z0 = k * HOP_L, z1 = z0 + HOP_L, hw = (n === 2 ? HOP_L : HOP_L / 2);
    line(-hw, z0, hw, z0); line(-hw, z1, hw, z1); line(-hw, z0, -hw, z1); line(hw, z0, hw, z1);
    if (n === 2) line(0, z0, 0, z1);
  });
  // a half circle at the top end ("home")
  const zt = HOP_ROWS.length * HOP_L, R = HOP_L / 2;
  for (let i = 0; i < 6; i++) { const a0 = -Math.PI / 2 + (i / 6) * Math.PI, a1 = -Math.PI / 2 + ((i + 1) / 6) * Math.PI; line(Math.sin(a0) * R, zt + Math.cos(a0) * R, Math.sin(a1) * R, zt + Math.cos(a1) * R); }
  return merge(parts);
}
function broomGeo() {
  return merge([
    part(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 6), '#8a6238', M4(0, 0.625 + 0.16, 0)),
    part(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 6), '#5a5a5a', M4(0, 0.19, 0)),
    part(new THREE.BoxGeometry(0.3, 0.17, 0.07), '#c8a860', M4(0, 0.085, 0)),
  ]);
}

export class TownPlay {
  constructor(game, busy, parent) {
    this.game = game; this.busy = busy;
    this.games = new Map();          // pair → the game going on { it, pause, dir, until }
    this.noPlant = new Set();         // residents whose feet the rig lets go of while they hop
    this.log = []; this.count = { tag: 0, swap: 0, hops: 0, gulls: 0, sweep: 0, swing: 0, joy: 0, joyLines: 0 };
    this.joy = null;
    this.hop = null;
    this.broom = new THREE.Mesh(broomGeo(), MATL); this.broom.name = 'broom'; this.broom.visible = false; this.broom.castShadow = true;
    this.broom.matrixAutoUpdate = true;
    parent.add(this.broom);
    this.broomBy = null;
    this.parent = parent;
  }
  note(s) { this.log.push(`${this.game.time.toFixed(1)} ${s}`); if (this.log.length > 40) this.log.shift(); }
  // the chalk grid, where the round's hop stop says (walkrounds.js HOP)
  chalk(H) {
    if (this.hop || !H) return;
    const P = this.game.physics, y = P.groundAt(H.x, H.z, P.terrain.heightAt(H.x, H.z) + 0.5) + 0.004;
    const m = new THREE.Mesh(chalkGeo(), MATL); m.name = 'hopscotch'; m.receiveShadow = true;
    m.position.set(H.x, y, H.z); m.rotation.y = H.a; m.updateMatrix(); m.matrixAutoUpdate = false;
    this.parent.add(m);
    this.hop = { ...H, y, mesh: m };
  }

  // ---------------------------------------------------------------- walkers.js asks: true when it has run the frame
  tick(r, dt, s) {
    switch (s.play) {
      case 'tag': return this.tag(r, dt, s);
      case 'hop': return this.hopTick(r, dt, s);
      case 'gulls': return this.gullTick(r, dt, s);
      case 'swing': return this.swing(r, dt, s);
      case 'sweep': return this.sweep(r, dt, s);
      case 'joy': return this.joyTick(r, dt, s);
    }
    return false;
  }
  // after every resident's frame (townbusy.js): feet given back to anyone who stopped hopping, the broom put away
  update(dt = 0) {
    this.joyUpdate(dt);
    for (const r of this.noPlant) if (!(r.stop?.play === 'hop' && r.st === 'dwell' && !r.engaged && r.present)) { r._hop = null; r.rig.plantIfFits(); this.noPlant.delete(r); }
    if (this.broomBy && !(this.broomBy.stop?.play === 'sweep' && this.broomBy.st === 'dwell' && !this.broomBy.engaged && this.broomBy.present && this.broomBy.tier === 0)) { this.broom.visible = false; this.broomBy = null; }
    for (const r of this.game.walkers?.res || []) {
      if (r._run && !(r.stop?.play && (r.st === 'dwell' || r.st === 'chat' || r.st === 'pairwait'))) r._run = false;
      if (r._gull && !(r.stop?.play === 'gulls' && r.st === 'dwell')) { if (r.rig.lookAt === r._gLook) r.rig.lookAt = null; r._gull = null; }
    }
  }
  // a step through the game's own rules (physics, never into anyone: walkers.js moveClear), turning and animating as it goes
  move(r, tx, tz, speed, dt, field, skip = null) {
    const P = this.game.physics;
    let dx = tx - r.pos.x, dz = tz - r.pos.z; const d = Math.hypot(dx, dz);
    let sp = d < 0.25 ? 0 : speed * clamp(d / 0.8, 0.3, 1);
    if (field) {   // (kept to its lawn: drawn back in past its edge)
      const fx = r.pos.x - field.x, fz = r.pos.z - field.z, fd = Math.hypot(fx, fz);
      if (fd > field.r) { dx -= fx / fd * (fd - field.r) * 4; dz -= fz / fd * (fd - field.r) * 4; }
    }
    const dl = Math.hypot(dx, dz) || 1;
    const x0 = r.pos.x, z0 = r.pos.z;
    if (sp > 0) {
      r.angle = dampAngle(r.angle, Math.atan2(dx, dz), 9, dt);
      const others = r.W.others(r, _others);
      if (skip) { const i = others.indexOf(skip); if (i >= 0) others.splice(i, 1); }   // (two at play brush past each other)
      r.moveClear(dx / dl * sp * dt, dz / dl * sp * dt, others);
    }
    P.fall(r, dt);
    const v = dt > 0 ? Math.hypot(r.pos.x - x0, r.pos.z - z0) / dt : 0;
    r.gait += (v - r.gait) * Math.min(1, dt * 8);
    r._run = r.gait > 1.4;
    r.animate(r.gait > 1.5 ? 'run' : r.gait > 0.12 ? 'walk' : 'idle', dt, r.gait > 0.12 ? r.gait : 0);
    return v;
  }

  // ---------------------------------------------------------------- tag
  tag(r, dt, s) {
    const W = r.W, g = this.game, P = W.pair(s.pair), mate = W.res.find((q) => q.def.id === s.mate), F = s.field;
    if (r.st === 'pairwait') {
      // (as walkers.js pairTick, with a longer wait: the first there runs about on its own meanwhile)
      r.waitT += dt;
      if (mate?.st === 'chat' && P.until > g.time) { r.st = 'chat'; r.chatInit(s); return true; }
      if (mate && mate.st === 'pairwait' && mate.stop?.pair === s.pair) {
        P.until = g.time + r.tmr; P.speaker = r.def.id;
        r.st = 'chat'; r.chatInit(s); return true;
      }
      if (r.waitT > 100) { P.ready.delete(r.def.id); r.note('mate never came'); r._run = false; r.leave(); return true; }
      // on its own: a slow loop of the lawn, a skip now and then
      const a = Math.atan2(r.pos.x - F.x, r.pos.z - F.z) + 0.6, R = F.r * 0.6;
      this.move(r, F.x + Math.sin(a) * R, F.z + Math.cos(a) * R, 1.2, dt, F);
      return true;
    }
    if (r.st !== 'chat') return false;
    let G = this.games.get(s.pair);
    if (!G || G.until !== P.until) { G = { it: P.speaker || r.def.id, pause: 1.6, dir: 1, until: P.until, n: 0 }; this.games.set(s.pair, G); this.count.tag++; this.note(`tag ${s.pair} it ${G.it}`); }
    if (g.time >= P.until) { r._run = false; r.note('tag over'); r.leave(); return true; }
    // (the mate stopped: talked to, stepping out of his way, or gone — wait for it, facing it)
    const mateBusy = !mate || !mate.present || mate.engaged || mate.away || mate.st !== 'chat' || mate.hold > 0 || mate.yieldT > 0;
    if (mateBusy) { if (mate) r.angle = dampAngle(r.angle, r.angleTo(mate), 5, dt); r._run = false; r.animate('idle', dt, 0); return true; }
    const it = G.it === r.def.id;
    if (it) {
      if (G.pause > 0) {   // counting, hands over its eyes
        G.pause -= dt; r._run = false;
        r.angle = dampAngle(r.angle, r.angleTo(mate), 5, dt);
        r.animate('idle', dt, 0);
        const j = r.rig.j; if (j?.armL) { j.armL.sh.rotation.x = -2.2; j.armL.el.rotation.x = -1.3; j.armR.sh.rotation.x = -2.2; j.armR.el.rotation.x = -1.3; }
        return true;
      }
      this.move(r, mate.pos.x, mate.pos.z, RUN.chaser, dt, F, mate);
      const reach = (r.bodyR || 0.4) + (mate.bodyR || 0.4) + 0.25;
      if (Math.hypot(mate.pos.x - r.pos.x, mate.pos.z - r.pos.z) < reach) {
        G.it = mate.def.id; G.pause = 2.2; G.dir = -G.dir; G.n++; this.count.swap++;
        this.note(`tag: ${mate.def.id} is it`);
        this.bark(r, G.n % 3 === 1 ? 'rp_tag_0' : G.n % 3 === 2 ? 'rp_tag_1' : 'rp_tag_2');
      }
      return true;
    }
    // the runner: round the lawn, the way that leads away from the chaser, straight away from it when it is close, and
    // back in from the lawn's edge
    const rx = r.pos.x - F.x, rz = r.pos.z - F.z, rl = Math.hypot(rx, rz) || 1;
    const ax = r.pos.x - mate.pos.x, az = r.pos.z - mate.pos.z, dm = Math.hypot(ax, az) || 1;
    let tx = (-rz / rl) * G.dir, tz = (rx / rl) * G.dir;
    if (dm < 2.5 && tx * ax + tz * az < -0.35 * dm) { tx = -tx; tz = -tz; G.dir = -G.dir; }   // (only when clearly running into it)
    // (round a ring at seven tenths of the lawn's radius: out to it from the middle, in from the edge)
    const w = clamp(1.8 - dm, 0, 1.2), ring = clamp((F.r * 0.7 - rl) / (F.r * 0.3), -1.5, 1);
    const vx = tx + (ax / dm) * w + (rx / rl) * ring * 1.2, vz = tz + (az / dm) * w + (rz / rl) * ring * 1.2;
    const vl = Math.hypot(vx, vz) || 1;
    this.move(r, r.pos.x + (vx / vl) * 1.5, r.pos.z + (vz / vl) * 1.5, RUN.runner, dt, F, mate);
    return true;
  }
  bark(r, key) {
    const B = this.busy, h = this.game.hero;
    if (!B || (B.bub && B.bub.prio >= 1) || Math.hypot(h.pos.x - r.pos.x, h.pos.z - r.pos.z) > 14 || this.game.time - (this._barkT ?? -99) < 7) return;
    this._barkT = this.game.time;
    B.say(r, key, 1.8, 1);
  }

  // ---------------------------------------------------------------- hopscotch
  hopTick(r, dt, s) {
    if (r.st !== 'dwell') return false;
    const H = this.hop;
    if (!H) return false;
    r.tmr -= dt;
    const ux = Math.sin(H.a), uz = Math.cos(H.a), N = HOP_ROWS.length;
    const at = (k) => ({ x: H.x + ux * (k + 0.5) * HOP_L, z: H.z + uz * (k + 0.5) * HOP_L });   // (row k's middle; k = -1: before the grid)
    let S = r._hop;
    if (!S) {
      S = r._hop = { seq: [], i: 0, t: 0, from: null, rest: 0.6 };
      for (let k = 0; k < N; k++) S.seq.push(k);
      S.seq.push('turn');
      for (let k = N - 2; k >= 0; k--) S.seq.push(k);
      S.seq.push(-1);
      S.from = { x: r.pos.x, z: r.pos.z, y: r.pos.y };
      r.rig.plantLite = false; this.noPlant.add(r);
    }
    const P = this.game.physics, j = r.rig.j;
    // (between rounds: a moment standing at the start, facing up the grid; then off again — or on to the next stop)
    if (S.rest > 0) {
      S.rest -= dt;
      const st = at(-1);
      if (Math.hypot(r.pos.x - st.x, r.pos.z - st.z) > 0.2) { this.move(r, st.x, st.z, 1.0, dt, null); return true; }
      r.angle = dampAngle(r.angle, S.back ? H.a + Math.PI : H.a, 6, dt);
      r.animate('idle', dt, 0);
      if (S.rest <= 0) { if (r.tmr <= 0) { r._hop = null; r.leave(); return true; } S.i = 0; S.t = 0; S.back = false; S.from = { x: r.pos.x, z: r.pos.z, y: r.pos.y }; }
      return true;
    }
    // somebody standing on the grid: wait
    const h = this.game.hero, blockedBy = [h, ...r.W.statics].find((o) => { const dx = o.pos.x - H.x - ux * 1.3, dz = o.pos.z - H.z - uz * 1.3; return Math.abs(dx * ux + dz * uz) < 1.9 && Math.abs(dx * uz - dz * ux) < 0.8; });
    if (blockedBy && S.t === 0) { r.animate('idle', dt, 0); return true; }
    const step = S.seq[S.i], DUR = 0.42, HOLD = 0.14;
    if (S.t === 0) S.from = { x: r.pos.x, z: r.pos.z, y: r.pos.y };   // (each hop from where she stands: after a step aside too)
    S.t += dt;
    const k = clamp(S.t / DUR, 0, 1);
    let to, single;
    if (step === 'turn') { to = { x: S.from.x, z: S.from.z }; single = HOP_ROWS[N - 1] === 1; }
    else { to = at(step); single = step < 0 ? false : HOP_ROWS[step] === 1; }
    const e = k * k * (3 - 2 * k);
    r.pos.x = S.from.x + (to.x - S.from.x) * e; r.pos.z = S.from.z + (to.z - S.from.z) * e;
    r.pos.y = P.groundAt(r.pos.x, r.pos.z, H.y + 0.4);
    if (step === 'turn') r.angle = H.a + Math.PI * e; else r.angle = dampAngle(r.angle, S.back ? H.a + Math.PI : H.a, 12, dt);
    r.vy = 0; r.onGround = true;
    r.animate('idle', dt, 0);
    // the pose on top: in the air both knees tucked; on a single square the left foot held up behind, on a double the legs apart
    const air = Math.sin(Math.PI * k), lift = air * (step === 'turn' ? 0.12 : 0.17);
    if (j?.legL) {
      const kneeAir = 0.35 * air;
      j.legR.hip.rotation.x = -0.12 * air; j.legR.knee.rotation.x = 0.15 + kneeAir;
      if (single) { j.legL.hip.rotation.x = -0.45; j.legL.knee.rotation.x = 1.55; j.legL.hip.rotation.z = 0.04; j.legR.hip.rotation.z = -0.02; }
      else { j.legL.hip.rotation.x = -0.12 * air; j.legL.knee.rotation.x = 0.15 + kneeAir; j.legL.hip.rotation.z = 0.16 * (1 - air); j.legR.hip.rotation.z = -0.16 * (1 - air); }
      j.armL.sh.rotation.z += 0.45; j.armR.sh.rotation.z -= 0.45;
    }
    r.rig.root.position.y += lift;
    if (S.t >= DUR + HOLD) {
      this.count.hops++;
      if (step === 'turn') S.back = true;
      S.from = { x: r.pos.x, z: r.pos.z, y: r.pos.y }; S.t = 0; S.i++;
      if (S.i >= S.seq.length) { S.rest = 1.5 + r.rnd() * 1.5; S.back = false; this.note(`hop round ${r.def.id}`); }
    }
    return true;
  }

  // ---------------------------------------------------------------- running at the gulls
  gullTick(r, dt, s) {
    if (r.st !== 'dwell') return false;
    const F = this.busy?.flocks?.find((f) => f.body.name === 'gullsSquare');
    r.tmr -= dt;
    let S = r._gull;
    // (a new visit: another stop, or this one again — its timer set afresh)
    if (!S || S.at !== s || r.tmr > S.tmr + 0.01) S = r._gull = { at: s, phase: 'look', t: 0, bird: null };
    S.tmr = r.tmr;
    S.t += dt;
    if (S.phase === 'look') {
      // a sitting gull on the ground within reach of the stop: off at it
      const b = F?.birds.find((q) => q.st === 'sit' && q.p.ground && Math.hypot(q.x - s.x, q.z - s.z) < 6.5);
      if (b && S.t > 0.8) { S.phase = 'run'; S.bird = b; S.t = 0; this.note(`${r.def.id} runs at the gulls`); }
      else { r.angle = dampAngle(r.angle, s.a ?? r.angle, 4, dt); r.animate('idle', dt, 0); }
    } else if (S.phase === 'run') {
      const b = S.bird;
      this.move(r, b.x, b.z, 2.6, dt, { x: s.x, z: s.z, r: 7 });
      if (b.st !== 'sit' || S.t > 5) { S.phase = 'cheer'; S.t = 0; r._run = false; this.count.gulls++; this.bark(r, 'rp_gulls'); }
    } else if (S.phase === 'cheer') {
      const b = S.bird;
      if (b) { r.angle = dampAngle(r.angle, Math.atan2(b.x - r.pos.x, b.z - r.pos.z), 5, dt); r.rig.lookAt = (r._gLook ||= { x: 0, y: 0, z: 0 }); r._gLook.x = b.x; r._gLook.y = b.y; r._gLook.z = b.z; }
      r.animate(S.t < 1.6 ? 'cheer' : 'idle', dt, 0);
      if (S.t > 4) { S.phase = 'done'; if (r.rig.lookAt === r._gLook) r.rig.lookAt = null; }
    } else r.animate('idle', dt, 0);
    if (r.tmr <= 0 && S.phase !== 'run') { if (r.rig.lookAt === r._gLook) r.rig.lookAt = null; r._gull = null; r.leave(); }
    return true;
  }

  // ---------------------------------------------------------------- the well's water back (P36)
  // the nearest few of the square's people are given a stop round the well; returns how many
  wellJoy() {
    const g = this.game, W = g.walkers, wl = g.world?.well;
    if (!W || W.indoor || !wl || this.joy) return 0;
    const P = g.physics, nav = W.nav, y0 = P.groundAt(wl.x, wl.z);
    const free = (r) => r.present && !r.away && !r.inside && !r.engaged && !r.sit && r.stops.length > 1 && r.stop && !r.stop.play && !r.stop.pair && !r.stop.door && (r.st === 'dwell' || r.st === 'walk' || r.st === 'plan');
    const dW = (r) => Math.hypot(r.pos.x - wl.x, r.pos.z - wl.z);
    const who = W.res.filter((r) => free(r) && dW(r) < JOY.reach).sort((a, b) => dW(a) - dW(b)).slice(0, JOY.max);
    if (!who.length) return 0;
    // places round the well: on walkable ground, clear of the story's people (Gilbert stands by it), of doorways, and of each other
    const story = g.npcs.filter((n) => !n.ambient && n.present);
    const spots = [];
    for (let i = 0; i < 16 && spots.length < who.length; i++) {
      const a = ((i * 7) % 16) / 16 * Math.PI * 2, x = wl.x + Math.sin(a) * JOY.ring, z = wl.z + Math.cos(a) * JOY.ring;
      if (nav?.walkable && !nav.walkable(x, z)) continue;
      if (P.overlapAt && P.overlapAt(x, z, y0 + 0.1, 0.35) > 0.02) continue;
      if (story.some((n) => Math.hypot(n.pos.x - x, n.pos.z - z) < 1.5) || W.doorDist(x, z) < 0.8) continue;
      if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6)) continue;
      spots.push({ x, z, a: Math.atan2(wl.x - x, wl.z - z) });
    }
    const J = this.joy = { t0: g.time, seen: 0, end: null, who: [], stops: [], said: 0, speaker: 0, spkT: 0 };
    // (each walks to the nearest place still free)
    const left = spots.slice();
    for (const r of who) {
      if (!left.length) break;
      left.sort((p, q) => Math.hypot(p.x - r.pos.x, p.z - r.pos.z) - Math.hypot(q.x - r.pos.x, q.z - r.pos.z));
      const sp = left.shift(), st = { id: 'joy_' + r.def.id, x: sp.x, z: sp.z, a: sp.a, dur: [600, 600], play: 'joy', _once: true, noStep: true };
      if (r.st === 'dwell') { r.stops.splice(r.ri + 1, 0, st); r.tmr = Math.min(r.tmr, 0.3 + J.who.length * 0.7); }
      else { r.stops.splice(r.ri, 0, st); r.planTo(st, null); }
      J.who.push(r); J.stops.push(st);
      r.note('the well: water!');
    }
    this.note(`wellJoy ${J.who.map((r) => r.def.id).join(',')}`);
    return J.who.length;
  }
  // one of them at its place: faces the well, cheers as it gets there and now and then, talks or listens between
  joyTick(r, dt, s) {
    if (r.st !== 'dwell') return false;
    const g = this.game, J = this.joy, wl = g.world.well, h = g.hero;
    let S = r._joy;
    if (!S || S.at !== s) S = r._joy = { at: s, t: 0, next: 0.3 + r.rnd() * 0.9, cheer: 0, n: 0 };
    S.t += dt; r.tmr -= dt;
    const dh = Math.hypot(h.pos.x - r.pos.x, h.pos.z - r.pos.z);
    r.angle = dampAngle(r.angle, dh < 2.6 ? Math.atan2(h.pos.x - r.pos.x, h.pos.z - r.pos.z) : Math.atan2(wl.x - r.pos.x, wl.z - r.pos.z), 4, dt);
    if (S.cheer > 0) S.cheer -= dt;
    else if (S.t >= S.next && !J?.end) {
      S.cheer = 1.6; S.next = S.t + 8 + r.rnd() * 6; S.n++; this.count.joy++;
      // (a word, if he is near enough to hear it: each line once, one at a time)
      if (J && J.said < JOY.lines) { const t0 = this._barkT; this.bark(r, 'rp_well_' + J.said); if (this._barkT !== t0) { J.said++; this.count.joyLines++; } }
    }
    const here = J ? J.who.filter((q) => q.st === 'dwell' && q._joy && q.stop === q._joy.at) : [];
    const talker = here.length > 1 && here[J.speaker % here.length] === r;
    r.animate(S.cheer > 0 ? 'cheer' : talker ? 'talk' : here.length > 1 ? 'listen' : 'idle', dt, 0);
    if (S.cheer <= 0 && !talker && (r.gestT -= dt) <= 0) { r.rig.doGesture('nod'); r.gestT = 3 + r.rnd() * 3; }
    if (r.tmr <= 0) { r._joy = null; r.leave(); }
    return true;
  }
  // how long it lasts: until he has seen it a while, or a few minutes without him; then back to their rounds, one by one
  joyUpdate(dt) {
    const J = this.joy, g = this.game;
    if (!J || J.done) return;
    if ((J.spkT += dt) > 3.5) { J.spkT = 0; J.speaker++; }
    const wl = g.world.well, h = g.hero, age = g.time - J.t0;
    if (!J.end) {
      if (!g.room && g.state === 'play' && Math.hypot(h.pos.x - wl.x, h.pos.z - wl.z) < 22) J.seen += dt;
      if ((J.seen > JOY.seen && age > JOY.minAge) || age > JOY.maxAge) {
        J.end = g.time; this.note('wellJoy over');
        for (const st of J.stops) st.dur = [0.5, 2.5];   // (one still on its way stays a moment and goes)
        J.who.forEach((r, i) => { if (J.stops.includes(r.stop) && r.st === 'dwell') r.tmr = Math.min(r.tmr, 0.6 + i * 1.3 + r.rnd()); });
      }
    }
    // (over once nobody's round still holds a stop of it)
    if (J.end && !J.who.some((r) => J.stops.some((st) => r.stops.includes(st)))) J.done = true;
  }

  // ---------------------------------------------------------------- legs swinging on a bench
  swing(r, dt, s) {
    if (r.st !== 'seated') return false;
    r.seatedTick(dt, s);
    if (r.st !== 'seated') return true;
    const j = r.rig.j, t = this.game.time * 4.2 + (r._swPh ??= r.rnd() * 6);
    if (j?.legL) { j.legL.knee.rotation.x = 1.15 + Math.sin(t) * 0.42; j.legR.knee.rotation.x = 1.15 + Math.sin(t + Math.PI) * 0.42; j.head.rotation.x = 0.05; }
    if (!r._swung) { r._swung = true; this.count.swing++; }
    return true;
  }

  // ---------------------------------------------------------------- a broom at a doorstep
  sweep(r, dt, s) {
    if (r.st !== 'dwell') return false;
    r.tmr -= dt;
    r.angle = dampAngle(r.angle, s.a ?? r.angle, 4, dt);
    r.animate('idle', dt, 0);
    const j = r.rig.j, t = this.game.time * 2.6 + (r._swPh ??= r.rnd() * 6), w = Math.sin(t);
    if (r.tier === 0 && j?.armL) {
      j.torso.rotation.y = w * 0.32; j.torso.rotation.x = 0.22; j.head.rotation.x = 0.25;
      j.armR.sh.rotation.x = -0.45; j.armR.el.rotation.x = -0.35; j.armL.sh.rotation.x = -0.95; j.armL.el.rotation.x = -0.85;
      // the broom: its head on the ground in front, swept side to side; its handle up through the hands
      const fx = Math.sin(r.angle), fz = Math.cos(r.angle), sx = fz, sz = -fx;
      const bx = r.pos.x + fx * 0.75 + sx * w * 0.38, bz = r.pos.z + fz * 0.75 + sz * w * 0.38, by = r.pos.y + 0.005;
      r.rig.root.updateMatrixWorld(true);
      j.armR.hand.getWorldPosition(_a); j.armL.hand.getWorldPosition(_b); _a.add(_b).multiplyScalar(0.5);
      _b.set(_a.x - bx, _a.y - by, _a.z - bz).normalize();
      _q.setFromUnitVectors(_up, _b);
      const B = this.broom;
      B.position.set(bx, by, bz); B.quaternion.copy(_q);
      B.visible = true; this.broomBy = r;
      if (!r._swept) { r._swept = true; this.count.sweep++; }
      // (a puff of dust at the end of a stroke)
      const turn = Math.sign(Math.cos(t)); if (turn !== r._swTurn) { r._swTurn = turn; if (r.rnd() < 0.5) this.game.particles?.burst(bx, by + 0.08, bz, '#cdbb98', 3, 0.5); }
    }
    if (r.tmr <= 0) { r.leave(); }
    return true;
  }
}
