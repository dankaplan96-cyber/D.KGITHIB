// AUTO-FIT (docs/lba3-performance/LAZY_REGIONS.md "Part 2"): the presets' pixel ratio on an integrated GPU with a
// high-density screen, the one-time suggestion when a preset can't hold ~50 fps, the first-start preset pick kept.
// The window is the user's second computer's: 1042×695 at devicePixelRatio 1.475. SwiftShader: no frame rate here
// is measured — the suggestion is checked by feeding the watcher frame times (ISO), the caps by the renderer's numbers.
import { launch, open, menu, checker } from './lib/boot.mjs';
import { gpuQuality, integratedGpu } from '../src/engine/perf.js';
const { check, done } = checker({ info: 'always' });
const { browser, page, errs } = await launch({ width: 1042, height: 695, scale: 1.475 });
const ev = (f, a) => page.evaluate(f, a);

// ---------------------------------------------------------------- the first-start pick (perf.js)
check('the first-start pick: the user\'s Intel UHD (Ice Lake G1) → Low; Iris Xe → Medium; a discrete GPU → High; Intel and AMD APUs count as integrated, Apple not',
  gpuQuality('Intel(R) UHD Graphics (0x00008A56) Direct3D11 vs_5_0 ps_5_0, D3D11') === 'low' && gpuQuality('Intel(R) Iris(R) Xe Graphics Direct3D11') === 'medium' && gpuQuality('NVIDIA GeForce RTX 3060 Direct3D11') === 'high'
  && integratedGpu('Intel(R) UHD Graphics') && integratedGpu('AMD Radeon(TM) Vega 8 Graphics') && integratedGpu('AMD Radeon(TM) Graphics') && !integratedGpu('NVIDIA GeForce RTX 3060') && !integratedGpu('Apple M1'), {});

await open(page, '?nocine');
await menu(page, 'new');
// ---------------------------------------------------------------- pixel ratio caps
const caps = await ev(() => {
  const R = game.renderer, out = {};
  for (const ig of [true, false]) for (const q of ['low', 'medium', 'high']) {
    R.setIntegrated(ig); game.settings.quality = q; game.applySettings(); R.applyResize();
    out[(ig ? 'integrated ' : 'discrete ') + q] = { pr: +R.basePixelRatio().toFixed(3), msaa: R.composer.renderTarget1.samples };
  }
  R.setIntegrated(true); game.settings.quality = 'medium'; game.applySettings();
  return { dpr: devicePixelRatio, out };
});
const C = caps.out;
check('integrated GPU, devicePixelRatio 1.475: Low 0.85, Medium 1.0, High 1.25 (High with MSAA 2×)', C['integrated low'].pr === 0.85 && C['integrated medium'].pr === 1 && C['integrated high'].pr === 1.25 && C['integrated high'].msaa === 2, caps);
check('a discrete GPU keeps the old ratios (Medium 1.25, High the screen\'s 1.475)', C['discrete medium'].pr === 1.25 && C['discrete high'].pr === 1.475, caps);
check('automatic resolution is on by default (a new player)', await ev(() => game.settings.res === 'auto' && game.renderer.autoRes), {});

// ---------------------------------------------------------------- the suggestion (engine/autofit.js), fed frame times
const feed = (o) => ev(({ fps, secs, q, res, floor }) => {
  const G = game, R = G.renderer, F = G.fit;
  G.settings.quality = q; G.settings.res = res; G.applySettings(); G.setState('play');
  const n0 = (G.hud.toastLog || []).length;
  G.testFreeze = false;   // (the watcher ignores the tests' fixed stepping; no real frame runs inside this call)
  try { for (let t = 0; t < secs; t += 1 / fps) { R.dyn = floor ? R.minDyn() : 1; F.frame(1 / fps); } } finally { G.testFreeze = true; R.dyn = 1; }
  return { toasts: (G.hud.toastLog || []).slice(n0), state: F.state(), told: { ...(G.settings.fitTold || {}) } };
}, o);
const fast = await feed({ fps: 58, secs: 60, q: 'high', res: 'auto', floor: true });
check('58 fps on High for a minute: no suggestion', fast.toasts.length === 0, fast);
const notFloor = await feed({ fps: 35, secs: 60, q: 'high', res: 'auto', floor: false });
check('35 fps while the automatic resolution can still lower the resolution: no suggestion yet', notFloor.toasts.length === 0, notFloor);
const slow = await feed({ fps: 35, secs: 60, q: 'high', res: 'auto', floor: true });
check('35 fps on High with the automatic resolution at its lowest: one suggestion to try Medium (the preset is not changed)', slow.toasts.length === 1 && /below 50 fps.*Medium/.test(slow.toasts[0]) && slow.told.high && await ev(() => game.settings.quality === 'high'), slow);
const again = await feed({ fps: 35, secs: 90, q: 'high', res: 'auto', floor: true });
check('... and only once for High (remembered in the settings)', again.toasts.length === 0 && await ev(() => !!JSON.parse(localStorage.getItem('sunshard_settings_v1')).fitTold?.high), again);
const low = await feed({ fps: 30, secs: 60, q: 'low', res: 'full', floor: false });
check('slow on Low with Resolution: Full: one suggestion to try Resolution: Auto', low.toasts.length === 1 && /Resolution: Auto/.test(low.toasts[0]), low);
const menuState = await ev(() => { const G = game, F = G.fit, w0 = F.state().windows; G.settings.quality = 'medium'; G.settings.res = 'auto'; G.applySettings(); G.setState('pause'); G.testFreeze = false; try { for (let i = 0; i < 3000; i++) F.frame(1 / 20); } finally { G.testFreeze = true; } return { ...F.state(), w0, told: { ...(G.settings.fitTold || {}) } }; });
check('menus and pauses are never counted', menuState.settle === 0 && menuState.windows === menuState.w0 && !menuState.told.medium, menuState);

// ---------------------------------------------------------------- the player's choice stays
await ev(() => { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('sunshard_settings_v1')), quality: 'medium', qPicked: true, res: 'full' })); });
await page.reload(); await open(page, '?nocine');
const kept = await ev(() => ({ q: game.settings.quality, res: game.settings.res, auto: game.renderer.autoRes }));
check('a preset and a resolution the player chose stay after a restart (Medium, Full)', kept.q === 'medium' && kept.res === 'full' && !kept.auto, kept);
await ev(() => localStorage.removeItem('sunshard_settings_v1'));
await page.reload(); await open(page, '?nocine');
const fresh = await ev(() => ({ q: game.settings.quality, pick: game.perf.gpu, res: game.settings.res, stored: JSON.parse(localStorage.getItem('sunshard_settings_v1'))?.quality }));
check('a first start picks the preset for the GPU and keeps it stored (here: a software renderer under the tests → High)', fresh.q === 'high' && fresh.stored === 'high' && fresh.res === 'auto', fresh);
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
