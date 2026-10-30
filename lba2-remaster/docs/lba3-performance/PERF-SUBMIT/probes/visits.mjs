// STABILIZATION: the benchmark's visits / runAuto / run as the laptop runner calls them, here on SwiftShader (the game on
// its own clock; counts exact, ms this machine's), short by default. Prints the report.
//   GAME_URL=http://localhost:8351/ MODE=visits|auto|full CAMERA=follow OPTS='{"cycles":1,"sustainS":10,"coldS":4,"repeatS":6}' node visits.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const MODE = process.env.MODE || 'visits', CAMERA = process.env.CAMERA || 'orbit', OPTS = JSON.parse(process.env.OPTS || '{"cycles":1,"sustainS":10,"coldS":4,"repeatS":6}');
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
if (process.env.Q) await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, process.env.Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await ev(() => { game.testFreeze = false; });
await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.preparing, null, { timeout: 900000 });
const text = await ev(({ MODE, CAMERA, OPTS }) => {
  const o = { routes: ['street', 'arrival'], ...OPTS, camera: CAMERA };
  return MODE === 'auto' ? game.bench.runAuto({ ...o, measure: OPTS.measure ?? 6 }) : MODE === 'full' ? game.bench.run({ qualities: ['medium'], breakdown: false, played: false, ...o }) : game.bench.visits(o);
}, { MODE, CAMERA, OPTS });
console.log(text);
await browser.close();
