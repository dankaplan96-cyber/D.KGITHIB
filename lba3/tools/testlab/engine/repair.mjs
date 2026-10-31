// Fix and Retest — the bounded repair loop, through Claude Code's own command line (`claude -p`, its supported
// non-interactive mode); nothing types into a chat window and no credentials are stored here. Only when `claude` is
// installed; otherwise the window exports the task file and the exact command instead.
//   1. a git worktree on a new branch (testlab/repair-…) from the current commit: the user's checkout and its
//      uncommitted work are never touched; nothing is pushed
//   2. the clean baseline: the finding's test on the development build of that worktree
//   3. up to 3 attempts: one focused fix by Claude Code → the finding's test → kept (committed on the branch) only
//      when the measurement improves and the test's assertions still pass; otherwise reverted, with the result fed
//      into the next attempt
//   4. repair.json: every attempt, its numbers, and the branch to review (or the blocker)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { runSuite, emit } from './runner.mjs';
import { readJson, writeJson, stamp } from './util.mjs';

const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' }).trim();
const score = (t) => { const w = (t.windows || []).find((x) => x.stats); return { pass: t.assertions.every((a) => a.ok), over50: w?.stats?.over50 ?? null, fps: w?.stats?.fps ?? null, p99: w?.stats?.p99 ?? null }; };
const better = (a, b) => b.pass && (b.over50 != null && a.over50 != null ? b.over50 < a.over50 || (b.over50 === a.over50 && b.fps > a.fps * 1.03) : !a.pass);

export async function repair({ runDir, project, runsDir, attempts = 3 }) {
  const run = readJson(path.join(runDir, 'results.json'));
  const f = run?.findings?.find((x) => x.confidence !== 'unexplained');
  if (!f) throw new Error('no confirmed or likely finding to repair in this run');
  const repo = git(project, 'rev-parse', '--show-toplevel'), rel = path.relative(repo, project);
  const id = `${stamp()}-${f.id}`, wt = path.join(runsDir, 'repair', id), branch = `testlab/repair-${id}`;
  git(repo, 'worktree', 'add', '-b', branch, wt, 'HEAD');
  const dev = { target: 'dev', project: path.join(wt, rel), runsDir: path.join(runsDir, 'repair', id + '-runs') };
  const test = async (label) => { emit('status', { text: `Fix and Retest: ${label}` }); const r = await runSuite({ ...dev, suite: `repair-${label}`, only: [f.test] }); return { run: r.dir, ...score(r.tests[0]) }; };
  const log = { finding: f, branch, worktree: wt, baseline: await test('baseline'), attempts: [] };
  let best = log.baseline, feedback = '';
  for (let k = 1; k <= attempts; k++) {
    const prompt = `You are fixing one measured problem in the LBA3 game in this repository (game folder: ${rel}).\n${fs.readFileSync(path.join(runDir, 'claude-tasks.md'), 'utf8').split('\n## ').find((s) => s.startsWith(f.id)) || f.title}\n` +
      `Rules: one focused fix; do not rewrite the engine, upgrade dependencies, delete content, lower resolution globally, remove scenery or disable shadows; keep character design, lighting identity and combat responsiveness. Do not commit.${feedback ? '\nThe previous attempt was measured: ' + feedback : ''}`;
    const c = spawnSync('claude', ['-p', prompt, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Grep,Glob', '--max-turns', '40'], { cwd: wt, encoding: 'utf8', timeout: 30 * 60000, shell: true });
    const changed = git(wt, 'status', '--porcelain');
    if (c.status !== 0 || !changed) { log.attempts.push({ k, result: c.status !== 0 ? `claude exited ${c.status}: ${(c.stderr || '').slice(-300)}` : 'no change made' }); feedback = 'no change was made'; continue; }
    const m = await test(`attempt-${k}`);
    const keep = better(best, m);
    log.attempts.push({ k, measured: m, kept: keep, diff: git(wt, 'diff', '--stat') });
    if (keep) { git(wt, 'add', '-A'); git(wt, 'commit', '-m', `Test Lab repair ${f.id} attempt ${k}: ${f.title.slice(0, 60)}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`); best = m; break; }
    git(wt, 'checkout', '--', '.'); git(wt, 'clean', '-fd');
    feedback = `assertions ${m.pass ? 'passed' : 'FAILED'}, frames over 50 ms ${m.over50} (before ${best.over50}), fps ${m.fps} (before ${best.fps}). Not kept.`;
  }
  log.result = best === log.baseline ? `unresolved after ${attempts} attempts: see the attempts; the branch ${branch} has no change` : `improved: review branch ${branch} (not pushed); the measurement on this laptop is in repair.json`;
  writeJson(path.join(runsDir, 'repair', id + '.json'), log);
  emit('end', { report: path.join(runsDir, 'repair', id + '.json'), dir: wt, findings: 1, verdict: log.result });
  return log;
}
