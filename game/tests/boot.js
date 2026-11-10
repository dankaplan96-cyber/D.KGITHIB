// Shared launcher for the smoke tests: opens the game in headless Chromium, clears saves,
// passes the boot gate and the studio splash, starts a new game and skips the opening film.
const path = require('path');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
module.exports = async (opts = {}) => {
  const b = await chromium.launch();
  const p = await b.newPage(Object.assign({ viewport: { width: 900, height: 420 } }, opts));
  const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await p.goto(GAME);
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(300); await p.mouse.click(450, 200); await p.waitForTimeout(5000); await p.mouse.click(450, 100); await p.waitForTimeout(1000);
  await p.evaluate(() => { newGame(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { if (film) endFilm(); if (cutscene) cutsceneSkip(); if (dialogue) closeDialogue(); player.story.prologue_done = true; });
  return { b, p, errs };
};
