(async () => {
  // frames advanced per second in play: focused, then after a window blur, then after focus again (drawing stubbed out
  // so SwiftShader's raster time doesn't set the pace: this checks the loop's own decisions)
  const G = game; G.testFreeze = false; G.setState('play');
  const R = G.renderer, r0 = R.render; R.render = () => {};
  let n = 0, times = []; const adv = G.advance.bind(G); G.advance = (real) => { n++; times.push(real); return adv(real); };
  const count = async (ms) => { n = 0; times = []; await new Promise((r) => setTimeout(r, ms)); return { perSec: +(n * 1000 / ms).toFixed(1), maxRealMs: Math.round(Math.max(0, ...times) * 1000), gameTimeS: +times.reduce((a, b) => a + b, 0).toFixed(2) }; };
  const out = {};
  out.focused = await count(3000);
  const t0 = G.time;
  dispatchEvent(new Event('blur'));
  out.blurred = await count(3000);
  out.blurredGameTimeAdvanced = +(G.time - t0).toFixed(2);
  dispatchEvent(new Event('focus'));
  out.refocused = await count(3000);
  G.advance = adv; R.render = r0; G.testFreeze = true;
  return JSON.stringify(out);
})()
