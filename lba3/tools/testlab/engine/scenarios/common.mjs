// Building blocks for the tests: start a game, replay a key timeline with real input, measure a window (raw frames
// kept, statistics from that same window), capture evidence when a frame crosses the stall threshold.
import path from 'node:path';
import fs from 'node:fs';
import { frameStats, sleep, writeJson } from '../util.mjs';
import { mark, windowData, gameState, gameSettings, counters, eventsSince, quiet } from '../probe.mjs';
import { startProfile, stopProfile } from '../trace.mjs';

export function assert(rec, name, ok, expected, observed) { rec.assertions.push({ name, ok: !!ok, expected: String(expected), observed: String(observed) }); return !!ok; }
export class Blocked extends Error { constructor(m) { super(m); this.blocked = true; } }

// New Game from the title, as a player does: a real click; the "start a new game?" prompt (a profile with a save) confirmed
export async function newGame(page, { timeoutMs = 300000 } = {}) {
  await page.click('[data-act="new"]', { timeout: 60000 });
  await sleep(800);
  if (await page.evaluate(() => game.screen === 'confirmnew')) await page.click('[data-act="newyes"]', { timeout: 30000 });
  await page.waitForFunction(() => game.state === 'play' && !game.cine && !game.trans && !game.preparing, null, { timeout: timeoutMs });
}

// Real input: key down/up at fixed times (seconds from the start), sent through the browser's input pipeline
// (Playwright → Chromium input events), so the game reads them exactly as a player's keys. Same timeline every run;
// the game's own randomness (Math.random is not seeded) and frame timing still vary between runs.
export async function replay(page, timeline, stopped = () => false) {
  const ev = timeline.slice().sort((a, b) => a[0] - b[0]), t0 = Date.now(), held = new Set();
  try {
    for (const [t, kind, key] of ev) {
      if (stopped()) break;
      const wait = t * 1000 - (Date.now() - t0); if (wait > 0) await sleep(wait);
      if (kind === 'down') { await page.keyboard.down(key); held.add(key); } else if (kind === 'up') { await page.keyboard.up(key); held.delete(key); } else if (kind === 'tap') await page.keyboard.press(key);
    }
  } finally { for (const k of held) await page.keyboard.up(k).catch(() => {}); }
  return (Date.now() - t0) / 1000;
}
export const hold = (key, from, to) => [[from, 'down', key], [to, 'up', key]];

// One measured window around `body`. Raw frames are kept in the window record; statistics come from the same frames
// (frames the tool disturbed by a screenshot are excluded and counted). Stalls over the threshold get evidence: the
// state at the stall, the counters, the long animation frames (scripts) around it, a screenshot right after.
export async function measure(ctx, label, body, { perf = true, maxShots = 3 } = {}) {
  const { page, rec, dir } = ctx;
  const before = { state: await gameState(page), settings: await gameSettings(page), counters: await counters(page) };
  const t0 = await mark(page, label + ' start');
  let polling = true, seen = t0, shots = 0;
  const evidence = [];
  const poll = (async () => {
    while (polling) {
      await sleep(400);
      if (!polling) break;
      const evs = await eventsSince(page, seen).catch(() => []);
      for (const e of evs) {
        seen = Math.max(seen, e.frame.t);
        const n = rec.evidence.length + evidence.length + 1, base = `${rec.id}-stall-${n}`;
        const item = { file: `evidence/${base}.json`, frame: e.frame, at: e.at, counters: e.counters };
        if (shots < maxShots) {
          shots++;
          await quiet(page, 1500);
          await page.screenshot({ path: path.join(dir, 'evidence', base + '.png') }).then(() => { item.screenshot = `evidence/${base}.png`; }).catch(() => {});
        }
        evidence.push(item);
      }
    }
  })();
  // reproduction runs: the CPU profiler over the window (its cost is why it never runs in a baseline)
  const prof = ctx.tracing ? await startProfile(page) : null;
  let result;
  try { result = await body(); } finally { polling = false; await poll; }
  const t1 = await mark(page, label + ' end');
  const data = await windowData(page, t0, t1);
  let profile = null;
  if (prof) {
    const base = `${rec.id}-${label.replace(/\W+/g, '-')}`;
    profile = await stopProfile(prof, path.join(dir, 'evidence', base + '.cpuprofile'), data.frames.filter((f) => f.ms > 50 && !f.tainted));
    profile.file = `evidence/${base}.cpuprofile`; rec.evidence.push(profile.file);
  }
  const clean = data.frames.filter((f) => !f.tainted);
  // the GPU samples resolved inside the window, as a per-window distribution (not matched frame by frame: they resolve later)
  const stats = frameStats(clean);
  if (stats) { const g = data.gpu.map((x) => x.ms).sort((a, b) => a - b); stats.gpuP50 = g.length ? g[Math.floor(g.length / 2)] : data.gpuAvailable ? 'no samples' : 'Unavailable'; stats.gpuP95 = g.length ? g[Math.min(g.length - 1, Math.floor(0.95 * g.length))] : stats.gpuP50; stats.tainted = data.frames.length - clean.length; }
  const after = { state: await gameState(page), counters: await counters(page) };
  for (const item of evidence) {
    item.loaf = data.loaf.filter((l) => Math.abs(l.t + l.ms - item.frame.t) < 200);
    writeJson(path.join(dir, item.file), item);
    rec.evidence.push(item.file); if (item.screenshot) rec.evidence.push(item.screenshot);
  }
  const s = before.settings;
  rec.windows.push({ label, perf, stats, before, after, frames: data.frames, gpu: data.gpu, loaf: data.loaf, memory: data.memory, stalls: evidence.map((e) => e.file),
    settings: `${s.auto ? 'Auto ' + (s.autoLabel || '') : s.quality} · pixel ratio ${s.pixelRatio} · scale ${s.effScale} · MSAA ${s.config?.msaa} · shadows ${s.config?.shadows} · lamps ${s.config?.lamps} · battery ${s.battery}`,
    gpuTimer: data.gpuAvailable ? 'yes' : 'Unavailable', longFrames: data.loafAvailable ? 'yes' : 'Unavailable', toolOverheadMs: data.overheadMs, profile, traced: !!prof });
  if (perf && stats && (stats.over50 || stats.fps < 50)) ctx.finding(`${rec.title}, ${label}: ${stats.fps} fps, ${stats.over50} frames over 50 ms`);
  return { result, stats, before, after, evidence };
}

export const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[2] - b[2]) : 0);
export function writeScenario(ctx, extra = {}) {
  // a reproduction scenario: what to launch and which test to run; Reproduce Issue runs it again with tracing on
  const sc = { test: ctx.rec.id, target: ctx.cfg.target, game: ctx.cfg.game, project: ctx.cfg.project, created: new Date().toISOString(), ...extra };
  const file = path.join(ctx.dir, 'scenarios', `${ctx.rec.id}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true }); writeJson(file, sc);
  return file;
}
