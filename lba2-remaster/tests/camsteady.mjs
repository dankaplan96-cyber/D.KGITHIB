// CAM-2: the play camera stays calm (the user, 2026-10-20: "the camera doesn't work very well — it moves a lot").
// Repeatable routes walked by input (tests/lib/player.js, Classic controls unless named) on Citadel, recorded every frame
// by tests/lib/camrec.js: where the camera stands and looks, and which of its rules moved it. Both camera settings: the
// LBA follow (remaster) and the free orbit. Measured per route (camrec.js CR.stats):
//   turnPerM    how far the view turns (°) per metre Twinsen walks — LBA2's view keeps its angle while it follows
//   revYaw/revPitch/revY/revDist   reversals per minute of the view's heading, tilt (≥ 0.5°), the camera's height
//               (≥ 5 cm) and its distance from him (≥ 10 cm): oscillation, rules undoing each other
//   stillTurnDeg / stillMove       the view turning / moving while he stands or turns on the spot
//   snaps       frames where the camera jumps > 0.6 m or turns > 10° (scene changes left out)
//   angAccP95 / accP95             the view's angular jolts (°/s²) and the camera's acceleration (m/s²)
//   maxPitch / steepT              the steepest the view looked down (°) and how long steeper than 50° (s)
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
const RECORD = process.env.RECORD, ONLY = process.env.ONLY, MODES = (process.env.MODES || 'lba,free').split(',');

const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
await page.addScriptTag({ path: CAMREC });
await page.evaluate(() => {
  const G = game, rig = G.camRig, h = G.hero, I = G.input;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { prologueDone: true, intro: true }); h.hasBall = true;
  window.R = {
    mode(m) { G.settings.camera = m === 'free' ? 'free' : 'lba'; rig.setMode(G.settings.camera); rig.cut = false; },
    // a scene start at a spot (as a load or a door would): the camera's fresh shot, then a second to settle
    place(x, z, a) { G.exitRoom({ x, z, a }, true, true); G.step(0.3); h.angle = a; h.vel.set(0, 0); h.resetMotion?.(); rig.lba.init = false; rig.snap(); G.step(1.0); },
    walk(pts, o = {}) { const res = []; for (const [x, z] of pts) res.push(P.go(x, z, { tol: 0.8, maxT: 40, fight: false, ...o }).r); P.release(); return res; },
    // Modern controls: hold the arrow pair whose camera-relative direction is nearest the way to the next waypoint
    modernGo(tx, tz, maxT = 30) {
      const plan = P.plan(tx, tz, { tol: 0.5 }); let wi = 1, t = 0;
      const dirs = [[0, 1, ['ArrowUp']], [1, 1, ['ArrowUp', 'ArrowRight']], [1, 0, ['ArrowRight']], [1, -1, ['ArrowDown', 'ArrowRight']], [0, -1, ['ArrowDown']], [-1, -1, ['ArrowDown', 'ArrowLeft']], [-1, 0, ['ArrowLeft']], [-1, 1, ['ArrowUp', 'ArrowLeft']]];
      while (t < maxT && Math.hypot(h.pos.x - tx, h.pos.z - tz) > 0.8) {
        while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < 0.6) wi++;
        const w = plan.pts[Math.min(wi, plan.pts.length - 1)], dx = w.x - h.pos.x, dz = w.z - h.pos.z;
        const yaw = rig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        let best = null, bv = -2;
        for (const [mx, my, keys] of dirs) { const L = Math.hypot(mx, my), wx = (rx * mx + fx * my) / L, wz = (rz * mx + fz * my) / L, v = (wx * dx + wz * dz) / Math.hypot(dx, dz); if (v > bv) { bv = v; best = keys; } }
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
  ['street and square', `R.place(-38, 4, Math.PI); return R.walk([[-42, -4], [-50, -6], [-58, -6], [-66, -18], [-56, -9], [-44, -5], [-36, 3]]);`],
  ['along house walls', `R.place(-55, 19.2, Math.PI / 2); return R.walk([[-42.7, 19.2], [-42.7, 25], [-44.5, 29.5], [-53, 29.5], [-54.2, 19.4], [-61.5, -12], [-61.5, -20], [-52, -21.5]]);`],
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
  if (mode === 'lba') {
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
