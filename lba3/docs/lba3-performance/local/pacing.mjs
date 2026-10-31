// Pacing A/B: the display's own pace with nothing drawn (the game's benchIdle hook, as bench.run's "nothing drawn"
// probe: 120 refreshes before and after), around one game.bench.runAuto(); street/interior fps and frame p95 parsed.
const idle = (page) => page.evaluate((n) => new Promise((res) => {
  const iv = []; let last = null; const b0 = game.benching;
  game.benching = true;
  game.benchIdle = (now) => {
    if (last != null) iv.push(now - last); last = now;
    if (iv.length < n) return;
    game.benchIdle = null; game.benching = b0;
    const s = iv.slice().sort((a, b) => a - b), p50 = s[n >> 1];
    res({ p50: +p50.toFixed(2), hz: +(1000 / p50).toFixed(1), mean: +(iv.reduce((a, b) => a + b, 0) / n).toFixed(2), min: +s[0].toFixed(2), max: +s[n - 1].toFixed(2), over17_2: iv.filter((x) => x > 17.2).length });
  };
}), 120);

export function parseRoutes(text) {
  const r = {};
  for (const id of ['street', 'interior']) {
    const m = text.match(new RegExp(`^\\s+${id}\\s+([\\d.]+)\\s+([\\d.]+) / ([\\d.]+) / ([\\d.]+) / ([\\d.]+)`, 'm'));
    if (m) r[id] = { fps: +m[1], p50: +m[2], p95: +m[3], p99: +m[4], max: +m[5] };
  }
  return r;
}

export async function pacing(page) {
  const before = await idle(page);
  const text = await page.evaluate(() => game.bench.runAuto());
  const after = await idle(page);
  const fmt = (x) => `${x.hz} Hz (median ${x.p50} ms, mean ${x.mean}, ${x.min}–${x.max}, ${x.over17_2}/120 over 17.2 ms)`;
  const routes = parseRoutes(text || '');
  return `nothing drawn before the run: ${fmt(before)}\nnothing drawn after the run:  ${fmt(after)}\n`
    + `PACING-JSON ${JSON.stringify({ before, after, routes })}\n\n${text}`;
}
