// In-game benchmark: the same routes, timed on the machine that plays. Runs from the pause menu (or ?bench once
// a game is going) and never touches the save: the game is snapshotted first, saving is off while it runs, and
// the snapshot is put back at the end.
// Each route warms up (scene change, shaders: a preset change or a breakdown variant first waits for its shader
// variants to finish compiling, so the numbers are the steady state, not the recompile) and is then measured: average fps, frame time p50/p95/p99 and
// max, stalls (frames over 50 ms), simulation CPU time, render submission CPU time (not GPU time: the GPU's work
// is only visible in the frame time), draw calls and triangles. Routes run once per quality preset.
// PERF-2: the camera is the same for everyone. The street's "camera turning" only turns the free orbit, so a player on
// the LBA camera measured the follow view (≈ 200–270 calls) and one on the free camera (the user) the views across
// the town (≈ 470–540), from wherever their camera last pointed: the routes now always use the free orbit from the
// same heading, pitch and distance, and the player's camera is put back afterwards. "draw calls" stays three.js's count (one per WebGL call, the CPU
// cost); "GPU draws" adds the draws inside a multi-draw (one call for many trees, which ANGLE on D3D11 still
// issues one by one) and "shadow" is the shadow pass's share of the calls.
import { gpuQuality, Sections, resources, loafIn } from './perf.js';
// (STABILIZATION: the GPU investigator's own variants for the Medium breakdown, one per group of GPU work)
import { gpuVariants } from './benchgpu.js';
import { poolSize } from './lightpool.js';
import { MW } from './drawcull.js';
const WARM = 1.5, MEASURE = 6;
// PERF-BATTERY-2: "as played": every route again with the automatic resolution ON, as the game runs it in play (the
// fixed runs above keep it off, for comparison between machines and builds). Each preset's played routes run in a row
// and the factor carries over from one route to the next, as it does in play; it starts at ×1 on the preset's first.
// A played route's warm-up lasts until the factor has held for PLAY_HOLD frames (two of the automatic resolution's
// 90-frame windows; at least PLAY_MIN s, at most PLAY_MAX s: then "not settled"), then it is measured as the others;
// the report gives the factor it settled at and its range while measured.
const PLAY_MIN = 4, PLAY_HOLD = 180, PLAY_MAX = 25;
// PERF-HIGH (frame pacing diagnostics; laptop-build228-plugged.txt showed runs held at a frame p50 of 17.4–17.7 ms with
// the GPU at ~9 ms and the game's CPU work at 3–6 ms, and never a 33 ms frame: a pace neither the game's work nor a
// missed 60 Hz refresh explains). After each route, IDLE_FRAMES refreshes with nothing simulated or drawn (the last
// picture stays on screen): their interval is the display's / browser's own pace at that moment. Before each route a
// fixed piece of JavaScript is timed (cpuProbe): the processor's speed, which falls when it is clocked down (heat,
// power plan, battery) — the render submission's milliseconds rise with it although the work is the same.
const IDLE_FRAMES = 40;
export function cpuProbe() {
  const one = () => { const t0 = performance.now(); let x = 0; for (let i = 1; i < 150000; i++) x += Math.sqrt(i) * Math.sin(i * 0.001); return [performance.now() - t0, x]; };
  const v = [one()[0], one()[0], one()[0]].sort((a, b) => a - b);
  return +v[1].toFixed(2);
}
const med = (a) => { if (!a.length) return null; const v = a.slice().sort((x, y) => x - y); return +v[Math.floor(v.length / 2)].toFixed(2); };
// (PERF-HIGH / I-11) every frame over 33 ms: its length @ time into the window, behind black or not, and (AUTO-QUALITY)
// what ran in it (Game.advance frameWhy: area batches built, shadow cache rebuilt, shader programs compiled, geometry /
// textures uploaded, a governor step, a likely garbage collection) or else the frame's own CPU work
export function hitchList(buf) {
  let at = 0; const h = [];
  // (STABILIZATION: a frame over 100 ms also says what the main thread did through it — the browser's long animation
  //  frames, perf.js loafIn — or that it was free: then the time went to the GPU process, the driver or the compositor)
  for (const f of buf) { at += f.ms; if (f.ms > 33.4) { const lo = f.ms > 100 ? loafIn(f.end, f.ms) : ''; h.push(`${f.ms.toFixed(0)}@${(at / 1000).toFixed(1)}s${f.black ? ' black' : ''}${f.why ? ` [${f.why}]` : ` [work ${((f.sim || 0) + (f.render || 0)).toFixed(0)} ms]`}${lo ? ` {${lo}}` : ''}`); } }
  return h;
}
// (STABILIZATION: a CPU-by-section summary on one line, in a fixed order)
const SEC_ORDER = ['people', 'hero', 'enemies', 'physics', 'interact', 'camera', 'other sim', 'submit other', 'submit main', 'submit shadow', 'submit post'];
function secLine(c) { const keys = [...SEC_ORDER.filter((k) => c[k]), ...Object.keys(c).filter((k) => !SEC_ORDER.includes(k))]; return keys.map((k) => `${k} ${c[k].p50} / ${c[k].mean} (${c[k].calls})`).join(' · '); }
export const BENCH_AREAS = ['house', 'arena', 'zeelich', 'desert', 'hamalayi'];

export class Bench {
  constructor(game) { this.g = game; this.running = false; }

  // the routes: setup() once, drive(t, dt) every displayed frame
  routes() {
    const G = this.g, h = G.hero;
    const walk = (pts, speed = 2.4, baseY = 0) => {
      // a loop through pts at walking speed, facing the way it goes (the rig picks the walk from the motion)
      const seg = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length].x - p.x, pts[(i + 1) % pts.length].z - p.z));
      const total = seg.reduce((a, b) => a + b, 0);
      return (t) => {
        let d = (t * speed) % total, i = 0;
        while (d > seg[i]) { d -= seg[i]; i++; }
        const a = pts[i], b = pts[(i + 1) % pts.length], k = d / seg[i];
        h.pos.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k);
        h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, baseY + 2);
        h.angle = Math.atan2(b.x - a.x, b.z - a.z); h.vel.set(0, 0);
      };
    };
    const outdoor = (x, z) => { G.exitRoom({ x, z, a: 0 }, true, true); this.camera(); };
    return [
      // The free orbit as a player has it: it turns slowly (0.35 rad/s, as before) while it swings back behind the
      // walking Twinsen (camera.js _free), always from the same heading (π/4): the views across the square and up
      // the town (headings 1.3–2.5 rad) that the 0.31.0 benchmark measured on the user's laptop (Low 477 calls,
      // 697k triangles; this route on SwiftShader, same build: 471 calls, 690k).
      (() => {
        const w = walk([{ x: -46, z: 2 }, { x: -38, z: 2 }, { x: -36, z: -8 }, { x: -48, z: -9 }]);
        return {
          id: 'street', label: 'Populated street (the square, the shop, NPCs), camera turning',
          setup: () => { outdoor(-42, 2); w(0); G.camRig.yaw = Math.PI / 4; },
          drive: (t, dt) => { G.doorCool = Math.max(G.doorCool || 0, 0.5); w(t); G.camRig.yaw += dt * 0.35; },
        };
      })(),
      {
        id: 'interior', label: "Furnished interior (Twinsen's house)",
        setup: () => { G.enterRoom('house', null, true, true); },
        // (PERF-HIGH: no door or hatch fires while it walks: its loop crosses the cellar hatch ~7 s in, so the fixed run's
        //  last half second and nearly all of an "as played" run were the cellar, not the house)
        drive: (() => { let w = null; return (t) => { const R = G.room; G.doorCool = Math.max(G.doorCool || 0, 0.5); w ??= walk([{ x: R.center.x - 2, z: R.center.z - 1 }, { x: R.center.x + 2, z: R.center.z + 1 }, { x: R.center.x + 1, z: R.center.z + 8 }, { x: R.center.x - 8, z: R.center.z + 9 }]); w(t); }; })(),
      },
      {
        id: 'combat', label: 'Combat: enemies and a throw every 0.6 s',
        setup: () => {
          G.devArena(); G.state = 'play'; this.camera();
          for (const e of G.enemies) if (e.id?.startsWith('a_')) e.setPresent(true);
        },
        drive: (() => { let next = 0; return (t) => {
          h.hp = h.maxHp; h.dead = false; h.mp = h.mpMax;
          if (t > next && G.ball.ready) { next = t + 0.6; const a = t * 1.3; G.ball.launch(h, 'normal', h.magicLevel, { aim: { x: Math.sin(a), z: Math.cos(a) } }); }
        }; })(),
      },
      {
        id: 'transition', label: 'Area transition (house door, in and out every 2 s)',
        setup: () => { outdoor(-45, 76); },
        drive: (() => { let next = 0, inside = false; return (t) => {
          if (t < next || G.trans) return;
          next = t + 2; inside = !inside;
          if (inside) G.enterRoom('house', null, false, true); else G.exitRoom({ x: -45, z: 76, a: 0 }, false, true);
        }; })(),
      },
      // (RENDER-INV) arriving somewhere: every 3 s the next outdoor area, its map drawn afresh as on a first visit
      // (the map is drawn in the background in the first seconds after an arrival: MAP-1, hud.mapTick)
      {
        id: 'arrival', label: 'Arriving in an area (Zeelich, Desert Island, the Hamalayi, Citadel), every 3 s',
        setup: () => { outdoor(-42, 2); },
        drive: (() => { let next = 0, k = 0; const seq = ['zeelich', 'desert', 'hamalayi', null]; return (t) => {
          if (t < next || G.trans) return;
          next = t + 3; const id = seq[k++ % seq.length];
          G.hud?._bases?.delete(id || 'citadel');
          if (id && G.regions.has(id)) G.enterRoom(id, null, false, true); else G.exitRoom({ x: -42, z: 2, a: 0 }, false, true);
        }; })(),
      },
      // (PERF-BATTERY-2) the Hamalayi on its own: since HAMALAYI-POLISH (glacier, vent, river, the rebels' camp) it has
      // 5–18 % more triangles a view; the arrival route only passes through it. Its arrival point, a small loop, the
      // camera turning as on the street.
      {
        id: 'hamalayi', label: 'The Hamalayi from its arrival point, camera turning',
        setup: () => { G.enterRoom('hamalayi', null, true, true); this.camera(); G.camRig.yaw = Math.PI / 4; },
        drive: (() => { let w = null; return (t, dt) => { const p = G.hero.pos; w ??= walk([{ x: p.x - 1.5, z: p.z - 1.5 }, { x: p.x + 1.5, z: p.z - 1.5 }, { x: p.x + 1.5, z: p.z + 1.5 }, { x: p.x - 1.5, z: p.z + 1.5 }], 1.2, p.y); w(t); G.camRig.yaw += dt * 0.35; }; })(),
      },
    ];
  }

  // the benchmark's camera: the free orbit, from the same heading, pitch and view every time (PERF-2)
  // (STABILIZATION: or the player's follow camera at Far, when a run asks for camera 'follow': setCamera)
  camera() {
    const C = this.g.camRig;
    if (this.camMode === 'follow') { C.setMode('follow'); C.setFollowDistance?.('far'); C.idleT = 0; C.snap?.(); return; }
    C.setMode('free'); C.view = 0; C.yaw = Math.PI * 0.85; C.pitch = 0.42; C.idleT = 0; C.snap?.();
  }

  // LAZY-REGIONS: the areas the routes go to (the house, the arena, the arrival's three regions), built before the
  // first route under the loading screen, so no route measures an area's first build
  prepareAreas() { return this.g.buildAreas(BENCH_AREAS, 'Preparing the benchmark…').then(() => { if (this.g._shadowWarm) { this.g._shadowWarm = false; this.g.warmShadows(); } }); }
  // runs every route at each quality; resolves with the report text
  // (opts, for probes and tests: routes: route ids to run; breakdown: false leaves the breakdowns out (breakdownMedium /
  //  breakdownHigh: false, one of them); played: false the "as played" runs)
  // (STABILIZATION: run({ qualities, camera: 'follow' | 'orbit', … }) — the options as the only argument also work)
  run(qualities = ['low', 'medium', 'high'], opts = {}) {
    if (qualities && !Array.isArray(qualities)) { opts = qualities; qualities = opts.qualities || ['low', 'medium', 'high']; }
    const G = this.g;
    if (this.running) return Promise.resolve(null);
    if (G.regions.missing(BENCH_AREAS).length) return this.prepareAreas().then(() => this.run(qualities, opts));
    const pick = (list) => (opts.routes ? list.filter((r) => opts.routes.includes(r.id)) : list);
    this.running = true;
    this.setCamera(opts.camera); this.secOn();
    const snap = G.snapshot(), quality0 = G.settings.quality, state0 = G.state, qAuto0 = !!G.settings.qualityAuto;
    const C = G.camRig, cam0 = { view: C.view, yaw: C.yaw, pitch: C.pitch };
    this.autoBefore = G.autoQ?.report?.() || null;   // (AUTO-QUALITY: what Auto ran before the fixed runs took the presets)
    G.benching = true; // (no saves while it runs; fixed settings: no automatic resolution, except in the "as played" runs)
    G.renderer.timer = G.perf.gpuTimer;   // (RENDER-INV: the GPU's own time per frame, where the browser has a timer query)
    if (G.perf.gpuTimer) G.perf.gpuTimer.stride = 1;
    const auto0 = G.renderer.autoRes; G.renderer.setAutoRes(false);
    G.hideScreens?.(); G.setState('play');
    const plan = [];
    for (const q of qualities) { for (const r of pick(this.routes())) plan.push({ q, r }); if (opts.played !== false) for (const r of pick(this.routes())) plan.push({ q, r, played: true }); }
    // breakdown: the street and the house at Medium, each with one cost taken away, to see what the GPU pays for
    const R = G.renderer, LP = G.lightPool, n0 = () => poolSize(G.settings.quality, R.battery);
    const variants = [
      { id: 'as is', apply() {}, undo() {} },
      { id: 'no shadows', apply() { R.renderer.shadowMap.enabled = false; G.warmGraphics(); }, undo() { R.applyDerived(); G.warmGraphics(); } },
      { id: 'no lamps', apply() { LP?.setSize(0); G.warmGraphics(); }, undo() { LP?.setSize(n0()); G.warmGraphics(); } },
      { id: 'res x0.6', apply() { R.autoRes = true; R.setDyn(0.6); }, undo() { R.autoRes = false; R.setDyn(1); } },
      // (RENDER-INV, diagnostics: what the shadow map's drawing costs apart from its use; what MSAA costs; what the
      //  draw batches save; none of these is a setting)
      { id: 'shadow map kept', apply() { R.renderer.shadowMap.autoUpdate = false; }, undo() { R.renderer.shadowMap.autoUpdate = true; } },
      { id: 'no MSAA', apply() { this._ms = R.composer.renderTarget1.samples; for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = 0; T.dispose(); } }, undo() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = this._ms; T.dispose(); } } },
      { id: '8-bit target', apply() { this._ty = R.composer.renderTarget1.texture.type; for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.texture.type = 1009; T.dispose(); } }, undo() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.texture.type = this._ty; T.dispose(); } } },
      { id: 'depth resolve on', apply() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.resolveDepthBuffer = true; T.resolveStencilBuffer = true; } }, undo() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.resolveDepthBuffer = false; T.resolveStencilBuffer = false; } } },
      // (choices that change the look a little, priced for the user: the battery profile's 5-read shadow filter (three's
      //  Basic type, patched in renderer.js: it was one read, hard-edged), a coarser shadow map, FXAA)
      { id: R.hwShadows ? 'shadow filter battery (4 reads)' : 'shadow filter 5 reads', apply() { this._t = R.renderer.shadowMap.type; R.renderer.shadowMap.type = 0; R.renderer.shadowMap.needsUpdate = true; G.warmGraphics(); }, undo() { R.renderer.shadowMap.type = this._t; R.renderer.shadowMap.needsUpdate = true; G.warmGraphics(); } },
      { id: 'shadow map 512', apply() { const sh = G.env.sun.shadow; sh.mapSize.set(512, 512); sh.map?.dispose(); sh.map = null; }, undo() { const sh = G.env.sun.shadow; sh.mapSize.set(1, 1); G.env.setShadowQuality(G.settings.quality); } },
      { id: 'FXAA instead of MSAA', apply() { this._ms = R.composer.renderTarget1.samples; for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = 0; T.dispose(); } R.fxaa.enabled = true; R.applyScale(); }, undo() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = this._ms; T.dispose(); } R.applyDerived(); } },
      // (GFX-LOOK: the output pass's own edge smoothing in place of MSAA (renderer.js OUTPUT_EDGES: what the battery profile
      //  draws), and 90 % resolution with and without its sharpening: compare each with 'as is' and 'no MSAA')
      { id: 'edges in output, no MSAA', apply() { this._ms = R.composer.renderTarget1.samples; for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = 0; T.dispose(); } R.applyScale(); }, undo() { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = this._ms; T.dispose(); } R.applyScale(); } },
      { id: 'no edge smoothing', apply() { R.edgeAA = false; R.applyScale(); }, undo() { R.edgeAA = true; R.applyScale(); } },
      { id: 'shadow pass writes colour (as before)', apply() { R.shadowDepthOnly = false; }, undo() { R.shadowDepthOnly = true; } },
      { id: 'res x0.9 sharpened', apply() { R.autoRes = true; R.setDyn(0.9); }, undo() { R.autoRes = false; R.setDyn(1); } },
      { id: 'res x0.9 not sharpened', apply() { R.sharpenOn = false; R.autoRes = true; R.setDyn(0.9); }, undo() { R.sharpenOn = true; R.autoRes = false; R.setDyn(1); } },
      // (GFX-LOOK-2: round 1's whole output-pass work in one line, at the 90 % Auto runs on battery: no edge smoothing and
      //  no sharpening — the pass reads one texel a pixel, as before GFX-LOOK; compare with 'res x0.9 sharpened')
      { id: 'res x0.9, output plain (no edges, no sharpen)', apply() { R.edgeAA = false; R.sharpenOn = false; R.autoRes = true; R.setDyn(0.9); }, undo() { R.edgeAA = true; R.sharpenOn = true; R.autoRes = false; R.setDyn(1); } },
      { id: 'draw batches off', apply() { if (G.drawBatch) G.drawBatch.enabled = false; }, undo() { if (G.drawBatch) G.drawBatch.enabled = true; } },
      // (PERF-BATTERY: the static shadow cache off (every caster drawn every frame, as before), and the battery profile
      //  the other way round from how this run is powered: on when plugged in, off on battery)
      { id: 'shadow cache off', apply() { if (G.shadowCache) G.shadowCache.enabled = false; }, undo() { if (G.shadowCache) G.shadowCache.enabled = true; } },
      { id: R.battery ? 'battery profile off' : 'battery profile on', apply() { this._bat = R.battery; G.setBattery(!this._bat); }, undo() { G.setBattery(this._bat); } },
      // (PERF-HIGH: the benchmark's own GPU timer queries off (no GPU time for this line): do they change the pace?)
      { id: 'GPU timer off', apply() { R.timer = null; }, undo() { R.timer = G.perf.gpuTimer; } },
      // (PERF-SUBMIT: this round's render-path savings undone — the live shadow pass walking the whole scene, every
      //  shadow batch through the 16-point test: compare its submit / sim CPU with 'as is')
      { id: 'PERF-SUBMIT off (as before)', apply() { MW.walk = false; if (G.shadowCull) G.shadowCull.prefilter = false; }, undo() { MW.walk = true; if (G.shadowCull) G.shadowCull.prefilter = true; } },
    ];
    // (STABILIZATION: the GPU investigator's groups — benchgpu.js — in the same Medium breakdown)
    try { for (const v of gpuVariants(G, R) || []) variants.push({ ...v, id: 'GPU group: ' + v.id }); } catch (e) { console.warn('benchgpu variants', e); }
    const brk = this.routes().filter((r) => r.id === 'street' || r.id === 'interior');
    if (opts.breakdown !== false && opts.breakdownMedium !== false) for (const r of brk) for (const v of variants) plan.push({ q: 'medium', r, v, short: true });
    // PERF-HIGH: the street at HIGH, one of its costs changed at a time (Medium's breakdown is capped by the display at
    // 60 and can't show what High pays for). Compare the milliseconds (GPU, submit), not the fps. Each line is a
    // candidate, not a setting: a 2048 map is coarser (and goes into the static shadow cache, shadowcache.js), MSAA 2×
    // smooths edges less, no bloom loses the glow, Medium's vegetation distances thin the far grass and trees.
    const SH = G.env.sun.shadow, mapSize = (n) => { SH.mapSize.set(n, n); SH.map?.dispose(); SH.map = null; };
    const samples = (n) => { for (const T of [R.composer.renderTarget1, R.composer.renderTarget2]) { T.samples = n; T.dispose(); } };
    const variantsHigh = [
      { id: 'as is', apply() {}, undo() {} },
      { id: 'shadow map 2048', apply() { mapSize(2048); }, undo() { SH.mapSize.set(1, 1); G.env.setShadowQuality(G.settings.quality); } },
      { id: 'no shadows', apply() { R.renderer.shadowMap.enabled = false; G.warmGraphics(); }, undo() { R.applyDerived(); G.warmGraphics(); } },
      { id: 'MSAA 2x', apply() { this._ms = R.composer.renderTarget1.samples; samples(2); }, undo() { samples(this._ms); } },
      { id: 'no bloom', apply() { R.bloomOn = false; R.applyDerived(); }, undo() { R.bloomOn = true; R.applyDerived(); } },
      { id: "Medium's vegetation", apply() { G.world?.setDetail?.('medium'); }, undo() { G.world?.setDetail?.(G.settings.quality); } },
      { id: 'res x0.6', apply() { R.autoRes = true; R.setDyn(0.6); }, undo() { R.autoRes = false; R.setDyn(1); } },
      { id: 'no lamps', apply() { LP?.setSize(0); G.warmGraphics(); }, undo() { LP?.setSize(n0()); G.warmGraphics(); } },
    ];
    const street = this.routes().find((r) => r.id === 'street');
    if (opts.breakdown !== false && opts.breakdownHigh !== false && street) for (const v of variantsHigh) plan.push({ q: 'high', r: street, v, short: true });
    const results = [];
    return new Promise((resolve) => {
      let i = -1, t = 0, cur = null, warm = 0, maxWarm = 0;
      const next = () => {
        i++;
        if (i >= plan.length) return finish();
        cur?.v?.undo();
        const prev = cur;
        cur = plan[i];
        if (G.settings.quality !== cur.q) {
          G.settings.quality = cur.q; G.applySettings();
          // (PERF-HIGH: a change to or from High rebuilds the shadow batches (shadowcull.js cellFor): the routes' areas now,
          //  under the preset change's hold, not on each one's next arrival)
          for (const r of [G.world?.root, ...BENCH_AREAS.map((id) => G.rooms?.[id]?.group)]) G.shadowCull?.prepare?.(r);
        }
        // (PERF-BATTERY-2: the automatic resolution on for the played runs, from ×1 at each preset's first; off otherwise)
        if (cur.played && !(prev?.played && prev.q === cur.q)) G.renderer.setAutoRes(true);
        else if (!cur.played && prev?.played) G.renderer.setAutoRes(false);
        G.benchAuto = !!cur.played;
        cur.res = []; cur.held = 0; cur.dyn = G.renderer.effScale();
        cur.cpu = cpuProbe(); cur.pw0 = G.power?.changes || 0;   // (PERF-HIGH: the processor's speed now; power changes so far)
        G.state = 'play'; cur.r.setup(); cur.v?.apply(); t = 0; warm = 0; maxWarm = 0;
        cur.p0 = G.renderer.renderer.info.programs.length; cur.pw = cur.p0;   // (PERF-ARRIVAL: programs compiled in the warm-up / the measured window)
        G.hud?.toast?.('bench_route', { n: i + 1, of: plan.length });
      };
      G.benchTick = (real) => {
        if (!cur) return;
        // (a preset change or a variant's shaders still compiling: the warm-up starts once they are ready)
        if (G.gfxHold) { warm = 0; t = 0; return; }
        t += real;
        G.state = 'play';
        cur.r.drive(t, real);
        if (cur.played && !cur.warmed) {
          // (as played: warm until the automatic resolution has settled)
          warm += real; maxWarm = Math.max(maxWarm, real * 1000);
          const e = G.renderer.effScale(); if (e !== cur.dyn) { cur.dyn = e; cur.held = 0; } else cur.held = (cur.held || 0) + 1;
          // (PERF-HIGH: settled, the route starts again from its beginning, with the factor it settled at, and is then
          //  warmed and measured exactly as a fixed run: the same path, camera and window. It used to be measured from
          //  wherever the warm-up had got to — another part of the loop: on Low the house measured 85 calls fixed and
          //  18 as played, a different view, not a different cost)
          if ((warm >= PLAY_MIN && cur.held >= PLAY_HOLD) || warm >= PLAY_MAX) { cur.warmed = true; cur.warmS = warm; cur.capped = cur.held < PLAY_HOLD; G.state = 'play'; cur.r.setup(); t = 0; warm = 0; }
          return;
        }
        // (the warm-up counts only once a scene change from the route's setup is over)
        if (warm < WARM) { if (!G.trans) warm += real; maxWarm = Math.max(maxWarm, real * 1000); if (warm >= WARM) { G.perf.reset(); cur.pw = G.renderer.renderer.info.programs.length; } return; }
        if (cur.played) cur.res.push(G.renderer.effScale());
        if (t >= WARM + (cur.short ? 4 : MEASURE)) {
          const s = G.perf.stats();
          // (FRAME-1) long frames: over 33 ms (a 30 fps frame missed), over 50 ms ("stalls"), how many of those were
          // spent behind a fully black screen (a scene change's fade or shader hold), and the three longest
          const buf = G.perf.buf, stalls = buf.filter((f) => f.ms > 50).length;
          const pacing = { over33: buf.filter((f) => f.ms > 33.4).length, over100: buf.filter((f) => f.ms > 100).length, stallsBlack: buf.filter((f) => f.ms > 50 && f.black).length,
            worst: buf.slice().sort((a, b) => b.ms - a.ms).slice(0, 3).map((f) => `${f.ms.toFixed(0)}${f.black ? ' (black)' : ''}`).join(', '),
            minMs: Math.min(...buf.map((f) => f.ms)),
            // (PERF-HIGH: every frame over 33 ms, in order: its length, when (s into the window), behind black or not)
            hitches: hitchList(buf) };
          const R = G.renderer;
          const cfg = G.graphicsConfig();
          const np = G.renderer.renderer.info.programs.length;
          const rs = cur.res, res = cur.played && rs.length ? { end: rs[rs.length - 1], min: Math.min(...rs), max: Math.max(...rs), mean: +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2), changes: rs.filter((x, k) => k && x !== rs[k - 1]).length, warmS: +cur.warmS.toFixed(1), capped: !!cur.capped,
            // (PERF-HIGH: the factor of every measured frame, as shares)
            hist: Object.entries(rs.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {})).sort((a, b) => b[0] - a[0]).map(([k, n]) => `×${k} ${Math.round((100 * n) / rs.length)}%`).join(' ') } : null;
          const row = { q: cur.q, id: cur.r.id, label: cur.r.label, s, stalls, pacing, warmMaxMs: +maxWarm.toFixed(0), cfg, v: cur.v?.id, played: !!cur.played, res, prog: { warm: cur.pw - cur.p0, measured: np - cur.pw },
            cpu: cur.cpu, power: (G.power?.changes || 0) - cur.pw0, limit: G.frameCapMs || 0 };
          results.push(row);
          // (PERF-HIGH) the "nothing drawn" probe, then the next route
          const iv = []; let last = null;
          G.benchIdle = (now) => {
            if (last != null) iv.push(now - last); last = now;
            if (iv.length >= IDLE_FRAMES) { G.benchIdle = null; row.idle = { p50: med(iv), min: +Math.min(...iv).toFixed(2), max: +Math.max(...iv).toFixed(2) }; next(); }
          };
        }
      };
      const finish = () => {
        cur?.v?.undo();
        G.benchTick = null; G.benchIdle = null; cur = null; G.benchAuto = false;
        // (AUTO-QUALITY: the fixed runs set presets by hand; Auto, if it was on, comes back with its own state)
        if (qAuto0) { G.settings.qualityAuto = true; G.settings.quality = G.autoQ.tier(); G.applySettings(); }
        else if (G.settings.quality !== quality0) { G.settings.quality = quality0; G.applySettings(); }
        G.resetCombat('drop');
        G.applySave(snap);
        G.benching = false; G.renderer.setAutoRes(auto0); G.renderer.timer = G.autoQ?.timer?.() ?? null;
        this.secOff(); const camMode = this.camMode; this.restoreCamera(cam0);
        G.setState(state0 === 'title' ? 'play' : state0 === 'pause' ? 'play' : state0);
        this.running = false;
        const text = this.report(results, camMode);
        console.log(text);
        resolve(text);
      };
      next();
    });
  }

  // STABILIZATION, phase 1: the benchmark's CPU sections (perf.js Sections) on while a run measures, off after
  secOn() { const G = this.g; if (G.perf.sec) return; const S = new Sections(); S.install(G); G.perf.sec = S; }
  secOff() { const G = this.g; G.perf.sec?.off(); G.perf.sec = null; }
  // (the camera option: 'follow' (the player's follow camera, at Far, driven along the route as in play) or 'orbit'
  //  (the benchmark's free orbit, the default); the player's own camera and distance are put back afterwards)
  setCamera(mode) { this.camMode = mode === 'follow' ? 'follow' : 'orbit'; }
  restoreCamera(cam0) { const G = this.g, C = G.camRig; C.setMode(G.settings.camera); C.setFollowDistance?.(G.settings.camDist); Object.assign(C, cam0); C.snap?.(); this.camMode = 'orbit'; }

  // STABILIZATION, phase 1: "visits" — what a session does to the frame over time, as played (Quality Auto or the
  // preset as set, the automatic resolution on, the governor running), on the given camera:
  //   cold     each route once, measured from its first frame (no warm-up): the first visit after the start
  //   repeat   `cycles` × each route (the arrival route: Zeelich, Desert Island, the Hamalayi, Citadel — region round trips)
  //   sustain  the first route for `sustainS` s on end
  // Per phase and route: fps, frame p50/p95/p99/max, the share of frames over the refresh, stalls (> 33 / 50 / 100 ms,
  // with how many were behind the black), every long frame with what ran in it, the game's CPU work and its CPU by
  // section; and a resource snapshot before the cycles, after them and after the sustained play (GPU geometries /
  // textures / programs / render targets, JS heap, scene objects, what is simulated, rAF callbacks / timers / intervals /
  // listeners registered by the game: growth between snapshots is what transitions left behind).
  //   game.bench.visits({ routes: ['street', 'arrival'], cycles: 5, sustainS: 180, camera: 'follow' })
  visits(opts = {}) {
    const G = this.g;
    if (this.running) return Promise.resolve(null);
    if (G.regions.missing(BENCH_AREAS).length) return this.prepareAreas().then(() => this.visits(opts));
    const ids = opts.routes || ['street', 'arrival'], cycles = opts.cycles ?? 5, sustainS = opts.sustainS ?? 180, coldS = opts.coldS ?? 8, repeatS = opts.repeatS ?? 12;
    const routes = ids.map((id) => this.routes().find((r) => r.id === id)).filter(Boolean);
    if (!routes.length) return Promise.resolve(null);
    this.running = true;
    this.setCamera(opts.camera);
    const snap = G.snapshot(), state0 = G.state, C = G.camRig, cam0 = { view: C.view, yaw: C.yaw, pitch: C.pitch }, t0 = performance.now();
    const auto0 = G.renderer.autoRes;
    G.benching = true; G.benchAuto = true; G.benchAutoQ = !!G.settings.qualityAuto; G.renderer.setAutoRes(G.settings.res !== 'full');
    G.renderer.timer = G.perf.gpuTimer; if (G.perf.gpuTimer) G.perf.gpuTimer.stride = 2;
    G.hideScreens?.(); G.setState('play');
    this.secOn();
    const plan = [];
    for (const r of routes) plan.push({ phase: 'cold', r, s: coldS });
    plan.push({ snap: 'before the cycles' });
    for (let k = 0; k < cycles; k++) for (const r of routes) plan.push({ phase: 'repeat', r, s: repeatS, k });
    plan.push({ snap: `after ${cycles} cycles` });
    if (sustainS > 0) plan.push({ phase: 'sustain', r: routes[0], s: sustainS }, { snap: `after ${sustainS} s sustained` });
    const segs = [], snaps = [{ at: 'start', res: resources(G) }];
    return new Promise((resolve) => {
      let i = -1, t = 0, cur = null;
      const rec = (f) => { if (cur) cur.frames.push(f); };
      G.perf.onRecord = rec;
      const next = () => {
        for (;;) {
          i++;
          if (i >= plan.length) return finish();
          const P = plan[i];
          if (P.snap) { snaps.push({ at: P.snap, res: resources(G) }); continue; }
          cur = { ...P, frames: [], cpu: cpuProbe(), state0: G.autoQ?.on?.() ? G.autoQ.label() : G.settings.quality };
          G.state = 'play'; P.r.setup(); t = 0;
          G.hud?.toast?.('bench_route', { n: segs.length + 1, of: plan.filter((x) => !x.snap).length });
          return;
        }
      };
      G.benchTick = (real) => {
        if (!cur) return;
        t += real; G.state = 'play';
        cur.r.drive(t, real);
        if (t >= cur.s) { cur.state1 = G.autoQ?.on?.() ? G.autoQ.label() : G.settings.quality; segs.push(cur); cur = null; next(); }
      };
      const finish = () => {
        G.benchTick = null; G.perf.onRecord = null; cur = null; this.secOff();
        G.benchAuto = false; G.benchAutoQ = false;
        G.resetCombat('drop'); G.applySave(snap);
        G.benching = false; G.renderer.setAutoRes(auto0); G.renderer.timer = G.autoQ?.timer?.() ?? null;
        this.restoreCamera(cam0);
        G.setState(state0 === 'title' ? 'play' : state0 === 'pause' ? 'play' : state0);
        this.running = false;
        const text = this.reportVisits(segs, snaps, { ids, cycles, sustainS, coldS, repeatS, camera: opts.camera === 'follow' ? 'follow' : 'orbit', t0 });
        console.log(text);
        resolve(text);
      };
      next();
    });
  }
  // (frame records → the numbers of a phase: perf.js's record fields)
  phaseStats(F) {
    if (!F.length) return null;
    const G = this.g, ref = G.refreshMs?.() || 1000 / 60;
    const pc = (a, p) => { const v = a.slice().sort((x, y) => x - y); return +v[Math.min(v.length - 1, Math.floor(p * v.length))].toFixed(1); };
    const ms = F.map((f) => f.ms), work = F.map((f) => (f.sim || 0) + (f.render || 0)), real = F.reduce((s, f) => s + f.real, 0);
    const over = (x) => F.filter((f) => f.ms > x);
    const sec = {}; const S = F.filter((f) => f.sec);
    for (const k of [...new Set(S.flatMap((f) => Object.keys(f.sec.ms)))]) { const v = S.map((f) => f.sec.ms[k] || 0); sec[k] = { p50: pc(v, 0.5), mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2), calls: +(S.reduce((a, f) => a + (f.sec.n[k] || 0), 0) / S.length).toFixed(1) }; }
    return { frames: F.length, fps: +(F.length / Math.max(real, 1e-6)).toFixed(1), p50: pc(ms, 0.5), p95: pc(ms, 0.95), p99: pc(ms, 0.99), max: pc(ms, 1),
      overRefresh: +((100 * F.filter((f) => f.ms > ref * 1.25).length) / F.length).toFixed(1), o33: over(33.4).length, o50: over(50).length, o100: over(100).length,
      black: over(33.4).filter((f) => f.black).length, workP50: pc(work, 0.5), workP95: pc(work, 0.95), calls: pc(F.map((f) => f.calls || 0), 0.5),
      lag: F[0].lag != null ? pc(F.map((f) => f.lag || 0), 0.5) : null, rafMax: Math.max(...F.map((f) => f.raf || 0)), sec, hitches: hitchList(F) };
  }
  reportVisits(segs, snaps, o) {
    const G = this.g, L = [];
    L.push(`LBA3: The Awakening benchmark — visits (cold entry, repeated visits, sustained play) · build ${G.version || '?'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    L.push(`GPU (as reported by the browser): ${G.perf.gpu} · power: ${G.power ? G.power.describe() : '?'} · window ${innerWidth}×${innerHeight} · devicePixelRatio ${devicePixelRatio} · display refresh as measured ${(G.refreshMs?.() || 0).toFixed(1)} ms`);
    if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(G.perf.gpu || '')) L.push('NOTE: software rendering: every number below is CPU-drawn');
    L.push(`camera: ${o.camera === 'follow' ? 'Follow (the player\'s follow camera at Far, along the route)' : 'orbit (the benchmark\'s free orbit)'} · quality ${G.settings.qualityAuto ? 'Auto' : G.settings.quality} · routes ${o.ids.join(', ')} · cold ${o.coldS} s each · ${o.cycles} cycles × ${o.repeatS} s · sustained ${o.sustainS} s`);
    L.push('', 'phase    route      frames   fps   frame p50 / p95 / p99 / max ms   > refresh   >33 / >50 / >100 (behind black)   CPU work p50 / p95   calls   late p50   state');
    const groups = [];
    for (const sg of segs) { const key = sg.phase + ' ' + sg.r.id; let g = groups.find((x) => x.key === key); if (!g) groups.push((g = { key, phase: sg.phase, id: sg.r.id, F: [], segs: [] })); g.F.push(...sg.frames); g.segs.push(sg); }
    for (const g of groups) {
      const s = this.phaseStats(g.F); if (!s) { L.push(`  ${g.phase.padEnd(8)} ${g.id.padEnd(9)} no frames`); continue; }
      const st = [...new Set(g.segs.flatMap((x) => [x.state0, x.state1]))].join(' / ');
      L.push(`  ${g.phase.padEnd(8)} ${g.id.padEnd(9)} ${String(s.frames).padStart(6)} ${String(s.fps).padStart(5)}   ${s.p50} / ${s.p95} / ${s.p99} / ${s.max}   ${String(s.overRefresh).padStart(5)} %   ${s.o33} / ${s.o50} / ${s.o100} (${s.black})   ${s.workP50} / ${s.workP95}   ${s.calls}   ${s.lag ?? '?'}   ${st}`);
      const order = ['people', 'hero', 'enemies', 'physics', 'interact', 'camera', 'other sim', 'submit other', 'submit main', 'submit shadow', 'submit post'];
      const keys = [...order.filter((k) => s.sec[k]), ...Object.keys(s.sec).filter((k) => !order.includes(k))];
      if (keys.length) L.push(`      CPU by section, p50 / mean ms (calls a frame): ${keys.map((k) => `${k} ${s.sec[k].p50} / ${s.sec[k].mean} (${s.sec[k].calls})`).join(' · ')}`);
      if (s.rafMax > 1) L.push(`      rAF callbacks requested in one frame: up to ${s.rafMax} (1 is the game's loop)`);
      if (s.hitches.length) L.push(`      every frame over 33 ms: ${s.hitches.slice(0, 14).join(' ')}${s.hitches.length > 14 ? ` … +${s.hitches.length - 14}` : ''}`);
    }
    L.push('', 'resources (GPU: geometries / textures / programs / render targets · JS heap MB · scene objects (meshes, shown) · people / enemies / room updaters · rAF callbacks asked in all / timeouts set in all / intervals alive / listeners alive):');
    for (const x of snaps) { const r = x.res; L.push(`  ${x.at.padEnd(22)} ${r.geometries} / ${r.textures} / ${r.programs} / ${r.renderTargets} · ${r.heapMB ?? '?'} MB (of ${r.heapTotalMB ?? '?'}) · ${r.objects} (${r.meshes}, ${r.shown}) · ${r.npcs} / ${r.enemies} / ${r.roomUpdaters} · ${r.rafRequested} / ${r.timeouts} / ${r.intervals} / ${r.listeners}`); }
    // listeners that grew between the first snapshot after the cold visits and the last: what transitions left behind
    const a = snaps.find((x) => x.at === 'before the cycles')?.res, b = snaps[snaps.length - 1]?.res;
    if (a && b) {
      const grew = Object.keys({ ...a.listenersByKind, ...b.listenersByKind }).map((k) => [k, (b.listenersByKind[k] || 0) - (a.listenersByKind[k] || 0)]).filter(([, d]) => d !== 0);
      L.push(`  listeners that changed over the cycles and the sustained play: ${grew.length ? grew.map(([k, d]) => `${k} ${d > 0 ? '+' : ''}${d}`).join(' · ') : 'none'}`);
      L.push(`  growth over the cycles and the sustained play: geometries ${b.geometries - a.geometries} · textures ${b.textures - a.textures} · programs ${b.programs - a.programs} · render targets ${b.renderTargets - a.renderTargets} · heap ${a.heapMB != null ? (b.heapMB - a.heapMB).toFixed(1) + ' MB' : '?'} · scene objects ${b.objects - a.objects} · intervals ${b.intervals - a.intervals} (timeouts set meanwhile ${b.timeouts - a.timeouts}, rAF callbacks asked ${b.rafRequested - a.rafRequested})`);
    }
    L.push('', `Frame time includes the GPU (the browser waits for it); "> refresh": frames longer than 1.25 refresh intervals; "CPU work" is the game's simulation + render submission; sections are exclusive (a nested one counts only in the inner); "late": how late the frame callback ran. Took ${((performance.now() - o.t0) / 60000).toFixed(1)} min.`);
    return L.join('\n');
  }

  // (FRAME-1) what a route's typical frame waits on, from its own medians: the game's CPU work (simulation + render
  // submission) against the whole frame interval. Mostly CPU: fewer draw calls / simpler scenes help, a lower
  // resolution does not. Mostly the rest: the GPU (pixels, shadows, MSAA, lamps) or the display's pacing. An estimate.
  // RENDER-INV: with the GPU's own time (timer query) the estimate compares both sides directly.
  // PERF-HIGH: from the frames that missed a 60 Hz refresh (over 20 ms), not the median: a run at 45 fps can have a
  // 16.7 ms median. Then CPU (simulation + submission, per frame, p95) against the GPU's own time (p95).
  bound(s) {
    const P = s.pace, n = s.frames || 1;
    if (P) {
      const missed = P.long / n, slow = P.slow / n, gpu = s.gpuMs?.p95;
      if (missed < 0.02 && slow < 0.5) return `keeps up with a 60 Hz display (${(100 * missed).toFixed(1)} % of frames missed a refresh)`;
      if (missed < 0.02) return `held a little over the refresh (${Math.round(100 * slow)} % of frames 17.2–20 ms) with the work inside it: pacing (see "frame pacing" below)`;
      const head = `${(100 * missed).toFixed(1)} % of frames missed a refresh · `;
      if (gpu != null) return head + (gpu >= P.workP95 ? `GPU (p95: GPU ${gpu} ms vs CPU ${P.workP95} ms: resolution, shadows, MSAA, lamps)` : `CPU (p95: CPU ${P.workP95} ms vs GPU ${gpu} ms: draw calls, simulation)`);
      return head + (P.workP95 >= 15 ? `CPU (the game's own work p95 ${P.workP95} ms)` : `GPU or waiting (the game's own work p95 ${P.workP95} ms)`);
    }
    const f = s.frameMs.p50, cpu = s.simMs.p50 + s.renderMs.p50;
    if (f <= 17.5) return 'keeps up with a 60 Hz display';
    if (s.gpuMs) return s.gpuMs.p50 >= cpu ? `GPU (GPU ${s.gpuMs.p50} ms vs CPU ${cpu.toFixed(1)} ms a frame: resolution, shadows, MSAA, lamps)` : `CPU (CPU ${cpu.toFixed(1)} ms vs GPU ${s.gpuMs.p50} ms a frame: draw calls, simulation)`;
    return cpu >= 0.75 * f ? `CPU (${cpu.toFixed(1)} of ${f} ms is the game's own work: draw calls)` : `GPU (${cpu.toFixed(1)} of ${f} ms is CPU work; the rest is waiting: resolution, shadows, MSAA, lamps)`;
  }

  // (PERF-HIGH) what held the pace back, from every route: the runs whose frames sat a little over the refresh
  // (most intervals 17.2–20 ms) although the game's CPU work and the GPU's time were well within it, against the
  // refresh measured with nothing drawn. An estimate in words; the numbers are on each route's line.
  paceVerdict(results) {
    const R = results.filter((x) => x.s?.pace);
    if (!R.length) return [];
    const idle = med(R.map((x) => x.idle?.p50).filter((v) => v != null)), cpu = R.map((x) => x.cpu).filter((v) => v != null);
    const flat = R.filter((x) => { const s = x.s, P = s.pace, cpuMs = P.work, gpu = s.gpuMs?.p50 ?? 0; return P.slow > 0.5 * s.frames && cpuMs < 12 && gpu < 12; });
    const out = [`frame pacing: nothing drawn, the refresh came every ${idle ?? '?'} ms (median over the routes)`
      + ` · CPU probe ${cpu.length ? `${Math.min(...cpu)}–${Math.max(...cpu)} ms (higher is slower: a rise over the run means the processor was clocked down)` : '?'}`
      + ` · runs held a little over the refresh with light work: ${flat.length ? flat.map((x) => `${x.q} ${x.id}${x.v ? ' · ' + x.v : ''}${x.played ? ' (as played)' : ''}`).join(', ') : 'none'}`];
    if (flat.length) {
      const fi = med(flat.map((x) => x.idle?.p50).filter((v) => v != null));
      out.push(fi != null && fi > 17.2 ? `  → with nothing drawn the refresh was ${fi} ms too: the display / OS (refresh rate, a power or variable-refresh mode) set that pace, not the game`
        : `  → with nothing drawn the refresh kept ${fi ?? '?'} ms: the frames waited on something beyond the game's own CPU work and GPU time (the browser's GPU process or compositor); compare the 'GPU timer off' breakdown line`);
    }
    return out;
  }

  // (AUTO-QUALITY) the governor's log in lines
  decisions(from = 0) {
    const L = this.g.autoQ?.log || [];
    return L.filter((e) => e.t >= from).map((e) => `    ${(e.t / 1000).toFixed(1).padStart(7)} s · ${e.kind}${e.side ? ' ' + e.side : ''}${e.what ? ': ' + e.what : ''}${e.why ? ' — ' + e.why : ''} → ${e.state}${e.pending ? ` (→ ${e.pending} at the next scene change or menu)` : ''}`);
  }

  // AUTO-QUALITY: "as the player plays" — Quality Auto on, the governor running as in play, every route once in a row,
  // each warmed WARM s and measured opts.measure (20) s, nothing reset between them (the knobs carry over as in play).
  // It starts from this machine's state (opts.fromTop: from High, to watch it come down). The report gives each route's
  // frames, every hitch with what ran in it, the share of frames at each state, and every decision with its reason.
  runAuto(opts = {}) {
    const G = this.g, A = G.autoQ;
    if (this.running || !A) return Promise.resolve(null);
    if (G.regions.missing(BENCH_AREAS).length) return this.prepareAreas().then(() => this.runAuto(opts));
    const pick = (list) => (opts.routes ? list.filter((r) => opts.routes.includes(r.id)) : list);
    this.running = true;
    this.setCamera(opts.camera); this.secOn();
    const snap = G.snapshot(), state0 = G.state, set0 = { auto: !!G.settings.qualityAuto, q: G.settings.quality };
    const C = G.camRig, cam0 = { view: C.view, yaw: C.yaw, pitch: C.pitch }, t0 = performance.now();
    if (!G.settings.qualityAuto) { G.settings.qualityAuto = true; G.settings.quality = A.tier(); G.applySettings(); }
    const gov0 = A.gov.enabled; if (opts.force) A.gov.enabled = true;   // (probes on a software renderer)
    if (opts.fromTop) { A.gov.setProfile(0, 'benchmark: from High, evaluated', { commitNow: true, t: performance.now() }); A.applyAll(); G.warmGraphics(); }
    const start = A.state();
    G.benching = true; G.benchAutoQ = true;
    G.renderer.timer = G.perf.gpuTimer; if (G.perf.gpuTimer) G.perf.gpuTimer.stride = 2;
    G.hideScreens?.(); G.setState('play');
    const plan = pick(this.routes()), results = [], MEASURE_A = opts.measure ?? 20;
    return new Promise((resolve) => {
      let i = -1, t = 0, warm = 0, cur = null;
      const next = () => {
        i++;
        if (i >= plan.length) return finish();
        cur = { r: plan[i], frames: [], cpu: cpuProbe(), state0: A.label() };
        G.state = 'play'; cur.r.setup(); t = 0; warm = 0;
        G.hud?.toast?.('bench_route', { n: i + 1, of: plan.length });
      };
      G.benchTick = (real) => {
        if (!cur || G.gfxHold) return;
        t += real; G.state = 'play';
        cur.r.drive(t, real);
        if (warm < WARM) { if (!G.trans) warm += real; if (warm >= WARM) { G.perf.reset(); cur.tm = performance.now(); } return; }
        cur.frames.push(A.label());
        if (t >= WARM + MEASURE_A) {
          const s = G.perf.stats(), buf = G.perf.buf, share = {};
          for (const l of cur.frames) share[l] = (share[l] || 0) + 1;
          results.push({ id: cur.r.id, s, cpu: cur.cpu, state0: cur.state0, state1: A.label(), share, n: cur.frames.length,
            over33: buf.filter((f) => f.ms > 33.4).length, over50: buf.filter((f) => f.ms > 50).length, over100: buf.filter((f) => f.ms > 100).length, black: buf.filter((f) => f.ms > 33.4 && f.black).length,
            hitches: hitchList(buf) });
          next();
        }
      };
      const finish = () => {
        G.benchTick = null; cur = null; G.benchAutoQ = false; A.gov.enabled = gov0;
        G.resetCombat('drop'); G.applySave(snap);
        G.benching = false; G.renderer.timer = A.timer() ?? null;
        if (!set0.auto) { G.settings.quality = set0.q; G.settings.qualityAuto = false; G.applySettings(); }
        this.secOff(); const camMode = this.camMode; this.restoreCamera(cam0);
        G.setState(state0 === 'title' ? 'play' : state0 === 'pause' ? 'play' : state0);
        this.running = false;
        const text = this.reportAuto(results, start, t0, camMode);
        console.log(text);
        resolve(text);
      };
      next();
    });
  }
  reportAuto(results, start, t0, camMode = 'orbit') {
    const G = this.g, A = G.autoQ, lines = [];
    lines.push(`LBA3: The Awakening benchmark — Quality Auto as played · build ${G.version || '?'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    lines.push(`GPU (as reported by the browser): ${G.perf.gpu} · power: ${G.power ? G.power.describe() : '?'} · window ${innerWidth}×${innerHeight} · devicePixelRatio ${devicePixelRatio} · frame-rate limit ${G.frameCapMs ? (1000 / G.frameCapMs).toFixed(0) : 'off'}`);
    { const D = typeof window !== 'undefined' ? window.desktop?.display?.() : null; if (D && !D.error) lines.push(`display (as the OS reports it): ${D.hz ?? '?'} Hz · ${D.size} · ${D.fullscreen ? 'fullscreen' : 'windowed'}`); }
    if (A.sys) lines.push(`processor (as the OS reports it): ${A.sys.cpu} · ${A.sys.cores} logical cores · ${A.sys.memGB} GB memory`);
    if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(G.perf.gpu || '')) lines.push('NOTE: software rendering: every number below is CPU-drawn');
    lines.push(`camera: ${camMode === 'follow' ? "Follow (the player's follow camera at Far)" : "orbit (the benchmark's free orbit)"}`);
    lines.push(`Auto at the start: ${start.label} (gpu ${start.g} · cpu ${start.c}; ${A.source}${start.cached ? `, cached ${start.cached.src} ${start.cached.at}` : ''}) · GPU timer: ${G.perf.gpuTimer ? 'yes' : 'no'}`);
    lines.push('', 'route        fps   frame p50 / p95 / p99 / max ms   >33 / >50 / >100 (behind black)   GPU p50 / p95   CPU work p50 / p95   state at start -> end');
    for (const x of results) {
      const s = x.s; if (!s) { lines.push(`  ${x.id}: no frames`); continue; }
      lines.push(`  ${x.id.padEnd(10)} ${String(s.fps).padStart(5)}   ${s.frameMs.p50} / ${s.frameMs.p95} / ${s.frameMs.p99} / ${s.frameMs.max}   ${x.over33} / ${x.over50} / ${x.over100} (${x.black})   ${s.gpuMs ? `${s.gpuMs.p50} / ${s.gpuMs.p95}` : 'n/a'}   ${s.pace?.work ?? '?'} / ${s.pace?.workP95 ?? '?'}   ${x.state0} -> ${x.state1}`);
      lines.push(`      frames at each state: ${Object.entries(x.share).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${Math.round((100 * n) / x.n)} %`).join(' · ')} · calls ${s.calls} (shadow ${s.shadowCalls}) · triangles ${(s.tris / 1000).toFixed(0)}k · CPU probe ${x.cpu} ms`
        + (s.pace ? ` · pacing: on the refresh ${Math.round((100 * s.pace.on) / s.frames)} % · 17.2–20 ms ${Math.round((100 * s.pace.slow) / s.frames)} % · longer ${Math.round((100 * s.pace.long) / s.frames)} % · callback late p50 ${s.pace.lag ?? '?'} (p95 ${s.pace.lagP95 ?? '?'}) ms · uploads a frame p50 ${s.pace.up ?? '?'} (${s.pace.upKB != null ? s.pace.upKB.toFixed(0) : '?'} KB)` : ''));
      if (x.hitches.length) lines.push(`      every frame over 33 ms: ${x.hitches.slice(0, 12).join(' ')}${x.hitches.length > 12 ? ` … +${x.hitches.length - 12}` : ''}`);
      if (s.cpu) lines.push(`      CPU by section, p50 / mean ms (calls a frame): ${secLine(s.cpu)}`);
    }
    { const DB = G.drawBatch, SC = G.shadowCull; let left = 0, members = 0; for (const A of DB?.areas?.values?.() || []) { left += A.outs?.length || 0; members += A.members.length; }
      lines.push('', `draw batches: ${DB?.builds ?? 0} area builds, ${(DB?.buildMs ?? 0).toFixed(0)} ms in all · pieces in batches now ${members}, left and drawn on their own ${left}, rejoined at scene changes ${DB?.readmitted ?? 0} · shadow batches: ${SC?.builds ?? 0} area builds, ${(SC?.buildMs ?? 0).toFixed(0)} ms`); }
    const D = this.decisions(t0 - 1);
    lines.push('', `Auto's decisions during the run (s since the page opened · what · why -> the state after):`, ...(D.length ? D : ['    none (it held its state)']));
    lines.push('', `Auto now: ${A.label()}`, ...A.report().slice(1));
    lines.push('', 'Frame time includes the GPU (the browser waits for it); "CPU work" is the game\'s own simulation + render submission per frame; "GPU" the GPU\'s own time (timer query, every other frame).');
    return lines.join('\n');
  }

  report(results, camMode = 'orbit') {
    const G = this.g;
    const v = G.version || '?';
    const lines = [];
    lines.push(`LBA3: The Awakening benchmark · build ${v} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    lines.push(`camera: ${camMode === 'follow' ? "Follow (the player's follow camera at Far)" : "orbit (the benchmark's free orbit)"}`);
    lines.push(`GPU (as reported by the browser): ${G.perf.gpu} · preset picked for it on a first start: ${gpuQuality(G.perf.gpu)} · playing on: ${G.settings.quality} · automatic resolution: ${G.settings.res !== 'full' ? 'on' : 'off'} (off in the fixed runs, on in the "as played" runs)`);
    // (FRAME-1: the GPU string is the acceleration diagnostic: a software rasteriser here means no GPU at all)
    if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(G.perf.gpu || '')) lines.push('NOTE: software rendering (no GPU acceleration in this browser/app): every number below is CPU-drawn');
    // (PERF-BATTERY: how this run was powered, and what the battery profile did to the presets)
    { const P = G.power, B = G.renderer.batteryProfile?.();
      lines.push(`power: ${P ? P.describe() : '?'} (source: ${P?.source === 'electron' ? 'the desktop app (Electron powerMonitor)' : P?.source === 'browser' ? 'the browser (navigator.getBattery)' : 'none'}) · battery profile: ${G.renderer.battery ? `applied (Medium/High: shadow filter of ${G.renderer.hwShadows ? "4 hardware-filtered reads instead of Medium's 9" : "5 reads instead of PCF's 17"}, MSAA off${G.renderer.hwShadows ? ' (edges smoothed in the output pass)' : ''}, automatic resolution down to ×${B?.minScale ?? 0.5}; Low unchanged)` : 'not applied (the presets as they are)'}`); }
    { const C = G.shadowCache; if (C) lines.push(`static shadow cache: ${C.enabled ? 'on' : 'off'} · since start: ${C.stats.full} full builds, ${C.stats.sliced} slices, ${C.stats.swaps} swaps, ${C.stats.live} frames from the cache, ${C.stats.bypass} without (High's 4096 map, Low, warm-ups)`); }
    lines.push(`window ${innerWidth}×${innerHeight} · devicePixelRatio ${devicePixelRatio} · user agent ${navigator.userAgent.match(/(Electron|Chrome)\/[\d.]+/g)?.join(' ') || navigator.userAgent}`);
    // (PERF-HIGH) the display as the OS reports it, and Chromium's GPU feature status (desktop app only)
    { const D = typeof window !== 'undefined' ? window.desktop?.display?.() : null;
      if (D && !D.error) lines.push(`display (as the OS reports it): ${D.hz ?? '?'} Hz · ${D.size} at scale ${D.scale} · window ${D.fullscreen ? 'fullscreen' : 'windowed'}${D.focused ? '' : ' (not focused)'} · GPU features: ${D.gpu ? Object.entries(D.gpu).filter(([k]) => /webgl2?$|gpu_compositing|rasterization|video_decode/.test(k)).map(([k, v]) => `${k} ${v}`).join(', ') : '?'}`);
      else lines.push('display: refresh rate not known (a browser does not report it; the desktop app does)'); }
    // (FRAME-2: the refresh as requestAnimationFrame shows it: the rolling median at the report, and the median of the
    //  "nothing drawn" probes, where neither the game's work nor its GPU time can hold a frame back)
    { const r = G.refreshMs?.(), idle = med(results.map((x) => x.idle?.p50).filter((v) => v != null)), hz = (ms) => (ms ? (1000 / ms).toFixed(1) : '?');
      lines.push(`display refresh measured from requestAnimationFrame: ${r ? `${hz(r)} Hz (median interval ${r.toFixed(2)} ms over the last 32 frames)` : '?'} · with nothing drawn: ${idle != null ? `${hz(idle)} Hz (median ${idle} ms over the routes' probes)` : '?'} · frame-rate limit at or above the refresh: no limiting, requestAnimationFrame sets the pace`); }
    lines.push(`camera: free orbit from a fixed heading for every route (your camera setting: ${G.settings.camera}) · WEBGL_multi_draw ${G.perf.multiDraw ? 'yes' : 'no'}`);
    // (AUTO-QUALITY: the quality setting, Auto's state before this run and its decisions in this session; the processor)
    if (G.autoQ) { lines.push(...(this.autoBefore || G.autoQ.report())); const D = this.decisions(); if (D.length) lines.push(`  Auto's decisions this session (s since the page opened · what · why → state after):`, ...D.slice(-25)); }
    { const Y = G.autoQ?.sys; if (Y) lines.push(`processor (as the OS reports it): ${Y.cpu} · ${Y.cores} logical cores · ${Y.memGB} GB memory`); }
    // (FRAME-1: the shortest frame interval seen is the display's refresh interval if the game ever kept up with it)
    const minMs = Math.min(...results.map((x) => x.pacing?.minMs ?? Infinity));
    lines.push(`frame-rate limit: ${G.settings.fps === '30' || G.settings.fps === '60' ? G.settings.fps : 'off'} (off while measuring) · shortest frame interval seen ${Number.isFinite(minMs) ? minMs.toFixed(1) + ' ms' : '?'} (not the display's rate: a late frame's successor can come early; see the display line and "nothing drawn")`);
    if (G.perf.load) {
      // (LAZY-REGIONS: startup builds Citadel and the areas a new game or the newest save starts in; every other area is
      //  built the first time it is needed: which were built at startup, which since, and how long each took)
      const L = G.perf.load, S = G.regions?.summary?.() || L.regions || { startup: [], later: [], deferred: [] }, sec = (ms) => (ms / 1000).toFixed(1);
      const list = (a) => a.map((x) => `${x.group} ${sec(x.ms)}`).join(', ') || 'none';
      lines.push(`startup: build ${sec(L.total)} s (Citadel ${sec(L.citadel ?? 0)} s; areas built at startup: ${list(S.startup)}) · shader preparation ${sec(L.shaders)} s`
        // (PERF-ARRIVAL: the preparation's parts, s, and the programs it left ready)
        + (L.prep ? ` (${Object.entries(L.prep).map(([k, ms]) => `${k} ${sec(ms)}`).join(', ')}) · ${L.programs ?? '?'} shader programs ready at the title` : ''));
      lines.push(`areas built since startup, on their first visit (s): ${list(S.later)} · not built yet: ${S.deferred.length ? S.deferred.join(', ') : 'none'}`);
    }
    { const M = G.renderer.renderer.info.memory, heap = performance.memory?.usedJSHeapSize;
      lines.push(`memory: ${M.geometries} geometries and ${M.textures} textures on the GPU · ${G.renderer.renderer.info.programs?.length ?? '?'} shader programs (every preset and breakdown variant run has its own)${heap ? ` · JavaScript heap ${(heap / 1048576).toFixed(0)} MB` : ''} · GPU timer: ${G.perf.gpuTimer ? 'yes' : 'not offered by this browser'} · parallel shader compile (KHR_parallel_shader_compile): ${G.renderer.renderer.extensions?.has?.('KHR_parallel_shader_compile') ? 'yes' : 'no'}`); }
    // (PERF-CALLS: the draw batches' work — first builds, pieces that left a batch (drawn on their own since) and
    //  pieces that rejoined behind a scene change's black — and the shadow batches' first builds)
    { const DB = G.drawBatch, SC = G.shadowCull; let left = 0, members = 0; for (const A of DB?.areas?.values?.() || []) { left += A.outs?.length || 0; members += A.members.length; }
      lines.push(`draw batches: ${DB?.builds ?? 0} area builds, ${(DB?.buildMs ?? 0).toFixed(0)} ms in all · pieces in batches now ${members}, left and drawn on their own ${left}, rejoined at scene changes ${DB?.readmitted ?? 0} (${(DB?.readmitMs ?? 0).toFixed(0)} ms) · shadow batches: ${SC?.builds ?? 0} area builds, ${(SC?.buildMs ?? 0).toFixed(0)} ms`); }
    let q = null;
    const brk = results.filter((x) => x.v);
    const fixed = results.filter((r) => !r.v && !r.played), played = results.filter((r) => r.played);
    const playedLine = (x) => {
      const s = x.s, P = x.pacing, r = x.res;
      if (!s) return `    ${x.id}: no frames`;
      return `    ${x.id.padEnd(10)} ${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} p99 ${s.frameMs.p99} max ${s.frameMs.max} ms · >33ms ${P.over33} of ${s.frames}`
        + ` · resolution settled at ×${r ? r.end : '?'}${r ? ` (×${r.min}–${r.max} while measured, mean ×${r.mean}, ${r.changes} change${r.changes === 1 ? '' : 's'}; ${r.capped ? `NOT settled within ${r.warmS} s` : `settled after ${r.warmS} s`}; per frame ${r.hist})` : ''} · render pixel ratio ${x.cfg.pr}`
        + `${s.gpuMs ? ` · GPU time p50 ${s.gpuMs.p50} (p95 ${s.gpuMs.p95}) ms` : ''} · sim CPU p50 ${s.simMs.p50} · render submit CPU p50 ${s.renderMs.p50} ms · lamps lit ${s.lamps ?? '?'} · draw calls ${s.calls} · triangles ${(s.tris / 1000).toFixed(0)}k` + paceOf(x);
    };
    // (PERF-HIGH) a route's pacing: the share of frame intervals on a 60 Hz refresh (≤ 17.2 ms), a little slower
    // (17.2–20 ms) and longer; the game's own CPU work a frame; how late the frame callback ran; the refresh with
    // nothing drawn right after; the CPU probe; anything that may have changed the pace while it ran
    const paceOf = (x) => {
      const s = x.s, P = s?.pace; if (!P) return '';
      const n = s.frames || 1, pc = (k) => Math.round((100 * P[k]) / n);
      const extra = [x.limit ? `frame-rate limit ${(1000 / x.limit).toFixed(0)} fps active` : '', P.bg ? `${P.bg} frames in the background` : '', x.power ? `power source changed ${x.power}×` : '', s.gpuMs?.disjoint ? `GPU timer disjoint ${s.gpuMs.disjoint}× (GPU clock/power change)` : ''].filter(Boolean).join(', ');
      return ` · pacing: on the refresh ${pc('on')} % · 17.2–20 ms ${pc('slow')} % · longer ${pc('long')} % · game CPU work p50 ${P.work} ms · callback late p50 ${P.lag ?? '?'} (p95 ${P.lagP95 ?? '?'}) ms · uploads a frame p50 ${P.up ?? '?'} (${P.upKB != null ? P.upKB.toFixed(0) : '?'} KB, p95 ${P.upKBp95 != null ? P.upKBp95.toFixed(0) : '?'} KB)`
        + `${x.idle ? ` · nothing drawn: ${x.idle.p50} ms (${x.idle.min}–${x.idle.max})` : ''} · CPU probe ${x.cpu ?? '?'} ms${extra ? ' · ' + extra : ''}`;
    };
    for (const x of fixed) {
      if (x.q !== q) {
        q = x.q; const c = x.cfg;
        lines.push('', `quality ${q}: render pixel ratio ${c.pr} · MSAA ${c.msaa}× · FXAA ${c.fxaa ? 'on' : 'off'}${c.edgeAA ? ' · edges smoothed in the output pass' : ''}${c.sharpen ? ` · sharpening ${c.sharpen}` : ''} · shadows ${c.shadows ? `on (${c.shadowMap} px, filter ${c.shadowFilter})` : 'off'} · battery profile ${c.battery ? 'on' : 'off'} · automatic resolution floor ×${c.minScale} · bloom ${c.bloom ? 'on' : 'off'} · lamp lights ${c.lamps} · grass/flowers to ${c.smallFar} m · trees detailed to ${c.treeNear} m`);
      }
      const s = x.s;
      if (!s) { lines.push(`  ${x.id}: no frames`); continue; }
      const P = x.pacing;
      lines.push(`  ${x.id.padEnd(10)} ${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} p99 ${s.frameMs.p99} max ${s.frameMs.max} ms · stalls>50ms ${x.stalls}${P ? ` (${P.stallsBlack} behind black) · >33ms ${P.over33} >100ms ${P.over100 ?? 0} of ${s.frames} · longest ${P.worst} ms${P.hitches?.length ? ` · every frame over 33 ms (length@time): ${P.hitches.slice(0, 16).join(' ')}${P.hitches.length > 16 ? ` … +${P.hitches.length - 16}` : ''}` : ''}` : ''}`
        + ` · sim CPU p50 ${s.simMs.p50} (p95 ${s.simMs.p95}) ms · render submit CPU p50 ${s.renderMs.p50} ms${s.gpuMs ? ` · GPU time p50 ${s.gpuMs.p50} (p95 ${s.gpuMs.p95}) ms [${Object.entries(s.gpuMs.passes || {}).map(([k, v]) => `${k} ${v || 'n/r'}`).join(' · ')}]` : ''} · lamps lit ${s.lamps ?? '?'} · draw calls ${s.calls} (p95 ${s.callsP95}, shadow ${s.shadowCalls}) · GPU draws ${s.draws} · triangles ${(s.tris / 1000).toFixed(0)}k · warm-up max ${x.warmMaxMs} ms${x.prog ? ` · shader programs compiled while measured ${x.prog.measured} (in the warm-up ${x.prog.warm})` : ''}`
        + ` · limited by (estimate): ${this.bound(s)}` + paceOf(x));
      // (PERF-BATTERY-2: after the preset's last fixed route, the same routes as played)
      if (x === fixed.filter((y) => y.q === x.q).pop()) {
        const P = played.filter((y) => y.q === x.q);
        if (P.length) { lines.push(`  as played (automatic resolution on, down to ×${P[0].cfg.minScale}; it carries over from route to route as in play):`); for (const y of P) lines.push(playedLine(y)); }
      }
    }
    // (PERF-BATTERY-2) the answer in one table: fps at the fixed resolution and as played, with the factor it settled at
    if (played.length) {
      const Q = [...new Set(fixed.map((x) => x.q))], ids = [...new Set(fixed.map((x) => x.id))];
      lines.push('', `summary · fps at full resolution / as played (automatic resolution on: its mean factor while measured, and the end)${G.power?.onBattery ? ' · ON BATTERY' : ''}`);
      lines.push('  ' + ''.padEnd(11) + Q.map((k) => k.padEnd(30)).join(''));
      for (const id of ids) lines.push('  ' + id.padEnd(11) + Q.map((k) => {
        const f = fixed.find((x) => x.q === k && x.id === id), p = played.find((x) => x.q === k && x.id === id);
        return `${f?.s ? f.s.fps : '–'} / ${p?.s ? `${p.s.fps} (×${p.res?.mean ?? '?'}${p.res && p.res.end !== p.res.mean ? `, end ×${p.res.end}` : ''})` : '–'}`.padEnd(30);
      }).join(''));
    }
    if (brk.length) {
      lines.push('', 'breakdown (one cost changed at a time; compare the ms):');
      for (const x of brk) { const s = x.s; lines.push(`  ${(x.q + ' ' + x.id + ' · ' + x.v).padEnd(36)} ${s ? `${String(s.fps).padStart(5)} fps · frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} ms${s.gpuMs ? ` · GPU p50 ${s.gpuMs.p50} ms [${Object.entries(s.gpuMs.passes || {}).map(([k, v]) => `${k} ${v || 'n/r'}`).join(' · ')}]` : ''} · submit CPU ${s.renderMs.p50} ms · calls ${s.calls} · render pixel ratio ${x.cfg.pr}` + paceOf(x) : 'no frames'}`); }
    }
    lines.push('', ...this.paceVerdict(results));
    { const C2 = results.filter((x) => x.s?.cpu); if (C2.length) { lines.push('', 'CPU by section (STABILIZATION), p50 / mean ms (calls a frame):'); for (const x of C2) lines.push(`  ${(x.q + ' ' + x.id + (x.v ? ' · ' + x.v : '') + (x.played ? ' (as played)' : '')).padEnd(40)} ${secLine(x.s.cpu)}`); } }
    lines.push('', `Frame time includes the GPU (the browser waits for it); "render submit" is CPU time only; "GPU time" (when shown) is the GPU's own time for a frame.`);
    return lines.join('\n');
  }
}
