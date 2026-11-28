// GATE-FIX probe: chapter 10's lamp room. Jump to chapter 10 (flags, as tests/chapter10.mjs), enter lighttop with
// Zoé's ask done, print an occupancy map and a flood fill from the stair top with the people as circles.
// usage: GAME_URL=... node probe-lt.mjs <snapdir> [spotsJSON]
const snap = process.argv[2];
const { launch, open, menu } = await import(snap + '/lba3/tests/lib/boot.mjs');
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
if (process.env.CANDS) await page.evaluate((c) => { window.__cands = c; }, JSON.parse(process.env.CANDS));
const out = await page.evaluate((spots) => {
  const G = game, T = { talkAll() { for (let i = 0; i < 200 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); } };
  T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 8, chapterKey: 'council', c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
    c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_zoeDone: true, c9_started: true, c9_vote: true });
  G.hero.hasBall = true; G.story.nextChapter(); G.step(0.5); T.talkAll();
  Object.assign(G.flags, { c10_okuAsk: true, c10_millBraked: true, c10_mill: true, c10_miraAsk: true, c10_valveSet: true, c10_valves: true });
  G.enterRoom('lighttop', null, true); for (let i = 0; i < 30; i++) G.step(0.1); T.talkAll();
  const L = G.rooms.lighttop, PH = G.physics, h = G.hero;
  if (spots) { const cur = G.story.cur, orig = cur.place.bind(cur); cur.place = (id) => spots[id] ? { ...spots[id] } : orig(id); G.story.refreshCast(); G.step(0.2); }
  const npc = (id) => G.npcs.find((n) => n.def.id === id);
  const Z = npc('zoe'), A = npc('arthur');
  const res = { room: G.room?.id, hero: [h.pos.x, h.pos.z], zoe: [Z.present, Z.pos.x, Z.pos.z, Z.bodyR, Z.angle], arthur: [A.present, A.pos.x, A.pos.z, A.bodyR, A.angle], spawn: L.spawn, exits: L.exits,
    dials: L.searches.filter((s) => /^dial/.test(s.id)).map((s) => [s.id, s.x, s.z, s.r]), mic: L.searches.find((s) => s.id === 'mic'), npcSpots: L.npcSpots, center: [L.group.position.x, L.group.position.z],
    relay: G.story.cur.relays?.light ? [G.story.cur.relays.light.position.x + L.group.position.x, G.story.cur.relays.light.position.z + L.group.position.z] : null };
  const people = [Z, A].filter((n) => n.present).map((n) => ({ x: n.pos.x, z: n.pos.z, r: n.bodyR + h.radius }));
  const cx = L.group.position.x, cz = L.group.position.z, S = 0.1, N = 66;
  const free = (x, z, ppl) => !PH.blockedAt(x, z, 0, h.radius) && !ppl.some((p) => Math.hypot(x - p.x, z - p.z) < p.r);
  const grid = (ppl) => { const g = []; for (let j = 0; j <= N; j++) { const row = []; for (let i = 0; i <= N; i++) { const x = cx - 3.3 + i * S, z = cz - 3.3 + j * S; row.push(Math.hypot(x - cx, z - cz) > 3.05 ? 0 : free(x, z, ppl) ? 1 : 0); } g.push(row); } return g; };
  const flood = (g, sx, sz) => { const seen = g.map((r) => r.map(() => 0)); const i0 = Math.round((sx - cx + 3.3) / S), j0 = Math.round((sz - cz + 3.3) / S); const q = [[i0, j0]]; if (!g[j0]?.[i0]) return seen; seen[j0][i0] = 1; while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (g[b]?.[a] && !seen[b][a]) { seen[b][a] = 1; q.push([a, b]); } } } return seen; };
  const reachDial = (seen) => res.dials.map(([id, x, z, r]) => { let best = 9; for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) if (seen[j][i]) { const d = Math.hypot(cx - 3.3 + i * S - x, cz - 3.3 + j * S - z); if (d < best) best = d; } return [id, +best.toFixed(2)]; });
  const g1 = grid(people), s1 = flood(g1, L.spawn.x, L.spawn.z);
  const g0 = grid([]), s0 = flood(g0, L.spawn.x, L.spawn.z);
  res.reachWith = reachDial(s1); res.reachWithout = reachDial(s0);
  // candidate configurations: [{ name, zoe: [deg, r], arthur: [deg, r] }] (degrees as interiors.js pol: 0 = +z, 90 = +x)
  if (window.__cands) {
    const d2 = res.dials[1];
    const los = (x, z) => { const dx = d2[1] - x, dz = d2[2] - z, t = Math.max(0, Math.min(1, -((x - cx) * dx + (z - cz) * dz) / (dx * dx + dz * dz))); return +Math.hypot(x + dx * t - cx, z + dz * t - cz).toFixed(2); };
    res.cands = window.__cands.map((c) => {
      const pt = ([deg, r]) => ({ x: cx + Math.sin(deg * Math.PI / 180) * r, z: cz + Math.cos(deg * Math.PI / 180) * r });
      const zp = pt(c.zoe), ap = pt(c.arthur);
      const o = { name: c.name };
      for (const m of [0, 0.1, 0.2]) {
        const ppl = [zp, ap].map((p) => ({ ...p, r: 0.45 + h.radius + m }));
        const fr = (x, z) => !PH.blockedAt(x, z, 0, h.radius + m) && !ppl.some((p) => Math.hypot(x - p.x, z - p.z) < p.r);
        const g = []; for (let j = 0; j <= N; j++) { const row = []; for (let i = 0; i <= N; i++) { const x = cx - 3.3 + i * S, z = cz - 3.3 + j * S; row.push(Math.hypot(x - cx, z - cz) > 3.05 ? 0 : fr(x, z) ? 1 : 0); } g.push(row); }
        const sn = flood(g, L.spawn.x, L.spawn.z);
        o['m' + m] = reachDial(sn).map((x) => x[1]);
        const back = flood(g, d2[1], d2[2] + 0.25); const ei = Math.round((L.exits[0].x - cx + 3.3) / S), ej = Math.round((L.exits[0].z + 0.3 - cz + 3.3) / S);
        o['back' + m] = !!back[ej]?.[ei];
      }
      o.fit = [!PH.blockedAt(zp.x, zp.z, 0, 0.45), !PH.blockedAt(ap.x, ap.z, 0, 0.45)];
      o.apart = +Math.hypot(zp.x - ap.x, zp.z - ap.z).toFixed(2);
      o.spawnClear = [+Math.hypot(zp.x - L.spawn.x, zp.z - L.spawn.z).toFixed(2), +Math.hypot(ap.x - L.spawn.x, ap.z - L.spawn.z).toFixed(2)];
      o.losToDial2 = [los(zp.x, zp.z), los(ap.x, ap.z)];
      return o;
    });
  }
  // the map: '#' brick, ' ' outside, '.' reachable from the stairs, ':' free but not reachable, 'o' person circle, digits dials
  const lines = [];
  for (let j = 0; j <= N; j++) { let s = ''; for (let i = 0; i <= N; i++) { const x = cx - 3.3 + i * S, z = cz - 3.3 + j * S; let c = Math.hypot(x - cx, z - cz) > 3.05 ? ' ' : PH.blockedAt(x, z, 0, h.radius) ? '#' : people.some((p) => Math.hypot(x - p.x, z - p.z) < p.r) ? 'o' : s1[j][i] ? '.' : ':';
    for (const [id, dx, dz] of res.dials) if (Math.abs(dx - x) < S / 2 && Math.abs(dz - z) < S / 2) c = id.slice(-1);
    for (const [n, k] of [[Z, 'Z'], [A, 'A']]) if (n.present && Math.abs(n.pos.x - x) < S / 2 && Math.abs(n.pos.z - z) < S / 2) c = k;
    if (Math.abs(L.spawn.x - x) < S / 2 && Math.abs(L.spawn.z - z) < S / 2) c = 'S';
    if (res.relay && Math.abs(res.relay[0] - x) < S / 2 && Math.abs(res.relay[1] - z) < S / 2) c = 'R';
    s += c; } lines.push(s); }
  res.map = lines;
  // where a person's body (r 0.45) fits: 'p' fits and is off the hero's reachable cells (no people), '*' fits on them
  const pl = [];
  for (let j = 0; j <= N; j++) { let s = ''; for (let i = 0; i <= N; i++) { const x = cx - 3.3 + i * S, z = cz - 3.3 + j * S; const fit = Math.hypot(x - cx, z - cz) < 2.6 && !PH.blockedAt(x, z, 0, 0.45);
    s += Math.hypot(x - cx, z - cz) > 3.05 ? ' ' : !fit ? '#' : s0[j][i] ? '*' : 'p'; } pl.push(s); }
  res.pmap = pl;
  // from the cabinet's front (dial2) back to the stair top with the people as they stand
  const s2 = flood(g1, res.dials[1][1], res.dials[1][2] + 0.25); const ei = Math.round((L.spawn.x - cx + 3.3) / S), ej = Math.round((L.spawn.z - cz + 3.3) / S); res.backToStairs = !!s2[ej]?.[ei];
  // brick-free for a body at each person's spot (a person standing in furniture)
  res.zoeClear = !PH.blockedAt(Z.pos.x, Z.pos.z, 0, Z.bodyR); res.arthurClear = !PH.blockedAt(A.pos.x, A.pos.z, 0, A.bodyR);
  return res;
}, process.argv[3] ? JSON.parse(process.argv[3]) : null);
const { map, pmap, ...rest } = out;
console.log(JSON.stringify(rest, null, 0));
console.log('x → (west to east), z ↓ (north to south): rows are z from -3.3 to +3.3');
console.log(map.map((l, j) => String(j).padStart(2) + ' ' + l).join('\n'));
console.log('--- person fit (r 0.45): p fits off the hero-reachable cells, * fits on them');
console.log(pmap.map((l, j) => String(j).padStart(2) + ' ' + l).join('\n'));
if (process.env.SHOTS) {
  // (for looking only, kept out of the repository: the arrival, and the hero at the middle dial)
  await page.evaluate(() => { game.renderer.render(); });
  await page.screenshot({ path: process.env.SHOTS + '-arrive.png' });
  await page.evaluate(() => { const G = game, L = G.rooms.lighttop, s = L.searches.find((x) => x.id === 'dial2'), h = G.hero; h.pos.set(s.x, 0, s.z + 0.1); h.angle = Math.PI; G.story.cur.lightRelay?.('light'); for (let i = 0; i < 20; i++) G.step(0.1); G.renderer.render(); });
  await page.screenshot({ path: process.env.SHOTS + '-dial.png' });
}
await browser.close();
