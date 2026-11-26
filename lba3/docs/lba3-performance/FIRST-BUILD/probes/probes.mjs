// FIRST-BUILD: several probe runs one after another (each a fresh browser through run.mjs), every run's output in a file.
// argv: OUTPUT_FILE:probe.js[:W_X=v,W_Y=w,ENV=v] …   e.g.
//   GAME_URL=http://localhost:8573/ node probes.mjs /dev/shm/ng.txt:q_newgame.js:W_SEED=7,W_SHOT=1 /dev/shm/rg.txt:q_regions.js
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
for (const spec of process.argv.slice(2)) {
  const [outFile, probe, vars = ''] = spec.split(':');
  const env = { ...process.env, TMPDIR: process.env.TMPDIR || '/dev/shm' };
  for (const kv of vars.split(',').filter(Boolean)) { const i = kv.indexOf('='); env[kv.slice(0, i)] = kv.slice(i + 1); }
  const t0 = Date.now();
  const r = spawnSync('node', [path.join(dir, 'run.mjs'), path.join(dir, probe)], { cwd: dir, env, encoding: 'utf8', timeout: 3000e3, maxBuffer: 64 << 20 });
  fs.writeFileSync(outFile, (r.stdout || '') + (r.stderr || ''));
  console.log(`${probe} → ${outFile} (exit ${r.status}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
