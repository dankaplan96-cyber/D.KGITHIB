// SMOOTH-HW tables: before vs after per route, from smooth-routes.mjs OUT dirs (summary.json)
//   node agg.mjs <tag> "<q:fps> ..."   → markdown on stdout
import fs from 'node:fs';
const [tag, ...cfgs] = process.argv.slice(2);
const D = 'C:/Users/danka/dev/lba3-bench/smooth/';
const rng = (a) => { a = a.filter((x) => x != null); if (!a.length) return '–'; const x = Math.min(...a), y = Math.max(...a); return x === y ? '' + x : `${x}–${y}`; };
const sp = (m) => (m ? `${m.spikes}/${m.n}` : '–');
for (const c of cfgs) {
  const [q, f] = c.split(':');
  console.log(`\n#### Plugged in · ${q} · Frame Rate ${f} (3 recorded passes per route, ranges)\n`);
  console.log('| route | build | fps | frame p50 / p95 / p99 / max ms | > 50 ms | long tasks | CPU p50 / p95 ms | GPU p50 / p95 ms | calls | spikes hero · camPos · camView · look (per pass) | hero jerk px p95 / max | view acc p99 / max rad/s² |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const route of ['street', 'combat', 'mill']) for (const b of ['before', 'after']) {
    const fn = `${D}${b}-${tag}-${q}-${f}/summary.json`;
    if (!fs.existsSync(fn)) { console.log(`| ${route} | ${b} | (no run) |||||||||||`); continue; }
    const R = JSON.parse(fs.readFileSync(fn)).filter((r) => r.mode === 'real' && r.route === route);
    if (!R.length) { console.log(`| ${route} | ${b} | (not run: the load hung) |||||||||||`); continue; }
    const T = (k) => rng(R.map((r) => r.timing[k]));
    console.log(`| ${route} | ${b} | ${T('fps')} | ${T('p50')} / ${T('p95')} / ${T('p99')} / ${T('max')} | ${R.map((r) => r.timing.over50).join(', ')} | ${R.map((r) => r.longTasks).join(', ')} | ${T('cpuP50')} / ${T('cpuP95')} | ${T('gpuP50')} / ${T('gpuP95')} | ${T('calls')} | ${R.map((r) => [sp(r.motion.hero), sp(r.motion.camPos), sp(r.motion.camView), sp(r.motion.look)].join(' · ')).join('; ')} | ${rng(R.map((r) => r.motion.hero.jerkP95))} / ${rng(R.map((r) => r.motion.hero.jerkMax))} | ${rng(R.map((r) => r.motion.viewAcc.p99))} / ${rng(R.map((r) => r.motion.viewAcc.max))} |`);
  }
}
