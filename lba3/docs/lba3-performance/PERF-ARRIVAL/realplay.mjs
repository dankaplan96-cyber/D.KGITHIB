// PERF-ARRIVAL: the benchmark's routes played the way the game plays them (not the tests' fixed stepping): the
// warm-ups that real play runs (a scene change's shader/geometry warm-up behind the black fade, a preset change's
// recompile) run here too. The page's own requestAnimationFrame loop is parked; each frame is Game.advance(1/30)
// called from here, with a yield to the event loop between frames so the asynchronous shader waits complete.
// Records, per route: every shader program created while the route plays (which object, which pass, how its cache
// key differs from the nearest program compiled before), and per drawn frame the draw calls (shadow share),
// triangles, the area, the time since the last arrival and whether the screen was black.
//   GAME_URL=http://localhost:8177/ QUALITY=high ROUTES=street,interior,combat,transition,arrival SWITCH=low,medium OUT=x.json node realplay.mjs
// QUALITY: the preset saved before the page loads (a player who picked it). SWITCH: presets to switch to first, in
// this page, in this order, as the in-game benchmark does (low,medium,high), each followed by its routes.
import { launch, open } from '../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const Q0 = process.env.QUALITY || 'high';
const SW = (process.env.SWITCH || '').split(',').filter(Boolean);
const ROUTES = (process.env.ROUTES || 'street,interior,combat,transition,arrival').split(',');
const FR = +(process.env.FRAMES || 225), EVERY = +(process.env.EVERY || 1), DYN = +(process.env.DYN || 0);
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q0);
const t0 = Date.now();
await open(page, '?nocine', { freeze: false });
const boot = await page.evaluate(() => ({ load: game.loadTimes, programs: game.renderer.renderer.info.programs.length, quality: game.settings.quality }));
console.log('boot', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(boot));
// park the rAF loop; frames are advanced from here
await page.evaluate((DYN) => {
  const G = game; G._adv = G.advance.bind(G); G.advance = () => {};
  G.renderer.setAutoRes(false);
  // (DYN=0.5: the scene pass draws a quarter of the pixels, as the automatic resolution would: same objects, calls and
  //  triangles, less software raster; benching keeps the automatic resolution from moving it, and saves off)
  if (DYN) { G.benching = true; G.renderer.autoRes = true; G.renderer.setDyn(DYN); }
  document.querySelector('[data-act="new"]').click();
  const R = G.renderer.renderer;
  // who creates each program: wrap the outermost renderBufferDirect (the Perf wrapper is under it)
  const W = (window.__pw = { log: [], n: R.info.programs.length, ctx: '' });
  const rbd = R.renderBufferDirect;
  const pathOf = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); return p.slice(0, 5).join(' < '); };
  R.renderBufferDirect = function (c, sc, geo, mat, obj, ...a) {
    const r = rbd.call(this, c, sc, geo, mat, obj, ...a);
    if (R.info.programs.length > W.n) {
      for (let i = W.n; i < R.info.programs.length; i++) W.log.push({ ctx: W.ctx, key: String(R.info.programs[i].cacheKey), name: R.info.programs[i].name, pass: sc ? 'main' : 'shadow', obj: pathOf(obj), kind: obj.isSkinnedMesh ? 'skinned' : obj.isInstancedMesh ? 'instanced' : obj.isBatchedMesh ? 'batched' : obj.type, mat: (mat.name || '') + ':' + mat.type });
      W.n = R.info.programs.length;
    }
    return r;
  };
}, DYN);
const tick = (n, real = 1 / 30) => page.evaluate(async ({ n, real }) => { for (let i = 0; i < n; i++) { game._adv(real); await new Promise((r) => setTimeout(r, 0)); } }, { n, real });
// play until the new game is in play (no fade, no hold)
for (let i = 0; i < 40; i++) {
  await tick(5);
  const s = await page.evaluate(() => ({ st: game.state, tr: !!game.trans }));
  if (s.st === 'play' && !s.tr) break;
  if (s.st === 'dialog' || s.st === 'cinematic' || s.st === 'cutscene') await page.evaluate(() => game.setState('play'));
}
const out = { boot, quality0: Q0, routes: {} };
const keysNow = () => page.evaluate(() => game.renderer.renderer.info.programs.map((p) => String(p.cacheKey)));
async function runRoute(q, id) {
  const before = await keysNow();
  const res = await page.evaluate(async ({ id, FR, q, EVERY }) => {
    const G = game, R = G.renderer.renderer, W = window.__pw;
    W.ctx = q + '/' + id + ':setup'; W.n = R.info.programs.length;
    const p0 = R.info.programs.length, log0 = W.log.length;
    const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.state = 'play';
    const rows = []; let t = 0, area = null, since = 0;
    const areaOf = () => G.room?.id || 'citadel';
    for (let i = 0; i < FR; i++) {
      const dt = 1 / 30; t += dt;
      W.ctx = `${q}/${id}:t=${t.toFixed(2)}`;
      route.drive(t, dt);
      // hold frames (a shader warm-up behind black) wait on the driver: give it real time, as the game would
      if (G.trans?.hold || G.gfxHold) await new Promise((r) => setTimeout(r, 20));
      const a = areaOf(); if (a !== area) { area = a; since = 0; } else since += dt;
      const pn = R.info.programs.length;
      // (EVERY=n: draw every nth frame, simulate the others, as tests/perfbudget.mjs does; SwiftShader takes seconds a frame)
      if (i % EVERY !== 0) { G._transBudget = null; G.frame(dt, false); await new Promise((r) => setTimeout(r, 0)); continue; }
      G._adv(dt);
      const f = G.perf.buf[(G.perf.i + G.perf.buf.length - 1) % G.perf.buf.length];
      rows.push({ t: +t.toFixed(2), area, since: +since.toFixed(2), calls: f.calls, shadow: f.shadowCalls, tris: f.tris, render: +f.render.toFixed(1), sim: +f.sim.toFixed(1), black: !!(G.trans && (G.trans.hold || G._fadeOp >= 0.999)), fade: +(G._fadeOp ?? 0).toFixed(2), hold: !!G.trans?.hold, newProg: R.info.programs.length - pn });
      await new Promise((r) => setTimeout(r, 0));
    }
    // let any last fade finish
    for (let i = 0; i < 40 && G.trans; i++) { G._adv(1 / 30); await new Promise((r) => setTimeout(r, 10)); }
    return { rows, newPrograms: R.info.programs.length - p0, who: W.log.slice(log0) };
  }, { id, FR, q, EVERY });
  const fresh = (await keysNow()).filter((k) => !before.includes(k));
  const fields = (k) => k.split(',');
  res.diffs = fresh.map((k) => {
    const f = fields(k); let best = null, bd = 1e9;
    for (const k0 of before) { const g = fields(k0); if (g.length !== f.length || g[0] !== f[0]) continue; let d = 0; const at = []; for (let i = 0; i < f.length; i++) if (f[i] !== g[i]) { d++; at.push(`#${i}: ${g[i]} → ${f[i]}`); } if (d < bd) { bd = d; best = at; } }
    return { head: f.slice(0, 2).join(','), nDiff: bd === 1e9 ? 'no program of this shader before' : bd, diff: best?.slice(0, 8) };
  });
  const D = res.rows.filter((r) => r.calls > 0), s = (k, p) => { const v = D.map((r) => r[k]).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : 0; };
  res.summary = { frames: res.rows.length, drawn: D.length, calls50: s('calls', 0.5), calls95: s('calls', 0.95), callsMax: s('calls', 1), shadow50: s('shadow', 0.5), shadow95: s('shadow', 0.95), tris50: s('tris', 0.5), tris95: s('tris', 0.95), render50: s('render', 0.5), render95: s('render', 0.95), newPrograms: res.newPrograms };
  out.routes[`${q}/${id}`] = res;
  console.log(`${q.padEnd(6)} ${id.padEnd(10)} ${JSON.stringify(res.summary)}`);
  for (const w of res.who.slice(0, 40)) console.log(`   new program: ${w.ctx} ${w.pass} ${w.kind} ${w.obj} ${w.mat}`);
  for (const d of res.diffs.slice(0, 40)) console.log(`   diff: ${d.head} ${d.nDiff} ${JSON.stringify(d.diff)}`);
}
const plan = SW.length ? SW : [Q0];
for (const q of plan) {
  const cur = await page.evaluate(() => game.settings.quality);
  if (cur !== q) {
    const pq = await page.evaluate(async (q) => {
      const G = game, R = G.renderer.renderer, p0 = R.info.programs.length;
      window.__pw.ctx = 'switch→' + q;
      G.settings.quality = q; G.applySettings();
      // as the benchmark: wait for the preset's warm-up (gfxHold) to finish, drawing nothing meanwhile
      for (let i = 0; i < 400 && G.gfxHold; i++) await new Promise((r) => setTimeout(r, 25));
      window.__pw.n = R.info.programs.length;
      return { compiledBySwitch: R.info.programs.length - p0, holdLeft: !!G.gfxHold };
    }, q);
    console.log('switch to', q, JSON.stringify(pq));
    out['switch-' + q] = pq;
  }
  for (const id of ROUTES) await runRoute(q, id);
}
out.programsEnd = await page.evaluate(() => game.renderer.renderer.info.programs.length);
out.errors = errs.slice(0, 10);
console.log('programs at the end', out.programsEnd, 'errors', JSON.stringify(out.errors));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
await browser.close();
