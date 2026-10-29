// SOLID-NPC (the user, 29.10: "we need to make sure Twinsen doesn't pass through characters"). Twinsen is kept out of
// every person's body (Hero.keepApart; the girth per race: actors.js contactRadius) and pets' (dogs.js), slides round
// them, and can still talk to them. Played on the real game with the player's own keys (Classic: turn and walk; Modern:
// the camera-relative arrows), deterministic stepping (game.step) at 30, 60 and 144 fps and with long frames:
//   - into a Grobo resident, a Sphero, a story person (head on and off centre): never inside their circle, slides round,
//     no jitter, never launched, gets past; talks to them after
//   - a walking resident head on and from the side; a resident walking at Twinsen standing still (it gives way)
//   - a resident he presses on gives way; a story person stays where the story put them
//   - residents never overlap each other or the story's people (two minutes of the town, everyone simulated)
//   - the residents' bench sit: nobody sits inside a bench (no part of the body in the bench's collider)
//   - props: the small Citadel props have colliders (he stops at a planter, a flower tub) and paths stay open
// ISO (logged): Twinsen is put at each start point (a test placement, not play); the residents are held at their stop
// where a test needs a person who stands still. SHOTS=dir writes captures.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, done } = checker({ info: 'always' });
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { if (!SHOTS) return; await ev(() => game.renderer.render()); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const iso = (s) => console.log('ISO  ' + s);
await open(page, '?nocine'); await menu(page, 'new');
await ev(() => { game.hero.hasBall = true; P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true }); game.exitRoom({ x: -42, z: 8, a: 0 }, true, true); game.step(0.5); });

// ---- the harness: walk Twinsen at a body with the player's keys and measure every frame
await ev(() => {
  const G = game, Pk = G.physics, keys = G.input.keys;
  const SN = (window.SN = {});
  SN.npc = (id) => G.npcs.find((n) => n.def.id === id);
  // the girth Twinsen must stay out of: the body's own (the game's bodyR; a build without one is measured against the
  // same girths, so a run on an older build shows its overlaps)
  const GIRTH = { grobo: 0.62, sphero: 0.6, bunny: 0.4, quetch: 0.45, esmer: 0.42, elf: 0.42, fclone: 0.5 };
  SN.LOOKS = null; import('/src/game/characters.js').then((m) => { SN.LOOKS = m.LOOKS; });
  SN.R = (b) => G.hero.radius + (b.bodyR ?? (b.def?.char && SN.LOOKS?.[b.def.char] ? (SN.LOOKS[b.def.char].radius ?? GIRTH[SN.LOOKS[b.def.char].race] ?? 0.45) * b.rig.root.scale.x : b.radius));
  // ISO: put Twinsen at (x, z) facing a, standing still
  SN.put = (x, z, a) => { const h = G.hero; P.release(); h.pos.set(x, Pk.groundAt(x, z, h.pos.y + 5), z); h.prevPos.copy(h.pos); h.angle = a; h.resetMotion(); h.onGround = true; h.vy = 0; h.passing = null; h.pressT = 0; h.sync(); G.step(1 / 30); };
  // a free approach to a body: the direction (of 16) whose 6 m line to it is clear of bricks and of other people
  SN.approach = (b, len = 6, alone = true) => {
    const h = G.hero, out = [];
    // (a body on its own: nobody else within 2.2 m, so going round it is going round one person)
    if (alone && G.npcs.some((n) => n !== b && n.present && Math.hypot(n.pos.x - b.pos.x, n.pos.z - b.pos.z) < 2.2)) return out;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a);
      let ok = true;
      for (let s = -1.0; s <= len && ok; s += 0.25) {
        const x = b.pos.x - ux * s, z = b.pos.z - uz * s;
        for (const w of [-0.6, 0, 0.6]) { const px = x + uz * w, pz = z - ux * w; if (Pk.blockedAt(px, pz, b.pos.y, 0.45) || Math.abs(Pk.groundAt(px, pz, b.pos.y + 0.5) - b.pos.y) > 0.4) ok = false; }
        for (const n of G.npcs) if (n !== b && n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 1.1) ok = false;
      }
      if (ok) out.push(a);
    }
    return out;
  };
  // walk with the keys toward a moving or standing body (the direction fixed at the start: the player holds a heading)
  // mode: 'classic' (face, hold Up) | 'modern' (the arrow pair nearest the heading, read against the view each frame)
  SN.walk = (b, { a, off = 0, from = 3.5, T = 4, dt = 1 / 60, mode = 'classic', long = 0, run = false } = {}) => {
    const h = G.hero, ux = Math.sin(a), uz = Math.cos(a), px = uz, pz = -ux;
    const sx = b.pos.x - ux * from + px * off, sz = b.pos.z - uz * from + pz * off;
    G.settings.controls = mode;
    if (run) h.setBehaviour('athletic'); else h.setBehaviour('normal');
    SN.put(sx, sz, a);
    const R = SN.R(b), m = { minGap: 9, maxStep: 0, flips: 0, contactT: 0, frames: 0, along0: 0, along: 0, passed: false, overlapFrames: 0, bMoved: 0, lastSide: 0, side: [] };
    const bx0 = b.pos.x, bz0 = b.pos.z;
    let prevLat = null, prev = { x: h.pos.x, z: h.pos.z };
    const lat0 = (h.pos.x - b.pos.x) * px + (h.pos.z - b.pos.z) * pz;
    for (let t = 0; t < T; t += dt) {
      keys.delete('ArrowUp'); keys.delete('ArrowDown'); keys.delete('ArrowLeft'); keys.delete('ArrowRight');
      if (mode === 'classic') { keys.add('ArrowUp'); h.angle += Math.max(-0.05, Math.min(0.05, Math.atan2(Math.sin(a - h.angle), Math.cos(a - h.angle)))) * 0; }
      else {
        const yaw = G.camRig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        let best = null, bd = -9;
        for (const [kx, ky] of [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]) { const dx = rx * kx + fx * ky, dz = rz * kx + fz * ky, l = Math.hypot(dx, dz), s = (dx * ux + dz * uz) / l; if (s > bd) { bd = s; best = [kx, ky]; } }
        if (best[1] > 0) keys.add('ArrowUp'); if (best[1] < 0) keys.add('ArrowDown'); if (best[0] > 0) keys.add('ArrowRight'); if (best[0] < 0) keys.add('ArrowLeft');
      }
      const step = long && Math.round(t / dt) % 30 === 29 ? long : dt;   // (a long frame now and then)
      G.step(step, step); if (step !== dt) t += step - dt;
      const dx = h.pos.x - b.pos.x, dz = h.pos.z - b.pos.z, d = Math.hypot(dx, dz);
      m.minGap = Math.min(m.minGap, d - R); if (d < R - 0.02) m.overlapFrames++;
      const st = Math.hypot(h.pos.x - prev.x, h.pos.z - prev.z); m.maxStep = Math.max(m.maxStep, st / step); prev = { x: h.pos.x, z: h.pos.z };
      if (d < R + 0.05) {
        m.contactT += step;
        const lat = dx * px + dz * pz, vl = prevLat == null ? 0 : lat - prevLat;
        if (prevLat != null && Math.abs(vl) > 1e-4) { const s = Math.sign(vl); if (m.lastSide && s !== m.lastSide) m.flips++; m.lastSide = s; }
        prevLat = lat;
      } else prevLat = null;
      m.frames++;
    }
    P.release();
    m.along = (h.pos.x - b.pos.x) * ux + (h.pos.z - b.pos.z) * uz;   // > 0: past the body
    m.passed = m.along > R; m.bMoved = +Math.hypot(b.pos.x - bx0, b.pos.z - bz0).toFixed(2);
    m.lat0 = +lat0.toFixed(2); m.R = +R.toFixed(2);
    for (const k of ['minGap', 'maxStep', 'contactT', 'along']) m[k] = +m[k].toFixed(3);
    delete m.lastSide; delete m.side;
    G.settings.controls = 'classic';
    return m;
  };
  // talk: face the body from where he stands and press E (Classic: E talks)
  SN.talk = (b) => { const h = G.hero; h.angle = Math.atan2(b.pos.x - h.pos.x, b.pos.z - h.pos.z); G.step(1 / 30); const it = G.findInteractable(); P.tap('KeyE', 0.1); const st = G.state, who = it?.npc?.def.id; const d = Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z); P.settle(); return { st, who, d: +d.toFixed(2) }; };
  // hold a resident at its place (it stands at its stop and does not walk off during a test)
  SN.holdRes = (r, s = 60) => { r.hold = s; r.yieldT = 0; };
});

// ---- the radii (per race and size)
const radii = await ev(() => { const o = {}; for (const n of game.npcs) if (n.present && Math.abs(n.pos.x) < 300) o[n.def.id] = [n.def.char, n.bodyR ?? n.radius]; return o; });
console.log('contact radii (m):', JSON.stringify(radii));
check('the girth follows the body: a Grobo and a Sphero are wide (≥ 0.58 m), a Rabbibunny narrow (≤ 0.42 m), a child smaller than an adult of its race',
  radii.brix?.[1] >= 0.58 && radii.sphero1?.[1] >= 0.58 && radii.tilde?.[1] <= 0.42 && radii.mira?.[1] <= 0.42 && radii.pico?.[1] < radii.garrick?.[1], radii);

const report = [];
const walkCase = async (label, setup, opts, expect = {}) => {
  const r = await ev(({ setup, opts }) => {
    const ids = setup.id.split('|');
    let b = null;
    for (const id of ids) { const n = SN.npc(id); if (n && n.present && !n.sit && !n.inside && SN.approach(n, 6).length) { b = n; break; } }
    if (!b) return { err: 'no free approach to ' + setup.id };
    if (b.ambient) SN.holdRes(b, 120);
    const as = SN.approach(b, 6);
    if (!as.length) return { err: 'no free approach to ' + setup.id };
    const a = as[setup.pick != null ? Math.min(setup.pick, as.length - 1) : Math.floor(as.length / 2)];
    const m = SN.walk(b, { a, ...opts });
    if (b.ambient) b.hold = 0;
    return { id: b.def.id, a: +a.toFixed(2), ...m };
  }, { setup, opts });
  report.push([label, r]);
  console.log(label, JSON.stringify(r));
  if (r.err) { check(label + ': set up', false, r.err); return r; }
  check(`${label}: never inside the body (min gap ${r.minGap} m, overlapping frames ${r.overlapFrames})`, r.minGap > -0.03 && r.overlapFrames === 0, r);
  check(`${label}: never launched (fastest frame ${r.maxStep} m/s)`, r.maxStep < (opts.run ? 6.5 : 3.2), r.maxStep);
  check(`${label}: no jitter along the body (side changes in contact: ${r.flips})`, r.flips <= 1, r.flips);
  if (expect.pass) check(`${label}: slides round and gets past (${r.along} m beyond the centre)`, r.passed, r);
  return r;
};

iso('Twinsen is put 3.5 m from each body, facing it; the residents are held at their stop for these walks');
// a Grobo resident (Brix, Old Lane's bench-goer: a broad Grobo) — head on, a little off centre, well off centre
await walkCase('Grobo resident, head on (Classic, 60 fps)', { id: 'tobb|marda|brix|dot' }, { off: 0, T: 6 }, { pass: true });
await walkCase('Grobo resident, 0.4 m off centre (Classic, 30 fps)', { id: 'tobb|marda|brix|dot' }, { off: 0.4, T: 5, dt: 1 / 30 }, { pass: true });
await walkCase('Grobo resident, 0.8 m off centre (Modern, 144 fps)', { id: 'tobb|marda|brix|dot' }, { off: 0.8, T: 5, dt: 1 / 144, mode: 'modern' }, { pass: true });
await walkCase('Grobo resident, running (Athletic), long frames', { id: 'tobb|marda|brix|dot' }, { off: 0.3, T: 4, run: true, long: 0.1 }, { pass: true });
// a Sphero (a story person: the square's Sphero)
await walkCase('Sphero, head on (Classic, 60 fps)', { id: 'sphero1|sphero2' }, { off: 0, T: 6 }, { pass: true });
await walkCase('Sphero, 0.5 m off centre (Modern, 60 fps)', { id: 'sphero1|sphero2' }, { off: 0.5, T: 5, mode: 'modern' }, { pass: true });
// a story person (Gilbert by the well; Mira)
await walkCase('story person (Gilbert), head on', { id: 'gilbert|pippa|joe', pick: 0 }, { off: 0, T: 6 }, { pass: true });
await walkCase('story person (Mira), 0.3 m off centre, 30 fps with long frames', { id: 'mira|lulu|tim|zoe', pick: 0 }, { off: 0.3, T: 5, dt: 1 / 30, long: 0.12 }, { pass: true });
// a Rabbibunny resident (narrow)
await walkCase('Rabbibunny resident (Tilde), head on', { id: 'tilde|maro|ume' }, { off: 0, T: 6 }, { pass: true });

// two people standing close (the gap between them narrower than Twinsen): he walks into the gap, never into either,
// and stands still there instead of shuttling between them
{
  const pinch = await ev(() => { const G = game, Pk = G.physics;
    let best = null;
    for (const a of G.npcs) for (const b of G.npcs) {
      if (a === b || !a.present || !b.present || a.ambient || b.ambient || Math.abs(a.pos.x) > 300) continue;
      const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z), gap = d - a.bodyR - b.bodyR;
      if (gap > 0.1 && gap < 2 * G.hero.radius - 0.05 && (!best || d < best.d)) best = { a, b, d };
    }
    if (!best) return { err: 'no two people close together' };
    const { a, b } = best, mx = (a.pos.x + b.pos.x) / 2, mz = (a.pos.z + b.pos.z) / 2, ex = (b.pos.x - a.pos.x) / best.d, ez = (b.pos.z - a.pos.z) / best.d;
    let res = null;
    for (const sgn of [1, -1]) {
      const ang = Math.atan2(-ez * sgn, ex * sgn);   // across the line between them
      const ux = Math.sin(ang), uz = Math.cos(ang);
      let ok = true; for (let s2 = 0.5; s2 < 3.5; s2 += 0.25) if (Pk.blockedAt(mx - ux * s2, mz - uz * s2, a.pos.y, 0.45)) ok = false;
      if (!ok) continue;
      const mid = { pos: { x: mx, z: mz }, bodyR: 0, radius: 0 };
      SN.put(mx - ux * 3, mz - uz * 3, ang);
      const h = G.hero; let minA = 9, minB = 9, flips = 0, lastS = 0, prev = h.pos.x * ex + h.pos.z * ez, maxStep = 0, px = h.pos.x, pz = h.pos.z;
      for (let t = 0; t < 4; t += 1 / 60) {
        G.input.keys.add('ArrowUp'); G.step(1 / 60, 1 / 60);
        minA = Math.min(minA, Math.hypot(h.pos.x - a.pos.x, h.pos.z - a.pos.z) - SN.R(a)); minB = Math.min(minB, Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z) - SN.R(b));
        const lat = h.pos.x * ex + h.pos.z * ez, dl = lat - prev; prev = lat;
        if (Math.abs(dl) > 2e-3) { const sg = Math.sign(dl); if (lastS && sg !== lastS) flips++; lastS = sg; }
        maxStep = Math.max(maxStep, Math.hypot(h.pos.x - px, h.pos.z - pz) * 60); px = h.pos.x; pz = h.pos.z;
      }
      P.release();
      res = { a: a.def.id, b: b.def.id, gap: +(best.d - a.bodyR - b.bodyR).toFixed(2), minA: +minA.toFixed(3), minB: +minB.toFixed(3), flips, maxStep: +maxStep.toFixed(2) };
      break;
    }
    return res || { err: 'no free side' };
  });
  console.log('pinch', JSON.stringify(pinch));
  check('two people standing closer than his width: he never gets into either, never shuttles between them (side changes ' + pinch.flips + ')', !pinch.err && pinch.minA > -0.03 && pinch.minB > -0.03 && pinch.flips <= 2 && pinch.maxStep < 3.2, pinch);
}

const story = report.filter(([l]) => /story person|Sphero/.test(l)).map(([, r]) => r.bMoved);
check('the story\'s people stay where the story put them (never moved by him)', story.every((d) => d < 0.01), story);

// ---- talking: he can still get within talk range of each (the girth leaves the interaction distance reachable)
const talks = await ev(() => { const out = {};
  for (const ids of ['tobb|marda|dot', 'sphero1|sphero2', 'gilbert|pippa|joe', 'tilde|maro|ume']) {
    let b = null; for (const id of ids.split('|')) { const n = SN.npc(id); if (n && n.present && !n.sit && !n.inside && SN.approach(n, 4).length) { b = n; break; } }
    const id = b?.def.id || ids; if (!b) { out[id] = { err: 'no approach' }; continue; }
    if (b.ambient) SN.holdRes(b, 60);
    const as = SN.approach(b, 4); if (!as.length) { out[id] = { err: 'no approach' }; continue; }
    SN.walk(b, { a: as[0], off: 0.05, T: 1.6, from: 2.5 });
    out[id] = SN.talk(b);
    if (b.ambient) b.hold = 0;
  }
  return out; });
console.log('talk', JSON.stringify(talks));
check('walking up to each (Grobo, Sphero, story person, Rabbibunny) and pressing E starts the talk with them', Object.keys(talks).length === 4 && Object.entries(talks).every(([id, t]) => t.st === 'dialog' && t.who === id), talks);

// ---- a walking resident head on and from the side
const walking = await ev(() => { const G = game, W = G.walkers, h = G.hero, out = [];
  W.force = 0;
  // a resident on a long straight leg (2.5 m ahead of it at least), in the open
  const pickWalker = (minLeft = 6) => {
    for (let k = 0; k < 900; k++) {
      for (const r of W.res) {
        if (r.st !== 'walk' || !r.path || r.tier !== 0 || Math.abs(r.pos.x) > 300) continue;
        const w = r.path[Math.min(r.wi, r.path.length - 1)], d = Math.hypot(w.x - r.pos.x, w.z - r.pos.z);
        if (d > minLeft) return r;
      }
      G.step(1 / 30);
    }
    return null;
  };
  for (const kind of ['head on', 'from the side', 'standing in its way']) {
    const r = pickWalker(); if (!r) { out.push({ kind, err: 'no walker on a long leg' }); continue; }
    const w = r.path[r.wi], ux = (w.x - r.pos.x), uz = (w.z - r.pos.z), l = Math.hypot(ux, uz), dx = ux / l, dz = uz / l;
    const R = SN.R(r), m = { kind, id: r.def.id, minGap: 9, overlap: 0, heroMoved: 0, maxStep: 0, rMoved: 0, ri0: r.ri, wi0: r.wi };
    const r0 = { x: r.pos.x, z: r.pos.z };
    let hx, hz, ha;
    if (kind === 'head on') { hx = r.pos.x + dx * 5; hz = r.pos.z + dz * 5; ha = Math.atan2(-dx, -dz); }
    else if (kind === 'from the side') { const t = 2.4 * r.speed; hx = r.pos.x + dx * t + dz * 3.2; hz = r.pos.z + dz * t - dx * 3.2; ha = Math.atan2(-dz, dx); }
    else { hx = r.pos.x + dx * 4; hz = r.pos.z + dz * 4; ha = Math.atan2(-dx, -dz); }
    if (G.physics.blockedAt(hx, hz, h.pos.y, 0.5)) { out.push({ kind, err: 'start in a brick' }); continue; }
    SN.put(hx, hz, ha);
    const hs = { x: h.pos.x, z: h.pos.z };
    let prev = { x: h.pos.x, z: h.pos.z };
    const TT = kind === 'standing in its way' ? 20 : 6;
    for (let t = 0; t < TT; t += 1 / 60) {
      if (kind !== 'standing in its way') G.input.keys.add('ArrowUp');
      G.step(1 / 60, 1 / 60);
      const d = Math.hypot(h.pos.x - r.pos.x, h.pos.z - r.pos.z);
      m.minGap = Math.min(m.minGap, d - R); if (d < R - 0.02) m.overlap++;
      m.maxStep = Math.max(m.maxStep, Math.hypot(h.pos.x - prev.x, h.pos.z - prev.z) * 60); prev = { x: h.pos.x, z: h.pos.z };
    }
    P.release();
    m.heroMoved = +Math.hypot(h.pos.x - hs.x, h.pos.z - hs.z).toFixed(2);
    m.rMoved = +Math.hypot(r.pos.x - r0.x, r.pos.z - r0.z).toFixed(2); m.st = r.st; m.past = (r.pos.x - hx) * dx + (r.pos.z - hz) * dz > 0.5; m.on = r.ri !== m.ri0 || r.st !== 'walk' || r.wi > m.wi0 || m.past;
    m.minGap = +m.minGap.toFixed(3); m.maxStep = +m.maxStep.toFixed(2);
    out.push(m);
  }
  W.force = null;
  return out; });
for (const m of walking) console.log('walker', JSON.stringify(m));
for (const m of walking) {
  if (m.err) { check(`walking resident ${m.kind}: set up`, false, m.err); continue; }
  check(`walking resident ${m.kind} (${m.id}): never overlapping (min gap ${m.minGap} m)`, m.minGap > -0.03 && m.overlap === 0, m);
  check(`walking resident ${m.kind}: never launched (${m.maxStep} m/s)`, m.maxStep < 3.2, m.maxStep);
  if (m.kind === 'standing in its way') check('a resident walking at Twinsen standing still goes round him: he is not moved (more than an ease of 0.1 m) and it carries on', m.heroMoved < 0.1 && m.rMoved > 1.5 && m.on, m);
}

// ---- a resident he presses on gives way; nothing pushes a resident through a wall
const give = await ev(() => { const G = game, W = G.walkers, h = G.hero;
  const r = SN.npc('garrick');   // (the gardener, at his flower bed or the well)
  const a = SN.approach(r, 6, false)[0];
  SN.holdRes(r, 30); const st = r.st;
  const s0 = { x: r.pos.x, z: r.pos.z };
  const m = SN.walk(r, { a, off: 0, T: 3 });
  const inBrick = G.physics.blockedAt(r.pos.x, r.pos.z, r.pos.y, 0.3);
  r.hold = 0;
  return { st, gave: r.log.some((l) => l.includes('gives way')), moved: +Math.hypot(r.pos.x - s0.x, r.pos.z - s0.z).toFixed(2), inBrick, minGap: m.minGap, passed: m.passed };
});
console.log('give way', JSON.stringify(give));
check('a resident standing at its stop that Twinsen walks on into steps out of his way (not into a wall), and he never overlaps it', give.gave && give.moved > 0.3 && give.minGap > -0.03 && !give.inBrick, give);

// ---- the town: residents never overlap each other or the story's people (two minutes, everyone simulated)
const town = await ev(() => { const G = game, W = G.walkers; W.force = 0;
  const C = W.res.filter((r) => r.stops.length && Math.abs(r.stops[0].x) < 300);
  const story = G.npcs.filter((n) => !n.ambient && n.present && Math.abs(n.pos.x) < 300);
  let rr = 0, rs = 0, worstRR = 9, worstRS = 9, frames = 0; const pairs = new Set();
  for (let t = 0; t < 120; t += 1 / 30) {
    G.step(1 / 30); frames++;
    for (let i = 0; i < C.length; i++) {
      const a = C[i]; if (!a.present || a.inside) continue;
      for (let j = i + 1; j < C.length; j++) { const b = C[j]; if (!b.present || b.inside) continue; const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z), R = SN.R(a) - G.hero.radius + SN.R(b) - G.hero.radius; worstRR = Math.min(worstRR, d - R); if (d < R * 0.8) { rr++; pairs.add(a.def.id + '/' + b.def.id); } }
      for (const s of story) { const d = Math.hypot(a.pos.x - s.pos.x, a.pos.z - s.pos.z), R = SN.R(a) - G.hero.radius + SN.R(s) - G.hero.radius; worstRS = Math.min(worstRS, d - R); if (d < R) { rs++; pairs.add(a.def.id + '/' + s.def.id); } }
    }
  }
  W.force = null;
  return { frames, rr, rs, worstRR: +worstRR.toFixed(2), worstRS: +worstRS.toFixed(2), pairs: [...pairs] }; });
console.log('town', JSON.stringify(town));
check('over two minutes of the town no resident walks into another (deeper than a fifth of their girths) or into a story person', town.rr === 0 && town.rs === 0, town);


// ---- props (the user, 29.10: Twinsen stood inside a planter box by the sign post south of the square): the small things he
// could walk into are solid: he walks at each (head on and glancing) and never gets inside its collider; low ones are not a
// step he climbs. The list of solid small props is printed.
iso('Twinsen is put 3 m from each prop, facing it (Classic keys held)');
const props = await ev(() => { const G = game, Pk = G.physics, T = Pk.terrain;
  const list = Pk.colliders.filter((c) => c.enabled && c.block && Math.abs(c.x) < 300);
  const kinds = {};
  for (const c of list) { const h = c.top - T.heightAt(c.x, c.z), k = `${c.type} ${c.type === 'cyl' ? 'r' + c.r.toFixed(2) : c.hw.toFixed(2) + 'x' + c.hd.toFixed(2)} h${h.toFixed(1)}`; kinds[k] = (kinds[k] || 0) + 1; }
  return { n: list.length, kinds }; });
console.log('solid small props on Citadel (block colliders):', props.n, JSON.stringify(props.kinds));
const propWalk = await ev(() => { const G = game, Pk = G.physics, h = G.hero, keys = G.input.keys, out = [];
  const pick = (x, z) => Pk.colliders.filter((c) => c.enabled && c.block).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  const twin = (lx, lz) => { const H = G.world.houses.find((q) => q.id === 'twinsen'); return [H.x + Math.cos(H.ry) * lx + Math.sin(H.ry) * lz, H.z - Math.sin(H.ry) * lx + Math.cos(H.ry) * lz]; };
  const targets = [['planter box (the spaceport bridge\'s foot)', -36.0, 36.6], ['planter box (the lane)', -48.3, 47.9], ['flower tub (the lane\'s resting spot)', -42.3, 18.0], ['flower tub (yellow, the bridge\'s foot)', -33.6, 36.2],
    ['red bench (a red slatted one)', 'redbench'], ['flower pot (Twinsen\'s garden)', ...twin(1.6, 4.3)], ['flower pot (Twinsen\'s garden, by the fence)', ...twin(-0.6, 5.0)], ['Bug St. sign', ...twin(4.6, 6.0)], ['garden fence', ...twin(-3.0, 5.6)]];
  for (const [name, tx, tz] of targets) {
    const cands = tx === 'redbench' ? Pk.colliders.filter((q) => q.enabled && q.block && q.type === 'box' && Math.abs(q.hw - 0.85) < 0.01 && Math.abs(q.hd - 0.3) < 0.01 && Math.abs(q.x) < 300) : [pick(tx, tz)];
    let res = null;
    for (const c of cands) {
    if (res) break;
    if (!c || (tx !== 'redbench' && Math.hypot(c.x - tx, c.z - tz) > 1.5)) { out.push({ name, err: 'no block collider near ' + tx.toFixed(1) + ',' + tz.toFixed(1) }); continue; }
    // a free side to come from (12 directions, the 3 m before it clear, away from house doors)
    for (let i = 0; i < 24 && !res; i++) {
      const a = ((i % 12) / 12) * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a), gy = Pk.terrain.heightAt(c.x, c.z), from = i < 12 ? 3 : 1.6;   // (3 m off; in a cramped corner 1.6 m)
      let ok = true; for (let s = 1.0; s <= from + 0.2; s += 0.2) { if ((G.world.houses || []).some((q) => q.door && Math.hypot(q.door.x - (c.x - ux * s), q.door.z - (c.z - uz * s)) < 1.3)) ok = false; const x = c.x - ux * s, z = c.z - uz * s; if (Pk.blockedAt(x, z, Pk.groundAt(x, z, gy + 0.5), 0.45) || Math.abs(Pk.groundAt(x, z, gy + 0.5) - gy) > 0.4) ok = false; for (const n of G.npcs) if (n.present && Math.hypot(n.pos.x - x, n.pos.z - z) < 1.3) ok = false; }
      if (!ok) continue;
      const r1 = [];
      for (const off of [0, 0.25]) {
        if (from < 3 && off) continue;
        const sx = c.x - ux * from + uz * off, sz = c.z - uz * from - ux * off;
        SN.put(sx, sz, a);
        let pen = 0, maxStep = 0, px = h.pos.x, pz = h.pos.z, onIt = 0; const room0 = G.room?.id;
        for (let t = 0; t < 3; t += 1 / 60) { keys.add('ArrowUp'); G.step(1 / 60, 1 / 60); const p = Pk._push(c, h.pos.x, h.pos.z, h.radius); if (p) pen = Math.max(pen, Math.hypot(p.x, p.z)); maxStep = Math.max(maxStep, Math.hypot(h.pos.x - px, h.pos.z - pz) * 60); px = h.pos.x; pz = h.pos.z; if (h.pos.y >= c.top - 0.08 && Pk._inside(c, h.pos.x, h.pos.z, 0.05)) onIt++; }
        P.release();
        r1.push({ off, pen: +pen.toFixed(3), maxStep: +maxStep.toFixed(2), onIt, room: G.room?.id === room0, along: +(((h.pos.x - c.x) * ux + (h.pos.z - c.z) * uz)).toFixed(2) });
      }
      res = { name, a: +a.toFixed(2), runs: r1 };
    }
    }
    out.push(res || { name, err: 'no free side' });
  }
  return out; });
for (const m of propWalk) console.log('prop', JSON.stringify(m));
check('Twinsen walking into each small prop (planter boxes, flower tubs, a red bench, garden pots, the street sign, the garden fence) never gets inside it, never climbs it, never jumps',
  propWalk.every((m) => !m.err && m.runs.every((q) => q.pen < 0.03 && q.maxStep < 3.2 && q.onIt === 0 && q.room)), propWalk);

// ---- the residents' bench sit (the user, 29.10: a Rabbibunny sat inside a bench, through the backrest and the seat):
// every bench stop of every round, the resident seated there; its posed body checked against the bench's own parts:
// nothing under the seat's top over the seat (legs through the seat), nothing behind the backrest's face (body through
// the back), and the bottom resting on the seat (within 6 cm over it). Citadel's and Zeelich's (Kesh's round has no bench).
iso('each resident is seated at each of its benches in turn (its stop given at once); the others are off the streets meanwhile');
const benchCheck = async (filter, shotsOK) => {
  const list = await ev((filter) => { const out = []; for (const r of game.walkers.res) r.stops.forEach((s, i) => { if (s.seat && (filter === 'citadel' ? Math.abs(s.x) < 300 : Math.abs(s.x - 2400) < 300)) out.push([r.def.id, i, s.id]); }); return out; }, filter);
  const res = [];
  for (const [id, i, sid] of list) {
    const m = await ev(async ({ id, i }) => { const THREE = await import('three');
      const G = game, W = G.walkers, r = W.res.find((q) => q.def.id === id), s = r.stops[i];
      W.force = 0; for (const q of W.res) if (q !== r) q.away = 'test';
      r.engaged = false; r.hold = 0; r.yieldT = 0;
      // (what it carries as it comes to this bench in its round: the basket from the stall, say)
      let carry = null; for (let k = 1; k <= r.stops.length; k++) { const q = r.stops[(i - k + r.stops.length) % r.stops.length]; if (q.carry !== undefined) { carry = q.carry; break; } }
      r.carrySet(carry);
      r.ri = i; r.slotAt(s); r.arrived(s, true); r.tmr = 999;
      const h = G.hero; h.pos.set(s.x + 6, G.physics.groundAt(s.x + 6, s.z + 6, h.pos.y + 5), s.z + 6); h.prevPos.copy(h.pos); h.sync();
      G.step(1.5, 1 / 30); r.tmr = 999;
      const seat = s.seat, sp = seat.spec || { seatY: 0.485, back: -0.25, front: 0.225 }, base = r.sit?.ya ?? r.pos.y, top = base + sp.seatY;
      const ca = Math.cos(seat.a), sa = Math.sin(seat.a);
      // into the bench's frame: x along the bench, z the way the sitter faces
      const root = r.rig.root; root.updateMatrixWorld(true);
      let n = 0, under = 0, behind = 0, lowest = 9, deep = 0, dy = 0; const v = new THREE.Vector3();
      root.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return; const pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000));
        for (let k = 0; k < pa.count; k += st) { v.fromBufferAttribute(pa, k); if (o.isSkinnedMesh) o.applyBoneTransform(k, v); v.applyMatrix4(o.matrixWorld);
          const dx = v.x - seat.x, dz = v.z - seat.z, bx = dx * ca - dz * sa, bz = dx * sa + dz * ca, y = v.y; n++;
          if (Math.abs(bx) > 0.85) continue;
          if (bz > sp.back && bz < sp.front && y > base + 0.02 && y < top - 0.012) under++;
          if (bz < sp.back - 0.012 && y > top + 0.02 && y < top + 0.5) { behind++; deep = Math.max(deep, sp.back - bz); dy = y - top; }
          if (bz > sp.back && bz < sp.front) lowest = Math.min(lowest, y - top); } });
      const st = r.st;
      for (const q of W.res) q.away = null;
      return { id, sid: s.id, char: r.def.char, carry, st, n, under, behind, deep: +deep.toFixed(3), dy: +dy.toFixed(2), rest: +lowest.toFixed(3), pos: [r.pos.x, r.pos.y, r.pos.z], a: r.angle };
    }, { id, i });
    res.push(m);
    console.log('bench', JSON.stringify(m));
    if (SHOTS && shotsOK) for (const [view, ang, dist, hgt] of [['front', 0.6, 2.6, 1.3], ['side', 1.5, 2.4, 1.0]]) {
      await ev(({ m, ang, dist, hgt }) => { const G = game, c = G.camera, a = m.a + ang;
        c.position.set(m.pos[0] + Math.sin(a) * dist, m.pos[1] + hgt, m.pos[2] + Math.cos(a) * dist); c.lookAt(m.pos[0], m.pos[1] + 0.5, m.pos[2]); c.updateMatrixWorld();
        G.hero.rig.root.visible = false; G.renderer.render(); G.hero.rig.root.visible = true; }, { m, ang, dist, hgt });
      await page.screenshot({ path: path.join(SHOTS, `bench-${m.sid}-${m.id}-${view}.png`) });
    }
  }
  return res;
};
const benchC = await benchCheck('citadel', true);
check(`Citadel: every resident seated at each of its ${benchC.length} bench stops sits ON the seat: no part of the body under the seat's top or behind the backrest, the bottom resting on the seat`,
  benchC.length >= 10 && benchC.every((m) => m.st === 'seated' && m.under === 0 && m.behind === 0 && m.rest > -0.015 && m.rest < 0.06), benchC.map((m) => [m.sid, m.char, m.under, m.behind, m.rest]));

// Zeelich's street (built for this check; its benches are of their own shape) — numbers only, no captures (not a chapter 1–2 place)
const zb = await ev(async () => { const G = game; await G.regions.buildAsync(['zeelich'], 'test', async () => {}); G.enterRoom('zeelich', null, true, true); G.step(1.0);
  return G.walkers.res.filter((r) => ['ilo', 'aven', 'kira'].includes(r.def.id)).map((r) => r.stops.length); });
console.log('zeelich rounds', JSON.stringify(zb));
const benchZ = await benchCheck('zeelich', false);
check(`Zeelich: every resident seated at each of its ${benchZ.length} bench stops sits on the seat (nothing under it or behind the back, resting on it)`,
  benchZ.length >= 3 && benchZ.every((m) => m.st === 'seated' && m.under === 0 && m.behind === 0 && m.rest > -0.015 && m.rest < 0.06), benchZ.map((m) => [m.sid, m.char, m.under, m.behind, m.rest]));
console.log('Kesh: its residents\' rounds have no bench stop (walkrounds.js desertRoster), nothing to sit on there');

await shot('solidnpc-end');
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
