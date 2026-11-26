// Compare Builds: the same test on two builds, interleaved baseline → candidate → baseline … so drift (heat, battery,
// background work) shows up as a difference between the baselines instead of hiding in the result. At least 3 runs
// each; a comparison whose baselines disagree with each other is flagged unstable, not reported as precise.
import fs from 'node:fs';
import path from 'node:path';
import { runSuite, emit } from './runner.mjs';
import { stamp, powerSource, writeJson } from './util.mjs';

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const cv = (a) => { const m = mean(a); return m ? Math.sqrt(mean(a.map((x) => (x - m) ** 2))) / m : 0; };

export async function compareBuilds({ runsDir, baseline, candidate, test = 'street-traversal', repeats = 3 }) {
  if (!candidate.game && !candidate.project) throw new Error('no candidate build selected');
  const dir = path.join(runsDir, `${stamp()}-compare`); fs.mkdirSync(dir, { recursive: true });
  const order = []; for (let k = 0; k < repeats; k++) order.push('baseline', 'candidate'); order.push('baseline');
  const power0 = powerSource(), rows = [];
  for (let i = 0; i < order.length; i++) {
    const which = order[i], b = which === 'baseline' ? baseline : candidate;
    emit('status', { text: `Compare: ${which} (${i + 1} of ${order.length})` });
    const run = await runSuite({ runsDir: path.join(dir, 'runs'), ...b, suite: `compare-${which}`, only: [test] });
    const t = run.tests[0], w = (t.windows || []).find((x) => x.perf && x.stats);
    rows.push({ order: i + 1, build: which, version: run.manifest.game.version, status: t.status, power: run.manifest.power.source, ...(w?.stats || {}), settings: w?.settings || '', report: path.relative(dir, run.dir) });
    if (run.manifest.stopped) break;
  }
  const power1 = powerSource();
  const B = rows.filter((r) => r.build === 'baseline' && r.fps), C = rows.filter((r) => r.build === 'candidate' && r.fps);
  const keys = ['fps', 'p95', 'p99', 'max', 'over50', 'gpuP50', 'cpuWorkP50'];
  const summary = {};
  for (const k of keys) { const b = B.map((r) => r[k]).filter((v) => typeof v === 'number'), c = C.map((r) => r[k]).filter((v) => typeof v === 'number'); if (b.length && c.length) summary[k] = { baseline: +mean(b).toFixed(2), candidate: +mean(c).toFixed(2), delta: +(mean(c) - mean(b)).toFixed(2), baselineSpread: +(100 * cv(b)).toFixed(1) }; }
  const unstable = [];
  if (B.length >= 2 && cv(B.map((r) => r.fps)) > 0.05) unstable.push(`baseline fps varies ${(100 * cv(B.map((r) => r.fps))).toFixed(1)} % between its runs`);
  if (B.length >= 2 && Math.abs(B[0].fps - B.at(-1).fps) > 0.05 * B[0].fps) unstable.push(`first and last baseline differ (${B[0].fps} → ${B.at(-1).fps} fps): conditions drifted`);
  if (power0.source !== power1.source || rows.some((r) => r.power !== power0.source)) unstable.push('the power source changed during the comparison');
  if (new Set(rows.map((r) => r.settings.split(' · ')[0])).size > 1) unstable.push('the quality the game chose differed between runs: ' + [...new Set(rows.map((r) => r.settings.split(' · ')[0]))].join(' / '));
  const verdict = !summary.fps ? 'not enough runs' : unstable.length ? 'UNSTABLE: not conclusive' : Math.abs(summary.fps.delta) < 2 * Math.max(0.5, summary.fps.baselineSpread * summary.fps.baseline / 100) ? 'no clear difference' : summary.fps.delta > 0 ? 'candidate faster' : 'candidate slower';
  const cols = ['order', 'build', 'version', 'status', 'power', 'fps', 'p50', 'p95', 'p99', 'max', 'over33', 'over50', 'over100', 'gpuP50', 'cpuWorkP50', 'settings', 'report'];
  fs.writeFileSync(path.join(dir, 'comparison.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => /[,"]/.test(String(r[c] ?? '')) ? `"${String(r[c]).replace(/"/g, '""')}"` : r[c] ?? '').join(','))].join('\n') + '\n');
  writeJson(path.join(dir, 'comparison.json'), { test, repeats, order, power: [power0, power1], rows, summary, unstable, verdict });
  fs.writeFileSync(path.join(dir, 'report.html'), `<!doctype html><meta charset="utf-8"><title>LBA3 Test Lab — comparison</title><style>body{font:15px system-ui;max-width:1000px;margin:auto;padding:16px}td,th{border-bottom:1px solid #ccc;padding:3px 6px;text-align:left}table{border-collapse:collapse}</style>
<h1>Compare builds: ${test}</h1><p><b>${verdict}</b>${unstable.length ? '<br>' + unstable.join('<br>') : ''}</p><p>${power0.source} → ${power1.source} · order ${order.join(' → ')}</p>
<table><tr><th>metric</th><th>baseline</th><th>candidate</th><th>Δ</th><th>baseline spread</th></tr>${Object.entries(summary).map(([k, s]) => `<tr><td>${k}</td><td>${s.baseline}</td><td>${s.candidate}</td><td>${s.delta}</td><td>${s.baselineSpread} %</td></tr>`).join('')}</table>
<h2>Runs</h2><table><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${c === 'report' ? `<a href="${r.report}/report.html">open</a>` : r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</table>`);
  emit('end', { report: path.join(dir, 'report.html'), dir, findings: 0, verdict });
  return { dir, verdict, summary, unstable };
}
