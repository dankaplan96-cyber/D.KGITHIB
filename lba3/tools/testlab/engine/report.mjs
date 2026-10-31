// Reports from one run's results: report.html (what works / failed / is slow / fix first / not tested), results.json
// (everything, raw frame records included), summary.csv, claude-tasks.md (one task per finding), manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from './util.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS = { passed: 'Passed', failed: 'Failed', blocked: 'Blocked', not_tested: 'Not Tested' };

export function writeReports(run) {
  const dir = run.dir;
  writeJson(path.join(dir, 'manifest.json'), run.manifest);
  writeJson(path.join(dir, 'results.json'), run);
  fs.writeFileSync(path.join(dir, 'summary.csv'), csv(run));
  fs.writeFileSync(path.join(dir, 'claude-tasks.md'), claudeTasks(run));
  fs.writeFileSync(path.join(dir, 'report.html'), html(run));
  return path.join(dir, 'report.html');
}

// one row per measured window of every test (the CSV comparison: Compare Builds adds its build/run columns)
export function csv(run) {
  const cols = ['test', 'window', 'build', 'run', 'status', 'frames', 'seconds', 'fps', 'p50', 'p95', 'p99', 'max', 'missedRefreshes', 'over33', 'over50', 'over100', 'stallsVisible', 'stallsBehindLoading', 'cpuWorkP50', 'gpuP50', 'callsP50', 'trianglesP50'];
  const rows = [cols.join(',')];
  for (const t of run.tests) for (const w of t.windows || []) rows.push(cols.map((c) => ({ test: t.id, window: w.label, build: w.build ?? run.manifest.game.version, run: w.run ?? 1, status: t.status }[c] ?? w.stats?.[c] ?? '')).map((v) => /[,"]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(','));
  return rows.join('\n') + '\n';
}

export function claudeTasks(run) {
  const m = run.manifest, L = [`# LBA3 Test Lab — repair tasks`, '', `Run ${m.runId} · game ${m.game.version} (${m.game.target}) · commit ${m.game.commit} · ${m.power.source} · Test Lab ${m.toolVersion}`, '',
    'Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.', 'Measurements are from the machine in the manifest; do not claim a fix without rerunning there.', ''];
  if (!run.findings.length) L.push('No findings.');
  for (const f of run.findings) {
    L.push(`## ${f.id} · ${f.severity} · ${f.title}`, '', `- Confidence: ${f.confidence}`, `- Observed: ${f.observed}`, `- Expected: ${f.expected}`,
      `- Reproduce: \`${f.reproduce}\``, `- Evidence: ${f.evidence.map((e) => '`' + e + '`').join(', ') || 'none'}`, `- Source locations: ${f.sources?.length ? f.sources.join(', ') : 'not known'}`,
      `- Acceptance: ${f.acceptance}`, '');
  }
  return L.join('\n');
}

function statsCell(s) { return s ? `${s.fps} fps · p50 ${s.p50} · p95 ${s.p95} · p99 ${s.p99} · max ${s.max} ms · >33: ${s.over33} · >50: ${s.over50} (${s.stallsBehindLoading} behind loading) · GPU p50 ${s.gpuP50} · CPU p50 ${s.cpuWorkP50}` : '—'; }

export function html(run) {
  const m = run.manifest, T = run.tests;
  const by = (st) => T.filter((t) => t.status === st);
  const slow = T.flatMap((t) => (t.windows || []).filter((w) => w.stats && w.perf !== false && (w.stats.fps < 55 || w.stats.over50 > 0)).map((w) => ({ t, w })));
  const li = (a, f) => a.length ? `<ul>${a.map((x) => `<li>${f(x)}</li>`).join('')}</ul>` : '<p class="none">None.</p>';
  const method = (x) => Object.entries(x.method || {}).filter(([, v]) => v).map(([k]) => ({ realInput: 'real input', testApi: 'test API', injectedState: 'injected state', preloadedAssets: 'preloaded assets' }[k])).join(', ') || '—';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LBA3 Test Lab report</title>
<style>:root{--bg:#fff;--fg:#1d2128;--mut:#5c6470;--line:#dde1e6;--ok:#1a7f37;--bad:#c62828;--warn:#9a6700;--chip:#f3f5f7}
@media (prefers-color-scheme:dark){:root{--bg:#15181d;--fg:#e6e9ee;--mut:#9aa3ae;--line:#2b3038;--ok:#4cc26a;--bad:#ff6b6b;--warn:#e3b341;--chip:#1e232a}}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,sans-serif;margin:0 auto;max-width:1100px;padding:16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.mut,.none{color:var(--mut)}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.Passed{color:var(--ok)}.Failed{color:var(--bad)}.Blocked{color:var(--warn)}.Not\\ Tested{color:var(--mut)}code{background:var(--chip);padding:0 4px;border-radius:3px}
.wrap{overflow-x:auto}img{max-width:320px;border:1px solid var(--line)}</style></head><body>
<h1>LBA3 Test Lab report</h1>
<p class="mut">Game ${esc(m.game.version)} (${esc(m.game.target)}${m.game.commit ? ', commit ' + esc(m.game.commit) : ''}) · ${esc(m.power.source)}${m.power.charge !== 'Unavailable' ? ' ' + m.power.charge + ' %' : ''} · ${esc(m.hardware.cpu || '')} · ${esc((m.hardware.gpus || []).join(', '))} · ${esc(m.started)} · ${esc(m.suite)} · Test Lab ${esc(m.toolVersion)}${m.stopped ? ' · <b>stopped by the user</b>' : ''}</p>
<h2>What works</h2>${li(by('passed'), (t) => `${esc(t.title)}`)}
<h2>What failed</h2>${li(by('failed'), (t) => `<b>${esc(t.title)}</b>: ${esc(t.note || '')}${(t.assertions || []).filter((a) => !a.ok).map((a) => `<br><span class="mut">${esc(a.name)} — expected ${esc(a.expected)}, observed ${esc(a.observed)}</span>`).join('')}`)}
<h2>What is slow</h2>${li(slow, ({ t, w }) => `<b>${esc(t.title)}</b> · ${esc(w.label)}: ${esc(statsCell(w.stats))}`)}
<h2>What to fix first</h2>${li(run.findings, (f) => `<b>${esc(f.id)}</b> ${esc(f.severity)} · ${esc(f.title)} <span class="mut">(${esc(f.confidence)})</span><br>${esc(f.observed)}${f.evidence?.filter((e) => /\.(png|jpg)$/.test(e)).map((e) => `<br><img src="${esc(e)}" alt="">`).join('') || ''}`)}
<h2>What was not tested</h2>${li([...by('not_tested'), ...by('blocked')], (t) => `${esc(t.title)} — ${STATUS[t.status]}: ${esc(t.note || '')}`)}
<h2>Coverage</h2><div class="wrap"><table><tr><th>Test</th><th>Result</th><th>How</th><th>Assertions</th><th>Time</th></tr>
${T.map((t) => `<tr><td>${esc(t.title)}</td><td class="${STATUS[t.status]}">${STATUS[t.status]}</td><td>${esc(method(t))}</td><td>${(t.assertions || []).filter((a) => a.ok).length}/${(t.assertions || []).length}</td><td>${t.durationMs != null ? (t.durationMs / 1000).toFixed(0) + ' s' : ''}</td></tr>`).join('')}</table></div>
<h2>Measurements</h2><div class="wrap"><table><tr><th>Test</th><th>Window</th><th>Frames</th></tr>
${T.flatMap((t) => (t.windows || []).map((w) => `<tr><td>${esc(t.title)}</td><td>${esc(w.label)}</td><td>${esc(statsCell(w.stats))}${w.settings ? `<br><span class="mut">${esc(w.settings)}</span>` : ''}</td></tr>`)).join('')}</table></div>
<h2>Run conditions</h2><p class="mut">${esc(m.conditions.join(' · '))}</p>
<p class="mut">Files: results.json (raw frame records), summary.csv, claude-tasks.md, manifest.json, evidence/. "Unavailable" means the machine or the game does not report it.</p>
</body></html>`;
}
