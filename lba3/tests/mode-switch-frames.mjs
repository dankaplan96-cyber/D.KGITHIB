// P139b (the local agent's ORDER-75 recording, 26.11: "switching to Aggressive (F3) in Modern on Citadel showed one frame
// with a large black square in the middle-left of the picture, between two good frames"; the recording drew the game's
// CANVAS each frame, no page around it, so only what is drawn into the canvas can show it). Is it real?
// On Citadel, Modern keys (as recorded), real key presses (Playwright keyboard: the game's own input path),
// EVERY drawn frame sampled from the game's canvas right after it is drawn (a 48×27 grid of cell brightness): a run of
// cells that goes near black for one frame while the frames before and after are not is the flash. The first switch on
// a fresh page is the one that counts (first use: a shader, a texture, a portrait made then), so each variant is its own
// page load:
//   A  fixed stepping (the tests' frozen clock, every frame drawn): F3 first, then F1–F4 three times
//   B  the game's own loop (requestAnimationFrame, its warm-ups, shader compiles and clock as a player has them): F3 first,
//      then F1–F4 three times
//   C  the own loop: Ctrl held + F3 first (the behaviour menu, whose portraits are drawn into the canvas), then Ctrl
//      tapped (the menu opened and closed) and F3, F1, F4
//   D  the recording's own sequence by the market (see below), the camera checked on every frame
// VARIANTS=ABCD picks (default ABC); W, H the window (default 1366×768).
// (The spot for A–C, camcitadel's spot 12, is the foot of a stone stair by the cliff, not the square.)
// Each press is checked to have switched (hero.behaviour). FRAMES=<dir>: the flagged frames (and A's frames round the
// first F3) written as PNG there.
// Automated runtime only (SwiftShader, headless Chromium): a real GPU's driver may differ.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const FR = process.env.FRAMES || '';
if (FR) mkdirSync(FR, { recursive: true });
const { check, done } = checker({ info: 'always' });
const W = +(process.env.W || 1366), H = +(process.env.H || 768), RUN = (process.env.VARIANTS || 'ABC').split('');
const SPOT = { x: -32.6, z: -38, a: Math.PI * 0.75 };   // (camcitadel.mjs's spot 12)
const KEY = { normal: 'F1', athletic: 'F2', aggressive: 'F3', discreet: 'F4' };

async function boot(live) {
  const { browser, page } = await launch({ width: W, height: H });
  const ev = (f, a) => page.evaluate(f, a);
  await open(page, '?nocine');
  await menu(page, 'new');
  await page.addScriptTag({ path: fileURLToPath(new URL('./lib/camwalk.js', import.meta.url)) });
  await ev((s) => { CW.setup(); game.settings.controls = 'modern'; game.applySettings(); CW.place(s); game.step(1); }, SPOT);
  // the sampler: after every drawn frame (behMenu.render follows renderer.render in Game.frame, drawn or not open)
  await ev(([keep]) => {
    const G = window.game, cv = G.renderer.renderer.domElement, s = document.createElement('canvas'); s.width = 48; s.height = 27;
    const x = s.getContext('2d', { willReadFrequently: true });
    const R = (window.FS = { log: [], keep, full: [] });
    const orig = G.behMenu.render.bind(G.behMenu);
    G.behMenu.render = (r, dt) => {
      orig(r, dt);
      x.drawImage(cv, 0, 0, 48, 27);
      const d = x.getImageData(0, 0, 48, 27).data, g = new Uint8Array(48 * 27);
      for (let i = 0; i < g.length; i++) g[i] = Math.round(0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);
      R.log.push({ t: +performance.now().toFixed(1), beh: G.hero.behaviour, menu: G.behMenu.open, g: Array.from(g) });
      if (G.behMenu.open && R.keep && !R.menuShot) R.menuShot = cv.toDataURL('image/png');   // (the canvas alone, as a canvas recording has it)
      if (R.keepNext > 0) { R.keepNext--; R.full.push({ n: R.log.length - 1, url: cv.toDataURL('image/png') }); }
    };
  }, [!!FR]);
  if (live) await ev(() => { game.testFreeze = false; });
  return { browser, page, ev };
}
// one frame on the fixed clock (drawn)
const frame = (ev, n = 1) => ev((n) => { for (let i = 0; i < n; i++) game.frame(1 / 30, true); }, n);

// a flash: cells near black (< 14) in frame k whose own brightness in k-1 and k+1 is over 40; flagged when such cells
// make a block of at least 12 cells (2.5 % of the picture, ~ a 110×110 px square at 1366×768)
function flashes(log) {
  const out = [];
  for (let k = 1; k < log.length - 1; k++) {
    const a = log[k - 1].g, b = log[k].g, c = log[k + 1].g, hit = new Set();
    for (let i = 0; i < b.length; i++) if (b[i] < 14 && a[i] > 40 && c[i] > 40) hit.add(i);
    if (hit.size < 12) continue;
    // the biggest connected block
    let best = 0; const seen = new Set();
    for (const i of hit) {
      if (seen.has(i)) continue;
      let n = 0; const st = [i]; seen.add(i);
      while (st.length) { const j = st.pop(); n++; const x = j % 48, y = (j / 48) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (y + dy) * 48 + x + dx; if (x + dx >= 0 && x + dx < 48 && y + dy >= 0 && y + dy < 27 && hit.has(q) && !seen.has(q)) { seen.add(q); st.push(q); } } }
      best = Math.max(best, n);
    }
    if (best >= 12) out.push({ k, cells: hit.size, block: best, beh: log[k].beh, prev: log[k - 1].beh, menu: log[k].menu });
  }
  return out;
}
const fullBlack = (log) => log.filter((f) => f.g.filter((v) => v < 8).length > f.g.length * 0.9).length;

const results = {};
// ---------------------------------------------------------------- A: fixed stepping
if (RUN.includes('A')) {
  const { browser, page, ev } = await boot(false);
  await frame(ev, 10);
  const presses = [];
  const press = async (key, want) => {
    // (the first press: its frame, the one before and eight after kept as pictures)
    const b0 = await ev(() => { FS.keepNext = FS.keep && !FS.first ? 10 : 0; FS.first = true; return game.hero.behaviour; });
    await frame(ev, 1);
    await page.keyboard.down(key); await frame(ev, 1); await page.keyboard.up(key); await frame(ev, 8);
    presses.push({ key, from: b0, to: await ev(() => game.hero.behaviour), want });
  };
  await press('F3', 'aggressive');
  for (let c = 0; c < 3; c++) for (const b of ['normal', 'athletic', 'aggressive', 'discreet']) await press(KEY[b], b);
  const log = await ev(() => FS.log), full = await ev(() => FS.full);
  if (FR) full.forEach((f) => writeFileSync(`${FR}A-${String(f.n).padStart(3, '0')}.png`, Buffer.from(f.url.split(',')[1], 'base64')));
  results.A = { frames: log.length, presses, flashes: flashes(log), black: fullBlack(log) };
  await browser.close();
}
// ---------------------------------------------------------------- B, C: the game's own loop
async function live(name, plan) {
  const { browser, page, ev } = await boot(true);
  await page.waitForTimeout(2500);
  const presses = [];
  for (const [kind, key, want] of plan) {
    const b0 = await ev(() => game.hero.behaviour);
    if (kind === 'ctrl+') { await page.keyboard.down('ControlLeft'); await page.waitForTimeout(500); await page.keyboard.press(key); await page.waitForTimeout(600); await page.keyboard.up('ControlLeft'); }
    else if (kind === 'ctrl') { await page.keyboard.down('ControlLeft'); await page.waitForTimeout(700); await page.keyboard.up('ControlLeft'); }
    else await page.keyboard.press(key);
    // (at least 8 frames drawn after it, however slow the loop runs here)
    const n0 = await ev(() => FS.log.length);
    await page.waitForFunction((n) => FS.log.length >= n + 8, n0, { timeout: 180000, polling: 100 }).catch(() => {});
    presses.push({ kind, key, from: b0, to: await ev(() => game.hero.behaviour), want, at: n0, after: (await ev(() => FS.log.length)) - n0 });
  }
  // (each flagged frame: the canvas as drawn then is gone; the log has its grid)
  const log = await ev(() => FS.log);
  const fl = flashes(log);
  const shotM = await ev(() => FS.menuShot);
  if (FR && shotM) writeFileSync(`${FR}${name}-menu-canvas.png`, Buffer.from(shotM.split(',')[1], 'base64'));
  if (FR) for (const f of fl.slice(0, 6)) {
    const g = log[f.k].g, png = await ev((g) => { const c = document.createElement('canvas'); c.width = 48; c.height = 27; const x = c.getContext('2d'), d = x.createImageData(48, 27); g.forEach((v, i) => { d.data.set([v, v, v, 255], i * 4); }); x.putImageData(d, 0, 0); return c.toDataURL(); }, g);
    writeFileSync(`${FR}${name}-flash-${f.k}.png`, Buffer.from(png.split(',')[1], 'base64'));
  }
  const L1 = log.slice(presses[0]?.at ?? 0), dts = L1.slice(1).map((f, i) => f.t - L1[i].t);
  results[name] = { frames: log.length, fps: +(1000 / (dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length))).toFixed(1), presses, flashes: fl, black: fullBlack(log) };
  await browser.close();
}
const cycle = [];
for (let c = 0; c < 3; c++) for (const b of ['normal', 'athletic', 'aggressive', 'discreet']) cycle.push(['key', KEY[b], b]);
if (RUN.includes('B')) await live('B', [['key', 'F3', 'aggressive'], ...cycle]);
if (RUN.includes('C')) await live('C', [['ctrl+', 'F3', 'aggressive'], ['key', 'F1', 'normal'], ['ctrl', null, 'normal'], ['key', 'F3', 'aggressive'], ['key', 'F1', 'normal'], ['key', 'F4', 'discreet']]);
// D: the recording's own sequence (captures/hw-75/trailer.mjs, section 7: both published trailers show the square ~0.2 s
// into the Discreet turn after F4): at the square by the market (the trailer walked to −44, −3 and talked to the nearest
// resident), Modern, the Far camera (the default); F2 + W 1.4 s + Space, F3 + Space twice, F4 + A held 2 s. Every frame
// on the fixed clock; the F4 + A part drawn and sampled; the camera checked on every frame (camwalk.js: inside something
// solid, behind a drawn face, a face nearer than the near plane, the arm's largest jump between frames)
const camD = [];
if (RUN.includes('D')) {
  const { browser, page, ev } = await boot(false);
  const spots = await ev(() => {
    const L = game.npcs.filter((q) => q.present !== false && q.def?.id !== 'zoe' && !q.def?.room).map((q) => [q.def.id, q.pos.x, q.pos.z, Math.hypot(q.pos.x + 44, q.pos.z + 3)]).sort((a, b) => a[3] - b[3]);
    return L.slice(0, +(window.__nD || 3));
  });
  const presses = [];
  const k = async (code, ms = 80) => { await page.keyboard.down(code); await ev(() => game.frame(1 / 30, false)); await page.waitForTimeout(ms); await page.keyboard.up(code); };
  const run = (s, draw) => ev(([s, draw]) => { for (let i = 0, n = Math.round(s * 30); i < n; i++) game.frame(1 / 30, draw); }, [s, draw]);
  for (const [id, nx, nz] of spots) {
    await ev(([x, z]) => { game.settings.camDist = 'far'; game.applySettings(); const px = x + 0.9, pz = z + 0.3; CW.place({ x: px, z: pz, a: Math.atan2(x - px, z - pz) }); game.step(0.5); CW.start(); }, [nx, nz]);
    await k('F2'); await page.keyboard.down('KeyW'); await run(1.4, false); await k('Space', 120); await run(0.5, false); await page.keyboard.up('KeyW');
    await k('F3'); await run(0.4, false); await k('Space', 100); await run(0.6, false); await k('Space', 100); await run(0.8, false);
    const n0 = await ev(() => FS.log.length);
    await k('F4'); const beh = await ev(() => game.hero.behaviour); await run(0.4, true);
    await page.keyboard.down('KeyA'); await run(2.0, true); await page.keyboard.up('KeyA'); await run(0.3, true);
    const st = await ev(() => CW.stop());
    presses.push({ key: 'F4', to: beh, want: 'discreet' });
    camD.push({ id, at: [+nx.toFixed(1), +nz.toFixed(1)], drawn: (await ev(() => FS.log.length)) - n0, inside: st.inside, insWhy: st.insWhy, behindFace: st.behindFace, backWho: st.backWho, xray: st.xray, xrWho: st.xrWho, armRate: st.maxArmRate, stepDeg60: st.maxStepDeg60, minArm: st.minArm });
  }
  const log = await ev(() => FS.log);
  results.D = { frames: log.length, presses, flashes: flashes(log), black: fullBlack(log) };
  await browser.close();
}

for (const [n, r] of Object.entries(results)) {
  const missed = r.presses.filter((p) => p.to !== p.want);
  check(`${n}: every press switched the behaviour as asked (${r.presses.length} presses)`, !missed.length, { missed, presses: r.presses.length });
  // (the behaviour menu's own frames: its four portraits are drawn into the canvas on dark boxes, its frame and labels
  //  are the page's; a canvas-only recording shows them as dark squares in the middle. Listed apart, not a fault)
  const fl = r.flashes.filter((f) => !f.menu), menu = r.flashes.filter((f) => f.menu);
  check(`${n}: no one-frame dark block in ${r.frames} drawn frames${r.fps ? ` (~${r.fps} fps)` : ''} outside the behaviour menu, no all-black frame`, !fl.length && !r.black, { flashes: fl.slice(0, 8), black: r.black, menuFrames: menu.length, framesPerPress: r.presses.map((p) => p.after ?? 10) });
}
if (camD.length) check('D: the camera through the recorded sequence: never inside something solid, behind a drawn face or cut by the near plane (camwalk.js)', camD.every((c) => !c.inside && !c.behindFace && !c.xray), camD);
done();
