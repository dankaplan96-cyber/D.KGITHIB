// AUTO-QUALITY (I-13; settle-then-hold, PERF-CPU): Quality Auto in the game — the governor (engine/autoquality.js) fed
// with the displayed frames, its profile applied to the renderer, the sun's shadow map, the light pool, the vegetation,
// the shadow culling, the people's animation rate and far detail; the first-start calibration on the title screen; the
// cache per machine and power source; plug / unplug.
//
//   game.autoQ.state()   where it stands (profile in force and queued, phase, last window, evaluation, cache)
//   game.autoQ.log       its decisions: { t, kind: set | down | up | commit | settled | floor | calibrated | power, why, what, state }
//
// Every profile change is visible, so it takes effect only at a commit point: a scene change (inside its black and
// shader hold: Game.warmScene), an open pause / inventory / map, a power change, the start of play. The governor only
// queues it.
// Under the automated tests on a software renderer the governor is off and Auto is High (as the tests always ran);
// `?autoq` in the URL turns it on there too.
import { Governor, Calibration, describe, knobsAt, profileOf, spell, TIER_AT, machineKey, CACHE_KEY, N_PROFILES, nextProfile, UP_TRY_BLOCK } from './autoquality.js';
import { gpuQuality } from './perf.js';
import { cellFor } from './shadowcull.js';
import { warmPassPrograms } from './warmup.js';

const SOFT = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;
const load = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } };
const save = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* (private mode) */ } };
const STORE_EVERY = 60000;   // (the held session's margin, written to the cache this often)

export class AutoApply {
  constructor(game) {
    const G = (this.G = game);
    this.log = [];
    this.gov = new Governor({ budget: () => Math.max(1000 / 60, G.frameCapMs || 0), onChange: (i) => this.changed(i), log: this.log });
    const gpu = G.perf?.gpu || '', q = typeof location !== 'undefined' ? location.search : '';
    this.test = SOFT.test(gpu) && typeof navigator !== 'undefined' && navigator.webdriver && !/[?&]autoq/.test(q);
    this.gov.enabled = !this.test;
    this.cache = load(); this.cal = null; this.pendingStart = null; this.storedAt = 0;
    this.sys = (() => { try { return window.desktop?.sysinfo?.() || null; } catch { return null; } })();
    this.key = this.machineKey();
    if (this.test) { this.gov.setProfile(0, 'automated test on a software renderer: High, governor off', { phase: 'hold', commitNow: true, t: 0 }); this.source = 'test'; }
    else if (this.fromCache(this.cache[this.key], 0)) { /* (this machine and power source: straight to its profile) */ }
    else {
      // first start here (or a GPU / power source / screen not seen before): the name's guess, measured on the title
      const pick = gpuQuality(gpu), bat = G.power?.onBattery === true, other = this.cache[this.machineKey(!bat)];
      // (AUTO-2: plugged in High, on battery Medium; the evaluation in play steps down only on measured pressure)
      let p0 = bat ? 1 : 0, why = `first start ${bat ? 'on battery: Medium' : 'plugged in: High'} (the GPU's name suggests ${pick})`;
      if (other) { p0 = nextProfile(other.p, bat ? -1 : +1); why = `first start ${bat ? 'on battery' : 'plugged in'}: this machine's ${bat ? 'plugged-in' : 'battery'} profile, one ${bat ? 'lower' : 'higher'}`; }
      this.gov.setProfile(p0, why + '; measured on the title screen, then evaluated in play', { commitNow: true, t: 0 });
      this.cal = new Calibration({ p0, budget: () => Math.max(1000 / 60, G.frameCapMs || 0) });
      this.source = 'guess';
    }
    const T = G.perf?.gpuTimer;
    if (T) T.onFrame = (ms) => { if (this.cal && !this.cal.done) this.cal.gpu(ms); else this.gov.gpu(performance.now(), ms); };
  }
  // a cached entry for this machine and power source: its settled profile (held), or one higher to try when the last
  // session there had lots of room (evaluated), or a calibration's start (evaluated). false: nothing usable cached
  fromCache(E, t) {
    if (!E || !(E.p >= 0 && E.p < N_PROFILES)) return false;
    if (E.src === 'settled') {
      if (E.margin && E.p > 0 && !(E.noTry > 0)) { this.gov.setProfile(E.p - 1, `this machine's settled ${profileOf(E.p).name} (${E.at}) had room to spare: trying ${profileOf(E.p - 1).name}`, { commitNow: true, t, trial: true }); this.source = 'cache: trying one higher'; }
      else { this.gov.setProfile(E.p, `this machine's settled profile (${E.at})`, { phase: 'hold', commitNow: true, t }); this.source = 'cache: settled'; }
      if (E.noTry > 0) { E.noTry--; this.cache[this.key] = E; save(this.cache); }
    } else { this.gov.setProfile(E.p, `this machine's calibration (${E.at}), evaluated in play`, { commitNow: true, t }); this.source = 'cache: calibration'; }
    return true;
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

  // everything from the profile in force; the caller makes the programs
  applyAll() {
    const G = this.G, K = this.gov.knobs();
    G.renderer.setQuality('high');   // (the base the knobs override: High's pixel ratio)
    G.renderer.setKnobs(K);
    G.env?.setShadowMap(K.map);
    G.syncLamps();
    if (G.world?.detail?.q !== K.veg) { G.world?.setDetail?.(K.veg); if (G.world?.detail) G.world.detail.q = K.veg; }
    if (G.shadowCull) { G.shadowCull.quality = K.casters; G.shadowCull.setCell(cellFor('high')); }
    if (G.farCull) { G.farCull.anim.eco = K.anim === 'eco'; G.farCull.partPx = K.detail === 'near' ? 2.5 : 0.75; G.farCull.partNear = K.detail === 'near' ? 12 : 30; }
    G.settings.quality = describe(K).tier;
    if (G._applied) G._applied.quality = G.settings.quality;   // (the tier moved with the knobs: nothing for applySettings to redo)
  }
  // a governor decision: queued (nothing visible changes now); Settings' line names what waits
  changed() { if (this.G.screen === 'settings') this.G.syncSettingsUI?.(); }
  // the queued profile takes effect: true when the programs must be made (the caller holds the frame)
  commit(why) {
    if (!this.on() || !this.gov.pending().length) return false;
    const R = this.G.renderer, fx = !!R.fxaa?.enabled, bl = !!R.bloom?.enabled;
    this.gov.commit(why);
    this.applyAll();
    if ((R.fxaa?.enabled && !fx) || (R.bloom?.enabled && !bl)) warmPassPrograms(R.renderer, R.composer);
    this.G.saveSettings?.();
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
      if (G.state !== 'title' && G.state !== 'loading') { this.cal.done = true; this.note({ kind: 'calibrated', why: 'play started before the title had been measured: the evaluation in play starts from the guess' }); }
      else if (G.state === 'title' && !G.preparing && !G.background && !(typeof document !== 'undefined' && document.hidden)) { const r = this.cal.frame(now, ms, work); if (r) this.calibrated(r); }
      return;
    }
    // a menu over play: a commit point (the pause screen shows the last frame meanwhile)
    if ((G.state === 'pause' || G.state === 'inventory' || G.state === 'map') && !G.benching && this.commit(G.state)) { G.warmGraphics(); return; }
    const play = (G.state === 'play' || G.state === 'dialog') && !G.trans && !G.gfxHold && !G.preparing && !G.background && !G._shownBlack
      && !(typeof document !== 'undefined' && document.hidden) && !G.testFreeze && (!G.benching || G.benchAutoQ);
    const r = this.gov.frame({ t: now, ms, cpu: work, play, scene: G.room?.id || 'citadel' });
    if (r?.kind === 'settled' && !G.benching) this.settled();
    // the held session's margin, for the next start (written now and then)
    if (this.gov.phase === 'hold' && !G.benching && now - this.storedAt > STORE_EVERY && this.gov.margin() !== !!this.cache[this.key]?.margin) this.store('settled');
  }
  settled() {
    const T = this.gov.trial, E = this.cache[this.key] || {};
    // (a try one profile up that could not hold: not tried again for the next UP_TRY_BLOCK starts)
    const noTry = T?.failed ? UP_TRY_BLOCK : (E.noTry || 0);
    this.store('settled', { p: this.gov.p, noTry });
  }
  calibrated(r) {
    this.calResult = r;
    this.pendingStart = { p: r.p };
    this.note({ kind: 'calibrated', why: `title screen at ${profileOf(r.p0).name}: GPU p90 ${r.gpuMs ?? 'n/a (no timer query)'} ms, CPU p90 ${r.cpuMs} ms, frame p50 ${r.frameMs} ms over ${r.frames} frames`, what: `start at ${profileOf(r.p).name}, evaluated in play` });
    this.store('calib', { p: r.p });
  }
  // play starts (New Game, Continue, Load): the calibration's start, and anything queued (Game.beginPlay holds the
  // first frames for the programs)
  start() {
    if (!this.on() || this.test) return false;
    let any = false;
    if (this.pendingStart) { const P = this.pendingStart; this.pendingStart = null; this.gov.setProfile(P.p, 'calibration: play starts, evaluated in play', { commitNow: true, t: performance.now() }); this.applyAll(); any = true; }
    return this.commit('play starts') || any;
  }
  // plug / unplug (Game.setBattery, before its own warm-up — a commit point): this machine's profile for the new source,
  // or one profile lower (battery) / higher (mains), evaluated
  onPower(bat) {
    const old = this.key; this.key = this.machineKey(bat);
    if (!this.on() || this.test || old === this.key) return;
    const t = performance.now();
    if (!this.fromCache(this.cache[this.key], t)) {
      const p = nextProfile(this.gov.applied, bat ? -1 : +1);
      this.gov.setProfile(p, `${bat ? 'on battery: one profile lower' : 'plugged in: one profile higher'} (nothing settled for this power source yet), evaluated`, { commitNow: true, t });
      this.source = 'power change';
    }
    this.gov.resetWin(t + 3000);
    this.note({ kind: 'power', why: bat ? 'on battery' : 'plugged in' });
    this.applyAll();
  }
  store(src, E = {}) {
    this.cache = load();
    const prev = this.cache[this.key] || {};
    this.cache[this.key] = { p: E.p ?? this.gov.applied, src, margin: src === 'settled' ? this.gov.margin() : false, noTry: E.noTry ?? prev.noTry ?? 0, at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    this.storedAt = typeof performance !== 'undefined' ? performance.now() : 0;
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
    out.push(`quality: ${this.on() ? `Auto — ${S.label}${S.pending.length ? ` (→ ${profileOf(S.p).name} at the next scene change or menu)` : ''} · ${S.phase === 'hold' ? 'held' : `evaluating (${S.eval?.s ?? 0} s, ${S.eval?.scenes ?? 0} scene${S.eval?.scenes === 1 ? '' : 's'})`}` : `${this.G.settings.quality} (chosen by hand${this.G.settings.qualityChosenByHand ? '' : '?'})`} · governor ${this.test ? 'off (automated test)' : this.gov.enabled ? 'on' : 'off'} · GPU timer in play: ${S.gpuTimer ? 'yes' : 'no'}`);
    out.push(`  runs: ${spell(S.applied)}`);
    out.push(`  start: ${this.source}${S.cached ? ` · cached for this machine (${S.cached.src}${S.cached.margin ? ', room to spare' : ''}, ${S.cached.at}): ${profileOf(S.cached.p).name}` : ' · nothing cached for this machine'}${this.calResult ? ` · title calibration: GPU p90 ${this.calResult.gpuMs ?? 'n/a'} ms, CPU p90 ${this.calResult.cpuMs} ms, frame p50 ${this.calResult.frameMs} ms (at ${profileOf(this.calResult.p0).name}) → ${profileOf(this.calResult.p).name}` : ''} · key ${this.key}`);
    if (S.last) out.push(`  last window: ${S.last.kind} · ${S.last.fps} fps · frame p90 ${S.last.p90} ms · CPU p90 ${S.last.cpu ?? '?'} ms · GPU p90 ${S.last.gpu ?? 'n/a'} ms · missed ${Math.round(100 * S.last.miss)} %`);
    return out;
  }
}
// (the profile's knobs, for tests and the benchmark)
export { knobsAt };
