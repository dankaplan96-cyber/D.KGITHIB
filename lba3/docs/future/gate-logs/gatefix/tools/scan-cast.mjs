// GATE-FIX scan: do solid story people shut the hero out of an interactive thing's use area?
// Loads a save (Continue), then for the scene he is in and every built interior of this chapter's set, places the cast
// (Story.refreshCast) and, on a grid, finds every interactive thing's use cells (where its prompt is in reach,
// facing ignored) and the cells the hero (r 0.4) can reach: from a room's spawn and exits, or (outdoors) from the edge
// of an 10 m box round each story person. Reports a thing whose use cells are reachable without the people but not
// with them (BLOCKED), and things whose reachable use cells shrink by the people or lie within 1 m of a person (NEAR).
// usage: GAME_URL=... LOAD=<save.json> node scan-cast.mjs <snapdir> [rooms|here]
const snap = process.argv[2], mode = process.argv[3] || 'rooms';
const { launch, open, menu } = await import(snap + '/lba3/tests/lib/boot.mjs');
const { browser, page } = await launch({ width: 480, height: 270, storageState: process.env.LOAD });
await open(page, '?nocine');
await menu(page, 'continue');
import fs from 'node:fs';
await page.evaluate((m) => { window.__scanMode = m; }, mode);
const res = await page.evaluate(fs.readFileSync('/dev/shm/gatefix/scan-page.js', 'utf8'));
console.log(JSON.stringify(res, null, 1));
await browser.close();
