// Regression (QA.md D9): every file the game requests from its own server, at start-up and in a new game's first
// seconds (the opening runs), is in the shipped file list (tools/game-files.mjs), which the desktop app and the
// published page are built from. A file missing there loads in the browser but is a 404 in the desktop app.
import { launch, open, menu, checker, URL0 } from './lib/boot.mjs';
import { gameFiles } from '../tools/game-files.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const asked = new Set();
page.on('request', (r) => { const u = r.url(); if (u.startsWith(URL0)) asked.add(decodeURIComponent(u.slice(URL0.length).split('?')[0]) || 'index.html'); });
await open(page, ''); await menu(page, 'new');
await page.evaluate(() => { for (let i = 0; i < 300; i++) game.step(1 / 30); });
await page.waitForTimeout(1500);
const shipped = new Set([...Object.values(gameFiles()), 'index.html']);
const missing = [...asked].filter((p) => !shipped.has(p) && !p.startsWith('tests/'));
check(`all ${asked.size} requested files are shipped`, missing.length === 0, missing);
check('LBA1 room layouts are among them (assets/lba1/*.json)', [...asked].some((p) => p.startsWith('assets/lba1/')) && shipped.has('assets/lba1/asylum.json'), [...asked].filter((p) => p.includes('lba1')));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
