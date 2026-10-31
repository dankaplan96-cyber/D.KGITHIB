// PERF-CPU: what runs in the first frames of the benchmark's first route (the user's battery run: Low street, 3484 ms +
// 1667 ms frames at 3.5 / 5.2 s). The full benchmark's fixed run of one route at one preset, as the pause menu starts
// it, with every long frame's attribution (bench.js hitchList: "frame before: work … ms, draw batches built …"), the
// programs compiled and the jobs counted per frame. SwiftShader: every frame is long here — read the work and the
// jobs, not the lengths. GAME_URL=http://localhost:8214/ Q=low ROUTE=street node firstentry.mjs
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await menu(page, 'new');
const r = await ev(async ({ Q, ID }) => {
  const G = game; G.testFreeze = false;
  // every frame's work and jobs, from the game's own counters (Game.advance: _jobsPrev)
  const log = []; const adv = G.advance.bind(G);
  G.advance = (real) => { const t0 = performance.now(); adv(real); log.push({ t: Math.round(t0), real: Math.round(real * 1000), work: Math.round(G._workMs), jobs: G._jobsPrev, state: G.state, trans: !!G.trans, black: !!G._shownBlack, hold: !!G.gfxHold }); };
  const text = await G.bench.run([Q], { routes: [ID], breakdown: false, played: false });
  G.advance = adv;
  return { text, log: log.filter((x) => x.work > 60 || /built|compiled|rebuilt|upload|GC/.test(x.jobs || '')).slice(0, 80) };
}, { Q, ID });
console.log(r.text.split('\n').filter((l) => /street|interior|combat|arrival|every frame|hitch|first/.test(l)).join('\n'));
console.log('--- frames with > 60 ms of work or a job (t ms since load · interval · work · jobs of that frame)');
for (const x of r.log) console.log(`${x.t} · ${x.real} · work ${x.work} · ${x.state}${x.trans ? ' trans' : ''}${x.black ? ' black' : ''}${x.hold ? ' hold' : ''} · ${x.jobs}`);
await browser.close();
