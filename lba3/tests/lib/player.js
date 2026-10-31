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
  // (in sub-steps of ~0.1 m, as the hero moves frame by frame: a bump steeper than walkable inside a longer step
  // would otherwise pass here and stop him there)
  const stepTo = (x, y, z, nx, nz) => {
    probe.radius = hero().radius; probe.pos.set(x, y, z); probe.onGround = true;
    const n = Math.max(1, Math.ceil(Math.hypot(nx - x, nz - z) / 0.1));
    for (let i = 1; i <= n; i++) {
      const px = x + (nx - x) * i / n, pz = z + (nz - z) * i / n;
      PH.move(probe, px - probe.pos.x, pz - probe.pos.z);
      if (Math.hypot(probe.pos.x - px, probe.pos.z - pz) > 0.04) return null;
      probe.pos.y = PH.groundAt(px, pz, probe.pos.y);
    }
    const ny = PH.groundAt(nx, nz, probe.pos.y);
    if (ny < y - (P.dropOK ? 7 : 2.2)) return null;   // a drop that would hurt (allowed, up to a few metres, when nothing else leads out)
    if (PH.steepAt(nx, nz, ny)) return null;       // he'd slide
    return ny;
  };
  P._stepTo = (...a) => stepTo(...a);   // (debugging the planner)
  // is a spot next to a slope he'd slide on, or a wall? (paths keep a margin from both)
  const edgy = (x, y, z, m = 0.4) => {
    for (const [ox, oz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) {
      const gy = PH.groundAt(x + ox, z + oz, y);
      if (PH.steepAt(x + ox, z + oz, gy) || gy < y - 0.8 || PH.blockedAt(x + ox, z + oz, y, 0.05)) return true;
    }
    return false;
  };
  // straight walk possible? (for smoothing the A* path)
  const lineOK = (a, b, avoid = []) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.3));
    const inside = (x, z) => avoid.find((t) => Math.hypot(x - t.x, z - t.z) < t.r);
    const startIn = inside(a.x, a.z);
    let x = a.x, y = a.y, z = a.z;
    for (let i = 1; i <= n; i++) {
      const nx = a.x + (b.x - a.x) * i / n, nz = a.z + (b.z - a.z) * i / n;
      const ny = stepTo(x, y, z, nx, nz);
      if (ny == null || Math.abs(ny - y) > 0.6) return false;
      if (edgy(nx, ny, nz, 0.3) && !edgy(a.x, a.y, a.z, 0.3)) return false;
      const tin = avoid.length && inside(nx, nz); if (tin && tin !== startIn) return false;   // the smoothed line keeps out of door triggers too
      x = nx; y = ny; z = nz;
    }
    return Math.abs(y - b.y) < 0.7;
  };
  // door and exit triggers on the way (not the one we're going to) are walked around, not through
  const triggers = (tx, tz) => {
    const out = [];
    if (G.room) for (const e of G.room.exits) out.push(e);
    if (!G.room || G.room.outdoor) for (const d of G.story.doors()) if ((d.region || undefined) === G.room?.id) out.push(d);
    return out.filter((d) => Math.hypot(d.x - tx, d.z - tz) > 1.2).map((d) => ({ x: d.x, z: d.z, r: d.r + 0.35 }));
  };
  // the people he can't walk through (SOLID-NPC: Hero.contacts, his radius + theirs), as circles to keep out of;
  // not the one he is walking to
  const bodies = (tx, tz) => {
    const h = hero(), out = [];
    for (const n of G.npcs || []) {
      if (!n.present || n.controlled || n.away || !n.rig?.root.visible || Math.abs(n.pos.y - h.pos.y) > 1.2) continue;
      if (Math.hypot(n.pos.x - tx, n.pos.z - tz) < 0.3) continue;
      out.push({ x: n.pos.x, z: n.pos.z, r: h.radius + (n.bodyR ?? n.radius) + 0.05 });
    }
    return out;
  };
  P.plan = (tx, tz, { cell = 0.4, maxNodes = 60000, tol = 0.5, raw = false, people = false } = {}) => {
    const h = hero(), sx = h.pos.x, sz = h.pos.z;
    const avoid = triggers(tx, tz);   // door/exit triggers: kept out of, except to walk out of one he stands in
    if (people) avoid.push(...bodies(tx, tz));   // (after he got stuck: round the people, I-19/I-21)
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
        if (avoid.some((d) => { const dn = Math.hypot(nx - d.x, nz - d.z); if (dn >= d.r) return false; const dc = Math.hypot(c.x - d.x, c.z - d.z); return !(dc < d.r && dn > dc); })) continue;
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
    // (raw: every cell of the path, for picking his way along it step by step after he got stuck on a smoothed line)
    if (raw) return { ok: !!goal, nodes: n, left: +cd.toFixed(2), pts, raw: true };
    // string-pull: keep only the corners
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + 40);
      while (j > i + 1 && !lineOK(pts[i], pts[j], avoid)) j--;
      out.push(pts[j]); i = j;
    }
    return { ok: !!goal, nodes: n, left: +cd.toFixed(2), pts: out };
  };

  // steer along a path with the Classic controls; returns why it stopped
  const CALM = new Set(['patrol', 'idle', 'guard', 'home', 'return', 'dead', 'search']);
  // enemies the ball can't reach from here (behind a fence it sees through) are left alone for a while, as a
  // player would after a few wasted throws
  P.ignore = new Map();
  P.threats = (r = 7) => G.enemies.filter((e) => e.alive && e.present && !CALM.has(e.state) && e.pos.distanceTo(hero().pos) < r && Math.abs(e.pos.y - hero().pos.y) < 4 && !((P.ignore.get(e) ?? -1) > G.time));
  P.go = (tx, tz, { tol = 0.6, maxT = 240, run = false, stopOnTrans = true, planTol, fight = true, stopWhen = null } = {}) => {
    let lastFight = -1, fights = 0;
    const h = hero();
    // a transition already under way (a Continue, a door just used): let it finish first
    for (let i = 0; i < 300 && G.trans; i++) G.step(DT);
    if (run && h.behaviour !== 'athletic') P.tap('F2'); else if (!run && h.behaviour === 'athletic') P.tap('F1');
    let plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }), wi = 1, t = 0, replans = 0;
    // nothing leads there without a drop (he slid into a hollow): jump down, as a player would
    if (!plan.ok && plan.left > 3) { P.dropOK = true; const p2 = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }); P.dropOK = false; if (p2.ok) { plan = p2; P.note('go: no way round, taking a drop'); } }
    let lastP = { x: h.pos.x, z: h.pos.z, t: 0 };
    const startRoom = G.room?.id ?? 'citadel';
    P.note(`go → (${tx.toFixed(1)}, ${tz.toFixed(1)}) plan ok=${plan.ok} pts=${plan.pts.length} left=${plan.left}`);
    while (t < maxT) {
      if (Math.hypot(h.pos.x - tx, h.pos.z - tz) <= tol) { P.release(); return { r: 'arrived', t }; }
      if (stopWhen && stopWhen()) { P.release(); return { r: 'arrived', t, early: true }; }
      if (G.state !== 'play') { P.release(); return { r: 'state:' + G.state, t }; }
      if (stopOnTrans && (G.trans || (G.room?.id ?? 'citadel') !== startRoom)) { P.release(); P.note(`go: transition (${startRoom} → ${G.room?.id ?? 'citadel'}, trans ${!!G.trans}) at (${h.pos.x.toFixed(2)}, ${h.pos.z.toFixed(2)})`); return { r: 'transition', t }; }
      // someone is coming at him: deal with them first (as a player would), then plan again from here
      if (fight && t - lastFight > 0.5) {
        lastFight = t;
        if (P.threats().length && fights < 8) { fights++; P.release(); P.note('threat: fight'); const fr = P.fight({ maxT: 40, threatsOnly: true, minHp: P.assist ? 2 : 0 }); if (P.assist && !h.dead && h.hp <= 2 && P.threats(14).length) fr.assisted = P.assistFight({ r: 16 }); t += fr.t || 1; P.note('fight → ' + JSON.stringify(fr)); if (h.dead || G.state !== 'play') { P.release(); return { r: h.dead ? 'dead' : 'state:' + G.state, t }; } plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6) }); wi = 1; lastP = { x: h.pos.x, z: h.pos.z, t }; continue; }
      }
      while (wi < plan.pts.length - 1 && Math.hypot(plan.pts[wi].x - h.pos.x, plan.pts[wi].z - h.pos.z) < (plan.raw ? 0.2 : 0.45)) wi++;   // (cell by cell: onto each one)
      const w = plan.pts[Math.min(wi, plan.pts.length - 1)] || { x: tx, z: tz };
      const want = Math.atan2(w.x - h.pos.x, w.z - h.pos.z), diff = norm(want - h.angle);
      keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp');
      if (diff > 0.1) keys.add('ArrowLeft'); else if (diff < -0.1) keys.add('ArrowRight');
      if (Math.abs(diff) < (h.speed > 3.5 ? 0.22 : 0.32)) keys.add('ArrowUp');
      const hp0 = h.hp; G.step(DT); t += DT;
      if (h.hp < hp0) P.note(`hurt ${hp0}→${h.hp} at (${h.pos.x.toFixed(1)}, ${h.pos.y.toFixed(1)}, ${h.pos.z.toFixed(1)}) near: ${G.enemies.filter((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 10).map((e) => e.id + ':' + e.state).join(',') || 'nobody'} ${h.sliding ? 'sliding' : ''}`);
      if (t - lastP.t > 2.5) {
        if (Math.hypot(h.pos.x - lastP.x, h.pos.z - lastP.z) < 0.4) {
          if (++replans > 6) { P.release(); return { r: 'stuck', t, at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)) }; }
          P.note(`stuck at (${h.pos.x.toFixed(1)}, ${h.pos.z.toFixed(1)}): replan`);
          // back off a little, then plan again; stuck twice: follow the planned cells one by one instead of the
          // smoothed corners (a straight line between two corners can graze a slope too steep to walk, and cutting
          // a corner by the 0.45 m a waypoint counts as reached puts him on it), as a player picks his way round.
          // The new plan goes round the people standing there: they are solid (SOLID-NPC) and the first plan does
          // not see them, so a line through someone beside a brick (Nara between her case and a street lamp on
          // Zeelich) pinned him there for good (I-19, I-21)
          P.release(); P.holdFor(['ArrowDown'], 0.4);
          plan = P.plan(tx, tz, { tol: planTol ?? Math.max(0.3, tol * 0.6), raw: replans >= 2, people: true }); wi = 1;
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
  P.use = (x, z, { near = 1.1, run = false, match = 1.6, kind = null } = {}) => {
    const where = P.sceneOf(x, z);
    if (where !== P.here()) P.enter(where, { run });
    // (a player presses E as soon as the prompt is for this thing, close enough: no need to reach the exact spot)
    const ready = () => { const tg = P.target(); if (!tg || Math.hypot(hero().pos.x - x, hero().pos.z - z) >= 2.2) return false; if (kind) return tg.kind === kind; return tg.x == null ? tg.kind !== 'npc' : Math.hypot(tg.x - x, tg.z - z) <= match; };   // (a story thing's prompt carries no position: any non-person prompt here)
    let r = P.go(x, z, { tol: near, run, stopWhen: ready });
    if (r.r !== 'arrived' && r.r !== 'state:dialog') { P.face(x, z); if (!ready()) return { r: 'go:' + r.r, at: [hero().pos.x, hero().pos.z] }; }   // (blocked short of it, but its prompt is up: fine)
    let tg = null;
    if (G.state === 'play') {
      P.face(x, z);
      // the prompt must be for this thing: if something else is picked (a person standing by), step closer
      // (a story thing's prompt — a valve, a console, one of three dials — carries no position, so it can't be told
      // from a neighbour of the same kind: one step closer, at most 4 s, then it is taken as this thing, as in
      // ready(). Walking on would only push him into its collider until the stuck-replan gives up, three times.)
      const noPos = (q) => !!q && q.x == null && q.kind !== 'npc';
      const forThis = (q, k) => !!q && (q.x == null ? q.kind !== 'npc' && k > 0 : Math.hypot(q.x - x, q.z - z) <= match);
      tg = P.target();
      for (let k = 0; k < 3 && !forThis(tg, k); k++) { P.go(x, z, { tol: Math.max(0.35, near * 0.5), ...(noPos(tg) ? { maxT: 4 } : {}) }); P.face(x, z); tg = P.target(); }
      // (a particular thing asked for and someone walking by has the prompt: wait for them to pass, as a player would)
      for (let k = 0; kind && k < 20 && P.target()?.kind !== kind; k++) { G.step(0.25); if (k % 4 === 3) { P.go(x, z, { tol: Math.max(0.35, near * 0.5), maxT: 4 }); P.face(x, z); } }
      P.tap('KeyE', 0.1);
      for (let k = 0; k < 5 / DT && (hero().actT > 0 || hero().steer) && G.state === 'play'; k++) G.step(DT);   // (his action plays out: a valve turned, a lever pulled; the few steps it takes him there first)
    }
    const s = P.settle();
    return { r: 'used', target: tg, state: s.state, lines: s.lines };
  };
  P.npc = (id) => G.npcs.find((n) => n.def.id === id);
  // which scene a point belongs to: a room (rooms are built far apart, each around its centre) or outdoors
  P.sceneOf = (x, z) => {
    let best = null, bd = 60;
    // (LAZY-REGIONS: every interior, built or not: the game knows where each stands, src/game/regions.js centreOf)
    const inside = G.regions ? [...G.regions.of.keys()].map((id) => [id, G.regions.centreOf(id)]).filter(([, c]) => c && !c.outdoor) : Object.entries(G.rooms).filter(([, R]) => !R.outdoor).map(([id, R]) => [id, R.center]);
    for (const [id, c] of inside) { const d = Math.hypot(x - c.x, z - c.z); if (d < bd) { bd = d; best = id; } }
    if (best) return best;
    // the outdoor region he is in (Zeelich, Desert Island, the Hamalayi have no centre): anything close by is in it
    if (G.room?.outdoor && Math.hypot(x - hero().pos.x, z - hero().pos.z) < 350) return G.room.id;
    for (const [id, R] of Object.entries(G.rooms)) if (R.outdoor && R.center && Math.hypot(x - R.center.x, z - R.center.z) < 400) return id;
    return 'citadel';
  };
  P.here = () => G.room?.id ?? 'citadel';
  // walk to a room through its door (from outdoors, or out of another room first)
  P.enter = (id, opts = {}) => {
    if (P.here() === id) return { r: 'here' };
    if (G.room && !G.room.outdoor) {
      const e = G.room.exits.find((x) => x.room === id) || G.room.exits.find((x) => !x.room);
      if (!e) return { r: 'no exit' };
      P.through(e.x, e.z, opts); if (P.here() === id) return { r: 'entered' };
    }
    const d = G.story.doors().find((x) => x.room === id && (x.region || 'citadel') === P.here());
    if (!d) return { r: 'no door to ' + id + ' from ' + P.here() };
    const r = P.through(d.x, d.z, opts);
    return { r: P.here() === id ? 'entered' : 'failed:' + r.r };
  };
  P.talk = (id, opts = {}) => {
    const n = P.npc(id);
    if (!n || !n.present) return { r: 'absent:' + id };
    const where = P.sceneOf(n.pos.x, n.pos.z);
    if (where !== P.here()) { const e = P.enter(where, opts); if (P.here() !== where) return { r: 'cannot reach ' + where + ': ' + e.r }; }
    const r = P.go(n.pos.x, n.pos.z, { tol: 1.6, ...opts });
    let tg = null;
    if (G.state === 'play') {
      P.face(n.pos.x, n.pos.z); tg = P.target();
      // the prompt must be for this person (not a bench or a sign beside them): step closer
      for (let k = 0; k < 3 && !(tg?.kind === 'npc' && tg.id === id); k++) { P.go(n.pos.x, n.pos.z, { tol: 1.0 - k * 0.2 }); P.face(n.pos.x, n.pos.z); tg = P.target(); }
      P.tap('KeyE', 0.1);
    }
    const talked = G.state === 'dialog' || G.state === 'shop' || G.state === 'cutscene';
    const s = P.settle();
    return { r: talked ? 'talked' : 'no-dialog:' + r.r, to: tg?.id, state: s.state, lines: s.lines };
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
  // step the game for t seconds the way a player waits in a fight: a bolt coming in close → dodge (X), timed so
  // the dodge's invulnerable frames meet it
  P.gstep = (t) => {
    const h = hero();
    for (let s = 0; s < t; s += DT) {
      const inbound = G.bolts?.list?.find((b) => { if (b.dodged) return false; const p = b.m.position, dx = h.pos.x - p.x, dz = h.pos.z - p.z, d = Math.hypot(dx, dz); return d < 2.4 && (b.v.x * dx + b.v.z * dz) > 0; });
      if (inbound && h.combat?.canDodge?.()) { inbound.dodged = true; keys.add('KeyX'); I.taps.add('KeyX'); G.step(DT); keys.delete('KeyX'); P.note('dodge a bolt'); continue; }
      G.step(DT);
    }
  };
  P.fight = ({ group = null, maxT = 120, range = 7, melee = false, threatsOnly = false, minHp = 0 } = {}) => {
    const h = hero(); let t = 0;
    const alive = () => threatsOnly ? P.threats(12) : G.enemies.filter((e) => e.alive && e.present && !((P.ignore.get(e) ?? -1) > G.time) && (group ? e.group === group : e.pos.distanceTo(h.pos) < 30));
    while (t < maxT && alive().length && !h.dead && !(minHp && h.hp <= minHp)) {
      const e = alive().sort((a, b) => a.pos.distanceTo(h.pos) - b.pos.distanceTo(h.pos))[0];
      const d = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z);
      // (no path to it — behind a fence, below a cliff: leave it, as a player would, rather than chase it off an edge)
      if (d > range && !P.plan(e.pos.x, e.pos.z, { tol: range - 1, maxNodes: 20000 }).ok) { P.ignore.set(e, G.time + 25); P.note(`fight: no way to ${e.id}, leaving it`); continue; }
      if (d > range) { const r = P.go(e.pos.x, e.pos.z, { tol: range - 1, maxT: 8, fight: false }); t += r.t || 0.5; if (G.state !== 'play') P.settle(); continue; }
      P.face(e.pos.x, e.pos.z, 1.5);
      // armoured (Grobo guards, troopers): a charged throw (hold F); otherwise the quick throw (tap F)
      // the ball must be back in his hand before the next throw
      for (let w = 0; w < 4 / DT && G.ball.state !== 'idle'; w++) { P.gstep(DT); t += DT; }
      // out of reach again after a dodge or while waiting: close in first
      if (!e.alive || Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) > range + 0.5) continue;
      P.face(e.pos.x, e.pos.z, 1.5);
      const hp0 = e.hp, tg = G.targeting?.throwTarget?.({ x: Math.sin(h.angle), z: Math.cos(h.angle) });
      const aimed = tg && tg.alive !== undefined ? tg : e;   // the throw goes where the game aims it
      const ahp0 = aimed.hp;
      // the ball can't get at it (behind something) but the sword is in hand: walk up and strike, as a player would
      const close = melee || (h.hasSword && (e._miss || 0) >= 2);
      if (close && !melee) { P.go(e.pos.x, e.pos.z, { tol: 1.1, maxT: 8, fight: false }); P.face(e.pos.x, e.pos.z, 1.5); if (h.combat?.weapon !== 'sword') P.tap('KeyR', 0.1); }
      if (close) { P.tap('KeyK', 0.35); P.gstep(0.3); P.tap('KeyK', 0.35); t += 1.0; }
      else if ((aimed.armour || 0) >= 2 && h.mp >= 1) {
        // a charge can't be dodged out of: start it in the guard's opening, just after its shot (rifle lowered)
        const opening = () => (aimed.state === 'recover' || aimed.state === 'hurt' || aimed.coolT > 0.6) && !(G.bolts?.list?.length) && h.hurtT <= 0 && h.actT <= 0 && h.onGround;
        for (let w = 0; w < 6 / DT && aimed.alive && !opening(); w++) { P.gstep(DT); t += DT; }
        P.face(aimed.pos.x, aimed.pos.z, 1.5);
        keys.add('KeyF'); I.taps.add('KeyF'); P.gstep(1.3); keys.delete('KeyF'); P.gstep(1.0); t += 2.3; }   // full charge: chargeAfter 0.2 + chargeFull 0.75 s, with a margin
      else { P.tap('KeyF', 0.05); P.gstep(1.1); t += 1.2; }
      // a wasted throw: nothing was hit, neither this enemy nor the one the game aimed at instead (both behind a
      // fence the ball can't pass, say). It counts for both, so after a few a player stops throwing and walks on.
      const wasted = e.hp === hp0 && (close || aimed === e || aimed.hp === ahp0);
      if (wasted) for (const q of aimed === e || close ? [e] : [e, aimed]) { q._miss = (q._miss || 0) + 1; if (q._miss >= 6) { q._miss = 0; P.ignore.set(q, G.time + 25); P.note(`fight: ${q.id} unreachable from here, leaving it`); } }
      else e._miss = 0;
      P.note(`fight ${e.id || e.def?.kind} d=${d.toFixed(1)} st=${e.state} aim=${tg ? (tg === e ? 'it' : 'other:' + (tg.id || tg.def?.id || tg.kind || 'pt') + '@' + (tg.pos || tg).x?.toFixed(1) + ',' + (tg.pos || tg).z?.toFixed(1) + ' d' + Math.hypot((tg.pos || tg).x - h.pos.x, (tg.pos || tg).z - h.pos.z).toFixed(1)) : 'none'} e@${e.pos.x.toFixed(1)},${e.pos.y.toFixed(1)},${e.pos.z.toFixed(1)} me@${h.pos.x.toFixed(1)},${h.pos.y.toFixed(1)},${h.pos.z.toFixed(1)} ball=${G.ball.state} hp ${hp0}→${e.hp} me ${h.hp} mp ${h.mp}`);
      if (G.state !== 'play') P.settle();
    }
    return { left: alive().length, dead: h.dead, hp: h.hp, t: +t.toFixed(1) };
  };

  // ISO assist for a fight the bot can't win (its combat is weaker than a player's): the remaining enemies of the
  // group/area are beaten through their own damage rule. Logged; a step that uses it is ISO evidence, not INPUT.
  P.assistFight = ({ group = null, r = 30 } = {}) => {
    const h = hero(), left = G.enemies.filter((e) => e.alive && e.present && !e.boss && e.id !== 'guardian' && e.kind !== 'guardian' && e.def?.kind !== 'guardian' && (group ? e.group === group : e.pos.distanceTo(h.pos) < r));   // (never a boss: its fight is the story)
    for (const e of left) e.damage?.(99, null);
    G.step(1); P.note(`ISO assist: ${left.length} enemies beaten (${left.map((e) => e.id).join(',')})`);
    return left.length;
  };
  // take what lies about (a heart when hurt, a flask when the magic is low: Game.canTake): walk over each one within r
  P.grab = (r = 9) => {
    const h = hero(); let n = 0;
    for (let k = 0; k < 4; k++) {
      const p = G.pickups.list.filter((q) => q.mesh.visible && (!q.where || q.where === G.where()) && !q.fly && G.canTake(q) && Math.hypot(q.pos.x - h.pos.x, q.pos.z - h.pos.z) < r).sort((a, b) => Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z) - Math.hypot(b.pos.x - h.pos.x, b.pos.z - h.pos.z))[0];
      if (!p) break;
      P.go(p.pos.x, p.pos.z, { tol: 0.5, maxT: 8, fight: false }); G.step(0.3); n++;
    }
    P.note(`grab: ${n} pickups, hp ${h.hp}`); return n;
  };
  // rummage a container (a giver: a hop beside it in Normal behaviour, the prompt "rummage"), then take what comes out. The
  // nearest unsearched one of the room within r, or the one with this id
  P.rummage = (id = null, r = 25) => {
    const h = hero(), gv = G.givers().filter((g) => (!id || g.id === id) && !G.giverTaken(g) && Math.hypot(g.x - h.pos.x, g.z - h.pos.z) < r && Math.abs((g.y ?? h.pos.y) - h.pos.y) < 1.5)
      .sort((a, b) => Math.hypot(a.x - h.pos.x, a.z - h.pos.z) - Math.hypot(b.x - h.pos.x, b.z - h.pos.z))[0];
    if (!gv) return { r: 'no giver' };
    P.go(gv.x, gv.z, { tol: gv.r * 0.6, maxT: 40 });
    if (h.behaviour !== 'normal') P.tap('F1');
    P.face(gv.x, gv.z, 1.0); P.tap('Space', 0.2); P.wait(1.4);
    const n = P.grab(6);
    P.note(`rummage ${gv.id}: ${n} taken, hp ${h.hp}`); return { r: 'rummaged', id: gv.id, taken: n, hp: h.hp };
  };
  // segment helpers (segment page functions can't see module-scope helpers of their own file)
  // walk out through the current room's exit to `to`
  P.exitTo = (to) => { const e = G.room?.exits?.find((x) => x.to === to); if (!e) return { r: 'no exit ' + to, fail: 'no exit ' + to }; return P.through(e.x, e.z); };
  // Hesk's flights: talk to him, pick destination i in his menu
  // the core's guardian fight as a player plays it (chapter 11): a ball hit stuns the guardian for 2.6 s (it can't
  // fire), and that window is for the objective — a plate's bank shot at a pylon ('pylons'), or a throw at Vesk's
  // overload coil ('coil'); bolt fans are dodged (P.gstep). Input only. Ends when the phase's goal is met.
  P.coreFight = (phase, { maxT = 300 } = {}) => {
    const h = hero(), f = G.flags, C = G.story.cur, out = { stunThrows: 0, stuns: 0, shots: 0, hurt: 0, t: 0 };
    const done = () => (phase === 'pylons' ? f.c3_overload || C.pylons() >= 3 : f.c3_turned);
    let miss = 0;
    let hp = h.hp; const tick = (s) => { P.gstep(s); out.t += s; if (h.hp < hp) out.hurt += hp - h.hp; hp = h.hp; };
    const idle = () => { for (let w = 0; w < 300 && G.ball.state !== 'idle'; w++) tick(DT); };
    for (let k = 0; k < 200 && !done() && !h.dead && out.t < maxT; k++) {
      if (G.state !== 'play') { P.settle(); continue; }
      idle(); const g = G.enemies.find((e) => e.id === 'guardian'); if (!g || !g.alive) break;
      if (g.state !== 'stunned') {
        P.face(g.pos.x, g.pos.z, 1); P.tap('F1'); P.tap('KeyF', 0.05); out.stunThrows++;
        for (let s = 0; s < 1.3 && g.state !== 'stunned'; s += DT) tick(DT);
        // (two misses running: something stands between them — Vesk's console, a pylon: as a player, step out into the
        // open middle of the arena, toward it)
        if (g.state !== 'stunned') { if (++miss >= 2) { miss = 0; const A = g.arena; if (A) P.go((A.x0 + A.x1) / 2 + (g.pos.x - (A.x0 + A.x1) / 2) * 0.3, (A.z0 + A.z1) / 2 + (g.pos.z - (A.z0 + A.z1) / 2) * 0.3, { tol: 1.0, maxT: 3, fight: false }); } continue; }
        miss = 0; out.stuns++;
      }
      if (phase === 'pylons') {
        const p = C.plates().filter((q) => !f['c3_pylon' + q.i]).sort((a, b) => Math.hypot(a.x - h.pos.x, a.z - h.pos.z) - Math.hypot(b.x - h.pos.x, b.z - h.pos.z))[0]; if (!p) { tick(0.5); continue; }   // (the nearest plate: the walk is inside the 2.6 s window)
        P.go(p.x, p.z, { tol: 0.35, maxT: 3, fight: false }); tick(0.35); idle();   // (standing still on a plate lines him up)
      } else {
        const tg = G.room.ballTargets.find((x) => x.coil); if (!tg) { tick(0.5); continue; }
        const d = Math.hypot(tg.x - h.pos.x, tg.z - h.pos.z); if (d > 5.5) P.go(tg.x + (h.pos.x - tg.x) / d * 4, tg.z + (h.pos.z - tg.z) / d * 4, { tol: 1.0, maxT: 2, fight: false });
        idle(); P.face(tg.x, tg.z, 1);
      }
      P.tap('KeyF', 0.05); out.shots++; tick(1.4); P.settle();
    }
    out.t = +out.t.toFixed(1); P.note(`core fight (${phase}): ` + JSON.stringify(out)); return out;
  };
  // the spaceship between the planets (travel.js, PLANET-1): to the pad's travel point, E, the menu's one stop
  P.shipTo = (pid) => {
    const p = G.travel?.points?.[pid]; if (!p) return { r: 'no point ' + pid };
    const L = p.landing || p, mx = (p.x + L.x) / 2, mz = (p.z + L.z) / 2;
    const where = P.sceneOf(mx, mz); if (where !== P.here()) P.enter(where, { run: true });
    P.go(mx, mz, { tol: 1.0, run: true }); P.face(p.x, p.z);
    const tg = P.target(); if (tg?.kind !== 'isleShuttle') return { r: 'no prompt: ' + (tg?.kind || 'none'), room: P.here() };
    P.tap('KeyE', 0.1); G.step(0.2); if (G.state !== 'shop') { P.settle(); return { r: 'no menu: ' + G.state, room: P.here() }; }
    const r = P.menuPick(0); P.settle(30); return { ...r, room: P.here() };
  };
  P.flyTo = (i) => { P.talk('hesk', { run: true }); if (G.state !== 'shop') { P.tap('KeyE', 0.1); P.settle(); } const r = P.menuPick(i); P.settle(30); return { ...r, room: G.room?.id ?? 'citadel' }; };
  // a ball target: throw from up to six spots around it (r metres off) until it is done
  P.hitTarget = (tg, r = 4, { run = true, maxT = 60, fight = true, tries = 6 } = {}) => { for (let k = 0; k < tries && !tg.done && !hero().dead; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * r, tg.z - Math.cos(a) * r, { tol: 0.8, run, maxT, fight }); P.settle(); if (hero().dead) break; P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); } return tg.done; };
  // Zeelich's old mill: its stair-stones (millTop.stones, 1.09 m apart since CONTROL-FEEL) spiral up — jumps (Athletic),
  // stepping to the middle of each stone first and letting go of Up in the air so he doesn't overshoot; then the hop
  // onto the gallery (millTop.landing)
  P.climbOldMill = () => {
    const h = hero(), mt = G.rooms.zeelich.millTop, cx = mt.x, cz = mt.z - 3.3, out = [], S = mt.stones, n = S.length;
    const rise = S[1].y - S[0].y;
    const st = (k, r = 3.475) => { const s = S[k], a = Math.atan2(s.x - cx, s.z - cz); return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, top: s.y }; };
    const a0 = Math.atan2(S[0].x - cx, S[0].z - cz) - 0.6;
    for (let attempt = 0; attempt < 3 && h.pos.y < mt.y - 0.3; attempt++) {
      P.go(cx + Math.sin(a0) * 6, cz + Math.cos(a0) * 6, { tol: 0.6, run: true });
      for (let k = 0; k < n; k++) {
        const s = st(k, k ? 3.3 : 3.475); let y = 0;
        for (let tries = 0; tries < 3; tries++) {
          if (k > 0 && Math.abs(h.pos.y - (s.top - rise)) < 0.2) { const c = st(k - 1); P.go(c.x, c.z, { tol: 0.2, maxT: 4, fight: false }); }
          y = P.hopTo(s.x, s.z, s.top, { walk: k === 0 || h.pos.y < S[0].y - rise + 0.5, brake: k ? 1.2 : 0.5 });
          if (Math.abs(y - s.top) < 0.3 || h.pos.y < s.top - rise - 0.05) break;
        }
        out.push(y); if (Math.abs(y - s.top) > 0.3) break;
      }
      if (Math.abs(h.pos.y - S[n - 1].y) < 0.3) { const c = st(n - 1); P.go(c.x, c.z, { tol: 0.2, maxT: 4, fight: false }); out.push(P.hopTo(mt.landing.x, mt.landing.z, mt.y, { walk: false, brake: 1.2 })); }
    }
    return { heights: out, y: +h.pos.y.toFixed(2), top: h.pos.y > mt.y - 0.3 };
  };
  // athletic jump onto a raised spot (a stepping stone): line up 1.6 m short of its centre, run at it, jump (Space)
  // and wait for the landing. Returns the height reached.
  // pre: how long Up is held before Space (the run-up's speed sets the hop's length: a jump carries on in the air;
  // a hop across a gap onto a small stone wants ~0.25 s — CONTROL-FEEL)
  P.hopTo = (x, z, top, { from = 1.7, walk = true, brake = 0.5, pre = 0.12 } = {}) => {
    const h = hero();
    if (h.behaviour !== 'athletic') P.tap('F2');
    const a = Math.atan2(x - h.pos.x, z - h.pos.z);
    const sx = x - Math.sin(a) * from, sz = z - Math.cos(a) * from;
    if (walk && Math.hypot(h.pos.x - sx, h.pos.z - sz) > 0.6 && Math.abs(h.pos.y - top) > 0.3) P.go(sx, sz, { tol: 0.4, maxT: 20, run: true });
    P.face(x, z);
    keys.add('ArrowUp'); G.step(pre); P.tap('Space', 0); keys.add('ArrowUp');
    let t = 0, air = false;
    while (t < 2.5) { G.step(DT); t += DT; if (!h.onGround) air = true; if (air && h.onGround) break;
      // over the target: stop pushing forward so he doesn't run off its far side
      // (letting go of Up in the air brakes: about 1 m more at a run, so a short hop lets go early: brake ≈ 1)
      if (Math.hypot(h.pos.x - x, h.pos.z - z) < brake) keys.delete('ArrowUp'); }
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
  // a menu (shop, Hesk's flights): click its item as a player does
  P.menuPick = (i) => { const el = document.querySelector(`#shop .item[data-i="${i}"]`); if (!el) return { r: 'no item ' + i, state: G.state }; el.click(); G.step(0.2); P.settle(); return { r: 'picked', state: G.state }; };
  P.state = () => ({ state: G.state, room: G.room?.id ?? 'citadel', pos: [hero().pos.x, hero().pos.y, hero().pos.z].map((v) => +v.toFixed(2)), hp: hero().hp, chapter: G.flags.chapterKey, obj: document.querySelector('#pause-objective')?.textContent || '' });
})();
