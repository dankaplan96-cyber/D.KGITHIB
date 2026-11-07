#!/usr/bin/env node
// LBA3 Blender bridge: runs the INSTALLED Blender (not `pip install bpy`) on project-owned scripts, from a job file.
//
//   node tools/blender-bridge/bridge.mjs discover                 which blender.exe, its version, how it was found
//   node tools/blender-bridge/bridge.mjs run <job.json> [...]     one or more jobs, in order (background Blender)
//   node tools/blender-bridge/bridge.mjs open <file.blend>        open a working .blend in Blender's GUI (detached)
//
// Options: --blender <exe> (overrides everything), --timeout <s>, --no-wait (fail if another job holds the lock).
// No shell is used anywhere (spawn with an argument array), no network port is opened, and only processes this
// bridge started are ever terminated (by PID, with their children). Heavy jobs run one at a time (a lock file).
// The job schema: tools/blender-bridge/job.schema.json; the guide: tools/blender-bridge/README.md.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GAME_ROOT = path.resolve(HERE, '..', '..');                 // lba3/ (the game folder)
export const WORK = path.join(HERE, '.work');                           // temp files and logs (git-ignored)
const SCRIPTS = path.join(HERE, 'blender');                             // Blender-side Python (project-owned)
// Where a job may write. Originals (assets/, src/, art/characters/...) are never output roots.
export const OUTPUT_ROOTS = ['art/blender', 'tools/blender-bridge/.work'].map((p) => path.join(GAME_ROOT, p));
export const OPS = ['import', 'inspect', 'preview', 'validate', 'export', 'script'];

// ------------------------------------------------------------------ discovery
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function versionOf(exe) {
  const r = spawnSync(exe, ['--factory-startup', '--version'], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const m = /Blender\s+(\d+\.\d+(?:\.\d+)?)[^\r\n]*/.exec(r.stdout || '');
  return m ? { version: m[1], line: m[0].trim() } : null;
}
function standardCandidates() {
  const out = [];
  if (process.platform === 'win32') {
    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.ProgramW6432].filter(Boolean);
    for (const r of new Set(roots)) {
      const bf = path.join(r, 'Blender Foundation');
      if (fs.existsSync(bf)) for (const d of fs.readdirSync(bf)) out.push(path.join(bf, d, 'blender.exe'));
      out.push(path.join(r, 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe'));
    }
    if (process.env.LOCALAPPDATA) out.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Blender Foundation', 'Blender', 'blender.exe'));
  } else if (process.platform === 'darwin') out.push('/Applications/Blender.app/Contents/MacOS/Blender');
  else out.push('/usr/bin/blender', '/usr/local/bin/blender', '/snap/bin/blender');
  // newest version folder first ("Blender 5.2" before "Blender 4.2")
  return out.filter((p) => fs.existsSync(p)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}
function onPath() {
  const r = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['blender'], { encoding: 'utf8', windowsHide: true });
  return (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && fs.existsSync(s));
}
export function discover(explicit = null) {
  const local = readJSON(path.join(HERE, 'config.local.json')) || {};
  const tried = [];
  const pick = (exe, how) => { if (!exe) return null; tried.push(`${how}: ${exe}`); if (!fs.existsSync(exe)) return null; const v = versionOf(exe); return v ? { exe, how, ...v } : null; };
  return pick(explicit, '--blender')
    || pick(process.env.LBA3_BLENDER, 'LBA3_BLENDER')
    || pick(local.blender, 'config.local.json')
    || standardCandidates().map((e) => pick(e, 'standard location')).find(Boolean)
    || onPath().map((e) => pick(e, 'PATH')).find(Boolean)
    || { exe: null, tried, error: 'Blender not found: set "blender" in tools/blender-bridge/config.local.json, or LBA3_BLENDER, or pass --blender <exe>' };
}

// ------------------------------------------------------------------ paths
const inside = (p, root) => { const r = path.relative(root, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
export function resolveIn(p) { return path.isAbsolute(p) ? path.normalize(p) : path.resolve(GAME_ROOT, p); }
function checkInput(p, what) {
  const a = resolveIn(p);
  if (!inside(a, GAME_ROOT) && !inside(a, path.resolve(GAME_ROOT, '..'))) throw new Error(`${what} is outside the project: ${a}`);
  if (!fs.existsSync(a)) throw new Error(`${what} does not exist: ${a}`);
  return a;
}
function checkOutput(p, what, inputs) {
  const a = resolveIn(p);
  if (!OUTPUT_ROOTS.some((r) => inside(a, r))) throw new Error(`${what} must be under ${OUTPUT_ROOTS.map((r) => path.relative(GAME_ROOT, r)).join(' or ')}: ${a}`);
  if (inputs.some((i) => path.resolve(i) === a)) throw new Error(`${what} would overwrite an input: ${a}`);
  return a;
}

// ------------------------------------------------------------------ job validation (job.schema.json, kept in step by hand)
export function validateJob(job, file = '<job>') {
  const e = (m) => { throw new Error(`${file}: ${m}`); };
  if (!job || typeof job !== 'object') e('not an object');
  if (!OPS.includes(job.op)) e(`op must be one of ${OPS.join(', ')}`);
  const known = ['$schema', 'op', 'name', 'input', 'output', 'blend', 'options', 'timeout', 'script', 'args'];
  for (const k of Object.keys(job)) if (!known.includes(k)) e(`unknown field "${k}"`);
  const inputs = [];
  if (job.op === 'script') {
    if (!job.script) e('script: "script" (a .py under tools/blender) is required');
    const s = checkInput(job.script, 'script');
    if (!inside(s, path.join(GAME_ROOT, 'tools'))) e('script must be a project-owned script under tools/');
    inputs.push(s);
    if (job.args && !Array.isArray(job.args)) e('args must be an array of strings');
  } else if (!job.input) e('"input" is required');
  const out = { ...job, options: job.options || {} };
  if (job.op === 'script') out.script = inputs[0];   // (absolute: Blender runs in the job's own folder)
  if (job.input) { out.input = checkInput(job.input, 'input'); inputs.push(out.input); }
  if (job.op === 'import' && !job.blend) e('import needs "blend" (the working .blend to write)');
  if (['preview', 'export', 'inspect', 'validate'].includes(job.op) && !job.output) e(`${job.op} needs "output"`);
  if (job.output) out.output = checkOutput(job.output, 'output', inputs);
  if (job.blend) out.blend = checkOutput(job.blend, 'blend', inputs);
  if (job.op === 'export') {
    const f = out.options.format || 'polyprop';
    if (!['polyprop', 'glb'].includes(f)) e('export options.format must be "polyprop" or "glb"');
  }
  if (job.timeout != null && !(job.timeout > 0)) e('timeout must be a positive number of seconds');
  return out;
}

// ------------------------------------------------------------------ one heavy job at a time
const LOCK = path.join(WORK, 'blender.lock');
function alive(pid) { try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; } }
async function acquire(wait = true) {
  fs.mkdirSync(WORK, { recursive: true });
  for (let t = 0; ; t++) {
    try { fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { flag: 'wx' }); return; }
    catch (err) {
      if (err.code !== 'EEXIST') throw err;
      const held = readJSON(LOCK);
      if (!held || !alive(held.pid)) { try { fs.unlinkSync(LOCK); } catch { /* raced */ } continue; }
      if (!wait) throw new Error(`another Blender job is running (pid ${held.pid}, since ${held.at})`);
      if (t % 20 === 0) console.log(`(waiting for the Blender job of pid ${held.pid})`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
function release() { try { const h = readJSON(LOCK); if (h?.pid === process.pid) fs.unlinkSync(LOCK); } catch { /* gone */ } }

// kill only the process we started, with its children (Blender may spawn helpers)
function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
}

// ------------------------------------------------------------------ run
export async function runJob(jobIn, { blender, timeout, wait = true, file = '<job>' } = {}) {
  const job = validateJob(jobIn, file);
  if (!blender?.exe) throw new Error(blender?.error || 'no Blender');
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${job.op}-${process.pid}`;
  const dir = path.join(WORK, 'jobs', id);
  fs.mkdirSync(dir, { recursive: true });
  const resultPath = path.join(dir, 'result.json');
  const spec = { ...job, gameRoot: GAME_ROOT, result: resultPath, scripts: SCRIPTS, blenderVersion: blender.version };
  const specPath = path.join(dir, 'job.json');
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
  const logPath = path.join(dir, 'blender.log');
  const secs = timeout ?? job.timeout ?? 600;
  // the job file (UTF-8 JSON) carries every path, so nothing non-ASCII has to pass through Blender's own argv
  // (a .blend input is opened inside run_job.py with bpy.ops.wm.open_mainfile, from that UTF-8 path, not from argv)
  const argv = ['--background', '--factory-startup', '--python-exit-code', '3', '--python', path.join(SCRIPTS, 'run_job.py'), '--', specPath];
  await acquire(wait);
  const t0 = Date.now();
  try {
    const code = await new Promise((resolve, reject) => {
      const log = fs.createWriteStream(logPath);
      const child = spawn(blender.exe, argv, { cwd: dir, shell: false, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; log.write(`\n[bridge] timeout after ${secs}s: terminating pid ${child.pid}\n`); killTree(child); }, secs * 1000);
      child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
      child.on('error', (err) => { clearTimeout(timer); log.end(); reject(err); });
      child.on('close', (c, sig) => { clearTimeout(timer); log.end(() => resolve(timedOut ? 'timeout' : (c ?? sig))); });
    });
    const result = readJSON(resultPath);
    const logText = fs.readFileSync(logPath, 'utf8');
    const errLines = logText.split(/\r?\n/).filter((l) => /Error|Traceback|BRIDGE-FAIL/.test(l)).slice(-12);
    const ok = code === 0 && result?.ok === true;
    return { ok, op: job.op, name: job.name || null, exitCode: code, seconds: +((Date.now() - t0) / 1000).toFixed(1), log: logPath, result, errors: ok ? [] : (result?.errors?.length ? result.errors : errLines.length ? errLines : [`exit code ${code}`]) };
  } finally { release(); }
}

export function openGui(blend, blender) {
  const a = checkInput(blend, 'blend');
  if (!a.endsWith('.blend')) throw new Error('open needs a .blend file');
  if (!blender?.exe) throw new Error(blender?.error || 'no Blender');
  // the GUI belongs to the user: detached, never timed out or killed by the bridge
  const child = spawn(blender.exe, [a], { shell: false, detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { ok: true, pid: child.pid, blend: a };
}

// ------------------------------------------------------------------ CLI
async function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(n); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const flag = (n) => { const i = argv.indexOf(n); if (i < 0) return false; argv.splice(i, 1); return true; };
  const explicit = opt('--blender'), timeout = opt('--timeout'), noWait = flag('--no-wait'), json = flag('--json');
  const [cmd, ...rest] = argv;
  const blender = discover(explicit);
  if (cmd === 'discover') { console.log(JSON.stringify({ ...blender, platform: `${os.platform()} ${os.release()}`, gameRoot: GAME_ROOT }, null, 2)); process.exit(blender.exe ? 0 : 2); }
  if (cmd === 'open') { console.log(JSON.stringify(openGui(rest[0], blender), null, 2)); return; }
  if (cmd === 'run') {
    if (!rest.length) throw new Error('run <job.json> [more jobs...]');
    let failed = 0;
    for (const f of rest) {
      const file = resolveIn(f), jobs = [].concat(readJSON(file) ?? (() => { throw new Error(`cannot read ${file}`); })());
      for (const j of jobs) {
        const r = await runJob(j, { blender, timeout: timeout ? +timeout : undefined, wait: !noWait, file: path.relative(GAME_ROOT, file) });
        if (json) console.log(JSON.stringify(r, null, 2));
        else console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.op}${r.name ? ' ' + r.name : ''} (${r.seconds}s, exit ${r.exitCode})${r.result?.summary ? ' - ' + r.result.summary : ''}${r.ok ? '' : '\n     ' + r.errors.join('\n     ') + '\n     log: ' + r.log}`);
        if (!r.ok) { failed++; break; }
      }
    }
    process.exit(failed ? 1 : 0);
  }
  console.log('usage: bridge.mjs discover | run <job.json>... [--timeout s] [--no-wait] [--json] | open <file.blend>   [--blender exe]');
  process.exit(cmd ? 2 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((err) => { console.error('bridge:', err.message); process.exit(1); });
