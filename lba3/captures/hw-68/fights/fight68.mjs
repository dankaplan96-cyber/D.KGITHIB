// ORDER 68.3: the first fights, played with real input — Playwright's keyboard (Modern controls: WASD camera-relative,
// L locks on, F throws the ball (held for a charge against armour), Shift dodges, E uses), from the tests' staged saves.
// The way to a fight is planned with the test harness's planner (P.plan: only the path; every step is a key), as a player
// knows the way; in the fight it reads what a player sees: who is near, who winds up (the tell), a heart on the ground.
// Logged: health in and out, every hit taken (by whom, in what state), deaths, tries, the time, the enemies beaten.
// usage: node fight68.mjs <OUT> <lba3 ROOT> <ch2|zdepot> [tries]
import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [OUT, ROOT, WHICH = 'ch2', TRIES = '3'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const SAVE = process.env.SAVE || { ch2: 'base-03', zdepot: 'base-05', pylons: 'base-15' }[WHICH];
const server = await serve(ROOT);
const origin = new URL(server.url).origin;
const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/campaign', SAVE + '.save.json'), 'utf8').replaceAll('http://localhost:9201', origin));
for (const o of st.origins || []) o.origin = origin;
const logf = `${OUT}/${WHICH}.log`; fs.writeFileSync(logf, '');
const log = (...a) => { const s = a.join(' '); console.log(s); fs.appendFileSync(logf, s + '\n'); };
const summary = [];
for (let tr = 1; tr <= +TRIES; tr++) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1390,860', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: st });
  const page = await ctx.newPage();
  const ev = (f, a) => page.evaluate(f, a);
  const held = new Set();
  const hold = async (ks) => { for (const k of [...held]) if (!ks.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of ks) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  const tap = async (k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
  let n = 0; const shot = async (tag) => page.screenshot({ path: `${OUT}/${WHICH}-try${tr}-${String(n++).padStart(2, '0')}-${tag}.jpg`, type: 'jpeg', quality: 80 });
  await page.goto(server.url + '?nocine', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
  await page.click('[data-act="continue"]', { timeout: 60000 });
  await page.waitForFunction(() => game.state && !game.preparing && game.hero, null, { timeout: 300000 });
  await page.waitForTimeout(1500);
  // a player's Settings: Modern controls
  await ev((c) => { game.settings.controls = c; game.applySettings(); }, WHICH === 'pylons' ? 'classic' : 'modern');
  await page.addScriptTag({ path: path.join(ROOT, 'tests/lib/player.js') });
  await page.mouse.click(683, 384);
  const settle = async () => { for (let i = 0; i < 60; i++) { const s = await ev(() => game.state); if (s === 'play') return; await tap('KeyE'); await page.waitForTimeout(350); } };
  await settle();
  const T0 = Date.now(); const el = () => ((Date.now() - T0) / 1000).toFixed(1);
  const hp0 = await ev(() => [game.hero.hp, game.hero.maxHp, game.hero.mp ?? null]);
  log(`== try ${tr} ${WHICH} (${SAVE}): hp ${hp0[0]}/${hp0[1]} mp ${hp0[2]}`);
  await shot('start');
  // ---- the state a player sees
  const look = () => ev(() => {
    const G = game, h = G.hero, cd = G.camera.getWorldDirection(new G.camera.position.constructor());
    const CALM = new Set(['patrol', 'idle', 'guard', 'home', 'return', 'dead', 'search']);
    const en = G.enemies.filter((e) => e.alive && e.present && Math.abs(e.pos.y - h.pos.y) < 4).map((e) => ({ id: e.id, kind: e.def?.kind || e.type || '?', st: e.state, stT: e.stateT || 0, d: Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z), x: e.pos.x, z: e.pos.z, armour: e.armour || 0, hostile: !CALM.has(e.state) })).sort((a, b) => a.d - b.d);
    const heart = G.pickups?.list?.filter((q) => q.mesh.visible && q.type === 'heart' && G.canTake?.(q) && Math.hypot(q.pos.x - h.pos.x, q.pos.z - h.pos.z) < 8).map((q) => [q.pos.x, q.pos.z])[0] || null;
    const bolts = (G.bolts?.list || []).filter((b) => b.m && Math.hypot(b.m.position.x - h.pos.x, b.m.position.z - h.pos.z) < 3).length;
    return { bolts, prompt: document.querySelector('#prompt')?.textContent || '', st: G.state, hp: h.hp, mp: h.mp, dead: !!h.dead, x: h.pos.x, z: h.pos.z, a: h.angle, fx: cd.x, fz: cd.z, ball: G.ball?.state, canDodge: !!h.combat?.canDodge?.(), locked: !!G.targeting?.locked, en, heart, k: G.combatDir?.diff?.windup ?? 1 };
  });
  // Modern: the keys for a direction in the world, from the camera's view
  const dirKeys = (s, dx, dz, run = false) => {
    const L = Math.hypot(s.fx, s.fz) || 1, fx = s.fx / L, fz = s.fz / L, rx = -fz, rz = fx, d = Math.hypot(dx, dz) || 1;
    const a = (dx * fx + dz * fz) / d, b = (dx * rx + dz * rz) / d, k = [];
    if (a > 0.38) k.push('KeyW'); else if (a < -0.38) k.push('KeyS');
    if (b > 0.38) k.push('KeyD'); else if (b < -0.38) k.push('KeyA');
    return k;
  };
  // Classic (the Core): ← → turn, ↑ walks, F throws where he faces
  const classicKeys = (s, dx, dz, walk = true) => { let d = Math.atan2(dx, dz) - s.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const k = []; if (Math.abs(d) > 0.15) k.push(d > 0 ? 'ArrowLeft' : 'ArrowRight'); if (walk && Math.abs(d) < 0.8) k.push('ArrowUp'); return { k, d }; };
  const TELL = { mite: [0.5, 2.3], gdog: [0.5, 3.0], guard: [0.55, 2.5], guardG: [0.55, 2.5], fclone: [0.55, 2.5], sentry: [0.7, 2.8], crawler: [1.0, 3.6] };
  let throwsP = 0, hpLast = hp0[0], beaten = new Set(), seen = new Set(), hits = [], deaths = 0;
  const watchHp = async (s) => {
    for (const e of s.en) seen.add(e.id);
    if (s.hp < hpLast) { const e0 = s.en[0], bolt = (watchHp.bolts || 0) > 0 && !(e0 && e0.d < 1.8 && /strike|windup|lunge|slam/.test(e0.st)); const e = e0;
      hits.push({ t: el(), by: bolt ? 'bolt' : e ? `${e.kind}:${e.id}` : '?', near: e ? `${e.kind}:${e.st}:${e.d.toFixed(1)}` : null, st: e?.st, d: e ? +e.d.toFixed(1) : null, hp: s.hp }); log(`[${el()}] HIT hp ${hpLast}→${s.hp} ${hits[hits.length - 1].by === 'bolt' ? 'BOLT,' : ''} nearest ${e ? e.kind + ':' + e.id + ' (' + e.st + ', ' + e.d.toFixed(1) + ' m)' : '?'}`); }
    hpLast = s.hp; watchHp.bolts = s.bolts;
  };
  // walk to (x,z) by the planner's path, fighting what comes at him on the way
  const go = async (x, z, tol = 1.2, maxS = 90) => {
    const t0 = Date.now(); let pts = null, wi = 0, lastPlan = 0;
    while ((Date.now() - t0) / 1000 < maxS) {
      const s = await look(); await watchHp(s);
      if (s.dead || s.st !== 'play') return 'stop';
      if (Date.now() - (go.lastLog || 0) > 10000) { go.lastLog = Date.now(); log(`[${el()}] at ${s.x.toFixed(1)},${s.z.toFixed(1)} hp ${s.hp}; near: ${s.en.slice(0, 4).map((e) => e.id + ' ' + e.st + ' ' + e.d.toFixed(1)).join(', ')}; prompt ${JSON.stringify(s.prompt)}`); }
      if (s.en.some((e) => e.hostile && e.d < 9)) { await hold([]); return 'threat'; }
      const dd = Math.hypot(x - s.x, z - s.z);
      if (dd < tol || (s.prompt && dd < 2.6 && !/Talk/.test(s.prompt))) { await hold([]); return 'there'; }
      if (!pts || Date.now() - lastPlan > 6000) { const p = await ev(({ x, z, tol }) => window.P.plan(x, z, { tol }), { x, z, tol }); pts = (p.ok && p.pts?.length ? p.pts : [[x, z]]).map((q) => Array.isArray(q) ? q : [q.x, q.z]); wi = 0; lastPlan = Date.now(); }
      while (wi < pts.length - 1 && Math.hypot(pts[wi][0] - s.x, pts[wi][1] - s.z) < 0.7) wi++;
      const [px, pz] = Array.isArray(pts[wi]) ? pts[wi] : [pts[wi].x, pts[wi].z];
      const ks = dirKeys(s, px - s.x, pz - s.z);
      if (!go.dbg || Date.now() - go.dbg > 5000) { go.dbg = Date.now(); log(`[${el()}] plan ${pts.length} pts, wp ${wi} → ${(+px).toFixed(1)},${(+pz).toFixed(1)} keys ${ks.join('+')} cam ${s.fx.toFixed(2)},${s.fz.toFixed(2)}`); }
      await hold(ks);
      await page.waitForTimeout(90);
    }
    await hold([]); return 'timeout';
  };
  // the fight: until nobody hostile is near (r), he dies, or maxS
  const fight = async (r = 14, maxS = 150) => {
    const t0 = Date.now(); let throws = 0, dodges = 0;
    while ((Date.now() - t0) / 1000 < maxS) {
      const s = await look(); await watchHp(s);
      if (s.dead) return { r: 'dead', throws, dodges };
      if (s.st !== 'play') { await hold([]); await settle(); continue; }
      const foes = s.en.filter((e) => e.d < r && e.hostile);
      if (Date.now() - (fight.lastLog || 0) > 5000) { fight.lastLog = Date.now(); log(`[${el()}] fight: hp ${s.hp} mp ${s.mp}; ${s.en.slice(0, 5).map((e) => e.id + ' ' + e.st + ' ' + e.d.toFixed(1) + 'm').join(', ')}; throws ${throws}`); }
      if (!foes.length) { await hold([]); return { r: 'clear', throws, dodges }; }
      const e = foes[0];
      // the tell: a close enemy's wind-up nearly over → the dodge (Shift)
      const T = TELL[e.kind];
      if (s.canDodge && T && (e.st === 'windup' || e.st === 'slide') && e.d < T[1] && e.stT > T[0] * s.k - 0.12) { await hold([]); await tap('ShiftLeft', 60); dodges++; await page.waitForTimeout(150); continue; }
      // a heart close by when hurt
      if (s.heart && s.hp <= 5) { await hold(dirKeys(s, s.heart[0] - s.x, s.heart[1] - s.z)); await page.waitForTimeout(200); continue; }
      // too far for the ball: close in; too near: step back a little
      if (e.d > 7.5) { await hold(dirKeys(s, e.x - s.x, e.z - s.z)); await page.waitForTimeout(150); continue; }
      if (s.ball !== 'idle') { await hold(e.d < 2.2 ? dirKeys(s, s.x - e.x, s.z - e.z) : []); await page.waitForTimeout(100); continue; }
      // face it (a short press toward it), lock on, throw — held for a charge against armour
      await hold(dirKeys(s, e.x - s.x, e.z - s.z)); await page.waitForTimeout(70); await hold([]);
      if (!s.locked) await tap('KeyL', 50);
      if (e.armour > 1) { await page.keyboard.down('KeyF'); await page.waitForTimeout(950); await page.keyboard.up('KeyF'); } else await tap('KeyF', 60);
      throws++; await page.waitForTimeout(250);
      const s2 = await look(); for (const id of seen) if (!s2.en.some((q) => q.id === id)) beaten.add(id);
    }
    return { r: 'timeout', throws, dodges };
  };
  let result = '';
  if (WHICH === 'ch2') {
    const V = await ev(() => { const v = game.world.valves.find((q) => q.id === 'depot'); return [v.x, v.z, v.open]; });
    log('the depot valve at', V[0].toFixed(1), V[1].toFixed(1), 'open', V[2]);
    const tStart = Date.now(); for (let k = 0; k < 40 && (Date.now() - tStart) < 420000 && !(await ev(() => game.world.valves.find((q) => q.id === 'depot').open)); k++) {
      const g = await go(V[0], V[1], 1.3, 100); log(`[${el()}] go → ${g}`);
      if (g === 'stop') { const s = await look(); if (s.dead) break; await settle(); continue; }
      if (g === 'threat') { const f = await fight(); log(`[${el()}] fight → ${JSON.stringify(f)}`); await shot('after-fight'); if (f.r === 'dead') break; continue; }
      if (g === 'there') { const s = await look(); await hold(dirKeys(s, V[0] - s.x, V[1] - s.z)); await page.waitForTimeout(80); await hold([]); await tap('KeyE', 90); await page.waitForTimeout(3000); await settle(); log(`[${el()}] E at the valve; open ${await ev(() => game.world.valves.find((q) => q.id === 'depot').open)}`); }
    }
    result = (await ev(() => game.world.valves.find((q) => q.id === 'depot').open)) ? 'valve open' : 'valve shut';
  } else if (WHICH === 'pylons') {
    // the Core (base-15: in the core, 0/3): the ball stuns the guardian; while it's stunned, stand on the nearest plate not
    // yet converted; the dive's ring under him → Shift. A player sees the plates on the floor and the guardian's state.
    const tP = Date.now(), done = [];
    await ev(() => { if (game.hero.behaviour !== 'normal') {} });
    await tap('F1', 60);
    while ((Date.now() - tP) / 1000 < 420) {
      const q = await ev(() => { const G = game, h = G.hero, C = G.story.cur, g = G.enemies.find((e) => e.id === 'guardian');
        const pl = (C.plates?.() || []).filter((p) => !G.flags['c3_pylon' + p.i]).map((p) => [p.i, p.x, p.z, Math.hypot(p.x - h.pos.x, p.z - h.pos.z)]).sort((a, b) => a[3] - b[3]);
        return { n: C.pylons?.() ?? 0, gst: g?.state, gx: g?.pos.x, gz: g?.pos.z, ring: g && g.state === 'lock' && g.spot ? Math.hypot(h.pos.x - g.spot.x, h.pos.z - g.spot.z) : 99, pl, over: !!G.flags.c3_overload }; });
      const s = await look(); await watchHp(s);
      if (q.n > done.length) { done.push(el()); log(`[${el()}] PYLON ${q.n}/3 converted`); await shot('pylon' + q.n); }
      if (q.n >= 3 || q.over) break;
      if (s.st !== 'play') { await hold([]); await settle(); continue; }
      if (q.ring < 2.5 && s.canDodge) { await hold([]); await tap('ShiftLeft', 60); log(`[${el()}] dodge out of the dive's ring`); await page.waitForTimeout(200); continue; }
      if (q.gst !== 'stunned') {
        if (s.ball !== 'idle') { await hold([]); await page.waitForTimeout(100); continue; }
        const c = classicKeys(s, q.gx - s.x, q.gz - s.z, false);
        if (Math.abs(c.d) > 0.15) { await hold(c.k); await page.waitForTimeout(60); continue; }
        await hold([]); await tap('KeyF', 60); throwsP++; await page.waitForTimeout(400); continue;
      }
      const p = q.pl[0]; if (!p) { await page.waitForTimeout(300); continue; }
      if (p[3] > 0.45) { await hold(classicKeys(s, p[1] - s.x, p[2] - s.z).k); await page.waitForTimeout(90); continue; }
      // on the plate: still (the game lines him up for the bank shot), the ball where he faces
      await hold([]);
      await page.waitForTimeout(450);
      if (s.ball === 'idle') { await tap('KeyF', 60); throwsP++; log(`[${el()}] bank shot from plate ${p[0]}`); await page.waitForTimeout(1200); }
    }
    const n = await ev(() => game.story.cur.pylons?.() ?? 0);
    result = `pylons ${n}/3; converted at ${done.join(', ')} s; throws ${throwsP || 0}`;
  } else {
    const D = await ev(() => { const D = game.rooms.zeelich.depot; return { x: D.x, z: D.z, L: [D.locker.x, D.locker.z] }; });
    // (STAGED, as tests/depot.mjs: put at the playthrough's own spot before the gate, D.x − 4, D.z − 11; then keys)
    await ev(({ x, z }) => { const G = game, h = G.hero; h.pos.set(x, G.physics.groundAt(x, z), z); h.angle = Math.atan2(4, 11); G.camRig.snap?.(); }, { x: D.x - 4, z: D.z - 11 });
    await page.waitForTimeout(1500); log(`[${el()}] STAGED at the gate`); await shot('gate');
    let g = 'staged';
    for (let k = 0; k < 6; k++) {
      const f = await fight(30, 180); log(`[${el()}] fight → ${JSON.stringify(f)}`); await shot('after-fight');
      if (f.r === 'dead') break;
      g = await go(D.L[0], D.L[1], 1.2, 90); log(`[${el()}] to the locker → ${g}`);
      if (g === 'there') { await page.keyboard.down('KeyE'); await page.waitForTimeout(400); await page.keyboard.up('KeyE'); await page.waitForTimeout(1500); await settle(); break; }
    }
    result = (await ev(() => game.flags.c2_cyl)) ? 'cylinder taken' : 'no cylinder';
  }
  const end = await look();
  if (end.dead) deaths++;
  await shot('end');
  const sum = { try: tr, result, hpIn: hp0[0], hpOut: end.hp, maxHp: hp0[1], dead: end.dead, secs: +el(), hits: hits.length, byKind: hits.reduce((a, h) => (a[h.by.split(':')[0]] = (a[h.by.split(':')[0]] || 0) + 1, a), {}), enemiesSeen: seen.size, beaten: beaten.size };
  log('SUMMARY', JSON.stringify(sum)); summary.push(sum);
  fs.writeFileSync(`${OUT}/${WHICH}-try${tr}-hits.json`, JSON.stringify(hits, null, 1));
  await browser.close();
  if (!process.env.ALL && !end.dead && /open|taken|3\/3/.test(result)) break;   // (won: no more tries)
}
fs.writeFileSync(`${OUT}/${WHICH}-summary.json`, JSON.stringify(summary, null, 1));
server.close?.(); process.exit(0);
