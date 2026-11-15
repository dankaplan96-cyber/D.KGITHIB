// TWINSEN-FIGURE: the Display setting "Twinsen model" picks the candidate (assets/poly/twinsen-figure.json) at the next
// start; the default stays the shipped model; clicking the setting stores it; no page errors either way.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { watch, checker } from './lib/boot.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = watch(page);
const { check, done } = checker({ info: 'always' });
const URL = (process.env.GAME_URL || 'http://localhost:8123/') + '?nocine';
const boot = async () => {
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
  await page.click('[data-act="new"]', { timeout: 180000 });
  return page.evaluate(() => { const G = window.game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5);
    let tris = 0, top = -9; G.hero.rig.mesh.traverse((o) => { if (o.isSkinnedMesh && o.geometry?.attributes?.position) { tris += o.geometry.attributes.position.count / 3; } });
    return { tris: Math.round(tris), setting: G.settings.twModel }; });
};
await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
await page.evaluate(() => localStorage.clear());
const a = await boot();
check('default: the shipped model, setting "current"', a.setting === 'current', a);
const clicked = await page.evaluate(() => { const G = window.game; const b = document.querySelector('[data-setting="twModel"] [data-v="figure"]'); if (!b) return null; b.click(); return JSON.parse(localStorage.getItem('sunshard_settings_v1'))?.twModel; });
check('clicking "Figurine (trial)" stores it', clicked === 'figure', { clicked });
const b = await boot();
check('after a restart the hero is the figurine model (more triangles)', b.setting === 'figure' && b.tris > a.tris, { a, b });
check('no page errors', errs.length === 0, errs.slice(0, 3));
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
