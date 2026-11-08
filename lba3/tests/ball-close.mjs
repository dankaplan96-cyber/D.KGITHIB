// POINT-BLANK (8.11.2026; chapter-balance.md: chapter 2's depot, the guard and his dog at Twinsen in the valve's
// corner). The magic ball at close range, in the real place (Citadel's project depot), every throw a real tap of F
// (Classic controls, the auto-aim as shipped). ISO: chapter 2 set by its flags; Twinsen and one enemy placed and held
// still (the enemy's own AI off) so each throw is measured from the same spot.
//   1. the yard: the guard, the dog and a drone at contact range and a step further, ahead and 20° to either side:
//      every throw aimed at it hits it; at contact range the flight takes the 0.12 s it is given (no 13 m/s sideways
//      past a dog at his feet)
//   2. ranged throws unchanged: at 3 and 6 m the ball crosses at the aimed pace (13 m/s Normal) and hits
//   3. the valve's corner: beside the bypass loop (south, north, the west end), the guard and the dog at contact range
//      all round him: every throw hits (the loop's own collider stood 0.4 m over the pipe for the ball)
//   4. facing the depot's fence from 0.45 / 0.7 / 1.0 m: the ball leaves short of the fence, never passes through it,
//      is not stuck in it (its bounces were spent in 0.03 s) and comes home
//   5. charging there: the aim dots start on his side of the fence (the preview leaves from where the throw will)
//   6. AIM-MATCH: a full charge in the open, no target: the preview ring is where the throw first touches down (it was
//      1.3-1.4 m short in every behaviour: drawn from the hand cocked behind his head)
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { const G = game, f = G.flags, h = G.hero; P.settle();
  P.note('ISO: chapter 2 by its flags, warned at the depot; the watch held still and out of the way');
  Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'project', c1_started: true, c1_home: true, c1_arrived: true, c1_task: true, c1_depotWarned: true });
  f.chapter = G.story.chapters.findIndex((c) => c.key === 'project');
  h.hasBall = true; G.story.refreshCast();
  const v = G.world.valves.find((q) => q.id === 'depot');
  G.exitRoom({ x: v.x - 5, z: v.z - 2, a: 0 }, true); P.settle(); G.step(0.5);
  window.BC = { m: () => G.enemies.filter((e) => e.def?.watch), v };
  for (const e of BC.m()) { e.update = () => {}; e.pos.set(-200, 0, -200); e.sync?.(); }
  const B = G.ball;
  const S0 = B.step.bind(B); B.step = function (dt) { const re = this.reseat; S0(dt); if (re && this._rec) { const hh = G.hero; this._rec.rel = [this.pos.x - hh.pos.x, this.pos.y - hh.pos.y, this.pos.z - hh.pos.z]; this._rec.vel = [this.vel.x, this.vel.y, this.vel.z]; } };
  const b0 = B.bounce.bind(B); B.bounce = function (k) { this._rec?.ev.push([k, this.life]); return b0(k); };
  const H0 = B.onHit.bind(B); B.onHit = function (hit) { this._rec?.ev.push(['hit:' + (hit.enemy?.id || hit.result), this.life]); return H0(hit); };
  // one throw: Twinsen at (hx, hz) facing a; the enemy `kind` at distance d, `rel` degrees off his facing
  BC.one = (c) => {
    const h = G.hero, P2 = G.physics, e = BC.m().find((q) => q.def.kind === c.kind);
    for (let i = 0; i < 240 && (B.state !== 'idle' || h.combat.busy); i++) G.step(1 / 60);
    G.step(0.3);
    if (e) { e.hp = e.maxHp; e.hurtT = 0; e.kb?.set?.(0, 0); }
    const hy = P2.groundAt(c.hx, c.hz, h.pos.y + 2);
    h.pos.set(c.hx, hy, c.hz); h.angle = c.a; h.hp = h.maxHp; h.mp = h.mpMax; h.kb?.set?.(0, 0);
    const ra = c.a + (c.rel || 0) * Math.PI / 180, ex = c.hx + Math.sin(ra) * c.d, ez = c.hz + Math.cos(ra) * c.d;
    if (e) { e.pos.set(ex, P2.groundAt(ex, ez, hy + 2), ez); e.angle = ra + Math.PI; e.sync?.(); }
    h.sync?.(); G.story.depot.hostile = true; G.step(1 / 60); if (G.state !== 'play') { P.settle(); h.pos.set(c.hx, hy, c.hz); h.angle = c.a; }
    const fx = Math.sin(c.a), fz = Math.cos(c.a);
    const aimed = G.targeting?.throwTarget?.({ x: fx, z: fz }) === e && !!e;
    const hp0 = e ? e.hp : 0; B._rec = { ev: [] };
    const keys = G.input.keys, I = G.input; let maxFwd = -9, thrown = false, dots = null;
    keys.add('KeyF'); I.taps.add('KeyF'); G.step(1 / 60); if (!c.hold) keys.delete('KeyF');
    for (let i = 0; i < 300; i++) {
      h.pos.x = c.hx; h.pos.z = c.hz; h.angle = c.a; if (e) { e.pos.x = ex; e.pos.z = ez; }
      if (c.hold && i === 50) { dots = B.dots.filter((d) => d.visible).map((d) => (d.position.x - c.hx) * fx + (d.position.z - c.hz) * fz); keys.delete('KeyF'); }
      G.step(1 / 60);
      if (B.state === 'fly' || B.state === 'impact' || B.state === 'return') thrown = true;
      if (B.state === 'fly') maxFwd = Math.max(maxFwd, (B.pos.x - c.hx) * fx + (B.pos.z - c.hz) * fz);
      if (thrown && B.state === 'idle') break;
    }
    const R = B._rec, v = R.vel || [0, 0, 0], rel = R.rel || [0, 0, 0];
    const out = { aimed, thrown, home: B.state === 'idle', hit: e ? e.hp < hp0 : false, hsp: +Math.hypot(v[0], v[2]).toFixed(2), from: +(rel[0] * fx + rel[2] * fz).toFixed(2), maxFwd: +maxFwd.toFixed(2), ev: R.ev.map(([k, t]) => k[0] + '@' + t.toFixed(2)), firstWalls: R.ev.filter(([k, t]) => k === 'wall' && t < 0.05).length, dots };
    if (e) { e.pos.set(-200, 0, -200); e.sync?.(); }
    return out;
  };
  return 1;
});
const v = await ev(() => [BC.v.x, BC.v.z]);
const ox = v[0] - 5, oz = v[1] - 2, A = -Math.PI / 2;
const contact = { guard: 0.86, gdog: 0.9, drone: 0.95 };

// 1. the yard, close
const s1 = []; let s1slow = true;
for (const kind of ['guard', 'gdog', 'drone']) for (const dd of [0, 0.25]) for (const rel of [-20, 0, 20]) {
  const d = contact[kind] + dd, r = await ev((c) => BC.one(c), { kind, hx: ox, hz: oz, a: A, d, rel });
  s1.push(`${kind} ${d.toFixed(2)} m ${rel}°: ${r.aimed ? 'aimed' : 'not aimed'} ${r.hit ? 'HIT' : 'miss'} ${r.hsp} m/s [${r.ev.join(' ')}]`);
  if (!r.aimed || !r.hit) s1slow = false;
  if (dd === 0 && r.hsp > d / 0.12 + 0.5) s1slow = false;
}
check('1. the yard: the guard, the dog and a drone at contact range and a step further, ahead and 20° to the sides: aimed at, hit, crossing in 0.12 s at contact range', s1slow, s1);

// 2. ranged
const s2 = []; let s2ok = true;
for (const kind of ['guard', 'gdog']) for (const d of [3, 6]) {
  const r = await ev((c) => BC.one(c), { kind, hx: ox, hz: oz, a: A, d, rel: 0 });
  s2.push(`${kind} ${d} m: ${r.hit ? 'HIT' : 'miss'} ${r.hsp} m/s`);
  if (!r.hit || Math.abs(r.hsp - 13) > 0.15) s2ok = false;
}
check('2. ranged throws unchanged: at 3 and 6 m the ball crosses at 13 m/s (Normal\'s aimed pace) and hits', s2ok, s2);

// 3. the valve's corner
const s3 = {}; let s3ok = true, s3n = 0;
for (const [spot, sx, sz] of [['south', 0.8, -0.75], ['north', 0.8, 0.75], ['west end', -2.35, 0]]) for (const kind of ['guard', 'gdog']) for (let deg = 0; deg < 360; deg += 30) {
  const a = deg * Math.PI / 180, c = { kind, hx: v[0] + sx, hz: v[1] + sz, a, d: contact[kind] + 0.05, rel: 0 };
  const room = await ev((c) => { const P2 = game.physics, ex = c.hx + Math.sin(c.a) * c.d, ez = c.hz + Math.cos(c.a) * c.d, y = P2.groundAt(c.hx, c.hz, 20); return !P2.blockedAt(ex, ez, y, 0.3); }, c);
  if (!room) continue;
  const r = await ev((c) => BC.one(c), c); s3n++;
  const k = `${spot} ${kind}`; s3[k] ??= []; s3[k].push(`${deg}°${r.hit ? '' : ' MISS ' + r.ev.join(' ')}`);
  if (!r.hit) s3ok = false;
}
check(`3. the valve's corner: beside the bypass loop (south, north, the west end), the guard and the dog at contact range all round him (${s3n} throws): every one hits`, s3ok && s3n > 20, s3);

// 4. the fence
const s4 = []; let s4ok = true;
for (const gap of [0.45, 0.7, 1.0]) {
  const r = await ev((c) => BC.one(c), { kind: 'none', hx: -65 - gap, hz: oz + 3, a: Math.PI / 2, d: 0 });
  s4.push({ gap, from: r.from, maxFwd: r.maxFwd, firstWalls: r.firstWalls, home: r.home, ev: r.ev.join(' ') });
  if (!r.thrown || !r.home || r.maxFwd > gap - 0.1 || r.from > gap - 0.1 || r.firstWalls > 1) s4ok = false;
}
check('4. facing the depot fence from 0.45 / 0.7 / 1.0 m: the ball leaves short of it, never passes it, bounces off once (not stuck in it) and comes home', s4ok, s4);

// 5. the preview
const r5 = await ev((c) => BC.one(c), { kind: 'none', hx: -65.7, hz: oz + 3, a: Math.PI / 2, d: 0, hold: true });
check('5. charging 0.7 m from the fence: the aim dots lie between him and the fence', r5.dots && r5.dots.length > 0 && r5.dots.every((x) => x >= 0 && x < 0.6), { dots: r5.dots?.map((x) => +x.toFixed(2)) });

// 6. the preview's ring where the charged throw lands (no target: each behaviour's own arc)
const s6 = []; let s6ok = true;
for (const beh of ['normal', 'athletic', 'aggressive', 'discreet']) {
  const r = await ev(([beh, hx, hz, a]) => {
    const G = game, h = G.hero, B = G.ball, keys = G.input.keys, I = G.input;
    for (let i = 0; i < 240 && (B.state !== 'idle' || h.combat.busy); i++) G.step(1 / 60);
    h.pos.set(hx, G.physics.groundAt(hx, hz, h.pos.y + 2), hz); h.angle = a; h.behaviour = beh; h.mp = h.mpMax;
    const fx = Math.sin(a), fz = Math.cos(a);
    keys.add('KeyF'); I.taps.add('KeyF');
    for (let i = 0; i < 80; i++) { h.pos.x = hx; h.pos.z = hz; h.angle = a; G.step(1 / 60); }
    const ring = B.landMark.visible ? (B.landMark.position.x - hx) * fx + (B.landMark.position.z - hz) * fz : null;
    keys.delete('KeyF');
    let first = null; const b0 = B.bounce; B.bounce = function (k) { if (first == null) first = k === 'ground' ? (this.pos.x - hx) * fx + (this.pos.z - hz) * fz : NaN; return b0.call(this, k); };
    for (let i = 0; i < 200 && first == null; i++) { h.pos.x = hx; h.pos.z = hz; h.angle = a; G.step(1 / 60); }
    B.bounce = b0; h.behaviour = 'normal';
    return { ring: ring == null ? null : +ring.toFixed(2), landed: first == null ? null : +first.toFixed(2) };
  }, [beh, ox, oz, A]);
  s6.push(`${beh}: ring ${r.ring} m, landed ${r.landed} m`);
  if (r.ring == null || r.landed == null || !(Math.abs(r.ring - r.landed) < 0.25)) s6ok = false;
}
check('6. a full charge in the yard (Classic, no target): the preview\'s ring is where the throw first touches down, within 0.25 m, in all four behaviours', s6ok, s6);

done();
await browser.close();
