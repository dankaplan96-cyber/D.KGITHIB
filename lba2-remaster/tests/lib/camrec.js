// CAM-2: the play camera's recorder and its restlessness measures (loaded into the page after tests/lib/player.js).
//
// CR.start(label) … CR.stop() → { label, stats, trace }. Every camera update while on: where the camera stands, where it
// looks, its yaw/pitch/distance, Twinsen (position, facing, speed, on screen) and what moved the view this frame
// (camRig.why: the follow, the frame box, a swing, the rise over scenery, the clearance lift, the keep-out, the free
// orbit's auto-turn, its pull-in, the player's own camera input). CR.fps(30) / CR.jank() change how G.step advances
// time (30 fps; 60 fps with a 0.1 s frame every 15, split into sub-steps the way Game.advance does).
(() => {
  const G = window.game, rig = G.camRig, cam = G.camera;
  const CR = (window.CR = { on: false, F: [], label: '', rate: 60, jankEvery: 0 });
  const V = cam.position.constructor, _v = new V();
  const up = rig.update.bind(rig);
  rig.update = (dt, focus, heroAngle, moving, input) => {
    up(dt, focus, heroAngle, moving, input);
    if (!CR.on || rig.cine) return;
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements, h = G.hero, w = rig.why || {};
    _v.set(h.pos.x, h.pos.y + 0.9, h.pos.z).project(cam);
    // the camera's own rules, without a shake's tremor (rig.base: where it stood before the tremor; older builds: as drawn)
    const b = rig.base || cam.position, L = rig.look, fl = Math.hypot(L.x - b.x, L.y - b.y, L.z - b.z) || 1;
    CR.F.push({
      t: G.time, dt, p: [b.x, b.y, b.z], f: rig.base ? [(L.x - b.x) / fl, (L.y - b.y) / fl, (L.z - b.z) / fl] : [-e[8], -e[9], -e[10]],
      yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist, h: [h.pos.x, h.pos.y, h.pos.z], ha: h.angle, hs: h.speed, ground: h.onGround,
      ndc: [_v.x, _v.y], st: G.state, room: G.room?.id ?? 'citadel', trans: !!G.trans, shake: rig.shakeT > 0,
      why: { ...w }, F: rig.lba.f ? [rig.lba.f.x, rig.lba.f.y, rig.lba.f.z] : null, lift: rig.lba.lift ?? 0, look: [rig.look.x, rig.look.y, rig.look.z],
    });
  };
  // time stepping at the chosen rate (and long frames), the way the game's loop splits a slow frame
  const step0 = G.step.bind(G);
  let k = 0;
  G.step = (seconds) => {
    if (CR.rate === 60 && !CR.jankEvery) return step0(seconds, 1 / 60);
    G._transBudget = null;
    for (let t = 0; t < seconds - 1e-9;) {
      const real = CR.jankEvery && ++k % CR.jankEvery === 0 ? 0.1 : 1 / CR.rate;
      const n = Math.max(1, Math.ceil(real / (1 / 30) - 1e-6));
      for (let i = 0; i < n; i++) G.frame(real / n, false);
      t += real;
    }
  };
  CR.fps = (r) => { CR.rate = r; CR.jankEvery = 0; };
  CR.jank = (every = 15) => { CR.rate = 60; CR.jankEvery = every; };
  CR.start = (label) => { CR.label = label; CR.F = []; CR.on = true; };
  CR.stop = (opts) => { CR.on = false; return { label: CR.label, stats: CR.stats(CR.F, opts), trace: CR.trace(CR.F) }; };

  const deg = 180 / Math.PI;
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const q = (arr, f) => { if (!arr.length) return 0; const b = [...arr].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; };
  // reversals of a signal's direction that each undo at least `min` (hysteresis: a wobble smaller than that is not counted)
  const reversals = (xs, min) => {
    if (!xs.length) return 0;
    let n = 0, dir = 0, hi = xs[0], lo = xs[0];
    for (const x of xs) {
      hi = Math.max(hi, x); lo = Math.min(lo, x);
      if (dir >= 0 && x < hi - min) { if (dir > 0) n++; dir = -1; lo = x; }
      else if (dir <= 0 && x > lo + min) { if (dir < 0) n++; dir = 1; hi = x; }
    }
    return n;
  };
  const RULES = ['follow', 'box', 'swing', 'rise', 'lift', 'keep', 'dist', 'auto', 'occ', 'ground'];
  // the measures of a recording (frames of one scene, play state; scene changes and their first second left out)
  CR.stats = (S, { still = 0.15 } = {}) => {
    const out = { frames: S.length };
    if (S.length < 3) return out;
    let heroPath = 0, camPath = 0, turn = 0, stillTurn = 0, stillMove = 0, stillT = 0, dur = 0, snaps = 0, maxStep = 0, maxTurnStep = 0, shakeT = 0, jolts = 0, yawTravel = 0, steepT = 0, maxPitch = 0, pitchTravel = 0;
    const rate = [], acc = [], angAcc = [], az = [], el = [], camY = [], dist = [], ruleSum = {}, ruleTop = {}, ruleSeries = {};
    for (const r of RULES) { ruleSum[r] = 0; ruleTop[r] = 0; ruleSeries[r] = [0]; }
    let prevW = null, skip = 0; const worst = { acc: [0], ang: [0], step: [0] };
    const note = (k2, v, b) => { if (v > worst[k2][0]) worst[k2] = [+v.toFixed(2), +b.t.toFixed(2), Object.entries(b.why).filter(([, x]) => x && x !== true).map(([n, x]) => n + ':' + (typeof x === 'number' ? x.toFixed(3) : x)).join(' '), 'hero ' + b.h.map((x) => x.toFixed(1)).join(',') + ' hs ' + b.hs.toFixed(2),
      'dp ' + b.p.map((x, j) => (x - S[S.indexOf(b) - 1].p[j]).toFixed(3)).join(','), 'dF ' + (b.F && S[S.indexOf(b) - 1].F ? b.F.map((x, j) => (x - S[S.indexOf(b) - 1].F[j]).toFixed(3)).join(',') : '-'),
      'dlift ' + (b.lift - S[S.indexOf(b) - 1].lift).toFixed(3) + ' dpitch ' + (b.pitch - S[S.indexOf(b) - 1].pitch).toFixed(4) + ' dyaw ' + (b.yaw - S[S.indexOf(b) - 1].yaw).toFixed(4) + ' dlook ' + b.look.map((x, j) => (x - S[S.indexOf(b) - 1].look[j]).toFixed(3)).join(',')]; };
    for (let i = 1; i < S.length; i++) {
      const a = S[i - 1], b = S[i], dt = b.dt;
      if (b.trans || b.why.snap || b.room !== a.room || b.st !== 'play' || a.st !== 'play') { skip = 60; prevW = null; continue; }
      if (skip > 0) { skip--; continue; }
      // (a shake is feedback, not the camera's rules: its frames are left out — in builds before CAM-2 the tremor is in
      // the camera's position, from CAM-2 on the recording takes the pose under it, rig.base)
      if (b.shake || a.shake || (i >= 2 && S[i - 2].shake)) { shakeT += dt; prevW = null; continue; }
      dur += dt;
      const dh = Math.hypot(b.h[0] - a.h[0], b.h[2] - a.h[2]), dp = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]), dA = ang(a.f, b.f);
      heroPath += dh; camPath += dp; turn += dA;
      if (dp > 0.6 || dA > 0.17) snaps++;
      maxStep = Math.max(maxStep, dp); note('step', dp, b); maxTurnStep = Math.max(maxTurnStep, dA);
      rate.push((dA / dt) * deg);
      // he stands (or turns on the spot): the view should not move at all
      if (b.hs < still && a.hs < still && !b.shake) { stillTurn += dA; stillMove += dp; stillT += dt; }
      // angular velocity (as a vector: the forward's change) and its change (the view's own jolts)
      const w = [(b.f[0] - a.f[0]) / dt, (b.f[1] - a.f[1]) / dt, (b.f[2] - a.f[2]) / dt];
      if (prevW) { const v = Math.hypot(w[0] - prevW[0], w[1] - prevW[1], w[2] - prevW[2]) / ((dt + a.dt) / 2) * deg; angAcc.push(v); note('ang', v, b); }
      prevW = w;
      if (i >= 2 && S[i - 2].room === b.room) {
        const c = S[i - 2];
        // (frames of unequal length — a long frame split into steps — each over its own dt)
        { const v = Math.hypot(...[0, 1, 2].map((k2) => ((b.p[k2] - a.p[k2]) / dt - (a.p[k2] - c.p[k2]) / a.dt) / ((dt + a.dt) / 2))); acc.push(v); note('acc', v, b); if (v > 40) jolts++; }
      }
      { const pd = -Math.asin(Math.max(-1, Math.min(1, b.f[1]))) * deg, pa = -Math.asin(Math.max(-1, Math.min(1, a.f[1]))) * deg; maxPitch = Math.max(maxPitch, pd); if (pd > 50) steepT += dt; pitchTravel += Math.abs(pd - pa); let dz = Math.atan2(b.f[0], b.f[2]) - Math.atan2(a.f[0], a.f[2]); dz -= Math.round(dz / (2 * Math.PI)) * 2 * Math.PI; yawTravel += Math.abs(dz); }
      az.push(Math.atan2(b.f[0], b.f[2])); el.push(Math.asin(Math.max(-1, Math.min(1, b.f[1])))); camY.push(b.p[1]); dist.push(Math.hypot(b.p[0] - b.h[0], b.p[1] - b.h[1], b.p[2] - b.h[2]));
      // what moved it: each rule's contribution this frame (m, or rad for the turns × the distance: metres at the camera)
      const W = b.why, D = b.dist || 10, c = { follow: W.follow, box: W.box, swing: Math.abs(W.swing) * D, rise: Math.abs(W.rise) * D, lift: Math.abs(W.lift), keep: W.keep, dist: Math.abs(W.dist), auto: Math.abs(W.auto) * D, occ: Math.abs(W.occ), ground: Math.abs(W.ground) };
      let top = null, tv = 1e-4;
      for (const r of RULES) { ruleSum[r] += c[r] || 0; if ((c[r] || 0) > tv) { tv = c[r]; top = r; } }
      if (top) ruleTop[top]++;
      const sv = { follow: 0, box: 0, swing: W.swing, rise: W.rise, lift: W.lift, keep: W.keep, dist: W.dist, auto: W.auto, occ: W.occ, ground: W.ground };
      for (const r of RULES) ruleSeries[r].push(ruleSeries[r][ruleSeries[r].length - 1] + (sv[r] || 0));
    }
    // unwrap the azimuth
    for (let i = 1; i < az.length; i++) { while (az[i] - az[i - 1] > Math.PI) az[i] -= 2 * Math.PI; while (az[i] - az[i - 1] < -Math.PI) az[i] += 2 * Math.PI; }
    const per = (n) => +((n / Math.max(dur, 1e-3)) * 60).toFixed(1);   // per minute
    const r1 = (x, d = 1) => +x.toFixed(d);
    Object.assign(out, {
      dur: r1(dur), heroPath: r1(heroPath), camPath: r1(camPath), camPerM: r1(camPath / Math.max(heroPath, 1), 2),
      turnDeg: r1(turn * deg), turnPerM: r1((turn * deg) / Math.max(heroPath, 1), 2),
      rateP95: r1(q(rate, 0.95)), rateMax: r1(q(rate, 1)),
      angAccP95: r1(q(angAcc, 0.95)), angAccMax: r1(q(angAcc, 1)),
      accP95: r1(q(acc, 0.95)), accMax: r1(q(acc, 1)),
      // oscillation: reversals of the view's heading (≥ 0.5°) and tilt (≥ 0.5°), of the camera's height (≥ 5 cm) and of
      // its distance from him (≥ 10 cm), per minute
      revYaw: per(reversals(az, 0.5 / deg)), revPitch: per(reversals(el, 0.5 / deg)), revY: per(reversals(camY, 0.05)), revDist: per(reversals(dist, 0.1)),
      stillT: r1(stillT), stillTurnDeg: r1(stillTurn * deg, 2), stillMove: r1(stillMove, 2),
      snaps, maxStep: r1(maxStep, 2), maxTurnStepDeg: r1(maxTurnStep * deg, 2),
      // the view's tilt: the steepest it got (°), how long it looked down steeper than 50° (s), how far it tilted (°/min);
      // its heading's travel (°/min); jolts: frames accelerating the camera > 40 m/s², per minute; shake time left out (s)
      maxPitch: r1(maxPitch), steepT: r1(steepT), pitchPerMin: per(pitchTravel), yawPerMin: per(yawTravel * deg), joltsPerMin: per(jolts), shakeT: r1(shakeT),
      rules: Object.fromEntries(RULES.filter((r) => ruleSum[r] > 0.005).map((r) => [r, { m: r1(ruleSum[r], 2), top: ruleTop[r], rev: per(reversals(ruleSeries[r], r === 'swing' || r === 'rise' || r === 'auto' ? 0.5 / deg : 0.05)) }])),
    });
    out.worst = worst;
    // the restlessness score: view turning per metre walked + oscillations + motion while he stands
    // (CAM-2: the distance's reversals are left out of it: walking about inside a still view changes that by itself)
    out.score = r1(out.turnPerM + (out.revYaw + out.revPitch + out.revY) / 10 + out.joltsPerMin / 5 + (stillT > 0.5 ? (out.stillTurnDeg + out.stillMove * 10) / stillT : 0), 2);
    return out;
  };
  // a compact trace (every 2nd frame) for plots and the worst-case replays
  CR.trace = (S) => S.filter((_, i) => i % 2 === 0).map((s) => ({ t: +s.t.toFixed(3), p: s.p.map((x) => +x.toFixed(3)), f: s.f.map((x) => +x.toFixed(4)), yaw: +s.yaw.toFixed(4), pitch: +s.pitch.toFixed(4), h: s.h.map((x) => +x.toFixed(3)), hs: +s.hs.toFixed(2), room: s.room, st: s.st, why: Object.fromEntries(Object.entries(s.why).filter(([, v]) => v).map(([k2, v]) => [k2, typeof v === 'number' ? +v.toFixed(4) : v])) }));
})();
