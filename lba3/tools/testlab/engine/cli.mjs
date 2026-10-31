// Command line (the window runs this same file as a child process):
//   node engine/cli.mjs quick|full|visual   [--game <exe> | --project <game folder>] [--runs <dir>]
//   node engine/cli.mjs reproduce <scenario.json>
//   node engine/cli.mjs compare --game <baseline exe> --candidate <exe> [--test street] [--repeats 3]
//   node engine/cli.mjs selftest      (the tool's own failure handling)
// Without --game/--project the paths remembered by the window are used (config.json in the runs folder).
// "stop" on stdin (or Ctrl+C) stops safely: the game is closed and the partial report written.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runSuite, requestStop, emit } from './runner.mjs';
import { readJson } from './util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), cmd = argv[0];
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const runsDir = path.resolve(opt('runs', process.env.LBA3_TESTLAB_RUNS || path.join(HERE, '..', 'runs')));
const saved = readJson(path.join(runsDir, 'config.json'), {});
const game = opt('game', saved.game), project = opt('project', saved.project);
const target = opt('target', argv.includes('--project') ? 'dev' : game ? 'packaged' : 'dev');

process.stdin.on("data", (d) => { if (/stop/.test(String(d))) requestStop(); });
process.on('SIGINT', requestStop);
// a stray rejection from a test (a page that closed under a pending wait) is reported, never a crash of the whole run
process.on('unhandledRejection', (e) => emit('finding', { text: 'tool: unhandled ' + String(e?.message || e).split(/\r?\n/)[0] }));
process.on('SIGTERM', requestStop);

const only = opt('only'); const base = { runsDir, game, project, target, ...(only ? { only: only.split(',') } : {}) };
try {
  if (cmd === 'quick' || cmd === 'full' || cmd === 'visual') await runSuite({ ...base, suite: cmd });
  else if (cmd === 'reproduce') {
    const file = argv[1];
    if (!file || !fs.existsSync(file)) throw new Error(`no reproduction scenario at ${file || '(none given)'}`);
    const sc = readJson(file);
    await runSuite({ ...base, target: sc.target || target, game: sc.game || game, project: sc.project || project, suite: 'reproduce', only: [sc.test], repro: sc });
  } else if (cmd === 'compare') {
    const { compareBuilds } = await import('./compare.mjs');
    await compareBuilds({ runsDir, baseline: { target, game, project }, candidate: { target: opt('candidate-target', 'packaged'), game: opt('candidate'), project: opt('candidate-project') }, test: opt('test', 'street-traversal'), repeats: +opt('repeats', 3) });
  } else if (cmd === 'repair') {
    const { repair } = await import('./repair.mjs');
    await repair({ runDir: argv[1], project, runsDir });
  } else if (cmd === 'selftest') {
    const { selftest } = await import('./selftest.mjs');
    await selftest({ runsDir, game, project });
  } else {
    console.log('usage: node engine/cli.mjs quick|full|reproduce <scenario.json>|compare --candidate <exe>|selftest');
    process.exitCode = 2;
  }
} catch (e) {
  emit('fatal', { text: e.message });
  process.exitCode = 1;
}
process.exit();
