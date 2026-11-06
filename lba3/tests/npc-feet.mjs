// The other characters' feet (ANIM-POLISH-3): the townsfolk, the story's people and Vesk's guards plant their feet through the hero's
// own foot planting (src/engine/rig.js Rig._plant, enabled per body by Rig.plantIfFits: plantLite), played in chapter 1's Citadel:
//  1. which bodies plant: every body whose legs reach its held stance foot (legs ≥ 80 % of the hip's height); Baldino and the FunFrock
//     trooper keep the unplanted walk; every person and guard in the game is set up so, the hero (footPlant) is not touched;
//  2. each kind of body, the rig alone at its own walking speeds, at 30 / 60 / 120 fps: the foot it stands on stays where it struck
//     (the lower foot on the ground < 0.12 m/s; it slid 0.2-0.7 m/s unplanted), the leg reaches it; a stop ends in at most two steps,
//     planted within 0.45 s, none after 0.6 s; turning where it stands (to face someone) the feet step in turn instead of spinning
//     round with the body, a planted foot sliding < 3 cm; the stop let go at 16 phases of the gait, the same rules and one foot
//     at a time, and the turn at 8 idle clocks (the weight shift) (STOP-ROBUST);
//  3. the residents walking round Citadel in play: the same on the ground (< 0.15 m/s each), their stops at most two steps;
//  4. the depot guard: planted walk and stops on its patrol, and its gameplay frame for frame the same with or without planting
//     (position, facing, state, its blows on Twinsen), patrolling and fighting;
//  5. interruptions: a resident spoken to mid-walk, a guard hit and beaten mid-walk, the pause, a room change and back leave no NaN, no
//     stuck plant, no foot left behind;
//  6. only the people near the camera and in view plant (FarCull, PLANT_VIEW.r 30 m);
//  7. cost: Rig.update over the whole crowd, planting on and off (SwiftShader's CPU: ms, no fps claim).
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
await ev(async () => {
  const G = window.game; G.testFreeze = true;
  const talkAll = () => { for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); };
  talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); talkAll();
  const C = await import('./src/game/characters.js'), RG = await import('./src/engine/rig.js');
  const V = G.hero.pos.constructor;
  const wp = (o, v = new V()) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(v); };
  const ankle = (rig) => { const j = rig.j; return (rig.hipsRest + j.legL.hip.position.y + j.legL.knee.position.y + j.legL.foot.position.y) * rig.root.scale.y; };
  const dampAngle = (a, b, k, dt) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-k * dt));
  // a deterministic Math.random for the A/B runs
  const seeded = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  // the feet of one actor (or rig) this frame: world positions, height above its ground less its ankle, plant states
  const feet = (rig, groundY) => {
    const j = rig.j, ank = ankle(rig), L = wp(j.legL.foot), R = wp(j.legR.foot), F = rig._feet;
    return { L: [L.x, L.y - groundY - ank, L.z], R: [R.x, R.y - groundY - ank, R.z], sc: rig.root.scale.y,
      pl: F ? ['L', 'R'].map((s) => ({ on: F[s].on, st: F[s].stepping, w: F[s].w * F.w, reach: F[s].reach || 0 })) : null,
      nan: ![j.legL.hip, j.legR.hip, j.legL.knee, j.legR.knee, j.legL.foot, j.legR.foot, j.hips, j.torso].every((b) => [b.rotation.x, b.rotation.y, b.rotation.z].every(Number.isFinite)) };
  };
  // metrics on a list of samples { t, x, z, ang, anim, L, R, sc, pl }
  const M = {
    // the lower foot, within 2.5 cm (× scale) of standing height, while walking: how fast it moves on the ground
    contact(S, a = -1, b = 1e9) {
      let d = 0, time = 0, body = 0;
      for (let i = 1; i < S.length; i++) {
        const s = S[i], p = S[i - 1]; if (s.t <= a || s.t > b || s.anim !== 'walk' || p.anim !== 'walk') continue;
        body += Math.hypot(s.x - p.x, s.z - p.z);
        const k = s.L[1] < s.R[1] ? 'L' : 'R';
        if (s[k][1] <= 0.025 * s.sc && p[k][1] <= 0.025 * s.sc) { d += Math.hypot(s[k][0] - p[k][0], s[k][2] - p[k][2]); time += s.t - p.t; }
      }
      return { speed: time ? +(d / time).toFixed(3) : null, contactS: +time.toFixed(2), cmPerM: body ? +(100 * d / body).toFixed(1) : null };
    },
    steps(S, a, b) { const o = []; for (let i = 1; i < S.length; i++) if (S[i].t > a && S[i].t <= b && S[i].pl && S[i - 1].pl) for (const q of [0, 1]) if (S[i].pl[q].st && !S[i - 1].pl[q].st) o.push([q ? 'R' : 'L', +(S[i].t - a).toFixed(3)]); return o; },
    // a planted foot (on, not stepping, full weight, on the ground): how far it moves
    slide(S, a, b) { let cm = 0; for (let i = 1; i < S.length; i++) { const s = S[i], p = S[i - 1]; if (s.t <= a || s.t > b || !s.pl || !p.pl) continue; ['L', 'R'].forEach((k, q) => { if (!s.pl[q].on || s.pl[q].st || p.pl[q].st || s.pl[q].w < 0.99 || p.pl[q].w < 0.99 || s[k][1] > 0.02 * s.sc) return; cm += 100 * Math.hypot(s[k][0] - p[k][0], s[k][2] - p[k][2]); }); } return +cm.toFixed(1); },
    // the feet within 2 cm of the ground, whatever the plant says: how far they move (a body spinning on its feet drags them round)
    groundMove(S, a, b) { let cm = 0; for (let i = 1; i < S.length; i++) { const s = S[i], p = S[i - 1]; if (s.t <= a || s.t > b) continue; for (const k of ['L', 'R']) if (s[k][1] < 0.02 * s.sc && p[k][1] < 0.02 * s.sc) cm += 100 * Math.hypot(s[k][0] - p[k][0], s[k][2] - p[k][2]); } return +cm.toFixed(1); },
    settled(S, a) { const s = S.find((s) => s.t > a && s.pl && s.pl.every((q) => q.on && !q.st && q.w > 0.99) && s.L[1] < 0.02 * s.sc && s.R[1] < 0.02 * s.sc); return s ? +(s.t - a).toFixed(3) : null; },
    maxReach(S, a, b) { let m = 0; for (const s of S) if (s.t > a && s.t <= b && s.pl) for (const q of s.pl) if (q.on && q.w > 0.5) m = Math.max(m, q.reach); return +m.toFixed(3); },
  };
  // one body alone (not in the scene): stand, walk straight at v, stop, turn 180° the way a person turns to face someone (dampAngle 6),
  // then 90° to a set facing (4). The view gate is off for it (PLANT_VIEW.cam: nobody's camera).
  const body = (look, v, fps, plant = true, it = null) => {
    const dt = 1 / fps, rig = C.createCharacter(look), cam = RG.PLANT_VIEW.cam; RG.PLANT_VIEW.cam = null;
    if (plant) rig.plantIfFits(); else rig.plantLite = false;
    rig.fidgetT = 99;   // (no idle fidget in the measured windows)
    if (it != null) rig.t = it;   // (the idle clock, random otherwise: the weight shift it drives is swept in 2c)
    let x = 0, z = 0, ang = 0, t = 0; const S = [];
    const step = (anim, sp, target, k) => {
      if (target != null) ang = dampAngle(ang, target, k, dt);
      x += Math.sin(ang) * sp * dt; z += Math.cos(ang) * sp * dt;
      rig.root.position.set(x, 0, z); rig.root.rotation.y = ang;
      rig.play(anim); rig.update(dt, sp); rig.root.updateMatrixWorld(true); t += dt;
      S.push({ t, x, z, ang, anim, ...feet(rig, 0) });
    };
    for (let i = 0; i < Math.round(0.5 * fps); i++) step('idle', 0);
    const w0 = t; for (let i = 0; i < Math.round(3 * fps); i++) step('walk', v);
    const s0 = t; for (let i = 0; i < Math.round(1.2 * fps); i++) step('idle', 0);
    const u0 = t; for (let i = 0; i < Math.round(1.4 * fps); i++) step('idle', 0, Math.PI, 6);
    const u1 = t; for (let i = 0; i < Math.round(1.4 * fps); i++) step('idle', 0, Math.PI / 2, 4);
    RG.PLANT_VIEW.cam = cam;
    const st = M.steps(S, s0, s0 + 1.2), t180 = M.steps(S, u0, u1);
    return { look, v, fps, plant: rig.plantLite, legReach: +rig.legReach().toFixed(3), contact: M.contact(S, w0 + 1, s0), maxReach: M.maxReach(S, w0 + 1, s0),
      stopSteps: st, stopLate: M.steps(S, s0 + 0.6, s0 + 1.2).length, stopSettled: M.settled(S, s0), stopSlideCm: M.slide(S, s0, u0),
      // (in turn: alternating, but for one closing step as the turn dies away, when the standing rules square up the foot left behind)
      turn180: { steps: t180.length, seq: t180.map((s) => s.join('')).join(' '), alternate: t180.filter((s, i) => i && s[0] === t180[i - 1][0]).length <= 1 && t180.slice(0, -1).every((s, i) => !i || s[0] !== t180[i - 1][0]), slideCm: M.slide(S, u0, u1), groundMoveCm: M.groundMove(S, u0, u1) },
      turn90: { steps: M.steps(S, u1, t).length, slideCm: M.slide(S, u1, t), groundMoveCm: M.groundMove(S, u1, t) }, nan: S.some((s) => s.nan) };
  };
  window.NF = { G, C, RG, V, wp, feet, M, body, seeded, ankle, dampAngle };
});

// ---- 1. which bodies plant
{
  const r = await ev(() => {
    const { G, C } = NF, rows = {};
    for (const k of Object.keys(C.LOOKS)) { const rig = C.createCharacter(k); rows[k] = [+rig.legReach().toFixed(3), rig.plantIfFits()]; }
    const actors = [...G.npcs, ...G.enemies].filter((a) => a.rig?.j?.legL);
    const wrong = actors.filter((a) => a.rig.plantLite !== (a.rig.legReach() >= 0.8) || a.rig.footPlant).map((a) => a.name || a.id);
    return { fallback: Object.entries(rows).filter(([, v]) => !v[1]).map(([k, v]) => `${k} ${v[0]}`), nearest: Object.entries(rows).filter(([, v]) => v[1]).sort((a, b) => a[1][0] - b[1][0]).slice(0, 3).map(([k, v]) => `${k} ${v[0]}`),
      actors: actors.length, planted: actors.filter((a) => a.rig.plantLite).length, unplanted: actors.filter((a) => !a.rig.plantLite).map((a) => a.def?.char || a.def?.kind || a.constructor.name), wrong,
      hero: { footPlant: G.hero.rig.footPlant, plantLite: G.hero.rig.plantLite } };
  });
  measure('bodies', r);
  check('bodies: every look plants but Baldino and the FunFrock trooper (legs under 80 % of the hip height), which keep the unplanted walk', r.fallback.length === 2 && r.fallback.some((s) => /^baldino /.test(s)) && r.fallback.some((s) => /^fclone /.test(s)), r);
  check('bodies: every person and guard in the game is set up by its legs (plantLite), the hero keeps his own planting (footPlant, not plantLite)', r.wrong.length === 0 && r.planted > 40 && r.hero.footPlant === true && !r.hero.plantLite, r);
}

// ---- 2. each kind of body alone, 30 / 60 / 120 fps
const BODIES = [['zoe', 1.1], ['arthur', 1.6], ['tim', 1.6], ['joe', 1.1], ['pim', 1.3], ['sphero1', 1.1], ['bram', 1.1], ['xil', 1.1], ['lharWoman', 0.8], ['farmerA', 1.0], ['guard', 1.1], ['vguard', 1.4], ['vguard', 2.4], ['vguardG', 1.4], ['vguardG', 2.4]];
for (const fps of [60, 30, 120]) {
  const list = fps === 60 ? BODIES : BODIES.filter(([k, v]) => ['zoe', 'arthur', 'pim', 'sphero1'].includes(k) || (k === 'vguard' && v === 2.4));
  const R = await ev(([list, fps]) => list.map(([k, v]) => ({ on: NF.body(k, v, fps, true), off: NF.body(k, v, fps, false) })), [list, fps]);
  const rows = R.map(({ on, off }) => ({ body: `${on.look}@${on.v}`, slip: on.contact.speed, slipUnplanted: off.contact.speed, reach: on.maxReach, stop: on.stopSteps.map((s) => s.join('')).join(' '), settled: on.stopSettled, late: on.stopLate, stopSlide: on.stopSlideCm, t180: `${on.turn180.seq}: slide ${on.turn180.slideCm} cm, feet moved ${on.turn180.groundMoveCm} cm (unplanted ${off.turn180.groundMoveCm})`, t90: on.turn90.steps, nan: on.nan }));
  measure(`bodies ${fps} fps`, rows);
  const bad = (f) => R.filter(({ on, off }) => !f(on, off)).map(({ on }) => `${on.look}@${on.v}`);
  const b1 = bad((on, off) => on.plant && on.contact.speed != null && on.contact.speed < 0.12 && on.contact.contactS > 0.6 && (off.contact.speed == null || on.contact.speed < off.contact.speed) && on.maxReach < 1.15);
  check(`bodies ${fps} fps: walking, the foot each body stands on stays where it struck (the lower foot on the ground < 0.12 m/s, the leg reaches it)`, !b1.length, { bad: b1, rows });
  const b2 = bad((on) => on.stopSteps.length <= 2 && on.stopLate === 0 && on.stopSettled != null && on.stopSettled <= 0.45 && on.stopSlideCm < 3);
  check(`bodies ${fps} fps: a stop ends in at most two steps, both feet planted within 0.45 s, none after 0.6 s, no slide`, !b2.length, { bad: b2 });
  const b3 = bad((on, off) => on.turn180.steps >= 3 && on.turn180.alternate && on.turn180.slideCm < 3 && on.turn90.steps >= 2 && on.turn90.slideCm < 3 && on.turn180.groundMoveCm < off.turn180.groundMoveCm * 0.25 && !on.nan);
  check(`bodies ${fps} fps: turning where it stands (to face someone) the feet step in turn, a planted foot slides < 3 cm, they no longer spin round with the body`, !b3.length, { bad: b3 });
}

// ---- 2b. (STOP-ROBUST) the stop at every phase of the gait: each body above stops at one phase only (fixed by its walk's length; its
// idle clock is random), and some phases gave a late third step or a foot held in the air while the other stepped. Here the cycle is
// turned by k/N on the walk's first frame, N phases × 30 / 60 / 120 fps, the idle clock (the weight shift) alternating
{
  const N = 16;
  const R = await ev((N) => {
    const { C, RG, wp, ankle } = NF, out = [];
    const B = [['arthur', 1.6], ['zoe', 1.1], ['lharWoman', 1.15], ['desertTrader', 0.8], ['farmerA', 1.0], ['tim', 1.6], ['pim', 1.3], ['sphero1', 1.1], ['guard', 1.1], ['vguard', 1.4], ['vguard', 2.4], ['vguardG', 2.4]];
    const cam = RG.PLANT_VIEW.cam; RG.PLANT_VIEW.cam = null;
    try {
      for (const [look, v] of B) for (const fps of [30, 60, 120]) for (let k = 0; k < N; k++) {
        const dt = 1 / fps, rig = C.createCharacter(look); rig.plantIfFits(); rig.fidgetT = 99; rig.t = k % 2 ? 7 : 0.05;
        let z = 0; const sc = rig.root.scale.y, ank = ankle(rig);
        const step = (anim, sp) => { z += sp * dt; rig.root.position.set(0, 0, z); rig.root.rotation.y = 0; rig.play(anim); rig.update(dt, sp); rig.root.updateMatrixWorld(true); };
        for (let i = 0; i < Math.round(0.3 / dt); i++) step('idle', 0);
        for (let i = 0; i < Math.round(1.4 / dt); i++) { step('walk', v); if (!i) rig.phase += 2 * Math.PI * k / N; }
        const steps = [], last = {}, prev = { L: null, R: null }; let settled = null, bothOff = 0, slide = 0;
        for (let i = 1; i <= Math.round(0.9 / dt); i++) {
          step('idle', 0); const t = i * dt, F = rig._feet;
          const up = (s) => wp(rig.j['leg' + s].foot).y - ank;
          for (const s of ['L', 'R']) {
            const f = F[s], p = wp(rig.j['leg' + s].foot), held = f.on && !f.stepping && f.w * F.w > 0.99 && up(s) <= 0.02 * sc;
            if (f.stepping && !last[s]) steps.push([s, +t.toFixed(3)]); last[s] = f.stepping;
            if (held && prev[s]) slide += Math.hypot(p.x - prev[s].x, p.z - prev[s].z); prev[s] = held ? p : null;
          }
          if (['L', 'R'].every((s) => !F[s].on || F[s].stepping)) bothOff += dt;
          if (settled == null && ['L', 'R'].every((s) => F[s].on && !F[s].stepping && F[s].w * F.w > 0.99 && up(s) < 0.02 * sc)) settled = +t.toFixed(3);
        }
        out.push({ body: `${look}@${v}`, fps, k, steps, settled, bothOff: +bothOff.toFixed(3), slideCm: +(slide * 100).toFixed(1) });
      }
    } finally { RG.PLANT_VIEW.cam = cam; }
    return out;
  }, N);
  const bad = R.filter((r) => !(r.steps.length <= 2 && !r.steps.some((s) => s[1] > 0.6) && r.settled != null && r.settled <= 0.45 && r.bothOff <= 0.05 + 1e-6 && r.slideCm < 3));
  const most = (f) => Math.max(...R.map(f));
  measure('stop phase sweep', { stops: R.length, bad: bad.length, maxSteps: most((r) => r.steps.length), lastStep: most((r) => r.steps.length ? r.steps[r.steps.length - 1][1] : 0), maxSettled: most((r) => r.settled ?? 9), maxBothOff: most((r) => r.bothOff), maxSlideCm: most((r) => r.slideCm) });
  check(`bodies: the stop at ${N} phases of the gait × 30 / 60 / 120 fps, 12 bodies: every one in at most two steps, planted within 0.45 s, none after 0.6 s, one foot at a time (both off the ground ≤ 0.05 s), no slide`, bad.length === 0, { bad: bad.slice(0, 8) });
}

// ---- 2c. (STOP-ROBUST) the turn where it stands at different idle clocks: the clock is random per body (Rig's t), and the idle's weight
// shift it drives tilted the pelvis enough that a short-legged body (the Spheros) stood on a foot hanging in the air and took two
// closing steps after the turn (the same foot twice), at some clocks only. Each body's whole run above, at 8 clocks × 30 / 60 / 120 fps
{
  const R = await ev(() => {
    const B = [['sphero1', 1.1], ['arthur', 1.6], ['zoe', 1.1], ['pim', 1.3], ['bram', 1.1], ['vguardG', 1.4]], out = [];
    for (const [k, v] of B) for (const fps of [30, 60, 120]) for (let i = 0; i < 8; i++) {
      const on = NF.body(k, v, fps, true, i * 2.5);
      out.push({ body: `${k}@${v}`, fps, it: i * 2.5, t180: on.turn180.seq, alternate: on.turn180.alternate, slide180: on.turn180.slideCm, t90: on.turn90.steps, slide90: on.turn90.slideCm, stop: on.stopSteps.length, late: on.stopLate, settled: on.stopSettled,
        ok: on.turn180.steps >= 3 && on.turn180.alternate && on.turn180.slideCm < 3 && on.turn90.steps >= 2 && on.turn90.slideCm < 3 && !on.nan && on.stopSteps.length <= 2 && on.stopLate === 0 && on.stopSettled != null && on.stopSettled <= 0.45 });
    }
    return out;
  });
  const bad = R.filter((r) => !r.ok), most = (f) => Math.max(...R.map(f));
  measure('turn idle-clock sweep', { runs: R.length, bad: bad.length, notAlternating: R.filter((r) => !r.alternate).length, maxSlide180: most((r) => r.slide180), maxSlide90: most((r) => r.slide90) });
  check('bodies: turning where it stands at 8 idle clocks × 30 / 60 / 120 fps, 6 bodies: the feet step in turn (at most one closing step), a planted foot slides < 3 cm; the stop before it as above', bad.length === 0, { bad: bad.slice(0, 8) });
}

// ---- 3. the residents walking round Citadel in play (every resident simulated in full, 60 fps)
{
  const r = await ev(() => {
    const { G, M, feet } = NF, W = G.walkers, dt = 1 / 60;
    const res = W.res.filter((q) => q.present && q.stops.length && Math.abs(q.stops[0].x) < 300);
    const run = (secs, plant) => {
      for (const q of res) { q.rig.plantLite = plant ? q.rig.legReach() >= 0.8 : false; q.rig.fidgetT = 99; }
      const S = new Map(); W.force = 0;
      for (let i = 0; i < secs / dt; i++) {
        G.frame(dt, false);
        const cam = G.camera.position;
        for (const q of res) { if (!q.present || q.inside || q.away) continue; let a = S.get(q); if (!a) S.set(q, (a = [])); a.push({ t: i * dt, x: q.pos.x, z: q.pos.z, ang: q.angle, anim: q.rig.anim, cd: Math.hypot(q.pos.x - cam.x, q.pos.z - cam.z), ...feet(q.rig, q.pos.y) }); }
      }
      W.force = null;
      const out = {};
      for (const [q, a] of S) {
        const near = a.filter((s) => s.cd < 28);
        const c = M.contact(near);
        // stops into standing (idle / talk / listen for the next second), near the camera
        const stops = [];
        for (let i = 1; i < a.length; i++) if (a[i - 1].anim === 'walk' && a[i].anim !== 'walk' && a[i].cd < 28) { const w = a.slice(i, i + 60); if (w.length === 60 && w.every((s) => /idle|talk|listen/.test(s.anim))) stops.push(M.steps(a, a[i].t - 1e-6, a[i].t + 1).length); }
        out[q.def.id] = { walkS: +(a.filter((s) => s.anim === 'walk').length * dt).toFixed(1), slip: c.speed, contactS: c.contactS, cmPerM: c.cmPerM, stops, nan: a.some((s) => s.nan) };
      }
      return out;
    };
    const on = run(24, true), off = run(12, false);
    for (const q of res) q.rig.plantLite = q.rig.legReach() >= 0.8;
    return { on, off };
  });
  measure('residents in play', r);
  const near = Object.entries(r.on).filter(([, v]) => v.contactS >= 0.5);
  check('residents in play: each one walking near the camera keeps its stance foot on the ground (< 0.15 m/s), at least two seen', near.length >= 2 && near.every(([, v]) => v.slip < 0.15), near);
  check('residents in play: their stops into standing take at most two steps; no NaN', Object.values(r.on).every((v) => v.stops.every((n) => n <= 2) && !v.nan) && Object.values(r.on).some((v) => v.stops.length), r.on);
}

// ---- 4. the depot guard: planted patrol, and the same gameplay with or without planting
{
  const r = await ev(() => {
    const { G, M, feet, RG, seeded } = NF, h = G.hero, dt = 1 / 60;
    const gd = G.enemies.find((e) => e.id === 'guard1' && e.present) || G.enemies.find((e) => e.constructor.name === 'Guard' && e.present);
    if (!gd) return { none: true };
    const keys = Object.keys(gd).filter((k) => !['rig', 'game', 'shadow', 'rifle', 'aimLine', 'def', 'patrol', 'ko'].includes(k));
    const save = () => { const o = {}; for (const k of keys) { const v = gd[k]; o[k] = v && typeof v === 'object' ? (v.clone ? v.clone() : JSON.parse(JSON.stringify(v))) : v; } return { o, hp: h.hp, hpos: h.pos.clone(), inv: h.invuln, hurt: h.hurtT, kb: h.kb.clone() }; };
    const load = (s) => { for (const k of keys) { const v = s.o[k]; gd[k] = v && typeof v === 'object' ? (v.clone ? v.clone() : JSON.parse(JSON.stringify(v))) : v; } h.hp = s.hp; h.pos.copy(s.hpos); h.invuln = s.inv; h.hurtT = s.hurt; h.kb.copy(s.kb); };
    const cam = RG.PLANT_VIEW.cam; RG.PLANT_VIEW.cam = null;   // (the guard far from the camera: planted for the measure)
    const fits = gd.rig.plantLite;
    // play the guard alone (its own update; the hero stands still), recording what the game sees of it every frame
    const play = (secs, plant, sample) => {
      gd.rig.plantLite = plant && fits; gd.rig.fidgetT = 99; const rnd = Math.random; Math.random = seeded(7);
      const T = [], S = [];
      try {
        for (let i = 0; i < secs / dt; i++) {
          gd.update(dt);
          T.push([+gd.pos.x.toFixed(6), +gd.pos.z.toFixed(6), +gd.angle.toFixed(6), gd.state, gd.hp, h.hp, gd.wp, +(gd.coolT || 0).toFixed(4)].join(','));
          if (sample) S.push({ t: i * dt, x: gd.pos.x, z: gd.pos.z, ang: gd.angle, anim: gd.rig.anim, ...feet(gd.rig, gd.pos.y) });
        }
      } finally { Math.random = rnd; }
      return { T, S };
    };
    const out = {};
    // a) its patrol (Twinsen far off)
    const hp0 = h.pos.clone(); h.pos.set(gd.pos.x + 60, G.physics.groundAt(gd.pos.x + 60, gd.pos.z + 60), gd.pos.z + 60);
    const s0 = save();
    const A = play(14, true, true); load(s0); const B = play(14, false, true); load(s0);
    const diff = (X, Y) => { const i = X.T.findIndex((v, n) => v !== Y.T[n]); return i < 0 ? null : { frame: i, on: X.T[i], off: Y.T[i] }; };
    const stopsA = []; for (let i = 1; i < A.S.length; i++) if (A.S[i - 1].anim === 'walk' && A.S[i].anim === 'idle') stopsA.push(M.steps(A.S, A.S[i].t - 1e-6, A.S[i].t + 1).length);
    out.patrol = { differs: diff(A, B), walkS: +(A.S.filter((s) => s.anim === 'walk').length * dt).toFixed(1), slip: M.contact(A.S).speed, slipUnplanted: M.contact(B.S).speed, stops: stopsA, nan: A.S.some((s) => s.nan) };
    // b) a fight: Twinsen 5 m in front of it, standing (it sees him, closes in, aims, fires, winds up and strikes)
    { const x = gd.pos.x + Math.sin(gd.angle) * 5, z = gd.pos.z + Math.cos(gd.angle) * 5; h.pos.set(x, G.physics.groundAt(x, z), z); } h.hp = h.maxHp; h.invuln = 0;
    gd.waitT = 0; gd.alert(h.pos);   // (it has seen him: it turns, closes in, aims, fires, strikes)
    const s1 = save();
    const C1 = play(12, true, false); load(s1); const D1 = play(12, false, false); load(s1);
    out.fight = { differs: diff(C1, D1), states: [...new Set(C1.T.map((v) => v.split(',')[3]))], heroHp: C1.T[C1.T.length - 1].split(',')[5] };
    gd.rig.plantLite = fits; RG.PLANT_VIEW.cam = cam; h.pos.copy(hp0); h.hp = h.maxHp; gd.state = 'patrol'; G.combatDir?.reset?.();
    return out;
  });
  measure('depot guard', r);
  check('depot guard: on its patrol its stance foot stays on the ground (< 0.12 m/s; unplanted it slid), its stops at most two steps', !r.none && r.patrol.walkS > 3 && r.patrol.slip < 0.12 && (r.patrol.slipUnplanted == null || r.patrol.slipUnplanted > r.patrol.slip) && r.patrol.stops.every((n) => n <= 2) && !r.patrol.nan, r.patrol);
  check('depot guard: its gameplay is frame for frame the same with or without planting (place, facing, state, hit points, waypoint, cooldown, its blows on Twinsen), patrolling and fighting', !r.none && r.patrol.differs === null && r.fight.differs === null && r.fight.states.length >= 3, r);
}

// ---- 5. interruptions
{
  const r = await ev(() => {
    const { G, RG } = NF, h = G.hero, W = G.walkers, dt = 1 / 60, out = {};
    const planted = (rig) => { const F = rig._feet; return !!F && F.L.on && F.R.on && !F.L.stepping && !F.R.stepping && F.L.w * F.w > 0.99 && F.R.w * F.w > 0.99; };
    const finite = (rig) => { const j = rig.j; return [j.legL.hip, j.legR.hip, j.legL.knee, j.legR.knee, j.hips, j.torso].every((b) => [b.rotation.x, b.rotation.y, b.rotation.z, b.position.y].every(Number.isFinite)); };
    const footGap = (q) => { const v = new NF.V(); let m = 0; for (const f of [q.rig.j.legL.foot, q.rig.j.legR.foot]) { NF.wp(f, v); m = Math.max(m, Math.hypot(v.x - q.pos.x, v.z - q.pos.z)); } return +m.toFixed(3); };
    const cam = RG.PLANT_VIEW.cam; RG.PLANT_VIEW.cam = null;
    W.force = 0;
    const res = W.res.filter((q) => q.present && q.rig.plantLite && q.stops.length && Math.abs(q.stops[0].x) < 300);
    // a) a resident spoken to mid-walk: it stops, turns to him and stands planted; let go, it walks on
    let q = null; for (let i = 0; i < 1200 && !q; i++) { G.frame(dt, false); q = res.find((x) => x.st === 'walk' && x.rig.anim === 'walk' && x.gait > 0.5 && !x.inside); }
    if (q) {
      h.pos.set(q.pos.x + 2, q.pos.y, q.pos.z + 1); q.engage(); let at = null;
      for (let i = 0; i < 90; i++) { G.frame(dt, false); if (at == null && i > 6 && planted(q.rig)) at = +(i * dt).toFixed(3); }
      q.release(); let walked = false; for (let i = 0; i < 360 && !walked; i++) { G.frame(dt, false); walked = q.rig.anim === 'walk'; }
      out.talk = { who: q.def.id, plantedAfter: at, walksOn: walked, finite: finite(q.rig), footGap: footGap(q) };
    }
    // b) the pause: nobody's feet move
    const snap = () => JSON.stringify(res.map((x) => [x.rig.j.legL.hip.rotation.x, x.rig.j.legR.knee.rotation.x, x.rig._feet?.L.u, x.rig._feet?.R.u]));
    G.frame(dt, false); const st0 = G.state; G.state = 'pause'; const p0 = snap(); for (let i = 0; i < 30; i++) G.frame(dt, false); out.pauseFrozen = snap() === p0; G.state = st0;
    // c) a room and back: no foot left where it stood before
    const back = { x: h.pos.x, z: h.pos.z, a: h.angle };
    G.enterRoom('house', null, true); G.step(0.5); for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    G.exitRoom(back, true, true); G.step(0.5); for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    for (let i = 0; i < 60; i++) G.frame(dt, false);
    out.room = { state: G.state, worstFootGap: Math.max(...res.filter((x) => x.present && !x.inside && !x.sit && x.st !== 'seated').map(footGap)), finite: res.every((x) => finite(x.rig)) };
    W.force = null;
    // d) the guard hit mid-walk, then beaten mid-walk
    const gd = G.enemies.find((e) => e.constructor.name === 'Guard' && e.present && e.alive && e.rig.plantLite);
    if (gd) {
      h.pos.set(gd.pos.x + 60, h.pos.y, gd.pos.z + 60);
      let i = 0; for (; i < 600 && gd.rig.anim !== 'walk'; i++) { gd.update(dt); } for (let k = 0; k < 20; k++) gd.update(dt);
      const walking = gd.rig.anim === 'walk';
      gd.take(1, { x: gd.pos.x + Math.sin(gd.angle) * 2, z: gd.pos.z + Math.cos(gd.angle) * 2 });
      for (let k = 0; k < 45; k++) gd.update(dt);
      const hitOk = finite(gd.rig);
      // back on its feet: standing again, planted (the state back to chase or patrol; it stands once it has nowhere to go)
      gd.state = 'patrol'; gd.waitT = 2; let at = null; for (let k = 0; k < 60; k++) { gd.update(dt); if (at == null && planted(gd.rig)) at = +(k * dt).toFixed(3); }
      for (let k = 0; k < 200 && gd.rig.anim !== 'walk'; k++) gd.update(dt);
      gd.take(99, { x: gd.pos.x + Math.sin(gd.angle) * 2, z: gd.pos.z + Math.cos(gd.angle) * 2 });
      let wGone = null; for (let k = 0; k < 120; k++) { gd.update(dt); if (wGone == null && !(gd.rig._feet?.w > 0)) wGone = +(k * dt).toFixed(3); }
      out.guard = { walking, hitFinite: hitOk, plantedAfterHit: at, koUnplantedAfter: wGone, koFinite: finite(gd.rig), anim: gd.rig.anim };
    }
    RG.PLANT_VIEW.cam = cam;
    return out;
  });
  measure('interruptions', r);
  check('interruptions: a resident spoken to mid-walk stands planted within 0.6 s, walks on when let go', r.talk && r.talk.plantedAfter != null && r.talk.plantedAfter <= 0.6 && r.talk.walksOn && r.talk.finite && r.talk.footGap < 0.8, r.talk);
  check('interruptions: the pause freezes every resident\'s feet; through a room and back no foot is left behind (each within 0.8 m of its body), no NaN', r.pauseFrozen && r.room.state === 'play' && r.room.worstFootGap < 0.8 && r.room.finite, r);
  check('interruptions: the guard hit mid-walk (no NaN, planted again within 0.6 s of standing) and beaten mid-walk (its fall keeps its own legs: unplanted within 0.15 s, no NaN)', r.guard && r.guard.walking && r.guard.hitFinite && r.guard.plantedAfterHit != null && r.guard.plantedAfterHit <= 0.6 && r.guard.koUnplantedAfter != null && r.guard.koUnplantedAfter <= 0.15 && r.guard.koFinite, r.guard);
}

// ---- 6. only near the camera and in view (rendered frames: FarCull marks the view)
{
  const r = await ev(() => {
    const { G, RG } = NF, cam = G.camera.position, W = G.walkers, h = G.hero;
    // Twinsen a few metres from a resident (the camera follows him), everyone posed every frame (walkers.force)
    const q = W.res.find((x) => x.present && !x.inside && !x.sit && x.rig.plantLite && /^(walk|idle)$/.test(x.rig.anim) && Math.abs(x.stops[0]?.x ?? 999) < 300);
    if (q) { const x = q.pos.x + 3, z = q.pos.z + 3; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.atan2(q.pos.x - x, q.pos.z - z); }
    W.force = 0;
    for (let i = 0; i < 30; i++) G.frame(1 / 60, false);
    const all = [...G.npcs, ...G.enemies].filter((a) => a.rig?.plantLite), t0 = new Map(all.map((a) => [a, a.rig.t]));
    for (let i = 0; i < 20; i++) G.frame(1 / 60, true);
    W.force = null;
    // (only the rigs posed in these frames: a person standing in another scene is not posed at all, and keeps what it had)
    const rows = all.filter((a) => a.rig.t !== t0.get(a) && a.present !== false && a.rig.root.visible !== false && !a.inside).map((a) => ({ id: a.name || a.id, d: +Math.hypot(a.pos.x - cam.x, a.pos.y - cam.y, a.pos.z - cam.z).toFixed(1), inView: a.rig.inView, w: +(a.rig._feet?.w || 0).toFixed(2), anim: a.rig.anim }));
    const standing = rows.filter((x) => /idle|talk|listen|walk/.test(x.anim));
    return { r: RG.PLANT_VIEW.r, far: standing.filter((x) => x.d > RG.PLANT_VIEW.r + 1), near: standing.filter((x) => x.d < RG.PLANT_VIEW.r - 1 && x.inView) };
  });
  measure('view gate', { r: r.r, far: r.far.length, near: r.near.length, farPlanted: r.far.filter((x) => x.w > 0), nearUnplanted: r.near.filter((x) => x.w < 0.5) });
  check('view gate: nobody beyond 30 m of the camera plants its feet; the people near and in view do', r.far.length > 0 && r.far.every((x) => x.w === 0) && r.near.length > 0 && r.near.filter((x) => x.w > 0.5).length >= Math.ceil(r.near.length * 0.8), r);
}

// ---- 7. cost: Rig.update over the crowd, planting on and off (rendered frames, so the view gate is as in play)
{
  const r = await ev(() => {
    const { G, RG } = NF, proto = RG.Rig.prototype, orig = proto.update;
    let acc = 0, n = 0, pl = 0;
    proto.update = function (dt, sp) { if (this === G.hero.rig) return orig.call(this, dt, sp); const t0 = performance.now(); orig.call(this, dt, sp); acc += performance.now() - t0; n++; if (this.plantLite && this._feet?.w > 0) pl++; };
    const actors = [...G.npcs, ...G.enemies].filter((a) => a.rig?.j?.legL), fits = new Map(actors.map((a) => [a, a.rig.plantLite]));
    const run = (frames, render, on) => {
      for (const [a, f] of fits) a.rig.plantLite = on ? f : false;
      const T = [], N = [], P = [];
      for (let i = 0; i < frames; i++) { acc = 0; n = 0; pl = 0; G.frame(1 / 60, render); T.push(acc); N.push(n); P.push(pl); }
      const q = (x, f) => [...x].sort((a, b) => a - b)[Math.floor(x.length * f)];
      return { median: +q(T, 0.5).toFixed(3), p95: +q(T, 0.95).toFixed(3), rigs: q(N, 0.5), planted: q(P, 0.5) };
    };
    G.walkers.force = 0;
    try {
      // (rendered frames are slow on SwiftShader: 2 × 30 each way with the view gate as in play; 2 × 150 unrendered, the distance gate only)
      run(5, true, true);
      const out = { on: [], off: [], onNoView: [], offNoView: [] };
      for (let k = 0; k < 2; k++) { out.on.push(run(30, true, true)); out.off.push(run(30, true, false)); out.onNoView.push(run(150, false, true)); out.offNoView.push(run(150, false, false)); }
      const r0 = RG.PLANT_VIEW.r; RG.PLANT_VIEW.r = 1e6; out.allPlanted = run(150, false, true); out.allOff = run(150, false, false); RG.PLANT_VIEW.r = r0;
      return out;
    } finally { for (const [a, f] of fits) a.rig.plantLite = f; G.walkers.force = null; proto.update = orig; }
  });
  measure('cost (Rig.update, all characters but the hero, ms per frame, SwiftShader CPU)', r);
  const mid = (L) => L.map((x) => x.median).sort((a, b) => a - b)[0];
  const on = Math.min(mid(r.on), mid(r.onNoView)), off = Math.min(mid(r.off), mid(r.offNoView));
  check('cost: planting the people near the camera adds under 1.0 ms per frame to Rig.update over the whole crowd (median, CPU); every one of them planted at once under 2.0 ms', on - off < 1.0 && r.allPlanted.median - r.allOff.median < 2.0, { on, off, all: [r.allPlanted.median, r.allOff.median] });
}

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
