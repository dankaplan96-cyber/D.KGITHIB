// AUTO-QUALITY (I-13): Quality Auto in the game — the governor (engine/autoquality.js) fed with the displayed frames,
// its knobs applied to the renderer, the sun's shadow map, the light pool, the vegetation and the shadow culling, the
// first-start calibration on the title screen, the cache per machine and power source, plug / unplug.
//
//   game.autoQ.state()   where it stands (knobs, label, last window, pending commit knobs, calibration, cache)
//   game.autoQ.log       its decisions: { t, kind: set | down | up | commit | floor | calibrated | power, why, what, state }
//
// Where a change takes effect:
//   live knobs (resolution, bloom, MSAA, shadow map size, vegetation distances, small casters): at once, from the frame
//     after the decision; none of them makes a shader program (the post-processing variants for bloom / FXAA are made
//     at startup, prewarm()).
//   commit knobs (shadow filter, lamp count, shadows on / off): at the next scene change (inside its black and shader
//     hold: Game.warmScene), when the pause / inventory / map is open, at a power change, or when play starts.
// Under the automated tests on a software renderer the governor is off and Auto is High (as the tests always ran);
// `?autoq` in the URL turns it on there too.
import { Governor, Calibration, describe, compose, TIER_AT, machineKey, CACHE_KEY, SETTLE_MS, nextTier, GPU_LADDER, CPU_LADDER } from './autoquality.js';
import { gpuQuality } from './perf.js';
import { cellFor } from './shadowcull.js';
import { BATTERY_LAMPS } from './lightpool.js';
import { warmPassPrograms } from './warmup.js';

const SOFT = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;
const load = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } };
const save = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* (private mode) */ } };

export class AutoApply {
  constructor(game) {
    const G = (this.G = game);
    this.log = [];
    this.gov = new Governor({ budget: () => Math.max(1000 / 60, G.frameCapMs || 0), noop: (s, K) => this.noop(s, K), onChange: (i) => this.changed(i), log: this.log });
    const gpu = G.perf?.gpu || '', q = typeof location !== 'undefined' ? location.search : '';
    this.test = SOFT.test(gpu) && typeof navigator !== 'undefined' && navigator.webdriver && !/[?&]autoq/.test(q);
    this.gov.enabled = !this.test;
    this.cache = load(); this.cal = null; this.pendingStart = null; this.playMs = 0; this.savedAt = -1;
    this.sys = (() => { try { return window.desktop?.sysinfo?.() || null; } catch { return null; } })();
    this.key = this.machineKey();
    const E = this.cache[this.key];
    if (this.test) { this.gov.setLevels(0, 0, 'automated test on a software renderer: High, governor off', true, 0); this.source = 'test'; }
    else if (E) { this.gov.setLevels(E.g, E.c, `this machine's ${E.src === 'settled' ? 'settled state' : 'calibration'} from ${E.at}`, true, 0); this.source = E.src; }
    else {
      // first start here (or a GPU / power source / screen not seen before): the name's guess, measured on the title
      const pick = gpuQuality(gpu), bat = G.power?.onBattery === true, other = this.cache[this.machineKey(!bat)];
      let g0 = TIER_AT.gpu[pick], c0 = TIER_AT.cpu[pick], why = `first start: the GPU's name suggests ${pick}`;
      if (other) { g0 = other.g; c0 = other.c; why = `first start ${bat ? 'on battery' : 'plugged in'}: this machine's ${bat ? 'plugged-in' : 'battery'} state`; }
      if (bat) { g0 = nextTier('gpu', g0); c0 = nextTier('cpu', c0); why += ', one tier lower on battery'; }
      else if (other) { g0 = nextTier('gpu', g0, +1); c0 = nextTier('cpu', c0, +1); why += ', one tier higher plugged in'; }
      this.gov.setLevels(g0, c0, why + '; measuring on the title screen', true, 0);
      this.cal = new Calibration({ g0, c0, budget: () => Math.max(1000 / 60, G.frameCapMs || 0) });
      this.source = 'guess';
    }
    const T = G.perf?.gpuTimer;
    if (T) T.onFrame = (ms) => { if (this.cal && !this.cal.done) this.cal.gpu(ms); else this.gov.gpu(performance.now(), ms); };
  }
  // the cache's key: the GPU, the power source, the screen (and the processor's name in the desktop app)
  machineKey(battery = this.G.power?.onBattery === true) {
    const s = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}@${devicePixelRatio}` : '?';
    return machineKey({ gpu: this.G.perf?.gpu || '?', battery, screen: s, cpu: this.sys?.cpu || '' });
  }
  on() { const s = this.G.settings; return !!s.qualityAuto && s.visual !== '1997'; }
  tier() { return describe(this.gov.knobs()).tier; }
  label() { return describe(this.gov.knobs()).text; }
  // the timer query in play, every other frame (the benchmark sets its own)
  timer() { const T = this.G.perf?.gpuTimer; if (!T || !this.on() || this.test) return null; T.stride = 2; return T; }

  // a step that would change nothing now: the battery profile already has no MSAA, its own filter and 2 lamps;
  // Resolution: Full keeps the resolution
  noop(s) {
    const R = this.G.renderer;
    if (R.battery && R.shadowsOn() && (s.k === 'msaa' || s.k === 'filter' || (s.k === 'lamps' && s.v >= BATTERY_LAMPS))) return true;
    if (s.k === 'scale' && this.G.settings.res === 'full') return true;
    return false;
  }

  // everything from the governor's knobs (the commit knobs as last committed); the caller makes the programs
  applyAll() {
    const G = this.G, K = this.gov.knobs();
    G.renderer.setQuality('high');   // (the base the knobs override: High's pixel ratio)
    G.renderer.setKnobs(K);
    G.env?.setShadowMap(K.map);
    G.syncLamps();
    if (G.world?.detail?.q !== K.veg) { G.world?.setDetail?.(K.veg); if (G.world?.detail) G.world.detail.q = K.veg; }
    if (G.shadowCull) { G.shadowCull.quality = K.casters; G.shadowCull.setCell(cellFor('high')); }
    G.settings.quality = describe(K).tier;
    if (G._applied) G._applied.quality = G.settings.quality;   // (the tier moved with the knobs: nothing for applySettings to redo)
  }
  // a governor step: the live knobs now
  changed(info) {
    const G = this.G, R = G.renderer, fx = !!R.fxaa?.enabled, bl = !!R.bloom?.enabled;
    this.applyAll();
    // (bloom / FXAA switched on: their programs were made at startup — prewarm — but the shadow filter keys them too)
    if ((R.fxaa?.enabled && !fx) || (R.bloom?.enabled && !bl)) warmPassPrograms(R.renderer, R.composer);
    G.saveSettings?.();
    if (G.screen === 'settings') G.syncSettingsUI?.();
  }
  // the commit knobs take their wanted values: true when the programs must be made (the caller holds the frame)
  commit(why) {
    if (!this.on() || !this.gov.pending().length) return false;
    this.gov.commit(why);
    this.applyAll();
    return true;
  }
  // the post-processing passes' programs for bloom and FXAA on and off, made once (startup, under the loading screen)
  prewarm() {
    const R = this.G.renderer, b = R.bloom, f = R.fxaa;
    if (!R.composer || !b || !f) return;
    const b0 = b.enabled, f0 = f.enabled;
    try { for (const [bb, ff] of [[true, false], [false, true], [true, true], [false, false]]) { b.enabled = bb; f.enabled = ff; warmPassPrograms(R.renderer, R.composer); } }
    finally { b.enabled = b0; f.enabled = f0; }
  }

  // every displayed frame (Game.advance): real (s), work (ms: simulation + render submission, no background jobs)
  frame(real, work) {
    const G = this.G;
    if (!this.on() || this.test) return;
    const now = performance.now(), ms = real * 1000;
    // calibration on the title screen (a first start)
    if (this.cal && !this.cal.done) {
      if (G.state !== 'title' && G.state !== 'loading') { this.cal.done = true; this.note({ kind: 'calibrated', why: 'play started before the title had been measured: the governor goes on from the guess' }); }
      else if (G.state === 'title' && !G.preparing && !G.background && !(typeof document !== 'undefined' && document.hidden)) { const r = this.cal.frame(now, ms, work); if (r) this.calibrated(r); }
      return;
    }
    // a menu over play: the moment for the commit knobs (the pause screen shows the last frame meanwhile)
    if ((G.state === 'pause' || G.state === 'inventory' || G.state === 'map') && !G.benching && this.commit(G.state)) { G.warmGraphics(); return; }
    const play = (G.state === 'play' || G.state === 'dialog') && !G.trans && !G.gfxHold && !G.preparing && !G.background && !G._shownBlack
      && !(typeof document !== 'undefined' && document.hidden) && !G.testFreeze && (!G.benching || G.benchAutoQ);
    this.gov.frame({ t: now, ms, cpu: work, play });
    // a state held for SETTLE_MS of play is this machine's start next time
    if (play && this.gov.enabled) {
      this.playMs = now - this.gov.lastChange > 1000 ? this.playMs + ms : 0;
      const at = `${this.gov.g},${this.gov.c}`;
      if (this.playMs >= SETTLE_MS && this.savedAt !== at && !G.benching) { this.savedAt = at; this.store('settled'); }
    }
  }
  calibrated(r) {
    this.calResult = r;
    this.pendingStart = { g: r.g, c: r.c };
    this.note({ kind: 'calibrated', why: `title screen at ${describe(this.gov.knobs()).text}: GPU p90 ${r.gpuMs ?? 'n/a (no timer query)'} ms, CPU p90 ${r.cpuMs} ms, frame p50 ${r.frameMs} ms over ${r.frames} frames`, what: `start at ${describe(compose(r.g, r.c)).text} (gpu ${r.g} · cpu ${r.c})` });
    const E = { g: r.g, c: r.c };
    this.store('calib', E);
  }
  // play starts (New Game, Continue, Load): the calibration's start and the commit knobs (Game.beginPlay holds the
  // first frames for the programs)
  start() {
    if (!this.on() || this.test) return false;
    let any = false;
    if (this.pendingStart) { const P = this.pendingStart; this.pendingStart = null; this.gov.setLevels(P.g, P.c, 'calibration: play starts', true, performance.now()); this.applyAll(); any = true; }
    return this.commit('play starts') || any;
  }
  // plug / unplug (Game.setBattery, before its own warm-up): this machine's state for the new source, or one tier
  onPower(bat) {
    const old = this.key; this.key = this.machineKey(bat);
    if (!this.on() || this.test || old === this.key) return;
    const E = this.cache[this.key];
    if (E) this.gov.setLevels(E.g, E.c, `${bat ? 'on battery' : 'plugged in'}: this machine's ${E.src === 'settled' ? 'settled state' : 'calibration'} for it`, true, performance.now());
    else {
      const g = nextTier('gpu', this.gov.g, bat ? -1 : +1), c = nextTier('cpu', this.gov.c, bat ? -1 : +1);
      this.gov.setLevels(g, c, `${bat ? 'on battery: one tier lower' : 'plugged in: one tier higher'} (nothing measured for this power source yet)`, true, performance.now());
    }
    this.gov.reset(performance.now() + 3000); this.playMs = 0;
    this.note({ kind: 'power', why: bat ? 'on battery' : 'plugged in' });
    this.applyAll();
  }
  store(src, E = { g: this.gov.g, c: this.gov.c }) {
    this.cache = load();
    this.cache[this.key] = { g: E.g, c: E.c, src, at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    save(this.cache);
  }
  note(e) { this.gov.note(e); }

  state() {
    return { on: this.on(), test: this.test, source: this.source, key: this.key, cached: this.cache[this.key] || null, calibration: this.cal ? { done: this.cal.done, result: this.calResult || null } : null,
      ...this.gov.state(), log: this.log.slice(-20) };
  }
  // for the benchmark's report
  report() {
    const S = this.state(), out = [];
    out.push(`quality: ${this.on() ? `Auto — running ${S.label}` : `${this.G.settings.quality} (chosen by hand${this.G.settings.qualityChosenByHand ? '' : '?'})`} · governor ${this.test ? 'off (automated test)' : this.gov.enabled ? 'on' : 'off'} · ladders: GPU ${S.g}/${GPU_LADDER.length}, CPU ${S.c}/${CPU_LADDER.length}${S.pending.length ? ` · waiting for a scene change: ${S.pending.join(', ')}` : ''} · GPU timer in play: ${S.gpuTimer ? 'yes' : 'no'}`);
    out.push(`  start: ${this.source}${S.cached ? ` · cached for this machine (${S.cached.src}, ${S.cached.at}): gpu ${S.cached.g} · cpu ${S.cached.c}` : ' · nothing cached for this machine'}${this.calResult ? ` · title calibration: GPU p90 ${this.calResult.gpuMs ?? 'n/a'} ms, CPU p90 ${this.calResult.cpuMs} ms, frame p50 ${this.calResult.frameMs} ms (measured at gpu ${this.calResult.g0} · cpu ${this.calResult.c0}) → gpu ${this.calResult.g} · cpu ${this.calResult.c}` : ''} · key ${this.key}`);
    if (S.last) out.push(`  last window: ${S.last.kind} · ${S.last.fps} fps · frame p90 ${S.last.p90} ms · CPU p90 ${S.last.cpu ?? '?'} ms · GPU p90 ${S.last.gpu ?? 'n/a'} ms · missed ${Math.round(100 * S.last.miss)} %`);
    return out;
  }
}
