// GAP-SCAN (release audit v75, after F-1): the Zeelich depot's trap was a slot narrower than Twinsen (0.8 m, radius 0.4)
// between two blocking colliders, where physics.move's two pushes, one from each side, wedge him. Every region is
// scanned for such slots, and each one found is walked into by input to see whether he can get stuck there.
//   1. the scan (physics only, every region built: Citadel, the outdoor areas, the islands, the underground, every
//      interior): at every floor level a spot by two things that stop him — the band 0.2–0.38 m outside each
//      collider's edge, every 0.05 m along it — where he can stand (on that floor, clear of everything at his centre)
//      and two of them reach into him from opposite sides (pushes more than 143° apart, each 0.02–0.2 m: a gap of
//      0.4–0.76 m; depot-corner.mjs check 1's rule). The spots in one square metre are one slot.
//   2. each slot walked into by input (Classic, Up held 2.5 s from 3 m off (or nearer): along it from both ends, across it from
//      both sides, where a start is clear): where he ends in it (touching two things, or 3 cm into one), the ways out — Up after facing each of 8 headings (0.8 s), Down (0.8 s).
//      Where the simulation below held him (walking or running in), he is also placed on that spot and the ways out tried by input ('end 0').
//      Stuck: no heading moves him 0.5 m and Down does not move him 0.3 m. No slot anywhere may hold him so.
//      First every slot's ways in are played through physics.move itself (walking and running, the 8 headings out);
//      by input (G.step, the keys) every slot that held him there, a quarter of those he ended in and every
//      20th other one (the walks by input take minutes a hundred; the simulation is his collision as the game runs it).
// ISO (logged): every region built (regions.ensure, a few build groups to a page: BATCH=8); Twinsen placed at each start (the slot's own scene entered first,
// enterRoom / exitRoom); enemies stood down and the doors held off (doorCool) while he walks, so no fight or scene change
// is mixed into it. OUT=<file.json>: every slot and walk. ONLY=<region id substring>. GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const ONLY = process.env.ONLY || '', OUT = process.env.OUT || '';
const iso = (s) => console.log('ISO  ' + s);
const errs = [];
// the regions' build groups, a few to a page (every region built in one page ran the machine out of memory): Citadel
// with the first
// (a page that does not boot — the machine is shared, a browser has died under another's load — is tried again, twice)
const page0 = async () => {
  for (let i = 0; ; i++) {
    let b;
    try { b = await launch(); await open(b.page, '?nocine'); await menu(b.page, 'new'); await b.page.evaluate(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.hero.hasBall = true; }); errs.push(b.errs); return b; }
    catch (e) { await b?.browser.close().catch(() => {}); if (i >= 2) throw e; console.log(`  (a page did not boot: ${e.message.split('\n')[0]}; again)`); }
  }
};
let groups;
{ const b = await page0(); groups = await b.page.evaluate(() => [...game.regions.groups.values()].map((g) => ({ id: g.id, rooms: [...g.rooms] }))); await b.browser.close(); }
const BATCH = +(process.env.BATCH || 8), batches = [];
for (let i = 0; i < groups.length; i += BATCH) batches.push(groups.slice(i, i + BATCH));
console.log(`${groups.length} build groups (${groups.reduce((n, g) => n + g.rooms.length, 0)} regions) in ${batches.length} pages`);
iso('every region built by regions.ensure (as a door or a load would build it), a few groups to a page');
const scan = { colliders: 0, sampled: 0, spots: 0, slots: [], per: {} }, walks = [], crashed = [], simOnly = [], WALKS_PER = +(process.env.WALKS_PER || 80);
// FROM / TO: only these pages (1-based), to finish a scan a crash cut short
const FROM = +(process.env.FROM || 1), TO = +(process.env.TO || batches.length);
for (const [bi, B] of batches.entries()) {
if (bi + 1 < FROM || bi + 1 > TO) continue;
const want = [...(bi === 0 ? ['citadel'] : []), ...B.flatMap((g) => g.rooms)].filter((id) => !ONLY || id.includes(ONLY));
if (!want.length) continue;
// (a page with the batch's regions built; the walks open a fresh one every WALKS_PER slots, and after a crash — the
//  machine is shared and a page has run out of memory —, the slot it crashed on is listed and the walks go on)
let browser, page, ev;
const fresh = async () => { if (browser) await browser.close().catch(() => {}); ({ browser, page } = await page0()); ev = (f, a) => page.evaluate(f, a); await ev((ids) => { for (const id of ids) if (id !== 'citadel') game.regions.ensure(id, 'gap-scan'); }, want); };
await fresh();

// ---- 1. the scan
const sc1 = await ev((want) => {
  const G = game, P0 = G.physics, r = G.hero.radius, STEP = 0.55;
  const sceneOf = (x, z) => G.regions.sceneOf(x, z);
  const L = (p) => Math.hypot(p.x, p.z);
  const seen = new Set(), pts = [];
  const per = {};
  // the floor levels at (x, z): the terrain and every brick top he could stand on there
  const levels = (x, z) => {
    const out = [G.physics.terrain.heightAt(x, z)];
    for (const c of P0.near(x, z)) if (c.enabled && !c.noStand && c.top > -40 && P0._inside(c, x, z, -0.05)) out.push(c.top);
    return out;
  };
  const test = (x, z) => {
    const k = Math.round(x * 20) + ',' + Math.round(z * 20); if (seen.has(k)) return; seen.add(k);
    for (const y of levels(x, z)) {
      const gi = P0.groundInfo(x, z, y + 0.01);
      if (Math.abs(gi.h - y) > 0.02) continue;   // (not the floor he would stand on from there)
      if (gi.h < -0.35 && !gi.brick) continue;   // (the sea)
      if (!gi.brick && P0.steepAt(x, z, y)) continue;
      const NL = P0.near(x, z);
      if (NL.some((c) => P0.stops(c, y) && P0._inside(c, x, z, 0))) continue;   // (his centre inside something)
      const hit = NL.filter((c) => P0.stops(c, y) && P0._inside(c, x, z, r));
      if (hit.length < 2) continue;
      const ps = hit.map((c) => [c, P0._push(c, x, z, r)]).filter(([, p]) => p && L(p) > 0.02 && L(p) < 0.2);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i][1], b = ps[j][1];
        if ((a.x * b.x + a.z * b.z) / (L(a) * L(b)) >= -0.8) continue;
        const gap = 2 * r - L(a) - L(b);
        pts.push({ x, z, y, gap, ax: -a.z / L(a), az: a.x / L(a), bal: Math.abs(L(a) - L(b)), c1: ps[i][0], c2: ps[j][0] });
        return;
      }
    }
  };
  let ncol = 0;
  for (const c of P0.colliders) {
    if (!c.enabled || c.stair || c.top < -40) continue;
    const sc = sceneOf(c.x, c.z); if (!want.includes(sc)) continue;
    per[sc] ??= { colliders: 0, spots: 0 }; per[sc].colliders++; ncol++;
    // (the band where his centre is 0.2–0.38 m from this collider's edge)
    for (const d of [0.21, 0.25, 0.29, 0.33, 0.37]) {
      if (c.type === 'cyl') {
        const R0 = c.r + d, n = Math.max(8, Math.ceil((2 * Math.PI * R0) / 0.05));
        for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; test(c.x + Math.sin(a) * R0, c.z + Math.cos(a) * R0); }
      } else {
        const hw = c.hw + d, hd = c.hd + d;
        // (along each side, and round each corner)
        const side = (lx0, lz0, lx1, lz1) => { const len = Math.hypot(lx1 - lx0, lz1 - lz0), n = Math.max(1, Math.ceil(len / 0.05)); for (let i = 0; i <= n; i++) { const lx = lx0 + ((lx1 - lx0) * i) / n, lz = lz0 + ((lz1 - lz0) * i) / n; test(c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos); } };
        side(-c.hw, -hd, c.hw, -hd); side(-c.hw, hd, c.hw, hd); side(-hw, -c.hd, -hw, c.hd); side(hw, -c.hd, hw, c.hd);
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); const lx = sx * (c.hw + Math.cos(a) * d), lz = sz * (c.hd + Math.sin(a) * d); test(c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos); }
      }
    }
  }
  // the spots in one metre's square (the same floor) are one slot: its most even spot stands for it (a long slot along
  // a fence is several: the depot's trap was one corner of a 10 m strip)
  const cells = new Map();
  for (const p of pts) {
    const k = Math.floor(p.x) + ',' + Math.floor(p.z) + ',' + Math.round(p.y * 2);
    const s = cells.get(k);
    if (s) { s.pts.push(p); if (p.bal < s.best.bal) s.best = p; } else cells.set(k, { y: p.y, pts: [p], best: p });
  }
  const slots = [...cells.values()];
  const desc = (c) => `${c.type}${c.type === 'cyl' ? ' r' + c.r.toFixed(2) : ' ' + (2 * c.hw).toFixed(2) + 'x' + (2 * c.hd).toFixed(2)}@${c.x.toFixed(2)},${c.z.toFixed(2)} top ${c.top.toFixed(2)}${c.name ? ' ' + c.name : ''}${c.seeThrough ? ' seeThrough' : ''}${c.block ? ' block' : ''}${c.noStand ? ' noStand' : ''}`;
  const out = slots.map((s) => { const b = s.best, sc = sceneOf(b.x, b.z); (per[sc] ??= { colliders: 0, spots: 0 }).spots++; return { scene: sc, x: +b.x.toFixed(2), z: +b.z.toFixed(2), y: +b.y.toFixed(2), gap: +b.gap.toFixed(2), ax: +b.ax.toFixed(3), az: +b.az.toFixed(3), n: s.pts.length, a: desc(b.c1), b: desc(b.c2) }; });
  // 1b. every slot's ways in played through physics.move itself (his collision, as the game moves him each frame: walking
  // 1.8 m/s and running 4.5 m/s, 60 steps a second, his feet kept on the ground under him), and from where each ends
  // touching two things the 8 headings and the step back: the ones that end held are walked by input below
  const V = G.hero.pos.constructor, act = { pos: new V(), radius: r, onGround: true, vy: 0 };
  const touchAt = (x, z, y) => { const ps = P0.near(x, z).filter((c) => P0.stops(c, y)).map((c) => P0._push(c, x, z, r)).filter(Boolean).map((p) => Math.hypot(p.x, p.z)); return [ps.length ? Math.max(...ps) : 0, ps.filter((d) => d > 0.005).length]; };
  const walk = (x, z, y, dx, dz, v, t) => { act.pos.set(x, y, z); for (let i = 0; i < t * 60; i++) { P0.move(act, (dx * v) / 60, (dz * v) / 60); act.pos.y = P0.groundAt(act.pos.x, act.pos.z, act.pos.y + 0.3); } return [act.pos.x, act.pos.y, act.pos.z]; };
  const clearLine = (s, x, z) => { const n = Math.ceil(Math.hypot(x - s.x, z - s.z) / 0.1); for (let i = 1; i < n; i++) { const u = i / n, px = x + (s.x - x) * u, pz = z + (s.z - z) * u; if (P0.near(px, pz).some((c) => P0.stops(c, s.y) && P0._inside(c, px, pz, 0))) return false; } return true; };
  const startFor = (s, dx, dz) => { for (const d of [3.0, 2.5, 2.0, 1.5, 1.2, 0.9]) for (const o of [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6, 0.8, -0.8]) { const x = s.x + dx * d - dz * o, z = s.z + dz * d + dx * o, g = P0.groundAt(x, z, s.y + 0.3); if (Math.abs(g - s.y) < 0.3 && P0.overlapAt(x, z, g, r) === 0 && clearLine(s, x, z)) return [x, z, g]; } return null; };
  for (const s of out) {
    s.sim = { ways: 0, into: 0, held: 0 };
    for (const [dx, dz] of [[s.ax, s.az], [-s.ax, -s.az], [-s.az, s.ax], [s.az, -s.ax]]) {
      const st = startFor(s, dx, dz); if (!st) continue;
      s.sim.ways++;
      for (const v of [1.8, 4.5]) {
        const hx = s.x - st[0], hz = s.z - st[1], hl = Math.hypot(hx, hz) || 1;
        const end = walk(st[0], st[1], st[2], hx / hl, hz / hl, v, 2.5), [o, nt] = touchAt(end[0], end[2], end[1]);
        if (!(o >= 0.03 || nt >= 2)) continue;
        s.sim.into++;
        let free = 0; for (let k = 0; k < 8; k++) { const e2 = walk(end[0], end[2], end[1], Math.sin((k * Math.PI) / 4), Math.cos((k * Math.PI) / 4), 1.8, 0.8); if (Math.hypot(e2[0] - end[0], e2[2] - end[2]) > 0.5) free++; }
        if (free === 0) { s.sim.held++; s.sim.at = end.map((u) => +u.toFixed(2)); }
      }
    }
  }
  return { colliders: ncol, sampled: seen.size, spots: pts.length, slots: out, per };
}, want);
console.log(`page ${bi + 1}: ${want.length} regions, ${sc1.colliders} colliders, ${sc1.sampled} spots sampled, ${sc1.spots} squeezed spots in ${sc1.slots.length} slots`);
scan.colliders += sc1.colliders; scan.sampled += sc1.sampled; scan.spots += sc1.spots; scan.slots.push(...sc1.slots); Object.assign(scan.per, sc1.per);
for (const s of sc1.slots) console.log(`  SLOT ${s.scene} (${s.x}, ${s.y}, ${s.z}) gap ${s.gap} m, ${s.n} spots: ${s.a} | ${s.b}`);

// ---- 2. each slot walked into
if (bi === 0) iso('enemies stood down and the doors held off (doorCool) for the walks; each start placed');
const byInput = sc1.slots.filter((s, i) => s.sim.held || (s.sim.into && i % 4 === 0) || i % 20 === 0);
console.log(`  simulated: ${sc1.slots.filter((s) => s.sim.ways).length} slots with a way in, ${sc1.slots.filter((s) => s.sim.into).length} ended in, ${sc1.slots.filter((s) => s.sim.held).length} held him; walked by input: ${byInput.length}`);
for (const s of sc1.slots.filter((q) => q.sim.held)) console.log(`  SIM-HELD ${s.scene} (${s.x}, ${s.y}, ${s.z}) at ${s.sim.at}: ${s.a} | ${s.b}`);
for (const [si, s] of byInput.entries()) {
  if (si && si % WALKS_PER === 0) await fresh();
  let r;
  try { r = await ev((s) => {
    const G = game, h = G.hero, P0 = G.physics, out = [];
    // (how far the things that stop him reach into him: each one's push, the deepest; and how many touch him)
    const touch = () => { const ps = P0.near(h.pos.x, h.pos.z).filter((c) => P0.stops(c, h.pos.y)).map((c) => P0._push(c, h.pos.x, h.pos.z, h.radius)).filter(Boolean).map((p) => Math.hypot(p.x, p.z)); return [ps.length ? Math.max(...ps) : 0, ps.filter((d) => d > 0.005).length]; };
    const hold = (keys, t) => { for (const k of keys) G.input.keys.add(k); G.step(t); for (const k of keys) G.input.keys.delete(k); G.step(0.15); };
    const put = (x, z, y) => {
      const sc = G.regions.sceneOf(x, z);
      if (sc !== (G.room?.id ?? 'citadel')) { if (sc === 'citadel') G.exitRoom({ x, z, a: 0 }, true, true); else G.enterRoom(sc, { x, z, a: 0 }, true, true); G.step(0.3); }
      for (const e of G.enemies) if (e.present) e.present = false;
      G.doorCool = 1e6;
      h.pos.set(x, P0.groundAt(x, z, y + 0.3), z); h.vy = 0; h.onGround = true; h.resetMotion?.(); h.behaviour = 'normal'; h.hp = h.maxHp; h.dead = false; G.step(0.1);
    };
    // (where physics.move held him — walking or running in —: placed there, the ways out by input; 'end 0')
    const outs = (at, a0, w) => {
      const up8 = [];
      for (let k = 0; k < 8; k++) { h.pos.set(at[0], at[1], at[2]); h.angle = (k * Math.PI) / 4; G.step(0.05); const x0 = h.pos.x, z0 = h.pos.z; hold(['ArrowUp'], 0.8); up8.push(+Math.hypot(h.pos.x - x0, h.pos.z - z0).toFixed(2)); }
      h.pos.set(at[0], at[1], at[2]); h.angle = a0; G.step(0.05);
      const x1 = h.pos.x, z1 = h.pos.z; hold(['ArrowDown'], 0.8);
      Object.assign(w, { up8, free: up8.filter((d) => d > 0.5).length, back: +Math.hypot(h.pos.x - x1, h.pos.z - z1).toFixed(2) });
      w.stuck = w.free === 0 && w.back < 0.3;
    };
    if (s.sim?.at) {
      const at = s.sim.at; put(at[0], at[2], at[1]); h.pos.set(at[0], at[1], at[2]); G.step(0.05);
      const [o, nt] = touch(), w = { end: 0, start: [at[0], at[2]], at: [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(2)), ov: +o.toFixed(3), nt, dSlot: 0 };
      if (G.state === 'play') outs(w.at, Math.atan2(at[0] - s.x, at[2] - s.z), w); else w.skipped = 'state ' + G.state;
      out.push(w);
    }
    // four ways in: along the slot from either end, and across it from either side (where a side is open)
    for (const [sg, dx, dz] of [[1, s.ax, s.az], [-1, -s.ax, -s.az], [2, -s.az, s.ax], [-2, s.az, -s.ax]]) {
      // the start: 3 m off (or nearer, down to 0.9 m; or up to 0.8 m to either side of that line, where a long wall
      // runs beside the slot), clear of everything, on the same floor, the way from it to the slot through nothing
      let st = null;
      const clearLine = (x, z) => { const n = Math.ceil(Math.hypot(x - s.x, z - s.z) / 0.1); for (let i = 1; i < n; i++) { const u = i / n, px = x + (s.x - x) * u, pz = z + (s.z - z) * u; if (P0.near(px, pz).some((c) => P0.stops(c, s.y) && P0._inside(c, px, pz, 0))) return false; } return true; };
      out: for (const d of [3.0, 2.5, 2.0, 1.5, 1.2, 0.9]) for (const o of [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6, 0.8, -0.8]) {
        const x = s.x + dx * d - dz * o, z = s.z + dz * d + dx * o, g = P0.groundAt(x, z, s.y + 0.3);
        if (Math.abs(g - s.y) < 0.3 && P0.overlapAt(x, z, g, h.radius) === 0 && clearLine(x, z)) { st = [x, z]; break out; }
      }
      if (!st) { out.push({ end: sg, skipped: 'no clear start' }); continue; }
      put(st[0], st[1], s.y);
      if (G.state !== 'play') { out.push({ end: sg, skipped: 'state ' + G.state }); G.setState?.('play'); continue; }
      h.angle = Math.atan2(s.x - st[0], s.z - st[1]); G.step(0.05);
      hold(['ArrowUp'], 2.5);
      const [o, nt] = touch(), at = [h.pos.x, h.pos.y, h.pos.z], w = { end: sg, start: st.map((u) => +u.toFixed(2)), at: at.map((u) => +u.toFixed(2)), ov: +o.toFixed(3), nt, dSlot: +Math.hypot(at[0] - s.x, at[2] - s.z).toFixed(2) };
      // (ended in it — pressed by two things at once, or 3 cm or more into one —: can he get out?)
      if ((o >= 0.03 || nt >= 2) && G.state === 'play') outs(at, Math.atan2(s.x - st[0], s.z - st[1]), w);
      out.push(w);
    }
    G.doorCool = 0;
    return out;
  }, s); } catch (e) { if (!/crash|closed/i.test(e.message)) throw e; crashed.push({ scene: s.scene, at: [s.x, s.z] }); console.log(`  WALK ${s.scene} (${s.x}, ${s.z}): page crashed, a fresh page for the rest`); await fresh(); continue; }
  const into = r.filter((w) => w.end !== 0 && (w.ov >= 0.03 || w.nt >= 2));
  const stuck = r.some((w) => w.stuck);
  walks.push({ ...s, walks: r, into: into.length, stuck });
  if (s.sim.held && !stuck) simOnly.push(s);
  console.log(`  WALK ${s.scene} (${s.x}, ${s.z}) gap ${s.gap}: ${r.map((w) => w.skipped ? `end ${w.end} ${w.skipped}` : `end ${w.end} → (${w.at[0]}, ${w.at[2]}) ov ${w.ov} touching ${w.nt}${w.up8 ? ` free ${w.free}/8 back ${w.back}${w.stuck ? ' STUCK' : ''}` : ''}`).join(' · ')}`);
}
await browser.close();
}
for (const [sc, v] of Object.entries(scan.per)) console.log(`  ${sc}: ${v.colliders} colliders, ${v.spots} slots`);
console.log(`scan: ${scan.colliders} colliders, ${scan.sampled} spots sampled, ${scan.spots} squeezed spots in ${scan.slots.length} slots`);
const nOut = Object.keys(scan.per).filter((k) => !/^(ih_|zh_)/.test(k)).length;
check(`1. the scan covered every region (${Object.keys(scan.per).length} scenes with colliders, ${scan.colliders} colliders)`, ONLY || FROM > 1 || TO < batches.length ? scan.colliders > 0 : Object.keys(scan.per).length >= 20 && ['citadel', 'zeelich', 'desert', 'hamalayi'].every((k) => scan.per[k]?.colliders > 0), Object.fromEntries(Object.entries(scan.per).map(([k, v]) => [k, v.colliders])));
void nOut;
const into = walks.filter((w) => w.into), traps = walks.filter((w) => w.stuck);
const by = (L) => Object.entries(L.reduce((m, w) => ((m[w.scene] = (m[w.scene] || 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(', ');
const simHeld = scan.slots.filter((s) => s.sim.held);
console.log(`simulation: ${scan.slots.filter((s) => s.sim.into).length} of ${scan.slots.length} slots ended in, ${simHeld.length} held him (${by(simHeld) || 'none'}); by input: ${walks.length} walked, ${simOnly.length} held in the simulation but not by input`);
check(`2a. every slot to walk by input walked (${crashed.length} lost to a crashed page)`, crashed.length <= 3, crashed);
// (the simulation only picks the slots to walk by input: a slot it holds him in and the keys do not — the hero's own
//  turning and stepping get him out — is listed, not failed)
for (const s of simOnly) console.log(`  SIM-ONLY ${s.scene} (${s.x}, ${s.y}, ${s.z}): held in the simulation at ${s.sim.at}, walked out by input`);
console.log(`walked into (ends overlapping): ${into.length} of ${walks.length} slots (${by(into) || 'none'}); stuck: ${traps.length} (${by(traps) || 'none'})`);
check(`2. the slots walked into by input (${walks.length}: every one the simulation held him in, a quarter of those it ended in, every 20th other one; along it, across it): none holds him (no heading out moves him 0.5 m and Down does not)`, traps.length === 0, traps.map((w) => ({ scene: w.scene, at: [w.x, w.y, w.z], gap: w.gap, a: w.a, b: w.b, walks: w.walks.filter((q) => q.stuck) })));
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ per: scan.per, walks }, null, 1));
process.exit(done(errs.flat()) ? 1 : 0);
