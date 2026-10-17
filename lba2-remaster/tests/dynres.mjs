// Automatic resolution without black frames (PERF-IGPU; the user: "every few frames the screen goes black").
// Before: renderer.adapt() changed the pixel ratio by resizing the canvas right after a frame was drawn, which
// clears the drawing buffer, so the browser showed a black frame at every step (and the composer's targets were
// reallocated). Now a step only changes the part of the fixed-size target the scene is drawn into.
//   1. forced steps down and up (0.6 … 1) in play, frame by frame: every drawn frame has picture (pixels read
//      back from the canvas's drawing buffer right after the frame, and again after the step is taken, which is
//      what the browser displays), the canvas / drawing buffer / render targets keep their size and objects
//   2. the picture at 0.6 covers the whole screen (not a corner) and resembles the full-resolution one
//   3. adapt() with synthetic frame times: steps down when the 60 Hz budget is missed, up when it holds, and a
//      step up that fails at once is not retried for a while (no see-saw)
//   4. the same through a quality change (Low ↔ Medium) and a window resize: no cleared frame on screen
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const outDir = new URL('./out/', import.meta.url).pathname; fs.mkdirSync(outDir, { recursive: true });
await open(page, '?nocine'); await menu(page, 'new');

await ev(() => {
  const G = game, R = G.renderer, gl = R.renderer.getContext();
  G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.state = 'play'; G.step(0.5);
  // pixels of the canvas's drawing buffer (what the browser would show for this frame)
  window.D = {
    probe() {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, out = [];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const px = new Uint8Array(4);
      for (const [fx, fy] of [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9], [0.9, 0.15], [0.15, 0.85], [0.5, 0.8], [0.3, 0.3], [0.7, 0.6]]) {
        gl.readPixels(Math.floor(fx * w), Math.floor(fy * h), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        out.push(px[0] + px[1] + px[2]);
      }
      return out;
    },
    // a frame drawn the way the loop draws it, then the probe, then (optionally) a resolution step taken after the
    // frame (where adapt() runs), then the probe again: the second probe is what reaches the screen
    frame(step) {
      G.frame(1 / 30, true);
      const a = D.probe();
      if (step) step();
      const b = D.probe();
      return { a, b };
    },
    sizes() {
      const c = R.composer, cv = R.canvas;
      return [cv.width, cv.height, gl.drawingBufferWidth, gl.drawingBufferHeight, c.renderTarget1.width, c.renderTarget1.height, c.renderTarget1.samples].join(',');
    },
  };
});

// ---------------------------------------------------------------- 1. forced steps, frame by frame
const r1 = await ev(() => {
  const G = game, R = G.renderer;
  R.setAutoRes(true);
  const t1 = R.composer.renderTarget1, t2 = R.composer.renderTarget2, tex1 = t1.texture, size0 = D.sizes();
  const seq = [1, 0.9, 0.8, 0.7, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 0.6, 1, 0.75, 0.6, 1];
  const frames = [];
  let disposed = 0; t1.addEventListener('dispose', () => disposed++); t2.addEventListener('dispose', () => disposed++);
  for (let i = 0; i < seq.length; i++) {
    const f = D.frame(() => R.setDyn(seq[i]));
    frames.push({ s: seq[i], dark: f.a.filter((v) => v < 6).length, darkAfter: f.b.filter((v) => v < 6).length, size: D.sizes() });
  }
  return { frames, size0, sameTargets: R.composer.renderTarget1 === t1 && R.composer.renderTarget2 === t2 && t1.texture === tex1, disposed };
});
const blank = r1.frames.filter((f) => f.dark >= 6 || f.darkAfter >= 6);
check('every drawn frame through 15 forced resolution steps has picture (drawing buffer read back before and after each step)', !blank.length, { blank, sample: r1.frames.slice(0, 3) });
check('the canvas, its drawing buffer and the render targets keep their size and objects (nothing disposed)', r1.frames.every((f) => f.size === r1.size0) && r1.sameTargets && r1.disposed === 0, { size0: r1.size0, sizes: [...new Set(r1.frames.map((f) => f.size))], same: r1.sameTargets, disposed: r1.disposed });

// ---------------------------------------------------------------- 2. the low-resolution picture fills the screen
await ev(() => { game.renderer.setDyn(1); game.frame(1 / 30, true); });
await page.screenshot({ path: outDir + 'dynres-1.0.png' });
await ev(() => { game.renderer.setDyn(0.6); game.frame(1 / 30, true); });
await page.screenshot({ path: outDir + 'dynres-0.6.png' });
const cmp = await ev(async () => {
  // compare the two captures block by block (8×6 grid of mean brightness)
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; });
  return null;
});
const pngs = ['dynres-1.0.png', 'dynres-0.6.png'].map((f) => fs.readFileSync(outDir + f).toString('base64'));
const grid = await ev(async (pngs) => {
  const out = [];
  for (const b64 of pngs) {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data, cells = [];
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 8; gx++) { let s = 0; for (let y = 0; y < 6; y++) for (let xx = 0; xx < 8; xx++) { const i = ((gy * 6 + y) * 64 + gx * 8 + xx) * 4; s += d[i] + d[i + 1] + d[i + 2]; } cells.push(s / 48 / 3); }
    out.push(cells);
  }
  return out;
}, pngs);
const diff = grid[0].map((v, i) => Math.abs(v - grid[1][i]));
const meanDiff = diff.reduce((a, b) => a + b, 0) / diff.length, maxDiff = Math.max(...diff), darkCells = grid[1].filter((v) => v < 8).length;
check('at 0.6 the picture fills the screen and matches the full-resolution one (8×6 blocks: mean brightness difference < 12, none black)', meanDiff < 12 && darkCells === 0, { meanDiff: +meanDiff.toFixed(1), maxDiff: +maxDiff.toFixed(1), darkCells });

// ---------------------------------------------------------------- 3. adapt(): steps and hysteresis
const r3 = await ev(() => {
  const R = game.renderer; R.setAutoRes(true);
  let now = 100000; const log = [];
  const feed = (ms, n = 90) => { for (let i = 0; i < n; i++) { now += ms; R.adapt(ms, now); } log.push(R.dyn); };
  feed(33.3); feed(33.3); feed(33.3); feed(33.3); feed(33.3); feed(33.3); // a 30 fps machine: down to the floor and stays
  const floor = R.dyn;
  feed(16.7); feed(16.7); feed(16.7);                                      // holds 60 for three windows: one step up
  const up1 = R.dyn;
  feed(33.3);                                                              // that step failed at once: back down
  const back = R.dyn;
  for (let i = 0; i < 6; i++) feed(16.7);                                  // ~9 s holding 60: must not retry yet
  const held = R.dyn;
  for (let i = 0; i < 30; i++) feed(16.7);                                 // after the back-off: may try again
  const later = R.dyn;
  R.setAutoRes(true);
  return { log, floor, up1, back, held, later };
});
check('a 30 fps frame time steps the resolution down to the floor (0.6) and no further', Math.abs(r3.floor - 0.6) < 1e-6, r3);
check('holding 60 for three windows steps it back up one step', Math.abs(r3.up1 - 0.7) < 1e-6, r3);
check('a step up that fails at once is undone and not retried for a while (no see-saw)', Math.abs(r3.back - 0.6) < 1e-6 && Math.abs(r3.held - 0.6) < 1e-6 && r3.later > 0.6, r3);

// ---------------------------------------------------------------- 4. quality change and window resize
const r4 = await ev(() => {
  const G = game, out = [];
  for (const q of ['low', 'medium', 'low', 'high', 'medium']) {
    // the change happens between frames (a settings click): the next drawn frame must have picture
    G.settings.quality = q; G.applySettings();
    const f = D.frame(); out.push({ q, dark: f.a.filter((v) => v < 6).length, darkAfter: f.b.filter((v) => v < 6).length, size: D.sizes() });
  }
  return out;
});
check('quality changes (Low ↔ Medium ↔ High): the next drawn frame has picture', r4.every((f) => f.dark < 6 && f.darkAfter < 6), r4);
await page.setViewportSize({ width: 1100, height: 620 });
const r5 = await ev(() => { dispatchEvent(new Event('resize')); const f = D.frame(); return { dark: f.a.filter((v) => v < 6).length, size: D.sizes(), w: innerWidth }; });
check('a window resize is applied with the next drawn frame (picture, new size)', r5.dark < 6 && r5.size.startsWith('1100,620'), r5);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
