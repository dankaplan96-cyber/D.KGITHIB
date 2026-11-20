// V96-GPU / 52.2 (v103): Hebrew, subtitles extra large, 1920x1080, Chrome on the GTX 1050: the title, the opening's
// dialogue box, the inventory and the journal, the yard, Twinsen's roof, the east street, the harbour's L pier and sea.
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [URL0, OUT, STORE] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--window-size=1940,1220'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, storageState: STORE });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(2500);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.jpg`, type: 'jpeg', quality: 80 });
const info = { lang: await page.evaluate(() => [game.settings.lang, game.settings.textSize, document.documentElement.dir, document.body.className]) };
await shot('01-title');
await page.click('[data-act="new"]'); await page.waitForTimeout(800);
if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]');
await page.waitForFunction(() => game.state && !game.preparing, null, { timeout: 300000 });
await page.waitForTimeout(2500);
info.firstState = await page.evaluate(() => game.state);
await shot('02-opening-dialogue');
// the dialogue box's text: shown whole? (scroll vs client)
info.box = await page.evaluate(() => { const D = document.querySelector('#dialog'), T = D?.querySelector('.text'); if (!T) return null; const r = D.getBoundingClientRect(); return { text: T.textContent.slice(0, 120), over: T.scrollHeight > T.clientHeight + 2, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], font: getComputedStyle(T).fontSize, dir: getComputedStyle(T).direction }; });
// through the opening's talk (as a player: E) to play
for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => game.state); if (s === 'play') break; await page.keyboard.press('KeyE'); await page.waitForTimeout(450); if (i === 3) await shot('03-opening-dialogue-2'); }
await page.waitForTimeout(1500); await shot('04-house-play');
// the inventory, then the journal
await page.evaluate(() => { const G = game; G.setState('inventory'); G.inventory.show(true); });
await page.waitForTimeout(700); await shot('05-inventory');
info.inv = await page.evaluate(() => { const el = document.querySelector('#inventory'); const all = [el, ...el.querySelectorAll('*')]; return { clipped: all.filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'hidden').length, dir: getComputedStyle(el).direction }; });
await page.evaluate(() => game.inventory.setTab('journal')); await page.waitForTimeout(600); await shot('06-journal');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
if (await page.evaluate(() => game.state !== 'play')) { await page.evaluate(() => { const G = game; G.inventory.show(false); G.setState('play'); }); await page.waitForTimeout(400); }
// outdoors, the play camera: put him there, let the camera settle in real time
const at = async (n, x, z, a) => { await page.evaluate(([x, z, a]) => { const G = game; if (G.room) G.exitRoom({ x, z, a }, true); const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z, 60), z); h.angle = a; h.vel?.set?.(0, 0, 0); G.camRig.lba && (G.camRig.lba.init = false); }, [x, z, a]);
  await page.waitForTimeout(3500); await shot(n); };
await at('07-yard', -44.5, 80.5, -Math.PI / 2);
await at('09-east-street', -35, 28, Math.PI);
await at('10-harbour-quay', -72, -2, -Math.PI / 2);
await at('11-harbour-pier', -84, -4, -Math.PI / 2);
// free views from above: the roof, the pier and the sea (the play camera held off for one picture)
const view = async (n, from, to) => { await page.evaluate(([f, t]) => { const G = game; G.__freeze = G.testFreeze; G.testFreeze = true; const C = G.camera; C.position.set(...f); C.lookAt(...t); C.updateMatrixWorld(); G.renderer.render(); }, [from, to]);
  await shot(n); await page.evaluate(() => { game.testFreeze = game.__freeze; }); };
await at('08a-house-front', -40, 80, -Math.PI / 2);
await view('08-roof', [-36, 13, 92], [-50.6, 3, 79.8]);
await at('12a', -84, -4, -Math.PI / 2);
await view('12-pier-and-sea', [-60, 16, 18], [-86, 0, -8]);
info.errs = errs.slice(0, 8);
fs.writeFileSync(`${OUT}/info.json`, JSON.stringify(info, null, 1)); console.log(JSON.stringify(info));
await browser.close(); process.exit(0);
