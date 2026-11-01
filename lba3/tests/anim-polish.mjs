// Twinsen's starts, stops, stepping turns, landings and melee contact (ANIM-POLISH-2), played by input in chapter 1's Citadel
// (the town square) and his house's cellar stairs, at 30, 60 and 120 fps where it matters. The animation must serve the
// controls, never delay them:
//  1. turning on the spot (Classic, the keyboard's default): the feet step in turn from the turn's first frames (the lead foot
//     first, within 0.12 s), at least one step per ~0.25 s, and a planted foot does not slide (< 4 cm in a half-turn);
//  2. walking: the foot he stands on stays where it struck the ground (it slid 0.5 m/s while he walked at 2); a stop brings
//     both feet down and together within 0.45 s, in at most two steps; the move starts on the frame of the key (no latency);
//  3. landings: a jump's landing takes the weight in the knees (the pelvis down > 8 cm within 0.15 s), the soles stay on the
//     ground from the touchdown frame (sinking < 1.5 cm), a higher drop goes deeper; a stair tread never jerks the drawn body
//     more than 8 cm in a 60 fps frame (it was 20 cm), and the gameplay height is the ground's at once;
//  4. melee: the fist / foot reaches out, and the blade crosses in front of him, within 25 ms of the moment combat.js strikes a
//     body there (35 ms for the kick); the attack begins on the press frame (combat.move set);
//  5. interruptions: a hit mid-turn, mid-walk and mid-step, the pause, and a dialogue leave no NaN, no stuck plant (the
//     feet stand planted again within 0.6 s of play), no stuck pose.
// Prints MEASURE lines with the numbers. GAME_URL (default http://localhost:8123/).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
watch(page);
page.setDefaultTimeout(900000);
const ev = (f, a) => page.evaluate(f, a);
const { check, done } = checker({ info: 'always' });
const measure = (name, info) => console.log('MEASURE ' + name, JSON.stringify(info));
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 900000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 600000 });
await ev(() => {
  const G = window.game; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
  const V = G.hero.pos.constructor, P = G.physics;
  const wp = (o, v = new V()) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(v); };
  // a flat, clear spot near where chapter 1 starts, and a heading with 7 m free ahead
  const findHome = () => {
    const h = G.hero, x0 = h.pos.x, z0 = h.pos.z, probe = { pos: new V(), radius: 0.4, onGround: true };
    const free = (x, y, z, a, d) => { probe.pos.set(x, y, z); P.move(probe, Math.sin(a) * d, Math.cos(a) * d); return Math.hypot(probe.pos.x - x - Math.sin(a) * d, probe.pos.z - z - Math.cos(a) * d) < 0.05; };
    let best = null;
    for (let dx = -30; dx <= 30; dx += 2) for (let dz = -30; dz <= 30; dz += 2) {
      const x = x0 + dx, z = z0 + dz, y = P.groundAt(x, z); if (y < 0.05) continue;
      let ok = true;
      for (let a = 0; a < 8 && ok; a++) for (const r of [1.75, 3.5, 7]) if (Math.abs(P.groundAt(x + Math.sin(a * 0.785) * r, z + Math.cos(a * 0.785) * r) - y) > 0.03) ok = false;
      for (let a = 0; a < 8 && ok; a++) if (!free(x, y, z, a * 0.785, 4)) ok = false;
      if (!ok) continue;
      let head = null; for (let a = 0; a < 16 && head == null; a++) if (free(x, y, z, a * 0.3927, 7)) head = a * 0.3927;
      if (head == null) continue;
      const d = Math.hypot(dx, dz); if (!best || d < best[3]) best = [x, z, head, d];
    }
    return best;
  };
  const home = findHome();
  window.A = {
    G, V, wp, home,
    reset(beh = 'normal', controls = 'classic', at = home) {
      const h = G.hero; G.settings.controls = controls; G.applySettings(); h.behaviour = beh;
      for (const n of G.npcs || []) if (Math.hypot(n.pos.x - at[0], n.pos.z - at[1]) < 12) n.setPresent?.(false);
      h.pos.set(at[0], P.groundAt(at[0], at[1]), at[1]); h.angle = at[2]; h.resetMotion(); h.vy = 0; h.onGround = true;
      h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0; h.hasSword = true; h.rig.fidgetT = 99; h.rig.fidget = 0;   // (no idle fidget in the measured windows)
      G.resetCombat?.(); G.state = 'play'; G.targeting?.release?.(); G.input.keys.clear(); G.input.taps?.clear?.();
      for (let i = 0; i < 90; i++) G.frame(1 / 60, false);
    },
    frame(keys, dt, taps = []) {
      G.input.keys.clear(); for (const k of keys) G.input.keys.add(k); for (const k of taps) { G.input.keys.add(k); G.input.taps.add(k); }
      G.frame(dt, false);
      for (const k of taps) if (!keys.includes(k)) G.input.keys.delete(k);
    },
    // one sample: the feet (world), their plant states, the hips, the drawn root, the move
    sample(t) {
      const h = G.hero, r = h.rig, j = r.j, F = r._feet, g = P.groundAt(h.pos.x, h.pos.z, h.pos.y + 0.5);
      const f = (o) => { const v = wp(o); return [v.x, v.y - g, v.z]; };
      return {
        t, anim: r.anim, pos: [h.pos.x, h.pos.y, h.pos.z], angle: h.angle, speed: h.speed, onGround: h.onGround, rootY: r.root.position.y,
        L: f(j.legL.foot), R: f(j.legR.foot), hips: wp(j.hips).y - h.pos.y, handR: f(j.armR.hand), handL: f(j.armL.hand),
        blade: h.swordMesh?.visible ? (() => { const v = new V(0, -0.75, 0); h.swordMesh.updateWorldMatrix(true, false); return v.applyMatrix4(h.swordMesh.matrixWorld).toArray(); })() : null,
        pl: F ? ['L', 'R'].map((s) => ({ on: F[s].on, st: F[s].stepping, w: F[s].w })) : null,
        move: h.combat.move ? { key: h.combat.move.key, t: h.combat.move.t } : null,
        nan: ![j.legL.hip, j.legR.hip, j.legL.knee, j.legR.knee, j.torso, j.hips].every((b) => [b.rotation.x, b.rotation.y, b.rotation.z].every(Number.isFinite)),
      };
    },
    // play a list of { keys, taps, secs, run } at dt; returns the samples
    play(steps, dt) {
      const out = []; let t = 0;
      for (const s of steps) {
        if (s.run) (0, eval)(s.run);
        const n = Math.max(1, Math.round(s.secs / dt));
        for (let i = 0; i < n; i++) { A.frame(s.keys || [], dt, i === 0 ? s.taps || [] : []); t += dt; out.push(A.sample(t)); }
      }
      return out;
    },
  };
});
const home = await ev(() => A.home);
check('a clear, flat spot in Citadel for the checks', !!home, home);

// helpers on the samples (node side)
const lowFoot = (s, k) => s[k][1] < 0.115;
function slip(S, from = 0, to = 99) {
  // a foot within 1.5 cm of standing height whose plant holds it (on, not stepping, weight 1): how far it moves
  let cm = 0, max = 0;
  for (let i = 1; i < S.length; i++) {
    const s = S[i], p = S[i - 1]; if (s.t < from || s.t > to || !s.onGround || !p.onGround) continue;
    ['L', 'R'].forEach((k, n) => {
      const a = s.pl?.[n], b = p.pl?.[n];
      if (!a || !b || !a.on || a.st || b.st || a.w < 0.99 || b.w < 0.99 || !lowFoot(s, k)) return;
      const d = Math.hypot(s[k][0] - p[k][0], s[k][2] - p[k][2]); cm += d * 100; max = Math.max(max, d / (s.t - p.t));
    });
  }
  return { cm: +cm.toFixed(1), maxSpeed: +max.toFixed(2) };
}
// whatever the plant says: the lower foot, when within 2.5 cm of standing height, against the ground — how fast it moves (m/s,
// mean over the frames it is down) while the body walks
function contactSlip(S, from, to) {
  let d = 0, n = 0, time = 0, body = 0;
  for (let i = 1; i < S.length; i++) {
    const s = S[i], p = S[i - 1]; if (s.t < from || s.t > to) continue;
    body += Math.hypot(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]);
    const k = s.L[1] < s.R[1] ? 'L' : 'R'; if (s[k][1] > 0.125 || p[k][1] > 0.125) continue;
    d += Math.hypot(s[k][0] - p[k][0], s[k][2] - p[k][2]); time += s.t - p.t; n++;
  }
  return { meanSpeed: time ? +(d / time).toFixed(3) : null, cmPerMetre: body ? +(d / body * 100).toFixed(1) : null, frames: n };
}
function steps(S, from = 0, to = 99) {
  // step starts: a foot's plant going from standing to stepping
  const out = [];
  for (let i = 1; i < S.length; i++) ['L', 'R'].forEach((k, n) => { const a = S[i].pl?.[n], b = S[i - 1].pl?.[n]; if (a && b && a.st && !b.st && S[i].t >= from && S[i].t <= to) out.push([k, +S[i].t.toFixed(3)]); });
  return out;
}

// ---- 1. the stepping turn on the spot, at 30 / 60 / 120 fps (Classic, Normal: 100°/s; Athletic 169°/s at 60)
for (const [fps, beh] of [[30, 'normal'], [60, 'normal'], [120, 'normal'], [60, 'athletic']]) {
  const dt = 1 / fps;
  const S = await ev(([dt, beh]) => { A.reset(beh); return A.play([{ secs: 0.2 }, { keys: ['ArrowLeft'], secs: 1.2 }, { secs: 0.8 }], dt); }, [dt, beh]);
  const st = steps(S, 0.2, 1.4), sl = slip(S), t0 = 0.2;
  const turned = (S[S.length - 1].angle - S[0].angle) * 180 / Math.PI;
  const gaps = st.slice(1).map((s, i) => +(s[1] - st[i][1]).toFixed(3));
  const settled = S.findIndex((s) => s.t > 1.4 && s.pl.every((p) => p.on && !p.st && p.w > 0.99));
  const r = { fps, beh, turned: +turned.toFixed(1), steps: st, gaps, slip: sl, firstAfter: st.length ? +(st[0][1] - t0).toFixed(3) : null, settledAt: settled >= 0 ? +S[settled].t.toFixed(3) : null, nan: S.some((s) => s.nan) };
  measure(`turn ${beh} ${fps} fps`, r);
  check(`turn on the spot ${beh} ${fps} fps: the first step within 0.12 s of the key, the lead (left) foot first`, r.firstAfter != null && r.firstAfter <= 0.12 + dt && st[0][0] === 'L', r);
  check(`turn on the spot ${beh} ${fps} fps: the feet keep stepping in turn while he turns (alternating, a step at least every 0.3 s)`, st.length >= (beh === 'athletic' ? 4 : 4) && st.every((s, i) => !i || s[0] !== st[i - 1][0]) && gaps.every((g) => g <= 0.3), r);
  check(`turn on the spot ${beh} ${fps} fps: a planted foot does not slide (< 4 cm over the turn), both stand planted 0.6 s after`, sl.cm < 4 && r.settledAt != null && r.settledAt < 2.0 && !r.nan, r);
}

// ---- 2. walking: the stance foot stays; the stop; no start latency (Classic and Modern)
for (const [fps, controls] of [[30, 'classic'], [60, 'classic'], [120, 'classic'], [60, 'modern']]) {
  const dt = 1 / fps;
  const S = await ev(([dt, controls]) => {
    A.reset('normal', controls);
    if (controls === 'modern') A.G.camRig.yaw = A.G.hero.angle + Math.PI;
    return A.play([{ secs: 0.2 }, { keys: [controls === 'modern' ? 'KeyW' : 'ArrowUp'], secs: 1.5 }, { secs: 1.0 }], dt);
  }, [dt, controls]);
  const first = S.find((s) => s.t > 0.2 + 1e-6);
  const moved = Math.hypot(first.pos[0] - S[0].pos[0], first.pos[2] - S[0].pos[2]);
  const steady = slip(S, 0.7, 1.7), ground = contactSlip(S, 0.7, 1.7), stopAt = 1.7;
  const done2 = S.find((s) => s.t > stopAt + 0.05 && s.speed < 0.01 && s.pl.every((p) => p.on && !p.st && p.w > 0.99) && lowFoot(s, 'L') && lowFoot(s, 'R'));
  const after = steps(S, stopAt, 99), late = steps(S, stopAt + 0.6, 99);
  const r = { fps, controls, startMovedCm: +(moved * 100).toFixed(2), steadySlip: steady, groundSlip: ground, stopSettledAfter: done2 ? +(done2.t - stopAt).toFixed(3) : null, stepsAfterStop: after, stepsLate: late, stopSlip: slip(S, stopAt, 99), bothOffAfterStopS: +(S.filter((s) => s.t > stopAt && s.pl.every((p) => !p.on || p.st)).length * dt).toFixed(3), nan: S.some((s) => s.nan) };
  measure(`walk ${controls} ${fps} fps`, r);
  check(`walk ${controls} ${fps} fps: he moves on the frame of the key (no added latency)`, moved > 0.001, r);
  check(`walk ${controls} ${fps} fps: the foot he stands on stays where it struck (the lower foot on the ground < 0.15 m/s, the planted one < 6 cm over 1 s)`, ground.meanSpeed != null && ground.meanSpeed < 0.15 && ground.frames > 0.4 / dt && steady.cm < 6 && steady.maxSpeed < 0.25, r);
  check(`walk ${controls} ${fps} fps: the stop: both feet down and planted within 0.45 s, at most two steps, one foot at a time (both off the ground at most 0.05 s), none after 0.6 s; no slide`, r.bothOffAfterStopS <= 0.05 && r.stopSettledAfter != null && r.stopSettledAfter <= 0.45 && after.length <= 2 && !late.length && r.stopSlip.cm < 3 && !r.nan, r);
}

// ---- 3. landings: a standing jump, drops of 0.9 and 2.0 m (Athletic), at 30 / 60 / 120 fps; the cellar stairs
for (const fps of [30, 60, 120]) {
  const dt = 1 / fps;
  const land = async (setup) => {
    // (a drop: let go from that height, no key; a jump: Space)
    const S = await ev(([dt, setup]) => { A.reset('athletic'); (0, eval)(setup); return A.play(setup ? [{ secs: 1.7 }] : [{ secs: 0.1 }, { taps: ['Space'], secs: dt }, { secs: 1.6 }], dt); }, [dt, setup]);
    const i = S.findIndex((s, k) => k && s.onGround && !S[k - 1].onGround);
    if (i < 0) return { landed: false };
    const base = S[i - 1].hips, win = S.filter((s) => s.t >= S[i].t && s.t <= S[i].t + 0.15), back = S.filter((s) => s.t > S[i].t + 0.5);
    const sink = Math.max(...S.slice(i, i + Math.round(0.3 / dt)).map((s) => Math.max(0.1 - s.L[1], 0.1 - s.R[1])));
    return { landed: true, at: +S[i].t.toFixed(3), dropCm: +((0.95 - Math.min(...win.map((s) => s.hips))) * 100).toFixed(1), sinkCm: +(sink * 100).toFixed(1), standsBack: back.length ? +back[back.length - 1].hips.toFixed(3) : null, slip: slip(S, S[i].t + dt * 2, 99), nan: S.some((s) => s.nan) };
  };
  const jump = await land('');
  const d1 = await land("A.G.hero.pos.y += 0.9; A.G.hero.onGround = false; A.G.hero.airPeak = A.G.hero.pos.y");
  const d2 = await land("A.G.hero.pos.y += 2.0; A.G.hero.onGround = false; A.G.hero.airPeak = A.G.hero.pos.y");
  const r = { fps, jump, drop09: d1, drop20: d2 };
  measure(`landing ${fps} fps`, r);
  check(`landing ${fps} fps: a jump's landing takes the weight in the knees (pelvis down > 8 cm within 0.15 s) and stands back up`, jump.landed && jump.dropCm > 8 && jump.standsBack > 0.92 && !jump.nan, jump);
  check(`landing ${fps} fps: the soles stay on the ground from the touchdown frame (sink < 1.5 cm, no slide after)`, jump.sinkCm < 1.5 && d1.sinkCm < 1.5 && d2.sinkCm < 1.5 && jump.slip.cm < 2, r);
  check(`landing ${fps} fps: the absorb is sized by the fall (2.0 m drop deeper than 0.9 m)`, d1.landed && d2.landed && d2.dropCm > d1.dropCm + 1, r);
}
// ---- 4. melee contact against the hit, at 30 / 60 / 120 fps (in the square, no target: the hit time is combat.js's own)
const MV = { jab: [0.07, 0.08, 0.5, null, 'handR'], jab2: [0.07, 0.08, 0.5, null, 'handL'], kick: [0.13, 0.1, 0.5, null, 'R'], slash1: [0.11, 0.1, null, [1.25, -1.15]], slash2: [0.1, 0.1, null, [-1.2, 1.2]], slash3: [0.19, 0.09, null, [0.3, -0.3]] };
const MOVES = await ev(() => import('./src/game/combat.js').then((m) => Object.fromEntries(['jab', 'jab2', 'kick', 'slash1', 'slash2', 'slash3'].map((k) => [k, [m.MOVES[k].s, m.MOVES[k].a, m.MOVES[k].land ?? null, m.MOVES[k].arc]]))));
check('melee: the moves timed here are combat.js MOVES as they stand (no gameplay timing changed)', Object.entries(MV).every(([k, v]) => MOVES[k][0] === v[0] && MOVES[k][1] === v[1] && (MOVES[k][2] ?? null) === v[2]), MOVES);
for (const fps of [30, 60, 120]) {
  const dt = 1 / fps;
  const res = {};
  for (const [weapon, n] of [['fists', 3], ['sword', 3]]) {
    const S = await ev(([dt, weapon, n]) => {
      A.reset('normal'); const h = A.G.hero; h.combat.equip(weapon, true); if (weapon === 'fists') h.weapon = 'fists';
      A.play([{ secs: 0.3 }], dt);
      const st = []; for (let i = 0; i < n; i++) st.push({ taps: ['KeyK'], secs: weapon === 'sword' ? 0.33 : 0.25 }); st.push({ secs: 0.8 });
      return A.play(st, dt);
    }, [dt, weapon, n]);
    const runs = {}; for (const s of S) if (s.move) (runs[s.move.key] ??= []).push(s);
    for (const [k, R] of Object.entries(runs)) {
      const [s0, a, land, arc, part] = MV[k];
      const pad = Math.atan2(0.5, 1.6) + 0.12;
      const hit = arc ? s0 + a * Math.max(0, (Math.abs(arc[0]) - pad) / Math.abs(arc[0] - arc[1])) : s0 + a * land;
      let t = null;
      if (!arc) {
        const fw = R.map((s) => { const p = s[part], c = Math.cos(s.angle), sn = Math.sin(s.angle); return [s.move.t, (p[0] - s.pos[0]) * sn + (p[2] - s.pos[2]) * c]; });
        const f0 = fw[0][1], fm = Math.max(...fw.map((x) => x[1])); t = fw.find((x) => x[1] >= f0 + 0.9 * (fm - f0))[0];
      } else {
        let prev = null;
        for (const s of R) {
          const p = s.blade; if (!p) continue;
          const c = Math.cos(s.angle), sn = Math.sin(s.angle), dx = p[0] - s.pos[0], dz = p[2] - s.pos[2], fwd = dx * sn + dz * c, side = dx * c - dz * sn, th = Math.atan2(side, fwd), y = p[1] - s.pos[1];
          if (k === 'slash3') { if (prev && prev.y > 1.2 && y <= 1.2 && fwd > 0.3 && t == null) t = prev.t + (s.move.t - prev.t) * (prev.y - 1.2) / (prev.y - y); }
          else if (prev && (prev.th > 0) !== (th > 0) && (th - prev.th) * (arc[1] - arc[0]) > 0 && Math.abs(th) < 1.2 && t == null) t = prev.t + (s.move.t - prev.t) * prev.th / (prev.th - th);
          prev = { t: s.move.t, th, y };
        }
      }
      res[k] = { hitMs: Math.round(hit * 1000), poseMs: t == null ? null : Math.round(t * 1000), diffMs: t == null ? null : Math.round((t - hit) * 1000), started: +R[0].move.t.toFixed(3) };
    }
  }
  measure(`melee contact ${fps} fps`, res);
  const tol = (k) => (k === 'kick' ? 35 : 25) + 1000 * dt * (fps === 30 ? 0.5 : 0);
  check(`melee ${fps} fps: every strike's contact pose within 25 ms of its hit (kick 35; +half a frame at 30 fps)`, ['jab', 'jab2', 'kick', 'slash1', 'slash2', 'slash3'].every((k) => res[k] && res[k].diffMs != null && Math.abs(res[k].diffMs) <= tol(k)), res);
  check(`melee ${fps} fps: each strike begins on the frame of its press (its clock at one frame)`, Object.values(res).every((x) => x.started <= dt + 1e-6), res);
}

// ---- 5. interruptions: a hit mid-turn / mid-walk / mid-stop-step, the pause, a dialogue
{
  const r = await ev(() => {
    const G = A.G, h = G.hero, out = {};
    const settled = () => { G.input.keys.clear(); for (let i = 0; i < 60; i++) { G.frame(1 / 60, false); const F = h.rig._feet; if (F && F.L.on && F.R.on && !F.L.stepping && !F.R.stepping && F.L.w > 0.99 && F.R.w > 0.99) return +(i / 60).toFixed(3); } return null; };
    const hit = () => h.damage(1, { x: h.pos.x + 1, z: h.pos.z });
    A.reset(); A.play([{ keys: ['ArrowLeft'], secs: 0.3 }], 1 / 60); hit(); A.play([{ keys: ['ArrowLeft'], secs: 0.2 }], 1 / 60); out.turnHit = settled();
    A.reset(); A.play([{ keys: ['ArrowUp'], secs: 0.8 }], 1 / 60); hit(); A.play([{ secs: 0.05 }], 1 / 60); out.walkHit = settled();
    A.reset(); A.play([{ keys: ['ArrowUp'], secs: 0.8 }, { secs: 0.08 }], 1 / 60); hit(); out.stopHit = settled();
    // the pause mid-step: nothing moves while paused, the step finishes after
    A.reset(); A.play([{ keys: ['ArrowLeft'], secs: 0.15 }], 1 / 60);
    const F = h.rig._feet, before = JSON.stringify([F.L.u, F.R.u, h.angle]); G.state = 'pause'; for (let i = 0; i < 30; i++) G.frame(1 / 60, false);
    out.pauseFrozen = JSON.stringify([F.L.u, F.R.u, h.angle]) === before; G.state = 'play'; out.pauseSettle = settled();
    // a dialogue started mid-walk: he stops and stands planted (the talk/listen poses plant)
    A.reset(); A.play([{ keys: ['ArrowUp'], secs: 0.6 }], 1 / 60);
    G.input.keys.clear(); G.say('Twinsen', ['Test.'], () => {}, h);
    for (let i = 0; i < 40; i++) G.frame(1 / 60, false);
    out.dialogState = G.state; for (let i = 0; i < 60 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    out.dialogSettle = settled();
    out.nan = ![h.rig.j.legL.hip, h.rig.j.legR.hip, h.rig.j.hips, h.rig.j.torso].every((b) => [b.rotation.x, b.rotation.y, b.rotation.z, b.position.y].every(Number.isFinite));
    return out;
  });
  measure('interruptions', r);
  check('interruptions: a hit mid-turn, mid-walk and on the stop leaves the feet planted again within 0.6 s of play', [r.turnHit, r.walkHit, r.stopHit].every((x) => x != null && x <= 0.6) && !r.nan, r);
  check('interruptions: the pause freezes a turning step and it completes after; a dialogue mid-walk ends with the feet planted', r.pauseFrozen && r.pauseSettle != null && r.dialogSettle != null, r);
}

// ---- 6. the cellar stairs in his house (chapter 1-2): a tread is a step for the drawn body, not a jump
{
  const r = await ev(() => {
    const G = A.G; G.enterRoom('cellar', null, true); G.step(0.5);
    for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    const sp = G.room.spawn; A.reset('normal', 'classic', [sp.x, sp.z, -Math.PI / 2]);
    const S = A.play([{ secs: 0.2 }, { keys: ['ArrowUp'], secs: 1.2 }], 1 / 60).filter((s) => s.pos[0] > sp.x - 2.4 && !A.G.trans);   // (before the top step's way out)
    let jerk = 0, tread = 0, gap = 0;
    for (let i = 1; i < S.length; i++) {
      jerk = Math.max(jerk, Math.abs(S[i].hips + S[i].pos[1] - (S[i - 1].hips + S[i - 1].pos[1])));   // (the drawn pelvis, world height)
      tread = Math.max(tread, S[i].pos[1] - S[i - 1].pos[1]);
      gap = Math.max(gap, Math.abs(S[i].rootY - S[i].pos[1]));
    }
    const climbed = S[S.length - 1].pos[1] - S[0].pos[1];
    return { climbed: +climbed.toFixed(2), maxTreadInFrame: +tread.toFixed(3), maxDrawnJerk: +jerk.toFixed(3), maxDrawnOffset: +gap.toFixed(3), nan: S.some((s) => s.nan) };
  });
  measure('cellar stairs', r);
  check('stairs: up the cellar stairs the drawn body never jumps more than 8 cm in a 60 fps frame (a tread takes 20 cm at once in the gameplay height, unchanged)', r.climbed > 0.5 && r.maxTreadInFrame > 0.15 && r.maxDrawnJerk < 0.08 && r.maxDrawnOffset <= 0.21 && !r.nan, r);
}


const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
