// RENDER-INV: CPU profile (V8 sampling, CDP) of N rendered frames per situation; self time by function, top rows.
// SwiftShader: the GL calls go to the GPU process, so this is the game's own JavaScript (simulation + submission).
//   GAME_URL=http://localhost:8176/ QUALITY=medium SCENES=street,house,desert node profile.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 90), TOP = +(process.env.TOP || 30);
const SCENES = (process.env.SCENES || 'street,house,desert,zeelich,title').split(',');
const { browser, context, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const cdp = await context.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
const setups = {
  title: 'G.state = "title";',
  street: 'G.state="play"; const r = G.bench.routes().find((x) => x.id === "street"); r.setup(); G._drive = (t, dt) => r.drive(t + 2, dt);',
  house: 'G.state="play"; G.enterRoom("house", null, true, true);',
  desert: 'G.state="play"; G.enterRoom("desert", null, true, true);',
  zeelich: 'G.state="play"; G.enterRoom("zeelich", null, true, true);',
  harbour: 'G.state="play"; G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; G.camRig.pitch = 0.3;',
  combat: 'G.state="play"; const r = G.bench.routes().find((x) => x.id === "combat"); r.setup(); G._drive = (t, dt) => r.drive(t, dt);',
};
const out = { quality, load: os.loadavg().map((x) => +x.toFixed(2)) };
let first = true;
for (const s of SCENES) {
  await page.evaluate(({ code, first }) => {
    const G = game; G._drive = null;
    if (first) { document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
    new Function('G', code)(G);
    for (let i = 0; i < 30; i++) { G._drive?.(i / 30, 1 / 30); G.frame(1 / 30, i % 10 === 9); }
  }, { code: setups[s], first }); first = false;
  await cdp.send('Profiler.start');
  const wall = await page.evaluate((N) => {
    const G = game, gl = G.renderer.renderer.getContext(), px = new Uint8Array(4);
    let busy = 0;
    for (let i = 0; i < N; i++) { G._drive?.(1 + i / 30, 1 / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); G.frame(1 / 30, true); busy += performance.now() - t0; }
    return +(busy / N).toFixed(2);
  }, N);
  const { profile } = await cdp.send('Profiler.stop');
  // self time per node → per function (name + file:line)
  const dt = new Map(); const { samples, timeDeltas, nodes } = profile; const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let i = 0; i < samples.length; i++) dt.set(samples[i], (dt.get(samples[i]) || 0) + (timeDeltas[i] || 0));
  const fn = new Map(); let total = 0;
  for (const [id, us] of dt) { const n = byId.get(id), cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-1)[0]}:${cf.lineNumber + 1}`; fn.set(k, (fn.get(k) || 0) + us); total += us; }
  const idle = fn.get('(idle) :0') || 0, prog = fn.get('(program) :0') || 0;
  const rows = [...fn].filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, us]) => `${(us / 1000 / N).toFixed(3).padStart(7)} ms/frame  ${k}`);
  // by file
  const file = new Map(); for (const [id, us] of dt) { const u = byId.get(id).callFrame.url.split('/').slice(-1)[0] || byId.get(id).callFrame.functionName; file.set(u, (file.get(u) || 0) + us); }
  out[s] = { frameMsBusy: wall, gcMsPerFrame: +((fn.get('(garbage collector) :0') || 0) / 1000 / N).toFixed(3), rows, byFile: [...file].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, us]) => `${(us / 1000 / N).toFixed(2)} ${k}`) };
  console.error('done', s);
}
out.loadAfter = os.loadavg().map((x) => +x.toFixed(2)); out.errors = errs.slice(0, 5);
for (const [k, v] of Object.entries(out)) { if (!v?.rows) continue; console.log(`\n== ${k}: ${v.frameMsBusy} ms/frame busy (incl. render), GC ${v.gcMsPerFrame} ms/frame`); console.log('  by file: ' + v.byFile.join(' | ')); console.log(v.rows.join('\n')); }
console.log('\nload', out.load, '→', out.loadAfter, 'errors', out.errors);
await browser.close();
