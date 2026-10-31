// Runs a suite: one game session per group of tests that can share it, a timeout per test, Stop at any moment, a
// failure or timeout recorded and the next independent test run. Progress goes out as one JSON line per event on
// stdout (the window shows the current test, progress, elapsed time and the latest finding; nothing else).
import fs from 'node:fs';
import path from 'node:path';
import { launch, LaunchError, display, cleanupStale } from './launch.mjs';
import { TOOL_VERSION, stamp, powerSource, hardware, gitCommit, sleep } from './util.mjs';
import { installProbe } from './probe.mjs';
import { analyse } from './findings.mjs';
import { writeReports } from './report.mjs';
import { SCENARIOS } from './scenarios/index.mjs';
import { writeScenario } from './scenarios/common.mjs';

export const emit = (type, data = {}) => process.stdout.write(JSON.stringify({ type, t: Date.now(), ...data }) + '\n');
let stopRequested = false, current = null;
export function requestStop() { stopRequested = true; emit('status', { text: 'Stopping…' }); current?.close?.().catch(() => {}); }

// cfg: { suite, target, game, project, runsDir, only: [ids], repro: scenario object, appArgs, timeouts }
export async function runSuite(cfg) {
  const runId = `${stamp()}-${cfg.suite}`, dir = path.join(cfg.runsDir, runId);
  fs.mkdirSync(path.join(dir, 'evidence'), { recursive: true });
  const power0 = powerSource();
  const manifest = {
    runId, suite: cfg.suite, toolVersion: TOOL_VERSION, started: new Date().toISOString(), power: power0, hardware: hardware(),
    game: { target: cfg.target, path: cfg.target === 'packaged' ? cfg.game : cfg.project, version: '?', commit: cfg.target === 'dev' ? gitCommit(cfg.project) : 'n/a (packaged build)', specialBuild: 'no: the unmodified game' },
    conditions: [], stopped: false,
  };
  const run = { dir, manifest, tests: [], findings: [] };
  // processes a killed run left behind (they hold the test profile): closed before starting
  const stale = cleanupStale(path.join(cfg.runsDir, '_profiles'));
  if (stale) manifest.conditions.push(`closed ${stale} process(es) left by an interrupted run`);
  const plan = cfg.scenarios ? cfg.scenarios : SCENARIOS.filter((s) => (cfg.only ? cfg.only.includes(s.id) : s.suites.includes(cfg.suite)));
  emit('start', { runId, dir, total: plan.length });
  const t0 = Date.now();
  // tests that need the same kind of session share one launch: a fresh profile for the cold ones, the warm profile otherwise
  let H = null, sessionKey = null;
  const profileRoot = path.join(cfg.runsDir, '_profiles');
  for (let i = 0; i < plan.length; i++) {
    const S = plan[i];
    const rec = { id: S.id, title: S.title, group: S.group, status: 'not_tested', method: { ...S.method }, assertions: [], windows: [], evidence: [], errors: [], note: '' };
    run.tests.push(rec);
    if (stopRequested) { rec.note = 'not run: the run was stopped'; continue; }
    if (S.target && S.target !== cfg.target) { rec.note = `needs the ${S.target} build`; continue; }
    emit('test', { index: i + 1, total: plan.length, id: S.id, title: S.title, elapsedMs: Date.now() - t0 });
    const started = Date.now();
    try {
      const key = S.session || 'warm';
      if (!H || H.closed || key !== sessionKey || S.session === 'fresh') {
        if (H) await H.close();
        H = null; sessionKey = key;
        const profileDir = path.join(profileRoot, `${cfg.target}-${key === 'fresh' ? 'fresh' : 'warm'}`);
        H = await launch({ target: cfg.target, game: cfg.game, project: cfg.project, profileDir, fresh: key === 'fresh', query: S.query ?? '?nocine', appArgs: cfg.appArgs || [],
          onEvent: (e) => e.kind !== 'error' && emit('event', e) });
        current = H;
        if (manifest.game.version === '?') { manifest.game.version = H.version; manifest.game.display = await display(H); manifest.game.debug = H.debug; }
        H.launchInfo = { coldProfile: H.coldProfile, ...H.timing };
        await installProbe(H.page);
      }
      const ctx = { H, page: H.page, rec, dir, cfg, emit, tracing: !!cfg.repro, finding: (text) => emit('finding', { text }), stopped: () => stopRequested };
      if (cfg.repro) rec.reproduces = cfg.repro.created ? `scenario from ${cfg.repro.created}` : 'scenario';
      try { await withTimeout(S.run(ctx), (S.timeoutS ?? 300) * 1000, `timed out after ${S.timeoutS ?? 300} s`); }
      finally { if (H?.replaced) { H = H.replaced; current = H; } }   // (a test that restarted the game hands over its new session)
      if (H?.crashed) throw new Error('the game crashed during the test');
      if (rec.status === 'not_tested') rec.status = rec.assertions.length && rec.assertions.every((a) => a.ok) ? 'passed' : rec.assertions.some((a) => !a.ok) ? 'failed' : 'passed';
    } catch (e) {
      const blocked = e instanceof LaunchError || e.blocked;
      rec.status = stopRequested ? 'not_tested' : blocked ? 'blocked' : 'failed';
      rec.note = stopRequested ? 'stopped by the user' : e.message.split('\n')[0];
      if (!stopRequested) emit('finding', { text: `${S.title}: ${rec.note}` });
      if (H && !stopRequested && !H.closed) await H.page.screenshot({ path: path.join(dir, 'evidence', `${S.id}-failure.jpg`), type: 'jpeg', quality: 75 }).then(() => rec.evidence.push(`evidence/${S.id}-failure.jpg`)).catch(() => {});
      // a timeout or a crash leaves the session unusable: the next test starts a new one
      if (H) { await H.close().catch(() => {}); H = null; }
    }
    if (H) rec.errors.push(...H.errors.splice(0));
    // every test can be run again on its own: Reproduce Issue loads this file (a test may have written a richer one)
    if (!rec.scenario) rec.scenario = writeScenario({ rec, dir, cfg }, { note: 'run this test again on its own; detailed tracing on' });
    rec.durationMs = Date.now() - started;
    emit('done', { id: S.id, status: rec.status, note: rec.note });
  }
  if (H) await H.close().catch(() => {});
  current = null;
  const power1 = powerSource();
  manifest.finished = new Date().toISOString(); manifest.stopped = stopRequested; manifest.powerEnd = power1;
  manifest.conditions.push(`power ${power0.source} → ${power1.source}`);
  if (power0.source !== power1.source) manifest.conditions.push('UNSTABLE: the power source changed during the run');
  run.findings = analyse(run);
  const report = writeReports(run);
  emit('end', { report, dir, findings: run.findings.length, elapsedMs: Date.now() - t0, stopped: stopRequested });
  return run;
}

function withTimeout(p, ms, msg) {
  let to; return Promise.race([p, new Promise((_, rej) => { to = setTimeout(() => rej(new Error(msg)), ms); })]).finally(() => clearTimeout(to));
}
