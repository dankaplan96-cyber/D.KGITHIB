// #58 (ORDER-71): the first fights' bot, in the page (loaded by tests/fight58.mjs after tests/lib/player.js and
// tests/lib/fightlog.js). A port of the local agent's captures/hw-68/fights/fight68.mjs to game time: it reads what a
// player sees (who is near, who winds up, a heart close by) every TICK of game time and holds keys in the game's input
// set (G.input.keys / taps), then lets the game run with game.step. Nothing is moved or set by hand in the fight.
//   ctrl  'modern' (WASD camera-relative, L locks on, F throws (held for a charge against armour), Shift dodges) or
//         'classic' (arrows turn and walk, F throws where he faces, X dodges)
//   read  false: as fight68 (never dodges a bolt; dodges a close wind-up with fight68's own table, 0.55 s for any guard)
//         true:  a player who reads the tells: a bolt in flight seen for REACT s → a dodge aside; a close wind-up dodged
//         from the enemy's own wind-up length (guards.js tune.windup, × the difficulty), not the table
// Automated runtime only (headless Chromium, SwiftShader, game.step): a bot, not a person.
(() => {
  const G = window.game, I = G.input, keys = I.keys, DT = 1 / 30;
  const CALM = new Set(['patrol', 'idle', 'guard', 'home', 'return', 'dead', 'search']);
  const TELL = { mite: [0.5, 2.3], gdog: [0.5, 3.0], guard: [0.55, 2.5], guardG: [0.55, 2.5], fclone: [0.55, 2.5], sentry: [0.7, 2.8], crawler: [1.0, 3.6] };
  const REACT = 0.3;   // s: a person's reaction to a bolt leaving the drone
  const B = (window.FB = { botv: 3, log: [], throws: 0, dodges: 0, boltDodges: 0, beaten: new Set(), seen: new Set() });
  let ctrl = 'modern', read = false;
  const el = () => +(G.time - B.t0).toFixed(1);
  const note = (s) => { B.log.push(`[${el()}] ${s}`); };
  const hold = (ks) => { for (const k of [...keys]) if (!ks.includes(k)) keys.delete(k); for (const k of ks) keys.add(k); };
  const tap = (k, s = 0.06) => { keys.add(k); I.taps.add(k); run(s); keys.delete(k); };
  // let the game run s seconds with the keys held (a person's reading of the screen is every TICK, not every frame)
  const run = (s) => { for (let t = 0; t < s - 1e-6; t += DT) G.step(DT, DT); };
  const look = () => {
    const h = G.hero, cd = G.camera.getWorldDirection(new h.pos.constructor());
    const en = G.enemies.filter((e) => e.alive && e.present && Math.abs(e.pos.y - h.pos.y) < 4).map((e) => ({ e, id: e.id, kind: e.def?.kind || '?', st: e.state, stT: e.stateT || 0, d: Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z), x: e.pos.x, z: e.pos.z, armour: e.armour || 0, hostile: !CALM.has(e.state) })).sort((a, b) => a.d - b.d);
    const heart = G.pickups?.list?.filter((q) => q.mesh.visible && q.type === 'heart' && G.canTake?.(q) && Math.hypot(q.pos.x - h.pos.x, q.pos.z - h.pos.z) < 8).map((q) => [q.pos.x, q.pos.z])[0] || null;
    return { st: G.state, hp: h.hp, mp: h.mp, dead: !!h.dead, x: h.pos.x, z: h.pos.z, a: h.angle, fx: cd.x, fz: cd.z, ball: G.ball?.state, canDodge: !!h.combat?.canDodge?.(), locked: !!G.targeting?.lock, en, heart, k: G.combatDir?.diff?.windup ?? 1 };
  };
  // Modern: the keys for a world direction, from the camera's view
  const dirKeys = (s, dx, dz) => {
    const L = Math.hypot(s.fx, s.fz) || 1, fx = s.fx / L, fz = s.fz / L, rx = -fz, rz = fx, d = Math.hypot(dx, dz) || 1;
    const a = (dx * fx + dz * fz) / d, b = (dx * rx + dz * rz) / d, k = [];
    if (a > 0.38) k.push('KeyW'); else if (a < -0.38) k.push('KeyS');
    if (b > 0.38) k.push('KeyD'); else if (b < -0.38) k.push('KeyA');
    return k;
  };
  // Classic: ← → turn toward it, ↑ walks once roughly facing it (walk false: only turn)
  const classicKeys = (s, dx, dz, walk = true) => {
    let d = Math.atan2(dx, dz) - s.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const k = []; if (Math.abs(d) > 0.15) k.push(d > 0 ? 'ArrowLeft' : 'ArrowRight'); if (walk && Math.abs(d) < 0.8) k.push('ArrowUp'); return k;
  };
  const toward = (s, dx, dz, walk = true) => (ctrl === 'classic' ? classicKeys(s, dx, dz, walk) : dirKeys(s, dx, dz));
  const away = (s, dx, dz) => (ctrl === 'classic' ? ['ArrowDown'] : dirKeys(s, -dx, -dz));
  const DODGE = () => (ctrl === 'classic' ? 'KeyX' : 'ShiftLeft');
  // a bolt coming at him that a person has seen for REACT s, 2.4 m off or nearer (P.gstep's own distance)
  const inbound = (s) => (G.bolts?.list || []).find((b) => {
    if (b.fb58) return false; b.born ??= G.time;
    const p = b.m.position, dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz);
    return G.time - b.born >= REACT && d < 2.4 && (b.v.x * dx + b.v.z * dz) > 0;
  });
  // the dodge aside of a bolt's line (Modern: Shift with the side held; Classic: X with ← or → held, the side hop)
  const dodgeAside = (s, b) => {
    const sp = Math.hypot(b.v.x, b.v.z) || 1, nx = -b.v.z / sp, nz = b.v.x / sp, p = b.m.position;
    const off = (s.x - p.x) * nx + (s.z - p.z) * nz, sx = off >= 0 ? nx : -nx, sz = off >= 0 ? nz : -nz;
    let ks;
    if (ctrl === 'classic') { const rx = -Math.cos(s.a), rz = Math.sin(s.a); ks = [(rx * sx + rz * sz) >= 0 ? 'ArrowRight' : 'ArrowLeft']; }
    else ks = dirKeys(s, sx, sz);
    hold(ks); keys.add(DODGE()); I.taps.add(DODGE()); run(DT); keys.delete(DODGE()); run(0.12); hold([]);
  };
  // (read) the shooters aiming at him now: a drone winding up, a guard's rifle coming up
  const aiming = () => G.enemies.filter((e) => e.alive && e.present && ((e.def?.kind === 'drone' && e.state === 'windup') || (e.state === 'aim' && e.aimLine)));
  const eye = (e) => e.pos.y + (e.hover ?? 1.5);
  const seenFrom = (e, x, z, y) => G.physics.lineOfSight(e.pos.x, eye(e), e.pos.z, x, y + 1.2, z);
  // (read) the nearest spot within 4 m that none of the shooters can see (a crate stack, a container, a wall), or null
  const coverSpot = (s, shooters) => {
    const h = G.hero; let best = null, bd = 1e9;
    for (const r of [1.2, 2.0, 2.8, 3.6]) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r, y = G.physics.groundAt(x, z, h.pos.y + 0.5);
      if (Math.abs(y - h.pos.y) > 0.6 || G.physics.solidAt?.(x, z, y + 0.5, 0.45)) continue;
      if (shooters.some((e) => seenFrom(e, x, z, y))) continue;
      if (!G.physics.lineOfSight(s.x, h.pos.y + 0.9, s.z, x, y + 0.9, z)) continue;   // (a straight walk there)
      if (r < bd) { bd = r; best = [x, z]; }
    }
    return best;
  };
  B.hp = { last: null };
  const watch = (s) => { for (const q of s.en) B.seen.add(q.id); };
  // walk to (x, z) by the planner's path (P.plan), keys from the camera (Modern) or the facing (Classic)
  B.go = (x, z, tol = 1.2, maxS = 90) => {
    const t0 = G.time; let pts = null, wi = 0, lastPlan = -99;
    while (G.time - t0 < maxS) {
      const s = look(); watch(s);
      if (s.dead || s.st !== 'play') { hold([]); return 'stop'; }
      if (s.en.some((e) => e.hostile && e.d < 9)) { hold([]); return 'threat'; }
      const dd = Math.hypot(x - s.x, z - s.z);
      const prompt = document.querySelector('#prompt')?.textContent || '';
      if (dd < tol || (prompt && dd < 2.6 && !/Talk/.test(prompt))) { hold([]); return 'there'; }
      if (!pts || G.time - lastPlan > 6) { const p = window.P.plan(x, z, { tol }); pts = (p.ok && p.pts?.length ? p.pts : [[x, z]]).map((q) => (Array.isArray(q) ? q : [q.x, q.z])); wi = 0; lastPlan = G.time; }
      while (wi < pts.length - 1 && Math.hypot(pts[wi][0] - s.x, pts[wi][1] - s.z) < 0.7) wi++;
      const [px, pz] = pts[wi];
      hold(toward(s, px - s.x, pz - s.z)); run(0.1);
    }
    hold([]); return 'timeout';
  };
  // the fight: until nobody hostile is within r, he dies, or maxS
  B.fight = (r = 14, maxS = 150) => {
    const t0 = G.time;
    while (G.time - t0 < maxS) {
      const s = look(); watch(s);
      if (s.dead) return 'dead';
      if (s.st !== 'play') { hold([]); window.P.settle(); continue; }
      const foes = s.en.filter((e) => e.d < r && e.hostile);
      if (!foes.length) { hold([]); return 'clear'; }
      const e = foes[0];
      if (read && s.canDodge) { const b = inbound(s); if (b) { b.fb58 = true; dodgeAside(s, b); B.dodges++; B.boltDodges++; continue; } }
      // (read) a shooter aiming at him and cover within 4 m: behind it (after a person's reaction to the line coming up)
      if (read) {
        const sh = aiming().filter((q) => q.stateT >= REACT && seenFrom(q, s.x, s.z, G.hero.pos.y));
        const cs = sh.length && coverSpot(s, sh);
        if (cs) { hold(toward(s, cs[0] - s.x, cs[1] - s.z)); run(0.2); B.covers = (B.covers || 0) + 1; continue; }
        // hurt (40% or less): a searchable container near that still gives (LBA2's giver), the action (Space) there
        const gv = s.hp <= G.hero.maxHp * 0.4 && G.givers().filter((q) => !G.giverTaken(q) && Math.hypot(q.x - s.x, q.z - s.z) < 14).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
        if (gv && !s.en.some((q) => q.hostile && q.d < 2.5)) {
          if (Math.hypot(gv.x - s.x, gv.z - s.z) > gv.r - 0.5) { hold(toward(s, gv.x - s.x, gv.z - s.z)); run(0.2); continue; }
          hold([]); tap('Space', 0.1); run(0.7); B.searched = (B.searched || 0) + 1; continue;
        }
      }
      // a close enemy's wind-up nearly over → the dodge
      // (fight68: only the nearest one's; read: whichever close one winds up — a dog nearer than the guard does not hide
      //  the baton going up — timed from its own wind-up length)
      const wq = read ? s.en.find((q) => (q.st === 'windup' || q.st === 'slide') && TELL[q.kind] && q.d < TELL[q.kind][1] && q.e._fb58 !== q.e.stateT0) || e : e;
      const T = TELL[wq.kind];
      const wind = read ? (wq.e.tune?.windup ?? T?.[0]) : T?.[0];
      if (s.canDodge && T && (wq.st === 'windup' || wq.st === 'slide') && wq.d < T[1] && wq.stT > wind * s.k - 0.12 && wq.e._fb58 !== wq.e.stateT0) {
        if (read) wq.e._fb58 = wq.e.stateT0;
        hold([]); tap(DODGE(), 0.06); B.dodges++; run(0.15); continue;
      }
      if (s.heart && (s.hp <= 5 || (read && s.hp <= G.hero.maxHp - 3))) { hold(toward(s, s.heart[0] - s.x, s.heart[1] - s.z)); run(0.2); continue; }
      if (e.d > 7.5) { hold(toward(s, e.x - s.x, e.z - s.z)); run(0.15); continue; }
      if (s.ball !== 'idle') { hold(e.d < 2.2 ? away(s, e.x - s.x, e.z - s.z) : []); run(0.1); continue; }
      // (read) an armoured one needs a charged throw (0.75 s held, no dodge while held): a person does not start one inside
      // his baton's reach (1.5 m) unless it is his opening (the baton down after a strike, a stagger, the rifle up); one step
      // back first (at most 1 s of stepping, then the throw anyway)
      if (read && e.armour > 1 && e.d < 1.9 && !['recover', 'hurt', 'aim'].includes(e.st) && (e.e._back58 || 0) < 1) { e.e._back58 = (e.e._back58 || 0) + 0.2; hold(away(s, e.x - s.x, e.z - s.z)); run(0.2); continue; }
      if (e.e) e.e._back58 = 0;
      // face it, lock on (Modern), throw (held for a charge against armour)
      if (ctrl === 'classic') {
        const k = classicKeys(s, e.x - s.x, e.z - s.z, false);
        if (k.length) { hold(k); run(0.07); hold([]); continue; }
      } else { hold(dirKeys(s, e.x - s.x, e.z - s.z)); run(0.07); hold([]); if (!s.locked) tap('KeyL', 0.05); }
      if (e.armour > 1) { keys.add('KeyF'); I.taps.add('KeyF'); run(0.95); keys.delete('KeyF'); } else tap('KeyF', 0.06);
      B.throws++; run(0.25);
      const s2 = look(); for (const id of B.seen) if (!s2.en.some((q) => q.id === id)) B.beaten.add(id);
    }
    return 'timeout';
  };
  // (the wind-up's start, so a dodge is pressed once per wind-up)
  const up0 = G.step.bind(G);
  G.step = (dt, fdt) => { for (const e of G.enemies) { if (e._fbSt !== e.state) { e._fbSt = e.state; e.stateT0 = G.time; } } return up0(dt, fdt); };
  B.start = (o = {}) => { ctrl = o.ctrl || 'modern'; read = !!o.read; B.t0 = G.time; B.log = []; B.throws = B.dodges = B.boltDodges = B.covers = B.searched = 0; B.beaten = new Set(); B.seen = new Set(); G.settings.controls = ctrl; G.applySettings(); };
  B.note = note;
})();
