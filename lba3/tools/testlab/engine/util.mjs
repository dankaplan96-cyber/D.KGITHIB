// Small shared helpers: statistics from raw frame records, the machine's power source and hardware (only what Windows
// reports; anything else is "Unavailable"), time and files.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TOOL_VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
export const UNAVAILABLE = 'Unavailable';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

export function writeJson(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }
export function readJson(file, fallback = null) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }

// percentile on a sorted copy (nearest rank)
export function pct(values, p) {
  if (!values.length) return null;
  const v = values.slice().sort((a, b) => a - b);
  return +v[Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1))].toFixed(2);
}

// Frame statistics from one consistent window of raw frame records ({ t, ms, ... }). FPS is frames / the window's
// own elapsed time (the sum of the frame intervals), so it always agrees with the frame-time distribution.
export function frameStats(frames, refreshMs = 1000 / 60) {
  if (!frames.length) return null;
  const ms = frames.map((f) => f.ms), total = ms.reduce((a, b) => a + b, 0);
  const over = (x) => frames.filter((f) => f.ms > x);
  const work = frames.filter((f) => f.sim != null).map((f) => (f.sim || 0) + (f.render || 0));
  const gpu = frames.filter((f) => f.gpu != null).map((f) => f.gpu);
  return {
    frames: frames.length, seconds: +(total / 1000).toFixed(2), fps: +((1000 * frames.length) / total).toFixed(1),
    p50: pct(ms, 0.5), p95: pct(ms, 0.95), p99: pct(ms, 0.99), max: +Math.max(...ms).toFixed(1),
    // a refresh is missed when an interval is longer than 1.5 refreshes (the next vsync came and went)
    missedRefreshes: frames.reduce((n, f) => n + Math.max(0, Math.round(f.ms / refreshMs) - 1), 0),
    over33: over(33.4).length, over50: over(50).length, over100: over(100).length,
    stallsVisible: over(50).filter((f) => !f.black).length, stallsBehindLoading: over(50).filter((f) => f.black).length,
    cpuWorkP50: work.length ? pct(work, 0.5) : UNAVAILABLE, cpuWorkP95: work.length ? pct(work, 0.95) : UNAVAILABLE,
    simP50: work.length ? pct(frames.map((f) => f.sim || 0), 0.5) : UNAVAILABLE, submitP50: work.length ? pct(frames.map((f) => f.render || 0), 0.5) : UNAVAILABLE,
    gpuP50: gpu.length ? pct(gpu, 0.5) : UNAVAILABLE, gpuP95: gpu.length ? pct(gpu, 0.95) : UNAVAILABLE,
    callsP50: pct(frames.map((f) => f.calls || 0), 0.5), trianglesP50: pct(frames.map((f) => f.tris || 0), 0.5),
  };
}

// Windows: battery or mains, from WMI. No sensors are read: clocks and temperatures are not reliably available.
function ps(cmd) { return execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', timeout: 20000 }).trim(); }
export function powerSource() {
  try {
    const s = ps('$b = Get-CimInstance Win32_Battery; if ($b) { "$($b.BatteryStatus) $($b.EstimatedChargeRemaining)" } else { "none" }');
    if (s === 'none') return { source: 'mains (no battery)', charge: UNAVAILABLE };
    const [st, pctLeft] = s.split(' ');
    return { source: st === '2' ? 'plugged in' : st === '1' ? 'battery' : `battery status ${st}`, charge: +pctLeft };
  } catch { return { source: UNAVAILABLE, charge: UNAVAILABLE }; }
}
export function hardware() {
  try {
    const j = JSON.parse(ps(`@{ cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name; cores = (Get-CimInstance Win32_Processor | Measure-Object NumberOfLogicalProcessors -Sum).Sum;
      ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1);
      gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object { "$($_.Name) (driver $($_.DriverVersion))" });
      display = @(Get-CimInstance Win32_VideoController | Where-Object CurrentHorizontalResolution | ForEach-Object { "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution) @ $($_.CurrentRefreshRate) Hz" });
      os = (Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version } | ConvertTo-Json -Compress`));
    return { ...j, clocks: UNAVAILABLE, temperatures: UNAVAILABLE };
  } catch (e) { return { error: String(e), clocks: UNAVAILABLE, temperatures: UNAVAILABLE }; }
}
export function gitCommit(repo) {
  try { return execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() + (execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).trim() ? ' (+ uncommitted changes)' : ''); }
  catch { return UNAVAILABLE; }
}
