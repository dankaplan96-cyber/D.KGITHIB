// Player-input harness for the regression playthrough (loaded into the page by tests/lib/boot.mjs).
//
// Everything here drives the game the way a player does: it holds and taps keys in the game's input set (the same
// set the keydown/keyup listeners fill: G.input.keys / G.input.taps) and lets simulated time pass with game.step.
// It never teleports the hero, sets story flags or gives items. Navigation plans a path with A* over the game's
// own collision rules (each step is checked with physics.move from the hero's height, exactly as the hero moves)
// and then steers with the default Classic (tank) controls: Left/Right turn, Up walks. If the hero gets stuck
// the route is planned again from where he stands.
(() => {
  const G = window.game, I = G.input, PH = G.physics;
  const P = (window.P = { trace: [] });
  const DT = 1 / 30;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const hero = () => G.hero;
  const keys = I.keys;
  P.note = (s) => { P.trace.push(`[${G.time.toFixed(1)}] ${s}`); if (P.trace.length > 4000) P.trace.shift(); };

  // ---- raw input
  P.release = () => { keys.clear(); };
  P.tap = (code, after = 1 / 30) => { keys.add(code); I.taps.add(code); G.step(1 / 60); keys.delete(code); G.step(after); };
  P.holdFor = (codes, s) => { for (const c of codes) keys.add(c); G.step(s); for (const c of codes) keys.delete(c); };
  P.wait = (s) => { G.step(s); };

  // until play resumes: advance dialogue with E (Classic: W/E talk and advance), let cut-scenes and fades run
  P.settle = (maxT = 120) => {
    P.release();
    let t = 0, lines = 0;
    while (t < maxT) {
      if (G.state === 'play' && !G.trans) { G.step(0.1); if (G.state === 'play' && !G.trans) break; }
      if (G.state === 'dialog') { P.tap('KeyE', 0.12); lines++; t += 0.15; continue; }
      if (G.state === 'pause' || G.state === 'gameover' || G.state === 'ending' || G.state === 'title') break;
      G.step(0.1); t += 0.1;
    }
    return { state: G.state, lines };
  };

  // ---- navigation
  const probe = { pos: new (G.hero.pos.constructor)(), radius: 0.45, onGround: true, vy: 0 };
  // can the hero step from (x, y, z) to (nx, nz)? → the new height, or null
  const stepTo = (x, y, z, nx, nz) => {
    probe.radius = hero().radius; probe.pos.set(x, y, z); probe.onGround = true;
    PH.move(probe, nx - x, nz - z);
    if (Math.hypot(probe.pos.x - nx, probe.pos.z - nz) > 0.04) return null;
    const ny = PH.groundAt(nx, nz, y);
    if (ny < y - 2.2) return null;                 // a drop that would hurt
    if (PH.steepAt(nx, nz, ny)) return null;       // he'd slide
    return ny;
  };
  // is a spot next to a slope he'd slide on, or a wall? (paths keep a margin from both)
  const edgy = (x, y, z, m = 0.4) => {
    for (const [ox, oz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) {
      const gy = PH.groundAt(x + ox, z + oz, y);
      if (PH.steepAt(x + ox, z + oz, gy) || gy < y - 0.8 || PH.blockedAt(x + ox, z + oz, y, 0.05)) return true;
    }
    return false;
  };
  // straight walk possible? (for smoothing the A* path)
  const lineOK = (a, b) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.3));
    let x = a.x, y = a.y, z = a.z;
    for (let i = 1; i <= n; i++) {
      const nx = a.x + (b.x - a.x) * i / n, nz = a.z + (b.z - a.z) * i / n;
      const ny = stepTo(x, y, z, nx, nz);
      if (ny == null || Math.abs(ny - y) > 0.6) return false;
      if (edgy(nx, ny, nz, 0.3) && !edgy(a.x, a.y, a.z, 0.3)) return false;
      x = nx; y = ny; z = nz;
    }
    return Math.abs(y - b.y) < 0.7;
  };
  P.plan = (tx, tz, { cell = 0.4, maxNodes = 60000, tol = 0.5 } = {}) => {
    const h = hero(), sx = h.pos.x, sz = h.pos.z;
    const key = (ix, iz, y) => ix + ',' + iz + ',' + Math.round(y * 2);
    // binary heap of [f, key]
    const heap = [];
    const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const best = new Map(), from = new Map(), node = new Map(), closed = new Set(), edge = new Map();
    const start = { ix: 0, iz: 0, x: sx, y: h.pos.y, z: sz, g: 0 };
    const k0 = key(0, 0, start.y);
    node.set(k0, start); best.set(k0, 0);
    const hfun = (x, z) => Math.hypot(x - tx, z - tz);
    push([hfun(sx, sz), k0]);
    let n = 0, goal = null, closest = null, cd = 1e9;
    while (heap.length && n < maxNodes) {
      const [, k] = pop(); if (closed.has(k)) continue; closed.add(k);
      const c = node.get(k); n++;
      const dg = hfun(c.x, c.z);
      if (dg < cd) { cd = dg; closest = k; }
      if (dg <= tol) { goal = k; break; }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const nx = sx + (c.ix + dx) * cell, nz = sz + (c.iz + dz) * cell;
        const ny = stepTo(c.x, c.y, c.z, nx, nz);
        if (ny == null) continue;
        const nk = key(c.ix + dx, c.iz + dz, ny);
        if (closed.has(nk)) continue;
        let e = edge.get(nk); if (e === undefined) { e = edgy(nx, ny, nz); edge.set(nk, e); }
        const g = c.g + Math.hypot(dx, dz) * cell * (e ? 3 : 1) + (ny < c.y - 0.6 ? 0.5 : 0);
        if (g >= (best.get(nk) ?? 1e18)) continue;
        best.set(nk, g); from.set(nk, k); node.set(nk, { ix: c.ix + dx, iz: c.iz + dz, x: nx, y: ny, z: nz, g });
        push([g + hfun(nx, nz) * 1.2, nk]);
      }
    }
    const end = goal || closest;
    const pts = [];
    for (let k = end; k; k = from.get(k)) { const c = node.get(k); pts.push({ x: c.x, y: c.y, z: c.z }); }
    pts.reverse();
    // string-pull: keep only the corners
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + 40);
      while (j > i + 1 && !lineOK(pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    return { ok: !!goal, nodes: n, left: +cd.toFixed(2), pts: out };
  };

  // steer along a path with the Classic controls; returns why it stopped
  const CALM = new Set(['patrol', 'idle', 'guard', 'home', 'return', 'dead', 'search']);
  P.threats = (r = 7) => G.enemies.filter((e) => e.alive && e.present && !CALM.has(e.state) && e.pos.distanceTo(hero().pos) < r && Math.abs(e.pos.y - hero().pos.y) < 4);
  P.go = (tx, tz, { tol = 0.6, maxT = 240, run = false, stopOnTrans = true, planTol, fight = true } = {}) => {
    let lastFight = -1;
    const h = hero();
    if (run && h.behaviour !== 'athletic') P.tap('F2'); else if (!run && h.behaviour === 'athletic') P.tap('F1');
    let plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }), wi = 1, t = 0, replans = 0;
    let lastP = { x: h.pos.x, z: h.pos.z, t: 0 };
    const startRoom = G.room?.id ?? 'citadel';
    P.note(`go → (${tx.toFixed(1)}, ${tz.toFixed(1)}) plan ok=${plan.ok} pts=${plan.pts.length} left=${plan.left}`);
    while (t < maxT) {
      if (Math.hypot(h.pos.x - tx, h.pos.z - tz) <= tol) { P.release(); return { r: 'arrived', t }; }
      if (G.state !== 'play') { P.release(); return { r: 'state:' + G.state, t }; }
      if (stopOnTrans && (G.trans || (G.room?.id ?? 'citadel') !== startRoom)) { P.release(); return { r: 'transition', t }; }
      // someone is coming at him: deal with them first (as a player would), then plan again from here
      if (fight && t - lastFight > 0.5) {
        lastFight = t;
        if (P.threats().length) { P.release(); P.note('threat: fight'); const fr = P.fight({ maxT: 40, threatsOnly: true }); P.note('fight → ' + JSON.stringify(fr)); if (h.dead || G.state !== 'play') { P.release(); return { r: h.dead ? 'dead' : 'state:' + G.state, t }; } plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }); wi = 1; lastP = { x: h.pos.x, z: h.pos.z, t }; continue; }
      }
      while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < 0.45) wi++;
      const w = plan.pts[Math.min(wi, plan.pts.length - 1)] || { x: tx, z: tz };
      const want = Math.atan2(w.x - h.pos.x, w.z - h.pos.z), diff = norm(want - h.angle);
      keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp');
      if (diff > 0.1) keys.add('ArrowLeft'); else if (diff < -0.1) keys.add('ArrowRight');
      if (Math.abs(diff) < (h.speed > 3.5 ? 0.22 : 0.32)) keys.add('ArrowUp');
      G.step(DT); t += DT;
      if (t - lastP.t > 2.5) {
        if (Math.hypot(h.pos.x - lastP.x, h.pos.z - lastP.z) < 0.4) {
          if (++replans > 6) { P.release(); return { r: 'stuck', t, at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) }; }
          P.note(`stuck at (${h.pos.x.toFixed(1)}, ${h.pos.z.toFixed(1)}): replan`);
          // back off a little, then plan again
          P.release(); P.holdFor(['ArrowDown'], 0.4);
          plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }); wi = 1;
        }
        lastP = { x: h.pos.x, z: h.pos.z, t };
      }
    }
    P.release();
    return { r: 'timeout', t };
  };

  // turn on the spot to face a point (Classic: Left/Right)
  P.face = (x, z, maxT = 4) => {
    const h = hero(); let t = 0;
    while (t < maxT) {
      const diff = norm(Math.atan2(x - h.pos.x, z - h.pos.z) - h.angle);
      if (Math.abs(diff) < 0.08) break;
      keys.delete('ArrowLeft'); keys.delete('ArrowRight');
      keys.add(diff > 0 ? 'ArrowLeft' : 'ArrowRight');
      G.step(Math.min(DT, Math.abs(diff) / (Math.PI / 2) + 1 / 120)); t += DT;
    }
    P.release();
  };

  // walk up to something and use it (E), then let the dialogue/cut-scene play out
  // what E would use now (the prompt the player sees): its position, or the NPC's
  P.target = () => { const it = G.findInteractable(); if (!it) return null; const o = it.npc?.pos || it.sign || it.pet || it.it || it; return { kind: it.kind, id: it.id || it.npc?.def.id || it.label, x: o.x, z: o.z, label: it.label }; };
  P.use = (x, z, { near = 1.1, run = false, match = 1.6 } = {}) => {
    let r = P.go(x, z, { tol: near, run });
    if (r.r !== 'arrived' && r.r !== 'state:dialog') return { r: 'go:' + r.r, at: [hero().pos.x, hero().pos.z] };
    let tg = null;
    if (G.state === 'play') {
      P.face(x, z);
      // the prompt must be for this thing: if something else is picked (a person standing by), step closer
      tg = P.target();
      for (let k = 0; k < 3 && (!tg || tg.x == null || Math.hypot(tg.x - x, tg.z - z) > match); k++) { P.go(x, z, { tol: Math.max(0.35, near * 0.5) }); P.face(x, z); tg = P.target(); }
      P.tap('KeyE', 0.1);
    }
    const s = P.settle();
    return { r: 'used', target: tg, state: s.state, lines: s.lines };
  };
  P.npc = (id) => G.npcs.find((n) => n.def.id === id);
  P.talk = (id, opts = {}) => {
    const n = P.npc(id);
    if (!n || !n.present) return { r: 'absent:' + id };
    const r = P.go(n.pos.x, n.pos.z, { tol: 1.6, ...opts });
    if (G.state === 'play') { P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1); }
    const talked = G.state === 'dialog' || G.state === 'shop' || G.state === 'cutscene';
    const s = P.settle();
    return { r: talked ? 'talked' : 'no-dialog:' + r.r, state: s.state, lines: s.lines };
  };
  // walk into a door / exit trigger and wait for the new scene
  P.through = (x, z, opts = {}) => {
    const from = G.room?.id ?? 'citadel';
    const r = P.go(x, z, { tol: 0.25, stopOnTrans: true, ...opts });
    let t = 0; while ((G.trans || (G.room?.id ?? 'citadel') === from) && t < 3) { G.step(0.1); t += 0.1; }
    P.settle();
    return { r: r.r, from, to: G.room?.id ?? 'citadel' };
  };

  // ---- combat
  // throw the magic ball at a point (F; a tap is the quick throw at the aim-assisted target ahead)
  P.throwAt = (x, z) => { P.face(x, z); P.tap('KeyF', 0.05); G.step(1.6); };
  // fight the enemies of a group (or every present one in reach) with the ball until none is left
  P.fight = ({ group = null, maxT = 120, range = 7, melee = false, threatsOnly = false } = {}) => {
    const h = hero(); let t = 0;
    const alive = () => threatsOnly ? P.threats(12) : G.enemies.filter((e) => e.alive && e.present && (group ? e.group === group : e.pos.distanceTo(h.pos) < 30));
    while (t < maxT && alive().length && !h.dead) {
      const e = alive().sort((a, b) => a.pos.distanceTo(h.pos) - b.pos.distanceTo(h.pos))[0];
      const d = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z);
      if (d > range) { const r = P.go(e.pos.x, e.pos.z, { tol: range - 1, maxT: 8, fight: false }); t += r.t || 0.5; if (G.state !== 'play') P.settle(); continue; }
      P.face(e.pos.x, e.pos.z, 1.5);
      // armoured (Grobo guards, troopers): a charged throw (hold F); otherwise the quick throw (tap F)
      if (melee) { P.tap('KeyK', 0.35); t += 0.4; }
      else if ((e.armour || 0) >= 2) { keys.add('KeyF'); I.taps.add('KeyF'); G.step(0.85); keys.delete('KeyF'); G.step(1.0); t += 1.9; }
      else { P.tap('KeyF', 0.05); G.step(1.1); t += 1.2; }
      if (G.state !== 'play') P.settle();
    }
    return { left: alive().length, dead: h.dead, hp: h.hp, t: +t.toFixed(1) };
  };

  // athletic jump onto a raised spot (a stepping stone): line up 1.6 m short of its centre, run at it, jump (Space)
  // and wait for the landing. Returns the height reached.
  P.hopTo = (x, z, top, { from = 1.7 } = {}) => {
    const h = hero();
    if (h.behaviour !== 'athletic') P.tap('F2');
    const a = Math.atan2(x - h.pos.x, z - h.pos.z);
    const sx = x - Math.sin(a) * from, sz = z - Math.cos(a) * from;
    if (Math.hypot(h.pos.x - sx, h.pos.z - sz) > 0.6 && Math.abs(h.pos.y - top) > 0.3) P.go(sx, sz, { tol: 0.4, maxT: 20, run: true });
    P.face(x, z);
    keys.add('ArrowUp'); G.step(0.12); P.tap('Space', 0); keys.add('ArrowUp');
    let t = 0, air = false;
    while (t < 2.5) { G.step(DT); t += DT; if (!h.onGround) air = true; if (air && h.onGround) break;
      // over the target: stop pushing forward so he doesn't run off its far side
      if (Math.hypot(h.pos.x - x, h.pos.z - z) < 0.5) keys.delete('ArrowUp'); }
    P.release(); G.step(0.2);
    return +h.pos.y.toFixed(2);
  };
  // sneak to a point past a watcher (a guard with a vision cone): move while he looks away or is far, crouch (hold
  // Space in Discreet) and wait while he looks this way. w: the Watcher (G.story.cur.watcher)
  P.sneakTo = (x, z, w, { tol = 0.8, maxT = 120 } = {}) => {
    const h = hero(); let t = 0;
    const sees = (px, pz, slack = 0.35) => {
      const n = w.npc, dx = px - n.pos.x, dz = pz - n.pos.z, d = Math.hypot(dx, dz);
      if (d > w.range + 1.5) return false;
      return Math.abs(norm(Math.atan2(dx, dz) - n.angle)) < w.fov + slack && PH.lineOfSight(n.pos.x, n.pos.y + 1.6, n.pos.z, px, h.pos.y + 1.2, pz);
    };
    let plan = P.plan(x, z, { tol: tol * 0.6 }), wi = 1;
    while (t < maxT) {
      if (Math.hypot(h.pos.x - x, h.pos.z - z) <= tol) { P.release(); return { r: 'arrived', t }; }
      if (G.state !== 'play' || G.trans) { P.release(); return { r: 'state:' + G.state, t }; }
      while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < 0.45) wi++;
      const wpt = plan.pts[Math.min(wi, plan.pts.length - 1)];
      const ahead = { x: h.pos.x + (wpt.x - h.pos.x) * 0.5, z: h.pos.z + (wpt.z - h.pos.z) * 0.5 };
      keys.clear();
      if (w.active && (sees(h.pos.x, h.pos.z) || sees(ahead.x, ahead.z) || w.suspicion > 0.15)) { keys.add('Space'); G.step(DT); t += DT; continue; }
      const diff = norm(Math.atan2(wpt.x - h.pos.x, wpt.z - h.pos.z) - h.angle);
      if (diff > 0.1) keys.add('ArrowLeft'); else if (diff < -0.1) keys.add('ArrowRight');
      if (Math.abs(diff) < 0.32) keys.add('ArrowUp');
      G.step(DT); t += DT;
    }
    P.release(); return { r: 'timeout', t };
  };
  P.state = () => ({ state: G.state, room: G.room?.id ?? 'citadel', pos: [hero().pos.x, hero().pos.y, hero().pos.z].map((v) => +v.toFixed(2)), hp: hero().hp, chapter: G.flags.chapterKey, obj: document.querySelector('#objective')?.textContent || '' });
})();
