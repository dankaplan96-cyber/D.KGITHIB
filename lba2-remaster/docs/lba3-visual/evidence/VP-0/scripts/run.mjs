// VP-0 capture runner: node run.mjs <scenario.mjs> [W] [H]
// GAME_URL=http://localhost:8151/ ; LOAD=<storage.json> (Continue), KEEP=<storage.json> (save & quit at the end)
// A scenario exports `default async function (h)` with h = { page, ev, shot, seq, log, W, H }.
// Frames: game.step() never renders, so each capture calls game.renderer.render() first, then a JPEG screenshot.
import { launch, open, menu, quitAndKeep } from '../../../../../tests/lib/boot.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVD = path.resolve(HERE, '..');
const W = +(process.argv[3] || 1280), H = +(process.argv[4] || 720);
const scen = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { browser, context, page, errs } = await launch({ width: W, height: H, storageState: process.env.LOAD });
await open(page, process.env.Q ?? '?nocine');
if (process.env.MENU !== 'none') await menu(page, process.env.MENU || (process.env.LOAD ? 'continue' : 'new'));
const log = (...a) => console.log(...a);
const ev = (fn, arg) => page.evaluate(fn, arg);
// a full-frame JPEG (or a clip) into shots/
const shot = async (name, { clip, dir = 'shots', q = 72 } = {}) => {
  if (clip === null) { log('shot skipped (off screen): ' + name); return null; }
  await page.evaluate(() => game.renderer.render());
  const p = path.join(EVD, dir, name + '.jpg');
  try { await page.screenshot({ path: p, type: 'jpeg', quality: q, timeout: 120000, ...(clip ? { clip } : {}) }); } catch (e) { log('shot failed: ' + name + ' ' + e.message.split('\n')[0]); return null; }
  return p;
};
// the hero's (or any point's) screen box
const heroBox = (size = 260, yOff = 0.9) => page.evaluate(([size, yOff, W, H]) => {
  const v = game.hero.pos.clone(); v.y += yOff; v.project(game.camera);
  const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
  const s = Math.min(size, W, H);
  return { x: Math.max(0, Math.min(W - s, x - s / 2)), y: Math.max(0, Math.min(H - s, y - s / 2)), width: s, height: s };
}, [size, yOff, W, H]);
// a motion sequence: n frames; before each, stepFn(i) runs in the page (it must advance the game); frames are crops
// around the hero (fixed box from the first frame unless follow), then a contact sheet (montage) in motion/
const seq = async (name, n, stepFn, { size = 260, follow = false, cols = 8, yOff = 0.9, arg, label = (i) => String(i), full = false, at = null } = {}) => {
  const dir = path.join(EVD, 'motion', name); fs.mkdirSync(dir, { recursive: true });
  const boxNow = async () => full ? undefined : at ? await page.evaluate(([p, size, W, H]) => { const v = new game.hero.pos.constructor(p[0], p[1], p[2]); v.project(game.camera); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, s = Math.min(size, W, H); return { x: Math.max(0, Math.min(W - s, x - s / 2)), y: Math.max(0, Math.min(H - s, y - s / 2)), width: s, height: s }; }, [at, size, W, H]) : await heroBox(size, yOff);
  let box = await boxNow(); const files = [], data = [];
  for (let i = 0; i < n; i++) {
    const d = await page.evaluate(stepFn, { i, arg });
    data.push(d);
    if (follow) box = await boxNow();
    await page.evaluate(() => game.renderer.render());
    const f = path.join(dir, String(i).padStart(3, '0') + '.jpg');
    await page.screenshot({ path: f, type: 'jpeg', quality: 70, timeout: 120000, ...(box ? { clip: box } : {}) });
    files.push(f);
  }
  const sheet = path.join(EVD, 'motion', name + '.jpg');
  const lab = [];
  files.forEach((f, i) => lab.push('-label', label(i, data[i]), f));
  execFileSync('montage', [...lab, '-tile', cols + 'x', '-geometry', full ? '320x180+2+2' : `${Math.min(size, 200)}x${Math.min(size, 200)}+2+2`, '-pointsize', '11', '-quality', '72', sheet]);
  fs.rmSync(dir, { recursive: true, force: true });   // keep only the sheet (small)
  return { sheet, data };
};
// fast frames: the WebGL canvas read back right after a render (no compositor screenshot, so no DOM overlay:
// use seq() when the HUD/fade matters). box in CSS px; returns a JPEG file
const grab = async (file, box) => {
  const b64 = await page.evaluate((box) => {
    game.renderer.render();
    const c = game.renderer.renderer.domElement, k = c.width / innerWidth;
    const bx = box || { x: 0, y: 0, width: innerWidth, height: innerHeight };
    const o = document.createElement('canvas'); o.width = Math.round(bx.width * k); o.height = Math.round(bx.height * k);
    o.getContext('2d').drawImage(c, bx.x * k, bx.y * k, bx.width * k, bx.height * k, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', 0.75).split(',')[1];
  }, box);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
};
const seqFast = async (name, n, stepFn, { size = 260, follow = false, cols = 8, yOff = 0.9, arg, label = (i) => String(i), full = false, at = null } = {}) => {
  const dir = path.join(EVD, 'motion', name); fs.mkdirSync(dir, { recursive: true });
  const boxNow = async () => full ? undefined : at ? await page.evaluate(([p, size, W, H]) => { const v = new game.hero.pos.constructor(p[0], p[1], p[2]); v.project(game.camera); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, s = Math.min(size, W, H); return { x: Math.max(0, Math.min(W - s, x - s / 2)), y: Math.max(0, Math.min(H - s, y - s / 2)), width: s, height: s }; }, [at, size, W, H]) : await heroBox(size, yOff);
  let box = await boxNow(); const files = [], data = [];
  for (let i = 0; i < n; i++) {
    const d = await page.evaluate(stepFn, { i, arg });
    data.push(d);
    if (follow) box = await boxNow();
    const f = path.join(dir, String(i).padStart(3, '0') + '.jpg');
    await grab(f, box); files.push(f);
  }
  const sheet = path.join(EVD, 'motion', name + '.jpg');
  const lab = []; files.forEach((f, i) => lab.push('-label', label(i, data[i]), f));
  execFileSync('montage', [...lab, '-tile', cols + 'x', '-geometry', full ? '320x180+2+2' : `${Math.min(size, 200)}x${Math.min(size, 200)}+2+2`, '-pointsize', '11', '-quality', '72', sheet]);
  if (!process.env.KEEPFRAMES) fs.rmSync(dir, { recursive: true, force: true });
  return { sheet, data };
};
let failed = false;
try { await scen.default({ page, ev, shot, seq, seqFast, grab, log, W, H, heroBox, context, EVD }); }
catch (e) { failed = true; log('SCENARIO ERROR', e.stack || e.message); }
if (process.env.KEEP && !failed) { await quitAndKeep(page, context, process.env.KEEP); log('kept', process.env.KEEP); }
log(errs.length ? errs.slice(0, 20).join('\n') : 'no page errors');
await browser.close();
process.exit(failed ? 1 : 0);
