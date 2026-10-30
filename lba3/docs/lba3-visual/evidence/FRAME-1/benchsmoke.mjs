// FRAME-1: the in-game benchmark run end to end in real time (Low only, as from the pause menu) to check its report
// (pacing lines: stalls behind black, frames over 33 ms, the longest frames, the frame-rate limit, the software
// rendering note). SwiftShader: the numbers are CPU-drawn, only the report's shape is checked here.
//   GAME_URL=http://localhost:8171/ node benchsmoke.mjs
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine'); await menu(page, 'new');
const text = await page.evaluate(async () => { game.testFreeze = false; game.settings.fps = '30'; game.applySettings(); const t = await game.bench.run(['low']); const after = { fps: game.settings.fps, cap: game.frameCapMs, benching: game.benching }; game.settings.fps = 'auto'; game.applySettings(); game.testFreeze = true; return t + '\n(after the run: ' + JSON.stringify(after) + ')'; });
console.log(text);
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
