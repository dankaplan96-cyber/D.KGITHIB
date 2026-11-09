// CAM-KEYWALK: the Follow camera watched while a player walks with the keyboard (tests/camcitadel.mjs). Loaded into the
// page after tests/lib/player.js. The keys themselves come from the test (Playwright's page.keyboard, through the game's
// own key listener); this side only places Twinsen, steps the frames (game.testFreeze) and records what the camera did.
//   CW.setup()              Follow, Medium, Classic (the user's settings), the prologue done, the game in play
//   CW.place(s)             Twinsen at s = { x, z, a, y?, room? } on Citadel (or in the outdoor room s.room: an island,
//                           Desert Island, the Hamalayi; world coordinates), the view snapped and settled 1 s (not recorded)
//   CW.tris(box)            the drawn triangles in box { x0, x1, z0, z1 } (opaque meshes, instanced ones by instance)
//   CW.start() / CW.stop()  record every camera update → the stats below
//   CW.step(s, fps, stopAt) step s seconds at fps; stopAt: stop after that recorded frame (for a picture of it)
// Per frame: the arm (the camera to his pivot, 1.4 m over the ground under him as the chase holds it), the view's
// heading off his back (°), what solid the camera stands in (colliders, scenery volumes, the terrain), the nearest drawn
// surface and whether the camera is behind it (inside a closed mesh), whether a drawn surface stands nearer the lens
// than the near plane (the cut shows its inside: an x-ray), and whether he is in view.
(() => {
  const G = window.game, C = G.camRig, cam = G.camera, P = G.physics;
  const THREE = { V: cam.position.constructor };
  const V3 = THREE.V, _q = new V3(), _n = new V3(), _ab = new V3(), _ac = new V3();
  const deg = (a) => (a * 180) / Math.PI, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const CW = (window.CW = { on: false, F: [], tri: null });
  CW.setup = () => {
    const I = G.input;
    for (let i = 0; i < 80 && G.state !== 'play'; i++) { I.taps.add('KeyE'); G.step(0.05); }
    Object.assign(G.flags, { prologueDone: true, intro: true });
    G.settings.camera = 'follow'; G.settings.camDist = 'medium'; G.settings.controls = 'classic'; G.applySettings(); C.cut = false;
    return { cam: G.settings.camera, dist: G.settings.camDist, controls: G.settings.controls, state: G.state };
  };
  CW.place = (s) => {
    const h = G.hero;
    for (const k of [...G.input.keys]) G.input.keys.delete(k);
    // (a door walked into, a line said: done first; a menu or anything else left at once)
    for (let i = 0; i < 100 && (G.trans || G.state !== 'play'); i++) { if (G.state === 'dialog') G.input.taps.add('KeyE'); else if (G.state !== 'play' && G.state !== 'cinematic') G.setState('play'); G.step(0.1); }
    if (s.room) { if (G.room?.id !== s.room) { G.regions?.ensure?.(s.room, 'test'); G.enterRoom(s.room, G.rooms[s.room].spawn, true, true); G.step(0.3); } }
    else if (G.room) G.exitRoom({ x: s.x, z: s.z, a: s.a }, true, true);
    G.step(0.3);
    // (a walk through a spot, s.thru = [x, z, y?]: from up to 3 m before it on its own level, clear of walls and roofs —
    // 3 m back may stand inside a house, and the ground there is its roof)
    if (s.thru) {
      const [sx, sz, sy] = s.thru, ref = P.groundAt(sx, sz, (sy ?? P.groundAt(sx, sz)) + 1);
      s = { ...s, x: sx, z: sz, y: ref };
      for (const d of [3, 2.5, 2, 1.5, 1, 0.5]) {
        const x = sx - Math.sin(s.a) * d, z = sz - Math.cos(s.a) * d, g = P.groundAt(x, z, ref + 1);
        if (Math.abs(g - ref) < 1.2 && !P.blockedAt(x, z, g + 0.3, 0.35)) { s = { ...s, x, z, y: g }; break; }
      }
    }
    h.pos.set(s.x, s.y != null ? P.groundAt(s.x, s.z, s.y + 1) : P.groundAt(s.x, s.z), s.z); h.angle = s.a; h.resetMotion(); h.vy = 0; h.onGround = true;
    h.behaviour = 'normal';
    h.hp = h.maxHp; h.dead = false; h.rescue = null;   // (a fall off a terrace in an earlier walk cost a life: never dead here)
    for (const k of [...G.input.keys]) G.input.keys.delete(k);
    C.snap();
    for (let t = 0; t < 1; t += 1 / 60) G.frame(1 / 60, false);
    return [h.pos.x, h.pos.y, h.pos.z].map((u) => +u.toFixed(2));
  };
  // the drawn triangles near the walk (camclear.mjs's, with instanced meshes by instance; no skinned bodies, no glass,
  // no grass: an alpha-tested card the camera passes through is no surface)
  CW.tris = (box) => {
    const tris = [], v = [new V3(), new V3(), new V3()], M = new cam.matrixWorld.constructor(), Mi = new cam.matrixWorld.constructor();
    G.scene.updateMatrixWorld(true);
    let skipped = 0;
    G.scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.visible || !o.geometry?.attributes?.position) return;
      for (let a = o; a; a = a.parent) if (a === G.hero.rig.root || a.visible === false) return;
      const m = [o.material].flat()[0];
      if (!m || (m.transparent && m.opacity < 0.9) || m.colorWrite === false || m.alphaTest > 0 || m.depthWrite === false) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const n = o.isInstancedMesh ? o.count : 1;
      const Pos = o.geometry.attributes.position, I = o.geometry.index, cnt = I ? I.count : Pos.count;
      if (o.isInstancedMesh && cnt * n > 3e6) { skipped++; return; }
      for (let j = 0; j < n; j++) {
        if (o.isInstancedMesh) { o.getMatrixAt(j, Mi); M.multiplyMatrices(o.matrixWorld, Mi); } else M.copy(o.matrixWorld);
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(M), r = o.geometry.boundingSphere.radius * M.getMaxScaleOnAxis();
        if (c.x + r < box.x0 || c.x - r > box.x1 || c.z + r < box.z0 || c.z - r > box.z1) continue;
        for (let i = 0; i < cnt; i += 3) {
          for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(Pos, I ? I.getX(i + k) : i + k).applyMatrix4(M);
          const mx = Math.min(v[0].x, v[1].x, v[2].x), Mx = Math.max(v[0].x, v[1].x, v[2].x), mz = Math.min(v[0].z, v[1].z, v[2].z), Mz = Math.max(v[0].z, v[1].z, v[2].z);
          if (Mx < box.x0 || mx > box.x1 || Mz < box.z0 || mz > box.z1) continue;
          _ab.subVectors(v[1], v[0]); _ac.subVectors(v[2], v[0]); const nn = new V3().crossVectors(_ab, _ac); const L = nn.length(); if (L < 1e-9) continue; nn.divideScalar(L);
          tris.push({ a: v[0].clone(), b: v[1].clone(), c: v[2].clone(), n: nn, side: m.side, mat: m, name: o.name || o.parent?.name || '?', mx, Mx, mz, Mz, my: Math.min(v[0].y, v[1].y, v[2].y), My: Math.max(v[0].y, v[1].y, v[2].y) });
        }
      }
    });
    // a grid of 2 m cells over the box
    const cell = 2, grid = new Map(), key = (i, j) => i * 100003 + j;
    tris.forEach((T, ti) => { for (let i = Math.floor(T.mx / cell); i <= Math.floor(T.Mx / cell); i++) for (let j = Math.floor(T.mz / cell); j <= Math.floor(T.Mz / cell); j++) { const k = key(i, j); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(ti); } });
    CW.tri = { tris, grid, cell, key };
    return { n: tris.length, skipped };
  };
  // the nearest drawn surface to p within R: [distance, name, behind it (p on the back of the nearest face: inside a closed mesh)]
  const closest = (p, T) => {
    // (Ericson's closest point on a triangle)
    const a = T.a, b = T.b, c = T.c;
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    if (d1 <= 0 && d2 <= 0) return _q.copy(a);
    const bpx = p.x - b.x, bpy = p.y - b.y, bpz = p.z - b.z, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) return _q.copy(b);
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return _q.set(a.x + abx * v, a.y + aby * v, a.z + abz * v); }
    const cpx = p.x - c.x, cpy = p.y - c.y, cpz = p.z - c.z, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) return _q.copy(c);
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return _q.set(a.x + acx * w, a.y + acy * w, a.z + acz * w); }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return _q.set(b.x + (c.x - b.x) * w, b.y + (c.y - b.y) * w, b.z + (c.z - b.z) * w); }
    const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
    return _q.set(a.x + abx * v + acx * w, a.y + aby * v + acy * w, a.z + abz * v + acz * w);
  };
  CW.nearest = (p, R = 1.2) => {
    const D = CW.tri; if (!D) return [99, '', false];
    let best = R, who = '', back = false, bestT = null;
    const i0 = Math.floor((p.x - R) / D.cell), i1 = Math.floor((p.x + R) / D.cell), j0 = Math.floor((p.z - R) / D.cell), j1 = Math.floor((p.z + R) / D.cell), seen = new Set();
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const ti of D.grid.get(D.key(i, j)) || []) {
      if (seen.has(ti)) continue; seen.add(ti);
      const T = D.tris[ti]; if (T.mat.transparent && T.mat.opacity < 0.9) continue;   // (a roof faded while he stands under it: no surface now)
      if (p.x < T.mx - best || p.x > T.Mx + best || p.z < T.mz - best || p.z > T.Mz + best || p.y < T.my - best || p.y > T.My + best) continue;
      closest(p, T); const d = _q.distanceTo(p);
      if (d < best - 1e-6) { best = d; who = T.name; bestT = T; _n.copy(_q); }
    }
    // behind the nearest face (and that face one-sided): p is inside the mesh it belongs to
    if (bestT && bestT.side !== 2) back = (p.x - _n.x) * bestT.n.x + (p.y - _n.y) * bestT.n.y + (p.z - _n.z) * bestT.n.z < -1e-4;
    return [best, who, back];
  };
  // a drawn face within `near` of the lens and in front of it (the near plane cuts it open: an x-ray of its inside)
  CW.clipped = (p, f, near) => {
    const D = CW.tri; if (!D) return '';
    const R = near, i0 = Math.floor((p.x - R) / D.cell), i1 = Math.floor((p.x + R) / D.cell), j0 = Math.floor((p.z - R) / D.cell), j1 = Math.floor((p.z + R) / D.cell), seen = new Set();
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const ti of D.grid.get(D.key(i, j)) || []) {
      if (seen.has(ti)) continue; seen.add(ti);
      const T = D.tris[ti];
      if (p.x < T.mx - R || p.x > T.Mx + R || p.z < T.mz - R || p.z > T.Mz + R || p.y < T.my - R || p.y > T.My + R) continue;
      closest(p, T);
      if (_q.distanceTo(p) < near && (_q.x - p.x) * f.x + (_q.y - p.y) * f.y + (_q.z - p.z) * f.z > 0.02) return T.name;
    }
    return '';
  };
  // the camera inside something solid (camfollow.mjs's F.inside)
  CW.inside = () => {
    const c = cam.position, why = [], occ = C.occ?.() || null;   // (Citadel's W.occ, an outdoor room's R.occ: the camera's own)
    if (G.room?.outdoor || !G.room) { const th = G.world.terrain.heightAt(c.x, c.z); if (c.y < th + 0.3) why.push('terrain ' + (th - c.y).toFixed(2)); }
    for (const k of P.near(c.x, c.z)) { if (!k.enabled || c.y >= k.top || c.y <= k.bottom || !P._inside(k, c.x, c.z, 0)) continue; if (k.camSkip && occ) continue; why.push(k.type + '@' + k.x.toFixed(1) + ',' + k.z.toFixed(1)); }
    if (occ) for (const v of occ.near(c.x, c.z)) { const t = occ.topAt(v, c.x, c.z); if (t > -Infinity && c.y >= v.y0 && c.y <= t && !v.camOnly) why.push('volume@' + v.x.toFixed(1) + ',' + v.z.toFixed(1)); }
    return why.join('; ');
  };
  CW.seen = () => {
    const c = cam.position, h = G.hero, occ = C.occ?.() || null;
    const clear = (hy) => { const b = new V3(h.pos.x, h.pos.y + hy, h.pos.z), n = Math.ceil(c.distanceTo(b) / 0.25);
      for (let i = 1; i < n - 1; i++) { const p = c.clone().lerp(b, i / n);
        if ((G.room?.outdoor || !G.room) && G.world.terrain.heightAt(p.x, p.z) > p.y + 0.05) return false;
        for (const k of P.near(p.x, p.z)) if (k.enabled && !k.seeThrough && !k.fades && !(k.camSkip && occ) && !(k.type === 'cyl' && k.r < 1.5) && p.y < k.top && p.y > k.bottom && P._inside(k, p.x, p.z, 0)) return false;
        if (occ && occ.hit(p.x, p.y, p.z, new Set()) > -Infinity) return false; }
      return true; };
    return clear(1.5) || clear(1.0);
  };
  // what hides him now (the camera's own test, camRig.hiddenBy: 'scenery' or 'collider', '' in view), the registry's
  // "under" set kept as the camera left it (the test must not change what the camera reads next frame)
  CW.hidden = (p) => { const occ = C.occ?.(), keep = occ ? [...occ.under] : null; const why = C.hiddenBy(p) || ''; if (occ) { occ.under.clear(); for (const v of keep) occ.under.add(v); } return why; };
  // which collider hides him when the camera says 'collider' (camRig.occluded's walk from his pivot toward the camera)
  CW.hider = (hp) => {
    const c = cam.position, cp = Math.cos(C.pitch), sp = Math.sin(C.pitch), yaw = Math.atan2(c.x - hp.x, c.z - hp.z), maxD = Math.hypot(c.x - hp.x, c.z - hp.z) / Math.max(cp, 0.1);
    for (let d = 1.2; d <= maxD - 0.5; d += 0.5) {
      const x = hp.x + Math.sin(yaw) * cp * d, z = hp.z + Math.cos(yaw) * cp * d, y = hp.y + 1.4 + sp * d;
      for (const k of P.near(x, z)) {
        if (!k.enabled || k.fades || k.camSkip || k.top < y || k.bottom > y) continue;
        if (k.type === 'cyl' ? Math.hypot(x - k.x, z - k.z) < (k.camR ?? k.r) + 0.3 : P._inside(k, x, z, 0.3)) return `${k.type}${k.type === 'cyl' ? ' r' + k.r.toFixed(2) : ' ' + (2 * k.hw).toFixed(1) + 'x' + (2 * k.hd).toFixed(1)}@${k.x.toFixed(1)},${k.z.toFixed(1)} ${k.bottom > -50 ? k.bottom.toFixed(1) : '-'}..${k.top.toFixed(1)}${k.seeThrough ? ' seeThrough' : ''}${k.noStand ? ' noStand' : ''}${k.stair ? ' stair' : ''}${k.name ? ' ' + k.name : ''} d${d.toFixed(1)}`;
      }
    }
    return '';
  };
  const up = C.update.bind(C);
  C.update = (...args) => {
    up(...args);
    if (!CW.on || C.cine || C.override || C.iso || (G.room && !G.room.outdoor)) return;
    const h = G.hero, c = cam.position, ch = C.ch || {};
    const py = (ch.h ?? h.pos.y) + 1.4, arm = Math.hypot(c.x - h.pos.x, c.y - py, c.z - h.pos.z);
    const toCam = Math.atan2(c.x - h.pos.x, c.z - h.pos.z), off = deg(ad(h.angle + Math.PI, toCam));
    const [nd, nwho, back] = CW.nearest(c);
    const ins = CW.inside();
    const L = C.look, fl = Math.hypot(L.x - c.x, L.y - c.y, L.z - c.z) || 1;
    const clip = CW.clipped(c, { x: (L.x - c.x) / fl, y: (L.y - c.y) / fl, z: (L.z - c.z) / fl }, cam.near);
    const prev = CW.F[CW.F.length - 1], hid = CW.hidden(h.pos);
    CW.F.push({ t: G.time, arm, off, ha: h.angle, sp: Math.hypot(h.pos.x - (prev?.h[0] ?? h.pos.x), h.pos.z - (prev?.h[2] ?? h.pos.z)) / (args[0] || 1 / 60),
      nd, nwho, back, clip, near: cam.near, ins, seen: CW.seen(), hid, hw: hid === 'collider' ? CW.hider(h.pos) : '', c: [c.x, c.y, c.z], h: [h.pos.x, h.pos.y, h.pos.z], pitch: C.pitch, sw: C.why.off || 0, kb: C.why.kb || 0, swg: ch.swGoal || 0, over: ch.overK || 0, want: ch.want, tier: ch.tight ? 1 : 0, key: [...G.input.keys].join('+'), st: G.state + (G.trans ? '+trans' : '') + (h.behaviour === 'normal' ? '' : ':' + h.behaviour) });
  };
  CW.start = () => { CW.F = []; CW.on = true; };
  CW.step = (s, fps = 60, stopAt = -1) => {
    const dt = 1 / fps;
    for (let t = 0; t < s - 1e-9; t += dt) { G.frame(dt, false); if (stopAt >= 0 && CW.F.length > stopAt) return true; }
    return false;
  };
  CW.stop = () => { CW.on = false; return CW.stats(CW.F); };
  // the stats of a walk: the least arm, the time under 5 m (all, the longest stretch), the view's heading off his back
  // (most; and on frames he walks a steady way — facing held 0.6 s, moving), frames in something solid, behind a drawn
  // face (inside a mesh), with a drawn face nearer than the near plane (x-ray), not in view
  CW.stats = (F) => {
    const r = (u, k = 2) => +u.toFixed(k);
    let under31 = 0, minArm = 99, minAt = -1, under = 0, run = 0, runMax = 0, maxOff = 0, maxOffSteady = 0, steadyT = 0, ins = 0, insAt = -1, insWhy = '', back = 0, backAt = -1, backWho = '', xr = 0, xrAt = -1, xrWho = '', unseen = 0, hidden = 0, hidRun = 0, hidMax = 0, hidAt = -1, unRun = 0, unseenMax = 0, unseenAt = -1, minNd = 99, maxStep = 0, maxDArm = 0, dur = 0, offAt = -1;
    for (let i = 0; i < F.length; i++) {
      const f = F[i], dt = i ? Math.max(1e-4, F[i].t - F[i - 1].t) : 1 / 60; dur += dt;
      if (f.arm < minArm) { minArm = f.arm; minAt = i; }
      if (f.arm < 5) { under += dt; run += dt; runMax = Math.max(runMax, run); } else run = 0;
      if (f.arm < 3.1) under31 += dt;
      if (Math.abs(f.off) > maxOff) { maxOff = Math.abs(f.off); }
      steadyT = i && Math.abs(ad(F[i - 1].ha, f.ha)) < 0.002 && f.sp > 0.5 ? steadyT + dt : 0;
      if (steadyT > 0.6 && Math.abs(f.off) > maxOffSteady) { maxOffSteady = Math.abs(f.off); offAt = i; }
      if (f.ins) { ins++; if (insAt < 0) { insAt = i; insWhy = f.ins; } }
      if (f.back && f.nd < 0.6) { back++; if (backAt < 0) { backAt = i; backWho = f.nwho; } }
      if (f.clip) { xr++; if (xrAt < 0) { xrAt = i; xrWho = f.clip; } }
      if (!f.seen) { unseen++; unRun++; if (unRun > unseenMax) { unseenMax = unRun; unseenAt = i - (unRun >> 1); } } else unRun = 0;
      if (f.hid) { hidden++; hidRun++; if (hidRun > hidMax) { hidMax = hidRun; hidAt = i - (hidRun >> 1); } } else hidRun = 0;
      minNd = Math.min(minNd, f.nd);
      if (i) { const p = F[i - 1]; const yaw1 = Math.atan2(f.c[0] - f.h[0], f.c[2] - f.h[2]), yaw0 = Math.atan2(p.c[0] - p.h[0], p.c[2] - p.h[2]); maxStep = Math.max(maxStep, Math.abs(deg(ad(yaw0, yaw1))) / (dt * 60)); maxDArm = Math.max(maxDArm, Math.abs(f.arm - p.arm) / dt); }
    }
    return { frames: F.length, dur: r(dur), minArm: r(minArm), minAt, under31: r(under31), under5: r(under), under5run: r(runMax), maxOff: r(maxOff, 1), maxOffSteady: r(maxOffSteady, 1), offAt,
      inside: ins, insAt, insWhy, behindFace: back, backAt, backWho, backCam: backAt >= 0 ? F[backAt].c.map((u) => r(u)) : null, backHero: backAt >= 0 ? F[backAt].h.map((u) => r(u)) : null, xray: xr, xrAt, xrWho, minSurf: r(minNd, 3), unseen, unseenMax, unseenAt, hidden, hidMax, hidAt, hidWho: hidAt >= 0 ? `${F[hidAt].hid} ${F[hidAt].hw}`.trim() : "", maxStepDeg60: r(maxStep, 2), maxArmRate: r(maxDArm, 1),
      endArm: F.length ? r(F[F.length - 1].arm) : null, end: F.length ? F[F.length - 1].h.map((u) => r(u)) : null };
  };
  // a compact trace (every n-th frame)
  CW.trace = (n = 6) => CW.F.filter((_, i) => i % n === 0).map((f) => `${f.t.toFixed(2)} ${f.st} ${f.key || "-"} arm ${f.arm.toFixed(2)} off ${f.off.toFixed(0)} p ${f.pitch.toFixed(2)} sw ${(f.sw * 57.3).toFixed(0)} g ${((f.swg || 0) * 57.3).toFixed(0)} kb ${(f.kb || 0).toFixed(1)} ov ${f.over.toFixed(2)} want ${f.want?.toFixed?.(2)} nd ${f.nd.toFixed(2)}${f.back ? 'B' : ''} ${f.ins ? 'IN ' + f.ins : ''}${f.hid ? ' HID ' + f.hid : ''} h ${f.h.map((u) => u.toFixed(1)).join(',')} c ${f.c.map((u) => u.toFixed(1)).join(',')}`);
})();
