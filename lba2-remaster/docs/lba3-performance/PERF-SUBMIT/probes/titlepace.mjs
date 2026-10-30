// STABILIZATION: the title's even pace (main.js titlePace) — its rule on made-up intervals, and the loop with it on:
// how many refreshes draw a frame (every other one), and that play has every refresh again.
//   GAME_URL=http://localhost:8351/ node titlepace.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '');
const r = await ev(async () => {
  const G = game, out = [], cal = G.autoQ?.cal; if (cal) cal.done = true;
  const feed = (list) => { G._titleCap = false; G._tp = null; for (const ms of list) { if (G._titleCap) break; G.titlePace(ms, 16.67); } return G._titleCap; };
  const n = (s, ms) => Array.from({ length: Math.round(s * 1000 / ms) }, () => ms);
  out.push(`state ${G.state} · Auto's title calibration ${cal ? 'done (set for this check)' : 'none'}`);
  out.push(`4 s at 16.7 ms: paced ${feed(n(4, 16.67))} (want false)`);
  out.push(`1.5 s of one-off 200 ms frames, then 3 s at 16.7: paced ${feed([...n(1.5, 200), ...n(3, 16.67)])} (want false)`);
  out.push(`one 300 ms hitch in 4 s at 16.7: paced ${feed([...n(2, 16.67), 300, ...n(2, 16.67)])} (want false)`);
  out.push(`4 s alternating 16.7 / 33.3 (45 fps): paced ${feed(n(4, 25).map((x, i) => (i % 2 ? 33.3 : 16.7)))} (want true)`);
  out.push(`4 s at 20 ms (50 fps): paced ${feed(n(4, 20))} (want true)`);
  // the loop: rAF callbacks against frames advanced over 3 s, paced and not
  const count = (ms) => new Promise((res) => { let raf = 0, adv = 0; const a = G.advance; G.advance = function (x) { adv++; return a.call(this, x); };
    const t0 = performance.now(); const tick = () => { raf++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else { G.advance = a; res({ raf, adv }); } }; requestAnimationFrame(tick); });
  G.testFreeze = false; G._titleCap = false; G._tp = null; window.__noPace = true;
  const tp = G.titlePace; G.titlePace = () => {};   // (not switched on by this machine's own slow frames meanwhile)
  const a = await count(3000);
  G._titleCap = true; const b = await count(3000);
  G.setState('play'); const c = { cap: G._titleCap }; G.setState('title'); G.titlePace = tp; G.testFreeze = true;
  out.push(`loop, every refresh: ${a.adv} frames for ${a.raf} refreshes · paced: ${b.adv} for ${b.raf} (want about half) · after play: paced ${c.cap} (want false) · refresh measured ${G._refresh?.toFixed(1)} ms`);
  return out.join('\n');
});
console.log(r);
await browser.close();
