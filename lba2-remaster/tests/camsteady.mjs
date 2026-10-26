// CAM-2: the play camera stays calm (the user, 2026-10-20: "the camera doesn't work very well — it moves a lot").
// Repeatable routes walked by input (tests/lib/player.js, Classic controls unless named) on Citadel, recorded every frame
// by tests/lib/camrec.js: where the camera stands and looks, and which of its rules moved it. All three camera settings: the
// LBA follow (remaster), the free orbit and Follow (CAM-FOLLOW: a chase camera, its own budgets). Measured per route (CR.stats):
//   turnPerM    how far the view turns (°) per metre Twinsen walks — LBA2's view keeps its angle while it follows
//   revYaw/revPitch/revY/revDist   reversals per minute of the view's heading, tilt (≥ 0.5°), the camera's height
//               (≥ 5 cm) and its distance from him (≥ 10 cm): oscillation, rules undoing each other
//   stillTurnDeg / stillMove       the view turning / moving while he stands or turns on the spot
//   snaps       frames where the camera jumps > 0.6 m or turns > 10° (scene changes left out)
//   angAccP95 / accP95             the view's angular jolts (°/s²) and the camera's acceleration (m/s²)
//   maxPitch / steepT              the steepest the view looked down (°) and how long steeper than 50° (s)
//   revHero     reversals per minute of Twinsen's own facing (≥ 0.5°): what a camera that turns with him follows
//   jitterPitch / jitterY          tilt / height reversals within 0.5 s of the one before (a bob, a shudder)
//   idleTurnDeg / idleMove         the view turning / moving once he has stood a second without turning
//   pitchPerMin / yawPerMin        how far the view tilted / turned (° a minute); joltsPerMin: frames > 40 m/s²
// A shake's tremor is feedback, not the camera's rules: its frames are left out (shakeT). RECORD=<dir> writes every
// route's stats and trace as JSON; ONLY=<route name substring>, MODES=lba,free, RATES=60,30,jank (jank: 60 fps with a
// 0.1 s frame every 15th, split the way Game.advance splits it). The same routes run against an older build (its
// GAME_URL) give the "before" (no rule breakdown there). Budgets: BUDGET below (QA.md "CAM-2").
import { launch, open, menu, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const CAMREC = fileURLToPath(new URL('./lib/camrec.js', import.meta.url));
const { check, done } = checker();
const RECORD = process.env.RECORD, ONLY = process.env.ONLY, MODES = (process.env.MODES || 'lba,free,follow').split(',');

const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: CAMREC });
await page.evaluate(() => {
  const G = game, rig = G.camRig, h = G.hero, I = G.input;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true }); h.hasBall = true;
  window.R = {
    mode(m) { G.settings.camera = m === 'free' || m === 'follow' ? m : 'lba'; rig.setMode(G.settings.camera); rig.cut = false; },
    // a scene start at a spot (as a load or a door would): the camera's fresh shot, then a second to settle
    place(x, z, a) { G.exitRoom({ x, z, a }, true, true); G.step(0.3); h.angle = a; h.vel.set(0, 0); h.resetMotion?.(); rig.lba.init = false; rig.snap(); G.step(1.0); },
    walk(pts, o = {}) { const res = []; for (const [x, z] of pts) res.push(P.go(x, z, { tol: 0.8, maxT: 40, fight: false, ...o }).r); P.release(); return res; },
    // Modern controls: hold the arrow pair whose camera-relative direction is nearest the way to the next waypoint
    modernGo(tx, tz, maxT = 30) {
      const plan = P.plan(tx, tz, { tol: 0.5 }); let wi = 1, t = 0, prev = null;
      const dirs = [[0, 1, ['ArrowUp']], [1, 1, ['ArrowUp', 'ArrowRight']], [1, 0, ['ArrowRight']], [1, -1, ['ArrowDown', 'ArrowRight']], [0, -1, ['ArrowDown']], [-1, -1, ['ArrowDown', 'ArrowLeft']], [-1, 0, ['ArrowLeft']], [-1, 1, ['ArrowUp', 'ArrowLeft']]];
      while (t < maxT && Math.hypot(h.pos.x - tx, h.pos.z - tz) > 0.8) {
        while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < 0.6) wi++;
        const w = plan.pts[Math.min(wi, plan.pts.length - 1)], dx = w.x - h.pos.x, dz = w.z - h.pos.z;
        // (CAM-FOLLOW: the keys it holds keep the heading they were pressed under, h.refYaw — actors.js inputYaw; under the
        // other cameras that is the view's own. A new choice reads the view as it is now.)
        let best = null, bv = -2, held = -2;
        for (const [mx, my, keys] of dirs) {
          const yaw = keys === prev && h.refYaw != null ? h.refYaw : rig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const L = Math.hypot(mx, my), wx = (rx * mx + fx * my) / L, wz = (rz * mx + fz * my) / L, v = (wx * dx + wz * dz) / Math.hypot(dx, dz);
          if (v > bv) { bv = v; best = keys; } if (keys === prev) held = v;
        }
        // (CAM-FOLLOW: under the Follow camera the view turns with him, so a bot that changes keys whenever another 45°
        // step points a little better zigzags between two of them and rocks the view with it. A player holds a direction
        // while it is still about right: under Follow the bot keeps its keys while they point within 25° of the way)
        if (rig.mode === 'follow' && prev && held > Math.cos((25 * Math.PI) / 180)) best = prev;
        prev = best;
        I.keys.clear(); for (const k of best) I.keys.add(k);
        G.step(1 / 30); t += 1 / 30;
      }
      P.release();
      return t < maxT ? 'arrived' : 'timeout';
    },
    hold(keys, s) { for (const k of keys) { I.keys.add(k); I.taps.add(k); } G.step(s); for (const k of keys) I.keys.delete(k); },
  };
});

// [name, function body run in the page (R, P, G in scope); returns notes]
const ROUTES = [
  // (WORLD-80: the west street to the stepping stones now goes round Bug Street's pair, whose two houses stand where
  // the old line ran (-58, -6 → -66, -18), and the one house of before stood where the pair's north house stands now (its
  // west wall was the x = -61.5 leg below): both routes follow the new line, the pair's front and its north side)
  ['street and square', `R.place(-38, 4, Math.PI); return R.walk([[-42, -4], [-50, -6], [-58, -6], [-54.8, -12.6], [-55.2, -19.2], [-66, -20.6], [-56, -9], [-44, -5], [-36, 3]]);`],
  ['along house walls', `R.place(-55, 19.2, Math.PI / 2); return R.walk([[-42.7, 19.2], [-42.7, 25], [-44.5, 29.5], [-53, 29.5], [-54.2, 19.4], [-54.8, -11], [-54.8, -19.3], [-64.5, -19.6]]);`],
  ['through a door in and out', `const d = G.story.doors().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4) || G.story.townDoors?.().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4);
    R.place(d.x + 6, d.z - 3, -Math.PI / 2); const a = P.through(d.x, d.z); G.step(1.5); const e = G.room?.exits?.find((x) => !x.room) || G.room?.exits?.[0]; const b = e ? P.through(e.x, e.z) : { r: 'no exit' }; G.step(0.5);
    return [a.to, b.to, ...R.walk([[d.x + 4, d.z - 5], [d.x + 8, d.z - 10]])];`],
  // BUILD109_REVIEW §6: out of Twinsen's house (he faces away from it, so behind him is over its roof): the view he gets
  // on the first frame out, and how long it stays steeper than 45° while he stands 2 s and walks away
  ['out of the house door (the view on the way out)', `const d = G.story.doors().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4) || G.story.townDoors?.().find((q) => Math.hypot(q.x + 46.1, q.z - 77.2) < 4);
    R.place(d.x + 2.5, d.z, -Math.PI / 2); P.through(d.x, d.z); G.step(1.0); const e = G.room?.exits?.find((x) => !x.room) || G.room?.exits?.[0];
    const n0 = CR.F.length; P.through(e.x, e.z); G.step(2); const w = R.walk([[d.x + 6, d.z - 1]]);
    const F = CR.F.slice(n0).filter((f) => f.room === 'citadel' && f.st === 'play'), pd = (f) => -Math.asin(f.f[1]) * 57.3;
    const first = F[0] ? pd(F[0]) : -1, steep = F.filter((f) => pd(f) > 45).reduce((s, f) => s + f.dt, 0);
    return ['first view out ' + first.toFixed(1) + '°', 'steeper than 45° for ' + steep.toFixed(2) + ' s', 'max ' + Math.max(...F.map(pd)).toFixed(1) + '°', ...w];`],
  ['harbour pier', `R.place(-88, 37.5, -Math.PI / 2); return R.walk([[-100, 38.5], [-107.5, 39], [-113.5, 44], [-122, 44.5], [-112, 41], [-100, 38]]);`],
  ['near cliffs (the bay to the lighthouse)', `R.place(-46, 72, -Math.PI / 2); return R.walk([[-58, 73], [-70, 88], [-86, 93], [-100, 97], [-90, 92]]);`],
  ['standing, turning on the spot, short corrections', `R.place(-44, 44, Math.PI); G.step(3); R.hold(['ArrowLeft'], 2.5); R.hold(['ArrowRight'], 1.5); G.step(1);
    for (let i = 0; i < 4; i++) { R.hold(['ArrowUp'], 0.3); G.step(0.4); } for (let i = 0; i < 3; i++) { R.hold(['ArrowUp', i % 2 ? 'ArrowLeft' : 'ArrowRight'], 0.6); R.hold(['ArrowUp'], 0.5); } G.step(2); return [];`],
  ['combat (four mites in the fields)', `R.place(-45, 48, Math.PI); const ms = G.enemies.filter((e) => e.id?.startsWith('mite')).slice(0, 4);
    ms.forEach((e, i) => { const x = -45 + (i - 1.5) * 3, z = 40 - (i % 2) * 2; e.pos.set(x, G.physics.groundAt(x, z), z); e.home = { x, z }; e.setPresent(true); e.state = 'chase'; e.hp = e.maxHp; });
    const f = P.fight({ maxT: 40, range: 8 }); G.step(1.5); return [JSON.stringify(f)];`],
  ['street, Modern controls', `G.settings.controls = 'modern'; R.place(-38, 4, Math.PI); const r = [[-42, -4], [-58, -6], [-66, -18], [-50, -8], [-38, 2]].map(([x, z]) => R.modernGo(x, z)); G.settings.controls = 'classic'; return r;`],
];

// The budgets (QA.md "CAM-2": before → after on these routes). The LBA follow: never a jolt (> 40 m/s²), never looking
// down steeper than 50° (the rise stops at 48° and turns the view instead), no oscillation (≤ 8 reversals a minute of
// heading, tilt or height), still while he stands or turns on the spot, and out of the house door a normal view at
// once. The free orbit: no jolts to speak of, no turning by itself under camera-relative controls, still while he
// stands. (A shake's tremor is left out: CR.stats.)
function BUDGET(mode, name, s, notes) {
  const out = [], b = (what, ok) => out.push([what, ok]);
  if (s.dur < 3) return [['recorded', false]];
  if (mode === 'follow') {
    // CAM-FOLLOW: the Follow camera became a chase camera behind his back (the user on build 169). It turns with him by
    // design — a turn on the spot, a fight turning him round, a walk round a corner — so the LBA view's stillness while
    // he turns and its 40 m/s² ceiling on the camera's acceleration measure the design, not discomfort: 7 m out, a turn
    // at LBA2's 100°/s alone moves the camera at 12 m/s, and the turn's start accelerates it past 100 m/s². Its arm drawn
    // in at a house turns the tilt, and its height follows the ground as it swings round him, so the LBA view's 8
    // reversals a minute would count every house he passes. What a player would feel instead, measured here:
    b(`the view never jumps round (max ${s.maxTurnStepDeg}° a frame ≤ 10°)`, s.maxTurnStepDeg <= 10);
    b(`the camera never jumps but for its arm cut in toward him past a corner (max ${s.maxStep} m a frame ≤ 1.5)`, s.maxStep <= 1.5);
    // (his back to a wall under the eaves — a house door — it looks down over his shoulder, ~60-70°, for the step it
    // takes him to walk clear; the LBA view turns to a side heading there instead, which a chase camera cannot)
    b(`never steeper than over his shoulder (max ${s.maxPitch}° ≤ 72°; ${s.steepT} s over 50° ≤ 2 s)`, s.maxPitch <= 72 && s.steepT <= 2);
    b(`it turns only as he turns (heading reversals ${s.revYaw}/min ≤ his own ${s.revHero}/min)`, s.revYaw <= s.revHero + 1);
    // (a jitter is a shudder, several bobs a second; walking the town past houses the arm draws in at a corner and the
    // ground under it rises and falls as it swings round him, now and then a rise and fall in under 0.5 s: with the
    // Medium arm (8.75 m, CAM-FOLLOW's distance setting) about one every 30 s on the town routes — allowed, at least 3)
    { const j = Math.max(3, Math.ceil(s.dur / 30)); b(`no jitter on steps, slopes or walls (tilt and height reversals within 0.5 s of the last: ${s.jitterPitch}, ${s.jitterY} ≤ ${j}; a minute: ${s.revPitch}, ${s.revY})`, s.jitterPitch <= j && s.jitterY <= j); }
    // (standing, its arm may still let out slowly along its line to him after a wall: up to a metre)
    // (standing, its arm may still let out slowly along its line to him after a wall: up to a metre; with a lock-on the
    // view follows the target's own moves: up to 3°)
    if (s.idleT > 0.5) b(`still behind him once he has stood a second without turning (turned ${s.idleTurnDeg}° ≤ 3, moved ${s.idleMove} m ≤ 1 in ${s.idleT} s)`, s.idleTurnDeg <= 3 && s.idleMove <= 1);
    if (name.startsWith('out of the house')) { const f = parseFloat(String(notes[0]).replace('first view out ', '')), st = parseFloat(String(notes[1]).replace(/^steeper than 45° for /, '')); b(`out of the door behind his back at once, over his shoulder (20..72°) until he has walked clear (${notes.slice(0, 3).join(', ')}; ≤ 1.5 s over 45°)`, f >= 20 && f <= 72 && st <= 1.5); }
  } else if (mode === 'lba') {
    b(`no jolt (camera acceleration max ${s.accMax} ≤ 40 m/s²)`, s.accMax <= 40 && s.joltsPerMin === 0);
    b(`never steep (max ${s.maxPitch}° ≤ 50°, ${s.steepT} s over 50°)`, s.maxPitch <= 50 && s.steepT === 0);
    b(`no oscillation (reversals/min: heading ${s.revYaw}, tilt ${s.revPitch}, height ${s.revY} ≤ 8)`, s.revYaw <= 8 && s.revPitch <= 8 && s.revY <= 8);
    if (name.startsWith('standing')) b(`still while he stands, turns on the spot and makes short corrections (moved ${s.stillMove} m, turned ${s.stillTurnDeg}°)`, s.stillTurnDeg === 0 && s.stillMove <= 1.5);
    if (name.startsWith('combat')) b(`still while he fights on the spot (moved ${s.stillMove} m, turned ${s.stillTurnDeg}°)`, s.stillTurnDeg <= 0.5 && s.stillMove <= 0.3);
    if (name.startsWith('out of the house')) { const f = parseFloat(String(notes[0]).replace('first view out ', '')); b(`out of the door a normal view at once (${notes.slice(0, 3).join(', ')})`, f >= 20 && f <= 40 && /for 0\.00 s/.test(notes[1])); }
  } else {
    // (along the house walls the orbit drawn in to a wall still meets the least margins over the eaves at once: 25 a
    // minute there, max ~1400 m/s², against 135 and 25 000 before; QA.md "CAM-2", left open)
    b(`few jolts (${s.joltsPerMin}/min ≤ 30, max ${s.accMax} m/s² ≤ 1600)`, s.joltsPerMin <= 30 && s.accMax <= 1600);
    b(`heading reversals ${s.revYaw}/min ≤ 6`, s.revYaw <= 6);
    if (name.startsWith('standing')) b(`still while he stands and turns on the spot (moved ${s.stillMove} m, turned ${s.stillTurnDeg}°)`, s.stillTurnDeg <= 0.5 && s.stillMove <= 1.2);
    if (name.includes('Modern')) b(`never turns by itself under camera-relative controls (${s.yawPerMin}°/min)`, s.yawPerMin <= 5);
  }
  return out;
}

const results = [];
for (const mode of MODES) for (const [name, body] of ROUTES) {
  if (ONLY && !name.includes(ONLY)) continue;
  for (const rate of (process.env.RATES || '60').split(',')) {
    const label = `${mode} · ${name}${rate !== '60' ? ' · ' + rate : ''}`;
    const r = await page.evaluate(({ mode, body, label, rate }) => {
      const G = game; R.mode(mode); if (rate === 'jank') CR.jank(15); else CR.fps(+rate);
      CR.start(label);
      let notes;
      try { notes = new Function('R', 'P', 'G', body)(R, P, G); } catch (e) { notes = ['error: ' + e.message]; }
      const out = CR.stop(); CR.fps(60); P.release();
      return { ...out, notes, end: P.state() };
    }, { mode, body, label, rate });
    results.push(r);
    console.log(`MEASURE ${label}:`, JSON.stringify({ ...r.stats, rules: undefined, worst: undefined }), 'notes', JSON.stringify(r.notes).slice(0, 160));
    console.log("   rules", JSON.stringify(r.stats.rules), "\n   worst", JSON.stringify(r.stats.worst));
    for (const [what, ok] of BUDGET(mode, name, r.stats, r.notes)) check(`${label}: ${what}`, ok, { ...r.stats, rules: undefined, worst: r.stats.worst, notes: r.notes });
  }
}
if (RECORD) {
  fs.mkdirSync(RECORD, { recursive: true });
  fs.writeFileSync(path.join(RECORD, 'routes-' + (process.env.TAG || 'run') + '.json'), JSON.stringify(results.map((r) => ({ label: r.label, stats: r.stats, notes: r.notes, end: r.end })), null, 1));
  fs.writeFileSync(path.join(RECORD, 'trace-' + (process.env.TAG || 'run') + '.json'), JSON.stringify(results.map((r) => ({ label: r.label, trace: r.trace }))));
}
process.exit(done(errs) ? 1 : 0);
