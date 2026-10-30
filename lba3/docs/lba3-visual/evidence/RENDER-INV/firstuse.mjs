// RENDER-INV: first-use costs. (1) Each weapon and gadget used for the first time, then again: the drawn frame's CPU
// time (GPU queue drained first), shader programs and geometries created. (2) The first and a later entry to each
// area: the scene-change work done behind the black frame (the swap, geometry upload, shadow batches, shader warm-up
// — timed here as the real transition runs it). (3) Saving (serialise + localStorage) and loading a save.
// SwiftShader: CPU proxies; shader compiles here are SwiftShader's, not the laptop driver's.
//   GAME_URL=http://localhost:8176/ node firstuse.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const load = os.loadavg()[0];
const out = await page.evaluate(async () => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const W = G.renderer.renderer, gl = W.getContext(), px = new Uint8Array(4);
  const drawn = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const p0 = W.info.programs.length, g0 = W.info.memory.geometries, t0 = performance.now(); G.frame(1 / 30, true); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return { ms: +(performance.now() - t0).toFixed(1), newPrograms: W.info.programs.length - p0, newGeometries: W.info.memory.geometries - g0 }; };
  // (1) the arsenal, in the developer arena with its enemies
  const r = G.bench.routes().find((x) => x.id === 'combat'); G.state = 'play'; r.setup(); G.state = 'play';
  const h = G.hero; h.arms = { ...h.arms, blowgun: true, laser: true, glove: true, lightning: true, protect: true, conch: true, lantern: true, jetpack: true, darts: 20, charge: 20, penguins: 3 };
  h.hasSword = true; h.hasPulse = true; h.hasBall = true; h.mp = h.mpMax = 40; h.magicLevel = Math.max(1, h.magicLevel || 1);
  for (let i = 0; i < 20; i++) G.frame(1 / 30, i % 5 === 4);
  const aim = () => { const e = G.enemies.find((x) => x.alive && x.present && x.id?.startsWith('a_')); return e ? { x: e.pos.x - h.pos.x, z: e.pos.z - h.pos.z } : { x: 0, z: 1 }; };
  const norm = (a) => { const l = Math.hypot(a.x, a.z) || 1; return { x: a.x / l, z: a.z / l }; };
  const uses = {
    ball: () => G.ball.launch(h, 'normal', h.magicLevel, { aim: norm(aim()) }),
    blowgun: () => G.weapons.fire('blowgun', norm(aim())),
    laser: () => G.weapons.fire('laser', norm(aim())),
    lightning: () => G.weapons.fire('lightning', norm(aim())),
    penguin: () => G.gadgets.use('penguin'),
    protect: () => G.gadgets.use('protect'),
    conch: () => G.gadgets.use('conch'),
    lantern: () => G.gadgets.use('lantern'),
    jetpack: () => G.gadgets.use('jetpack'),
  };
  const arsenal = {};
  for (const [k, f] of Object.entries(uses)) {
    const row = {};
    for (const n of ['first', 'second']) {
      h.mp = h.mpMax; h.hp = h.maxHp; G.ball.reset?.('credit');
      for (let i = 0; i < 25; i++) G.frame(1 / 30, false);   // (cooldowns, the last shot gone)
      let ok; try { ok = f(); } catch (e) { ok = 'error ' + e.message; }
      const a = drawn(), b = drawn(), c = drawn();
      row[n] = { ok: ok === undefined ? true : ok, frameMs: [a.ms, b.ms, c.ms], newPrograms: a.newPrograms + b.newPrograms + c.newPrograms, newGeometries: a.newGeometries + b.newGeometries + c.newGeometries };
      if (k === 'lantern' || k === 'jetpack') f();   // (toggled back off)
    }
    arsenal[k] = row;
  }
  // (2) areas: first and second entry through the real scene change (the fade, the black frame's work)
  G.resetCombat?.('drop');
  const areas = {};
  const timeTransition = async (go) => {
    G.testFreeze = false;   // (warmScene and the hold only run in real play)
    const marks = {}; const wrapT = (o, k, name) => { const f = o[k]; o[k] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { marks[name] = +((marks[name] || 0) + performance.now() - t0).toFixed(1); } }; return () => { o[k] = f; }; };
    const un = [wrapT(G, 'uploadGeometry', 'uploadGeometry'), wrapT(G.shadowCull, 'update', 'shadowCull.update'), wrapT(G.renderer, 'precompile', 'precompile (sync part)')];
    const p0 = W.info.programs.length, t0 = performance.now(); let holdMs = 0, frames = 0, longest = 0;
    go();
    // drive the transition frame by frame (the loop's own advance, at 30 fps steps) until it ends
    while ((G.trans || frames < 2) && frames < 400) {
      const f0 = performance.now(); G.advance(1 / 30); const d = performance.now() - f0; frames++; longest = Math.max(longest, d);
      if (G.trans?.hold) { const hs = performance.now(); await new Promise((r) => setTimeout(r, 20)); holdMs += performance.now() - hs; }
    }
    G.testFreeze = true; un.forEach((u) => u());
    return { totalMs: Math.round(performance.now() - t0), frames, longestFrameMs: +longest.toFixed(1), heldForShadersMs: Math.round(holdMs), newPrograms: W.info.programs.length - p0, ...marks };
  };
  G.state = 'play';
  for (const id of ['zeelich', 'desert', 'hamalayi', 'isle_otringal', 'house', 'workshop']) {
    if (!G.rooms[id]) continue;
    areas[id] = { first: await timeTransition(() => G.enterRoom(id, null, false, true)) };
    await timeTransition(() => G.exitRoom({ x: -42, z: 2, a: 0 }, false, true));
    areas[id].second = await timeTransition(() => G.enterRoom(id, null, false, true));
    await timeTransition(() => G.exitRoom({ x: -42, z: 2, a: 0 }, false, true));
  }
  // (3) save and load
  G.state = 'play'; G.benching = false;
  const sv = []; for (let i = 0; i < 10; i++) { const t0 = performance.now(); G.save(false); sv.push(performance.now() - t0); }
  sv.sort((a, b) => a - b);
  const size = (localStorage.getItem('lba3_save_v1') || '').length;
  const snap = G.snapshot(); const t1 = performance.now(); G.applySave(snap); const applyMs = performance.now() - t1;
  return { arsenal, areas, save: { medianMs: +sv[5].toFixed(2), maxMs: +sv[9].toFixed(2), bytes: size }, loadSaveMs: +applyMs.toFixed(1), programs: W.info.programs.length };
});
console.log(JSON.stringify({ quality, load, loadAfter: os.loadavg()[0], out, errors: errs.slice(0, 8) }, null, 1));
await browser.close();
