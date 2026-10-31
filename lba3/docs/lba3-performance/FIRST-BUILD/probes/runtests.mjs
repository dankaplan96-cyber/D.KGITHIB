// FIRST-BUILD: the regression suites one after another against GAME_URL, each one's output in OUT/<name>.txt and its
// VERDICT line printed (TEST_TIMEOUT: seconds a suite may take, default 5400).   GAME_URL=http://localhost:8572/ OUT=/dev/shm/fb/t node runtests.mjs house opening …
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const out = process.env.OUT || '/dev/shm/fb/t';
fs.mkdirSync(out, { recursive: true });
for (const name of process.argv.slice(2)) {
  const t0 = Date.now();
  const r = spawnSync('node', [`tests/${name}.mjs`], { cwd: root, env: { ...process.env, TMPDIR: process.env.TMPDIR || '/dev/shm' }, encoding: 'utf8', timeout: +(process.env.TEST_TIMEOUT || 5400) * 1000, maxBuffer: 64 << 20 });
  const text = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(`${out}/${name}.txt`, text);
  const v = text.split('\n').filter((l) => l.startsWith('VERDICT')).pop() || `no verdict (exit ${r.status}${r.error ? ', ' + r.error.message : ''})`;
  console.log(`${name}: ${v} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
