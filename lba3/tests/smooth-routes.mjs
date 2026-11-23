// SMOOTH-1 (the user, 21.11: "make movement, camera rotation and combat feel smoother without sacrificing the art";
// docs/lba3-performance/SMOOTH-1.md). Three scripted routes in scenes that are already loaded, the Follow camera,
// 1366×768, the same save, settings and inputs every time:
//   street  Citadel's street (fixture new-11-town): a run past the residents, a tight turn, a stop, then a turn on the spot
//           that sweeps the Follow camera across the harbour
//   combat  Citadel's fields (same save, Modern controls for the strafe): one mite; lock on, charge the magic ball while
//           strafing round it, release; again the other way; turn round, lock again and throw
//   mill    Zeelich, Mill Lane (fixture base-12): the freight lift's deck going up and down with the water cart on it
//           (the Cistern Rise, zlift.js), Twinsen walking and turning beside it so the camera turns across it
// Inputs are applied on every simulation step at the same GAME time (tests/lib/smoothrec.js), so every rate gets the same
// presses. Two kinds of run:
//   real    the game's own requestAnimationFrame loop and its real draw. Per route: fps, drawn-frame interval
//           p50/p95/p99/max (from the rAF timestamps), intervals > 50 ms (stalls), long tasks, CPU ms per frame (the game's
//           simulation + render submission on the main thread), GPU ms per frame (EXT_disjoint_timer_query_webgl2, where
//           the browser has it: perf.js GpuTimer, as the benchmark reads it), draw calls, and the motion measures below.
//           On this cloud machine the draw is SwiftShader (CPU): "Automated runtime only (SwiftShader)" — no GPU number.
//   synth   the synthetic display of tests/fps30.mjs: requestAnimationFrame replaced by a clock driven at an exact rate
//           (60, 59.9, 120 Hz, and the 30 limit on 60 and 59.9 Hz), the draw stubbed (sampled, not drawn). This separates motion
//           that jumps at a perfectly stable frame time (input, simulation steps, camera, animation, carriers) from low fps.
// Motion evenness, per drawn frame, for Twinsen, the camera (position and view direction), the camera's look point, the
// aim's landing ring, the lift's cart and the nearest residents: their speed against the frame's time (a frame whose
// speed is off its two neighbours' mean by more than 1.5× either way, while both neighbours move faster than a floor, is a spike; three
// alternating changes in a row an oscillation), and their on-screen jerk (px: the change of on-screen velocity times the
// frame time; Twinsen's own is the camera/target agreement: the camera follows him, so a lag-then-catch-up shows there).
// These criteria were fixed before the first measurement (SMOOTH-1.md §2), not fitted to it.
//
// Run (cloud): cd lba3 && python3 -m http.server 8123 & GAME_URL=http://localhost:8123/ node tests/smooth-routes.mjs
// Env: GAME_URL · RUNS=3 (recorded real passes per route, after one warm-up pass: WARM=0 skips it) · MODE=real,synth
//   (and cpu: the real loop on the browser's own frame clock with the draw stubbed — the cloud's stand-in for real, whose
//   SwiftShader draw takes seconds a frame; CPU there is the simulation alone) ·
//   ROUTES=street,combat,mill · RATES=60,59.9,30@60,30@59.9,120 (synth) · FPS=auto|60|30 (the game's Frame Rate setting
//   for the real runs) · QUALITY=medium|high|low · RES=100|90|auto (world resolution: fixed 100 %, fixed 90 %, or the
//   automatic resolution) · AA=msaa|fxaa|off (Edges: Smooth / Fast / Fast with the output pass's edge smoothing off) ·
//   OUT=dir (every pass's frames and the summary as JSON) · HEADED=1 (a visible window: required for a real GPU and the
//   display's own vsync) · CHANNEL=chrome (the installed Chrome) · PLAYWRIGHT=<path to playwright's index.mjs> (default
//   /opt/node-tools/node_modules/playwright/index.mjs) · LABEL=<text for the tables> · VIEW=1366x768 ·
//   SECS=60 (LBA3-RUN performance: each route repeated — street there and back, combat's cycle, Mill Lane both ways —
//   until SECS of game time are recorded; unset: the routes as SMOOTH-1 timed them) · PROF=1 (the main thread's ms per
//   frame in the per-frame code changed since the last measured build: the rigs' update and ARM-CLEAR, findInteractable
//   and its goalPick, the ball's throwTarget; and each rig's first ARM-CLEAR set-up, a one-off per character)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const env = process.env;
// (a path given on Windows, C:\…, is imported by its file URL)
const PW = env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright/index.mjs';
const { chromium } = await import(/^[a-z]+:\/\//i.test(PW) ? PW : pathToFileURL(PW).href);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL0 = env.GAME_URL || 'http://localhost:8123/';
const ORIGIN = new URL(URL0).origin;
const RUNS = +(env.RUNS ?? 3), WARM = env.WARM !== '0';
const MODES = (env.MODE || 'real,synth').split(',');
const ROUTES = (env.ROUTES || 'street,combat,mill').split(',');
const RATES = (env.RATES || '60,59.9,30@60,30@59.9,120').split(',');
const FPS = env.FPS || 'auto', QUALITY = env.QUALITY || 'medium', RES = env.RES || '100', AA = env.AA || 'msaa';
const [VW, VH] = (env.VIEW || '1366x768').split('x').map(Number);
const OUT = env.OUT || '';
const LABEL = env.LABEL || '';
const SECS = +(env.SECS || 0), PROF = env.PROF === '1';
// SHOTS=dir (LBA3-RUN performance): after a route's passes, the route again on fixed steps with a real draw at a few game
// times while he moves (SHOT_T=3,8,13,18 s), saved as <dir>/<LABEL>-<route>-<t>s.png — silhouettes, shadows, clues in motion
const SHOTS = env.SHOTS || '', SHOT_T = (env.SHOT_T || '3,8,13,18').split(',').map(Number);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
if (OUT) fs.mkdirSync(OUT, { recursive: true });

// the regression harness's error policy where it can be loaded (tests/lib/boot.mjs imports the cloud's playwright path;
// on another machine its error watch is replaced by a plain one)
let watch = null;
try { ({ watch } = await import('./lib/boot.mjs')); } catch { watch = null; }
const errors = [];
const watchPage = (page) => {
  if (watch) { const e = watch(page); return () => e; }
  page.on('pageerror', (e) => errors.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console error: ' + m.text()); });
  return () => errors;
};

const GROUPS = { cit: { save: 'new-11-town', routes: ['street', 'combat'] }, zee: { save: 'base-12', routes: ['mill'] } };
const fixture = (name) => {
  const j = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/campaign', name + '.save.json'), 'utf8'));
  for (const o of j.origins || []) {
    o.origin = ORIGIN;
    for (const it of o.localStorage || []) if (it.name === 'sunshard_settings_v1') {
      const s = JSON.parse(it.value);
      Object.assign(s, { camera: 'follow', controls: 'classic', autoControls: 'off', quality: QUALITY, qualityAuto: false, res: RES === 'auto' ? 'auto' : 'full', fps: FPS, aa: AA === 'msaa' ? 'msaa' : 'fxaa', visual: '2026', shake: 'on' });
      it.value = JSON.stringify(s);
    }
  }
  return j;
};

// ------------------------------------------------------------------ the routes (defined in the page)
function defineRoutes() {
  const G = window.game, V = G.hero.pos.constructor;
  const near = (n = 3) => { const h = G.hero; return G.npcs.filter((x) => x.present !== false && x.pos && x.rig?.root?.visible !== false).sort((a, b) => Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z) - Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z)).slice(0, n); };
  const npcObjs = (list) => Object.fromEntries(list.map((n) => ['npc:' + (n.def?.id ?? n.id), () => new V(n.pos.x, n.pos.y + 0.9, n.pos.z)]));
  const ringObjs = () => ({ ring: () => (G.ball?.landMark?.visible ? G.ball.landMark.position : null), dot: () => (G.ball?.dots?.[4]?.visible ? G.ball.dots[4].position : null), ball: () => (G.ball && G.ball.state !== 'idle' && G.ball.state !== 'held' ? G.ball.pos : null) });
  const modern = (on) => { G.settings.controls = on ? 'modern' : 'classic'; G.applySettings(); };
  window.ROUTES = {
    // Citadel's street west of the square, the residents about; the harbour to the north-west
    street() {
      const S = window.ROUTE_POS.street;
      const R = { cmds: [
        { at() { modern(false); SM.seed(11); SM.place(S.start[0], S.start[1], S.a); R.objs = { ...npcObjs(near(3)) }; } }, { d: 1.5, keys: [] }, { rec: true },
        ...S.legs.map((p) => ({ go: p, tol: 1.0, maxT: 8 })),
        { d: 1.0, keys: [] },                    // stop
        { d: S.sweep, keys: ['ArrowRight'] },    // the turn on the spot: the Follow camera sweeps round with him
        { d: 1.0, keys: [] },
        // (SECS: back along the legs to the start, the sweep the other way, and round again until SECS are recorded)
        ...(window.LOOP ? [...S.legs.slice(0, -1).reverse().map((p) => ({ go: p, tol: 1.0, maxT: 8 })), { go: S.start, tol: 1.0, maxT: 8 }, { d: 1.0, keys: [] }, { d: S.sweep, keys: ['ArrowLeft'] }, { d: 0.5, keys: [] }, { again: 3 }] : []),
        { rec: false } ], objs: {} };
      return R;
    },
    combat() {
      const S = window.ROUTE_POS.combat, h = G.hero;
      let mite = null;
      const R = { cmds: [
        { at() {
          modern(true); SM.seed(23);
          mite = G.enemies.find((e) => e.id === 'mite0');
          if (mite) { const [x, z] = S.mite; mite.pos.set(x, G.physics.groundAt(x, z), z); mite.home = { x, z }; mite.setPresent(true); mite.state = 'idle'; mite.hp = mite.maxHp = 99; mite.sync?.(); }
          if (G.targeting?.lock) G.targeting.release();
          h.hasBall = true; h.combat.equip?.('ball'); G.ball.state = 'idle';
          SM.place(S.start[0], S.start[1], S.a);
          R.objs = { mite: () => (mite ? new V(mite.pos.x, mite.pos.y + 0.4, mite.pos.z) : null), ...ringObjs() };
        } },
        { d: 1.5, keys: [] }, { rec: true },
        { d: 0.05, keys: ['KeyL'] }, { d: 0.4, keys: [] },                   // lock on
        { d: 1.6, keys: ['KeyF', 'ArrowRight'] }, { d: 0.3, keys: ['ArrowRight'] }, { d: 1.2, keys: [] },   // charge while strafing; release
        { d: 1.3, keys: ['KeyF', 'ArrowLeft'] }, { d: 0.3, keys: ['ArrowLeft'] }, { d: 1.0, keys: [] },     // the other way
        { d: 0.05, keys: ['KeyL'] }, { d: 0.2, keys: [] },                   // lock off
        { d: 0.7, keys: ['ArrowDown'] }, { d: 0.6, keys: ['ArrowUp'] }, { d: 0.3, keys: [] },             // turn round and back
        { d: 0.05, keys: ['KeyL'] }, { d: 0.3, keys: [] },                   // lock on again
        { d: 0.9, keys: ['KeyF'] }, { d: 1.6, keys: [] },                    // throw
        ...(window.LOOP ? [{ d: 0.05, keys: ['KeyL'] }, { d: 0.3, keys: [] }, { again: 3 }] : []),   // (SECS: lock off, round again)
        { rec: false }, { at() { if (G.targeting?.lock) G.targeting.release(); modern(false); } } ],
        each() { h.hp = h.maxHp; if (mite) mite.hp = mite.maxHp; }, objs: {} };
      return R;
    },
    mill() {
      const L = G.rooms.zeelich.lift, h = G.hero, A0 = { x: L.lane.x, z: L.lane.z - 9.5 };
      const R = { cmds: [
        { at() { modern(false); SM.seed(31); L.setState({ deck: 'low', cart: 'deck' }); SM.place(A0.x, A0.z, -0.3);
          R.objs = { cart: () => new V(L.deck.x - 0.35, L.deckY + 0.6, L.deck.z), ...npcObjs(near(2)) }; } },
        { d: 1.0, keys: [] }, { rec: true },
        { d: 1.0, keys: ['ArrowUp'] }, { d: 0.5, keys: ['ArrowUp', 'ArrowRight'] }, { d: 1.0, keys: ['ArrowUp', 'ArrowLeft'] }, { d: 0.4, keys: ['ArrowUp'] }, { d: 0.5, keys: [] },
        { d: 1.0, keys: ['ArrowRight'] }, { d: 1.3, keys: ['ArrowLeft'] }, { d: 0.6, keys: ['ArrowRight'] }, { d: 1.0, keys: [] },
        // (SECS: back to the start, turned round to its heading by walking a metre on, and round again — the lane walked
        //  both ways, the Follow camera turning across the lift each time)
        ...(window.LOOP ? [{ go: [A0.x, A0.z], tol: 0.5, maxT: 10 }, { go: [A0.x + Math.sin(-0.3), A0.z + Math.cos(-0.3)], tol: 0.5, maxT: 6 }, { d: 0.3, keys: [] }, { again: 3 }] : []),
        { rec: false } ],
        // the deck (and the cart on it) up and down the shaft the whole time, as the story's moveDeck does it
        each() { if (!L.moving) L.moveDeck(L.deckY > (L.low + L.top) / 2 ? L.low : L.top, 4.6); },
        objs: {} };
      return R;
    },
  };
}
// where the street and combat routes go (Citadel, world metres): chosen once on the fixture's town (SMOOTH-1.md §2)
const ROUTE_POS = {
  street: { start: [-38, 4], a: -1.78, legs: [[-47.2, 2], [-52.8, -1.2], [-58, -5.6], [-61.6, 8.2], [-61.6, 15]], sweep: 2.0 },
  combat: { start: [-45, 46], a: Math.PI, mite: [-45, 39.5] },
};

// ------------------------------------------------------------------ in-page: a real pass, a synthetic pass
async function realPass(page, name, stub = false) {
  await page.evaluate(({ name, stub }) => {
    const G = game;
    G.renderer.timer = stub ? null : G.perf.gpuTimer; if (G.perf.gpuTimer) { G.perf.gpuTimer.stride = 1; G.perf.gpuTimer.reset(); }
    window.__lt = [];
    G.perf.reset(); window.PF?.reset(); SM.stub = stub; SM.run(ROUTES[name]());
    window.__t0 = performance.now();
  }, { name, stub });
  await page.waitForFunction(() => SM.route.done, null, { polling: 250, timeout: 30 * 60000 });
  return page.evaluate(() => {
    const G = game, T = G.perf.gpuTimer, gl = G.renderer.renderer;
    const out = { F: SM.F, P: SM.P, gpu: T ? { ms: T.ms.slice(), disjoint: T.disjoint || 0, invalid: T.invalid || 0, passes: T.stats()?.passes || null } : null,
      longTasks: window.__lt.filter((e) => e.start >= window.__t0), wall: performance.now() - window.__t0, refresh: G.refreshMs?.() || null,
      pr: G.renderer.pixelRatio?.(), msaa: G.renderer.composer?.renderTarget1?.samples ?? null, gpuName: G.perf.gpu, quality: G.settings.quality, fps: G.settings.fps, cap: G.frameCapMs || 0,
      programs: gl.info.programs?.length ?? null, bg: !!G.background,
      prof: window.PF ? { fr: window.PF.fr, calls: window.PF.calls, inits: window.PF.inits } : null };
    G.renderer.timer = null; SM.stub = false;
    return out;
  });
}
async function synthPass(page, name, rate) {
  const [fpsSet, hzS] = rate.includes('@') ? rate.split('@') : ['auto', rate];
  const hz = +hzS;
  // (the loop's next callback, already asked of the browser, is held, then driven from here: tests/fps30.mjs synth)
  await page.evaluate(() => { SYN.on = true; });
  await page.waitForFunction(() => SYN.Q.length > 0, null, { timeout: 15 * 60000, polling: 50 });
  return page.evaluate(({ name, hz, fpsSet }) => {
    const G = game, S = window.SYN;
    S.t = Math.max(S.t, performance.now());
    const tick = (n) => { const per = 1000 / hz; for (let i = 0; i < n; i++) { S.t += per; S.tick(S.t); } };
    G.settings.fps = 'auto'; G.applySettings(); tick(Math.round(hz));                 // the refresh measured at this rate
    G.settings.fps = fpsSet; G.applySettings(); tick(4);
    SM.stub = true; G.perf.reset(); window.PF?.reset(); SM.run(ROUTES[name]());
    for (let i = 0; i < hz * 60 && !SM.route.done; i++) tick(1);
    SM.stub = false;
    const out = { F: SM.F, P: SM.P, refresh: G.refreshMs?.() || null, cap: G.frameCapMs || 0, hz, fpsSet, prof: window.PF ? { fr: window.PF.fr, calls: window.PF.calls, inits: window.PF.inits } : null };
    G.settings.fps = window.__fps0; G.applySettings();
    // (back to the browser's own clock)
    S.on = false; const q = S.Q.splice(0); for (const cb of q) S.raf0(cb);
    return out;
  }, { name, hz, fpsSet });
}

// ------------------------------------------------------------------ the measures
const pc = (a, p) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const r1 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10), r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
const SPIKE = 1.5, FLOOR = { world: 0.3, view: 0.1 }, JERK_PX = 2;   // (SMOOTH-1.md §2: fixed before the first run)
// (on screen, or nearly: a point off the view's edge projects unstably and is not judged on screen)
const onScr = (p) => !!p && p[0] > -0.1 * VW && p[0] < 1.1 * VW && p[1] > -0.1 * VH && p[1] < 1.1 * VH;
// a series of samples (t ms, world xyz, screen px) → its evenness
function evenness(F, get, floor = FLOOR.world) {
  const S = F.map((f) => { const o = get(f); return o && f.st === 'play' && !f.trans ? { t: f.t, w: o.w, s: o.s } : null; });
  const v = [], u = [];
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i];
    if (!a || !b || !(b.t > a.t)) { v.push(null); u.push(null); continue; }
    const dt = (b.t - a.t) / 1000;
    v.push(Math.hypot(b.w[0] - a.w[0], b.w[1] - a.w[1], b.w[2] - a.w[2]) / dt);
    u.push(onScr(a.s) && onScr(b.s) ? { x: (b.s[0] - a.s[0]) / dt, y: (b.s[1] - a.s[1]) / dt, dt } : null);
  }
  let spikes = 0, n = 0, osc = 0, run = 0;
  const ratios = [];
  for (let i = 1; i < v.length - 1; i++) {
    if (v[i - 1] == null || v[i] == null || v[i + 1] == null) { run = 0; continue; }
    const ref = (v[i - 1] + v[i + 1]) / 2;
    // (moving on both sides: a start or a stop — a speed ramping to or from nothing — is not a spike; SMOOTH-1.md §2)
    if (ref <= floor || Math.min(v[i - 1], v[i + 1]) <= floor) { run = 0; continue; }
    n++;
    const r = v[i] / ref; ratios.push(r);
    if (r > SPIKE || r < 1 / SPIKE) spikes++;
    const d0 = v[i] - v[i - 1], d1 = v[i + 1] - v[i];
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) > 0.2 * ref && Math.abs(d1) > 0.2 * ref) { if (++run === 3) osc++; } else run = 0;
  }
  const jerk = [];
  for (let i = 1; i < u.length; i++) if (u[i] && u[i - 1]) jerk.push(Math.hypot(u[i].x - u[i - 1].x, u[i].y - u[i - 1].y) * (u[i].dt + u[i - 1].dt) / 2);
  const ratioDev = ratios.map((r) => Math.abs(Math.log(r)));
  return { n, spikes, osc, devP95: r2(Math.exp(pc(ratioDev, 0.95) ?? 0)), jerkP95: r1(pc(jerk, 0.95)), jerkMax: r1(jerk.length ? Math.max(...jerk) : null), jerkOver: jerk.filter((j) => j > JERK_PX).length, jn: jerk.length };
}
// the view direction's angular speed (rad/s) as a series of "world" points (a unit vector's change)
const viewSeries = (F) => F.map((f) => ({ ...f, _dir: { w: f.dir, s: null } }));
function motion(F) {
  const out = {};
  out.hero = evenness(F, (f) => f.hero);
  out.camPos = evenness(F, (f) => ({ w: f.cam, s: null }));
  out.camView = evenness(viewSeries(F), (f) => f._dir, FLOOR.view);
  out.look = evenness(F, (f) => f.look);
  const keys = new Set(); for (const f of F) for (const k of Object.keys(f.objs || {})) keys.add(k);
  for (const k of keys) out[k] = evenness(F, (f) => f.objs?.[k]);
  // the view's angular acceleration (rad/s²: how hard a turn starts or stops — a whip at a stable frame time), p99 and max
  { const w = [], tt = [];
    for (let i = 1; i < F.length; i++) { const a = F[i - 1], b = F[i]; if (a.st !== 'play' || b.st !== 'play' || b.trans || !(b.t > a.t)) { w.push(null); tt.push(null); continue; } const d = a.dir, e = b.dir;
      // (the angle between the two directions as atan2(|d×e|, d·e): acos of a dot product next to 1 turns its rounding into a false 1-2 rad/s at 120 Hz)
      const cx = d[1] * e[2] - d[2] * e[1], cy = d[2] * e[0] - d[0] * e[2], cz = d[0] * e[1] - d[1] * e[0];
      w.push(Math.atan2(Math.hypot(cx, cy, cz), d[0] * e[0] + d[1] * e[1] + d[2] * e[2]) / ((b.t - a.t) / 1000)); tt.push((b.t + a.t) / 2000); }
    const acc = []; for (let i = 1; i < w.length; i++) if (w[i] != null && w[i - 1] != null && tt[i] > tt[i - 1]) acc.push(Math.abs(w[i] - w[i - 1]) / (tt[i] - tt[i - 1]));
    out.viewAcc = { p99: r1(pc(acc, 0.99)), max: r1(acc.length ? Math.max(...acc) : null), peakW: r2(Math.max(0, ...w.filter((x) => x != null))) }; }
  // the drawn transform against the simulation's: Twinsen's rig root where it is drawn vs his position (m)
  let dm = 0; for (const f of F) if (f.root && f.hero) dm = Math.max(dm, Math.hypot(f.root[0] - f.hero.w[0], f.root[2] - f.hero.w[2]));
  out.rootVsSim = r2(dm);
  return out;
}
function timing(F, P, gpu) {
  const t = F.map((f) => f.t), iv = t.slice(1).map((x, i) => x - t[i]).filter((x) => x > 0);
  const work = P.map((p) => p.sim + p.render);
  const dur = (t[t.length - 1] - t[0]) / 1000;
  const g = gpu?.ms || [];
  return { frames: F.length, fps: r1(iv.length / Math.max(1e-6, dur)), p50: r1(pc(iv, 0.5)), p95: r1(pc(iv, 0.95)), p99: r1(pc(iv, 0.99)), max: r1(iv.length ? Math.max(...iv) : null),
    over50: iv.filter((x) => x > 50).length, over1_5: null, cpuP50: r1(pc(work, 0.5)), cpuP95: r1(pc(work, 0.95)), simP50: r1(pc(P.map((p) => p.sim), 0.5)), renderP50: r1(pc(P.map((p) => p.render), 0.5)),
    gpuP50: g.length ? r1(pc(g, 0.5)) : null, gpuP95: g.length ? r1(pc(g, 0.95)) : null, calls: pc(P.map((p) => p.calls), 0.5), callsP95: pc(P.map((p) => p.calls), 0.95),
    steps: r2(P.reduce((a, p) => a + p.steps, 0) / Math.max(1, P.length)), lostS: r2(P.reduce((a, p) => a + p.lost, 0)), bgFrames: 0 };
}

// PROF: the per-frame ms of each wrapped function → mean / p95 / max
function profile(pr) {
  const per = {};
  for (const [k, a] of Object.entries(pr.fr || {})) { if (k === 'armSum' || !a.length || !a.some((x) => x > 0)) continue; per[k] = { mean: Math.round(a.reduce((s, x) => s + x, 0) / a.length * 1000) / 1000, p95: Math.round(pc(a, 0.95) * 1000) / 1000, max: r2(Math.max(...a)) }; }
  return { per, calls: pr.calls, inits: pr.inits || [], initMax: pr.inits?.length ? Math.max(...pr.inits.map((x) => x.ms ?? x)) : 0 };
}

// ------------------------------------------------------------------ run
const results = [];
let SETUP = null;
const t00 = Date.now();
// (headed, as docs/lba3-performance/local/chrome-bench.mjs: the window's frames not throttled when another window covers it;
//  on Windows ANGLE's D3D11 and the GPU blocklist ignored, as the desktop's local copy had them: smooth-hw/smooth-routes-local.diff)
const launchB = () => chromium.launch({ headless: !env.HEADED, ...(env.CHANNEL ? { channel: env.CHANNEL } : {}), args: env.HEADED ? ['--window-position=0,0', '--window-size=1400,920', ...(process.platform === 'win32' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : []), '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// the power source as Windows reports it (the laptop's runs: on battery or plugged in); elsewhere as the game reads it
let WINPOWER = null;
if (process.platform === 'win32') {
  try {
    const { execSync } = await import('node:child_process');
    const o = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Battery | ForEach-Object { $_.BatteryStatus; $_.EstimatedChargeRemaining }"').toString().trim().split(/\s+/);
    WINPOWER = `${o[0] === '1' ? 'on battery' : o[0] === '2' ? 'plugged in' : 'battery status ' + o[0]}, ${o[1]} %`;
  } catch { WINPOWER = null; }
}
for (const [gid, grp] of Object.entries(GROUPS)) {
  const mine = grp.routes.filter((r) => ROUTES.includes(r));
  if (!mine.length) continue;
  const browser = await launchB();   // (a browser per save: nothing of the other scene's load left behind)
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, storageState: fixture(grp.save) });
  const page = await context.newPage();
  const errs = watchPage(page);
  await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000, polling: 500 });
  await page.evaluate(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: path.join(HERE, 'lib/player.js') });
  await page.click('[data-act="continue"]', { timeout: 120000 });
  await page.evaluate(() => { game.testFreeze = true; game.step(0.2); P.settle(); });
  await page.addScriptTag({ path: path.join(HERE, 'lib/smoothrec.js') });
  await page.evaluate(defineRoutes);
  await page.evaluate((p) => { window.ROUTE_POS = p; }, ROUTE_POS);
  await page.evaluate(({ SECS, PROF }) => {
    window.LOOP = SECS > 0; SM.secs = SECS;
    if (!PROF) return;
    // (PROF: ms per drawn frame in the code under suspicion, folded at each frame's perf record)
    const G = game, PF = (window.PF = { cur: {}, fr: {}, calls: {}, inits: [] });
    const add = (k, d) => { PF.cur[k] = (PF.cur[k] || 0) + d; PF.calls[k] = (PF.calls[k] || 0) + 1; };
    const wrap = (o, k, lab = k) => { const f = o?.[k]; if (typeof f !== 'function') return; o[k] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { add(lab, performance.now() - t); } }; };
    const RP = Object.getPrototypeOf(G.hero.rig), V3 = G.hero.pos.constructor, _pv = new V3(), _pq = new V3();
    // (on the screen, a 10 % margin: the point projected with the camera as it stands — the split of ARM-CLEAR's time)
    const _fr = { containsPoint: (p) => { _pq.copy(p).project(G.camera); return _pq.z < 1 && Math.abs(_pq.x) < 1.1 && Math.abs(_pq.y) < 1.1; } };
    wrap(RP, 'update', 'rig');
    PF.rigs = new Set();
    if (RP._armClear) { const f = (PF.ac0 = RP._armClear); RP._armClear = function (...a) { PF.rigs.add(this); const init = this._ac === undefined, t = performance.now(); try { return f.apply(this, a); } finally { const d = performance.now() - t; { const j = this.j; if (j?.armL?.sh) PF.cur.armSum = (PF.cur.armSum || 0) + j.armL.sh.rotation.x * 1.1 + j.armL.sh.rotation.z * 1.3 + j.armR.sh.rotation.x * 1.7 + j.armR.sh.rotation.z * 1.9; } if (!init) { const v = this.root.getWorldPosition(_pv), on = G.camera && _fr.containsPoint(v.setY(v.y + 0.9)), far = v.distanceTo(G.hero.pos) > 20; add(on ? (far ? 'armClear:onFar' : 'armClear:onNear') : 'armClear:off', d); }
        if (init) PF.inits.push({ ms: Math.round(d * 100) / 100, verts: this.mesh?.geometry?.attributes?.position?.count ?? 0, away: Math.round(this.root.getWorldPosition(new G.hero.pos.constructor()).distanceTo(G.hero.pos)), t: Math.round(G.time * 10) / 10 }); else add('armClear', d); } }; }
    wrap(G, 'findInteractable'); wrap(G, 'goalPick'); wrap(G.targeting, 'throwTarget'); wrap(G.targeting, 'ballReaches');
    const P = G.perf, rec0 = P.onRecord;
    P.onRecord = (f) => { rec0?.(f); if (SM.on) for (const k of ['armSum', 'rig', 'armClear', 'armClear:onNear', 'armClear:onFar', 'armClear:off', 'findInteractable', 'goalPick', 'throwTarget', 'ballReaches']) (PF.fr[k] ||= []).push(PF.cur[k] || 0); PF.cur = {}; };
    PF.reset = () => { PF.fr = {}; PF.calls = {}; PF.inits = []; PF.cur = {}; };
  }, { SECS, PROF });
  // world resolution and edges as asked (RES 90: the scene drawn at 90 % with the automatic resolution's own path, held)
  const setup = await page.evaluate(({ RES, AA }) => {
    const G = game, R = G.renderer;
    if (RES === '90') { R.autoRes = true; R.setDyn(0.9); R.adapt = () => {}; }
    if (AA === 'off') { R.edgeAA = false; R.applyScale(); }
    window.__fps0 = G.settings.fps;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt?.push({ start: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: false }); } catch { /* (no long-task timing in this browser) */ }
    // the synthetic display (tests/fps30.mjs): rAF callbacks wait in Q until tick(t) runs them with timestamp t
    const S = (window.SYN = { Q: [], t: 0, on: false, raf0: window.requestAnimationFrame.bind(window) });
    window.requestAnimationFrame = (cb) => { if (!S.on) return S.raf0(cb); S.Q.push(cb); return S.Q.length; };
    S.tick = (t) => { const q = S.Q.splice(0); for (const cb of q) cb(t); };
    G.testFreeze = false;
    return { power: G.power?.describe?.() ?? null, gpu: G.perf.gpu, timer: !!G.perf.gpuTimer, pr: R.pixelRatio(), scale: R.effScale(), msaa: R.composer?.renderTarget1?.samples, edgeAA: R.output?.uniforms?.edgeAA?.value, quality: G.settings.quality, fps: G.settings.fps, dpr: devicePixelRatio, ua: navigator.userAgent.match(/(HeadlessChrome|Chrome|Electron)\/[\d.]+/)?.[0] };
  }, { RES, AA });
  if (WINPOWER) setup.winPower = WINPOWER;
  SETUP = setup;
  console.log(`[${gid}] ${grp.save}: ${JSON.stringify(setup)} (${((Date.now() - t00) / 1000).toFixed(0)} s)`);
  await page.waitForTimeout(3000);   // (settle on the real loop: the first frames after the load)
  for (const name of mine) {
    for (const mode of ['real', 'cpu'].filter((m) => MODES.includes(m))) {
      for (let k = WARM ? -1 : 0; k < RUNS; k++) {
        const raw = await realPass(page, name, mode === 'cpu');
        if (k < 0) { console.log(`  ${name} ${mode} warm-up pass: ${raw.F.length} frames in ${(raw.wall / 1000).toFixed(0)} s`); continue; }
        const row = { mode, route: name, run: k + 1, setup, timing: timing(raw.F, raw.P, raw.gpu), motion: motion(raw.F), longTasks: raw.longTasks.length, longTaskMax: r1(Math.max(0, ...raw.longTasks.map((e) => e.ms))),
          wall: r1(raw.wall / 1000), refresh: r2(raw.refresh), cap: r2(raw.cap), bg: raw.bg, gpuPasses: raw.gpu?.passes || null, disjoint: raw.gpu?.disjoint ?? null, programs: raw.programs,
          prof: raw.prof ? profile(raw.prof) : null };
        results.push(row);
        console.log(`  ${name} ${mode} #${k + 1}: ${row.timing.frames} frames, ${row.timing.fps} fps, p50/p95/p99 ${row.timing.p50}/${row.timing.p95}/${row.timing.p99} ms, >50 ms ${row.timing.over50}, CPU p50/p95 ${row.timing.cpuP50}/${row.timing.cpuP95} ms, sim p50 ${row.timing.simP50}, GPU ${row.timing.gpuP50 ?? 'n/a'} (${row.wall} s)`);
        if (row.prof) console.log(`    prof ms/frame mean/p95/max: ${Object.entries(row.prof.per).map(([k, v]) => `${k} ${v.mean}/${v.p95}/${v.max}`).join(' · ')} · first ARM-CLEAR set-ups ${row.prof.inits.length} (max ${row.prof.initMax} ms)`);
        if (OUT) fs.writeFileSync(path.join(OUT, `${mode}-${name}-${k + 1}.json`), JSON.stringify({ ...row, raw }));
      }
    }
    if (SHOTS) {
      await page.evaluate((name) => { game.testFreeze = true; SM.stub = false; SM.run(ROUTES[name]()); }, name);
      for (const ts of SHOT_T) {
        const t = await page.evaluate((ts) => { const G = game; for (let k = 0; k < 6000 && !SM.route.done && SM.route.t < ts; k++) G.frame(1 / 60, false); if (!SM.route.done) G.frame(1 / 60, true); return SM.route.done ? -1 : SM.route.t; }, ts);
        if (t < 0) break;
        const f = path.join(SHOTS, `${(LABEL || 'run').replace(/[^\w.-]+/g, '_')}-${name}-${ts}s.png`);
        await page.screenshot({ path: f });
        console.log(`  shot ${f} (game ${t.toFixed(2)} s)`);
      }
      await page.evaluate(() => { SM.route.done = true; SM.release(); SM.on = false; game.testFreeze = false; });
    }
    if (MODES.includes('synth')) {
      for (const rate of RATES) {
        const raw = await synthPass(page, name, rate);
        const row = { mode: 'synth', route: name, rate, timing: timing(raw.F, raw.P, null), motion: motion(raw.F), refresh: r2(raw.refresh), cap: r2(raw.cap) };
        results.push(row);
        console.log(`  ${name} synth ${rate}: ${row.timing.frames} frames, steps/frame ${row.timing.steps}, hero spikes ${row.motion.hero.spikes}/${row.motion.hero.n}, camView spikes ${row.motion.camView.spikes}/${row.motion.camView.n}`);
        if (OUT) fs.writeFileSync(path.join(OUT, `synth-${name}-${rate}.json`), JSON.stringify({ ...row, raw }));
      }
    }
  }
  // PROF: ARM-CLEAR's set-up per character, apart: with the body's profile built afresh (a look's first character) and
  // with it cached (every other character of that look) — each rig seen in the routes, timed again at the end
  if (PROF) {
    const A = await page.evaluate(() => {
      const out = [], seen = new Set();
      for (const r of window.PF.rigs) {
        if (!r._ac || !r.mesh?.skeleton) continue;
        const g = r.mesh.geometry, key = 'armClear:' + r.mesh.skeleton.bones.map((b) => b.name).join(','), saved = g.userData[key], ac = r._ac;
        const T = (fresh) => { if (fresh) delete g.userData[key]; r._ac = undefined; const t = performance.now(); window.PF.ac0.call(r, 1 / 60, 'idle'); return performance.now() - t; };
        const best = (fresh) => Math.min(T(fresh), T(fresh), T(fresh));   // (the least of three: this machine's other load out)
        const full = best(true), cached = best(false);
        r._ac = ac; g.userData[key] = saved;
        out.push({ full: Math.round(full * 100) / 100, cached: Math.round(cached * 100) / 100, verts: g.attributes.position.count, shared: seen.has(g) });
        seen.add(g);
      }
      return out;
    });
    // and ARM-CLEAR's per-frame look itself on the same rigs in their poses as the routes left them: each rig's two arms
    // solved afresh (no answer kept from the last look) 200 times, the arms put back before each; best of 5 (ms in all)
    const S = await page.evaluate(() => {
      const rigs = [...window.PF.rigs].filter((r) => r._ac && r.j?.armL?.sh), ac0 = window.PF.ac0;
      const keep = rigs.map((r) => { const D = r._ac, a = r.j.armL.sh.rotation, b = r.j.armR.sh.rotation; return [a.x, a.z, b.x, b.z, D.L.slice(), D.R.slice(), D.wx.slice(), D.n, JSON.stringify(D.k), JSON.stringify(D.t)]; });
      const put = (r, k) => { const D = r._ac, a = r.j.armL.sh.rotation, b = r.j.armR.sh.rotation; a.x = k[0]; a.z = k[1]; b.x = k[2]; b.z = k[3]; D.L = k[4].slice(); D.R = k[5].slice(); D.wx = k[6].slice(); D.n = k[7]; D.k = JSON.parse(k[8]); D.t = JSON.parse(k[9]); D.k.L[0] = D.k.R[0] = 0; D.t.L[2] = D.t.R[2] = 0; };
      let best = Infinity;
      for (let round = 0; round < 5; round++) {
        let ms = 0;
        for (let i = 0; i < rigs.length; i++) for (let q = 0; q < 200; q++) { put(rigs[i], keep[i]); const t = performance.now(); ac0.call(rigs[i], 1 / 60, rigs[i].anim || 'idle'); ms += performance.now() - t; }
        best = Math.min(best, ms);
      }
      rigs.forEach((r, i) => put(r, keep[i]));
      return { rigs: rigs.length, ms: Math.round(best * 10) / 10 };
    });
    console.log(`  [${gid}] ARM-CLEAR look, ${S.rigs} rigs × 200 forced solves: ${S.ms} ms (best of 5)`);
    const sum = (k) => Math.round(A.reduce((s, x) => s + x[k], 0) * 10) / 10, mx = (k) => Math.max(0, ...A.map((x) => x[k]));
    console.log(`  [${gid}] ARM-CLEAR set-up, ${A.length} characters (${A.filter((x) => !x.shared).length} looks): profile+points ms sum ${sum('full')} max ${mx('full')} · points only (profile cached) sum ${sum('cached')} max ${mx('cached')}`);
    if (OUT) fs.writeFileSync(path.join(OUT, `armclear-setup-${gid}.json`), JSON.stringify(A));
  }
  const e = errs();
  if (e.length) console.log(`[${gid}] page errors: ${e.slice(0, 5).join(' | ')}`);
  await context.close();
  await browser.close();
}

// ------------------------------------------------------------------ the tables
const real = /SwiftShader|llvmpipe|Software/i.test(SETUP?.gpu || '') ? 'Automated runtime only (SwiftShader): CPU-drawn, no GPU number' : 'Real GPU: ' + (SETUP?.gpu || '?') + ` · ${SETUP?.ua} · dPR ${SETUP?.dpr} · render pixel ratio ${SETUP?.pr} · MSAA ${SETUP?.msaa}× · GPU timer ${SETUP?.timer ? 'yes' : 'no'} · power ${SETUP?.winPower || SETUP?.power || '?'}`;
console.log(`\n=== SMOOTH-1 routes ${LABEL} · ${VW}×${VH} · Follow · quality ${QUALITY} · world resolution ${RES} · edges ${AA} · Frame Rate ${FPS} · ${real}`);
const mv = (m) => m ? `${m.spikes}/${m.n}` : '–';
const jk = (m) => m && m.jn ? `${m.jerkP95}/${m.jerkMax}/${m.jerkOver}` : '–';
for (const name of ROUTES) {
  for (const mode of ['real', 'cpu']) {
  const R = results.filter((r) => r.route === name && r.mode === mode);
  if (R.length) {
    console.log(`\n${name} — ${mode === 'real' ? 'real loop, real draw' : "real loop on the browser's own frame clock, the draw stubbed (CPU = simulation only)"} (${R.length} runs)`);
    console.log('run  fps    p50   p95   p99    max  >50ms  longTasks  CPU p50/p95 ms  GPU p50/p95 ms  calls  steps | spikes: hero  camPos camView look  | jerk px p95/max/>2: hero  cart/ring      | view acc p99/max rad/s²');
    for (const r of R) { const T = r.timing, M = r.motion, o = M.cart || M.ring;
      console.log(`${String(r.run).padEnd(4)} ${String(T.fps).padEnd(6)} ${String(T.p50).padEnd(5)} ${String(T.p95).padEnd(5)} ${String(T.p99).padEnd(6)} ${String(T.max).padEnd(5)} ${String(T.over50).padEnd(6)} ${String(r.longTasks).padEnd(10)} ${`${T.cpuP50}/${T.cpuP95}`.padEnd(15)} ${`${T.gpuP50 ?? 'n/a'}/${T.gpuP95 ?? 'n/a'}`.padEnd(15)} ${String(T.calls).padEnd(6)} ${String(T.steps).padEnd(5)} | ${mv(M.hero).padEnd(10)} ${mv(M.camPos).padEnd(7)} ${mv(M.camView).padEnd(7)} ${mv(M.look).padEnd(6)} | ${jk(M.hero).padEnd(14)} ${jk(o).padEnd(14)} | ${M.viewAcc.p99}/${M.viewAcc.max}`); }
  }
  }
  const Sy = results.filter((r) => r.route === name && r.mode === 'synth');
  if (Sy.length) {
    console.log(`\n${name} — synthetic display (even timestamps; the draw stubbed)`);
    console.log('rate      frames steps | spikes (n=frames judged): hero   camPos  camView look   others                       | jerk px p95/max/>2: hero  others');
    for (const r of Sy) { const M = r.motion, others = Object.keys(M).filter((k) => !['hero', 'camPos', 'camView', 'look', 'rootVsSim', 'viewAcc'].includes(k));
      console.log(`${r.rate.padEnd(9)} ${String(r.timing.frames).padEnd(6)} ${String(r.timing.steps).padEnd(5)} | ${mv(M.hero).padEnd(8)} ${mv(M.camPos).padEnd(7)} ${mv(M.camView).padEnd(7)} ${mv(M.look).padEnd(6)} ${others.map((k) => `${k} ${mv(M[k])}`).join(' ').padEnd(28)} | ${jk(M.hero).padEnd(14)} ${others.map((k) => `${k} ${jk(M[k])}`).join(' ')} | view acc p99/max ${M.viewAcc.p99}/${M.viewAcc.max} rad/s²`); }
  }
}
if (OUT) fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results.map(({ setup, ...r }) => r), null, 1));
if (errors.length) console.log('page errors: ' + errors.slice(0, 5).join(' | '));
console.log(`\n(${((Date.now() - t00) / 60000).toFixed(1)} min)`);
