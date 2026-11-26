// GPU-TIMER-KA (P96's keep-alive mark, main.js _keepAlive; docs/lba-maturity/FPS30.md §9): the diagnostic switch and the
// GPU timer's record of which frames were measured after a mark. Automated runtime only: headless Chromium with SwiftShader
// has a 60 Hz requestAnimationFrame and (usually) no timer query, so this checks the logic, never a GPU's reading.
//   1. (no browser) perf.js GpuTimer with a stand-in WebGL context: a frame drawn after a mark is tagged, one without is
//      not; onFrame gets the tag; stats() gives the share and the two groups' p50 apart
//   2. the game at Frame Rate 30 on the title screen (the real loop): the mark is there and changes; marks are counted on
//      the GPU timer where one exists; localStorage.lba3_keepalive = '0' → no mark; 'opaque' → an opaque near-black pixel
//   GAME_URL=http://localhost:8123/ node tests/keepalive.mjs
import { launch, open, checker } from './lib/boot.mjs';
import { GpuTimer } from '../src/engine/perf.js';
const { check, done } = checker({ info: 'always' });

// ---------------------------------------------------------------- 1. GpuTimer's tag
{
  let next = 1; const res = new Map();
  const ext = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 };
  const gl = { QUERY_RESULT_AVAILABLE: 3, QUERY_RESULT: 4, createQuery: () => ({ id: next++ }), beginQuery() {}, endQuery() {},
    getQueryParameter: (q, p) => (p === 3 ? true : res.get(q) ?? 0), getParameter: () => false };
  const T = new GpuTimer(gl, ext), got = [];
  T.onFrame = (ms, ka) => got.push([+ms.toFixed(1), ka]);
  const frame = (ms, marks) => { T.kaMarks = (T.kaMarks || 0) + marks; T.begin(); if (T.f) for (const [, q] of T.f.q) res.set(q, ms * 1e6); T.end(); };
  frame(6, 0); frame(17, 1); frame(16, 2); frame(7, 0); T.end();   // (the last end() collects what is ready)
  const S = T.stats();
  check('GpuTimer: frames drawn after a keep-alive mark are tagged (onFrame(ms, ka)), the others not; stats() splits them',
    JSON.stringify(got) === JSON.stringify([[6, false], [17, true], [16, true], [7, false]]) && S.afterMark === 0.5 && S.p50AfterMark === 17 && S.p50NoMark === 7, { got, S });
  // (a render in between that is not measured — stride — still consumes the marks before it)
  T.stride = 2; T.k = 0; got.length = 0;
  frame(5, 1); frame(5, 0); frame(5, 0); T.end();
  check('GpuTimer: marks before an unmeasured render (stride) are not carried to the next measured frame', got.length >= 1 && got.every(([, ka]) => ka === false), got);
}

// ---------------------------------------------------------------- 2. the game: the mark and the switch
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + 'css/style.css').catch(() => {});   // (an origin for localStorage before the first open)
const at30 = async (mode) => {
  await ev((m) => { if (m == null) localStorage.removeItem('lba3_keepalive'); else localStorage.setItem('lba3_keepalive', m); }, mode);
  await open(page, '?nocine', { freeze: false });
  return ev(async () => {
    // (a synthetic 60 Hz display, as tests/fps30.mjs A drives one: this loaded machine's headless requestAnimationFrame runs
    //  at 33–50 ms, and then the 30 limit skips nothing. The loop and its limit are the real ones; a drawn frame's work
    //  (Game.advance) is stubbed to begin and end the timer's query round nothing, as renderer.render does round its passes:
    //  the tag reaches onFrame and stats() as in a real frame)
    const G = window.game; G.settings.fps = '30'; G.applySettings();
    const T = G.perf.gpuTimer; G.advance = () => { if (T) { T.stride = 1; T.begin(); T.end(); } };
    const Q = [], raf0 = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { Q.push(cb); return Q.length; };
    await new Promise((ok) => { const w = () => (Q.length ? ok() : setTimeout(w, 20)); w(); });
    T?.reset(); const m0 = T?.kaMarks || 0, seen = new Set();
    let t = performance.now();
    for (let i = 0; i < 240; i++) { t += 1000 / 60; for (const cb of Q.splice(0)) cb(t); const el = G._kaEl; if (el) seen.add(el.style.backgroundColor); if (i % 4 === 3) await new Promise((ok) => setTimeout(ok, 25)); }
    await new Promise((ok) => setTimeout(ok, 300)); T?.end();   // (the queries' results come in later: collected)
    const S = T?.stats(), out = { cap: +(G.frameCapMs || 0).toFixed(2), refresh: +(G.refreshMs() || 0).toFixed(2), el: !!G._kaEl, colours: [...seen], mode: G._kaMode ?? null, timer: !!T, marks: T ? (T.kaMarks || 0) - m0 : null,
      measured: S?.n ?? 0, afterMark: S?.afterMark ?? null, disjoint: T?.disjoint ?? null, pending: T?.frames.length ?? null };
    window.requestAnimationFrame = raf0; for (const cb of Q.splice(0)) raf0(cb);
    return out;
  });
};
const def = await at30(null);
check('default (no lba3_keepalive): at Frame Rate 30 on the title the 1 px mark exists and changes between its two alphas (the skipped refreshes reach _keepAlive)', def.el && def.colours.length === 2 && def.colours.every((c) => /rgba\(0, 0, 0, 0\.0[12]\)/.test(c)), def);
// (SwiftShader here offers the timer query, but its results did not come back under the synthetic display — `pending`
//  queries, `measured` 0: then the tag on measured frames is exercised by part 1 only, and the check says so)
check(`marks counted on the GPU timer${!def.timer ? ' — no timer query in this browser: not exercised' : def.measured ? ', and the frames it measured at 30 tagged as drawn after one' : ` (no query result came back in this run, ${def.pending} pending: the tag on measured frames is part 1's)`}`, !def.timer || (def.marks > 0 && (def.measured === 0 || def.afterMark >= 0.8)), def);
const off = await at30('0');
check("localStorage.lba3_keepalive = '0': no mark at all at Frame Rate 30 (the diagnostic switch, read once), and no frame tagged", !off.el && off.mode === '0' && (!off.timer || (off.marks === 0 && !off.afterMark)), off);
const opq = await at30('opaque');
check("localStorage.lba3_keepalive = 'opaque': the mark is an opaque near-black pixel, changing", opq.el && opq.colours.length === 2 && opq.colours.every((c) => /^rgb\((0, 0, 0|2, 2, 2)\)$/.test(c)), opq);
await ev(() => localStorage.removeItem('lba3_keepalive'));
await browser.close();
const fails = done();
process.exit(fails ? 1 : 0);
