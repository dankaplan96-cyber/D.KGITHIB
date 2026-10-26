import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
// node audit.mjs  — HOUSE-FIX collision/navigation audit of the house and the cellar (GAME_URL)
// 1) every story/giver/exit spot: free of colliders (r 0.3) and reachable on foot from the spawn (grid flood fill)
// 2) furniture colliders that overlap each other
const URL0 = process.env.GAME_URL || 'http://localhost:8186/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
const ev = (f, a) => page.evaluate(f, a);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await ev(() => localStorage.clear());
await page.click('[data-act="new"]', { timeout: 180000 });
await ev(() => { const G = window.game; G.testFreeze = true; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.5); });
for (const room of ['house', 'cellar']) {
  const out = await ev((room) => {
    const G = game; G.enterRoom(room, null, true); G.step(0.3);
    const R = G.room, P = G.physics, cx = R.center.x, cz = R.center.z, r = 0.3;
    const spots = [];
    const add = (name, p, need = 0) => p && Number.isFinite(p.x) && spots.push({ name, x: p.x, z: p.z, need });
    add('spawn', R.spawn);
    for (const [k, v] of Object.entries(R.entries || {})) add('entry:' + k, v);
    for (const e of R.exits) add('exit:' + (e.room || e.to), e, e.r);
    for (const [k, v] of Object.entries(R.npcSpots || {})) add('npc:' + k, v);
    for (const [k, v] of Object.entries(R.life || {})) if (v && typeof v === 'object' && 'x' in v) add('life:' + k, v);
    for (const s of R.searches) add('search:' + s.id, s, s.r);
    for (const g of R.givers) add('giver:' + g.id, g, g.r);
    if (room === 'house') {
      // the opening's marks (src/game/story/opening.js) and Zoé's walk out
      const hx = (x, z) => ({ x: cx + x, z: cz + z });
      for (const [n, x, z] of [['op:twSpot', -0.45, -0.25], ['op:zoTray', -1.78, -2.6], ['op:zoSink', -2.42, -2.55], ['op:twEnd', 1.55, -1.75], ['op:walk1', 1.15, -1.2], ['op:walk2', 1.25, 2.6], ['op:walk3', 1.2, 6.5]]) add(n, hx(x, z));
    }
    // flood fill from the spawn over a 0.1 m grid
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const c of R.colliders) if (c.seeThrough && c.bottom === -1) { x0 = Math.min(x0, c.x - c.hw); x1 = Math.max(x1, c.x + c.hw); z0 = Math.min(z0, c.z - c.hd); z1 = Math.max(z1, c.z + c.hd); }
    const st = 0.1, NX = Math.ceil((x1 - x0) / st), NZ = Math.ceil((z1 - z0) / st);
    const free = (i, j) => { const x = x0 + (i + 0.5) * st, z = z0 + (j + 0.5) * st; const y = P.groundAt(x, z, 0.2); return y > -0.5 && !P.blockedAt(x, z, y, r); };
    const seen = new Uint8Array(NX * NZ);
    const si = Math.floor((R.spawn.x - x0) / st), sj = Math.floor((R.spawn.z - z0) / st);
    const q = [[si, sj]]; seen[si + sj * NX] = 1; let n = 0;
    while (q.length) { const [i, j] = q.pop(); n++; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ || seen[a + b * NX]) continue; seen[a + b * NX] = 2; if (free(a, b)) { seen[a + b * NX] = 1; q.push([a, b]); } } }
    const near = (s) => { let best = 9; const rad = Math.ceil(2.0 / st), ci = Math.floor((s.x - x0) / st), cj = Math.floor((s.z - z0) / st); for (let a = ci - rad; a <= ci + rad; a++) for (let b = cj - rad; b <= cj + rad; b++) { if (a < 0 || b < 0 || a >= NX || b >= NZ || seen[a + b * NX] !== 1) continue; best = Math.min(best, Math.hypot(x0 + (a + 0.5) * st - s.x, z0 + (b + 0.5) * st - s.z)); } return best; };
    const rows = spots.map((s) => ({ name: s.name, at: [+(s.x - cx).toFixed(2), +(s.z - cz).toFixed(2)], blocked: P.blockedAt(s.x, s.z, P.groundAt(s.x, s.z, 0.2), 0.25), walk: +near(s).toFixed(2), need: s.need }));
    // furniture colliders overlapping (boxes as their rotated corners' AABBs, cylinders as circles' AABBs)
    const furn = R.colliders.filter((c) => !(c.seeThrough && c.bottom === -1) && !c.stair && c.top < 2.6 && !(c.hw > 3 || c.hd > 3));
    const bb = (c) => { if (c.type === 'cyl') return [c.x - c.r, c.x + c.r, c.z - c.r, c.z + c.r]; const ex = Math.abs(c.hw * c.cos) + Math.abs(c.hd * c.sin), ez = Math.abs(c.hw * c.sin) + Math.abs(c.hd * c.cos); return [c.x - ex, c.x + ex, c.z - ez, c.z + ez]; };
    const overl = [];
    for (let a = 0; a < furn.length; a++) for (let b = a + 1; b < furn.length; b++) {
      const A = bb(furn[a]), B = bb(furn[b]); const ox = Math.min(A[1], B[1]) - Math.max(A[0], B[0]), oz = Math.min(A[3], B[3]) - Math.max(A[2], B[2]);
      if (ox > 0.06 && oz > 0.06) overl.push([[+(furn[a].x - cx).toFixed(2), +(furn[a].z - cz).toFixed(2), +furn[a].top.toFixed(2)], [+(furn[b].x - cx).toFixed(2), +(furn[b].z - cz).toFixed(2), +furn[b].top.toFixed(2)], +ox.toFixed(2), +oz.toFixed(2)]);
    }
    return { room, reachable_m2: +(n * st * st).toFixed(1), spots: rows, overlaps: overl };
  }, room);
  console.log(`=== ${out.room}: reachable floor ${out.reachable_m2} m²`);
  for (const s of out.spots) console.log(`${s.blocked ? 'BLOCKED ' : ''}${s.walk > Math.max(0.35, s.need || 0) ? 'FAR ' : ''}${s.name} at ${s.at} walk-dist ${s.walk}${s.need ? ' (r ' + s.need + ')' : ''}`);
  for (const o of out.overlaps) console.log('overlap', JSON.stringify(o));
}
await browser.close();
