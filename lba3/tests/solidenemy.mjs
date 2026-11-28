// SOLID-ENEMY (the user, 29.10: "what LBA2 did"): enemies are solid to Twinsen as people are. LBA2 tests his box against
// every body's box each frame (OBJECT.CPP CheckObjCol) and its punches land when his box, pushed 200 units (0.33 m)
// ahead, meets the target's: so he stops at an enemy's body and his blows land from there. Here: Hero.keepApart keeps
// him out of every living enemy's body (enemies.js BODY_R, guards: the race's girth), the enemy's own moves stop at him
// (Actor.keepOffHero). In the developer arena (?arena, every enemy kind), with the player's keys (Classic: turn, hold Up)
// at 30, 60 and 144 fps and with long frames:
//   - walking into each kind head on and off centre: never inside its body, no jitter, never launched; head on he stops,
//     off centre he slides round and gets past
//   - every attack (jab, jab 2, kick, the three sword strikes, the heavy strike, the glove's two punches) connects from
//     where he stops, for every kind (reach + the target's radius ≥ his radius + its body + margin, and played)
//   - a drone over his head is walked under; at body height it blocks him
//   - a beaten enemy is not solid (he walks through where it falls)
//   - lunges and bashes at him with his back to a wall: they stop at his body, he is never pushed into the wall
//   - pinned between a wall and an enemy he walks out along the wall
//   - the cost of the contact test with every enemy near and with none near
// ISO (logged): Twinsen and the enemies are put at their start points; an enemy is held still (its AI paused) where a
// test needs one that stands; a strike is started with its move (combat.startMove) instead of its combo position.
import { launch, open, checker } from './lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine');
await ev(() => {
  const G = window.game; G.testFreeze = true;
  G.settings.controls = 'classic'; G.applySettings?.();
  G.devArena();
  const Pk = G.physics, keys = G.input.keys, h = G.hero;
  const S = (window.S = {});
  S.E = (id) => G.enemies.find((e) => e.id === id);
  S.KINDS = ['a_mite', 'a_crawler', 'a_drone', 'a_sentry', 'a_guard', 'a_guardG', 'a_fclone', 'a_gdog'];
  // an enemy held still (its AI paused: it stands, its rig idles) or let go
  S.hold = (e, on = true) => {
    if (!e._upd) { const u = e.update; e._upd = u; e.update = function (dt) { if (this._held) { this.rig.update?.(dt, 0); if (this.syncHover) this.syncHover(); else this.sync(); return; } return u.call(this, dt); }; }
    e._held = on;
  };
  S.only = (ids) => { for (const e of G.enemies) { if (!e.id?.startsWith('a_')) continue; e.setPresent(ids.includes(e.id)); } G.resetCombat?.(); G.combatDir.grace = 1e9; G.state = 'play'; };
  S.putE = (e, x, z, a = 0) => { e.pos.set(x, Pk.groundAt(x, z, 5), z); e.angle = a; e.kb?.set(0, 0); e.hp = e.maxHp = 99; if (e.syncHover) e.syncHover(); else e.sync(); };
  S.putH = (x, z, a) => { P.release(); h.pos.set(x, Pk.groundAt(x, z, h.pos.y + 5), z); h.prevPos.copy(h.pos); h.angle = a; h.resetMotion(); h.onGround = true; h.vy = 0; h.hp = h.maxHp; h.invuln = 0; h.dead = false; h.hurtT = 0; h.actT = 0; h.combat.reset(); h.sync(); G.step(1 / 30); };
  S.R = (e) => h.radius + e.bodyR;
  S.clearKeys = () => { for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) keys.delete(k); };
  // walk with the keys at a body (Classic: facing `a`, hold Up), measuring every frame (as tests/solidnpc.mjs)
  S.walk = (e, { a = 0, off = 0, from = 3.5, T = 4, dt = 1 / 60, long = 0 } = {}) => {
    const ux = Math.sin(a), uz = Math.cos(a), px = uz, pz = -ux;
    S.putH(e.pos.x - ux * from + px * off, e.pos.z - uz * from + pz * off, a);
    const R = S.R(e), m = { minGap: 9, maxStep: 0, flips: 0, contactT: 0, overlapFrames: 0, lastSide: 0 };
    let prevLat = null, prev = { x: h.pos.x, z: h.pos.z };
    for (let t = 0; t < T; t += dt) {
      S.clearKeys(); keys.add('ArrowUp');
      const step = long && Math.round(t / dt) % 30 === 29 ? long : dt;
      G.step(step, step); if (step !== dt) t += step - dt;
      const dx = h.pos.x - e.pos.x, dz = h.pos.z - e.pos.z, d = Math.hypot(dx, dz);
      m.minGap = Math.min(m.minGap, d - R); if (d < R - 0.02) m.overlapFrames++;
      m.maxStep = Math.max(m.maxStep, Math.hypot(h.pos.x - prev.x, h.pos.z - prev.z) / step); prev = { x: h.pos.x, z: h.pos.z };
      if (d < R + 0.05) {
        m.contactT += step;
        const lat = dx * px + dz * pz, vl = prevLat == null ? 0 : lat - prevLat;
        if (prevLat != null && Math.abs(vl) > 1e-4) { const s = Math.sign(vl); if (m.lastSide && s !== m.lastSide) m.flips++; m.lastSide = s; }
        prevLat = lat;
      } else prevLat = null;
    }
    S.clearKeys(); G.step(1 / 30);
    m.along = (h.pos.x - e.pos.x) * ux + (h.pos.z - e.pos.z) * uz; m.passed = m.along > R; m.R = +R.toFixed(3);
    for (const k of ['minGap', 'maxStep', 'contactT', 'along']) m[k] = +m[k].toFixed(3);
    delete m.lastSide;
    return m;
  };
});

// ---- the bodies and the reach of every attack (numbers)
const table = await ev(async () => {
  const { MOVES } = await import('/src/game/combat.js');
  const h = game.hero, out = { hero: h.radius, kinds: {}, worst: null };
  for (const id of S.KINDS) {
    const e = S.E(id), stop = S.R(e), row = { bodyR: e.bodyR, radius: e.radius, stop: +stop.toFixed(3), margins: {} };
    for (const [k, D] of Object.entries(MOVES)) {
      const m = +(D.reach + (e.radius || 0.5) - stop).toFixed(3);
      row.margins[k] = m;
      if (!out.worst || m < out.worst.m) out.worst = { id, k, m };
    }
    out.kinds[id] = row;
  }
  return out;
});
for (const [id, r] of Object.entries(table.kinds)) console.log(`MEASURE ${id}: body ${r.bodyR} m, stop distance ${r.stop} m, reach margin per move ${JSON.stringify(r.margins)}`);
check(`every attack's reach (reach + the target's radius) is at least 0.3 m past every kind's stop distance (worst: ${table.worst.k} on ${table.worst.id}, ${table.worst.m} m)`, table.worst.m >= 0.3, table.worst);

// ---- walking into each kind
iso('each enemy is held still at (6192, 7); Twinsen is put 3.5 m from it, facing it');
const cases = [
  ['head on, 60 fps', { off: 0, T: 3 }, 'stop'],
  ['off centre (half its stop distance), 30 fps', { offK: 0.5, T: 5, dt: 1 / 30 }, 'pass'],
  ['off centre (0.8 of its stop distance), 144 fps', { offK: 0.8, T: 4, dt: 1 / 144 }, 'pass'],
  ['head on, long frames (0.1 s)', { off: 0.05, T: 3, long: 0.1 }, 'any'],
];
for (const id of ['a_mite', 'a_crawler', 'a_drone', 'a_sentry', 'a_guard', 'a_guardG', 'a_fclone', 'a_gdog']) {
  for (const [label, opts, expect] of cases) {
    const r = await ev(({ id, opts }) => {
      S.only([id]); const e = S.E(id); S.hold(e); S.putE(e, 6192, 7, Math.PI);
      const o = { ...opts }; if (o.offK) { o.off = o.offK * S.R(e); delete o.offK; }
      return S.walk(e, o);
    }, { id, opts });
    console.log(`${id} ${label}`, JSON.stringify(r));
    check(`${id} ${label}: never inside its body (min gap ${r.minGap} m, overlapping frames ${r.overlapFrames})`, r.minGap > -0.03 && r.overlapFrames === 0, r);
    check(`${id} ${label}: never launched (fastest frame ${r.maxStep} m/s)`, r.maxStep < 3.2, r.maxStep);
    check(`${id} ${label}: no jitter along its body (side changes in contact: ${r.flips})`, r.flips <= 1, r.flips);
    if (expect === 'stop') check(`${id} ${label}: stops at its body (${r.contactT} s in contact, ${r.along} m from its centre)`, !r.passed && r.contactT > 1 && r.along > -r.R - 0.05, r);
    if (expect === 'pass') check(`${id} ${label}: slides round it and gets past (${r.along} m beyond the centre)`, r.passed, r);
  }
}

// ---- every attack connects from where he stops
iso('Twinsen walks into the held enemy with the keys, stops; then each strike is started with its move (combat.startMove)');
const strikes = await ev(async () => {
  const { MOVES } = await import('/src/game/combat.js');
  const G = game, h = G.hero, out = [];
  for (const id of S.KINDS) {
    S.only([id]); const e = S.E(id); S.hold(e);
    for (const key of Object.keys(MOVES)) {
      S.putE(e, 6192, 7, Math.PI);
      S.walk(e, { a: 0, from: 2.6, T: 1.2 });
      for (let i = 0; i < 20; i++) G.step(1 / 60);   // (stands)
      const d0 = Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
      let hit = null, minGap = 9;
      const mel = e.melee;
      e.melee = function (D, hh) { hit = { t: +h.combat.move.t.toFixed(3), d: +Math.hypot(hh.pos.x - this.pos.x, hh.pos.z - this.pos.z).toFixed(3), res: mel.call(this, D, hh) }; return hit.res; };
      e.hp = 99; if (e.guarding) e.state = 'stagger';   // (the sentry's shield would turn a light blow: it still connects, 'blocked')
      h.combat.startMove(key, { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' });
      const D = MOVES[key];
      for (let t = 0; t < D.s + D.a + D.r + 0.1; t += 1 / 60) { G.step(1 / 60); minGap = Math.min(minGap, Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z) - S.R(e)); }
      e.melee = mel; h.combat.reset(); h.rig.atk = null;
      out.push({ id, key, d0: +d0.toFixed(3), stop: +S.R(e).toFixed(3), hit, active: [D.s, +(D.s + D.a).toFixed(3)], minGap: +minGap.toFixed(3) });
    }
    S.hold(e, false);
  }
  return out;
});
let missed = strikes.filter((s) => !s.hit), late = strikes.filter((s) => s.hit && (s.hit.t < s.active[0] - 1e-6 || s.hit.t > s.active[1] + 0.02)), inside = strikes.filter((s) => s.minGap < -0.03), far = strikes.filter((s) => s.d0 > s.stop + 0.06);
for (const s of strikes) console.log(`MEASURE strike ${s.id} ${s.key}: stood at ${s.d0} m (stop ${s.stop}), contact ${s.hit ? `at ${s.hit.t} s (${s.hit.res}) from ${s.hit.d} m` : 'none'}, active ${s.active.join('–')} s, min gap ${s.minGap}`);
check(`he walks up to each kind's body before striking (stood within 6 cm of the stop distance: ${strikes.length - far.length}/${strikes.length})`, !far.length, far.slice(0, 4));
check(`every attack connects with every kind from there (${strikes.length - missed.length}/${strikes.length})`, !missed.length, missed.map((s) => s.id + ':' + s.key));
check('each contact lands in the strike\'s active frames', !late.length, late.slice(0, 4));
check('the strike\'s forward step never takes him into the body', !inside.length, inside.slice(0, 4));

// ---- a flyer only blocks at body height
const fly = await ev(() => {
  const e = S.E('a_drone'); S.only(['a_drone']); S.hold(e); const base = e.hover;
  S.putE(e, 6192, 7, Math.PI); e.hover = 2.6; e.syncHover();
  const over = S.walk(e, { off: 0, T: 3 });
  e.hover = base; e.syncHover();
  const at = S.walk(e, { off: 0, T: 3 });
  S.hold(e, false);
  return { over, at, hover: base };
});
check(`a drone hovering over his head (hull from ${(2.6 - 0.49).toFixed(2)} m) is walked under`, fly.over.passed, fly.over);
check('the same drone at its working height blocks him', !fly.at.passed && fly.at.minGap > -0.03, fly.at);

// ---- a beaten enemy is not solid
const dead = await ev(() => {
  const G = game, h = G.hero, e = S.E('a_guard'); S.only(['a_guard']); S.hold(e); S.putE(e, 6192, 7, Math.PI);
  S.walk(e, { from: 2.6, T: 1.2 });
  e.hp = 1; e.armour = 0; h.combat.equip('sword', true);
  h.combat.startMove('slash3', { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' });
  for (let i = 0; i < 40; i++) G.step(1 / 60);
  const alive = e.alive, at = { x: e.pos.x, z: e.pos.z };
  h.combat.reset();
  // walk on through where it lies
  const before = Math.hypot(h.pos.x - at.x, h.pos.z - at.z);
  for (let t = 0; t < 2.5; t += 1 / 60) { S.clearKeys(); G.input.keys.add('ArrowUp'); G.step(1 / 60); }
  S.clearKeys();
  const along = (h.pos.z - at.z);
  S.hold(e, false);
  return { alive, before: +before.toFixed(2), along: +along.toFixed(2) };
});
check(`a beaten guard is not solid: he walks on through where it fell (${dead.along} m past it)`, !dead.alive && dead.along > 0.5, dead);

// ---- lunges and bashes at him, his back to a wall
iso('Twinsen is put against the arena\'s south wall facing north; the enemy 1.75 m in front (the crawler 2.6 m) with its home there, its AI running, attacks allowed');
const lunges = await ev(() => {
  const G = game, h = G.hero, Pk = G.physics, out = [];
  for (const id of ['a_gdog', 'a_mite', 'a_sentry', 'a_guard', 'a_guardG', 'a_crawler']) {
    S.only([id]); const e = S.E(id); S.hold(e, false);
    // back against the south wall (walk into it), then turn round
    S.putH(6192, 9, 0); for (let t = 0; t < 2; t += 1 / 60) { S.clearKeys(); G.input.keys.add('ArrowUp'); G.step(1 / 60); } S.clearKeys();
    h.angle = Math.PI; G.step(1 / 60);
    const wallZ = h.pos.z;
    // (inside its attack distance, at home there: it attacks rather than shoots or circles)
    S.putE(e, h.pos.x, h.pos.z - (id === 'a_crawler' ? 2.6 : 1.75), 0); e.home = { x: e.pos.x, z: e.pos.z };
    e.hp = e.maxHp = 99; e.state = 'chase'; e.stateT = 0; e.coolT = 0;
    G.combatDir.grace = 0; G.combatDir.holders.clear();
    let minGap = 9, inWall = 0, maxZ = -1e9, maxStep = 0, prev = { x: h.pos.x, z: h.pos.z }, states = new Set(), hurt = 0;
    for (let t = 0; t < 4; t += 1 / 60) {
      h.hp = h.maxHp; h.invuln = 0;   // (he stands there: kept alive)
      G.step(1 / 60);
      states.add(e.state);
      const d = Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
      minGap = Math.min(minGap, d - S.R(e));
      if (Pk.blockedAt(h.pos.x, h.pos.z, h.pos.y, h.radius - 0.05)) inWall++;
      maxZ = Math.max(maxZ, h.pos.z);
      maxStep = Math.max(maxStep, Math.hypot(h.pos.x - prev.x, h.pos.z - prev.z) * 60); prev = { x: h.pos.x, z: h.pos.z };
      if (h.hurtT > 0) hurt++;
    }
    out.push({ id, states: [...states], minGap: +minGap.toFixed(3), inWall, pastWall: +(maxZ - wallZ).toFixed(3), maxStep: +maxStep.toFixed(2), hitFrames: hurt });
    G.combatDir.grace = 1e9;
  }
  return out;
});
for (const l of lunges) {
  console.log('MEASURE lunge', JSON.stringify(l));
  check(`${l.id} attacking him against a wall: stops at his body (min gap ${l.minGap} m)`, l.minGap > -0.06, l);
  check(`${l.id} attacking him against a wall: he is never pushed into or through the wall (frames in it ${l.inWall}, ${l.pastWall} m past where he stood)`, l.inWall === 0 && l.pastWall < 0.05, l);
}
check('the attacks were really made (each enemy reached its attack)', lunges.every((l) => l.states.some((s) => /windup|lunge|bash|strike|slam/.test(s))), lunges.map((l) => l.id + ':' + l.states.join('/')));

// ---- pinned between a wall and an enemy: he walks out along the wall
const pinned = await ev(() => {
  const G = game, h = G.hero, out = {};
  const e = S.E('a_guardG'); S.only(['a_guardG']); S.hold(e);
  S.putH(6192, 9, 0); for (let t = 0; t < 2; t += 1 / 60) { S.clearKeys(); G.input.keys.add('ArrowUp'); G.step(1 / 60); } S.clearKeys();
  S.putE(e, h.pos.x, h.pos.z - S.R(e) + 0.01, 0);
  const x0 = h.pos.x;
  h.angle = Math.PI / 2; G.step(1 / 60);   // (turned along the wall)
  for (let t = 0; t < 1.5; t += 1 / 60) { S.clearKeys(); G.input.keys.add('ArrowUp'); G.step(1 / 60); }
  S.clearKeys(); S.hold(e, false);
  out.moved = +Math.abs(h.pos.x - x0).toFixed(2);
  return out;
});
check(`pinned between the wall and a Grobo guard, he walks out along the wall (${pinned.moved} m in 1.5 s)`, pinned.moved > 1.5, pinned);

// ---- cost
const cost = await ev(() => {
  const G = game, h = G.hero;
  const all = S.KINDS.concat(['a_dummy', 'a_target']);
  S.only(all);
  S.putE(S.E('a_dummy'), 6210, 9, 0); S.putE(S.E('a_target'), 6212, 9, 0);
  for (const id of all) { const e = S.E(id); S.hold(e); }
  // every enemy within 3 m of him (on a ring), then all far away
  S.putH(6192, 7, 0);
  S.KINDS.forEach((id, i) => { const a = (i / S.KINDS.length) * Math.PI * 2, e = S.E(id); S.putE(e, 6192 + Math.sin(a) * 2.2, 7 + Math.cos(a) * 2.2, 0); });
  const time = (n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { h.prevPos.copy(h.pos); h.keepApart(1 / 60); } return ((performance.now() - t0) / n) * 1000; };
  time(200); const near = time(4000), nearList = h.contacts([]).length;
  S.KINDS.forEach((id, i) => S.putE(S.E(id), 6200 + i, -9, 0));
  time(200); const farT = time(4000), farList = h.contacts([]).length;
  const tEnemy = (n) => { const e = S.E('a_guard'); const t0 = performance.now(); for (let i = 0; i < n; i++) e.keepOffHero(1 / 60); return ((performance.now() - t0) / n) * 1000; };
  const off = tEnemy(4000);
  // the enemies' part of it: the same with the enemy list empty
  const keep = G.enemies; G.enemies = []; time(200); const noEnemies = time(4000); G.enemies = keep;
  for (const id of all) S.hold(S.E(id), false);
  return { nearUs: +near.toFixed(2), nearList, farUs: +farT.toFixed(2), farList, noEnemiesUs: +noEnemies.toFixed(2), enemyPartFarUs: +(farT - noEnemies).toFixed(2), keepOffUs: +off.toFixed(3) };
});
console.log('MEASURE cost', JSON.stringify(cost));
check(`the contact test is cheap: ${cost.nearUs} µs a frame with ${cost.nearList} bodies near him; with every enemy far ${cost.farUs} µs, of which the enemies' part ${cost.enemyPartFarUs} µs; an enemy's own test ${cost.keepOffUs} µs`, cost.nearUs < 80 && cost.farList === 0 && cost.enemyPartFarUs < 5 && cost.keepOffUs < 5, cost);

done();
await browser.close();
