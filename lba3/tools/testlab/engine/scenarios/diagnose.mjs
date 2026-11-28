// Where the CPU and the GPU time go, from the game's own instruments (no guesses):
//   cpu-sections  game.bench.visits on the street: the game's CPU per frame by section (people, hero, physics, camera,
//                 render submission main / shadow / post …), exclusive times
//   gpu-breakdown game.bench.run at Medium on the street with one cost taken away at a time (shadows, lamps, MSAA, edge
//                 smoothing, resolution, vegetation …): each variant's GPU time against "as is"
//   js-hotspots   the street walked with real keys under the V8 profiler: the functions with the most self time
import fs from 'node:fs';
import path from 'node:path';
import { assert, newGame, replay, hold, measure, Blocked } from './common.mjs';
import { gameState } from '../probe.mjs';
import { sleep } from '../util.mjs';
import { STREET_START } from './core.mjs';

const M = (realInput, testApi, injectedState, preloadedAssets = false) => ({ realInput, testApi, injectedState, preloadedAssets });
const save = (ctx, name, text) => { fs.writeFileSync(path.join(ctx.dir, 'evidence', name), text); ctx.rec.evidence.push('evidence/' + name); };
async function ready(page) { if ((await gameState(page)).state !== 'play') await newGame(page); }

export const cpuSections = {
  id: 'cpu-sections', title: 'CPU by section on the street (game.bench.visits)', group: 'diagnose', suites: ['diagnose'], session: 'warm', timeoutS: 600,
  method: M(false, true, true, true),
  async run(ctx) {
    await ready(ctx.page);
    const text = await ctx.page.evaluate(() => game.bench.visits({ routes: ['street'], cycles: 2, sustainS: 40, coldS: 6, repeatS: 10, camera: 'follow' }));
    if (!text) throw new Blocked('the benchmark was busy');
    save(ctx, 'cpu-sections.txt', text);
    const line = text.split('\n').find((l) => /sustain\s+street/.test(l)), sec = text.split('\n')[text.split('\n').indexOf(line) + 1] || '';
    ctx.rec.summary = `${line?.trim()}\n${sec.trim()}`;
    assert(ctx.rec, 'CPU sections reported', /CPU by section/.test(sec), 'a CPU-by-section line', sec.slice(0, 120));
  },
};

export const gpuBreakdown = {
  id: 'gpu-breakdown', title: 'GPU cost by feature on the street (game.bench.run breakdown)', group: 'diagnose', suites: ['diagnose'], session: 'warm', timeoutS: 900,
  method: M(false, true, true, true),
  async run(ctx) {
    await ready(ctx.page);
    const text = await ctx.page.evaluate(() => game.bench.run({ qualities: ['medium'], routes: ['street'], played: false, breakdownHigh: false, camera: 'follow' }));
    if (!text) throw new Blocked('the benchmark was busy');
    save(ctx, 'gpu-breakdown.txt', text);
    const rows = text.split('\n').filter((l) => /medium street · /.test(l));
    const gpu = (l) => +((l.match(/GPU p50 ([\d.]+)/) || [])[1]);
    const asIs = rows.find((l) => /· as is/.test(l));
    ctx.rec.breakdown = rows.map((l) => ({ variant: l.match(/street · (.+?)\s{2,}/)?.[1]?.trim() || l.slice(0, 40), gpu: gpu(l), fps: +((l.match(/([\d.]+) fps/) || [])[1]) })).filter((b) => b.gpu > 0);   // (the report lists the variants twice; the second list has no GPU column)
    ctx.rec.summary = ctx.rec.breakdown.map((b) => `${b.variant}: GPU ${b.gpu} ms (${b.fps} fps)`).join(' · ');
    assert(ctx.rec, 'breakdown measured with the GPU timer', asIs && gpu(asIs) > 0, 'GPU p50 on "as is"', asIs ? gpu(asIs) : 'no "as is" row');
  },
};

export const jsHotspots = {
  id: 'js-hotspots', title: 'JavaScript hot spots on the street (V8 profiler, real walk)', group: 'diagnose', suites: ['diagnose'], session: 'warm', timeoutS: 300,
  method: M(true, true, true),
  async run(ctx) {
    const { page, rec } = ctx;
    await ready(page);
    await page.evaluate((s) => { game.resetCombat?.('drop'); game.exitRoom(s, true, true); }, STREET_START);
    await sleep(3000);
    ctx.tracing = true;   // (the profiler: this test is diagnostic, its fps are not a baseline)
    const tl = [...hold('ArrowUp', 0, 3), ...hold('ArrowRight', 3, 4), ...hold('ArrowUp', 4, 7), ...hold('ArrowRight', 7, 8), ...hold('ArrowUp', 8, 11), ...hold('ArrowRight', 11, 12), ...hold('ArrowUp', 12, 15)];
    const m = await measure(ctx, 'street walk 15 s (profiled)', () => replay(page, tl, ctx.stopped), { perf: false });
    ctx.tracing = false;
    const P = rec.windows.at(-1).profile;
    rec.summary = P ? P.top.map((x) => `${x.fn} ${x.ms} ms`).join('\n') : 'no profile';
    save(ctx, 'js-hotspots.txt', `JS self time over ${m.stats?.seconds} s of street walking (sampled every 0.5 ms; (idle) = waiting for the next frame / the GPU)\n${rec.summary}\n`);
    assert(rec, 'profile taken', !!P, 'a CPU profile', P ? P.file : 'none');
  },
};

export const DIAGNOSE = [cpuSections, gpuBreakdown, jsHotspots];
