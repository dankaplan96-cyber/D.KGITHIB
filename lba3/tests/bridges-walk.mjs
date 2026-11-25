// BRIDGES (docs/lba-maturity/BRIDGES.md; the user, 25.11: "every bridge that looks walkable must be walkable on foot").
// A deck laid as separate planks (the islands' plank bridges: each of the original's slats its own collider) left gaps
// the one point under his middle read as the drop: he stopped at the first gap or fell through. physics.js bridgeTreads
// lays an unseen tread across each gap of a run of three or more planks, once, as each area is built (regions.js finish;
// Citadel in main.js). This suite, every region built (regions.ensure, a few build groups to a page, as gap-scan.mjs):
//   1. the sweep (physics only): every gap 3 cm–1.2 m between two floors he can stand on at about one height (≤ 0.55 m
//      apart) that are laid over something (a deck, a walk, a plank: a collider with its own underside, at most 0.6 m deep,
//      not a block or a crate solid to the ground), with a drop of 1 m or more under it. Two or more such gaps within 2.5 m of each other (a deck of planks
//      with holes) FAIL unless listed in KNOWN with the reason it is a real hole; single gaps are listed (two floors side
//      by side over a drop, not a deck). Every tread: both its ends on a plank at its height (it covers a gap between two
//      planks and nothing else); an end tread (over the lip of a bank that rises through an end plank): one end on the
//      plank, the other on the ground at its height.
//   2. each bridge with treads walked by input (Classic, Up held toward the far end, turned toward it as a player
//      steers): from its first plank to its last and back, never more than 0.6 m under the deck's lowest plank (no fall),
//      no life lost; SHOTS=dir: Twinsen stopped mid-span, the play camera (Follow), <scene>-<n>.png.
//   3. Mosquibee's honey islet (the bridge ends 3–5 m over the honey room's yard): from the east bank over the bridge
//      and down its new steps into the yard (P.go, by input), and back up and over, unhurt.
// BEFORE=1: the treads off (globalThis.__noTreads), for the A/B: the sweep's open decks and the walks that fail.
// ONLY=<region id substring>. SERVE=1 answers this checkout's files by request routing. Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const ONLY = process.env.ONLY || '', SHOTS = process.env.SHOTS || '', BEFORE = !!process.env.BEFORE;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const iso = (s) => console.log('ISO  ' + s);
// open decks that are real holes (none today): { scene, x, z, why }
const KNOWN = [];

const page0 = async (w = 960, h = 540) => {
  for (let i = 0; ; i++) {
    let b;
    try {
      b = await launch({ width: w, height: h });
      if (BEFORE) await b.context.addInitScript(() => { globalThis.__noTreads = 1; });
      await open(b.page, '?nocine'); await menu(b.page, 'new');
      await b.page.evaluate(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.hero.hasBall = true; });
      await b.page.evaluate(SCAN);
      return b;
    } catch (e) { await b?.browser.close().catch(() => {}); if (i >= 2) throw e; console.log(`  (a page did not boot: ${e.message.split('\n')[0]}; again)`); }
  }
};
// (in the page) the sweep, the treads' check, the bridges (tread sites) and the walk
const SCAN = () => {
  const G = game, Ph = G.physics, RG = G.regions;
  // (the area a point is in: a room within 60 m of its centre, else the nearest outdoor area — regions.sceneOf takes the
  //  first within 400 m, and the islands stand 330 m apart)
  const outs = [...RG.of.keys()].map((id) => ({ id, c: RG.centreOf(id) })).filter((o) => o.c?.outdoor);
  const sceneOf = (x, z) => { const r = RG.sceneOf(x, z); if (!RG.centreOf(r)?.outdoor && r !== 'citadel') return r; let best = 'citadel', bd = Math.hypot(x, z); for (const o of outs) { const d = Math.hypot(x - o.c.x, z - o.c.z); if (d < bd) { bd = d; best = o.id; } } return best; };
  const stand = (c) => c.enabled && !c.noStand && !c.block && c.top > -40;
  const laid = (c) => stand(c) && !c.stair && c.bottom > -40 && c.top - c.bottom <= 0.6;   // (a floor laid over something)
  window.__gaps = (want) => {
    const out = [], seen = new Set(), idx = new Map(); Ph.colliders.forEach((c, i) => idx.set(c, i));
    for (const c of Ph.colliders) {
      if (!laid(c) || c.tread) continue;
      const sc = sceneOf(c.x, c.z); if (!want.includes(sc)) continue;
      const cand = new Set();
      for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) for (const d of Ph.near(c.x + a * (c.bound + 0.8), c.z + b * (c.bound + 0.8))) cand.add(d);
      for (const d of cand) {
        if (d === c || d.tread || !laid(d) || Math.abs(c.top - d.top) > 0.55) continue;
        const k = Math.min(idx.get(c), idx.get(d)) + ':' + Math.max(idx.get(c), idx.get(d)); if (seen.has(k)) continue; seen.add(k);
        const L = Math.hypot(d.x - c.x, d.z - c.z); if (L < 0.05 || L > c.bound + d.bound + 1.2) continue;
        const ux = (d.x - c.x) / L, uz = (d.z - c.z) / L;
        let t0 = null, t1 = null;
        for (let t = 0; t <= L; t += 0.02) { const x = c.x + ux * t, z = c.z + uz * t; if (t0 == null && !Ph._inside(c, x, z)) t0 = t; if (t0 != null && Ph._inside(d, x, z)) { t1 = t; break; } }
        if (t0 == null || t1 == null) continue;
        const gap = t1 - t0; if (gap < 0.03 || gap > 1.2) continue;
        const tm = (t0 + t1) / 2, mx = c.x + ux * tm, mz = c.z + uz * tm, lo = Math.min(c.top, d.top), hi = Math.max(c.top, d.top);
        const g = Ph.groundAt(mx, mz, hi + 0.05);
        if (g >= lo - 1.0) continue;
        const desc = (q) => q.type === 'cyl' ? 'cyl r' + q.r.toFixed(2) : 'box ' + (2 * q.hw).toFixed(2) + 'x' + (2 * q.hd).toFixed(2);
        out.push({ scene: sc, x: +mx.toFixed(2), z: +mz.toFixed(2), gap: +gap.toFixed(2), top: +lo.toFixed(2), under: +g.toFixed(2), what: desc(c) + ' | ' + desc(d) });
      }
    }
    let sites = [];
    for (const p of out) {
      const hit = sites.filter((q) => q.scene === p.scene && q.gaps.some((r) => Math.hypot(r.x - p.x, r.z - p.z) < 2.5 && Math.abs(r.top - p.top) < 1.5));
      sites = sites.filter((q) => !hit.includes(q)); sites.push({ scene: p.scene, gaps: [p, ...hit.flatMap((q) => q.gaps)] });
    }
    return sites.map((s) => ({ scene: s.scene, n: s.gaps.length, x: +(s.gaps.reduce((a, p) => a + p.x, 0) / s.gaps.length).toFixed(1), z: +(s.gaps.reduce((a, p) => a + p.z, 0) / s.gaps.length).toFixed(1), top: Math.min(...s.gaps.map((p) => p.top)), gaps: s.gaps }));
  };
  // the bridges: the treads in each area, a site per run (treads within 2.5 m); its axis, its two end planks
  window.__bridges = (want) => {
    const tr = Ph.colliders.filter((c) => c.tread && want.includes(sceneOf(c.x, c.z)));
    // (each tread's two ends on a plank at its height)
    // (an end tread, over a bank's lip: one end on the plank, the other on the ground at its height)
    const onPlank = (c, x, z) => Ph.near(x, z).some((q) => q !== c && !q.tread && stand(q) && Math.abs(q.top - c.top) <= 0.3 && Ph._inside(q, x, z));
    const lone = tr.filter((c) => { const ux = Math.sin(c.rot), uz = Math.cos(c.rot), e = [-1, 1].map((s) => [c.x + ux * s * (c.hd - 0.02), c.z + uz * s * (c.hd - 0.02)]);
      if (c.tread === 'end') return !(e.some(([x, z]) => onPlank(c, x, z)) && e.some(([x, z]) => Math.abs(Ph.terrain.heightAt(x, z) - c.top) <= 0.15));
      return !e.every(([x, z]) => onPlank(c, x, z)); }).map((c) => [+c.x.toFixed(2), +c.z.toFixed(2), c.tread]);
    let sites = [];
    for (const c of tr) {
      const hit = sites.filter((q) => q.scene === sceneOf(c.x, c.z) && q.t.some((d) => Math.hypot(d.x - c.x, d.z - c.z) < 2.5 && Math.abs(d.top - c.top) < 1.5));
      const s = { scene: sceneOf(c.x, c.z), t: [c, ...hit.flatMap((q) => q.t)] };   // (a tread joining two runs merges them)
      sites = sites.filter((q) => !hit.includes(q)); sites.push(s);
    }
    const out = sites.map((s) => {
      const c0 = s.t[0], ux = Math.sin(c0.rot), uz = Math.cos(c0.rot);
      const al = s.t.map((c) => c.x * ux + c.z * uz), ac = s.t.reduce((a, c) => a + (-c.x * uz + c.z * ux), 0) / s.t.length;
      const a0 = Math.min(...al) - 0.65, a1 = Math.max(...al) + 0.65;
      const pt = (a) => ({ x: +(ux * a - uz * ac).toFixed(2), z: +(uz * a + ux * ac).toFixed(2) });
      return { scene: s.scene, treads: s.t.length, planks: s.t.length + 1, len: +(a1 - a0).toFixed(1), top: [+Math.min(...s.t.map((c) => c.top)).toFixed(2), +Math.max(...s.t.map((c) => c.top)).toFixed(2)], a: pt(a0), b: pt(a1) };
    });
    return { lone, bridges: out };
  };
  // walk by input from a to b (Classic: turned toward b, Up held), the lowest height and life lost on the way; `mid`: stop
  // halfway (for the picture)
  window.__walk = (a, b, lowTop, mid = false) => {
    const h = G.hero, hp0 = h.hp, L0 = Math.hypot(b.x - a.x, b.z - a.z);
    let minY = 99, t = 0;
    for (; t < 40; t += 1 / 30) {
      const d = Math.hypot(b.x - h.pos.x, b.z - h.pos.z);
      if (d < 0.4 || (mid && d < L0 / 2)) break;
      P.face(b.x, b.z, 0.05); P.holdFor(['ArrowUp'], 1 / 30);
      minY = Math.min(minY, h.pos.y);
      if (h.pos.y < lowTop - 0.6 || G.state !== 'play') break;
    }
    P.release();
    return { left: +Math.hypot(b.x - h.pos.x, b.z - h.pos.z).toFixed(2), minY: +minY.toFixed(2), fell: minY < lowTop - 0.6, hurt: hp0 - h.hp, t: +t.toFixed(1), at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) };
  };
  window.__tp = (x, z, y) => { const h = G.hero; h.pos.set(x, Ph.groundAt(x, z, y), z); h.onGround = true; h.vy = 0; h.vel?.set(0, 0); G.camRig.snap?.(); G.step(0.2); P.settle(); };
};

let groups;
{ const b = await page0(); groups = await b.page.evaluate(() => [...game.regions.groups.values()].map((g) => ({ id: g.id, rooms: [...g.rooms] }))); await b.browser.close(); }
const BATCH = +(process.env.BATCH || 8), batches = [];
for (let i = 0; i < groups.length; i += BATCH) batches.push(groups.slice(i, i + BATCH));
iso(`every region built by regions.ensure (${groups.length} build groups, ${batches.length} pages)${BEFORE ? '; BEFORE: the treads off' : ''}`);
const allOpen = [], allSingle = [], allBridges = [], lone = [], walks = [];
let regions = 0;
for (const [bi, B] of batches.entries()) {
  const want = [...(bi === 0 ? ['citadel'] : []), ...B.flatMap((g) => g.rooms)].filter((id) => !ONLY || id.includes(ONLY));
  if (!want.length) continue;
  regions += want.length;
  const { browser, page } = await page0(1280, 720);
  const ev = (f, a) => page.evaluate(f, a);
  await ev((want) => { for (const id of want) if (id !== 'citadel') game.regions.ensure(id, 'bridges'); }, want);
  const sites = await ev((want) => window.__gaps(want), want);
  for (const s of sites) (s.n >= 2 ? allOpen : allSingle).push(s);
  const br = await ev((want) => window.__bridges(want), want);
  lone.push(...br.lone);
  console.log(`page ${bi + 1}/${batches.length}: ${want.length} regions; bridges ${br.bridges.length}; open decks ${sites.filter((s) => s.n >= 2).length}; single gaps ${sites.filter((s) => s.n < 2).length}`);
  // 2. each bridge walked
  for (const [k, bg] of br.bridges.entries()) {
    allBridges.push(bg);
    const r = await ev(({ bg }) => {
      const G = game, id = bg.scene;
      if ((G.room?.id ?? 'citadel') !== id) { if (id === 'citadel') G.exitRoom?.(); else G.enterRoom(id, null, true); P.settle(); }
      for (const e of G.enemies || []) if (e.present) e.present = false;   // (enemies stood down, the doors held off: only the walk)
      G.doorCool = 1e6;
      const lo = bg.top[0];
      __tp(bg.a.x, bg.a.z, bg.top[1] + 0.3);
      const y0 = G.hero.pos.y;
      const there = __walk(bg.a, bg.b, lo);
      const back = __walk(bg.b, bg.a, lo);
      __tp(bg.a.x, bg.a.z, bg.top[1] + 0.3);
      const mid = __walk(bg.a, bg.b, lo, true);
      G.renderer.render();
      return { y0: +y0.toFixed(2), there, back, mid };
    }, { bg });
    const name = `${bg.scene}-${k + 1}`;
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), timeout: 600000 });
    walks.push({ name, bg, r });
    check(`walk: ${name} (${bg.planks} planks, ${bg.len} m, deck ${bg.top.join('–')} m) from its first plank to its last and back by input: no fall, no life lost`,
      r.there.left < 0.6 && r.back.left < 0.6 && !r.there.fell && !r.back.fell && r.there.hurt <= 0 && r.back.hurt <= 0 && Math.abs(r.y0 - bg.top[1]) < 0.6, { a: bg.a, b: bg.b, ...r });
  }
  // 3. Mosquibee's honey islet: bank → bridge → steps → yard and back
  if (want.includes('isle_mosquibee')) {
    const r = await ev(() => {
      const G = game, h = G.hero; G.enterRoom('isle_mosquibee', null, true); P.settle(); for (const e of G.enemies || []) if (e.present) e.present = false; G.doorCool = 1e6;
      __tp(2572.0, 1828.3, 12); const hp0 = h.hp, bank = h.pos.y;
      let minY = 99; const watch = () => { minY = Math.min(minY, h.pos.y); return false; };
      // (his line on first reaching the islet opens a talk: read, then on, as a player does)
      const go = (x, z, o) => { let r; for (let k = 0; k < 4; k++) { r = P.go(x, z, o); if (!/^state:/.test(r.r)) break; P.settle(); } return r; };
      const there = go(2547.5, 1823.0, { tol: 0.6, maxT: 90, stopWhen: watch }); const yard = h.pos.y;
      const back = go(2572.0, 1828.3, { tol: 0.6, maxT: 90 });
      return { bank: +bank.toFixed(2), there: there.r, yard: +yard.toFixed(2), back: back.r, end: +h.pos.y.toFixed(2), hurt: hp0 - h.hp, minY: +minY.toFixed(2) };
    });
    check('Mosquibee: from the east bank over the plank bridge and down its steps into the honey room\'s yard (INPUT), and back: unhurt', r.there === 'arrived' && r.back === 'arrived' && r.hurt <= 0 && r.yard < 7 && Math.abs(r.end - r.bank) < 0.6, r);
    if (SHOTS) { await ev(() => { const G = game; __tp(2551.49, 1824.6, 12); G.hero.angle = 0; G.step(0.3); P.settle(); G.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, 'isle_mosquibee-steps.png'), timeout: 600000 }); }
  }
  await browser.close();
}
console.log('--- the bridges (tread sites) ---');
for (const b of allBridges) console.log(`  ${b.scene}: ${b.planks} planks, ${b.len} m, deck ${b.top.join('–')} m, ${b.a.x},${b.a.z} → ${b.b.x},${b.b.z}`);
console.log('--- single gaps over a drop (two floors side by side; listed, not decks) ---');
for (const s of allSingle) console.log(`  ${s.scene} @${s.x},${s.z} top ${s.top}: ${s.gaps.map((g) => g.gap + ' m (' + g.what + ', under ' + g.under + ')').join('; ')}`);
const openDecks = allOpen.filter((s) => !KNOWN.some((k) => k.scene === s.scene && Math.hypot(k.x - s.x, k.z - s.z) < 3));
for (const s of allOpen) console.log(`  OPEN DECK ${s.scene} @${s.x},${s.z} top ${s.top}, ${s.n} gaps: ${s.gaps.map((g) => g.gap + ' m (' + g.what + ', under ' + g.under + ')').join('; ')}`);
check(`the sweep (${regions} regions): no deck of planks left with holes (two or more gaps over a drop within 2.5 m)${BEFORE ? ' [BEFORE]' : ''}`, openDecks.length === 0, openDecks.map((s) => `${s.scene} @${s.x},${s.z} ${s.n} gaps`));
check('every tread covers a gap between two planks at its height (both ends on a plank), or an end plank\'s bank lip (one end on it, one on the ground)', lone.length === 0, lone);
check('at least one bridge found (the sweep ran)', allBridges.length > 0 || BEFORE, allBridges.length);
done();
