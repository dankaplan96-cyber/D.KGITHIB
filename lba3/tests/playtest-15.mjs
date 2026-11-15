// PLAYTEST-15 (the user's playtest of 15.11.2026, docs/lba-maturity/PLAYTEST-15.md):
//   P32  the house: no rug or floor drawn at the height of the surface under it (the bathroom's mat fought its tiles)
//   P33  chapter 1, the project ferry comes in: Vesk on deck is drawn and in sight of the camera through the whole ride
//   P34  the narrator's line about the ferry is a subtitle while she glides in; the speech at the berth is Vesk's, then
//        Gilbert's; a skip in the first second still says the narrator's line
//   P36  the square: the residents stroll at a person's pace with a matching step; when the water comes back a few of them
//        gather at the well, glad, and go back to their rounds after a while
//   P37  the pump room: each cock seen from the room camera at its use spot and on the way to it
//   P39  the pump room: the objective names the place; each cock its own prompt and selectable by facing it; the wrong
//        one answers at once; the right one completes the step
// Automated runtime only (headless Chromium, SwiftShader): positions, rays, states; no frame-rate claims.
import { launch, checker } from './lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const CONTACT = fileURLToPath(new URL('./lib/contact.js', import.meta.url));
const { browser, page } = await launch({ width: 960, height: 540, locale: 'en-US' });
const { check, checkVisual, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const ONLY = process.env.ONLY || '';   // e.g. ONLY=house,ferry,square,pump
const on = (k) => !ONLY || ONLY.split(',').includes(k);

await page.goto((process.env.GAME_URL || 'http://localhost:8123/') + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: +process.env.BOOT_TIMEOUT || 300000 });
await ev(() => { game.testFreeze = true; localStorage.clear(); });
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(async () => {
  window.THREE = await import('three');
  const G = window.game; G.testFreeze = true;
  window.T = {
    talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
    tp(x, z, a = 0) { const h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = a; h.onGround = true; h.vy = 0; h.vel?.set(0, 0); G.camRig.lba && (G.camRig.lba.init = false); G.step(0.1); },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    steps(n, dt = 1 / 30) { for (let i = 0; i < n; i++) G.step(dt); },
  };
});

// ------------------------------------------------------------------ P32: the house's rugs and floors
if (on('house')) {
  const r = await ev(() => {
    const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
    if (G.room?.id !== 'house') G.enterRoom('house', null, true);
    T.steps(10);
    const root = G.room.group; root.updateMatrixWorld(true);
    // every up-facing triangle at floor level, by 5 cm cells: [y, surface, isRug]
    const C = 0.05, grid = new Map(), v = [{}, {}, {}];
    const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const isRug = (m) => m?.map && m.alphaTest === 0.5 && m.side === THREE.DoubleSide && m.userData?.noShadow;
    let sid = 0; const rugs = [];
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position || !shown(o)) return;
      // (a piece drawn through a draw batch is not drawn itself in the main pass: the batch's copy is, so the
      //  original is the one measured and the batch is skipped — the same surface, never two)
      if (o.name === 'drawBatch' || o.userData?.drawBatch) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const pos = o.geometry.attributes.position, idx = o.geometry.index, E = o.matrixWorld.elements, n = idx ? idx.count : pos.count;
      const groups = o.geometry.groups?.length ? o.geometry.groups : [{ start: 0, count: n, materialIndex: 0 }];
      const inst = o.isInstancedMesh ? o.count : 1, mI = new THREE.Matrix4();
      for (let ii = 0; ii < inst; ii++) {
        let e = E; if (o.isInstancedMesh) { o.getMatrixAt(ii, mI); mI.premultiply(o.matrixWorld); e = mI.elements; }
        for (const gr of groups) {
          const mat = mats[gr.materialIndex] || mats[0]; if (!mat || mat.visible === false || (mat.transparent && mat.opacity < 0.05)) continue;
          const rug = isRug(mat), id = ++sid;
          // (rugs of one weave share a material, and a merge may hold several: each rug is a cluster of triangles)
          const rugOf = (cx, cz) => { let q = rugs.find((r) => r.mat === mat && Math.hypot(r.x0 - cx, r.z0 - cz) < 1.3); if (!q) rugs.push(q = { id: ++sid, mat, x0: cx, z0: cz, y: 0, n: 0, x: 0, z: 0, name: mat.map.uuid.slice(0, 6) }); return q; };
          for (let t = gr.start; t < gr.start + gr.count; t += 3) {
            for (let k = 0; k < 3; k++) { const i = idx ? idx.getX(t + k) : t + k, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); v[k].x = e[0] * x + e[4] * y + e[8] * z + e[12]; v[k].y = e[1] * x + e[5] * y + e[9] * z + e[13]; v[k].z = e[2] * x + e[6] * y + e[10] * z + e[14]; }
            const ax = v[1].x - v[0].x, ay = v[1].y - v[0].y, az = v[1].z - v[0].z, bx = v[2].x - v[0].x, by = v[2].y - v[0].y, bz = v[2].z - v[0].z;
            const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz); if (l < 1e-9) continue;
            if (!(ny / l > 0.995 || (mat.side === THREE.DoubleSide && ny / l < -0.995))) continue;
            const y0 = (v[0].y + v[1].y + v[2].y) / 3; if (y0 > 0.3) continue;
            const tx = (v[0].x + v[1].x + v[2].x) / 3, tz = (v[0].z + v[1].z + v[2].z) / 3, rb = rug ? rugOf(tx, tz) : null, sId = rb ? rb.id : id;
            if (rb) { rb.y += y0; rb.n++; rb.x += tx; rb.z += tz; }
            const den = (v[1].z - v[2].z) * (v[0].x - v[2].x) + (v[2].x - v[1].x) * (v[0].z - v[2].z); if (Math.abs(den) < 1e-12) continue;
            const minx = Math.min(v[0].x, v[1].x, v[2].x), maxx = Math.max(v[0].x, v[1].x, v[2].x), minz = Math.min(v[0].z, v[1].z, v[2].z), maxz = Math.max(v[0].z, v[1].z, v[2].z);
            for (let cx = Math.ceil(minx / C); cx * C <= maxx; cx++) for (let cz = Math.ceil(minz / C); cz * C <= maxz; cz++) {
              const px = cx * C + 0.013, pz = cz * C + 0.017;
              const w0 = ((v[1].z - v[2].z) * (px - v[2].x) + (v[2].x - v[1].x) * (pz - v[2].z)) / den, w1 = ((v[2].z - v[0].z) * (px - v[2].x) + (v[0].x - v[2].x) * (pz - v[2].z)) / den;
              if (w0 < 1e-4 || w1 < 1e-4 || 1 - w0 - w1 < 1e-4) continue;
              const key = cx + ',' + cz; let L = grid.get(key); if (!L) grid.set(key, (L = []));
              L.push([y0, sId, rug]);
            }
          }
        }
      }
    });
    // fights: the top surface of a cell and the next one under it, two surfaces within 4 mm
    let fights = 0, rugFights = 0; const where = {};
    for (const [key, L] of grid) {
      if (L.length < 2) continue;
      L.sort((a, b) => b[0] - a[0]);
      const a = L[0], b = L.find((q) => q[1] !== a[1]);
      if (b && a[0] - b[0] < 0.004) { fights++; if (a[2] || b[2]) rugFights++; const k = `${a[1]}~${b[1]}@${a[0].toFixed(3)}`; where[k] = (where[k] || 0) + 1; }
    }
    // each rug: its height over the floor under it
    const lift = rugs.filter((q) => q.n).map((q) => {
      q.y /= q.n; q.x /= q.n; q.z /= q.n;
      let under = -Infinity;
      for (let dx = -0.2; dx <= 0.2; dx += 0.1) for (let dz = -0.2; dz <= 0.2; dz += 0.1) {
        const L = grid.get(Math.round((q.x + dx - 0.013) / 0.05) + ',' + Math.round((q.z + dz - 0.017) / 0.05)) || [];
        for (const e of L) if (e[1] !== q.id && e[0] <= q.y + 0.001) under = Math.max(under, e[0]);
      }
      return { rug: q.name + (q.n > 2 ? '×' + q.n : ''), at: [+(q.x - root.position.x).toFixed(2), +(q.z - root.position.z).toFixed(2)], over: +(q.y - under).toFixed(4) };
    });
    return { rugs: lift, fights, rugFights, worst: Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 6) };
  });
  check('P32 every rug in the house (seven, the bathroom\'s mat with them) lies at least 6 mm over the floor under it (none at the floor\'s own height)', r.rugs.length >= 7 && r.rugs.every((q) => q.over >= 0.006), r.rugs);
  checkVisual('P32 no rug fights a surface at its own height (cells of 5 cm where a rug and another surface are within 4 mm)', r.rugFights === 0, { rugFights: r.rugFights, fights: r.fights, worst: r.worst });
}

// ------------------------------------------------------------------ to chapter 1
await ev(() => {
  const G = game; T.talkAll(); G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
  if (G.room) G.exitRoom?.();
  G.flags.c1_home = true;
});

// ------------------------------------------------------------------ P33 / P34: the ferry comes in
if (on('ferry')) {
  // per 0.5 s of the ride: Vesk shown after the draw culling, in the frame, and the ferry not hiding him from the lens
  const sampleFn = () => ev(() => {
    const G = game, v = T.npc('vesk'), F = G.world.ferry, cam = G.renderer.camera;
    G.renderer.render();
    G.farCull.hide(); const drawn = v.rig.root.visible && v.present; G.farCull.restore();
    cam.updateMatrixWorld();
    const pts = [[0, 1.62, 0], [0, 1.3, 0], [0, 0.95, 0], [0.2, 1.4, 0], [-0.2, 1.4, 0]].map(([s, y]) => new THREE.Vector3(v.pos.x + Math.cos(v.angle) * s, v.pos.y + y, v.pos.z - Math.sin(v.angle) * s));
    const objs = []; F.group.traverse((o) => { if (o.isMesh && o.visible && !(o.material?.transparent && o.material.opacity < 0.5)) objs.push(o); });
    let clear = 0, inView = 0, head = false;
    const free = (p) => { const d = p.clone().sub(cam.position), L = d.length(); d.normalize(); return !new THREE.Raycaster(cam.position.clone(), d, 0, L - 0.05).intersectObjects(objs, false)[0]; };
    pts.forEach((p, i) => {
      const q = p.clone().project(cam); if (Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z < 1) inView++;
      if (free(p)) { clear++; if (i === 0) head = true; }
    });
    // (the same for where he rode before P33, the cabin's front corner: local 1.0, 1.05 — the before, measured alongside)
    let old = 0;
    if (G.cutscene && v.controlled) { F.group.updateMatrixWorld(true); const dy = v.pos.y - F.group.position.y; for (const y of [1.62, 1.3, 0.95]) if (free(F.group.localToWorld(new THREE.Vector3(1.0, dy + y, 1.05)))) old++; }
    const sub = document.getElementById('cine-sub');
    return { st: G.state, cut: !!G.cutscene, ride: !!v.controlled && v.pos.y > 1.2, drawn, inView, clear, head, old, sub: !!sub?.classList.contains('show'), subText: sub?.textContent || '', cam: [cam.position.x, cam.position.z] };
  });
  const run = async (skipAt) => {
    await ev(() => {
      const G = game, ch = G.story.cur; window.__lines = [];
      if (!ch.__chainHooked) { const orig = ch.chain.bind(ch); ch.chain = (lines, ...r) => { window.__lines.push(lines.map((l) => l[0] + ':' + l[1])); return orig(lines, ...r); }; ch.__chainHooked = true; }
    });
    const st = await ev(() => { const ps = game.world.pierStart; T.tp(ps.x + 6, ps.z + 2); for (let i = 0; i < 60 && game.state === 'play'; i++) game.step(1 / 60); return [game.state, !!game.story.cur.arriving]; });
    const rows = [];
    for (let k = 0; k < 40; k++) {
      // (the skip: E at `skipAt` s into the scene — it starts on the frame the loop above stopped at)
      if (skipAt != null) { await ev((t) => { const G = game; for (let i = 0; i < Math.round(t * 30); i++) G.step(1 / 30); G.input.taps.add('KeyE'); G.step(1 / 30); G.step(1 / 30); }, skipAt); rows.push(await sampleFn()); break; }
      if (k > 0) await ev(() => { for (let i = 0; i < 15 && game.cutscene; i++) game.step(1 / 30); });
      const s = await sampleFn(); s.t = k * 0.5; rows.push(s);
      if (!s.cut && k > 2) break;
    }
    const lines = await ev(() => window.__lines);
    return { st, rows, lines };
  };
  const A = await run(null);
  const ride = A.rows.filter((r) => r.cut);
  check('P33 the arrival plays (a cut-scene with the ferry coming in)', A.st[0] === 'cutscene' && A.st[1] && ride.length >= 14, { start: A.st, samples: ride.length });
  checkVisual('P33 Vesk is drawn at every sampled moment of the ride (after the draw culling)', ride.every((r) => r.drawn), ride.map((r) => r.drawn ? 1 : 0).join(''));
  // (a figure at the rail: his head clear of the ferry at every sample, and 2 of head, chest, hips, shoulders — the hull's
  //  side hides his hips from the pier's low shots, as it would anyone's. `old`: head, chest, hips clear at the old spot)
  const aboard = ride.filter((r) => r.ride);
  checkVisual('P33 Vesk stands in sight of the camera through the ride: in the frame, his head clear of the ferry\'s cabin, rails and mast at every sample aboard, and at least 2 of 5 body points',
    aboard.length >= 12 && aboard.every((r) => r.inView >= 3 && r.head && r.clear >= 2), { now: aboard.map((r) => `${r.t}:${r.inView}/${r.clear}${r.head ? 'h' : ''}`).join(' '), oldSpot: aboard.map((r) => `${r.t}:${r.old}/3`).join(' ') });
  const sub = (lo, hi) => ride.filter((r) => r.t >= lo && r.t <= hi);
  check('P34 the narrator\'s line is the subtitle while the ferry glides in (1.5–8 s) and has gone by the berth', sub(1.5, 8).every((r) => r.sub && /ferry/i.test(r.subText)) && ride.filter((r) => r.t >= 9).every((r) => !r.sub),
    ride.map((r) => `${r.t}:${r.sub ? 'S' : '-'}`).join(' '));
  check('P34 the camera\'s shots run: the sea shot, then the pier\'s (the lens moves by more than 5 m during the ride)', Math.hypot(ride[0].cam[0] - ride[ride.length - 1].cam[0], ride[0].cam[1] - ride[ride.length - 1].cam[1]) > 5, { first: ride[0].cam, last: ride[ride.length - 1].cam });
  const firstChain = A.lines.find((l) => l.some((x) => /c1_vesk_speech/.test(x)));
  check('P34 at the berth the speech is Vesk\'s, then Gilbert\'s (the narrator\'s line was the subtitle)', !!firstChain && firstChain[0] === 'vesk:c1_vesk_speech' && firstChain[1] === 'gilbert:c1_gil_speech', A.lines);
  await ev(() => T.talkAll());
  // again, skipped with E in its first second: the narrator's line is said in the chain, first
  await ev(() => { const G = game, f = G.flags, v = T.npc('vesk'); f.c1_arrived = false; G.story.cur.arriving = false; G.world.ferry.group.position.y = 0; v.controlled = false; G.step(0.1); });
  const B = await run(0.9);
  const chainB = B.lines.find((l) => l.some((x) => /c1_vesk_speech/.test(x)));
  check('P34 skipped in the first second, the narrator\'s line is said first in the chain, then Vesk, then Gilbert', !!chainB && chainB[0] === 'narrator:c1_arrive_1' && chainB[1] === 'vesk:c1_vesk_speech', { start: B.st, lines: B.lines });
  await ev(() => T.talkAll());
}

// ------------------------------------------------------------------ P36: the square's people
if (on('square')) {
  const wellAt = await ev(() => { const G = game, f = G.flags; f.c1_arrived = true; G.story.refreshCast(); const wl = G.world.well; T.tp(wl.x + 6, wl.z + 7, -2.4); return { x: wl.x, z: wl.z }; });
  // the pace: 40 s in the square, every resident simulated in full
  const pace = await ev(() => {
    const G = game, W = G.walkers, wl = G.world.well; W.force = 0;
    const s = [];
    for (let i = 0; i < 40 * 15; i++) {
      G.step(1 / 15);
      if (i % 3) continue;
      for (const r of W.res) if (r.present && !r.inside && r.st === 'walk' && r.rig.anim === 'walk' && r.gait > 0.3 && Math.hypot(r.pos.x - wl.x, r.pos.z - wl.z) < 45 && !small(r)) s.push([r.def.id, r.speed, r.gait, r.rig._cycHz || 0]);
    }
    W.force = null;
    // (grown-ups: a body of 1.35 m and more — LBA2's pelvis at 46 % of the height; a child or a short body steps quicker)
    function small(r) { return (r.rig.hipsRest || 0.6) * r.rig.root.scale.y / 0.46 < 1.35; }
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
    const cruise = s.filter((q) => q[2] > 0.85 * q[1]);   // (at its own pace, not easing round someone or into a stop)
    return { n: s.length, nCruise: cruise.length, who: [...new Set(s.map((q) => q[0]))], speedMed: +med(cruise.map((q) => q[2])).toFixed(2), speedMin: +Math.min(...cruise.map((q) => q[2])).toFixed(2),
      stepsMed: +med(cruise.map((q) => q[3] * 2)).toFixed(2), stepsMin: +Math.min(...cruise.map((q) => q[3] * 2)).toFixed(2), stepsMax: +Math.max(...cruise.map((q) => q[3] * 2)).toFixed(2),
      strideMed: +med(cruise.map((q) => q[2] / Math.max(q[3], 0.01))).toFixed(2), rounds: [...new Set(s.map((q) => q[0] + ':' + q[1].toFixed(2)))], small: W.res.filter((r) => small(r)).map((r) => r.def.id) };
  });
  check('P36 the square\'s grown-ups stroll at a person\'s pace: the median walking speed 1.1–1.4 m/s, none under 1.0', pace.nCruise >= 20 && pace.speedMed >= 1.1 && pace.speedMed <= 1.4 && pace.speedMin >= 1.0, pace);
  check('P36 their step matches their speed: 1.5–2.4 steps a second (a cycle of 0.9–1.6 m), so the feet are not in slow motion', pace.stepsMin >= 1.5 && pace.stepsMax <= 2.4 && pace.strideMed >= 0.9 && pace.strideMed <= 1.6, pace);
  // the water comes back, as the third valve brings it (Twinsen at the cliff's valve)
  const w = await ev(() => {
    const G = game, v = G.world.valves.find((q) => q.id === 'cliff') || G.world.valves[0];
    T.tp(v.x + 1.5, v.z + 1.5); T.steps(30);
    G.story.cur.waterReturns();
    const J = G.walkers?.play?.joy;
    // the shot of the square: the residents not stopped while it runs
    const moved0 = G.walkers.res.map((r) => [r, r.pos.x, r.pos.z]);
    for (let i = 0; i < 60 && G.state === 'cutscene'; i++) G.step(1 / 30);
    const movedInShot = moved0.filter(([r, x, z]) => Math.hypot(r.pos.x - x, r.pos.z - z) > 0.3).length;
    T.talkAll();
    return { who: J?.who.map((r) => r.def.id) || [], spots: J?.stops.map((s) => +Math.hypot(s.x - G.world.well.x, s.z - G.world.well.z).toFixed(2)) || [], movedInShot, flag: G.flags.c1_water };
  });
  check('P36 when the water comes back, a few of the square\'s people (2–4) are sent to the well, to places round it 2–3 m from its middle', w.flag && w.who.length >= 2 && w.who.length <= 4 && w.spots.every((d) => d >= 2 && d <= 3), w);
  check('P36 the square\'s people go on moving during the shot of the well (not frozen mid-stride)', w.movedInShot >= 1, w);
  // he comes to the square: they are there, glad of it, and say so; then back to their rounds
  const g2 = await ev(([wx, wz]) => {
    const G = game, P = G.walkers.play, J = P.joy, out = { at: 0, cheer: false, barks: [], t: [] };
    T.tp(wx + 6.5, wz + 5.5, -2.3);
    const t0 = G.time;
    for (let i = 0; i < 70 * 10 && !J.done; i++) {
      G.step(1 / 10);
      const here = J.who.filter((r) => J.stops.includes(r.stop) && r.st === 'dwell' && Math.hypot(r.pos.x - r.stop.x, r.pos.z - r.stop.z) < 0.8);
      out.at = Math.max(out.at, here.length);
      if (here.some((r) => r.rig.anim === 'cheer')) out.cheer = true;
      const b = document.querySelector('.townbark'); if (b && b.style.display !== 'none' && /water|well|warm|jug/i.test(b.textContent) && !out.barks.includes(b.textContent)) out.barks.push(b.textContent);
      if (!J.end && out.atT == null && out.at >= 2) out.atT = +(G.time - t0).toFixed(1);
    }
    out.done = !!J.done; out.endAfter = J.end ? +(J.end - t0).toFixed(1) : null; out.total = +(G.time - t0).toFixed(1);
    out.left = G.walkers.res.filter((r) => r.stops.some((s) => s._once)).map((r) => r.def.id);
    out.back = J.who.map((r) => [r.def.id, r.st, r.stop?.id]);
    out.objective = document.querySelector('#pause-objective')?.textContent || '';
    return out;
  }, [wellAt.x, wellAt.z]);
  check('P36 at least two of them gather round the well', g2.at >= 2, g2);
  check('P36 they cheer there, and say a glad word with Twinsen by (a line about the water)', g2.cheer && g2.barks.length >= 1 && g2.barks.every((b) => !/night|evening|tonight|sunset|dawn|dusk/i.test(b)), g2);
  check('P36 after a while they go back to their rounds; the gathering\'s stops are gone from every round', g2.done && g2.left.length === 0 && g2.back.every(([, , s]) => !/^joy_/.test(s || '')), g2);
}

// ------------------------------------------------------------------ P37 / P39: the pump room
if (on('pump')) {
  // (NO-AIR, as tests/campaign-hands.mjs: his right hand's gap to the nearest drawn surface as each act takes effect)
  await page.addScriptTag({ path: CONTACT });
  await ev(() => {
    const h = game.hero; window.GAPS = []; const act = h.act.bind(h);
    h.act = (anim, dur, cb, at, next) => act(anim, dur, cb && (() => { game.scene.updateMatrixWorld(true); const r = CT.handGap(h, 'R', CT.roots(), 0.6); window.GAPS.push({ anim, d: r.d == null ? 9 : +r.d.toFixed(3), on: r.name || '' }); return cb(); }), at, next);
  });
  await ev(() => {
    const G = game, f = G.flags; f.c1_arrived = true; f.c1_water = true; f.ct_v = 1; f.ct_dry = true; f.ct_worker = true; f.ct_diagram = true; f.ct_felt = true;
    G.enterRoom('pumproom', null, true); T.steps(20); T.talkAll(); G.updateObjective();
  });
  const obj = await ev(() => document.querySelector('#pause-objective')?.textContent || document.querySelector('#objective')?.textContent || '');
  check('P39 the objective names the place: behind the brick pier, the houses\' line', /brick pier/i.test(obj) && /houses/i.test(obj), obj);
  // the cocks seen from the room camera: at the use spot of each, and on the way to it
  const seen = await ev(() => {
    const G = game, R = G.room, U = R.pump, h = G.hero, out = {};
    const hit = (from, to) => {
      const objs = []; R.group.traverse((o) => { if (o.isMesh && o.visible && !(o.material?.transparent && o.material.opacity < 0.5)) objs.push(o); });
      h.rig.root.traverse((o) => { if (o.isMesh && o.visible) objs.push(o); });
      const d = new THREE.Vector3().subVectors(to, from), L = d.length(); d.normalize();
      const x = new THREE.Raycaster(from, d, 0, L + 0.5).intersectObjects(objs, false)[0];
      return !x || x.distance > L - 0.12;
    };
    for (const [nm, k, dx, dz] of [['upper', 'upper', 0, 0], ['lower', 'lower', 0, 0], ['approach', 'upper', -1.6, 1.4]]) {
      const c = U.cocks[k], p = c.front;
      h.pos.set(p.x + dx, G.physics.groundAt(p.x, p.z), p.z + dz); h.angle = c.a; h.vel?.set(0, 0); G.camRig.snap?.();
      T.steps(45); G.renderer.render();
      const cam = G.renderer.camera.position.clone();
      const pts = c.look ? c.look() : {};
      out[nm] = Object.fromEntries(Object.entries(pts).map(([l, q]) => [l, hit(cam, new THREE.Vector3(q.x, q.y, q.z))]));
      const it = G.findInteractable(); out[nm].prompt = it ? `${it.kind}:${it.which || ''}:${it.label}` : '';
    }
    return out;
  });
  // (his own hand and arm are at the wheel there: half of it is enough; on the way, nearly all of it)
  const clear = (o) => (o ? Object.entries(o).filter(([k, v]) => k !== 'prompt' && v === true).length : 0);
  const pts = (o) => (o ? Object.keys(o).filter((k) => k !== 'prompt').length : 0);
  checkVisual('P37 each cock\'s wheel is in sight of the room camera at its use spot (at least half of its hub and 8 rim points clear of the room and of Twinsen)', pts(seen.upper) >= 9 && clear(seen.upper) >= 5 && clear(seen.lower) >= 5,
    { upper: `${clear(seen.upper)}/${pts(seen.upper)}`, lower: `${clear(seen.lower)}/${pts(seen.lower)}`, seen });
  checkVisual('P37 on the way to the cocks (1.6 m west, 1.4 m out) the upper wheel is in sight (8 of its 9 points)', clear(seen.approach) >= 8, seen.approach);
  check('P39 each cock has its own prompt, naming its line', seen.upper.prompt === 'ct_cock:upper:p_cock_sq' && seen.lower.prompt === 'ct_cock:lower:p_cock_ho', { upper: seen.upper.prompt, lower: seen.lower.prompt });
  const labels = await ev(async () => { const { t } = await import('./src/game/i18n.js'); return [t('p_cock_sq'), t('p_cock_ho'), t('p_cock'), t('p_cock_co')].join(' | '); });
  check('P39 the prompts read as words, and chapter 11\'s "Turn" keeps a key of its own', /square/i.test(labels) && /houses/i.test(labels) && /\| Turn$/.test(labels), labels);
  // from between the two, facing each in turn selects it
  const face = await ev(() => {
    const G = game, U = G.room.pump, h = G.hero, a = U.cocks.upper, b = U.cocks.lower, m = { x: (a.wheel.x + b.wheel.x) / 2, z: (a.front.z + b.front.z) / 2 };
    const out = {};
    for (const k of ['upper', 'lower']) {
      const c = U.cocks[k]; h.pos.set(m.x, G.physics.groundAt(m.x, m.z), m.z); h.angle = Math.atan2(c.wheel.x - m.x, c.wheel.z - m.z); G.step(1 / 30);
      const it = G.findInteractable(); out[k] = it ? `${it.kind}:${it.which || ''}` : '';
    }
    return out;
  });
  check('P39 standing between the two, the one he faces is the one offered', face.upper === 'ct_cock:upper' && face.lower === 'ct_cock:lower', face);
  // the wrong one: it answers at once
  const wrong = await ev(() => {
    const G = game, U = G.room.pump, h = G.hero, c = U.cocks.upper, p = c.front;
    h.pos.set(p.x, G.physics.groundAt(p.x, p.z), p.z); h.angle = c.a; G.step(1 / 30);
    T.steps(10); T.talkAll();   // (his thought on first seeing the alcove, ct_bypass_see, said first)
    h.pos.set(p.x, G.physics.groundAt(p.x, p.z), p.z); h.angle = c.a; G.step(1 / 30);
    G.input.taps.add('KeyE'); G.step(1 / 30);
    let tOpen = null, tFeed = null; const t0 = G.time;
    for (let i = 0; i < 6 * 30; i++) {
      G.step(1 / 30);
      if (tOpen == null && c.open) tOpen = G.time;
      if (tOpen != null && tFeed == null && U.shaking('upper') && G.state === 'dialog') tFeed = G.time;
      if (tFeed != null && G.time - tFeed > 1.6) break;
    }
    const line = document.querySelector('#dialog .text')?.textContent || '';
    const r = { opened: tOpen != null, feedback: tFeed != null && tOpen != null ? +(tFeed - tOpen).toFixed(2) : null, wrong: G.flags.ct_wrong || 0, line };
    T.talkAll(); r.shutAgain = !c.open; r.bypass = !!G.flags.ct_bypass;
    return r;
  });
  check('P39 the square\'s cock, turned, answers within 0.5 s (the pipe shakes and the thought is up), springs back shut, and the step stays open', wrong.opened && wrong.feedback != null && wrong.feedback <= 0.5 && wrong.shutAgain && !wrong.bypass && wrong.wrong >= 1, wrong);
  const right = await ev(() => {
    const G = game, U = G.room.pump, h = G.hero, c = U.cocks.lower, p = c.front;
    T.steps(45); T.talkAll();   // (his hands done with the other wheel, Zoé's knock heard)
    h.pos.set(p.x, G.physics.groundAt(p.x, p.z), p.z); h.angle = c.a; G.step(1 / 30);
    const it = G.findInteractable(); G.input.taps.add('KeyE'); G.step(1 / 30);
    for (let i = 0; i < 8 * 30 && !G.flags.ct_bypass; i++) G.step(1 / 30);
    T.steps(90); T.talkAll(); T.steps(30); T.talkAll();
    return { it: it ? `${it.kind}:${it.which}` : '', bypass: !!G.flags.ct_bypass, open: c.open };
  });
  check('P39 the houses\' cock, turned, completes the step (the houses\' line open)', right.it === 'ct_cock:lower' && right.bypass && right.open, right);
  const gaps = await ev(() => window.GAPS);
  check('P39 his hand is on each wheel as it turns (within 5 cm of a drawn surface: no turning the air)', gaps.length >= 2 && gaps.every((q) => q.d <= 0.05), gaps);
}

done();
await browser.close();
