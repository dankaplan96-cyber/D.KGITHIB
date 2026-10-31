// Detailed tracing for reproduction runs only (never in a baseline): V8's sampling CPU profiler over the DevTools
// protocol, on the game's page. The profile is saved (open it in Chrome DevTools → Performance or Memory → Load) and
// summarised: the functions with the most self time over the window, and the ones sampled inside each stall frame.
import fs from 'node:fs';
import path from 'node:path';

export async function startProfile(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });   // µs
  await cdp.send('Profiler.start');
  // the profile's clock (µs, monotonic) against the page's performance.now(): a named 20 ms busy function runs right
  // after the start; the first sample inside it ties both clocks (to the sampling interval, 0.5 ms)
  const now = await page.evaluate(() => { if (window.__tl) window.__tl.quietUntil = performance.now() + 80;   // (the tool's own 20 ms: those frames are excluded)
    const f = (window.__tlSync ??= function __tlSync() { const t = performance.now(); while (performance.now() - t < 20); return t; }); return f(); });
  return { cdp, now, wall: Date.now() };
}

export async function stopProfile(P, file, stallFrames = []) {
  const { profile } = await P.cdp.send('Profiler.stop');
  await P.cdp.detach().catch(() => {});
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(profile));
  // sample times on the page's clock: the first sample sits near the moment the profiler started
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const label = (n) => { const c = n.callFrame; return `${c.functionName || '(anonymous)'} ${c.url ? c.url.replace(/^.*?\/\/[^/]+/, '') + ':' + (c.lineNumber + 1) : ''}`.trim(); };
  let t = profile.startTime;
  const raw = profile.samples.map((id, i) => { t += profile.timeDeltas[i]; return { id, us: t }; });
  const sync = raw.find((s) => nodes.get(s.id)?.callFrame.functionName === '__tlSync');
  const origin = (sync ? sync.us : profile.startTime) / 1000 - P.now;   // profile ms − page ms
  const samples = raw.map((s) => ({ id: s.id, ms: s.us / 1000 - origin }));
  P.aligned = sync ? 'sync function' : 'profiler start (approximate)';
  const tally = (list) => {
    const m = new Map();
    for (const s of list) { const n = nodes.get(s.id); if (n?.callFrame.functionName === '__tlSync') continue; if (!n || /^\((idle|program|garbage collector)\)$/.test(n.callFrame.functionName)) { const k = n?.callFrame.functionName || '?'; m.set(k, (m.get(k) || 0) + 1); continue; } const k = label(n); m.set(k, (m.get(k) || 0) + 1); }
    const per = profile.timeDeltas.length ? (profile.endTime - profile.startTime) / 1000 / profile.samples.length : 0.5;
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([fn, n]) => ({ fn, ms: +(n * per).toFixed(1) }));
  };
  // the stack of the heaviest sample in a stall: from the leaf to the frame loop
  const stack = (id) => { const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id); const out = []; for (let x = id; x != null && out.length < 12; x = parent.get(x)) { const n = nodes.get(x); if (n && n.callFrame.functionName !== '(root)') out.push(label(n)); } return out; };
  const stalls = stallFrames.map((f) => {
    const inside = samples.filter((s) => s.ms >= f.t - f.ms && s.ms <= f.t);
    const top = tally(inside);
    const leaf = inside.map((s) => s.id).find((id) => { const fn = nodes.get(id)?.callFrame.functionName; return fn && !/^\((idle|program|garbage collector|root)\)$/.test(fn); });
    // how much of the stall the JS profiler saw: little coverage means the main thread waited outside JavaScript
    // (the GPU driver, the browser's GPU process, a synchronous compile): no JS function is blamed then
    const per = (profile.endTime - profile.startTime) / 1000 / Math.max(1, profile.samples.length);
    const js = inside.filter((x) => !/^((idle|program|garbage collector|root))$/.test(nodes.get(x.id)?.callFrame.functionName || '(root)')).length;
    return { t: f.t, ms: f.ms, why: f.why, samples: inside.length, jsMs: +(js * per).toFixed(1), coverage: +Math.min(1, (inside.length * per) / f.ms).toFixed(2), top, stack: leaf != null ? stack(leaf) : [] };
  });
  return { file, aligned: P.aligned, top: tally(samples), stalls };
}
