// The core path: cold launch → title → playable scene → street traversal with real input.
import { assert, newGame, replay, hold, measure, dist, writeScenario } from './common.mjs';
import { gameState, counters } from '../probe.mjs';
import { sleep } from '../util.mjs';

// Cold launch: a new, empty test profile (no shader cache, no save): process start to the title screen, as timed by launch()
export const coldLaunch = {
  id: 'cold-launch', title: 'Cold launch to title', group: 'startup', suites: ['quick', 'full'], session: 'fresh', timeoutS: 420,
  method: { realInput: false, testApi: false, injectedState: false, preloadedAssets: false },
  async run(ctx) {
    const L = ctx.H.launchInfo;
    ctx.rec.launch = L;
    assert(ctx.rec, 'a new, empty profile', L.coldProfile, 'cold profile', L.coldProfile ? 'cold' : 'warm');
    assert(ctx.rec, 'title screen within 60 s', L.titleMs < 60000, '< 60000 ms', `${L.titleMs} ms`);
    const errs = ctx.H.errors.length;
    assert(ctx.rec, 'no errors while loading', errs === 0, 0, errs);
    ctx.rec.windows.push({ label: 'launch', perf: false, stats: null, settings: `process start → page loaded ${L.launchMs} ms · → title ${L.titleMs} ms` });
  },
};

// Title → playable: New Game by a real click (?nocine: the opening is its own test), until the player can move
export const titleToPlay = {
  id: 'title-to-play', title: 'Title to playable scene', group: 'startup', suites: ['quick', 'full'], session: 'fresh', timeoutS: 420,
  method: { realInput: true, testApi: false, injectedState: false, preloadedAssets: false },
  async run(ctx) {
    const { page, rec } = ctx;
    const t = Date.now();
    await measure(ctx, 'New Game until playable', () => newGame(page), { perf: false });
    const ms = Date.now() - t, s = await gameState(page);
    rec.windows.at(-1).settings += ` · ${ms} ms`;
    assert(rec, 'playable after New Game', s.state === 'play' && !s.cine, 'state play, no cinematic', `${s.state}${s.cine ? ' + cinematic' : ''}`);
    assert(rec, 'starts in the house (chapter 1)', s.room === 'house', 'house', s.room);
    assert(rec, 'within 30 s', ms < 30000, '< 30000 ms', `${ms} ms`);
    // a key moves Twinsen: controls work
    const p0 = s.pos; await replay(page, hold('ArrowUp', 0, 1.2)); const p1 = (await gameState(page)).pos;
    assert(rec, 'Twinsen moves with the arrow keys', dist(p0, p1) > 0.5, '> 0.5 m', `${dist(p0, p1).toFixed(2)} m`);
  },
};

// Street traversal: the Citadel square and shopping street (the benchmark's street, the heaviest scene on the
// laptop), walked with real arrow keys on the player's own camera: a loop of four legs, the same timeline every run.
export const STREET_START = { x: -46, z: 2, a: Math.PI / 2 };
const LOOP = [...hold('ArrowUp', 0, 3), ...hold('ArrowRight', 3, 4), ...hold('ArrowUp', 4, 7), ...hold('ArrowRight', 7, 8), ...hold('ArrowUp', 8, 11),
  ...hold('ArrowRight', 11, 12), ...hold('ArrowUp', 12, 15), ...hold('ArrowRight', 15, 16), ...hold('ArrowUp', 16, 20)];
export const streetTraversal = {
  id: 'street-traversal', title: 'Street traversal (Citadel square)', group: 'performance', suites: ['quick', 'full'], session: 'warm', timeoutS: 300,
  // set up through the game's API (a teleport to the start, as the benchmark does); the walk itself is real input
  method: { realInput: true, testApi: true, injectedState: true, preloadedAssets: false },
  async run(ctx) {
    const { page, rec } = ctx;
    if ((await gameState(page)).state !== 'play') await newGame(page);
    await page.evaluate((s) => { game.resetCombat?.('drop'); game.exitRoom(s, true, true); }, STREET_START);
    await sleep(3000);   // (the arrival is the transitions test's: here the street itself, after it settled)
    const s0 = await gameState(page);
    assert(rec, 'at the street start', s0.room === 'citadel' && dist(s0.pos, [STREET_START.x, 0, STREET_START.z]) < 1, 'citadel, within 1 m of the start', `${s0.room} ${s0.pos}`);
    const path = [s0.pos];
    let sampling = true;
    const sampler = (async () => { while (sampling) { await sleep(500); const s = await gameState(page).catch(() => null); if (s) path.push(s.pos); } })();
    const m = await measure(ctx, 'street walk 20 s', () => replay(page, LOOP, ctx.stopped));
    sampling = false; await sampler;
    const walked = path.slice(1).reduce((a, p, i) => a + dist(path[i], p), 0), s1 = await gameState(page);
    rec.path = path;
    assert(rec, 'Twinsen walked the loop', walked > 20, '> 20 m walked', `${walked.toFixed(1)} m`);
    assert(rec, 'still playing in the Citadel', s1.state === 'play' && s1.room === 'citadel', 'play, citadel', `${s1.state}, ${s1.room}`);
    assert(rec, 'frames recorded', m.stats && m.stats.frames > 300, '> 300 frames', m.stats?.frames ?? 0);
    const visibleMax = Math.max(0, ...rec.windows.at(-1).frames.filter((f) => !f.black && !f.tainted).map((f) => f.ms));
    assert(rec, 'no visible freeze over 1 s', visibleMax < 1000, '< 1000 ms', `${visibleMax.toFixed(0)} ms`);
    rec.scenario = writeScenario(ctx, { start: STREET_START, timeline: LOOP, note: 'teleport to the start (game.exitRoom, instant), settle 3 s, then the key timeline in real time' });
  },
};
