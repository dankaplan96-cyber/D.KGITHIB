// The tool tests itself: each case provokes one failure and checks that it is recorded, the run goes on where it can,
// and nothing is left running. Results: runs/<id>-selftest/selftest.json and a line per case.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSuite, emit } from './runner.mjs';
import { cleanupStale } from './launch.mjs';
import { stamp, sleep, writeJson } from './util.mjs';
import { measure, Blocked } from './scenarios/common.mjs';
import { newGame } from './scenarios/common.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.mjs');
const T = (id, o) => ({ id, title: id, group: 'selftest', suites: [], session: 'warm', method: {}, timeoutS: 120, ...o });

export async function selftest({ runsDir, game, project }) {
  const dir = path.join(runsDir, `${stamp()}-selftest`), results = [];
  fs.mkdirSync(dir, { recursive: true });
  const target = game ? 'packaged' : 'dev', base = { runsDir: path.join(dir, 'runs'), game, project, target };
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); emit('finding', { text: `${ok ? 'OK  ' : 'FAIL'} ${name}: ${detail}` }); };

  // 1. launch failure: a game path that does not exist → Blocked, with the reason
  let r = await runSuite({ ...base, target: 'packaged', game: 'C:/no/such/game.exe', suite: 'selftest-launch', scenarios: [T('needs-a-game', { run: async () => {} })] });
  check('launch failure is recorded as Blocked', r.tests[0].status === 'blocked' && /not found/.test(r.tests[0].note), `${r.tests[0].status}: ${r.tests[0].note}`);

  // 2. timeout, 3. game crash, 4. missing save, 5. unsupported GPU timer — one run; each later test must still run
  r = await runSuite({ ...base, suite: 'selftest-failures', scenarios: [
    T('times-out', { timeoutS: 5, run: () => sleep(30000) }),
    T('crashes', { run: async (ctx) => { if (ctx.H.app) execFileSync('taskkill', ['/PID', String(ctx.H.app.process().pid), '/T', '/F']); else await ctx.H.context.close(); await sleep(3000); await ctx.page.evaluate(() => game.state); } }),   // (the next call to the dead game must fail the test)
    T('missing-save', { session: 'fresh', run: async (ctx) => { const has = await ctx.page.evaluate(() => !!localStorage.getItem('lba3_save_v1')); if (!has) throw new Blocked('no save in the test profile: this test needs one'); } }),
    T('no-gpu-timer', { run: async (ctx) => {
      await newGame(ctx.page);
      await ctx.page.evaluate(() => { const t = window.__tl; t.gpuAvailable = false; t.gpu.length = 0; if (game.perf.gpuTimer?.ms) game.perf.gpuTimer.ms.push = Array.prototype.push; });
      const m = await measure(ctx, 'without GPU timer', () => sleep(3000));
      ctx.rec.assertions.push({ name: 'GPU time reported as Unavailable', ok: m.stats?.gpuP50 === 'Unavailable', expected: 'Unavailable', observed: String(m.stats?.gpuP50) });
    } }),
  ] });
  const st = Object.fromEntries(r.tests.map((t) => [t.id, t]));
  check('a timeout fails the test and the run goes on', st['times-out'].status === 'failed' && /timed out/.test(st['times-out'].note), `${st['times-out'].status}: ${st['times-out'].note}`);
  check('a crash fails the test and the next test gets a new game', st.crashes.status === 'failed' && st['missing-save'].status !== 'not_tested', `${st.crashes.status}: ${st.crashes.note}; next: ${st['missing-save'].status}`);
  check('a missing save is Blocked with the reason', st['missing-save'].status === 'blocked' && /no save/.test(st['missing-save'].note), `${st['missing-save'].status}: ${st['missing-save'].note}`);
  check('no GPU timer → "Unavailable", not a number', st['no-gpu-timer'].status === 'passed', st['no-gpu-timer'].assertions.map((a) => `${a.name}: ${a.observed}`).join('; ') || st['no-gpu-timer'].note);
  check('the report is written after failures', fs.existsSync(path.join(r.dir, 'report.html')), r.dir);

  // 6. Stop pressed: the quick suite in a child process, "stop" on its stdin after 40 s
  const stopRun = await child(['quick', ...(game ? ['--game', game] : ['--project', project]), '--runs', path.join(dir, 'runs')], 40000, 'stop');
  check('Stop ends the run within 60 s', stopRun.exitedS != null && stopRun.exitedS - 40 < 60, `exited ${stopRun.exitedS?.toFixed(0)} s after start`);
  check('Stop writes a partial report marked stopped', stopRun.end?.stopped === true && fs.existsSync(stopRun.end.report), JSON.stringify(stopRun.end || {}));
  check('nothing left running after Stop', cleanupStale(path.join(dir, 'runs', '_profiles')) === 0, 'no test-profile process found');

  // 7. cleanup after an interruption: the run killed hard (no chance to close the game); the next run closes the leftover
  const killRun = await child(['quick', ...(game ? ['--game', game] : ['--project', project]), '--runs', path.join(dir, 'runs')], 30000, 'kill');
  await sleep(2000);
  const left = cleanupStale(path.join(dir, 'runs', '_profiles'));
  check('after a hard kill nothing is left running', cleanupStale(path.join(dir, 'runs', '_profiles')) === 0, `${left} leftover process(es) found and closed by the cleanup (0: the game exited with the tool); none after`);

  writeJson(path.join(dir, 'selftest.json'), { results, passed: results.filter((x) => x.ok).length, of: results.length });
  emit('end', { report: path.join(dir, 'selftest.json'), dir, findings: results.filter((x) => !x.ok).length });
  return results;
}

// the CLI as the window runs it; after `afterMs` either "stop" on stdin or a hard kill of the whole process tree
function child(args, afterMs, how) {
  return new Promise((resolve) => {
    const t0 = Date.now(), p = spawn(process.execPath, [CLI, ...args], { stdio: ['pipe', 'pipe', 'inherit'] });
    let end = null, buf = '';
    p.stdout.on('data', (d) => { buf += d; for (const line of buf.split('\n').slice(0, -1)) { try { const e = JSON.parse(line); if (e.type === 'end') end = e; } catch {} } buf = buf.split('\n').at(-1); });
    // a hard kill of the tool only: the game it started is orphaned, as after a crash of the tool
    setTimeout(() => { if (how === 'stop') p.stdin.write('stop\n'); else spawn('taskkill', ['/PID', String(p.pid), '/F']); }, afterMs);
    p.on('exit', () => resolve({ exitedS: (Date.now() - t0) / 1000, end }));
  });
}
