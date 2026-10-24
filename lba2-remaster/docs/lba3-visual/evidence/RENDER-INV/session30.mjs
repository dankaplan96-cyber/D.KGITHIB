// RENDER-INV: a 30-minute representative session (wall clock), looking for memory growth. One cycle: walk the
// street (bench route), into the house and out, Zeelich and back, Desert Island and back, a fight in the arena
// (throws), a save, back to Citadel. Simulated in fixed steps, every 4th frame drawn. After each cycle: the V8 heap
// after a forced GC (CDP), this browser's renderer and GPU-process resident memory, three's geometry / texture /
// program counts, the scene's object count and the number of shadow areas and map caches.
//   GAME_URL=http://localhost:8176/ MINUTES=30 node session30.mjs > session30.json
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
const MIN = +(process.env.MINUTES || 30);
const pids = () => execSync("ps -eo pid,args | grep -E 'chrom(e|ium)' | grep -v grep | awk '{print $1}'").toString().split(/\s+/).filter(Boolean);
const before = new Set(pids());
const { browser, context, page, errs } = await launch({ width: 1366, height: 768 });
const mine = () => pids().filter((p) => !before.has(p));
const rss = () => { const r = {}; for (const p of mine()) { try { const a = execSync(`ps -o rss=,args= -p ${p}`).toString(); const t = /--type=gpu-process/.test(a) ? 'gpuMB' : /--type=renderer/.test(a) ? 'rendererMB' : 'otherMB'; r[t] = (r[t] || 0) + Math.round(parseInt(a) / 1024); } catch {} } return r; };
await page.addInitScript(() => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', '1'); } } catch {} });
await open(page, '?nocine');
const cdp = await context.newCDPSession(page);
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const sample = async (cycle) => {
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  const g = await page.evaluate(() => { const G = game, R = G.renderer.renderer; let n = 0; G.scene.traverse(() => n++); return { ...R.info.memory, programs: R.info.programs.length, objects: n, shadowAreas: G.shadowCull.areas.size, maps: G.hud._bases?.size, sceneKids: G.scene.children.length, particles: G.particles?.list?.length ?? null }; });
  return { cycle, min: +((Date.now() - t0) / 60000).toFixed(1), heapMB: +(h.usedSize / 1048576).toFixed(1), ...rss(), ...g, load: +os.loadavg()[0].toFixed(1) };
};
const t0 = Date.now(), rows = [await sample(0)];
let cycle = 0;
while (Date.now() - t0 < MIN * 60000) {
  cycle++;
  await page.evaluate(() => {
    const G = game, run = (s, drive) => { for (let i = 0, n = Math.round(s * 30); i < n; i++) { drive?.(i / 30, 1 / 30); G.state = 'play'; G.frame(1 / 30, i % 4 === 3); } };
    const st = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; st.setup(); run(6, (t, dt) => st.drive(t, dt));
    G.enterRoom('house', null, true, true); run(2); G.exitRoom({ x: -45, z: 76, a: 0 }, true, true); run(2);
    G.enterRoom('zeelich', null, true, true); run(3); G.enterRoom('desert', null, true, true); run(3);
    const cb = G.bench.routes().find((x) => x.id === 'combat'); cb.setup(); G.state = 'play'; run(4, (t, dt) => cb.drive(t, dt));
    G.resetCombat('drop'); G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.state = 'play'; run(2);
    G.save(false);
  });
  if (cycle % 2 === 0) rows.push(await sample(cycle));
}
rows.push(await sample(cycle));
console.log(JSON.stringify({ minutes: MIN, cycles: cycle, rows, errors: errs.slice(0, 8) }));
await browser.close();
