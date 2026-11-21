// Findings from a run, ranked. Each says how sure it is:
//   confirmed  the test's own assertion failed (the outcome itself was observed wrong), or an A/B comparison isolated it
//   likely     a stall whose own frame names the work that ran in it (the game's frameWhy: batches built, shadow cache
//              rebuilt, shaders compiled, uploads, GC) or long-animation-frame scripts over most of its length
//   unexplained a stall with nothing recorded in it: timing alone is not a cause
// Ranking: player impact (visible > behind loading; failures first) × frequency × measured cost.
import path from 'node:path';

const SEV = { high: 3, medium: 2, low: 1 };
export function analyse(run) {
  const F = [];
  for (const t of run.tests) {
    const repro = `node engine/cli.mjs reproduce "${path.join(run.dir, 'scenarios', t.id + '.json')}"`;
    for (const a of (t.assertions || []).filter((a) => !a.ok)) {
      F.push({ title: `${t.title}: ${a.name}`, severity: 'high', confidence: 'confirmed', test: t.id, observed: a.observed, expected: a.expected, reproduce: repro,
        evidence: t.evidence.filter((e) => /failure/.test(e)), sources: [], acceptance: `"${a.name}" passes in ${t.id} on the target laptop, three runs in a row`, score: 100 });
    }
    if (t.status === 'failed' && !(t.assertions || []).some((a) => !a.ok)) F.push({ title: `${t.title} did not complete`, severity: 'high', confidence: 'confirmed', test: t.id, observed: t.note, expected: 'the test runs to its end',
      reproduce: repro, evidence: t.evidence, sources: [], acceptance: `${t.id} completes without errors on the target laptop`, score: 90 });
    for (const e of t.errors || []) F.push({ title: `${t.title}: ${e.kind}`, severity: 'medium', confidence: 'confirmed', test: t.id, observed: e.text.slice(0, 300), expected: 'no errors',
      reproduce: repro, evidence: [], sources: [e.at || (e.stack || '').split('\n').slice(1, 3).join(' ').trim()].filter(Boolean), acceptance: 'the error no longer appears in this test', score: 60 });
    // stalls, grouped by what ran in them
    const groups = new Map();
    for (const w of t.windows || []) for (const f of (w.frames || []).filter((f) => f.ms > 50 && !f.tainted)) {
      const loaf = (w.loaf || []).filter((l) => Math.abs(l.t + l.ms - f.t) < 120).sort((a, b) => b.ms - a.ms)[0];
      const why = f.why ? f.why.replace(/[\d.]+ ?(ms|MB)?/g, '#').replace(/\s+/g, ' ').trim() : loaf?.scripts?.[0] ? `script ${loaf.scripts[0].fn || '(anonymous)'} ${loaf.scripts[0].src}` : '';
      const key = (f.black ? 'behind loading · ' : 'visible · ') + (why || 'nothing recorded');
      const g = groups.get(key) || { key, frames: [], why, black: f.black, loaf: [], window: w.label, stalls: w.stalls || [], prof: [] };
      const ps = w.profile?.stalls?.find((s) => Math.abs(s.t - f.t) < 1); if (ps) g.prof.push(ps);
      g.frames.push(f); if (loaf) g.loaf.push(loaf); groups.set(key, g);
    }
    for (const g of groups.values()) {
      const n = g.frames.length, worst = Math.max(...g.frames.map((f) => f.ms)), total = g.frames.reduce((a, f) => a + f.ms, 0);
      const visible = !g.black, cause = g.frames[0].why ? 'likely' : g.why ? 'likely' : 'unexplained';
      const sev = visible && (worst > 250 || n > 10) ? 'high' : visible ? 'medium' : 'low';
      // call sites: the profiler's stack inside the stall (reproduction runs), else the long-animation-frame scripts
      const stacks = g.prof.filter((p) => p.stack.length).map((p) => p.stack.slice(0, 5).join(' ← '));
      const scripts = stacks.length ? [...new Set(stacks)].slice(0, 3) : [...new Set(g.loaf.flatMap((l) => l.scripts.map((s) => `${s.fn || '(anonymous)'} ${s.src}`)))].slice(0, 4);
      const P0 = g.prof[0], traced = !P0 ? '' : P0.coverage < 0.5 || P0.jsMs < 0.3 * P0.ms ? `; profiler: only ${P0.jsMs} ms of JavaScript in the ${P0.ms.toFixed(0)} ms stall (samples covered ${Math.round(100 * P0.coverage)} %): the wait was mostly outside JS (GPU driver / browser)` : `; profiler inside the stall: ${P0.top.slice(0, 3).map((x) => `${x.fn} ${x.ms} ms`).join(', ')}`;
      F.push({ title: `${t.title}: ${n} ${visible ? 'visible' : 'behind-loading'} frame${n > 1 ? 's' : ''} over 50 ms${g.why ? ' — ' + g.why : ''}`, severity: sev, confidence: cause, test: t.id,
        observed: `${n} frames, worst ${worst.toFixed(0)} ms, ${total.toFixed(0)} ms in all (${g.window})${g.frames[0].why ? '; the frame itself recorded: ' + g.frames[0].why : ''}${traced}`,
        expected: visible ? 'no visible frame over 50 ms during play' : 'loading work hidden and short', reproduce: repro, evidence: g.stalls.slice(0, 4),
        sources: scripts, acceptance: `${t.id}: frames over 50 ms in "${g.window}" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change`,
        score: (visible ? 50 : 10) + Math.min(30, n * 2) + Math.min(20, worst / 50) });
    }
    // steady-state speed
    for (const w of (t.windows || []).filter((w) => w.perf && w.stats)) if (w.stats.fps < 55) F.push({
      title: `${t.title}: ${w.stats.fps} fps in "${w.label}"`, severity: w.stats.fps < 45 ? 'high' : 'medium', confidence: w.stats.gpuP50 !== 'Unavailable' && typeof w.stats.gpuP50 === 'number' ? 'likely' : 'unexplained', test: t.id,
      observed: `${w.stats.fps} fps, p95 ${w.stats.p95} ms, GPU p50 ${w.stats.gpuP50} ms, CPU work p50 ${w.stats.cpuWorkP50} ms — ${typeof w.stats.gpuP50 === 'number' && typeof w.stats.cpuWorkP50 === 'number' ? (w.stats.gpuP50 > w.stats.cpuWorkP50 ? 'GPU-bound by the timer query' : 'CPU-bound by the game\'s own timing') : 'bound not known'}`,
      expected: '55–60 fps', reproduce: repro, evidence: [], sources: [], acceptance: `${t.id} "${w.label}" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery`, score: 40 + (60 - w.stats.fps) });
  }
  F.sort((a, b) => b.score - a.score || SEV[b.severity] - SEV[a.severity]);
  return F.map((f, i) => ({ id: `F${String(i + 1).padStart(2, '0')}`, ...f }));
}
