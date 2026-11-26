// P127: the Joint Project's crew before and after their new look (orange-yellow overalls, hi-vis vest), and Arthur's
// narration over the notebook. Shots on the real game (SERVE=1 style: this checkout's files by request routing).
//   node tools/p127-shots.mjs <out dir> <tag> [route=file ...]
// route=file serves a file instead of this checkout's (the "before": the original characters.js and crew models).
// Writes <tag>-op18.jpg, <tag>-op26.jpg (the opening's harbour, the film's old 18 s and 26 s on the notebook cut's
// clock), <tag>-pier.jpg (chapter 1: the yard's worker at the harbour, play camera), <tag>-dig.jpg (chapter 4: the dig's
// crew, play camera); with NB=1 also <tag>-nb-en.jpg / -nb-he.jpg (a notebook line with its speaker). SwiftShader.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { serveLocal } from '../tests/lib/serve.mjs';
const [OUT, TAG, ...ovs] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const URL0 = 'http://localhost:8123/';
const HARNESS = new URL('../tests/lib/player.js', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const newPage = async (lang = null) => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await serveLocal(p);
  for (const o of ovs) {
    const [route, file] = o.split('=');
    await p.route(URL0 + route, (r) => r.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': route.endsWith('.js') ? 'text/javascript' : 'application/json', 'cache-control': 'no-store' } }));
  }
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  return p;
};
const boot = async (p, q = '') => {
  await p.goto(URL0 + q, { waitUntil: 'load', timeout: 300000 });
  await p.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000 });
  await p.evaluate(() => { game.testFreeze = true; });
  await p.addScriptTag({ path: HARNESS });
};
const newGame = async (p) => {
  await p.click('[data-act="new"]', { timeout: 120000 });
  if (await p.evaluate(() => game.screen === 'confirmnew')) await p.click('#confirmnew [data-act="newyes"]');
};
const shot = async (p, name) => { await p.evaluate(() => game.renderer.render()); await p.screenshot({ path: path.join(OUT, `${TAG}-${name}.jpg`), type: 'jpeg', quality: 88, timeout: 180000 }); console.log('shot', TAG + '-' + name); };
const runTo = (p, t) => p.evaluate((t) => { for (let i = 0; i < 9000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);

// ---- the opening (the notebook cut, the default): the harbour at the film's old 18 s and 26 s (NO_OP=1: skipped)
if (!process.env.NO_OP) {
  const p = await newPage();
  await boot(p);
  await p.evaluate(() => localStorage.clear());
  await newGame(p);
  await p.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  const nb = await p.evaluate(() => game.cine.clock.nb);
  for (const old of [18.0, 26.0]) { await runTo(p, old + nb); await shot(p, 'op' + old.toFixed(0)); }
  await p.close();
}
// ---- the notebook's narration (NB=1): a line with Arthur's name, English and Hebrew
if (process.env.NB) for (const lang of ['en', 'he']) {
  const p = await newPage(lang);
  await boot(p);
  if (lang === 'he') {   // (as a player chooses it: Settings, Language; tests/hebrew.mjs)
    await p.click('[data-act="settings"]');
    await p.click(`#settings .seg[data-setting="lang"] button[data-v="he"]`);
    await p.click('#settings .menu button');
  }
  await newGame(p);
  await p.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 300000 });
  await runTo(p, 5.6);
  console.log(lang, await p.evaluate(() => [document.documentElement.lang, document.querySelector('#cine-sub').textContent, document.querySelector('#cine-cap')?.textContent]));
  await shot(p, 'nb-' + lang);
  await p.close();
}
// ---- play: the yard's worker at the harbour (chapter 1) and the dig's crew (chapter 4), from the play camera
{
  const p = await newPage();
  await boot(p, '?nocine');
  await p.evaluate(() => localStorage.clear());
  await newGame(p);
  await p.evaluate(() => { game.testFreeze = true; game.step(0.5); });
  const place = (key, extra, area, x, z, ids) => p.evaluate(async ([key, extra, area, x, z, ids]) => {
    const RG = await import('/src/game/regions.js');
    const G = game, f = G.flags; P.settle();
    window.BASE ||= JSON.parse(JSON.stringify(f));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, opening: true, chapterKey: key, c1_water: true, c1_done: true }, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    for (const id of RG.CHAPTER_AREAS[key] || []) G.regions.ensure(id, 'test');
    G.story.applyFlags(); G.step(0.2);
    if (area === 'citadel') G.exitRoom({ x, z, a: 0 }, true, true); else G.enterRoom(area, { x, z, a: 0 }, true, true);
    G.story.refreshCast(); G.step(0.5);
    const crew = G.npcs.filter((n) => ids.includes(n.def.id) && n.present && n.rig?.root.visible);
    if (!crew.length) return { none: G.npcs.filter((n) => /worker/.test(n.def.char || '')).map((n) => [n.def.id, n.present, Math.round(n.pos.x), Math.round(n.pos.z)]) };
    // Twinsen 3.2 m from the first of them, facing them; the play camera behind him, settled
    const n0 = crew[0], h = G.hero, a = n0.angle;
    const hx = n0.pos.x + Math.sin(a) * 3.2, hz = n0.pos.z + Math.cos(a) * 3.2;
    h.pos.set(hx, G.physics.groundAt(hx, hz), hz); h.angle = Math.atan2(n0.pos.x - hx, n0.pos.z - hz) + 0.45;   // (a little past them: the play camera behind him sees them beside him, not behind his head)
    h.onGround = true; h.vy = 0;
    if (G.camRig.lba) G.camRig.lba.init = false;
    for (const n of crew) n.update = () => {};   // (held where they stand: the same frame before and after)
    G.step(1.5); P.settle();
    return { at: crew.map((n) => [n.def.id, n.def.char, n.def.dress, Math.round(n.pos.x), Math.round(n.pos.z)]) };
  }, [key, extra, area, x, z, ids]);
  // (chapter 1 before the water is back: the worker at the cargo lift's control on the stone pier)
  console.log('pier', JSON.stringify(await place('project', { c1_started: true, c1_arrived: true, c1_water: false, c1_done: false }, 'citadel', -42, 2, ['worker'])));
  await shot(p, 'pier');
  console.log('dig', JSON.stringify(await place('dig', { c4_started: true }, 'desert', 3444, 3, ['dg_surv', 'dg_porter', 'dg_dig'])));
  await shot(p, 'dig');
  await p.close();
}
await browser.close();
