// WEATHER-1 (the user's decision of 2.11.2026): outdoors the weather changes now and then, and the light shifts slowly
// from morning to noon to golden hour and back to morning. It never gets dark: Twinsun has two suns (a standing story
// rule: no night, no lit-lamps mode). Each planet has its own weather and its own light.
//
// One small director. Per planet it holds a state for minutes, then blends into the next over 20–40 s:
//   Twinsun  clear (most of the time) · haze (a hazy morning fog, likelier in the morning) · rain (light) · wind
//            (leaves on the air) · storm (rare, only after rain: the engine's own storm value, Environment PAL.storm)
//            Desert Island shows the dry side of it only (rain and storm blow dust: 'wind'; never rain), the
//            Hamalayi a light snow flurry instead of rain.
//   Zeelich  clear · mist (the cloud sea's mist drifting over the island) · gusts (petals) · overcast (a pale
//            grey-violet spell). No rain; every state keeps the pink-violet LBA2 identity.
// The light cycle (about 20 minutes) changes colour, intensity and fog only: the sun's direction stays fixed (the rooms
// and views were composed under it, and ShadowCache keys its cached static casters on it). Its darkest point, with a
// storm on top, is never below the storm palette's light (Environment.lightFloor).
//
// Everything is laid over a region's own env (environment.js weatherMods: multipliers and mixes, so a region's own
// fog, sun, grade — the islands' R.grade — stay its own) and only outdoors. Interiors take no weather.
//
// The story wins:
//   game.weather.hold(reason, snap)   pins the weather to clear (blended over HOLD_BLEND s, or at once with snap) and
//   game.weather.release(reason)      holds the light; weather resumes from clear when the last hold is released
// Held without any call: cinematics and the opening (game.cine, state 'cinematic': at once), the title, story cutscenes
// (state 'cutscene'), the reveal beats' dialogue close-ups (story/revealcam.js: game.reveal), the chapter-4 sandstorm
// (Desert Island R.storm.level > 0 — never started or stopped from here), the benchmark. Paused menus freeze it.
//
// Off: Settings → Display → "Weather and light changes" (settings.weather), `?noweather`, and in automated browsers
// (navigator.webdriver: every test boots to today's look exactly) unless `?weather=1`. Off is exactly the old picture:
// the modifiers are not applied at all. Saves hold nothing of it: a load starts fresh (clear, noon).
//
// Cost: no lights, no new programs, no allocation a frame. A few dozen numbers blended per frame; the rain lines as
// before (a light rain draws 40 % of them; Low 60 % at most); the motes one draw of ≤ 320 points (Medium 160, Low none).
import * as THREE from 'three';
import { rng } from '../engine/math.js';

const Q = typeof location !== 'undefined' ? location.search : '';
const NOWEATHER = /[?&]noweather\b/.test(Q);
const FORCE_ON = /[?&]weather=1\b/.test(Q);
const AUTOMATED = typeof navigator !== 'undefined' && !!navigator.webdriver;
const SEED = +((Q.match(/[?&]weatherseed=(\d+)/) || [])[1] ?? NaN);

export const HOLD_BLEND = 4;        // s: a hold's blend to clear (cutscenes, beats, the sandstorm)
const BLEND = [20, 40];             // s: one state into the next
const RELEASED_CLEAR = [90, 240];   // s of clear after a hold is released

// ---------------------------------------------------------------- the weather's parameters (one Float32Array a state)
const WP = ['sunK', 'hemiK', 'fogK', 'fogR', 'fogG', 'fogB', 'fogMix', 'skyFlat', 'cover', 'cloudR', 'cloudG', 'cloudB', 'cloudMix', 'seaK',
  'rain', 'rainN', 'storm', 'rainSnd', 'windSnd', 'sway', 'wind', 'motes', 'moteR', 'moteG', 'moteB', 'moteSize', 'moteFall', 'moteDrift', 'moteFlutter', 'moteAlpha', 'grey'];
const W = Object.fromEntries(WP.map((k, i) => [k, i])), NW = WP.length;
const _c = new THREE.Color();
function wstate(o = {}) {
  const v = new Float32Array(NW);
  v[W.sunK] = v[W.hemiK] = v[W.fogK] = v[W.seaK] = 1; v[W.moteSize] = 0.4; v[W.moteAlpha] = 0.9;
  for (const [k, x] of Object.entries(o)) {
    if (k === 'fog' || k === 'cloud' || k === 'mote') { _c.set(x); v[W[k + 'R']] = _c.r; v[W[k + 'G']] = _c.g; v[W[k + 'B']] = _c.b; }
    else v[W[k]] = x;
  }
  return v;
}
const CLEAR = wstate();
// the colours (and the motes' kind) that only show through their amount: [amount, [indices]]
const GROUPS = [[W.fogMix, [W.fogR, W.fogG, W.fogB]], [W.cloudMix, [W.cloudR, W.cloudG, W.cloudB]],
  [W.motes, [W.moteR, W.moteG, W.moteB, W.moteSize, W.moteFall, W.moteDrift, W.moteFlutter, W.moteAlpha]]];
// Twinsun, Citadel: the sea and the sky dome are there, the rain lines and the storm value too
const CITADEL = {
  clear: CLEAR,
  haze: wstate({ sunK: 0.84, hemiK: 1.04, fogK: 0.5, fog: '#e2e9ef', fogMix: 0.55, skyFlat: 0.5, cover: 0.1, cloud: '#f2f5f8', cloudMix: 0.3, seaK: 0.96,
    motes: 0.5, mote: '#f4f7fa', moteSize: 2.6, moteAlpha: 0.12, moteFall: 0, moteDrift: 0.8, moteFlutter: 0.25 }),
  rain: wstate({ sunK: 0.45, hemiK: 0.88, fogK: 0.7, fog: '#9eaebf', fogMix: 0.5, skyFlat: 0.35, cover: 0.7, cloud: '#b4bdc9', cloudMix: 0.7, seaK: 0.8,
    rain: 0.8, rainN: 0.45, rainSnd: 0.55, windSnd: 0.3, sway: 0.25, wind: 0.3, grey: 0.35 }),
  wind: wstate({ cover: 0.2, wind: 1, windSnd: 0.6, sway: 0.65, motes: 1, mote: '#a6b84a', moteSize: 0.5, moteFall: 0.45, moteDrift: 5, moteFlutter: 1.5 }),
  storm: wstate({ storm: 1, rain: 1, rainN: 1, rainSnd: 1, windSnd: 1, sway: 1, cover: 0.5, wind: 0.4 }),
};
const DESERT = {
  clear: CLEAR,
  haze: wstate({ sunK: 0.88, hemiK: 1.03, fogK: 0.55, fog: '#f0e2ca', fogMix: 0.5 }),
  wind: wstate({ sunK: 0.94, fogK: 0.8, fog: '#ecd8b2', fogMix: 0.3, windSnd: 0.65, sway: 0.6, motes: 1, mote: '#d6ae74', moteSize: 0.5, moteAlpha: 0.7, moteFall: -0.15, moteDrift: 8, moteFlutter: 0.9 }),
};
const HAMALAYI = {
  clear: CLEAR,
  haze: wstate({ sunK: 0.86, hemiK: 1.03, fogK: 0.55, fog: '#e9eff6', fogMix: 0.5 }),
  wind: wstate({ fogK: 0.88, windSnd: 0.6, sway: 0.6, motes: 0.7, mote: '#ffffff', moteSize: 0.7, moteAlpha: 0.45, moteFall: 0.3, moteDrift: 7, moteFlutter: 0.6 }),
  snow: wstate({ sunK: 0.72, hemiK: 0.97, fogK: 0.65, fog: '#dde6f0', fogMix: 0.42, windSnd: 0.3, sway: 0.2, grey: 0.15, motes: 1, mote: '#ffffff', moteSize: 0.34, moteFall: 1.3, moteDrift: 1.0, moteFlutter: 0.7 }),
};
const ZEELICH = {
  clear: CLEAR,
  mist: wstate({ sunK: 0.86, hemiK: 1.05, fogK: 0.36, fog: '#f8e2ee', fogMix: 0.6,
    motes: 0.7, mote: '#fde9f4', moteSize: 3.0, moteAlpha: 0.16, moteFall: -0.05, moteDrift: 1.4, moteFlutter: 0.3 }),
  gusts: wstate({ windSnd: 0.6, sway: 0.6, motes: 0.85, mote: '#f6b4d4', moteSize: 0.45, moteFall: 0.4, moteDrift: 5, moteFlutter: 1.6 }),
  overcast: wstate({ sunK: 0.55, hemiK: 0.96, fogK: 0.82, fog: '#d4c8d8', fogMix: 0.55, grey: 0.55 }),
};

// ---------------------------------------------------------------- the light cycle's parameters
const LP = ['sunK', 'hemiK', 'fogK', 'sunR', 'sunG', 'sunB', 'hemiR', 'hemiG', 'hemiB', 'fogR', 'fogG', 'fogB', 'fogMix', 'skyR', 'skyG', 'skyB',
  'seaR', 'seaG', 'seaB', 'cloudR', 'cloudG', 'cloudB', 'frameR', 'frameG', 'frameB'];
const L = Object.fromEntries(LP.map((k, i) => [k, i])), NL = LP.length;
function lstate(o = {}) {
  const v = new Float32Array(NL).fill(1);
  v[L.fogR] = v[L.fogG] = v[L.fogB] = v[L.fogMix] = 0;
  for (const [k, x] of Object.entries(o)) {
    if (k === 'fog') { _c.set(x); v[L.fogR] = _c.r; v[L.fogG] = _c.g; v[L.fogB] = _c.b; }
    else if (Array.isArray(x)) { v[L[k + 'R']] = x[0]; v[L[k + 'G']] = x[1]; v[L[k + 'B']] = x[2]; }
    else v[L[k]] = x;
  }
  return v;
}
const NOON = lstate();
// morning: cool and a little hazy; golden hour: warm, the fill lower so the sun's side and the shadows read stronger
const T_LIGHT = {
  morning: lstate({ sunK: 0.86, hemiK: 0.96, fogK: 0.8, sun: [0.88, 0.95, 1.1], hemi: [0.94, 0.98, 1.06], fog: '#d8e5f3', fogMix: 0.45, sky: [0.9, 0.97, 1.06], sea: [0.93, 0.99, 1.05], cloud: [0.96, 0.98, 1.03], frame: [0.97, 0.99, 1.04] }),
  noon: NOON,
  golden: lstate({ sunK: 1.0, hemiK: 0.82, fogK: 0.95, sun: [1.22, 0.86, 0.58], hemi: [1.06, 0.95, 0.82], fog: '#f6cc9c', fogMix: 0.55, sky: [1.0, 0.92, 0.84], sea: [1.08, 0.95, 0.8], cloud: [1.0, 0.86, 0.68], frame: [1.06, 1.0, 0.9] }),
};
// Zeelich's: the same day, its tints kept inside the pink-violet
const Z_LIGHT = {
  morning: lstate({ sunK: 0.88, hemiK: 0.97, fogK: 0.85, sun: [0.92, 0.94, 1.08], hemi: [0.95, 0.97, 1.05], fog: '#e2d6f0', fogMix: 0.4, frame: [0.98, 0.99, 1.03] }),
  noon: NOON,
  golden: lstate({ sunK: 1.0, hemiK: 0.85, fogK: 0.95, sun: [1.16, 0.88, 0.7], hemi: [1.05, 0.95, 0.88], fog: '#f6c8b4', fogMix: 0.5, frame: [1.05, 0.99, 0.93] }),
};
// the day: [phase, light]; between two keys a smoothstep; 1 wraps to 0 (golden hour back to morning, never to dark)
const DAY = [[0, 'morning'], [0.08, 'morning'], [0.26, 'noon'], [0.55, 'noon'], [0.72, 'golden'], [0.86, 'golden'], [1, 'morning']];
const NOON_AT = 0.3;   // (a new game, a load, the weather turned on: noon, today's look)

// ---------------------------------------------------------------- planets and regions
const PLANETS = {
  twinsun: {
    period: 1200, light: T_LIGHT,
    hold: { clear: [300, 600], haze: [120, 240], rain: [120, 240], wind: [120, 220], storm: [80, 140] },
    next: { clear: { haze: 2, rain: 2, wind: 2 }, haze: { clear: 4, rain: 1 }, rain: { clear: 3, storm: 0.8, wind: 1, haze: 1 }, wind: { clear: 3, rain: 1 }, storm: { rain: 3, clear: 1 } },
  },
  zeelich: {
    period: 1380, light: Z_LIGHT,
    hold: { clear: [300, 600], mist: [120, 240], gusts: [120, 220], overcast: [120, 240] },
    next: { clear: { mist: 2, gusts: 2, overcast: 1.5 }, mist: { clear: 3, overcast: 1 }, gusts: { clear: 3, overcast: 1 }, overcast: { clear: 3, mist: 1 } },
  },
};
export const REGIONS = {
  citadel: { planet: 'twinsun', defs: CITADEL, map: { clear: 'clear', haze: 'haze', rain: 'rain', wind: 'wind', storm: 'storm' } },
  desert: { planet: 'twinsun', defs: DESERT, map: { clear: 'clear', haze: 'haze', rain: 'wind', wind: 'wind', storm: 'wind' } },
  hamalayi: { planet: 'twinsun', defs: HAMALAYI, map: { clear: 'clear', haze: 'haze', rain: 'snow', wind: 'wind', storm: 'snow' } },
  zeelich: { planet: 'zeelich', defs: ZEELICH, map: { clear: 'clear', mist: 'mist', gusts: 'gusts', overcast: 'overcast' } },
};
const PKEYS = Object.keys(PLANETS);
export const PLANET_STATES = Object.fromEntries(Object.entries(PLANETS).map(([k, p]) => [k, Object.keys(p.hold)]));

// on: Settings' "Weather and light changes" (settings.weather), not `?noweather`, not an automated browser without ?weather=1
export const weatherEnabled = (s) => !NOWEATHER && s?.weather !== 'off' && (!AUTOMATED || FORCE_ON);

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const LIVE = new Set(['play', 'dialog']);   // (the clocks run in play and dialogue; menus, the inventory and the map freeze them)

export class Weather {
  constructor(game) {
    this.game = game;
    this.timeScale = 1;          // (tests: faster clocks)
    this.holds = new Map();      // reason → snap
    this.held = null;            // the reason in force this frame, or null
    this.sway = 0; this.rainSnd = 0; this.windSnd = 0;   // (main.js: the vegetation's sway, the ambience)
    this.region = null;
    this.live = false;           // (the modifiers are in force: off → exactly the old picture)
    const r = Number.isFinite(SEED) ? rng(SEED) : Math.random;
    this.rand = r;
    this.P = {};
    for (const k of Object.keys(PLANETS)) this.P[k] = this.fresh(k);
    this.Lv = new Float32Array(NL);
  }
  fresh(k) {
    return { key: k, state: 'clear', region: null, from: new Float32Array(CLEAR), cur: new Float32Array(CLEAR), k: 1, dur: 1, left: this.span(PLANETS[k].hold.clear), phase: NOON_AT, pinned: false };
  }
  span([a, b]) { return a + (b - a) * this.rand(); }

  // ---------------------------------------------------------------- the switches
  enabled() { return weatherEnabled(this.game.settings); }
  hold(reason = 'story', snap = false) { this.holds.set(reason, !!snap); }
  release(reason = 'story') { this.holds.delete(reason); }

  // where the hero is, for the weather: 'citadel', 'desert', 'hamalayi', 'zeelich', or null (indoors, elsewhere)
  regionKey() {
    const G = this.game, R = G.room;
    if (!R) return G.world?.root?.visible === false ? null : 'citadel';
    if (!R.outdoor) return null;
    if (R.id === 'desert' || R.id === 'hamalayi' || R.id === 'zeelich') return R.id;
    if (R.isle) return 'zeelich';
    return null;   // (another outdoor place: no weather until it is given its own)
  }
  // the story's holds this frame (polled: none of them needs a call), then the explicit ones; sets this._snap
  holdReason(rk) {
    const G = this.game, st = G.state;
    this._snap = true;
    if (st === 'title' || st === 'loading') return 'title';
    if (G.cine || st === 'cinematic' || st === 'cinematicEnd' || G.camRig?.cine) return 'cinematic';
    if (G.benching) return 'bench';
    this._snap = false;
    if (st === 'cutscene') return 'cutscene';
    if (G.reveal?.active) return 'reveal';
    if (rk === 'desert' && G.room?.storm?.level > 0) return 'sandstorm';
    if (this.holds.size) for (const [why, snap] of this.holds) { this._snap = snap; return why; }
    return null;
  }

  // ---------------------------------------------------------------- the frame
  update(dt) {
    const G = this.game, env = G.env;
    if (!env) return;
    if (!this.enabled()) { if (this.live || this._was) this.off(); return; }
    this._was = true;
    const rk = this.regionKey();
    this.region = rk;
    const why = this.holdReason(rk);
    this.held = why;
    const paused = G.state === 'pause';
    const adv = why || paused || !LIVE.has(G.state) ? 0 : dt * this.timeScale;
    const bdt = paused ? 0 : dt * this.timeScale;   // (a blend, a hold's included, goes on in a cutscene)
    // every planet's clock runs (the weather goes on where he is not)
    for (let n = 0; n < PKEYS.length; n++) {
      const k = PKEYS[n], p = this.P[k];
      p.phase = (p.phase + adv / PLANETS[k].period) % 1;
      if (p.pinned || adv === 0) continue;
      p.left -= adv;
      if (p.left <= 0 && p.k >= 1) this.go(p, this.pick(p), this.span(BLEND));
    }
    const R = rk && REGIONS[rk], p = R && this.P[R.planet];
    if (!p) { this.neutralOut(); return; }
    // held: clear (at once for a cut, else blended), the light held where it is; clear for a while after the release
    if (why) {
      if (p.state !== 'clear') { this.go(p, 'clear', this._snap ? 0 : HOLD_BLEND); p.left = this.span(RELEASED_CLEAR); }
      else if (this._snap && p.k < 1) p.k = 1;
      p.pinned = false;
    }
    const def = R.defs[R.map[p.state]];
    if (p.region !== rk) { p.region = rk; p.k = 1; }   // (a new place, behind a door or a travel's fade: at once)
    if (p.k < 1) p.k = Math.min(1, p.k + bdt / p.dur);
    const e = smooth(p.k), cur = p.cur, from = p.from;
    if (p.k >= 1) cur.set(def);
    else {
      for (let i = 0; i < NW; i++) cur[i] = from[i] + (def[i] - from[i]) * e;
      for (let g = 0; g < GROUPS.length; g++) { const m = GROUPS[g][0], idx = GROUPS[g][1]; if (def[m] < 1e-3) for (let j = 0; j < idx.length; j++) cur[idx[j]] = from[idx[j]]; }
    }
    this.light(R.planet, p.phase, this.Lv);
    this.apply(rk, cur, this.Lv);
  }

  // start a blend from wherever the weather is now to `name` (on the planet's own state list)
  go(p, name, secs) {
    const R = REGIONS[p.region] || Object.values(REGIONS).find((r) => r.planet === p.key);
    p.from.set(p.cur);
    p.state = name;
    p.dur = Math.max(0.001, secs);
    p.k = secs > 0 ? 0 : 1;
    p.left = this.span(PLANETS[p.key].hold[name]);
    // (a colour that was not showing takes the new one's at once: a fog or a mote fading in never changes hue on the way;
    //  one fading out keeps its own: update)
    const to = R.defs[R.map[name]], f = p.from;
    for (const [m, idx] of GROUPS) if (f[m] < 1e-3) for (const i of idx) f[i] = to[i];
    if (p.k >= 1) p.cur.set(to);
  }
  // the next state: the planet's weights from this one (Twinsun's haze three times likelier in the morning)
  pick(p) {
    const N = PLANETS[p.key].next[p.state];
    let sum = 0;
    for (const k in N) sum += N[k] * (k === 'haze' && this.lightName(p.phase) === 'morning' ? 3 : 1);
    let r = this.rand() * sum;
    for (const k in N) { r -= N[k] * (k === 'haze' && this.lightName(p.phase) === 'morning' ? 3 : 1); if (r <= 0) return k; }
    return 'clear';
  }
  // the light at a phase of the day, into `out`
  light(planet, phase, out) {
    const T = PLANETS[planet].light;
    let i = 0;
    while (i < DAY.length - 2 && phase >= DAY[i + 1][0]) i++;
    const [p0, a] = DAY[i], [p1, b] = DAY[i + 1], A = T[a], B = T[b];
    const k = A === B ? 0 : smooth((phase - p0) / (p1 - p0));
    for (let j = 0; j < NL; j++) out[j] = A[j] + (B[j] - A[j]) * k;
    return out;
  }
  lightName(phase) {
    let i = 0;
    while (i < DAY.length - 2 && phase >= DAY[i + 1][0]) i++;
    return DAY[i][1] === DAY[i + 1][1] ? DAY[i][1] : 'between';
  }

  // the frame's modifiers into the environment (environment.js weatherMods), the storm value, the ambience, the tint
  apply(rk, c, l) {
    const G = this.game, env = G.env, X = env.wx;
    let neutral = true;
    for (let i = 0; i < NW && neutral; i++) if (c[i] !== CLEAR[i]) neutral = false;
    for (let i = 0; i < NL && neutral; i++) if (l[i] !== NOON[i]) neutral = false;
    this.live = !neutral;
    X.on = !neutral;
    X.sunK = c[W.sunK] * l[L.sunK]; X.hemiK = c[W.hemiK] * l[L.hemiK]; X.fogK = c[W.fogK] * l[L.fogK];
    if (G.settings?.visual === '1997') X.fogK = 1 - (1 - X.fogK) * 0.4;   // (the Retro look's fog is already close: a fog spell closes it less)
    X.sunTint.setRGB(l[L.sunR], l[L.sunG], l[L.sunB]); X.hemiTint.setRGB(l[L.hemiR], l[L.hemiG], l[L.hemiB]); X.grey = c[W.grey];
    X.lFog.setRGB(l[L.fogR], l[L.fogG], l[L.fogB]); X.lFogK = l[L.fogMix];
    X.wFog.setRGB(c[W.fogR], c[W.fogG], c[W.fogB]); X.wFogK = c[W.fogMix];
    X.skyTint.setRGB(l[L.skyR], l[L.skyG], l[L.skyB]); X.skyFlat = c[W.skyFlat]; X.cover = c[W.cover];
    X.cloudTo.setRGB(c[W.cloudR], c[W.cloudG], c[W.cloudB]); X.cloudK = c[W.cloudMix]; X.cloudTint.setRGB(l[L.cloudR], l[L.cloudG], l[L.cloudB]);
    X.wind = c[W.wind];
    X.seaTint.setRGB(l[L.seaR] * c[W.seaK], l[L.seaG] * c[W.seaK], l[L.seaB] * c[W.seaK]);
    X.rain = c[W.rain]; X.rainN = c[W.rainN];
    X.motes = c[W.motes]; X.moteCol.setRGB(c[W.moteR], c[W.moteG], c[W.moteB]); X.moteSize = c[W.moteSize];
    X.moteFall = c[W.moteFall]; X.moteDrift = c[W.moteDrift]; X.moteFlutter = c[W.moteFlutter]; X.moteAlpha = c[W.moteAlpha];
    // the quality presets: Medium half the motes, Low none and at most 60 % of the rain lines
    const q = G.settings?.quality;
    env.moteCap = q === 'low' ? 0 : q === 'medium' ? 0.5 : 1;
    env.rainCap = q === 'low' ? 0.6 : 1;
    const cit = rk === 'citadel';
    G.storm = cit ? c[W.storm] : 0;
    this.sway = c[W.sway];
    this.rainSnd = cit ? c[W.rainSnd] : 0;
    this.windSnd = c[W.windSnd];
    G.renderer?.setLightTint?.(l[L.frameR], l[L.frameG], l[L.frameB]);
  }
  // indoors, or a place without weather: nothing applied (the planets' clocks go on)
  neutralOut() {
    const G = this.game;
    G.env.wx.on = false; this.live = false;
    G.storm = 0; this.sway = 0; this.rainSnd = 0; this.windSnd = 0;
    G.renderer?.setLightTint?.(1, 1, 1);
  }
  // turned off (Settings, ?noweather): the old picture, and a fresh start (clear, noon) when turned on again
  off() {
    this.neutralOut();
    this._was = false; this.region = null; this.held = null;
    for (const k of Object.keys(this.P)) this.P[k] = this.fresh(k);
  }

  // ---------------------------------------------------------------- for tests and developers
  // force a planet state (the planet where he is, or `planet`) over `secs` (0: at once); it stays until unforce()
  force(name, secs = 0, planet = null) {
    const pk = planet || REGIONS[this.region || 'citadel'].planet, p = this.P[pk];
    if (!PLANETS[pk].hold[name]) throw new Error('no weather state ' + name + ' on ' + pk);
    if (!p.region) p.region = Object.keys(REGIONS).find((r) => REGIONS[r].planet === pk);
    this.go(p, name, secs);
    p.pinned = true;
  }
  unforce(planet = null) { const p = this.P[planet || REGIONS[this.region || 'citadel'].planet]; p.pinned = false; }
  setPhase(phase, planet = null) { this.P[planet || REGIONS[this.region || 'citadel'].planet].phase = ((phase % 1) + 1) % 1; }
  info() {
    const R = this.region && REGIONS[this.region], p = R ? this.P[R.planet] : null;
    return {
      on: this.enabled(), live: this.live, region: this.region, held: this.held, planet: R?.planet ?? null,
      state: p?.state ?? null, shown: R ? R.map[p.state] : null, k: p?.k ?? 1, phase: p?.phase ?? null, light: p ? this.lightName(p.phase) : null,
      left: p?.left ?? null, pinned: p?.pinned ?? false,
    };
  }
  // the blended values by name (tests)
  values() {
    const R = this.region && REGIONS[this.region], p = R ? this.P[R.planet] : null;
    const o = {};
    if (p) { WP.forEach((k, i) => { o['w.' + k] = p.cur[i]; }); LP.forEach((k, i) => { o['l.' + k] = this.Lv[i]; }); }
    return o;
  }
}
