// CPU-RELIEF (P137b): the main thread's work per drawn frame in a busy place, split EXCLUSIVELY by subsystem (a section
// nested in another counts only in the inner one: physics inside a person's update, the shadow pass inside the scene
// pass, three's per-draw call inside its render), with call counts. SwiftShader's GL work runs in its GPU process and is
// drained (readPixels, untimed) before each timed frame, so the numbers are the renderer process's JavaScript plus GL
// command encoding. RELATIVE only (A/B on this machine, one browser), never a laptop figure.
//   GAME_URL=http://localhost:8347/ PLACE=street PROFILE=medium FRAMES=240 node sections.mjs
//   PLACE: street (the benchmark's Citadel street route, camera turning) | zeelich | desert | <any area id>: the
//   area's arrival point, Twinsen walking a 3 m square, the camera turning as on the street.
//   PROFILE: an Auto profile id (high, medium, lean, low, loweco, low75, low65), applied through autoapply as Auto does.
//   CAM=follow: the player's follow camera at Far (default: the benchmark's free orbit).
//   AB_A / AB_B: page code run before alternate blocks of AB_BLOCK frames (default 16; first 2 of a block not counted).
//   OPT: page code run once before measuring.
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env, FR = +(E.FRAMES || 240);
// JOBS=place:profile,... (one boot, measured in turn); or PLACE / PROFILE for one
const JOBS = (E.JOBS || (E.PLACE || 'street') + ':' + (E.PROFILE || 'medium')).split(',').map((j) => j.split(':'));
const { browser, page } = await launch({ width: +(E.W || 1280), height: +(E.H || 720) });
page.on('console', (m) => { if (/^PROBE/.test(m.text())) console.log(m.text()); });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.addInitScript(() => { try { if (!localStorage.getItem('cr_init')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 4, v: 2, fps: 'auto' })); localStorage.setItem('cr_init', '1'); } } catch {} });
const ev = (f, a) => page.evaluate(f, a);
// (OLD_RIG=file: src/engine/rig.js answered from that file — a "before" run of the rig against this checkout's rest;
//  with QUERY=slowhypot as well, the builtin Math.hypot)
if (E.OLD_RIG) await page.route('**/src/engine/rig.js', (r) => r.fulfill({ path: E.OLD_RIG, contentType: 'text/javascript' }));
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const extra = [...new Set(JOBS.map((j) => j[0]))].filter((p) => p !== 'street' && !['zeelich', 'desert', 'hamalayi', 'house', 'arena'].includes(p));
if (extra.length) await ev((ids) => game.buildAreas(ids, 'probe'), extra);
for (const [PLACE, PROF, JCAM] of JOBS) {
const CAM = JCAM || E.CAM || '';
await ev(async (id) => {
  const Q = await import('/src/engine/autoquality.js'), G = game, p = Q.indexOfId(id);
  if (p < 0) throw new Error('no profile ' + id);
  G.settings.qualityAuto = true;
  G.autoQ.gov.setProfile(p, 'CPU-RELIEF probe', { phase: 'hold', commitNow: true, t: performance.now() });
  G.autoQ.applyAll(); G.syncLamps?.(); G.warmGraphics?.();
}, PROF);
if (E.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), E.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(async () => { window.THREE_ = await import('three'); });
const info = await ev(({ place, cam }) => {
  const G = game, THREE_ = window.THREE_;
  let route;
  if (place === 'street') route = G.bench.routes().find((x) => x.id === 'street');
  else {
    let w = null;
    route = {
      setup: () => {
        if (G.regions.has(place) || G.rooms?.[place]) G.enterRoom(place, null, true, true);
        // (the area's busiest spot: the person with the most others within 15 m, of those within 600 m of the arrival;
        //  Twinsen walks a 3 m square 2.5 m from them)
        const h = G.hero, L = G.npcs.filter((n) => n.present !== false && n.pos && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 600);
        let best = null, bn = -1; for (const a of L) { let c = 0; for (const b of L) if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 15) c++; if (c > bn) { bn = c; best = a; } }
        if (best && bn > 2) { h.pos.set(best.pos.x + 2.5, 0, best.pos.z); h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, best.pos.y + 2); console.log(`PROBE ${place}: busiest spot by ${best.name || best.def?.id} (${bn} people within 15 m) at ${h.pos.x.toFixed(0)}, ${h.pos.z.toFixed(0)}`); }
        G.bench.camera(); G.camRig.yaw = Math.PI / 4;
      },
      drive: (t, dt) => {
        const h = G.hero, p0 = (w ??= { x: h.pos.x, z: h.pos.z, y: h.pos.y });
        const k = (t * 0.4) % 4, i = Math.floor(k), f = k - i, C = [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]], a = C[i], b = C[(i + 1) % 4];
        h.pos.set(p0.x + a[0] + (b[0] - a[0]) * f, 0, p0.z + a[1] + (b[1] - a[1]) * f); h.pos.y = G.physics.groundAt(h.pos.x, h.pos.z, p0.y + 2);
        h.angle = Math.atan2(b[0] - a[0], b[1] - a[1]); h.vel.set(0, 0); G.doorCool = Math.max(G.doorCool || 0, 0.5); G.camRig.yaw += dt * 0.35;
      },
    };
  }
  G.bench.setCamera(cam === 'follow' ? 'follow' : 'orbit');
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam === 'follow') G.bench.camera();
  window.__route = route; window.__t = 0;
  for (let i = 0; i < 240; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 6 === 0); }
  // (the arm profiles' background job — spare-time work in the real loop, excluded from the frame's counted work — done
  //  first, so it neither shows in nor ends during the timed frames)
  for (let i = 0; i < 200 && G.warmArms(1000); i++);
  G._acWarm = false;
  // exclusive timers
  const now = () => performance.now();
  const X = (window.__X ??= { acc: Object.create(null), n: Object.create(null), stack: [], t: 0 });
  const enter = (k) => { const t = now(), S = X.stack; if (S.length) { const p = S[S.length - 1]; X.acc[p] = (X.acc[p] || 0) + t - X.t; } S.push(k); X.t = t; X.n[k] = (X.n[k] || 0) + 1; };
  const exit = () => { const t = now(), k = X.stack.pop(); X.acc[k] = (X.acc[k] || 0) + t - X.t; X.t = t; };
  const seen = new Set();
  const wrap = (obj, name, key) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__x) return;
    const f = obj[name]; const w = function () { enter(key); try { return f.apply(this, arguments); } finally { exit(); } }; w.__x = true; obj[name] = w; seen.add(key);
  };
  const protoWrap = (list, name, key) => { const P = new Set(); for (const a of list || []) { let p = Object.getPrototypeOf(a); while (p && p !== Object.prototype) { if (Object.prototype.hasOwnProperty.call(p, name)) P.add(p); p = Object.getPrototypeOf(p); } if (Object.prototype.hasOwnProperty.call(a, name)) wrap(a, name, key); } for (const p of P) wrap(p, name, key); };
  wrap(G, 'frame', 'frame(rest)');
  wrap(G.input, 'update', 'input');
  wrap(G, 'updateTransition', 'transition');
  wrap(G, 'updatePlay', 'play(rest)');
  wrap(G.tutorial, 'update', 'tutorial');
  wrap(G, 'heroFace', 'hero');
  wrap(G.hero, 'update', 'hero');
  protoWrap(G.npcs, 'update', 'people');
  const rigs = [G.hero.rig, ...G.npcs.map((n) => n.rig).filter(Boolean), ...G.enemies.map((e) => e.rig).filter(Boolean)];
  protoWrap(rigs, 'update', 'people.anim(rig)');
  if (G.gadgets) { wrap(G.gadgets, 'updateEnemies', 'enemies'); wrap(G.gadgets, 'update', 'gadgets/ball/weapons'); }
  wrap(G.ball, 'update', 'gadgets/ball/weapons'); wrap(G.weapons, 'update', 'gadgets/ball/weapons'); wrap(G.bolts, 'update', 'gadgets/ball/weapons');
  wrap(G.targeting, 'update', 'combat/targeting'); wrap(G.combatDir, 'update', 'combat/targeting');
  for (const m of ['move', 'fall', 'groundInfo', 'groundAt', 'steepAt', 'blockedAt', 'solidAt', 'clearTo', 'lineOfSight', 'near', 'ballFenceAt', 'ballFenceBetween', '_inside']) wrap(G.physics, m, 'physics');
  wrap(G.world.zones, 'update', 'zones/doors/story'); wrap(G, 'checkDoors', 'zones/doors/story'); wrap(G.story, 'update', 'zones/doors/story');
  wrap(G, 'findInteractable', 'interact'); wrap(G, 'giverInReach', 'interact');
  for (const m of ['setOutdoorArea', 'updateSources', 'listen', 'setCombat', 'setStorm']) wrap(G.audio, m, 'audio'); wrap(G, 'soundSources', 'audio');
  for (const m of ['stats', 'prompt', 'weapon', 'updateFloats']) wrap(G.hud, m, 'hud'); wrap(G.hud, 'mapTick', 'hud.map');
  wrap(G, 'warmArms', 'warmArms');
  wrap(G.camRig, 'update', 'camera'); wrap(G, 'occluders', 'camera');
  wrap(G.weather, 'update', 'env/weather'); wrap(G.env, 'update', 'env/weather');
  wrap(G.world, 'updateLod', 'world.lod'); wrap(G.world, 'update', 'world.update');
  if (G.room && !G.room.updaters.__x) G.room.updaters = G.room.updaters.map((u) => { const k = 'room updaters'; const f = function () { enter(k); try { return u.apply(this, arguments); } finally { exit(); } }; return f; }); if (G.room) G.room.updaters.__x = true;
  wrap(G.lightPool, 'update', 'lights'); wrap(G.shadowCull, 'update', 'shadowCull');
  wrap(G.particles, 'update', 'particles'); wrap(G.pickups, 'update', 'pickups/cues'); wrap(G.cues, 'update', 'pickups/cues'); wrap(G.remarks, 'update', 'pickups/cues');
  const R = G.renderer;
  wrap(R, 'render', 'R.matrices(shownWorld)+rest');
  wrap(R, 'pre', 'R.pre(farCull,blobs)'); wrap(R, 'mid', 'R.mid(rest)'); wrap(R, 'post', 'R.post');
  wrap(G.drawBatch, 'update', 'R.drawBatch.check'); wrap(G.boxCull, 'hide', 'R.boxCull');
  wrap(R, 'motionStep', 'R.post');
  wrap(R.composer, 'render', 'R.composer(passes)');
  if (R.scenePass) wrap(R.scenePass, 'render', 'R.scenePass');
  wrap(R.renderer, 'render', 'three.render(cull,sort,state)');
  wrap(R.renderer, 'renderBufferDirect', 'three.draw(program,uniforms,gl)');
  wrap(R.renderer.shadowMap, 'render', 'three.shadowMap(cull)');
  wrap(G.behMenu, 'render', 'R.post');
  // CENSUS: per frame, the draws (renderBufferDirect) by owner and pass, the rig updates by distance band and view
  const owner = new Map();
  for (const n of G.npcs) if (n.rig?.root) owner.set(n.rig.root, 'person');
  for (const e of G.enemies) if (e.rig?.root) owner.set(e.rig.root, 'enemy');
  if (G.hero?.rig?.root) owner.set(G.hero.rig.root, 'hero');
  const ownerOf = (o) => {
    if (o.userData?.drawBatch) return 'draw batch';
    for (let x = o; x; x = x.parent) { const k = owner.get(x); if (k) return k + (o.isSkinnedMesh ? ' body' : ' part'); }
    if (o.isInstancedMesh) return 'instanced'; if (o.isBatchedMesh) return 'batched'; if (o.isSprite) return 'sprite'; if (o.isPoints || o.isLine) return 'points/lines';
    if (o.name === 'terrain') return 'terrain';
    return 'other mesh';
  };
  // (an 'other mesh' draw named by its nearest named ancestor, with its material and whether it casts: what it is)
  const nameOf = (o) => { let x = o, path = []; for (let i = 0; x && i < 4; i++, x = x.parent) if (x.name) path.push(x.name); return (path.slice(0, 2).join(' < ') || '(unnamed)') + ' [' + (o.material?.type || '?') + (o.castShadow ? ', casts' : '') + (o.matrixAutoUpdate ? '' : ', static') + ']'; };
  const C = (window.__C ??= { on: false, draws: Object.create(null), rigs: Object.create(null), upd: Object.create(null), frames: 0 });
  { const rd = R.renderer, f = rd.renderBufferDirect; if (!f.__c) { const w = function (camera, scene, geometry, material, object) { if (C.on) { const k = (camera.isOrthographicCamera ? 'shadow · ' : camera.isPerspectiveCamera ? 'main · ' : 'other · ') + ownerOf(object); C.draws[k] = (C.draws[k] || 0) + 1; if (C.names && k.endsWith('other mesh')) { const nk = k.slice(0, k.indexOf(' ')) + ' ' + nameOf(object); C.names[nk] = (C.names[nk] || 0) + 1; } } return f.apply(this, arguments); }; w.__c = true; w.__x = f.__x; rd.renderBufferDirect = w; } }
  { const P = new Set(); for (const r of rigs) { let p = Object.getPrototypeOf(r); while (p && p !== Object.prototype && !Object.prototype.hasOwnProperty.call(p, 'update')) p = Object.getPrototypeOf(p); if (p && p !== Object.prototype) P.add(p); } const _fr = new THREE_.Frustum(), _m = new THREE_.Matrix4(), _v = new THREE_.Vector3();
    for (const p of P) { const f = p.update; if (typeof f !== 'function' || f.__c) continue; const w = function () { if (C.on) { const cam = G.camera, pos = this.root.getWorldPosition(_v), d = pos.distanceTo(cam.position); _fr.setFromProjectionMatrix(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); const k = (d < 12 ? '<12 m' : d < 25 ? '12-25 m' : d < 50 ? '25-50 m' : '>50 m') + (_fr.containsPoint(pos.setY(pos.y + 1)) ? ' in view' : ' out of view') + ((this.lodN | 0) > 1 ? ' (lod ' + this.lodN + ')' : ''); C.rigs[k] = (C.rigs[k] || 0) + 1; } return f.apply(this, arguments); }; w.__c = true; w.__x = f.__x; p.update = w; } }
  // (CENSUS: each world updater's own time, by its source's first characters)
  if (!G.world.updaters.__c) { const U = G.world.updaters; for (let i = 0; i < U.length; i++) { const u = U[i], key = i + ' ' + String(u).replace(/\s+/g, ' ').slice(0, 90); U[i] = function () { if (!C.on) return u.apply(this, arguments); const t0 = performance.now(); try { return u.apply(this, arguments); } finally { C.upd[key] = (C.upd[key] || 0) + performance.now() - t0; } }; } U.__c = true; }
  // count the scene
  let objects = 0, shown = 0, meshesShown = 0, autoShown = 0;
  const walk = (o, vis) => { objects++; if (vis) { shown++; if (o.isMesh || o.isSkinnedMesh) meshesShown++; if (o.matrixAutoUpdate) autoShown++; } for (const c of o.children) walk(c, vis && c.visible); };
  walk(G.scene, true);
  const hp = G.hero.pos, near40 = G.npcs.filter((n) => n.present !== false && n.rig?.root?.visible !== false && n.pos && Math.hypot(n.pos.x - hp.x, n.pos.z - hp.z) < 40).length;
  return { room: G.room?.id || 'citadel', near40, npcs: G.npcs.length, npcsPresent: G.npcs.filter((n) => n.present !== false && n.group?.visible !== false).length, enemies: G.enemies.length, objects, shown, meshesShown, autoShown, keys: [...seen], q: G.settings.quality, prof: G.autoQ?.applied ?? null, shadows: G.renderer.renderer.shadowMap.enabled, regions: Object.keys(G.rooms || {}) };
}, { place: PLACE, cam: CAM });
console.log('PROBE scene', JSON.stringify(info));
const AB = E.AB_A ? [E.AB_A, E.AB_B || ''] : null, BLK = +(E.AB_BLOCK || 16);
if (AB) await ev((ab) => { window.__ab = ab.map((c) => new Function(c)); }, AB);
const rows = [];
// (CPUPROFILE=file: the timed frames under V8's sampling profiler, written as a .cpuprofile; the sections still timed)
let cdp = null;
if (E.CPUPROFILE) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
for (let k = 0; k < FR; k += 8) {
  const r = await ev(({ k, BLK }) => {
    const G = game, R = G.renderer.renderer, gl = R.getContext(), X = window.__X, out = [];
    for (let j = 0; j < 8; j++) {
      const kk = k + j;
      if (window.__ab && kk % BLK === 0) window.__ab[Math.floor(kk / BLK) & 1]();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, (window.__px ??= new Uint8Array(4)));
      window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
      X.acc = Object.create(null); X.n = Object.create(null); X.stack.length = 0;
      const t0 = performance.now(); G.frame(1 / 60, true); const all = performance.now() - t0;
      out.push({ all, ms: { ...X.acc }, n: { ...X.n }, calls: R.info.render.calls, tris: R.info.render.triangles, blk: Math.floor(kk / BLK), side: Math.floor(kk / BLK) & 1, skip: !!window.__ab && kk % BLK < 2 });
    }
    return out;
  }, { k, BLK });
  rows.push(...r);
}
{ const c = await ev(() => { const G = game, C = window.__C; C.on = true; C.draws = Object.create(null); C.rigs = Object.create(null); C.names = Object.create(null); C.upd = Object.create(null); const N = 32; for (let i = 0; i < N; i++) { window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60); G.frame(1 / 60, true); } C.on = false; const per = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / N).toFixed(1)])); const nm = Object.entries(C.names).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => k + ' ×' + +(v / N).toFixed(1)); C.names = null; const up = Object.entries(C.upd).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => (v / N).toFixed(3) + ' ms ' + k); return { upd: up, nUpd: G.world.updaters.length, draws: per(C.draws), rigs: per(C.rigs), mw: G.renderer._mw?.stats || null, names: nm }; });
  console.log(`CENSUS ${PLACE} ${PROF}: draws a frame ${JSON.stringify(c.draws)}`); console.log(`CENSUS ${PLACE} ${PROF}: world updaters (${c.nUpd}), the costliest:\n    ${c.upd.join('\n    ')}`); console.log(`CENSUS ${PLACE} ${PROF}: other-mesh draws by name:\n    ${c.names.join('\n    ')}`); console.log(`CENSUS ${PLACE} ${PROF}: rig updates a frame ${JSON.stringify(c.rigs)} · world-matrix walk ${JSON.stringify(c.mw)}`); }
if (cdp) { const { profile } = await cdp.send('Profiler.stop'); (await import('node:fs')).writeFileSync(E.CPUPROFILE.replace(/(\.cpuprofile)?$/, '-' + PLACE + '-' + PROF + '.cpuprofile'), JSON.stringify(profile)); cdp = null; }
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const show = (rows, tag) => {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.ms)))];
  const tot = rows.map((r) => r.all);
  console.log(`CPU-RELIEF sections · ${PLACE} · ${PROF} · ${CAM || 'orbit'} · ${rows.length} frames${tag ? ' · ' + tag : ''}`);
  console.log(`  frame work: p50 ${pct(tot, 0.5).toFixed(2)} · p90 ${pct(tot, 0.9).toFixed(2)} · mean ${mean(tot).toFixed(2)} ms · draws (renderBufferDirect) p50 ${pct(rows.map((r) => r.n['three.draw(program,uniforms,gl)'] || 0), 0.5)}`);
  // (per block of frames: the block's mean; min and median over the blocks — a load spike on this shared machine lifts
  //  a block, rarely all of them)
  const blocks = [...new Set(rows.map((r) => r.blk))].map((b) => rows.filter((r) => r.blk === b));
  const bstat = (f) => { const v = blocks.map((B) => mean(B.map(f))).sort((x, y) => x - y); return `${v[0].toFixed(2)} / ${v[v.length >> 1].toFixed(2)}`; };
  console.log(`  frame work, block means (min / median of ${blocks.length}): ${bstat((r) => r.all)} ms`);
  for (const k of ['people.anim(rig)', 'three.draw(program,uniforms,gl)', 'three.render(cull,sort,state)', 'people', 'physics', 'R.matrices(shownWorld)+rest', 'shadowCull', 'three.shadowMap(cull)']) console.log(`    ${k.padEnd(34)} block means ${bstat((r) => r.ms[k] || 0)}`);
  const L = keys.map((k) => { const v = rows.map((r) => r.ms[k] || 0), n = rows.map((r) => r.n[k] || 0); return { k, mean: mean(v), p50: pct(v, 0.5), p90: pct(v, 0.9), calls: mean(n) }; }).sort((a, b) => b.mean - a.mean);
  for (const x of L) console.log(`  ${x.k.padEnd(36)} mean ${x.mean.toFixed(3).padStart(7)} · p50 ${x.p50.toFixed(3).padStart(7)} · p90 ${x.p90.toFixed(3).padStart(7)} · calls ${x.calls.toFixed(1)}`);
};
if (AB) { show(rows.filter((r) => r.side === 0 && !r.skip), 'A: ' + AB[0]); show(rows.filter((r) => r.side === 1 && !r.skip), 'B: ' + AB[1]); } else show(rows, '');
}
await browser.close();
